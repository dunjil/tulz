import aspose.cad as cad
import ezdxf
import io

def convert_valid_dxf_to_dwg():
    try:
        # 1. Create a valid DXF using ezdxf
        doc = ezdxf.new('R2010')
        msp = doc.modelspace()
        msp.add_line((0, 0), (10, 10))
        
        out_dxf = io.StringIO()
        doc.write(out_dxf)
        dxf_bytes = out_dxf.getvalue().encode('utf-8')
        
        print("Loading DXF with Aspose.CAD...")
        stream = io.BytesIO(dxf_bytes)
        image = cad.Image.load(stream)
        
        print("Saving as DWG...")
        out_dwg = io.BytesIO()
        options = cad.imageoptions.DwgOptions()
        image.save(out_dwg, options)
        
        dwg_bytes = out_dwg.getvalue()
        print(f"Success! DWG size: {len(dwg_bytes)}")
        print(f"DWG Header: {dwg_bytes[:6]}")
        
    except Exception as e:
        print(f"Failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    convert_valid_dxf_to_dwg()
