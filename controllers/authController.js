import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import { OAuth2Client } from 'google-auth-library'
import { User } from '../models/User.js'
import { isMongoConnected } from '../config/db.js'
import { readUsers, writeUsers } from '../services/storageService.js'
import { isBrevoConfigured, sendSignupOtpEmail, sendPasswordResetOtpEmail, sendWelcomeEmail } from '../services/emailService.js'
import { createAccessToken, isAuthTokenConfigured } from '../middleware/adminAuth.js'

const pendingSignups = new Map()
const OTP_TTL_MS = 10 * 60 * 1000
const OTP_RESEND_MS = 60 * 1000
const OTP_MAX_ATTEMPTS = 5
const PASSWORD_RESET_TTL_MS = 10 * 60 * 1000
const PASSWORD_RESET_MAX_ATTEMPTS = 5

function formatUser(u) {
  if (!u) return null
  const {
    password,
    passwordResetCodeHash,
    passwordResetExpiresAt,
    passwordResetAttempts,
    ...safeUser
  } = u
  const id = u.id || u._id || u.$id
  const name = u.name || `${u.firstname || ''} ${u.lastname || ''}`.trim() || 'User'
  return {
    ...safeUser,
    id,
    $id: id,
    _id: id,
    name,
    firstname: u.firstname || name.split(' ')[0] || '',
    lastname: u.lastname || name.split(' ').slice(1).join(' ') || '',
    emailVerification: u.emailVerification !== undefined ? u.emailVerification : true
  }
}

function hashOtp(code) {
  return createHash('sha256').update(code).digest()
}

async function findUserByEmail(email) {
  if (isMongoConnected()) return User.findOne({ email })
  return readUsers().find((user) => user.email.toLowerCase() === email) || null
}

async function saveVerifiedSignup(signup) {
  if (isMongoConnected()) {
    const createdUser = await User.create({ ...signup, emailVerification: true })
    const users = readUsers()
    users.push(createdUser.toJSON())
    writeUsers(users)
    return formatUser(createdUser.toJSON())
  }

  const user = { ...signup, emailVerification: true, createdAt: new Date().toISOString() }
  const users = readUsers()
  users.push(user)
  writeUsers(users)
  return formatUser(user)
}

