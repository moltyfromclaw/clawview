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
      <RoundedBox args={[0.35, 0.45, 0.3]} radius={0.08} position={[0, 0.23, 0]}>
        <meshStandardMaterial color={color} metalness={0.2} roughness={0.6} />
      </RoundedBox>
      <RoundedBox args={[0.32, 0.26, 0.26]} radius={0.06} position={[0, 0.55, 0]}>
        <meshStandardMaterial color={color} metalness={0.2} roughness={0.6} />
      </RoundedBox>
      <mesh position={[-0.07, 0.57, 0.11]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color={glowColor} emissive={glowColor} emissiveIntensity={isActive ? 1.5 : 0.3} />
      </mesh>
      <mesh position={[0.07, 0.57, 0.11]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color={glowColor} emissive={glowColor} emissiveIntensity={isActive ? 1.5 : 0.3} />
      </mesh>
      <RoundedBox args={[0.08, 0.22, 0.08]} radius={0.02} position={[-0.24, 0.18, 0]}>
        <meshStandardMaterial color={color} metalness={0.2} roughness={0.6} />
      </RoundedBox>
      <RoundedBox args={[0.08, 0.22, 0.08]} radius={0.02} position={[0.24, 0.18, 0]}>
        <meshStandardMaterial color={color} metalness={0.2} roughness={0.6} />
      </RoundedBox>
      <RoundedBox args={[0.1, 0.15, 0.1]} radius={0.02} position={[-0.08, -0.07, 0]}>
        <meshStandardMaterial color={color} metalness={0.2} roughness={0.6} />
      </RoundedBox>
      <RoundedBox args={[0.1, 0.15, 0.1]} radius={0.02} position={[0.08, -0.07, 0]}>
        <meshStandardMaterial color={color} metalness={0.2} roughness={0.6} />
      </RoundedBox>
      {(hovered || isSelected) && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.35, 0.38, 32]} />
          <meshBasicMaterial color={glowColor} transparent opacity={0.8} />
        </mesh>
      )}
      {isActive && (
        <mesh position={[0, 0.78, 0]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={2} />
        </mesh>
      )}
      <Text position={[0, 0.9, 0]} fontSize={0.12} color={color} anchorX="center" outlineWidth={0.005} outlineColor="#000">
        {name}
      </Text>
    </group>
  )
}

// Contractor orb
function ContractorOrb({ parentPosition, index, total }: { parentPosition: [number, number, number]; index: number; total: number }) {
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

// Zone outline
function ZoneOutline({ position, size = [5, 5], color, label }: { position: [number, number, number]; size?: [number, number]; color: string; label: string }) {
  const [w, h] = size
  const hw = w / 2, hh = h / 2
  const points: [number, number, number][] = [[-hw, 0.01, -hh], [hw, 0.01, -hh], [hw, 0.01, hh], [-hw, 0.01, hh], [-hw, 0.01, -hh]]
  return (
    <group position={position}>
      <Line points={points} color={color} lineWidth={1.5} transparent opacity={0.7} />
      <Text position={[-hw + 0.15, 0.02, hh - 0.2]} fontSize={0.22} color={color} anchorX="left" rotation={[-Math.PI / 2, 0, 0]}>
        {label}
      </Text>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[w - 0.05, h - 0.05]} />
        <meshBasicMaterial color={color} transparent opacity={0.02} />
      </mesh>
    </group>
  )
}

// === CODING ZONE - Cyberpunk ===
function CodingZone({ position }: { position: [number, number, number] }) {
  const screenRef = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    if (screenRef.current) {
      (screenRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.4 + Math.sin(state.clock.elapsedTime * 3) * 0.15
    }
  })
  return (
    <group position={position}>
      {/* Holographic display */}
      <group position={[0, 1, -1.8]}>
        <mesh ref={screenRef}>
          <planeGeometry args={[2, 1.2]} />
          <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.4} transparent opacity={0.25} side={THREE.DoubleSide} />
        </mesh>
        {[...Array(6)].map((_, i) => (
          <mesh key={i} position={[-0.6 + Math.random() * 0.2, 0.4 - i * 0.12, 0.01]}>
            <planeGeometry args={[0.6 + Math.random() * 0.6, 0.03]} />
            <meshBasicMaterial color="#22d3ee" transparent opacity={0.5} />
          </mesh>
        ))}
      </group>
      {/* Side monitors */}
      {[-1.5, 1.5].map((x, i) => (
        <group key={i} position={[x, 0.6, -1.2]} rotation={[0, x > 0 ? -0.3 : 0.3, 0]}>
          <RoundedBox args={[0.6, 0.45, 0.03]} radius={0.01}>
            <meshStandardMaterial color="#0a1520" />
          </RoundedBox>
          <mesh position={[0, 0, 0.02]}>
            <planeGeometry args={[0.55, 0.4]} />
            <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.25} />
          </mesh>
        </group>
      ))}
      {/* Data cubes */}
      {[[-0.6, 1.5, 0.3], [0.7, 1.7, 0.2], [0, 1.9, -0.4]].map((pos, i) => (
        <Float key={i} speed={2} floatIntensity={0.4} rotationIntensity={0.4}>
          <mesh position={pos as [number, number, number]}>
            <boxGeometry args={[0.12, 0.12, 0.12]} />
            <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.6} transparent opacity={0.6} wireframe />
          </mesh>
        </Float>
      ))}
      <Sparkles count={25} scale={3.5} size={0.8} speed={0.3} color="#22d3ee" position={[0, 1.2, 0]} />
    </group>
  )
}

