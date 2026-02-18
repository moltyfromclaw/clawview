import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Settings,
  Users,
  Key,
  Server,
  Plus,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  RefreshCw,
  Github,
  Mail,
  Bot,
  Shield,
  Check,
  X,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Inbox,
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

const DEPLOY_API = "https://openclaw-deploy.holly-3f6.workers.dev";

// Vault service types
const VAULT_SERVICES = {
  anthropic: { label: "Anthropic", fields: [{ key: "apiKey", label: "API Key", secret: true }] },
  openai: { label: "OpenAI", fields: [{ key: "apiKey", label: "API Key", secret: true }] },
  moonshot: { label: "Moonshot (Kimi K2.5)", fields: [{ key: "apiKey", label: "API Key", secret: true }] },
  "fal-ai": { label: "fal.ai", fields: [{ key: "apiKey", label: "API Key", secret: true }] },
  huggingface: { label: "HuggingFace", fields: [{ key: "token", label: "Token", secret: true }] },
  github: {
    label: "GitHub",
    fields: [
      { key: "username", label: "Username", secret: false },
      { key: "password", label: "Password", secret: true },
      { key: "email", label: "Email", secret: false },
      { key: "token", label: "Token (optional)", secret: true },
    ],
  },
  telegram: {
    label: "Telegram",
    fields: [
      { key: "botToken", label: "Bot Token", secret: true },
      { key: "allowFrom", label: "Allowed User IDs (comma-separated)", secret: false },
    ],
  },
  runpod: { label: "RunPod", fields: [{ key: "apiKey", label: "API Key", secret: true }] },
  custom: { label: "Custom", fields: [] },
};

interface VaultEntry {
  service: string;
  name: string;
  ref: string;
  fields: string[];
  description?: string;
  createdAt: number;
  updatedAt: number;
}

interface EmailAccount {
  address: string;
  domain: string;
  agentName: string;
  instanceId?: string;
  createdAt: number;
}

interface GitHubAccount {
  name: string;
  email: string;
  username?: string;
  createdAt: number;
}

interface Instance {
  id: string;
  name: string;
  status: string;
  ip: string | null;
  provider: string;
}

