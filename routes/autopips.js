const express = require('express')
const router = express.Router()
const { v4: uuidv4 } = require('uuid')
const requireAuth = require('../middleware/requireAuth')

router.use(requireAuth)

router.get('/', async (req, res) => {
  const db = require('../db/database')
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId)
  const category = req.query.category || ''
  const search = req.query.search || ''
  const filter = req.query.filter || ''

  let sql = "SELECT * FROM products WHERE status = 'PUBLISHED'"
  const params = []
  if (category) { sql += ' AND category = ?'; params.push(category) }
  if (search)   { sql += ' AND (name LIKE ? OR short_desc LIKE ?)'; params.push(`%${search}%`, `%${search}%`) }
  if (filter === 'trending') { sql += ' AND is_trending = 1' }
  if (filter === 'featured') { sql += ' AND is_featured = 1' }
  sql += ' ORDER BY is_featured DESC, opportunity_score DESC'

  const products = await db.prepare(sql).all(...params)
  const catRows = await db.prepare("SELECT DISTINCT category FROM products WHERE status = 'PUBLISHED' ORDER BY category").all()
  const categories = catRows.map(r => r.category)
  const myProductRows = await db.prepare('SELECT product_id FROM user_products WHERE user_id = ?').all(user.id)
  const myProductIds = myProductRows.map(r => r.product_id)

  res.render('autopips/index', { user, path: '/autopips', flash: {}, products, categories, category, search, filter, myProductIds, title: 'Discover Products', metaDesc: 'Browse hundreds of winning dropshipping products curated by AutoPips AI — find trending items with high profit margins ready to add to your store.' })
})

router.post('/add/:productId', async (req, res) => {
  const db = require('../db/database')
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId)
  const product = await db.prepare("SELECT * FROM products WHERE id = ? AND status = 'PUBLISHED'").get(req.params.productId)
  if (!product) return res.redirect('/autopips?error=not_found')

  const already = await db.prepare('SELECT id FROM user_products WHERE user_id = ? AND product_id = ?').get(user.id, product.id)
  if (already) return res.redirect('/autopips?error=already_added')

  let biz = await db.prepare("SELECT * FROM user_businesses WHERE user_id = ? ORDER BY created_at ASC LIMIT 1").get(user.id)
  if (!biz) {
    const bizId = uuidv4()
    await db.prepare("INSERT INTO user_businesses (id, user_id, name, sourcing_method, status) VALUES (?, ?, ?, 'AUTOPIPS', 'SETUP')")
      .run(bizId, user.id, `${user.name || 'My'} Store`)
    biz = await db.prepare('SELECT * FROM user_businesses WHERE id = ?').get(bizId)
  }

  await db.prepare('INSERT INTO user_products (id, user_id, business_id, product_id, custom_price, status) VALUES (?, ?, ?, ?, ?, ?)')
    .run(uuidv4(), user.id, biz.id, product.id, product.suggested_price, 'ACTIVE')
  await db.prepare("UPDATE products SET times_added = times_added + 1 WHERE id = ?").run(product.id)

  res.redirect('/autopips?success=added')
})

module.exports = router
