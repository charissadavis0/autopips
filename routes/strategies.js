const express = require('express')
const router = express.Router()
const { v4: uuidv4 } = require('uuid')
const requireAuth = require('../middleware/requireAuth')

router.use(requireAuth)

router.get('/', async (req, res) => {
  const db = require('../db/database')
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId)
  const niche = req.query.niche || ''
  const difficulty = req.query.difficulty || ''
  const search = req.query.search || ''

  let sql = "SELECT * FROM strategies WHERE status = 'ACTIVE'"
  const params = []
  if (niche)       { sql += ' AND niche = ?'; params.push(niche) }
  if (difficulty)  { sql += ' AND difficulty = ?'; params.push(difficulty) }
  if (search)      { sql += ' AND (name LIKE ? OR niche LIKE ? OR description LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`) }
  sql += ' ORDER BY is_featured DESC, times_copied DESC'

  const strategies = await db.prepare(sql).all(...params)
  const nichesRows = await db.prepare("SELECT DISTINCT niche FROM strategies WHERE status = 'ACTIVE' ORDER BY niche").all()
  const niches = nichesRows.map(r => r.niche)
  const myStratRows = await db.prepare('SELECT strategy_id FROM user_businesses WHERE user_id = ? AND strategy_id IS NOT NULL').all(user.id)
  const myStrategyIds = myStratRows.map(r => r.strategy_id)

  res.render('strategies/index', { user, path: '/strategies', flash: {}, strategies, niches, niche, difficulty, search, myStrategyIds })
})

router.post('/copy/:strategyId', async (req, res) => {
  const db = require('../db/database')
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId)
  const strategy = await db.prepare("SELECT * FROM strategies WHERE id = ? AND status = 'ACTIVE'").get(req.params.strategyId)
  if (!strategy) return res.redirect('/strategies?error=not_found')

  const bizId = uuidv4()
  const bizName = req.body.business_name || `${strategy.niche} Store`
  await db.prepare(`INSERT INTO user_businesses (id, user_id, name, niche, sourcing_method, mode, strategy_id, status)
    VALUES (?, ?, ?, ?, 'AUTOPIPS', 'MANAGED', ?, 'SETUP')`).run(bizId, user.id, bizName, strategy.niche, strategy.id)

  await db.prepare("UPDATE strategies SET times_copied = times_copied + 1 WHERE id = ?").run(strategy.id)

  const strategyProducts = await db.prepare('SELECT * FROM strategy_products WHERE strategy_id = ?').all(strategy.id)
  for (const sp of strategyProducts) {
    if (sp.product_id) {
      await db.prepare('INSERT INTO user_products (id, user_id, business_id, product_id, status) VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING')
        .run(uuidv4(), user.id, bizId, sp.product_id, 'ACTIVE')
    }
  }

  res.redirect(`/business?launched=${bizId}`)
})

module.exports = router
