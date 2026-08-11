-- ============================================================
-- 阶段2a · 补录（数据源：动态表格_nfe.xlsx）
-- 已处理：
--   · 「吴弈辉」→「吴奕辉」（表格错别字，库与《本项目学生名单》均为「奕」）
--   · 剔除占位行「潜在男生」
--   · 剔除四项全空的行
-- 原则：只填空、不覆盖（每条 update 带 xxx is null），库比表格准。
-- ============================================================

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
),
m as (
  select s.*, p.id as sid,
         si.city is null as c0, si.market_source is null as m0,
         si.advisor is null as a0, si.source_school is null as s0
  from src s
  left join public.profiles p on p.full_name = s.name and p.role='student'
  left join public.students_info si on si.student_id = p.id
)
select '① 匹配不上·需人工核对' as "区块", name as "姓名", '' as "将写入"
from m where sid is null
union all
select '② 将写入', name,
       concat_ws(' ',
         case when c0 and city    is not null then '城市' end,
         case when m0 and market  is not null then '来源' end,
         case when a0 and advisor is not null then '顾问' end,
         case when s0 and school  is not null then '学校' end)
from m where sid is not null
  and ((c0 and city is not null) or (m0 and market is not null)
    or (a0 and advisor is not null) or (s0 and school is not null))
union all
select '③ 无需写入(已有值)', name, ''
from m where sid is not null
  and not ((c0 and city is not null) or (m0 and market is not null)
        or (a0 and advisor is not null) or (s0 and school is not null))
union all
select '④ 汇总', '表格有效行 ' || (select count(*)::text from src),
       '匹配成功 ' || (select count(*)::text from m where sid is not null)
order by 1,2;
