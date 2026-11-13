const express = require('express')
const { v4: uuidv4 } = require('uuid')
const Decimal = require('decimal.js')
const db = require('../db/database')
const { getBalances, refundWithdrawal, manualAdjustment } = require('../lib/ledger')
const requireAdmin = require('../middleware/requireAdmin')

const ADMIN = process.env.ADMIN_PATH || '/admin'
const router = express.Router()
router.use(requireAdmin())

async function auditLog(adminId, action, targetType, targetId, before, after, ip) {
  await db.prepare(`INSERT INTO audit_logs (id, admin_id, action, target_type, target_id, before_val, after_val, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(uuidv4(), adminId, action, targetType || null, targetId || null,
    before ? JSON.stringify(before) : null, after ? JSON.stringify(after) : null, ip || null)
}

async function getPendingWithdrawals() {
  const r = await db.prepare("SELECT COUNT(*) as c FROM withdrawals WHERE status = 'SUBMITTED'").get()
  return r?.c || 0
}

// Overview
router.get('/', async (req, res) => {
  const totalUsers = await db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'USER'").get()
  const pendingW = await db.prepare("SELECT COUNT(*) as c FROM withdrawals WHERE status='SUBMITTED'").get()
  const pendingD = await db.prepare("SELECT COUNT(*) as c FROM deposits WHERE status='PENDING'").get()
  const sumLedger = await db.prepare("SELECT SUM(CAST(amount AS REAL)) as s FROM ledger_entries WHERE balance = 'AVAILABLE'").get()
  const auditCount = await db.prepare("SELECT COUNT(*) as c FROM audit_logs").get()
  const stats = {
    totalUsers: totalUsers?.c || 0,
    pendingWithdrawals: pendingW?.c || 0,
    pendingDeposits: pendingD?.c || 0,
    totalAvailable: ((sumLedger?.s) || 0).toFixed(2),
    totalAuditLogs: auditCount?.c || 0,
  }
  const recentAudit = await db.prepare(`
    SELECT a.*, u.email as admin_email FROM audit_logs a
    JOIN users u ON u.id = a.admin_id ORDER BY a.created_at DESC LIMIT 10
  `).all()
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId)
  res.render('admin/index', { user, path: '/admin', flash: {}, stats, recentAudit, pendingWithdrawals: stats.pendingWithdrawals })
})

// Withdrawals list
router.get('/withdrawals', async (req, res) => {
  const status = req.query.status || 'SUBMITTED'
  const page = Math.max(1, parseInt(req.query.page) || 1)
  const limit = 20
  const totalR = await db.prepare('SELECT COUNT(*) as c FROM withdrawals WHERE status = ?').get(status)
  const total = totalR?.c || 0
  const withdrawals = await db.prepare(`
    SELECT w.*, u.email as user_email, u.name as user_name, u.tier as user_tier
    FROM withdrawals w JOIN users u ON u.id = w.user_id
    WHERE w.status = ? ORDER BY w.created_at DESC LIMIT ? OFFSET ?
  `).all(status, limit, (page - 1) * limit)
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId)
  res.render('admin/withdrawals', { user, path: '/admin/withdrawals', flash: {}, withdrawals, total, page, totalPages: Math.ceil(total / limit), currentStatus: status, pendingWithdrawals: await getPendingWithdrawals() })
})

router.post('/withdrawals/:id/approve', async (req, res) => {
  const w = await db.prepare('SELECT * FROM withdrawals WHERE id = ?').get(req.params.id)
  if (!w || !['SUBMITTED', 'UNDER_REVIEW'].includes(w.status)) return res.redirect(`${ADMIN}/withdrawals`)
  await db.prepare("UPDATE withdrawals SET status = 'APPROVED', updated_at = NOW() WHERE id = ?").run(w.id)
  await auditLog(req.session.userId, 'APPROVE_WITHDRAWAL', 'WITHDRAWAL', w.id, { status: w.status }, { status: 'APPROVED' }, req.ip)
  await db.prepare("INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)").run(uuidv4(), w.user_id, 'Withdrawal approved', `Your withdrawal of $${parseFloat(w.amount).toFixed(2)} has been approved.`, 'SUCCESS')
  res.redirect(`${ADMIN}/withdrawals?status=APPROVED`)
})

router.post('/withdrawals/:id/hold', async (req, res) => {
  const w = await db.prepare('SELECT * FROM withdrawals WHERE id = ?').get(req.params.id)
  if (!w || ['APPROVED','COMPLETED','REJECTED'].includes(w.status)) return res.redirect(`${ADMIN}/withdrawals`)
  const note = req.body.admin_note || ''
  await db.prepare("UPDATE withdrawals SET status = 'UNDER_REVIEW', admin_note = ?, updated_at = NOW() WHERE id = ?").run(note, w.id)
  await auditLog(req.session.userId, 'HOLD_WITHDRAWAL', 'WITHDRAWAL', w.id, { status: w.status }, { status: 'UNDER_REVIEW', note }, req.ip)
  await db.prepare("INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)").run(uuidv4(), w.user_id, 'Withdrawal Under Review', `Your withdrawal of $${parseFloat(w.amount).toFixed(2)} is being reviewed.`, 'INFO')
  res.redirect(`${ADMIN}/withdrawals?status=UNDER_REVIEW`)
})

router.post('/withdrawals/:id/reject', async (req, res) => {
  const w = await db.prepare('SELECT * FROM withdrawals WHERE id = ?').get(req.params.id)
  if (!w || !['SUBMITTED', 'UNDER_REVIEW'].includes(w.status)) return res.redirect(`${ADMIN}/withdrawals`)
  const reason = req.body.reason || 'Rejected by admin'
  await db.prepare("UPDATE withdrawals SET status = 'REJECTED', admin_note = ?, updated_at = NOW() WHERE id = ?").run(reason, w.id)
  await refundWithdrawal({ userId: w.user_id, amount: w.amount, withdrawalId: w.id, idempotencyKey: w.idempotency_key })
  await auditLog(req.session.userId, 'REJECT_WITHDRAWAL', 'WITHDRAWAL', w.id, { status: w.status }, { status: 'REJECTED', reason }, req.ip)
  await db.prepare("INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)").run(uuidv4(), w.user_id, 'Withdrawal rejected', `Your withdrawal was rejected. Funds have been returned to your available balance.`, 'WARNING')
  res.redirect(`${ADMIN}/withdrawals?status=REJECTED`)
})

router.post('/withdrawals/:id/complete', async (req, res) => {
  const w = await db.prepare('SELECT * FROM withdrawals WHERE id = ?').get(req.params.id)
  if (!w || w.status !== 'APPROVED') return res.redirect(`${ADMIN}/withdrawals`)
  await db.prepare("UPDATE withdrawals SET status = 'COMPLETED', tx_hash = ?, updated_at = NOW() WHERE id = ?").run(req.body.tx_hash || null, w.id)
  await auditLog(req.session.userId, 'COMPLETE_WITHDRAWAL', 'WITHDRAWAL', w.id, { status: 'APPROVED' }, { status: 'COMPLETED' }, req.ip)
  res.redirect(`${ADMIN}/withdrawals?status=COMPLETED`)
})

// Users list
router.get('/users', async (req, res) => {
  const q = req.query.q || ''
  const page = Math.max(1, parseInt(req.query.page) || 1)
  const limit = 20
  const where = q ? "WHERE (email LIKE ? OR name LIKE ?)" : ""
  const params = q ? [`%${q}%`, `%${q}%`] : []
  const totalR = await db.prepare(`SELECT COUNT(*) as c FROM users ${where}`).get(...params)
  const total = totalR?.c || 0
  const users = await db.prepare(`SELECT * FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, limit, (page - 1) * limit)
  const usersWithBalances = await Promise.all(users.map(async u => {
    const b = await getBalances(u.id)
    return { ...u, available: b.available.toFixed(2), pending: b.pending.toFixed(2) }
  }))
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId)
  res.render('admin/users', { user, path: '/admin/users', flash: {}, users: usersWithBalances, total, page, totalPages: Math.ceil(total / limit), query: q, pendingWithdrawals: await getPendingWithdrawals() })
})

