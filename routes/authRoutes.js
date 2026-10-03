import express from 'express'
import { requireAdmin, requireAuthentication } from '../middleware/adminAuth.js'
import {
  register,
  login,
  loginWithGoogle,
  verifySignup,
  resendSignupCode,
  getMe,
  logout,
  verifyEmail,
  resendVerification,
  getAllUsers,
  updateUser,
  deleteUser
} from '../controllers/authController.js'

export const authRouter = express.Router()

authRouter.post('/register', register)
authRouter.post('/login', login)
authRouter.post('/google', loginWithGoogle)
authRouter.post('/verify-signup', verifySignup)
authRouter.post('/resend-signup-code', resendSignupCode)
authRouter.get('/me', requireAuthentication, getMe)
authRouter.post('/logout', logout)
authRouter.post('/verify', verifyEmail)
authRouter.post('/resend-verification', resendVerification)

// User Management (Admin CRUD)
authRouter.get('/users', requireAdmin, getAllUsers)
authRouter.put('/users/:id', requireAdmin, updateUser)
authRouter.patch('/users/:id', requireAdmin, updateUser)
authRouter.delete('/users/:id', requireAdmin, deleteUser)

