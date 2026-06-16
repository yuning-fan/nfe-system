import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoyMDAwMDAwMDAwfQ.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2amF5b2dndnhuendvaXJ6cGx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTEwOTM1MzcsImV4cCI6MjAyNjg1MzUzN30.Zz3t9N_uX00KkL4A-T9i_O_R9N0F9d_A0N_D_Q_A0N0';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('students_info')
    .select(`
      *,
      profiles(
        *,
        dorm_assignments(*, dorms(*)),
        warning_letters(*),
        school_timetable(*)
      ),
      student_enrollments(*, programs(*))
    `)
    .limit(1);
  console.log('Error:', JSON.stringify(error, null, 2));
  console.log('Data:', JSON.stringify(data, null, 2));
}
run();
