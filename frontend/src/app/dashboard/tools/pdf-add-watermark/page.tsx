"use client";

import { RelatedGuide } from "@/components/shared/related-guide";

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
import { FileDropzone } from "@/components/shared/file-dropzone";
import {
  Type,
  Download,
  File,
  Crown,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  FileCheck,
  Loader2,
  FileText,
} from "lucide-react";
import { UsageBadge } from "@/components/shared/usage-badge";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function PDFAddWatermarkPage() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { showUpgradeModal } = useUpgradeModal();
  const { showLoginModal } = useLoginModal();
  const { showProgress, setStatus, hideProgress } = useProgressModal();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [result, setResult] = useState<any | null>(null);
  const [watermarkText, setWatermarkText] = useState("");
  const [opacity, setOpacity] = useState(0.3);
  const [position, setPosition] = useState("center");

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

  const handleFileSelect = (files: File[]) => {
    setSelectedFiles(files.slice(0, 1));
    setResult(null);
  };

  const addWatermarkMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await api.post("/tools/pdf/add-watermark", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    },
    onSuccess: (data) => {
      setStatus("success", "Watermark added successfully!");
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["remaining-uses"] });
    },
    onError: (error: any) => {
      hideProgress();
      if (shouldShowErrorToast(error)) {
        toast.error(error.response?.data?.message || "Failed to add watermark");
      }
    },
  });

  const handleAddWatermark = () => {
    if (!selectedFiles.length) {
      toast.error("Please select a PDF file");
      return;
    }
    if (!watermarkText) {
      toast.error("Please enter watermark text");
      return;
    }

    setResult(null);
    showProgress({ status: "uploading", fileName: selectedFiles[0].name });
    const formData = new FormData();
    formData.append("file", selectedFiles[0]);
    formData.append("watermark_text", watermarkText);
    formData.append("opacity", opacity.toString());
    formData.append("position", position);
    setTimeout(() => setStatus("processing", "Adding watermark..."), 500);
    addWatermarkMutation.mutate(formData);
  };

  const handleDownload = (downloadUrl: string) => {
    const link = document.createElement("a");
    link.href = `${API_URL}${downloadUrl}`;
    link.download = "";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-pink-500/10 to-rose-500/10">
                <Type className="h-7 w-7 sm:h-8 sm:w-8 text-pink-500" />
              </div>
              Add Watermark
            </h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              Add text watermarks to your PDF documents
            </p>
          </div>
          <UsageBadge />
        </div>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Upload & Options Section */}
        <div className="lg:col-span-3 space-y-6">
          {/* File Upload Card */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-pink-500/10 to-rose-500/10">
              <CardTitle className="flex items-center gap-2">
                <Type className="h-5 w-5 text-pink-500" />
                Upload PDF
              </CardTitle>
              <CardDescription>
                Drag and drop or click to select your PDF file
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <FileDropzone
                onFilesSelected={handleFileSelect}
                accept={{ "application/pdf": [".pdf"] }}
                multiple={false}
                selectedFiles={selectedFiles}
                onRemoveFile={() => setSelectedFiles([])}
              />
            </CardContent>
          </Card>

          {/* Options Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Watermark Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="watermarkText" className="text-sm font-medium">
                  Watermark Text
                </Label>
                <Input
                  id="watermarkText"
                  placeholder="e.g., CONFIDENTIAL, DRAFT, © 2024"
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="opacity" className="text-sm font-medium">
                  Opacity: {Math.round(opacity * 100)}%
                </Label>
                <input
                  id="opacity"
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={opacity}
                  onChange={(e) => setOpacity(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Position</Label>
                <div className="grid grid-cols-3 gap-2">
                  {["top", "center", "bottom"].map((pos) => (
                    <button
                      key={pos}
                      onClick={() => setPosition(pos)}
                      className={cn(
                        "p-2 rounded-lg border-2 transition-all text-center capitalize",
                        position === pos
                          ? "border-pink-500 bg-pink-500/10"
                          : "border-border hover:border-border/80"
                      )}
                    >
                      <p className="font-medium text-sm">{pos}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4">
                <Button
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-pink-500 to-rose-500"
                  onClick={handleAddWatermark}
                  disabled={!selectedFiles.length || addWatermarkMutation.isPending}
                >
                  {addWatermarkMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Type className="mr-2 h-5 w-5" />
                      Add Watermark
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
                {result ? "Your watermarked PDF is ready" : "Results will appear here"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {addWatermarkMutation.isPending ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-muted animate-pulse" />
                    <Loader2 className="absolute inset-0 m-auto h-8 w-8 text-primary animate-spin" />
                  </div>
                  <p className="mt-4 text-sm font-medium">Adding watermark...</p>
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
                      <p>Watermark added successfully</p>
                    </div>
                  </div>

                  {/* File */}
                  <div className="group relative p-4 rounded-xl border bg-card hover:shadow-md transition-all">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-pink-500/10">
                        <File className="h-5 w-5 text-pink-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {result.filename}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatBytes(result.size)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleDownload(result.download_url)}
                        className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <FileText className="h-10 w-10 text-muted-foreground/30" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Upload a PDF to add watermark
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
      <RelatedGuide guideSlug="how-to-add-watermark-to-pdf" />
    </div>
  );
}
