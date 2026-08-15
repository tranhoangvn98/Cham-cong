// Tu phat hien vi pham tu du lieu cham cong da tinh.
//
// RANH GIOI PHAP LY: may chi ghi nhan o trang thai 'moi'. BLLD 2019 Dieu 122 doi ky luat
// phai co hop, nguoi lao dong duoc GIAI TRINH, phai lap bien ban. Khong co duong nao di
// thang tu "may phat hien" den "da ky luat", va tep nay khong bao gio tu dat trang thai
// khac 'moi'.
import { truy_van, trong_giao_dich } from '../csdl/ket_noi.ts';
import { khoang_thang } from '../tien_ich/thoi_gian.ts';

/** Chi so lay tu bang cong gop theo thang. Danh sach DONG, khop rang buoc check cua CSDL. */
const CHI_SO = [
  'so_lan_di_muon', 'tong_phut_muon', 'so_lan_ve_som', 'tong_phut_ve_som',
  'so_ngay_vang', 'so_ngay_thieu_gio', 'so_lan_quen_quet',
] as const;
type ChiSo = typeof CHI_SO[number];

const TOAN_TU = ['>=', '>', '=', '<=', '<'] as const;
type ToanTu = typeof TOAN_TU[number];

/** So sanh mot gia tri voi nguong. Toan tu la la KHONG khop — tha bo sot con hon bat oan. */
export function thoa_man(gia_tri: number, toan_tu: string, nguong: number): boolean {
  switch (toan_tu as ToanTu) {
    case '>=': return gia_tri >= nguong;
    case '>': return gia_tri > nguong;
    case '=': return gia_tri === nguong;
    case '<=': return gia_tri <= nguong;
    case '<': return gia_tri < nguong;
    default: return false;
  }
}

interface SoLieuThang {
  nhan_vien_id: string;
  so_lan_di_muon: number;
  tong_phut_muon: number;
  so_lan_ve_som: number;
  tong_phut_ve_som: number;
  so_ngay_vang: number;
  so_ngay_thieu_gio: number;
  so_lan_quen_quet: number;
}

function lay(sl: SoLieuThang, ten: string): number | null {
  return (CHI_SO as readonly string[]).includes(ten)
    ? sl[ten as ChiSo]
    : null;
}

export interface KetQuaQuet {
  so_quy_tac: number;
  so_nguoi: number;
  so_moi: number;
}

/**
 * Quet mot ky va ghi nhan vi pham cho nhung ai vuot nguong.
 *
 * Chay lai nhieu lan KHONG sinh ban ghi trung: chi muc duy nhat tren
 * (nhan_vien_id, quy_tac_id, ky) chan viec do, va o day dung `on conflict do nothing` de
 * lan chay sau khong ghi de len ban ghi ma nguoi ta da xu ly.
 */
export async function quet_vi_pham(thang: string, nguoi_ghi: string | null): Promise<KetQuaQuet> {
  const { tu, den } = khoang_thang(thang);

  const quy_tac = await truy_van<{
    id: string; loai_vi_pham_id: string; ten: string;
    chi_so: string; toan_tu: string; nguong: string;
  }>(
    `select q.id, q.loai_vi_pham_id, q.ten, q.chi_so, q.toan_tu, q.nguong
       from quy_tac_vi_pham q
       join loai_vi_pham l on l.id = q.loai_vi_pham_id
      where q.dang_bat = true and l.dang_bat = true`,
  );
  if (quy_tac.length === 0) return { so_quy_tac: 0, so_nguoi: 0, so_moi: 0 };

  const ds = await truy_van<SoLieuThang>(
    `select nv.id                                              as nhan_vien_id,
            coalesce(bc.so_lan_di_muon, 0)::int                as so_lan_di_muon,
            coalesce(bc.tong_phut_muon, 0)::int                as tong_phut_muon,
            coalesce(bc.so_lan_ve_som, 0)::int                 as so_lan_ve_som,
            coalesce(bc.tong_phut_ve_som, 0)::int              as tong_phut_ve_som,
            coalesce(bc.so_ngay_vang, 0)::int                  as so_ngay_vang,
            coalesce(bc.so_ngay_thieu_gio, 0)::int             as so_ngay_thieu_gio,
            coalesce(gt.so_don, 0)::int                        as so_lan_quen_quet
       from nhan_vien nv
       left join lateral (
         select count(*) filter (where phut_muon > 0)    as so_lan_di_muon,
                sum(phut_muon)                           as tong_phut_muon,
                count(*) filter (where phut_ve_som > 0)  as so_lan_ve_som,
                sum(phut_ve_som)                         as tong_phut_ve_som,
                count(*) filter (where trang_thai = 'vang')                    as so_ngay_vang,
                count(*) filter (where trang_thai = 'co_mat' and phut_lam = 0) as so_ngay_thieu_gio
           from bang_cong_ngay
          where nhan_vien_id = nv.id and ngay >= $1 and ngay <= $2
       ) bc on true
       left join lateral (
         select count(*) as so_don from don_giai_trinh
          where nhan_vien_id = nv.id and ngay >= $1 and ngay <= $2
            and trang_thai in ('cho_duyet','da_duyet')
       ) gt on true
      where nv.dang_hoat_dong = true`,
    [tu, den],
  );

  let so_moi = 0;
  await trong_giao_dich(async (khach) => {
    for (const nv of ds) {
      for (const q of quy_tac) {
        const gia_tri = lay(nv, q.chi_so);
        if (gia_tri === null) continue;
        if (!thoa_man(gia_tri, q.toan_tu, Number(q.nguong))) continue;

        const kq = await khach.query(
          `insert into vi_pham
             (nhan_vien_id, loai_vi_pham_id, nguon, quy_tac_id, ngay, ky, mo_ta,
              bang_chung, trang_thai, nguoi_ghi)
           values ($1,$2,'he_thong',$3,$4,$5,$6,$7,'moi',$8)
           on conflict do nothing
           returning id`,
          [
            nv.nhan_vien_id, q.loai_vi_pham_id, q.id, den, thang,
            `${q.ten}: ghi nhận ${gia_tri} (ngưỡng ${q.toan_tu} ${Number(q.nguong)})`,
            JSON.stringify({ chi_so: q.chi_so, gia_tri, toan_tu: q.toan_tu, nguong: Number(q.nguong) }),
            nguoi_ghi,
          ],
        );
        so_moi += kq.rowCount ?? 0;
      }
    }
  });

  return { so_quy_tac: quy_tac.length, so_nguoi: ds.length, so_moi };
}
