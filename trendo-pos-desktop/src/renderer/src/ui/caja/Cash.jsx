import { useMemo, useState } from 'react'
import { addSale, findItemByCode, adjustStockByItem } from '@/lib/db'

//

export default function Cash({ onBack, onLogout }) {
  const [method, setMethod] = useState('Efectivo')
  const [cart, setCart] = useState([]) // {code, size, qty, price, name}
  const [code, setCode] = useState('')
  const [size, setSize] = useState('m')
  const [qty, setQty] = useState('1')
  const [price, setPrice] = useState('')
  const [toast, setToast] = useState(null)

  const total = useMemo(() => cart.reduce((acc,l)=>acc + (parseFloat(l.price)||0) * (parseInt(l.qty)||0), 0), [cart])
  const items = useMemo(() => cart.reduce((acc,l)=>acc + (parseInt(l.qty)||0), 0), [cart])

  function showToast(msg, type='info') {
    setToast({ msg, type })
    window.setTimeout(()=>setToast(null), 2000)
  }

  async function addLine() {
    const c = code.trim()
    const q = parseInt(qty)
    const p = parseFloat(price)
    if (!c) return showToast('ITEM requerido', 'error')
    if (!['xs','s','m','l','xl'].includes(size)) return showToast('Talla inválida', 'error')
    if (isNaN(q) || q <= 0) return showToast('Cantidad inválida', 'error')
    if (isNaN(p) || p <= 0) return showToast('Precio inválido', 'error')

    const item = await findItemByCode(c)
    if (!item) return showToast('ITEM no existe', 'error')
    const available = parseInt(item[size] || 0)
    if (available < q) return showToast(`Stock insuficiente (${available} disp.)`, 'error')

    setCart(prev => [...prev, { code: c, size, qty: q, price: p, name: item.title || c }])
    setCode('')
    setQty('1')
    setPrice('')
    showToast('Agregado al carrito', 'success')
  }

  function removeLine(idx) {
    setCart(prev => prev.filter((_,i)=>i!==idx))
  }

  async function handleFacturar() {
    if (cart.length === 0) return showToast('Carrito vacío', 'error')
    // Validate stock again right before committing
    for (const l of cart) {
      const item = await findItemByCode(l.code)
      if (!item) return showToast(`ITEM ${l.code} no existe`, 'error')
      if ((item[l.size]||0) < l.qty) return showToast(`Sin stock para ${l.code} (${l.size})`, 'error')
    }
    // Deduct stock
    for (const l of cart) {
      await adjustStockByItem(l.code, l.size, -Math.abs(parseInt(l.qty)||0))
    }
    await addSale({ total, items, method })
    setCart([])
    setMethod('Efectivo')
    showToast('Venta registrada', 'success')
  }

  return (
    <div className="p-8 bg-white dark:bg-neutral-900 dark:text-gray-100 min-h-screen">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack} title="Volver" className="p-2 rounded bg-black text-white hover:bg-gray-900 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h2 className="text-2xl font-semibold text-black dark:text-white">Caja</h2>
        </div>
        <button onClick={onLogout} className="px-3 py-2 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 rounded border border-gray-300 dark:border-neutral-700 hover:bg-gray-100 dark:hover:bg-neutral-700">Cerrar sesión</button>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
        {toast && (
          <div className="fixed right-6 top-6 z-50">
            <div className={`${toast.type==='error'?'bg-red-600':toast.type==='success'?'bg-green-600':'bg-black'} text-white px-3 py-2 rounded shadow text-sm`}>{toast.msg}</div>
          </div>
        )}
        <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 p-4">
          <h3 className="font-medium mb-3 text-black dark:text-white">Carrito</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-3">
            <div className="md:col-span-2">
              <label className="block text-sm mb-1 text-black dark:text-gray-200">ITEM</label>
              <input value={code} onChange={e=>setCode(e.target.value)} className="w-full bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 rounded px-3 py-2 border border-gray-300 dark:border-neutral-600" placeholder="SKU" />
            </div>
            <div>
              <label className="block text-sm mb-1 text-black dark:text-gray-200">Talla</label>
              <select value={size} onChange={e=>setSize(e.target.value)} className="w-full bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 rounded px-3 py-2 border border-gray-300 dark:border-neutral-600">
                {['xs','s','m','l','xl'].map(x=> <option key={x} value={x}>{x.toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1 text-black dark:text-gray-200">Cantidad</label>
              <input type="number" value={qty} onChange={e=>setQty(e.target.value)} className="w-full bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 rounded px-3 py-2 border border-gray-300 dark:border-neutral-600" />
            </div>
            <div>
              <label className="block text-sm mb-1 text-black dark:text-gray-200">Precio</label>
              <input type="number" value={price} onChange={e=>setPrice(e.target.value)} className="w-full bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 rounded px-3 py-2 border border-gray-300 dark:border-neutral-600" placeholder="0.00" />
            </div>
          </div>
          <button onClick={addLine} className="px-3 py-2 rounded bg-black text-white hover:bg-gray-900 text-sm">Agregar al carrito</button>
          <div className="mt-4 border-t border-gray-200 dark:border-neutral-700 pt-3">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-600 dark:text-gray-300">
                <tr>
                  <th className="py-1">ITEM</th>
                  <th className="py-1">Talla</th>
                  <th className="py-1">Cant.</th>
                  <th className="py-1">Precio</th>
                  <th className="py-1">Subt.</th>
                  <th className="py-1"></th>
                </tr>
              </thead>
              <tbody>
                {cart.map((l,idx)=> (
                  <tr key={idx} className="border-t border-gray-100 dark:border-neutral-700">
                    <td className="py-1">{l.name}</td>
                    <td className="py-1">{l.size.toUpperCase()}</td>
                    <td className="py-1">{l.qty}</td>
                    <td className="py-1">${Number(l.price).toFixed(2)}</td>
                    <td className="py-1">${(Number(l.price)*Number(l.qty)).toFixed(2)}</td>
                    <td className="py-1 text-right"><button onClick={()=>removeLine(idx)} className="px-2 py-1 text-xs rounded border border-red-200 dark:border-red-400/40 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">Quitar</button></td>
                  </tr>
                ))}
                {cart.length === 0 && (
                  <tr><td colSpan={6} className="py-3 text-center text-gray-500 dark:text-gray-400">Carrito vacío</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 p-4">
          <h3 className="font-medium mb-3 text-black dark:text-white">Pago</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm mb-1 text-black dark:text-gray-200">Método de pago</label>
              <select value={method} onChange={(e)=>setMethod(e.target.value)} className="w-full bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 rounded px-3 py-2 border border-gray-300 dark:border-neutral-600">
                <option>Efectivo</option>
                <option>Transferencia</option>
                <option>Tarjeta</option>
              </select>
            </div>
            <div className="flex items-center justify-between border-t border-gray-200 dark:border-neutral-700 pt-3">
              <div className="text-sm text-gray-600 dark:text-gray-300">Prendas: <span className="font-semibold text-black dark:text-white">{items}</span></div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Total: <span className="font-semibold text-black dark:text-white">${total.toFixed(2)}</span></div>
            </div>
            <button onClick={handleFacturar} className="mt-2 w-full px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Facturar</button>
          </div>
        </div>
      </div>
    </div>
  )
}
