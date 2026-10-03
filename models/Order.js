import mongoose from 'mongoose'

const orderSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, default: '', index: true },
    userName: { type: String, default: '' },
    userEmail: { type: String, default: '' },
    customer: { type: String, default: '' },
    customerEmail: { type: String, default: '' },
    animalId: { type: String, default: '' },
    animalName: { type: String, default: '' },
    farm: { type: String, default: '' },
    price: { type: String, default: '' },
    totalAmount: { type: Number, default: 0 },
    paymentReference: { type: String, default: '' },
    status: { type: String, default: 'paid' },
    items: { type: [mongoose.Schema.Types.Mixed], default: [] },
    date: { type: String, default: 'Today' },
    badgeClass: { type: String, default: 'transit' },
    eta: { type: String, default: 'Farm dispatching in progress' }
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.$id = ret.id
        ret._id = ret.id
        ret.$createdAt = ret.createdAt
        delete ret.__v
        return ret
      }
    }
  }
)

export const Order = mongoose.models.Order || mongoose.model('Order', orderSchema)
