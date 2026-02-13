import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/setup")({
  component: SetupPage,
});

const SETUP_PROMPT = `I need you to create a stats API endpoint that ClawView can connect to remotely. This endpoint should expose my session history, cost data, and tasks.

Create a Node.js script at ~/.openclaw/scripts/stats-server.mjs that:

1. Reads all session files from ~/.openclaw/agents/main/sessions/*.jsonl
2. Parses messages and extracts:
   - Total cost (from usage.cost.total in each message)
   - Token counts (input, output, cache)
   - Tool usage counts
   - Model usage counts
   - Per-day summaries
   - TASKS: Group messages by user triggers into logical tasks (each user message starts a new task, assistant responses are part of that task)

3. Serves this data via HTTP on port 18790 with CORS enabled

4. Endpoints needed:
   - GET /stats - overall stats + daily summaries
   - GET /sessions - list of sessions with metadata
   - GET /tasks - list of tasks with: id, sessionId, startTime, endTime, durationMs, summary, category, toolsUsed, cost, inputTokens, outputTokens, triggerType, triggerText
   - GET /tasks?limit=N&category=X - filtered task list
   - GET / - all data combined

5. Task extraction logic:
   - Each user message starts a new task
   - Collect all assistant responses until next user message
   - Sum up cost, tokens, tools used
   - Categorize by tools: message->communication, web_search->research, browser->browser, write/edit->coding, exec->monitoring, etc.
   - Generate summary from tools used or trigger text

6. Include taskStats in /tasks response:
   - Per-category counts: { category: { count, totalCost, avgDuration } }

The server should:
- Use native Node.js (no npm install needed)
- Enable CORS for all origins
- Require Bearer token auth using OPENCLAW_GATEWAY_PASSWORD env var
- Auto-refresh data every 60 seconds
- Bind to 0.0.0.0 so it's accessible externally

After creating the script, start it running in the background with nohup.

Finally, tell me:
1. The command to check if it's running
2. The URL format to connect ClawView (http://[my-ip]:18790)
3. What password/token to use for auth`;

