export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      academic_milestones: {
        Row: {
          course_id: number | null
          due_date: string
          id: number
          is_grade_recorded: boolean | null
          is_major: boolean
          milestone_type: Database["public"]["Enums"]["milestone_type"]
          mode: string | null
          parent_id: number | null
          program_subject_id: number | null
          student_id: string | null
          term_no: number | null
          title: string
          week_no: number | null
          weight_percent: number | null
        }
        Insert: {
          course_id?: number | null
          due_date: string
          id?: number
          is_grade_recorded?: boolean | null
          is_major?: boolean
          milestone_type: Database["public"]["Enums"]["milestone_type"]
          mode?: string | null
          parent_id?: number | null
          program_subject_id?: number | null
          student_id?: string | null
          term_no?: number | null
          title: string
          week_no?: number | null
          weight_percent?: number | null
        }
        Update: {
          course_id?: number | null
          due_date?: string
          id?: number
          is_grade_recorded?: boolean | null
          is_major?: boolean
          milestone_type?: Database["public"]["Enums"]["milestone_type"]
          mode?: string | null
          parent_id?: number | null
          program_subject_id?: number | null
          student_id?: string | null
          term_no?: number | null
          title?: string
          week_no?: number | null
          weight_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_milestones_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_milestones_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "academic_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_milestones_program_subject_id_fkey"
            columns: ["program_subject_id"]
            isOneToOne: false
            referencedRelation: "program_subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_milestones_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_milestones_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
        ]
      }
      activities: {
        Row: {
          activity_date: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: number
          location: string | null
          photos: string[]
          title: string
        }
        Insert: {
          activity_date?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: number
          location?: string | null
          photos?: string[]
          title: string
        }
        Update: {
          activity_date?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: number
          location?: string | null
          photos?: string[]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
        ]
      }
      activity_participants: {
        Row: {
          activity_id: number
          added_by: string | null
          created_at: string | null
          id: number
          student_id: string
        }
        Insert: {
          activity_id: number
          added_by?: string | null
          created_at?: string | null
          id?: number
          student_id: string
        }
        Update: {
          activity_id?: number
          added_by?: string | null
          created_at?: string | null
          id?: number
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_participants_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_participants_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_participants_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "activity_participants_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_participants_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
        ]
      }
      apartment_guardians: {
        Row: {
          building_name: string
          guardian_staff_id: string | null
          id: number
          meal_mode: string
          updated_at: string | null
        }
        Insert: {
          building_name: string
          guardian_staff_id?: string | null
          id?: number
          meal_mode?: string
          updated_at?: string | null
        }
        Update: {
          building_name?: string
          guardian_staff_id?: string | null
          id?: number
          meal_mode?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apartment_guardians_guardian_staff_id_fkey"
            columns: ["guardian_staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apartment_guardians_guardian_staff_id_fkey"
            columns: ["guardian_staff_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
        ]
      }
      attendance_persuasions: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: number
          note: string | null
          rate: number | null
          student_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: number
          note?: string | null
          rate?: number | null
          student_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: number
          note?: string | null
          rate?: number | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_persuasions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_persuasions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          actor_role: string | null
          changed_fields: string[]
          created_at: string
          id: number
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          actor_role?: string | null
          changed_fields?: string[]
          created_at?: string
          id?: number
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          actor_role?: string | null
          changed_fields?: string[]
          created_at?: string
          id?: number
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
        ]
      }
      communication_logs: {
        Row: {
          attachment_url: string | null
          channel: string | null
          contact_type: Database["public"]["Enums"]["contact_type"]
          content: string
          created_at: string | null
          id: number
          staff_id: string | null
          student_id: string | null
        }
        Insert: {
          attachment_url?: string | null
          channel?: string | null
          contact_type: Database["public"]["Enums"]["contact_type"]
          content: string
          created_at?: string | null
          id?: number
          staff_id?: string | null
          student_id?: string | null
        }
        Update: {
          attachment_url?: string | null
          channel?: string | null
          contact_type?: Database["public"]["Enums"]["contact_type"]
          content?: string
          created_at?: string | null
          id?: number
          staff_id?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_logs_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "communication_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
        ]
      }
      course_assets: {
        Row: {
          course_id: number | null
          id: number
          student_id: string | null
          total_hours: number
        }
        Insert: {
          course_id?: number | null
          id?: number
          student_id?: string | null
          total_hours?: number
        }
        Update: {
          course_id?: number | null
          id?: number
          student_id?: string | null
          total_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_assets_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_assets_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_assets_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
        ]
      }
      courses: {
        Row: {
          id: number
          name: string
          type: Database["public"]["Enums"]["course_type"]
        }
        Insert: {
          id?: number
          name: string
          type: Database["public"]["Enums"]["course_type"]
        }
        Update: {
          id?: number
          name?: string
          type?: Database["public"]["Enums"]["course_type"]
        }
        Relationships: []
      }
      daily_checks: {
        Row: {
          check_type: Database["public"]["Enums"]["check_type"]
          created_at: string | null
          id: number
          notes: string | null
          staff_id: string | null
          status: Database["public"]["Enums"]["check_status"]
          student_id: string | null
        }
        Insert: {
          check_type: Database["public"]["Enums"]["check_type"]
          created_at?: string | null
          id?: number
          notes?: string | null
          staff_id?: string | null
          status: Database["public"]["Enums"]["check_status"]
          student_id?: string | null
        }
        Update: {
          check_type?: Database["public"]["Enums"]["check_type"]
          created_at?: string | null
          id?: number
          notes?: string | null
          staff_id?: string | null
          status?: Database["public"]["Enums"]["check_status"]
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_checks_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_checks_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "daily_checks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_checks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
        ]
      }
      dcg_cases: {
        Row: {
          archived_date: string | null
          created_at: string | null
          guardian_staff_id: string | null
          host_visit_date: string | null
          id: number
          notes: string | null
          offer_date: string | null
          payment_date: string | null
          stage: Database["public"]["Enums"]["dcg_stage"]
          student_id: string
        }
        Insert: {
          archived_date?: string | null
          created_at?: string | null
          guardian_staff_id?: string | null
          host_visit_date?: string | null
          id?: number
          notes?: string | null
          offer_date?: string | null
          payment_date?: string | null
          stage?: Database["public"]["Enums"]["dcg_stage"]
          student_id: string
        }
        Update: {
          archived_date?: string | null
          created_at?: string | null
          guardian_staff_id?: string | null
          host_visit_date?: string | null
          id?: number
          notes?: string | null
          offer_date?: string | null
          payment_date?: string | null
          stage?: Database["public"]["Enums"]["dcg_stage"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dcg_cases_guardian_staff_id_fkey"
            columns: ["guardian_staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dcg_cases_guardian_staff_id_fkey"
            columns: ["guardian_staff_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "dcg_cases_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dcg_cases_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
        ]
      }
      dcg_supervision_reports: {
        Row: {
          case_id: number
          content: string | null
          created_at: string | null
          id: number
          photo_url: string | null
          report_date: string
          reporter_staff_id: string | null
        }
        Insert: {
          case_id: number
          content?: string | null
          created_at?: string | null
          id?: number
          photo_url?: string | null
          report_date?: string
          reporter_staff_id?: string | null
        }
        Update: {
          case_id?: number
          content?: string | null
          created_at?: string | null
          id?: number
          photo_url?: string | null
          report_date?: string
          reporter_staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dcg_supervision_reports_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "dcg_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dcg_supervision_reports_reporter_staff_id_fkey"
            columns: ["reporter_staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dcg_supervision_reports_reporter_staff_id_fkey"
            columns: ["reporter_staff_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
        ]
      }
      dorm_assignments: {
        Row: {
          dorm_id: number | null
          end_date: string | null
          id: number
          is_active: boolean | null
          start_date: string
          student_id: string | null
        }
        Insert: {
          dorm_id?: number | null
          end_date?: string | null
          id?: number
          is_active?: boolean | null
          start_date: string
          student_id?: string | null
        }
        Update: {
          dorm_id?: number | null
          end_date?: string | null
          id?: number
          is_active?: boolean | null
          start_date?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dorm_assignments_dorm_id_fkey"
            columns: ["dorm_id"]
            isOneToOne: false
            referencedRelation: "dorms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dorm_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dorm_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
        ]
      }
      dorms: {
        Row: {
          building_name: string
          capacity: number
          id: number
          notes: string | null
          room_number: string
          room_status: Database["public"]["Enums"]["room_status"] | null
        }
        Insert: {
          building_name: string
          capacity: number
          id?: number
          notes?: string | null
          room_number: string
          room_status?: Database["public"]["Enums"]["room_status"] | null
        }
        Update: {
          building_name?: string
          capacity?: number
          id?: number
          notes?: string | null
          room_number?: string
          room_status?: Database["public"]["Enums"]["room_status"] | null
        }
        Relationships: []
      }
      grade_records: {
        Row: {
          course_id: number | null
          id: number
          milestone_id: number | null
          note: string | null
          program_subject_id: number | null
          recorded_at: string | null
          recorded_by: string | null
          score: number | null
          score_type: Database["public"]["Enums"]["score_type"]
          status: string
          student_id: string | null
        }
        Insert: {
          course_id?: number | null
          id?: number
          milestone_id?: number | null
          note?: string | null
          program_subject_id?: number | null
          recorded_at?: string | null
          recorded_by?: string | null
          score?: number | null
          score_type: Database["public"]["Enums"]["score_type"]
          status?: string
          student_id?: string | null
        }
        Update: {
          course_id?: number | null
          id?: number
          milestone_id?: number | null
          note?: string | null
          program_subject_id?: number | null
          recorded_at?: string | null
          recorded_by?: string | null
          score?: number | null
          score_type?: Database["public"]["Enums"]["score_type"]
          status?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grade_records_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_records_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "academic_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_records_program_subject_id_fkey"
            columns: ["program_subject_id"]
            isOneToOne: false
            referencedRelation: "program_subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_records_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_records_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "grade_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
        ]
      }
      hygiene_checks: {
        Row: {
          check_date: string
          created_at: string | null
          dorm_id: number | null
          id: number
          notes: string | null
          photo_url: string | null
          rechecked_at: string | null
          recorded_by: string | null
          rectify_deadline: string | null
          result: string
          status: string
        }
        Insert: {
          check_date?: string
          created_at?: string | null
          dorm_id?: number | null
          id?: number
          notes?: string | null
          photo_url?: string | null
          rechecked_at?: string | null
          recorded_by?: string | null
          rectify_deadline?: string | null
          result: string
          status?: string
        }
        Update: {
          check_date?: string
          created_at?: string | null
          dorm_id?: number | null
          id?: number
          notes?: string | null
          photo_url?: string | null
          rechecked_at?: string | null
          recorded_by?: string | null
          rectify_deadline?: string | null
          result?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "hygiene_checks_dorm_id_fkey"
            columns: ["dorm_id"]
            isOneToOne: false
            referencedRelation: "dorms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hygiene_checks_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hygiene_checks_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
        ]
      }
      leave_applications: {
        Row: {
          approved_at: string | null
          approver_id: string | null
          attachment_url: string | null
          end_time: string
          id: number
          leave_type: Database["public"]["Enums"]["leave_type"]
          reason: string | null
          start_time: string
          status: Database["public"]["Enums"]["approval_status"] | null
          student_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approver_id?: string | null
          attachment_url?: string | null
          end_time: string
          id?: number
          leave_type: Database["public"]["Enums"]["leave_type"]
          reason?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["approval_status"] | null
          student_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approver_id?: string | null
          attachment_url?: string | null
          end_time?: string
          id?: number
          leave_type?: Database["public"]["Enums"]["leave_type"]
          reason?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["approval_status"] | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_applications_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_applications_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "leave_applications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_applications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
        ]
      }
      log_hour_changes: {
        Row: {
          change_amount: number
          course_id: number | null
          created_at: string | null
          id: number
          operator_id: string | null
          student_id: string | null
          trigger_source: string | null
        }
        Insert: {
          change_amount: number
          course_id?: number | null
          created_at?: string | null
          id?: number
          operator_id?: string | null
          student_id?: string | null
          trigger_source?: string | null
        }
        Update: {
          change_amount?: number
          course_id?: number | null
          created_at?: string | null
          id?: number
          operator_id?: string | null
          student_id?: string | null
          trigger_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "log_hour_changes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_hour_changes_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_hour_changes_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "log_hour_changes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_hour_changes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
        ]
      }
      log_risk_changes: {
        Row: {
          created_at: string | null
          id: number
          new_level: Database["public"]["Enums"]["risk_level"]
          old_level: Database["public"]["Enums"]["risk_level"]
          operator_id: string | null
          reason: string | null
          student_id: string | null
          trigger_type: Database["public"]["Enums"]["trigger_type"]
        }
        Insert: {
          created_at?: string | null
          id?: number
          new_level: Database["public"]["Enums"]["risk_level"]
          old_level: Database["public"]["Enums"]["risk_level"]
          operator_id?: string | null
          reason?: string | null
          student_id?: string | null
          trigger_type: Database["public"]["Enums"]["trigger_type"]
        }
        Update: {
          created_at?: string | null
          id?: number
          new_level?: Database["public"]["Enums"]["risk_level"]
          old_level?: Database["public"]["Enums"]["risk_level"]
          operator_id?: string | null
          reason?: string | null
          student_id?: string | null
          trigger_type?: Database["public"]["Enums"]["trigger_type"]
        }
        Relationships: [
          {
            foreignKeyName: "log_risk_changes_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_risk_changes_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "log_risk_changes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_risk_changes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
        ]
      }
      meal_plans: {
        Row: {
          breakfast_menu: string | null
          breakfast_photo: string | null
          building_name: string
          created_at: string | null
          created_by: string | null
          dinner_menu: string | null
          dinner_photo: string | null
          id: number
          lunch_menu: string | null
          lunch_photo: string | null
          meal_date: string
          mode: string
          notes: string | null
          portions: number | null
          signup_deadline: string | null
        }
        Insert: {
          breakfast_menu?: string | null
          breakfast_photo?: string | null
          building_name: string
          created_at?: string | null
          created_by?: string | null
          dinner_menu?: string | null
          dinner_photo?: string | null
          id?: number
          lunch_menu?: string | null
          lunch_photo?: string | null
          meal_date: string
          mode: string
          notes?: string | null
          portions?: number | null
          signup_deadline?: string | null
        }
        Update: {
          breakfast_menu?: string | null
          breakfast_photo?: string | null
          building_name?: string
          created_at?: string | null
          created_by?: string | null
          dinner_menu?: string | null
          dinner_photo?: string | null
          id?: number
          lunch_menu?: string | null
          lunch_photo?: string | null
          meal_date?: string
          mode?: string
          notes?: string | null
          portions?: number | null
          signup_deadline?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meal_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
        ]
      }
      meal_signups: {
        Row: {
          breakfast: boolean
          dinner: boolean
          id: number
          lunch: boolean
          plan_id: number
          source: string
          student_id: string
          updated_at: string | null
        }
        Insert: {
          breakfast?: boolean
          dinner?: boolean
          id?: number
          lunch?: boolean
          plan_id: number
          source?: string
          student_id: string
          updated_at?: string | null
        }
        Update: {
          breakfast?: boolean
          dinner?: boolean
          id?: number
          lunch?: boolean
          plan_id?: number
          source?: string
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meal_signups_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_signups_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_signups_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
        ]
      }
      medication_records: {
        Row: {
          dispensed_at: string | null
          dispensed_by: string | null
          dosage: string | null
          id: number
          medication_id: number | null
          medication_name: string
          student_id: string | null
        }
        Insert: {
          dispensed_at?: string | null
          dispensed_by?: string | null
          dosage?: string | null
          id?: number
          medication_id?: number | null
          medication_name: string
          student_id?: string | null
        }
        Update: {
          dispensed_at?: string | null
          dispensed_by?: string | null
          dosage?: string | null
          id?: number
          medication_id?: number | null
          medication_name?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medication_records_dispensed_by_fkey"
            columns: ["dispensed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_records_dispensed_by_fkey"
            columns: ["dispensed_by"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "medication_records_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
        ]
      }
      medications: {
        Row: {
          created_at: string | null
          created_by: string | null
          daily_time: string | null
          id: number
          is_active: boolean
          name: string
          notes: string | null
          stock: number
          student_id: string
          usage: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          daily_time?: string | null
          id?: number
          is_active?: boolean
          name: string
          notes?: string | null
          stock?: number
          student_id: string
          usage?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          daily_time?: string | null
          id?: number
          is_active?: boolean
          name?: string
          notes?: string | null
          stock?: number
          student_id?: string
          usage?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "medications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
        ]
      }
      notification_recipients: {
        Row: {
          id: number
          is_read: boolean | null
          notification_id: number | null
          recipient_id: string | null
        }
        Insert: {
          id?: number
          is_read?: boolean | null
          notification_id?: number | null
          recipient_id?: string | null
        }
        Update: {
          id?: number
          is_read?: boolean | null
          notification_id?: number | null
          recipient_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_recipients_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_recipients_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_recipients_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
        ]
      }
      notification_send_logs: {
        Row: {
          channel: Database["public"]["Enums"]["send_channel"]
          failure_reason: string | null
          id: number
          notification_id: number | null
          recipient_id: string | null
          send_status: Database["public"]["Enums"]["send_status"] | null
          sent_at: string | null
        }
        Insert: {
          channel: Database["public"]["Enums"]["send_channel"]
          failure_reason?: string | null
          id?: number
          notification_id?: number | null
          recipient_id?: string | null
          send_status?: Database["public"]["Enums"]["send_status"] | null
          sent_at?: string | null
        }
        Update: {
          channel?: Database["public"]["Enums"]["send_channel"]
          failure_reason?: string | null
          id?: number
          notification_id?: number | null
          recipient_id?: string | null
          send_status?: Database["public"]["Enums"]["send_status"] | null
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_send_logs_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_send_logs_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_send_logs_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
        ]
      }
      notifications: {
        Row: {
          content: string
          created_at: string | null
          id: number
          notification_type: Database["public"]["Enums"]["notification_type"]
          sender_id: string | null
          title: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: number
          notification_type: Database["public"]["Enums"]["notification_type"]
          sender_id?: string | null
          title: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: number
          notification_type?: Database["public"]["Enums"]["notification_type"]
          sender_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: number | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name: string
          id: string
          phone?: string | null
          role: Database["public"]["Enums"]["user_role"]
          status?: number | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: number | null
        }
        Relationships: []
      }
      program_subjects: {
        Row: {
          default_schedule: Json | null
          description: string | null
          difficulty_level: Database["public"]["Enums"]["difficulty_level"]
          hours_per_week: number | null
          id: number
          max_students: number | null
          pass_mark: number
          program_id: number | null
          sessions_per_week: number | null
          subject_area: Database["public"]["Enums"]["subject_area"]
          subject_category: Database["public"]["Enums"]["subject_category"]
          subject_name: string
        }
        Insert: {
          default_schedule?: Json | null
          description?: string | null
          difficulty_level: Database["public"]["Enums"]["difficulty_level"]
          hours_per_week?: number | null
          id?: number
          max_students?: number | null
          pass_mark?: number
          program_id?: number | null
          sessions_per_week?: number | null
          subject_area: Database["public"]["Enums"]["subject_area"]
          subject_category: Database["public"]["Enums"]["subject_category"]
          subject_name: string
        }
        Update: {
          default_schedule?: Json | null
          description?: string | null
          difficulty_level?: Database["public"]["Enums"]["difficulty_level"]
          hours_per_week?: number | null
          id?: number
          max_students?: number | null
          pass_mark?: number
          program_id?: number | null
          sessions_per_week?: number | null
          subject_area?: Database["public"]["Enums"]["subject_area"]
          subject_category?: Database["public"]["Enums"]["subject_category"]
          subject_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_subjects_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_types: {
        Row: {
          description: string | null
          id: number
          name: string
        }
        Insert: {
          description?: string | null
          id?: number
          name: string
        }
        Update: {
          description?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      programs: {
        Row: {
          description: string | null
          duration_months: number | null
          id: number
          is_active: boolean | null
          name: string
          program_type_id: number | null
          track: Database["public"]["Enums"]["program_track"]
        }
        Insert: {
          description?: string | null
          duration_months?: number | null
          id?: number
          is_active?: boolean | null
          name: string
          program_type_id?: number | null
          track: Database["public"]["Enums"]["program_track"]
        }
        Update: {
          description?: string | null
          duration_months?: number | null
          id?: number
          is_active?: boolean | null
          name?: string
          program_type_id?: number | null
          track?: Database["public"]["Enums"]["program_track"]
        }
        Relationships: [
          {
            foreignKeyName: "programs_program_type_id_fkey"
            columns: ["program_type_id"]
            isOneToOne: false
            referencedRelation: "program_types"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          content: Json
          generated_at: string | null
          generated_by: string | null
          id: number
          pdf_url: string | null
          period_end: string | null
          period_start: string | null
          report_type: Database["public"]["Enums"]["report_type"]
          reviewed_at: string | null
          reviewer_id: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["report_status"] | null
          student_id: string | null
          title: string | null
        }
        Insert: {
          content?: Json
          generated_at?: string | null
          generated_by?: string | null
          id?: number
          pdf_url?: string | null
          period_end?: string | null
          period_start?: string | null
          report_type: Database["public"]["Enums"]["report_type"]
          reviewed_at?: string | null
          reviewer_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["report_status"] | null
          student_id?: string | null
          title?: string | null
        }
        Update: {
          content?: Json
          generated_at?: string | null
          generated_by?: string | null
          id?: number
          pdf_url?: string | null
          period_end?: string | null
          period_start?: string | null
          report_type?: Database["public"]["Enums"]["report_type"]
          reviewed_at?: string | null
          reviewer_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["report_status"] | null
          student_id?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "reports_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "reports_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
        ]
      }
      resource_student_links: {
        Row: {
          id: number
          resource_id: number | null
          student_id: string | null
        }
        Insert: {
          id?: number
          resource_id?: number | null
          student_id?: string | null
        }
        Update: {
          id?: number
          resource_id?: number | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resource_student_links_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_student_links_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_student_links_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
        ]
      }
      resources: {
        Row: {
          created_at: string | null
          description: string | null
          file_url: string
          id: number
          is_student_visible: boolean | null
          knowledge_points: string[] | null
          program_stage: string | null
          resource_type: string | null
          resource_year: number | null
          subject: string | null
          superseded_by_id: number | null
          title: string
          uploader_id: string | null
          version: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          file_url: string
          id?: number
          is_student_visible?: boolean | null
          knowledge_points?: string[] | null
          program_stage?: string | null
          resource_type?: string | null
          resource_year?: number | null
          subject?: string | null
          superseded_by_id?: number | null
          title: string
          uploader_id?: string | null
          version?: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          file_url?: string
          id?: number
          is_student_visible?: boolean | null
          knowledge_points?: string[] | null
          program_stage?: string | null
          resource_type?: string | null
          resource_year?: number | null
          subject?: string | null
          superseded_by_id?: number | null
          title?: string
          uploader_id?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "resources_superseded_by_id_fkey"
            columns: ["superseded_by_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_uploader_id_fkey"
            columns: ["uploader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_uploader_id_fkey"
            columns: ["uploader_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
        ]
      }
      risk_config: {
        Row: {
          category: string | null
          key: string
          label: string | null
          updated_at: string | null
          value: number
        }
        Insert: {
          category?: string | null
          key: string
          label?: string | null
          updated_at?: string | null
          value: number
        }
        Update: {
          category?: string | null
          key?: string
          label?: string | null
          updated_at?: string | null
          value?: number
        }
        Relationships: []
      }
      schedule_changes: {
        Row: {
          approver_id: string | null
          id: number
          new_start_time: string
          reason: string | null
          requester_id: string | null
          schedule_id: number | null
          status: Database["public"]["Enums"]["approval_status"] | null
        }
        Insert: {
          approver_id?: string | null
          id?: number
          new_start_time: string
          reason?: string | null
          requester_id?: string | null
          schedule_id?: number | null
          status?: Database["public"]["Enums"]["approval_status"] | null
        }
        Update: {
          approver_id?: string | null
          id?: number
          new_start_time?: string
          reason?: string | null
          requester_id?: string | null
          schedule_id?: number | null
          status?: Database["public"]["Enums"]["approval_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_changes_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_changes_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "schedule_changes_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_changes_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "schedule_changes_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          course_id: number | null
          end_time: string
          feedback_internal: string | null
          feedback_public: string | null
          homework_content: string | null
          id: number
          material_url: string | null
          program_subject_id: number | null
          start_time: string
          status: Database["public"]["Enums"]["schedule_status"] | null
          student_id: string | null
          subject_label: string | null
          tutor_id: string | null
        }
        Insert: {
          course_id?: number | null
          end_time: string
          feedback_internal?: string | null
          feedback_public?: string | null
          homework_content?: string | null
          id?: number
          material_url?: string | null
          program_subject_id?: number | null
          start_time: string
          status?: Database["public"]["Enums"]["schedule_status"] | null
          student_id?: string | null
          subject_label?: string | null
          tutor_id?: string | null
        }
        Update: {
          course_id?: number | null
          end_time?: string
          feedback_internal?: string | null
          feedback_public?: string | null
          homework_content?: string | null
          id?: number
          material_url?: string | null
          program_subject_id?: number | null
          start_time?: string
          status?: Database["public"]["Enums"]["schedule_status"] | null
          student_id?: string | null
          subject_label?: string | null
          tutor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_program_subject_id_fkey"
            columns: ["program_subject_id"]
            isOneToOne: false
            referencedRelation: "program_subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "schedules_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
        ]
      }
      school_timetable: {
        Row: {
          confirmed_at: string | null
          day_of_week: number
          effective_from: string
          effective_until: string
          end_time: string
          enrollment_id: number | null
          generated_by: string | null
          id: number
          is_confirmed: boolean | null
          program_subject_id: number | null
          room: string | null
          start_time: string
          student_id: string | null
        }
        Insert: {
          confirmed_at?: string | null
          day_of_week: number
          effective_from: string
          effective_until: string
          end_time: string
          enrollment_id?: number | null
          generated_by?: string | null
          id?: number
          is_confirmed?: boolean | null
          program_subject_id?: number | null
          room?: string | null
          start_time: string
          student_id?: string | null
        }
        Update: {
          confirmed_at?: string | null
          day_of_week?: number
          effective_from?: string
          effective_until?: string
          end_time?: string
          enrollment_id?: number | null
          generated_by?: string | null
          id?: number
          is_confirmed?: boolean | null
          program_subject_id?: number | null
          room?: string | null
          start_time?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_timetable_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "student_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_timetable_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "v_student_current_enrollment"
            referencedColumns: ["enrollment_id"]
          },
          {
            foreignKeyName: "school_timetable_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_timetable_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "school_timetable_program_subject_id_fkey"
            columns: ["program_subject_id"]
            isOneToOne: false
            referencedRelation: "program_subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_timetable_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_timetable_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
        ]
      }
      staff_duty_schedules: {
        Row: {
          duty_date: string
          duty_type: Database["public"]["Enums"]["duty_type"]
          id: number
          notes: string | null
          route_id: number | null
          shift: Database["public"]["Enums"]["duty_shift"]
          staff_id: string | null
        }
        Insert: {
          duty_date: string
          duty_type: Database["public"]["Enums"]["duty_type"]
          id?: number
          notes?: string | null
          route_id?: number | null
          shift: Database["public"]["Enums"]["duty_shift"]
          staff_id?: string | null
        }
        Update: {
          duty_date?: string
          duty_type?: Database["public"]["Enums"]["duty_type"]
          id?: number
          notes?: string | null
          route_id?: number | null
          shift?: Database["public"]["Enums"]["duty_shift"]
          staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_duty_schedules_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "transport_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_duty_schedules_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_duty_schedules_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
        ]
      }
      student_credentials: {
        Row: {
          account: string
          encrypted_password: string
          id: number
          platform_name: string
          student_id: string | null
        }
        Insert: {
          account: string
          encrypted_password: string
          id?: number
          platform_name: string
          student_id?: string | null
        }
        Update: {
          account?: string
          encrypted_password?: string
          id?: number
          platform_name?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_credentials_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_credentials_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
        ]
      }
      student_documents: {
        Row: {
          doc_type: Database["public"]["Enums"]["doc_type"]
          expiry_date: string | null
          file_url: string
          id: number
          issue_date: string | null
          status: Database["public"]["Enums"]["doc_status"] | null
          student_id: string | null
          title: string | null
          uploaded_by: string | null
        }
        Insert: {
          doc_type: Database["public"]["Enums"]["doc_type"]
          expiry_date?: string | null
          file_url: string
          id?: number
          issue_date?: string | null
          status?: Database["public"]["Enums"]["doc_status"] | null
          student_id?: string | null
          title?: string | null
          uploaded_by?: string | null
        }
        Update: {
          doc_type?: Database["public"]["Enums"]["doc_type"]
          expiry_date?: string | null
          file_url?: string
          id?: number
          issue_date?: string | null
          status?: Database["public"]["Enums"]["doc_status"] | null
          student_id?: string | null
          title?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_documents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_documents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
        ]
      }
      student_enrollments: {
        Row: {
          cohort_name: string | null
          created_at: string | null
          end_date: string | null
          enrolled_by: string | null
          id: number
          program_id: number | null
          source: Database["public"]["Enums"]["enrollment_source"] | null
          start_date: string | null
          status: Database["public"]["Enums"]["program_status"] | null
          student_id: string | null
        }
        Insert: {
          cohort_name?: string | null
          created_at?: string | null
          end_date?: string | null
          enrolled_by?: string | null
          id?: number
          program_id?: number | null
          source?: Database["public"]["Enums"]["enrollment_source"] | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["program_status"] | null
          student_id?: string | null
        }
        Update: {
          cohort_name?: string | null
          created_at?: string | null
          end_date?: string | null
          enrolled_by?: string | null
          id?: number
          program_id?: number | null
          source?: Database["public"]["Enums"]["enrollment_source"] | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["program_status"] | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_enrollments_enrolled_by_fkey"
            columns: ["enrolled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_enrollments_enrolled_by_fkey"
            columns: ["enrolled_by"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_enrollments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
        ]
      }
      student_fees: {
        Row: {
          created_at: string
          enrollment_id: number
          fee_type: Database["public"]["Enums"]["fee_type"]
          id: number
          is_paid: boolean
          note: string | null
          paid_date: string | null
          student_id: string
        }
        Insert: {
          created_at?: string
          enrollment_id: number
          fee_type: Database["public"]["Enums"]["fee_type"]
          id?: number
          is_paid?: boolean
          note?: string | null
          paid_date?: string | null
          student_id: string
        }
        Update: {
          created_at?: string
          enrollment_id?: number
          fee_type?: Database["public"]["Enums"]["fee_type"]
          id?: number
          is_paid?: boolean
          note?: string | null
          paid_date?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_fees_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "student_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_fees_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "v_student_current_enrollment"
            referencedColumns: ["enrollment_id"]
          },
          {
            foreignKeyName: "student_fees_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_fees_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
        ]
      }
      student_hour_pools: {
        Row: {
          course_type: Database["public"]["Enums"]["course_type"]
          id: number
          student_id: string
          total_hours: number
          updated_at: string | null
        }
        Insert: {
          course_type: Database["public"]["Enums"]["course_type"]
          id?: number
          student_id: string
          total_hours?: number
          updated_at?: string | null
        }
        Update: {
          course_type?: Database["public"]["Enums"]["course_type"]
          id?: number
          student_id?: string
          total_hours?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_hour_pools_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_hour_pools_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
        ]
      }
      student_subject_selections: {
        Row: {
          confirmed_at: string | null
          enrollment_id: number | null
          id: number
          program_subject_id: number | null
          selection_type: Database["public"]["Enums"]["subject_category"]
          status: Database["public"]["Enums"]["selection_status"] | null
        }
        Insert: {
          confirmed_at?: string | null
          enrollment_id?: number | null
          id?: number
          program_subject_id?: number | null
          selection_type: Database["public"]["Enums"]["subject_category"]
          status?: Database["public"]["Enums"]["selection_status"] | null
        }
        Update: {
          confirmed_at?: string | null
          enrollment_id?: number | null
          id?: number
          program_subject_id?: number | null
          selection_type?: Database["public"]["Enums"]["subject_category"]
          status?: Database["public"]["Enums"]["selection_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "student_subject_selections_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "student_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_subject_selections_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "v_student_current_enrollment"
            referencedColumns: ["enrollment_id"]
          },
          {
            foreignKeyName: "student_subject_selections_program_subject_id_fkey"
            columns: ["program_subject_id"]
            isOneToOne: false
            referencedRelation: "program_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      student_wx_bindings: {
        Row: {
          bound_at: string | null
          openid: string
          student_id: string
        }
        Insert: {
          bound_at?: string | null
          openid: string
          student_id: string
        }
        Update: {
          bound_at?: string | null
          openid?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_wx_bindings_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_wx_bindings_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
        ]
      }
      students_info: {
        Row: {
          advisor: string | null
          arrival_date: string | null
          attendance_rate_updated_at: string | null
          city: string | null
          date_of_birth: string | null
          emergency_contact_email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          english_level: string | null
          english_name: string | null
          enrollment_id: number | null
          gender: string | null
          health_notes: string | null
          home_address: string | null
          life_teacher_id: string | null
          market_source: string | null
          nfe_no: number | null
          nz_advisor_id: string | null
          offer_status: string | null
          passport_number: string | null
          payment_note: string | null
          preferred_english_name: string | null
          risk_level: Database["public"]["Enums"]["risk_level"] | null
          scholarship_requirement: string | null
          school_attendance_rate: number | null
          school_name: string | null
          source_school: string | null
          student_id: string
          target_degree: string | null
          target_university: string | null
          total_risk_score: number | null
          uoa_student_id: string | null
          up_student_id: string | null
        }
        Insert: {
          advisor?: string | null
          arrival_date?: string | null
          attendance_rate_updated_at?: string | null
          city?: string | null
          date_of_birth?: string | null
          emergency_contact_email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          english_level?: string | null
          english_name?: string | null
          enrollment_id?: number | null
          gender?: string | null
          health_notes?: string | null
          home_address?: string | null
          life_teacher_id?: string | null
          market_source?: string | null
          nfe_no?: number | null
          nz_advisor_id?: string | null
          offer_status?: string | null
          passport_number?: string | null
          payment_note?: string | null
          preferred_english_name?: string | null
          risk_level?: Database["public"]["Enums"]["risk_level"] | null
          scholarship_requirement?: string | null
          school_attendance_rate?: number | null
          school_name?: string | null
          source_school?: string | null
          student_id: string
          target_degree?: string | null
          target_university?: string | null
          total_risk_score?: number | null
          uoa_student_id?: string | null
          up_student_id?: string | null
        }
        Update: {
          advisor?: string | null
          arrival_date?: string | null
          attendance_rate_updated_at?: string | null
          city?: string | null
          date_of_birth?: string | null
          emergency_contact_email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          english_level?: string | null
          english_name?: string | null
          enrollment_id?: number | null
          gender?: string | null
          health_notes?: string | null
          home_address?: string | null
          life_teacher_id?: string | null
          market_source?: string | null
          nfe_no?: number | null
          nz_advisor_id?: string | null
          offer_status?: string | null
          passport_number?: string | null
          payment_note?: string | null
          preferred_english_name?: string | null
          risk_level?: Database["public"]["Enums"]["risk_level"] | null
          scholarship_requirement?: string | null
          school_attendance_rate?: number | null
          school_name?: string | null
          source_school?: string | null
          student_id?: string
          target_degree?: string | null
          target_university?: string | null
          total_risk_score?: number | null
          uoa_student_id?: string | null
          up_student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_info_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "student_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_info_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "v_student_current_enrollment"
            referencedColumns: ["enrollment_id"]
          },
          {
            foreignKeyName: "students_info_life_teacher_id_fkey"
            columns: ["life_teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_info_life_teacher_id_fkey"
            columns: ["life_teacher_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "students_info_nz_advisor_id_fkey"
            columns: ["nz_advisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_info_nz_advisor_id_fkey"
            columns: ["nz_advisor_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "students_info_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_info_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
        ]
      }
      study_follow_ups: {
        Row: {
          attachment_url: string | null
          category: string
          content: string
          created_at: string | null
          id: number
          needs_followup: boolean
          recorder_id: string | null
          result: string | null
          student_id: string
          subject: string | null
        }
        Insert: {
          attachment_url?: string | null
          category: string
          content: string
          created_at?: string | null
          id?: number
          needs_followup?: boolean
          recorder_id?: string | null
          result?: string | null
          student_id: string
          subject?: string | null
        }
        Update: {
          attachment_url?: string | null
          category?: string
          content?: string
          created_at?: string | null
          id?: number
          needs_followup?: boolean
          recorder_id?: string | null
          result?: string | null
          student_id?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_follow_ups_recorder_id_fkey"
            columns: ["recorder_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_follow_ups_recorder_id_fkey"
            columns: ["recorder_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "study_follow_ups_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_follow_ups_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
        ]
      }
      todos: {
        Row: {
          collaborator_ids: string[]
          content: string
          created_at: string
          created_by: string
          done_at: string | null
          due_at: string | null
          id: number
          is_done: boolean
        }
        Insert: {
          collaborator_ids?: string[]
          content: string
          created_at?: string
          created_by?: string
          done_at?: string | null
          due_at?: string | null
          id?: number
          is_done?: boolean
        }
        Update: {
          collaborator_ids?: string[]
          content?: string
          created_at?: string
          created_by?: string
          done_at?: string | null
          due_at?: string | null
          id?: number
          is_done?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "todos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
        ]
      }
      transport_passengers: {
        Row: {
          drop_off_location: string | null
          id: number
          pickup_location: string | null
          pickup_time: string
          route_id: number | null
          status: Database["public"]["Enums"]["transport_status"] | null
          student_id: string | null
        }
        Insert: {
          drop_off_location?: string | null
          id?: number
          pickup_location?: string | null
          pickup_time: string
          route_id?: number | null
          status?: Database["public"]["Enums"]["transport_status"] | null
          student_id?: string | null
        }
        Update: {
          drop_off_location?: string | null
          id?: number
          pickup_location?: string | null
          pickup_time?: string
          route_id?: number | null
          status?: Database["public"]["Enums"]["transport_status"] | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transport_passengers_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "transport_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_passengers_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_passengers_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
        ]
      }
      transport_routes: {
        Row: {
          driver_id: string | null
          execution_date: string
          id: number
          route_name: string
        }
        Insert: {
          driver_id?: string | null
          execution_date: string
          id?: number
          route_name: string
        }
        Update: {
          driver_id?: string | null
          execution_date?: string
          id?: number
          route_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_routes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_routes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
        ]
      }
      violation_logs: {
        Row: {
          attachment_url: string | null
          created_at: string | null
          deduction_points: number | null
          id: number
          reason: string
          reporter_id: string | null
          status: string
          student_id: string | null
          violation_type: string | null
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string | null
          deduction_points?: number | null
          id?: number
          reason: string
          reporter_id?: string | null
          status?: string
          student_id?: string | null
          violation_type?: string | null
        }
        Update: {
          attachment_url?: string | null
          created_at?: string | null
          deduction_points?: number | null
          id?: number
          reason?: string
          reporter_id?: string | null
          status?: string
          student_id?: string | null
          violation_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "violation_logs_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "violation_logs_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "violation_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "violation_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
        ]
      }
      warning_letter_violations: {
        Row: {
          id: number
          violation_id: number | null
          warning_letter_id: number | null
        }
        Insert: {
          id?: number
          violation_id?: number | null
          warning_letter_id?: number | null
        }
        Update: {
          id?: number
          violation_id?: number | null
          warning_letter_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "warning_letter_violations_violation_id_fkey"
            columns: ["violation_id"]
            isOneToOne: false
            referencedRelation: "violation_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warning_letter_violations_warning_letter_id_fkey"
            columns: ["warning_letter_id"]
            isOneToOne: false
            referencedRelation: "warning_letters"
            referencedColumns: ["id"]
          },
        ]
      }
      warning_letters: {
        Row: {
          attachment_url: string | null
          category: string | null
          evidence_content: string | null
          id: number
          issuer_id: string | null
          occurred_on: string | null
          signed_at: string | null
          source: string
          status: Database["public"]["Enums"]["warning_status"] | null
          student_id: string | null
          warning_level: number
        }
        Insert: {
          attachment_url?: string | null
          category?: string | null
          evidence_content?: string | null
          id?: number
          issuer_id?: string | null
          occurred_on?: string | null
          signed_at?: string | null
          source?: string
          status?: Database["public"]["Enums"]["warning_status"] | null
          student_id?: string | null
          warning_level: number
        }
        Update: {
          attachment_url?: string | null
          category?: string | null
          evidence_content?: string | null
          id?: number
          issuer_id?: string | null
          occurred_on?: string | null
          signed_at?: string | null
          source?: string
          status?: Database["public"]["Enums"]["warning_status"] | null
          student_id?: string | null
          warning_level?: number
        }
        Relationships: [
          {
            foreignKeyName: "warning_letters_issuer_id_fkey"
            columns: ["issuer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warning_letters_issuer_id_fkey"
            columns: ["issuer_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "warning_letters_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warning_letters_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
        ]
      }
    }
    Views: {
      v_course_remaining: {
        Row: {
          course_asset_id: number | null
          course_id: number | null
          remaining_hours: number | null
          student_id: string | null
          total_hours: number | null
        }
        Relationships: [
          {
            foreignKeyName: "course_assets_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_assets_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_assets_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
        ]
      }
      v_student_current_enrollment: {
        Row: {
          end_date: string | null
          enrollment_count: number | null
          enrollment_id: number | null
          program_id: number | null
          program_name: string | null
          program_stage: string | null
          source: Database["public"]["Enums"]["enrollment_source"] | null
          start_date: string | null
          status: Database["public"]["Enums"]["program_status"] | null
          student_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_enrollments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
        ]
      }
      v_student_overview: {
        Row: {
          life_teacher_id: string | null
          nz_advisor_id: string | null
          student_id: string | null
          出生时间: string | null
          城市: string | null
          姓名: string | null
          市场来源: string | null
          市场来源为推导值: boolean | null
          市场来源明细: string | null
          开始时间: string | null
          性别: string | null
          报名状态: Database["public"]["Enums"]["program_status"] | null
          报名记录数: number | null
          拼音英文名: string | null
          新西兰生活老师: string | null
          "新西兰顾问/学管": string | null
          结束时间: string | null
          英文名: string | null
          课程动态: string | null
          顾问: string | null
          风险分: number | null
          风险等级: Database["public"]["Enums"]["risk_level"] | null
          高中学校: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_info_life_teacher_id_fkey"
            columns: ["life_teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_info_life_teacher_id_fkey"
            columns: ["life_teacher_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "students_info_nz_advisor_id_fkey"
            columns: ["nz_advisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_info_nz_advisor_id_fkey"
            columns: ["nz_advisor_id"]
            isOneToOne: false
            referencedRelation: "v_student_overview"
            referencedColumns: ["student_id"]
          },
        ]
      }
    }
    Functions: {
      current_user_role: { Args: never; Returns: string }
      is_elevated: { Args: never; Returns: boolean }
    }
    Enums: {
      approval_status: "pending" | "approved" | "rejected"
      check_status: "present" | "absent" | "leave"
      check_type: "morning" | "night_study" | "dorm_check" | "tutoring"
      contact_type: "student" | "parent" | "school" | "accommodation"
      course_type: "one_on_one" | "group_class"
      dcg_stage:
        | "applied"
        | "conditional_offer"
        | "dcg_required"
        | "paid"
        | "host_visit"
        | "archived"
        | "supervising"
        | "completed"
      difficulty_level: "foundation" | "standard" | "advanced"
      doc_status: "valid" | "expiring_soon" | "expired"
      doc_type:
        | "passport"
        | "visa"
        | "insurance"
        | "offer_letter"
        | "transcript"
        | "guardianship"
        | "dcg_receipt"
        | "parent_proof"
        | "apartment_visit"
        | "contract"
        | "payment_receipt"
        | "other"
      duty_shift: "morning" | "afternoon" | "evening"
      duty_type: "dorm_check" | "night_study" | "transport" | "patrol"
      enrollment_source: "green_channel" | "agent"
      enrollment_status: "enrolled" | "graduated" | "withdrawn" | "suspended"
      fee_type: "supervision" | "tutoring" | "accommodation" | "tuition"
      leave_type: "sick_leave" | "personal_leave" | "overnight_stay"
      milestone_type: "exam" | "assignment" | "report_due"
      notification_type: "internal" | "external" | "system_auto"
      program_status: "active" | "completed" | "withdrawn" | "suspended"
      program_track:
        | "accelerate"
        | "fast_track"
        | "standard"
        | "other"
        | "university"
      report_status: "draft" | "reviewed" | "sent"
      report_type: "biweekly" | "monthly" | "semester"
      risk_level: "green" | "yellow" | "red"
      room_status:
        | "occupied"
        | "move_in_soon"
        | "move_out_soon"
        | "vacant"
        | "maintenance"
        | "unavailable"
      schedule_status:
        | "scheduled"
        | "completed"
        | "rescheduling"
        | "pending_approval"
        | "absent"
        | "leave"
        | "cancelled"
      score_type: "daily" | "midterm" | "final"
      selection_status: "pending_confirm" | "confirmed" | "dropped"
      send_channel: "in_app" | "wechat" | "email"
      send_status: "pending" | "sent" | "failed"
      subject_area: "english" | "science" | "commerce" | "arts" | "other"
      subject_category: "core" | "elective"
      transport_status: "pending" | "picked_up" | "no_show"
      trigger_type: "system_auto" | "manual_override"
      user_role:
        | "admin"
        | "manager"
        | "tutor"
        | "patrol"
        | "life"
        | "driver"
        | "student"
      warning_status:
        | "pending_approval"
        | "issued"
        | "signed_onsite"
        | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      approval_status: ["pending", "approved", "rejected"],
      check_status: ["present", "absent", "leave"],
      check_type: ["morning", "night_study", "dorm_check", "tutoring"],
      contact_type: ["student", "parent", "school", "accommodation"],
      course_type: ["one_on_one", "group_class"],
      dcg_stage: [
        "applied",
        "conditional_offer",
        "dcg_required",
        "paid",
        "host_visit",
        "archived",
        "supervising",
        "completed",
      ],
      difficulty_level: ["foundation", "standard", "advanced"],
      doc_status: ["valid", "expiring_soon", "expired"],
      doc_type: [
        "passport",
        "visa",
        "insurance",
        "offer_letter",
        "transcript",
        "guardianship",
        "dcg_receipt",
        "parent_proof",
        "apartment_visit",
        "contract",
        "payment_receipt",
        "other",
      ],
      duty_shift: ["morning", "afternoon", "evening"],
      duty_type: ["dorm_check", "night_study", "transport", "patrol"],
      enrollment_source: ["green_channel", "agent"],
      enrollment_status: ["enrolled", "graduated", "withdrawn", "suspended"],
      fee_type: ["supervision", "tutoring", "accommodation", "tuition"],
      leave_type: ["sick_leave", "personal_leave", "overnight_stay"],
      milestone_type: ["exam", "assignment", "report_due"],
      notification_type: ["internal", "external", "system_auto"],
      program_status: ["active", "completed", "withdrawn", "suspended"],
      program_track: [
        "accelerate",
        "fast_track",
        "standard",
        "other",
        "university",
      ],
      report_status: ["draft", "reviewed", "sent"],
      report_type: ["biweekly", "monthly", "semester"],
      risk_level: ["green", "yellow", "red"],
      room_status: [
        "occupied",
        "move_in_soon",
        "move_out_soon",
        "vacant",
        "maintenance",
        "unavailable",
      ],
      schedule_status: [
        "scheduled",
        "completed",
        "rescheduling",
        "pending_approval",
        "absent",
        "leave",
        "cancelled",
      ],
      score_type: ["daily", "midterm", "final"],
      selection_status: ["pending_confirm", "confirmed", "dropped"],
      send_channel: ["in_app", "wechat", "email"],
      send_status: ["pending", "sent", "failed"],
      subject_area: ["english", "science", "commerce", "arts", "other"],
      subject_category: ["core", "elective"],
      transport_status: ["pending", "picked_up", "no_show"],
      trigger_type: ["system_auto", "manual_override"],
      user_role: [
        "admin",
        "manager",
        "tutor",
        "patrol",
        "life",
        "driver",
        "student",
      ],
      warning_status: [
        "pending_approval",
        "issued",
        "signed_onsite",
        "rejected",
      ],
    },
  },
} as const
