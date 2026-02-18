"""Image processing service with background removal."""

import io
import logging
import os
import colorsys
from concurrent.futures import ThreadPoolExecutor
from typing import Optional, Tuple, List
from collections import Counter

from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance, ImageOps, ImageChops
import numpy as np

from app.core.exceptions import FileProcessingError
from app.schemas.tools import (
    ImageFormat, ImageOperation, ImageRequest, ImageFilter as FilterType,
    FlipDirection, MirrorDirection, SocialMediaPlatform
)

logger = logging.getLogger(__name__)

# Thread pool for CPU-bound image operations (min 4, max 16)
_max_workers = min(max(os.cpu_count() or 4, 4), 16)
_executor = ThreadPoolExecutor(max_workers=_max_workers)

# Pre-loaded rembg session for faster background removal
_rembg_session: Optional[object] = None

def _get_rembg_session():
    """Get or create the rembg session (singleton pattern)."""
    global _rembg_session
    if _rembg_session is None:
        try:
            from rembg import new_session
            # Use u2netp - much faster than default u2net (5x faster)
            # It's slightly less accurate but good enough for most use cases
            _rembg_session = new_session("u2netp")
            logger.info("Loaded rembg session with u2netp model")
        except Exception as e:
            logger.error(f"Failed to load rembg session: {e}")
            raise
    return _rembg_session


