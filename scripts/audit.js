const db = require('../db/database')

console.log('=== DB TABLES ===')
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r=>r.name)
console.log(tables.join(', '))

console.log('\n=== ROW COUNTS ===')
const checks = [
  ['users', 'SELECT COUNT(*) c FROM users'],
  ['products (total)', 'SELECT COUNT(*) c FROM products'],
  ['products DRAFT', "SELECT COUNT(*) c FROM products WHERE status='DRAFT'"],
  ['products PUBLISHED', "SELECT COUNT(*) c FROM products WHERE status='PUBLISHED'"],
  ['strategies', 'SELECT COUNT(*) c FROM strategies'],
  ['experts', 'SELECT COUNT(*) c FROM experts'],
  ['payment_methods', 'SELECT COUNT(*) c FROM payment_methods'],
  ['notifications', 'SELECT COUNT(*) c FROM notifications'],
  ['ledger_entries', 'SELECT COUNT(*) c FROM ledger_entries'],
  ['withdrawals', 'SELECT COUNT(*) c FROM withdrawals'],
  ['deposits', 'SELECT COUNT(*) c FROM deposits'],
]
checks.forEach(([label, sql]) => {
  try { console.log(label+':', db.prepare(sql).get().c) } catch(e) { console.log(label+': TABLE MISSING -', e.message) }
})

console.log('\n=== payment_methods COLUMNS ===')
try { db.prepare('PRAGMA table_info(payment_methods)').all().forEach(r=>process.stdout.write(r.name+' ')) } catch(e) { console.log(e.message) }

console.log('\n\n=== products COLUMNS ===')
try { db.prepare('PRAGMA table_info(products)').all().forEach(r=>process.stdout.write(r.name+' ')) } catch(e) { console.log(e.message) }

console.log('\n\n=== USERS ===')
db.prepare('SELECT email,role,tier FROM users LIMIT 5').all().forEach(r=>console.log(' ',r.email, '|', r.role, '|', r.tier))

console.log('\n=== PRODUCT IMAGES SAMPLE ===')
db.prepare('SELECT name, images FROM products LIMIT 4').all().forEach(r => {
  const imgs = JSON.parse(r.images||'[]')
  console.log(' ', r.name.substring(0,35), '->', imgs[0] ? imgs[0].substring(0,55) : 'NO IMAGE')
})

console.log('\n=== ADMIN USER BALANCES TEST ===')
try {
  const admin = db.prepare("SELECT id,email FROM users WHERE role='SUPER_ADMIN'").get()
  if (admin) {
    const bal = db.prepare("SELECT COALESCE(SUM(CASE WHEN type='CREDIT' THEN amount ELSE -amount END),0) as available FROM ledger_entries WHERE user_id=?").get(admin.id)
    console.log(' Admin:', admin.email, '| Balance:', bal.available)
  }
} catch(e) { console.log(' ERROR:', e.message) }

console.log('\n=== SETTINGS PAGE VIEW CHECK ===')
// Check if settings/index.ejs exists
const fs = require('fs'), path = require('path')
const settingsView = path.join(__dirname, '..', 'views', 'settings', 'index.ejs')
console.log(' settings/index.ejs exists:', fs.existsSync(settingsView))

console.log('\n=== ROUTE FILES CHECK ===')
const routeDir = path.join(__dirname, '..', 'routes')
const routes = fs.readdirSync(routeDir)
console.log(' Routes:', routes.join(', '))

console.log('\n=== VIEW DIRECTORIES ===')
const viewDir = path.join(__dirname, '..', 'views')
fs.readdirSync(viewDir).forEach(f => {
  const full = path.join(viewDir, f)
  if (fs.statSync(full).isDirectory()) {
    const files = fs.readdirSync(full).map(x=>x.replace('.ejs',''))
    console.log(' ', f+'/', files.join(', '))
  } else {
    console.log(' ', f)
  }
})
