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
  status: number;
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
  date_of_birth: string | null;
  passport_number: string | null;
  school_name: string | null;
  source_school: string | null;
  english_level: string | null;
  target_university: string | null;
  scholarship_requirement: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
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
}

// Database schema definition for Supabase client
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
      };
      students_info: {
        Row: StudentInfo;
      };
      programs: {
        Row: Program;
      };
      student_enrollments: {
        Row: StudentEnrollment;
      };
    };
  };
}