async function sendSignupCode(signup) {
  if (!isBrevoConfigured()) {
    return { error: 'Email verification is unavailable until Brevo is configured.' }
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  const delivery = await sendSignupOtpEmail(signup.email, signup.name, code)
  if (!delivery.success || delivery.simulated) {
    return { error: 'We could not send your verification code. Please try again later.' }
  }

  pendingSignups.set(signup.email, {
    signup,
    codeHash: hashOtp(code),
    expiresAt: Date.now() + OTP_TTL_MS,
    nextResendAt: Date.now() + OTP_RESEND_MS,
    attempts: 0
  })
  return { success: true }
}

/**
 * POST /api/auth/register
 */
export async function register(req, res, next) {
  try {
    const { name, firstname, lastname, email, password, role } = req.body
    const finalName = name || `${firstname || ''} ${lastname || ''}`.trim()

    if (!finalName || !email || !password) {
      return res.status(400).json({ error: 'Name, email address, and password are required.' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const safeRole = role === 'farmer' ? 'farmer' : 'customer'
    const pendingSignup = pendingSignups.get(normalizedEmail)
    if (pendingSignup && Date.now() < pendingSignup.nextResendAt) {
      return res.status(429).json({ error: 'A verification code was just sent. Please check your email.' })
    }
    const newUserId = `user-${Date.now().toString(36)}-${Math.floor(100 + Math.random() * 900)}`
    if (await findUserByEmail(normalizedEmail)) {
      return res.status(400).json({ error: 'An account with this email address already exists. Please sign in.' })
    }

    const signup = {
      id: newUserId,
      name: finalName,
      firstname: firstname || finalName.split(' ')[0],
      lastname: lastname || finalName.split(' ').slice(1).join(' '),
      email: normalizedEmail,
      password: password.trim(),
      role: safeRole,
      emailVerification: false
    }

    const result = await sendSignupCode(signup)
    if (result.error) return res.status(503).json({ error: result.error })

    return res.status(202).json({
      success: true,
      message: 'A verification code has been sent to your email.',
      email: normalizedEmail
    })
  } catch (err) {
    next(err)
  }
}

export async function verifySignup(req, res, next) {
  try {
    if (!isAuthTokenConfigured()) {
      return res.status(503).json({ error: 'Authentication is unavailable. Configure AUTH_TOKEN_SECRET in the backend deployment.' })
    }
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : ''
    const pending = pendingSignups.get(email)

    if (!pending) return res.status(400).json({ error: 'Your signup code has expired. Please sign up again.' })
    if (Date.now() > pending.expiresAt) {
      pendingSignups.delete(email)
      return res.status(400).json({ error: 'Your signup code has expired. Please sign up again.' })
    }
    if (!/^\d{6}$/.test(code)) return res.status(400).json({ error: 'Enter the six-digit verification code.' })
    if (pending.attempts >= OTP_MAX_ATTEMPTS) {
      pendingSignups.delete(email)
      return res.status(429).json({ error: 'Too many incorrect codes. Please sign up again.' })
    }

    pending.attempts += 1
    if (!timingSafeEqual(pending.codeHash, hashOtp(code))) {
      return res.status(400).json({ error: 'That verification code is incorrect.' })
    }

    if (await findUserByEmail(email)) {
      pendingSignups.delete(email)
      return res.status(409).json({ error: 'An account with this email already exists. Please sign in.' })
    }

    const user = await saveVerifiedSignup(pending.signup)
    pendingSignups.delete(email)
    sendWelcomeEmail(user).catch((err) => console.warn('Welcome email error:', err.message || err))
    return res.status(200).json({ success: true, message: 'Email verified.', user, token: createAccessToken(user) })
  } catch (err) {
    next(err)
  }
}

export async function resendSignupCode(req, res, next) {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
    const pending = pendingSignups.get(email)
    if (!pending || Date.now() > pending.expiresAt) {
      pendingSignups.delete(email)
      return res.status(400).json({ error: 'Your signup has expired. Please sign up again.' })
    }
    if (Date.now() < pending.nextResendAt) {
      return res.status(429).json({ error: 'Please wait before requesting another code.' })
    }

    const result = await sendSignupCode(pending.signup)
    if (result.error) return res.status(503).json({ error: result.error })
    return res.status(200).json({ success: true, message: 'A new verification code has been sent.' })
  } catch (err) {
    next(err)
  }
}

export async function requestPasswordReset(req, res, next) {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Enter a valid email address.' })
    }
    if (!isBrevoConfigured()) {
      return res.status(503).json({ error: 'Password recovery email is currently unavailable. Please try again later.' })
    }

    const user = await findUserByEmail(email)
    const response = { success: true, message: 'If an account exists for that email, a reset code has been sent.' }
    if (!user) return res.status(200).json(response)

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
    const codeHash = hashOtp(code).toString('hex')
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS)

    if (isMongoConnected()) {
      await User.updateOne({ email }, {
        $set: {
          passwordResetCodeHash: codeHash,
          passwordResetExpiresAt: expiresAt,
          passwordResetAttempts: 0
        }
      })
    } else {
      const users = readUsers().map((entry) => entry.email.toLowerCase() === email
        ? { ...entry, passwordResetCodeHash: codeHash, passwordResetExpiresAt: expiresAt.toISOString(), passwordResetAttempts: 0 }
        : entry)
      writeUsers(users)
    }

    const delivery = await sendPasswordResetOtpEmail(email, user.name, code)
    if (!delivery.success || delivery.simulated) {
      if (isMongoConnected()) {
        await User.updateOne({ email, passwordResetCodeHash: codeHash }, {
          $unset: { passwordResetCodeHash: 1, passwordResetExpiresAt: 1, passwordResetAttempts: 1 }
        })
      } else {
        const users = readUsers().map((entry) => {
          if (entry.email.toLowerCase() !== email) return entry
          const { passwordResetCodeHash, passwordResetExpiresAt, passwordResetAttempts, ...safeEntry } = entry
          return safeEntry
        })
        writeUsers(users)
      }
      return res.status(503).json({ error: 'Could not send the reset code. Please try again later.' })
    }

    return res.status(200).json(response)
  } catch (err) {
    next(err)
  }
}

