require('dotenv').config()
require('express-async-errors')  // catch async route errors automatically
const express = require('express')
const session = require('express-session')
const path = require('path')

const app = express()

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))
app.use(express.static(path.join(__dirname, 'public')))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

// ── Session store ─────────────────────────────────────────────────────────────
let sessionStore
if (process.env.DATABASE_URL) {
  const pgSession = require('connect-pg-simple')(session)
  sessionStore = new pgSession({
    conString: process.env.DATABASE_URL,
    tableName: 'user_sessions',
    createTableIfMissing: true,
  })
} else {
  const sqliteStorePkg = 'connect-sqlite3'
  const SQLiteStore = require(sqliteStorePkg)(session)
  sessionStore = new SQLiteStore({ db: 'sessions.db', dir: path.join(__dirname, 'db') })
}

app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000 },
}))

// ── Global res.locals ─────────────────────────────────────────────────────────
const ADMIN_PATH = process.env.ADMIN_PATH || '/admin'
app.use((req, res, next) => { res.locals.adminPath = ADMIN_PATH; next() })

app.use(async (req, res, next) => {
  if (!req.session.userId) return next()
  const db = require('./db/database')
  const { getBalances } = require('./lib/ledger')
  const u = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId)
  res.locals.sessionUser = u
  if (u && !res.locals.balances) {
    try {
      const b = await getBalances(u.id)
      res.locals.balances = { available: b.available.toFixed(2), pending: b.pending.toFixed(2), aiCredits: b.aiCredits.toFixed(2) }
    } catch (_) {
      res.locals.balances = { available: '0.00', pending: '0.00', aiCredits: '0.00' }
    }
  }
  if (!res.locals.pendingWithdrawals) {
    try {
      const r = await db.prepare("SELECT COUNT(*) c FROM withdrawals WHERE status='PENDING'").get()
      res.locals.pendingWithdrawals = r.c || 0
    } catch (_) { res.locals.pendingWithdrawals = 0 }
  }
  next()
})

// ── Landing page ──────────────────────────────────────────────────────────────
app.get('/', async (req, res) => {
  const db = require('./db/database')
  const user = req.session.userId ? await db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId) : null
  res.render('landing', { user })
})

// ── Core routes ───────────────────────────────────────────────────────────────
app.use('/auth',       require('./routes/auth'))
app.use('/dashboard',  require('./routes/dashboard'))
app.use('/wallet',     require('./routes/wallet'))
app.use(ADMIN_PATH + '/products',   require('./routes/admin-products'))
app.use(ADMIN_PATH + '/strategies', require('./routes/admin-strategies'))
app.use(ADMIN_PATH + '/agents',     require('./routes/admin-agents'))
app.use(ADMIN_PATH + '/experts',    require('./routes/admin-experts'))
app.use(ADMIN_PATH + '/wallets',    require('./routes/admin-wallets'))
app.use(ADMIN_PATH + '/deposits',   require('./routes/admin-deposits'))
app.use(ADMIN_PATH,                 require('./routes/admin'))

// ── Platform routes ───────────────────────────────────────────────────────────
app.use('/onboarding', require('./routes/onboarding'))
app.use('/autopips',   require('./routes/autopips'))
app.use('/strategies', require('./routes/strategies'))
app.use('/agents',     require('./routes/agents'))
app.use('/studio',     require('./routes/studio'))
app.use('/social',     require('./routes/social'))
app.use('/business',   require('./routes/business'))
app.use('/experts',    require('./routes/experts'))

// ── Settings ──────────────────────────────────────────────────────────────────
app.get('/settings', async (req, res) => {
  if (!req.session.userId) return res.redirect('/auth/login')
  const db = require('./db/database')
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId)
  const businesses = await db.prepare('SELECT * FROM user_businesses WHERE user_id = ? ORDER BY created_at ASC').all(user.id)
  const tab = req.query.tab || 'profile'
  const flash = req.query.success ? { success: req.query.success } : req.query.error ? { error: req.query.error } : {}
  res.render('settings/index', { user, path: '/settings', flash, tab, businesses })
})

