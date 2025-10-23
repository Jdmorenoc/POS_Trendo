export default function Menu({ onGoInventory, onGoCash, onLogout }) {
  return (
    <div className="min-h-screen p-8">
      <header className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white font-semibold">T</div>
          <div className="text-xl font-semibold">Trendo</div>
        </div>
        <button onClick={onLogout} className="px-3 py-2 bg-white text-gray-900 rounded">Cerrar sesión</button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
        <button onClick={onGoInventory} className="aspect-[4/2] rounded-xl border border-white/10 bg-white/10 hover:bg-white/15 transition text-left p-6">
          <div className="text-2xl font-semibold">Inventario</div>
          <div className="text-sm text-gray-300">Gestiona stock de productos: registrar, editar, eliminar, historial.</div>
        </button>
        <button onClick={onGoCash} className="aspect-[4/2] rounded-xl border border-white/10 bg-white/10 hover:bg-white/15 transition text-left p-6">
          <div className="text-2xl font-semibold">Caja</div>
          <div className="text-sm text-gray-300">Realiza ventas, factura prendas y elige método de pago.</div>
        </button>
      </div>
    </div>
  )
}
