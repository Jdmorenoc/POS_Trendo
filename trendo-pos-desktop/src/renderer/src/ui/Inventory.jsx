import { useEffect, useState } from 'react'
import { v4 as uuid } from 'uuid'
import { listItems, upsertItem, markDeleted } from '@/lib/db'
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

function ArrowLeftIcon({ className = 'w-5 h-5' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function Inventory({ onBack, onLogout }) {
  const items = useLiveQuery(listItems, [])

  useEffect(() => {
    syncAll()
    const off = watchRealtime()
    const id = setInterval(() => syncAll(), 15_000)
    const offConn = onConnectivityChange(() => { if (navigator.onLine) syncAll() })
    return () => { off(); offConn(); clearInterval(id) }
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
    <div className="h-full flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r p-4 flex flex-col">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center text-white font-bold">T</div>
          <div>
            <div className="text-lg font-semibold">Trendo POS</div>
            <div className="text-xs text-gray-500">Punto de venta</div>
          </div>
        </div>

        <div className="mb-4">
          <button onClick={addItem} className="w-full text-left px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">+ Añadir item</button>
        </div>

        <nav className="flex-1">
          <ul className="space-y-2 text-sm">
            <li className="px-2 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">Dashboard</li>
            <li className="px-2 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">Inventario</li>
            <li className="px-2 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">Sincronización</li>
            <li className="px-2 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">Configuración</li>
          </ul>
        </nav>

        <div className="mt-auto text-xs text-gray-500">{navigator.onLine ? 'Online' : 'Offline'}</div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6">
        <header className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={onBack} title="Volver" className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
              <ArrowLeftIcon />
            </button>
            <h2 className="text-xl font-semibold">Inventario</h2>
          </div>
          <div className="flex items-center gap-3">
            <OnlineBadge />
            <button onClick={() => syncAll()} className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600">Sincronizar</button>
            <button onClick={onLogout} className="px-3 py-2 bg-white text-gray-900 rounded">Cerrar sesión</button>
          </div>
        </header>

        <section>
          <div className="border rounded divide-y divide-gray-200 dark:divide-gray-800">
            {items.map((i) => (
              <div key={i.id} className="p-3 flex items-center gap-3">
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
              </div>
            ))}
            {items.length === 0 && (
              <div className="p-6 text-center text-gray-500">Sin items aún</div>
            )}
          </div>
        </section>

        <footer className="text-xs text-gray-500 mt-6">Demo offline-first. Conflictos se resuelven por updated_at (última escritura gana).</footer>
      </main>
    </div>
  )
}
