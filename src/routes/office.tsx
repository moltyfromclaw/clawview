import { createFileRoute, Link } from '@tanstack/react-router'
import { Canvas, useFrame } from '@react-three/fiber'
import { 
  OrbitControls, 
  Float,
  Text,
  RoundedBox,
  Sparkles,
  Line
} from '@react-three/drei'
import { useState, useEffect, useRef, Suspense } from 'react'
import * as THREE from 'three'

export const Route = createFileRoute('/office')({
  component: OfficePage,
})

interface Agent {
  id: string
  name: string
  status: 'active' | 'idle' | 'offline'
  taskCount: number
  totalCost: number
  currentTask?: string
  zone?: string
}

interface Contractor {
  id: string
  parentId: string
  task: string
}

// Cute robot character
function Robot({ 
  color = '#6366f1',
  position = [0, 0, 0] as [number, number, number],
  isActive = false,
  name = 'Agent',
  onClick,
  isSelected = false,
}: {
  color?: string
  position?: [number, number, number]
  isActive?: boolean
  name?: string
  onClick?: () => void
  isSelected?: boolean
}) {
  const groupRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  
  useFrame((state) => {
    if (!groupRef.current) return
    groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.02
    if (isActive) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.15
    }
  })

  const glowColor = isActive ? '#22c55e' : '#94a3b8'

  return (
    <group 
      ref={groupRef} 
      position={position}
      onClick={onClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Body */}
      <RoundedBox args={[0.35, 0.45, 0.3]} radius={0.08} position={[0, 0.23, 0]}>
        <meshStandardMaterial color={color} metalness={0.2} roughness={0.6} />
      </RoundedBox>
      
      {/* Head */}
      <RoundedBox args={[0.32, 0.26, 0.26]} radius={0.06} position={[0, 0.55, 0]}>
        <meshStandardMaterial color={color} metalness={0.2} roughness={0.6} />
      </RoundedBox>
      
      {/* Eyes */}
      <mesh position={[-0.07, 0.57, 0.11]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color={glowColor} emissive={glowColor} emissiveIntensity={isActive ? 1.5 : 0.3} />
      </mesh>
      <mesh position={[0.07, 0.57, 0.11]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color={glowColor} emissive={glowColor} emissiveIntensity={isActive ? 1.5 : 0.3} />
      </mesh>

      {/* Arms */}
      <RoundedBox args={[0.08, 0.22, 0.08]} radius={0.02} position={[-0.24, 0.18, 0]}>
        <meshStandardMaterial color={color} metalness={0.2} roughness={0.6} />
      </RoundedBox>
      <RoundedBox args={[0.08, 0.22, 0.08]} radius={0.02} position={[0.24, 0.18, 0]}>
        <meshStandardMaterial color={color} metalness={0.2} roughness={0.6} />
      </RoundedBox>

      {/* Legs */}
      <RoundedBox args={[0.1, 0.15, 0.1]} radius={0.02} position={[-0.08, -0.07, 0]}>
        <meshStandardMaterial color={color} metalness={0.2} roughness={0.6} />
      </RoundedBox>
      <RoundedBox args={[0.1, 0.15, 0.1]} radius={0.02} position={[0.08, -0.07, 0]}>
        <meshStandardMaterial color={color} metalness={0.2} roughness={0.6} />
      </RoundedBox>

      {/* Selection ring */}
      {(hovered || isSelected) && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.35, 0.38, 32]} />
          <meshBasicMaterial color={glowColor} transparent opacity={0.8} />
        </mesh>
      )}

      {/* Status dot */}
      {isActive && (
        <mesh position={[0, 0.78, 0]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={2} />
        </mesh>
      )}

      {/* Name label */}
      <Text position={[0, 0.9, 0]} fontSize={0.12} color={color} anchorX="center" outlineWidth={0.005} outlineColor="#000">
        {name}
      </Text>
    </group>
  )
}

// Contractor orb
function ContractorOrb({ parentPosition, index, total }: { 
  parentPosition: [number, number, number]
  index: number 
  total: number 
}) {
  const ref = useRef<THREE.Mesh>(null)
  
  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime + index * (Math.PI * 2 / total)
    ref.current.position.x = parentPosition[0] + Math.cos(t) * 0.6
    ref.current.position.z = parentPosition[2] + Math.sin(t) * 0.6
    ref.current.position.y = parentPosition[1] + 0.4 + Math.sin(t * 2) * 0.08
  })

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.06, 16, 16]} />
      <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={1} transparent opacity={0.9} />
    </mesh>
  )
}

