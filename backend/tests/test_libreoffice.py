import unittest
from unittest.mock import MagicMock, patch
import os
import sys

# Add backend to path to import PDFService
sys.path.append(os.path.abspath("/home/duna/Desktop/ToolHub/backend"))

from app.services.tools.pdf_service import PDFService

class TestLibreOfficeDetection(unittest.TestCase):
    def setUp(self):
        self.service = PDFService()

    @patch("shutil.which")
    def test_get_libreoffice_bin_libreoffice(self, mock_which):
        # Case 1: 'libreoffice' exists
        mock_which.side_effect = lambda x: "/usr/bin/libreoffice" if x == "libreoffice" else None
        
        result = self.service._get_libreoffice_bin()
        self.assertEqual(result, "libreoffice")

    @patch("shutil.which")
    def test_get_libreoffice_bin_soffice(self, mock_which):
        # Case 2: 'libreoffice' missing, 'soffice' exists
        mock_which.side_effect = lambda x: "/usr/bin/soffice" if x == "soffice" else None
        
        result = self.service._get_libreoffice_bin()
        self.assertEqual(result, "soffice")

    @patch("shutil.which")
    def test_get_libreoffice_bin_none(self, mock_which):
        # Case 3: Both missing
        mock_which.return_value = None
        
        result = self.service._get_libreoffice_bin()
        self.assertIsNone(result)

    @patch("app.services.tools.pdf_service.PDFService._get_libreoffice_bin")
    @patch("subprocess.run")
    @patch("tempfile.NamedTemporaryFile")
    @patch("os.path.exists")
    @patch("builtins.open")
    @patch("pypdf.PdfReader")
    async def test_from_docx_calls_correct_bin(self, mock_reader, mock_open, mock_exists, mock_temp, mock_run, mock_get_bin):
        # Setup mocks
        mock_get_bin.return_value = "soffice"
        mock_exists.return_value = True
        mock_run.return_value = MagicMock(returncode=0)
        
        # We need to mock the async behavior or just test the synchronous part if possible
        # Since from_docx is async and calls run_in_executor, testing it fully is complex.
        # Let's test the synchronous conversion method instead.
        
        success = self.service._convert_docx_with_libreoffice("input.docx", "output.pdf", "soffice")
        
        self.assertTrue(success)
        mock_run.assert_called_once()
        args, kwargs = mock_run.call_args
        self.assertEqual(args[0][0], "soffice")

if __name__ == "__main__":
    unittest.main()
