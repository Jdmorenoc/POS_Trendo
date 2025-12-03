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

// Version 7: add shifts table to manage daily opening/closing of cash register
db.version(7).stores({
  items: 'id, item, gender, updated_at, dirty, deleted, xs, s, m, l, xl',
  meta: 'key',
  returns: 'id, itemId, purchased_at, created_at, dirty, deleted',
  sales: 'id, created_at, updated_at, method, total, items, dirty, deleted',
  shifts: 'id, opened_at, closed_at, userEmail, initialCash, finalCash, active'
})

// Version 8: add shiftId to sales to associate transactions with shift
db.version(8).stores({
  items: 'id, item, gender, updated_at, dirty, deleted, xs, s, m, l, xl',
  meta: 'key',
  returns: 'id, itemId, purchased_at, created_at, dirty, deleted',
  sales: 'id, created_at, updated_at, method, total, items, shiftId, dirty, deleted',
  shifts: 'id, opened_at, closed_at, userEmail, initialCash, finalCash, active'
}).upgrade(tx => {
  // Ensure existing sales have shiftId initialized
  return tx.table('sales').toCollection().modify(s => {
    if (typeof s.shiftId === 'undefined') s.shiftId = ''
  })
})

// Version 9: add customers table + extend sales with customerId and tipoComprobante
db.version(9).stores({
  items: 'id, item, gender, updated_at, dirty, deleted, xs, s, m, l, xl',
  meta: 'key',
  returns: 'id, itemId, purchased_at, created_at, dirty, deleted',
  sales: 'id, created_at, updated_at, method, total, items, shiftId, customerId, tipoComprobante, dirty, deleted',
  shifts: 'id, opened_at, closed_at, userEmail, initialCash, finalCash, active',
  customers: 'id, identificationNumber, identificationType, type, email'
}).upgrade(tx => {
  return tx.table('sales').toCollection().modify(s => {
    if (typeof s.customerId === 'undefined') s.customerId = ''
    if (typeof s.tipoComprobante === 'undefined') s.tipoComprobante = ''
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
export async function addSale({ total, items, method, created_at, customerId, tipoComprobante }) {
  const id = (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2))
  const now = new Date().toISOString()
  // Attach current shift if active
  let shiftId = ''
  try {
    const active = await getActiveShift()
    if (active && active.id) shiftId = active.id
  } catch {
    // ignore shift attachment errors
  }
  const record = {
    id,
    total: parseFloat(total) || 0,
    items: parseInt(items) || 0,
    method: method || 'Efectivo',
    created_at: created_at || now,
    updated_at: now,
    shiftId,
    customerId: customerId || '',
    tipoComprobante: tipoComprobante || '',
    dirty: 1,
    deleted: 0
  }
  await db.table('sales').put(record)
  return record
}

export async function listSales() {
  return db.table('sales').where('deleted').equals(0).reverse().sortBy('created_at')
}

// Shifts API
export async function getActiveShift() {
  return db.table('shifts').where('active').equals(1).first()
}

export async function openShift({ userEmail, initialCash }) {
  const existing = await getActiveShift()
  if (existing) throw new Error('Ya hay un turno abierto')
  const id = (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2))
  const opened_at = new Date().toISOString()
  const record = {
    id,
    userEmail: userEmail || '',
    opened_at,
    closed_at: null,
    initialCash: parseFloat(initialCash) || 0,
    finalCash: 0,
    active: 1
  }
  await db.table('shifts').put(record)
  return record
}

export async function closeShift({ finalCash }) {
  const active = await getActiveShift()
  if (!active) throw new Error('No hay turno activo')
  const closed_at = new Date().toISOString()
  active.closed_at = closed_at
  active.finalCash = parseFloat(finalCash) || 0
  active.active = 0
  await db.table('shifts').put(active)
  return active
}

export async function listShifts(limit = 50) {
  return db.table('shifts').orderBy('opened_at').reverse().limit(limit).toArray()
}

// Customers API
export async function upsertCustomer(c) {
  const id = c.id || (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2))
  const now = new Date().toISOString()
  const record = {
    id,
    identificationNumber: String(c.identificationNumber||'').trim(),
    identificationType: c.identificationType || '',
    type: c.type || 'Persona', // Persona | Empresa
    nombres: c.nombres || '',
    apellidos: c.apellidos || '',
    razonSocial: c.razonSocial || '',
    email: c.email || '',
    phoneIndicative: c.phoneIndicative || '',
    phoneNumber: c.phoneNumber || '',
    created_at: c.created_at || now,
    updated_at: now
  }
  await db.table('customers').put(record)
  return record
}

export async function findCustomerByIdentification(identificationNumber) {
  if (!identificationNumber) return null
  return db.table('customers').where('identificationNumber').equals(String(identificationNumber).trim()).first()
}

export async function listCustomers(limit = 100) {
  return db.table('customers').limit(limit).toArray()
}

// Stub DIAN data fetch - in real implementation would call external API
export async function fetchDianData(identificationType, identificationNumber) {
  // Simulate network delay
  await new Promise(res => setTimeout(res, 400)) // eslint-disable-line no-undef
  // Return mock data based on type
  if (!identificationNumber) return null
  // const num = String(identificationNumber)
  if (identificationType === 'NIT') {
    return {
      type: 'Empresa',
      razonSocial: 'EMPRESA DEMO S.A.S.',
      email: 'contacto@empresademo.com',
      phoneIndicative: '+57',
      phoneNumber: '3001234567'
    }
  }
  return {
    type: 'Persona',
    nombres: 'Juan',
    apellidos: 'Pérez',
    email: 'juan.perez@example.com',
    phoneIndicative: '+57',
    phoneNumber: '3009876543'
  }
}
