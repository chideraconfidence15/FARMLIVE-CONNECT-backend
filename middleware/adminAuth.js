import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import dotenv from 'dotenv'
import { User } from '../models/User.js'
import { isMongoConnected } from '../config/db.js'
import { readUsers } from '../services/storageService.js'

dotenv.config()

const tokenSecret = process.env.AUTH_TOKEN_SECRET || randomBytes(32).toString('hex')
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

function sign(value) {
  return createHmac('sha256', tokenSecret).update(value).digest('base64url')
}

export function createAccessToken(user) {
  const payload = encode({
    sub: user.id || user._id || user.$id,
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
  })
  const content = `v1.${payload}`
  return `${content}.${sign(content)}`
}

function verifyAccessToken(token) {
  const [version, payload, signature, extra] = token.split('.')
  if (version !== 'v1' || !payload || !signature || extra) return null

  const content = `${version}.${payload}`
  const expected = Buffer.from(sign(content))
  const actual = Buffer.from(signature)
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (!decoded.sub || !decoded.email || decoded.exp <= Math.floor(Date.now() / 1000)) return null
    return decoded
  } catch {
    return null
  }
}

async function loadAuthenticatedUser(req) {
  const authorization = req.headers.authorization || ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
  const claims = verifyAccessToken(token)
  if (!claims) return null

  const user = isMongoConnected()
    ? await User.findOne({ id: claims.sub, email: claims.email })
    : readUsers().find((entry) => entry.id === claims.sub && entry.email.toLowerCase() === claims.email.toLowerCase())

  if (!user) return null
  req.authUser = user
  return user
}

export async function requireAuthentication(req, res, next) {
  try {
    const user = await loadAuthenticatedUser(req)
    if (!user) return res.status(401).json({ error: 'Please sign in again to continue.' })
    return next()
  } catch (error) {
    return next(error)
  }
}

export async function requireAdmin(req, res, next) {
  try {
    const user = await loadAuthenticatedUser(req)
    if (!user) return res.status(401).json({ error: 'Please sign in again to continue.' })
    if (user.role !== 'admin') return res.status(403).json({ error: 'Administrator access is required.' })
    return next()
  } catch (error) {
    return next(error)
  }
}