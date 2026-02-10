import { createFileRoute, Link } from '@tanstack/react-router'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text, Html, Float, Environment } from '@react-three/drei'
import { useState, useEffect, useRef, Suspense } from 'react'
import * as THREE from 'three'

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
}

interface Contractor {
  id: string
  parentId: string
  task: string
  status: 'running' | 'completed'
  progress: number
}

// Agent avatar component - a stylized robot/character
function AgentAvatar({ 
  agent, 
  position, 
  onClick,
  isSelected,
  contractors = []
}: { 
  agent: Agent
  position: [number, number, number]
  onClick: () => void
  isSelected: boolean
  contractors: Contractor[]
}) {
  const groupRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  
  // Gentle floating animation
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.05
      if (agent.status === 'active') {
        groupRef.current.rotation.y += 0.005
      }
    }
  })

  const color = agent.status === 'active' ? '#22c55e' : 
    agent.status === 'idle' ? '#eab308' : '#6b7280'
  
  const glowColor = agent.status === 'active' ? '#4ade80' : '#fbbf24'

  return (
    <group ref={groupRef} position={position}>
      {/* Main body - hexagonal prism */}
      <mesh
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <cylinderGeometry args={[0.4, 0.5, 0.8, 6]} />
        <meshStandardMaterial 
          color={hovered || isSelected ? '#8b5cf6' : '#1e1e2e'}
          metalness={0.8}
          roughness={0.2}
          emissive={isSelected ? '#8b5cf6' : '#000'}
          emissiveIntensity={isSelected ? 0.3 : 0}
        />
      </mesh>

      {/* Head - sphere with face */}
      <mesh position={[0, 0.6, 0]}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial 
          color="#1e1e2e"
          metalness={0.6}
          roughness={0.3}
        />
      </mesh>

      {/* Eyes - glowing */}
      <mesh position={[-0.1, 0.65, 0.2]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial 
          color={color}
          emissive={color}
          emissiveIntensity={1}
        />
      </mesh>
      <mesh position={[0.1, 0.65, 0.2]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial 
          color={color}
          emissive={color}
          emissiveIntensity={1}
        />
      </mesh>

      {/* Status ring */}
      <mesh position={[0, -0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.6, 0.03, 16, 32]} />
        <meshStandardMaterial 
          color={color}
          emissive={color}
          emissiveIntensity={agent.status === 'active' ? 0.8 : 0.3}
        />
      </mesh>

      {/* Name label */}
      <Text
        position={[0, 1.1, 0]}
        fontSize={0.15}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {agent.name}
      </Text>

      {/* Popup on hover/select */}
      {(hovered || isSelected) && (
        <Html position={[0.8, 0.5, 0]} distanceFactor={10}>
          <div className="bg-gray-900/95 border border-gray-700 rounded-lg p-3 w-48 shadow-xl backdrop-blur-sm">
            <div className="text-white font-medium text-sm mb-1">{agent.name}</div>
            <div className="text-gray-400 text-xs mb-2">{agent.role}</div>
            <div className="flex items-center gap-2 text-xs mb-1">
              <span className={`w-2 h-2 rounded-full ${
                agent.status === 'active' ? 'bg-green-400' : 
                agent.status === 'idle' ? 'bg-yellow-400' : 'bg-gray-400'
              }`} />
              <span className="text-gray-300 capitalize">{agent.status}</span>
            </div>
            {agent.currentTask && (
              <div className="text-xs text-gray-400 mt-2 truncate">
                📋 {agent.currentTask}
              </div>
            )}
            <div className="flex justify-between text-xs mt-2 pt-2 border-t border-gray-700">
              <span className="text-gray-500">{agent.taskCount} tasks</span>
              <span className="text-green-400">${agent.totalCost.toFixed(2)}</span>
            </div>
          </div>
        </Html>
      )}

      {/* Contractor orbitals */}
      {contractors.map((contractor, i) => (
        <ContractorOrb 
          key={contractor.id}
          contractor={contractor}
          index={i}
          total={contractors.length}
        />
      ))}
    </group>
  )
}

// Contractor orb - small orbiting sphere that splits off
function ContractorOrb({ 
  contractor, 
  index, 
  total 
}: { 
  contractor: Contractor
  index: number
  total: number 
}) {
  const ref = useRef<THREE.Mesh>(null)
  const angle = (index / total) * Math.PI * 2
  const radius = 1.2
  
  useFrame((state) => {
    if (ref.current) {
      const t = state.clock.elapsedTime + index
      ref.current.position.x = Math.cos(t * 0.5 + angle) * radius
      ref.current.position.z = Math.sin(t * 0.5 + angle) * radius
      ref.current.position.y = Math.sin(t * 2) * 0.1 + 0.3
    }
  })

  return (
    <Float speed={2} floatIntensity={0.5}>
      <mesh ref={ref}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial 
          color={contractor.status === 'running' ? '#a855f7' : '#22c55e'}
          emissive={contractor.status === 'running' ? '#a855f7' : '#22c55e'}
          emissiveIntensity={0.5}
          transparent
          opacity={0.8}
        />
      </mesh>
    </Float>
  )
}

// Workstation - desk/terminal area
function Workstation({ 
  position, 
  type,
  label
}: { 
  position: [number, number, number]
  type: 'coding' | 'research' | 'comms' | 'ops'
  label: string
}) {
  const colors = {
    coding: '#22c55e',
    research: '#3b82f6',
    comms: '#f59e0b',
    ops: '#ef4444'
  }

  return (
    <group position={position}>
      {/* Desk platform */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[1.5, 1.5, 0.1, 32]} />
        <meshStandardMaterial 
          color="#1e1e2e"
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>
      
      {/* Glow ring */}
      <mesh position={[0, 0.11, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.4, 0.02, 16, 64]} />
        <meshStandardMaterial 
          color={colors[type]}
          emissive={colors[type]}
          emissiveIntensity={0.5}
        />
      </mesh>

      {/* Holographic label */}
      <Text
        position={[0, 0.3, 0]}
        fontSize={0.2}
        color={colors[type]}
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
    </group>
  )
}

// Ground grid
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
      <planeGeometry args={[50, 50, 50, 50]} />
      <meshStandardMaterial 
        color="#0a0a0f"
        wireframe
        transparent
        opacity={0.3}
      />
    </mesh>
  )
}

