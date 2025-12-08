import { useEffect, useState } from 'react'
import Login from './Login'
import ChatWindow from './ChatWindow'
import Menu from './Menu'
import Inventory from './inventario/Inventory'
import ControlStock from './inventario/ControlStock'
import Configuracion from './configuracion/Configuracion'
// Devoluciones moved under Caja module
import DevolucionesCaja from './caja/DevolucionesCaja'
import Cash from './caja/Cash'
import Contabilidad from './contabilidad/Contabilidad'
import Payment from './caja/Payment'
import { supabase } from '@/services/supabaseClient'
import { syncAll, onConnectivityChange } from '@/services/sync'
import ResetPassword from './ResetPassword'

export default function App() {
  const [user, setUser] = useState(null)
  const [view, setView] = useState('loading') // 'login' | 'menu' | 'inventory' | 'cash'
  const [authMessage, setAuthMessage] = useState('')
  const [showChatbot, setShowChatbot] = useState(false)
  // Apply saved dark mode preference (class strategy)
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const savedDark = window.localStorage.getItem('pref_dark') === '1'
        document.documentElement.classList.toggle('dark', savedDark)
      }
    } catch {/* ignore */}
  }, [])

  // Apply saved font size preference globally on startup
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = window.localStorage.getItem('pref_font_scale')
        const scale = saved ? parseFloat(saved) : 1
        const pct = isFinite(scale) && scale > 0 ? scale * 100 : 100
        document.documentElement.style.fontSize = `${pct}%`
      }
    } catch {
      // ignore if localStorage or DOM not available
    }
  }, [])

  

  useEffect(() => {
    async function boot() {
      // First: check URL for recovery / error params and handle them before session check
      try {
        if (typeof window !== 'undefined') {
          const href = window.location.href
          const url = new URL(href)
          const hash = window.location.hash || ''
          let params = new URLSearchParams()
          if (hash.startsWith('#')) params = new URLSearchParams(hash.slice(1))
          const type = params.get('type') || url.searchParams.get('type')
          const access_token = params.get('access_token') || url.searchParams.get('access_token')
          const refresh_token = params.get('refresh_token') || url.searchParams.get('refresh_token')
          const error = params.get('error') || url.searchParams.get('error')
          const error_description = params.get('error_description') || url.searchParams.get('error_description')
          if (error || error_description) {
            const msg = decodeURIComponent(error_description || error || '')
            setAuthMessage(msg || 'Error al procesar el enlace de recuperación')
            setView('login')
            try { window.history.replaceState({}, document.title, window.location.pathname + window.location.search) } catch {}
            return
          }
          if (type === 'recovery' || access_token) {
            try {
              if (access_token && typeof supabase?.auth?.setSession === 'function') {
                await supabase.auth.setSession({ access_token, refresh_token })
              }
            } catch (e) {
              console.warn('No se pudo establecer la sesión desde el enlace de recuperación', e)
            }
            setView('reset')
            try { window.history.replaceState({}, document.title, window.location.pathname + window.location.search) } catch {}
            return
          }
        }
      } catch (e) { /* ignore */ }
      try {
        if (supabase?.auth?.getSession) {
          const { data } = await supabase.auth.getSession()
          const sess = data?.session
          const nowSec = Math.floor(Date.now() / 1000)
          const expired = sess && sess.expires_at && Number(sess.expires_at) <= nowSec
          if (sess && sess.user && !expired) {
            setUser(sess.user)
            setView('menu')
          } else {
            // No valid session: ensure Supabase clears any stored session and show login
            try { if (typeof supabase?.auth?.signOut === 'function') await supabase.auth.signOut() } catch {}
            try { if (typeof window !== 'undefined') window.localStorage.removeItem('mock_user') } catch {}
            setUser(null)
            setView('login')
          }
          // subscribe to auth changes
          supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
              setUser(session.user)
              setView('menu')
            } else {
              // Clear any local session and force login view
              try { if (typeof window !== 'undefined') window.localStorage.removeItem('mock_user') } catch {}
              setUser(null)
              setView('login')
            }
          })
        } else {
          // Fallback: mock session from localStorage
          const mock = JSON.parse((typeof window !== 'undefined' ? window.localStorage.getItem('mock_user') : 'null') || 'null')
          if (mock) {
            setUser(mock)
            setView('menu')
          } else {
            setView('login')
          }
        }
      } catch {
        setView('login')
      }
    }
    boot()
  }, [])

  // Re-check session when window regains focus or becomes visible
  useEffect(() => {
    if (typeof window === 'undefined') return
    let mounted = true
    const checkSession = async () => {
      try {
        if (!supabase?.auth?.getSession) return
        const { data } = await supabase.auth.getSession()
        if (!mounted) return
        if (data?.session?.user) {
          setUser(data.session.user)
          // keep menu if already on menu
          if (view !== 'reset') setView('menu')
        } else {
          try { window.localStorage.removeItem('mock_user') } catch {}
          setUser(null)
          setView('login')
        }
      } catch (e) {
        // ignore
      }
    }

    const onFocus = () => { checkSession() }
    const onVisibility = () => { if (document.visibilityState === 'visible') checkSession() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      mounted = false
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [view])

  function handleAuthenticated(u) {
    if (!supabase?.auth && typeof window !== 'undefined') {
      window.localStorage.setItem('mock_user', JSON.stringify(u))
    }
    setUser(u)
    setView('menu')
  }

  async function handleLogout() {
  try { if (supabase?.auth?.signOut) await supabase.auth.signOut() } catch { /* ignore */ }
  if (typeof window !== 'undefined') window.localStorage.removeItem('mock_user')
    setUser(null)
    setView('login')
  }

  useEffect(() => {
    if (!user || typeof window === 'undefined') return

    async function initialSync() {
      try {
        await syncAll()
      } catch {
        // ignoramos en modo silencioso; se reintentará en el intervalo
      }
    }

    initialSync()

    const intervalId = window.setInterval(() => {
      if (navigator.onLine) {
        syncAll()
      }
    }, 30_000)

    const unsubscribe = typeof onConnectivityChange === 'function'
      ? onConnectivityChange(() => { if (navigator.onLine) syncAll() })
      : undefined

    return () => {
      window.clearInterval(intervalId)
      if (typeof unsubscribe === 'function') unsubscribe()
    }
  }, [user])

  if (view === 'loading') return null
  if (view === 'reset') return <ResetPassword onDone={() => setView('login')} />
  if (!user || view === 'login') return <Login onAuthenticated={handleAuthenticated} initialInfo={authMessage} />
  
  return (
    <>
      {view === 'inventory' && <Inventory user={user} onBack={() => setView('menu')} onLogout={handleLogout} onNavigate={setView} />}
      {view === 'controlStock' && <ControlStock onBack={() => setView('menu')} onLogout={handleLogout} onNavigate={setView} />}
      {view === 'configuracion' && <Configuracion onBack={() => setView('menu')} />}
      {view === 'cash' && <Cash onBack={() => setView('menu')} onLogout={handleLogout} onNavigate={setView} />}
      {view === 'devoluciones' && <DevolucionesCaja onBack={() => setView('menu')} onLogout={handleLogout} onNavigate={setView} />}
      {view === 'payment' && <Payment onBack={() => setView('cash')} onNavigate={setView} />}
      {view === 'contabilidad' && <Contabilidad onBack={() => setView('menu')} />}
      {view === 'menu' && (
        <Menu
          onGoInventory={() => setView('inventory')}
          onGoCash={() => setView('cash')}
          onGoContabilidad={() => setView('contabilidad')}
          onGoConfiguracion={() => setView('configuracion')}
          onLogout={handleLogout}
          user={user}
        />
      )}
      
      {/* Chatbot flotante disponible en todas las vistas */}
      {showChatbot && <ChatWindow onClose={() => setShowChatbot(false)} />}
      
      {/* Botón para abrir chatbot si no está visible */}
      {!showChatbot && user && view !== 'login' && (
        <button
          onClick={() => setShowChatbot(true)}
          className="fixed bottom-6 right-6 z-40 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all hover:shadow-xl"
          title="Abrir Asistente IA"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 3 .97 4.29L2 22l6.29-.97C9.23 21.62 10.6 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
        </button>
      )}
    </>
  )
}
