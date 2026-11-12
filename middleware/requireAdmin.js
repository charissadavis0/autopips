const ADMIN_ROLES = ['SUPER_ADMIN', 'COMPLIANCE', 'SUPPORT', 'FINANCE']

module.exports = function requireAdmin(roles) {
  const allowed = roles || ADMIN_ROLES
  return function (req, res, next) {
    if (!req.session?.userId) return res.redirect('/auth/login')
    if (!allowed.includes(req.session.role)) return res.redirect('/dashboard')
    next()
  }
}
