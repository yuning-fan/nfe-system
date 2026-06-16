import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoyMDAwMDAwMDAwfQ.invalid-key-for-local-development';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('students_info')
    .select('*, profiles(full_name), student_enrollments(*, programs(*))');
  console.log('Error:', error);
  console.log('Count:', data?.length);
  if(data) console.log(data.slice(0, 2).map(s => ({
    name: s.profiles?.full_name,
    enrollments: Array.isArray(s.student_enrollments)
  })));
}
run();
