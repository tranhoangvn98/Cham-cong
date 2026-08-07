// Doi chieu dia chi IP voi danh sach cho phep (Task B5 — lop phong thu mang cho /iclock).
//
// VI SAO CAN: cong /iclock chi co MOT lop chan la whitelist theo serial may. Khi may chu
// dat trong LAN thi du, nhung dat tren VPS thi cong do phoi ra Internet — serial ma lot
// ra la bat ky ai cung POST duoc lan quet gia vao bang cong, tuc la vao co so tinh luong.
//
// Ho tro IPv4 kem tien to CIDR (`203.0.113.45`, `192.168.1.0/24`) va IPv6 khop chinh xac.
// Dang IPv4 boc trong IPv6 (`::ffff:203.0.113.45`) duoc chuan hoa ve IPv4 truoc khi so.

/** Bo lop boc IPv6 va vung (`%eth0`) de con dang so sanh duoc. */
export function chuan_hoa_ip(ip: string): string {
  let s = ip.trim().toLowerCase();
  const vung = s.indexOf('%');
  if (vung >= 0) s = s.slice(0, vung);
  // ::ffff:203.0.113.45 -> 203.0.113.45
  if (s.startsWith('::ffff:') && s.includes('.')) return s.slice(7);
  return s;
}

function la_ipv4(s: string): boolean {
  const p = s.split('.');
  if (p.length !== 4) return false;
  return p.every((x) => /^\d{1,3}$/.test(x) && Number(x) <= 255);
}

/** IPv4 -> so nguyen 32 bit khong dau. Tra null neu khong phai IPv4. */
function ipv4_ve_so(s: string): number | null {
  if (!la_ipv4(s)) return null;
  return s.split('.').reduce((a, x) => a * 256 + Number(x), 0);
}

export interface QuyTacIp {
  /** Dang goc de ghi log cho de doc. */
  goc: string;
  loai: 'ipv4' | 'khac';
  /** Chi co khi loai = 'ipv4'. */
  mang?: number;
  mat_na?: number;
  /** Chi co khi loai = 'khac' (IPv6 khop chinh xac). */
  chinh_xac?: string;
}

/**
 * Doc danh sach tu bien moi truong. Bo qua muc rong; nem loi neu mot muc sai dinh dang —
 * cau hinh sai o lop bao mat phai bao ngay luc khoi dong, khong im lang cho qua.
 */
export function doc_danh_sach_ip(chuoi: string, ten = 'ICLOCK_IP_CHO_PHEP'): QuyTacIp[] {
  const ra: QuyTacIp[] = [];
  for (const tho of chuoi.split(',')) {
    const muc = tho.trim();
    if (muc === '') continue;

    const [phan_ip, phan_tien_to] = muc.split('/');
    const ip = chuan_hoa_ip(phan_ip ?? '');
    const so = ipv4_ve_so(ip);

    if (so !== null) {
      const tien_to = phan_tien_to === undefined ? 32 : Number(phan_tien_to);
      if (!Number.isInteger(tien_to) || tien_to < 0 || tien_to > 32) {
        throw new Error(`${ten}: tien to CIDR khong hop le trong "${muc}"`);
      }
      // Dich phai roi dich trai de tranh `<<` voi 32 (JS cho ket qua sai).
      const mat_na = tien_to === 0 ? 0 : (0xffffffff << (32 - tien_to)) >>> 0;
      ra.push({ goc: muc, loai: 'ipv4', mang: (so & mat_na) >>> 0, mat_na });
      continue;
    }

    if (phan_tien_to !== undefined) {
      throw new Error(`${ten}: chi ho tro CIDR cho IPv4, "${muc}" khong hop le`);
    }
    if (!ip.includes(':')) {
      throw new Error(`${ten}: "${muc}" khong phai dia chi IP`);
    }
    ra.push({ goc: muc, loai: 'khac', chinh_xac: ip });
  }
  return ra;
}

/**
 * `true` neu IP nam trong danh sach.
 *
 * Danh sach RONG nghia la CHO PHEP TAT CA — de nguoi dung dat may trong LAN khong phai
 * cau hinh gi. May chu ghi canh bao luc khoi dong khi o trang thai nay.
 */
export function ip_duoc_phep(ip: string | null | undefined, quy_tac: QuyTacIp[]): boolean {
  if (quy_tac.length === 0) return true;
  if (ip === null || ip === undefined || ip === '') return false;

  const s = chuan_hoa_ip(ip);
  const so = ipv4_ve_so(s);

  for (const q of quy_tac) {
    if (q.loai === 'ipv4') {
      if (so === null) continue;
      if (((so & (q.mat_na ?? 0)) >>> 0) === q.mang) return true;
    } else if (q.chinh_xac === s) {
      return true;
    }
  }
  return false;
}
