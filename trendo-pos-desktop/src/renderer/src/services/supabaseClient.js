import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// Función de respaldo por si no hay llaves (evita crasheos)
function createNoopSupabase() {
  console.warn("⚠️ Supabase no está configurado. Usando cliente Mock.")
  
  const noop = async () => ({ data: [], error: null })
  // Agregamos 'insert' y otros métodos comunes al mock
  const table = () => ({ 
    select: noop, 
    gt: () => ({ select: noop }), 
    upsert: noop, 
    insert: noop,
    update: noop,
    delete: noop
  })
  
  const channelObj = {
    on() { return this },
    subscribe() { return this }
  }

  return {
    from: table,
    // ✅ AGREGADO: Soporte para .schema() en el mock
    // Esto permite que 'supabase.schema('trendo').from(...)' no falle
    schema: () => ({ from: table }), 
    
    channel() { return channelObj },
    removeChannel() {}
  }
}

// Inicialización del cliente
export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      },
      db: { schema: 'public' } // Default schema
    })
  : createNoopSupabase()

// Expose supabase on window in development for debugging convenience only
if (typeof window !== 'undefined' && import.meta.env && import.meta.env.DEV) {
  try {
    // attach as non-enumerable to avoid accidental serialization
    Object.defineProperty(window, '__supabase', {
      value: supabase,
      writable: false,
      configurable: true
    })
    console.info('Debug: window.__supabase available (dev only)')
  } catch (e) {
    // ignore in environments that disallow defineProperty
  }
}