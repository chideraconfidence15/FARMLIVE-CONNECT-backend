import { Product } from '../models/Product.js'
import { isMongoConnected } from '../config/db.js'
import { readProducts, writeProducts, readFarms, readCategories } from '../services/storageService.js'

function formatProduct(p) {
  if (!p) return null
  const id = p.id || p._id || p.$id
  const name = p.productName || p.name || 'Produce'
  const img = p.img || p.image || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80'
  
  // Ensure categories is always an array of objects with $id and name
  let categories = p.categories || []
  if (typeof categories === 'string') categories = [categories]
  categories = categories.map((cat) => {
    if (typeof cat === 'string') {
      return { $id: `cat-${cat.toLowerCase().replace(/\s+/g, '-')}`, id: cat, name: cat }
    }
    return {
      ...cat,
      $id: cat.$id || cat.id || cat._id,
      name: cat.name || 'General'
    }
  })

  // Ensure farms is an object or populated
  let farms = p.farms || null
  if (typeof farms === 'string') {
    farms = { $id: farms, id: farms, farmName: p.farm || 'Local Farm', location: p.place || 'Nigeria' }
  } else if (farms && typeof farms === 'object') {
    farms = {
      ...farms,
      $id: farms.$id || farms.id || farms._id,
      farmName: farms.farmName || p.farm || 'Local Farm',
      location: farms.location || p.place || 'Nigeria'
    }
  }

  return {
    ...p,
    id,
    $id: id,
    _id: id,
    productName: name,
    name,
    img,
    image: img,
    price: typeof p.price === 'string' ? parseFloat(p.price.replace(/[^0-9.]/g, '')) || 500 : Number(p.price),
    stockQuantity: p.stockQuantity !== undefined ? Number(p.stockQuantity) : 50,
    rating: p.rating ? Number(p.rating) : 4.8,
    categories,
    farms,
    $createdAt: p.createdAt || p.$createdAt || new Date().toISOString(),
    $updatedAt: p.updatedAt || p.$updatedAt || new Date().toISOString()
  }
}

/**
 * GET /api/products (also aliased to /api/animals)
 */