// Main scene
function Scene({ agents, contractors }: { agents: Agent[], contractors: Contractor[] }) {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)

  // Position agents in a circle
  const agentPositions: [number, number, number][] = agents.map((_, i) => {
    const angle = (i / agents.length) * Math.PI * 2
    const radius = 4
    return [Math.cos(angle) * radius, 0.5, Math.sin(angle) * radius]
  })

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, 10, -10]} intensity={0.5} color="#8b5cf6" />

      <Ground />

      {/* Workstations */}
      <Workstation position={[-6, 0, 0]} type="coding" label="Coding" />
      <Workstation position={[6, 0, 0]} type="research" label="Research" />
      <Workstation position={[0, 0, -6]} type="comms" label="Comms" />
      <Workstation position={[0, 0, 6]} type="ops" label="Ops" />

      {/* Agents */}
      {agents.map((agent, i) => (
        <AgentAvatar
          key={agent.id}
          agent={agent}
          position={agentPositions[i]}
          onClick={() => setSelectedAgent(selectedAgent === agent.id ? null : agent.id)}
          isSelected={selectedAgent === agent.id}
          contractors={contractors.filter(c => c.parentId === agent.id)}
        />
      ))}

      {/* Central hub */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.8, 1, 0.2, 32]} />
        <meshStandardMaterial 
          color="#1e1e2e"
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>
      <mesh position={[0, 0.21, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.7, 0.02, 16, 64]} />
        <meshStandardMaterial 
          color="#8b5cf6"
          emissive="#8b5cf6"
          emissiveIntensity={0.8}
        />
      </mesh>

      <OrbitControls 
        enablePan={false}
        minDistance={5}
        maxDistance={20}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.5}
      />
      
      <Environment preset="night" />
    </>
  )
}

function OfficePage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/agents')
        const data = await res.json()
        
        // Transform agents data
        const agentList: Agent[] = (data.agents || []).map((a: any) => ({
          id: a.id,
          name: a.name,
          role: a.role || 'Agent',
          status: a.status,
          taskCount: a.taskCount || 0,
          totalCost: a.totalCost || 0,
          currentTask: a.status === 'active' ? 'Processing...' : undefined
        }))

        // Add some demo agents if empty
        if (agentList.length === 0) {
          agentList.push({
            id: 'demo-1',
            name: 'Molty',
            role: 'Primary Agent',
            status: 'active',
            taskCount: 42,
            totalCost: 12.50,
            currentTask: 'Building ClawView'
          })
        }

        setAgents(agentList)

        // Demo contractors
        setContractors([
          { id: 'c1', parentId: agentList[0]?.id, task: 'Research', status: 'running', progress: 0.6 },
          { id: 'c2', parentId: agentList[0]?.id, task: 'Code Review', status: 'running', progress: 0.3 },
        ])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  return (
    <div className="h-screen w-screen bg-gray-950 relative">
      {/* Header overlay */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center justify-between">
        <Link 
          to="/" 
          className="text-sm text-gray-400 hover:text-white bg-gray-900/80 px-3 py-1.5 rounded-lg backdrop-blur-sm"
        >
          ← Dashboard
        </Link>
        <div className="text-sm text-gray-400 bg-gray-900/80 px-3 py-1.5 rounded-lg backdrop-blur-sm">
          🏢 Agent Office • {agents.length} agent{agents.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-gray-900/80 backdrop-blur-sm rounded-lg p-3 text-xs">
        <div className="text-gray-400 mb-2 font-medium">Status</div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-gray-300">Active</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-400" />
            <span className="text-gray-300">Idle</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gray-400" />
            <span className="text-gray-300">Offline</span>
          </div>
        </div>
        <div className="text-gray-400 mt-3 mb-2 font-medium">Contractors</div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-purple-400" />
          <span className="text-gray-300">Orbiting spheres</span>
        </div>
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-4 right-4 z-10 bg-gray-900/80 backdrop-blur-sm rounded-lg p-3 text-xs text-gray-400">
        <div>🖱️ Drag to rotate</div>
        <div>🔍 Scroll to zoom</div>
        <div>👆 Click agent for details</div>
      </div>

      {/* 3D Canvas */}
      {loading ? (
        <div className="h-full w-full flex items-center justify-center text-gray-400">
          Loading office...
        </div>
      ) : (
        <Canvas
          camera={{ position: [8, 6, 8], fov: 50 }}
          gl={{ antialias: true }}
        >
          <Suspense fallback={null}>
            <Scene agents={agents} contractors={contractors} />
          </Suspense>
        </Canvas>
      )}
    </div>
  )
}
