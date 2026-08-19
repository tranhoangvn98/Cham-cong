// Nghiep vu tiep nhan ATTLOG tu may: chong trung -> map PIN sang nhan vien -> luu
// -> ghi su kien -> tinh lai bang cong ngay bi anh huong.
import { trong_giao_dich, truy_van } from '../csdl/ket_noi.ts';
import { ghi_su_kien } from '../su_kien/hop_thu_di.ts';
import { tinh_lai_nhieu } from '../cong/tinh_cong.ts';
import { ngay_dia_phuong } from '../tien_ich/thoi_gian.ts';
import { doc_attlog, doc_rtlog, nhan_cach_xac_thuc, type BanGhiAttlog } from './giao_thuc.ts';

export interface KetQuaTiepNhan {
  tong: number;
  da_nhan: number;
  trung: number;
  dong_loi: number;
  chua_map_pin: string[];
}

/**
 * Tiep nhan mot lo ATTLOG tu may.
 *
 * Chong trung dua vao rang buoc UNIQUE tren khoa_chong_trung + `on conflict do nothing`,
 * KHONG dung "select truoc roi insert" — hai lo den cung luc se lot qua khe do.
 */
export async function tiep_nhan_attlog(
  serial: string,
  body: string,
): Promise<KetQuaTiepNhan> {
  const { ban_ghi, so_dong_loi } = doc_attlog(body);
  return tiep_nhan_ban_ghi(serial, ban_ghi, so_dong_loi);
}

/**
 * Tiep nhan mot lo RTLOG — cung nghiep vu, chi khac cach doc than tin nhan.
 *
 * Firmware PUSH kiem soat ra vao day cham cong bang `table=rtlog` chu khong phai ATTLOG.
 * Truoc day nhanh do roi vao "bang khac, bo qua" nen moi lan quet deu bi vut di lang le:
 * may bao thanh cong, webapp khong co gi, va khong ai biet vi sao.
 */
export async function tiep_nhan_rtlog(
  serial: string,
  body: string,
): Promise<KetQuaTiepNhan> {
  const { ban_ghi, so_dong_loi } = doc_rtlog(body);
  return tiep_nhan_ban_ghi(serial, ban_ghi, so_dong_loi);
}

async function tiep_nhan_ban_ghi(
  serial: string,
  ban_ghi: BanGhiAttlog[],
  so_dong_loi: number,
): Promise<KetQuaTiepNhan> {
  const kq: KetQuaTiepNhan = {
    tong: ban_ghi.length,
    da_nhan: 0,
    trung: 0,
    dong_loi: so_dong_loi,
    chua_map_pin: [],
  };
  if (ban_ghi.length === 0) return kq;

  // Nap mot lan toan bo PIN -> nhan vien de khong truy van tung dong.
  const cac_pin = [...new Set(ban_ghi.map((b) => b.pin))];
  const theo_pin = await map_pin_nhan_vien(cac_pin);

  const ngay_can_tinh = new Set<string>();
  const chua_map = new Set<string>();

  for (const b of ban_ghi) {
    const nguoi = theo_pin.get(b.pin) ?? null;
    if (nguoi === null) chua_map.add(b.pin);

    const da_them = await luu_mot_lan_quet(serial, b, nguoi);
    if (da_them) {
      kq.da_nhan++;
      if (nguoi !== null) {
        ngay_can_tinh.add(`${nguoi.id}|${ngay_dia_phuong(b.thoi_diem)}`);
      }
    } else {
      kq.trung++;
    }
  }

  kq.chua_map_pin = [...chua_map];

  // Tinh lai bang cong SAU khi da luu xong toan lo — tranh tinh lai nhieu lan mot ngay.
  await tinh_lai_nhieu(
    [...ngay_can_tinh].map((k) => {
      const [nhan_vien_id, ngay] = k.split('|') as [string, string];
      return { nhan_vien_id, ngay };
    }),
  );

  return kq;
}

interface NguoiMap {
  id: string;
  ma_nv: string;
  ma_erp: string | null;
}

/**
 * PIN may -> nhan vien. BANG MA DINH DANH TRUOC, cot `nhan_vien.pin_may` sau.
 *
 * VI SAO HAI NGUON: bang `ma_dinh_danh` la nguon su that ve ma, nhung cot `pin_may` van la thu
 * ma nhan su go tay tren form ho so va la thu di tru 025 backfill tu. Doc CA HAI roi uu tien
 * bang thi:
 *
 *   - Mot nguoi co PIN o HAI MAY chay dung — cot chi chua duoc mot ma, bang thi chua ca hai.
 *   - Chuyen PIN sang nguoi moi qua trang ma dinh danh co hieu luc NGAY, khong cho ai nho di
 *     sua cot.
 *   - Va khong the MAT khop so voi truoc: cot van duoc doc, chi la doc sau.
 *
 * Hai ben noi khac nhau la trieu chung, khong phai chuyen binh thuong — ghi log canh bao de no
 * len duoc bao cao doi soat thay vi im lang.
 */
