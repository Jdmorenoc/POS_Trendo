import { useEffect, useState } from 'react'
import Login from './Login'
import Menu from './Menu'
import Inventory from './inventario/Inventory'
import ControlStock from './inventario/ControlStock'
import Configuracion from './inventario/Configuracion'
import Cash from './caja/Cash'
import Contabilidad from './contabilidad/Contabilidad'
import { supabase } from '@/lib/supabase'

export default function App() {
  const [user, setUser] = useState(null)
  const [view, setView] = useState('loading') // 'login' | 'menu' | 'inventory' | 'cash'

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
  if (view === 'inventory') return <Inventory onBack={() => setView('menu')} onLogout={handleLogout} onNavigate={setView} />
  if (view === 'controlStock') return <ControlStock onBack={() => setView('menu')} onLogout={handleLogout} onNavigate={setView} />
  if (view === 'configuracion') return <Configuracion onBack={() => setView('menu')} onLogout={handleLogout} onNavigate={setView} />
  if (view === 'cash') return <Cash onBack={() => setView('menu')} onLogout={handleLogout} />
  return (
    <Menu
      onGoInventory={() => setView('inventory')}
      onGoCash={() => setView('cash')}
      onLogout={handleLogout}
    />
  )
}
