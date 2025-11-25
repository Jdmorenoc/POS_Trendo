import { useEffect, useState } from 'react'
import { openShift, closeShift, getActiveShift } from '@/lib/db'
import { formatCOPInput, parseCOP } from '@/lib/currency' // corrige el path

export default function Menu({ onGoInventory, onGoCash, onGoContabilidad, onGoConfiguracion, onLogout, user }) {
  const [activeShift, setActiveShift] = useState(null)
  const [loadingShift, setLoadingShift] = useState(false)
  const [initialCashInput, setInitialCashInput] = useState('')
  const [finalCashInput, setFinalCashInput] = useState('')
  const [errorShift, setErrorShift] = useState('')
  const [showShiftModal, setShowShiftModal] = useState(false)


  useEffect(() => {
    refreshShift()
  }, [])

  async function refreshShift() {
    const s = await getActiveShift()
    setActiveShift(s || null)
  }

  async function handleOpenShift() {
    setErrorShift('')
    setLoadingShift(true)
    try {
  const cash = parseCOP(initialCashInput) || 0
      await openShift({ userEmail: user?.email, initialCash: cash })
      setInitialCashInput('')
      await refreshShift()
    } catch (e) {
      setErrorShift(e.message || 'Error abriendo turno')
    } finally {
      setLoadingShift(false)
    }
  }

  async function handleCloseShift() {
    setErrorShift('')
    setLoadingShift(true)
    try {
  const cash = parseCOP(finalCashInput) || 0
      await closeShift({ finalCash: cash })
      setFinalCashInput('')
      await refreshShift()
    } catch (e) {
      setErrorShift(e.message || 'Error cerrando turno')
    } finally {
      setLoadingShift(false)
    }
  }

  return (
    <main className="p-8">
      <div className="flex items-center justify-between mb-6">
      </div>

      {/* Tarjeta TURNO */}
      <div className="max-w-3xl mx-auto mb-8">
        <div className="rounded-xl border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0 bg-white dark:bg-neutral-700 border border-gray-200 dark:border-neutral-600">
              {/* Ticket icon with state color: green (abrir) / blue (abierto) */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className={`w-7 h-7 ${!activeShift ? 'text-green-600' : 'text-blue-600'}`}
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M4 6c0-1.105.895-2 2-2h12a2 2 0 0 1 2 2v2.25a2.75 2.75 0 0 0 0 5.5V16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2.25a2.75 2.75 0 0 0 0-5.5V6z"/>
                <rect x="8.5" y="7.5" width="7" height="9" rx="1.25" ry="1.25" fill="white" opacity=".2"/>
                <path d="M10 9.25c.414 0 .75.336.75.75v4a.75.75 0 1 1-1.5 0v-4c0-.414.336-.75.75-.75zm4 0c.414 0 .75.336.75.75v4a.75.75 0 1 1-1.5 0v-4c0-.414.336-.75.75-.75z" fill="currentColor"/>
              </svg>
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-black dark:text-white">Turno de Caja</h2>
              <p className="text-xs text-gray-600 dark:text-gray-400">{!activeShift ? 'No hay turno abierto actualmente' : 'Turno activo desde la hora indicada'}</p>
              {activeShift && (
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] text-gray-600 dark:text-gray-400 pt-1">
                  <div><span className="font-medium">Apertura:</span> {new Date(activeShift.opened_at).toLocaleTimeString()}</div>
                  <div><span className="font-medium">Inicial:</span> {activeShift.initialCash.toLocaleString('es-CO')}</div>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {activeShift && !activeShift.closed_at && (
              <span className="px-2 py-1 rounded text-[11px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">Abierto</span>
            )}
            <button
              onClick={() => { setErrorShift(''); setShowShiftModal(true); }}
              className="px-4 py-2 rounded bg-black text-white dark:bg-white dark:text-black text-sm hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-60"
            >
              {activeShift ? 'Cerrar turno' : 'Abrir turno'}
            </button>
          </div>
        </div>
      </div>

      {showShiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !loadingShift && setShowShiftModal(false)}></div>
          <div className="relative w-full max-w-md rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-black dark:text-white">{activeShift ? 'Cerrar turno' : 'Abrir turno'}</h3>
              <button disabled={loadingShift} onClick={() => setShowShiftModal(false)} className="text-gray-500 hover:text-black dark:hover:text-white text-sm">✕</button>
            </div>
            {!activeShift ? (
              <div className="space-y-5">
                <div className="text-sm text-gray-700 dark:text-gray-300">Empresa: <span className="font-semibold">TRENDO SAS</span></div>
                {user?.email && (
                  <div className="text-sm text-gray-700 dark:text-gray-300">Usuario: <span className="font-mono">{user.email}</span></div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Monto inicial (COP)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={initialCashInput}
                    onChange={e => setInitialCashInput(formatCOPInput(e.target.value))}
                    placeholder="Ej: 200.000"
                    className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-sm text-black dark:text-gray-100"
                  />
                </div>
                {errorShift && <div className="text-xs text-red-600">{errorShift}</div>}
                <div className="flex justify-end gap-3 pt-2">
                  <button disabled={loadingShift} onClick={() => setShowShiftModal(false)} className="px-4 py-2 rounded border border-gray-300 dark:border-neutral-600 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-700">Cancelar</button>
                  <button
                    disabled={loadingShift}
                    onClick={async () => { await handleOpenShift(); if(!errorShift) setShowShiftModal(false); }}
                    className="px-4 py-2 rounded bg-black text-white dark:bg-white dark:text-black text-sm hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-60"
                  >{loadingShift ? 'Abriendo…' : 'Confirmar'}</button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600 dark:text-gray-400">Empresa</div>
                    <div className="font-semibold text-black dark:text-white">TRENDO SAS</div>
                  </div>
                  <div>
                    <div className="text-gray-600 dark:text-gray-400">Apertura</div>
                    <div className="font-semibold text-black dark:text-white">{new Date(activeShift.opened_at).toLocaleTimeString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 dark:text-gray-400">Inicial</div>
                    <div className="font-semibold text-black dark:text-white">{activeShift.initialCash.toLocaleString('es-CO')}</div>
                  </div>
                </div>
                {!activeShift.closed_at ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Monto final (COP)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={finalCashInput}
                        onChange={e => setFinalCashInput(formatCOPInput(e.target.value))}
                        placeholder="Ej: 350.000"
                        className="mt-1 w-full px-3 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-sm text-black dark:text-gray-100"
                      />
                    </div>
                    {errorShift && <div className="text-xs text-red-600">{errorShift}</div>}
                    <div className="flex justify-end gap-3 pt-2">
                      <button disabled={loadingShift} onClick={() => setShowShiftModal(false)} className="px-4 py-2 rounded border border-gray-300 dark:border-neutral-600 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-700">Cancelar</button>
                      <button
                        disabled={loadingShift}
                        onClick={async () => { await handleCloseShift(); if(!errorShift) setShowShiftModal(false); }}
                        className="px-4 py-2 rounded bg-black text-white dark:bg-white dark:text-black text-sm hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-60"
                      >{loadingShift ? 'Cerrando…' : 'Confirmar'}</button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-gray-600 dark:text-gray-400">Cierre</div>
                        <div className="font-semibold text-black dark:text-white">{new Date(activeShift.closed_at).toLocaleTimeString()}</div>
                      </div>
                      <div>
                        <div className="text-gray-600 dark:text-gray-400">Final</div>
                        <div className="font-semibold text-black dark:text-white">{activeShift.finalCash.toLocaleString('es-CO')}</div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Turno ya fue cerrado.</div>
                    <div className="flex justify-end pt-2">
                      <button onClick={() => setShowShiftModal(false)} className="px-4 py-2 rounded bg-black text-white dark:bg-white dark:text-black text-sm hover:bg-gray-800 dark:hover:bg-gray-200">Cerrar</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
        <button onClick={onGoInventory} className="aspect-[4/2] rounded-xl border border-gray-300 dark:border-neutral-700 hover:border-gray-400 dark:hover:border-neutral-600 hover:shadow-md bg-white dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700 transition text-left p-6">
          <div className="text-2xl font-semibold text-black dark:text-white">Inventario</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Gestiona stock de productos: registrar, editar, eliminar, historial.</div>
        </button>
        <button onClick={onGoCash} className="aspect-[4/2] rounded-xl border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700 transition text-left p-6 hover:border-gray-400 dark:hover:border-neutral-600 hover:shadow-md">
          <div className="text-2xl font-semibold text-black dark:text-white">Caja</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Realiza ventas, factura prendas y elige método de pago.</div>
        </button>
        <button onClick={onGoContabilidad} className="aspect-[4/2] rounded-xl border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700 transition text-left p-6 hover:border-gray-400 dark:hover:border-neutral-600 hover:shadow-md">
          <div className="text-2xl font-semibold text-black dark:text-white">Contabilidad</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Reportes diarios: totales, métodos de pago y exportación CSV.</div>
        </button>
        <button onClick={onGoConfiguracion} className="aspect-[4/2] rounded-xl border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700 transition text-left p-6 hover:border-gray-400 dark:hover:border-neutral-600 hover:shadow-md">
          <div className="text-2xl font-semibold text-black dark:text-white">Configuración</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Preferencias: tamaño de fuente y contraste.</div>
        </button>
      </div>
    </main>
  )
}
