import { useEffect, useState } from 'react'
import { listReturns, addReturn, deleteReturn, listItems } from '@/services/db'
import { liveQuery } from 'dexie'
import Sidebar from './Layout/Sidebar'
import Header from './Layout/Header'
import Footer from './Layout/Footer'

function useLiveQuery(fn, deps = []) {
  const [data, setData] = useState([])
  useEffect(() => {
    const sub = liveQuery(fn).subscribe({ next: v => setData(v) })
    return () => sub.unsubscribe()
  }, deps)
  return data
}

export default function Devoluciones({ onBack, onLogout, onNavigate }) {
  const returns = useLiveQuery(listReturns, [])
  const items = useLiveQuery(listItems, [])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ itemId: '', reason: '', amount: '', purchased_at: '' })
  const [error, setError] = useState('')

  async function submit() {
    setError('')
    try {
      if (!form.itemId) throw new Error('Selecciona un producto')
      if (!form.purchased_at) throw new Error('Fecha de compra requerida')
      await addReturn(form)
      setShowForm(false)
      setForm({ itemId: '', reason: '', amount: '', purchased_at: '' })
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="h-full flex bg-white dark:bg-neutral-900 dark:text-gray-100">
      <Sidebar onNavigate={onNavigate} currentView="devoluciones" onLogout={onLogout} />
      <main className="flex-1 p-6 bg-white dark:bg-neutral-900 dark:text-gray-100 flex flex-col">
        <Header onBack={onBack} title="Devoluciones" />

        <div className="mb-6">
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-[#2635dc] text-white rounded hover:bg-[#090f4c] transition-colors flex items-center gap-2"
          >
            Registrar Devolución
          </button>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 w-[420px] shadow-xl border border-gray-200 dark:border-neutral-700">
              <h3 className="text-lg font-semibold mb-4 text-black dark:text-white">Nueva Devolución</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Producto</label>
                  <select
                    value={form.itemId}
                    onChange={e => setForm({ ...form, itemId: e.target.value })}
                    className="w-full border rounded px-2 py-2 bg-white dark:bg-neutral-700 border-gray-300 dark:border-neutral-600 text-black dark:text-gray-100"
                  >
                    <option value="">Selecciona…</option>
                    {items.map(i => (
                      <option key={i.id} value={i.id}>{i.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Motivo</label>
                  <input
                    type="text"
                    value={form.reason}
                    onChange={e => setForm({ ...form, reason: e.target.value })}
                    className="w-full border rounded px-2 py-2 bg-white dark:bg-neutral-700 border-gray-300 dark:border-neutral-600 text-black dark:text-gray-100"
                    placeholder="Defecto, talla, etc"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Monto</label>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    className="w-full border rounded px-2 py-2 bg-white dark:bg-neutral-700 border-gray-300 dark:border-neutral-600 text-black dark:text-gray-100"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha de Compra</label>
                  <input
                    type="date"
                    value={form.purchased_at}
                    onChange={e => setForm({ ...form, purchased_at: e.target.value })}
                    className="w-full border rounded px-2 py-2 bg-white dark:bg-neutral-700 border-gray-300 dark:border-neutral-600 text-black dark:text-gray-100"
                  />
                </div>
                {error && <div className="text-sm text-red-600">{error}</div>}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => { setShowForm(false); setError('') }}
                    className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-neutral-700 rounded hover:bg-gray-200 dark:hover:bg-neutral-600"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={submit}
                    className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <section>
          <div className="border border-[#a6a6a6] dark:border-neutral-700 rounded-lg divide-y divide-[#a6a6a6] dark:divide-neutral-700 bg-white dark:bg-neutral-800">
            {returns.map(r => (
              <div key={r.id} className="p-3 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-neutral-700/60">
                <div className="flex-1">
                  <div className="font-medium text-black dark:text-white">{items.find(i => i.id === r.itemId)?.title || 'Producto'}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Motivo: {r.reason || '—'} · Monto: ${r.amount || 0}</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">Compra: {r.purchased_at} · Registro: {new Date(r.created_at).toLocaleDateString('es-ES')}</div>
                </div>
                <button
                  onClick={() => deleteReturn(r.id)}
                  className="px-2 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                >Eliminar</button>
              </div>
            ))}
            {returns.length === 0 && (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">Sin devoluciones registradas</div>
            )}
          </div>
        </section>
        <div className="mt-auto">
          <Footer compact />
        </div>
      </main>
    </div>
  )
}
