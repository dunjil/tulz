"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api, apiHelpers, shouldShowErrorToast } from "@/lib/api";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileDropzone } from "@/components/shared/file-dropzone";
// import { CoffeePopup } from "@/components/shared/coffee-popup";
import {
  Image as ImageIcon,
  Eraser,
  Maximize,
  FileOutput,
  Download,
  Crown,
  Layers,
  Lock,
} from "lucide-react";
import { UsageBadge } from "@/components/shared/usage-badge";
import { useUpgradeModal } from "@/components/shared/upgrade-modal";
import { useLoginModal } from "@/components/shared/login-modal";
import { useProgressModal } from "@/components/shared/progress-modal";
import { useAuth } from "@/providers/auth-provider";
import type { ImageResponse } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ImagePage() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { showUpgradeModal } = useUpgradeModal();
  const { showLoginModal } = useLoginModal();
  const { showProgress, setStatus, hideProgress } = useProgressModal();
  const [activeTab, setActiveTab] = useState("background");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<ImageResponse | null>(null);
  const [batchResults, setBatchResults] = useState<any[] | null>(null);
  // const [showCoffeePopup, setShowCoffeePopup] = useState(false);

  // Resize options
  const [resizeWidth, setResizeWidth] = useState("");
  const [resizeHeight, setResizeHeight] = useState("");
  const [maintainAspect, setMaintainAspect] = useState(true);

  // Convert options
  const [outputFormat, setOutputFormat] = useState<"png" | "jpeg" | "webp">("jpeg");
  const [quality, setQuality] = useState(85);

  // Compress format (separate from convert)
  const [compressFormat, setCompressFormat] = useState<"jpeg" | "webp">("jpeg");

  // Batch processing options
  const [batchOperation, setBatchOperation] = useState<"resize" | "convert" | "compress">("convert");

  // Get user tier
  const { data: usageData } = useQuery({
    queryKey: ["remaining-uses"],
    queryFn: async () => {
      const response = await apiHelpers.getRemainingUses();
      return response.data;
    },
    enabled: !!isAuthenticated,
  });

  const isPro = usageData?.tier === "pro" || usageData?.is_unlimited;
  const hasRemainingUses = usageData?.remaining > 0 || usageData?.is_unlimited;

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

  const handleBatchFileSelect = (files: File[]) => {
    setSelectedFiles(files);
    setBatchResults(null);
  };

  const processMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await api.post("/tools/image/process", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data as ImageResponse;
    },
    onSuccess: (data) => {
      setStatus("success", "Image processed!");
      setResult(data);
      // Refresh usage count
      queryClient.invalidateQueries({ queryKey: ["remaining-uses"] });
    },
    onError: (error: any) => {
      hideProgress();
      // Don't show toast for 402 - the upgrade modal handles it
      if (shouldShowErrorToast(error)) {
        toast.error(error.response?.data?.message || "Processing failed");
      }
    },
  });

  const batchMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await api.post("/tools/image/batch", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    },
    onSuccess: (data) => {
      const successCount = data.results.filter((r: any) => r.success).length;
      setStatus("success", `Processed ${successCount}/${data.results.length} images`);
      setBatchResults(data.results);
      // Refresh usage count
      queryClient.invalidateQueries({ queryKey: ["remaining-uses"] });
    },
    onError: (error: any) => {
      hideProgress();
      // Don't show toast for 402 - the upgrade modal handles it
      if (shouldShowErrorToast(error)) {
        toast.error(error.response?.data?.message || "Batch processing failed");
      }
    },
  });

  const handleBatchProcess = () => {
    if (selectedFiles.length === 0) {
      toast.error("Please select images first");
      return;
    }

    if (!isPro) {
      showUpgradeModal();
      return;
    }

    showProgress({ status: "uploading", fileName: `${selectedFiles.length} images` });
    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append("files", file);
    });
    formData.append("operation", batchOperation);
    formData.append("output_format", outputFormat);
    formData.append("quality", quality.toString());

    setTimeout(() => setStatus("processing", "Processing images..."), 500);
    batchMutation.mutate(formData);
  };

  const handleProcess = (operation: string) => {
    if (!selectedFile) {
      toast.error("Please select an image first");
      return;
    }

    // Clear previous result when starting new operation
    setResult(null);

    const operationMessages: Record<string, string> = {
      remove_background: "Removing background...",
      resize: "Resizing image...",
      convert: "Converting image...",
      compress: "Compressing image...",
    };

    showProgress({ status: "uploading", fileName: selectedFile.name });
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("operation", operation);

    if (operation === "resize") {
      if (resizeWidth) formData.append("resize_width", resizeWidth);
      if (resizeHeight) formData.append("resize_height", resizeHeight);
      formData.append("maintain_aspect", maintainAspect.toString());
    }

    if (operation === "convert") {
      formData.append("output_format", outputFormat);
      formData.append("quality", quality.toString());
    }

    if (operation === "compress") {
      formData.append("output_format", compressFormat);
      formData.append("quality", quality.toString());
    }

    setTimeout(() => setStatus("processing", operationMessages[operation] || "Processing..."), 500);
    processMutation.mutate(formData);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <ImageIcon className="h-8 w-8 text-primary" />
              Image Editor
            </h1>
            <p className="text-muted-foreground mt-2">
              Remove backgrounds, resize, crop, and convert image formats
            </p>
          </div>
          <UsageBadge />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Image</CardTitle>
              <CardDescription>
                Supported formats: PNG, JPG, WEBP (max 50MB)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileDropzone
                onFilesSelected={handleFileSelect}
                accept={{
                  "image/*": [".png", ".jpg", ".jpeg", ".webp"],
                }}
                selectedFiles={selectedFile ? [selectedFile] : []}
                onRemoveFile={() => {
                  setSelectedFile(null);
                  setPreview(null);
                  setResult(null);
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Operations</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-5 w-full">
                  <TabsTrigger value="background" className="flex items-center gap-1.5 text-xs">
                    <Eraser className="h-4 w-4" />
                    <span className="hidden sm:inline">Remove BG</span>
                  </TabsTrigger>
                  <TabsTrigger value="resize" className="flex items-center gap-1.5 text-xs">
                    <Maximize className="h-4 w-4" />
                    <span className="hidden sm:inline">Resize</span>
                  </TabsTrigger>
                  <TabsTrigger value="convert" className="flex items-center gap-1.5 text-xs">
                    <FileOutput className="h-4 w-4" />
                    <span className="hidden sm:inline">Convert</span>
                  </TabsTrigger>
                  <TabsTrigger value="compress" className="text-xs">Compress</TabsTrigger>
                  <TabsTrigger value="batch" className="flex items-center gap-1.5 text-xs">
                    <Layers className="h-4 w-4" />
                    <span className="hidden sm:inline">Batch</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="background" className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground">
                    AI-powered background removal. Works best with clear subjects.
                  </p>
                  <Button
                    className="w-full"
                    onClick={() => handleProcess("remove_background")}
                    isLoading={processMutation.isPending}
                    disabled={!selectedFile}
                  >
                    <Eraser className="mr-2 h-4 w-4" />
                    Remove Background
                  </Button>
                </TabsContent>

                <TabsContent value="resize" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Width (px)</Label>
                      <Input
                        type="number"
                        placeholder="Auto"
                        value={resizeWidth}
                        onChange={(e) => setResizeWidth(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Height (px)</Label>
                      <Input
                        type="number"
                        placeholder="Auto"
                        value={resizeHeight}
                        onChange={(e) => setResizeHeight(e.target.value)}
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={maintainAspect}
                      onChange={(e) => setMaintainAspect(e.target.checked)}
                      className="rounded"
                    />
                    Maintain aspect ratio
                  </label>
                  <Button
                    className="w-full"
                    onClick={() => handleProcess("resize")}
                    isLoading={processMutation.isPending}
                    disabled={!selectedFile}
                  >
                    <Maximize className="mr-2 h-4 w-4" />
                    Resize Image
                  </Button>
                </TabsContent>

                <TabsContent value="convert" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Output Format</Label>
                    <Select
                      value={outputFormat}
                      onValueChange={(v: any) => setOutputFormat(v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="png">PNG</SelectItem>
                        <SelectItem value="jpeg">JPEG</SelectItem>
                        <SelectItem value="webp">WebP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => handleProcess("convert")}
                    isLoading={processMutation.isPending}
                    disabled={!selectedFile}
                  >
                    <FileOutput className="mr-2 h-4 w-4" />
                    Convert Image
                  </Button>
                </TabsContent>

                <TabsContent value="compress" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Quality: {quality}%</Label>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={quality}
                      onChange={(e) => setQuality(Number(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Lower quality = smaller file size
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Output Format</Label>
                    <Select
                      value={compressFormat}
                      onValueChange={(v: "jpeg" | "webp") => setCompressFormat(v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="jpeg">JPEG</SelectItem>
                        <SelectItem value="webp">WebP (Best compression)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => handleProcess("compress")}
                    isLoading={processMutation.isPending && activeTab === "compress"}
                    disabled={!selectedFile || processMutation.isPending}
                  >
                    Compress Image
                  </Button>
                </TabsContent>

                <TabsContent value="batch" className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground">
                    Process multiple images at once. Upload up to 10 images.
                  </p>
                      <FileDropzone
                        onFilesSelected={handleBatchFileSelect}
                        accept={{
                          "image/*": [".png", ".jpg", ".jpeg", ".webp"],
                        }}
                        selectedFiles={selectedFiles}
                        onRemoveFile={(index) => {
                          const newFiles = [...selectedFiles];
                          newFiles.splice(index, 1);
                          setSelectedFiles(newFiles);
                          setBatchResults(null);
                        }}
                        multiple
                        maxFiles={10}
                      />
                      <div className="space-y-2">
                        <Label>Operation</Label>
                        <Select
                          value={batchOperation}
                          onValueChange={(v: "resize" | "convert" | "compress") => setBatchOperation(v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="convert">Convert Format</SelectItem>
                            <SelectItem value="compress">Compress</SelectItem>
                            <SelectItem value="resize">Resize</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Output Format</Label>
                        <Select
                          value={outputFormat}
                          onValueChange={(v: any) => setOutputFormat(v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="png">PNG</SelectItem>
                            <SelectItem value="jpeg">JPEG</SelectItem>
                            <SelectItem value="webp">WebP</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        className="w-full"
                        onClick={handleBatchProcess}
                        isLoading={batchMutation.isPending}
                        disabled={selectedFiles.length === 0}
                      >
                        <Layers className="mr-2 h-4 w-4" />
                        Process {selectedFiles.length} Images
                      </Button>

                      {batchResults && (
                        <div className="space-y-2 mt-4">
                          <Label>Results</Label>
                          <div className="max-h-40 overflow-y-auto space-y-2">
                            {batchResults.map((result, index) => (
                              <div
                                key={index}
                                className={`flex items-center justify-between p-2 rounded text-sm ${result.success ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"
                                  }`}
                              >
                                <span className="truncate flex-1">{result.filename}</span>
                                {result.success ? (
                                  <a
                                    href={`${API_URL}${result.download_url}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline ml-2"
                                  >
                                    <Download className="h-4 w-4" />
                                  </a>
                                ) : (
                                  <span className="text-red-500 text-xs ml-2">{result.error}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Preview/Result Section */}
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {preview && (
              <div className="border rounded-lg overflow-hidden bg-[linear-gradient(45deg,#f0f0f0_25%,transparent_25%),linear-gradient(-45deg,#f0f0f0_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f0f0f0_75%),linear-gradient(-45deg,transparent_75%,#f0f0f0_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0px]">
                <img
                  src={preview}
                  alt="Preview"
                  className="max-w-full max-h-[300px] mx-auto object-contain"
                />
              </div>
            )}

            {result && (
              <>
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Result</h4>
                  <div className="border rounded-lg overflow-hidden bg-[linear-gradient(45deg,#f0f0f0_25%,transparent_25%),linear-gradient(-45deg,#f0f0f0_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f0f0f0_75%),linear-gradient(-45deg,transparent_75%,#f0f0f0_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0px]">
                    <img
                      src={`${API_URL}${result.download_url}`}
                      alt="Result"
                      className="max-w-full max-h-[300px] mx-auto object-contain"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    {result.new_size[0]} x {result.new_size[1]} px
                  </span>
                  <span>{formatBytes(result.file_size_bytes)}</span>
                </div>

                <Button
                  className="w-full"
                  onClick={() => {
                    window.open(`${API_URL}${result.download_url}`, '_blank');
                    // Coffee popup disabled in favor of watermark-based upgrade flow
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download {result.format.toUpperCase()}
                </Button>
              </>
            )}

            {!preview && !result && (
              <div className="text-center py-12 text-muted-foreground">
                <ImageIcon className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p>Upload an image to get started</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Coffee Popup - Disabled in favor of watermark-based upgrade flow */}
      {/* <CoffeePopup
        isOpen={showCoffeePopup}
        onClose={() => setShowCoffeePopup(false)}
      /> */}
    </div>
  );
}
