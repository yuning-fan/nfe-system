-- ============================================================
-- grade_records 加「同一学生 + 同一考核节点」唯一约束
--
-- 背景：这张表原本只有主键 id，没有任何唯一约束。单条录入时前端靠「已加载的记录里找得到
--   就 update、找不到就 insert」判断，能凑合；但巡查老师要在晚自习批量录分（一屏几十个
--   输入框、一次保存），重复点击或网络重试就会给同一个学生同一个节点插出两条分数，
--   而总评是按节点权重加权算的 —— 多出一条就算错，且界面上不一定看得出来。
--
-- 同类教训：nfe_no 跳号、attendance_persuasions 重复行，都是「只靠前端小心、DB 无兜底」。
--
-- 用完整（非局部）唯一索引，因为 PostgREST 的 upsert(on_conflict=student_id,milestone_id)
-- 需要能推断出仲裁索引；局部索引带谓词，推断不出来（daily_checks 那个局部索引就用不了 upsert）。
-- NULL 在唯一索引里互不相等，所以万一有 milestone_id 为空的行也不会被挡（当前 49 行全都有）。
--
-- 应用前已确认：同一学生同一节点无重复行。
-- ============================================================

create unique index if not exists uq_grade_records_student_milestone
  on public.grade_records(student_id, milestone_id);
