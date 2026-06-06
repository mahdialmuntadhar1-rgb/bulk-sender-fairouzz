CREATE TABLE IF NOT EXISTS bulk_message_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER,
  phone TEXT NOT NULL,
  business_name TEXT,
  status TEXT NOT NULL,
  provider TEXT DEFAULT 'nabda',
  provider_response TEXT,
  error TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
