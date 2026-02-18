import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import * as ClerkReact from "@clerk/tanstack-react-start";
import {
  Server,
  Plus,
  Play,
  Square,
  RotateCcw,
  Trash2,
  Camera,
  Cloud,
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ChevronDown,
  LogIn,
  MessageSquare,
} from "lucide-react";

// Check if Clerk is configured at runtime
const CLERK_ENABLED = typeof window !== 'undefined' 
  ? !!(window as any).__CLERK_PUBLISHABLE_KEY__ || !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
  : !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Safe Clerk hooks - return mock data when Clerk isn't configured
function useSafeAuth() {
  if (!CLERK_ENABLED) {
    return { isSignedIn: true, isLoaded: true };
  }
  try {
    return ClerkReact.useAuth();
  } catch {
    return { isSignedIn: true, isLoaded: true };
  }
}

function useSafeUser() {
  if (!CLERK_ENABLED) {
    return { user: null };
  }
  try {
    return ClerkReact.useUser();
  } catch {
    return { user: null };
  }
}

function SafeUserButton() {
  if (!CLERK_ENABLED) {
    return null;
  }
  try {
    return <ClerkReact.UserButton afterSignOutUrl="/" />;
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/instances")({
  component: InstancesPage,
});

const DEPLOY_API = "https://openclaw-deploy.holly-3f6.workers.dev";

interface Instance {
  id: string;
  name: string;
  status: string;
  ip: string | null;
  type: string;
  location: string;
  created: string;
  provider: string;
}

// Registry instance (from /registry API)
interface RegisteredInstance {
  id: string;
  name: string;
  gateway_url: string;
  gateway_token?: string;
  provider: string | null;
  provider_instance_id: string | null;
  region: string | null;
  tunnel_id: string | null;
  tunnel_url: string | null;
  email: string | null;
  status: string;
  last_seen_at: string | null;
  created_at: string;
  metadata: Record<string, any> | null;
}

interface CreateInstanceForm {
  name: string;
  provider: "aws" | "hetzner";
  serverType: string;
  location: string;
  installMode: "native" | "docker";
  anthropicKey: string;
  telegramBotToken: string;
  telegramOwnerId: string;
  sshPublicKey: string;
}

const SERVER_TYPES = {
  aws: [
    { value: "t3.micro", label: "t3.micro (2 vCPU, 1GB) ~$8/mo" },
    { value: "t3.small", label: "t3.small (2 vCPU, 2GB) ~$15/mo" },
    { value: "t3.medium", label: "t3.medium (2 vCPU, 4GB) ~$30/mo" },
    { value: "t3.large", label: "t3.large (2 vCPU, 8GB) ~$60/mo" },
  ],
  hetzner: [
    { value: "cx22", label: "cx22 (2 vCPU, 4GB) €4.51/mo" },
    { value: "cx32", label: "cx32 (4 vCPU, 8GB) €8.21/mo" },
    { value: "cx42", label: "cx42 (8 vCPU, 16GB) €15.61/mo" },
    { value: "cx52", label: "cx52 (16 vCPU, 32GB) €30.41/mo" },
  ],
};

const LOCATIONS = {
  aws: [
    { value: "us-east-1a", label: "US East (N. Virginia)" },
    { value: "us-west-2a", label: "US West (Oregon)" },
    { value: "eu-west-1a", label: "EU (Ireland)" },
  ],
  hetzner: [
    { value: "fsn1", label: "Falkenstein, Germany" },
    { value: "nbg1", label: "Nuremberg, Germany" },
    { value: "hel1", label: "Helsinki, Finland" },
    { value: "ash", label: "Ashburn, USA" },
  ],
};

