import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DATA_DIR = path.join(__dirname, '..', 'data')
const ANIMALS_FILE = path.join(DATA_DIR, 'animals.json')
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json')
const FARMS_FILE = path.join(DATA_DIR, 'farms.json')
const CATEGORIES_FILE = path.join(DATA_DIR, 'categories.json')
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json')
const USERS_FILE = path.join(DATA_DIR, 'users.json')
const SUBSCRIBERS_FILE = path.join(DATA_DIR, 'subscribers.json')

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
  const files = [ANIMALS_FILE, PRODUCTS_FILE, FARMS_FILE, CATEGORIES_FILE, ORDERS_FILE, USERS_FILE, SUBSCRIBERS_FILE]
  for (const file of files) {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify([], null, 2), 'utf-8')
    }
  }
}

function safeRead(filePath) {
  ensureDataFiles()
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw)
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err)
    return []
  }
}

function safeWrite(filePath, data) {
  ensureDataFiles()
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
    return true
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err)
    return false
  }
}

// Products / Animals
export function readProducts() {
  const products = safeRead(PRODUCTS_FILE)
  if (products && products.length > 0) return products
  return safeRead(ANIMALS_FILE)
}

export function writeProducts(data) {
  safeWrite(PRODUCTS_FILE, data)
  return safeWrite(ANIMALS_FILE, data)
}

export const readAnimals = readProducts
export const writeAnimals = writeProducts

// Farms
export function readFarms() {
  return safeRead(FARMS_FILE)
}

export function writeFarms(data) {
  return safeWrite(FARMS_FILE, data)
}

// Categories
export function readCategories() {
  return safeRead(CATEGORIES_FILE)
}

export function writeCategories(data) {
  return safeWrite(CATEGORIES_FILE, data)
}

// Orders
export function readOrders() {
  return safeRead(ORDERS_FILE)
}

export function writeOrders(data) {
  return safeWrite(ORDERS_FILE, data)
}

// Users
export function readUsers() {
  return safeRead(USERS_FILE)
}

export function writeUsers(data) {
  return safeWrite(USERS_FILE, data)
}

// Newsletter subscribers
export function readSubscribers() {
  return safeRead(SUBSCRIBERS_FILE)
}

export function writeSubscribers(data) {
  return safeWrite(SUBSCRIBERS_FILE, data)
}
