import subprocess
import os
import sys
import tempfile

docx_path = "/home/duna/Desktop/ToolHub/backend/dummy2.docx"
input_dir = "/home/duna/Desktop/ToolHub/backend"

try:
    print(f"Running libreoffice with isolated env...")
    user_prof = tempfile.mkdtemp(prefix="libreoffice_prof_")
    
    result = subprocess.run(
        [
            "libreoffice",
            f"-env:UserInstallation=file://{user_prof}",
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
    
    # cleanup
    os.system(f"rm -rf {user_prof}")
except Exception as e:
    print(f"Exception: {e}")
