-- 清除旧的测试住宿数据
DELETE FROM dorm_assignments;
DELETE FROM dorms;

-- ====================================================
-- 1. 注入真实公寓房间结构
-- ====================================================
-- 4B Tiverton Road (Krystal Hu 监管)
INSERT INTO dorms (building_name, room_number, capacity, room_status) VALUES
  ('4B Tiverton Road', '一层-A 双人间', 2, 'occupied'),    -- id=1: 占小诺 + 留楷哲
  ('4B Tiverton Road', '二层-A 单人间', 1, 'occupied'),    -- id=2: 吴奕辉
  ('4B Tiverton Road', '二层-B 单人间', 1, 'occupied'),    -- id=3: 王涵禹
  ('4B Tiverton Road', '二层-C 双人间', 2, 'occupied');    -- id=4: 陈祺 + 杨菡睿

-- 4 Tiverton Road (Ryan Wei 监管)
INSERT INTO dorms (building_name, room_number, capacity, room_status) VALUES
  ('4 Tiverton Road', '一层-A 单人间', 1, 'vacant'),       -- id=5: 空
  ('4 Tiverton Road', '二层-B 单人间', 1, 'occupied'),     -- id=6: 郑王景怡
  ('4 Tiverton Road', '二层-C 单人间', 1, 'vacant'),       -- id=7: 空
  ('4 Tiverton Road', '二层-D 双人间', 2, 'occupied');     -- id=8: 张滢 (+葛书妍 9月入住)

-- 4A Tiverton Road (Nina Su 监管)
INSERT INTO dorms (building_name, room_number, capacity, room_status) VALUES
  ('4A Tiverton Road', '一层-A 双人间', 2, 'occupied'),    -- id=9: 李锐 + 林士剀
  ('4A Tiverton Road', '二层-B 单人间', 1, 'occupied'),    -- id=10: 方跃衡
  ('4A Tiverton Road', '二层-C 单人间', 1, 'occupied'),    -- id=11: 徐泓森
  ('4A Tiverton Road', '二层-D 双人间', 2, 'occupied');    -- id=12: 陈亦凡 (+空 9月)

-- 51B Shoreham Street (Krystal Hu 监管)
INSERT INTO dorms (building_name, room_number, capacity, room_status) VALUES
  ('51B Shoreham Street', '二层-A 单人间', 1, 'occupied'), -- id=13: 李祎鸣
  ('51B Shoreham Street', '二层-B 单人间', 1, 'occupied'), -- id=14: 沈豪
  ('51B Shoreham Street', '二层-C 双人间', 2, 'occupied'); -- id=15: 杨期麟

-- ====================================================
-- 2. 为 housing.md 中尚未存在于 profiles 的学生创建记录
-- 占小诺 已存在 (a0000000-...025)
-- 葛书妍 已存在 (a0000000-...035)
-- 高一菲 已存在 (a0000000-...002)
-- ====================================================
INSERT INTO profiles (id, full_name, role) VALUES
  (gen_random_uuid(), '留楷哲', 'student'),
  (gen_random_uuid(), '吴奕辉', 'student'),
  (gen_random_uuid(), '王涵禹', 'student'),
  (gen_random_uuid(), '陈祺',   'student'),
  (gen_random_uuid(), '杨菡睿', 'student'),
  (gen_random_uuid(), '郑王景怡','student'),
  (gen_random_uuid(), '张滢',   'student'),
  (gen_random_uuid(), '李锐',   'student'),
  (gen_random_uuid(), '林士剀', 'student'),
  (gen_random_uuid(), '方跃衡', 'student'),
  (gen_random_uuid(), '徐泓森', 'student'),
  (gen_random_uuid(), '陈亦凡', 'student'),
  (gen_random_uuid(), '李祎鸣', 'student'),
  (gen_random_uuid(), '沈豪',   'student'),
  (gen_random_uuid(), '杨期麟', 'student')
ON CONFLICT DO NOTHING;

-- ====================================================
-- 3. 住宿分配（按房间 ID 和学生姓名匹配）
-- ====================================================
DO $$
DECLARE
  v_room_id    INTEGER;
  v_student_id UUID;