// === RESEARCH ZONE - Library ===
function ResearchZone({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Bookshelves */}
      {[-1.2, 1.2].map((x, i) => (
        <group key={i} position={[x, 0, -1.5]} rotation={[0, x > 0 ? -0.25 : 0.25, 0]}>
          <RoundedBox args={[0.8, 1.5, 0.25]} radius={0.02} position={[0, 0.75, 0]}>
            <meshStandardMaterial color="#78350f" roughness={0.8} />
          </RoundedBox>
          {[0.35, 0.7, 1.05].map((y, j) => (
            <group key={j} position={[0, y, 0.08]}>
              {[...Array(4)].map((_, k) => (
                <RoundedBox key={k} args={[0.07, 0.2, 0.12]} radius={0.01} position={[-0.18 + k * 0.11, 0, 0]}>
                  <meshStandardMaterial color={['#dc2626', '#2563eb', '#16a34a', '#9333ea'][k]} />
                </RoundedBox>
              ))}
            </group>
          ))}
        </group>
      ))}
      {/* Floating grimoire */}
      <Float speed={1.5} floatIntensity={0.3} rotationIntensity={0.15}>
        <group position={[0, 1.3, 0]}>
          <RoundedBox args={[0.4, 0.5, 0.06]} radius={0.02}>
            <meshStandardMaterial color="#7c2d12" />
          </RoundedBox>
          <mesh position={[0, 0, 0.04]}>
            <planeGeometry args={[0.3, 0.4]} />
            <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.6} transparent opacity={0.7} />
          </mesh>
        </group>
      </Float>
      {/* Crystal ball */}
      <mesh position={[0, 0.35, 0.6]}>
        <sphereGeometry args={[0.15, 32, 32]} />
        <meshPhysicalMaterial color="#818cf8" transmission={0.9} thickness={0.4} roughness={0} />
      </mesh>
      <mesh position={[0, 0.15, 0.6]}>
        <cylinderGeometry args={[0.12, 0.15, 0.08, 16]} />
        <meshStandardMaterial color="#1c1917" metalness={0.8} />
      </mesh>
      <Sparkles count={30} scale={3} size={1.2} speed={0.2} color="#fbbf24" position={[0, 1, 0]} />
    </group>
  )
}

// === COMMS ZONE - Satellite Hub ===
function CommsZone({ position }: { position: [number, number, number] }) {
  const antennaRef = useRef<THREE.Group>(null)
  useFrame((state) => { if (antennaRef.current) antennaRef.current.rotation.y = state.clock.elapsedTime * 0.4 })
  return (
    <group position={position}>
      {/* Antenna tower */}
      <group ref={antennaRef} position={[0, 0, -0.8]}>
        <mesh position={[0, 0.8, 0]}>
          <cylinderGeometry args={[0.06, 0.12, 1.6]} />
          <meshStandardMaterial color="#334155" metalness={0.9} />
        </mesh>
        {[0, Math.PI * 0.66, Math.PI * 1.33].map((rot, i) => (
          <group key={i} position={[Math.sin(rot) * 0.3, 1.4, Math.cos(rot) * 0.3]} rotation={[0.25, rot, 0]}>
            <mesh><sphereGeometry args={[0.18, 16, 8, 0, Math.PI]} /><meshStandardMaterial color="#64748b" metalness={0.7} side={THREE.DoubleSide} /></mesh>
          </group>
        ))}
        <mesh position={[0, 1.65, 0]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={1.5} />
        </mesh>
      </group>
      {/* Globe hologram */}
      <Float speed={1} floatIntensity={0.15}>
        <mesh position={[0, 1, 0.6]}>
          <sphereGeometry args={[0.28, 32, 32]} />
          <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.35} transparent opacity={0.35} wireframe />
        </mesh>
      </Float>
      {/* Signal waves */}
      {[0.8, 1.2, 1.6].map((scale, i) => (
        <mesh key={i} position={[0, 1.2, -0.8]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.2 * scale, 0.008, 8, 32]} />
          <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.6} transparent opacity={0.35 - i * 0.1} />
        </mesh>
      ))}
      <Sparkles count={15} scale={2.5} size={0.6} speed={0.4} color="#22c55e" position={[0, 1.2, 0]} />
    </group>
  )
}

