import express from 'express'
import { requireAdmin, requireAuthentication } from '../middleware/adminAuth.js'
import { getAllOrders, getOrderById, createOrder, updateOrder, deleteOrder } from '../controllers/orderController.js'

export const orderRouter = express.Router()

/**
 * @route   GET /api/orders
 * @route   POST /api/orders
 */
orderRouter.route('/')
  .get(requireAuthentication, getAllOrders)
  .post(createOrder)

/**
 * @route   GET /api/orders/:id
 * @route   PUT /api/orders/:id
 * @route   PATCH /api/orders/:id
 * @route   DELETE /api/orders/:id
 */
orderRouter.route('/:id')
  .get(requireAuthentication, getOrderById)
  .put(requireAdmin, updateOrder)
  .patch(requireAdmin, updateOrder)
  .delete(requireAdmin, deleteOrder)

