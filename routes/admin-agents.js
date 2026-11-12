const express = require('express')
const { v4: uuidv4 } = require('uuid')
const db = require('../db/database')
const requireAdmin = require('../middleware/requireAdmin')
const { uploaderFor, persistUploads, deleteUpload } = require('../lib/upload')

const router = express.Router()
router.use(requireAdmin())
const upload = uploaderFor('agents')
const agentFields = upload.fields([{ name: 'profile_image', maxCount: 1 }, { name: 'cover_image', maxCount: 1 }])

function withUpload(uploadMiddleware, redirectOn404) {
  return (req, res, next) => uploadMiddleware(req, res, (err) => {
    if (err) return res.redirect(redirectOn404 + '?err=' + encodeURIComponent(err.message))
    next()
  })
}

async function getPW() {
  try { const r = await db.prepare("SELECT COUNT(*) as c FROM withdrawals WHERE status='SUBMITTED'").get(); return r?.c || 0 } catch (_) { return 0 }
}

router.get('/', async (req, res) => {
  const { status = '', q = '' } = req.query
  let sql = 'SELECT * FROM agents WHERE 1=1'
  const params = []
  if (status) { sql += ' AND status = ?'; params.push(status) }
  if (q) { sql += ' AND name LIKE ?'; params.push(`%${q}%`) }
  sql += ' ORDER BY created_at DESC'
  const agents = await db.prepare(sql).all(...params)
  const withCounts = await Promise.all(agents.map(async a => {
    const r = await db.prepare("SELECT COUNT(*) as c FROM agent_assignments WHERE agent_id=? AND status='ACTIVE'").get(a.id)
    return { ...a, active_clients: r?.c || 0 }
  }))
  const user = await db.prepare('SELECT * FROM users WHERE id=?').get(req.session.userId)
  res.render('admin/agents/index', { user, path: '/admin/agents', flash: req.query.msg ? { success: req.query.msg } : req.query.err ? { error: req.query.err } : {}, agents: withCounts, filters: { status, q }, pendingWithdrawals: await getPW() })
})

router.get('/new', async (req, res) => {
  const user = await db.prepare('SELECT * FROM users WHERE id=?').get(req.session.userId)
  res.render('admin/agents/form', { user, path: '/admin/agents', flash: {}, agent: null, pendingWithdrawals: await getPW() })
})

router.post('/', withUpload(agentFields, '/admin/agents/new'), async (req, res) => {
  const { name, bio, avatar_initials, base_fee, fee_period, video_rate,
    ad_management_rate, expertise, niches, services, languages,
    is_verified, is_available, status } = req.body
  if (!name) return res.redirect('/admin/agents/new?err=Name+required')
  const id = uuidv4()

  const fbUrls = await persistUploads(req, 'agents')
  const profileImg = fbUrls['profile_image'] || (req.files?.profile_image?.[0] ? `/uploads/agents/${req.files.profile_image[0].filename}` : null)
  const coverImg = fbUrls['cover_image'] || (req.files?.cover_image?.[0] ? `/uploads/agents/${req.files.cover_image[0].filename}` : null)

  await db.prepare(`INSERT INTO agents
    (id,name,bio,avatar_initials,base_fee,fee_period,video_rate,ad_management_rate,
     expertise,niches,services,languages,is_verified,is_available,status,profile_image,cover_image)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, name, bio||'', (avatar_initials||name.substring(0,2)).toUpperCase(),
      base_fee||'0.00', fee_period||'MONTHLY', video_rate||'25.00', ad_management_rate||'50.00',
      expertise||'[]', niches||'[]', services||'[]', languages||'["English"]',
      is_verified ? 1 : 0, 1,
      status||'ACTIVE', profileImg, coverImg)
  res.redirect('/admin/agents?msg=Agent+added')
})

router.get('/:id/edit', async (req, res) => {
  const agent = await db.prepare('SELECT * FROM agents WHERE id=?').get(req.params.id)
  if (!agent) return res.redirect('/admin/agents?err=Not+found')
  const user = await db.prepare('SELECT * FROM users WHERE id=?').get(req.session.userId)
  res.render('admin/agents/form', { user, path: '/admin/agents', flash: {}, agent, pendingWithdrawals: await getPW() })
})

router.post('/:id', (req, res, next) => withUpload(agentFields, `/admin/agents/${req.params.id}/edit`)(req, res, next), async (req, res) => {
  const { name, bio, avatar_initials, base_fee, fee_period, video_rate,
    ad_management_rate, expertise, niches, services, languages,
    is_verified, is_available, status } = req.body
  if (!name) return res.redirect(`/admin/agents/${req.params.id}/edit?err=Name+required`)
  const existing = await db.prepare('SELECT * FROM agents WHERE id=?').get(req.params.id)
  let profileImg = existing?.profile_image || null
  let coverImg = existing?.cover_image || null

  const fbUrls = await persistUploads(req, 'agents')
  if (fbUrls['profile_image']) { await deleteUpload(profileImg); profileImg = fbUrls['profile_image'] }
  else if (req.files?.profile_image?.[0]) { await deleteUpload(profileImg); profileImg = `/uploads/agents/${req.files.profile_image[0].filename}` }
  if (fbUrls['cover_image']) { await deleteUpload(coverImg); coverImg = fbUrls['cover_image'] }
  else if (req.files?.cover_image?.[0]) { await deleteUpload(coverImg); coverImg = `/uploads/agents/${req.files.cover_image[0].filename}` }

  await db.prepare(`UPDATE agents SET name=?,bio=?,avatar_initials=?,base_fee=?,fee_period=?,
    video_rate=?,ad_management_rate=?,expertise=?,niches=?,services=?,languages=?,
    is_verified=?,is_available=?,status=?,profile_image=?,cover_image=?,updated_at=NOW() WHERE id=?`)
    .run(name, bio||'', (avatar_initials||name.substring(0,2)).toUpperCase(),
      base_fee||'0.00', fee_period||'MONTHLY', video_rate||'25.00', ad_management_rate||'50.00',
      expertise||'[]', niches||'[]', services||'[]', languages||'["English"]',
      is_verified ? 1 : 0, is_available ? 1 : 0,
      status||'ACTIVE', profileImg, coverImg, req.params.id)
  res.redirect('/admin/agents?msg=Agent+updated')
})

router.post('/:id/suspend', async (req, res) => {
  await db.prepare("UPDATE agents SET status='SUSPENDED',updated_at=NOW() WHERE id=?").run(req.params.id)
  res.redirect('/admin/agents?msg=Agent+suspended')
})
router.post('/:id/activate', async (req, res) => {
  await db.prepare("UPDATE agents SET status='ACTIVE',updated_at=NOW() WHERE id=?").run(req.params.id)
  res.redirect('/admin/agents?msg=Agent+activated')
})

router.post('/:id/delete', async (req, res) => {
  await db.prepare('DELETE FROM agents WHERE id=?').run(req.params.id)
  res.redirect('/admin/agents?msg=Agent+removed')
})

module.exports = router
