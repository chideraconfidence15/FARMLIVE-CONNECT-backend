import express from 'express'
import { productRouter } from './productRoutes.js'
import { farmRouter } from './farmRoutes.js'
import { categoryRouter } from './categoryRoutes.js'
import { authRouter } from './authRoutes.js'
import { orderRouter } from './orderRoutes.js'
import { emailRouter } from './emailRoutes.js'
import { systemRouter } from './systemRoutes.js'
import { getAllUsers, updateUser, deleteUser } from '../controllers/authController.js'
import { requireAdmin } from '../middleware/adminAuth.js'

export const apiRouter = express.Router()

// User CRUD Router
const userRouter = express.Router()
userRouter.get('/', requireAdmin, getAllUsers)
userRouter.put('/:id', requireAdmin, updateUser)
userRouter.patch('/:id', requireAdmin, updateUser)
userRouter.delete('/:id', requireAdmin, deleteUser)

// Version 1 router
const v1Router = express.Router()
v1Router.use('/', systemRouter)
v1Router.use('/auth', authRouter)
v1Router.use('/users', userRouter)
v1Router.use('/farms', farmRouter)
v1Router.use('/categories', categoryRouter)
v1Router.use('/products', productRouter)
v1Router.use('/animals', productRouter) // alias for full backward compatibility
v1Router.use('/orders', orderRouter)
v1Router.use('/email', emailRouter)

// Mount both standard /api and versioned /api/v1
apiRouter.use('/', v1Router)
apiRouter.use('/v1', v1Router)

