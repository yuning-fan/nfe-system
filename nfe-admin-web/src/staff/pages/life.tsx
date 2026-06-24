// 生活老师 · 详情页（早上出勤已接真功能，其余待建）
import RollCall from '../components/RollCall';

// 早上出勤：应到=今日有课学生，标"未出门"=缺席 → 写 daily_checks(morning) → 自动扣分（学校上课缺勤）
export function LifeMorning() {
  return (
    <RollCall
      checkType="morning"
      scope="today_school"
      title="早上出勤确认"
      hint="确认今日有课学生是否出门去学校 · 只标未出门(缺席)与请假，其余默认已出门"
    />
  );
}
