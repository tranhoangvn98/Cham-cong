// Sinh phieu luong CNY cho nhom nhan su che_do_luong = 'tq'.
//
// Tach hoan toan khoi tinh_ky_luong (VND): nhom nay tra bang CNY, KHONG BHXH/thue TNCN Viet Nam.
// Cong thuc theo cong y het VND:  luong theo cong = (luong co ban + phu cap) x (cong thuc / cong chuan)
// Dung CHUNG cham cong (bang_cong_ngay) va CHUNG quy tac cong chuan (ke ca thu Bay nua cong).
import { truy_van, trong_giao_dich } from '../csdl/ket_noi.ts';
import { khoang_thang } from '../tien_ich/thoi_gian.ts';
import {
  HE_SO_T7_NUA_CONG, ngay_cong_chuan, tham_so_cho_thang,
} from './ky_luong.ts';

/** Lam tron ve 2 chu so thap phan (CNY co jiao/fen). */
function cny(n: number): number {
  return Math.round(n * 100) / 100;
}

interface DongNhanVienCny {
  nhan_vien_id: string;
  luong_co_ban: number;
  phu_cap: number;
  cac_ngay_lam: number[];
  so_cong: number;
  lich_nghi_ma: string;
}

/**
 * Tinh lai toan bo phieu luong CNY cua mot ky.
 *
 * GIU LAI phan nguoi sua tay (thuong, phu_cap_khac, tru_khac, ghi_chu) — giong tinh_ky_luong VND.
 * Tra ve so phieu da tinh.
 */
export async function tinh_ky_luong_cny(ky_luong_id: string, thang: string): Promise<number> {
  const ts = await tham_so_cho_thang(thang);
  if (ts === null) {
    throw new Error(`Chưa khai tham số lương có hiệu lực cho tháng ${thang}.`);
  }
  const { tu, den } = khoang_thang(thang);
  const he_so_t7 = ts.cs.t7_nua_cong ? HE_SO_T7_NUA_CONG : 1;

  // Ngay le theo tung lich (giong tinh_ky_luong).
  const le = await truy_van<{ ngay: string; lich_ma: string }>(
    `select to_char(ngay, 'YYYY-MM-DD') as ngay, lich_ma from ngay_le
      where ngay >= $1 and ngay <= $2`,
    [tu, den],
  );
  const le_theo_lich = new Map<string, Set<string>>();
  for (const r of le) {
    const s = le_theo_lich.get(r.lich_ma) ?? new Set<string>();
    s.add(r.ngay);
    le_theo_lich.set(r.lich_ma, s);
  }
  const le_cua = (lich: string): Set<string> => le_theo_lich.get(lich) ?? new Set<string>();

  // Nhan su che_do_luong = 'tq': muc luong CNY theo quyet_dinh_luong_cny moi nhat co hieu luc;
  // cong thuc = tong so_cong (KHONG nhan he so thu Bay — so_cong da phan anh nua ngay; he so thu
  // Bay chi cho cong chuan, nhu ben VND).
  const ds = await truy_van<DongNhanVienCny>(
    `select nv.id                                            as nhan_vien_id,
            coalesce(ql.luong_co_ban, 0)::float8                  as luong_co_ban,
            coalesce(ql.phu_cap, 0)::float8                       as phu_cap,
            coalesce(cl.cac_ngay_lam, '{1,2,3,4,5}')             as cac_ngay_lam,
            coalesce(bc.so_cong, 0)::float8                       as so_cong,
            coalesce(nlv.lich_nghi_ma, 'vn')                     as lich_nghi_ma
       from nhan_vien nv
       left join ca_lam cl on cl.id = nv.ca_lam_id
       left join noi_lam_viec nlv on nlv.id = nv.noi_lam_viec_id
       left join lateral (
         select luong_co_ban, phu_cap from quyet_dinh_luong_cny
          where nhan_vien_id = nv.id and hieu_luc_tu <= $2
          order by hieu_luc_tu desc limit 1
       ) ql on true
       left join lateral (
         select coalesce(sum(so_cong), 0) as so_cong
           from bang_cong_ngay
          where nhan_vien_id = nv.id and ngay >= $1 and ngay <= $2
       ) bc on true
      where nv.dang_hoat_dong = true and nv.che_do_luong = 'tq'
      order by nv.ma_nv`,
    [tu, den],
  );

  await trong_giao_dich(async (khach) => {
    for (const nv of ds) {
      const chuan = ts.cs.cong_chuan_thang > 0
        ? ts.cs.cong_chuan_thang
        : ngay_cong_chuan(tu, den, nv.cac_ngay_lam, le_cua(nv.lich_nghi_ma), he_so_t7);

      // Giu lai dieu chinh tay cua nguoi dung.
      const cu = await khach.query<{
        id: string; thuong: string; phu_cap_khac: string; tru_khac: string;
      }>(
        `select id, thuong, phu_cap_khac, tru_khac
           from phieu_luong_cny where ky_luong_id = $1 and nhan_vien_id = $2`,
        [ky_luong_id, nv.nhan_vien_id],
      );
      const phieu_cu = cu.rows[0];
      const thuong = Number(phieu_cu?.thuong ?? 0);
      const phu_cap_khac = Number(phieu_cu?.phu_cap_khac ?? 0);
      const tru_khac = Number(phieu_cu?.tru_khac ?? 0);

      const luong_theo_cong = chuan <= 0
        ? 0
        : cny((nv.luong_co_ban + nv.phu_cap) * (nv.so_cong / chuan));
      const tong_thu_nhap = cny(luong_theo_cong + thuong + phu_cap_khac);
      const thuc_linh = cny(tong_thu_nhap - tru_khac);

      await khach.query(
        `insert into phieu_luong_cny
           (ky_luong_id, nhan_vien_id, luong_co_ban, phu_cap, so_ngay_cong_chuan,
            so_ngay_cong_thuc, luong_theo_cong, thuong, phu_cap_khac, tru_khac,
            tong_thu_nhap, thuc_linh, tinh_luc)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, now())
         on conflict (ky_luong_id, nhan_vien_id) do update set
           luong_co_ban = excluded.luong_co_ban, phu_cap = excluded.phu_cap,
           so_ngay_cong_chuan = excluded.so_ngay_cong_chuan,
           so_ngay_cong_thuc = excluded.so_ngay_cong_thuc,
           luong_theo_cong = excluded.luong_theo_cong,
           tong_thu_nhap = excluded.tong_thu_nhap, thuc_linh = excluded.thuc_linh,
           tinh_luc = now()`,
        [
          ky_luong_id, nv.nhan_vien_id, nv.luong_co_ban, nv.phu_cap, chuan,
          nv.so_cong, luong_theo_cong, thuong, phu_cap_khac, tru_khac,
          tong_thu_nhap, thuc_linh,
        ],
      );
    }
  });

  return ds.length;
}
