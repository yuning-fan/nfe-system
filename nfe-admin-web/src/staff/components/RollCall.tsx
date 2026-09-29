// 通用点名组件 —— 晚自习(night_study) / 早上出勤(morning) / 辅导课(tutoring) / 查寝(dorm_check) 复用
// 逐人标记 在场/缺席/请假 + 备注，提交写 daily_checks；缺席由算分引擎自动扣分。
// 日期一律用 daily_checks.check_date（业务日期，新西兰时区），与 created_at（录入时间）分开。
import { useEffect, useState, useCallback, Fragment } from 'react';
import { supabase } from '../../lib/supabase';
import { useDailyCheckStore, type DailyCheckType } from '../../store/useDailyCheckStore';
import { useAuthStore } from '../../store/useAuthStore';
import { recomputeRisk } from '../../lib/riskEngine';
import { getGuardedStudentIds } from '../../lib/guardedStudents';
import { fetchPrepActiveStudents } from '../../lib/prepStudents';
import { nzToday, nzDaysAgo } from '../../lib/nzDate';
import { message, Modal, DatePicker } from 'antd';
import dayjs from 'dayjs';
import { IconLoader2, IconChevronRight, IconChevronDown, IconTrash } from '@tabler/icons-react';
import { Section } from '../ui';

const db = supabase as any;

type St = 'present' | 'absent' | 'leave' | 'late';
interface Stu { id: string; name: string; }
interface HistRow { date: string; present: number; absent: number; leave: number; late: number; total: number; }

const ST_LABEL: Record<St, string> = { present: '在场', absent: '缺席', leave: '请假', late: '迟到' };
const ST_CLS: Record<St, string> = { present: 'p-green', absent: 'p-red', leave: 'p-amber', late: 'p-blue' };
// 标记按钮选中时的底色（在场=不着色，就是默认态）
const ST_COLOR: Partial<Record<St, string>> = { absent: 'var(--color-danger)', leave: '#EF9F27', late: '#2563EB' };

