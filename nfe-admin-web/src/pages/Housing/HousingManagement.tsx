import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { IconPlus, IconHistory, IconLoader2, IconHome, IconUser, IconLogout, IconChevronDown, IconChevronRight, IconBuilding, IconPencil } from '@tabler/icons-react';
import { message, Modal } from 'antd';
import HousingAssignmentModal from './HousingAssignmentModal';

interface DormRoom {
  id: number;
  building_name: string;
  unit: string | null;        // 单元号，如 13D / 6号；Tiverton 三栋无单元层，为 null
  unit_info: string | null;   // 单元标注，如「男」「女 · 3.5 卫」
  is_active: boolean;
  room_number: string;
  capacity: number;
  notes: string | null;
  room_status: 'occupied' | 'move_in_soon' | 'move_out_soon' | 'vacant' | 'maintenance' | 'unavailable';
}

interface DormAssignment {
  id: number;
  dorm_id: number;
  student_id: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  profiles: { full_name: string } | null;
}

// 公寓监护人现由 apartment_guardians 表驱动（DCG 流程共用同一份数据）

const statusConfig: Record<string, { label: string; bg: string; borderColor: string; textColor: string }> = {
  occupied:      { label: '已入住', bg: '#EEFAD4', borderColor: '#C0DD97', textColor: '#3B6D11' },
  move_in_soon:  { label: '即将入住', bg: '#EBF4FF', borderColor: '#B5D4F4', textColor: '#185FA5' },
  move_out_soon: { label: '即将退房', bg: '#FFF8EB', borderColor: '#FAC775', textColor: '#854F0B' },
  vacant:        { label: '空房', bg: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-tertiary)', textColor: 'var(--color-text-tertiary)' },
  maintenance:   { label: '维修中', bg: '#FFF3EB', borderColor: '#FAC775', textColor: '#854F0B' },
  unavailable:   { label: '不可用', bg: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-tertiary)', textColor: 'var(--color-text-tertiary)' },
};

// 单元号排序：6号/7号/10号 要按数字排，纯字母序会把 10号 排到 6号 前面。
// 带数字的按数字，不带的（13D/13E）退回字母序。
const unitRank = (u: string) => {
  const m = u.match(/\d+/);
  return m ? Number(m[0]) : Number.MAX_SAFE_INTEGER;
};
const byUnit = (a: string, b: string) => unitRank(a) - unitRank(b) || a.localeCompare(b, 'zh');

// 房间排序：房间1…房间5 按数字，双人间排在单间之后
const roomRank = (r: string) => {
  const m = r.match(/房间\s*(\d+)/);
  if (m) return Number(m[1]);
  return r.includes('双人间') ? 900 : 500;
};
const byRoom = (a: string, b: string) => roomRank(a) - roomRank(b) || a.localeCompare(b, 'zh');

// 可住床位：不可用（生活老师房）与维修中的房间不计入
const bedCount = (rooms: DormRoom[]) =>
  rooms.filter((r) => r.room_status !== 'unavailable' && r.room_status !== 'maintenance')
       .reduce((n, r) => n + r.capacity, 0);

