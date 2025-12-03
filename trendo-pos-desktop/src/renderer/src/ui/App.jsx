import { useEffect, useState } from 'react'
import Login from './Login'
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

export default function App() {
  const [user, setUser] = useState(null)
  const [view, setView] = useState('loading') // 'login' | 'menu' | 'inventory' | 'cash'
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
      try {
        if (supabase?.auth?.getSession) {
          const { data } = await supabase.auth.getSession()
          if (data?.session?.user) {
            setUser(data.session.user)
            setView('menu')
          } else {
            setView('login')
          }
          // subscribe to auth changes
          supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
              setUser(session.user)
              setView('menu')
            } else {
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

  if (view === 'loading') return null
  if (!user || view === 'login') return <Login onAuthenticated={handleAuthenticated} />
  if (view === 'inventory') return <Inventory user={user} onBack={() => setView('menu')} onLogout={handleLogout} onNavigate={setView} />
  if (view === 'controlStock') return <ControlStock onBack={() => setView('menu')} onLogout={handleLogout} onNavigate={setView} />
  if (view === 'configuracion') return <Configuracion onBack={() => setView('menu')} />
  if (view === 'cash') return <Cash onBack={() => setView('menu')} onLogout={handleLogout} onNavigate={setView} />
  if (view === 'devoluciones') return <DevolucionesCaja onBack={() => setView('menu')} onLogout={handleLogout} onNavigate={setView} />
  if (view === 'payment') return <Payment onBack={() => setView('cash')} onNavigate={setView} />
  // Reportes moved under Contabilidad section
  if (view === 'contabilidad') return <Contabilidad onBack={() => setView('menu')} />
  return (
    <Menu
      onGoInventory={() => setView('inventory')}
      onGoCash={() => setView('cash')}
      onGoContabilidad={() => setView('contabilidad')}
      onGoConfiguracion={() => setView('configuracion')}
      onLogout={handleLogout}
      user={user}
    />
  )
}
