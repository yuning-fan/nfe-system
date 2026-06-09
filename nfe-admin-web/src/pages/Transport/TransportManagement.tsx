import { IconRoute } from '@tabler/icons-react';

export default function TransportManagement() {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="pill p-blue">今日 2026-06-05</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>共3条路线 · 8名学生</span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>系统根据课表自动生成 · 接送老师在手机端标记状态</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Route A */}
        <div className="card">
          <div className="card-title">
            <IconRoute stroke={1.5} />路线 A — 4 Tiverton Road → Avondale College
            <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 400, color: 'var(--color-text-secondary)' }}>负责：陈老师 · 07:45出发</span>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>学生</th>
                <th>上车时间</th>
                <th>下车地点</th>
                <th>接送状态</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="avatar-xs av-blue">张</div>张晓明
                  </div>
                </td>
                <td>07:45</td>
                <td>Avondale College 正门</td>
                <td><span className="pill p-red">未出现</span></td>
              </tr>
              <tr>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="avatar-xs av-green">王</div>王明宇
                  </div>
                </td>
                <td>07:45</td>
                <td>Avondale College 正门</td>
                <td><span className="pill p-green">已送达</span></td>
              </tr>
              <tr>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="avatar-xs av-amber">孙</div>孙欢
                  </div>
                </td>
                <td>07:45</td>
                <td>Avondale College 正门</td>
                <td><span className="pill p-green">已送达</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Route B */}
        <div className="card">
          <div className="card-title">
            <IconRoute stroke={1.5} />路线 B — 4 Tiverton Road → MAGS
            <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 400, color: 'var(--color-text-secondary)' }}>负责：陈老师 · 08:10出发</span>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>学生</th>
                <th>上车时间</th>
                <th>下车地点</th>
                <th>接送状态</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="avatar-xs av-pink">林</div>林思远
                  </div>
                </td>
                <td>08:10</td>
                <td>MAGS 正门</td>
                <td><span className="pill p-green">已送达</span></td>
              </tr>
              <tr>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="avatar-xs av-amber">李</div>李雨晴
                  </div>
                </td>
                <td>08:10</td>
                <td>MAGS 正门</td>
                <td><span className="pill p-gray">请假</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Route C */}
        <div className="card">
          <div className="card-title">
            <IconRoute stroke={1.5} />路线 C — 4 Tiverton Road → Western Springs
            <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 400, color: 'var(--color-text-secondary)' }}>负责：陈老师 · 08:30出发</span>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>学生</th>
                <th>上车时间</th>
                <th>下车地点</th>
                <th>接送状态</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="avatar-xs av-teal">周</div>周欣怡
                  </div>
                </td>
                <td>08:30</td>
                <td>Western Springs 侧门</td>
                <td><span className="pill p-blue">已接到</span></td>
              </tr>
              <tr>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="avatar-xs av-teal">陈</div>陈佳琳
                  </div>
                </td>
                <td>08:30</td>
                <td>Western Springs 侧门</td>
                <td><span className="pill p-blue">已接到</span></td>
              </tr>
              <tr>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="avatar-xs av-amber">刘</div>刘海涛
                  </div>
                </td>
                <td>08:30</td>
                <td>Western Springs 正门</td>
                <td><span className="pill p-blue">已接到</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
