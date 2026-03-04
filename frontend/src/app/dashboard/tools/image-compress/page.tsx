"use client";

import { RelatedGuide } from "@/components/shared/related-guide";
import { ToolInfoSection } from "@/components/shared/tool-info-section";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
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
import { Minimize2, Download, Image as ImageIcon } from "lucide-react";
import { useProgressModal } from "@/components/shared/progress-modal";
import type { ImageResponse } from "@/types";
import { SupportButton } from "@/components/shared/support-button";
import { FreeBadge } from "@/components/shared/free-badge";


const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ImageCompressPage() {
    const queryClient = useQueryClient();
    const { showProgress, setStatus, hideProgress } = useProgressModal();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [result, setResult] = useState<ImageResponse | null>(null);
    const [quality, setQuality] = useState(85);
    const [compressFormat, setCompressFormat] = useState<"jpeg" | "webp">("jpeg");

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
            setStatus("success", "Image compressed!");
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
        formData.append("operation", "compress");
        formData.append("output_format", compressFormat);
        formData.append("quality", quality.toString());

        setStatus("processing", "Compressing image...");
        processMutation.mutate(formData);
    };

    return (
        <div className="max-w-5xl mx-auto">
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <Minimize2 className="h-8 w-8 text-primary" />
                            Image Compressor
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            Reduce image file size while maintaining quality
                        </p>
                    </div>
                    <SupportButton size="sm" />
                    <FreeBadge />

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
                            <CardTitle>Compression Settings</CardTitle>
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
                                onClick={handleCompress}
                                isLoading={processMutation.isPending}
                                disabled={!selectedFile}
                            >
                                <Minimize2 className="mr-2 h-4 w-4" />
                                Compress Image
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
                                    <h4 className="font-medium mb-2">Compressed Result</h4>
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
                                        (() => { const a = document.createElement('a'); a.href = `${API_URL}${result.download_url}`; a.download = ''; document.body.appendChild(a); a.click(); document.body.removeChild(a); })();
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
            <RelatedGuide guideSlug="how-to-compress-images-without-losing-quality" />

            <ToolInfoSection
                heading="About the Image Compressor"
                overview="Images are the largest contributors to slow-loading websites and oversized email attachments. Our free online image compressor reduces the file size of your JPG, PNG, and WebP photos without any visible quality degradation for most use cases. Whether you're optimising a website for faster loading times, reducing the size of a profile picture for a portal, or shrinking a product photo for an online shop, our compressor handles it quickly and privately."
                howItWorks="Image compression works by reducing the amount of data needed to represent your image. For JPEG compression, we re-encode the image at your chosen quality level (10–100%). At 85%, the result is typically 40–60% smaller with virtually no visible difference. Choosing WebP as the output format often achieves an additional 20–30% reduction compared to JPEG at equivalent quality, because WebP uses a more efficient compression algorithm developed by Google. Lossless operations like PNG → PNG use a different approach: they analyse the pixel data and reorder it more efficiently without discarding any information."
                benefits={[
                    { title: "Dramatically smaller files", description: "Our compressor typically reduces JPG and PNG files by 40–70% without any visible quality degradation. WebP output frequently achieves even better results." },
                    { title: "Faster website load times", description: "Images are the #1 cause of slow-loading web pages. Smaller images mean faster load times, better Core Web Vitals scores, and improved Google search rankings." },
                    { title: "Meet portal upload limits", description: "Many job application portals, government websites, and social media platforms enforce strict file size limits. Our compressor helps you hit targets like 20KB, 50KB, 100KB, or 200KB." },
                    { title: "WebP for maximum efficiency", description: "WebP is the modern image format developed by Google. It produces images 25–35% smaller than JPEG at the same quality level and is supported by all modern browsers." },
                ]}
                useCases={[
                    "Compressing product photos before uploading them to an e-commerce platform like Shopify, WooCommerce, or Etsy",
                    "Reducing profile picture size for a government portal, LinkedIn, or job application system",
                    "Optimising blog post images and thumbnails for WordPress or similar CMS to improve page speed",
                    "Shrinking screenshots and images before attaching them to emails or support tickets",
                    "Reducing image size before WhatsApp sharing to avoid full-quality compression by the app",
                ]}
                faq={[
                    { q: "What is the difference between lossy and lossless compression?", a: "Lossy compression (like JPEG at less than 100%) permanently removes some image data to achieve smaller sizes. At 80–90% quality, the loss is imperceptible to the human eye. Lossless compression (like PNG to optimised PNG) reorganises data without losing anything — the result is identical to the original but stored more efficiently." },
                    { q: "Should I use JPEG or WebP?", a: "WebP is almost always the better choice for web use. It produces smaller files at the same quality and is supported by all modern browsers (Chrome, Firefox, Safari 14+, Edge). Use JPEG for compatibility with older systems or for printing." },
                    { q: "How much can I compress an image?", a: "It depends on the content. Photos with many gradients and colours compress better than flat illustrations. At quality 80%, a 5MB JPEG photo typically compresses to under 1MB. A flat logo or screenshot may only compress to 2–3MB." },
                    { q: "Is my image stored after compression?", a: "No. Your image is processed in an isolated temporary environment and deleted immediately after your download is ready. We cannot view or recover your images after processing." },
                    { q: "Can I compress transparent PNG images?", a: "Yes. PNG compression is lossless and preserves transparency. If you choose JPEG output, transparency will be replaced with a white background. Use WebP output to keep transparency with high compression." },
                ]}
            />
        </div>
    );
}