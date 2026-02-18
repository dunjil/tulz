
const fs = require('fs');
const path = require('path');

// Manual definition of toolsConfig to avoid import issues in standalone script
const toolsConfig = [
    // PDF Tools
    {
        slug: "pdf-to-word",
        title: "PDF to Word Converter - Free Online | Tulz",
        description: "Convert PDF files to editable Word documents (DOCX) for free. Best quality PDF to Word conversion with original formatting preserved.",
        keywords: ["pdf to word", "convert pdf to docx", "pdf to word converter online", "free pdf converter"],
    },
    {
        slug: "word-to-pdf",
        title: "Word to PDF Converter - Free Online | Tulz",
        description: "Convert Word documents (DOC, DOCX) to PDF format instantly. Free online DOC to PDF converter.",
        keywords: ["word to pdf", "convert doc to pdf", "docx to pdf", "word to pdf converter"],
    },
    {
        slug: "pdf-merge",
        title: "Merge PDF Files - Combine PDFs Online | Tulz",
        description: "Combine multiple PDF files into one document. Free online PDF merger tool. No limits, no signup required.",
        keywords: ["merge pdf", "combine pdf", "join pdf files", "pdf merger online"],
    },
    {
        slug: "pdf-split",
        title: "Split PDF - Extract Pages from PDF | Tulz",
        description: "Split PDF files or extract specific pages online for free. Separate one PDF into multiple files.",
        keywords: ["split pdf", "extract pdf pages", "separate pdf", "pdf splitter"],
    },
    {
        slug: "pdf-compress",
        title: "Compress PDF - Reduce PDF File Size | Tulz",
        description: "Reduce PDF file size online without losing quality. Free PDF compressor to optimize documents for sharing.",
        keywords: ["compress pdf", "reduce pdf size", "optimize pdf", "shrink pdf file"],
    },
    {
        slug: "pdf-to-jpg",
        title: "PDF to JPG Converter - Save PDF as Image | Tulz",
        description: "Convert PDF pages to JPG images. High quality free online PDF to Image converter.",
        keywords: ["pdf to jpg", "pdf to image", "convert pdf to picture", "save pdf as jpg"],
    },
    {
        slug: "jpg-to-pdf",
        title: "JPG to PDF Converter - Convert Images to PDF | Tulz",
        description: "Convert JPG, PNG, and other images to PDF format. Create PDF from photos for free.",
        keywords: ["jpg to pdf", "image to pdf", "photos to pdf", "convert jpg to pdf"],
    },
    {
        slug: "pdf-filler",
        title: "Free PDF Form Filler & Signer | Tulz",
        description: "Fill out PDF forms and sign documents online for free. Edit PDF text, add checkmarks, and signatures.",
        keywords: ["pdf filler", "sign pdf online", "edit pdf", "fill pdf form"],
    },
    {
        slug: "pdf-crop",
        title: "Crop PDF - Trim PDF Margins Online | Tulz",
        description: "Crop PDF pages to remove white margins or resize pages. Free online PDF cropper tool.",
        keywords: ["crop pdf", "trim pdf", "resize pdf pages", "pdf cropper"],
    },
    {
        slug: "pdf-rotate",
        title: "Rotate PDF - Rotate Pages Permanently | Tulz",
        description: "Rotate PDF pages 90, 180, or 270 degrees. Save the rotated PDF permanently.",
        keywords: ["rotate pdf", "turn pdf pages", "change pdf orientation", "fix upside down pdf"],
    },
    {
        slug: "pdf-protect",
        title: "Protect PDF - Encrypt PDF with Password | Tulz",
        description: "Secure your PDF files with a password. specific encryption to protect confidential documents.",
        keywords: ["protect pdf", "encrypt pdf", "password protect pdf", "secure pdf"],
    },
    {
        slug: "pdf-unlock",
        title: "Unlock PDF - Remove PDF Password | Tulz",
        description: "Remove password and restrictions from PDF files. Unlock secured PDFs for free.",
        keywords: ["unlock pdf", "remove pdf password", "decrypt pdf", "open secured pdf"],
    },
    {
        slug: "pdf-page-numbers",
        title: "Add Page Numbers to PDF | Tulz",
        description: "Add page numbers to PDF documents online. Customize position, format, and font.",
        keywords: ["page numbers pdf", "number pdf pages", "add pagination pdf", "pdf numbering"],
    },
    {
        slug: "pdf-add-watermark",
        title: "Add Watermark to PDF | Tulz",
        description: "Add text or image watermark to PDF files. continuous branding or protection for your documents.",
        keywords: ["watermark pdf", "add watermark", "stamp pdf", "branding pdf"],
    },
    {
        slug: "pdf-remove-watermark",
        title: "Remove Watermark from PDF | Tulz",
        description: "Attempt to remove watermarks from PDF files. Free AI-powered watermark removal tool.",
        keywords: ["remove pdf watermark", "clean pdf", "delete watermark pdf", "pdf cleaner"],
    },
    {
        slug: "pdf-organize",
        title: "Organize PDF Pages - Reorder & Delete | Tulz",
        description: "Rearrange, sort, and delete PDF pages. Organize your PDF document structure for free.",
        keywords: ["organize pdf", "reorder pdf pages", "delete pdf pages", "sort pdf"],
    },
    {
        slug: "webpdf",
        title: "Website to PDF Converter | Tulz",
        description: "Convert any webpage to PDF. Save articles, blogs, and websites as PDF documents.",
        keywords: ["web to pdf", "url to pdf", "save website as pdf", "html to pdf"],
    },
    {
        slug: "html-to-pdf",
        title: "HTML to PDF Converter | Tulz",
        description: "Convert HTML code or files to high-quality PDF. Support for CSS and layout accuracy.",
        keywords: ["html to pdf", "convert html to pdf", "render html as pdf", "webpage to pdf"],
    },
    {
        slug: "excel-to-pdf",
        title: "Excel to PDF Converter | Tulz",
        description: "Convert Excel spreadsheets (XLS, XLSX) to PDF format. Keep formatting and tables intact.",
        keywords: ["excel to pdf", "convert xls to pdf", "xlsx to pdf", "spreadsheet to pdf"],
    },
    {
        slug: "powerpoint-to-pdf",
        title: "PowerPoint to PDF Converter | Tulz",
        description: "Convert PowerPoint presentations (PPT, PPTX) to PDF. Save slides as PDF documents.",
        keywords: ["ppt to pdf", "powerpoint to pdf", "convert pptx to pdf", "presentation to pdf"],
    },

    // Image Tools
    {
        slug: "image-compress",
        title: "Image Compressor - Reduce Image Size | Tulz",
        description: "Compress JPG, PNG, and WebP images. Reduce file size by up to 80% without visible quality loss.",
        keywords: ["compress image", "reduce photo size", "optimize image", "compress jpeg"],
    },
    {
        slug: "image-resize",
        title: "Resize Image - Change Dimensions Online | Tulz",
        description: "Resize images by pixels or percentage. Change dimensions of JPG, PNG, GIF files for free.",
        keywords: ["resize image", "change image size", "scale photo", "picture resizer"],
    },
    {
        slug: "image-crop",
        title: "Crop Image Online - Free Photo Cropper | Tulz",
        description: "Crop pictures to custom aspect ratios. Cut out parts of photos easily.",
        keywords: ["crop image", "cut photo", "picture cropper", "trim image"],
    },
    {
        slug: "image-convert",
        title: "Image Converter - Change Image Format | Tulz",
        description: "Convert images between JPG, PNG, WebP, GIF, and BMP formats. Bulk image conversion supported.",
        keywords: ["image converter", "convert image format", "jpg to png", "png to jpg"],
    },
    {
        slug: "image-background-remover",
        title: "Remove Background from Image | Tulz",
        description: "Automatically remove image backgrounds with AI. Create transparent PNGs instantly.",
        keywords: ["remove background", "transparent background", "bg remover", "erase background"],
    },
    {
        slug: "image-watermark",
        title: "Watermark Image - Add Logo or Text | Tulz",
        description: "Add custom watermarks to your photos. Protect your work with text or logo stamps.",
        keywords: ["watermark image", "add logo to photo", "stamp image", "photo copyright"],
    },
    {
        slug: "image-rotate",
        title: "Rotate Image Online | Tulz",
        description: "Rotate photos 90 degrees or arbitrary angles. Flip images horizontally or vertically.",
        keywords: ["rotate image", "flip photo", "turn picture", "image orientation"],
    },
    {
        slug: "image-to-kb",
        title: "Compress Image to Exact Size (KB/MB) | Tulz",
        description: "Compress images to a specific file size in KB or MB. Perfect for passport photos and application forms.",
        keywords: ["compress to size", "image to 50kb", "reduce to kb", "target file size"],
    },
    {
        slug: "heic-to-jpg",
        title: "HEIC to JPG Converter | Tulz",
        description: "Convert iPhone HEIC photos to JPG format. Batch convert HEIC images to widespread formats.",
        keywords: ["heic to jpg", "convert iphone photo", "heic converter", "heic to png"],
    },
    {
        slug: "webp-converter",
        title: "WebP Converter - WebP to JPG/PNG | Tulz",
        description: "Convert WebP images to JPG or PNG, or convert images to WebP for web optimization.",
        keywords: ["webp converter", "webp to jpg", "jpg to webp", "webp to png"],
    },
    {
        slug: "webp-to-jpg",
        title: "WebP to JPG Converter | Tulz",
        description: "Convert WebP images to standard JPG format. Fix compatibility issues with WebP files.",
        keywords: ["webp to jpg", "convert webp", "change webp to jpg", "webp2jpg"],
    },
    {
        slug: "webp-to-png",
        title: "WebP to PNG Converter | Tulz",
        description: "Convert WebP strings to transparent PNG images. Keep transparency when converting from WebP.",
        keywords: ["webp to png", "convert webp to png", "transparent png from webp"],
    },
    {
        slug: "jpg-to-png",
        title: "JPG to PNG Converter | Tulz",
        description: "Convert JPG images to PNG format.",
        keywords: ["jpg to png", "convert jpg", "jpeg to png"],
    },
    {
        slug: "png-to-jpg",
        title: "PNG to JPG Converter | Tulz",
        description: "Convert PNG images to JPG format. Flatten transparent backgrounds to white.",
        keywords: ["png to jpg", "convert png", "png to jpeg"],
    },

    // Social Media Tools
    {
        slug: "instagram-resizer",
        title: "Instagram Photo Resizer | Tulz",
        description: "Resize photos for Instagram posts, stories, and profile pictures. Correct aspect ratios for IG.",
        keywords: ["instagram resizer", "resize for instagram", "ig photo size", "insta crop"],
    },
    {
        slug: "linkedin-banner-resizer",
        title: "LinkedIn Banner Resizer | Tulz",
        description: "Create perfectly sized LinkedIn profile banners and cover photos. Professional resizing tool.",
        keywords: ["linkedin banner", "resize linkedin cover", "linkedin header size", "linkedin background"],
    },
    {
        slug: "twitter-header-resizer",
        title: "Twitter Header Resizer | Tulz",
        description: "Resize images for Twitter headers and profile pictures. Optimize your X/Twitter profile.",
        keywords: ["twitter header", "twitter banner size", "x header resize", "twitter cover"],
    },
    {
        slug: "whatsapp-dp-resizer",
        title: "WhatsApp Profile Picture Resizer | Tulz",
        description: "Resize photos to fit WhatsApp profile picture (DP) circle perfectly without cropping.",
        keywords: ["whatsapp dp", "whatsapp profile pic", "resize for whatsapp", "whatsapp image size"],
    },

    // Dev & Text Tools
    {
        slug: "json",
        title: "JSON Formatter & Validator | Tulz",
        description: "Format, validate, and minify JSON data. View JSON in a tree view and fix errors.",
        keywords: ["json formatter", "json validator", "prettify json", "json lint"],
    },
    {
        slug: "diff",
        title: "Text Diff Checker - Compare Text | Tulz",
        description: "Compare two text files or blocks to find differences. Highlight changes, additions, and deletions.",
        keywords: ["diff checker", "compare text", "text difference", "file compare"],
    },
    {
        slug: "qrcode",
        title: "QR Code Generator - Free & Custom | Tulz",
        description: "Create custom QR codes for URLs, WiFi, Text, vCards. Add colors and logos to your QR codes.",
        keywords: ["qr code generator", "create qr code", "custom qr code", "free qr maker"],
    },
    {
        slug: "markdown",
        title: "Markdown Editor & Preview | Tulz",
        description: "Online Markdown editor with real-time preview. Convert Markdown to HTML or PDF.",
        keywords: ["markdown editor", "online markdown", "md preview", "markdown to html"],
    },

    // Financial & Business
    {
        slug: "invoice",
        title: "Free Invoice Generator | Tulz",
        description: "Create professional PDF invoices online for free. No unlimited invoices, no watermarks.",
        keywords: ["invoice generator", "make invoice", "free invoice template", "create bill"],
    },
    {
        slug: "cv",
        title: "Resume & CV Builder | Tulz",
        description: "Build a professional resume or CV online. Free templates to export as PDF.",
        keywords: ["cv builder", "resume maker", "create cv", "free resume builder"],
    },
    {
        slug: "calculator",
        title: "Scientific Calculator Online | Tulz",
        description: "Advanced scientific calculator with history and functions. Calculate advanced math online.",
        keywords: ["scientific calculator", "online calculator", "math calculator", "free calculator"],
    },
    {
        slug: "credit-card",
        title: "Credit Card Validator & Generator (Test) | Tulz",
        description: "Validate credit card numbers (Luhn algorithm) and generate test card numbers for development.",
        keywords: ["credit card validator", "test card generator", "luhn check", "cc checker"],
    },

    // Other
    {
        slug: "ocr",
        title: "OCR - Image to Text Converter | Tulz",
        description: "Extract text from images using AI. Convert scanned documents and photos to editable text.",
        keywords: ["ocr online", "image to text", "extract text", "photo to text"],
    },
    {
        slug: "favicon",
        title: "Favicon Generator | Tulz",
        description: "Generate favicons from text, emoji, or images. Native ICO support for websites.",
        keywords: ["favicon generator", "create favicon", "ico generator", "site icon"],
    },
    {
        slug: "excel",
        title: "Excel Viewer & Editor Online | Tulz",
        description: "View and edit Excel files online. Simple spreadsheet editor for XLSX and CSV files.",
        keywords: ["excel viewer", "open excel online", "edit xlsx", "spreadsheet editor"],
    },
];

