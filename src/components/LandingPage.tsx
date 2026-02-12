import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { AddAgentModal } from './AddAgentModal'

export function LandingPage() {
  const [showAddAgent, setShowAddAgent] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-emerald-950 to-gray-900 text-white">
      {/* Hero */}
      <header className="container mx-auto px-6 py-20 text-center">
        <div className="text-6xl mb-4">🌿</div>
        <h1 className="text-5xl font-bold mb-4">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
            Holly
          </span>
        </h1>
        <p className="text-xl text-gray-300 mb-2 max-w-2xl mx-auto">
          See what your AI agents are really doing
        </p>
        <p className="text-lg text-gray-400 mb-8 max-w-2xl mx-auto">
          Real-time observability for autonomous AI agents. Track costs, monitor tasks, 
          spot anomalies, and understand where your tokens actually go.
        </p>

        <div className="flex gap-4 justify-center mb-16">
          <Link
            to="/setup"
            className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold transition text-lg"
          >
            Connect Your Agent
          </Link>
          <button
            onClick={() => setShowAddAgent(true)}
            className="px-8 py-4 border border-emerald-500 hover:bg-emerald-500/20 rounded-xl font-semibold transition text-lg"
          >
            Quick Connect (Advanced)
          </button>
        </div>

        {/* Preview mockup */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-800/80 rounded-2xl border border-gray-700 p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="ml-4 text-sm text-gray-500">Holly Dashboard</span>
            </div>
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-emerald-400">$12.47</div>
                <div className="text-xs text-gray-400">Today's Cost</div>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-cyan-400">847</div>
                <div className="text-xs text-gray-400">Tasks</div>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-400">3</div>
                <div className="text-xs text-gray-400">Agents</div>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-400">94%</div>
                <div className="text-xs text-gray-400">Efficiency</div>
              </div>
            </div>
            <div className="h-32 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-lg flex items-center justify-center text-gray-500">
              Activity Timeline
            </div>
          </div>
        </div>
      </header>

      {/* Features */}
      <section className="container mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">What Holly Shows You</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          <FeatureCard
            icon="📊"
            title="Task Tracking"
            description="See every task, grouped by conversation, with auto-generated summaries"
          />
          <FeatureCard
            icon="💡"
            title="Optimization Insights"
            description="Get actionable tips: wrong model, bloated sessions, cache misses"
          />
          <FeatureCard
            icon="💰"
            title="Cost Analysis"
            description="Breakdown by day, task type, and model. Find where money goes."
          />
          <FeatureCard
            icon="⚡"
            title="Efficiency Score"
            description="One number to track: how well are you using your tokens?"
          />
        </div>
      </section>

      {/* The Problem */}
      <section className="container mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">The Problem</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="bg-gray-800/50 rounded-xl p-6 text-center border border-red-500/30">
            <div className="text-4xl font-bold text-red-400">$3,600</div>
            <div className="text-gray-400">Monthly bill for one power user</div>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-6 text-center border border-yellow-500/30">
            <div className="text-4xl font-bold text-yellow-400">40-50%</div>
            <div className="text-gray-400">Tokens wasted on context bloat</div>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-6 text-center border border-orange-500/30">
            <div className="text-4xl font-bold text-orange-400">25x</div>
            <div className="text-gray-400">Cost difference (wrong model choice)</div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold mb-4">Stop Flying Blind</h2>
        <p className="text-gray-400 mb-8 max-w-xl mx-auto">
          Connect your OpenClaw agent in seconds. Get instant visibility into costs, tasks, and performance.
        </p>
        <button
          onClick={() => setShowAddAgent(true)}
          className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold transition text-lg"
        >
          Get Started Free
        </button>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8">
        <div className="container mx-auto px-6 text-center text-gray-500">
          <p>
            Built with 🌿 by{' '}
            <a href="https://x.com/MoltyFromClaw" className="text-emerald-400 hover:underline">
              @MoltyFromClaw
            </a>
          </p>
        </div>
      </footer>

      <AddAgentModal
        open={showAddAgent}
        onOpenChange={setShowAddAgent}
        onAgentAdded={() => {
          // Redirect to dashboard after adding agent (use ?saas=false to show dashboard)
          window.location.href = '/?saas=false'
        }}
      />
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 hover:border-emerald-500/50 transition">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  )
}
