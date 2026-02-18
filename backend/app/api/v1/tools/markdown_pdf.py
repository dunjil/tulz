"""Markdown to PDF endpoints.

NOTE: Markdown to PDF is a FREE tool for all users - no usage limits applied.
Usage is tracked for analytics purposes only.
"""

import os
import time
import uuid
from io import BytesIO
from typing import Optional

import markdown
from weasyprint import HTML, CSS
from fastapi import APIRouter
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from app.api.deps import ClientIP, DbSession, OptionalUser, UserAgent
from app.config import settings
from app.models.history import ToolType
from app.services.usage_service import UsageService

router = APIRouter()

# Temp file storage
TEMP_DIR = settings.temp_file_dir
os.makedirs(TEMP_DIR, exist_ok=True)

# CSS themes for PDF styling (reduced padding for better page utilization)
THEMES = {
    "default": """
        body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.5; color: #333; max-width: 100%; margin: 0; padding: 20px 25px; font-size: 11pt; }
        h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 8px; margin-top: 0; font-size: 20pt; }
        h2 { color: #34495e; margin-top: 18px; font-size: 16pt; }
        h3 { color: #7f8c8d; font-size: 13pt; }
        code { background: #f4f4f4; padding: 1px 4px; border-radius: 3px; font-family: 'Monaco', 'Consolas', monospace; font-size: 10pt; }
        pre { background: #2d2d2d; color: #f8f8f2; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 9pt; }
        pre code { background: none; color: inherit; }
        blockquote { border-left: 3px solid #3498db; margin: 12px 0; padding: 8px 15px; background: #f9f9f9; }
        table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 10pt; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #3498db; color: white; }
        tr:nth-child(even) { background: #f9f9f9; }
        a { color: #3498db; }
        img { max-width: 100%; height: auto; }
        hr { border: none; border-top: 1px solid #eee; margin: 16px 0; }
        p { margin: 8px 0; }
    """,
    "github": """
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; line-height: 1.4; color: #24292e; max-width: 100%; margin: 0; padding: 20px 25px; font-size: 11pt; }
        h1, h2 { border-bottom: 1px solid #eaecef; padding-bottom: 0.2em; }
        h1 { font-size: 1.8em; margin-top: 0; }
        h2 { font-size: 1.4em; }
        code { background: rgba(27,31,35,0.05); padding: 0.1em 0.3em; border-radius: 3px; font-size: 85%; }
        pre { background: #f6f8fa; padding: 12px; border-radius: 5px; overflow: auto; line-height: 1.4; font-size: 9pt; }
        pre code { background: none; padding: 0; }
        blockquote { border-left: 0.2em solid #dfe2e5; padding: 0 0.8em; color: #6a737d; margin: 0; }
        table { border-collapse: collapse; width: 100%; font-size: 10pt; }
        th, td { border: 1px solid #dfe2e5; padding: 5px 10px; }
        th { background: #f6f8fa; }
        tr:nth-child(2n) { background: #f6f8fa; }
        a { color: #0366d6; text-decoration: none; }
        hr { border: 0; border-top: 1px solid #eaecef; margin: 16px 0; }
        p { margin: 8px 0; }
    """,
    "academic": """
        body { font-family: 'Times New Roman', Times, serif; line-height: 1.6; color: #000; max-width: 100%; margin: 0; padding: 25px 30px; font-size: 11pt; }
        h1 { font-size: 18pt; text-align: center; margin-bottom: 20px; margin-top: 0; }
        h2 { font-size: 14pt; margin-top: 18pt; }
        h3 { font-size: 12pt; font-style: italic; }
        code { font-family: 'Courier New', monospace; font-size: 9pt; }
        pre { background: #f5f5f5; padding: 10pt; border: 1px solid #ddd; font-size: 9pt; }
        blockquote { margin: 10pt 30pt; font-style: italic; }
        table { border-collapse: collapse; width: 100%; margin: 10pt 0; font-size: 10pt; }
        th, td { border: 1px solid #000; padding: 6pt; }
        th { font-weight: bold; }
        a { color: #000; }
        p { text-align: justify; text-indent: 0.4in; margin: 0 0 8pt 0; }
        p:first-of-type { text-indent: 0; }
    """,
    "minimal": """
        body { font-family: Georgia, serif; line-height: 1.5; color: #333; max-width: 100%; margin: 0; padding: 20px 25px; font-size: 11pt; }
        h1, h2, h3 { font-weight: normal; }
        h1 { font-size: 1.8em; margin-bottom: 0.4em; margin-top: 0; }
        h2 { font-size: 1.4em; margin-top: 1.5em; }
        code { font-family: monospace; background: #f9f9f9; padding: 1px 3px; font-size: 10pt; }
        pre { background: #f9f9f9; padding: 0.8em; overflow-x: auto; font-size: 9pt; }
        blockquote { margin: 0.8em 0; padding-left: 0.8em; border-left: 2px solid #ccc; color: #666; }
        table { width: 100%; border-collapse: collapse; font-size: 10pt; }
        th, td { padding: 0.4em; border-bottom: 1px solid #ddd; text-align: left; }
        a { color: #069; }
        p { margin: 8px 0; }
    """,
}


