"use client";

import { RelatedGuide } from "@/components/shared/related-guide";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api, shouldShowErrorToast } from "@/lib/api";
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
import { SupportButton } from "@/components/shared/support-button";
import { useProgressModal } from "@/components/shared/progress-modal";
import { useAuth } from "@/providers/auth-provider";
import {
  Globe,
  Download,
  Check,
  Apple,
  Smartphone,
  Monitor,
  FileCode,
  Sparkles,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface FaviconFile {
  name: string;
  size: string;
}

interface FaviconResponse {
  success: boolean;
  download_url: string;
  files: FaviconFile[];
  zip_size_bytes: number;
  site_name: string;
}

export default function FaviconPage() {
  const { user } = useAuth();
  const isPro = user?.subscription_tier === "pro";
  const { showProgress, setStatus, hideProgress } = useProgressModal();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<FaviconResponse | null>(null);

  // Options
  const [siteName, setSiteName] = useState("My Site");
  const [includeIco, setIncludeIco] = useState(true);
  const [includeApple, setIncludeApple] = useState(true);
  const [includeAndroid, setIncludeAndroid] = useState(true);
  const [includeMs, setIncludeMs] = useState(true);
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");

  // Fetch available sizes
  const { data: sizesData } = useQuery({
    queryKey: ["favicon-sizes"],
    queryFn: async () => {
      const response = await api.get("/tools/favicon/sizes");
      return response.data;
    },
  });

  const handleFileSelect = (files: File[]) => {
    if (files.length > 0) {
      setSelectedFile(files[0]);
      setResult(null);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(files[0]);
    }
  };

  const generateMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await api.post("/tools/favicon/generate", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data as FaviconResponse;
    },
    onSuccess: (data) => {
      setStatus("success", "Favicon package ready!");
      setResult(data);
      // Auto-hide progress modal after showing success
      setTimeout(() => {
        hideProgress();
      }, 1500);
    },
    onError: (error: any) => {
      hideProgress();
      if (shouldShowErrorToast(error)) {
        toast.error(error.response?.data?.message || "Generation failed");
      }
    },
  });

  const handleGenerate = () => {
    if (!selectedFile) {
      toast.error("Please select an image first");
      return;
    }

    // Clear previous result when generating new favicon package
    setResult(null);
    showProgress({ status: "uploading", fileName: selectedFile.name });

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("site_name", siteName);
    formData.append("include_ico", includeIco.toString());
    formData.append("include_apple", includeApple.toString());
    formData.append("include_android", includeAndroid.toString());
    formData.append("include_ms", includeMs.toString());
    formData.append("background_color", backgroundColor);

    setTimeout(() => setStatus("processing", "Generating favicons..."), 500);
    generateMutation.mutate(formData);
  };

  const handleDownload = () => {
    if (result) {
      window.open(`${API_URL}${result.download_url}`, "_blank");
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
              <Globe className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
              Favicon Generator
            </h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              Generate all favicon sizes for your website from a single image
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {!isPro && <SupportButton size="sm" />}
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs sm:text-sm font-medium">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Free - Unlimited</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Image</CardTitle>
              <CardDescription>
                Use a square image (512x512 or larger recommended)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileDropzone
                onFilesSelected={handleFileSelect}
                accept={{
                  "image/*": [".png", ".jpg", ".jpeg", ".svg", ".webp"],
                }}
                selectedFiles={selectedFile ? [selectedFile] : []}
                onRemoveFile={() => {
                  setSelectedFile(null);
                  setPreview(null);
                  setResult(null);
                }}
              />

              {preview && (
                <div className="mt-4 flex justify-center">
                  <div className="border rounded-lg p-4 bg-muted">
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-32 h-32 object-contain"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Site Name (for manifest)</Label>
                <Input
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder="My Website"
                />
              </div>

              <div className="space-y-2">
                <Label>Background Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-12 h-9 p-1"
                  />
                  <Input
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Used for padding if image is not square
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <Label>Include Files</Label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeIco}
                    onChange={(e) => setIncludeIco(e.target.checked)}
                    className="rounded"
                  />
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    favicon.ico (Browser tabs)
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeApple}
                    onChange={(e) => setIncludeApple(e.target.checked)}
                    className="rounded"
                  />
                  <Apple className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Apple Touch Icon (iOS)
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeAndroid}
                    onChange={(e) => setIncludeAndroid(e.target.checked)}
                    className="rounded"
                  />
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Android Chrome Icons + Manifest
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeMs}
                    onChange={(e) => setIncludeMs(e.target.checked)}
                    className="rounded"
                  />
                  <FileCode className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Microsoft Tile + browserconfig.xml
                  </span>
                </label>
              </div>

              <Button
                className="w-full mt-4"
                onClick={handleGenerate}
                isLoading={generateMutation.isPending}
                disabled={!selectedFile}
              >
                Generate Favicon Package
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Result Section */}
        <Card>
          <CardHeader>
            <CardTitle>Generated Files</CardTitle>
            <CardDescription>
              {result
                ? `${result.files.length} files ready for download`
                : "Your favicon package will appear here"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-4">
                {/* File list */}
                <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
                  {result.files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="font-mono">{file.name}</span>
                      </div>
                      <span className="text-muted-foreground">{file.size}</span>
                    </div>
                  ))}
                </div>

                <div className="text-sm text-muted-foreground text-center">
                  Total package size: {formatBytes(result.zip_size_bytes)}
                </div>

                <Button className="w-full" onClick={handleDownload}>
                  <Download className="mr-2 h-4 w-4" />
                  Download ZIP Package
                </Button>

                {/* Instructions */}
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">How to use:</h4>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Extract the ZIP to your website's root folder</li>
                    <li>Add the HTML from html-snippet.txt to your &lt;head&gt;</li>
                    <li>Test by visiting your site and checking the browser tab</li>
                  </ol>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Globe className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p>Upload an image to generate favicons</p>
                <p className="text-sm mt-2">
                  We'll create all sizes for browsers, iOS, Android, and Windows
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info Section */}
      {sizesData && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Included Favicon Sizes</CardTitle>
            <CardDescription>
              All the icons you need for modern browsers and devices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <h4 className="font-medium flex items-center gap-2 mb-2">
                  <Monitor className="h-4 w-4" /> Standard
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {sizesData.standard?.map((item: any) => (
                    <li key={item.name}>
                      {item.name} ({item.sizes || item.size})
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-medium flex items-center gap-2 mb-2">
                  <Apple className="h-4 w-4" /> Apple
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {sizesData.apple?.map((item: any) => (
                    <li key={item.name}>
                      {item.name} ({item.size})
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-medium flex items-center gap-2 mb-2">
                  <Smartphone className="h-4 w-4" /> Android
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {sizesData.android?.map((item: any) => (
                    <li key={item.name}>
                      {item.name} ({item.size})
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-medium flex items-center gap-2 mb-2">
                  <FileCode className="h-4 w-4" /> Config Files
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {sizesData.config_files?.map((item: any) => (
                    <li key={item.name}>{item.name}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <RelatedGuide guideSlug="how-to-create-website-favicon" />
    </div>
  );
}
