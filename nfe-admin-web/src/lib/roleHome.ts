// 角色 → 落地页 / 可进入的工作台。角色与工作台视角不是一个词表，这里是唯一的对照表。
//   DB role:      admin | manager | tutor | patrol | life | driver | student
//   工作台视角 key: academic | tutor | patrol | life        （academic 对应 manager）
export const ROLE_TO_STAFF_VIEW: Record<string, string> = {
  manager: 'academic',
  tutor: 'tutor',
  patrol: 'patrol',
  life: 'life',
};

/** 登录后该去哪：admin 进控制台，其余进各自工作台；没角色的兜底到控制台 */
export function homePathForRole(role: string | null | undefined): string {
  if (!role || role === 'admin') return '/';
  const view = ROLE_TO_STAFF_VIEW[role];
  return view ? `/staff/${view}` : '/';
}

/** 该角色能否进入某个工作台视角。admin 全都能进（便于排查问题） */
export function canAccessStaffView(role: string | null | undefined, view: string): boolean {
  if (role === 'admin') return true;
  return !!role && ROLE_TO_STAFF_VIEW[role] === view;
}

/** 该角色能否进 admin 控制台 */
export function canAccessConsole(role: string | null | undefined): boolean {
  return role === 'admin';
}

/** 学生档案路径：admin 走控制台，其余走各自工作台内的档案页。
 *  控制台路由对非 admin 是关的，直接写死 /students/:id 会让工作台里的链接全变死链。 */
export function studentDetailPath(role: string | null | undefined, id: string): string {
  if (!role || role === 'admin') return `/students/${id}`;
  const view = ROLE_TO_STAFF_VIEW[role];
  return view ? `/staff/${view}/student/${id}` : `/students/${id}`;
}
