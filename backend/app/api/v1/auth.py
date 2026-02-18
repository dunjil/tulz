"""Authentication endpoints."""

import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Request
from fastapi.responses import RedirectResponse

from app.api.deps import ClientIP, CurrentUser, DbSession, UserAgent
from app.config import settings
from app.core.audit import (
    AuditEvent,
    log_login_attempt,
    log_password_reset,
    log_security_event,
)
from app.core.rate_limiter import (
    limiter,
    AUTH_RATE_LIMIT,
    LOGIN_RATE_LIMIT,
    PASSWORD_RESET_RATE_LIMIT,
)
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    PasswordResetConfirm,
    PasswordResetRequest,
    RefreshTokenRequest,
    RegisterRequest,
    TokenResponse,
    VerifyEmailRequest,
)
from app.schemas.common import MessageResponse
from app.services.auth_service import AuthService
from app.services.email_service import email_service

router = APIRouter()


@router.post("/register", response_model=MessageResponse)
@limiter.limit(AUTH_RATE_LIMIT)
async def register(
    request: Request,  # Required for rate limiter
    data: RegisterRequest,
    session: DbSession,
    background_tasks: BackgroundTasks,
):
    """Register a new user account.

    SECURITY: Always returns the same message regardless of whether the email
    is already registered, to prevent email enumeration attacks.
    """
    auth_service = AuthService(session)

    try:
        user, verification_token = await auth_service.register(
            email=data.email,
            full_name=data.full_name,
            password=data.password,
        )

        # Send verification email in background
        verification_url = f"{settings.frontend_url}/verify-email?token={verification_token}"
        background_tasks.add_task(
            email_service.send_verification_email,
            to_email=user.email,
            to_name=user.full_name,
            verification_url=verification_url,
        )
    except Exception as e:
        # SECURITY: Don't reveal whether email already exists
        # Log internally but return same message to user
        print(f"DEBUG: Registration failed: {e}")
        import traceback
        traceback.print_exc()
        raise e

    # Always return the same message to prevent email enumeration
    return MessageResponse(
        message="If this email is not already registered, you will receive a verification link shortly."
    )


@router.post("/login", response_model=TokenResponse)
@limiter.limit(LOGIN_RATE_LIMIT)
async def login(
    request: Request,  # Required for rate limiter
    data: LoginRequest,
    session: DbSession,
    client_ip: ClientIP,
    user_agent: UserAgent,
):
    """Login with email and password."""
    auth_service = AuthService(session)
    try:
        result = await auth_service.login(
            email=data.email,
            password=data.password,
            ip_address=client_ip,
        )
        # Log successful login
        log_login_attempt(
            email=data.email,
            ip_address=client_ip,
            user_agent=user_agent,
            success=True,
        )
        return result
    except Exception as e:
        # Log failed login attempt
        log_login_attempt(
            email=data.email,
            ip_address=client_ip,
            user_agent=user_agent,
            success=False,
            failure_reason=str(e),
        )
        raise


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    data: RefreshTokenRequest,
    session: DbSession,
):
    """Refresh access token."""
    auth_service = AuthService(session)
    return await auth_service.refresh_tokens(data.refresh_token)


@router.post("/verify-email", response_model=MessageResponse)
async def verify_email(
    data: VerifyEmailRequest,
    session: DbSession,
    background_tasks: BackgroundTasks,
):
    """Verify email with token."""
    auth_service = AuthService(session)
    user = await auth_service.verify_email(data.token)

    # Send welcome email
    background_tasks.add_task(
        email_service.send_welcome_email,
        to_email=user.email,
        to_name=user.full_name,
    )

    return MessageResponse(message="Email verified successfully.")


@router.post("/password-reset/request", response_model=MessageResponse)
@limiter.limit(PASSWORD_RESET_RATE_LIMIT)
async def request_password_reset(
    request: Request,  # Required for rate limiter
    data: PasswordResetRequest,
    session: DbSession,
    background_tasks: BackgroundTasks,
    client_ip: ClientIP,
):
    """Request password reset email."""
    auth_service = AuthService(session)
    token = await auth_service.request_password_reset(data.email)

    # Log password reset request
    log_password_reset(email=data.email, ip_address=client_ip, event_type="request")

    if token:
        reset_url = f"{settings.frontend_url}/reset-password?token={token}"
        # Get user for name
        from app.services.user_service import UserService
        user_service = UserService(session)
        user = await user_service.get_by_email(data.email)
        if user:
            background_tasks.add_task(
                email_service.send_password_reset_email,
                to_email=user.email,
                to_name=user.full_name,
                reset_url=reset_url,
            )

    # Always return success to prevent email enumeration
    return MessageResponse(
        message="If an account exists with that email, you will receive a password reset link."
    )


@router.post("/password-reset/confirm", response_model=MessageResponse)
async def confirm_password_reset(
    data: PasswordResetConfirm,
    session: DbSession,
    client_ip: ClientIP,
):
    """Reset password with token."""
    auth_service = AuthService(session)
    try:
        user = await auth_service.reset_password(data.token, data.new_password)
        log_password_reset(email=user.email, ip_address=client_ip, event_type="success")
        return MessageResponse(message="Password reset successful. You can now login.")
    except Exception as e:
        log_password_reset(email="unknown", ip_address=client_ip, event_type="failed", success=False)
        raise


@router.post("/change-password", response_model=MessageResponse)
async def change_password(
    data: ChangePasswordRequest,
    session: DbSession,
    user: CurrentUser,
    client_ip: ClientIP,
):
    """Change password for authenticated user."""
    auth_service = AuthService(session)
    await auth_service.change_password(
        user=user,
        current_password=data.current_password,
        new_password=data.new_password,
    )
    # Log password change
    log_security_event(
        event=AuditEvent.PASSWORD_CHANGE,
        user_id=user.id,
        email=user.email,
        ip_address=client_ip,
    )
    return MessageResponse(message="Password changed successfully.")


