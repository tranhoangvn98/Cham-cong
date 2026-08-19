// Sinh phieu luong cho ca mot ky tu du lieu cham cong da co.
//
// Tach khoi tuyen HTTP de kiem duoc bang CSDL that ma khong phai di qua route, va de
// lich chay dinh ky sau nay goi lai duoc.
import { truy_van, truy_van_mot, trong_giao_dich } from '../csdl/ket_noi.ts';
import { khoang_thang, danh_sach_ngay, thu_trong_tuan } from '../tien_ich/thoi_gian.ts';
import { tinh_phieu_luong, type BacThue, type ThamSoLuong } from './tinh_luong.ts';
import type { CachTinhKhoan, LoaiKhoan } from './khoan.ts';

/** Cach tra luong cua cong ty — khong phai tham so phap ly, nhung cung theo bo hieu luc. */
export interface ChinhSachTra {
  /** Cong chuan CO DINH cua thang. 0 = dem theo lich (so ngay lam viec that). */
  cong_chuan_thang: number;
  /** Lam tron thuc linh den boi so nay khi tra. 0 = khong lam tron. */
  lam_tron_den: number;
}

/** Tham so phap ly co hieu luc tai ngay dau cua ky. */
export async function tham_so_cho_thang(thang: string): Promise<
  { id: string; ts: ThamSoLuong; cs: ChinhSachTra } | null
> {
  const { tu } = khoang_thang(thang);
  const d = await truy_van_mot<Record<string, unknown>>(
    `select * from tham_so_luong
      where hieu_luc_tu <= $1
      order by hieu_luc_tu desc limit 1`,
    [tu],
  );
  if (d === null) return null;

  const bac = await truy_van<BacThue>(
    `select bac, tu_muc::float8 as tu_muc, den_muc::float8 as den_muc,
            thue_suat::float8 as thue_suat
       from bac_thue_tncn where tham_so_id = $1 order by bac`,
    [d['id']],
  );

  return {
    id: String(d['id']),
    cs: {
      cong_chuan_thang: Number(d['cong_chuan_thang'] ?? 0),
      lam_tron_den: Number(d['lam_tron_den'] ?? 0),
    },
    ts: {
      luong_co_so: Number(d['luong_co_so']),
      luong_toi_thieu_vung: Number(d['luong_toi_thieu_vung']),
      ty_le_bhxh_nld: Number(d['ty_le_bhxh_nld']),
      ty_le_bhyt_nld: Number(d['ty_le_bhyt_nld']),
      ty_le_bhtn_nld: Number(d['ty_le_bhtn_nld']),
      ty_le_bhxh_nsdld: Number(d['ty_le_bhxh_nsdld']),
      ty_le_bhyt_nsdld: Number(d['ty_le_bhyt_nsdld']),
      ty_le_bhtn_nsdld: Number(d['ty_le_bhtn_nsdld']),
      giam_tru_ban_than: Number(d['giam_tru_ban_than']),
      giam_tru_phu_thuoc: Number(d['giam_tru_phu_thuoc']),
      bac_thue: bac,
    },
  };
}

/**
 * So ngay cong CHUAN cua thang cho mot ca lam: dem ngay trong tuan thuoc `cac_ngay_lam`,
 * tru ngay le da khai.
 *
 * Dem theo lich that chu khong lay 26 ngay co dinh: thang 28 ngay va thang 31 ngay co so
 * ngay lam viec khac nhau, dung mot con so chung la sai luong theo cong.
 */
export function ngay_cong_chuan(
  tu: string,
  den: string,
  cac_ngay_lam: number[],
  ngay_le: Set<string>,
): number {
  let so = 0;
  for (const ng of danh_sach_ngay(tu, den)) {
    if (ngay_le.has(ng)) continue;
    if (cac_ngay_lam.includes(thu_trong_tuan(ng))) so++;
  }
  return so;
}

interface DongNhanVien {
  nhan_vien_id: string;
  luong_co_ban: number;
  phu_cap: number;
  cac_ngay_lam: number[];
  so_cong: number;
  phut_ot: number;
  so_nguoi_phu_thuoc: number;
  loai_hop_dong: string | null;
}

/**
 * Tinh lai toan bo phieu luong cua mot ky.
 *
 * GIU LAI phan nguoi sua tay (thuong, tru khac, ghi chu): tinh lai vi cham cong doi thi
 * khong duoc phep xoa mat khoan thuong ke toan da nhap. Muon bo thi sua ve 0 bang tay.
 *
 * Tra ve so phieu da tinh.
 */