export default function HousingManagement() {
  const [rooms, setRooms] = useState<DormRoom[]>([]);
  const [assignments, setAssignments] = useState<DormAssignment[]>([]);
  const [guardians, setGuardians] = useState<Record<string, string | null>>({}); // building → staff_id
  const [staffList, setStaffList] = useState<{ id: string; full_name: string }[]>([]);
  const [intake, setIntake] = useState<{ label: string; count: number; names: string[] }>({ label: 'Intake', count: 0, names: [] });
  const [isLoading, setIsLoading] = useState(true);

  const changeGuardian = async (building: string, staffId: string) => {
    const val = staffId || null;
    setGuardians(prev => ({ ...prev, [building]: val }));
    const { error } = await (supabase.from('apartment_guardians') as any)
      .update({ guardian_staff_id: val, updated_at: new Date().toISOString() })
      .eq('building_name', building);
    if (error) message.error('监护人更新失败');
    else message.success('监护人已更新');
  };

  const renderGuardianSelect = (building: string) => (
    <select
      className="sel"
      value={guardians[building] || ''}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => changeGuardian(building, e.target.value)}
      style={{ fontSize: 11, padding: '2px 6px', marginLeft: 4 }}
    >
      <option value="">未分配</option>
      {staffList.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
    </select>
  );
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [preselectedRoomId, setPreselectedRoomId] = useState<number | null>(null);

  // Notes editing state
  const [editingNote, setEditingNote] = useState<{ roomId: number; text: string } | null>(null);
  const [isSavingNote, setIsSavingNote] = useState(false);

  const saveNote = async () => {
    if (!editingNote) return;
    setIsSavingNote(true);
    const db = supabase as any;
    const { error } = await db.from('dorms').update({ notes: editingNote.text || null }).eq('id', editingNote.roomId);
    setIsSavingNote(false);
    if (error) { message.error('保存失败'); return; }
    message.success('备注已更新');
    setEditingNote(null);
    fetchData();
  };

  // 单元折叠状态，键为「公寓|单元」；默认展开
  const [collapsedUnits, setCollapsedUnits] = useState<Record<string, boolean>>({});

  const fetchData = async () => {
    setIsLoading(true);
    // 只取在用房源；停用的（如已退租的 51B Shoreham）留在库里保历史，但不进页面
    const { data: dormData } = await supabase
      .from('dorms')
      .select('*')
      .eq('is_active', true)
      .order('building_name')
      .order('room_number');
    const { data: assignData } = await supabase
      .from('dorm_assignments')
      .select('*, profiles!student_id(full_name)')
      .eq('is_active', true);
    const { data: guardianData } = await supabase
      .from('apartment_guardians')
      .select('building_name, guardian_staff_id');
    const { data: staffData } = await supabase
      .from('profiles')
      .select('id, full_name')
      .neq('role', 'student')
      .order('full_name');
    setRooms((dormData as DormRoom[]) || []);
    setAssignments((assignData as DormAssignment[]) || []);
    const gmap: Record<string, string | null> = {};
    for (const g of (guardianData as any[]) || []) gmap[g.building_name] = g.guardian_staff_id;
    setGuardians(gmap);
    setStaffList((staffData as any) || []);

    // 最近一批 Intake：未来入学的报名按月份分组，取最早的那个月
    const { data: enrData } = await (supabase as any)
      .from('student_enrollments')
      .select('student_id, start_date, profiles!student_id(full_name)')
      .not('start_date', 'is', null);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const future = ((enrData as any[]) || []).filter(e => e.start_date && new Date(e.start_date) >= today);
    if (future.length) {
      const byMonth: Record<string, any[]> = {};
      for (const e of future) { const k = String(e.start_date).slice(0, 7); (byMonth[k] ||= []).push(e); }
      const nextKey = Object.keys(byMonth).sort()[0];
      const group = byMonth[nextKey];
      // 同一学生去重取名
      const seen = new Set<string>(); const names: string[] = [];
      for (const e of group) {
        if (seen.has(e.student_id)) continue;
        seen.add(e.student_id);
        const nm = Array.isArray(e.profiles) ? e.profiles[0]?.full_name : e.profiles?.full_name;
        if (nm) names.push(nm);
      }
      setIntake({ label: `${Number(nextKey.slice(5, 7))}月 Intake`, count: seen.size, names });
    } else {
      setIntake({ label: 'Intake', count: 0, names: [] });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <IconLoader2 className="spinner" size={32} style={{ color: 'var(--color-primary)' }} />
      </div>
    );
  }

  // Group rooms by building
  const buildingNames = [...new Set(rooms.map((r) => r.building_name))];
  const filteredBuildings = selectedBuilding ? [selectedBuilding] : buildingNames;

  // Get assignments for a given room
  const getAssignments = (roomId: number) =>
    assignments.filter((a) => a.dorm_id === roomId);

  // Summary stats
  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter((r) => r.room_status === 'occupied').length;
  const vacantRooms = rooms.filter((r) => r.room_status === 'vacant').length;
  const totalResidents = assignments.length;

  const handleCheckout = (assignment: DormAssignment) => {
    Modal.confirm({
      title: '办理退房',
      content: `确认将 ${assignment.profiles?.full_name || '该生'} 从当前房间办理退房并结束住宿吗？`,
      okButtonProps: { danger: true },
      onOk: async () => {
        const { error } = await (supabase.from('dorm_assignments') as any)
          .update({ is_active: false, end_date: new Date().toISOString().split('T')[0] })
          .eq('id', assignment.id);
        if (error) { message.error('退房办理失败'); return; }
        const roomOccupants = assignments.filter(a => a.dorm_id === assignment.dorm_id && a.id !== assignment.id);
        if (roomOccupants.length === 0) {
          await (supabase.from('dorms') as any).update({ room_status: 'vacant' }).eq('id', assignment.dorm_id);
        }
        message.success('已成功办理退房');
        fetchData();
      }
    });
  };

  // Render a single room card (shared by both building types)
  const renderRoomCard = (room: DormRoom) => {
    const cfg = statusConfig[room.room_status] || statusConfig.vacant;
    const occupants = getAssignments(room.id);
    return (
      <div
        key={room.id}
        className="room-card"
        style={{
          background: cfg.bg,
          border: `1.5px solid ${cfg.borderColor}`,
          minHeight: occupants.length > 1 ? 120 : undefined,
          position: 'relative',
        }}
      >
        <div className="room-num">{room.room_number}</div>
        {occupants.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {occupants.map((a) => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <IconUser size={11} style={{ color: cfg.textColor, flexShrink: 0 }} />
                  <span className="room-name" style={{ color: cfg.textColor, fontWeight: 500, fontSize: 12 }}>
                    {a.profiles?.full_name || '—'}
                  </span>
                </div>
                <button
                  className="btn"
                  style={{ padding: '2px 4px', minHeight: 0, height: 20, fontSize: 10, background: 'transparent', border: 'none' }}
                  onClick={() => handleCheckout(a)}
                  title="办理退房"
                >
                  <IconLogout size={12} color="var(--color-danger)" />
                </button>
              </div>
            ))}
            <div className="room-date" style={{ marginTop: 2 }}>
              {room.room_number.includes('双人间') ? `${occupants.length}/${room.capacity} 人` : '在住'}
            </div>
          </div>
        ) : (
          <>
            <div className="room-name" style={{ color: cfg.textColor }}>
              {room.room_status === 'maintenance' ? '维修中'
                : room.room_status === 'unavailable' ? '不可用' : '空房'}
            </div>
            <div className="room-date">
              {room.room_status === 'vacant' ? '可安排入住' : '不计入可用床位'}
            </div>
            {room.room_status === 'vacant' && (
              <div style={{ marginTop: 4 }}>
                <button
                  className="btn"
                  style={{ fontSize: 10, padding: '2px 8px' }}
                  onClick={() => { setPreselectedRoomId(room.id); setIsAssignModalOpen(true); }}
                >分配</button>
              </div>
            )}
          </>
        )}
        {room.notes && (
          <div style={{
            marginTop: 4, fontSize: 10, padding: '2px 6px',
            background: '#EBF4FF', borderRadius: 4,
            color: '#185FA5', border: '1px solid #B5D4F4', lineHeight: 1.4,
          }}>
            {room.notes}
          </div>
        )}
        {/* Note edit button — always visible as tiny pencil in corner */}
        <button
          className="btn"
          title="编辑备注"
          style={{ position: 'absolute', top: 4, right: 4, padding: '1px 3px', minHeight: 0, height: 18, background: 'transparent', border: 'none', opacity: 0.4 }}
          onClick={(e) => { e.stopPropagation(); setEditingNote({ roomId: room.id, text: room.notes || '' }); }}
        >
          <IconPencil size={11} />
        </button>
      </div>
    );
  };

  // 带单元层的公寓（Unilodge / 55 Margan）：公寓 → 单元 → 房间
  const renderUnitBuilding = (buildingName: string, buildingRooms: DormRoom[]) => {
    const allResidents = buildingRooms.flatMap((r) => getAssignments(r.id));
    // 床位只算可住的：生活老师房、维修房标为 unavailable/maintenance，不进分母
    const beds = bedCount(buildingRooms);

    const byUnitMap: Record<string, DormRoom[]> = {};
    for (const room of buildingRooms) (byUnitMap[room.unit || '其他'] ||= []).push(room);
    const unitNames = Object.keys(byUnitMap).sort(byUnit);

    return (
      <div key={buildingName} className="card" style={{ marginBottom: 14 }}>
        <div className="card-title">
          <IconBuilding size={16} />
          <span style={{ fontWeight: 600 }}>{buildingName}</span>
          <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--color-text-secondary)', marginLeft: 4, display: 'inline-flex', alignItems: 'center' }}>
            · 监护人：{renderGuardianSelect(buildingName)}
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 400, color: 'var(--color-text-tertiary)' }}>
            {unitNames.length} 个单元 · {buildingRooms.length} 间房 · {allResidents.length}/{beds} 床位
          </span>
        </div>

        {unitNames.map((unitName) => {
          const key = `${buildingName}|${unitName}`;
          const expanded = !collapsedUnits[key];
          const unitRooms = byUnitMap[unitName].slice().sort((a, b) => byRoom(a.room_number, b.room_number));
          const unitResidents = unitRooms.flatMap((r) => getAssignments(r.id));
          const unitBeds = bedCount(unitRooms);
          const info = unitRooms.find((r) => r.unit_info)?.unit_info;
          const free = unitBeds - unitResidents.length;

          return (
            <div key={unitName} style={{ marginBottom: 10 }}>
              <div
                onClick={() => setCollapsedUnits((prev) => ({ ...prev, [key]: expanded }))}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                  padding: '8px 12px', borderRadius: 8,
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border-tertiary)',
                  marginBottom: expanded ? 10 : 0,
                  userSelect: 'none',
                }}
              >
                {expanded
                  ? <IconChevronDown size={14} style={{ color: 'var(--color-text-tertiary)' }} />
                  : <IconChevronRight size={14} style={{ color: 'var(--color-text-tertiary)' }} />}
                <span style={{ fontWeight: 600, fontSize: 13 }}>{unitName}</span>
                {info && (
                  <span className={`pill ${info.startsWith('男') ? 'p-blue' : info.startsWith('女') ? 'p-purple' : 'p-gray'}`} style={{ fontSize: 10 }}>
                    {info}
                  </span>
                )}
                <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                  {unitResidents.length}/{unitBeds} 床位
                  {free > 0 && <span style={{ color: '#185FA5' }}> · 空 {free}</span>}
                </span>
                {!expanded && unitResidents.length > 0 && (
                  <span style={{ fontSize: 11, color: '#3B6D11', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    · {unitResidents.map((a) => a.profiles?.full_name).join('、')}
                  </span>
                )}
              </div>
              {expanded && (
                <div className="room-grid" style={{ paddingLeft: 12 }}>
                  {unitRooms.map((room) => renderRoomCard(room))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* Stats strip */}
      <div className="g4" style={{ marginBottom: 14 }}>
        <div className="stat-card">
          <div className="stat-label">总房间数</div>
          <div className="stat-val">{totalRooms}</div>
          <div className="stat-sub">{buildingNames.length} 栋</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">已入住</div>
          <div className="stat-val" style={{ color: 'var(--color-success)' }}>{occupiedRooms}</div>
          <div className="stat-sub">{totalResidents} 名学生</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">空房</div>
          <div className="stat-val" style={{ color: 'var(--color-text-secondary)' }}>{vacantRooms}</div>
          <div className="stat-sub">可安排入住</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{intake.label}</div>
          <div className="stat-val" style={{ color: '#185FA5' }}>{intake.count}</div>
          <div className="stat-sub">
            {intake.count === 0
              ? '暂无新生入学'
              : intake.names.slice(0, 2).join('·') + (intake.count > 2 ? `·+${intake.count - 2}` : '')}
          </div>
        </div>
      </div>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <select className="sel" value={selectedBuilding} onChange={(e) => setSelectedBuilding(e.target.value)}>
            <option value="">全部公寓</option>
            {buildingNames.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'var(--color-text-secondary)' }}>
            {Object.entries(statusConfig).filter(([k]) => ['occupied','move_in_soon','vacant','maintenance'].includes(k)).map(([key, val]) => (
              <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: val.borderColor, display: 'inline-block' }}></span>
                {val.label}
              </span>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn"><IconHistory size={14} style={{ marginRight: 4 }} />历史记录</button>
          <button className="btn btn-primary" onClick={() => setIsAssignModalOpen(true)}><IconPlus size={14} style={{ marginRight: 4 }} />分配房间</button>
        </div>
      </div>

      {/* Buildings */}
      {filteredBuildings.map((buildingName) => {
        const buildingRooms = rooms.filter((r) => r.building_name === buildingName);

        // 有单元层的公寓（Unilodge / 55 Margan）走分组渲染
        if (buildingRooms.some((r) => r.unit)) {
          return renderUnitBuilding(buildingName, buildingRooms);
        }

        // 无单元层的公寓（Tiverton 三栋）：平铺房间
        const occupied = buildingRooms.filter((r) => r.room_status === 'occupied').length;
        const allResidents = buildingRooms.flatMap((r) => getAssignments(r.id));

        return (
          <div key={buildingName} className="card" style={{ marginBottom: 14 }}>
            <div className="card-title">
              <IconHome size={16} />
              <span style={{ fontWeight: 600 }}>{buildingName}</span>
              <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--color-text-secondary)', marginLeft: 4, display: 'inline-flex', alignItems: 'center' }}>
                · 监护人：{renderGuardianSelect(buildingName)}
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 400, color: 'var(--color-text-tertiary)' }}>
                {occupied}/{buildingRooms.length} 房间已入住 · {allResidents.length} 名学生
              </span>
            </div>
            <div className="room-grid">
              {buildingRooms.map((room) => renderRoomCard(room))}
            </div>
          </div>
        );
      })}

      {/* Assignment Modal */}
      <HousingAssignmentModal
        isOpen={isAssignModalOpen}
        onClose={() => { setIsAssignModalOpen(false); setPreselectedRoomId(null); }}
        onSuccess={fetchData}
        availableRooms={rooms.filter(r => r.room_status === 'vacant' || (r.room_status === 'occupied' && getAssignments(r.id).length < r.capacity))}
        preselectedRoomId={preselectedRoomId}
      />

      {/* Notes Edit Modal */}
      <Modal
        title="编辑房间备注"
        open={editingNote !== null}
        onCancel={() => setEditingNote(null)}
        onOk={saveNote}
        confirmLoading={isSavingNote}
        okText="保存"
        cancelText="取消"
        width={400}
      >
        <textarea
          style={{ width: '100%', minHeight: 80, padding: '8px 10px', borderRadius: 6, border: '1px solid var(--color-border)', fontSize: 13, resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
          placeholder="输入备注，留空则清除备注…"
          value={editingNote?.text ?? ''}
          onChange={e => setEditingNote(prev => prev ? { ...prev, text: e.target.value } : null)}
          autoFocus
        />
        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 6 }}>
          备注为空则清除现有内容。
        </div>
      </Modal>
    </>
  );
}
