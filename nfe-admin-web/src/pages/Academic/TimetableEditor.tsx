// 课表录入 —— 粘贴一张表就完事，不逐节点选。
// 每个学生的课表都是学生自己发来的，所以入口只有一个粘贴框；解析结果实时预览，坏行指到具体行号。
import { useEffect, useMemo, useState } from 'react';
import { Modal, message } from 'antd';
import { IconAlertTriangle, IconCircleCheck } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useAcademicStore } from '../../store/useAcademicStore';
import { parseTimetable, conflictLines, DAY_LABEL, rowsToText } from './timetableParse';

const PLACEHOLDER = `周一\t09:00\t11:00\tMathematics\tB201
周三\t13:00\t15:00\tPhysics\t303`;

interface Props {
  open: boolean;
  onClose: () => void;
  enrollment: any;          // 含 id / student_id / start_date / end_date / profiles.full_name
  /** 该学生已选的科目：[{ value: program_subject_id, label: subject_name }] */
  subjectOptions: { value: number; label: string }[];
}

export default function TimetableEditor({ open, onClose, enrollment, subjectOptions }: Props) {
  const timetable = useAcademicStore(s => s.timetable);
  const saveTimetable = useAcademicStore(s => s.saveTimetable);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  // 打开时把已有课表回填成同样的文本格式，改完再存即可
  useEffect(() => {
    if (!open) return;
    const mine = timetable.filter((t: any) => t.enrollment_id === enrollment?.id);
    setText(rowsToText(mine.map((t: any) => ({
      day_of_week: t.day_of_week,
      start_time: t.start_time,
      end_time: t.end_time,
      room: t.room,
      subject: t.program_subjects?.subject_name || '',
    }))));
  }, [open, enrollment?.id, timetable]);

  const { rows, errors } = useMemo(() => parseTimetable(text, subjectOptions), [text, subjectOptions]);
  const conflicts = useMemo(() => conflictLines(rows), [rows]);
  const blocked = errors.length > 0 || conflicts.size > 0;

  const save = async () => {
    if (blocked) { message.warning('还有无法识别或时间冲突的行，先处理掉'); return; }

    // 生效区间跟随报名周期；报名没写日期时给一年兜底，
    // 否则早上出勤的「今日有课」按生效区间筛，会一个人都筛不到
    const from = enrollment?.start_date || dayjs().format('YYYY-MM-DD');
    const until = enrollment?.end_date || dayjs().add(1, 'year').format('YYYY-MM-DD');

    setSaving(true);
    const ok = await saveTimetable(enrollment.id, enrollment.student_id, rows.map(r => ({
      program_subject_id: r.program_subject_id as number,
      day_of_week: r.day_of_week,
      start_time: r.start_time,
      end_time: r.end_time,
      room: r.room,
      effective_from: from,
      effective_until: until,
    })));
    setSaving(false);
    if (ok) { message.success(rows.length ? `已保存 ${rows.length} 节课` : '已清空课表'); onClose(); }
    else message.error('保存失败');
  };

  return (
    <Modal
      title={`课表 · ${enrollment?.profiles?.full_name || ''}`}
      open={open} onCancel={onClose} onOk={save}
      okText={saving ? '保存中…' : `保存 ${rows.length} 节`}
      okButtonProps={{ disabled: blocked }}
      confirmLoading={saving} width={720}
    >
      {subjectOptions.length === 0 ? (
        <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
          该学生还没有选课，先完成选课再来录课表。
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
            每行一节课，按 <b>星期 · 开始 · 结束 · 科目 · 教室（可省）</b> 的顺序，列之间用 Tab 或两个以上空格隔开。
            从 Excel、表格、聊天记录直接粘贴都行。<br />
            星期认「周一 / 一 / Mon / 1」，时间认「9:00 / 09:00 / 9am / 0900」。<b>保存空白 = 清空课表。</b>
          </div>

          <textarea
            className="input"
            style={{ width: '100%', minHeight: 150, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13, lineHeight: 1.6, padding: 10 }}
            placeholder={PLACEHOLDER}
            value={text}
            onChange={e => setText(e.target.value)}
          />

          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
            该学生已选：{subjectOptions.map(s => s.label).join('、')}
          </div>

          {/* 解析结果 */}
          {errors.map(e => (
            <div key={`e${e.line}`} style={{ display: 'flex', gap: 6, fontSize: 12, color: 'var(--color-danger)' }}>
              <IconAlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>第 {e.line} 行：{e.reason}<br /><span style={{ opacity: 0.7 }}>{e.text}</span></span>
            </div>
          ))}

          {conflicts.size > 0 && (
            <div style={{ display: 'flex', gap: 6, fontSize: 12, color: 'var(--color-danger)' }}>
              <IconAlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>第 {Array.from(conflicts).sort((a, b) => a - b).join('、')} 行时间相互重叠</span>
            </div>
          )}

          {rows.length > 0 && (
            <div style={{ background: 'var(--color-bg-secondary)', borderRadius: 6, padding: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 8, color: blocked ? 'var(--color-text-secondary)' : 'var(--color-success, #389e0d)' }}>
                {!blocked && <IconCircleCheck size={14} />}
                认出 {rows.length} 节课
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[1, 2, 3, 4, 5, 6, 7]
                  .filter(d => rows.some(r => r.day_of_week === d))
                  .map(day => (
                    <div key={day} style={{ flex: 1, border: '1px solid var(--color-border)', borderRadius: 6, padding: 8, background: 'var(--color-bg)' }}>
                      <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6 }}>{DAY_LABEL[day]}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {rows.filter(r => r.day_of_week === day)
                          .sort((a, b) => a.start_time.localeCompare(b.start_time))
                          .map(r => (
                            <div key={r.line} style={{
                              borderLeft: `3px solid ${conflicts.has(r.line) ? 'var(--color-danger)' : 'var(--color-primary)'}`,
                              padding: '4px 6px', borderRadius: 4, fontSize: 11, background: 'var(--color-bg-secondary)',
                            }}>
                              <div style={{ fontWeight: 500 }}>{r.subject}</div>
                              <div style={{ color: 'var(--color-text-secondary)' }}>{r.start_time}–{r.end_time}{r.room ? ` · ${r.room}` : ''}</div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
