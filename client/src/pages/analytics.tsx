import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { MetricCard } from "@/components/metric-card";
import { DollarSign, Activity, Clock, Zap } from "lucide-react";
import type { TelemetryLog } from "@shared/schema";

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function Analytics() {
  const workspaceId = localStorage.getItem("currentWorkspaceId");
  const [timeRange] = useState("7d");

  const { data: logs, isLoading } = useQuery<TelemetryLog[]>({
    queryKey: ["/api/telemetry", { workspaceId }],
    enabled: !!workspaceId,
  });

  // Calculate metrics
  const totalCost = logs?.reduce((sum, log) => sum + parseFloat(log.cost), 0) || 0;
  const avgLatency = logs?.length
    ? logs.reduce((sum, log) => sum + log.latencyMs, 0) / logs.length
    : 0;
  const totalRequests = logs?.length || 0;
  const avgTokensPerRequest = logs?.length
    ? logs.reduce((sum, log) => sum + log.totalTokens, 0) / logs.length
    : 0;

  // Cost by model
  const costByModel = logs?.reduce((acc, log) => {
    const existing = acc.find((item) => item.model === log.model);
    if (existing) {
      existing.cost += parseFloat(log.cost);
      existing.requests += 1;
    } else {
      acc.push({
        model: log.model,
        cost: parseFloat(log.cost),
        requests: 1,
      });
    }
    return acc;
  }, [] as { model: string; cost: number; requests: number }[]) || [];

  // Usage by model (for pie chart)
  const usageByModel = costByModel.map((item) => ({
    name: item.model,
    value: item.requests,
  }));

  // Latency distribution
  const latencyBuckets = [
    { range: "0-100ms", count: 0 },
    { range: "100-500ms", count: 0 },
    { range: "500ms-1s", count: 0 },
    { range: "1s-2s", count: 0 },
    { range: "2s+", count: 0 },
  ];

  logs?.forEach((log) => {
    if (log.latencyMs < 100) latencyBuckets[0].count++;
    else if (log.latencyMs < 500) latencyBuckets[1].count++;
    else if (log.latencyMs < 1000) latencyBuckets[2].count++;
    else if (log.latencyMs < 2000) latencyBuckets[3].count++;
    else latencyBuckets[4].count++;
  });

  if (!workspaceId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">No workspace selected</h2>
          <p className="text-muted-foreground">
            Please select or create a workspace to view analytics.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Deep insights into your AI application performance and costs.
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="costs" data-testid="tab-costs">Costs</TabsTrigger>
          <TabsTrigger value="performance" data-testid="tab-performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Summary Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total Cost"
              value={`$${totalCost.toFixed(4)}`}
              description={`Last ${timeRange}`}
              icon={DollarSign}
              isLoading={isLoading}
            />
            <MetricCard
              title="Requests"
              value={totalRequests.toLocaleString()}
              description={`Last ${timeRange}`}
              icon={Activity}
              isLoading={isLoading}
            />
            <MetricCard
              title="Avg Latency"
              value={`${Math.round(avgLatency)}ms`}
              description={`Last ${timeRange}`}
              icon={Clock}
              isLoading={isLoading}
            />
            <MetricCard
              title="Avg Tokens"
              value={Math.round(avgTokensPerRequest).toLocaleString()}
              description="Per request"
              icon={Zap}
              isLoading={isLoading}
            />
          </div>

          {/* Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Usage by Model</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={usageByModel}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {usageByModel.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Latency Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={latencyBuckets}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="range"
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
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="costs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cost by Model</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={costByModel} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    type="number"
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    type="category"
                    dataKey="model"
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    width={120}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.5rem",
                    }}
                    formatter={(value: number) => [`$${value.toFixed(4)}`, "Cost"]}
                  />
                  <Bar dataKey="cost" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cost Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {costByModel.map((item, index) => (
                  <div key={item.model} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-3 w-3 rounded-sm"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="font-mono text-sm">{item.model}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">${item.cost.toFixed(4)}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.requests} {item.requests === 1 ? "request" : "requests"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Latency by Model</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={costByModel.map((item) => {
                    const modelLogs = logs?.filter((log) => log.model === item.model) || [];
                    const avgLatency = modelLogs.length
                      ? modelLogs.reduce((sum, log) => sum + log.latencyMs, 0) / modelLogs.length
                      : 0;
                    return {
                      model: item.model,
                      latency: Math.round(avgLatency),
                    };
                  })}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    type="number"
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    type="category"
                    dataKey="model"
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    width={120}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.5rem",
                    }}
                    formatter={(value: number) => [`${value}ms`, "Avg Latency"]}
                  />
                  <Bar dataKey="latency" fill="hsl(var(--chart-3))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
