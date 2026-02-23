"""Invoice Generator endpoints.

This is a PRO tool - requires authentication and tracks usage.
"""

import os
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List

from fastapi import APIRouter
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from weasyprint import HTML, CSS
from num2words import num2words

from app.api.deps import ClientIP, DbSession, OptionalUser, UserAgent
from app.config import settings
from app.models.history import ToolType
from app.services.usage_service import UsageService

router = APIRouter()

# Temp file storage
TEMP_DIR = settings.temp_file_dir
os.makedirs(TEMP_DIR, exist_ok=True)


class InvoiceItem(BaseModel):
    """A single invoice line item."""
    description: str = Field(..., max_length=200)
    quantity: float = Field(..., gt=0)
    unit_price: float = Field(..., ge=0)
    tax_rate: float = Field(default=0, ge=0, le=100)  # Percentage


class InvoiceAddress(BaseModel):
    """Address for invoice."""
    name: str = Field(..., max_length=100)
    address_line1: str = Field(default="", max_length=200)
    address_line2: Optional[str] = Field(default=None, max_length=200)
    city: str = Field(default="", max_length=100)
    state: Optional[str] = Field(default=None, max_length=100)
    postal_code: str = Field(default="", max_length=20)
    country: str = Field(default="", max_length=100)
    email: Optional[str] = Field(default=None, max_length=100)
    phone: Optional[str] = Field(default=None, max_length=30)


class WatermarkConfig(BaseModel):
    """Watermark configuration for invoice."""
    enabled: bool = Field(default=False)
    content: Optional[str] = Field(default=None, description="Text or base64 image data")
    content_type: str = Field(default="text", description="'text' or 'image'")
    color: str = Field(default="#6b7280", description="Hex color for text watermark")
    opacity: float = Field(default=0.15, ge=0.05, le=1.0)
    rotation: int = Field(default=-45, ge=-90, le=90)
    font_size: int = Field(default=60, ge=20, le=200)


class InvoiceRequest(BaseModel):
    """Request to generate an invoice."""
    # Invoice details
    title: str = Field(default="INVOICE", max_length=50, description="Title of the document, e.g. INVOICE, PROFORMA INVOICE")
    invoice_number: str = Field(..., max_length=50)
    invoice_date: str = Field(..., description="Date in YYYY-MM-DD format")
    due_date: Optional[str] = Field(default=None, description="Due date in YYYY-MM-DD format")

    # Parties
    from_address: InvoiceAddress
    to_address: InvoiceAddress

    # Items
    items: List[InvoiceItem] = Field(..., min_length=1, max_length=50)

    # Currency and formatting
    currency: str = Field(default="USD", max_length=3)
    currency_symbol: str = Field(default="$", max_length=5)

    # Optional fields
    notes: Optional[str] = Field(default=None, max_length=5000)
    terms: Optional[str] = Field(default=None, max_length=1000)
    amount_in_words: Optional[str] = Field(default=None, max_length=200, description="Explicit amount in words. If missing, omitted.")
    logo_url: Optional[str] = Field(default=None, description="URL to company logo")
    signature_data: Optional[str] = Field(default=None, description="Base64 encoded signature image")
    client_signature_data: Optional[str] = Field(default=None, description="Base64 encoded client signature image")

    # Styling
    primary_color: str = Field(default="#3498db", description="Primary color hex")
    template: str = Field(default="modern", description="Template: modern, classic, minimal")
    show_tax: bool = Field(default=True, description="Whether to show tax column and calculations")
    show_signature_section: bool = Field(default=True, description="Whether to show signature lines in PDF")

    # Watermark
    watermark: Optional[WatermarkConfig] = Field(default=None, description="Watermark configuration")


class InvoiceResponse(BaseModel):
    """Response for invoice generation."""
    success: bool
    download_url: Optional[str] = None
    error: Optional[str] = None
    invoice_number: Optional[str] = None
    total: Optional[float] = None
    subtotal: Optional[float] = None
    tax_total: Optional[float] = None


