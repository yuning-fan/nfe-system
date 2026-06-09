-- ==========================================
-- NFE 系统数据库全量初始化脚本 (V4.1)
-- 适用数据库: PostgreSQL / Supabase
-- 包含 37 张表 + 1 个视图
-- ==========================================

-- ------------------------------------------
-- 0. 枚举类型定义 (ENUMs)
-- ------------------------------------------
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'tutor', 'patrol', 'life', 'driver', 'student');
CREATE TYPE enrollment_status AS ENUM ('enrolled', 'graduated', 'withdrawn', 'suspended');
CREATE TYPE risk_level AS ENUM ('green', 'yellow', 'red');
CREATE TYPE doc_type AS ENUM ('passport', 'visa', 'insurance', 'offer_letter', 'transcript', 'guardianship');
CREATE TYPE doc_status AS ENUM ('valid', 'expiring_soon', 'expired');
CREATE TYPE room_status AS ENUM ('occupied', 'move_in_soon', 'move_out_soon', 'vacant', 'maintenance', 'unavailable');
CREATE TYPE transport_status AS ENUM ('pending', 'picked_up', 'no_show');
CREATE TYPE course_type AS ENUM ('one_on_one', 'group_class');
CREATE TYPE schedule_status AS ENUM ('scheduled', 'completed', 'rescheduling');
CREATE TYPE milestone_type AS ENUM ('exam', 'assignment', 'report_due');
CREATE TYPE score_type AS ENUM ('daily', 'midterm', 'final');
CREATE TYPE leave_type AS ENUM ('sick_leave', 'personal_leave', 'overnight_stay');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE warning_status AS ENUM ('pending_approval', 'issued', 'signed_onsite');
CREATE TYPE check_type AS ENUM ('morning', 'night_study', 'dorm_check');
CREATE TYPE check_status AS ENUM ('present', 'absent', 'leave');
CREATE TYPE contact_type AS ENUM ('student', 'parent', 'school', 'accommodation');
CREATE TYPE notification_type AS ENUM ('internal', 'external', 'system_auto');
CREATE TYPE send_channel AS ENUM ('in_app', 'wechat', 'email');
CREATE TYPE send_status AS ENUM ('pending', 'sent', 'failed');
CREATE TYPE report_type AS ENUM ('biweekly', 'monthly', 'semester');
CREATE TYPE report_status AS ENUM ('draft', 'reviewed', 'sent');
CREATE TYPE duty_type AS ENUM ('dorm_check', 'night_study', 'transport', 'patrol');
CREATE TYPE duty_shift AS ENUM ('morning', 'afternoon', 'evening');
CREATE TYPE trigger_type AS ENUM ('system_auto', 'manual_override');

-- V4.1 新增枚举
CREATE TYPE program_track AS ENUM ('accelerate', 'fast_track', 'standard', 'other');
CREATE TYPE subject_category AS ENUM ('core', 'elective');
CREATE TYPE subject_area AS ENUM ('english', 'science', 'commerce', 'arts', 'other');
CREATE TYPE difficulty_level AS ENUM ('foundation', 'standard', 'advanced');
CREATE TYPE program_status AS ENUM ('active', 'completed', 'withdrawn', 'suspended');
CREATE TYPE selection_status AS ENUM ('pending_confirm', 'confirmed', 'dropped');

-- ------------------------------------------
-- 1. 账号与基础信息体系
-- ------------------------------------------

CREATE TABLE profiles (
    id UUID PRIMARY KEY, -- 关联 auth.users.id
    role user_role NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(50),
    avatar_url TEXT,
    status SMALLINT DEFAULT 1, -- 1正常 0禁用
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE program_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT
);

