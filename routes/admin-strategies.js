const express = require('express')
const { v4: uuidv4 } = require('uuid')
const db = require('../db/database')
const requireAdmin = require('../middleware/requireAdmin')

const router = express.Router()
router.use(requireAdmin())

async function getPW() {
  try { const r = await db.prepare("SELECT COUNT(*) as c FROM withdrawals WHERE status IN ('SUBMITTED','PENDING')").get(); return r?.c || 0 } catch (_) { return 0 }
}

router.get('/', async (req, res) => {
  const { status = '', q = '' } = req.query
  let sql = 'SELECT * FROM strategies WHERE 1=1'
  const params = []
  if (status) { sql += ' AND status = ?'; params.push(status) }
  if (q) { sql += ' AND (name LIKE ? OR niche LIKE ?)'; params.push(`%${q}%`, `%${q}%`) }
  sql += ' ORDER BY created_at DESC'
  const strategies = await db.prepare(sql).all(...params)
  const user = await db.prepare('SELECT * FROM users WHERE id=?').get(req.session.userId)
  res.render('admin/strategies/index', { user, path: '/admin/strategies', flash: req.query.msg ? { success: req.query.msg } : {}, strategies, filters: { status, q }, pendingWithdrawals: await getPW() })
})

router.get('/new', async (req, res) => {
  const user = await db.prepare('SELECT * FROM users WHERE id=?').get(req.session.userId)
  const products = await db.prepare("SELECT id, name, category FROM products WHERE status='PUBLISHED' ORDER BY name").all()
  res.render('admin/strategies/form', { user, path: '/admin/strategies', flash: {}, strategy: null, strategyProducts: [], products, pendingWithdrawals: await getPW() })
})

router.post('/', async (req, res) => {
  const { name, niche, target_country, target_audience, description, estimated_budget,
    suggested_ad_budget, difficulty, marketing_strategy, seo_strategy, social_strategy,
    setup_instructions, is_featured, status, tags, product_ids } = req.body
  if (!name || !niche) return res.redirect(`${ADMIN}/strategies/new?err=Name+and+niche+required`)
  const id = uuidv4()
  await db.prepare(`INSERT INTO strategies
    (id,name,niche,target_country,target_audience,description,estimated_budget,
     suggested_ad_budget,difficulty,marketing_strategy,seo_strategy,social_strategy,
     setup_instructions,is_featured,status,tags,created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, name, niche, target_country||'', target_audience||'', description||'',
      estimated_budget||'', suggested_ad_budget||'', difficulty||'BEGINNER',
      marketing_strategy||'', seo_strategy||'', social_strategy||'',
      setup_instructions||'', is_featured ? 1 : 0, status||'DRAFT',
      tags||'[]', req.session.userId)
  const pids = Array.isArray(product_ids) ? product_ids : (product_ids ? [product_ids] : [])
  for (const [i, pid] of pids.entries()) {
    const p = await db.prepare('SELECT name FROM products WHERE id=?').get(pid)
    if (p) await db.prepare('INSERT INTO strategy_products (id,strategy_id,product_id,product_name,sort_order) VALUES (?,?,?,?,?)').run(uuidv4(), id, pid, p.name, i)
  }
  res.redirect(`${ADMIN}/strategies?msg=Strategy+created`)
})

router.get('/:id/edit', async (req, res) => {
  const strategy = await db.prepare('SELECT * FROM strategies WHERE id=?').get(req.params.id)
  if (!strategy) return res.redirect(`${ADMIN}/strategies?err=Not+found`)
  const user = await db.prepare('SELECT * FROM users WHERE id=?').get(req.session.userId)
  const products = await db.prepare("SELECT id, name, category FROM products WHERE status='PUBLISHED' ORDER BY name").all()
  const strategyProducts = await db.prepare('SELECT product_id FROM strategy_products WHERE strategy_id=?').all(req.params.id)
  res.render('admin/strategies/form', { user, path: '/admin/strategies', flash: {}, strategy, strategyProducts, products, pendingWithdrawals: await getPW() })
})

router.post('/:id', async (req, res) => {
  const { name, niche, target_country, target_audience, description, estimated_budget,
    suggested_ad_budget, difficulty, marketing_strategy, seo_strategy, social_strategy,
    setup_instructions, is_featured, status, tags, product_ids } = req.body
  if (!name) return res.redirect(`/admin/strategies/${req.params.id}/edit?err=Name+required`)
  await db.prepare(`UPDATE strategies SET name=?,niche=?,target_country=?,target_audience=?,description=?,
    estimated_budget=?,suggested_ad_budget=?,difficulty=?,marketing_strategy=?,seo_strategy=?,
    social_strategy=?,setup_instructions=?,is_featured=?,status=?,tags=?,updated_at=NOW() WHERE id=?`)
    .run(name, niche||'General', target_country||'', target_audience||'', description||'',
      estimated_budget||'', suggested_ad_budget||'', difficulty||'BEGINNER',
      marketing_strategy||'', seo_strategy||'', social_strategy||'',
      setup_instructions||'', is_featured ? 1 : 0, status||'DRAFT', tags||'[]', req.params.id)
  await db.prepare('DELETE FROM strategy_products WHERE strategy_id=?').run(req.params.id)
  const pids = Array.isArray(product_ids) ? product_ids : (product_ids ? [product_ids] : [])
  for (const [i, pid] of pids.entries()) {
    const p = await db.prepare('SELECT name FROM products WHERE id=?').get(pid)
    if (p) await db.prepare('INSERT INTO strategy_products (id,strategy_id,product_id,product_name,sort_order) VALUES (?,?,?,?,?)').run(uuidv4(), req.params.id, pid, p.name, i)
  }
  res.redirect(`${ADMIN}/strategies?msg=Strategy+updated`)
})

router.post('/:id/delete', async (req, res) => {
  await db.prepare('DELETE FROM strategies WHERE id=?').run(req.params.id)
  res.redirect(`${ADMIN}/strategies?msg=Strategy+deleted`)
})

module.exports = router
