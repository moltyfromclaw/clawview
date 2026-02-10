import { createFileRoute, Link } from '@tanstack/react-router'
import { Canvas, useFrame } from '@react-three/fiber'
import { 
  OrbitControls, 
  Environment, 
  ContactShadows,
  Float,
  Text,
  RoundedBox,
  MeshTransmissionMaterial,
  Sparkles
} from '@react-three/drei'
import { useState, useEffect, useRef, Suspense, useMemo } from 'react'
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
    groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.03
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
      <RoundedBox args={[0.4, 0.5, 0.35]} radius={0.08} position={[0, 0.25, 0]}>
        <meshStandardMaterial color={bodyColor} metalness={0.3} roughness={0.4} />
      </RoundedBox>
      <RoundedBox args={[0.38, 0.3, 0.3]} radius={0.06} position={[0, 0.62, 0]}>
        <meshStandardMaterial color={bodyColor} metalness={0.3} roughness={0.4} />
      </RoundedBox>
      <mesh position={[-0.08, 0.65, 0.12]}>
        <sphereGeometry args={[0.045, 16, 16]} />
        <meshStandardMaterial color={glowColor} emissive={glowColor} emissiveIntensity={isActive ? 1 : 0.3} />
      </mesh>
      <mesh position={[0.08, 0.65, 0.12]}>
        <sphereGeometry args={[0.045, 16, 16]} />
        <meshStandardMaterial color={glowColor} emissive={glowColor} emissiveIntensity={isActive ? 1 : 0.3} />
      </mesh>
      <mesh position={[0, 0.85, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.12]} />
        <meshStandardMaterial color="#475569" />
      </mesh>
      <mesh position={[0, 0.93, 0]}>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshStandardMaterial color={isActive ? '#22c55e' : '#ef4444'} emissive={isActive ? '#22c55e' : '#ef4444'} emissiveIntensity={0.8} />
      </mesh>
      <RoundedBox args={[0.1, 0.28, 0.1]} radius={0.02} position={[-0.28, 0.2, 0]}>
        <meshStandardMaterial color={bodyColor} metalness={0.3} roughness={0.4} />
      </RoundedBox>
      <RoundedBox args={[0.1, 0.28, 0.1]} radius={0.02} position={[0.28, 0.2, 0]}>
        <meshStandardMaterial color={bodyColor} metalness={0.3} roughness={0.4} />
      </RoundedBox>
      <RoundedBox args={[0.12, 0.2, 0.12]} radius={0.02} position={[-0.1, -0.1, 0]}>
        <meshStandardMaterial color={bodyColor} metalness={0.3} roughness={0.4} />
      </RoundedBox>
      <RoundedBox args={[0.12, 0.2, 0.12]} radius={0.02} position={[0.1, -0.1, 0]}>
        <meshStandardMaterial color={bodyColor} metalness={0.3} roughness={0.4} />
      </RoundedBox>
      {(hovered || isSelected) && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.4, 0.45, 32]} />
          <meshBasicMaterial color="#8b5cf6" transparent opacity={0.8} />
        </mesh>
      )}
      <Text position={[0, 1.05, 0]} fontSize={0.1} color="white" anchorX="center" outlineWidth={0.008} outlineColor="black">
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
    ref.current.position.x = parentPosition[0] + Math.cos(t) * 0.7
    ref.current.position.z = parentPosition[2] + Math.sin(t) * 0.7
    ref.current.position.y = parentPosition[1] + 0.5 + Math.sin(t * 2) * 0.1
  })

  return (
    <Float speed={3} floatIntensity={0.3}>
      <mesh ref={ref}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={0.5} transparent opacity={0.9} />
      </mesh>
    </Float>
  )
}

