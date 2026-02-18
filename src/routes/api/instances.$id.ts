import { createFileRoute } from '@tanstack/react-router'

/**
 * Single Instance API
 * 
 * GET /api/instances/:id - Get instance details (with decrypted token)
 * PUT /api/instances/:id - Update instance
 * DELETE /api/instances/:id - Remove instance
 * POST /api/instances/:id/health - Record health check
 */

interface Env {
  DB: D1Database
  INSTANCE_SECRET?: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function decryptToken(encrypted: string, secret: string): string {
  return atob(encrypted)
}

function encryptToken(token: string, secret: string): string {
  return btoa(token)
}

export const Route = createFileRoute('/api/instances/$id')({
  server: {
    handlers: {
      // Get instance details
      GET: async ({ request, params, context }) => {
        try {
          const env = (context as any).cloudflare?.env as Env
          if (!env?.DB) {
            return new Response(JSON.stringify({ 
              ok: false, 
              error: 'Database not configured' 
            }), { status: 500, headers: corsHeaders })
          }

          const { id } = params as { id: string }

          // Allow lookup by ID or name
          const result = await env.DB.prepare(`
            SELECT * FROM instances WHERE id = ? OR name = ?
          `).bind(id, id).first()

          if (!result) {
            return new Response(JSON.stringify({ 
              ok: false, 
              error: 'Instance not found' 
            }), { status: 404, headers: corsHeaders })
          }

          const secret = env.INSTANCE_SECRET || 'default-secret'
          const instance = {
            ...result,
            gateway_token: result.gateway_token_encrypted 
              ? decryptToken(result.gateway_token_encrypted as string, secret)
              : null,
            gateway_token_encrypted: undefined, // Don't expose encrypted form
            metadata: result.metadata ? JSON.parse(result.metadata as string) : null,
          }

          // Get recent health checks
          const healthResult = await env.DB.prepare(`
            SELECT status, response_time_ms, error_message, checked_at
            FROM instance_health
            WHERE instance_id = ?
            ORDER BY checked_at DESC
            LIMIT 10
          `).bind(result.id).all()

          return new Response(JSON.stringify({ 
            ok: true, 
            instance,
            healthHistory: healthResult.results,
          }), { headers: corsHeaders })

        } catch (error: any) {
          console.error('Failed to get instance:', error)
          return new Response(JSON.stringify({ 
            ok: false, 
            error: error.message 
          }), { status: 500, headers: corsHeaders })
        }
      },

      // Update instance
      PUT: async ({ request, params, context }) => {
        try {
          const env = (context as any).cloudflare?.env as Env
          if (!env?.DB) {
            return new Response(JSON.stringify({ 
              ok: false, 
              error: 'Database not configured' 
            }), { status: 500, headers: corsHeaders })
          }

          const { id } = params as { id: string }
          const body = await request.json() as any
          const {
            gatewayUrl,
            gatewayToken,
            status,
            metadata,
          } = body

          const updates: string[] = []
          const values: any[] = []

          if (gatewayUrl) {
            updates.push('gateway_url = ?')
            values.push(gatewayUrl)
          }
          if (gatewayToken) {
            const secret = env.INSTANCE_SECRET || 'default-secret'
            updates.push('gateway_token_encrypted = ?')
            values.push(encryptToken(gatewayToken, secret))
          }
          if (status) {
            updates.push('status = ?')
            values.push(status)
          }
          if (metadata) {
            updates.push('metadata = ?')
            values.push(JSON.stringify(metadata))
          }

          if (updates.length === 0) {
            return new Response(JSON.stringify({ 
              ok: false, 
              error: 'No fields to update' 
            }), { status: 400, headers: corsHeaders })
          }

          updates.push('updated_at = CURRENT_TIMESTAMP')
          values.push(id, id) // For WHERE clause (id OR name)

          await env.DB.prepare(`
            UPDATE instances SET ${updates.join(', ')}
            WHERE id = ? OR name = ?
          `).bind(...values).run()

          return new Response(JSON.stringify({ 
            ok: true, 
            message: 'Instance updated' 
          }), { headers: corsHeaders })

        } catch (error: any) {
          console.error('Failed to update instance:', error)
          return new Response(JSON.stringify({ 
            ok: false, 
            error: error.message 
          }), { status: 500, headers: corsHeaders })
        }
      },

      // Delete instance
      DELETE: async ({ request, params, context }) => {
        try {
          const env = (context as any).cloudflare?.env as Env
          if (!env?.DB) {
            return new Response(JSON.stringify({ 
              ok: false, 
              error: 'Database not configured' 
            }), { status: 500, headers: corsHeaders })
          }

          const { id } = params as { id: string }

          // Delete health records first
          await env.DB.prepare(`
            DELETE FROM instance_health WHERE instance_id IN (
              SELECT id FROM instances WHERE id = ? OR name = ?
            )
          `).bind(id, id).run()

          // Delete instance
          const result = await env.DB.prepare(`
            DELETE FROM instances WHERE id = ? OR name = ?
          `).bind(id, id).run()

          if (result.meta.changes === 0) {
            return new Response(JSON.stringify({ 
              ok: false, 
              error: 'Instance not found' 
            }), { status: 404, headers: corsHeaders })
          }

          return new Response(JSON.stringify({ 
            ok: true, 
            message: 'Instance deleted' 
          }), { headers: corsHeaders })

        } catch (error: any) {
          console.error('Failed to delete instance:', error)
          return new Response(JSON.stringify({ 
            ok: false, 
            error: error.message 
          }), { status: 500, headers: corsHeaders })
        }
      },

      // Record health check (called by instances or health monitor)
      POST: async ({ request, params, context }) => {
        try {
          const env = (context as any).cloudflare?.env as Env
          if (!env?.DB) {
            return new Response(JSON.stringify({ 
              ok: false, 
              error: 'Database not configured' 
            }), { status: 500, headers: corsHeaders })
          }

          const { id } = params as { id: string }
          const body = await request.json() as any
          const { status, responseTimeMs, errorMessage } = body

          // Get instance ID
          const instance = await env.DB.prepare(`
            SELECT id FROM instances WHERE id = ? OR name = ?
          `).bind(id, id).first()

          if (!instance) {
            return new Response(JSON.stringify({ 
              ok: false, 
              error: 'Instance not found' 
            }), { status: 404, headers: corsHeaders })
          }

          // Insert health record
          await env.DB.prepare(`
            INSERT INTO instance_health (instance_id, status, response_time_ms, error_message)
            VALUES (?, ?, ?, ?)
          `).bind(instance.id, status, responseTimeMs || null, errorMessage || null).run()

          // Update instance status and last_seen
          await env.DB.prepare(`
            UPDATE instances SET status = ?, last_seen_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).bind(status, instance.id).run()

          return new Response(JSON.stringify({ 
            ok: true, 
            message: 'Health recorded' 
          }), { headers: corsHeaders })

        } catch (error: any) {
          console.error('Failed to record health:', error)
          return new Response(JSON.stringify({ 
            ok: false, 
            error: error.message 
          }), { status: 500, headers: corsHeaders })
        }
      },

      OPTIONS: async () => {
        return new Response(null, { headers: corsHeaders })
      },
    },
  },
})
