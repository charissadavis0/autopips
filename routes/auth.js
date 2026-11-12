const express = require('express')
const bcrypt = require('bcryptjs')
const { v4: uuidv4 } = require('uuid')
const rateLimit = require('express-rate-limit')
const db = require('../db/database')
const { sendEmail, verifyEmailHtml, passwordResetHtml } = require('../lib/email')

const router = express.Router()

const loginLimiter = rateLimit({ windowMs: 60000, max: 10, standardHeaders: true, legacyHeaders: false })
const signupLimiter = rateLimit({ windowMs: 60000, max: 5 })

router.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/dashboard')
  res.render('auth/login', { flash: req.flash?.() || {}, email: '' })
})

router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body
  const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email?.trim().toLowerCase())
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.render('auth/login', { flash: { error: 'Invalid email or password.' }, email })
  }
  if (!user.email_verified) {
    return res.render('auth/login', { flash: { error: 'Please verify your email before signing in.' }, email })
  }
  if (user.suspended) {
    return res.render('auth/login', { flash: { error: 'This account has been suspended.' }, email })
  }
  if (user.frozen) {
    return res.render('auth/login', { flash: { error: 'This account is currently frozen. Contact support.' }, email })
  }
  req.session.userId = user.id
  req.session.role = user.role
  req.session.email = user.email
  const next = req.query.next || (user.role !== 'USER' ? '/admin' : '/dashboard')
  res.redirect(next)
})

router.get('/signup', (req, res) => {
  if (req.session.userId) return res.redirect('/dashboard')
  res.render('auth/signup', { flash: {}, name: '', email: '' })
})

router.post('/signup', signupLimiter, async (req, res) => {
  const { name, email, password } = req.body
  const cleanEmail = email?.trim().toLowerCase()
  if (!name || !cleanEmail || !password || password.length < 8) {
    return res.render('auth/signup', { flash: { error: 'All fields required. Password must be 8+ characters.' }, name, email })
  }
  const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail)
  if (existing) {
    return res.render('auth/signup', { flash: { success: 'Check your email for a verification link.' }, name: '', email: '' })
  }
  const hash = bcrypt.hashSync(password, 12)
  const userId = uuidv4()
  await db.prepare('INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)').run(userId, cleanEmail, name.trim(), hash)

  const smtpConfigured = !!(process.env.SMTP_USER && process.env.SMTP_PASS)

  if (smtpConfigured) {
    const token = uuidv4()
    const expires = new Date(Date.now() + 24 * 3600 * 1000).toISOString()
    await db.prepare('INSERT INTO email_tokens (id, user_id, token, type, expires_at) VALUES (?, ?, ?, ?, ?)')
      .run(uuidv4(), userId, token, 'EMAIL_VERIFY', expires)
    const link = `${process.env.APP_URL}/auth/verify-email?token=${token}`
    await sendEmail({ to: cleanEmail, subject: 'Verify your AutoPips email', html: verifyEmailHtml(name, link) })
    res.render('auth/signup', { flash: { success: 'Account created! Check your email to verify.' }, name: '', email: '' })
  } else {
    // No SMTP configured — auto-verify so users can sign in immediately
    await db.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').run(userId)
    res.render('auth/signup', { flash: { success: 'Account created! You can now sign in.' }, name: '', email: '' })
  }
})

router.get('/verify-email', async (req, res) => {
  const { token } = req.query
  const row = await db.prepare('SELECT * FROM email_tokens WHERE token = ? AND type = ?').get(token, 'EMAIL_VERIFY')
  if (!row || new Date(row.expires_at) < new Date()) {
    return res.render('auth/login', { flash: { error: 'Verification link is invalid or expired.' }, email: '' })
  }
  await db.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').run(row.user_id)
  await db.prepare('DELETE FROM email_tokens WHERE id = ?').run(row.id)
  res.render('auth/login', { flash: { success: 'Email verified! You can now sign in.' }, email: '' })
})

router.get('/forgot-password', (req, res) => {
  res.render('auth/forgot-password', { flash: {} })
})

router.post('/forgot-password', async (req, res) => {
  const email = req.body.email?.trim().toLowerCase()
  const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  if (user) {
    const token = uuidv4()
    const expires = new Date(Date.now() + 3600 * 1000).toISOString()
    await db.prepare('DELETE FROM email_tokens WHERE user_id = ? AND type = ?').run(user.id, 'PASSWORD_RESET')
    await db.prepare('INSERT INTO email_tokens (id, user_id, token, type, expires_at) VALUES (?, ?, ?, ?, ?)')
      .run(uuidv4(), user.id, token, 'PASSWORD_RESET', expires)
    const link = `${process.env.APP_URL}/auth/reset-password?token=${token}`
    await sendEmail({ to: email, subject: 'Reset your AutoPips password', html: passwordResetHtml(user.name, link) })
  }
  res.render('auth/forgot-password', { flash: { success: 'If that email exists, a reset link has been sent.' } })
})

router.get('/reset-password', async (req, res) => {
  const { token } = req.query
  const row = await db.prepare('SELECT * FROM email_tokens WHERE token = ? AND type = ?').get(token, 'PASSWORD_RESET')
  if (!row || new Date(row.expires_at) < new Date()) {
    return res.render('auth/login', { flash: { error: 'Reset link is invalid or expired.' }, email: '' })
  }
  res.render('auth/reset-password', { flash: {}, token })
})

router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body
  const row = await db.prepare('SELECT * FROM email_tokens WHERE token = ? AND type = ?').get(token, 'PASSWORD_RESET')
  if (!row || new Date(row.expires_at) < new Date() || !password || password.length < 8) {
    return res.render('auth/reset-password', { flash: { error: 'Invalid or expired link, or password too short.' }, token })
  }
  const hash = bcrypt.hashSync(password, 12)
  await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, row.user_id)
  await db.prepare('DELETE FROM email_tokens WHERE id = ?').run(row.id)
  res.render('auth/login', { flash: { success: 'Password reset. Sign in with your new password.' }, email: '' })
})

router.get('/logout', (req, res) => {
  req.session = null
  res.redirect('/')
})

module.exports = router
