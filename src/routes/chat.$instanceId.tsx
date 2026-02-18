import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft,
  Send,
  Loader2,
  Bot,
  User,
  AlertCircle,
  Settings,
  RefreshCw,
} from "lucide-react";

export const Route = createFileRoute("/chat/$instanceId")({
  component: ChatPage,
});

const DEPLOY_API = "https://openclaw-deploy.holly-3f6.workers.dev";

// Get admin token from localStorage (set in instances page or manually)
function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('deploy_admin_token');
}

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

interface InstanceInfo {
  id: string;
  name: string;
  ip: string;
  status: string;
  provider: string;
}

interface ConnectionInfo {
  gateway?: { token: string; createdAt: number };
  tunnel?: { url: string; updatedAt: number };
}

function ChatPage() {
  const { instanceId } = useParams({ from: "/chat/$instanceId" });
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instance, setInstance] = useState<InstanceInfo | null>(null);
  const [gatewayToken, setGatewayToken] = useState("");
  const [tunnelUrl, setTunnelUrl] = useState("");
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch instance info and connection info
  useEffect(() => {
    const fetchInstance = async () => {
      const adminToken = getAdminToken();
      
      // First try to fetch connection info directly by name
      // This works even if the instance isn't in the list
      if (adminToken) {
        try {
          const connRes = await fetch(
            `${DEPLOY_API}/instances/${instanceId}/connection-info`,
            {
              headers: { Authorization: `Bearer ${adminToken}` },
            }
          );
          if (connRes.ok) {
            const connData = await connRes.json();
            setConnectionInfo(connData);
            setInstance({ id: instanceId, name: connData.name || instanceId, ip: '', status: 'unknown', provider: 'aws' });
            
            // Auto-populate if available
            if (connData.tunnel?.url) {
              setTunnelUrl(connData.tunnel.url);
            }
            if (connData.gateway?.token) {
              setGatewayToken(connData.gateway.token);
            }
            setConnecting(false);
            return;
          }
        } catch (e) {
          console.log("Could not fetch connection info directly:", e);
        }
      }
      
      // Fallback: Try to find in instance list
      try {
        let foundInstance = null;
        for (const provider of ["aws", "hetzner"]) {
          const res = await fetch(`${DEPLOY_API}/instances?provider=${provider}`);
          if (res.ok) {
            const data = await res.json();
            const found = data.instances?.find(
              (i: any) => i.id === instanceId || i.name === instanceId
            );
            if (found) {
              foundInstance = found;
              setInstance(found);
              break;
            }
          }
        }
        
        if (!foundInstance) {
          setError("Instance not found. Make sure deploy_admin_token is set in localStorage.");
          setConnecting(false);
          return;
        }
        
        // Try to fetch connection info by instance name
        if (adminToken) {
          try {
            const connRes = await fetch(
              `${DEPLOY_API}/instances/${foundInstance.name || instanceId}/connection-info`,
              {
                headers: { Authorization: `Bearer ${adminToken}` },
              }
            );
            if (connRes.ok) {
              const connData = await connRes.json();
              setConnectionInfo(connData);
              
              if (connData.tunnel?.url) {
                setTunnelUrl(connData.tunnel.url);
              }
              if (connData.gateway?.token) {
                setGatewayToken(connData.gateway.token);
              }
            }
          } catch (e) {
            console.log("Could not fetch connection info:", e);
          }
        }
      } catch (err) {
        setError("Failed to fetch instance info");
      } finally {
        setConnecting(false);
      }
    };
    fetchInstance();
  }, [instanceId]);

  // Connect directly to tunnel URL using OpenClaw protocol
  const connect = useCallback(() => {
    if (!tunnelUrl || !gatewayToken) {
      setShowConnectionModal(true);
      setConnecting(false);
      return;
    }

    setConnecting(true);
    setError(null);

    // Connect directly to the Cloudflare Tunnel URL
    const baseUrl = tunnelUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const wsUrl = `wss://${baseUrl}`;
    
    console.log("Connecting to:", wsUrl);
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      let connectId = "";

      ws.onopen = () => {
        console.log("WebSocket opened, sending connect message...");
        connectId = crypto.randomUUID();
        // OpenClaw protocol: send connect message with auth token
        const connectMsg = {
          type: "req",
          id: connectId,
          method: "connect",
          params: {
            minProtocol: 3,
            maxProtocol: 3,
            client: {
              id: "clawview-chat",
              version: "1.0.0",
              platform: "web",
              mode: "operator"
            },
            role: "operator",
            scopes: ["operator.read", "operator.write"],
            caps: [],
            auth: { token: gatewayToken },
            locale: "en-US",
            userAgent: navigator.userAgent,
          }
        };
        ws.send(JSON.stringify(connectMsg));
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("Received:", data);
          
          // Handle connect response
          if (data.type === "res" && data.id === connectId) {
            if (data.ok) {
              setConnected(true);
              setConnecting(false);
              setShowConnectionModal(false);
              setMessages((prev) => [
                ...prev,
                {
                  id: crypto.randomUUID(),
                  role: "system",
                  content: `Connected to ${instance?.name || baseUrl}`,
                  timestamp: new Date(),
                },
              ]);
            } else {
              setError(data.error?.message || "Connection failed");
              setConnecting(false);
            }
            return;
          }
          
          // Handle chat events from OpenClaw gateway
          if (data.type === "event") {
            const evt = data.event;
            if (evt === "chat" && data.payload) {
              const p = data.payload;
              if (p.role === "assistant" && p.content) {
                setMessages((prev) => [
                  ...prev,
                  {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    content: p.content,
                    timestamp: new Date(),
                  },
                ]);
                setLoading(false);
              }
            } else if (evt === "chat.thinking" || evt === "agent.thinking") {
              setLoading(true);
            } else if (evt === "chat.done" || evt === "turn.end") {
              setLoading(false);
            }
          }
          
          // Handle res for chat.send
          if (data.type === "res" && data.ok && data.payload?.status === "started") {
            setLoading(true);
          }
        } catch {
          console.log("Non-JSON message:", event.data);
        }
      };

      ws.onerror = (e) => {
        console.error("WebSocket error:", e);
        setError("WebSocket connection error - check tunnel URL and token");
        setConnected(false);
        setConnecting(false);
      };

      ws.onclose = (event) => {
        setConnected(false);
        setConnecting(false);
        if (event.code !== 1000) {
          const reason = event.reason || `Code ${event.code}`;
          if (event.code === 1008) {
            setError(`Disconnected (${reason}): Check gateway token is correct`);
          } else {
            setError(`Disconnected: ${reason}`);
          }
        }
      };
    } catch (err) {
      console.error("Connection error:", err);
      setError("Failed to connect - check tunnel URL format");
      setConnecting(false);
    }
  }, [instance, tunnelUrl, gatewayToken]);

  // Auto-connect when tunnel URL and token are available
  useEffect(() => {
    if (tunnelUrl && gatewayToken && !connected && !connecting) {
      connect();
    }
  }, [tunnelUrl, gatewayToken, connect, connected, connecting]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  const sendMessage = () => {
    if (!input.trim() || !connected || loading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageText = input.trim();
    setInput("");
    setLoading(true);

    // Send using OpenClaw protocol: chat.send
    wsRef.current?.send(
      JSON.stringify({
        type: "req",
        id: crypto.randomUUID(),
        method: "chat.send",
        params: {
          message: messageText,
          sessionKey: "main", // Use main session
        },
      })
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800/50 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/instances"
              className="p-2 hover:bg-gray-800 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-semibold">
                {instance?.name || instanceId}
              </h1>
              <div className="flex items-center gap-2 text-sm">
                {connected ? (
                  <span className="flex items-center gap-1 text-green-400">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    Connected
                  </span>
                ) : connecting ? (
                  <span className="flex items-center gap-1 text-yellow-400">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Connecting...
                  </span>
                ) : (
                  <span className="text-gray-400">Disconnected</span>
                )}
                {instance?.ip && (
                  <span className="text-gray-500 font-mono text-xs">
                    {instance.ip}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowConnectionModal(true)}
            className="p-2 hover:bg-gray-800 rounded-lg transition"
            title="Connection Settings"
          >
            <Settings className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </header>

      {/* Connection Modal */}
      {showConnectionModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Connect to Instance</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Tunnel URL
                </label>
                <input
                  type="text"
                  value={tunnelUrl}
                  onChange={(e) => setTunnelUrl(e.target.value)}
                  placeholder="https://xxx.trycloudflare.com"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-purple-500 focus:outline-none font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-2">
                  The Cloudflare Tunnel URL for this instance (HTTPS required).
                </p>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Gateway Token
                </label>
                <input
                  type="password"
                  value={gatewayToken}
                  onChange={(e) => setGatewayToken(e.target.value)}
                  placeholder="Enter gateway token..."
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-purple-500 focus:outline-none font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-2">
                  The token was displayed when the instance was created.
                </p>
              </div>
              {connectionInfo && (
                <div className="text-xs text-gray-500 p-2 bg-gray-800/50 rounded">
                  {connectionInfo.tunnel?.url && (
                    <div>✓ Tunnel URL auto-loaded</div>
                  )}
                  {connectionInfo.gateway?.token && (
                    <div>✓ Gateway token auto-loaded</div>
                  )}
                  {!connectionInfo.tunnel?.url && !connectionInfo.gateway?.token && (
                    <div>No stored connection info found. Enter manually.</div>
                  )}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConnectionModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowConnectionModal(false);
                    connect();
                  }}
                  disabled={!tunnelUrl || !gatewayToken}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition disabled:opacity-50"
                >
                  Connect
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="max-w-4xl mx-auto w-full px-4 pt-4">
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span className="text-red-400 text-sm flex-1">{error}</span>
            <button
              onClick={connect}
              className="flex items-center gap-1 px-3 py-1 bg-red-500/20 hover:bg-red-500/30 rounded text-sm text-red-400"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
          {messages.length === 0 && !connecting && (
            <div className="text-center py-20 text-gray-500">
              <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No messages yet. Start a conversation!</p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${
                msg.role === "user" ? "flex-row-reverse" : ""
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  msg.role === "user"
                    ? "bg-purple-600"
                    : msg.role === "assistant"
                    ? "bg-gray-700"
                    : "bg-gray-800"
                }`}
              >
                {msg.role === "user" ? (
                  <User className="w-4 h-4" />
                ) : msg.role === "assistant" ? (
                  <Bot className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-gray-400" />
                )}
              </div>
              <div
                className={`max-w-[80%] px-4 py-2 rounded-xl ${
                  msg.role === "user"
                    ? "bg-purple-600"
                    : msg.role === "assistant"
                    ? "bg-gray-800"
                    : "bg-gray-800/50 text-gray-400 text-sm"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="px-4 py-2 bg-gray-800 rounded-xl">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                  <span
                    className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  />
                  <span
                    className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input */}
      <div className="border-t border-gray-800/50 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                connected
                  ? "Type a message..."
                  : "Connect to start chatting..."
              }
              disabled={!connected}
              rows={1}
              className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:border-purple-500 focus:outline-none resize-none disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={!connected || !input.trim() || loading}
              className="px-4 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
