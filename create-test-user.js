const db = require('./db/database')
const bcrypt = require('bcryptjs')
const { v4: uuidv4 } = require('uuid')

const id = uuidv4()
const hash = bcrypt.hashSync('Test@12345', 12)

db.prepare(
  "INSERT INTO users (id, email, password_hash, name, role, tier, email_verified, kyc_level, suspended, frozen) VALUES (?, ?, ?, ?, 'USER', 'STANDARD', 1, 0, 0, 0)"
).run(id, 'testuser@autopips.com', hash, 'Test User')

console.log('Done.')
console.log('Email:    testuser@autopips.com')
console.log('Password: Test@12345')