// Zone with outline (like in the reference image)
function Zone({ 
  position, 
  size = [4, 4], 
  color, 
  label 
}: { 
  position: [number, number, number]
  size?: [number, number]
  color: string
  label: string
}) {
  const [w, h] = size
  const hw = w / 2
  const hh = h / 2
  
  // Corner points for the outline
  const points: [number, number, number][] = [
    [-hw, 0.01, -hh],
    [hw, 0.01, -hh],
    [hw, 0.01, hh],
    [-hw, 0.01, hh],
    [-hw, 0.01, -hh], // close the loop
  ]

  return (
    <group position={position}>
      {/* Zone outline */}
      <Line
        points={points}
        color={color}
        lineWidth={1.5}
        transparent
        opacity={0.8}
      />
      
      {/* Zone label */}
      <Text
        position={[-hw + 0.2, 0.02, hh - 0.3]}
        fontSize={0.25}
        color={color}
        anchorX="left"
        anchorY="top"
        rotation={[-Math.PI / 2, 0, 0]}
      >
        {label}
      </Text>

      {/* Subtle floor fill */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[w - 0.05, h - 0.05]} />
        <meshBasicMaterial color={color} transparent opacity={0.03} />
      </mesh>
    </group>
  )
}

// Dark floor with subtle grid
function Floor() {
  return (
    <group>
      {/* Main dark floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshBasicMaterial color="#0a1014" />
      </mesh>
      
      {/* Subtle grid */}
      <gridHelper args={[40, 40, '#1a2a2a', '#0f1818']} position={[0, 0, 0]} />
    </group>
  )
}

// Background stars/particles
function Stars() {
  return (
    <Sparkles
      count={100}
      scale={30}
      size={1}
      speed={0.1}
      opacity={0.4}
      color="#ffffff"
    />
  )
}

function Scene({ agents, contractors, selectedAgent, onSelectAgent }: {
  agents: Agent[]
  contractors: Contractor[]
  selectedAgent: string | null
  onSelectAgent: (id: string | null) => void
}) {
  const agentColors = ['#f97316', '#8b5cf6', '#3b82f6', '#22c55e', '#ec4899']
  
  const zones = [
    { id: 'coding', position: [0, 0, 0] as [number, number, number], color: '#f97316', label: 'App Development' },
    { id: 'research', position: [-6, 0, 0] as [number, number, number], color: '#3b82f6', label: 'Research' },
    { id: 'comms', position: [6, 0, 0] as [number, number, number], color: '#22c55e', label: 'Communications' },
    { id: 'ops', position: [0, 0, -6] as [number, number, number], color: '#ef4444', label: 'Operations' },
  ]

  const zonePositions: Record<string, [number, number, number]> = {
    coding: [0, 0, 0],
    research: [-6, 0, 0],
    comms: [6, 0, 0],
    ops: [0, 0, -6],
  }

  return (
    <>
      {/* Soft ambient light */}
      <ambientLight intensity={0.4} />
      
      {/* Key lights */}
      <directionalLight position={[5, 10, 5]} intensity={0.4} color="#fff5f0" />
      <pointLight position={[0, 5, 0]} intensity={0.3} color="#f97316" />
      
      {/* Subtle colored rim lights */}
      <pointLight position={[-8, 3, 0]} intensity={0.15} color="#3b82f6" />
      <pointLight position={[8, 3, 0]} intensity={0.15} color="#22c55e" />
      <pointLight position={[0, 3, -8]} intensity={0.15} color="#ef4444" />

      <Floor />
      <Stars />

      {/* Zones */}
      {zones.map(zone => (
        <Zone key={zone.id} position={zone.position} color={zone.color} label={zone.label} />
      ))}

      {/* Agents */}
      {agents.map((agent, i) => {
        const zone = agent.zone || ['coding', 'research', 'comms', 'ops'][i % 4]
        const basePos = zonePositions[zone] || [0, 0, 0]
        const offset = i * 0.8 - (agents.length * 0.4) + 0.4
        const pos: [number, number, number] = [
          basePos[0] + (zone === 'coding' ? offset : 0),
          0,
          basePos[2] + (zone !== 'coding' ? offset * 0.5 : 0.5)
        ]
        
        return (
          <Robot
            key={agent.id}
            position={pos}
            color={agentColors[i % agentColors.length]}
            isActive={agent.status === 'active'}
            name={agent.name}
            onClick={() => onSelectAgent(selectedAgent === agent.id ? null : agent.id)}
            isSelected={selectedAgent === agent.id}
          />
        )
      })}

      {/* Contractors */}
      {contractors.map((c) => {
        const parentIndex = agents.findIndex(a => a.id === c.parentId)
        const zone = agents[parentIndex]?.zone || 'coding'
        const basePos = zonePositions[zone] || [0, 0, 0]
        const agentContractors = contractors.filter(cc => cc.parentId === c.parentId)
        return (
          <ContractorOrb 
            key={c.id} 
            parentPosition={[basePos[0], 0, basePos[2] + 0.5]}
            index={agentContractors.indexOf(c)}
            total={agentContractors.length}
          />
        )
      })}

      <OrbitControls 
        enablePan={false}
        minDistance={6}
        maxDistance={20}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.5}
        target={[0, 0, 0]}
      />
    </>
  )
}

