# OrbisV — Decision-Oriented V&V Intelligence Platform

<img width="1361" height="853" alt="Screenshot 2026-05-13 alle 08 56 38" src="https://github.com/user-attachments/assets/c54e109d-6598-4fb0-b736-f189cac981f1" />


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

## Architecture

```
orbisv/
├── orbisv-frontend/          # React + Vite + Three.js + Tailwind
│   └── src/
│       ├── pages/
│       │   ├── ProjectList.jsx
│       │   └── ProjectDetail.jsx
│       ├── components/
│       │   ├── PayloadViewer3D.jsx
│       │   ├── ECSSPanel.jsx
│       │   ├── UserSatisfactionPanel.jsx
│       │   ├── BranchView.jsx
│       │   ├── ManagerView.jsx
│       │   ├── TestTimeline.jsx
│       │   └── DatasheetPanel.jsx
│       └── data/
│           ├── mockProjects.js
│           ├── mockIRIS3.js
│           ├── mockECSS.js
│           ├── mockUserRequests.js
│           ├── mockManagerial.js
│           ├── mockDatasheets.js
│           └── readiness.js
│
└── orbisv-backend/
    ├── mock_data/
    │   └── generate_pdf.py
    ├── projects/
    │   └── IRIS-3/
    │       ├── main/
    │       └── branches/
    ├── ollama_engine.py
    ├── branch_builder.py
    └── api.py
```

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Inter font |
| 3D Viewer | Three.js r128 |
| Backend | FastAPI, Uvicorn |
| LLM | Ollama — qwen2.5:14b (local or remote via ngrok) |
| PDF Generation | ReportLab |
| PDF Reading | pypdf |

---

## Setup — Two Modes

### Mode A: Everything on one machine (standard)

**Requirements:** Node.js ≥ 18, Python ≥ 3.10, Ollama with qwen2.5:14b, GPU recommended

```bash
# 1. Clone
git clone https://github.com/Eddicpp/OrbisV-Decision-Oriented-V-V-Intelligence-Platform
cd OrbisV-Decision-Oriented-V-V-Intelligence-Platform

# 2. Backend
cd orbisv-backend
pip install fastapi uvicorn httpx pypdf reportlab python-multipart
python mock_data/generate_pdf.py
uvicorn api:app --reload --port 8000

# 3. Frontend (new terminal)
cd orbisv-frontend
npm install
npm run dev

# 4. Ollama (new terminal)
ollama serve
```

Open `http://localhost:5173`

---

### Mode B: Ollama on a remote/home PC via ngrok

Use this when presenting on a laptop but want to run the LLM on a more powerful machine at home.

#### On the home PC (stays on, runs the GPU):

```powershell
# Terminal 1 — start Ollama with external access
$env:OLLAMA_HOST = "0.0.0.0"
ollama serve

# Terminal 2 — expose with ngrok
cd path\to\ngrok
.\ngrok http 11434
```

Ngrok will show a forwarding URL like:
```
Forwarding  https://abc123.ngrok-free.app -> http://localhost:11434
```

Copy that URL.

#### Configure the backend to use the remote Ollama:

In `orbisv-backend/ollama_engine.py`, change line 8:

```python
# FROM (local):
OLLAMA_URL = "http://localhost:11434/api/generate"

# TO (remote):
OLLAMA_URL = "https://abc123.ngrok-free.app/api/generate"
```

#### On the presentation laptop:

```bash
# Clone and install as normal
git clone https://github.com/Eddicpp/OrbisV-Decision-Oriented-V-V-Intelligence-Platform
cd OrbisV-Decision-Oriented-V-V-Intelligence-Platform

cd orbisv-backend
pip install fastapi uvicorn httpx pypdf reportlab python-multipart
python mock_data/generate_pdf.py
uvicorn api:app --reload --port 8000

# new terminal
cd orbisv-frontend
npm install
npm run dev
```

No Ollama needed on the laptop — all LLM inference runs on the home PC.

---

## What runs where (Mode B)

| Service | Runs on |
|---|---|
| React frontend | Presentation laptop |
| FastAPI backend | Presentation laptop |
| Ollama + qwen2.5:14b | Home PC (RTX 3060) |
| ngrok tunnel | Home PC |

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

## Demo System — IRIS-3

Fictional optical EO payload with 4 pre-configured scenarios switchable in 1 click:

| Scenario | State | Decision |
|---|---|---|
| Nominal | System 87% compliant | GO |
| Thermal Issue | Critical thermal NCR open | NO-GO |
| CDR Ready | 3 open constraints | GO with constraints |
| Launch Ready | Pre-launch state | NO-GO (shock test missing) |

---

## Key Features

**Digital Thread Traceability** — User needs → requirements → V&V evidence in one place. Gaps explicitly flagged.

**Computed GO/NO-GO** — Readiness score calculated from real test completion, NCR count, and requirement coverage. Not hardcoded.

**3D Payload Viewer** — Procedural Three.js model. Subsystems colored by V&V compliance. Geometry changes reflected when a change request modifies dimensions.

**AI-Powered Impact Analysis** — Local LLM reads full project PDF as context. Returns cascade issues, affected requirements, missing ECSS tests, updated GO/NO-GO, managerial cost/schedule impact.

**Three diff views** — Technical / Manager / User Needs — each showing main vs branch side by side.

**Test Calendar** — Gantt timeline of all 27 test activities across subsystems, colored by status, with NCR blocking indicators.

**ECSS Checklist** — Per-subsystem validation activities mapped to real standards with direct PDF links to ecss.nl.

**Component Datasheets** — Real components (Teledyne H2RG, Sodern Hydra, Azur Space 3G30C, etc.) with public datasheet links.

---

## Built at

Space Economy Hackathon — 24h challenge
*"Decision-Oriented V&V for Optical Payload Systems"*

---

## License & Usage Restrictions

Copyright © 2026 Eduardo Pane. All rights reserved.

This repository and all its contents — including but not limited to source code, architecture, data models, and documentation — are the exclusive intellectual property of the author.

**No permission is granted to use, copy, modify, distribute, sublicense, or incorporate any part of this codebase into other projects, whether commercial or non-commercial, without explicit prior written authorization from the author.**

For licensing inquiries: eduardo.pane04@gmail.com
