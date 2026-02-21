import requests
import io
from PIL import Image

def test_api():
    url = "http://localhost:8000/api/v1/tools/image/process"
    
    # Create dummy image
    img = Image.new('RGB', (100, 100), color = 'green')
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    img_bytes = buffer.getvalue()
    
    files = {
        'file': ('test.png', img_bytes, 'image/png')
    }
    
    data = {
        'operation': 'remove_background',
        'output_format': 'png',
        'quality': 85
    }
    
    print(f"Sending request to {url}...")
    try:
        response = requests.post(url, files=files, data=data)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print("Success!")
            print(response.json())
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    test_api()
