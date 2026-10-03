import express from 'express'
import { getHealth, getDatabaseStatus } from '../controllers/systemController.js'

export const systemRouter = express.Router()

/**
 * @route   GET /api/health
 */
systemRouter.get('/health', getHealth)

/**
 * @route   GET /api/database
 */
systemRouter.get('/database', getDatabaseStatus)
