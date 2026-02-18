"use client";

import { RelatedGuide } from "@/components/shared/related-guide";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api, apiHelpers, shouldShowErrorToast } from "@/lib/api";
import { formatBytes, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Progress } from "@/components/ui/progress";
import {
  Globe,
  Download,
  FileText,
  Info,
  Sparkles,
  Settings2,
  ExternalLink,
  RefreshCw,
  Monitor,
  Smartphone,
  ChevronDown,
  ChevronUp,
  Crown,
  Lock,
} from "lucide-react";
import { UsageBadge } from "@/components/shared/usage-badge";
import { useUpgradeModal } from "@/components/shared/upgrade-modal";
import { useLoginModal } from "@/components/shared/login-modal";
import { useAuth } from "@/providers/auth-provider";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface ConvertResponse {
  success: boolean;
  url: string;
  title: string;
  page_count: number;
  file_size_bytes: number;
  download_url: string;
  preview_url?: string;
  watermarked: boolean;
  tier: string;
  limits: {
    max_pages: number;
    features: {
      background: boolean;
      custom_format: boolean;
    };
  };
}

// Paper size presets
const paperSizes = [
  { id: "A4", label: "A4", description: "210 × 297 mm" },
  { id: "Letter", label: "Letter", description: "8.5 × 11 in" },
  { id: "Legal", label: "Legal", description: "8.5 × 14 in" },
] as const;