CREATE TABLE programs (
    id SERIAL PRIMARY KEY,
    program_type_id INT REFERENCES program_types(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    track program_track NOT NULL,
    duration_months INT,
    is_active BOOLEAN DEFAULT true,
    description TEXT
);

CREATE TABLE program_subjects (
    id SERIAL PRIMARY KEY,
    program_id INT REFERENCES programs(id) ON DELETE CASCADE,
    subject_name VARCHAR(100) NOT NULL,
    subject_category subject_category NOT NULL,
    subject_area subject_area NOT NULL,
    difficulty_level difficulty_level NOT NULL,
    hours_per_week DECIMAL(5,2),
    sessions_per_week INT,
    max_students INT,
    description TEXT
);

CREATE TABLE student_enrollments (
    id SERIAL PRIMARY KEY,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    program_id INT REFERENCES programs(id) ON DELETE CASCADE,
    cohort_name VARCHAR(100),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status program_status DEFAULT 'active',
    enrolled_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE students_info (
    student_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    english_name VARCHAR(100),
    date_of_birth DATE,
    passport_number VARCHAR(100),
    school_name VARCHAR(150),
    source_school VARCHAR(150),
    english_level VARCHAR(50),
    target_university VARCHAR(150),
    scholarship_requirement TEXT,
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(50),
    health_notes TEXT,
    risk_level risk_level DEFAULT 'green',
    total_risk_score INT DEFAULT 100,
    enrollment_id INT REFERENCES student_enrollments(id) ON DELETE SET NULL
);

CREATE TABLE student_credentials (
    id SERIAL PRIMARY KEY,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    platform_name VARCHAR(100) NOT NULL,
    account VARCHAR(100) NOT NULL,
    encrypted_password TEXT NOT NULL
);

CREATE TABLE student_documents (
    id SERIAL PRIMARY KEY,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    doc_type doc_type NOT NULL,
    file_url TEXT NOT NULL,
    issue_date DATE,
    expiry_date DATE,
    status doc_status DEFAULT 'valid',
    uploaded_by UUID REFERENCES profiles(id)
);

CREATE TABLE student_subject_selections (
    id SERIAL PRIMARY KEY,
    enrollment_id INT REFERENCES student_enrollments(id) ON DELETE CASCADE,
    program_subject_id INT REFERENCES program_subjects(id) ON DELETE CASCADE,
    selection_type subject_category NOT NULL,
    status selection_status DEFAULT 'pending_confirm',
    confirmed_at TIMESTAMPTZ
);

CREATE TABLE school_timetable (
    id SERIAL PRIMARY KEY,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    enrollment_id INT REFERENCES student_enrollments(id) ON DELETE CASCADE,
    program_subject_id INT REFERENCES program_subjects(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room VARCHAR(100),
    effective_from DATE NOT NULL,
    effective_until DATE NOT NULL,
    is_confirmed BOOLEAN DEFAULT false,
    confirmed_at TIMESTAMPTZ,
    generated_by UUID REFERENCES profiles(id)
);

-- ------------------------------------------
-- 2. 住宿与接送体系
-- ------------------------------------------

CREATE TABLE dorms (
    id SERIAL PRIMARY KEY,
    building_name VARCHAR(100) NOT NULL,
    room_number VARCHAR(50) NOT NULL,
    capacity INT NOT NULL,
    room_status room_status DEFAULT 'vacant'
);

CREATE TABLE dorm_assignments (
    id SERIAL PRIMARY KEY,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    dorm_id INT REFERENCES dorms(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE transport_routes (
    id SERIAL PRIMARY KEY,
    driver_id UUID REFERENCES profiles(id),
    route_name VARCHAR(150) NOT NULL,
    execution_date DATE NOT NULL
);

CREATE TABLE transport_passengers (
    id SERIAL PRIMARY KEY,
    route_id INT REFERENCES transport_routes(id) ON DELETE CASCADE,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    pickup_time TIME NOT NULL,
    pickup_location VARCHAR(200),
    drop_off_location VARCHAR(200),
    status transport_status DEFAULT 'pending'
);

-- ------------------------------------------
-- 3. 课表与学术体系 (机构辅导)
-- ------------------------------------------

CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    type course_type NOT NULL
);

CREATE TABLE course_assets (
    id SERIAL PRIMARY KEY,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    course_id INT REFERENCES courses(id) ON DELETE CASCADE,
    total_hours DECIMAL(10,2) NOT NULL DEFAULT 0
);

CREATE TABLE schedules (
    id SERIAL PRIMARY KEY,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    tutor_id UUID REFERENCES profiles(id),
    course_id INT REFERENCES courses(id) ON DELETE CASCADE,
    program_subject_id INT REFERENCES program_subjects(id) ON DELETE SET NULL,
    subject_label VARCHAR(150),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status schedule_status DEFAULT 'scheduled',
    material_url TEXT,
    homework_content TEXT,
    feedback_public TEXT,
    feedback_internal TEXT
);

CREATE TABLE academic_milestones (
    id SERIAL PRIMARY KEY,
    course_id INT REFERENCES courses(id) ON DELETE CASCADE,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    milestone_type milestone_type NOT NULL,
    title VARCHAR(200) NOT NULL,
    due_date DATE NOT NULL,
    is_grade_recorded BOOLEAN DEFAULT false
);

CREATE TABLE grade_records (
    id SERIAL PRIMARY KEY,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    course_id INT REFERENCES courses(id) ON DELETE CASCADE,
    milestone_id INT REFERENCES academic_milestones(id) ON DELETE CASCADE,
    score DECIMAL(5,2),
    score_type score_type NOT NULL,
    recorded_by UUID REFERENCES profiles(id),
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------
-- 4. 审批流与协作纽带
-- ------------------------------------------

CREATE TABLE leave_applications (
    id SERIAL PRIMARY KEY,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    leave_type leave_type NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    reason TEXT,
    attachment_url TEXT,
    status approval_status DEFAULT 'pending',
    approver_id UUID REFERENCES profiles(id),
    approved_at TIMESTAMPTZ
);

CREATE TABLE schedule_changes (
    id SERIAL PRIMARY KEY,
    schedule_id INT REFERENCES schedules(id) ON DELETE CASCADE,
    requester_id UUID REFERENCES profiles(id),
    new_start_time TIMESTAMPTZ NOT NULL,
    reason TEXT,
    status approval_status DEFAULT 'pending',
    approver_id UUID REFERENCES profiles(id)
);

CREATE TABLE warning_letters (
    id SERIAL PRIMARY KEY,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    issuer_id UUID REFERENCES profiles(id),
    warning_level SMALLINT NOT NULL CHECK (warning_level IN (1, 2, 3)),
    evidence_content TEXT,
    status warning_status DEFAULT 'pending_approval',
    signed_at TIMESTAMPTZ
);

-- ------------------------------------------
-- 5. 巡查与日常打卡
-- ------------------------------------------

CREATE TABLE daily_checks (
    id SERIAL PRIMARY KEY,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES profiles(id),
    check_type check_type NOT NULL,
    status check_status NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE violation_logs (
    id SERIAL PRIMARY KEY,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    reporter_id UUID REFERENCES profiles(id),
    reason TEXT NOT NULL,
    deduction_points INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE warning_letter_violations (
    id SERIAL PRIMARY KEY,
    warning_letter_id INT REFERENCES warning_letters(id) ON DELETE CASCADE,
    violation_id INT REFERENCES violation_logs(id) ON DELETE CASCADE
);

CREATE TABLE medication_records (
    id SERIAL PRIMARY KEY,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    medication_name VARCHAR(150) NOT NULL,
    dosage VARCHAR(100),
    dispensed_by UUID REFERENCES profiles(id),
    dispensed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------
-- 6. 沟通与通知
-- ------------------------------------------

CREATE TABLE communication_logs (
    id SERIAL PRIMARY KEY,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES profiles(id),
    contact_type contact_type NOT NULL,
    content TEXT NOT NULL,
    attachment_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    notification_type notification_type NOT NULL,
    sender_id UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notification_recipients (
    id SERIAL PRIMARY KEY,
    notification_id INT REFERENCES notifications(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT false
);

CREATE TABLE notification_send_logs (
    id SERIAL PRIMARY KEY,
    notification_id INT REFERENCES notifications(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    channel send_channel NOT NULL,
    send_status send_status DEFAULT 'pending',
    sent_at TIMESTAMPTZ,
    failure_reason TEXT
);

-- ------------------------------------------
-- 7. 报告与资料库
-- ------------------------------------------

CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    report_type report_type NOT NULL,
    generated_by UUID REFERENCES profiles(id),
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    reviewer_id UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMPTZ,
    pdf_url TEXT,
    status report_status DEFAULT 'draft',
    sent_at TIMESTAMPTZ
);

CREATE TABLE resources (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    subject VARCHAR(100),
    uploader_id UUID REFERENCES profiles(id),
    is_student_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE resource_student_links (
    id SERIAL PRIMARY KEY,
    resource_id INT REFERENCES resources(id) ON DELETE CASCADE,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE
);

-- ------------------------------------------
-- 8. 合规流水账与系统审计
-- ------------------------------------------

CREATE TABLE log_hour_changes (
    id SERIAL PRIMARY KEY,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    course_id INT REFERENCES courses(id) ON DELETE CASCADE,
    change_amount DECIMAL(10,2) NOT NULL,
    trigger_source TEXT,
    operator_id UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE log_risk_changes (
    id SERIAL PRIMARY KEY,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    old_level risk_level NOT NULL,
    new_level risk_level NOT NULL,
    trigger_type trigger_type NOT NULL,
    operator_id UUID REFERENCES profiles(id),
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE log_audit_operations (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    action VARCHAR(100) NOT NULL,
    target_table VARCHAR(100) NOT NULL,
    target_id TEXT NOT NULL,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE staff_duty_schedules (
    id SERIAL PRIMARY KEY,
    staff_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    duty_type duty_type NOT NULL,
    duty_date DATE NOT NULL,
    shift duty_shift NOT NULL,
    route_id INT REFERENCES transport_routes(id) ON DELETE SET NULL,
    notes TEXT
);

-- ------------------------------------------
-- 9. 核心实时视图 (Views)
-- ------------------------------------------

-- 课时余额实时计算视图
CREATE VIEW v_course_remaining AS
SELECT
  ca.id AS course_asset_id,
  ca.student_id,
  ca.course_id,
  ca.total_hours,
  ca.total_hours + COALESCE(SUM(lhc.change_amount), 0) AS remaining_hours
FROM course_assets ca
LEFT JOIN log_hour_changes lhc
  ON lhc.student_id = ca.student_id
  AND lhc.course_id = ca.course_id
GROUP BY ca.id, ca.student_id, ca.course_id, ca.total_hours;

-- ==========================================
-- END OF SCRIPT
-- ==========================================
