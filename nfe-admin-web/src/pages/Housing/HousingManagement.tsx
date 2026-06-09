import { IconHistory, IconPlus, IconHome } from '@tabler/icons-react';

export default function HousingManagement() {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <select className="sel">
            <option>全部公寓</option>
            <option selected>4 Tiverton Road</option>
            <option>2 Oak Avenue</option>
          </select>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'var(--color-text-secondary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: '#C0DD97', display: 'inline-block' }}></span>已入住
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: '#B5D4F4', display: 'inline-block' }}></span>即将入住
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: '#FAC775', display: 'inline-block' }}></span>即将退房
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--color-border-tertiary)', display: 'inline-block' }}></span>空房
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn">
            <IconHistory stroke={1.5} size={16} />历史记录
          </button>
          <button className="btn btn-primary">
            <IconPlus stroke={1.5} size={16} />分配房间
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-title">
          <IconHome stroke={1.5} />Apartment 1 — 4 Tiverton Road
          <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 400, color: 'var(--color-text-tertiary)' }}>5/5 已入住</span>
        </div>
        <div className="room-grid">
          <div className="room-card room-occupied">
            <div className="room-num">Room 1</div>
            <div className="room-name" style={{ color: '#3B6D11', fontWeight: 500 }}>张晓明</div>
            <div className="room-date">男 · 在读 · AC</div>
            <div style={{ marginTop: 4 }}><span className="pill p-red" style={{ fontSize: 10 }}>🔴 干预</span></div>
          </div>
          <div className="room-card room-occupied">
            <div className="room-num">Room 2</div>
            <div className="room-name" style={{ color: '#3B6D11', fontWeight: 500 }}>林思远</div>
            <div className="room-date">男 · 在读 · MAGS</div>
            <div style={{ marginTop: 4 }}><span className="pill p-amber" style={{ fontSize: 10 }}>🟡 关注</span></div>
          </div>
          <div className="room-card room-leaving">
            <div className="room-num">Room 3</div>
            <div className="room-name" style={{ color: '#854F0B', fontWeight: 500 }}>王明宇</div>
            <div className="room-date">男 · 退房 6/12</div>
            <div style={{ marginTop: 4 }}><span className="pill p-amber" style={{ fontSize: 10 }}>即将退房</span></div>
          </div>
          <div className="room-card room-occupied">
            <div className="room-num">Room 4</div>
            <div className="room-name" style={{ color: '#3B6D11', fontWeight: 500 }}>刘海涛</div>
            <div className="room-date">男 · 在读 · WS</div>
            <div style={{ marginTop: 4 }}><span className="pill p-green" style={{ fontSize: 10 }}>🟢 正常</span></div>
          </div>
          <div className="room-card room-occupied">
            <div className="room-num">Room 5</div>
            <div className="room-name" style={{ color: '#3B6D11', fontWeight: 500 }}>孙欢</div>
            <div className="room-date">男 · 在读 · AC</div>
            <div style={{ marginTop: 4 }}><span className="pill p-green" style={{ fontSize: 10 }}>🟢 正常</span></div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          <IconHome stroke={1.5} />Apartment 2 — 4 Tiverton Road
          <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 400, color: 'var(--color-text-tertiary)' }}>3/5 已入住</span>
        </div>
        <div className="room-grid">
          <div className="room-card room-occupied">
            <div className="room-num">Room 1</div>
            <div className="room-name" style={{ color: '#3B6D11', fontWeight: 500 }}>周欣怡</div>
            <div className="room-date">女 · 在读 · WS</div>
            <div style={{ marginTop: 4 }}><span className="pill p-amber" style={{ fontSize: 10 }}>🟡 关注</span></div>
          </div>
          <div className="room-card room-arriving">
            <div className="room-num">Room 2</div>
            <div className="room-name" style={{ color: '#185FA5', fontWeight: 500 }}>陈佳琳</div>
            <div className="room-date">女 · 入住 6/10</div>
            <div style={{ marginTop: 4 }}><span className="pill p-blue" style={{ fontSize: 10 }}>即将入住</span></div>
          </div>
          <div className="room-card room-occupied">
            <div className="room-num">Room 3</div>
            <div className="room-name" style={{ color: '#3B6D11', fontWeight: 500 }}>李雨晴</div>
            <div className="room-date">女 · 在读 · MAGS</div>
            <div style={{ marginTop: 4 }}><span className="pill p-green" style={{ fontSize: 10 }}>🟢 正常</span></div>
          </div>
          <div className="room-card room-empty">
            <div className="room-num">Room 4</div>
            <div className="room-name" style={{ color: 'var(--color-text-tertiary)' }}>空房</div>
            <div className="room-date">可安排入住</div>
            <div style={{ marginTop: 4 }}>
              <button className="btn" style={{ fontSize: 10, padding: '2px 8px' }}>分配</button>
            </div>
          </div>
          <div className="room-card room-repair">
            <div className="room-num">Room 5</div>
            <div className="room-name" style={{ color: '#854F0B' }}>维修中</div>
            <div className="room-date">预计 6/15 完工</div>
          </div>
        </div>
      </div>
    </>
  );
}
