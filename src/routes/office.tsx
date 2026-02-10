import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'

export const Route = createFileRoute('/office')({
  component: OfficePage,
})

interface Agent {
  id: string
  name: string
  role: string
  status: 'active' | 'idle' | 'offline'
  taskCount: number
  totalCost: number
  currentTask?: string
  x: number
  y: number
}

interface Contractor {
  id: string
  parentId: string
  task: string
  status: 'running' | 'completed'
  offset: number
}

// Simple 2D isometric office - pixel art style inspired by SkyOffice
function OfficePage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/agents')
        const data = await res.json()
        
        const agentList: Agent[] = (data.agents || []).map((a: any, i: number) => ({
          id: a.id,
          name: a.name,
          role: a.role || 'Agent',
          status: a.status,
          taskCount: a.taskCount || 0,
          totalCost: a.totalCost || 0,
          currentTask: a.status === 'active' ? 'Working...' : undefined,
          x: 200 + (i % 3) * 180,
          y: 200 + Math.floor(i / 3) * 140,
        }))

        if (agentList.length === 0) {
          agentList.push({
            id: 'demo-1',
            name: 'Molty',
            role: 'Primary Agent',
            status: 'active',
            taskCount: 42,
            totalCost: 12.50,
            currentTask: 'Building ClawView',
            x: 300,
            y: 250,
          })
        }

        setAgents(agentList)
        setContractors([
          { id: 'c1', parentId: agentList[0]?.id, task: 'Research', status: 'running', offset: 0 },
          { id: 'c2', parentId: agentList[0]?.id, task: 'Code Review', status: 'running', offset: 1 },
        ])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const activeAgent = agents.find(a => a.id === (hoveredAgent || selectedAgent))

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#1a1a2e] flex items-center justify-center text-gray-400 text-sm">
        Loading office...
      </div>
    )
  }

  return (
    <div className="h-screen w-screen bg-[#1a1a2e] relative overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 p-3 flex items-center justify-between">
        <Link 
          to="/" 
          className="text-xs text-gray-400 hover:text-white bg-black/40 px-3 py-1.5 rounded backdrop-blur-sm"
        >
          ← Dashboard
        </Link>
        <div className="text-xs text-gray-400 bg-black/40 px-3 py-1.5 rounded backdrop-blur-sm">
          🏢 Agent Office
        </div>
      </div>

      {/* Office Floor */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div 
          className="relative"
          style={{
            width: '800px',
            height: '600px',
            background: 'linear-gradient(135deg, #2d2d44 0%, #1a1a2e 100%)',
            borderRadius: '8px',
            boxShadow: 'inset 0 2px 20px rgba(0,0,0,0.5)',
          }}
        >
          {/* Grid pattern */}
          <div 
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px',
            }}
          />

          {/* Desks/Workstations */}
          <Workstation x={100} y={100} label="Research" color="#3b82f6" />
          <Workstation x={500} y={100} label="Coding" color="#22c55e" />
          <Workstation x={100} y={380} label="Comms" color="#f59e0b" />
          <Workstation x={500} y={380} label="Ops" color="#ef4444" />

          {/* Central Hub */}
          <div 
            className="absolute"
            style={{ left: '350px', top: '250px', transform: 'translate(-50%, -50%)' }}
          >
            <div className="w-20 h-20 rounded-full bg-purple-500/20 border-2 border-purple-500/40 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-purple-500/40 animate-pulse" />
            </div>
          </div>

          {/* Agents */}
          {agents.map(agent => (
            <AgentSprite
              key={agent.id}
              agent={agent}
              isSelected={selectedAgent === agent.id}
              isHovered={hoveredAgent === agent.id}
              contractors={contractors.filter(c => c.parentId === agent.id)}
              onSelect={() => setSelectedAgent(selectedAgent === agent.id ? null : agent.id)}
              onHover={(h) => setHoveredAgent(h ? agent.id : null)}
            />
          ))}
        </div>
      </div>

      {/* Agent Info Panel */}
      {activeAgent && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-gray-900/95 border border-gray-700 rounded-lg p-4 min-w-64 backdrop-blur-sm shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
                activeAgent.status === 'active' ? 'bg-green-500/20' :
                activeAgent.status === 'idle' ? 'bg-yellow-500/20' : 'bg-gray-500/20'
              }`}>
                🦞
              </div>
              <div>
                <div className="text-white font-medium text-sm">{activeAgent.name}</div>
                <div className="text-gray-400 text-xs">{activeAgent.role}</div>
              </div>
              <div className={`ml-auto px-2 py-0.5 rounded text-xs ${
                activeAgent.status === 'active' ? 'bg-green-500/20 text-green-400' :
                activeAgent.status === 'idle' ? 'bg-yellow-500/20 text-yellow-400' : 
                'bg-gray-500/20 text-gray-400'
              }`}>
                {activeAgent.status}
              </div>
            </div>
            {activeAgent.currentTask && (
              <div className="text-xs text-gray-400 mb-2 px-2 py-1 bg-gray-800/50 rounded">
                📋 {activeAgent.currentTask}
              </div>
            )}
            <div className="flex justify-between text-xs pt-2 border-t border-gray-700">
              <span className="text-gray-500">{activeAgent.taskCount} tasks</span>
              <span className="text-green-400">${activeAgent.totalCost.toFixed(2)}</span>
            </div>
            {contractors.filter(c => c.parentId === activeAgent.id).length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-700">
                <div className="text-xs text-gray-500 mb-1">Contractors</div>
                <div className="flex gap-1">
                  {contractors.filter(c => c.parentId === activeAgent.id).map(c => (
                    <span key={c.id} className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">
                      {c.task}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-black/40 backdrop-blur-sm rounded p-2 text-xs">
        <div className="flex items-center gap-3 text-gray-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400"/> Active</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400"/> Idle</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400"/> Contractor</span>
        </div>
      </div>

      {/* Help */}
      <div className="absolute bottom-4 right-4 z-10 bg-black/40 backdrop-blur-sm rounded p-2 text-xs text-gray-500">
        Click agent for details
      </div>
    </div>
  )
}

function Workstation({ x, y, label, color }: { x: number, y: number, label: string, color: string }) {
  return (
    <div 
      className="absolute"
      style={{ left: x, top: y }}
    >
      <div 
        className="w-24 h-16 rounded-lg flex items-center justify-center text-xs font-medium"
        style={{ 
          background: `linear-gradient(135deg, ${color}20, ${color}10)`,
          border: `1px solid ${color}40`,
        }}
      >
        <span style={{ color }}>{label}</span>
      </div>
    </div>
  )
}

function AgentSprite({ 
  agent, 
  isSelected, 
  isHovered,
  contractors,
  onSelect,
  onHover,
}: { 
  agent: Agent
  isSelected: boolean
  isHovered: boolean
  contractors: Contractor[]
  onSelect: () => void
  onHover: (h: boolean) => void
}) {
  const [frame, setFrame] = useState(0)
  
  // Simple idle animation
  useEffect(() => {
    if (agent.status !== 'active') return
    const interval = setInterval(() => {
      setFrame(f => (f + 1) % 2)
    }, 500)
    return () => clearInterval(interval)
  }, [agent.status])

  const statusColor = agent.status === 'active' ? '#22c55e' : 
    agent.status === 'idle' ? '#eab308' : '#6b7280'

  return (
    <div
      className="absolute cursor-pointer transition-transform"
      style={{ 
        left: agent.x, 
        top: agent.y,
        transform: `translate(-50%, -50%) ${isHovered ? 'scale(1.1)' : 'scale(1)'}`,
      }}
      onClick={onSelect}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      {/* Shadow */}
      <div 
        className="absolute w-8 h-2 bg-black/30 rounded-full blur-sm"
        style={{ bottom: '-4px', left: '50%', transform: 'translateX(-50%)' }}
      />
      
      {/* Character body */}
      <div className="relative">
        {/* Body */}
        <div 
          className="w-8 h-10 rounded-t-lg"
          style={{
            background: `linear-gradient(180deg, #4a4a6a 0%, #3a3a5a 100%)`,
            transform: frame === 1 ? 'translateY(-1px)' : 'translateY(0)',
          }}
        />
        
        {/* Head */}
        <div 
          className="absolute w-10 h-10 rounded-full -top-6 -left-1"
          style={{
            background: `linear-gradient(180deg, #5a5a7a 0%, #4a4a6a 100%)`,
            border: `2px solid ${isSelected ? '#8b5cf6' : statusColor}`,
            boxShadow: isSelected ? '0 0 12px rgba(139, 92, 246, 0.5)' : 'none',
          }}
        >
          {/* Eyes */}
          <div 
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{ background: statusColor, top: '14px', left: '10px' }}
          />
          <div 
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{ background: statusColor, top: '14px', right: '10px' }}
          />
        </div>

        {/* Status indicator */}
        <div 
          className="absolute w-3 h-3 rounded-full -top-8 -right-1 border-2 border-gray-900"
          style={{ background: statusColor }}
        />

        {/* Name tag */}
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="text-xs text-white bg-black/60 px-1.5 py-0.5 rounded">
            {agent.name}
          </span>
        </div>
      </div>

      {/* Orbiting contractors */}
      {contractors.map((c, i) => (
        <ContractorOrb key={c.id} index={i} total={contractors.length} />
      ))}
    </div>
  )
}

function ContractorOrb({ index, total }: { index: number, total: number }) {
  const [angle, setAngle] = useState(index * (360 / total))
  
  useEffect(() => {
    const interval = setInterval(() => {
      setAngle(a => (a + 2) % 360)
    }, 50)
    return () => clearInterval(interval)
  }, [])

  const radius = 30
  const x = Math.cos((angle * Math.PI) / 180) * radius
  const y = Math.sin((angle * Math.PI) / 180) * radius * 0.5 // Flatten for isometric feel

  return (
    <div
      className="absolute w-3 h-3 rounded-full bg-purple-500 shadow-lg shadow-purple-500/50"
      style={{
        left: `calc(50% + ${x}px)`,
        top: `calc(30% + ${y}px)`,
        transform: 'translate(-50%, -50%)',
      }}
    />
  )
}
