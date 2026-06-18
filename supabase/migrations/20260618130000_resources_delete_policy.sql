-- 资料库删除策略：登录员工可删除资料记录
CREATE POLICY "staff delete resources" ON public.resources FOR DELETE TO authenticated USING (true);