// === CODING ZONE - Cyberpunk Hacker Station ===
function CodingZone({ position }: { position: [number, number, number] }) {
  const screenRef = useRef<THREE.Mesh>(null)
  
  useFrame((state) => {
    if (screenRef.current) {
      (screenRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 
        0.3 + Math.sin(state.clock.elapsedTime * 3) * 0.1
    }
  })

  return (
    <group position={position}>
      {/* Platform */}
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[2.5, 2.8, 0.05, 6]} />
        <meshStandardMaterial color="#0c1222" metalness={0.9} roughness={0.1} />
      </mesh>
      
      {/* Neon edge */}
      <mesh position={[0, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.65, 0.02, 8, 6]} />
        <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1} />
      </mesh>

      {/* Main holographic display */}
      <group position={[0, 1.2, -1.5]}>
        <mesh ref={screenRef}>
          <planeGeometry args={[2.5, 1.5]} />
          <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.3} transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
        {/* Code lines effect */}
        {[...Array(8)].map((_, i) => (
          <mesh key={i} position={[-0.8 + Math.random() * 0.3, 0.5 - i * 0.15, 0.01]}>
            <planeGeometry args={[0.8 + Math.random() * 0.8, 0.04]} />
            <meshBasicMaterial color="#22d3ee" transparent opacity={0.6} />
          </mesh>
        ))}
      </group>

      {/* Side monitors */}
      {[-1.8, 1.8].map((x, i) => (
        <group key={i} position={[x, 0.8, -1]} rotation={[0, x > 0 ? -0.4 : 0.4, 0]}>
          <RoundedBox args={[0.8, 0.6, 0.05]} radius={0.02}>
            <meshStandardMaterial color="#0f172a" />
          </RoundedBox>
          <mesh position={[0, 0, 0.03]}>
            <planeGeometry args={[0.7, 0.5]} />
            <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.2} />
          </mesh>
        </group>
      ))}

      {/* Floating data cubes */}
      {[[-0.8, 1.8, 0.5], [0.9, 2, 0.3], [0, 2.2, -0.5]].map((pos, i) => (
        <Float key={i} speed={2} floatIntensity={0.5} rotationIntensity={0.5}>
          <mesh position={pos as [number, number, number]}>
            <boxGeometry args={[0.15, 0.15, 0.15]} />
            <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.5} transparent opacity={0.7} wireframe />
          </mesh>
        </Float>
      ))}

      <Sparkles count={30} scale={4} size={1} speed={0.3} color="#22d3ee" position={[0, 1.5, 0]} />
      
      <Text position={[0, 0.15, 1.8]} fontSize={0.2} color="#22d3ee" anchorX="center">
        CODING
      </Text>
    </group>
  )
}

// === RESEARCH ZONE - Magical Library ===
function ResearchZone({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Platform */}
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[2.5, 2.8, 0.05, 8]} />
        <meshStandardMaterial color="#1c1917" metalness={0.3} roughness={0.8} />
      </mesh>

      {/* Bookshelves */}
      {[-1.5, 1.5].map((x, i) => (
        <group key={i} position={[x, 0, -1.2]} rotation={[0, x > 0 ? -0.3 : 0.3, 0]}>
          {/* Shelf frame */}
          <RoundedBox args={[1, 2, 0.3]} radius={0.02} position={[0, 1, 0]}>
            <meshStandardMaterial color="#78350f" roughness={0.8} />
          </RoundedBox>
          {/* Books */}
          {[0.4, 0.9, 1.4].map((y, j) => (
            <group key={j} position={[0, y, 0.1]}>
              {[...Array(5)].map((_, k) => (
                <RoundedBox key={k} args={[0.08, 0.25, 0.15]} radius={0.01} position={[-0.25 + k * 0.12, 0, 0]}>
                  <meshStandardMaterial color={['#dc2626', '#2563eb', '#16a34a', '#9333ea', '#ca8a04'][k]} />
                </RoundedBox>
              ))}
            </group>
          ))}
        </group>
      ))}

      {/* Floating book/grimoire */}
      <Float speed={1.5} floatIntensity={0.4} rotationIntensity={0.2}>
        <group position={[0, 1.5, 0]}>
          <RoundedBox args={[0.5, 0.6, 0.08]} radius={0.02}>
            <meshStandardMaterial color="#7c2d12" />
          </RoundedBox>
          {/* Glowing runes */}
          <mesh position={[0, 0, 0.05]}>
            <planeGeometry args={[0.35, 0.45]} />
            <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.5} transparent opacity={0.8} />
          </mesh>
        </group>
      </Float>

      {/* Magic particles */}
      <Sparkles count={40} scale={4} size={1.5} speed={0.2} color="#fbbf24" position={[0, 1.2, 0]} />

      {/* Crystal ball */}
      <mesh position={[0, 0.4, 0.8]}>
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshPhysicalMaterial color="#818cf8" transmission={0.9} thickness={0.5} roughness={0} />
      </mesh>
      <mesh position={[0, 0.15, 0.8]}>
        <cylinderGeometry args={[0.15, 0.2, 0.1, 16]} />
        <meshStandardMaterial color="#1c1917" metalness={0.8} />
      </mesh>

      <Text position={[0, 0.15, 1.8]} fontSize={0.2} color="#fbbf24" anchorX="center">
        RESEARCH
      </Text>
    </group>
  )
}

