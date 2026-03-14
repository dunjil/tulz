"use client";

import { RelatedGuide } from "@/components/shared/related-guide";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
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
import { FileOutput, Download, Image as ImageIcon, X, CheckCircle2, Loader2 } from "lucide-react";
import { useProgressModal } from "@/components/shared/progress-modal";
import type { ImageResponse } from "@/types";
import { SupportButton } from "@/components/shared/support-button";
import { FreeBadge } from "@/components/shared/free-badge";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface FileWithStatus {
    file: File;
    status: "pending" | "uploading" | "processing" | "success" | "error";
    result?: ImageResponse;
    error?: string;
    preview?: string;
}

export default function HEICConverterPage() {
    const queryClient = useQueryClient();
    const { showProgress, setStatus, hideProgress } = useProgressModal();
    const [files, setFiles] = useState<FileWithStatus[]>([]);
    const [quality, setQuality] = useState(85);
    const [convertFormat, setConvertFormat] = useState<"jpeg" | "webp">("jpeg");
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFileSelect = (newFiles: File[]) => {
        const fileWrappers: FileWithStatus[] = newFiles.map(file => ({
            file,
            status: "pending",
            preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined
        }));
        setFiles(prev => [...prev, ...fileWrappers]);
    };

    const removeFile = (index: number) => {
        setFiles(prev => {
            const newFiles = [...prev];
            if (newFiles[index].preview) {
                URL.revokeObjectURL(newFiles[index].preview!);
            }
            newFiles.splice(index, 1);
            return newFiles;
        });
    };

    const convertMutation = useMutation({
        mutationFn: async ({ file, index }: { file: File, index: number }) => {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("operation", "convert");
            formData.append("output_format", convertFormat);
            formData.append("quality", quality.toString());

            const response = await api.post("/tools/image/process", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return { data: response.data as ImageResponse, index };
        },
        onSuccess: ({ data, index }) => {
            setFiles(prev => prev.map((f, i) => 
                i === index ? { ...f, status: "success" as const, result: data } : f
            ));
        },
        onError: (error: any, variables) => {
            setFiles(prev => prev.map((f, i) => 
                i === variables.index ? { ...f, status: "error" as const, error: messageFromError(error) } : f
            ));
        },
    });

    const messageFromError = (error: any) => {
        if (error.response?.data?.message) return error.response.data.message;
        return "Failed";
    };

    const handleConvertAll = async () => {
        if (files.length === 0) {
            toast.error("Please select files first");
            return;
        }

        const pendingFiles = files.filter(f => f.status !== "success");
        if (pendingFiles.length === 0) {
            toast.error("All files already converted");
            return;
        }

        setIsProcessing(true);
        showProgress({ status: "processing", fileName: `Processing ${pendingFiles.length} files...` });

        for (let i = 0; i < files.length; i++) {
            if (files[i].status === "success") continue;

            setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: "uploading" as const } : f));
            
            try {
                await convertMutation.mutateAsync({ file: files[i].file, index: i });
            } catch (e) {
                // Error handled in mutation
            }
        }

        setIsProcessing(false);
        setStatus("success", "Batch conversion complete!");
        setTimeout(hideProgress, 2000);
        queryClient.invalidateQueries({ queryKey: ["remaining-uses"] });
    };

    const downloadAll = () => {
        files.forEach(f => {
            if (f.result) {
                const a = document.createElement('a');
                a.href = `${API_URL}${f.result.download_url}`;
                a.download = f.result.download_url.split('/').pop() || 'image.jpg';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
        });
    };

    const successCount = files.filter(f => f.status === "success").length;

    return (
        <div className="max-w-5xl mx-auto px-4 py-8">
            <div className="mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <FileOutput className="h-8 w-8 text-primary" />
                            HEIC to JPG Converter
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            Convert Apple HEIC images to JPG or WebP in batch
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <SupportButton size="sm" />
                        <FreeBadge />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-2 border-dashed">
                        <CardHeader>
                            <CardTitle>Upload Images</CardTitle>
                            <CardDescription>
                                Drag & drop HEIC or other images. Batch processing supported.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <FileDropzone
                                onFilesSelected={handleFileSelect}
                                accept={{
                                    "image/*": [".heic", ".heif", ".png", ".jpg", ".jpeg", ".webp"],
                                }}
                                multiple
                                label="Drop HEIC images here or click to browse"
                            />
                        </CardContent>
                    </Card>

                    {files.length > 0 && (
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>Files ({files.length})</CardTitle>
                                {successCount > 0 && (
                                    <Button variant="outline" size="sm" onClick={downloadAll}>
                                        <Download className="mr-2 h-4 w-4" />
                                        Download All ({successCount})
                                    </Button>
                                )}
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y max-h-[600px] overflow-y-auto">
                                    {files.map((f, i) => (
                                        <div key={i} className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors">
                                            <div className="h-12 w-12 rounded bg-muted flex-shrink-0 overflow-hidden border">
                                                {f.preview ? (
                                                    <img src={f.preview} alt="" className="h-full w-full object-cover" />
                                                ) : (
                                                    <div className="h-full w-full flex items-center justify-center">
                                                        <ImageIcon className="h-6 w-6 opacity-20" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{f.file.name}</p>
                                                <p className="text-xs text-muted-foreground">{formatBytes(f.file.size)}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {f.status === "uploading" || f.status === "processing" ? (
                                                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                                ) : f.status === "success" ? (
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-8 w-8"
                                                            onClick={() => {
                                                                const a = document.createElement('a');
                                                                a.href = `${API_URL}${f.result?.download_url}`;
                                                                a.download = '';
                                                                a.click();
                                                            }}
                                                        >
                                                            <Download className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ) : f.status === "error" ? (
                                                    <span className="text-xs text-destructive font-medium">{f.error}</span>
                                                ) : null}
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                    disabled={isProcessing}
                                                    onClick={() => removeFile(i)}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Conversion Settings</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <Label>Quality</Label>
                                    <span className="text-sm font-medium">{quality}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="10"
                                    max="100"
                                    value={quality}
                                    onChange={(e) => setQuality(Number(e.target.value))}
                                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                                <p className="text-[11px] text-muted-foreground italic">
                                    Lower quality = smaller file size. 85% is recommended.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <Label>Output Format</Label>
                                <Select
                                    value={convertFormat}
                                    onValueChange={(v: "jpeg" | "webp") => setConvertFormat(v)}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="jpeg">JPEG (Standard)</SelectItem>
                                        <SelectItem value="webp">WebP (Modern/Small)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button
                                className="w-full shadow-lg"
                                size="lg"
                                onClick={handleConvertAll}
                                isLoading={isProcessing}
                                disabled={files.length === 0 || files.every(f => f.status === "success")}
                            >
                                <FileOutput className="mr-2 h-5 w-5" />
                                {files.length > 1 ? `Convert ${files.length} Images` : "Convert Image"}
                            </Button>

                            {files.length > 0 && (
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => {
                                        setFiles([]);
                                        setIsProcessing(false);
                                    }}
                                    disabled={isProcessing}
                                >
                                    Clear All
                                </Button>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="bg-primary/5 border-primary/10">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Why use JPG?</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                HEIC is Apple's high-efficiency format, but it's not widely supported on Windows or web browsers. Converting to JPG ensures compatibility with all devices and platforms.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
            
            <div className="mt-12">
                <RelatedGuide guideSlug="how-to-convert-heic-to-jpg-on-windows" />
            </div>
        </div>
    );
}