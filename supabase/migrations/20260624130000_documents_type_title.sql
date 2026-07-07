-- 签证/保险/文件：新增文件类型「缴费凭证」「其他」+ 文件标题字段
alter type doc_type add value if not exists 'payment_receipt';
alter type doc_type add value if not exists 'other';

alter table public.student_documents
  add column if not exists title text;

comment on column public.student_documents.title is '文件标题/名称';
