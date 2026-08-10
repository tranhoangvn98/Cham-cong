// Doc CSV do nguoi dung tai len. Viet tay thay vi keo thu vien: chi can dung dinh dang
// RFC 4180 co ban, va tep o day den tu nhan su chu khong phai tu Internet.

/** Mot dong da tach thanh cac o, giu nguyen thu tu cot. */
export type DongCsv = string[];

/**
 * Tach CSV thanh mang cac dong.
 *
 * Xu ly: dau nhay kep boc o, hai dau nhay lien tiep la mot dau nhay, xuong dong BEN TRONG
 * o duoc phep. Tu dong nhan dau phan tach la dau phay, cham phay hay TAB — Excel ban tieng
 * Viet xuat ra dau CHAM PHAY chu khong phai dau phay, day la cho vap kinh dien.
 */
export function tach_csv(noi_dung: string): DongCsv[] {
  const van_ban = noi_dung.replace(/^﻿/, ''); // bo BOM neu co
  const dau_tach = doan_dau_tach(van_ban);

  const dong: DongCsv[] = [];
  let o: string[] = [];
  let hien_tai = '';
  let trong_nhay = false;

  for (let i = 0; i < van_ban.length; i++) {
    const c = van_ban[i] as string;

    if (trong_nhay) {
      if (c === '"') {
        if (van_ban[i + 1] === '"') { hien_tai += '"'; i++; }
        else trong_nhay = false;
      } else {
        hien_tai += c;
      }
      continue;
    }

    if (c === '"' && hien_tai.trim() === '') { trong_nhay = true; hien_tai = ''; continue; }
    if (c === dau_tach) { o.push(hien_tai.trim()); hien_tai = ''; continue; }
    if (c === '\n' || c === '\r') {
      if (c === '\r' && van_ban[i + 1] === '\n') i++;
      o.push(hien_tai.trim());
      if (o.some((x) => x !== '')) dong.push(o);
      o = [];
      hien_tai = '';
      continue;
    }
    hien_tai += c;
  }

  o.push(hien_tai.trim());
  if (o.some((x) => x !== '')) dong.push(o);
  return dong;
}

/** Dau phan tach xuat hien nhieu nhat o dong dau tien. */
function doan_dau_tach(van_ban: string): string {
  const dong_dau = van_ban.split(/\r?\n/, 1)[0] ?? '';
  const dem = (c: string): number => dong_dau.split(c).length - 1;
  const ung_vien: [string, number][] = [[',', dem(',')], [';', dem(';')], ['\t', dem('\t')]];
  ung_vien.sort((a, b) => b[1] - a[1]);
  return (ung_vien[0]?.[1] ?? 0) > 0 ? (ung_vien[0]?.[0] as string) : ',';
}

/**
 * Bo dau tieng Viet va chuan hoa de doi chieu ten cot.
 *
 * Nhan su xuat tu Excel co the ghi "Mã NV", "ma_nv", "MÃ NV " — tat ca phai ra cung mot
 * khoa, neu khong ho phai sua tieu de bang tay moi nhap duoc.
 */
export function chuan_hoa_tieu_de(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Doi chieu dong tieu de voi cac ten cot chap nhan duoc.
 *
 * `bi_danh` anh xa khoa chuan -> danh sach ten co the gap. Tra ve vi tri cot cua tung khoa,
 * -1 neu khong tim thay.
 */
export function doi_chieu_cot(
  tieu_de: DongCsv,
  bi_danh: Record<string, string[]>,
): Record<string, number> {
  const chuan = tieu_de.map(chuan_hoa_tieu_de);
  const ra: Record<string, number> = {};
  for (const [khoa, ten] of Object.entries(bi_danh)) {
    ra[khoa] = chuan.findIndex((c) => ten.some((t) => chuan_hoa_tieu_de(t) === c));
  }
  return ra;
}