export async function getAllProducts(req, res, next) {
  try {
    const { category, farmId, farm, search, group, origin } = req.query

    let list = []
    if (isMongoConnected()) {
      const query = {}
      if (group && group !== 'all') query.group = group
      if (origin && origin !== 'all') query.origin = origin
      list = await Product.find(query).sort({ createdAt: -1 })
      list = list.map((doc) => doc.toJSON())
    } else {
      list = readProducts()
    }

    let formatted = list.map(formatProduct)

    // Filter by farm if supplied
    if (farmId || farm) {
      const targetFarm = farmId || farm
      formatted = formatted.filter((p) => {
        if (!p.farms) return false
        if (typeof p.farms === 'string') return p.farms === targetFarm
        return p.farms.$id === targetFarm || p.farms.id === targetFarm || p.farms.farmName?.toLowerCase().includes(targetFarm.toLowerCase())
      })
    }

    // Filter by category if supplied
    if (category && category !== 'All') {
      const catLower = category.toLowerCase()
      formatted = formatted.filter((p) => {
        const catNameMatch = p.categories?.some((c) => c.name?.toLowerCase() === catLower || c.$id === category)
        const speciesMatch = p.category?.toLowerCase() === catLower || p.species?.toLowerCase().includes(catLower)
        return catNameMatch || speciesMatch
      })
    }

    // Filter by search query if supplied
    if (search) {
      const s = search.toLowerCase().trim()
      formatted = formatted.filter((p) => {
        return (
          p.productName?.toLowerCase().includes(s) ||
          p.name?.toLowerCase().includes(s) ||
          p.breed?.toLowerCase().includes(s) ||
          p.species?.toLowerCase().includes(s) ||
          p.description?.toLowerCase().includes(s) ||
          p.category?.toLowerCase().includes(s) ||
          p.categories?.some((c) => (typeof c === 'string' ? c : c.name)?.toLowerCase().includes(s)) ||
          p.farms?.farmName?.toLowerCase().includes(s) ||
          p.farms?.location?.toLowerCase().includes(s) ||
          p.tags?.some((t) => t.toLowerCase().includes(s))
        )
      })
    }


    return res.status(200).json(formatted)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/products/:id
 */
export async function getProductById(req, res, next) {
  try {
    const { id } = req.params

    let found = null
    if (isMongoConnected()) {
      const product = await Product.findOne({
        $or: [{ id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
      })
      if (product) found = product.toJSON()
    } else {
      const list = readProducts()
      found = list.find((p) => p.id === id || p.$id === id)
    }

    if (!found) {
      return res.status(404).json({ error: 'Product not found' })
    }

    return res.status(200).json(formatProduct(found))
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/products
 */
export async function createProduct(req, res, next) {
  try {
    const data = req.body
    if (!data.productName && !data.name) {
      return res.status(400).json({ error: 'Product name is required' })
    }

    const id = data.id || `prod-${Date.now().toString(36)}`
    const name = data.productName || data.name

    // Resolve farm if farm ID string passed
    let farms = data.farms
    if (typeof farms === 'string') {
      const allFarms = readFarms()
      const matched = allFarms.find((f) => f.id === farms || f.$id === farms)
      if (matched) {
        farms = { $id: matched.id, id: matched.id, farmName: matched.farmName, location: matched.location }
      } else {
        farms = { $id: farms, id: farms, farmName: 'Local Farm', location: 'Nigeria' }
      }
    }

    // Resolve categories if array of IDs passed
    let categories = data.categories || []
    if (Array.isArray(categories)) {
      const allCats = readCategories()
      categories = categories.map((c) => {
        if (typeof c === 'string') {
          const match = allCats.find((cat) => cat.id === c || cat.$id === c || cat.name === c)
          return match ? { $id: match.id, id: match.id, name: match.name } : { $id: c, id: c, name: c }
        }
        return c
      })
    }

    const newProd = {
      ...data,
      id,
      productName: name,
      name,
      price: parseFloat(data.price) || 0,
      stockQuantity: parseInt(data.stockQuantity) || 0,
      farms,
      categories,
      img: data.img || data.image || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
      rating: parseFloat(data.rating) || 4.8
    }

    if (isMongoConnected()) {
      const created = await Product.create(newProd)
      const list = readProducts()
      list.unshift(created.toJSON())
      writeProducts(list)
      return res.status(201).json(formatProduct(created.toJSON()))
    }

    const list = readProducts()
    list.unshift(newProd)
    writeProducts(list)
    return res.status(201).json(formatProduct(newProd))
  } catch (err) {
    next(err)
  }
}

/**
 * PUT /api/products/:id
 */
export async function updateProduct(req, res, next) {
  try {
    const { id } = req.params
    const data = req.body

    if (data.productName && !data.name) data.name = data.productName
    if (data.name && !data.productName) data.productName = data.name

    if (isMongoConnected()) {
      const updated = await Product.findOneAndUpdate(
        { $or: [{ id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }] },
        { $set: data },
        { new: true }
      )
      if (!updated) {
        return res.status(404).json({ error: 'Product not found' })
      }

      const list = readProducts()
      const idx = list.findIndex((p) => p.id === id || p.$id === id)
      if (idx !== -1) {
        list[idx] = updated.toJSON()
        writeProducts(list)
      }
      return res.status(200).json(formatProduct(updated.toJSON()))
    }

    const list = readProducts()
    const idx = list.findIndex((p) => p.id === id || p.$id === id)
    if (idx === -1) {
      return res.status(404).json({ error: 'Product not found' })
    }

    list[idx] = { ...list[idx], ...data, id, $id: id, _id: id }
    writeProducts(list)
    return res.status(200).json(formatProduct(list[idx]))
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/products/:id/stock
 */
export async function updateProductStock(req, res, next) {
  try {
    const { id } = req.params
    const { stockQuantity } = req.body
    const qty = parseInt(stockQuantity, 10)

    if (isNaN(qty)) {
      return res.status(400).json({ error: 'Valid stockQuantity is required' })
    }

    if (isMongoConnected()) {
      const updated = await Product.findOneAndUpdate(
        { $or: [{ id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }] },
        { $set: { stockQuantity: qty } },
        { new: true }
      )
      if (!updated) return res.status(404).json({ error: 'Product not found' })
      return res.status(200).json(formatProduct(updated.toJSON()))
    }

    const list = readProducts()
    const idx = list.findIndex((p) => p.id === id || p.$id === id)
    if (idx === -1) return res.status(404).json({ error: 'Product not found' })

    list[idx].stockQuantity = qty
    writeProducts(list)
    return res.status(200).json(formatProduct(list[idx]))
  } catch (err) {
    next(err)
  }
}

/**
 * DELETE /api/products/:id
 */
export async function deleteProduct(req, res, next) {
  try {
    const { id } = req.params

    if (isMongoConnected()) {
      const deleted = await Product.findOneAndDelete({
        $or: [{ id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
      })
      if (!deleted) {
        return res.status(404).json({ error: 'Product not found' })
      }

      const list = readProducts()
      const filtered = list.filter((p) => p.id !== id && p.$id !== id)
      writeProducts(filtered)
      return res.status(200).json({ success: true, message: 'Product deleted successfully' })
    }

    const list = readProducts()
    const idx = list.findIndex((p) => p.id === id || p.$id === id)
    if (idx === -1) {
      return res.status(404).json({ error: 'Product not found' })
    }

    list.splice(idx, 1)
    writeProducts(list)
    return res.status(200).json({ success: true, message: 'Product deleted successfully' })
  } catch (err) {
    next(err)
  }
}
