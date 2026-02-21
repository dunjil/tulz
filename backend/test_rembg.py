import logging
import io
from PIL import Image
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_rembg():
    try:
        from rembg import remove, new_session
        print("rembg imported successfully")
        
        # Test session creation
        print("Creating session with u2netp...")
        session = new_session("u2netp")
        print("Session created successfully")
        
        # Create a dummy image
        img = Image.new('RGB', (100, 100), color = 'red')
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='PNG')
        img_bytes = img_byte_arr.getvalue()
        
        # Test removal
        print("Testing background removal...")
        result_bytes = remove(img_bytes, session=session)
        print(f"Background removal success, result size: {len(result_bytes)}")
        
    except Exception as e:
        print(f"Error during rembg test: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_rembg()
