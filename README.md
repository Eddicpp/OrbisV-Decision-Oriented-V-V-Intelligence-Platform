# OrbisV — Decision-Oriented V&V Intelligence Platform

> *"From simulation noise to GO/NO-GO confidence"*

OrbisV is a proof-of-concept platform designed to solve a structural problem in space system engineering: the disconnection between user needs, technical requirements, simulation results, and verification & validation evidence at critical decision milestones (PDR, CDR, Launch).

Built for optical Earth Observation payload development, OrbisV centralizes heterogeneous data from engineering tools into a unified project state — enabling engineers and program managers to make informed GO/NO-GO decisions backed by traceable evidence.

---

## The Problem

In space programs with development cycles of 5–15 years:

- User needs get lost in translation to technical requirements
- V&V data lives in disconnected silos (DOORS, MATLAB, STK, Cameo)
- At CDR, the Chief Engineer knows if documents were delivered — not if the system is actually ready
- Any requirement change forces manual re-analysis across all dependent evidence
- SMEs in the space supply chain cannot afford enterprise MBSE toolchains

---

## The Solution

OrbisV provides:

- **Unified digital thread** — user needs → requirements → V&V evidence in one place
- **3D payload viewer** — subsystems colored by compliance status in real-time
- **GO/NO-GO decision support** — explicit readiness assessment with confidence score
- **AI-powered impact analysis** — local LLM identifies cascading problems from any change request
- **User satisfaction scoring** — measures how well the current system satisfies original operational needs
- **ECSS validation checklist** — per-subsystem activities mapped to real standards with direct PDF links

---

## Architecture

```
orbisv/
├── orbisv-frontend/          # React + Vite + Three.js + Tailwind
│   └── src/
│       ├── pages/
│       │   ├── ProjectList.jsx       # Homepage — active projects overview
│       │   └── ProjectDetail.jsx     # Project detail — all tabs
│       ├── components/
│       │   ├── PayloadViewer3D.jsx   # Three.js 3D payload model
│       │   ├── ECSSPanel.jsx         # ECSS validation checklist
│       │   ├── UserSatisfactionPanel.jsx  # User needs satisfaction scoring
│       │   └── BranchView.jsx        # Split view — main vs branch
│       └── data/
│           ├── mockProjects.js       # Project list mock data
│           ├── mockIRIS3.js          # IRIS-3 full project data
│           ├── mockECSS.js           # ECSS standards and checklists
│           └── mockUserRequests.js   # User operational requirements
│
└── orbisv-backend/           # Python + FastAPI + Ollama + ReportLab
    ├── mock_data/
    │   └── generate_pdf.py   # Generates structured project PDF
    ├── projects/
    │   └── IRIS-3/
    │       ├── main/         # Current project state
    │       └── branches/     # Change request branches
    ├── ollama_engine.py      # LLM interface — cascade analysis
    ├── branch_builder.py     # Branch creation and diff computation
    └── api.py                # FastAPI REST endpoints
```

---

## Demo System

The demo runs on a fictional optical EO payload: **IRIS-3**

- Customer: ESA
- Domain: Optical Earth Observation
- Milestone: CDR
- 7 User Needs → 14 System Requirements (L1) → V&V Evidence
- 4 pre-configured scenarios switchable in 1 click:
  - **Nominal** — system 87% compliant → GO
  - **Thermal Issue** — critical thermal NCR open → NO-GO
  - **CDR Ready** — 3 open constraints → GO with constraints
  - **Launch Ready** — pre-launch state → GO

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS |
| 3D Viewer | Three.js r128 |
| Charts | Recharts |
| Routing | React Router v6 |
| Backend | FastAPI, Uvicorn |
| LLM | Ollama — qwen2.5:14b (local, offline) |
| PDF Generation | ReportLab |
| PDF Reading | pypdf |
| HTTP Client | httpx |

---

## Requirements

