import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

function createNoopSupabase() {
  const noop = async () => ({ data: [], error: null })
  const table = () => ({ select: noop, gt: () => ({ select: noop }), upsert: noop })
  const channelObj = {
    on() { return this },
    subscribe() { return this }
  }
  return {
    from: table,
    channel() { return channelObj },
    removeChannel() {}
  }
}

export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      },
      db: { schema: 'public' }
    })
  : createNoopSupabase()
