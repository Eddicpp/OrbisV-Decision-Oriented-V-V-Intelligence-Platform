import { useState } from 'react'
import { TEST_CALENDAR } from '../data/mockManagerial'

const SUBSYSTEM_COLORS = {
  optical:     { bg: 'bg-blue-600',   light: 'bg-blue-900',   border: 'border-blue-700',   text: 'text-blue-300'   },
  thermal:     { bg: 'bg-orange-600', light: 'bg-orange-900', border: 'border-orange-700', text: 'text-orange-300' },
  mechanical:  { bg: 'bg-purple-600', light: 'bg-purple-900', border: 'border-purple-700', text: 'text-purple-300' },
  startracker: { bg: 'bg-cyan-600',   light: 'bg-cyan-900',   border: 'border-cyan-700',   text: 'text-cyan-300'   },
  dataproc:    { bg: 'bg-teal-600',   light: 'bg-teal-900',   border: 'border-teal-700',   text: 'text-teal-300'   },
  solar:       { bg: 'bg-yellow-600', light: 'bg-yellow-900', border: 'border-yellow-700', text: 'text-yellow-300' },
}

const STATUS_STYLE = {
  done:    { bar: 'bg-green-600',  dot: 'bg-green-500',  label: 'Done',    text: 'text-green-400'  },
  open:    { bar: 'bg-red-600',    dot: 'bg-red-500',    label: 'Open',    text: 'text-red-400'    },
  pending: { bar: 'bg-gray-600',   dot: 'bg-gray-500',   label: 'Pending', text: 'text-gray-400'   },
}

const TYPE_STYLE = {
  test:       'bg-blue-950 text-blue-300 border-blue-800',
  analysis:   'bg-purple-950 text-purple-300 border-purple-800',
  inspection: 'bg-teal-950 text-teal-300 border-teal-800',
}

const SUBSYSTEM_ORDER = ['optical', 'thermal', 'mechanical', 'startracker', 'dataproc', 'solar']
const SUBSYSTEM_LABELS = {
  optical: 'Optical', thermal: 'Thermal', mechanical: 'Mechanical',
  startracker: 'Star Tracker', dataproc: 'Data Proc', solar: 'Solar',
}

// Genera array di mesi tra due date
function getMonths(startDate, endDate) {
  const months = []
  const cur = new Date(startDate)
  cur.setDate(1)
  while (cur <= endDate) {
    months.push(new Date(cur))
    cur.setMonth(cur.getMonth() + 1)
  }
  return months
}

// Posizione e larghezza percentuale di un test nella timeline
function getBarStyle(test, timelineStart, totalDays) {
  const start = new Date(test.start)
  const end   = new Date(test.end)
  const startDay = Math.max(0, (start - timelineStart) / (1000 * 60 * 60 * 24))
  const duration = Math.max(1, (end - start) / (1000 * 60 * 60 * 24) + 1)
  const left  = (startDay / totalDays) * 100
  const width = Math.max(0.8, (duration / totalDays) * 100)
  return { left: `${left}%`, width: `${Math.min(width, 100 - left)}%` }
}

