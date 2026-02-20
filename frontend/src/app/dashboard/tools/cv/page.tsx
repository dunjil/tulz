"use client";

import { RelatedGuide } from "@/components/shared/related-guide";

import { useState, useEffect, useCallback, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { apiHelpers, shouldShowErrorToast } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FileText,
  Sparkles,
  Download,
  Eye,
  FileDown,
  User,
  Briefcase,
  BookOpen,
  Lock,
  Crown,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { SupportButton } from "@/components/shared/support-button";
import { useUpgradeModal } from "@/components/shared/upgrade-modal";
import { useLoginModal } from "@/components/shared/login-modal";
import { useAuth } from "@/providers/auth-provider";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export default function CvGeneratorPage() {
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [template, setTemplate] = useState("modern");
  const [sampleDialogOpen, setSampleDialogOpen] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const { user, isAuthenticated } = useAuth();
  const isPro = user?.subscription_tier && ["pro", "premium", "unlimited"].includes(user.subscription_tier);
  const router = useRouter();
  const { showUpgradeModal } = useUpgradeModal();
  const { showLoginModal } = useLoginModal();

  // Get usage data to check if user can generate
  const { data: usageData } = useQuery({
    queryKey: ["remaining-uses"],
    queryFn: async () => {
      const response = await apiHelpers.getRemainingUses();
      return response.data;
    },
    enabled: !!isAuthenticated,
  });

  const hasRemainingUses = usageData?.remaining > 0 || usageData?.is_unlimited;

  // Handle template selection with Pro check
  const handleTemplateSelect = (templateId: string) => {
    const selectedTemplate = templates?.find((t) => t.id === templateId);
    if (selectedTemplate && !selectedTemplate.is_free && !isPro) {
      showUpgradeModal();
      return;
    }
    setTemplate(templateId);
  };

  // Generate PDF preview with debouncing
  const generatePreview = useCallback(async () => {
    if (!content.trim()) {
      setPdfPreviewUrl(null);
      return;
    }

    setIsGeneratingPreview(true);
    try {
      const response = await apiHelpers.cvPreview({
        content,
        template,
        title: title || undefined,
      });

      if (response.data.success && response.data.pdf_base64) {
        // Convert base64 to blob URL for iframe display
        const byteCharacters = atob(response.data.pdf_base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);

        // Revoke old URL to prevent memory leaks
        if (pdfPreviewUrl) {
          URL.revokeObjectURL(pdfPreviewUrl);
        }

        setPdfPreviewUrl(url);
      } else if (response.data.requires_pro) {
        // Pro template required - don't show error, just skip preview
      }
    } catch (error) {
      console.error("Preview generation failed:", error);
    } finally {
      setIsGeneratingPreview(false);
    }
  }, [content, template, title]);

  // Debounced preview generation - updates after user stops typing
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      generatePreview();
    }, 800); // Wait 800ms after last keystroke

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [content, template, title, generatePreview]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl);
      }
    };
  }, []);

  // Fetch templates
  const { data: templates } = useQuery({
    queryKey: ["cv-templates"],
    queryFn: async () => {
      const response = await apiHelpers.getCvTemplates();
      return response.data.templates as {
        id: string;
        name: string;
        description: string;
        is_free: boolean;
      }[];
    },
  });

  // Fetch samples list
  const { data: samples } = useQuery({
    queryKey: ["cv-samples"],
    queryFn: async () => {
      const response = await apiHelpers.getCvSamples();
      return response.data.samples as {
        id: string;
        name: string;
        description: string;
        is_free: boolean;
      }[];
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiHelpers.generateCv({
        content,
        template,
        title: title || undefined,
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        // Download the PDF
        const downloadUrl = API_URL
          ? `${API_URL}${data.download_url}`
          : data.download_url;
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = `${title || "cv"}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success("CV generated successfully!");
      } else {
        toast.error(data.error || "Failed to generate CV");
      }
    },
    onError: (error: any) => {
      if (shouldShowErrorToast(error)) {
        toast.error(error.response?.data?.message || "Generation failed");
      }
    },
  });

  const loadSampleMutation = useMutation({
    mutationFn: async (sampleId: string) => {
      const response = await apiHelpers.getCvSampleContent(sampleId);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.error) {
        if (data.requires_pro) {
          showUpgradeModal();
        } else {
          toast.error(data.error);
        }
        return;
      }
      setContent(data.content);
      setTitle(data.name);
      setSampleDialogOpen(false);
      toast.success(`Loaded "${data.name}" template`);
    },
    onError: () => {
      toast.error("Failed to load sample");
    },
  });

  const getSampleIcon = (sampleId: string) => {
    if (
      sampleId.includes("engineer") ||
      sampleId.includes("scientist") ||
      sampleId.includes("analyst")
    ) {
      return <Briefcase className="h-4 w-4" />;
    }
    if (sampleId.includes("academic") || sampleId.includes("nurse")) {
      return <BookOpen className="h-4 w-4" />;
    }
    return <User className="h-4 w-4" />;
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
              <User className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
              Markdown to CV
            </h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              Create professional CV/Resume PDFs from Markdown
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {!isPro && <SupportButton size="sm" />}
            {isPro ? (
              <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>All Templates Unlocked</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>All Templates Free</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Editor Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>CV Editor</span>
              <Dialog open={sampleDialogOpen} onOpenChange={setSampleDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Load Sample
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Choose a Sample CV</DialogTitle>
                    <DialogDescription>
                      Select a professional sample to get started quickly.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-3 mt-4">
                    {samples?.map((sample) => {
                      const isLocked = !sample.is_free && !isPro;
                      return (
                        <button
                          key={sample.id}
                          onClick={() => {
                            if (isLocked) {
                              showUpgradeModal();
                              return;
                            }
                            loadSampleMutation.mutate(sample.id);
                          }}
                          disabled={loadSampleMutation.isPending}
                          className={`flex items-start gap-3 p-4 text-left rounded-lg border transition-colors disabled:opacity-50 ${isLocked
                            ? "opacity-60 hover:bg-muted/50 cursor-not-allowed"
                            : "hover:bg-muted"
                            }`}
                        >
                          <div className={`flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0 ${isLocked
                            ? "bg-gray-100 text-gray-400 dark:bg-gray-800"
                            : "bg-primary/10 text-primary"
                            }`}>
                            {isLocked ? <Lock className="h-4 w-4" /> : getSampleIcon(sample.id)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{sample.name}</h4>
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                Free
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {sample.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </DialogContent>
              </Dialog>
            </CardTitle>
            <CardDescription>
              Write your CV in Markdown format or load a sample
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Document Title (optional)</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My CV"
              />
            </div>

            <div className="space-y-2">
              <Label>Template Style</Label>
              <Select value={template} onValueChange={handleTemplateSelect}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {templates?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{t.name}</span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          Free
                        </span>
                      </div>
                    </SelectItem>
                  )) || (
                      <>
                        <SelectItem value="modern">Modern</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="minimal">Minimal</SelectItem>
                        <SelectItem value="creative">Creative</SelectItem>
                      </>
                    )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>CV Content (Markdown)</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={`# Your Name
**Job Title**

email@example.com | (555) 123-4567 | City, State

---

## Summary

Brief professional summary...

---

## Experience

### Job Title
#### Company Name | Date Range

- Achievement 1
- Achievement 2

---

## Education

### Degree
#### University | Year

---

## Skills

**Category:** Skill 1, Skill 2, Skill 3`}
                className="font-mono text-sm min-h-[500px] resize-y"
              />
            </div>

            <Button
              className="w-full"
              onClick={() => generateMutation.mutate()}
              disabled={!content || generateMutation.isPending}
            >
              <FileDown className="mr-2 h-4 w-4" />
              {generateMutation.isPending ? "Generating..." : "Download PDF"}
            </Button>
          </CardContent>
        </Card>

        {/* Preview Panel */}
        <Card className="flex flex-col">
          <CardHeader className="flex-shrink-0">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                PDF Preview
                {isGeneratingPreview && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={generatePreview}
                disabled={!content || isGeneratingPreview}
              >
                <RefreshCw className={`h-4 w-4 ${isGeneratingPreview ? "animate-spin" : ""}`} />
              </Button>
            </CardTitle>
            <CardDescription>
              Exact PDF output - updates as you type
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {pdfPreviewUrl ? (
              <iframe
                src={pdfPreviewUrl}
                className="w-full h-full min-h-[400px] border rounded-lg bg-white"
                title="CV Preview"
              />
            ) : (
              <div className="h-full min-h-[400px] border rounded-lg bg-muted/50 flex items-center justify-center">
                <p className="text-muted-foreground text-sm">
                  {isGeneratingPreview
                    ? "Generating preview..."
                    : "Start typing in the editor to see your CV preview..."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <RelatedGuide guideSlug="how-to-build-ats-friendly-cv" />
    </div>
  );
}
