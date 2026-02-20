"use client";

import { RelatedGuide } from "@/components/shared/related-guide";
import { CV_TEMPLATES } from "@/data/cv-templates";

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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  FileText,
  Sparkles,
  Download,
  Eye,
  FileDown,
  User,
  Briefcase,
  BookOpen,
  Crown,
  Lock,
  Copy,
  Check,
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
  const [htmlPreview, setHtmlPreview] = useState<string>("");
  const [previewScale, setPreviewScale] = useState(1);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState("editor");
  const { user, isAuthenticated } = useAuth();
  const isPro = user?.subscription_tier && ["pro", "premium", "unlimited"].includes(user.subscription_tier);
  const router = useRouter();
  const { showUpgradeModal } = useUpgradeModal();
  const { showLoginModal } = useLoginModal();
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content);
    setIsCopied(true);
    toast.success("Markdown copied to clipboard!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Load templates and samples
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

  // Generate HTML preview in real-time
  useEffect(() => {
    import("marked").then(({ marked }) => {
      const html = marked.parse(content || "");
      // marked returns a promise in newer versions if configured, but by default it's sync
      if (typeof html === "string") {
        setHtmlPreview(html);
      } else {
        html.then((h) => setHtmlPreview(h));
      }
    });
  }, [content]);

  // Handle responsive scaling
  useEffect(() => {
    const updateScale = () => {
      if (previewContainerRef.current) {
        const containerWidth = previewContainerRef.current.offsetWidth - 64; // padding
        const a4WidthPx = 210 * 3.78; // 210mm to px (approx 96dpi)
        const newScale = Math.min(1, containerWidth / a4WidthPx);
        setPreviewScale(newScale);
      }
    };

    const observer = new ResizeObserver(updateScale);
    if (previewContainerRef.current) observer.observe(previewContainerRef.current);
    updateScale();

    return () => observer.disconnect();
  }, []);

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    setTemplate(templateId);
  };

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

      {/* Mobile View Tabs */}
      <div className="lg:hidden mb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-12 bg-muted/50 p-1">
            <TabsTrigger value="editor" className="data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2">
              <FileText className="h-4 w-4" />
              Editor
            </TabsTrigger>
            <TabsTrigger value="preview" className="data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* Editor Panel */}
        <div className={`${activeTab !== "editor" ? "hidden lg:block" : "block"}`}>
          <Card className="border-none shadow-xl bg-background/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  CV Editor
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyToClipboard}
                    disabled={!content}
                    className="h-8 text-[10px] sm:text-xs"
                  >
                    {isCopied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                    Copy
                  </Button>
                  <Dialog open={sampleDialogOpen} onOpenChange={setSampleDialogOpen}>
                    {/* ... (keep dialog content as is) ... */}
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
                </div>
              </CardTitle>
              <CardDescription>
                Write your CV in Markdown format or load a sample
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-semibold">Document Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="My Professional CV"
                    className="bg-background/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Template Style</Label>
                  <Select value={template} onValueChange={handleTemplateSelect}>
                    <SelectTrigger className="bg-background/50">
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
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Content (Markdown)</Label>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Supports CommonMark</span>
                </div>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={`# Your Name...`}
                  className="font-mono text-sm min-h-[500px] resize-y bg-background/50 border-dashed focus:border-solid transition-all"
                />
              </div>

              <Button
                className="w-full h-12 text-base font-bold shadow-lg shadow-primary/20 hover:scale-[1.01] transition-all"
                onClick={() => generateMutation.mutate()}
                disabled={!content || generateMutation.isPending}
              >
                <FileDown className="mr-2 h-5 w-5" />
                {generateMutation.isPending ? "Generating PDF..." : "Download PDF"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        <div className={`${activeTab !== "preview" ? "hidden lg:block" : "block"}`}>
          <Card className="flex flex-col border-none shadow-2xl bg-muted/20 overflow-hidden sticky top-6">
            <CardHeader className="flex-shrink-0 bg-background/40 border-b">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  Live Preview
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-1 rounded">A4 PDF</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0 flex flex-col relative group">
              <div
                ref={previewContainerRef}
                className="flex-1 overflow-auto p-4 sm:p-12 flex justify-center items-start bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] dark:bg-[radial-gradient(#334155_1px,transparent_1px)]"
              >
                {htmlPreview ? (
                  <div
                    className="bg-white shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] origin-top transition-all duration-300 ring-1 ring-black/5"
                    style={{
                      width: "210mm",
                      minHeight: "297mm",
                      transform: `scale(${previewScale})`,
                    }}
                  >
                    <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]"></div>
                    <style dangerouslySetInnerHTML={{ __html: CV_TEMPLATES[template]?.css || "" }} />
                    <div
                      className="cv-document relative z-10"
                      dangerouslySetInnerHTML={{ __html: htmlPreview }}
                    />
                  </div>
                ) : (
                  <div className="h-full min-h-[500px] w-full border-2 border-dashed rounded-2xl bg-background/50 flex flex-col items-center justify-center p-8 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center">
                      <FileText className="w-8 h-8 text-primary/40" />
                    </div>
                    <div>
                      <p className="text-foreground font-semibold">No content yet</p>
                      <p className="text-muted-foreground text-sm max-w-[200px]">
                        Start typing in the editor to see your professional CV come to life.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Floating Download */}
              <div className="lg:hidden absolute bottom-6 right-6 z-50">
                <Button
                  size="icon"
                  className="h-14 w-14 rounded-full shadow-2xl animate-bounce-subtle"
                  onClick={() => generateMutation.mutate()}
                  disabled={!content || generateMutation.isPending}
                >
                  <Download className="h-6 w-6" />
                </Button>
              </div>

              <div className="bg-background/80 backdrop-blur-sm border-t p-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <Sparkles className="w-3 h-3 text-primary" />
                  Frontend preview (A4 aspect-ratio)
                </div>
                <button
                  onClick={() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    setActiveTab('editor');
                  }}
                  className="lg:hidden text-[10px] font-bold text-primary hover:underline underline-offset-4"
                >
                  Back to Editor
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <RelatedGuide guideSlug="how-to-build-ats-friendly-cv" />
    </div>
  );
}
