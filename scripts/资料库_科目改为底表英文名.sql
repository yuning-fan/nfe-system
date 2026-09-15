-- ============================================================
-- 资料库科目统一为科目底表英文名（2026-09-15）
-- 背景：资料库原用中文科目清单，与 program_subjects.subject_name（英文）对不上，
--       科目管理页「资料 N 份」恒为 0、跳转筛选为空。
-- 幂等：只改仍是中文旧值的行，可重复运行。
-- ============================================================

-- 标错科目的一条：标题是统计，原标为会计（用户确认改为统计）
update public.resources set subject = 'Statistics'
 where title = '统计P1&2 汇总&图表 复习' and subject in ('会计', 'Accounting');

-- 中文旧值 → 底表英文名
update public.resources set subject = case subject
    when '统计'        then 'Statistics'
    when '会计'        then 'Accounting'
    when '数学-微积分' then 'Calculus'
    when '化学'        then 'Chemistry'
    when '物理'        then 'Physics'
    when '生物'        then 'Biology'
    when '经济'        then 'Economics'
    when '地理'        then 'Geography'
    when '设计'        then 'Design'
    when '艺术史'      then 'Art History'
    when '英语（EAP）' then 'EAP (English for Academic Purposes)'
    else subject end
 where subject in ('统计','会计','数学-微积分','化学','物理','生物','经济','地理','设计','艺术史','英语（EAP）');

-- 自查：应全部为底表科目名或「通用/跨科」
select r.subject as "科目", count(*) as "条数",
       exists (select 1 from public.program_subjects ps where ps.subject_name = r.subject) as "在底表中"
  from public.resources r group by r.subject order by 2 desc;
