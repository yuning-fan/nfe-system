import pandas as pd
import uuid

# Read excel file
df = pd.read_excel("/Users/fanxiaohui/Downloads/副本Uni学生信息汇总.xlsx")
# Drop empty rows
df = df.dropna(subset=['姓名'])

sql_content = """-- ==========================================
-- NFE 基础业务数据初始化脚本 (Seed Data - 真实学生信息)
-- ==========================================

-- 1. 插入程序大类 (program_types)
INSERT INTO program_types (id, name, description) VALUES
(1, '绿通', '全方位高端留学护航服务，包含监护与课业'),
(2, '散客', '灵活的课外辅导服务'),
(3, '奥大', '奥克兰大学专属辅导与升学项目')
ON CONFLICT (id) DO NOTHING;

-- 2. 插入具体班型 (programs)
INSERT INTO programs (id, program_type_id, name, track, duration_months) VALUES
(1, 1, '绿通-Standard', 'standard', 12),
(2, 2, '名校散客', 'standard', 6),
(3, 1, '绿通转名校', 'accelerate', 12),
(4, 3, '12月预科', 'other', 12)
ON CONFLICT (id) DO NOTHING;

-- 3. 插入测试员工账号 (profiles)
INSERT INTO profiles (id, role, full_name, status) VALUES
('e0000000-0000-0000-0000-000000000001', 'admin', '超管', 1),
('e0000000-0000-0000-0000-000000000002', 'tutor', '方老师', 1),
('e0000000-0000-0000-0000-000000000003', 'driver', '陈老师', 1)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- 真实学生数据插入
-- ==========================================
"""

def get_program_id(prog_str):
    prog_str = str(prog_str).strip()
    if '名校散客' in prog_str:
        return 2
    elif '转名校' in prog_str:
        return 3
    elif '预科' in prog_str:
        return 4
    else:
        return 1 # Default 绿通

profiles_sql = []
enrollments_sql = []
students_info_sql = []

for index, row in df.iterrows():
    name = str(row['姓名']).strip()
    if not name or name == 'nan':
        continue
        
    student_id = f"a0000000-0000-0000-0000-0000000000{index:02d}"
    avatar_url = name[0] if name else 'S'
    school_name = str(row['校区']).strip().replace("\n", " ").replace("\r", " ")
    if school_name == 'nan': school_name = '未知'
    
    parent_name = str(row['家长姓名']).strip().replace("'", "''").replace("\n", " ").replace("\r", " ")
    parent_phone = str(row['家长电话']).strip().replace("'", "''").replace("\n", " ").replace("\r", " ")
    if parent_name == 'nan': parent_name = ''
    if parent_phone == 'nan': parent_phone = ''
    
    prog_id = get_program_id(row['项目'])
    
    profiles_sql.append(f"('{student_id}', 'student', '{name}', '{avatar_url}', 1)")
    enrollments_sql.append(f"({index+1}, '{student_id}', {prog_id}, '2026-09-01', '2027-08-31', 'active')")
    students_info_sql.append(f"('{student_id}', '{school_name}', '{parent_name}', '{parent_phone}', 'green', {index+1})")

sql_content += "\n-- Profiles\n"
sql_content += "INSERT INTO profiles (id, role, full_name, avatar_url, status) VALUES\n"
sql_content += ",\n".join(profiles_sql) + "\nON CONFLICT (id) DO NOTHING;\n"

sql_content += "\n-- Enrollments\n"
sql_content += "INSERT INTO student_enrollments (id, student_id, program_id, start_date, end_date, status) VALUES\n"
sql_content += ",\n".join(enrollments_sql) + "\nON CONFLICT (id) DO NOTHING;\n"

sql_content += "\n-- Students Info\n"
sql_content += "INSERT INTO students_info (student_id, school_name, emergency_contact_name, emergency_contact_phone, risk_level, enrollment_id) VALUES\n"
sql_content += ",\n".join(students_info_sql) + "\nON CONFLICT (student_id) DO NOTHING;\n"

with open('/Users/fanxiaohui/Downloads/澳新补课/nfe-system/supabase/seed.sql', 'w') as f:
    f.write(sql_content)
    
print("Successfully generated seed.sql with real student data.")
