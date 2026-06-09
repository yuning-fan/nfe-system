# NFE 项目：API 接口规范

本项目由于采用 Supabase，前端将直接使用 `@supabase/supabase-js` 进行数据交互，无传统意义上的 RESTful API 路由层。因此本规范主要约定 **Supabase Client 的使用范式**。

## 1. 目录封装与调用规范

严禁在 React 的 `*.tsx` 组件中直接写 `supabase.from('xx').select()`。
所有数据请求必须封装在 `src/services/` 目录下，按业务模块划分文件。

**范例 (`src/services/studentService.ts`)：**
```typescript
import { supabase } from '@/utils/supabaseClient';

export const getStudentList = async () => {
  const { data, error } = await supabase
    .from('students_info')
    .select(`*, profiles(full_name, phone)`)
    .order('created_at', { ascending: false });
    
  if (error) throw new Error(error.message);
  return data;
};
```

组件中通过引入服务函数进行调用：
```typescript
// 在组件内
try {
  const students = await getStudentList();
  setList(students);
} catch (err) {
  message.error('加载失败');
}
```

## 2. 关系查询 (JOINs)

Supabase 支持通过嵌入语法处理外键级联查询。
*   **外键查询**：需要获取关联表信息时，直接使用嵌套语法。
    例如查询 `schedules` 时带上学生的姓名：`.select('*, profiles!student_id(full_name)')`
*   **避免过度 JOIN**：如果关联查询超过 3 层（如查课表带出学生、带出住宿、带出房间），建议在数据库中预先创建一个专用的 `VIEW` (视图)，前端直接读取视图以提升性能并降低前端逻辑复杂度。

## 3. 分页与过滤规范

*   **分页**：必须使用 `.range(from, to)` 处理长列表，严禁一次性拉取超过 1000 条记录。
    公式：`from = (page - 1) * pageSize`, `to = from + pageSize - 1`。
*   **过滤**：使用 `.eq()`, `.ilike()`, `.in()` 等原生方法进行链式调用。
*   **总数统计**：进行分页查询时，请附加 `{ count: 'exact' }` 参数以获取列表总条数，供 Antd Pagination 组件使用。

## 4. 错误处理机制

*   **API 错误拦截**：`@supabase/supabase-js` 不会抛出传统 HTTP 错误，而是返回带有 `error` 对象的 payload。
*   **统一提示**：在 `services/` 封装层中拦截到 `error` 后，必须通过 `throw` 将其抛出给 UI 层，由统一的拦截器或组件内进行 Antd `message.error()` 提示。
*   **权限拒绝 (PGRST301)**：当遇到因 RLS 策略导致的 `PGRST301` 错误时，前端应友好提示“您没有权限执行此操作”。
