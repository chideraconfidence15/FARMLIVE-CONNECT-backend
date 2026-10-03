import express from 'express'
import { requireAdmin } from '../middleware/adminAuth.js'
import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
} from '../controllers/categoryController.js'

export const categoryRouter = express.Router()

categoryRouter.route('/')
  .get(getAllCategories)
  .post(requireAdmin, createCategory)

categoryRouter.route('/:id')
  .get(getCategoryById)
  .put(requireAdmin, updateCategory)
  .delete(requireAdmin, deleteCategory)
