-- ============================================================
-- 住宿房源与入住数据重排（依 2026-10-05《排房表》）
--
-- 变化：
--   新增 Unilodge（13D/13E/13F/13H，各 5 间）
--   新增 55 Margan 公寓（6–10 号，单间 + 双人间）
--   51B Shoreham Street 已退租 → 停用（保留 3 条历史入住记录）
--   City UniLodge 50 间占位房 → 删除（从未有人住过，无历史）
--   4 / 4A / 4B Tiverton Road 房间结构不变，只重排人
--
-- 与原始《排房表》的两处出入（以云端现状为准，重跑不会回滚）：
--   1) 55 Margan 7 号没有双人间 —— 表上画了，用户复核后确认不存在，房源表已去掉。
--   2) 赵紫萱 / 张希珃 导入后在页面上手动从 Unilodge 13E 房间1 / 房间5 调到了 6 号双人间，
--      入住日 2026-09-01（手工填）。本脚本已跟着改成 6 号，13E 这两间因此空着。
--      注：第 4 步对「已在目标房间」的记录整条 CONTINUE，所以重跑不会把 09-01 覆盖成 09-07。
--
-- 姓名口径：以库为准。表格的 张希琦/王梓莘/龚昊宇 对应库中 张希珃/王梓苹/龚宇昊（同一人）。
--
-- 入住日期：
--   已有在住记录且房间不变的 → 整条不动，保留原 start_date
--   新建的 → 取该生最近 90 天内或未来的最早一条报名 start_date
--            （Accelerated=2026-09-07，Fast-track=2026-10-05），取不到则用今天
--
-- 生活老师房间不写 dorm_assignments（表里没写是哪位老师），
--   标 unavailable + 备注，这样床位数不会被算成学生可用床位。
--
-- 幂等：房源按 (building_name, unit, room_number) 查重；入住按 (学生, 目标房间) 查重。
-- ============================================================
DO $$
DECLARE
  r record;
  v_dorm int; v_sid uuid; v_start date; v_cur int;
  v_room_new int := 0; v_room_skip int := 0;
  v_as_new int := 0; v_as_keep int := 0; v_as_end int := 0;
  v_del int;
