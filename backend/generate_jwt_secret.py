#!/usr/bin/env python3
"""
Generate a secure JWT secret for AutoIQ backend.

Usage:
    python generate_jwt_secret.py

This will generate a cryptographically secure random secret suitable for JWT signing.
Copy the output and add it to your .env file:
    JWT_SECRET=<generated_secret>
"""

import secrets

def generate_jwt_secret(length: int = 32) -> str:
    """
    Generate a cryptographically secure random secret.
    
    Args:
        length: Number of bytes (default 32 = 256 bits)
    
    Returns:
        URL-safe base64 encoded string
    """
    return secrets.token_urlsafe(length)

if __name__ == "__main__":
    secret = generate_jwt_secret()
    print("=" * 80)
    print("SECURE JWT SECRET GENERATED")
    print("=" * 80)
    print()
    print("Copy the following line to your backend/.env file:")
    print()
    print(f"JWT_SECRET={secret}")
    print()
    print("=" * 80)
    print("SECURITY WARNINGS:")
    print("=" * 80)
    print("1. NEVER commit this secret to git")
    print("2. NEVER share this secret publicly")
    print("3. Use a DIFFERENT secret for production")
    print("4. Rotate secrets every 90 days")
    print("5. If compromised, generate a new secret immediately")
    print("=" * 80)

