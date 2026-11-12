module.exports = function requireAuth(req, res, next) {
  if (!req.session?.userId) {
    return res.redirect('/auth/login?next=' + encodeURIComponent(req.originalUrl))
  }
  next()
}
