"""Email service using ZeptoMail."""

from typing import Optional

import httpx

from app.config import settings


class EmailService:
    """Service for sending emails via ZeptoMail."""

    ZEPTOMAIL_API_URL = "https://api.zeptomail.com/v1.1/email"

    def __init__(self):
        self.api_key = settings.zeptomail_api_key
        self.from_email = settings.zeptomail_from_email
        self.from_name = settings.zeptomail_from_name

    async def send_email(
        self,
        to_email: str,
        to_name: str,
        subject: str,
        html_body: str,
        text_body: Optional[str] = None,
    ) -> bool:
        """
        Send an email via ZeptoMail.
        Returns True if successful, False otherwise.
        """
        if not self.api_key:
            # Log warning in development
            print(f"[EMAIL] Would send to {to_email}: {subject}")
            return True

        payload = {
            "from": {"address": self.from_email, "name": self.from_name},
            "to": [{"email_address": {"address": to_email, "name": to_name}}],
            "subject": subject,
            "htmlbody": html_body,
        }

        if text_body:
            payload["textbody"] = text_body

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.ZEPTOMAIL_API_URL,
                    json=payload,
                    headers={
                        "Authorization": f"Zoho-enczapikey {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    timeout=30.0,
                )
                return response.status_code == 200
        except Exception as e:
            print(f"[EMAIL ERROR] Failed to send email: {e}")
            return False

    async def send_verification_email(
        self,
        to_email: str,
        to_name: str,
        verification_url: str,
    ) -> bool:
        """Send email verification email."""
        subject = "Verify your ToolHub account"
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .button {{ display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; }}
                .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Welcome to ToolHub!</h1>
                <p>Hi {to_name},</p>
                <p>Thanks for signing up! Please verify your email address by clicking the button below:</p>
                <p style="margin: 30px 0;">
                    <a href="{verification_url}" class="button">Verify Email</a>
                </p>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #2563eb;">{verification_url}</p>
                <p>This link will expire in 24 hours.</p>
                <div class="footer">
                    <p>If you didn't create an account, you can safely ignore this email.</p>
                    <p>&copy; ToolHub - Your All-in-One Productivity Suite</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_body = f"""
        Welcome to ToolHub!

        Hi {to_name},

        Thanks for signing up! Please verify your email address by visiting:
        {verification_url}

        This link will expire in 24 hours.

        If you didn't create an account, you can safely ignore this email.

        © ToolHub - Your All-in-One Productivity Suite
        """

        return await self.send_email(to_email, to_name, subject, html_body, text_body)

    async def send_password_reset_email(
        self,
        to_email: str,
        to_name: str,
        reset_url: str,
    ) -> bool:
        """Send password reset email."""
        subject = "Reset your ToolHub password"
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .button {{ display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; }}
                .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }}
                .warning {{ background-color: #fef3cd; border: 1px solid #ffc107; padding: 12px; border-radius: 6px; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Password Reset Request</h1>
                <p>Hi {to_name},</p>
                <p>We received a request to reset your password. Click the button below to set a new password:</p>
                <p style="margin: 30px 0;">
                    <a href="{reset_url}" class="button">Reset Password</a>
                </p>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #2563eb;">{reset_url}</p>
                <div class="warning">
                    <strong>⚠️ This link will expire in 1 hour.</strong>
                </div>
                <div class="footer">
                    <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
                    <p>&copy; ToolHub - Your All-in-One Productivity Suite</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_body = f"""
        Password Reset Request

        Hi {to_name},

        We received a request to reset your password. Visit this link to set a new password:
        {reset_url}

        This link will expire in 1 hour.

        If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

        © ToolHub - Your All-in-One Productivity Suite
        """

        return await self.send_email(to_email, to_name, subject, html_body, text_body)

    async def send_welcome_email(
        self,
        to_email: str,
        to_name: str,
    ) -> bool:
        """Send welcome email after verification."""
        subject = "Welcome to ToolHub! 🎉"
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .feature {{ margin: 15px 0; padding: 15px; background: #f8fafc; border-radius: 8px; }}
                .feature h3 {{ margin: 0 0 5px 0; color: #2563eb; }}
                .button {{ display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; }}
                .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Welcome to ToolHub! 🎉</h1>
                <p>Hi {to_name},</p>
                <p>Your account is now verified and ready to use. Here's what you can do with ToolHub:</p>

                <div class="feature">
                    <h3>📱 QR Code Generator</h3>
                    <p>Create customizable QR codes for URLs, WiFi, contacts, and more.</p>
                </div>

                <div class="feature">
                    <h3>🧮 Advanced Calculator</h3>
                    <p>Scientific calculations, loan/EMI calculators, and unit converters.</p>
                </div>

                <div class="feature">
                    <h3>🖼️ Image Editor</h3>
                    <p>Remove backgrounds, resize, crop, and convert image formats.</p>
                </div>

                <div class="feature">
                    <h3>📄 PDF Toolkit</h3>
                    <p>Merge, split, compress PDFs, and convert to Word.</p>
                </div>

                <div class="feature">
                    <h3>📊 Excel to CSV</h3>
                    <p>Convert Excel files to CSV with multi-sheet support.</p>
                </div>

                <p style="margin: 30px 0;">
                    <a href="http://localhost:3000/dashboard" class="button">Go to Dashboard</a>
                </p>

                <p><strong>Free tier includes 3 uses per day.</strong> Upgrade anytime for unlimited access!</p>

                <div class="footer">
                    <p>&copy; ToolHub - Your All-in-One Productivity Suite</p>
                </div>
            </div>
        </body>
        </html>
        """

        return await self.send_email(to_email, to_name, subject, html_body)


    async def send_donation_thank_you_email(
        self,
        to_email: str,
        to_name: str,
        amount: float,
        currency: str = "USD",
    ) -> bool:
        """Send thank you email after donation."""
        display_name = to_name if to_name else "Supporter"
        subject = "Thank you for supporting Tulz! 💖"
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .heart {{ font-size: 48px; text-align: center; margin: 20px 0; }}
                .amount {{ font-size: 32px; font-weight: bold; color: #ec4899; text-align: center; margin: 20px 0; }}
                .message {{ background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%); padding: 20px; border-radius: 12px; margin: 20px 0; }}
                .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="heart">💖</div>
                <h1 style="text-align: center;">Thank You!</h1>
                <p>Hi {display_name},</p>
                <p>We're incredibly grateful for your generous donation to Tulz!</p>

                <div class="amount">${amount:.2f} {currency}</div>

                <div class="message">
                    <p><strong>Your support means the world to us.</strong></p>
                    <p>Donations like yours help us:</p>
                    <ul>
                        <li>Keep Tulz free for everyone</li>
                        <li>Build new tools and features</li>
                        <li>Maintain and improve existing tools</li>
                        <li>Cover hosting and infrastructure costs</li>
                    </ul>
                </div>

                <p>You're making a real difference in helping us build better productivity tools for people around the world.</p>

                <p style="text-align: center; margin-top: 30px;">
                    <strong>From the bottom of our hearts, thank you! 🙏</strong>
                </p>

                <div class="footer">
                    <p>&copy; Tulz - Your All-in-One Productivity Suite</p>
                    <p style="font-size: 12px; color: #999;">This is a one-time thank you email. You will not receive marketing emails unless you sign up for an account.</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_body = f"""
        Thank You for Supporting Tulz! 💖

        Hi {display_name},

        We're incredibly grateful for your generous donation of ${amount:.2f} {currency} to Tulz!

        Your support means the world to us. Donations like yours help us:
        - Keep Tulz free for everyone
        - Build new tools and features
        - Maintain and improve existing tools
        - Cover hosting and infrastructure costs

        You're making a real difference in helping us build better productivity tools for people around the world.

        From the bottom of our hearts, thank you! 🙏

        © Tulz - Your All-in-One Productivity Suite
        """

        return await self.send_email(to_email, display_name, subject, html_body, text_body)


# Singleton instance
email_service = EmailService()
