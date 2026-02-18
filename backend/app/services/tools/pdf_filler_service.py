"""PDF Filler service for filling forms, adding signatures, and annotations."""

import io
import os
import base64
from typing import Tuple, List, Dict, Any, Optional
from concurrent.futures import ThreadPoolExecutor

from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.colors import Color, HexColor
from reportlab.lib.utils import ImageReader
from PIL import Image

from app.core.exceptions import BadRequestError, FileProcessingError

# Use CPU count for better parallelization (min 4, max 16)
_max_workers = min(max(os.cpu_count() or 4, 4), 16)
_executor = ThreadPoolExecutor(max_workers=_max_workers)


class PDFFillerService:
    """Service for PDF filling, signing, and annotation operations."""

    async def get_pdf_info(self, pdf_bytes: bytes) -> Dict[str, Any]:
        """Get PDF information including page count and dimensions."""
        try:
            reader = PdfReader(io.BytesIO(pdf_bytes))
            total_pages = len(reader.pages)

            pages_info = []
            for i, page in enumerate(reader.pages):
                media_box = page.mediabox
                width = float(media_box.width)
                height = float(media_box.height)
                pages_info.append({
                    "page": i + 1,
                    "width": width,
                    "height": height,
                })

            # Get form fields if any
            fields = []
            if reader.get_fields():
                for field_name, field_data in reader.get_fields().items():
                    field_type = str(field_data.get("/FT", "")).replace("/", "")
                    fields.append({
                        "name": field_name,
                        "type": field_type,
                        "value": field_data.get("/V", ""),
                    })

            return {
                "total_pages": total_pages,
                "pages": pages_info,
                "has_form_fields": len(fields) > 0,
                "form_fields": fields,
            }
        except Exception as e:
            raise FileProcessingError(message=f"Failed to read PDF: {str(e)}")

    async def render_page_to_image(
        self,
        pdf_bytes: bytes,
        page_number: int,
        scale: float = 2.0,
    ) -> Tuple[bytes, int, int]:
        """Render a PDF page to an image for canvas display."""
        try:
            import fitz  # PyMuPDF

            doc = fitz.open(stream=pdf_bytes, filetype="pdf")

            if page_number < 1 or page_number > len(doc):
                raise BadRequestError(message=f"Invalid page number: {page_number}")

            page = doc[page_number - 1]

            # Render at higher resolution for quality
            mat = fitz.Matrix(scale, scale)
            pix = page.get_pixmap(matrix=mat, alpha=False)

            # Convert to PNG
            img_bytes = pix.tobytes("png")
            width = pix.width
            height = pix.height

            doc.close()

            return img_bytes, width, height

        except ImportError:
            # Fallback: return placeholder if PyMuPDF not available
            raise FileProcessingError(
                message="PDF rendering requires PyMuPDF (fitz). Please install it."
            )
        except Exception as e:
            raise FileProcessingError(message=f"Failed to render PDF page: {str(e)}")

    async def fill_pdf(
        self,
        pdf_bytes: bytes,
        annotations: List[Dict[str, Any]],
        canvas_scale: float = 1.0,
    ) -> Tuple[bytes, int]:
        """
        Fill PDF with annotations (text, drawings, signatures, etc.)

        Each annotation should have:
        - type: "text" | "signature" | "drawing" | "checkbox" | "image"
        - page: int (1-indexed)
        - x, y: position coordinates (from top-left)
        - width, height: dimensions
        - Additional type-specific fields

        canvas_scale: The scale at which the frontend canvas was rendered.
                      Coordinates will be divided by this to get PDF coordinates.
        """
        # Normalize annotation coordinates from canvas pixels to PDF points
        normalized_annotations = self._normalize_annotations(annotations, canvas_scale)

        # Use hybrid approach: fitz for reading, reportlab for overlay, fitz for merging
        try:
            return await self._fill_pdf_hybrid(pdf_bytes, normalized_annotations)
        except Exception as e:
            print(f"Hybrid fill failed: {type(e).__name__}: {str(e)}")
            # Fall back to fitz-only approach
            try:
                return await self._fill_pdf_with_fitz(pdf_bytes, normalized_annotations)
            except Exception as e2:
                print(f"Fitz fill also failed: {type(e2).__name__}: {str(e2)}")
                raise FileProcessingError(message=f"Failed to fill PDF: {str(e2)}")

    def _normalize_annotations(
        self,
        annotations: List[Dict[str, Any]],
        canvas_scale: float,
    ) -> List[Dict[str, Any]]:
        """Normalize annotation coordinates from canvas pixels to PDF points."""
        if canvas_scale == 1.0:
            return annotations

        normalized = []
        for ann in annotations:
            new_ann = ann.copy()

            # Scale basic coordinates
            if "x" in new_ann:
                new_ann["x"] = new_ann["x"] / canvas_scale
            if "y" in new_ann:
                new_ann["y"] = new_ann["y"] / canvas_scale
            if "width" in new_ann:
                new_ann["width"] = new_ann["width"] / canvas_scale
            if "height" in new_ann:
                new_ann["height"] = new_ann["height"] / canvas_scale

            # Scale font size for text
            if "fontSize" in new_ann:
                new_ann["fontSize"] = new_ann["fontSize"] / canvas_scale

            # Scale stroke width
            if "strokeWidth" in new_ann:
                new_ann["strokeWidth"] = new_ann["strokeWidth"] / canvas_scale

            # Scale line endpoints
            if "x1" in new_ann:
                new_ann["x1"] = new_ann["x1"] / canvas_scale
            if "y1" in new_ann:
                new_ann["y1"] = new_ann["y1"] / canvas_scale
            if "x2" in new_ann:
                new_ann["x2"] = new_ann["x2"] / canvas_scale
            if "y2" in new_ann:
                new_ann["y2"] = new_ann["y2"] / canvas_scale

            # Scale drawing paths
            if "paths" in new_ann:
                scaled_paths = []
                for path in new_ann["paths"]:
                    scaled_path = path.copy()
                    if "points" in scaled_path:
                        scaled_points = []
                        for point in scaled_path["points"]:
                            scaled_points.append({
                                "x": point["x"] / canvas_scale,
                                "y": point["y"] / canvas_scale,
                            })
                        scaled_path["points"] = scaled_points
                    scaled_paths.append(scaled_path)
                new_ann["paths"] = scaled_paths

            normalized.append(new_ann)

        return normalized

    async def _fill_pdf_hybrid(
        self,
        pdf_bytes: bytes,
        annotations: List[Dict[str, Any]],
    ) -> Tuple[bytes, int]:
        """
        Hybrid approach: preserve original PDF content and overlay annotations.
        This avoids file bloat from converting pages to images.
        """
        import fitz

        # Open original PDF
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        total_pages = len(doc)

        # Group annotations by page
        annotations_by_page: Dict[int, List[Dict]] = {}
        for ann in annotations:
            page_num = ann.get("page", 1)
            if page_num not in annotations_by_page:
                annotations_by_page[page_num] = []
            annotations_by_page[page_num].append(ann)

        # Process each page - add annotations directly without re-rendering
        for page_idx in range(total_pages):
            page_num = page_idx + 1
            page = doc[page_idx]
            page_rect = page.rect

            # Draw annotations on this page
            if page_num in annotations_by_page:
                for ann in annotations_by_page[page_num]:
                    self._draw_annotation_fitz(page, ann, page_rect.height)

        # Save with compression to reduce file size
        output = io.BytesIO()
        doc.save(output, garbage=4, deflate=True, clean=True)
        doc.close()

        return output.getvalue(), total_pages

    async def _fill_pdf_with_fitz(
        self,
        pdf_bytes: bytes,
        annotations: List[Dict[str, Any]],
    ) -> Tuple[bytes, int]:
        """Fill PDF using PyMuPDF (fitz) for better compatibility."""
        import fitz

        # Open the PDF
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        total_pages = len(doc)

        # Group annotations by page
        annotations_by_page: Dict[int, List[Dict]] = {}
        for ann in annotations:
            page_num = ann.get("page", 1)
            if page_num not in annotations_by_page:
                annotations_by_page[page_num] = []
            annotations_by_page[page_num].append(ann)

        # Process each page
        for page_num, page_annotations in annotations_by_page.items():
            if page_num < 1 or page_num > total_pages:
                continue

            page = doc[page_num - 1]
            page_rect = page.rect
            page_height = page_rect.height

            for ann in page_annotations:
                self._draw_annotation_fitz(page, ann, page_height)

        # Save to bytes with compression
        output = io.BytesIO()
        doc.save(output, garbage=4, deflate=True, clean=True)
        doc.close()

        return output.getvalue(), total_pages

    def _draw_annotation_fitz(
        self,
        page,
        ann: Dict[str, Any],
        page_height: float,
    ) -> None:
        """Draw annotation using PyMuPDF."""
        import fitz

        ann_type = ann.get("type", "text")
        x = ann.get("x", 0)
        y = ann.get("y", 0)
        width = ann.get("width", 100)
        height = ann.get("height", 20)

        if ann_type == "text":
            text = ann.get("text", "")
            font_size = ann.get("fontSize", 12)
            color_hex = ann.get("color", "#000000")

            # Convert hex to RGB (0-1 range)
            try:
                r = int(color_hex[1:3], 16) / 255
                g = int(color_hex[3:5], 16) / 255
                b = int(color_hex[5:7], 16) / 255
            except (ValueError, IndexError):
                r, g, b = 0, 0, 0

            # Insert text
            point = fitz.Point(x, y + font_size)
            page.insert_text(
                point,
                text,
                fontsize=font_size,
                color=(r, g, b),
            )

        elif ann_type == "signature" or ann_type == "image":
            data = ann.get("data", "")
            if not data:
                return

            try:
                # Remove data URL prefix if present
                if "," in data:
                    data = data.split(",")[1]

                # Decode base64
                img_bytes = base64.b64decode(data)

                # Create rect for image placement
                rect = fitz.Rect(x, y, x + width, y + height)

                # Insert image
                page.insert_image(rect, stream=img_bytes)
            except Exception:
                pass

        elif ann_type == "drawing":
            paths = ann.get("paths", [])
            color_hex = ann.get("color", "#000000")
            stroke_width = ann.get("strokeWidth", 2)

            try:
                r = int(color_hex[1:3], 16) / 255
                g = int(color_hex[3:5], 16) / 255
                b = int(color_hex[5:7], 16) / 255
            except (ValueError, IndexError):
                r, g, b = 0, 0, 0

            shape = page.new_shape()
            for path in paths:
                points = path.get("points", [])
                if len(points) < 2:
                    continue

                first = points[0]
                shape.draw_line(
                    fitz.Point(first.get("x", 0), first.get("y", 0)),
                    fitz.Point(first.get("x", 0), first.get("y", 0))
                )

                for i in range(1, len(points)):
                    p1 = points[i - 1]
                    p2 = points[i]
                    shape.draw_line(
                        fitz.Point(p1.get("x", 0), p1.get("y", 0)),
                        fitz.Point(p2.get("x", 0), p2.get("y", 0))
                    )

            shape.finish(color=(r, g, b), width=stroke_width)
            shape.commit()

        elif ann_type == "checkbox":
            checked = ann.get("checked", False)
            shape = page.new_shape()

            # Draw box
            rect = fitz.Rect(x, y, x + width, y + height)
            shape.draw_rect(rect)

            if checked:
                # Draw checkmark
                shape.draw_line(
                    fitz.Point(x + width * 0.2, y + height * 0.5),
                    fitz.Point(x + width * 0.4, y + height * 0.8)
                )
                shape.draw_line(
                    fitz.Point(x + width * 0.4, y + height * 0.8),
                    fitz.Point(x + width * 0.8, y + height * 0.2)
                )

            shape.finish(color=(0, 0, 0), width=1)
            shape.commit()

        elif ann_type == "highlight":
            color_hex = ann.get("color", "#FFFF00")
            opacity = ann.get("opacity", 0.3)

            try:
                r = int(color_hex[1:3], 16) / 255
                g = int(color_hex[3:5], 16) / 255
                b = int(color_hex[5:7], 16) / 255
            except (ValueError, IndexError):
                r, g, b = 1, 1, 0

            rect = fitz.Rect(x, y, x + width, y + height)
            shape = page.new_shape()
            shape.draw_rect(rect)
            shape.finish(fill=(r, g, b), fill_opacity=opacity)
            shape.commit()

        elif ann_type == "rectangle":
            color_hex = ann.get("color", "#000000")
            stroke_width = ann.get("strokeWidth", 2)

            try:
                r = int(color_hex[1:3], 16) / 255
                g = int(color_hex[3:5], 16) / 255
                b = int(color_hex[5:7], 16) / 255
            except (ValueError, IndexError):
                r, g, b = 0, 0, 0

            rect = fitz.Rect(x, y, x + width, y + height)
            shape = page.new_shape()
            shape.draw_rect(rect)
            shape.finish(color=(r, g, b), width=stroke_width)
            shape.commit()

        elif ann_type == "line":
            x1 = ann.get("x1", x)
            y1 = ann.get("y1", y)
            x2 = ann.get("x2", x + width)
            y2 = ann.get("y2", y + height)
            color_hex = ann.get("color", "#000000")
            stroke_width = ann.get("strokeWidth", 2)

            try:
                r = int(color_hex[1:3], 16) / 255
                g = int(color_hex[3:5], 16) / 255
                b = int(color_hex[5:7], 16) / 255
            except (ValueError, IndexError):
                r, g, b = 0, 0, 0

            shape = page.new_shape()
            shape.draw_line(fitz.Point(x1, y1), fitz.Point(x2, y2))
            shape.finish(color=(r, g, b), width=stroke_width)
            shape.commit()

        elif ann_type == "stamp":
            # Draw stamp (bordered text box or circle)
            stamp_type = ann.get("stampType", "custom")
            custom_text = ann.get("customText", "")
            color_hex = ann.get("color", "#16a34a")
            rotation = ann.get("rotation", 0)
            is_dashed = ann.get("isDashed", False)
            stamp_shape = ann.get("shape", "box")

            # Stamp labels
            stamp_labels = {
                "approved": "APPROVED",
                "draft": "DRAFT",
                "confidential": "CONFIDENTIAL",
                "paid": "PAID",
                "rejected": "REJECTED",
                "final": "FINAL",
                "copy": "COPY",
                "void": "VOID",
                "custom": custom_text or "CUSTOM",
            }
            stamp_text = stamp_labels.get(stamp_type, "STAMP")

            try:
                r = int(color_hex[1:3], 16) / 255
                g = int(color_hex[3:5], 16) / 255
                b = int(color_hex[5:7], 16) / 255
            except (ValueError, IndexError):
                r, g, b = 0, 0.5, 0

            # Calculate center for rotation
            center_x = x + width / 2
            center_y = y + height / 2

            # Draw stamp using a shape
            shape = page.new_shape()

            import math
            angle_rad = math.radians(rotation)
            cos_a = math.cos(angle_rad)
            sin_a = math.sin(angle_rad)

            if stamp_shape == "circle":
                # Draw circle border
                radius = min(width, height) / 2
                shape.draw_circle(fitz.Point(center_x, center_y), radius)

                if is_dashed:
                    shape.finish(color=(r, g, b), width=2, dashes="[6 4] 0")
                else:
                    shape.finish(color=(r, g, b), width=2)
                shape.commit()

                # Insert text at center (no rotation for circle stamps)
                font_size = min(width * 0.25, 18)

                try:
                    font = fitz.Font("helv")
                    text_width = font.text_length(stamp_text, fontsize=font_size)
                except Exception:
                    text_width = len(stamp_text) * font_size * 0.6

                text_x = center_x - text_width / 2
                text_y = center_y + font_size * 0.35

                try:
                    tw = fitz.TextWriter(page.rect)
                    tw.append(fitz.Point(text_x, text_y), stamp_text, fontsize=font_size)
                    tw.write_text(page, color=(r, g, b))
                except Exception:
                    page.insert_text(
                        fitz.Point(center_x, center_y),
                        stamp_text,
                        fontsize=font_size,
                        color=(r, g, b),
                    )
            else:
                # Draw rotated rectangle border
                half_w = width / 2
                half_h = height / 2
                corners = [
                    (-half_w, -half_h),
                    (half_w, -half_h),
                    (half_w, half_h),
                    (-half_w, half_h),
                ]

                # Rotate corners to match the text rotation
                rotated_corners = []
                for cx, cy in corners:
                    rx = cx * cos_a - cy * sin_a + center_x
                    ry = cx * sin_a + cy * cos_a + center_y
                    rotated_corners.append(fitz.Point(rx, ry))

                shape.draw_polyline(rotated_corners + [rotated_corners[0]])

                if is_dashed:
                    shape.finish(color=(r, g, b), width=2, dashes="[6 4] 0")
                else:
                    shape.finish(color=(r, g, b), width=2)
                shape.commit()

                # Insert rotated text at center
                font_size = min(height * 0.5, 24)

                try:
                    font = fitz.Font("helv")
                    text_width = font.text_length(stamp_text, fontsize=font_size)
                except Exception:
                    text_width = len(stamp_text) * font_size * 0.6

                text_x = center_x - text_width / 2
                text_y = center_y + font_size * 0.35

                try:
                    tw = fitz.TextWriter(page.rect)
                    tw.append(fitz.Point(text_x, text_y), stamp_text, fontsize=font_size)
                    tw.write_text(page, color=(r, g, b), morph=(fitz.Point(center_x, center_y), fitz.Matrix(cos_a, -sin_a, sin_a, cos_a, 0, 0)))
                except Exception:
                    page.insert_text(
                        fitz.Point(center_x, center_y),
                        stamp_text,
                        fontsize=font_size,
                        color=(r, g, b),
                    )

        elif ann_type == "signed_stamp" or ann_type == "signedStamp":
            # Draw signed stamp with signature image, text, and date
            stamp_text = ann.get("stampText", "APPROVED")
            signature_data = ann.get("signatureData", "")
            # Support both "date" and "dateText" field names
            date_str = ann.get("dateText", "") or ann.get("date", "")
            # Support both "borderColor" and "color" field names
            color_hex = ann.get("borderColor", "") or ann.get("color", "#16a34a")
            border_style = ann.get("borderStyle", "double")
            is_dashed = ann.get("isDashed", False)
            rotation = ann.get("rotation", 0)
            stamp_shape = ann.get("shape", "box")
            stamp_style = ann.get("stampStyle", "modern")
            text_layout = ann.get("textLayout", "curved")  # "curved" or "straight"

            try:
                r = int(color_hex[1:3], 16) / 255
                g = int(color_hex[3:5], 16) / 255
                b = int(color_hex[5:7], 16) / 255
            except (ValueError, IndexError):
                r, g, b = 0, 0.5, 0

            padding = 8
            center_x = x + width / 2
            center_y = y + height / 2

            # Set opacity for classic style (worn look)
            opacity = 0.85 if stamp_style == "classic" else 1.0

            # Draw border
            shape = page.new_shape()

            if stamp_shape == "circle":
                radius = min(width, height) / 2

                if stamp_style == "official":
                    # Official style: double border with decorative dots
                    shape.draw_circle(fitz.Point(center_x, center_y), radius)
                    shape.finish(color=(r, g, b), width=3, stroke_opacity=opacity)
                    shape.commit()

                    shape = page.new_shape()
                    shape.draw_circle(fitz.Point(center_x, center_y), radius - 6)
                    shape.finish(color=(r, g, b), width=1.5, stroke_opacity=opacity)
                    shape.commit()

                    # Draw decorative dots
                    dot_count = 24
                    dot_radius = radius - 12
                    import math
                    for i in range(dot_count):
                        angle = (i / dot_count) * 2 * math.pi
                        dot_x = center_x + dot_radius * math.cos(angle)
                        dot_y = center_y + dot_radius * math.sin(angle)
                        shape = page.new_shape()
                        shape.draw_circle(fitz.Point(dot_x, dot_y), 1)
                        shape.finish(color=(r, g, b), fill=(r, g, b), stroke_opacity=opacity, fill_opacity=opacity)
                        shape.commit()

                elif stamp_style == "classic":
                    # Classic style: thick border with inner ring
                    if is_dashed:
                        shape.draw_circle(fitz.Point(center_x, center_y), radius)
                        shape.finish(color=(r, g, b), width=4, dashes="[6 4] 0", stroke_opacity=opacity)
                    else:
                        shape.draw_circle(fitz.Point(center_x, center_y), radius)
                        shape.finish(color=(r, g, b), width=4, stroke_opacity=opacity)
                    shape.commit()

                    # Inner decorative ring
                    shape = page.new_shape()
                    shape.draw_circle(fitz.Point(center_x, center_y), radius - 8)
                    shape.finish(color=(r, g, b), width=1, stroke_opacity=opacity)
                    shape.commit()

                else:
                    # Modern style: clean single border
                    if is_dashed:
                        shape.draw_circle(fitz.Point(center_x, center_y), radius)
                        shape.finish(color=(r, g, b), width=2, dashes="[6 4] 0")
                    else:
                        shape.draw_circle(fitz.Point(center_x, center_y), radius)
                        shape.finish(color=(r, g, b), width=2)
                    shape.commit()

                # Draw text based on textLayout setting
                if text_layout == "curved":
                    import math
                    text_upper = stamp_text.upper()
                    font_size = min(10, radius * 0.13)
                    text_radius = radius - 18

                    try:
                        font = fitz.Font("helv")
                    except Exception:
                        font = None

                    # Draw curved text at top
                    start_angle = -math.pi / 2 - (len(text_upper) * 0.08)
                    for i, char in enumerate(text_upper):
                        angle = start_angle + (i * 0.16)
                        char_x = center_x + text_radius * math.cos(angle)
                        char_y = center_y + text_radius * math.sin(angle)

                        try:
                            tw = fitz.TextWriter(page.rect)
                            tw.append(fitz.Point(char_x, char_y), char, fontsize=font_size)
                            rotation_angle = angle + math.pi / 2
                            cos_r = math.cos(rotation_angle)
                            sin_r = math.sin(rotation_angle)
                            tw.write_text(page, color=(r, g, b), opacity=opacity,
                                         morph=(fitz.Point(char_x, char_y), fitz.Matrix(cos_r, sin_r, -sin_r, cos_r, 0, 0)))
                        except Exception:
                            page.insert_text(fitz.Point(char_x, char_y), char, fontsize=font_size, color=(r, g, b))

                    # Draw curved date at bottom
                    if date_str:
                        date_font_size = min(9, font_size * 0.9)
                        date_start_angle = math.pi / 2 + (len(date_str) * 0.06)
                        for i, char in enumerate(date_str):
                            angle = date_start_angle - (i * 0.12)
                            char_x = center_x + text_radius * math.cos(angle)
                            char_y = center_y + text_radius * math.sin(angle)

                            try:
                                tw = fitz.TextWriter(page.rect)
                                tw.append(fitz.Point(char_x, char_y), char, fontsize=date_font_size)
                                rotation_angle = angle - math.pi / 2
                                cos_r = math.cos(rotation_angle)
                                sin_r = math.sin(rotation_angle)
                                tw.write_text(page, color=(r, g, b), opacity=opacity,
                                             morph=(fitz.Point(char_x, char_y), fitz.Matrix(cos_r, sin_r, -sin_r, cos_r, 0, 0)))
                            except Exception:
                                page.insert_text(fitz.Point(char_x, char_y), char, fontsize=date_font_size, color=(r, g, b))
                else:
                    # Straight text layout
                    font_size = min(11, radius * 0.15)
                    text_upper = stamp_text.upper()
                    try:
                        font = fitz.Font("helv")
                        text_width = font.text_length(text_upper, fontsize=font_size)
                    except Exception:
                        text_width = len(text_upper) * font_size * 0.6

                    text_x = center_x - text_width / 2
                    text_y = y + padding + font_size + 5
                    page.insert_text(fitz.Point(text_x, text_y), text_upper, fontsize=font_size, color=(r, g, b))

                    if date_str:
                        date_font_size = min(10, font_size * 0.9)
                        try:
                            date_text_width = font.text_length(date_str, fontsize=date_font_size)
                        except Exception:
                            date_text_width = len(date_str) * date_font_size * 0.6
                        date_x = center_x - date_text_width / 2
                        page.insert_text(fitz.Point(date_x, y + height - padding - 5), date_str, fontsize=date_font_size, color=(r, g, b))

                # Draw signature if available
                if signature_data:
                    try:
                        if "," in signature_data:
                            signature_data = signature_data.split(",")[1]
                        img_bytes = base64.b64decode(signature_data)

                        sig_size = radius * 0.8
                        sig_x = center_x - sig_size / 2
                        sig_y = center_y - sig_size / 4

                        sig_rect = fitz.Rect(sig_x, sig_y, sig_x + sig_size, sig_y + sig_size * 0.5)
                        page.insert_image(sig_rect, stream=img_bytes)
                    except Exception:
                        pass

            else:
                # Rectangle shape
                if stamp_style == "official":
                    # Double border
                    shape.draw_rect(fitz.Rect(x, y, x + width, y + height))
                    shape.finish(color=(r, g, b), width=3, stroke_opacity=opacity)
                    shape.commit()

                    shape = page.new_shape()
                    shape.draw_rect(fitz.Rect(x + 4, y + 4, x + width - 4, y + height - 4))
                    shape.finish(color=(r, g, b), width=1.5, stroke_opacity=opacity)
                    shape.commit()

                elif stamp_style == "classic":
                    # Thick border
                    if is_dashed:
                        shape.draw_rect(fitz.Rect(x, y, x + width, y + height))
                        shape.finish(color=(r, g, b), width=4, dashes="[6 4] 0", stroke_opacity=opacity)
                    else:
                        shape.draw_rect(fitz.Rect(x, y, x + width, y + height))
                        shape.finish(color=(r, g, b), width=4, stroke_opacity=opacity)
                    shape.commit()

                else:
                    # Modern: clean border
                    if is_dashed:
                        shape.draw_rect(fitz.Rect(x, y, x + width, y + height))
                        shape.finish(color=(r, g, b), width=2, dashes="[6 4] 0")
                    else:
                        shape.draw_rect(fitz.Rect(x, y, x + width, y + height))
                        shape.finish(color=(r, g, b), width=2)
                    shape.commit()

                # Calculate font size to fit text within box width
                font_size = min(16 if stamp_style == "official" else 14, (height - padding * 2) * 0.18)
                try:
                    font = fitz.Font("helv")
                    text_width = font.text_length(stamp_text.upper(), fontsize=font_size)
                    max_text_width = width - padding * 2
                    if text_width > max_text_width:
                        font_size = font_size * (max_text_width / text_width)
                        text_width = font.text_length(stamp_text.upper(), fontsize=font_size)
                except Exception:
                    text_width = len(stamp_text) * font_size * 0.6

                # Draw stamp text at top, centered
                text_x = x + (width - text_width) / 2
                text_y = y + padding + font_size
                page.insert_text(fitz.Point(text_x, text_y), stamp_text.upper(), fontsize=font_size, color=(r, g, b))

                # Draw signature if available
                if signature_data:
                    try:
                        if "," in signature_data:
                            signature_data = signature_data.split(",")[1]
                        img_bytes = base64.b64decode(signature_data)

                        sig_height = height * 0.45
                        sig_width = width * 0.7
                        sig_x = x + (width - sig_width) / 2
                        sig_y = y + padding + font_size + 5

                        sig_rect = fitz.Rect(sig_x, sig_y, sig_x + sig_width, sig_y + sig_height)
                        page.insert_image(sig_rect, stream=img_bytes)
                    except Exception:
                        pass

                # Draw date at bottom, centered
                if date_str:
                    date_font_size = min(11, font_size * 0.7)
                    try:
                        date_text_width = font.text_length(date_str, fontsize=date_font_size)
                    except Exception:
                        date_text_width = len(date_str) * date_font_size * 0.6
                    date_x = x + (width - date_text_width) / 2
                    page.insert_text(fitz.Point(date_x, y + height - padding), date_str, fontsize=date_font_size, color=(r, g, b))

        elif ann_type == "watermark":
            # Draw watermark (text or image with opacity)
            content_type = ann.get("contentType", "text")
            content = ann.get("content", "WATERMARK")
            color_hex = ann.get("color", "#6b7280")
            opacity = ann.get("opacity", 0.3)
            rotation = ann.get("rotation", -45)
            font_size = ann.get("fontSize", 48)
            border_style = ann.get("borderStyle", "none")
            border_color_hex = ann.get("borderColor", "#6b7280")

            try:
                r = int(color_hex[1:3], 16) / 255
                g = int(color_hex[3:5], 16) / 255
                b = int(color_hex[5:7], 16) / 255
            except (ValueError, IndexError):
                r, g, b = 0.4, 0.4, 0.4

            center_x = x + width / 2
            center_y = y + height / 2

            if content_type == "text":
                # Draw text watermark with rotation
                import math
                # Use rotation angle directly - match Canvas clockwise convention
                angle_rad = math.radians(rotation)
                cos_a = math.cos(angle_rad)
                sin_a = math.sin(angle_rad)

                # Draw border if specified
                if border_style != "none":
                    try:
                        br = int(border_color_hex[1:3], 16) / 255
                        bg = int(border_color_hex[3:5], 16) / 255
                        bb = int(border_color_hex[5:7], 16) / 255
                    except (ValueError, IndexError):
                        br, bg, bb = r, g, b

                    shape = page.new_shape()
                    # Draw rotated border rectangle
                    half_w = width / 2
                    half_h = height / 2
                    corners = [
                        (-half_w, -half_h),
                        (half_w, -half_h),
                        (half_w, half_h),
                        (-half_w, half_h),
                    ]
                    # Rotate corners to match the text rotation
                    # Standard counter-clockwise rotation: x' = x*cos - y*sin, y' = x*sin + y*cos
                    # This matches the TextWriter morph rotation direction
                    rotated_corners = []
                    for cx, cy in corners:
                        rx = cx * cos_a - cy * sin_a + center_x
                        ry = cx * sin_a + cy * cos_a + center_y
                        rotated_corners.append(fitz.Point(rx, ry))
                    shape.draw_polyline(rotated_corners + [rotated_corners[0]])

                    if border_style == "dashed":
                        shape.finish(color=(br, bg, bb), width=2, dashes="[6 4] 0", stroke_opacity=opacity)
                    elif border_style == "dotted":
                        shape.finish(color=(br, bg, bb), width=2, dashes="[2 2] 0", stroke_opacity=opacity)
                    else:
                        shape.finish(color=(br, bg, bb), width=2, stroke_opacity=opacity)
                    shape.commit()

                # Insert text with rotation and opacity
                try:
                    font = fitz.Font("helv")
                    text_width = font.text_length(content, fontsize=font_size)
                except Exception:
                    text_width = len(content) * font_size * 0.6

                # Position text centered
                text_x = center_x - text_width / 2
                text_y = center_y + font_size * 0.35

                try:
                    tw = fitz.TextWriter(page.rect)
                    tw.append(fitz.Point(text_x, text_y), content, fontsize=font_size)
                    # Apply clockwise rotation around center point (same as Canvas)
                    # Clockwise matrix: [cos, -sin, sin, cos]
                    tw.write_text(
                        page,
                        color=(r, g, b),
                        opacity=opacity,
                        morph=(fitz.Point(center_x, center_y), fitz.Matrix(cos_a, -sin_a, sin_a, cos_a, 0, 0))
                    )
                except Exception:
                    # Fallback without rotation - position at center
                    page.insert_text(
                        fitz.Point(center_x, center_y),
                        content,
                        fontsize=font_size,
                        color=(r, g, b),
                    )

            elif content_type == "image" and content:
                # Draw image watermark
                try:
                    if "," in content:
                        content = content.split(",")[1]
                    img_bytes = base64.b64decode(content)

                    # Create a transparent version of the image
                    from PIL import Image
                    img = Image.open(io.BytesIO(img_bytes))
                    if img.mode != "RGBA":
                        img = img.convert("RGBA")

                    # Apply opacity
                    alpha = img.split()[3]
                    alpha = alpha.point(lambda p: int(p * opacity))
                    img.putalpha(alpha)

                    # Save back to bytes
                    img_buffer = io.BytesIO()
                    img.save(img_buffer, format="PNG")
                    img_bytes = img_buffer.getvalue()

                    rect = fitz.Rect(x, y, x + width, y + height)
                    page.insert_image(rect, stream=img_bytes)
                except Exception:
                    pass

    async def _fill_pdf_with_pypdf(
        self,
        pdf_bytes: bytes,
        annotations: List[Dict[str, Any]],
    ) -> Tuple[bytes, int]:
        """Fill PDF using pypdf (fallback method)."""
        reader = PdfReader(io.BytesIO(pdf_bytes), strict=False)
        writer = PdfWriter()
        total_pages = len(reader.pages)

        # Group annotations by page
        annotations_by_page: Dict[int, List[Dict]] = {}
        for ann in annotations:
            page_num = ann.get("page", 1)
            if page_num not in annotations_by_page:
                annotations_by_page[page_num] = []
            annotations_by_page[page_num].append(ann)

        # Process each page
        for page_idx, page in enumerate(reader.pages):
            page_num = page_idx + 1
            page_width = float(page.mediabox.width)
            page_height = float(page.mediabox.height)

            # Create overlay for this page if it has annotations
            if page_num in annotations_by_page:
                overlay_buffer = io.BytesIO()
                c = canvas.Canvas(overlay_buffer, pagesize=(page_width, page_height))

                for ann in annotations_by_page[page_num]:
                    self._draw_annotation(c, ann, page_width, page_height)

                c.save()
                overlay_buffer.seek(0)

                # Merge overlay with page
                overlay_reader = PdfReader(overlay_buffer, strict=False)
                if len(overlay_reader.pages) > 0:
                    page.merge_page(overlay_reader.pages[0])

            writer.add_page(page)

        # Write output
        output = io.BytesIO()
        writer.write(output)

        return output.getvalue(), total_pages

    def _draw_annotation(
        self,
        c: canvas.Canvas,
        ann: Dict[str, Any],
        page_width: float,
        page_height: float,
    ) -> None:
        """Draw a single annotation on the canvas."""
        ann_type = ann.get("type", "text")

        # Convert from top-left origin (web) to bottom-left origin (PDF)
        x = ann.get("x", 0)
        y = page_height - ann.get("y", 0)  # Flip Y coordinate
        width = ann.get("width", 100)
        height = ann.get("height", 20)

        if ann_type == "text":
            self._draw_text(c, ann, x, y, width, height)
        elif ann_type == "signature":
            self._draw_signature(c, ann, x, y - height, width, height)
        elif ann_type == "drawing":
            self._draw_drawing(c, ann, page_height)
        elif ann_type == "checkbox":
            self._draw_checkbox(c, ann, x, y - height, width, height)
        elif ann_type == "image":
            self._draw_image(c, ann, x, y - height, width, height)
        elif ann_type == "highlight":
            self._draw_highlight(c, ann, x, y - height, width, height)
        elif ann_type == "rectangle":
            self._draw_rectangle(c, ann, x, y - height, width, height)
        elif ann_type == "line":
            self._draw_line(c, ann, page_height)
        elif ann_type == "stamp":
            self._draw_stamp(c, ann, x, y - height, width, height)
        elif ann_type == "signed_stamp" or ann_type == "signedStamp":
            self._draw_signed_stamp(c, ann, x, y - height, width, height)
        elif ann_type == "watermark":
            self._draw_watermark(c, ann, x, y - height, width, height)

    def _draw_text(
        self,
        c: canvas.Canvas,
        ann: Dict[str, Any],
        x: float,
        y: float,
        width: float,
        height: float,
    ) -> None:
        """Draw text annotation."""
        text = ann.get("text", "")
        font_size = ann.get("fontSize", 12)
        font_family = ann.get("fontFamily", "Helvetica")
        color = ann.get("color", "#000000")
        bold = ann.get("bold", False)
        italic = ann.get("italic", False)

        # Map font family
        font_map = {
            "Helvetica": "Helvetica",
            "Arial": "Helvetica",
            "Times": "Times-Roman",
            "Times New Roman": "Times-Roman",
            "Courier": "Courier",
            "Courier New": "Courier",
        }
        base_font = font_map.get(font_family, "Helvetica")

        # Apply bold/italic
        if bold and italic:
            if "Helvetica" in base_font:
                font = "Helvetica-BoldOblique"
            elif "Times" in base_font:
                font = "Times-BoldItalic"
            else:
                font = "Courier-BoldOblique"
        elif bold:
            if "Helvetica" in base_font:
                font = "Helvetica-Bold"
            elif "Times" in base_font:
                font = "Times-Bold"
            else:
                font = "Courier-Bold"
        elif italic:
            if "Helvetica" in base_font:
                font = "Helvetica-Oblique"
            elif "Times" in base_font:
                font = "Times-Italic"
            else:
                font = "Courier-Oblique"
        else:
            font = base_font

        c.setFont(font, font_size)

        try:
            c.setFillColor(HexColor(color))
        except Exception:
            c.setFillColor(HexColor("#000000"))

        # Adjust Y for text baseline
        text_y = y - font_size

        # Handle multiline text
        lines = text.split("\n")
        for i, line in enumerate(lines):
            c.drawString(x, text_y - (i * font_size * 1.2), line)

    def _draw_signature(
        self,
        c: canvas.Canvas,
        ann: Dict[str, Any],
        x: float,
        y: float,
        width: float,
        height: float,
    ) -> None:
        """Draw signature image."""
        signature_data = ann.get("data", "")
        if not signature_data:
            return

        try:
            # Remove data URL prefix if present
            if "," in signature_data:
                signature_data = signature_data.split(",")[1]

            # Decode base64
            img_bytes = base64.b64decode(signature_data)
            img = Image.open(io.BytesIO(img_bytes))

            # Convert to RGBA if needed
            if img.mode != "RGBA":
                img = img.convert("RGBA")

            # Create image reader
            img_buffer = io.BytesIO()
            img.save(img_buffer, format="PNG")
            img_buffer.seek(0)

            img_reader = ImageReader(img_buffer)
            c.drawImage(img_reader, x, y, width=width, height=height, mask="auto")

        except Exception as e:
            # If signature fails, skip it
            pass

    def _draw_drawing(
        self,
        c: canvas.Canvas,
        ann: Dict[str, Any],
        page_height: float,
    ) -> None:
        """Draw freehand drawing paths."""
        paths = ann.get("paths", [])
        color = ann.get("color", "#000000")
        stroke_width = ann.get("strokeWidth", 2)

        try:
            c.setStrokeColor(HexColor(color))
        except Exception:
            c.setStrokeColor(HexColor("#000000"))

        c.setLineWidth(stroke_width)
        c.setLineCap(1)  # Round cap
        c.setLineJoin(1)  # Round join

        for path in paths:
            points = path.get("points", [])
            if len(points) < 2:
                continue

            p = c.beginPath()

            # First point
            first = points[0]
            p.moveTo(first.get("x", 0), page_height - first.get("y", 0))

            # Draw lines to subsequent points
            for point in points[1:]:
                p.lineTo(point.get("x", 0), page_height - point.get("y", 0))

            c.drawPath(p, stroke=1, fill=0)

    def _draw_checkbox(
        self,
        c: canvas.Canvas,
        ann: Dict[str, Any],
        x: float,
        y: float,
        width: float,
        height: float,
    ) -> None:
        """Draw checkbox."""
        checked = ann.get("checked", False)

        # Draw box
        c.setStrokeColor(HexColor("#000000"))
        c.setLineWidth(1)
        c.rect(x, y, width, height, stroke=1, fill=0)

        # Draw checkmark if checked
        if checked:
            c.setStrokeColor(HexColor("#000000"))
            c.setLineWidth(2)
            # Draw checkmark
            c.line(x + width * 0.2, y + height * 0.5, x + width * 0.4, y + height * 0.2)
            c.line(x + width * 0.4, y + height * 0.2, x + width * 0.8, y + height * 0.8)

    def _draw_image(
        self,
        c: canvas.Canvas,
        ann: Dict[str, Any],
        x: float,
        y: float,
        width: float,
        height: float,
    ) -> None:
        """Draw image annotation."""
        image_data = ann.get("data", "")
        if not image_data:
            return

        try:
            if "," in image_data:
                image_data = image_data.split(",")[1]

            img_bytes = base64.b64decode(image_data)
            img = Image.open(io.BytesIO(img_bytes))

            if img.mode != "RGBA":
                img = img.convert("RGBA")

            img_buffer = io.BytesIO()
            img.save(img_buffer, format="PNG")
            img_buffer.seek(0)

            img_reader = ImageReader(img_buffer)
            c.drawImage(img_reader, x, y, width=width, height=height, mask="auto")

        except Exception:
            pass

    def _draw_highlight(
        self,
        c: canvas.Canvas,
        ann: Dict[str, Any],
        x: float,
        y: float,
        width: float,
        height: float,
    ) -> None:
        """Draw highlight annotation."""
        color = ann.get("color", "#FFFF00")
        opacity = ann.get("opacity", 0.3)

        try:
            hex_color = HexColor(color)
            c.setFillColor(Color(hex_color.red, hex_color.green, hex_color.blue, alpha=opacity))
        except Exception:
            c.setFillColor(Color(1, 1, 0, alpha=0.3))

        c.rect(x, y, width, height, stroke=0, fill=1)

    def _draw_rectangle(
        self,
        c: canvas.Canvas,
        ann: Dict[str, Any],
        x: float,
        y: float,
        width: float,
        height: float,
    ) -> None:
        """Draw rectangle annotation."""
        color = ann.get("color", "#000000")
        stroke_width = ann.get("strokeWidth", 2)
        fill = ann.get("fill", False)
        fill_color = ann.get("fillColor", "#FFFFFF")

        try:
            c.setStrokeColor(HexColor(color))
        except Exception:
            c.setStrokeColor(HexColor("#000000"))

        c.setLineWidth(stroke_width)

        if fill:
            try:
                c.setFillColor(HexColor(fill_color))
            except Exception:
                c.setFillColor(HexColor("#FFFFFF"))
            c.rect(x, y, width, height, stroke=1, fill=1)
        else:
            c.rect(x, y, width, height, stroke=1, fill=0)

    def _draw_line(
        self,
        c: canvas.Canvas,
        ann: Dict[str, Any],
        page_height: float,
    ) -> None:
        """Draw line annotation."""
        x1 = ann.get("x1", 0)
        y1 = page_height - ann.get("y1", 0)
        x2 = ann.get("x2", 0)
        y2 = page_height - ann.get("y2", 0)
        color = ann.get("color", "#000000")
        stroke_width = ann.get("strokeWidth", 2)

        try:
            c.setStrokeColor(HexColor(color))
        except Exception:
            c.setStrokeColor(HexColor("#000000"))

        c.setLineWidth(stroke_width)
        c.line(x1, y1, x2, y2)

    def _draw_stamp(
        self,
        c: canvas.Canvas,
        ann: Dict[str, Any],
        x: float,
        y: float,
        width: float,
        height: float,
    ) -> None:
        """Draw stamp annotation."""
        stamp_type = ann.get("stampType", "custom")
        custom_text = ann.get("customText", "")
        color = ann.get("color", "#16a34a")
        rotation = ann.get("rotation", 0)
        is_dashed = ann.get("isDashed", False)

        # Stamp labels
        stamp_labels = {
            "approved": "APPROVED",
            "draft": "DRAFT",
            "confidential": "CONFIDENTIAL",
            "paid": "PAID",
            "rejected": "REJECTED",
            "final": "FINAL",
            "copy": "COPY",
            "void": "VOID",
            "custom": custom_text or "CUSTOM",
        }
        stamp_text = stamp_labels.get(stamp_type, "STAMP")

        try:
            c.setStrokeColor(HexColor(color))
            c.setFillColor(HexColor(color))
        except Exception:
            c.setStrokeColor(HexColor("#16a34a"))
            c.setFillColor(HexColor("#16a34a"))

        c.setLineWidth(2)

        # Save state for rotation
        c.saveState()

        # Translate to center and rotate
        center_x = x + width / 2
        center_y = y + height / 2
        c.translate(center_x, center_y)
        c.rotate(rotation)

        # Draw rectangle border
        if is_dashed:
            c.setDash(3, 3)
        c.rect(-width / 2, -height / 2, width, height, stroke=1, fill=0)

        # Draw text
        font_size = min(height * 0.5, 24)
        c.setFont("Helvetica-Bold", font_size)
        c.drawCentredString(0, -font_size / 3, stamp_text)

        c.restoreState()

    def _draw_signed_stamp(
        self,
        c: canvas.Canvas,
        ann: Dict[str, Any],
        x: float,
        y: float,
        width: float,
        height: float,
    ) -> None:
        """Draw signed stamp with signature, text, and date."""
        stamp_text = ann.get("stampText", "APPROVED")
        signature_data = ann.get("signatureData", "")
        # Support both "date" and "dateText" field names
        date_str = ann.get("dateText", "") or ann.get("date", "")
        # Support both "borderColor" and "color" field names
        color = ann.get("borderColor", "") or ann.get("color", "#16a34a")
        is_dashed = ann.get("isDashed", False)

        try:
            c.setStrokeColor(HexColor(color))
            c.setFillColor(HexColor(color))
        except Exception:
            c.setStrokeColor(HexColor("#16a34a"))
            c.setFillColor(HexColor("#16a34a"))

        padding = 10

        # Draw border
        c.setLineWidth(2)
        if is_dashed:
            c.setDash(6, 4)
        c.rect(x, y, width, height, stroke=1, fill=0)
        c.setDash()  # Reset dash

        # Draw stamp text at top
        font_size = min(18, (height - padding * 2) * 0.2)
        c.setFont("Helvetica-Bold", font_size)
        c.drawCentredString(x + width / 2, y + height - padding - font_size * 0.3, stamp_text)

        # Draw signature if available
        if signature_data:
            try:
                if "," in signature_data:
                    signature_data = signature_data.split(",")[1]
                img_bytes = base64.b64decode(signature_data)
                img = Image.open(io.BytesIO(img_bytes))
                if img.mode != "RGBA":
                    img = img.convert("RGBA")

                img_buffer = io.BytesIO()
                img.save(img_buffer, format="PNG")
                img_buffer.seek(0)

                sig_height = height * 0.4
                sig_width = width * 0.6
                sig_x = x + (width - sig_width) / 2
                sig_y = y + height - padding - font_size - 10 - sig_height

                img_reader = ImageReader(img_buffer)
                c.drawImage(img_reader, sig_x, sig_y, width=sig_width, height=sig_height, mask="auto")
            except Exception:
                pass

        # Draw date at bottom
        if date_str:
            date_font_size = min(12, font_size * 0.8)
            c.setFont("Helvetica", date_font_size)
            c.drawCentredString(x + width / 2, y + padding + date_font_size * 0.3, date_str)

    def _draw_watermark(
        self,
        c: canvas.Canvas,
        ann: Dict[str, Any],
        x: float,
        y: float,
        width: float,
        height: float,
    ) -> None:
        """Draw watermark annotation (text or image)."""
        content_type = ann.get("contentType", "text")
        content = ann.get("content", "WATERMARK")
        color = ann.get("color", "#6b7280")
        opacity = ann.get("opacity", 0.3)
        rotation = ann.get("rotation", -45)
        font_size = ann.get("fontSize", 48)
        border_style = ann.get("borderStyle", "none")
        border_color = ann.get("borderColor", "#6b7280")

        c.saveState()

        # Translate to center and rotate
        center_x = x + width / 2
        center_y = y + height / 2
        c.translate(center_x, center_y)
        c.rotate(rotation)

        if content_type == "text":
            # Draw border if specified
            if border_style != "none":
                try:
                    c.setStrokeColor(HexColor(border_color))
                except Exception:
                    c.setStrokeColor(HexColor("#6b7280"))

                c.setLineWidth(2)
                if border_style == "dashed":
                    c.setDash(5, 5)
                elif border_style == "dotted":
                    c.setDash(2, 2)

                # Draw with opacity
                c.setStrokeAlpha(opacity)
                c.rect(-width / 2, -height / 2, width, height, stroke=1, fill=0)

            # Draw text with opacity
            try:
                hex_color = HexColor(color)
                c.setFillColor(Color(hex_color.red, hex_color.green, hex_color.blue, alpha=opacity))
            except Exception:
                c.setFillColor(Color(0.4, 0.4, 0.4, alpha=opacity))

            c.setFont("Helvetica-Bold", font_size)
            c.drawCentredString(0, -font_size / 3, content)

        elif content_type == "image" and content:
            try:
                if "," in content:
                    content = content.split(",")[1]
                img_bytes = base64.b64decode(content)
                img = Image.open(io.BytesIO(img_bytes))
                if img.mode != "RGBA":
                    img = img.convert("RGBA")

                # Apply opacity
                alpha = img.split()[3]
                alpha = alpha.point(lambda p: int(p * opacity))
                img.putalpha(alpha)

                img_buffer = io.BytesIO()
                img.save(img_buffer, format="PNG")
                img_buffer.seek(0)

                img_reader = ImageReader(img_buffer)
                c.drawImage(img_reader, -width / 2, -height / 2, width=width, height=height, mask="auto")
            except Exception:
                pass

        c.restoreState()

    def apply_watermark(self, pdf_bytes: bytes) -> bytes:
        """Apply watermark to PDF (for free tier)."""
        try:
            # Create watermark PDF
            watermark_buffer = io.BytesIO()
            c = canvas.Canvas(watermark_buffer, pagesize=letter)

            # Set watermark style
            c.setFillColor(Color(0.7, 0.7, 0.7, alpha=0.3))
            c.setFont("Helvetica", 40)

            # Rotate and position
            c.saveState()
            c.translate(300, 400)
            c.rotate(45)
            c.drawCentredString(0, 0, "Tulz Free")
            c.restoreState()

            c.save()

            # Merge watermark with original PDF
            watermark_buffer.seek(0)
            watermark_reader = PdfReader(watermark_buffer)
            watermark_page = watermark_reader.pages[0]

            reader = PdfReader(io.BytesIO(pdf_bytes))
            writer = PdfWriter()

            for page in reader.pages:
                page.merge_page(watermark_page)
                writer.add_page(page)

            output = io.BytesIO()
            writer.write(output)

            return output.getvalue()

        except Exception:
            # If watermarking fails, return original
            return pdf_bytes
