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
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

const DEPLOY_API = "https://openclaw-deploy.holly-3f6.workers.dev";

// Types
interface Profile {
  name: string;
  description: string;
  skills: string[];
  createdAt: number;
  updatedAt: number;
  secretsConfigured: {
    anthropicKey: boolean;
    openaiKey: boolean;
    telegramBotToken: boolean;
    huggingfaceToken: boolean;
    falKey: boolean;
    githubAccount: boolean;
  };
}

interface Account {
  id: string;
  type: "github" | "email" | "telegram";
  username: string;
  email?: string;
  associatedProfile?: string;
  createdAt: number;
}

interface Instance {
  id: string;
  name: string;
  status: string;
  ip: string | null;
  profile?: string;
  provider: string;
}

function AdminPage() {
  const [adminToken, setAdminToken] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<"profiles" | "accounts" | "instances">("profiles");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load saved token
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
      // Load profiles
      const profilesRes = await fetch(`${DEPLOY_API}/profiles`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (profilesRes.ok) {
        const data = await profilesRes.json();
        setProfiles(data.profiles || []);
      }

      // Load instances
      const instancesRes = await fetch(`${DEPLOY_API}/instances`);
      if (instancesRes.ok) {
        const data = await instancesRes.json();
        setInstances(data.instances || []);
      }

      // Load accounts from localStorage (local management)
      const savedAccounts = localStorage.getItem("clawview_accounts");
      if (savedAccounts) {
        setAccounts(JSON.parse(savedAccounts));
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
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-purple-400" />
            <h1 className="text-xl font-bold">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex gap-1">
            {[
              { id: "profiles", label: "Profiles", icon: Key },
              { id: "accounts", label: "Accounts", icon: Users },
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

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300">
            {error}
          </div>
        )}

        {activeTab === "profiles" && (
          <ProfilesTab
            profiles={profiles}
            adminToken={adminToken}
            onRefresh={loadData}
          />
        )}
        {activeTab === "accounts" && (
          <AccountsTab
            accounts={accounts}
            setAccounts={setAccounts}
            profiles={profiles}
          />
        )}
        {activeTab === "instances" && (
          <InstancesTab
            instances={instances}
            profiles={profiles}
            adminToken={adminToken}
            onRefresh={loadData}
          />
        )}
      </main>
    </div>
  );
}

// Login Screen
function LoginScreen({
  adminToken,
  setAdminToken,
  onLogin,
}: {
  adminToken: string;
  setAdminToken: (t: string) => void;
  onLogin: () => void;
}) {
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
            className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg font-medium transition-colors"
          >
            Authenticate
          </button>
        </div>
      </div>
    </div>
  );
}

