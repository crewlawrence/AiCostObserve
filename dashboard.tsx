import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Clock,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { MetricCard } from "@/components/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useWebSocketLogs } from "@/hooks/use-websocket-logs";
import type { TelemetryLog } from "@shared/schema";

export default function Dashboard() {
  const workspaceId = localStorage.getItem("currentWorkspaceId");

  // Connect to WebSocket for real-time updates
  useWebSocketLogs(workspaceId, !!workspaceId);

  const { data: logs, isLoading } = useQuery<TelemetryLog[]>({
    queryKey: ["/api/telemetry", { workspaceId }],
    enabled: !!workspaceId,
  });

  // Calculate metrics
  const totalRequests = logs?.length || 0;
  const avgLatency = logs?.length
    ? Math.round(logs.reduce((sum, log) => sum + log.latencyMs, 0) / logs.length)
    : 0;
  const totalCost = logs?.length
    ? logs.reduce((sum, log) => sum + parseFloat(log.cost), 0).toFixed(4)
    : "0.0000";
  const totalTokens = logs?.length
    ? logs.reduce((sum, log) => sum + log.totalTokens, 0)
    : 0;

  // Prepare chart data (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split("T")[0];
  });

  const requestsByDay = last7Days.map((date) => ({
    date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    requests: logs?.filter((log) => log.timestamp.toString().startsWith(date)).length || 0,
  }));

  const costByDay = last7Days.map((date) => ({
    date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    cost: parseFloat(
      logs
        ?.filter((log) => log.timestamp.toString().startsWith(date))
        .reduce((sum, log) => sum + parseFloat(log.cost), 0)
        .toFixed(4) || "0"
    ),
  }));

  if (!workspaceId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">No workspace selected</h2>
          <p className="text-muted-foreground">
            Please select or create a workspace to view your dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground">
          Monitor your AI application performance and costs.
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Requests"
          value={totalRequests.toLocaleString()}
          description="All-time requests"
          icon={Activity}
          isLoading={isLoading}
        />
        <MetricCard
          title="Avg Latency"
          value={`${avgLatency}ms`}
          description="Response time"
          icon={Clock}
          isLoading={isLoading}
        />
        <MetricCard
          title="Total Cost"
          value={`$${totalCost}`}
          description="All-time spend"
          icon={DollarSign}
          isLoading={isLoading}
        />
        <MetricCard
          title="Total Tokens"
          value={totalTokens.toLocaleString()}
          description="Tokens processed"
          icon={TrendingUp}
          isLoading={isLoading}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Requests (Last 7 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={requestsByDay}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="requests"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cost (Last 7 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={costByDay}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="cost"
                  stroke="hsl(var(--chart-2))"
                  fill="hsl(var(--chart-2))"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : logs && logs.length > 0 ? (
            <div className="space-y-2">
              {logs.slice(0, 10).map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 rounded-md border hover-elevate"
                  data-testid={`log-item-${log.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-muted-foreground">
                        {log.model}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm truncate mt-1">{log.prompt}</p>
                  </div>
                  <div className="flex items-center gap-4 ml-4">
                    <div className="text-right">
                      <div className="text-sm font-medium">{log.latencyMs}ms</div>
                      <div className="text-xs text-muted-foreground">
                        ${parseFloat(log.cost).toFixed(4)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No activity yet</h3>
              <p className="text-sm text-muted-foreground">
                Start sending telemetry data from your application to see activity here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
