import { useState } from 'react'
import { SCENARIOS } from '../data/mockIRIS3'
import { DECISION_CONFIG } from '../data/mockProjects'
import { OPEN_NCRS } from '../data/mockIRIS3'
import { NCR_MANAGERIAL, MANAGERIAL_SCENARIOS, MILESTONES } from '../data/mockManagerial'
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

function formatEur(n) {
  return n >= 1000000 ? `€${(n/1000000).toFixed(1)}M` : `€${(n/1000).toFixed(0)}k`
}

function buildBranchSubs(baseSubs, diff, affectedSubs, issues) {
  const result = {}
  Object.entries(baseSubs).forEach(([id, data]) => {
    const diffEntry = diff?.subsystems?.[id]
    result[id] = diffEntry ? { ...diffEntry.after } : { ...data }
  })
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

// ── Placeholder quando branch non ancora creato ───────────────────────────

function EmptyBranchPlaceholder({ icon, label }) {
  return (
    <div className="flex flex-col items-center justify-center h-48 text-center">
      <div className="w-12 h-12 rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center mx-auto mb-3">
        <span className="text-gray-600 text-xl">{icon}</span>
      </div>
      <p className="text-sm text-gray-500">Submit a change request</p>
      <p className="text-xs text-gray-600 mt-1">{label}</p>
    </div>
  )
}

// ── Technical diff panels ─────────────────────────────────────────────────

function SubsystemRow({ id, data, delta, isAffected, issueTitle }) {
  const st = STATUS_STYLES[data.status] || STATUS_STYLES.pending
  return (
    <div className={`px-2 py-1.5 rounded-lg border transition-all ${
      isAffected ? 'border-red-700 bg-red-950' : 'border-gray-700 bg-gray-800'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${st.dot}`} />
          <span className="text-xs text-white capitalize">{id.replace('_',' ')}</span>
          {isAffected && <span className="text-xs bg-red-900 text-red-300 border border-red-700 px-1 rounded">!</span>}
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

function DecisionCard({ decision, confidence, confidenceBefore }) {
  const cfg   = DECISION_CONFIG[decision] || DECISION_CONFIG.GO
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

function TechnicalDiffPanel({ side, scenario, branchData, affectedSubs, issueBySubsystem, branchSubs }) {
  const isBranch  = side === 'branch'
  const meta      = branchData?.meta    || {}
  const cascade   = branchData?.cascade || {}
  const issues    = cascade?.cascade_issues || []
  const tests     = cascade?.missing_tests  || []
  const subsystems = isBranch ? branchSubs : scenario.subsystems
  const decision   = isBranch ? (meta.go_nogo_impact || 'NO_GO') : scenario.decision
  const confidence = isBranch ? (meta.confidence_after  || 0)    : scenario.confidence
  const confBefore = isBranch ? meta.confidence_before            : undefined

  return (
    <div className="flex flex-col gap-3">
      <DecisionCard decision={decision} confidence={confidence} confidenceBefore={confBefore} />

      <div className="space-y-1.5">
        <p className="text-xs text-gray-500 uppercase tracking-wider">Subsystems</p>
        {subsystems && Object.entries(subsystems).map(([id, data]) => {
          const base  = scenario.subsystems[id]
          const delta = isBranch && base ? data.score - base.score : undefined
          return (
            <SubsystemRow
              key={id}
              id={id}
              data={data}
              delta={delta}
              isAffected={isBranch && affectedSubs.includes(id)}
              issueTitle={isBranch ? issueBySubsystem[id]?.title : undefined}
            />
          )
        })}
      </div>

      {isBranch && issues.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1.5">
            Cascade Issues ({issues.length})
          </p>
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {issues.map(issue => (
              <div key={issue.id} className={`text-xs px-2 py-1.5 rounded border ${SEVERITY_STYLES[issue.severity] || SEVERITY_STYLES.minor}`}>
                <span className="font-semibold">[{issue.severity?.toUpperCase()}]</span> {issue.title}
                <p className="opacity-70 mt-0.5 truncate">{issue.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {isBranch && tests.length > 0 && (
        <div>
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
    </div>
  )
}

// ── Managerial diff panels ────────────────────────────────────────────────

function MilestoneRow({ milestone, isAtRisk, deltaWeeks }) {
  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
      isAtRisk ? 'bg-red-950 border border-red-800' : 'bg-gray-800 border border-gray-700'
    }`}>
      <div className={`w-2 h-2 rounded-full shrink-0 ${
        milestone.status === 'completed' ? 'bg-green-500' :
        isAtRisk ? 'bg-red-500' : 'bg-gray-500'
      }`} />
      <div className="flex-1">
        <p className="text-xs font-semibold text-white">{milestone.id} — {milestone.label}</p>
        <p className="text-xs text-gray-500">{milestone.date} · {milestone.clause}</p>
      </div>
      {isAtRisk && (
        <span className="text-xs font-semibold text-red-400 shrink-0">+{deltaWeeks}w risk</span>
      )}
    </div>
  )
}

function ManagerialDiffPanel({ side, activeScenario, branchData }) {
  const isBranch      = side === 'branch'
  const cascade       = branchData?.cascade || {}
  const issues        = cascade?.cascade_issues || []

  const branchWeeks = isBranch
    ? issues.filter(i => i.severity === 'critical').length * 2 +
      issues.filter(i => i.severity === 'major').length * 1
    : 0

  const branchCost = isBranch
    ? issues.filter(i => i.severity === 'critical').length * 25000 +
      issues.filter(i => i.severity === 'major').length * 10000 +
      issues.filter(i => i.severity === 'minor').length * 3000
    : 0

  const mainTotalCost = OPEN_NCRS.reduce((acc, ncr) => {
    const m = NCR_MANAGERIAL[ncr.id]
    return acc + (m ? m.cost_impact_eur : 0)
  }, 0)
  const mainWeeks = Math.max(...OPEN_NCRS.map(ncr => NCR_MANAGERIAL[ncr.id]?.schedule_impact_weeks || 0))

  const totalWeeks      = isBranch ? mainWeeks + branchWeeks : mainWeeks
  const totalCost       = isBranch ? mainTotalCost + branchCost : mainTotalCost
  const atRiskMilestone = totalWeeks > 0 ? 'CDR' : null

  return (
    <div className="flex flex-col gap-3">

      {/* KPI */}
      <div className="grid grid-cols-2 gap-2">
        <div className={`rounded-lg border px-3 py-2.5 ${
          totalWeeks > 0 ? 'bg-amber-950 border-amber-800' : 'bg-gray-800 border-gray-700'
        }`}>
          <p className="text-xs text-gray-500 mb-0.5">Schedule Risk</p>
          <p className={`text-xl font-bold ${totalWeeks > 0 ? 'text-amber-400' : 'text-green-400'}`}>
            {totalWeeks > 0 ? `+${totalWeeks}w` : 'On track'}
          </p>
          {isBranch && branchWeeks > 0 && (
            <p className="text-xs text-red-400 mt-0.5">+{branchWeeks}w from change</p>
          )}
        </div>
        <div className={`rounded-lg border px-3 py-2.5 ${
          totalCost > 0 ? 'bg-red-950 border-red-800' : 'bg-gray-800 border-gray-700'
        }`}>
          <p className="text-xs text-gray-500 mb-0.5">Cost at Risk</p>
          <p className={`text-xl font-bold ${totalCost > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {totalCost > 0 ? formatEur(totalCost) : '€0'}
          </p>
          {isBranch && branchCost > 0 && (
            <p className="text-xs text-red-400 mt-0.5">+{formatEur(branchCost)} from change</p>
          )}
        </div>
      </div>

      {/* Milestones */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1.5">Milestone Impact</p>
        <div className="space-y-1.5">
          {MILESTONES.map(m => (
            <MilestoneRow
              key={m.id}
              milestone={m}
              isAtRisk={m.id === atRiskMilestone}
              deltaWeeks={totalWeeks}
            />
          ))}
        </div>
      </div>

      {/* NCR manageriali */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1.5">Open NCR Impact</p>
        <div className="space-y-1.5">
          {OPEN_NCRS.map(ncr => {
            const m = NCR_MANAGERIAL[ncr.id]
            if (!m) return null
            return (
              <div key={ncr.id} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-gray-400">{ncr.id}</span>
                  <div className="flex gap-2">
                    <span className="text-xs text-amber-400">+{m.schedule_impact_weeks}w</span>
                    <span className="text-xs text-red-400">{formatEur(m.cost_impact_eur)}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-300">{m.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{m.contractual_clause}</p>
                {m.customer_notification_required && (
                  <p className="text-xs text-red-400 mt-0.5">⚠ Customer notification required</p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Branch — nuovi impatti */}
      {isBranch && issues.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1.5">
            Additional Issues from Change
          </p>
          <div className="space-y-1.5">
            {issues.map(issue => {
              const estCost  = issue.severity === 'critical' ? 25000 : issue.severity === 'major' ? 10000 : 3000
              const estWeeks = issue.severity === 'critical' ? 2 : issue.severity === 'major' ? 1 : 0
              return (
                <div key={issue.id} className={`rounded-lg border px-3 py-2 ${
                  issue.severity === 'critical' ? 'bg-red-950 border-red-800' :
                  issue.severity === 'major'    ? 'bg-amber-950 border-amber-800' :
                  'bg-gray-800 border-gray-700'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-semibold ${
                      issue.severity === 'critical' ? 'text-red-300' :
                      issue.severity === 'major'    ? 'text-amber-300' : 'text-gray-300'
                    }`}>[{issue.severity?.toUpperCase()}] {issue.title}</span>
                    <div className="flex gap-2 shrink-0">
                      {estWeeks > 0 && <span className="text-xs text-amber-400">+{estWeeks}w</span>}
                      <span className="text-xs text-red-400">~{formatEur(estCost)}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 truncate">{issue.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* LLM managerial summary */}
      {isBranch && cascade?.managerial_summary && (
        <div className="bg-purple-950 border border-purple-700 rounded-lg px-3 py-2.5">
          <p className="text-xs text-purple-400 font-semibold mb-1">📊 LLM Managerial Assessment</p>
          <p className="text-xs text-gray-300">{cascade.managerial_summary}</p>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────

export default function BranchView({ activeScenario = 'nominal', projectId = 'IRIS-3' }) {
  const [changeRequest, setChangeRequest] = useState('')
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState(null)
  const [branchId, setBranchId]           = useState(null)
  const [branchData, setBranchData]       = useState(null)
  const [hoveredMain, setHoveredMain]     = useState(null)
  const [hoveredBranch, setHoveredBranch] = useState(null)
  const [diffMode, setDiffMode]           = useState('technical')

  const scenario     = SCENARIOS[activeScenario]
  const mainSubs     = scenario.subsystems
  const cascade      = branchData?.cascade || {}
  const meta         = branchData?.meta    || {}
  const diff         = branchData?.diff    || {}
  const issues       = cascade?.cascade_issues      || []
  const affectedSubs = cascade?.affected_subsystems || []

  const issueBySubsystem = {}
  issues.forEach(issue => {
    const sid = issue.subsystem
    if (!issueBySubsystem[sid] || issue.severity === 'critical') issueBySubsystem[sid] = issue
  })

  const branchSubs = branchData
    ? buildBranchSubs(mainSubs, diff, affectedSubs, issues)
    : null

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
      const branchRes = await fetch(`${API}/api/project/${projectId}/branch/${data.branch_id}`)
      setBranchData(await branchRes.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">

      {/* Change request */}
      <div className="border-b border-gray-800 p-4 shrink-0">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Change Request</p>
        <div className="flex gap-3">
          <textarea
            value={changeRequest}
            onChange={e => setChangeRequest(e.target.value)}
            placeholder="Describe the change in natural language..."
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
        {error   && <p className="text-xs text-red-400 mt-2">Error: {error}</p>}
        {loading && <p className="text-xs text-amber-400 mt-2 animate-pulse">qwen2.5:14b analyzing — 30-60s...</p>}
      </div>

      {/* 3D viewers — sempre visibili */}
      <div className="flex border-b border-gray-800 shrink-0">

        {/* Main viewer */}
        <div className="flex-1 border-r border-gray-800">
          <div className="flex items-center gap-2 px-4 pt-2 pb-1">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-xs font-semibold text-white">main</span>
            <span className="text-xs text-gray-500">current state</span>
            <a href={`${API}/api/project/${projectId}/pdf`} target="_blank" rel="noopener noreferrer"
              className="ml-auto text-xs text-gray-500 hover:text-blue-400 transition-colors">↓ PDF</a>
          </div>
          <div className="relative mx-3 mb-2 rounded-xl overflow-hidden border border-gray-700" style={{ height: '220px' }}>
            <PayloadViewer3D subsystems={mainSubs} onHover={setHoveredMain} />
            {hoveredMain && mainSubs[hoveredMain] && (
              <div className="absolute bottom-2 left-2 right-2 bg-gray-900 bg-opacity-95 border border-gray-700 rounded-lg px-2 py-1.5 pointer-events-none">
                <p className="text-xs font-semibold text-white capitalize">{hoveredMain.replace('_',' ')}</p>
                <p className="text-xs text-gray-400">{mainSubs[hoveredMain].detail}</p>
              </div>
            )}
          </div>
        </div>

        {/* Branch viewer */}
        <div className="flex-1">
          <div className="flex items-center gap-2 px-4 pt-2 pb-1">
            <div className="w-2 h-2 rounded-full bg-purple-500" />
            <span className="text-xs font-semibold text-white">{branchId ? branchId.slice(-10) : 'branch'}</span>
            <span className="text-xs text-gray-500">proposed change</span>
            {branchId && (
              <a href={`${API}/api/project/${projectId}/branch/${branchId}/pdf`} target="_blank" rel="noopener noreferrer"
                className="ml-auto text-xs text-gray-500 hover:text-purple-400 transition-colors">↓ PDF</a>
            )}
          </div>
          <div className="relative mx-3 mb-2 rounded-xl overflow-hidden border border-gray-700" style={{ height: '220px' }}>
            {branchSubs ? (
              <>
                <PayloadViewer3D
                  subsystems={branchSubs}
                  onHover={setHoveredBranch}
                  geometryChanges={cascade?.geometry_changes || []}
                />
                {hoveredBranch && branchSubs[hoveredBranch] && (
                  <div className="absolute bottom-2 left-2 right-2 bg-gray-900 bg-opacity-95 border border-gray-700 rounded-lg px-2 py-1.5 pointer-events-none">
                    <p className="text-xs font-semibold text-white capitalize">{hoveredBranch.replace('_',' ')}</p>
                    <p className="text-xs text-gray-400">{branchSubs[hoveredBranch].detail}</p>
                    {issueBySubsystem[hoveredBranch] && (
                      <p className="text-xs text-red-400 mt-0.5 font-semibold">
                        [{issueBySubsystem[hoveredBranch].severity?.toUpperCase()}] {issueBySubsystem[hoveredBranch].title}
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full bg-gray-900">
                <div className="text-center">
                  <div className="w-10 h-10 rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center mx-auto mb-2">
                    <span className="text-gray-600">?</span>
                  </div>
                  <p className="text-xs text-gray-500">Submit a change request</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toggle Technical / Manager / User */}
      <div className="border-b border-gray-800 px-4 py-2 flex items-center gap-3 shrink-0">
        <span className="text-xs text-gray-500">Diff view:</span>
        <div className="flex bg-gray-800 border border-gray-700 rounded-lg p-0.5">
          {[
            { id: 'technical',         label: 'Technical'  },
            { id: 'manager',           label: 'Manager'    },
            { id: 'user_satisfaction', label: 'User Needs' },
          ].map(v => (
            <button
              key={v.id}
              onClick={() => setDiffMode(v.id)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                diffMode === v.id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
        {branchData && (
          <span className="text-xs text-gray-500 ml-auto">
            {issues.length} cascade issues
          </span>
        )}
      </div>

      {/* Diff panels affiancati */}
      <div className="flex flex-1 overflow-hidden">

        {/* Main diff */}
        <div className="flex-1 border-r border-gray-800 overflow-y-auto p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-xs font-semibold text-white">main</span>
          </div>
          {diffMode === 'technical' && (
            <TechnicalDiffPanel
              side="main"
              scenario={scenario}
              branchData={null}
              affectedSubs={[]}
              issueBySubsystem={{}}
              branchSubs={null}
            />
          )}
          {diffMode === 'manager' && (
            <ManagerialDiffPanel
              side="main"
              activeScenario={activeScenario}
              branchData={null}
            />
          )}
          {diffMode === 'user_satisfaction' && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Current satisfaction</p>
              <UserSatisfactionPanel cascadeResult={null} showBranchDiff={false} />
            </div>
          )}
        </div>

        {/* Branch diff */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-purple-500" />
            <span className="text-xs font-semibold text-white">
              {branchId ? branchId.slice(-10) : 'branch'}
            </span>
          </div>
          {diffMode === 'technical' && (
            branchData ? (
              <TechnicalDiffPanel
                side="branch"
                scenario={scenario}
                branchData={branchData}
                affectedSubs={affectedSubs}
                issueBySubsystem={issueBySubsystem}
                branchSubs={branchSubs}
              />
            ) : (
              <EmptyBranchPlaceholder icon="X" label="Technical diff will appear here" />
            )
          )}
          {diffMode === 'manager' && (
            branchData ? (
              <ManagerialDiffPanel
                side="branch"
                activeScenario={activeScenario}
                branchData={branchData}
              />
            ) : (
              <EmptyBranchPlaceholder icon="$" label="Managerial impact will appear here" />
            )
          )}
          {diffMode === 'user_satisfaction' && (
            branchData ? (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Satisfaction after change</p>
                <UserSatisfactionPanel cascadeResult={cascade} showBranchDiff={true} />
              </div>
            ) : (
              <EmptyBranchPlaceholder icon="T" label="User needs impact will appear here" />
            )
          )}
        </div>

      </div>
    </div>
  )
}