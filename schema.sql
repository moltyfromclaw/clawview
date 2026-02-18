-- ClawView Instance Registry Schema

-- Registered OpenClaw instances
CREATE TABLE IF NOT EXISTS instances (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  gateway_url TEXT NOT NULL,
  gateway_token_encrypted TEXT, -- Encrypted with instance secret
  provider TEXT, -- aws, hetzner, etc.
  provider_instance_id TEXT, -- e.g., i-01b29a21b6c2a2469
  region TEXT,
  tunnel_id TEXT,
  tunnel_url TEXT,
  email TEXT, -- e.g., thomas@hollyclaw.com
  status TEXT DEFAULT 'unknown', -- healthy, unhealthy, unknown, offline
  last_seen_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  metadata TEXT -- JSON blob for extra data
);

-- Instance health checks
CREATE TABLE IF NOT EXISTS instance_health (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instance_id TEXT NOT NULL REFERENCES instances(id),
  status TEXT NOT NULL, -- healthy, unhealthy, timeout
  response_time_ms INTEGER,
  error_message TEXT,
  checked_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_instances_name ON instances(name);
CREATE INDEX IF NOT EXISTS idx_instances_status ON instances(status);
CREATE INDEX IF NOT EXISTS idx_health_instance ON instance_health(instance_id, checked_at);
