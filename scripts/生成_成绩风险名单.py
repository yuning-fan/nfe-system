#!/usr/bin/env python3
"""
成绩风险名单生成器 —— 每科按加权均分排序，标出低于均分/中位数的最低 N 人。

用法：  python3 生成_成绩风险名单.py [输出目录]
依赖：  openpyxl；Supabase token 从 macOS keychain 取（与 q.sh 同一条通道）

算分口径**照搬** nfe-admin-web/src/lib/gradeCalc.ts 的 computeSubject：
  · 顶层节点 weight_percent = 占该科总评 %
  · 子项 weight_percent     = 占父节点 %
  · 有子项的父节点：子项全部录分才算出，分 = Σ(子权重/100 × 子分)；否则按待录
  · earnedPoints = Σ(已评顶层 weight/100 × 分)
横比用「已评部分的加权均分」= earnedPoints / gradedWeight × 100，
这样学期中途不同人评了不同数量的考核也能比。不要改成原始分直接平均。
"""
import json, subprocess, sys, statistics as st
from datetime import date
from collections import defaultdict
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

REF      = 'pypznlokmhzvzscaibii'
MIN_N    = 4    # 少于这么多人无法横向比较，改走「按过线分判断」
TAKE     = 7    # 每科风险名单最多取几人

def q(sql: str):
    token = subprocess.run(['security', 'find-generic-password', '-s', 'Supabase CLI', '-w'],
                           capture_output=True, text=True, check=True).stdout.strip()
    out = subprocess.run([
        'curl', '-s', '-X', 'POST',
        f'https://api.supabase.com/v1/projects/{REF}/database/query',
        '-H', f'Authorization: Bearer {token}', '-H', 'Content-Type: application/json',
        '--data', json.dumps({'query': sql})], capture_output=True, text=True, check=True).stdout
    data = json.loads(out)
    if isinstance(data, dict):
        raise SystemExit(f"查询失败：{data.get('message', data)}")
    return data

# ---------- 取数 ----------
nodes = q("""select m.id, m.parent_id, m.program_subject_id as ps_id, m.title,
                    m.weight_percent::float as w, m.term_no, m.week_no, m.due_date::text
             from academic_milestones m
             where m.program_subject_id in (
               select distinct m2.program_subject_id from academic_milestones m2
               join grade_records g on g.milestone_id = m2.id)""")
grades   = q("select student_id, milestone_id, score::float as score, status from grade_records")
subjects = {s['ps_id']: s for s in q("""select ps.id as ps_id, ps.subject_name, ps.pass_mark::float as pass_mark,
                                               pr.name as program
                                        from program_subjects ps join programs pr on pr.id = ps.program_id""")}
students = {s['student_id']: s for s in q("""select p.id as student_id, p.full_name, si.nfe_no,
                                                    (select full_name from profiles a where a.id = si.nz_advisor_id) as advisor
                                             from profiles p join students_info si on si.student_id = p.id
                                             where p.role = 'student'""")}

by_ps = defaultdict(list)
for n in nodes: by_ps[n['ps_id']].append(n)
node_by_id = {n['id']: n for n in nodes}
score_of = {(g['student_id'], g['milestone_id']): float(g['score'])
            for g in grades if g['score'] is not None}

# ---------- 复算 computeSubject ----------
def compute(ps_id, sid):
    ns   = by_ps[ps_id]
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
    recs.sort(key=lambda x: x[1]['wavg'])
    for rank, (sid, r) in enumerate(recs, 1):
        stu = students.get(sid, {})
        rows.append(dict(program=meta['program'], subject=meta['subject_name'],
                         pass_mark=meta['pass_mark'], n=len(recs), mean=mean, median=med, rank=rank,
                         nfe_no=stu.get('nfe_no'), name=stu.get('full_name'), advisor=stu.get('advisor'),
                         below_mean=r['wavg'] < mean, below_median=r['wavg'] < med,
                         below_pass=r['wavg'] < meta['pass_mark'], **r))

by = defaultdict(list)
for r in rows: by[(r['program'], r['subject'])].append(r)
for v in by.values(): v.sort(key=lambda x: x['wavg'])
order = sorted(by.keys(), key=lambda k: (-len(by[k]), k[0], k[1]))

risk, solo = [], []
for k in order:
    v = by[k]
    if len(v) >= MIN_N:
        risk += [r for r in v if r['below_mean'] or r['below_median']][:TAKE]
    else:
        solo += [r for r in v if r['below_pass']]
solo.sort(key=lambda r: r['wavg'])

def trig(r):
    if r['below_mean'] and r['below_median']: return '均分+中位'
    return '仅低于均分' if r['below_mean'] else '仅低于中位'

# ---------- 导出 ----------
wb = Workbook()
HDR  = PatternFill('solid', fgColor='1F3A5F')
RED  = Font(color='A32D2D', bold=True)
AMB  = Font(color='854F0B', bold=True)
BAND = [PatternFill('solid', fgColor='FFFFFF'), PatternFill('solid', fgColor='F2F5F9')]
TOP  = Border(top=Side(style='thin', color='B9C2CE'))

def head(ws, cols, widths):
    ws.append(cols)
    for c in range(1, len(cols) + 1):
        cell = ws.cell(1, c)
        cell.font = Font(bold=True, color='FFFFFF', size=11); cell.fill = HDR
        cell.alignment = Alignment(horizontal='center', vertical='center')
    for i, w in enumerate(widths, 1): ws.column_dimensions[get_column_letter(i)].width = w
    ws.freeze_panes = 'A2'

