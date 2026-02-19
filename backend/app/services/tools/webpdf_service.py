"""Website to PDF conversion service using Playwright."""

import asyncio
import io
from typing import Optional, Tuple

from pypdf import PdfReader, PdfWriter
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas


class WebPdfService:
    """Service for converting websites to PDF."""

    # Global semaphore to limit concurrent browser instances across all requests in one worker
    # 5 concurrent browsers per worker (15 total for 3 workers) is safe for 8GB RAM
    _semaphore = asyncio.Semaphore(5)

    async def convert(
        self,
        url: str,
        format: str = "A4",
        landscape: bool = False,
        include_background: bool = True,
        scale: float = 1.0,
        margin_top: str = "10mm",
        margin_bottom: str = "10mm",
        margin_left: str = "10mm",
        margin_right: str = "10mm",
        wait_for: int = 3000,
        full_page: bool = True,
        viewport_type: str = "desktop",
    ) -> Tuple[bytes, int, Optional[str]]:
        """
        Convert a website to PDF.
        Returns (pdf_bytes, page_count, title).
        """
        async with self._semaphore:
            try:
                from playwright.async_api import async_playwright
            except ImportError:
                raise RuntimeError(
                    "Playwright is not installed. Run: pip install playwright && playwright install chromium"
                )

            async with async_playwright() as p:
                # Launch browser with retries
                browser = None
                last_err = None
                max_retries = 3
                
                for attempt in range(max_retries):
                    try:
                        browser = await p.chromium.launch(
                            headless=True,
                            timeout=60000, # 60s timeout for busy VPS
                            args=[
                                "--no-sandbox",
                                "--disable-setuid-sandbox",
                                "--disable-dev-shm-usage",
                                "--disable-gpu",
                                "--single-process", # Better for low memory
                            ],
                        )
                        break 
                    except Exception as launch_err:
                        last_err = launch_err
                        print(f"[PLAYWRIGHT ATTEMPT {attempt+1}] Failed to launch chromium: {launch_err}")
                        if attempt < max_retries - 1:
                            await asyncio.sleep(1 * (attempt + 1)) # Backoff
                
                if not browser:
                    raise RuntimeError(f"Could not launch browser after {max_retries} attempts: {last_err}")

                try:
                    # Viewport and device emulation
                    is_mobile = viewport_type == "mobile"
                    
                    if is_mobile:
                        # Mobile: iPhone 14 style
                        viewport = {"width": 844, "height": 390} if landscape else {"width": 390, "height": 844}
                        user_agent = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
                    else:
                        # Desktop: 1080p for landscape, 1440 width for portrait to ensure desktop layout
                        # 1440px is safer than 1280px to avoid tablet/mobile breakpoints
                        viewport = {"width": 1920, "height": 1080} if landscape else {"width": 1440, "height": 2036}
                        user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

                    context = await browser.new_context(
                        viewport=viewport,
                        user_agent=user_agent,
                        is_mobile=is_mobile,
                        has_touch=is_mobile,
                        device_scale_factor=1,
                    )
                    page = await context.new_page()

                    # BLOCK ADS & TRACKERS to speed up load time
                    async def intercept(route):
                        # We NO LONGER block images here as it's too risky for quality
                        excluded_resource_types = ["media", "font"] if not include_background else []
                        if route.request.resource_type in (["analytics", "tracker", "advertising"] + excluded_resource_types) or \
                           any(x in route.request.url for x in ["google-analytics.com", "googletagmanager.com", "facebook.net", "adroll.com"]):
                            await route.abort()
                        else:
                            await route.continue_()
                    
                    await page.route("**/*", intercept)

                    # Emulate screen media for desktop
                    await page.emulate_media(media="screen")

                    # Navigate to URL with safety fallback
                    # Some sites never reach 'networkidle', so we fallback to 'load' after 20s
                    try:
                        await page.goto(url, wait_until="networkidle", timeout=30000)
                    except Exception as e:
                        print(f"Network idle timeout, falling back to basic load: {e}")
                        # If networkidle fails/takes too long, just wait for minimum load
                        await page.goto(url, wait_until="load", timeout=15000)

                    # Wait for images to load (capped at 15s)
                    await self._wait_for_images(page, timeout_ms=15000)

                    # Wait for specific time to allow backend data to load
                    if wait_for > 0:
                        await asyncio.sleep(wait_for / 1000)

                    # Trigger lazy-loaded content by scrolling if it's a full page capture
                    if full_page:
                        await self._smart_scroll(page)
                        # Small pause after scroll to let new items settle
                        await asyncio.sleep(0.5)

                    # Get page title
                    title = await page.title()

                    # Generate PDF
                    # IMPORTANT: page.pdf() re-layouts the page based on width/height, 
                    # ignoring the viewport. For Desktop view, we MUST provide a desktop-width PDF size.
                    pdf_options = {
                        "print_background": include_background,
                        "scale": scale,
                        "landscape": landscape,
                        "margin": {
                            "top": margin_top,
                            "bottom": margin_bottom,
                            "left": margin_left,
                            "right": margin_right,
                        },
                    }

                    if viewport_type == "desktop":
                        # Use desktop dimensions to prevent mobile layout re-triggering during PDF gen
                        if landscape:
                            pdf_options["width"] = "1920px"
                            pdf_options["height"] = "1080px"
                        else:
                            pdf_options["width"] = "1440px"
                            pdf_options["height"] = "2036px" # Maintains A4 aspect ratio 
                        
                        # If not full page, we only take the first "screen"
                        if not full_page:
                            # Capture only first page of these dimensions
                            pdf_options["page_ranges"] = "1"
                    else:
                        pdf_options["format"] = format
                        if not full_page:
                            pdf_options["page_ranges"] = "1"

                    pdf_bytes = await page.pdf(**pdf_options)

                    # COMPRESS PDF - Aggressive optimization
                    pdf_bytes = self._compress_pdf(pdf_bytes)

                    # Count pages
                    pdf_reader = PdfReader(io.BytesIO(pdf_bytes))
                    page_count = len(pdf_reader.pages)

                    return pdf_bytes, page_count, title

                finally:
                    await browser.close()

    def _compress_pdf(self, pdf_bytes: bytes) -> bytes:
        """
        Aggressively compress PDF by:
        1. Optimizing images (resizing and re-compressing as JPEG)
        2. Fixing transparency (compositing over white)
        3. Removing redundant data (garbage collection)
        4. Deflating streams
        """
        try:
            import fitz  # PyMuPDF
            from PIL import Image
            import io
            
            doc = fitz.open("pdf", pdf_bytes)
            processed_xrefs = set() # Track processed images to avoid redundant work
            
            # 1. Optimize images
            for page in doc:
                image_list = page.get_images(full=True)
                for img in image_list:
                    xref = img[0]
                    if xref in processed_xrefs:
                        continue
                    processed_xrefs.add(xref)
                    
                    base_image = doc.extract_image(xref)
                    image_bytes = base_image["image"]
                    
                    # Threshold: 20KB - Aggressive to catch most small bloat
                    if len(image_bytes) > 20 * 1024:
                        try:
                            img_obj = Image.open(io.BytesIO(image_bytes))
                            
                            # A. RESIZE - Downsample huge images
                            max_size = 1600
                            if img_obj.width > max_size or img_obj.height > max_size:
                                ratio = min(max_size / img_obj.width, max_size / img_obj.height)
                                new_size = (int(img_obj.width * ratio), int(img_obj.height * ratio))
                                img_obj = img_obj.resize(new_size, Image.Resampling.LANCZOS)
                            
                            # B. TRANSPARENCY FIX - Robust compositing
                            if img_obj.mode in ("RGBA", "P", "LA"):
                                # Create a white background
                                background = Image.new("RGB", img_obj.size, (255, 255, 255))
                                if img_obj.mode == "P":
                                    img_obj = img_obj.convert("RGBA")
                                
                                # Split and use alpha channel if it exists
                                alpha = img_obj.getchannel("A") if "A" in img_obj.getbands() else None
                                background.paste(img_obj, mask=alpha)
                                img_obj = background
                            elif img_obj.mode != "RGB":
                                img_obj = img_obj.convert("RGB")
                            
                            # C. RE-COMPRESS as JPEG - Quality 65 for significant savings
                            out_buffer = io.BytesIO()
                            img_obj.save(out_buffer, format="JPEG", quality=65, optimize=True)
                            new_image_bytes = out_buffer.getvalue()
                            
                            # Only replace if smaller
                            if len(new_image_bytes) < len(image_bytes):
                                doc.replace_image(xref, stream=new_image_bytes)
                        except Exception as img_err:
                            print(f"Failed to compress image {xref}: {img_err}")
                            continue

            # 2 & 3. Maximum compression on save
            compressed_bytes = doc.tobytes(
                garbage=4, 
                deflate=True, 
                clean=True,
                linear=True,
                pretty=False
            )
            
            doc.close()
            
            # Return smaller one
            if len(compressed_bytes) < len(pdf_bytes):
                return compressed_bytes
            return pdf_bytes
            
        except Exception as e:
            # Fallback to original if compression fails
            print(f"Aggressive compression failed: {e}")
            return pdf_bytes

    async def _wait_for_images(self, page, timeout_ms=15000):
        """Wait for all images (including background-images) on the page to be fully loaded."""
        try:
            # Enhanced JS to check for both <img> tags and background-images
            await page.evaluate(f"""
                async () => {{
                    const images = Array.from(document.querySelectorAll('img'));
                    const allElements = document.querySelectorAll('*');
                    const bgImages = [];
                    allElements.forEach(el => {{
                        const bg = window.getComputedStyle(el).backgroundImage;
                        if (bg && bg !== 'none' && bg.includes('url')) {{
                            const urlMatch = bg.match(/url\\(["']?(.*?)["']?\\)/);
                            if (urlMatch && urlMatch[1]) {{
                                const img = new Image();
                                img.src = urlMatch[1];
                                bgImages.push(img);
                            }}
                        }}
                    }});

                    const allAssets = [...images, ...bgImages];
                    
                    // Promise.race to enforce global timeout within the script
                    const timeoutPromise = new Promise(resolve => setTimeout(resolve, {timeout_ms}));
                    const assetsPromise = Promise.all(allAssets.map(img => {{
                        if (img.complete && (img.naturalWidth > 0 || img.width > 0)) return;
                        return new Promise((resolve) => {{
                            img.addEventListener('load', resolve);
                            img.addEventListener('error', resolve); 
                            setTimeout(resolve, 5000); // 5s individual timeout
                        }});
                    }}));

                    await Promise.race([assetsPromise, timeoutPromise]);
                }}
            """)
        except Exception:
            pass # Best effort

    async def _smart_scroll(self, page):
        """Scroll to the bottom of the page to trigger lazy loading."""
        await page.evaluate("""
            async () => {
                await new Promise((resolve) => {
                    let totalHeight = 0;
                    let distance = 200; // Reduced from 400 for more reliable lazy-load triggers
                    let timer = setInterval(() => {
                        let scrollHeight = document.body.scrollHeight;
                        window.scrollBy(0, distance);
                        totalHeight += distance;

                        // Max scroll limit to prevent infinite loops on some sites
                        if(totalHeight >= scrollHeight || totalHeight > 50000){
                            clearInterval(timer);
                            // Scroll back to top
                            window.scrollTo(0, 0);
                            resolve();
                        }
                    }, 100); // Increased from 50ms to allow more time for triggers
                });
            }
        """)

    def add_watermark(self, pdf_bytes: bytes) -> bytes:
        """Add watermark to PDF for free tier."""
        # Create watermark PDF
        watermark_buffer = io.BytesIO()
        c = canvas.Canvas(watermark_buffer, pagesize=letter)
        c.setFont("Helvetica", 12)
        c.setFillColorRGB(0.7, 0.7, 0.7)  # Light gray
        c.drawString(20, 20, "Generated with Tulz Free - tulz.tools")
        c.save()
        watermark_buffer.seek(0)

        # Read watermark
        watermark_pdf = PdfReader(watermark_buffer)
        watermark_page = watermark_pdf.pages[0]

        # Read original PDF
        original_pdf = PdfReader(io.BytesIO(pdf_bytes))
        output_pdf = PdfWriter()

        # Apply watermark to each page
        for page in original_pdf.pages:
            page.merge_page(watermark_page)
            output_pdf.add_page(page)

        # Write output
        output_buffer = io.BytesIO()
        output_pdf.write(output_buffer)
        output_buffer.seek(0)

        return output_buffer.read()
