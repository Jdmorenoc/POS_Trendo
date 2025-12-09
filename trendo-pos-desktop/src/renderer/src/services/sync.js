import { supabase } from './supabaseClient'
import {
  getDirty,
  markClean,
  bulkUpsert,
  setMeta,
  db,
  bulkUpsertCustomers,
  getDirtyCustomers,
  markCustomersClean,
  getDirtySales,
  markSalesClean
} from './db'

const SUPABASE_SCHEMA = 'trendo'
const SUPABASE_TABLE = 'product'
const REMOTE_TABLE = `${SUPABASE_SCHEMA}.${SUPABASE_TABLE}`
const LAST_SYNC_KEY = 'trendo.product:lastSyncedAt'
const SIZE_FIELDS = ['xs', 's', 'm', 'l', 'xl']
const CUSTOMER_TABLE = 'customer'
const CUSTOMER_REMOTE_TABLE = `${SUPABASE_SCHEMA}.${CUSTOMER_TABLE}`
const CUSTOMER_LAST_SYNC_KEY = 'trendo.customer:lastSyncedAt'
const SALE_TABLE = 'sale'
const SALE_REMOTE_TABLE = `${SUPABASE_SCHEMA}.${SALE_TABLE}`
const SALE_LAST_SYNC_KEY = 'trendo.sale:lastSyncedAt'

