"use client";

import { useState } from "react";
import { Heart, X, Coffee, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SupportBannerProps {
    toolName?: string;
    onDismiss?: () => void;
}

const SITE_URL = "https://tulz.tools";

/** Human-readable name from a slug */
function slugToName(slug: string): string {
    const MAP: Record<string, string> = {
        "pdf-merge": "PDF Merger", "pdf-split": "PDF Splitter", "pdf-compress": "PDF Compressor",
        "pdf-to-word": "PDF to Word", "word-to-pdf": "Word to PDF", "pdf-filler": "PDF Filler",
        "pdf-rotate": "PDF Rotator", "pdf-crop": "PDF Cropper", "pdf-protect": "PDF Protector",
        "pdf-unlock": "PDF Unlocker", "pdf-page-numbers": "Page Numbers tool",
        "pdf-add-watermark": "Watermark tool", "pdf-remove-watermark": "Watermark Remover",
        "pdf-organize": "PDF Organizer", "pdf-to-jpg": "PDF to JPG", "jpg-to-pdf": "JPG to PDF",
        "excel-to-pdf": "Excel to PDF", "powerpoint-to-pdf": "PowerPoint to PDF",
        "pdf-to-excel": "PDF to Excel", "pdf-to-powerpoint": "PDF to PowerPoint",
        "webpdf": "Website to PDF", "html-to-pdf": "HTML to PDF",
        "image-compress": "Image Compressor", "image-resize": "Image Resizer",
        "image-crop": "Image Cropper", "image-convert": "Image Converter",
        "image-background-remover": "Background Remover", "image-watermark": "Image Watermark",
        "image-rotate": "Image Rotator", "image-to-kb": "Image to KB",
        "heic-to-jpg": "HEIC Converter", "webp-converter": "WebP Converter",
        "webp-to-jpg": "WebP to JPG", "webp-to-png": "WebP to PNG",
        "jpg-to-png": "JPG to PNG", "png-to-jpg": "PNG to JPG",
        "instagram-resizer": "Instagram Resizer", "linkedin-banner-resizer": "LinkedIn Banner tool",
        "twitter-header-resizer": "X/Twitter Header Resizer", "whatsapp-dp-resizer": "WhatsApp DP Resizer",
        "json": "JSON Formatter", "diff": "Text Diff tool", "qrcode": "QR Code Generator",
        "markdown": "Markdown Editor", "invoice": "Invoice Generator", "cv": "CV Builder",
        "calculator": "Calculator", "credit-card": "Credit Card Validator",
        "favicon": "Favicon Generator", "excel": "Excel Viewer",
        "dwg-to-pdf": "DWG to PDF", "pdf-to-dwg": "PDF to DWG",
    };
    return MAP[slug] || slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Custom share text for every tool */
function getShareText(slug: string): string {
    const MESSAGES: Record<string, string> = {
        // PDF tools
        "pdf-merge": "Just merged multiple PDFs into one in seconds using Tulz — free, no signup required.",
        "pdf-split": "Just split a PDF into separate pages instantly using Tulz — no login needed.",
        "pdf-compress": "Compressed my PDF from MB to KB without losing quality using Tulz. Completely free.",
        "pdf-to-word": "Converted a PDF to an editable Word document using Tulz — free and accurate.",
        "word-to-pdf": "Converted my Word document to PDF in seconds using Tulz — free online tool.",
        "pdf-filler": "Filled and signed a PDF form online for free using Tulz. No Adobe Acrobat needed.",
        "pdf-to-jpg": "Extracted high-quality JPG images from a PDF using Tulz — fast and free.",
        "jpg-to-pdf": "Converted multiple JPG images to a single PDF using Tulz. Free and easy.",
        "pdf-crop": "Cropped pages in my PDF to the exact size I needed using Tulz — free online.",
        "pdf-rotate": "Fixed rotated PDF pages in seconds using Tulz — no software needed.",
        "pdf-protect": "Password-protected my PDF document for free using Tulz. Secure and simple.",
        "pdf-unlock": "Removed the password from a PDF file using Tulz — free and instant.",
        "pdf-page-numbers": "Added professional page numbers to my PDF using Tulz — free with full control over placement.",
        "pdf-add-watermark": "Added a custom watermark to my PDF using Tulz — free and professional.",
        "pdf-remove-watermark": "Removed watermarks from a PDF using Tulz — free online tool.",
        "pdf-organize": "Reordered, deleted, and rearranged PDF pages using Tulz — free drag-and-drop editor.",
        "webpdf": "Converted an entire website to a clean PDF using Tulz — free tool that actually works.",
        "html-to-pdf": "Rendered HTML to a pixel-perfect PDF using Tulz — free and accurate.",
        "excel-to-pdf": "Converted my Excel spreadsheet to PDF with all formatting intact using Tulz — free.",
        "powerpoint-to-pdf": "Converted my PowerPoint presentation to PDF in seconds using Tulz — free.",
        "pdf-to-excel": "Extracted tables from a PDF into an editable Excel file using Tulz — free.",
        "pdf-to-powerpoint": "Converted a PDF back into an editable PowerPoint presentation using Tulz — free.",
        "dwg-to-pdf": "Converted a DWG/CAD file to PDF using Tulz — free online, no AutoCAD needed.",
        "pdf-to-dwg": "Converted a PDF back to an editable DWG/CAD file using Tulz — free online.",

        // Image tools
        "image-compress": "Compressed images by up to 80% without visible quality loss using Tulz. Completely free.",
        "image-resize": "Resized my images to exact pixel dimensions using Tulz — free and instant.",
        "image-crop": "Cropped images to the exact size I needed using Tulz — free online tool.",
        "image-convert": "Converted images between formats (JPG, PNG, WebP, etc.) using Tulz — free.",
        "image-background-remover": "Removed the background from an image in seconds using Tulz AI — free and surprisingly accurate.",
        "image-watermark": "Added a custom text or image watermark to photos using Tulz — free.",
        "image-rotate": "Rotated and flipped images online for free using Tulz — no software needed.",
        "image-to-kb": "Got my photo to the exact file size in KB using Tulz — perfect for passport photos and online forms.",
        "heic-to-jpg": "Converted iPhone HEIC photos to JPG format instantly using Tulz — free batch conversion.",
        "webp-converter": "Converted images to and from WebP format using Tulz — free online tool.",
        "webp-to-jpg": "Converted WebP images to JPG using Tulz — free and instant.",
        "webp-to-png": "Converted WebP images to PNG with transparency preserved using Tulz — free.",
        "jpg-to-png": "Converted JPG images to PNG format using Tulz — free, no quality loss.",
        "png-to-jpg": "Converted PNG images to JPG and reduced file size using Tulz — free.",

        // Social media resizers
        "instagram-resizer": "Resized my photos to the correct Instagram dimensions using Tulz — feed, stories, and reels all covered. Free.",
        "linkedin-banner-resizer": "Created a perfectly sized LinkedIn profile banner using Tulz — professional result, completely free.",
        "twitter-header-resizer": "Resized my X/Twitter header image to the exact right dimensions using Tulz — free.",
        "whatsapp-dp-resizer": "Got a perfectly sized WhatsApp profile picture using Tulz — free, cropped square instantly.",

        // Dev/productivity tools
        "json": "Formatted, validated, and explored complex JSON with an interactive tree view using Tulz — free developer tool.",
        "diff": "Compared two text files and highlighted every difference using Tulz — free text diff tool.",
        "qrcode": "Generated a custom QR code for free using Tulz — works for links, text, contacts, and more.",
        "markdown": "Wrote Markdown with a live preview and exported it to PDF using Tulz — free tool.",
        "invoice": "Created and downloaded a professional PDF invoice in minutes using Tulz — free, no watermark.",
        "cv": "Built my professional CV/resume and downloaded it as a PDF using Tulz — completely free.",
        "calculator": "Used the handy online calculator on Tulz — free and simple.",
        "credit-card": "Validated a credit card number instantly using Tulz — free Luhn check tool.",
        "favicon": "Generated a favicon from an image in seconds using Tulz — free ICO and PNG download.",
        "excel": "Viewed and edited an Excel spreadsheet online for free using Tulz — no Microsoft Office needed.",
    };
    return MESSAGES[slug] || `Just used the ${slugToName(slug)} on Tulz — free online tools that actually work.`;
}

function buildShareUrl(platform: string, text: string): string {
    const encoded = encodeURIComponent(text + " " + SITE_URL);
    const encodedUrl = encodeURIComponent(SITE_URL);
    const encodedText = encodeURIComponent(text);
    switch (platform) {
        case "x": return `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
        case "linkedin": return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        case "facebook": return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        case "whatsapp": return `https://wa.me/?text=${encoded}`;
        default: return "";
    }
}

const PLATFORMS = [
    { id: "x", label: "X", bg: "bg-black hover:bg-gray-800 text-white" },
    { id: "whatsapp", label: "WhatsApp", bg: "bg-[#25D366] hover:bg-[#1ebe5d] text-white" },
    { id: "linkedin", label: "LinkedIn", bg: "bg-[#0077B5] hover:bg-[#005f91] text-white" },
    { id: "facebook", label: "Facebook", bg: "bg-[#1877F2] hover:bg-[#1668d3] text-white" },
];

export function SupportBanner({ toolName = "Tulz", onDismiss }: SupportBannerProps) {
    const [dismissed, setDismissed] = useState(false);
    const [copied, setCopied] = useState(false);

    if (dismissed) return null;

    const handleDismiss = () => {
        setDismissed(true);
        onDismiss?.();
    };

    const shareText = getShareText(toolName);
    const displayName = slugToName(toolName);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(SITE_URL);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative rounded-xl border border-pink-200 dark:border-pink-900/50 bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-950/30 dark:to-rose-950/30 p-4">
            <button
                onClick={handleDismiss}
                className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Dismiss"
            >
                <X className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-3 pr-6">
                <div className="shrink-0 p-2 rounded-lg bg-pink-100 dark:bg-pink-900/40">
                    <Heart className="h-4 w-4 text-pink-500 fill-pink-500" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                        The <span className="text-primary">{displayName}</span> just saved you some time!
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Share with your network — it takes 5 seconds and helps others discover free tools.
                    </p>

                    {/* Platform share buttons */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                        {PLATFORMS.map(({ id, label, bg }) => (
                            <button
                                key={id}
                                onClick={() => window.open(buildShareUrl(id, shareText), "_blank", "noopener,noreferrer")}
                                className={`h-7 px-2.5 rounded text-[11px] font-semibold transition-colors ${bg}`}
                            >
                                {label}
                            </button>
                        ))}
                        {/* Copy link — covers Instagram + anywhere without a direct web share URL */}
                        <button
                            onClick={handleCopy}
                            className="h-7 px-2.5 rounded text-[11px] font-semibold transition-colors bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center gap-1"
                        >
                            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            {copied ? "Copied!" : "Copy link"}
                        </button>
                    </div>

                    {/* Ko-fi */}
                    <div className="mt-2.5">
                        <Button
                            size="sm"
                            className="h-8 text-xs bg-gradient-to-r from-orange-400 to-pink-500 hover:from-orange-500 hover:to-pink-600 text-white border-0"
                            onClick={() => window.open("https://ko-fi.com/tulzhub", "_blank", "noopener,noreferrer")}
                        >
                            <Coffee className="h-3 w-3 mr-1.5" />
                            Buy us a coffee
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