function InstancesPage() {
  const { isSignedIn, isLoaded } = useSafeAuth();
  const { user } = useSafeUser();
  
  const [instances, setInstances] = useState<Instance[]>([]);
  const [registeredInstances, setRegisteredInstances] = useState<RegisteredInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"registry" | "provider">("registry");

  const [form, setForm] = useState<CreateInstanceForm>({
    name: "",
    provider: "aws",
    serverType: "t3.small",
    location: "us-east-1a",
    installMode: "native",
    anthropicKey: "",
    telegramBotToken: "",
    telegramOwnerId: "",
    sshPublicKey: "",
  });

  const fetchInstances = async () => {
    try {
      // Fetch from registry (primary source for observability)
      const registryRes = await fetch(`${DEPLOY_API}/registry`);
      if (registryRes.ok) {
        const data = await registryRes.json();
        setRegisteredInstances(data.instances || []);
      }

      // Also fetch from cloud providers for live status
      const [awsRes, hetznerRes] = await Promise.allSettled([
        fetch(`${DEPLOY_API}/instances?provider=aws`),
        fetch(`${DEPLOY_API}/instances?provider=hetzner`),
      ]);

      const allInstances: Instance[] = [];

      if (awsRes.status === "fulfilled" && awsRes.value.ok) {
        const data = await awsRes.value.json();
        allInstances.push(...(data.instances || []));
      }

      if (hetznerRes.status === "fulfilled" && hetznerRes.value.ok) {
        const data = await hetznerRes.value.json();
        allInstances.push(...(data.instances || []));
      }

      setInstances(allInstances);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch instances");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstances();
    const interval = setInterval(fetchInstances, 30000);
    return () => clearInterval(interval);
  }, []);

  const createInstance = async () => {
    setCreating(true);
    try {
      const res = await fetch(`${DEPLOY_API}/instances?provider=${form.provider}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          serverType: form.serverType,
          location: form.location,
          installMode: form.installMode,
          sshPublicKey: form.sshPublicKey,
          agentConfig: {
            anthropicKey: form.anthropicKey,
            telegramBotToken: form.telegramBotToken || undefined,
            telegramOwnerId: form.telegramOwnerId || undefined,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create instance");
      }

      setShowCreate(false);
      setForm({
        name: "",
        provider: "aws",
        serverType: "t3.small",
        location: "us-east-1a",
        installMode: "native",
        anthropicKey: "",
        telegramBotToken: "",
        telegramOwnerId: "",
        sshPublicKey: "",
      });
      fetchInstances();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create instance");
    } finally {
      setCreating(false);
    }
  };

  const instanceAction = async (id: string, action: string, provider: string) => {
    setActionLoading(`${id}-${action}`);
    try {
      const method = action === "delete" ? "DELETE" : "POST";
      const path = action === "delete" ? `/instances/${id}` : `/instances/${id}/${action}`;
      
      const res = await fetch(`${DEPLOY_API}${path}?provider=${provider}`, { method });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Failed to ${action} instance`);
      }

      fetchInstances();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} instance`);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "running":
      case "active":
        return "text-green-400";
      case "stopped":
      case "off":
        return "text-yellow-400";
      case "pending":
      case "starting":
        return "text-blue-400";
      default:
        return "text-gray-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case "running":
      case "active":
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case "stopped":
      case "off":
        return <Square className="w-4 h-4 text-yellow-400" />;
      case "pending":
      case "starting":
        return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
      default:
        return <XCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  // Show loading while Clerk initializes
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  // Redirect to sign-in if not authenticated
  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex flex-col items-center justify-center p-4">
        <Cloud className="w-16 h-16 text-purple-400 mb-6" />
        <h1 className="text-2xl font-bold mb-2">Instance Manager</h1>
        <p className="text-gray-400 mb-6">Sign in to manage your OpenClaw instances</p>
        <Link
          to="/sign-in"
          className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg transition"
        >
          <LogIn className="w-4 h-4" />
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800/50 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-gray-400 hover:text-white transition">
              ← Dashboard
            </Link>
            <div className="flex items-center gap-2">
              <Cloud className="w-6 h-6 text-purple-400" />
              <h1 className="text-xl font-bold">Instance Manager</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition"
            >
              <Plus className="w-4 h-4" />
              Deploy Instance
            </button>
            <SafeUserButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
            {error}
            <button onClick={() => setError(null)} className="ml-4 underline">
              Dismiss
            </button>
          </div>
        )}

        {/* View Toggle */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex bg-gray-800/50 rounded-lg p-1">
            <button
              onClick={() => setViewMode("registry")}
              className={`px-4 py-2 rounded-md text-sm transition ${
                viewMode === "registry"
                  ? "bg-purple-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Registry ({registeredInstances.length})
            </button>
            <button
              onClick={() => setViewMode("provider")}
              className={`px-4 py-2 rounded-md text-sm transition ${
                viewMode === "provider"
                  ? "bg-purple-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Cloud Providers ({instances.length})
            </button>
          </div>
          <button
            onClick={fetchInstances}
            className="p-2 text-gray-400 hover:text-white transition"
            title="Refresh"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Instance Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          </div>
        ) : viewMode === "registry" && registeredInstances.length === 0 ? (
          <div className="text-center py-20">
            <Server className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-400 mb-2">No registered instances</h2>
            <p className="text-gray-500 mb-6">Deploy your first OpenClaw instance to get started</p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg transition"
            >
              Deploy Instance
            </button>
          </div>
        ) : viewMode === "provider" && instances.length === 0 ? (
          <div className="text-center py-20">
            <Server className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-400 mb-2">No cloud instances</h2>
            <p className="text-gray-500 mb-6">Deploy your first OpenClaw instance to get started</p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg transition"
            >
              Deploy Instance
            </button>
          </div>
        ) : viewMode === "registry" ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {registeredInstances.map((instance) => (
              <div
                key={instance.id}
                className="bg-gray-900/50 border border-gray-800/50 rounded-xl p-5 hover:border-gray-700/50 transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{instance.name}</h3>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
                      {getStatusIcon(instance.status)}
                      <span className={getStatusColor(instance.status)}>
                        {instance.status}
                      </span>
                      {instance.provider && (
                        <>
                          <span className="text-gray-600">•</span>
                          <span className="uppercase text-xs font-medium px-2 py-0.5 bg-gray-800 rounded">
                            {instance.provider}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <Server className="w-5 h-5 text-gray-600" />
                </div>

                <div className="space-y-2 text-sm text-gray-400 mb-4">
                  <div className="flex justify-between">
                    <span>Gateway</span>
                    <a
                      href={instance.gateway_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-purple-400 hover:text-purple-300 flex items-center gap-1"
                    >
                      {instance.gateway_url.replace("https://", "").split("/")[0]}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  {instance.email && (
                    <div className="flex justify-between">
                      <span>Email</span>
                      <span className="text-gray-300">{instance.email}</span>
                    </div>
                  )}
                  {instance.region && (
                    <div className="flex justify-between">
                      <span>Region</span>
                      <span className="text-gray-300">{instance.region}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Last Seen</span>
                    <span className="text-gray-300">
                      {instance.last_seen_at
                        ? new Date(instance.last_seen_at).toLocaleString()
                        : "Never"}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-gray-800/50">
                  <a
                    href={instance.gateway_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open
                  </a>
                  <Link
                    to={`/chat/${instance.name}`}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Chat
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {instances.map((instance) => (
              <div
                key={`${instance.provider}-${instance.id}`}
                className="bg-gray-900/50 border border-gray-800/50 rounded-xl p-5 hover:border-gray-700/50 transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{instance.name}</h3>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
                      {getStatusIcon(instance.status)}
                      <span className={getStatusColor(instance.status)}>
                        {instance.status}
                      </span>
                      <span className="text-gray-600">•</span>
                      <span className="uppercase text-xs font-medium px-2 py-0.5 bg-gray-800 rounded">
                        {instance.provider}
                      </span>
                    </div>
                  </div>
                  <Server className="w-5 h-5 text-gray-600" />
                </div>

                <div className="space-y-2 text-sm text-gray-400 mb-4">
                  <div className="flex justify-between">
                    <span>IP</span>
                    <span className="font-mono text-gray-300">
                      {instance.ip || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Type</span>
                    <span className="text-gray-300">{instance.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Location</span>
                    <span className="text-gray-300">{instance.location}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-gray-800/50">
                  {instance.status === "running" || instance.status === "active" ? (
                    <>
                      <button
                        onClick={() => instanceAction(instance.id, "stop", instance.provider)}
                        disabled={actionLoading === `${instance.id}-stop`}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition disabled:opacity-50"
                      >
                        {actionLoading === `${instance.id}-stop` ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                        Stop
                      </button>
                      <button
                        onClick={() => instanceAction(instance.id, "reboot", instance.provider)}
                        disabled={actionLoading === `${instance.id}-reboot`}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition disabled:opacity-50"
                      >
                        {actionLoading === `${instance.id}-reboot` ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RotateCcw className="w-4 h-4" />
                        )}
                        Reboot
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => instanceAction(instance.id, "start", instance.provider)}
                      disabled={actionLoading === `${instance.id}-start`}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg text-sm transition disabled:opacity-50"
                    >
                      {actionLoading === `${instance.id}-start` ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      Start
                    </button>
                  )}
                  <button
                    onClick={() => instanceAction(instance.id, "snapshot", instance.provider)}
                    disabled={actionLoading === `${instance.id}-snapshot`}
                    className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition disabled:opacity-50"
                    title="Create Snapshot"
                  >
                    {actionLoading === `${instance.id}-snapshot` ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete instance ${instance.name}? This cannot be undone.`)) {
                        instanceAction(instance.id, "delete", instance.provider);
                      }
                    }}
                    disabled={actionLoading === `${instance.id}-delete`}
                    className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm transition disabled:opacity-50"
                    title="Delete Instance"
                  >
                    {actionLoading === `${instance.id}-delete` ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Connect Links */}
                {instance.ip && (instance.status === "running" || instance.status === "active") && (
                  <div className="mt-3 flex gap-2">
                    <Link
                      to="/chat/$instanceId"
                      params={{ instanceId: instance.name || instance.id }}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg text-sm transition"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Chat
                    </Link>
                    <a
                      href={`http://${instance.ip}:18789`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-400 hover:text-gray-300 transition"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-800">
              <h2 className="text-xl font-bold">Deploy New Instance</h2>
              <p className="text-gray-400 text-sm mt-1">
                Launch a new OpenClaw instance on AWS or Hetzner
              </p>
            </div>

            <div className="p-6 space-y-4">
              {/* Instance Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Instance Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="my-agent-01"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-purple-500 focus:outline-none"
                />
              </div>

              {/* Provider */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Cloud Provider
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, provider: "aws", serverType: "t3.small", location: "us-east-1a" })}
                    className={`p-4 rounded-lg border transition ${
                      form.provider === "aws"
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-gray-700 hover:border-gray-600"
                    }`}
                  >
                    <div className="font-semibold">AWS</div>
                    <div className="text-xs text-gray-400">Amazon EC2</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, provider: "hetzner", serverType: "cx22", location: "fsn1" })}
                    className={`p-4 rounded-lg border transition ${
                      form.provider === "hetzner"
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-gray-700 hover:border-gray-600"
                    }`}
                  >
                    <div className="font-semibold">Hetzner</div>
                    <div className="text-xs text-gray-400">6x cheaper</div>
                  </button>
                </div>
              </div>

              {/* Server Type */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Server Type
                </label>
                <select
                  value={form.serverType}
                  onChange={(e) => setForm({ ...form, serverType: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-purple-500 focus:outline-none"
                >
                  {SERVER_TYPES[form.provider].map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Location
                </label>
                <select
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-purple-500 focus:outline-none"
                >
                  {LOCATIONS[form.provider].map((loc) => (
                    <option key={loc.value} value={loc.value}>
                      {loc.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Install Mode */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Install Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, installMode: "native" })}
                    className={`p-3 rounded-lg border text-sm transition ${
                      form.installMode === "native"
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-gray-700 hover:border-gray-600"
                    }`}
                  >
                    <div className="font-medium">Native</div>
                    <div className="text-xs text-gray-400">Recommended</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, installMode: "docker" })}
                    className={`p-3 rounded-lg border text-sm transition ${
                      form.installMode === "docker"
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-gray-700 hover:border-gray-600"
                    }`}
                  >
                    <div className="font-medium">Docker</div>
                    <div className="text-xs text-gray-400">Containerized</div>
                  </button>
                </div>
              </div>

              <hr className="border-gray-800" />

              {/* Anthropic Key */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Anthropic API Key <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  value={form.anthropicKey}
                  onChange={(e) => setForm({ ...form, anthropicKey: e.target.value })}
                  placeholder="sk-ant-..."
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-purple-500 focus:outline-none font-mono text-sm"
                />
              </div>

              {/* SSH Key */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  SSH Public Key
                </label>
                <textarea
                  value={form.sshPublicKey}
                  onChange={(e) => setForm({ ...form, sshPublicKey: e.target.value })}
                  placeholder="ssh-rsa AAAA..."
                  rows={2}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-purple-500 focus:outline-none font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Recommended for secure access
                </p>
              </div>

              {/* Telegram (Optional) */}
              <details className="group">
                <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300 flex items-center gap-2">
                  <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
                  Telegram Integration (Optional)
                </summary>
                <div className="mt-3 space-y-3 pl-6">
                  <input
                    type="text"
                    value={form.telegramBotToken}
                    onChange={(e) => setForm({ ...form, telegramBotToken: e.target.value })}
                    placeholder="Bot Token"
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-purple-500 focus:outline-none text-sm"
                  />
                  <input
                    type="text"
                    value={form.telegramOwnerId}
                    onChange={(e) => setForm({ ...form, telegramOwnerId: e.target.value })}
                    placeholder="Owner ID"
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-purple-500 focus:outline-none text-sm"
                  />
                </div>
              </details>
            </div>

            <div className="p-6 border-t border-gray-800 flex gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={createInstance}
                disabled={creating || !form.name || !form.anthropicKey}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deploying...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Deploy
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