class MarkdownPdfRequest(BaseModel):
    """Request for Markdown to PDF conversion."""
    content: str = Field(..., description="Markdown content to convert")
    theme: str = Field(default="default", description="PDF theme: default, github, academic, minimal")
    title: Optional[str] = Field(default=None, description="Document title")


class MarkdownPdfResponse(BaseModel):
    """Response for Markdown to PDF conversion."""
    success: bool
    download_url: Optional[str] = None
    error: Optional[str] = None
    stats: Optional[dict] = None


@router.post("/convert", response_model=MarkdownPdfResponse)
async def convert_markdown_to_pdf(
    data: MarkdownPdfRequest,
    session: DbSession = None,
    user: OptionalUser = None,
    client_ip: ClientIP = None,
    user_agent: UserAgent = None,
):
    """
    Convert Markdown to styled PDF.

    This endpoint is FREE for all users - usage tracked for analytics only.
    """
    start_time = time.time()
    try:
        # Get theme CSS
        theme_css = THEMES.get(data.theme, THEMES["default"])

        # Convert markdown to HTML
        md = markdown.Markdown(extensions=[
            'tables',
            'fenced_code',
            'codehilite',
            'toc',
            'nl2br',
        ])
        html_content = md.convert(data.content)

        # Wrap in full HTML document
        title = data.title or "Document"
        full_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>{title}</title>
        </head>
        <body>
            {html_content}
        </body>
        </html>
        """

        # Convert to PDF
        html = HTML(string=full_html)
        css = CSS(string=theme_css)
        pdf_bytes = html.write_pdf(stylesheets=[css])

        # Save to temp file
        file_id = str(uuid.uuid4())
        filename = f"{file_id}.pdf"
        filepath = os.path.join(TEMP_DIR, filename)

        with open(filepath, "wb") as f:
            f.write(pdf_bytes)

        # Track usage for analytics
        processing_time = int((time.time() - start_time) * 1000)
        usage_service = UsageService(session)
        await usage_service.record_usage_analytics_only(
            tool=ToolType.MARKDOWN,
            operation="convert",
            user=user,
            ip_address=client_ip,
            user_agent=user_agent,
            input_metadata={
                "content_length": len(data.content),
                "theme": data.theme,
            },
            output_metadata={
                "pdf_size": len(pdf_bytes),
            },
            processing_time_ms=processing_time,
        )

        return MarkdownPdfResponse(
            success=True,
            download_url=f"/api/v1/tools/markdown/download/{filename}",
            stats={
                "markdown_length": len(data.content),
                "pdf_size_bytes": len(pdf_bytes),
                "theme": data.theme,
            }
        )
    except Exception as e:
        return MarkdownPdfResponse(
            success=False,
            error=str(e)
        )


@router.get("/download/{filename}")
async def download_pdf(filename: str):
    """Download converted PDF."""
    if not filename or ".." in filename or "/" in filename:
        return {"error": "Invalid filename"}

    filepath = os.path.join(TEMP_DIR, filename)

    if not os.path.exists(filepath):
        return {"error": "File not found or expired"}

    return FileResponse(
        filepath,
        media_type="application/pdf",
        filename="document.pdf",
    )


@router.post("/preview")
async def preview_markdown_pdf(data: MarkdownPdfRequest):
    """
    Generate a PDF preview and return as base64.

    This endpoint is FREE for all users.
    """
    try:
        import base64

        # Get theme CSS
        theme_css = THEMES.get(data.theme, THEMES["default"])

        # Convert markdown to HTML
        md = markdown.Markdown(extensions=[
            'tables',
            'fenced_code',
            'codehilite',
            'toc',
            'nl2br',
        ])
        html_content = md.convert(data.content)

        # Wrap in full HTML document
        title = data.title or "Document"
        full_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>{title}</title>
        </head>
        <body>
            {html_content}
        </body>
        </html>
        """

        # Convert to PDF
        html = HTML(string=full_html)
        css = CSS(string=theme_css)
        pdf_bytes = html.write_pdf(stylesheets=[css])

        # Return as base64
        pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')

        return {
            "success": True,
            "pdf_base64": pdf_base64,
            "size_bytes": len(pdf_bytes),
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
        }


@router.get("/themes")
async def get_themes():
    """Get available PDF themes."""
    return {
        "themes": [
            {"id": "default", "name": "Default", "description": "Clean and modern style"},
            {"id": "github", "name": "GitHub", "description": "GitHub-flavored markdown style"},
            {"id": "academic", "name": "Academic", "description": "Formal academic paper style"},
            {"id": "minimal", "name": "Minimal", "description": "Simple and elegant"},
        ]
    }
