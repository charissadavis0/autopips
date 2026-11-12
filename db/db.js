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

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  max: 10,
})

pool.on('error', (err) => console.error('[pg] Unexpected pool error:', err.message))

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
module.exports.pool = pool
