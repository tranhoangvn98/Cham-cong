// Dong bo du lieu giua cac may cham cong (ZAM70 da kiem chung 10/2026).
//
// - Cap may VP (cong vao / cong ra) dong bo CHO NHAU: moi khi may day su kien moi (OPLOG) va
//   mot lan doi chieu day du luc 07:30 moi sang. Chieu di: THEM user + template (khuon mat,
//   van tay) may nay co ma may kia thieu — khong bao gio XOA.
// - Nguoi da nghi viec bi KHOA tren MOI may dang bat (xoa user tren may), kem XAC NHAN ket
//   qua lenh (ma_tra_ve + hoi lai may) de biet da thanh cong hay chua.
import { truy_van, truy_van_mot, thuc_thi } from '../csdl/ket_noi.ts';
import { OFFSET_MAY_MS } from '../cau_hinh.ts';
import { cong_ngay, ngay_dia_phuong } from '../tien_ich/thoi_gian.ts';
import { chon_nguoi_da_nghi, tinh_thieu_giua_hai_may } from './dong_bo_may_thuan.ts';
import type { AnhChupMay, DongCanDay, DongSinhHoc } from './dong_bo_may_thuan.ts';
import type { DongTenMay } from '../dinh_danh/tra_ten_may.ts';

/** Cap may cham cong dong bo cho nhau — VP cong vao / cong ra (cung khong gian PIN). */
export const CAP_MAY_DONG_BO: readonly [string, string] = ['8116254600435', '8116254600440'];

/** Gio doi chieu hang ngay (gio may cham cong) — xem lich_chay.ts. */
export const GIO_DONG_BO_MAY = 7;

/** Cho may day anh chup sau lenh DATA QUERY (thuong duoi 15 giay). */
const CHO_MAY_DAY_MS = 45_000;
/** Cho may thuc thi lenh + bao ket qua (may hoi lenh moi ~10 giay). */
const CHO_LENH_XONG_MS = 90_000;
/** Chunk BIODATA thuoc cung MOT LAN day cach nhau toi da bay nhieu giay. */
const CUA_SO_ANH_CHUP_MS = 15_000;
/** Nguoi nghi it nhat bay nhieu ngay moi khoa tren may (cho HR kip sua neu cho NHAM). */
const CHO_NGHI_IT_NHAT_NGAY = 3;

const ngu = (ms: number): Promise<void> => new Promise((xong) => { setTimeout(xong, ms); });

type GhiLog = (s: string, ...t: unknown[]) => void;

/** Giong `xep_lenh` cua tuyen.ts nhung viet lai o day de khong import tuyen.ts (tranh vong lap module). */
async function xep_cuc_bo(serial: string, lenh: string, khoa: string | null): Promise<number> {
  // Lenh hoi danh sach user: danh dau de `tiep_nhan_userinfo` biet day la ANH CHUP DAY DU
  // (xoa dong user da bi xoa tren may) — giong xep_lenh cua tuyen.ts.
  const hoi_user = /DATA QUERY USERINFO/i.test(lenh) || /tablename=user\b/i.test(lenh);
  const dong = khoa === null
    ? await truy_van_mot<{ id: number }>(
      `insert into lenh_thiet_bi(thiet_bi_serial, lenh, hoi_userinfo_luc) values ($1, $2, $3)
       returning id`,
      [serial, lenh, hoi_user ? new Date() : null])
    : await truy_van_mot<{ id: number }>(
      `insert into lenh_thiet_bi(thiet_bi_serial, lenh, khoa_chong_trung, hoi_userinfo_luc)
       values ($1, $2, $3, $4)
       on conflict (khoa_chong_trung) where khoa_chong_trung is not null
       do nothing returning id`,
      [serial, lenh, khoa, hoi_user ? new Date() : null]);
  return dong?.id ?? 0;
}

