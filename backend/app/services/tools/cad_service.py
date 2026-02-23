import os
import io
import fitz
import ezdxf
from ezdxf import recover
from ezdxf.addons.drawing import RenderContext, Frontend
from ezdxf.addons.drawing.matplotlib import MatplotlibBackend
import matplotlib.pyplot as plt
from typing import Tuple, List
import tempfile
import subprocess

class CADService:
    @staticmethod
    async def dwg_to_pdf(cad_bytes: bytes, filename: str) -> Tuple[bytes, int]:
        """Convert DWG/DXF to PDF using ezdxf and matplotlib."""
        with tempfile.NamedTemporaryFile(suffix=".dwg", delete=False) as tmp:
            tmp.write(cad_bytes)
            tmp_path = tmp.name

        try:
            # Check for binary DWG header (AutoCAD proprietary format)
            # Binary DWG starts with AC10xx
            if cad_bytes.startswith(b"AC10"):
                # Use LibreDWG's dwg2dxf command-line tool to convert proprietary DWG to open DXF
                dxf_path = tmp_path.replace(".dwg", ".dxf")
                try:
                    # Run dwg2dxf conversion
                    result = subprocess.run(
                        ["dwg2dxf", tmp_path],
                        cwd=os.path.dirname(tmp_path),
                        capture_output=True,
                        text=True,
                        check=True
                    )
                    
                    # Update tmp_path to point to the newly generated DXF for ezdxf
                    if os.path.exists(dxf_path):
                        # Important: don't delete the original tmp_path yet, we'll clean up later
                        target_file = dxf_path
                    else:
                        raise ValueError("dwg2dxf did not produce the expected DXF file.")
                        
                except subprocess.CalledProcessError as e:
                    raise ValueError(f"Failed to convert binary DWG using LibreDWG: {e.stderr}")
            else:
                target_file = tmp_path

            # Try to load as DXF (ezdxf is faster for DXF)
            try:
                doc, auditor = recover.readfile(target_file)
            except ezdxf.DXFError:
                doc = ezdxf.readfile(target_file)
                auditor = doc.audit()
            
            if auditor.has_errors:
                pass

            fig = plt.figure()
            ax = fig.add_axes([0, 0, 1, 1])
            ctx = RenderContext(doc)
            out = MatplotlibBackend(ax)
            Frontend(ctx, out).draw_layout(doc.modelspace())
            
            output_buffer = io.BytesIO()
            fig.savefig(output_buffer, format='pdf', bbox_inches='tight', pad_inches=0)
            plt.close(fig)
            
            return output_buffer.getvalue(), 1 # CAD is usually 1 "page" layout
            
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
            # Remove the intermediate DXF if it was created
            if 'target_file' in locals() and target_file != tmp_path and os.path.exists(target_file):
                os.remove(target_file)

    @staticmethod
    async def pdf_to_dwg(pdf_bytes: bytes) -> Tuple[bytes, int]:
        """Convert PDF vector paths to DXF (DWG compatible) using PyMuPDF and ezdxf."""
        doc_pdf = fitz.open(stream=pdf_bytes, filetype="pdf")
        total_pages = len(doc_pdf)
        
        # We create one DXF file. If multiple pages, we offset them in modelspace.
        doc_dxf = ezdxf.new('R2010')
        msp = doc_dxf.modelspace()
        
        offset_y = 0
        for page in doc_pdf:
            paths = page.get_drawings()
            page_height = page.rect.height
            
            for path in paths:
                color = path.get("color", (0, 0, 0))
                # Convert 0-1 float RGB to 0-255 int (approximated for DXF layers/colors)
                # DXF uses indexed colors usually, but we can use TrueColor in newer versions
                # For simplicity, we'll draw lines and polylines
                
                for item in path["items"]:
                    if item[0] == "l": # line
                        p1, p2 = item[1], item[2]
                        # Flip Y for CAD (CAD is Y-up, PDF is Y-down)
                        msp.add_line(
                            (p1.x, page_height - p1.y + offset_y), 
                            (p2.x, page_height - p2.y + offset_y)
                        )
                    elif item[0] == "re": # rect
                        rect = item[1]
                        msp.add_lwpolyline([
                            (rect.x0, page_height - rect.y0 + offset_y),
                            (rect.x1, page_height - rect.y0 + offset_y),
                            (rect.x1, page_height - rect.y1 + offset_y),
                            (rect.x0, page_height - rect.y1 + offset_y)
                        ], close=True)
                    elif item[0] == "c": # curve (bezier)
                        # Approximating bezier with a polyline (ezdxf can do splines but complexity is high for basic conversion)
                        p1, p2, p3, p4 = item[1], item[2], item[3], item[4]
                        # Flattening the curve
                        # This is a simplification; for production we'd use a better flattener
                        steps = 10
                        points = []
                        for i in range(steps + 1):
                            t = i / steps
                            x = (1-t)**3 * p1.x + 3*(1-t)**2*t * p2.x + 3*(1-t)*t**2 * p3.x + t**3 * p4.x
                            y = (1-t)**3 * p1.y + 3*(1-t)**2*t * p2.y + 3*(1-t)*t**2 * p3.y + t**3 * p4.y
                            points.append((x, page_height - y + offset_y))
                        msp.add_lwpolyline(points)
            
            offset_y -= (page_height + 50) # Space pages out vertically
            
        # ezdxf write() natively expects text stream for DXF format
        output_buffer = io.StringIO()
        doc_dxf.write(output_buffer)
        
        # Convert the generated DXF text to bytes
        dxf_bytes = output_buffer.getvalue().encode('utf-8')

        # Use LibreDWG to convert the intermediate DXF to proprietary DWG
        with tempfile.NamedTemporaryFile(suffix=".dxf", delete=False) as tmp_dxf:
            tmp_dxf.write(dxf_bytes)
            tmp_dxf_path = tmp_dxf.name
            
        dwg_path = tmp_dxf_path.replace(".dxf", ".dwg")
        
        try:
            # Run dxf2dwg conversion
            subprocess.run(
                ["dxf2dwg", tmp_dxf_path],
                cwd=os.path.dirname(tmp_dxf_path),
                capture_output=True,
                check=True
            )
            
            if os.path.exists(dwg_path):
                with open(dwg_path, "rb") as f:
                    dwg_bytes = f.read()
                return dwg_bytes, total_pages
            else:
                # If dxf2dwg fails to produce a DWG, fallback to returning the DXF
                # (Some complex geometries may fail in LibreDWG's dxf2dwg)
                return dxf_bytes, total_pages
                
        except (subprocess.CalledProcessError, FileNotFoundError):
            # If the command line tool fails or is not installed locally, return the DXF
            return dxf_bytes, total_pages
            
        finally:
            if os.path.exists(tmp_dxf_path):
                os.remove(tmp_dxf_path)
            if os.path.exists(dwg_path):
                os.remove(dwg_path)