// === OPS ZONE - Command Center ===
function OpsZone({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Control panel arc */}
      <group position={[0, 0.4, -1.2]}>
        <mesh><torusGeometry args={[1.2, 0.2, 4, 16, Math.PI * 0.5]} /><meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} /></mesh>
        {[-0.6, 0, 0.6].map((angle, i) => {
          const x = Math.sin(angle) * 1.2, z = Math.cos(angle) * 1.2 - 1.2
          return (
            <group key={i} position={[x, 0.2, z]} rotation={[0, -angle, 0]}>
              <mesh><planeGeometry args={[0.4, 0.3]} /><meshStandardMaterial color={['#ef4444', '#f59e0b', '#ef4444'][i]} emissive={['#ef4444', '#f59e0b', '#ef4444'][i]} emissiveIntensity={0.35} /></mesh>
            </group>
          )
        })}
      </group>
      {/* Warning lights */}
      {[-1.2, 1.2].map((x, i) => (
        <mesh key={i} position={[x, 1.2, -1.8]}><cylinderGeometry args={[0.08, 0.08, 0.25]} /><meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.9} /></mesh>
      ))}
      {/* Status hologram */}
      <Float speed={0.5} floatIntensity={0.08}>
        <group position={[0, 1.5, -0.4]}>
          {[0.25, 0.4, 0.55].map((r, i) => (
            <mesh key={i} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[r, 0.012, 8, 32]} /><meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.6} transparent opacity={0.5 - i * 0.12} /></mesh>
          ))}
          <Text position={[0, 0, 0]} fontSize={0.12} color="#ef4444" anchorX="center">STATUS</Text>
        </group>
      </Float>
      <Sparkles count={12} scale={2.5} size={0.4} speed={0.6} color="#ef4444" position={[0, 1, 0]} />
    </group>
  )
}

// Floor
function Floor() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[50, 50]} />
        <meshBasicMaterial color="#080a0c" />
      </mesh>
      <gridHelper args={[50, 50, '#152020', '#0c1414']} position={[0, 0, 0]} />
    </group>
  )
}

