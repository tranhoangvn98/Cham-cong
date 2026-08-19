// Trich noi dung DOCX / XLSX de xem nhanh tren trinh duyet.
//
// Trinh duyet khong ve duoc hai dinh dang nay, nen muon "xem nhanh" thi phai boc noi dung
// ra o may chu. Viet tay thay vi keo thu vien doc Office: ta chi can VAN BAN de nguoi dung
// liec qua, khong can dung lai dinh dang. Mot thu vien day du keo theo hang chuc MB vao anh
// Docker cho mot tinh nang xem luot.
//
// DOCX va XLSX deu la tep ZIP chua XML. node:zlib co san inflateRaw nen khong can gi them.
import { inflateRawSync } from 'node:zlib';

// ---------------------------------------------------------------- tran an toan
// Tep do nhan su tai len, nhung van phai co tran: mot tep ZIP nho xiu co the bung ra hang
// GB (zip bomb) va lam het bo nho may chu.
const GIAI_NEN_TOI_DA = 40 * 1024 * 1024;
const SO_MUC_TOI_DA = 500;

/** Doc cac muc trong tep ZIP. Chi giai nen nhung muc duoc hoi den. */
function doc_zip(du_lieu: Buffer, can_lay: (ten: string) => boolean): Map<string, Buffer> {
  const ra = new Map<string, Buffer>();

  // Tim End Of Central Directory: chu ky 0x06054b50, nam gan cuoi tep.
  let eocd = -1;
  for (let i = du_lieu.length - 22; i >= 0 && i > du_lieu.length - 65_557; i--) {
    if (du_lieu.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) return ra;

  const so_muc = du_lieu.readUInt16LE(eocd + 10);
  let vi_tri = du_lieu.readUInt32LE(eocd + 16);

  for (let i = 0; i < Math.min(so_muc, SO_MUC_TOI_DA); i++) {
    if (vi_tri + 46 > du_lieu.length) break;
    if (du_lieu.readUInt32LE(vi_tri) !== 0x02014b50) break;

    const nen = du_lieu.readUInt16LE(vi_tri + 10);
    const co_nen = du_lieu.readUInt32LE(vi_tri + 20);
    const goc = du_lieu.readUInt32LE(vi_tri + 24);
    const dai_ten = du_lieu.readUInt16LE(vi_tri + 28);
    const dai_extra = du_lieu.readUInt16LE(vi_tri + 30);
    const dai_chu_thich = du_lieu.readUInt16LE(vi_tri + 32);
    const cho_local = du_lieu.readUInt32LE(vi_tri + 42);
    const ten = du_lieu.toString('utf8', vi_tri + 46, vi_tri + 46 + dai_ten);

    vi_tri += 46 + dai_ten + dai_extra + dai_chu_thich;

    if (!can_lay(ten)) continue;
    if (goc > GIAI_NEN_TOI_DA) continue;
    if (cho_local + 30 > du_lieu.length) continue;
    if (du_lieu.readUInt32LE(cho_local) !== 0x04034b50) continue;

    // Header cuc bo co the khai do dai ten/extra KHAC voi central directory — phai doc lai
    // tu chinh no, neu khong se cat vao giua du lieu.
    const dai_ten_cb = du_lieu.readUInt16LE(cho_local + 26);
    const dai_extra_cb = du_lieu.readUInt16LE(cho_local + 28);
    const bat_dau = cho_local + 30 + dai_ten_cb + dai_extra_cb;
    const tho = du_lieu.subarray(bat_dau, bat_dau + co_nen);

    try {
      ra.set(ten, nen === 0 ? Buffer.from(tho) : inflateRawSync(tho, { maxOutputLength: GIAI_NEN_TOI_DA }));
    } catch {
      // Muc hong thi bo qua, con lai van doc duoc.
    }
  }
  return ra;
}

// ---------------------------------------------------------------- XML toi gian

/** Doi thuc the XML co ban ve ky tu that. */
function bo_thuc_the(s: string): string {
  return s
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, m: string) => String.fromCodePoint(Number(m)))
    .replace(/&amp;/g, '&'); // phai cuoi cung, neu khong se giai ma hai lan
}

/**
 * Lay noi dung THO ben trong moi the co ten nay — CHUA giai ma thuc the.
 *
 * Giai ma o day roi lai giai ma tiep o lop trong la giai HAI LAN: '&amp;amp;lt;' se ra
 * '&lt;' thay vi '&amp;lt;'. Chi giai ma dung mot lan, o cho lay chu cuoi cung.
 */
function lay_the(xml: string, ten: string): string[] {
  const ra: string[] = [];
  // `[^>]*` cho ca the co thuoc tinh; `[\s\S]*?` de bat qua ca xuong dong.
  const re = new RegExp(`<${ten}(?:\\s[^>]*)?>([\\s\\S]*?)</${ten}>`, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) ra.push(m[1] ?? '');
  return ra;
}

// ---------------------------------------------------------------- DOCX

export interface TrichVanBan {
  loai: 'van_ban';
  doan: string[];
  cat_bot: boolean;
}

