"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/providers/auth-provider";
import { apiHelpers } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  History,
  QrCode,
  Calculator,
  Image,
  FileText,
  Table,
  Globe,
  Palette,
  FileDown,
  CheckCircle,
  XCircle,
} from "lucide-react";

const toolIcons: Record<string, typeof QrCode> = {
  qrcode: QrCode,
  calculator: Calculator,
  image: Image,
  pdf: FileText,
  excel: Table,
  favicon: Palette,
  webpdf: Globe,
  cv: FileDown,
};

const toolNames: Record<string, string> = {
  qrcode: "QR Code",
  calculator: "Calculator",
  image: "Image Editor",
  pdf: "PDF Tools",
  excel: "Excel to CSV",
  favicon: "Favicon Generator",
  webpdf: "Website to PDF",
  cv: "CV Generator",
};

interface UsageHistoryItem {
  id: string;
  tool: string;
  operation: string;
  created_at: string;
  success: boolean;
  processing_time_ms: number;
  tier_at_use: string;
}

export default function HistoryPage() {
  const { user } = useAuth();

  const { data: history, isLoading } = useQuery({
    queryKey: ["usage-history"],
    queryFn: async () => {
      const response = await apiHelpers.getUsageHistory();
      return response.data as { history: UsageHistoryItem[] };
    },
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Please log in to view history</h1>
        <Button asChild>
          <a href="/login">Log in</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <History className="h-8 w-8 text-primary" />
          Usage History
        </h1>
        <p className="text-muted-foreground mt-2">
          View your tool usage history and activity
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Your tool usage from the past 30 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading history...
            </div>
          ) : history?.history?.length ? (
            <div className="space-y-4">
              {history.history.map((item: UsageHistoryItem) => {
                const Icon = toolIcons[item.tool] || QrCode;
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-background">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {toolNames[item.tool] || item.tool} - <span className="capitalize">{item.operation.replace(/_/g, " ")}</span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(item.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">
                        {item.processing_time_ms}ms
                      </span>
                      {item.success ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No usage history yet</p>
              <p className="text-sm mt-1">
                Start using tools to see your activity here
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
