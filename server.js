import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import swaggerUi from 'swagger-ui-express'
import { connectDB, isMongoConnected } from './config/db.js'
import { isBrevoConfigured } from './services/emailService.js'
import { apiRouter } from './routes/index.js'
import { requestLogger } from './middleware/requestLogger.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { swaggerSpec } from './docs/swagger.js'

dotenv.config()

process.on('uncaughtException', (err) => {
  console.warn('⚠️ [Process uncaughtException]:', err.message || err)
})

process.on('unhandledRejection', (reason) => {
  console.warn('⚠️ [Process unhandledRejection]:', reason?.message || reason)
})

const app = express()
const PORT = process.env.PORT || 5000
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean)

// Middlewares
app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(requestLogger)

// Interactive Browsable Swagger REST Framework UI
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'FARMLIVE REST Framework API Explorer',
  customCss: '.swagger-ui .topbar { background-color: #173f2b; }'
}))

// Root redirect to docs
app.get('/', (req, res) => {
  res.redirect('/api/docs')
})

// REST API Routes
app.use('/api', apiRouter)

// Error handling middleware
app.use(notFoundHandler)
app.use(errorHandler)

// Server initialization
async function startServer() {
  await connectDB()

  const server = app.listen(PORT, () => {
    console.log(`\n======================================================`)
    console.log(`🚀 FARMLIVE REST Framework Backend running at: http://localhost:${PORT}`)
    console.log(`📖 Interactive API Explorer (Swagger):         http://localhost:${PORT}/api/docs`)
    console.log(`🍃 Database Status: ${isMongoConnected() ? 'MongoDB Active ✅' : 'Local File Persistence (Fallback Mode) 📁'}`)
    console.log(`📧 Email Status:    ${isBrevoConfigured() ? 'Brevo Active (Live Delivery) ✉️' : 'Brevo Simulated (Set BREVO_API_KEY in .env) 📋'}`)
    console.log(`📡 Core REST Routes:`)
    console.log(`   - GET/POST       /api/products      (All produce & livestock breeds)`)
    console.log(`   - GET/POST       /api/farms         (Farms catalog & details)`)
    console.log(`   - GET/POST       /api/categories    (Categories)`)
    console.log(`   - POST           /api/auth/register (User registration + welcome email)`)
    console.log(`   - POST           /api/auth/login    (User sign-in)`)
    console.log(`   - GET/POST       /api/orders        (Orders + receipt email)`)
    console.log(`   - GET            /api/email/status  (Brevo status & test)`)
    console.log(`======================================================\n`)
  })

  // Prevent event loop from prematurely exiting
  server.keepAliveTimeout = 65000
}

startServer()
