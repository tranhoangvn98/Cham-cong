// Phan tich payload giao thuc ADMS (ZKTeco push). Du lieu la TEXT THO, cac truong
// phan tach bang TAB, moi ban ghi mot dong — KHONG phai JSON.
//
// Cac endpoint lien quan (cai dat o adms/tuyen.ts):
//   GET  /iclock/cdata?SN=..&options=all   -> handshake, server tra block cau hinh
//   POST /iclock/cdata?SN=..&table=ATTLOG  -> may day log cham cong (parse o day)
//   POST /iclock/cdata?SN=..&table=OPERLOG -> log thao tac (them/xoa user tren may)
//   GET  /iclock/getrequest?SN=..          -> may hoi lenh; tra "C:ID:CMD" hoac "OK"
//   POST /iclock/devicecmd?SN=..           -> may bao ket qua: "ID=1&Return=0&CMD=INFO"
import { OFFSET_MAY_MS } from '../cau_hinh.ts';

/** Ma Status trong ATTLOG. */
export const TrangThaiQuet = {
  VAO: 0,
  RA: 1,
  RA_NGHI: 2,
  VAO_NGHI: 3,
  OT_VAO: 4,
  OT_RA: 5,
} as const;

/** Ma Verify trong ATTLOG — gia tri co the khac chut theo firmware. */
export const CACH_XAC_THUC: Record<number, string> = {
  0: 'Mật khẩu',
  1: 'Vân tay',
  2: 'Thẻ',
  3: 'Mật khẩu',
  4: 'Thẻ',
  5: 'Vân tay + Thẻ',
  6: 'Vân tay + Mật khẩu',
  7: 'Thẻ + Mật khẩu',
  8: 'Thẻ + Vân tay + Mật khẩu',
  9: 'Khác',
  15: 'Khuôn mặt',
  25: 'Lòng bàn tay',
};

export function nhan_cach_xac_thuc(ma: number): string {
  return CACH_XAC_THUC[ma] ?? 'Khác';
}

export const NHAN_TRANG_THAI: Record<number, string> = {
  0: 'Vào',
  1: 'Ra',
  2: 'Ra nghỉ',
  3: 'Vào sau nghỉ',
  4: 'Vào tăng ca',
  5: 'Ra tăng ca',
};

export interface BanGhiAttlog {
  pin: string;
  /** Moc thoi gian tuyet doi, da gan offset mui gio cua may. */
  thoi_diem: Date;
  trang_thai: number;
  xac_thuc: number;
  ma_cong_viec: number;
}

/**
 * Doi chuoi gio may (gio DIA PHUONG, khong co offset) thanh Date tuyet doi.
 * Ho tro ca dang epoch giay ma mot so firmware gui.
 */
function doc_thoi_diem(gia_tri: string): Date | null {
  const s = gia_tri.trim();

  // Dang 'yyyy-MM-dd HH:mm:ss' hoac 'yyyy-MM-ddTHH:mm:ss'
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(s);
  if (m !== null) {
    const [, nam, thang, ngay, gio, phut, giay] = m as unknown as string[];
    // Dung Date.UTC roi tru offset: coi chuoi la gio dia phuong cua MAY,
    // khong phu thuoc mui gio cua may chu chay Node.
    const utc_ms = Date.UTC(
      Number(nam), Number(thang) - 1, Number(ngay),
      Number(gio), Number(phut), Number(giay ?? '0'),
    ) - OFFSET_MAY_MS;
    const d = new Date(utc_ms);
    // Chan ngay vo ly (vd 2025-02-31 -> troi sang thang 3) va gio > 23:59
    if (Number(thang) < 1 || Number(thang) > 12) return null;
    if (Number(gio) > 23 || Number(phut) > 59) return null;
    if (d.getUTCDate() !== Number(ngay)) return null;
    return d;
  }

  // Dang epoch giay
  if (/^\d{9,11}$/.test(s)) {
    const epoch = Number(s);
    if (!Number.isFinite(epoch)) return null;
    return new Date(epoch * 1000);
  }

  return null;
}

