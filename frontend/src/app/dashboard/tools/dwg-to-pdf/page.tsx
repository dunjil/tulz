"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { RelatedGuide } from "@/components/shared/related-guide";
import { api, apiHelpers, shouldShowErrorToast } from "@/lib/api";
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
    Box,
    DraftingCompass,
    HelpCircle,
    Info,
} from "lucide-react";
import { SupportButton } from "@/components/shared/support-button";
import { FreeBadge } from "@/components/shared/free-badge";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function DWGToPDFPage() {
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
            const response = await api.post("/tools/cad/dwg-to-pdf", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return response.data;
        },
        onSuccess: (data) => {
            setStatus("success", "CAD converted to PDF!");
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
            toast.error("Please select a DWG or DXF file");
            return;
        }

        setResult(null);
        showProgress({ status: "uploading", fileName: selectedFiles[0].name });
        const formData = new FormData();
        formData.append("file", selectedFiles[0]);
        setStatus("processing", "Rendering CAD geometry...");
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
                <h1>Free DWG to PDF Converter Online</h1>
                <h2>Convert AutoCAD DWG and DXF to PDF without software</h2>
                <p>Fast, high-quality CAD to PDF conversion for architects and engineers. Supports DWG 2000 and newer.</p>
            </div>

            {/* Header */}
            <div className="mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10">
                                <Box className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600" />
                            </div>
                            DWG to PDF
                        </h1>
                        <p className="text-muted-foreground mt-2 text-sm sm:text-base">
                            Convert AutoCAD DWG & DXF files to high-quality PDF documents
                        </p>
                    </div>
                    
                </div>
            </div>

            {/* Main Content */}
            <div className="grid lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 space-y-6">
                    <Card className="overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10">
                            <CardTitle className="flex items-center gap-2">
                                <DraftingCompass className="h-5 w-5 text-blue-600" />
                                Upload DWG/DXF
                            </CardTitle>
                            <CardDescription>
                                Select your CAD file to start conversion
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <FileDropzone
                                onFilesSelected={handleFileSelect}
                                accept={{ "application/acad": [".dwg", ".dxf"] }}
                                multiple={false}
                                selectedFiles={selectedFiles}
                                onRemoveFile={() => setSelectedFiles([])}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Info className="h-5 w-5 text-blue-500" />
                                Conversion Settings
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                                <Box className="h-5 w-5 text-blue-600 flex-shrink-0" />
                                <p className="text-sm text-muted-foreground">
                                    Our engine renders CAD geometry into vector PDF, preserving original paths and colors.
                                </p>
                            </div>

                            <div className="pt-4">
                                <Button
                                    className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                                    onClick={handleConvert}
                                    disabled={!selectedFiles.length || convertMutation.isPending}
                                >
                                    {convertMutation.isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            Converting...
                                        </>
                                    ) : (
                                        <>
                                            <Download className="mr-2 h-5 w-5" />
                                            Convert to PDF
                                            <ArrowRight className="ml-2 h-5 w-5" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* User Guide */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <HelpCircle className="h-5 w-5 text-blue-500" />
                                How to use DWG to PDF
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                                <li><strong>Upload:</strong> Select or drag your .dwg or .dxf file into the box above.</li>
                                <li><strong>Full Support:</strong> We support both original AutoCAD <strong>binary DWG</strong> and open <strong>DXF</strong> formats.</li>
                                <li><strong>Convert:</strong> Click the "Convert to PDF" button to start processing.</li>
                                <li><strong>Wait:</strong> Our powerful engine will render the geometry. This usually takes 5-15 seconds.</li>
                                <li><strong>Download:</strong> Once finished, click "Download" to save your high-quality vector PDF.</li>
                            </ol>
                            <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/10 mt-4">
                                <p className="text-xs text-blue-700 dark:text-blue-300">
                                    <strong>Feature:</strong> Our new conversion engine now natively supports proprietary AutoCAD DWG files (v2000-v2024).
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-2">
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileCheck className="h-5 w-5 text-primary" />
                                Result
                            </CardTitle>
                            <CardDescription>
                                {result ? "Conversion complete" : "Results will appear here"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {convertMutation.isPending ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <div className="relative">
                                        <div className="w-16 h-16 rounded-full border-4 border-muted animate-pulse" />
                                        <Loader2 className="absolute inset-0 m-auto h-8 w-8 text-primary animate-spin" />
                                    </div>
                                    <p className="mt-4 text-sm font-medium">Processing CAD...</p>
                                </div>
                            ) : result ? (
                                <div className="space-y-4">
                                    <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20">
                                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                                            <CheckCircle2 className="h-5 w-5" />
                                            <span className="font-semibold">Ready!</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">High-quality vector PDF generated.</p>
                                    </div>

                                    <div className="group relative p-4 rounded-xl border bg-card hover:shadow-md transition-all">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 rounded-lg bg-blue-500/10">
                                                <Box className="h-5 w-5 text-blue-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">{result.filename}</p>
                                                <p className="text-xs text-muted-foreground mt-1">{formatBytes(result.size)}</p>
                                            </div>
                                            <Button
                                                size="sm"
                                                onClick={() => handleDownload(result.download_url)}
                                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
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
                                        <Box className="h-10 w-10 text-muted-foreground/30" />
                                    </div>
                                    <p className="text-sm text-muted-foreground">Upload a CAD file to convert</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
            <RelatedGuide guideSlug="how-to-convert-dwg-to-pdf" />
        </div>
    );
}