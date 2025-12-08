import { supabase } from './supabaseClient'

// --- CONSTANTES ---
const STORAGE_KEY = 'mock_credentials'
const DEFAULT_ROLE = 'Cajero'
const VALID_ROLES = ['Administrador', 'Cajero']

// --- AYUDANTES ---
function hasSupabaseAuth() {
  return Boolean(supabase && supabase.auth && typeof supabase.auth.signInWithPassword === 'function')
}

function normalizeTypeEmployee(role) {
  if (VALID_ROLES.includes(role)) return role
  return DEFAULT_ROLE
}

// --- STORE LOCAL (MOCK / OFFLINE) ---
function getStore() {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function setStore(store) {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store)) } catch {}
}

function persistMockSession(user) {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem('mock_user', JSON.stringify(user)) } catch {}
}

// ==========================================
// 1. FUNCIÓN DE INICIO DE SESIÓN (LOGIN)
// ==========================================
export async function loginWithEmail(email, password) {
  const trimmedEmail = String(email || '').trim().toLowerCase()
  const safePassword = String(password || '')

  if (!trimmedEmail || !safePassword) {
    throw new Error('Correo y contraseña requeridos')
  }

  // --- MODO ONLINE (SUPABASE) ---
  if (hasSupabaseAuth()) {
    // A. Intentar loguear con Auth
    const { data, error } = await supabase.auth.signInWithPassword({ 
      email: trimmedEmail, 
      password: safePassword 
    })

    if (error) {
      // Manejo específico para cuando falta confirmar correo
      if (error.message.includes("Email not confirmed")) {
        throw new Error("Debes confirmar tu correo electrónico antes de iniciar sesión.")
      }
      throw error
    }

    // B. Recuperar datos del empleado desde el esquema 'trendo'
    const rawUser = data?.user
    let typeEmployee = normalizeTypeEmployee(rawUser?.user_metadata?.type_employee)
    let employeeData = null

    try {
        // Consultamos la tabla real en tu esquema personalizado
        const { data: dbData } = await supabase
            .schema('trendo') // <--- IMPORTANTE: Esquema trendo
            .from('employee')
            .select('Type_employee, first_name, last_name, second_name, second_last_name')
            .eq('user_id', rawUser.id)
            .single()
        
        if (dbData) {
            employeeData = dbData
            typeEmployee = normalizeTypeEmployee(dbData.Type_employee)
        }
    } catch (err) {
        console.warn("No se pudo sincronizar perfil de empleado:", err)
    }

    // C. Construir objeto de usuario unificado
    const user = {
      ...(rawUser || {}),
      email: rawUser?.email || trimmedEmail,
      type_employee: typeEmployee,
      first_name: employeeData?.first_name || rawUser?.user_metadata?.first_name || '',
      second_name: employeeData?.second_name || rawUser?.user_metadata?.second_name || '',
      last_name: employeeData?.last_name || rawUser?.user_metadata?.last_name || '',
      second_last_name: employeeData?.second_last_name || rawUser?.user_metadata?.second_last_name || ''
    }

    persistMockSession(user)
    return user
  }

  // --- MODO OFFLINE (FALLBACK LOCAL) ---
  const store = getStore()
  const entry = store[trimmedEmail]
  if (!entry) throw new Error('Usuario no encontrado (Modo Offline)')
  if (entry.password !== safePassword) throw new Error('Contraseña incorrecta')
  
  const user = {
    email: trimmedEmail,
    type_employee: normalizeTypeEmployee(entry.type_employee),
    first_name: entry.first_name || '',
    last_name: entry.last_name || ''
  }
  persistMockSession(user)
  return user
}

