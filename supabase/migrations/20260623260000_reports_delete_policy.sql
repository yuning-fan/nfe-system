-- 报告：补 DELETE 策略（原表缺失，导致删除草稿静默失败）
create policy "Allow delete for authenticated users"
  on public.reports for delete to authenticated using (true);