// scope: 'all' = 预科在读学生（晚自习；奥大不纳入出勤）；'today_school' = 今日有课的学生（早上出勤，按 school_timetable）；
//        'my_dorm' = 当前登录生活老师名下公寓的在住学生（查寝）
// allowBackfill: 是否允许选往前的日期补录；allowLate: 是否提供「迟到」标记。
// 两者目前都只有晚自习开放，见 staff/pages/patrol.tsx（枚举与扣分配置是全局的，入口按需开）
export default function RollCall({
  checkType, title, hint, scope = 'all', allowBackfill = false, backfillDays = 14, allowLate = false,
}: {
  checkType: DailyCheckType;
  title: string;
  hint?: string;
  scope?: 'all' | 'today_school' | 'my_dorm';
  allowBackfill?: boolean;
  backfillDays?: number;
  allowLate?: boolean;
}) {
  const submit = useDailyCheckStore(s => s.submitDailyChecks);
  const saving = useDailyCheckStore(s => s.isLoading);

  const [students, setStudents] = useState<Stu[]>([]);
  const [state, setState] = useState<Record<string, { status: St; notes: string }>>({});
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<HistRow[]>([]);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ id: number; student_id: string; name: string; status: St; notes: string | null }[]>([]);
  const [date, setDate] = useState<string>(nzToday());     // 正在点名/补录的业务日期
  const [recordedCount, setRecordedCount] = useState(0);   // 该日已有多少条记录
  const operatorId = useAuthStore(s => s.user?.id ?? null);

  const todayNz = nzToday();
  const isBackfill = date !== todayNz;

  const fetchRoster = useCallback(async (): Promise<Stu[]> => {
    if (scope === 'today_school') {
      // 今日有课的学生：school_timetable 中 day_of_week=今天(1=周一..7=周日) 且在生效区间内
      const jsDay = new Date().getDay();           // 0=周日..6=周六
      const dow = jsDay === 0 ? 7 : jsDay;          // 转成 1..7
      const today = nzToday();
      const { data: tt } = await db
        .from('school_timetable')
        .select('student_id')
        .eq('day_of_week', dow)
        .lte('effective_from', today)
        .gte('effective_until', today);
      const ids = Array.from(new Set(((tt || []) as any[]).map(r => r.student_id).filter(Boolean)));
      if (!ids.length) return [];
      const { data } = await db.from('profiles').select('id, full_name').in('id', ids).order('full_name');
      return (data || []).map((p: any) => ({ id: p.id, name: p.full_name }));
    }
    if (scope === 'my_dorm') {
      // 名下公寓的在住学生（查寝）
      const staffId = useAuthStore.getState().user?.id ?? null;
      const ids = await getGuardedStudentIds(staffId);
      if (!ids.length) return [];
      const { data } = await db.from('profiles').select('id, full_name').in('id', ids).order('full_name');
      return (data || []).map((p: any) => ({ id: p.id, name: p.full_name }));
    }
    // 晚自习：只含「预科在读」学生，口径见 lib/prepStudents.ts（与官方出勤率录入共用）
    return await fetchPrepActiveStudents();
  }, [scope]);

  // 载入该日已有记录填进表单：补录时要能看见并修改当天已录的内容，而不是盲提交把人覆盖掉
  const loadExisting = useCallback(async (d: string, list: Stu[]) => {
    const { data } = await db
      .from('daily_checks')
      .select('student_id, status, notes')
      .eq('check_type', checkType)
      .eq('check_date', d);
    const init: Record<string, { status: St; notes: string }> = {};
    list.forEach(s => { init[s.id] = { status: 'present', notes: '' }; });
    let n = 0;
    for (const r of (data || []) as any[]) {
      if (init[r.student_id]) { init[r.student_id] = { status: r.status as St, notes: r.notes || '' }; n++; }
    }
    setState(init);
    setRecordedCount(n);
  }, [checkType]);

  const loadHistory = useCallback(async () => {
    const { data } = await db
      .from('daily_checks')
      .select('status, check_date')
      .eq('check_type', checkType)
      .gte('check_date', nzDaysAgo(30));
    const byDate: Record<string, { present: number; absent: number; leave: number; late: number }> = {};
    for (const r of (data || []) as any[]) {
      const d = r.check_date;
      if (!d) continue;
      byDate[d] = byDate[d] || { present: 0, absent: 0, leave: 0, late: 0 };
      const st = r.status as St;
      if (st === 'present' || st === 'absent' || st === 'leave' || st === 'late') byDate[d][st]++;
    }
    setHistory(
      Object.entries(byDate)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([d, v]) => ({ date: d, ...v, total: v.present + v.absent + v.leave + v.late }))
    );
  }, [checkType]);

  const nameOf = useCallback((id: string) => students.find(s => s.id === id)?.name || '未知', [students]);

  const loadDetail = useCallback(async (d: string) => {
    const { data } = await db
      .from('daily_checks')
      .select('id, student_id, status, notes')
      .eq('check_type', checkType)
      .eq('check_date', d);
    setDetail(((data || []) as any[]).map(r => ({ id: r.id, student_id: r.student_id, name: nameOf(r.student_id), status: r.status as St, notes: r.notes }))
      .sort((a, b) => a.name.localeCompare(b.name, 'zh')));
  }, [checkType, nameOf]);

  const toggleExpand = (d: string) => {
    if (expandedDate === d) { setExpandedDate(null); return; }
    setExpandedDate(d);
    loadDetail(d);
  };

  // 改某条记录的状态（在场/缺席/请假）→ 即时重算该学生
  const changeRecordStatus = async (rec: { id: number; student_id: string }, status: St) => {
    const { error } = await db.from('daily_checks').update({ status }).eq('id', rec.id);
    if (error) { message.error('修改失败'); return; }
    await recomputeRisk(rec.student_id, operatorId);
    message.success('已修改，风险分已更新');
    if (expandedDate) loadDetail(expandedDate);
    loadHistory();
  };

  // 删除某条记录 → 即时重算
  const deleteRecord = (rec: { id: number; student_id: string; name: string }) => {
    Modal.confirm({
      title: '删除该点名记录',
      content: `确定删除 ${rec.name} 这条记录吗？删除后会重新计算该学生的风险分。`,
      okButtonProps: { danger: true },
      onOk: async () => {
        const { error } = await db.from('daily_checks').delete().eq('id', rec.id);
        if (error) { message.error('删除失败'); return; }
        await recomputeRisk(rec.student_id, operatorId);
        message.success('已删除');
        if (expandedDate) loadDetail(expandedDate);
        loadHistory();
      },
    });
  };

  // 删除整日记录 → 重算涉及的所有学生
  const deleteDay = (d: string) => {
    Modal.confirm({
      title: `删除 ${d} 全部点名`,
      content: '将删除当天这一类点名的所有记录，并重算涉及学生的风险分。',
      okButtonProps: { danger: true },
      onOk: async () => {
        const { data: rows } = await db.from('daily_checks').select('student_id')
          .eq('check_type', checkType).eq('check_date', d);
        const ids = Array.from(new Set(((rows || []) as any[]).map(r => r.student_id)));
        const { error } = await db.from('daily_checks').delete()
          .eq('check_type', checkType).eq('check_date', d);
        if (error) { message.error('删除失败'); return; }
        await Promise.all(ids.map(id => recomputeRisk(id, operatorId)));
        message.success('已删除当天点名');
        setExpandedDate(null);
        loadHistory();
        if (d === date) loadExisting(date, students);
      },
    });
  };

  // 名单 + 该日已有记录一起载入（切换日期时重载）
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const list = await fetchRoster();
      if (!alive) return;
      setStudents(list);
      await loadExisting(date, list);
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [fetchRoster, loadExisting, date]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // 点"缺席/请假"即标记，再点一次取消回到"在场"；只需标异常的人，其余默认在场
  const toggleStatus = (id: string, status: St) =>
    setState(p => ({ ...p, [id]: { ...p[id], status: p[id]?.status === status ? 'present' : status } }));
  const setNotes = (id: string, notes: string) => setState(p => ({ ...p, [id]: { ...p[id], notes } }));
  const resetAllPresent = () => {
    const init: Record<string, { status: St; notes: string }> = {};
    students.forEach(s => { init[s.id] = { status: 'present', notes: '' }; });
    setState(init);
  };

  const counts = students.reduce(
    (a, s) => { const st = state[s.id]?.status || 'present'; a[st]++; return a; },
    { present: 0, absent: 0, leave: 0, late: 0 } as Record<St, number>
  );

  // 点名表单里提供哪些标记（在场是默认态，不出按钮）；历史明细里可直接改成任一状态
  const marks: St[] = allowLate ? ['absent', 'leave', 'late'] : ['absent', 'leave'];
  const detailMarks: St[] = allowLate ? ['present', 'absent', 'leave', 'late'] : ['present', 'absent', 'leave'];

  const handleSubmit = async () => {
    const records = students.map(s => ({
      student_id: s.id,
      status: state[s.id]?.status || 'present',
      notes: state[s.id]?.notes || '',
    }));
    const ok = await submit(checkType, records, date);
    if (ok) {
      const extra = allowLate && counts.late > 0 ? `、迟到 ${counts.late} 人` : '';
      message.success(isBackfill
        ? `已补录 ${date}：缺席 ${counts.absent} 人${extra}，相关学生风险分已更新`
        : `点名已提交：缺席 ${counts.absent} 人${extra}，相关学生风险分已自动更新`);
      loadHistory();
      loadExisting(date, students);
    } else {
      message.error('提交失败，请重试');
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><IconLoader2 className="spinner" size={28} style={{ color: 'var(--color-primary)' }} /></div>;
  }

  const dateLine = `${date}${isBackfill ? '（补录）' : '（今天）'} · 应到 ${students.length} 人${recordedCount > 0 ? ` · 该日已有 ${recordedCount} 条` : ''}`;
  const sectionHint = allowBackfill
    ? `${dateLine}${hint ? ' · ' + hint : ''}`
    : (hint || `${new Date().toLocaleDateString('zh-CN')} · 应到 ${students.length} 人`);

  return (
    <>
      <Section
        title={title}
        hint={sectionHint}
        action={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {allowBackfill && (
              <DatePicker
                value={dayjs(date)}
                allowClear={false}
                style={{ width: 138 }}
                onChange={d => { if (d) setDate(d.format('YYYY-MM-DD')); }}
                disabledDate={d => {
                  const s = d.format('YYYY-MM-DD');
                  return s > todayNz || s < nzDaysAgo(backfillDays);
                }}
              />
            )}
            <button className="btn" onClick={resetAllPresent} disabled={saving}>全部在场</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? <IconLoader2 size={16} className="spinner" /> : (isBackfill ? '保存补录' : '提交点名')}
            </button>
          </div>
        }
      >
        {isBackfill && (
          <div style={{
            border: '1px solid #F5C97F', background: '#FFF5E6', color: '#A05000',
            borderRadius: 6, padding: '8px 12px', fontSize: 12, marginBottom: 12,
          }}>
            正在补录 <b>{date}</b> 的点名（不是今天）。
            {recordedCount > 0
              ? `该日已有 ${recordedCount} 条记录，已载入下方，提交将按当前标记覆盖。`
              : '该日暂无记录。'}
            提交后会重算相关学生的风险分。名单用的是当前在读学生。
          </div>
        )}

        {/* 汇总条 */}
        <div style={{ display: 'flex', gap: 24, marginBottom: 14 }}>
          {([['应到', students.length], ['在场', counts.present], ['缺席', counts.absent], ['请假', counts.leave],
             ...(allowLate ? [['迟到', counts.late]] : [])] as [string, number][]).map(([l, n]) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{n}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{l}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 10 }}>
          只需标出{allowLate ? <><b>缺席</b>、<b>请假</b>、<b>迟到</b></> : <><b>缺席</b>和<b>请假</b></>}的人，其余默认在场。点错再点一次可取消。
        </div>
        {students.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
            {scope === 'today_school' ? '今日无排课学生（周末或课表为空）' : scope === 'my_dorm' ? '暂无名下公寓学生（未绑定公寓或公寓无在住学生）' : '暂无在读学生'}
          </div>
        ) : (
          <table className="tbl" style={{ width: '100%', textAlign: 'left' }}>
            <thead>
              <tr>
                <th style={{ padding: '10px 12px' }}>姓名</th>
                <th style={{ padding: '10px 12px' }}>标记（不点=在场）</th>
                <th style={{ padding: '10px 12px' }}>备注</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => {
                const cur = state[s.id]?.status || 'present';
                return (
                  <tr key={s.id} style={{ borderTop: '1px solid var(--color-border-tertiary)', background: cur === 'absent' ? 'rgba(226,75,74,0.06)' : cur === 'leave' ? 'rgba(239,159,39,0.06)' : cur === 'late' ? 'rgba(37,99,235,0.06)' : undefined }}>
                    <td style={{ padding: '10px 12px', fontWeight: 500 }}>
                      {s.name}
                      {cur === 'present' && <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--color-text-tertiary)' }}>在场</span>}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {marks.map(st => (
                          <button
                            key={st}
                            className={`btn ${cur === st ? 'btn-primary' : ''}`}
                            onClick={() => toggleStatus(s.id, st)}
                            style={{
                              padding: '3px 12px', fontSize: 12, minHeight: 0,
                              backgroundColor: cur === st ? ST_COLOR[st] : undefined,
                              borderColor: cur === st ? ST_COLOR[st] : undefined,
                            }}
                          >
                            {ST_LABEL[st]}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {cur === 'present' ? (
                        <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>—</span>
                      ) : (
                        <input
                          className="input"
                          style={{ width: '100%', minHeight: 0, padding: '4px 8px', fontSize: 12 }}
                          placeholder="原因 / 备注"
                          value={state[s.id]?.notes || ''}
                          onChange={e => setNotes(s.id, e.target.value)}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Section>

      <Section
        title="历史点名记录"
        hint={allowBackfill
          ? `近 30 天 · 点开某天可改状态 / 删记录；「载入编辑」把该天调到上方表单（可补录近 ${backfillDays} 天）`
          : '近 30 天 · 点开某天可改状态 / 删记录（记错了在这里改）'}
      >
        {history.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>暂无记录</div>
        ) : (
          <table className="tbl" style={{ width: '100%', textAlign: 'left' }}>
            <thead>
              <tr>
                <th style={{ padding: '10px 12px' }}>日期</th>
                <th style={{ padding: '10px 12px' }}>应到</th>
                <th style={{ padding: '10px 12px' }}>在场</th>
                <th style={{ padding: '10px 12px' }}>缺席</th>
                <th style={{ padding: '10px 12px' }}>请假</th>
                {allowLate && <th style={{ padding: '10px 12px' }}>迟到</th>}
                <th style={{ padding: '10px 12px' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {history.map(h => (
                <Fragment key={h.date}>
                  <tr style={{ borderTop: '1px solid var(--color-border-tertiary)', cursor: 'pointer' }} onClick={() => toggleExpand(h.date)}>
                    <td style={{ padding: '10px 12px' }}>
                      {expandedDate === h.date ? <IconChevronDown size={14} style={{ verticalAlign: 'middle' }} /> : <IconChevronRight size={14} style={{ verticalAlign: 'middle' }} />} {h.date}
                      {h.date === date && <span className="pill p-blue" style={{ marginLeft: 6, fontSize: 10 }}>表单中</span>}
                    </td>
                    <td style={{ padding: '10px 12px' }}>{h.total}</td>
                    <td style={{ padding: '10px 12px' }}><span className={`pill ${ST_CLS.present}`}>{h.present}</span></td>
                    <td style={{ padding: '10px 12px' }}><span className={`pill ${ST_CLS.absent}`}>{h.absent}</span></td>
                    <td style={{ padding: '10px 12px' }}><span className={`pill ${ST_CLS.leave}`}>{h.leave}</span></td>
                    {allowLate && <td style={{ padding: '10px 12px' }}><span className={`pill ${ST_CLS.late}`}>{h.late}</span></td>}
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', gap: 12 }}>
                        {allowBackfill && h.date >= nzDaysAgo(backfillDays) && (
                          <span className="link" onClick={(e) => { e.stopPropagation(); setDate(h.date); }}>载入编辑</span>
                        )}
                        <span className="link" style={{ color: 'var(--color-danger)' }} onClick={(e) => { e.stopPropagation(); deleteDay(h.date); }}>
                          <IconTrash size={13} style={{ verticalAlign: 'middle' }} /> 删当天
                        </span>
                      </div>
                    </td>
                  </tr>
                  {expandedDate === h.date && (
                    <tr>
                      <td colSpan={allowLate ? 7 : 6} style={{ padding: '6px 12px 14px', background: 'var(--color-bg-secondary)' }}>
                        {detail.length === 0 ? (
                          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', padding: 8 }}>加载中 / 无明细</div>
                        ) : detail.map(rec => (
                          <div key={rec.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--color-border-tertiary)' }}>
                            <span style={{ width: 90, fontWeight: 500, fontSize: 13 }}>{rec.name}</span>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {detailMarks.map(st => (
                                <button key={st} className={`btn ${rec.status === st ? 'btn-primary' : ''}`}
                                  onClick={() => changeRecordStatus(rec, st)}
                                  style={{
                                    padding: '2px 10px', fontSize: 12, minHeight: 0,
                                    backgroundColor: rec.status === st ? ST_COLOR[st] : undefined,
                                    borderColor: rec.status === st ? ST_COLOR[st] : undefined,
                                  }}>
                                  {ST_LABEL[st]}
                                </button>
                              ))}
                            </div>
                            {rec.notes && <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{rec.notes}</span>}
                            <span className="link" style={{ marginLeft: 'auto', color: 'var(--color-danger)' }} onClick={() => deleteRecord(rec)}>
                              <IconTrash size={13} style={{ verticalAlign: 'middle' }} /> 删除
                            </span>
                          </div>
                        ))}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </>
  );
}
