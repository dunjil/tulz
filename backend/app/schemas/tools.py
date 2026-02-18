"""Tool-specific request/response schemas."""

from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


# ============ QR Code Schemas ============
class QRCodeType(str, Enum):
    """QR code content types."""

    URL = "url"
    TEXT = "text"
    WIFI = "wifi"
    VCARD = "vcard"
    EMAIL = "email"
    PHONE = "phone"


class QRCodeFormat(str, Enum):
    """QR code output formats."""

    PNG = "png"
    SVG = "svg"


class WifiAuthType(str, Enum):
    """WiFi authentication types."""

    WPA = "WPA"
    WEP = "WEP"
    NOPASS = "nopass"


class QRCodeRequest(BaseModel):
    """QR code generation request."""

    content_type: QRCodeType = QRCodeType.URL
    content: str = Field(max_length=2000)

    # WiFi-specific fields
    wifi_ssid: Optional[str] = Field(default=None, max_length=100)
    wifi_password: Optional[str] = Field(default=None, max_length=100)
    wifi_auth: WifiAuthType = WifiAuthType.WPA
    wifi_hidden: bool = False

    # vCard fields
    vcard_name: Optional[str] = None
    vcard_phone: Optional[str] = None
    vcard_email: Optional[str] = None
    vcard_org: Optional[str] = None
    vcard_title: Optional[str] = None
    vcard_url: Optional[str] = None

    # Customization
    size: int = Field(default=300, ge=100, le=1000)
    format: QRCodeFormat = QRCodeFormat.PNG
    foreground_color: str = Field(default="#000000", pattern=r"^#[0-9A-Fa-f]{6}$")
    background_color: str = Field(default="#FFFFFF", pattern=r"^#[0-9A-Fa-f]{6}$")
    error_correction: str = Field(default="M", pattern=r"^[LMQH]$")

    # Logo overlay (base64 encoded image)
    logo_base64: Optional[str] = None
    logo_size_percent: int = Field(default=20, ge=10, le=30)


class QRCodeResponse(BaseModel):
    """QR code generation response."""

    image_base64: str
    format: QRCodeFormat
    size: int
    content_type: QRCodeType


# ============ Calculator Schemas ============
class CalculatorOperation(str, Enum):
    """Calculator operations."""

    EVALUATE = "evaluate"  # Scientific expression
    LOAN_EMI = "loan_emi"
    LOAN_TOTAL = "loan_total"
    COMPOUND_INTEREST = "compound_interest"
    UNIT_CONVERT = "unit_convert"


class UnitCategory(str, Enum):
    """Unit conversion categories."""

    LENGTH = "length"
    WEIGHT = "weight"
    TEMPERATURE = "temperature"
    AREA = "area"
    VOLUME = "volume"
    SPEED = "speed"
    TIME = "time"
    DATA = "data"


class CalculatorRequest(BaseModel):
    """Calculator request."""

    operation: CalculatorOperation

    # For expression evaluation
    expression: Optional[str] = Field(default=None, max_length=500)

    # For loan calculations
    principal: Optional[float] = Field(default=None, ge=0)
    annual_rate: Optional[float] = Field(default=None, ge=0, le=100)  # percentage
    tenure_months: Optional[int] = Field(default=None, ge=1, le=600)

    # For compound interest
    compounds_per_year: int = Field(default=12, ge=1, le=365)
    years: Optional[float] = Field(default=None, ge=0)

    # For unit conversion
    unit_category: Optional[UnitCategory] = None
    from_unit: Optional[str] = None
    to_unit: Optional[str] = None
    value: Optional[float] = None


class CalculatorResponse(BaseModel):
    """Calculator response."""

    operation: CalculatorOperation
    result: float | dict[str, Any]
    formatted_result: str
    breakdown: Optional[dict[str, Any]] = None


