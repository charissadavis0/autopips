PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- ── Core users ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'USER',
  tier TEXT NOT NULL DEFAULT 'STANDARD',
  kyc_level TEXT NOT NULL DEFAULT 'NONE',
  suspended INTEGER NOT NULL DEFAULT 0,
  frozen INTEGER NOT NULL DEFAULT 0,
  email_verified INTEGER NOT NULL DEFAULT 0,
  lifetime_volume TEXT NOT NULL DEFAULT '0.00000000',
  language TEXT NOT NULL DEFAULT 'en',
  login_alerts INTEGER NOT NULL DEFAULT 1,
  country TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  onboarding_complete INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS email_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions_store (
  sid TEXT PRIMARY KEY,
  sess TEXT NOT NULL,
  expired TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS two_factor_secrets (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  secret TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Ledger / Wallet ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ledger_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  balance TEXT NOT NULL,
  amount TEXT NOT NULL,
  description TEXT,
  idempotency_key TEXT UNIQUE NOT NULL,
  ref_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS deposits (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  coin TEXT NOT NULL,
  network TEXT NOT NULL,
  address TEXT NOT NULL,
  amount TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  tx_hash TEXT,
  admin_note TEXT,
  idempotency_key TEXT UNIQUE NOT NULL,
  status_history TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS withdrawals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  coin TEXT NOT NULL,
  network TEXT NOT NULL,
  address TEXT NOT NULL,
  amount TEXT NOT NULL,
  fee TEXT NOT NULL DEFAULT '0.00000000',
  net_amount TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'SUBMITTED',
  tx_hash TEXT,
  admin_note TEXT,
  two_factor_used INTEGER NOT NULL DEFAULT 0,
  idempotency_key TEXT UNIQUE NOT NULL,
  status_history TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS withdrawal_addresses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  coin TEXT NOT NULL,
  network TEXT NOT NULL,
  address TEXT NOT NULL,
  cooldown_end TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS payment_methods (
  id TEXT PRIMARY KEY,
  coin TEXT NOT NULL,
  network TEXT NOT NULL,
  address TEXT NOT NULL,
  label TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Notifications & Audit ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'INFO',
  link TEXT,
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  before_val TEXT,
  after_val TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Autopips Product Catalog ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_desc TEXT,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  images TEXT NOT NULL DEFAULT '[]',
  cost TEXT NOT NULL DEFAULT '0.00',
  suggested_price TEXT NOT NULL DEFAULT '0.00',
  profit_margin TEXT NOT NULL DEFAULT '0',
  currency TEXT NOT NULL DEFAULT 'USD',
  supplier_name TEXT,
  supplier_country TEXT,
  shipping_estimate TEXT,
  shipping_days_min INTEGER DEFAULT 7,
  shipping_days_max INTEGER DEFAULT 21,
  stock_status TEXT NOT NULL DEFAULT 'IN_STOCK',
  opportunity_score INTEGER DEFAULT 70,
  is_trending INTEGER NOT NULL DEFAULT 0,
  is_featured INTEGER NOT NULL DEFAULT 0,
  variations TEXT NOT NULL DEFAULT '[]',
  tags TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'DRAFT',
  times_added INTEGER NOT NULL DEFAULT 0,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Strategy Marketplace ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS strategies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  niche TEXT NOT NULL,
  target_country TEXT,
  target_audience TEXT,
  description TEXT,
  estimated_budget TEXT,
  suggested_ad_budget TEXT,
  recommended_platforms TEXT NOT NULL DEFAULT '[]',
  marketing_strategy TEXT,
  seo_strategy TEXT,
  social_strategy TEXT,
  setup_instructions TEXT,
  difficulty TEXT NOT NULL DEFAULT 'BEGINNER',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  is_featured INTEGER NOT NULL DEFAULT 0,
  tags TEXT NOT NULL DEFAULT '[]',
  times_copied INTEGER NOT NULL DEFAULT 0,
  expert_id TEXT REFERENCES experts(id),
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS strategy_products (
  id TEXT PRIMARY KEY,
  strategy_id TEXT NOT NULL REFERENCES strategies(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id),
  product_name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

-- ── User Businesses ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_businesses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  niche TEXT,
  sourcing_method TEXT NOT NULL DEFAULT 'AUTOPIPS',
  mode TEXT NOT NULL DEFAULT 'INDEPENDENT',
  strategy_id TEXT REFERENCES strategies(id),
  status TEXT NOT NULL DEFAULT 'SETUP',
  launch_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_products (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id TEXT REFERENCES user_businesses(id),
  product_id TEXT REFERENCES products(id),
  custom_name TEXT,
  custom_price TEXT,
  custom_description TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  added_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Experts ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS experts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  bio TEXT,
  country TEXT,
  years_experience INTEGER DEFAULT 0,
  profile_image TEXT,
  cover_image TEXT,
  gallery TEXT NOT NULL DEFAULT '[]',
  areas_of_expertise TEXT NOT NULL DEFAULT '[]',
  target_markets TEXT NOT NULL DEFAULT '[]',
  case_studies TEXT,
  is_verified INTEGER NOT NULL DEFAULT 0,
  verification_note TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Agents ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  name TEXT NOT NULL,
  bio TEXT,
  avatar_initials TEXT NOT NULL DEFAULT 'AG',
  expertise TEXT NOT NULL DEFAULT '[]',
  niches TEXT NOT NULL DEFAULT '[]',
  services TEXT NOT NULL DEFAULT '[]',
  languages TEXT NOT NULL DEFAULT '["English"]',
  base_fee TEXT NOT NULL DEFAULT '0.00',
  fee_period TEXT NOT NULL DEFAULT 'MONTHLY',
  video_rate TEXT NOT NULL DEFAULT '25.00',
  ad_management_rate TEXT NOT NULL DEFAULT '50.00',
  rating TEXT NOT NULL DEFAULT '5.0',
  review_count INTEGER NOT NULL DEFAULT 0,
  stores_managed INTEGER NOT NULL DEFAULT 0,
  is_verified INTEGER NOT NULL DEFAULT 1,
  is_available INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS agent_assignments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL REFERENCES agents(id),
  business_id TEXT REFERENCES user_businesses(id),
  services TEXT NOT NULL DEFAULT '[]',
  monthly_fee TEXT NOT NULL DEFAULT '0.00',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  authorized_ad_spend INTEGER NOT NULL DEFAULT 0,
  ad_spend_limit TEXT NOT NULL DEFAULT '0.00',
  can_manage_social INTEGER NOT NULL DEFAULT 0,
  can_manage_products INTEGER NOT NULL DEFAULT 1,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS agent_tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  agent_id TEXT NOT NULL REFERENCES agents(id),
  assignment_id TEXT REFERENCES agent_assignments(id),
  task_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  brief TEXT,
  amount_charged TEXT NOT NULL DEFAULT '0.00',
  status TEXT NOT NULL DEFAULT 'PENDING',
  result_url TEXT,
  result_note TEXT,
  admin_note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Social Accounts ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS social_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'AGENT_MANAGED',
  username TEXT,
  profile_url TEXT,
  brand_name TEXT,
  niche TEXT,
  managed_by_agent_id TEXT REFERENCES agents(id),
  setup_status TEXT NOT NULL DEFAULT 'PENDING',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Onboarding ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS onboarding_state (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  mode TEXT,
  completed_steps TEXT NOT NULL DEFAULT '[]',
  current_step INTEGER NOT NULL DEFAULT 1,
  completed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ledger_user ON ledger_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_user ON deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_audit_admin ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_strategies_niche ON strategies(niche);
CREATE INDEX IF NOT EXISTS idx_strategies_status ON strategies(status);
CREATE INDEX IF NOT EXISTS idx_user_products_user ON user_products(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_assignments_user ON agent_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_user ON agent_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_agent ON agent_tasks(agent_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_user ON social_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_businesses_user ON user_businesses(user_id);
