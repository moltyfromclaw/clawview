import { createFileRoute } from '@tanstack/react-router'
import { readFileSync, readdirSync, existsSync } from 'fs'
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
        
        const agents = [localAgent]
        
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
    },
  },
})
