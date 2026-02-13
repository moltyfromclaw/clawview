import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { SpawnAgentModal } from "../components/SpawnAgentModal";
import { LandingPage } from "../components/LandingPage";
import {
  fetchRemoteDashboardData,
  type GatewayConfig,
} from "../lib/remote-gateway";

// Extended config for stats endpoint
interface AgentConfig extends GatewayConfig {
  useStatsEndpoint?: boolean;
}

// Check if running in SAAS mode (set via env var or query param for testing)
const isSaasMode = () => {
  if (typeof window !== "undefined") {
    // Check query param for testing
    const params = new URLSearchParams(window.location.search);
    if (params.get("saas") === "true") return true;
    if (params.get("saas") === "false") return false;

    // Subdomains like molty.viewholly.com go straight to dashboard
    const hostname = window.location.hostname;
    if (hostname.includes(".viewholly.com") && !hostname.startsWith("www.")) {
      return false; // Not SAAS mode - show dashboard
    }
  }
  // Check env var (set at build time or via Cloudflare)
  return (
    import.meta.env.VITE_SAAS_MODE === "true" ||
    import.meta.env.SAAS_MODE === "true"
  );
};

// Get gateway URL for subdomain (e.g., molty.viewholly.com -> Molty's gateway)
const getSubdomainGateway = (): {
  name: string;
  url: string;
  token?: string;
} | null => {
  if (typeof window === "undefined") return null;

  const hostname = window.location.hostname;
  const match = hostname.match(/^([^.]+)\.viewholly\.com$/);
  if (!match) return null;

  const subdomain = match[1];

  // Known agent gateways with their ClawView API URLs
  // Note: token should be the gateway password (OPENCLAW_GATEWAY_PASSWORD), not the config token
  const gateways: Record<
    string,
    { name: string; url: string; token?: string; apiUrl?: string }
  > = {
    molty: {
      name: "Molty",
      url: "https://ms-mac-mini.tail901772.ts.net",
      token: "", // Gateway password
      apiUrl: "http://100.115.232.19:3201", // Local ClawView API (Tailscale)
    },
  };

  return gateways[subdomain] || null;
};

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const [saasMode, setSaasMode] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setSaasMode(isSaasMode());
    setChecked(true);
  }, []);

  if (!checked) {
    return <div className="min-h-screen bg-gray-900" />; // Loading flash prevention
  }

  if (saasMode) {
    return <LandingPage />;
  }

  return <Dashboard />;
}

interface Agent {
  id: string;
  name: string;
  role: string;
  team: string;
  avatar: string;
  gatewayUrl: string;
  gatewayToken: string | null;
  status: "active" | "idle" | "offline";
  gatewayStatus: "online" | "offline" | "error";
  totalCost: number;
  taskCount: number;
  activeSessions: number;
}

interface Stats {
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalMessages: number;
  sessionCount: number;
  toolCalls: Record<string, number>;
  models: Record<string, number>;
}

interface DailySummary {
  date: string;
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  activityCount: number;
  toolCalls: Record<string, number>;
}

interface Task {
  id: string;
  sessionId: string;
  startTime: string;
  endTime: string;
  durationMs: number;
  summary: string;
  category: string;
  tags: string[];
  activityCount: number;
  toolsUsed: string[];
  cost: number;
  inputTokens: number;
  outputTokens: number;
  triggerType: string;
  triggerText?: string;
}

interface TaskStats {
  [category: string]: {
    count: number;
    totalCost: number;
    avgDuration: number;
  };
}

interface Insight {
  id: string;
  type: "optimization" | "anomaly" | "achievement" | "tip";
  severity: "info" | "warning" | "critical" | "success";
  title: string;
  description: string;
  metric?: string;
  savings?: number;
  category?: string;
}

// Shape returned by stats server GET / or GET /stats + GET /sessions
interface StatsApiSession {
  id?: string;
  sessionId?: string;
  firstTimestamp?: string;
  lastTimestamp?: string;
  messageCount?: number;
  tools?: Record<string, number>;
  cost?: number;
  inputTokens?: number;
  outputTokens?: number;
}
interface StatsApiResponse {
  stats?: Stats;
  sessions?: StatsApiSession[];
  dailySummaries?: DailySummary[];
}

interface EfficiencyScore {
  overall: number;
  breakdown: {
    category: string;
    score: number;
    avgCost: number;
    avgDuration: number;
    taskCount: number;
  }[];
}

