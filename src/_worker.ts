/**
 * Cloudflare Worker entry point
 * Handles API routes natively, falls back to TanStack Start for UI
 */

interface Env {
  DB: D1Database
  INSTANCE_SECRET?: string
  ASSETS: Fetcher
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }
    
    // API routes handled natively for D1 access
    if (url.pathname.startsWith('/api/instances')) {
      return handleInstancesAPI(request, env, url)
    }
    
    // Fall back to TanStack Start / assets
    return env.ASSETS.fetch(request)
  },
}

async function handleInstancesAPI(request: Request, env: Env, url: URL): Promise<Response> {
  const pathParts = url.pathname.split('/').filter(Boolean) // ['api', 'instances', 'id?']
  const instanceId = pathParts[2] || null
  
  try {
    // GET /api/instances - List all
    if (request.method === 'GET' && !instanceId) {
      const result = await env.DB.prepare(`
        SELECT id, name, gateway_url, provider, provider_instance_id, 
               region, tunnel_id, tunnel_url, email, status, 
               last_seen_at, created_at, metadata
        FROM instances ORDER BY created_at DESC
      `).all()
      
      const instances = result.results.map((row: any) => ({
        ...row,
        metadata: row.metadata ? JSON.parse(row.metadata) : null,
      }))
      
      return Response.json({ ok: true, instances, count: instances.length }, { headers: corsHeaders })
    }
    
    // POST /api/instances - Register new
    if (request.method === 'POST' && !instanceId) {
      const body = await request.json() as any
      const { name, gatewayUrl, gatewayToken, provider, providerInstanceId, region, tunnelId, tunnelUrl, email, metadata = {} } = body
      
      if (!name || !gatewayUrl) {
        return Response.json({ ok: false, error: 'name and gatewayUrl are required' }, { status: 400, headers: corsHeaders })
      }
      
      const id = crypto.randomUUID()
      const encryptedToken = gatewayToken ? btoa(gatewayToken) : null
      
      await env.DB.prepare(`
        INSERT INTO instances (id, name, gateway_url, gateway_token_encrypted, provider, provider_instance_id, region, tunnel_id, tunnel_url, email, status, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unknown', ?)
      `).bind(id, name, gatewayUrl, encryptedToken, provider || null, providerInstanceId || null, region || null, tunnelId || null, tunnelUrl || null, email || null, JSON.stringify(metadata)).run()
      
      return Response.json({ ok: true, id, name, message: `Instance ${name} registered` }, { status: 201, headers: corsHeaders })
    }
    
    // GET /api/instances/:id - Get single
    if (request.method === 'GET' && instanceId) {
      const result = await env.DB.prepare(`SELECT * FROM instances WHERE id = ? OR name = ?`).bind(instanceId, instanceId).first()
      
      if (!result) {
        return Response.json({ ok: false, error: 'Instance not found' }, { status: 404, headers: corsHeaders })
      }
      
      const instance = {
        ...result,
        gateway_token: result.gateway_token_encrypted ? atob(result.gateway_token_encrypted as string) : null,
        gateway_token_encrypted: undefined,
        metadata: result.metadata ? JSON.parse(result.metadata as string) : null,
      }
      
      // Get health history
      const healthResult = await env.DB.prepare(`
        SELECT status, response_time_ms, error_message, checked_at FROM instance_health
        WHERE instance_id = ? ORDER BY checked_at DESC LIMIT 10
      `).bind(result.id).all()
      
      return Response.json({ ok: true, instance, healthHistory: healthResult.results }, { headers: corsHeaders })
    }
    
    // PUT /api/instances/:id - Update
    if (request.method === 'PUT' && instanceId) {
      const body = await request.json() as any
      const { gatewayUrl, gatewayToken, status, metadata } = body
      
      const updates: string[] = []
      const values: any[] = []
      
      if (gatewayUrl) { updates.push('gateway_url = ?'); values.push(gatewayUrl) }
      if (gatewayToken) { updates.push('gateway_token_encrypted = ?'); values.push(btoa(gatewayToken)) }
      if (status) { updates.push('status = ?'); values.push(status) }
      if (metadata) { updates.push('metadata = ?'); values.push(JSON.stringify(metadata)) }
      
      if (updates.length === 0) {
        return Response.json({ ok: false, error: 'No fields to update' }, { status: 400, headers: corsHeaders })
      }
      
      updates.push('updated_at = CURRENT_TIMESTAMP')
      values.push(instanceId, instanceId)
      
      await env.DB.prepare(`UPDATE instances SET ${updates.join(', ')} WHERE id = ? OR name = ?`).bind(...values).run()
      
      return Response.json({ ok: true, message: 'Instance updated' }, { headers: corsHeaders })
    }
    
    // DELETE /api/instances/:id
    if (request.method === 'DELETE' && instanceId) {
      await env.DB.prepare(`DELETE FROM instance_health WHERE instance_id IN (SELECT id FROM instances WHERE id = ? OR name = ?)`).bind(instanceId, instanceId).run()
      const result = await env.DB.prepare(`DELETE FROM instances WHERE id = ? OR name = ?`).bind(instanceId, instanceId).run()
      
      if (result.meta.changes === 0) {
        return Response.json({ ok: false, error: 'Instance not found' }, { status: 404, headers: corsHeaders })
      }
      
      return Response.json({ ok: true, message: 'Instance deleted' }, { headers: corsHeaders })
    }
    
    // POST /api/instances/:id/health - Record health check
    if (request.method === 'POST' && instanceId && url.pathname.endsWith('/health')) {
      const body = await request.json() as any
      const { status, responseTimeMs, errorMessage } = body
      
      const instance = await env.DB.prepare(`SELECT id FROM instances WHERE id = ? OR name = ?`).bind(instanceId, instanceId).first()
      if (!instance) {
        return Response.json({ ok: false, error: 'Instance not found' }, { status: 404, headers: corsHeaders })
      }
      
      await env.DB.prepare(`INSERT INTO instance_health (instance_id, status, response_time_ms, error_message) VALUES (?, ?, ?, ?)`).bind(instance.id, status, responseTimeMs || null, errorMessage || null).run()
      await env.DB.prepare(`UPDATE instances SET status = ?, last_seen_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(status, instance.id).run()
      
      return Response.json({ ok: true, message: 'Health recorded' }, { headers: corsHeaders })
    }
    
    return Response.json({ ok: false, error: 'Not found' }, { status: 404, headers: corsHeaders })
    
  } catch (error: any) {
    console.error('API error:', error)
    if (error.message?.includes('UNIQUE constraint')) {
      return Response.json({ ok: false, error: 'Instance with this name already exists' }, { status: 409, headers: corsHeaders })
    }
    return Response.json({ ok: false, error: error.message }, { status: 500, headers: corsHeaders })
  }
}
