const express = require('express')
const router = express.Router()
const { v4: uuidv4 } = require('uuid')
const requireAuth = require('../middleware/requireAuth')

router.use(requireAuth)

router.get('/', async (req, res) => {
  const db = require('../db/database')
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId)
  const accounts = await db.prepare(`SELECT sa.*, a.name as agent_name FROM social_accounts sa
    LEFT JOIN agents a ON a.id = sa.managed_by_agent_id WHERE sa.user_id = ? ORDER BY sa.created_at DESC`).all(user.id)
  const myAgents = await db.prepare(`SELECT aa.*, a.name as agent_name, a.avatar_initials FROM agent_assignments aa
    JOIN agents a ON a.id = aa.agent_id WHERE aa.user_id = ? AND aa.status = 'ACTIVE'`).all(user.id)
  const flash = { error: req.query.error, success: req.query.success }
  res.render('social/index', { user, path: '/social', flash, accounts, myAgents })
})

router.post('/request-setup', async (req, res) => {
  const db = require('../db/database')
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId)
  const { platform, brand_name, niche, assignment_id, notes } = req.body

  const assignment = assignment_id ? await db.prepare('SELECT * FROM agent_assignments WHERE id = ? AND user_id = ?').get(assignment_id, user.id) : null
  const agentId = assignment ? assignment.agent_id : null

  await db.prepare(`INSERT INTO social_accounts (id, user_id, platform, account_type, brand_name, niche, managed_by_agent_id, setup_status, notes)
    VALUES (?, ?, ?, 'AGENT_MANAGED', ?, ?, ?, 'PENDING', ?)`).run(
    uuidv4(), user.id, platform, brand_name, niche, agentId, notes || null
  )

  if (agentId) {
    await db.prepare(`INSERT INTO agent_tasks (id, user_id, agent_id, assignment_id, task_type, title, brief, amount_charged, status)
      VALUES (?, ?, ?, ?, 'SOCIAL_SETUP', ?, ?, '0.00', 'PENDING')`).run(
      uuidv4(), user.id, agentId, assignment_id,
      `${platform} account setup — ${brand_name}`,
      JSON.stringify({ platform, brand_name, niche, notes })
    )
    await db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)')
      .run(uuidv4(), user.id, 'Social Setup Requested', `Your agent will create a new ${platform} account for "${brand_name}". They will share access details with you securely.`, 'INFO')
  }

  res.redirect('/social?success=requested')
})

router.post('/:accountId/remove', async (req, res) => {
  const db = require('../db/database')
  await db.prepare('DELETE FROM social_accounts WHERE id = ? AND user_id = ?').run(req.params.accountId, req.session.userId)
  res.redirect('/social?success=removed')
})

module.exports = router
