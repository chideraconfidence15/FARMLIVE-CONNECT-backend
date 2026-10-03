import dotenv from 'dotenv'
import { BrevoClient } from '@getbrevo/brevo'

dotenv.config()

/**
 * Check if a valid Brevo API key is present in environment
 */
export function isBrevoConfigured() {
  const key = process.env.BREVO_API_KEY
  return Boolean(
    key &&
    key.trim() !== '' &&
    !key.includes('your_') &&
    !key.includes('placeholder') &&
    key.length > 15
  )
}

function getBrevoClient() {
  const apiKey = process.env.BREVO_API_KEY || ''
  return new BrevoClient({ apiKey: apiKey.trim() })
}

export function getSender() {
  return {
    name: process.env.BREVO_SENDER_NAME || 'FARMLIVE Hub',
    email: process.env.BREVO_SENDER_EMAIL || 'notifications@farmlive.ng'
  }
}

/**
 * Core sendEmail function
 */
export async function sendEmail({ to, toName, subject, htmlContent, textContent }) {
  const sender = getSender()
  const recipientName = toName || to.split('@')[0]

  if (!isBrevoConfigured()) {
    console.log(`\n======================================================`)
    console.log(`📧 [Brevo Email Simulator] (Live Delivery Disabled)`)
    console.log(`   From:    ${sender.name} <${sender.email}>`)
    console.log(`   To:      ${recipientName} <${to}>`)
    console.log(`   Subject: ${subject}`)
    console.log(`   Note:    Add a valid BREVO_API_KEY in backend/.env to deliver live emails.`)
    console.log(`======================================================\n`)

    return {
      success: true,
      simulated: true,
      message: 'Email simulated in console (BREVO_API_KEY not configured).',
      recipient: to,
      subject
    }
  }

  try {
    const client = getBrevoClient()
    const response = await client.transactionalEmails.sendTransacEmail({
      sender,
      to: [{ email: to.trim().toLowerCase(), name: recipientName }],
      subject,
      htmlContent,
      textContent: textContent || subject
    })

    console.log(`✅ [Brevo] Email dispatched successfully to ${to}! MessageId:`, response?.messageId || 'OK')
    return {
      success: true,
      simulated: false,
      messageId: response?.messageId,
      recipient: to
    }
  } catch (err) {
    console.error(`❌ [Brevo Error] Failed to send email to ${to}:`, err.message || err)
    return {
      success: false,
      error: err.message || 'Brevo API call failed',
      recipient: to
    }
  }
}

/**
 * Welcome Email Template sent upon account creation
 */
