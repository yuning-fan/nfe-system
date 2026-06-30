import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  IconAlertCircle, IconAlertTriangle, IconChartLine,
  IconLoader2, IconShieldX, IconUser, IconCheck, IconX, IconRefresh
} from '@tabler/icons-react';
import { message, Modal, Select } from 'antd';
import type { StudentInfo } from '../../types/database';
import { useRiskStore } from '../../store/useRiskStore';
import { recomputeAll, computeRisk, type RiskBreakdownItem, type RiskLevel } from '../../lib/riskEngine';
import WarningLetterModal from './WarningLetterModal';

type RiskStudent = StudentInfo & {
  profiles?: { full_name: string; phone: string | null } | Array<{ full_name: string; phone: string | null }>;
  student_enrollments?: { status: string; programs?: { name: string } };
};

interface RiskChangeLog {
  id: number;
  student_id: string;
  old_level: string;
  new_level: string;
  operator_id: string | null;
  reason: string | null;
  created_at: string;
  profiles?: { full_name: string };
}

export default function RiskAlerts() {
  const navigate = useNavigate();
  
  // Local state for dashboard
  const [redStudents, setRedStudents] = useState<RiskStudent[]>([]);
  const [yellowStudents, setYellowStudents] = useState<RiskStudent[]>([]);
  const [greenCount, setGreenCount] = useState(0);
  const [changeLogs, setChangeLogs] = useState<RiskChangeLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Store state for warning letters
  const {
    pendingWarnings, issuedWarnings,
    fetchPendingWarnings, fetchIssuedWarnings,
    issueWarning, approveWarning, rejectWarning, markWarningSigned, revokeWarning,
    isLoading: isStoreLoading,
  } = useRiskStore();

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string; score: number } | null>(null);
  const [recomputing, setRecomputing] = useState(false);

  // 扣分明细查询
  const [allStudents, setAllStudents] = useState<{ id: string; name: string }[]>([]);
  const [bdStudent, setBdStudent] = useState<string | undefined>();
  const [bd, setBd] = useState<{ score: number; level: RiskLevel; breakdown: RiskBreakdownItem[]; hardTriggers: string[]; notes: string[] } | null>(null);
  const [bdLoading, setBdLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('profiles').select('id, full_name').eq('role', 'student').order('full_name');
      setAllStudents(((data as any[]) || []).map(p => ({ id: p.id, name: p.full_name })));
    })();
  }, []);

  const loadBreakdown = async (studentId: string) => {
    setBdStudent(studentId); setBdLoading(true); setBd(null);
    try { setBd(await computeRisk(studentId)); } finally { setBdLoading(false); }
  };

  const handleRecomputeAll = () => {
    Modal.confirm({
      title: '重算全体学生风险分',
      content: '将按当前所有违规 / 出勤 / 警告信 / 证件 / 欠费 / 成绩数据，重新计算每名学生的风险分与等级。用于首次初始化或口径调整后刷新。',
      onOk: async () => {
        setRecomputing(true);
        try {
          await recomputeAll();
          message.success('全体风险分已重算完成');
          await fetchDashboardData();
        } catch (e: any) {
          message.error(e.message || '重算失败');
        } finally {
          setRecomputing(false);
        }
      },
    });
  };

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);

    const { data: red } = await supabase
      .from('students_info')
      .select('*, profiles(*), student_enrollments(status, programs(name))')
      .eq('risk_level', 'red');

    const { data: yellow } = await supabase
      .from('students_info')
      .select('*, profiles(*), student_enrollments(status, programs(name))')
      .eq('risk_level', 'yellow');

    const { count: greenCnt } = await supabase
      .from('students_info')
      .select('*', { count: 'exact', head: true })
      .eq('risk_level', 'green');

    const { data: logs } = await supabase
      .from('log_risk_changes')
      .select('*, student:profiles!log_risk_changes_student_id_fkey(full_name), operator:profiles!log_risk_changes_operator_id_fkey(full_name)')
      .order('created_at', { ascending: false })
      .limit(10);

    setRedStudents((red as RiskStudent[]) || []);
    setYellowStudents((yellow as RiskStudent[]) || []);
    setGreenCount(greenCnt || 0);
    setChangeLogs((logs as RiskChangeLog[]) || []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchDashboardData();
    fetchPendingWarnings();
    fetchIssuedWarnings();
  }, [fetchDashboardData, fetchPendingWarnings, fetchIssuedWarnings]);

  const getRiskPill = (from: string, to: string) => {
    const arrow = `${from === 'green' ? '🟢' : from === 'yellow' ? '🟡' : '🔴'} → ${to === 'green' ? '🟢' : to === 'yellow' ? '🟡' : '🔴'}`;
    const cls = to === 'red' ? 'p-red' : to === 'yellow' ? 'p-amber' : 'p-green';
    return <span className={`pill ${cls}`}>{arrow}</span>;
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays === 0) return `今天 ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    if (diffDays === 1) return '昨天';
    return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
  };

  const handleOpenWarningModal = (student: RiskStudent) => {
    const profile = Array.isArray(student.profiles) ? student.profiles[0] : student.profiles;
    setSelectedStudent({
      id: student.student_id,
      name: profile?.full_name || '未知',
      score: student.total_risk_score
    });
    setModalOpen(true);
  };

  // 三步走规则：级别 → (目标风险等级, 风险分扣减)
  // 1级 Verbal → 黄色, 扣0；2级 Written → 黄色, 扣10；3级 Final → 红色, 扣20
  const levelToRisk = (level: number): { riskLevel: string; deduction: number } => {
    if (level >= 3) return { riskLevel: 'red', deduction: 20 };
    if (level === 2) return { riskLevel: 'yellow', deduction: 10 };
    return { riskLevel: 'yellow', deduction: 0 };
  };

  const handleApprove = async (warning: any) => {
    const { riskLevel, deduction } = levelToRisk(warning.warning_level);
    Modal.confirm({
      title: '确认下发警告',
      content: `确定批准发给 ${warning.students_info?.profiles?.full_name} 的 ${warning.warning_level} 级警告信吗？将置为「${riskLevel === 'red' ? '红色' : '黄色'}」并扣 ${deduction} 分。`,
      onOk: async () => {
        const success = await approveWarning(warning.id, warning.student_id, riskLevel, deduction);
        if (success) {
          message.success('审批成功！已下发警告并更新风险分。');
          await Promise.all([fetchDashboardData(), fetchPendingWarnings(), fetchIssuedWarnings()]);
        } else {
          message.error('审批失败，请重试。');
        }
      }
    });
  };

  const handleReject = (warning: any) => {
    Modal.confirm({
      title: '确认拒绝警告',
      content: `确定拒绝发给 ${warning.students_info?.profiles?.full_name} 的警告信吗？拒绝后该申请将被关闭。`,
      okButtonProps: { danger: true },
      onOk: async () => {
        const success = await rejectWarning(warning.id);
        if (success) message.success('已拒绝该警告申请。');
        else message.error('操作失败，请重试。');
      }
    });
  };

  const handleRevoke = (warning: any) => {
    Modal.confirm({
      title: '撤销该警告信',
      content: `确定撤销发给 ${warning.students_info?.profiles?.full_name} 的警告信吗？撤销后该信不再计入风险，学生风险分会相应回升。`,
      okButtonProps: { danger: true },
      onOk: async () => {
        const success = await revokeWarning(warning.id, warning.student_id);
        if (success) {
          message.success('已撤销，风险分已重算');
          await fetchDashboardData();
        } else message.error('操作失败，请重试。');
      },
    });
  };

  const handleMarkSigned = (warning: any) => {
    Modal.confirm({
      title: '确认已线下签字',
      content: `确认 ${warning.students_info?.profiles?.full_name} 已线下签收该警告信吗？`,
      onOk: async () => {
        const success = await markWarningSigned(warning.id);
        if (success) message.success('已标记为现场签字。');
        else message.error('操作失败，请重试。');
      }
    });
  };

  if (isLoading && !redStudents.length) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <IconLoader2 className="spinner" size={32} style={{ color: 'var(--color-primary)' }} />
      </div>
    );
  }

  const totalStudents = redStudents.length + yellowStudents.length + greenCount;

  return (
    <>
      {/* 顶部操作条：一键重算 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn" onClick={handleRecomputeAll} disabled={recomputing}>
          {recomputing
            ? <><IconLoader2 size={16} className="spinner" style={{ marginRight: 6 }} /> 重算中…</>
            : <><IconRefresh size={16} style={{ marginRight: 6 }} /> 一键重算全员风险分</>}
        </button>
      </div>

      {/* 扣分明细查询（任意学生，含绿色） */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title" style={{ marginBottom: 10 }}>扣分明细查询</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Select
            showSearch optionFilterProp="label" style={{ width: 240 }} placeholder="选择学生查看当前扣分明细"
            value={bdStudent} onChange={loadBreakdown}
            options={allStudents.map(s => ({ label: s.name, value: s.id }))}
          />
          {bdLoading && <IconLoader2 size={16} className="spinner" style={{ color: 'var(--color-primary)' }} />}
          {bd && !bdLoading && (
            <span style={{ fontSize: 13 }}>
              当前 <b>{bd.score}</b> 分 ·{' '}
              <span className={`pill ${bd.level === 'red' ? 'p-red' : bd.level === 'yellow' ? 'p-amber' : 'p-green'}`}>
                {bd.level === 'red' ? '红' : bd.level === 'yellow' ? '黄' : '绿'}
              </span>
            </span>
          )}
        </div>
        {bd && !bdLoading && (
          <div style={{ marginTop: 12 }}>
            {bd.hardTriggers.length > 0 && (
              <div style={{ marginBottom: 8, fontSize: 13, color: 'var(--color-danger)' }}>
                ⚠️ 硬触发直接红：{bd.hardTriggers.join('、')}
              </div>
            )}
            {bd.notes && bd.notes.length > 0 && (
              <div style={{ marginBottom: 8, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                📌 {bd.notes.join('；')}
              </div>
            )}
            {bd.breakdown.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>近 15 天无扣分项，满分 100。</div>
            ) : (
              <table className="tbl" style={{ width: '100%', maxWidth: 520, textAlign: 'left' }}>
                <thead><tr>
                  <th style={{ padding: '8px 12px' }}>扣分项</th>
                  <th style={{ padding: '8px 12px' }}>明细</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>扣分</th>
                </tr></thead>
                <tbody>
                  {bd.breakdown.map((b, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--color-border-tertiary)' }}>
                      <td style={{ padding: '8px 12px' }}>{b.label}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--color-text-tertiary)', fontSize: 12 }}>{b.detail || '—'}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--color-danger)', fontWeight: 600 }}>−{b.points}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '2px solid var(--color-border-tertiary)' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 600 }} colSpan={2}>合计扣分</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--color-danger)' }}>
                      −{bd.breakdown.reduce((s, b) => s + b.points, 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* 待审批警告信区域 */}
      {pendingWarnings.length > 0 && (
        <div className="card" style={{ marginBottom: 16, border: '1px solid #EF9F27' }}>
          <div className="card-title" style={{ color: '#854F0B' }}>
            <IconAlertTriangle size={18} /> 待审批警告信 ({pendingWarnings.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pendingWarnings.map((w: any) => (
              <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, background: 'var(--color-bg-secondary)', borderRadius: 6 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{w.students_info?.profiles?.full_name || '未知学生'}</span>
                    <span className="pill p-red">{w.warning_level} 级警告</span>
                    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>发起人: {w.profiles?.full_name || '未知'}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                    佐证内容: {w.evidence_content}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" onClick={() => handleApprove(w)} disabled={isStoreLoading}>
                    <IconCheck size={16} style={{ marginRight: 4 }} /> 批准下发
                  </button>
                  <button className="btn" onClick={() => handleReject(w)} disabled={isStoreLoading} title="拒绝" style={{ color: 'var(--color-danger)' }}>
                    <IconX size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 已下发警告记录（含待签字 / 已签字） */}
      {issuedWarnings.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title">
            <IconShieldX size={18} /> 已下发警告记录 ({issuedWarnings.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {issuedWarnings.map((w: any) => {
              const signed = w.status === 'signed_onsite';
              return (
                <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, background: 'var(--color-background-secondary)', borderRadius: 6 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600 }}>{w.students_info?.profiles?.full_name || '未知学生'}</span>
                      <span className="pill p-red">{w.warning_level} 级警告</span>
                      <span className={`pill ${signed ? 'p-green' : 'p-amber'}`}>{signed ? '已签字' : '待签字'}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                      佐证内容: {w.evidence_content}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {!signed && (
                      <button className="btn" onClick={() => handleMarkSigned(w)} disabled={isStoreLoading}>
                        <IconCheck size={16} style={{ marginRight: 4 }} /> 标记已签字
                      </button>
                    )}
                    <button className="btn" onClick={() => handleRevoke(w)} disabled={isStoreLoading} style={{ color: 'var(--color-danger)' }}>
                      <IconX size={16} style={{ marginRight: 4 }} /> 撤销
                    </button>
                    <span className="link" onClick={() => navigate(`/students/${w.student_id}`)} style={{ alignSelf: 'center' }}>查看档案</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 统计卡片 */}
      <div className="g4" style={{ marginBottom: 14 }}>
        <div className="stat-card">
          <div className="stat-label">🟢 正常</div>
          <div className="stat-val" style={{ color: 'var(--color-success)' }}>{greenCount}</div>
          <div className="stat-sub">出勤稳定</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">🟡 需要关注</div>
          <div className="stat-val" style={{ color: '#854F0B' }}>{yellowStudents.length}</div>
          <div className="stat-sub">黄色预警</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">🔴 重点干预</div>
          <div className="stat-val" style={{ color: '#A32D2D' }}>{redStudents.length}</div>
          <div className="stat-sub">红色预警</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">本月变更</div>
          <div className="stat-val">{changeLogs.length}</div>
          <div className="stat-sub">等级变动次数</div>
        </div>
      </div>

      <div className="g2" style={{ alignItems: 'start' }}>
        {/* 左侧：红 + 黄 学生列表 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* 🔴 红色干预 */}
          <div className="card">
            <div className="card-title">
              <IconAlertCircle size={16} style={{ color: 'var(--color-danger)' }} />🔴 重点干预
            </div>
            {redStudents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
                暂无红色预警学生 🎉
              </div>
            ) : redStudents.map((s, idx) => {
              const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
              return (
                <div key={s.student_id} className="risk-row" style={{ borderBottom: idx < redStudents.length - 1 ? undefined : 'none', paddingBottom: idx < redStudents.length - 1 ? undefined : 0 }}>
                  <div className="dot dot-r"></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontWeight: 500 }}>{profile?.full_name || '未知'}</span>
                      <span className="pill p-red">红色</span>
                      <span className="pill p-gray" style={{ fontSize: 10 }}>风险分 {s.total_risk_score}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                      {s.school_name || '—'} · 风险积分 {s.total_risk_score} 分
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <div className="prog-bar">
                        <div className="prog-fill" style={{ width: `${Math.min(100, 100 - s.total_risk_score)}%`, background: '#E24B4A' }}></div>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                    <span className="link" onClick={() => navigate(`/students/${s.student_id}`)}>查看档案</span>
                    <button className="btn" onClick={() => handleOpenWarningModal(s)} style={{ padding: '3px 10px', fontSize: 11, color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}>
                      触发三步走警告
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 🟡 黄色关注 */}
          <div className="card">
            <div className="card-title">
              <IconAlertTriangle size={16} style={{ color: '#EF9F27' }} />🟡 需要关注
            </div>
            {yellowStudents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
                暂无黄色预警学生
              </div>
            ) : yellowStudents.map((s, idx) => {
              const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
              return (
                <div key={s.student_id} className="risk-row" style={{ borderBottom: idx < yellowStudents.length - 1 ? undefined : 'none', paddingBottom: idx < yellowStudents.length - 1 ? undefined : 0 }}>
                  <div className="dot dot-a"></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontWeight: 500 }}>{profile?.full_name || '未知'}</span>
                      <span className="pill p-amber">黄色</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                      {s.school_name || '—'} · 风险积分 {s.total_risk_score} 分
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <div className="prog-bar">
                        <div className="prog-fill" style={{ width: `${Math.min(100, 100 - s.total_risk_score)}%`, background: '#EF9F27' }}></div>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                    <span className="link" onClick={() => navigate(`/students/${s.student_id}`)}>查看档案</span>
                    <button className="btn" onClick={() => handleOpenWarningModal(s)} style={{ padding: '3px 10px', fontSize: 11 }}>触发警告</button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 全部正常提示 */}
          {redStudents.length === 0 && yellowStudents.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <IconShieldX size={48} style={{ color: 'var(--color-border-hover)', marginBottom: 16 }} />
              <h3 style={{ color: 'var(--color-text-secondary)' }}>当前无预警学生</h3>
              <p style={{ color: 'var(--color-text-tertiary)', fontSize: 13, marginTop: 8 }}>
                共 {totalStudents} 名学生，全部处于绿色正常状态 🎉
              </p>
            </div>
          )}
        </div>

        {/* 右侧：等级变更记录 */}
        <div className="card">
          <div className="card-title">
            <IconChartLine size={16} />近期等级变更记录
          </div>
          {changeLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
              <IconUser size={32} style={{ marginBottom: 8 }} />
              <div>暂无等级变更记录</div>
              <div style={{ marginTop: 6, fontSize: 11 }}>当学生风险等级发生变化时，记录会显示在这里</div>
            </div>
          ) : changeLogs.map((log, idx) => {
            const studentName = (Array.isArray((log as any).student) ? (log as any).student[0] : (log as any).student)?.full_name;
            const operatorName = (Array.isArray((log as any).operator) ? (log as any).operator[0] : (log as any).operator)?.full_name;
            return (
              <div key={log.id} className="risk-row" style={{ borderBottom: idx < changeLogs.length - 1 ? undefined : 'none' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontWeight: 500 }}>{studentName || '未知学生'}</span>
                    {getRiskPill(log.old_level, log.new_level)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                    {log.reason || (log.operator_id ? '手动覆盖' : '系统自动')}
                    {operatorName ? ` · 操作人 ${operatorName}` : ''}
                  </div>
                </div>
                <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{formatTime(log.created_at)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 模态框 */}
      {selectedStudent && (
        <WarningLetterModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          studentId={selectedStudent.id}
          studentName={selectedStudent.name}
          currentScore={selectedStudent.score}
          onSubmit={async (level, evidence) => {
            const success = await issueWarning(selectedStudent.id, level, evidence);
            if (success) {
              message.success('警告审批请求已提交');
              setModalOpen(false);
              fetchPendingWarnings();
            } else {
              throw new Error('提交失败');
            }
          }}
        />
      )}
    </>
  );
}
