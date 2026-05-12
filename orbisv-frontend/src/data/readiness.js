/**
 * readiness.js
 * Calcola GO/NO-GO, domain scores e user satisfaction
 * dinamicamente dai dati reali — niente hardcoded.
 */

import { TEST_CALENDAR, NCR_MANAGERIAL } from './mockManagerial'
import { REQUIREMENTS, USER_NEEDS, OPEN_NCRS } from './mockIRIS3'

// ── Soglie per milestone ──────────────────────────────────────────────────

const MILESTONE_THRESHOLDS = {
  SRR: {
    min_test_completion:    0.10,
    max_critical_ncr:       99,
    max_major_ncr:          99,
    max_ecss_open_critical: 99,
    min_req_coverage:       0.30,
  },
  PDR: {
    min_test_completion:    0.30,
    max_critical_ncr:       0,
    max_major_ncr:          5,
    max_ecss_open_critical: 5,
    min_req_coverage:       0.50,
  },
  CDR: {
    min_test_completion:    0.70,
    max_critical_ncr:       0,
    max_major_ncr:          3,
    max_ecss_open_critical: 3,
    min_req_coverage:       0.75,
  },
  QR: {
    min_test_completion:    0.90,
    max_critical_ncr:       0,
    max_major_ncr:          1,
    max_ecss_open_critical: 1,
    min_req_coverage:       0.90,
  },
  LAUNCH: {
    min_test_completion:    1.00,
    max_critical_ncr:       0,
    max_major_ncr:          0,
    max_ecss_open_critical: 0,
    min_req_coverage:       1.00,
  },
}

// ── Calcolo completamento test ────────────────────────────────────────────

export function computeTestStats(subsystem = null) {
  const tests = subsystem
    ? TEST_CALENDAR.filter(t => t.subsystem === subsystem)
    : TEST_CALENDAR

  const total   = tests.length
  const done    = tests.filter(t => t.status === 'done').length
  const open    = tests.filter(t => t.status === 'open').length
  const pending = tests.filter(t => t.status === 'pending').length
  const blocked = tests.filter(t => t.ncr !== null && t.status !== 'done').length

  return {
    total,
    done,
    open,
    pending,
    blocked,
    completion: total > 0 ? done / total : 0,
  }
}

// ── Calcolo domain score per sottosistema ─────────────────────────────────

const SUBSYSTEM_DOMAIN_MAP = {
  optical:     ['optical'],
  thermal:     ['thermal'],
  mechanical:  ['mechanical'],
  structure:   ['mechanical'],
  startracker: ['optical'],
  dataproc:    ['data_processing'],
  solar:       ['thermal'],
}

export function computeDomainScore(subsystemId) {
  const domains = SUBSYSTEM_DOMAIN_MAP[subsystemId] || []

  // requisiti collegati a questo dominio
  const linkedReqs = REQUIREMENTS.filter(r => domains.includes(r.domain))
  if (linkedReqs.length === 0) return { score: 0, status: 'pending', detail: 'No requirements' }

  // compliance media (ignora null)
  const withCompliance = linkedReqs.filter(r => r.compliance !== null)
  const avgCompliance  = withCompliance.length > 0
    ? withCompliance.reduce((a, r) => a + r.compliance, 0) / withCompliance.length
    : 0

  // test completati per questo subsistema
  const testStats    = computeTestStats(subsystemId)
  const testWeight   = 0.4
  const reqWeight    = 0.6
  const rawScore     = (avgCompliance * reqWeight + testStats.completion * testWeight)
  const score        = Math.round(rawScore * 100)

  // NCR aperti che impattano questo subsistema
  const subsystemNcrs = OPEN_NCRS.filter(ncr => {
    const mgr = NCR_MANAGERIAL[ncr.id]
    const req = REQUIREMENTS.find(r => r.id === mgr?.req)
    return req && domains.includes(req.domain)
  })

  let status = 'ok'
  let detail = `${testStats.done}/${testStats.total} tests · compliance ${Math.round(avgCompliance * 100)}%`

  if (score < 55) {
    status = 'fail'
  } else if (score < 75 || subsystemNcrs.length > 0 || testStats.open > 0) {
    status = 'warn'
    if (testStats.open > 0)      detail = `${testStats.open} tests open · ${detail}`
    if (subsystemNcrs.length > 0) detail = `${subsystemNcrs.length} NCR open · ${detail}`
  }

  return { score, status, detail, testStats, linkedReqs, subsystemNcrs }
}

// ── Calcolo GO/NO-GO reale ────────────────────────────────────────────────

