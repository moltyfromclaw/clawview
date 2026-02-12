/**
 * Remote Gateway Client
 * 
 * Fetches data from remote OpenClaw gateways via the proxy API.
 * Converts session data into stats/tasks format for the dashboard.
 */

export interface GatewayConfig {
  url: string
  token?: string
}

export interface RemoteSession {
  key: string
  kind?: string
  channel?: string
  displayName?: string
  updatedAt?: number
  sessionId?: string
  model?: string
  totalTokens?: number
  transcriptPath?: string
  messages?: RemoteMessage[]
}

export interface RemoteMessage {
  role: string
  content: Array<{
    type: string
    text?: string
    thinking?: string
    name?: string
    arguments?: Record<string, unknown>
  }>
  api?: string
  provider?: string
  model?: string
  usage?: {
    input: number
    output: number
    cacheRead?: number
    cacheWrite?: number
    totalTokens?: number
    cost?: {
      input: number
      output: number
      cacheRead?: number
      cacheWrite?: number
      total: number
    }
  }
  stopReason?: string
  timestamp?: number
}

export interface Stats {
  totalCost: number
  totalInputTokens: number
  totalOutputTokens: number
  totalMessages: number
  sessionCount: number
  toolCalls: Record<string, number>
  models: Record<string, number>
}

export interface DailySummary {
  date: string
  totalCost: number
  totalInputTokens: number
  totalOutputTokens: number
  activityCount: number
  toolCalls: Record<string, number>
}

export interface Task {
  id: string
  sessionId: string
  startTime: string
  endTime: string
  durationMs: number
  summary: string
  category: string
  tags: string[]
  activityCount: number
  toolsUsed: string[]
  cost: number
  inputTokens: number
  outputTokens: number
  triggerType: string
  triggerText?: string
}

export interface TaskStats {
  [category: string]: {
    count: number
    totalCost: number
    avgDuration: number
  }
}

/**
 * Call a tool on a remote gateway via the proxy
 */
async function invokeGatewayTool(
  gateway: GatewayConfig,
  tool: string,
  args: Record<string, unknown> = {}
): Promise<unknown> {
  console.log('[RemoteGateway] Invoking tool:', tool, 'on', gateway.url)
  
  const response = await fetch('/api/gateway-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gatewayUrl: gateway.url,
      token: gateway.token,
      tool,
      args,
    }),
  })

  console.log('[RemoteGateway] Response status:', response.status)

  if (!response.ok) {
    const text = await response.text()
    console.error('[RemoteGateway] Proxy request failed:', response.status, text)
    throw new Error(`Proxy request failed: ${response.status}`)
  }

  const result = await response.json()
  console.log('[RemoteGateway] Result:', result.ok, result.error || 'success')
  
  if (!result.ok) {
    console.error('[RemoteGateway] Gateway error:', result.error)
    throw new Error(result.error || 'Gateway request failed')
  }

  // Gateway returns { result: { content: [...], details: {...} } }
  // The actual data is in details
  const data = result.result?.details || result.result
  console.log('[RemoteGateway] Extracted data keys:', Object.keys(data || {}))
  return data
}

/**
 * Fetch sessions list from a remote gateway
 */
export async function fetchRemoteSessions(
  gateway: GatewayConfig,
  options: { limit?: number; messageLimit?: number } = {}
): Promise<RemoteSession[]> {
  const result = await invokeGatewayTool(gateway, 'sessions_list', {
    limit: options.limit || 100,
    messageLimit: options.messageLimit || 50, // Get more messages for better cost data
  }) as { sessions: RemoteSession[] }
  
  return result.sessions || []
}

/**
 * Fetch session history from a remote gateway
 */
export async function fetchRemoteHistory(
  gateway: GatewayConfig,
  sessionKey: string,
  options: { limit?: number; includeTools?: boolean } = {}
): Promise<RemoteMessage[]> {
  const result = await invokeGatewayTool(gateway, 'sessions_history', {
    sessionKey,
    limit: options.limit || 100,
    includeTools: options.includeTools ?? true,
  }) as { messages: RemoteMessage[] }
  
  return result.messages || []
}

