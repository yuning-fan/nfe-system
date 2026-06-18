// Cloudflare R2 文件上传/下载封装
// 通过 Supabase Edge Function `r2-sign` 获取预签名 URL，前端直传/直读 R2。
// R2 Secret 永不出现在前端。

import { supabase } from './supabase';

export type R2Bucket = 'student-docs' | 'materials' | 'reports' | 'avatars' | 'resources';

interface SignResponse {
  url: string;
  key: string;
}

// 向 Edge Function 请求预签名 URL
async function getSignedUrl(
  action: 'upload' | 'download',
  bucket: R2Bucket,
  key: string,
  contentType?: string,
): Promise<string> {
  const { data, error } = await supabase.functions.invoke<SignResponse>('r2-sign', {
    body: { action, bucket, key, contentType },
  });
  if (error) throw new Error(`签名服务调用失败: ${error.message}`);
  if (!data?.url) throw new Error('签名服务未返回 URL');
  return data.url;
}

// 生成安全的对象 key：去掉路径分隔、保留扩展名、加时间戳防重名
function buildKey(prefix: string, fileName: string): string {
  const safeName = fileName.replace(/[^\w.\-]/g, '_');
  const ts = Date.now();
  return `${prefix}/${ts}-${safeName}`;
}

export interface UploadResult {
  bucket: R2Bucket;
  key: string; // 存入数据库 file_url 字段的值（桶内路径）
}

// 上传文件到 R2，返回 { bucket, key }
export async function uploadFile(
  bucket: R2Bucket,
  prefix: string,
  file: File,
): Promise<UploadResult> {
  const key = buildKey(prefix, file.name);
  const url = await getSignedUrl('upload', bucket, key, file.type);

  const res = await fetch(url, {
    method: 'PUT',
    body: file,
    headers: file.type ? { 'Content-Type': file.type } : undefined,
  });
  if (!res.ok) {
    throw new Error(`上传失败 (HTTP ${res.status})`);
  }
  return { bucket, key };
}

// 获取下载/查看用的临时 URL（有时效）
export async function getDownloadUrl(bucket: R2Bucket, key: string): Promise<string> {
  return getSignedUrl('download', bucket, key);
}
