import express from 'express'
import { requireAdmin } from '../middleware/adminAuth.js'
import {
  getAllFarms,
  getFarmById,
  createFarm,
  updateFarm,
  deleteFarm
} from '../controllers/farmController.js'

export const farmRouter = express.Router()

farmRouter.route('/')
  .get(getAllFarms)
  .post(requireAdmin, createFarm)

farmRouter.route('/:id')
  .get(getFarmById)
  .put(requireAdmin, updateFarm)
  .delete(requireAdmin, deleteFarm)