function formatCost(cost: number): string {
  return `$${cost.toFixed(4)}`;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const categoryConfig: Record<
  string,
  { icon: string; label: string; color: string }
> = {
  communication: { icon: "💬", label: "Communication", color: "bg-blue-500" },
  research: { icon: "🔍", label: "Research", color: "bg-purple-500" },
  coding: { icon: "💻", label: "Coding", color: "bg-green-500" },
  file_management: {
    icon: "📁",
    label: "File Management",
    color: "bg-yellow-500",
  },
  monitoring: { icon: "📡", label: "Monitoring", color: "bg-gray-500" },
  scheduling: { icon: "⏰", label: "Scheduling", color: "bg-orange-500" },
  browser: { icon: "🌐", label: "Browser", color: "bg-cyan-500" },
  system: { icon: "⚙️", label: "System", color: "bg-red-500" },
  other: { icon: "📋", label: "Other", color: "bg-slate-500" },
};

const triggerConfig: Record<string, { icon: string; label: string }> = {
  user_message: { icon: "👤", label: "User" },
  heartbeat: { icon: "💓", label: "Heartbeat" },
  cron: { icon: "⏰", label: "Scheduled" },
  webhook: { icon: "🔗", label: "Webhook" },
  unknown: { icon: "❓", label: "Unknown" },
};

const insightConfig: Record<
  string,
  { icon: string; bgColor: string; borderColor: string }
> = {
  optimization: {
    icon: "💡",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30",
  },
  anomaly: {
    icon: "⚠️",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
  },
  achievement: {
    icon: "🏆",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
  },
  tip: {
    icon: "💭",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
  },
};

// Helper to categorize sessions based on tools used
function categorizeSession(session: {
  tools?: Record<string, number>;
}): string {
  const tools = Object.keys(session.tools || {}).map((t) => t.toLowerCase());

  if (tools.some((t) => t === "message")) return "communication";
  if (tools.some((t) => t === "web_search" || t === "web_fetch"))
    return "research";
  if (tools.some((t) => t === "browser")) return "browser";
  if (tools.some((t) => t === "cron")) return "scheduling";
  if (tools.some((t) => t === "gateway")) return "system";
  if (tools.some((t) => t === "write" || t === "edit")) return "coding";
  if (tools.some((t) => t === "read")) return "file_management";
  if (tools.some((t) => t === "exec")) return "monitoring";

  return "other";
}

function getToolIcon(toolName: string): string {
  const icons: Record<string, string> = {
    exec: "⚡",
    browser: "🌐",
    Read: "📖",
    Write: "✍️",
    Edit: "✏️",
    web_search: "🔍",
    web_fetch: "📥",
    message: "💬",
    cron: "⏰",
    memory_search: "🧠",
  };
  return icons[toolName] || "🔧";
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [dailySummaries, setDailySummaries] = useState<DailySummary[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskStats, setTaskStats] = useState<TaskStats | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [efficiencyScore, setEfficiencyScore] =
    useState<EfficiencyScore | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "tasks" | "insights" | "overview" | "daily" | "team"
  >("tasks");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showSpawnModal, setShowSpawnModal] = useState(false);
  const [remoteFetchError, setRemoteFetchError] = useState<string | null>(null);

  // Load agents from localStorage, subdomain gateway, and merge with API
  const loadAgentsWithLocalStorage = (apiAgents: Agent[]) => {
    try {
      const agents: Agent[] = [...apiAgents];

      // Add subdomain gateway if present (e.g., molty.viewholly.com)
      const subdomainGateway = getSubdomainGateway();
      if (subdomainGateway) {
        const exists = agents.some(
          (a) => a.gatewayUrl === subdomainGateway.url,
        );
        if (!exists) {
          agents.push({
            id: `subdomain-${subdomainGateway.name.toLowerCase()}`,
            name: subdomainGateway.name,
            role: "OpenClaw Agent",
            team: "Remote",
            avatar: "🦞",
            gatewayUrl: subdomainGateway.url,
            gatewayToken: subdomainGateway.token || null,
            status: "idle" as const,
            gatewayStatus: "offline" as const,
            totalCost: 0,
            taskCount: 0,
            activeSessions: 0,
          });
        }
      }

      // Add localStorage agents
      const stored = localStorage.getItem("clawview-agents");
      if (stored) {
        const localAgents = JSON.parse(stored);
        const remoteAgents: Agent[] = localAgents.map((a: any) => ({
          id: a.id,
          name: a.name,
          role: a.role || "Agent",
          team: a.team || "Remote",
          avatar: a.icon || "🤖",
          gatewayUrl: a.gatewayUrl,
          gatewayToken: a.gatewayToken,
          status: "idle" as const,
          gatewayStatus: "offline" as const,
          totalCost: 0,
          taskCount: 0,
          activeSessions: 0,
        }));
        agents.push(...remoteAgents);
      }

      return agents;
    } catch {
      return apiAgents;
    }
  };

  // Fetch status from a remote agent's gateway via WebSocket
  const fetchAgentStatus = async (agent: Agent): Promise<Partial<Agent>> => {
    return new Promise((resolve) => {
      try {
        let wsUrl = agent.gatewayUrl;
        if (wsUrl.startsWith("http://")) wsUrl = "ws://" + wsUrl.slice(7);
        else if (wsUrl.startsWith("https://"))
          wsUrl = "wss://" + wsUrl.slice(8);
        else if (!wsUrl.startsWith("ws://") && !wsUrl.startsWith("wss://"))
          wsUrl = "wss://" + wsUrl;
        wsUrl = wsUrl.replace(/\/$/, "") + "/ws";

        // Avoid mixed content: HTTPS pages cannot open ws:// connections
        if (
          typeof window !== "undefined" &&
          window.location.protocol === "https:" &&
          wsUrl.startsWith("ws://")
        ) {
          resolve({ gatewayStatus: "offline" });
          return;
        }

        const ws = new WebSocket(wsUrl);
        const timeout = setTimeout(() => {
          ws.close();
          resolve({ gatewayStatus: "offline" });
        }, 5000);

        ws.onopen = () => {
          // Send connect handshake
          ws.send(
            JSON.stringify({
              type: "req",
              id: "connect-1",
              method: "connect",
              params: {
                minProtocol: 1,
                maxProtocol: 1,
                client: {
                  id: "clawview",
                  version: "1.0.0",
                  platform: "web",
                  mode: "probe",
                },
                caps: [],
                role: "operator",
                scopes: ["operator.admin"],
                auth: agent.gatewayToken
                  ? { token: agent.gatewayToken }
                  : undefined,
              },
            }),
          );
        };

        ws.onmessage = (event) => {
          clearTimeout(timeout);
          try {
            const data = JSON.parse(event.data);
            if (data.type === "res" && data.ok) {
              // Connected! Now request status
              ws.send(
                JSON.stringify({
                  type: "req",
                  id: "status-1",
                  method: "status",
                  params: {},
                }),
              );
            } else if (data.id === "status-1" && data.type === "res") {
              ws.close();
              const status = data.payload || {};
              resolve({
                gatewayStatus: "online",
                status: status.sessions?.active > 0 ? "active" : "idle",
                activeSessions: status.sessions?.total || 0,
                taskCount: status.sessions?.total || 0,
              });
            } else if (
              data.type === "evt" &&
              data.event === "connect.challenge"
            ) {
              // Gateway is alive but needs device auth
              ws.close();
              resolve({ gatewayStatus: "online", status: "idle" });
            }
          } catch {
            ws.close();
            resolve({ gatewayStatus: "error" });
          }
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          resolve({ gatewayStatus: "offline" });
        };

        ws.onclose = () => clearTimeout(timeout);
      } catch {
        resolve({ gatewayStatus: "offline" });
      }
    });
  };

  // Update all agents with live status
  const refreshAgentStatuses = async (agentList: Agent[]) => {
    const updated = await Promise.all(
      agentList.map(async (agent) => {
        if (agent.gatewayUrl && agent.id !== "local") {
          const status = await fetchAgentStatus(agent);
          return { ...agent, ...status };
        }
        return agent;
      }),
    );
    setAgents(updated);
  };

  // Get the primary gateway to fetch data from (subdomain or first localStorage agent).
  // If an agent was added via setup or Add Agent with a gateway URL, use it (same as setup's Test Connection).
  const getPrimaryGateway = (): AgentConfig | null => {
    // Check subdomain gateway first
    const subdomainGateway = getSubdomainGateway();
    if (subdomainGateway) {
      return { url: subdomainGateway.url, token: subdomainGateway.token };
    }

    // Check localStorage agents: use first agent that has gatewayUrl.
    // Setup adds new agent at index 0 (unshift), so the one just added is primary.
    try {
      const stored = localStorage.getItem("clawview-agents");
      if (stored) {
        const localAgents = JSON.parse(stored);
        const agent = localAgents.find(
          (a: { gatewayUrl?: string }) => a && a.gatewayUrl
        );
        if (agent) {
          return {
            url: agent.gatewayUrl,
            token: agent.gatewayToken || undefined,
            useStatsEndpoint: agent.useStatsEndpoint === true,
          };
        }
      }
    } catch (e) {
      console.error("[ClawView] Error reading localStorage:", e);
    }

    return null;
  };

  useEffect(() => {
    async function fetchData() {
      setRemoteFetchError(null);
      // First, always load localStorage agents (works in SAAS/Workers mode)
      const localAgents = loadAgentsWithLocalStorage([]);
      setAgents(localAgents);

      // Refresh agent statuses via WebSocket
      if (localAgents.length > 0) {
        refreshAgentStatuses(localAgents);
      }

      // Check if we have a remote gateway to fetch from
      const primaryGateway = getPrimaryGateway();

      if (primaryGateway) {
        // SAAS mode: Fetch data from remote source
        try {
          let data;

          if (primaryGateway.useStatsEndpoint) {
            // Same as setup: try direct fetch first (works when same network or gateway allows CORS), then proxy.
            setRemoteFetchError(null);

            const base = (primaryGateway.url ?? "").replace(/\/$/, "");
            const baseUrl =
              base.startsWith("http://") || base.startsWith("https://")
                ? base
                : `http://${base}`;
            const headers: Record<string, string> = {
              "Content-Type": "application/json",
            };
            if (primaryGateway.token) {
              headers["Authorization"] = `Bearer ${primaryGateway.token}`;
            }

            const proxyPost = (path: string) =>
              fetch("/api/stats-proxy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  url: primaryGateway.url,
                  token: primaryGateway.token,
                  path,
                }),
              });

            let resStats: Response;
            let resSessions: Response;
            try {
              const [s, sess] = await Promise.all([
                fetch(`${baseUrl}/stats`, { headers }),
                fetch(`${baseUrl}/sessions`, { headers }),
              ]);
              if (s.ok) {
                resStats = s;
                resSessions = sess;
              } else {
                throw new Error("direct failed");
              }
            } catch {
              [resStats, resSessions] = await Promise.all([
                proxyPost("/stats"),
                proxyPost("/sessions"),
              ]);
            }

            if (!resStats.ok) {
              const errBody = await resStats.text();
              let errMessage = `Stats proxy failed: ${resStats.status}`;
              try {
                const p = JSON.parse(errBody);
                if (p.error) errMessage = p.error;
              } catch {
                if (errBody) errMessage = errBody;
              }
              setRemoteFetchError(errMessage);
              throw new Error(errMessage);
            }

            const statsJson = (await resStats.json()) as {
              stats?: Stats;
              totalCost?: number;
              sessionCount?: number;
              totalMessages?: number;
              toolCalls?: Record<string, number>;
              models?: Record<string, number>;
              totalInputTokens?: number;
              totalOutputTokens?: number;
              dailySummaries?: DailySummary[];
            };
            let sessionsList: StatsApiSession[] = [];
            if (resSessions.ok) {
              const raw = await resSessions.json();
              sessionsList = Array.isArray(raw)
                ? (raw as StatsApiSession[])
                : (raw && typeof raw === "object" && "sessions" in raw && Array.isArray((raw as { sessions: StatsApiSession[] }).sessions))
                  ? (raw as { sessions: StatsApiSession[] }).sessions
                  : [];
            }

            // GET /stats can return { stats: {...} } or flat { totalCost, sessionCount, ... }
            const statsObj: Stats | undefined =
              statsJson.stats ??
              (statsJson.totalCost !== undefined || statsJson.sessionCount !== undefined
                ? {
                    totalCost: statsJson.totalCost ?? 0,
                    totalInputTokens: statsJson.totalInputTokens ?? 0,
                    totalOutputTokens: statsJson.totalOutputTokens ?? 0,
                    totalMessages: statsJson.totalMessages ?? 0,
                    sessionCount: statsJson.sessionCount ?? 0,
                    toolCalls: statsJson.toolCalls ?? {},
                    models: statsJson.models ?? {},
                  }
                : undefined);

            const statsData: StatsApiResponse = {
              stats: statsObj,
              sessions: sessionsList,
              dailySummaries: statsJson.dailySummaries ?? [],
            };

            // Convert stats endpoint format to dashboard format
            data = {
              stats: statsData.stats || {
                totalCost: 0,
                totalInputTokens: 0,
                totalOutputTokens: 0,
                sessionCount: 0,
                totalMessages: 0,
                toolCalls: {},
                models: {},
              },
              dailySummaries: statsData.dailySummaries || [],
              sessions: statsData.sessions || [],
              tasks: [] as Task[], // Stats endpoint doesn't provide tasks, generate from sessions
              taskStats: {
                communication: { count: 0, totalCost: 0, avgDuration: 0 },
                research: { count: 0, totalCost: 0, avgDuration: 0 },
                coding: { count: 0, totalCost: 0, avgDuration: 0 },
                file_management: { count: 0, totalCost: 0, avgDuration: 0 },
                monitoring: { count: 0, totalCost: 0, avgDuration: 0 },
                scheduling: { count: 0, totalCost: 0, avgDuration: 0 },
                browser: { count: 0, totalCost: 0, avgDuration: 0 },
                system: { count: 0, totalCost: 0, avgDuration: 0 },
                other: { count: 0, totalCost: 0, avgDuration: 0 },
              },
            };

            // Generate tasks from sessions
            for (const session of statsData.sessions || []) {
              const category = categorizeSession(session);
              data.tasks.push({
                id: session.id ?? "",
                sessionId: session.sessionId || (session.id ?? ""),
                startTime: session.firstTimestamp || new Date().toISOString(),
                endTime: session.lastTimestamp || new Date().toISOString(),
                durationMs:
                  session.lastTimestamp && session.firstTimestamp
                    ? new Date(session.lastTimestamp).getTime() -
                      new Date(session.firstTimestamp).getTime()
                    : 0,
                summary: `Session: ${session.messageCount || 0} messages`,
                category,
                tags: Object.keys(session.tools || {}).slice(0, 3),
                activityCount: session.messageCount || 0,
                toolsUsed: Object.keys(session.tools || {}),
                cost: session.cost || 0,
                inputTokens: session.inputTokens || 0,
                outputTokens: session.outputTokens || 0,
                triggerType: "unknown",
              });

              // Update task stats
              if (data.taskStats[category]) {
                data.taskStats[category].count++;
                data.taskStats[category].totalCost += session.cost || 0;
              }
            }
          } else {
            // Use gateway proxy (sessions_list tool)
            data = await fetchRemoteDashboardData(primaryGateway);
          }

          setStats(data.stats);
          setDailySummaries(data.dailySummaries);
          setTasks(data.tasks);
          setTaskStats(data.taskStats);

          // Generate basic insights from remote data
          const remoteInsights: Insight[] = [];
          if (data.stats.totalCost > 1) {
            remoteInsights.push({
              id: "cost-alert",
              type: "tip",
              severity: "info",
              title: "Cost tracking active",
              description: `Total spend: $${data.stats.totalCost.toFixed(4)}`,
            });
          }
          setInsights(remoteInsights);

          // Calculate basic efficiency score
          const taskCount = data.tasks.length;
          if (taskCount > 0) {
            setEfficiencyScore({
              overall: Math.min(100, Math.round(70 + taskCount / 10)),
              breakdown: Object.entries(data.taskStats)
                .filter(([, s]) => s.count > 0)
                .map(([cat, s]) => ({
                  category: cat,
                  score: Math.min(100, Math.round(60 + s.count * 5)),
                  avgCost: s.totalCost / (s.count || 1),
                  avgDuration: s.avgDuration,
                  taskCount: s.count,
                })),
            });
          }

          setRemoteFetchError(null);
        } catch (error) {
          console.error("Failed to fetch from remote gateway:", error);
        } finally {
          setLoading(false);
        }
        return;
      }

      // Local mode: Fetch from local API endpoints
      try {
        const [statsRes, tasksRes, insightsRes, agentsRes] = await Promise.all([
          fetch("/api/stats"),
          fetch(`/api/tasks?limit=200&category=${selectedCategory}`),
          fetch("/api/insights"),
          fetch("/api/agents"),
        ]);

        // Only process if responses are ok
        if (statsRes.ok && tasksRes.ok && insightsRes.ok && agentsRes.ok) {
          const statsData = await statsRes.json();
          const tasksData = await tasksRes.json();
          const insightsData = await insightsRes.json();
          const agentsData = await agentsRes.json();

          setStats(statsData.stats);
          setDailySummaries(statsData.dailySummaries || []);
          setTasks(tasksData.tasks || []);
          setTaskStats(tasksData.stats || null);
          setInsights(insightsData.insights || []);
          setEfficiencyScore(insightsData.efficiencyScore || null);

          const mergedAgents = loadAgentsWithLocalStorage(
            agentsData.agents || [],
          );
          setAgents(mergedAgents);
          refreshAgentStatuses(mergedAgents);
        }
      } catch (error) {
        // In SAAS mode, API calls will fail - that's ok, we have localStorage agents
        console.log("API fetch failed (expected in SAAS mode):", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [selectedCategory]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-xl">Loading ClawView...</div>
      </div>
    );
  }

  const topCategories = taskStats
    ? Object.entries(taskStats)
        .filter(([, data]) => data.count > 0)
        .sort(([, a], [, b]) => b.count - a.count)
    : [];

  // In remote mode we fetch all tasks; filter by category in the UI. Local mode already gets filtered tasks from API.
  const displayedTasks =
    selectedCategory === "all"
      ? tasks
      : tasks.filter((t) => t.category === selectedCategory);

  const potentialSavings = insights
    .filter((i) => i.savings)
    .reduce((sum, i) => sum + (i.savings || 0), 0);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🦞</span>
              <div>
                <h1 className="text-lg font-semibold">ClawView</h1>
                <p className="text-xs text-gray-400">Agent Observability</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/office"
                className="px-2.5 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors"
              >
                🏢 Office
              </Link>
              <Link
                to="/setup"
                className="px-2.5 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors"
              >
                + Agent
              </Link>
              <Link
                to="/standup"
                className="px-2.5 py-1.5 text-xs bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors"
              >
                🎙️ Standup
              </Link>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                Live
              </span>
            </div>
          </div>
        </div>
      </header>

      {remoteFetchError && (
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div
            className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
            role="alert"
          >
            <strong>Remote gateway error:</strong> {remoteFetchError}
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="text-gray-400 text-sm mb-1">Total Spend</div>
            <div className="text-2xl font-bold text-green-400">
              {stats ? formatCost(stats.totalCost) : "-"}
            </div>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="text-gray-400 text-sm mb-1">Tasks</div>
            <div className="text-2xl font-bold">{tasks.length}</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="text-gray-400 text-sm mb-1">Efficiency</div>
            <div
              className={`text-2xl font-bold ${efficiencyScore ? getScoreColor(efficiencyScore.overall) : ""}`}
            >
              {efficiencyScore ? `${efficiencyScore.overall}%` : "-"}
            </div>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="text-gray-400 text-sm mb-1">Potential Savings</div>
            <div className="text-2xl font-bold text-yellow-400">
              {potentialSavings > 0 ? formatCost(potentialSavings) : "-"}
            </div>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="text-gray-400 text-sm mb-1">Insights</div>
            <div className="text-2xl font-bold text-blue-400">
              {insights.length}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(["tasks", "insights", "overview", "daily", "team"] as const).map(
            (tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {tab === "tasks" && "📋 Tasks"}
                {tab === "insights" && "💡 Insights"}
                {tab === "overview" && "📊 Overview"}
                {tab === "daily" && "📅 Daily"}
                {tab === "team" && "👥 Team"}
              </button>
            ),
          )}
        </div>

        {/* Insights Tab */}
        {activeTab === "insights" && (
          <div className="space-y-6">
            {efficiencyScore && (
              <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                <h2 className="text-lg font-semibold mb-4">Efficiency Score</h2>
                <div className="flex items-center gap-6 mb-6">
                  <div className="text-center">
                    <div
                      className={`text-3xl font-bold ${getScoreColor(efficiencyScore.overall)}`}
                    >
                      {efficiencyScore.overall}
                    </div>
                    <div className="text-gray-400 text-xs mt-1">
                      Overall Score
                    </div>
                  </div>
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {efficiencyScore.breakdown.slice(0, 4).map((item) => {
                      const config =
                        categoryConfig[item.category] || categoryConfig.other;
                      return (
                        <div
                          key={item.category}
                          className="bg-gray-800/50 rounded-lg p-3"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span>{config.icon}</span>
                            <span className="text-sm text-gray-400">
                              {config.label}
                            </span>
                          </div>
                          <div
                            className={`text-xl font-bold ${getScoreColor(item.score)}`}
                          >
                            {item.score}%
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {formatCost(item.avgCost)} avg •{" "}
                            {formatDuration(item.avgDuration)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <div className="p-4 border-b border-gray-800">
                <h2 className="text-lg font-semibold">Optimization Insights</h2>
              </div>
              <div className="divide-y divide-gray-800">
                {insights.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No insights yet. Keep using your agent to generate
                    recommendations.
                  </div>
                ) : (
                  insights.map((insight) => {
                    const config =
                      insightConfig[insight.type] || insightConfig.tip;
                    return (
                      <div
                        key={insight.id}
                        className={`p-3 ${config.bgColor} border-l-2 ${config.borderColor}`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-base">{config.icon}</span>
                          <div className="flex-1">
                            <h3 className="font-semibold">{insight.title}</h3>
                            <p className="text-gray-400 text-sm mt-1">
                              {insight.description}
                            </p>
                            <div className="flex items-center gap-4 mt-2">
                              {insight.metric && (
                                <span className="text-xs bg-gray-800 px-2 py-1 rounded">
                                  {insight.metric}
                                </span>
                              )}
                              {insight.savings && (
                                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                                  Save {formatCost(insight.savings)}
                                </span>
                              )}
                              {insight.category && (
                                <span className="text-xs bg-gray-800 px-2 py-1 rounded">
                                  {categoryConfig[insight.category]?.icon}{" "}
                                  {categoryConfig[insight.category]?.label}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === "tasks" && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2 bg-gray-900 rounded-xl p-6 border border-gray-800">
                <h2 className="text-lg font-semibold mb-4">Task Categories</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => setSelectedCategory("all")}
                    className={`p-2.5 rounded-lg border transition-colors text-left ${
                      selectedCategory === "all"
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-gray-700 hover:border-gray-600"
                    }`}
                  >
                    <div className="text-base mb-0.5">📊</div>
                    <div className="text-sm font-medium">All Tasks</div>
                    <div className="text-xs text-gray-400">
                      {tasks.length} total
                    </div>
                  </button>
                  {topCategories.slice(0, 5).map(([cat, data]) => {
                    const config = categoryConfig[cat] || categoryConfig.other;
                    return (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`p-2.5 rounded-lg border transition-colors text-left ${
                          selectedCategory === cat
                            ? "border-blue-500 bg-blue-500/10"
                            : "border-gray-700 hover:border-gray-600"
                        }`}
                      >
                        <div className="text-base mb-0.5">{config.icon}</div>
                        <div className="text-sm font-medium">
                          {config.label}
                        </div>
                        <div className="text-xs text-gray-400">
                          {data.count} tasks • {formatCost(data.totalCost)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                <h2 className="text-lg font-semibold mb-4">Avg. by Category</h2>
                <div className="space-y-3">
                  {topCategories.slice(0, 5).map(([cat, data]) => {
                    const config = categoryConfig[cat] || categoryConfig.other;
                    return (
                      <div
                        key={cat}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span>{config.icon}</span>
                          <span className="text-sm">{config.label}</span>
                        </div>
                        <div className="text-sm text-gray-400">
                          {formatDuration(data.avgDuration)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Recent Tasks</h2>
                <span className="text-sm text-gray-400">
                  {displayedTasks.length} tasks
                </span>
              </div>
              <div className="divide-y divide-gray-800 max-h-[600px] overflow-y-auto">
                {displayedTasks.map((task) => {
                  const catConfig =
                    categoryConfig[task.category] || categoryConfig.other;
                  const trigConfig =
                    triggerConfig[task.triggerType] || triggerConfig.unknown;

                  return (
                    <Link
                      key={task.id}
                      to="/tasks/$taskId"
                      params={{ taskId: task.id }}
                      className="block p-4 hover:bg-gray-800/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-10 h-10 rounded-lg ${catConfig.color}/20 flex items-center justify-center text-xl shrink-0`}
                        >
                          {catConfig.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="font-medium text-white">
                                {task.summary}
                              </h3>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span
                                  className={`px-2 py-0.5 rounded text-xs ${catConfig.color}/20 text-white`}
                                >
                                  {catConfig.label}
                                </span>
                                <span className="px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300">
                                  {trigConfig.icon} {trigConfig.label}
                                </span>
                                {task.tags.slice(0, 3).map((tag) => (
                                  <span
                                    key={tag}
                                    className="px-2 py-0.5 rounded text-xs bg-gray-800 text-gray-400"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-sm text-gray-400">
                                {formatDate(task.startTime)}
                              </div>
                              <div className="text-green-400 text-sm">
                                {formatCost(task.cost)}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                            <span>⏱️ {formatDuration(task.durationMs)}</span>
                            <span>📊 {task.activityCount} activities</span>
                            <span className="flex items-center gap-1">
                              {task.toolsUsed.slice(0, 3).map((tool) => (
                                <span
                                  key={tool}
                                  className="px-1.5 py-0.5 bg-gray-800 rounded"
                                >
                                  {getToolIcon(tool)}
                                </span>
                              ))}
                              {task.toolsUsed.length > 3 && (
                                <span className="text-gray-600">
                                  +{task.toolsUsed.length - 3}
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h2 className="text-lg font-semibold mb-4">Top Tools Used</h2>
              <div className="space-y-3">
                {stats?.toolCalls &&
                  Object.entries(stats.toolCalls)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 10)
                    .map(([tool, count]) => (
                      <div key={tool} className="flex items-center gap-3">
                        <span className="text-xl">{getToolIcon(tool)}</span>
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="font-mono text-sm">{tool}</span>
                            <span className="text-gray-400 text-sm">
                              {count}
                            </span>
                          </div>
                          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{
                                width: `${(count / Object.values(stats.toolCalls)[0]) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
              </div>
            </div>
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h2 className="text-lg font-semibold mb-4">Models</h2>
              <div className="space-y-3">
                {stats?.models &&
                  Object.entries(stats.models)
                    .sort(([, a], [, b]) => b - a)
                    .map(([model, count]) => (
                      <div
                        key={model}
                        className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
                      >
                        <span className="font-mono text-sm">{model}</span>
                        <span className="text-gray-400">{count} calls</span>
                      </div>
                    ))}
              </div>
            </div>
          </div>
        )}

        {/* Daily Tab */}
        {activeTab === "daily" && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <div className="p-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold">Daily Breakdown</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="text-left p-4 text-gray-400 font-medium">
                      Date
                    </th>
                    <th className="text-right p-4 text-gray-400 font-medium">
                      Cost
                    </th>
                    <th className="text-right p-4 text-gray-400 font-medium">
                      Input
                    </th>
                    <th className="text-right p-4 text-gray-400 font-medium">
                      Output
                    </th>
                    <th className="text-right p-4 text-gray-400 font-medium">
                      Activities
                    </th>
                    <th className="text-left p-4 text-gray-400 font-medium">
                      Top Tools
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {dailySummaries.map((day) => (
                    <tr key={day.date} className="hover:bg-gray-800/50">
                      <td className="p-4 font-medium">{day.date}</td>
                      <td className="p-4 text-right text-green-400">
                        {formatCost(day.totalCost)}
                      </td>
                      <td className="p-4 text-right text-blue-400">
                        {formatNumber(day.totalInputTokens)}
                      </td>
                      <td className="p-4 text-right text-purple-400">
                        {formatNumber(day.totalOutputTokens)}
                      </td>
                      <td className="p-4 text-right">{day.activityCount}</td>
                      <td className="p-4">
                        <div className="flex gap-1 flex-wrap">
                          {Object.entries(day.toolCalls)
                            .sort(([, a], [, b]) => b - a)
                            .slice(0, 3)
                            .map(([tool, count]) => (
                              <span
                                key={tool}
                                className="px-2 py-0.5 bg-gray-800 rounded text-xs"
                              >
                                {getToolIcon(tool)} {count}
                              </span>
                            ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Team Tab */}
        {activeTab === "team" && (
          <div className="space-y-8">
            {/* Agents Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <span>🖥️</span> Agents
                  </h2>
                  <p className="text-gray-400 text-sm">
                    Persistent OpenClaw gateways
                  </p>
                </div>
                {agents.length > 0 && (
                  <Link
                    to="/setup"
                    className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    ➕ Add Agent
                  </Link>
                )}
              </div>

              {agents.length === 0 ? (
                <Link
                  to="/setup"
                  className="w-full bg-gray-900/50 rounded-lg border border-dashed border-gray-700 p-6 text-center hover:border-gray-600 hover:bg-gray-900 transition-all group block"
                >
                  <div className="text-2xl mb-2">🖥️</div>
                  <h3 className="text-sm font-medium text-gray-300 mb-1">
                    No agents connected
                  </h3>
                  <p className="text-gray-500 text-xs mb-2">
                    Connect your OpenClaw gateways to monitor them here
                  </p>
                  <span className="inline-flex items-center gap-1 text-blue-400 text-xs font-medium">
                    + Add agent
                  </span>
                </Link>
              ) : (
                <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                  <div className="divide-y divide-gray-800">
                    {agents.map((agent) => (
                      <div
                        key={agent.id}
                        className="p-4 hover:bg-gray-800/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center text-base shrink-0">
                            {agent.avatar}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-white">
                                {agent.name}
                              </h4>
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                                  agent.gatewayStatus === "online"
                                    ? "bg-green-500/20 text-green-400"
                                    : agent.gatewayStatus === "error"
                                      ? "bg-red-500/20 text-red-400"
                                      : "bg-gray-500/20 text-gray-400"
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    agent.gatewayStatus === "online"
                                      ? "bg-green-400"
                                      : agent.gatewayStatus === "error"
                                        ? "bg-red-400"
                                        : "bg-gray-400"
                                  }`}
                                ></span>
                                {agent.gatewayStatus}
                              </span>
                              {agent.status === "active" && (
                                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-xs">
                                  active
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-400 mt-0.5">
                              {agent.role || "OpenClaw Gateway"}
                            </p>
                          </div>
                          <div className="text-right shrink-0 flex items-center gap-3">
                            <div>
                              <div className="text-sm text-gray-400">
                                {agent.taskCount} tasks
                              </div>
                              <div className="text-green-400 text-sm">
                                {formatCost(agent.totalCost)}
                              </div>
                            </div>
                            {agent.id !== "local" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(`Remove ${agent.name}?`)) {
                                    // Remove from localStorage
                                    try {
                                      const stored =
                                        localStorage.getItem("clawview-agents");
                                      if (stored) {
                                        const agents = JSON.parse(stored);
                                        const filtered = agents.filter(
                                          (a: any) => a.id !== agent.id,
                                        );
                                        localStorage.setItem(
                                          "clawview-agents",
                                          JSON.stringify(filtered),
                                        );
                                        // Reload to refresh
                                        window.location.reload();
                                      }
                                    } catch (err) {
                                      console.error(
                                        "Failed to remove agent:",
                                        err,
                                      );
                                    }
                                  }
                                }}
                                className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                title="Remove agent"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Contractors Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <span>🤖</span> Contractors
                  </h2>
                  <p className="text-gray-400 text-sm">
                    On-demand sub-agents for specific tasks
                  </p>
                </div>
              </div>

              {/* Empty state for contractors - always show since we don't track them yet */}
              <button
                onClick={() => setShowSpawnModal(true)}
                className="w-full bg-gray-900/50 rounded-lg border border-dashed border-gray-700 p-6 text-center hover:border-purple-600/50 hover:bg-gray-900 transition-all group"
              >
                <div className="text-2xl mb-2">🤖</div>
                <h3 className="text-sm font-medium text-gray-300 mb-1">
                  No contractors running
                </h3>
                <p className="text-gray-500 text-xs mb-2">
                  Spawn agents for tasks like research, coding, or lead gen
                </p>
                <span className="inline-flex items-center gap-1 text-purple-400 text-xs font-medium">
                  + Hire contractor
                </span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Spawn Agent Modal */}
      <SpawnAgentModal
        open={showSpawnModal}
        onOpenChange={setShowSpawnModal}
        onAgentSpawned={(sessionKey) => {
          console.log("Agent spawned:", sessionKey);
          fetch("/api/agents")
            .then((res) => res.json())
            .then((data) =>
              setAgents(loadAgentsWithLocalStorage(data.agents || [])),
            );
        }}
      />

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-12 py-6 text-center text-gray-500 text-sm">
        <p>ClawView — Agent Observability Platform</p>
        <p className="mt-1">
          <a
            href="https://github.com/moltyfromclaw/clawview"
            className="text-blue-400 hover:underline"
          >
            GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}
