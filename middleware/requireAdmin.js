const ADMIN_ROLES = ['SUPER_ADMIN', 'COMPLIANCE', 'SUPPORT', 'FINANCE']

module.exports = function requireAdmin(roles) {
  const allowed = roles || ADMIN_ROLES
  return function (req, res, next) {
    if (!req.session?.userId) return res.redirect('/auth/login')
    // Use DB-fresh role from global middleware; fall back to session for the first request
    const role = res.locals.sessionUser?.role || req.session.role
    if (!allowed.includes(role)) return res.redirect('/dashboard')
    // Keep session role in sync with DB
    if (req.session.role !== role) req.session.role = role
    next()
  }
}
