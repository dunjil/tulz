"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api, apiHelpers, shouldShowErrorToast } from "@/lib/api";
import { useUpgradeModal } from "@/components/shared/upgrade-modal";
import { useLoginModal } from "@/components/shared/login-modal";
import { useProgressModal } from "@/components/shared/progress-modal";
import { useAuth } from "@/providers/auth-provider";
import { formatBytes, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { FileDropzone } from "@/components/shared/file-dropzone";
import {
  FileText,
  Scissors,
  Merge,
  Minimize2,
  FileOutput,
  Download,
  File,
  Crown,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  X,
  FileCheck,
  Loader2,
  Droplets,
  AlertTriangle,
  Image as ImageIcon,
  RotateCw,
  Lock,
  Unlock,
  Globe,
  FileType,
  Type,
  Hash,
  FolderTree,
  Crop,
  Sheet,
  Presentation,
} from "lucide-react";
import { UsageBadge } from "@/components/shared/usage-badge";
import type { PDFResponse } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Tool definitions with icons and descriptions
const tools = [
  {
    id: "split",
    name: "Split PDF",
    description: "Extract pages or split files",
    icon: Scissors,
    gradient: "from-blue-500 to-cyan-500",
    bgGradient: "from-blue-500/10 to-cyan-500/10",
    borderColor: "border-blue-500/50",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
  },
  {
    id: "merge",
    name: "Merge PDFs",
    description: "Combine multiple PDFs",
    icon: Merge,
    gradient: "from-purple-500 to-pink-500",
    bgGradient: "from-purple-500/10 to-pink-500/10",
    borderColor: "border-purple-500/50",
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-500",
  },
  {
    id: "compress",
    name: "Compress",
    description: "Reduce file size",
    icon: Minimize2,
    gradient: "from-green-500 to-emerald-500",
    bgGradient: "from-green-500/10 to-emerald-500/10",
    borderColor: "border-green-500/50",
    iconBg: "bg-green-500/10",
    iconColor: "text-green-500",
  },
  {
    id: "toword",
    name: "PDF to Word",
    description: "Convert to DOCX",
    icon: FileOutput,
    gradient: "from-orange-500 to-amber-500",
    bgGradient: "from-orange-500/10 to-amber-500/10",
    borderColor: "border-orange-500/50",
    iconBg: "bg-orange-500/10",
    iconColor: "text-orange-500",
  },
  {
    id: "removewatermark",
    name: "Remove Watermark",
    description: "Remove watermarks",
    icon: Droplets,
    gradient: "from-rose-500 to-pink-500",
    bgGradient: "from-rose-500/10 to-pink-500/10",
    borderColor: "border-rose-500/50",
    iconBg: "bg-rose-500/10",
    iconColor: "text-rose-500",
  },
  {
    id: "tojpg",
    name: "PDF to JPG",
    description: "Convert pages to images",
    icon: ImageIcon,
    gradient: "from-cyan-500 to-blue-500",
    bgGradient: "from-cyan-500/10 to-blue-500/10",
    borderColor: "border-cyan-500/50",
    iconBg: "bg-cyan-500/10",
    iconColor: "text-cyan-500",
  },
  {
    id: "fromjpg",
    name: "JPG to PDF",
    description: "Convert images to PDF",
    icon: FileType,
    gradient: "from-indigo-500 to-purple-500",
    bgGradient: "from-indigo-500/10 to-purple-500/10",
    borderColor: "border-indigo-500/50",
    iconBg: "bg-indigo-500/10",
    iconColor: "text-indigo-500",
  },
  {
    id: "rotate",
    name: "Rotate PDF",
    description: "Rotate pages",
    icon: RotateCw,
    gradient: "from-teal-500 to-emerald-500",
    bgGradient: "from-teal-500/10 to-emerald-500/10",
    borderColor: "border-teal-500/50",
    iconBg: "bg-teal-500/10",
    iconColor: "text-teal-500",
  },
  {
    id: "unlock",
    name: "Unlock PDF",
    description: "Remove password",
    icon: Unlock,
    gradient: "from-yellow-500 to-orange-500",
    bgGradient: "from-yellow-500/10 to-orange-500/10",
    borderColor: "border-yellow-500/50",
    iconBg: "bg-yellow-500/10",
    iconColor: "text-yellow-500",
  },
  {
    id: "protect",
    name: "Protect PDF",
    description: "Add password",
    icon: Lock,
    gradient: "from-red-500 to-pink-500",
    bgGradient: "from-red-500/10 to-pink-500/10",
    borderColor: "border-red-500/50",
    iconBg: "bg-red-500/10",
    iconColor: "text-red-500",
  },
  {
    id: "htmltopdf",
    name: "HTML to PDF",
    description: "Convert web pages",
    icon: Globe,
    gradient: "from-blue-500 to-indigo-500",
    bgGradient: "from-blue-500/10 to-indigo-500/10",
    borderColor: "border-blue-500/50",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
  },
  {
    id: "wordtopdf",
    name: "Word to PDF",
    description: "Convert DOCX files",
    icon: FileType,
    gradient: "from-violet-500 to-purple-500",
    bgGradient: "from-violet-500/10 to-purple-500/10",
    borderColor: "border-violet-500/50",
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-500",
  },
  {
    id: "addwatermark",
    name: "Add Watermark",
    description: "Add text watermark",
    icon: Type,
    gradient: "from-pink-500 to-rose-500",
    bgGradient: "from-pink-500/10 to-rose-500/10",
    borderColor: "border-pink-500/50",
    iconBg: "bg-pink-500/10",
    iconColor: "text-pink-500",
  },
  {
    id: "pagenumbers",
    name: "Page Numbers",
    description: "Add page numbers",
    icon: Hash,
    gradient: "from-emerald-500 to-teal-500",
    bgGradient: "from-emerald-500/10 to-teal-500/10",
    borderColor: "border-emerald-500/50",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
  },
  {
    id: "organize",
    name: "Organize PDF",
    description: "Reorder/delete pages",
    icon: FolderTree,
    gradient: "from-amber-500 to-yellow-500",
    bgGradient: "from-amber-500/10 to-yellow-500/10",
    borderColor: "border-amber-500/50",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-500",
  },
  {
    id: "crop",
    name: "Crop PDF",
    description: "Remove margins",
    icon: Crop,
    gradient: "from-lime-500 to-green-500",
    bgGradient: "from-lime-500/10 to-green-500/10",
    borderColor: "border-lime-500/50",
    iconBg: "bg-lime-500/10",
    iconColor: "text-lime-500",
  },
  {
    id: "exceltopdf",
    name: "Excel to PDF",
    description: "Convert XLSX files",
    icon: Sheet,
    gradient: "from-green-600 to-emerald-600",
    bgGradient: "from-green-600/10 to-emerald-600/10",
    borderColor: "border-green-600/50",
    iconBg: "bg-green-600/10",
    iconColor: "text-green-600",
  },
  {
    id: "ppttopdf",
    name: "PPT to PDF",
    description: "Convert PPTX files",
    icon: Presentation,
    gradient: "from-orange-600 to-red-600",
    bgGradient: "from-orange-600/10 to-red-600/10",
    borderColor: "border-orange-600/50",
    iconBg: "bg-orange-600/10",
    iconColor: "text-orange-600",
  },
];

export default function PDFPage() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { showUpgradeModal } = useUpgradeModal();
  const { showLoginModal } = useLoginModal();
  const { showProgress, setStatus, hideProgress } = useProgressModal();
  const [activeTab, setActiveTab] = useState("split");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [result, setResult] = useState<PDFResponse | null>(null);

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

  // Split options
  const [pageRanges, setPageRanges] = useState("");

  // Compress options
  const [compressionLevel, setCompressionLevel] = useState("medium");

  // Watermark removal options
  const [watermarkText, setWatermarkText] = useState("");
  const [removeImages, setRemoveImages] = useState(false);

  const activeTool = tools.find((t) => t.id === activeTab)!;

  const handleFileSelect = (files: File[]) => {
    if (activeTab === "merge") {
      setSelectedFiles((prev) => [...prev, ...files]);
    } else {
      setSelectedFiles(files.slice(0, 1));
    }
    setResult(null);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const splitMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await api.post("/tools/pdf/split", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data as PDFResponse;
    },
    onSuccess: (data) => {
      setStatus("success", "PDF split successfully!");
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["remaining-uses"] });
    },
    onError: (error: any) => {
      hideProgress();
      if (shouldShowErrorToast(error)) {
        toast.error(error.response?.data?.message || "Split failed");
      }
    },
  });

  const mergeMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await api.post("/tools/pdf/merge", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data as PDFResponse;
    },
    onSuccess: (data) => {
      setStatus("success", "PDFs merged successfully!");
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["remaining-uses"] });
    },
    onError: (error: any) => {
      hideProgress();
      if (shouldShowErrorToast(error)) {
        toast.error(error.response?.data?.message || "Merge failed");
      }
    },
  });

  const compressMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await api.post("/tools/pdf/compress", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data as PDFResponse;
    },
    onSuccess: (data) => {
      setStatus("success", "PDF compressed successfully!");
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["remaining-uses"] });
    },
    onError: (error: any) => {
      hideProgress();
      if (shouldShowErrorToast(error)) {
        toast.error(error.response?.data?.message || "Compression failed");
      }
    },
  });

  const toWordMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await api.post("/tools/pdf/to-word", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    },
    onSuccess: (data) => {
      setStatus("success", "PDF converted to Word!");
      setResult(data as any);
      queryClient.invalidateQueries({ queryKey: ["remaining-uses"] });
    },
    onError: (error: any) => {
      hideProgress();
      if (shouldShowErrorToast(error)) {
        toast.error(error.response?.data?.message || "Conversion failed");
      }
    },
  });

  const removeWatermarkMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await api.post("/tools/pdf/remove-watermark", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    },
    onSuccess: (data) => {
      const stats = data.removal_stats;
      const totalRemoved = stats.annotations_removed + stats.text_instances_removed + stats.images_removed;
      if (totalRemoved > 0) {
        setStatus("success", `Removed ${totalRemoved} watermarks!`);
      } else {
        setStatus("success", "No watermarks detected");
      }
      setResult(data as any);
      queryClient.invalidateQueries({ queryKey: ["remaining-uses"] });
    },
    onError: (error: any) => {
      hideProgress();
      if (shouldShowErrorToast(error)) {
        toast.error(error.response?.data?.message || "Watermark removal failed");
      }
    },
  });

  const handleSplit = () => {
    if (!selectedFiles.length) {
      toast.error("Please select a PDF file");
      return;
    }
    if (!pageRanges) {
      toast.error("Please enter page ranges");
      return;
    }

    setResult(null);
    showProgress({ status: "uploading", fileName: selectedFiles[0].name });
    const formData = new FormData();
    formData.append("file", selectedFiles[0]);
    formData.append("page_ranges", pageRanges);
    setTimeout(() => setStatus("processing", "Splitting PDF..."), 500);
    splitMutation.mutate(formData);
  };

  const handleMerge = () => {
    if (selectedFiles.length < 2) {
      toast.error("Please select at least 2 PDF files");
      return;
    }

    setResult(null);
    showProgress({ status: "uploading", fileName: `${selectedFiles.length} files` });
    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append("files", file);
    });
    setTimeout(() => setStatus("processing", "Merging PDFs..."), 500);
    mergeMutation.mutate(formData);
  };

  const handleCompress = () => {
    if (!selectedFiles.length) {
      toast.error("Please select a PDF file");
      return;
    }

    setResult(null);
    showProgress({ status: "uploading", fileName: selectedFiles[0].name });
    const formData = new FormData();
    formData.append("file", selectedFiles[0]);
    formData.append("compression_level", compressionLevel);
    setTimeout(() => setStatus("processing", "Compressing PDF..."), 500);
    compressMutation.mutate(formData);
  };

  const handleToWord = () => {
    if (!selectedFiles.length) {
      toast.error("Please select a PDF file");
      return;
    }

    setResult(null);
    showProgress({ status: "uploading", fileName: selectedFiles[0].name });
    const formData = new FormData();
    formData.append("file", selectedFiles[0]);
    setTimeout(() => setStatus("processing", "Converting to Word..."), 500);
    toWordMutation.mutate(formData);
  };

  const handleRemoveWatermark = () => {
    if (!selectedFiles.length) {
      toast.error("Please select a PDF file");
      return;
    }

    setResult(null);
    showProgress({ status: "uploading", fileName: selectedFiles[0].name });
    const formData = new FormData();
    formData.append("file", selectedFiles[0]);
    formData.append("watermark_text", watermarkText);
    formData.append("remove_images", removeImages.toString());
    formData.append("remove_text_watermarks", "true");
    setTimeout(() => setStatus("processing", "Removing watermarks..."), 500);
    removeWatermarkMutation.mutate(formData);
  };

  const isPending =
    splitMutation.isPending ||
    mergeMutation.isPending ||
    compressMutation.isPending ||
    toWordMutation.isPending ||
    removeWatermarkMutation.isPending;

  const handleDownload = (downloadUrl: string) => {
    const link = document.createElement("a");
    link.href = `${API_URL}${downloadUrl}`;
    link.download = "";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAction = () => {
    switch (activeTab) {
      case "split":
        handleSplit();
        break;
      case "merge":
        handleMerge();
        break;
      case "compress":
        handleCompress();
        break;
      case "toword":
        handleToWord();
        break;
      case "removewatermark":
        handleRemoveWatermark();
        break;
    }
  };

  const getActionLabel = () => {
    switch (activeTab) {
      case "split":
        return "Split PDF";
      case "merge":
        return "Merge PDFs";
      case "compress":
        return "Compress PDF";
      case "toword":
        return "Convert to Word";
      case "removewatermark":
        return "Remove Watermark";
      default:
        return "Process";
    }
  };

  const isActionDisabled = () => {
    if (activeTab === "merge") return selectedFiles.length < 2;
    return !selectedFiles.length;
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-red-500/10 to-orange-500/10">
                <FileText className="h-7 w-7 sm:h-8 sm:w-8 text-red-500" />
              </div>
              PDF Toolkit
            </h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              Professional PDF tools - split, merge, compress, and convert
            </p>
          </div>
          <UsageBadge />
        </div>
      </div>

      {/* Tool Selector Cards - Compact */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 mb-6">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTab === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => {
                setActiveTab(tool.id);
                setSelectedFiles([]);
                setResult(null);
              }}
              className={cn(
                "relative p-3 rounded-lg border transition-all duration-200 text-left group",
                isActive
                  ? `bg-gradient-to-br ${tool.bgGradient} ${tool.borderColor} shadow-md`
                  : "bg-card border-border/50 hover:border-border hover:bg-muted/30"
              )}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "w-8 h-8 rounded-md flex items-center justify-center shrink-0",
                    isActive ? tool.iconBg : "bg-muted"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      isActive ? tool.iconColor : "text-muted-foreground"
                    )}
                  />
                </div>
                <div className="min-w-0">
                  <h3
                    className={cn(
                      "font-medium text-sm truncate",
                      isActive ? "text-foreground" : "text-foreground/80"
                    )}
                  >
                    {tool.name}
                  </h3>
                  <p className="text-[10px] text-muted-foreground truncate hidden sm:block">
                    {tool.description}
                  </p>
                </div>
                {isActive && (
                  <CheckCircle2 className={cn("h-4 w-4 shrink-0 ml-auto", tool.iconColor)} />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Upload & Options Section - Takes more space */}
        <div className="lg:col-span-3 space-y-6">
          {/* File Upload Card */}
          <Card className="overflow-hidden">
            <CardHeader className={cn("bg-gradient-to-r", activeTool.bgGradient)}>
              <CardTitle className="flex items-center gap-2">
                <activeTool.icon className={cn("h-5 w-5", activeTool.iconColor)} />
                {activeTab === "merge" ? "Upload PDFs to Merge" : `Upload PDF to ${activeTool.name}`}
              </CardTitle>
              <CardDescription>
                {activeTab === "merge"
                  ? "Select multiple PDF files (they'll be merged in order)"
                  : "Drag and drop or click to select your PDF file"}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <FileDropzone
                onFilesSelected={handleFileSelect}
                accept={{ "application/pdf": [".pdf"] }}
                multiple={activeTab === "merge"}
                selectedFiles={selectedFiles}
                onRemoveFile={handleRemoveFile}
              />

              {/* Selected files list for merge */}
              {activeTab === "merge" && selectedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Files to merge ({selectedFiles.length})
                  </p>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg group"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium">
                            {index + 1}
                          </span>
                          <File className="h-4 w-4 text-red-500" />
                          <span className="text-sm truncate max-w-[200px]">
                            {file.name}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemoveFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Options Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeTab === "split" && (
                <div className="space-y-3">
                  <Label htmlFor="pageRanges" className="text-sm font-medium">
                    Page Ranges
                  </Label>
                  <Input
                    id="pageRanges"
                    placeholder="e.g., 1-5, 6-10, 11-15 or 'all'"
                    value={pageRanges}
                    onChange={(e) => setPageRanges(e.target.value)}
                    className="font-mono"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPageRanges("all")}
                      className="text-xs"
                    >
                      Split all pages
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPageRanges("1-5")}
                      className="text-xs"
                    >
                      First 5 pages
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use commas to separate ranges. &apos;all&apos; splits into individual pages.
                  </p>
                </div>
              )}

              {activeTab === "merge" && (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                  <Merge className="h-5 w-5 text-purple-500 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Files will be merged in the order shown above. Drag to reorder if needed.
                  </p>
                </div>
              )}

              {activeTab === "compress" && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Compression Level</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "low", label: "Low", desc: "Better quality" },
                      { id: "medium", label: "Medium", desc: "Balanced" },
                      { id: "high", label: "High", desc: "Smaller size" },
                    ].map((level) => (
                      <button
                        key={level.id}
                        onClick={() => setCompressionLevel(level.id)}
                        className={cn(
                          "p-3 rounded-lg border-2 transition-all text-center",
                          compressionLevel === level.id
                            ? "border-green-500 bg-green-500/10"
                            : "border-border hover:border-border/80"
                        )}
                      >
                        <p className="font-medium text-sm">{level.label}</p>
                        <p className="text-xs text-muted-foreground">{level.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "toword" && (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                  <FileOutput className="h-5 w-5 text-orange-500 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Your PDF will be converted to an editable .docx file with preserved formatting.
                  </p>
                </div>
              )}

              {activeTab === "removewatermark" && (
                <div className="space-y-4">
                  {/* Limitations Warning */}
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-600 dark:text-amber-400 mb-1">
                        Limitations
                      </p>
                      <ul className="text-muted-foreground space-y-1 text-xs">
                        <li>• Works best on text overlay watermarks</li>
                        <li>• Works on annotation-based watermarks</li>
                        <li>• May NOT work on watermarks baked into images</li>
                        <li>• Heavily embedded watermarks may not be removable</li>
                      </ul>
                    </div>
                  </div>

                  {/* Watermark Text (Optional) */}
                  <div className="space-y-2">
                    <Label htmlFor="watermarkText" className="text-sm font-medium">
                      Watermark Text (Optional)
                    </Label>
                    <Input
                      id="watermarkText"
                      placeholder="e.g., CONFIDENTIAL, DRAFT, Sample"
                      value={watermarkText}
                      onChange={(e) => setWatermarkText(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Specify the watermark text to target specific watermarks.
                      Leave empty to auto-detect common watermark patterns.
                    </p>
                  </div>

                  {/* Remove Images Option */}
                  <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/30 transition-colors">
                    <input
                      type="checkbox"
                      checked={removeImages}
                      onChange={(e) => setRemoveImages(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <div>
                      <p className="text-sm font-medium">Remove small images</p>
                      <p className="text-xs text-muted-foreground">
                        Also attempt to remove small images that might be watermarks
                      </p>
                    </div>
                  </label>
                </div>
              )}

              {/* Action Button */}
              <div className="pt-4">
                <Button
                  className={cn(
                    "w-full h-12 text-base font-semibold bg-gradient-to-r",
                    activeTool.gradient
                  )}
                  onClick={handleAction}
                  disabled={isActionDisabled() || isPending}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <activeTool.icon className="mr-2 h-5 w-5" />
                      {getActionLabel()}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Result Section */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-primary" />
                Result
              </CardTitle>
              <CardDescription>
                {result ? "Your processed files are ready" : "Results will appear here"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isPending ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-muted animate-pulse" />
                    <Loader2 className="absolute inset-0 m-auto h-8 w-8 text-primary animate-spin" />
                  </div>
                  <p className="mt-4 text-sm font-medium">Processing your PDF...</p>
                  <p className="text-xs text-muted-foreground mt-1">This may take a moment</p>
                </div>
              ) : result ? (
                <div className="space-y-4">
                  {/* Stats */}
                  <div className="p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-semibold">Success!</span>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {result.original_pages && (
                        <p>Original: {result.original_pages} pages</p>
                      )}
                      <p>Total size: {formatBytes(result.total_size_bytes || (result as any).size || 0)}</p>
                    </div>
                  </div>

                  {/* Files */}
                  <div className="space-y-3">
                    {result.result_files?.map((file, index) => (
                      <div
                        key={index}
                        className="group relative p-4 rounded-xl border bg-card hover:shadow-md transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-red-500/10">
                            <File className="h-5 w-5 text-red-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{file.filename}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {file.pages} pages • {formatBytes(file.size)}
                              {file.compression_ratio && (
                                <span className="text-green-600 ml-2">
                                  {file.compression_ratio} saved
                                </span>
                              )}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleDownload(file.download_url)}
                            className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>
                    ))}

                    {/* For to-word single result */}
                    {(result as any).download_url && !result.result_files && (
                      <div className="group relative p-4 rounded-xl border bg-card hover:shadow-md transition-all">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-blue-500/10">
                            <File className="h-5 w-5 text-blue-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {(result as any).filename}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatBytes((result as any).size)}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleDownload((result as any).download_url)}
                            className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <FileText className="h-10 w-10 text-muted-foreground/30" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Upload a PDF and select an operation
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Results will appear here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
