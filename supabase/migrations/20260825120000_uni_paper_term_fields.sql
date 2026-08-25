-- 大学阶段（奥大）paper 支持
-- 1) 科目区分学年/学期：奥大同一门 paper 每学期开一次、日期各不相同，
--    靠 year + semester 区分，而不是把「(S2 2026)」塞进 subject_name。
-- 2) 考核节点补 due_time / note：原先 due_date 只有日期，
--    17:00 / 15:00 这类非 23:59 的截止时间、以及大纲待确认事项无处安放。

alter table public.program_subjects add column if not exists year smallint;
alter table public.program_subjects add column if not exists semester text;

comment on column public.program_subjects.year is '开课学年，如 2026；预科等不分学期的科目留空';
comment on column public.program_subjects.semester is '开课学期：S1(2-6月) / S2(7-11月) / SS(暑期)；留空=不分学期';

alter table public.academic_milestones add column if not exists due_time time;
alter table public.academic_milestones add column if not exists note text;

comment on column public.academic_milestones.due_time is '当天截止时间；留空按 23:59 理解';
comment on column public.academic_milestones.note is '备注：提交形式 / 大纲待确认事项 / 迟交规则等';