function SetupPage() {
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState(1);
  const [endpointUrl, setEndpointUrl] = useState("");
  const [token, setToken] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(SETUP_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      // Try direct connection first (for same-network access)
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${endpointUrl}/stats`, { headers });

      if (res.ok) {
        const data = await res.json();
        setTestResult({
          ok: true,
          message: `✅ Connected! Found ${data.stats?.sessionCount || 0} sessions, $${(data.stats?.totalCost || 0).toFixed(2)} total cost`,
        });
        setStep(4);
      } else {
        const text = await res.text();
        setTestResult({
          ok: false,
          message: `❌ Error ${res.status}: ${text}`,
        });
      }
    } catch (error) {
      // If direct fails, try via proxy
      try {
        const proxyRes = await fetch("/api/stats-proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: endpointUrl, token }),
        });

        if (proxyRes.ok) {
          const data = await proxyRes.json();
          setTestResult({
            ok: true,
            message: `✅ Connected via proxy! Found ${data.stats?.sessionCount || 0} sessions`,
          });
          setStep(4);
        } else {
          let errMessage = "Connection failed. Make sure the stats server is running and accessible.";
          const text = await proxyRes.text();
          try {
            const errBody = JSON.parse(text);
            if (errBody?.error) errMessage = errBody.error;
          } catch {
            if (text) errMessage = text;
          }
          setTestResult({
            ok: false,
            message: `❌ ${errMessage}`,
          });
        }
      } catch (proxyError) {
        setTestResult({
          ok: false,
          message: `❌ Connection failed: ${error instanceof Error ? error.message : "Network error"}. Is the stats server running?`,
        });
      }
    } finally {
      setTesting(false);
    }
  };

  const saveAgent = () => {
    try {
      const stored = localStorage.getItem("clawview-agents");
      const agents = stored ? JSON.parse(stored) : [];

      // Normalize URL: trim and strip trailing slash (dashboard will call path "/")
      let url = endpointUrl.trim();
      if (url && url.endsWith("/")) url = url.slice(0, -1);
      if (url && !/^https?:\/\//i.test(url)) url = "http://" + url;

      const newAgent = {
        id: `agent-${Date.now()}`,
        name: (() => {
          try {
            return (
              new URL(url || endpointUrl).hostname.split(".")[0] || "My Agent"
            );
          } catch {
            return "My Agent";
          }
        })(),
        role: "OpenClaw Gateway",
        team: "Remote",
        icon: "🦞",
        gatewayUrl: url || endpointUrl.trim(),
        gatewayToken: token?.trim() || "",
        createdAt: Date.now(),
        useStatsEndpoint: true,
      };

      // Prepend so this agent is the primary (dashboard uses first agent for stats calls)
      agents.unshift(newAgent);
      localStorage.setItem("clawview-agents", JSON.stringify(agents));
      window.location.href = "/";
    } catch (error) {
      alert("Failed to save agent");
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-gray-400 hover:text-white">
              ← Back
            </Link>
            <div>
              <h1 className="text-lg font-semibold">
                Connect Your OpenClaw Agent
              </h1>
              <p className="text-sm text-gray-400">
                Set up a stats endpoint for full historical data
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= s ? "bg-blue-600" : "bg-gray-800"
                }`}
              >
                {step > s ? "✓" : s}
              </div>
              {s < 4 && (
                <div
                  className={`w-12 h-0.5 ${step > s ? "bg-blue-600" : "bg-gray-800"}`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Copy Prompt */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">
                Step 1: Send Setup Prompt to Your Agent
              </h2>
              <p className="text-gray-400">
                Copy this prompt and send it to your OpenClaw agent. It will
                create a stats server that exposes your full session history.
              </p>
            </div>

            <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-800/50">
                <span className="text-sm text-gray-400">Setup Prompt</span>
                <button
                  onClick={copyPrompt}
                  className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-500 rounded transition-colors"
                >
                  {copied ? "✓ Copied!" : "📋 Copy"}
                </button>
              </div>
              <pre className="p-4 text-sm text-gray-300 whitespace-pre-wrap overflow-x-auto max-h-80 overflow-y-auto">
                {SETUP_PROMPT}
              </pre>
            </div>

            <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
              <h3 className="font-medium text-blue-400 mb-2">
                💡 What happens next?
              </h3>
              <p className="text-sm text-gray-300">
                Your agent will create a Node.js script that reads your session
                files and serves the data via HTTP. It will tell you the URL and
                password to use.
              </p>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors"
            >
              I've sent the prompt to my agent →
            </button>
          </div>
        )}

        {/* Step 2: Wait for agent */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">
                Step 2: Wait for Your Agent
              </h2>
              <p className="text-gray-400">
                Your agent is setting up the stats server. It will tell you:
              </p>
            </div>

            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-xl">🔗</span>
                <div>
                  <div className="font-medium">Endpoint URL</div>
                  <div className="text-sm text-gray-400">
                    Something like: http://192.168.1.100:18790
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">🔑</span>
                <div>
                  <div className="font-medium">Auth Token</div>
                  <div className="text-sm text-gray-400">
                    Your OPENCLAW_GATEWAY_PASSWORD value
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors"
              >
                My agent gave me the details →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Enter details */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">
                Step 3: Enter Connection Details
              </h2>
              <p className="text-gray-400">
                Enter the URL and token your agent provided.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Stats Endpoint URL
                </label>
                <input
                  type="text"
                  value={endpointUrl}
                  onChange={(e) => setEndpointUrl(e.target.value)}
                  placeholder="http://192.168.1.100:18790"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Auth Token (OPENCLAW_GATEWAY_PASSWORD)
                </label>
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Your gateway password"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {testResult && (
              <div
                className={`p-4 rounded-lg border ${
                  testResult.ok
                    ? "bg-green-900/20 border-green-800 text-green-400"
                    : "bg-red-900/20 border-red-800 text-red-400"
                }`}
              >
                {testResult.message}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={testConnection}
                disabled={!endpointUrl || testing}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {testing ? "Testing..." : "🧪 Test Connection"}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-xl font-semibold mb-2">
                Connection Successful!
              </h2>
              <p className="text-gray-400">
                Your OpenClaw agent is connected. Click below to add it to your
                dashboard.
              </p>
            </div>

            {testResult && (
              <div className="bg-green-900/20 border border-green-800 rounded-lg p-4 text-green-400">
                {testResult.message}
              </div>
            )}

            <button
              onClick={saveAgent}
              className="w-full py-3 bg-green-600 hover:bg-green-500 rounded-lg font-medium transition-colors"
            >
              ✓ Add to Dashboard
            </button>
          </div>
        )}

        {/* Help section */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <h3 className="font-medium mb-4">Troubleshooting</h3>
          <div className="space-y-3 text-sm text-gray-400">
            <details className="bg-gray-900 rounded-lg p-3">
              <summary className="cursor-pointer font-medium text-gray-300">
                Agent didn't create the server?
              </summary>
              <p className="mt-2">
                Try sending the prompt again. Make sure your agent has file
                system access (write, exec tools).
              </p>
            </details>
            <details className="bg-gray-900 rounded-lg p-3">
              <summary className="cursor-pointer font-medium text-gray-300">
                Connection refused?
              </summary>
              <p className="mt-2">
                Make sure the stats server is running:{" "}
                <code className="bg-gray-800 px-1 rounded">
                  ps aux | grep stats-server
                </code>
              </p>
            </details>
            <details className="bg-gray-900 rounded-lg p-3">
              <summary className="cursor-pointer font-medium text-gray-300">
                Can't connect from outside network?
              </summary>
              <p className="mt-2">
                You'll need to expose the port via Tailscale funnel or port
                forwarding.
              </p>
            </details>
          </div>
        </div>
      </main>
    </div>
  );
}
