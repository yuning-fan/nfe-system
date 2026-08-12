-- 补录_对比08-11表格_填空.sql
-- 只填空不覆盖（coalesce），来源：学生信息_2026-08-11.xlsx
begin;
  -- 郑王景怡
  update students_info set english_name = coalesce(nullif(english_name,''), 'Zhengwang Jingyi') where nfe_no = 1;
  -- 李祎鸣
  update students_info set english_name = coalesce(nullif(english_name,''), 'Li Yiming') where nfe_no = 3;
  -- 杨婉宁
  update students_info set english_name = coalesce(nullif(english_name,''), 'Yang Wanning') where nfe_no = 4;
  -- 徐靖涵
  update students_info set english_name = coalesce(nullif(english_name,''), 'Xu Jinghan') where nfe_no = 5;
  -- 王涵禹
  update students_info set english_name = coalesce(nullif(english_name,''), 'Wang Hanyu'), gender = coalesce(nullif(gender,''), 'male') where nfe_no = 6;
  -- 竹弘毅
  update students_info set english_name = coalesce(nullif(english_name,''), 'Zhu Hongyi') where nfe_no = 7;
  -- 林士剀
  update students_info set english_name = coalesce(nullif(english_name,''), 'Lin Shikai') where nfe_no = 8;
  -- 汪愉皓
  update students_info set english_name = coalesce(nullif(english_name,''), 'Wang Yuhao') where nfe_no = 9;
  -- 杨菡睿
  update students_info set english_name = coalesce(nullif(english_name,''), 'Yang Hanrui') where nfe_no = 10;
  -- 林韦多
  update students_info set english_name = coalesce(nullif(english_name,''), 'Lin Weiduo'), market_source = coalesce(nullif(market_source,''), '名校') where nfe_no = 11;
  -- 张滢
  update students_info set english_name = coalesce(nullif(english_name,''), 'Zhang Ying'), gender = coalesce(nullif(gender,''), 'female'), market_source = coalesce(nullif(market_source,''), '名校') where nfe_no = 12;
  -- 吴奕辉
  update students_info set english_name = coalesce(nullif(english_name,''), 'Wu Yihui') where nfe_no = 13;
  -- 留楷哲
  update students_info set english_name = coalesce(nullif(english_name,''), 'Liu Kaizhe'), gender = coalesce(nullif(gender,''), 'male'), market_source = coalesce(nullif(market_source,''), '名校') where nfe_no = 14;
  -- 方跃衡
  update students_info set english_name = coalesce(nullif(english_name,''), 'Fang Yueheng'), gender = coalesce(nullif(gender,''), 'male'), market_source = coalesce(nullif(market_source,''), '名校') where nfe_no = 15;
  -- 陈祺
  update students_info set english_name = coalesce(nullif(english_name,''), 'Chen Qi') where nfe_no = 16;
  -- 李锐
  update students_info set english_name = coalesce(nullif(english_name,''), 'Li Rui') where nfe_no = 17;
  -- 陈亦凡
  update students_info set english_name = coalesce(nullif(english_name,''), 'Chen Yifan') where nfe_no = 18;
  -- 楼子萱
  update students_info set english_name = coalesce(nullif(english_name,''), 'Lou Zixuan') where nfe_no = 19;
  -- 沈豪
  update students_info set english_name = coalesce(nullif(english_name,''), 'Shen Hao') where nfe_no = 20;
  -- 王天宁
  update students_info set english_name = coalesce(nullif(english_name,''), 'Wang Tianning') where nfe_no = 21;
  -- 徐泓森
  update students_info set english_name = coalesce(nullif(english_name,''), 'Xu Hongsen') where nfe_no = 22;
  -- 葛书妍
  update students_info set english_name = coalesce(nullif(english_name,''), 'Ge Shuyan') where nfe_no = 23;
  -- 占小诺
  update students_info set english_name = coalesce(nullif(english_name,''), 'Zhan Xiaonuo') where nfe_no = 24;
  -- 龚昊宇
  update students_info set english_name = coalesce(nullif(english_name,''), 'Gong Haoyu') where nfe_no = 25;
  -- 廖添瑞
  update students_info set english_name = coalesce(nullif(english_name,''), 'Liao Tianrui'), date_of_birth = coalesce(date_of_birth, '2007-11-09'::date), source_school = coalesce(nullif(source_school,''), '杭二中'), market_source = coalesce(nullif(market_source,''), '绿通') where nfe_no = 26;
  -- 祝一航
  update students_info set english_name = coalesce(nullif(english_name,''), 'Zhu Yihang'), date_of_birth = coalesce(date_of_birth, '2008-03-28'::date), source_school = coalesce(nullif(source_school,''), '杭二中'), market_source = coalesce(nullif(market_source,''), '绿通') where nfe_no = 27;
  -- 阮兰媛
  update students_info set english_name = coalesce(nullif(english_name,''), 'Ruan Lanyuan'), date_of_birth = coalesce(date_of_birth, '2008-01-04'::date) where nfe_no = 28;
  -- 冯宸易
  update students_info set english_name = coalesce(nullif(english_name,''), 'Feng Chenyi'), date_of_birth = coalesce(date_of_birth, '2008-06-06'::date), source_school = coalesce(nullif(source_school,''), '杭二中'), market_source = coalesce(nullif(market_source,''), '绿通') where nfe_no = 29;
  -- 陈帅赫
  update students_info set english_name = coalesce(nullif(english_name,''), 'Chen Shuaihe'), date_of_birth = coalesce(date_of_birth, '2007-09-22'::date), source_school = coalesce(nullif(source_school,''), '杭二中'), market_source = coalesce(nullif(market_source,''), '绿通') where nfe_no = 30;
  -- 彭奕程
  update students_info set english_name = coalesce(nullif(english_name,''), 'Peng Yicheng'), date_of_birth = coalesce(date_of_birth, '2007-10-10'::date), source_school = coalesce(nullif(source_school,''), '杭二中'), market_source = coalesce(nullif(market_source,''), '绿通') where nfe_no = 31;
  -- 赵思涵
  update students_info set english_name = coalesce(nullif(english_name,''), 'Zhao Sihan') where nfe_no = 32;
  -- 冯琪
  update students_info set english_name = coalesce(nullif(english_name,''), 'Feng Qi'), gender = coalesce(nullif(gender,''), 'female') where nfe_no = 33;
  -- 张可嘉
  update students_info set english_name = coalesce(nullif(english_name,''), 'Zhang Kejia') where nfe_no = 67;
  -- 蔡佳虹
  update students_info set english_name = coalesce(nullif(english_name,''), 'Cai Jiahong') where nfe_no = 68;
commit;