/** Hoi may day lai anh chup (user + template sinh hoc). */
async function hoi_anh_chup(serial: string): Promise<void> {
  await xep_cuc_bo(serial, 'DATA QUERY USERINFO', null);
}

/**
 * Doc anh chup moi nhat cua mot may: user tu `may_nguoi_dung`, template tu cac chunk BIODATA
 * thuoc LAN DAY MOI NHAT (cach nhau vai giay) — chunk cu cua lan truoc khong lam nhieu.
 */
async function nap_anh_chup(serial: string): Promise<AnhChupMay> {
  const nguoi_dung: DongTenMay[] = await truy_van(
    `select pin, coalesce(ten_may, '') as ten_may from may_nguoi_dung
      where thiet_bi_serial = $1 order by pin::int`,
    [serial],
  );
  const cac_chunk = await truy_van<{ luc: string; noi_dung: string }>(
    `select luc, noi_dung from may_du_lieu_tho
      where thiet_bi_serial = $1 and bang like 'BIODATA#%' order by luc desc`,
    [serial],
  );
  const sinh_hoc: DongSinhHoc[] = [];
  const thay = new Set<string>();
  let moc_ms: number | null = null;
  for (const c of cac_chunk) {
    const luc_ms = new Date(c.luc).getTime();
    if (moc_ms === null) moc_ms = luc_ms;
    if (moc_ms - luc_ms > CUA_SO_ANH_CHUP_MS) break;
    for (const raw of c.noi_dung.split('\n')) {
      const d = raw.trim();
      if (d === '') continue;
      const pin = d.match(/Pin=(\d+)/)?.[1] ?? '';
      if (pin === '') continue;
      const tmp = d.match(/Tmp=(.*)$/)?.[1] ?? '';
      if (tmp === '') continue;
      const khoa = `${pin}|${d.match(/No=(\d+)/)?.[1] ?? ''}|${d.match(/Type=(\d+)/)?.[1] ?? ''}`;
      if (thay.has(khoa)) continue;
      thay.add(khoa);
      sinh_hoc.push({
        pin,
        no: d.match(/No=(\d+)/)?.[1] ?? '',
        type: d.match(/Type=(\d+)/)?.[1] ?? '',
        major: d.match(/MajorVer=(\d+)/)?.[1] ?? '',
        minor: d.match(/MinorVer=(\d+)/)?.[1] ?? '',
        tmp,
      });
    }
  }
  return { nguoi_dung, sinh_hoc };
}

/** Day mot nguoi (user + cac template thieu) sang may `den`. Tra so lenh da xep. */
async function day_mot_nguoi(den_serial: string, can: DongCanDay): Promise<number> {
  let so = 0;
  if (can.thieu_user) {
    const ten = can.ten_may.replace(/[^\x20-\x7E]/g, '?').slice(0, 24);
    const id = await xep_cuc_bo(
      den_serial,
      ['DATA UPDATE USERINFO', `PIN=${can.pin}`, `Name=${ten}`, 'Pri=0', 'Passwd=', 'Card=',
        'Grp=1', 'TZ=0000000000000000'].join('\t'),
      `ub:${den_serial}:${can.pin}`,
    );
    if (id > 0) so++;
  }
  for (const s of can.sinh_hoc) {
    const id = await xep_cuc_bo(
      den_serial,
      ['DATA UPDATE BIODATA', `Pin=${s.pin}`, `No=${s.no}`, 'Index=0', 'Valid=1', 'Duress=0',
        `Type=${s.type}`, `MajorVer=${s.major}`, `MinorVer=${s.minor}`, 'Format=0',
        `Tmp=${s.tmp}`].join('\t'),
      `bb:${den_serial}:${s.pin}:${s.no}:${s.type}`,
    );
    if (id > 0) so++;
  }
  return so;
}

/**
 * Dong bo hai chieu cap may VP. Tra so nguoi da day (khong tinh nguoi da day o luot truoc —
 * khoa chong trung cua lenh se chan).
 */