function Scene({ agents, contractors, selectedAgent, onSelectAgent }: { agents: Agent[]; contractors: Contractor[]; selectedAgent: string | null; onSelectAgent: (id: string | null) => void }) {
  const agentColors = ['#f97316', '#8b5cf6', '#3b82f6', '#22c55e', '#ec4899']
  const zones = [
    { id: 'coding', position: [5, 0, 0] as [number, number, number], color: '#f97316', label: 'App Development' },
    { id: 'research', position: [-5, 0, 0] as [number, number, number], color: '#3b82f6', label: 'Research' },
    { id: 'comms', position: [0, 0, 5] as [number, number, number], color: '#22c55e', label: 'Communications' },
    { id: 'ops', position: [0, 0, -5] as [number, number, number], color: '#ef4444', label: 'Operations' },
  ]
  const zonePositions: Record<string, [number, number, number]> = { coding: [5, 0, 0], research: [-5, 0, 0], comms: [0, 0, 5], ops: [0, 0, -5] }

  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[8, 12, 8]} intensity={0.5} color="#fff8f0" />
      <pointLight position={[5, 4, 0]} intensity={0.3} color="#f97316" />
      <pointLight position={[-5, 4, 0]} intensity={0.3} color="#3b82f6" />
      <pointLight position={[0, 4, 5]} intensity={0.3} color="#22c55e" />
      <pointLight position={[0, 4, -5]} intensity={0.3} color="#ef4444" />

      <Floor />
      <Sparkles count={80} scale={35} size={1} speed={0.08} opacity={0.35} color="#ffffff" />

      {/* Zone outlines */}
      {zones.map(z => <ZoneOutline key={z.id} position={z.position} color={z.color} label={z.label} />)}
      
      {/* Zone artifacts */}
      <CodingZone position={[5, 0, 0]} />
      <ResearchZone position={[-5, 0, 0]} />
      <CommsZone position={[0, 0, 5]} />
      <OpsZone position={[0, 0, -5]} />

      {/* Agents */}
      {agents.map((agent, i) => {
        const zone = agent.zone || ['coding', 'research', 'comms', 'ops'][i % 4]
        const basePos = zonePositions[zone] || [0, 0, 0]
        const offset = i * 0.7 - 0.7
        const pos: [number, number, number] = [basePos[0] + (Math.abs(basePos[0]) > 0 ? 0 : offset), 0, basePos[2] + (Math.abs(basePos[2]) > 0 ? 0 : offset) + 0.8]
        return <Robot key={agent.id} position={pos} color={agentColors[i % agentColors.length]} isActive={agent.status === 'active'} name={agent.name} onClick={() => onSelectAgent(selectedAgent === agent.id ? null : agent.id)} isSelected={selectedAgent === agent.id} />
      })}

      {/* Contractors */}
      {contractors.map((c) => {
        const parentIndex = agents.findIndex(a => a.id === c.parentId)
        const zone = agents[parentIndex]?.zone || 'coding'
        const basePos = zonePositions[zone] || [0, 0, 0]
        const agentContractors = contractors.filter(cc => cc.parentId === c.parentId)
        return <ContractorOrb key={c.id} parentPosition={[basePos[0], 0, basePos[2] + 0.8]} index={agentContractors.indexOf(c)} total={agentContractors.length} />
      })}

      <OrbitControls enablePan={false} minDistance={8} maxDistance={25} minPolarAngle={Math.PI / 6} maxPolarAngle={Math.PI / 2.3} target={[0, 0, 0]} />
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
          id: a.id, name: a.name, status: a.status, taskCount: a.taskCount || 0, totalCost: a.totalCost || 0,
          currentTask: a.status === 'active' ? 'Working...' : undefined, zone: zones[i % 4],
        }))
        if (agentList.length === 0) {
          agentList.push(
            { id: 'demo-1', name: 'Molty', status: 'active', taskCount: 42, totalCost: 12.50, currentTask: 'Building ClawView', zone: 'coding' },
            { id: 'demo-2', name: 'Claude', status: 'active', taskCount: 28, totalCost: 8.20, currentTask: 'Code review', zone: 'coding' },
            { id: 'demo-3', name: 'Codex', status: 'idle', taskCount: 15, totalCost: 4.10, zone: 'coding' },
          )
        }
        setAgents(agentList)
        setContractors([{ id: 'c1', parentId: agentList[0]?.id, task: 'Research' }, { id: 'c2', parentId: agentList[0]?.id, task: 'Code Review' }])
      } catch (err) { console.error(err) } finally { setLoading(false) }
    }
    fetchData()
  }, [])

  const activeAgent = agents.find(a => a.id === selectedAgent)

  return (
    <div className="h-screen w-screen bg-[#050808] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, #0a1215 0%, #050808 70%)' }} />
      <div className="absolute top-0 left-0 right-0 z-10 p-3 flex items-center justify-between pointer-events-none">
        <Link to="/" className="text-xs text-gray-400 hover:text-white bg-gray-900/60 px-3 py-1.5 rounded backdrop-blur-sm pointer-events-auto border border-gray-800">← Dashboard</Link>
        <div className="text-xs text-gray-400 bg-gray-900/60 px-3 py-1.5 rounded backdrop-blur-sm border border-gray-800">🏢 Agent Office</div>
      </div>
      {activeAgent && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-gray-900/90 border border-gray-700 rounded-lg p-4 min-w-56 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-2 h-2 rounded-full ${activeAgent.status === 'active' ? 'bg-green-400' : 'bg-gray-400'}`} />
              <span className="text-white text-sm font-medium">{activeAgent.name}</span>
            </div>
            {activeAgent.currentTask && <div className="text-xs text-gray-400 mb-2">📋 {activeAgent.currentTask}</div>}
            <div className="flex justify-between text-xs pt-2 border-t border-gray-700">
              <span className="text-gray-500">{activeAgent.taskCount} tasks</span>
              <span className="text-green-400">${activeAgent.totalCost.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
      <div className="absolute bottom-4 right-4 z-10 text-xs text-gray-600">Drag to rotate • Scroll to zoom</div>
      {loading ? (
        <div className="h-full w-full flex items-center justify-center text-gray-500 text-sm">Loading...</div>
      ) : (
        <Canvas camera={{ position: [10, 7, 10], fov: 45 }}>
          <Suspense fallback={null}>
            <Scene agents={agents} contractors={contractors} selectedAgent={selectedAgent} onSelectAgent={setSelectedAgent} />
          </Suspense>
        </Canvas>
      )}
    </div>
  )
}
