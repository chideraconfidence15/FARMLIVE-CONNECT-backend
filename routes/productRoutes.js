import express from 'express'
import { requireAdmin } from '../middleware/adminAuth.js'
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  updateProductStock,
  deleteProduct
} from '../controllers/productController.js'

export const productRouter = express.Router()

productRouter.route('/')
  .get(getAllProducts)
  .post(requireAdmin, createProduct)

productRouter.route('/:id')
  .get(getProductById)
  .put(requireAdmin, updateProduct)
  .patch(requireAdmin, updateProduct)
  .delete(requireAdmin, deleteProduct)

productRouter.route('/:id/stock')
  .patch(requireAdmin, updateProductStock)
  .put(requireAdmin, updateProductStock)
