# ClawView Stats Endpoint Setup

Send this prompt to your OpenClaw agent to set up a stats API endpoint that ClawView can connect to.

---

## Setup Prompt

Copy and send this to your OpenClaw agent:

```
I need you to create a stats API endpoint that ClawView can connect to remotely. This endpoint should expose my session history and cost data.

Create a Node.js script at ~/.openclaw/scripts/stats-server.mjs that:

1. Reads all session files from ~/.openclaw/agents/main/sessions/*.jsonl
2. Parses messages and extracts:
   - Total cost (from usage.cost.total in each message)
   - Token counts (input, output, cache)
   - Tool usage counts
   - Model usage counts
   - Per-day summaries
3. Serves this data via HTTP on port 18790 with CORS enabled
4. Endpoints needed:
   - GET /stats - overall stats
   - GET /sessions - list of sessions with metadata
   - GET /tasks - processed task list

The server should:
- Use native Node.js (no npm install needed)
- Enable CORS for all origins
- Require Bearer token auth using OPENCLAW_GATEWAY_PASSWORD env var
- Auto-refresh data every 60 seconds

After creating the script, set up a cron job to keep it running:
- Create a systemd service or launchd plist to run it on boot
- Or add it to my shell profile

Finally, tell me the URL I should use to connect ClawView (format: http://[my-ip]:18790)
```

---

## What This Does

Your OpenClaw agent will:
1. Create a standalone stats server script
2. Parse your session history files  
3. Serve stats via HTTP with proper auth
4. Set up auto-start so it runs persistently

## Connecting ClawView

Once your agent confirms the endpoint is running:
1. Go to ClawView → Team tab → Add Agent
2. Enter your stats endpoint URL (e.g., `http://your-ip:18790`)
3. Enter your gateway password (check with `echo $OPENCLAW_GATEWAY_PASSWORD`)
4. ClawView will now show your full historical data!

---

## Manual Setup (Alternative)

If you prefer to set it up manually, here's the script your agent would create:

```javascript
// ~/.openclaw/scripts/stats-server.mjs
import { createServer } from 'http';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const PORT = 18790;
const AUTH_TOKEN = process.env.OPENCLAW_GATEWAY_PASSWORD;
const SESSIONS_DIR = join(homedir(), '.openclaw', 'agents', 'main', 'sessions');

let cachedStats = null;
let lastRefresh = 0;
const REFRESH_INTERVAL = 60000; // 1 minute

function parseSessionFile(filePath) {
  const messages = [];
  try {
    const content = readFileSync(filePath, 'utf-8');
    for (const line of content.split('\n').filter(l => l.trim())) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.type === 'message' && parsed.message?.usage) {
          messages.push(parsed);
        }
      } catch {}
    }
  } catch {}
  return messages;
}

function calculateStats() {
  if (!existsSync(SESSIONS_DIR)) return { error: 'Sessions directory not found' };
  
  const files = readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.jsonl'));
  
  let totalCost = 0, totalInput = 0, totalOutput = 0, totalMessages = 0;
  const toolCalls = {}, models = {}, dailySummaries = {};
  const sessions = [];
  
  for (const file of files) {
    const messages = parseSessionFile(join(SESSIONS_DIR, file));
    const sessionId = file.replace('.jsonl', '');
    let sessionCost = 0, sessionTokens = 0;
    
    for (const msg of messages) {
      const usage = msg.message?.usage;
      if (!usage) continue;
      
      totalMessages++;
      totalCost += usage.cost?.total || 0;
      totalInput += usage.input || 0;
      totalOutput += usage.output || 0;
      sessionCost += usage.cost?.total || 0;
      sessionTokens += usage.totalTokens || 0;
      
      const model = msg.message?.model || 'unknown';
      models[model] = (models[model] || 0) + 1;
      
      // Daily summary
      const date = new Date(msg.timestamp).toISOString().split('T')[0];
      if (!dailySummaries[date]) {
        dailySummaries[date] = { date, totalCost: 0, totalTokens: 0, messageCount: 0 };
      }
      dailySummaries[date].totalCost += usage.cost?.total || 0;
      dailySummaries[date].totalTokens += usage.totalTokens || 0;
      dailySummaries[date].messageCount++;
      
      // Tool calls
      for (const content of msg.message?.content || []) {
        if (content.type === 'toolCall' && content.name) {
          toolCalls[content.name] = (toolCalls[content.name] || 0) + 1;
        }
      }
    }
    
    sessions.push({ id: sessionId, cost: sessionCost, tokens: sessionTokens, messages: messages.length });
  }
  
  return {
    stats: { totalCost, totalInputTokens: totalInput, totalOutputTokens: totalOutput, totalMessages, sessionCount: files.length, toolCalls, models },
    dailySummaries: Object.values(dailySummaries).sort((a, b) => b.date.localeCompare(a.date)),
    sessions: sessions.sort((a, b) => b.cost - a.cost),
    lastUpdated: new Date().toISOString()
  };
}

function getStats() {
  const now = Date.now();
  if (!cachedStats || now - lastRefresh > REFRESH_INTERVAL) {
    cachedStats = calculateStats();
    lastRefresh = now;
  }
  return cachedStats;
}

const server = createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  // Auth
  const auth = req.headers.authorization;
  if (AUTH_TOKEN && (!auth || auth !== `Bearer ${AUTH_TOKEN}`)) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return;
  }
  
  res.setHeader('Content-Type', 'application/json');
  
  const data = getStats();
  
  if (req.url === '/stats') {
    res.end(JSON.stringify({ stats: data.stats, dailySummaries: data.dailySummaries, lastUpdated: data.lastUpdated }));
  } else if (req.url === '/sessions') {
    res.end(JSON.stringify({ sessions: data.sessions }));
  } else {
    res.end(JSON.stringify(data));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`ClawView Stats Server running on http://0.0.0.0:${PORT}`);
  console.log(`Auth: ${AUTH_TOKEN ? 'enabled' : 'disabled'}`);
});
```

Run with: `node ~/.openclaw/scripts/stats-server.mjs`