/**
 * Parse toan bo body table=ATTLOG. Bo qua dong loi (tang goi ghi log), tra ve
 * danh sach ban ghi hop le.
 * Moi dong: PIN \t yyyy-MM-dd HH:mm:ss \t Status \t Verify \t WorkCode [\t ...]
 */
export function doc_attlog(body: string): { ban_ghi: BanGhiAttlog[]; so_dong_loi: number } {
  const ban_ghi: BanGhiAttlog[] = [];
  let so_dong_loi = 0;
  if (typeof body !== 'string' || body.trim().length === 0) {
    return { ban_ghi, so_dong_loi };
  }

  for (const raw of body.split('\n')) {
    const dong = raw.replace(/\r$/, '');
    if (dong.trim().length === 0) continue;

    // Mot so firmware dung nhieu khoang trang thay TAB — chap nhan ca hai.
    const f = dong.includes('\t') ? dong.split('\t') : dong.trim().split(/\s{2,}/);
    if (f.length < 2) { so_dong_loi++; continue; }

    const pin = (f[0] ?? '').trim();
    if (pin.length === 0 || pin.length > 32) { so_dong_loi++; continue; }

    const thoi_diem = doc_thoi_diem(f[1] ?? '');
    if (thoi_diem === null) { so_dong_loi++; continue; }

    ban_ghi.push({
      pin,
      thoi_diem,
      trang_thai: so_nguyen(f[2], 0, 0, 5),
      xac_thuc: so_nguyen(f[3], 9, 0, 255),
      ma_cong_viec: so_nguyen(f[4], 0, 0, 999999),
    });
  }

  return { ban_ghi, so_dong_loi };
}

/**
 * Doc mot lo RTLOG — dinh dang cua giao thuc PUSH kiem soat ra vao (may day len bang
 * `POST /iclock/cdata?table=rtlog`).
 *
 * Khac han ATTLOG: khong phai cot phan tach bang TAB ma la cac cap `khoa=gia tri`:
 *
 *   time=2026-08-14 15:28:03⇥pin=123456⇥cardno=0⇥eventaddr=1⇥event=0⇥inoutstatus=0
 *   ⇥verifytype=15⇥index=0
 *
 * May day rtlog rat day (vai lan moi giay) va phan lon la nhip tim than rong — dong rong
 * tra ve 0 ban ghi, khong tinh la dong loi.
 *
 * Bo qua dong khong co `pin` hoac `pin=0`: do la su kien cua cua/thiet bi (bao dong, mo
 * cua bang nut) chu khong phai mot nguoi quet. Ghi chung vao bang cham cong thi sinh ra
 * cong cua "nhan vien PIN 0".
 */
export function doc_rtlog(body: string): { ban_ghi: BanGhiAttlog[]; so_dong_loi: number } {
  const ban_ghi: BanGhiAttlog[] = [];
  let so_dong_loi = 0;
  if (typeof body !== 'string' || body.trim().length === 0) {
    return { ban_ghi, so_dong_loi };
  }

  for (const raw of body.split('\n')) {
    const dong = raw.replace(/\r$/, '');
    if (dong.trim().length === 0) continue;

    const o: Record<string, string> = {};
    for (const token of dong.split(/\t|\s{2,}/)) {
      const vt = token.indexOf('=');
      if (vt <= 0) continue;
      o[token.slice(0, vt).trim().toLowerCase()] = token.slice(vt + 1).trim();
    }

    const pin = (o['pin'] ?? '').trim();
    const thoi_diem = doc_thoi_diem(o['time'] ?? '');
    if (pin === '' || pin === '0' || pin.length > 32 || thoi_diem === null) {
      // Dong khong co cap khoa=gia tri nao la dinh dang la -> dong loi. Dong co du cap
      // nhung la su kien cua thiet bi thi bo qua lang le.
      if (Object.keys(o).length === 0) so_dong_loi++;
      continue;
    }

    ban_ghi.push({
      pin,
      thoi_diem,
      // inoutstatus: 0 vao / 1 ra — trung y nghia voi cot Status cua ATTLOG.
      trang_thai: so_nguyen(o['inoutstatus'], 0, 0, 5),
      xac_thuc: so_nguyen(o['verifytype'], 9, 0, 255),
      ma_cong_viec: 0,
    });
  }

  return { ban_ghi, so_dong_loi };
}

