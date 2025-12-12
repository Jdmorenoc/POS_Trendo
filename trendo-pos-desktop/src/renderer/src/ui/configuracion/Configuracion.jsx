/* eslint-disable no-unused-vars, no-undef */
import { useEffect, useState, useRef } from 'react'
import Header from '../inventario/Layout/Header'
import Footer from '../inventario/Layout/Footer'
import { supabase } from '@/services/supabaseClient'
import { syncProfileChangesToEmployee } from '@/services/employees'

// Componente principal de Configuración con todas las opciones de accesibilidad
export default function Configuracion({ onBack, user: initialUser }) {
  // Preferencias de UI
  const [highContrast, setHighContrast] = useState(() => typeof window !== 'undefined' && window.localStorage.getItem('pref_contrast') === '1')
  const [fontScale, setFontScale] = useState(() => typeof window !== 'undefined' ? parseFloat(window.localStorage.getItem('pref_font_scale') || '1') : 1)
  const [darkMode, setDarkMode] = useState(() => typeof window !== 'undefined' && window.localStorage.getItem('pref_dark') === '1')
  const [sessionTimeout, setSessionTimeout] = useState(() => typeof window !== 'undefined' ? parseInt(window.localStorage.getItem('pref_session_timeout') || '30') : 30)
  const [autoLogoutEnabled, setAutoLogoutEnabled] = useState(() => typeof window !== 'undefined' && window.localStorage.getItem('pref_auto_logout') !== '0')
  const audioRef = useRef(null)
  const fileInputRef = useRef(null)

  // Estado de usuario y perfil
  const [user, setUser] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')
  const [editSuccess, setEditSuccess] = useState('')
  const [editData, setEditData] = useState({
    username: '',
    firstName: '',
    secondName: '',
    lastName: '',
    secondLastName: '',
    email: '',
    phone: '',
    profileImage: '',
    newPassword: '',
    confirmPassword: '',
    currentPassword: ''
  })

  // Cargar usuario actual
  useEffect(() => {
    async function loadUser() {
      try {
        // Primero, intentar usar el usuario del prop (viene de App)
        if (initialUser) {
          console.log('✅ Usando usuario del prop:', initialUser.email)
          setUser(initialUser)
          const firstName = initialUser.user_metadata?.first_name || ''
          const secondName = initialUser.user_metadata?.second_name || ''
          const lastName = initialUser.user_metadata?.last_name || ''
          const secondLastName = initialUser.user_metadata?.second_last_name || ''
          
          console.log('✅ Usuario cargado desde prop:', {
            email: initialUser.email,
            firstName,
            secondName,
            lastName,
            secondLastName
          })
          
          setEditData(prev => ({
            ...prev,
            username: initialUser.user_metadata?.username || '',
            firstName,
            secondName,
            lastName,
            secondLastName,
            email: initialUser.email || '',
            phone: initialUser.user_metadata?.phone || '',
            profileImage: initialUser.user_metadata?.avatar_url || ''
          }))
          setLoading(false)
          return
        }
        
        // Si no hay usuario en props, obtenerlo de Supabase
        console.log('🔄 Intentando cargar usuario de Supabase...')
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error) {
          console.error('❌ Error al obtener usuario:', error)
        }
        
        console.log('📥 Usuario obtenido de Supabase:', user?.email)
        if (user) {
          setUser(user)
          const firstName = user.user_metadata?.first_name || ''
          const secondName = user.user_metadata?.second_name || ''
          const lastName = user.user_metadata?.last_name || ''
          const secondLastName = user.user_metadata?.second_last_name || ''
          
          console.log('✅ Usuario cargado de Supabase:', {
            email: user.email,
            firstName,
            secondName,
            lastName,
            secondLastName
          })
          
          setEditData(prev => ({
            ...prev,
            username: user.user_metadata?.username || '',
            firstName,
            secondName,
            lastName,
            secondLastName,
            email: user.email || '',
            phone: user.user_metadata?.phone || '',
            profileImage: user.user_metadata?.avatar_url || ''
          }))
        } else {
          console.warn('⚠️ No hay usuario autenticado en Supabase')
          // Intentar cargar desde localStorage como fallback
          if (typeof window !== 'undefined') {
            const storedUser = window.localStorage.getItem('mock_user')
            if (storedUser) {
              try {
                const localUser = JSON.parse(storedUser)
                console.log('📥 Usuario cargado desde localStorage:', localUser.email)
                setUser(localUser)
                const firstName = localUser.user_metadata?.first_name || ''
                const secondName = localUser.user_metadata?.second_name || ''
                const lastName = localUser.user_metadata?.last_name || ''
                const secondLastName = localUser.user_metadata?.second_last_name || ''
                
                setEditData(prev => ({
                  ...prev,
                  username: localUser.user_metadata?.username || '',
                  firstName,
                  secondName,
                  lastName,
                  secondLastName,
                  email: localUser.email || '',
                  phone: localUser.user_metadata?.phone || '',
                  profileImage: localUser.user_metadata?.avatar_url || ''
                }))
              } catch (e) {
                console.error('Error parseando usuario de localStorage:', e)
              }
            }
          }
        }
      } catch (e) {
        console.error('💥 Error cargando usuario:', e)
      } finally {
        setLoading(false)
      }
    }
    loadUser()
  }, [initialUser])

  // Función para abrir modal y recargar datos
  async function openEditModal() {
    setShowEditModal(true)
    // Recargar datos del usuario para asegurar que tenemos la información más reciente
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const firstName = user.user_metadata?.first_name || ''
        const secondName = user.user_metadata?.second_name || ''
        const lastName = user.user_metadata?.last_name || ''
        const secondLastName = user.user_metadata?.second_last_name || ''
        
        console.log('Recargando datos en modal:', {
          firstName,
          secondName,
          lastName,
          secondLastName,
          avatar_url: user.user_metadata?.avatar_url
        })
        setEditData(prev => ({
          ...prev,
          firstName,
          secondName,
          lastName,
          secondLastName,
          email: user.email || '',
          phone: user.user_metadata?.phone || '',
          profileImage: user.user_metadata?.avatar_url || ''
        }))
        setUser(user)
      }
    } catch (e) {
      console.error('Error recargando usuario:', e)
    }
  }

  // Función para cargar archivo de imagen
  function handleImageFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo de archivo
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setEditError('Por favor selecciona un archivo JPG o PNG')
      return
    }

    // Validar tamaño (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setEditError('La imagen no debe superar 2MB')
      return
    }

    // Convertir a base64
    const reader = new FileReader()
    reader.onload = (event) => {
      const base64String = event.target?.result
      setEditData({ ...editData, profileImage: base64String })
      setEditError('')
    }
    reader.onerror = () => {
      setEditError('Error al cargar la imagen')
    }
    reader.readAsDataURL(file)
  }

  // Guardar cambios de perfil
  async function handleSaveProfile() {
    setEditError('')
    setEditSuccess('')
    setEditLoading(true)

    try {
      // Verificar que hay un usuario autenticado
      if (!user) {
        setEditError('No hay usuario autenticado. Por favor, inicia sesión de nuevo.')
        setEditLoading(false)
        return
      }

      const updates = { data: {} }

      // Actualizar nombre de usuario
      if (editData.username !== (user?.user_metadata?.username || '')) {
        updates.data.username = editData.username
      }

      // Actualizar nombres
      if (editData.firstName && editData.firstName !== (user?.user_metadata?.first_name || '')) {
        updates.data.first_name = editData.firstName
      }
      if (editData.secondName !== (user?.user_metadata?.second_name || '')) {
        updates.data.second_name = editData.secondName
      }
      if (editData.lastName && editData.lastName !== (user?.user_metadata?.last_name || '')) {
        updates.data.last_name = editData.lastName
      }
      if (editData.secondLastName !== (user?.user_metadata?.second_last_name || '')) {
        updates.data.second_last_name = editData.secondLastName
      }

      // Actualizar teléfono
      if (editData.phone && editData.phone !== (user?.user_metadata?.phone || '')) {
        updates.data.phone = editData.phone
      }

      // Actualizar imagen de perfil
      if (editData.profileImage && editData.profileImage !== (user?.user_metadata?.avatar_url || '')) {
        console.log('📸 Actualizando imagen de perfil:', {
          esBase64: editData.profileImage.startsWith('data:'),
          longitud: editData.profileImage.length
        })
        updates.data.avatar_url = editData.profileImage
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
      if (Object.keys(updates.data).length === 0 && !updates.email && !updates.password) {
        setEditError('No hay cambios para guardar')
        setEditLoading(false)
        return
      }

      console.log('🔄 Intentando actualizar usuario en Supabase...', updates)
      
      // Intentar actualizar en Supabase
      let error = null
      let updatedUser = null
      
      try {
        const result = await supabase.auth.updateUser(updates)
        error = result.error
        if (!error) {
          const { data: { user: fetchedUser } } = await supabase.auth.getUser()
          updatedUser = fetchedUser
        }
      } catch (e) {
        console.warn('⚠️ Supabase updateUser falló, usando modo local:', e.message)
        error = e
      }

      // Construir usuario actualizado (siempre)
      const updatedUserLocal = {
        ...user,
        email: updates.email || user.email,
        user_metadata: {
          ...user.user_metadata,
          username: updates.data.username || user.user_metadata?.username,
          first_name: updates.data.first_name || user.user_metadata?.first_name,
          second_name: updates.data.second_name !== undefined ? updates.data.second_name : user.user_metadata?.second_name,
          last_name: updates.data.last_name || user.user_metadata?.last_name,
          second_last_name: updates.data.second_last_name !== undefined ? updates.data.second_last_name : user.user_metadata?.second_last_name,
          phone: updates.data.phone || user.user_metadata?.phone,
          avatar_url: updates.data.avatar_url || user.user_metadata?.avatar_url
        }
      }
      
      // Guardar SIEMPRE en localStorage (persistencia local)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('mock_user', JSON.stringify(updatedUserLocal))
        console.log('✅ Perfil actualizado y guardado en localStorage')
      }
      
      // Usar el usuario local si Supabase falló
      if (!updatedUser) {
        updatedUser = updatedUserLocal
      }
      
      console.log('✅ Perfil actualizado correctamente')
      setEditSuccess('Perfil actualizado correctamente')
      
      console.log('📥 Usuario actualizado:', {
        firstName: updatedUser?.user_metadata?.first_name,
        lastName: updatedUser?.user_metadata?.last_name,
        avatar_url: updatedUser?.user_metadata?.avatar_url ? 'Presente' : 'No hay'
      })
      setUser(updatedUser)
      
      // Actualizar editData con los nuevos valores
      setEditData(prev => ({
        ...prev,
        username: updatedUser?.user_metadata?.username || '',
        firstName: updatedUser?.user_metadata?.first_name || '',
        secondName: updatedUser?.user_metadata?.second_name || '',
        lastName: updatedUser?.user_metadata?.last_name || '',
        secondLastName: updatedUser?.user_metadata?.second_last_name || '',
        email: updatedUser?.email || '',
        phone: updatedUser?.user_metadata?.phone || '',
        profileImage: updatedUser?.user_metadata?.avatar_url || '',
        newPassword: '',
        confirmPassword: '',
        currentPassword: ''
      }))
      
      // Sincronizar cambios a tabla employee en Supabase
      try {
        await syncProfileChangesToEmployee({
          first_name: editData.firstName,
          second_name: editData.secondName,
          last_name: editData.lastName,
          second_last_name: editData.secondLastName,
          email: editData.email,
          phone: editData.phone,
          avatar_url: editData.profileImage
        })
        console.log('✅ Cambios sincronizados a tabla employee')
      } catch (syncError) {
        console.error('⚠️ Error sincronizando a tabla employee:', syncError)
        // No mostrar error al usuario, pero loguear
      }

      // Cerrar modal después de 2 segundos
      setTimeout(() => {
        setShowEditModal(false)
      }, 2000)
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
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                <div>Cargando información de usuario...</div>
              </div>
            ) : user ? (
              <div className="p-4 border border-gray-300 dark:border-neutral-700 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg overflow-hidden flex-shrink-0">
                    {user.user_metadata?.avatar_url ? (
                      <img src={user.user_metadata.avatar_url} alt="Perfil" className="w-full h-full object-cover" />
                    ) : (
                      user.user_metadata?.first_name?.[0]?.toUpperCase() || 'U'
                    )}
                  </div>
                  <div>
                    <div className="font-medium">
                      {user.user_metadata?.username || 'Usuario'}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">{user.email}</div>
                  </div>
                </div>
                <button 
                  onClick={openEditModal}
                  className="w-full px-4 py-2 rounded-lg text-sm font-medium border border-blue-500 bg-white dark:bg-neutral-800 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  Editar Perfil
                </button>
              </div>
            ) : (
              <div className="p-4 border border-red-300 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20 text-center text-red-700 dark:text-red-300">
                <div>No hay usuario autenticado</div>
              </div>
            )}
          </div>
        </section>

        {/* Modal de edición de perfil */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm z-50 p-4 overflow-y-auto">
            <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl w-full max-w-sm p-4 border border-gray-200 dark:border-neutral-700 my-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-black dark:text-white">Editar Perfil</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xl leading-none"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 max-h-[70vh] overflow-y-auto">
                {/* Imagen de Perfil - Compacta */}
                <div className="flex gap-3 items-center pb-2 border-b border-gray-200 dark:border-neutral-700">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold overflow-hidden flex-shrink-0">
                    {editData.profileImage ? (
                      <img src={editData.profileImage} alt="Perfil" className="w-full h-full object-cover" />
                    ) : (
                      editData.firstName?.[0]?.toUpperCase() || 'U'
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={handleImageFileSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full px-2 py-1 rounded text-xs border border-gray-300 dark:border-neutral-600 bg-gray-50 dark:bg-neutral-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-600 transition-colors font-medium"
                    >
                      📁 Cambiar foto
                    </button>
                  </div>
                </div>

                {/* Nombre de Usuario */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre de Usuario
                  </label>
                  <input
                    type="text"
                    value={editData.username}
                    onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                    className="w-full px-2 py-1.5 rounded text-sm border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Mi nombre de usuario"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Este es el nombre que se mostrará públicamente</p>
                </div>

                {/* Nombres - Grid de 2 columnas */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Primer nombre
                    </label>
                    <input
                      type="text"
                      value={editData.firstName}
                      onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
                      className="w-full px-2 py-1.5 rounded text-sm border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Juan"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Segundo nombre
                    </label>
                    <input
                      type="text"
                      value={editData.secondName}
                      onChange={(e) => setEditData({ ...editData, secondName: e.target.value })}
                      className="w-full px-2 py-1.5 rounded text-sm border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Carlos"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Primer apellido
                    </label>
                    <input
                      type="text"
                      value={editData.lastName}
                      onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
                      className="w-full px-2 py-1.5 rounded text-sm border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Pérez"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Segundo apellido
                    </label>
                    <input
                      type="text"
                      value={editData.secondLastName}
                      onChange={(e) => setEditData({ ...editData, secondLastName: e.target.value })}
                      className="w-full px-2 py-1.5 rounded text-sm border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="García"
                    />
                  </div>
                </div>

                {/* Email y Teléfono */}
                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Correo electrónico
                    </label>
                    <input
                      type="email"
                      value={editData.email}
                      onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                      className="w-full px-2 py-1.5 rounded text-sm border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Número de celular
                    </label>
                    <input
                      type="tel"
                      placeholder="+57 3XX XXXXXXX"
                      value={editData.phone}
                      onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                      className="w-full px-2 py-1.5 rounded text-sm border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Contraseña - Separador */}
                <div className="pt-2 border-t border-gray-200 dark:border-neutral-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Deja vacío para no cambiar contraseña
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Nueva contraseña
                      </label>
                      <input
                        type="password"
                        value={editData.newPassword}
                        onChange={(e) => setEditData({ ...editData, newPassword: e.target.value })}
                        className="w-full px-2 py-1.5 rounded text-sm border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Mín. 6 caracteres"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Confirmar
                      </label>
                      <input
                        type="password"
                        value={editData.confirmPassword}
                        onChange={(e) => setEditData({ ...editData, confirmPassword: e.target.value })}
                        className="w-full px-2 py-1.5 rounded text-sm border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Mensajes - Compactos */}
                {editError && (
                  <div className="p-2 rounded text-xs bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
                    {editError}
                  </div>
                )}
                {editSuccess && (
                  <div className="p-2 rounded text-xs bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300">
                    {editSuccess}
                  </div>
                )}

                {/* Botones - Compactos */}
                <div className="flex gap-2 pt-3 sticky bottom-0 bg-white dark:bg-neutral-800">
                  <button
                    onClick={() => setShowEditModal(false)}
                    disabled={editLoading}
                    className="flex-1 px-3 py-1.5 rounded text-sm border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-700 disabled:opacity-50 font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={editLoading}
                    className="flex-1 px-3 py-1.5 rounded text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 font-medium"
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