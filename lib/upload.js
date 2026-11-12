const multer = require('multer')
const path = require('path')
const fs = require('fs')

const ALLOWED = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg']
const MAX_SIZE = 8 * 1024 * 1024 // 8MB

const useBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase()
  if (ALLOWED.includes(ext)) return cb(null, true)
  cb(new Error('Only JPG, PNG, WebP, GIF and SVG images are allowed'))
}

function uploaderFor(type) {
  if (useBlob()) {
    return multer({ storage: multer.memoryStorage(), fileFilter, limits: { fileSize: MAX_SIZE } })
  }
  // Local disk fallback (development)
  const dest = path.join(__dirname, '..', 'public', 'uploads', type)
  fs.mkdirSync(dest, { recursive: true })
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, dest),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase()
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
    }
  })
  return multer({ storage, fileFilter, limits: { fileSize: MAX_SIZE } })
}

async function persistUploads(req, type) {
  const result = {}
  if (!useBlob()) return result // disk mode: paths already written

  const { put } = require('@vercel/blob')
  const files = req.files || (req.file ? { [req.file.fieldname]: [req.file] } : {})

  for (const [fieldname, fileArr] of Object.entries(files)) {
    const list = Array.isArray(fileArr) ? fileArr : [fileArr]
    const urls = []
    for (const f of list) {
      if (!f.buffer) { urls.push(f.path); continue }
      const ext = path.extname(f.originalname).toLowerCase() || '.jpg'
      const filename = `uploads/${type}/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
      const blob = await put(filename, f.buffer, {
        access: 'public',
        contentType: f.mimetype || 'image/jpeg',
        token: process.env.BLOB_READ_WRITE_TOKEN,
      })
      urls.push(blob.url)
    }
    result[fieldname] = urls.length === 1 ? urls[0] : urls
  }
  return result
}

async function deleteUpload(urlOrPath) {
  if (!urlOrPath) return
  if (useBlob() && urlOrPath.startsWith('https://')) {
    try {
      const { del } = require('@vercel/blob')
      await del(urlOrPath, { token: process.env.BLOB_READ_WRITE_TOKEN })
    } catch (_) {}
    return
  }
  try {
    const abs = path.join(__dirname, '..', 'public', urlOrPath)
    if (fs.existsSync(abs)) fs.unlinkSync(abs)
  } catch (_) {}
}

function publicUrl(type, filename) {
  if (!filename) return null
  if (filename.startsWith('http')) return filename
  if (filename.startsWith('/')) return filename
  return `/uploads/${type}/${filename}`
}

module.exports = { uploaderFor, persistUploads, deleteUpload, publicUrl, useBlob }