/**
 * Calculate stats from remote sessions
 */
export function calculateStatsFromSessions(sessions: RemoteSession[]): Stats {
  const stats: Stats = {
    totalCost: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalMessages: 0,
    sessionCount: sessions.length,
    toolCalls: {},
    models: {},
  }

  for (const session of sessions) {
    for (const msg of session.messages || []) {
      if (!msg.usage) continue

      stats.totalMessages++
      stats.totalCost += msg.usage.cost?.total || 0
      stats.totalInputTokens += msg.usage.input || 0
      stats.totalOutputTokens += msg.usage.output || 0

      const model = msg.model || 'unknown'
      stats.models[model] = (stats.models[model] || 0) + 1

      for (const content of msg.content || []) {
        if (content.type === 'toolCall' && content.name) {
          stats.toolCalls[content.name] = (stats.toolCalls[content.name] || 0) + 1
        }
      }
    }
  }

  return stats
}

/**
 * Calculate daily summaries from remote sessions
 */
export function calculateDailySummariesFromSessions(sessions: RemoteSession[]): DailySummary[] {
  const dailyMap = new Map<string, DailySummary>()

  for (const session of sessions) {
    for (const msg of session.messages || []) {
      if (!msg.usage || !msg.timestamp) continue

      const date = new Date(msg.timestamp).toISOString().split('T')[0]

      let summary = dailyMap.get(date)
      if (!summary) {
        summary = {
          date,
          totalCost: 0,
          totalInputTokens: 0,
          totalOutputTokens: 0,
          activityCount: 0,
          toolCalls: {},
        }
        dailyMap.set(date, summary)
      }

      summary.totalCost += msg.usage.cost?.total || 0
      summary.totalInputTokens += msg.usage.input || 0
      summary.totalOutputTokens += msg.usage.output || 0
      summary.activityCount += 1

      for (const content of msg.content || []) {
        if (content.type === 'toolCall' && content.name) {
          summary.toolCalls[content.name] = (summary.toolCalls[content.name] || 0) + 1
        }
      }
    }
  }

  return Array.from(dailyMap.values()).sort((a, b) => b.date.localeCompare(a.date))
}

/**
 * Extract tasks from remote sessions
 */
export function extractTasksFromSessions(sessions: RemoteSession[]): { tasks: Task[]; stats: TaskStats } {
  const tasks: Task[] = []
  const categoryStats: TaskStats = {
    communication: { count: 0, totalCost: 0, avgDuration: 0 },
    research: { count: 0, totalCost: 0, avgDuration: 0 },
    coding: { count: 0, totalCost: 0, avgDuration: 0 },
    file_management: { count: 0, totalCost: 0, avgDuration: 0 },
    monitoring: { count: 0, totalCost: 0, avgDuration: 0 },
    scheduling: { count: 0, totalCost: 0, avgDuration: 0 },
    browser: { count: 0, totalCost: 0, avgDuration: 0 },
    system: { count: 0, totalCost: 0, avgDuration: 0 },
    other: { count: 0, totalCost: 0, avgDuration: 0 },
  }
  const durations: Record<string, number[]> = {}

  for (const session of sessions) {
    const messages = session.messages || []
    if (messages.length === 0) continue

    // Group messages into tasks (simplified: each session = one task for now)
    const toolsUsed: string[] = []
    const tags: string[] = []
    let cost = 0
    let inputTokens = 0
    let outputTokens = 0
    let activityCount = 0
    let startTime: number | null = null
    let endTime: number | null = null

    for (const msg of messages) {
      if (msg.timestamp) {
        if (!startTime || msg.timestamp < startTime) startTime = msg.timestamp
        if (!endTime || msg.timestamp > endTime) endTime = msg.timestamp
      }

      activityCount++
      cost += msg.usage?.cost?.total || 0
      inputTokens += msg.usage?.input || 0
      outputTokens += msg.usage?.output || 0

      for (const content of msg.content || []) {
        if (content.type === 'toolCall' && content.name) {
          if (!toolsUsed.includes(content.name)) {
            toolsUsed.push(content.name)
          }
        }
      }
    }

    // Categorize
    const category = categorizeFromTools(toolsUsed)
    const durationMs = startTime && endTime ? endTime - startTime : 0

    // Generate summary
    const summary = generateTaskSummary(toolsUsed, session.displayName || session.key)

    // Detect trigger type
    const triggerType = detectTriggerType(session.key)

    const task: Task = {
      id: session.sessionId || session.key,
      sessionId: session.sessionId || session.key,
      startTime: startTime ? new Date(startTime).toISOString() : new Date().toISOString(),
      endTime: endTime ? new Date(endTime).toISOString() : new Date().toISOString(),
      durationMs,
      summary,
      category,
      tags: extractTags(toolsUsed, session.channel),
      activityCount,
      toolsUsed,
      cost,
      inputTokens,
      outputTokens,
      triggerType,
      triggerText: session.displayName,
    }

    tasks.push(task)

    // Update stats
    categoryStats[category].count++
    categoryStats[category].totalCost += cost
    if (!durations[category]) durations[category] = []
    durations[category].push(durationMs)
  }

  // Calculate averages
  for (const cat of Object.keys(categoryStats)) {
    if (durations[cat]?.length > 0) {
      categoryStats[cat].avgDuration =
        durations[cat].reduce((a, b) => a + b, 0) / durations[cat].length
    }
  }

  return {
    tasks: tasks.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()),
    stats: categoryStats,
  }
}

