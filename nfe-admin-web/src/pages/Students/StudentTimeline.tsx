// 学生档案「时间线」tab —— 出勤率轨迹 + 各类非学业记录合并时间线
//
// 上半是轨迹（趋势，不适合混进事件流），下半是按时间倒序的合并记录。
// 数据与口径见 lib/studentTimeline.ts；点名只进异常，学业不进。
import { useEffect, useMemo, useState } from 'react';
import { IconLoader2, IconPaperclip, IconAlertTriangle } from '@tabler/icons-react';
import Sparkline from '../../components/common/Sparkline';
import {
  fetchStudentTimeline, TIMELINE_FILTERS, KIND_META, ratePill, CONTRACT_LINE,
  type TimelineResult, type TimelineKind,
} from '../../lib/studentTimeline';

const RATE_PREVIEW = 3;     // 轨迹下方默认显示几条录入记录
const SPARK_POINTS = 12;    // 折线最多取最近几次

export default function StudentTimeline({ studentId }: { studentId: string }) {
  const [data, setData] = useState<TimelineResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<string[]>(TIMELINE_FILTERS.map(f => f.key)); // 默认全开
  const [showAllRates, setShowAllRates] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const r = await fetchStudentTimeline(studentId);
      if (!alive) return;
      setData(r);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [studentId]);

  const allowed = useMemo(() => {
    const s = new Set<TimelineKind>();
    TIMELINE_FILTERS.filter(f => active.includes(f.key)).forEach(f => f.kinds.forEach(k => s.add(k)));
    return s;
  }, [active]);

  const shown = useMemo(
    () => (data?.events || []).filter(e => allowed.has(e.kind)),
    [data, allowed]
  );

  const toggle = (key: string) =>
    setActive(a => (a.includes(key) ? a.filter(k => k !== key) : [...a, key]));

  if (loading) {
    return (
      <div className="tabpage active">
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <IconLoader2 className="spinner" size={28} style={{ color: 'var(--color-primary)' }} />
        </div>
      </div>
    );
  }

  const rates = data?.ratePoints || [];
  const latest = rates.length ? rates[rates.length - 1] : null;
  const rateRows = [...rates].reverse();                      // 列表按时间倒序
  const visibleRates = showAllRates ? rateRows : rateRows.slice(0, RATE_PREVIEW);

  return (
    <div className="tabpage active">
      {data?.errors.length ? (
        <div style={{
          border: '1px solid #F5C97F', background: '#FFF5E6', color: '#A05000',
          borderRadius: 6, padding: '8px 12px', fontSize: 12, marginBottom: 16,
        }}>
          <IconAlertTriangle size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          部分记录读取失败，下方内容不完整：{data.errors.join('；')}
        </div>
      ) : null}

      {/* 出勤率轨迹 */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">官方出勤率轨迹</div>
        {!latest ? (
          <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>暂无出勤率录入记录</div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 26, fontWeight: 700 }}>{latest.rate}%</span>
              <span className={`pill ${ratePill(latest.rate).cls}`}>{ratePill(latest.rate).label}</span>
              <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                最近录入 {latest.date}{latest.staff ? ` · ${latest.staff}` : ''}
              </span>
            </div>

            <Sparkline
              points={rates.slice(-SPARK_POINTS).map(p => ({ label: p.date, value: p.rate }))}
              refLine={CONTRACT_LINE}
              refLabel={`合约线 ${CONTRACT_LINE}%`}
              dangerBelow={CONTRACT_LINE}
              unit="%"
            />

            <div style={{ marginTop: 10 }}>
              {visibleRates.map((r, i) => (
                <div key={`${r.date}-${i}`} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '6px 0', borderTop: i === 0 ? 'none' : '1px solid var(--color-border-tertiary)',
                  fontSize: 13,
                }}>
                  <span style={{ width: 86, color: 'var(--color-text-tertiary)', flexShrink: 0 }}>{r.date}</span>
                  <span style={{ width: 58, fontWeight: 500, flexShrink: 0 }}>{r.rate}%</span>
                  <span style={{ flex: 1, color: 'var(--color-text-secondary)' }}>
                    {r.note || <span style={{ color: 'var(--color-text-tertiary)' }}>—</span>}
                  </span>
                  {r.staff && (
                    <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', flexShrink: 0 }}>{r.staff}</span>
                  )}
                </div>
              ))}
              {rateRows.length > RATE_PREVIEW && (
                <span className="link" style={{ fontSize: 12 }} onClick={() => setShowAllRates(v => !v)}>
                  {showAllRates ? '收起' : `展开全部 ${rateRows.length} 次录入`}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* 合并时间线 */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: 10 }}>
          记录时间线
          <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--color-text-tertiary)', marginLeft: 8 }}>
            点名只显示缺席/请假/迟到；成绩、报告等学业记录在「学业跟进」
          </span>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {TIMELINE_FILTERS.map(f => {
            const on = active.includes(f.key);
            const n = (data?.events || []).filter(e => f.kinds.includes(e.kind)).length;
            return (
              <button key={f.key} className={`btn ${on ? 'btn-primary' : ''}`}
                style={{ padding: '3px 12px', fontSize: 12, minHeight: 0 }}
                onClick={() => toggle(f.key)}>
                {f.label} {n}
              </button>
            );
          })}
        </div>

        {shown.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
            {(data?.events || []).length === 0 ? '暂无记录' : '当前筛选下没有记录'}
          </div>
        ) : (
          <div>
            {shown.map(e => (
              <div key={e.key} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '10px 0', borderTop: '1px solid var(--color-border-tertiary)',
              }}>
                <span style={{ width: 86, flexShrink: 0, fontSize: 12, color: 'var(--color-text-tertiary)', paddingTop: 2 }}>
                  {e.date || <span title="该记录没有留下日期">日期未记录</span>}
                </span>
                <span className={`pill ${KIND_META[e.kind].cls}`} style={{ flexShrink: 0 }}>
                  {KIND_META[e.kind].label}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{e.title}</span>
                    {e.pill && <span className={`pill ${e.pill.cls}`}>{e.pill.label}</span>}
                    {e.attachmentUrl && (
                      <span title="该记录带附件，请到对应模块查看"
                        style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                        <IconPaperclip size={12} style={{ verticalAlign: 'middle' }} /> 附件
                      </span>
                    )}
                  </div>
                  {e.detail && (
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 3, wordBreak: 'break-word' }}>
                      {e.detail}
                    </div>
                  )}
                </div>
                {e.staff && (
                  <span style={{ flexShrink: 0, fontSize: 11, color: 'var(--color-text-tertiary)', paddingTop: 2 }}>
                    {e.staff}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