// Base path for tool pages
const BASE_PATH = path.join(process.cwd(), 'src/app/dashboard/tools');

function generateLayouts() {
    console.log('Generating layout.tsx files for tools...');
    let count = 0;

    for (const tool of toolsConfig) {
        const toolDir = path.join(BASE_PATH, tool.slug);

        // Create directory if it doesn't exist
        if (!fs.existsSync(toolDir)) {
            console.log(`Creating directory for tool: ${tool.slug}`);
            fs.mkdirSync(toolDir, { recursive: true });
        }

        const layoutPath = path.join(toolDir, 'layout.tsx');

        // Content for the layout.tsx file
        // Content for the layout.tsx file
        const layoutContent = `import { type Metadata } from "next";
import { getToolConfig } from "@/config/tools";
import { StructuredData } from "@/components/shared/structured-data";
import { GoogleAdBanner } from "@/components/shared/google-ad";
import { ShareButtons } from "@/components/shared/share-buttons";

const tool = getToolConfig("${tool.slug}");

export const metadata: Metadata = {
  title: tool?.title || "Tulz - Free Online Tools",
  description: tool?.description || "Free online productivity tools.",
  keywords: tool?.keywords || [],
  openGraph: {
    title: tool?.title || "Tulz - Free Online Tools",
    description: tool?.description || "Free online productivity tools.",
    type: "website",
    url: \`https://tulz.tools/dashboard/tools/${tool.slug}\`,
  },
  twitter: {
    title: tool?.title || "Tulz - Free Online Tools",
    description: tool?.description || "Free online productivity tools.",
    card: "summary_large_image",
  },
};

export default function ToolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {tool && <StructuredData tool={tool} />}
      <div className="mb-8">
        <GoogleAdBanner />
      </div>
      {children}
      <div className="mt-12">
        <ShareButtons title={tool?.title} description={tool?.description} />
      </div>
    </>
  );
}
`;

        // Write file
        try {
            fs.writeFileSync(layoutPath, layoutContent);
            console.log(`✓ Created layout for: ${tool.slug}`);
            count++;
        } catch (error) {
            console.error(`Error writing layout for ${tool.slug}:`, error);
        }
    }

    console.log(`\\nDuplicate content fix complete! Generated ${count} layouts.`);
}

generateLayouts();
