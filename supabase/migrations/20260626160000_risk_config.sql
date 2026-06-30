-- 风险评分参数配置（系统配置页可调）。key→value，引擎读取，缺省回落代码常量。
create table if not exists public.risk_config (
  key text primary key,
  value numeric not null,
  label text,
  category text,          -- deduct(扣分项) / threshold(阈值/红线)
  updated_at timestamptz default now()
);

alter table public.risk_config enable row level security;
drop policy if exists "risk_config select" on public.risk_config;
create policy "risk_config select" on public.risk_config for select to authenticated using (true);
drop policy if exists "risk_config upsert" on public.risk_config;
create policy "risk_config upsert" on public.risk_config for all to authenticated using (true) with check (true);

insert into public.risk_config (key, value, label, category) values
  ('deduct_attendance_absent', 8,  '缺勤每次扣分（晚自习/学校/辅导/查寝）', 'deduct'),
  ('deduct_grade_below',       6,  '成绩低于阈值每科扣分', 'deduct'),
  ('deduct_fee_unpaid',        10, '欠费扣分', 'deduct'),
  ('deduct_doc_30',            5,  '证件≤30天临期扣分', 'deduct'),
  ('deduct_doc_14',            10, '证件≤14天临期扣分', 'deduct'),
  ('deduct_doc_7',             20, '证件≤7天临期扣分（且红）', 'deduct'),
  ('deduct_warning1',          10, '内部警告信第1封扣分', 'deduct'),
  ('deduct_warning2',          20, '内部警告信第2封再扣分', 'deduct'),
  ('grade_threshold',          60, '成绩低于此分计为低于阈值', 'threshold'),
  ('level_green_min',          85, '绿灯最低分（≥绿）', 'threshold'),
  ('level_red_below',          60, '红灯分数线（<红）', 'threshold'),
  ('attend_contract_line',     95, 'NFE合约出勤红线%（<红）', 'threshold'),
  ('attend_yellow_line',       97, '出勤黄灯线%（<黄）', 'threshold'),
  ('attend_school_line',       93, '学校出勤红线%（参考）', 'threshold'),
  ('school_warning_red_count', 3,  '学校警告信红线张数（达劝退评估）', 'threshold'),
  ('internal_warning_red_count',3, '内部警告信红线张数', 'threshold'),
  ('consec_absent_red_days',   3,  '连续缺勤红线天数', 'threshold'),
  ('doc_expiry_red_days',      7,  '证件临期红线天数', 'threshold')
on conflict (key) do nothing;
