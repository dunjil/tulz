"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Activity,
  Globe,
  UserCheck,
  Calendar,
  BarChart3,
  Eye,
  MousePointerClick,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

interface OverviewStats {
  users: {
    total: number;
    new_today: number;
    new_this_week: number;
    new_this_month: number;
  };
  usage: {
    today: number;
    this_month: number;
    most_used_tool: string;
  };
  visits: {
    total: number;
    today: number;
    this_week: number;
    this_month: number;
    unique_today: number;
  };
}

interface ToolStats {
  period_days: number;
  by_tool: Record<string, number>;
  success_rate: number;
  avg_processing_time_ms: number;
  total_uses: number;
}

interface UsageTrend {
  period_days: number;
  trend: { date: string; count: number }[];
}

interface VisitTrend {
  period_days: number;
  trend: { date: string; visits: number; unique_visitors: number }[];
  top_pages: { path: string; count: number }[];
}

// ─── Skeleton helpers ────────────────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20 mb-1" />
        <Skeleton className="h-3 w-36" />
      </CardContent>
    </Card>
  );
}

function ChartSkeleton({ height = 300 }: { height?: number }) {
  return <Skeleton className="w-full rounded-lg" style={{ height }} />;
}

// ─── Stat card ───────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconClass = "text-primary",
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  iconClass?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={`p-2 rounded-full bg-muted ${iconClass}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const { data: overview, isLoading: overviewLoading } = useQuery<OverviewStats>({
    queryKey: ["admin", "stats", "overview"],
    queryFn: async () => (await api.get("/admin/stats/overview")).data,
    staleTime: 60_000,
  });

  const { data: toolStats, isLoading: toolLoading } = useQuery<ToolStats>({
    queryKey: ["admin", "stats", "tools"],
    queryFn: async () => (await api.get("/admin/stats/tools?days=30")).data,
    staleTime: 60_000,
  });

  const { data: usageTrend, isLoading: usageTrendLoading } = useQuery<UsageTrend>({
    queryKey: ["admin", "stats", "usage-trend"],
    queryFn: async () => (await api.get("/admin/stats/usage-trend?days=30")).data,
    staleTime: 60_000,
  });

  const { data: visitTrend, isLoading: visitTrendLoading } = useQuery<VisitTrend>({
    queryKey: ["admin", "stats", "visits"],
    queryFn: async () => (await api.get("/admin/stats/visits?days=30")).data,
    staleTime: 60_000,
  });

  // Merge visit + usage trend for the combined chart
  const combinedTrend = (() => {
    if (!usageTrend?.trend && !visitTrend?.trend) return [];
    const map: Record<string, { date: string; uses: number; visits: number; unique: number }> = {};
    usageTrend?.trend.forEach((d) => {
      map[d.date] = { date: d.date, uses: d.count, visits: 0, unique: 0 };
    });
    visitTrend?.trend.forEach((d) => {
      if (map[d.date]) {
        map[d.date].visits = d.visits;
        map[d.date].unique = d.unique_visitors;
      } else {
        map[d.date] = { date: d.date, uses: 0, visits: d.visits, unique: d.unique_visitors };
      }
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  })();

  const toolChartData = toolStats
    ? Object.entries(toolStats.by_tool)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
    : [];

  return (
    <div className="space-y-6">
      {/* ── Overview stat cards ── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {overviewLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              title="Total Users"
              value={overview?.users.total ?? 0}
              subtitle={`+${overview?.users.new_today ?? 0} today · +${overview?.users.new_this_week ?? 0} this week`}
              icon={Users}
            />
            <StatCard
              title="Total Visits"
              value={overview?.visits.total ?? 0}
              subtitle={`${overview?.visits.today ?? 0} today · ${overview?.visits.this_month ?? 0} this month`}
              icon={Eye}
            />
            <StatCard
              title="Unique Visitors Today"
              value={overview?.visits.unique_today ?? 0}
              subtitle={`${overview?.visits.this_week ?? 0} visits this week`}
              icon={MousePointerClick}
            />
            <StatCard
              title="Tool Uses Today"
              value={overview?.usage.today ?? 0}
              subtitle={`${overview?.usage.this_month ?? 0} this month`}
              icon={Activity}
            />
          </>
        )}
      </div>

      {/* ── Combined visits + usage trend ── */}
      <Card>
        <CardHeader>
          <CardTitle>Visits & Tool Usage — Last 30 Days</CardTitle>
          <CardDescription>Daily page visits vs tool uses</CardDescription>
        </CardHeader>
        <CardContent>
          {usageTrendLoading || visitTrendLoading ? (
            <ChartSkeleton height={300} />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={combinedTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => v.slice(5)}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="visits"
                  name="Page Visits"
                  stroke="#6366f1"
                  fill="#6366f133"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="unique"
                  name="Unique Visitors"
                  stroke="#8b5cf6"
                  fill="#8b5cf622"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="uses"
                  name="Tool Uses"
                  stroke="#10b981"
                  fill="#10b98122"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── Tool breakdown + Top pages ── */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Tool breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Tool Usage Breakdown</CardTitle>
            <CardDescription>
              {toolStats
                ? `${toolStats.total_uses.toLocaleString()} uses · ${toolStats.success_rate}% success · avg ${Math.round(toolStats.avg_processing_time_ms)}ms`
                : "Last 30 days"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {toolLoading ? (
              <ChartSkeleton height={260} />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={toolChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="Uses"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top pages */}
        <Card>
          <CardHeader>
            <CardTitle>Top Pages</CardTitle>
            <CardDescription>Most visited pages — last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {visitTrendLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-10" />
                  </div>
                ))}
              </div>
            ) : visitTrend?.top_pages.length ? (
              <div className="space-y-2">
                {visitTrend.top_pages.map((p, i) => (
                  <div key={p.path} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-muted-foreground w-5 text-right shrink-0">{i + 1}.</span>
                      <span className="font-mono truncate text-xs">{p.path}</span>
                    </div>
                    <span className="font-semibold shrink-0 ml-2">{p.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">No visit data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── New users trend ── */}
      <Card>
        <CardHeader>
          <CardTitle>New User Registrations</CardTitle>
          <CardDescription>
            {overview
              ? `+${overview.users.new_this_month} this month · +${overview.users.new_this_week} this week`
              : "Last 30 days"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {overviewLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-4 bg-muted/50 rounded-lg space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-7 w-12" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Today", value: overview?.users.new_today ?? 0, icon: Calendar },
                { label: "This Week", value: overview?.users.new_this_week ?? 0, icon: Calendar },
                { label: "This Month", value: overview?.users.new_this_month ?? 0, icon: UserCheck },
                { label: "All Time", value: overview?.users.total ?? 0, icon: Globe },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Icon className="h-3 w-3" />
                    {label}
                  </div>
                  <p className="text-2xl font-bold">{value.toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
