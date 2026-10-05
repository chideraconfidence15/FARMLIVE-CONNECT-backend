import { isBrevoConfigured, getSender, sendEmail } from '../services/emailService.js'
import { readSubscribers, writeSubscribers } from '../services/storageService.js'

/**
 * GET /api/email/status
 */
export function getEmailStatus(req, res) {
  return res.status(200).json({
    service: 'Brevo Transactional Email',
    configured: isBrevoConfigured(),
    sender: getSender(),
    note: isBrevoConfigured()
      ? 'Brevo API key and sender address are configured. Confirm the sender is verified in Brevo for delivery.'
      : 'Check BREVO_API_KEY and BREVO_SENDER_EMAIL. A valid sender address and API key are required for live delivery.'
  })
}

/**
 * POST /api/email/test
 */
export async function sendTestEmail(req, res, next) {
  try {
    const { to, name } = req.body
    if (!to) {
      return res.status(400).json({ error: 'Recipient email "to" is required.' })
    }
    const testResult = await sendEmail({
      to,
      toName: name || 'FARMLIVE Member',
      subject: 'FARMLIVE Hub · Brevo REST Email System Test',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #173f2b;">
          <h2>Brevo Integration Test Successful!</h2>
          <p>Hello <strong>${name || 'FARMLIVE Member'}</strong>,</p>
          <p>This is a test notification confirming that Brevo transactional email services are operational on FARMLIVE Hub REST framework.</p>
          <p>Timestamp: ${new Date().toISOString()}</p>
        </div>
      `,
      textContent: `Brevo Integration Test Successful! Hello ${name || 'FARMLIVE Member'}, transactional email services are active.`
    })
    return res.status(200).json(testResult)
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/email/subscribe
 */
export function subscribeToUpdates(req, res, next) {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' })
    }

    const subscribers = readSubscribers()
    if (subscribers.some((subscriber) => subscriber.email === email)) {
      return res.status(200).json({ message: 'This email is already subscribed.' })
    }

    subscribers.push({ email, subscribedAt: new Date().toISOString() })
    if (!writeSubscribers(subscribers)) {
      return res.status(500).json({ error: 'Unable to save your subscription right now.' })
    }

    return res.status(201).json({ message: 'You are subscribed to FARMLIVE updates.' })
  } catch (err) {
    next(err)
  }
}
