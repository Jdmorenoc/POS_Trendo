import { useEffect, useState } from 'react'
import { v4 as uuid } from 'uuid'
import { listItems, upsertItem, markDeleted } from '@/lib/db'
import { onConnectivityChange, syncAll, watchRealtime } from '@/lib/sync'
import { liveQuery } from 'dexie'
import Sidebar from './Layout/Sidebar'
import Header from './Layout/Header'
import Footer from './Layout/Footer'

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

export default function Inventory({ onBack, onLogout, onNavigate }) {
  const items = useLiveQuery(listItems, [])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newProduct, setNewProduct] = useState({
    title: '',
    price: '',
    quantity: '',
    description: ''
  })

  useEffect(() => {
    syncAll()
    const off = watchRealtime()
    const id = setInterval(() => syncAll(), 15_000)
    const offConn = onConnectivityChange(() => { if (navigator.onLine) syncAll() })
    return () => { off(); offConn(); clearInterval(id) }
  }, [])

  async function addItem() {
    setShowAddForm(true)
  }

  async function handleSubmit() {
    const id = uuid()
    await upsertItem({ 
      id, 
      title: newProduct.title || 'Nuevo item',
      price: parseFloat(newProduct.price) || 0,
      quantity: parseInt(newProduct.quantity) || 0,
      description: newProduct.description,
      deleted: 0 
    })
    if (navigator.onLine) await syncAll()
    setShowAddForm(false)
    setNewProduct({
      title: '',
      price: '',
      quantity: '',
      description: ''
    })
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
    <div className="h-full flex bg-white">
      <Sidebar onNavigate={onNavigate} currentView="inventory" onLogout={onLogout} />
      
      <main className="flex-1 p-6 pb-24 bg-white">
        <Header onBack={onBack} syncAll={syncAll} />
        
        <div className="mb-6">
          <button 
            onClick={addItem} 
            className="px-4 py-2 bg-[#a6a6a6] text-white rounded hover:bg-gray-600 transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="12" y1="5" x2="12" y2="19" strokeWidth="2" strokeLinecap="round"/>
              <line x1="5" y1="12" x2="19" y2="12" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Añadir Producto
          </button>
        </div>

        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
              <h3 className="text-lg font-semibold mb-4 text-black">Agregar Nuevo Producto</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-black">Nombre del Producto</label>
                  <input
                    type="text"
                    value={newProduct.title}
                    onChange={(e) => setNewProduct({...newProduct, title: e.target.value})}
                    className="mt-1 block w-full rounded-md border-[#a6a6a6] shadow-sm focus:border-[#a6a6a6] focus:ring-[#a6a6a6]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Precio</label>
                  <input
                    type="number"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Cantidad</label>
                  <input
                    type="number"
                    value={newProduct.quantity}
                    onChange={(e) => setNewProduct({...newProduct, quantity: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Descripción</label>
                  <textarea
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    rows="3"
                  ></textarea>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <section>
          <div className="border border-[#a6a6a6] rounded-lg divide-y divide-[#a6a6a6]">
            {items.map((i) => (
              <div key={i.id} className="p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                <div className="flex-1 space-y-1">
                  <input
                    defaultValue={i.title}
                    onBlur={(e) => updateItem(i.id, {...i, title: e.target.value})}
                    className="w-full bg-transparent outline-none border-b border-transparent focus:border-[#a6a6a6] font-medium text-black"
                  />
                  <div className="flex gap-4 text-sm text-gray-600">
                    <span>Precio: ${i.price || 0}</span>
                    <span>Cantidad: {i.quantity || 0}</span>
                  </div>
                  {i.description && (
                    <div className="text-sm text-gray-500">{i.description}</div>
                  )}
                </div>
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

        <Footer />
      </main>
    </div>
  )
}
