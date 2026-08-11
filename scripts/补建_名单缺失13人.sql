-- ============================================================
-- 补建《本项目学生名单(1).xlsx》上有、系统里没有的 13 人
-- 排除 XU Hongsen（已确认＝系统内「徐泓森」，缴费表用了拼音写法）
-- 状态：11 名已退出项目者 profiles.status=0（非在读），3 名散客中在读的为 1
--       v_student_overview 有 status=1 过滤，status=0 的不会进在读总览
-- 幂等：按姓名查重，已存在则跳过；可重复运行
-- 注意：profiles.id 无 auth.users 外键约束，故可直接用 gen_random_uuid() 建档
-- ============================================================
DO $$
DECLARE
  r record; v_id uuid; v_new int := 0; v_skip int := 0;
BEGIN
  FOR r IN
    select * from (values
  ('徐靖涵','female','出项目',0,null),
  ('杨婉宁','female','出项目',0,null),
  ('林韦多','male','出项目',0,null),
  ('汪愉皓','female','出项目',0,null),
  ('竹弘毅','male','出项目',0,null),
  ('冯宸易','male','绿通-出项目',0,null),
  ('廖添瑞','male','绿通-出项目',0,null),
  ('彭奕程','female','绿通-出项目',0,null),
  ('祝一航','male','绿通-出项目',0,null),
  ('阮兰媛','female','绿通-出项目',0,null),
  ('陈帅赫','male','绿通-出项目',0,null),
  ('楼子萱','female','散客',1,null),
  ('王天宁','female','散客',1,'浙江宁波理工学院')
    ) as t(name, gender, roster_status, acct_status, school)
  LOOP
    -- 查重：同名学生已存在则跳过
    IF EXISTS (select 1 from public.profiles p
                where p.full_name = r.name and p.role = 'student') THEN
      RAISE NOTICE '⏭  已存在，跳过：%', r.name;
      v_skip := v_skip + 1;
      CONTINUE;
    END IF;

    v_id := gen_random_uuid();
    INSERT INTO public.profiles (id, role, full_name, status)
    VALUES (v_id, 'student', r.name, r.acct_status);

    -- profiles 上有 trg_auto_create_students_info 触发器，插入 profile 时
    -- 已自动建好 students_info 空行，故这里用 upsert 而非 insert
    INSERT INTO public.students_info (student_id, gender, source_school)
    VALUES (v_id, r.gender, r.school)
    ON CONFLICT (student_id) DO UPDATE SET
      gender        = coalesce(public.students_info.gender,        excluded.gender),
      source_school = coalesce(public.students_info.source_school, excluded.source_school);

    v_new := v_new + 1;
    RAISE NOTICE '✅ 已建 %  性别=%  名单状态=%  账号状态=%',
                 r.name, coalesce(r.gender,'?'), r.roster_status, r.acct_status;
  END LOOP;

  RAISE NOTICE '完成：新建 % 人，跳过 % 人', v_new, v_skip;
END $$;

-- ===== 自查 =====
select p.full_name as "姓名",
       case p.status when 1 then '在读' else '非在读' end as "账号状态",
       si.gender as "性别", si.source_school as "国内学校",
       (select count(*) from public.student_enrollments e where e.student_id = p.id) as "报名数"
from public.profiles p
left join public.students_info si on si.student_id = p.id
where p.role = 'student'
  and p.full_name in ('徐靖涵','杨婉宁','林韦多','汪愉皓','竹弘毅','冯宸易','廖添瑞','彭奕程','祝一航','阮兰媛','陈帅赫','楼子萱','王天宁')
order by p.status desc, p.full_name;

-- 学生总数复核
select count(*) filter (where status = 1) as "在读",
       count(*) filter (where status = 0) as "非在读",
       count(*) as "合计"
from public.profiles where role = 'student';
