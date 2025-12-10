/* eslint-disable no-unused-vars */
import { useEffect, useState, useRef } from 'react'
import Header from '../inventario/Layout/Header'
import Footer from '../inventario/Layout/Footer'
import { supabase } from '@/services/supabaseClient'
import { syncProfileChangesToEmployee } from '@/services/employees'

// Componente principal de Configuración con todas las opciones de accesibilidad
export default function Configuracion({ onBack }) {
  // Preferencias de UI
  const [highContrast, setHighContrast] = useState(() => typeof window !== 'undefined' && window.localStorage.getItem('pref_contrast') === '1')
  const [fontScale, setFontScale] = useState(() => typeof window !== 'undefined' ? parseFloat(window.localStorage.getItem('pref_font_scale') || '1') : 1)
  const [darkMode, setDarkMode] = useState(() => typeof window !== 'undefined' && window.localStorage.getItem('pref_dark') === '1')
  const [compactMode, setCompactMode] = useState(() => typeof window !== 'undefined' && window.localStorage.getItem('pref_compact') === '1')
  const [sessionTimeout, setSessionTimeout] = useState(() => typeof window !== 'undefined' ? parseInt(window.localStorage.getItem('pref_session_timeout') || '30') : 30)
  const [autoLogoutEnabled, setAutoLogoutEnabled] = useState(() => typeof window !== 'undefined' && window.localStorage.getItem('pref_auto_logout') !== '0')
  const audioRef = useRef(null)

  // Estado de usuario y perfil
  const [user, setUser] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')
  const [editSuccess, setEditSuccess] = useState('')
  const [editData, setEditData] = useState({
    displayName: '',
    email: '',
    newPassword: '',
    confirmPassword: '',
    currentPassword: ''
  })

  // Cargar usuario actual
  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setUser(user)
          setEditData(prev => ({
            ...prev,
            displayName: user.user_metadata?.full_name || 'Usuario',
            email: user.email || ''
          }))
        }
      } catch (e) {
        console.error('Error cargando usuario:', e)
      } finally {
        setLoading(false)
      }
    }
    loadUser()
  }, [])

  // Guardar cambios de perfil
  async function handleSaveProfile() {
    setEditError('')
    setEditSuccess('')
    setEditLoading(true)

    try {
      const updates = {}

      // Actualizar nombre
      if (editData.displayName && editData.displayName !== (user?.user_metadata?.full_name || 'Usuario')) {
        updates.data = { full_name: editData.displayName }
      }

      // Actualizar email
      if (editData.email && editData.email !== user?.email) {
        updates.email = editData.email
      }

      // Cambiar contraseña
      if (editData.newPassword) {
        if (editData.newPassword !== editData.confirmPassword) {
          setEditError('Las contraseñas no coinciden')
          setEditLoading(false)
          return
        }
        if (editData.newPassword.length < 6) {
          setEditError('La contraseña debe tener al menos 6 caracteres')
          setEditLoading(false)
          return
        }
        updates.password = editData.newPassword
      }

      // Realizar actualización
      if (Object.keys(updates).length === 0) {
        setEditError('No hay cambios para guardar')
        setEditLoading(false)
        return
      }

      const { error } = await supabase.auth.updateUser(updates)
      
      if (error) {
        setEditError(error.message || 'Error al guardar cambios')
      } else {
        setEditSuccess('Perfil actualizado correctamente')
        // Recargar usuario
        const { data: { user: updatedUser } } = await supabase.auth.getUser()
        setUser(updatedUser)
        
        // Sincronizar cambios a tabla employee en Supabase
        try {
          await syncProfileChangesToEmployee({
            displayName: editData.displayName,
            email: editData.email
          })
          console.log('✅ Cambios sincronizados a tabla employee')
        } catch (syncError) {
          console.error('⚠️ Error sincronizando a tabla employee:', syncError)
          // No mostrar error al usuario, pero loguear
        }
        
        // Limpiar campos de contraseña
        setEditData(prev => ({
          ...prev,
          newPassword: '',
          confirmPassword: '',
          currentPassword: ''
        }))

        // Cerrar modal después de 2 segundos
        setTimeout(() => {
          setShowEditModal(false)
        }, 2000)
      }
    } catch (e) {
      setEditError(e.message || 'Error al guardar cambios')
    } finally {
      setEditLoading(false)
    }
  }

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

  // Guardar modo compacto
  useEffect(() => {
    window.localStorage.setItem('pref_compact', compactMode ? '1' : '0')
  }, [compactMode])

  // Guardar timeout de sesión
  useEffect(() => {
    window.localStorage.setItem('pref_session_timeout', String(sessionTimeout))
  }, [sessionTimeout])

  // Guardar preferencia de auto-logout
  useEffect(() => {
    window.localStorage.setItem('pref_auto_logout', autoLogoutEnabled ? '1' : '0')
  }, [autoLogoutEnabled])

  return (
    <div className="h-full bg-white text-gray-900 dark:bg-neutral-900 dark:text-gray-100 overflow-hidden">
      <main className="h-full overflow-y-auto bg-white text-gray-900 dark:bg-neutral-900 dark:text-gray-100">
        <div className="p-6">
        <Header onBack={onBack} title="Configuración" showBack={true} />

        <section className="border border-gray-300 dark:border-neutral-700 rounded-lg p-6 bg-white dark:bg-neutral-800 space-y-8">
          {/* ===== TEMA Y VISUALIZACIÓN ===== */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Tema y Visualización</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Modo oscuro */}
              <div className="flex items-center justify-between p-3 border border-gray-300 dark:border-neutral-700 rounded-lg bg-gray-50 dark:bg-neutral-700/30">
                <span className="text-sm font-medium">Modo oscuro</span>
                <button
                  onClick={() => setDarkMode(d => !d)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all ${darkMode ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-700'}`}
                >
                  {darkMode ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Alto contraste */}
              <div className="flex items-center justify-between p-3 border border-gray-300 dark:border-neutral-700 rounded-lg bg-gray-50 dark:bg-neutral-700/30">
                <span className="text-sm font-medium">Alto contraste</span>
                <button
                  onClick={() => setHighContrast(c => !c)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all ${highContrast ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-700'}`}
                >
                  {highContrast ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Modo compacto */}
              <div className="flex items-center justify-between p-3 border border-gray-300 dark:border-neutral-700 rounded-lg bg-gray-50 dark:bg-neutral-700/30">
                <span className="text-sm font-medium">Modo compacto</span>
                <button
                  onClick={() => setCompactMode(c => !c)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all ${compactMode ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-700'}`}
                >
                  {compactMode ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            {/* Tamaño de fuente */}
            <div className="border border-gray-300 dark:border-neutral-700 rounded-lg p-4 bg-gray-50 dark:bg-neutral-700/30">
              <label className="text-sm font-medium block mb-3">Tamaño de fuente: {Math.round(fontScale * 100)}%</label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: 'Pequeño', value: 0.9 },
                  { label: 'Normal', value: 1.0 },
                  { label: 'Grande', value: 1.15 },
                  { label: 'Extra Grande', value: 1.3 }
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setFontScale(opt.value)}
                    className={`px-3 py-2 rounded text-xs font-medium transition-all ${
                      fontScale === opt.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ===== SESIÓN Y SEGURIDAD ===== */}
          <div className="border-t border-gray-300 dark:border-neutral-700 pt-6 space-y-4">
            <h3 className="text-xl font-semibold">Sesión y Seguridad</h3>
            
            {/* Auto-logout toggle */}
            <div className="flex items-center justify-between p-4 border border-gray-300 dark:border-neutral-700 rounded-lg bg-gray-50 dark:bg-neutral-700/30">
              <div>
                <span className="text-sm font-medium">Cerrar sesión automáticamente</span>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Por inactividad</p>
              </div>
              <button
                onClick={() => setAutoLogoutEnabled(a => !a)}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${autoLogoutEnabled ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-700'}`}
              >
                {autoLogoutEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Timeout slider - Solo mostrar si auto-logout está activado */}
            {autoLogoutEnabled && (
              <div className="border border-gray-300 dark:border-neutral-700 rounded-lg p-4 bg-gray-50 dark:bg-neutral-700/30">
                <label className="text-sm font-medium block mb-3">
                  Minutos de inactividad: {sessionTimeout}
                </label>
                <input
                  type="range"
                  min="5"
                  max="120"
                  step="5"
                  value={sessionTimeout}
                  onChange={(e) => setSessionTimeout(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-2">
                  <span>5 min</span>
                  <span>120 min</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-3">
                  ⚠️ Se cerrará tu sesión si no hay actividad después de este tiempo
                </p>
              </div>
            )}

            {/* Aviso cuando auto-logout está desactivado */}
            {!autoLogoutEnabled && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  🔓 Tu sesión no se cerrará automáticamente. Recuerda cerrar sesión manualmente cuando no uses el equipo.
                </p>
              </div>
            )}
          </div>

          {/* ===== USUARIO ===== */}
          <div className="border-t border-gray-300 dark:border-neutral-700 pt-6 space-y-4">
            <h3 className="text-xl font-semibold">Cuenta</h3>
            {!loading && user ? (
              <div className="p-4 border border-gray-300 dark:border-neutral-700 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                    {user.user_metadata?.full_name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <div className="font-medium">{user.user_metadata?.full_name || 'Usuario'}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">{user.email}</div>
                  </div>
                </div>
                <button 
                  onClick={() => setShowEditModal(true)}
                  className="w-full px-4 py-2 rounded-lg text-sm font-medium border border-blue-500 bg-white dark:bg-neutral-800 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  Editar Perfil
                </button>
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500">Cargando...</div>
            )}
          </div>
        </section>

        {/* Modal de edición de perfil */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm z-50 p-4">
            <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl w-full max-w-md p-6 border border-gray-200 dark:border-neutral-700">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-black dark:text-white">Editar Perfil</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-2xl leading-none"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {/* Nombre */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    value={editData.displayName}
                    onChange={(e) => setEditData({ ...editData, displayName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    value={editData.email}
                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Nueva contraseña */}
                <div className="pt-4 border-t border-gray-200 dark:border-neutral-700">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                    Deja vacío si no deseas cambiar la contraseña
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nueva contraseña
                    </label>
                    <input
                      type="password"
                      value={editData.newPassword}
                      onChange={(e) => setEditData({ ...editData, newPassword: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                </div>

                {/* Confirmar contraseña */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Confirmar contraseña
                  </label>
                  <input
                    type="password"
                    value={editData.confirmPassword}
                    onChange={(e) => setEditData({ ...editData, confirmPassword: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Mensajes */}
                {editError && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
                    {editError}
                  </div>
                )}
                {editSuccess && (
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-sm">
                    {editSuccess}
                  </div>
                )}

                {/* Botones */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowEditModal(false)}
                    disabled={editLoading}
                    className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-700 disabled:opacity-50 font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={editLoading}
                    className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 font-medium"
                  >
                    {editLoading ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-auto">
          <Footer compact />
        </div>
        </div>
      </main>
    </div>
  )
}