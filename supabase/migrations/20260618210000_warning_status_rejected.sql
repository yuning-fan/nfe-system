-- 三步走干预流：警告信支持"拒绝"状态
ALTER TYPE warning_status ADD VALUE IF NOT EXISTS 'rejected';
