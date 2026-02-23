"use client";

import { useState } from "react";
import { Heart, X, Coffee, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconX, IconWhatsApp, IconLinkedIn, IconFacebook } from "@/components/shared/icons/social-icons";
import { cn } from "@/lib/utils";
interface SupportBannerProps {
    toolName?: string;
    onDismiss?: () => void;
}

const SITE_URL = "https://tulz.tools";

function getToolUrl(slug: string): string {
    if (!slug || slug === "Tulz") return SITE_URL;
    return `${SITE_URL}/tools/${slug}`;
}

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

function buildShareUrl(platform: string, text: string, toolSlug: string): string {
    const toolUrl = getToolUrl(toolSlug);
    const encoded = encodeURIComponent(text + "\n\n" + toolUrl);
    const encodedUrl = encodeURIComponent(toolUrl);
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
    { id: "x", label: "X", icon: IconX, bg: "bg-black hover:bg-gray-800 text-white" },
    { id: "whatsapp", label: "WhatsApp", icon: IconWhatsApp, bg: "bg-[#25D366] hover:bg-[#1ebe5d] text-white" },
    { id: "linkedin", label: "LinkedIn", icon: IconLinkedIn, bg: "bg-[#0077B5] hover:bg-[#005f91] text-white" },
    { id: "facebook", label: "Facebook", icon: IconFacebook, bg: "bg-[#1877F2] hover:bg-[#1668d3] text-white" },
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
        const toolUrl = getToolUrl(toolName);
        await navigator.clipboard.writeText(toolUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative overflow-hidden rounded-2xl border bg-background text-card-foreground shadow-2xl">
            {/* Background elements for flair */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

            <button
                onClick={handleDismiss}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground transition-colors z-50"
                aria-label="Dismiss"
            >
                <X className="h-4 w-4" />
            </button>

            <div className="p-6 sm:p-8 flex flex-col items-center text-center relative z-10">
                <div className="w-14 h-14 flex items-center justify-center rounded-2xl bg-gradient-to-br from-pink-100 to-rose-100 dark:from-pink-900/40 dark:to-rose-900/40 border border-pink-200 dark:border-pink-800 shadow-sm mb-5">
                    <Heart className="h-7 w-7 text-pink-500 fill-pink-500 animate-pulse" />
                </div>

                <h3 className="text-xl sm:text-2xl font-bold mb-2">
                    The <span className="text-primary">{displayName}</span> just saved you some time!
                </h3>

                <p className="text-sm text-muted-foreground mb-6 max-w-[90%]">
                    Share with your network — it takes seconds and helps others discover free tools.
                </p>

                <div className="w-full grid grid-cols-2 gap-3 mb-6">
                    {PLATFORMS.map(({ id, label, icon: Icon, bg }) => (
                        <button
                            key={id}
                            onClick={() => window.open(buildShareUrl(id, shareText, toolName), "_blank", "noopener,noreferrer")}
                            className={cn(
                                "flex items-center justify-center gap-2.5 h-11 px-4 rounded-xl font-semibold transition-transform hover:scale-[1.02] active:scale-95 shadow-sm",
                                bg
                            )}
                        >
                            <Icon className="w-5 h-5 shrink-0" />
                            <span className="text-[13px] sm:text-sm">{label}</span>
                        </button>
                    ))}
                </div>

                <div className="w-full flex flex-col gap-4">
                    <button
                        onClick={handleCopy}
                        className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium transition-colors border border-border/50"
                    >
                        {copied ? (
                            <>
                                <Check className="h-4 w-4" /> Copied!
                            </>
                        ) : (
                            <>
                                <Copy className="h-4 w-4" /> Copy link
                            </>
                        )}
                    </button>

                    <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-muted"></div>
                        <span className="shrink-0 px-3 text-xs text-muted-foreground font-medium uppercase tracking-wider">
                            Or support us
                        </span>
                        <div className="flex-grow border-t border-muted"></div>
                    </div>

                    <Button
                        size="lg"
                        className="w-full h-12 text-base font-bold bg-gradient-to-r from-[#FF5E5B] to-[#ff4f4c] hover:opacity-90 text-white shadow-lg shadow-red-500/25 transition-transform hover:-translate-y-0.5 rounded-xl border border-[#ff4f4c]/50"
                        onClick={() => window.open("https://ko-fi.com/tulzhub", "_blank", "noopener,noreferrer")}
                    >
                        <Coffee className="h-5 w-5 mr-2" />
                        Buy us a coffee
                    </Button>
                </div>
            </div>
        </div>
    );
}