// Profiles Tab
function ProfilesTab({
  profiles,
  adminToken,
  onRefresh,
}: {
  profiles: Profile[];
  adminToken: string;
  onRefresh: () => void;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [editingProfile, setEditingProfile] = useState<string | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Agent Profiles</h2>
          <p className="text-gray-400">Manage agent configurations and secrets</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Profile
        </button>
      </div>

      {showCreate && (
        <ProfileForm
          adminToken={adminToken}
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            onRefresh();
          }}
        />
      )}

      <div className="grid gap-4">
        {profiles.map((profile) => (
          <ProfileCard
            key={profile.name}
            profile={profile}
            adminToken={adminToken}
            onEdit={() => setEditingProfile(profile.name)}
            onDeleted={onRefresh}
          />
        ))}
        {profiles.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No profiles yet. Create one to get started.
          </div>
        )}
      </div>

      {editingProfile && (
        <ProfileForm
          adminToken={adminToken}
          editName={editingProfile}
          onClose={() => setEditingProfile(null)}
          onSaved={() => {
            setEditingProfile(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

// Profile Card
function ProfileCard({
  profile,
  adminToken,
  onEdit,
  onDeleted,
}: {
  profile: Profile;
  adminToken: string;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete profile "${profile.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await fetch(`${DEPLOY_API}/profiles/${profile.name}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      onDeleted();
    } catch (e) {
      alert("Failed to delete profile");
    }
    setDeleting(false);
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-800/50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          <div>
            <h3 className="font-semibold text-lg">{profile.name}</h3>
            <p className="text-sm text-gray-400">{profile.description || "No description"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {profile.skills?.map((skill) => (
            <span key={skill} className="px-2 py-1 text-xs bg-purple-500/20 text-purple-300 rounded">
              {skill}
            </span>
          ))}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-800 pt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <SecretIndicator label="Anthropic" configured={profile.secretsConfigured?.anthropicKey} />
            <SecretIndicator label="OpenAI" configured={profile.secretsConfigured?.openaiKey} />
            <SecretIndicator label="Telegram" configured={profile.secretsConfigured?.telegramBotToken} />
            <SecretIndicator label="HuggingFace" configured={profile.secretsConfigured?.huggingfaceToken} />
            <SecretIndicator label="fal.ai" configured={profile.secretsConfigured?.falKey} />
            <SecretIndicator label="GitHub Account" configured={profile.secretsConfigured?.githubAccount} />
          </div>
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 rounded-lg"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              disabled={deleting}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SecretIndicator({ label, configured }: { label: string; configured?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {configured ? (
        <Check className="w-4 h-4 text-green-400" />
      ) : (
        <X className="w-4 h-4 text-gray-600" />
      )}
      <span className={configured ? "text-white" : "text-gray-500"}>{label}</span>
    </div>
  );
}

// Profile Form (Create/Edit)
function ProfileForm({
  adminToken,
  editName,
  onClose,
  onSaved,
}: {
  adminToken: string;
  editName?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: editName || "",
    description: "",
    skills: "",
    anthropicKey: "",
    openaiKey: "",
    telegramBotToken: "",
    telegramOwnerId: "",
    huggingfaceToken: "",
    falKey: "",
    githubUsername: "",
    githubPassword: "",
    githubEmail: "",
  });
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload: any = {
      description: form.description,
      skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
    };

    // Only include non-empty secrets
    if (form.anthropicKey) payload.anthropicKey = form.anthropicKey;
    if (form.openaiKey) payload.openaiKey = form.openaiKey;
    if (form.telegramBotToken) payload.telegramBotToken = form.telegramBotToken;
    if (form.telegramOwnerId) payload.telegramOwnerId = form.telegramOwnerId;
    if (form.huggingfaceToken) payload.huggingfaceToken = form.huggingfaceToken;
    if (form.falKey) payload.falKey = form.falKey;
    if (form.githubUsername) {
      payload.githubAccount = {
        username: form.githubUsername,
        password: form.githubPassword,
        email: form.githubEmail,
      };
    }

    try {
      const res = await fetch(`${DEPLOY_API}/profiles/${form.name}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onSaved();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to save profile");
      }
    } catch (e) {
      alert("Failed to save profile");
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-xl font-bold">{editName ? "Edit Profile" : "Create Profile"}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-300">Basic Info</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Profile Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
                  disabled={!!editName}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg disabled:opacity-50"
                  placeholder="video-agent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Skills (comma-separated)</label>
                <input
                  type="text"
                  value={form.skills}
                  onChange={(e) => setForm({ ...form, skills: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                  placeholder="fal-ai, github-tester"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                placeholder="Video research and content generation agent"
              />
            </div>
          </div>

          {/* Secrets */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-300">Secrets</h3>
              <button
                type="button"
                onClick={() => setShowSecrets(!showSecrets)}
                className="flex items-center gap-1 text-sm text-gray-400 hover:text-white"
              >
                {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showSecrets ? "Hide" : "Show"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Anthropic API Key</label>
                <input
                  type={showSecrets ? "text" : "password"}
                  value={form.anthropicKey}
                  onChange={(e) => setForm({ ...form, anthropicKey: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                  placeholder="sk-ant-..."
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">OpenAI API Key</label>
                <input
                  type={showSecrets ? "text" : "password"}
                  value={form.openaiKey}
                  onChange={(e) => setForm({ ...form, openaiKey: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                  placeholder="sk-..."
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Telegram Bot Token</label>
                <input
                  type={showSecrets ? "text" : "password"}
                  value={form.telegramBotToken}
                  onChange={(e) => setForm({ ...form, telegramBotToken: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Telegram Owner ID</label>
                <input
                  type="text"
                  value={form.telegramOwnerId}
                  onChange={(e) => setForm({ ...form, telegramOwnerId: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">fal.ai Key</label>
                <input
                  type={showSecrets ? "text" : "password"}
                  value={form.falKey}
                  onChange={(e) => setForm({ ...form, falKey: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">HuggingFace Token</label>
                <input
                  type={showSecrets ? "text" : "password"}
                  value={form.huggingfaceToken}
                  onChange={(e) => setForm({ ...form, huggingfaceToken: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* GitHub Account */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-300 flex items-center gap-2">
              <Github className="w-4 h-4" />
              GitHub Account
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Username</label>
                <input
                  type="text"
                  value={form.githubUsername}
                  onChange={(e) => setForm({ ...form, githubUsername: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Password</label>
                <input
                  type={showSecrets ? "text" : "password"}
                  value={form.githubPassword}
                  onChange={(e) => setForm({ ...form, githubPassword: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Email</label>
                <input
                  type="email"
                  value={form.githubEmail}
                  onChange={(e) => setForm({ ...form, githubEmail: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !form.name}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg"
            >
              {saving ? "Saving..." : editName ? "Update Profile" : "Create Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Accounts Tab
function AccountsTab({
  accounts,
  setAccounts,
  profiles,
}: {
  accounts: Account[];
  setAccounts: (a: Account[]) => void;
  profiles: Profile[];
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [newAccount, setNewAccount] = useState({
    type: "github" as "github" | "email" | "telegram",
    username: "",
    email: "",
    password: "",
    associatedProfile: "",
  });

  const saveAccounts = (updated: Account[]) => {
    setAccounts(updated);
    localStorage.setItem("clawview_accounts", JSON.stringify(updated));
  };

  const handleCreate = () => {
    const account: Account = {
      id: crypto.randomUUID(),
      type: newAccount.type,
      username: newAccount.username,
      email: newAccount.email,
      associatedProfile: newAccount.associatedProfile || undefined,
      createdAt: Date.now(),
    };
    saveAccounts([...accounts, account]);
    setShowCreate(false);
    setNewAccount({ type: "github", username: "", email: "", password: "", associatedProfile: "" });
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this account record?")) {
      saveAccounts(accounts.filter((a) => a.id !== id));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Accounts</h2>
          <p className="text-gray-400">Track accounts created for agents</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Account
        </button>
      </div>

      {showCreate && (
        <div className="mb-6 p-4 bg-gray-900 border border-gray-800 rounded-xl">
          <h3 className="font-semibold mb-4">New Account</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Type</label>
              <select
                value={newAccount.type}
                onChange={(e) => setNewAccount({ ...newAccount, type: e.target.value as any })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
              >
                <option value="github">GitHub</option>
                <option value="email">Email</option>
                <option value="telegram">Telegram</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Username</label>
              <input
                type="text"
                value={newAccount.username}
                onChange={(e) => setNewAccount({ ...newAccount, username: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <input
                type="email"
                value={newAccount.email}
                onChange={(e) => setNewAccount({ ...newAccount, email: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Associated Profile</label>
              <select
                value={newAccount.associatedProfile}
                onChange={(e) => setNewAccount({ ...newAccount, associatedProfile: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
              >
                <option value="">None</option>
                {profiles.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!newAccount.username}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg"
            >
              Add Account
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-gray-400 text-sm border-b border-gray-800">
              <th className="pb-3 font-medium">Type</th>
              <th className="pb-3 font-medium">Username</th>
              <th className="pb-3 font-medium">Email</th>
              <th className="pb-3 font-medium">Profile</th>
              <th className="pb-3 font-medium">Created</th>
              <th className="pb-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr key={account.id} className="border-b border-gray-800/50">
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    {account.type === "github" && <Github className="w-4 h-4 text-gray-400" />}
                    {account.type === "email" && <Mail className="w-4 h-4 text-gray-400" />}
                    {account.type === "telegram" && <Bot className="w-4 h-4 text-gray-400" />}
                    <span className="capitalize">{account.type}</span>
                  </div>
                </td>
                <td className="py-3 font-mono text-sm">{account.username}</td>
                <td className="py-3 text-gray-400">{account.email || "-"}</td>
                <td className="py-3">
                  {account.associatedProfile ? (
                    <span className="px-2 py-1 text-xs bg-purple-500/20 text-purple-300 rounded">
                      {account.associatedProfile}
                    </span>
                  ) : (
                    <span className="text-gray-500">-</span>
                  )}
                </td>
                <td className="py-3 text-gray-400 text-sm">
                  {new Date(account.createdAt).toLocaleDateString()}
                </td>
                <td className="py-3">
                  <button
                    onClick={() => handleDelete(account.id)}
                    className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {accounts.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-500">
                  No accounts tracked yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Instances Tab
function InstancesTab({
  instances,
  profiles,
  adminToken,
  onRefresh,
}: {
  instances: Instance[];
  profiles: Profile[];
  adminToken: string;
  onRefresh: () => void;
}) {
  const [showDeploy, setShowDeploy] = useState(false);
  const [deployForm, setDeployForm] = useState({
    name: "",
    profile: "",
    serverType: "cx22",
  });
  const [deploying, setDeploying] = useState(false);

  const handleDeploy = async () => {
    if (!deployForm.name || !deployForm.profile) return;
    setDeploying(true);

    try {
      const res = await fetch(`${DEPLOY_API}/instances`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: deployForm.name,
          profile: deployForm.profile,
          serverType: deployForm.serverType,
        }),
      });

      if (res.ok) {
        setShowDeploy(false);
        setDeployForm({ name: "", profile: "", serverType: "cx22" });
        onRefresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to deploy");
      }
    } catch (e) {
      alert("Failed to deploy instance");
    }
    setDeploying(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Instances</h2>
          <p className="text-gray-400">Running agent instances</p>
        </div>
        <button
          onClick={() => setShowDeploy(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Deploy Agent
        </button>
      </div>

      {showDeploy && (
        <div className="mb-6 p-4 bg-gray-900 border border-gray-800 rounded-xl">
          <h3 className="font-semibold mb-4">Deploy New Agent</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Instance Name</label>
              <input
                type="text"
                value={deployForm.name}
                onChange={(e) => setDeployForm({ ...deployForm, name: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                placeholder="video-agent-01"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Profile</label>
              <select
                value={deployForm.profile}
                onChange={(e) => setDeployForm({ ...deployForm, profile: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
              >
                <option value="">Select profile...</option>
                {profiles.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Server Type</label>
              <select
                value={deployForm.serverType}
                onChange={(e) => setDeployForm({ ...deployForm, serverType: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
              >
                <option value="cx22">cx22 (2 vCPU, 4GB) €4.51/mo</option>
                <option value="cx32">cx32 (4 vCPU, 8GB) €8.21/mo</option>
                <option value="cx42">cx42 (8 vCPU, 16GB) €15.61/mo</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setShowDeploy(false)}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleDeploy}
              disabled={deploying || !deployForm.name || !deployForm.profile}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg"
            >
              {deploying ? "Deploying..." : "Deploy"}
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {instances.map((instance) => (
          <div key={instance.id} className="p-4 bg-gray-900 border border-gray-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`w-3 h-3 rounded-full ${
                  instance.status === "running" ? "bg-green-400" : "bg-gray-500"
                }`}
              />
              <div>
                <h3 className="font-semibold">{instance.name}</h3>
                <p className="text-sm text-gray-400">
                  {instance.ip || "No IP"} • {instance.provider}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {instance.profile && (
                <span className="px-2 py-1 text-xs bg-purple-500/20 text-purple-300 rounded">
                  {instance.profile}
                </span>
              )}
              <span className="px-2 py-1 text-xs bg-gray-800 rounded capitalize">{instance.status}</span>
            </div>
          </div>
        ))}
        {instances.length === 0 && (
          <div className="text-center py-12 text-gray-500">No instances running</div>
        )}
      </div>
    </div>
  );
}
