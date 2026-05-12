import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PayloadViewer3D from '../components/PayloadViewer3D'
import ECSSPanel from '../components/ECSSPanel'
import { SCENARIOS, USER_NEEDS, REQUIREMENTS, OPEN_NCRS } from '../data/mockIRIS3'
import { DECISION_CONFIG } from '../data/mockProjects'
import BranchView from '../components/BranchView'
import UserSatisfactionPanel from '../components/UserSatisfactionPanel'

const SCENARIO_KEYS = ['nominal', 'thermal', 'cdr', 'launch']

const STATUS_STYLES = {
  ok:      { dot: 'bg-green-500',  text: 'text-green-400',  label: 'Compliant' },
  warn:    { dot: 'bg-amber-500',  text: 'text-amber-400',  label: 'Warning'   },
  fail:    { dot: 'bg-red-500',    text: 'text-red-400',    label: 'Non compliant' },
  pending: { dot: 'bg-gray-500',   text: 'text-gray-400',   label: 'Pending'   },
}

const VERDICT_STYLES = {
  PASS:        'bg-green-900 text-green-300 border-green-700',
  FAIL:        'bg-red-900 text-red-300 border-red-700',
  CONDITIONAL: 'bg-amber-900 text-amber-300 border-amber-700',
}

function DecisionCard({ scenario }) {
  const cfg = DECISION_CONFIG[scenario.decision]
  return (
    <div className={`rounded-xl border-2 ${cfg.border} ${cfg.bg} p-5`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-2xl font-bold ${cfg.color}`}>{cfg.label}</span>
        <span className={`text-sm font-semibold ${cfg.color}`}>
          {scenario.confidence}% confidence
        </span>
      </div>
      <div className="w-full bg-white bg-opacity-30 rounded-full h-2">
        <div className={`h-2 rounded-full ${cfg.dot}`} style={{ width: `${scenario.confidence}%` }} />
      </div>
    </div>
  )
}

function SubsystemRow({ id, data, isHovered }) {
  const st = STATUS_STYLES[data.status] || STATUS_STYLES.pending
  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isHovered ? 'bg-gray-700' : 'hover:bg-gray-800'}`}>
      <div className={`w-2 h-2 rounded-full shrink-0 ${st.dot}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm text-white capitalize">{id.replace('_', ' ')}</span>
          <span className={`text-xs font-semibold ${st.text}`}>{data.score}%</span>
        </div>
        <p className="text-xs text-gray-500 truncate">{data.detail}</p>
      </div>
    </div>
  )
}

function TraceabilityRow({ need, reqs }) {
  const [open, setOpen] = useState(false)
  const needReqs = reqs.filter(r => r.parent_need === need.id)
  const avgCompliance = needReqs.length
    ? needReqs.reduce((a, r) => a + (r.compliance ?? 0), 0) / needReqs.length
    : 0
  const pct = Math.round(avgCompliance * 100)
  const scoreColor = pct >= 80 ? 'text-green-400' : pct >= 60 ? 'text-amber-400' : 'text-red-400'

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-gray-800 hover:bg-gray-750 text-left"
      >
        <span className="text-xs font-mono font-semibold text-blue-400 shrink-0">{need.id}</span>
        <span className="text-sm text-gray-200 flex-1">{need.description}</span>
        <span className={`text-sm font-semibold shrink-0 ${scoreColor}`}>{pct}%</span>
        <span className="text-gray-500 text-xs shrink-0">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="bg-gray-900 divide-y divide-gray-800">
          {needReqs.map(req => (
            <div key={req.id} className="px-4 py-3">
              <div className="flex items-start gap-3 mb-2">
                <span className="text-xs font-mono text-purple-400 shrink-0 mt-0.5">{req.id}</span>
                <div className="flex-1">
                  <p className="text-sm text-gray-300">{req.description}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{req.acceptance}</p>
                </div>
                <div className="shrink-0 text-right">
                  {req.compliance !== null ? (
                    <span className={`text-sm font-semibold ${
                      Math.round(req.compliance * 100) >= 80 ? 'text-green-400' :
                      Math.round(req.compliance * 100) >= 60 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {Math.round(req.compliance * 100)}%
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500">N/A</span>
                  )}
                  {req.critical && (
                    <span className="block text-xs text-red-400 mt-0.5">critical</span>
                  )}
                </div>
              </div>

              {req.evidences.length > 0 ? (
                <div className="ml-16 space-y-1">
                  {req.evidences.map(ev => (
                    <div key={ev.id} className="flex items-center gap-2 text-xs flex-wrap">
                      <span className="text-gray-500 font-mono">{ev.id}</span>
                      <span className="text-gray-500">{ev.tool}</span>
                      <span className="text-gray-400">{ev.result}</span>
                      <span className={`px-1.5 py-0.5 rounded border ${VERDICT_STYLES[ev.verdict] || 'bg-gray-800 text-gray-400 border-gray-600'}`}>
                        {ev.verdict}
                      </span>
                      <span className="text-gray-600">{ev.date}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="ml-16">
                  <span className="text-xs text-red-400 italic">No V&V evidence — gap in traceability</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function NCRList({ ncrs }) {
  if (!ncrs.length) return <p className="text-sm text-green-400 py-2">No open NCRs</p>
  return (
    <div className="space-y-2">
      {ncrs.map(ncr => (
        <div key={ncr.id} className="border border-gray-700 rounded-lg px-3 py-2.5 bg-gray-800">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-gray-400">{ncr.id}</span>
            <span className={`text-xs px-2 py-0.5 rounded border ${
              ncr.severity === 'major'
                ? 'bg-red-900 text-red-300 border-red-700'
                : 'bg-amber-900 text-amber-300 border-amber-700'
            }`}>
              {ncr.severity}
            </span>
            <span className="text-xs text-gray-500 ml-auto">{ncr.opened}</span>
          </div>
          <p className="text-sm text-gray-300">{ncr.title}</p>
          <p className="text-xs text-gray-500 mt-0.5">Owner: {ncr.owner} — Req: {ncr.requirement}</p>
        </div>
      ))}
    </div>
  )
}

const TABS = [
  { id: 'traceability',  label: 'Traceability' },
  { id: 'satisfaction',  label: '🎯 User Satisfaction' },
  { id: 'ncr',           label: 'NCRs' },
  { id: 'ecss',          label: 'ECSS Checklist' },
  { id: 'impact',        label: '⚡ Impact Analysis' },
]

export default function ProjectDetail() {
  const navigate = useNavigate()
  const [activeScenario, setActiveScenario] = useState('nominal')
  const [hoveredSystem, setHoveredSystem] = useState(null)
  const [activeTab, setActiveTab] = useState('traceability')

  const scenario = SCENARIOS[activeScenario]
  const isImpact = activeTab === 'impact'

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">

      {/* Topbar */}
      <div className="border-b border-gray-800 px-6 py-3 flex items-center gap-4 shrink-0 flex-wrap">
        <button
          onClick={() => navigate('/')}
          className="text-gray-400 hover:text-white text-sm flex items-center gap-1.5 transition-colors"
        >
          ← Projects
        </button>
        <span className="text-gray-600">/</span>
        <span className="text-white font-semibold">IRIS-3</span>
        <span className="text-gray-500 text-sm">Optical EO Payload — ESA</span>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500">Scenario:</span>
          {SCENARIO_KEYS.map(key => (
            <button
              key={key}
              onClick={() => setActiveScenario(key)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                activeScenario === key
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
              }`}
            >
              {SCENARIOS[key].label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* LEFT — nascosto in tab impact */}
        {!isImpact && (
          <div className="w-80 border-r border-gray-800 flex flex-col shrink-0">
            <div className="relative" style={{ height: '320px' }}>
              <PayloadViewer3D
                subsystems={scenario.subsystems}
                onHover={setHoveredSystem}
              />
              {hoveredSystem && scenario.subsystems[hoveredSystem] && (
                <div className="absolute bottom-3 left-3 right-3 bg-gray-900 bg-opacity-90 border border-gray-700 rounded-lg px-3 py-2 pointer-events-none">
                  <p className="text-xs font-semibold text-white capitalize">
                    {hoveredSystem.replace('_', ' ')}
                  </p>
                  <p className="text-xs text-gray-400">
                    {scenario.subsystems[hoveredSystem].detail}
                  </p>
                </div>
              )}
            </div>
            <div className="border-t border-gray-800 p-3 space-y-1 overflow-y-auto">
              <p className="text-xs text-gray-500 px-1 mb-2 uppercase tracking-wider">Subsystems</p>
              {Object.entries(scenario.subsystems).map(([id, data]) => (
                <SubsystemRow key={id} id={id} data={data} isHovered={hoveredSystem === id} />
              ))}
            </div>
          </div>
        )}

        {/* CENTER — tabs */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b border-gray-800 px-6 flex gap-1 shrink-0">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-white'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                {tab.id === 'ncr' ? `NCRs (${OPEN_NCRS.length})` : tab.label}
              </button>
            ))}
          </div>

          <div className={`flex-1 overflow-y-auto ${isImpact ? '' : 'p-6'}`}>

            {activeTab === 'traceability' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-300">
                    User Needs → Requirements → V&V Evidence
                  </h2>
                  <span className="text-xs text-gray-500">
                    {REQUIREMENTS.filter(r => r.evidences.length > 0).length}/{REQUIREMENTS.length} req with evidence
                  </span>
                </div>
                {USER_NEEDS.map(need => (
                  <TraceabilityRow key={need.id} need={need} reqs={REQUIREMENTS} />
                ))}
              </div>
            )}

            {activeTab === 'satisfaction' && (
              <UserSatisfactionPanel />
            )}

            {activeTab === 'ncr' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-300">Open Non-Conformance Reports</h2>
                  <span className="text-xs text-gray-500">{OPEN_NCRS.length} open</span>
                </div>
                <NCRList ncrs={OPEN_NCRS} />
              </div>
            )}

            {activeTab === 'ecss' && <ECSSPanel />}

            {activeTab === 'impact' && (
              <div className="h-full">
                <BranchView activeScenario={activeScenario} projectId="IRIS-3" />
              </div>
            )}

          </div>
        </div>

        {/* RIGHT — nascosto in tab impact */}
        {!isImpact && (
          <div className="w-72 border-l border-gray-800 p-4 flex flex-col gap-4 shrink-0 overflow-y-auto">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Decision</p>
              <DecisionCard scenario={scenario} />
            </div>

            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Domain Scores</p>
              <div className="space-y-3">
                {Object.entries(scenario.subsystems).map(([id, data]) => {
                  const st = STATUS_STYLES[data.status] || STATUS_STYLES.pending
                  return (
                    <div key={id}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-400 capitalize">{id.replace('_', ' ')}</span>
                        <span className={`text-xs font-semibold ${st.text}`}>{data.score}%</span>
                      </div>
                      <div className="bg-gray-700 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-500 ${
                            data.status === 'ok'   ? 'bg-green-500' :
                            data.status === 'warn' ? 'bg-amber-500' :
                            data.status === 'fail' ? 'bg-red-500'   : 'bg-gray-500'
                          }`}
                          style={{ width: `${data.score}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Milestone</p>
              <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5">
                <p className="text-white font-semibold">CDR</p>
                <p className="text-xs text-gray-400">Critical Design Review</p>
                <p className="text-xs text-gray-500 mt-1">Est. launch: June 2027</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Coverage</p>
              <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Requirements</span>
                  <span className="text-white">483</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Verified</span>
                  <span className="text-green-400">341</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">With evidence</span>
                  <span className="text-blue-400">
                    {REQUIREMENTS.filter(r => r.evidences.length > 0).length}/{REQUIREMENTS.length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Open NCRs</span>
                  <span className="text-red-400">{OPEN_NCRS.length}</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}