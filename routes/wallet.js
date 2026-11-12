const express = require('express')
const { v4: uuidv4 } = require('uuid')
const Decimal = require('decimal.js')
const db = require('../db/database')
const { getBalances, creditPending, debitAvailableForWithdrawal } = require('../lib/ledger')
const { getTierConfig, checkWithdrawalLimit, calculateFee } = require('../lib/tier-rules')
const requireAuth = require('../middleware/requireAuth')

const router = express.Router()
router.use(requireAuth)

async function getWalletData(userId, activeTab) {
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(userId)
  const balances = await getBalances(userId)
  const paymentMethods = await db.prepare('SELECT * FROM payment_methods WHERE enabled = 1').all()
  const transactions = await db.prepare('SELECT * FROM ledger_entries WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(userId)
  const deposits = await db.prepare('SELECT * FROM deposits WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').all(userId)
  const withdrawals = await db.prepare('SELECT * FROM withdrawals WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').all(userId)
  const tierConfig = getTierConfig(user.tier)
  return {
    user, path: '/wallet', flash: {}, activeTab: activeTab || 'deposit',
    balances: { available: balances.available.toFixed(2), pending: balances.pending.toFixed(2), aiCredits: balances.aiCredits.toFixed(2) },
    paymentMethods, transactions, deposits, withdrawals, tierConfig,
  }
}

router.get('/', async (req, res) => {
  const tab = req.query.tab || 'deposit'
  res.render('wallet/index', await getWalletData(req.session.userId, tab))
})

router.post('/deposit', async (req, res) => {
  const { payment_method_id, amount, tx_hash } = req.body
  const method = await db.prepare('SELECT * FROM payment_methods WHERE id = ?').get(payment_method_id)
  if (!method) {
    const data = await getWalletData(req.session.userId, 'deposit')
    data.flash = { error: 'Invalid payment method.' }
    return res.render('wallet/index', data)
  }
  if (!amount || parseFloat(amount) < 10) {
    const data = await getWalletData(req.session.userId, 'deposit')
    data.flash = { error: 'Minimum deposit is $10.' }
    return res.render('wallet/index', data)
  }
  const depositId = uuidv4()
  const idempotencyKey = uuidv4()
  await db.prepare(`INSERT INTO deposits (id, user_id, coin, network, address, amount, status, tx_hash, idempotency_key)
    VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)`).run(depositId, req.session.userId, method.coin, method.network, method.address, amount, tx_hash || null, idempotencyKey)
  await creditPending({ userId: req.session.userId, amount, coin: method.coin, depositId, idempotencyKey })
  await db.prepare(`INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)`).run(uuidv4(), req.session.userId, 'Deposit received', `Your deposit of $${parseFloat(amount).toFixed(2)} is pending review.`, 'INFO')
  const data = await getWalletData(req.session.userId, 'deposit')
  data.flash = { success: 'Deposit submitted and pending review.' }
  res.render('wallet/index', data)
})

router.post('/withdraw', async (req, res) => {
  const { coin, network, address, amount } = req.body
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId)
  const balances = await getBalances(req.session.userId)

  if (!amount || parseFloat(amount) < 20) {
    const data = await getWalletData(req.session.userId, 'withdraw')
    data.flash = { error: 'Minimum withdrawal is $20.' }
    return res.render('wallet/index', data)
  }
  if (balances.available.lessThan(new Decimal(amount))) {
    const data = await getWalletData(req.session.userId, 'withdraw')
    data.flash = { error: 'Insufficient available balance.' }
    return res.render('wallet/index', data)
  }
  const limitCheck = await checkWithdrawalLimit(req.session.userId, amount, user.tier)
  if (!limitCheck.allowed) {
    const data = await getWalletData(req.session.userId, 'withdraw')
    data.flash = { error: limitCheck.reason }
    return res.render('wallet/index', data)
  }
  const fee = calculateFee(amount, user.tier)
  const netAmount = new Decimal(amount).minus(fee).toFixed(8)
  const withdrawalId = uuidv4()
  const idempotencyKey = uuidv4()
  const result = await debitAvailableForWithdrawal({ userId: req.session.userId, amount, coin: coin || 'USD', withdrawalId, idempotencyKey })
  if (!result || !result.ok) {
    const data = await getWalletData(req.session.userId, 'withdraw')
    data.flash = { error: result?.error || 'Withdrawal failed.' }
    return res.render('wallet/index', data)
  }
  await db.prepare(`INSERT INTO withdrawals (id, user_id, coin, network, address, amount, fee, net_amount, status, idempotency_key)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED', ?)`).run(withdrawalId, req.session.userId, coin, network, address, amount, fee, netAmount, idempotencyKey)
  await db.prepare(`INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)`).run(uuidv4(), req.session.userId, 'Withdrawal submitted', `Your withdrawal of $${parseFloat(amount).toFixed(2)} is under review.`, 'INFO')
  const data = await getWalletData(req.session.userId, 'history')
  data.flash = { success: 'Withdrawal submitted successfully.' }
  res.render('wallet/index', data)
})

module.exports = router
