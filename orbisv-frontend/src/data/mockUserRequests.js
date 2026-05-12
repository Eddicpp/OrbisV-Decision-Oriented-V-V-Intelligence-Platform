// Richieste utente originali in linguaggio operativo
// Mappate a requisiti tecnici e score di soddisfazione

export const USER_REQUESTS = [
  {
    id: "UR-001",
    title: "Agricultural field boundary identification",
    description: "The system shall provide ground imagery with sufficient resolution to clearly identify and delineate agricultural field boundaries for precision farming applications.",
    domain: "optical",
    priority: "critical",
    linked_requirements: ["L1-OPT-001", "L1-OPT-002", "L1-OPT-003", "L1-ATT-001"],
    operational_validation: {
      performed: false,
      description: "No end-to-end operational test with real agricultural imagery performed",
    },
  },
  {
    id: "UR-002",
    title: "Continuous operation across orbital thermal cycles",
    description: "The payload shall maintain full imaging performance throughout all orbital phases including eclipse transitions, without requiring operational interruptions due to thermal effects.",
    domain: "thermal",
    priority: "critical",
    linked_requirements: ["L1-THM-001", "L1-THM-002", "L1-PWR-001", "L1-PWR-002"],
    operational_validation: {
      performed: false,
      description: "Thermal vacuum campaign not yet completed — NCR-2024-031 open",
    },
  },
  {
    id: "UR-003",
    title: "Survive launch and deployment",
    description: "The payload shall survive all mechanical loads during launch, fairing separation, and deployment without structural damage or performance degradation.",
    domain: "mechanical",
    priority: "critical",
    linked_requirements: ["L1-MEC-001", "L1-MEC-002", "L1-MEC-003", "L1-MAS-001"],
    operational_validation: {
      performed: true,
      description: "Vibration and sine tests completed — shock test pending (NCR-2024-041)",
    },
  },
  {
    id: "UR-004",
    title: "Near real-time data delivery",
    description: "Imagery data shall be available on the ground within an acceptable time window after acquisition, enabling near real-time monitoring applications.",
    domain: "data_processing",
    priority: "high",
    linked_requirements: ["L1-DPR-001", "L1-DPR-002"],
    operational_validation: {
      performed: true,
      description: "HIL test performed — latency 420ms within 500ms limit",
    },
  },
  {
    id: "UR-005",
    title: "Accurate geolocation of imagery",
    description: "Each image shall be accurately geolocated to enable precise overlay with existing maps and GIS databases without requiring manual correction.",
    domain: "optical",
    priority: "critical",
    linked_requirements: ["L1-ATT-001"],
    operational_validation: {
      performed: true,
      description: "Star tracker calibration verified — PKE 0.0028° within 0.005° requirement",
    },
  },
  {
    id: "UR-006",
    title: "Platform integration compliance",
    description: "The payload shall be fully compatible with the satellite platform in terms of mass, volume, power consumption and mechanical interfaces.",
    domain: "mechanical",
    priority: "high",
    linked_requirements: ["L1-MAS-001", "L1-PWR-001", "L1-PWR-002"],
    operational_validation: {
      performed: true,
      description: "Mass and power verified at AIT — all within budget",
    },
  },
]

// Calcola score soddisfazione per ogni richiesta utente
// Approccio 3: coverage × 0.3 + compliance × 0.5 + criticality × 0.2
export function computeSatisfactionScore(request, requirements) {
  const linkedReqs = requirements.filter(r =>
    request.linked_requirements.includes(r.id)
  )

  if (linkedReqs.length === 0) return { score: 0, coverage: 0, compliance: 0, criticality: 0 }

  // coverage: req con almeno 1 evidenza / totale req
  const withEvidence = linkedReqs.filter(r => r.evidences && r.evidences.length > 0)
  const coverage = withEvidence.length / linkedReqs.length

  // compliance: media compliance req (ignora null)
  const withCompliance = linkedReqs.filter(r => r.compliance !== null && r.compliance !== undefined)
  const compliance = withCompliance.length > 0
    ? withCompliance.reduce((a, r) => a + r.compliance, 0) / withCompliance.length
    : 0

  // criticality: tutti i req critici sono soddisfatti (compliance > 0.75)?
  const criticalReqs = linkedReqs.filter(r => r.critical)
  const criticalOk = criticalReqs.length === 0
    ? 1
    : criticalReqs.every(r => r.compliance !== null && r.compliance >= 0.75) ? 1 : 0

  // penalizza se validazione operativa non eseguita
  const opValidationPenalty = request.operational_validation?.performed ? 1.0 : 0.85

  const rawScore = (coverage * 0.3 + compliance * 0.5 + criticalOk * 0.2) * opValidationPenalty
  const score    = Math.round(rawScore * 100)

  return {
    score,
    coverage:    Math.round(coverage * 100),
    compliance:  Math.round(compliance * 100),
    criticality: criticalOk === 1,
    linkedReqs,
    withEvidence,
    criticalReqs,
  }
}

// Mappa dominio req -> subsistema
const DOMAIN_TO_SUBSYSTEM = {
  optical:         ['optical', 'startracker'],
  thermal:         ['thermal', 'solar'],
  mechanical:      ['mechanical', 'structure'],
  data_processing: ['dataproc'],
}

// Calcola score con requirements modificati dal branch
export function computeBranchSatisfactionScore(request, requirements, cascadeResult) {
  const affectedReqs    = cascadeResult?.affected_requirements || []
  const affectedSubs    = cascadeResult?.affected_subsystems   || []
  const issues          = cascadeResult?.cascade_issues        || []
  const geometryChanges = cascadeResult?.geometry_changes      || []

  // Trova subsistemi impattati da geometry_changes anche se non in affected_subsystems
  const changedSubs = [
    ...affectedSubs,
    ...geometryChanges.map(g => g.subsystem).filter(Boolean),
  ]

  // Costruisce mappa req -> severity dell'impatto
  const reqImpactMap = {}

  // 1. Req esplicitamente listati in affected_requirements
  affectedReqs.forEach(reqId => {
    const issue = issues.find(i => i.requirement === reqId)
    reqImpactMap[reqId] = issue?.severity || 'minor'
  })

  // 2. Req collegati ai subsistemi impattati (impatto indiretto)
  requirements.forEach(r => {
    if (reqImpactMap[r.id]) return // gia impattato direttamente
    const reqDomain = r.domain
    const domainSubs = DOMAIN_TO_SUBSYSTEM[reqDomain] || []
    const isSubImpacted = domainSubs.some(s => changedSubs.includes(s))
    if (isSubImpacted) {
      // trova la severity peggiore degli issue su quel subsistema
      const subIssues = issues.filter(i => domainSubs.includes(i.subsystem))
      const worstSeverity = subIssues.some(i => i.severity === 'critical') ? 'critical'
        : subIssues.some(i => i.severity === 'major') ? 'major'
        : subIssues.length > 0 ? 'minor'
        : null
      if (worstSeverity) reqImpactMap[r.id] = worstSeverity
    }
  })

  // Costruisce requirements modificati
  const modifiedReqs = requirements.map(r => {
    const severity = reqImpactMap[r.id]
    if (!severity) return r

    const degradation = severity === 'critical' ? 0.45
      : severity === 'major' ? 0.25
      : 0.08

    return {
      ...r,
      compliance: r.compliance !== null ? Math.max(0, r.compliance - degradation) : null,
      // svuota evidenze solo se impatto diretto (req esplicitamente invalidato)
      evidences: affectedReqs.includes(r.id) ? [] : r.evidences,
    }
  })

  return computeSatisfactionScore(request, modifiedReqs)
}