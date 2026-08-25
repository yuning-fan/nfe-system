import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { message } from 'antd';
import {
  IconLoader2, IconChevronDown, IconChevronRight, IconRefresh,
  IconShieldLock, IconSearch, IconFilterOff,
} from '@tabler/icons-react';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../types/database.types';
import {
  AUDIT_TABLE_LABELS, AUDIT_ACTION_LABELS, AUDIT_ACTION_PILL, ROLE_LABELS,
  tableLabel, fieldLabel, formatValue, isUuid,
} from '../../lib/auditLabels';

type AuditLog = Database['public']['Tables']['audit_logs']['Row'];

const PAGE_SIZE = 20;
const TABLE_OPTIONS = Object.entries(AUDIT_TABLE_LABELS);

type Filters = {
  dateFrom: string; dateTo: string; actorId: string;
  tableName: string; action: string; keyword: string;
};
const EMPTY: Filters = { dateFrom: '', dateTo: '', actorId: '', tableName: '', action: '', keyword: '' };

/** 从一批日志里挖出所有 UUID（目标行主键 + 变更值里的外键），用于批量换成人名 */
function collectUuids(rows: AuditLog[]): string[] {
  const ids = new Set<string>();
  for (const r of rows) {
    if (isUuid(r.record_id)) ids.add(r.record_id);
    for (const blob of [r.old_data, r.new_data]) {
      if (blob && typeof blob === 'object') {
        for (const v of Object.values(blob as Record<string, unknown>)) {
          if (isUuid(v)) ids.add(v);
        }
      }
    }
  }
  return [...ids];
}

