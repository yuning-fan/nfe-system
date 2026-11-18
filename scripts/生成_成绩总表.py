#!/usr/bin/env python3
"""
全体学生成绩总表 —— 一次导出四个层级：学生×科目矩阵 / 分科加权均分 / 逐节点成绩 / 节点概况。

用法：  python3 生成_成绩总表.py [输出目录]
依赖：  openpyxl；Supabase token 从 macOS keychain 取（与 q.sh 同一条通道）

算分口径**照搬** nfe-admin-web/src/lib/gradeCalc.ts 的 computeSubject：
  · 顶层节点 weight_percent = 占该科总评 %
  · 子项 weight_percent     = 占父节点 %（不是占总评！换算占总评要乘父权重）
  · 有子项的父节点：子项全部录分才算出，分 = Σ(子权重/100 × 子分)；否则按待录
  · earnedPoints = Σ(已评顶层 weight/100 × 分)
横比用「已评部分的加权均分」= earnedPoints / gradedWeight × 100。
等级与 GPA 口径照搬 src/lib/reportDocx.ts 的 GRADE_BANDS，且 **GPA 不含 EAP**。
"""
import json, subprocess, sys, statistics as st
from datetime import date
from collections import defaultdict
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

REF = 'pypznlokmhzvzscaibii'

# 照搬 reportDocx.ts GRADE_BANDS
BANDS = [(90,'A+',9),(85,'A',8),(80,'A-',7),(75,'B+',6),(70,'B',5),
         (65,'B-',4),(60,'C+',3),(55,'C',2),(50,'C-',1),(0,'D',0)]
def band(v):
    for lo, g, p in BANDS:
        if v >= lo: return g, p
    return 'D', 0
is_eap = lambda name: name.upper().startswith('EAP')

def q(sql: str):
    token = subprocess.run(['security','find-generic-password','-s','Supabase CLI','-w'],
                           capture_output=True, text=True, check=True).stdout.strip()
    out = subprocess.run([
        'curl','-s','-X','POST',
        f'https://api.supabase.com/v1/projects/{REF}/database/query',
        '-H', f'Authorization: Bearer {token}', '-H','Content-Type: application/json',
        '--data', json.dumps({'query': sql})], capture_output=True, text=True, check=True).stdout
    data = json.loads(out)
    if isinstance(data, dict):
        raise SystemExit(f"查询失败：{data.get('message', data)}")
    return data

# ---------- 取数 ----------
nodes = q("""select m.id, m.parent_id, m.program_subject_id as ps_id, m.title,
                    m.weight_percent::float as w, m.term_no, m.week_no, m.due_date::text as due
             from academic_milestones m
             where m.program_subject_id in (
               select distinct m2.program_subject_id from academic_milestones m2
               join grade_records g on g.milestone_id = m2.id)""")
grades = q("""select student_id, milestone_id, score::float as score, status::text as status,
                     recorded_at::date::text as recorded
              from grade_records""")
subjects = {s['ps_id']: s for s in q("""select ps.id as ps_id, ps.subject_name, ps.pass_mark::float as pass_mark,
                                               pr.name as program
                                        from program_subjects ps join programs pr on pr.id = ps.program_id""")}
students = {s['student_id']: s for s in q("""select p.id as student_id, p.full_name, si.nfe_no,
                                                    (select full_name from profiles a where a.id = si.nz_advisor_id) as advisor
                                             from profiles p join students_info si on si.student_id = p.id
                                             where p.role = 'student'""")}
enr = q("""select e.student_id, pr.name as program, e.status::text as status, e.start_date::text as sd
           from student_enrollments e join programs pr on pr.id = e.program_id""")
RANK = {'active': 0, 'completed': 1, 'withdrawn': 2}
prog_of = {}
for e in sorted(enr, key=lambda x: (RANK.get(x['status'], 3), x['sd'] or '')):
    prog_of.setdefault(e['student_id'], e['program'])

by_ps = defaultdict(list)
for n in nodes: by_ps[n['ps_id']].append(n)
node_by_id = {n['id']: n for n in nodes}
score_of = {(g['student_id'], g['milestone_id']): float(g['score'])
            for g in grades if g['score'] is not None}

# 节点占总评权重：顶层 = w；子项 = 父权重 × w/100
def total_weight(n):
    if not n['parent_id']: return float(n['w'] or 0)
    p = node_by_id.get(n['parent_id'])
    return float(p['w'] or 0) * float(n['w'] or 0) / 100 if p else float(n['w'] or 0)

