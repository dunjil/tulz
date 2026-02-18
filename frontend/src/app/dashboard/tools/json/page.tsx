"use client";

import { RelatedGuide } from "@/components/shared/related-guide";

import { useState, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { apiHelpers, shouldShowErrorToast } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Braces,
  Sparkles,
  Copy,
  Check,
  AlertCircle,
  ArrowRightLeft,
  Minimize2,
  FileJson,
  Trash2,
  Download,
  Upload,
  CheckCircle2,
  XCircle,
  Info,
  Keyboard,
} from "lucide-react";
import { SupportButton } from "@/components/shared/support-button";
import { useAuth } from "@/providers/auth-provider";

export default function JsonFormatterPage() {
  const { user } = useAuth();
  const isPro = user?.subscription_tier === "pro";
  const [activeTab, setActiveTab] = useState("format");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [indent, setIndent] = useState("2");
  const [sortKeys, setSortKeys] = useState(false);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [convertFrom, setConvertFrom] = useState("json");
  const [convertTo, setConvertTo] = useState("yaml");
  const [liveValidation, setLiveValidation] = useState<{ valid: boolean; error?: string } | null>(null);
  const [lineCount, setLineCount] = useState(1);

  // Live validation as user types
  useEffect(() => {
    if (!input.trim()) {
      setLiveValidation(null);
      setLineCount(1);
      return;
    }

    setLineCount(input.split('\n').length);

    const timer = setTimeout(() => {
      try {
        JSON.parse(input);
        setLiveValidation({ valid: true });
      } catch (e: any) {
        setLiveValidation({ valid: false, error: e.message });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [input]);

  const formatMutation = useMutation({
    mutationFn: async () => {
      const response = await apiHelpers.formatJson({
        content: input,
        indent: parseInt(indent),
        sort_keys: sortKeys,
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        setOutput(data.result);
        setStats(data.stats);
        toast.success("JSON formatted successfully!");
      } else {
        toast.error(data.error || "Failed to format JSON");
      }
    },
    onError: (error: any) => {
      if (shouldShowErrorToast(error)) {
        toast.error(error.response?.data?.message || "Failed to format JSON");
      }
    },
  });

  const minifyMutation = useMutation({
    mutationFn: async () => {
      const response = await apiHelpers.minifyJson({ content: input });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        setOutput(data.result);
        setStats(data.stats);
        toast.success(`Minified! Saved ${data.stats?.saved_bytes || 0} bytes`);
      } else {
        toast.error(data.error || "Failed to minify JSON");
      }
    },
    onError: (error: any) => {
      if (shouldShowErrorToast(error)) {
        toast.error(error.response?.data?.message || "Failed to minify JSON");
      }
    },
  });

  const validateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiHelpers.validateJson({ content: input });
      return response.data;
    },
    onSuccess: (data) => {
      setValidationResult(data);
      if (data.valid) {
        toast.success("Valid JSON!");
      } else {
        toast.error(`Invalid JSON: ${data.error}`);
      }
    },
    onError: (error: any) => {
      if (shouldShowErrorToast(error)) {
        toast.error(error.response?.data?.message || "Validation failed");
      }
    },
  });

  const convertMutation = useMutation({
    mutationFn: async () => {
      const response = await apiHelpers.convertFormat({
        content: input,
        from_format: convertFrom,
        to_format: convertTo,
        indent: parseInt(indent),
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        setOutput(data.result);
        setStats(data.stats);
        toast.success(`Converted from ${convertFrom.toUpperCase()} to ${convertTo.toUpperCase()}!`);
      } else {
        toast.error(data.error || "Conversion failed");
      }
    },
    onError: (error: any) => {
      if (shouldShowErrorToast(error)) {
        toast.error(error.response?.data?.message || "Conversion failed");
      }
    },
  });

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyInput = async () => {
    await navigator.clipboard.writeText(input);
    toast.success("Input copied!");
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInput(text);
      toast.success("Pasted from clipboard!");
    } catch {
      toast.error("Failed to paste from clipboard");
    }
  };

  const handleClear = () => {
    setInput("");
    setOutput("");
    setStats(null);
    setValidationResult(null);
  };

  const handleDownload = () => {
    if (!output) return;
    const blob = new Blob([output], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `formatted-${Date.now()}.${activeTab === "convert" ? convertTo : "json"}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("File downloaded!");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setInput(content);
      toast.success(`Loaded ${file.name}`);
    };
    reader.onerror = () => toast.error("Failed to read file");
    reader.readAsText(file);
    e.target.value = "";
  };

  const loadSample = () => {
    const sample = {
      name: "John Doe",
      age: 30,
      email: "john@example.com",
      address: {
        street: "123 Main St",
        city: "New York",
        country: "USA",
      },
      hobbies: ["reading", "gaming", "coding"],
      isActive: true,
    };
    setInput(JSON.stringify(sample));
  };

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (activeTab === "format") formatMutation.mutate();
      else if (activeTab === "minify") minifyMutation.mutate();
      else if (activeTab === "validate") validateMutation.mutate();
      else if (activeTab === "convert") convertMutation.mutate();
    }
  }, [activeTab, formatMutation, minifyMutation, validateMutation, convertMutation]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const isLoading = formatMutation.isPending || minifyMutation.isPending || validateMutation.isPending || convertMutation.isPending;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                <Braces className="h-6 w-6" />
              </div>
              JSON Formatter
            </h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              Format, minify, validate, and convert JSON/YAML instantly
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {!isPro && <SupportButton size="sm" />}
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Free Tool</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-md">
          <TabsTrigger value="format" className="gap-1.5">
            <FileJson className="h-4 w-4 hidden sm:block" />
            Format
          </TabsTrigger>
          <TabsTrigger value="minify" className="gap-1.5">
            <Minimize2 className="h-4 w-4 hidden sm:block" />
            Minify
          </TabsTrigger>
          <TabsTrigger value="validate" className="gap-1.5">
            <CheckCircle2 className="h-4 w-4 hidden sm:block" />
            Validate
          </TabsTrigger>
          <TabsTrigger value="convert" className="gap-1.5">
            <ArrowRightLeft className="h-4 w-4 hidden sm:block" />
            Convert
          </TabsTrigger>
        </TabsList>

        <div className="grid lg:grid-cols-2 gap-4">
          {/* Input Panel */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  Input
                  {liveValidation && (
                    <span className={`inline-flex items-center gap-1 text-xs font-normal px-2 py-0.5 rounded-full ${liveValidation.valid
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}>
                      {liveValidation.valid ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" />
                          Valid
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3" />
                          Invalid
                        </>
                      )}
                    </span>
                  )}
                </CardTitle>
                <div className="flex items-center gap-1">
                  <input
                    type="file"
                    accept=".json,.yaml,.yml,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => document.getElementById("file-upload")?.click()}
                    title="Upload file"
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handlePaste} title="Paste">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleClear} title="Clear" disabled={!input}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={loadSample}>
                    Sample
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {activeTab === "convert" ? `Paste your ${convertFrom.toUpperCase()} here` : "Paste your JSON here"}
                {input && <span className="ml-2">• {lineCount} lines • {input.length.toLocaleString()} chars</span>}
              </p>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col pt-0">
              <div className="relative flex-1 min-h-[350px] lg:min-h-[500px]">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={activeTab === "convert" && convertFrom === "yaml"
                    ? "name: John\nage: 30\ncity: New York"
                    : '{\n  "name": "John",\n  "age": 30\n}'}
                  className="w-full h-full min-h-[350px] lg:min-h-[500px] p-3 rounded-lg border border-input bg-background text-foreground font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  spellCheck={false}
                />
              </div>
            </CardContent>
          </Card>

          {/* Output Panel */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {activeTab === "validate" ? "Validation Result" : "Output"}
                </CardTitle>
                {output && activeTab !== "validate" && (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={handleCopy} title="Copy">
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleDownload} title="Download">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Keyboard className="h-3 w-3" />
                Press <kbd className="px-1.5 py-0.5 text-[10px] bg-muted rounded border">⌘/Ctrl + Enter</kbd> to run
              </p>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4 pt-0">
              {/* Tab-specific options */}
              <TabsContent value="format" className="mt-0 space-y-3">
                <div className="flex flex-wrap items-center gap-4 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Indent:</Label>
                    <Select value={indent} onValueChange={setIndent}>
                      <SelectTrigger className="w-32 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 spaces</SelectItem>
                        <SelectItem value="4">4 spaces</SelectItem>
                        <SelectItem value="0">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={sortKeys}
                      onCheckedChange={setSortKeys}
                      id="sort-keys"
                    />
                    <Label htmlFor="sort-keys" className="text-sm cursor-pointer">Sort keys</Label>
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => formatMutation.mutate()}
                  disabled={!input || formatMutation.isPending}
                >
                  <FileJson className="mr-2 h-4 w-4" />
                  {formatMutation.isPending ? "Formatting..." : "Format JSON"}
                </Button>
              </TabsContent>

              <TabsContent value="minify" className="mt-0 space-y-3">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Info className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>Removes all whitespace and newlines to create the smallest possible JSON.</span>
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => minifyMutation.mutate()}
                  disabled={!input || minifyMutation.isPending}
                >
                  <Minimize2 className="mr-2 h-4 w-4" />
                  {minifyMutation.isPending ? "Minifying..." : "Minify JSON"}
                </Button>
              </TabsContent>

              <TabsContent value="validate" className="mt-0 space-y-3">
                <Button
                  className="w-full"
                  onClick={() => validateMutation.mutate()}
                  disabled={!input || validateMutation.isPending}
                >
                  <AlertCircle className="mr-2 h-4 w-4" />
                  {validateMutation.isPending ? "Validating..." : "Validate JSON"}
                </Button>

                {validationResult && (
                  <div
                    className={`p-4 rounded-lg border ${validationResult.valid
                        ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                        : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
                      }`}
                  >
                    {validationResult.valid ? (
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/50">
                          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="font-medium text-green-800 dark:text-green-300">Valid JSON</p>
                          <p className="text-sm text-green-600 dark:text-green-400">Your JSON is properly formatted and valid.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/50">
                            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                          </div>
                          <div>
                            <p className="font-medium text-red-800 dark:text-red-300">Invalid JSON</p>
                            <p className="text-sm text-red-600 dark:text-red-400">
                              Line {validationResult.error_line}, Column {validationResult.error_column}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded text-sm font-mono text-red-700 dark:text-red-300">
                          {validationResult.error}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="convert" className="mt-0 space-y-3">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Select value={convertFrom} onValueChange={setConvertFrom}>
                    <SelectTrigger className="w-28 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="json">JSON</SelectItem>
                      <SelectItem value="yaml">YAML</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="p-1.5 rounded-full bg-background border">
                    <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Select value={convertTo} onValueChange={setConvertTo}>
                    <SelectTrigger className="w-28 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="json">JSON</SelectItem>
                      <SelectItem value="yaml">YAML</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full"
                  onClick={() => convertMutation.mutate()}
                  disabled={!input || convertMutation.isPending || convertFrom === convertTo}
                >
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  {convertMutation.isPending ? "Converting..." : `Convert to ${convertTo.toUpperCase()}`}
                </Button>
              </TabsContent>

              {/* Output display */}
              {activeTab !== "validate" && (
                <div className="flex-1 min-h-[250px] lg:min-h-[350px]">
                  <textarea
                    value={output}
                    readOnly
                    placeholder="Output will appear here..."
                    className="w-full h-full min-h-[250px] lg:min-h-[350px] p-3 rounded-lg border border-input bg-muted/30 text-foreground font-mono text-sm resize-none focus:outline-none"
                    spellCheck={false}
                  />
                </div>
              )}

              {/* Stats */}
              {stats && activeTab !== "validate" && (
                <div className="flex flex-wrap gap-3 p-3 bg-muted/50 rounded-lg text-sm">
                  {stats.original_length && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Original:</span>
                      <span className="font-medium">{stats.original_length.toLocaleString()} chars</span>
                    </div>
                  )}
                  {stats.formatted_length && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Formatted:</span>
                      <span className="font-medium">{stats.formatted_length.toLocaleString()} chars</span>
                    </div>
                  )}
                  {stats.minified_length && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Minified:</span>
                      <span className="font-medium">{stats.minified_length.toLocaleString()} chars</span>
                    </div>
                  )}
                  {stats.saved_bytes !== undefined && stats.saved_bytes > 0 && (
                    <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                      <span>Saved:</span>
                      <span className="font-medium">{stats.saved_bytes.toLocaleString()} bytes ({stats.compression_ratio}%)</span>
                    </div>
                  )}
                  {stats.keys_count && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Keys:</span>
                      <span className="font-medium">{stats.keys_count}</span>
                    </div>
                  )}
                  {stats.depth && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Depth:</span>
                      <span className="font-medium">{stats.depth}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Tabs>
      <RelatedGuide guideSlug="how-to-format-json-data" />
    </div>
  );
}