// User detail
router.get('/users/:id', async (req, res) => {
  const targetUser = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id)
  if (!targetUser) return res.redirect(`${ADMIN}/users`)
  const b = await getBalances(targetUser.id)
  const withdrawals = await db.prepare('SELECT * FROM withdrawals WHERE user_id = ? ORDER BY created_at DESC LIMIT 15').all(targetUser.id)
  const deposits = await db.prepare('SELECT * FROM deposits WHERE user_id = ? ORDER BY created_at DESC LIMIT 15').all(targetUser.id)
  const ledger = await db.prepare('SELECT * FROM ledger_entries WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').all(targetUser.id)
  const totalDepR = await db.prepare("SELECT SUM(CAST(amount AS REAL)) s FROM deposits WHERE user_id=? AND status='APPROVED'").get(targetUser.id)
  const totalDeposited = ((totalDepR?.s) || 0).toFixed(2)
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId)
  const flash = req.query.msg ? { success: req.query.msg } : req.query.err ? { error: req.query.err } : {}
  res.render('admin/user-detail', {
    user, path: '/admin/users', flash, targetUser,
    balances: { available: b.available.toFixed(2), pending: b.pending.toFixed(2), aiCredits: b.aiCredits.toFixed(2) },
    withdrawals, deposits, ledger, totalDeposited, pendingWithdrawals: await getPendingWithdrawals(),
  })
})

