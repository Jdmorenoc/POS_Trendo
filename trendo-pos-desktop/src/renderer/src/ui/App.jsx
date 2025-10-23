import React, { useEffect, useState } from 'react'
import { v4 as uuid } from 'uuid'
import { db, listItems, upsertItem, markDeleted } from '@/lib/db'
import { onConnectivityChange, syncAll, watchRealtime } from '@/lib/sync'
import { liveQuery } from 'dexie'

function OnlineBadge() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => onConnectivityChange(() => setOnline(navigator.onLine)), [])
  return (
    <span className={`px-2 py-1 rounded text-xs ${online ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
      {online ? 'Online' : 'Offline'}
    </span>
  )
}

function useLiveQuery(queryFn, deps = []) {
  const [data, setData] = useState([])
  useEffect(() => {
    const subscription = liveQuery(queryFn).subscribe({
      next: (value) => setData(value)
    })
    return () => subscription.unsubscribe()
  }, deps)
  return data
}

export default function App() {
  const items = useLiveQuery(listItems, [])

  useEffect(() => {
    // initial sync
    syncAll()
    // realtime
    const off = watchRealtime()
    // periodic sync
    const id = setInterval(() => syncAll(), 15_000)
    // connectivity
    const offConn = onConnectivityChange(() => {
      if (navigator.onLine) syncAll()
    })
    return () => {
      off()
      offConn()
      clearInterval(id)
    }
  }, [])

  async function addItem() {
    const id = uuid()
    await upsertItem({ id, title: 'Nuevo item', deleted: 0 })
    if (navigator.onLine) await syncAll()
  }

  async function updateItem(id, title) {
    await upsertItem({ id, title })
    if (navigator.onLine) await syncAll()
  }

  async function deleteItem(id) {
    await markDeleted(id)
    if (navigator.onLine) await syncAll()
  }

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Trendo POS</h1>
        <OnlineBadge />
      </header>

      <div className="flex gap-2">
        <button onClick={addItem} className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Añadir</button>
        <button onClick={() => syncAll()} className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600">Sincronizar</button>
      </div>

      <ul className="divide-y divide-gray-200 dark:divide-gray-800 border rounded">
        {items.map((i) => (
          <li key={i.id} className="p-3 flex items-center gap-3">
            <input
              defaultValue={i.title}
              onBlur={(e) => updateItem(i.id, e.target.value)}
              className="flex-1 bg-transparent outline-none border-b border-transparent focus:border-blue-400"
            />
            {i.dirty ? (
              <span className="text-xs text-amber-600">pendiente</span>
            ) : (
              <span className="text-xs text-gray-400">ok</span>
            )}
            <button onClick={() => deleteItem(i.id)} className="px-2 py-1 text-red-600 hover:bg-red-50 rounded">Eliminar</button>
          </li>
        ))}
        {items.length === 0 && (
          <li className="p-6 text-center text-gray-500">Sin items aún</li>
        )}
      </ul>

      <footer className="text-xs text-gray-500">Demo offline-first. Conflictos se resuelven por updated_at (última escritura gana).</footer>
    </div>
  )
}