function OfficePage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/agents')
        const data = await res.json()
        
        const zones = ['coding', 'research', 'comms', 'ops']
        const agentList: Agent[] = (data.agents || []).map((a: any, i: number) => ({
          id: a.id,
          name: a.name,
          status: a.status,
          taskCount: a.taskCount || 0,
          totalCost: a.totalCost || 0,
          currentTask: a.status === 'active' ? 'Working...' : undefined,
          zone: zones[i % 4],
        }))

        if (agentList.length === 0) {
          agentList.push(
            { id: 'demo-1', name: 'Molty', status: 'active', taskCount: 42, totalCost: 12.50, currentTask: 'Building ClawView', zone: 'coding' },
            { id: 'demo-2', name: 'Claude', status: 'active', taskCount: 28, totalCost: 8.20, currentTask: 'Code review', zone: 'coding' },
            { id: 'demo-3', name: 'Codex', status: 'idle', taskCount: 15, totalCost: 4.10, zone: 'coding' },
          )
        }

        setAgents(agentList)
        setContractors([
          { id: 'c1', parentId: agentList[0]?.id, task: 'Research' },
          { id: 'c2', parentId: agentList[0]?.id, task: 'Code Review' },
        ])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const activeAgent = agents.find(a => a.id === selectedAgent)

  return (
    <div className="h-screen w-screen bg-[#060a0c] relative overflow-hidden">
      {/* Gradient overlay for depth */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, #060a0c 70%)',
        }}
      />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-3 flex items-center justify-between pointer-events-none">
        <Link to="/" className="text-xs text-gray-400 hover:text-white bg-gray-900/60 px-3 py-1.5 rounded backdrop-blur-sm pointer-events-auto border border-gray-800">
          ← Dashboard
        </Link>
        <div className="text-xs text-gray-400 bg-gray-900/60 px-3 py-1.5 rounded backdrop-blur-sm border border-gray-800">
          🏢 Agent Office
        </div>
      </div>

      {/* Agent info panel */}
      {activeAgent && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-gray-900/90 border border-gray-700 rounded-lg p-4 min-w-56 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-2 h-2 rounded-full ${activeAgent.status === 'active' ? 'bg-green-400' : 'bg-gray-400'}`} />
              <span className="text-white text-sm font-medium">{activeAgent.name}</span>
            </div>
            {activeAgent.currentTask && (
              <div className="text-xs text-gray-400 mb-2">📋 {activeAgent.currentTask}</div>
            )}
            <div className="flex justify-between text-xs pt-2 border-t border-gray-700">
              <span className="text-gray-500">{activeAgent.taskCount} tasks</span>
              <span className="text-green-400">${activeAgent.totalCost.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Controls hint */}
      <div className="absolute bottom-4 right-4 z-10 text-xs text-gray-600">
        Drag to rotate • Scroll to zoom
      </div>

      {/* 3D Canvas */}
      {loading ? (
        <div className="h-full w-full flex items-center justify-center text-gray-500 text-sm">Loading...</div>
      ) : (
        <Canvas camera={{ position: [8, 6, 8], fov: 45 }}>
          <Suspense fallback={null}>
            <Scene agents={agents} contractors={contractors} selectedAgent={selectedAgent} onSelectAgent={setSelectedAgent} />
          </Suspense>
        </Canvas>
      )}
    </div>
  )
}
