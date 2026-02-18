"use client";

import { RelatedGuide } from "@/components/shared/related-guide";

import { useState, useCallback, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api, shouldShowErrorToast } from "@/lib/api";
import { formatBytes } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { FileDropzone } from "@/components/shared/file-dropzone";
import { Maximize, Download, Image as ImageIcon, Check, RefreshCw } from "lucide-react";
import { UsageBadge } from "@/components/shared/usage-badge";
import { useProgressModal } from "@/components/shared/progress-modal";
import type { ImageResponse } from "@/types";
import { ImageCropper } from "@/components/tools/social-media/image-cropper";
import { PlatformPreview } from "@/components/tools/social-media/platform-preview";
import getCroppedImg from "@/lib/canvas-utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type InstagramFormat = "square" | "portrait" | "story";

const FORMATS: Record<InstagramFormat, { label: string; aspect: number; width: number; height: number; type: string }> = {
    square: { label: "Post (Square)", aspect: 1, width: 1080, height: 1080, type: "post" },
    portrait: { label: "Portrait (4:5)", aspect: 4 / 5, width: 1080, height: 1350, type: "portrait" },
    story: { label: "Story / Reel", aspect: 9 / 16, width: 1080, height: 1920, type: "story" },
};

export default function InstagramResizerPage() {
    const queryClient = useQueryClient();
    const { showProgress, setStatus, hideProgress } = useProgressModal();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [croppedPreview, setCroppedPreview] = useState<string | null>(null);
    const [result, setResult] = useState<ImageResponse | null>(null);
    const [activeFormat, setActiveFormat] = useState<InstagramFormat>("square");
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
        // Just update internal state, debounced preview generation happens separately or via effect
        // But for responsiveness, let's update data
        setCropData(newCrop);
    }, []);

    // Generate client-side preview when crop ends (or debounced)
    // We can use an effect that runs when cropData changes, but debounced
    useEffect(() => {
        if (!originalImage || !cropData) return;

        const timer = setTimeout(async () => {
            try {
                const croppedObjUrl = await getCroppedImg(originalImage, cropData);
                if (croppedObjUrl) {
                    setCroppedPreview(croppedObjUrl);
                }
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

    const handleDownload = () => {
        if (!selectedFile || !cropData) return;

        setResult(null);
        showProgress({ status: "uploading", fileName: selectedFile.name });

        const formatConfig = FORMATS[activeFormat];

        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("operation", "resize"); // We use resize operation with crop params

        // Send crop parameters
        formData.append("crop_x", Math.round(cropData.x).toString());
        formData.append("crop_y", Math.round(cropData.y).toString());
        formData.append("crop_width", Math.round(cropData.width).toString());
        formData.append("crop_height", Math.round(cropData.height).toString());

        // Also enforce final resize to standarized Instagram dimensions
        formData.append("resize_width", formatConfig.width.toString());
        formData.append("resize_height", formatConfig.height.toString());
        formData.append("maintain_aspect", "true");

        setTimeout(() => setStatus("processing", "Processing for Instagram..."), 500);
        processMutation.mutate(formData);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3 text-[#E1306C]">
                        <Maximize className="h-8 w-8" />
                        Instagram Resizer
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Crop and resize for Posts, Stories, and Reels
                    </p>
                </div>
                <UsageBadge />
            </div>

            {!originalImage ? (
                <Card className="border-dashed border-2">
                    <CardHeader>
                        <CardTitle className="text-center">Upload Photo</CardTitle>
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
                                <CardTitle>Adjust Image</CardTitle>
                                <CardDescription>Drag and zoom to fit perfect</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <Tabs value={activeFormat} onValueChange={(v) => setActiveFormat(v as InstagramFormat)}>
                                    <TabsList className="grid w-full grid-cols-3">
                                        <TabsTrigger value="square">Square</TabsTrigger>
                                        <TabsTrigger value="portrait">Portrait</TabsTrigger>
                                        <TabsTrigger value="story">Story</TabsTrigger>
                                    </TabsList>
                                </Tabs>

                                <div className="p-1 border rounded-xl">
                                    <ImageCropper
                                        image={originalImage}
                                        aspect={FORMATS[activeFormat].aspect}
                                        onCropChange={handleCropChange}
                                    />
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        className="flex-1 bg-[#E1306C] hover:bg-[#C13584]"
                                        onClick={handleDownload}
                                        disabled={processMutation.isPending}
                                    >
                                        {processMutation.isPending ? "Processing..." : "Download for Instagram"}
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
                                            <div className="font-medium">Ready to Post!</div>
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
                            Live Preview
                        </h3>
                        <PlatformPreview
                            platform="instagram"
                            type={FORMATS[activeFormat].type}
                            image={croppedPreview || originalImage}
                        />
                        <p className="text-xs text-center text-muted-foreground">
                            This is how your post will appear on Instagram
                        </p>
                    </div>
                </div>
            )}
            <RelatedGuide guideSlug="how-to-resize-images-for-instagram" />
        </div>
    );
}
