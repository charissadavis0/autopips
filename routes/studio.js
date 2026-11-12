const express = require('express')
const router = express.Router()
const { v4: uuidv4 } = require('uuid')
const requireAuth = require('../middleware/requireAuth')
const { getBalances, debitAvailableForWithdrawal } = require('../lib/ledger')

router.use(requireAuth)

router.get('/video', async (req, res) => {
  const db = require('../db/database')
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId)
  const myProducts = await db.prepare(`SELECT up.*, p.name as product_name FROM user_products up
    JOIN products p ON p.id = up.product_id WHERE up.user_id = ? AND up.status = 'ACTIVE'`).all(user.id)
  const myAgents = await db.prepare(`SELECT aa.*, a.name as agent_name, a.video_rate, a.avatar_initials FROM agent_assignments aa
    JOIN agents a ON a.id = aa.agent_id WHERE aa.user_id = ? AND aa.status = 'ACTIVE'`).all(user.id)
  const myTasks = await db.prepare(`SELECT at.*, a.name as agent_name FROM agent_tasks at
    JOIN agents a ON a.id = at.agent_id WHERE at.user_id = ? AND at.task_type = 'VIDEO'
    ORDER BY at.created_at DESC LIMIT 20`).all(user.id)
  const balances = await getBalances(user.id)
  const flash = { error: req.query.error, success: req.query.success }
  res.render('studio/video', { user, path: '/studio/video', flash, myProducts, myAgents, myTasks, balances })
})

router.post('/video/request', async (req, res) => {
  const db = require('../db/database')
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId)
  const { assignment_id, product_id, platform, style, duration, description } = req.body

  if (!assignment_id) return res.redirect('/studio/video?error=no_agent')

  const assignment = await db.prepare('SELECT aa.*, a.name as agent_name, a.video_rate FROM agent_assignments aa JOIN agents a ON a.id = aa.agent_id WHERE aa.id = ? AND aa.user_id = ?').get(assignment_id, user.id)
  if (!assignment) return res.redirect('/studio/video?error=invalid_assignment')

  const rate = parseFloat(assignment.video_rate)
  const balances = await getBalances(user.id)
  if (parseFloat(balances.available.toString()) < rate) return res.redirect('/studio/video?error=insufficient_balance')

  const ikey = `video_request_${user.id}_${assignment_id}_${Date.now()}`
  const debitResult = await debitAvailableForWithdrawal({
    userId: user.id, amount: rate.toString(), coin: 'USD', withdrawalId: null, idempotencyKey: ikey,
  })
  if (!debitResult || debitResult.ok === false) return res.redirect('/studio/video?error=insufficient_balance')

  const product = product_id ? await db.prepare('SELECT name FROM products WHERE id = ?').get(product_id) : null
  const title = `${platform} ${style} Video${product ? ` — ${product.name}` : ''}`

  await db.prepare(`INSERT INTO agent_tasks (id, user_id, agent_id, assignment_id, task_type, title, brief, amount_charged, status)
    VALUES (?, ?, ?, ?, 'VIDEO', ?, ?, ?, 'PENDING')`).run(
    uuidv4(), user.id, assignment.agent_id, assignment_id, title,
    JSON.stringify({ product_id, platform, style, duration, description }),
    rate.toString()
  )

  await db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)')
    .run(uuidv4(), user.id, 'Video Request Sent', `Your video request has been sent to ${assignment.agent_name}. You'll be notified when it's ready.`, 'INFO')

  res.redirect('/studio/video?success=requested')
})

module.exports = router
