"use client";

import { RelatedGuide } from "@/components/shared/related-guide";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Maximize, Download, Image as ImageIcon, RefreshCcw, Lock, LockOpen } from "lucide-react";
import { UsageBadge } from "@/components/shared/usage-badge";
import { useProgressModal } from "@/components/shared/progress-modal";
import type { ImageResponse } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ImageResizePage() {
    const queryClient = useQueryClient();
    const { showProgress, setStatus, hideProgress } = useProgressModal();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [result, setResult] = useState<ImageResponse | null>(null);

    // Resize dimensions state
    const [originalWidth, setOriginalWidth] = useState<number>(0);
    const [originalHeight, setOriginalHeight] = useState<number>(0);
    const [resizeWidth, setResizeWidth] = useState<string>("");
    const [resizeHeight, setResizeHeight] = useState<string>("");
    const [maintainAspect, setMaintainAspect] = useState(true);

    const handleFileSelect = (files: File[]) => {
        if (files.length > 0) {
            const file = files[0];
            setSelectedFile(file);
            setResult(null);

            // Create image object to get dimensions
            const img = new Image();
            img.onload = () => {
                setOriginalWidth(img.width);
                setOriginalHeight(img.height);
                setResizeWidth(img.width.toString());
                setResizeHeight(img.height.toString());

                // Set preview
                setPreview(img.src);
            };
            img.src = URL.createObjectURL(file);
        }
    };

    // Handle width change
    const handleWidthChange = (value: string) => {
        setResizeWidth(value);
        if (maintainAspect && originalWidth > 0 && value) {
            const newWidth = parseInt(value);
            if (!isNaN(newWidth)) {
                const ratio = originalHeight / originalWidth;
                setResizeHeight(Math.round(newWidth * ratio).toString());
            }
        }
    };

    // Handle height change
    const handleHeightChange = (value: string) => {
        setResizeHeight(value);
        if (maintainAspect && originalHeight > 0 && value) {
            const newHeight = parseInt(value);
            if (!isNaN(newHeight)) {
                const ratio = originalWidth / originalHeight;
                setResizeWidth(Math.round(newHeight * ratio).toString());
            }
        }
    };

    // Handle percentage presets
    const handlePreset = (percentage: number) => {
        if (originalWidth > 0 && originalHeight > 0) {
            const newWidth = Math.round(originalWidth * (percentage / 100));
            const newHeight = Math.round(originalHeight * (percentage / 100));
            setResizeWidth(newWidth.toString());
            setResizeHeight(newHeight.toString());
        }
    };

    const processMutation = useMutation({
        mutationFn: async (formData: FormData) => {
            const response = await api.post("/tools/image/process", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return response.data as ImageResponse;
        },
        onSuccess: (data) => {
            setStatus("success", "Image resized!");
            setResult(data);
            queryClient.invalidateQueries({ queryKey: ["remaining-uses"] });
        },
        onError: (error: any) => {
            hideProgress();
            if (shouldShowErrorToast(error)) {
                toast.error(error.response?.data?.message || "Resize failed");
            }
        },
    });

    const handleResize = () => {
        if (!selectedFile) {
            toast.error("Please select an image first");
            return;
        }

        if (!resizeWidth || !resizeHeight) {
            toast.error("Please specify dimensions");
            return;
        }

        setResult(null);
        showProgress({ status: "uploading", fileName: selectedFile.name });
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("operation", "resize");
        formData.append("resize_width", resizeWidth);
        formData.append("resize_height", resizeHeight);
        formData.append("maintain_aspect", maintainAspect.toString());

        setTimeout(() => setStatus("processing", "Resizing image..."), 500);
        processMutation.mutate(formData);
    };

    return (
        <div className="max-w-5xl mx-auto">
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10">
                                <Maximize className="h-8 w-8 text-blue-500" />
                            </div>
                            Image Resizer
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            Resize images to custom dimensions
                        </p>
                    </div>
                    <UsageBadge />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                                    setOriginalWidth(0);
                                    setOriginalHeight(0);
                                    setResizeWidth("");
                                    setResizeHeight("");
                                }}
                            />
                        </CardContent>
                    </Card>

                    <Card className={!selectedFile ? "opacity-50 pointer-events-none" : ""}>
                        <CardHeader>
                            <CardTitle>Resize Settings</CardTitle>
                            {originalWidth > 0 && (
                                <CardDescription>
                                    Original size: {originalWidth} x {originalHeight} px
                                </CardDescription>
                            )}
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Dimensions Inputs */}
                            <div className="grid grid-cols-2 gap-4 relative">
                                <div className="space-y-2">
                                    <Label>Width (px)</Label>
                                    <Input
                                        type="number"
                                        placeholder="Width"
                                        value={resizeWidth}
                                        onChange={(e) => handleWidthChange(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Height (px)</Label>
                                    <Input
                                        type="number"
                                        placeholder="Height"
                                        value={resizeHeight}
                                        onChange={(e) => handleHeightChange(e.target.value)}
                                    />
                                </div>

                                {/* Link Icon */}
                                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 pt-6">
                                    <button
                                        onClick={() => setMaintainAspect(!maintainAspect)}
                                        className={`p-1.5 rounded-full border transition-colors ${maintainAspect ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground'}`}
                                        title={maintainAspect ? "Aspect ratio locked" : "Aspect ratio unlocked"}
                                    >
                                        {maintainAspect ? <Lock className="h-3 w-3" /> : <LockOpen className="h-3 w-3" />}
                                    </button>
                                </div>
                            </div>

                            {/* Percentage Presets */}
                            <div className="space-y-2">
                                <Label>Quick Resize</Label>
                                <div className="grid grid-cols-4 gap-2">
                                    <Button variant="outline" size="sm" onClick={() => handlePreset(25)}>25%</Button>
                                    <Button variant="outline" size="sm" onClick={() => handlePreset(50)}>50%</Button>
                                    <Button variant="outline" size="sm" onClick={() => handlePreset(75)}>75%</Button>
                                    <Button variant="outline" size="sm" onClick={() => handlePreset(100)}>100%</Button>
                                </div>
                            </div>

                            {/* Aspect Ratio Toggle */}
                            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={maintainAspect}
                                    onChange={(e) => setMaintainAspect(e.target.checked)}
                                    className="rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <span className={maintainAspect ? "text-foreground font-medium" : "text-muted-foreground"}>
                                    Maintain aspect ratio
                                </span>
                            </label>

                            <Button
                                className="w-full h-12 text-base"
                                onClick={handleResize}
                                isLoading={processMutation.isPending}
                                disabled={!selectedFile || !resizeWidth || !resizeHeight}
                            >
                                <Maximize className="mr-2 h-5 w-5" />
                                Resize Image
                            </Button>
                        </CardContent>
                    </Card>
                </div>

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
                                    style={{
                                        // Optional: You could allow visual resizing here, but for now just showing the source
                                    }}
                                />
                            </div>
                        )}

                        {result && (
                            <>
                                <div className="border-t pt-4">
                                    <h4 className="font-medium mb-2">Resized Result</h4>
                                    <div className="border rounded-lg overflow-hidden bg-[linear-gradient(45deg,#f0f0f0_25%,transparent_25%),linear-gradient(-45deg,#f0f0f0_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f0f0f0_75%),linear-gradient(-45deg,transparent_75%,#f0f0f0_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0px]">
                                        <img
                                            src={`${API_URL}${result.download_url}`}
                                            alt="Result"
                                            className="max-w-full max-h-[300px] mx-auto object-contain"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
                                    <div className="flex flex-col">
                                        <span className="text-xs uppercase tracking-wider font-semibold">Dimensions</span>
                                        <span className="font-medium text-foreground">{result.new_size[0]} x {result.new_size[1]} px</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-xs uppercase tracking-wider font-semibold">Size</span>
                                        <span className="font-medium text-foreground">{formatBytes(result.file_size_bytes)}</span>
                                    </div>
                                </div>

                                <Button
                                    className="w-full h-11 bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => {
                                        window.open(`${API_URL}${result.download_url}`, '_blank');
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
            <RelatedGuide guideSlug="how-to-resize-images-for-web-performance" />
        </div>
    );
}
