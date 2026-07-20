-- ============================================================
-- 升学信息导入 · 第 1 步：匹配预检（只读，不改任何数据）
-- 按【中文名】匹配（english_name 为空，原按拼音匹配的方案作废）。
-- 用法：整段贴进 Supabase SQL Editor 运行，确认 33 条全部「✅ 唯一匹配」。
-- ============================================================
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
select
  i.cn_name                                    as "中文名",
  i.en_name                                    as "拼音名",
  i.up_id                                      as "UP学号",
  case
    when count(s.student_id) = 0 then '❌ 没匹配上'
    when count(s.student_id) > 1 then '⚠️ 重名歧义（' || count(s.student_id) || ' 条）'
    else '✅ 唯一匹配'
  end                                          as "结果",
  max(s.target_degree)                         as "现有目标专业（将被覆盖）",
  i.degree                                     as "将写入的专业"
from incoming i
left join public.profiles p
  on trim(p.full_name) = i.cn_name and p.role = 'student'
left join public.students_info s on s.student_id = p.id
group by i.cn_name, i.en_name, i.up_id, i.degree
order by 4 desc, 1;

-- 反向核对：系统里有、但不在本次导入名单中的学生（预期 4 位，不会被改动）
select p.full_name as "不在导入名单中的学生"
from public.students_info s
join public.profiles p on p.id = s.student_id
where trim(p.full_name) not in ('陈几何', '陈秋彤', '陈雅蓁', '丁可莹', '范文嘉', '高一菲', '葛晨曦', '葛蕴瑶', '姜茗浩', '李菲', '李元', '李宗泽', '梁钦舒', '鲁启承', '沈思妤', '沈永欢', '汤佳琦', '陶政言', '王新然', '王栩哲', '王梓苹', '谢来格', '叶羽萱', '虞霖涛', '张祺俊', '张铄', '张馨元', '张希珃', '赵紫萱', '郑楚凡', '周和璇', '周继翀', '朱锶语')
order by 1;
