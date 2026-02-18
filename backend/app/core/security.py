"""Security utilities - JWT, password hashing, OAuth."""

from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings
from app.core.exceptions import UnauthorizedError

# Password hashing context
# Using bcrypt as default (user preference)
pwd_context = CryptContext(schemes=["bcrypt", "argon2"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password."""
    return pwd_context.hash(password)


def create_access_token(
    data: dict[str, Any],
    expires_delta: timedelta | None = None,
) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def create_refresh_token(
    data: dict[str, Any],
    expires_delta: timedelta | None = None,
) -> str:
    """Create a JWT refresh token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(days=settings.refresh_token_expire_days)
    )
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def verify_token(token: str, token_type: str = "access") -> dict[str, Any]:
    """Verify and decode a JWT token."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        if payload.get("type") != token_type:
            raise UnauthorizedError(message="Invalid token type")
        return payload
    except JWTError as e:
        raise UnauthorizedError(message="Invalid or expired token") from e


def create_email_verification_token(email: str) -> str:
    """Create token for email verification."""
    return create_access_token(
        data={"sub": email, "purpose": "email_verification"},
        expires_delta=timedelta(hours=24),
    )


def create_password_reset_token(email: str) -> str:
    """Create token for password reset."""
    return create_access_token(
        data={"sub": email, "purpose": "password_reset"},
        expires_delta=timedelta(hours=1),
    )


def verify_email_token(token: str) -> str:
    """Verify email verification token and return email."""
    payload = verify_token(token, token_type="access")
    if payload.get("purpose") != "email_verification":
        raise UnauthorizedError(message="Invalid token purpose")
    email = payload.get("sub")
    if not email:
        raise UnauthorizedError(message="Invalid token")
    return email


def verify_password_reset_token(token: str) -> str:
    """Verify password reset token and return email."""
    payload = verify_token(token, token_type="access")
    if payload.get("purpose") != "password_reset":
        raise UnauthorizedError(message="Invalid token purpose")
    email = payload.get("sub")
    if not email:
        raise UnauthorizedError(message="Invalid token")
    return email