class ImageService:
    """Service for image processing operations."""

    async def process(
        self,
        image_bytes: bytes,
        request: ImageRequest,
    ) -> Tuple[bytes, Tuple[int, int], Tuple[int, int]]:
        """Process image based on operation type."""
        try:
            # Open image
            img = Image.open(io.BytesIO(image_bytes))
            original_size = img.size

            # Convert to RGB if necessary (for JPEG output)
            if request.output_format in [ImageFormat.JPEG, ImageFormat.JPG] and img.mode in ("RGBA", "P"):
                background = Image.new("RGB", img.size, (255, 255, 255))
                if img.mode == "RGBA":
                    background.paste(img, mask=img.split()[3])
                else:
                    background.paste(img)
                img = background

            # Perform operation
            if request.operation == ImageOperation.REMOVE_BACKGROUND:
                img = await self._remove_background(image_bytes)
            # Apply crop if parameters are provided (allows Crop + Resize/Filter etc.)
            if all([
                request.crop_x is not None,
                request.crop_y is not None,
                request.crop_width,
                request.crop_height
            ]):
                img = self._crop(img, request)

            # Perform operation
            if request.operation == ImageOperation.REMOVE_BACKGROUND:
                img = await self._remove_background(image_bytes)
            elif request.operation == ImageOperation.CROP:
                pass  # Already handled above
            elif request.operation == ImageOperation.RESIZE:
                img = self._resize(img, request)
            elif request.operation == ImageOperation.CONVERT:
                pass  # Just convert format
            elif request.operation == ImageOperation.COMPRESS:
                pass  # Just compress
            elif request.operation == ImageOperation.UPSCALE:
                img = self._upscale(img, request)
            elif request.operation == ImageOperation.ROTATE:
                img = self._rotate(img, request)
            elif request.operation == ImageOperation.FLIP:
                img = self._flip(img, request)
            elif request.operation == ImageOperation.FILTER:
                img = self._apply_filter(img, request)
            elif request.operation == ImageOperation.BLUR:
                img = self._apply_blur(img, request)
            elif request.operation == ImageOperation.GRAYSCALE:
                img = self._apply_grayscale(img)
            elif request.operation == ImageOperation.SEPIA:
                img = self._apply_sepia(img)
            elif request.operation == ImageOperation.BRIGHTNESS:
                img = self._adjust_brightness(img, request)
            elif request.operation == ImageOperation.CONTRAST:
                img = self._adjust_contrast(img, request)
            elif request.operation == ImageOperation.SATURATION:
                img = self._adjust_saturation(img, request)
            elif request.operation == ImageOperation.PIXELATE:
                img = self._pixelate(img, request)
            elif request.operation == ImageOperation.CARTOON:
                img = self._apply_cartoon(img)
            elif request.operation == ImageOperation.SKETCH:
                img = self._apply_sketch(img)
            elif request.operation == ImageOperation.MIRROR:
                img = self._mirror(img, request)
            elif request.operation == ImageOperation.ROUNDED_CORNERS:
                img = self._round_corners(img, request)
            elif request.operation == ImageOperation.ADD_WATERMARK:
                img = self._add_text_watermark(img, request)
            elif request.operation == ImageOperation.REMOVE_WATERMARK:
                img = self._remove_watermark(img)
            elif request.operation == ImageOperation.FACE_DETECT:
                img = self._detect_faces(img)
            elif request.operation == ImageOperation.FACE_BLUR:
                img = self._blur_faces(img)
            elif request.operation == ImageOperation.ADD_FRAME:
                img = self._add_frame(img, request)
            elif request.operation == ImageOperation.ADD_BORDER:
                img = self._add_border(img, request)
            elif request.operation == ImageOperation.THUMBNAIL:
                img = self._create_thumbnail(img, request)
            elif request.operation == ImageOperation.SEO_OPTIMIZE:
                img = self._seo_optimize(img, request)

            new_size = img.size

            # Convert to output format
            output_bytes = self._to_bytes(img, request.output_format, request.quality)

            return output_bytes, original_size, new_size

        except Exception as e:
            raise FileProcessingError(message=f"Image processing failed: {str(e)}")

    async def _remove_background(self, image_bytes: bytes) -> Image.Image:
        """Remove background using rembg with optimizations."""
        try:
            from rembg import remove
            import asyncio

            # Get pre-loaded session for faster processing
            session = _get_rembg_session()

            # Open image to check size
            img = Image.open(io.BytesIO(image_bytes))
            original_size = img.size

            # Resize large images before processing (much faster)
            # Background removal quality is good enough at 1024px max dimension
            MAX_DIMENSION = 1024
            if max(img.size) > MAX_DIMENSION:
                # Calculate new size maintaining aspect ratio
                ratio = MAX_DIMENSION / max(img.size)
                new_size = (int(img.size[0] * ratio), int(img.size[1] * ratio))
                img = img.resize(new_size, Image.Resampling.LANCZOS)

                # Convert resized image back to bytes
                buffer = io.BytesIO()
                img.save(buffer, format="PNG")
                image_bytes = buffer.getvalue()
                logger.info(f"Resized image from {original_size} to {new_size} for faster processing")

            # Run in thread pool (CPU-bound) with pre-loaded session
            loop = asyncio.get_event_loop()
            result_bytes = await loop.run_in_executor(
                _executor,
                lambda: remove(image_bytes, session=session)
            )

            result_img = Image.open(io.BytesIO(result_bytes))

            # Scale back up if we resized
            if max(original_size) > MAX_DIMENSION:
                result_img = result_img.resize(original_size, Image.Resampling.LANCZOS)

            return result_img

        except ImportError:
            raise FileProcessingError(
                message="Background removal is not available. Please install rembg."
            )
        except Exception as e:
            logger.error(f"Background removal failed: {e}")
            raise FileProcessingError(message=f"Background removal failed: {str(e)}")

    def _crop(self, img: Image.Image, request: ImageRequest) -> Image.Image:
        """Crop image to specified dimensions."""
        if not all([
            request.crop_x is not None,
            request.crop_y is not None,
            request.crop_width,
            request.crop_height,
        ]):
            raise FileProcessingError(
                message="Crop requires x, y, width, and height parameters"
            )

        # Validate crop bounds
        if (
            request.crop_x < 0
            or request.crop_y < 0
            or request.crop_x + request.crop_width > img.size[0]
            or request.crop_y + request.crop_height > img.size[1]
        ):
            raise FileProcessingError(message="Crop dimensions exceed image bounds")

        return img.crop((
            request.crop_x,
            request.crop_y,
            request.crop_x + request.crop_width,
            request.crop_y + request.crop_height,
        ))

    def _resize(self, img: Image.Image, request: ImageRequest) -> Image.Image:
        """Resize image to specified dimensions."""
        if not request.resize_width and not request.resize_height:
            raise FileProcessingError(
                message="Resize requires at least width or height parameter"
            )

        width, height = img.size

        if request.maintain_aspect:
            if request.resize_width and request.resize_height:
                # Fit within bounds while maintaining aspect ratio
                img.thumbnail(
                    (request.resize_width, request.resize_height),
                    Image.Resampling.LANCZOS,
                )
                return img
            elif request.resize_width:
                # Calculate height based on width
                ratio = request.resize_width / width
                new_height = int(height * ratio)
                return img.resize(
                    (request.resize_width, new_height),
                    Image.Resampling.LANCZOS,
                )
            else:
                # Calculate width based on height
                ratio = request.resize_height / height
                new_width = int(width * ratio)
                return img.resize(
                    (new_width, request.resize_height),
                    Image.Resampling.LANCZOS,
                )
        else:
            # Force exact dimensions
            new_width = request.resize_width or width
            new_height = request.resize_height or height
            return img.resize((new_width, new_height), Image.Resampling.LANCZOS)

    def _to_bytes(
        self,
        img: Image.Image,
        format: ImageFormat,
        quality: int,
    ) -> bytes:
        """Convert image to bytes in specified format."""
        buffer = io.BytesIO()

        if format == ImageFormat.PNG:
            # PNG doesn't use quality, uses compression level
            img.save(buffer, format="PNG", optimize=True)
        elif format in [ImageFormat.JPEG, ImageFormat.JPG]:
            if img.mode == "RGBA":
                img = img.convert("RGB")
            img.save(buffer, format="JPEG", quality=quality, optimize=True)
        elif format == ImageFormat.WEBP:
            img.save(buffer, format="WEBP", quality=quality)
        elif format == ImageFormat.GIF:
            if img.mode == "RGBA":
                img = img.convert("RGB")
            img.save(buffer, format="GIF", optimize=True)
        elif format == ImageFormat.BMP:
            if img.mode == "RGBA":
                img = img.convert("RGB")
            img.save(buffer, format="BMP")
        elif format == ImageFormat.TIFF:
            img.save(buffer, format="TIFF", compression="tiff_deflate")
        elif format == ImageFormat.PDF:
            if img.mode == "RGBA":
                img = img.convert("RGB")
            img.save(buffer, format="PDF")

        return buffer.getvalue()

    # ============ New Image Processing Methods ============

    def _upscale(self, img: Image.Image, request: ImageRequest) -> Image.Image:
        """Upscale image using high-quality resampling."""
        factor = request.upscale_factor
        new_size = (img.size[0] * factor, img.size[1] * factor)
        return img.resize(new_size, Image.Resampling.LANCZOS)

    def _rotate(self, img: Image.Image, request: ImageRequest) -> Image.Image:
        """Rotate image by specified angle."""
        if request.rotation_angle is None:
            raise FileProcessingError(message="Rotation angle is required")
        return img.rotate(-request.rotation_angle, expand=True, fillcolor=(255, 255, 255))

    def _flip(self, img: Image.Image, request: ImageRequest) -> Image.Image:
        """Flip image horizontally, vertically, or both."""
        if not request.flip_direction:
            raise FileProcessingError(message="Flip direction is required")

        if request.flip_direction == FlipDirection.HORIZONTAL:
            return img.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        elif request.flip_direction == FlipDirection.VERTICAL:
            return img.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
        elif request.flip_direction == FlipDirection.BOTH:
            img = img.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
            return img.transpose(Image.Transpose.FLIP_TOP_BOTTOM)

        return img

    def _apply_filter(self, img: Image.Image, request: ImageRequest) -> Image.Image:
        """Apply Instagram-style filters."""
        if not request.filter_type or request.filter_type == FilterType.NONE:
            return img

        if img.mode != "RGB":
            img = img.convert("RGB")

        if request.filter_type == FilterType.VINTAGE:
            # Vintage: reduce saturation, add warm tones
            enhancer = ImageEnhance.Color(img)
            img = enhancer.enhance(0.7)
            enhancer = ImageEnhance.Contrast(img)
            img = enhancer.enhance(1.2)
            return self._add_color_overlay(img, (255, 230, 200), 0.2)

        elif request.filter_type == FilterType.GRAYSCALE:
            return ImageOps.grayscale(img).convert("RGB")

        elif request.filter_type == FilterType.SEPIA:
            return self._apply_sepia(img)

        elif request.filter_type == FilterType.COOL:
            return self._add_color_overlay(img, (150, 180, 255), 0.2)

        elif request.filter_type == FilterType.WARM:
            return self._add_color_overlay(img, (255, 200, 150), 0.2)

        elif request.filter_type == FilterType.VIVID:
            enhancer = ImageEnhance.Color(img)
            img = enhancer.enhance(1.5)
            enhancer = ImageEnhance.Contrast(img)
            return enhancer.enhance(1.2)

        elif request.filter_type == FilterType.DRAMATIC:
            enhancer = ImageEnhance.Contrast(img)
            img = enhancer.enhance(1.5)
            enhancer = ImageEnhance.Brightness(img)
            return enhancer.enhance(0.9)

        elif request.filter_type == FilterType.SOFT:
            img = img.filter(ImageFilter.GaussianBlur(1))
            enhancer = ImageEnhance.Contrast(img)
            return enhancer.enhance(0.9)

        return img

    def _add_color_overlay(self, img: Image.Image, color: tuple, alpha: float) -> Image.Image:
        """Add a color overlay to an image."""
        overlay = Image.new("RGB", img.size, color)
        return Image.blend(img, overlay, alpha)

    def _apply_blur(self, img: Image.Image, request: ImageRequest) -> Image.Image:
        """Apply Gaussian blur."""
        return img.filter(ImageFilter.GaussianBlur(request.blur_radius))

    def _apply_grayscale(self, img: Image.Image) -> Image.Image:
        """Convert to grayscale."""
        return ImageOps.grayscale(img).convert("RGB")

    def _apply_sepia(self, img: Image.Image) -> Image.Image:
        """Apply sepia tone effect."""
        if img.mode != "RGB":
            img = img.convert("RGB")

        # Convert to grayscale first
        gray = ImageOps.grayscale(img)

        # Create sepia image
        sepia = Image.new("RGB", img.size)
        pixels = sepia.load()
        gray_pixels = gray.load()

        for i in range(img.size[0]):
            for j in range(img.size[1]):
                gray_val = gray_pixels[i, j]
                # Sepia formula
                r = min(255, int(gray_val * 1.0))
                g = min(255, int(gray_val * 0.95))
                b = min(255, int(gray_val * 0.82))
                pixels[i, j] = (r, g, b)

        return sepia

    def _adjust_brightness(self, img: Image.Image, request: ImageRequest) -> Image.Image:
        """Adjust image brightness."""
        if request.brightness is None:
            raise FileProcessingError(message="Brightness value is required")
        # Convert -1 to 1 range to 0 to 2 range
        factor = 1 + request.brightness
        enhancer = ImageEnhance.Brightness(img)
        return enhancer.enhance(factor)

    def _adjust_contrast(self, img: Image.Image, request: ImageRequest) -> Image.Image:
        """Adjust image contrast."""
        if request.contrast is None:
            raise FileProcessingError(message="Contrast value is required")
        factor = 1 + request.contrast
        enhancer = ImageEnhance.Contrast(img)
        return enhancer.enhance(factor)

    def _adjust_saturation(self, img: Image.Image, request: ImageRequest) -> Image.Image:
        """Adjust image saturation."""
        if request.saturation is None:
            raise FileProcessingError(message="Saturation value is required")
        factor = 1 + request.saturation
        enhancer = ImageEnhance.Color(img)
        return enhancer.enhance(factor)

    def _pixelate(self, img: Image.Image, request: ImageRequest) -> Image.Image:
        """Create pixelated effect."""
        size = request.pixelate_size
        small = img.resize((img.size[0] // size, img.size[1] // size), Image.Resampling.NEAREST)
        return small.resize(img.size, Image.Resampling.NEAREST)

    def _apply_cartoon(self, img: Image.Image) -> Image.Image:
        """Apply cartoon effect using edge detection and bilateral filter."""
        try:
            import cv2

            # Convert PIL to numpy array
            img_array = np.array(img)

            # Convert RGB to BGR for OpenCV
            if len(img_array.shape) == 3:
                img_array = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)

            # Apply bilateral filter for smoothing while keeping edges
            for _ in range(2):
                img_array = cv2.bilateralFilter(img_array, 9, 75, 75)

            # Edge detection
            gray = cv2.cvtColor(img_array, cv2.COLOR_BGR2GRAY)
            gray = cv2.medianBlur(gray, 5)
            edges = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C,
                                          cv2.THRESH_BINARY, 9, 5)

            # Combine edges with color image
            edges_colored = cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)
            cartoon = cv2.bitwise_and(img_array, edges_colored)

            # Convert back to RGB
            cartoon = cv2.cvtColor(cartoon, cv2.COLOR_BGR2RGB)

            return Image.fromarray(cartoon)
        except ImportError:
            # Fallback to simple posterize effect
            img = img.convert("RGB")
            return ImageOps.posterize(img, 4)

    def _apply_sketch(self, img: Image.Image) -> Image.Image:
        """Apply pencil sketch effect."""
        try:
            import cv2

            # Convert to grayscale
            gray = ImageOps.grayscale(img)
            gray_array = np.array(gray)

            # Invert image
            inverted = 255 - gray_array

            # Blur the inverted image
            blurred = cv2.GaussianBlur(inverted, (21, 21), 0)

            # Invert blurred image
            inverted_blur = 255 - blurred

            # Create sketch
            sketch = cv2.divide(gray_array, inverted_blur, scale=256.0)

            return Image.fromarray(sketch).convert("RGB")
        except ImportError:
            # Fallback to simple edge detection
            gray = ImageOps.grayscale(img)
            edges = gray.filter(ImageFilter.FIND_EDGES)
            return ImageOps.invert(edges).convert("RGB")

    def _mirror(self, img: Image.Image, request: ImageRequest) -> Image.Image:
        """Create mirror effect."""
        if not request.mirror_direction:
            raise FileProcessingError(message="Mirror direction is required")

        width, height = img.size

        if request.mirror_direction == MirrorDirection.LEFT:
            # Mirror left half to right
            left_half = img.crop((0, 0, width // 2, height))
            mirrored = left_half.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
            result = Image.new(img.mode, img.size)
            result.paste(left_half, (0, 0))
            result.paste(mirrored, (width // 2, 0))
            return result

        elif request.mirror_direction == MirrorDirection.RIGHT:
            # Mirror right half to left
            right_half = img.crop((width // 2, 0, width, height))
            mirrored = right_half.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
            result = Image.new(img.mode, img.size)
            result.paste(mirrored, (0, 0))
            result.paste(right_half, (width // 2, 0))
            return result

        elif request.mirror_direction == MirrorDirection.TOP:
            # Mirror top half to bottom
            top_half = img.crop((0, 0, width, height // 2))
            mirrored = top_half.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
            result = Image.new(img.mode, img.size)
            result.paste(top_half, (0, 0))
            result.paste(mirrored, (0, height // 2))
            return result

        elif request.mirror_direction == MirrorDirection.BOTTOM:
            # Mirror bottom half to top
            bottom_half = img.crop((0, height // 2, width, height))
            mirrored = bottom_half.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
            result = Image.new(img.mode, img.size)
            result.paste(mirrored, (0, 0))
            result.paste(bottom_half, (0, height // 2))
            return result

        return img

    def _round_corners(self, img: Image.Image, request: ImageRequest) -> Image.Image:
        """Add rounded corners to image."""
        # Convert to RGBA if not already
        if img.mode != "RGBA":
            img = img.convert("RGBA")

        # Create rounded rectangle mask
        mask = Image.new("L", img.size, 0)
        draw = ImageDraw.Draw(mask)
        draw.rounded_rectangle(
            [(0, 0), img.size],
            radius=request.corner_radius,
            fill=255
        )

        # Apply mask
        output = ImageOps.fit(img, img.size, centering=(0.5, 0.5))
        output.putalpha(mask)

        return output

    def _add_text_watermark(self, img: Image.Image, request: ImageRequest) -> Image.Image:
        """Add custom text watermark to image."""
        if not request.watermark_text:
            raise FileProcessingError(message="Watermark text is required")

        # Convert to RGBA for transparency
        if img.mode != "RGBA":
            img = img.convert("RGBA")

        # Create watermark layer
        txt_layer = Image.new("RGBA", img.size, (255, 255, 255, 0))
        draw = ImageDraw.Draw(txt_layer)

        # Load font
        try:
            font = ImageFont.truetype(
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                request.watermark_size
            )
        except Exception:
            font = ImageFont.load_default()

        # Get text size
        bbox = draw.textbbox((0, 0), request.watermark_text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]

        # Calculate position
        positions = {
            "bottom_right": (img.size[0] - text_width - 20, img.size[1] - text_height - 20),
            "bottom_left": (20, img.size[1] - text_height - 20),
            "top_right": (img.size[0] - text_width - 20, 20),
            "top_left": (20, 20),
            "center": ((img.size[0] - text_width) // 2, (img.size[1] - text_height) // 2),
        }

        x, y = positions.get(request.watermark_position, positions["bottom_right"])

        # Draw text with opacity
        alpha = int(255 * request.watermark_opacity)
        draw.text((x, y), request.watermark_text, font=font, fill=(255, 255, 255, alpha))

        # Composite
        return Image.alpha_composite(img, txt_layer)

    def _remove_watermark(self, img: Image.Image) -> Image.Image:
        """Simple watermark removal using inpainting (basic implementation)."""
        # This is a simplified version - production would need AI inpainting
        # For now, we just apply a healing filter to common watermark areas
        try:
            import cv2

            img_array = np.array(img)
            if len(img_array.shape) == 3 and img_array.shape[2] == 4:
                # Convert RGBA to RGB
                img_array = cv2.cvtColor(img_array, cv2.COLOR_RGBA2RGB)

            # Create mask for bottom-right corner (common watermark location)
            height, width = img_array.shape[:2]
            mask = np.zeros((height, width), dtype=np.uint8)
            mask[int(height * 0.85):, int(width * 0.85):] = 255

            # Apply inpainting
            result = cv2.inpaint(img_array, mask, 3, cv2.INPAINT_TELEA)

            return Image.fromarray(result)
        except ImportError:
            logger.warning("OpenCV not available, returning original image")
            return img

    def _detect_faces(self, img: Image.Image) -> Image.Image:
        """Detect and mark faces in image."""
        try:
            import cv2

            # Convert to numpy array
            img_array = np.array(img)
            if len(img_array.shape) == 3:
                img_array = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)

            # Load face cascade
            face_cascade = cv2.CascadeClassifier(
                cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            )

            # Detect faces
            gray = cv2.cvtColor(img_array, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(gray, 1.1, 4)

            # Draw rectangles
            for (x, y, w, h) in faces:
                cv2.rectangle(img_array, (x, y), (x+w, y+h), (0, 255, 0), 3)

            # Convert back
            img_array = cv2.cvtColor(img_array, cv2.COLOR_BGR2RGB)
            return Image.fromarray(img_array)
        except ImportError:
            raise FileProcessingError(message="Face detection requires OpenCV")

    def _blur_faces(self, img: Image.Image) -> Image.Image:
        """Detect and blur faces in image."""
        try:
            import cv2

            # Convert to numpy array
            img_array = np.array(img)
            if len(img_array.shape) == 3:
                img_array = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)

            # Load face cascade
            face_cascade = cv2.CascadeClassifier(
                cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            )

            # Detect faces
            gray = cv2.cvtColor(img_array, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(gray, 1.1, 4)

            # Blur each face
            for (x, y, w, h) in faces:
                face_region = img_array[y:y+h, x:x+w]
                blurred_face = cv2.GaussianBlur(face_region, (99, 99), 30)
                img_array[y:y+h, x:x+w] = blurred_face

            # Convert back
            img_array = cv2.cvtColor(img_array, cv2.COLOR_BGR2RGB)
            return Image.fromarray(img_array)
        except ImportError:
            raise FileProcessingError(message="Face blurring requires OpenCV")

    def _add_frame(self, img: Image.Image, request: ImageRequest) -> Image.Image:
        """Add decorative frame around image."""
        border_width = request.border_width * 3  # Thicker for frame

        # Create new image with border
        new_size = (img.size[0] + border_width * 2, img.size[1] + border_width * 2)
        framed = Image.new("RGB", new_size, "white")

        # Add pattern or gradient (simple white frame for now)
        framed.paste(img, (border_width, border_width))

        # Add decorative inner border
        draw = ImageDraw.Draw(framed)
        for i in range(3):
            draw.rectangle(
                [border_width - i - 1, border_width - i - 1,
                 new_size[0] - border_width + i, new_size[1] - border_width + i],
                outline="#D4AF37",
                width=2
            )

        return framed

    def _add_border(self, img: Image.Image, request: ImageRequest) -> Image.Image:
        """Add solid color border around image."""
        # Parse color
        try:
            color = request.border_color
            if color.startswith("#"):
                color = tuple(int(color[i:i+2], 16) for i in (1, 3, 5))
        except Exception:
            color = (255, 255, 255)

        return ImageOps.expand(img, border=request.border_width, fill=color)

    def _create_thumbnail(self, img: Image.Image, request: ImageRequest) -> Image.Image:
        """Create thumbnail with specified dimensions."""
        img.thumbnail(
            (request.thumbnail_width, request.thumbnail_height),
            Image.Resampling.LANCZOS
        )
        return img

    def _seo_optimize(self, img: Image.Image, request: ImageRequest) -> Image.Image:
        """Optimize image for SEO (resize to web-friendly dimensions and compress)."""
        # Max width for web images
        max_width = 1920
        if img.size[0] > max_width:
            ratio = max_width / img.size[0]
            new_size = (max_width, int(img.size[1] * ratio))
            img = img.resize(new_size, Image.Resampling.LANCZOS)

        # Ensure RGB mode for better compression
        if img.mode == "RGBA":
            background = Image.new("RGB", img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[3])
            img = background

        return img

    def extract_color_palette(self, img: Image.Image, num_colors: int = 5) -> List[tuple]:
        """Extract dominant colors from image."""
        # Resize for faster processing
        img = img.resize((150, 150))

        # Convert to RGB
        if img.mode != "RGB":
            img = img.convert("RGB")

        # Get pixels
        pixels = list(img.getdata())

        # Count colors
        color_counts = Counter(pixels)

        # Get most common
        return [color for color, count in color_counts.most_common(num_colors)]

    def perform_ocr(self, image_bytes: bytes) -> str:
        """Extract text from image using OCR."""
        try:
            import pytesseract

            img = Image.open(io.BytesIO(image_bytes))
            text = pytesseract.image_to_string(img)
            return text.strip()
        except ImportError:
            raise FileProcessingError(message="OCR requires pytesseract")
        except Exception as e:
            raise FileProcessingError(message=f"OCR failed: {str(e)}")

    def apply_watermark(self, image_bytes: bytes, format: ImageFormat) -> bytes:
        """Apply watermark to image."""
        if format == ImageFormat.PDF:
            return image_bytes

        img = Image.open(io.BytesIO(image_bytes))
        img = img.convert("RGBA")

        # Create watermark overlay
        txt_layer = Image.new("RGBA", img.size, (255, 255, 255, 0))
        draw = ImageDraw.Draw(txt_layer)

        watermark_text = "Tulz Free"

        try:
            font = ImageFont.truetype(
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 20
            )
        except Exception:
            font = ImageFont.load_default()

        # Get text size
        bbox = draw.textbbox((0, 0), watermark_text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]

        # Position at bottom right
        x = img.size[0] - text_width - 15
        y = img.size[1] - text_height - 15

        # Draw background
        padding = 5
        draw.rectangle(
            [x - padding, y - padding, x + text_width + padding, y + text_height + padding],
            fill=(255, 255, 255, 180),
        )

        # Draw text
        draw.text((x, y), watermark_text, font=font, fill=(100, 100, 100, 255))

        # Composite
        img = Image.alpha_composite(img, txt_layer)

        # Convert back
        if format == ImageFormat.JPEG:
            img = img.convert("RGB")

        return self._to_bytes(img, format, 90)

    def reduce_quality(
        self,
        image_bytes: bytes,
        format: ImageFormat,
        quality: int,
    ) -> bytes:
        """Reduce image quality for free tier."""
        if format == ImageFormat.PNG:
            return image_bytes  # PNG doesn't have quality setting

        img = Image.open(io.BytesIO(image_bytes))
        return self._to_bytes(img, format, quality)
