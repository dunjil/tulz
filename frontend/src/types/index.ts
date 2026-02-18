// User types
export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  is_verified: boolean;
  subscription_tier: string;
  daily_uses_remaining: number;
  oauth_provider?: string | null;
}

// QR Code types
export type QRCodeType = "url" | "text" | "wifi" | "vcard" | "email" | "phone";
export type QRCodeFormat = "png" | "svg";
export type WifiAuthType = "WPA" | "WEP" | "nopass";

export interface QRCodeRequest {
  content_type: QRCodeType;
  content: string;
  wifi_ssid?: string;
  wifi_password?: string;
  wifi_auth?: WifiAuthType;
  wifi_hidden?: boolean;
  vcard_name?: string;
  vcard_phone?: string;
  vcard_email?: string;
  vcard_org?: string;
  vcard_title?: string;
  vcard_url?: string;
  size?: number;
  format?: QRCodeFormat;
  foreground_color?: string;
  background_color?: string;
  error_correction?: string;
  logo_base64?: string;
  logo_size_percent?: number;
}

export interface QRCodeResponse {
  image_base64: string;
  format: QRCodeFormat;
  size: number;
  content_type: QRCodeType;
}

// Calculator types
export type CalculatorOperation =
  | "evaluate"
  | "loan_emi"
  | "loan_total"
  | "compound_interest"
  | "unit_convert";

export type UnitCategory =
  | "length"
  | "weight"
  | "temperature"
  | "area"
  | "volume"
  | "speed"
  | "time"
  | "data";

export interface CalculatorRequest {
  operation: CalculatorOperation;
  expression?: string;
  principal?: number;
  annual_rate?: number;
  tenure_months?: number;
  compounds_per_year?: number;
  years?: number;
  unit_category?: UnitCategory;
  from_unit?: string;
  to_unit?: string;
  value?: number;
}

export interface CalculatorResponse {
  operation: CalculatorOperation;
  result: number | Record<string, any>;
  formatted_result: string;
  breakdown?: Record<string, any>;
}

// Image types
export type ImageOperation =
  | "remove_background"
  | "crop"
  | "resize"
  | "convert"
  | "compress"
  | "upscale"
  | "rotate"
  | "flip"
  | "filter"
  | "blur"
  | "grayscale"
  | "sepia"
  | "brightness"
  | "contrast"
  | "saturation"
  | "pixelate"
  | "cartoon"
  | "sketch"
  | "mirror"
  | "rounded_corners"
  | "add_watermark"
  | "remove_watermark"
  | "face_detect"
  | "face_blur"
  | "add_frame"
  | "add_border"
  | "thumbnail"
  | "seo_optimize";

export type ImageFormat = "png" | "jpeg" | "jpg" | "webp" | "pdf" | "gif" | "bmp" | "tiff" | "svg";

export interface ImageResponse {
  operation: ImageOperation;
  original_size: [number, number];
  new_size: [number, number];
  format: string;
  file_size_bytes: number;
  download_url: string;
}

// PDF types
export type PDFOperation = "merge" | "split" | "compress" | "to_word";

export interface PDFResponse {
  operation: PDFOperation;
  original_pages: number;
  result_files: Array<{
    filename: string;
    pages: number;
    size: number;
    download_url: string;
    compression_ratio?: string;
  }>;
  total_size_bytes: number;
}

// Excel types
export interface ExcelResponse {
  operation: string;
  sheet_count: number;
  sheets_processed: string[];
  result_files: Array<{
    sheet_name: string;
    rows: number;
    columns: number;
    size: number;
    download_url: string;
  }>;
  total_size_bytes: number;
}

// Payment types
export type PaymentProvider = "stripe" | "flutterwave";
export type SubscriptionTier = "free" | "basic" | "premium" | "unlimited";

export interface CheckoutRequest {
  tier?: string;
  currency?: string;
  billing_period?: "monthly" | "annual";
}

export interface CheckoutResponse {
  checkout_url?: string;
  client_secret?: string;
  payment_id: string;
  amount: number;
  currency: string;
}

// Usage types
export interface UsageRemaining {
  tier: string;
  remaining: number | null;
  is_unlimited: boolean;
  resets_at?: string;
}

export interface UsageStats {
  total_uses: number;
  uses_today: number;
  uses_this_month: number;
  by_tool: Record<string, number>;
  recent_history: Array<{
    id: string;
    tool: string;
    operation: string;
    processing_time_ms: number;
    tier_at_use: string;
    success: boolean;
    created_at: string;
  }>;
}
