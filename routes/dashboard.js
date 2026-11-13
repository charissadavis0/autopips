const express = require('express')
const db = require('../db/database')
const { getBalances } = require('../lib/ledger')
const requireAuth = require('../middleware/requireAuth')

const router = express.Router()
router.use(requireAuth)

router.get('/', async (req, res) => {
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId)

  if (!user.onboarding_complete) return res.redirect('/onboarding')

  const balances = await getBalances(user.id)
  const recentTxns = await db.prepare('SELECT * FROM ledger_entries WHERE user_id = ? ORDER BY created_at DESC LIMIT 10').all(user.id)
  const statsD = await db.prepare('SELECT COUNT(*) as c FROM deposits WHERE user_id = ?').get(user.id)
  const statsW = await db.prepare('SELECT COUNT(*) as c FROM withdrawals WHERE user_id = ?').get(user.id)
  const businesses   = await db.prepare('SELECT * FROM user_businesses WHERE user_id = ? ORDER BY created_at DESC LIMIT 3').all(user.id)
  const myProductsR  = await db.prepare('SELECT COUNT(*) as c FROM user_products WHERE user_id = ?').get(user.id)
  const myAgents     = await db.prepare("SELECT aa.*, a.name as agent_name, a.avatar_initials FROM agent_assignments aa JOIN agents a ON a.id = aa.agent_id WHERE aa.user_id = ? AND aa.status = 'ACTIVE'").all(user.id)
  const pendingTasksR = await db.prepare("SELECT COUNT(*) as c FROM agent_tasks WHERE user_id = ? AND status = 'PENDING'").get(user.id)
  const isSampleData = recentTxns.length === 0

  res.render('dashboard/index', {
    user, path: '/dashboard', flash: {},
    balances: {
      available: balances.available.toFixed(2),
      pending: balances.pending.toFixed(2),
      aiCredits: balances.aiCredits.toFixed(2),
    },
    recentTxns,
    stats: { deposits: statsD?.c || 0, withdrawals: statsW?.c || 0 },
    isSampleData, businesses,
    myProducts: myProductsR?.c || 0,
    myAgents,
    pendingTasks: pendingTasksR?.c || 0,
    title: 'Dashboard', metaDesc: 'Manage your AutoPips dropshipping business — track earnings, monitor AI agents, and grow your store.',
  })
})

module.exports = router
