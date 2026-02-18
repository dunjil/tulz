"use client";

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
  Globe,
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
import { RelatedGuide } from "@/components/shared/related-guide";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function HTMLToPDFPage() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { showUpgradeModal } = useUpgradeModal();
  const { showLoginModal } = useLoginModal();
  const { showProgress, setStatus, hideProgress } = useProgressModal();
  const [result, setResult] = useState<any | null>(null);
  const [url, setUrl] = useState("");

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

  const htmlToPDFMutation = useMutation({
    mutationFn: async (data: { url: string }) => {
      const response = await api.post("/tools/pdf/html-to-pdf", data);
      return response.data;
    },
    onSuccess: (data) => {
      setStatus("success", "Web page converted to PDF!");
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
    if (!url) {
      toast.error("Please enter a URL");
      return;
    }

    setResult(null);
    showProgress({ status: "processing", fileName: "Web page" });
    setTimeout(() => setStatus("processing", "Converting web page to PDF..."), 500);
    htmlToPDFMutation.mutate({ url });
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
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10">
                <Globe className="h-7 w-7 sm:h-8 sm:w-8 text-blue-500" />
              </div>
              HTML to PDF
            </h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              Convert web pages and HTML content to PDF documents
            </p>
          </div>
          <UsageBadge />
        </div>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Upload & Options Section */}
        <div className="lg:col-span-3 space-y-6">
          {/* URL Input Card */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10">
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-500" />
                Enter Web Page URL
              </CardTitle>
              <CardDescription>
                Provide the URL of the web page you want to convert
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Label htmlFor="url" className="text-sm font-medium">
                  URL
                </Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the complete URL including https://
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Options Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Conversion Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <Globe className="h-5 w-5 text-blue-500 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">
                  The web page will be captured and converted to a PDF document with preserved layout and styling.
                </p>
              </div>

              {/* Action Button */}
              <div className="pt-4">
                <Button
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-500 to-indigo-500"
                  onClick={handleConvert}
                  disabled={!url || htmlToPDFMutation.isPending}
                >
                  {htmlToPDFMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Globe className="mr-2 h-5 w-5" />
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
              {htmlToPDFMutation.isPending ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-muted animate-pulse" />
                    <Loader2 className="absolute inset-0 m-auto h-8 w-8 text-primary animate-spin" />
                  </div>
                  <p className="mt-4 text-sm font-medium">Converting web page...</p>
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
                      <p>Web page converted to PDF</p>
                    </div>
                  </div>

                  {/* File */}
                  <div className="group relative p-4 rounded-xl border bg-card hover:shadow-md transition-all">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <File className="h-5 w-5 text-blue-500" />
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
                        className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
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
                    Enter a URL to convert
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
      <RelatedGuide guideSlug="how-to-convert-html-to-pdf" />
    </div>
  );
}
