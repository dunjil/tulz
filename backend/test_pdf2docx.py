import urllib.request
import os
import traceback
from pdf2docx import Converter

# Download a sample PDF
url = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
pdf_path = "dummy.pdf"
docx_path = "dummy.docx"

if not os.path.exists(pdf_path):
    print("Downloading sample PDF...")
    urllib.request.urlretrieve(url, pdf_path)

print("Starting conversion...")
try:
    cv = Converter(pdf_path)
    cv.convert(docx_path)
    cv.close()
    print("Success! File saved to", docx_path)
except Exception as e:
    print("Error during conversion:")
    traceback.print_exc()

import fitz
print("PyMuPDF version:", fitz.__version__)
