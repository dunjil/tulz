import subprocess
import os

docx_path = "/home/duna/Desktop/ToolHub/backend/dummy2.docx"
input_dir = "/home/duna/Desktop/ToolHub/backend"

# create dummy docx
from docx import Document
doc = Document()
doc.add_paragraph("Test permission")
doc.save(docx_path)

try:
    print(f"Running as user ID: {os.getuid()}")
    result = subprocess.run(
        [
            "libreoffice",
            "--headless",
            "--nologo",
            "--nofirststartwizard",
            "--convert-to",
            "pdf",
            "--outdir",
            input_dir,
            docx_path,
        ],
        capture_output=True,
        text=True,
        timeout=60,
    )
    print(f"Return code: {result.returncode}")
    print(f"STDOUT: {result.stdout}")
    print(f"STDERR: {result.stderr}")
    
except Exception as e:
    print(f"Exception: {e}")
