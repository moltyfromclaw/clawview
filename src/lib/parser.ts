import { readFileSync, readdirSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

export interface UsageData {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  totalTokens: number;
  cost: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    total: number;
  };
}

export interface Message {
  id: string;
  parentId?: string;
  timestamp: string;
  type: string;
  message?: {
    role: string;
    content: Array<{
      type: string;
      text?: string;
      thinking?: string;
      name?: string;
      arguments?: Record<string, unknown>;
    }>;
    model?: string;
    provider?: string;
    usage?: UsageData;
    stopReason?: string;
  };
}

export interface Session {
  id: string;
  timestamp: string;
  cwd?: string;
  messages: Message[];
}

export interface Activity {
  id: string;
  sessionId: string;
  timestamp: Date;
  type: 'tool_call' | 'response' | 'thinking';
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  text?: string;
  thinkingSummary?: string;
  model?: string;
  usage?: UsageData;
  stopReason?: string;
}

export interface DailySummary {
  date: string;
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheRead: number;
  totalCacheWrite: number;
  activityCount: number;
  toolCalls: Record<string, number>;
  models: Record<string, number>;
}

export function parseSessionFile(filePath: string): Session | null {
  if (!existsSync(filePath)) return null;
  
  const messages: Message[] = [];
  let sessionInfo: Partial<Session> = {};
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.type === 'session') {
          sessionInfo = {
            id: parsed.id,
            timestamp: parsed.timestamp,
            cwd: parsed.cwd
          };
        } else if (parsed.type === 'message') {
          messages.push(parsed);
        }
      } catch {
        // Skip malformed lines
      }
    }
  } catch {
    return null;
  }

  if (!sessionInfo.id) return null;

  return {
    id: sessionInfo.id,
    timestamp: sessionInfo.timestamp || '',
    cwd: sessionInfo.cwd,
    messages
  };
}

export function getAllSessions(openclawDir: string = join(homedir(), '.openclaw')): Session[] {
  const sessionsDir = join(openclawDir, 'agents', 'main', 'sessions');
  
  if (!existsSync(sessionsDir)) {
    return [];
  }

  const files = readdirSync(sessionsDir)
    .filter(f => f.endsWith('.jsonl') && !f.includes('.deleted') && !f.includes('.lock'));
  
  const sessions: Session[] = [];
  
  for (const file of files) {
    const session = parseSessionFile(join(sessionsDir, file));
    if (session) {
      sessions.push(session);
    }
  }

  return sessions.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function extractActivities(session: Session): Activity[] {
  const activities: Activity[] = [];

  for (const msg of session.messages) {
    if (msg.type !== 'message' || !msg.message) continue;

    const { message } = msg;
    
    for (const content of message.content || []) {
      if (content.type === 'toolCall') {
        activities.push({
          id: `${msg.id}-${content.name}`,
          sessionId: session.id,
          timestamp: new Date(msg.timestamp),
          type: 'tool_call',
          toolName: content.name,
          toolArgs: content.arguments as Record<string, unknown>,
          model: message.model,
          usage: message.usage,
          stopReason: message.stopReason
        });
      } else if (content.type === 'text' && content.text) {
        activities.push({
          id: `${msg.id}-text`,
          sessionId: session.id,
          timestamp: new Date(msg.timestamp),
          type: 'response',
          text: content.text.slice(0, 500),
          model: message.model,
          usage: message.usage,
          stopReason: message.stopReason
        });
      } else if (content.type === 'thinking' && content.thinking) {
        activities.push({
          id: `${msg.id}-thinking`,
          sessionId: session.id,
          timestamp: new Date(msg.timestamp),
          type: 'thinking',
          thinkingSummary: content.thinking.slice(0, 200),
          model: message.model
        });
      }
    }
  }

  return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

export function calculateDailySummaries(sessions: Session[]): DailySummary[] {
  const dailyMap = new Map<string, DailySummary>();

  for (const session of sessions) {
    for (const msg of session.messages) {
      if (msg.type !== 'message' || !msg.message?.usage) continue;

      const date = new Date(msg.timestamp).toISOString().split('T')[0];
      const usage = msg.message.usage;
      const model = msg.message.model || 'unknown';

      let summary = dailyMap.get(date);
      if (!summary) {
        summary = {
          date,
          totalCost: 0,
          totalInputTokens: 0,
          totalOutputTokens: 0,
          totalCacheRead: 0,
          totalCacheWrite: 0,
          activityCount: 0,
          toolCalls: {},
          models: {}
        };
        dailyMap.set(date, summary);
      }

      summary.totalCost += usage.cost?.total || 0;
      summary.totalInputTokens += usage.input || 0;
      summary.totalOutputTokens += usage.output || 0;
      summary.totalCacheRead += usage.cacheRead || 0;
      summary.totalCacheWrite += usage.cacheWrite || 0;
      summary.activityCount += 1;
      summary.models[model] = (summary.models[model] || 0) + 1;

      // Count tool calls
      for (const content of msg.message.content || []) {
        if (content.type === 'toolCall' && content.name) {
          summary.toolCalls[content.name] = (summary.toolCalls[content.name] || 0) + 1;
        }
      }
    }
  }

  return Array.from(dailyMap.values()).sort((a, b) => b.date.localeCompare(a.date));
}

export function getOverallStats(sessions: Session[]) {
  let totalCost = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalMessages = 0;
  const toolCalls: Record<string, number> = {};
  const models: Record<string, number> = {};

  for (const session of sessions) {
    for (const msg of session.messages) {
      if (msg.type !== 'message' || !msg.message) continue;
      
      totalMessages++;
      
      const usage = msg.message.usage;
      if (usage) {
        totalCost += usage.cost?.total || 0;
        totalInputTokens += usage.input || 0;
        totalOutputTokens += usage.output || 0;
      }

      const model = msg.message.model || 'unknown';
      models[model] = (models[model] || 0) + 1;

      for (const content of msg.message.content || []) {
        if (content.type === 'toolCall' && content.name) {
          toolCalls[content.name] = (toolCalls[content.name] || 0) + 1;
        }
      }
    }
  }

  return {
    totalCost,
    totalInputTokens,
    totalOutputTokens,
    totalMessages,
    sessionCount: sessions.length,
    toolCalls,
    models
  };
}