# ============ Image Schemas ============
class ImageOperation(str, Enum):
    """Image operations."""

    # Basic operations
    REMOVE_BACKGROUND = "remove_background"
    CROP = "crop"
    RESIZE = "resize"
    CONVERT = "convert"
    COMPRESS = "compress"
    UPSCALE = "upscale"
    ROTATE = "rotate"
    FLIP = "flip"

    # Filters and effects
    FILTER = "filter"
    BLUR = "blur"
    GRAYSCALE = "grayscale"
    SEPIA = "sepia"

    # Color adjustments
    BRIGHTNESS = "brightness"
    CONTRAST = "contrast"
    SATURATION = "saturation"

    # Creative effects
    PIXELATE = "pixelate"
    CARTOON = "cartoon"
    SKETCH = "sketch"
    MIRROR = "mirror"
    ROUNDED_CORNERS = "rounded_corners"

    # Watermark operations
    ADD_WATERMARK = "add_watermark"
    REMOVE_WATERMARK = "remove_watermark"

    # Advanced operations
    FACE_DETECT = "face_detect"
    FACE_BLUR = "face_blur"
    OCR = "ocr"
    COLOR_PALETTE = "color_palette"

    # Frames and borders
    ADD_FRAME = "add_frame"
    ADD_BORDER = "add_border"

    # Optimization
    SEO_OPTIMIZE = "seo_optimize"
    THUMBNAIL = "thumbnail"


class ImageFormat(str, Enum):
    """Image output formats."""

    PNG = "png"
    JPEG = "jpeg"
    JPG = "jpg"
    WEBP = "webp"
    GIF = "gif"
    BMP = "bmp"
    TIFF = "tiff"
    SVG = "svg"
    PDF = "pdf"


class ImageFilter(str, Enum):
    """Instagram-style filters."""

    NONE = "none"
    VINTAGE = "vintage"
    GRAYSCALE = "grayscale"
    SEPIA = "sepia"
    COOL = "cool"
    WARM = "warm"
    VIVID = "vivid"
    DRAMATIC = "dramatic"
    SOFT = "soft"


class FlipDirection(str, Enum):
    """Flip directions."""

    HORIZONTAL = "horizontal"
    VERTICAL = "vertical"
    BOTH = "both"


class MirrorDirection(str, Enum):
    """Mirror directions."""

    LEFT = "left"
    RIGHT = "right"
    TOP = "top"
    BOTTOM = "bottom"


class AspectRatio(str, Enum):
    """Common aspect ratios."""

    ORIGINAL = "original"
    SQUARE = "1:1"
    PORTRAIT = "4:5"
    LANDSCAPE = "16:9"
    STORY = "9:16"
    TWITTER = "2:1"
    PASSPORT = "35:45"


class SocialMediaPlatform(str, Enum):
    """Social media platforms for image sizing."""

    INSTAGRAM_POST = "instagram_post"
    INSTAGRAM_STORY = "instagram_story"
    FACEBOOK_POST = "facebook_post"
    FACEBOOK_COVER = "facebook_cover"
    TWITTER_POST = "twitter_post"
    TWITTER_HEADER = "twitter_header"
    LINKEDIN_POST = "linkedin_post"
    LINKEDIN_COVER = "linkedin_cover"
    YOUTUBE_THUMBNAIL = "youtube_thumbnail"
    PINTEREST_PIN = "pinterest_pin"


