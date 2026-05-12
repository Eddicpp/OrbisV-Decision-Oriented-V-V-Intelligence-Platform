import { useState } from 'react'
import { COMPONENT_DATASHEETS } from '../data/mockDatasheets'

const LINK_TYPE_STYLE = {
  datasheet: { bg: 'bg-blue-900',   border: 'border-blue-700',   text: 'text-blue-300',   icon: '📄' },
  product:   { bg: 'bg-teal-900',   border: 'border-teal-700',   text: 'text-teal-300',   icon: '🏭' },
  standard:  { bg: 'bg-purple-900', border: 'border-purple-700', text: 'text-purple-300', icon: '📋' },
  technical: { bg: 'bg-amber-900',  border: 'border-amber-700',  text: 'text-amber-300',  icon: '🔬' },
  reference: { bg: 'bg-gray-700',   border: 'border-gray-600',   text: 'text-gray-300',   icon: '📚' },
}

const SUBSYSTEM_ORDER = ['optical', 'thermal', 'mechanical', 'structure', 'startracker', 'solar', 'dataproc']

function ComponentCard({ component }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3 bg-gray-800 hover:bg-gray-750 text-left flex items-start gap-3"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-mono text-gray-500 shrink-0">{component.id}</span>
            <span className="text-sm font-semibold text-white truncate">{component.name}</span>
          </div>
          <p className="text-xs text-gray-400">{component.manufacturer} · {component.part_number}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs bg-blue-900 text-blue-300 border border-blue-700 px-1.5 py-0.5 rounded">
            {component.links.length} links
          </span>
          <span className="text-gray-500 text-xs">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="bg-gray-900 border-t border-gray-700 px-4 py-3 space-y-3">

          {/* Descrizione */}
          <p className="text-xs text-gray-400">{component.description}</p>

          {/* Specs */}
          <div className="grid grid-cols-2 gap-1.5">
            {Object.entries(component.specs).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 capitalize">{k.replace(/_/g, ' ')}:</span>
                <span className="text-xs text-white font-mono">{v}</span>
              </div>
            ))}
          </div>

          {/* Links datasheet */}
          <div className="space-y-1.5">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Documents & Links</p>
            {component.links.map((link, i) => {
              const st = LINK_TYPE_STYLE[link.type] || LINK_TYPE_STYLE.reference
              return (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${st.bg} ${st.border} hover:opacity-90 transition-opacity`}
                >
                  <span>{st.icon}</span>
                  <span className={`text-xs font-medium flex-1 ${st.text}`}>{link.label}</span>
                  <svg className={`w-3 h-3 shrink-0 ${st.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )
            })}
          </div>

          {/* Heritage + ECSS */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-800 rounded-lg px-3 py-2">
              <p className="text-xs text-gray-500 mb-1">Flight Heritage</p>
              <p className="text-xs text-green-400">{component.heritage}</p>
            </div>
            <div className="bg-gray-800 rounded-lg px-3 py-2">
              <p className="text-xs text-gray-500 mb-1">ECSS Relevant</p>
              <p className="text-xs text-purple-400 font-mono">{component.ecss_relevant}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function DatasheetPanel({ activeSubsystem = null }) {
  const [selectedSub, setSelectedSub] = useState(activeSubsystem || 'optical')

  const subsystemData = COMPONENT_DATASHEETS[selectedSub]
  const totalLinks = Object.values(COMPONENT_DATASHEETS)
    .flatMap(s => s.components)
    .flatMap(c => c.links).length

  return (
    <div className="flex flex-col gap-4">

      {/* Header stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-center">
          <p className="text-xs text-gray-500 mb-1">Components</p>
          <p className="text-xl font-bold text-white">
            {Object.values(COMPONENT_DATASHEETS).reduce((a, s) => a + s.components.length, 0)}
          </p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-center">
          <p className="text-xs text-gray-500 mb-1">Documents</p>
          <p className="text-xl font-bold text-blue-400">{totalLinks}</p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-center">
          <p className="text-xs text-gray-500 mb-1">Subsystems</p>
          <p className="text-xl font-bold text-white">{Object.keys(COMPONENT_DATASHEETS).length}</p>
        </div>
      </div>

      {/* Subsystem tabs */}
      <div className="flex gap-1 flex-wrap">
        {SUBSYSTEM_ORDER.filter(k => COMPONENT_DATASHEETS[k]).map(key => {
          const d = COMPONENT_DATASHEETS[key]
          return (
            <button
              key={key}
              onClick={() => setSelectedSub(key)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                selectedSub === key
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
              }`}
            >
              {d.label}
              <span className="ml-1 text-gray-500">({d.components.length})</span>
            </button>
          )
        })}
      </div>

      {/* Componenti */}
      {subsystemData && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500 uppercase tracking-wider">
            {subsystemData.label} — {subsystemData.components.length} components
          </p>
          {subsystemData.components.map(comp => (
            <ComponentCard key={comp.id} component={comp} />
          ))}
        </div>
      )}

    </div>
  )
}
