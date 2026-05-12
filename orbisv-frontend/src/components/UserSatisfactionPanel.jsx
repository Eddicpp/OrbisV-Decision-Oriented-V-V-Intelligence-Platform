import { useState } from 'react'
import { USER_REQUESTS, computeSatisfactionScore, computeBranchSatisfactionScore } from '../data/mockUserRequests'
import { REQUIREMENTS } from '../data/mockIRIS3'
import { computeOperationalValidation } from '../data/readiness'

function ScoreBar({ score, scoreBefore, small = false }) {
  const color = score >= 80 ? 'bg-green-500'
    : score >= 60 ? 'bg-amber-500'
    : 'bg-red-500'

  const delta = scoreBefore !== undefined ? score - scoreBefore : null

  return (
    <div className="flex items-center gap-3">
      <div className={`flex-1 bg-gray-700 rounded-full ${small ? 'h-1.5' : 'h-2'}`}>
        <div
          className={`${small ? 'h-1.5' : 'h-2'} rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className={`font-semibold ${small ? 'text-xs' : 'text-sm'} ${
          score >= 80 ? 'text-green-400' : score >= 60 ? 'text-amber-400' : 'text-red-400'
        }`}>
          {score}%
        </span>
        {delta !== null && delta !== 0 && (
          <span className={`text-xs font-semibold ${delta < 0 ? 'text-red-400' : 'text-green-400'}`}>
            ({delta > 0 ? '+' : ''}{delta}%)
          </span>
        )}
      </div>
    </div>
  )
}

function StatusIcon({ ok, warn }) {
  if (ok)   return <span className="text-green-400 text-xs">✅</span>
  if (warn) return <span className="text-amber-400 text-xs">⚠️</span>
  return      <span className="text-red-400 text-xs">❌</span>
}

function RequestCard({ request, requirements, cascadeResult, showBranchDiff }) {
  const [open, setOpen] = useState(false)

  // Validazione operativa calcolata dai test reali
  const opValidation = computeOperationalValidation(request.id)

  // Nel branch: se ci sono test mancanti che riguardano questo need, op_validation diventa false
  const missingTests    = cascadeResult?.missing_tests || []
  const affectedSubs    = cascadeResult?.affected_subsystems || []
  const branchOpValidation = showBranchDiff && cascadeResult ? {
    performed: opValidation.performed &&
      missingTests.length === 0 &&
      opValidation.relevantTests?.every(t => !affectedSubs.includes(t.subsystem)),
    description: missingTests.length > 0
      ? `${missingTests.length} new tests required by change`
      : opValidation.description,
  } : opValidation

  const main   = computeSatisfactionScore({ ...request, operational_validation: opValidation }, requirements)
  const branch = showBranchDiff && cascadeResult
    ? computeBranchSatisfactionScore({ ...request, operational_validation: branchOpValidation }, requirements, cascadeResult)
    : null

  const isAffected = branch && branch.score !== main.score
  const score      = main.score
  const priority   = request.priority

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${
      isAffected
        ? 'border-purple-600 bg-purple-950'
        : score >= 80 ? 'border-gray-700 bg-gray-800'
        : score >= 60 ? 'border-amber-800 bg-gray-800'
        : 'border-red-800 bg-gray-800'
    }`}>

      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs font-mono font-semibold text-blue-400 shrink-0">{request.id}</span>
          <span className="text-sm font-semibold text-white flex-1">{request.title}</span>
          <div className="flex items-center gap-2 shrink-0">
            {priority === 'critical' && (
              <span className="text-xs bg-red-900 text-red-300 border border-red-700 px-1.5 py-0.5 rounded">critical</span>
            )}
            {isAffected && (
              <span className="text-xs bg-purple-900 text-purple-300 border border-purple-700 px-1.5 py-0.5 rounded">modified</span>
            )}
            <span className="text-gray-600 text-xs">{open ? '▲' : '▼'}</span>
          </div>
        </div>

        {/* Score bar — main */}
        {!showBranchDiff || !branch ? (
          <ScoreBar score={score} />
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-12 shrink-0">main</span>
              <ScoreBar score={main.score} small />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-purple-400 w-12 shrink-0">branch</span>
              <ScoreBar score={branch.score} scoreBefore={main.score} small />
            </div>
          </div>
        )}
      </button>

      {/* Detail */}
      {open && (
        <div className="border-t border-gray-700 px-4 py-3 bg-gray-900 space-y-4">

          {/* Descrizione operativa */}
          <p className="text-xs text-gray-400 italic">{request.description}</p>

          {/* Score breakdown */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Coverage',    value: `${main.coverage}%`,    ok: main.coverage >= 80,    warn: main.coverage >= 60 },
              { label: 'Compliance',  value: `${main.compliance}%`,  ok: main.compliance >= 80,  warn: main.compliance >= 60 },
              { label: 'Critical OK', value: main.criticality ? 'Yes' : 'No', ok: main.criticality, warn: false },
            ].map(item => (
              <div key={item.label} className="bg-gray-800 rounded-lg px-3 py-2 text-center">
                <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                <div className="flex items-center justify-center gap-1">
                  <StatusIcon ok={item.ok} warn={item.warn && !item.ok} />
                  <span className={`text-sm font-semibold ${
                    item.ok ? 'text-green-400' : item.warn ? 'text-amber-400' : 'text-red-400'
                  }`}>{item.value}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Requisiti collegati */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Linked Requirements</p>
            <div className="space-y-1.5">
              {main.linkedReqs.map(req => {
                const hasEvidence = req.evidences && req.evidences.length > 0
                const comp        = req.compliance !== null ? Math.round(req.compliance * 100) : null
                const branchReq   = branch?.linkedReqs?.find(r => r.id === req.id)
                const branchComp  = branchReq?.compliance !== null ? Math.round((branchReq?.compliance || 0) * 100) : null
                const isReqAffected = branch && branchComp !== comp

                return (
                  <div key={req.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                    isReqAffected ? 'bg-purple-900 border border-purple-700' : 'bg-gray-800'
                  }`}>
                    <StatusIcon ok={hasEvidence && comp >= 75} warn={hasEvidence && comp >= 60} />
                    <span className="text-xs font-mono text-purple-400 shrink-0">{req.id}</span>
                    <span className="text-xs text-gray-300 flex-1 truncate">{req.description}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      {comp !== null ? (
                        <span className={`text-xs font-semibold ${
                          comp >= 80 ? 'text-green-400' : comp >= 60 ? 'text-amber-400' : 'text-red-400'
                        }`}>{comp}%</span>
                      ) : (
                        <span className="text-xs text-gray-500">N/A</span>
                      )}
                      {isReqAffected && branchComp !== null && (
                        <span className="text-xs text-purple-300">→ {branchComp}%</span>
                      )}
                      {!hasEvidence && (
                        <span className="text-xs text-red-400 italic">no evidence</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Validazione operativa */}
          <div className={`rounded-lg px-3 py-2.5 border ${
            request.operational_validation.performed
              ? 'bg-green-950 border-green-800'
              : 'bg-red-950 border-red-800'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <StatusIcon ok={request.operational_validation.performed} warn={false} />
              <span className="text-xs font-semibold text-white">Operational Validation</span>
            </div>
            <p className="text-xs text-gray-400">{request.operational_validation.description}</p>
          </div>

          {/* Branch impact se presente */}
          {isAffected && branch && (
            <div className="bg-purple-950 border border-purple-700 rounded-lg px-3 py-2.5">
              <p className="text-xs font-semibold text-purple-300 mb-1">⚡ Branch Impact</p>
              <div className="grid grid-cols-3 gap-2 text-xs text-center">
                <div>
                  <p className="text-gray-500">Coverage</p>
                  <p className={`font-semibold ${branch.coverage < main.coverage ? 'text-red-400' : 'text-green-400'}`}>
                    {branch.coverage}% {branch.coverage < main.coverage ? `(−${main.coverage - branch.coverage}%)` : ''}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Compliance</p>
                  <p className={`font-semibold ${branch.compliance < main.compliance ? 'text-red-400' : 'text-green-400'}`}>
                    {branch.compliance}% {branch.compliance < main.compliance ? `(−${main.compliance - branch.compliance}%)` : ''}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Critical OK</p>
                  <p className={`font-semibold ${!branch.criticality ? 'text-red-400' : 'text-green-400'}`}>
                    {branch.criticality ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function UserSatisfactionPanel({ cascadeResult, showBranchDiff = false }) {
  const [filterPriority, setFilterPriority] = useState('all')
  const [sortBy, setSortBy]                 = useState('score')

  const scored = USER_REQUESTS.map(req => ({
    req,
    score: computeSatisfactionScore(req, REQUIREMENTS).score,
  }))

  const filtered = scored.filter(({ req }) =>
    filterPriority === 'all' || req.priority === filterPriority
  )

  const sorted = [...filtered].sort((a, b) =>
    sortBy === 'score' ? a.score - b.score : a.req.id.localeCompare(b.req.id)
  )

  const avgScore = Math.round(
    scored.reduce((a, { score }) => a + score, 0) / scored.length
  )

  const critical = scored.filter(({ req }) => req.priority === 'critical')
  const avgCritical = Math.round(
    critical.reduce((a, { score }) => a + score, 0) / critical.length
  )

  return (
    <div className="space-y-4">

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-center">
          <p className="text-xs text-gray-500 mb-1">Overall Satisfaction</p>
          <p className={`text-xl font-bold ${avgScore >= 80 ? 'text-green-400' : avgScore >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
            {avgScore}%
          </p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-center">
          <p className="text-xs text-gray-500 mb-1">Critical Requirements</p>
          <p className={`text-xl font-bold ${avgCritical >= 80 ? 'text-green-400' : avgCritical >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
            {avgCritical}%
          </p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-center">
          <p className="text-xs text-gray-500 mb-1">Op. Validated</p>
          <p className="text-xl font-bold text-white">
            {USER_REQUESTS.filter(r => r.operational_validation.performed).length}/{USER_REQUESTS.length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1">
          {['all', 'critical', 'high'].map(f => (
            <button
              key={f}
              onClick={() => setFilterPriority(f)}
              className={`text-xs px-2.5 py-1 rounded border transition-all capitalize ${
                filterPriority === f
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'border-gray-700 text-gray-400 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex gap-1 ml-auto">
          <span className="text-xs text-gray-500 self-center">Sort:</span>
          {['score', 'id'].map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`text-xs px-2.5 py-1 rounded border transition-all ${
                sortBy === s
                  ? 'bg-gray-600 border-gray-500 text-white'
                  : 'border-gray-700 text-gray-400 hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {showBranchDiff && cascadeResult && (
        <div className="bg-purple-950 border border-purple-700 rounded-lg px-3 py-2 flex items-center gap-2">
          <span className="text-purple-400 text-sm">⚡</span>
          <span className="text-xs text-purple-300">
            Showing branch impact — purple cards indicate requests affected by the proposed change
          </span>
        </div>
      )}

      {/* Request cards */}
      <div className="space-y-3">
        {sorted.map(({ req }) => (
          <RequestCard
            key={req.id}
            request={req}
            requirements={REQUIREMENTS}
            cascadeResult={cascadeResult}
            showBranchDiff={showBranchDiff}
          />
        ))}
      </div>
    </div>
  )
}