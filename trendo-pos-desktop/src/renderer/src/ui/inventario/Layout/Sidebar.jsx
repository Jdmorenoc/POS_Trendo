import React from 'react'

export default function Sidebar({ onNavigate, currentView, onLogout }) {
  return (
    <aside className="w-64 bg-black border-r border-[#a6a6a6] p-4 flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[#a6a6a6] rounded flex items-center justify-center text-white font-bold">T</div>
        <div>
          <div className="text-lg font-semibold text-white">Trendo POS</div>
          <div className="text-xs text-[#a6a6a6]">Punto de venta</div>
        </div>
      </div>

      <nav className="flex-1">
        <ul className="space-y-2 text-sm">
          <li 
            onClick={() => onNavigate('inventory')}
            className={`px-2 py-2 rounded transition-colors cursor-pointer ${
              currentView === 'inventory' 
                ? 'text-white bg-gray-900' 
                : 'text-[#a6a6a6] hover:bg-gray-900'
            }`}
          >
            Inventario
          </li>
          <li 
            onClick={() => onNavigate('controlStock')}
            className={`px-2 py-2 rounded transition-colors cursor-pointer ${
              currentView === 'controlStock' 
                ? 'text-white bg-gray-900' 
                : 'text-[#a6a6a6] hover:bg-gray-900'
            }`}
          >
            Control de Stock
          </li>
          <li 
            onClick={() => onNavigate('configuracion')}
            className={`px-2 py-2 rounded transition-colors cursor-pointer ${
              currentView === 'configuracion' 
                ? 'text-white bg-gray-900' 
                : 'text-[#a6a6a6] hover:bg-gray-900'
            }`}
          >
            Configuración
          </li>
        </ul>
      </nav>

      <div className="mt-auto space-y-4">
        <div className="text-xs text-[#a6a6a6]">{navigator.onLine ? 'Online' : 'Offline'}</div>
        <button 
          onClick={onLogout} 
          className="w-full text-left px-3 py-2 text-red-500 hover:bg-gray-900 rounded transition-colors flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="16 17 21 12 16 7" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="21" y1="12" x2="9" y2="12" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
