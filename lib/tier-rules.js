const Decimal = require('decimal.js')
const db = require('../db/database')

const TIERS = {
  STANDARD: { feePercent: 5,   dailyLimitUsd: 500,   holdHours: 72,  label: 'Standard' },
  GOLD:     { feePercent: 3.5, dailyLimitUsd: 5000,  holdHours: 48,  label: 'Gold'     },
  PLATINUM: { feePercent: 2,   dailyLimitUsd: 50000, holdHours: 24,  label: 'Platinum' },
}

function getTierConfig(tier) {
  return TIERS[tier] || TIERS.STANDARD
}

async function checkWithdrawalLimit(userId, amount, tier) {
  const config = getTierConfig(tier)
  const amountDec = new Decimal(amount)

  if (amountDec.greaterThan(config.dailyLimitUsd)) {
    return { allowed: false, reason: `Exceeds daily limit of $${config.dailyLimitUsd} for ${config.label} tier` }
  }

  const row = await db.prepare(`
    SELECT COALESCE(SUM(CAST(amount AS REAL)), 0) as total
    FROM withdrawals
    WHERE user_id = ? AND status NOT IN ('REJECTED') AND date(created_at) = CURRENT_DATE
  `).get(userId)

  const todayTotal = new Decimal(parseFloat(row?.total) || 0)
  if (todayTotal.plus(amountDec).greaterThan(config.dailyLimitUsd)) {
    return { allowed: false, reason: `Daily withdrawal limit of $${config.dailyLimitUsd} reached` }
  }

  return { allowed: true }
}

function calculateFee(amount, tier) {
  const config = getTierConfig(tier)
  const fee = new Decimal(amount).times(config.feePercent).dividedBy(100)
  return fee.toFixed(8)
}

module.exports = { getTierConfig, checkWithdrawalLimit, calculateFee }