export async function dong_bo_giua_hai_may(ghi_log: GhiLog): Promise<number> {
  let tong = 0;
  const cac_cap: ReadonlyArray<readonly [string, string]> = [
    [CAP_MAY_DONG_BO[0], CAP_MAY_DONG_BO[1]],
    [CAP_MAY_DONG_BO[1], CAP_MAY_DONG_BO[0]],
  ];
  for (const [tu, den] of cac_cap) {
    const a = await nap_anh_chup(tu);
    const b = await nap_anh_chup(den);
    const can = tinh_thieu_giua_hai_may(a, b);
    let so_lenh = 0;
    for (const c of can) so_lenh += await day_mot_nguoi(den, c);
    if (can.length > 0) {
      ghi_log(`[lich] dong bo may: ${tu} -> ${den}: day ${can.length} nguoi, ${so_lenh} lenh`);
    }
    tong += can.length;
  }
  return tong;
}

/**
 * Khoa (xoa user) tren moi may dang bat nhung nguoi da nghi viec it nhat
 * `CHO_NGHI_IT_NHAT_NGAY` ngay. Bang chung chu nhan cua PIN la LICH SU QUET (lan quet gan nhat
 * cua PIN do tren chinh may do da map cho ai); chua co lich su quet thi lay nguoi giu PIN theo
 * mapping toan cuc — PIN van thuoc mot nguoi da nghi thi van phai don. PIN khong thuoc ai thi
 * giu nguyen (user ky thuat chua gan, xoa nham la mat khuon mat). Chu nhan con quet trong 3
 * ngay gan nhat thi cung giu (tien le cho nghi NHAM van di lam).
 * Tra danh sach da xep lenh khoa.
 */
export async function khoa_nguoi_da_nghi(
  ghi_log: GhiLog,
): Promise<{ serial: string; pin: string; ten_may: string }[]> {
  const hom_nay = ngay_dia_phuong(new Date());
  const moc_nghi = cong_ngay(hom_nay, -CHO_NGHI_IT_NHAT_NGAY);

  const nghi = await truy_van<{ id: string }>(
    `select id from nhan_vien
      where dang_hoat_dong = false and ngay_nghi_viec is not null and ngay_nghi_viec <= $1`,
    [moc_nghi],
  );
  const da_nghi = new Set(nghi.map((x) => x.id));
  const quet = await truy_van<{ id: string }>(
    `select distinct nhan_vien_id::text as id from lan_quet
      where nguon = 'may' and thoi_diem > now() - interval '3 days' and nhan_vien_id is not null`);
  const con_quet = new Set(quet.map((x) => x.id));

  // Chu nhan cua moi (serial, pin): nguoi ma lan quet GAN NHAT cua PIN do tren may do duoc
  // map sang. Day la bang chung dang tin nhat — he thong da tin nguoi do la nguoi quet PIN.
  const ls = await truy_van<{ serial: string; pin: string; id: string }>(
    `select distinct on (thiet_bi_serial, pin_may)
            thiet_bi_serial as serial, pin_may as pin, nhan_vien_id::text as id
       from lan_quet
      where nguon = 'may' and nhan_vien_id is not null
      order by thiet_bi_serial, pin_may, thoi_diem desc`);
  const chu_nhan = new Map<string, string>();
  for (const d of ls) chu_nhan.set(`${d.serial}|${d.pin}`, d.id);

  // Nguoi giu moi PIN theo mapping TOAN CUC — dung khi PIN chua tung quet tren may nay (xem
  // `chon_nguoi_da_nghi`). Chi lay dong dang MO: dong da dong la lich su, khong con hieu luc.
  const giu = await truy_van<{ pin: string; id: string }>(
    `select ma_chuan as pin, nhan_vien_id::text as id
       from ma_dinh_danh
      where he_thong = 'may_cham_cong' and hieu_luc_den is null
     union
     select pin_may as pin, id::text from nhan_vien
      where pin_may is not null and btrim(pin_may) <> ''`);
  const chu_pin = new Map<string, string>();
  for (const d of giu) chu_pin.set(d.pin, d.id);

  const cac_may = await truy_van<{ serial: string }>(
    'select serial from thiet_bi where dang_bat = true order by serial');
  const ra: { serial: string; pin: string; ten_may: string }[] = [];
  for (const { serial } of cac_may) {
    const dong = await truy_van<DongTenMay>(
      `select pin, coalesce(ten_may, '') as ten_may from may_nguoi_dung
        where thiet_bi_serial = $1`,
      [serial],
    );
    const chon = chon_nguoi_da_nghi(
      dong.map((d) => ({ ...d, serial })),
      chu_nhan,
      da_nghi,
      con_quet,
      chu_pin,
    );
    for (const c of chon) {
      const id = await xep_cuc_bo(serial, `DATA DELETE USERINFO PIN=${c.pin}`, `dx:${serial}:${c.pin}`);
      if (id > 0) {
        ra.push({ serial: c.serial, pin: c.pin, ten_may: c.ten_may });
        ghi_log(`[lich] dong bo may: khoa ${c.serial} PIN ${c.pin} (${c.ten_may})`);
      }
    }
  }
  return ra;
}

