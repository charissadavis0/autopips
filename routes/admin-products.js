const express = require('express')
const { v4: uuidv4 } = require('uuid')
const db = require('../db/database')
const requireAdmin = require('../middleware/requireAdmin')
const { uploaderFor, persistUploads, deleteUpload } = require('../lib/upload')

const ADMIN = process.env.ADMIN_PATH || '/admin'
const router = express.Router()
router.use(requireAdmin())
const upload = uploaderFor('products')

async function getPW() {
  try { const r = await db.prepare("SELECT COUNT(*) as c FROM withdrawals WHERE status IN ('SUBMITTED','PENDING')").get(); return r?.c || 0 } catch (_) { return 0 }
}

function withUpload(mw, fallback) {
  return (req, res, next) => mw(req, res, (err) => {
    if (err) return res.redirect(fallback + '?err=' + encodeURIComponent(err.message))
    next()
  })
}

router.get('/', async (req, res) => {
  const { status = '', category = '', q = '' } = req.query
  let sql = 'SELECT * FROM products WHERE 1=1'
  const params = []
  if (status) { sql += ' AND status = ?'; params.push(status) }
  if (category) { sql += ' AND category = ?'; params.push(category) }
  if (q) { sql += ' AND (name LIKE ? OR short_desc LIKE ?)'; params.push(`%${q}%`, `%${q}%`) }
  sql += ' ORDER BY created_at DESC'
  const products = await db.prepare(sql).all(...params)
  const catRows = await db.prepare('SELECT DISTINCT category FROM products ORDER BY category').all()
  const categories = catRows.map(r => r.category)
  const user = await db.prepare('SELECT * FROM users WHERE id=?').get(req.session.userId)
  const flash = req.query.msg ? { success: req.query.msg } : req.query.err ? { error: req.query.err } : {}
  res.render('admin/products/index', { user, path: '/admin/products', flash, products, categories, filters: { status, category, q }, pendingWithdrawals: await getPW() })
})

router.get('/new', async (req, res) => {
  const user = await db.prepare('SELECT * FROM users WHERE id=?').get(req.session.userId)
  res.render('admin/products/form', { user, path: '/admin/products', flash: {}, product: null, pendingWithdrawals: await getPW() })
})