export default function SystemLogs() {
  const [rows, setRows] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [nameMap, setNameMap] = useState<Record<string, string>>({});
  const [staff, setStaff] = useState<{ id: string; full_name: string }[]>([]);

  // draft 是输入框里的值，applied 是真正打给后端的值——避免每敲一个字就查一次库
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const from = (page - 1) * PAGE_SIZE;

    let q = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (applied.dateFrom) q = q.gte('created_at', `${applied.dateFrom}T00:00:00`);
    if (applied.dateTo) q = q.lte('created_at', `${applied.dateTo}T23:59:59.999`);
    if (applied.actorId) q = q.eq('actor_id', applied.actorId);
    if (applied.tableName) q = q.eq('table_name', applied.tableName);
    if (applied.action) q = q.eq('action', applied.action);
    if (applied.keyword.trim()) {
      const k = applied.keyword.trim().replace(/[%,]/g, '');
      q = q.or(`record_id.ilike.%${k}%,actor_name.ilike.%${k}%`);
    }

    const { data, error, count } = await q;
    if (error) {
      // 非 admin 会被 RLS 挡成空集而不是报错；真报错就是别的问题
      message.error(`日志读取失败：${error.message}`);
      setRows([]); setTotal(0); setLoading(false);
      return;
    }

    const list = (data || []) as AuditLog[];
    setRows(list);
    setTotal(count || 0);
    setExpanded(null);

    // 批量把 UUID 换成人名
    const ids = collectUuids(list).filter(id => !nameMap[id]);
    if (ids.length) {
      const { data: people } = await supabase
        .from('profiles').select('id, full_name').in('id', ids.slice(0, 200));
      if (people?.length) {
        setNameMap(prev => {
          const next = { ...prev };
          for (const p of people) next[p.id] = p.full_name;
          return next;
        });
      }
    }
    setLoading(false);
  }, [page, applied, nameMap]);

  // 只在翻页/应用筛选时重查；fetchLogs 依赖 nameMap，放进依赖会自查成环
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void fetchLogs(); }, [page, applied]);

  useEffect(() => {
    supabase.from('profiles').select('id, full_name').neq('role', 'student').order('full_name')
      .then(({ data }) => setStaff(data || []));
  }, []);

  const applyFilters = () => { setPage(1); setApplied(draft); };
  const resetFilters = () => { setPage(1); setDraft(EMPTY); setApplied(EMPTY); };
  const hasFilter = useMemo(() => JSON.stringify(applied) !== JSON.stringify(EMPTY), [applied]);

  /** 一行日志的「改了什么」概要 */
  const summary = (r: AuditLog) => {
    if (r.action === 'UPDATE') {
      const fields = (r.changed_fields || []).map(fieldLabel);
      if (!fields.length) return '—';
      return fields.length <= 3 ? fields.join('、') : `${fields.slice(0, 3).join('、')} 等 ${fields.length} 项`;
    }
    return r.action === 'INSERT' ? '新增整条记录' : '删除整条记录';
  };

  /** 展开区：UPDATE 显示逐字段前后对比，新增/删除显示整行快照 */
  const renderDetail = (r: AuditLog) => {
    const oldObj = (r.old_data || {}) as Record<string, unknown>;
    const newObj = (r.new_data || {}) as Record<string, unknown>;
    const keys = r.action === 'UPDATE'
      ? (r.changed_fields || [])
      : Object.keys(r.action === 'DELETE' ? oldObj : newObj);

    if (!keys.length) {
      return <div style={{ padding: 12, color: 'var(--color-text-tertiary)', fontSize: 12 }}>无字段明细</div>;
    }

    return (
      <table className="tbl" style={{ margin: 0, fontSize: 12, background: 'var(--color-bg-secondary)' }}>
        <thead>
          <tr>
            <th style={{ width: 160 }}>字段</th>
            <th>{r.action === 'INSERT' ? '值' : '修改前'}</th>
            {r.action !== 'INSERT' && <th>{r.action === 'DELETE' ? '（已删除）' : '修改后'}</th>}
          </tr>
        </thead>
        <tbody>
          {keys.map(k => (
            <tr key={k}>
              <td style={{ fontWeight: 500 }}>
                {fieldLabel(k)}
                <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 400, marginLeft: 4 }}>{k}</span>
              </td>
              <td style={{ color: r.action === 'UPDATE' ? 'var(--color-text-secondary)' : undefined }}>
                {formatValue(r.action === 'INSERT' ? newObj[k] : oldObj[k], nameMap)}
              </td>
              {r.action !== 'INSERT' && (
                <td style={{ fontWeight: r.action === 'UPDATE' ? 500 : 400 }}>
                  {r.action === 'DELETE' ? '—' : formatValue(newObj[k], nameMap)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <>
      {/* 口径说明：省得以后有人问「为什么某某操作没记」 */}
      <div className="card" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 14, padding: '12px 14px' }}>
        <IconShieldLock size={18} style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
          日志由数据库触发器自动记录，任何人（含管理员）都无法修改或删除，仅管理员可查看。
          核心业务表记录全部增删改，课表、成绩、报告等高频表只记录删除与关键字段变动；
          日常运营流水（点名、报餐、卫生检查等）不在此列，请到对应业务页面查看。
          密码类字段只留「被修改过」的事实，不保存明文。
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="card" style={{ marginBottom: 14, padding: '12px 14px' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">起始日期</label>
            <input className="input" type="date" value={draft.dateFrom}
              onChange={e => setDraft({ ...draft, dateFrom: e.target.value })} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">截止日期</label>
            <input className="input" type="date" value={draft.dateTo}
              onChange={e => setDraft({ ...draft, dateTo: e.target.value })} />
          </div>
          <div className="form-group" style={{ margin: 0, minWidth: 140 }}>
            <label className="form-label">操作人</label>
            <select className="input" value={draft.actorId}
              onChange={e => setDraft({ ...draft, actorId: e.target.value })}>
              <option value="">全部</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0, minWidth: 150 }}>
            <label className="form-label">模块</label>
            <select className="input" value={draft.tableName}
              onChange={e => setDraft({ ...draft, tableName: e.target.value })}>
              <option value="">全部</option>
              {TABLE_OPTIONS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0, minWidth: 110 }}>
            <label className="form-label">动作</label>
            <select className="input" value={draft.action}
              onChange={e => setDraft({ ...draft, action: e.target.value })}>
              <option value="">全部</option>
              {Object.entries(AUDIT_ACTION_LABELS).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 160 }}>
            <label className="form-label">关键词（操作人姓名 / 目标 ID）</label>
            <input className="input" value={draft.keyword} placeholder="回车搜索"
              onChange={e => setDraft({ ...draft, keyword: e.target.value })}
              onKeyDown={e => { if (e.key === 'Enter') applyFilters(); }} />
          </div>
          <button className="btn btn-primary" onClick={applyFilters}>
            <IconSearch size={14} style={{ marginRight: 4 }} />查询
          </button>
          {hasFilter && (
            <button className="btn" onClick={resetFilters}>
              <IconFilterOff size={14} style={{ marginRight: 4 }} />重置
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
          共 {total} 条{hasFilter ? '（已筛选）' : ''}
        </div>
        <button className="btn" onClick={fetchLogs} disabled={loading}>
          <IconRefresh size={14} style={{ marginRight: 4 }} />刷新
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-scroll">
          <table className="tbl" style={{ minWidth: 900 }}>
            <thead>
              <tr>
                <th style={{ width: 32 }} />
                <th style={{ width: 150 }}>时间</th>
                <th style={{ width: 130 }}>操作人</th>
                <th style={{ width: 70 }}>动作</th>
                <th style={{ width: 130 }}>模块</th>
                <th style={{ width: 160 }}>目标</th>
                <th>变更内容</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}>
                  <IconLoader2 className="spinner" size={24} style={{ color: 'var(--color-primary)' }} />
                </td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: 'var(--color-text-tertiary)' }}>
                  {hasFilter ? '没有符合条件的记录' : '暂无操作记录'}
                </td></tr>
              ) : rows.map(r => {
                const open = expanded === r.id;
                const target = isUuid(r.record_id)
                  ? (nameMap[r.record_id!] || `${r.record_id!.slice(0, 8)}…`)
                  : (r.record_id || '—');
                return (
                  <Fragment key={r.id}>
                    <tr style={{ cursor: 'pointer' }} onClick={() => setExpanded(open ? null : r.id)}>
                      <td style={{ color: 'var(--color-text-tertiary)' }}>
                        {open ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {new Date(r.created_at).toLocaleString('zh-CN', { hour12: false })}
                      </td>
                      <td>
                        {r.actor_name || '—'}
                        {r.actor_role && (
                          <span style={{ color: 'var(--color-text-tertiary)', fontSize: 11, marginLeft: 4 }}>
                            {ROLE_LABELS[r.actor_role] || r.actor_role}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`pill ${AUDIT_ACTION_PILL[r.action] || 'p-gray'}`}>
                          {AUDIT_ACTION_LABELS[r.action] || r.action}
                        </span>
                      </td>
                      <td>{tableLabel(r.table_name)}</td>
                      <td style={{ fontSize: 12 }}>{target}</td>
                      <td style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{summary(r)}</td>
                    </tr>
                    {open && (
                      <tr>
                        <td colSpan={7} style={{ padding: 0 }}>{renderDetail(r)}</td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 14 }}>
          <button className="btn" disabled={page <= 1 || loading} onClick={() => setPage(p => p - 1)}>上一页</button>
          <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{page} / {totalPages}</span>
          <button className="btn" disabled={page >= totalPages || loading} onClick={() => setPage(p => p + 1)}>下一页</button>
        </div>
      )}
    </>
  );
}