// ==========================================
// 2. FUNCIÓN DE REGISTRO (CORREGIDA Y ROBUSTA)
// ==========================================
export async function registerWithEmail(email, password, roleInput, names, extraData) {
  const trimmedEmail = String(email || '').trim().toLowerCase()
  const safePassword = String(password || '')
  const typeEmployee = normalizeTypeEmployee(roleInput)
  
  const person = {
    firstName: (names?.firstName || '').trim(),
    secondName: (names?.secondName || '').trim(),
    lastName: (names?.lastName || '').trim(),
    secondLastName: (names?.secondLastName || '').trim()
  }

  // --- VALIDACIONES ---
  if (!trimmedEmail || !safePassword) throw new Error('Datos incompletos')
  if (!person.firstName || !person.lastName) throw new Error('Nombre y Apellido requeridos')
  
  // ROBUSTEZ: Buscamos el documento en extraData O dentro de 'names' (por si hubo confusión al enviar)
  const docValue = extraData?.document || names?.document || names?.em_document
  const phoneValue = extraData?.phone || names?.phone

  // Validamos que venga la cédula (obligatorio en BD)
  if (!docValue) throw new Error('La Cédula/Documento es obligatoria')

  // --- MODO ONLINE (SUPABASE) ---
  if (hasSupabaseAuth()) {
    
    // Blindaje 1: Limpiar sesión previa
    await supabase.auth.signOut()

    // 1. Crear usuario con Metadata completa
    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password: safePassword,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        data: {
          // Datos básicos
          type_employee: typeEmployee,
          first_name: person.firstName,
          second_name: person.secondName,
          last_name: person.lastName,
          second_last_name: person.secondLastName,
          
          // --- NUEVOS DATOS PARA EL TRIGGER SQL ---
          em_document: docValue, 
          phone: phoneValue
        }
      }
    })

    if (error) throw error

    // Blindaje 2: Cerrar sesión inmediatamente si se abrió
    // Esto previene entrar al software sin verificar email
    if (data.session) {
        await supabase.auth.signOut() 
    }

    return { 
        success: true, 
        requiresLogin: true, 
        message: "Registro exitoso. Revisa tu correo para confirmar la cuenta antes de ingresar." 
    }
  }

  // --- MODO OFFLINE (FALLBACK LOCAL) ---
  const store = getStore()
  if (store[trimmedEmail]) throw new Error('El usuario ya existe (Local)')
  
  store[trimmedEmail] = {
    password: safePassword,
    type_employee: typeEmployee,
    ...person,
    em_document: docValue,
    phone: phoneValue
  }
  setStore(store)
  
  const user = { email: trimmedEmail, type_employee: typeEmployee, ...person }
  persistMockSession(user)
  return user
}

export { VALID_ROLES }

// ==========================================
// 3. RECUPERACIÓN DE CONTRASEÑA
// ==========================================
export async function sendPasswordRecovery(email) {
  const trimmedEmail = String(email || '').trim().toLowerCase()
  if (!trimmedEmail) throw new Error('Correo electrónico requerido')

  if (hasSupabaseAuth()) {
    // Preferir la API moderna si está disponible
    try {
      const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined
      if (typeof supabase.auth.resetPasswordForEmail === 'function') {
        const { data, error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, { redirectTo })
        if (error) throw error
        return { success: true, message: 'Correo de recuperación enviado. Revisa tu bandeja.' }
      }

      // Fallback para versiones antiguas del cliente
      if (supabase.auth.api && typeof supabase.auth.api.resetPasswordForEmail === 'function') {
        const { data, error } = await supabase.auth.api.resetPasswordForEmail(trimmedEmail)
        if (error) throw error
        return { success: true, message: 'Correo de recuperación enviado. Revisa tu bandeja.' }
      }

      throw new Error('Funcionalidad de recuperación no disponible en este cliente de Supabase')
    } catch (err) {
      throw err
    }
  }

  // Modo offline: simulamos envío si el usuario existe localmente
  const store = getStore()
  if (!store[trimmedEmail]) throw new Error('Usuario no encontrado (Modo Offline)')
  return { success: true, message: 'Correo de recuperación simulado (Modo Offline)' }
}