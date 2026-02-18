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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileDropzone } from "@/components/shared/file-dropzone";
import {
  Merge,
  Download,
  File,
  Crown,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  FileCheck,
  Loader2,
  FileText,
  X,
} from "lucide-react";
import { UsageBadge } from "@/components/shared/usage-badge";
import type { PDFResponse } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function PDFMergePage() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { showUpgradeModal } = useUpgradeModal();
  const { showLoginModal } = useLoginModal();
  const { showProgress, setStatus, hideProgress } = useProgressModal();
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

  const handleFileSelect = (files: File[]) => {
    setSelectedFiles((prev) => [...prev, ...files]);
    setResult(null);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

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
              <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10">
                <Merge className="h-7 w-7 sm:h-8 sm:w-8 text-purple-500" />
              </div>
              Merge PDFs
            </h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              Combine multiple PDF files into one document
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
            <CardHeader className="bg-gradient-to-r from-purple-500/10 to-pink-500/10">
              <CardTitle className="flex items-center gap-2">
                <Merge className="h-5 w-5 text-purple-500" />
                Upload PDFs to Merge
              </CardTitle>
              <CardDescription>
                Select multiple PDF files (they'll be merged in order)
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <FileDropzone
                onFilesSelected={handleFileSelect}
                accept={{ "application/pdf": [".pdf"] }}
                multiple={true}
                selectedFiles={selectedFiles}
                onRemoveFile={handleRemoveFile}
              />

              {/* Selected files list */}
              {selectedFiles.length > 0 && (
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
                          <File className="h-4 w-4 text-purple-500" />
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
              <CardTitle className="text-lg">Merge Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <Merge className="h-5 w-5 text-purple-500 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Files will be merged in the order shown above. Drag to reorder if needed.
                </p>
              </div>

              {/* Action Button */}
              <div className="pt-4">
                <Button
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-purple-500 to-pink-500"
                  onClick={handleMerge}
                  disabled={selectedFiles.length < 2 || mergeMutation.isPending}
                >
                  {mergeMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Merge className="mr-2 h-5 w-5" />
                      Merge PDFs
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
                {result ? "Your merged file is ready" : "Results will appear here"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mergeMutation.isPending ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-muted animate-pulse" />
                    <Loader2 className="absolute inset-0 m-auto h-8 w-8 text-primary animate-spin" />
                  </div>
                  <p className="mt-4 text-sm font-medium">Merging your PDFs...</p>
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
                        <p>Total: {result.original_pages} pages</p>
                      )}
                      <p>Size: {formatBytes(result.total_size_bytes || 0)}</p>
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
                          <div className="p-2 rounded-lg bg-purple-500/10">
                            <File className="h-5 w-5 text-purple-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{file.filename}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {file.pages} pages • {formatBytes(file.size)}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleDownload(file.download_url)}
                            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <FileText className="h-10 w-10 text-muted-foreground/30" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Upload at least 2 PDFs to merge
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
      <RelatedGuide guideSlug="how-to-merge-multiple-pdfs" />
    </div>
  );
}