router.post('/', withUpload(upload.array('product_images', 10), '/admin/products/new'), async (req, res) => {
  const { name, short_desc, description, category, cost, suggested_price, profit_margin,
    supplier_name, supplier_country, shipping_estimate, shipping_days_min, shipping_days_max,
    stock_status, opportunity_score, is_trending, is_featured, status,
    image_urls, variations, tags } = req.body

  if (!name || !category) return res.redirect(`${ADMIN}/products/new?err=Name+and+category+required`)

  const id = uuidv4()
  const fbUrls = await persistUploads(req, 'products')
  const uploadedImgs = fbUrls['product_images']
    ? (Array.isArray(fbUrls['product_images']) ? fbUrls['product_images'] : [fbUrls['product_images']])
    : (req.files || []).map(f => `/uploads/products/${f.filename}`)
  let urlImgs = []
  try { urlImgs = JSON.parse(image_urls || '[]') } catch (_) {}
  const images = JSON.stringify([...uploadedImgs, ...urlImgs])

  await db.prepare(`INSERT INTO products
    (id,name,short_desc,description,category,cost,suggested_price,profit_margin,
     supplier_name,supplier_country,shipping_estimate,shipping_days_min,shipping_days_max,
     stock_status,opportunity_score,is_trending,is_featured,status,images,variations,tags,created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, name, short_desc||'', description||'', category,
      cost||'0.00', suggested_price||'0.00', profit_margin||'0',
      supplier_name||'', supplier_country||'', shipping_estimate||'',
      parseInt(shipping_days_min)||7, parseInt(shipping_days_max)||21,
      stock_status||'IN_STOCK', parseInt(opportunity_score)||70,
      is_trending ? 1 : 0, is_featured ? 1 : 0,
      status||'DRAFT', images, variations||'[]', tags||'[]',
      req.session.userId)
  res.redirect(`${ADMIN}/products?msg=Product+created`)
})

router.get('/:id/edit', async (req, res) => {
  const product = await db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id)
  if (!product) return res.redirect(`${ADMIN}/products?err=Not+found`)
  const user = await db.prepare('SELECT * FROM users WHERE id=?').get(req.session.userId)
  res.render('admin/products/form', { user, path: '/admin/products', flash: {}, product, pendingWithdrawals: await getPW() })
})

router.post('/:id', (req, res, next) => withUpload(upload.array('product_images', 10), `/admin/products/${req.params.id}/edit`)(req, res, next), async (req, res) => {
  const existing = await db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id)
  if (!existing) return res.redirect(`${ADMIN}/products`)
  const { name, short_desc, description, category, cost, suggested_price, profit_margin,
    supplier_name, supplier_country, shipping_estimate, shipping_days_min, shipping_days_max,
    stock_status, opportunity_score, is_trending, is_featured, status,
    image_urls, remove_images, variations, tags } = req.body
  if (!name) return res.redirect(`${ADMIN}/products/${req.params.id}/edit?err=Name+required`)

  let imgs = []
  try { imgs = JSON.parse(existing.images || '[]') } catch (_) {}
  const toRemove = Array.isArray(remove_images) ? remove_images : (remove_images ? [remove_images] : [])
  for (const p of toRemove) { await deleteUpload(p); imgs = imgs.filter(i => i !== p) }

  const fbUrls = await persistUploads(req, 'products')
  const newUploads = fbUrls['product_images']
    ? (Array.isArray(fbUrls['product_images']) ? fbUrls['product_images'] : [fbUrls['product_images']])
    : (req.files || []).map(f => `/uploads/products/${f.filename}`)
  let newUrls = []
  try { newUrls = JSON.parse(image_urls || '[]') } catch (_) {}
  imgs = [...imgs, ...newUploads, ...newUrls]

  await db.prepare(`UPDATE products SET name=?,short_desc=?,description=?,category=?,cost=?,suggested_price=?,
    profit_margin=?,supplier_name=?,supplier_country=?,shipping_estimate=?,shipping_days_min=?,
    shipping_days_max=?,stock_status=?,opportunity_score=?,is_trending=?,is_featured=?,status=?,
    images=?,variations=?,tags=?,updated_at=NOW() WHERE id=?`)
    .run(name, short_desc||'', description||'', category||'General',
      cost||'0.00', suggested_price||'0.00', profit_margin||'0',
      supplier_name||'', supplier_country||'', shipping_estimate||'',
      parseInt(shipping_days_min)||7, parseInt(shipping_days_max)||21,
      stock_status||'IN_STOCK', parseInt(opportunity_score)||70,
      is_trending ? 1 : 0, is_featured ? 1 : 0, status||'DRAFT',
      JSON.stringify(imgs), variations||'[]', tags||'[]',
      req.params.id)
  res.redirect(`${ADMIN}/products?msg=Product+updated`)
})

router.post('/:id/delete', async (req, res) => {
  const p = await db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id)
  if (p) {
    let imgs = []; try { imgs = JSON.parse(p.images || '[]') } catch (_) {}
    for (const img of imgs) await deleteUpload(img)
    await db.prepare('DELETE FROM products WHERE id=?').run(req.params.id)
  }
  res.redirect(`${ADMIN}/products?msg=Product+deleted`)
})

router.post('/:id/status', async (req, res) => {
  const { status } = req.body
  const allowed = ['DRAFT','PUBLISHED','ARCHIVED']
  if (!allowed.includes(status)) return res.redirect(`${ADMIN}/products?err=Invalid+status`)
  await db.prepare("UPDATE products SET status=?, updated_at=NOW() WHERE id=?").run(status, req.params.id)
  res.redirect(`${ADMIN}/products?msg=Status+updated`)
})

module.exports = router
