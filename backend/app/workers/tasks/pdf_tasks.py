"""PDF processing background tasks.

These tasks run asynchronously via Celery for heavy PDF operations.
"""

import os
import uuid
from typing import Optional

from celery import shared_task

from app.config import settings


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def process_pdf_split(self, file_path: str, page_ranges: str, output_dir: str) -> dict:
    """Split a PDF into multiple files based on page ranges.

    Args:
        file_path: Path to the source PDF file
        page_ranges: Comma-separated page ranges (e.g., "1-5,6-10")
        output_dir: Directory to save output files

    Returns:
        dict with result_files list
    """
    try:
        from pypdf import PdfReader, PdfWriter

        reader = PdfReader(file_path)
        total_pages = len(reader.pages)
        result_files = []

        # Parse page ranges
        if page_ranges.lower() == "all":
            ranges = [(i + 1, i + 1) for i in range(total_pages)]
        else:
            ranges = []
            for part in page_ranges.split(","):
                part = part.strip()
                if "-" in part:
                    start, end = map(int, part.split("-"))
                    ranges.append((start, end))
                else:
                    page = int(part)
                    ranges.append((page, page))

        # Create split PDFs
        for i, (start, end) in enumerate(ranges):
            writer = PdfWriter()
            for page_num in range(start - 1, min(end, total_pages)):
                writer.add_page(reader.pages[page_num])

            output_filename = f"split_{i + 1}_{uuid.uuid4().hex[:8]}.pdf"
            output_path = os.path.join(output_dir, output_filename)

            with open(output_path, "wb") as f:
                writer.write(f)

            result_files.append({
                "filename": output_filename,
                "path": output_path,
                "pages": end - start + 1,
                "size": os.path.getsize(output_path),
            })

        return {
            "success": True,
            "result_files": result_files,
            "total_files": len(result_files),
        }

    except Exception as e:
        # Retry on failure
        self.retry(exc=e)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def process_pdf_merge(self, file_paths: list[str], output_dir: str) -> dict:
    """Merge multiple PDFs into one.

    Args:
        file_paths: List of paths to PDF files to merge
        output_dir: Directory to save output file

    Returns:
        dict with merged file info
    """
    try:
        from pypdf import PdfReader, PdfWriter

        writer = PdfWriter()
        total_pages = 0

        for file_path in file_paths:
            reader = PdfReader(file_path)
            for page in reader.pages:
                writer.add_page(page)
                total_pages += 1

        output_filename = f"merged_{uuid.uuid4().hex[:8]}.pdf"
        output_path = os.path.join(output_dir, output_filename)

        with open(output_path, "wb") as f:
            writer.write(f)

        return {
            "success": True,
            "filename": output_filename,
            "path": output_path,
            "pages": total_pages,
            "size": os.path.getsize(output_path),
        }

    except Exception as e:
        self.retry(exc=e)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def process_pdf_compress(
    self, file_path: str, compression_level: str, output_dir: str
) -> dict:
    """Compress a PDF file.

    Args:
        file_path: Path to the source PDF file
        compression_level: 'low', 'medium', or 'high'
        output_dir: Directory to save output file

    Returns:
        dict with compressed file info
    """
    try:
        from pypdf import PdfReader, PdfWriter

        reader = PdfReader(file_path)
        writer = PdfWriter()

        for page in reader.pages:
            page.compress_content_streams()
            writer.add_page(page)

        # Set compression parameters based on level
        if compression_level == "high":
            for page in writer.pages:
                page.compress_content_streams()

        output_filename = f"compressed_{uuid.uuid4().hex[:8]}.pdf"
        output_path = os.path.join(output_dir, output_filename)

        with open(output_path, "wb") as f:
            writer.write(f)

        original_size = os.path.getsize(file_path)
        compressed_size = os.path.getsize(output_path)
        compression_ratio = (
            f"{round((1 - compressed_size / original_size) * 100)}%"
            if original_size > 0
            else "0%"
        )

        return {
            "success": True,
            "filename": output_filename,
            "path": output_path,
            "original_size": original_size,
            "compressed_size": compressed_size,
            "compression_ratio": compression_ratio,
        }

    except Exception as e:
        self.retry(exc=e)


@shared_task(bind=True, max_retries=2, default_retry_delay=60)
def process_pdf_to_word(self, file_path: str, output_dir: str) -> dict:
    """Convert PDF to Word document.

    This is a heavy operation that may take time.

    Args:
        file_path: Path to the source PDF file
        output_dir: Directory to save output file

    Returns:
        dict with converted file info
    """
    try:
        from pdf2docx import Converter

        output_filename = f"converted_{uuid.uuid4().hex[:8]}.docx"
        output_path = os.path.join(output_dir, output_filename)

        cv = Converter(file_path)
        cv.convert(output_path)
        cv.close()

        return {
            "success": True,
            "filename": output_filename,
            "path": output_path,
            "size": os.path.getsize(output_path),
        }

    except Exception as e:
        self.retry(exc=e)