function AdminPage() {
  const [adminToken, setAdminToken] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<"vault" | "emails" | "github" | "instances">("vault");
  const [vaultEntries, setVaultEntries] = useState<VaultEntry[]>([]);
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [githubAccounts, setGithubAccounts] = useState<GitHubAccount[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("clawview_admin_token");
    if (saved) {
      setAdminToken(saved);
      setIsAuthenticated(true);
    }
  }, []);

  const authenticate = () => {
    localStorage.setItem("clawview_admin_token", adminToken);
    setIsAuthenticated(true);
    loadData();
  };

  const logout = () => {
    localStorage.removeItem("clawview_admin_token");
    setAdminToken("");
    setIsAuthenticated(false);
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load vault entries
      const vaultRes = await fetch(`${DEPLOY_API}/vault`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (vaultRes.ok) {
        const data = await vaultRes.json();
        setVaultEntries(data.entries || []);
        
        // Extract GitHub accounts from vault
        const ghAccounts = (data.entries || [])
          .filter((e: VaultEntry) => e.service === "github")
          .map((e: VaultEntry) => ({
            name: e.name,
            email: e.fields.includes("email") ? "(set)" : "",
            username: e.fields.includes("username") ? "(set)" : undefined,
            createdAt: e.createdAt,
          }));
        setGithubAccounts(ghAccounts);
      }

      // Load email accounts
      const emailRes = await fetch(`${DEPLOY_API}/email-accounts`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (emailRes.ok) {
        const data = await emailRes.json();
        setEmailAccounts(data.accounts || []);
      }

      // Load instances
      const instancesRes = await fetch(`${DEPLOY_API}/instances`);
      if (instancesRes.ok) {
        const data = await instancesRes.json();
        setInstances(data.instances || []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <LoginScreen adminToken={adminToken} setAdminToken={setAdminToken} onLogin={authenticate} />;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-purple-400" />
            <h1 className="text-xl font-bold">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={loadData} disabled={loading} className="p-2 hover:bg-gray-800 rounded-lg">
              <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={logout} className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 rounded-lg">
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex gap-1">
            {[
              { id: "vault", label: "Secrets Vault", icon: Key },
              { id: "emails", label: "Email Accounts", icon: Mail },
              { id: "github", label: "GitHub Accounts", icon: Github },
              { id: "instances", label: "Instances", icon: Server },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-purple-500 text-white"
                    : "border-transparent text-gray-400 hover:text-white"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300">{error}</div>
        )}

        {activeTab === "vault" && <VaultTab entries={vaultEntries} adminToken={adminToken} onRefresh={loadData} />}
        {activeTab === "emails" && <EmailsTab accounts={emailAccounts} adminToken={adminToken} onRefresh={loadData} />}
        {activeTab === "github" && <GitHubTab accounts={githubAccounts} emailAccounts={emailAccounts} adminToken={adminToken} onRefresh={loadData} />}
        {activeTab === "instances" && (
          <InstancesTab instances={instances} vaultEntries={vaultEntries} adminToken={adminToken} onRefresh={loadData} />
        )}
      </main>
    </div>
  );
}

function LoginScreen({ adminToken, setAdminToken, onLogin }: { adminToken: string; setAdminToken: (t: string) => void; onLogin: () => void }) {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <div className="w-full max-w-md p-8 bg-gray-900 rounded-xl border border-gray-800">
        <div className="text-center mb-8">
          <Shield className="w-12 h-12 text-purple-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Admin Access</h1>
          <p className="text-gray-400 mt-2">Enter your admin token to continue</p>
        </div>
        <div className="space-y-4">
          <input
            type="password"
            value={adminToken}
            onChange={(e) => setAdminToken(e.target.value)}
            placeholder="Admin token..."
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500"
            onKeyDown={(e) => e.key === "Enter" && onLogin()}
          />
          <button
            onClick={onLogin}
            disabled={!adminToken}
            className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg font-medium"
          >
            Authenticate
          </button>
        </div>
      </div>
    </div>
  );
}

// Vault Tab
function VaultTab({ entries, adminToken, onRefresh }: { entries: VaultEntry[]; adminToken: string; onRefresh: () => void }) {
  const [showCreate, setShowCreate] = useState(false);
  const [editingEntry, setEditingEntry] = useState<VaultEntry | null>(null);

  // Group entries by service
  const byService = entries.reduce((acc, entry) => {
    if (!acc[entry.service]) acc[entry.service] = [];
    acc[entry.service].push(entry);
    return acc;
  }, {} as Record<string, VaultEntry[]>);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Secrets Vault</h2>
          <p className="text-gray-400">Shared secrets for agent instances</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg"
        >
          <Plus className="w-4 h-4" />
          Add Secret
        </button>
      </div>

      {showCreate && <VaultForm adminToken={adminToken} onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); onRefresh(); }} />}
      {editingEntry && <VaultForm adminToken={adminToken} editEntry={editingEntry} onClose={() => setEditingEntry(null)} onSaved={() => { setEditingEntry(null); onRefresh(); }} />}

      <div className="space-y-6">
        {Object.entries(byService).map(([service, serviceEntries]) => (
          <div key={service} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-gray-800/50 border-b border-gray-800 flex items-center gap-2">
              <span className="font-semibold capitalize">{VAULT_SERVICES[service as keyof typeof VAULT_SERVICES]?.label || service}</span>
              <span className="text-sm text-gray-400">({serviceEntries.length})</span>
            </div>
            <div className="divide-y divide-gray-800">
              {serviceEntries.map((entry) => (
                <VaultEntryRow key={entry.ref} entry={entry} adminToken={adminToken} onDeleted={onRefresh} onEdit={() => setEditingEntry(entry)} />
              ))}
            </div>
          </div>
        ))}
        {entries.length === 0 && (
          <div className="text-center py-12 text-gray-500">No secrets in vault. Add one to get started.</div>
        )}
      </div>
    </div>
  );
}

