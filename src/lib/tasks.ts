import { Session, Message } from './parser';

export interface Task {
  id: string;
  sessionId: string;
  startTime: Date;
  endTime: Date;
  durationMs: number;
  summary: string;
  category: TaskCategory;
  tags: string[];
  activityCount: number;
  toolsUsed: string[];
  cost: number;
  inputTokens: number;
  outputTokens: number;
  triggerType: 'user_message' | 'heartbeat' | 'cron' | 'webhook' | 'unknown';
  triggerText?: string;
  status: 'completed' | 'in_progress';
}

export type TaskCategory = 
  | 'communication'
  | 'research'
  | 'coding'
  | 'file_management'
  | 'monitoring'
  | 'scheduling'
  | 'browser'
  | 'system'
  | 'other';

interface MessageGroup {
  messages: Message[];
  startTime: Date;
  endTime: Date;
  triggerMessage?: string;
  triggerType: Task['triggerType'];
}

function detectTriggerType(text: string): Task['triggerType'] {
  const lowerText = text.toLowerCase();
  if (lowerText.includes('heartbeat') || lowerText.includes('heartbeat_ok')) {
    return 'heartbeat';
  }
  if (lowerText.includes('cron') || lowerText.includes('reminder')) {
    return 'cron';
  }
  if (lowerText.includes('webhook') || lowerText.includes('molt.tv')) {
    return 'webhook';
  }
  return 'user_message';
}

function categorizeTask(toolsUsed: string[], responseTexts: string[]): TaskCategory {
  const tools = new Set(toolsUsed.map(t => t.toLowerCase()));
  const allText = responseTexts.join(' ').toLowerCase();
  
  if (tools.has('message') || allText.includes('tweet') || allText.includes('posted')) {
    return 'communication';
  }
  if (tools.has('web_search') || tools.has('web_fetch')) {
    return 'research';
  }
  if (tools.has('browser')) {
    return 'browser';
  }
  if (tools.has('cron')) {
    return 'scheduling';
  }
  if (tools.has('gateway')) {
    return 'system';
  }
  if ((tools.has('exec') && !tools.has('read') && !tools.has('write')) || 
      allText.includes('curl') || allText.includes('poll')) {
    return 'monitoring';
  }
  if (tools.has('write') || tools.has('edit') || 
      (tools.has('exec') && (allText.includes('npm') || allText.includes('git')))) {
    return 'coding';
  }
  if (tools.has('read')) {
    return 'file_management';
  }
  
  return 'other';
}

function generateSummary(
  toolsUsed: string[], 
  toolArgs: Record<string, unknown>[],
  responseTexts: string[],
  triggerText?: string
): string {
  const tools = new Set(toolsUsed);
  
  if (responseTexts.some(t => t.includes('HEARTBEAT_OK'))) {
    return 'Heartbeat check - molt.tv chat polling';
  }
  
  if (tools.has('browser') && toolArgs.some(a => 
    JSON.stringify(a).includes('x.com') || JSON.stringify(a).includes('twitter'))) {
    if (toolArgs.some(a => JSON.stringify(a).includes('compose') || JSON.stringify(a).includes('tweet'))) {
      return 'Posted tweet via browser';
    }
    if (toolArgs.some(a => JSON.stringify(a).includes('search'))) {
      return 'Twitter/X research and search';
    }
    return 'Twitter/X browsing activity';
  }
  
  if (tools.has('web_search')) {
    const searchArgs = toolArgs.find(a => 'query' in a);
    if (searchArgs && 'query' in searchArgs) {
      return `Web search: "${String(searchArgs.query).slice(0, 50)}"`;
    }
    return 'Web search';
  }
  
  if (tools.has('Write') || tools.has('write')) {
    const writeArgs = toolArgs.find(a => 'path' in a || 'file_path' in a);
    if (writeArgs) {
      const path = String(writeArgs.path || writeArgs.file_path || '');
      const filename = path.split('/').pop() || path;
      return `Created/updated file: ${filename}`;
    }
    return 'File creation/update';
  }
  
  if (tools.has('exec')) {
    const execArgs = toolArgs.filter(a => 'command' in a);
    if (execArgs.some(a => String(a.command).includes('curl'))) {
      return 'API call / HTTP request';
    }
    if (execArgs.some(a => String(a.command).includes('npm'))) {
      return 'NPM package management';
    }
    if (execArgs.some(a => String(a.command).includes('git'))) {
      return 'Git operations';
    }
    return 'Shell command execution';
  }
  
  if (tools.has('cron')) {
    return 'Scheduled task / cron management';
  }
  
  if (tools.has('message')) {
    return 'Sent message';
  }
  
  if (triggerText && triggerText.length > 10) {
    const cleaned = triggerText
      .replace(/\[.*?\]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 60);
    if (cleaned.length > 10) {
      return `Responded to: "${cleaned}..."`;
    }
  }
  
  return `Activity (${toolsUsed.slice(0, 3).join(', ')})`;
}

function extractTags(
  toolsUsed: string[],
  toolArgs: Record<string, unknown>[],
  responseTexts: string[]
): string[] {
  const tags: Set<string> = new Set();
  
  if (toolsUsed.includes('browser')) tags.add('browser');
  if (toolsUsed.includes('exec')) tags.add('cli');
  if (toolsUsed.includes('web_search') || toolsUsed.includes('web_fetch')) tags.add('web');
  if (toolsUsed.includes('Write') || toolsUsed.includes('write') || toolsUsed.includes('Edit') || toolsUsed.includes('edit')) tags.add('files');
  
  const allContent = [...toolArgs.map(a => JSON.stringify(a)), ...responseTexts].join(' ').toLowerCase();
  
  if (allContent.includes('twitter') || allContent.includes('x.com') || allContent.includes('tweet')) {
    tags.add('twitter');
  }
  if (allContent.includes('molt.tv') || allContent.includes('convex')) {
    tags.add('molt.tv');
  }
  if (allContent.includes('github') || allContent.includes('git')) {
    tags.add('git');
  }
  if (allContent.includes('heartbeat')) {
    tags.add('heartbeat');
  }
  
  return Array.from(tags);
}

