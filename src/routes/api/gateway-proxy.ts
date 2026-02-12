import { createFileRoute } from '@tanstack/react-router'

/**
 * Gateway Proxy API
 * 
 * Proxies requests to remote OpenClaw gateways, adding CORS headers.
 * This enables ClawView SaaS to connect to any OpenClaw gateway.
 * 
 * POST /api/gateway-proxy
 * Body: { gatewayUrl, token, tool, args }
 */

export const Route = createFileRoute('/api/gateway-proxy')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const corsHeaders = {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Content-Type': 'application/json',
        }

        try {
          const body = await request.json()
          const { gatewayUrl, token, tool, args = {} } = body

          if (!gatewayUrl || !tool) {
            return new Response(JSON.stringify({ 
              ok: false, 
              error: 'gatewayUrl and tool are required' 
            }), {
              status: 400,
              headers: corsHeaders,
            })
          }

          // Normalize gateway URL
          let baseUrl = gatewayUrl.replace(/\/$/, '')
          if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
            baseUrl = 'https://' + baseUrl
          }

          const invokeUrl = `${baseUrl}/tools/invoke`

          // Proxy request to the gateway
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          }
          if (token) {
            headers['Authorization'] = `Bearer ${token}`
          }

          const response = await fetch(invokeUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({ tool, args }),
          })

          if (!response.ok) {
            const errorText = await response.text()
            return new Response(JSON.stringify({
              ok: false,
              error: `Gateway returned ${response.status}: ${errorText}`,
              status: response.status,
            }), {
              status: response.status,
              headers: corsHeaders,
            })
          }

          const result = await response.json()
          return new Response(JSON.stringify(result), {
            headers: corsHeaders,
          })
        } catch (error) {
          console.error('Gateway proxy error:', error)
          return new Response(JSON.stringify({
            ok: false,
            error: error instanceof Error ? error.message : 'Proxy request failed',
          }), {
            status: 500,
            headers: corsHeaders,
          })
        }
      },

      OPTIONS: async () => {
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        })
      },
    },
  },
})
