require('dotenv').config()
const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
})

async function sendEmail({ to, subject, html }) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.log(`[EMAIL SKIPPED] To: ${to} | Subject: ${subject}`)
    return
  }
  try {
    await transporter.sendMail({ from: process.env.SMTP_FROM, to, subject, html })
  } catch (e) {
    console.error('Email send error:', e.message)
  }
}

function verifyEmailHtml(name, link) {
  return `
    <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:32px">
      <h1 style="font-family:Georgia,serif;color:#0F0E0C">Verify your email</h1>
      <p style="color:#4A4740">Hello ${name || 'there'},</p>
      <p style="color:#4A4740">Click the button below to verify your AutoPips account.</p>
      <a href="${link}" style="display:inline-block;padding:14px 28px;background:#B08D3C;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
        Verify Email
      </a>
      <p style="color:#8A877E;font-size:13px">Link expires in 24 hours. If you did not create an account, ignore this email.</p>
    </div>`
}

function passwordResetHtml(name, link) {
  return `
    <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:32px">
      <h1 style="font-family:Georgia,serif;color:#0F0E0C">Reset your password</h1>
      <p style="color:#4A4740">Hello ${name || 'there'},</p>
      <a href="${link}" style="display:inline-block;padding:14px 28px;background:#B08D3C;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
        Reset Password
      </a>
      <p style="color:#8A877E;font-size:13px">Link expires in 1 hour. If you did not request this, ignore this email.</p>
    </div>`
}

module.exports = { sendEmail, verifyEmailHtml, passwordResetHtml }
