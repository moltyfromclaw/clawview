import { createFileRoute } from '@tanstack/react-router'

// Types
interface Agent {
  id: string
  name: string
  role: string
  team: string
  avatar: string
  gatewayUrl: string
  gatewayToken: string | null
  status: 'active' | 'idle' | 'offline'
  gatewayStatus: 'online' | 'offline' | 'error'
  totalCost: number
  taskCount: number
  activeSessions: number
}

// Fetch status from a gateway
async function fetchGatewayStatus(agent: { gatewayUrl: string; gatewayToken: string | null }): Promise<{
  status: 'online' | 'offline' | 'error'
  sessions: Array<{ sessionKey: string; label?: string; kind?: string }>
  error?: string
}> {
  try {
    const url = `${agent.gatewayUrl}/api/sessions`
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    
    if (agent.gatewayToken) {
      headers['Authorization'] = `Bearer ${agent.gatewayToken}`
    }
    
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: controller.signal,
    })
    
    clearTimeout(timeout)
    
    if (!response.ok) {
      return { status: 'error', sessions: [], error: `HTTP ${response.status}` }
    }
    
    const data = await response.json()
    return { status: 'online', sessions: data.sessions || [] }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { 
      status: message.includes('abort') ? 'offline' : 'error', 
      sessions: [], 
      error: message 
    }
  }
}

export const Route = createFileRoute('/api/agents')({
  server: {
    handlers: {
      GET: async () => {
        // TODO: Get agents from D1 database when in SaaS mode
        // For now, return empty array (no registered agents)
        const agents: Agent[] = []
        
        // Build response for each agent
        const agentResults = await Promise.all(
          agents.map(async (agent) => {
            const gatewayResult = await fetchGatewayStatus(agent)
            const activeSessions = gatewayResult.sessions.filter(
              s => s.kind === 'main' || !s.kind
            ).length
            
            return {
              ...agent,
              gatewayToken: undefined, // Don't expose
              status: gatewayResult.status === 'online' 
                ? (activeSessions > 0 ? 'active' : 'idle') 
                : 'offline',
              gatewayStatus: gatewayResult.status,
              activeSessions,
            }
          })
        )
        
        return new Response(JSON.stringify({
          agents: agentResults,
          stats: {
            totalAgents: agentResults.length,
            activeAgents: agentResults.filter(a => a.status === 'active').length,
            onlineAgents: agentResults.filter(a => a.gatewayStatus === 'online').length,
            totalCost: 0,
          },
        }), {
          headers: { 'Content-Type': 'application/json' },
        })
      },
    },
  },
})
