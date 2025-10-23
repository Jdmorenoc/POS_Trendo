import Dexie from 'dexie'

export const db = new Dexie('trendo_pos')

// Schema for IndexedDB
// items: id (primary key), title, updated_at, dirty, deleted
// sync: key-value store for metadata like lastSyncedAt

db.version(1).stores({
  items: 'id, updated_at, dirty, deleted',
  meta: 'key'
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
  const toSave = { ...item, updated_at: item.updated_at || now, dirty: 1, deleted: item.deleted ? 1 : 0 }
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
