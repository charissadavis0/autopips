/**
 * Async PostgreSQL database adapter.
 * Provides the same .prepare(sql).get/all/run() interface as better-sqlite3
 * but backed by pg, so all methods return Promises.
 *
 * SQL compatibility notes handled automatically:
 *   - `?` → `$1, $2, …` (positional params)
 *   - `datetime('now')` → `NOW()`
 *   - `CAST(x AS REAL)` → `CAST(x AS FLOAT8)`
 *   - `INSERT OR IGNORE` → `INSERT` with `ON CONFLICT DO NOTHING`
 */

const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

// Parse DATABASE_URL with WHATWG URL to bypass pg-connection-string issues
function pgParamsFromUrl(raw) {
  if (!raw) return {}
  // Strip BOM and whitespace that can corrupt the value when set via CLI
  const clean = raw.replace(/^﻿/, '').trim()
  try {
    const u = new URL(clean)
    return {
      host: u.hostname,
      port: parseInt(u.port) || 5432,
      database: decodeURIComponent(u.pathname.slice(1)),
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
    }
  } catch (e) {
    return { connectionString: clean }
  }
}

const pool = new Pool({
  ...pgParamsFromUrl(process.env.DATABASE_URL || ''),
  ssl: { rejectUnauthorized: false },
  max: 10,
})

pool.on('error', (err) => console.error('[pg] Unexpected pool error:', err.message))

// Auto-migrate: apply schema on first boot (all statements are CREATE TABLE IF NOT EXISTS)
;(async () => {
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.pg.sql'), 'utf8')
    await pool.query(schema)
    console.log('[pg] Schema applied')

    // Seed admin user so it always has SUPER_ADMIN role
    const bcrypt = require('bcryptjs')
    const { v4: uuidv4 } = require('uuid')
    const adminHash = bcrypt.hashSync('Admin@12345', 12)
    const userHash  = bcrypt.hashSync('Test@12345', 12)
    await pool.query(
      `INSERT INTO users (id,email,password_hash,name,role,tier,email_verified,kyc_level,suspended,frozen)
       VALUES ($1,$2,$3,$4,'SUPER_ADMIN','PLATINUM',1,'NONE',0,0)
       ON CONFLICT (email) DO UPDATE SET role='SUPER_ADMIN',tier='PLATINUM',email_verified=1`,
      [uuidv4(), 'admin@autopips.com', adminHash, 'Admin']
    )
    await pool.query(
      `INSERT INTO users (id,email,password_hash,name,role,tier,email_verified,kyc_level,suspended,frozen)
       VALUES ($1,$2,$3,$4,'USER','STANDARD',1,'NONE',0,0)
       ON CONFLICT (email) DO NOTHING`,
      [uuidv4(), 'testuser@autopips.com', userHash, 'Test User']
    )
    console.log('[pg] Seed users ensured')
  } catch (e) {
    console.error('[pg] Schema migration failed:', e.message)
  }
})()

function convertSql(sql) {
  let i = 0
  return sql
    .replace(/\bdatetime\('now'\)/gi, 'NOW()')
    .replace(/\bCAST\(([^)]+)\s+AS\s+REAL\)/gi, (_, expr) => `CAST(${expr} AS FLOAT8)`)
    .replace(/\bINSERT\s+OR\s+IGNORE\s+INTO\b/gi, 'INSERT INTO')
    .replace(/\?/g, () => `$${++i}`)
}

function makeInterface(client) {
  return {
    prepare(sql) {
      const pgSql = convertSql(sql)
      return {
        async get(...params) {
          const r = await client.query(pgSql, params)
          return r.rows[0] || null
        },
        async all(...params) {
          const r = await client.query(pgSql, params)
          return r.rows
        },
        async run(...params) {
          const r = await client.query(pgSql, params)
          return { changes: r.rowCount, lastInsertRowid: null }
        },
      }
    },

    // Convenience wrappers
    async row(sql, ...params) {
      const r = await client.query(convertSql(sql), params)
      return r.rows[0] || null
    },
    async rows(sql, ...params) {
      const r = await client.query(convertSql(sql), params)
      return r.rows
    },
    async run(sql, ...params) {
      const r = await client.query(convertSql(sql), params)
      return { changes: r.rowCount }
    },
  }
}

const db = {
  ...makeInterface(pool),

  async transaction(fn) {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const txDb = makeInterface(client)
      const result = await fn(txDb)
      await client.query('COMMIT')
      return result
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }
  },

  // Run raw SQL (for migrations / schema creation)
  async exec(sql) {
    await pool.query(sql)
  },
}

module.exports = db
