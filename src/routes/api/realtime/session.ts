import { createFileRoute } from '@tanstack/react-router'
import { getAllSessions, getOverallStats, calculateDailySummaries } from '../../../lib/parser'
import { extractTasks } from '../../../lib/tasks'

export const Route = createFileRoute('/api/realtime/session')({
  server: {
    handlers: {
      POST: async () => {
        try {
          const apiKey = process.env.OPENAI_API_KEY
          
          if (!apiKey) {
            return new Response(JSON.stringify({ 
              error: 'OpenAI API key not configured. Set OPENAI_API_KEY environment variable.' 
            }), {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          // Get agent context for the voice session
          const sessions = getAllSessions()
          const stats = getOverallStats(sessions)
          const tasks = extractTasks(sessions)
          const dailySummaries = calculateDailySummaries(sessions)
          
          // Build context summary for the AI
          const recentTasks = tasks.slice(0, 20)
          const taskSummary = recentTasks.map(t => 
            `- ${t.summary} (${t.category}, $${t.cost.toFixed(2)})`
          ).join('\n')
          
          const todaySummary = dailySummaries[0]
          const contextPrompt = `You are Molty, a helpful AI agent assistant. You're having a voice standup conversation about work done by an OpenClaw AI agent.

Here's the agent's current status:
- Total spend: $${stats.totalCost.toFixed(2)}
- Total tasks: ${tasks.length}
- Sessions: ${stats.sessionCount}

Today's activity${todaySummary ? ` (${todaySummary.date})` : ''}:
- Cost: $${todaySummary?.totalCost.toFixed(2) || '0'}
- Activities: ${todaySummary?.activityCount || 0}

Recent tasks:
${taskSummary}

Be conversational, friendly, and concise. Summarize what the agent has been working on when asked. Answer questions about tasks, costs, and activity patterns.`

          // Create ephemeral token from OpenAI
          const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o-realtime-preview-2024-12-17',
              voice: 'alloy',
              instructions: contextPrompt,
            }),
          })

          if (!response.ok) {
            const error = await response.text()
            console.error('OpenAI Realtime error:', error)
            return new Response(JSON.stringify({ 
              error: 'Failed to create realtime session',
              details: error
            }), {
              status: response.status,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          const data = await response.json()
          
          return new Response(JSON.stringify({
            client_secret: data.client_secret,
            expires_at: data.expires_at,
          }), {
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (error) {
          console.error('Error creating realtime session:', error)
          return new Response(JSON.stringify({ 
            error: 'Failed to create realtime session',
            details: error instanceof Error ? error.message : 'Unknown error'
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          })
        }
      },
    },
  },
})
