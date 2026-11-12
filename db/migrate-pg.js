/**
 * Run once to create the PostgreSQL schema.
 * Usage: node db/migrate-pg.js
 */
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
})

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.pg.sql'), 'utf8')
  console.log('[migrate] Applying schema to PostgreSQL...')
  try {
    await pool.query(sql)
    console.log('[migrate] Schema applied successfully.')
  } catch (e) {
    console.error('[migrate] Error:', e.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

migrate()
