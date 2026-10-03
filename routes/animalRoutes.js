import express from 'express'
import {
  getAllAnimals,
  getAnimalById,
  createAnimal,
  updateAnimal,
  deleteAnimal
} from '../controllers/animalController.js'

export const animalRouter = express.Router()

/**
 * @route   GET /api/animals
 * @route   POST /api/animals
 */
animalRouter.route('/')
  .get(getAllAnimals)
  .post(createAnimal)

/**
 * @route   GET /api/animals/:id
 * @route   PUT /api/animals/:id
 * @route   PATCH /api/animals/:id
 * @route   DELETE /api/animals/:id
 */
animalRouter.route('/:id')
  .get(getAnimalById)
  .put(updateAnimal)
  .patch(updateAnimal)
  .delete(deleteAnimal)