export async function tinh_ky_luong(ky_luong_id: string, thang: string): Promise<number> {
  const ts = await tham_so_cho_thang(thang);
  if (ts === null) {
    throw new Error(`Chưa khai tham số lương có hiệu lực cho tháng ${thang}.`);
  }
  const { tu, den } = khoang_thang(thang);

  const le = await truy_van<{ ngay: string }>(
    `select to_char(ngay, 'YYYY-MM-DD') as ngay from ngay_le
      where ngay >= $1 and ngay <= $2`,
    [tu, den],
  );
  const ngay_le = new Set(le.map((r) => r.ngay));

  // Muc luong: uu tien quyet dinh luong moi nhat co hieu luc trong/truoc ky; khong co thi
  // lay luong ghi trong hop dong dang hieu luc.
  const ds = await truy_van<DongNhanVien>(
    `select nv.id                                            as nhan_vien_id,
            coalesce(ql.luong_co_ban, hd.luong_co_ban, 0)::float8  as luong_co_ban,
            coalesce(ql.phu_cap, 0)::float8                        as phu_cap,
            coalesce(cl.cac_ngay_lam, '{1,2,3,4,5}')               as cac_ngay_lam,
            coalesce(bc.so_cong, 0)::float8                        as so_cong,
            coalesce(bc.phut_ot, 0)::int                           as phut_ot,
            coalesce(pt.so_nguoi, 0)::int                          as so_nguoi_phu_thuoc,
            hd.loai                                               as loai_hop_dong
       from nhan_vien nv
       left join ca_lam cl on cl.id = nv.ca_lam_id
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
       left join lateral (
         select sum(so_cong) as so_cong, sum(phut_ot) as phut_ot
           from bang_cong_ngay
          where nhan_vien_id = nv.id and ngay >= $1 and ngay <= $2
       ) bc on true
       left join lateral (
         select count(*) as so_nguoi from nguoi_phu_thuoc
          where nhan_vien_id = nv.id and da_dang_ky = true
            and (tu_thang is null or tu_thang <= $2)
            and (den_thang is null or den_thang >= $1)
       ) pt on true
      where nv.dang_hoat_dong = true
      order by nv.ma_nv`,
    [tu, den],
  );

  await trong_giao_dich(async (khach) => {
    for (const nv of ds) {
      // Cong chuan CO DINH neu cong ty da khai; khong khai thi dem theo lich that.
      const chuan = ts.cs.cong_chuan_thang > 0
        ? ts.cs.cong_chuan_thang
        : ngay_cong_chuan(tu, den, nv.cac_ngay_lam, ngay_le);

      // Doc lai phan nguoi da sua tay de khong ghi de len.
      const cu = await khach.query<{
        id: string; thuong: string; phu_cap_khac: string; tru_khac: string;
      }>(
        'select id, thuong, phu_cap_khac, tru_khac from phieu_luong where ky_luong_id = $1 and nhan_vien_id = $2',
        [ky_luong_id, nv.nhan_vien_id],
      );
      const phieu_cu = cu.rows[0];
      const thuong = Number(phieu_cu?.thuong ?? 0);
      const phu_cap_khac = Number(phieu_cu?.phu_cap_khac ?? 0);
      const tru_khac = Number(phieu_cu?.tru_khac ?? 0);

      // Cac khoan cung la phan nguoi nhap tay: doc lai theo phieu cu, gop voi dac ta trong
      // danh muc de biet cach tinh. Khoan da tat trong danh muc (`dang_dung = false`) van
      // giu lai o phieu da co — tat mot khoan la de khong THEM moi nua, khong phai de xoa
      // khoan da tinh cho nguoi ta.
      const khoan = phieu_cu === undefined ? [] : (await khach.query<{
        ma: string; loai: LoaiKhoan; cach_tinh: CachTinhKhoan;
        don_gia: string | null; don_gia_danh_muc: string | null;
        chiu_thue: boolean; so_luong: string | null; so_tien: string | null;
      }>(
        `select d.ma, d.loai, d.cach_tinh,
                k.don_gia, d.don_gia as don_gia_danh_muc, d.chiu_thue,
                k.so_luong, k.thanh_tien as so_tien
           from phieu_luong_khoan k
           join khoan_luong d on d.ma = k.khoan_ma
          where k.phieu_luong_id = $1
          order by d.thu_tu, k.khoan_ma`,
        [phieu_cu.id],
      )).rows.map((r) => ({
        ma: r.ma,
        loai: r.loai,
        cach_tinh: r.cach_tinh,
        don_gia: r.don_gia === null ? null : Number(r.don_gia),
        don_gia_danh_muc: r.don_gia_danh_muc === null ? null : Number(r.don_gia_danh_muc),
        chiu_thue: r.chiu_thue,
        so_luong: r.so_luong === null ? null : Number(r.so_luong),
        so_tien: r.so_tien === null ? null : Number(r.so_tien),
      }));

      const kq = tinh_phieu_luong({
        luong_co_ban: nv.luong_co_ban,
        phu_cap: nv.phu_cap,
        so_ngay_cong_chuan: chuan,
        so_ngay_cong_thuc: nv.so_cong,
        phut_ot: nv.phut_ot,
        he_so_ot: 1.5,
        thuong,
        phu_cap_khac,
        so_nguoi_phu_thuoc: nv.so_nguoi_phu_thuoc,
        tru_khac,
        khoan,
        lam_tron_den: ts.cs.lam_tron_den,
      }, ts.ts);

      const ghi = await khach.query<{ id: string }>(
        `insert into phieu_luong (
           ky_luong_id, nhan_vien_id, luong_co_ban, phu_cap,
           so_ngay_cong_chuan, so_ngay_cong_thuc, phut_ot, he_so_ot,
           luong_theo_cong, tien_ot, thuong, phu_cap_khac, tong_thu_nhap,
           muc_dong_bh, bhxh_nld, bhyt_nld, bhtn_nld,
           bhxh_nsdld, bhyt_nsdld, bhtn_nsdld,
           so_nguoi_phu_thuoc, giam_tru_tong, thu_nhap_tinh_thue, thue_tncn,
           tru_khac, tong_tru, thuc_linh,
           luong_ngay, khoan_thu_nhap, khoan_tru, thu_nhap_mien_thue,
           thuc_linh_lam_tron, loai_hop_dong, tinh_luc
         ) values (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
           $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33, now()
         )
         on conflict (ky_luong_id, nhan_vien_id) do update set
           luong_co_ban = excluded.luong_co_ban, phu_cap = excluded.phu_cap,
           so_ngay_cong_chuan = excluded.so_ngay_cong_chuan,
           so_ngay_cong_thuc = excluded.so_ngay_cong_thuc,
           phut_ot = excluded.phut_ot, he_so_ot = excluded.he_so_ot,
           luong_theo_cong = excluded.luong_theo_cong, tien_ot = excluded.tien_ot,
           tong_thu_nhap = excluded.tong_thu_nhap, muc_dong_bh = excluded.muc_dong_bh,
           bhxh_nld = excluded.bhxh_nld, bhyt_nld = excluded.bhyt_nld,
           bhtn_nld = excluded.bhtn_nld, bhxh_nsdld = excluded.bhxh_nsdld,
           bhyt_nsdld = excluded.bhyt_nsdld, bhtn_nsdld = excluded.bhtn_nsdld,
           so_nguoi_phu_thuoc = excluded.so_nguoi_phu_thuoc,
           giam_tru_tong = excluded.giam_tru_tong,
           thu_nhap_tinh_thue = excluded.thu_nhap_tinh_thue,
           thue_tncn = excluded.thue_tncn, tong_tru = excluded.tong_tru,
           thuc_linh = excluded.thuc_linh,
           luong_ngay = excluded.luong_ngay,
           khoan_thu_nhap = excluded.khoan_thu_nhap, khoan_tru = excluded.khoan_tru,
           thu_nhap_mien_thue = excluded.thu_nhap_mien_thue,
           thuc_linh_lam_tron = excluded.thuc_linh_lam_tron,
           loai_hop_dong = excluded.loai_hop_dong, tinh_luc = now()
         returning id`,
        [
          ky_luong_id, nv.nhan_vien_id, nv.luong_co_ban, nv.phu_cap,
          chuan, nv.so_cong, nv.phut_ot, 1.5,
          kq.luong_theo_cong, kq.tien_ot, thuong, phu_cap_khac, kq.tong_thu_nhap,
          kq.muc_dong_bh, kq.bhxh_nld, kq.bhyt_nld, kq.bhtn_nld,
          kq.bhxh_nsdld, kq.bhyt_nsdld, kq.bhtn_nsdld,
          nv.so_nguoi_phu_thuoc, kq.giam_tru_tong, kq.thu_nhap_tinh_thue, kq.thue_tncn,
          tru_khac, kq.tong_tru, kq.thuc_linh,
          kq.luong_ngay, kq.khoan_thu_nhap, kq.khoan_tru, kq.thu_nhap_mien_thue,
          kq.thuc_linh_lam_tron, nv.loai_hop_dong,
        ],
      );

      // Ghi lai so tien tung khoan. Cac khoan tinh theo cong thuc (`so_luong_x_don_gia`,
      // `nua_ngay_luong`) doi so khi cham cong doi hoac khi luong doi, nen phai ghi lai —
      // de nguyen la de phieu va tong cua no lech nhau.
      for (const k of kq.cac_khoan) {
        await khach.query(
          `update phieu_luong_khoan set don_gia = $3, thanh_tien = $4
            where phieu_luong_id = $1 and khoan_ma = $2`,
          [ghi.rows[0]!.id, k.ma, k.don_gia, k.thanh_tien],
        );
      }
    }

    await khach.query(
      'update ky_luong set tham_so_id = $2, cap_nhat_luc = now() where id = $1',
      [ky_luong_id, ts.id],
    );
  });

  return ds.length;
}
