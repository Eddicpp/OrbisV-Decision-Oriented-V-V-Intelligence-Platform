import { useState } from 'react'
import {
  PROJECT_INFO, MILESTONES, NCR_MANAGERIAL,
  MANAGERIAL_SCENARIOS, BUDGET
} from '../data/mockManagerial'
import { OPEN_NCRS } from '../data/mockIRIS3'
import { DECISION_CONFIG } from '../data/mockProjects'
import { SCENARIOS } from '../data/mockIRIS3'
import TestTimeline from './TestTimeline'

const RISK_STYLES = {
  low:    { bg: 'bg-green-900',  border: 'border-green-700',  text: 'text-green-300',  label: 'LOW RISK'    },
  medium: { bg: 'bg-amber-900',  border: 'border-amber-700',  text: 'text-amber-300',  label: 'MEDIUM RISK' },
  high:   { bg: 'bg-red-900',    border: 'border-red-700',    text: 'text-red-300',    label: 'HIGH RISK'   },
}

const MILESTONE_STATUS = {
  completed: { dot: 'bg-green-500',  line: 'bg-green-500',  text: 'text-green-400'  },
  at_risk:   { dot: 'bg-red-500',    line: 'bg-gray-600',   text: 'text-red-400'    },
  nominal:   { dot: 'bg-gray-500',   line: 'bg-gray-600',   text: 'text-gray-400'   },
}

function formatEur(n) {
  return n >= 1000000
    ? `€${(n / 1000000).toFixed(1)}M`
    : `€${(n / 1000).toFixed(0)}k`
}

