-- 补 DELETE 策略：courses / daily_checks 原表缺失，导致删除静默失败
-- （与 reports_delete_policy 同样的问题）
create policy "Allow delete for authenticated users"
  on public.courses for delete to authenticated using (true);

create policy "Allow delete for authenticated users"
  on public.daily_checks for delete to authenticated using (true);