export default function WebPdfPage() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { showUpgradeModal } = useUpgradeModal();
  const { showLoginModal } = useLoginModal();
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<ConvertResponse | null>(null);
  // const [showCoffeePopup, setShowCoffeePopup] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");

  // Options
  const [format, setFormat] = useState("A4");
  const [landscape, setLandscape] = useState(false);
  const [viewportType, setViewportType] = useState<"desktop" | "mobile">("desktop");
  const [includeBackground, setIncludeBackground] = useState(true);
  const [fullPage, setFullPage] = useState(true);
  const [scale, setScale] = useState("1.0");
  const [margin, setMargin] = useState("10");
  const [waitTime, setWaitTime] = useState("1000"); // Default 1s pre-render delay

  // Get user tier
  const { data: usageData } = useQuery({
    queryKey: ["remaining-uses"],
    queryFn: async () => {
      const response = await apiHelpers.getRemainingUses();
      return response.data;
    },
    enabled: !!isAuthenticated,
  });

  const isPro = usageData?.tier === "pro" || usageData?.is_unlimited;
  const hasRemainingUses = usageData?.remaining > 0 || usageData?.is_unlimited;

  const convertMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await api.post("/tools/webpdf/convert", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data as ConvertResponse;
    },
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["remaining-uses"] });
      toast.success(`PDF created with ${data.page_count} page(s)!`);
    },
    onError: (error: any) => {
      if (shouldShowErrorToast(error)) {
        toast.error(error.response?.data?.message || "Conversion failed");
      }
    },
  });

  // Simulate progress
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (convertMutation.isPending) {
      setProgress(5);
      setStatusMessage("Initializing browser...");

      const waitTimeNum = parseInt(waitTime);
      const totalEstimatedTime = 5000 + waitTimeNum; // Base 5s + user wait time
      const increment = 100 / (totalEstimatedTime / 200); // Pulse every 200ms

      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) return 95;

          const next = prev + increment;

          // Update status messages based on progress
          if (next > 10 && next <= 30) setStatusMessage("Navigating to URL...");
          if (next > 30 && next <= 50) setStatusMessage("Loading webpage content...");
          if (next > 50 && next <= 70) {
            if (waitTimeNum > 0) {
              setStatusMessage(`Waiting for pre-render (${waitTimeNum / 1000}s)...`);
            } else {
              setStatusMessage("Starting PDF generation...");
            }
          }
          if (next > 70 && next <= 85) setStatusMessage("Generating PDF document...");
          if (next > 85) setStatusMessage("Finalizing and compressing...");

          return next;
        });
      }, 200);
    } else {
      setProgress(0);
      setStatusMessage("");
    }
    return () => clearInterval(interval);
  }, [convertMutation.isPending, waitTime]);

  const handleConvert = () => {
    if (!url) {
      toast.error("Please enter a URL");
      return;
    }

    // Clear previous result when starting new conversion
    setResult(null);

    const formData = new FormData();
    formData.append("url", url);
    formData.append("format", format);
    formData.append("landscape", landscape.toString());
    formData.append("viewport_type", viewportType);
    formData.append("include_background", includeBackground.toString());
    formData.append("full_page", fullPage.toString());
    formData.append("scale", scale);
    formData.append("margin_top", `${margin}mm`);
    formData.append("margin_bottom", `${margin}mm`);
    formData.append("margin_left", `${margin}mm`);
    formData.append("margin_right", `${margin}mm`);
    formData.append("wait_for", waitTime);

    convertMutation.mutate(formData);
  };

  const handleDownload = () => {
    if (result) {
      // Create a download link and trigger it
      const link = document.createElement("a");
      link.href = result.download_url;
      link.download = `${result.title || "website"}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
              <Globe className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Website to PDF</h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Capture any webpage as a high-quality PDF document
              </p>
            </div>
          </div>
          <UsageBadge />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Input Section */}
        <div className="lg:col-span-3 space-y-4">
          {/* URL Input */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <ExternalLink className="h-5 w-5 text-primary" />
                Website URL
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  type="url"
                  className="text-base pr-10"
                />
                {url && isValidUrl(url) && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Enter the full URL including https://
              </p>
            </CardContent>
          </Card>

          {/* Paper Size Selection */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Paper Size
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {paperSizes.map((size) => (
                  <button
                    key={size.id}
                    onClick={() => setFormat(size.id)}
                    className={cn(
                      "flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all duration-200",
                      format === size.id
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-transparent bg-muted/50 hover:bg-muted hover:border-muted-foreground/20"
                    )}
                  >
                    <span className={cn("text-sm font-medium", format === size.id && "text-primary")}>
                      {size.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{size.description}</span>
                  </button>
                ))}
              </div>

              {/* Device View Selection */}
              <div className="flex items-center gap-2 mb-4">
                <Label className="text-xs">Device:</Label>
                <div className="flex gap-2 flex-1">
                  <button
                    onClick={() => {
                      setViewportType("desktop");
                      setLandscape(true); // Default desktop to landscape
                    }}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
                      viewportType === "desktop"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted hover:bg-muted/80"
                    )}
                  >
                    <Monitor className="h-4 w-4" />
                    Desktop
                  </button>
                  <button
                    onClick={() => {
                      setViewportType("mobile");
                      setLandscape(false); // Default mobile to portrait
                    }}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
                      viewportType === "mobile"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted hover:bg-muted/80"
                    )}
                  >
                    <Smartphone className="h-4 w-4" />
                    Mobile
                  </button>
                </div>
              </div>

              {/* Orientation Toggle */}
              <div className="flex items-center gap-2 mb-4">
                <Label className="text-xs">Orientation:</Label>
                <div className="flex gap-2 flex-1">
                  <button
                    onClick={() => setLandscape(false)}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
                      !landscape
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    )}
                  >
                    <div className="w-3 h-4 border-2 border-current rounded-sm mr-1" />
                    Portrait
                  </button>
                  <button
                    onClick={() => setLandscape(true)}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
                      landscape
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    )}
                  >
                    <div className="w-4 h-3 border-2 border-current rounded-sm mr-1" />
                    Landscape
                  </button>
                </div>
              </div>

              {/* Full Page Capture Toggle */}
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-primary/10">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Full Page Capture</Label>
                  <p className="text-xs text-muted-foreground">Capture the entire scrollable content</p>
                </div>
                <Switch
                  checked={fullPage}
                  onCheckedChange={setFullPage}
                  className="data-[state=checked]:bg-primary"
                />
              </div>

              <div className="flex items-center gap-2 mt-4 px-1">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  Automatic PDF Compression Enabled
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Advanced Options (Collapsible) */}
          <Card>
            <CardHeader className={showAdvanced ? "pb-4" : "pb-6"}>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center justify-between w-full"
              >
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings2 className="h-5 w-5 text-primary" />
                  Advanced Options
                </CardTitle>
                {showAdvanced ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
            </CardHeader>
            {showAdvanced && (
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Scale</Label>
                    <Select value={scale} onValueChange={setScale}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.5">50%</SelectItem>
                        <SelectItem value="0.75">75%</SelectItem>
                        <SelectItem value="1.0">100%</SelectItem>
                        <SelectItem value="1.25">125%</SelectItem>
                        <SelectItem value="1.5">150%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1" title="Wait extra time for backend data to load. Useful for complex dashboards.">
                      Pre-render Delay
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </Label>
                    <Select value={waitTime} onValueChange={setWaitTime}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">None</SelectItem>
                        <SelectItem value="1000">1 Second</SelectItem>
                        <SelectItem value="3000">3 Seconds</SelectItem>
                        <SelectItem value="5000">5 Seconds</SelectItem>
                        <SelectItem value="10000">10 Seconds (Very Slow)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <label className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 transition-colors cursor-pointer hover:bg-muted">
                  <input
                    type="checkbox"
                    checked={includeBackground}
                    onChange={(e) => setIncludeBackground(e.target.checked)}
                    className="rounded"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">Include background graphics</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Capture colors, images, and CSS backgrounds
                    </p>
                  </div>
                </label>
              </CardContent>
            )}
          </Card>

          {/* Generate Button */}
          <Button
            className="w-full h-12 text-base font-semibold"
            onClick={handleConvert}
            isLoading={convertMutation.isPending}
            disabled={!url || !isValidUrl(url)}
          >
            {convertMutation.isPending ? (
              <span>{statusMessage} ({Math.round(progress)}%)</span>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                Convert to PDF
              </>
            )}
          </Button>
        </div>

        {/* Preview Section - Sticky sidebar */}
        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-24">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Preview</CardTitle>
                <CardDescription>
                  {result ? `${result.page_count} page PDF ready` : "Your PDF preview will appear here"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                {/* PDF Preview Area */}
                <div
                  className={cn(
                    "w-full rounded-xl border-2 overflow-hidden transition-all bg-white",
                    result ? "border-transparent shadow-lg" : "border-dashed bg-muted/30",
                    viewportType === "mobile" && !landscape ? "aspect-[9/16] max-w-[280px] mx-auto" : (landscape ? "aspect-[4/3]" : "aspect-[3/4]")
                  )}
                >
                  {result ? (
                    <iframe
                      src={`${result.preview_url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                      className="w-full h-full border-0"
                      title="PDF Preview"
                    />
                  ) : convertMutation.isPending ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-muted-foreground bg-muted/30">
                      <RefreshCw className="h-12 w-12 mb-6 animate-spin text-primary opacity-80" />
                      <div className="w-full max-w-[240px] space-y-3">
                        <div className="flex justify-between text-xs font-medium">
                          <span>{statusMessage}</span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                        <p className="text-[10px] text-center opacity-70">
                          This may take up to a minute for complex sites
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-6 bg-muted/30">
                      <Globe className="h-16 w-16 mb-4 opacity-20" />
                      <p className="text-sm text-center">Enter a URL and click convert to see your PDF</p>
                    </div>
                  )}
                </div>

                {/* Result Info & Actions */}
                {result && (
                  <>
                    <div className="w-full mt-4 p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-red-500" />
                          <div>
                            <p className="text-sm font-medium truncate max-w-[150px]">
                              {result.title || "Untitled"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {result.page_count} page(s) • {formatBytes(result.file_size_bytes)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="w-full mt-4 grid grid-cols-2 gap-2">
                      <Button onClick={handleDownload}>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setResult(null);
                          setUrl("");
                        }}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        New
                      </Button>
                    </div>
                  </>
                )}

                {/* Download/New buttons disabled state when no result */}
                {!result && (
                  <div className="w-full mt-6 grid grid-cols-2 gap-2">
                    <Button disabled>
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                    <Button variant="outline" disabled>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      New
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <RelatedGuide guideSlug="how-to-save-webpage-as-pdf" />
    </div >
  );
}
