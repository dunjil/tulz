"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import {
  WebsiteStructuredData,
  OrganizationStructuredData,
  FAQStructuredData,
  ToolsCollectionStructuredData,
} from "@/components/seo/structured-data";
import {
  QrCode,
  Calculator,
  Image as ImageIcon,
  FileText,
  Table,
  Zap,
  Shield,
  Globe,
  Braces,
  FileDown,
  GitCompare,
  Receipt,
  Palette,
  CreditCard,
  PenTool,
  CheckCircle2,
  Scissors,
  Merge,
  Minimize2,
  FileOutput,
  Droplets,
  RotateCw,
  Lock,
  Unlock,
  Type,
  Hash,
  FolderTree,
  Crop,
  Sheet,
  Presentation,
  Maximize,
  Smartphone,
  Eraser,
  Target,
  ImageMinus,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";

const tools = [
  {
    name: "QR Code Generator",
    description: "Create QR codes for URLs, WiFi, vCards, and more. Customize colors, add logos, download PNG/SVG.",
    features: ["URLs", "WiFi", "vCards", "Custom colors"],
    icon: QrCode,
    href: "/dashboard/tools/qrcode",
    gradient: "from-blue-500 to-indigo-600",
    free: true,
    category: "Generator",
  },
  {
    name: "Scientific Calculator",
    description: "Free online calculator with scientific functions, loan/EMI calculator, and unit converter. No signup needed.",
    features: ["Scientific", "Loan/EMI", "Unit converter"],
    icon: Calculator,
    href: "/dashboard/tools/calculator",
    gradient: "from-emerald-500 to-teal-600",
    free: true,
    category: "Utility",
  },
  {
    name: "Image Editor (All-in-One)",
    description: "Remove backgrounds with AI, resize, crop, and convert images between PNG, JPG, WebP formats online.",
    features: ["AI Background Removal", "Resize", "Format convert"],
    icon: ImageIcon,
    href: "/dashboard/tools/image",
    gradient: "from-violet-500 to-purple-600",
    free: true,
    category: "Image",
  },
  {
    name: "Image Compressor",
    description: "Compress images (PNG, JPG, WebP) to reduce file size while maintaining quality.",
    features: ["Reduce size", "Maintain quality", "Bulk upload"],
    icon: Minimize2,
    href: "/dashboard/tools/image-compress",
    gradient: "from-blue-500 to-cyan-500",
    free: true,
    category: "Image",
  },
  {
    name: "Image Resizer",
    description: "Resize images by dimensions or percentage. Presets for social media and more.",
    features: ["Custom dimensions", "Percentage", "Lock aspect ratio"],
    icon: Maximize,
    href: "/dashboard/tools/image-resize",
    gradient: "from-indigo-500 to-blue-600",
    free: true,
    category: "Image",
  },
  {
    name: "Image Converter",
    description: "Convert images between formats: PNG to JPG, JPG to WebP, HEIC to JPG, and more.",
    features: ["PNG", "JPG", "WebP", "HEIC"],
    icon: FileOutput,
    href: "/dashboard/tools/image-convert",
    gradient: "from-orange-500 to-red-500",
    free: true,
    category: "Image",
  },
  {
    name: "Image Cropper",
    description: "Crop images to remove unwanted areas or specific aspect ratios (1:1, 16:9, etc.).",
    features: ["Custom crop", "Aspect ratios", "Trim"],
    icon: Crop,
    href: "/dashboard/tools/image-crop",
    gradient: "from-green-500 to-emerald-600",
    free: true,
    category: "Image",
  },
  {
    name: "Background Remover",
    description: "Automatically remove backgrounds from images using AI. Download as transparent PNG.",
    features: ["AI powered", "Transparent PNG", "Instant"],
    icon: Eraser,
    href: "/dashboard/tools/image-background-remover",
    gradient: "from-pink-500 to-rose-500",
    free: true,
    category: "Image",
  },
  {
    name: "Image Rotator",
    description: "Rotate images 90°, 180°, or custom angles. Flip images horizontally or vertically.",
    features: ["Rotate", "Flip", "Custom angle"],
    icon: RotateCw,
    href: "/dashboard/tools/image-rotate",
    gradient: "from-cyan-500 to-blue-500",
    free: true,
    category: "Image",
  },
  {
    name: "Image to KB",
    description: "Resize/Compress images to a specific target size (e.g., 20KB, 50KB, 100KB) for portals.",
    features: ["Target size", "Passport photo", "Application forms"],
    icon: Target,
    href: "/dashboard/tools/image-to-kb",
    gradient: "from-purple-500 to-indigo-500",
    free: true,
    category: "Image",
  },
  {
    name: "Add Watermark",
    description: "Add text or logo watermarks to your images. Customize opacity, position, and size.",
    features: ["Text/Logo", "Opacity", "Batch processing"],
    icon: Droplets,
    href: "/dashboard/tools/image-watermark",
    gradient: "from-teal-500 to-cyan-600",
    free: true,
    category: "Image",
  },
  {
    name: "WebP Converter",
    description: "Convert images to WebP format for better web performance and SEO.",
    features: ["To WebP", "Better compression", "Faster loading"],
    icon: Globe,
    href: "/dashboard/tools/webp-converter",
    gradient: "from-emerald-400 to-green-500",
    free: true,
    category: "Image",
  },
  {
    name: "WebP to PNG",
    description: "Convert WebP images to high-quality PNG format with transparency support.",
    features: ["WebP to PNG", "Transparency", "High quality"],
    icon: ImageMinus, // Placeholder or reuse
    href: "/dashboard/tools/webp-to-png",
    gradient: "from-sky-500 to-blue-500",
    free: true,
    category: "Image",
  },
  {
    name: "WebP to JPG",
    description: "Convert WebP images to widely supported JPG format.",
    features: ["WebP to JPG", "Universal format", "Fast"],
    icon: ImageIcon,
    href: "/dashboard/tools/webp-to-jpg",
    gradient: "from-amber-500 to-orange-500",
    free: true,
    category: "Image",
  },
  {
    name: "PNG to JPG",
    description: "Convert PNG images to JPG format for smaller file sizes.",
    features: ["PNG to JPG", "Reduce size", "Background color"],
    icon: ImageIcon,
    href: "/dashboard/tools/png-to-jpg",
    gradient: "from-red-400 to-orange-500",
    free: true,
    category: "Image",
  },
  {
    name: "JPG to PNG",
    description: "Convert JPG images to PNG format. Useful for further editing.",
    features: ["JPG to PNG", "Lossless", "High quality"],
    icon: ImageIcon,
    href: "/dashboard/tools/jpg-to-png",
    gradient: "from-blue-400 to-indigo-500",
    free: true,
    category: "Image",
  },
  {
    name: "HEIC to JPG",
    description: "Convert iPhone HEIC photos to standard JPG format compatible with all devices.",
    features: ["iPhone photos", "Batch convert", "Compatible"],
    icon: Smartphone,
    href: "/dashboard/tools/heic-to-jpg",
    gradient: "from-slate-500 to-gray-600",
    free: true,
    category: "Image",
  },
  {
    name: "Instagram Resizer",
    description: "Resize images for Instagram Posts (Square), Stories, and Reels.",
    features: ["Square", "Story", "Reel"],
    icon: Smartphone,
    href: "/dashboard/tools/instagram-resizer",
    gradient: "from-pink-500 via-red-500 to-yellow-500",
    free: true,
    category: "Image",
  },
  {
    name: "WhatsApp DP Resizer",
    description: "Resize profile pictures for WhatsApp (Square 500x500).",
    features: ["Profile Pic", "Square", "Optimized"],
    icon: Smartphone,
    href: "/dashboard/tools/whatsapp-dp-resizer",
    gradient: "from-green-400 to-emerald-600",
    free: true,
    category: "Image",
  },
  {
    name: "Twitter Header Resizer",
    description: "Create perfectly sized headers and banners for Twitter/X profiles.",
    features: ["Header", "Banner", "Profile"],
    icon: Smartphone,
    href: "/dashboard/tools/twitter-header-resizer",
    gradient: "from-sky-400 to-blue-500",
    free: true,
    category: "Image",
  },
  {
    name: "LinkedIn Banner Resizer",
    description: "Resize images for professional LinkedIn banners and cover photos.",
    features: ["Banner", "Cover", "Professional"],
    icon: Smartphone,
    href: "/dashboard/tools/linkedin-banner-resizer",
    gradient: "from-blue-600 to-indigo-700",
    free: true,
    category: "Image",
  },
  {
    name: "Split PDF",
    description: "Extract pages or split PDF into multiple files. Choose specific ranges or split by page count.",
    features: ["Page ranges", "Split evenly", "Extract single pages"],
    icon: Scissors,
    href: "/dashboard/tools/pdf-split",
    gradient: "from-blue-500 to-cyan-500",
    free: true,
    category: "PDF",
  },
  {
    name: "Merge PDFs",
    description: "Combine multiple PDF files into one. Drag to reorder pages before merging.",
    features: ["Multiple files", "Reorder pages", "Fast merge"],
    icon: Merge,
    href: "/dashboard/tools/pdf-merge",
    gradient: "from-purple-500 to-pink-500",
    free: true,
    category: "PDF",
  },
  {
    name: "Compress PDF",
    description: "Reduce PDF file size with adjustable compression levels. Maintain quality while saving space.",
    features: ["Low/Medium/High", "Preserve quality", "Batch compress"],
    icon: Minimize2,
    href: "/dashboard/tools/pdf-compress",
    gradient: "from-green-500 to-emerald-500",
    free: true,
    category: "PDF",
  },
  {
    name: "PDF to Word",
    description: "Convert PDF to editable Word documents (DOCX). Preserves formatting and layout.",
    features: ["Editable DOCX", "Keep formatting", "Fast conversion"],
    icon: FileOutput,
    href: "/dashboard/tools/pdf-to-word",
    gradient: "from-orange-500 to-amber-500",
    free: true,
    category: "PDF",
  },
  {
    name: "Remove Watermark",
    description: "Remove text watermarks, annotations, and small images from PDFs automatically.",
    features: ["Text removal", "Annotations", "Clean PDFs"],
    icon: Droplets,
    href: "/dashboard/tools/pdf-remove-watermark",
    gradient: "from-rose-500 to-pink-500",
    free: true,
    category: "PDF",
  },
  {
    name: "PDF to JPG",
    description: "Convert PDF pages to high-quality JPG images. Configurable DPI and quality settings.",
    features: ["Custom DPI", "Quality control", "All pages"],
    icon: ImageIcon,
    href: "/dashboard/tools/pdf-to-jpg",
    gradient: "from-cyan-500 to-blue-500",
    free: true,
    category: "PDF",
  },
  {
    name: "JPG to PDF",
    description: "Convert images to PDF with custom page sizes and orientations. Multiple images supported.",
    features: ["Multiple images", "A4/Letter/Legal", "Margins"],
    icon: FileText,
    href: "/dashboard/tools/jpg-to-pdf",
    gradient: "from-indigo-500 to-purple-500",
    free: true,
    category: "PDF",
  },
  {
    name: "Rotate PDF",
    description: "Rotate PDF pages by 90°, 180°, or 270°. Select all, odd, even, or specific pages.",
    features: ["90°/180°/270°", "Page selection", "Batch rotate"],
    icon: RotateCw,
    href: "/dashboard/tools/pdf-rotate",
    gradient: "from-teal-500 to-emerald-500",
    free: true,
    category: "PDF",
  },
  {
    name: "Unlock PDF",
    description: "Remove password protection from PDFs. Requires the correct password to unlock.",
    features: ["Remove password", "Full access", "Instant unlock"],
    icon: Unlock,
    href: "/dashboard/tools/pdf-unlock",
    gradient: "from-yellow-500 to-orange-500",
    free: true,
    category: "PDF",
  },
  {
    name: "Protect PDF",
    description: "Add password encryption to PDFs. Configure printing, modification, and copying permissions.",
    features: ["Password protect", "Permissions", "Encryption"],
    icon: Lock,
    href: "/dashboard/tools/pdf-protect",
    gradient: "from-red-500 to-rose-500",
    free: true,
    category: "PDF",
  },
  {
    name: "HTML to PDF",
    description: "Convert HTML content or web pages to PDF. High-quality rendering with CSS support.",
    features: ["HTML/URL", "CSS styling", "Full page"],
    icon: Globe,
    href: "/dashboard/tools/html-to-pdf",
    gradient: "from-violet-500 to-purple-500",
    free: true,
    category: "PDF",
  },
  {
    name: "Word to PDF",
    description: "Convert Word documents (DOCX) to PDF. Preserves all formatting, images, and styles.",
    features: ["DOCX to PDF", "Keep formatting", "Fast convert"],
    icon: FileText,
    href: "/dashboard/tools/word-to-pdf",
    gradient: "from-blue-500 to-indigo-500",
    free: true,
    category: "PDF",
  },
  {
    name: "Add Watermark (PDF)",
    description: "Add customizable text watermarks to PDFs. Control opacity, rotation, color, and position.",
    features: ["Custom text", "Opacity/Rotation", "Position"],
    icon: Type,
    href: "/dashboard/tools/pdf-add-watermark",
    gradient: "from-pink-500 to-rose-500",
    free: true,
    category: "PDF",
  },
  {
    name: "Add Page Numbers",
    description: "Add page numbers to PDFs with flexible positioning and format options.",
    features: ["6 positions", "Custom format", "Start page"],
    icon: Hash,
    href: "/dashboard/tools/pdf-page-numbers",
    gradient: "from-emerald-500 to-teal-500",
    free: true,
    category: "PDF",
  },
  {
    name: "Organize PDF",
    description: "Reorder or delete PDF pages. Rearrange pages in any order or remove unwanted pages.",
    features: ["Reorder pages", "Delete pages", "Drag & drop"],
    icon: FolderTree,
    href: "/dashboard/tools/pdf-organize",
    gradient: "from-amber-500 to-yellow-500",
    free: true,
    category: "PDF",
  },
  {
    name: "Crop PDF",
    description: "Remove margins from PDF pages. Configure left, top, right, and bottom crop amounts.",
    features: ["Custom margins", "Page selection", "Batch crop"],
    icon: Crop,
    href: "/dashboard/tools/pdf-crop",
    gradient: "from-lime-500 to-green-500",
    free: true,
    category: "PDF",
  },
  {
    name: "Excel to PDF",
    description: "Convert Excel spreadsheets (XLSX) to PDF. Preserves formatting and cell styling.",
    features: ["XLSX to PDF", "Keep formatting", "All sheets"],
    icon: Sheet,
    href: "/dashboard/tools/excel-to-pdf",
    gradient: "from-green-600 to-emerald-600",
    free: true,
    category: "PDF",
  },
  {
    name: "PowerPoint to PDF",
    description: "Convert PowerPoint presentations (PPTX) to PDF. Maintains slide formatting and layout.",
    features: ["PPTX to PDF", "Slide formatting", "All slides"],
    icon: Presentation,
    href: "/dashboard/tools/powerpoint-to-pdf",
    gradient: "from-orange-600 to-red-600",
    free: true,
    category: "PDF",
  },
  {
    name: "PDF to Excel",
    description: "Convert PDF files to editable Excel spreadsheets (XLSX). Extract tables and data accurately.",
    features: ["Tables to XLSX", "Data extraction", "Accurate"],
    icon: Sheet,
    href: "/dashboard/tools/pdf-to-excel",
    gradient: "from-green-600 to-emerald-600",
    free: true,
    category: "PDF",
  },
  {
    name: "PDF to PowerPoint",
    description: "Convert PDF pages into editable PowerPoint presentations (PPTX). Save documents as slides.",
    features: ["PDF to PPTX", "Editable slides", "Preserve layout"],
    icon: Presentation,
    href: "/dashboard/tools/pdf-to-powerpoint",
    gradient: "from-red-600 to-orange-600",
    free: true,
    category: "PDF",
  },
  {
    name: "PDF Filler",
    description: "Fill, sign & annotate PDFs online. Add text, signatures, checkboxes, highlights, and images to any PDF.",
    features: ["E-signatures", "Stamps", "Watermarks", "Draw"],
    icon: PenTool,
    href: "/dashboard/tools/pdf-filler",
    gradient: "from-rose-500 to-pink-500",
    free: true,
    darkBg: "dark:bg-rose-950/30",
    category: "PDF",
  },
  {
    name: "Excel / CSV",
    description: "Free Excel to CSV converter. Convert XLS, XLSX files with multiple sheets. Clean data automatically.",
    features: ["Excel to CSV", "CSV to Excel", "Multi-sheet"],
    icon: Table,
    href: "/dashboard/tools/excel",
    gradient: "from-amber-500 to-orange-600",
    free: true,
    category: "Utility",
  },
  {
    name: "Favicon Generator",
    description: "Generate all favicon sizes from one image. Creates ICO, Apple Touch, Android Chrome icons & manifest.",
    features: ["ICO", "Apple Touch", "Android", "Manifest"],
    icon: Palette,
    href: "/dashboard/tools/favicon",
    gradient: "from-cyan-500 to-blue-600",
    free: true,
    category: "Generator",
  },
  {
    name: "Website to PDF",
    description: "Convert any webpage to PDF. Capture full pages with images. Choose paper size and orientation.",
    features: ["Full page", "Custom paper", "Portrait/Landscape"],
    icon: Globe,
    href: "/dashboard/tools/webpdf",
    gradient: "from-pink-500 to-rose-600",
    free: true,
    category: "PDF",
  },
  {
    name: "JSON Formatter",
    description: "Free JSON formatter, validator & beautifier. Minify JSON, convert to YAML. Syntax error detection.",
    features: ["Beautify", "Minify", "Validate", "To YAML"],
    icon: Braces,
    href: "/dashboard/tools/json",
    gradient: "from-yellow-500 to-orange-600",
    free: true,
    category: "Utility",
  },
  {
    name: "Markdown to PDF",
    description: "Convert Markdown to beautifully styled PDFs. Choose from GitHub, academic, or minimal themes.",
    features: ["GitHub theme", "Academic", "Code highlighting"],
    icon: FileDown,
    href: "/dashboard/tools/markdown",
    gradient: "from-slate-500 to-gray-600",
    free: true,
    category: "PDF",
  },
  {
    name: "Text Diff Tool",
    description: "Free online text comparison. Side-by-side diff view with highlighted changes and similarity score.",
    features: ["Side-by-side", "Highlights", "Similarity score"],
    icon: GitCompare,
    href: "/dashboard/tools/diff",
    gradient: "from-red-500 to-pink-600",
    free: true,
    category: "Utility",
  },
  {
    name: "Invoice Generator",
    description: "Create professional PDF invoices in seconds. Add logo, customize items, tax, and notes. Download instantly.",
    features: ["Logo", "Tax calculation", "Watermarks", "Notes"],
    icon: Receipt,
    href: "/dashboard/tools/invoice",
    gradient: "from-teal-500 to-cyan-600",
    free: true,
    category: "Generator",
  },
  {
    name: "Card Generator",
    description: "Generate valid test credit card numbers for development. Supports Visa, Mastercard, Amex & more. Luhn-validated.",
    features: ["Visa", "Mastercard", "Amex", "Luhn validated"],
    icon: CreditCard,
    href: "/dashboard/tools/credit-card",
    gradient: "from-indigo-500 to-purple-600",
    free: true,
    category: "Generator",
  },
  {
    name: "CV Builder",
    description: "Create professional resumes and CVs from Markdown. Multiple templates, instant PDF export, ATS-friendly formats.",
    features: ["Markdown syntax", "Multiple templates", "PDF export"],
    icon: FileText,
    href: "/dashboard/tools/cv",
    gradient: "from-rose-500 to-pink-600",
    free: true,
    category: "Generator",
  },
];



const faqs = [
  {
    question: "Is Tulz free to use?",
    answer:
      "Yes! Tulz is 100% free and unlimited for everyone. No signup, no credit card, and no hidden subscriptions. Use any tool as much as you need.",
  },
  {
    question: "Do you store my files?",
    answer:
      "No. Your privacy is our 100% priority. All uploaded files are instantly deleted after processing and never stored on our servers. We never see or share your data.",
  },
  {
    question: "What tools are available on Tulz?",
    answer:
      "Tulz offers QR Code Generator, Scientific Calculator, Image Editor, 18 PDF tools (split, merge, compress, PDF to Word/JPG, JPG to PDF, rotate, lock/unlock, watermarks, page numbers, organize, crop, Word/Excel/PowerPoint to PDF, HTML to PDF, and more), PDF Filler (fill, sign & annotate), Excel to CSV converter, Favicon Generator, Website to PDF, JSON Formatter, Markdown to PDF, Text Diff tool, Invoice Generator, Credit Card Generator for testing, and CV Builder.",
  },
  {
    question: "Can I use Tulz on mobile devices?",
    answer:
      "Yes! Tulz is fully responsive and works on all devices including smartphones, tablets, and desktop computers.",
  },
];

// Testimonials removed per user request

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Get unique categories
  const categories = ["All", ...Array.from(new Set(tools.map((tool) => tool.category)))];

  // Filter tools based on selected category and search query
  const filteredTools = tools.filter((tool) => {
    const matchesCategory = selectedCategory === "All" || tool.category === selectedCategory;
    const matchesSearch =
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950">
      <WebsiteStructuredData />
      <OrganizationStructuredData />
      <FAQStructuredData faqs={faqs} />
      <ToolsCollectionStructuredData />
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-16 pb-12 lg:pt-24 lg:pb-16 px-4 bg-white dark:bg-slate-950">
          <div className="container relative mx-auto max-w-5xl text-center">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4 text-slate-900 dark:text-white">
              Every tool you need in one place
            </h1>
            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-6 max-w-3xl mx-auto">
              All the tools you need to work with PDFs, images, and more. 100% FREE and easy to use.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-slate-600 dark:text-slate-400 mb-8">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-600" />
                <span>100% Private & No Storage</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-green-600" />
                <span>Fast Processing</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>No Installation Required</span>
              </div>
            </div>
          </div>
        </section>
        {/* Free Beta Banner */}
        <section className="py-3 px-2 bg-gradient-to-r from-green-500 to-emerald-600 dark:from-green-600 dark:to-emerald-700">
          <div className="container mx-auto max-w-4xl">
            <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-6 text-center md:text-left">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-white flex-shrink-0" fill="white" />
                <span className="text-white font-bold text-sm md:text-base whitespace-nowrap">
                  🎉 Free Beta - All tools are 100% free!
                </span>
              </div>
              <span className="hidden md:block text-white/40 h-4 border-l border-white/40"></span>
              <span className="text-white/90 text-sm max-w-xs md:max-w-none leading-tight">
                No limits, no login, no catch - Support us if you find it useful!
              </span>
              <Link
                href="/support"
                className="mt-2 md:mt-0 px-5 py-1.5 bg-white text-green-600 font-bold rounded-full text-xs uppercase tracking-wide hover:bg-green-50 transition-all shadow-sm hover:shadow-md whitespace-nowrap"
              >
                ❤️ Support Us
              </Link>
            </div>
          </div>
        </section>

        {/* Search Bar - Repositioned for prominence */}
        <section className="py-8 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div className="container mx-auto max-w-2xl px-4">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-red-500">
                <Search className="h-5 w-5 text-slate-400 group-focus-within:text-red-500 transition-colors" />
              </div>
              <Input
                type="text"
                placeholder="Search tools (e.g. PDF, Image, QR...)"
                className="pl-11 pr-4 py-6 text-lg rounded-2xl border-slate-200 dark:border-slate-700 focus:border-red-500 focus:ring-red-500/20 dark:bg-slate-800 dark:text-white transition-all shadow-sm hover:shadow-md h-14"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <span className="text-xl">×</span>
                </button>
              )}
            </div>
          </div>
        </section>








        {/* Tools Grid */}
        <section id="tools" className="py-16 px-4 bg-slate-50 dark:bg-slate-900">
          <div className="container mx-auto max-w-7xl">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-6 text-slate-900 dark:text-white">
              All Tools
            </h2>

            {/* Filter Chips - Material Design */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`
                    px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                    ${selectedCategory === category
                      ? "bg-red-600 text-white shadow-md hover:bg-red-700 hover:shadow-lg"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500"
                    }
                  `}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Tools Grid with Material Design elevation */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTools.length > 0 ? (
                filteredTools.map((tool) => (
                  <Link
                    key={tool.name}
                    href={tool.href}
                    className="group relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-red-400 dark:hover:border-red-500 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
                  >
                    {/* Card content with increased padding for height */}
                    <div className="p-6 flex flex-col gap-4 min-h-[140px]">
                      {/* Icon and Title Row */}
                      <div className="flex items-center gap-3">
                        {/* Icon with Material Design elevation */}
                        <div className={`flex-shrink-0 p-3 rounded-xl bg-gradient-to-br ${tool.gradient} text-white shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300`}>
                          <tool.icon className="h-6 w-6" strokeWidth={2} />
                        </div>

                        {/* Title and Badge */}
                        <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                          <h3 className="font-semibold text-base text-slate-900 dark:text-white leading-snug">
                            {tool.name}
                          </h3>
                          {tool.free && (
                            <span className="flex-shrink-0 px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              FREE
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Description - Full Width */}
                      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {tool.description}
                      </p>
                    </div>

                    {/* Material Design ripple effect on hover */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  </Link>
                ))
              ) : (
                <div className="col-span-full py-12 text-center">
                  <p className="text-lg text-slate-600 dark:text-slate-400">
                    No tools found matching "{searchQuery}"
                  </p>
                  <Button
                    variant="link"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory("All");
                    }}
                    className="mt-2 text-red-600 hover:text-red-700"
                  >
                    Clear all filters
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 px-4 bg-white dark:bg-slate-950">
          <div className="container mx-auto max-w-5xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div className="space-y-3">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 mx-auto">
                  <Shield className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                  100% Private
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  We don't save your files. Everything is deleted instantly after processing. Your data stays yours.
                </p>
              </div>
              <div className="space-y-3">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 mx-auto">
                  <Zap className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                  Lightning Fast
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Process files instantly with our optimized infrastructure. No waiting, no hassle.
                </p>
              </div>
              <div className="space-y-3">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 mx-auto">
                  <Globe className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                  Works Everywhere
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Access all tools from any device. No installation or signup required to get started.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faqs" className="py-16 px-4 bg-slate-50 dark:bg-slate-900">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-10 text-slate-900 dark:text-white">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div key={index} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
                  <h3 className="font-bold text-base mb-2 text-slate-900 dark:text-white">{faq.question}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 px-4 bg-red-600 dark:bg-red-700 text-white">
          <div className="container mx-auto text-center max-w-3xl">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Start using Tulz today
            </h2>
            <p className="text-lg mb-8 opacity-95">
              Join thousands of users who trust Tulz for their daily productivity needs.
            </p>
            <a href="#tools">
              <Button
                size="lg"
                variant="secondary"
                className="text-lg px-8 h-12 bg-white text-red-600 hover:bg-slate-50 font-semibold"
              >
                Get Started Free
              </Button>
            </a>
            <p className="mt-4 text-sm opacity-90">No credit card required</p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}