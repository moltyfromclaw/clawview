import { createFileRoute } from '@tanstack/react-router'
import { getWebRequest } from '@tanstack/react-start/server'

/**
 * Instance Registry API
 * 
 * Manages registered OpenClaw instances in ClawView.
 * 
 * GET /api/instances - List all instances
 * POST /api/instances - Register new instance
 * GET /api/instances/:id - Get instance details
 * DELETE /api/instances/:id - Remove instance
 */

interface Env {
  DB: D1Database
  INSTANCE_SECRET?: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

// Simple encryption for tokens (in production, use proper encryption)
function encryptToken(token: string, secret: string): string {
  // For now, just base64 encode - TODO: proper AES encryption
  return btoa(token)
}

function decryptToken(encrypted: string, secret: string): string {
  return atob(encrypted)
}

// Get Cloudflare env from various sources
function getEnv(context: any): Env | null {
  // Try context.cloudflare.env (TanStack Start)
  if (context?.cloudflare?.env?.DB) return context.cloudflare.env
  // Try context.env (direct)
  if (context?.env?.DB) return context.env
  // Try globalThis.__env (Cloudflare Workers)
  if ((globalThis as any).__env?.DB) return (globalThis as any).__env
  // Try process.env proxy for D1 (won't work, but log for debugging)
  console.log('Context keys:', Object.keys(context || {}))
  console.log('Context.cloudflare:', context?.cloudflare)
  return null
}

export const Route = createFileRoute('/api/instances')({
  server: {
    handlers: {
      // List all instances
      GET: async ({ request, context }) => {
        try {
          const env = getEnv(context)
          if (!env?.DB) {
            return new Response(JSON.stringify({ 
              ok: false, 
              error: 'Database not configured',
              debug: { contextKeys: Object.keys(context || {}) }
            }), { status: 500, headers: corsHeaders })
          }

          const result = await env.DB.prepare(`
            SELECT id, name, gateway_url, provider, provider_instance_id, 
                   region, tunnel_id, tunnel_url, email, status, 
                   last_seen_at, created_at, metadata
            FROM instances
            ORDER BY created_at DESC
          `).all()

          // Don't return encrypted tokens in list view
          const instances = result.results.map((row: any) => ({
            ...row,
            metadata: row.metadata ? JSON.parse(row.metadata) : null,
          }))

          return new Response(JSON.stringify({ 
            ok: true, 
            instances,
            count: instances.length,
          }), { headers: corsHeaders })

        } catch (error: any) {
          console.error('Failed to list instances:', error)
          return new Response(JSON.stringify({ 
            ok: false, 
            error: error.message 
          }), { status: 500, headers: corsHeaders })
        }
      },

      // Register new instance
      POST: async ({ request, context }) => {
        try {
          const env = getEnv(context)
          if (!env?.DB) {
            return new Response(JSON.stringify({ 
              ok: false, 
              error: 'Database not configured' 
            }), { status: 500, headers: corsHeaders })
          }

          const body = await request.json()
          const {
            name,
            gatewayUrl,
            gatewayToken,
            provider,
            providerInstanceId,
            region,
            tunnelId,
            tunnelUrl,
            email,
            metadata = {},
          } = body as any

          if (!name || !gatewayUrl) {
            return new Response(JSON.stringify({ 
              ok: false, 
              error: 'name and gatewayUrl are required' 
            }), { status: 400, headers: corsHeaders })
          }

          const id = crypto.randomUUID()
          const secret = env.INSTANCE_SECRET || 'default-secret'
          const encryptedToken = gatewayToken 
            ? encryptToken(gatewayToken, secret) 
            : null

          await env.DB.prepare(`
            INSERT INTO instances (
              id, name, gateway_url, gateway_token_encrypted, provider,
              provider_instance_id, region, tunnel_id, tunnel_url, email,
              status, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unknown', ?)
          `).bind(
            id, name, gatewayUrl, encryptedToken, provider || null,
            providerInstanceId || null, region || null, tunnelId || null,
            tunnelUrl || null, email || null, JSON.stringify(metadata)
          ).run()

          return new Response(JSON.stringify({ 
            ok: true, 
            id,
            name,
            message: `Instance ${name} registered successfully`,
          }), { status: 201, headers: corsHeaders })

        } catch (error: any) {
          // Check for unique constraint violation
          if (error.message?.includes('UNIQUE constraint')) {
            return new Response(JSON.stringify({ 
              ok: false, 
              error: 'Instance with this name already exists' 
            }), { status: 409, headers: corsHeaders })
          }
          
          console.error('Failed to register instance:', error)
          return new Response(JSON.stringify({ 
            ok: false, 
            error: error.message 
          }), { status: 500, headers: corsHeaders })
        }
      },

      // Handle CORS preflight
      OPTIONS: async () => {
        return new Response(null, { headers: corsHeaders })
      },
    },
  },
})
