"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { RelatedGuide } from "@/components/shared/related-guide";
import { api, shouldShowErrorToast } from "@/lib/api";
import { formatBytes } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
import { FileDropzone } from "@/components/shared/file-dropzone";
import { Type, Download, Image as ImageIcon } from "lucide-react";
import { UsageBadge } from "@/components/shared/usage-badge";
import { useProgressModal } from "@/components/shared/progress-modal";
import type { ImageResponse } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ImageCompressPage() {
    const queryClient = useQueryClient();
    const { showProgress, setStatus, hideProgress } = useProgressModal();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [result, setResult] = useState<ImageResponse | null>(null);
    const [quality, setQuality] = useState(85);
    const [add_watermarkFormat, setCompressFormat] = useState<"jpeg" | "webp">("jpeg");

    const handleFileSelect = (files: File[]) => {
        if (files.length > 0) {
            setSelectedFile(files[0]);
            setResult(null);

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
            setStatus("success", "Watermark added!");
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
        if (!selectedFile) {
            toast.error("Please select an image first");
            return;
        }

        setResult(null);
        showProgress({ status: "uploading", fileName: selectedFile.name });
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("operation", "add_watermark");
        formData.append("output_format", add_watermarkFormat);
        formData.append("quality", quality.toString());

        setTimeout(() => setStatus("processing", "Adding watermark..."), 500);
        processMutation.mutate(formData);
    };

    return (
        <div className="max-w-5xl mx-auto">
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <Type className="h-8 w-8 text-primary" />
                            Add Watermark
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            Reduce image file size while maintaining quality
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
                                }}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Watermark Settings</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
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
                                    value={add_watermarkFormat}
                                    onValueChange={(v: "jpeg" | "webp") => setCompressFormat(v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="jpeg">JPEG</SelectItem>
                                        <SelectItem value="webp">WebP (Best add_watermarkion)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button
                                className="w-full"
                                onClick={handleCompress}
                                isLoading={processMutation.isPending}
                                disabled={!selectedFile}
                            >
                                <Type className="mr-2 h-4 w-4" />
                                Add Watermark
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
                                    <h4 className="font-medium mb-2">Watermarked Result</h4>
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
            <RelatedGuide guideSlug="how-to-watermark-images-in-bulk" />
        </div>
    );
}
