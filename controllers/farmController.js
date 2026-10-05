import { Farm } from '../models/Farm.js'
import { isMongoConnected } from '../config/db.js'
import { readFarms, writeFarms } from '../services/storageService.js'

/**
 * GET /api/farms
 */
export async function getAllFarms(req, res, next) {
  try {
    if (isMongoConnected()) {
      const farms = await Farm.find().sort({ createdAt: -1 })
      if (farms.length > 0) return res.status(200).json(farms)
      return res.status(200).json(readFarms())
    }

    const farms = readFarms()
    return res.status(200).json(farms)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/farms/:id
 */
export async function getFarmById(req, res, next) {
  try {
    const { id } = req.params

    if (isMongoConnected()) {
      const farm = await Farm.findOne({ $or: [{ id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }] })
      if (!farm) {
        return res.status(404).json({ error: 'Farm not found' })
      }
      return res.status(200).json(farm)
    }

    const farms = readFarms()
    const farm = farms.find((f) => f.id === id || f.$id === id)
    if (!farm) {
      return res.status(404).json({ error: 'Farm not found' })
    }
    return res.status(200).json(farm)
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/farms
 */
export async function createFarm(req, res, next) {
  try {
    const data = req.body
    if (!data.farmName) {
      return res.status(400).json({ error: 'Farm name is required' })
    }

    const newFarm = {
      ...data,
      id: data.id || `farm-${Date.now().toString(36)}`,
      status: data.status || 'open',
      rating: parseFloat(data.rating) || 4.8,
      img: data.img || data.image || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=700&q=80',
      imageId: data.imageId || 'placeholder',
      distance: data.distance || '2.0km'
    }

    if (isMongoConnected()) {
      const created = await Farm.create(newFarm)
      const farms = readFarms()
      farms.unshift(created.toJSON())
      writeFarms(farms)
      return res.status(201).json(created)
    }

    const farms = readFarms()
    newFarm.$id = newFarm.id
    newFarm._id = newFarm.id
    farms.unshift(newFarm)
    writeFarms(farms)
    return res.status(201).json(newFarm)
  } catch (err) {
    next(err)
  }
}

/**
 * PUT /api/farms/:id
 */
export async function updateFarm(req, res, next) {
  try {
    const { id } = req.params
    const data = req.body

    if (isMongoConnected()) {
      const updated = await Farm.findOneAndUpdate(
        { $or: [{ id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }] },
        { $set: data },
        { new: true }
      )
      if (!updated) {
        return res.status(404).json({ error: 'Farm not found' })
      }

      const farms = readFarms()
      const idx = farms.findIndex((f) => f.id === id || f.$id === id)
      if (idx !== -1) {
        farms[idx] = updated.toJSON()
        writeFarms(farms)
      }
      return res.status(200).json(updated)
    }

    const farms = readFarms()
    const idx = farms.findIndex((f) => f.id === id || f.$id === id)
    if (idx === -1) {
      return res.status(404).json({ error: 'Farm not found' })
    }

    farms[idx] = { ...farms[idx], ...data, id, $id: id, _id: id }
    writeFarms(farms)
    return res.status(200).json(farms[idx])
  } catch (err) {
    next(err)
  }
}

/**
 * DELETE /api/farms/:id
 */
export async function deleteFarm(req, res, next) {
  try {
    const { id } = req.params

    if (isMongoConnected()) {
      const deleted = await Farm.findOneAndDelete({
        $or: [{ id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
      })
      if (!deleted) {
        return res.status(404).json({ error: 'Farm not found' })
      }

      const farms = readFarms()
      const filtered = farms.filter((f) => f.id !== id && f.$id !== id)
      writeFarms(filtered)
      return res.status(200).json({ success: true, message: 'Farm deleted successfully' })
    }

    const farms = readFarms()
    const idx = farms.findIndex((f) => f.id === id || f.$id === id)
    if (idx === -1) {
      return res.status(404).json({ error: 'Farm not found' })
    }

    farms.splice(idx, 1)
    writeFarms(farms)
    return res.status(200).json({ success: true, message: 'Farm deleted successfully' })
  } catch (err) {
    next(err)
  }
}
