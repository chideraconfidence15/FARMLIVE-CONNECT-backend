import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { readProducts, readFarms, readCategories, readOrders, readUsers } from '../services/storageService.js'
import { Product } from '../models/Product.js'
import { Farm } from '../models/Farm.js'
import { Category } from '../models/Category.js'
import { Order } from '../models/Order.js'
import { User } from '../models/User.js'

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/farmlive'

let connectionPromise = null
let hasAttemptedInitialConnection = false

/**
 * Check whether MongoDB connection is actively established and ready
 */
export function isMongoConnected() {
  return mongoose.connection.readyState === 1
}

/**
 * Seed initial data from JSON storage into MongoDB if collections are empty
 */
export async function seedMongoDBIfEmpty() {
  if (!isMongoConnected()) return

  try {
    const categoryCount = await Category.countDocuments()
    if (categoryCount === 0) {
      const cats = readCategories()
      if (cats.length > 0) await Category.insertMany(cats)
      console.log(`🍃 [MongoDB] Seeded ${cats.length} categories.`)
    }

    const farmCount = await Farm.countDocuments()
    if (farmCount === 0) {
      const farms = readFarms()
      if (farms.length > 0) await Farm.insertMany(farms)
      console.log(`🍃 [MongoDB] Seeded ${farms.length} farms.`)
    }

    const productCount = await Product.countDocuments()
    if (productCount === 0) {
      const prods = readProducts()
      if (prods.length > 0) await Product.insertMany(prods)
      console.log(`🍃 [MongoDB] Seeded ${prods.length} products.`)
    }

    const userCount = await User.countDocuments()
    if (userCount === 0) {
      const users = readUsers()
      if (users.length > 0) await User.insertMany(users)
      console.log(`🍃 [MongoDB] Seeded ${users.length} users.`)
    }

    const orderCount = await Order.countDocuments()
    if (orderCount === 0) {
      const orders = readOrders()
      if (orders.length > 0) await Order.insertMany(orders)
      console.log(`🍃 [MongoDB] Seeded ${orders.length} orders.`)
    }
  } catch (err) {
    console.warn('⚠️ [MongoDB] Error during initial database seed:', err.message)
  }
}

/**
 * Connect to MongoDB with non-blocking timeout resilience
 */
export async function connectDB() {
  if (isMongoConnected()) {
    return mongoose.connection
  }
  if (connectionPromise) return connectionPromise

  hasAttemptedInitialConnection = true
  connectionPromise = (async () => {
    try {
      console.log('🍃 [MongoDB] Connecting to configured MongoDB database')

      await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 8000
      })

      console.log(`✅ [MongoDB] Successfully connected to database "${mongoose.connection.name}"!`)
      await seedMongoDBIfEmpty()
      return mongoose.connection
    } catch (err) {
      console.warn(`⚠️  [MongoDB Notice] Could not connect to MongoDB (${err.name || 'Error'}): ${err.message}`)
      console.warn('👉 [Resilient Mode] Using file persistence for this request; a later request will retry MongoDB.')
      return null
    } finally {
      connectionPromise = null
    }
  })()

  return connectionPromise
}

// Global connection event handlers (Prevent EventEmitter uncaughtException)
mongoose.connection.on('error', (err) => {
  console.warn('⚠️ [MongoDB Driver]:', err.message || err)
})

mongoose.connection.on('disconnected', () => {
  if (hasAttemptedInitialConnection) {
    console.log('⚠️ [MongoDB] Disconnected. Running in file-backed fallback mode.')
  }
})

mongoose.connection.on('reconnected', () => {
  console.log('✅ [MongoDB] Reconnected to database.')
})
