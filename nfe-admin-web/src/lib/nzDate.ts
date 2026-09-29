// 业务日期统一按新西兰（学生所在地）算，与 daily_checks.check_date 的口径一致。
//
// 为什么不用浏览器本地时间：录入的人可能在国内，中新两地在新西兰凌晨那几个小时
// 日期会差一天，用本地时间会把点名记到前一天。

const NZ_TZ = 'Pacific/Auckland';

// en-CA 的日期格式即 YYYY-MM-DD
const NZ_FMT = new Intl.DateTimeFormat('en-CA', {
  timeZone: NZ_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
});

/** 新西兰「今天」，YYYY-MM-DD */
export function nzToday(): string {
  return NZ_FMT.format(new Date());
}

/** 新西兰日期往前 n 天，YYYY-MM-DD（用于补录窗口下界、近 N 天统计） */
export function nzDaysAgo(n: number): string {
  return NZ_FMT.format(new Date(Date.now() - n * 86400000));
}