# ---------- 复算 computeSubject ----------
def compute(ps_id, sid):
    ns = by_ps[ps_id]
    tops = [n for n in ns if not n['parent_id']]
    kids = defaultdict(list)
    for n in ns:
        if n['parent_id']: kids[n['parent_id']].append(n)
    graded_w = earned = top_w = 0.0
    detail = []
    for t in tops:
        w = float(t['w'] or 0); top_w += w
        ks = kids.get(t['id'], [])
        if ks:
            cs = [score_of.get((sid, k['id'])) for k in ks]
            s = (sum((float(k['w'] or 0) / 100) * c for k, c in zip(ks, cs))
                 if all(c is not None for c in cs) else None)
        else:
            s = score_of.get((sid, t['id']))
        if s is not None:
            graded_w += w; earned += (w / 100) * s
            detail.append(f'{t["title"]} {w}% → {round(s, 2)}')
    return dict(top_weight=round(top_w, 1), graded_weight=round(graded_w, 1),
                earned=round(earned, 2), detail='；'.join(detail),
                wavg=round(earned / graded_w * 100, 1) if graded_w > 0 else None)

has = defaultdict(set)
for g in grades:
    n = node_by_id.get(g['milestone_id'])
    if n: has[n['ps_id']].add(g['student_id'])

rows = []
for ps_id, sids in has.items():
    meta = subjects[ps_id]
    recs = [(sid, compute(ps_id, sid)) for sid in sids]
    recs = [(sid, r) for sid, r in recs if r['wavg'] is not None]
    if not recs: continue
    vals = [r['wavg'] for _, r in recs]
    mean, med = round(st.mean(vals), 1), round(st.median(vals), 1)
    recs.sort(key=lambda x: -x[1]['wavg'])          # 总表按高→低
    for rank, (sid, r) in enumerate(recs, 1):
        stu = students.get(sid, {})
        g, p = band(r['wavg'])
        rows.append(dict(ps_id=ps_id, sid=sid, program=meta['program'], subject=meta['subject_name'],
                         pass_mark=meta['pass_mark'], n=len(recs), mean=mean, median=med, rank=rank,
                         nfe_no=stu.get('nfe_no'), name=stu.get('full_name'), advisor=stu.get('advisor'),
                         grade=g, points=p, below_pass=r['wavg'] < meta['pass_mark'], **r))

# ---------- 导出 ----------
wb = Workbook()
HDR  = PatternFill('solid', fgColor='1F3A5F')
SUBH = PatternFill('solid', fgColor='E8EDF4')
RED  = Font(color='A32D2D', bold=True)
GRN  = Font(color='1E6B45', bold=True)
BAND2= [PatternFill('solid', fgColor='FFFFFF'), PatternFill('solid', fgColor='F2F5F9')]
TOP  = Border(top=Side(style='thin', color='B9C2CE'))

def head(ws, cols, widths, row=1):
    for i, c in enumerate(cols, 1):
        cell = ws.cell(row, i, c)
        cell.font = Font(bold=True, color='FFFFFF', size=11); cell.fill = HDR
        cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
    for i, w in enumerate(widths, 1): ws.column_dimensions[get_column_letter(i)].width = w
    ws.freeze_panes = f'A{row + 1}'   # 不能用 ws.cell()：那会真的建出空单元格，整表多一行空行

no = lambda r: f'NFE-{r["nfe_no"]:06d}' if r.get('nfe_no') else ''
def paint(cell, v, pm):
    if v is None: return
    if v < pm: cell.font = RED
    elif v >= 90: cell.font = GRN

# === 1. 学生总览（学生 × 科目 矩阵） ===
subj_names = sorted({r['subject'] for r in rows},
                    key=lambda s: (is_eap(s), -sum(1 for r in rows if r['subject'] == s), s))
cell_of = {(r['sid'], r['subject']): r for r in rows}
sids = sorted({r['sid'] for r in rows},
              key=lambda s: (prog_of.get(s, 'zz'), students.get(s, {}).get('nfe_no') or 0))

