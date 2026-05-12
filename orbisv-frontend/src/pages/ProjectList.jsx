import { useNavigate } from 'react-router-dom'
import { mockProjects, DECISION_CONFIG, MILESTONE_ORDER } from '../data/mockProjects'

const DOMAIN_COLORS = {
  optical: 'bg-blue-500',
  thermal: 'bg-orange-500',
  mechanical: 'bg-purple-500',
  data_processing: 'bg-teal-500',
}

const DOMAIN_LABELS = {
  optical: 'Optical',
  thermal: 'Thermal',
  mechanical: 'Mechanical',
  data_processing: 'Data Proc',
}

function DecisionBadge({ decision }) {
  const cfg = DECISION_CONFIG[decision]
  if (!cfg) return null
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function MilestoneBar({ milestone }) {
  const idx = MILESTONE_ORDER.indexOf(milestone)
  return (
    <div className="flex gap-1 items-center">
      {MILESTONE_ORDER.map((m, i) => (
        <div key={m} className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${i <= idx ? 'bg-blue-500' : 'bg-gray-600'}`} />
          <span className={`text-xs ${i === idx ? 'text-blue-400 font-semibold' : 'text-gray-500'}`}>{m}</span>
          {i < MILESTONE_ORDER.length - 1 && (
            <div className={`w-4 h-px ${i < idx ? 'bg-blue-500' : 'bg-gray-600'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

function DomainBars({ domains }) {
  return (
    <div className="space-y-1.5">
      {Object.entries(domains).map(([key, val]) => {
        if (val === null) return null
        const color = DOMAIN_COLORS[key] || 'bg-gray-500'
        const pct = val ?? 0
        const textColor = pct >= 80 ? 'text-green-400' : pct >= 60 ? 'text-amber-400' : 'text-red-400'
        return (
          <div key={key} className="flex items-center gap-2">
            <span className="text-xs text-gray-400 w-16 shrink-0">{DOMAIN_LABELS[key]}</span>
            <div className="flex-1 bg-gray-700 rounded-full h-1.5">
              <div className={`h-1.5 rounded-full ${color} opacity-80`} style={{ width: `${pct}%` }} />
            </div>
            <span className={`text-xs font-medium w-8 text-right ${textColor}`}>{pct}%</span>
          </div>
        )
      })}
    </div>
  )
}

function ProjectCard({ project, onClick }) {
  const completionColor = project.completion >= 80
    ? 'bg-green-500'
    : project.completion >= 40
    ? 'bg-blue-500'
    : 'bg-gray-500'

  return (
    <div
      onClick={onClick}
      className="bg-gray-800 border border-gray-700 rounded-xl p-5 cursor-pointer hover:border-blue-500 hover:bg-gray-750 transition-all duration-200 group"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="text-white font-semibold text-lg group-hover:text-blue-400 transition-colors">
            {project.name}
          </h2>
          <span className="text-xs text-gray-400">{project.customer} — {project.domain}</span>
        </div>
        <DecisionBadge decision={project.decision} />
      </div>

      <p className="text-gray-400 text-sm mb-4 line-clamp-2">{project.description}</p>

      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-400">Completion</span>
          <span className="text-xs font-semibold text-white">{project.completion}%</span>
        </div>
        <div className="bg-gray-700 rounded-full h-2">
          <div className={`h-2 rounded-full ${completionColor}`} style={{ width: `${project.completion}%` }} />
        </div>
      </div>

      <div className="mb-4">
        <DomainBars domains={project.domains} />
      </div>

      <div className="border-t border-gray-700 pt-3 flex items-center justify-between">
        <MilestoneBar milestone={project.milestone} />
        <div className="flex items-center gap-1.5">
          {project.openNCR > 0 && (
            <span className="text-xs bg-red-900 text-red-300 border border-red-700 px-2 py-0.5 rounded-full">
              {project.openNCR} NCR
            </span>
          )}
          <span className="text-xs text-gray-500">{project.team}</span>
        </div>
      </div>
    </div>
  )
}

export default function ProjectList() {
  const navigate = useNavigate()

  const stats = {
    total: mockProjects.length,
    go: mockProjects.filter(p => p.decision === 'GO').length,
    constraints: mockProjects.filter(p => p.decision === 'GO_WITH_CONSTRAINTS').length,
    nogo: mockProjects.filter(p => p.decision === 'NO_GO').length,
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="border-b border-gray-800 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">O</span>
          </div>
          <span className="font-semibold text-white text-lg">OrbisV</span>
          <span className="text-gray-500 text-sm">Decision-Oriented V&V Platform</span>
        </div>
        <span className="text-xs text-gray-500">IRIS-3 Demo — Hackathon PoC</span>
      </div>

      <div className="px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-white mb-1">Active Projects</h1>
          <p className="text-gray-400 text-sm">Optical payload systems — V&V status overview</p>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-1">Total Projects</p>
            <p className="text-2xl font-semibold text-white">{stats.total}</p>
          </div>
          <div className="bg-gray-800 border border-green-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-1">GO</p>
            <p className="text-2xl font-semibold text-green-400">{stats.go}</p>
          </div>
          <div className="bg-gray-800 border border-amber-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-1">GO with constraints</p>
            <p className="text-2xl font-semibold text-amber-400">{stats.constraints}</p>
          </div>
          <div className="bg-gray-800 border border-red-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-1">NO-GO</p>
            <p className="text-2xl font-semibold text-red-400">{stats.nogo}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5">
          {mockProjects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => navigate(`/project/${project.id}`)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}