const ensureSize = (value) => {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

const computeQuantity = (record) =>
  SIZE_FIELDS.reduce((sum, size) => sum + (Number.isFinite(record[size]) ? record[size] : 0), 0)

export function mapIncoming(record) {
  const productId = record.product_id || record.id || ''
  const price = Number(record.price) || 0

  const sizes = SIZE_FIELDS.reduce((acc, size) => {
    acc[size] = ensureSize(record[`stock_${size}`])
    return acc
  }, {})

  // El campo en Supabase es 'gender_prod', no 'gender'
  const gender = record.gender_prod || record.gender || 'Unisex'

  return {
    id: productId,
    item: productId,
    title: record.product_name || productId,
    price,
    description: record.description || '',
    gender: gender,
    gender_prod: gender,
    quantity: computeQuantity(sizes),
    dirty: 0,
    deleted: 0,
    ...sizes
  }
}

export function mapLocalToCloud(item) {
  const productId = String(item.item || item.id || '').trim().slice(0, 15)
  const sizes = SIZE_FIELDS.reduce((acc, size) => {
    acc[`stock_${size}`] = ensureSize(item[size])
    return acc
  }, {})

  return {
    product_id: productId,
    product_name: item.title || item.product_name || productId,
    price: Number.parseInt(item.price ?? item.precio ?? 0, 10) || 0,
    gender_prod: item.gender_prod || item.gender || 'Unisex',
    ...sizes
  }
}

// Mapeo de clientes desde Supabase al formato local
// Columnas en Supabase (esquema trendo, tabla customer):
// customer_id (PK), customer_type, identification_type, first_name, second_name,
// last_name, second_last_name, email, address, phone_indicative, phone_number
function mapCustomerIncoming(record) {
  const customerId = record.customer_id || record.id
  return {
    id: customerId,
    customer_id: customerId,
    identificationNumber: customerId, // Para compatibilidad
    identificationType: record.identification_type || '',
    identification_type: record.identification_type || '',
    type: record.customer_type || 'Persona',
    customer_type: record.customer_type || 'Persona',
    first_name: record.first_name || '',
    second_name: record.second_name || '',
    last_name: record.last_name || '',
    second_last_name: record.second_last_name || '',
    // Campos legacy para compatibilidad
    nombres: record.first_name || '',
    apellidos: record.last_name || '',
    razonSocial: record.business_name || '',
    email: record.email || '',
    address: record.address || '',
    phone_indicative: record.phone_indicative || '+57',
    phone_number: record.phone_number || '',
    phoneIndicative: record.phone_indicative || '+57',
    phoneNumber: record.phone_number || '',
    dirty: 0,
    deleted: record.deleted ? 1 : 0,
    synced: true
  }
}

function mapCustomerLocalToCloud(customer) {
  const customerId = customer.customer_id || customer.identificationNumber || customer.id
  return {
    customer_id: customerId,
    customer_type: customer.customer_type || customer.type || 'Persona',
    identification_type: customer.identification_type || customer.identificationType || 'CC',
    first_name: customer.first_name || customer.nombres || null,
    second_name: customer.second_name || null,
    last_name: customer.last_name || customer.apellidos || null,
    second_last_name: customer.second_last_name || null,
    email: customer.email || null,
    address: customer.address || null,
    phone_indicative: customer.phone_indicative || customer.phoneIndicative || '+57',
    phone_number: customer.phone_number || customer.phoneNumber || null
  }
}

// Mapeo de ventas desde local a Supabase
// Columnas en Supabase (esquema trendo, tabla sale):
// consecutive (PK), sale_date, customer_document, employee_document
function mapSaleLocalToCloud(sale) {
  const empDoc = sale.employeeDocument?.trim()
  const custDoc = sale.customerId?.trim?.() || sale.customerId
  
  return {
    sale_date: new Date(sale.created_at || new Date()).toISOString().split('T')[0],
    customer_document: custDoc ? String(custDoc).slice(0, 15) : null,
    employee_document: empDoc ? String(empDoc).slice(0, 15) : null
  }
}

function remoteSaleTable() {
  return supabase.schema(SUPABASE_SCHEMA).from(SALE_TABLE)
}

function remoteTable() {
  return supabase.schema(SUPABASE_SCHEMA).from(SUPABASE_TABLE)
}

export async function pullFromCloud() {
  const { data, error } = await remoteTable().select('*')
  if (error) throw error

  const incoming = (data || []).map(mapIncoming)
  if (incoming.length > 0) {
    await bulkUpsert(incoming)
  }

  await setMeta(LAST_SYNC_KEY, new Date().toISOString())
  return incoming.length
}

export async function pushToCloud() {
  const dirty = await getDirty()
  if (dirty.length === 0) return 0

  const deletions = dirty.filter((item) => item.deleted === 1 || item.deleted === true)
  const updates = dirty.filter((item) => !deletions.includes(item))

  if (deletions.length) {
    const remoteIds = deletions
      .map((item) => String(item.item || item.id || '').trim())
      .filter((value) => value.length > 0)

    const localIds = deletions
      .map((item) => item.id)
      .filter((value) => typeof value !== 'undefined')

    if (remoteIds.length) {
      const { error: deleteError } = await remoteTable()
        .delete()
        .in('product_id', remoteIds)

      if (deleteError) throw deleteError
    }

    if (localIds.length) {
      await db.items.bulkDelete(localIds)
    }
  }

  if (updates.length) {
    const toUpsert = updates.map(mapLocalToCloud)
    const { error } = await remoteTable().upsert(toUpsert, { onConflict: 'product_id' })
    if (error) throw error

    await markClean(updates.map((item) => item.id))
  }

  return updates.length + deletions.length
}

function remoteCustomerTable() {
  return supabase.schema(SUPABASE_SCHEMA).from(CUSTOMER_TABLE)
}

export async function pullCustomersFromCloud() {
  const { data, error } = await remoteCustomerTable().select('*')
  if (error) throw error

  const incoming = (data || [])
    .map(mapCustomerIncoming)
    .filter((record) => Boolean(record?.id))

  if (incoming.length) {
    await bulkUpsertCustomers(incoming)
  }

  await setMeta(CUSTOMER_LAST_SYNC_KEY, new Date().toISOString())
  return incoming.length
}

export async function pushCustomersToCloud() {
  const dirty = await getDirtyCustomers()
  if (dirty.length === 0) return 0

  const toUpsert = dirty
    .filter((customer) => !customer.deleted)
    .map(mapCustomerLocalToCloud)

  if (toUpsert.length) {
    const { error } = await remoteCustomerTable().upsert(toUpsert, { onConflict: 'customer_id' })
    if (error) throw error
  }

  await markCustomersClean(dirty.map((customer) => customer.id))
  return dirty.length
}

export async function pushSalesToCloud() {
  const dirty = await getDirtySales()
  if (dirty.length === 0) return 0

  const toUpsert = dirty
    .filter((sale) => !sale.deleted)
    .map(sale => {
      const mapped = mapSaleLocalToCloud(sale)
      console.log('📤 Enviando a Supabase:', {
        sale_date: mapped.sale_date,
        customer_document: mapped.customer_document,
        employee_document: mapped.employee_document
      })
      return mapped
    })

  if (toUpsert.length) {
    try {
      const { error } = await remoteSaleTable().insert(toUpsert)
      if (error) {
        console.error('Error inserting sales to Supabase:', error)
        throw error
      }
      console.log(`✓ ${toUpsert.length} ventas sincronizadas a Supabase`)
    } catch (err) {
      console.error('Sales sync failed:', err.message)
      throw err
    }
  }

  await markSalesClean(dirty.map((sale) => sale.id))
  return dirty.length
}

export async function syncAll() {
  try {
    await pushToCloud()
  } catch (error) {
    console.error('sync push error', error)
  }
  try {
    await pushCustomersToCloud()
  } catch (error) {
    console.error('sync customer push error', error)
  }
  try {
    await pushSalesToCloud()
  } catch (error) {
    console.error('sync sales push error', error)
  }
  try {
    await pullFromCloud()
  } catch (error) {
    console.error('sync pull error', error)
  }
  try {
    await pullCustomersFromCloud()
  } catch (error) {
    console.error('sync customer pull error', error)
  }
}

export async function purgeLegacyItems() {
  const all = await db.items.toArray()
  const staleIds = all
    .filter((it) => it.dirty === 1 && typeof it.item === 'string' && it.item.includes('-'))
    .map((it) => it.id)

  if (staleIds.length) {
    await db.items.bulkDelete(staleIds)
  }
}

export async function clearCatalog() {
  try {
    await supabase
      .schema(SUPABASE_SCHEMA)
      .from(SUPABASE_TABLE)
      .delete()
      .neq('product_id', '')
  } catch (error) {
    console.error('Error clearing Supabase catalog', error)
    throw error
  }

  try {
    await db.items.clear()
  } catch (error) {
    console.error('Error clearing local catalog', error)
    throw error
  }

  try {
    await db.meta?.delete?.(LAST_SYNC_KEY)
  } catch (error) {
    console.warn('No meta store to reset last sync', error)
  }
}

export function watchRealtime() {
  try {
    const productChannel = supabase
      .channel(`realtime:${REMOTE_TABLE}`)
      .on(
        'postgres_changes',
        { event: '*', schema: SUPABASE_SCHEMA, table: SUPABASE_TABLE },
        async (payload) => {
          const raw = payload.new ?? payload.old
          if (!raw) return
          const incoming = mapIncoming(raw)
          await db.table('items').put(incoming)
        }
      )
      .subscribe()

    let customerChannel = null
    try {
      customerChannel = supabase
        .channel(`realtime:${CUSTOMER_REMOTE_TABLE}`)
        .on(
          'postgres_changes',
          { event: '*', schema: SUPABASE_SCHEMA, table: CUSTOMER_TABLE },
          async (payload) => {
            const raw = payload.new ?? payload.old
            if (!raw) return
            const incoming = mapCustomerIncoming(raw)
            if (incoming?.id) {
              await db.table('customers').put(incoming)
            }
          }
        )
        .subscribe()
    } catch (error) {
      console.warn('customer realtime subscription error', error)
    }

    return () => {
      supabase.removeChannel(productChannel)
      if (customerChannel) supabase.removeChannel(customerChannel)
    }
  } catch (error) {
    console.error('realtime subscription error', error)
    return () => {}
  }
}

export function onConnectivityChange(handler) {
  window.addEventListener('online', handler)
  window.addEventListener('offline', handler)
  return () => {
    window.removeEventListener('online', handler)
    window.removeEventListener('offline', handler)
  }
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.forceSync = syncAll
  window.purgeLegacyItems = purgeLegacyItems
  window.clearCatalog = clearCatalog
}
