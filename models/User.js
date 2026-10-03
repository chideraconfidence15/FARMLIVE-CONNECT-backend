import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    firstname: { type: String, default: '', trim: true },
    lastname: { type: String, default: '', trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['customer', 'farmer', 'admin'], default: 'customer' },
    emailVerification: { type: Boolean, default: true }
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.$id = ret.id
        ret._id = ret.id
        delete ret.__v
        delete ret.password
        return ret
      }
    }
  }
)

export const User = mongoose.models.User || mongoose.model('User', userSchema)
