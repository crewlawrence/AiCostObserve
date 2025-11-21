import { useEffect, useRef, useState } from "react";
import { queryClient } from "@/lib/queryClient";
import type { TelemetryLog } from "@shared/schema";

async function fetchSocketToken(workspaceId: string): Promise<string> {
  // Get API key from localStorage for authentication
  const apiKey = localStorage.getItem(`apiKey_${workspaceId}`);
  
  if (!apiKey) {
    throw new Error("No API key found for workspace. Please create an API key first.");
  }

  const response = await fetch(`/api/workspaces/${workspaceId}/socket-token`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
    },
  });
  
  if (!response.ok) {
    throw new Error("Failed to fetch WebSocket token. Please check your API key.");
  }
  
  const data = await response.json();
  return data.token;
}

export function useWebSocketLogs(workspaceId: string | null, enabled: boolean = true) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!enabled || !workspaceId) {
      setIsConnected(false);
      return;
    }

    let mounted = true;

    async function connectWebSocket() {
      try {
        // Fetch signed token
        const token = await fetchSocketToken(workspaceId);

        if (!mounted) return;

        // Get WebSocket URL (convert http/https to ws/wss)
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws`;

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log("WebSocket connected, subscribing with token");
          // Subscribe to workspace with signed token
          ws.send(JSON.stringify({
            type: "subscribe",
            token: token,
          }));
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);

            if (message.type === "subscribed") {
              console.log("Successfully subscribed to workspace logs");
              if (mounted) setIsConnected(true);
            } else if (message.type === "error") {
              console.error("WebSocket error:", message.message);
              ws.close();
            } else if (message.type === "new_log" && message.data) {
              const newLog: TelemetryLog = message.data;

              // Update all telemetry queries in cache
              queryClient.setQueryData<TelemetryLog[]>(
                ["/api/telemetry", { workspaceId }],
                (oldLogs) => {
                  if (!oldLogs) return [newLog];
                  // Prepend new log to the beginning (most recent first)
                  return [newLog, ...oldLogs];
                }
              );
            }
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
          }
        };

        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          if (mounted) setIsConnected(false);
        };

        ws.onclose = () => {
          console.log("WebSocket disconnected");
          if (mounted) setIsConnected(false);
        };
      } catch (error) {
        console.error("Failed to create WebSocket connection:", error);
        if (mounted) setIsConnected(false);
      }
    }

    connectWebSocket();

    return () => {
      mounted = false;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
    };
  }, [workspaceId, enabled]);

  return {
    isConnected,
  };
}