no = lambda r: f'NFE-{r["nfe_no"]:06d}' if r.get('nfe_no') else ''

ws = wb.active; ws.title = '风险名单'
C1 = ['项目','科目','科内排名','学号','姓名','加权均分','科均分','科中位','与均分差',
      '触发条件','过线分','低于过线','已评权重','学管','成绩明细']
head(ws, C1, [16,30,8,12,10,9,8,8,9,12,7,9,9,10,70])
prev, bi = None, 0
for r in risk:
    k = (r['program'], r['subject']); new = k != prev
    if new and prev is not None: bi ^= 1
    prev = k
    ws.append([r['program'], r['subject'], f'{r["rank"]}/{r["n"]}', no(r), r['name'],
               r['wavg'], r['mean'], r['median'], round(r['wavg'] - r['mean'], 1),
               trig(r), int(r['pass_mark']), '是' if r['below_pass'] else '',
               r['graded_weight'] / 100, r['advisor'] or '', r['detail']])
    i = ws.max_row
    for c in range(1, len(C1) + 1):
        ws.cell(i, c).fill = BAND[bi]
        if new: ws.cell(i, c).border = TOP
    for c in (6,7,8,9): ws.cell(i, c).number_format = '0.0'
    ws.cell(i, 13).number_format = '0%'
    if r['below_pass']:
        for c in (5,6,12): ws.cell(i, c).font = RED
    elif r['rank'] <= 3:
        ws.cell(i, 6).font = AMB
    if trig(r) == '仅低于中位':
        ws.cell(i, 10).font = Font(color='5A6272', italic=True)
ws.auto_filter.ref = f'A1:{get_column_letter(len(C1))}{ws.max_row}'

ws2 = wb.create_sheet('人数不足_按过线判断')
C2 = ['项目','科目','学号','姓名','加权均分','过线分','已评权重','学管','成绩明细']
head(ws2, C2, [16,30,12,10,10,7,9,10,70])
for r in solo:
    ws2.append([r['program'], r['subject'], no(r), r['name'], r['wavg'],
                int(r['pass_mark']), r['graded_weight'] / 100, r['advisor'] or '', r['detail']])
    i = ws2.max_row
    ws2.cell(i, 5).number_format = '0.0'; ws2.cell(i, 7).number_format = '0%'
    for c in (4, 5): ws2.cell(i, c).font = RED

ws3 = wb.create_sheet('科目概况')
C3 = ['项目','科目','有分人数','均分','中位数','最低','最高','过线分','低于过线人数','低于过线占比','已评权重','可横比']
head(ws3, C3, [16,30,9,8,8,7,7,7,12,12,12,8])
for k in order:
    v = by[k]; vals = [r['wavg'] for r in v]; gw = {r['graded_weight'] for r in v}
    nf = sum(1 for r in v if r['below_pass'])
    ws3.append([k[0], k[1], len(v), v[0]['mean'], v[0]['median'], min(vals), max(vals),
                int(v[0]['pass_mark']), nf, nf / len(v),
                f'{min(gw):.0f}%' if len(gw) == 1 else f'{min(gw):.0f}–{max(gw):.0f}%',
                '是' if len(v) >= MIN_N else '否'])
    i = ws3.max_row
    for c in (4,5,6,7): ws3.cell(i, c).number_format = '0.0'
    ws3.cell(i, 10).number_format = '0%'
    if nf / len(v) >= 0.3:
        for c in range(1, len(C3) + 1): ws3.cell(i, c).font = RED

ws4 = wb.create_sheet('全部明细')
C4 = ['项目','科目','科内排名','学号','姓名','加权均分','科均分','科中位','低于均分','低于中位',
      '过线分','低于过线','已评权重','顶层权重合计','已得加权分','学管','成绩明细']
head(ws4, C4, [16,30,8,12,10,9,8,8,8,8,7,9,9,12,11,10,70])
for k in order:
    for r in by[k]:
        ws4.append([r['program'], r['subject'], f'{r["rank"]}/{r["n"]}', no(r), r['name'],
                    r['wavg'], r['mean'], r['median'],
                    '是' if r['below_mean'] else '', '是' if r['below_median'] else '',
                    int(r['pass_mark']), '是' if r['below_pass'] else '',
                    r['graded_weight'] / 100, r['top_weight'] / 100, r['earned'],
                    r['advisor'] or '', r['detail']])
        i = ws4.max_row
        for c in (6,7,8,15): ws4.cell(i, c).number_format = '0.0'
        for c in (13,14): ws4.cell(i, c).number_format = '0%'
        if r['below_pass']:
            for c in (5,6,12): ws4.cell(i, c).font = RED
ws4.auto_filter.ref = f'A1:{get_column_letter(len(C4))}{ws4.max_row}'

outdir = sys.argv[1] if len(sys.argv) > 1 else '.'
path = f'{outdir}/成绩风险名单_{date.today()}.xlsx'
wb.save(path)
print(f'saved: {path}')
print(f'成绩 {len(grades)} 条 · 学生 {len({r["nfe_no"] for r in rows})} 名 · 科目 {len(by)} 门')
print(f'风险名单 {len(risk)} 行 ｜ 人数不足 {len(solo)} 行 ｜ 全部明细 {len(rows)} 行')
