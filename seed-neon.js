require('dotenv').config()
const db = require('./db/database')
const bcrypt = require('bcryptjs')
const { v4: uuidv4 } = require('uuid')

async function seed() {
  const adminHash = bcrypt.hashSync('Admin@12345', 12)
  const userHash  = bcrypt.hashSync('Test@12345', 12)

  await db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, tier, email_verified, kyc_level, suspended, frozen)
    VALUES (?, ?, ?, ?, 'SUPER_ADMIN', 'PLATINUM', 1, 0, 0, 0)
    ON CONFLICT (email) DO NOTHING
  `).run(uuidv4(), 'admin@autopips.com', adminHash, 'Admin')

  await db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, tier, email_verified, kyc_level, suspended, frozen)
    VALUES (?, ?, ?, ?, 'USER', 'STANDARD', 1, 0, 0, 0)
    ON CONFLICT (email) DO NOTHING
  `).run(uuidv4(), 'testuser@autopips.com', userHash, 'Test User')

  console.log('Seeded:')
  console.log('  Admin:     admin@autopips.com / Admin@12345')
  console.log('  Test user: testuser@autopips.com / Test@12345')
  process.exit(0)
}

seed().catch(e => { console.error(e.message); process.exit(1) })
