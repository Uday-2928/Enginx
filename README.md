# EnginX Platform ⚡

> **“Master the hands-on skills that power tomorrow’s technology”**  
> A multi-discipline, production-ready engineering learning platform spanning **Computer Science, Electrical & Computer Engineering (Verilog HDL & Embedded C), AI/ML, Cybersecurity, Robotics, and Hardware logic**.

---

## 🚀 Key Highlights & Architecture

* **Multi-Discipline Engineering Focus:**
  * 💻 **Computer Science (CSE):** Data structures, hash maps, binary search, Big-O optimizations.
  * ⚡ **ECE (Verilog HDL):** Synthesizable digital logic, 4-bit ripple-carry adders, sequential D flip-flops, testbenches.
  * 🔌 **ECE (Embedded C):** Microcontroller bare-metal register manipulation, GPIO bitwise operations.
  * 🧠 **Artificial Intelligence & ML:** Forward propagation, perceptrons, Sigmoid activations.
  * 🛡️ **Cybersecurity & CTF:** XOR key recovery, cryptographic challenges, exploit payloads.
  * 🤖 **Robotics:** 2-DOF planar manipulator forward kinematics, joint coordinate transforms.
  * 🎛️ **General Hardware:** 2-to-1 Multiplexers (MUX), truth tables, digital gates.
* **Three-Tier Microservices Architecture:**
   1. **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS with a light, modern EnginX design system built around Teal (`#0D9488`), Mint (`#2DD4BF`), Amber (`#D97706`), and a pale Teal canvas (`#F0FDFA`).
  2. **Backend API:** FastAPI (Python 3.11) with SQLAlchemy ORM, Pydantic schemas, and Supabase / PostgreSQL schema support.
   3. **Evaluation Sandbox:** Dedicated Docker microservice supporting isolated execution of Verilog (`iverilog`), C (`gcc`), Python, CTF solvers and GNU Octave MATLAB-compatible scripts.
* **Gamification & Learning Progress:**
  * Interactive **Skill Tree** with breadboard node connectors.
  * Automated **Circuit Badges** ("Verilog Virtuoso", "First Pulse", "Silicon Hacker").
   * Global and discipline-specific **Leaderboards**.
 * **Virtual Hardware Lab:** A React Three Fiber workbench with board-specific profiles for Arduino Uno R3, ESP32 DevKit V1, Raspberry Pi 4 Model B and Raspberry Pi Pico. The circuit graph is shared by 3D interaction, the accessible 2D fallback, validation, constrained firmware execution and authenticated project persistence.

---

## 📁 Repository Structure

