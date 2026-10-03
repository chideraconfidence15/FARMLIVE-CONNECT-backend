import mongoose from 'mongoose'

const categorySchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, unique: true, trim: true },
    img: { type: String, default: '' },
    imageId: { type: String, default: 'placeholder' }
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.$id = ret.id
        ret._id = ret.id
        delete ret.__v
        return ret
      }
    }
  }
)

export const Category = mongoose.models.Category || mongoose.model('Category', categorySchema)
