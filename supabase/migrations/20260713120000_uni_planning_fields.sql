-- 升学规划字段：UP 预科学号 / 奥大学号 / 目标专业 / offer 情况
-- 落在 students_info（与既有 target_university 同组，学生详情页「留学目标」展示与编辑）。
-- 暂不单独建升学规划模块：当前这些是每生静态属性而非流程；
-- 日后需要跨学生汇总时，升学规划页直接读这几列即可（参照文件矩阵做法）。

alter table public.students_info add column if not exists up_student_id text;    -- UP 预科学号（27 开头，offer 文件名中的编号）
alter table public.students_info add column if not exists uoa_student_id text;   -- 奥克兰大学学号（录取后取得）
alter table public.students_info add column if not exists target_degree text;    -- 目标专业 / 学位
alter table public.students_info add column if not exists offer_status text;     -- offer 情况（如「齐全」）

comment on column public.students_info.up_student_id is 'UP 预科学号，27 开头';
comment on column public.students_info.uoa_student_id is '奥克兰大学学号，录取后取得';
comment on column public.students_info.target_degree is '目标专业/学位，如 Bachelor of Commerce: Accounting';
comment on column public.students_info.offer_status is 'offer 情况，如 齐全';
