"""Image processing background tasks.

These tasks run asynchronously via Celery for heavy image operations.
"""

import os
import uuid
from typing import Optional

from celery import shared_task

from app.config import settings


@shared_task(bind=True, max_retries=2, default_retry_delay=60)
def remove_background(self, file_path: str, output_dir: str) -> dict:
    """Remove background from an image using AI.

    This is a CPU/GPU intensive operation.

    Args:
        file_path: Path to the source image file
        output_dir: Directory to save output file

    Returns:
        dict with processed file info
    """
    try:
        from rembg import remove
        from PIL import Image

        # Load image
        with Image.open(file_path) as img:
            # Remove background
            output = remove(img)

            output_filename = f"nobg_{uuid.uuid4().hex[:8]}.png"
            output_path = os.path.join(output_dir, output_filename)

            # Save as PNG to preserve transparency
            output.save(output_path, "PNG")

        return {
            "success": True,
            "filename": output_filename,
            "path": output_path,
            "size": os.path.getsize(output_path),
        }

    except Exception as e:
        self.retry(exc=e)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def resize_image(
    self,
    file_path: str,
    width: int,
    height: int,
    maintain_aspect: bool,
    output_dir: str,
    output_format: str = "PNG",
) -> dict:
    """Resize an image to specified dimensions.

    Args:
        file_path: Path to the source image file
        width: Target width in pixels
        height: Target height in pixels
        maintain_aspect: Whether to maintain aspect ratio
        output_dir: Directory to save output file
        output_format: Output format (PNG, JPEG, WEBP)

    Returns:
        dict with resized file info
    """
    try:
        from PIL import Image

        with Image.open(file_path) as img:
            if maintain_aspect:
                img.thumbnail((width, height), Image.Resampling.LANCZOS)
            else:
                img = img.resize((width, height), Image.Resampling.LANCZOS)

            # Convert to RGB for JPEG
            if output_format.upper() == "JPEG" and img.mode in ("RGBA", "P"):
                img = img.convert("RGB")

            ext = output_format.lower()
            if ext == "jpeg":
                ext = "jpg"

            output_filename = f"resized_{uuid.uuid4().hex[:8]}.{ext}"
            output_path = os.path.join(output_dir, output_filename)

            img.save(output_path, output_format.upper())

        return {
            "success": True,
            "filename": output_filename,
            "path": output_path,
            "size": os.path.getsize(output_path),
            "width": width,
            "height": height,
        }

    except Exception as e:
        self.retry(exc=e)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def convert_image_format(
    self,
    file_path: str,
    output_format: str,
    quality: int,
    output_dir: str,
) -> dict:
    """Convert image to a different format.

    Args:
        file_path: Path to the source image file
        output_format: Target format (PNG, JPEG, WEBP, GIF, BMP)
        quality: Quality for lossy formats (1-100)
        output_dir: Directory to save output file

    Returns:
        dict with converted file info
    """
    try:
        from PIL import Image

        with Image.open(file_path) as img:
            # Convert to RGB for formats that don't support alpha
            if output_format.upper() in ("JPEG", "JPG", "BMP"):
                if img.mode in ("RGBA", "P"):
                    img = img.convert("RGB")

            ext = output_format.lower()
            if ext == "jpeg":
                ext = "jpg"

            output_filename = f"converted_{uuid.uuid4().hex[:8]}.{ext}"
            output_path = os.path.join(output_dir, output_filename)

            save_kwargs = {}
            if output_format.upper() in ("JPEG", "JPG", "WEBP"):
                save_kwargs["quality"] = quality

            img.save(output_path, output_format.upper(), **save_kwargs)

        return {
            "success": True,
            "filename": output_filename,
            "path": output_path,
            "size": os.path.getsize(output_path),
            "format": output_format.upper(),
        }

    except Exception as e:
        self.retry(exc=e)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def crop_image(
    self,
    file_path: str,
    left: int,
    top: int,
    right: int,
    bottom: int,
    output_dir: str,
) -> dict:
    """Crop an image to specified box.

    Args:
        file_path: Path to the source image file
        left: Left coordinate
        top: Top coordinate
        right: Right coordinate
        bottom: Bottom coordinate
        output_dir: Directory to save output file

    Returns:
        dict with cropped file info
    """
    try:
        from PIL import Image

        with Image.open(file_path) as img:
            cropped = img.crop((left, top, right, bottom))

            # Preserve format
            format_ext = file_path.rsplit(".", 1)[-1].lower()
            if format_ext == "jpg":
                format_ext = "jpeg"

            output_filename = f"cropped_{uuid.uuid4().hex[:8]}.{format_ext}"
            output_path = os.path.join(output_dir, output_filename)

            cropped.save(output_path)

        return {
            "success": True,
            "filename": output_filename,
            "path": output_path,
            "size": os.path.getsize(output_path),
            "width": right - left,
            "height": bottom - top,
        }

    except Exception as e:
        self.retry(exc=e)
