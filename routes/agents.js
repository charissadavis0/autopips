const express = require('express')
const router = express.Router()
const { v4: uuidv4 } = require('uuid')
const requireAuth = require('../middleware/requireAuth')
const { getBalances, debitAvailableForWithdrawal } = require('../lib/ledger')

router.use(requireAuth)

router.get('/', async (req, res) => {
  const db = require('../db/database')
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId)
  const agents = await db.prepare("SELECT * FROM agents WHERE status = 'ACTIVE' AND is_available = 1 ORDER BY rating DESC").all()
  const myAssignmentsRows = await db.prepare("SELECT agent_id FROM agent_assignments WHERE user_id = ? AND status = 'ACTIVE'").all(user.id)
  const myAssignments = myAssignmentsRows.map(r => r.agent_id)
  const flash = { error: req.query.error, success: req.query.success }
  res.render('agents/index', { user, path: '/agents', flash, agents, myAssignments, title: 'AI Agents', metaDesc: 'Hire AI agents on AutoPips to handle your dropshipping tasks — customer service, product research, order fulfillment, and more, all on autopilot.' })
})

router.get('/:agentId/hire', async (req, res) => {
  const db = require('../db/database')
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId)
  const agent = await db.prepare("SELECT * FROM agents WHERE id = ? AND status = 'ACTIVE'").get(req.params.agentId)
  if (!agent) return res.redirect('/agents?error=not_found')

  const businesses = await db.prepare('SELECT * FROM user_businesses WHERE user_id = ?').all(user.id)
  const existing = await db.prepare("SELECT * FROM agent_assignments WHERE user_id = ? AND agent_id = ? AND status = 'ACTIVE'").get(user.id, agent.id)
  if (existing) return res.redirect('/agents?error=already_hired')

  const b = await getBalances(user.id)
  const flash = req.query.error === 'insufficient_balance'
    ? { error: 'Insufficient wallet balance. Please deposit funds first.' }
    : {}
  res.render('agents/hire', { user, path: '/agents', flash, agent, businesses, balances: { available: b.available.toFixed(2), pending: b.pending.toFixed(2), aiCredits: b.aiCredits.toFixed(2) } })
})

router.post('/:agentId/hire', async (req, res) => {
  const db = require('../db/database')
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId)
  const agent = await db.prepare("SELECT * FROM agents WHERE id = ? AND status = 'ACTIVE'").get(req.params.agentId)
  if (!agent) return res.redirect('/agents?error=not_found')

  const { business_id, services, can_manage_social } = req.body
  const fee = parseFloat(agent.base_fee) || 0
  const balances = await getBalances(user.id)
  const available = parseFloat(balances.available.toString())

  if (available < fee) return res.redirect(`/agents/${agent.id}/hire?error=insufficient_balance`)

  const ikey = `agent_hire_${user.id}_${agent.id}_${Date.now()}`
  const debitResult = await debitAvailableForWithdrawal({
    userId: user.id,
    amount: fee.toString(),
    coin: 'USD',
    withdrawalId: null,
    idempotencyKey: ikey,
  })
  if (!debitResult || debitResult.ok === false) {
    return res.redirect(`/agents/${agent.id}/hire?error=insufficient_balance`)
  }

  const selectedServices = Array.isArray(services) ? services : (services ? [services] : [])

  await db.prepare(`INSERT INTO agent_assignments (id, user_id, agent_id, business_id, services, monthly_fee, status, can_manage_social, can_manage_products)
    VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, 1)`)
    .run(uuidv4(), user.id, agent.id, business_id || null, JSON.stringify(selectedServices), agent.base_fee, can_manage_social ? 1 : 0)

  await db.prepare("UPDATE agents SET stores_managed = stores_managed + 1 WHERE id = ?").run(agent.id)

  await db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)')
    .run(uuidv4(), user.id, 'Agent Hired', `${agent.name} has been assigned to your business. They will reach out shortly.`, 'SUCCESS')

  res.redirect('/business?success=agent_hired')
})

router.post('/assignment/:assignmentId/end', async (req, res) => {
  const db = require('../db/database')
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId)
  const assignment = await db.prepare('SELECT * FROM agent_assignments WHERE id = ? AND user_id = ?').get(req.params.assignmentId, user.id)
  if (!assignment) return res.redirect('/business?error=not_found')

  await db.prepare("UPDATE agent_assignments SET status = 'ENDED', ended_at = NOW() WHERE id = ?").run(assignment.id)
  await db.prepare("UPDATE agents SET stores_managed = GREATEST(0, stores_managed - 1) WHERE id = ?").run(assignment.agent_id)

  res.redirect('/business?success=assignment_ended')
})

module.exports = router
