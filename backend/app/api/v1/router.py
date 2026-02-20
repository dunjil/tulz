"""Main API v1 router."""

from fastapi import APIRouter

from app.api.v1 import admin, auth, feedback, users, visits
from app.api.v1.tools import qrcode, calculator, image, pdf, pdf_filler, excel, favicon, webpdf, json_formatter, markdown_pdf, text_diff, invoice, markdown_cv #, ocr
# from app.api.v1.tools import ocr_batch  # Temporarily disabled until celery is installed

# Main v1 router
router = APIRouter(prefix="/api/v1")

# Auth routes
router.include_router(auth.router, prefix="/auth", tags=["Authentication"])

# User routes
router.include_router(users.router, prefix="/users", tags=["Users"])

# Admin routes
router.include_router(admin.router, prefix="/admin", tags=["Admin"])

# Visit tracking routes
router.include_router(visits.router, prefix="/visits", tags=["Analytics"])

# Feedback routes
router.include_router(feedback.router, prefix="/feedback", tags=["Feedback"])

# Tool routes
router.include_router(qrcode.router, prefix="/tools/qrcode", tags=["QR Code"])
router.include_router(calculator.router, prefix="/tools/calculator", tags=["Calculator"])
router.include_router(image.router, prefix="/tools/image", tags=["Image"])
router.include_router(pdf.router, prefix="/tools/pdf", tags=["PDF"])
router.include_router(pdf_filler.router, prefix="/tools/pdf-filler", tags=["PDF Filler"])
router.include_router(excel.router, prefix="/tools/excel", tags=["Excel"])
router.include_router(favicon.router, prefix="/tools/favicon", tags=["Favicon"])
router.include_router(webpdf.router, prefix="/tools/webpdf", tags=["WebPDF"])
router.include_router(json_formatter.router, prefix="/tools/json", tags=["JSON Formatter"])
router.include_router(markdown_pdf.router, prefix="/tools/markdown", tags=["Markdown to PDF"])
router.include_router(text_diff.router, prefix="/tools/diff", tags=["Text Diff"])
router.include_router(invoice.router, prefix="/tools/invoice", tags=["Invoice Generator"])
router.include_router(markdown_cv.router, prefix="/tools/cv", tags=["CV Generator"])
# router.include_router(ocr.router, prefix="/tools/ocr", tags=["OCR"]) # Temporarily disabled
# router.include_router(ocr_batch.router, prefix="/tools/ocr", tags=["OCR Batch"])  # Temporarily disabled
