"use client";

import { RelatedGuide } from "@/components/shared/related-guide";

import { useState, useEffect, useCallback, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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
  FileText,
  Sparkles,
  FileDown,
  Eye,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { SupportButton } from "@/components/shared/support-button";
import { useAuth } from "@/providers/auth-provider";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

const sampleMarkdown = `# Sample Document

## Introduction

This is a **sample markdown** document to demonstrate the *Markdown to PDF* converter.

### Features

- Convert markdown to PDF
- Multiple themes available
- Code syntax highlighting
- Tables support

## Code Example

\`\`\`javascript
function greet(name) {
  console.log(\`Hello, \${name}!\`);
}
\`\`\`

## Table Example

| Name | Role | Experience |
|------|------|------------|
| John | Developer | 5 years |
| Jane | Designer | 3 years |

## Quote

> "The best way to predict the future is to create it."
> — Peter Drucker

---

*Thank you for using our tool!*
`;

export default function MarkdownPdfPage() {
  const { user } = useAuth();
  const isPro = user?.subscription_tier === "pro";
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [theme, setTheme] = useState("default");
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const { data: themes } = useQuery({
    queryKey: ["markdown-themes"],
    queryFn: async () => {
      const response = await apiHelpers.getMarkdownThemes();
      return response.data.themes as { id: string; name: string; description: string }[];
    },
  });

  // Generate PDF preview with debouncing
  const generatePreview = useCallback(async () => {
    if (!content.trim()) {
      setPdfPreviewUrl(null);
      return;
    }

    setIsGeneratingPreview(true);
    try {
      const response = await apiHelpers.markdownPdfPreview({
        content,
        theme,
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
      }
    } catch (error) {
      console.error("Preview generation failed:", error);
    } finally {
      setIsGeneratingPreview(false);
    }
  }, [content, theme, title]);

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
  }, [content, theme, title, generatePreview]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl);
      }
    };
  }, []);

  const convertMutation = useMutation({
    mutationFn: async () => {
      const response = await apiHelpers.markdownToPdf({
        content,
        theme,
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
        link.download = `${title || "document"}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success("PDF generated successfully!");
      } else {
        toast.error(data.error || "Failed to convert to PDF");
      }
    },
    onError: (error: any) => {
      if (shouldShowErrorToast(error)) {
        toast.error(error.response?.data?.message || "Conversion failed");
      }
    },
  });

  const loadSample = () => {
    setContent(sampleMarkdown);
    setTitle("Sample Document");
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
              <FileText className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
              Markdown to PDF
            </h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              Convert your Markdown documents to beautifully styled PDFs
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {!isPro && <SupportButton size="sm" />}
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Free - Unlimited</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Editor Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Markdown Editor</span>
              <Button variant="outline" size="sm" onClick={loadSample}>
                Load Sample
              </Button>
            </CardTitle>
            <CardDescription>
              Write or paste your Markdown content
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Document Title (optional)</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My Document"
              />
            </div>

            <div className="space-y-2">
              <Label>Theme</Label>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {themes?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  )) || (
                      <>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="github">GitHub</SelectItem>
                        <SelectItem value="academic">Academic</SelectItem>
                        <SelectItem value="minimal">Minimal</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="elegant">Elegant</SelectItem>
                      </>
                    )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="# Your Markdown Here

Write your content using **bold**, *italic*, `code`, and more..."
                className="font-mono text-sm min-h-[500px] resize-y"
              />
            </div>

            <Button
              className="w-full"
              onClick={() => convertMutation.mutate()}
              disabled={!content || convertMutation.isPending}
            >
              <FileDown className="mr-2 h-4 w-4" />
              {convertMutation.isPending ? "Generating..." : "Download PDF"}
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
                title="PDF Preview"
              />
            ) : (
              <div className="h-full min-h-[400px] border rounded-lg bg-muted/50 flex items-center justify-center">
                <p className="text-muted-foreground text-sm">
                  {isGeneratingPreview
                    ? "Generating preview..."
                    : "Start typing in the editor to see your PDF preview..."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Markdown Tips */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Markdown Quick Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Headers</h4>
              <pre className="bg-muted p-2 rounded text-xs">
                {`# H1
## H2
### H3`}
              </pre>
            </div>
            <div>
              <h4 className="font-medium mb-2">Emphasis</h4>
              <pre className="bg-muted p-2 rounded text-xs">
                {`**bold**
*italic*
\`code\``}
              </pre>
            </div>
            <div>
              <h4 className="font-medium mb-2">Lists</h4>
              <pre className="bg-muted p-2 rounded text-xs">
                {`- Item 1
- Item 2
1. Numbered`}
              </pre>
            </div>
            <div>
              <h4 className="font-medium mb-2">Other</h4>
              <pre className="bg-muted p-2 rounded text-xs">
                {`> Quote
---
[Link](url)`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
      <RelatedGuide guideSlug="how-to-convert-markdown-to-pdf" />
    </div>
  );
}
