-- ============================================================
-- 写入 NFE 学号（共 68 人）
-- 顺序依据：《本项目学生名单》主表；方跃衡插在留楷哲后、龚昊宇插在占小诺后；
--           王天宁按入读时间(2024-03)插在沈豪之后；张可嘉/蔡佳虹为9月预科新生，置于末尾。
-- 原则：号码 = 进项目先后，退出者占号，不回收、不重排。
-- 幂等：只给 nfe_no 为空的学生赋号；已编号的不动。可重复运行。
-- 前置：需先跑 migration 20260811100000_student_nfe_no.sql
-- ============================================================
DO $NFE$
DECLARE
  r record; v_set int := 0; v_skip int := 0; v_miss int := 0; v_taken int := 0;
BEGIN
  -- 前置检查：必须先跑 migration 20260811100000_student_nfe_no.sql
  IF NOT EXISTS (
    select 1 from information_schema.columns
     where table_schema='public' and table_name='students_info' and column_name='nfe_no'
  ) THEN
    RAISE EXCEPTION '❌ students_info.nfe_no 不存在。请先执行 supabase/migrations/20260811100000_student_nfe_no.sql';
  END IF;
  IF NOT EXISTS (select 1 from pg_class where relname='students_nfe_no_seq' and relkind='S') THEN
    RAISE EXCEPTION '❌ 序列 students_nfe_no_seq 不存在。请先执行 migration。';
  END IF;

  FOR r IN
    select * from (values
    (1,'郑王景怡'),
    (2,'杨期麟'),
    (3,'李祎鸣'),
    (4,'杨婉宁'),
    (5,'徐靖涵'),
    (6,'王涵禹'),
    (7,'竹弘毅'),
    (8,'林士剀'),
    (9,'汪愉皓'),
    (10,'杨菡睿'),
    (11,'林韦多'),
    (12,'张滢'),
    (13,'吴奕辉'),
    (14,'留楷哲'),
    (15,'方跃衡'),
    (16,'陈祺'),
    (17,'李锐'),
    (18,'陈亦凡'),
    (19,'楼子萱'),
    (20,'沈豪'),
    (21,'王天宁'),
    (22,'徐泓森'),
    (23,'葛书妍'),
    (24,'占小诺'),
    (25,'龚昊宇'),
    (26,'廖添瑞'),
    (27,'祝一航'),
    (28,'阮兰媛'),
    (29,'冯宸易'),
    (30,'陈帅赫'),
    (31,'彭奕程'),
    (32,'赵思涵'),
    (33,'冯琪'),
    (34,'李元'),
    (35,'张祺俊'),
    (36,'周继翀'),
    (37,'葛晨曦'),
    (38,'李宗泽'),
    (39,'王梓苹'),
    (40,'张馨元'),
    (41,'李菲'),
    (42,'范文嘉'),
    (43,'赵紫萱'),
    (44,'汤佳琦'),
    (45,'陶政言'),
    (46,'梁钦舒'),
    (47,'陈雅蓁'),
    (48,'张希珃'),
    (49,'姜茗浩'),
    (50,'叶羽萱'),
    (51,'谢来格'),
    (52,'朱锶语'),
    (53,'王新然'),
    (54,'葛蕴瑶'),
    (55,'鲁启承'),
    (56,'周和璇'),
    (57,'沈思妤'),
    (58,'郑楚凡'),
    (59,'陈秋彤'),
    (60,'虞霖涛'),
    (61,'王栩哲'),
    (62,'高一菲'),
    (63,'陈几何'),
    (64,'丁可莹'),
    (65,'张铄'),
    (66,'沈永欢'),
    (67,'张可嘉'),
    (68,'蔡佳虹')
    ) as t(no, name)
    order by no
  LOOP
    -- 姓名定位（学生角色；含已退出的 status=0）
    IF NOT EXISTS (select 1 from public.profiles p
                    where p.full_name = r.name and p.role='student') THEN
      RAISE NOTICE '⚠️ 库里找不到：% （号 % 空置）', r.name, r.no;
      v_miss := v_miss + 1; CONTINUE;
    END IF;

    -- 该号已被别人占用则跳过，避免撞唯一约束
    IF EXISTS (select 1 from public.students_info si
                join public.profiles p on p.id = si.student_id
               where si.nfe_no = r.no and p.full_name <> r.name) THEN
      RAISE NOTICE '⚠️ 号 % 已被他人占用，跳过 %', r.no, r.name;
      v_taken := v_taken + 1; CONTINUE;
    END IF;

    UPDATE public.students_info si
       SET nfe_no = r.no
      FROM public.profiles p
     WHERE p.id = si.student_id
       AND p.full_name = r.name AND p.role='student'
       AND si.nfe_no IS NULL;          -- 只补空，已编号的不覆盖

    IF FOUND THEN v_set := v_set + 1; ELSE v_skip := v_skip + 1; END IF;
  END LOOP;

  RAISE NOTICE '✅ 赋号 % / 已有号跳过 % / 找不到 % / 号被占 %',
               v_set, v_skip, v_miss, v_taken;

  -- 序列推到已用最大号之后，新建学生从下一号开始
  PERFORM setval('public.students_nfe_no_seq',
                 coalesce((select max(nfe_no) from public.students_info), 0) + 1,
                 false);
  RAISE NOTICE '序列已置为下一可用号：%',
               (select last_value from public.students_nfe_no_seq);
END $NFE$;

-- ===== 自查：全部编号 =====
select si.nfe_no as "号",
       'NFE-' || lpad(si.nfe_no::text, 6, '0') as "学号",
       p.full_name as "姓名",
       case p.status when 1 then '在读' else '非在读' end as "状态"
from public.students_info si
join public.profiles p on p.id = si.student_id
where si.nfe_no is not null
order by si.nfe_no;

-- ===== 自查：未编号的学生（应为 0）=====
select p.full_name as "未编号学生"
from public.profiles p
join public.students_info si on si.student_id = p.id
where p.role='student' and si.nfe_no is null;
