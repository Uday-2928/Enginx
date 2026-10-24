-- ========================================================
-- EnginX: Database Schema (PostgreSQL / Supabase)
-- "Master the hands-on skills that power tomorrow's technology"
-- ========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_id VARCHAR(255) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    primary_role VARCHAR(50) DEFAULT 'CSE', -- CSE, ECE, AI, CYBER, ROBOTICS, HARDWARE
    xp INTEGER DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CHALLENGES TABLE
CREATE TABLE IF NOT EXISTS challenges (
    id VARCHAR(100) PRIMARY KEY, -- e.g., 'cse-01-two-sum', 'ece-01-verilog-adder'
    slug VARCHAR(120) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    discipline VARCHAR(50) NOT NULL, -- 'cse', 'ece-verilog', 'ece-embedded', 'ai-ml', 'cybersecurity', 'robotics', 'hardware'
    difficulty VARCHAR(20) NOT NULL, -- 'Easy', 'Medium', 'Hard'
    topic VARCHAR(100) NOT NULL,     -- 'Digital Logic', 'Microcontrollers', 'Neural Networks', etc.
    description TEXT NOT NULL,       -- Markdown supported
    starter_code TEXT NOT NULL,
    language VARCHAR(50) NOT NULL,   -- 'verilog', 'c', 'python', 'javascript'
    test_cases JSONB NOT NULL,       -- Array of {input, expected, description, hidden: bool}
    solution_hints TEXT[] DEFAULT '{}',
    time_limit_ms INTEGER DEFAULT 2000,
    memory_limit_mb INTEGER DEFAULT 128,
    tags TEXT[] DEFAULT '{}',
    xp_reward INTEGER DEFAULT 50,
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    challenge_id VARCHAR(100) REFERENCES challenges(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    language VARCHAR(50) NOT NULL,
    verdict VARCHAR(20) NOT NULL, -- 'AC' (Accepted), 'WA' (Wrong Answer), 'TLE' (Time Limit), 'CE' (Compilation Error), 'RE' (Runtime Error)
    execution_time_ms NUMERIC(10, 2),
    memory_used_kb NUMERIC(10, 2),
    output TEXT,
    test_results JSONB, -- Array of {passed: bool, input, expected, actual, message}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. USER PROGRESS TABLE
CREATE TABLE IF NOT EXISTS user_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    challenge_id VARCHAR(100) REFERENCES challenges(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT FALSE,
    attempts_count INTEGER DEFAULT 1,
    best_execution_time_ms NUMERIC(10, 2),
    xp_awarded INTEGER DEFAULT 0,
    first_completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, challenge_id)
);

-- 5. BADGES TABLE
CREATE TABLE IF NOT EXISTS badges (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(100) NOT NULL, -- icon key, e.g., 'Cpu', 'Zap', 'ShieldCheck'
    discipline VARCHAR(50) NOT NULL,
    criteria JSONB NOT NULL, -- e.g. {"challenges_completed": 5, "discipline": "ece-verilog"}
    xp_bonus INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. USER BADGES TABLE
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    badge_id VARCHAR(100) REFERENCES badges(id) ON DELETE CASCADE,
    awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, badge_id)
);

-- 7. COMMUNITY SHOWCASE / FEED POSTS
CREATE TABLE IF NOT EXISTS community_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    challenge_id VARCHAR(100) REFERENCES challenges(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content_markdown TEXT NOT NULL,
    code_snippet TEXT,
    upvotes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. VIRTUAL HARDWARE PROJECTS
-- Persisted circuit/source state only; renderer/runtime objects are not stored.
CREATE TABLE IF NOT EXISTS virtual_hardware_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    board_profile VARCHAR(100) NOT NULL,
    project_version INTEGER NOT NULL DEFAULT 1,
    payload JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================================
-- INDEXES & PERFORMANCE
-- ========================================================
CREATE INDEX IF NOT EXISTS idx_challenges_discipline ON challenges(discipline);
CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_challenge ON submissions(challenge_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_challenge ON user_progress(challenge_id);
CREATE INDEX IF NOT EXISTS idx_virtual_hardware_projects_owner ON virtual_hardware_projects(owner_id);

-- ========================================================
-- LEADERBOARD VIEW
-- ========================================================
CREATE OR REPLACE VIEW leaderboard AS
SELECT
    u.id AS user_id,
    u.name,
    u.avatar_url,
    u.primary_role,
    u.xp,
    u.streak_days,
    COUNT(DISTINCT up.challenge_id) FILTER (WHERE up.completed = true) AS completed_challenges,
    COUNT(DISTINCT ub.badge_id) AS badges_count,
    RANK() OVER (ORDER BY u.xp DESC) AS rank
FROM users u
LEFT JOIN user_progress up ON u.id = up.user_id
LEFT JOIN user_badges ub ON u.id = ub.user_id
GROUP BY u.id, u.name, u.avatar_url, u.primary_role, u.xp, u.streak_days;

-- ========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE virtual_hardware_projects ENABLE ROW LEVEL SECURITY;

-- Public read for challenges & badges
CREATE POLICY "Public read for challenges" ON challenges FOR SELECT USING (true);
CREATE POLICY "Public read for badges" ON badges FOR SELECT USING (true);
CREATE POLICY "Public read for community posts" ON community_posts FOR SELECT USING (true);
CREATE POLICY "Owners manage virtual hardware projects" ON virtual_hardware_projects
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

-- User-specific policies
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid()::text = clerk_id OR auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = clerk_id OR auth.uid() = id);
CREATE POLICY "Users can view own submissions" ON submissions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own submissions" ON submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own progress" ON user_progress FOR SELECT USING (auth.uid() = user_id);
