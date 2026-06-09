import { useState } from 'react';
import { IconCalendarEvent, IconClock, IconTarget, IconClipboardCheck, IconWallet, IconList, IconReport } from '@tabler/icons-react';

export default function AcademicTrack() {
  const [activeTab, setActiveTab] = useState('schedule');

  return (
    <>
      <div className="tab-bar">
        <div className={`tab ${activeTab === 'schedule' ? 'active' : ''}`} onClick={() => setActiveTab('schedule')}>辅导课表排期</div>
        <div className={`tab ${activeTab === 'approval' ? 'active' : ''}`} onClick={() => setActiveTab('approval')}>排课审批 (3)</div>
        <div className={`tab ${activeTab === 'hours' ? 'active' : ''}`} onClick={() => setActiveTab('hours')}>课时管理</div>
        <div className={`tab ${activeTab === 'grades' ? 'active' : ''}`} onClick={() => setActiveTab('grades')}>成绩单</div>
        <div className={`tab ${activeTab === 'milestones' ? 'active' : ''}`} onClick={() => setActiveTab('milestones')}>学业里程碑</div>
      </div>

      {activeTab === 'schedule' && (
        <div className="tabpage active">
          <div className="g2" style={{ alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="card">
                <div className="card-title"><IconCalendarEvent stroke={1.5} />今日辅导课程 (2026-06-05)</div>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>时间</th>
                      <th>学生</th>
                      <th>科目</th>
                      <th>老师</th>
                      <th>状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>16:00-18:00</td>
                      <td>林思远</td>
                      <td>NCEA 数学</td>
                      <td>方老师</td>
                      <td><span className="pill p-green">进行中</span></td>
                    </tr>
                    <tr>
                      <td>17:30-19:00</td>
                      <td>李雨晴</td>
                      <td>IELTS 写作</td>
                      <td>何老师</td>
                      <td><span className="pill p-blue">未开始</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="card">
                <div className="card-title">
                  <IconClock stroke={1.5} />待确认上课记录
                  <span className="pill p-amber" style={{ marginLeft: 'auto' }}>3条待处理</span>
                </div>
                <div className="risk-row">
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, marginBottom: 2 }}>林思远 · 数学 · 周三</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>方老师已填写反馈，待确认扣减2课时</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: 11 }}>确认</button>
                    <button className="btn" style={{ padding: '4px 10px', fontSize: 11 }}>查看</button>
                  </div>
                </div>
                <div className="risk-row" style={{ borderBottom: 'none' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, marginBottom: 2 }}>李雨晴 · 英语写作 · 周三</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>何老师已填写反馈，待确认扣减1.5课时</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: 11 }}>确认</button>
                    <button className="btn" style={{ padding: '4px 10px', fontSize: 11 }}>查看</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-title"><IconTarget stroke={1.5} />成绩对比视图 — 林思远（距目标差距）</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span>数学（目标 85）</span><span style={{ color: '#A32D2D' }}>当前 58 · 差27分</span>
                  </div>
                  <div className="prog-bar"><div className="prog-fill" style={{ width: '68%', background: '#E24B4A' }}></div></div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span>英语（目标 80）</span><span style={{ color: '#3B6D11' }}>当前 76 · 差4分</span>
                  </div>
                  <div className="prog-bar"><div className="prog-fill" style={{ width: '95%', background: '#639922' }}></div></div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span>物理（目标 80）</span><span style={{ color: '#854F0B' }}>当前 68 · 差12分</span>
                  </div>
                  <div className="prog-bar"><div className="prog-fill" style={{ width: '85%', background: '#EF9F27' }}></div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'approval' && (
        <div className="tabpage active">
          <div className="card">
            <div className="card-title"><IconClipboardCheck stroke={1.5} />待审批排课请求</div>
            <table className="tbl">
              <thead>
                <tr>
                  <th>提交时间</th>
                  <th>学生</th>
                  <th>科目</th>
                  <th>辅导老师</th>
                  <th>建议上课时间</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>06-05 09:30</td>
                  <td>林思远</td>
                  <td>物理（加课）</td>
                  <td>方老师</td>
                  <td>周四 18:00 - 20:00</td>
                  <td><span className="pill p-amber">待教务审批</span></td>
                  <td><span className="link">通过</span> | <span className="link" style={{ color: 'var(--color-danger)' }}>驳回</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'hours' && (
        <div className="tabpage active">
          <div className="g2" style={{ alignItems: 'start' }}>
            <div className="card">
              <div className="card-title"><IconWallet stroke={1.5} />课时余额预警（不足10小时）</div>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>学生</th>
                    <th>课程/套餐</th>
                    <th>剩余课时</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>张晓明</td>
                    <td>NCEA 物理冲刺</td>
                    <td><span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>2.0</span></td>
                    <td><span className="link">充值</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="card">
              <div className="card-title"><IconList stroke={1.5} />近期课时扣减明细</div>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>日期</th>
                    <th>学生</th>
                    <th>扣减</th>
                    <th>余额</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>06-05</td>
                    <td>林思远</td>
                    <td><span style={{ color: 'var(--color-danger)' }}>-2.0</span></td>
                    <td>28.0</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'grades' && (
        <div className="tabpage active">
          <div className="card">
            <div className="card-title"><IconReport stroke={1.5} />成绩管理</div>
            <div style={{ padding: 20 }}>成绩系统开发中...</div>
          </div>
        </div>
      )}
      
      {activeTab === 'milestones' && (
        <div className="tabpage active">
          <div className="card">
            <div className="card-title"><IconReport stroke={1.5} />学业里程碑</div>
            <div style={{ padding: 20 }}>里程碑系统开发中...</div>
          </div>
        </div>
      )}
    </>
  );
}