class ImageRequest(BaseModel):
    """Image processing request."""

    operation: ImageOperation

    # For crop
    crop_x: Optional[int] = Field(default=None, ge=0)
    crop_y: Optional[int] = Field(default=None, ge=0)
    crop_width: Optional[int] = Field(default=None, ge=1)
    crop_height: Optional[int] = Field(default=None, ge=1)
    aspect_ratio: Optional[AspectRatio] = None

    # For resize
    resize_width: Optional[int] = Field(default=None, ge=1, le=10000)
    resize_height: Optional[int] = Field(default=None, ge=1, le=10000)
    maintain_aspect: bool = True
    scale_percent: Optional[int] = Field(default=None, ge=1, le=500)
    social_platform: Optional[SocialMediaPlatform] = None

    # For convert
    output_format: ImageFormat = ImageFormat.PNG

    # For compress
    quality: int = Field(default=85, ge=1, le=100)

    # For rotate and flip
    rotation_angle: Optional[int] = Field(default=None, ge=-360, le=360)
    flip_direction: Optional[FlipDirection] = None

    # For filters
    filter_type: Optional[ImageFilter] = None

    # For blur
    blur_radius: int = Field(default=5, ge=1, le=50)

    # For color adjustments
    brightness: Optional[float] = Field(default=None, ge=-1.0, le=1.0)
    contrast: Optional[float] = Field(default=None, ge=-1.0, le=1.0)
    saturation: Optional[float] = Field(default=None, ge=-1.0, le=1.0)

    # For creative effects
    pixelate_size: int = Field(default=10, ge=2, le=50)
    corner_radius: int = Field(default=20, ge=1, le=500)
    mirror_direction: Optional[MirrorDirection] = None

    # For watermark
    watermark_text: Optional[str] = Field(default=None, max_length=100)
    watermark_opacity: float = Field(default=0.5, ge=0.0, le=1.0)
    watermark_position: str = Field(default="bottom_right")
    watermark_size: int = Field(default=20, ge=10, le=100)

    # For frame/border
    border_width: int = Field(default=10, ge=1, le=100)
    border_color: str = Field(default="#FFFFFF")
    frame_style: str = Field(default="simple")

    # For thumbnail
    thumbnail_width: int = Field(default=200, ge=50, le=1000)
    thumbnail_height: int = Field(default=200, ge=50, le=1000)

    # For upscale
    upscale_factor: int = Field(default=2, ge=2, le=4)

    # For collage
    collage_layout: Optional[str] = None
    collage_spacing: int = Field(default=10, ge=0, le=50)

    # For meme
    meme_top_text: Optional[str] = None
    meme_bottom_text: Optional[str] = None

    # For passport photo
    passport_country: str = Field(default="US")


class ImageResponse(BaseModel):
    """Image processing response."""

    operation: ImageOperation
    original_size: tuple[int, int]
    new_size: tuple[int, int]
    format: str
    file_size_bytes: int
    download_url: str
    watermarked: bool = False


# ============ PDF Schemas ============
class PDFOperation(str, Enum):
    """PDF operations."""

    MERGE = "merge"
    SPLIT = "split"
    COMPRESS = "compress"
    TO_WORD = "to_word"


class PDFSplitRequest(BaseModel):
    """PDF split request."""

    page_ranges: str = Field(
        description="Page ranges like '1-5,6-10,11-15' or 'all' for individual pages"
    )


class PDFMergeRequest(BaseModel):
    """PDF merge request - files uploaded separately."""

    file_order: list[str] = Field(
        description="List of file IDs in merge order"
    )


class PDFCompressRequest(BaseModel):
    """PDF compression request."""

    compression_level: str = Field(
        default="medium",
        pattern=r"^(low|medium|high)$"
    )


class PDFResponse(BaseModel):
    """PDF processing response."""

    operation: PDFOperation
    original_pages: int
    result_files: list[dict[str, Any]]  # [{filename, pages, size, download_url}]
    total_size_bytes: int
    watermarked: bool = False


# ============ Excel Schemas ============
class ExcelOperation(str, Enum):
    """Excel operations."""

    TO_CSV = "to_csv"


class ExcelRequest(BaseModel):
    """Excel processing request."""

    operation: ExcelOperation = ExcelOperation.TO_CSV
    sheets: Optional[list[str]] = Field(
        default=None,
        description="Sheet names to convert (None = all sheets)"
    )
    preserve_formulas: bool = Field(
        default=False,
        description="Include formula columns alongside values"
    )
    clean_data: bool = Field(
        default=True,
        description="Remove empty rows/columns, trim whitespace"
    )


class ExcelResponse(BaseModel):
    """Excel processing response."""

    operation: ExcelOperation
    sheet_count: int
    sheets_processed: list[str]
    result_files: list[dict[str, Any]]  # [{sheet_name, rows, columns, download_url}]
    total_size_bytes: int


# ============ File Upload Response ============
class FileUploadResponse(BaseModel):
    """File upload response."""

    file_id: str
    filename: str
    size_bytes: int
    mime_type: str
    expires_at: str
