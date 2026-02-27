import subprocess
import os
import sys

# Test Libreoffice headless docx to pdf
docx_path = "/home/duna/Desktop/ToolHub/backend/dummy2.docx"
input_dir = "/home/duna/Desktop/ToolHub/backend"

try:
    print(f"Running simple libreoffice command...")
    result = subprocess.run(
        [
            "libreoffice",
            "--headless",
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
