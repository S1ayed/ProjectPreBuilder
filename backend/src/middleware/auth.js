import jwt from 'jsonwebtoken'

export const authenticate = (req, res, next) => {
  const cookieName = process.env.COOKIE_NAME || 'auth_token'
  const token = req.cookies?.[cookieName]

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.user = {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
    }
    return next()
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' })
  }
}

export const requireRole = (allowedRoles = []) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden' })
  }

  return next()
}
