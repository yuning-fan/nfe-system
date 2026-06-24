-- 风险评分系统：出勤分三类统计（晚自习 / 学校上课 / 辅导课）
-- daily_checks.check_type 现有 morning(学校上课) / night_study(晚自习) / dorm_check(查寝)
-- 新增 tutoring(辅导课出勤)，供辅导老师在「上课记录」面板标记缺勤。
alter type public.check_type add value if not exists 'tutoring';
