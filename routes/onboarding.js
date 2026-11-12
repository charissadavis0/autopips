const express = require('express')
const router = express.Router()
const { v4: uuidv4 } = require('uuid')
const requireAuth = require('../middleware/requireAuth')

router.use(requireAuth)

router.get('/', async (req, res) => {
  const db = require('../db/database')
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId)
  if (user.onboarding_complete) return res.redirect('/dashboard')

  let state = await db.prepare('SELECT * FROM onboarding_state WHERE user_id = ?').get(user.id)
  if (!state) {
    await db.prepare('INSERT INTO onboarding_state (user_id) VALUES (?)').run(user.id)
    state = await db.prepare('SELECT * FROM onboarding_state WHERE user_id = ?').get(user.id)
  }
  const step = parseInt(req.query.step || state.current_step || 1)
  const strategies = step === 4 ? await db.prepare("SELECT * FROM strategies WHERE status = 'ACTIVE' ORDER BY is_featured DESC LIMIT 6").all() : []
  const agents = step === 5 ? await db.prepare("SELECT * FROM agents WHERE status = 'ACTIVE' AND is_available = 1 ORDER BY rating DESC LIMIT 4").all() : []
  res.render('onboarding/wizard', { user, state, step, strategies, agents, flash: {} })
})

router.post('/step/:step', async (req, res) => {
  const db = require('../db/database')
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId)
  const step = parseInt(req.params.step)
  const { action } = req.body

  let state = await db.prepare('SELECT * FROM onboarding_state WHERE user_id = ?').get(user.id)
  if (!state) {
    await db.prepare('INSERT INTO onboarding_state (user_id) VALUES (?)').run(user.id)
    state = await db.prepare('SELECT * FROM onboarding_state WHERE user_id = ?').get(user.id)
  }

  if (action === 'skip') {
    const nextStep = step + 1
    if (nextStep > 5) {
      await db.prepare('UPDATE users SET onboarding_complete = 1 WHERE id = ?').run(user.id)
      return res.redirect('/dashboard')
    }
    await db.prepare('UPDATE onboarding_state SET current_step = ? WHERE user_id = ?').run(nextStep, user.id)
    return res.redirect(`/onboarding?step=${nextStep}`)
  }

  if (step === 1) {
    await db.prepare('UPDATE onboarding_state SET mode = ? WHERE user_id = ?').run(req.body.mode, user.id)
    if (req.body.country) await db.prepare('UPDATE users SET country = ? WHERE id = ?').run(req.body.country, user.id)
  }
  if (step === 4 && req.body.strategy_id) {
    const strategy = await db.prepare('SELECT * FROM strategies WHERE id = ?').get(req.body.strategy_id)
    if (strategy) {
      const bizId = uuidv4()
      await db.prepare("INSERT INTO user_businesses (id, user_id, name, niche, mode, sourcing_method, strategy_id, status) VALUES (?, ?, ?, ?, 'MANAGED', 'AUTOPIPS', ?, 'SETUP') ON CONFLICT DO NOTHING")
        .run(bizId, user.id, `${strategy.niche} Store`, strategy.niche, strategy.id)
    }
  }

  const completed = JSON.parse(state.completed_steps || '[]')
  if (!completed.includes(step)) completed.push(step)
  const nextStep = step + 1

  if (nextStep > 5) {
    await db.prepare('UPDATE users SET onboarding_complete = 1 WHERE id = ?').run(user.id)
    await db.prepare('UPDATE onboarding_state SET completed = 1, completed_steps = ?, current_step = 5 WHERE user_id = ?').run(JSON.stringify(completed), user.id)
    return res.redirect('/dashboard')
  }

  await db.prepare('UPDATE onboarding_state SET current_step = ?, completed_steps = ? WHERE user_id = ?').run(nextStep, JSON.stringify(completed), user.id)
  res.redirect(`/onboarding?step=${nextStep}`)
})

module.exports = router
