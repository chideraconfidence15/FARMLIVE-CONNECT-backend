/**
 * Standard REST Error Handler Middleware
 */
export function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500)
  const message = err.message || 'Internal Server Error'

  console.error(`[REST Error] ${req.method} ${req.originalUrl}:`, err)

  return res.status(statusCode).json({
    success: false,
    error: message,
    statusCode,
    timestamp: new Date().toISOString()
  })
}

/**
 * 404 Route Not Found Middleware
 */
export function notFoundHandler(req, res) {
  return res.status(404).json({
    success: false,
    error: `REST Endpoint not found: ${req.method} ${req.originalUrl}`,
    statusCode: 404,
    docsUrl: '/api/docs'
  })
}