ws = wb.active; ws.title = '学生总览'
C1 = ['学号','姓名','项目','学管','已出分科目','GPA(非EAP)','平均加权均分'] + subj_names
head(ws, C1, [12,10,16,9,11,11,12] + [max(11, min(22, len(s) + 2)) for s in subj_names])
prev, bi = None, 0
for sid in sids:
    stu = students.get(sid, {})
    mine = [cell_of[(sid, s)] for s in subj_names if (sid, s) in cell_of]
    gpa_src = [r for r in mine if not is_eap(r['subject'])]
    gpa = round(st.mean([r['points'] for r in gpa_src]), 2) if gpa_src else None
    avg = round(st.mean([r['wavg'] for r in mine]), 1) if mine else None
    pg = prog_of.get(sid) or (mine[0]['program'] if mine else '')
    new = pg != prev
    if new and prev is not None: bi ^= 1
    prev = pg
    ws.append([no(stu), stu.get('full_name'), pg, stu.get('advisor') or '', len(mine), gpa, avg]
              + [cell_of[(sid, s)]['wavg'] if (sid, s) in cell_of else None for s in subj_names])
    i = ws.max_row
    for c in range(1, len(C1) + 1):
        ws.cell(i, c).fill = BAND2[bi]
        if new: ws.cell(i, c).border = TOP
    ws.cell(i, 6).number_format = '0.00'; ws.cell(i, 7).number_format = '0.0'
    for j, s in enumerate(subj_names, 8):
        ws.cell(i, j).number_format = '0.0'
        if (sid, s) in cell_of:
            r = cell_of[(sid, s)]; paint(ws.cell(i, j), r['wavg'], r['pass_mark'])
ws.auto_filter.ref = f'A1:{get_column_letter(len(C1))}{ws.max_row}'

# === 2. 分科明细 ===
ws2 = wb.create_sheet('分科明细')
C2 = ['项目','科目','科内排名','学号','姓名','学管','加权均分','等级','绩点',
      '科均分','科中位','过线分','低于过线','已评权重','顶层权重合计','已得加权分','成绩明细']
head(ws2, C2, [16,30,9,12,10,9,9,7,7,8,8,7,9,9,12,11,70])
key = lambda r: (r['program'], r['subject'], r['rank'])
prev, bi = None, 0
for r in sorted(rows, key=key):
    k = (r['program'], r['subject']); new = k != prev
    if new and prev is not None: bi ^= 1
    prev = k
    ws2.append([r['program'], r['subject'], f'{r["rank"]}/{r["n"]}', no(r), r['name'], r['advisor'] or '',
                r['wavg'], r['grade'], r['points'], r['mean'], r['median'], int(r['pass_mark']),
                '是' if r['below_pass'] else '', r['graded_weight'] / 100, r['top_weight'] / 100,
                r['earned'], r['detail']])
    i = ws2.max_row
    for c in range(1, len(C2) + 1):
        ws2.cell(i, c).fill = BAND2[bi]
        if new: ws2.cell(i, c).border = TOP
    for c in (7,10,11): ws2.cell(i, c).number_format = '0.0'
    for c in (14,15): ws2.cell(i, c).number_format = '0%'
    ws2.cell(i, 16).number_format = '0.00'
    paint(ws2.cell(i, 7), r['wavg'], r['pass_mark'])
ws2.auto_filter.ref = f'A1:{get_column_letter(len(C2))}{ws2.max_row}'

# === 3. 逐节点成绩（最原始一层） ===
ws3 = wb.create_sheet('逐节点成绩')
C3 = ['项目','科目','节点','父节点','占总评权重','节点内权重','截止日期','学期','周次',
      '学号','姓名','学管','分数','状态','节点均分','节点内排名','录入日期']
head(ws3, C3, [16,26,40,26,11,11,11,7,7,12,10,9,8,8,9,10,11])
gnodes = defaultdict(list)
for g in grades:
    n = node_by_id.get(g['milestone_id'])
    if n and g['score'] is not None: gnodes[n['id']].append(g)
nstat = {nid: (round(st.mean([float(x['score']) for x in v]), 1),
               sorted([float(x['score']) for x in v], reverse=True)) for nid, v in gnodes.items()}
order3 = sorted(gnodes.keys(), key=lambda nid: (
    subjects[node_by_id[nid]['ps_id']]['program'], subjects[node_by_id[nid]['ps_id']]['subject_name'],
    node_by_id[nid]['due'] or '9999', node_by_id[nid]['title']))
