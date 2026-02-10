import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'

export const Route = createFileRoute('/')({
  component: Dashboard,
})

interface Agent {
  id: string
  name: string
  role: string
  team: string
  avatar: string
  status: 'active' | 'idle' | 'offline'
  gatewayUrl: string
  gatewayStatus: 'online' | 'offline' | 'error'
  totalCost: number
  taskCount: number
  activeSessions: number
}

interface Stats {
  totalAgents: number
  activeAgents: number
  onlineAgents: number
  totalCost: number
}

function formatCost(cost: number | undefined | null): string {
  if (cost === undefined || cost === null) return '$0.0000'
  return `$${cost.toFixed(4)}`
}

function Dashboard() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAgents()
  }, [])

  async function fetchAgents() {
    try {
      const res = await fetch('/api/agents')
      if (!res.ok) throw new Error('Failed to fetch agents')
      const data = await res.json()
      setAgents(data.agents || [])
      setStats(data.stats || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🦞</span>
              <h1 className="text-xl font-bold">ClawView</h1>
              <span className="text-sm text-gray-500">Agent Dashboard</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                Live
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <div className="text-gray-400 text-sm mb-1">Total Agents</div>
              <div className="text-2xl font-bold">{stats.totalAgents}</div>
            </div>
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <div className="text-gray-400 text-sm mb-1">Active</div>
              <div className="text-2xl font-bold text-green-400">{stats.activeAgents}</div>
            </div>
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <div className="text-gray-400 text-sm mb-1">Online</div>
              <div className="text-2xl font-bold text-blue-400">{stats.onlineAgents}</div>
            </div>
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <div className="text-gray-400 text-sm mb-1">Total Spend</div>
              <div className="text-2xl font-bold text-green-400">{formatCost(stats.totalCost)}</div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-gray-400">Loading agents...</div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-8">
            <div className="text-red-400">{error}</div>
          </div>
        )}

        {/* Agents Grid */}
        {!loading && agents.length === 0 && !error && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🦞</div>
            <h2 className="text-xl font-bold mb-2">No agents registered</h2>
            <p className="text-gray-400 mb-6">Connect your first OpenClaw agent to get started.</p>
            <button className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium transition-colors">
              Add Agent
            </button>
          </div>
        )}

        {agents.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="bg-gray-900 rounded-xl p-4 border border-gray-800 hover:border-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-2xl">{agent.avatar || '🤖'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{agent.name}</div>
                    <div className="text-sm text-gray-400 truncate">{agent.role}</div>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${
                    agent.gatewayStatus === 'online' ? 'bg-green-400' :
                    agent.gatewayStatus === 'error' ? 'bg-red-400' : 'bg-gray-400'
                  }`} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <div className="text-gray-500">Sessions</div>
                    <div className="font-medium">{agent.activeSessions || 0}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Tasks</div>
                    <div className="font-medium">{agent.taskCount || 0}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Cost</div>
                    <div className="font-medium text-green-400">{formatCost(agent.totalCost)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