// === COMMS ZONE - Communication Hub ===
function CommsZone({ position }: { position: [number, number, number] }) {
  const antennaRef = useRef<THREE.Group>(null)
  
  useFrame((state) => {
    if (antennaRef.current) {
      antennaRef.current.rotation.y = state.clock.elapsedTime * 0.5
    }
  })

  return (
    <group position={position}>
      {/* Platform */}
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[2.5, 2.8, 0.05, 8]} />
        <meshStandardMaterial color="#0c1a0c" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Central antenna tower */}
      <group ref={antennaRef} position={[0, 0, -0.5]}>
        <mesh position={[0, 1, 0]}>
          <cylinderGeometry args={[0.08, 0.15, 2]} />
          <meshStandardMaterial color="#334155" metalness={0.9} />
        </mesh>
        {/* Satellite dishes */}
        {[0, Math.PI * 0.66, Math.PI * 1.33].map((rot, i) => (
          <group key={i} position={[Math.sin(rot) * 0.4, 1.8, Math.cos(rot) * 0.4]} rotation={[0.3, rot, 0]}>
            <mesh>
              <sphereGeometry args={[0.25, 16, 8, 0, Math.PI]} />
              <meshStandardMaterial color="#64748b" metalness={0.8} side={THREE.DoubleSide} />
            </mesh>
          </group>
        ))}
        {/* Blinking lights */}
        <mesh position={[0, 2.1, 0]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={1} />
        </mesh>
      </group>

      {/* Holographic globe */}
      <Float speed={1} floatIntensity={0.2}>
        <mesh position={[0, 1.2, 0.8]}>
          <sphereGeometry args={[0.35, 32, 32]} />
          <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.3} transparent opacity={0.4} wireframe />
        </mesh>
      </Float>

      {/* Signal waves */}
      {[1, 1.5, 2].map((scale, i) => (
        <mesh key={i} position={[0, 1.5, -0.5]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.3 * scale, 0.01, 8, 32]} />
          <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.5} transparent opacity={0.3 - i * 0.08} />
        </mesh>
      ))}

      <Sparkles count={20} scale={3} size={0.8} speed={0.5} color="#22c55e" position={[0, 1.5, 0]} />

      <Text position={[0, 0.15, 1.8]} fontSize={0.2} color="#22c55e" anchorX="center">
        COMMS
      </Text>
    </group>
  )
}

// === OPS ZONE - Command Center ===
function OpsZone({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Platform */}
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[2.5, 2.8, 0.05, 8]} />
        <meshStandardMaterial color="#1c0c0c" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Curved control panel */}
      <group position={[0, 0.5, -1]}>
        {/* Panel arc */}
        <mesh>
          <torusGeometry args={[1.5, 0.3, 4, 16, Math.PI * 0.6]} />
          <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Screens on panel */}
        {[-0.8, 0, 0.8].map((angle, i) => {
          const x = Math.sin(angle) * 1.5
          const z = Math.cos(angle) * 1.5 - 1.5
          return (
            <group key={i} position={[x, 0.3, z]} rotation={[0, -angle, 0]}>
              <mesh>
                <planeGeometry args={[0.5, 0.4]} />
                <meshStandardMaterial color={['#ef4444', '#f59e0b', '#ef4444'][i]} emissive={['#ef4444', '#f59e0b', '#ef4444'][i]} emissiveIntensity={0.3} />
              </mesh>
            </group>
          )
        })}
      </group>

      {/* Warning lights */}
      {[-1.5, 1.5].map((x, i) => (
        <group key={i} position={[x, 1.5, -1.5]}>
          <mesh>
            <cylinderGeometry args={[0.1, 0.1, 0.3]} />
            <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.8} />
          </mesh>
        </group>
      ))}

      {/* Holographic status display */}
      <Float speed={0.5} floatIntensity={0.1}>
        <group position={[0, 1.8, -0.5]}>
          {/* Circular status rings */}
          {[0.3, 0.5, 0.7].map((r, i) => (
            <mesh key={i} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[r, 0.015, 8, 32]} />
              <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.5} transparent opacity={0.6 - i * 0.15} />
            </mesh>
          ))}
          <Text position={[0, 0, 0]} fontSize={0.15} color="#ef4444" anchorX="center">
            STATUS
          </Text>
        </group>
      </Float>

      <Sparkles count={15} scale={3} size={0.5} speed={0.8} color="#ef4444" position={[0, 1.2, 0]} />

      <Text position={[0, 0.15, 1.8]} fontSize={0.2} color="#ef4444" anchorX="center">
        OPS
      </Text>
    </group>
  )
}