// User quick actions
router.post('/users/:id/action', async (req, res) => {
  const { action, tier } = req.body
  const targetUser = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id)
  if (!targetUser) return res.redirect(`${ADMIN}/users`)
  const before = { suspended: targetUser.suspended, frozen: targetUser.frozen, tier: targetUser.tier }

  if (action === 'SUSPEND')    await db.prepare('UPDATE users SET suspended = 1 WHERE id = ?').run(targetUser.id)
  else if (action === 'UNSUSPEND') await db.prepare('UPDATE users SET suspended = 0 WHERE id = ?').run(targetUser.id)
  else if (action === 'FREEZE')    await db.prepare('UPDATE users SET frozen = 1 WHERE id = ?').run(targetUser.id)
  else if (action === 'UNFREEZE')  await db.prepare('UPDATE users SET frozen = 0 WHERE id = ?').run(targetUser.id)
  else if (action === 'SET_TIER' && tier) await db.prepare('UPDATE users SET tier = ? WHERE id = ?').run(tier, targetUser.id)
  else if (action === 'RESET_2FA') await db.prepare('DELETE FROM two_factor_secrets WHERE user_id = ?').run(targetUser.id)

  await auditLog(req.session.userId, action, 'USER', targetUser.id, before, { action, tier }, req.ip)
  res.redirect(`${ADMIN}/users/${targetUser.id}`)
})

// User balance adjustment
router.post('/users/:id/adjust', async (req, res) => {
  const { type, balance, amount, reason } = req.body
  const targetUser = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id)
  if (!targetUser || !amount || !reason) return res.redirect(`${ADMIN}/users/${req.params.id}`)

  const balances = await getBalances(targetUser.id)
  const before = { available: balances.available.toFixed(2), pending: balances.pending.toFixed(2), lifetime: targetUser.lifetime_volume }

  if (type === 'PROFIT') {
    const newVolume = new Decimal(targetUser.lifetime_volume || '0').plus(amount).toFixed(8)
    await db.prepare('UPDATE users SET lifetime_volume = ? WHERE id = ?').run(newVolume, targetUser.id)
    await manualAdjustment({ userId: targetUser.id, balance: 'AVAILABLE', amount, reason })
    await auditLog(req.session.userId, 'MANUAL_ADJUSTMENT_PROFIT', 'USER', targetUser.id, before, { amount, reason }, req.ip)
  } else {
    await manualAdjustment({ userId: targetUser.id, balance: balance || 'AVAILABLE', amount, reason })
    await auditLog(req.session.userId, 'MANUAL_ADJUSTMENT_BALANCE', 'USER', targetUser.id, before, { balance, amount, reason }, req.ip)
  }
  res.redirect(`${ADMIN}/users/${targetUser.id}`)
})

// Audit log
router.get('/audit', async (req, res) => {
  const query = req.query.action || ''
  const userId = req.query.userId || ''
  const page = Math.max(1, parseInt(req.query.page) || 1)
  const limit = 30
  let where = 'WHERE 1=1'
  const params = []
  if (query) { where += ' AND a.action LIKE ?'; params.push(`%${query}%`) }
  if (userId) { where += ' AND a.target_id = ?'; params.push(userId) }
  const totalR = await db.prepare(`SELECT COUNT(*) as c FROM audit_logs a ${where}`).get(...params)
  const total = totalR?.c || 0
  const entries = await db.prepare(`
    SELECT a.*, u.email as admin_email FROM audit_logs a
    JOIN users u ON u.id = a.admin_id ${where} ORDER BY a.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, limit, (page - 1) * limit)
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId)
  res.render('admin/audit', { user, path: '/admin/audit', flash: {}, entries, total, page, totalPages: Math.ceil(total / limit), query, userId, pendingWithdrawals: await getPendingWithdrawals() })
})

module.exports = router
