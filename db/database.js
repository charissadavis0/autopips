/**
 * Smart database adapter.
 * - DATABASE_URL set → PostgreSQL via db/db.js (Vercel/production)
 * - Otherwise        → better-sqlite3 wrapped with Promise interface (local dev)
 *
 * Both exports provide the same async API:
 *   db.prepare(sql).get(...params)   → Promise<row | null>
 *   db.prepare(sql).all(...params)   → Promise<row[]>
 *   db.prepare(sql).run(...params)   → Promise<{ changes }>
 *   db.transaction(async fn)         → Promise<result>
 */

if (process.env.DATABASE_URL) {
  module.exports = require('./db')
  return
}

// ── Local dev: better-sqlite3 wrapped in Promises ───────────────────────────
// Use a variable so Vercel's bundler does not statically include the native binary
const sqlitePkg = 'better-sqlite3'
const Database = require(sqlitePkg)
const path = require('path')
const fs = require('fs')

const DB_PATH = path.join(__dirname, 'autopips.db')
const rawDb = new Database(DB_PATH)
rawDb.pragma('journal_mode = WAL')
rawDb.pragma('foreign_keys = ON')

// Apply schema
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')
rawDb.exec(schema)

// Column migrations added after initial deploy
const migrations = [
  "ALTER TABLE users ADD COLUMN country TEXT",
  "ALTER TABLE users ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD'",
  "ALTER TABLE users ADD COLUMN onboarding_complete INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE users ADD COLUMN notification_prefs TEXT NOT NULL DEFAULT '{}'",
  "ALTER TABLE agents ADD COLUMN profile_image TEXT",
  "ALTER TABLE agents ADD COLUMN cover_image TEXT",
  "ALTER TABLE agents ADD COLUMN gallery TEXT NOT NULL DEFAULT '[]'",
  "ALTER TABLE strategies ADD COLUMN expert_id TEXT",
  "ALTER TABLE notifications ADD COLUMN type TEXT NOT NULL DEFAULT 'INFO'",
]
for (const sql of migrations) {
  try { rawDb.exec(sql) } catch (_) {}
}
try { rawDb.exec("UPDATE products SET status='PUBLISHED' WHERE status='ACTIVE'") } catch (_) {}

function wrapStmt(stmt) {
  return {
    get:  (...params) => Promise.resolve(stmt.get(...params) || null),
    all:  (...params) => Promise.resolve(stmt.all(...params)),
    run:  (...params) => Promise.resolve(stmt.run(...params)),
  }
}

const db = {
  prepare(sql) {
    return wrapStmt(rawDb.prepare(sql))
  },

  async transaction(fn) {
    rawDb.prepare('BEGIN').run()
    try {
      const txDb = { prepare: (sql) => wrapStmt(rawDb.prepare(sql)) }
      const result = await fn(txDb)
      rawDb.prepare('COMMIT').run()
      return result
    } catch (e) {
      try { rawDb.prepare('ROLLBACK').run() } catch (_) {}
      throw e
    }
  },

  async exec(sql) {
    rawDb.exec(sql)
  },
}

module.exports = db