// Floor
function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
      <planeGeometry args={[30, 30]} />
      <meshStandardMaterial color="#080810" />
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
  
  // Position agents near their zones
  const zonePositions: Record<string, [number, number, number]> = {
    coding: [5, 0, 0],
    research: [-5, 0, 0],
    comms: [0, 0, 5],
    ops: [0, 0, -5],
  }

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 15, 10]} intensity={0.6} />
      <pointLight position={[5, 3, 0]} intensity={0.5} color="#22d3ee" />
      <pointLight position={[-5, 3, 0]} intensity={0.5} color="#fbbf24" />
      <pointLight position={[0, 3, 5]} intensity={0.5} color="#22c55e" />
      <pointLight position={[0, 3, -5]} intensity={0.5} color="#ef4444" />

      <Floor />
      <ContactShadows position={[0, 0, 0]} opacity={0.3} blur={2} far={10} />

      {/* Themed zones */}
      <CodingZone position={[5, 0, 0]} />
      <ResearchZone position={[-5, 0, 0]} />
      <CommsZone position={[0, 0, 5]} />
      <OpsZone position={[0, 0, -5]} />

      {/* Agents */}
      {agents.map((agent, i) => {
        const zone = agent.zone || ['coding', 'research', 'comms', 'ops'][i % 4]
        const basePos = zonePositions[zone] || [0, 0, 0]
        const offset = (i % 2 === 0 ? -0.8 : 0.8)
        const pos: [number, number, number] = [
          basePos[0] + (basePos[0] === 0 ? offset : 0),
          0,
          basePos[2] + (basePos[2] === 0 ? offset : 0)
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
      {contractors.map((c, i) => {
        const parentIndex = agents.findIndex(a => a.id === c.parentId)
        const zone = agents[parentIndex]?.zone || ['coding', 'research', 'comms', 'ops'][parentIndex % 4]
        const basePos = zonePositions[zone] || [0, 0, 0]
        const agentContractors = contractors.filter(cc => cc.parentId === c.parentId)
        return (
          <ContractorOrb 
            key={c.id} 
            parentPosition={basePos}
            index={agentContractors.indexOf(c)}
            total={agentContractors.length}
          />
        )
      })}

      <OrbitControls 
        enablePan={false}
        minDistance={8}
        maxDistance={25}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.3}
        target={[0, 0.5, 0]}
      />
      
      <Environment preset="night" />
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
          agentList.push({
            id: 'demo-1',
            name: 'Molty',
            status: 'active',
            taskCount: 42,
            totalCost: 12.50,
            currentTask: 'Building ClawView',
            zone: 'coding',
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
      <div className="absolute top-0 left-0 right-0 z-10 p-3 flex items-center justify-between pointer-events-none">
        <Link to="/" className="text-xs text-gray-400 hover:text-white bg-gray-900/80 px-3 py-1.5 rounded backdrop-blur-sm pointer-events-auto">
          ← Dashboard
        </Link>
        <div className="text-xs text-gray-400 bg-gray-900/80 px-3 py-1.5 rounded backdrop-blur-sm">
          🏢 Agent Office
        </div>
      </div>

      {activeAgent && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-gray-900/95 border border-gray-700 rounded-lg p-4 min-w-56 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-2 h-2 rounded-full ${activeAgent.status === 'active' ? 'bg-green-400' : 'bg-gray-400'}`} />
              <span className="text-white text-sm font-medium">{activeAgent.name}</span>
              <span className="text-xs text-gray-500 capitalize">{activeAgent.zone}</span>
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

      <div className="absolute bottom-4 left-4 z-10 bg-gray-900/80 backdrop-blur-sm rounded p-2 text-xs text-gray-400 space-y-1">
        <div className="flex items-center gap-2"><span className="w-2 h-2 rounded bg-cyan-400"/> Coding</div>
        <div className="flex items-center gap-2"><span className="w-2 h-2 rounded bg-amber-400"/> Research</div>
        <div className="flex items-center gap-2"><span className="w-2 h-2 rounded bg-green-400"/> Comms</div>
        <div className="flex items-center gap-2"><span className="w-2 h-2 rounded bg-red-400"/> Ops</div>
      </div>

      <div className="absolute bottom-4 right-4 z-10 bg-gray-900/80 backdrop-blur-sm rounded p-2 text-xs text-gray-500">
        Drag to rotate • Scroll to zoom
      </div>

      {loading ? (
        <div className="h-full w-full flex items-center justify-center text-gray-400 text-sm">Loading...</div>
      ) : (
        <Canvas camera={{ position: [12, 8, 12], fov: 45 }} shadows>
          <Suspense fallback={null}>
            <Scene agents={agents} contractors={contractors} selectedAgent={selectedAgent} onSelectAgent={setSelectedAgent} />
          </Suspense>
        </Canvas>
      )}
    </div>
  )
}
