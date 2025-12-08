import { supabase } from './supabaseClient'
import { getDirty, markClean, bulkUpsert, setMeta, db } from './db'

const SUPABASE_SCHEMA = 'trendo'
const SUPABASE_TABLE = 'product'
const REMOTE_TABLE = `${SUPABASE_SCHEMA}.${SUPABASE_TABLE}`
const LAST_SYNC_KEY = 'trendo.product:lastSyncedAt'
const SIZE_FIELDS = ['xs', 's', 'm', 'l', 'xl']

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

  return {
    id: productId,
    item: productId,
    title: record.product_name || productId,
    price,
    description: record.description || '',
    gender: record.gender || 'Unisex',
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
    ...sizes
  }
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

export async function syncAll() {
  try {
    await pushToCloud()
  } catch (error) {
    console.error('sync push error', error)
  }
  try {
    await pullFromCloud()
  } catch (error) {
    console.error('sync pull error', error)
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
    const channel = supabase
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

    return () => supabase.removeChannel(channel)
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
