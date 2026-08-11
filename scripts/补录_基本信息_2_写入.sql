-- ============================================================
-- 阶段2a · 补录（数据源：动态表格_nfe.xlsx）
-- 已处理：
--   · 「吴弈辉」→「吴奕辉」（表格错别字，库与《本项目学生名单》均为「奕」）
--   · 剔除占位行「潜在男生」
--   · 剔除四项全空的行
-- 原则：只填空、不覆盖（每条 update 带 xxx is null），库比表格准。
-- ============================================================

DO $DOBLK$
DECLARE
  v_city int:=0; v_market int:=0; v_advisor int:=0; v_school int:=0; v_miss int:=0; r record;
BEGIN
  FOR r IN
    with src(name, city, market, advisor, school) as (values
    ('杨期麟','杭州','名校转住宿','Tracy','杭州学军中学'),
    ('沈豪','杭州','名校','Tracy','Clarkson secondary school'),
    ('林士剀','宁波','名校','Tracy','浙江省奉化中学'),
    ('李锐','杭州','名校','Tracy','杭州市源清中学'),
    ('陈亦凡','苏州','名校','Tracy','苏十中'),
    ('龚昊宇','杭州','二代转名校','二代','中山市三鑫学校'),
    ('占小诺','杭州','绿通转名校','陈希越','杭二中'),
    ('葛书妍','宁波','名校','Tracy','镇海中学'),
    ('郑王景怡','杭州','名校转住宿','Tracy','杭州学军中学'),
    ('李祎鸣','杭州','高端+住宿','Tracy','杭州学军中学'),
    ('吴奕辉','宁波','高端+住宿','Tracy','宁波外国语/Meadowvale Secondary School高三'),
    ('杨菡睿','宁波','名校','Tracy','宁波二中'),
    ('陈祺','上海','二代转名校','二代','上海市市南中学'),
    ('郑楚凡','杭州','绿通','陈希越','杭二中'),
    ('鲁启承','杭州','绿通','陈希越','杭二中'),
    ('王栩哲','杭州','绿通','陈希越','杭二中'),
    ('李元','苏州','绿通','Dora','苏十中'),
    ('沈思妤','杭州','绿通','陈希越','杭二中'),
    ('张馨元','苏州','绿通','Dora','苏十中'),
    ('高一菲','杭州','绿通','陈希越','杭二中'),
    ('葛蕴瑶','杭州','绿通','陈希越','杭二中'),
    ('范文嘉','苏州','绿通','Dora','苏十中'),
    ('周和璇','杭州','绿通','陈希越','杭二中'),
    ('谢来格','杭州','绿通','陈希越','杭二中'),
    ('梁钦舒','杭州','绿通','陈希越','杭二中'),
    ('李菲','苏州','绿通','Dora','苏十中'),
    ('赵紫萱','杭州','绿通','陈希越','杭二中'),
    ('张希珃','杭州','绿通','陈希越','杭二中'),
    ('朱锶语','杭州','绿通','陈希越','杭二中'),
    ('汤佳琦','杭州','绿通','陈希越','杭二中'),
    ('叶羽萱','杭州','绿通','陈希越','杭二中'),
    ('李宗泽','苏州','绿通','Dora','苏十中'),
    ('周继翀','苏州','绿通','Dora','苏十中'),
    ('王梓苹','苏州','绿通','Dora','苏十中'),
    ('张祺俊','苏州','绿通','Dora','苏十中'),
    ('葛晨曦','苏州','绿通','Dora','苏十中'),
    ('王新然','杭州','绿通','陈希越','杭二中'),
    ('张铄','杭州','绿通','陈希越','杭外'),
    ('陈雅蓁','杭州','绿通','陈希越','杭二中'),
    ('赵思涵','杭州','名校转绿通','陈希越','杭外'),
    ('沈永欢','杭州','绿通','陈希越','杭外'),
    ('陶政言','杭州','绿通','陈希越','杭二中'),
    ('虞霖涛','杭州','绿通','陈希越','杭二中'),
    ('姜茗浩','杭州','绿通','陈希越','杭二中'),
    ('陈几何','杭州','绿通','陈希越','杭外'),
    ('陈秋彤','杭州','绿通','陈希越','杭二中'),
    ('冯琪','宁波','名校','Cathy','科技高级中学'),
    ('丁可莹','杭州','绿通转市场','陈希越','杭外')
    )
    select s.*, p.id as sid from src s
    left join public.profiles p on p.full_name = s.name and p.role='student'
  LOOP
    IF r.sid IS NULL THEN
      RAISE NOTICE '⚠️ 库里找不到：%', r.name; v_miss := v_miss + 1; CONTINUE;
    END IF;
    IF r.city IS NOT NULL THEN
      UPDATE public.students_info SET city=r.city WHERE student_id=r.sid AND city IS NULL;
      IF FOUND THEN v_city := v_city+1; END IF;
    END IF;
    IF r.market IS NOT NULL THEN
      UPDATE public.students_info SET market_source=r.market WHERE student_id=r.sid AND market_source IS NULL;
      IF FOUND THEN v_market := v_market+1; END IF;
    END IF;
    IF r.advisor IS NOT NULL THEN
      UPDATE public.students_info SET advisor=r.advisor WHERE student_id=r.sid AND advisor IS NULL;
      IF FOUND THEN v_advisor := v_advisor+1; END IF;
    END IF;
    IF r.school IS NOT NULL THEN
      UPDATE public.students_info SET source_school=r.school WHERE student_id=r.sid AND source_school IS NULL;
      IF FOUND THEN v_school := v_school+1; END IF;
    END IF;
  END LOOP;
  RAISE NOTICE '✅ 补录完成：城市 % / 市场来源 % / 顾问 % / 生源学校 % ；未匹配 %',
               v_city, v_market, v_advisor, v_school, v_miss;
END $DOBLK$;

-- 修补两处报名日期缺失（值取自 动态表格_nfe.xlsx）
update public.student_enrollments e
   set start_date = coalesce(e.start_date, date '2026-01-27'),
       end_date   = coalesce(e.end_date,   date '2027-01-24')
  from public.profiles p
 where p.id = e.student_id and p.full_name = '陈亦凡'
   and (e.start_date is null or e.end_date is null);

update public.student_enrollments e
   set start_date = date '2021-08-01'
  from public.profiles p, public.programs pr
 where p.id = e.student_id and pr.id = e.program_id
   and p.full_name = '吴奕辉' and pr.name ilike '%大学阶段%'
   and e.start_date is null;

-- 自查：填充率
select '城市' as "字段", count(*) filter (where city is not null)||' / '||count(*) as "填充" from public.students_info
union all select '市场来源', count(*) filter (where market_source is not null)||' / '||count(*) from public.students_info
union all select '顾问',     count(*) filter (where advisor is not null)||' / '||count(*) from public.students_info
union all select '生源学校', count(*) filter (where source_school is not null)||' / '||count(*) from public.students_info;
