const express = require('express')
const { v4: uuidv4 } = require('uuid')
const db = require('../db/database')
const requireAdmin = require('../middleware/requireAdmin')
const { approveDeposit } = require('../lib/ledger')

const router = express.Router()
router.use(requireAdmin())

async function getPW() {
  try {
    const r = await db.prepare("SELECT COUNT(*) c FROM withdrawals WHERE status IN ('SUBMITTED','PENDING')").get()
    return r?.c || 0
  } catch (_) { return 0 }
}

async function auditLog(adminId, action, targetId, before, after, ip) {
  try {
    await db.prepare(`INSERT INTO audit_logs (id,admin_id,action,target_type,target_id,before_val,after_val,ip_address)
      VALUES (?,?,?,?,?,?,?,?)`)
      .run(uuidv4(), adminId, action, 'DEPOSIT', targetId,
        before ? JSON.stringify(before) : null, after ? JSON.stringify(after) : null, ip || null)
  } catch (_) {}
}

router.get('/', async (req, res) => {
  const status = req.query.status || 'PENDING'
  const page = Math.max(1, parseInt(req.query.page) || 1)
  const limit = 25
  const totalR = await db.prepare('SELECT COUNT(*) c FROM deposits WHERE status=?').get(status)
  const total = totalR?.c || 0
  const deposits = await db.prepare(`
    SELECT d.*, u.email as user_email, u.name as user_name, u.tier as user_tier
    FROM deposits d JOIN users u ON u.id = d.user_id
    WHERE d.status=? ORDER BY d.created_at DESC LIMIT ? OFFSET ?
  `).all(status, limit, (page - 1) * limit)
  const user = await db.prepare('SELECT * FROM users WHERE id=?').get(req.session.userId)
  const flash = req.query.msg ? { success: req.query.msg } : req.query.err ? { error: req.query.err } : {}
  res.render('admin/deposits', { user, path: '/admin/deposits', flash, deposits, total, page,
    totalPages: Math.ceil(total / limit), currentStatus: status, pendingWithdrawals: await getPW() })
})

router.post('/:id/approve', async (req, res) => {
  const deposit = await db.prepare('SELECT * FROM deposits WHERE id=?').get(req.params.id)
  if (!deposit) return res.redirect(`${ADMIN}/deposits?err=Not+found`)
  if (!['PENDING','UNDER_REVIEW','ON_HOLD'].includes(deposit.status)) {
    return res.redirect(`${ADMIN}/deposits?err=Cannot+approve+' + deposit.status + '+deposit`)
  }
  const alreadyCredited = await db.prepare("SELECT id FROM ledger_entries WHERE ref_id=? AND type='DEPOSIT_APPROVED'").get(deposit.id)
  if (alreadyCredited) return res.redirect(`${ADMIN}/deposits?err=Deposit+already+credited`)

  const adminNote = req.body.admin_note || ''
  const history = JSON.parse(deposit.status_history || '[]')
  history.push({ status: 'APPROVED', by: req.session.userId, at: new Date().toISOString(), note: adminNote })

  await db.prepare("UPDATE deposits SET status='APPROVED', admin_note=?, status_history=?, updated_at=NOW() WHERE id=?")
    .run(adminNote, JSON.stringify(history), deposit.id)

  const ikey = `deposit_approve_${deposit.id}`
  await approveDeposit({
    userId: deposit.user_id,
    amount: deposit.amount,
    coin: deposit.coin,
    depositId: deposit.id,
    idempotencyKey: ikey,
  })

  await db.prepare('INSERT INTO notifications (id,user_id,title,message,type) VALUES (?,?,?,?,?)')
    .run(uuidv4(), deposit.user_id, 'Deposit Approved',
      `Your ${deposit.coin} deposit of $${deposit.amount} has been approved and credited to your wallet.`, 'SUCCESS')

  await auditLog(req.session.userId, 'APPROVE_DEPOSIT', deposit.id,
    { status: deposit.status }, { status: 'APPROVED', credited: deposit.amount }, req.ip)
  res.redirect(`${ADMIN}/deposits?status=APPROVED&msg=Deposit+approved+and+credited`)
})

