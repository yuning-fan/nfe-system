-- 阶段删除：补 student_enrollments 的 DELETE 策略（原表缺失，导致删除静默失败、阶段仍显示）
create policy "Allow delete for authenticated users"
  on public.student_enrollments for delete to authenticated using (true);
