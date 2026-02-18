"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { apiHelpers, shouldShowErrorToast } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  GitCompare,
  Sparkles,
  ArrowRight,
  Plus,
  Minus,
  Equal,
} from "lucide-react";
import { SupportButton } from "@/components/shared/support-button";
import { useAuth } from "@/providers/auth-provider";
import { RelatedGuide } from "@/components/shared/related-guide";

interface DiffLine {
  type: "unchanged" | "added" | "removed" | "info";
  content: string;
  line_num_left: number | null;
  line_num_right: number | null;
}

interface DiffResult {
  success: boolean;
  diff_lines: DiffLine[];
  unified_diff: string;
  stats: {
    lines_added: number;
    lines_removed: number;
    lines_unchanged: number;
    total_lines_left: number;
    total_lines_right: number;
    similarity_percent: number;
  };
}

export default function TextDiffPage() {
  const { user } = useAuth();
  const isPro = user?.subscription_tier === "pro";
  const [text1, setText1] = useState("");
  const [text2, setText2] = useState("");
  const [result, setResult] = useState<DiffResult | null>(null);
  const [viewMode, setViewMode] = useState<"side-by-side" | "unified">("side-by-side");

  const compareMutation = useMutation({
    mutationFn: async () => {
      const response = await apiHelpers.compareTexts({
        text1,
        text2,
        context_lines: 3,
      });
      return response.data as DiffResult;
    },
    onSuccess: (data) => {
      if (data.success) {
        setResult(data);
        toast.success("Comparison complete!");
      } else {
        toast.error("Comparison failed");
      }
    },
    onError: (error: any) => {
      if (shouldShowErrorToast(error)) {
        toast.error(error.response?.data?.message || "Comparison failed");
      }
    },
  });

  const loadSample = () => {
    setText1(`function greet(name) {
  console.log("Hello, " + name);
  return true;
}

const users = ["Alice", "Bob"];
users.forEach(greet);`);

    setText2(`function greet(name, greeting = "Hello") {
  console.log(greeting + ", " + name + "!");
  return true;
}

const users = ["Alice", "Bob", "Charlie"];
users.forEach(user => greet(user));`);
  };

  const swapTexts = () => {
    const temp = text1;
    setText1(text2);
    setText2(temp);
    setResult(null);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
              <GitCompare className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
              Text Diff
            </h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              Compare two texts and see the differences highlighted
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {!isPro && <SupportButton size="sm" />}
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Free - Unlimited</span>
            </div>
          </div>
        </div>
      </div>

      {/* Input Section */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Original Text</span>
              <Button variant="outline" size="sm" onClick={loadSample}>
                Load Sample
              </Button>
            </CardTitle>
            <CardDescription>Paste the original/old version</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={text1}
              onChange={(e) => {
                setText1(e.target.value);
                setResult(null);
              }}
              placeholder="Paste original text here..."
              className="font-mono text-sm min-h-[250px]"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Modified Text</span>
              <Button variant="outline" size="sm" onClick={swapTexts}>
                ↔ Swap
              </Button>
            </CardTitle>
            <CardDescription>Paste the modified/new version</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={text2}
              onChange={(e) => {
                setText2(e.target.value);
                setResult(null);
              }}
              placeholder="Paste modified text here..."
              className="font-mono text-sm min-h-[250px]"
            />
          </CardContent>
        </Card>
      </div>

      {/* Compare Button */}
      <div className="flex justify-center mb-6">
        <Button
          size="lg"
          onClick={() => compareMutation.mutate()}
          disabled={!text1 || !text2 || compareMutation.isPending}
        >
          <GitCompare className="mr-2 h-5 w-5" />
          {compareMutation.isPending ? "Comparing..." : "Compare Texts"}
        </Button>
      </div>

      {/* Results Section */}
      {result && (
        <>
          {/* Stats */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-wrap justify-center gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    +{result.stats.lines_added}
                  </div>
                  <div className="text-sm text-muted-foreground">Lines Added</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">
                    -{result.stats.lines_removed}
                  </div>
                  <div className="text-sm text-muted-foreground">Lines Removed</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-600">
                    {result.stats.lines_unchanged}
                  </div>
                  <div className="text-sm text-muted-foreground">Unchanged</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {result.stats.similarity_percent}%
                  </div>
                  <div className="text-sm text-muted-foreground">Similarity</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* View Mode Toggle */}
          <div className="flex justify-end mb-4">
            <div className="inline-flex rounded-lg border p-1">
              <button
                className={`px-3 py-1 text-sm rounded-md transition-colors ${viewMode === "side-by-side"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                  }`}
                onClick={() => setViewMode("side-by-side")}
              >
                Side by Side
              </button>
              <button
                className={`px-3 py-1 text-sm rounded-md transition-colors ${viewMode === "unified"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                  }`}
                onClick={() => setViewMode("unified")}
              >
                Unified
              </button>
            </div>
          </div>

          {/* Diff Display */}
          <Card>
            <CardHeader>
              <CardTitle>Differences</CardTitle>
            </CardHeader>
            <CardContent>
              {viewMode === "unified" ? (
                <pre className="font-mono text-sm bg-muted p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">
                  {result.unified_diff || "No differences found"}
                </pre>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <div className="max-h-[500px] overflow-auto">
                    {result.diff_lines.map((line, index) => (
                      <div
                        key={index}
                        className={`flex font-mono text-sm border-b last:border-b-0 ${line.type === "added"
                            ? "bg-green-50 dark:bg-green-950/30"
                            : line.type === "removed"
                              ? "bg-red-50 dark:bg-red-950/30"
                              : "bg-white dark:bg-gray-900"
                          }`}
                      >
                        {/* Line numbers */}
                        <div className="flex-shrink-0 w-12 text-right pr-2 py-1 text-muted-foreground border-r bg-muted/50 select-none">
                          {line.line_num_left || ""}
                        </div>
                        <div className="flex-shrink-0 w-12 text-right pr-2 py-1 text-muted-foreground border-r bg-muted/50 select-none">
                          {line.line_num_right || ""}
                        </div>

                        {/* Change indicator */}
                        <div className="flex-shrink-0 w-8 flex items-center justify-center border-r">
                          {line.type === "added" && (
                            <Plus className="h-4 w-4 text-green-600" />
                          )}
                          {line.type === "removed" && (
                            <Minus className="h-4 w-4 text-red-600" />
                          )}
                          {line.type === "unchanged" && (
                            <span className="text-muted-foreground">&nbsp;</span>
                          )}
                        </div>

                        {/* Content */}
                        <div
                          className={`flex-1 px-3 py-1 whitespace-pre overflow-x-auto ${line.type === "added"
                              ? "text-green-800 dark:text-green-300"
                              : line.type === "removed"
                                ? "text-red-800 dark:text-red-300"
                                : ""
                            }`}
                        >
                          {line.content || " "}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
      <RelatedGuide guideSlug="how-to-compare-text-online" />
    </div>
  );
}
