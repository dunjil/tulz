"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Globe,
  Users,
  BarChart3,
  Filter,
  Clock,
  Wrench,
} from "lucide-react";

interface ToolStats {
  period_days: number;
  by_tool: Record<string, number>;
  by_tier: Record<string, number>;
  success_rate: number;
  avg_processing_time_ms: number;
  total_uses: number;
}

interface UsageTrend {
  period_days: number;
  trend: { date: string; count: number }[];
}

interface ToolsByTier {
  period_days: number;
  country_filter: string | null;
  free_tier: {
    by_tool: Record<string, number>;
    total: number;
  };
  pro_tier: {
    by_tool: Record<string, number>;
    total: number;
  };
  anonymous_users: {
    by_tool: Record<string, number>;
    total: number;
  };
  registered_users: {
    by_tool: Record<string, number>;
    total: number;
  };
}

interface CountryStats {
  period_days: number;
  countries: {
    country_code: string;
    country_name: string;
    total_uses: number;
    unique_users: number;
    unique_ips: number;
  }[];
  tool_by_country: Record<string, Record<string, number>>;
}

interface MostUsedTools {
  period_days: number;
  filters: {
    user_type: string;
    tier: string;
    country: string | null;
  };
  tools: {
    tool: string;
    total_uses: number;
    unique_users: number;
    unique_ips: number;
  }[];
  total_uses: number;
}

