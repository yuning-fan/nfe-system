import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { IconPlus, IconHistory, IconLoader2, IconHome, IconUser, IconLogout, IconChevronDown, IconChevronRight, IconBuilding, IconPencil } from '@tabler/icons-react';
import { message, Modal } from 'antd';
import HousingAssignmentModal from './HousingAssignmentModal';

interface DormRoom {
  id: number;
  building_name: string;
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

// Parse City UniLodge room number like "1F-01-A" → { floor: '1', suite: '01', room: 'A' }
function parseCityRoom(roomNumber: string) {
  const m = roomNumber.match(/^(\d+)F-0?(\d+)-([A-Z]+)$/);
  if (!m) return null;
  return { floor: m[1], suite: m[2].padStart(2, '0'), room: m[3] };
}

export default function HousingManagement() {
  const [rooms, setRooms] = useState<DormRoom[]>([]);
  const [assignments, setAssignments] = useState<DormAssignment[]>([]);
  const [guardians, setGuardians] = useState<Record<string, string | null>>({}); // building → staff_id
  const [staffList, setStaffList] = useState<{ id: string; full_name: string }[]>([]);
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

  // Collapse state for City UniLodge floors
  const [expandedFloors, setExpandedFloors] = useState<Record<string, boolean>>({ '1': true, '2': true });
  // Collapse state for City UniLodge suites
  const [expandedSuites, setExpandedSuites] = useState<Record<string, boolean>>({});

  const fetchData = async () => {
    setIsLoading(true);
    const { data: dormData } = await supabase
      .from('dorms')
      .select('*')
      .order('building_name')
      .order('room_number');
    const { data: assignData } = await supabase
      .from('dorm_assignments')
      .select('*, profiles(full_name)')
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
              {room.room_status === 'maintenance' ? '维修中' : '空房'}
            </div>
            <div className="room-date">可安排入住</div>
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

  // Render City UniLodge with hierarchical floor → suite → room layout
  const renderCityUniLodge = (buildingRooms: DormRoom[]) => {
    const occupied = buildingRooms.filter((r) => r.room_status === 'occupied').length;
    const allResidents = buildingRooms.flatMap((r) => getAssignments(r.id));

    // Group by floor then suite
    const byFloor: Record<string, Record<string, DormRoom[]>> = {};
    for (const room of buildingRooms) {
      const parsed = parseCityRoom(room.room_number);
      if (!parsed) continue;
      if (!byFloor[parsed.floor]) byFloor[parsed.floor] = {};
      if (!byFloor[parsed.floor][parsed.suite]) byFloor[parsed.floor][parsed.suite] = [];
      byFloor[parsed.floor][parsed.suite].push(room);
    }

    const floorNums = Object.keys(byFloor).sort();

    return (
      <div key="City UniLodge" className="card" style={{ marginBottom: 14 }}>
        {/* Building header */}
        <div className="card-title">
          <IconBuilding size={16} />
          <span style={{ fontWeight: 600 }}>City UniLodge</span>
          <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--color-text-secondary)', marginLeft: 4, display: 'inline-flex', alignItems: 'center' }}>
            · 监护人：{renderGuardianSelect('City UniLodge')}
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 400, color: 'var(--color-text-tertiary)' }}>
            {occupied}/{buildingRooms.length} 房间已入住 · {allResidents.length} 名学生 · 2层 · 10套间 · 50单间
          </span>
        </div>

        {/* Floor sections */}
        {floorNums.map((floor) => {
          const floorKey = floor;
          const isFloorExpanded = expandedFloors[floorKey] !== false; // default expanded
          const suites = byFloor[floor];
          const suiteNums = Object.keys(suites).sort();
          const floorRooms = suiteNums.flatMap(s => suites[s]);
          const floorOccupied = floorRooms.filter(r => r.room_status === 'occupied').length;

          return (
            <div key={floor} style={{ marginBottom: 12 }}>
              {/* Floor header — clickable to collapse */}
              <div
                onClick={() => setExpandedFloors(prev => ({ ...prev, [floorKey]: !isFloorExpanded }))}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                  padding: '8px 12px', borderRadius: 8,
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border-tertiary)',
                  marginBottom: isFloorExpanded ? 10 : 0,
                  userSelect: 'none',
                }}
              >
                {isFloorExpanded
                  ? <IconChevronDown size={14} style={{ color: 'var(--color-text-tertiary)' }} />
                  : <IconChevronRight size={14} style={{ color: 'var(--color-text-tertiary)' }} />}
                <span style={{ fontWeight: 600, fontSize: 13 }}>{floor} 层</span>
                <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginLeft: 4 }}>
                  {suiteNums.length} 套间 · {floorRooms.length} 单间 · {floorOccupied} 已入住
                </span>
              </div>

              {/* Suite rows */}
              {isFloorExpanded && suiteNums.map((suite) => {
                const suiteKey = `${floor}-${suite}`;
                const isSuiteExpanded = expandedSuites[suiteKey] !== false; // default expanded
                const suiteRooms = suites[suite].sort((a, b) => a.room_number.localeCompare(b.room_number));
                const suiteOccupied = suiteRooms.filter(r => r.room_status === 'occupied').length;

                return (
                  <div key={suite} style={{ marginBottom: 8, paddingLeft: 16 }}>
                    {/* Suite header */}
                    <div
                      onClick={() => setExpandedSuites(prev => ({ ...prev, [suiteKey]: !isSuiteExpanded }))}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                        padding: '5px 10px', borderRadius: 6,
                        marginBottom: isSuiteExpanded ? 8 : 0,
                        userSelect: 'none',
                        borderLeft: '3px solid var(--color-border)',
                      }}
                    >
                      {isSuiteExpanded
                        ? <IconChevronDown size={12} style={{ color: 'var(--color-text-tertiary)' }} />
                        : <IconChevronRight size={12} style={{ color: 'var(--color-text-tertiary)' }} />}
                      <span style={{ fontWeight: 500, fontSize: 12 }}>套间 {suite}</span>
                      <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                        {suiteOccupied}/{suiteRooms.length} 在住
                      </span>
                      {suiteOccupied > 0 && (
                        <span style={{ fontSize: 11, color: '#3B6D11', fontWeight: 500 }}>
                          · {suiteRooms.filter(r => r.room_status === 'occupied').flatMap(r => getAssignments(r.id)).map(a => a.profiles?.full_name).join('、')}
                        </span>
                      )}
                    </div>
                    {/* Room cards */}
                    {isSuiteExpanded && (
                      <div className="room-grid" style={{ paddingLeft: 12 }}>
                        {suiteRooms.map(room => renderRoomCard(room))}
                      </div>
                    )}
                  </div>
                );
              })}
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
          <div className="stat-label">9月 Intake</div>
          <div className="stat-val" style={{ color: '#185FA5' }}>3</div>
          <div className="stat-sub">葛书妍·高一菲·+1</div>
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

        // City UniLodge gets its own hierarchical render
        if (buildingName === 'City UniLodge') {
          return renderCityUniLodge(buildingRooms);
        }

        // Standard buildings (Tiverton etc.)
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
