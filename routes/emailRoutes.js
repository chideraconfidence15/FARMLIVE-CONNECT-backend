import express from 'express'
import { getEmailStatus, sendTestEmail, subscribeToUpdates } from '../controllers/emailController.js'

export const emailRouter = express.Router()

/**
 * @route   GET /api/email/status
 */
emailRouter.get('/status', getEmailStatus)

/**
 * @route   POST /api/email/test
 */
emailRouter.post('/test', sendTestEmail)

/**
 * @route   POST /api/email/subscribe
 */
emailRouter.post('/subscribe', subscribeToUpdates)