BEGIN

  -- Helper: assign student by name to room
  -- 4B 一层-A: 占小诺 + 留楷哲
  SELECT id INTO v_room_id FROM dorms WHERE building_name='4B Tiverton Road' AND room_number='一层-A 双人间';
  SELECT id INTO v_student_id FROM profiles WHERE full_name='占小诺' LIMIT 1;
  INSERT INTO dorm_assignments (student_id, dorm_id, start_date, is_active) VALUES (v_student_id, v_room_id, '2026-01-01', true);
  SELECT id INTO v_student_id FROM profiles WHERE full_name='留楷哲' LIMIT 1;
  INSERT INTO dorm_assignments (student_id, dorm_id, start_date, is_active) VALUES (v_student_id, v_room_id, '2026-01-01', true);

  -- 4B 二层-A: 吴奕辉
  SELECT id INTO v_room_id FROM dorms WHERE building_name='4B Tiverton Road' AND room_number='二层-A 单人间';
  SELECT id INTO v_student_id FROM profiles WHERE full_name='吴奕辉' LIMIT 1;
  INSERT INTO dorm_assignments (student_id, dorm_id, start_date, is_active) VALUES (v_student_id, v_room_id, '2026-01-01', true);

  -- 4B 二层-B: 王涵禹
  SELECT id INTO v_room_id FROM dorms WHERE building_name='4B Tiverton Road' AND room_number='二层-B 单人间';
  SELECT id INTO v_student_id FROM profiles WHERE full_name='王涵禹' LIMIT 1;
  INSERT INTO dorm_assignments (student_id, dorm_id, start_date, is_active) VALUES (v_student_id, v_room_id, '2026-01-01', true);

  -- 4B 二层-C: 陈祺 + 杨菡睿
  SELECT id INTO v_room_id FROM dorms WHERE building_name='4B Tiverton Road' AND room_number='二层-C 双人间';
  SELECT id INTO v_student_id FROM profiles WHERE full_name='陈祺' LIMIT 1;
  INSERT INTO dorm_assignments (student_id, dorm_id, start_date, is_active) VALUES (v_student_id, v_room_id, '2026-01-01', true);
  SELECT id INTO v_student_id FROM profiles WHERE full_name='杨菡睿' LIMIT 1;
  INSERT INTO dorm_assignments (student_id, dorm_id, start_date, is_active) VALUES (v_student_id, v_room_id, '2026-01-01', true);

  -- 4 Tiverton Road 二层-B: 郑王景怡
  SELECT id INTO v_room_id FROM dorms WHERE building_name='4 Tiverton Road' AND room_number='二层-B 单人间';
  SELECT id INTO v_student_id FROM profiles WHERE full_name='郑王景怡' LIMIT 1;
  INSERT INTO dorm_assignments (student_id, dorm_id, start_date, is_active) VALUES (v_student_id, v_room_id, '2026-01-01', true);

  -- 4 Tiverton Road 二层-D: 张滢 (葛书妍 9月入住，暂不分配)
  SELECT id INTO v_room_id FROM dorms WHERE building_name='4 Tiverton Road' AND room_number='二层-D 双人间';
  SELECT id INTO v_student_id FROM profiles WHERE full_name='张滢' LIMIT 1;
  INSERT INTO dorm_assignments (student_id, dorm_id, start_date, is_active) VALUES (v_student_id, v_room_id, '2026-01-01', true);

  -- 4A 一层-A: 李锐 + 林士剀
  SELECT id INTO v_room_id FROM dorms WHERE building_name='4A Tiverton Road' AND room_number='一层-A 双人间';
  SELECT id INTO v_student_id FROM profiles WHERE full_name='李锐' LIMIT 1;
  INSERT INTO dorm_assignments (student_id, dorm_id, start_date, is_active) VALUES (v_student_id, v_room_id, '2026-01-01', true);
  SELECT id INTO v_student_id FROM profiles WHERE full_name='林士剀' LIMIT 1;
  INSERT INTO dorm_assignments (student_id, dorm_id, start_date, is_active) VALUES (v_student_id, v_room_id, '2026-01-01', true);

  -- 4A 二层-B: 方跃衡
  SELECT id INTO v_room_id FROM dorms WHERE building_name='4A Tiverton Road' AND room_number='二层-B 单人间';
  SELECT id INTO v_student_id FROM profiles WHERE full_name='方跃衡' LIMIT 1;
  INSERT INTO dorm_assignments (student_id, dorm_id, start_date, is_active) VALUES (v_student_id, v_room_id, '2026-01-01', true);

  -- 4A 二层-C: 徐泓森
  SELECT id INTO v_room_id FROM dorms WHERE building_name='4A Tiverton Road' AND room_number='二层-C 单人间';
  SELECT id INTO v_student_id FROM profiles WHERE full_name='徐泓森' LIMIT 1;
  INSERT INTO dorm_assignments (student_id, dorm_id, start_date, is_active) VALUES (v_student_id, v_room_id, '2026-01-01', true);

  -- 4A 二层-D: 陈亦凡
  SELECT id INTO v_room_id FROM dorms WHERE building_name='4A Tiverton Road' AND room_number='二层-D 双人间';
  SELECT id INTO v_student_id FROM profiles WHERE full_name='陈亦凡' LIMIT 1;
  INSERT INTO dorm_assignments (student_id, dorm_id, start_date, is_active) VALUES (v_student_id, v_room_id, '2026-01-01', true);

  -- 51B 二层-A: 李祎鸣
  SELECT id INTO v_room_id FROM dorms WHERE building_name='51B Shoreham Street' AND room_number='二层-A 单人间';
  SELECT id INTO v_student_id FROM profiles WHERE full_name='李祎鸣' LIMIT 1;
  INSERT INTO dorm_assignments (student_id, dorm_id, start_date, is_active) VALUES (v_student_id, v_room_id, '2026-01-01', true);

  -- 51B 二层-B: 沈豪
  SELECT id INTO v_room_id FROM dorms WHERE building_name='51B Shoreham Street' AND room_number='二层-B 单人间';
  SELECT id INTO v_student_id FROM profiles WHERE full_name='沈豪' LIMIT 1;
  INSERT INTO dorm_assignments (student_id, dorm_id, start_date, is_active) VALUES (v_student_id, v_room_id, '2026-01-01', true);

  -- 51B 二层-C: 杨期麟
  SELECT id INTO v_room_id FROM dorms WHERE building_name='51B Shoreham Street' AND room_number='二层-C 双人间';
  SELECT id INTO v_student_id FROM profiles WHERE full_name='杨期麟' LIMIT 1;
  INSERT INTO dorm_assignments (student_id, dorm_id, start_date, is_active) VALUES (v_student_id, v_room_id, '2026-01-01', true);

END $$;
