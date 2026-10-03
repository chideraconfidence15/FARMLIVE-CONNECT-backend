import { Category } from '../models/Category.js'
import { isMongoConnected } from '../config/db.js'
import { readCategories, writeCategories } from '../services/storageService.js'

/**
 * GET /api/categories
 */
export async function getAllCategories(req, res, next) {
  try {
    if (isMongoConnected()) {
      const categories = await Category.find().sort({ name: 1 })
      return res.status(200).json(categories)
    }

    const categories = readCategories()
    return res.status(200).json(categories)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/categories/:id
 */
export async function getCategoryById(req, res, next) {
  try {
    const { id } = req.params

    if (isMongoConnected()) {
      const cat = await Category.findOne({ $or: [{ id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }] })
      if (!cat) {
        return res.status(404).json({ error: 'Category not found' })
      }
      return res.status(200).json(cat)
    }

    const categories = readCategories()
    const cat = categories.find((c) => c.id === id || c.$id === id)
    if (!cat) {
      return res.status(404).json({ error: 'Category not found' })
    }
    return res.status(200).json(cat)
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/categories
 */
export async function createCategory(req, res, next) {
  try {
    const { name, img, imageId } = req.body
    if (!name) {
      return res.status(400).json({ error: 'Category name is required' })
    }

    const newCategory = {
      id: `cat-${Date.now().toString(36)}`,
      name: name.trim(),
      img: img || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
      imageId: imageId || 'placeholder'
    }

    if (isMongoConnected()) {
      const created = await Category.create(newCategory)
      const categories = readCategories()
      categories.push(created.toJSON())
      writeCategories(categories)
      return res.status(201).json(created)
    }

    const categories = readCategories()
    newCategory.$id = newCategory.id
    newCategory._id = newCategory.id
    categories.push(newCategory)
    writeCategories(categories)
    return res.status(201).json(newCategory)
  } catch (err) {
    next(err)
  }
}

/**
 * PUT /api/categories/:id
 */
export async function updateCategory(req, res, next) {
  try {
    const { id } = req.params
    const data = req.body

    if (isMongoConnected()) {
      const updated = await Category.findOneAndUpdate(
        { $or: [{ id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }] },
        { $set: data },
        { new: true }
      )
      if (!updated) {
        return res.status(404).json({ error: 'Category not found' })
      }

      const categories = readCategories()
      const idx = categories.findIndex((c) => c.id === id || c.$id === id)
      if (idx !== -1) {
        categories[idx] = updated.toJSON()
        writeCategories(categories)
      }
      return res.status(200).json(updated)
    }

    const categories = readCategories()
    const idx = categories.findIndex((c) => c.id === id || c.$id === id)
    if (idx === -1) {
      return res.status(404).json({ error: 'Category not found' })
    }

    categories[idx] = { ...categories[idx], ...data, id, $id: id, _id: id }
    writeCategories(categories)
    return res.status(200).json(categories[idx])
  } catch (err) {
    next(err)
  }
}

/**
 * DELETE /api/categories/:id
 */
export async function deleteCategory(req, res, next) {
  try {
    const { id } = req.params

    if (isMongoConnected()) {
      const deleted = await Category.findOneAndDelete({
        $or: [{ id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
      })
      if (!deleted) {
        return res.status(404).json({ error: 'Category not found' })
      }

      const categories = readCategories()
      const filtered = categories.filter((c) => c.id !== id && c.$id !== id)
      writeCategories(filtered)
      return res.status(200).json({ success: true, message: 'Category deleted successfully' })
    }

    const categories = readCategories()
    const idx = categories.findIndex((c) => c.id === id || c.$id === id)
    if (idx === -1) {
      return res.status(404).json({ error: 'Category not found' })
    }

    categories.splice(idx, 1)
    writeCategories(categories)
    return res.status(200).json({ success: true, message: 'Category deleted successfully' })
  } catch (err) {
    next(err)
  }
}
