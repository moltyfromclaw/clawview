import { createFileRoute, Link } from '@tanstack/react-router'
import { Canvas, useFrame } from '@react-three/fiber'
import { 
  OrbitControls, 
  Environment, 
  ContactShadows,
  Float,
  Text,
  useGLTF,
  Html,
  RoundedBox
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
}

interface Contractor {
  id: string
  parentId: string
  task: string
}

// Cute robot character using primitives (inspired by KayKit style)
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
  
  // Idle animation
  useFrame((state) => {
    if (!groupRef.current) return
    // Gentle bounce
    groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.03
    // Look around when active
    if (isActive) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.2
    }
  })

  const bodyColor = isActive ? color : '#64748b'
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
      <RoundedBox args={[0.5, 0.6, 0.4]} radius={0.1} position={[0, 0.3, 0]}>
        <meshStandardMaterial color={bodyColor} metalness={0.3} roughness={0.4} />
      </RoundedBox>

      {/* Head */}
      <RoundedBox args={[0.45, 0.35, 0.35]} radius={0.08} position={[0, 0.75, 0]}>
        <meshStandardMaterial color={bodyColor} metalness={0.3} roughness={0.4} />
      </RoundedBox>

      {/* Eyes */}
      <mesh position={[-0.1, 0.78, 0.15]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color={glowColor} emissive={glowColor} emissiveIntensity={isActive ? 1 : 0.3} />
      </mesh>
      <mesh position={[0.1, 0.78, 0.15]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color={glowColor} emissive={glowColor} emissiveIntensity={isActive ? 1 : 0.3} />
      </mesh>

      {/* Antenna */}
      <mesh position={[0, 1.0, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.15]} />
        <meshStandardMaterial color="#475569" />
      </mesh>
      <mesh position={[0, 1.1, 0]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial 
          color={isActive ? '#22c55e' : '#ef4444'} 
          emissive={isActive ? '#22c55e' : '#ef4444'} 
          emissiveIntensity={0.8} 
        />
      </mesh>

      {/* Arms */}
      <RoundedBox args={[0.12, 0.35, 0.12]} radius={0.03} position={[-0.35, 0.25, 0]}>
        <meshStandardMaterial color={bodyColor} metalness={0.3} roughness={0.4} />
      </RoundedBox>
      <RoundedBox args={[0.12, 0.35, 0.12]} radius={0.03} position={[0.35, 0.25, 0]}>
        <meshStandardMaterial color={bodyColor} metalness={0.3} roughness={0.4} />
      </RoundedBox>

      {/* Legs */}
      <RoundedBox args={[0.15, 0.25, 0.15]} radius={0.03} position={[-0.12, -0.12, 0]}>
        <meshStandardMaterial color={bodyColor} metalness={0.3} roughness={0.4} />
      </RoundedBox>
      <RoundedBox args={[0.15, 0.25, 0.15]} radius={0.03} position={[0.12, -0.12, 0]}>
        <meshStandardMaterial color={bodyColor} metalness={0.3} roughness={0.4} />
      </RoundedBox>

      {/* Selection ring */}
      {(hovered || isSelected) && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 0.55, 32]} />
          <meshBasicMaterial color="#8b5cf6" transparent opacity={0.8} />
        </mesh>
      )}

      {/* Name label */}
      <Text
        position={[0, 1.3, 0]}
        fontSize={0.12}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.01}
        outlineColor="black"
      >
        {name}
      </Text>
    </group>
  )
}

// Mini orb for contractors
function ContractorOrb({ parentPosition, index, total }: { 
  parentPosition: [number, number, number]
  index: number 
  total: number 
}) {
  const ref = useRef<THREE.Mesh>(null)
  
  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime + index * (Math.PI * 2 / total)
    const radius = 0.8
    ref.current.position.x = parentPosition[0] + Math.cos(t) * radius
    ref.current.position.z = parentPosition[2] + Math.sin(t) * radius
    ref.current.position.y = parentPosition[1] + 0.5 + Math.sin(t * 2) * 0.1
  })

  return (
    <Float speed={3} floatIntensity={0.3}>
      <mesh ref={ref}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial 
          color="#a855f7" 
          emissive="#a855f7" 
          emissiveIntensity={0.5}
          transparent
          opacity={0.9}
        />
      </mesh>
    </Float>
  )
}

// Desk workstation
function Desk({ position, label, color }: { 
  position: [number, number, number]
  label: string 
  color: string
}) {
  return (
    <group position={position}>
      {/* Desk surface */}
      <RoundedBox args={[1.2, 0.08, 0.8]} radius={0.02} position={[0, 0.5, 0]}>
        <meshStandardMaterial color="#1e293b" metalness={0.2} roughness={0.8} />
      </RoundedBox>
      {/* Desk legs */}
      {[[-0.5, 0, -0.3], [0.5, 0, -0.3], [-0.5, 0, 0.3], [0.5, 0, 0.3]].map((pos, i) => (
        <mesh key={i} position={[pos[0], 0.25, pos[2]]}>
          <cylinderGeometry args={[0.03, 0.03, 0.5]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
      ))}
      {/* Monitor */}
      <RoundedBox args={[0.5, 0.35, 0.03]} radius={0.01} position={[0, 0.75, -0.2]}>
        <meshStandardMaterial color="#0f172a" />
      </RoundedBox>
      {/* Screen glow */}
      <mesh position={[0, 0.75, -0.18]}>
        <planeGeometry args={[0.45, 0.3]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
      </mesh>
      {/* Label */}
      <Text
        position={[0, 0.2, 0.5]}
        fontSize={0.1}
        color={color}
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
    </group>
  )
}

// Floor grid
function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
      <planeGeometry args={[20, 20]} />
      <meshStandardMaterial color="#0f172a" />
    </mesh>
  )
}

