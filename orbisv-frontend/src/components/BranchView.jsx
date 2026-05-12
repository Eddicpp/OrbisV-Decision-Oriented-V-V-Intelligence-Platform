import { useState } from 'react'
import { SCENARIOS } from '../data/mockIRIS3'
import { DECISION_CONFIG } from '../data/mockProjects'
import PayloadViewer3D from './PayloadViewer3D'
import UserSatisfactionPanel from './UserSatisfactionPanel'

const API = 'http://localhost:8000'

const STATUS_STYLES = {
  ok:      { dot: 'bg-green-500', text: 'text-green-400', bar: 'bg-green-500' },
  warn:    { dot: 'bg-amber-500', text: 'text-amber-400', bar: 'bg-amber-500' },
  fail:    { dot: 'bg-red-500',   text: 'text-red-400',   bar: 'bg-red-500'   },
  pending: { dot: 'bg-gray-500',  text: 'text-gray-400',  bar: 'bg-gray-500'  },
}

const SEVERITY_STYLES = {
  critical: 'bg-red-900 text-red-300 border-red-700',
  major:    'bg-amber-900 text-amber-300 border-amber-700',
  minor:    'bg-blue-900 text-blue-300 border-blue-700',
}

// Converte subsistemi da scenario in formato PayloadViewer3D
function scenarioToViewerSubs(scenarioSubs) {
  return scenarioSubs
}

// Converte diff branch in formato PayloadViewer3D
function buildBranchSubs(baseSubs, diff, affectedSubs, issues) {
  const result = {}
  Object.entries(baseSubs).forEach(([id, data]) => {
    const diffEntry = diff?.subsystems?.[id]
    if (diffEntry) {
      result[id] = {
        status: diffEntry.after.status,
        score:  diffEntry.after.score,
        detail: diffEntry.after.detail,
      }
    } else {
      result[id] = { ...data }
    }
  })

  // forza fail sui subsistemi con issue critical
  issues.forEach(issue => {
    const sid = issue.subsystem
    if (sid && result[sid]) {
      if (issue.severity === 'critical' && result[sid].status !== 'fail') {
        result[sid].status = 'fail'
        result[sid].score  = Math.max(0, result[sid].score - 30)
      } else if (issue.severity === 'major' && result[sid].status === 'ok') {
        result[sid].status = 'warn'
        result[sid].score  = Math.max(0, result[sid].score - 15)
      }
    }
  })

  return result
}

function DecisionCard({ decision, confidence, confidenceBefore }) {
  const cfg = DECISION_CONFIG[decision] || DECISION_CONFIG.GO
  const delta = confidenceBefore !== undefined ? confidence - confidenceBefore : null
  return (
    <div className={`rounded-lg border-2 ${cfg.border} ${cfg.bg} px-3 py-2.5`}>
      <div className="flex items-center justify-between">
        <span className={`font-bold text-lg ${cfg.color}`}>{cfg.label}</span>
        <div className="text-right">
          <span className={`text-sm font-semibold ${cfg.color}`}>{confidence}%</span>
          {delta !== null && delta !== 0 && (
            <span className={`ml-2 text-xs font-semibold ${delta < 0 ? 'text-red-400' : 'text-green-400'}`}>
              ({delta > 0 ? '+' : ''}{delta}%)
            </span>
          )}
        </div>
      </div>
      <div className="w-full bg-white bg-opacity-20 rounded-full h-1.5 mt-1.5">
        <div className={`h-1.5 rounded-full ${cfg.dot} transition-all duration-700`} style={{ width: `${confidence}%` }} />
      </div>
    </div>
  )
}

