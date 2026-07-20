export type UserRole = 'admin' | 'manager' | 'tutor' | 'patrol' | 'life' | 'driver' | 'student';
export type ProgramStatus = 'active' | 'completed' | 'withdrawn' | 'suspended';
export type RiskLevel = 'green' | 'yellow' | 'red';
export type ProgramTrack = 'accelerate' | 'fast_track' | 'standard' | 'other';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  status: number | null;
  created_at: string;
}

export interface Program {
  id: number;
  program_type_id: number;
  name: string;
  track: ProgramTrack;
  duration_months: number | null;
  is_active: boolean;
  description: string | null;
}

export interface StudentEnrollment {
  id: number;
  student_id: string;
  source: 'green_channel' | 'agent' | null;
  program_id: number;
  cohort_name: string | null;
  start_date: string;
  end_date: string;
  status: ProgramStatus;
  enrolled_by: string | null;
  created_at: string;
  programs?: Program; // For nested relations
}

export interface StudentInfo {
  student_id: string;
  english_name: string | null;
  gender: 'male' | 'female' | null;
  date_of_birth: string | null;
  passport_number: string | null;
  arrival_date: string | null;
  school_name: string | null;
  source_school: string | null;
  english_level: string | null;
  target_university: string | null;
  up_student_id: string | null;      // UP 预科学号（27 开头）
  uoa_student_id: string | null;     // 奥克兰大学学号（录取后取得）
  target_degree: string | null;      // 目标专业/学位
  offer_status: string | null;       // offer 情况
  scholarship_requirement: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_email: string | null;
  home_address: string | null;
  payment_note: string | null;
  health_notes: string | null;
  risk_level: RiskLevel;
  total_risk_score: number;
  enrollment_id: number | null;
  
  // Relations mapped by Supabase query
  profiles?: Profile;
  student_enrollments?: StudentEnrollment | StudentEnrollment[];
  dorm_assignments?: any[];
  warning_letters?: any[];
  school_timetable?: any[];
  student_documents?: any[];
  course_assets?: any[];
  student_credentials?: any[];

  // Computed fields added in store (list view)
  visa_expiry?: string | null;
  available_hours?: number | null;
}

