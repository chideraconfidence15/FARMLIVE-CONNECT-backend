import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { connectDB, isMongoConnected } from './config/db.js'
import { User } from './models/User.js'

dotenv.config()

const email = process.argv[2]?.trim().toLowerCase()

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Usage: npm run admin:promote -- user@example.com')
  process.exitCode = 1
} else {
  try {
    await connectDB()
    if (!isMongoConnected()) {
      throw new Error('Could not connect to MongoDB; no account was changed.')
    }

    const user = await User.findOne({ email }).select('_id role')
    if (!user) {
      throw new Error('No account exists for that email; no account was changed.')
    }

    if (user.role !== 'admin') {
      await User.updateOne({ _id: user._id }, { $set: { role: 'admin' } })
    }

    console.log(user.role === 'admin' ? 'Account already has admin access.' : 'Admin access granted to the account.')
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  } finally {
    await mongoose.disconnect()
  }
}