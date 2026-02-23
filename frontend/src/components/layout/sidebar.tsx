"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import {
  QrCode,
  Calculator,
  Image as ImageIcon,
  FileText,
  Table,
  History,
  Settings,
  CreditCard,
  LayoutDashboard,
  LogIn,
  Globe,
  Sparkles,
  Palette,
  Braces,
  FileDown,
  GitCompare,
  Receipt,
  User,
  MessageSquarePlus,
  PenTool,
  Wallet,
  ScanText,
  Minimize2,
  Maximize,
  Crop,
  Eraser,
  RotateCw,
  Target,
  ImageMinus,
  Smartphone,
  Scissors,
  Merge,
  FileOutput,
  Droplets,
  Unlock,
  Lock,
  Type,
  Hash,
  FolderTree,
  Sheet,
  Presentation,
} from "lucide-react";

// Tool categories with icons and gradient colors
const toolsNavigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    name: "QR Code Generator",
    href: "/tools/qrcode",
    icon: QrCode,
    gradient: "from-blue-500 to-indigo-600",
    isFree: true,
  },
  {
    name: "Scientific Calculator",
    href: "/tools/calculator",
    icon: Calculator,
    gradient: "from-emerald-500 to-teal-600",
    isFree: true,
  },
  {
    name: "Image Editor",
    href: "/tools/image",
    icon: ImageIcon,
    gradient: "from-violet-500 to-purple-600",
    isFree: true,
  },
  {
    name: "Image Compressor",
    href: "/tools/image-compress",
    icon: Minimize2,
    gradient: "from-blue-500 to-cyan-500",
    isFree: true,
  },
  {
    name: "Image Resizer",
    href: "/tools/image-resize",
    icon: Maximize,
    gradient: "from-indigo-500 to-blue-600",
    isFree: true,
  },
  {
    name: "Image Converter",
    href: "/tools/image-convert",
    icon: FileOutput,
    gradient: "from-orange-500 to-red-500",
    isFree: true,
  },
  {
    name: "Image Cropper",
    href: "/tools/image-crop",
    icon: Crop,
    gradient: "from-green-500 to-emerald-600",
    isFree: true,
  },
  {
    name: "Background Remover",
    href: "/tools/image-background-remover",
    icon: Eraser,
    gradient: "from-pink-500 to-rose-500",
    isFree: true,
  },
  {
    name: "Image Rotator",
    href: "/tools/image-rotate",
    icon: RotateCw,
    gradient: "from-cyan-500 to-blue-500",
    isFree: true,
  },
  {
    name: "Image to KB",
    href: "/tools/image-to-kb",
    icon: Target,
    gradient: "from-purple-500 to-indigo-500",
    isFree: true,
  },
  {
    name: "Add Watermark",
    href: "/tools/image-watermark",
    icon: Droplets,
    gradient: "from-teal-500 to-cyan-600",
    isFree: true,
  },
  {
    name: "WebP Converter",
    href: "/tools/webp-converter",
    icon: Globe,
    gradient: "from-emerald-400 to-green-500",
    isFree: true,
  },
  {
    name: "WebP to PNG",
    href: "/tools/webp-to-png",
    icon: ImageMinus,
    gradient: "from-sky-500 to-blue-500",
    isFree: true,
  },
  {
    name: "WebP to JPG",
    href: "/tools/webp-to-jpg",
    icon: ImageIcon,
    gradient: "from-amber-500 to-orange-500",
    isFree: true,
  },
  {
    name: "PNG to JPG",
    href: "/tools/png-to-jpg",
    icon: ImageIcon,
    gradient: "from-red-400 to-orange-500",
    isFree: true,
  },
  {
    name: "JPG to PNG",
    href: "/tools/jpg-to-png",
    icon: ImageIcon,
    gradient: "from-blue-400 to-indigo-500",
    isFree: true,
  },
  {
    name: "HEIC to JPG",
    href: "/tools/heic-to-jpg",
    icon: Smartphone,
    gradient: "from-slate-500 to-gray-600",
    isFree: true,
  },
  {
    name: "Instagram Resizer",
    href: "/tools/instagram-resizer",
    icon: Smartphone,
    gradient: "from-pink-500 via-red-500 to-yellow-500",
    isFree: true,
  },
  {
    name: "WhatsApp DP Resizer",
    href: "/tools/whatsapp-dp-resizer",
    icon: Smartphone,
    gradient: "from-green-400 to-emerald-600",
    isFree: true,
  },
  {
    name: "Twitter Header Resizer",
    href: "/tools/twitter-header-resizer",
    icon: Smartphone,
    gradient: "from-sky-400 to-blue-500",
    isFree: true,
  },
  {
    name: "LinkedIn Banner Resizer",
    href: "/tools/linkedin-banner-resizer",
    icon: Smartphone,
    gradient: "from-blue-600 to-indigo-700",
    isFree: true,
  },
  {
    name: "Split PDF",
    href: "/tools/pdf-split",
    icon: Scissors,
    gradient: "from-blue-500 to-cyan-500",
    isFree: true,
  },
  {
    name: "Merge PDFs",
    href: "/tools/pdf-merge",
    icon: Merge,
    gradient: "from-purple-500 to-pink-500",
    isFree: true,
  },
  {
    name: "Compress PDF",
    href: "/tools/pdf-compress",
    icon: Minimize2,
    gradient: "from-green-500 to-emerald-500",
    isFree: true,
  },
  {
    name: "PDF to Word",
    href: "/tools/pdf-to-word",
    icon: FileOutput,
    gradient: "from-orange-500 to-amber-500",
    isFree: true,
  },
  {
    name: "Remove Watermark",
    href: "/tools/pdf-remove-watermark",
    icon: Droplets,
    gradient: "from-rose-500 to-pink-500",
    isFree: true,
  },
  {
    name: "PDF to JPG",
    href: "/tools/pdf-to-jpg",
    icon: ImageIcon,
    gradient: "from-cyan-500 to-blue-500",
    isFree: true,
  },
  {
    name: "JPG to PDF",
    href: "/tools/jpg-to-pdf",
    icon: FileText,
    gradient: "from-indigo-500 to-purple-500",
    isFree: true,
  },
  {
    name: "Rotate PDF",
    href: "/tools/pdf-rotate",
    icon: RotateCw,
    gradient: "from-teal-500 to-emerald-500",
    isFree: true,
  },
  {
    name: "Unlock PDF",
    href: "/tools/pdf-unlock",
    icon: Unlock,
    gradient: "from-yellow-500 to-orange-500",
    isFree: true,
  },
  {
    name: "Protect PDF",
    href: "/tools/pdf-protect",
    icon: Lock,
    gradient: "from-red-500 to-rose-500",
    isFree: true,
  },
  {
    name: "HTML to PDF",
    href: "/tools/html-to-pdf",
    icon: Globe,
    gradient: "from-violet-500 to-purple-500",
    isFree: true,
  },
  {
    name: "Word to PDF",
    href: "/tools/word-to-pdf",
    icon: FileText,
    gradient: "from-blue-500 to-indigo-500",
    isFree: true,
  },
  {
    name: "Watermark PDF",
    href: "/tools/pdf-add-watermark",
    icon: Type,
    gradient: "from-pink-500 to-rose-500",
    isFree: true,
  },
  {
    name: "Add Page Numbers",
    href: "/tools/pdf-page-numbers",
    icon: Hash,
    gradient: "from-emerald-500 to-teal-500",
    isFree: true,
  },
  {
    name: "Organize PDF",
    href: "/tools/pdf-organize",
    icon: FolderTree,
    gradient: "from-amber-500 to-yellow-500",
    isFree: true,
  },
  {
    name: "Crop PDF",
    href: "/tools/pdf-crop",
    icon: Crop,
    gradient: "from-lime-500 to-green-500",
    isFree: true,
  },
  {
    name: "Excel to PDF",
    href: "/tools/excel-to-pdf",
    icon: Sheet,
    gradient: "from-green-600 to-emerald-600",
    isFree: true,
  },
  {
    name: "PowerPoint to PDF",
    href: "/tools/powerpoint-to-pdf",
    icon: Presentation,
    gradient: "from-orange-600 to-red-600",
    isFree: true,
  },
  {
    name: "PDF to Excel",
    href: "/tools/pdf-to-excel",
    icon: Sheet,
    gradient: "from-green-600 to-emerald-600",
    isFree: true,
  },
  {
    name: "PDF to PowerPoint",
    href: "/tools/pdf-to-powerpoint",
    icon: Presentation,
    gradient: "from-red-600 to-orange-600",
    isFree: true,
  },
  {
    name: "PDF Filler",
    href: "/tools/pdf-filler",
    icon: PenTool,
    gradient: "from-rose-500 to-pink-500",
    isFree: true,
  },
  {
    name: "Excel / CSV",
    href: "/tools/excel",
    icon: Table,
    gradient: "from-amber-500 to-orange-600",
    isFree: true,
  },
  {
    name: "Favicon Generator",
    href: "/tools/favicon",
    icon: Palette,
    gradient: "from-cyan-500 to-blue-600",
    isFree: true,
  },
  {
    name: "Website to PDF",
    href: "/tools/webpdf",
    icon: Globe,
    gradient: "from-pink-500 to-rose-600",
    isFree: true,
  },
  {
    name: "JSON Formatter",
    href: "/tools/json",
    icon: Braces,
    gradient: "from-yellow-500 to-orange-600",
    isFree: true,
  },
  {
    name: "Markdown to PDF",
    href: "/tools/markdown",
    icon: FileDown,
    gradient: "from-slate-500 to-gray-600",
    isFree: true,
  },
  {
    name: "Text Diff Tool",
    href: "/tools/diff",
    icon: GitCompare,
    gradient: "from-red-500 to-pink-600",
    isFree: true,
  },
  {
    name: "Invoice Generator",
    href: "/tools/invoice",
    icon: Receipt,
    gradient: "from-teal-500 to-cyan-600",
    isFree: true,
  },
  {
    name: "Card Generator",
    href: "/tools/credit-card",
    icon: Wallet,
    gradient: "from-indigo-500 to-purple-600",
    isFree: true,
  },
  {
    name: "CV Builder",
    href: "/tools/cv",
    icon: FileText,
    gradient: "from-rose-500 to-pink-600",
    isFree: true,
  },
  /*
  {
    name: "OCR Tools",
    href: "/tools/ocr",
    icon: ScanText,
    gradient: "from-cyan-500 to-blue-600",
    isFree: true,
  },
  */
];

