import { createFileRoute } from '@tanstack/react-router'

/**
 * Stats Proxy API
 * 
 * Proxies requests to a user's stats endpoint (created by the setup prompt).
 * This enables ClawView to connect to stats servers that aren't directly accessible
 * from the browser due to CORS.
 */

export const Route = createFileRoute('/api/stats-proxy')({
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
          const { url, token, path = '/stats' } = body

          if (!url) {
            return new Response(JSON.stringify({
              ok: false,
              error: 'URL is required',
            }), {
              status: 400,
              headers: corsHeaders,
            })
          }

          // Normalize URL
          let baseUrl = url.replace(/\/$/, '')
          if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
            baseUrl = 'http://' + baseUrl
          }

          const fetchUrl = `${baseUrl}${path}`

          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          }
          if (token) {
            headers['Authorization'] = `Bearer ${token}`
          }

          const response = await fetch(fetchUrl, {
            method: 'GET',
            headers,
          })

          if (!response.ok) {
            const errorText = await response.text()
            let errorMessage = `Stats server returned ${response.status}: ${errorText}`
            if (response.status === 403) {
              errorMessage =
                'Stats server returned 403. The gateway may only allow requests from your local network (the proxy runs on our server), or the token may be invalid. Try opening ClawView from the same network as the gateway, or ensure the stats server allows requests from Cloudflare.'
            }
            return new Response(JSON.stringify({
              ok: false,
              error: errorMessage,
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
          console.error('Stats proxy error:', error)
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
