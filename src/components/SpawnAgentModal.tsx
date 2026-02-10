import { useState } from 'react'

interface SpawnAgentModalProps {
  isOpen: boolean
  onClose: () => void
  onAgentSpawned?: (sessionKey: string) => void
}

interface AgentTemplate {
  id: string
  name: string
  icon: string
  description: string
  task: string
  model?: string
  category: string
}

const agentTemplates: AgentTemplate[] = [
  {
    id: 'sdr-qualifier',
    name: 'SDR Lead Qualifier',
    icon: '🎯',
    description: 'Finds and qualifies leads from LinkedIn Sales Navigator, syncs to CRM',
    task: 'Find and qualify 5 leads matching the target profile. Use the sales-nav-qualifier skill. Output results to CSV and sync to Google Sheets CRM.',
    model: 'claude-sonnet-4-20250514',
    category: 'Sales',
  },
  {
    id: 'code-reviewer',
    name: 'Code Reviewer',
    icon: '🔍',
    description: 'Reviews pull requests and provides actionable feedback',
    task: 'Review the latest open pull request. Check for bugs, security issues, and style problems. Post a detailed review comment.',
    model: 'claude-sonnet-4-20250514',
    category: 'Engineering',
  },
  {
    id: 'researcher',
    name: 'Research Agent',
    icon: '📚',
    description: 'Deep-dives into topics and produces comprehensive reports',
    task: 'Research the specified topic thoroughly. Search the web, read multiple sources, and produce a comprehensive markdown report with citations.',
    model: 'claude-sonnet-4-20250514',
    category: 'Research',
  },
  {
    id: 'content-writer',
    name: 'Content Writer',
    icon: '✍️',
    description: 'Writes blog posts, social content, and marketing copy',
    task: 'Write a blog post on the specified topic. Include an engaging intro, clear sections, and a compelling CTA. Output as markdown.',
    model: 'claude-sonnet-4-20250514',
    category: 'Marketing',
  },
  {
    id: 'custom',
    name: 'Custom Agent',
    icon: '⚡',
    description: 'Define your own task and parameters',
    task: '',
    category: 'Custom',
  },
]

export function SpawnAgentModal({ isOpen, onClose, onAgentSpawned }: SpawnAgentModalProps) {
  const [step, setStep] = useState<'templates' | 'configure' | 'running'>('templates')
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null)
  const [customTask, setCustomTask] = useState('')
  const [label, setLabel] = useState('')
  const [spawning, setSpawning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ sessionKey: string; status: string } | null>(null)

  const resetModal = () => {
    setStep('templates')
    setSelectedTemplate(null)
    setCustomTask('')
    setLabel('')
    setSpawning(false)
    setError(null)
    setResult(null)
  }

  const handleClose = () => {
    resetModal()
    onClose()
  }

  const handleSelectTemplate = (template: AgentTemplate) => {
    setSelectedTemplate(template)
    setCustomTask(template.task)
    setLabel(template.id === 'custom' ? '' : template.id)
    setStep('configure')
  }

  const handleSpawn = async () => {
    if (!customTask.trim()) {
      setError('Task description is required')
      return
    }

    setSpawning(true)
    setError(null)

    try {
      // Call the spawn API (this would need to be implemented on the backend)
      const response = await fetch('/api/spawn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: customTask,
          label: label || undefined,
          model: selectedTemplate?.model,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to spawn agent')
      }

      const data = await response.json()
      setResult({
        sessionKey: data.sessionKey,
        status: 'running',
      })
      setStep('running')
      onAgentSpawned?.(data.sessionKey)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to spawn agent')
    } finally {
      setSpawning(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800 shrink-0">
          <h2 className="text-xl font-semibold text-white">
            {step === 'templates' && '🤖 Hire a Contractor'}
            {step === 'configure' && `Configure: ${selectedTemplate?.name}`}
            {step === 'running' && '✅ Agent Spawned'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {step === 'templates' && (
            <div className="space-y-4">
              <p className="text-gray-400 mb-6">
                Choose a contractor template or create a custom agent for a specific task.
              </p>

              {/* Group by category */}
              {['Sales', 'Engineering', 'Research', 'Marketing', 'Custom'].map(category => {
                const categoryTemplates = agentTemplates.filter(t => t.category === category)
                if (categoryTemplates.length === 0) return null

                return (
                  <div key={category}>
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                      {category}
                    </h3>
                    <div className="space-y-2">
                      {categoryTemplates.map(template => (
                        <button
                          key={template.id}
                          onClick={() => handleSelectTemplate(template)}
                          className="w-full p-4 rounded-xl border border-gray-700 bg-gray-800/50 hover:bg-gray-800 hover:border-gray-600 transition-all text-left group"
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gray-700/50 flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition-transform">
                              {template.icon}
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-white">{template.name}</h3>
                              <p className="text-sm text-gray-400 mt-1">
                                {template.description}
                              </p>
                            </div>
                            <div className="text-gray-600 group-hover:text-gray-400 transition-colors">
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {step === 'configure' && selectedTemplate && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                <div className="w-12 h-12 rounded-xl bg-gray-700/50 flex items-center justify-center text-2xl shrink-0">
                  {selectedTemplate.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-white">{selectedTemplate.name}</h3>
                  <p className="text-sm text-gray-400">{selectedTemplate.description}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Task Description *
                </label>
                <textarea
                  value={customTask}
                  onChange={(e) => setCustomTask(e.target.value)}
                  placeholder="Describe what you want this agent to accomplish..."
                  rows={6}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Label (optional)
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g., sdr/profound-qualifier"
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Labels help you organize and track sub-agents (e.g., sdr/*, research/*)
                </p>
              </div>

              {selectedTemplate.model && (
                <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                  <span className="text-sm text-gray-400">Model</span>
                  <span className="text-sm font-mono text-white">{selectedTemplate.model}</span>
                </div>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-red-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm">{error}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setStep('templates')}
                  disabled={spawning}
                  className="flex-1 px-4 py-2.5 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handleSpawn}
                  disabled={spawning || !customTask.trim()}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {spawning ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Spawning...
                    </>
                  ) : (
                    <>🚀 Spawn Agent</>
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 'running' && result && (
            <div className="space-y-6 text-center py-6">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-xl font-semibold text-white">Agent is running!</h3>
              <p className="text-gray-400 max-w-md mx-auto">
                Your contractor has been spawned and is working on the task.
                You can track its progress in the sub-agents section.
              </p>

              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <div className="text-sm text-gray-400 mb-1">Session Key</div>
                <div className="font-mono text-sm text-white break-all">{result.sessionKey}</div>
              </div>

              <button
                onClick={handleClose}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