const accountNavigation = [
  {
    name: "History",
    href: "/dashboard/history",
    icon: History,
    requiresAuth: true,
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    requiresAuth: true,
  },
  {
    name: "Feedback",
    href: "/dashboard/feedback",
    icon: MessageSquarePlus,
    requiresAuth: false,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-56 lg:fixed lg:inset-y-0 lg:pt-16 lg:border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Tools Section */}
        <nav className="flex-1 px-2 py-4">
          <div className="flex items-center gap-1.5 px-2 mb-3">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Tools
            </span>
          </div>

          <div className="space-y-1">
            {toolsNavigation.map((item) => {
              // Fix: Use exact match or check that path continues with / to avoid /pdf matching /pdf-filler
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-2 px-2 py-1.5 text-xs font-medium rounded-md transition-all duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-center w-6 h-6 rounded-md transition-all duration-200 flex-shrink-0",
                      isActive
                        ? "bg-primary-foreground/20"
                        : `bg-gradient-to-br ${item.gradient} text-white shadow-sm`
                    )}
                  >
                    <item.icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="flex-1 truncate">{item.name}</span>
                  {item.isFree && (
                    <span className="flex-shrink-0 inline-flex items-center px-1 py-0.5 rounded text-[8px] font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      Free
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Account Section */}
          <div className="mt-6">
            <div className="flex items-center gap-1.5 px-2 mb-3">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Account
              </span>
            </div>

            <div className="space-y-1">
              {accountNavigation
                .filter((item) => !item.requiresAuth || isAuthenticated)
                .map((item) => {
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "group flex items-center gap-2 px-2 py-1.5 text-xs font-medium rounded-md transition-all duration-200",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <div
                        className={cn(
                          "flex items-center justify-center w-6 h-6 rounded-md transition-all flex-shrink-0",
                          isActive
                            ? "bg-primary-foreground/20"
                            : "bg-muted group-hover:bg-muted-foreground/10"
                        )}
                      >
                        <item.icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="flex-1 truncate">{item.name}</span>
                    </Link>
                  );
                })}
            </div>
          </div>
        </nav>

        {/* Footer / Brand */}
        <div className="p-3 border-t">
          <div className="flex items-center gap-2 px-2 py-1.5">
            <Image
              src="/logo.png"
              alt="Tulz"
              width={24}
              height={24}
              className="rounded-md"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold">Tulz</p>
              <p className="text-[10px] text-muted-foreground">Free tools</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
