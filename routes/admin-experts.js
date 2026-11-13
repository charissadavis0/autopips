const express = require('express')
const { v4: uuidv4 } = require('uuid')
const db = require('../db/database')
const requireAdmin = require('../middleware/requireAdmin')
const { uploaderFor, persistUploads, deleteUpload } = require('../lib/upload')

const router = express.Router()
router.use(requireAdmin())

function withUpload(uploadMiddleware, redirectOn404) {
  return (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
      if (err) return res.redirect(redirectOn404 + '?err=' + encodeURIComponent(err.message))
      next()
    })
  }
}

const upload = uploaderFor('experts')
const expertFields = upload.fields([
  { name: 'profile_image', maxCount: 1 },
  { name: 'cover_image', maxCount: 1 },
  { name: 'gallery_images', maxCount: 10 },
])

async function getPW() {
  try { const r = await db.prepare("SELECT COUNT(*) as c FROM withdrawals WHERE status IN ('SUBMITTED','PENDING')").get(); return r?.c || 0 } catch (_) { return 0 }
}

router.get('/', async (req, res) => {
  const { status = '', q = '' } = req.query
  let sql = 'SELECT * FROM experts WHERE 1=1'
  const params = []
  if (status) { sql += ' AND status = ?'; params.push(status) }
  if (q) { sql += ' AND name LIKE ?'; params.push(`%${q}%`) }
  sql += ' ORDER BY created_at DESC'
  const experts = await db.prepare(sql).all(...params)
  const user = await db.prepare('SELECT * FROM users WHERE id=?').get(req.session.userId)
  const flash = req.query.msg ? { success: req.query.msg } : req.query.err ? { error: req.query.err } : {}
  res.render('admin/experts/index', { user, path: '/admin/experts', flash, experts, filters: { status, q }, pendingWithdrawals: await getPW() })
})

router.get('/new', async (req, res) => {
  const user = await db.prepare('SELECT * FROM users WHERE id=?').get(req.session.userId)
  const flash = req.query.err ? { error: req.query.err } : {}
  res.render('admin/experts/form', { user, path: '/admin/experts', flash, expert: null, pendingWithdrawals: await getPW() })
})

