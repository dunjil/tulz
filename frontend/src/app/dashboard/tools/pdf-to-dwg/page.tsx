"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { RelatedGuide } from "@/components/shared/related-guide";
import { api, apiHelpers, shouldShowErrorToast } from "@/lib/api";
import { useUpgradeModal } from "@/components/shared/upgrade-modal";
import { useLoginModal } from "@/components/shared/login-modal";
import { useProgressModal } from "@/components/shared/progress-modal";
import { useAuth } from "@/providers/auth-provider";
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
import {
    Download,
    CheckCircle2,
    ArrowRight,
    FileCheck,
    Loader2,
    DraftingCompass,
    HelpCircle,
    Layers,
    FileInput,
} from "lucide-react";
import { UsageBadge } from "@/components/shared/usage-badge";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function PDFToDWGPage() {
    const { isAuthenticated } = useAuth();
    const queryClient = useQueryClient();
    const { showProgress, setStatus, hideProgress } = useProgressModal();
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [result, setResult] = useState<any | null>(null);

    const handleFileSelect = (files: File[]) => {
        setSelectedFiles(files.slice(0, 1));
        setResult(null);
    };

    const convertMutation = useMutation({
        mutationFn: async (formData: FormData) => {
            const response = await api.post("/tools/cad/pdf-to-dwg", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return response.data;
        },
        onSuccess: (data) => {
            setStatus("success", "PDF converted to DWG!");
            setResult(data);
            queryClient.invalidateQueries({ queryKey: ["remaining-uses"] });
        },
        onError: (error: any) => {
            hideProgress();
            if (shouldShowErrorToast(error)) {
                toast.error(error.response?.data?.message || "Conversion failed");
            }
        },
    });

    const handleConvert = () => {
        if (!selectedFiles.length) {
            toast.error("Please select a PDF file");
            return;
        }

        setResult(null);
        showProgress({ status: "uploading", fileName: selectedFiles[0].name });
        const formData = new FormData();
        formData.append("file", selectedFiles[0]);
        setStatus("processing", "Extracting vector paths...");
        convertMutation.mutate(formData);
    };

    const handleDownload = (downloadUrl: string) => {
        const link = document.createElement("a");
        link.href = `${API_URL}${downloadUrl}`;
        link.download = "";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="max-w-6xl mx-auto">
            {/* SEO Headings */}
            <div className="sr-only">
                <h1>Best PDF to DWG Converter Online</h1>
                <h2>Convert PDF back to editable CAD / DXF for free</h2>
                <p>High-quality vector extraction from architectural and engineering PDFs. Turn PDF geometry into DWG-compatible DXF files.</p>
            </div>

            {/* Header */}
            <div className="mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500/10 to-red-500/10">
                                <DraftingCompass className="h-7 w-7 sm:h-8 sm:w-8 text-orange-600" />
                            </div>
                            PDF to DWG
                        </h1>
                        <p className="text-muted-foreground mt-2 text-sm sm:text-base">
                            Convert PDF vector graphics into editable DXF (DWG compatible) CAD files
                        </p>
                    </div>
                    <UsageBadge />
                </div>
            </div>

            {/* Main Content */}
            <div className="grid lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 space-y-6">
                    <Card className="overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-orange-500/10 to-red-500/10">
                            <CardTitle className="flex items-center gap-2">
                                <FileInput className="h-5 w-5 text-orange-600" />
                                Upload PDF Document
                            </CardTitle>
                            <CardDescription>
                                Select a vector-based PDF for best results
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <FileDropzone
                                onFilesSelected={handleFileSelect}
                                accept={{ "application/pdf": [".pdf"] }}
                                multiple={false}
                                selectedFiles={selectedFiles}
                                onRemoveFile={() => setSelectedFiles([])}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Layers className="h-5 w-5 text-orange-500" />
                                Advanced Vector Extraction
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                                <DraftingCompass className="h-5 w-5 text-orange-600 flex-shrink-0" />
                                <p className="text-sm text-muted-foreground">
                                    Our tool analyzes PDF drawing commands and converts lines, rectangles, and curves into standard CAD entities.
                                </p>
                            </div>

                            <div className="pt-4">
                                <Button
                                    className="w-full h-12 text-base font-semibold bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                                    onClick={handleConvert}
                                    disabled={!selectedFiles.length || convertMutation.isPending}
                                >
                                    {convertMutation.isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            Extracting Geometry...
                                        </>
                                    ) : (
                                        <>
                                            <DraftingCompass className="mr-2 h-5 w-5" />
                                            Convert to DWG/DXF
                                            <ArrowRight className="ml-2 h-5 w-5" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Technical Note */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <HelpCircle className="h-5 w-5 text-orange-500" />
                                Important Note on PDF to CAD
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <p className="text-muted-foreground">
                                This tool works best on <strong>vector-based PDFs</strong> (generated by CAD software or Illustrator).
                                Scanned PDFs (which are just images) will not produce editable CAD geometry.
                            </p>
                            <div className="space-y-2">
                                <p className="font-semibold text-foreground">How it works:</p>
                                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                    <li>Extracts Line, Rectangle, and Bezier Curve paths.</li>
                                    <li>Reconstructs them in a R2010 DXF container.</li>
                                    <li>Flips the coordinate system for CAD compatibility.</li>
                                    <li>Adds spacing between PDF pages in the CAD modelspace.</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-2">
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileCheck className="h-5 w-5 text-primary" />
                                Output Result
                            </CardTitle>
                            <CardDescription>
                                Editable CAD file will appear here
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {convertMutation.isPending ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <div className="relative">
                                        <div className="w-16 h-16 rounded-full border-4 border-muted animate-pulse" />
                                        <Loader2 className="absolute inset-0 m-auto h-8 w-8 text-primary animate-spin" />
                                    </div>
                                    <p className="mt-4 text-sm font-medium">Drafting CAD entities...</p>
                                </div>
                            ) : result ? (
                                <div className="space-y-4">
                                    <div className="p-4 rounded-lg bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20">
                                        <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-2">
                                            <CheckCircle2 className="h-5 w-5" />
                                            <span className="font-semibold">Success!</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">DWG file is ready for your CAD software.</p>
                                    </div>

                                    <div className="group relative p-4 rounded-xl border bg-card hover:shadow-md transition-all">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 rounded-lg bg-orange-500/10">
                                                <DraftingCompass className="h-5 w-5 text-orange-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">{result.filename}</p>
                                                <p className="text-xs text-muted-foreground mt-1">{formatBytes(result.size)}</p>
                                            </div>
                                            <Button
                                                size="sm"
                                                onClick={() => handleDownload(result.download_url)}
                                                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                                            >
                                                <Download className="h-4 w-4 mr-1" />
                                                Download
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                                        <DraftingCompass className="h-10 w-10 text-muted-foreground/30" />
                                    </div>
                                    <p className="text-sm text-muted-foreground">Upload a PDF to convert to CAD</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
            <RelatedGuide guideSlug="how-to-convert-pdf-to-dwg" />
        </div>
    );
}
