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
  1. **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS with the EnginX Electric Blue (`#0066FF`), Circuit Green (`#2ECC71`), and Neon Purple (`#A901DB`) design system.
  2. **Backend API:** FastAPI (Python 3.11) with SQLAlchemy ORM, Pydantic schemas, and Supabase / PostgreSQL schema support.
  3. **Evaluation Sandbox:** Dedicated Docker microservice supporting isolated execution of Verilog (`iverilog`), C (`gcc`), Python, and CTF solvers.
* **Gamification & Learning Progress:**
  * Interactive **Skill Tree** with breadboard node connectors.
  * Automated **Circuit Badges** ("Verilog Virtuoso", "First Pulse", "Silicon Hacker").
  * Global and discipline-specific **Leaderboards**.

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
│   │   │   ├── editor/CodeEditor.tsx
│   │   │   ├── dashboard/SkillTree.tsx
│   │   │   ├── dashboard/BadgeCollection.tsx
│   │   │   ├── dashboard/Leaderboard.tsx
│   │   │   └── onboarding/OnboardingModal.tsx
│   │   ├── data/challenges.ts   # Starter challenge curriculum (All 6 disciplines)
│   │   ├── data/badges.ts       # Achievement badges
│   │   ├── services/api.ts      # REST API & client evaluation fallback
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
│   │   └── hardware_runner.py   # Kinematics & numerical evaluator
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
npm install
npm run dev
```

---

## 🧪 Testing Evaluation Runners

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
* **Primary:** Electric Blue `#0066FF`
* **Secondary:** Circuit Green `#2ECC71`
* **Accent:** Neon Purple `#A901DB`
* **Neutral Dark:** Deep Charcoal `#2C3E50` & Silicon Dark `#0B0F17`
* **UI Typography:** Inter
* **Code Typography:** Fira Code

---

## 📄 License
MIT License. Built for modern engineers who want to master real-world systems.
