const express = require('express')
const { v4: uuidv4 } = require('uuid')
const db = require('../db/database')
const requireAdmin = require('../middleware/requireAdmin')
const { uploaderFor, persistUploads, deleteUpload } = require('../lib/upload')

const ADMIN = process.env.ADMIN_PATH || '/admin'
const router = express.Router()
router.use(requireAdmin())
const upload = uploaderFor('qrcodes')

function withUpload(mw, fallback) {
  return (req, res, next) => mw(req, res, (err) => {
    if (err) return res.redirect(fallback + '?err=' + encodeURIComponent(err.message))
    next()
  })
}

async function getPW() {
  try { const r = await db.prepare("SELECT COUNT(*) as c FROM withdrawals WHERE status IN ('SUBMITTED','PENDING')").get(); return r?.c || 0 } catch (_) { return 0 }
}

router.get('/', async (req, res) => {
  const methods = await db.prepare('SELECT * FROM payment_methods ORDER BY coin, network').all()
  const user = await db.prepare('SELECT * FROM users WHERE id=?').get(req.session.userId)
  const flash = req.query.msg ? { success: req.query.msg } : req.query.err ? { error: req.query.err } : {}
  res.render('admin/wallets/index', { user, path: '/admin/wallets', flash, methods, pendingWithdrawals: await getPW() })
})

router.get('/new', async (req, res) => {
  const user = await db.prepare('SELECT * FROM users WHERE id=?').get(req.session.userId)
  const flash = req.query.err ? { error: req.query.err } : {}
  res.render('admin/wallets/form', { user, path: '/admin/wallets', flash, method: null, pendingWithdrawals: await getPW() })
})

router.post('/', withUpload(upload.single('qr_code'), '/admin/wallets/new'), async (req, res) => {
  const { coin, network, address, label, instructions, min_deposit, network_warning, enabled } = req.body
  if (!coin || !network || !address) return res.redirect(`${ADMIN}/wallets/new?err=Coin%2C+network+and+address+are+required`)

  const fbUrls = await persistUploads(req, 'qrcodes')
  const qrCode = fbUrls['qr_code'] || (req.file ? `/uploads/qrcodes/${req.file.filename}` : null)

  await db.prepare(`INSERT INTO payment_methods (id,coin,network,address,label,enabled)
    VALUES (?,?,?,?,?,?)`)
    .run(uuidv4(), coin.trim(), network.trim(), address.trim(), label||`${coin} (${network})`, enabled ? 1 : 0)
  res.redirect(`${ADMIN}/wallets?msg=Wallet+added`)
})

router.get('/:id/edit', async (req, res) => {
  const method = await db.prepare('SELECT * FROM payment_methods WHERE id=?').get(req.params.id)
  if (!method) return res.redirect(`${ADMIN}/wallets?err=Not+found`)
  const user = await db.prepare('SELECT * FROM users WHERE id=?').get(req.session.userId)
  const flash = req.query.err ? { error: req.query.err } : {}
  res.render('admin/wallets/form', { user, path: '/admin/wallets', flash, method, pendingWithdrawals: await getPW() })
})

router.post('/:id', (req, res, next) => withUpload(upload.single('qr_code'), `/admin/wallets/${req.params.id}/edit`)(req, res, next), async (req, res) => {
  const existing = await db.prepare('SELECT * FROM payment_methods WHERE id=?').get(req.params.id)
  if (!existing) return res.redirect(`${ADMIN}/wallets`)
  const { coin, network, address, label, enabled } = req.body
  if (!coin || !network || !address) return res.redirect(`/admin/wallets/${req.params.id}/edit?err=Coin%2C+network+and+address+required`)

  const fbUrls = await persistUploads(req, 'qrcodes')
  let qrCode = existing.qr_code
  if (fbUrls['qr_code']) { await deleteUpload(qrCode); qrCode = fbUrls['qr_code'] }
  else if (req.file) { await deleteUpload(qrCode); qrCode = `/uploads/qrcodes/${req.file.filename}` }

  await db.prepare(`UPDATE payment_methods SET coin=?,network=?,address=?,label=?,enabled=? WHERE id=?`)
    .run(coin.trim(), network.trim(), address.trim(), label||`${coin} (${network})`, enabled ? 1 : 0, req.params.id)
  res.redirect(`${ADMIN}/wallets?msg=Wallet+updated`)
})

router.post('/:id/toggle', async (req, res) => {
  const method = await db.prepare('SELECT * FROM payment_methods WHERE id=?').get(req.params.id)
  if (method) await db.prepare('UPDATE payment_methods SET enabled=? WHERE id=?').run(method.enabled ? 0 : 1, req.params.id)
  res.redirect(`${ADMIN}/wallets?msg=Wallet+status+updated`)
})

router.post('/:id/delete-qr', async (req, res) => {
  const method = await db.prepare('SELECT * FROM payment_methods WHERE id=?').get(req.params.id)
  if (method) { await deleteUpload(method.qr_code); await db.prepare('UPDATE payment_methods SET qr_code=NULL WHERE id=?').run(req.params.id) }
  res.redirect(`/admin/wallets/${req.params.id}/edit?msg=QR+removed`)
})

router.post('/:id/delete', async (req, res) => {
  const method = await db.prepare('SELECT * FROM payment_methods WHERE id=?').get(req.params.id)
  if (method) { await deleteUpload(method.qr_code); await db.prepare('DELETE FROM payment_methods WHERE id=?').run(req.params.id) }
  res.redirect(`${ADMIN}/wallets?msg=Wallet+removed`)
})

module.exports = router
