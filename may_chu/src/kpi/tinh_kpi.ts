// Lay so lieu that tu CSDL roi cham diem KPI cho ca mot ky.
//
// Moi chi so khai RO lay so tu dau (cot `nguon` + `chi_so` trong danh_muc_kpi). Danh sach
// chi so la DONG — khong bao gio noi chuoi tu du lieu vao SQL.
import { truy_van, truy_van_mot, trong_giao_dich } from '../csdl/ket_noi.ts';
import { khoang_thang, danh_sach_ngay, thu_trong_tuan } from '../tien_ich/thoi_gian.ts';
import {
  cham_mot_chi_so, gop_diem, xep_loai, type ChiSoKpi, type BacXepLoai,
} from './cham_diem.ts';

/** Toan bo so lieu cua MOT nguoi trong ky, lay mot lan roi dung cho moi chi so. */
interface SoLieu {
  nhan_vien_id: string;
  ty_le_du_cong: number | null;
  so_ngay_co_mat: number;
  so_ngay_vang: number;
  so_lan_di_muon: number;
  tong_phut_muon: number;
  so_lan_ve_som: number;
  gio_ot: number;
  so_ngay_nghi_phep: number;
  so_vi_pham: number;
  diem_tru_vi_pham: number;
  so_cong_viec_hoan_thanh: number;
  so_cong_viec_dung_han: number;
  ty_le_dung_han: number | null;
  so_bao_cao_da_nop: number;
}

/** Doc mot chi so ra khoi bo so lieu. Ten chi so da duoc CSDL rang buoc bang `check`. */
function lay_chi_so(sl: SoLieu, ten: string): number | null {
  switch (ten) {
    case 'ty_le_du_cong': return sl.ty_le_du_cong;
    case 'so_ngay_co_mat': return sl.so_ngay_co_mat;
    case 'so_ngay_vang': return sl.so_ngay_vang;
    case 'so_lan_di_muon': return sl.so_lan_di_muon;
    case 'tong_phut_muon': return sl.tong_phut_muon;
    case 'so_lan_ve_som': return sl.so_lan_ve_som;
    case 'gio_ot': return sl.gio_ot;
    case 'so_ngay_nghi_phep': return sl.so_ngay_nghi_phep;
    case 'so_vi_pham': return sl.so_vi_pham;
    case 'diem_tru_vi_pham': return sl.diem_tru_vi_pham;
    case 'so_cong_viec_hoan_thanh': return sl.so_cong_viec_hoan_thanh;
    case 'so_cong_viec_dung_han': return sl.so_cong_viec_dung_han;
    case 'ty_le_dung_han': return sl.ty_le_dung_han;
    case 'so_bao_cao_da_nop': return sl.so_bao_cao_da_nop;
    // Chi so 'nhap_tay' khong co du lieu tu dong — quan ly tu cham.
    default: return null;
  }
}

/** So ngay lam viec chuan cua thang theo ca cua tung nguoi. */
function ngay_cong_chuan(
  tu: string, den: string, cac_ngay_lam: number[], ngay_le: Set<string>,
): number {
  let so = 0;
  for (const ng of danh_sach_ngay(tu, den)) {
    if (ngay_le.has(ng)) continue;
    if (cac_ngay_lam.includes(thu_trong_tuan(ng))) so++;
  }
  return so;
}

/**
 * Tinh (hoac tinh lai) KPI cho ca mot ky. Tra ve so nguoi da cham.
 *
 * GIU LAI diem sua tay: quan ly da ghi de mot diem thi tinh lai vi cham cong doi khong
 * duoc phep xoa quyet dinh do. Muon bo thi xoa bang tay.
 */
