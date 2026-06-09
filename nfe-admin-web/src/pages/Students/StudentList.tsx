import { IconPlus } from '@tabler/icons-react';

export default function StudentList() {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input className="search-bar" placeholder="搜索学生姓名 / 编号 / 学校…" />
          <select className="sel">
            <option>全部状态</option>
            <option>在读</option>
            <option>已毕业</option>
            <option>暂停</option>
          </select>
          <select className="sel">
            <option>全部风险</option>
            <option>🟢 正常</option>
            <option>🟡 关注</option>
            <option>🔴 干预</option>
          </select>
          <select className="sel">
            <option>全部学校</option>
            <option>Avondale College</option>
            <option>MAGS</option>
            <option>Western Springs</option>
          </select>
        </div>
        <button className="btn btn-primary">
          <IconPlus stroke={1.5} size={16} />新建学生档案
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>编号</th>
              <th>姓名</th>
              <th>性别</th>
              <th>就读学校</th>
              <th>项目</th>
              <th>在读状态</th>
              <th>风险等级</th>
              <th>签证到期</th>
              <th>可用课时</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ color: 'var(--color-text-tertiary)' }}>NFE-001</td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="avatar-xs av-blue">张</div>
                  <div>
                    <div style={{ fontWeight: 500 }}>张晓明</div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>Michael Zhang</div>
                  </div>
                </div>
              </td>
              <td>男</td>
              <td>Avondale College</td>
              <td><span className="pill p-purple">监管+辅导</span></td>
              <td><span className="pill p-green">在读</span></td>
              <td><span className="pill p-red">🔴 干预</span></td>
              <td style={{ color: '#A32D2D' }}>2026-08-12</td>
              <td>14课时</td>
              <td><span className="link">查看档案</span></td>
            </tr>

            <tr>
              <td style={{ color: 'var(--color-text-tertiary)' }}>NFE-002</td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="avatar-xs av-pink">林</div>
                  <div>
                    <div style={{ fontWeight: 500 }}>林思远</div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>Kevin Lin</div>
                  </div>
                </div>
              </td>
              <td>男</td>
              <td>MAGS</td>
              <td><span className="pill p-purple">监管+辅导+住宿</span></td>
              <td><span className="pill p-green">在读</span></td>
              <td><span className="pill p-amber">🟡 关注</span></td>
              <td>2026-11-30</td>
              <td>22课时</td>
              <td><span className="link">查看档案</span></td>
            </tr>

            <tr>
              <td style={{ color: 'var(--color-text-tertiary)' }}>NFE-003</td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="avatar-xs av-teal">周</div>
                  <div>
                    <div style={{ fontWeight: 500 }}>周欣怡</div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>Grace Zhou</div>
                  </div>
                </div>
              </td>
              <td>女</td>
              <td>Western Springs</td>
              <td><span className="pill p-blue">监管</span></td>
              <td><span className="pill p-green">在读</span></td>
              <td><span className="pill p-amber">🟡 关注</span></td>
              <td>2027-03-15</td>
              <td>—</td>
              <td><span className="link">查看档案</span></td>
            </tr>

            <tr>
              <td style={{ color: 'var(--color-text-tertiary)' }}>NFE-004</td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="avatar-xs av-green">王</div>
                  <div>
                    <div style={{ fontWeight: 500 }}>王明宇</div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>Marcus Wang</div>
                  </div>
                </div>
              </td>
              <td>男</td>
              <td>Avondale College</td>
              <td><span className="pill p-purple">监管+住宿</span></td>
              <td><span className="pill p-green">在读</span></td>
              <td><span className="pill p-green">🟢 正常</span></td>
              <td style={{ color: '#A32D2D', fontWeight: 500 }}>2026-06-19</td>
              <td>—</td>
              <td><span className="link">查看档案</span></td>
            </tr>

            <tr>
              <td style={{ color: 'var(--color-text-tertiary)' }}>NFE-005</td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="avatar-xs av-amber">李</div>
                  <div>
                    <div style={{ fontWeight: 500 }}>李雨晴</div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>Lucy Li</div>
                  </div>
                </div>
              </td>
              <td>女</td>
              <td>MAGS</td>
              <td><span className="pill p-purple">监管+辅导</span></td>
              <td><span className="pill p-green">在读</span></td>
              <td><span className="pill p-green">🟢 正常</span></td>
              <td>2027-01-08</td>
              <td>8课时</td>
              <td><span className="link">查看档案</span></td>
            </tr>

            <tr>
              <td style={{ color: 'var(--color-text-tertiary)' }}>NFE-006</td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="avatar-xs av-teal">陈</div>
                  <div>
                    <div style={{ fontWeight: 500 }}>陈佳琳</div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>Jasmine Chen</div>
                  </div>
                </div>
              </td>
              <td>女</td>
              <td>Western Springs</td>
              <td><span className="pill p-blue">监管</span></td>
              <td><span className="pill p-green">在读</span></td>
              <td><span className="pill p-green">🟢 正常</span></td>
              <td style={{ color: '#A32D2D', fontWeight: 500 }}>2026-06-19</td>
              <td>—</td>
              <td><span className="link">查看档案</span></td>
            </tr>
          </tbody>
        </table>

        <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '0.5px solid var(--color-border-tertiary)' }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>共24名学生，显示第1—6条</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn" style={{ padding: '4px 10px' }}>上一页</button>
            <button className="btn btn-primary" style={{ padding: '4px 10px' }}>下一页</button>
          </div>
        </div>
      </div>
    </>
  );
}
