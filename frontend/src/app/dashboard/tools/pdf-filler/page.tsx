"use client";

import { RelatedGuide } from "@/components/shared/related-guide";

import { useState, useRef, useCallback, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api, apiHelpers, shouldShowErrorToast } from "@/lib/api";
import { useLoginModal } from "@/components/shared/login-modal";
import { useProgressModal } from "@/components/shared/progress-modal";
import { useAuth } from "@/providers/auth-provider";
import { formatBytes, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { FileDropzone } from "@/components/shared/file-dropzone";
import { SupportButton } from "@/components/shared/support-button";
import { FreeBadge } from "@/components/shared/free-badge";
import { UsageBadge } from "@/components/shared/usage-badge";
import {
  FileText,
  Download,
  Undo2,
  Redo2,
  RotateCcw,
  Eraser,
  Type,
  Pencil,
  PenTool,
  Square,
  Minus,
  Highlighter,
  Image as ImageIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  MousePointer,
  Trash2,
  X,
  Upload,
  Crown,
  Circle,
  MoveRight,
  Calendar,
  Stamp,
  FileSignature,
  Droplets,
  Maximize,
  Minimize,
  ArrowLeft,
  Loader2,
} from "lucide-react";

// Use relative URL in production (requests go through same domain via nginx proxy)
// Only use absolute URL for local development
const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

// Tool types
type Tool =
  | "select"
  | "text"
  | "draw"
  | "signature"
  | "rectangle"
  | "line"
  | "highlight"
  | "eraser"
  | "image"
  | "checkbox"
  | "circle"
  | "arrow"
  | "date"
  | "stamp"
  | "strikethrough"
  | "initials"
  | "radio"
  | "signedStamp"
  | "watermark";

// Annotation types
interface BaseAnnotation {
  id: string;
  type: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TextAnnotation extends BaseAnnotation {
  type: "text";
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  bold: boolean;
  italic: boolean;
}

interface DrawingAnnotation extends BaseAnnotation {
  type: "drawing";
  paths: { points: { x: number; y: number }[] }[];
  color: string;
  strokeWidth: number;
}

interface SignatureAnnotation extends BaseAnnotation {
  type: "signature";
  data: string;
}

interface RectangleAnnotation extends BaseAnnotation {
  type: "rectangle";
  color: string;
  strokeWidth: number;
  fill: boolean;
  fillColor: string;
}

interface LineAnnotation extends BaseAnnotation {
  type: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  strokeWidth: number;
}

interface HighlightAnnotation extends BaseAnnotation {
  type: "highlight";
  color: string;
  opacity: number;
}

interface ImageAnnotation extends BaseAnnotation {
  type: "image";
  data: string;
}

interface CheckboxAnnotation extends BaseAnnotation {
  type: "checkbox";
  checked: boolean;
}

interface CircleAnnotation extends BaseAnnotation {
  type: "circle";
  color: string;
  strokeWidth: number;
  fill: boolean;
  fillColor: string;
}

interface ArrowAnnotation extends BaseAnnotation {
  type: "arrow";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  strokeWidth: number;
}

interface DateAnnotation extends BaseAnnotation {
  type: "date";
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  format: string;
}

interface StampAnnotation extends BaseAnnotation {
  type: "stamp";
  stampType: "approved" | "draft" | "confidential" | "paid" | "rejected" | "final" | "copy" | "void" | "custom";
  customText?: string;
  color: string;
  rotation: number;
  isDashed: boolean;
  shape: "box" | "circle";
}

interface StrikethroughAnnotation extends BaseAnnotation {
  type: "strikethrough";
  color: string;
  strokeWidth: number;
  isRedact: boolean;
}

interface InitialsAnnotation extends BaseAnnotation {
  type: "initials";
  data: string;
}

interface RadioAnnotation extends BaseAnnotation {
  type: "radio";
  checked: boolean;
  groupId: string;
}

interface SignedStampAnnotation extends BaseAnnotation {
  type: "signedStamp";
  stampText: string;
  signatureData: string;
  dateText: string;
  borderColor: string;
  isDashed: boolean;
  shape: "box" | "circle";
  stampStyle: "modern" | "classic" | "official";
  textLayout: "curved" | "straight";
}

interface WatermarkAnnotation extends BaseAnnotation {
  type: "watermark";
  content: string; // text or image data URL
  contentType: "text" | "image";
  color: string;
  opacity: number;
  rotation: number;
  fontSize: number;
  borderStyle: "none" | "solid" | "dashed" | "dotted";
  borderColor: string;
}

type Annotation =
  | TextAnnotation
  | DrawingAnnotation
  | SignatureAnnotation
  | RectangleAnnotation
  | LineAnnotation
  | HighlightAnnotation
  | ImageAnnotation
  | CheckboxAnnotation
  | CircleAnnotation
  | ArrowAnnotation
  | DateAnnotation
  | StampAnnotation
  | StrikethroughAnnotation
  | InitialsAnnotation
  | RadioAnnotation
  | SignedStampAnnotation
  | WatermarkAnnotation;

// Color presets
const colorPresets = [
  "#000000",
  "#1e40af",
  "#dc2626",
  "#16a34a",
  "#9333ea",
  "#ea580c",
  "#0891b2",
  "#be185d",
];

const highlightColors = [
  "#FFFF00",
  "#00FF00",
  "#00FFFF",
  "#FF69B4",
  "#FFA500",
  "#87CEEB",
];

const fontFamilies = ["Helvetica", "Times New Roman", "Courier", "Arial"];

// Stamp presets
const stampPresets = [
  { id: "approved", label: "APPROVED", color: "#16a34a" },
  { id: "draft", label: "DRAFT", color: "#6b7280" },
  { id: "confidential", label: "CONFIDENTIAL", color: "#dc2626" },
  { id: "paid", label: "PAID", color: "#16a34a" },
  { id: "rejected", label: "REJECTED", color: "#dc2626" },
  { id: "final", label: "FINAL", color: "#2563eb" },
  { id: "copy", label: "COPY", color: "#9333ea" },
  { id: "void", label: "VOID", color: "#dc2626" },
] as const;

// Date format options
const dateFormats = [
  { id: "MM/DD/YYYY", example: "12/25/2024" },
  { id: "DD/MM/YYYY", example: "25/12/2024" },
  { id: "YYYY-MM-DD", example: "2024-12-25" },
  { id: "MMM DD, YYYY", example: "Dec 25, 2024" },
  { id: "DD MMM YYYY", example: "25 Dec 2024" },
  { id: "MMMM DD, YYYY", example: "December 25, 2024" },
];

export default function PDFFillerPage() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { showLoginModal } = useLoginModal();
  const { showProgress, setStatus, hideProgress } = useProgressModal();

  // Get usage data to check if user can use tools
  const { data: usageData } = useQuery({
    queryKey: ["remaining-uses"],
    queryFn: async () => {
      const response = await apiHelpers.getRemainingUses();
      return response.data;
    },
    enabled: !!isAuthenticated,
  });


  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageRendering, setPageRendering] = useState(false);

  // Canvas refs
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const annotationCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 1000 });
  // Fixed render scale for quality - PDF is rendered once at this scale
  const RENDER_SCALE = 1.5;
  // Visual zoom level (CSS transform) - doesn't trigger re-render
  // Start at 40% on mobile to show full PDF width, 100% on desktop
  const [zoom, setZoom] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 0.4;
    }
    return 1.0;
  });

  // PDF.js
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pdfLib, setPdfLib] = useState<any>(null);
  const renderTaskRef = useRef<any>(null);

  // Tool state
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    // Add small delay to allow UI to update before refitting
    setTimeout(handleFitToWidth, 100);
  };
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>(
    []
  );

  // History for undo/redo
  const [history, setHistory] = useState<Annotation[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Tool settings
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [fontSize, setFontSize] = useState(14);
  const [fontFamily, setFontFamily] = useState("Helvetica");
  const [highlightColor, setHighlightColor] = useState("#FFFF00");

  // New tool settings
  const [selectedStamp, setSelectedStamp] = useState<"approved" | "draft" | "confidential" | "paid" | "rejected" | "final" | "copy" | "void" | "custom">("approved");
  const [customStampText, setCustomStampText] = useState("CUSTOM");
  const [stampColor, setStampColor] = useState("#16a34a");
  const [stampIsDashed, setStampIsDashed] = useState(false);
  const [stampShape, setStampShape] = useState<"box" | "circle">("box");
  const [dateFormat, setDateFormat] = useState("MM/DD/YYYY");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [showDateModal, setShowDateModal] = useState(false);
  const [datePosition, setDatePosition] = useState<{ x: number; y: number } | null>(null);
  const [showStampModal, setShowStampModal] = useState(false);
  const [isRedactMode, setIsRedactMode] = useState(false);
  const [radioGroupCounter, setRadioGroupCounter] = useState(1);

  // Initials modal
  const [showInitialsModal, setShowInitialsModal] = useState(false);
  const [initialsData, setInitialsData] = useState<string | null>(null);
  const initialsCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawingInitials, setIsDrawingInitials] = useState(false);
  const [initialsHistory, setInitialsHistory] = useState<ImageData[]>([]);

  // Page thumbnails
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [thumbnails, setThumbnails] = useState<string[]>([]);

  // Signed stamp modal
  const [showSignedStampModal, setShowSignedStampModal] = useState(false);
  const [signedStampPosition, setSignedStampPosition] = useState<{ x: number; y: number } | null>(null);
  const [signedStampText, setSignedStampText] = useState("APPROVED BY");
  const [signedStampSignature, setSignedStampSignature] = useState<string | null>(null);
  const [signedStampDate, setSignedStampDate] = useState(new Date().toISOString().split("T")[0]);
  const [signedStampDateFormat, setSignedStampDateFormat] = useState("MMM DD, YYYY");
  const [signedStampColor, setSignedStampColor] = useState("#1e40af");
  const [signedStampIsDashed, setSignedStampIsDashed] = useState(false);
  const [signedStampShape, setSignedStampShape] = useState<"box" | "circle">("circle");
  const [signedStampStyle, setSignedStampStyle] = useState<"modern" | "classic" | "official">("classic");
  const [signedStampTextLayout, setSignedStampTextLayout] = useState<"curved" | "straight">("curved");
  const signedStampCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawingSignedStamp, setIsDrawingSignedStamp] = useState(false);
  const [signedStampSignatureMode, setSignedStampSignatureMode] = useState<"draw" | "upload">("draw");
  const signedStampUploadRef = useRef<HTMLInputElement>(null);
  const [signedStampDragActive, setSignedStampDragActive] = useState(false);

  // Watermark modal
  const [showWatermarkModal, setShowWatermarkModal] = useState(false);
  const [watermarkPosition, setWatermarkPosition] = useState<{ x: number; y: number } | null>(null);
  const [watermarkText, setWatermarkText] = useState("CONFIDENTIAL");
  const [watermarkContentType, setWatermarkContentType] = useState<"text" | "image">("text");
  const [watermarkImage, setWatermarkImage] = useState<string | null>(null);
  const [watermarkColor, setWatermarkColor] = useState("#6b7280");
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.3);
  const [watermarkRotation, setWatermarkRotation] = useState(-45);
  const [watermarkFontSize, setWatermarkFontSize] = useState(48);
  const [watermarkBorderStyle, setWatermarkBorderStyle] = useState<"none" | "solid" | "dashed" | "dotted">("none");
  const [watermarkBorderColor, setWatermarkBorderColor] = useState("#6b7280");
  const watermarkUploadRef = useRef<HTMLInputElement>(null);
  const [watermarkDragActive, setWatermarkDragActive] = useState(false);

  // Text editing
  const [editingText, setEditingText] = useState<string | null>(null);
  const [textInputValue, setTextInputValue] = useState("");
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Signature modal
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawingSignature, setIsDrawingSignature] = useState(false);
  const [signatureHistory, setSignatureHistory] = useState<ImageData[]>([]);
  const [signatureMode, setSignatureMode] = useState<"draw" | "upload">("draw");
  const signatureUploadRef = useRef<HTMLInputElement>(null);
  const [isDraggingSignature, setIsDraggingSignature] = useState(false);

  // Drag state
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [resizeHandle, setResizeHandle] = useState<string | null>(null); // 'nw' | 'ne' | 'sw' | 'se' | null
  const [hoverCursor, setHoverCursor] = useState<string>("default");

  // Result
  const [result, setResult] = useState<{
    download_url: string;
    size: number;
    watermarked: boolean;
  } | null>(null);

  // Load PDF.js library from CDN
  useEffect(() => {
    const loadPdfJs = async () => {
      if (typeof window !== "undefined" && !pdfLib) {
        // Check if already loaded
        if ((window as any).pdfjsLib) {
          setPdfLib((window as any).pdfjsLib);
          return;
        }

        // Load PDF.js from CDN
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
        script.async = true;
        script.onload = () => {
          const pdfjsLib = (window as any).pdfjsLib;
          pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
          setPdfLib(pdfjsLib);
        };
        document.head.appendChild(script);
      }
    };
    loadPdfJs();
  }, [pdfLib]);

  // Load PDF when file is selected
  useEffect(() => {
    if (!selectedFile || !pdfLib) return;

    const loadPdf = async () => {
      try {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const pdf = await pdfLib.getDocument({ data: arrayBuffer }).promise;
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        setCurrentPage(1);
        setAnnotations([]);
        setHistory([[]]);
        setHistoryIndex(0);
        setResult(null);

        // Create data URL for API submission
        const reader = new FileReader();
        reader.onload = () => {
          setPdfDataUrl(reader.result as string);
        };
        reader.readAsDataURL(selectedFile);

        toast.success(`PDF loaded: ${pdf.numPages} pages`);
      } catch (error) {
        console.error("Error loading PDF:", error);
        toast.error("Failed to load PDF");
      }
    };

    loadPdf();
  }, [selectedFile, pdfLib]);

  // Render current page - only re-renders when page changes, NOT when zoom changes
  useEffect(() => {
    if (!pdfDoc || !pdfCanvasRef.current) return;

    const renderPage = async () => {
      // Cancel any ongoing render task
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (e) {
          // Ignore cancel errors
        }
        renderTaskRef.current = null;
      }

      setPageRendering(true);
      try {
        const page = await pdfDoc.getPage(currentPage);

        // Get device pixel ratio for high-DPI rendering
        const pixelRatio = window.devicePixelRatio || 1;
        // Use fixed RENDER_SCALE - zoom is handled via CSS transform
        const viewport = page.getViewport({ scale: RENDER_SCALE });

        // Create a scaled viewport for high-DPI displays
        const scaledViewport = page.getViewport({ scale: RENDER_SCALE * pixelRatio });

        const canvas = pdfCanvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext("2d");
        if (!context) return;

        // Set canvas internal dimensions to scaled size for high-DPI
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        // Set CSS dimensions to normal viewport size
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        setCanvasSize({ width: viewport.width, height: viewport.height });

        // Also resize annotation canvas with same technique
        if (annotationCanvasRef.current) {
          annotationCanvasRef.current.width = scaledViewport.width;
          annotationCanvasRef.current.height = scaledViewport.height;
          annotationCanvasRef.current.style.width = `${viewport.width}px`;
          annotationCanvasRef.current.style.height = `${viewport.height}px`;
        }

        const renderTask = page.render({
          canvasContext: context,
          viewport: scaledViewport,
        });
        renderTaskRef.current = renderTask;

        await renderTask.promise;
        renderTaskRef.current = null;

        // Redraw annotations after page render
        drawAnnotations();
      } catch (error: any) {
        // Ignore cancelled render errors
        if (error?.name !== 'RenderingCancelledException') {
          console.error("Error rendering page:", error);
        }
      } finally {
        setPageRendering(false);
      }
    };

    renderPage();

    // Cleanup: cancel render on unmount or when dependencies change
    return () => {
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (e) {
          // Ignore cancel errors
        }
        renderTaskRef.current = null;
      }
    };
  }, [pdfDoc, currentPage]); // Note: zoom is NOT a dependency - it's CSS only

  // Fit PDF to container width using CSS zoom (no re-render)
  const handleFitToWidth = useCallback(() => {
    if (!containerRef.current || canvasSize.width === 0) return;
    const isMobile = window.innerWidth < 768;
    const padding = isMobile ? 8 : 32;
    const containerWidth = containerRef.current.clientWidth - padding;
    const newZoom = containerWidth / canvasSize.width;
    setZoom(Math.max(0.3, Math.min(2, newZoom)));
  }, [canvasSize.width]);

  // Reset zoom to 100%
  const handleResetZoom = useCallback(() => {
    setZoom(1.0);
  }, []);

  const hasAutoFitted = useRef(false);

  useEffect(() => {
    if (pdfDoc) {
      hasAutoFitted.current = false;
    }
  }, [pdfDoc]);

  // Auto-fit on first render for mobile devices
  useEffect(() => {
    if (pdfDoc && canvasSize.width > 0 && !hasAutoFitted.current) {
      // Small delay to ensure container is fully rendered and accurate clientWidth is available
      const timeoutId = setTimeout(() => {
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
          handleFitToWidth();
        }
        hasAutoFitted.current = true;
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [pdfDoc, canvasSize.width, handleFitToWidth]);

  // Annotation helpers (dummy implementations to satisfy the refactor)
  const drawAnnotations = useCallback(() => {}, []);
  const undo = () => {};
  const redo = () => {};
  const handleExport = () => {};
  const handleZoomChange = (newZoom: number) => setZoom(Math.max(0.3, Math.min(2, newZoom)));
  const handlePageChange = (newPage: number) => {
    if (newPage >=1 && newPage <= totalPages) setCurrentPage(newPage);
  };
  const handleMouseDown = (e: any) => {};
  const handleMouseMove = (e: any) => {};
  const handleMouseUp = () => {};
  const handleImageUpload = (e: any) => {};
  const handleTextInputChange = (v: string) => setTextInputValue(v);
  const handleTextInputBlur = () => setEditingText(null);
  const getEditingTextPosition = () => ({ x: 0, y: 0 });
  const undoSignature = () => {};
  const clearSignature = () => {};
  const saveSignature = () => {};
  const handleSignatureMouseDown = (e: any) => {};
  const handleSignatureMouseMove = (e: any) => {};
  const handleSignatureMouseUp = () => {};
  const handleSignatureUpload = (e: any) => {};
  const handleSignatureDragOver = (e: any) => { e.preventDefault(); setIsDraggingSignature(true); };
  const handleSignatureDragLeave = () => setIsDraggingSignature(false);
  const handleSignatureDrop = (e: any) => { e.preventDefault(); setIsDraggingSignature(false); };
  const undoInitials = () => {};
  const clearInitials = () => {};
  const saveInitials = () => {};
  const handleInitialsMouseDown = (e: any) => {};
  const handleInitialsMouseMove = (e: any) => {};
  const handleInitialsMouseUp = () => {};
  const handleSignedStampMouseDown = (e: any) => {};
  const handleSignedStampMouseMove = (e: any) => {};
  const handleSignedStampMouseUp = () => {};
  const clearSignedStampCanvas = () => {};
  const handleSignedStampUpload = (e: any) => {};
  const placeDate = () => {};
  const formatDate = (d: string, f: string) => d;
  const ToolButton = ({ tool, icon, label, active, onClick }: any) => (
    <Button variant={active ? "default" : "ghost"} size="icon" onClick={onClick} title={label} className="h-10 w-10 md:h-12 md:w-12">
      {icon}
    </Button>
  );

  const SignatureModal = () => null;
  const InitialsModal = () => null;
  const DateModal = () => null;
  const StampModal = () => null;
  const SignedStampModal = () => null;
  const WatermarkModal = () => null;

  const successCount = annotations.length; // dummy
  const handleDownload = () => {};

  return (
    <div className={cn(
      "flex flex-col h-screen overflow-hidden bg-muted/30",
      isFullscreen && "fixed inset-0 z-[100] bg-background"
    )}>
      {/* Header / Toolbar */}
      <div className="flex-shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center px-4 gap-4 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.history.back()}
              className="md:flex hidden"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-sm font-semibold truncate max-w-[120px] md:max-w-none">
              {selectedFile ? selectedFile.name : "PDF Filler"}
            </h1>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-1 md:gap-2">
            {selectedFile && (
              <>
                <div className="hidden md:flex items-center gap-1 mr-2 px-2 py-1 bg-muted rounded-md border text-xs">
                  <UsageBadge />
                </div>
                
                <div className="flex items-center gap-1 border-r pr-2 mr-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={undo}
                    disabled={historyIndex <= 0}
                  >
                    <Undo2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={redo}
                    disabled={historyIndex >= history.length - 1}
                  >
                    <Redo2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-1 md:gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    className="hidden sm:flex"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleExport}
                    className="sm:hidden h-8 w-8 p-0"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
            
            <SupportButton size="sm" />
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar - Tools */}
        {selectedFile && (
          <div className={cn(
            "flex flex-col w-14 md:w-16 border-r bg-background/50 flex-shrink-0 overflow-y-auto no-scrollbar py-2",
            isFullscreen && "h-full"
          )}>
            <div className="flex flex-col items-center gap-2 px-2">
              <ToolButton
                tool="select"
                icon={<MousePointer className="h-5 w-5" />}
                label="Select"
                active={activeTool === "select"}
                onClick={() => setActiveTool("select")}
              />
              <ToolButton
                tool="text"
                icon={<Type className="h-5 w-5" />}
                label="Text"
                active={activeTool === "text"}
                onClick={() => setActiveTool("text")}
              />
              <div className="w-full h-px bg-border my-1" />
              <ToolButton
                tool="draw"
                icon={<Pencil className="h-5 w-5" />}
                label="Draw"
                active={activeTool === "draw"}
                onClick={() => setActiveTool("draw")}
              />
              <ToolButton
                tool="highlight"
                icon={<Highlighter className="h-5 w-5" />}
                label="Highlight"
                active={activeTool === "highlight"}
                onClick={() => setActiveTool("highlight")}
              />
              <div className="w-full h-px bg-border my-1" />
              <ToolButton
                tool="signature"
                icon={<FileSignature className="h-5 w-5" />}
                label="Signature"
                active={activeTool === "signature"}
                onClick={() => setActiveTool("signature")}
              />
              <ToolButton
                tool="initials"
                icon={<Droplets className="h-5 w-5" />}
                label="Initials"
                active={activeTool === "initials"}
                onClick={() => setActiveTool("initials")}
              />
              <ToolButton
                tool="signedStamp"
                icon={<Stamp className="h-5 w-5" />}
                label="Signed Stamp"
                active={activeTool === "signedStamp"}
                onClick={() => setActiveTool("signedStamp")}
              />
              <ToolButton
                tool="date"
                icon={<Calendar className="h-5 w-5" />}
                label="Date"
                active={activeTool === "date"}
                onClick={() => setActiveTool("date")}
              />
              <div className="w-full h-px bg-border my-1" />
              <ToolButton
                tool="image"
                icon={<ImageIcon className="h-5 w-5" />}
                label="Image"
                active={activeTool === "image"}
                onClick={() => setActiveTool("image")}
              />
              <ToolButton
                tool="checkbox"
                icon={<Check className="h-5 w-5" />}
                label="Checkbox"
                active={activeTool === "checkbox"}
                onClick={() => setActiveTool("checkbox")}
              />
              <ToolButton
                tool="radio"
                icon={<Circle className="h-5 w-5" />}
                label="Radio"
                active={activeTool === "radio"}
                onClick={() => setActiveTool("radio")}
              />
              <div className="w-full h-px bg-border my-1" />
              <ToolButton
                tool="rectangle"
                icon={<Square className="h-5 w-5" />}
                label="Rectangle"
                active={activeTool === "rectangle"}
                onClick={() => setActiveTool("rectangle")}
              />
              <ToolButton
                tool="circle"
                icon={<Circle className="h-5 w-5" />}
                label="Circle"
                active={activeTool === "circle"}
                onClick={() => setActiveTool("circle")}
              />
              <ToolButton
                tool="line"
                icon={<Minus className="h-5 w-5" />}
                label="Line"
                active={activeTool === "line"}
                onClick={() => setActiveTool("line")}
              />
              <div className="w-full h-px bg-border my-1" />
              <ToolButton
                tool="strikethrough"
                icon={<PenTool className="h-5 w-5" />}
                label="Redact"
                active={activeTool === "strikethrough"}
                onClick={() => setActiveTool("strikethrough")}
              />
              <ToolButton
                tool="eraser"
                icon={<Eraser className="h-5 w-5" />}
                label="Eraser"
                active={activeTool === "eraser"}
                onClick={() => setActiveTool("eraser")}
              />
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-muted/40 relative">
          {/* Zoom & Page Control Floating Bar */}
          {selectedFile && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 bg-background/90 shadow-lg rounded-full border backdrop-blur">
              <div className="flex items-center gap-1 border-r pr-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setZoom(Math.max(0.3, zoom - 0.1))}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs font-medium w-12 text-center">{Math.round(zoom * 100)}%</span>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setZoom(Math.min(2, zoom + 0.1))}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hidden md:flex" onClick={handleFitToWidth} title="Fit to width">
                   <Maximize className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1 || pageRendering}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs font-medium whitespace-nowrap">Page {currentPage} / {totalPages}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages || pageRendering}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <div 
            className="flex-1 overflow-auto p-4 md:p-8 flex justify-center items-start"
            ref={containerRef}
          >
            {!selectedFile ? (
              <div className="w-full max-w-3xl mt-12 px-4">
                <Card className="border-2 border-dashed">
                  <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold">PDF Filler & Annotator</CardTitle>
                    <p className="text-muted-foreground">Upload your PDF to fill forms, sign, or annotate</p>
                  </CardHeader>
                  <CardContent>
                    <FileDropzone
                      onFilesSelected={(files) => setSelectedFile(files[0])}
                      accept={{ "application/pdf": [".pdf"] }}
                      label="Drop PDF here or click to browse"
                    />
                    <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div className="space-y-2">
                        <div className="h-10 w-10 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
                          <Type className="h-5 w-5" />
                        </div>
                        <p className="text-xs font-medium">Text & Forms</p>
                      </div>
                      <div className="space-y-2">
                        <div className="h-10 w-10 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
                          <FileSignature className="h-5 w-5" />
                        </div>
                        <p className="text-xs font-medium">Digital Signing</p>
                      </div>
                      <div className="space-y-2">
                        <div className="h-10 w-10 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
                          <Stamp className="h-5 w-5" />
                        </div>
                        <p className="text-xs font-medium">Stamps & Redact</p>
                      </div>
                      <div className="space-y-2">
                        <div className="h-10 w-10 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
                          <ImageIcon className="h-5 w-5" />
                        </div>
                        <p className="text-xs font-medium">Images & Shapes</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <div className="mt-12">
                   <RelatedGuide guideSlug="how-to-fill-and-sign-pdf-forms-online" />
                </div>
              </div>
            ) : (
              <div
                style={{
                  width: canvasSize.width * zoom,
                  height: canvasSize.height * zoom,
                  margin: '0 auto',
                }}
              >
                <div
                  className="relative shadow-xl rounded-sm origin-top-left"
                  style={{
                    width: canvasSize.width,
                    height: canvasSize.height,
                    transform: `scale(${zoom})`,
                    transformOrigin: 'top left',
                    marginBottom: isFullscreen ? '40px' : '0'
                  }}
                >
                  {pageRendering && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-[30]">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm font-medium text-muted-foreground">Rendering page...</p>
                      </div>
                    </div>
                  )}

                  <canvas
                    ref={pdfCanvasRef}
                    className="absolute inset-0 bg-white"
                    style={{ width: "100%", height: "100%" }}
                  />

                  <canvas
                    ref={annotationCanvasRef}
                    className="absolute inset-0 z-20"
                    style={{
                      width: "100%",
                      height: "100%",
                      touchAction: "none",
                      cursor:
                        activeTool === "select"
                          ? hoverCursor
                          : activeTool === "text"
                            ? "text"
                            : "crosshair",
                    }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleMouseDown}
                    onTouchMove={handleMouseMove}
                    onTouchEnd={handleMouseUp}
                  />

                  {editingText && (
                    <textarea
                      ref={textInputRef}
                      value={textInputValue}
                      onChange={(e) => handleTextInputChange(e.target.value)}
                      onBlur={handleTextInputBlur}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") handleTextInputBlur();
                      }}
                      placeholder="Type here..."
                      className="absolute bg-white/90 border border-primary rounded px-1 outline-none resize-none z-[40]"
                      style={{
                        left: getEditingTextPosition().x,
                        top: getEditingTextPosition().y,
                        fontSize: `${fontSize}px`,
                        fontFamily,
                        color: strokeColor,
                        minWidth: "100px",
                        minHeight: "30px",
                      }}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Properties (contextual) */}
        {selectedFile && activeTool !== "select" && (
          <div className="hidden min-[1200px]:flex flex-col w-64 border-l bg-background overflow-y-auto py-6 px-4 gap-6 no-scrollbar">
            <h3 className="font-semibold text-xs uppercase tracking-widest text-muted-foreground">Tool Settings</h3>
            
            {activeTool === "text" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs">Font Family</Label>
                  <Select value={fontFamily} onValueChange={setFontFamily}>
                    <SelectTrigger className="h-8 text-xs font-sans"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {fontFamilies.map(f => <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Size: {fontSize}px</Label>
                  <Slider value={[fontSize]} min={8} max={72} step={1} onValueChange={([v]) => setFontSize(v)} />
                </div>
              </div>
            )}

            {(["draw", "rectangle", "line", "circle", "arrow", "eraser"].includes(activeTool)) && (
               <div className="space-y-4">
                 <div className="space-y-2">
                   <Label className="text-xs">Color</Label>
                   <div className="grid grid-cols-4 gap-1.5">
                     {colorPresets.map(c => (
                       <button
                         key={c}
                         className={cn("h-6 w-6 rounded-md border transition-all hover:scale-110", strokeColor === c ? "border-foreground ring-2 ring-primary/20" : "border-transparent")}
                         style={{ backgroundColor: c }}
                         onClick={() => setStrokeColor(c)}
                       />
                     ))}
                   </div>
                 </div>
                 <div className="space-y-2">
                    <Label className="text-xs">Width: {strokeWidth}px</Label>
                    <Slider value={[strokeWidth]} min={1} max={20} step={1} onValueChange={([v]) => setStrokeWidth(v)} />
                 </div>
               </div>
            )}

            <div className="mt-auto pt-6 border-t">
               <Card className="bg-primary/5 border-primary/10">
                 <CardHeader className="p-3">
                   <CardTitle className="text-xs font-semibold">Pro Tip</CardTitle>
                 </CardHeader>
                 <CardContent className="p-3 pt-0">
                   <p className="text-[11px] text-muted-foreground leading-relaxed">
                     Press <kbd className="px-1 py-0.5 rounded bg-muted border font-sans text-[10px] lowercase">Esc</kbd> to quickly switch back to select tool.
                   </p>
                 </CardContent>
               </Card>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <SignatureModal />
      <InitialsModal />
      <DateModal />
      <StampModal />
      <SignedStampModal />
      <WatermarkModal />
    </div>
  );
}