prev, bi = None, 0
for nid in order3:
    n = node_by_id[nid]; meta = subjects[n['ps_id']]
    p = node_by_id.get(n['parent_id'])
    mean_n, srt = nstat[nid]
    k = (meta['program'], meta['subject_name']); new = k != prev
    if new and prev is not None: bi ^= 1
    prev = k
    for g in sorted(gnodes[nid], key=lambda x: -float(x['score'])):
        stu = students.get(g['student_id'], {})
        sc = float(g['score'])
        ws3.append([meta['program'], meta['subject_name'], n['title'], p['title'] if p else '',
                    total_weight(n) / 100, float(n['w'] or 0) / 100, n['due'], n['term_no'], n['week_no'],
                    no(stu), stu.get('full_name'), stu.get('advisor') or '',
                    sc, '缺考' if g['status'] == 'missed' else '已评',
                    mean_n, f'{srt.index(sc) + 1}/{len(srt)}', g['recorded']])
        i = ws3.max_row
        for c in range(1, len(C3) + 1):
            ws3.cell(i, c).fill = BAND2[bi]
            if new: ws3.cell(i, c).border = TOP
        new = False
        for c in (5,6): ws3.cell(i, c).number_format = '0.0%'
        for c in (13,15): ws3.cell(i, c).number_format = '0.0'
        paint(ws3.cell(i, 13), sc, meta['pass_mark'])
        if g['status'] == 'missed': ws3.cell(i, 14).font = RED
ws3.auto_filter.ref = f'A1:{get_column_letter(len(C3))}{ws3.max_row}'

# === 4. 节点概况 ===
ws4 = wb.create_sheet('节点概况')
C4 = ['项目','科目','节点','父节点','占总评权重','截止日期','学期','周次',
      '有分人数','均分','中位数','最低','最高','过线分','低于过线人数']
head(ws4, C4, [16,26,40,26,11,11,7,7,10,8,8,7,7,7,12])
for nid in order3:
    n = node_by_id[nid]; meta = subjects[n['ps_id']]
    p = node_by_id.get(n['parent_id'])
    vals = [float(x['score']) for x in gnodes[nid]]
    nf = sum(1 for v in vals if v < meta['pass_mark'])
    ws4.append([meta['program'], meta['subject_name'], n['title'], p['title'] if p else '',
                total_weight(n) / 100, n['due'], n['term_no'], n['week_no'], len(vals),
                round(st.mean(vals), 1), round(st.median(vals), 1), min(vals), max(vals),
                int(meta['pass_mark']), nf])
    i = ws4.max_row
    ws4.cell(i, 5).number_format = '0.0%'
    for c in (10,11,12,13): ws4.cell(i, c).number_format = '0.0'
    if nf and nf / len(vals) >= 0.3:
        for c in range(1, len(C4) + 1): ws4.cell(i, c).font = RED
ws4.auto_filter.ref = f'A1:{get_column_letter(len(C4))}{ws4.max_row}'

# === 5. 未出分学生 ===
ws5 = wb.create_sheet('未出分学生')
C5 = ['学号','姓名','项目','在读状态','开学日期','学管']
head(ws5, C5, [12,10,18,10,12,9])
graded_sids = {r['sid'] for r in rows}
seen = set()
for e in sorted(enr, key=lambda x: (RANK.get(x['status'], 3), students.get(x['student_id'], {}).get('nfe_no') or 0)):
    sid = e['student_id']
    if sid in graded_sids or sid in seen or sid not in students: continue
    seen.add(sid); stu = students[sid]
    ws5.append([no(stu), stu['full_name'], e['program'], e['status'], e['sd'], stu.get('advisor') or ''])
# 完全没有 student_enrollments 记录的学生：上面两个循环都捞不到，单独补上，
# 否则这张「所有人」的表会静默漏人（73 名学生里有 4 个是这种）
for sid, stu in sorted(students.items(), key=lambda kv: kv[1].get('nfe_no') or 0):
    if sid in graded_sids or sid in seen: continue
    ws5.append([no(stu), stu['full_name'], '', '无在读记录', '', stu.get('advisor') or ''])
    for c in range(1, len(C5) + 1): ws5.cell(ws5.max_row, c).font = RED

out = (sys.argv[1] if len(sys.argv) > 1 else '.').rstrip('/')
path = f'{out}/成绩总表_{date.today()}.xlsx'
wb.save(path)
print(f'saved: {path}')
print(f'成绩 {len(grades)} 条 · 出分学生 {len(graded_sids)} 名 · 学生×科目 {len(rows)} 行 '
      f'· 逐节点 {ws3.max_row - 1} 行 · 节点 {len(order3)} 个 · 未出分 {ws5.max_row - 1} 人')
