import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  X,
  Loader2,
  Shield,
  Cloud,
  Server,
  Github,
  Bot,
  Palette,
  Rocket,
  Database,
  Lock,
  Eye,
  EyeOff,
  Upload,
  ChevronDown,
  ExternalLink,
} from "lucide-react";

export const Route = createFileRoute("/vault")({
  component: VaultPage,
});

const DEPLOY_API = "https://openclaw-deploy.holly-3f6.workers.dev";

// Secret service templates
const SERVICE_TEMPLATES: Record<string, {
  label: string;
  icon: React.ReactNode;
  fields: { key: string; label: string; placeholder: string; sensitive?: boolean }[];
  description: string;
  helpUrl?: string;
}> = {
  cloudflare: {
    label: "Cloudflare",
    icon: <Cloud className="w-4 h-4 text-orange-400" />,
    fields: [
      { key: "apiToken", label: "API Token", placeholder: "Enter CF API token", sensitive: true },
      { key: "accountId", label: "Account ID (optional)", placeholder: "CF account ID" },
    ],
    description: "Deploy Workers, Pages, KV, D1, R2",
    helpUrl: "https://dash.cloudflare.com/profile/api-tokens",
  },
  github: {
    label: "GitHub",
    icon: <Github className="w-4 h-4 text-gray-300" />,
    fields: [
      { key: "username", label: "Username", placeholder: "GitHub username" },
      { key: "token", label: "Personal Access Token", placeholder: "ghp_...", sensitive: true },
      { key: "email", label: "Email", placeholder: "user@example.com" },
    ],
    description: "Git operations, repo access",
    helpUrl: "https://github.com/settings/tokens",
  },
  anthropic: {
    label: "Anthropic",
    icon: <Bot className="w-4 h-4 text-amber-400" />,
    fields: [
      { key: "apiKey", label: "API Key", placeholder: "sk-ant-...", sensitive: true },
    ],
    description: "Claude models API access",
    helpUrl: "https://console.anthropic.com/settings/keys",
  },
  openai: {
    label: "OpenAI",
    icon: <Bot className="w-4 h-4 text-green-400" />,
    fields: [
      { key: "apiKey", label: "API Key", placeholder: "sk-...", sensitive: true },
    ],
    description: "GPT models API access",
    helpUrl: "https://platform.openai.com/api-keys",
  },
  moonshot: {
    label: "Moonshot (Kimi)",
    icon: <Bot className="w-4 h-4 text-purple-400" />,
    fields: [
      { key: "apiKey", label: "API Key", placeholder: "sk-...", sensitive: true },
    ],
    description: "Kimi K2 models API access",
    helpUrl: "https://platform.moonshot.ai/console/api-keys",
  },
  "fal-ai": {
    label: "fal.ai",
    icon: <Palette className="w-4 h-4 text-pink-400" />,
    fields: [
      { key: "apiKey", label: "API Key", placeholder: "fal_...", sensitive: true },
    ],
    description: "Image generation models",
    helpUrl: "https://fal.ai/dashboard/keys",
  },
  runpod: {
    label: "RunPod",
    icon: <Rocket className="w-4 h-4 text-purple-500" />,
    fields: [
      { key: "apiKey", label: "API Key", placeholder: "RunPod API key", sensitive: true },
    ],
    description: "GPU pod management",
    helpUrl: "https://www.runpod.io/console/user/settings",
  },
  telegram: {
    label: "Telegram",
    icon: <Bot className="w-4 h-4 text-blue-400" />,
    fields: [
      { key: "botToken", label: "Bot Token", placeholder: "123456:ABC...", sensitive: true },
      { key: "ownerId", label: "Owner Chat ID", placeholder: "123456789" },
    ],
    description: "Telegram bot messaging",
    helpUrl: "https://t.me/BotFather",
  },
  custom: {
    label: "Custom Secret",
    icon: <Key className="w-4 h-4 text-gray-400" />,
    fields: [],
    description: "Define custom key-value pairs",
  },
};

interface VaultEntry {
  service: string;
  name: string;
  ref: string;
  fields: string[];
  description?: string;
  createdAt?: number;
  updatedAt?: number;
}

