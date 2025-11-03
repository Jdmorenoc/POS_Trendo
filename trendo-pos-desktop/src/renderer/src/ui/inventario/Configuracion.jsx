import React from 'react'
import { onConnectivityChange, syncAll } from '@/lib/sync'
import Sidebar from './Layout/Sidebar'
import Header from './Layout/Header'
import Footer from './Layout/Footer'

export default function Configuracion({ onBack, onLogout, onNavigate }) {
  return (
    <div className="h-full flex bg-white">
      <Sidebar onNavigate={onNavigate} currentView="configuracion" onLogout={onLogout} />
      
      <main className="flex-1 p-6 pb-24 bg-white">
        <Header onBack={onBack} syncAll={syncAll} />
        
        <section>
          <div className="border border-[#a6a6a6] rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-6 text-black">Configuración</h3>
            
            <div className="space-y-6">
              {/* Configuración General */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-700">Configuración General</h4>
                <div className="grid gap-4">
                  <div className="flex items-center justify-between p-4 border border-[#a6a6a6] rounded-lg">
                    <div>
                      <h5 className="font-medium">Modo Oscuro</h5>
                      <p className="text-sm text-gray-500">Cambiar entre tema claro y oscuro</p>
                    </div>
                    <button className="w-12 h-6 bg-[#a6a6a6] rounded-full relative">
                      <span className="w-5 h-5 bg-white rounded-full absolute left-0.5 top-0.5"></span>
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border border-[#a6a6a6] rounded-lg">
                    <div>
                      <h5 className="font-medium">Notificaciones</h5>
                      <p className="text-sm text-gray-500">Administrar notificaciones del sistema</p>
                    </div>
                    <button className="px-4 py-2 text-[#a6a6a6] border border-[#a6a6a6] rounded hover:bg-gray-50">
                      Configurar
                    </button>
                  </div>
                </div>
              </div>

              {/* Configuración de Usuario */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-700">Configuración de Usuario</h4>
                <div className="grid gap-4">
                  <div className="p-4 border border-[#a6a6a6] rounded-lg">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-[#a6a6a6] rounded-full flex items-center justify-center text-white font-bold">
                        U
                      </div>
                      <div>
                        <h5 className="font-medium">Usuario Actual</h5>
                        <p className="text-sm text-gray-500">example@email.com</p>
                      </div>
                    </div>
                    <button className="w-full px-4 py-2 text-[#a6a6a6] border border-[#a6a6a6] rounded hover:bg-gray-50">
                      Editar Perfil
                    </button>
                  </div>
                </div>
              </div>

              {/* Seguridad */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-700">Seguridad</h4>
                <div className="grid gap-4">
                  <button className="w-full text-left px-4 py-3 border border-[#a6a6a6] rounded-lg hover:bg-gray-50">
                    <h5 className="font-medium">Cambiar Contraseña</h5>
                    <p className="text-sm text-gray-500">Actualizar tu contraseña de acceso</p>
                  </button>
                  
                  <button className="w-full text-left px-4 py-3 border border-[#a6a6a6] rounded-lg hover:bg-gray-50">
                    <h5 className="font-medium">Autenticación de dos factores</h5>
                    <p className="text-sm text-gray-500">Configurar verificación adicional</p>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </main>
    </div>
  )
}