export async function tinh_ky_kpi(ky_id: string, thang: string): Promise<number> {
  const { tu, den } = khoang_thang(thang);

  const chi_so = await truy_van<{
    id: string; ma: string; ten: string; nguon: string; chi_so: string | null;
    chieu: 'cao_tot' | 'thap_tot'; muc_toi_thieu: string; muc_muc_tieu: string;
    diem_toi_da: string; trong_so: string; ap_dung_phong_ban: string | null;
  }>(
    `select id, ma, ten, nguon, chi_so, chieu, muc_toi_thieu, muc_muc_tieu,
            diem_toi_da, trong_so, ap_dung_phong_ban
       from danh_muc_kpi where dang_bat = true order by ma`,
  );
  if (chi_so.length === 0) return 0;

  const thang_xep = await truy_van<BacXepLoai>(
    `select ten, tu_diem::float8 as tu_diem from thang_xep_loai_kpi
      where dang_bat = true order by tu_diem desc`,
  );

  const le = await truy_van<{ ngay: string }>(
    `select to_char(ngay, 'YYYY-MM-DD') as ngay from ngay_le where ngay >= $1 and ngay <= $2`,
    [tu, den],
  );
  const ngay_le = new Set(le.map((r) => r.ngay));

  // Mot truy van gom moi so lieu can dung. Lam nhieu truy van nho se de doc hon nhung
  // voi vai tram nhan vien thi thanh vai nghin luot goi CSDL.
  const ds = await truy_van<SoLieu & {
    cac_ngay_lam: number[]; phong_ban_id: string | null; so_cong: number;
  }>(
    `select nv.id                                                as nhan_vien_id,
            nv.phong_ban_id,
            coalesce(cl.cac_ngay_lam, '{1,2,3,4,5}')             as cac_ngay_lam,
            coalesce(bc.so_cong, 0)::float8                      as so_cong,
            coalesce(bc.so_ngay_co_mat, 0)::int                  as so_ngay_co_mat,
            coalesce(bc.so_ngay_vang, 0)::int                    as so_ngay_vang,
            coalesce(bc.so_lan_di_muon, 0)::int                  as so_lan_di_muon,
            coalesce(bc.tong_phut_muon, 0)::int                  as tong_phut_muon,
            coalesce(bc.so_lan_ve_som, 0)::int                   as so_lan_ve_som,
            round(coalesce(bc.phut_ot, 0) / 60.0, 2)::float8     as gio_ot,
            coalesce(bc.so_ngay_nghi_phep, 0)::int               as so_ngay_nghi_phep,
            coalesce(vp.so_vi_pham, 0)::int                      as so_vi_pham,
            coalesce(vp.diem_tru, 0)::float8                     as diem_tru_vi_pham,
            coalesce(cv.hoan_thanh, 0)::int                      as so_cong_viec_hoan_thanh,
            coalesce(cv.dung_han, 0)::int                        as so_cong_viec_dung_han,
            coalesce(bcao.so_bao_cao, 0)::int                    as so_bao_cao_da_nop
       from nhan_vien nv
       left join ca_lam cl on cl.id = nv.ca_lam_id
       left join lateral (
         select sum(so_cong) as so_cong, sum(phut_ot) as phut_ot,
                sum(phut_muon) as tong_phut_muon,
                count(*) filter (where trang_thai = 'co_mat')    as so_ngay_co_mat,
                count(*) filter (where trang_thai = 'vang')      as so_ngay_vang,
                count(*) filter (where trang_thai = 'nghi_phep') as so_ngay_nghi_phep,
                count(*) filter (where phut_muon > 0)            as so_lan_di_muon,
                count(*) filter (where phut_ve_som > 0)          as so_lan_ve_som
           from bang_cong_ngay
          where nhan_vien_id = nv.id and ngay >= $1 and ngay <= $2
       ) bc on true
       left join lateral (
         -- Chi tinh vi pham DA XAC NHAN hoac DA XU LY. Vi pham con o 'moi' la may vua
         -- phat hien, chua ai xac nhan va nguoi lao dong chua duoc giai trinh — cham diem
         -- theo do la ket toi truoc khi xet.
         select count(*) as so_vi_pham, sum(lvp.diem_tru_kpi) as diem_tru
           from vi_pham v join loai_vi_pham lvp on lvp.id = v.loai_vi_pham_id
          where v.nhan_vien_id = nv.id and v.ngay >= $1 and v.ngay <= $2
            and v.trang_thai in ('da_xac_nhan','da_xu_ly')
       ) vp on true
       left join lateral (
         select count(*) filter (where trang_thai = 'hoan_thanh') as hoan_thanh,
                count(*) filter (where trang_thai = 'hoan_thanh'
                                   and (han is null
                                        or hoan_thanh_luc::date <= han)) as dung_han
           from cong_viec
          where nhan_vien_id = nv.id
            and coalesce(hoan_thanh_luc::date, han, $1) between $1 and $2
       ) cv on true
       left join lateral (
         select count(*) as so_bao_cao from bao_cao
          where nhan_vien_id = nv.id and tao_luc::date between $1 and $2
       ) bcao on true
      where nv.dang_hoat_dong = true
      order by nv.ma_nv`,
    [tu, den],
  );

  await trong_giao_dich(async (khach) => {
    for (const nv of ds) {
      const chuan = ngay_cong_chuan(tu, den, nv.cac_ngay_lam, ngay_le);
      const sl: SoLieu = {
        ...nv,
        // Khong co ngay cong chuan nao (thang toan ngay le) thi khong tinh duoc ty le.
        ty_le_du_cong: chuan > 0 ? Math.round((nv.so_cong / chuan) * 10000) / 100 : null,
        ty_le_dung_han: nv.so_cong_viec_hoan_thanh > 0
          ? Math.round((nv.so_cong_viec_dung_han / nv.so_cong_viec_hoan_thanh) * 10000) / 100
          : null,
      };

      const diem_cac_chi_so: { ma: string; diem: number; trong_so: number }[] = [];

      for (const cs of chi_so) {
        // Chi so gioi han theo phong ban thi bo qua nguoi phong khac.
        if (cs.ap_dung_phong_ban !== null && cs.ap_dung_phong_ban !== nv.phong_ban_id) continue;

        const cau_hinh: ChiSoKpi = {
          ma: cs.ma, ten: cs.ten, chieu: cs.chieu,
          muc_toi_thieu: Number(cs.muc_toi_thieu),
          muc_muc_tieu: Number(cs.muc_muc_tieu),
          diem_toi_da: Number(cs.diem_toi_da),
          trong_so: Number(cs.trong_so),
        };

        const gia_tri = cs.nguon === 'nhap_tay' ? null : lay_chi_so(sl, cs.chi_so ?? '');
        const diem_may = cham_mot_chi_so(gia_tri, cau_hinh);

        // Doc lai diem sua tay de khong ghi de len quyet dinh cua quan ly.
        const cu = await khach.query<{ diem_sua_tay: string | null }>(
          `select diem_sua_tay from ket_qua_kpi
            where ky_kpi_id = $1 and nhan_vien_id = $2 and danh_muc_kpi_id = $3`,
          [ky_id, nv.nhan_vien_id, cs.id],
        );
        const sua_tay = cu.rows[0]?.diem_sua_tay;
        const diem_dung = sua_tay !== null && sua_tay !== undefined
          ? Number(sua_tay)
          : diem_may;

        await khach.query(
          `insert into ket_qua_kpi
             (ky_kpi_id, nhan_vien_id, danh_muc_kpi_id, gia_tri, diem, tinh_luc)
           values ($1,$2,$3,$4,$5, now())
           on conflict (ky_kpi_id, nhan_vien_id, danh_muc_kpi_id) do update set
             gia_tri = excluded.gia_tri,
             diem = coalesce(ket_qua_kpi.diem_sua_tay, excluded.diem),
             tinh_luc = now()`,
          [ky_id, nv.nhan_vien_id, cs.id, gia_tri, diem_dung ?? 0],
        );

        // Chi gop nhung chi so THUC SU cham duoc: nguoi thieu du lieu o mot chi so khong
        // bi keo diem xuong vi chi so do.
        if (diem_dung !== null) {
          diem_cac_chi_so.push({
            ma: cs.ma, diem: diem_dung, trong_so: cau_hinh.trong_so,
          });
        }
      }

      const tong = gop_diem(diem_cac_chi_so);
      await khach.query(
        `insert into tong_hop_kpi (ky_kpi_id, nhan_vien_id, tong_diem, xep_loai, tinh_luc)
         values ($1,$2,$3,$4, now())
         on conflict (ky_kpi_id, nhan_vien_id) do update set
           tong_diem = excluded.tong_diem, xep_loai = excluded.xep_loai, tinh_luc = now()`,
        [ky_id, nv.nhan_vien_id, tong ?? 0, xep_loai(tong, thang_xep)],
      );
    }

    await khach.query('update ky_kpi set tinh_luc = now() where id = $1', [ky_id]);
  });

  return ds.length;
}

/** Ky KPI dang o trang thai nao. Da chot thi khong tinh lai duoc. */
export async function trang_thai_ky(ky_id: string): Promise<string | null> {
  const k = await truy_van_mot<{ trang_thai: string }>(
    'select trang_thai from ky_kpi where id = $1', [ky_id],
  );
  return k?.trang_thai ?? null;
}
