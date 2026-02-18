"use client";

import { useState } from "react";
import { RelatedGuide } from "@/components/shared/related-guide";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api, apiHelpers, shouldShowErrorToast } from "@/lib/api";
import { useUpgradeModal } from "@/components/shared/upgrade-modal";
import { useLoginModal } from "@/components/shared/login-modal";
import { useProgressModal } from "@/components/shared/progress-modal";
import { useAuth } from "@/providers/auth-provider";
import { formatBytes } from "@/lib/utils";
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
  Droplets,
  Download,
  File,
  Crown,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  FileCheck,
  Loader2,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { UsageBadge } from "@/components/shared/usage-badge";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function PDFRemoveWatermarkPage() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { showUpgradeModal } = useUpgradeModal();
  const { showLoginModal } = useLoginModal();
  const { showProgress, setStatus, hideProgress } = useProgressModal();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [result, setResult] = useState<any | null>(null);
  const [watermarkText, setWatermarkText] = useState("");
  const [removeImages, setRemoveImages] = useState(false);

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
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["remaining-uses"] });
    },
    onError: (error: any) => {
      hideProgress();
      if (shouldShowErrorToast(error)) {
        toast.error(error.response?.data?.message || "Watermark removal failed");
      }
    },
  });

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
              <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500/10 to-pink-500/10">
                <Droplets className="h-7 w-7 sm:h-8 sm:w-8 text-rose-500" />
              </div>
              Remove Watermark
            </h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              Remove watermarks from your PDF files
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
            <CardHeader className="bg-gradient-to-r from-rose-500/10 to-pink-500/10">
              <CardTitle className="flex items-center gap-2">
                <Droplets className="h-5 w-5 text-rose-500" />
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
              <CardTitle className="text-lg">Removal Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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

              {/* Action Button */}
              <div className="pt-4">
                <Button
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-rose-500 to-pink-500"
                  onClick={handleRemoveWatermark}
                  disabled={!selectedFiles.length || removeWatermarkMutation.isPending}
                >
                  {removeWatermarkMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Droplets className="mr-2 h-5 w-5" />
                      Remove Watermark
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
                {result ? "Your cleaned file is ready" : "Results will appear here"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {removeWatermarkMutation.isPending ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-muted animate-pulse" />
                    <Loader2 className="absolute inset-0 m-auto h-8 w-8 text-primary animate-spin" />
                  </div>
                  <p className="mt-4 text-sm font-medium">Removing watermarks...</p>
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
                    {result.removal_stats && (
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Annotations removed: {result.removal_stats.annotations_removed}</p>
                        <p>Text instances removed: {result.removal_stats.text_instances_removed}</p>
                        <p>Images removed: {result.removal_stats.images_removed}</p>
                      </div>
                    )}
                  </div>

                  {/* File */}
                  <div className="group relative p-4 rounded-xl border bg-card hover:shadow-md transition-all">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-rose-500/10">
                        <File className="h-5 w-5 text-rose-500" />
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
                        className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
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
                    Upload a PDF to remove watermarks
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
      <RelatedGuide guideSlug="how-to-remove-watermark-from-pdf" />
    </div>
  );
}
