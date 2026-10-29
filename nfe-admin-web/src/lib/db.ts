// 统一数据访问入口 —— 唯一职责：**永远不吞掉 error**。
//
// 由来：全项目有 60+ 处 `const { data } = await ...; const rows = data || []`，
// 把 error 直接丢掉 → 查询失败和「查到 0 条」长得一模一样，页面静默空白、控制台无报错。
// PostgREST 外键歧义（PGRST201）两次打挂线上页面，都是被这个写法掩盖的。
// 上 RLS 后这个问题会更严重：策略写窄了，写操作会被拒（42501），不检查 error 就什么都看不到。
//
// 用法：
//   const rows   = await list(db.from('students_info').select('*'));      // 失败抛错，成功必返数组
//   const row    = await one(db.from('profiles').select('*').eq('id', id).single());
//   const rowOrNull = await maybeOne(db.from('x').select('*').eq(...).maybeSingle());
//   await run(db.from('x').insert({...}));                                 // 写操作，失败抛错
//
// 调用方按需 try/catch 转成 message.error；别再写 `data || []`。
import { supabase } from './supabase';

/** 仅用于 auth / storage / realtime 等非表查询场景；表查询请走下面的 list/one/run */
export { supabase };

/** 与 PostgrestBuilder 结构兼容的最小形状，避免为每种 builder 写重载 */
export interface DbResult<T> { data: T | null; error: { message: string; code?: string; details?: string | null } | null }
type Awaitable<T> = PromiseLike<DbResult<T>>;

export class DbError extends Error {
  // 不用构造函数参数属性：项目开了 erasableSyntaxOnly，那种写法会编译报错
  readonly code?: string;
  readonly details?: string | null;
  constructor(message: string, code?: string, details?: string | null) {
    super(message);
    this.name = 'DbError';
    this.code = code;
    this.details = details;
  }
}

// PGRST201 = 嵌套关系有歧义（同一张表多个外键指向目标表），报错信息对使用者不直观，这里补一句怎么修
function toError(err: NonNullable<DbResult<unknown>['error']>): DbError {
  const hint = err.code === 'PGRST201'
    ? '（嵌套查询外键有歧义，需写成 profiles!student_id(...) 指明外键）'
    : err.code === '42501'
      ? '（被行级安全策略拒绝，当前账号无权读写该行）'
      : '';
  return new DbError(`${err.message}${hint}`, err.code, err.details);
}

/** 返回数组；error 抛出，data 为 null 时返回空数组 */
export async function list<T>(q: Awaitable<T[]>): Promise<T[]> {
  const { data, error } = await q;
  if (error) throw toError(error);
  return data ?? [];
}

/** 返回单行；error 或无数据都抛出。配 .single() 使用 */
export async function one<T>(q: Awaitable<T>): Promise<T> {
  const { data, error } = await q;
  if (error) throw toError(error);
  if (data == null) throw new DbError('查询未返回数据');
  return data;
}

/** 返回单行或 null；error 抛出。配 .maybeSingle() 使用 */
export async function maybeOne<T>(q: Awaitable<T>): Promise<T | null> {
  const { data, error } = await q;
  if (error) throw toError(error);
  return data ?? null;
}

/** 写操作：只关心成功与否，error 抛出 */
export async function run(q: Awaitable<unknown>): Promise<void> {
  const { error } = await q;
  if (error) throw toError(error);
}
