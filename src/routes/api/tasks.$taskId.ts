import { createFileRoute } from '@tanstack/react-router'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

// Types
interface Step {
  id: string
  type: 'user' | 'assistant' | 'tool_call' | 'tool_result'
  timestamp: string
  durationMs: number
  name?: string
  content?: string
  toolName?: string
  toolArgs?: Record<string, unknown>
  toolResult?: string
  cost: number
  inputTokens: number
  outputTokens: number
  model?: string
}

interface TaskDetail {
  id: string
  sessionId: string
  startTime: string
  endTime: string
  durationMs: number
  summary: string
  category: string
  tags: string[]
  steps: Step[]
  totalCost: number
  totalInputTokens: number
  totalOutputTokens: number
  triggerType: string
  triggerText?: string
}

function parseSession(filepath: string): any {
  const content = readFileSync(filepath, 'utf-8')
  const lines = content.trim().split('\n')
  const messages: any[] = []
  
  for (const line of lines) {
    if (!line.trim()) continue
    try {
      messages.push(JSON.parse(line))
    } catch {}
  }
  
  return {
    id: filepath.split('/').pop()?.replace('.jsonl', '') || 'unknown',
    messages
  }
}

function getTaskDetail(taskId: string): TaskDetail | null {
  try {
    // Parse task ID: sessionId-task-index
    const match = taskId.match(/^(.+)-task-(\d+)$/)
    if (!match) return null
    
    const [, sessionId, indexStr] = match
    const taskIndex = parseInt(indexStr, 10)
    
    const sessionsDir = join(homedir(), '.openclaw', 'agents', 'main', 'sessions')
    const sessionFile = join(sessionsDir, `${sessionId}.jsonl`)
    
    if (!existsSync(sessionFile)) return null
    
    const session = parseSession(sessionFile)
    
    // Group messages into tasks (same logic as tasks.ts)
    const groups: { messages: any[], startTime: Date, endTime: Date, trigger?: string, triggerType: string }[] = []
    let currentGroup: any[] = []
    let currentTrigger: string | undefined
    let currentTriggerType = 'unknown'
    let groupStartTime: Date | null = null
    
    for (const msg of session.messages) {
      if (msg.type !== 'message' || !msg.message) continue
      
      const msgTime = new Date(msg.timestamp)
      
      if (msg.message.role === 'user') {
        if (currentGroup.length > 0 && groupStartTime) {
          groups.push({
            messages: currentGroup,
            startTime: groupStartTime,
            endTime: new Date(currentGroup[currentGroup.length - 1].timestamp),
            trigger: currentTrigger,
            triggerType: currentTriggerType
          })
        }
        
        currentGroup = [msg]
        groupStartTime = msgTime
        
        const userContent = msg.message.content?.[0]
        if (userContent && 'text' in userContent) {
          currentTrigger = String(userContent.text)
          currentTriggerType = currentTrigger.toLowerCase().includes('heartbeat') ? 'heartbeat' :
            currentTrigger.toLowerCase().includes('cron') ? 'cron' : 'user_message'
        }
      } else {
        if (!groupStartTime) groupStartTime = msgTime
        currentGroup.push(msg)
      }
    }
    
    if (currentGroup.length > 0 && groupStartTime) {
      groups.push({
        messages: currentGroup,
        startTime: groupStartTime,
        endTime: new Date(currentGroup[currentGroup.length - 1].timestamp),
        trigger: currentTrigger,
        triggerType: currentTriggerType
      })
    }
    
    if (taskIndex >= groups.length) return null
    
    const group = groups[taskIndex]
    
    // Extract steps from messages
    const steps: Step[] = []
    let totalCost = 0
    let totalInput = 0
    let totalOutput = 0
    let stepId = 0
    let prevTime = group.startTime
    
    for (const msg of group.messages) {
      if (!msg.message) continue
      
      const msgTime = new Date(msg.timestamp)
      const durationMs = msgTime.getTime() - prevTime.getTime()
      prevTime = msgTime
      
      const cost = msg.message.usage?.cost?.total || 0
      const inputTokens = msg.message.usage?.input || 0
      const outputTokens = msg.message.usage?.output || 0
      
      totalCost += cost
      totalInput += inputTokens
      totalOutput += outputTokens
      
      if (msg.message.role === 'user') {
        const content = msg.message.content?.[0]
        steps.push({
          id: `step-${stepId++}`,
          type: 'user',
          timestamp: msg.timestamp,
          durationMs: Math.max(0, durationMs),
          content: content?.text?.slice(0, 500) || '[User message]',
          cost: 0,
          inputTokens: 0,
          outputTokens: 0,
        })
      } else if (msg.message.role === 'assistant') {
        // Process each content block
        for (const content of msg.message.content || []) {
          if (content.type === 'toolCall') {
            steps.push({
              id: `step-${stepId++}`,
              type: 'tool_call',
              timestamp: msg.timestamp,
              durationMs: Math.max(0, durationMs),
              toolName: content.name,
              toolArgs: content.arguments,
              cost: cost / (msg.message.content?.length || 1),
              inputTokens: Math.floor(inputTokens / (msg.message.content?.length || 1)),
              outputTokens: Math.floor(outputTokens / (msg.message.content?.length || 1)),
              model: msg.message.model,
            })
          } else if (content.type === 'toolResult') {
            steps.push({
              id: `step-${stepId++}`,
              type: 'tool_result',
              timestamp: msg.timestamp,
              durationMs: 0,
              toolName: content.name,
              toolResult: typeof content.result === 'string' 
                ? content.result.slice(0, 1000) 
                : JSON.stringify(content.result).slice(0, 1000),
              cost: 0,
              inputTokens: 0,
              outputTokens: 0,
            })
          } else if (content.type === 'text' && content.text) {
            steps.push({
              id: `step-${stepId++}`,
              type: 'assistant',
              timestamp: msg.timestamp,
              durationMs: Math.max(0, durationMs),
              content: content.text.slice(0, 500),
              cost,
              inputTokens,
              outputTokens,
              model: msg.message.model,
            })
          }
        }
      }
    }
    
    // Generate summary
    const toolsUsed = steps.filter(s => s.type === 'tool_call').map(s => s.toolName || '')
    const uniqueTools = [...new Set(toolsUsed)]
    
    let summary = 'Task activity'
    if (uniqueTools.length > 0) {
      summary = `Activity (${uniqueTools.slice(0, 3).join(', ')})`
    }
    if (group.trigger && group.trigger.length > 20) {
      summary = `Responded to: "${group.trigger.slice(0, 50)}..."`
    }
    
    // Determine category
    let category = 'other'
    if (uniqueTools.includes('browser')) category = 'browser'
    else if (uniqueTools.includes('web_search')) category = 'research'
    else if (uniqueTools.includes('exec')) category = 'coding'
    else if (uniqueTools.includes('message')) category = 'communication'
    
    return {
      id: taskId,
      sessionId,
      startTime: group.startTime.toISOString(),
      endTime: group.endTime.toISOString(),
      durationMs: group.endTime.getTime() - group.startTime.getTime(),
      summary,
      category,
      tags: uniqueTools.slice(0, 5),
      steps,
      totalCost,
      totalInputTokens: totalInput,
      totalOutputTokens: totalOutput,
      triggerType: group.triggerType,
      triggerText: group.trigger?.slice(0, 200),
    }
  } catch (error) {
    console.error('Error getting task detail:', error)
    return null
  }
}

export const Route = createFileRoute('/api/tasks/$taskId')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const task = getTaskDetail(params.taskId)
        
        if (!task) {
          return new Response(JSON.stringify({ error: 'Task not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        
        return new Response(JSON.stringify(task), {
          headers: { 'Content-Type': 'application/json' },
        })
      },
    },
  },
})
