import { useEffect, useState } from 'react'
import { syncAll } from '@/services/sync'
import Header from '../inventario/Layout/Header'
import Footer from '../inventario/Layout/Footer'

export default function Configuracion({ onBack }) {
  // Modo oscuro eliminado: siempre tema claro
  const [highContrast, setHighContrast] = useState(() => typeof window !== 'undefined' && window.localStorage.getItem('pref_contrast') === '1')
  const [fontScale, setFontScale] = useState(() => typeof window !== 'undefined' ? parseFloat(window.localStorage.getItem('pref_font_scale') || '1') : 1)
  const [darkMode, setDarkMode] = useState(() => typeof window !== 'undefined' && window.localStorage.getItem('pref_dark') === '1')

  // Aplicar modo oscuro según preferencia
  useEffect(() => {
    try {
      document.documentElement.classList.toggle('dark', darkMode)
      if (typeof window !== 'undefined') window.localStorage.setItem('pref_dark', darkMode ? '1' : '0')
    } catch { /* ignore */ }
  }, [darkMode])

  useEffect(() => {
    document.documentElement.style.setProperty('--contrast-factor', highContrast ? '1.25' : '1')
    window.localStorage.setItem('pref_contrast', highContrast ? '1' : '0')
  }, [highContrast])

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontScale * 100}%`
    window.localStorage.setItem('pref_font_scale', String(fontScale))
  }, [fontScale])

  return (
    <div className="h-full bg-white text-gray-900 dark:bg-neutral-900 dark:text-gray-100">
      <main className="h-full p-6 bg-white text-gray-900 dark:bg-neutral-900 dark:text-gray-100 flex flex-col">
        <Header onBack={onBack} syncAll={syncAll} title="Configuración" showBack={true} />

        <section className="border border-gray-300 dark:border-neutral-700 rounded-lg p-6 bg-white dark:bg-neutral-800">
          <h3 className="text-xl font-semibold mb-6">Preferencias</h3>
          <div className="space-y-8">
            {/* Tema */}
            <div className="space-y-4">
              <h4 className="font-medium">Tema</h4>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => setDarkMode(d => !d)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${darkMode ? 'bg-black text-white border-black' : 'bg-gray-100 border-gray-300 hover:bg-gray-200 dark:bg-neutral-700 dark:border-neutral-600 dark:text-gray-100 dark:hover:bg-neutral-600'}`}
                >
                  Modo oscuro: {darkMode ? 'ON' : 'OFF'}
                </button>
                <button
                  onClick={() => setHighContrast(c => !c)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${highContrast ? 'bg-black text-white border-black' : 'bg-gray-100 border-gray-300 hover:bg-gray-200 dark:bg-neutral-700 dark:border-neutral-600 dark:text-gray-100 dark:hover:bg-neutral-600'}`}
                >
                  Alto contraste: {highContrast ? 'ON' : 'OFF'}
                </button>
                <div className="flex items-center gap-3">
                  <label className="text-sm">Tamaño de fuente</label>
                  {[
                    { k: 'S', v: 0.9 },
                    { k: 'M', v: 1.0 },
                    { k: 'L', v: 1.15 },
                    { k: 'XL', v: 1.3 }
                  ].map(opt => (
                    <button
                      key={opt.k}
                      onClick={() => setFontScale(opt.v)}
                      className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                        fontScale === opt.v
                          ? 'bg-black text-white border-black'
                          : 'bg-gray-100 border-gray-300 hover:bg-gray-200 dark:bg-neutral-700 dark:border-neutral-600 dark:text-gray-100 dark:hover:bg-neutral-600'
                      }`}
                    >
                      {opt.k}
                    </button>
                  ))}
                  <span className="text-xs opacity-70">{Math.round(fontScale * 100)}%</span>
                </div>
              </div>
            </div>

            {/* Usuario */}
            <div className="space-y-4">
              <h4 className="font-medium">Usuario</h4>
              <div className="p-4 border border-gray-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center font-bold">U</div>
                  <div>
                    <div className="font-medium text-sm">Usuario Actual</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">example@email.com</div>
                  </div>
                </div>
                <button className="w-full px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-neutral-600 bg-gray-100 hover:bg-gray-200 dark:bg-neutral-700 dark:hover:bg-neutral-600 transition-colors">Editar Perfil</button>
              </div>
            </div>

            {/* Accesibilidad adicional */}
            <div className="space-y-3">
              <h4 className="font-medium">Accesibilidad adicional</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Las opciones de alto contraste y tamaño de fuente mejoran la legibilidad.</p>
            </div>
          </div>
        </section>
        <div className="mt-auto">
          <Footer compact />
        </div>
      </main>
    </div>
  )
}