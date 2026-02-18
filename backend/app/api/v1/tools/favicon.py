"""Favicon generator endpoints.

NOTE: Favicon Generator is a FREE tool for all users - no usage limits applied.
Usage is tracked for analytics purposes only.
"""

import io
import os
import time
import uuid
import zipfile

from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import FileResponse
from PIL import Image

from app.api.deps import ClientIP, DbSession, OptionalUser, UserAgent
from app.config import settings
from app.core.exceptions import BadRequestError
from app.models.history import ToolType
from app.services.usage_service import UsageService

router = APIRouter()

# Temp file storage
TEMP_DIR = settings.temp_file_dir
os.makedirs(TEMP_DIR, exist_ok=True)

# Standard favicon sizes
FAVICON_SIZES = {
    "favicon-16x16.png": (16, 16),
    "favicon-32x32.png": (32, 32),
    "favicon-48x48.png": (48, 48),
    "apple-touch-icon.png": (180, 180),
    "android-chrome-192x192.png": (192, 192),
    "android-chrome-512x512.png": (512, 512),
    "mstile-150x150.png": (150, 150),
}


def create_ico_file(img: Image.Image) -> bytes:
    """Create a multi-resolution ICO file."""
    # ICO sizes (16, 32, 48)
    sizes = [(16, 16), (32, 32), (48, 48)]
    images = []

    for size in sizes:
        resized = img.copy()
        resized.thumbnail(size, Image.Resampling.LANCZOS)
        # Ensure exact size
        if resized.size != size:
            new_img = Image.new("RGBA", size, (0, 0, 0, 0))
            offset = ((size[0] - resized.size[0]) // 2, (size[1] - resized.size[1]) // 2)
            new_img.paste(resized, offset)
            resized = new_img
        images.append(resized)

    # Save as ICO
    ico_buffer = io.BytesIO()
    images[0].save(
        ico_buffer,
        format="ICO",
        sizes=[(img.size[0], img.size[1]) for img in images],
        append_images=images[1:]
    )
    return ico_buffer.getvalue()


def generate_webmanifest(site_name: str = "My Site") -> str:
    """Generate a web manifest JSON."""
    return f'''{{
  "name": "{site_name}",
  "short_name": "{site_name}",
  "icons": [
    {{
      "src": "/android-chrome-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    }},
    {{
      "src": "/android-chrome-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }}
  ],
  "theme_color": "#ffffff",
  "background_color": "#ffffff",
  "display": "standalone"
}}'''


def generate_browserconfig() -> str:
    """Generate browserconfig.xml for Microsoft tiles."""
    return '''<?xml version="1.0" encoding="utf-8"?>
<browserconfig>
    <msapplication>
        <tile>
            <square150x150logo src="/mstile-150x150.png"/>
            <TileColor>#ffffff</TileColor>
        </tile>
    </msapplication>
</browserconfig>'''


def generate_html_snippet() -> str:
    """Generate HTML snippet for including favicons."""
    return '''<!-- Favicons - Add these to your <head> section -->
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="msapplication-TileColor" content="#ffffff">
<meta name="msapplication-config" content="/browserconfig.xml">
<meta name="theme-color" content="#ffffff">'''


@router.post("/generate")
async def generate_favicon(
    file: UploadFile = File(...),
    site_name: str = Form("My Site"),
    include_ico: bool = Form(True),
    include_apple: bool = Form(True),
    include_android: bool = Form(True),
    include_ms: bool = Form(True),
    background_color: str = Form("#ffffff"),
    session: DbSession = None,
    user: OptionalUser = None,
    client_ip: ClientIP = None,
    user_agent: UserAgent = None,
):
    """Generate favicon package from uploaded image.

    NOTE: This is a FREE tool - usage tracked for analytics only.
    """
    start_time = time.time()
    # Validate file size
    content = await file.read()
    if len(content) > settings.max_file_size_bytes:
        raise BadRequestError(
            message=f"File too large. Maximum size is {settings.max_file_size_mb}MB"
        )

    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise BadRequestError(message="Invalid file type. Please upload an image.")

    try:
        # Open image
        img = Image.open(io.BytesIO(content))

        # Convert to RGBA if necessary
        if img.mode != "RGBA":
            img = img.convert("RGBA")

        # Create ZIP file with all favicons
        zip_id = str(uuid.uuid4())
        zip_filename = f"favicon-package-{zip_id}.zip"
        zip_filepath = os.path.join(TEMP_DIR, zip_filename)

        generated_files = []

        with zipfile.ZipFile(zip_filepath, "w", zipfile.ZIP_DEFLATED) as zf:
            # Generate PNG favicons
            for filename, size in FAVICON_SIZES.items():
                # Skip based on options
                if "apple" in filename and not include_apple:
                    continue
                if "android" in filename and not include_android:
                    continue
                if "mstile" in filename and not include_ms:
                    continue

                # Resize image
                resized = img.copy()
                resized.thumbnail(size, Image.Resampling.LANCZOS)

                # Center on background if not square
                if resized.size != size:
                    # Parse background color
                    bg_color = background_color.lstrip("#")
                    r, g, b = tuple(int(bg_color[i:i+2], 16) for i in (0, 2, 4))

                    new_img = Image.new("RGBA", size, (r, g, b, 255))
                    offset = ((size[0] - resized.size[0]) // 2, (size[1] - resized.size[1]) // 2)
                    new_img.paste(resized, offset, resized if resized.mode == "RGBA" else None)
                    resized = new_img

                # Save to buffer
                buffer = io.BytesIO()
                resized.save(buffer, format="PNG", optimize=True)
                zf.writestr(filename, buffer.getvalue())
                generated_files.append({"name": filename, "size": f"{size[0]}x{size[1]}"})

            # Generate ICO file
            if include_ico:
                ico_data = create_ico_file(img)
                zf.writestr("favicon.ico", ico_data)
                generated_files.append({"name": "favicon.ico", "size": "16x16, 32x32, 48x48"})

            # Generate manifest files
            zf.writestr("site.webmanifest", generate_webmanifest(site_name))
            generated_files.append({"name": "site.webmanifest", "size": "JSON"})

            if include_ms:
                zf.writestr("browserconfig.xml", generate_browserconfig())
                generated_files.append({"name": "browserconfig.xml", "size": "XML"})

            # Add HTML snippet
            zf.writestr("html-snippet.txt", generate_html_snippet())
            generated_files.append({"name": "html-snippet.txt", "size": "HTML"})

        # Get zip file size
        zip_size = os.path.getsize(zip_filepath)

        # Track usage for analytics
        processing_time = int((time.time() - start_time) * 1000)
        usage_service = UsageService(session)
        await usage_service.record_usage_analytics_only(
            tool=ToolType.FAVICON,
            operation="generate",
            user=user,
            ip_address=client_ip,
            user_agent=user_agent,
            input_metadata={
                "file_size": len(content),
                "site_name": site_name,
            },
            output_metadata={
                "files_count": len(generated_files),
                "zip_size": zip_size,
            },
            processing_time_ms=processing_time,
        )

        return {
            "success": True,
            "download_url": f"/api/v1/tools/favicon/download/{zip_filename}",
            "files": generated_files,
            "zip_size_bytes": zip_size,
            "site_name": site_name,
        }

    except Exception as e:
        raise BadRequestError(message=f"Failed to process image: {str(e)}")


@router.get("/download/{filename}")
async def download_favicon_package(filename: str):
    """Download favicon package ZIP file."""
    # Validate filename
    if not filename or ".." in filename or "/" in filename:
        raise BadRequestError(message="Invalid filename")

    if not filename.endswith(".zip"):
        raise BadRequestError(message="Invalid file type")

    filepath = os.path.join(TEMP_DIR, filename)

    if not os.path.exists(filepath):
        raise BadRequestError(message="File not found or expired")

    return FileResponse(
        filepath,
        media_type="application/zip",
        filename="favicon-package.zip",
    )


@router.get("/sizes")
async def get_favicon_sizes():
    """Get list of supported favicon sizes."""
    return {
        "standard": [
            {"name": "favicon.ico", "sizes": "16x16, 32x32, 48x48", "description": "Browser tab icon"},
            {"name": "favicon-16x16.png", "size": "16x16", "description": "Small browser icon"},
            {"name": "favicon-32x32.png", "size": "32x32", "description": "Standard browser icon"},
            {"name": "favicon-48x48.png", "size": "48x48", "description": "Large browser icon"},
        ],
        "apple": [
            {"name": "apple-touch-icon.png", "size": "180x180", "description": "iOS home screen icon"},
        ],
        "android": [
            {"name": "android-chrome-192x192.png", "size": "192x192", "description": "Android home screen"},
            {"name": "android-chrome-512x512.png", "size": "512x512", "description": "Android splash screen"},
        ],
        "microsoft": [
            {"name": "mstile-150x150.png", "size": "150x150", "description": "Windows tile"},
        ],
        "config_files": [
            {"name": "site.webmanifest", "description": "Web app manifest for PWA"},
            {"name": "browserconfig.xml", "description": "Microsoft browser config"},
            {"name": "html-snippet.txt", "description": "HTML code to add to your site"},
        ],
    }
