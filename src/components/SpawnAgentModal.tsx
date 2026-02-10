import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Button } from './ui/button'

interface SpawnAgentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
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
    description: 'Finds and qualifies leads from LinkedIn Sales Navigator',
    task: 'Find and qualify 5 leads matching the target profile. Use the sales-nav-qualifier skill. Output results to CSV and sync to Google Sheets CRM.',
    model: 'claude-sonnet-4-20250514',
    category: 'Sales',
  },
  {
    id: 'code-reviewer',
    name: 'Code Reviewer',
    icon: '🔍',
    description: 'Reviews pull requests and provides feedback',
    task: 'Review the latest open pull request. Check for bugs, security issues, and style problems. Post a detailed review comment.',
    model: 'claude-sonnet-4-20250514',
    category: 'Engineering',
  },
  {
    id: 'researcher',
    name: 'Research Agent',
    icon: '📚',
    description: 'Deep-dives into topics and produces reports',
    task: 'Research the specified topic thoroughly. Search the web, read multiple sources, and produce a comprehensive markdown report.',
    model: 'claude-sonnet-4-20250514',
    category: 'Research',
  },
  {
    id: 'content-writer',
    name: 'Content Writer',
    icon: '✍️',
    description: 'Writes blog posts and marketing copy',
    task: 'Write a blog post on the specified topic. Include an engaging intro, clear sections, and a compelling CTA.',
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

export function SpawnAgentModal({ open, onOpenChange, onAgentSpawned }: SpawnAgentModalProps) {
  const [step, setStep] = useState<'templates' | 'configure' | 'running'>('templates')
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null)
  const [customTask, setCustomTask] = useState('')
  const [label, setLabel] = useState('')
  const [spawning, setSpawning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ sessionKey: string } | null>(null)

  const resetModal = () => {
    setStep('templates')
    setSelectedTemplate(null)
    setCustomTask('')
    setLabel('')
    setSpawning(false)
    setError(null)
    setResult(null)
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) resetModal()
    onOpenChange(open)
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
      setResult({ sessionKey: data.sessionKey })
      setStep('running')
      onAgentSpawned?.(data.sessionKey)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to spawn agent')
    } finally {
      setSpawning(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'templates' && '🤖 Hire a Contractor'}
            {step === 'configure' && `Configure: ${selectedTemplate?.name}`}
            {step === 'running' && '✅ Agent Spawned'}
          </DialogTitle>
          <DialogDescription>
            {step === 'templates' && 'Choose a contractor template or create a custom agent.'}
            {step === 'configure' && 'Customize the task for your contractor.'}
            {step === 'running' && 'Your contractor is now working on the task.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'templates' && (
          <div className="space-y-4 pt-2">
            {['Sales', 'Engineering', 'Research', 'Marketing', 'Custom'].map(category => {
              const categoryTemplates = agentTemplates.filter(t => t.category === category)
              if (categoryTemplates.length === 0) return null

              return (
                <div key={category}>
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {categoryTemplates.map(template => (
                      <button
                        key={template.id}
                        onClick={() => handleSelectTemplate(template)}
                        className="w-full p-3 rounded-lg border border-gray-700 bg-gray-800/50 hover:bg-gray-800 hover:border-gray-600 transition-all text-left group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gray-700/50 flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-transform">
                            {template.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-white text-sm">{template.name}</h3>
                            <p className="text-xs text-gray-400 truncate">{template.description}</p>
                          </div>
                          <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
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
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
              <div className="w-10 h-10 rounded-lg bg-gray-700/50 flex items-center justify-center text-xl">
                {selectedTemplate.icon}
              </div>
              <div>
                <h3 className="font-medium text-white text-sm">{selectedTemplate.name}</h3>
                <p className="text-xs text-gray-400">{selectedTemplate.description}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Task Description *</label>
              <textarea
                value={customTask}
                onChange={(e) => setCustomTask(e.target.value)}
                placeholder="Describe what you want this agent to accomplish..."
                rows={4}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Label (optional)</label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g., sdr/profound-qualifier"
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setStep('templates')} disabled={spawning}>
                Back
              </Button>
              <Button variant="purple" className="flex-1" onClick={handleSpawn} disabled={spawning || !customTask.trim()}>
                {spawning ? 'Spawning...' : '🚀 Spawn Agent'}
              </Button>
            </div>
          </div>
        )}

        {step === 'running' && result && (
          <div className="space-y-4 text-center py-4">
            <div className="text-5xl mb-2">🎉</div>
            <h3 className="text-lg font-semibold text-white">Agent is running!</h3>
            <p className="text-gray-400 text-sm">
              Your contractor is working on the task. Track progress in the sub-agents section.
            </p>
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
              <div className="text-xs text-gray-400 mb-1">Session Key</div>
              <div className="font-mono text-xs text-white break-all">{result.sessionKey}</div>
            </div>
            <Button onClick={() => handleOpenChange(false)}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