/**
 * Xac nhan ket qua sau khi day: hoi lai anh chup ca hai may roi so lai xem con thieu gi
 * khong, va kiem tra nguoi da khoa con tren may khong. Tra chuoi bao cao.
 */
export async function xac_nhan_dong_bo(
  da_khoa: { serial: string; pin: string }[],
  ghi_log: GhiLog,
): Promise<string> {
  await Promise.all(CAP_MAY_DONG_BO.map((s) => hoi_anh_chup(s)));
  await ngu(CHO_MAY_DAY_MS);

  const con_thieu: string[] = [];
  const cac_cap: ReadonlyArray<readonly [string, string]> = [
    [CAP_MAY_DONG_BO[0], CAP_MAY_DONG_BO[1]],
    [CAP_MAY_DONG_BO[1], CAP_MAY_DONG_BO[0]],
  ];
  for (const [tu, den] of cac_cap) {
    const a = await nap_anh_chup(tu);
    const b = await nap_anh_chup(den);
    const can = tinh_thieu_giua_hai_may(a, b);
    for (const c of can) con_thieu.push(`${tu}->${den}:PIN ${c.pin}`);
  }
  if (con_thieu.length > 0) {
    ghi_log(`[lich] dong bo may: CANH BAO sau khi day van con thieu ${con_thieu.length} muc: `
      + con_thieu.join(', '));
  }

  // Nguoi da khoa: khong duoc con trong anh chup moi nhat.
  const con_may: string[] = [];
  for (const k of da_khoa) {
    const dong = await truy_van_mot<{ pin: string }>(
      'select pin from may_nguoi_dung where thiet_bi_serial = $1 and pin = $2',
      [k.serial, k.pin],
    );
    if (dong !== null) con_may.push(`${k.serial}:PIN ${k.pin}`);
  }
  if (con_may.length > 0) {
    ghi_log(`[lich] dong bo may: CANH BAO khoa chua co hieu luc (con tren may): ${con_may.join(', ')}`);
  }

  return `con thieu ${con_thieu.length} muc, khoa chua hieu luc ${con_may.length} PIN`;
}

/**
 * Dong bo hang ngay (lich 07:00): hoi anh chup ca hai may, day nhung gi thieu cho nhau,
 * khoa nguoi da nghi, roi xac nhan ket qua. Tra chuoi bao cao de ghi vao nhat ky.
 */
