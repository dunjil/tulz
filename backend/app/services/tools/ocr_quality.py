"""OCR quality assessment utilities.

This module provides functions to assess OCR quality and provide
actionable feedback to users.
"""

from typing import Optional


def assess_ocr_quality(
    confidence: float,
    word_count: int,
    char_count: int,
    language: str = "eng",
) -> dict:
    """Assess OCR quality and provide feedback.
    
    Args:
        confidence: Average OCR confidence (0-100)
        word_count: Number of words detected
        char_count: Number of characters detected
        language: Language code used for OCR
        
    Returns:
        Dictionary with quality assessment and recommendations
    """
    quality = "excellent"
    warnings = []
    suggestions = []
    quality_score = 100
    
    # Assess confidence
    if confidence < 30:
        quality = "poor"
        quality_score = 30
        warnings.append("Very low confidence. Results likely contain many errors.")
        suggestions.extend([
            "Try preprocessing the image",
            "Use a higher quality scan or photo",
            "Ensure text is clearly visible and not blurry",
        ])
    elif confidence < 50:
        quality = "poor"
        quality_score = 50
        warnings.append("Low confidence. Results may contain significant errors.")
        suggestions.extend([
            "Consider using a clearer image",
            "Check if the correct language is selected",
        ])
    elif confidence < 70:
        quality = "fair"
        quality_score = 70
        warnings.append("Moderate confidence. Please review results carefully.")
        suggestions.append("Verify important information manually")
    elif confidence < 85:
        quality = "good"
        quality_score = 85
    
    # Assess text detection
    if word_count == 0:
        quality = "poor"
        quality_score = min(quality_score, 20)
        warnings.append("No text detected in the image.")
        suggestions.extend([
            "Verify the image contains readable text",
            "Check if text is too small or faint",
            "Try a different image or scan",
        ])
    elif word_count < 5:
        warnings.append("Very little text detected.")
        suggestions.append("Verify all text was captured")
    
    # Character to word ratio check (detect gibberish)
    if word_count > 0:
        avg_word_length = char_count / word_count
        if avg_word_length < 2:
            warnings.append("Detected text may contain errors or fragments.")
            quality_score = min(quality_score, 60)
        elif avg_word_length > 15:
            warnings.append("Unusually long words detected. May indicate OCR errors.")
            quality_score = min(quality_score, 70)
    
    # Language-specific warnings
    if language not in ["eng", "fra", "deu", "spa", "ita", "por", "nld"]:
        suggestions.append(
            f"For {language}, ensure you have the correct Tesseract language pack installed"
        )
    
    return {
        "quality": quality,
        "quality_score": quality_score,
        "confidence": confidence,
        "warnings": warnings,
        "suggestions": suggestions,
        "metrics": {
            "word_count": word_count,
            "char_count": char_count,
            "avg_word_length": round(char_count / word_count, 1) if word_count > 0 else 0,
        },
    }


def detect_language_from_text(text: str) -> Optional[str]:
    """Auto-detect language from extracted text.
    
    Args:
        text: Extracted text sample
        
    Returns:
        Tesseract language code or None if detection fails
    """
    try:
        from langdetect import detect_langs
        
        # Need at least some text to detect
        if not text or len(text.strip()) < 10:
            return None
        
        # Detect language
        langs = detect_langs(text)
        
        # Map langdetect codes to Tesseract codes
        lang_map = {
            "en": "eng",
            "fr": "fra",
            "de": "deu",
            "es": "spa",
            "it": "ita",
            "pt": "por",
            "nl": "nld",
            "pl": "pol",
            "ru": "rus",
            "zh-cn": "chi_sim",
            "zh-tw": "chi_tra",
            "ja": "jpn",
            "ko": "kor",
            "ar": "ara",
            "hi": "hin",
            "th": "tha",
            "vi": "vie",
            "tr": "tur",
        }
        
        detected = str(langs[0].lang)
        return lang_map.get(detected, "eng")
    
    except Exception:
        # If detection fails, return None
        return None


def suggest_language_improvement(
    detected_lang: str, used_lang: str, confidence: float
) -> Optional[str]:
    """Suggest if wrong language was used.
    
    Args:
        detected_lang: Auto-detected language code
        used_lang: Language code used for OCR
        confidence: OCR confidence score
        
    Returns:
        Suggestion message or None
    """
    if not detected_lang or detected_lang == used_lang:
        return None
    
    # Only suggest if confidence is low
    if confidence < 70:
        from app.services.tools.ocr_service import SUPPORTED_LANGUAGES
        
        detected_name = SUPPORTED_LANGUAGES.get(detected_lang, detected_lang)
        used_name = SUPPORTED_LANGUAGES.get(used_lang, used_lang)
        
        return (
            f"Text appears to be in {detected_name}, but OCR was run with {used_name}. "
            f"Try re-running with the correct language for better results."
        )
    
    return None
