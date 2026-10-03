export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'FARMLIVE REST Framework API',
    version: '1.0.0',
    description: 'Enterprise REST Framework API for Nigerian Agriculture & Livestock/Pet Exchange. Powered by Express, MongoDB Mongoose, and Brevo Transactional Email.',
    contact: {
      name: 'FARMLIVE Engineering',
      email: 'notifications@farmlive.ng'
    }
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local Backend Server'
    }
  ],
  paths: {
    '/api/health': {
      get: {
        summary: 'System health check and database status',
        tags: ['System'],
        responses: { 200: { description: 'System is healthy' } }
      }
    },
    '/api/database': {
      get: {
        summary: 'Database connection mode and record counts',
        tags: ['System'],
        responses: { 200: { description: 'Database operational status' } }
      }
    },
    '/api/auth/register': {
      post: {
        summary: 'Register a new user account (dispatches Brevo welcome email)',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  firstname: { type: 'string', example: 'Amina' },
                  lastname: { type: 'string', example: 'Bello' },
                  name: { type: 'string', example: 'Amina Bello' },
                  email: { type: 'string', example: 'amina.bello@example.ng' },
                  password: { type: 'string', minLength: 6, example: 'securepass123' },
                  role: { type: 'string', enum: ['customer', 'farmer', 'admin'], example: 'customer' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Account registered successfully' },
          400: { description: 'Invalid input or email already registered' }
        }
      }
    },
    '/api/auth/login': {
      post: {
        summary: 'Authenticate and sign in with email and password',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'amina.bello@example.ng' },
                  password: { type: 'string', example: 'securepass123' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Authentication successful' },
          401: { description: 'Unauthorized' }
        }
      }
    },
    '/api/auth/me': {
      get: {
        summary: 'Check current authenticated user session',
        tags: ['Authentication'],
        responses: {
          200: { description: 'Current user session details' },
          401: { description: 'Not authenticated' }
        }
      }
    },
    '/api/products': {
      get: {
        summary: 'Retrieve all products/livestock with search and category filters',
        tags: ['Produce & Livestock'],
        parameters: [
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'farmId', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'group', in: 'query', schema: { type: 'string', enum: ['all', 'livestock', 'pets', 'produce'] } },
          { name: 'origin', in: 'query', schema: { type: 'string', enum: ['all', 'local', 'foreign', 'produce'] } }
        ],
        responses: { 200: { description: 'List of matching products' } }
      },
      post: {
        summary: 'Create a new produce/livestock item',
        tags: ['Produce & Livestock'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['productName', 'price'],
                properties: {
                  productName: { type: 'string', example: 'West African Dwarf Doe' },
                  price: { type: 'number', example: 95000 },
                  stockQuantity: { type: 'number', example: 20 },
                  farms: { type: 'string', example: 'farm-anfani' }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'Product created' } }
      }
    },
    '/api/products/{id}': {
      get: {
        summary: 'Retrieve a single product by ID',
        tags: ['Produce & Livestock'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Product details' }, 404: { description: 'Not found' } }
      },
      put: {
        summary: 'Update a product',
        tags: ['Produce & Livestock'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Product updated' } }
      },
      delete: {
        summary: 'Delete a product',
        tags: ['Produce & Livestock'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Product deleted' } }
      }
    },
    '/api/farms': {
      get: {
        summary: 'Retrieve all farms',
        tags: ['Farms'],
        responses: { 200: { description: 'List of farms' } }
      },
      post: {
        summary: 'Create a new farm',
        tags: ['Farms'],
        responses: { 201: { description: 'Farm created' } }
      }
    },
    '/api/farms/{id}': {
      get: {
        summary: 'Get farm by ID',
        tags: ['Farms'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Farm details' }, 404: { description: 'Not found' } }
      },
      put: {
        summary: 'Update farm',
        tags: ['Farms'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Farm updated' } }
      },
      delete: {
        summary: 'Delete farm',
        tags: ['Farms'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Farm deleted' } }
      }
    },
    '/api/categories': {
      get: {
        summary: 'Retrieve all categories',
        tags: ['Categories'],
        responses: { 200: { description: 'List of categories' } }
      },
      post: {
        summary: 'Create a new category',
        tags: ['Categories'],
        responses: { 201: { description: 'Category created' } }
      }
    },
    '/api/categories/{id}': {
      get: {
        summary: 'Get category by ID',
        tags: ['Categories'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Category details' }, 404: { description: 'Not found' } }
      },
      delete: {
        summary: 'Delete category',
        tags: ['Categories'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Category deleted' } }
      }
    },
    '/api/orders': {
      get: {
        summary: 'List orders (optionally filter by userId)',
        tags: ['Orders'],
        parameters: [{ name: 'userId', in: 'query', schema: { type: 'string' } }],
        responses: { 200: { description: 'List of orders' } }
      },
      post: {
        summary: 'Create order and trigger Brevo confirmation email',
        tags: ['Orders'],
        responses: { 201: { description: 'Order created' } }
      }
    },
    '/api/orders/{id}': {
      get: {
        summary: 'Get order details by ID',
        tags: ['Orders'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Order details' }, 404: { description: 'Not found' } }
      },
      delete: {
        summary: 'Delete or cancel order',
        tags: ['Orders'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Order deleted' } }
      }
    },
    '/api/email/status': {
      get: {
        summary: 'Check Brevo configuration status',
        tags: ['Brevo Email'],
        responses: { 200: { description: 'Brevo status' } }
      }
    }
  }
}
