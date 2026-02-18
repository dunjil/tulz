"use client";

import { RelatedGuide } from "@/components/shared/related-guide";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Accept } from "react-dropzone";
import toast from "react-hot-toast";
import { api, apiHelpers, shouldShowErrorToast } from "@/lib/api";
import { formatBytes } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileDropzone } from "@/components/shared/file-dropzone";
import {
  ScanText,
  FileText,
  FileSearch,
  FileType,
  Download,
  Crown,
  Copy,
  CheckCircle,
  AlertTriangle,
  Languages,
  Clock,
  FileWarning,
} from "lucide-react";
import { UsageBadge } from "@/components/shared/usage-badge";
import { useUpgradeModal } from "@/components/shared/upgrade-modal";
import { useLoginModal } from "@/components/shared/login-modal";
import { useProgressModal } from "@/components/shared/progress-modal";
import { useAuth } from "@/providers/auth-provider";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// OCR operations
const ocrOperations = [
  {
    id: "image-to-text",
    name: "Image to Text",
    description: "Extract text from photos, screenshots, or scans",
    icon: ScanText,
    gradient: "from-blue-500 to-cyan-500",
    accepts: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"],
    } as Accept,
  },
  {
    id: "pdf-to-text",
    name: "PDF to Text",
    description: "Extract text from scanned PDF documents",
    icon: FileText,
    gradient: "from-orange-500 to-red-500",
    accepts: {
      "application/pdf": [".pdf"],
    } as Accept,
  },
  {
    id: "pdf-to-searchable",
    name: "Searchable PDF",
    description: "Make scanned PDFs searchable and copyable",
    icon: FileSearch,
    gradient: "from-purple-500 to-pink-500",
    accepts: {
      "application/pdf": [".pdf"],
    } as Accept,
  },
  {
    id: "to-word",
    name: "OCR to Word",
    description: "Convert scanned documents to editable Word files",
    icon: FileType,
    gradient: "from-green-500 to-emerald-500",
    accepts: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"],
      "application/pdf": [".pdf"],
    } as Accept,
  },
];

// Supported languages
const languages = [
  { code: "eng", name: "English" },
  { code: "fra", name: "French" },
  { code: "deu", name: "German" },
  { code: "spa", name: "Spanish" },
  { code: "ita", name: "Italian" },
  { code: "por", name: "Portuguese" },
  { code: "nld", name: "Dutch" },
  { code: "pol", name: "Polish" },
  { code: "rus", name: "Russian" },
  { code: "chi_sim", name: "Chinese (Simplified)" },
  { code: "jpn", name: "Japanese" },
  { code: "kor", name: "Korean" },
  { code: "ara", name: "Arabic" },
];

interface OCRResult {
  success: boolean;
  text?: string;
  word_count?: number;
  char_count?: number;
  confidence?: number;
  page_count?: number;
  filename?: string;
  size?: number;
  download_url?: string;
  language?: string;
  language_name?: string;
  tier?: string;
  processing_time_ms?: number;
}