```
enginx/
├── docker-compose.yml           # Multi-container orchestration (Frontend, Backend, Evaluator)
├── .env.example                 # Environment variable templates
├── package.json                 # Root script runner
│
├── frontend/                    # React 18 + Vite + TypeScript Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/Header.tsx
│   │   │   ├── challenges/ChallengeList.tsx
│   │   │   ├── challenges/ChallengeDetails.tsx
│   │   │   ├── editor/CodeEditor.tsx # Challenge shell, test cases, results and history
│   │   │   ├── editor/ProfessionalCodeEditor.tsx # Monaco workspace and editor controls
│   │   │   ├── editor/monacoLanguage.ts # C/Verilog/SystemVerilog grammars and themes
│   │   │   ├── dashboard/SkillTree.tsx
│   │   │   ├── dashboard/BadgeCollection.tsx
│   │   │   ├── dashboard/Leaderboard.tsx
│   │   │   ├── ece/VirtualHardwareLab.tsx # Circuit graph, 3D/fallback workbench and persistence UI
│   │   │   ├── ece/VirtualHardwareScene.tsx # React Three Fiber scene and interactions
│   │   │   ├── ece/SignalSystemsLab.tsx # Browser model plus GNU Octave execution
│   │   │   └── onboarding/OnboardingModal.tsx
│   │   ├── data/challenges.ts   # Starter challenge curriculum (All 6 disciplines)
│   │   ├── data/badges.ts       # Achievement badges
│   │   ├── services/api.ts      # Authenticated REST API client
│   │   ├── types/index.ts       # Shared TypeScript interfaces
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── Dockerfile
│   ├── tailwind.config.ts
│   └── package.json
│
├── backend/                     # FastAPI Backend REST Service
│   ├── routers/
│   │   ├── auth.py              # User onboarding & profile management
│   │   ├── challenges.py        # Challenge listings & details
│   │   ├── submissions.py       # Submission handling & sandbox proxy
│   │   ├── virtual_hardware.py  # Authenticated project CRUD and ownership checks
│   │   ├── evaluation.py        # Authenticated GNU Octave script proxy
│   │   ├── progress.py          # Skill tree & user stats
│   │   ├── badges.py            # Achievement verification
│   │   └── leaderboard.py       # Ranking & leaderboard metrics
│   ├── config.py                # Pydantic BaseSettings
│   ├── database.py              # SQLAlchemy engine & session factory
│   ├── models.py                # ORM & Pydantic models
│   ├── seed_data.py             # Automatic challenge & badge seeder
│   ├── main.py                  # FastAPI application entrypoint
│   ├── requirements.txt
│   └── Dockerfile
│
├── evaluation/                  # Isolated Code Evaluation Microservice
│   ├── runners/
│   │   ├── base_runner.py       # Abstract base runner & result types
│   │   ├── verilog_runner.py    # Icarus Verilog compiler & behavioral simulator
│   │   ├── c_runner.py          # GCC compiler & embedded C runner
│   │   ├── python_runner.py     # Python 3 testcase runner
│   │   ├── ctf_runner.py        # CTF payload & flag validator
│   │   ├── hardware_runner.py   # Kinematics & numerical evaluator
│   │   └── matlab_runner.py     # GNU Octave test/script runner and artifacts
│   ├── evaluator.py             # FastAPI microservice on port 8001
│   ├── test_evaluator.py        # Unit test suite for all runners
│   ├── requirements.txt
│   └── Dockerfile
│
└── supabase/
    └── schema.sql               # PostgreSQL DDL schema with RLS policies & views
```

---

## 🛠️ Quick Start (Docker Compose)

The easiest way to launch the complete EnginX platform is using Docker Compose:

```bash
# 1. Clone or navigate to the repository
cd enginx

# 2. Copy environment settings
cp .env.example .env

# 3. Spin up all three services (Frontend, Backend, Evaluation Sandbox)
docker compose up --build
```

