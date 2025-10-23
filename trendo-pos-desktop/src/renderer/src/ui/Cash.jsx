function ArrowLeftIcon({ className = 'w-5 h-5' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function Cash({ onBack, onLogout }) {
  return (
    <div className="p-8">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack} title="Volver" className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
            <ArrowLeftIcon />
          </button>
          <h2 className="text-2xl font-semibold">Caja</h2>
        </div>
        <button onClick={onLogout} className="px-3 py-2 bg-white text-gray-900 rounded">Cerrar sesión</button>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/10 rounded-lg border border-white/10 p-4">
          <h3 className="font-medium mb-3">Carrito</h3>
          <div className="text-sm text-gray-400">Añade productos escaneando o buscándolos…</div>
        </div>
        <div className="bg-white/10 rounded-lg border border-white/10 p-4">
          <h3 className="font-medium mb-3">Pago</h3>
          <label className="block text-sm mb-1">Método de pago</label>
          <select className="w-full bg-white text-gray-900 rounded px-3 py-2">
            <option>Efectivo</option>
            <option>Tarjeta</option>
            <option>Transferencia</option>
          </select>
          <button className="mt-4 px-4 py-2 rounded bg-blue-600 text-white">Facturar</button>
        </div>
      </div>
    </div>
  )
}
