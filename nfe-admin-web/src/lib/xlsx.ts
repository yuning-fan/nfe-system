// 零依赖 .xlsx 导出 —— 手写 OOXML + ZIP(STORE)，浏览器原生 API
//
// 为什么不引库：项目既有导出（reportExport.ts）就是零依赖路线；而把 HTML 表格
// 存成 .xls 会让 Excel 弹「文件格式与扩展名不符」警告，看着像文件坏了。
// 这里产出的是真 .xlsx，Excel / WPS / Numbers 均可直接打开。
//
// 取舍：ZIP 用 STORE（不压缩）——省掉 DEFLATE 实现，代价是文件大几倍。
// 学生名单这种量级（几十行 × 二十几列，几十 KB）无所谓。

export type CellValue = string | number | null | undefined;

export interface SheetSpec {
  sheetName?: string;
  headers: string[];
  rows: CellValue[][];
  /** 各列宽度（Excel 字符数）；缺省按表头长度估。 */
  colWidths?: number[];
}

// ---------- ZIP ----------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

interface ZipEntry { name: string; data: Uint8Array; crc: number; offset: number }

/** 打包成 ZIP（STORE，无压缩）。文件名限 ASCII，故不置 UTF-8 标志位。 */
function zip(files: { name: string; text: string }[]): Blob {
  const enc = new TextEncoder();
  const entries: ZipEntry[] = [];
  const chunks: Uint8Array[] = [];
  let offset = 0;

  const push = (u: Uint8Array) => { chunks.push(u); offset += u.length; };
  const header = (size: number) => {
    const b = new Uint8Array(size);
    return { b, v: new DataView(b.buffer) };
  };

  for (const f of files) {
    const nameBytes = enc.encode(f.name);
    const data = enc.encode(f.text);
    const crc = crc32(data);
    const { b, v } = header(30);
    v.setUint32(0, 0x04034b50, true);   // 本地文件头签名
    v.setUint16(4, 20, true);           // 解压所需版本
    v.setUint16(6, 0, true);            // 标志位
    v.setUint16(8, 0, true);            // 压缩方式 0 = STORE
    v.setUint16(10, 0, true);           // 修改时间（固定 0，保证同数据产出同文件）
    v.setUint16(12, 0x0021, true);      // 修改日期 = 1980-01-01
    v.setUint32(14, crc, true);
    v.setUint32(18, data.length, true); // 压缩后大小
    v.setUint32(22, data.length, true); // 原始大小
    v.setUint16(26, nameBytes.length, true);
    v.setUint16(28, 0, true);           // 扩展字段长度
    entries.push({ name: f.name, data, crc, offset });
    push(b); push(nameBytes); push(data);
  }

  const cdStart = offset;
  for (const e of entries) {
    const nameBytes = enc.encode(e.name);
    const { b, v } = header(46);
    v.setUint32(0, 0x02014b50, true);   // 中央目录签名
    v.setUint16(4, 20, true);           // 创建版本
    v.setUint16(6, 20, true);           // 解压所需版本
    v.setUint16(8, 0, true);
    v.setUint16(10, 0, true);
    v.setUint16(12, 0, true);
    v.setUint16(14, 0x0021, true);
    v.setUint32(16, e.crc, true);
    v.setUint32(20, e.data.length, true);
    v.setUint32(24, e.data.length, true);
    v.setUint16(28, nameBytes.length, true);
    v.setUint16(30, 0, true);           // 扩展字段
    v.setUint16(32, 0, true);           // 注释
    v.setUint16(34, 0, true);           // 起始磁盘号
    v.setUint16(36, 0, true);           // 内部属性
    v.setUint32(38, 0, true);           // 外部属性
    v.setUint32(42, e.offset, true);    // 本地头偏移
    push(b); push(nameBytes);
  }

  const { b: eocd, v: ev } = header(22);
  ev.setUint32(0, 0x06054b50, true);    // 中央目录结束记录
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, offset - cdStart, true);
  ev.setUint32(16, cdStart, true);
  push(eocd);

  return new Blob(chunks as BlobPart[], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

// ---------- OOXML ----------

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
   // XML 1.0 不允许的控制字符（Excel 会判文件损坏），直接剔除。
   // 这里匹配控制字符正是本意，故豁免 no-control-regex。
   // eslint-disable-next-line no-control-regex
   .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

/** 0 → A，25 → Z，26 → AA */
const colRef = (i: number) => {
  let s = '', n = i + 1;
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
};

const isFiniteNumber = (v: CellValue): v is number => typeof v === 'number' && Number.isFinite(v);

function cell(ref: string, v: CellValue, styleIdx: number): string {
  const s = styleIdx ? ` s="${styleIdx}"` : '';
  if (v == null || v === '') return `<c r="${ref}"${s}/>`;
  if (isFiniteNumber(v)) return `<c r="${ref}"${s}><v>${v}</v></c>`;
  // 内联字符串：省掉 sharedStrings.xml 这一整个部件
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(String(v))}</t></is></c>`;
}

function sheetXml(spec: SheetSpec): string {
  const { headers, rows } = spec;
  const lastCol = colRef(Math.max(headers.length, 1) - 1);
  const lastRow = rows.length + 1;

  const widths = spec.colWidths
    ?? headers.map(h => Math.min(40, Math.max(8, [...h].reduce((n, c) => n + (c.charCodeAt(0) > 255 ? 2 : 1), 0) + 4)));
  const cols = widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('');

  const headerRow = `<row r="1">${headers.map((h, i) => cell(colRef(i) + '1', h, 1)).join('')}</row>`;
  const bodyRows = rows.map((r, ri) => {
    const n = ri + 2;
    return `<row r="${n}">${headers.map((_, ci) => cell(colRef(ci) + n, r[ci], 0)).join('')}</row>`;
  }).join('');

  // 子元素顺序由 schema 固定：dimension → sheetViews → cols → sheetData → autoFilter
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<dimension ref="A1:${lastCol}${lastRow}"/>` +
    `<sheetViews><sheetView workbookViewId="0">` +
    `<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>` +
    `</sheetView></sheetViews>` +
    `<sheetFormatPr defaultRowHeight="15"/>` +
    `<cols>${cols}</cols>` +
    `<sheetData>${headerRow}${bodyRows}</sheetData>` +
    `<autoFilter ref="A1:${lastCol}${lastRow}"/>` +
    `</worksheet>`;
}

