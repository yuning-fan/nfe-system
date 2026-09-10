-- ============================================================
-- 查询：指定 15 名学生的 姓名 / 家庭住址 / 家长一方姓名 / 家长一方电话
--
-- 数据来源说明：
--   库里没有独立的家长表，也不区分父/母。家长信息存在
--   students_info.emergency_contact_name / _phone（紧急联系人，实际填的就是家长），
--   住址存在 students_info.home_address。
--
--   这两个字段的实际存法是「父母合并成一个串」：
--     name  = '王瑜珑（父）/叶黎霞（母）'
--     phone = '13600511421（父）/13867453182（母）'
--   本查询按 '/' 拆开取**第一段（通常是父方）**，并剥掉「（父）/（母）」标注；
--   第一段为空时自动回退到第二段。parent_side 列标出取到的是哪一方。
--   字面的 '无' 按缺失处理（输出 NULL）。
--   原始合并串保留在最后两列，便于核对或改取另一方。
-- ============================================================
WITH wanted(seq, gender_label, full_name) AS (VALUES
  ( 1,'男','郑楚凡'), ( 2,'男','鲁启承'), ( 3,'男','王栩哲'), ( 4,'男','张可嘉'),
  ( 5,'女','沈思妤'), ( 6,'女','周和璇'), ( 7,'女','高一菲'), ( 8,'女','张馨元'),
  ( 9,'女','葛蕴瑶'), (10,'女','范文嘉'), (11,'女','陈秋彤'), (12,'女','谢来格'),
  (13,'女','梁钦舒'), (14,'女','李菲'),   (15,'女','葛书妍')
),
src AS (
  SELECT w.seq, w.gender_label, w.full_name,
         p.id AS student_id,
         nullif(btrim(si.home_address), '')              AS home_address,
         nullif(btrim(si.emergency_contact_name),  '无') AS raw_name,
         nullif(btrim(si.emergency_contact_phone), '无') AS raw_phone
    FROM wanted w
    LEFT JOIN profiles      p  ON p.full_name = w.full_name AND p.role = 'student'
    LEFT JOIN students_info si ON si.student_id = p.id
),
split AS (
  SELECT s.*,
         -- 剥掉「（父）」「（母）」这类全角/半角括号标注
         nullif(btrim(regexp_replace(split_part(s.raw_name,  '/', 1), '\s*[（(][^）)]*[）)]\s*', '', 'g')), '') AS name_1,
         nullif(btrim(regexp_replace(split_part(s.raw_name,  '/', 2), '\s*[（(][^）)]*[）)]\s*', '', 'g')), '') AS name_2,
         nullif(btrim(regexp_replace(split_part(s.raw_phone, '/', 1), '\s*[（(][^）)]*[）)]\s*', '', 'g')), '') AS phone_1,
         nullif(btrim(regexp_replace(split_part(s.raw_phone, '/', 2), '\s*[（(][^）)]*[）)]\s*', '', 'g')), '') AS phone_2,
         (regexp_match(split_part(s.raw_name, '/', 1), '[（(]([父母])[）)]'))[1] AS side_1,
         (regexp_match(split_part(s.raw_name, '/', 2), '[（(]([父母])[）)]'))[1] AS side_2
    FROM src s
)
SELECT
  seq                                        AS "序号",
  gender_label                               AS "性别",
  full_name                                  AS "学生姓名",
  home_address                               AS "家庭住址",
  coalesce(name_1,  name_2)                  AS "家长姓名",
  coalesce(phone_1, phone_2)                 AS "家长电话",
  CASE WHEN name_1 IS NOT NULL THEN coalesce(side_1, '未标注')
       WHEN name_2 IS NOT NULL THEN coalesce(side_2, '未标注')
  END                                        AS "取自",
  CASE WHEN student_id IS NULL                     THEN '❗库中无此人'
       WHEN home_address IS NULL
        AND coalesce(name_1, name_2) IS NULL       THEN '❗住址与家长均缺失'
       WHEN home_address IS NULL                   THEN '⚠️ 缺住址'
       WHEN coalesce(name_1, name_2) IS NULL       THEN '⚠️ 缺家长信息'
       WHEN coalesce(phone_1, phone_2) IS NULL     THEN '⚠️ 缺电话'
       ELSE '' END                           AS "备注",
  raw_name                                   AS "原始_联系人字段",
  raw_phone                                  AS "原始_电话字段"
FROM split
ORDER BY seq;
