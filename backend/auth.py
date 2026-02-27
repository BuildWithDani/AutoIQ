"""
Authentication dependencies and utilities for FastAPI endpoints.
"""
from fastapi import HTTPException, Header, Depends
from typing import Optional, Dict, Any, Tuple
import jwt
import logging
from jwt_utils import create_access_token, decode_access_token
from appwrite_client import (
    create_user,
    authenticate_user as appwrite_authenticate_user,
    get_user_by_id,
    get_user_profile,
    get_or_create_profile,
    get_account_from_jwt,
)

logger = logging.getLogger(__name__)

# Standalone auth functions (as specified)
async def register_user(email: str, password: str) -> Tuple[str, Dict[str, Any]]:
    """
    Register a new user in Appwrite and return JWT token + user info.
    
    Args:
        email: User email
        password: User password
        
    Returns:
        Tuple of (jwt_token, user_info_dict)
    """
    # Create user in Appwrite
    user = create_user(email, password)
    user_id = user.get("$id")
    
    # Ensure profile exists in database (should be created by create_user, but ensure it exists)
    # This will create the profile with plan='free' if it doesn't exist
    profile = get_or_create_profile(user_id)
    
    # If profile is None, database doesn't exist - log warning but continue
    if not profile:
        logger.warning(f"Profile could not be created for user {user_id} - database may not be set up. User created but plan will default to 'free'.")
    
    # Create JWT with sub=user_id
    token = create_access_token({"sub": user_id})
    
    # Build user info dict (camelCase for frontend)
    # Use defaults if profile doesn't exist (database not set up yet)
    user_info = {
        "id": user_id,
        "email": user.get("email"),
        "plan": profile.get("plan", "free") if profile else "free",
        "stripeCustomerId": profile.get("stripeCustomerId") if profile else None,
        "stripeSubscriptionId": profile.get("stripeSubscriptionId") if profile else None,
        "created": user.get("$createdAt"),
        "updated": user.get("$updatedAt"),
    }
    
    return token, user_info


async def authenticate_user(email: str, password: str) -> Optional[Tuple[str, Dict[str, Any]]]:
    """
    Authenticate user with Appwrite and return JWT token + user info.
    
    Args:
        email: User email
        password: User password
        
    Returns:
        Tuple of (jwt_token, user_info_dict) if successful, None otherwise
    """
    try:
        # Authenticate with Appwrite
        user = appwrite_authenticate_user(email, password)
        user_id = user.get("$id")
        
        # Ensure profile exists (may fail if database doesn't exist - that's OK)
        try:
            profile = get_or_create_profile(user_id)
        except Exception as profile_error:
            # Profile creation failed (database not set up), but user is authenticated
            # Log warning but don't fail login - profile can be created later
            logger.warning(f"Could not get/create profile for user {user_id}: {profile_error}. Using defaults.")
            profile = None
        
        # Create JWT with sub=user_id
        token = create_access_token({"sub": user_id})
        
        # Build user info dict (camelCase for frontend)
        user_info = {
            "id": user_id,
            "email": user.get("email"),
            "plan": profile.get("plan", "free") if profile else "free",
            "stripeCustomerId": profile.get("stripeCustomerId") if profile else None,
            "stripeSubscriptionId": profile.get("stripeSubscriptionId") if profile else None,
            "created": user.get("$createdAt"),
            "updated": user.get("$updatedAt"),
        }
        
        return token, user_info
    except ValueError as e:
        # Re-raise ValueError so caller can see the error message
        raise
    except Exception as e:
        # Unexpected error - log and raise
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Unexpected error in authenticate_user: {e}")
        raise ValueError("Authentication failed. Please try again.")


def _build_user_info_from_appwrite_user(user: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """Build the standard user_info dict from Appwrite user and profile."""
    profile = get_user_profile(user_id)
    if not profile:
        profile = get_or_create_profile(user_id)
    return {
        "id": user_id,
        "email": user.get("email"),
        "plan": profile.get("plan", "free") if profile else "free",
        "stripeCustomerId": profile.get("stripeCustomerId") if profile else None,
        "stripeSubscriptionId": profile.get("stripeSubscriptionId") if profile else None,
        "created": user.get("$createdAt"),
        "updated": user.get("$updatedAt"),
    }


async def get_current_user_from_token(token: str) -> Dict[str, Any]:
    """
    Get current user from JWT token.
    Accepts either:
    - Backend-issued JWT (signed with JWT_SECRET, sub=user_id), or
    - Appwrite JWT (from account.createJWT()) so the web app can call protected endpoints.
    
    Args:
        token: JWT token string (backend or Appwrite)
        
    Returns:
        User info dictionary with id, email, plan, etc.
        
    Raises:
        HTTPException: If token is invalid or user not found
    """
    # 1) Try backend JWT first (desktop app / login flow)
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=401,
                detail={"code": "unauthorized", "message": "Invalid token payload"}
            )
        user = get_user_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=401,
                detail={"code": "unauthorized", "message": "User not found"}
            )
        return _build_user_info_from_appwrite_user(user, user_id)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail={"code": "unauthorized", "message": "Token expired"}
        )
    except jwt.InvalidTokenError:
        pass  # Not our JWT; try Appwrite JWT below
    except HTTPException:
        raise

    # 2) Try Appwrite JWT (web app: Authorization: Bearer <Appwrite JWT>)
    account = get_account_from_jwt(token)
    if account:
        user_id = account.get("$id") or account.get("id")
        if user_id:
            return _build_user_info_from_appwrite_user(account, user_id)

    raise HTTPException(
        status_code=401,
        detail={"code": "unauthorized", "message": "Invalid token"}
    )


# FastAPI dependency wrapper
async def get_current_user_dependency(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """
    Extract and verify JWT token from Authorization header, then fetch user from Appwrite.
    
    Usage:
        @app.get("/api/protected")
        async def protected_route(user: Dict = Depends(get_current_user_from_token)):
            ...
    """
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail={"code": "unauthorized", "message": "Authorization header required"}
        )
    
    # Extract token from "Bearer <token>"
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise ValueError("Invalid authorization scheme")
    except ValueError:
        raise HTTPException(
            status_code=401,
            detail={"code": "unauthorized", "message": "Invalid authorization header format. Use 'Bearer <token>'"}
        )
    
    # Extract token from header and get user
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail={"code": "unauthorized", "message": "Authorization header required"}
        )
    
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise ValueError("Invalid authorization scheme")
    except ValueError:
        raise HTTPException(
            status_code=401,
            detail={"code": "unauthorized", "message": "Invalid authorization header format. Use 'Bearer <token>'"}
        )
    
    return await get_current_user_from_token(token)