export async function confirmPasswordReset(req, res, next) {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : ''
    const password = typeof req.body?.password === 'string' ? req.body.password.trim() : ''
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Enter a valid email address.' })
    }
    if (!/^\d{6}$/.test(code)) return res.status(400).json({ error: 'Enter the six-digit reset code.' })
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters long.' })

    const codeHash = hashOtp(code).toString('hex')
    if (isMongoConnected()) {
      const user = await User.findOne({ email }).select('+passwordResetCodeHash +passwordResetExpiresAt +passwordResetAttempts')
      if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt.getTime() < Date.now() || user.passwordResetAttempts >= PASSWORD_RESET_MAX_ATTEMPTS) {
        return res.status(400).json({ error: 'That reset code is invalid or expired. Request a new one.' })
      }
      if (!timingSafeEqual(Buffer.from(user.passwordResetCodeHash, 'hex'), Buffer.from(codeHash, 'hex'))) {
        await User.updateOne({ _id: user._id, passwordResetAttempts: { $lt: PASSWORD_RESET_MAX_ATTEMPTS } }, { $inc: { passwordResetAttempts: 1 } })
        return res.status(400).json({ error: 'That reset code is invalid or expired. Request a new one.' })
      }

      const update = await User.updateOne({
        _id: user._id,
        passwordResetCodeHash: codeHash,
        passwordResetExpiresAt: { $gt: new Date() },
        passwordResetAttempts: { $lt: PASSWORD_RESET_MAX_ATTEMPTS }
      }, {
        $set: { password },
        $unset: { passwordResetCodeHash: 1, passwordResetExpiresAt: 1, passwordResetAttempts: 1 }
      })
      if (update.modifiedCount !== 1) return res.status(400).json({ error: 'That reset code is invalid or expired. Request a new one.' })
    } else {
      const users = readUsers()
      const user = users.find((entry) => entry.email.toLowerCase() === email)
      if (!user || !user.passwordResetCodeHash || !user.passwordResetExpiresAt || new Date(user.passwordResetExpiresAt).getTime() < Date.now() || user.passwordResetAttempts >= PASSWORD_RESET_MAX_ATTEMPTS) {
        return res.status(400).json({ error: 'That reset code is invalid or expired. Request a new one.' })
      }
      if (!timingSafeEqual(Buffer.from(user.passwordResetCodeHash, 'hex'), Buffer.from(codeHash, 'hex'))) {
        user.passwordResetAttempts = (user.passwordResetAttempts || 0) + 1
        writeUsers(users)
        return res.status(400).json({ error: 'That reset code is invalid or expired. Request a new one.' })
      }
      user.password = password
      delete user.passwordResetCodeHash
      delete user.passwordResetExpiresAt
      delete user.passwordResetAttempts
      writeUsers(users)
    }

    return res.status(200).json({ success: true, message: 'Password reset successfully. You can now sign in.' })
  } catch (err) {
    next(err)
  }
}

export async function loginWithGoogle(req, res, next) {
  if (!isAuthTokenConfigured()) {
    return res.status(503).json({ error: 'Authentication is unavailable. Configure AUTH_TOKEN_SECRET in the backend deployment.' })
  }
  const clientId = process.env.GOOGLE_CLIENT_ID
  const credential = typeof req.body?.credential === 'string' ? req.body.credential : ''
  if (!clientId) return res.status(503).json({ error: 'Google sign-in is not configured on the server.' })
  if (!credential) return res.status(400).json({ error: 'Google did not provide a sign-in credential.' })

  try {
    const client = new OAuth2Client(clientId)
    let payload
    try {
      const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId })
      payload = ticket.getPayload()
    } catch {
      return res.status(401).json({ error: 'Google sign-in could not verify your credential. Please try again.' })
    }

    if (!payload?.email || payload.email_verified !== true) {
      return res.status(401).json({ error: 'Google must verify your email address before you can sign in.' })
    }

    const email = payload.email.trim().toLowerCase()
    let existingUser = await findUserByEmail(email)
    if (existingUser) {
      if (isMongoConnected() && !existingUser.emailVerification) {
        existingUser.emailVerification = true
        await existingUser.save()
      } else if (!isMongoConnected() && !existingUser.emailVerification) {
        const users = readUsers().map((user) => user.email.toLowerCase() === email
          ? { ...user, emailVerification: true }
          : user)
        writeUsers(users)
        existingUser = users.find((user) => user.email.toLowerCase() === email)
      }
      const user = formatUser(existingUser.toJSON ? existingUser.toJSON() : existingUser)
      return res.status(200).json({ success: true, user, token: createAccessToken(user) })
    }

    const name = payload.name || email.split('@')[0]
    const [firstname, ...lastNameParts] = name.split(' ')
    const googleUser = {
      id: `google-${randomBytes(12).toString('hex')}`,
      name,
      firstname,
      lastname: lastNameParts.join(' '),
      email,
      password: randomBytes(32).toString('hex'),
      role: 'customer',
      emailVerification: true
    }

    let user
    if (isMongoConnected()) {
      const createdUser = await User.create(googleUser)
      user = formatUser(createdUser.toJSON())
    } else {
      const users = readUsers()
      users.push(googleUser)
      writeUsers(users)
      user = formatUser(googleUser)
    }
    sendWelcomeEmail(user).catch((error) => console.warn('Welcome email error:', error.message || error))
    return res.status(200).json({ success: true, user, token: createAccessToken(user) })
  } catch (error) {
    next(error)
  }
}

/**
 * POST /api/auth/login
 */
