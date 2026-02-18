"""Image preprocessing utilities for improved OCR accuracy.

This module provides image enhancement functions to improve OCR results:
- Denoising: Remove image artifacts and noise
- Deskewing: Straighten rotated images
- Binarization: Convert to black and white for better text detection
- Contrast enhancement: Improve text visibility
"""

import cv2
import numpy as np
from PIL import Image
from typing import Optional


def preprocess_image(
    image: Image.Image,
    denoise: bool = True,
    deskew: bool = True,
    binarize: bool = True,
    enhance_contrast: bool = True,
) -> Image.Image:
    """Preprocess image for better OCR accuracy.
    
    Args:
        image: PIL Image to preprocess
        denoise: Remove noise from image
        deskew: Straighten rotated images
        binarize: Convert to black and white
        enhance_contrast: Enhance image contrast
        
    Returns:
        Preprocessed PIL Image
    """
    # Convert PIL to OpenCV format (RGB -> BGR)
    img_array = np.array(image)
    if len(img_array.shape) == 3:
        img_array = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
    
    # Convert to grayscale
    if len(img_array.shape) == 3:
        gray = cv2.cvtColor(img_array, cv2.COLOR_BGR2GRAY)
    else:
        gray = img_array
    
    # Denoise
    if denoise:
        gray = cv2.fastNlMeansDenoising(gray, h=10)
    
    # Enhance contrast
    if enhance_contrast:
        gray = cv2.equalizeHist(gray)
    
    # Binarization using Otsu's method
    if binarize:
        _, binary = cv2.threshold(
            gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU
        )
    else:
        binary = gray
    
    # Deskew
    if deskew:
        binary = _deskew_image(binary)
    
    # Convert back to PIL Image
    return Image.fromarray(binary)


def _deskew_image(image: np.ndarray) -> np.ndarray:
    """Deskew (straighten) a rotated image.
    
    Args:
        image: OpenCV image array (grayscale)
        
    Returns:
        Deskewed image array
    """
    # Find all non-zero points (text pixels)
    coords = np.column_stack(np.where(image > 0))
    
    if len(coords) == 0:
        return image
    
    # Find minimum area rectangle
    angle = cv2.minAreaRect(coords)[-1]
    
    # Correct angle
    if angle < -45:
        angle = -(90 + angle)
    else:
        angle = -angle
    
    # Skip if angle is very small (already straight)
    if abs(angle) < 0.5:
        return image
    
    # Rotate image
    (h, w) = image.shape[:2]
    center = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(center, angle, 1.0)
    rotated = cv2.warpAffine(
        image,
        M,
        (w, h),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REPLICATE,
    )
    
    return rotated


def assess_image_quality(image: Image.Image) -> dict:
    """Assess image quality for OCR suitability.
    
    Args:
        image: PIL Image to assess
        
    Returns:
        Dictionary with quality metrics and warnings
    """
    img_array = np.array(image)
    
    # Convert to grayscale if needed
    if len(img_array.shape) == 3:
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
    else:
        gray = img_array
    
    # Calculate metrics
    height, width = gray.shape
    resolution = height * width
    
    # Contrast (standard deviation)
    contrast = float(np.std(gray))
    
    # Brightness (mean)
    brightness = float(np.mean(gray))
    
    # Blur detection (Laplacian variance)
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    
    # Assess quality
    warnings = []
    quality_score = 100
    
    # Check resolution
    if resolution < 300000:  # Less than ~500x600
        warnings.append("Low resolution. Use higher quality image for better results.")
        quality_score -= 20
    
    # Check contrast
    if contrast < 30:
        warnings.append("Low contrast. Image may be washed out.")
        quality_score -= 15
    
    # Check brightness
    if brightness < 50:
        warnings.append("Image is too dark. Increase brightness.")
        quality_score -= 10
    elif brightness > 200:
        warnings.append("Image is too bright. Reduce exposure.")
        quality_score -= 10
    
    # Check blur
    if laplacian_var < 100:
        warnings.append("Image appears blurry. Use a sharper image.")
        quality_score -= 20
    
    # Determine overall quality
    if quality_score >= 80:
        quality = "excellent"
    elif quality_score >= 60:
        quality = "good"
    elif quality_score >= 40:
        quality = "fair"
    else:
        quality = "poor"
    
    return {
        "quality": quality,
        "quality_score": max(0, quality_score),
        "warnings": warnings,
        "metrics": {
            "resolution": f"{width}x{height}",
            "contrast": round(contrast, 1),
            "brightness": round(brightness, 1),
            "sharpness": round(laplacian_var, 1),
        },
        "suggestions": [
            "Use images with 300+ DPI for best results",
            "Ensure good lighting and high contrast",
            "Avoid blurry or out-of-focus images",
            "Keep text horizontal (not rotated)",
        ] if quality in ["fair", "poor"] else [],
    }