// Helper function to get flag emoji from country code
function getFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return "🌍";
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export default function AdminAnalyticsPage() {
  const [days, setDays] = useState("30");
  const [countryFilter, setCountryFilter] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [userTypeFilter, setUserTypeFilter] = useState("all");

  const { data: toolStats, isLoading } = useQuery<ToolStats>({
    queryKey: ["admin", "tools", days],
    queryFn: async () => {
      const res = await api.get(`/admin/stats/tools?days=${days}`);
      return res.data;
    },
  });

  const { data: usageTrend } = useQuery<UsageTrend>({
    queryKey: ["admin", "trend", days],
    queryFn: async () => {
      const res = await api.get(`/admin/stats/usage-trend?days=${days}`);
      return res.data;
    },
  });

  const { data: countryStats } = useQuery<CountryStats>({
    queryKey: ["admin", "countries", days],
    queryFn: async () => {
      const res = await api.get(`/admin/stats/countries?days=${days}`);
      return res.data;
    },
  });

  const { data: mostUsedTools } = useQuery<MostUsedTools>({
    queryKey: ["admin", "most-used", days, tierFilter, userTypeFilter, countryFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ days });
      if (tierFilter !== "all") params.append("tier", tierFilter);
      if (userTypeFilter !== "all") params.append("user_type", userTypeFilter);
      if (countryFilter) params.append("country", countryFilter);
      const res = await api.get(`/admin/stats/most-used-tools?${params}`);
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-semibold">Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Detailed usage statistics and trends
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            placeholder="Country code (e.g., NG)"
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value.toUpperCase())}
            className="w-40"
          />
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Total Operations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {toolStats?.total_uses.toLocaleString() || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {toolStats?.success_rate || 0}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Avg Processing Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {Math.round(toolStats?.avg_processing_time_ms || 0)}ms
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Most Used Tool
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold capitalize">
              {toolStats
                ? Object.entries(toolStats.by_tool).sort(([, a], [, b]) => b - a)[0]?.[0] ?? "—"
                : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="by-country" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            By Country
          </TabsTrigger>
          <TabsTrigger value="filtered" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtered
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tool Usage Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Tool Usage Breakdown</CardTitle>
                <CardDescription>Usage distribution by tool</CardDescription>
              </CardHeader>
              <CardContent>
                {toolStats?.by_tool && Object.keys(toolStats.by_tool).length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(toolStats.by_tool)
                      .sort(([, a], [, b]) => b - a)
                      .map(([tool, count]) => {
                        const total = Object.values(toolStats.by_tool).reduce(
                          (a, b) => a + b,
                          0
                        );
                        const percentage = ((count / total) * 100).toFixed(1);
                        return (
                          <div key={tool}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="capitalize font-medium">{tool}</span>
                              <span className="text-muted-foreground">
                                {count.toLocaleString()} ({percentage}%)
                              </span>
                            </div>
                            <div className="h-3 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No usage data for this period</p>
                )}
              </CardContent>
            </Card>

            {/* Usage Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Usage Trend</CardTitle>
                <CardDescription>Operations per day</CardDescription>
              </CardHeader>
              <CardContent className="max-h-[400px] overflow-y-auto">
                {usageTrend?.trend && usageTrend.trend.length > 0 ? (
                  <div className="space-y-2">
                    {usageTrend.trend.slice(-14).map((day) => {
                      const maxCount = Math.max(...usageTrend.trend.map((d) => d.count));
                      const percentage = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
                      return (
                        <div key={day.date} className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-20">
                            {new Date(day.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                            <div
                              className="h-full bg-primary/80 rounded"
                              style={{ width: `${Math.max(percentage, 3)}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium w-10 text-right">
                            {day.count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No trend data for this period</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* By Country Tab */}
        <TabsContent value="by-country">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Usage by Country
              </CardTitle>
              <CardDescription>
                Geographic distribution of tool usage
              </CardDescription>
            </CardHeader>
            <CardContent>
              {countryStats?.countries && countryStats.countries.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Country</TableHead>
                      <TableHead className="text-right">Total Uses</TableHead>
                      <TableHead className="text-right">Unique Users</TableHead>
                      <TableHead className="text-right">Unique IPs</TableHead>
                      <TableHead>Top Tool</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {countryStats.countries.slice(0, 20).map((country) => {
                      const topTool = countryStats.tool_by_country[country.country_code]
                        ? Object.entries(countryStats.tool_by_country[country.country_code])
                          .sort(([, a], [, b]) => b - a)[0]
                        : null;
                      return (
                        <TableRow key={country.country_code}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-lg">
                                {getFlagEmoji(country.country_code)}
                              </span>
                              <div>
                                <p className="font-medium">{country.country_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {country.country_code}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {country.total_uses.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {country.unique_users}
                          </TableCell>
                          <TableCell className="text-right">
                            {country.unique_ips}
                          </TableCell>
                          <TableCell>
                            {topTool && (
                              <span className="capitalize text-sm">
                                {topTool[0]} ({topTool[1]})
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No country data available. Country tracking starts with new tool usage.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Filtered Tab */}
        <TabsContent value="filtered">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle>Filtered Tool Analysis</CardTitle>
                  <CardDescription>
                    Apply filters to analyze specific segments
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="User Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="registered">Registered</SelectItem>
                      <SelectItem value="anonymous">Anonymous</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {mostUsedTools?.tools && mostUsedTools.tools.length > 0 ? (
                <div>
                  <div className="mb-4 p-3 bg-muted rounded-lg">
                    <p className="text-sm">
                      <span className="font-medium">Active filters:</span>{" "}
                      {mostUsedTools.filters.user_type !== "all" && (
                        <span className="mr-2">User: {mostUsedTools.filters.user_type}</span>
                      )}
                      {mostUsedTools.filters.tier !== "all" && (
                        <span className="mr-2">Tier: {mostUsedTools.filters.tier}</span>
                      )}
                      {mostUsedTools.filters.country && (
                        <span>Country: {mostUsedTools.filters.country}</span>
                      )}
                      {mostUsedTools.filters.user_type === "all" &&
                        mostUsedTools.filters.tier === "all" &&
                        !mostUsedTools.filters.country && (
                          <span className="text-muted-foreground">None</span>
                        )}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Total uses: {mostUsedTools.total_uses.toLocaleString()}
                    </p>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rank</TableHead>
                        <TableHead>Tool</TableHead>
                        <TableHead className="text-right">Total Uses</TableHead>
                        <TableHead className="text-right">Unique Users</TableHead>
                        <TableHead className="text-right">Unique IPs</TableHead>
                        <TableHead className="text-right">% of Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mostUsedTools.tools.map((tool, index) => (
                        <TableRow key={tool.tool}>
                          <TableCell className="font-medium">#{index + 1}</TableCell>
                          <TableCell className="capitalize font-medium">
                            {tool.tool}
                          </TableCell>
                          <TableCell className="text-right">
                            {tool.total_uses.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {tool.unique_users}
                          </TableCell>
                          <TableCell className="text-right">
                            {tool.unique_ips}
                          </TableCell>
                          <TableCell className="text-right">
                            {((tool.total_uses / mostUsedTools.total_uses) * 100).toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No data matching the current filters
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
