import { Animal } from '../models/Animal.js'
import { isMongoConnected } from '../config/db.js'
import { readAnimals, writeAnimals } from '../services/storageService.js'

/**
 * GET /api/animals or /api/v1/animals
 * Supports query params: group, origin, category, location, q
 */
export async function getAllAnimals(req, res, next) {
  try {
    const { group, origin, category, location, q } = req.query

    if (isMongoConnected()) {
      const query = {}

      if (group && group !== 'all') {
        query.group = group
      }
      if (origin && origin !== 'all') {
        query.origin = origin
      }
      if (category && category !== 'all') {
        query.category = category
      }
      if (location && location !== 'All Nigeria') {
        query.$or = [
          { place: { $regex: location, $options: 'i' } },
          { locationKey: { $regex: location, $options: 'i' } }
        ]
      }
      if (q && q.trim()) {
        const regex = new RegExp(q.trim(), 'i')
        const searchConditions = [
          { name: regex },
          { species: regex },
          { breed: regex },
          { place: regex },
          { farm: regex },
          { tags: regex }
        ]
        if (query.$or) {
          query.$and = [{ $or: query.$or }, { $or: searchConditions }]
          delete query.$or
        } else {
          query.$or = searchConditions
        }
      }

      const list = await Animal.find(query).sort({ createdAt: -1 })
      return res.status(200).json(list)
    }

    // Fallback: Local JSON persistence
    let list = readAnimals()

    if (group && group !== 'all') {
      list = list.filter((item) => item.group === group)
    }
    if (origin && origin !== 'all') {
      list = list.filter((item) => item.origin === origin)
    }
    if (category && category !== 'all') {
      list = list.filter((item) => item.category === category)
    }
    if (location && location !== 'All Nigeria') {
      const loc = location.toLowerCase()
      list = list.filter((item) => {
        const place = (item.place || '').toLowerCase()
        const key = (item.locationKey || '').toLowerCase()
        return place.includes(loc) || key.includes(loc)
      })
    }
    if (q && q.trim()) {
      const query = q.toLowerCase().trim()
      list = list.filter((item) => {
        const matchesName = (item.name || '').toLowerCase().includes(query)
        const matchesSpecies = (item.species || '').toLowerCase().includes(query)
        const matchesBreed = (item.breed || '').toLowerCase().includes(query)
        const matchesPlace = (item.place || '').toLowerCase().includes(query)
        const matchesFarm = (item.farm || '').toLowerCase().includes(query)
        const matchesTags = (item.tags || []).some((t) => t.toLowerCase().includes(query))
        return matchesName || matchesSpecies || matchesBreed || matchesPlace || matchesFarm || matchesTags
      })
    }

    return res.status(200).json(list)
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/animals/:id
 */
export async function getAnimalById(req, res, next) {
  try {
    const { id } = req.params

    if (isMongoConnected()) {
      const found = await Animal.findOne({ id })
      if (!found) {
        return res.status(404).json({ success: false, error: 'Animal listing not found' })
      }
      return res.status(200).json(found)
    }

    const list = readAnimals()
    const found = list.find((item) => item.id === id)
    if (!found) {
      return res.status(404).json({ success: false, error: 'Animal listing not found' })
    }
    return res.status(200).json(found)
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/animals
 */
export async function createAnimal(req, res, next) {
  try {
    const {
      name,
      species,
      breed,
      origin,
      group,
      category,
      place,
      locationKey,
      age,
      weight,
      price,
      type,
      image,
      tags,
      farm,
      description
    } = req.body

    if (!name || !species || !price) {
      return res.status(400).json({ error: 'Missing required fields: name, species, and price are required.' })
    }

    const safePrefix = (category || group || 'animal').replace(/[^a-z0-9]/gi, '').toLowerCase()
    const uniqueId = `${safePrefix}-${Date.now().toString(36)}`

    const fallbackImage = image && image.trim().startsWith('http')
      ? image.trim()
      : 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=700&q=85'

    const animalPayload = {
      id: uniqueId,
      name: name.trim(),
      species: species.trim(),
      breed: (breed || name).trim(),
      origin: origin === 'foreign' ? 'foreign' : 'local',
      group: group === 'pets' ? 'pets' : 'livestock',
      category: category || 'others',
      place: place || 'Lagos, Nigeria',
      locationKey: locationKey || 'Lagos',
      age: age || 'Young adult',
      weight: weight || '',
      price: price.startsWith('₦') ? price : `₦${price}`,
      type: type || category || 'general',
      image: fallbackImage,
      tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map((t) => t.trim()) : ['Verified', 'Healthy']),
      farm: farm || 'Verified Partner Farm',
      description: description || 'Healthy stock raised under veterinary inspection.'
    }

    if (isMongoConnected()) {
      const created = await Animal.create(animalPayload)

      // Sync backup
      const list = readAnimals()
      list.unshift(created.toJSON())
      writeAnimals(list)

      return res.status(201).json(created)
    }

    // Fallback: Local JSON persistence
    const list = readAnimals()
    list.unshift(animalPayload)
    writeAnimals(list)

    return res.status(201).json(animalPayload)
  } catch (error) {
    next(error)
  }
}

/**
 * PUT/PATCH /api/animals/:id
 */
export async function updateAnimal(req, res, next) {
  try {
    const { id } = req.params
    const updates = req.body

    const formattedTags = updates.tags !== undefined
      ? (Array.isArray(updates.tags)
          ? updates.tags
          : (typeof updates.tags === 'string' ? updates.tags.split(',').map((t) => t.trim()) : []))
      : undefined

    const updatePayload = { ...updates }
    delete updatePayload.id
    delete updatePayload._id
    if (formattedTags !== undefined) {
      updatePayload.tags = formattedTags
    }

    if (isMongoConnected()) {
      const updated = await Animal.findOneAndUpdate({ id }, updatePayload, { new: true, runValidators: true })
      if (!updated) {
        return res.status(404).json({ error: `Animal with ID "${id}" not found.` })
      }

      // Sync backup
      const list = readAnimals()
      const idx = list.findIndex((a) => a.id === id)
      if (idx !== -1) {
        list[idx] = updated.toJSON()
        writeAnimals(list)
      }

      return res.status(200).json(updated)
    }

    // Fallback: Local JSON persistence
    const list = readAnimals()
    const index = list.findIndex((item) => item.id === id)
    if (index === -1) {
      return res.status(404).json({ error: `Animal with ID "${id}" not found.` })
    }

    const current = list[index]
    const updatedAnimal = {
      ...current,
      ...updatePayload,
      id: current.id
    }

    list[index] = updatedAnimal
    writeAnimals(list)

    return res.status(200).json(updatedAnimal)
  } catch (error) {
    next(error)
  }
}

/**
 * DELETE /api/animals/:id
 */
export async function deleteAnimal(req, res, next) {
  try {
    const { id } = req.params

    if (isMongoConnected()) {
      const deletedItem = await Animal.findOneAndDelete({ id })
      if (!deletedItem) {
        return res.status(404).json({ error: `Animal with ID "${id}" not found.` })
      }

      // Sync backup
      const list = readAnimals()
      const filtered = list.filter((a) => a.id !== id)
      writeAnimals(filtered)

      return res.status(200).json({
        success: true,
        message: `Animal "${deletedItem.name}" deleted successfully from MongoDB.`,
        deletedId: id,
        deletedItem
      })
    }

    // Fallback: Local JSON persistence
    const list = readAnimals()
    const index = list.findIndex((item) => item.id === id)
    if (index === -1) {
      return res.status(404).json({ error: `Animal with ID "${id}" not found.` })
    }

    const [deletedItem] = list.splice(index, 1)
    writeAnimals(list)

    return res.status(200).json({
      success: true,
      message: `Animal "${deletedItem.name}" deleted successfully.`,
      deletedId: id,
      deletedItem
    })
  } catch (error) {
    next(error)
  }
}