Access the services:
* 🌐 **EnginX Web Application:** [http://localhost:5173](http://localhost:5173)
* 📡 **FastAPI Backend Documentation:** [http://localhost:8000/docs](http://localhost:8000/docs)
* ⚙️ **Evaluation Sandbox API:** [http://localhost:8001/docs](http://localhost:8001/docs)

The evaluator exposes `POST /api/evaluate/script` for direct MATLAB-compatible
script execution. The authenticated application path is
`POST /api/evaluation/matlab/script`; it forwards source to GNU Octave and
returns runtime status, stdout/stderr, duration and validated plot artifacts.
The service never labels GNU Octave output as proprietary MATLAB execution.

---

## 💻 Local Development (Without Docker)

You can also run each component locally:

### 1. Evaluation Sandbox Service
```bash
cd evaluation
pip install -r requirements.txt
python test_evaluator.py        # Run unit tests
uvicorn evaluator:app --reload --port 8001
```

### 2. Backend API
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
*(The backend automatically creates SQLite database tables and seeds challenges on startup!)*

### 3. Frontend App
```bash
cd frontend
npm ci
npm run dev
```

The frontend uses same-origin `/api` requests by default. Vite forwards them
to `http://127.0.0.1:8000`, including when its port changes from 5173 to 5174.
Start the backend separately with `npm run dev:backend` from the repository
root. A working frontend does not mean the backend is running.

If the backend runs elsewhere, set `API_PROXY_TARGET` in `frontend/.env.local`
and restart Vite. This is a server-side proxy target, not a browser URL.
Docker Compose uses `http://backend:8000` for this target. An explicit
`VITE_API_URL` still overrides same-origin requests; that API must allow the
frontend's exact origin through CORS. Avoid setting it to `localhost` when
accessing the frontend from another device. A static production host must
reverse-proxy `/api` to the backend, or set `VITE_API_URL` when building.

The application shell is intentionally light-themed and responsive across mobile, tablet, and desktop layouts. The challenge workspace uses a separately themed professional code editor with both dark and light token palettes.

### Virtual Hardware Lab runtime boundary

The lab's circuit topology is persisted independently of its renderer. In a
WebGL-capable browser, boards, breadboard holes, component meshes, pin hotspots,
jumpers and selection highlights render in React Three Fiber with orbit, pan,
zoom, reset-camera, drag, rotate, delete and tap-to-wire interactions. When
WebGL/`ResizeObserver` is unavailable or the renderer throws, an accessible
2D fallback preserves the same graph editing controls.

The first supported firmware adapter is a deliberately restricted educational
Arduino-style interpreter. It supports `setup()`/`loop()`, typed scalar
declarations, assignments, `pinMode`, `digitalWrite`, `analogWrite`, bounded
`for` loops, `if/else`, `delay`, serial print and basic servo writes. It is not
an AVR/ESP32/Pico compiler and does not provide physical hardware or VR access.
The guided LED result is based on the validated graph's actual wired output
pin and the executed output state; opening a project does not illuminate it.

Signed-in project endpoints are:

* `POST /api/virtual-hardware/projects`
* `GET /api/virtual-hardware/projects`
* `GET/PATCH/DELETE /api/virtual-hardware/projects/{id}`
* `POST /api/virtual-hardware/projects/{id}/duplicate`

Ownership is derived from the bearer token, not a request-body user id. If the
backend is unavailable, the UI explicitly labels localStorage as the fallback
instead of claiming the project was synced to the server.

### Authentication and learning profile integration

The application now uses first-party bearer-token authentication. Create an
account with `POST /api/auth/signup` or sign in with
`POST /api/auth/login`; both return `{ access_token, token_type, user }`.
Authenticated frontend requests send `Authorization: Bearer <access_token>` and
the API derives the learner from that token rather than from a client-supplied
email or user id. The browser stores the session under the namespaced
`enginx.auth.session` key and the Sign out control clears it.

The seeded `student@enginx.dev` row is retained only as legacy data for existing
SQLite databases. Because it has no password hash, it cannot authenticate; new
users must sign up or an administrator must provide a separate account migration
path. Set a strong `JWT_SECRET` in production.

The frontend loads the authenticated profile, progress, stats, badges,
leaderboard, roadmap, completed lesson ids and challenge attempt history from
the FastAPI service. Profile changes use `PATCH /api/user/profile`, onboarding
uses authenticated `POST /api/auth/onboarding`, submissions use authenticated
`POST /api/submissions`, and the editor reads recent attempts through
`GET /api/submissions/history?challenge_id=<id>`. Attempt history is scoped to
the bearer-authenticated learner and omits submitted source code. An evaluator
outage is shown as `UNAVAILABLE`, remains retryable, and never awards
frontend-only XP or badges.

### ECE Engineering Hub

The authenticated ECE experience is available from the **ECE Hub** navigation
item. It uses shared data-driven records for VLSI, embedded systems, digital
electronics, Verilog, verification, signals, DSP, communications, control,
instrumentation, PCB and supporting domains. The hub includes dependency-aware
roadmaps, backend-confirmed progress, linked C/Verilog challenges, unit-aware
learning calculators, project/lab briefs, official documentation links and an
ECE preference editor. Preferences are stored in the existing user profile as
validated `ece_preferences` JSON; existing SQLite databases receive the new
nullable column additively at startup.

The current evaluator can execute the repository's supported C and Verilog
challenge flow when its service and toolchain are available. Waveform viewing,
SPICE/RF simulation, PCB DRC, FPGA programming, physical-board flashing,
contests, community discussion and administrator content management are not
claimed as live integrations in this release. The hub labels those boundaries
and provides calculation, guided or software-only alternatives instead.

The roadmap workspace also includes a first complete content slice for the
VLSI and embedded paths. Verilog lessons cover truth tables, module interfaces,
combinational RTL, sequential reset design, self-checking testbenches, FSMs and
UART/FIFO project planning. Embedded lessons cover fixed-width C, bit masks,
memory-mapped I/O, GPIO, timer/interrupt reasoning, UART/SPI/I2C design and an
RTOS producer-consumer project. Each lesson includes objectives, a worked
example, an exercise, hints, a solution approach and a checkpoint. Completion
uses the existing authenticated lesson-completion endpoint under IDs such as
`lesson-content-verilog-digital-logic`; it is not inferred from opening a
lesson.

The **Hardware fundamentals** roadmap is the shared starting point for both
tracks. It covers safe low-voltage electrical vocabulary, digital thresholds,
binary representation, the Verilog-versus-Embedded-C boundary, individual NOT,
AND and OR lessons, NAND/NOR/XOR/XNOR, and a half-adder exercise. The **Logic
gate playground** is a real two-state circuit model rather than a decorative
diagram: learners can toggle inputs, select starter circuits, add and connect
supported gates, move/delete nodes, generate truth tables, save/load a browser
workspace and export the modeled structure as Verilog. It deliberately does
not claim voltage, timing, noise, X/Z, SPICE or physical-board simulation.

The initial ECE challenge set includes evaluated NOT, AND, OR and half-adder
records (`ece-05-not-gate`, `ece-06-and-gate`, `ece-07-or-gate` and
`ece-04-half-adder`) linked from the ECE practice surface. When `iverilog`/`vvp` are
available, the evaluator generates a self-checking testbench that drives the
declared module inputs and compares declared outputs. When those tools are not
available, the repository's offline behavioral fallback only covers the small
documented two-state exercises and is not a substitute for a real HDL
simulation.

### Professional code editor

The challenge editor is backed by the locally bundled **Monaco Editor** (the same
editor engine used by VS Code), loaded as a separate browser chunk so the main
application does not initialize editor assets until the challenge workspace is
opened. `ProfessionalCodeEditor.tsx` is the single reusable editor surface for
Python, C/Embedded C, C++, Verilog and SystemVerilog challenges; the existing
run, submit, evaluator and authenticated submission-history APIs are unchanged.

The editor includes line numbers, bracket matching and auto-closing pairs,
folding, current-line highlighting, keyboard navigation, find/replace and
standard undo/redo behavior from Monaco. C tokenization distinguishes
keywords, fixed-width types such as `uint32_t`, functions, identifiers,
constants, preprocessor directives, strings, numbers, comments and operators.
Verilog/SystemVerilog use a separate Monarch grammar with module names,
ports/signals, procedural/structural keywords, sized literals, system tasks,
strings, comments and operators. A lightweight completion/hover provider uses
declared symbols and documented language keywords; this is grammar-assisted
editor support, not a configured C or HDL language server.

The toolbar supports dark/light themes, font size, tab size, word wrapping and
an optional minimap. Settings persist under `enginx.editor.settings`; unfinished
challenge drafts are stored per authenticated user and challenge so a remount
does not discard student work. Compiler diagnostics are only added as Monaco
markers when the evaluator returns a compiler verdict with a real line/column;
the editor never fabricates diagnostics. If the local Monaco chunk fails to
load, a clearly labeled recovery editor preserves editing and submission.

---

## 🧪 Testing Evaluation Runners

Run the complete project check from the repository root after dependencies are installed:

```bash
npm test
```

Run the backend API regression suite separately:
```bash
python backend/test_api.py
```

Run the frontend checks directly:
```bash
npm --prefix frontend run test -- --run
npm --prefix frontend run build
```

No Playwright configuration is committed in this repository; browser checks
should be added in a future phase if end-to-end automation is required.

This builds the frontend with the committed `frontend/package-lock.json` and then runs the evaluation sandbox unit tests.

Run the unit tests in the `evaluation` service:
```bash
cd evaluation
python test_evaluator.py
```
This tests:
* Python solution verification (`Two Sum` hash map)
* Verilog 4-bit adder simulation
* Embedded C GPIO toggle verification
* Cybersecurity CTF flag extraction
* Robotics planar forward kinematics

---

## 🎨 Branding & Colors
* **Primary:** Teal `#0D9488`
* **Secondary:** Mint `#2DD4BF`
* **Accent / CTA:** Amber `#D97706`
* **Canvas:** Pale Teal `#F0FDFA`
* **Surfaces:** White `#FFFFFF` with Slate ink `#0F172A`
* **UI Typography:** Inter
* **Code Typography:** JetBrains Mono / Fira Code

---

## 📄 License
MIT License. Built for modern engineers who want to master real-world systems.
