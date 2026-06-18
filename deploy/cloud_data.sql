--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- 临时禁用自动建档触发器，避免它先建空 students_info 骨架行导致真实数据被 ON CONFLICT 跳过
ALTER TABLE public.profiles DISABLE TRIGGER trg_auto_create_students_info;

--
-- Data for Name: courses; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('a0000000-0000-0000-0000-000000000000', 'student', '陈秋彤', NULL, '陈', 1, '2026-06-16 01:15:07.863376+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('a0000000-0000-0000-0000-000000000001', 'student', '陈雅蓁', NULL, '陈', 1, '2026-06-16 01:15:07.863376+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('a0000000-0000-0000-0000-000000000002', 'student', '高一菲', NULL, '高', 1, '2026-06-16 01:15:07.863376+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('a0000000-0000-0000-0000-000000000003', 'student', '葛蕴瑶', NULL, '葛', 1, '2026-06-16 01:15:07.863376+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('a0000000-0000-0000-0000-000000000004', 'student', '姜茗浩', NULL, '姜', 1, '2026-06-16 01:15:07.863376+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('a0000000-0000-0000-0000-000000000005', 'student', '梁钦舒', NULL, '梁', 1, '2026-06-16 01:15:07.863376+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('a0000000-0000-0000-0000-000000000006', 'student', '鲁启承', NULL, '鲁', 1, '2026-06-16 01:15:07.863376+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('a0000000-0000-0000-0000-000000000007', 'student', '沈思妤', NULL, '沈', 1, '2026-06-16 01:15:07.863376+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('a0000000-0000-0000-0000-000000000008', 'student', '汤佳琦', NULL, '汤', 1, '2026-06-16 01:15:07.863376+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('a0000000-0000-0000-0000-000000000009', 'student', '陶政言', NULL, '陶', 1, '2026-06-16 01:15:07.863376+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('a0000000-0000-0000-0000-000000000010', 'student', '王新然', NULL, '王', 1, '2026-06-16 01:15:07.863376+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('a0000000-0000-0000-0000-000000000011', 'student', '王栩哲', NULL, '王', 1, '2026-06-16 01:15:07.863376+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('a0000000-0000-0000-0000-000000000012', 'student', '谢来格', NULL, '谢', 1, '2026-06-16 01:15:07.863376+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('a0000000-0000-0000-0000-000000000013', 'student', '叶羽萱', NULL, '叶', 1, '2026-06-16 01:15:07.863376+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('a0000000-0000-0000-0000-000000000014', 'student', '虞霖涛', NULL, '虞', 1, '2026-06-16 01:15:07.863376+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('a0000000-0000-0000-0000-000000000015', 'student', '张希珃', NULL, '张', 1, '2026-06-16 01:15:07.863376+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('a0000000-0000-0000-0000-000000000016', 'student', '赵紫萱', NULL, '赵', 1, '2026-06-16 01:15:07.863376+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('a0000000-0000-0000-0000-000000000017', 'student', '郑楚凡', NULL, '郑', 1, '2026-06-16 01:15:07.863376+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('a0000000-0000-0000-0000-000000000018', 'student', '周和璇', NULL, '周', 1, '2026-06-16 01:15:07.863376+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('a0000000-0000-0000-0000-000000000019', 'student', '朱锶语', NULL, '朱', 1, '2026-06-16 01:15:07.863376+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('a0000000-0000-0000-0000-000000000020', 'student', '陈几何', NULL, '陈', 1, '2026-06-16 01:15:07.863376+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('a0000000-0000-0000-0000-000000000021', 'student', '丁可莹', NULL, '丁', 1, '2026-06-16 01:15:07.863376+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('a0000000-0000-0000-0000-000000000022', 'student', '沈永欢', NULL, '沈', 1, '2026-06-16 01:15:07.863376+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('a0000000-0000-0000-0000-000000000023', 'student', '张铄', NULL, '张', 1, '2026-06-16 01:15:07.863376+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('a0000000-0000-0000-0000-000000000024', 'student', '赵思涵', NULL, '赵', 1, '2026-06-16 01:15:07.863376+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('a0000000-0000-0000-0000-000000000025', 'student', '占小诺', NULL, '占', 1, '2026-06-16 01:15:07.863376+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('a0000000-0000-0000-0000-000000000026', 'student', '李元', NULL, '李', 1, '2026-06-16 01:15:07.863376+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('a0000000-0000-0000-0000-000000000027', 'student', '张馨元', NULL, '张', 1, '2026-06-16 01:15:07.863376+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('a0000000-0000-0000-0000-000000000028', 'student', '李菲', NULL, '李', 1, '2026-06-16 01:15:07.863376+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('a0000000-0000-0000-0000-000000000029', 'student', '王梓苹', NULL, '王', 1, '2026-06-16 01:15:07.863376+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('a0000000-0000-0000-0000-000000000030', 'student', '葛晨曦', NULL, '葛', 1, '2026-06-16 01:15:07.863376+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('a0000000-0000-0000-0000-000000000031', 'student', '周继翀', NULL, '周', 1, '2026-06-16 01:15:07.863376+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('a0000000-0000-0000-0000-000000000032', 'student', '张祺俊', NULL, '张', 1, '2026-06-16 01:15:07.863376+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('a0000000-0000-0000-0000-000000000033', 'student', '李宗泽', NULL, '李', 1, '2026-06-16 01:15:07.863376+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('a0000000-0000-0000-0000-000000000034', 'student', '范文嘉', NULL, '范', 1, '2026-06-16 01:15:07.863376+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('a0000000-0000-0000-0000-000000000035', 'student', '葛书妍', NULL, '葛', 1, '2026-06-16 01:15:07.863376+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('a0000000-0000-0000-0000-000000000036', 'student', '冯琪', NULL, '冯', 1, '2026-06-16 01:15:07.863376+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('cbfa09e2-9150-435a-ae71-93caa4a8ed0f', 'student', '留楷哲', NULL, NULL, 1, '2026-06-16 04:04:00.893281+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('b9e902c2-9515-4795-9cd8-cd8d914ceeda', 'student', '吴奕辉', NULL, NULL, 1, '2026-06-16 04:04:00.893281+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('59c5fafd-c35c-49b3-ac8f-51616eef875a', 'student', '王涵禹', NULL, NULL, 1, '2026-06-16 04:04:00.893281+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('106fb434-4cfd-46b9-9bc9-98547bb65ce3', 'student', '陈祺', NULL, NULL, 1, '2026-06-16 04:04:00.893281+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('839e001c-b1df-4b69-a2eb-c8df114c6132', 'student', '杨菡睿', NULL, NULL, 1, '2026-06-16 04:04:00.893281+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('3f2dafb4-0764-4358-8779-919bed1f426d', 'student', '郑王景怡', NULL, NULL, 1, '2026-06-16 04:04:00.893281+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('3d9e446d-a155-4331-9938-a8065a4dc332', 'student', '张滢', NULL, NULL, 1, '2026-06-16 04:04:00.893281+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('942f8a10-3b4a-4e2d-a13c-d53eff03d514', 'student', '李锐', NULL, NULL, 1, '2026-06-16 04:04:00.893281+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('19c3b3a3-7a1f-44fc-9351-ce6b56a313df', 'student', '林士剀', NULL, NULL, 1, '2026-06-16 04:04:00.893281+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('f9b8ab6c-db67-46a2-8708-566ad5608060', 'student', '方跃衡', NULL, NULL, 1, '2026-06-16 04:04:00.893281+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('67fa9e6b-454d-4114-8891-088ab65fa59d', 'student', '徐泓森', NULL, NULL, 1, '2026-06-16 04:04:00.893281+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('edd8c78a-d0ed-46a3-91ac-94ac41b335ae', 'student', '陈亦凡', NULL, NULL, 1, '2026-06-16 04:04:00.893281+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('56ab3886-94aa-41ac-85af-ae9486566ed6', 'student', '李祎鸣', NULL, NULL, 1, '2026-06-16 04:04:00.893281+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('504e3ffe-984a-4b8e-a9c5-e25db2cce9e6', 'student', '沈豪', NULL, NULL, 1, '2026-06-16 04:04:00.893281+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('0139ac21-d900-478e-8092-f7707a486155', 'student', '杨期麟', NULL, NULL, 1, '2026-06-16 04:04:00.893281+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('8d9e251c-d811-4ef2-a9d3-1b8e21b838c4', 'admin', 'Krystal', NULL, NULL, 1, '2026-06-18 03:27:52.156363+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('387eb85b-d3fb-4642-a783-955da649de89', 'manager', 'Gris', NULL, NULL, 1, '2026-06-18 03:27:52.156363+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('2fd3da6d-60c5-4ee8-838b-bfb802337c14', 'manager', 'Ryan', NULL, NULL, 1, '2026-06-18 03:27:52.156363+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('cbf3871f-cf37-4aa7-90d0-04ece15f4b35', 'life', 'Riley', NULL, NULL, 1, '2026-06-18 03:27:52.156363+00') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, status, created_at) VALUES ('e0000000-0000-0000-0000-000000000001', 'admin', 'admin', NULL, NULL, 1, '2026-06-16 01:15:07.863376+00') ON CONFLICT DO NOTHING;


--
-- Data for Name: program_types; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.program_types (id, name, description) VALUES (1, '绿通', '全方位高端留学护航服务，包含监护与课业') ON CONFLICT DO NOTHING;
INSERT INTO public.program_types (id, name, description) VALUES (2, '散客', '灵活的课外辅导服务') ON CONFLICT DO NOTHING;
INSERT INTO public.program_types (id, name, description) VALUES (3, '奥大', '奥克兰大学专属辅导与升学项目') ON CONFLICT DO NOTHING;


--
-- Data for Name: programs; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.programs (id, program_type_id, name, track, duration_months, is_active, description) VALUES (1, 1, '预科-Standard', 'standard', 12, true, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.programs (id, program_type_id, name, track, duration_months, is_active, description) VALUES (2, 2, '预科-Accelerated', 'accelerate', 5, true, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.programs (id, program_type_id, name, track, duration_months, is_active, description) VALUES (3, NULL, '预科-Fast-track', 'fast_track', 8, true, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.programs (id, program_type_id, name, track, duration_months, is_active, description) VALUES (4, NULL, '大学阶段-住宿监管', 'university', NULL, true, NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: program_subjects; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.program_subjects (id, program_id, subject_name, subject_category, subject_area, difficulty_level, hours_per_week, sessions_per_week, max_students, description, default_schedule) VALUES (1, 1, 'EAP (English for Academic Purposes)', 'core', 'english', 'standard', 4.00, 2, NULL, NULL, '[]') ON CONFLICT DO NOTHING;
INSERT INTO public.program_subjects (id, program_id, subject_name, subject_category, subject_area, difficulty_level, hours_per_week, sessions_per_week, max_students, description, default_schedule) VALUES (2, 1, 'Calculus', 'elective', 'science', 'standard', 4.00, 2, NULL, NULL, '[]') ON CONFLICT DO NOTHING;
INSERT INTO public.program_subjects (id, program_id, subject_name, subject_category, subject_area, difficulty_level, hours_per_week, sessions_per_week, max_students, description, default_schedule) VALUES (3, 1, 'Physics', 'elective', 'science', 'standard', 4.00, 2, NULL, NULL, '[]') ON CONFLICT DO NOTHING;
INSERT INTO public.program_subjects (id, program_id, subject_name, subject_category, subject_area, difficulty_level, hours_per_week, sessions_per_week, max_students, description, default_schedule) VALUES (4, 1, 'Accounting', 'elective', 'commerce', 'standard', 4.00, 2, NULL, NULL, '[]') ON CONFLICT DO NOTHING;
INSERT INTO public.program_subjects (id, program_id, subject_name, subject_category, subject_area, difficulty_level, hours_per_week, sessions_per_week, max_students, description, default_schedule) VALUES (5, 1, 'Design', 'elective', 'arts', 'standard', 4.00, 2, NULL, NULL, '[]') ON CONFLICT DO NOTHING;


--
-- Data for Name: academic_milestones; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: communication_logs; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: course_assets; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: daily_checks; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: dorms; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (16, '4B Tiverton Road', '二层-A 单人间', 1, 'occupied', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (18, '4B Tiverton Road', '二层-C 双人间', 2, 'occupied', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (20, '4 Tiverton Road', '二层-B 单人间', 1, 'occupied', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (23, '4A Tiverton Road', '一层-A 双人间', 2, 'occupied', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (25, '4A Tiverton Road', '二层-C 单人间', 1, 'occupied', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (27, '51B Shoreham Street', '二层-A 单人间', 1, 'occupied', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (28, '51B Shoreham Street', '二层-B 单人间', 1, 'occupied', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (29, '51B Shoreham Street', '二层-C 双人间', 2, 'occupied', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (30, 'City UniLodge', '1F-01-A', 1, 'vacant', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (31, 'City UniLodge', '1F-01-B', 1, 'vacant', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (32, 'City UniLodge', '1F-01-C', 1, 'vacant', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (33, 'City UniLodge', '1F-01-D', 1, 'vacant', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (34, 'City UniLodge', '1F-01-E', 1, 'vacant', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (35, 'City UniLodge', '1F-02-A', 1, 'vacant', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (36, 'City UniLodge', '1F-02-B', 1, 'vacant', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (37, 'City UniLodge', '1F-02-C', 1, 'vacant', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (38, 'City UniLodge', '1F-02-D', 1, 'vacant', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (39, 'City UniLodge', '1F-02-E', 1, 'vacant', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (40, 'City UniLodge', '1F-03-A', 1, 'vacant', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (41, 'City UniLodge', '1F-03-B', 1, 'vacant', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (42, 'City UniLodge', '1F-03-C', 1, 'vacant', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (43, 'City UniLodge', '1F-03-D', 1, 'vacant', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (44, 'City UniLodge', '1F-03-E', 1, 'vacant', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (45, 'City UniLodge', '1F-04-A', 1, 'vacant', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (46, 'City UniLodge', '1F-04-B', 1, 'vacant', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (47, 'City UniLodge', '1F-04-C', 1, 'vacant', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (48, 'City UniLodge', '1F-04-D', 1, 'vacant', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (49, 'City UniLodge', '1F-04-E', 1, 'vacant', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (50, 'City UniLodge', '1F-05-A', 1, 'vacant', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (51, 'City UniLodge', '1F-05-B', 1, 'vacant', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (52, 'City UniLodge', '1F-05-C', 1, 'vacant', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (53, 'City UniLodge', '1F-05-D', 1, 'vacant', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (54, 'City UniLodge', '1F-05-E', 1, 'vacant', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (55, 'City UniLodge', '2F-01-A', 1, 'vacant', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (56, 'City UniLodge', '2F-01-B', 1, 'vacant', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (57, 'City UniLodge', '2F-01-C', 1, 'vacant', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (58, 'City UniLodge', '2F-01-D', 1, 'vacant', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (59, 'City UniLodge', '2F-01-E', 1, 'vacant', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (60, 'City UniLodge', '2F-02-A', 1, 'vacant', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (61, 'City UniLodge', '2F-02-B', 1, 'vacant', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (62, 'City UniLodge', '2F-02-C', 1, 'vacant', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (63, 'City UniLodge', '2F-02-D', 1, 'vacant', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (64, 'City UniLodge', '2F-02-E', 1, 'vacant', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (65, 'City UniLodge', '2F-03-A', 1, 'vacant', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (66, 'City UniLodge', '2F-03-B', 1, 'vacant', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (67, 'City UniLodge', '2F-03-C', 1, 'vacant', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (68, 'City UniLodge', '2F-03-D', 1, 'vacant', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (69, 'City UniLodge', '2F-03-E', 1, 'vacant', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (70, 'City UniLodge', '2F-04-A', 1, 'vacant', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (71, 'City UniLodge', '2F-04-B', 1, 'vacant', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (72, 'City UniLodge', '2F-04-C', 1, 'vacant', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (73, 'City UniLodge', '2F-04-D', 1, 'vacant', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (74, 'City UniLodge', '2F-04-E', 1, 'vacant', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (75, 'City UniLodge', '2F-05-A', 1, 'vacant', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (76, 'City UniLodge', '2F-05-B', 1, 'vacant', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (77, 'City UniLodge', '2F-05-C', 1, 'vacant', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (78, 'City UniLodge', '2F-05-D', 1, 'vacant', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (79, 'City UniLodge', '2F-05-E', 1, 'vacant', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (15, '4B Tiverton Road', '一层-A 双人间', 2, 'occupied', '9月：高一菲（9月入住，未付）') ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (17, '4B Tiverton Road', '二层-B 单人间', 1, 'occupied', '9月：（空位，9月可用）') ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (19, '4 Tiverton Road', '一层-A 单人间', 1, 'vacant', '9月：（空位，9月可用）') ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (21, '4 Tiverton Road', '二层-C 单人间', 1, 'vacant', '9月：（空位，9月可用）') ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (22, '4 Tiverton Road', '二层-D 双人间', 2, 'occupied', '9月：葛书妍（9月入住）') ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (24, '4A Tiverton Road', '二层-B 单人间', 1, 'occupied', '9月：（空位，9月可用）') ON CONFLICT DO NOTHING;
INSERT INTO public.dorms (id, building_name, room_number, capacity, room_status, notes) VALUES (26, '4A Tiverton Road', '二层-D 双人间', 2, 'occupied', '9月：（空位，9月可用）') ON CONFLICT DO NOTHING;


--
-- Data for Name: dorm_assignments; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.dorm_assignments (id, student_id, dorm_id, start_date, end_date, is_active) VALUES (17, 'a0000000-0000-0000-0000-000000000025', 15, '2026-01-01', NULL, true) ON CONFLICT DO NOTHING;
INSERT INTO public.dorm_assignments (id, student_id, dorm_id, start_date, end_date, is_active) VALUES (18, 'cbfa09e2-9150-435a-ae71-93caa4a8ed0f', 15, '2026-01-01', NULL, true) ON CONFLICT DO NOTHING;
INSERT INTO public.dorm_assignments (id, student_id, dorm_id, start_date, end_date, is_active) VALUES (19, 'b9e902c2-9515-4795-9cd8-cd8d914ceeda', 16, '2026-01-01', NULL, true) ON CONFLICT DO NOTHING;
INSERT INTO public.dorm_assignments (id, student_id, dorm_id, start_date, end_date, is_active) VALUES (20, '59c5fafd-c35c-49b3-ac8f-51616eef875a', 17, '2026-01-01', NULL, true) ON CONFLICT DO NOTHING;
INSERT INTO public.dorm_assignments (id, student_id, dorm_id, start_date, end_date, is_active) VALUES (21, '106fb434-4cfd-46b9-9bc9-98547bb65ce3', 18, '2026-01-01', NULL, true) ON CONFLICT DO NOTHING;
INSERT INTO public.dorm_assignments (id, student_id, dorm_id, start_date, end_date, is_active) VALUES (22, '839e001c-b1df-4b69-a2eb-c8df114c6132', 18, '2026-01-01', NULL, true) ON CONFLICT DO NOTHING;
INSERT INTO public.dorm_assignments (id, student_id, dorm_id, start_date, end_date, is_active) VALUES (23, '3f2dafb4-0764-4358-8779-919bed1f426d', 20, '2026-01-01', NULL, true) ON CONFLICT DO NOTHING;
INSERT INTO public.dorm_assignments (id, student_id, dorm_id, start_date, end_date, is_active) VALUES (25, '942f8a10-3b4a-4e2d-a13c-d53eff03d514', 23, '2026-01-01', NULL, true) ON CONFLICT DO NOTHING;
INSERT INTO public.dorm_assignments (id, student_id, dorm_id, start_date, end_date, is_active) VALUES (26, '19c3b3a3-7a1f-44fc-9351-ce6b56a313df', 23, '2026-01-01', NULL, true) ON CONFLICT DO NOTHING;
INSERT INTO public.dorm_assignments (id, student_id, dorm_id, start_date, end_date, is_active) VALUES (27, 'f9b8ab6c-db67-46a2-8708-566ad5608060', 24, '2026-01-01', NULL, true) ON CONFLICT DO NOTHING;
INSERT INTO public.dorm_assignments (id, student_id, dorm_id, start_date, end_date, is_active) VALUES (28, '67fa9e6b-454d-4114-8891-088ab65fa59d', 25, '2026-01-01', NULL, true) ON CONFLICT DO NOTHING;
INSERT INTO public.dorm_assignments (id, student_id, dorm_id, start_date, end_date, is_active) VALUES (29, 'edd8c78a-d0ed-46a3-91ac-94ac41b335ae', 26, '2026-01-01', NULL, true) ON CONFLICT DO NOTHING;
INSERT INTO public.dorm_assignments (id, student_id, dorm_id, start_date, end_date, is_active) VALUES (30, '56ab3886-94aa-41ac-85af-ae9486566ed6', 27, '2026-01-01', NULL, true) ON CONFLICT DO NOTHING;
INSERT INTO public.dorm_assignments (id, student_id, dorm_id, start_date, end_date, is_active) VALUES (31, '504e3ffe-984a-4b8e-a9c5-e25db2cce9e6', 28, '2026-01-01', NULL, true) ON CONFLICT DO NOTHING;
INSERT INTO public.dorm_assignments (id, student_id, dorm_id, start_date, end_date, is_active) VALUES (32, '0139ac21-d900-478e-8092-f7707a486155', 29, '2026-01-01', NULL, true) ON CONFLICT DO NOTHING;
INSERT INTO public.dorm_assignments (id, student_id, dorm_id, start_date, end_date, is_active) VALUES (24, '3d9e446d-a155-4331-9938-a8065a4dc332', 22, '2026-01-01', '2026-06-17', false) ON CONFLICT DO NOTHING;
INSERT INTO public.dorm_assignments (id, student_id, dorm_id, start_date, end_date, is_active) VALUES (33, '3d9e446d-a155-4331-9938-a8065a4dc332', 26, '2026-06-01', '2026-06-17', false) ON CONFLICT DO NOTHING;
INSERT INTO public.dorm_assignments (id, student_id, dorm_id, start_date, end_date, is_active) VALUES (34, '3d9e446d-a155-4331-9938-a8065a4dc332', 22, '2026-06-01', NULL, true) ON CONFLICT DO NOTHING;


--
-- Data for Name: grade_records; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: leave_applications; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: log_audit_operations; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: log_hour_changes; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: log_risk_changes; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: medication_records; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: notification_recipients; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: notification_send_logs; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: reports; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: resources; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: resource_student_links; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: schedules; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: schedule_changes; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: student_enrollments; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.student_enrollments (id, student_id, program_id, cohort_name, start_date, end_date, status, enrolled_by, created_at, source) VALUES (1, 'a0000000-0000-0000-0000-000000000000', 1, NULL, '2026-09-01', '2027-08-31', 'active', NULL, '2026-06-16 01:15:07.863376+00', 'green_channel') ON CONFLICT DO NOTHING;
INSERT INTO public.student_enrollments (id, student_id, program_id, cohort_name, start_date, end_date, status, enrolled_by, created_at, source) VALUES (2, 'a0000000-0000-0000-0000-000000000001', 1, NULL, '2026-09-01', '2027-08-31', 'active', NULL, '2026-06-16 01:15:07.863376+00', 'green_channel') ON CONFLICT DO NOTHING;
INSERT INTO public.student_enrollments (id, student_id, program_id, cohort_name, start_date, end_date, status, enrolled_by, created_at, source) VALUES (3, 'a0000000-0000-0000-0000-000000000002', 1, NULL, '2026-09-01', '2027-08-31', 'active', NULL, '2026-06-16 01:15:07.863376+00', 'green_channel') ON CONFLICT DO NOTHING;
INSERT INTO public.student_enrollments (id, student_id, program_id, cohort_name, start_date, end_date, status, enrolled_by, created_at, source) VALUES (4, 'a0000000-0000-0000-0000-000000000003', 1, NULL, '2026-09-01', '2027-08-31', 'active', NULL, '2026-06-16 01:15:07.863376+00', 'green_channel') ON CONFLICT DO NOTHING;
INSERT INTO public.student_enrollments (id, student_id, program_id, cohort_name, start_date, end_date, status, enrolled_by, created_at, source) VALUES (5, 'a0000000-0000-0000-0000-000000000004', 1, NULL, '2026-09-01', '2027-08-31', 'active', NULL, '2026-06-16 01:15:07.863376+00', 'green_channel') ON CONFLICT DO NOTHING;
INSERT INTO public.student_enrollments (id, student_id, program_id, cohort_name, start_date, end_date, status, enrolled_by, created_at, source) VALUES (6, 'a0000000-0000-0000-0000-000000000005', 1, NULL, '2026-09-01', '2027-08-31', 'active', NULL, '2026-06-16 01:15:07.863376+00', 'green_channel') ON CONFLICT DO NOTHING;
INSERT INTO public.student_enrollments (id, student_id, program_id, cohort_name, start_date, end_date, status, enrolled_by, created_at, source) VALUES (7, 'a0000000-0000-0000-0000-000000000006', 1, NULL, '2026-09-01', '2027-08-31', 'active', NULL, '2026-06-16 01:15:07.863376+00', 'green_channel') ON CONFLICT DO NOTHING;
INSERT INTO public.student_enrollments (id, student_id, program_id, cohort_name, start_date, end_date, status, enrolled_by, created_at, source) VALUES (8, 'a0000000-0000-0000-0000-000000000007', 1, NULL, '2026-09-01', '2027-08-31', 'active', NULL, '2026-06-16 01:15:07.863376+00', 'green_channel') ON CONFLICT DO NOTHING;
INSERT INTO public.student_enrollments (id, student_id, program_id, cohort_name, start_date, end_date, status, enrolled_by, created_at, source) VALUES (9, 'a0000000-0000-0000-0000-000000000008', 1, NULL, '2026-09-01', '2027-08-31', 'active', NULL, '2026-06-16 01:15:07.863376+00', 'green_channel') ON CONFLICT DO NOTHING;
INSERT INTO public.student_enrollments (id, student_id, program_id, cohort_name, start_date, end_date, status, enrolled_by, created_at, source) VALUES (10, 'a0000000-0000-0000-0000-000000000009', 1, NULL, '2026-09-01', '2027-08-31', 'active', NULL, '2026-06-16 01:15:07.863376+00', 'green_channel') ON CONFLICT DO NOTHING;
INSERT INTO public.student_enrollments (id, student_id, program_id, cohort_name, start_date, end_date, status, enrolled_by, created_at, source) VALUES (11, 'a0000000-0000-0000-0000-000000000010', 1, NULL, '2026-09-01', '2027-08-31', 'active', NULL, '2026-06-16 01:15:07.863376+00', 'green_channel') ON CONFLICT DO NOTHING;
INSERT INTO public.student_enrollments (id, student_id, program_id, cohort_name, start_date, end_date, status, enrolled_by, created_at, source) VALUES (12, 'a0000000-0000-0000-0000-000000000011', 1, NULL, '2026-09-01', '2027-08-31', 'active', NULL, '2026-06-16 01:15:07.863376+00', 'green_channel') ON CONFLICT DO NOTHING;
INSERT INTO public.student_enrollments (id, student_id, program_id, cohort_name, start_date, end_date, status, enrolled_by, created_at, source) VALUES (13, 'a0000000-0000-0000-0000-000000000012', 1, NULL, '2026-09-01', '2027-08-31', 'active', NULL, '2026-06-16 01:15:07.863376+00', 'green_channel') ON CONFLICT DO NOTHING;
INSERT INTO public.student_enrollments (id, student_id, program_id, cohort_name, start_date, end_date, status, enrolled_by, created_at, source) VALUES (14, 'a0000000-0000-0000-0000-000000000013', 1, NULL, '2026-09-01', '2027-08-31', 'active', NULL, '2026-06-16 01:15:07.863376+00', 'green_channel') ON CONFLICT DO NOTHING;
INSERT INTO public.student_enrollments (id, student_id, program_id, cohort_name, start_date, end_date, status, enrolled_by, created_at, source) VALUES (15, 'a0000000-0000-0000-0000-000000000014', 1, NULL, '2026-09-01', '2027-08-31', 'active', NULL, '2026-06-16 01:15:07.863376+00', 'green_channel') ON CONFLICT DO NOTHING;
INSERT INTO public.student_enrollments (id, student_id, program_id, cohort_name, start_date, end_date, status, enrolled_by, created_at, source) VALUES (16, 'a0000000-0000-0000-0000-000000000015', 1, NULL, '2026-09-01', '2027-08-31', 'active', NULL, '2026-06-16 01:15:07.863376+00', 'green_channel') ON CONFLICT DO NOTHING;
INSERT INTO public.student_enrollments (id, student_id, program_id, cohort_name, start_date, end_date, status, enrolled_by, created_at, source) VALUES (17, 'a0000000-0000-0000-0000-000000000016', 1, NULL, '2026-09-01', '2027-08-31', 'active', NULL, '2026-06-16 01:15:07.863376+00', 'green_channel') ON CONFLICT DO NOTHING;
INSERT INTO public.student_enrollments (id, student_id, program_id, cohort_name, start_date, end_date, status, enrolled_by, created_at, source) VALUES (18, 'a0000000-0000-0000-0000-000000000017', 1, NULL, '2026-09-01', '2027-08-31', 'active', NULL, '2026-06-16 01:15:07.863376+00', 'green_channel') ON CONFLICT DO NOTHING;
INSERT INTO public.student_enrollments (id, student_id, program_id, cohort_name, start_date, end_date, status, enrolled_by, created_at, source) VALUES (19, 'a0000000-0000-0000-0000-000000000018', 1, NULL, '2026-09-01', '2027-08-31', 'active', NULL, '2026-06-16 01:15:07.863376+00', 'green_channel') ON CONFLICT DO NOTHING;
INSERT INTO public.student_enrollments (id, student_id, program_id, cohort_name, start_date, end_date, status, enrolled_by, created_at, source) VALUES (20, 'a0000000-0000-0000-0000-000000000019', 1, NULL, '2026-09-01', '2027-08-31', 'active', NULL, '2026-06-16 01:15:07.863376+00', 'green_channel') ON CONFLICT DO NOTHING;
INSERT INTO public.student_enrollments (id, student_id, program_id, cohort_name, start_date, end_date, status, enrolled_by, created_at, source) VALUES (21, 'a0000000-0000-0000-0000-000000000020', 1, NULL, '2026-09-01', '2027-08-31', 'active', NULL, '2026-06-16 01:15:07.863376+00', 'green_channel') ON CONFLICT DO NOTHING;
INSERT INTO public.student_enrollments (id, student_id, program_id, cohort_name, start_date, end_date, status, enrolled_by, created_at, source) VALUES (22, 'a0000000-0000-0000-0000-000000000021', 1, NULL, '2026-09-01', '2027-08-31', 'active', NULL, '2026-06-16 01:15:07.863376+00', 'green_channel') ON CONFLICT DO NOTHING;
INSERT INTO public.student_enrollments (id, student_id, program_id, cohort_name, start_date, end_date, status, enrolled_by, created_at, source) VALUES (23, 'a0000000-0000-0000-0000-000000000022', 1, NULL, '2026-09-01', '2027-08-31', 'active', NULL, '2026-06-16 01:15:07.863376+00', 'green_channel') ON CONFLICT DO NOTHING;
INSERT INTO public.student_enrollments (id, student_id, program_id, cohort_name, start_date, end_date, status, enrolled_by, created_at, source) VALUES (24, 'a0000000-0000-0000-0000-000000000023', 1, NULL, '2026-09-01', '2027-08-31', 'active', NULL, '2026-06-16 01:15:07.863376+00', 'green_channel') ON CONFLICT DO NOTHING;
INSERT INTO public.student_enrollments (id, student_id, program_id, cohort_name, start_date, end_date, status, enrolled_by, created_at, source) VALUES (27, 'a0000000-0000-0000-0000-000000000026', 1, NULL, '2026-09-01', '2027-08-31', 'active', NULL, '2026-06-16 01:15:07.863376+00', 'green_channel') ON CONFLICT DO NOTHING;
INSERT INTO public.student_enrollments (id, student_id, program_id, cohort_name, start_date, end_date, status, enrolled_by, created_at, source) VALUES (28, 'a0000000-0000-0000-0000-000000000027', 1, NULL, '2026-09-01', '2027-08-31', 'active', NULL, '2026-06-16 01:15:07.863376+00', 'green_channel') ON CONFLICT DO NOTHING;
INSERT INTO public.student_enrollments (id, student_id, program_id, cohort_name, start_date, end_date, status, enrolled_by, created_at, source) VALUES (29, 'a0000000-0000-0000-0000-000000000028', 1, NULL, '2026-09-01', '2027-08-31', 'active', NULL, '2026-06-16 01:15:07.863376+00', 'green_channel') ON CONFLICT DO NOTHING;
INSERT INTO public.student_enrollments (id, student_id, program_id, cohort_name, start_date, end_date, status, enrolled_by, created_at, source) VALUES (30, 'a0000000-0000-0000-0000-000000000029', 1, NULL, '2026-09-01', '2027-08-31', 'active', NULL, '2026-06-16 01:15:07.863376+00', 'green_channel') ON CONFLICT DO NOTHING;
INSERT INTO public.student_enrollments (id, student_id, program_id, cohort_name, start_date, end_date, status, enrolled_by, created_at, source) VALUES (31, 'a0000000-0000-0000-0000-000000000030', 1, NULL, '2026-09-01', '2027-08-31', 'active', NULL, '2026-06-16 01:15:07.863376+00', 'green_channel') ON CONFLICT DO NOTHING;
INSERT INTO public.student_enrollments (id, student_id, program_id, cohort_name, start_date, end_date, status, enrolled_by, created_at, source) VALUES (32, 'a0000000-0000-0000-0000-000000000031', 1, NULL, '2026-09-01', '2027-08-31', 'active', NULL, '2026-06-16 01:15:07.863376+00', 'green_channel') ON CONFLICT DO NOTHING;
INSERT INTO public.student_enrollments (id, student_id, program_id, cohort_name, start_date, end_date, status, enrolled_by, created_at, source) VALUES (33, 'a0000000-0000-0000-0000-000000000032', 1, NULL, '2026-09-01', '2027-08-31', 'active', NULL, '2026-06-16 01:15:07.863376+00', 'green_channel') ON CONFLICT DO NOTHING;
INSERT INTO public.student_enrollments (id, student_id, program_id, cohort_name, start_date, end_date, status, enrolled_by, created_at, source) VALUES (34, 'a0000000-0000-0000-0000-000000000033', 1, NULL, '2026-09-01', '2027-08-31', 'active', NULL, '2026-06-16 01:15:07.863376+00', 'green_channel') ON CONFLICT DO NOTHING;
INSERT INTO public.student_enrollments (id, student_id, program_id, cohort_name, start_date, end_date, status, enrolled_by, created_at, source) VALUES (35, 'a0000000-0000-0000-0000-000000000034', 1, NULL, '2026-09-01', '2027-08-31', 'active', NULL, '2026-06-16 01:15:07.863376+00', 'green_channel') ON CONFLICT DO NOTHING;
INSERT INTO public.student_enrollments (id, student_id, program_id, cohort_name, start_date, end_date, status, enrolled_by, created_at, source) VALUES (25, 'a0000000-0000-0000-0000-000000000024', 2, NULL, '2026-09-01', '2027-08-31', 'active', NULL, '2026-06-16 01:15:07.863376+00', 'agent') ON CONFLICT DO NOTHING;
INSERT INTO public.student_enrollments (id, student_id, program_id, cohort_name, start_date, end_date, status, enrolled_by, created_at, source) VALUES (36, 'a0000000-0000-0000-0000-000000000035', 2, NULL, '2026-09-01', '2027-08-31', 'active', NULL, '2026-06-16 01:15:07.863376+00', 'agent') ON CONFLICT DO NOTHING;
INSERT INTO public.student_enrollments (id, student_id, program_id, cohort_name, start_date, end_date, status, enrolled_by, created_at, source) VALUES (37, 'a0000000-0000-0000-0000-000000000036', 2, NULL, '2026-09-01', '2027-08-31', 'active', NULL, '2026-06-16 01:15:07.863376+00', 'agent') ON CONFLICT DO NOTHING;
INSERT INTO public.student_enrollments (id, student_id, program_id, cohort_name, start_date, end_date, status, enrolled_by, created_at, source) VALUES (26, 'a0000000-0000-0000-0000-000000000025', 1, NULL, '2026-09-01', '2027-08-31', 'active', NULL, '2026-06-16 01:15:07.863376+00', 'green_channel') ON CONFLICT DO NOTHING;


--
-- Data for Name: school_timetable; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: transport_routes; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.transport_routes (id, driver_id, route_name, execution_date) VALUES (1, NULL, 'Avondale 早上班车', '2026-06-16') ON CONFLICT DO NOTHING;


--
-- Data for Name: staff_duty_schedules; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: student_credentials; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: student_documents; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: student_subject_selections; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: students_info; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('a0000000-0000-0000-0000-000000000002', NULL, NULL, NULL, '杭二中', NULL, NULL, NULL, NULL, '高峰（父）/陈占红（母）', '13588451471（父）/13606505124（母）', NULL, 'green', 100, 3, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('a0000000-0000-0000-0000-000000000003', NULL, NULL, NULL, '杭二中', NULL, NULL, NULL, NULL, '葛俊石（父）/郭小会（母）', '00233 556303645（父）/15306504961（母）', NULL, 'green', 100, 4, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('a0000000-0000-0000-0000-000000000007', NULL, NULL, NULL, '杭二中', NULL, NULL, NULL, NULL, '沈业刚（父）/吴娟（母）', '13777831317（父）/13386521780（母）', NULL, 'green', 100, 8, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('a0000000-0000-0000-0000-000000000008', NULL, NULL, NULL, '杭二中', NULL, NULL, NULL, NULL, '汤建峰（父）/陈新荣（母）', '13968141978（父）/15906649025（母）', NULL, 'green', 100, 9, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('a0000000-0000-0000-0000-000000000009', NULL, NULL, NULL, '杭二中', NULL, NULL, NULL, NULL, '陶月明（父）/沈岚（母）', '18667135221（父）/17705813376（母）', NULL, 'green', 100, 10, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('a0000000-0000-0000-0000-000000000010', NULL, NULL, NULL, '杭二中', NULL, NULL, NULL, NULL, '王翀（父）/陈怡（母）', '18857161818（父）/13735559768（母）', NULL, 'green', 100, 11, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('a0000000-0000-0000-0000-000000000011', NULL, NULL, NULL, '杭二中', NULL, NULL, NULL, NULL, '王瑜珑（父）/叶黎霞（母）', '13600511421（父）/13867453182（母）', NULL, 'green', 100, 12, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('a0000000-0000-0000-0000-000000000012', NULL, NULL, NULL, '杭二中', NULL, NULL, NULL, NULL, '谢春禄（父）/来君洋（母）', '18668018881（父）/15657177810（母）', NULL, 'green', 100, 13, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('a0000000-0000-0000-0000-000000000013', NULL, NULL, NULL, '杭二中', NULL, NULL, NULL, NULL, '叶晓华（父）/朱阳珍（母）', '13588407825（父）/13957149828（母）', NULL, 'green', 100, 14, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('a0000000-0000-0000-0000-000000000014', NULL, NULL, NULL, '杭二中', NULL, NULL, NULL, NULL, '虞伟（父）/虞燕华（母）', '15868125167（父）/137582281889（母）', NULL, 'green', 100, 15, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('a0000000-0000-0000-0000-000000000015', NULL, NULL, NULL, '杭二中', NULL, NULL, NULL, NULL, '单大坤（父）/张丽（母）', '15868150099（父）/13757110005（母）', NULL, 'green', 100, 16, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('a0000000-0000-0000-0000-000000000016', NULL, NULL, NULL, '杭二中', NULL, NULL, NULL, NULL, '赵颖飞（父）/方小兰（母）', '13336081788（父）/15336586188（母）', NULL, 'green', 100, 17, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('a0000000-0000-0000-0000-000000000017', NULL, NULL, NULL, '杭二中', NULL, NULL, NULL, NULL, '郑强锋（父）/朱燕（母）', '13516859898（父）/13819156858（母）', NULL, 'green', 100, 18, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('a0000000-0000-0000-0000-000000000018', NULL, NULL, NULL, '杭二中', NULL, NULL, NULL, NULL, '周仕丰（父）/方芳（母）', '13858193169（父）/13819199233（母）', NULL, 'green', 100, 19, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('a0000000-0000-0000-0000-000000000019', NULL, NULL, NULL, '杭二中', NULL, NULL, NULL, NULL, '朱文博（父）/何佳（母）', '13336199369（父）/18057118572（母）', NULL, 'green', 100, 20, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('a0000000-0000-0000-0000-000000000020', NULL, NULL, NULL, '杭二中', NULL, NULL, NULL, NULL, '陈进春（父）/徐奕（母）', '13588146084（父）/13073639926（母）', NULL, 'green', 100, 21, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('a0000000-0000-0000-0000-000000000021', NULL, NULL, NULL, '杭二中', NULL, NULL, NULL, NULL, '丁亮（父）/丁亮（母）', '13157132241（父）/13173617351（母）', NULL, 'green', 100, 22, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('a0000000-0000-0000-0000-000000000022', NULL, NULL, NULL, '杭二中', NULL, NULL, NULL, NULL, '沈涛（父）/李敏（母）', '18858109018（父）/13989812056（母）', NULL, 'green', 100, 23, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('a0000000-0000-0000-0000-000000000023', NULL, NULL, NULL, '杭二中', NULL, NULL, NULL, NULL, '张文蔚（父）/方绿绿（母）', '13735517177（父）/13588032556（母）', NULL, 'green', 100, 24, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('a0000000-0000-0000-0000-000000000024', NULL, NULL, NULL, '杭二中', NULL, NULL, NULL, NULL, '赵志远（父）/赵晓兰（母）', '13705798324（父）/13705799342（母）', NULL, 'green', 100, 25, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('a0000000-0000-0000-0000-000000000025', NULL, NULL, NULL, '杭二中', NULL, NULL, NULL, NULL, '占礼兵（父）/郭伟仙（母）', '19870666666（父）/13507936777（母）', NULL, 'green', 100, 26, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('a0000000-0000-0000-0000-000000000026', NULL, NULL, NULL, '苏十中', NULL, NULL, NULL, NULL, '李天麟（父）/袁梅（母）', '13701552192（父）/18013057877（母）', NULL, 'green', 100, 27, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('a0000000-0000-0000-0000-000000000027', NULL, NULL, NULL, '苏十中', NULL, NULL, NULL, NULL, '张浩（父）/张佳岚（母）', '13771782973（父）/13951118307（母）', NULL, 'green', 100, 28, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('a0000000-0000-0000-0000-000000000028', NULL, NULL, NULL, '苏十中', NULL, NULL, NULL, NULL, '李国庆（父）/李晓英（母）', '13584875122（父）/18601971347（母）', NULL, 'green', 100, 29, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('a0000000-0000-0000-0000-000000000029', NULL, NULL, NULL, '苏十中', NULL, NULL, NULL, NULL, '王昕（父）/吴敏（母）', '13862179068（父）/13912624692（母）', NULL, 'green', 100, 30, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('a0000000-0000-0000-0000-000000000030', NULL, NULL, NULL, '苏十中', NULL, NULL, NULL, NULL, '葛永辉（父）/张艳玲（母）', '15962360919（父）/18306204350（母）', NULL, 'green', 100, 31, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('a0000000-0000-0000-0000-000000000031', NULL, NULL, NULL, '苏十中', NULL, NULL, NULL, NULL, '周梦君（父）/邵丽（母）', '13862416569（父）/13451659479（母）', NULL, 'green', 100, 32, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('a0000000-0000-0000-0000-000000000032', NULL, NULL, NULL, '苏十中', NULL, NULL, NULL, NULL, '张杰（父）/温程（母）', '13771916814（父）/13776116882（母）', NULL, 'green', 100, 33, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('a0000000-0000-0000-0000-000000000033', NULL, NULL, NULL, '苏十中', NULL, NULL, NULL, NULL, '李仰（父）/胥倩（母）', '17751661956（父）/18168741135（母）', NULL, 'green', 100, 34, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('a0000000-0000-0000-0000-000000000034', NULL, NULL, NULL, '苏十中', NULL, NULL, NULL, NULL, '范春奎（父）/徐玲（母）', '13862146712（父）/13584853418（母）', NULL, 'green', 100, 35, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('a0000000-0000-0000-0000-000000000035', NULL, NULL, NULL, '镇海中学 蛟川书院', NULL, NULL, NULL, NULL, '无', '无', NULL, 'green', 100, 36, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('a0000000-0000-0000-0000-000000000036', NULL, NULL, NULL, '未知', NULL, NULL, NULL, NULL, '无', '无', NULL, 'green', 100, 37, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('a0000000-0000-0000-0000-000000000000', NULL, NULL, NULL, '杭二中', NULL, NULL, NULL, NULL, '陈学光（父）/刘瑛（母）', '13819114471（父）/13957190065（母）', NULL, 'green', 100, 1, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('a0000000-0000-0000-0000-000000000001', NULL, NULL, NULL, '杭二中', NULL, NULL, NULL, NULL, '陈之平（父）/吕冰（母）', '13606709867（父）/13456916413（母）', NULL, 'green', 100, 2, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('a0000000-0000-0000-0000-000000000004', NULL, NULL, NULL, '杭二中', NULL, NULL, NULL, NULL, '姜哲华（父）/徐拓（母）', '13605701555（父）/13073683131（母）', NULL, 'green', 100, 5, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('a0000000-0000-0000-0000-000000000005', NULL, NULL, NULL, '杭二中', NULL, NULL, NULL, NULL, '唐西胜（父）/梁隽（母）', '15068128890（父）/13906710560（母）', NULL, 'green', 100, 6, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('a0000000-0000-0000-0000-000000000006', NULL, NULL, NULL, '杭二中', NULL, NULL, NULL, NULL, '鲁晓楠（父）/沈丹丹（母）', '13616553054（父）/13616553052（母）', NULL, 'green', 100, 7, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('cbfa09e2-9150-435a-ae71-93caa4a8ed0f', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'green', 100, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('b9e902c2-9515-4795-9cd8-cd8d914ceeda', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'green', 100, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('59c5fafd-c35c-49b3-ac8f-51616eef875a', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'green', 100, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('106fb434-4cfd-46b9-9bc9-98547bb65ce3', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'green', 100, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('839e001c-b1df-4b69-a2eb-c8df114c6132', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'green', 100, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('3f2dafb4-0764-4358-8779-919bed1f426d', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'green', 100, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('3d9e446d-a155-4331-9938-a8065a4dc332', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'green', 100, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('942f8a10-3b4a-4e2d-a13c-d53eff03d514', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'green', 100, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('19c3b3a3-7a1f-44fc-9351-ce6b56a313df', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'green', 100, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('f9b8ab6c-db67-46a2-8708-566ad5608060', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'green', 100, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('67fa9e6b-454d-4114-8891-088ab65fa59d', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'green', 100, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('edd8c78a-d0ed-46a3-91ac-94ac41b335ae', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'green', 100, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('56ab3886-94aa-41ac-85af-ae9486566ed6', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'green', 100, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('504e3ffe-984a-4b8e-a9c5-e25db2cce9e6', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'green', 100, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.students_info (student_id, english_name, date_of_birth, passport_number, school_name, source_school, english_level, target_university, scholarship_requirement, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, total_risk_score, enrollment_id, gender, arrival_date) VALUES ('0139ac21-d900-478e-8092-f7707a486155', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'green', 100, NULL, NULL, NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: transport_passengers; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.transport_passengers (id, route_id, student_id, pickup_time, pickup_location, drop_off_location, status) VALUES (1, 1, 'a0000000-0000-0000-0000-000000000002', '07:30:00', '4 Tiverton Road', 'Avondale College', 'pending') ON CONFLICT DO NOTHING;
INSERT INTO public.transport_passengers (id, route_id, student_id, pickup_time, pickup_location, drop_off_location, status) VALUES (2, 1, 'a0000000-0000-0000-0000-000000000003', '07:30:00', '4 Tiverton Road', 'Avondale College', 'pending') ON CONFLICT DO NOTHING;
INSERT INTO public.transport_passengers (id, route_id, student_id, pickup_time, pickup_location, drop_off_location, status) VALUES (3, 1, 'a0000000-0000-0000-0000-000000000007', '07:30:00', '4 Tiverton Road', 'Avondale College', 'pending') ON CONFLICT DO NOTHING;
INSERT INTO public.transport_passengers (id, route_id, student_id, pickup_time, pickup_location, drop_off_location, status) VALUES (4, 1, 'a0000000-0000-0000-0000-000000000008', '07:30:00', '4 Tiverton Road', 'Avondale College', 'pending') ON CONFLICT DO NOTHING;
INSERT INTO public.transport_passengers (id, route_id, student_id, pickup_time, pickup_location, drop_off_location, status) VALUES (5, 1, 'a0000000-0000-0000-0000-000000000009', '07:30:00', '4 Tiverton Road', 'Avondale College', 'pending') ON CONFLICT DO NOTHING;


--
-- Data for Name: violation_logs; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: warning_letters; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: warning_letter_violations; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Name: academic_milestones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.academic_milestones_id_seq', 1, false);


--
-- Name: communication_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.communication_logs_id_seq', 1, false);


--
-- Name: course_assets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.course_assets_id_seq', 1, false);


--
-- Name: courses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.courses_id_seq', 1, false);


--
-- Name: daily_checks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.daily_checks_id_seq', 1, false);


--
-- Name: dorm_assignments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.dorm_assignments_id_seq', 34, true);


--
-- Name: dorms_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.dorms_id_seq', 79, true);


--
-- Name: grade_records_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.grade_records_id_seq', 1, false);


--
-- Name: leave_applications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.leave_applications_id_seq', 1, false);


--
-- Name: log_audit_operations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.log_audit_operations_id_seq', 1, false);


--
-- Name: log_hour_changes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.log_hour_changes_id_seq', 1, false);


--
-- Name: log_risk_changes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.log_risk_changes_id_seq', 1, false);


--
-- Name: medication_records_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.medication_records_id_seq', 1, false);


--
-- Name: notification_recipients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notification_recipients_id_seq', 1, false);


--
-- Name: notification_send_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notification_send_logs_id_seq', 1, false);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notifications_id_seq', 1, false);


--
-- Name: program_subjects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.program_subjects_id_seq', 1, false);


--
-- Name: program_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.program_types_id_seq', 1, false);


--
-- Name: programs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.programs_id_seq', 4, true);


--
-- Name: reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.reports_id_seq', 52, true);


--
-- Name: resource_student_links_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.resource_student_links_id_seq', 1, false);


--
-- Name: resources_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.resources_id_seq', 1, false);


--
-- Name: schedule_changes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.schedule_changes_id_seq', 1, false);


--
-- Name: schedules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.schedules_id_seq', 1, false);


--
-- Name: school_timetable_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.school_timetable_id_seq', 1, false);


--
-- Name: staff_duty_schedules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.staff_duty_schedules_id_seq', 1, false);


--
-- Name: student_credentials_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.student_credentials_id_seq', 1, false);


--
-- Name: student_documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.student_documents_id_seq', 1, false);


--
-- Name: student_enrollments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.student_enrollments_id_seq', 1, true);


--
-- Name: student_subject_selections_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.student_subject_selections_id_seq', 1, false);


--
-- Name: transport_passengers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.transport_passengers_id_seq', 5, true);


--
-- Name: transport_routes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.transport_routes_id_seq', 1, false);


--
-- Name: violation_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.violation_logs_id_seq', 1, false);


--
-- Name: warning_letter_violations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.warning_letter_violations_id_seq', 1, false);


--
-- Name: warning_letters_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.warning_letters_id_seq', 1, false);


-- 重新启用自动建档触发器
ALTER TABLE public.profiles ENABLE TRIGGER trg_auto_create_students_info;

--
-- PostgreSQL database dump complete
--


