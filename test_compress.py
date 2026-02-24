import sys
from pypdf import PdfReader, PdfWriter
import io
import fitz
import os

def create_large_pdf(filename, pages=50):
    doc = fitz.open()
    for _ in range(pages):
        page = doc.new_page()
        page.draw_rect(page.rect, color=(1,0,0), fill=(0,1,0))
        page.insert_text((50, 50), "Test PDF Compression", fontsize=50)
    doc.save(filename)
    doc.close()

if not os.path.exists("large.pdf"):
    create_large_pdf("large.pdf")

print(f"Original size: {os.path.getsize('large.pdf') / 1024 / 1024:.2f} MB")