function SubsystemRow({ id, data, delta, isAffected, issueTitle }) {
  const st = STATUS_STYLES[data.status] || STATUS_STYLES.pending
  return (
    <div className={`px-2 py-1.5 rounded-lg border transition-all ${
      isAffected ? 'border-red-700 bg-red-950' : 'border-gray-700 bg-gray-800'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${st.dot}`} />
          <span className="text-xs text-white capitalize">{id.replace('_', ' ')}</span>
          {isAffected && (
            <span className="text-xs bg-red-900 text-red-300 border border-red-700 px-1 rounded">!</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {delta !== undefined && delta !== 0 && (
            <span className={`text-xs font-semibold ${delta < 0 ? 'text-red-400' : 'text-green-400'}`}>
              {delta > 0 ? '+' : ''}{delta}%
            </span>
          )}
          <span className={`text-xs font-semibold ${st.text}`}>{data.score}%</span>
        </div>
      </div>
      {isAffected && issueTitle && (
        <p className="text-xs text-red-400 mt-0.5 truncate">{issueTitle}</p>
      )}
    </div>
  )
}

export default function BranchView({ activeScenario = 'nominal', projectId = 'IRIS-3' }) {
  const [changeRequest, setChangeRequest] = useState('')
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState(null)
  const [branchId, setBranchId]           = useState(null)
  const [branchData, setBranchData]       = useState(null)
  const [hoveredMain, setHoveredMain]     = useState(null)
  const [hoveredBranch, setHoveredBranch] = useState(null)

  const scenario    = SCENARIOS[activeScenario]
  const mainSubs    = scenarioToViewerSubs(scenario.subsystems)

  const cascade     = branchData?.cascade || {}
  const meta        = branchData?.meta    || {}
  const diff        = branchData?.diff    || {}
  const issues      = cascade?.cascade_issues   || []
  const tests       = cascade?.missing_tests    || []
  const affectedSubs= cascade?.affected_subsystems || []

  const branchSubs  = branchData
    ? buildBranchSubs(mainSubs, diff, affectedSubs, issues)
    : null

  // mappa subsistema → issue peggiore
  const issueBySubsystem = {}
  issues.forEach(issue => {
    const sid = issue.subsystem
    if (!issueBySubsystem[sid] || issue.severity === 'critical') {
      issueBySubsystem[sid] = issue
    }
  })

  async function handleAnalyze() {
    if (!changeRequest.trim()) return
    setLoading(true)
    setError(null)
    setBranchData(null)
    setBranchId(null)

    try {
      const res = await fetch(`${API}/api/project/${projectId}/analyze`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ change_request: changeRequest, author: 'user' }),
      })
      if (!res.ok) throw new Error(`API error ${res.status}`)
      const data = await res.json()
      setBranchId(data.branch_id)

      const branchRes  = await fetch(`${API}/api/project/${projectId}/branch/${data.branch_id}`)
      const branchJson = await branchRes.json()
      setBranchData(branchJson)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">

      {/* Change request bar */}
      <div className="border-b border-gray-800 p-4 shrink-0">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Change Request</p>
        <div className="flex gap-3">
          <textarea
            value={changeRequest}
            onChange={e => setChangeRequest(e.target.value)}
            placeholder="Describe the change... e.g. 'Increase optical bench volume from 0.018 to 0.022 m³ and add 1.2 kg lens assembly'"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-blue-500 transition-colors"
            rows={2}
          />
          <button
            onClick={handleAnalyze}
            disabled={loading || !changeRequest.trim()}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-semibold rounded-lg transition-all shrink-0 self-start"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Analyzing...
              </span>
            ) : 'Analyze Impact'}
          </button>
        </div>
        {error && <p className="text-xs text-red-400 mt-2">Error: {error}</p>}
        {loading && (
          <p className="text-xs text-amber-400 mt-2 animate-pulse">
            qwen2.5:14b analyzing cascade impacts — 30-60s...
          </p>
        )}
      </div>

      {/* Split view */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── MAIN ── */}
        <div className="flex-1 flex flex-col border-r border-gray-800">

          {/* header */}
          <div className="flex items-center gap-2 px-4 pt-3 pb-2 shrink-0">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-sm font-semibold text-white">main</span>
            <span className="text-xs text-gray-500">current state</span>
          </div>

          {/* 3D viewer main */}
          <div className="relative mx-4 rounded-xl overflow-hidden border border-gray-700" style={{ height: '260px' }}>
            <PayloadViewer3D subsystems={mainSubs} onHover={setHoveredMain} />
            {hoveredMain && mainSubs[hoveredMain] && (
              <div className="absolute bottom-2 left-2 right-2 bg-gray-900 bg-opacity-95 border border-gray-700 rounded-lg px-3 py-2 pointer-events-none">
                <p className="text-xs font-semibold text-white capitalize">{hoveredMain.replace('_', ' ')}</p>
                <p className="text-xs text-gray-400">{mainSubs[hoveredMain].detail}</p>
              </div>
            )}
          </div>

          {/* decision */}
          <div className="px-4 mt-3">
            <DecisionCard
              decision={scenario.decision}
              confidence={scenario.confidence}
            />
          </div>

          {/* subsistemi main */}
          <div className="flex-1 overflow-y-auto px-4 mt-3 space-y-1.5 pb-3">
            {Object.entries(mainSubs).map(([id, data]) => (
              <SubsystemRow key={id} id={id} data={data} isAffected={false} />
            ))}
          </div>

          {/* download */}
          <div className="px-4 pb-3 shrink-0">
            <a
              href={`${API}/api/project/${projectId}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 hover:border-blue-500 hover:text-blue-400 rounded-lg text-xs text-gray-400 transition-all"
            >
              ↓ Download main PDF
            </a>
          </div>
        </div>

        {/* ── BRANCH ── */}
        <div className="flex-1 flex flex-col">

          {/* header */}
          <div className="flex items-center gap-2 px-4 pt-3 pb-2 shrink-0">
            <div className="w-2 h-2 rounded-full bg-purple-500" />
            <span className="text-sm font-semibold text-white">
              {branchId ? branchId.slice(-12) : 'branch'}
            </span>
            <span className="text-xs text-gray-500">proposed change</span>
          </div>

          {/* 3D viewer branch */}
          <div className="relative mx-4 rounded-xl overflow-hidden border border-gray-700" style={{ height: '260px' }}>
            {branchSubs ? (
              <>
                <PayloadViewer3D
                  subsystems={branchSubs}
                  onHover={setHoveredBranch}
                  geometryChanges={cascade?.geometry_changes || []}
                />
                {hoveredBranch && branchSubs[hoveredBranch] && (
                  <div className="absolute bottom-2 left-2 right-2 bg-gray-900 bg-opacity-95 border border-gray-700 rounded-lg px-3 py-2 pointer-events-none">
                    <p className="text-xs font-semibold text-white capitalize">{hoveredBranch.replace('_', ' ')}</p>
                    <p className="text-xs text-gray-400">{branchSubs[hoveredBranch].detail}</p>
                    {issueBySubsystem[hoveredBranch] && (
                      <p className={`text-xs mt-1 font-semibold ${
                        issueBySubsystem[hoveredBranch].severity === 'critical' ? 'text-red-400' : 'text-amber-400'
                      }`}>
                        [{issueBySubsystem[hoveredBranch].severity?.toUpperCase()}] {issueBySubsystem[hoveredBranch].title}
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full bg-gray-850">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center mx-auto mb-2">
                    <span className="text-gray-600 text-xl">?</span>
                  </div>
                  <p className="text-xs text-gray-500">Submit a change request</p>
                </div>
              </div>
            )}
          </div>

          {/* decision branch */}
          <div className="px-4 mt-3">
            {branchData ? (
              <DecisionCard
                decision={meta.go_nogo_impact || 'NO_GO'}
                confidence={meta.confidence_after || 0}
                confidenceBefore={meta.confidence_before}
              />
            ) : (
              <div className="rounded-lg border-2 border-gray-700 bg-gray-800 px-3 py-2.5">
                <span className="text-gray-500 text-sm">— awaiting analysis</span>
              </div>
            )}
          </div>

          {/* subsistemi branch */}
          <div className="flex-1 overflow-y-auto px-4 mt-3 space-y-1.5">
            {branchSubs ? (
              Object.entries(branchSubs).map(([id, data]) => {
                const base  = mainSubs[id]
                const delta = base ? data.score - base.score : 0
                const issue = issueBySubsystem[id]
                return (
                  <SubsystemRow
                    key={id}
                    id={id}
                    data={data}
                    delta={delta}
                    isAffected={affectedSubs.includes(id)}
                    issueTitle={issue?.title}
                  />
                )
              })
            ) : (
              Object.entries(mainSubs).map(([id, data]) => (
                <SubsystemRow key={id} id={id} data={{ ...data, score: 0, status: 'pending' }} isAffected={false} />
              ))
            )}
          </div>

          {/* cascade issues */}
          {issues.length > 0 && (
            <div className="px-4 mt-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1.5">
                Cascade Issues ({issues.length})
              </p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {issues.map(issue => (
                  <div key={issue.id} className={`text-xs px-2 py-1.5 rounded border ${SEVERITY_STYLES[issue.severity] || SEVERITY_STYLES.minor}`}>
                    <span className="font-semibold">[{issue.severity?.toUpperCase()}]</span> {issue.title}
                    <p className="opacity-70 mt-0.5 truncate">{issue.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* missing tests */}
          {tests.length > 0 && (
            <div className="px-4 mt-2">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1.5">
                Missing ECSS Tests ({tests.length})
              </p>
              <div className="space-y-1 max-h-28 overflow-y-auto">
                {tests.map((t, i) => (
                  <div key={i} className="text-xs px-2 py-1.5 rounded border bg-red-950 border-red-800 text-red-300">
                    <span className="font-mono">{t.ecss_standard} {t.clause}</span>
                    <p className="opacity-75 mt-0.5 truncate">{t.activity}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* user satisfaction diff */}
          {branchData && (
            <div className="px-4 mt-3 pb-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                User Satisfaction Impact
              </p>
              <div className="max-h-64 overflow-y-auto">
                <UserSatisfactionPanel
                  cascadeResult={cascade}
                  showBranchDiff={true}
                />
              </div>
            </div>
          )}

          {/* download branch pdf */}
          <div className="px-4 py-3 shrink-0">
            {branchId ? (
              <a
                href={`${API}/api/project/${projectId}/branch/${branchId}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-900 border border-purple-700 hover:border-purple-400 hover:text-purple-300 rounded-lg text-xs text-purple-400 transition-all"
              >
                ↓ Download branch PDF
              </a>
            ) : (
              <div className="flex items-center justify-center px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-600">
                ↓ Download branch PDF
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}