router.post('/:id/decline', async (req, res) => {
  const deposit = await db.prepare('SELECT * FROM deposits WHERE id=?').get(req.params.id)
  if (!deposit) return res.redirect(`${ADMIN}/deposits?err=Not+found`)
  if (['APPROVED','REJECTED'].includes(deposit.status)) {
    return res.redirect(`${ADMIN}/deposits?err=Cannot+decline+' + deposit.status + '+deposit`)
  }
  const adminNote = req.body.admin_note || 'Deposit declined by admin'
  const history = JSON.parse(deposit.status_history || '[]')
  history.push({ status: 'REJECTED', by: req.session.userId, at: new Date().toISOString(), note: adminNote })
  await db.prepare("UPDATE deposits SET status='REJECTED', admin_note=?, status_history=?, updated_at=NOW() WHERE id=?")
    .run(adminNote, JSON.stringify(history), deposit.id)

  await db.prepare('INSERT INTO notifications (id,user_id,title,message,type) VALUES (?,?,?,?,?)')
    .run(uuidv4(), deposit.user_id, 'Deposit Declined',
      `Your ${deposit.coin} deposit of $${deposit.amount} could not be verified. Reason: ${adminNote}`, 'ERROR')

  await auditLog(req.session.userId, 'DECLINE_DEPOSIT', deposit.id,
    { status: deposit.status }, { status: 'REJECTED', reason: adminNote }, req.ip)
  res.redirect(`${ADMIN}/deposits?status=REJECTED&msg=Deposit+declined`)
})

router.post('/:id/hold', async (req, res) => {
  const deposit = await db.prepare('SELECT * FROM deposits WHERE id=?').get(req.params.id)
  if (!deposit) return res.redirect(`${ADMIN}/deposits?err=Not+found`)
  if (['APPROVED','REJECTED'].includes(deposit.status)) {
    return res.redirect(`${ADMIN}/deposits?err=Cannot+hold+' + deposit.status + '+deposit`)
  }
  const adminNote = req.body.admin_note || ''
  const history = JSON.parse(deposit.status_history || '[]')
  history.push({ status: 'ON_HOLD', by: req.session.userId, at: new Date().toISOString(), note: adminNote })
  await db.prepare("UPDATE deposits SET status='ON_HOLD', admin_note=?, status_history=?, updated_at=NOW() WHERE id=?")
    .run(adminNote, JSON.stringify(history), deposit.id)

  await auditLog(req.session.userId, 'HOLD_DEPOSIT', deposit.id,
    { status: deposit.status }, { status: 'ON_HOLD' }, req.ip)
  res.redirect(`${ADMIN}/deposits?status=ON_HOLD&msg=Deposit+placed+on+hold`)
})

router.post('/:id/review', async (req, res) => {
  const deposit = await db.prepare('SELECT * FROM deposits WHERE id=?').get(req.params.id)
  if (!deposit || ['APPROVED','REJECTED'].includes(deposit.status)) return res.redirect(`${ADMIN}/deposits`)
  const adminNote = req.body.admin_note || ''
  const history = JSON.parse(deposit.status_history || '[]')
  history.push({ status: 'UNDER_REVIEW', by: req.session.userId, at: new Date().toISOString(), note: adminNote })
  await db.prepare("UPDATE deposits SET status='UNDER_REVIEW', admin_note=?, status_history=?, updated_at=NOW() WHERE id=?")
    .run(adminNote, JSON.stringify(history), deposit.id)
  res.redirect(`${ADMIN}/deposits?status=UNDER_REVIEW&msg=Deposit+marked+under+review`)
})

module.exports = router