- Node.js >= 18
- Python >= 3.10
- Ollama installed with `qwen2.5:14b` model
- GPU recommended for LLM inference (tested on RTX 3060 12GB)

---

## Setup & Run

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/orbisv.git
cd orbisv
```

### 2. Install backend dependencies

```bash
cd orbisv-backend
pip install fastapi uvicorn httpx pypdf reportlab python-multipart
```

### 3. Generate the project PDF

```bash
python mock_data/generate_pdf.py
```

This creates `projects/IRIS-3/main/IRIS3_main.pdf` — the single source of truth for the demo.

### 4. Install frontend dependencies

```bash
cd ../orbisv-frontend
npm install
```

### 5. Start all services

Open 3 separate terminals:

**Terminal 1 — Ollama (skip if already running):**
```bash
ollama serve
```

**Terminal 2 — Backend:**
```bash
cd orbisv-backend
uvicorn api:app --reload --port 8000
```

**Terminal 3 — Frontend:**
```bash
cd orbisv-frontend
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/api/project/{id}/pdf` | Download project PDF |
| POST | `/api/project/{id}/analyze` | Submit change request → create branch |
| GET | `/api/project/{id}/branches` | List all branches |
| GET | `/api/project/{id}/branch/{branch_id}` | Get branch data |
| GET | `/api/project/{id}/branch/{branch_id}/pdf` | Download branch PDF |
| POST | `/api/project/{id}/branch/{branch_id}/merge` | Merge branch into main |

---

## Key Features

### Digital Thread Traceability
Navigate the full chain from user operational needs down to V&V test evidence. Gaps in traceability are explicitly flagged — no hidden assumptions.

### 3D Payload Viewer
Procedural Three.js model of the IRIS-3 payload. Each subsystem is colored by its V&V compliance status. Hover to inspect details. When a change request modifies geometry, the 3D model updates to reflect the actual structural change.

### GO/NO-GO Decision Support
Explicit readiness decision with confidence score and per-domain breakdown. Switch between 4 pre-configured scenarios to demonstrate how the platform reacts to different system states.

### AI-Powered Impact Analysis (Ollama)
Submit any change request in natural language. The local LLM reads the full project PDF as context and returns:
- Cascade issues with severity (critical / major / minor)
- Affected requirements and invalidated evidence
- Missing ECSS tests now required
- Updated GO/NO-GO assessment
- Geometry changes reflected on the 3D model

All inference runs locally — no internet connection required for the demo.

### User Satisfaction Scoring
Measures how well the current system satisfies each original user operational need using a three-factor model:
- **Coverage** (30%) — percentage of linked requirements with V&V evidence
- **Compliance** (50%) — average compliance score of linked requirements
- **Criticality** (20%) — all critical requirements above threshold

In branch view, shows main vs branch score side by side for each user need.

### ECSS Checklist
Per-subsystem validation activities mapped to real ECSS standards with exact clause references and direct links to official PDFs on ecss.nl.

---

## Design Principles

- **Offline-capable** — LLM runs locally via Ollama, no cloud dependencies
- **PDF as source of truth** — all dashboard data derived from structured project PDF
- **Branch model** — changes never overwrite the main project state
- **SME-accessible** — imports from CSV/Excel, no MBSE toolchain required
- **ECSS-aligned** — validation activities referenced to real standards

---

## Evaluation Criteria Mapping

| Jury Criterion | OrbisV Feature |
|---|---|
| System-Level Integration | PDF aggregates all tool outputs; unified dashboard |
| Traceability & Consistency | User need → requirement → evidence chain; gap detection |
| Decision Support Capability | GO/NO-GO with confidence score and blocking issues |
| Technical Feasibility | Full working PoC, offline, 3 services |
| User-Centricity | User satisfaction scoring; dual technical/manager view |
| Innovation | Local LLM cascade analysis + geometry propagation on 3D model |

---

## Built at

Space Economy Hackathon — 24h challenge
*"Decision-Oriented V&V for Optical Payload Systems"*
