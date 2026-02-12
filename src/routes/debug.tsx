import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/debug')({
  component: DebugPage,
})

function DebugPage() {
  const [gatewayUrl, setGatewayUrl] = useState('https://ms-mac-mini.tail901772.ts.net')
  const [token, setToken] = useState('')
  const [tool, setTool] = useState('sessions_list')
  const [args, setArgs] = useState('{"limit": 5, "messageLimit": 1}')
  const [results, setResults] = useState<Array<{ type: string; time: string; data: unknown }>>([])
  const [loading, setLoading] = useState(false)
  const [connectionWorking, setConnectionWorking] = useState(false)

  const log = (type: string, data: unknown) => {
    setResults(prev => [...prev, { type, time: new Date().toISOString(), data }])
  }

  const clearLogs = () => setResults([])

  // Test 1: Direct fetch to gateway (will likely fail due to CORS)
  const testDirectFetch = async () => {
    log('info', `Testing direct fetch to ${gatewayUrl}/tools/invoke...`)
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      
      const res = await fetch(`${gatewayUrl}/tools/invoke`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ tool, args: JSON.parse(args) }),
      })
      
      const data = await res.json()
      log('direct-fetch', { status: res.status, ok: res.ok, data })
    } catch (error) {
      log('direct-fetch-error', { 
        error: error instanceof Error ? error.message : String(error),
        note: 'This is expected to fail due to CORS when accessing from browser'
      })
    }
  }

  // Test 2: Via proxy API
  const testProxyFetch = async () => {
    log('info', `Testing proxy fetch via /api/gateway-proxy...`)
    try {
      const res = await fetch('/api/gateway-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gatewayUrl,
          token,
          tool,
          args: JSON.parse(args),
        }),
      })
      
      const data = await res.json()
      log('proxy-fetch', { status: res.status, ok: res.ok, data })
      
      // Check if connection worked
      if (data.ok && data.result?.details?.sessions) {
        setConnectionWorking(true)
        log('success', `✅ Connection working! Found ${data.result.details.sessions.length} sessions`)
      } else if (data.ok) {
        setConnectionWorking(true)
        log('success', '✅ Connection working!')
      }
    } catch (error) {
      log('proxy-fetch-error', { error: error instanceof Error ? error.message : String(error) })
    }
  }

  // Save gateway to localStorage so dashboard can use it
  const saveGateway = () => {
    try {
      const stored = localStorage.getItem('clawview-agents')
      const agents = stored ? JSON.parse(stored) : []
      
      // Check if already exists
      const exists = agents.some((a: any) => a.gatewayUrl === gatewayUrl)
      if (exists) {
        // Update existing
        const updated = agents.map((a: any) => 
          a.gatewayUrl === gatewayUrl ? { ...a, gatewayToken: token } : a
        )
        localStorage.setItem('clawview-agents', JSON.stringify(updated))
        log('success', '✅ Updated existing gateway in localStorage')
      } else {
        // Add new
        agents.push({
          id: `agent-${Date.now()}`,
          name: new URL(gatewayUrl).hostname.split('.')[0] || 'Remote Agent',
          role: 'OpenClaw Gateway',
          team: 'Remote',
          icon: '🦞',
          gatewayUrl,
          gatewayToken: token,
          createdAt: Date.now(),
        })
        localStorage.setItem('clawview-agents', JSON.stringify(agents))
        log('success', '✅ Saved gateway to localStorage! Go to dashboard to see data.')
      }
    } catch (error) {
      log('error', { error: 'Failed to save to localStorage', details: String(error) })
    }
  }

  // Test 3: WebSocket connection
  const testWebSocket = async () => {
    log('info', `Testing WebSocket connection to ${gatewayUrl}...`)
    
    return new Promise<void>((resolve) => {
      try {
        let wsUrl = gatewayUrl
        if (wsUrl.startsWith('http://')) wsUrl = 'ws://' + wsUrl.slice(7)
        else if (wsUrl.startsWith('https://')) wsUrl = 'wss://' + wsUrl.slice(8)
        else if (!wsUrl.startsWith('ws://') && !wsUrl.startsWith('wss://')) wsUrl = 'wss://' + wsUrl
        wsUrl = wsUrl.replace(/\/$/, '') + '/ws'
        
        log('info', `Connecting to ${wsUrl}...`)
        
        const ws = new WebSocket(wsUrl)
        const timeout = setTimeout(() => {
          log('ws-timeout', 'Connection timed out after 5s')
          ws.close()
          resolve()
        }, 5000)

        ws.onopen = () => {
          log('ws-open', 'WebSocket connected, sending handshake...')
          ws.send(JSON.stringify({
            type: 'req',
            id: 'connect-1',
            method: 'connect',
            params: {
              minProtocol: 1,
              maxProtocol: 3,
              client: { id: 'clawview-debug', version: '1.0.0', platform: 'web', mode: 'probe' },
              caps: [],
              role: 'operator',
              scopes: ['operator.admin'],
              auth: token ? { token } : undefined
            }
          }))
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            log('ws-message', data)
            
            if (data.type === 'res' && data.ok) {
              log('ws-success', 'Handshake successful!')
              ws.send(JSON.stringify({ type: 'req', id: 'status-1', method: 'status', params: {} }))
            } else if (data.id === 'status-1') {
              log('ws-status', data.payload)
              clearTimeout(timeout)
              ws.close()
              resolve()
            }
          } catch (e) {
            log('ws-parse-error', { raw: event.data, error: String(e) })
          }
        }

        ws.onerror = (error) => {
          clearTimeout(timeout)
          log('ws-error', { error: 'WebSocket error occurred', details: String(error) })
          resolve()
        }

        ws.onclose = (event) => {
          clearTimeout(timeout)
          log('ws-close', { code: event.code, reason: event.reason, wasClean: event.wasClean })
          resolve()
        }
      } catch (error) {
        log('ws-setup-error', { error: error instanceof Error ? error.message : String(error) })
        resolve()
      }
    })
  }

  // Run all tests
  const runAllTests = async () => {
    setLoading(true)
    clearLogs()
    log('info', '=== Starting Gateway Debug Tests ===')
    log('info', { gatewayUrl, token: token ? '***' + token.slice(-4) : '(none)', tool, args })
    
    await testDirectFetch()
    await testProxyFetch()
    await testWebSocket()
    
    log('info', '=== Tests Complete ===')
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">🔧 Gateway Debug Tool</h1>
        
        {/* Config */}
        <div className="bg-gray-900 rounded-lg p-4 mb-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Gateway URL</label>
            <input
              type="text"
              value={gatewayUrl}
              onChange={(e) => setGatewayUrl(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 font-mono text-sm"
              placeholder="https://your-gateway.example.com"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Token / Password <span className="text-xs text-gray-500">(OPENCLAW_GATEWAY_PASSWORD)</span>
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 font-mono text-sm"
              placeholder="Your gateway token or password"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Tool</label>
              <select
                value={tool}
                onChange={(e) => setTool(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2"
              >
                <option value="sessions_list">sessions_list</option>
                <option value="sessions_history">sessions_history</option>
                <option value="session_status">session_status</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-1">Args (JSON)</label>
              <input
                type="text"
                value={args}
                onChange={(e) => setArgs(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 font-mono text-sm"
              />
            </div>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={runAllTests}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded font-medium disabled:opacity-50"
            >
              {loading ? 'Testing...' : '🧪 Run All Tests'}
            </button>
            <button
              onClick={testProxyFetch}
              disabled={loading}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            >
              Test Proxy Only
            </button>
            <button
              onClick={testWebSocket}
              disabled={loading}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            >
              Test WebSocket Only
            </button>
            <button
              onClick={clearLogs}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded"
            >
              Clear
            </button>
            {connectionWorking && (
              <button
                onClick={saveGateway}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded font-medium"
              >
                💾 Save & Use in Dashboard
              </button>
            )}
          </div>
          
          {connectionWorking && (
            <div className="mt-2 p-2 bg-green-900/30 border border-green-700 rounded text-sm">
              ✅ Connection verified! Click "Save & Use in Dashboard" to add this gateway, then go to the main dashboard.
            </div>
          )}
        </div>
        
        {/* Results */}
        <div className="bg-gray-900 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">Results</h2>
          <div className="space-y-2 max-h-[600px] overflow-y-auto font-mono text-sm">
            {results.length === 0 ? (
              <div className="text-gray-500">No results yet. Click "Run All Tests" to start.</div>
            ) : (
              results.map((r, i) => (
                <div 
                  key={i} 
                  className={`p-2 rounded ${
                    r.type.includes('error') ? 'bg-red-900/30 border border-red-800' :
                    r.type.includes('success') ? 'bg-green-900/30 border border-green-800' :
                    r.type === 'info' ? 'bg-gray-800' :
                    'bg-blue-900/20 border border-blue-800'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                    <span>{r.type}</span>
                    <span>{r.time.split('T')[1].split('.')[0]}</span>
                  </div>
                  <pre className="whitespace-pre-wrap break-all text-xs">
                    {typeof r.data === 'string' ? r.data : JSON.stringify(r.data, null, 2)}
                  </pre>
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Help */}
        <div className="mt-6 text-sm text-gray-500">
          <h3 className="font-semibold text-gray-400 mb-2">Troubleshooting</h3>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Direct fetch fails with CORS:</strong> Expected - browsers block cross-origin requests</li>
            <li><strong>Proxy returns 401:</strong> Wrong token. Try OPENCLAW_GATEWAY_PASSWORD env var value</li>
            <li><strong>Proxy returns 404:</strong> Tool not allowed by policy, or gateway not exposing /tools/invoke</li>
            <li><strong>WebSocket fails:</strong> Check if gateway URL is accessible from this browser</li>
            <li><strong>Empty sessions:</strong> Gateway is reachable but has no session data</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