export default function TestTimeline() {
  const [selectedTest, setSelectedTest] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterSubsystem, setFilterSubsystem] = useState('all')

  // Calcola range timeline
  const allDates = TEST_CALENDAR.flatMap(t => [new Date(t.start), new Date(t.end)])
  const minDate  = new Date(Math.min(...allDates))
  const maxDate  = new Date(Math.max(...allDates))
  minDate.setDate(1)
  maxDate.setMonth(maxDate.getMonth() + 1)
  maxDate.setDate(0)
  const totalDays = (maxDate - minDate) / (1000 * 60 * 60 * 24)
  const months    = getMonths(minDate, maxDate)
  const today     = new Date('2025-01-15') // data demo fissa
  const todayPct  = Math.min(100, ((today - minDate) / (maxDate - minDate)) * 100)

  // Filtra test
  const filtered = TEST_CALENDAR.filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
    if (filterSubsystem !== 'all' && t.subsystem !== filterSubsystem) return false
    return true
  })

  // Raggruppa per subsistema
  const bySubsystem = SUBSYSTEM_ORDER.reduce((acc, sub) => {
    acc[sub] = filtered.filter(t => t.subsystem === sub)
    return acc
  }, {})

  // Stats
  const total   = TEST_CALENDAR.length
  const done    = TEST_CALENDAR.filter(t => t.status === 'done').length
  const open    = TEST_CALENDAR.filter(t => t.status === 'open').length
  const pending = TEST_CALENDAR.filter(t => t.status === 'pending').length

  return (
    <div className="flex flex-col gap-4">

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Tests',    value: total,   color: 'text-white'      },
          { label: 'Completed',      value: done,    color: 'text-green-400'  },
          { label: 'Open',           value: open,    color: 'text-red-400'    },
          { label: 'Pending',        value: pending, color: 'text-gray-400'   },
        ].map(s => (
          <div key={s.label} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-center">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Progress bar globale */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-gray-400">Test Campaign Progress</span>
          <span className="text-xs font-semibold text-white">{Math.round((done/total)*100)}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div className="h-2 rounded-full bg-green-500 transition-all" style={{ width: `${(done/total)*100}%` }} />
        </div>
        <div className="flex gap-4 mt-2">
          {[
            { label: `${done} done`,    color: 'bg-green-500'  },
            { label: `${open} open`,    color: 'bg-red-500'    },
            { label: `${pending} pending`, color: 'bg-gray-500' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${item.color}`} />
              <span className="text-xs text-gray-400">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filtri */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1">
          {['all', 'done', 'open', 'pending'].map(f => (
            <button key={f} onClick={() => setFilterStatus(f)}
              className={`text-xs px-2.5 py-1 rounded border transition-all capitalize ${
                filterStatus === f ? 'bg-blue-600 border-blue-500 text-white' : 'border-gray-700 text-gray-400 hover:text-white'
              }`}>{f}</button>
          ))}
        </div>
        <div className="flex gap-1 ml-4">
          <button onClick={() => setFilterSubsystem('all')}
            className={`text-xs px-2.5 py-1 rounded border transition-all ${
              filterSubsystem === 'all' ? 'bg-gray-600 border-gray-500 text-white' : 'border-gray-700 text-gray-400 hover:text-white'
            }`}>All</button>
          {SUBSYSTEM_ORDER.map(sub => {
            const c = SUBSYSTEM_COLORS[sub]
            return (
              <button key={sub} onClick={() => setFilterSubsystem(sub)}
                className={`text-xs px-2.5 py-1 rounded border transition-all ${
                  filterSubsystem === sub ? `${c.bg} border-transparent text-white` : `border-gray-700 ${c.text} hover:text-white`
                }`}>
                {SUBSYSTEM_LABELS[sub]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Gantt */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">

        {/* Header mesi */}
        <div className="flex border-b border-gray-700">
          <div className="w-32 shrink-0 px-3 py-2 border-r border-gray-700">
            <span className="text-xs text-gray-500">Subsystem</span>
          </div>
          <div className="flex-1 relative h-8">
            {months.map((m, i) => {
              const pct = ((m - minDate) / (maxDate - minDate)) * 100
              return (
                <div key={i} className="absolute top-0 h-full flex items-center"
                  style={{ left: `${pct}%` }}>
                  <div className="h-full border-l border-gray-700 opacity-50" />
                  <span className="text-xs text-gray-500 ml-1 whitespace-nowrap">
                    {m.toLocaleString('en', { month: 'short' })} {m.getFullYear().toString().slice(2)}
                  </span>
                </div>
              )
            })}
            {/* Today line */}
            <div className="absolute top-0 h-full border-l-2 border-blue-500 border-dashed opacity-75"
              style={{ left: `${todayPct}%` }}>
              <span className="absolute -top-0 left-1 text-xs text-blue-400 whitespace-nowrap">today</span>
            </div>
          </div>
        </div>

        {/* Righe subsistema */}
        {SUBSYSTEM_ORDER.map(sub => {
          const tests = bySubsystem[sub]
          if (tests.length === 0) return null
          const c = SUBSYSTEM_COLORS[sub]

          return (
            <div key={sub} className="flex border-b border-gray-700 last:border-0 group">
              {/* Label subsistema */}
              <div className={`w-32 shrink-0 px-3 py-3 border-r border-gray-700 flex items-center`}>
                <div className={`w-2 h-2 rounded-full ${c.bg} mr-2 shrink-0`} />
                <span className="text-xs font-semibold text-white">{SUBSYSTEM_LABELS[sub]}</span>
              </div>

              {/* Barra timeline */}
              <div className="flex-1 relative py-2" style={{ minHeight: '52px' }}>

                {/* Grid mesi */}
                {months.map((m, i) => {
                  const pct = ((m - minDate) / (maxDate - minDate)) * 100
                  return <div key={i} className="absolute top-0 bottom-0 border-l border-gray-700 opacity-20"
                    style={{ left: `${pct}%` }} />
                })}

                {/* Today line */}
                <div className="absolute top-0 bottom-0 border-l border-blue-500 border-dashed opacity-40"
                  style={{ left: `${todayPct}%` }} />

                {/* Test bars */}
                {tests.map((test, ti) => {
                  const barStyle  = getBarStyle(test, minDate, totalDays)
                  const statusSt  = STATUS_STYLE[test.status]
                  const isSelected = selectedTest?.id === test.id
                  const topOffset = (ti % 2) * 22 + 4

                  return (
                    <div
                      key={test.id}
                      onClick={() => setSelectedTest(isSelected ? null : test)}
                      className={`absolute rounded cursor-pointer transition-all ${statusSt.bar} ${
                        isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-800 opacity-100' : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{
                        left: barStyle.left,
                        width: barStyle.width,
                        top: `${topOffset}px`,
                        height: '18px',
                        minWidth: '4px',
                      }}
                      title={`${test.id} — ${test.name}`}
                    >
                      <span className="text-xs text-white font-medium px-1.5 truncate block leading-5 select-none">
                        {test.name}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Detail panel test selezionato */}
      {selectedTest && (
        <div className={`border rounded-xl px-4 py-3 ${
          selectedTest.status === 'done'    ? 'bg-green-950 border-green-800' :
          selectedTest.status === 'open'    ? 'bg-red-950 border-red-800' :
          'bg-gray-800 border-gray-700'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-gray-400">{selectedTest.id}</span>
              <span className="text-sm font-semibold text-white">{selectedTest.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded border ${TYPE_STYLE[selectedTest.type]}`}>
                {selectedTest.type}
              </span>
              <span className={`text-xs font-semibold ${STATUS_STYLE[selectedTest.status].text}`}>
                {STATUS_STYLE[selectedTest.status].label}
              </span>
            </div>
            <button onClick={() => setSelectedTest(null)} className="text-gray-500 hover:text-white text-xs">✕</button>
          </div>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <p className="text-gray-500 mb-0.5">Period</p>
              <p className="text-white">{selectedTest.start} → {selectedTest.end}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-0.5">ECSS Standard</p>
              <p className="text-blue-400 font-mono">{selectedTest.ecss}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-0.5">Subsystem</p>
              <p className="text-white capitalize">{selectedTest.subsystem}</p>
            </div>
          </div>
          {selectedTest.ncr && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-red-400">⚠ Blocked by:</span>
              <span className="text-xs font-mono text-red-300 bg-red-950 border border-red-800 px-2 py-0.5 rounded">
                {selectedTest.ncr}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