BEGIN
  ---------------------------------------------------------------
  -- 1. 删除 City UniLodge 占位房（先确认确实没有任何入住记录）
  ---------------------------------------------------------------
  SELECT count(*) INTO v_cur FROM public.dorm_assignments a
    JOIN public.dorms d ON d.id = a.dorm_id WHERE d.building_name = 'City UniLodge';
  IF v_cur > 0 THEN
    RAISE EXCEPTION '❌ City UniLodge 下有 % 条入住记录，不能删，请先人工处理', v_cur;
  END IF;
  DELETE FROM public.dorms WHERE building_name = 'City UniLodge';
  GET DIAGNOSTICS v_del = ROW_COUNT;
  DELETE FROM public.apartment_guardians WHERE building_name = 'City UniLodge';
  RAISE NOTICE '🗑  删除 City UniLodge 占位房 % 间', v_del;

  ---------------------------------------------------------------
  -- 2. 停用 51B Shoreham Street（保留历史）
  ---------------------------------------------------------------
  UPDATE public.dorm_assignments a SET is_active = false, end_date = COALESCE(end_date, CURRENT_DATE)
    FROM public.dorms d
   WHERE d.id = a.dorm_id AND d.building_name = '51B Shoreham Street' AND a.is_active;
  GET DIAGNOSTICS v_cur = ROW_COUNT;
  UPDATE public.dorms
     SET is_active = false, room_status = 'unavailable',
         notes = COALESCE(NULLIF(notes,''), '') || CASE WHEN COALESCE(notes,'')='' THEN '' ELSE '；' END || '2026-10 已退租'
   WHERE building_name = '51B Shoreham Street' AND is_active;
  RAISE NOTICE '📦 51B Shoreham Street 已停用，结束在住记录 % 条', v_cur;

  ---------------------------------------------------------------
  -- 3. 建新房源（Unilodge / 55 Margan）
  ---------------------------------------------------------------
  FOR r IN SELECT * FROM (VALUES
    -- building,            unit,    unit_info,        room,       capacity
    ('Unilodge',        '13D', '男',          '房间1', 1),
    ('Unilodge',        '13D', '男',          '房间2', 1),
    ('Unilodge',        '13D', '男',          '房间3', 1),
    ('Unilodge',        '13D', '男',          '房间4', 1),
    ('Unilodge',        '13D', '男',          '房间5', 1),
    ('Unilodge',        '13E', '女',          '房间1', 1),
    ('Unilodge',        '13E', '女',          '房间2', 1),
    ('Unilodge',        '13E', '女',          '房间3', 1),
    ('Unilodge',        '13E', '女',          '房间4', 1),
    ('Unilodge',        '13E', '女',          '房间5', 1),
    ('Unilodge',        '13F', '女',          '房间1', 1),
    ('Unilodge',        '13F', '女',          '房间2', 1),
    ('Unilodge',        '13F', '女',          '房间3', 1),
    ('Unilodge',        '13F', '女',          '房间4', 1),
    ('Unilodge',        '13F', '女',          '房间5', 1),
    ('Unilodge',        '13H', '女',          '房间1', 1),
    ('Unilodge',        '13H', '女',          '房间2', 1),
    ('Unilodge',        '13H', '女',          '房间3', 1),
    ('Unilodge',        '13H', '女',          '房间4', 1),
    ('Unilodge',        '13H', '女',          '房间5', 1),

    ('55 Margan 公寓',  '6号',  '女 · 3.5 卫', '房间1', 1),
    ('55 Margan 公寓',  '6号',  '女 · 3.5 卫', '房间2', 1),
    ('55 Margan 公寓',  '6号',  '女 · 3.5 卫', '房间3', 1),
    ('55 Margan 公寓',  '6号',  '女 · 3.5 卫', '双人间', 2),
    ('55 Margan 公寓',  '7号',  '男 · 2.5 卫', '房间1', 1),
    ('55 Margan 公寓',  '7号',  '男 · 2.5 卫', '房间2', 1),
    ('55 Margan 公寓',  '7号',  '男 · 2.5 卫', '房间3', 1),
    ('55 Margan 公寓',  '7号',  '男 · 2.5 卫', '房间4', 1),
    ('55 Margan 公寓',  '8号',  '女 · 3.5 卫', '房间1', 1),
    ('55 Margan 公寓',  '8号',  '女 · 3.5 卫', '房间2', 1),
    ('55 Margan 公寓',  '8号',  '女 · 3.5 卫', '房间3', 1),
    ('55 Margan 公寓',  '8号',  '女 · 3.5 卫', '双人间', 2),
    ('55 Margan 公寓',  '9号',  '男 · 2.5 卫', '房间1', 1),
    ('55 Margan 公寓',  '9号',  '男 · 2.5 卫', '房间2', 1),
    ('55 Margan 公寓',  '9号',  '男 · 2.5 卫', '房间3', 1),
    ('55 Margan 公寓',  '9号',  '男 · 2.5 卫', '房间4', 1),
    ('55 Margan 公寓',  '10号', '男 · 3.5 卫', '房间1', 1),
    ('55 Margan 公寓',  '10号', '男 · 3.5 卫', '房间2', 1),
    ('55 Margan 公寓',  '10号', '男 · 3.5 卫', '房间3', 1),
    ('55 Margan 公寓',  '10号', '男 · 3.5 卫', '双人间', 2)
  ) AS t(bld, unit, info, room, cap) LOOP
    SELECT id INTO v_dorm FROM public.dorms
     WHERE building_name = r.bld AND unit IS NOT DISTINCT FROM r.unit AND room_number = r.room;
    IF v_dorm IS NULL THEN
      INSERT INTO public.dorms (building_name, unit, unit_info, room_number, capacity, room_status, is_active)
      VALUES (r.bld, r.unit, r.info, r.room, r.cap, 'vacant', true);
      v_room_new := v_room_new + 1;
    ELSE
      UPDATE public.dorms SET unit_info = r.info, capacity = r.cap, is_active = true WHERE id = v_dorm;
      v_room_skip := v_room_skip + 1;
    END IF;
  END LOOP;
  RAISE NOTICE '🏠 房源：新建 % 间 / 已存在 % 间', v_room_new, v_room_skip;

  -- 公寓监护人占位行（未分配，页面上可直接选人）
  INSERT INTO public.apartment_guardians (building_name, guardian_staff_id)
  SELECT x, NULL FROM (VALUES ('Unilodge'), ('55 Margan 公寓')) v(x)
   WHERE NOT EXISTS (SELECT 1 FROM public.apartment_guardians g WHERE g.building_name = v.x);

  ---------------------------------------------------------------
  -- 4. 入住安排
  ---------------------------------------------------------------
  FOR r IN SELECT * FROM (VALUES
    -- building,            unit,   room,     学生姓名（以库为准）
    ('Unilodge',       '13D', '房间1', '郑楚凡'),
    ('Unilodge',       '13D', '房间2', '王栩哲'),
    ('Unilodge',       '13D', '房间3', '鲁启承'),
    ('Unilodge',       '13D', '房间5', '张可嘉'),
    ('Unilodge',       '13E', '房间2', '沈思妤'),
    ('Unilodge',       '13E', '房间3', '高一菲'),
    ('Unilodge',       '13E', '房间4', '葛蕴瑶'),
    ('Unilodge',       '13F', '房间1', '周和璇'),
    ('Unilodge',       '13F', '房间2', '张馨元'),
    ('Unilodge',       '13F', '房间3', '范文嘉'),
    ('Unilodge',       '13F', '房间4', '葛书妍'),
    ('Unilodge',       '13F', '房间5', '冯琪'),
    ('Unilodge',       '13H', '房间1', '李菲'),
    ('Unilodge',       '13H', '房间2', '谢来格'),
    ('Unilodge',       '13H', '房间3', '梁钦舒'),
    ('Unilodge',       '13H', '房间4', '陈秋彤'),
    ('Unilodge',       '13H', '房间5', '占小诺'),

    ('55 Margan 公寓', '6号',  '房间1', '张铄'),
    ('55 Margan 公寓', '6号',  '房间2', '汤佳琦'),
    ('55 Margan 公寓', '6号',  '房间3', '朱锶语'),
    ('55 Margan 公寓', '6号',  '双人间', '赵紫萱'),
    ('55 Margan 公寓', '6号',  '双人间', '张希珃'),
    ('55 Margan 公寓', '7号',  '房间1', '葛晨曦'),
    ('55 Margan 公寓', '7号',  '房间2', '李宗泽'),
    ('55 Margan 公寓', '7号',  '房间3', '王梓苹'),
    ('55 Margan 公寓', '7号',  '房间4', '周继翀'),
    ('55 Margan 公寓', '8号',  '房间1', '王新然'),
    ('55 Margan 公寓', '8号',  '房间2', '叶羽萱'),
    ('55 Margan 公寓', '8号',  '房间3', '陈雅蓁'),
    ('55 Margan 公寓', '8号',  '双人间', '蔡佳虹'),
    ('55 Margan 公寓', '8号',  '双人间', '赵思涵'),
    ('55 Margan 公寓', '9号',  '房间2', '虞霖涛'),
    ('55 Margan 公寓', '9号',  '房间3', '姜茗浩'),
    ('55 Margan 公寓', '9号',  '房间4', '陶政言'),
    ('55 Margan 公寓', '10号', '房间1', '李元'),
    ('55 Margan 公寓', '10号', '房间2', '陈几何'),
    ('55 Margan 公寓', '10号', '房间3', '沈永欢'),
    ('55 Margan 公寓', '10号', '双人间', '李锦然'),
    ('55 Margan 公寓', '10号', '双人间', '张祺俊'),

    ('4 Tiverton Road',  NULL, '二层-D 双人间', '朱铠熠'),
    ('4 Tiverton Road',  NULL, '二层-D 双人间', '郑哲元'),
    ('4A Tiverton Road', NULL, '二层-B 单人间', '杨期麟'),
    ('4A Tiverton Road', NULL, '二层-C 单人间', '沈豪'),
    ('4A Tiverton Road', NULL, '一层-A 双人间', '林士剀'),
    ('4A Tiverton Road', NULL, '一层-A 双人间', '李锐'),
    ('4A Tiverton Road', NULL, '二层-D 双人间', '陈亦凡'),
    ('4A Tiverton Road', NULL, '二层-D 双人间', '龚宇昊'),
    ('4B Tiverton Road', NULL, '二层-A 单人间', '郑王景怡'),
    ('4B Tiverton Road', NULL, '二层-B 单人间', '李祎鸣'),
    ('4B Tiverton Road', NULL, '二层-C 双人间', '吴奕辉'),
    ('4B Tiverton Road', NULL, '二层-C 双人间', '杨菡睿'),
    ('4B Tiverton Road', NULL, '一层-A 双人间', '陈祺')
  ) AS t(bld, unit, room, nm) LOOP
    SELECT id INTO v_sid FROM public.profiles WHERE full_name = r.nm AND role = 'student' LIMIT 1;
    IF v_sid IS NULL THEN RAISE EXCEPTION '❌ 库中找不到学生「%」', r.nm; END IF;

    SELECT id INTO v_dorm FROM public.dorms
     WHERE building_name = r.bld AND unit IS NOT DISTINCT FROM r.unit AND room_number = r.room;
    IF v_dorm IS NULL THEN RAISE EXCEPTION '❌ 找不到房间 % / % / %', r.bld, r.unit, r.room; END IF;

    -- 已经住在目标房间 → 整条不动，保留原入住日期
    PERFORM 1 FROM public.dorm_assignments
     WHERE student_id = v_sid AND dorm_id = v_dorm AND is_active;
    IF FOUND THEN v_as_keep := v_as_keep + 1; CONTINUE; END IF;

    -- 结束该生在别处的在住记录
    UPDATE public.dorm_assignments
       SET is_active = false, end_date = COALESCE(end_date, CURRENT_DATE)
     WHERE student_id = v_sid AND is_active AND dorm_id <> v_dorm;
    GET DIAGNOSTICS v_cur = ROW_COUNT;
    v_as_end := v_as_end + v_cur;

    SELECT min(start_date) INTO v_start FROM public.student_enrollments
     WHERE student_id = v_sid AND status <> 'withdrawn'
       AND start_date >= CURRENT_DATE - INTERVAL '90 days';

    INSERT INTO public.dorm_assignments (student_id, dorm_id, start_date, end_date, is_active)
    VALUES (v_sid, v_dorm, COALESCE(v_start, CURRENT_DATE), NULL, true);
    v_as_new := v_as_new + 1;
  END LOOP;

  -- 新表里没出现的人：结束其在住记录（51B 已在第 2 步处理）
  UPDATE public.dorm_assignments a
     SET is_active = false, end_date = COALESCE(a.end_date, CURRENT_DATE)
   WHERE a.is_active
     AND NOT EXISTS (
       SELECT 1 FROM public.profiles p
        WHERE p.id = a.student_id AND p.full_name = ANY (ARRAY[
          '郑楚凡','王栩哲','鲁启承','张可嘉','赵紫萱','沈思妤','高一菲','葛蕴瑶','张希珃',
          '周和璇','张馨元','范文嘉','葛书妍','冯琪','李菲','谢来格','梁钦舒','陈秋彤','占小诺',
          '张铄','汤佳琦','朱锶语','葛晨曦','李宗泽','王梓苹','周继翀','王新然','叶羽萱','陈雅蓁',
          '蔡佳虹','赵思涵','虞霖涛','姜茗浩','陶政言','李元','陈几何','沈永欢','李锦然','张祺俊',
          '朱铠熠','郑哲元','杨期麟','沈豪','林士剀','李锐','陈亦凡','龚宇昊',
          '郑王景怡','李祎鸣','吴奕辉','杨菡睿','陈祺']));
  GET DIAGNOSTICS v_cur = ROW_COUNT;
  v_as_end := v_as_end + v_cur;

  RAISE NOTICE '🛏  入住：新建 % / 原样保留 % / 结束旧记录 %', v_as_new, v_as_keep, v_as_end;

  ---------------------------------------------------------------
  -- 5. 生活老师房间
  ---------------------------------------------------------------
  UPDATE public.dorms SET room_status = 'unavailable', notes = '生活老师'
   WHERE (building_name, unit, room_number) IN (
     VALUES ('Unilodge', '13D', '房间4'), ('55 Margan 公寓', '9号', '房间1')
   );
  UPDATE public.dorms SET room_status = 'unavailable', notes = '生活老师'
   WHERE building_name = '4 Tiverton Road' AND room_number = '一层-A 单人间';

  ---------------------------------------------------------------
  -- 6. 按实际在住人数重算 room_status（生活老师房与停用房除外）
  ---------------------------------------------------------------
  UPDATE public.dorms d
     SET room_status = CASE WHEN c.n > 0 THEN 'occupied'::room_status ELSE 'vacant'::room_status END
    FROM (SELECT id, (SELECT count(*) FROM public.dorm_assignments a
                       WHERE a.dorm_id = dorms.id AND a.is_active) n
            FROM public.dorms) c
   WHERE d.id = c.id AND d.is_active
     AND COALESCE(d.notes,'') <> '生活老师'
     AND d.room_status NOT IN ('maintenance','unavailable');

  RAISE NOTICE '✅ 完成';
END $$;
