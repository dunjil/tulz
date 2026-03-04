"use client";

import { RelatedGuide } from "@/components/shared/related-guide";
import { ToolInfoSection } from "@/components/shared/tool-info-section";

import { useState } from "react";
import Link from "next/link";
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
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileDropzone } from "@/components/shared/file-dropzone";
import {
  Minimize2,
  Download,
  File,
  Crown,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  FileCheck,
  Loader2,
  FileText,
  BookOpen,
  Lightbulb,
  ChevronRight,
} from "lucide-react";
import type { PDFResponse } from "@/types";
import { SupportButton } from "@/components/shared/support-button";
import { FreeBadge } from "@/components/shared/free-badge";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function PDFCompressPage() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { showLoginModal } = useLoginModal();
  const { showProgress, setStatus, hideProgress } = useProgressModal();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [result, setResult] = useState<PDFResponse | null>(null);
  const [compressionLevel, setCompressionLevel] = useState("medium");

  // Get usage data to check if user can use tools
  const { data: usageData } = useQuery({
    queryKey: ["remaining-uses"],
    queryFn: async () => {
      const response = await apiHelpers.getRemainingUses();
      return response.data;
    },
    enabled: !!isAuthenticated,
  });


  const handleFileSelect = (files: File[]) => {
    setSelectedFiles(files.slice(0, 1));
    setResult(null);
  };

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
    setStatus("processing", "Compressing PDF...");
    compressMutation.mutate(formData);
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
              <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10">
                <Minimize2 className="h-7 w-7 sm:h-8 sm:w-8 text-green-500" />
              </div>
              Compress PDF
            </h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              Reduce PDF file size while maintaining quality
            </p>
          </div>
          <SupportButton size="sm" />
          <FreeBadge />

        </div>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Upload & Options Section */}
        <div className="lg:col-span-3 space-y-6">
          {/* File Upload Card */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-green-500/10 to-emerald-500/10">
              <CardTitle className="flex items-center gap-2">
                <Minimize2 className="h-5 w-5 text-green-500" />
                Upload PDF to Compress
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
              <CardTitle className="text-lg">Compression Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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

              {/* Action Button */}
              <div className="pt-4">
                <Button
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-green-500 to-emerald-500"
                  onClick={handleCompress}
                  disabled={!selectedFiles.length || compressMutation.isPending}
                >
                  {compressMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Minimize2 className="mr-2 h-5 w-5" />
                      Compress PDF
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
                {result ? "Your compressed file is ready" : "Results will appear here"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {compressMutation.isPending ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-muted animate-pulse" />
                    <Loader2 className="absolute inset-0 m-auto h-8 w-8 text-primary animate-spin" />
                  </div>
                  <p className="mt-4 text-sm font-medium">Compressing your PDF...</p>
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
                        <p>Pages: {result.original_pages}</p>
                      )}
                      <p>Total size: {formatBytes(result.total_size_bytes || 0)}</p>
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
                          <div className="p-2 rounded-lg bg-green-500/10">
                            <File className="h-5 w-5 text-green-500" />
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
                            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
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
                    Upload a PDF to compress
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

      <RelatedGuide guideSlug="how-to-reduce-pdf-file-size" />

      <ToolInfoSection
        heading="About the PDF Compressor"
        overview="PDF files are essential for sharing documents professionally, but they can grow surprisingly large — especially when they contain high-resolution images, embedded fonts, or scanned pages. Our free online PDF compressor uses the same algorithms found in professional tools like Adobe Acrobat and Ghostscript to reduce file size while keeping your document readable and visually intact."
        howItWorks="When you upload a PDF, our server analyses the file structure and applies a combination of techniques depending on the compression level you select. At 'Low', we optimise font embedding and strip redundant metadata. At 'Medium', we also re-compress images at a slightly lower quality setting. At 'High', we use aggressive image downscaling and maximum metadata stripping — ideal when you need to meet a strict KB limit. In most cases, 'Medium' compression reduces file size by 40–70% with no visible quality difference to the human eye."
        benefits={[
          { title: "No quality loss on text", description: "Our engine prioritises text clarity above all else. Even at the highest compression, your paragraph text, headings, and table data remain perfectly sharp and legible." },
          { title: "Meet portal file size limits", description: "Government portals, job application systems, and university submission platforms often impose strict limits of 100KB, 200KB, or 1MB. We help you hit those targets precisely." },
          { title: "Faster email delivery", description: "Most email providers cap attachments at 10–25MB. A compressed PDF is faster to send, faster to download, and easier for recipients on mobile data." },
          { title: "100% private processing", description: "Your PDF is never stored on our servers. After compression, the output file is available for download for a brief period and then permanently deleted — automatically." },
        ]}
        useCases={[
          "Compressing scanned bank statements, payslips, or tax documents to under 100KB for government or visa portal uploads",
          "Reducing the size of a large PowerPoint-converted PDF before emailing it to clients",
          "Shrinking an academic dissertation or thesis for submission to an online portal with strict file limits",
          "Batch-preparing a portfolio PDF with many photos to share via a download link or messaging app",
          "Reducing invoices and contracts before archiving large numbers of them in cloud storage",
        ]}
        faq={[
          { q: "How much can I compress a PDF?", a: "It depends on the content. PDFs with high-resolution images can often be reduced by 70–90%. Text-only PDFs are already compact and may only reduce by 10–30%. Our 'High' setting gives you the smallest possible output." },
          { q: "Will my PDF look blurry after compression?", a: "At 'Low' and 'Medium', the visual quality is virtually indistinguishable from the original. At 'High', images may show slight softness, but all text remains crisp. For official documents, this is almost always acceptable." },
          { q: "Is there a file size limit for uploads?", a: "Yes, you can upload PDFs up to 50MB. If your original file is larger, we recommend first splitting it with our PDF Splitter and compressing each part separately." },
          { q: "Can I compress a password-protected PDF?", a: "Not directly. You will need to use our PDF Unlocker first to remove the password, then compress the unlocked version." },
          { q: "What is the difference between Low, Medium, and High compression?", a: "'Low' strips metadata and optimises without touching images. 'Medium' also re-encodes images at ~75% quality. 'High' uses maximum image downscaling and is ideal for meeting strict upload limits (like DS-160 forms at 240KB or job portals at 100KB)." },
        ]}
      />
    </div>
  );
}