function categorizeFromTools(tools: string[]): string {
  const toolSet = new Set(tools.map(t => t.toLowerCase()))

  if (toolSet.has('message')) return 'communication'
  if (toolSet.has('web_search') || toolSet.has('web_fetch')) return 'research'
  if (toolSet.has('browser')) return 'browser'
  if (toolSet.has('cron')) return 'scheduling'
  if (toolSet.has('gateway')) return 'system'
  if (toolSet.has('write') || toolSet.has('edit')) return 'coding'
  if (toolSet.has('read')) return 'file_management'
  if (toolSet.has('exec')) return 'monitoring'

  return 'other'
}

function generateTaskSummary(tools: string[], sessionName: string): string {
  if (tools.includes('message')) return 'Sent message'
  if (tools.includes('web_search')) return 'Web search'
  if (tools.includes('browser')) return 'Browser automation'
  if (tools.includes('cron')) return 'Scheduled task'
  if (tools.includes('write') || tools.includes('edit')) return 'Code/file changes'
  if (tools.includes('exec')) return 'Command execution'

  return sessionName || 'Activity'
}

function detectTriggerType(sessionKey: string): string {
  if (sessionKey.includes('heartbeat')) return 'heartbeat'
  if (sessionKey.includes('cron')) return 'cron'
  if (sessionKey.includes('webhook')) return 'webhook'
  if (sessionKey.includes('main')) return 'user_message'
  return 'unknown'
}

function extractTags(tools: string[], channel?: string): string[] {
  const tags: string[] = []

  if (tools.includes('browser')) tags.push('browser')
  if (tools.includes('exec')) tags.push('cli')
  if (tools.includes('web_search') || tools.includes('web_fetch')) tags.push('web')
  if (tools.includes('write') || tools.includes('edit')) tags.push('files')
  if (channel) tags.push(channel)

  return tags
}

/**
 * Fetch all dashboard data from a remote gateway
 */
export async function fetchRemoteDashboardData(gateway: GatewayConfig) {
  const sessions = await fetchRemoteSessions(gateway, { limit: 100, messageLimit: 10 })

  const stats = calculateStatsFromSessions(sessions)
  const dailySummaries = calculateDailySummariesFromSessions(sessions)
  const { tasks, stats: taskStats } = extractTasksFromSessions(sessions)

  return {
    stats,
    dailySummaries,
    tasks,
    taskStats,
    sessions,
  }
}
