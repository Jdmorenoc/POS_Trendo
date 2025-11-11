import { useEffect, useState, useMemo } from 'react'
import { v4 as uuid } from 'uuid'
import { listItems, upsertItem, markDeleted, findItemByCode } from '@/lib/db'
import { onConnectivityChange, syncAll, watchRealtime } from '@/lib/sync'
import { liveQuery } from 'dexie'
import Sidebar from './Layout/Sidebar'
import Header from './Layout/Header'
import Footer from './Layout/Footer'

// Longitud máxima permitida para el código ITEM (SKU)
const MAX_SKU = 16

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
    item: '',
    title: '',
    price: '',
    xs: '',
    s: '',
    m: '',
    l: '',
    xl: '',
    gender: 'Unisex',
    description: ''
  })
  const [showEditForm, setShowEditForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const [errorAdd, setErrorAdd] = useState('')
  const [errorEdit, setErrorEdit] = useState('')
  // Modal de búsqueda por ITEM
  const [showItemLookup, setShowItemLookup] = useState(false)
  const [itemLookupCode, setItemLookupCode] = useState('')
  const [itemLookupResult, setItemLookupResult] = useState(null)
  const [itemLookupError, setItemLookupError] = useState('')
  const [itemLookupLoading, setItemLookupLoading] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter(i => (i.title || '').toLowerCase().includes(q) || (i.id || '').toLowerCase().includes(q) || (i.item || '').toLowerCase().includes(q))
  }, [items, search])

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

  function openItemLookup() {
    setItemLookupCode('')
    setItemLookupResult(null)
    setItemLookupError('')
    setShowItemLookup(true)
  }

  async function performItemLookup(code) {
    const q = (code ?? itemLookupCode).trim()
    setItemLookupError('')
    setItemLookupResult(null)
    if (!q) {
      setItemLookupError('Ingresa un código ITEM')
      return
    }
    if (q.length > MAX_SKU) {
      setItemLookupError(`Máximo ${MAX_SKU} caracteres`)
      return
    }
    setItemLookupLoading(true)
    try {
      const found = await findItemByCode(q)
      if (!found) {
        setItemLookupError('No se encontró el ITEM')
        setItemLookupResult(null)
      } else {
        setItemLookupResult(found)
      }
    } finally {
      setItemLookupLoading(false)
    }
  }

  async function handleSubmit() {
    const id = uuid()
    setErrorAdd('')
    const code = (newProduct.item || '').trim()
    if (!code) {
      setErrorAdd('El ITEM es requerido')
      return
    }
    if (code.length > MAX_SKU) {
      setErrorAdd(`Máximo ${MAX_SKU} caracteres`)
      return
    }
    // Validate duplicate ITEM code
    const existing = await findItemByCode(code)
    if (existing) {
      setErrorAdd('ITEM ya existe, elige otro código')
      return
    }
    await upsertItem({ 
      id, 
      item: code,
      title: newProduct.title || 'Nuevo item',
      price: parseFloat(newProduct.price) || 0,
      xs: parseInt(newProduct.xs) || 0,
      s: parseInt(newProduct.s) || 0,
      m: parseInt(newProduct.m) || 0,
      l: parseInt(newProduct.l) || 0,
      xl: parseInt(newProduct.xl) || 0,
      gender: newProduct.gender || 'Unisex',
      description: newProduct.description,
      deleted: 0 
    })
    if (navigator.onLine) await syncAll()
    setShowAddForm(false)
  setNewProduct({ item: '', title: '', price: '', xs: '', s: '', m: '', l: '', xl: '', gender: 'Unisex', description: '' })
  }

  function openEdit(item) {
    setEditing({
      id: item.id,
      title: item.title || '',
      price: item.price || 0,
      xs: item.xs || 0,
      s: item.s || 0,
      m: item.m || 0,
      l: item.l || 0,
      xl: item.xl || 0,
      description: item.description || '',
      gender: item.gender || 'Unisex',
      item: item.item || ''
    })
    setShowEditForm(true)
  }

  async function handleEditSubmit() {
    if (!editing) return
    setErrorEdit('')
    const { id, ...rest } = editing
    const code = (rest.item || '').trim()
    if (!code) {
      setErrorEdit('El ITEM es requerido')
      return
    }
    if (code.length > MAX_SKU) {
      setErrorEdit(`Máximo ${MAX_SKU} caracteres`)
      return
    }
    const existing = await findItemByCode(code)
    if (existing && existing.id !== id) {
      setErrorEdit('ITEM ya existe, elige otro código')
      return
    }
  const patch = { ...rest, item: code, gender: rest.gender || 'Unisex' }
    await upsertItem({ id, ...patch })
    if (navigator.onLine) await syncAll()
    setShowEditForm(false)
    setEditing(null)
  }

  

  async function deleteItem(item) {
    const label = item.title || item.item || (item.id ? item.id.slice(0,8) : '')
    const ok = window.confirm(`¿Eliminar "${label}"? Esta acción no se puede deshacer.`)
    if (!ok) return
    await markDeleted(item.id)
    if (navigator.onLine) await syncAll()
  }

  return (
    <div className="h-full flex bg-white dark:bg-neutral-900 dark:text-gray-100">
      <Sidebar onNavigate={onNavigate} currentView="inventory" onLogout={onLogout} />
      <main className="flex-1 p-6 bg-white dark:bg-neutral-900 dark:text-gray-100 flex flex-col">
        <Header onBack={onBack} syncAll={syncAll} title="Productos" showBack={true} />

        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center gap-3 max-w-3xl">
            <button
              onClick={openItemLookup}
              className="px-3 py-2 text-sm rounded-md border border-gray-600 dark:border-neutral-600 bg-black dark:bg-neutral-800 text-white dark:text-gray-100 hover:bg-gray-500 dark:hover:bg-neutral-700"
              title="Buscar existencias por ITEM"
            >
              Buscar por ITEM
            </button>

          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-300">Gestiona el catálogo de productos de la tienda</div>
            <div className="flex items-center gap-3">
              <button className="px-3 py-2 text-sm rounded-md border border-gray-400 hover:bg-green-600 bg-white text-gray-700 hover:text-white items-center gap-2" title="Importar Excel">Importar Excel</button>
              <button
                onClick={addItem}
                className="px-4 py-2 text-sm rounded-md bg-black text-white hover:bg-gray-900 flex items-center gap-2"
              >
                <span className="text-lg leading-none">+</span>
                Agregar Producto
              </button>
            </div>
          </div>
        </div>

        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-lg p-6 w-96 shadow-xl border border-gray-200">
              <h3 className="text-lg font-semibold mb-4 text-black">Agregar Nuevo Producto</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">ITEM</label>
                  <input
                    type="text"
                    value={newProduct.item}
                    onChange={(e) => setNewProduct({...newProduct, item: e.target.value})}
                    maxLength={MAX_SKU}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white text-black"
                    placeholder="Código único (ej. SKU)"
                  />
                  {errorAdd && <div className="mt-1 text-xs text-red-600">{errorAdd}</div>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-black">Nombre del Producto</label>
                  <input
                    type="text"
                    value={newProduct.title}
                    onChange={(e) => setNewProduct({...newProduct, title: e.target.value})}
                    className="mt-1 block w-full rounded-md border-[#a6a6a6] shadow-sm focus:border-[#a6a6a6] focus:ring-[#a6a6a6] bg-white text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Género</label>
                  <select
                    value={newProduct.gender}
                    onChange={e => setNewProduct({ ...newProduct, gender: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white text-black text-sm"
                  >
                    <option>Unisex</option>
                    <option>Hombre</option>
                    <option>Mujer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock por talla</label>
                  <div className="grid grid-cols-5 gap-2">
                    {['xs','s','m','l','xl'].map(size => (
                      <input key={size}
                        type="number"
                        value={newProduct[size] || ''}
                        onChange={e => setNewProduct({ ...newProduct, [size]: e.target.value })}
                        placeholder={size.toUpperCase()}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-2 py-1 text-sm bg-white text-black"
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Precio</label>
                  <input
                    type="number"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white text-black"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Descripción</label>
                  <textarea
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white text-black"
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
          <div className="border border-gray-300 dark:border-neutral-700 rounded-lg overflow-hidden bg-white dark:bg-neutral-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-neutral-800 text-gray-700 dark:text-gray-200">
                <tr className="text-left">
                  <th className="font-medium px-3 py-2 border-b border-gray-300 dark:border-neutral-700 w-24">ITEM</th>
                  <th className="font-medium px-3 py-2 border-b border-gray-300 dark:border-neutral-700">Nombre</th>
                  <th className="font-medium px-3 py-2 border-b border-gray-300 dark:border-neutral-700 w-24">Género</th>
                  <th className="font-medium px-3 py-2 border-b border-gray-300 dark:border-neutral-700 w-20">XS</th>
                  <th className="font-medium px-3 py-2 border-b border-gray-300 dark:border-neutral-700 w-20">S</th>
                  <th className="font-medium px-3 py-2 border-b border-gray-300 dark:border-neutral-700 w-20">M</th>
                  <th className="font-medium px-3 py-2 border-b border-gray-300 dark:border-neutral-700 w-20">L</th>
                  <th className="font-medium px-3 py-2 border-b border-gray-300 dark:border-neutral-700 w-20">XL</th>
                  <th className="font-medium px-3 py-2 border-b border-gray-300 dark:border-neutral-700 w-24">Total</th>
                  <th className="font-medium px-3 py-2 border-b border-gray-300 dark:border-neutral-700 w-32">Estado</th>
                  <th className="font-medium px-3 py-2 border-b border-gray-300 dark:border-neutral-700 w-32">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
                {filtered.map(i => (
                  <tr key={i.id} className="hover:bg-gray-50 dark:hover:bg-neutral-800">
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-300 text-xs font-mono">{i.item || i.id.slice(0,8)}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-sm text-black dark:text-gray-100">{i.title}</div>
                      {i.description && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{i.description}</div>}
                    </td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-200 text-xs">{i.gender || 'Unisex'}</td>
                    {['xs','s','m','l','xl'].map(size => (
                      <td key={size} className="px-3 py-2 text-gray-700 dark:text-gray-200">
                        {i[size] || 0}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-200 font-medium">{i.quantity || 0}</td>
                    <td className="px-3 py-2">
                      {i.dirty ? (
                        <span className="px-2 py-1 rounded text-xs bg-amber-100 text-amber-700">Pendiente</span>
                      ) : (
                        <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700">OK</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(i)}
                          title="Editar"
                          aria-label="Editar"
                          className="w-8 h-8 rounded border border-gray-300 dark:border-neutral-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-800 flex items-center justify-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                        </button>
                        <button
                          onClick={() => deleteItem(i)}
                          title="Eliminar"
                          aria-label="Eliminar"
                          className="w-8 h-8 rounded border border-red-200 dark:border-red-400/40 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center text-gray-500 dark:text-gray-400">Sin productos</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {showItemLookup && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm z-50">
            <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 w-[28rem] shadow-xl border border-gray-200 dark:border-neutral-700">
              <h3 className="text-lg font-semibold mb-4 text-black dark:text-white">Buscar por ITEM</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Código ITEM</label>
                  <input
                    autoFocus
                    type="text"
                    value={itemLookupCode}
                    onChange={e => { setItemLookupCode(e.target.value); setItemLookupError('') }}
                    onKeyDown={e => { if (e.key === 'Enter') performItemLookup() }}
                    maxLength={MAX_SKU}
                    placeholder="Ej. SKU-123"
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-black dark:text-gray-100 px-3 py-2 text-sm"
                  />
                  {itemLookupError && <div className="mt-1 text-xs text-red-500">{itemLookupError}</div>}
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowItemLookup(false)}
                    className="px-3 py-2 text-sm rounded-md bg-gray-100 dark:bg-neutral-700 text-gray-800 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-neutral-600"
                  >
                    Cerrar
                  </button>
                  <button
                    onClick={() => performItemLookup()}
                    disabled={itemLookupLoading}
                    className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {itemLookupLoading ? 'Buscando…' : 'Buscar'}
                  </button>
                </div>

                {itemLookupResult && (
                  <div className="mt-4 border-t border-gray-200 dark:border-neutral-700 pt-4">
                    <div className="mb-3">
                      <div className="text-sm font-medium text-black dark:text-white">{itemLookupResult.title || '—'}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">ITEM: <span className="font-mono">{itemLookupResult.item}</span> • {itemLookupResult.gender || 'Unisex'}</div>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {['xs','s','m','l','xl'].map(sz => {
                        const qty = itemLookupResult[sz] || 0
                        return (
                          <div key={sz} className="p-3 rounded-md border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-700/40 text-center">
                            <div className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-300">{sz}</div>
                            <div className="text-lg font-semibold text-black dark:text-white">{qty}</div>
                            {qty === 0 && <div className="text-[10px] text-red-500 mt-1">Sin stock</div>}
                          </div>
                        )
                      })}
                    </div>
                    <div className="mt-3 text-xs text-gray-600 dark:text-gray-300">Total: <span className="font-semibold">{itemLookupResult.quantity || 0}</span></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {showEditForm && editing && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 w-96 shadow-xl border border-gray-200 dark:border-neutral-700">
              <h3 className="text-lg font-semibold mb-4 text-black dark:text-white">Editar Producto</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ITEM</label>
                  <input
                    type="text"
                    value={editing.item}
                    onChange={e => setEditing({ ...editing, item: e.target.value })}
                    maxLength={MAX_SKU}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-black dark:text-gray-100"
                    placeholder="Código único"
                  />
                  {errorEdit && <div className="mt-1 text-xs text-red-500">{errorEdit}</div>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-black dark:text-gray-200">Nombre del Producto</label>
                  <input
                    type="text"
                    value={editing.title}
                    onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                    className="mt-1 block w-full rounded-md border-[#a6a6a6] dark:border-neutral-600 shadow-sm focus:border-[#a6a6a6] focus:ring-[#a6a6a6] bg-white dark:bg-neutral-700 text-black dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Género</label>
                  <select
                    value={editing.gender}
                    onChange={e => setEditing({ ...editing, gender: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-black dark:text-gray-100 text-sm"
                  >
                    <option>Unisex</option>
                    <option>Hombre</option>
                    <option>Mujer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stock por talla</label>
                  <div className="grid grid-cols-5 gap-2">
                    {['xs','s','m','l','xl'].map(size => (
                      <input key={size}
                        type="number"
                        value={editing[size] || ''}
                        onChange={e => setEditing({ ...editing, [size]: parseInt(e.target.value||'0') })}
                        placeholder={size.toUpperCase()}
                        className="w-full rounded-md border-gray-300 dark:border-neutral-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-2 py-1 text-sm bg-white dark:bg-neutral-700 text-black dark:text-gray-100"
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Precio</label>
                  <input
                    type="number"
                    value={editing.price}
                    onChange={(e) => setEditing({ ...editing, price: parseFloat(e.target.value||'0') })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-neutral-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-black dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descripción</label>
                  <textarea
                    value={editing.description}
                    onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-neutral-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white dark:bg-neutral-700 text-black dark:text-gray-100"
                    rows="3"
                  ></textarea>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => { setShowEditForm(false); setEditing(null) }}
                    className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-neutral-700 rounded-md hover:bg-gray-200 dark:hover:bg-neutral-600"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleEditSubmit}
                    className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-auto">
          <Footer compact />
        </div>
      </main>
    </div>
  )
}
