import React from 'react'
import { onConnectivityChange, syncAll, watchRealtime } from '@/lib/sync'
import Sidebar from './Layout/Sidebar'
import Header from './Layout/Header'
import Footer from './Layout/Footer'

export default function ControlStock({ onBack, onLogout, onNavigate }) {
  return (
    <div className="h-full flex bg-white">
      <Sidebar onNavigate={onNavigate} currentView="controlStock" onLogout={onLogout} />
      
      <main className="flex-1 p-6 pb-24 bg-white">
        <Header onBack={onBack} syncAll={syncAll} />
        
        <section>
          <div className="border border-[#a6a6a6] rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-6 text-black">Control de Stock</h3>
            
            <div className="space-y-6">
              {/* Estadísticas Generales */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm text-gray-500 mb-1">Total de Productos</h4>
                  <p className="text-2xl font-semibold">0</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm text-gray-500 mb-1">Productos Bajos en Stock</h4>
                  <p className="text-2xl font-semibold text-amber-600">0</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm text-gray-500 mb-1">Sin Stock</h4>
                  <p className="text-2xl font-semibold text-red-600">0</p>
                </div>
              </div>

              {/* Tabla de Productos */}
              <div className="bg-white rounded-lg border border-[#a6a6a6]">
                <div className="p-4 border-b border-[#a6a6a6]">
                  <h4 className="font-medium">Productos con Stock Bajo</h4>
                </div>
                <div className="p-4 text-center text-gray-500">
                  No hay productos con stock bajo en este momento
                </div>
              </div>

              {/* Acciones Rápidas */}
              <div className="flex gap-4">
                <button className="px-4 py-2 bg-[#a6a6a6] text-white rounded hover:bg-gray-600 transition-colors">
                  Ajustar Stock
                </button>
                <button className="px-4 py-2 border border-[#a6a6a6] text-black rounded hover:bg-gray-50 transition-colors">
                  Exportar Reporte
                </button>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </main>
    </div>
  )
}