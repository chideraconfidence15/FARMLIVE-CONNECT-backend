import mongoose from 'mongoose'

const farmSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    farmName: { type: String, required: true, trim: true },
    phoneNumber: { type: String, default: '08000000000', trim: true },
    location: { type: String, default: 'Nigeria', trim: true },
    locationDescription: { type: String, default: '', trim: true },
    farmDescription: { type: String, default: '', trim: true },
    website: { type: String, default: '', trim: true },
    socialMediaHandle: { type: String, default: '', trim: true },
    status: { type: String, default: 'open' },
    rating: { type: Number, default: 4.8 },
    img: { type: String, default: '' },
    imageId: { type: String, default: 'placeholder' },
    distance: { type: String, default: '2.5km' },
    productTags: { type: [String], default: ['Organic', 'Verified Breeder', 'Fast Dispatch'] }
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

export const Farm = mongoose.models.Farm || mongoose.model('Farm', farmSchema)