export async function map_pin_nhan_vien(cac_pin: string[]): Promise<Map<string, NguoiMap>> {
  if (cac_pin.length === 0) return new Map();
  const ds = await truy_van<{
    pin: string; id: string; ma_nv: string; ma_erp: string | null; nguon: string;
  }>(
    `with pin as (select unnest($1::text[]) as pin)
     select p.pin, nv.id, nv.ma_nv, nv.ma_erp, 'bang' as nguon
       from pin p
       join ma_dinh_danh md on md.he_thong = 'may_cham_cong'
                           and md.ma_chuan = p.pin and md.hieu_luc_den is null
       join nhan_vien nv on nv.id = md.nhan_vien_id and nv.dang_hoat_dong = true
     union all
     select p.pin, nv.id, nv.ma_nv, nv.ma_erp, 'cot' as nguon
       from pin p
       join nhan_vien nv on nv.pin_may = p.pin and nv.dang_hoat_dong = true`,
    [cac_pin],
  );

  const tu_bang = new Map<string, NguoiMap>();
  const tu_cot = new Map<string, NguoiMap>();
  for (const d of ds) {
    (d.nguon === 'bang' ? tu_bang : tu_cot).set(
      d.pin, { id: d.id, ma_nv: d.ma_nv, ma_erp: d.ma_erp });
  }

  const ra = new Map<string, NguoiMap>();
  for (const pin of new Set([...tu_bang.keys(), ...tu_cot.keys()])) {
    const b = tu_bang.get(pin);
    const c = tu_cot.get(pin);
    if (b !== undefined && c !== undefined && b.id !== c.id) {
      console.warn(
        `[adms] PIN ${pin}: bang dinh danh noi ${b.ma_nv}, cot pin_may noi ${c.ma_nv}. `
        + 'Dung bang. Chay doi soat ma dinh danh de biet vi sao lech.',
      );
    }
    const nguoi = b ?? c;
    if (nguoi !== undefined) ra.set(pin, nguoi);
  }
  return ra;
}

/** Tra ve true neu ban ghi duoc them moi, false neu da ton tai (trung). */
async function luu_mot_lan_quet(
  serial: string,
  b: BanGhiAttlog,
  nguoi: NguoiMap | null,
): Promise<boolean> {
  const khoa = khoa_chong_trung(serial, b);

  return trong_giao_dich(async (khach) => {
    const kq = await khach.query<{ id: string }>(
      `insert into lan_quet
         (nguon, thiet_bi_serial, pin_may, nhan_vien_id, thoi_diem,
          trang_thai, xac_thuc, ma_cong_viec, khoa_chong_trung, trang_thai_duyet)
       values ('may', $1, $2, $3, $4, $5, $6, $7, $8, 'tu_dong')
       on conflict (khoa_chong_trung) do nothing
       returning id`,
      [serial, b.pin, nguoi?.id ?? null, b.thoi_diem,
        b.trang_thai, b.xac_thuc, b.ma_cong_viec, khoa],
    );

    const dong = kq.rows[0];
    if (dong === undefined) return false; // trung

    if (nguoi !== null) {
      await ghi_su_kien('lan_quet.da_ghi', {
        lan_quet_id: dong.id,
        nguon: 'may',
        thiet_bi_serial: serial,
        nhan_vien_id: nguoi.id,
        ma_nv: nguoi.ma_nv,
        ma_erp: nguoi.ma_erp,
        thoi_diem: b.thoi_diem.toISOString(),
        trang_thai: b.trang_thai,
        cach_xac_thuc: nhan_cach_xac_thuc(b.xac_thuc),
        ma_cong_viec: b.ma_cong_viec,
      }, khach);
    }
    return true;
  });
}

/** Mot may + PIN + moc thoi gian + trang thai la duy nhat. */
export function khoa_chong_trung(serial: string, b: BanGhiAttlog): string {
  const t = b.thoi_diem.toISOString().slice(0, 19).replace(/[-:T]/g, '');
  return `may|${serial}|${b.pin}|${t}|${b.trang_thai}`;
}
