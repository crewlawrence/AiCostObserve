import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Copy, Filter, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useWebSocketLogs } from "@/hooks/use-websocket-logs";
import type { TelemetryLog, Project } from "@shared/schema";

export default function Logs() {
  const workspaceId = localStorage.getItem("currentWorkspaceId");
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  // Connect to WebSocket for real-time log updates
  const { isConnected } = useWebSocketLogs(workspaceId, true);

  const { data: logs, isLoading } = useQuery<TelemetryLog[]>({
    queryKey: ["/api/telemetry", { workspaceId }],
    enabled: !!workspaceId,
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects", { workspaceId }],
    enabled: !!workspaceId,
  });

  // Advanced search query parser with proper precedence
  const parseSearchQuery = (query: string, log: TelemetryLog): boolean => {
    if (!query.trim()) return true;

    // Normalize query by adding spaces around boolean operators
    let normalizedQuery = query.trim();
    normalizedQuery = normalizedQuery.replace(/\b(and|or|not)\b/gi, ' $1 ');
    normalizedQuery = normalizedQuery.replace(/\s+/g, ' '); // Collapse multiple spaces

    const originalQuery = normalizedQuery;
    const lowerQuery = originalQuery.toLowerCase();

    // Boolean OR has lowest precedence - split on OR first (handle multiple spaces)
    if (/\s+or\s+/i.test(lowerQuery)) {
      const terms = originalQuery.split(/\s+or\s+/i);
      return terms.some(term => parseSearchQuery(term.trim(), log));
    }

    // Boolean AND has higher precedence (handle multiple spaces)
    if (/\s+and\s+/i.test(lowerQuery)) {
      const terms = originalQuery.split(/\s+and\s+/i);
      return terms.every(term => parseSearchQuery(term.trim(), log));
    }

    // Boolean NOT operator: NOT term (handle multiple spaces)
    if (/^not\s+/i.test(lowerQuery)) {
      const term = originalQuery.replace(/^not\s+/i, '').trim();
      return !parseSearchQuery(term, log);
    }

    // Field-specific search: field:value
    const fieldMatch = originalQuery.match(/^(\w+):(.+)$/);
    if (fieldMatch) {
      const [, field, value] = fieldMatch;
      
      // Field name mapping for camelCase fields
      const fieldMap: Record<string, string> = {
        'projectid': 'projectId',
        'workspaceid': 'workspaceId',
        'latencyms': 'latencyMs',
        'prompttokens': 'promptTokens',
        'completiontokens': 'completionTokens',
        'totaltokens': 'totalTokens',
      };
      
      const normalizedField = fieldMap[field.toLowerCase()] || field;
      const fieldValue = String((log as any)[normalizedField] || "").toLowerCase();
      return fieldValue.includes(value.toLowerCase().trim());
    }

    // Default: search across prompt, response, and model
    const searchableText = `${log.prompt} ${log.response} ${log.model}`.toLowerCase();
    return searchableText.includes(lowerQuery);
  };

  // Filter logs
  const filteredLogs = logs?.filter((log) => {
    const matchesProject = selectedProject === "all" || log.projectId === selectedProject;
    const matchesEnvironment = selectedEnvironment === "all" || log.environment === selectedEnvironment;
    const matchesSearch = parseSearchQuery(searchQuery, log);
    return matchesProject && matchesEnvironment && matchesSearch;
  }) || [];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Content has been copied to your clipboard.",
    });
  };

  const handleExport = async (format: "json" | "csv") => {
    if (!workspaceId) return;

    const params = new URLSearchParams({
      workspaceId,
      format,
    });

    if (selectedProject !== "all") {
      params.append("projectId", selectedProject);
    }
    if (selectedEnvironment !== "all") {
      params.append("environment", selectedEnvironment);
    }

    const url = `/api/telemetry/export?${params.toString()}`;
    window.open(url, "_blank");

    toast({
      title: "Export started",
      description: `Downloading logs as ${format.toUpperCase()}...`,
    });
  };

  if (!workspaceId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">No workspace selected</h2>
          <p className="text-muted-foreground">
            Please select or create a workspace to view logs.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Logs</h1>
          <p className="text-muted-foreground">
            Real-time telemetry from your AI applications.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1" data-testid="badge-live-status">
            <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            {isConnected ? 'Live' : 'Connecting...'}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("json")}
            data-testid="button-export-json"
          >
            <Download className="h-4 w-4 mr-1" />
            Export JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("csv")}
            data-testid="button-export-csv"
          >
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Filters</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Project</label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger data-testid="select-project">
                  <SelectValue placeholder="All projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All projects</SelectItem>
                  {projects?.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Environment</label>
              <Select value={selectedEnvironment} onValueChange={setSelectedEnvironment}>
                <SelectTrigger data-testid="select-environment">
                  <SelectValue placeholder="All environments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All environments</SelectItem>
                  <SelectItem value="development">Development</SelectItem>
                  <SelectItem value="staging">Staging</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <div className="space-y-2">
                <Input
                  placeholder="Search logs... (try: model:gpt-4, prompt AND error, NOT success)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search-logs"
                />
                <p className="text-xs text-muted-foreground">
                  Examples: <code className="bg-muted px-1 rounded">model:gpt-4</code>, <code className="bg-muted px-1 rounded">error AND timeout</code>, <code className="bg-muted px-1 rounded">NOT success</code>
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading logs...</div>
          ) : filteredLogs.length > 0 ? (
            <div className="divide-y">
              {filteredLogs.map((log) => (
                <div key={log.id} className="hover-elevate" data-testid={`log-row-${log.id}`}>
                  <div
                    className="flex items-center gap-4 p-4 cursor-pointer"
                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      data-testid={`button-expand-${log.id}`}
                    >
                      {expandedLog === log.id ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-4 min-w-0">
                      <div className="md:col-span-2">
                        <div className="text-xs text-muted-foreground mb-1">
                          {new Date(log.timestamp).toLocaleString()}
                        </div>
                        <div className="font-mono text-sm">{log.model}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Environment</div>
                        <Badge variant="secondary" className="text-xs">
                          {log.environment}
                        </Badge>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Latency</div>
                        <div className="text-sm font-medium">{log.latencyMs}ms</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Tokens</div>
                        <div className="text-sm font-medium">{log.totalTokens.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Cost</div>
                        <div className="text-sm font-medium">${parseFloat(log.cost).toFixed(4)}</div>
                      </div>
                    </div>
                  </div>

                  {expandedLog === log.id && (
                    <div className="px-4 pb-4 space-y-4 border-t bg-muted/20">
                      <div className="pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold">Prompt</h4>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(log.prompt);
                            }}
                            data-testid={`button-copy-prompt-${log.id}`}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="bg-background rounded-md p-3 font-mono text-sm border">
                          {log.prompt}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold">Response</h4>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(log.response);
                            }}
                            data-testid={`button-copy-response-${log.id}`}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="bg-background rounded-md p-3 font-mono text-sm border max-h-64 overflow-y-auto">
                          {log.response}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Prompt Tokens</div>
                          <div className="text-sm font-medium">{log.promptTokens}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Completion Tokens</div>
                          <div className="text-sm font-medium">{log.completionTokens}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Status</div>
                          <Badge variant={log.status === "success" ? "default" : "destructive"}>
                            {log.status}
                          </Badge>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Log ID</div>
                          <div className="text-xs font-mono truncate">{log.id}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <h3 className="text-lg font-semibold mb-2">No logs found</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery || selectedProject !== "all" || selectedEnvironment !== "all"
                  ? "Try adjusting your filters."
                  : "Start sending telemetry data to see logs here."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {filteredLogs.length > 0 && (
        <div className="text-sm text-muted-foreground text-center">
          Showing {filteredLogs.length} {filteredLogs.length === 1 ? "log" : "logs"}
        </div>
      )}
    </div>
  );
}
