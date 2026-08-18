-- 回填_学管归属_nz_advisor_id.sql
-- 来源：学生信息_2026-08-12.xlsx「新西兰顾问/学管」列（Ryan/ryan 归一）
-- 口径：显式赋值（该列此前为空），未分配的 17 人保持 NULL —— 仅 admin 可见
begin;
  -- Gris：12 人 —— 郑王景怡、陈祺、李锐、陈亦凡、沈豪、葛书妍、占小诺、龚昊宇、冯琪、赵紫萱、张希珃、陈秋彤
  update students_info set nz_advisor_id = '387eb85b-d3fb-4642-a783-955da649de89' where nfe_no in (1, 16, 17, 18, 20, 23, 24, 25, 33, 43, 48, 59);
  -- Krystal：4 人 —— 杨期麟、李祎鸣、吴奕辉、楼子萱
  update students_info set nz_advisor_id = '8d9e251c-d811-4ef2-a9d3-1b8e21b838c4' where nfe_no in (2, 3, 13, 19);
  -- Leia：15 人 —— 赵思涵、李元、张祺俊、周继翀、葛晨曦、李宗泽、王梓苹、张馨元、李菲、范文嘉、陈几何、丁可莹、张铄、沈永欢、张可嘉
  update students_info set nz_advisor_id = '6e842aa2-eeca-493b-959e-76769ee68d3a' where nfe_no in (32, 34, 35, 36, 37, 38, 39, 40, 41, 42, 63, 64, 65, 66, 67);
  -- Ryan：20 人 —— 林士剀、杨菡睿、汤佳琦、陶政言、梁钦舒、陈雅蓁、姜茗浩、叶羽萱、谢来格、朱锶语、王新然、葛蕴瑶、鲁启承、周和璇、沈思妤、郑楚凡、虞霖涛、王栩哲、高一菲、蔡佳虹
  update students_info set nz_advisor_id = '2fd3da6d-60c5-4ee8-838b-bfb802337c14' where nfe_no in (8, 10, 44, 45, 46, 47, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 60, 61, 62, 68);
commit;
