"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { RelatedGuide } from "@/components/shared/related-guide";
import { ToolInfoSection } from "@/components/shared/tool-info-section";
import { api, apiHelpers, shouldShowErrorToast } from "@/lib/api";
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
  FileOutput,
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
import { SupportButton } from "@/components/shared/support-button";
import { FreeBadge } from "@/components/shared/free-badge";


const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function PDFToWordPage() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
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


  const handleFileSelect = (files: File[]) => {
    setSelectedFiles(files.slice(0, 1));
    setResult(null);
  };

  const toWordMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await api.post("/tools/pdf/to-word", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    },
    onSuccess: (data) => {
      setStatus("success", "PDF converted to Word!");
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
      toast.error("Please select a PDF file");
      return;
    }

    setResult(null);
    showProgress({ status: "uploading", fileName: selectedFiles[0].name });
    const formData = new FormData();
    formData.append("file", selectedFiles[0]);
    setStatus("processing", "Converting to Word...");
    toWordMutation.mutate(formData);
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
              <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500/10 to-amber-500/10">
                <FileOutput className="h-7 w-7 sm:h-8 sm:w-8 text-orange-500" />
              </div>
              PDF to Word
            </h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              Convert PDF files to editable Word documents (.docx)
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
            <CardHeader className="bg-gradient-to-r from-orange-500/10 to-amber-500/10">
              <CardTitle className="flex items-center gap-2">
                <FileOutput className="h-5 w-5 text-orange-500" />
                Upload PDF to Convert
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
              <CardTitle className="text-lg">Conversion Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <FileOutput className="h-5 w-5 text-orange-500 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Your PDF will be converted to an editable .docx file with preserved formatting.
                </p>
              </div>

              {/* Action Button */}
              <div className="pt-4">
                <Button
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-orange-500 to-amber-500"
                  onClick={handleConvert}
                  disabled={!selectedFiles.length || toWordMutation.isPending}
                >
                  {toWordMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <FileOutput className="mr-2 h-5 w-5" />
                      Convert to Word
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
                {result ? "Your Word file is ready" : "Results will appear here"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {toWordMutation.isPending ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-muted animate-pulse" />
                    <Loader2 className="absolute inset-0 m-auto h-8 w-8 text-primary animate-spin" />
                  </div>
                  <p className="mt-4 text-sm font-medium">Converting to Word...</p>
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
                      <p>Converted to Word format</p>
                    </div>
                  </div>

                  {/* File */}
                  <div className="group relative p-4 rounded-xl border bg-card hover:shadow-md transition-all">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-orange-500/10">
                        <File className="h-5 w-5 text-orange-500" />
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
                        className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
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
                    Upload a PDF to convert to Word
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
      <RelatedGuide guideSlug="how-to-convert-pdf-to-word" />

      <ToolInfoSection
        heading="About the PDF to Word Converter"
        overview="PDF is a great format for sharing finalized documents — but when you need to edit the content, you're stuck unless you have the original source file. Our free PDF to Word converter analyses the structure of your document and reconstructs it as a fully editable .docx file, including text, tables, images, column layouts, and styling. You can then open it in Microsoft Word, Google Docs, LibreOffice, or any compatible editor."
        howItWorks="PDF-to-Word conversion is a technically complex process. PDFs do not store documents as structured text the way Word does — they store instructions for drawing text and graphics at specific positions on a page. To convert them back to Word, our engine uses AI-assisted layout detection to identify paragraphs, headers, tables, lists, and image regions, then reconstructs them as corresponding Word elements (.docx XML). The result is an editable document that closely mirrors the original layout. For digitally created PDFs, accuracy is typically very high. For scanned PDFs, we recommend using OCR first."
        benefits={[
          { title: "Accurate layout reconstruction", description: "Our engine preserves multi-column layouts, table structures, and paragraph spacing rather than dumping all text into a single column." },
          { title: "Editable in any Word processor", description: "The output is a standard .docx file compatible with Microsoft Word 2010+, Google Docs, Apple Pages, LibreOffice, and WPS Office." },
          { title: "Works on all devices", description: "Convert PDFs directly from your phone, tablet, or desktop — no software installation or account required." },
          { title: "Images preserved", description: "Embedded photos, illustrations, and diagrams are extracted from the PDF and placed in the correct position in the Word document." },
        ]}
        useCases={[
          "Editing a contract or legal document received as a PDF when you don't have the original Word source",
          "Updating a CV or resume that someone only gave you in PDF format",
          "Extracting and editing the text of a government form or official document",
          "Repurposing content from a PDF report into a new presentation or document",
          "Correcting errors in a finalized PDF report without going back to the original author",
        ]}
        faq={[
          { q: "How accurate is the Word conversion?", a: "For standard digital PDFs (created by Word, InDesign, or similar tools), accuracy is typically 90–99%. Complex multi-column layouts with many overlapping elements may require minor manual adjustments after conversion." },
          { q: "Can I convert a scanned PDF to Word?", a: "Scanned PDFs are images of text, not actual text. Direct conversion will result in a Word file containing the page as a picture, not editable text. Use our OCR tool first to extract the text layer, then edit it directly." },
          { q: "Is my document private?", a: "Yes. Your PDF is uploaded to our servers only to perform the conversion. It is permanently deleted immediately after processing completes. We never read, store, or share your document content." },
          { q: "What is the maximum file size?", a: "You can upload PDFs up to 50MB in size. For very large documents, processing may take 30–60 seconds." },
          { q: "Can I convert multiple PDFs at once?", a: "Currently, you can convert one PDF at a time. For batch conversions, simply upload them one by one — each takes only a few seconds." },
        ]}
      />
    </div>
  );
}