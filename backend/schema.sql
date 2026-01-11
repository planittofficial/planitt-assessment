-- Core User Management
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('ADMIN', 'CANDIDATE')) DEFAULT 'CANDIDATE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Assessment Definitions
CREATE TABLE assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration_minutes INT NOT NULL,
    total_marks DECIMAL(10, 2),
    pass_percentage INT DEFAULT 40,
    is_active BOOLEAN DEFAULT true,
    code VARCHAR(10) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Questions (MCQ & Descriptive)
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(20) CHECK (question_type IN ('mcq', 'descriptive')) NOT NULL,
    options JSONB, -- Stores MCQ options: {"a": "...", "b": "..."}
    correct_answer TEXT, -- Choice key for MCQ, null for descriptive
    marks DECIMAL(5, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Assessment Attempts
CREATE TABLE attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    assessment_id UUID REFERENCES assessments(id),
    status VARCHAR(20) CHECK (status IN ('started', 'completed', 'terminated')) DEFAULT 'started',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP WITH TIME ZONE,
    auto_submitted BOOLEAN DEFAULT false,
    final_score DECIMAL(10, 2)
);

-- Candidate Answers
CREATE TABLE answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID REFERENCES attempts(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id),
    answer_text TEXT, -- Selected MCQ option or descriptive text
    marks_obtained DECIMAL(5, 2) DEFAULT 0,
    is_graded BOOLEAN DEFAULT false
);

-- Proctoring Violations
CREATE TABLE violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID REFERENCES attempts(id) ON DELETE CASCADE,
    violation_type VARCHAR(50) NOT NULL, -- 'tab_switch', 'face_not_detected', etc.
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    evidence_url TEXT -- Path to screenshot/log evidence
);

-- Indexing Strategy
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_questions_assessment_id ON questions(assessment_id);
CREATE INDEX idx_attempts_user_assessment ON attempts(user_id, assessment_id);
CREATE INDEX idx_violations_attempt_id ON violations(attempt_id);
CREATE INDEX idx_answers_attempt_id ON answers(attempt_id);