interface RegisteredInstance {
  id: string;
  name: string;
  tunnel_url: string | null;
  status: string;
}

function VaultPage() {
  const [secrets, setSecrets] = useState<VaultEntry[]>([]);
  const [instances, setInstances] = useState<RegisteredInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Create secret modal
  const [showCreate, setShowCreate] = useState(false);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [secretName, setSecretName] = useState("");
  const [secretDescription, setSecretDescription] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [customFields, setCustomFields] = useState<{ key: string; value: string }[]>([]);
  const [creating, setCreating] = useState(false);
  
  // Push modal
  const [pushTarget, setPushTarget] = useState<VaultEntry | null>(null);
  const [selectedInstances, setSelectedInstances] = useState<Set<string>>(new Set());
  const [pushing, setPushing] = useState(false);
  
  // Visibility toggles for sensitive fields
  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set());

  const adminToken = useMemo(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("deployAdminToken") || "";
    }
    return "";
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch vault secrets
      const vaultRes = await fetch(`${DEPLOY_API}/vault`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (vaultRes.ok) {
        const data = await vaultRes.json();
        setSecrets(data.entries || []);
      }

      // Fetch instances for push targets
      const instancesRes = await fetch(`${DEPLOY_API}/registry`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (instancesRes.ok) {
        const data = await instancesRes.json();
        setInstances(data.instances || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminToken) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [adminToken]);

  const createSecret = async () => {
    if (!selectedService || !secretName.trim()) return;
    
    setCreating(true);
    setError(null);
    
    try {
      const template = SERVICE_TEMPLATES[selectedService];
      let secretData: Record<string, string> = {};
      
      if (selectedService === "custom") {
        customFields.forEach(f => {
          if (f.key.trim()) {
            secretData[f.key.trim()] = f.value;
          }
        });
      } else {
        template.fields.forEach(f => {
          if (fieldValues[f.key]) {
            secretData[f.key] = fieldValues[f.key];
          }
        });
      }
      
      if (secretDescription) {
        secretData.description = secretDescription;
      }
      
      const res = await fetch(`${DEPLOY_API}/vault/${selectedService}/${secretName.trim()}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(secretData),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create secret");
      }
      
      setSuccess(`Created secret ${selectedService}/${secretName}`);
      setShowCreate(false);
      resetCreateForm();
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create secret");
    } finally {
      setCreating(false);
    }
  };

  const deleteSecret = async (ref: string) => {
    if (!confirm(`Delete secret ${ref}?`)) return;
    
    try {
      const res = await fetch(`${DEPLOY_API}/vault/${ref}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete secret");
      }
      
      setSuccess(`Deleted secret ${ref}`);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete secret");
    }
  };

  const pushToInstances = async () => {
    if (!pushTarget || selectedInstances.size === 0) return;
    
    setPushing(true);
    setError(null);
    
    try {
      const results = await Promise.allSettled(
        Array.from(selectedInstances).map(async (instanceId) => {
          // First assign the secret
          await fetch(`${DEPLOY_API}/registry/${instanceId}/secrets`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${adminToken}`,
            },
            body: JSON.stringify({ ref: pushTarget.ref }),
          });
          
          // Then push
          const res = await fetch(`${DEPLOY_API}/registry/${instanceId}/secrets/push`, {
            method: "POST",
            headers: { Authorization: `Bearer ${adminToken}` },
          });
          
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Push failed");
          }
          
          return instanceId;
        })
      );
      
      const succeeded = results.filter(r => r.status === "fulfilled").length;
      const failed = results.filter(r => r.status === "rejected").length;
      
      if (failed > 0) {
        setError(`Pushed to ${succeeded} instances, ${failed} failed`);
      } else {
        setSuccess(`Pushed ${pushTarget.ref} to ${succeeded} instance(s)`);
      }
      
      setPushTarget(null);
      setSelectedInstances(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to push secrets");
    } finally {
      setPushing(false);
    }
  };

  const resetCreateForm = () => {
    setSelectedService(null);
    setSecretName("");
    setSecretDescription("");
    setFieldValues({});
    setCustomFields([{ key: "", value: "" }]);
  };

  const toggleFieldVisibility = (fieldKey: string) => {
    setVisibleFields(prev => {
      const next = new Set(prev);
      if (next.has(fieldKey)) {
        next.delete(fieldKey);
      } else {
        next.add(fieldKey);
      }
      return next;
    });
  };

  const getServiceIcon = (service: string) => {
    const template = SERVICE_TEMPLATES[service];
    if (template) return template.icon;
    return <Key className="w-4 h-4 text-gray-400" />;
  };

  if (!adminToken) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6">
            <h2 className="text-xl font-bold text-yellow-400 mb-2">Admin Token Required</h2>
            <p className="text-gray-300 mb-4">
              Set your deploy admin token to manage secrets:
            </p>
            <code className="block bg-gray-900 p-3 rounded text-sm text-gray-300">
              localStorage.setItem("deployAdminToken", "your-token-here")
            </code>
            <p className="text-gray-500 text-sm mt-3">
              Then refresh this page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-gray-400 hover:text-white transition">
              ← Dashboard
            </Link>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-400" />
              Secrets Vault
            </h1>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            Add Secret
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 flex items-center justify-between">
            {error}
            <button onClick={() => setError(null)} className="text-red-300 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 flex items-center justify-between">
            {success}
            <button onClick={() => setSuccess(null)} className="text-green-300 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          </div>
        ) : (
          <div className="grid gap-4">
            {secrets.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                <Key className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No secrets in vault</p>
                <button
                  onClick={() => setShowCreate(true)}
                  className="mt-4 text-purple-400 hover:text-purple-300 transition"
                >
                  Add your first secret →
                </button>
              </div>
            ) : (
              secrets.map((secret) => (
                <div
                  key={secret.ref}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gray-800 rounded-lg">
                        {getServiceIcon(secret.service)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white flex items-center gap-2">
                          {secret.name}
                          <span className="text-xs px-2 py-0.5 bg-gray-800 rounded text-gray-400">
                            {secret.service}
                          </span>
                        </h3>
                        <p className="text-gray-500 text-sm mt-1">
                          {secret.ref}
                        </p>
                        {secret.description && (
                          <p className="text-gray-400 text-sm mt-2">{secret.description}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {secret.fields.map((field) => (
                            <span
                              key={field}
                              className="text-xs px-2 py-1 bg-gray-800/50 border border-gray-700 rounded text-gray-400"
                            >
                              {field}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPushTarget(secret)}
                        className="p-2 text-gray-400 hover:text-purple-400 hover:bg-gray-800 rounded-lg transition"
                        title="Push to instances"
                      >
                        <Upload className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteSecret(secret.ref)}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Create Secret Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <h2 className="text-xl font-bold">Add Secret</h2>
              <button
                onClick={() => { setShowCreate(false); resetCreateForm(); }}
                className="p-2 text-gray-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Service Selection */}
              {!selectedService ? (
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(SERVICE_TEMPLATES).map(([key, template]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedService(key)}
                      className="p-4 bg-gray-800/50 border border-gray-700 rounded-xl hover:border-purple-500/50 hover:bg-gray-800 transition text-left"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {template.icon}
                        <span className="font-medium">{template.label}</span>
                      </div>
                      <p className="text-xs text-gray-500">{template.description}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  {/* Service Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {SERVICE_TEMPLATES[selectedService].icon}
                      <span className="font-medium">{SERVICE_TEMPLATES[selectedService].label}</span>
                    </div>
                    <button
                      onClick={() => setSelectedService(null)}
                      className="text-sm text-gray-400 hover:text-white"
                    >
                      Change
                    </button>
                  </div>

                  {/* Help Link */}
                  {SERVICE_TEMPLATES[selectedService].helpUrl && (
                    <a
                      href={SERVICE_TEMPLATES[selectedService].helpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Get API credentials
                    </a>
                  )}

                  {/* Secret Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Secret Name
                    </label>
                    <input
                      type="text"
                      value={secretName}
                      onChange={(e) => setSecretName(e.target.value.replace(/[^a-zA-Z0-9-_]/g, ""))}
                      placeholder="e.g., forge-workers, production"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Will be stored as: {selectedService}/{secretName || "name"}
                    </p>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Description (optional)
                    </label>
                    <input
                      type="text"
                      value={secretDescription}
                      onChange={(e) => setSecretDescription(e.target.value)}
                      placeholder="What is this secret for?"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  {/* Fields */}
                  {selectedService === "custom" ? (
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-300">
                        Custom Fields
                      </label>
                      {customFields.map((field, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input
                            type="text"
                            value={field.key}
                            onChange={(e) => {
                              const next = [...customFields];
                              next[idx].key = e.target.value;
                              setCustomFields(next);
                            }}
                            placeholder="Key"
                            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                          />
                          <input
                            type="text"
                            value={field.value}
                            onChange={(e) => {
                              const next = [...customFields];
                              next[idx].value = e.target.value;
                              setCustomFields(next);
                            }}
                            placeholder="Value"
                            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                          />
                          {customFields.length > 1 && (
                            <button
                              onClick={() => setCustomFields(customFields.filter((_, i) => i !== idx))}
                              className="p-2 text-gray-400 hover:text-red-400"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => setCustomFields([...customFields, { key: "", value: "" }])}
                        className="text-sm text-purple-400 hover:text-purple-300"
                      >
                        + Add field
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {SERVICE_TEMPLATES[selectedService].fields.map((field) => (
                        <div key={field.key}>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            {field.label}
                          </label>
                          <div className="relative">
                            <input
                              type={field.sensitive && !visibleFields.has(field.key) ? "password" : "text"}
                              value={fieldValues[field.key] || ""}
                              onChange={(e) => setFieldValues({ ...fieldValues, [field.key]: e.target.value })}
                              placeholder={field.placeholder}
                              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:border-purple-500"
                            />
                            {field.sensitive && (
                              <button
                                type="button"
                                onClick={() => toggleFieldVisibility(field.key)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                              >
                                {visibleFields.has(field.key) ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {selectedService && (
              <div className="p-6 border-t border-gray-800 flex justify-end gap-3">
                <button
                  onClick={() => { setShowCreate(false); resetCreateForm(); }}
                  className="px-4 py-2 text-gray-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  onClick={createSecret}
                  disabled={!secretName.trim() || creating}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition"
                >
                  {creating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Create Secret
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Push to Instances Modal */}
      {pushTarget && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <h2 className="text-xl font-bold">Push Secret</h2>
              <button
                onClick={() => { setPushTarget(null); setSelectedInstances(new Set()); }}
                className="p-2 text-gray-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <p className="text-gray-400 mb-4">
                Push <span className="text-white font-medium">{pushTarget.ref}</span> to:
              </p>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {instances.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No instances registered</p>
                ) : (
                  instances.map((instance) => (
                    <label
                      key={instance.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                        selectedInstances.has(instance.id)
                          ? "border-purple-500 bg-purple-500/10"
                          : "border-gray-700 hover:border-gray-600"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedInstances.has(instance.id)}
                        onChange={(e) => {
                          const next = new Set(selectedInstances);
                          if (e.target.checked) {
                            next.add(instance.id);
                          } else {
                            next.delete(instance.id);
                          }
                          setSelectedInstances(next);
                        }}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                        selectedInstances.has(instance.id)
                          ? "bg-purple-500 border-purple-500"
                          : "border-gray-600"
                      }`}>
                        {selectedInstances.has(instance.id) && <Check className="w-3 h-3" />}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{instance.name}</div>
                        <div className="text-xs text-gray-500">
                          {instance.tunnel_url || instance.id}
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        instance.status === "active"
                          ? "bg-green-500/20 text-green-400"
                          : "bg-gray-700 text-gray-400"
                      }`}>
                        {instance.status}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-800 flex justify-end gap-3">
              <button
                onClick={() => { setPushTarget(null); setSelectedInstances(new Set()); }}
                className="px-4 py-2 text-gray-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={pushToInstances}
                disabled={selectedInstances.size === 0 || pushing}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition"
              >
                {pushing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Push to {selectedInstances.size} Instance{selectedInstances.size !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
