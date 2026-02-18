"""Security audit logging for critical events.

SECURITY: Logs security-relevant events for monitoring and incident response.
"""

import logging
from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from uuid import UUID

# Configure security audit logger
security_logger = logging.getLogger("security.audit")


class AuditEvent(str, Enum):
    """Security audit event types."""

    # Authentication events
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILED = "login_failed"
    LOGOUT = "logout"
    TOKEN_REFRESH = "token_refresh"
    TOKEN_REFRESH_FAILED = "token_refresh_failed"

    # Password events
    PASSWORD_CHANGE = "password_change"
    PASSWORD_RESET_REQUEST = "password_reset_request"
    PASSWORD_RESET_SUCCESS = "password_reset_success"
    PASSWORD_RESET_FAILED = "password_reset_failed"

    # Account events
    ACCOUNT_CREATED = "account_created"
    ACCOUNT_VERIFIED = "account_verified"
    ACCOUNT_DEACTIVATED = "account_deactivated"
    EMAIL_VERIFICATION_SENT = "email_verification_sent"

    # OAuth events
    OAUTH_LOGIN = "oauth_login"
    OAUTH_LINK_BLOCKED = "oauth_link_blocked"
    OAUTH_ACCOUNT_CREATED = "oauth_account_created"

    # Admin events
    ADMIN_ACCESS = "admin_access"
    ADMIN_ACTION = "admin_action"

    # Security events
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    INVALID_TOKEN = "invalid_token"
    UNAUTHORIZED_ACCESS = "unauthorized_access"
    WEBHOOK_SIGNATURE_INVALID = "webhook_signature_invalid"
    FILE_VALIDATION_FAILED = "file_validation_failed"


def log_security_event(
    event: AuditEvent,
    user_id: Optional[UUID] = None,
    email: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    details: Optional[dict] = None,
    success: bool = True,
) -> None:
    """
    Log a security-relevant event.

    Args:
        event: The type of security event
        user_id: The user ID involved (if applicable)
        email: The email address involved (if applicable)
        ip_address: The client IP address
        user_agent: The client user agent
        details: Additional event details
        success: Whether the action was successful
    """
    log_data = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event": event.value,
        "success": success,
    }

    if user_id:
        log_data["user_id"] = str(user_id)
    if email:
        # Mask email for privacy in logs (show first 2 chars and domain)
        if "@" in email:
            local, domain = email.split("@", 1)
            masked = f"{local[:2]}***@{domain}" if len(local) > 2 else f"{local[0]}***@{domain}"
            log_data["email"] = masked
        else:
            log_data["email"] = "***"
    if ip_address:
        log_data["ip_address"] = ip_address
    if user_agent:
        # Truncate user agent for log readability
        log_data["user_agent"] = user_agent[:100] if len(user_agent) > 100 else user_agent
    if details:
        log_data["details"] = details

    # Use appropriate log level based on event type and success
    if not success or event in [
        AuditEvent.LOGIN_FAILED,
        AuditEvent.UNAUTHORIZED_ACCESS,
        AuditEvent.INVALID_TOKEN,
        AuditEvent.WEBHOOK_SIGNATURE_INVALID,
        AuditEvent.FILE_VALIDATION_FAILED,
        AuditEvent.RATE_LIMIT_EXCEEDED,
        AuditEvent.OAUTH_LINK_BLOCKED,
    ]:
        security_logger.warning(f"SECURITY_AUDIT: {log_data}")
    else:
        security_logger.info(f"SECURITY_AUDIT: {log_data}")


def log_login_attempt(
    email: str,
    ip_address: str,
    user_agent: Optional[str],
    success: bool,
    user_id: Optional[UUID] = None,
    failure_reason: Optional[str] = None,
) -> None:
    """Log a login attempt."""
    details = {}
    if failure_reason:
        details["reason"] = failure_reason

    log_security_event(
        event=AuditEvent.LOGIN_SUCCESS if success else AuditEvent.LOGIN_FAILED,
        user_id=user_id,
        email=email,
        ip_address=ip_address,
        user_agent=user_agent,
        details=details if details else None,
        success=success,
    )


def log_password_reset(
    email: str,
    ip_address: Optional[str],
    event_type: str,
    success: bool = True,
) -> None:
    """Log password reset events."""
    event_map = {
        "request": AuditEvent.PASSWORD_RESET_REQUEST,
        "success": AuditEvent.PASSWORD_RESET_SUCCESS,
        "failed": AuditEvent.PASSWORD_RESET_FAILED,
    }
    event = event_map.get(event_type, AuditEvent.PASSWORD_RESET_REQUEST)

    log_security_event(
        event=event,
        email=email,
        ip_address=ip_address,
        success=success,
    )


def log_oauth_event(
    provider: str,
    email: str,
    ip_address: Optional[str],
    event_type: str,
    user_id: Optional[UUID] = None,
    blocked_reason: Optional[str] = None,
) -> None:
    """Log OAuth authentication events."""
    event_map = {
        "login": AuditEvent.OAUTH_LOGIN,
        "created": AuditEvent.OAUTH_ACCOUNT_CREATED,
        "blocked": AuditEvent.OAUTH_LINK_BLOCKED,
    }
    event = event_map.get(event_type, AuditEvent.OAUTH_LOGIN)

    details = {"provider": provider}
    if blocked_reason:
        details["blocked_reason"] = blocked_reason

    log_security_event(
        event=event,
        user_id=user_id,
        email=email,
        ip_address=ip_address,
        details=details,
        success=event_type != "blocked",
    )


def log_admin_access(
    user_id: UUID,
    action: str,
    ip_address: Optional[str],
    details: Optional[dict] = None,
) -> None:
    """Log admin access and actions."""
    log_security_event(
        event=AuditEvent.ADMIN_ACTION,
        user_id=user_id,
        ip_address=ip_address,
        details={"action": action, **(details or {})},
    )