function groupMessagesIntoTasks(session: Session): MessageGroup[] {
  const groups: MessageGroup[] = [];
  let currentGroup: Message[] = [];
  let currentTrigger: string | undefined;
  let currentTriggerType: Task['triggerType'] = 'unknown';
  let groupStartTime: Date | null = null;
  
  for (const msg of session.messages) {
    if (msg.type !== 'message' || !msg.message) continue;
    
    const msgTime = new Date(msg.timestamp);
    
    if (msg.message.role === 'user') {
      if (currentGroup.length > 0 && groupStartTime) {
        groups.push({
          messages: currentGroup,
          startTime: groupStartTime,
          endTime: new Date(currentGroup[currentGroup.length - 1].timestamp),
          triggerMessage: currentTrigger,
          triggerType: currentTriggerType
        });
      }
      
      currentGroup = [msg];
      groupStartTime = msgTime;
      
      const userContent = msg.message.content?.[0];
      if (userContent && 'text' in userContent) {
        currentTrigger = String(userContent.text);
        currentTriggerType = detectTriggerType(currentTrigger);
      }
    } else {
      if (!groupStartTime) {
        groupStartTime = msgTime;
      }
      currentGroup.push(msg);
    }
  }
  
  if (currentGroup.length > 0 && groupStartTime) {
    groups.push({
      messages: currentGroup,
      startTime: groupStartTime,
      endTime: new Date(currentGroup[currentGroup.length - 1].timestamp),
      triggerMessage: currentTrigger,
      triggerType: currentTriggerType
    });
  }
  
  return groups;
}

function groupToTask(group: MessageGroup, sessionId: string, index: number): Task {
  const toolsUsed: string[] = [];
  const toolArgs: Record<string, unknown>[] = [];
  const responseTexts: string[] = [];
  let totalCost = 0;
  let totalInput = 0;
  let totalOutput = 0;
  let activityCount = 0;
  
  for (const msg of group.messages) {
    if (!msg.message) continue;
    
    activityCount++;
    
    if (msg.message.usage) {
      totalCost += msg.message.usage.cost?.total || 0;
      totalInput += msg.message.usage.input || 0;
      totalOutput += msg.message.usage.output || 0;
    }
    
    for (const content of msg.message.content || []) {
      if (content.type === 'toolCall' && content.name) {
        toolsUsed.push(content.name);
        if (content.arguments) {
          toolArgs.push(content.arguments);
        }
      }
      if (content.type === 'text' && content.text) {
        responseTexts.push(content.text);
      }
    }
  }
  
  const uniqueTools = [...new Set(toolsUsed)];
  
  return {
    id: `${sessionId}-task-${index}`,
    sessionId,
    startTime: group.startTime,
    endTime: group.endTime,
    durationMs: group.endTime.getTime() - group.startTime.getTime(),
    summary: generateSummary(uniqueTools, toolArgs, responseTexts, group.triggerMessage),
    category: categorizeTask(uniqueTools, responseTexts),
    tags: extractTags(uniqueTools, toolArgs, responseTexts),
    activityCount,
    toolsUsed: uniqueTools,
    cost: totalCost,
    inputTokens: totalInput,
    outputTokens: totalOutput,
    triggerType: group.triggerType,
    triggerText: group.triggerMessage?.slice(0, 200),
    status: 'completed'
  };
}

export function extractTasks(sessions: Session[]): Task[] {
  const allTasks: Task[] = [];
  
  for (const session of sessions) {
    const groups = groupMessagesIntoTasks(session);
    
    groups.forEach((group, index) => {
      const task = groupToTask(group, session.id, index);
      if (task.activityCount > 0) {
        allTasks.push(task);
      }
    });
  }
  
  return allTasks.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
}

export function getTaskStats(tasks: Task[]) {
  const categoryStats: Record<TaskCategory, { count: number; totalCost: number; avgDuration: number }> = {
    communication: { count: 0, totalCost: 0, avgDuration: 0 },
    research: { count: 0, totalCost: 0, avgDuration: 0 },
    coding: { count: 0, totalCost: 0, avgDuration: 0 },
    file_management: { count: 0, totalCost: 0, avgDuration: 0 },
    monitoring: { count: 0, totalCost: 0, avgDuration: 0 },
    scheduling: { count: 0, totalCost: 0, avgDuration: 0 },
    browser: { count: 0, totalCost: 0, avgDuration: 0 },
    system: { count: 0, totalCost: 0, avgDuration: 0 },
    other: { count: 0, totalCost: 0, avgDuration: 0 }
  };
  
  const durations: Record<TaskCategory, number[]> = {
    communication: [], research: [], coding: [], file_management: [],
    monitoring: [], scheduling: [], browser: [], system: [], other: []
  };
  
  for (const task of tasks) {
    categoryStats[task.category].count++;
    categoryStats[task.category].totalCost += task.cost;
    durations[task.category].push(task.durationMs);
  }
  
  for (const cat of Object.keys(categoryStats) as TaskCategory[]) {
    if (durations[cat].length > 0) {
      categoryStats[cat].avgDuration = 
        durations[cat].reduce((a, b) => a + b, 0) / durations[cat].length;
    }
  }
  
  return categoryStats;
}
