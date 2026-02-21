"use client";

import { RelatedGuide } from "@/components/shared/related-guide";

import { useState, useRef, useCallback, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api, apiHelpers, shouldShowErrorToast } from "@/lib/api";
import { useUpgradeModal } from "@/components/shared/upgrade-modal";
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
  const { showUpgradeModal } = useUpgradeModal();
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

  const hasRemainingUses = usageData?.remaining > 0 || usageData?.is_unlimited;

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

  // Signature modal
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawingSignature, setIsDrawingSignature] = useState(false);
  const [signatureHistory, setSignatureHistory] = useState<ImageData[]>([]);
  const [signatureMode, setSignatureMode] = useState<"draw" | "upload">("draw");
  const signatureUploadRef = useRef<HTMLInputElement>(null);

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
    const containerWidth = containerRef.current.clientWidth - 32; // Account for padding
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

  // Draw annotations on the annotation canvas
  const drawAnnotations = useCallback(() => {
    const canvas = annotationCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const pixelRatio = window.devicePixelRatio || 1;

    // Reset transform and clear canvas
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply pixel ratio scaling for high-DPI rendering
    ctx.scale(pixelRatio, pixelRatio);

    // Draw annotations for current page
    const pageAnnotations = annotations.filter((a) => a.page === currentPage);

    for (const ann of pageAnnotations) {
      drawAnnotation(ctx, ann, ann.id === selectedAnnotation);
    }

    // Draw current path (while drawing)
    if (isDrawing && currentPath.length > 1) {
      ctx.strokeStyle = activeTool === "eraser" ? "#ff0000" : strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.setLineDash(activeTool === "eraser" ? [5, 5] : []);
      ctx.beginPath();
      ctx.moveTo(currentPath[0].x, currentPath[0].y);
      for (let i = 1; i < currentPath.length; i++) {
        ctx.lineTo(currentPath[i].x, currentPath[i].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [
    annotations,
    currentPage,
    selectedAnnotation,
    isDrawing,
    currentPath,
    strokeColor,
    strokeWidth,
    activeTool,
  ]);

  useEffect(() => {
    drawAnnotations();
  }, [drawAnnotations]);

  // Draw a single annotation
  const drawAnnotation = (
    ctx: CanvasRenderingContext2D,
    ann: Annotation,
    selected: boolean
  ) => {
    ctx.save();

    if (ann.type === "text") {
      const textAnn = ann as TextAnnotation;
      let fontStyle = "";
      if (textAnn.bold) fontStyle += "bold ";
      if (textAnn.italic) fontStyle += "italic ";
      ctx.font = `${fontStyle}${textAnn.fontSize}px ${textAnn.fontFamily}`;
      ctx.fillStyle = textAnn.color;
      ctx.textBaseline = "top";

      const lines = textAnn.text.split("\n");
      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(
          lines[i],
          textAnn.x,
          textAnn.y + i * textAnn.fontSize * 1.2
        );
      }
    } else if (ann.type === "drawing") {
      const drawAnn = ann as DrawingAnnotation;
      ctx.strokeStyle = drawAnn.color;
      ctx.lineWidth = drawAnn.strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      for (const path of drawAnn.paths) {
        if (path.points.length < 2) continue;
        ctx.beginPath();
        ctx.moveTo(path.points[0].x, path.points[0].y);
        for (let i = 1; i < path.points.length; i++) {
          ctx.lineTo(path.points[i].x, path.points[i].y);
        }
        ctx.stroke();
      }
    } else if (ann.type === "signature") {
      const sigAnn = ann as SignatureAnnotation;
      if (sigAnn.data) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, sigAnn.x, sigAnn.y, sigAnn.width, sigAnn.height);
          if (selected) drawSelectionBorder(ctx, ann);
        };
        img.src = sigAnn.data;
        return; // Return early, selection will be drawn in onload
      }
    } else if (ann.type === "rectangle") {
      const rectAnn = ann as RectangleAnnotation;
      ctx.strokeStyle = rectAnn.color;
      ctx.lineWidth = rectAnn.strokeWidth;
      if (rectAnn.fill) {
        ctx.fillStyle = rectAnn.fillColor;
        ctx.fillRect(rectAnn.x, rectAnn.y, rectAnn.width, rectAnn.height);
      }
      ctx.strokeRect(rectAnn.x, rectAnn.y, rectAnn.width, rectAnn.height);
    } else if (ann.type === "line") {
      const lineAnn = ann as LineAnnotation;
      ctx.strokeStyle = lineAnn.color;
      ctx.lineWidth = lineAnn.strokeWidth;
      ctx.beginPath();
      ctx.moveTo(lineAnn.x1, lineAnn.y1);
      ctx.lineTo(lineAnn.x2, lineAnn.y2);
      ctx.stroke();
    } else if (ann.type === "highlight") {
      const hlAnn = ann as HighlightAnnotation;
      ctx.globalAlpha = hlAnn.opacity;
      ctx.fillStyle = hlAnn.color;
      ctx.fillRect(hlAnn.x, hlAnn.y, hlAnn.width, hlAnn.height);
      ctx.globalAlpha = 1;
    } else if (ann.type === "checkbox") {
      const cbAnn = ann as CheckboxAnnotation;
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      ctx.strokeRect(cbAnn.x, cbAnn.y, cbAnn.width, cbAnn.height);
      if (cbAnn.checked) {
        ctx.strokeStyle = "#16a34a";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cbAnn.x + cbAnn.width * 0.2, cbAnn.y + cbAnn.height * 0.5);
        ctx.lineTo(cbAnn.x + cbAnn.width * 0.4, cbAnn.y + cbAnn.height * 0.75);
        ctx.lineTo(cbAnn.x + cbAnn.width * 0.8, cbAnn.y + cbAnn.height * 0.25);
        ctx.stroke();
      }
    } else if (ann.type === "image") {
      const imgAnn = ann as ImageAnnotation;
      if (imgAnn.data) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, imgAnn.x, imgAnn.y, imgAnn.width, imgAnn.height);
          if (selected) drawSelectionBorder(ctx, ann);
        };
        img.src = imgAnn.data;
        return;
      }
    } else if (ann.type === "circle") {
      const circleAnn = ann as CircleAnnotation;
      ctx.strokeStyle = circleAnn.color;
      ctx.lineWidth = circleAnn.strokeWidth;
      const centerX = circleAnn.x + circleAnn.width / 2;
      const centerY = circleAnn.y + circleAnn.height / 2;
      const radiusX = circleAnn.width / 2;
      const radiusY = circleAnn.height / 2;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
      if (circleAnn.fill) {
        ctx.fillStyle = circleAnn.fillColor;
        ctx.fill();
      }
      ctx.stroke();
    } else if (ann.type === "arrow") {
      const arrowAnn = ann as ArrowAnnotation;
      ctx.strokeStyle = arrowAnn.color;
      ctx.fillStyle = arrowAnn.color;
      ctx.lineWidth = arrowAnn.strokeWidth;

      // Draw line
      ctx.beginPath();
      ctx.moveTo(arrowAnn.x1, arrowAnn.y1);
      ctx.lineTo(arrowAnn.x2, arrowAnn.y2);
      ctx.stroke();

      // Draw arrowhead
      const angle = Math.atan2(arrowAnn.y2 - arrowAnn.y1, arrowAnn.x2 - arrowAnn.x1);
      const headLength = 15;
      ctx.beginPath();
      ctx.moveTo(arrowAnn.x2, arrowAnn.y2);
      ctx.lineTo(
        arrowAnn.x2 - headLength * Math.cos(angle - Math.PI / 6),
        arrowAnn.y2 - headLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        arrowAnn.x2 - headLength * Math.cos(angle + Math.PI / 6),
        arrowAnn.y2 - headLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
    } else if (ann.type === "date") {
      const dateAnn = ann as DateAnnotation;
      ctx.font = `${dateAnn.fontSize}px ${dateAnn.fontFamily}`;
      ctx.fillStyle = dateAnn.color;
      ctx.textBaseline = "top";
      ctx.fillText(dateAnn.text, dateAnn.x, dateAnn.y);
    } else if (ann.type === "stamp") {
      const stampAnn = ann as StampAnnotation;
      const stampInfo = stampPresets.find(s => s.id === stampAnn.stampType);
      const stampLabel = stampAnn.stampType === "custom" ? (stampAnn.customText || "CUSTOM") : (stampInfo?.label || "STAMP");

      ctx.save();
      const centerX = stampAnn.x + stampAnn.width / 2;
      const centerY = stampAnn.y + stampAnn.height / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate((stampAnn.rotation * Math.PI) / 180);

      // Draw stamp border
      ctx.strokeStyle = stampAnn.color;
      ctx.lineWidth = 3;
      if (stampAnn.isDashed) {
        ctx.setLineDash([8, 4]);
      }

      if (stampAnn.shape === "circle") {
        // Draw circle border
        const radius = Math.min(stampAnn.width, stampAnn.height) / 2;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, 2 * Math.PI);
        ctx.stroke();
      } else {
        // Draw rectangle border
        ctx.strokeRect(-stampAnn.width / 2, -stampAnn.height / 2, stampAnn.width, stampAnn.height);
      }
      ctx.setLineDash([]); // Reset dash

      // Draw stamp text
      ctx.fillStyle = stampAnn.color;
      const fontSize = stampAnn.shape === "circle"
        ? Math.min(stampAnn.width * 0.25, 18)
        : Math.min(stampAnn.height * 0.5, 24);
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(stampLabel, 0, 0);

      ctx.restore();
    } else if (ann.type === "strikethrough") {
      const strikeAnn = ann as StrikethroughAnnotation;
      if (strikeAnn.isRedact) {
        // Redact mode - fill with black
        ctx.fillStyle = "#000000";
        ctx.fillRect(strikeAnn.x, strikeAnn.y, strikeAnn.width, strikeAnn.height);
      } else {
        // Strikethrough mode - draw line through middle
        ctx.strokeStyle = strikeAnn.color;
        ctx.lineWidth = strikeAnn.strokeWidth;
        ctx.beginPath();
        ctx.moveTo(strikeAnn.x, strikeAnn.y + strikeAnn.height / 2);
        ctx.lineTo(strikeAnn.x + strikeAnn.width, strikeAnn.y + strikeAnn.height / 2);
        ctx.stroke();
      }
    } else if (ann.type === "initials") {
      const initAnn = ann as InitialsAnnotation;
      if (initAnn.data) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, initAnn.x, initAnn.y, initAnn.width, initAnn.height);
          if (selected) drawSelectionBorder(ctx, ann);
        };
        img.src = initAnn.data;
        return;
      }
    } else if (ann.type === "radio") {
      const radioAnn = ann as RadioAnnotation;
      const centerX = radioAnn.x + radioAnn.width / 2;
      const centerY = radioAnn.y + radioAnn.height / 2;
      const radius = Math.min(radioAnn.width, radioAnn.height) / 2;

      // Draw outer circle
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.stroke();

      // Draw inner filled circle if checked
      if (radioAnn.checked) {
        ctx.fillStyle = "#2563eb";
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.5, 0, 2 * Math.PI);
        ctx.fill();
      }
    } else if (ann.type === "signedStamp") {
      const ssAnn = ann as SignedStampAnnotation;
      const padding = 10;
      const lineHeight = 20;
      const centerX = ssAnn.x + ssAnn.width / 2;
      const centerY = ssAnn.y + ssAnn.height / 2;
      const stampStyle = ssAnn.stampStyle || "modern";
      const textLayout = ssAnn.textLayout || "curved";

      ctx.save();

      // Apply slight rotation for realistic look (classic and official styles)
      if (stampStyle !== "modern") {
        ctx.translate(centerX, centerY);
        ctx.rotate(-0.03); // Slight tilt for authentic look
        ctx.translate(-centerX, -centerY);
      }

      // Set global alpha for worn effect (classic style)
      if (stampStyle === "classic") {
        ctx.globalAlpha = 0.85;
      }

      ctx.strokeStyle = ssAnn.borderColor;
      ctx.fillStyle = ssAnn.borderColor;

      if (ssAnn.shape === "circle") {
        const radius = Math.min(ssAnn.width, ssAnn.height) / 2;

        if (stampStyle === "official") {
          // Official style: double border with stars
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
          ctx.stroke();

          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius - 6, 0, 2 * Math.PI);
          ctx.stroke();

          // Draw small decorative dots around the inner circle
          const dotCount = 24;
          const dotRadius = radius - 12;
          for (let i = 0; i < dotCount; i++) {
            const angle = (i / dotCount) * 2 * Math.PI;
            const dotX = centerX + dotRadius * Math.cos(angle);
            const dotY = centerY + dotRadius * Math.sin(angle);
            ctx.beginPath();
            ctx.arc(dotX, dotY, 1, 0, 2 * Math.PI);
            ctx.fill();
          }
        } else if (stampStyle === "classic") {
          // Classic style: thick border with worn effect
          ctx.lineWidth = 4;
          if (ssAnn.isDashed) {
            ctx.setLineDash([6, 4]);
          }
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
          ctx.stroke();
          ctx.setLineDash([]);

          // Inner decorative ring
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius - 8, 0, 2 * Math.PI);
          ctx.stroke();
        } else {
          // Modern style: clean single border
          ctx.lineWidth = 2;
          if (ssAnn.isDashed) {
            ctx.setLineDash([6, 4]);
          }
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Draw text based on textLayout setting
        if (textLayout === "curved") {
          ctx.font = "bold 10px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          // Draw text along arc
          const text = ssAnn.stampText.toUpperCase();
          const textRadius = radius - 18;
          const startAngle = -Math.PI / 2 - (text.length * 0.08);

          for (let i = 0; i < text.length; i++) {
            const angle = startAngle + (i * 0.16);
            const charX = centerX + textRadius * Math.cos(angle);
            const charY = centerY + textRadius * Math.sin(angle);

            ctx.save();
            ctx.translate(charX, charY);
            ctx.rotate(angle + Math.PI / 2);
            ctx.fillText(text[i], 0, 0);
            ctx.restore();
          }
        } else {
          // Straight text at top
          ctx.font = "bold 11px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillText(ssAnn.stampText.toUpperCase(), centerX, ssAnn.y + padding + 5);
        }

        // Draw signature in middle
        if (ssAnn.signatureData) {
          const img = new Image();
          img.onload = () => {
            const sigSize = radius * 0.8;
            const sigX = centerX - sigSize / 2;
            const sigY = centerY - sigSize / 4;
            ctx.drawImage(img, sigX, sigY, sigSize, sigSize * 0.5);
            ctx.restore();
            if (selected) drawSelectionBorder(ctx, ann);
          };
          img.src = ssAnn.signatureData;
        }

        // Draw date at bottom based on textLayout setting
        if (textLayout === "curved") {
          const dateText = ssAnn.dateText;
          const dateRadius = radius - 18;
          const dateStartAngle = Math.PI / 2 + (dateText.length * 0.06);
          ctx.font = "9px Arial";

          for (let i = 0; i < dateText.length; i++) {
            const angle = dateStartAngle - (i * 0.12);
            const charX = centerX + dateRadius * Math.cos(angle);
            const charY = centerY + dateRadius * Math.sin(angle);

            ctx.save();
            ctx.translate(charX, charY);
            ctx.rotate(angle - Math.PI / 2);
            ctx.fillText(dateText[i], 0, 0);
            ctx.restore();
          }
        } else {
          ctx.font = "10px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";
          ctx.fillText(ssAnn.dateText, centerX, ssAnn.y + ssAnn.height - padding - 5);
        }
      } else {
        // Rectangle shape
        if (stampStyle === "official") {
          // Double border
          ctx.lineWidth = 3;
          ctx.strokeRect(ssAnn.x, ssAnn.y, ssAnn.width, ssAnn.height);
          ctx.lineWidth = 1.5;
          ctx.strokeRect(ssAnn.x + 4, ssAnn.y + 4, ssAnn.width - 8, ssAnn.height - 8);
        } else if (stampStyle === "classic") {
          // Thick border with worn look
          ctx.lineWidth = 4;
          if (ssAnn.isDashed) ctx.setLineDash([6, 4]);
          ctx.strokeRect(ssAnn.x, ssAnn.y, ssAnn.width, ssAnn.height);
          ctx.setLineDash([]);
        } else {
          // Modern: clean border
          ctx.lineWidth = 2;
          if (ssAnn.isDashed) ctx.setLineDash([6, 4]);
          ctx.strokeRect(ssAnn.x, ssAnn.y, ssAnn.width, ssAnn.height);
          ctx.setLineDash([]);
        }

        // Draw stamp text at top
        ctx.font = stampStyle === "official" ? "bold 14px Arial" : "bold 12px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(ssAnn.stampText.toUpperCase(), centerX, ssAnn.y + padding);

        // Draw signature in middle
        if (ssAnn.signatureData) {
          const img = new Image();
          img.onload = () => {
            const sigHeight = ssAnn.height - lineHeight * 2 - padding * 3;
            const sigWidth = ssAnn.width - padding * 2;
            const sigY = ssAnn.y + padding + lineHeight;
            ctx.drawImage(img, ssAnn.x + padding, sigY, sigWidth, sigHeight);
            ctx.restore();
            if (selected) drawSelectionBorder(ctx, ann);
          };
          img.src = ssAnn.signatureData;
        }

        // Draw date at bottom
        ctx.font = "11px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(ssAnn.dateText, centerX, ssAnn.y + ssAnn.height - padding);
      }

      if (!ssAnn.signatureData) ctx.restore();
      if (ssAnn.signatureData) return; // Selection border drawn in image onload
    } else if (ann.type === "watermark") {
      const wmAnn = ann as WatermarkAnnotation;
      const centerX = wmAnn.x + wmAnn.width / 2;
      const centerY = wmAnn.y + wmAnn.height / 2;

      ctx.save();
      ctx.globalAlpha = wmAnn.opacity;

      // Translate to center, rotate, then draw
      ctx.translate(centerX, centerY);
      ctx.rotate((wmAnn.rotation * Math.PI) / 180);

      if (wmAnn.contentType === "text") {
        ctx.font = `bold ${wmAnn.fontSize}px Arial`;
        ctx.fillStyle = wmAnn.color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(wmAnn.content, 0, 0);

        // Draw border if not none
        if (wmAnn.borderStyle !== "none") {
          const textMetrics = ctx.measureText(wmAnn.content);
          const textHeight = wmAnn.fontSize;
          const padding = 10;
          const boxWidth = textMetrics.width + padding * 2;
          const boxHeight = textHeight + padding * 2;

          ctx.strokeStyle = wmAnn.borderColor;
          ctx.lineWidth = 2;
          if (wmAnn.borderStyle === "dashed") {
            ctx.setLineDash([8, 4]);
          } else if (wmAnn.borderStyle === "dotted") {
            ctx.setLineDash([2, 4]);
          } else {
            ctx.setLineDash([]);
          }
          ctx.strokeRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight);
          ctx.setLineDash([]);
        }
      } else if (wmAnn.contentType === "image" && wmAnn.content) {
        const img = new Image();
        img.onload = () => {
          ctx.save();
          ctx.globalAlpha = wmAnn.opacity;
          ctx.translate(centerX, centerY);
          ctx.rotate((wmAnn.rotation * Math.PI) / 180);
          ctx.drawImage(img, -wmAnn.width / 2, -wmAnn.height / 2, wmAnn.width, wmAnn.height);

          // Draw border if not none
          if (wmAnn.borderStyle !== "none") {
            ctx.strokeStyle = wmAnn.borderColor;
            ctx.lineWidth = 2;
            if (wmAnn.borderStyle === "dashed") {
              ctx.setLineDash([8, 4]);
            } else if (wmAnn.borderStyle === "dotted") {
              ctx.setLineDash([2, 4]);
            } else {
              ctx.setLineDash([]);
            }
            ctx.strokeRect(-wmAnn.width / 2, -wmAnn.height / 2, wmAnn.width, wmAnn.height);
            ctx.setLineDash([]);
          }

          ctx.restore();
          if (selected) drawSelectionBorder(ctx, ann);
        };
        img.src = wmAnn.content;
        ctx.restore();
        return; // Selection border drawn in image onload
      }

      ctx.restore();
    }

    // Draw selection border
    if (selected) {
      drawSelectionBorder(ctx, ann);
    }

    ctx.restore();
  };

  const drawSelectionBorder = (
    ctx: CanvasRenderingContext2D,
    ann: Annotation
  ) => {
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(ann.x - 4, ann.y - 4, ann.width + 8, ann.height + 8);
    ctx.setLineDash([]);

    // Draw resize handles
    const handles = [
      { x: ann.x - 4, y: ann.y - 4 },
      { x: ann.x + ann.width, y: ann.y - 4 },
      { x: ann.x - 4, y: ann.y + ann.height },
      { x: ann.x + ann.width, y: ann.y + ann.height },
    ];
    ctx.fillStyle = "#2563eb";
    for (const h of handles) {
      ctx.fillRect(h.x - 4, h.y - 4, 8, 8);
    }
  };

  // Get canvas coordinates from mouse or touch event
  // Uses CSS dimensions (canvasSize) not internal canvas dimensions which include pixelRatio
  const getCanvasCoords = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ): { x: number; y: number } => {
    const canvas = annotationCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    // Use canvasSize (CSS dimensions) instead of canvas.width (internal dimensions with pixelRatio)
    // This ensures coordinates stay consistent regardless of device pixel ratio
    const scaleX = canvasSize.width / rect.width;
    const scaleY = canvasSize.height / rect.height;

    // Handle both mouse and touch events
    let clientX: number, clientY: number;
    if ('touches' in e) {
      // Touch event
      if (e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if (e.changedTouches.length > 0) {
        // For touchend events
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      } else {
        return { x: 0, y: 0 };
      }
    } else {
      // Mouse event
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  // Check if a point is near a resize handle
  const getResizeHandle = (
    coords: { x: number; y: number },
    ann: Annotation
  ): string | null => {
    const handleSize = 12; // Size of the clickable area for handles
    const handles = [
      { name: "nw", x: ann.x - 4, y: ann.y - 4 },
      { name: "ne", x: ann.x + ann.width, y: ann.y - 4 },
      { name: "sw", x: ann.x - 4, y: ann.y + ann.height },
      { name: "se", x: ann.x + ann.width, y: ann.y + ann.height },
    ];

    for (const handle of handles) {
      if (
        Math.abs(coords.x - handle.x) < handleSize &&
        Math.abs(coords.y - handle.y) < handleSize
      ) {
        return handle.name;
      }
    }
    return null;
  };

  // Add to history
  const addToHistory = (newAnnotations: Annotation[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...newAnnotations]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Undo
  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setAnnotations([...history[historyIndex - 1]]);
      setSelectedAnnotation(null);
    }
  };

  // Redo
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setAnnotations([...history[historyIndex + 1]]);
      setSelectedAnnotation(null);
    }
  };

  // Revert all
  const handleRevert = () => {
    setAnnotations([]);
    setHistory([[]]);
    setHistoryIndex(0);
    setSelectedAnnotation(null);
    toast.success("All changes reverted");
  };

  // Delete selected annotation
  const handleDelete = () => {
    if (!selectedAnnotation) return;
    const newAnnotations = annotations.filter(
      (a) => a.id !== selectedAnnotation
    );
    setAnnotations(newAnnotations);
    addToHistory(newAnnotations);
    setSelectedAnnotation(null);
  };

  // Handle mouse/touch down
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    // Prevent default to stop scrolling on touch devices
    if ('touches' in e) {
      e.preventDefault();
    }
    const coords = getCanvasCoords(e);

    if (activeTool === "select") {
      // First, check if clicking on a resize handle of the selected annotation
      if (selectedAnnotation) {
        const selectedAnn = annotations.find((a) => a.id === selectedAnnotation);
        if (selectedAnn && selectedAnn.page === currentPage) {
          const handle = getResizeHandle(coords, selectedAnn);
          if (handle) {
            setResizeHandle(handle);
            setDragStart(coords);
            return;
          }
        }
      }

      // Check if clicked on an annotation
      const pageAnnotations = annotations.filter((a) => a.page === currentPage);
      for (const ann of pageAnnotations.reverse()) {
        if (
          coords.x >= ann.x &&
          coords.x <= ann.x + ann.width &&
          coords.y >= ann.y &&
          coords.y <= ann.y + ann.height
        ) {
          setSelectedAnnotation(ann.id);
          setDragStart(coords);
          setDragOffset({ x: coords.x - ann.x, y: coords.y - ann.y });
          setResizeHandle(null);

          // Handle checkbox toggle
          if (ann.type === "checkbox") {
            const newAnnotations = annotations.map((a) =>
              a.id === ann.id
                ? { ...a, checked: !(a as CheckboxAnnotation).checked }
                : a
            );
            setAnnotations(newAnnotations as Annotation[]);
            addToHistory(newAnnotations as Annotation[]);
          }
          // Handle radio button toggle (uncheck others in same group)
          if (ann.type === "radio") {
            const radioAnn = ann as RadioAnnotation;
            const newAnnotations = annotations.map((a) => {
              if (a.type === "radio") {
                const r = a as RadioAnnotation;
                if (r.groupId === radioAnn.groupId) {
                  return { ...a, checked: a.id === ann.id };
                }
              }
              return a;
            });
            setAnnotations(newAnnotations as Annotation[]);
            addToHistory(newAnnotations as Annotation[]);
          }
          return;
        }
      }
      setSelectedAnnotation(null);
      setResizeHandle(null);
    } else if (activeTool === "text") {
      // Create text annotation
      const id = `text-${Date.now()}`;
      const newAnnotation: TextAnnotation = {
        id,
        type: "text",
        page: currentPage,
        x: coords.x,
        y: coords.y,
        width: 200,
        height: fontSize * 1.5,
        text: "",
        fontSize,
        fontFamily,
        color: strokeColor,
        bold: false,
        italic: false,
      };
      const newAnnotations = [...annotations, newAnnotation];
      setAnnotations(newAnnotations);
      setSelectedAnnotation(id);
      setEditingText(id);
      setTextInputValue("");
      setTimeout(() => textInputRef.current?.focus(), 50);
    } else if (activeTool === "draw" || activeTool === "eraser") {
      setIsDrawing(true);
      setCurrentPath([coords]);
    } else if (activeTool === "signature") {
      if (signatureData) {
        const id = `sig-${Date.now()}`;
        const newAnnotation: SignatureAnnotation = {
          id,
          type: "signature",
          page: currentPage,
          x: coords.x,
          y: coords.y,
          width: 200,
          height: 80,
          data: signatureData,
        };
        const newAnnotations = [...annotations, newAnnotation];
        setAnnotations(newAnnotations);
        addToHistory(newAnnotations);
        setSelectedAnnotation(id);
        // Switch to select tool so user can immediately reposition
        setActiveTool("select");
        toast.success("Signature placed! Drag to reposition.");
      } else {
        setShowSignatureModal(true);
      }
    } else if (activeTool === "rectangle") {
      setIsDrawing(true);
      setDragStart(coords);
    } else if (activeTool === "line") {
      setIsDrawing(true);
      setDragStart(coords);
    } else if (activeTool === "highlight") {
      setIsDrawing(true);
      setDragStart(coords);
    } else if (activeTool === "checkbox") {
      const id = `cb-${Date.now()}`;
      const newAnnotation: CheckboxAnnotation = {
        id,
        type: "checkbox",
        page: currentPage,
        x: coords.x,
        y: coords.y,
        width: 24,
        height: 24,
        checked: false,
      };
      const newAnnotations = [...annotations, newAnnotation];
      setAnnotations(newAnnotations);
      addToHistory(newAnnotations);
      setSelectedAnnotation(id);
    } else if (activeTool === "circle") {
      setIsDrawing(true);
      setDragStart(coords);
    } else if (activeTool === "arrow") {
      setIsDrawing(true);
      setDragStart(coords);
    } else if (activeTool === "date") {
      setDatePosition(coords);
      setShowDateModal(true);
    } else if (activeTool === "stamp") {
      const id = `stamp-${Date.now()}`;
      const stampWidth = stampShape === "circle" ? 100 : (selectedStamp === "custom" ? Math.max(customStampText.length * 12, 100) : 150);
      const stampHeight = stampShape === "circle" ? 100 : 40;
      const newAnnotation: StampAnnotation = {
        id,
        type: "stamp",
        page: currentPage,
        x: coords.x,
        y: coords.y,
        width: stampWidth,
        height: stampHeight,
        stampType: selectedStamp,
        customText: selectedStamp === "custom" ? customStampText : undefined,
        color: stampColor,
        rotation: stampShape === "circle" ? 0 : -15,
        isDashed: stampIsDashed,
        shape: stampShape,
      };
      const newAnnotations = [...annotations, newAnnotation];
      setAnnotations(newAnnotations);
      addToHistory(newAnnotations);
      setSelectedAnnotation(id);
      setActiveTool("select");
      toast.success("Stamp placed!");
    } else if (activeTool === "strikethrough") {
      setIsDrawing(true);
      setDragStart(coords);
    } else if (activeTool === "initials") {
      if (initialsData) {
        const id = `init-${Date.now()}`;
        const newAnnotation: InitialsAnnotation = {
          id,
          type: "initials",
          page: currentPage,
          x: coords.x,
          y: coords.y,
          width: 60,
          height: 30,
          data: initialsData,
        };
        const newAnnotations = [...annotations, newAnnotation];
        setAnnotations(newAnnotations);
        addToHistory(newAnnotations);
        setSelectedAnnotation(id);
        setActiveTool("select");
        toast.success("Initials placed!");
      } else {
        setShowInitialsModal(true);
      }
    } else if (activeTool === "radio") {
      const id = `radio-${Date.now()}`;
      const newAnnotation: RadioAnnotation = {
        id,
        type: "radio",
        page: currentPage,
        x: coords.x,
        y: coords.y,
        width: 20,
        height: 20,
        checked: false,
        groupId: `group-${radioGroupCounter}`,
      };
      const newAnnotations = [...annotations, newAnnotation];
      setAnnotations(newAnnotations);
      addToHistory(newAnnotations);
      setSelectedAnnotation(id);
    } else if (activeTool === "signedStamp") {
      setSignedStampPosition(coords);
      setShowSignedStampModal(true);
    } else if (activeTool === "watermark") {
      setWatermarkPosition(coords);
      setShowWatermarkModal(true);
    }
  };

  // Handle mouse/touch move
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    // Prevent default to stop scrolling on touch devices
    if ('touches' in e) {
      e.preventDefault();
    }
    const coords = getCanvasCoords(e);

    // Update cursor based on hover position when in select mode
    if (activeTool === "select" && !dragStart) {
      if (selectedAnnotation) {
        const selectedAnn = annotations.find((a) => a.id === selectedAnnotation);
        if (selectedAnn && selectedAnn.page === currentPage) {
          const handle = getResizeHandle(coords, selectedAnn);
          if (handle) {
            // Set appropriate resize cursor
            const cursorMap: Record<string, string> = {
              nw: "nwse-resize",
              se: "nwse-resize",
              ne: "nesw-resize",
              sw: "nesw-resize",
            };
            setHoverCursor(cursorMap[handle] || "default");
          } else if (
            coords.x >= selectedAnn.x &&
            coords.x <= selectedAnn.x + selectedAnn.width &&
            coords.y >= selectedAnn.y &&
            coords.y <= selectedAnn.y + selectedAnn.height
          ) {
            setHoverCursor("move");
          } else {
            setHoverCursor("default");
          }
        } else {
          setHoverCursor("default");
        }
      } else {
        setHoverCursor("default");
      }
    }

    if (activeTool === "select" && dragStart && selectedAnnotation) {
      if (resizeHandle) {
        // Resize annotation
        const selectedAnn = annotations.find((a) => a.id === selectedAnnotation);
        if (!selectedAnn) return;

        let newX = selectedAnn.x;
        let newY = selectedAnn.y;
        let newWidth = selectedAnn.width;
        let newHeight = selectedAnn.height;

        const minSize = 20; // Minimum width/height

        switch (resizeHandle) {
          case "se": // Bottom-right
            newWidth = Math.max(minSize, coords.x - selectedAnn.x);
            newHeight = Math.max(minSize, coords.y - selectedAnn.y);
            break;
          case "sw": // Bottom-left
            newWidth = Math.max(minSize, selectedAnn.x + selectedAnn.width - coords.x);
            newHeight = Math.max(minSize, coords.y - selectedAnn.y);
            newX = Math.min(coords.x, selectedAnn.x + selectedAnn.width - minSize);
            break;
          case "ne": // Top-right
            newWidth = Math.max(minSize, coords.x - selectedAnn.x);
            newHeight = Math.max(minSize, selectedAnn.y + selectedAnn.height - coords.y);
            newY = Math.min(coords.y, selectedAnn.y + selectedAnn.height - minSize);
            break;
          case "nw": // Top-left
            newWidth = Math.max(minSize, selectedAnn.x + selectedAnn.width - coords.x);
            newHeight = Math.max(minSize, selectedAnn.y + selectedAnn.height - coords.y);
            newX = Math.min(coords.x, selectedAnn.x + selectedAnn.width - minSize);
            newY = Math.min(coords.y, selectedAnn.y + selectedAnn.height - minSize);
            break;
        }

        const newAnnotations = annotations.map((a) =>
          a.id === selectedAnnotation
            ? { ...a, x: newX, y: newY, width: newWidth, height: newHeight }
            : a
        );
        setAnnotations(newAnnotations as Annotation[]);
      } else {
        // Move annotation
        const newAnnotations = annotations.map((a) =>
          a.id === selectedAnnotation
            ? { ...a, x: coords.x - dragOffset.x, y: coords.y - dragOffset.y }
            : a
        );
        setAnnotations(newAnnotations as Annotation[]);
      }
    } else if (
      (activeTool === "draw" || activeTool === "eraser") &&
      isDrawing
    ) {
      setCurrentPath([...currentPath, coords]);
    } else if (
      (activeTool === "rectangle" ||
        activeTool === "line" ||
        activeTool === "highlight" ||
        activeTool === "circle" ||
        activeTool === "arrow" ||
        activeTool === "strikethrough") &&
      isDrawing &&
      dragStart
    ) {
      // Preview shape while dragging - handled in drawAnnotations via currentPath
      setCurrentPath([dragStart, coords]);
    }
  };

  // Handle mouse/touch up
  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);

    if (activeTool === "select" && dragStart && selectedAnnotation) {
      addToHistory(annotations);
      setDragStart(null);
      setResizeHandle(null);
    } else if (activeTool === "draw" && isDrawing && currentPath.length > 1) {
      const id = `draw-${Date.now()}`;
      const bounds = currentPath.reduce(
        (acc, p) => ({
          minX: Math.min(acc.minX, p.x),
          maxX: Math.max(acc.maxX, p.x),
          minY: Math.min(acc.minY, p.y),
          maxY: Math.max(acc.maxY, p.y),
        }),
        { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
      );

      const newAnnotation: DrawingAnnotation = {
        id,
        type: "drawing",
        page: currentPage,
        x: bounds.minX,
        y: bounds.minY,
        width: Math.max(bounds.maxX - bounds.minX, 1),
        height: Math.max(bounds.maxY - bounds.minY, 1),
        paths: [{ points: [...currentPath] }],
        color: strokeColor,
        strokeWidth,
      };
      const newAnnotations = [...annotations, newAnnotation];
      setAnnotations(newAnnotations);
      addToHistory(newAnnotations);
    } else if (activeTool === "eraser" && isDrawing && currentPath.length > 0) {
      // Remove drawings that intersect with eraser path
      const eraserRadius = strokeWidth * 3;
      const newAnnotations = annotations.filter((a) => {
        if (a.type !== "drawing" || a.page !== currentPage) return true;
        const drawAnn = a as DrawingAnnotation;

        // Check if any eraser point is close to any drawing point
        for (const eraserPoint of currentPath) {
          for (const path of drawAnn.paths) {
            for (const pathPoint of path.points) {
              const dist = Math.sqrt(
                Math.pow(eraserPoint.x - pathPoint.x, 2) +
                Math.pow(eraserPoint.y - pathPoint.y, 2)
              );
              if (dist < eraserRadius) return false;
            }
          }
        }
        return true;
      });

      if (newAnnotations.length !== annotations.length) {
        setAnnotations(newAnnotations);
        addToHistory(newAnnotations);
      }
    } else if (activeTool === "rectangle" && isDrawing && dragStart) {
      const id = `rect-${Date.now()}`;
      const width = Math.abs(coords.x - dragStart.x);
      const height = Math.abs(coords.y - dragStart.y);

      if (width > 5 && height > 5) {
        const newAnnotation: RectangleAnnotation = {
          id,
          type: "rectangle",
          page: currentPage,
          x: Math.min(dragStart.x, coords.x),
          y: Math.min(dragStart.y, coords.y),
          width,
          height,
          color: strokeColor,
          strokeWidth,
          fill: false,
          fillColor: "#FFFFFF",
        };
        const newAnnotations = [...annotations, newAnnotation];
        setAnnotations(newAnnotations);
        addToHistory(newAnnotations);
        setSelectedAnnotation(id);
      }
    } else if (activeTool === "line" && isDrawing && dragStart) {
      const id = `line-${Date.now()}`;
      const newAnnotation: LineAnnotation = {
        id,
        type: "line",
        page: currentPage,
        x: Math.min(dragStart.x, coords.x),
        y: Math.min(dragStart.y, coords.y),
        width: Math.abs(coords.x - dragStart.x) || 1,
        height: Math.abs(coords.y - dragStart.y) || 1,
        x1: dragStart.x,
        y1: dragStart.y,
        x2: coords.x,
        y2: coords.y,
        color: strokeColor,
        strokeWidth,
      };
      const newAnnotations = [...annotations, newAnnotation];
      setAnnotations(newAnnotations);
      addToHistory(newAnnotations);
      setSelectedAnnotation(id);
    } else if (activeTool === "highlight" && isDrawing && dragStart) {
      const id = `hl-${Date.now()}`;
      const width = Math.abs(coords.x - dragStart.x);
      const height = Math.abs(coords.y - dragStart.y);

      if (width > 5 && height > 5) {
        const newAnnotation: HighlightAnnotation = {
          id,
          type: "highlight",
          page: currentPage,
          x: Math.min(dragStart.x, coords.x),
          y: Math.min(dragStart.y, coords.y),
          width,
          height,
          color: highlightColor,
          opacity: 0.35,
        };
        const newAnnotations = [...annotations, newAnnotation];
        setAnnotations(newAnnotations);
        addToHistory(newAnnotations);
        setSelectedAnnotation(id);
      }
    } else if (activeTool === "circle" && isDrawing && dragStart) {
      const id = `circle-${Date.now()}`;
      const width = Math.abs(coords.x - dragStart.x);
      const height = Math.abs(coords.y - dragStart.y);

      if (width > 5 && height > 5) {
        const newAnnotation: CircleAnnotation = {
          id,
          type: "circle",
          page: currentPage,
          x: Math.min(dragStart.x, coords.x),
          y: Math.min(dragStart.y, coords.y),
          width,
          height,
          color: strokeColor,
          strokeWidth,
          fill: false,
          fillColor: "#FFFFFF",
        };
        const newAnnotations = [...annotations, newAnnotation];
        setAnnotations(newAnnotations);
        addToHistory(newAnnotations);
        setSelectedAnnotation(id);
      }
    } else if (activeTool === "arrow" && isDrawing && dragStart) {
      const id = `arrow-${Date.now()}`;
      const newAnnotation: ArrowAnnotation = {
        id,
        type: "arrow",
        page: currentPage,
        x: Math.min(dragStart.x, coords.x),
        y: Math.min(dragStart.y, coords.y),
        width: Math.abs(coords.x - dragStart.x) || 1,
        height: Math.abs(coords.y - dragStart.y) || 1,
        x1: dragStart.x,
        y1: dragStart.y,
        x2: coords.x,
        y2: coords.y,
        color: strokeColor,
        strokeWidth,
      };
      const newAnnotations = [...annotations, newAnnotation];
      setAnnotations(newAnnotations);
      addToHistory(newAnnotations);
      setSelectedAnnotation(id);
    } else if (activeTool === "strikethrough" && isDrawing && dragStart) {
      const id = `strike-${Date.now()}`;
      const width = Math.abs(coords.x - dragStart.x);
      const height = Math.abs(coords.y - dragStart.y);

      if (width > 5 || height > 5) {
        const newAnnotation: StrikethroughAnnotation = {
          id,
          type: "strikethrough",
          page: currentPage,
          x: Math.min(dragStart.x, coords.x),
          y: Math.min(dragStart.y, coords.y),
          width: Math.max(width, 10),
          height: Math.max(height, 10),
          color: strokeColor,
          strokeWidth,
          isRedact: isRedactMode,
        };
        const newAnnotations = [...annotations, newAnnotation];
        setAnnotations(newAnnotations);
        addToHistory(newAnnotations);
        setSelectedAnnotation(id);
      }
    }

    setIsDrawing(false);
    setCurrentPath([]);
    setDragStart(null);
  };

  // Handle text input change
  const handleTextInputChange = (value: string) => {
    setTextInputValue(value);
    if (editingText) {
      // Calculate dimensions based on text
      const lines = value.split("\n");
      const maxLineLength = Math.max(...lines.map((l) => l.length), 10);
      const width = maxLineLength * fontSize * 0.6;
      const height = lines.length * fontSize * 1.2;

      const newAnnotations = annotations.map((a) =>
        a.id === editingText
          ? { ...a, text: value, width: Math.max(width, 50), height: Math.max(height, fontSize * 1.2) }
          : a
      );
      setAnnotations(newAnnotations as Annotation[]);
    }
  };

  // Handle text input blur
  const handleTextInputBlur = () => {
    if (editingText) {
      // Remove empty text annotations
      const ann = annotations.find((a) => a.id === editingText) as TextAnnotation;
      if (ann && !ann.text.trim()) {
        const newAnnotations = annotations.filter((a) => a.id !== editingText);
        setAnnotations(newAnnotations);
        addToHistory(newAnnotations);
      } else {
        addToHistory(annotations);
      }
      setEditingText(null);
    }
  };

  // Handle file select
  const handleFileSelect = (files: File[]) => {
    if (files.length > 0) {
      setSelectedFile(files[0]);
    }
  };

  // Fill mutation
  const fillMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) return;

      showProgress({ status: "processing", message: "Saving annotations..." });

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("annotations", JSON.stringify(annotations));
      // Send the render scale so backend can normalize coordinates
      // Note: zoom is CSS-only and doesn't affect annotation coordinates
      formData.append("canvas_scale", RENDER_SCALE.toString());

      const response = await api.post("/tools/pdf-filler/fill", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    },
    onSuccess: (data) => {
      setStatus("success", "PDF saved!");
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["remaining-uses"] });
    },
    onError: (error: any) => {
      hideProgress();
      if (shouldShowErrorToast(error)) {
        toast.error(error.response?.data?.message || "Failed to save PDF");
      }
    },
  });

  // Handle download
  const handleDownload = () => {
    if (result?.download_url) {
      const link = document.createElement("a");
      link.href = `${API_URL}${result.download_url}`;
      link.download = "filled.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Signature canvas handlers
  const initSignatureCanvas = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 400;
    canvas.height = 150;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    setSignatureHistory([]);
  };

  useEffect(() => {
    if (showSignatureModal) {
      setTimeout(initSignatureCanvas, 100);
    }
  }, [showSignatureModal]);

  const handleSignatureMouseDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Save state for undo
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setSignatureHistory((prev) => [...prev, imageData]);

    setIsDrawingSignature(true);
    const rect = canvas.getBoundingClientRect();

    // Handle both mouse and touch events
    let clientX: number, clientY: number;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      return;
    }

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const handleSignatureMouseMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingSignature) return;
    e.preventDefault();
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();

    // Handle both mouse and touch events
    let clientX: number, clientY: number;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      return;
    }

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const handleSignatureMouseUp = () => {
    setIsDrawingSignature(false);
  };

  const clearSignature = () => {
    initSignatureCanvas();
  };

  const undoSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas || signatureHistory.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prevHistory = [...signatureHistory];
    const lastState = prevHistory.pop();
    if (lastState) {
      ctx.putImageData(lastState, 0, 0);
      setSignatureHistory(prevHistory);
    }
  };

  const saveSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const data = canvas.toDataURL("image/png");
    setSignatureData(data);
    setShowSignatureModal(false);
    setActiveTool("signature");
    toast.success("Signature saved! Click on the PDF to place it.");
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processSignatureFile(file);
    e.target.value = "";
  };

  const processSignatureFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result as string;
      setSignatureData(data);
      setShowSignatureModal(false);
      setActiveTool("signature");
      toast.success("Signature uploaded! Click on the PDF to place it.");
    };
    reader.readAsDataURL(file);
  };

  const [isDraggingSignature, setIsDraggingSignature] = useState(false);

  const handleSignatureDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingSignature(true);
  };

  const handleSignatureDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingSignature(false);
  };

  const handleSignatureDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingSignature(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSignatureFile(file);
    }
  };

  // Image upload
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result as string;
      const id = `img-${Date.now()}`;

      const img = new Image();
      img.onload = () => {
        const maxWidth = 200;
        const scale = maxWidth / img.width;
        const width = maxWidth;
        const height = img.height * scale;

        const newAnnotation: ImageAnnotation = {
          id,
          type: "image",
          page: currentPage,
          x: 100,
          y: 100,
          width,
          height,
          data,
        };
        const newAnnotations = [...annotations, newAnnotation];
        setAnnotations(newAnnotations);
        addToHistory(newAnnotations);
        setSelectedAnnotation(id);
        setActiveTool("select");
        toast.success("Image added! Drag to reposition.");
      };
      img.src = data;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Date formatting helper
  const formatDate = (dateStr: string, format: string): string => {
    const date = new Date(dateStr);
    const months = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    const monthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear();
    const dayPadded = day.toString().padStart(2, "0");
    const monthPadded = (month + 1).toString().padStart(2, "0");

    switch (format) {
      case "MM/DD/YYYY": return `${monthPadded}/${dayPadded}/${year}`;
      case "DD/MM/YYYY": return `${dayPadded}/${monthPadded}/${year}`;
      case "YYYY-MM-DD": return `${year}-${monthPadded}-${dayPadded}`;
      case "MMM DD, YYYY": return `${monthsShort[month]} ${dayPadded}, ${year}`;
      case "DD MMM YYYY": return `${dayPadded} ${monthsShort[month]} ${year}`;
      case "MMMM DD, YYYY": return `${months[month]} ${dayPadded}, ${year}`;
      default: return `${monthPadded}/${dayPadded}/${year}`;
    }
  };

  // Place date annotation
  const placeDate = () => {
    if (!datePosition) return;
    const formattedDate = formatDate(selectedDate, dateFormat);
    const id = `date-${Date.now()}`;
    const newAnnotation: DateAnnotation = {
      id,
      type: "date",
      page: currentPage,
      x: datePosition.x,
      y: datePosition.y,
      width: formattedDate.length * fontSize * 0.6,
      height: fontSize * 1.2,
      text: formattedDate,
      fontSize,
      fontFamily,
      color: strokeColor,
      format: dateFormat,
    };
    const newAnnotations = [...annotations, newAnnotation];
    setAnnotations(newAnnotations);
    addToHistory(newAnnotations);
    setSelectedAnnotation(id);
    setShowDateModal(false);
    setDatePosition(null);
    toast.success("Date placed!");
  };

  // Initials canvas handlers
  const initInitialsCanvas = () => {
    const canvas = initialsCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 200;
    canvas.height = 80;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    setInitialsHistory([]);
  };

  useEffect(() => {
    if (showInitialsModal) {
      setTimeout(initInitialsCanvas, 100);
    }
  }, [showInitialsModal]);

  const handleInitialsMouseDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = initialsCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setInitialsHistory((prev) => [...prev, imageData]);

    setIsDrawingInitials(true);
    const rect = canvas.getBoundingClientRect();

    // Handle both mouse and touch events
    let clientX: number, clientY: number;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      return;
    }

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const handleInitialsMouseMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingInitials) return;
    e.preventDefault();
    const canvas = initialsCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();

    // Handle both mouse and touch events
    let clientX: number, clientY: number;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      return;
    }

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const handleInitialsMouseUp = () => {
    setIsDrawingInitials(false);
  };

  const clearInitials = () => {
    initInitialsCanvas();
  };

  const undoInitials = () => {
    const canvas = initialsCanvasRef.current;
    if (!canvas || initialsHistory.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prevHistory = [...initialsHistory];
    const lastState = prevHistory.pop();
    if (lastState) {
      ctx.putImageData(lastState, 0, 0);
      setInitialsHistory(prevHistory);
    }
  };

  const saveInitials = () => {
    const canvas = initialsCanvasRef.current;
    if (!canvas) return;
    const data = canvas.toDataURL("image/png");
    setInitialsData(data);
    setShowInitialsModal(false);
    setActiveTool("initials");
    toast.success("Initials saved! Click on the PDF to place them.");
  };

  // Signed stamp canvas handlers
  const initSignedStampCanvas = () => {
    const canvas = signedStampCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 280;
    canvas.height = 80;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  useEffect(() => {
    if (showSignedStampModal && signedStampSignatureMode === "draw") {
      setTimeout(initSignedStampCanvas, 100);
    }
  }, [showSignedStampModal, signedStampSignatureMode]);

  const handleSignedStampMouseDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = signedStampCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawingSignedStamp(true);
    const rect = canvas.getBoundingClientRect();

    // Handle both mouse and touch events
    let clientX: number, clientY: number;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      return;
    }

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const handleSignedStampMouseMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingSignedStamp) return;
    e.preventDefault();
    const canvas = signedStampCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();

    // Handle both mouse and touch events
    let clientX: number, clientY: number;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      return;
    }

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const handleSignedStampMouseUp = () => {
    setIsDrawingSignedStamp(false);
  };

  const clearSignedStampCanvas = () => {
    initSignedStampCanvas();
  };

  const handleSignedStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSignedStampSignature(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const placeSignedStamp = () => {
    if (!signedStampPosition) return;

    let sigData = signedStampSignature;
    if (signedStampSignatureMode === "draw") {
      const canvas = signedStampCanvasRef.current;
      if (canvas) {
        sigData = canvas.toDataURL("image/png");
      }
    }

    if (!sigData) {
      toast.error("Please draw or upload a signature");
      return;
    }

    const formattedDate = formatDate(signedStampDate, signedStampDateFormat);
    const id = `signedStamp-${Date.now()}`;
    const size = signedStampShape === "circle" ? 150 : 200;
    const newAnnotation: SignedStampAnnotation = {
      id,
      type: "signedStamp",
      page: currentPage,
      x: signedStampPosition.x,
      y: signedStampPosition.y,
      width: size,
      height: signedStampShape === "circle" ? size : 120,
      stampText: signedStampText,
      signatureData: sigData,
      dateText: formattedDate,
      borderColor: signedStampColor,
      isDashed: signedStampIsDashed,
      shape: signedStampShape,
      stampStyle: signedStampStyle,
      textLayout: signedStampTextLayout,
    };
    const newAnnotations = [...annotations, newAnnotation];
    setAnnotations(newAnnotations);
    addToHistory(newAnnotations);
    setSelectedAnnotation(id);
    setShowSignedStampModal(false);
    setSignedStampPosition(null);
    setActiveTool("select");
    toast.success("Signed stamp placed!");
  };

  // Place watermark function
  const placeWatermark = () => {
    if (!watermarkPosition) return;

    const content = watermarkContentType === "text" ? watermarkText : watermarkImage;
    if (!content) {
      toast.error(watermarkContentType === "text" ? "Please enter watermark text" : "Please upload an image");
      return;
    }

    // Calculate size based on content type
    let width = 200;
    let height = 60;
    if (watermarkContentType === "text") {
      // Estimate text width based on font size
      width = watermarkText.length * watermarkFontSize * 0.6;
      height = watermarkFontSize + 20;
    } else {
      width = 150;
      height = 150;
    }

    const id = `watermark-${Date.now()}`;
    const newAnnotation: WatermarkAnnotation = {
      id,
      type: "watermark",
      page: currentPage,
      x: watermarkPosition.x - width / 2,
      y: watermarkPosition.y - height / 2,
      width,
      height,
      content,
      contentType: watermarkContentType,
      color: watermarkColor,
      opacity: watermarkOpacity,
      rotation: watermarkRotation,
      fontSize: watermarkFontSize,
      borderStyle: watermarkBorderStyle,
      borderColor: watermarkBorderColor,
    };
    const newAnnotations = [...annotations, newAnnotation];
    setAnnotations(newAnnotations);
    addToHistory(newAnnotations);
    setSelectedAnnotation(id);
    setShowWatermarkModal(false);
    setWatermarkPosition(null);
    setActiveTool("select");
    toast.success("Watermark placed!");
  };

  // Handle watermark image upload
  const handleWatermarkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setWatermarkImage(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Generate page thumbnails
  const generateThumbnails = useCallback(async () => {
    if (!pdfDoc) return;
    const newThumbnails: string[] = [];

    for (let i = 1; i <= totalPages; i++) {
      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale: 0.2 });
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: ctx, viewport }).promise;
      newThumbnails.push(canvas.toDataURL());
    }

    setThumbnails(newThumbnails);
  }, [pdfDoc, totalPages]);

  useEffect(() => {
    if (showThumbnails && thumbnails.length === 0 && pdfDoc) {
      generateThumbnails();
    }
  }, [showThumbnails, thumbnails.length, pdfDoc, generateThumbnails]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when not editing text
      if (editingText) return;

      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        handleRedo();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedAnnotation) {
          e.preventDefault();
          handleDelete();
        }
      } else if (e.key === "Escape") {
        setSelectedAnnotation(null);
        setActiveTool("select");
      } else if (e.key === "v" || e.key === "1") {
        setActiveTool("select");
      } else if (e.key === "t" || e.key === "2") {
        setActiveTool("text");
      } else if (e.key === "d" || e.key === "3") {
        setActiveTool("draw");
      } else if (e.key === "s" || e.key === "4") {
        setActiveTool("signature");
      } else if (e.key === "h" || e.key === "5") {
        setActiveTool("highlight");
      } else if (e.key === "r" || e.key === "6") {
        setActiveTool("rectangle");
      } else if (e.key === "c" || e.key === "7") {
        setActiveTool("circle");
      } else if (e.key === "a" || e.key === "8") {
        setActiveTool("arrow");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editingText, selectedAnnotation, historyIndex, history.length]);

  // Tool button component
  const ToolButton = ({
    tool,
    icon: Icon,
    label,
  }: {
    tool: Tool;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
  }) => (
    <button
      onClick={() => setActiveTool(tool)}
      className={cn(
        "flex flex-col items-center justify-center p-2 rounded-lg transition-all",
        activeTool === tool
          ? "bg-primary text-primary-foreground shadow-md"
          : "hover:bg-muted text-muted-foreground hover:text-foreground"
      )}
      title={label}
    >
      <Icon className="h-5 w-5" />
      <span className="text-[10px] mt-1">{label}</span>
    </button>
  );

  // Get editing text annotation position
  // Uses canvasSize (CSS dimensions) instead of internal canvas dimensions
  const getEditingTextPosition = () => {
    if (!editingText) return { x: 0, y: 0 };
    const ann = annotations.find((a) => a.id === editingText);
    if (!ann) return { x: 0, y: 0 };

    const canvas = annotationCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    // Use canvasSize (CSS dimensions) for consistent coordinate transformation
    const scaleX = rect.width / canvasSize.width;
    const scaleY = rect.height / canvasSize.height;

    return {
      x: ann.x * scaleX,
      y: ann.y * scaleY,
    };
  };

  return (
    <div className={cn(
      "flex flex-col",
      isFullscreen
        ? "fixed inset-0 z-[100] bg-background h-screen w-screen"
        : "h-[calc(100vh-4rem)]"
    )}>
      {/* Header - hide in fullscreen */}
      {!isFullscreen && (
        <div className="flex items-center justify-between px-4 py-3 border-b bg-background">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-lg font-semibold">PDF Filler</h1>
              <p className="text-xs text-muted-foreground">
                Fill, sign, and annotate PDFs
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <UsageBadge />
            {pdfDoc && (
              <Button
                onClick={() => fillMutation.mutate()}
                isLoading={fillMutation.isPending}
                disabled={annotations.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Save PDF
              </Button>
            )}
          </div>
        </div>
      )}

      {!pdfDoc ? (
        /* Upload Section - Enhanced Design */
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8 bg-gradient-to-b from-background to-muted/20">
          <div className="w-full max-w-4xl">
            {/* Hero Section */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 mb-4 shadow-lg">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                PDF Filler & Editor
              </h1>
              <p className="text-muted-foreground max-w-md mx-auto">
                Fill out forms, add text, draw, sign documents, and annotate your PDFs directly in the browser
              </p>
            </div>

            {/* Upload Card */}
            <Card className="mb-8 overflow-hidden border-2 border-dashed hover:border-primary/50 transition-colors">
              <CardContent className="p-6 sm:p-10">
                <FileDropzone
                  onFilesSelected={handleFileSelect}
                  accept={{ "application/pdf": [".pdf"] }}
                  selectedFiles={selectedFile ? [selectedFile] : []}
                  onRemoveFile={() => setSelectedFile(null)}
                  label="Drop your PDF here or click to browse"
                />
                {!pdfLib && (
                  <div className="flex items-center justify-center gap-2 mt-4 text-muted-foreground">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Loading PDF viewer...</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Features Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  icon: Type,
                  title: "Add Text",
                  desc: "Type anywhere on your PDF",
                  color: "text-blue-500",
                  bg: "bg-blue-500/10",
                },
                {
                  icon: PenTool,
                  title: "Sign Documents",
                  desc: "Draw or upload signatures",
                  color: "text-purple-500",
                  bg: "bg-purple-500/10",
                },
                {
                  icon: Highlighter,
                  title: "Highlight",
                  desc: "Mark important sections",
                  color: "text-yellow-500",
                  bg: "bg-yellow-500/10",
                },
                {
                  icon: Pencil,
                  title: "Draw & Annotate",
                  desc: "Freehand drawing tools",
                  color: "text-green-500",
                  bg: "bg-green-500/10",
                },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="p-4 rounded-xl bg-card border hover:shadow-md transition-all group"
                >
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-transform group-hover:scale-110",
                    feature.bg
                  )}>
                    <feature.icon className={cn("h-5 w-5", feature.color)} />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground">{feature.desc}</p>
                </div>
              ))}
            </div>

            {/* Additional info */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>100% Private</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>No file upload to cloud</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Works in your browser</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Editor Section */
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Mobile Toolbar - Horizontal scrollable on mobile */}
          <div className="md:hidden border-b bg-muted/30 overflow-x-auto">
            <div className="flex p-2 gap-1 min-w-max">
              <ToolButton tool="select" icon={MousePointer} label="Select" />
              <ToolButton tool="text" icon={Type} label="Text" />
              <ToolButton tool="draw" icon={Pencil} label="Draw" />
              <ToolButton tool="signature" icon={PenTool} label="Sign" />
              <ToolButton tool="initials" icon={PenTool} label="Initials" />
              <ToolButton tool="highlight" icon={Highlighter} label="Highlight" />
              <ToolButton tool="rectangle" icon={Square} label="Rectangle" />
              <ToolButton tool="circle" icon={Circle} label="Circle" />
              <ToolButton tool="line" icon={Minus} label="Line" />
              <ToolButton tool="arrow" icon={MoveRight} label="Arrow" />
              <ToolButton tool="date" icon={Calendar} label="Date" />
              <ToolButton tool="stamp" icon={Stamp} label="Stamp" />
              <ToolButton tool="signedStamp" icon={FileSignature} label="Signed" />
              <ToolButton tool="watermark" icon={Droplets} label="Watermark" />
              <ToolButton tool="checkbox" icon={Check} label="Checkbox" />
              <ToolButton tool="radio" icon={Circle} label="Radio" />
              <ToolButton tool="strikethrough" icon={Minus} label="Strike" />
              <ToolButton tool="image" icon={ImageIcon} label="Image" />
              <ToolButton tool="eraser" icon={Eraser} label="Eraser" />

              <div className="border-l mx-1" />

              {/* Action buttons */}
              <button
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed min-w-[52px]"
                title="Undo"
              >
                <Undo2 className="h-5 w-5" />
                <span className="text-[10px] mt-1">Undo</span>
              </button>
              <button
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed min-w-[52px]"
                title="Redo"
              >
                <Redo2 className="h-5 w-5" />
                <span className="text-[10px] mt-1">Redo</span>
              </button>
              <button
                onClick={handleRevert}
                disabled={annotations.length === 0}
                className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed min-w-[52px]"
                title="Revert"
              >
                <RotateCcw className="h-5 w-5" />
                <span className="text-[10px] mt-1">Revert</span>
              </button>
              {selectedAnnotation && (
                <button
                  onClick={handleDelete}
                  className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-destructive/10 text-destructive min-w-[52px]"
                  title="Delete"
                >
                  <Trash2 className="h-5 w-5" />
                  <span className="text-[10px] mt-1">Delete</span>
                </button>
              )}
            </div>
          </div>

          {/* Desktop Toolbar - Vertical sidebar on desktop */}
          <div className="hidden md:flex w-20 border-r bg-muted/30 flex-col p-2 gap-1 overflow-y-auto">
            <ToolButton tool="select" icon={MousePointer} label="Select" />
            <ToolButton tool="text" icon={Type} label="Text" />
            <ToolButton tool="draw" icon={Pencil} label="Draw" />
            <ToolButton tool="signature" icon={PenTool} label="Sign" />
            <ToolButton tool="initials" icon={PenTool} label="Initials" />
            <ToolButton tool="highlight" icon={Highlighter} label="Highlight" />
            <ToolButton tool="rectangle" icon={Square} label="Rectangle" />
            <ToolButton tool="circle" icon={Circle} label="Circle" />
            <ToolButton tool="line" icon={Minus} label="Line" />
            <ToolButton tool="arrow" icon={MoveRight} label="Arrow" />
            <ToolButton tool="date" icon={Calendar} label="Date" />
            <ToolButton tool="stamp" icon={Stamp} label="Stamp" />
            <ToolButton tool="signedStamp" icon={FileSignature} label="Signed" />
            <ToolButton tool="watermark" icon={Droplets} label="Watermark" />
            <ToolButton tool="checkbox" icon={Check} label="Checkbox" />
            <ToolButton tool="radio" icon={Circle} label="Radio" />
            <ToolButton tool="strikethrough" icon={Minus} label="Strike" />
            <ToolButton tool="image" icon={ImageIcon} label="Image" />
            <ToolButton tool="eraser" icon={Eraser} label="Eraser" />

            <div className="border-t my-2" />

            {/* Action buttons */}
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="h-5 w-5" />
              <span className="text-[10px] mt-1">Undo</span>
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="h-5 w-5" />
              <span className="text-[10px] mt-1">Redo</span>
            </button>
            <button
              onClick={handleRevert}
              disabled={annotations.length === 0}
              className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              title="Revert All Changes"
            >
              <RotateCcw className="h-5 w-5" />
              <span className="text-[10px] mt-1">Revert</span>
            </button>
            {selectedAnnotation && (
              <button
                onClick={handleDelete}
                className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-destructive/10 text-destructive"
                title="Delete Selected"
              >
                <Trash2 className="h-5 w-5" />
                <span className="text-[10px] mt-1">Delete</span>
              </button>
            )}
          </div>

          {/* Canvas Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tool Settings Bar */}
            <div className="flex items-center gap-2 sm:gap-4 px-2 sm:px-4 py-2 border-b bg-background flex-nowrap md:flex-wrap overflow-x-auto whitespace-nowrap">
              {(activeTool === "draw" ||
                activeTool === "text" ||
                activeTool === "rectangle" ||
                activeTool === "line" ||
                activeTool === "circle" ||
                activeTool === "arrow" ||
                activeTool === "strikethrough" ||
                activeTool === "date") && (
                  <>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Color:</Label>
                      <div className="flex gap-1">
                        {colorPresets.map((color) => (
                          <button
                            key={color}
                            onClick={() => setStrokeColor(color)}
                            className={cn(
                              "w-6 h-6 rounded border-2 transition-all",
                              strokeColor === color
                                ? "border-primary ring-2 ring-primary/30 scale-110"
                                : "border-gray-300 hover:border-gray-400"
                            )}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                    {activeTool !== "text" && activeTool !== "date" && (
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Width:</Label>
                        <Slider
                          value={[strokeWidth]}
                          onValueChange={([v]) => setStrokeWidth(v)}
                          min={1}
                          max={10}
                          step={1}
                          className="w-24"
                        />
                        <span className="text-xs text-muted-foreground w-4">
                          {strokeWidth}
                        </span>
                      </div>
                    )}
                  </>
                )}

              {activeTool === "strikethrough" && (
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Mode:</Label>
                  <Button
                    size="sm"
                    variant={isRedactMode ? "default" : "outline"}
                    onClick={() => setIsRedactMode(!isRedactMode)}
                  >
                    {isRedactMode ? "Redact (Black)" : "Strikethrough"}
                  </Button>
                </div>
              )}

              {activeTool === "stamp" && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Label className="text-xs">Type:</Label>
                  <Select value={selectedStamp} onValueChange={(v) => {
                    setSelectedStamp(v as typeof selectedStamp);
                    const preset = stampPresets.find(s => s.id === v);
                    if (preset) setStampColor(preset.color);
                  }}>
                    <SelectTrigger className="w-32 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {stampPresets.map((stamp) => (
                        <SelectItem key={stamp.id} value={stamp.id}>
                          <span style={{ color: stamp.color, fontWeight: "bold" }}>{stamp.label}</span>
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">
                        <span className="font-bold">CUSTOM...</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {selectedStamp === "custom" && (
                    <input
                      type="text"
                      value={customStampText}
                      onChange={(e) => setCustomStampText(e.target.value.toUpperCase())}
                      placeholder="CUSTOM TEXT"
                      className="w-28 h-8 px-2 text-xs border rounded bg-background"
                    />
                  )}
                  <Label className="text-xs">Color:</Label>
                  <div className="flex gap-1">
                    {["#16a34a", "#dc2626", "#2563eb", "#9333ea", "#6b7280", "#000000"].map((color) => (
                      <button
                        key={color}
                        onClick={() => setStampColor(color)}
                        className={`w-6 h-6 rounded border-2 ${stampColor === color ? "ring-2 ring-primary" : ""}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant={stampIsDashed ? "default" : "outline"}
                    onClick={() => setStampIsDashed(!stampIsDashed)}
                    className="h-8"
                  >
                    {stampIsDashed ? "Dashed" : "Solid"}
                  </Button>
                  <Label className="text-xs">Shape:</Label>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant={stampShape === "box" ? "default" : "outline"}
                      onClick={() => setStampShape("box")}
                      className="h-8 w-8 p-0"
                      title="Rectangle"
                    >
                      <Square className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={stampShape === "circle" ? "default" : "outline"}
                      onClick={() => setStampShape("circle")}
                      className="h-8 w-8 p-0"
                      title="Circle"
                    >
                      <Circle className="h-4 w-4" />
                    </Button>
                  </div>
                  <span className="text-xs text-muted-foreground">Click on PDF to place</span>
                </div>
              )}

              {activeTool === "signedStamp" && (
                <span className="text-xs text-muted-foreground">
                  Click on PDF to create a signed stamp with your signature and date
                </span>
              )}

              {activeTool === "watermark" && (
                <span className="text-xs text-muted-foreground">
                  Click on PDF to add a customizable watermark (text or logo)
                </span>
              )}

              {activeTool === "radio" && (
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Group:</Label>
                  <Select value={radioGroupCounter.toString()} onValueChange={(v) => setRadioGroupCounter(parseInt(v))}>
                    <SelectTrigger className="w-24 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((g) => (
                        <SelectItem key={g} value={g.toString()}>Group {g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground">Radio buttons in same group are linked</span>
                </div>
              )}

              {activeTool === "eraser" && (
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Eraser Size:</Label>
                  <Slider
                    value={[strokeWidth]}
                    onValueChange={([v]) => setStrokeWidth(v)}
                    min={5}
                    max={30}
                    step={1}
                    className="w-24"
                  />
                  <span className="text-xs text-muted-foreground w-6">
                    {strokeWidth}
                  </span>
                </div>
              )}

              {activeTool === "text" && (
                <>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Font:</Label>
                    <Select value={fontFamily} onValueChange={setFontFamily}>
                      <SelectTrigger className="w-32 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fontFamilies.map((f) => (
                          <SelectItem key={f} value={f}>
                            {f}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Size:</Label>
                    <Slider
                      value={[fontSize]}
                      onValueChange={([v]) => setFontSize(v)}
                      min={10}
                      max={48}
                      step={1}
                      className="w-24"
                    />
                    <span className="text-xs text-muted-foreground w-6">
                      {fontSize}
                    </span>
                  </div>
                </>
              )}

              {activeTool === "highlight" && (
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Highlight:</Label>
                  <div className="flex gap-1">
                    {highlightColors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setHighlightColor(color)}
                        className={cn(
                          "w-6 h-6 rounded border-2 transition-all",
                          highlightColor === color
                            ? "border-primary ring-2 ring-primary/30 scale-110"
                            : "border-gray-300"
                        )}
                        style={{ backgroundColor: color, opacity: 0.5 }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {activeTool === "signature" && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowSignatureModal(true)}
                  >
                    <PenTool className="h-4 w-4 mr-1" />
                    {signatureData ? "Change Signature" : "Create Signature"}
                  </Button>
                  {signatureData && (
                    <span className="text-xs text-green-600">
                      Click on PDF to place
                    </span>
                  )}
                </div>
              )}

              {activeTool === "initials" && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowInitialsModal(true)}
                  >
                    <PenTool className="h-4 w-4 mr-1" />
                    {initialsData ? "Change Initials" : "Create Initials"}
                  </Button>
                  {initialsData && (
                    <span className="text-xs text-green-600">
                      Click on PDF to place
                    </span>
                  )}
                </div>
              )}

              {activeTool === "date" && (
                <span className="text-xs text-muted-foreground">
                  Click on PDF to place a date
                </span>
              )}

              {activeTool === "image" && (
                <>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => imageInputRef.current?.click()}
                  >
                    <ImageIcon className="h-4 w-4 mr-1" />
                    Upload Image
                  </Button>
                </>
              )}

              {/* Zoom controls - CSS transform only, no re-renders */}
              <div className="ml-auto flex items-center gap-1 sm:gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setZoom(Math.max(0.3, zoom - 0.1))}
                  disabled={zoom <= 0.3}
                  className="px-2"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleFitToWidth}
                  className="px-2 text-xs"
                  title="Fit to width"
                >
                  Fit
                </Button>
                <Button
                  size="sm"
                  variant={zoom === 1.0 ? "secondary" : "ghost"}
                  onClick={handleResetZoom}
                  className="px-2 text-xs min-w-[3rem]"
                  title="Reset to 100%"
                >
                  {Math.round(zoom * 100)}%
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                  disabled={zoom >= 2}
                  className="px-2"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <div className="w-px h-4 bg-border mx-1" />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={toggleFullscreen}
                  className="px-2"
                  title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                >
                  {isFullscreen ? (
                    <Minimize className="h-4 w-4" />
                  ) : (
                    <Maximize className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Canvas Container - scrollable for pan, CSS transform for zoom (no re-renders) */}
            <div
              ref={containerRef}
              className="flex-1 overflow-auto bg-muted/50 p-2 sm:p-4"
            >
              {/* Wrapper div with scaled dimensions to enable proper scrolling */}
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
                    // CSS transform for zoom - doesn't re-render the PDF
                    transform: `scale(${zoom})`,
                    transformOrigin: 'top left',
                  }}
                >
                  {pageRendering && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                      <p className="text-muted-foreground">Rendering page...</p>
                    </div>
                  )}

                  {/* PDF Canvas (background) */}
                  <canvas
                    ref={pdfCanvasRef}
                    className="absolute inset-0 bg-white"
                    style={{ width: "100%", height: "100%" }}
                  />

                  {/* Annotation Canvas (foreground) */}
                  <canvas
                    ref={annotationCanvasRef}
                    className="absolute inset-0"
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

                  {/* Text input overlay */}
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
                      className="absolute bg-white/90 border border-primary rounded px-1 outline-none resize-none"
                      style={{
                        left: getEditingTextPosition().x,
                        top: getEditingTextPosition().y,
                        fontSize: `${fontSize * (annotationCanvasRef.current ? annotationCanvasRef.current.getBoundingClientRect().width / annotationCanvasRef.current.width : 1)}px`,
                        fontFamily,
                        color: strokeColor,
                        minWidth: "100px",
                        minHeight: "30px",
                      }}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Page Navigation */}
            <div className="flex items-center justify-center gap-2 sm:gap-4 px-2 sm:px-4 py-2 sm:py-3 border-t bg-background">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1 || pageRendering}
                className="px-2 sm:px-3"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs sm:text-sm font-medium whitespace-nowrap">
                {currentPage} / {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage >= totalPages || pageRendering}
                className="px-2 sm:px-3"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Right Sidebar - Result (hidden on mobile, shown as floating button) */}
          {result && (
            <>
              {/* Mobile: Floating download button */}
              <div className="md:hidden fixed bottom-4 right-4 z-50">
                <Button onClick={handleDownload} size="lg" className="shadow-lg">
                  <Download className="h-5 w-5 mr-2" />
                  Download PDF
                </Button>
              </div>
              {/* Desktop: Sidebar */}
              <div className="hidden md:block w-64 border-l bg-background p-4">
                <h3 className="font-medium mb-4">Result</h3>
                <div className="space-y-3">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium">filled.pdf</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(result.size)}
                    </p>
                  </div>
                  <Button onClick={handleDownload} className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Signature Modal */}
      {showSignatureModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-[480px]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Add Your Signature</CardTitle>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowSignatureModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mode Tabs */}
              <div className="flex border rounded-lg overflow-hidden">
                <button
                  onClick={() => setSignatureMode("draw")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium transition-colors",
                    signatureMode === "draw"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80 text-muted-foreground"
                  )}
                >
                  <PenTool className="h-4 w-4" />
                  Draw
                </button>
                <button
                  onClick={() => setSignatureMode("upload")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium transition-colors",
                    signatureMode === "upload"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80 text-muted-foreground"
                  )}
                >
                  <Upload className="h-4 w-4" />
                  Upload
                </button>
              </div>

              {signatureMode === "draw" ? (
                <>
                  <div className="border-2 rounded-lg overflow-hidden bg-white">
                    <canvas
                      ref={signatureCanvasRef}
                      className="w-full cursor-crosshair"
                      style={{ height: 150, touchAction: "none" }}
                      onMouseDown={handleSignatureMouseDown}
                      onMouseMove={handleSignatureMouseMove}
                      onMouseUp={handleSignatureMouseUp}
                      onMouseLeave={handleSignatureMouseUp}
                      onTouchStart={handleSignatureMouseDown}
                      onTouchMove={handleSignatureMouseMove}
                      onTouchEnd={handleSignatureMouseUp}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Draw your signature above using your finger or stylus
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={undoSignature}
                      disabled={signatureHistory.length === 0}
                    >
                      <Undo2 className="h-4 w-4 mr-1" />
                      Undo
                    </Button>
                    <Button variant="outline" size="sm" onClick={clearSignature}>
                      <Eraser className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                    <Button onClick={saveSignature} className="flex-1">
                      <Check className="h-4 w-4 mr-1" />
                      Use Signature
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <input
                    ref={signatureUploadRef}
                    type="file"
                    accept="image/*"
                    onChange={handleSignatureUpload}
                    className="hidden"
                  />
                  <div
                    onClick={() => signatureUploadRef.current?.click()}
                    onDragOver={handleSignatureDragOver}
                    onDragLeave={handleSignatureDragLeave}
                    onDrop={handleSignatureDrop}
                    className={cn(
                      "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                      isDraggingSignature
                        ? "border-primary bg-primary/10"
                        : "hover:border-primary hover:bg-muted/50"
                    )}
                  >
                    <Upload className={cn(
                      "h-10 w-10 mx-auto mb-3 transition-colors",
                      isDraggingSignature ? "text-primary" : "text-muted-foreground"
                    )} />
                    <p className="text-sm font-medium">
                      {isDraggingSignature
                        ? "Drop your signature image here"
                        : "Drag & drop or click to upload"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG, or GIF (transparent background recommended)
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Upload an image of your signature for a professional look
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Date Modal */}
      {showDateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-[400px]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Insert Date</CardTitle>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  setShowDateModal(false);
                  setDatePosition(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Date</Label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label>Date Format</Label>
                <Select value={dateFormat} onValueChange={setDateFormat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dateFormats.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.example}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Preview</p>
                <p className="text-lg font-medium mt-1">
                  {formatDate(selectedDate, dateFormat)}
                </p>
              </div>
              <Button onClick={placeDate} className="w-full">
                <Calendar className="h-4 w-4 mr-2" />
                Insert Date
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Initials Modal */}
      {showInitialsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-[320px]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Draw Your Initials</CardTitle>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowInitialsModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 rounded-lg overflow-hidden bg-white">
                <canvas
                  ref={initialsCanvasRef}
                  className="w-full cursor-crosshair"
                  style={{ height: 80, touchAction: "none" }}
                  onMouseDown={handleInitialsMouseDown}
                  onMouseMove={handleInitialsMouseMove}
                  onMouseUp={handleInitialsMouseUp}
                  onMouseLeave={handleInitialsMouseUp}
                  onTouchStart={handleInitialsMouseDown}
                  onTouchMove={handleInitialsMouseMove}
                  onTouchEnd={handleInitialsMouseUp}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Draw your initials using your finger (e.g., JD, AB)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={undoInitials}
                  disabled={initialsHistory.length === 0}
                >
                  <Undo2 className="h-4 w-4 mr-1" />
                  Undo
                </Button>
                <Button variant="outline" size="sm" onClick={clearInitials}>
                  <Eraser className="h-4 w-4 mr-1" />
                  Clear
                </Button>
                <Button onClick={saveInitials} className="flex-1">
                  <Check className="h-4 w-4 mr-1" />
                  Use Initials
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Signed Stamp Modal */}
      {showSignedStampModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl border-0">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileSignature className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold">Create Signed Stamp</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">Add an official stamp with your signature</p>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="rounded-full h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => {
                    setShowSignedStampModal(false);
                    setSignedStampPosition(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-180px)]">
              {/* Stamp Text */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Stamp Text</Label>
                <input
                  type="text"
                  value={signedStampText}
                  onChange={(e) => setSignedStampText(e.target.value)}
                  placeholder="e.g., APPROVED BY, SIGNED BY"
                  className="w-full px-4 py-2.5 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              {/* Signature Section */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Signature</Label>
                <div className="flex gap-2">
                  <Button
                    variant={signedStampSignatureMode === "draw" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSignedStampSignatureMode("draw")}
                    className="flex-1"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Draw
                  </Button>
                  <Button
                    variant={signedStampSignatureMode === "upload" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSignedStampSignatureMode("upload")}
                    className="flex-1"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                </div>

                {signedStampSignatureMode === "draw" ? (
                  <div className="space-y-2">
                    <div className="border-2 rounded-xl overflow-hidden bg-white shadow-inner">
                      <canvas
                        ref={signedStampCanvasRef}
                        className="w-full cursor-crosshair"
                        style={{ height: 80, touchAction: "none" }}
                        onMouseDown={handleSignedStampMouseDown}
                        onMouseMove={handleSignedStampMouseMove}
                        onMouseUp={handleSignedStampMouseUp}
                        onMouseLeave={handleSignedStampMouseUp}
                        onTouchStart={handleSignedStampMouseDown}
                        onTouchMove={handleSignedStampMouseMove}
                        onTouchEnd={handleSignedStampMouseUp}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearSignedStampCanvas}
                      className="w-full text-muted-foreground hover:text-foreground"
                    >
                      <Eraser className="h-4 w-4 mr-2" />
                      Clear Signature
                    </Button>
                  </div>
                ) : (
                  <>
                    <input
                      ref={signedStampUploadRef}
                      type="file"
                      accept="image/*"
                      onChange={handleSignedStampUpload}
                      className="hidden"
                    />
                    <div
                      className={cn(
                        "border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer",
                        signedStampDragActive
                          ? "border-primary bg-primary/5 scale-[1.02]"
                          : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
                      )}
                      onClick={() => signedStampUploadRef.current?.click()}
                      onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setSignedStampDragActive(true); }}
                      onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setSignedStampDragActive(false); }}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDrop={(e) => {
                        e.preventDefault(); e.stopPropagation(); setSignedStampDragActive(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file && file.type.startsWith("image/")) {
                          const reader = new FileReader();
                          reader.onload = () => setSignedStampSignature(reader.result as string);
                          reader.readAsDataURL(file);
                        } else { toast.error("Please drop an image file"); }
                      }}
                    >
                      {signedStampSignature ? (
                        <div className="space-y-2">
                          <img src={signedStampSignature} alt="Signature" className="max-h-16 mx-auto" />
                          <p className="text-xs text-muted-foreground">Click or drag to replace</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center">
                            <Upload className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <p className="text-sm font-medium">Drop signature here</p>
                          <p className="text-xs text-muted-foreground">or click to browse</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Date Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Date</Label>
                  <input
                    type="date"
                    value={signedStampDate}
                    onChange={(e) => setSignedStampDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Format</Label>
                  <Select value={signedStampDateFormat} onValueChange={setSignedStampDateFormat}>
                    <SelectTrigger className="rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dateFormats.map((f) => (
                        <SelectItem key={f.id} value={f.id}>{f.example}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Style Options */}
              <div className="p-4 bg-muted/30 rounded-xl space-y-4">
                <p className="text-sm font-medium text-muted-foreground">Appearance</p>

                {/* Color */}
                <div className="flex items-center justify-between">
                  <span className="text-sm">Color</span>
                  <div className="flex gap-1.5">
                    {colorPresets.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSignedStampColor(color)}
                        className={cn(
                          "w-7 h-7 rounded-full border-2 transition-all hover:scale-110",
                          signedStampColor === color ? "border-foreground ring-2 ring-primary/30" : "border-transparent"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Border Style */}
                <div className="flex items-center justify-between">
                  <span className="text-sm">Border</span>
                  <div className="flex gap-1.5">
                    <Button
                      variant={!signedStampIsDashed ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSignedStampIsDashed(false)}
                      className="h-7 px-3 text-xs"
                    >
                      Solid
                    </Button>
                    <Button
                      variant={signedStampIsDashed ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSignedStampIsDashed(true)}
                      className="h-7 px-3 text-xs"
                    >
                      Dashed
                    </Button>
                  </div>
                </div>

                {/* Shape */}
                <div className="flex items-center justify-between">
                  <span className="text-sm">Shape</span>
                  <div className="flex gap-1.5">
                    <Button
                      variant={signedStampShape === "box" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSignedStampShape("box")}
                      className="h-7 w-7 p-0"
                    >
                      <Square className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant={signedStampShape === "circle" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSignedStampShape("circle")}
                      className="h-7 w-7 p-0"
                    >
                      <Circle className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Style */}
                <div className="flex items-center justify-between">
                  <span className="text-sm">Style</span>
                  <div className="flex gap-1.5">
                    {(["modern", "classic", "official"] as const).map((style) => (
                      <Button
                        key={style}
                        variant={signedStampStyle === style ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSignedStampStyle(style)}
                        className="h-7 px-2.5 text-xs capitalize"
                      >
                        {style}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Text Layout */}
                <div className="flex items-center justify-between">
                  <span className="text-sm">Text Layout</span>
                  <div className="flex gap-1.5">
                    <Button
                      variant={signedStampTextLayout === "curved" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSignedStampTextLayout("curved")}
                      className="h-7 px-2.5 text-xs"
                    >
                      Curved
                    </Button>
                    <Button
                      variant={signedStampTextLayout === "straight" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSignedStampTextLayout("straight")}
                      className="h-7 px-2.5 text-xs"
                    >
                      Straight
                    </Button>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div
                className={cn(
                  "p-4 flex flex-col items-center justify-center bg-muted/20 transition-all",
                  signedStampShape === "circle" ? "rounded-full aspect-square w-36 mx-auto" : "rounded-xl"
                )}
                style={{
                  border: `${signedStampStyle === "official" ? "3" : signedStampStyle === "classic" ? "4" : "2"}px ${signedStampIsDashed ? "dashed" : "solid"} ${signedStampColor}`,
                  opacity: signedStampStyle === "classic" ? 0.85 : 1,
                }}
              >
                <p className="text-center text-xs font-bold mb-1" style={{ color: signedStampColor }}>
                  {signedStampText.toUpperCase() || "STAMP TEXT"}
                </p>
                <div className={cn(
                  "border border-dashed border-gray-300 rounded flex items-center justify-center text-xs text-muted-foreground",
                  signedStampShape === "circle" ? "h-10 w-16" : "h-10 w-24"
                )}>
                  {signedStampSignature ? (
                    <img src={signedStampSignature} alt="Sig" className="max-h-8" />
                  ) : (
                    <span className="text-[10px]">Signature</span>
                  )}
                </div>
                <p className="text-center text-[10px] mt-1" style={{ color: signedStampColor }}>
                  {formatDate(signedStampDate, signedStampDateFormat)}
                </p>
              </div>
            </CardContent>

            {/* Footer */}
            <div className="p-4 border-t bg-muted/20">
              <Button onClick={placeSignedStamp} className="w-full h-11 text-base font-medium">
                <FileSignature className="h-5 w-5 mr-2" />
                Place Stamp
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Watermark Modal */}
      {showWatermarkModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl border-0">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Droplets className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold">Add Watermark</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">Protect your document with a watermark</p>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="rounded-full h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => { setShowWatermarkModal(false); setWatermarkPosition(null); }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-180px)]">
              {/* Content Type */}
              <div className="flex gap-2 p-1 bg-muted/50 rounded-lg">
                <Button
                  variant={watermarkContentType === "text" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setWatermarkContentType("text")}
                  className="flex-1"
                >
                  <Type className="h-4 w-4 mr-2" />
                  Text
                </Button>
                <Button
                  variant={watermarkContentType === "image" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setWatermarkContentType("image")}
                  className="flex-1"
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Logo/Image
                </Button>
              </div>

              {/* Content Input */}
              {watermarkContentType === "text" ? (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Watermark Text</Label>
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    placeholder="e.g., CONFIDENTIAL, DRAFT, COPY"
                    className="w-full px-4 py-2.5 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              ) : (
                <>
                  <input ref={watermarkUploadRef} type="file" accept="image/*" onChange={handleWatermarkUpload} className="hidden" />
                  <div
                    className={cn(
                      "border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer",
                      watermarkDragActive ? "border-primary bg-primary/5 scale-[1.02]" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
                    )}
                    onClick={() => watermarkUploadRef.current?.click()}
                    onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setWatermarkDragActive(true); }}
                    onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setWatermarkDragActive(false); }}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => {
                      e.preventDefault(); e.stopPropagation(); setWatermarkDragActive(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file && file.type.startsWith("image/")) {
                        const reader = new FileReader();
                        reader.onload = () => setWatermarkImage(reader.result as string);
                        reader.readAsDataURL(file);
                      } else { toast.error("Please drop an image file"); }
                    }}
                  >
                    {watermarkImage ? (
                      <div className="space-y-2">
                        <img src={watermarkImage} alt="Watermark" className="max-h-16 mx-auto" style={{ opacity: watermarkOpacity }} />
                        <p className="text-xs text-muted-foreground">Click or drag to replace</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center">
                          <Upload className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium">Drop logo here</p>
                        <p className="text-xs text-muted-foreground">or click to browse</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Style Options */}
              <div className="p-4 bg-muted/30 rounded-xl space-y-4">
                <p className="text-sm font-medium text-muted-foreground">Appearance</p>

                {/* Color (text only) */}
                {watermarkContentType === "text" && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Color</span>
                    <div className="flex gap-1.5">
                      {colorPresets.map((color) => (
                        <button
                          key={color}
                          onClick={() => setWatermarkColor(color)}
                          className={cn(
                            "w-7 h-7 rounded-full border-2 transition-all hover:scale-110",
                            watermarkColor === color ? "border-foreground ring-2 ring-primary/30" : "border-transparent"
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Opacity */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Opacity</span>
                    <span className="text-sm text-muted-foreground">{Math.round(watermarkOpacity * 100)}%</span>
                  </div>
                  <Slider value={[watermarkOpacity]} onValueChange={([v]) => setWatermarkOpacity(v)} min={0.1} max={1} step={0.05} />
                </div>

                {/* Font Size (text only) */}
                {watermarkContentType === "text" && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Size</span>
                      <span className="text-sm text-muted-foreground">{watermarkFontSize}px</span>
                    </div>
                    <Slider value={[watermarkFontSize]} onValueChange={([v]) => setWatermarkFontSize(v)} min={20} max={120} step={2} />
                  </div>
                )}

                {/* Rotation */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Rotation</span>
                    <span className="text-sm text-muted-foreground">{watermarkRotation}°</span>
                  </div>
                  <Slider value={[watermarkRotation]} onValueChange={([v]) => setWatermarkRotation(v)} min={-90} max={90} step={5} />
                  <div className="flex gap-1.5">
                    {[{ val: -45, label: "-45°" }, { val: 0, label: "0°" }, { val: 45, label: "45°" }].map((r) => (
                      <Button
                        key={r.val}
                        variant={watermarkRotation === r.val ? "default" : "outline"}
                        size="sm"
                        onClick={() => setWatermarkRotation(r.val)}
                        className="flex-1 h-7 text-xs"
                      >
                        {r.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Border */}
                <div className="flex items-center justify-between">
                  <span className="text-sm">Border</span>
                  <div className="flex gap-1">
                    {(["none", "solid", "dashed", "dotted"] as const).map((style) => (
                      <Button
                        key={style}
                        variant={watermarkBorderStyle === style ? "default" : "outline"}
                        size="sm"
                        onClick={() => setWatermarkBorderStyle(style)}
                        className="h-7 px-2 text-xs capitalize"
                      >
                        {style}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Border Color */}
                {watermarkBorderStyle !== "none" && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Border Color</span>
                    <div className="flex gap-1.5">
                      {colorPresets.map((color) => (
                        <button
                          key={color}
                          onClick={() => setWatermarkBorderColor(color)}
                          className={cn(
                            "w-6 h-6 rounded-full border-2 transition-all hover:scale-110",
                            watermarkBorderColor === color ? "border-foreground ring-2 ring-primary/30" : "border-transparent"
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Preview */}
              <div className="p-6 bg-gradient-to-br from-muted/40 to-muted/20 rounded-xl flex items-center justify-center min-h-[100px] overflow-hidden">
                <div style={{ transform: `rotate(${watermarkRotation}deg)`, opacity: watermarkOpacity }}>
                  {watermarkContentType === "text" ? (
                    <div
                      className="font-bold whitespace-nowrap"
                      style={{
                        fontSize: `${Math.min(watermarkFontSize, 32)}px`,
                        color: watermarkColor,
                        border: watermarkBorderStyle !== "none" ? `2px ${watermarkBorderStyle} ${watermarkBorderColor}` : "none",
                        padding: watermarkBorderStyle !== "none" ? "6px 12px" : 0,
                        borderRadius: "4px",
                      }}
                    >
                      {watermarkText || "WATERMARK"}
                    </div>
                  ) : watermarkImage ? (
                    <div style={{ border: watermarkBorderStyle !== "none" ? `2px ${watermarkBorderStyle} ${watermarkBorderColor}` : "none", padding: watermarkBorderStyle !== "none" ? "4px" : 0, borderRadius: "4px" }}>
                      <img src={watermarkImage} alt="Preview" className="max-h-14 max-w-[120px]" />
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">Upload an image to preview</span>
                  )}
                </div>
              </div>
            </CardContent>

            {/* Footer */}
            <div className="p-4 border-t bg-muted/20">
              <Button onClick={placeWatermark} className="w-full h-11 text-base font-medium">
                <Droplets className="h-5 w-5 mr-2" />
                Place Watermark
              </Button>
            </div>
          </Card>
        </div>
      )}
      <RelatedGuide guideSlug="how-to-digitally-sign-pdf-online" />
    </div>
  );
}
