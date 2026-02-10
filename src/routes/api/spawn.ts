import { createFileRoute } from '@tanstack/react-router'

// Types
interface SpawnRequest {
  task: string
  label?: string
  model?: string
  timeoutSeconds?: number
}

interface SpawnResponse {
  sessionKey: string
  status: string
}

export const Route = createFileRoute('/api/spawn')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body: SpawnRequest = await request.json()
          
          if (!body.task) {
            return new Response(JSON.stringify({ error: 'Task is required' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          // Call the local OpenClaw gateway to spawn a sub-agent
          const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789'
          const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN

          const spawnPayload = {
            task: body.task,
            label: body.label,
            model: body.model,
            runTimeoutSeconds: body.timeoutSeconds || 300,
            cleanup: 'keep',
          }

          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          }
          if (gatewayToken) {
            headers['Authorization'] = `Bearer ${gatewayToken}`
          }

          const response = await fetch(`${gatewayUrl}/v1/sessions/spawn`, {
            method: 'POST',
            headers,
            body: JSON.stringify(spawnPayload),
          })

          if (!response.ok) {
            const errorText = await response.text()
            console.error('Gateway spawn error:', errorText)
            return new Response(JSON.stringify({ 
              error: `Gateway error: ${response.status}`,
              details: errorText 
            }), {
              status: response.status,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          const data = await response.json()
          
          const result: SpawnResponse = {
            sessionKey: data.sessionKey || data.session?.key || 'unknown',
            status: 'running',
          }

          return new Response(JSON.stringify(result), {
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (error) {
          console.error('Spawn error:', error)
          return new Response(JSON.stringify({ 
            error: error instanceof Error ? error.message : 'Failed to spawn agent' 
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          })
        }
      },
    },
  },
})