// Excel 要求 fills 至少含 none 与 gray125 两项，否则判文件损坏
const STYLES_XML =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
  `<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font>` +
  `<font><b/><sz val="11"/><name val="Calibri"/></font></fonts>` +
  `<fills count="3"><fill><patternFill patternType="none"/></fill>` +
  `<fill><patternFill patternType="gray125"/></fill>` +
  `<fill><patternFill patternType="solid"><fgColor rgb="FFF2F4F7"/><bgColor indexed="64"/></patternFill></fill></fills>` +
  `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
  `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
  `<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
  `<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>` +
  `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
  `</styleSheet>`;

/** Excel 工作表名上限 31 字符，且禁用 []:*?/\ */
const safeSheetName = (n: string) => (n.replace(/[[\]:*?/\\]/g, '_').slice(0, 31) || 'Sheet1');

export function buildXlsx(spec: SheetSpec): Blob {
  const name = safeSheetName(spec.sheetName || 'Sheet1');
  return zip([
    {
      name: '[Content_Types].xml',
      text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
        `<Default Extension="xml" ContentType="application/xml"/>` +
        `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
        `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
        `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
        `</Types>`,
    },
    {
      name: '_rels/.rels',
      text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
        `</Relationships>`,
    },
    {
      name: 'xl/workbook.xml',
      text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ` +
        `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
        `<sheets><sheet name="${esc(name)}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
        `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
        `</Relationships>`,
    },
    { name: 'xl/styles.xml', text: STYLES_XML },
    { name: 'xl/worksheets/sheet1.xml', text: sheetXml(spec) },
  ]);
}

export function downloadXlsx(fileName: string, spec: SheetSpec) {
  const url = URL.createObjectURL(buildXlsx(spec));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