router.post('/', withUpload(expertFields, '/admin/experts/new'), async (req, res) => {
  const { name, bio, country, years_experience, areas_of_expertise, target_markets,
    case_studies, verification_note, is_verified, status } = req.body
  if (!name) return res.redirect(`${ADMIN}/experts/new?err=Name+required`)

  const id = uuidv4()
  const fbUrls = await persistUploads(req, 'experts')

  const profileImg = fbUrls['profile_image'] || (req.files?.profile_image?.[0] ? `/uploads/experts/${req.files.profile_image[0].filename}` : null)
  const coverImg = fbUrls['cover_image'] || (req.files?.cover_image?.[0] ? `/uploads/experts/${req.files.cover_image[0].filename}` : null)
  const galleryFiles = req.files?.gallery_images || []
  const galleryFb = fbUrls['gallery_images'] ? (Array.isArray(fbUrls['gallery_images']) ? fbUrls['gallery_images'] : [fbUrls['gallery_images']]) : []
  const gallery = JSON.stringify(galleryFb.length ? galleryFb : galleryFiles.map(f => `/uploads/experts/${f.filename}`))

  await db.prepare(`INSERT INTO experts
    (id,name,bio,country,years_experience,profile_image,cover_image,gallery,
     areas_of_expertise,target_markets,case_studies,is_verified,verification_note,status,created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, name, bio||'', country||'', parseInt(years_experience)||0,
      profileImg, coverImg, gallery,
      areas_of_expertise||'[]', target_markets||'[]', case_studies||'',
      is_verified ? 1 : 0, verification_note||'', status||'DRAFT', req.session.userId)
  res.redirect(`${ADMIN}/experts?msg=Expert+created`)
})

router.get('/:id/edit', async (req, res) => {
  const expert = await db.prepare('SELECT * FROM experts WHERE id=?').get(req.params.id)
  if (!expert) return res.redirect(`${ADMIN}/experts?err=Not+found`)
  const user = await db.prepare('SELECT * FROM users WHERE id=?').get(req.session.userId)
  const flash = req.query.err ? { error: req.query.err } : req.query.msg ? { success: req.query.msg } : {}
  res.render('admin/experts/form', { user, path: '/admin/experts', flash, expert, pendingWithdrawals: await getPW() })
})

router.post('/:id/update', (req, res, next) => withUpload(expertFields, `/admin/experts/${req.params.id}/edit`)(req, res, next), async (req, res) => {
  const existing = await db.prepare('SELECT * FROM experts WHERE id=?').get(req.params.id)
  if (!existing) return res.redirect(`${ADMIN}/experts`)
  const { name, bio, country, years_experience, areas_of_expertise, target_markets,
    case_studies, verification_note, is_verified, status, remove_gallery } = req.body

  const fbUrls = await persistUploads(req, 'experts')

  let profileImg = existing.profile_image
  if (fbUrls['profile_image']) { await deleteUpload(profileImg); profileImg = fbUrls['profile_image'] }
  else if (req.files?.profile_image?.[0]) { await deleteUpload(profileImg); profileImg = `/uploads/experts/${req.files.profile_image[0].filename}` }

  let coverImg = existing.cover_image
  if (fbUrls['cover_image']) { await deleteUpload(coverImg); coverImg = fbUrls['cover_image'] }
  else if (req.files?.cover_image?.[0]) { await deleteUpload(coverImg); coverImg = `/uploads/experts/${req.files.cover_image[0].filename}` }

  let gallery = []
  try { gallery = JSON.parse(existing.gallery || '[]') } catch (_) {}
  const toRemove = Array.isArray(remove_gallery) ? remove_gallery : (remove_gallery ? [remove_gallery] : [])
  for (const p of toRemove) { await deleteUpload(p); gallery = gallery.filter(g => g !== p) }
  const galleryFb = fbUrls['gallery_images'] ? (Array.isArray(fbUrls['gallery_images']) ? fbUrls['gallery_images'] : [fbUrls['gallery_images']]) : []
  const newFiles = req.files?.gallery_images || []
  galleryFb.length ? galleryFb.forEach(u => gallery.push(u)) : newFiles.forEach(f => gallery.push(`/uploads/experts/${f.filename}`))

  await db.prepare(`UPDATE experts SET name=?,bio=?,country=?,years_experience=?,profile_image=?,cover_image=?,gallery=?,
    areas_of_expertise=?,target_markets=?,case_studies=?,is_verified=?,verification_note=?,status=?,updated_at=NOW() WHERE id=?`)
    .run(name, bio||'', country||'', parseInt(years_experience)||0,
      profileImg, coverImg, JSON.stringify(gallery),
      areas_of_expertise||'[]', target_markets||'[]', case_studies||'',
      is_verified ? 1 : 0, verification_note||'', status||'DRAFT', req.params.id)
  res.redirect(`${ADMIN}/experts?msg=Expert+updated`)
})

router.post('/:id/delete-image', async (req, res) => {
  const { field } = req.body
  const expert = await db.prepare('SELECT * FROM experts WHERE id=?').get(req.params.id)
  if (expert && (field === 'profile_image' || field === 'cover_image')) {
    await deleteUpload(expert[field])
    await db.prepare(`UPDATE experts SET ${field}=NULL,updated_at=NOW() WHERE id=?`).run(req.params.id)
  }
  res.redirect(`/admin/experts/${req.params.id}/edit?msg=Image+removed`)
})

router.post('/:id/delete', async (req, res) => {
  const expert = await db.prepare('SELECT * FROM experts WHERE id=?').get(req.params.id)
  if (expert) {
    await deleteUpload(expert.profile_image)
    await deleteUpload(expert.cover_image)
    try { const g = JSON.parse(expert.gallery||'[]'); for (const img of g) await deleteUpload(img) } catch (_) {}
    await db.prepare('DELETE FROM experts WHERE id=?').run(req.params.id)
  }
  res.redirect(`${ADMIN}/experts?msg=Expert+removed`)
})

module.exports = router
