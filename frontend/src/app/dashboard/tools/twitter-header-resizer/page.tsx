"use client";

import { useState, useCallback, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { RelatedGuide } from "@/components/shared/related-guide";
import { api, shouldShowErrorToast } from "@/lib/api";
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
import { Maximize, Download, Image as ImageIcon, Check, RefreshCw, Twitter } from "lucide-react";
import { UsageBadge } from "@/components/shared/usage-badge";
import { useProgressModal } from "@/components/shared/progress-modal";
import type { ImageResponse } from "@/types";
import { ImageCropper } from "@/components/tools/social-media/image-cropper";
import { PlatformPreview } from "@/components/tools/social-media/platform-preview";
import getCroppedImg from "@/lib/canvas-utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function TwitterResizerPage() {
    const queryClient = useQueryClient();
    const { showProgress, setStatus, hideProgress } = useProgressModal();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [croppedPreview, setCroppedPreview] = useState<string | null>(null);
    const [result, setResult] = useState<ImageResponse | null>(null);
    const [cropData, setCropData] = useState<{ x: number, y: number, width: number, height: number } | null>(null);

    const handleFileSelect = (files: File[]) => {
        if (files.length > 0) {
            setSelectedFile(files[0]);
            setResult(null);
            setCroppedPreview(null);

            const reader = new FileReader();
            reader.onload = (e) => setOriginalImage(e.target?.result as string);
            reader.readAsDataURL(files[0]);
        }
    };

    const handleCropChange = useCallback((newCrop: any) => {
        setCropData(newCrop);
    }, []);

    useEffect(() => {
        if (!originalImage || !cropData) return;
        const timer = setTimeout(async () => {
            console.log("Generating preview", cropData);
            try {
                const croppedObjUrl = await getCroppedImg(originalImage, cropData!);
                setCroppedPreview(croppedObjUrl);
            } catch (e) {
                console.error(e);
            }
        }, 100);
        return () => clearTimeout(timer);
    }, [cropData, originalImage]);

    const processMutation = useMutation({
        mutationFn: async (formData: FormData) => {
            const response = await api.post("/tools/image/process", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return response.data as ImageResponse;
        },
        onSuccess: (data) => {
            setStatus("success", "Header Ready!");
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

    const handleDownload = () => {
        if (!selectedFile || !cropData) return;

        setResult(null);
        showProgress({ status: "uploading", fileName: selectedFile.name });

        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("operation", "resize");

        formData.append("crop_x", Math.round(cropData.x).toString());
        formData.append("crop_y", Math.round(cropData.y).toString());
        formData.append("crop_width", Math.round(cropData.width).toString());
        formData.append("crop_height", Math.round(cropData.height).toString());

        // Twitter Header standard size (1500x500 = 3:1)
        formData.append("resize_width", "1500");
        formData.append("resize_height", "500");
        formData.append("maintain_aspect", "true");

        setTimeout(() => setStatus("processing", "Resizing for Twitter/X..."), 500);
        processMutation.mutate(formData);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3 text-sky-500">
                        <Twitter className="h-8 w-8" />
                        Twitter Header Resizer
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Create perfectly sized banners (1500x500)
                    </p>
                </div>
                <UsageBadge />
            </div>

            {!originalImage ? (
                <Card className="border-dashed border-2">
                    <CardHeader>
                        <CardTitle className="text-center">Upload Banner Image</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <FileDropzone
                            onFilesSelected={handleFileSelect}
                            accept={{ "image/*": [".png", ".jpg", ".jpeg", ".webp"] }}
                            selectedFiles={[]}
                        />
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Adjust Banner</CardTitle>
                                <CardDescription>Aspect ratio locked to 3:1</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="p-1 border rounded-xl">
                                    <ImageCropper
                                        image={originalImage}
                                        aspect={3 / 1}
                                        onCropChange={handleCropChange}
                                    />
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        className="flex-1 bg-sky-500 hover:bg-sky-600"
                                        onClick={handleDownload}
                                        disabled={processMutation.isPending}
                                    >
                                        {processMutation.isPending ? "Processing..." : "Download Header"}
                                    </Button>
                                    <Button variant="outline" onClick={() => {
                                        setOriginalImage(null);
                                        setResult(null);
                                    }}>
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Reset
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {result && (
                            <Card className="bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                                            <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                                        </div>
                                        <div>
                                            <div className="font-medium">Banner Ready!</div>
                                            <div className="text-sm text-muted-foreground">{formatBytes(result.file_size_bytes)} • {result.new_size[0]}x{result.new_size[1]}</div>
                                        </div>
                                    </div>
                                    <Button size="sm" onClick={() => window.open(`${API_URL}${result.download_url}`, '_blank')}>
                                        <Download className="mr-2 h-4 w-4" />
                                        Save
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-medium flex items-center gap-2">
                            <ImageIcon className="h-5 w-5" />
                            Profile Preview
                        </h3>
                        <PlatformPreview
                            platform="twitter"
                            type="header"
                            image={croppedPreview || originalImage}
                        />
                        <p className="text-xs text-center text-muted-foreground">
                            Check how it looks behind your profile picture
                        </p>
                    </div>
                </div>
            )}
            <RelatedGuide guideSlug="how-to-resize-for-all-social-media" />
        </div>
    );
}
