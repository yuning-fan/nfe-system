import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { IconPlus, IconHistory, IconLoader2, IconHome, IconUser } from '@tabler/icons-react';

interface DormRoom {
  id: number;
  building_name: string;
  room_number: string;
  capacity: number;
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

// Guardian mapping from housing.md
const GUARDIAN_MAP: Record<string, string> = {
  '4B Tiverton Road': 'Krystal Hu',
  '4 Tiverton Road': 'Ryan Wei',
  '4A Tiverton Road': 'Nina Su',
  '51B Shoreham Street': 'Krystal Hu',
};

// September intake notes from housing.md
const SEPT_INTAKE: Record<string, string> = {
  '4B Tiverton Road|一层-A 双人间': '高一菲（9月入住，未付）',
  '4B Tiverton Road|二层-B 单人间': '（空位，9月可用）',
  '4 Tiverton Road|一层-A 单人间': '（空位，9月可用）',
  '4 Tiverton Road|二层-C 单人间': '（空位，9月可用）',
  '4 Tiverton Road|二层-D 双人间': '葛书妍（9月入住）',
  '4A Tiverton Road|二层-B 单人间': '（空位，9月可用）',
  '4A Tiverton Road|二层-D 双人间': '（空位，9月可用）',
};

const statusConfig: Record<string, { label: string; bg: string; borderColor: string; textColor: string }> = {
  occupied:      { label: '已入住', bg: '#EEFAD4', borderColor: '#C0DD97', textColor: '#3B6D11' },
  move_in_soon:  { label: '即将入住', bg: '#EBF4FF', borderColor: '#B5D4F4', textColor: '#185FA5' },
  move_out_soon: { label: '即将退房', bg: '#FFF8EB', borderColor: '#FAC775', textColor: '#854F0B' },
  vacant:        { label: '空房', bg: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-tertiary)', textColor: 'var(--color-text-tertiary)' },
  maintenance:   { label: '维修中', bg: '#FFF3EB', borderColor: '#FAC775', textColor: '#854F0B' },
  unavailable:   { label: '不可用', bg: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-tertiary)', textColor: 'var(--color-text-tertiary)' },
};

export default function HousingManagement() {
  const [rooms, setRooms] = useState<DormRoom[]>([]);
  const [assignments, setAssignments] = useState<DormAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBuilding, setSelectedBuilding] = useState('');

  useEffect(() => {
    async function fetchData() {
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

      setRooms((dormData as DormRoom[]) || []);
      setAssignments((assignData as DormAssignment[]) || []);
      setIsLoading(false);
    }
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

  return (
    <>
      {/* Stats strip */}
      <div className="g4" style={{ marginBottom: 14 }}>
        <div className="stat-card">
          <div className="stat-label">总房间数</div>
          <div className="stat-val">{totalRooms}</div>
          <div className="stat-sub">4 栋公寓</div>
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
          <button className="btn btn-primary"><IconPlus size={14} style={{ marginRight: 4 }} />分配房间</button>
        </div>
      </div>

      {/* Buildings */}
      {filteredBuildings.map((buildingName) => {
        const buildingRooms = rooms.filter((r) => r.building_name === buildingName);
        const guardian = GUARDIAN_MAP[buildingName] || '—';
        const occupied = buildingRooms.filter((r) => r.room_status === 'occupied').length;
        const allResidents = buildingRooms.flatMap((r) => getAssignments(r.id));

        return (
          <div key={buildingName} className="card" style={{ marginBottom: 14 }}>
            <div className="card-title">
              <IconHome size={16} />
              <span style={{ fontWeight: 600 }}>{buildingName}</span>
              <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--color-text-secondary)', marginLeft: 4 }}>
                · 监护人：{guardian}
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 400, color: 'var(--color-text-tertiary)' }}>
                {occupied}/{buildingRooms.length} 房间已入住 · {allResidents.length} 名学生
              </span>
            </div>
            <div className="room-grid">
              {buildingRooms.map((room) => {
                const cfg = statusConfig[room.room_status] || statusConfig.vacant;
                const occupants = getAssignments(room.id);
                const septKey = `${room.building_name}|${room.room_number}`;
                const septNote = SEPT_INTAKE[septKey];

                return (
                  <div
                    key={room.id}
                    className="room-card"
                    style={{
                      background: cfg.bg,
                      border: `1.5px solid ${cfg.borderColor}`,
                      minHeight: occupants.length > 1 ? 120 : undefined,
                    }}
                  >
                    <div className="room-num">{room.room_number}</div>

                    {occupants.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {occupants.map((a) => (
                          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <IconUser size={11} style={{ color: cfg.textColor, flexShrink: 0 }} />
                            <span className="room-name" style={{ color: cfg.textColor, fontWeight: 500, fontSize: 12 }}>
                              {a.profiles?.full_name || '—'}
                            </span>
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
                            <button className="btn" style={{ fontSize: 10, padding: '2px 8px' }}>分配</button>
                          </div>
                        )}
                      </>
                    )}

                    {/* 9月 intake 提示 */}
                    {septNote && (
                      <div style={{
                        marginTop: 4, fontSize: 10, padding: '2px 6px',
                        background: '#EBF4FF', borderRadius: 4,
                        color: '#185FA5', border: '1px solid #B5D4F4',
                        lineHeight: 1.4,
                      }}>
                        9月：{septNote}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}
