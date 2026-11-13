const express = require('express')
const db = require('../db/database')
const router = express.Router()

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.redirect('/auth/login')
  next()
}

router.get('/', requireAuth, async (req, res) => {
  const { q = '', niche = '' } = req.query
  let sql = "SELECT * FROM experts WHERE status='PUBLISHED'"
  const params = []
  if (q) { sql += ' AND name LIKE ?'; params.push(`%${q}%`) }
  sql += ' ORDER BY is_verified DESC, years_experience DESC'
  const experts = await db.prepare(sql).all(...params)
  const user = await db.prepare('SELECT * FROM users WHERE id=?').get(req.session.userId)
  res.render('experts/index', { user, path: '/experts', experts, filters: { q, niche }, title: 'Expert Advisors', metaDesc: 'Connect with verified dropshipping experts on AutoPips — get personalized strategy, mentorship, and insider tips to scale your store faster.' })
})

router.get('/:id', requireAuth, async (req, res) => {
  const expert = await db.prepare("SELECT * FROM experts WHERE id=? AND status='PUBLISHED'").get(req.params.id)
  if (!expert) return res.redirect('/experts')
  const user = await db.prepare('SELECT * FROM users WHERE id=?').get(req.session.userId)
  res.render('experts/detail', { user, path: '/experts', expert, title: expert.name, metaDesc: `${expert.name} is a verified dropshipping expert on AutoPips — specializing in ${expert.niche || 'e-commerce'} with ${expert.years_experience || 'years of'} experience.` })
})

module.exports = router
