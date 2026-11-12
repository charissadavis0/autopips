const { v4: uuidv4 } = require('uuid')
const Decimal = require('decimal.js')
const db = require('../db/database')

async function getBalances(userId) {
  const rows = await db.prepare(`
    SELECT balance, SUM(CAST(amount AS REAL)) as total
    FROM ledger_entries WHERE user_id = ?
    GROUP BY balance
  `).all(userId)

  const snap = { pending: new Decimal(0), available: new Decimal(0), aiCredits: new Decimal(0) }
  for (const r of rows) {
    if (r.balance === 'PENDING')    snap.pending    = new Decimal(parseFloat(r.total) || 0)
    if (r.balance === 'AVAILABLE')  snap.available  = new Decimal(parseFloat(r.total) || 0)
    if (r.balance === 'AI_CREDITS') snap.aiCredits  = new Decimal(parseFloat(r.total) || 0)
  }
  return snap
}

async function postEntry(dbInst, userId, type, balance, amount, description, refId, idempotencyKey) {
  const id = uuidv4()
  const key = idempotencyKey || uuidv4()
  try {
    await dbInst.prepare(`
      INSERT INTO ledger_entries (id, user_id, type, balance, amount, description, idempotency_key, ref_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, type, balance, new Decimal(amount).toFixed(8), description, key, refId || null)
    return { ok: true }
  } catch (e) {
    if (e.message.includes('UNIQUE constraint failed') || e.message.includes('unique_violation') || e.code === '23505') {
      return { ok: true, duplicate: true }
    }
    throw e
  }
}

async function creditPending(opts) {
  return db.transaction(async (txDb) => {
    return postEntry(txDb, opts.userId, 'DEPOSIT_PENDING', 'PENDING', opts.amount,
      `Deposit ${opts.coin} pending`, opts.depositId, opts.idempotencyKey)
  })
}

async function approveDeposit(opts) {
  return db.transaction(async (txDb) => {
    await postEntry(txDb, opts.userId, 'DEPOSIT_PENDING_REVERSAL', 'PENDING',
      new Decimal(opts.amount).negated().toFixed(8),
      'Deposit approved – pending reversal', opts.depositId, opts.idempotencyKey + '_rev')
    return postEntry(txDb, opts.userId, 'DEPOSIT_APPROVED', 'AVAILABLE', opts.amount,
      `Deposit ${opts.coin} approved`, opts.depositId, opts.idempotencyKey + '_avail')
  })
}

async function debitAvailableForWithdrawal(opts) {
  return db.transaction(async (txDb) => {
    const bal = await getBalances(opts.userId)
    if (bal.available.lessThan(new Decimal(opts.amount))) {
      return { ok: false, error: 'Insufficient available balance' }
    }
    return postEntry(txDb, opts.userId, 'WITHDRAWAL_DEBIT', 'AVAILABLE',
      new Decimal(opts.amount).negated().toFixed(8),
      `Withdrawal ${opts.coin || 'USD'} submitted`, opts.withdrawalId, opts.idempotencyKey)
  })
}

async function refundWithdrawal(opts) {
  return db.transaction(async (txDb) => {
    return postEntry(txDb, opts.userId, 'WITHDRAWAL_REFUND', 'AVAILABLE', opts.amount,
      `Withdrawal rejected – refund`, opts.withdrawalId, opts.idempotencyKey + '_refund')
  })
}

async function manualAdjustment(opts) {
  return db.transaction(async (txDb) => {
    return postEntry(txDb, opts.userId, 'MANUAL_ADJUSTMENT', opts.balance || 'AVAILABLE', opts.amount,
      `Adjustment by platform: ${opts.reason}`, null, opts.idempotencyKey || uuidv4())
  })
}

module.exports = { getBalances, postEntry: (u,t,b,a,d,r,k) => postEntry(db, u,t,b,a,d,r,k), creditPending, approveDeposit, debitAvailableForWithdrawal, refundWithdrawal, manualAdjustment }
