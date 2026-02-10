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

const toolIcons: Record<string, string> = {
  exec: '⚡', browser: '🌐', Read: '📖', Write: '✍️', Edit: '✏️',
  web_search: '🔍', web_fetch: '📥', message: '💬', cron: '⏰', memory_search: '🧠',
}

const stepColors: Record<string, string> = {
  user: 'bg-blue-500',
  assistant: 'bg-purple-500',
  tool_call: 'bg-amber-500',
  tool_result: 'bg-green-500',
}

function TaskDetail() {
  const { taskId } = Route.useParams()
  const [task, setTask] = useState<TaskDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [expandedStep, setExpandedStep] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTask() {
      try {
        const res = await fetch(`/api/tasks/${taskId}`)
        if (!res.ok) throw new Error('Task not found')
        setTask(await res.json())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load task')
      } finally {
        setLoading(false)
      }
    }
    fetchTask()
  }, [taskId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    )
  }

  if (error || !task) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-4">
        <div className="text-red-400">{error || 'Task not found'}</div>
        <Link to="/" className="text-blue-400 hover:underline text-sm">← Back to dashboard</Link>
      </div>
    )
  }

  // Compute useful stats
  const toolCalls = task.steps.filter(s => s.type === 'tool_call')
  const uniqueTools = [...new Set(toolCalls.map(s => s.toolName))]
  const topCostStep = task.steps.reduce((max, s) => s.cost > max.cost ? s : max, task.steps[0])
  
  // Timeline data
  const taskStart = new Date(task.startTime).getTime()
  const taskEnd = new Date(task.endTime).getTime()
  const totalDuration = taskEnd - taskStart || 1

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Minimal Header */}
      <header className="border-b border-gray-800 bg-gray-900/50">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/" className="text-gray-400 hover:text-white text-sm">← Back</Link>
          <span className="text-gray-600">|</span>
          <span className="text-sm text-gray-400">{formatDateTime(task.startTime)}</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        
        {/* ============ SUMMARY SECTION ============ */}
        <section className="mb-8">
          <h1 className="text-2xl font-semibold mb-2">{task.summary}</h1>
          
          {task.triggerText && (
            <p className="text-gray-400 text-sm mb-4 line-clamp-2">
              Triggered by: "{task.triggerText.slice(0, 100)}..."
            </p>
          )}

          {/* Key metrics - horizontal row */}
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-gray-500">Cost</span>
              <span className="ml-2 text-green-400 font-medium">{formatCost(task.totalCost)}</span>
            </div>
            <div>
              <span className="text-gray-500">Duration</span>
              <span className="ml-2 text-white font-medium">{formatDuration(task.durationMs)}</span>
            </div>
            <div>
              <span className="text-gray-500">Steps</span>
              <span className="ml-2 text-white font-medium">{task.steps.length}</span>
            </div>
            <div>
              <span className="text-gray-500">Tools</span>
              <span className="ml-2 text-white font-medium">{uniqueTools.length}</span>
            </div>
          </div>
        </section>

        {/* ============ QUICK LOOK SECTION ============ */}
        <section className="mb-8">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Quick Look</h2>
          
          {/* Mini timeline bar */}
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 mb-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
              <span>{formatTime(task.startTime)}</span>
              <span>{formatTime(task.endTime)}</span>
            </div>
            <div className="h-8 bg-gray-800 rounded-full overflow-hidden flex">
              {task.steps.filter(s => s.type !== 'tool_result').map((step, i) => {
                const stepTime = new Date(step.timestamp).getTime()
                const width = Math.max((step.durationMs / totalDuration) * 100, 1)
                return (
                  <div
                    key={step.id}
                    className={`${stepColors[step.type]} opacity-80 hover:opacity-100 transition-opacity`}
                    style={{ width: `${width}%` }}
                    title={`${step.toolName || step.type}: ${formatDuration(step.durationMs)}`}
                  />
                )
              })}
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs">
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500"/> User</div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-purple-500"/> Response</div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500"/> Tool</div>
            </div>
          </div>

          {/* Tools used - chips */}
          {uniqueTools.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {uniqueTools.map(tool => (
                <span key={tool} className="px-3 py-1 bg-gray-800 rounded-full text-sm flex items-center gap-1.5">
                  <span>{toolIcons[tool || ''] || '🔧'}</span>
                  <span className="text-gray-300">{tool}</span>
                </span>
              ))}
            </div>
          )}

          {/* Cost highlight if there's a dominant step */}
          {topCostStep && topCostStep.cost > task.totalCost * 0.3 && (
            <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-800 text-sm">
              <span className="text-gray-400">Most expensive step:</span>
              <span className="ml-2 text-white">{topCostStep.toolName || 'Response'}</span>
              <span className="ml-2 text-green-400">{formatCost(topCostStep.cost)}</span>
              <span className="text-gray-500 ml-1">
                ({Math.round((topCostStep.cost / task.totalCost) * 100)}%)
              </span>
            </div>
          )}
        </section>

        {/* ============ ADVANCED SECTION ============ */}
        <section>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-4"
          >
            <svg
              className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="font-medium uppercase tracking-wider">
              {showAdvanced ? 'Hide' : 'Show'} Step Details
            </span>
            <span className="text-gray-600">({task.steps.length} steps)</span>
          </button>

          {showAdvanced && (
            <div className="space-y-2">
              {task.steps.map((step, index) => {
                const isExpanded = expandedStep === step.id
                const icon = step.toolName ? (toolIcons[step.toolName] || '🔧') : 
                  step.type === 'user' ? '👤' : step.type === 'assistant' ? '💬' : '📋'

                return (
                  <div
                    key={step.id}
                    className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                      className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-800/50 transition-colors"
                    >
                      <span className="text-gray-600 text-xs font-mono w-6">{index + 1}</span>
                      <span className="text-lg">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-white">
                          {step.toolName || (step.type === 'user' ? 'User message' : 'Response')}
                        </span>
                        {step.durationMs > 0 && (
                          <span className="text-xs text-gray-500 ml-2">
                            {formatDuration(step.durationMs)}
                          </span>
                        )}
                      </div>
                      {step.cost > 0 && (
                        <span className="text-xs text-green-400">{formatCost(step.cost)}</span>
                      )}
                      <svg
                        className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-gray-800">
                        <div className="pt-3 space-y-3 text-sm">
                          {step.content && (
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Content</div>
                              <div className="text-gray-300 whitespace-pre-wrap bg-gray-800/50 rounded p-2 text-xs max-h-32 overflow-y-auto">
                                {step.content}
                              </div>
                            </div>
                          )}
                          {step.toolArgs && (
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Arguments</div>
                              <pre className="text-gray-300 bg-gray-800/50 rounded p-2 text-xs overflow-x-auto max-h-32 overflow-y-auto">
                                {JSON.stringify(step.toolArgs, null, 2)}
                              </pre>
                            </div>
                          )}
                          {step.toolResult && (
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Result</div>
                              <pre className="text-gray-300 bg-gray-800/50 rounded p-2 text-xs overflow-x-auto max-h-32 overflow-y-auto">
                                {step.toolResult}
                              </pre>
                            </div>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-500 pt-2">
                            <span>{formatTime(step.timestamp)}</span>
                            {step.inputTokens > 0 && <span>{step.inputTokens} in</span>}
                            {step.outputTokens > 0 && <span>{step.outputTokens} out</span>}
                            {step.model && <span className="text-gray-600">{step.model}</span>}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
