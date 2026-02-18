"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api, shouldShowErrorToast } from "@/lib/api";
import { formatBytes, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileDropzone } from "@/components/shared/file-dropzone";
import { SupportButton } from "@/components/shared/support-button";
import { useProgressModal } from "@/components/shared/progress-modal";
import { useAuth } from "@/providers/auth-provider";
import { RelatedGuide } from "@/components/shared/related-guide";
import {
  Table,
  Download,
  FileSpreadsheet,
  File,
  Sparkles,
  ArrowLeftRight,
  FileText,
  CheckCircle2,
} from "lucide-react";
import type { ExcelResponse } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

type ConversionMode = "excel-to-csv" | "csv-to-excel";

export default function ExcelPage() {
  const { user } = useAuth();
  const isPro = user?.subscription_tier === "pro";
  const { showProgress, setStatus, hideProgress } = useProgressModal();

  const [mode, setMode] = useState<ConversionMode>("excel-to-csv");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preserveFormulas, setPreserveFormulas] = useState(false);
  const [cleanData, setCleanData] = useState(true);
  const [sheetName, setSheetName] = useState("Sheet1");
  const [delimiter, setDelimiter] = useState(",");
  const [result, setResult] = useState<ExcelResponse | null>(null);
  const [csvToExcelResult, setCsvToExcelResult] = useState<any>(null);

  const handleFileSelect = (files: File[]) => {
    if (files.length > 0) {
      setSelectedFile(files[0]);
      setResult(null);
      setCsvToExcelResult(null);
    }
  };

  const handleModeChange = (newMode: ConversionMode) => {
    setMode(newMode);
    setSelectedFile(null);
    setResult(null);
    setCsvToExcelResult(null);
  };

  // Excel to CSV mutation
  const excelToCsvMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await api.post("/tools/excel/to-csv", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data as ExcelResponse;
    },
    onSuccess: (data) => {
      setStatus("success", "Converted to CSV!");
      setResult(data);
    },
    onError: (error: any) => {
      hideProgress();
      if (shouldShowErrorToast(error)) {
        toast.error(error.response?.data?.message || "Conversion failed");
      }
    },
  });

  // CSV to Excel mutation
  const csvToExcelMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await api.post("/tools/excel/from-csv", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    },
    onSuccess: (data) => {
      setStatus("success", "Converted to Excel!");
      setCsvToExcelResult(data);
    },
    onError: (error: any) => {
      hideProgress();
      if (shouldShowErrorToast(error)) {
        toast.error(error.response?.data?.message || "Conversion failed");
      }
    },
  });

  const downloadZipMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await api.post("/tools/excel/to-csv/zip", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        responseType: "blob",
      });
      return response.data;
    },
    onSuccess: (data) => {
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${selectedFile?.name.replace(/\.[^/.]+$/, "")}_csv.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("ZIP downloaded!");
    },
    onError: (error: any) => {
      if (shouldShowErrorToast(error)) {
        toast.error("Download failed");
      }
    },
  });

  const handleConvert = () => {
    if (!selectedFile) {
      toast.error("Please select a file");
      return;
    }

    showProgress({ status: "uploading", fileName: selectedFile.name });

    if (mode === "excel-to-csv") {
      setResult(null);
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("preserve_formulas", preserveFormulas.toString());
      formData.append("clean_data", cleanData.toString());
      setTimeout(() => setStatus("processing", "Converting to CSV..."), 500);
      excelToCsvMutation.mutate(formData);
    } else {
      setCsvToExcelResult(null);
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("sheet_name", sheetName);
      formData.append("delimiter", delimiter);
      setTimeout(() => setStatus("processing", "Creating Excel file..."), 500);
      csvToExcelMutation.mutate(formData);
    }
  };

  const handleDownload = (downloadUrl: string) => {
    const link = document.createElement("a");
    link.href = `${API_URL}${downloadUrl}`;
    link.download = "";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadZip = () => {
    if (!selectedFile) {
      toast.error("Please select an Excel file");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("preserve_formulas", preserveFormulas.toString());
    formData.append("clean_data", cleanData.toString());
    downloadZipMutation.mutate(formData);
  };

  const isLoading = excelToCsvMutation.isPending || csvToExcelMutation.isPending;

  return (
    <div className="max-w-4xl mx-auto px-1">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg">
            <Table className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Excel & CSV Converter</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Convert between Excel and CSV formats
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isPro && <SupportButton size="sm" />}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Free - </span>Unlimited
          </div>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="grid grid-cols-2 gap-2 mb-6">
        <button
          onClick={() => handleModeChange("excel-to-csv")}
          className={cn(
            "p-3 rounded-lg border transition-all flex items-center gap-2.5",
            mode === "excel-to-csv"
              ? "bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/50 shadow-md"
              : "bg-card border-border/50 hover:border-border hover:bg-muted/30"
          )}
        >
          <div className={cn(
            "w-8 h-8 rounded-md flex items-center justify-center shrink-0",
            mode === "excel-to-csv" ? "bg-green-500/10" : "bg-muted"
          )}>
            <FileSpreadsheet className={cn(
              "h-4 w-4",
              mode === "excel-to-csv" ? "text-green-500" : "text-muted-foreground"
            )} />
          </div>
          <div className="text-left min-w-0">
            <div className="font-medium text-sm truncate">Excel to CSV</div>
            <div className="text-[10px] text-muted-foreground hidden sm:block">Multi-sheet support</div>
          </div>
          {mode === "excel-to-csv" && (
            <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto shrink-0" />
          )}
        </button>

        <button
          onClick={() => handleModeChange("csv-to-excel")}
          className={cn(
            "p-3 rounded-lg border transition-all flex items-center gap-2.5",
            mode === "csv-to-excel"
              ? "bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/50 shadow-md"
              : "bg-card border-border/50 hover:border-border hover:bg-muted/30"
          )}
        >
          <div className={cn(
            "w-8 h-8 rounded-md flex items-center justify-center shrink-0",
            mode === "csv-to-excel" ? "bg-blue-500/10" : "bg-muted"
          )}>
            <FileText className={cn(
              "h-4 w-4",
              mode === "csv-to-excel" ? "text-blue-500" : "text-muted-foreground"
            )} />
          </div>
          <div className="text-left min-w-0">
            <div className="font-medium text-sm truncate">CSV to Excel</div>
            <div className="text-[10px] text-muted-foreground hidden sm:block">Create .xlsx files</div>
          </div>
          {mode === "csv-to-excel" && (
            <CheckCircle2 className="h-4 w-4 text-blue-500 ml-auto shrink-0" />
          )}
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Input Section */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium">
              {mode === "excel-to-csv" ? "Upload Excel File" : "Upload CSV File"}
            </CardTitle>
            <CardDescription className="text-xs">
              {mode === "excel-to-csv"
                ? "Supported: .xlsx, .xls (max 50MB)"
                : "Supported: .csv (max 50MB)"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 space-y-4">
            <FileDropzone
              onFilesSelected={handleFileSelect}
              accept={mode === "excel-to-csv"
                ? {
                  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
                  "application/vnd.ms-excel": [".xls"],
                }
                : {
                  "text/csv": [".csv"],
                }
              }
              selectedFiles={selectedFile ? [selectedFile] : []}
              onRemoveFile={() => {
                setSelectedFile(null);
                setResult(null);
                setCsvToExcelResult(null);
              }}
            />

            {/* Options */}
            {mode === "excel-to-csv" ? (
              <div className="space-y-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cleanData}
                    onChange={(e) => setCleanData(e.target.checked)}
                    className="rounded mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium">Clean data</p>
                    <p className="text-xs text-muted-foreground">
                      Remove empty rows/columns, trim whitespace
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preserveFormulas}
                    onChange={(e) => setPreserveFormulas(e.target.checked)}
                    className="rounded mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium">Preserve formulas</p>
                    <p className="text-xs text-muted-foreground">
                      Include formula column alongside values
                    </p>
                  </div>
                </label>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Sheet Name</Label>
                  <Input
                    value={sheetName}
                    onChange={(e) => setSheetName(e.target.value)}
                    placeholder="Sheet1"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Delimiter</Label>
                  <div className="flex gap-2">
                    {[
                      { value: ",", label: "Comma (,)" },
                      { value: ";", label: "Semicolon (;)" },
                      { value: "\t", label: "Tab" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setDelimiter(opt.value)}
                        className={cn(
                          "flex-1 py-1.5 px-2 text-xs rounded border transition-colors",
                          delimiter === opt.value
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/50 border-border hover:bg-muted"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={handleConvert}
                disabled={!selectedFile || isLoading}
              >
                {isLoading ? (
                  "Converting..."
                ) : (
                  <>
                    <ArrowLeftRight className="mr-2 h-4 w-4" />
                    Convert
                  </>
                )}
              </Button>
              {mode === "excel-to-csv" && (
                <Button
                  variant="outline"
                  onClick={handleDownloadZip}
                  disabled={!selectedFile || downloadZipMutation.isPending}
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Result Section */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium">Result</CardTitle>
            <CardDescription className="text-xs">
              {mode === "excel-to-csv"
                ? "Each sheet becomes a separate CSV"
                : "Your Excel file is ready"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            {mode === "excel-to-csv" && result ? (
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground flex gap-4">
                  <span>Sheets: {result.sheet_count}</span>
                  <span>Size: {formatBytes(result.total_size_bytes)}</span>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {result.result_files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2.5 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <File className="h-4 w-4 text-green-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{file.sheet_name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {file.rows} × {file.columns} • {formatBytes(file.size)}
                          </p>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => handleDownload(file.download_url)}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : mode === "csv-to-excel" && csvToExcelResult ? (
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground flex gap-4">
                  <span>{csvToExcelResult.rows} rows</span>
                  <span>{csvToExcelResult.columns} columns</span>
                  <span>{formatBytes(csvToExcelResult.size)}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2.5">
                    <FileSpreadsheet className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium">{csvToExcelResult.filename}</p>
                      <p className="text-xs text-muted-foreground">Excel Workbook</p>
                    </div>
                  </div>
                  <Button onClick={() => handleDownload(csvToExcelResult.download_url)}>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <Table className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Upload a file and click Convert</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <RelatedGuide guideSlug="how-to-convert-excel-to-csv" />
    </div>
  );
}
