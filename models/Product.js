import mongoose from 'mongoose'

const productSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    productName: { type: String, required: true, trim: true },
    name: { type: String, trim: true },
    price: { type: Number, required: true },
    description: { type: String, default: '' },
    farms: { type: mongoose.Schema.Types.Mixed, default: null }, // can be ID or populated farm object
    categories: { type: [mongoose.Schema.Types.Mixed], default: [] }, // can be array of IDs or populated objects
    stockQuantity: { type: Number, default: 50 },
    rating: { type: Number, default: 4.8 },
    img: { type: String, default: '' },
    imageId: { type: String, default: 'placeholder' },
    species: { type: String, default: '', trim: true },
    breed: { type: String, default: '', trim: true },
    origin: { type: String, enum: ['local', 'foreign', 'produce', 'cross'], default: 'local' },
    group: { type: String, enum: ['livestock', 'pets', 'produce', 'all'], default: 'livestock' },
    category: { type: String, default: 'all' },
    place: { type: String, default: '' },
    locationKey: { type: String, default: '' },
    age: { type: String, default: '' },
    weight: { type: String, default: '' },
    type: { type: String, default: '' },
    tags: { type: [String], default: [] }
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.$id = ret.id
        ret._id = ret.id
        if (!ret.productName && ret.name) ret.productName = ret.name
        if (!ret.name && ret.productName) ret.name = ret.productName
        if (!ret.img && ret.image) ret.img = ret.image
        if (!ret.image && ret.img) ret.image = ret.img
        delete ret.__v
        return ret
      }
    }
  }
)

export const Product = mongoose.models.Product || mongoose.model('Product', productSchema)
export const Animal = Product
