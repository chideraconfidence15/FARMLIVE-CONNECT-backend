import { isMongoConnected } from '../config/db.js'
import { isBrevoConfigured } from '../services/emailService.js'
import { Animal } from '../models/Animal.js'
import { User } from '../models/User.js'
import { Order } from '../models/Order.js'
import { readAnimals, readUsers, readOrders } from '../services/storageService.js'

/**
 * GET /api/health
 */
export function getHealth(req, res) {
  const mongoReady = isMongoConnected()
  const brevoReady = isBrevoConfigured()

  return res.status(200).json({
    status: 'healthy',
    service: 'FARMLIVE Modular REST Framework API',
    architecture: 'Layered REST (Controllers, Routes, Middleware, Services, Models)',
    database: mongoReady ? 'MongoDB (Active)' : 'Local File Persistence (Fallback)',
    mongodbConnected: mongoReady,
    emailService: brevoReady ? 'Brevo (Live Active)' : 'Brevo (Console Simulation Mode)',
    brevoConfigured: brevoReady,
    apiDocs: '/api/docs',
    timestamp: new Date().toISOString()
  })
}

/**
 * GET /api/database
 */
export async function getDatabaseStatus(req, res, next) {
  try {
    const mongoReady = isMongoConnected()
    let animalCount = 0
    let userCount = 0
    let orderCount = 0

    if (mongoReady) {
      animalCount = await Animal.countDocuments()
      userCount = await User.countDocuments()
      orderCount = await Order.countDocuments()
    } else {
      animalCount = readAnimals().length
      userCount = readUsers().length
      orderCount = readOrders().length
    }

    return res.status(200).json({
      status: 'operational',
      database: mongoReady ? 'MongoDB (Mongoose)' : 'Local File Persistence (Fallback)',
      isMongoConnected: mongoReady,
      counts: {
        animals: animalCount,
        users: userCount,
        orders: orderCount
      }
    })
  } catch (err) {
    next(err)
  }
}
