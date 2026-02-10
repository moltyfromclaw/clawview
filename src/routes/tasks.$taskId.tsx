import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'

export const Route = createFileRoute('/tasks/$taskId')({
  component: TaskDetail,
})

interface Step {
  id: string
  type: 'user' | 'assistant' | 'tool_call' | 'tool_result'
  timestamp: string
  durationMs: number
  name?: string
  content?: string
  toolName?: string
  toolArgs?: Record<string, unknown>
  toolResult?: string
  cost: number
  inputTokens: number
  outputTokens: number
  model?: string
}

interface TaskDetail {
  id: string
  sessionId: string
  startTime: string
  endTime: string
  durationMs: number
  summary: string
  category: string
  tags: string[]
  steps: Step[]
  totalCost: number
  totalInputTokens: number
  totalOutputTokens: number
  triggerType: string
  triggerText?: string
}

function formatCost(cost: number): string {
  return `$${cost.toFixed(4)}`
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`
  return `${(ms / 3600000).toFixed(1)}h`
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const stepTypeConfig: Record<string, { icon: string; color: string; bgColor: string; label: string }> = {
  user: { icon: '👤', color: 'text-blue-400', bgColor: 'bg-blue-500', label: 'User' },
  assistant: { icon: '🤖', color: 'text-purple-400', bgColor: 'bg-purple-500', label: 'Assistant' },
  tool_call: { icon: '⚡', color: 'text-yellow-400', bgColor: 'bg-yellow-500', label: 'Tool Call' },
  tool_result: { icon: '📋', color: 'text-green-400', bgColor: 'bg-green-500', label: 'Tool Result' },
}

const toolIcons: Record<string, string> = {
  exec: '⚡',
  browser: '🌐',
  Read: '📖',
  Write: '✍️',
  Edit: '✏️',
  web_search: '🔍',
  web_fetch: '📥',
  message: '💬',
  cron: '⏰',
  memory_search: '🧠',
}

function TaskDetail() {
  const { taskId } = Route.useParams()
  const [task, setTask] = useState<TaskDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function fetchTask() {
      try {
        const res = await fetch(`/api/tasks/${taskId}`)
        if (!res.ok) {
          throw new Error('Task not found')
        }
        const data = await res.json()
        setTask(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load task')
      } finally {
        setLoading(false)
      }
    }
    fetchTask()
  }, [taskId])

  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev)
      if (next.has(stepId)) {
        next.delete(stepId)
      } else {
        next.add(stepId)
      }
      return next
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-xl">Loading task...</div>
      </div>
    )
  }

  if (error || !task) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-4">
        <div className="text-xl text-red-400">{error || 'Task not found'}</div>
        <Link to="/" className="text-blue-400 hover:underline">← Back to dashboard</Link>
      </div>
    )
  }

  // Calculate timeline scale
  const taskStart = new Date(task.startTime).getTime()
  const taskEnd = new Date(task.endTime).getTime()
  const totalDuration = taskEnd - taskStart || 1

  // Filter steps with timing for Gantt (exclude tool_result as they're instant)
  const timedSteps = task.steps.filter(s => s.type !== 'tool_result')

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-gray-400 hover:text-white transition-colors">
              ← Back
            </Link>
            <div className="flex-1">
              <h1 className="text-lg font-semibold">{task.summary}</h1>
              <p className="text-sm text-gray-400">{formatDateTime(task.startTime)}</p>
            </div>
            <div className="text-right">
              <div className="text-green-400 font-medium">{formatCost(task.totalCost)}</div>
              <div className="text-sm text-gray-400">{formatDuration(task.durationMs)}</div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="text-gray-400 text-sm mb-1">Total Cost</div>
            <div className="text-2xl font-bold text-green-400">{formatCost(task.totalCost)}</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="text-gray-400 text-sm mb-1">Duration</div>
            <div className="text-2xl font-bold">{formatDuration(task.durationMs)}</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="text-gray-400 text-sm mb-1">Steps</div>
            <div className="text-2xl font-bold">{task.steps.length}</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="text-gray-400 text-sm mb-1">Tokens</div>
            <div className="text-2xl font-bold text-blue-400">
              {((task.totalInputTokens + task.totalOutputTokens) / 1000).toFixed(1)}K
            </div>
          </div>
        </div>

        {/* Gantt Chart */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 mb-8 overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold">Timeline</h2>
            <p className="text-sm text-gray-400">
              {formatTime(task.startTime)} → {formatTime(task.endTime)}
            </p>
          </div>
          <div className="p-4">
            {/* Timeline header */}
            <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
              <div className="w-32 shrink-0">Step</div>
              <div className="flex-1 flex justify-between">
                <span>{formatTime(task.startTime)}</span>
                <span>{formatTime(task.endTime)}</span>
              </div>
              <div className="w-20 text-right">Cost</div>
            </div>

            {/* Gantt bars */}
            <div className="space-y-2">
              {timedSteps.map((step, index) => {
                const stepTime = new Date(step.timestamp).getTime()
                const stepEnd = stepTime + Math.max(step.durationMs, totalDuration * 0.02) // Min 2% width
                const leftPercent = ((stepTime - taskStart) / totalDuration) * 100
                const widthPercent = Math.max(((stepEnd - stepTime) / totalDuration) * 100, 2)
                const config = stepTypeConfig[step.type] || stepTypeConfig.assistant

                return (
                  <div key={step.id} className="flex items-center gap-4 group">
                    <div className="w-32 shrink-0 flex items-center gap-2 text-sm">
                      <span>{config.icon}</span>
                      <span className={`${config.color} truncate`}>
                        {step.toolName || config.label}
                      </span>
                    </div>
                    <div className="flex-1 h-8 bg-gray-800 rounded relative">
                      <div
                        className={`absolute top-1 bottom-1 ${config.bgColor} rounded opacity-80 group-hover:opacity-100 transition-opacity`}
                        style={{
                          left: `${Math.min(leftPercent, 98)}%`,
                          width: `${Math.min(widthPercent, 100 - leftPercent)}%`,
                        }}
                      />
                      {/* Duration tooltip on hover */}
                      <div
                        className="absolute top-1 bottom-1 flex items-center text-xs text-white font-medium px-2 pointer-events-none"
                        style={{ left: `${Math.min(leftPercent, 98)}%` }}
                      >
                        {step.durationMs > 100 && formatDuration(step.durationMs)}
                      </div>
                    </div>
                    <div className="w-20 text-right text-sm">
                      {step.cost > 0 && (
                        <span className="text-green-400">{formatCost(step.cost)}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 mt-6 pt-4 border-t border-gray-800">
              {Object.entries(stepTypeConfig).filter(([k]) => k !== 'tool_result').map(([key, config]) => (
                <div key={key} className="flex items-center gap-2 text-sm">
                  <div className={`w-3 h-3 rounded ${config.bgColor}`} />
                  <span className="text-gray-400">{config.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 mb-8 overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold">Cost Breakdown</h2>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {task.steps.filter(s => s.cost > 0).map(step => {
                const config = stepTypeConfig[step.type] || stepTypeConfig.assistant
                const costPercent = (step.cost / task.totalCost) * 100

                return (
                  <div key={step.id} className="flex items-center gap-4">
                    <div className="w-48 flex items-center gap-2 text-sm">
                      <span>{step.toolName ? (toolIcons[step.toolName] || '🔧') : config.icon}</span>
                      <span className="text-gray-300 truncate">
                        {step.toolName || config.label}
                      </span>
                    </div>
                    <div className="flex-1 h-6 bg-gray-800 rounded overflow-hidden">
                      <div
                        className={`h-full ${config.bgColor} opacity-60`}
                        style={{ width: `${costPercent}%` }}
                      />
                    </div>
                    <div className="w-24 text-right">
                      <span className="text-green-400 font-medium">{formatCost(step.cost)}</span>
                      <span className="text-gray-500 text-xs ml-1">({costPercent.toFixed(0)}%)</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Steps Detail */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold">Steps</h2>
          </div>
          <div className="divide-y divide-gray-800">
            {task.steps.map((step, index) => {
              const config = stepTypeConfig[step.type] || stepTypeConfig.assistant
              const isExpanded = expandedSteps.has(step.id)

              return (
                <div key={step.id} className="hover:bg-gray-800/50 transition-colors">
                  <button
                    onClick={() => toggleStep(step.id)}
                    className="w-full p-4 text-left flex items-start gap-4"
                  >
                    <div className="flex items-center gap-2 text-gray-500 text-sm w-16 shrink-0">
                      <span className="font-mono">#{index + 1}</span>
                    </div>
                    <div className={`w-8 h-8 rounded-lg ${config.bgColor}/20 flex items-center justify-center text-lg shrink-0`}>
                      {step.toolName ? (toolIcons[step.toolName] || '🔧') : config.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${config.color}`}>
                          {step.toolName || config.label}
                        </span>
                        <span className="text-xs text-gray-500">{formatTime(step.timestamp)}</span>
                        {step.durationMs > 0 && (
                          <span className="text-xs text-gray-600">• {formatDuration(step.durationMs)}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                        {step.content || (step.toolArgs && JSON.stringify(step.toolArgs).slice(0, 100)) || step.toolResult?.slice(0, 100) || '-'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {step.cost > 0 && (
                        <div className="text-green-400 text-sm">{formatCost(step.cost)}</div>
                      )}
                      <svg
                        className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 ml-28">
                      <div className="bg-gray-800 rounded-lg p-4 text-sm">
                        {step.content && (
                          <div className="mb-4">
                            <div className="text-gray-400 text-xs mb-1">Content</div>
                            <div className="text-gray-200 whitespace-pre-wrap">{step.content}</div>
                          </div>
                        )}
                        {step.toolArgs && (
                          <div className="mb-4">
                            <div className="text-gray-400 text-xs mb-1">Arguments</div>
                            <pre className="text-gray-200 overflow-x-auto text-xs">
                              {JSON.stringify(step.toolArgs, null, 2)}
                            </pre>
                          </div>
                        )}
                        {step.toolResult && (
                          <div>
                            <div className="text-gray-400 text-xs mb-1">Result</div>
                            <pre className="text-gray-200 overflow-x-auto text-xs max-h-48 overflow-y-auto">
                              {step.toolResult}
                            </pre>
                          </div>
                        )}
                        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-700 text-xs text-gray-500">
                          {step.inputTokens > 0 && <span>Input: {step.inputTokens} tokens</span>}
                          {step.outputTokens > 0 && <span>Output: {step.outputTokens} tokens</span>}
                          {step.model && <span>Model: {step.model}</span>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
