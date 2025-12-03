import { useMemo, useState, useEffect } from 'react'
import { setMeta, findItemByCode, getActiveShift, findCustomerByIdentification, upsertCustomer, fetchDianData } from '@/services/db'
import SidebarCaja from './Layout/Sidebar'
import { formatCOP } from '@/lib/currency'
import { useScanner } from '@/lib/useScanner'

//

export default function Cash({ onBack, onLogout, onNavigate }) {
  // Venta
  // Pago se realiza en pantalla separada; aquí solo se prepara
  const [cart, setCart] = useState([]) // {code, size, qty, price, name}
  const [search, setSearch] = useState('') // unified input (code, nombre, barcode)
  const [foundItem, setFoundItem] = useState(null)
  const [selectSize, setSelectSize] = useState('m')
  const [selectQty, setSelectQty] = useState('1')
  // const [selectPrice, setSelectPrice] = useState('') // removed editable price; using item.price
  const [toast, setToast] = useState(null)
  const [activeShift, setActiveShift] = useState(null)
  const [invoiceType, setInvoiceType] = useState('Facturación POS') // Facturación electrónica | Facturación POS

  // Cliente
  const [clientType, setClientType] = useState('Persona') // Persona | Empresa
  const [identType, setIdentType] = useState('CC')
  const [identNumber, setIdentNumber] = useState('')
  const [nombres, setNombres] = useState('')
  const [apellidos, setApellidos] = useState('')
  const [razonSocial, setRazonSocial] = useState('')
  const [email, setEmail] = useState('')
  const [phoneIndicative, setPhoneIndicative] = useState('+57')
  const [phoneNumber, setPhoneNumber] = useState('')
  // const [tipoComprobante, setTipoComprobante] = useState('Factura') // eliminado UI de tipo de comprobante
  const [customerId, setCustomerId] = useState('')
  const [loadingAuto, setLoadingAuto] = useState(false)

  // Scanner hook (barcode auto fill)
  useScanner({ onScan: code => { setSearch(code); handleLookup(code) } })

  // Load shift once and poll lightly (in case another window closes it)
  useEffect(() => {
    let mounted = true
    async function load() {
      const s = await getActiveShift()
      if (mounted) setActiveShift(s||null)
    }
    load()
    const id = setInterval(load, 15000)
    return ()=> { mounted = false; clearInterval(id) }
  }, [])

  const total = useMemo(() => cart.reduce((acc,l)=>acc + (Number(l.price)||0) * (parseInt(l.qty)||0), 0), [cart])
  const items = useMemo(() => cart.reduce((acc,l)=>acc + (parseInt(l.qty)||0), 0), [cart])

  function showToast(msg, type='info') {
    setToast({ msg, type })
    window.setTimeout(()=>setToast(null), 2000)
  }

  async function handleLookup(val) {
    const code = String(val||search).trim()
    if (!code) { setFoundItem(null); return }
    // For now only lookup by item code; future: name partial search
    const item = await findItemByCode(code)
    setFoundItem(item||null)
    if (item) {
      setSelectSize('m')
      setSelectQty('1')
  // price already fixed; no editable state
    }
  }

  async function addLineFromSelection() {
    if (!foundItem) return showToast('Sin producto cargado', 'error')
    const q = parseInt(selectQty)
    const p = Number(foundItem.price) || 0
    if (!['xs','s','m','l','xl'].includes(selectSize)) return showToast('Talla inválida', 'error')
    if (isNaN(q) || q <= 0) return showToast('Cantidad inválida', 'error')
    if (isNaN(p) || p <= 0) return showToast('Precio inválido', 'error')
    const available = parseInt(foundItem[selectSize] || 0)
    if (available < q) return showToast(`Stock insuficiente (${available} disp.)`, 'error')
    setCart(prev => [...prev, { code: foundItem.item, size: selectSize, qty: q, price: p, name: foundItem.title || foundItem.item }])
    setFoundItem(null)
    setSearch('')
    showToast('Agregado al carrito', 'success')
  }

  function removeLine(idx) {
    setCart(prev => prev.filter((_,i)=>i!==idx))
  }

  function customerValid() {
    if (!customerId) return false
    if (clientType === 'Persona') return nombres.trim() && apellidos.trim()
    if (clientType === 'Empresa') return razonSocial.trim()
    return false
  }

  async function handleCobrar() {
    if (cart.length === 0) return showToast('Carrito vacío', 'error')
    if (!activeShift) return showToast('Debe abrir un turno antes de facturar', 'error')
    if (!customerValid()) return showToast('Datos de cliente incompletos', 'error')
    // Validación ligera de stock (final se aplicará antes de Generar Factura)
    for (const l of cart) {
      const item = await findItemByCode(l.code)
      if (!item) return showToast(`ITEM ${l.code} no existe`, 'error')
      if ((item[l.size]||0) < l.qty) return showToast(`Sin stock para ${l.code} (${l.size})`, 'error')
    }
    // Persistir venta pendiente y navegar a Payment
    const pending = {
      cart, // [{code,size,qty,price,name}]
      total,
      items,
      customerId,
      invoiceType,
    }
    await setMeta('pending_sale', pending)
    if (typeof onNavigate === 'function') onNavigate('payment')
  }

  async function handleIdentBlur() {
    if (!identNumber.trim()) return
    const existing = await findCustomerByIdentification(identNumber.trim())
    if (existing) {
      setCustomerId(existing.id)
      setClientType(existing.type || 'Persona')
      setIdentType(existing.identificationType || identType)
      setNombres(existing.nombres||'')
      setApellidos(existing.apellidos||'')
      setRazonSocial(existing.razonSocial||'')
      setEmail(existing.email||'')
      setPhoneIndicative(existing.phoneIndicative||'+57')
      setPhoneNumber(existing.phoneNumber||'')
      showToast('Cliente cargado', 'success')
    } else {
      setCustomerId('')
    }
  }

  async function handleAutoDian() {
    if (!identNumber.trim()) return showToast('Número requerido', 'error')
    setLoadingAuto(true)
    try {
      const data = await fetchDianData(identType, identNumber.trim())
      if (!data) return showToast('Sin datos DIAN', 'error')
      setClientType(data.type || clientType)
      setNombres(data.nombres||'')
      setApellidos(data.apellidos||'')
      setRazonSocial(data.razonSocial||'')
      setEmail(data.email||'')
      setPhoneIndicative(data.phoneIndicative||'+57')
      setPhoneNumber(data.phoneNumber||'')
      showToast('Datos autocompletados', 'success')
    } catch {
      // Silenciar error y notificar
      showToast('Error DIAN', 'error')
    } finally {
      setLoadingAuto(false)
    }
  }

  async function handleGuardarCliente() {
    if (!identNumber.trim()) return showToast('Identificación requerida', 'error')
    const payload = {
      id: customerId || undefined,
      identificationNumber: identNumber.trim(),
      identificationType: identType,
      type: clientType,
      nombres,
      apellidos,
      razonSocial,
      email,
      phoneIndicative,
      phoneNumber
    }
    const saved = await upsertCustomer(payload)
    setCustomerId(saved.id)
    showToast('Cliente guardado', 'success')
  }

  return (
    <div className="h-full flex bg-white dark:bg-neutral-900 dark:text-gray-100">
      <SidebarCaja onNavigate={onNavigate} currentView="cash" />
      <main className="flex-1 p-8 bg-white dark:bg-neutral-900 dark:text-gray-100 min-h-screen">
        <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack} title="Volver" className="p-2 rounded bg-black text-white hover:bg-gray-900 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h2 className="text-2xl font-semibold text-black dark:text-white">Caja</h2>
          {activeShift ? (
            <span className="px-2 py-1 rounded text-[11px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">Turno activo</span>
          ) : (
            <span className="px-2 py-1 rounded text-[11px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">Sin turno</span>
          )}
        </div>
        <button onClick={onLogout} className="px-3 py-2 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 rounded border border-gray-300 dark:border-neutral-700 hover:bg-gray-100 dark:hover:bg-neutral-700">Cerrar sesión</button>
        </header>
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
        {toast && (
          <div className="fixed right-6 top-6 z-50">
            <div className={`${toast.type==='error'?'bg-red-600':toast.type==='success'?'bg-green-600':'bg-black'} text-white px-3 py-2 rounded shadow text-sm`}>{toast.msg}</div>
          </div>
        )}
        {/* Panel Producto */}
        <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 p-4 lg:col-span-1">
          <h3 className="font-medium mb-3 text-black dark:text-white">Producto</h3>
          <label className="block text-sm mb-1 text-black dark:text-gray-200">Buscar (Código / Nombre / Escáner)</label>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); }}
            onBlur={() => handleLookup(search)}
            onKeyDown={e => { if (e.key==='Enter') { e.preventDefault(); handleLookup(search) }}}
            className="w-full bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 rounded px-3 py-2 border border-gray-300 dark:border-neutral-600 mb-3"
            placeholder="Escanee o escriba y Enter"
          />
          {foundItem ? (
            <div className="space-y-3">
              <div className="text-xs text-gray-600 dark:text-gray-400">ITEM: <span className="font-semibold text-black dark:text-white">{foundItem.item}</span></div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Título: <span className="font-semibold text-black dark:text-white">{foundItem.title || '—'}</span></div>
              <div className="grid grid-cols-5 gap-1 text-[10px]">
                {['xs','s','m','l','xl'].map(sz => (
                  <div key={sz} className={`p-1 rounded border text-center ${selectSize===sz?'bg-black text-white dark:bg-white dark:text-black':'bg-gray-50 dark:bg-neutral-700 text-gray-700 dark:text-gray-300'} border-gray-300 dark:border-neutral-600 cursor-pointer`} onClick={()=>setSelectSize(sz)}>
                    {sz.toUpperCase()} ({foundItem[sz]||0})
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Cantidad</label>
                  <input type="number" value={selectQty} onChange={e=>setSelectQty(e.target.value)} className="w-full bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 rounded px-2 py-1 border border-gray-300 dark:border-neutral-600 text-sm" />
                </div>
                <div>
                  <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Precio (COP)</label>
                  <div className="w-full bg-gray-50 dark:bg-neutral-700 text-gray-900 dark:text-gray-100 rounded px-2 py-1 border border-gray-300 dark:border-neutral-600 text-sm">
                    {formatCOP(Number(foundItem?.price||0))}
                  </div>
                </div>
              </div>
              <button onClick={addLineFromSelection} className="w-full px-3 py-2 rounded bg-black text-white hover:bg-gray-900 text-sm">Agregar</button>
            </div>
          ) : (
            <div className="text-xs text-gray-500 dark:text-gray-400">Ingrese el código y presione Enter para cargar.</div>
          )}
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
                    <td className="py-1">{formatCOP(Number(l.price))}</td>
                    <td className="py-1">{formatCOP(Number(l.price)*Number(l.qty))}</td>
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
        {/* Panel Cliente */}
        <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 p-4 lg:col-span-1 order-last lg:order-none">
          <h3 className="font-medium mb-3 text-black dark:text-white">Cliente</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Tipo de Cliente</label>
              <select value={clientType} onChange={e=>setClientType(e.target.value)} className="w-full px-2 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-sm text-gray-900 dark:text-gray-100">
                <option>Persona</option>
                <option>Empresa</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Tipo Ident.</label>
                <select value={identType} onChange={e=>setIdentType(e.target.value)} className="w-full px-2 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-xs text-gray-900 dark:text-gray-100">
                  {['NIT','CC','TI','Registro Civil','Tarjeta de extranjeria','Pasaporte','Documento de identificacion de extranjero','NUIP','PEP','Sin identificacion','NIT de otro pais','PPT','Salvaconducto'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Número</label>
                <input value={identNumber} onChange={e=>setIdentNumber(e.target.value)} onBlur={handleIdentBlur} className="w-full px-2 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-xs text-gray-900 dark:text-gray-100" placeholder="Identificación" />
              </div>
            </div>
            {clientType === 'Persona' && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Nombres</label>
                    <input value={nombres} onChange={e=>setNombres(e.target.value)} className="w-full px-2 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-xs text-gray-900 dark:text-gray-100" />
                  </div>
                  <div>
                    <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Apellidos</label>
                    <input value={apellidos} onChange={e=>setApellidos(e.target.value)} className="w-full px-2 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-xs text-gray-900 dark:text-gray-100" />
                  </div>
                </div>
              </>
            )}
            {clientType === 'Empresa' && (
              <div>
                <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Razón Social</label>
                <input value={razonSocial} onChange={e=>setRazonSocial(e.target.value)} className="w-full px-2 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-xs text-gray-900 dark:text-gray-100" />
              </div>
            )}
            <div>
              <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Correo</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full px-2 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-xs text-gray-900 dark:text-gray-100" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Indicativo</label>
                <input value={phoneIndicative} onChange={e=>setPhoneIndicative(e.target.value)} className="w-full px-2 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-xs text-gray-900 dark:text-gray-100" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs mb-1 text-gray-600 dark:text-gray-400">Celular</label>
                <input value={phoneNumber} onChange={e=>setPhoneNumber(e.target.value)} className="w-full px-2 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-xs text-gray-900 dark:text-gray-100" />
              </div>
            </div>
            {/* Tipo de Comprobante eliminado a solicitud */}
            <div className="flex gap-2">
              <button onClick={handleAutoDian} disabled={loadingAuto} className="flex-1 px-3 py-2 rounded bg-black text-white text-xs hover:bg-gray-800 disabled:opacity-50">{loadingAuto?'Consultando…':'Autocompletar DIAN'}</button>
              <button onClick={handleGuardarCliente} className="flex-1 px-3 py-2 rounded border border-gray-300 dark:border-neutral-600 text-xs hover:bg-gray-50 dark:hover:bg-neutral-700">Guardar Cliente</button>
            </div>
            {customerId && (
              <div className="text-[10px] text-green-600 dark:text-green-400">Cliente listo: {customerId.slice(0,8)}</div>
            )}

            {/* Tipo de factura: estilo neutral como los demás inputs */}
            <div className="mt-3 p-3 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 tracking-wide">Tipo de factura</label>
              <select
                value={invoiceType}
                onChange={e=>setInvoiceType(e.target.value)}
                className="w-full bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 rounded px-2 py-2 border border-gray-300 dark:border-neutral-600"
              >
                <option>Facturación POS</option>
                <option>Facturación electrónica</option>
              </select>
              <div className="mt-1 text-[11px] text-gray-600 dark:text-gray-400">Requerido para generar la factura.</div>
            </div>
          </div>
        </div>

        {/* Barra inferior: Total + Tipo de factura + Cobrar */}
        <div className="lg:col-span-2">
          <div className="mt-2 bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 p-4 flex flex-col md:flex-row items-center gap-6 justify-center">
            <div className="flex flex-col items-center md:items-start gap-1">
              <div className="text-xs text-gray-500 dark:text-gray-400 tracking-wide">TOTAL COMPRA</div>
              <div className="text-4xl font-bold text-black dark:text-white leading-tight">{formatCOP(total)}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Prendas: <span className="font-semibold text-black dark:text-white">{items}</span></div>
            </div>
            <div className="flex items-center gap-3 md:ml-8">
              <button onClick={handleCobrar} disabled={!activeShift || !customerValid() || cart.length===0} className="px-6 py-3 rounded bg-green-600 text-white font-semibold text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow">
                Cobrar
              </button>
            </div>
          </div>
          {!activeShift && (<div className="text-xs text-red-600 mt-2">Abra un turno para registrar ventas.</div>)}
          {activeShift && !customerValid() && (<div className="text-xs text-gray-600 mt-2">Complete datos del cliente para continuar.</div>)}
          {activeShift && customerValid() && cart.length===0 && (<div className="text-xs text-gray-600 mt-2">Agregue al menos un producto.</div>)}
        </div>
      </div>
      </main>
    </div>
  )
}