CURRENCY_NAMES = {
    "USD": ("Dollar", "Dollars", "Cent", "Cents"),
    "EUR": ("Euro", "Euros", "Cent", "Cents"),
    "GBP": ("Pound", "Pounds", "Penny", "Pence"),
    "JPY": ("Yen", "Yen", "Sen", "Sen"),
    "CNY": ("Yuan", "Yuan", "Jiao", "Jiao"),
    "CHF": ("Franc", "Francs", "Rappen", "Rappen"),
    "CAD": ("Canadian Dollar", "Canadian Dollars", "Cent", "Cents"),
    "AUD": ("Australian Dollar", "Australian Dollars", "Cent", "Cents"),
    "NZD": ("New Zealand Dollar", "New Zealand Dollars", "Cent", "Cents"),
    "SGD": ("Singapore Dollar", "Singapore Dollars", "Cent", "Cents"),
    "HKD": ("Hong Kong Dollar", "Hong Kong Dollars", "Cent", "Cents"),
    "INR": ("Rupee", "Rupees", "Paisa", "Paise"),
    "KRW": ("Won", "Won", "Jeon", "Jeon"),
    "MXN": ("Mexican Peso", "Mexican Pesos", "Centavo", "Centavos"),
    "BRL": ("Real", "Reais", "Centavo", "Centavos"),
    "ZAR": ("Rand", "Rand", "Cent", "Cents"),
    "NGN": ("Naira", "Naira", "Kobo", "Kobo"),
    "AED": ("Dirham", "Dirhams", "Fils", "Fils"),
    "SAR": ("Riyal", "Riyals", "Halala", "Halalat"),
    "ILS": ("Shekel", "Shekels", "Agora", "Agorot"),
    "TRY": ("Lira", "Liras", "Kurus", "Kurus"),
    "PLN": ("Zloty", "Zlotys", "Grosz", "Groszy"),
    "SEK": ("Krona", "Kronor", "Ore", "Ore"),
    "NOK": ("Krone", "Kroner", "Ore", "Ore"),
    "DKK": ("Krone", "Kroner", "Ore", "Ore"),
    "THB": ("Baht", "Baht", "Satang", "Satang"),
    "MYR": ("Ringgit", "Ringgit", "Sen", "Sen"),
    "PHP": ("Peso", "Pesos", "Centavo", "Centavos"),
    "IDR": ("Rupiah", "Rupiah", "Sen", "Sen"),
    "VND": ("Dong", "Dong", "Hao", "Hao"),
    "EGP": ("Egyptian Pound", "Egyptian Pounds", "Piastre", "Piastres"),
    "KES": ("Kenyan Shilling", "Kenyan Shillings", "Cent", "Cents"),
    "GHS": ("Cedi", "Cedis", "Pesewa", "Pesewas"),
    "PKR": ("Pakistani Rupee", "Pakistani Rupees", "Paisa", "Paise"),
    "BDT": ("Taka", "Taka", "Poisha", "Poisha"),
    "COP": ("Colombian Peso", "Colombian Pesos", "Centavo", "Centavos"),
    "ARS": ("Argentine Peso", "Argentine Pesos", "Centavo", "Centavos"),
    "CLP": ("Chilean Peso", "Chilean Pesos", "Centavo", "Centavos"),
    "PEN": ("Sol", "Soles", "Centimo", "Centimos"),
    "RUB": ("Ruble", "Rubles", "Kopeck", "Kopecks"),
    "UAH": ("Hryvnia", "Hryvnias", "Kopiyka", "Kopiykas"),
    "CZK": ("Koruna", "Korunas", "Haler", "Halere"),
    "HUF": ("Forint", "Forints", "Filler", "Fillers"),
    "RON": ("Leu", "Lei", "Ban", "Bani"),
    "BTC": ("Bitcoin", "Bitcoins", "Satoshi", "Satoshis"),
    "ETH": ("Ether", "Ether", "Gwei", "Gwei"),
    "USDT": ("Tether", "Tether", "Cent", "Cents"),
}