export default function OCRPage() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { showUpgradeModal } = useUpgradeModal();
  const { showLoginModal } = useLoginModal();
  const { showProgress, setStatus, hideProgress } = useProgressModal();

  const [activeTab, setActiveTab] = useState("image-to-text");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [language, setLanguage] = useState("eng");
  const [copied, setCopied] = useState(false);

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

  const activeOperation = ocrOperations.find((op) => op.id === activeTab) || ocrOperations[0];

  const handleFileSelect = (files: File[]) => {
    if (files.length > 0) {
      setSelectedFile(files[0]);
      setResult(null);

      // Create preview for images
      if (files[0].type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target?.result as string);
        reader.readAsDataURL(files[0]);
      } else {
        setPreview(null);
      }
    }
  };

  const ocrMutation = useMutation({
    mutationFn: async ({ endpoint, formData }: { endpoint: string; formData: FormData }) => {
      const response = await api.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data as OCRResult;
    },
    onSuccess: (data) => {
      setStatus("success", "OCR completed!");
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["remaining-uses"] });
    },
    onError: (error: any) => {
      hideProgress();
      if (shouldShowErrorToast(error)) {
        toast.error(error.response?.data?.message || "OCR processing failed");
      }
    },
  });

  const handleProcess = () => {
    if (!selectedFile) {
      toast.error("Please select a file first");
      return;
    }

    // Clear previous result
    setResult(null);

    const operationMessages: Record<string, string> = {
      "image-to-text": "Extracting text from image...",
      "pdf-to-text": "Extracting text from PDF...",
      "pdf-to-searchable": "Creating searchable PDF...",
      "to-word": "Converting to Word document...",
    };

    showProgress({ status: "uploading", fileName: selectedFile.name });

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("language", language);

    setTimeout(() => setStatus("processing", operationMessages[activeTab] || "Processing..."), 500);

    ocrMutation.mutate({
      endpoint: `/tools/ocr/${activeTab}`,
      formData,
    });
  };

  const handleCopyText = () => {
    if (result?.text) {
      navigator.clipboard.writeText(result.text);
      setCopied(true);
      toast.success("Text copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (result?.download_url) {
      window.open(`${API_URL}${result.download_url}`, "_blank");
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreview(null);
    setResult(null);
    setCopied(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ScanText className="h-6 w-6 text-primary" />
            OCR Tools
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Extract text from images and scanned documents
          </p>
        </div>
        <UsageBadge />
      </div>

      {/* Limitations Notice */}
      <Card className="border-yellow-500/30 bg-yellow-500/5">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-yellow-600 dark:text-yellow-400 mb-1">
                Limitations
              </p>
              <ul className="text-muted-foreground space-y-0.5 text-xs">
                <li>• Works best with clear, printed text (not handwriting)</li>
                <li>• Table structure is not preserved</li>
                <li>• Complex layouts may lose formatting</li>
                <li>• Supports 15+ languages with up to 20 pages</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 lg:grid-cols-4 h-auto gap-2 bg-transparent p-0">
          {ocrOperations.map((op) => (
            <TabsTrigger
              key={op.id}
              value={op.id}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex flex-col items-center gap-1 p-3 h-auto border rounded-lg"
              onClick={() => {
                setSelectedFile(null);
                setPreview(null);
                setResult(null);
              }}
            >
              <div className={`p-2 rounded-lg bg-gradient-to-br ${op.gradient} text-white`}>
                <op.icon className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium">{op.name}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Content for all tabs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Upload & Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <activeOperation.icon className="h-5 w-5" />
                {activeOperation.name}
              </CardTitle>
              <CardDescription>{activeOperation.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* File Upload */}
              <FileDropzone
                onFilesSelected={handleFileSelect}
                accept={activeOperation.accepts}
                maxFiles={1}
                maxSize={isPro ? 10 * 1024 * 1024 : 2 * 1024 * 1024}
              />

              {/* Selected File Info */}
              {selectedFile && (
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm truncate">{selectedFile.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                    {formatBytes(selectedFile.size)}
                  </span>
                </div>
              )}

              {/* Image Preview */}
              {preview && (
                <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                  <img
                    src={preview}
                    alt="Preview"
                    className="object-contain w-full h-full"
                  />
                </div>
              )}

              {/* Language Selection */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Languages className="h-4 w-4" />
                  Document Language
                </Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => (
                      <SelectItem
                        key={lang.code}
                        value={lang.code}
                        disabled={!isPro && lang.code !== "eng"}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>{lang.name}</span>
                          {!isPro && lang.code !== "eng" && (
                            <Crown className="h-3 w-3 text-yellow-500 ml-2" />
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tier Limits Info */}
              <div className="p-3 bg-muted/50 rounded-lg text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Max file size:</span>
                  <span className="font-medium">{isPro ? "10 MB" : "2 MB"}</span>
                </div>
                {(activeTab === "pdf-to-text" || activeTab === "pdf-to-searchable" || activeTab === "to-word") && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Max pages:</span>
                    <span className="font-medium">{isPro ? "20 pages" : "1 page"}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Languages:</span>
                  <span className="font-medium">{isPro ? "15+" : "English only"}</span>
                </div>
              </div>

              {/* Process Button */}
              <div className="pt-2">
                <Button
                  className={`w-full h-12 bg-gradient-to-r ${activeOperation.gradient} hover:opacity-90`}
                  onClick={handleProcess}
                  disabled={!selectedFile || ocrMutation.isPending}
                >
                  <ScanText className="mr-2 h-5 w-5" />
                  {ocrMutation.isPending ? "Processing..." : `Extract Text`}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Right: Results */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Results
              </CardTitle>
              <CardDescription>
                {result ? "Extracted text from your document" : "Process a document to see results"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {result ? (
                <>
                  {/* Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {result.word_count !== undefined && (
                      <div className="p-3 bg-muted rounded-lg text-center">
                        <p className="text-2xl font-bold">{result.word_count}</p>
                        <p className="text-xs text-muted-foreground">Words</p>
                      </div>
                    )}
                    {result.confidence !== undefined && (
                      <div className="p-3 bg-muted rounded-lg text-center">
                        <p className="text-2xl font-bold">{result.confidence}%</p>
                        <p className="text-xs text-muted-foreground">Confidence</p>
                      </div>
                    )}
                    {result.page_count !== undefined && (
                      <div className="p-3 bg-muted rounded-lg text-center">
                        <p className="text-2xl font-bold">{result.page_count}</p>
                        <p className="text-xs text-muted-foreground">Pages</p>
                      </div>
                    )}
                    {result.processing_time_ms !== undefined && (
                      <div className="p-3 bg-muted rounded-lg text-center">
                        <p className="text-2xl font-bold">{(result.processing_time_ms / 1000).toFixed(1)}s</p>
                        <p className="text-xs text-muted-foreground">Time</p>
                      </div>
                    )}
                  </div>

                  {/* Extracted Text */}
                  {result.text && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Extracted Text</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCopyText}
                          className="h-8"
                        >
                          {copied ? (
                            <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                          ) : (
                            <Copy className="h-4 w-4 mr-1" />
                          )}
                          {copied ? "Copied" : "Copy"}
                        </Button>
                      </div>
                      <Textarea
                        value={result.text}
                        readOnly
                        className="min-h-[200px] font-mono text-sm"
                      />
                    </div>
                  )}

                  {/* Download Button */}
                  {result.download_url && (
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={handleDownload}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download {activeTab === "pdf-to-searchable" ? "Searchable PDF" : activeTab === "to-word" ? "Word Document" : "Text File"}
                      {result.size && ` (${formatBytes(result.size)})`}
                    </Button>
                  )}

                  {/* Reset Button */}
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={handleReset}
                  >
                    Process Another Document
                  </Button>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="p-4 rounded-full bg-muted mb-4">
                    <ScanText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground mb-2">No results yet</p>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    Upload an image or PDF and click "Extract Text" to see the OCR results here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Tabs>

      {/* How it Works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How it Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex flex-col items-center text-center p-4">
              <div className="p-3 rounded-full bg-blue-500/10 mb-3">
                <FileWarning className="h-6 w-6 text-blue-500" />
              </div>
              <h4 className="font-medium text-sm mb-1">1. Upload</h4>
              <p className="text-xs text-muted-foreground">
                Upload a photo, screenshot, or scanned PDF
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-4">
              <div className="p-3 rounded-full bg-purple-500/10 mb-3">
                <Languages className="h-6 w-6 text-purple-500" />
              </div>
              <h4 className="font-medium text-sm mb-1">2. Select Language</h4>
              <p className="text-xs text-muted-foreground">
                Choose the language of your document
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-4">
              <div className="p-3 rounded-full bg-orange-500/10 mb-3">
                <Clock className="h-6 w-6 text-orange-500" />
              </div>
              <h4 className="font-medium text-sm mb-1">3. Process</h4>
              <p className="text-xs text-muted-foreground">
                Our OCR engine extracts the text
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-4">
              <div className="p-3 rounded-full bg-green-500/10 mb-3">
                <Download className="h-6 w-6 text-green-500" />
              </div>
              <h4 className="font-medium text-sm mb-1">4. Download</h4>
              <p className="text-xs text-muted-foreground">
                Copy text or download as TXT/DOCX/PDF
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <RelatedGuide guideSlug="how-to-extract-text-from-images-ocr" />
    </div>
  );
}
