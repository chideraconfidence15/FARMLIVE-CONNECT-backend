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

let isConnecting = false
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
  if (isMongoConnected() || isConnecting) {
    return mongoose.connection
  }

  isConnecting = true
  hasAttemptedInitialConnection = true

  try {
    const safeUri = MONGODB_URI.replace(/:([^:@]+)@/, ':****@')
    console.log(`🍃 [MongoDB] Connecting to: ${safeUri}`)

    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 2000,
      connectTimeoutMS: 3000
    })

    console.log(`✅ [MongoDB] Successfully connected to database "${mongoose.connection.name}"!`)
    isConnecting = false

    await seedMongoDBIfEmpty()
    return mongoose.connection
  } catch (err) {
    isConnecting = false
    const safeUri = MONGODB_URI.replace(/:([^:@]+)@/, ':****@')
    console.warn(`\n⚠️  [MongoDB Notice] Could not connect to MongoDB at ${safeUri}: ${err.message}`)
    console.warn(`👉 [Resilient Mode] FARMLIVE will operate seamlessly using local file persistence (backend/data/*.json) until MongoDB is active.\n`)
    return null
  }
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
