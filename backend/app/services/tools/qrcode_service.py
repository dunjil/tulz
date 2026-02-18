"""QR Code generation service."""

import base64
import io
from typing import Optional

import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers import RoundedModuleDrawer
from PIL import Image, ImageDraw, ImageFont

from app.schemas.tools import QRCodeFormat, QRCodeRequest, QRCodeType


class QRCodeService:
    """Service for QR code generation."""

    def generate(self, data: QRCodeRequest) -> str:
        """Generate QR code and return base64 encoded string."""
        image_bytes = self.generate_bytes(data)
        return base64.b64encode(image_bytes).decode("utf-8")

    def generate_bytes(self, data: QRCodeRequest) -> bytes:
        """Generate QR code and return bytes."""
        # Build content string based on type
        content = self._build_content(data)

        # Create QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=self._get_error_correction(data.error_correction),
            box_size=10,
            border=4,
        )
        qr.add_data(content)
        qr.make(fit=True)

        # Generate image
        if data.format == QRCodeFormat.SVG:
            return self._generate_svg(qr, data)
        else:
            return self._generate_png(qr, data)

    def _build_content(self, data: QRCodeRequest) -> str:
        """Build QR code content string based on type."""
        if data.content_type == QRCodeType.URL:
            return data.content

        elif data.content_type == QRCodeType.TEXT:
            return data.content

        elif data.content_type == QRCodeType.WIFI:
            ssid = data.wifi_ssid or data.content
            password = data.wifi_password or ""
            auth = data.wifi_auth.value
            hidden = "true" if data.wifi_hidden else "false"
            return f"WIFI:T:{auth};S:{ssid};P:{password};H:{hidden};;"

        elif data.content_type == QRCodeType.VCARD:
            lines = ["BEGIN:VCARD", "VERSION:3.0"]
            if data.vcard_name:
                lines.append(f"FN:{data.vcard_name}")
            if data.vcard_phone:
                lines.append(f"TEL:{data.vcard_phone}")
            if data.vcard_email:
                lines.append(f"EMAIL:{data.vcard_email}")
            if data.vcard_org:
                lines.append(f"ORG:{data.vcard_org}")
            if data.vcard_title:
                lines.append(f"TITLE:{data.vcard_title}")
            if data.vcard_url:
                lines.append(f"URL:{data.vcard_url}")
            lines.append("END:VCARD")
            return "\n".join(lines)

        elif data.content_type == QRCodeType.EMAIL:
            return f"mailto:{data.content}"

        elif data.content_type == QRCodeType.PHONE:
            return f"tel:{data.content}"

        return data.content

    def _get_error_correction(self, level: str):
        """Get error correction constant."""
        levels = {
            "L": qrcode.constants.ERROR_CORRECT_L,
            "M": qrcode.constants.ERROR_CORRECT_M,
            "Q": qrcode.constants.ERROR_CORRECT_Q,
            "H": qrcode.constants.ERROR_CORRECT_H,
        }
        return levels.get(level.upper(), qrcode.constants.ERROR_CORRECT_M)

    def _generate_png(self, qr: qrcode.QRCode, data: QRCodeRequest) -> bytes:
        """Generate PNG image."""
        # Parse colors
        fg_color = data.foreground_color
        bg_color = data.background_color

        # Create image
        img = qr.make_image(
            fill_color=fg_color,
            back_color=bg_color,
        )

        # Convert to PIL Image for manipulation
        if not isinstance(img, Image.Image):
            img = img.get_image()

        # Resize to requested size
        img = img.resize((data.size, data.size), Image.Resampling.LANCZOS)

        # Add logo if provided
        if data.logo_base64:
            img = self._add_logo(img, data.logo_base64, data.logo_size_percent)

        # Convert to bytes
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        return buffer.getvalue()

    def _generate_svg(self, qr: qrcode.QRCode, data: QRCodeRequest) -> bytes:
        """Generate SVG image."""
        import qrcode.image.svg

        # Create SVG factory
        if data.background_color.upper() == "#FFFFFF":
            factory = qrcode.image.svg.SvgPathImage
        else:
            factory = qrcode.image.svg.SvgImage

        img = qr.make_image(image_factory=factory)

        # Get SVG string
        buffer = io.BytesIO()
        img.save(buffer)
        svg_content = buffer.getvalue()

        # Modify SVG to set colors and size
        svg_str = svg_content.decode("utf-8")

        # Update viewBox and dimensions
        svg_str = svg_str.replace(
            'width="',
            f'width="{data.size}" height="{data.size}" original-width="',
            1
        )

        return svg_str.encode("utf-8")

    def _add_logo(
        self,
        img: Image.Image,
        logo_base64: str,
        size_percent: int,
    ) -> Image.Image:
        """Add logo overlay to QR code."""
        try:
            # Decode logo
            logo_data = base64.b64decode(logo_base64)
            logo = Image.open(io.BytesIO(logo_data))

            # Calculate logo size
            logo_max_size = int(img.size[0] * size_percent / 100)
            logo.thumbnail((logo_max_size, logo_max_size), Image.Resampling.LANCZOS)

            # Calculate position (center)
            pos_x = (img.size[0] - logo.size[0]) // 2
            pos_y = (img.size[1] - logo.size[1]) // 2

            # Create white background for logo
            if logo.mode == "RGBA":
                # Create white background
                bg = Image.new("RGBA", logo.size, "white")
                bg.paste(logo, mask=logo.split()[3])
                logo = bg

            # Paste logo
            img = img.convert("RGBA")
            img.paste(logo, (pos_x, pos_y))

            return img.convert("RGB")
        except Exception:
            # If logo fails, return original image
            return img

    def apply_watermark(self, base64_image: str, format: QRCodeFormat) -> str:
        """Apply watermark to base64 image."""
        if format == QRCodeFormat.SVG:
            return base64_image  # Can't easily watermark SVG

        image_bytes = base64.b64decode(base64_image)
        watermarked = self.apply_watermark_bytes(image_bytes, format)
        return base64.b64encode(watermarked).decode("utf-8")

    def apply_watermark_bytes(self, image_bytes: bytes, format: QRCodeFormat) -> bytes:
        """Apply watermark to image bytes."""
        if format == QRCodeFormat.SVG:
            return image_bytes

        # Open image
        img = Image.open(io.BytesIO(image_bytes))
        img = img.convert("RGBA")

        # Create watermark overlay
        txt_layer = Image.new("RGBA", img.size, (255, 255, 255, 0))
        draw = ImageDraw.Draw(txt_layer)

        # Watermark text
        watermark_text = "ToolHub Free"

        # Try to use a font, fall back to default
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
        except Exception:
            font = ImageFont.load_default()

        # Get text size
        bbox = draw.textbbox((0, 0), watermark_text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]

        # Position at bottom right
        x = img.size[0] - text_width - 10
        y = img.size[1] - text_height - 10

        # Draw semi-transparent background
        padding = 4
        draw.rectangle(
            [x - padding, y - padding, x + text_width + padding, y + text_height + padding],
            fill=(255, 255, 255, 200),
        )

        # Draw text
        draw.text((x, y), watermark_text, font=font, fill=(100, 100, 100, 255))

        # Composite
        img = Image.alpha_composite(img, txt_layer)

        # Convert back to bytes
        buffer = io.BytesIO()
        img.convert("RGB").save(buffer, format="PNG")
        return buffer.getvalue()