app.post('/settings/profile', async (req, res) => {
  if (!req.session.userId) return res.redirect('/auth/login')
  const db = require('./db/database')
  await db.prepare("UPDATE users SET name=?, updated_at=NOW() WHERE id=?").run(req.body.name, req.session.userId)
  res.redirect('/settings?tab=profile&success=Profile+saved')
})

app.post('/settings/password', async (req, res) => {
  if (!req.session.userId) return res.redirect('/auth/login')
  const bcrypt = require('bcryptjs')
  const db = require('./db/database')
  const user = await db.prepare('SELECT * FROM users WHERE id=?').get(req.session.userId)
  const { current_password, new_password, confirm_password } = req.body
  if (!bcrypt.compareSync(current_password, user.password_hash)) {
    return res.redirect('/settings?tab=security&error=Current+password+is+incorrect')
  }
  if (new_password !== confirm_password) {
    return res.redirect('/settings?tab=security&error=Passwords+do+not+match')
  }
  if (!new_password || new_password.length < 8) {
    return res.redirect('/settings?tab=security&error=Password+must+be+at+least+8+characters')
  }
  const hash = bcrypt.hashSync(new_password, 12)
  await db.prepare("UPDATE users SET password_hash=?, updated_at=NOW() WHERE id=?").run(hash, req.session.userId)
  res.redirect('/settings?tab=security&success=Password+updated+successfully')
})

app.post('/settings/upgrade', async (req, res) => {
  if (!req.session.userId) return res.redirect('/auth/login')
  const { getBalances, debitAvailableForWithdrawal } = require('./lib/ledger')
  const { v4: uuidv4 } = require('uuid')
  const db = require('./db/database')
  const user = await db.prepare('SELECT * FROM users WHERE id=?').get(req.session.userId)
  const tierPrices = { GOLD: 49, PLATINUM: 149 }
  const tier = req.body.tier
  if (!['GOLD','PLATINUM'].includes(tier)) return res.redirect('/settings?tab=plan&error=Invalid+plan')
  const price = tierPrices[tier]
  const b = await getBalances(user.id)
  if (parseFloat(b.available.toString()) < price) {
    return res.redirect('/settings?tab=plan&error=Insufficient+wallet+balance.+Please+deposit+funds+first.')
  }
  const result = await debitAvailableForWithdrawal({
    userId: user.id, amount: price.toString(), coin: 'USD',
    withdrawalId: null, idempotencyKey: `upgrade_${user.id}_${tier}_${Date.now()}`
  })
  if (!result || result.ok === false) return res.redirect('/settings?tab=plan&error=Payment+failed')
  await db.prepare("UPDATE users SET tier=?, updated_at=NOW() WHERE id=?").run(tier, user.id)
  await db.prepare('INSERT INTO notifications (id,user_id,title,message,type) VALUES (?,?,?,?,?)')
    .run(uuidv4(), user.id, 'Account Upgraded', `Your account has been upgraded to ${tier}. Enjoy your new benefits!`, 'SUCCESS')
  req.session.tier = tier
  res.redirect('/settings?tab=plan&success=Account+upgraded+to+' + tier)
})

app.post('/settings/notifications', async (req, res) => {
  if (!req.session.userId) return res.redirect('/auth/login')
  const db = require('./db/database')
  const keys = ['deposits','withdrawals','agents','strategies','products','system']
  const prefs = {}
  keys.forEach(k => { prefs[k] = req.body[k] === '1' })
  await db.prepare("UPDATE users SET notification_prefs=?, updated_at=NOW() WHERE id=?")
    .run(JSON.stringify(prefs), req.session.userId)
  res.redirect('/settings?tab=notifications&success=Notification+preferences+saved')
})

