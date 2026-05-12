import { useState } from 'react'
import { ECSS_VALIDATION_CHECKLIST, ECSS_STANDARDS } from '../data/mockECSS'

const STATUS_STYLES = {
  done:    { bg: 'bg-green-900', text: 'text-green-300', border: 'border-green-700', label: 'Done' },
  open:    { bg: 'bg-red-900',   text: 'text-red-300',   border: 'border-red-700',   label: 'Open' },
  pending: { bg: 'bg-amber-900', text: 'text-amber-300', border: 'border-amber-700', label: 'Pending' },
}

const METHOD_STYLES = {
  Test:     'bg-blue-900 text-blue-300 border-blue-700',
  Analysis: 'bg-purple-900 text-purple-300 border-purple-700',
  Inspection:'bg-teal-900 text-teal-300 border-teal-700',
  Review:   'bg-gray-700 text-gray-300 border-gray-600',
}

const SUBSYSTEM_KEYS = Object.keys(ECSS_VALIDATION_CHECKLIST)

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.pending
  return (
    <span className={`text-xs px-2 py-0.5 rounded border ${s.bg} ${s.text} ${s.border}`}>
      {s.label}
    </span>
  )
}

function MethodBadge({ method }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded border ${METHOD_STYLES[method] || 'bg-gray-700 text-gray-300 border-gray-600'}`}>
      {method}
    </span>
  )
}

function StandardTag({ id }) {
  const std = ECSS_STANDARDS[id]
  if (!std) return <span className="text-xs text-gray-500 font-mono">{id}</span>
  return (
    <a
      href={std.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs font-mono text-blue-400 hover:text-blue-300 hover:underline transition-colors"
      title={std.description}
    >
      {id}
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  )
}

function ChecklistItem({ item }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(o => !o)}
        className="w-full flex items-center gap-3 px-3 py-2.5 bg-gray-800 hover:bg-gray-750 text-left"
      >
        <span className="text-xs font-mono text-gray-500 shrink-0 w-24">{item.id}</span>
        <span className="text-sm text-gray-200 flex-1">{item.activity}</span>
        <div className="flex items-center gap-2 shrink-0">
          <MethodBadge method={item.method} />
          <StatusBadge status={item.status} />
          <span className="text-gray-600 text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 py-3 bg-gray-900 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <StandardTag id={item.standard} />
            <span className="text-xs text-gray-500">{item.clause}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Phase:</span>
            <span className="text-xs text-white font-semibold">{item.phase}</span>
          </div>
          {item.notes && (
            <p className="text-xs text-gray-400 italic border-l-2 border-gray-700 pl-2">
              {item.notes}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function SubsystemChecklist({ subsystemKey }) {
  const data = ECSS_VALIDATION_CHECKLIST[subsystemKey]
  if (!data) return null

  const total = data.items.length
  const done = data.items.filter(i => i.status === 'done').length
  const open = data.items.filter(i => i.status === 'open').length
  const pending = data.items.filter(i => i.status === 'pending').length
  const pct = Math.round((done / total) * 100)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="bg-gray-700 rounded-full h-1.5 w-32">
            <div
              className="h-1.5 rounded-full bg-green-500 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs text-gray-400">{done}/{total} complete</span>
        </div>
        <div className="flex gap-2">
          {open > 0 && (
            <span className="text-xs bg-red-900 text-red-300 border border-red-700 px-2 py-0.5 rounded-full">
              {open} open
            </span>
          )}
          {pending > 0 && (
            <span className="text-xs bg-amber-900 text-amber-300 border border-amber-700 px-2 py-0.5 rounded-full">
              {pending} pending
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {data.standards.map(s => (
          <StandardTag key={s} id={s} />
        ))}
      </div>

      <div className="space-y-2">
        {data.items.map(item => (
          <ChecklistItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}

export default function ECSSPanel() {
  const [activeSubsystem, setActiveSubsystem] = useState(SUBSYSTEM_KEYS[0])
  const [filterStatus, setFilterStatus] = useState('all')

  const data = ECSS_VALIDATION_CHECKLIST[activeSubsystem]
  const filteredItems = filterStatus === 'all'
    ? data?.items
    : data?.items.filter(i => i.status === filterStatus)

  const allOpen = SUBSYSTEM_KEYS.reduce((acc, k) => {
    return acc + ECSS_VALIDATION_CHECKLIST[k].items.filter(i => i.status === 'open').length
  }, 0)

  return (
    <div className="flex flex-col h-full">

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-white">ECSS Validation Checklist</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Per-subsystem activities — click standard ID to open official PDF
          </p>
        </div>
        {allOpen > 0 && (
          <span className="text-xs bg-red-900 text-red-300 border border-red-700 px-2.5 py-1 rounded-full">
            {allOpen} open across all subsystems
          </span>
        )}
      </div>

      {/* Subsystem tabs */}
      <div className="flex gap-1 flex-wrap mb-4">
        {SUBSYSTEM_KEYS.map(key => {
          const d = ECSS_VALIDATION_CHECKLIST[key]
          const openCount = d.items.filter(i => i.status === 'open').length
          return (
            <button
              key={key}
              onClick={() => setActiveSubsystem(key)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                activeSubsystem === key
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
              }`}
            >
              {d.label}
              {openCount > 0 && (
                <span className={`w-4 h-4 rounded-full text-xs flex items-center justify-center ${
                  activeSubsystem === key ? 'bg-red-500 text-white' : 'bg-red-900 text-red-300'
                }`}>
                  {openCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {['all', 'done', 'open', 'pending'].map(f => (
          <button
            key={f}
            onClick={() => setFilterStatus(f)}
            className={`text-xs px-2.5 py-1 rounded border transition-all capitalize ${
              filterStatus === f
                ? 'bg-gray-600 border-gray-500 text-white'
                : 'border-gray-700 text-gray-500 hover:text-gray-300'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Checklist items */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {data && (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="bg-gray-700 rounded-full h-1.5 w-32">
                  <div
                    className="h-1.5 rounded-full bg-green-500"
                    style={{
                      width: `${Math.round(
                        (data.items.filter(i => i.status === 'done').length / data.items.length) * 100
                      )}%`
                    }}
                  />
                </div>
                <span className="text-xs text-gray-400">
                  {data.items.filter(i => i.status === 'done').length}/{data.items.length} complete
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {data.standards.map(s => (
                  <StandardTag key={s} id={s} />
                ))}
              </div>
            </div>

            {filteredItems?.map(item => (
              <ChecklistItem key={item.id} item={item} />
            ))}

            {filteredItems?.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">
                No items with status "{filterStatus}"
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
