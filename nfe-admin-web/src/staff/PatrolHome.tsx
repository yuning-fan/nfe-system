// 巡查老师 · 我的工作台（真数据：待处理事项 + 今日点名/跟进状态，来自 daily_checks / violation_logs / warning_letters / study_follow_ups）
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconClipboardCheck, IconShieldX, IconNotebook, IconLoader2, IconUsers, IconChevronRight } from '@tabler/icons-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';

const db = supabase as any;

interface Todo { label: string; desc: string; tag: string; tagCls: string; to: string }

export default function PatrolHome() {
  const navigate = useNavigate();
  const operatorId = useAuthStore(s => s.user?.id ?? null);
  const [loading, setLoading] = useState(true);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [studentCount, setStudentCount] = useState(0);
  const [rollcallDone, setRollcallDone] = useState<{ present: number; absent: number; leave: number } | null>(null);
  const [todayStudy, setTodayStudy] = useState(0);      // 今天晚自习跟进+带背考察条数
  const [todayHomework, setTodayHomework] = useState(0); // 今天作业核查条数

  const load = useCallback(async () => {
    setLoading(true);
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const [{ count: studentTotal }, { data: pendingViol }, { data: myPendingLetters }, { data: todayChecks }, { data: pendingFu }, { data: todayFu }] = await Promise.all([
      db.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
      db.from('violation_logs').select('id, reason, created_at').eq('status', 'pending').order('created_at', { ascending: false }),
      operatorId
        ? db.from('warning_letters').select('id, student_id, warning_level, profiles!warning_letters_student_id_fkey(full_name)').eq('issuer_id', operatorId).eq('status', 'pending_approval')
        : Promise.resolve({ data: [] }),
      db.from('daily_checks').select('status').eq('check_type', 'night_study').gte('created_at', todayStart.toISOString()),
      db.from('study_follow_ups').select('id, student_id, category, profiles!study_follow_ups_student_id_fkey(full_name)').eq('needs_followup', true),
      db.from('study_follow_ups').select('category').gte('created_at', todayStart.toISOString()),
    ]);

    setStudentCount(studentTotal || 0);

    const list: Todo[] = [];
    // 学习跟进里挂着的待跟进（最高优先级：闭环别断在工作台）
    const fuList = (pendingFu || []) as any[];
    if (fuList.length > 0) {
      const names = Array.from(new Set(fuList.map(f => (Array.isArray(f.profiles) ? f.profiles[0]?.full_name : f.profiles?.full_name)).filter(Boolean)));
      list.push({
        label: '待跟进的学习记录',
        desc: `${names.slice(0, 3).join('、')}${names.length > 3 ? ` 等 ${names.length} 人` : ''} · 共 ${fuList.length} 项未闭环`,
        tag: '待跟进', tagCls: 'p-amber',
        to: 'follow-ups?tab=pending',
      });
    }
    if ((pendingViol || []).length > 0) {
      list.push({
        label: '待存档违规记录',
        desc: `${pendingViol![0].reason || '违规记录'} 等共 ${pendingViol!.length} 条待存档`,
        tag: '待存档', tagCls: 'p-amber',
        to: 'violations',
      });
    }
    for (const w of (myPendingLetters || []) as any[]) {
      const name = Array.isArray(w.profiles) ? w.profiles[0]?.full_name : w.profiles?.full_name;
      list.push({
        label: '待报批警告信',
        desc: `${name || '学生'} · 第 ${w.warning_level} 级警告信 · 已提交学管`,
        tag: '审批中', tagCls: 'p-blue',
        to: 'violations',
      });
    }
    setTodos(list);

    const checks = (todayChecks || []) as any[];
    if (checks.length > 0) {
      const c = { present: 0, absent: 0, leave: 0 };
      for (const r of checks) if (r.status in c) (c as any)[r.status]++;
      setRollcallDone(c);
    } else {
      setRollcallDone(null);
    }

    const fuToday = (todayFu || []) as any[];
    setTodayStudy(fuToday.filter(f => f.category === 'night_study' || f.category === 'recitation').length);
    setTodayHomework(fuToday.filter(f => f.category === 'homework_check').length);
    setLoading(false);
  }, [operatorId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><IconLoader2 className="spinner" size={28} style={{ color: 'var(--color-primary)' }} /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 待处理 */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: 12 }}>
          待处理 <span className={`pill ${todos.length > 0 ? 'p-red' : 'p-green'}`} style={{ marginLeft: 6 }}>{todos.length} 项</span>
        </div>
        {todos.length === 0 ? (
          <div style={{ padding: '10px 12px', fontSize: 13, color: 'var(--color-text-tertiary)' }}>暂无待处理事项</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {todos.map((t, i) => (
              <div key={i} onClick={() => navigate(t.to)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--color-bg-secondary)', borderRadius: 8, cursor: 'pointer' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{t.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{t.desc}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className={`pill ${t.tagCls}`}>{t.tag}</span>
                  <IconChevronRight size={16} style={{ color: 'var(--color-text-tertiary)' }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 警告信流程 */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: 8 }}>警告信流程</div>
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
          出具警告信需先报批学管老师审批，审批通过后方可出具。
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <span className="pill p-gray">① 口头通报</span>
          <span style={{ color: 'var(--color-text-tertiary)' }}>→</span>
          <span className="pill p-gray">② 电子警告信</span>
          <span style={{ color: 'var(--color-text-tertiary)' }}>→</span>
          <span className="pill p-gray">③ 最终警告信</span>
        </div>
      </div>

      {/* 今日日程 */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: 12 }}>今日日程</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <ScheduleRow
            icon={<IconClipboardCheck size={16} />} time="18:00" title="晚自习点名"
            desc={rollcallDone ? `已点名 · 缺席 ${rollcallDone.absent} 人 · 请假 ${rollcallDone.leave} 人` : '全体学生 · 记录出勤'}
            tag={rollcallDone ? '已完成' : '待执行'} tagCls={rollcallDone ? 'p-green' : 'p-amber'}
            onClick={() => navigate('rollcall')}
          />
          <ScheduleRow
            icon={<IconShieldX size={16} />} time="18:30+" title="晚自习跟进 / 带背考察"
            desc={todayStudy > 0 ? `今天已记 ${todayStudy} 条` : '学习情况监督检测 · 弱语言学生带背'}
            tag={todayStudy > 0 ? '进行中' : '待执行'} tagCls={todayStudy > 0 ? 'p-green' : 'p-amber'}
            onClick={() => navigate('follow-ups?batch=1')}
          />
          <ScheduleRow
            icon={<IconNotebook size={16} />} time="收作业" title="作业核查"
            desc={todayHomework > 0 ? `今天已记 ${todayHomework} 条` : '督促任务、批改作业、总结问题'}
            tag={todayHomework > 0 ? '进行中' : '待执行'} tagCls={todayHomework > 0 ? 'p-green' : 'p-amber'}
            onClick={() => navigate('follow-ups?batch=1')}
          />
        </div>
      </div>

      {/* 快捷入口 */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: 12 }}>快捷入口</div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <Stat n={String(studentCount)} label="应到" />
          <Stat n={rollcallDone ? String(studentCount - rollcallDone.absent - rollcallDone.leave) : '—'} label="已到" />
          <Stat n={rollcallDone ? String(rollcallDone.absent) : '—'} label="缺席" />
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button className="btn" onClick={() => navigate('follow-ups?batch=1')}>
              <IconUsers size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />批量记跟进
            </button>
            <button className="btn btn-primary" onClick={() => navigate('rollcall')}>
              <IconClipboardCheck size={16} style={{ marginRight: 6 }} />{rollcallDone ? '查看/修改点名' : '开始点名'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScheduleRow({ icon, time, title, desc, tag, tagCls, onClick }: { icon: React.ReactNode; time: string; title: string; desc: string; tag: string; tagCls: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--color-bg-secondary)', borderRadius: 8, cursor: onClick ? 'pointer' : undefined }}>
      <div style={{ width: 56, fontSize: 12, fontWeight: 600, color: 'var(--color-primary)' }}>{time}</div>
      <div style={{ color: 'var(--color-text-tertiary)' }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 500 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{desc}</div>
      </div>
      {tag && <span className={`pill ${tagCls}`}>{tag}</span>}
    </div>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 24, fontWeight: 700 }}>{n}</div>
      <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{label}</div>
    </div>
  );
}
