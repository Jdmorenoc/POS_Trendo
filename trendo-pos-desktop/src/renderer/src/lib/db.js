import Dexie from 'dexie'

export const db = new Dexie('trendo_pos')

// Version 1: items + meta
// Version 2: returns table
// Version 3: add size fields to items (xs,s,m,l,xl) and maintain quantity as total
db.version(1).stores({
  items: 'id, updated_at, dirty, deleted',
  meta: 'key'
})

db.version(2).stores({
  items: 'id, updated_at, dirty, deleted',
  meta: 'key',
  returns: 'id, itemId, purchased_at, created_at, dirty, deleted'
})

db.version(3).stores({
  items: 'id, updated_at, dirty, deleted, xs, s, m, l, xl',
  meta: 'key',
  returns: 'id, itemId, purchased_at, created_at, dirty, deleted'
}).upgrade(tx => {
  return tx.table('items').toCollection().modify(item => {
    // If size fields missing, initialize to 0
    item.xs = item.xs || 0
    item.s = item.s || 0
    item.m = item.m || 0
    item.l = item.l || 0
    item.xl = item.xl || 0
    // If quantity absent or inconsistent, set as sum of sizes
    const total = (item.xs + item.s + item.m + item.l + item.xl) || item.quantity || 0
    item.quantity = total
  })
})

// Version 4: add indexable field `item` (human-readable ITEM code)
db.version(4).stores({
  items: 'id, item, updated_at, dirty, deleted, xs, s, m, l, xl',
  meta: 'key',
  returns: 'id, itemId, purchased_at, created_at, dirty, deleted'
})

// Version 5: add sales table to record transactions (for reporting)
db.version(5).stores({
  items: 'id, item, updated_at, dirty, deleted, xs, s, m, l, xl',
  meta: 'key',
  returns: 'id, itemId, purchased_at, created_at, dirty, deleted',
  sales: 'id, created_at, updated_at, method, total, items, dirty, deleted'
})

// Version 6: add gender field to items
db.version(6).stores({
  items: 'id, item, gender, updated_at, dirty, deleted, xs, s, m, l, xl',
  meta: 'key',
  returns: 'id, itemId, purchased_at, created_at, dirty, deleted',
  sales: 'id, created_at, updated_at, method, total, items, dirty, deleted'
}).upgrade(tx => {
  return tx.table('items').toCollection().modify(item => {
    if (!item.gender) item.gender = 'Unisex'
  })
})

export async function getMeta(key, defaultValue = null) {
  const value = await db.table('meta').get(key)
  return value?.value ?? defaultValue
}

export async function setMeta(key, value) {
  return db.table('meta').put({ key, value })
}

export async function listItems() {
  return db.table('items').where('deleted').equals(0).toArray()
}

export async function upsertItem(item) {
  const now = new Date().toISOString()
  const total = (item.xs || 0) + (item.s || 0) + (item.m || 0) + (item.l || 0) + (item.xl || 0)
  const toSave = { 
    ...item,
    quantity: total || item.quantity || 0,
    updated_at: item.updated_at || now,
    dirty: 1,
    deleted: item.deleted ? 1 : 0,
    xs: item.xs || 0,
    s: item.s || 0,
    m: item.m || 0,
    l: item.l || 0,
    xl: item.xl || 0,
    gender: item.gender || 'Unisex'
  }
  await db.table('items').put(toSave)
  return toSave
}

export async function markDeleted(id) {
  const now = new Date().toISOString()
  await db.table('items').put({ id, deleted: 1, dirty: 1, updated_at: now })
}

export async function bulkUpsert(items) {
  await db.table('items').bulkPut(items)
}

export async function getDirty() {
  return db.table('items').where('dirty').equals(1).toArray()
}

export async function markClean(ids) {
  await db.table('items').where('id').anyOf(ids).modify({ dirty: 0 })
}

// Stock adjustment by ITEM code and size (e.g., size = 'm', delta = -1 for a sale)
export async function adjustStockByItem(itemCode, size, delta) {
  if (!itemCode || !['xs','s','m','l','xl'].includes(size)) return null
  const tbl = db.table('items')
  const item = await tbl.where('item').equals(itemCode).first()
  if (!item) return null
  const next = { ...item }
  const curr = parseInt(next[size] || 0)
  const newVal = Math.max(0, curr + (parseInt(delta) || 0))
  next[size] = newVal
  next.quantity = (next.xs||0)+(next.s||0)+(next.m||0)+(next.l||0)+(next.xl||0)
  next.updated_at = new Date().toISOString()
  next.dirty = 1
  await tbl.put(next)
  return next
}

// Lookup by human-readable ITEM code
export async function findItemByCode(code) {
  if (!code) return null
  return db.table('items').where('item').equals(code).first()
}

// Returns API
export async function listReturns() {
  return db.table('returns').where('deleted').equals(0).reverse().sortBy('created_at')
}

export async function addReturn({ itemId, reason, amount, purchased_at }) {
  // Validate 30 day window
  try {
    const purchasedDate = new Date(purchased_at)
    const now = new Date()
    const diffDays = (now - purchasedDate) / (1000 * 60 * 60 * 24)
    if (diffDays > 30) throw new Error('La devolución excede los 30 días permitidos')
  } catch (e) {
    throw new Error(e.message || 'Fecha de compra inválida')
  }

  const id = (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2))
  const created_at = new Date().toISOString()
  const record = { id, itemId, reason, amount: parseFloat(amount) || 0, purchased_at, created_at, dirty: 1, deleted: 0 }
  await db.table('returns').put(record)
  return record
}

export async function deleteReturn(id) {
  const now = new Date().toISOString()
  await db.table('returns').put({ id, deleted: 1, dirty: 1, created_at: now })
}

// Sales API
export async function addSale({ total, items, method, created_at }) {
  const id = (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2))
  const now = new Date().toISOString()
  const record = {
    id,
    total: parseFloat(total) || 0,
    items: parseInt(items) || 0,
    method: method || 'Efectivo',
    created_at: created_at || now,
    updated_at: now,
    dirty: 1,
    deleted: 0
  }
  await db.table('sales').put(record)
  return record
}

export async function listSales() {
  return db.table('sales').where('deleted').equals(0).reverse().sortBy('created_at')
}
