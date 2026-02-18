"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { RelatedGuide } from "@/components/shared/related-guide";
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
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileDropzone } from "@/components/shared/file-dropzone";
import {
  Hash,
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

export default function PDFPageNumbersPage() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { showUpgradeModal } = useUpgradeModal();
  const { showLoginModal } = useLoginModal();
  const { showProgress, setStatus, hideProgress } = useProgressModal();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [result, setResult] = useState<any | null>(null);
  const [position, setPosition] = useState("bottom-center");
  const [format, setFormat] = useState("Page {n}");

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

  const addPageNumbersMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await api.post("/tools/pdf/add-page-numbers", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    },
    onSuccess: (data) => {
      setStatus("success", "Page numbers added successfully!");
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["remaining-uses"] });
    },
    onError: (error: any) => {
      hideProgress();
      if (shouldShowErrorToast(error)) {
        toast.error(error.response?.data?.message || "Failed to add page numbers");
      }
    },
  });

  const handleAddPageNumbers = () => {
    if (!selectedFiles.length) {
      toast.error("Please select a PDF file");
      return;
    }

    setResult(null);
    showProgress({ status: "uploading", fileName: selectedFiles[0].name });
    const formData = new FormData();
    formData.append("file", selectedFiles[0]);
    formData.append("position", position);
    formData.append("format", format);
    setTimeout(() => setStatus("processing", "Adding page numbers..."), 500);
    addPageNumbersMutation.mutate(formData);
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
              <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10">
                <Hash className="h-7 w-7 sm:h-8 sm:w-8 text-emerald-500" />
              </div>
              Add Page Numbers
            </h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              Add page numbers to your PDF documents
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
            <CardHeader className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10">
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5 text-emerald-500" />
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
              <CardTitle className="text-lg">Page Number Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Position</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "top-left", label: "Top Left" },
                    { id: "top-center", label: "Top Center" },
                    { id: "top-right", label: "Top Right" },
                    { id: "bottom-left", label: "Bottom Left" },
                    { id: "bottom-center", label: "Bottom Center" },
                    { id: "bottom-right", label: "Bottom Right" },
                  ].map((pos) => (
                    <button
                      key={pos.id}
                      onClick={() => setPosition(pos.id)}
                      className={cn(
                        "p-2 rounded-lg border-2 transition-all text-center",
                        position === pos.id
                          ? "border-emerald-500 bg-emerald-500/10"
                          : "border-border hover:border-border/80"
                      )}
                    >
                      <p className="font-medium text-sm">{pos.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Format</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "Page {n}", label: "Page 1" },
                    { id: "{n}", label: "1" },
                    { id: "{n} of {total}", label: "1 of 10" },
                    { id: "- {n} -", label: "- 1 -" },
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      onClick={() => setFormat(fmt.id)}
                      className={cn(
                        "p-2 rounded-lg border-2 transition-all text-center",
                        format === fmt.id
                          ? "border-emerald-500 bg-emerald-500/10"
                          : "border-border hover:border-border/80"
                      )}
                    >
                      <p className="font-medium text-sm">{fmt.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4">
                <Button
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-emerald-500 to-teal-500"
                  onClick={handleAddPageNumbers}
                  disabled={!selectedFiles.length || addPageNumbersMutation.isPending}
                >
                  {addPageNumbersMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Hash className="mr-2 h-5 w-5" />
                      Add Page Numbers
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
                {result ? "Your PDF with page numbers is ready" : "Results will appear here"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {addPageNumbersMutation.isPending ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-muted animate-pulse" />
                    <Loader2 className="absolute inset-0 m-auto h-8 w-8 text-primary animate-spin" />
                  </div>
                  <p className="mt-4 text-sm font-medium">Adding page numbers...</p>
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
                      <p>Page numbers added successfully</p>
                    </div>
                  </div>

                  {/* File */}
                  <div className="group relative p-4 rounded-xl border bg-card hover:shadow-md transition-all">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-emerald-500/10">
                        <File className="h-5 w-5 text-emerald-500" />
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
                        className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
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
                    Upload a PDF to add page numbers
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
      <RelatedGuide guideSlug="how-to-add-page-numbers-to-pdf" />
    </div>
  );
}
