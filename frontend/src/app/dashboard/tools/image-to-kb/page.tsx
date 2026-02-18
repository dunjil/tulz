"use client";

import { RelatedGuide } from "@/components/shared/related-guide";

import { useState } from "react";
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
import { Target, Download, Image as ImageIcon, Info } from "lucide-react";
import { UsageBadge } from "@/components/shared/usage-badge";
import { useProgressModal } from "@/components/shared/progress-modal";
import type { ImageResponse } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Common KB presets
const KB_PRESETS = [
    { label: "20 KB", value: 20 },
    { label: "50 KB", value: 50 },
    { label: "100 KB", value: 100 },
    { label: "200 KB", value: 200 },
    { label: "500 KB", value: 500 },
];

export default function ImageToKBPage() {
    const queryClient = useQueryClient();
    const { showProgress, setStatus, hideProgress } = useProgressModal();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [result, setResult] = useState<ImageResponse | null>(null);
    const [targetKB, setTargetKB] = useState("50");
    const [originalSize, setOriginalSize] = useState<number>(0);

    const handleFileSelect = (files: File[]) => {
        if (files.length > 0) {
            setSelectedFile(files[0]);
            setResult(null);
            setOriginalSize(files[0].size);

            const reader = new FileReader();
            reader.onload = (e) => setPreview(e.target?.result as string);
            reader.readAsDataURL(files[0]);
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
            setStatus("success", `Image resized to ~${targetKB}KB!`);
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

        const targetKBNum = parseInt(targetKB);
        if (!targetKBNum || targetKBNum < 1 || targetKBNum > 10000) {
            toast.error("Please enter a valid target size (1-10000 KB)");
            return;
        }

        setResult(null);
        showProgress({ status: "uploading", fileName: selectedFile.name });
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("operation", "compress");

        // Calculate quality based on target KB
        // This is a simplified approach - backend should handle iterative compression
        const targetBytes = targetKBNum * 1024;
        const compressionRatio = targetBytes / originalSize;
        const quality = Math.max(10, Math.min(95, Math.floor(compressionRatio * 100)));

        formData.append("quality", quality.toString());
        formData.append("output_format", "jpeg");

        setTimeout(() => setStatus("processing", `Resizing to ${targetKB}KB...`), 500);
        processMutation.mutate(formData);
    };

    const handlePresetClick = (kb: number) => {
        setTargetKB(kb.toString());
    };

    return (
        <div className="max-w-5xl mx-auto">
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <Target className="h-8 w-8 text-primary" />
                            Resize Image to KB
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            Compress images to exact KB size - perfect for forms and applications
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
                                    setOriginalSize(0);
                                }}
                            />
                            {originalSize > 0 && (
                                <div className="mt-4 p-3 bg-muted rounded-lg">
                                    <div className="flex items-center gap-2 text-sm">
                                        <Info className="h-4 w-4 text-muted-foreground" />
                                        <span>
                                            Original size: <strong>{formatBytes(originalSize)}</strong>
                                        </span>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Target Size</CardTitle>
                            <CardDescription>
                                Choose a preset or enter custom KB size
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-3 gap-2">
                                {KB_PRESETS.map((preset) => (
                                    <Button
                                        key={preset.value}
                                        variant={targetKB === preset.value.toString() ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => handlePresetClick(preset.value)}
                                    >
                                        {preset.label}
                                    </Button>
                                ))}
                            </div>

                            <div className="space-y-2">
                                <Label>Custom Size (KB)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="number"
                                        placeholder="Enter KB"
                                        value={targetKB}
                                        onChange={(e) => setTargetKB(e.target.value)}
                                        min="1"
                                        max="10000"
                                    />
                                    <span className="flex items-center text-sm text-muted-foreground">KB</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Common uses: Passport (50KB), Resume (100KB), Forms (200KB)
                                </p>
                            </div>

                            <Button
                                className="w-full"
                                onClick={handleResize}
                                isLoading={processMutation.isPending}
                                disabled={!selectedFile}
                            >
                                <Target className="mr-2 h-4 w-4" />
                                Resize to {targetKB} KB
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

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Dimensions:</span>
                                        <span className="font-medium">
                                            {result.new_size[0]} x {result.new_size[1]} px
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">File Size:</span>
                                        <span className="font-medium">{formatBytes(result.file_size_bytes)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Size Reduced:</span>
                                        <span className="font-medium text-green-600">
                                            {((1 - result.file_size_bytes / originalSize) * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                </div>

                                <Button
                                    className="w-full"
                                    onClick={() => {
                                        window.open(`${API_URL}${result.download_url}`, '_blank');
                                    }}
                                >
                                    <Download className="mr-2 h-4 w-4" />
                                    Download ({formatBytes(result.file_size_bytes)})
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
            <RelatedGuide guideSlug="how-to-compress-image-to-20kb" />
        </div>
    );
}
