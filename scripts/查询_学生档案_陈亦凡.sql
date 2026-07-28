-- ============================================================
-- 学生档案调取：陈亦凡（只读）
-- 用法：整个文件贴进 Supabase SQL Editor，逐段运行（每段一个结果集）。
-- 换人：把所有 '陈亦凡' 替换成目标姓名即可。
-- ============================================================

-- 【0】确认唯一性（若返回多行，说明重名，先记下正确的 id）
select id, full_name, role, phone, status, created_at
from public.profiles
where full_name = '陈亦凡';

-- 【1】基本信息 + 学籍 + 风险
select p.full_name as "姓名", si.english_name as "英文名",
       si.date_of_birth as "生日",
       extract(year from age(current_date, si.date_of_birth))::int as "当前年龄",
       si.passport_number as "护照", si.arrival_date as "抵新日期",
       si.school_name as "在读学校", si.source_school as "生源校",
       si.english_level as "英语水平", si.school_attendance_rate as "校出勤率",
       si.target_university as "目标大学", si.target_degree as "目标学位",
       si.offer_status as "offer状态", si.uoa_student_id as "UoA学号",
       si.risk_level as "风险等级", si.total_risk_score as "风险分",
       si.emergency_contact_name as "紧急联系人", si.emergency_contact_phone as "联系电话",
       si.home_address as "家庭地址", si.health_notes as "健康备注"
from public.profiles p
join public.students_info si on si.student_id = p.id
where p.full_name = '陈亦凡';

-- 【2】报名/项目记录
select pr.name as "项目", e.cohort_name as "班期", e.start_date as "开始",
       e.end_date as "结束", e.status as "状态", e.source as "来源"
from public.student_enrollments e
join public.profiles p on p.id = e.student_id
left join public.programs pr on pr.id = e.program_id
where p.full_name = '陈亦凡'
order by e.start_date;

-- 【3】住宿
select d.building_name as "楼栋", d.room_number as "房间", d.capacity as "床位数",
       da.start_date as "入住", da.end_date as "退宿", da.is_active as "在住"
from public.dorm_assignments da
join public.profiles p on p.id = da.student_id
join public.dorms d on d.id = da.dorm_id
where p.full_name = '陈亦凡'
order by da.start_date desc;

-- 【4】DCG 监护流程
select c.stage as "阶段", g.full_name as "指定监护人", c.offer_date as "offer日",
       c.payment_date as "缴费日", c.host_visit_date as "家访日",
       c.archived_date as "存档日", c.notes as "备注"
from public.dcg_cases c
join public.profiles p on p.id = c.student_id
left join public.profiles g on g.id = c.guardian_staff_id
where p.full_name = '陈亦凡';

-- 【5】证件文档
select doc.doc_type as "类型", doc.title as "标题", doc.issue_date as "签发",
       doc.expiry_date as "到期", doc.status as "状态",
       case when doc.expiry_date < current_date then '⚠️已过期'
            when doc.expiry_date < current_date + 90 then '⚠️90天内到期' else 'ok' end as "提醒"
from public.student_documents doc
join public.profiles p on p.id = doc.student_id
where p.full_name = '陈亦凡'
order by doc.expiry_date nulls last;

-- 【6】缴费
select f.* from public.student_fees f
join public.profiles p on p.id = f.student_id
where p.full_name = '陈亦凡';

-- 【7】成绩（近30条）
select c.name as "科目", g.score as "分数", g.score_type as "类型",
       g.status as "状态", g.note as "备注", g.recorded_at as "记录时间"
from public.grade_records g
join public.profiles p on p.id = g.student_id
left join public.courses c on c.id = g.course_id
where p.full_name = '陈亦凡'
order by g.recorded_at desc limit 30;

-- 【8】违纪 / 警告信
select v.* from public.violation_logs v
join public.profiles p on p.id = v.student_id
where p.full_name = '陈亦凡' order by 1 desc limit 20;

select w.* from public.warning_letters w
join public.profiles p on p.id = w.student_id
where p.full_name = '陈亦凡' order by 1 desc limit 20;

-- 【9】用药
select m.name as "药名", m.usage as "用法", m.stock as "库存",
       m.daily_time as "定时", m.is_active as "生效", m.notes as "备注"
from public.medications m
join public.profiles p on p.id = m.student_id
where p.full_name = '陈亦凡';
