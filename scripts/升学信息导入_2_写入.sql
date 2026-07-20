-- ============================================================
-- 升学信息导入 · 第 2 步：写入（会改数据！）
-- ⚠️ 前提 1：先跑「第 1 步 预检」，确认 33 条全是「✅ 唯一匹配」。
-- ⚠️ 前提 2：先执行迁移 supabase/migrations/20260713120000_uni_planning_fields.sql
-- 安全设计：① 按中文名精确匹配，重名/未匹配一律跳过；② 空值写 NULL；
--           ③ 事务包裹，最后打印条数——不是 33 就 rollback。
-- ============================================================
begin;

with incoming(cn_name, en_name, up_id, uoa_id, offer, degree) as (values
  ('陈几何', 'Chen Jihe', '270991279', '', '', 'Bachelor of Music:Songcraft and Music Production'),
  ('陈秋彤', 'Chen Qiutong', '270926191', '', '', 'Bachelor of Health Sciences-Community Health'),
  ('陈雅蓁', 'Chen Yazhen', '270756347', '', '', 'Bachelor of Science:Psychology'),
  ('丁可莹', 'Ding Keying', '270989683', '', '', 'Bachelor of Science-Geography'),
  ('范文嘉', 'Fan Wenjia', '270992976', '', '', 'Bachelor of Design'),
  ('高一菲', 'Gao Yifei', '270752085', '750417739', '', 'Bachelor of Science:Data Science'),
  ('葛晨曦', 'Ge Chenxi', '270989699', '', '', 'Bachelor of Engineering (Honours)-Engineering Part I'),
  ('葛蕴瑶', 'Ge Yunyao', '270755635', '826197526', '齐全', 'Bachelor of Commerce-Economics'),
  ('姜茗浩', 'Jiang Minghao', '270755345', '', '', 'Bachelor of Commerce: Marketing & Business Analytics'),
  ('李菲', 'Li Fei', '270989706', '295295500', '', 'Bachelor of Design/Bachelor of Science Conjoint - Computer science'),
  ('李元', 'Li Yuan', '270989708', '', '', 'Bachelor of Commerce: Operations and Supply Chain Management'),
  ('李宗泽', 'Li Zongze', '270989715', '841473082', '', 'Bachelor of Engineering (Honours)-Engineering Part I'),
  ('梁钦舒', 'Liang Qinshu', '270756749', '', '', 'Bachelor of Science:Information and Technology Management'),
  ('鲁启承', 'Lu Qicheng', '270752098', '', '', 'Bachelor of Sport, Health & Physical Education -Sport, Health & PE'),
  ('沈思妤', 'Shen Siyu', '270756343', '', '', 'Bachelor of Science:Data Science'),
  ('沈永欢', 'Shen Yonghuan', '270992969', '', '', 'Bachelor of Science-Computer Science'),
  ('汤佳琦', 'Tang Jiaqi', '270756355', '', '', 'Bachelor of Commerce: Accounting'),
  ('陶政言', 'Tao Zhengyan', '270755370', '143146076', '', 'Bachelor of Commerce: Business Analytics & Supply Chain Management'),
  ('王新然', 'Wang Xinran', '270752158', '', '', 'Bachelor of Nursing'),
  ('王栩哲', 'Wang Xuzhe', '270926094', '', '', 'Bachelor of Science:Data Science'),
  ('王梓苹', 'Wang Ziping', '270991266', '613566623', '', 'Bachelor of Engineering (Honours)-Engineering Part I-Civil Engineering'),
  ('谢来格', 'Xie Laige', '270752210', '', '', 'Bachelor of Arts: TESOL & English'),
  ('叶羽萱', 'Ye Yuxuan', '270752250', '', '', 'Bachelor of Commerce:Marketing'),
  ('虞霖涛', 'Yu Lintao', '270926183', '', '', 'Bachelor of Science:Data Science'),
  ('张祺俊', 'Zhang Qijun', '270991023', '637750732', '', 'Bachelor of Engineering (Honours)-Engineering Part I'),
  ('张铄', 'Zhang Shuo', '270989728', '', '', 'Bachelor of Architectural Studies-Architecture'),
  ('张馨元', 'Zhang Xinyuan', '270989736', '', '', 'Bachelor of Design/ Bachelor of Science Conjoint - Computer science'),
  ('张希珃', 'Zhang Xiran', '270752265', '', '', 'Bachelor of Commerce: Accounting'),
  ('赵紫萱', 'Zhao Zixuan', '270752279', '', '', 'Bachelor of Commerce: Accounting'),
  ('郑楚凡', 'Zheng Chufan', '270755486', '', '', 'Bachelor of Science-Statistics'),
  ('周和璇', 'Zhou Hexuan', '270752322', '513745536', '', 'Bachelor of Commerce:Business Analytics'),
  ('周继翀', 'Zhou Jichong', '270991431', '', '', 'Bachelor of Engineering (Honours)-Engineering Part I'),
  ('朱锶语', 'Zhu Siyu', '270755378', '', '', 'Bachelor of Engineering (Honours)-Engineering Part I')
)
, matched as (
  select i.*, p.id as student_id
  from incoming i
  join public.profiles p
    on trim(p.full_name) = i.cn_name and p.role = 'student'
), unique_matched as (        -- 只保留唯一匹配，重名整条丢弃
  select * from matched
  where cn_name in (select cn_name from matched group by cn_name having count(*) = 1)
)
update public.students_info s
set up_student_id  = nullif(m.up_id, ''),
    uoa_student_id = nullif(m.uoa_id, ''),
    target_degree  = nullif(m.degree, ''),
    offer_status   = nullif(m.offer, ''),
    english_name   = coalesce(nullif(trim(s.english_name), ''), m.en_name)  -- 顺带补英文名，方便日后按拼音导入
from unique_matched m
where s.student_id = m.student_id;

select count(*) as "已写入目标专业的学生数（应为 33）"
from public.students_info where target_degree is not null;

commit;
-- 若上面数字不是 33，把 commit; 换成 rollback; 重跑排查。