export function computeReadiness(milestone = 'CDR') {
  const thresholds = MILESTONE_THRESHOLDS[milestone] || MILESTONE_THRESHOLDS.CDR

  // --- Test completion
  const testStats        = computeTestStats()
  const testCompletion   = testStats.completion
  const blockedTests     = testStats.blocked

  // --- NCR count per severity
  const criticalNcrs = OPEN_NCRS.filter(ncr => NCR_MANAGERIAL[ncr.id]?.severity === 'critical')
  const majorNcrs    = OPEN_NCRS.filter(ncr => NCR_MANAGERIAL[ncr.id]?.severity === 'major')
  const minorNcrs    = OPEN_NCRS.filter(ncr => NCR_MANAGERIAL[ncr.id]?.severity === 'minor')

  // --- Requisiti critici senza evidenza
  const criticalReqs          = REQUIREMENTS.filter(r => r.critical)
  const criticalWithEvidence  = criticalReqs.filter(r => r.evidences && r.evidences.length > 0)
  const reqCoverage           = criticalReqs.length > 0
    ? criticalWithEvidence.length / criticalReqs.length
    : 1

  // --- ECSS open items critici (test open con NCR)
  const ecssOpenCritical = TEST_CALENDAR.filter(t =>
    t.status === 'open' && t.ncr !== null &&
    OPEN_NCRS.some(n => n.id === t.ncr && NCR_MANAGERIAL[n.id]?.severity === 'major')
  ).length

  // --- Blockers assoluti (rendono NO_GO indipendentemente)
  const hardBlockers = []

  if (criticalNcrs.length > thresholds.max_critical_ncr) {
    hardBlockers.push(`${criticalNcrs.length} critical NCR open (max ${thresholds.max_critical_ncr})`)
  }
  if (majorNcrs.length > thresholds.max_major_ncr) {
    hardBlockers.push(`${majorNcrs.length} major NCR open (max ${thresholds.max_major_ncr})`)
  }
  if (testCompletion < thresholds.min_test_completion) {
    const pct = Math.round(testCompletion * 100)
    const req = Math.round(thresholds.min_test_completion * 100)
    hardBlockers.push(`Test completion ${pct}% < ${req}% required for ${milestone}`)
  }
  if (reqCoverage < thresholds.min_req_coverage) {
    const pct = Math.round(reqCoverage * 100)
    const req = Math.round(thresholds.min_req_coverage * 100)
    hardBlockers.push(`Critical req coverage ${pct}% < ${req}% required for ${milestone}`)
  }
  if (ecssOpenCritical > thresholds.max_ecss_open_critical) {
    hardBlockers.push(`${ecssOpenCritical} ECSS critical open items (max ${thresholds.max_ecss_open_critical})`)
  }

  // --- Soft warnings (→ GO_WITH_CONSTRAINTS)
  const softWarnings = []
  if (minorNcrs.length > 0) {
    softWarnings.push(`${minorNcrs.length} minor NCR open`)
  }
  if (blockedTests > 0) {
    softWarnings.push(`${blockedTests} tests blocked by NCR`)
  }
  const testsOpen = testStats.open
  if (testsOpen > 0 && hardBlockers.length === 0) {
    softWarnings.push(`${testsOpen} tests still open`)
  }

  // --- Decisione
  let decision
  if (hardBlockers.length > 0) {
    decision = 'NO_GO'
  } else if (softWarnings.length > 0) {
    decision = 'GO_WITH_CONSTRAINTS'
  } else {
    decision = 'GO'
  }

  // --- Confidence score
  let confidence = 100

  // penalità per test incompleti
  confidence -= Math.round((1 - testCompletion) * 40)

  // penalità per NCR
  confidence -= criticalNcrs.length * 25
  confidence -= majorNcrs.length * 10
  confidence -= minorNcrs.length * 3

  // penalità per requisiti senza evidenza
  confidence -= Math.round((1 - reqCoverage) * 20)

  // penalità per ECSS open
  confidence -= ecssOpenCritical * 5

  confidence = Math.max(5, Math.min(99, confidence))

  // --- Domain scores calcolati
  const subsystems = {}
  const SUBSYSTEM_IDS = ['optical', 'thermal', 'mechanical', 'structure', 'startracker', 'dataproc', 'solar']
  SUBSYSTEM_IDS.forEach(id => {
    subsystems[id] = computeDomainScore(id)
  })

  // --- Blocking issues top 3 (per GO_WITH_CONSTRAINTS e NO_GO)
  const blockingIssues = [
    ...hardBlockers.map(b => ({ type: 'blocker', message: b })),
    ...softWarnings.map(w => ({ type: 'warning', message: w })),
  ].slice(0, 3)

  return {
    decision,
    confidence,
    milestone,
    hardBlockers,
    softWarnings,
    blockingIssues,
    subsystems,
    testStats,
    reqCoverage:     Math.round(reqCoverage * 100),
    criticalNcrCount: criticalNcrs.length,
    majorNcrCount:    majorNcrs.length,
    minorNcrCount:    minorNcrs.length,
    ecssOpenCritical,
  }
}

// ── Calcola operational_validation da TEST_CALENDAR ───────────────────────

export function computeOperationalValidation(userNeedId) {
  // trova requirements collegati al need
  const linkedReqs = REQUIREMENTS.filter(r => r.parent_need === userNeedId)
  const linkedDomains = [...new Set(linkedReqs.map(r => r.domain))]

  // trova subsistemi corrispondenti ai domini
  const subsystemIds = Object.entries(SUBSYSTEM_DOMAIN_MAP)
    .filter(([, domains]) => domains.some(d => linkedDomains.includes(d)))
    .map(([id]) => id)

  // test completati per questi subsistemi
  const relevantTests = TEST_CALENDAR.filter(t => subsystemIds.includes(t.subsystem))
  const doneTests     = relevantTests.filter(t => t.status === 'done')
  const performed     = relevantTests.length > 0 && doneTests.length === relevantTests.length

  const openTests     = relevantTests.filter(t => t.status === 'open')
  const pendingTests  = relevantTests.filter(t => t.status === 'pending')

  let description
  if (performed) {
    description = `All ${doneTests.length} relevant tests completed`
  } else if (openTests.length > 0) {
    description = `${openTests.length} tests open: ${openTests.map(t => t.name).slice(0, 2).join(', ')}${openTests.length > 2 ? '...' : ''}`
  } else if (pendingTests.length > 0) {
    description = `${pendingTests.length} tests pending: ${pendingTests.map(t => t.name).slice(0, 2).join(', ')}${pendingTests.length > 2 ? '...' : ''}`
  } else {
    description = 'No relevant tests found'
  }

  return { performed, description, relevantTests, doneTests, openTests }
}

// ── Utility: readiness per tutti i milestone ─────────────────────────────

export function computeAllMilestones() {
  return Object.keys(MILESTONE_THRESHOLDS).map(m => ({
    milestone: m,
    ...computeReadiness(m),
  }))
}
