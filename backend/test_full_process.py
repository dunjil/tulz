import asyncio
import io
import os
import sys
from PIL import Image

# Add app to path
sys.path.append(os.getcwd())

from app.services.tools.image_service import ImageService
from app.schemas.tools import ImageRequest, ImageOperation, ImageFormat

async def test_process():
    service = ImageService()
    
    # Create dummy image
    img = Image.new('RGB', (100, 100), color = 'blue')
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    content = buffer.getvalue()
    
    request = ImageRequest(
        operation=ImageOperation.REMOVE_BACKGROUND,
        output_format=ImageFormat.PNG,
        quality=85
    )
    
    print("Starting process...")
    try:
        result_bytes, orig, new = await service.process(content, request)
        print(f"Success! Result size: {len(result_bytes)}")
        print(f"Original size: {orig}, New size: {new}")
    except Exception as e:
        print(f"Process failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_process())