function StatCard({ label, value, sub, color = 'text-white', border = 'border-gray-700' }) {
  return (
    <div className={`bg-gray-800 border ${border} rounded-xl px-4 py-3`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  )
}

function MilestoneTimeline({ activeScenario }) {
  const mgr = MANAGERIAL_SCENARIOS[activeScenario]
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Milestone Timeline</p>
      <div className="flex items-start gap-0">
        {MILESTONES.map((m, i) => {
          const isAtRisk = m.id === mgr.milestone_at_risk
          const st = isAtRisk ? MILESTONE_STATUS.at_risk : MILESTONE_STATUS[m.status]
          const isLast = i === MILESTONES.length - 1
          return (
            <div key={m.id} className="flex items-start flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-3 h-3 rounded-full shrink-0 ${st.dot} ${isAtRisk ? 'ring-2 ring-red-400 ring-offset-1 ring-offset-gray-900' : ''}`} />
                <p className={`text-xs font-semibold mt-1 text-center ${st.text}`}>{m.id}</p>
                <p className="text-xs text-gray-600 text-center">{m.date.slice(0, 7)}</p>
                {isAtRisk && (
                  <span className="text-xs text-red-400 text-center mt-0.5">
                    +{mgr.weeks_delay}w
                  </span>
                )}
              </div>
              {!isLast && (
                <div className={`h-px w-full mt-1.5 ${
                  m.status === 'completed' ? 'bg-green-600' : 'bg-gray-700'
                }`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function NCRManagerialCard({ ncr }) {
  const [open, setOpen] = useState(false)
  const mgr = NCR_MANAGERIAL[ncr.id]
  if (!mgr) return null

  return (
    <div className={`border rounded-xl overflow-hidden ${
      mgr.severity === 'major'
        ? 'border-red-800 bg-gray-800'
        : 'border-amber-800 bg-gray-800'
    }`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs font-mono text-gray-400 shrink-0">{ncr.id}</span>
          <span className="text-sm font-semibold text-white flex-1">{mgr.title}</span>
          <span className={`text-xs px-2 py-0.5 rounded border shrink-0 ${
            mgr.severity === 'major'
              ? 'bg-red-900 text-red-300 border-red-700'
              : 'bg-amber-900 text-amber-300 border-amber-700'
          }`}>
            {mgr.severity}
          </span>
          <span className="text-gray-600 text-xs">{open ? '▲' : '▼'}</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">⏱</span>
            <span className="text-xs font-semibold text-amber-400">+{mgr.schedule_impact_weeks}w</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">💶</span>
            <span className="text-xs font-semibold text-red-400">{formatEur(mgr.cost_impact_eur)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">📋</span>
            <span className="text-xs text-gray-300 truncate">{mgr.contractual_clause}</span>
          </div>
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-700 px-4 py-3 bg-gray-900 space-y-3">
          <p className="text-xs text-gray-400">{mgr.managerial_summary}</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-800 rounded-lg px-3 py-2">
              <p className="text-xs text-gray-500 mb-1">Schedule Impact</p>
              <p className="text-sm font-semibold text-amber-400">+{mgr.schedule_impact_weeks} weeks</p>
              <p className="text-xs text-gray-500 mt-0.5">{mgr.contractual_risk}</p>
            </div>
            <div className="bg-gray-800 rounded-lg px-3 py-2">
              <p className="text-xs text-gray-500 mb-1">Cost Impact</p>
              <p className="text-sm font-semibold text-red-400">{formatEur(mgr.cost_impact_eur)}</p>
              <p className="text-xs text-gray-500 mt-0.5">estimated recovery cost</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-1.5">Cost Breakdown</p>
            <div className="space-y-1">
              {mgr.cost_breakdown.map((item, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-gray-400">{item.item}</span>
                  <span className="text-white font-mono">{formatEur(item.eur)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">Responsible</p>
              <p className="text-xs text-white">{mgr.responsible}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Customer Notification</p>
              <p className={`text-xs font-semibold ${mgr.customer_notification_required ? 'text-red-400' : 'text-green-400'}`}>
                {mgr.customer_notification_required ? '⚠ Required' : '✅ Not required'}
              </p>
            </div>
          </div>

          <div className="bg-blue-950 border border-blue-800 rounded-lg px-3 py-2">
            <p className="text-xs text-gray-500 mb-1">Mitigation</p>
            <p className="text-xs text-blue-300">{mgr.mitigation}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function BudgetPanel() {
  const total = BUDGET.total_eur
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Budget by Phase</p>
      <div className="space-y-2">
        {BUDGET.phases.map(phase => {
          const pct = Math.round((phase.spent_eur / phase.budget_eur) * 100) || 0
          return (
            <div key={phase.phase}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-400">{phase.phase}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{formatEur(phase.spent_eur)} / {formatEur(phase.budget_eur)}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded border ${
                    phase.status === 'closed' ? 'bg-gray-700 text-gray-400 border-gray-600' :
                    phase.status === 'active' ? 'bg-blue-900 text-blue-300 border-blue-700' :
                    'bg-gray-800 text-gray-600 border-gray-700'
                  }`}>
                    {phase.status}
                  </span>
                </div>
              </div>
              <div className="bg-gray-700 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full ${
                    phase.status === 'closed' ? 'bg-green-600' :
                    phase.status === 'active' ? 'bg-blue-500' : 'bg-gray-600'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ManagerView({ activeScenario = 'nominal', branchManagerialSummary = null, readiness = null }) {
  const mgr      = MANAGERIAL_SCENARIOS[activeScenario]
  const scenario = SCENARIOS[activeScenario]

  // Usa readiness calcolato se disponibile, altrimenti fallback a scenario hardcoded
  const decision   = readiness ? readiness.decision   : scenario.decision
  const confidence = readiness ? readiness.confidence : scenario.confidence
  const cfg        = DECISION_CONFIG[decision]
  const risk       = RISK_STYLES[mgr.overall_schedule_risk]
  const [activeTab, setActiveTab] = useState('overview')

  const totalNCRcost = OPEN_NCRS.reduce((acc, ncr) => {
    const m = NCR_MANAGERIAL[ncr.id]
    return acc + (m ? m.cost_impact_eur : 0)
  }, 0)
  const totalWeeks = OPEN_NCRS.reduce((acc, ncr) => {
    const m = NCR_MANAGERIAL[ncr.id]
    return Math.max(acc, m ? m.schedule_impact_weeks : 0)
  }, 0)

  return (
    <div className="space-y-4">

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-700">
        {[
          { id: 'overview', label: '📊 Overview'      },
          { id: 'timeline', label: '📅 Test Calendar' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-white'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'timeline' && <TestTimeline />}

      {activeTab === 'overview' && <div className="space-y-6">
  return (
    <div className="space-y-6">

      {/* Decision + Risk summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className={`rounded-xl border-2 ${cfg.border} ${cfg.bg} p-4`}>
          <p className="text-xs text-gray-500 mb-1">GO/NO-GO Decision</p>
          <p className={`text-2xl font-bold ${cfg.color}`}>{cfg.label}</p>
          <p className={`text-sm ${cfg.color}`}>{confidence}% confidence</p>
          <div className="w-full bg-white bg-opacity-20 rounded-full h-1.5 mt-2">
            <div className={`h-1.5 rounded-full ${cfg.dot}`} style={{ width: `${confidence}%` }} />
          </div>
          {readiness && readiness.blockingIssues.length > 0 && (
            <div className="mt-2 space-y-1">
              {readiness.blockingIssues.slice(0,2).map((issue, i) => (
                <p key={i} className={`text-xs ${issue.type === 'blocker' ? 'text-red-300' : 'text-amber-300'}`}>
                  {issue.type === 'blocker' ? 'X' : '!'} {issue.message}
                </p>
              ))}
            </div>
          )}
        </div>
        <div className={`rounded-xl border ${risk.border} ${risk.bg} p-4`}>
          <p className="text-xs text-gray-400 mb-1">Overall Schedule Risk</p>
          <p className={`text-2xl font-bold ${risk.text}`}>{risk.label}</p>
          <p className="text-xs text-gray-400 mt-1">{mgr.summary}</p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard
          label="Schedule at Risk"
          value={totalWeeks > 0 ? `+${totalWeeks}w` : 'On track'}
          sub={mgr.milestone_at_risk ? `${mgr.milestone_at_risk} milestone` : 'No milestone at risk'}
          color={totalWeeks > 0 ? 'text-amber-400' : 'text-green-400'}
          border={totalWeeks > 0 ? 'border-amber-800' : 'border-green-800'}
        />
        <StatCard
          label="Cost at Risk"
          value={totalNCRcost > 0 ? formatEur(totalNCRcost) : '€0'}
          sub="NCR recovery cost"
          color={totalNCRcost > 0 ? 'text-red-400' : 'text-green-400'}
          border={totalNCRcost > 0 ? 'border-red-800' : 'border-green-800'}
        />
        <StatCard
          label="Budget Consumed"
          value={`${mgr.budget_consumed_pct}%`}
          sub={`of ${formatEur(BUDGET.total_eur)} total`}
          color={mgr.budget_consumed_pct > 85 ? 'text-amber-400' : 'text-white'}
        />
        <StatCard
          label="Open NCRs"
          value={OPEN_NCRS.length}
          sub={`${OPEN_NCRS.filter(n => NCR_MANAGERIAL[n.id]?.customer_notification_required).length} require customer notification`}
          color={OPEN_NCRS.length > 0 ? 'text-red-400' : 'text-green-400'}
          border={OPEN_NCRS.length > 0 ? 'border-red-800' : 'border-green-800'}
        />
      </div>

      {/* Milestone timeline */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <MilestoneTimeline activeScenario={activeScenario} />
      </div>

      {/* Project info */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Project Information</p>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Contract',         value: PROJECT_INFO.contract_number },
            { label: 'Customer',         value: PROJECT_INFO.customer },
            { label: 'Prime Contractor', value: PROJECT_INFO.prime_contractor },
            { label: 'Program Manager',  value: PROJECT_INFO.program_manager },
            { label: 'Technical Manager',value: PROJECT_INFO.technical_manager },
            { label: 'Contract Value',   value: formatEur(PROJECT_INFO.contract_value_eur) },
          ].map(item => (
            <div key={item.label}>
              <p className="text-xs text-gray-500">{item.label}</p>
              <p className="text-sm text-white font-medium">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* NCR managerial impact */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">
          Open Issues — Managerial Impact
        </p>
        <div className="space-y-3">
          {OPEN_NCRS.map(ncr => (
            <NCRManagerialCard key={ncr.id} ncr={ncr} />
          ))}
        </div>
      </div>

      {/* Budget */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <BudgetPanel />
      </div>

      {/* Branch managerial summary se presente */}
      {branchManagerialSummary && (
        <div className="bg-purple-950 border border-purple-700 rounded-xl p-4">
          <p className="text-xs text-purple-400 uppercase tracking-wider mb-2">
            ⚡ Branch — Managerial Impact
          </p>
          <p className="text-sm text-gray-300">{branchManagerialSummary}</p>
        </div>
      )}

    </div>
  )
      </div>}

    </div>
  )
}