/** Mot dong USERINFO may day len: dinh danh nguoi dung ENROLL TREN MAY (khong phai cong). */
export interface NguoiDungMay {
  pin: string;
  ten: string | null;   // Name tren may (thuong ASCII khong dau, cat ngan)
  the: string | null;   // Card
  quyen: number;        // Pri: 0 thuong, 14 admin...
}

/**
 * Doc bang USERINFO may day len (sau lenh `DATA QUERY USERINFO`, hoac khi enroll/xoa user).
 * Moi dong la cap `Khoa=gia tri` phan tach bang TAB, vd:
 *
 *   PIN=6⇥Name=NGUYEN VIET⇥Pri=0⇥Passwd=⇥Card=0⇥Grp=1⇥TZ=0000000000000000
 *
 * Mot so firmware day qua OPERLOG voi tien to `USER ` dau dong — bo tien to do truoc khi doc.
 * Khoa doc KHONG PHAN BIET HOA THUONG (USERINFO viet hoa, rtlog viet thuong).
 */
export function doc_userinfo(body: string): { nguoi_dung: NguoiDungMay[]; so_dong_loi: number } {
  const nguoi_dung: NguoiDungMay[] = [];
  let so_dong_loi = 0;
  if (typeof body !== 'string' || body.trim().length === 0) return { nguoi_dung, so_dong_loi };

  for (const raw of body.split('\n')) {
    let dong = raw.replace(/\r$/, '').trim();
    if (dong.length === 0) continue;
    // Bo tien to loai ban ghi neu co: "USER PIN=..." / "USERINFO PIN=...".
    dong = dong.replace(/^(USERINFO|USER|OPLOG)\s+/i, '');

    const o: Record<string, string> = {};
    for (const token of dong.split('\t')) {
      const vt = token.indexOf('=');
      if (vt <= 0) continue;
      o[token.slice(0, vt).trim().toLowerCase()] = token.slice(vt + 1).trim();
    }

    const pin = (o['pin'] ?? '').trim();
    if (pin === '' || pin === '0' || pin.length > 32) {
      // Dong khong co PIN hop le. Neu khong co cap khoa=gia tri nao thi tinh la dong loi.
      if (Object.keys(o).length === 0) so_dong_loi++;
      continue;
    }
    // Ten truong khac nhau theo dong may: att dung Card/Pri, acc (kiem soat ra vao)
    // dung CardNo/Privilege. Doc ca hai de mot parser phuc vu duoc ca hai dong.
    const ten = (o['name'] ?? '').trim();
    const the = (o['card'] ?? o['cardno'] ?? '').trim();
    nguoi_dung.push({
      pin,
      ten: ten === '' ? null : ten.slice(0, 100),
      the: the === '' || the === '0' ? null : the.slice(0, 40),
      quyen: so_nguyen(o['pri'] ?? o['privilege'], 0, 0, 255),
    });
  }
  return { nguoi_dung, so_dong_loi };
}

function so_nguyen(gia_tri: string | undefined, mac_dinh: number, min: number, max: number): number {
  if (gia_tri === undefined) return mac_dinh;
  const n = Number.parseInt(gia_tri.trim(), 10);
  if (!Number.isInteger(n) || n < min || n > max) return mac_dinh;
  return n;
}

export interface KetQuaLenh {
  id: number;
  ma_tra_ve: number;
  lenh: string;
}

