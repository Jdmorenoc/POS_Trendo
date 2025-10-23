import { supabase } from './supabase'
import { getDirty, markClean, bulkUpsert, getMeta, setMeta, db } from './db'

const TABLE = 'items'
const LAST_SYNC_KEY = 'lastSyncedAt'

function nowIso() {
  return new Date().toISOString()
}

export async function pullFromCloud() {
  const lastSyncedAt = (await getMeta(LAST_SYNC_KEY)) || '1970-01-01T00:00:00.000Z'
  // Pull changes newer than last sync
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .gt('updated_at', lastSyncedAt)
  if (error) throw error

  // Map to local format (ensure dirty=0)
  const incoming = (data || []).map((r) => ({ ...r, dirty: 0, deleted: r.deleted ? 1 : 0 }))

  // Last writer wins: replace by id if newer
  // Dexie bulkPut will upsert based on primary key
  await bulkUpsert(incoming)
  await setMeta(LAST_SYNC_KEY, nowIso())
  return incoming.length
}

export async function pushToCloud() {
  const dirty = await getDirty()
  if (dirty.length === 0) return 0

  // Perform upserts/deletes
  const toUpsert = dirty.filter((i) => !i.deleted)
  const toDelete = dirty.filter((i) => i.deleted)

  if (toUpsert.length > 0) {
    const { error } = await supabase.from(TABLE).upsert(
      toUpsert.map((i) => ({ id: i.id, title: i.title, updated_at: i.updated_at, deleted: !!i.deleted })),
      { onConflict: 'id' }
    )
    if (error) throw error
  }

  for (const d of toDelete) {
    // Soft-delete in cloud: set deleted=true and update timestamp
    const { error } = await supabase
      .from(TABLE)
      .upsert({ id: d.id, deleted: true, updated_at: d.updated_at })
    if (error) throw error
  }

  await markClean(dirty.map((i) => i.id))
  return dirty.length
}

export async function syncAll() {
  // Push first to reduce conflicts, then pull
  try {
    await pushToCloud()
  } catch (e) {
    // ignore, will retry later
  }
  try {
    await pullFromCloud()
  } catch (e) {
    // ignore
  }
}

export function watchRealtime() {
  try {
    const channel = supabase
      .channel('realtime:' + TABLE)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: TABLE },
        async (payload) => {
          const r = payload.new || payload.old
          if (!r) return
          // Apply change locally. Mark as clean (comes from server)
          await db.table('items').put({ ...r, dirty: 0, deleted: r.deleted ? 1 : 0 })
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  } catch (e) {
    // ignore
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
