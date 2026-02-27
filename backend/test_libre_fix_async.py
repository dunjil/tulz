import asyncio
import os
import sys

sys.path.insert(0, '/home/duna/Desktop/ToolHub/backend')
from app.services.tools.pdf_service import PDFService
from docx import Document

async def test():
    doc = Document()
    doc.add_paragraph('Testing from_docx')
    docx_path = '/home/duna/Desktop/ToolHub/backend/dummy_fix.docx'
    doc.save(docx_path)
    
    with open(docx_path, 'rb') as f:
        docx_bytes = f.read()
        
    service = PDFService()
    print("Testing from_docx...")
    try:
        pdf_bytes, pages = await service.from_docx(docx_bytes)
        print('SUCCESS:', len(pdf_bytes))
    except Exception as e:
        print('ERROR:', str(e))

if __name__ == "__main__":
    asyncio.run(test())