/** Parse body devicecmd. May co the gop nhieu dong: "ID=1&Return=0&CMD=INFO". */
export function doc_ket_qua_lenh(body: string): KetQuaLenh[] {
  const kq: KetQuaLenh[] = [];
  if (typeof body !== 'string' || body.trim().length === 0) return kq;

  for (const raw of body.split('\n')) {
    const dong = raw.replace(/\r$/, '').trim();
    if (dong.length === 0) continue;

    let id = 0;
    let ma_tra_ve = -1;
    let lenh = '';
    for (const cap of dong.split('&')) {
      const vt = cap.indexOf('=');
      if (vt <= 0) continue;
      const khoa = cap.slice(0, vt).trim().toUpperCase();
      const gt = cap.slice(vt + 1).trim();
      if (khoa === 'ID') id = Number.parseInt(gt, 10) || 0;
      else if (khoa === 'RETURN') ma_tra_ve = Number.parseInt(gt, 10);
      else if (khoa === 'CMD') lenh = gt;
    }
    if (id > 0) kq.push({ id, ma_tra_ve: Number.isInteger(ma_tra_ve) ? ma_tra_ve : -1, lenh });
  }
  return kq;
}

/**
 * Parse body dang ky / thong tin thiet bi: cac cap key=value phan tach bang dau phay,
 * key co the co tien to '~'.
 * VD: "DeviceType=acc,~DeviceName=SpeedFace,FirmVer=Ver 8.0.4,IPAddress=192.168.1.50"
 */
export function doc_thong_tin_may(body: string): Record<string, string> {
  const map: Record<string, string> = {};
  if (typeof body !== 'string' || body.trim().length === 0) return map;

  for (const token of body.replace(/\n/g, ',').split(',')) {
    const vt = token.indexOf('=');
    if (vt <= 0) continue;
    const khoa = token.slice(0, vt).trim().replace(/^~+/, '');
    if (khoa.length === 0) continue;
    map[khoa.toLowerCase()] = token.slice(vt + 1).trim();
  }
  return map;
}

/**
 * Dung block cau hinh tra cho may khi handshake (GET /iclock/cdata?options=all).
 * Realtime=1 de may day ngay khi co quet thay vi cho theo chu ky.
 * Stamp=None yeu cau may gui lai toan bo ban ghi chua dong bo (ta co chong trung).
 */
export function dung_phan_hoi_handshake(serial: string, offset_gio: number): string {
  return [
    `GET OPTION FROM: ${serial}`,
    'ATTLOGStamp=None',
    'OPERLOGStamp=None',
    'ATTPHOTOStamp=None',
    'ErrorDelay=30',
    'Delay=10',
    'TransTimes=00:00;23:59',
    'TransInterval=1',
    'TransFlag=1111000000',
    `TimeZone=${offset_gio}`,
    'Realtime=1',
    'Encrypt=0',
  ].join('\n') + '\n';
}

/** Dinh dang lenh tra cho may khi no poll getrequest: "C:<ID>:<CMD>". */
export function dinh_dang_lenh(id: number, lenh: string): string {
  return `C:${id}:${lenh}\n`;
}

/**
 * Lenh dong bo dong ho may theo gio server (chong lech gio lam sai cong).
 *
 * ZKTeco PUSH SDK khong nhan chuoi ngay thang thong thuong o day — DateTime phai la
 * so nguyen ma hoa theo cong thuc cua hang:
 *   ((nam-2000)*12*31 + (thang-1)*31 + (ngay-1)) * 86400 + gio*3600 + phut*60 + giay
 */
export function ma_hoa_thoi_gian_zkteco(d: Date, offset_ms: number): number {
  const t = new Date(d.getTime() + offset_ms);
  const nam = t.getUTCFullYear();
  const thang = t.getUTCMonth() + 1;
  const ngay = t.getUTCDate();
  return (
    ((nam - 2000) * 12 * 31 + (thang - 1) * 31 + (ngay - 1)) * 86400
    + t.getUTCHours() * 3600
    + t.getUTCMinutes() * 60
    + t.getUTCSeconds()
  );
}

export function lenh_dong_bo_gio(bay_gio: Date, offset_ms: number): string {
  return `SET OPTION DateTime=${ma_hoa_thoi_gian_zkteco(bay_gio, offset_ms)}`;
}
