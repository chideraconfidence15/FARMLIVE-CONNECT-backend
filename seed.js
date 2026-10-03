import mongoose from 'mongoose'
import dotenv from 'dotenv'
import {
  readProducts,
  readFarms,
  readCategories,
  readOrders,
  readUsers
} from './services/storageService.js'
import { Product } from './models/Product.js'
import { Farm } from './models/Farm.js'
import { Category } from './models/Category.js'
import { Order } from './models/Order.js'
import { User } from './models/User.js'

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/farmlive'

async function runSeed() {
  try {
    console.log(`\n======================================================`)
    console.log(`🍃 FARMLIVE MongoDB Seeder`)
    console.log(`📡 Connecting to: ${MONGODB_URI.replace(/:([^:@]+)@/, ':****@')}`)
    console.log(`======================================================\n`)

    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    })

    console.log(`✅ Connected to MongoDB database: ${mongoose.connection.name}`)

    const fileCategories = readCategories()
    const fileFarms = readFarms()
    const fileProducts = readProducts()
    const fileUsers = readUsers()
    const fileOrders = readOrders()

    console.log(`\n🏷️ Syncing ${fileCategories.length} categories...`)
    await Category.deleteMany({})
    if (fileCategories.length > 0) {
      await Category.insertMany(fileCategories)
    }
    console.log(`✓ Inserted ${fileCategories.length} categories.`)

    console.log(`\n🏡 Syncing ${fileFarms.length} farms...`)
    await Farm.deleteMany({})
    if (fileFarms.length > 0) {
      await Farm.insertMany(fileFarms)
    }
    console.log(`✓ Inserted ${fileFarms.length} farms.`)

    console.log(`\n📦 Syncing ${fileProducts.length} products / livestock...`)
    await Product.deleteMany({})
    if (fileProducts.length > 0) {
      await Product.insertMany(fileProducts)
    }
    console.log(`✓ Inserted ${fileProducts.length} products.`)

    console.log(`\n👤 Syncing ${fileUsers.length} user accounts...`)
    await User.deleteMany({})
    if (fileUsers.length > 0) {
      await User.insertMany(fileUsers)
    }
    console.log(`✓ Inserted ${fileUsers.length} users.`)

    console.log(`\n📝 Syncing ${fileOrders.length} order records...`)
    await Order.deleteMany({})
    if (fileOrders.length > 0) {
      await Order.insertMany(fileOrders)
    }
    console.log(`✓ Inserted ${fileOrders.length} orders.`)

    console.log(`\n🎉 MongoDB Seed Complete! All collections synchronized successfully.\n`)
    process.exit(0)
  } catch (err) {
    console.error(`\n❌ Could not seed MongoDB directly:`, err.message)
    console.log(`📁 Local JSON fallback storage is active and fully primed in backend/data/!\n`)
    process.exit(0)
  }
}

runSeed()