// ── Notifications API ─────────────────────────────────────────────────────────
app.get('/notifications/data', async (req, res) => {
  if (!req.session.userId) return res.json({ notifications: [] })
  const db = require('./db/database')
  const notifs = await db.prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 20').all(req.session.userId)
  const r = await db.prepare('SELECT COUNT(*) as c FROM notifications WHERE user_id=? AND read=0').get(req.session.userId)
  res.json({ notifications: notifs, unread: r ? r.c : 0 })
})
app.post('/notifications/read-all', async (req, res) => {
  if (!req.session.userId) return res.json({ ok: false })
  const db = require('./db/database')
  await db.prepare('UPDATE notifications SET read=1 WHERE user_id=?').run(req.session.userId)
  res.json({ ok: true })
})
app.post('/notifications/:id/read', async (req, res) => {
  if (!req.session.userId) return res.json({ ok: false })
  const db = require('./db/database')
  await db.prepare('UPDATE notifications SET read=1 WHERE id=? AND user_id=?').run(req.params.id, req.session.userId)
  res.json({ ok: true })
})
app.get('/notifications', async (req, res) => {
  if (!req.session.userId) return res.redirect('/auth/login')
  const db = require('./db/database')
  const user = await db.prepare('SELECT * FROM users WHERE id=?').get(req.session.userId)
  const notifications = await db.prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50').all(req.session.userId)
  await db.prepare('UPDATE notifications SET read=1 WHERE user_id=?').run(req.session.userId)
  res.render('notifications/index', { user, path: '/notifications', notifications })
})

// ── Coming-soon stubs ─────────────────────────────────────────────────────────
const comingSoon = (title, message) => async (req, res) => {
  if (!req.session.userId) return res.redirect('/auth/login')
  const db = require('./db/database')
  const user = await db.prepare('SELECT * FROM users WHERE id=?').get(req.session.userId)
  res.render('coming-soon', { user, path: req.path, title, message })
}
app.get('/import',        comingSoon('External Product Import', 'Import products from AliExpress, CJdropshipping, Printful, and more. Launching soon.'))
app.get('/advertising',   comingSoon('Advertising Center', 'Manage Facebook, TikTok, and Google ad campaigns directly from your dashboard. Launching soon.'))
app.get('/seo',           comingSoon('SEO Services', 'Keyword research, product SEO, meta generation, and competitor analysis. Launching soon.'))
app.get('/studio/content',comingSoon('AI Content Generator', 'Generate product descriptions, ad copy, email sequences, and social captions. Launching soon.'))
app.get('/studio/images', comingSoon('AI Image Studio', 'Generate product lifestyle images, ad creatives, and brand visuals with AI. Launching soon.'))
app.get('/payout',        comingSoon('Payout Settings', 'Connect your bank or payment account to receive sales proceeds. Launching soon.'))

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use(async (req, res) => {
  const db = require('./db/database')
  const user = req.session.userId ? await db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId) : null
  res.status(404).render('404', { user })
})

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).send(`<html><head><link rel="stylesheet" href="/css/main.css"></head>
    <body style="display:flex;align-items:center;justify-content:center;min-height:100vh">
    <div style="text-align:center;max-width:400px">
      <h1 style="color:var(--red);font-size:2rem;margin-bottom:12px">Something went wrong</h1>
      <p style="color:var(--text2);margin-bottom:20px">${process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred.'}</p>
      <a href="/" class="btn btn-primary">Go Home</a>
    </div></body></html>`)
})

if (process.env.NODE_ENV !== 'production' || process.env.FORCE_LISTEN) {
  const PORT = process.env.PORT || 3000
  app.listen(PORT, () => {
    console.log(`\n  AutoPips running at http://localhost:${PORT}`)
    console.log(`  Admin:    admin@autopips.com / Admin@12345`)
    console.log(`  Test user: testuser@autopips.com / Test@12345\n`)
  })
}

module.exports = app
