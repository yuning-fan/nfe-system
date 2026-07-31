-- 老生数据导入所需字段：城市 / 市场来源 / 顾问
-- 三者都是每生静态属性（招生侧登记信息），与 students_info 既有的档案字段同组，
-- 因此直接加列而不另建表。市场来源不复用 student_enrollments.source
-- （那是 enrollment_source 枚举 green_channel|agent，装不下「名校转住宿」「二代转名校」这类值）。

alter table public.students_info add column if not exists city text;           -- 生源城市，如 杭州 / 宁波 / 苏州 / 上海
alter table public.students_info add column if not exists market_source text;  -- 市场来源，如 名校 / 名校转住宿 / 二代转名校 / 绿通转名校 / 高端+住宿
alter table public.students_info add column if not exists advisor text;        -- 顾问，如 Tracy / 陈希越 / 二代

comment on column public.students_info.city is '生源城市（国内），如 杭州';
comment on column public.students_info.market_source is '市场来源渠道，自由文本；与 student_enrollments.source 枚举无关';
comment on column public.students_info.advisor is '负责顾问姓名/代号，如 Tracy';
