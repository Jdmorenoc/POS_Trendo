export default function Menu({ onGoInventory, onGoCash, onGoContabilidad, onGoConfiguracion, onLogout }) {
  return (
    <div className="min-h-screen p-8 text-gray-900 dark:text-gray-100 transition-colors bg-[linear-gradient(140deg,_#fafafa_0%,_#e9eaec_25%,_#c9cbce_50%,_#8e9092_75%,_#2a2b2d_100%)] dark:bg-[linear-gradient(140deg,_#0d0d10_0%,_#17181b_30%,_#232529_55%,_#303338_75%,_#3e4247_100%)]">
      <header className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white font-semibold">T</div>
          <div className="text-xl font-semibold text-black dark:text-white">Trendo</div>
        </div>
        <button onClick={onLogout} className="px-3 py-2 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-neutral-700 rounded hover:bg-red-500 hover:text-white transition-colors">Cerrar Sesión</button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
        <button onClick={onGoInventory} className="aspect-[4/2] rounded-xl border border-gray-300 dark:border-neutral-700 hover:border-gray-400 dark:hover:border-neutral-600 hover:shadow-md bg-white dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700 transition text-left p-6">
          <div className="text-2xl font-semibold text-black dark:text-white">Inventario</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Gestiona stock de productos: registrar, editar, eliminar, historial.</div>
        </button>
        <button onClick={onGoCash} className="aspect-[4/2] rounded-xl border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700 transition text-left p-6 hover:border-gray-400 dark:hover:border-neutral-600 hover:shadow-md">
          <div className="text-2xl font-semibold text-black dark:text-white">Caja</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Realiza ventas, factura prendas y elige método de pago.</div>
        </button>
        <button onClick={onGoContabilidad} className="aspect-[4/2] rounded-xl border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700 transition text-left p-6 hover:border-gray-400 dark:hover:border-neutral-600 hover:shadow-md">
          <div className="text-2xl font-semibold text-black dark:text-white">Contabilidad</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Realiza ventas, factura prendas y elige método de pago.</div>
        </button>
        <button onClick={onGoConfiguracion} className="aspect-[4/2] rounded-xl border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700 transition text-left p-6 hover:border-gray-400 dark:hover:border-neutral-600 hover:shadow-md">
          <div className="text-2xl font-semibold text-black dark:text-white">Configuración</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Preferencias: tamaño de fuente y contraste.</div>
        </button>
      </div>
    </div>
  )
}
