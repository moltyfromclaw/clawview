import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { VoiceStandup } from '../components/VoiceStandup'

export const Route = createFileRoute('/standup')({
  component: StandupPage,
})

interface Stats {
  totalCost: number
  totalMessages: number
  sessionCount: number
}

interface Task {
  id: string
  summary: string
  category: string
  cost: number
  startTime: string
}

interface DailySummary {
  date: string
  totalCost: number
  activityCount: number
}

function StandupPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentTasks, setRecentTasks] = useState<Task[]>([])
  const [todaySummary, setTodaySummary] = useState<DailySummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, tasksRes] = await Promise.all([
          fetch('/api/stats'),
          fetch('/api/tasks?limit=5')
        ])

        const statsData = await statsRes.json()
        const tasksData = await tasksRes.json()

        setStats(statsData.stats)
        setRecentTasks(tasksData.tasks || [])
        setTodaySummary(statsData.dailySummaries?.[0] || null)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/" className="text-gray-400 hover:text-white transition-colors">
                ← Back
              </Link>
              <span className="text-gray-600">|</span>
              <span className="text-3xl">🦞</span>
              <div>
                <h1 className="text-xl font-bold">Voice Standup</h1>
                <p className="text-sm text-gray-400">Talk to your agent</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Quick Stats */}
        {!loading && stats && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <div className="text-gray-400 text-sm mb-1">Total Spend</div>
              <div className="text-2xl font-bold text-green-400">
                ${stats.totalCost.toFixed(2)}
              </div>
            </div>
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <div className="text-gray-400 text-sm mb-1">Today's Cost</div>
              <div className="text-2xl font-bold text-blue-400">
                ${todaySummary?.totalCost.toFixed(2) || '0.00'}
              </div>
            </div>
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <div className="text-gray-400 text-sm mb-1">Today's Tasks</div>
              <div className="text-2xl font-bold">
                {todaySummary?.activityCount || 0}
              </div>
            </div>
          </div>
        )}

        {/* Voice Standup Component */}
        <VoiceStandup />

        {/* Recent Tasks Preview */}
        {recentTasks.length > 0 && (
          <div className="mt-8 bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h3 className="text-lg font-semibold mb-4">Recent Tasks (Context)</h3>
            <p className="text-sm text-gray-400 mb-4">
              The AI has context about these recent tasks and can answer questions about them.
            </p>
            <div className="space-y-2">
              {recentTasks.map(task => (
                <div key={task.id} className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
                  <span className="text-sm text-gray-300 truncate flex-1">{task.summary}</span>
                  <span className="text-xs text-green-400 ml-2">${task.cost.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
          <h3 className="font-semibold text-blue-300 mb-2">💡 How it works</h3>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• Click "Start Voice Standup" to begin a voice conversation</li>
            <li>• Ask questions like "What did you work on today?" or "How much did we spend?"</li>
            <li>• The AI has full context of your agent's recent activity</li>
            <li>• Speak naturally - it will respond with voice</li>
          </ul>
        </div>
      </main>
    </div>
  )
}