function VaultEntryRow({ entry, adminToken, onDeleted, onEdit }: { entry: VaultEntry; adminToken: string; onDeleted: () => void; onEdit: () => void }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete secret "${entry.ref}"?`)) return;
    setDeleting(true);
    try {
      await fetch(`${DEPLOY_API}/vault/${entry.ref}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      onDeleted();
    } catch (e) {
      alert("Failed to delete");
    }
    setDeleting(false);
  };

  return (
    <div className="px-4 py-3 flex items-center justify-between">
      <div>
        <div className="font-medium">{entry.name}</div>
        <div className="text-sm text-gray-400">
          {entry.ref} • {entry.fields.join(", ")}
          {entry.description && <span className="ml-2">• {entry.description}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={onEdit} className="p-2 hover:bg-gray-800 rounded text-gray-400 hover:text-white">
          <Edit className="w-4 h-4" />
        </button>
        <button onClick={handleDelete} disabled={deleting} className="p-2 hover:bg-gray-800 rounded text-gray-400 hover:text-red-400">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function VaultForm({ adminToken, onClose, onSaved, editEntry }: { adminToken: string; onClose: () => void; onSaved: () => void; editEntry?: VaultEntry }) {
  const [service, setService] = useState<keyof typeof VAULT_SERVICES>(editEntry?.service as keyof typeof VAULT_SERVICES || "anthropic");
  const [name, setName] = useState(editEntry?.name || "default");
  const [values, setValues] = useState<Record<string, string>>({});
  const [description, setDescription] = useState(editEntry?.description || "");
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  
  const isEditing = !!editEntry;
  const serviceConfig = VAULT_SERVICES[service];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload: any = { description };
    
    // Add field values
    for (const field of serviceConfig.fields) {
      if (values[field.key]) {
        // Handle allowFrom as array
        if (field.key === "allowFrom") {
          payload[field.key] = values[field.key].split(",").map(s => s.trim()).filter(Boolean);
        } else {
          payload[field.key] = values[field.key];
        }
      }
    }

    try {
      const res = await fetch(`${DEPLOY_API}/vault/${service}/${name}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onSaved();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to save");
      }
    } catch (e) {
      alert("Failed to save");
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-800 w-full max-w-lg">
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-xl font-bold">{isEditing ? "Edit Secret" : "Add Secret"}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {isEditing && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 text-sm">
              Editing <strong>{editEntry.ref}</strong>. Leave fields blank to keep existing values.
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Service</label>
              <select
                value={service}
                onChange={(e) => { setService(e.target.value as any); setValues({}); }}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                disabled={isEditing}
              >
                {Object.entries(VAULT_SERVICES).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                placeholder="default"
                disabled={isEditing}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
              placeholder="Shared API key for all agents"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Fields</span>
            <button type="button" onClick={() => setShowSecrets(!showSecrets)} className="flex items-center gap-1 text-sm text-gray-400 hover:text-white">
              {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showSecrets ? "Hide" : "Show"}
            </button>
          </div>

          <div className="space-y-3">
            {serviceConfig.fields.map((field) => (
              <div key={field.key}>
                <label className="block text-sm text-gray-400 mb-1">{field.label}</label>
                <input
                  type={field.secret && !showSecrets ? "password" : "text"}
                  value={values[field.key] || ""}
                  onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg">
              Cancel
            </button>
            <button type="submit" disabled={saving || !name} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg">
              {saving ? "Saving..." : isEditing ? "Update Secret" : "Save Secret"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Emails Tab
function EmailsTab({ accounts, adminToken, onRefresh }: { accounts: EmailAccount[]; adminToken: string; onRefresh: () => void }) {
  const [showCreate, setShowCreate] = useState(false);
  const [viewingInbox, setViewingInbox] = useState<string | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Email Accounts</h2>
          <p className="text-gray-400">Receive emails for agents (GitHub verification, etc.)</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg">
          <Plus className="w-4 h-4" />
          Create Email
        </button>
      </div>

      {showCreate && <EmailForm adminToken={adminToken} onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); onRefresh(); }} />}
      {viewingInbox && <InboxModal address={viewingInbox} adminToken={adminToken} onClose={() => setViewingInbox(null)} />}

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left text-gray-400 text-sm border-b border-gray-800">
              <th className="px-4 py-3 font-medium">Address</th>
              <th className="px-4 py-3 font-medium">Agent Name</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr key={account.address} className="border-b border-gray-800/50">
                <td className="px-4 py-3 font-mono text-sm">{account.address}</td>
                <td className="px-4 py-3">{account.agentName}</td>
                <td className="px-4 py-3 text-gray-400 text-sm">{new Date(account.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={() => setViewingInbox(account.address)}
                      className="p-2 hover:bg-gray-800 rounded text-gray-400 hover:text-white"
                      title="View Inbox"
                    >
                      <Inbox className="w-4 h-4" />
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm(`Delete ${account.address}?`)) return;
                        await fetch(`${DEPLOY_API}/email-accounts/${account.address}`, {
                          method: "DELETE",
                          headers: { Authorization: `Bearer ${adminToken}` },
                        });
                        onRefresh();
                      }}
                      className="p-2 hover:bg-gray-800 rounded text-gray-400 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {accounts.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-gray-500">
                  No email accounts. Create one to receive emails.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmailForm({ adminToken, onClose, onSaved }: { adminToken: string; onClose: () => void; onSaved: () => void }) {
  const [address, setAddress] = useState("");
  const [domain] = useState("hollyclaw.com");
  const [saving, setSaving] = useState(false);

  const fullAddress = address ? `${address}@${domain}` : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;
    setSaving(true);

    try {
      const res = await fetch(`${DEPLOY_API}/email-accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ address: fullAddress, agentName: address }),
      });

      if (res.ok) {
        onSaved();
      } else {
        const data = await res.json();
        alert(data.message || data.error || "Failed to create");
      }
    } catch (e) {
      alert("Failed to create email account");
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-800 w-full max-w-md">
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-xl font-bold">Create Email Account</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email Address</label>
            <div className="flex">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-l-lg"
                placeholder="agent-name"
              />
              <span className="px-3 py-2 bg-gray-700 border border-gray-700 rounded-r-lg text-gray-400">
                @{domain}
              </span>
            </div>
            {fullAddress && <p className="mt-2 text-sm text-gray-400">Will create: {fullAddress}</p>}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg">
              Cancel
            </button>
            <button type="submit" disabled={saving || !address} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg">
              {saving ? "Creating..." : "Create Email"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InboxModal({ address, adminToken, onClose }: { address: string; adminToken: string; onClose: () => void }) {
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<any>(null);

  useEffect(() => {
    fetch(`${DEPLOY_API}/emails/${address}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setEmails(data.emails || []);
        setLoading(false);
      });
  }, [address]);

  const loadEmail = async (id: number) => {
    const res = await fetch(`${DEPLOY_API}/emails/${address}/${id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    setSelectedEmail(data);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-800 w-full max-w-4xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-bold">Inbox: {address}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading...</div>
          ) : selectedEmail ? (
            <div>
              <button onClick={() => setSelectedEmail(null)} className="mb-4 text-sm text-purple-400 hover:underline">
                ← Back to inbox
              </button>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="mb-4">
                  <div className="text-sm text-gray-400">From: {selectedEmail.from}</div>
                  <div className="text-lg font-semibold">{selectedEmail.subject}</div>
                  <div className="text-sm text-gray-400">{new Date(selectedEmail.receivedAt).toLocaleString()}</div>
                </div>
                <div className="border-t border-gray-700 pt-4 whitespace-pre-wrap text-sm">
                  {selectedEmail.text || selectedEmail.html || "(no content)"}
                </div>
              </div>
            </div>
          ) : emails.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No emails yet</div>
          ) : (
            <div className="space-y-2">
              {emails.map((email) => (
                <div
                  key={email.id}
                  onClick={() => loadEmail(email.id)}
                  className="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className={email.read ? "text-gray-400" : "font-semibold"}>{email.subject}</span>
                    <span className="text-sm text-gray-500">{new Date(email.receivedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="text-sm text-gray-400">{email.from}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// GitHub Tab
function GitHubTab({
  accounts,
  emailAccounts,
  adminToken,
  onRefresh,
}: {
  accounts: GitHubAccount[];
  emailAccounts: EmailAccount[];
  adminToken: string;
  onRefresh: () => void;
}) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">GitHub Accounts</h2>
          <p className="text-gray-400">Manage GitHub accounts for agents</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg">
          <Plus className="w-4 h-4" />
          Add GitHub Account
        </button>
      </div>

      {showCreate && (
        <GitHubForm
          emailAccounts={emailAccounts}
          adminToken={adminToken}
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); onRefresh(); }}
        />
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left text-gray-400 text-sm border-b border-gray-800">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Username</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr key={account.name} className="border-b border-gray-800/50">
                <td className="px-4 py-3 font-mono text-sm">{account.name}</td>
                <td className="px-4 py-3">{account.email}</td>
                <td className="px-4 py-3">{account.username || "-"}</td>
                <td className="px-4 py-3 text-gray-400 text-sm">{new Date(account.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={async () => {
                      if (!confirm(`Delete GitHub account "${account.name}"?`)) return;
                      await fetch(`${DEPLOY_API}/vault/github/${account.name}`, {
                        method: "DELETE",
                        headers: { Authorization: `Bearer ${adminToken}` },
                      });
                      onRefresh();
                    }}
                    className="p-2 hover:bg-gray-800 rounded text-gray-400 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {accounts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                  No GitHub accounts. Add one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GitHubForm({
  emailAccounts,
  adminToken,
  onClose,
  onSaved,
}: {
  emailAccounts: EmailAccount[];
  adminToken: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;
    setSaving(true);

    try {
      const payload: any = { email, password };
      if (username) payload.username = username;

      const res = await fetch(`${DEPLOY_API}/vault/github/${name}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onSaved();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create");
      }
    } catch (e) {
      alert("Failed to create GitHub account");
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-800 w-full max-w-md">
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-xl font-bold">Add GitHub Account</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Account Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
              placeholder="dottie"
            />
            <p className="mt-1 text-xs text-gray-500">Used to reference this account (e.g., github/dottie)</p>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <select
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
            >
              <option value="">Select email account...</option>
              {emailAccounts.map((acc) => (
                <option key={acc.address} value={acc.address}>{acc.address}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">Email for GitHub verification</p>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Username (optional)</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
              placeholder="dottie-agent"
            />
            <p className="mt-1 text-xs text-gray-500">GitHub username if account already exists</p>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name || !email || !password}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg"
            >
              {saving ? "Creating..." : "Add Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Instances Tab with Registry + Secret Management
interface RegisteredInstance {
  id: string;
  name: string;
  gateway_url: string;
  provider: string | null;
  region: string | null;
  email: string | null;
  status: string;
  last_seen_at: string | null;
  created_at: string;
}

interface InstanceSecret {
  ref: string;
  service?: string;
  name?: string;
  fields?: string[];
  assignedAt?: string;
  pushedAt?: string | null;
  missing?: boolean;
}

function InstancesTab({
  instances,
  vaultEntries,
  adminToken,
  onRefresh,
}: {
  instances: Instance[];
  vaultEntries: VaultEntry[];
  adminToken: string;
  onRefresh: () => void;
}) {
  const [registeredInstances, setRegisteredInstances] = useState<RegisteredInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [managingSecrets, setManagingSecrets] = useState<RegisteredInstance | null>(null);
  
  // Load registered instances
  useEffect(() => {
    fetch(`${DEPLOY_API}/registry`)
      .then(r => r.json())
      .then(data => {
        setRegisteredInstances(data.instances || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "running":
      case "active":
      case "healthy":
        return "bg-green-400";
      case "stopped":
      case "off":
        return "bg-yellow-400";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Instances</h2>
          <p className="text-gray-400">Registered agent instances</p>
        </div>
        <button onClick={onRefresh} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {managingSecrets && (
        <InstanceSecretsModal
          instance={managingSecrets}
          vaultEntries={vaultEntries}
          adminToken={adminToken}
          onClose={() => setManagingSecrets(null)}
        />
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : registeredInstances.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No registered instances. Deploy one from the Instances page.
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 text-sm border-b border-gray-800">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Gateway</th>
                <th className="px-4 py-3 font-medium">Provider</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Last Seen</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {registeredInstances.map((instance) => (
                <tr key={instance.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3">
                    <div className="font-medium">{instance.name}</div>
                    {instance.email && <div className="text-xs text-gray-400">{instance.email}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={instance.gateway_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1"
                    >
                      {instance.gateway_url.replace("https://", "").split("/")[0]}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {instance.provider || "-"}
                    {instance.region && <span className="ml-1">({instance.region})</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(instance.status)}`} />
                      <span className="text-sm capitalize">{instance.status}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {instance.last_seen_at 
                      ? new Date(instance.last_seen_at).toLocaleString() 
                      : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setManagingSecrets(instance)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm"
                    >
                      <Key className="w-3 h-3" />
                      Secrets
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Instance Secrets Modal
function InstanceSecretsModal({
  instance,
  vaultEntries,
  adminToken,
  onClose,
}: {
  instance: RegisteredInstance;
  vaultEntries: VaultEntry[];
  adminToken: string;
  onClose: () => void;
}) {
  const [assignedSecrets, setAssignedSecrets] = useState<InstanceSecret[]>([]);
  const [loading, setLoading] = useState(true);
  const [pushing, setPushing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchAssigned = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${DEPLOY_API}/registry/${instance.id}/secrets`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAssignedSecrets(data.secrets || []);
      }
    } catch (e) {
      setError("Failed to load secrets");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAssigned();
  }, [instance.id]);

  const isAssigned = (ref: string) => assignedSecrets.some((s) => s.ref === ref);

  const toggleSecret = async (ref: string) => {
    setError(null);
    setSuccess(null);

    if (isAssigned(ref)) {
      // Remove
      const res = await fetch(`${DEPLOY_API}/registry/${instance.id}/secrets/${ref}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to remove");
        return;
      }
      setAssignedSecrets((prev) => prev.filter((s) => s.ref !== ref));
    } else {
      // Add
      const res = await fetch(`${DEPLOY_API}/registry/${instance.id}/secrets`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ ref }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to assign");
        return;
      }
      fetchAssigned();
    }
  };

  const pushSecrets = async () => {
    setPushing(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`${DEPLOY_API}/registry/${instance.id}/secrets/push`, {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to push");
        return;
      }
      setSuccess(`Pushed ${data.pushed?.length || 0} secret(s) to ${instance.name}. Gateway will restart.`);
      fetchAssigned();
    } catch (e) {
      setError("Failed to push secrets");
    }
    setPushing(false);
  };

  const getServiceIcon = (service: string) => {
    const icons: Record<string, string> = {
      github: "🐙",
      anthropic: "🤖",
      openai: "🧠",
      telegram: "📱",
      "fal-ai": "🎨",
      runpod: "🚀",
      huggingface: "🤗",
      moonshot: "🌙",
    };
    return icons[service] || "🔑";
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-800 w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Key className="w-5 h-5 text-purple-400" />
              Manage Secrets
            </h2>
            <p className="text-gray-400 text-sm mt-1">{instance.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="px-6 py-3 bg-red-500/10 border-b border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="px-6 py-3 bg-green-500/10 border-b border-green-500/20 text-green-400 text-sm">
            {success}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading...</div>
          ) : (
            <div className="space-y-6">
              {/* Assigned Secrets */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-400" />
                  Assigned Secrets ({assignedSecrets.length})
                </h3>
                {assignedSecrets.length === 0 ? (
                  <p className="text-gray-500 text-sm">No secrets assigned yet</p>
                ) : (
                  <div className="space-y-2">
                    {assignedSecrets.map((secret) => (
                      <div
                        key={secret.ref}
                        className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{getServiceIcon(secret.service || "")}</span>
                          <div>
                            <div className="font-medium text-sm">{secret.ref}</div>
                            <div className="text-xs text-gray-400">
                              {secret.fields?.join(", ")}
                              {secret.pushedAt && (
                                <span className="ml-2 text-green-400">
                                  • Pushed {new Date(secret.pushedAt).toLocaleDateString()}
                                </span>
                              )}
                              {secret.missing && (
                                <span className="ml-2 text-red-400">• Missing from vault</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleSecret(secret.ref)}
                          className="p-1.5 text-red-400 hover:bg-red-500/20 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Available Secrets */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-3">
                  Available Secrets
                </h3>
                <div className="space-y-2">
                  {vaultEntries
                    .filter((e) => !isAssigned(e.ref))
                    .map((entry) => (
                      <div
                        key={entry.ref}
                        className="flex items-center justify-between p-3 bg-gray-800/50 border border-gray-700/50 rounded-lg hover:border-gray-600"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{getServiceIcon(entry.service)}</span>
                          <div>
                            <div className="font-medium text-sm">{entry.ref}</div>
                            <div className="text-xs text-gray-400">
                              {entry.fields.join(", ")}
                              {entry.description && <span className="ml-2">• {entry.description}</span>}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleSecret(entry.ref)}
                          className="p-1.5 text-green-400 hover:bg-green-500/20 rounded"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  {vaultEntries.filter((e) => !isAssigned(e.ref)).length === 0 && (
                    <p className="text-gray-500 text-sm">All secrets are assigned</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-800 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg">
            Close
          </button>
          <button
            onClick={pushSecrets}
            disabled={pushing || assignedSecrets.length === 0}
            className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg flex items-center justify-center gap-2"
          >
            {pushing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Pushing...
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4" />
                Push to Instance
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
