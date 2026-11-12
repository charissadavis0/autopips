const express = require('express')
const router = express.Router()
const { v4: uuidv4 } = require('uuid')
const requireAuth = require('../middleware/requireAuth')
const { getBalances } = require('../lib/ledger')

router.use(requireAuth)

router.get('/', async (req, res) => {
  const db = require('../db/database')
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId)
  const businesses = await db.prepare(`SELECT ub.*, s.name as strategy_name, s.niche as strategy_niche
    FROM user_businesses ub LEFT JOIN strategies s ON s.id = ub.strategy_id WHERE ub.user_id = ? ORDER BY ub.created_at DESC`).all(user.id)
  const myProductsR = await db.prepare('SELECT COUNT(*) as count FROM user_products WHERE user_id = ?').get(user.id)
  const myAgents = await db.prepare(`SELECT aa.*, a.name as agent_name, a.avatar_initials, a.rating FROM agent_assignments aa
    JOIN agents a ON a.id = aa.agent_id WHERE aa.user_id = ? AND aa.status = 'ACTIVE'`).all(user.id)
  const balances = await getBalances(user.id)
  const flash = { error: req.query.error, success: req.query.success, launched: req.query.launched }
  res.render('business/index', { user, path: '/business', flash, businesses, myProducts: myProductsR, myAgents, balances })
})

router.get('/launch', async (req, res) => {
  const db = require('../db/database')
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId)
  const strategies = await db.prepare("SELECT * FROM strategies WHERE status = 'ACTIVE' ORDER BY is_featured DESC LIMIT 6").all()
  const agents = await db.prepare("SELECT * FROM agents WHERE status = 'ACTIVE' AND is_available = 1 ORDER BY rating DESC LIMIT 4").all()
  const balances = await getBalances(user.id)
  res.render('business/launch', { user, path: '/business/launch', flash: {}, strategies, agents, balances })
})

router.get('/products', async (req, res) => {
  const db = require('../db/database')
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId)
  const products = await db.prepare(`SELECT up.*, p.name as product_name, p.category, p.suggested_price as orig_price,
    p.cost, p.profit_margin, p.supplier_name, p.stock_status, p.images
    FROM user_products up JOIN products p ON p.id = up.product_id WHERE up.user_id = ? ORDER BY up.added_at DESC`).all(user.id)
  const flash = { error: req.query.error, success: req.query.success }
  res.render('business/products', { user, path: '/business/products', flash, products })
})

router.post('/products/:id/remove', async (req, res) => {
  const db = require('../db/database')
  await db.prepare('DELETE FROM user_products WHERE id = ? AND user_id = ?').run(req.params.id, req.session.userId)
  res.redirect('/business/products?success=removed')
})

router.post('/create', async (req, res) => {
  const db = require('../db/database')
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId)
  const { name, niche, mode, sourcing_method } = req.body
  await db.prepare("INSERT INTO user_businesses (id, user_id, name, niche, mode, sourcing_method, status) VALUES (?, ?, ?, ?, ?, ?, 'SETUP')")
    .run(uuidv4(), user.id, name, niche || null, mode || 'INDEPENDENT', sourcing_method || 'AUTOPIPS')
  res.redirect('/business?success=created')
})

router.post('/:bizId/launch', async (req, res) => {
  const db = require('../db/database')
  const biz = await db.prepare('SELECT * FROM user_businesses WHERE id = ? AND user_id = ?').get(req.params.bizId, req.session.userId)
  if (!biz) return res.redirect('/business?error=not_found')
  await db.prepare("UPDATE user_businesses SET status = 'ACTIVE', launch_date = NOW() WHERE id = ?").run(biz.id)
  await db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)')
    .run(uuidv4(), req.session.userId, 'Business Launched!', `Congratulations! "${biz.name}" is now live.`, 'SUCCESS')
  res.redirect('/business?success=launched')
})

module.exports = router