function Scene({ agents, contractors, selectedAgent, onSelectAgent }: {
  agents: Agent[]
  contractors: Contractor[]
  selectedAgent: string | null
  onSelectAgent: (id: string | null) => void
}) {
  const agentColors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981']
  
  const positions: [number, number, number][] = [
    [0, 0, 0],
    [-2, 0, 1.5],
    [2, 0, 1.5],
    [-2, 0, -1.5],
    [2, 0, -1.5],
  ]

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} castShadow />
      <pointLight position={[-5, 5, -5]} intensity={0.3} color="#8b5cf6" />

      <Floor />
      <ContactShadows position={[0, 0, 0]} opacity={0.4} blur={2} />

      {/* Desks */}
      <Desk position={[-3.5, 0, 0]} label="Research" color="#3b82f6" />
      <Desk position={[3.5, 0, 0]} label="Coding" color="#22c55e" />
      <Desk position={[0, 0, -3]} label="Comms" color="#f59e0b" />
      <Desk position={[0, 0, 3]} label="Ops" color="#ef4444" />

      {/* Agents */}
      {agents.map((agent, i) => (
        <Robot
          key={agent.id}
          position={positions[i] || [i * 1.5 - 2, 0, 0]}
          color={agentColors[i % agentColors.length]}
          isActive={agent.status === 'active'}
          name={agent.name}
          onClick={() => onSelectAgent(selectedAgent === agent.id ? null : agent.id)}
          isSelected={selectedAgent === agent.id}
        />
      ))}

      {/* Contractors orbiting their parent agents */}
      {contractors.map((c, i) => {
        const parentIndex = agents.findIndex(a => a.id === c.parentId)
        const parentPos = positions[parentIndex] || [0, 0, 0]
        const agentContractors = contractors.filter(cc => cc.parentId === c.parentId)
        const indexInParent = agentContractors.indexOf(c)
        return (
          <ContractorOrb 
            key={c.id} 
            parentPosition={parentPos}
            index={indexInParent}
            total={agentContractors.length}
          />
        )
      })}

      <OrbitControls 
        enablePan={false}
        minDistance={4}
        maxDistance={15}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.2}
        target={[0, 0.5, 0]}
      />
      
      <Environment preset="city" />
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
        
        const agentList: Agent[] = (data.agents || []).map((a: any) => ({
          id: a.id,
          name: a.name,
          status: a.status,
          taskCount: a.taskCount || 0,
          totalCost: a.totalCost || 0,
          currentTask: a.status === 'active' ? 'Working...' : undefined
        }))

        if (agentList.length === 0) {
          agentList.push({
            id: 'demo-1',
            name: 'Molty',
            status: 'active',
            taskCount: 42,
            totalCost: 12.50,
            currentTask: 'Building ClawView'
          })
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
    <div className="h-screen w-screen bg-gray-950 relative">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-3 flex items-center justify-between pointer-events-none">
        <Link 
          to="/" 
          className="text-xs text-gray-400 hover:text-white bg-gray-900/80 px-3 py-1.5 rounded backdrop-blur-sm pointer-events-auto"
        >
          ← Dashboard
        </Link>
        <div className="text-xs text-gray-400 bg-gray-900/80 px-3 py-1.5 rounded backdrop-blur-sm">
          🏢 Agent Office
        </div>
      </div>

      {/* Agent info panel */}
      {activeAgent && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-gray-900/95 border border-gray-700 rounded-lg p-4 min-w-56 backdrop-blur-sm">
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

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-gray-900/80 backdrop-blur-sm rounded p-2 text-xs text-gray-400">
        <div className="flex items-center gap-1 mb-1"><span className="w-2 h-2 rounded-full bg-green-400"/> Active</div>
        <div className="flex items-center gap-1 mb-1"><span className="w-2 h-2 rounded-full bg-gray-400"/> Idle</div>
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400"/> Contractor</div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 right-4 z-10 bg-gray-900/80 backdrop-blur-sm rounded p-2 text-xs text-gray-500">
        Drag to rotate • Scroll to zoom
      </div>

      {/* 3D Canvas */}
      {loading ? (
        <div className="h-full w-full flex items-center justify-center text-gray-400 text-sm">
          Loading...
        </div>
      ) : (
        <Canvas camera={{ position: [6, 4, 6], fov: 45 }} shadows>
          <Suspense fallback={null}>
            <Scene 
              agents={agents} 
              contractors={contractors}
              selectedAgent={selectedAgent}
              onSelectAgent={setSelectedAgent}
            />
          </Suspense>
        </Canvas>
      )}
    </div>
  )
}