export async function dong_bo_hang_ngay(ghi_log: GhiLog): Promise<string> {
  await thuc_thi(`delete from oplog_may where nhan_luc < now() - interval '90 days'`);

  await Promise.all(CAP_MAY_DONG_BO.map((s) => hoi_anh_chup(s)));
  await ngu(CHO_MAY_DAY_MS);

  const so_day = await dong_bo_giua_hai_may(ghi_log);
  const da_khoa = await khoa_nguoi_da_nghi(ghi_log);

  await ngu(CHO_LENH_XONG_MS);
  const xac_nhan = await xac_nhan_dong_bo(da_khoa, ghi_log);

  const tong_khoa = da_khoa.length;
  return `day ${so_day} nguoi, khoa ${tong_khoa} PIN (`
    + da_khoa.map((k) => `${k.serial}:${k.pin} ${k.ten_may}`).join(', ')
    + `); ${xac_nhan}`;
}

/**
 * Dong bo NGAY khi may day su kien moi (them user / enroll...): chi cho cap may VP, va moi
 * cap (may, PIN) chi chay mot lan trong 30 phut (khoa `dong_bo_enroll:*`).
 *
 * Goi tu tuyen.ts (fire-and-forget, khong chan request cua may).
 */
export async function dong_bo_sau_enroll(serial: string, pin: string, ghi_log: GhiLog = console.log): Promise<void> {
  if (!CAP_MAY_DONG_BO.includes(serial)) return;
  const den = serial === CAP_MAY_DONG_BO[0] ? CAP_MAY_DONG_BO[1] : CAP_MAY_DONG_BO[0];

  const luc = new Date(Date.now() + OFFSET_MAY_MS);
  const hom_nay = ngay_dia_phuong(new Date());
  const ma = `dong_bo_enroll:${serial}:${pin}:${hom_nay}:${luc.getUTCHours()}:${Math.floor(luc.getUTCMinutes() / 30)}`;
  const gianh = await thuc_thi(
    'insert into cong_viec_da_chay(ma_viec) values ($1) on conflict (ma_viec) do nothing',
    [ma],
  );
  if (gianh === 0) return;
  try {
    // Don khoa cu cung luc de bang khong phinh.
    await thuc_thi(
      `delete from cong_viec_da_chay
        where ma_viec like 'dong_bo_enroll:%' and chay_luc < now() - interval '7 days'`);

    await hoi_anh_chup(serial);
    await ngu(CHO_MAY_DAY_MS);
    const tu = await nap_anh_chup(serial);
    const denA = await nap_anh_chup(den);
    const can = tinh_thieu_giua_hai_may(tu, denA).filter((c) => c.pin === pin);
    let so_lenh = 0;
    for (const c of can) so_lenh += await day_mot_nguoi(den, c);

    await ngu(CHO_LENH_XONG_MS);
    await hoi_anh_chup(den);
    await ngu(CHO_MAY_DAY_MS);
    const sau = await nap_anh_chup(den);
    const con = tinh_thieu_giua_hai_may(tu, sau).filter((c) => c.pin === pin);

    if (so_lenh === 0 && con.length === 0) {
      await thuc_thi('update cong_viec_da_chay set ket_qua = $2 where ma_viec = $1',
        [ma, 'khong co gi thieu — bo qua']);
      return;
    }
    if (con.length === 0) {
      await thuc_thi('update cong_viec_da_chay set ket_qua = $2 where ma_viec = $1',
        [ma, `da dong bo PIN ${pin} (${so_lenh} lenh)`]);
      ghi_log(`[lich] dong bo may: enroll moi ${serial} PIN ${pin} da dong bo sang ${den} (${so_lenh} lenh)`);
      return;
    }
    await thuc_thi('delete from cong_viec_da_chay where ma_viec = $1', [ma]);
    ghi_log(`[lich] dong bo may: CANH BAO enroll ${serial} PIN ${pin} chua day duoc het (con ${con.length} muc)`);
  } catch (loi) {
    await thuc_thi('delete from cong_viec_da_chay where ma_viec = $1', [ma]);
    ghi_log(`[lich] dong bo may: LOI khi dong bo enroll ${serial} PIN ${pin}: ${(loi as Error).message}`);
  }
}