export async function sendWelcomeEmail(user) {
  if (!user || !user.email) return

  const subject = `Welcome to FARMLIVE, ${user.name}! Your account is ready.`
  const roleLabel = user.role === 'farmer' ? 'Verified Farmer / Breeder' : 'Buyer / Pet Parent'

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${subject}</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f3fb; color: #223528; }
    .email-container { max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5dceb; }
    .header { background-color: #173f2b; padding: 32px 30px; text-align: left; }
    .header h1 { margin: 0; font-size: 24px; color: #ffffff; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0 0; color: #a4ddb7; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; }
    .content { padding: 35px 30px; line-height: 1.6; }
    .content h2 { margin-top: 0; font-size: 20px; color: #173f2b; }
    .role-badge { display: inline-block; background-color: #ede7f6; color: #43246a; font-weight: bold; font-size: 12px; padding: 4px 10px; border-radius: 20px; margin-bottom: 18px; }
    .features-list { background-color: #fbf9fd; border: 1px solid #ebdff4; border-radius: 8px; padding: 20px 24px; margin: 24px 0; }
    .features-list li { margin-bottom: 10px; font-size: 14px; }
    .button-box { text-align: center; margin: 32px 0 20px 0; }
    .btn { display: inline-block; background-color: #173f2b; color: #ffffff !important; text-decoration: none; font-weight: bold; padding: 14px 28px; border-radius: 8px; font-size: 14px; }
    .footer { padding: 24px 30px; background-color: #f2eef6; border-top: 1px solid #e7dfef; font-size: 12px; color: #766d80; text-align: center; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <p>FARMLIVE Hub · Nigeria</p>
      <h1>Authentication Confirmed</h1>
    </div>
    <div class="content">
      <h2>Welcome aboard, ${user.name}!</h2>
      <span class="role-badge">Active Role: ${roleLabel}</span>
      <p>
        Your FARMLIVE account (<strong>${user.email}</strong>) has been registered. You now have full access to our marketplace for verified livestock, aquaculture, poultry, and companion pets.
      </p>

      <div class="features-list">
        <h4 style="margin: 0 0 12px 0; color: #173f2b;">What you can do on FARMLIVE:</h4>
        <ul style="padding-left: 20px; margin: 0;">
          <li><strong>27+ Local & Foreign Breeds:</strong> Boer goats, Yankasa sheep, Large White pigs, Cobb broilers, Clarias fingerlings, and companion pets.</li>
          <li><strong>The Good Stock Standard:</strong> Guaranteed veterinary passports, vaccination records, and physical farm audits.</li>
          <li><strong>Secure Livestock Transit:</strong> Stress-free logistics across all 36 Nigerian states.</li>
          ${user.role === 'farmer' ? '<li><strong>Real-time Stock Management:</strong> Direct REST tools to publish, edit prices, update weights, and dispatch orders.</li>' : ''}
        </ul>
      </div>

      <div class="button-box">
        <a class="btn" href="http://localhost:5000">Enter FARMLIVE Marketplace →</a>
      </div>

      <p style="font-size: 13px; color: #5a5462; margin-top: 25px;">
        Need assistance or logistics coordination? Reply directly to this email or visit our Help Center in your dashboard.
      </p>
    </div>
    <div class="footer">
      FARMLIVE Agricultural & Pet Exchange · Secured with Brevo Transactional Email.<br/>
      Strict Gatekeeping: Never share your account credentials with anyone.
    </div>
  </div>
</body>
</html>
`

  return sendEmail({
    to: user.email,
    toName: user.name,
    subject,
    htmlContent,
    textContent: `Welcome to FARMLIVE, ${user.name}! Your account (${user.email}) has been registered with role ${roleLabel}. Access the marketplace at http://localhost:5000`
  })
}

export async function sendSignupOtpEmail(email, name, code) {
  const subject = 'Your FARMLIVE verification code'
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 24px auto; color: #173f2b;">
      <h2>Verify your FARMLIVE account</h2>
      <p>Hello ${name || 'there'}, use this code to finish creating your account:</p>
      <p style="font-size: 32px; font-weight: 700; letter-spacing: 6px;">${code}</p>
      <p>This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>
    </div>
  `
  return sendEmail({
    to: email,
    toName: name,
    subject,
    htmlContent,
    textContent: `Your FARMLIVE verification code is ${code}. It expires in 10 minutes.`
  })
}

/**
 * Order Confirmation Email Template sent upon placing an order
 */
export async function sendOrderConfirmationEmail(order, userEmail, userName) {
  const recipientEmail = userEmail || 'buyer@example.com'
  const recipientName = userName || order.customer || 'FARMLIVE Member'
  const subject = `Order Confirmed: ${order.animalName} (${order.id})`

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${subject}</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f3fb; color: #223528; }
    .email-container { max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5dceb; }
    .header { background-color: #173f2b; padding: 30px; text-align: left; }
    .header h1 { margin: 0; font-size: 22px; color: #ffffff; }
    .header p { margin: 5px 0 0 0; color: #a4ddb7; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
    .content { padding: 32px 30px; line-height: 1.6; }
    .receipt-box { background-color: #faf7fd; border: 1px solid #e8dbf2; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .receipt-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #dfd4e8; font-size: 14px; }
    .receipt-row:last-child { border-bottom: none; font-weight: bold; font-size: 16px; color: #173f2b; padding-top: 12px; }
    .eta-box { background-color: #eef8f1; border: 1px solid #bce6c8; border-radius: 8px; padding: 14px 18px; margin: 20px 0; font-size: 13px; color: #134e28; }
    .footer { padding: 22px 30px; background-color: #f2eef6; border-top: 1px solid #e7dfef; font-size: 12px; color: #766d80; text-align: center; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <p>FARMLIVE Hub · Order Receipt</p>
      <h1>Order Logged Successfully</h1>
    </div>
    <div class="content">
      <p>Hello <strong>${recipientName}</strong>,</p>
      <p>Your order inquiry has been received and dispatched to the breeder for logistical confirmation.</p>

      <div class="receipt-box">
        <div class="receipt-row">
          <span>Order Number:</span>
          <strong>#${order.id}</strong>
        </div>
        <div class="receipt-row">
          <span>Stock / Listing:</span>
          <strong>${order.animalName}</strong>
        </div>
        <div class="receipt-row">
          <span>Source Farm:</span>
          <span>${order.farm || 'Partner Ranch'}</span>
        </div>
        <div class="receipt-row">
          <span>Date Logged:</span>
          <span>${order.date || 'Today'}</span>
        </div>
        <div class="receipt-row">
          <span>Status:</span>
          <span>${order.status || 'Order Placed ⏳'}</span>
        </div>
        <div class="receipt-row">
          <span>Total Price:</span>
          <span>${order.price}</span>
        </div>
      </div>

      <div class="eta-box">
        <strong>🚚 Transit & Delivery Dispatch:</strong><br/>
        ${order.eta || 'Farm dispatching in progress. A handler will coordinate state transit with you shortly.'}
      </div>

      <p style="font-size: 13px; color: #5a5462;">
        Funds are protected by FARMLIVE Escrow until you inspect the animal's veterinary passport upon arrival.
      </p>
    </div>
    <div class="footer">
      FARMLIVE · Certified Livestock & Companion Pets Exchange · Powered by Brevo
    </div>
  </div>
</body>
</html>
`

  return sendEmail({
    to: recipientEmail,
    toName: recipientName,
    subject,
    htmlContent,
    textContent: `Order #${order.id} confirmed for ${order.animalName} from ${order.farm}. Total: ${order.price}. Status: ${order.status}.`
  })
}