export async function login(req, res, next) {
  try {
    if (!isAuthTokenConfigured()) {
      return res.status(503).json({ error: 'Authentication is unavailable. Configure AUTH_TOKEN_SECRET in the backend deployment.' })
    }
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required to sign in.' })
    }

    const normalizedEmail = email.trim().toLowerCase()

    let user = null
    if (isMongoConnected()) {
      user = await User.findOne({ email: normalizedEmail })
      if (!user) {
        return res.status(401).json({
          error: 'No account found with this email. You must create an account first before signing in.'
        })
      }

      if (user.password !== password.trim()) {
        return res.status(401).json({
          error: 'Incorrect password. Please verify your password and try again.'
        })
      }

      return res.status(200).json({
        success: true,
        message: 'Welcome back! Authentication successful.',
        user: formatUser(user.toJSON()),
        token: createAccessToken(user)
      })
    }

    // Fallback: Local JSON persistence
    const users = readUsers()
    user = users.find((u) => u.email.toLowerCase() === normalizedEmail)
    if (!user) {
      return res.status(401).json({
        error: 'No account found with this email. You must create an account first before signing in.'
      })
    }

    if (user.password !== password.trim()) {
      return res.status(401).json({
        error: 'Incorrect password. Please verify your password and try again.'
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Welcome back! Authentication successful.',
      user: formatUser(user),
      token: createAccessToken(user)
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/auth/me
 */
export async function getMe(req, res, next) {
  try {
    return res.status(200).json(formatUser(req.authUser.toJSON ? req.authUser.toJSON() : req.authUser))
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/auth/logout
 */
export async function logout(req, res) {
  return res.status(200).json({ success: true, message: 'Logged out successfully' })
}

/**
 * POST /api/auth/verify
 */
export async function verifyEmail(req, res) {
  return res.status(200).json({ success: true, message: 'Email verified successfully' })
}

/**
 * POST /api/auth/resend-verification
 */
export async function resendVerification(req, res) {
  return res.status(200).json({ success: true, message: 'Verification email resent successfully' })
}

/**
 * GET /api/auth/users
 */
export async function getAllUsers(req, res, next) {
  try {
    let list = []
    if (isMongoConnected()) {
      list = await User.find().sort({ createdAt: -1 })
      list = list.map((doc) => doc.toJSON())
    } else {
      list = readUsers()
    }
    const sanitized = list.map((u) => {
      const formatted = formatUser(u)
      delete formatted.password
      return formatted
    })
    return res.status(200).json(sanitized)
  } catch (err) {
    next(err)
  }
}

/**
 * PUT/PATCH /api/auth/users/:id
 */
export async function updateUser(req, res, next) {
  try {
    const { id } = req.params
    const { role, name, firstname, lastname, email, phone, location } = req.body

    const updateFields = {}
    if (role) updateFields.role = role
    if (name) {
      updateFields.name = name
      updateFields.firstname = firstname || name.split(' ')[0]
      updateFields.lastname = lastname || name.split(' ').slice(1).join(' ')
    }
    if (email) updateFields.email = email.trim().toLowerCase()
    if (phone) updateFields.phone = phone
    if (location) updateFields.location = location

    if (isMongoConnected()) {
      const updated = await User.findOneAndUpdate(
        { $or: [{ id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }] },
        { $set: updateFields },
        { new: true }
      )
      if (!updated) return res.status(404).json({ error: 'User not found' })

      const users = readUsers()
      const idx = users.findIndex((u) => u.id === id || u.$id === id)
      if (idx !== -1) {
        users[idx] = { ...users[idx], ...updateFields }
        writeUsers(users)
      }
      const formatted = formatUser(updated.toJSON())
      delete formatted.password
      return res.status(200).json(formatted)
    }

    const users = readUsers()
    const idx = users.findIndex((u) => u.id === id || u.$id === id)
    if (idx === -1) return res.status(404).json({ error: 'User not found' })

    users[idx] = { ...users[idx], ...updateFields }
    writeUsers(users)
    const formatted = formatUser(users[idx])
    delete formatted.password
    return res.status(200).json(formatted)
  } catch (err) {
    next(err)
  }
}

/**
 * DELETE /api/auth/users/:id
 */
export async function deleteUser(req, res, next) {
  try {
    const { id } = req.params

    if (isMongoConnected()) {
      const deleted = await User.findOneAndDelete({
        $or: [{ id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
      })
      if (!deleted) return res.status(404).json({ error: 'User not found' })

      const users = readUsers()
      const filtered = users.filter((u) => u.id !== id && u.$id !== id)
      writeUsers(filtered)
      return res.status(200).json({ success: true, message: 'User deleted successfully' })
    }

    const users = readUsers()
    const idx = users.findIndex((u) => u.id === id || u.$id === id)
    if (idx === -1) return res.status(404).json({ error: 'User not found' })

    users.splice(idx, 1)
    writeUsers(users)
    return res.status(200).json({ success: true, message: 'User deleted successfully' })
  } catch (err) {
    next(err)
  }
}