def get_amount_in_words(amount: float, currency_code: str) -> str:
    """Safely convert amount to words, with proper currency units."""
    integer_part = int(amount)
    fractional_part = int(round((amount - integer_part) * 100))
    
    major_sing, major_plur, minor_sing, minor_plur = CURRENCY_NAMES.get(
        currency_code.upper(), 
        (currency_code, currency_code + "s", "Cent", "Cents")
    )
    
    words = num2words(integer_part).replace("-", " ")
    words += f" {major_sing}" if integer_part == 1 else f" {major_plur}"
    
    if fractional_part > 0:
        words += f" and {num2words(fractional_part).replace('-', ' ')}"
        words += f" {minor_sing}" if fractional_part == 1 else f" {minor_plur}"
        
    return words


def generate_invoice_html(data: InvoiceRequest) -> tuple[str, float, float, float]:
    """Generate HTML for the invoice and return (html, subtotal, tax_total, total)."""

    # Calculate totals
    subtotal = 0.0
    tax_total = 0.0

    items_html = ""
    for item in data.items:
        line_total = item.quantity * item.unit_price
        line_tax = line_total * (item.tax_rate / 100) if data.show_tax else 0
        subtotal += line_total
        tax_total += line_tax

        tax_cell = f'<td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-size: 12px;">{item.tax_rate}%</td>' if data.show_tax else ""
        items_html += f"""
        <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 12px;">{item.description}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center; font-size: 12px;">{item.quantity}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-size: 12px;">{data.currency_symbol}{item.unit_price:,.2f}</td>
            {tax_cell}
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: 500; font-size: 12px;">{data.currency_symbol}{line_total:,.2f}</td>
        </tr>
        """

    total = subtotal + tax_total if data.show_tax else subtotal

    # Format addresses
    def format_address(addr: InvoiceAddress) -> str:
        lines = [f"<strong>{addr.name}</strong>"]
        if addr.address_line1:
            # Handle newlines in address_line1 (for simplified input)
            addr_lines = addr.address_line1.replace('\n', '<br>')
            lines.append(addr_lines)
        if addr.address_line2:
            lines.append(addr.address_line2)
        city_line = ", ".join(filter(None, [addr.city, addr.state, addr.postal_code]))
        if city_line:
            lines.append(city_line)
        if addr.country:
            lines.append(addr.country)
        if addr.email:
            lines.append(f"<br>{addr.email}")
        if addr.phone:
            lines.append(addr.phone)
        return "<br>".join(lines)

    from_html = format_address(data.from_address)
    to_html = format_address(data.to_address)

    # Notes and terms
    notes_html = f'<div style="margin-top: 30px;"><h4 style="color: {data.primary_color};">Notes</h4><p style="color: #666; font-size: 12px;">{data.notes}</p></div>' if data.notes else ""
    terms_html = f'<div style="margin-top: 20px;"><h4 style="color: {data.primary_color};">Terms & Conditions</h4><p style="color: #666; font-size: 12px;">{data.terms}</p></div>' if data.terms else ""

    # Logo
    logo_html = f'<img src="{data.logo_url}" style="max-height: 60px; max-width: 200px;">' if data.logo_url else ""

    # Watermark HTML
    watermark_html = ""
    if data.watermark and data.watermark.enabled and data.watermark.content:
        wm = data.watermark
        if wm.content_type == "text":
            watermark_html = f'''
            <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate({wm.rotation}deg);
                        opacity: {wm.opacity}; pointer-events: none; z-index: 1000; white-space: nowrap;">
                <span style="font-size: {wm.font_size}px; font-weight: bold; color: {wm.color};">{wm.content}</span>
            </div>
            '''
        elif wm.content_type == "image" and wm.content:
            watermark_html = f'''
            <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate({wm.rotation}deg);
                        opacity: {wm.opacity}; pointer-events: none; z-index: 1000;">
                <img src="{wm.content}" style="max-width: 300px; max-height: 300px;" alt="Watermark">
            </div>
            '''

    # Signature HTML — client signature is optional
    signature_html = ""
    if data.show_signature_section:
        justify = "space-between" if data.client_signature_data else "flex-end"
        client_sig_html = ""
        if data.client_signature_data:
            client_sig_html = f'''
                <div style="width: 45%;">
                    <div style="margin-bottom: 8px;"><img src="{data.client_signature_data}" style="max-height: 60px; max-width: 180px;" alt="Client Signature"></div>
                    <div style="border-top: 1px solid #333; padding-top: 8px;">
                        <p style="margin: 0; font-size: 11px; color: #666;">Client Signature</p>
                    </div>
                </div>'''
        auth_sig_img = f'<div style="margin-bottom: 8px;"><img src="{data.signature_data}" style="max-height: 60px; max-width: 180px;" alt="Signature"></div>' if data.signature_data else '<div style="height: 50px;"></div>'
        signature_html = f'''<!-- Signature Section -->
            <div style="margin-top: 40px; display: flex; justify-content: {justify};">
                {client_sig_html}
                <div style="width: 45%;">
                    {auth_sig_img}
                    <div style="border-top: 1px solid #333; padding-top: 8px;">
                        <p style="margin: 0; font-size: 11px; color: #666;">Authorized Signature</p>
                    </div>
                </div>
            </div>'''

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Invoice {data.invoice_number}</title>
    </head>
    <body style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; line-height: 1.5; margin: 0; padding: 20px 25px; position: relative;">
        {watermark_html}
        <div style="max-width: 100%; position: relative;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                <div>
                    {logo_html}
                    <div style="margin-top: 8px; color: #666; font-size: 12px;">
                        {from_html}
                    </div>
                </div>
                <div style="text-align: right;">
                    <h1 style="margin: 0; color: {data.primary_color}; font-size: 28px; font-weight: 300;">{data.title.upper()}</h1>
                    <div style="margin-top: 8px; color: #666; font-size: 12px;">
                        <p style="margin: 3px 0;"><strong>Invoice #:</strong> {data.invoice_number}</p>
                        <p style="margin: 3px 0;"><strong>Date:</strong> {data.invoice_date}</p>
                        {f'<p style="margin: 3px 0;"><strong>Due Date:</strong> {data.due_date}</p>' if data.due_date else ''}
                    </div>
                </div>
            </div>

            <!-- Bill To -->
            <div style="background: #f9f9f9; padding: 12px; border-radius: 6px; margin-bottom: 16px;">
                <h3 style="margin: 0 0 6px 0; color: {data.primary_color}; font-size: 11px; text-transform: uppercase;">Bill To</h3>
                <div style="color: #666; font-size: 12px;">
                    {to_html}
                </div>
            </div>

            <!-- Items Table -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
                <thead>
                    <tr style="background: {data.primary_color}; color: white;">
                        <th style="padding: 8px; text-align: left; font-weight: 500; font-size: 11px;">Description</th>
                        <th style="padding: 8px; text-align: center; font-weight: 500; font-size: 11px;">Qty</th>
                        <th style="padding: 8px; text-align: right; font-weight: 500; font-size: 11px;">Unit Price</th>
                        {'<th style="padding: 8px; text-align: right; font-weight: 500; font-size: 11px;">Tax</th>' if data.show_tax else ''}
                        <th style="padding: 8px; text-align: right; font-weight: 500; font-size: 11px;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {items_html}
                </tbody>
            </table>

            <!-- Totals -->
            <div style="display: flex; justify-content: flex-end;">
                <div style="width: 240px;">
                    <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #eee; font-size: 12px;">
                        <span style="color: #666;">Subtotal</span>
                        <span>{data.currency_symbol}{subtotal:,.2f}</span>
                    </div>
                    {'<div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #eee; font-size: 12px;"><span style="color: #666;">Tax</span><span>' + data.currency_symbol + f'{tax_total:,.2f}</span></div>' if data.show_tax else ''}
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 16px; font-weight: bold; color: {data.primary_color};">
                        <span>Total ({data.currency})</span>
                        <span>{data.currency_symbol}{total:,.2f}</span>
                    </div>
                </div>
            </div>

            {f'''<div style="margin-top: 30px; margin-bottom: 20px; padding: 12px; background: #f9f9f9; border-radius: 6px;">
                <h4 style="margin: 0 0 4px 0; color: #666; font-size: 11px; text-transform: uppercase;">Amount in Words</h4>
                <p style="margin: 0; color: #333; font-size: 12px; font-weight: 500; text-transform: capitalize;">{data.amount_in_words}</p>
            </div>''' if data.amount_in_words else ''}

            {notes_html}
            {terms_html}

            {signature_html}

            <!-- Footer -->
            <div style="margin-top: 30px; padding-top: 12px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 10px;">
                <p style="margin: 0;">Thank you for your business!</p>
            </div>
        </div>
    </body>
    </html>
    """

    return html, subtotal, tax_total, total


@router.post("/generate", response_model=InvoiceResponse)
async def generate_invoice(
    data: InvoiceRequest,
    session: DbSession,
    user: OptionalUser,
    client_ip: ClientIP,
    user_agent: UserAgent,
):
    """
    Generate a professional PDF invoice.

    This is a PRO feature - usage is tracked.
    """
    # Check and record usage (this is a Pro tool)
    usage_service = UsageService(session)

    try:
        history, tier = await usage_service.check_and_record_usage(
            tool=ToolType.INVOICE,
            operation="generate",
            user=user,
            ip_address=client_ip,
            user_agent=user_agent,
            input_metadata={
                "invoice_number": data.invoice_number,
                "items_count": len(data.items),
                "template": data.template,
            },
        )
    except Exception as e:
        return InvoiceResponse(
            success=False,
            error=str(e)
        )

    try:
        # Generate HTML
        html_content, subtotal, tax_total, total = generate_invoice_html(data)

        # Convert to PDF
        html = HTML(string=html_content)
        pdf_bytes = html.write_pdf()

        # Apply watermark for free tier
        # (In production, you'd add a watermark to the PDF)

        # Save to temp file
        file_id = str(uuid.uuid4())
        filename = f"invoice_{data.invoice_number.replace('/', '_')}_{file_id}.pdf"
        filepath = os.path.join(TEMP_DIR, filename)

        with open(filepath, "wb") as f:
            f.write(pdf_bytes)

        # Complete usage tracking
        await usage_service.complete_usage(
            history=history,
            processing_time_ms=100,
            output_metadata={
                "subtotal": subtotal,
                "tax_total": tax_total,
                "total": total,
                "pdf_size": len(pdf_bytes),
            },
        )

        return InvoiceResponse(
            success=True,
            download_url=f"/api/v1/tools/invoice/download/{filename}",
            invoice_number=data.invoice_number,
            subtotal=subtotal,
            tax_total=tax_total,
            total=total,
        )

    except Exception as e:
        await usage_service.complete_usage(
            history=history,
            processing_time_ms=0,
            success=False,
            error_message=str(e),
        )
        return InvoiceResponse(
            success=False,
            error=str(e)
        )


@router.get("/download/{filename}")
async def download_invoice(filename: str):
    """Download generated invoice PDF."""
    if not filename or ".." in filename or "/" in filename:
        return {"error": "Invalid filename"}

    filepath = os.path.join(TEMP_DIR, filename)

    if not os.path.exists(filepath):
        return {"error": "File not found or expired"}

    # Extract invoice number from filename for download name
    parts = filename.split("_")
    invoice_num = parts[1] if len(parts) > 1 else "invoice"

    return FileResponse(
        filepath,
        media_type="application/pdf",
        filename=f"Invoice_{invoice_num}.pdf",
    )


@router.post("/preview")
async def preview_invoice(data: InvoiceRequest):
    """
    Generate HTML preview of invoice (no usage tracking).
    Returns the HTML directly for preview in browser.
    """
    try:
        html_content, subtotal, tax_total, total = generate_invoice_html(data)

        # Extract just the body content for cleaner preview embedding
        # The full HTML with doctype can cause issues when injected via dangerouslySetInnerHTML
        import re
        body_match = re.search(r'<body[^>]*>(.*?)</body>', html_content, re.DOTALL | re.IGNORECASE)
        if body_match:
            preview_html = body_match.group(1)
        else:
            preview_html = html_content

        return {
            "success": True,
            "html": preview_html,
            "subtotal": subtotal,
            "tax_total": tax_total,
            "total": total,
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
        }


@router.get("/templates")
async def get_templates():
    """Get available invoice templates."""
    return {
        "templates": [
            {"id": "modern", "name": "Modern", "description": "Clean and contemporary design"},
            {"id": "classic", "name": "Classic", "description": "Traditional professional look"},
            {"id": "minimal", "name": "Minimal", "description": "Simple and elegant"},
        ]
    }
