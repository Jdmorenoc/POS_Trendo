/* eslint-disable no-unused-vars */
import React, { useMemo, useState, useEffect } from 'react'
import { formatCOP } from '@/lib/currency'
import { liveQuery } from 'dexie'
import Header from '../inventario/Layout/Header'
import Footer from '../inventario/Layout/Footer'
import { db, listShifts } from '@/lib/db'
import * as XLSX from 'xlsx'

function useLiveSales() {
  const [data, setData] = React.useState([])
  React.useEffect(() => {
    const sub = liveQuery(() => db.table('sales').where('deleted').equals(0).toArray()).subscribe({
      next: v => setData(v)
    })
    return () => sub.unsubscribe()
  }, [])
  return data
}

function useLiveShifts() {
  const [data, setData] = React.useState([])
  React.useEffect(() => {
    const sub = liveQuery(() => db.table('shifts').toArray()).subscribe({
      next: v => setData(v)
    })
    return () => sub.unsubscribe()
  }, [])
  return data
}

export default function Contabilidad({ onBack }) {
  const sales = useLiveSales()
  const shifts = useLiveShifts()
  const [day, setDay] = useState(() => new Date().toISOString().slice(0,10))
  const [selectedShiftId, setSelectedShiftId] = useState(null)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportShiftId, setExportShiftId] = useState('')
  const [exportFormat, setExportFormat] = useState('csv')

  const { selected, hasSales } = useMemo(() => {
    const key = day
    const sel = { day: key, total: 0, items: 0, efectivo: 0, transferencia: 0, tarjeta: 0 }
    let any = false
    for (const s of sales) {
      const dkey = (s.created_at || '').slice(0,10)
      if (dkey !== key) continue
      any = true
      sel.total += s.total || 0
      sel.items += s.items || 0
      const m = (s.method || '').toLowerCase()
      if (m === 'efectivo') sel.efectivo += s.total || 0
      if (m === 'transferencia') sel.transferencia += s.total || 0
      if (m === 'tarjeta') sel.tarjeta += s.total || 0
    }
    return { selected: sel, hasSales: any }
  }, [sales, day])

  const dayShifts = useMemo(() => {
    return shifts.filter(sh => (sh.opened_at||'').slice(0,10) === day)
  }, [shifts, day])

  const perShiftAggregates = useMemo(() => {
    const map = {}
    for (const sh of dayShifts) {
      map[sh.id] = { shift: sh, total: 0, items: 0, efectivo: 0, transferencia: 0, tarjeta: 0 }
    }
    for (const s of sales) {
      const dkey = (s.created_at||'').slice(0,10)
      if (dkey !== day) continue
      const sid = s.shiftId || ''
      if (sid && map[sid]) {
        map[sid].total += s.total||0
        map[sid].items += s.items||0
        const m = (s.method||'').toLowerCase()
        if (m==='efectivo') map[sid].efectivo += s.total||0
        if (m==='transferencia') map[sid].transferencia += s.total||0
        if (m==='tarjeta') map[sid].tarjeta += s.total||0
      }
    }
    return map
  }, [sales, dayShifts, day])

  const selectedShiftAgg = selectedShiftId ? perShiftAggregates[selectedShiftId] || null : null

  useEffect(() => {
    // Default export shift id to selected shift or first shift of the day
    if (dayShifts.length > 0) {
      setExportShiftId(selectedShiftId || dayShifts[0].id)
    } else {
      setExportShiftId('')
    }
  }, [dayShifts, selectedShiftId])

  function exportShiftAsCSV(agg) {
    const headers = ['Turno','Fecha','Apertura','Inicial','Cierre','Final','Prendas','Total Ventas','Efectivo','Transferencia','Tarjeta','Dif. Caja','Moneda']
    const sh = agg.shift
    const row = [
      (sh.id || '').slice(0,8),
      (sh.opened_at||'').slice(0,10),
      new Date(sh.opened_at).toLocaleTimeString(),
      sh.initialCash||0,
      sh.closed_at ? new Date(sh.closed_at).toLocaleTimeString() : '',
      sh.closed_at ? (sh.finalCash||0) : '',
      agg.items,
      agg.total,
      agg.efectivo,
      agg.transferencia,
      agg.tarjeta,
      sh.closed_at ? ((sh.finalCash||0)-(sh.initialCash||0)) : '',
      'COP'
    ]
    const all = [headers, row]
    const csv = all.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new window.Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte_turno_${(sh.opened_at||'').slice(0,10)}_${(sh.id||'').slice(0,6)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  function exportShiftAsXLSX(agg) {
    const sh = agg.shift
    const turnoIdShort = (sh.id||'').slice(0,8)
    const fecha = (sh.opened_at||'').slice(0,10)
    const apertura = new Date(sh.opened_at).toLocaleTimeString()
    const cierre = sh.closed_at ? new Date(sh.closed_at).toLocaleTimeString() : ''
    const inicial = sh.initialCash||0
    const final = sh.closed_at ? (sh.finalCash||0) : ''
    const prendas = agg.items
    const total = agg.total
    const efectivo = agg.efectivo
    const transferencia = agg.transferencia
    const tarjeta = agg.tarjeta
    const difCaja = sh.closed_at ? ((sh.finalCash||0)-(sh.initialCash||0)) : ''

    // Sheet 1: Resumen Turno (columnar, entendible)
    const headerTitle = ['REPORTE DE TURNO TRENDO SAS']
    const headerInfo = [`Fecha: ${fecha}`, `Turno: ${turnoIdShort}`, (sh.userEmail ? `Usuario: ${sh.userEmail}` : '')]
    const tableHeader = ['Apertura','Cierre','Inicial','Final','Prendas','Total Ventas','Efectivo','Transferencia','Tarjeta','Dif. Caja','Moneda']
    const tableRow = [apertura, cierre, inicial, final, prendas, total, efectivo, transferencia, tarjeta, difCaja, 'COP']

    const ws1 = XLSX.utils.aoa_to_sheet([
      headerTitle,
      headerInfo,
      [''],
      tableHeader,
      tableRow
    ])

    // Merge title across columns A..K
    ws1['!merges'] = [{ s: { r:0, c:0 }, e: { r:0, c:10 } }]
    // Column widths
    ws1['!cols'] = [
      { wch: 12 }, // Apertura
      { wch: 12 }, // Cierre
      { wch: 12 }, // Inicial
      { wch: 12 }, // Final
      { wch: 10 }, // Prendas
      { wch: 14 }, // Total
      { wch: 14 }, // Efectivo
      { wch: 16 }, // Transferencia
      { wch: 12 }, // Tarjeta
      { wch: 12 }, // Dif. Caja
      { wch: 8 }   // Moneda
    ]
    // Number formats for money in row 5 (1-based)
    const moneyCols = ['C','D','F','G','H','I','J']
    moneyCols.forEach(col => {
      const cell = ws1[`${col}5`]
      if (cell) cell.z = '#,##0'
    })
    // Prendas numeric format
    if (ws1['E5']) ws1['E5'].z = '0'

    // Sheet 2: Ventas del turno (si hay)
    const ventas = sales.filter(s => (s.shiftId||'') === (sh.id||''))
      .sort((a,b)=> String(a.created_at).localeCompare(String(b.created_at)))
    const ventasHeader = ['Hora','Método','Prendas','Total']
    const ventasRows = ventas.map(v => [new Date(v.created_at).toLocaleTimeString(), v.method || '', v.items || 0, v.total || 0])
    const ws2 = XLSX.utils.aoa_to_sheet([
      [`VENTAS DEL TURNO ${turnoIdShort}`],
      [''],
      ventasHeader,
      ...ventasRows
    ])
    ws2['!merges'] = [{ s:{r:0,c:0}, e:{r:0,c:3} }]
    ws2['!cols'] = [ { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 12 } ]
    // Money format for total column (D)
    for (let i = 4; i < (ventasRows.length + 4); i++) {
      const addr = `D${i}`
      if (ws2[addr]) ws2[addr].z = '#,##0'
    }

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws1, 'Resumen Turno')
    XLSX.utils.book_append_sheet(wb, ws2, 'Ventas')
    XLSX.writeFile(wb, `reporte_turno_${fecha}_${turnoIdShort}.xlsx`)
  }

  function openExportModal() {
    setShowExportModal(true)
  }

  function handleConfirmExport() {
    const agg = perShiftAggregates[exportShiftId]
    if (!agg) { setShowExportModal(false); return }
    if (exportFormat === 'xlsx') exportShiftAsXLSX(agg)
    else exportShiftAsCSV(agg)
    setShowExportModal(false)
  }

  function exportCSV() {
  const headers = ['Fecha','Prendas','Total','Efectivo','Transferencia','Tarjeta','Moneda']
  const row = [selected.day, selected.items, selected.total, selected.efectivo, selected.transferencia, (selected.tarjeta||0), 'COP']
    const all = [headers, row]
    const csv = all.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new window.Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte_${selected.day}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  function printReport() {
    window.print()
  }

  return (
    <div className="h-full flex bg-white dark:bg-neutral-900 dark:text-gray-100">
      <main className="flex-1 p-6 bg-white dark:bg-neutral-900 dark:text-gray-100 flex flex-col">
        <Header onBack={onBack} title="Contabilidad" syncAll={()=>{}} showBack={true} />

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
          <div className="flex items-end gap-3">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Día</label>
              <input type="date" value={day} onChange={e=>setDay(e.target.value)} className="px-2 py-1 rounded border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={openExportModal} className="px-3 py-2 rounded border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-700 text-sm">Exportar Reporte</button>
            <button onClick={printReport} className="px-3 py-2 rounded bg-black text-white hover:bg-gray-900 text-sm">Imprimir</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="border border-gray-300 dark:border-neutral-700 rounded-lg p-4 bg-white dark:bg-neutral-800">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total vendido</div>
            <div className="text-2xl font-semibold text-black dark:text-white">{formatCOP(selected.total)}</div>
          </div>
          <div className="border border-gray-300 dark:border-neutral-700 rounded-lg p-4 bg-white dark:bg-neutral-800">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Prendas</div>
            <div className="text-2xl font-semibold text-black dark:text-white">{selected.items}</div>
          </div>
          <div className="border border-gray-300 dark:border-neutral-700 rounded-lg p-4 bg-white dark:bg-neutral-800">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Efectivo</div>
            <div className="text-2xl font-semibold text-black dark:text-white">{formatCOP(selected.efectivo)}</div>
          </div>
          <div className="border border-gray-300 dark:border-neutral-700 rounded-lg p-4 bg-white dark:bg-neutral-800">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Transferencia</div>
            <div className="text-2xl font-semibold text-black dark:text-white">{formatCOP(selected.transferencia)}</div>
          </div>
          <div className="border border-gray-300 dark:border-neutral-700 rounded-lg p-4 bg-white dark:bg-neutral-800">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tarjeta</div>
            <div className="text-2xl font-semibold text-black dark:text-white">{formatCOP(selected.tarjeta||0)}</div>
          </div>
        </div>

        <section className="border border-gray-300 dark:border-neutral-700 rounded-lg overflow-hidden bg-white dark:bg-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-neutral-800 text-black dark:text-gray-200">
              <tr className="text-left">
                <th className="px-3 py-2 border-b border-gray-300 dark:border-neutral-700">Fecha</th>
                <th className="px-3 py-2 border-b border-gray-300 dark:border-neutral-700">Prendas</th>
                <th className="px-3 py-2 border-b border-gray-300 dark:border-neutral-700">Total</th>
                <th className="px-3 py-2 border-b border-gray-300 dark:border-neutral-700">Efectivo</th>
                <th className="px-3 py-2 border-b border-gray-300 dark:border-neutral-700">Transferencia</th>
                <th className="px-3 py-2 border-b border-gray-300 dark:border-neutral-700">Tarjeta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
              {hasSales ? (
                <tr key={selected.day} className="hover:bg-gray-50 dark:hover:bg-neutral-700/60">
                  <td className="px-3 py-2 text-black dark:text-gray-200 font-mono text-xs">{selected.day}</td>
                  <td className="px-3 py-2 text-black dark:text-gray-200">{selected.items}</td>
                  <td className="px-3 py-2 font-medium text-black dark:text-gray-100">{formatCOP(selected.total)}</td>
                  <td className="px-3 py-2 text-black dark:text-gray-200">{formatCOP(selected.efectivo)}</td>
                  <td className="px-3 py-2 text-black dark:text-gray-200">{formatCOP(selected.transferencia)}</td>
                  <td className="px-3 py-2 text-black dark:text-gray-200">{formatCOP(selected.tarjeta||0)}</td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-gray-500 dark:text-gray-400">Sin ventas registradas</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {dayShifts.length > 0 && (
          <div className="mt-8">
            <h4 className="text-sm font-semibold mb-3 text-black dark:text-white">Turnos del día</h4>
            <div className="overflow-auto border border-gray-300 dark:border-neutral-700 rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-neutral-800 text-black dark:text-gray-200">
                  <tr className="text-left">
                    <th className="px-2 py-2 border-b border-gray-300 dark:border-neutral-700">Apertura</th>
                    <th className="px-2 py-2 border-b border-gray-300 dark:border-neutral-700">Inicial</th>
                    <th className="px-2 py-2 border-b border-gray-300 dark:border-neutral-700">Cierre</th>
                    <th className="px-2 py-2 border-b border-gray-300 dark:border-neutral-700">Final</th>
                    <th className="px-2 py-2 border-b border-gray-300 dark:border-neutral-700">Prendas</th>
                    <th className="px-2 py-2 border-b border-gray-300 dark:border-neutral-700">Total Ventas</th>
                    <th className="px-2 py-2 border-b border-gray-300 dark:border-neutral-700">Efectivo</th>
                    <th className="px-2 py-2 border-b border-gray-300 dark:border-neutral-700">Transferencia</th>
                    <th className="px-2 py-2 border-b border-gray-300 dark:border-neutral-700">Tarjeta</th>
                    <th className="px-2 py-2 border-b border-gray-300 dark:border-neutral-700">Dif. Caja</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
                  {dayShifts.map(sh => {
                    const agg = perShiftAggregates[sh.id] || { total:0, items:0, efectivo:0, transferencia:0, tarjeta:0 }
                    const diff = (sh.closed_at ? (sh.finalCash||0)-(sh.initialCash||0) : 0)
                    return (
                      <tr key={sh.id} onClick={()=>setSelectedShiftId(sh.id)} className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-700/60 ${selectedShiftId===sh.id?'bg-gray-100 dark:bg-neutral-700/40':''}`}>
                        <td className="px-2 py-1 font-mono">{new Date(sh.opened_at).toLocaleTimeString()}</td>
                        <td className="px-2 py-1">{formatCOP(sh.initialCash||0)}</td>
                        <td className="px-2 py-1 font-mono">{sh.closed_at ? new Date(sh.closed_at).toLocaleTimeString() : '—'}</td>
                        <td className="px-2 py-1">{sh.closed_at ? formatCOP(sh.finalCash||0) : '—'}</td>
                        <td className="px-2 py-1">{agg.items}</td>
                        <td className="px-2 py-1">{formatCOP(agg.total)}</td>
                        <td className="px-2 py-1">{formatCOP(agg.efectivo)}</td>
                        <td className="px-2 py-1">{formatCOP(agg.transferencia)}</td>
                        <td className="px-2 py-1">{formatCOP(agg.tarjeta)}</td>
                        <td className="px-2 py-1">{sh.closed_at ? formatCOP(diff) : '—'}</td>
                      </tr>
                    )
                  })}
                  {dayShifts.length === 0 && (
                    <tr><td colSpan={10} className="px-3 py-6 text-center text-gray-500 dark:text-gray-400">Sin turnos</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedShiftAgg && (
          <div className="mt-6 p-4 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800">
            <h5 className="text-sm font-semibold mb-2 text-black dark:text-white">Detalle turno seleccionado</h5>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div><div className="text-gray-500 dark:text-gray-400">Apertura</div><div className="font-mono">{new Date(selectedShiftAgg.shift.opened_at).toLocaleTimeString()}</div></div>
              <div><div className="text-gray-500 dark:text-gray-400">Inicial</div><div>{formatCOP(selectedShiftAgg.shift.initialCash||0)}</div></div>
              <div><div className="text-gray-500 dark:text-gray-400">Cierre</div><div className="font-mono">{selectedShiftAgg.shift.closed_at ? new Date(selectedShiftAgg.shift.closed_at).toLocaleTimeString() : '—'}</div></div>
              <div><div className="text-gray-500 dark:text-gray-400">Final</div><div>{selectedShiftAgg.shift.closed_at ? formatCOP(selectedShiftAgg.shift.finalCash||0) : '—'}</div></div>
              <div><div className="text-gray-500 dark:text-gray-400">Prendas</div><div>{selectedShiftAgg.items}</div></div>
              <div><div className="text-gray-500 dark:text-gray-400">Total</div><div>{formatCOP(selectedShiftAgg.total)}</div></div>
              <div><div className="text-gray-500 dark:text-gray-400">Efectivo</div><div>{formatCOP(selectedShiftAgg.efectivo)}</div></div>
              <div><div className="text-gray-500 dark:text-gray-400">Transferencia</div><div>{formatCOP(selectedShiftAgg.transferencia)}</div></div>
              <div><div className="text-gray-500 dark:text-gray-400">Tarjeta</div><div>{formatCOP(selectedShiftAgg.tarjeta)}</div></div>
              <div><div className="text-gray-500 dark:text-gray-400">Dif. Caja</div><div>{selectedShiftAgg.shift.closed_at ? formatCOP((selectedShiftAgg.shift.finalCash||0)-(selectedShiftAgg.shift.initialCash||0)) : '—'}</div></div>
            </div>
            <div className="mt-3 text-right">
              <button onClick={()=>setSelectedShiftId(null)} className="text-xs px-3 py-1 rounded border border-gray-300 dark:border-neutral-600 hover:bg-gray-50 dark:hover:bg-neutral-700">Cerrar detalle</button>
            </div>
          </div>
        )}

        <div className="mt-auto">
          <Footer compact />
        </div>

        {showExportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={()=>setShowExportModal(false)}></div>
            <div className="relative w-full max-w-md rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-black dark:text-white">Exportar reporte de turno</h3>
                <button onClick={()=>setShowExportModal(false)} className="text-gray-500 hover:text-black dark:hover:text-white text-sm">✕</button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Turno del día {day}</label>
                  <select value={exportShiftId} onChange={e=>setExportShiftId(e.target.value)} className="w-full px-3 py-2 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-sm text-black dark:text-gray-100">
                    {dayShifts.map(sh => (
                      <option key={sh.id} value={sh.id}>
                        {new Date(sh.opened_at).toLocaleTimeString()} {sh.closed_at ? '→ '+new Date(sh.closed_at).toLocaleTimeString() : '(abierto)'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Formato</label>
                  <div className="flex items-center gap-4 text-sm">
                    <label className="flex items-center gap-2"><input type="radio" name="fmt" value="csv" checked={exportFormat==='csv'} onChange={()=>setExportFormat('csv')} /> CSV</label>
                    <label className="flex items-center gap-2"><input type="radio" name="fmt" value="xlsx" checked={exportFormat==='xlsx'} onChange={()=>setExportFormat('xlsx')} /> XLSX</label>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={()=>setShowExportModal(false)} className="px-4 py-2 rounded border border-gray-300 dark:border-neutral-600 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-700">Cancelar</button>
                  <button disabled={!exportShiftId} onClick={handleConfirmExport} className="px-4 py-2 rounded bg-black text-white dark:bg-white dark:text-black text-sm hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50">Exportar</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}