"""Email background tasks.

These tasks handle email sending asynchronously via Celery.
"""

from celery import shared_task

from app.config import settings


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_verification_email(self, email: str, name: str, verification_url: str) -> dict:
    """Send email verification to user.

    Args:
        email: User's email address
        name: User's name
        verification_url: URL with verification token

    Returns:
        dict with send status
    """
    try:
        import httpx

        if not settings.zeptomail_api_key:
            return {"success": False, "error": "Email not configured"}

        payload = {
            "from": {
                "address": settings.zeptomail_from_email,
                "name": settings.zeptomail_from_name,
            },
            "to": [{"email_address": {"address": email, "name": name}}],
            "subject": "Verify your Tulz account",
            "htmlbody": f"""
                <h2>Welcome to Tulz, {name}!</h2>
                <p>Please verify your email address by clicking the link below:</p>
                <p><a href="{verification_url}">Verify Email</a></p>
                <p>If you didn't create this account, you can ignore this email.</p>
            """,
        }

        with httpx.Client() as client:
            response = client.post(
                "https://api.zeptomail.com/v1.1/email",
                json=payload,
                headers={
                    "Authorization": f"Zoho-enczapikey {settings.zeptomail_api_key}",
                    "Content-Type": "application/json",
                },
            )
            response.raise_for_status()

        return {"success": True, "email": email}

    except Exception as e:
        self.retry(exc=e)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_password_reset_email(self, email: str, name: str, reset_url: str) -> dict:
    """Send password reset email to user.

    Args:
        email: User's email address
        name: User's name
        reset_url: URL with reset token

    Returns:
        dict with send status
    """
    try:
        import httpx

        if not settings.zeptomail_api_key:
            return {"success": False, "error": "Email not configured"}

        payload = {
            "from": {
                "address": settings.zeptomail_from_email,
                "name": settings.zeptomail_from_name,
            },
            "to": [{"email_address": {"address": email, "name": name}}],
            "subject": "Reset your Tulz password",
            "htmlbody": f"""
                <h2>Password Reset Request</h2>
                <p>Hi {name},</p>
                <p>Click the link below to reset your password:</p>
                <p><a href="{reset_url}">Reset Password</a></p>
                <p>This link expires in 1 hour.</p>
                <p>If you didn't request this, you can ignore this email.</p>
            """,
        }

        with httpx.Client() as client:
            response = client.post(
                "https://api.zeptomail.com/v1.1/email",
                json=payload,
                headers={
                    "Authorization": f"Zoho-enczapikey {settings.zeptomail_api_key}",
                    "Content-Type": "application/json",
                },
            )
            response.raise_for_status()

        return {"success": True, "email": email}

    except Exception as e:
        self.retry(exc=e)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_welcome_email(self, email: str, name: str) -> dict:
    """Send welcome email to new user.

    Args:
        email: User's email address
        name: User's name

    Returns:
        dict with send status
    """
    try:
        import httpx

        if not settings.zeptomail_api_key:
            return {"success": False, "error": "Email not configured"}

        payload = {
            "from": {
                "address": settings.zeptomail_from_email,
                "name": settings.zeptomail_from_name,
            },
            "to": [{"email_address": {"address": email, "name": name}}],
            "subject": "Welcome to Tulz!",
            "htmlbody": f"""
                <h2>Welcome to Tulz, {name}!</h2>
                <p>Your account is now verified and ready to use.</p>
                <p>Here's what you can do:</p>
                <ul>
                    <li>Generate QR codes</li>
                    <li>Edit images and remove backgrounds</li>
                    <li>Merge, split, and compress PDFs</li>
                    <li>Convert websites to PDF</li>
                    <li>And much more!</li>
                </ul>
                <p>You get 3 free uses per day, or upgrade to Pro for unlimited access.</p>
                <p><a href="{settings.frontend_url}/dashboard">Start using Tulz</a></p>
            """,
        }

        with httpx.Client() as client:
            response = client.post(
                "https://api.zeptomail.com/v1.1/email",
                json=payload,
                headers={
                    "Authorization": f"Zoho-enczapikey {settings.zeptomail_api_key}",
                    "Content-Type": "application/json",
                },
            )
            response.raise_for_status()

        return {"success": True, "email": email}

    except Exception as e:
        self.retry(exc=e)
