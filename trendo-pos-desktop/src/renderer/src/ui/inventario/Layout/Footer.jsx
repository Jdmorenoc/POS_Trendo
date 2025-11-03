import React from 'react'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="fixed bottom-0 left-64 right-0 bg-white border-t border-[#a6a6a6] py-4 px-6">
      <div className="flex items-center justify-between max-w-full">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Sistema Actualizado</span>
          </div>
          <div className="text-sm text-gray-600">
            Versión 1.0.0
          </div>
        </div>
        <div className="flex items-center gap-6 text-sm text-gray-600">
          <span>© {year} Trendo POS</span>
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15V3m0 12l-4-4m4 4l4-4M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17"></path>
            </svg>
            <span>Sincronización Automática</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
