import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('students_info').select('risk_level');
  if (error) console.error(error);
  
  const counts = { green: 0, yellow: 0, red: 0 };
  (data || []).forEach(d => counts[d.risk_level]++);
  console.log(counts);
}
check();
