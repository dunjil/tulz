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
import { formatBytes } from "@/lib/utils";
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
  Sheet,
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

export default function ExcelToPDFPage() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { showUpgradeModal } = useUpgradeModal();
  const { showLoginModal } = useLoginModal();
  const { showProgress, setStatus, hideProgress } = useProgressModal();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [result, setResult] = useState<any | null>(null);

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

  const excelToPDFMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await api.post("/tools/pdf/excel-to-pdf", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    },
    onSuccess: (data) => {
      setStatus("success", "Excel file converted to PDF!");
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["remaining-uses"] });
    },
    onError: (error: any) => {
      hideProgress();
      if (shouldShowErrorToast(error)) {
        toast.error(error.response?.data?.message || "Conversion failed");
      }
    },
  });

  const handleConvert = () => {
    if (!selectedFiles.length) {
      toast.error("Please select an Excel file");
      return;
    }

    setResult(null);
    showProgress({ status: "uploading", fileName: selectedFiles[0].name });
    const formData = new FormData();
    formData.append("file", selectedFiles[0]);
    setTimeout(() => setStatus("processing", "Converting to PDF..."), 500);
    excelToPDFMutation.mutate(formData);
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
              <div className="p-2 rounded-xl bg-gradient-to-br from-green-600/10 to-emerald-600/10">
                <Sheet className="h-7 w-7 sm:h-8 sm:w-8 text-green-600" />
              </div>
              Excel to PDF
            </h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              Convert Excel spreadsheets (.xlsx) to PDF format
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
            <CardHeader className="bg-gradient-to-r from-green-600/10 to-emerald-600/10">
              <CardTitle className="flex items-center gap-2">
                <Sheet className="h-5 w-5 text-green-600" />
                Upload Excel File
              </CardTitle>
              <CardDescription>
                Drag and drop or click to select your .xlsx file
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <FileDropzone
                onFilesSelected={handleFileSelect}
                accept={{
                  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
                  "application/vnd.ms-excel": [".xls"]
                }}
                multiple={false}
                selectedFiles={selectedFiles}
                onRemoveFile={() => setSelectedFiles([])}
              />
            </CardContent>
          </Card>

          {/* Options Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Conversion Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <Sheet className="h-5 w-5 text-green-600 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Your Excel spreadsheet will be converted to PDF with preserved formatting and layout.
                </p>
              </div>

              {/* Action Button */}
              <div className="pt-4">
                <Button
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-green-600 to-emerald-600"
                  onClick={handleConvert}
                  disabled={!selectedFiles.length || excelToPDFMutation.isPending}
                >
                  {excelToPDFMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Sheet className="mr-2 h-5 w-5" />
                      Convert to PDF
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
                {result ? "Your PDF is ready" : "Results will appear here"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {excelToPDFMutation.isPending ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-muted animate-pulse" />
                    <Loader2 className="absolute inset-0 m-auto h-8 w-8 text-primary animate-spin" />
                  </div>
                  <p className="mt-4 text-sm font-medium">Converting to PDF...</p>
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
                      <p>Spreadsheet converted to PDF</p>
                    </div>
                  </div>

                  {/* File */}
                  <div className="group relative p-4 rounded-xl border bg-card hover:shadow-md transition-all">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-green-600/10">
                        <File className="h-5 w-5 text-green-600" />
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
                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
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
                    Upload an Excel file to convert
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
      <RelatedGuide guideSlug="how-to-convert-excel-to-pdf-reports" />
    </div>
  );
}
