import { Order } from '../models/Order.js'
import { Product } from '../models/Product.js'
import { isMongoConnected } from '../config/db.js'
import { readOrders, writeOrders, readProducts, writeProducts } from '../services/storageService.js'
import { sendOrderConfirmationEmail } from '../services/emailService.js'

function formatOrder(o) {
  if (!o) return null
  const id = o.id || o._id || o.$id
  return {
    ...o,
    id,
    $id: id,
    _id: id,
    $createdAt: o.createdAt || o.$createdAt || new Date().toISOString()
  }
}

/**
 * GET /api/orders
 * Supports query params: userId
 */
export async function getAllOrders(req, res, next) {
  try {
    const userId = req.authUser.role === 'admin' ? req.query.userId : req.authUser.id

    if (isMongoConnected()) {
      const query = {}
      if (userId) query.userId = userId
      const list = await Order.find(query).sort({ createdAt: -1 })
      return res.status(200).json(list.map((doc) => formatOrder(doc.toJSON())))
    }

    let list = readOrders()
    if (userId) {
      list = list.filter((o) => o.userId === userId)
    }
    return res.status(200).json(list.map(formatOrder))
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/orders/:id
 */
export async function getOrderById(req, res, next) {
  try {
    const { id } = req.params

    if (isMongoConnected()) {
      const query = { $or: [{ id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }] }
      if (req.authUser.role !== 'admin') query.userId = req.authUser.id
      const order = await Order.findOne({
        ...query
      })
      if (!order) return res.status(404).json({ error: 'Order not found' })
      return res.status(200).json(formatOrder(order.toJSON()))
    }

    const orders = readOrders()
    const order = orders.find((o) => (o.id === id || o.$id === id) && (req.authUser.role === 'admin' || o.userId === req.authUser.id))
    if (!order) return res.status(404).json({ error: 'Order not found' })
    return res.status(200).json(formatOrder(order))
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/orders
 */
export async function createOrder(req, res, next) {
  try {
    const {
      userId,
      userName,
      userEmail,
      totalAmount,
      paymentReference,
      status,
      items,
      animalId,
      animalName,
      price,
      customer,
      customerEmail
    } = req.body

    const id = `order-${Date.now().toString(36)}-${Math.floor(100 + Math.random() * 900)}`
    const finalUserName = userName || customer || 'FARMLIVE Customer'
    const finalUserEmail = userEmail || customerEmail || ''
    const finalStatus = status || 'paid'

    // Parse items if passed as string
    let parsedItems = items || []
    if (typeof parsedItems === 'string') {
      try {
        parsedItems = JSON.parse(parsedItems)
      } catch {
        parsedItems = [{ productName: parsedItems }]
      }
    }
    if (Array.isArray(parsedItems)) {
      parsedItems = parsedItems.map((item) => {
        if (typeof item === 'string') {
          try {
            return JSON.parse(item)
          } catch {
            return { productName: item }
          }
        }
        return item
      })
    }

    // Fallback if legacy single animal order
    if (parsedItems.length === 0 && (animalName || animalId)) {
      parsedItems = [{
        productId: animalId,
        productName: animalName,
        price: price,
        quantity: 1
      }]
    }

    const calculatedTotal = totalAmount !== undefined
      ? parseFloat(totalAmount)
      : parsedItems.reduce((acc, item) => acc + (parseFloat(item.price) || 0) * (item.quantity || 1), 0)

    const orderPayload = {
      id,
      userId: userId || '',
      userName: finalUserName,
      userEmail: finalUserEmail,
      customer: finalUserName,
      customerEmail: finalUserEmail,
      totalAmount: calculatedTotal,
      price: `₦${calculatedTotal.toLocaleString()}`,
      animalName: parsedItems[0]?.productName || 'FARMLIVE Connect Produce',
      paymentReference: paymentReference || `FL-${Date.now()}`,
      status: finalStatus,
      items: parsedItems,
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      badgeClass: 'transit',
      eta: 'Farm dispatching in progress'
    }

    // Decrement stock for paid orders
    if (finalStatus === 'paid') {
      for (const item of parsedItems) {
        const prodId = item.productId || item.$id || item.id
        const qty = item.quantity || 1
        if (prodId) {
          if (isMongoConnected()) {
            await Product.findOneAndUpdate(
              { $or: [{ id: prodId }, { _id: prodId.match(/^[0-9a-fA-F]{24}$/) ? prodId : null }] },
              { $inc: { stockQuantity: -qty } }
            )
          }
          const products = readProducts()
          const pIdx = products.findIndex((p) => p.id === prodId || p.$id === prodId)
          if (pIdx !== -1) {
            products[pIdx].stockQuantity = Math.max(0, (products[pIdx].stockQuantity || 0) - qty)
            writeProducts(products)
          }
        }
      }
    }

    if (isMongoConnected()) {
      const created = await Order.create(orderPayload)
      const orders = readOrders()
      orders.unshift(created.toJSON())
      writeOrders(orders)

      // Send confirmation email via Brevo
      if (finalUserEmail) {
        sendOrderConfirmationEmail(orderPayload, finalUserEmail, finalUserName).catch((err) =>
          console.warn('Order email dispatch error:', err.message || err)
        )
      }

      return res.status(201).json(formatOrder(created.toJSON()))
    }

    // Local JSON fallback
    const orders = readOrders()
    orders.unshift(orderPayload)
    writeOrders(orders)

    if (finalUserEmail) {
      sendOrderConfirmationEmail(orderPayload, finalUserEmail, finalUserName).catch((err) =>
        console.warn('Order email dispatch error:', err.message || err)
      )
    }

    return res.status(201).json(formatOrder(orderPayload))
  } catch (err) {
    next(err)
  }
}

/**
 * PUT/PATCH /api/orders/:id
 */
export async function updateOrder(req, res, next) {
  try {
    const { id } = req.params
    const data = req.body

    if (isMongoConnected()) {
      const updated = await Order.findOneAndUpdate(
        { $or: [{ id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }] },
        { $set: data },
        { new: true }
      )
      if (!updated) return res.status(404).json({ error: 'Order not found' })

      const orders = readOrders()
      const idx = orders.findIndex((o) => o.id === id || o.$id === id)
      if (idx !== -1) {
        orders[idx] = updated.toJSON()
        writeOrders(orders)
      }
      return res.status(200).json(formatOrder(updated.toJSON()))
    }

    const orders = readOrders()
    const idx = orders.findIndex((o) => o.id === id || o.$id === id)
    if (idx === -1) return res.status(404).json({ error: 'Order not found' })

    orders[idx] = { ...orders[idx], ...data }
    writeOrders(orders)
    return res.status(200).json(formatOrder(orders[idx]))
  } catch (err) {
    next(err)
  }
}

/**
 * DELETE /api/orders/:id
 */
export async function deleteOrder(req, res, next) {
  try {
    const { id } = req.params

    if (isMongoConnected()) {
      const canceled = await Order.findOneAndDelete({
        $or: [{ id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
      })
      if (!canceled) return res.status(404).json({ error: 'Order not found' })

      const orders = readOrders()
      const filtered = orders.filter((o) => o.id !== id && o.$id !== id)
      writeOrders(filtered)
      return res.status(200).json({ success: true, message: `Order #${id} deleted` })
    }

    const orders = readOrders()
    const index = orders.findIndex((o) => o.id === id || o.$id === id)
    if (index === -1) return res.status(404).json({ error: 'Order not found' })

    orders.splice(index, 1)
    writeOrders(orders)
    return res.status(200).json({ success: true, message: `Order #${id} deleted` })
  } catch (err) {
    next(err)
  }
}

