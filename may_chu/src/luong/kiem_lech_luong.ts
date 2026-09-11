// YC-2 — Canh bao LECH LUONG truoc khi chot.
//
// "Lech luong" = muc luong CO BAN da chup vao phieu luong (phieu_luong.luong_co_ban / phu_cap)
// khong con khop voi QUYET DINH LUONG dang hieu luc cua nguoi do tai ky. Xay ra khi:
//   - Ai do sua quyet_dinh_luong SAU khi da tinh ky ma CHUA bam "Tinh lai".
//   - Phieu duoc go tay luong co ban lech khoi quyet dinh.
//   - Nguoi moi co quyet dinh luong nhung phieu tinh truoc do bang luong hop dong cu.
//
// Kiem tra o day chi doi chieu PHAN LUONG CUNG (co ban + phu cap) — dung dung quy tac ma
// `tinh_ky_luong` dung de suy ra muc ap dung (uu tien quyet dinh luong, fallback hop dong,
// thu viec = 85%), roi so voi con so da chup trong phieu. Khong doi chieu thuong / tru khac /
// phu cap go tay: nhung khoan do CO Y do nguoi nhap, khong phai "lech".
import { truy_van } from '../csdl/ket_noi.ts';
import { khoang_thang } from '../tien_ich/thoi_gian.ts';
import { tham_so_cho_thang } from './ky_luong.ts';

/** Sai lech tren 1 dong (VND) moi coi la lech — bo qua chenh do lam tron numeric(14,2). */
const NGUONG_LECH = 1;

export interface DongLechLuong {
  ma_nv: string;
  ho_ten: string;
  /** Luong co ban da chup trong phieu. */
  phieu_base: number;
  phieu_phu_cap: number;
  /** Luong co ban KY VONG theo quyet dinh luong / hop dong dang hieu luc. */
  ky_vong_base: number;
  ky_vong_phu_cap: number;
  loai_hop_dong: string | null;
  /** Nguon suy ra muc ky vong: 'quyet_dinh' | 'hop_dong' | 'khong_co'. */
  nguon: 'quyet_dinh' | 'hop_dong' | 'khong_co';
}

interface DongDb {
  ma_nv: string;
  ho_ten: string;
  phieu_base: number;
  phieu_phu_cap: number;
  luong_ql: number | null;
  phu_cap_ql: number;
  luong_hd: number | null;
  loai_hop_dong: string | null;
}

/**
 * Danh sach nhan vien co luong co ban/phu cap trong phieu KHONG khop quyet dinh luong hien
 * hanh. Mang rong = khong lech, chot an toan.
 */
export async function lech_luong_ky(ky_luong_id: string, thang: string): Promise<DongLechLuong[]> {
  const cau_hinh = await tham_so_cho_thang(thang);
  const ty_le_thu_viec = cau_hinh?.cs.ty_le_thu_viec ?? 0.85;
  const { tu, den } = khoang_thang(thang);

  // Cung cac lateral join voi `tinh_ky_luong` — de "ky vong" o day va con so tinh that dung
  // chung mot nguon su that.
  const ds = await truy_van<DongDb>(
    `select nv.ma_nv, nv.ho_ten,
            pl.luong_co_ban::float8        as phieu_base,
            pl.phu_cap::float8             as phieu_phu_cap,
            ql.luong_co_ban::float8        as luong_ql,
            coalesce(ql.phu_cap, 0)::float8 as phu_cap_ql,
            hd.luong_co_ban::float8        as luong_hd,
            hd.loai                        as loai_hop_dong
       from phieu_luong pl
       join nhan_vien nv on nv.id = pl.nhan_vien_id
       left join lateral (
         select luong_co_ban, phu_cap from quyet_dinh_luong
          where nhan_vien_id = nv.id and hieu_luc_tu <= $2
          order by hieu_luc_tu desc limit 1
       ) ql on true
       left join lateral (
         select luong_co_ban, loai from hop_dong_lao_dong
          where nhan_vien_id = nv.id and trang_thai = 'hieu_luc'
            and hieu_luc_tu <= $2 and (hieu_luc_den is null or hieu_luc_den >= $1)
          order by hieu_luc_tu desc limit 1
       ) hd on true
      where pl.ky_luong_id = $1
      order by nv.ma_nv`,
    [ky_luong_id, den, tu],
  );

  const ket: DongLechLuong[] = [];
  for (const d of ds) {
    // Suy muc ky vong y het `tinh_ky_luong`: uu tien quyet dinh, fallback hop dong; thu viec
    // ghi de bang luong hop dong neu co, con lai la 85% luong cung.
    const official_base = d.luong_ql ?? d.luong_hd ?? 0;
    const official_pc = d.phu_cap_ql;
    let ky_vong_base = official_base;
    let ky_vong_pc = official_pc;
    if (d.loai_hop_dong === 'thu_viec') {
      if (d.luong_hd !== null) {
        ky_vong_base = d.luong_hd;
        ky_vong_pc = official_pc;
      } else {
        ky_vong_base = Math.round(official_base * ty_le_thu_viec);
        ky_vong_pc = Math.round(official_pc * ty_le_thu_viec);
      }
    }

    const lech = Math.abs(d.phieu_base - ky_vong_base) > NGUONG_LECH
      || Math.abs(d.phieu_phu_cap - ky_vong_pc) > NGUONG_LECH;
    if (!lech) continue;

    ket.push({
      ma_nv: d.ma_nv,
      ho_ten: d.ho_ten,
      phieu_base: d.phieu_base,
      phieu_phu_cap: d.phieu_phu_cap,
      ky_vong_base,
      ky_vong_phu_cap: ky_vong_pc,
      loai_hop_dong: d.loai_hop_dong,
      nguon: d.luong_ql !== null ? 'quyet_dinh' : d.luong_hd !== null ? 'hop_dong' : 'khong_co',
    });
  }
  return ket;
}
