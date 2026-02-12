import { createFileRoute } from '@tanstack/react-router'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

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

interface StoredAgent {
  id: string
  name: string
  role: string
  team: string
  icon: string
  gatewayUrl: string
  gatewayToken: string | null
  createdAt: number
}

// Storage for connected agents
const AGENTS_STORAGE_PATH = join(homedir(), '.openclaw', 'clawview-agents.json')

function loadStoredAgents(): StoredAgent[] {
  try {
    if (existsSync(AGENTS_STORAGE_PATH)) {
      return JSON.parse(readFileSync(AGENTS_STORAGE_PATH, 'utf-8'))
    }
  } catch {}
  return []
}

function saveStoredAgents(agents: StoredAgent[]): void {
  const dir = join(homedir(), '.openclaw')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(AGENTS_STORAGE_PATH, JSON.stringify(agents, null, 2))
}

interface SessionEntry {
  key: string
  kind?: string
  channel?: string
  displayName?: string
  updatedAt?: number
  model?: string
  totalTokens?: number
}

// Read local OpenClaw data directly from filesystem
function getLocalOpenClawData(): {
  status: 'online' | 'offline' | 'error'
  sessions: SessionEntry[]
  totalCost: number
  agentName: string
} {
  try {
    const openclawDir = join(homedir(), '.openclaw')
    const sessionsDir = join(openclawDir, 'agents', 'main', 'sessions')
    const configPath = join(openclawDir, 'openclaw.json')
    
    // Check if OpenClaw is installed
    if (!existsSync(openclawDir)) {
      return { status: 'offline', sessions: [], totalCost: 0, agentName: 'Local Agent' }
    }
    
    // Read config for agent name
    let agentName = 'Local Agent'
    if (existsSync(configPath)) {
      try {
        const config = JSON.parse(readFileSync(configPath, 'utf-8'))
        agentName = config.agents?.defaults?.name || 'Local Agent'
      } catch {}
    }
    
    // Read sessions index
    const sessionsIndexPath = join(sessionsDir, 'sessions.json')
    if (!existsSync(sessionsIndexPath)) {
      return { status: 'online', sessions: [], totalCost: 0, agentName }
    }
    
    const sessionsData = JSON.parse(readFileSync(sessionsIndexPath, 'utf-8'))
    // Sessions are stored directly as keys in the object (not under a "sessions" property)
    const sessions: SessionEntry[] = Object.entries(sessionsData).map(
      ([key, entry]: [string, any]) => ({
        key,
        kind: entry.kind,
        channel: entry.channel || entry.origin?.provider,
        displayName: entry.origin?.label || key,
        updatedAt: entry.updatedAt,
        model: entry.model,
        totalTokens: entry.totalTokens,
      })
    )
    
    // Calculate rough cost estimate (simplified)
    let totalCost = 0
    for (const session of sessions) {
      // Rough estimate: $0.003 per 1K tokens for Claude
      if (session.totalTokens) {
        totalCost += (session.totalTokens / 1000) * 0.003
      }
    }
    
    return { status: 'online', sessions, totalCost, agentName }
  } catch (error) {
    console.error('Error reading OpenClaw data:', error)
    return { status: 'error', sessions: [], totalCost: 0, agentName: 'Local Agent' }
  }
}

export const Route = createFileRoute('/api/agents')({
  server: {
    handlers: {
      GET: async () => {
        // Read local OpenClaw data directly
        const localData = getLocalOpenClawData()
        
        const localAgent: Agent = {
          id: 'local',
          name: localData.agentName,
          role: 'OpenClaw Gateway',
          team: 'Local',
          avatar: '🦞',
          gatewayUrl: 'http://localhost:18789',
          gatewayToken: null,
          status: localData.status === 'online' 
            ? (localData.sessions.length > 0 ? 'active' : 'idle')
            : 'offline',
          gatewayStatus: localData.status,
          totalCost: localData.totalCost,
          taskCount: localData.sessions.length,
          activeSessions: localData.sessions.filter(s => 
            s.kind === 'main' || !s.kind
          ).length,
        }
        
        // Load stored remote agents
        const storedAgents = loadStoredAgents()
        const remoteAgents: Agent[] = storedAgents.map(stored => ({
          id: stored.id,
          name: stored.name,
          role: stored.role || 'Agent',
          team: stored.team || 'Remote',
          avatar: stored.icon || '🤖',
          gatewayUrl: stored.gatewayUrl,
          gatewayToken: stored.gatewayToken,
          status: 'idle' as const, // Would need to ping to check
          gatewayStatus: 'offline' as const, // Would need to ping to check
          totalCost: 0,
          taskCount: 0,
          activeSessions: 0,
        }))
        
        const agents = [localAgent, ...remoteAgents]
        
        return new Response(JSON.stringify({
          agents,
          stats: {
            totalAgents: agents.length,
            activeAgents: agents.filter(a => a.status === 'active').length,
            onlineAgents: agents.filter(a => a.gatewayStatus === 'online').length,
            totalCost: localData.totalCost,
          },
        }), {
          headers: { 'Content-Type': 'application/json' },
        })
      },
      
      POST: async ({ request }) => {
        try {
          const body = await request.json()
          const { name, role, team, icon, gatewayUrl, gatewayToken } = body
          
          if (!name || !gatewayUrl) {
            return new Response(JSON.stringify({ error: 'Name and gateway URL required' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            })
          }
          
          const newAgent: StoredAgent = {
            id: `agent-${Date.now()}`,
            name,
            role: role || '',
            team: team || '',
            icon: icon || '🤖',
            gatewayUrl,
            gatewayToken: gatewayToken || null,
            createdAt: Date.now(),
          }
          
          const agents = loadStoredAgents()
          agents.push(newAgent)
          saveStoredAgents(agents)
          
          return new Response(JSON.stringify({ success: true, agent: newAgent }), {
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (error) {
          return new Response(JSON.stringify({ error: 'Failed to add agent' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          })
        }
      },
    },
  },
})
