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

interface TaskDetailData {
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

function TaskDetail() {
  const { taskId } = Route.useParams()
  const [task, setTask] = useState<TaskDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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
        <div className="text-sm text-gray-400">Loading...</div>
      </div>
    )
  }

  if (error || !task) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-3">
        <div className="text-sm text-red-400">{error || 'Task not found'}</div>
        <Link to="/" className="text-sm text-blue-400 hover:underline">← Back</Link>
      </div>
    )
  }

  const toolCalls = task.steps.filter(s => s.type === 'tool_call')
  const taskStart = new Date(task.startTime).getTime()
  const taskEnd = new Date(task.endTime).getTime()
  const totalDuration = taskEnd - taskStart || 1

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-sm text-gray-400 hover:text-white">
            ← Dashboard
          </Link>
          <div className="text-xs text-gray-500">
            {new Date(task.startTime).toLocaleDateString('en-US', { 
              month: 'short', day: 'numeric', year: 'numeric',
              hour: '2-digit', minute: '2-digit'
            })}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6">
        {/* Title & Stats Row */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <h1 className="text-lg font-medium text-white mb-1">{task.summary}</h1>
            {task.triggerText && (
              <p className="text-xs text-gray-500 max-w-xl truncate">
                {task.triggerText}
              </p>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="text-right">
              <div className="text-gray-500">Cost</div>
              <div className="text-green-400 font-medium">{formatCost(task.totalCost)}</div>
            </div>
            <div className="text-right">
              <div className="text-gray-500">Duration</div>
              <div className="text-white font-medium">{formatDuration(task.durationMs)}</div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
            <span>{formatTime(task.startTime)}</span>
            <span>{formatTime(task.endTime)}</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden flex">
            {task.steps.filter(s => s.type !== 'tool_result').map((step) => {
              const width = Math.max((step.durationMs / totalDuration) * 100, 0.5)
              const color = step.type === 'user' ? 'bg-blue-500' : 
                step.type === 'tool_call' ? 'bg-amber-500' : 'bg-purple-500'
              return (
                <div
                  key={step.id}
                  className={`${color} opacity-70`}
                  style={{ width: `${width}%` }}
                />
              )
            })}
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"/> User</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-500"/> Response</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"/> Tool</span>
          </div>
        </div>

        {/* Steps */}
        <div className="border border-gray-800 rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-900/50 border-b border-gray-800 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Steps</span>
            <span className="text-xs text-gray-500">{task.steps.length} total</span>
          </div>
          <div className="divide-y divide-gray-800/50">
            {task.steps.map((step, i) => {
              const isExpanded = expandedStep === step.id
              const typeLabel = step.type === 'user' ? 'User' : 
                step.type === 'tool_call' ? step.toolName : 
                step.type === 'tool_result' ? 'Result' : 'Response'
              const typeColor = step.type === 'user' ? 'text-blue-400' : 
                step.type === 'tool_call' ? 'text-amber-400' : 
                step.type === 'tool_result' ? 'text-green-400' : 'text-purple-400'

              return (
                <div key={step.id}>
                  <button
                    onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                    className="w-full px-4 py-2.5 flex items-center gap-3 text-left hover:bg-gray-800/30 transition-colors"
                  >
                    <span className="text-xs text-gray-600 w-5 font-mono">{i + 1}</span>
                    <span className={`text-xs font-medium ${typeColor} w-24 truncate`}>
                      {typeLabel}
                    </span>
                    <span className="flex-1 text-xs text-gray-400 truncate">
                      {step.content?.slice(0, 60) || 
                       (step.toolArgs && Object.keys(step.toolArgs)[0]) || 
                       (step.toolResult?.slice(0, 60)) || '—'}
                    </span>
                    {step.durationMs > 0 && (
                      <span className="text-xs text-gray-600">{formatDuration(step.durationMs)}</span>
                    )}
                    {step.cost > 0 && (
                      <span className="text-xs text-green-400/70">{formatCost(step.cost)}</span>
                    )}
                    <svg
                      className={`w-3 h-3 text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isExpanded && (
                    <div className="px-4 py-3 bg-gray-900/30 border-t border-gray-800/50">
                      {step.content && (
                        <div className="mb-3">
                          <div className="text-xs text-gray-500 mb-1">Content</div>
                          <div className="text-xs text-gray-300 bg-gray-800/50 rounded p-2 whitespace-pre-wrap max-h-24 overflow-y-auto">
                            {step.content}
                          </div>
                        </div>
                      )}
                      {step.toolArgs && (
                        <div className="mb-3">
                          <div className="text-xs text-gray-500 mb-1">Arguments</div>
                          <pre className="text-xs text-gray-300 bg-gray-800/50 rounded p-2 overflow-x-auto max-h-24 overflow-y-auto">
                            {JSON.stringify(step.toolArgs, null, 2)}
                          </pre>
                        </div>
                      )}
                      {step.toolResult && (
                        <div className="mb-3">
                          <div className="text-xs text-gray-500 mb-1">Result</div>
                          <pre className="text-xs text-gray-300 bg-gray-800/50 rounded p-2 overflow-x-auto max-h-24 overflow-y-auto">
                            {step.toolResult}
                          </pre>
                        </div>
                      )}
                      <div className="flex gap-4 text-xs text-gray-500">
                        <span>{formatTime(step.timestamp)}</span>
                        {step.inputTokens > 0 && <span>{step.inputTokens} in</span>}
                        {step.outputTokens > 0 && <span>{step.outputTokens} out</span>}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
