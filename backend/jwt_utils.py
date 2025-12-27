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
JWT_SECRET = os.getenv("JWT_SECRET", "autoiq-secret-key-change-in-production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRES_MINUTES = int(os.getenv("JWT_EXPIRES_MINUTES", "60"))  # Default 60 minutes


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
        logger.warning(f"Invalid token: {e}")
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

