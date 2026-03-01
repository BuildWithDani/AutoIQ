"""
JWT utilities for AutoIQ backend session management.
Backend issues its own JWTs that map to Appwrite user IDs.
"""
import os
import jwt
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

# JWT configuration from environment
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRES_MINUTES = int(os.getenv("JWT_EXPIRES_MINUTES", "60"))  # Default 60 minutes

# CRITICAL SECURITY CHECK: Validate JWT secret
if not JWT_SECRET:
    error_msg = (
        "CRITICAL SECURITY ERROR: JWT_SECRET environment variable is not set!\n"
        "Generate a secure secret with: python -c 'import secrets; print(secrets.token_urlsafe(32))'\n"
        "Then set it in your .env file: JWT_SECRET=your_generated_secret"
    )
    logger.error(error_msg)
    raise ValueError(error_msg)

# Check if using the old insecure default
if JWT_SECRET == "autoiq-secret-key-change-in-production":
    error_msg = (
        "CRITICAL SECURITY ERROR: JWT_SECRET is set to the default insecure value!\n"
        "This is a publicly known secret and compromises all authentication.\n"
        "Generate a new secure secret with: python -c 'import secrets; print(secrets.token_urlsafe(32))'\n"
        "Then update your .env file with the new secret."
    )
    logger.error(error_msg)
    raise ValueError(error_msg)

# Validate minimum secret length (at least 32 characters)
if len(JWT_SECRET) < 32:
    error_msg = (
        f"CRITICAL SECURITY ERROR: JWT_SECRET is too short ({len(JWT_SECRET)} chars, minimum 32 required)!\n"
        "Generate a secure secret with: python -c 'import secrets; print(secrets.token_urlsafe(32))'"
    )
    logger.error(error_msg)
    raise ValueError(error_msg)

logger.info(f"JWT configuration loaded: algorithm={JWT_ALGORITHM}, expires_minutes={JWT_EXPIRES_MINUTES}")


def create_access_token(payload: Dict[str, Any], expires_minutes: Optional[int] = None) -> str:
    """
    Create a JWT access token.
    
    Args:
        payload: Token payload dictionary (should include 'sub' for user ID)
        expires_minutes: Token expiration time in minutes (defaults to JWT_EXPIRES_MINUTES env var or 60)
        
    Returns:
        JWT token string
    """
    if expires_minutes is None:
        expires_minutes = JWT_EXPIRES_MINUTES
    token_payload = payload.copy()
    token_payload["exp"] = datetime.utcnow() + timedelta(minutes=expires_minutes)
    token_payload["iat"] = datetime.utcnow()
    
    token = jwt.encode(token_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token


def decode_access_token(token: str) -> Dict[str, Any]:
    """
    Decode and verify a JWT access token.
    
    Args:
        token: JWT token string
        
    Returns:
        Decoded payload dictionary
        
    Raises:
        jwt.ExpiredSignatureError: If token is expired
        jwt.InvalidTokenError: If token is invalid
    """
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("Token expired")
        raise
    except jwt.InvalidTokenError as e:
        # Log at debug; auth layer may fall back to Appwrite JWT (e.g. web app)
        logger.debug(f"Invalid token (not backend JWT): {e}")
        raise
    except Exception as e:
        logger.error(f"Error decoding token: {e}")
        raise


# Legacy aliases for backward compatibility
def create_token(user_id: str, plan: Optional[str] = None) -> str:
    """Legacy function - use create_access_token instead."""
    payload = {"sub": user_id}
    if plan:
        payload["plan"] = plan
    return create_access_token(payload)


def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """Legacy function - use decode_access_token instead."""
    try:
        return decode_access_token(token)
    except Exception:
        return None


def get_user_id_from_token(token: str) -> Optional[str]:
    """
    Extract user_id from JWT token.
    
    Args:
        token: JWT token string
        
    Returns:
        User ID or None if token is invalid
    """
    payload = verify_token(token)
    if payload:
        return payload.get("user_id")
    return None

