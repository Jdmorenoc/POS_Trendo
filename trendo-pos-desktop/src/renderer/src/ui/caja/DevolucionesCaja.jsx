import { useEffect, useState, useMemo } from 'react'
import { listReturns, addReturn, deleteReturn, listItems, findItemByCode, getActiveShift } from '@/services/db'
import { formatCOP } from '@/lib/currency'
import { liveQuery } from 'dexie'
import SidebarCaja from './Layout/Sidebar'
import { useScanner } from '@/lib/useScanner'

function useLiveQuery(fn, deps = []) {
  const [data, setData] = useState([])
  useEffect(() => {
    const sub = liveQuery(fn).subscribe({ next: v => setData(v) })
    return () => sub.unsubscribe()
  }, deps)
  return data
}

export default function DevolucionesCaja({ onBack, onLogout, onNavigate }) {
  const returns = useLiveQuery(listReturns, [])
  const items = useLiveQuery(listItems, [])
  
  // Estados de turno
  const [activeShift, setActiveShift] = useState(null)
  const [shiftLoading, setShiftLoading] = useState(true)
  
  // Estados del formulario de búsqueda
  const [search, setSearch] = useState('')
  const [foundItem, setFoundItem] = useState(null)
  const [toast, setToast] = useState(null)

  // Estados del carrito de devoluciones
  const [devolutionList, setDevolutionList] = useState([])

  // Estados del formulario de devolución
  const [devForm, setDevForm] = useState({
    purchasedAt: '',
    reason: ''
  })

  // Estados de compra con crédito
  const [creditMode, setCreditMode] = useState(false)
  const [creditAmount, setCreditAmount] = useState(0)
  const [newCart, setNewCart] = useState([])
  const [newSearch, setNewSearch] = useState('')
  const [newFoundItem, setNewFoundItem] = useState(null)

  // Verificar turno activo al montar
  useEffect(() => {
    async function checkShift() {
      try {
        const shift = await getActiveShift()
        setActiveShift(shift)
      } catch (e) {
        console.error('Error verificando turno:', e)
        setActiveShift(null)
      } finally {
        setShiftLoading(false)
      }
    }
    checkShift()
  }, [])

  useScanner({ onScan: code => { 
    if (creditMode) {
      handleNewLookup(code)
    } else {
      setSearch(code)
      handleLookup(code)
    }
  } })

  function showToast(msg, type = 'info') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  async function handleLookup(val) {
    const code = String(val || search).trim()
    if (!code) { setFoundItem(null); return }
    const item = await findItemByCode(code)
    setFoundItem(item || null)
    if (!item) showToast('Producto no encontrado', 'error')
  }

  function addDevolution() {
    if (!foundItem) return showToast('Selecciona un producto', 'error')
    if (!devForm.purchasedAt) return showToast('Fecha de compra requerida', 'error')
    if (!devForm.reason) return showToast('Motivo requerido', 'error')

    const refundAmt = foundItem.price || 0

    setDevolutionList([...devolutionList, {
      id: `dev_${Date.now()}`,
      itemId: foundItem.id,
      itemName: foundItem.title || foundItem.item,
      itemCode: foundItem.item || foundItem.id.slice(0, 8),
      itemPrice: foundItem.price || 0,
      purchasedAt: devForm.purchasedAt,
      reason: devForm.reason,
      refundAmount: refundAmt
    }])

    setFoundItem(null)
    setSearch('')
    setDevForm({ purchasedAt: '', reason: '' })
    showToast('Artículo agregado a devolución', 'success')
  }

  function removeDevolution(id) {
    setDevolutionList(devolutionList.filter(d => d.id !== id))
  }

  const totalRefund = useMemo(() => {
    return devolutionList.reduce((sum, d) => sum + d.refundAmount, 0)
  }, [devolutionList])

  async function submitDevoluciones() {
    if (!activeShift) return showToast('No hay un turno abierto', 'error')
    if (devolutionList.length === 0) return showToast('Sin artículos en devolución', 'error')

    try {
      for (const dev of devolutionList) {
        await addReturn({
          itemId: dev.itemId,
          reason: dev.reason,
          amount: dev.refundAmount,
          purchased_at: dev.purchasedAt,
          shiftId: activeShift.id
        })
      }

      const total = devolutionList.reduce((sum, d) => sum + d.refundAmount, 0)
      setCreditAmount(total)
      setCreditMode(true)
      setNewCart([])
      setNewSearch('')
      setNewFoundItem(null)
      showToast(`${devolutionList.length} devolución(es) registrada(s)`, 'success')
      setDevolutionList([])
      setDevForm({ purchasedAt: '', reason: '' })
      setFoundItem(null)
      setSearch('')
    } catch (e) {
      showToast('Error al registrar devoluciones', 'error')
      console.error(e)
    }
  }

  async function handleNewLookup(val) {
    const code = String(val || newSearch).trim()
    if (!code) { setNewFoundItem(null); return }
    const item = await findItemByCode(code)
    setNewFoundItem(item || null)
    if (!item) showToast('Producto no encontrado', 'error')
  }

  function addToNewCart() {
    if (!newFoundItem) return showToast('Selecciona un producto', 'error')
    
    setNewCart([...newCart, {
      id: `cart_${Date.now()}`,
      itemId: newFoundItem.id,
      itemName: newFoundItem.title || newFoundItem.item,
      itemCode: newFoundItem.item || newFoundItem.id.slice(0, 8),
      price: newFoundItem.price || 0,
      quantity: 1
    }])

    setNewFoundItem(null)
    setNewSearch('')
    showToast('Producto agregado', 'success')
  }

  function removeFromNewCart(id) {
    setNewCart(newCart.filter(item => item.id !== id))
  }

  const newCartTotal = useMemo(() => {
    return newCart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  }, [newCart])

  const balance = useMemo(() => {
    return creditAmount - newCartTotal
  }, [creditAmount, newCartTotal])

  function proceedToPayment() {
    if (newCart.length === 0) return showToast('Agrega productos a la compra', 'error')
    
    // Pasar al componente Payment con los datos
    onNavigate('payment', {
      items: newCart,
      creditMode: true,
      creditAmount: creditAmount,
      totalSale: newCartTotal,
      balance: balance
    })
  }

  return (
    <div className="h-full flex bg-white dark:bg-neutral-900 dark:text-gray-100">
      <SidebarCaja onNavigate={onNavigate} currentView="devoluciones" />
      <main className="flex-1 p-8 bg-white dark:bg-neutral-900 dark:text-gray-100 min-h-screen">
        {shiftLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-xl text-gray-500 dark:text-gray-400 mb-2">Verificando turno...</div>
            </div>
          </div>
        ) : !activeShift ? (
          <div className="flex items-center justify-center h-full">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 rounded-lg p-8 max-w-md text-center">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">⚠️</div>
              <h2 className="text-xl font-semibold text-red-900 dark:text-red-300 mb-2">No hay turno abierto</h2>
              <p className="text-sm text-red-700 dark:text-red-400 mb-4">
                Debes abrir un turno antes de registrar devoluciones.
              </p>
              <button
                onClick={onBack}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
              >
                Volver
              </button>
            </div>
          </div>
        ) : creditMode ? (
          <>
            <header className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <button onClick={() => setCreditMode(false)} title="Volver" className="p-2 rounded bg-black text-white hover:bg-gray-900 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                    <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <h2 className="text-2xl font-semibold text-black dark:text-white">Compra con Crédito</h2>
              </div>
              <button onClick={onLogout} className="px-3 py-2 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 rounded border border-gray-300 dark:border-neutral-700 hover:bg-gray-100 dark:hover:bg-neutral-700">Cerrar sesión</button>
            </header>

            {/* Mostrar crédito disponible */}
            <div className="mb-6 p-6 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg">
              <div className="text-sm font-medium opacity-90 mb-2">Valor a Favor (Crédito Disponible)</div>
              <div className="text-5xl font-bold">{formatCOP(creditAmount)}</div>
            </div>

            {/* Toast */}
            {toast && (
              <div className="fixed right-6 top-6 z-50">
                <div className={`${toast.type === 'error' ? 'bg-red-600' : toast.type === 'success' ? 'bg-green-600' : 'bg-black'} text-white px-4 py-3 rounded shadow-lg text-sm`}>
                  {toast.msg}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Panel Izquierdo: Búsqueda de productos */}
              <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 p-4">
                <h3 className="font-medium mb-3 text-black dark:text-white">Agregar Productos</h3>
                
                <label className="block text-sm mb-1 text-black dark:text-gray-200">Buscar (Código / Nombre / Escáner)</label>
                <input
                  value={newSearch}
                  onChange={e => { setNewSearch(e.target.value) }}
                  onBlur={() => handleNewLookup(newSearch)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleNewLookup(newSearch) } }}
                  className="w-full bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 rounded px-3 py-2 border border-gray-300 dark:border-neutral-600 mb-3"
                  placeholder="Escanee o escriba y Enter"
                  autoFocus
                />

                {newFoundItem ? (
                  <div className="space-y-3 p-3 rounded bg-gray-50 dark:bg-neutral-700/50 border border-gray-200 dark:border-neutral-600">
                    <div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">ITEM: <span className="font-semibold text-black dark:text-white">{newFoundItem.item}</span></div>
                      <div className="text-sm font-medium text-black dark:text-white mt-1">{newFoundItem.title || '—'}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Precio: <span className="font-semibold text-black dark:text-white">{formatCOP(newFoundItem.price || 0)}</span></div>
                    </div>

                    <button
                      onClick={addToNewCart}
                      className="w-full px-3 py-2 rounded bg-black text-white hover:bg-gray-900 dark:bg-white dark:text-black dark:hover:bg-gray-200 text-sm font-medium transition-colors"
                    >
                      Agregar al Carrito
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 dark:text-gray-400 p-3 text-center">Ingrese código y presione Enter</div>
                )}
              </div>

              {/* Panel Derecho: Carrito y resumen */}
              <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 p-4">
                <h3 className="font-medium mb-3 text-black dark:text-white">Carrito de Compra</h3>
                
                <div className="space-y-3">
                  {/* Items en carrito */}
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {newCart.map(item => (
                      <div key={item.id} className="p-2 rounded bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/40 text-xs flex justify-between items-start">
                        <div>
                          <div className="font-medium text-blue-900 dark:text-blue-300">{item.itemName}</div>
                          <div className="text-blue-700 dark:text-blue-400 mt-1">
                            {formatCOP(item.price)} x {item.quantity} = {formatCOP(item.price * item.quantity)}
                          </div>
                        </div>
                        <button
                          onClick={() => removeFromNewCart(item.id)}
                          className="text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 p-1 rounded"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {newCart.length === 0 && (
                      <div className="text-xs text-gray-400 dark:text-gray-500 text-center p-4">
                        No hay productos agregados
                      </div>
                    )}
                  </div>

                  {/* Resumen */}
                  <div className="border-t border-gray-200 dark:border-neutral-700 pt-3 space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Total de Compra:</span>
                      <span className="font-semibold text-black dark:text-white">{formatCOP(newCartTotal)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Crédito Disponible:</span>
                      <span className="font-semibold text-green-600 dark:text-green-400">{formatCOP(creditAmount)}</span>
                    </div>
                    
                    {/* Mostrar balance */}
                    {newCart.length > 0 && (
                      <div className={`p-3 rounded text-sm font-semibold text-center ${
                        balance >= 0 
                          ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' 
                          : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                      }`}>
                        {balance >= 0 
                          ? `Cambio a Favor: ${formatCOP(balance)}` 
                          : `EXCEDE: ${formatCOP(Math.abs(balance))} (Cliente debe pagar)`}
                      </div>
                    )}

                    <button
                      onClick={proceedToPayment}
                      disabled={newCart.length === 0}
                      className="w-full px-4 py-3 rounded bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2"
                    >
                      Proceder a Pago
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <header className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <button onClick={onBack} title="Volver" className="p-2 rounded bg-black text-white hover:bg-gray-900 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                    <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <h2 className="text-2xl font-semibold text-black dark:text-white">Devoluciones</h2>
                <span className="text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">Turno Activo</span>
              </div>
              <button onClick={onLogout} className="px-3 py-2 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 rounded border border-gray-300 dark:border-neutral-700 hover:bg-gray-100 dark:hover:bg-neutral-700">Cerrar sesión</button>
            </header>

            {/* Toast */}
            {toast && (
              <div className="fixed right-6 top-6 z-50">
                <div className={`${toast.type === 'error' ? 'bg-red-600' : toast.type === 'success' ? 'bg-green-600' : 'bg-black'} text-white px-4 py-3 rounded shadow-lg text-sm`}>
                  {toast.msg}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
              {/* Panel Izquierdo: Búsqueda y Artículos */}
              <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 p-4 lg:col-span-1">
                <h3 className="font-medium mb-3 text-black dark:text-white">Búsqueda de Artículos</h3>
                
                <label className="block text-sm mb-1 text-black dark:text-gray-200">Buscar (Código / Nombre / Escáner)</label>
                <input
                  value={search}
                  onChange={e => { setSearch(e.target.value) }}
                  onBlur={() => handleLookup(search)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleLookup(search) } }}
                  className="w-full bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 rounded px-3 py-2 border border-gray-300 dark:border-neutral-600 mb-3"
                  placeholder="Escanee o escriba y Enter"
                />

                {foundItem ? (
                  <div className="space-y-3 p-3 rounded bg-gray-50 dark:bg-neutral-700/50 border border-gray-200 dark:border-neutral-600">
                    <div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">ITEM: <span className="font-semibold text-black dark:text-white">{foundItem.item}</span></div>
                      <div className="text-sm font-medium text-black dark:text-white mt-1">{foundItem.title || '—'}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Precio Original: <span className="font-semibold text-black dark:text-white">{formatCOP(foundItem.price || 0)}</span></div>
                    </div>

                    {/* Campos de Devolución */}
                    <div className="space-y-3 border-t border-gray-200 dark:border-neutral-600 pt-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Fecha de Compra *</label>
                        <input
                          type="date"
                          value={devForm.purchasedAt}
                          onChange={e => setDevForm({ ...devForm, purchasedAt: e.target.value })}
                          className="w-full px-2 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-black dark:text-gray-100 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Motivo de Devolución *</label>
                        <select
                          value={devForm.reason}
                          onChange={e => setDevForm({ ...devForm, reason: e.target.value })}
                          className="w-full px-2 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-black dark:text-gray-100 text-sm"
                        >
                          <option value="">Selecciona…</option>
                          <option>Defecto de Fabricación</option>
                          <option>Talla Incorrecta</option>
                          <option>Color Diferente</option>
                          <option>Producto Dañado</option>
                          <option>Cliente no Satisfecho</option>
                          <option>Otro</option>
                        </select>
                      </div>

                      <button
                        onClick={addDevolution}
                        className="w-full px-3 py-2 rounded bg-black text-white hover:bg-gray-900 dark:bg-white dark:text-black dark:hover:bg-gray-200 text-sm font-medium transition-colors"
                      >
                        Agregar a Devolución
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 dark:text-gray-400 p-3 text-center">Ingrese código y presione Enter</div>
                )}

                {/* Historial de Devoluciones del Turno Actual */}
                <div className="mt-4 border-t border-gray-200 dark:border-neutral-700 pt-4">
                  <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">Devoluciones del Turno ({returns.filter(r => r.shiftId === activeShift?.id).length})</h4>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {returns.filter(r => r.shiftId === activeShift?.id).slice(0, 10).map(r => {
                      const prod = items.find(i => i.id === r.itemId)
                      return (
                        <div key={r.id} className="text-xs p-2 rounded bg-gray-50 dark:bg-neutral-700/50 text-gray-700 dark:text-gray-300">
                          <div className="font-medium">{prod?.title || 'Producto'}</div>
                          <div>{formatCOP(r.amount)} · {r.reason}</div>
                        </div>
                      )
                    })}
                    {returns.filter(r => r.shiftId === activeShift?.id).length === 0 && (
                      <div className="text-xs text-gray-400 dark:text-gray-500 p-2 text-center">Sin devoluciones en este turno</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Panel Derecho: Resumen */}
              <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 p-4 lg:col-span-1 order-last lg:order-none">
                <h3 className="font-medium mb-3 text-black dark:text-white">Artículos a Devolver</h3>
                
                <div className="space-y-3">
                  {/* Artículos en Devolución */}
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {devolutionList.map((dev, idx) => (
                      <div key={dev.id} className="p-2 rounded bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/40 text-xs">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-blue-900 dark:text-blue-300">{dev.itemName}</div>
                            <div className="text-blue-700 dark:text-blue-400 mt-1">
                              Reembolso: <span className="font-semibold">{formatCOP(dev.refundAmount)}</span>
                            </div>
                            <div className="text-blue-600 dark:text-blue-500 text-xs mt-1">
                              {dev.reason} · {new Date(dev.purchasedAt).toLocaleDateString('es-ES')}
                            </div>
                          </div>
                          <button
                            onClick={() => removeDevolution(dev.id)}
                            className="text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 p-1 rounded"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                    {devolutionList.length === 0 && (
                      <div className="text-xs text-gray-400 dark:text-gray-500 text-center p-4">
                        No hay artículos agregados
                      </div>
                    )}
                  </div>

                  {/* Resumen Total */}
                  <div className="border-t border-gray-200 dark:border-neutral-700 pt-3 mt-auto">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs text-gray-600 dark:text-gray-400">Total a Reembolsar:</span>
                      <span className="text-xl font-bold text-black dark:text-white">{formatCOP(totalRefund)}</span>
                    </div>

                    <button
                      onClick={submitDevoluciones}
                      disabled={devolutionList.length === 0}
                      className="w-full px-4 py-3 rounded bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Procesar Devoluciones
                    </button>

                    {devolutionList.length === 0 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                        Agrega artículos para continuar
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
