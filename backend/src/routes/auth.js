import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query } from '../db.js'
import { authenticate } from '../middleware/auth.js'
import { logAuthEvent } from '../utils/logger.js'

const router = Router()

const buildCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 1000 * 60 * 60 * 2,
})

const signToken = (user) => jwt.sign(
  {
    username: user.username,
    role: user.role,
  },
  process.env.JWT_SECRET,
  {
    subject: String(user.id),
    expiresIn: process.env.JWT_EXPIRES_IN || '2h',
  },
)

const getClientInfo = (req) => {
  const forwarded = req.headers['x-forwarded-for']
  const ip = Array.isArray(forwarded)
    ? forwarded[0]
    : (forwarded || '').split(',')[0].trim()
  return {
    ip: ip || req.socket?.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
  }
}

router.post('/register', async (req, res) => {
  const { username, password, role } = req.body || {}
  const client = getClientInfo(req)

  if (!username || !password) {
    logAuthEvent('register_failed', { username, reason: 'missing_fields', ...client })
    return res.status(400).json({ message: 'username and password are required' })
  }

  const normalizedRole = role || 'viewer'
  if (!['admin', 'editor', 'viewer'].includes(normalizedRole)) {
    logAuthEvent('register_failed', { username, reason: 'invalid_role', role: normalizedRole, ...client })
    return res.status(400).json({ message: 'invalid role' })
  }

  try {
    const existing = await query('select id from users where username = ?', [username])
    if (existing.rowCount > 0) {
      logAuthEvent('register_failed', { username, reason: 'username_exists', ...client })
      return res.status(409).json({ message: 'username already exists' })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const insertResult = await query(
      'insert into users (username, password_hash, role) values (?, ?, ?)',
      [username, passwordHash, normalizedRole],
    )
    const userResult = await query(
      'select id, username, role, created_at from users where id = ?',
      [insertResult.lastInsertRowid],
    )
    const user = userResult.rows[0]
    logAuthEvent('register_success', { username: user.username, role: user.role, userId: user.id, ...client })
    return res.status(201).json({
      id: user.id,
      username: user.username,
      role: user.role,
      createdAt: user.created_at,
    })
  } catch (error) {
    logAuthEvent('register_error', { username, reason: 'exception', ...client })
    return res.status(500).json({ message: 'register failed' })
  }
})

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {}
  const client = getClientInfo(req)

  if (!username || !password) {
    logAuthEvent('login_failed', { username, reason: 'missing_fields', ...client })
    return res.status(400).json({ message: 'username and password are required' })
  }

  try {
    const result = await query(
      'select id, username, password_hash, role from users where username = ?',
      [username],
    )

    if (result.rowCount === 0) {
      logAuthEvent('login_failed', { username, reason: 'user_not_found', ...client })
      return res.status(401).json({ message: 'invalid credentials' })
    }

    const user = result.rows[0]
    const match = await bcrypt.compare(password, user.password_hash)
    if (!match) {
      logAuthEvent('login_failed', { username, reason: 'invalid_password', ...client })
      return res.status(401).json({ message: 'invalid credentials' })
    }

    const token = signToken(user)
    const cookieName = process.env.COOKIE_NAME || 'auth_token'
    const cookieOptions = buildCookieOptions()
    res.cookie(cookieName, token, cookieOptions)

    logAuthEvent('login_success', { username: user.username, role: user.role, userId: user.id, ...client })

    return res.status(200).json({
      id: user.id,
      username: user.username,
      role: user.role,
    })
  } catch (error) {
    logAuthEvent('login_error', { username, reason: 'exception', ...client })
    return res.status(500).json({ message: 'login failed' })
  }
})

router.post('/logout', (req, res) => {
  const cookieName = process.env.COOKIE_NAME || 'auth_token'
  res.clearCookie(cookieName, buildCookieOptions())
  const client = getClientInfo(req)
  const cookiePresent = Boolean(req.cookies?.[cookieName])
  logAuthEvent('logout', { cookiePresent, ...client })
  return res.status(200).json({ message: 'logged out' })
})

router.get('/me', authenticate, (req, res) => {
  return res.status(200).json({
    id: req.user.id,
    username: req.user.username,
    role: req.user.role,
  })
})

export default router
