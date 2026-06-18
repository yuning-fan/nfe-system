import { useRef, useState } from 'react';
import { IconUpload, IconLoader2 } from '@tabler/icons-react';
import { message } from 'antd';
import { uploadFile, type R2Bucket, type UploadResult } from '../../lib/r2';

interface FileUploadButtonProps {
  bucket: R2Bucket;
  /** 对象路径前缀，如 `studentId/visa` */
  prefix: string;
  /** 接受的文件类型，如 "image/*,.pdf" */
  accept?: string;
  /** 文件大小上限（MB），默认 20 */
  maxSizeMB?: number;
  /** 按钮文案 */
  label?: string;
  /** 上传成功回调，返回 { bucket, key } */
  onUploaded: (result: UploadResult, file: File) => void | Promise<void>;
  /** 额外样式类 */
  className?: string;
}

export default function FileUploadButton({
  bucket,
  prefix,
  accept,
  maxSizeMB = 20,
  label = '上传文件',
  onUploaded,
  className,
}: FileUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handlePick = () => {
    if (!uploading) inputRef.current?.click();
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSizeMB * 1024 * 1024) {
      message.error(`文件超过 ${maxSizeMB}MB 上限`);
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const result = await uploadFile(bucket, prefix, file);
      await onUploaded(result, file);
      message.success('上传成功');
    } catch (err: any) {
      console.error(err);
      message.error(err.message || '上传失败');
    } finally {
      setUploading(false);
      e.target.value = ''; // 允许重复选同一文件
    }
  };

  return (
    <>
      <button className={`btn ${className || ''}`} onClick={handlePick} disabled={uploading}>
        {uploading
          ? <><IconLoader2 size={16} className="spinner" style={{ marginRight: 4 }} /> 上传中…</>
          : <><IconUpload size={16} style={{ marginRight: 4 }} /> {label}</>}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={handleChange}
      />
    </>
  );
}
