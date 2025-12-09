import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// Función de respaldo por si no hay llaves (evita crasheos)
function createNoopSupabase() {
  console.warn("⚠️ Supabase no está configurado. Usando cliente Mock.")

  const result = { data: [], error: null }

  function createBuilder() {
    const builder = {
      select() { return createBuilder() },
      upsert() { return createBuilder() },
      insert() { return createBuilder() },
      update() { return createBuilder() },
      delete() { return createBuilder() },
      eq() { return createBuilder() },
      in() { return createBuilder() },
      gt() { return createBuilder() },
      limit() { return createBuilder() },
      maybeSingle: async () => result,
      single: async () => result,
      then: (onFulfilled, onRejected) => Promise.resolve(result).then(onFulfilled, onRejected),
      catch: (onRejected) => Promise.resolve(result).catch(onRejected)
    }
    return builder
  }

  const channelObj = {
    on() { return this },
    subscribe() { return this }
  }

  const table = () => createBuilder()

  return {
    __mock: true,
    from: table,
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