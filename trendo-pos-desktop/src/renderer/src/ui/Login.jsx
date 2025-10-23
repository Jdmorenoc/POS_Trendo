import { useEffect, useMemo, useState } from 'react'
import { onConnectivityChange } from '@/lib/sync'
import { supabase } from '@/lib/supabase'

function WifiIcon({ className = 'w-4 h-4' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" y1="20" x2="12" y2="20" />
    </svg>
  )
}

function CloudIcon({ className = 'w-4 h-4' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M17.5 19a4.5 4.5 0 0 0 .5-8.964V10a6 6 0 0 0-11.473-2.002A4.5 4.5 0 0 0 6.5 19h11z" />
    </svg>
  )
}

function useOnline() {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  useEffect(() => onConnectivityChange(() => setOnline(navigator.onLine)), [])
  return online
}

function useNowString() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])
  const label = useMemo(() => {
    const s = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).format(now)
    return s.replace('.', '')
  }, [now])
  return label
}

function ConnectionBar() {
  const online = useOnline()
  const dateLabel = useNowString()
  return (
    <div className="mx-auto mt-4 w-[560px] max-w-[92vw] bg-white/95 text-gray-800 rounded-xl shadow border flex items-center justify-between px-5 py-3">
      <div className="flex items-center gap-3">
        <WifiIcon className={online ? 'w-4 h-4 text-green-600' : 'w-4 h-4 text-red-600'} />
        <CloudIcon className={online ? 'w-4 h-4 text-green-600' : 'w-4 h-4 text-red-600'} />
        <span className={online ? 'text-green-700 font-medium' : 'text-red-600 font-medium'}>
          {online ? 'Conectado' : 'Desconectado'}
        </span>
      </div>
      <div className="text-sm text-gray-500">{dateLabel}</div>
    </div>
  )
}

export default function Login({ onAuthenticated }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('login') // or 'register'
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (supabase?.auth) {
        if (mode === 'login') {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password })
          if (error) throw error
          onAuthenticated?.(data?.user || { email })
        } else {
          const { data, error } = await supabase.auth.signUp({ email, password })
          if (error) throw error
          // Si requiere verificación, aún seguimos a la app
          onAuthenticated?.(data?.user || { email })
        }
      } else {
        // Modo sin Supabase: permitir acceso mock
        onAuthenticated?.({ email })
      }
    } catch (err) {
      setError(err?.message || 'Error al autenticar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center">
      {/* Card */}
      <div className="w-[560px] max-w-[92vw] bg-gray-100 text-gray-900 rounded-xl shadow-lg border border-gray-200 p-8">
        <div className="flex justify-center mb-6">
          <div className="w-24 h-12 bg-black rounded-full flex items-center justify-center text-white text-lg font-semibold">
            Trendo
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm mb-1">Correo Electrónico</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded border bg-white outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="cajero@tienda.com"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded border bg-white outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="••••••••"
            />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded bg-black text-white font-semibold hover:bg-gray-900 disabled:opacity-60"
          >
            {mode === 'login' ? 'Iniciar Sesión' : 'Crear cuenta'}
          </button>
        </form>

        <div className="mt-4 text-xs text-gray-600">
          Acceso exclusivo para personal autorizado ·{' '}
          {mode === 'login' ? (
            <button className="text-blue-600 hover:underline" onClick={() => setMode('register')}>Crear cuenta</button>
          ) : (
            <button className="text-blue-600 hover:underline" onClick={() => setMode('login')}>Ya tengo cuenta</button>
          )}
        </div>
      </div>

      {/* Connection */}
      <ConnectionBar />
    </div>
  )
}