/**
 * Tran doan cho "xem nhanh". Du de liec qua mot tep, khong phai de luu tru.
 *
 * Ai can TOAN VAN — vd luu noi dung hop dong de tim kiem — phai tu khai `doan_toi_da`
 * cao hon. Giu mac dinh thap o day de mot cai bam xem nhanh khong keo ve ca quyen sach.
 */
const DOAN_TOI_DA = 400;

export interface TuyChonDocx {
  /** So doan toi da. Mac dinh 400 — du xem nhanh, khong du luu tru. */
  doan_toi_da?: number;
}

/** Trich cac doan van cua DOCX. Bo dinh dang, chi giu chu. */
export function trich_docx(du_lieu: Buffer, tc: TuyChonDocx = {}): TrichVanBan | null {
  const tran = tc.doan_toi_da ?? DOAN_TOI_DA;
  const muc = doc_zip(du_lieu, (t) => t === 'word/document.xml');
  const xml = muc.get('word/document.xml')?.toString('utf8');
  if (xml === undefined) return null;

  const doan: string[] = [];
  // Moi <w:p> la mot doan; chu nam trong cac <w:t> ben trong no.
  for (const p of lay_the(xml, 'w:p')) {
    const chu = (p.match(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g) ?? [])
      .map((t) => bo_thuc_the(t.replace(/<[^>]*>/g, '')))
      .join('');
    if (chu.trim() !== '') doan.push(chu.trim());
    if (doan.length >= tran) break;
  }

  return { loai: 'van_ban', doan, cat_bot: doan.length >= tran };
}

// ---------------------------------------------------------------- XLSX

export interface TrichBang {
  loai: 'bang';
  hang: string[][];
  cat_bot: boolean;
}

const HANG_TOI_DA = 200;
const COT_TOI_DA = 30;

/** Doi ten cot Excel ('A', 'AB') sang chi so bat dau tu 0. */
export function cot_sang_so(chu: string): number {
  let n = 0;
  for (const c of chu.toUpperCase()) {
    const v = c.charCodeAt(0) - 64; // 'A' = 1
    if (v < 1 || v > 26) continue;
    n = n * 26 + v;
  }
  return n - 1;
}

/** Trich sheet dau tien cua XLSX thanh mang hai chieu. */
export function trich_xlsx(du_lieu: Buffer): TrichBang | null {
  const muc = doc_zip(du_lieu, (t) =>
    t === 'xl/sharedStrings.xml' || t === 'xl/worksheets/sheet1.xml');
  const sheet = muc.get('xl/worksheets/sheet1.xml')?.toString('utf8');
  if (sheet === undefined) return null;

  // Chuoi dung chung: Excel khong luu chu trong o ma luu chi so tro toi bang nay.
  const chia_se: string[] = [];
  const ss = muc.get('xl/sharedStrings.xml')?.toString('utf8');
  if (ss !== undefined) {
    for (const si of ss.match(/<si>[\s\S]*?<\/si>/g) ?? []) {
      // Mot <si> co the gom nhieu <t> (chu bi chia theo dinh dang) — noi lai het.
      chia_se.push(
        (si.match(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g) ?? [])
          .map((t) => bo_thuc_the(t.replace(/<[^>]*>/g, ''))).join(''),
      );
    }
  }

  const hang: string[][] = [];
  for (const r of sheet.match(/<row[\s\S]*?<\/row>/g) ?? []) {
    const dong: string[] = [];
    for (const c of r.match(/<c[\s\S]*?(?:\/>|<\/c>)/g) ?? []) {
      const cot = cot_sang_so(/r="([A-Z]+)/.exec(c)?.[1] ?? '');
      const kieu = /t="([^"]+)"/.exec(c)?.[1] ?? 'n';
      let gia_tri = '';

      if (kieu === 'inlineStr') {
        gia_tri = (c.match(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g) ?? [])
          .map((t) => bo_thuc_the(t.replace(/<[^>]*>/g, ''))).join('');
      } else {
        const v = /<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/.exec(c)?.[1];
        if (v !== undefined) {
          gia_tri = kieu === 's' ? (chia_se[Number(v)] ?? '') : bo_thuc_the(v);
        }
      }

      if (cot >= 0 && cot < COT_TOI_DA) {
        while (dong.length < cot) dong.push('');
        dong[cot] = gia_tri;
      }
    }
    if (dong.some((x) => x !== '')) hang.push(dong);
    if (hang.length >= HANG_TOI_DA) break;
  }

  // Cho moi hang cung so cot de ben giao dien khong phai xu ly hang lech.
  const rong = hang.reduce((m, h) => Math.max(m, h.length), 0);
  for (const h of hang) while (h.length < rong) h.push('');

  return { loai: 'bang', hang, cat_bot: hang.length >= HANG_TOI_DA };
}

/** Chon bo trich theo duoi tep da luu. */
export function trich_theo_duoi(
  du_lieu: Buffer,
  ten_luu: string,
): TrichVanBan | TrichBang | null {
  if (ten_luu.endsWith('.docx')) return trich_docx(du_lieu);
  if (ten_luu.endsWith('.xlsx')) return trich_xlsx(du_lieu);
  return null;
}
