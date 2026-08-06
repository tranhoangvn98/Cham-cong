// Doc du lieu tu CSDL -> goi quy tac tinh cong -> ghi bang_cong_ngay + su kien ERP.
import { truy_van, truy_van_mot, trong_giao_dich } from '../csdl/ket_noi.ts';
import { ghi_su_kien } from '../su_kien/hop_thu_di.ts';
import { cong_ngay, danh_sach_ngay, ngay_dia_phuong } from '../tien_ich/thoi_gian.ts';
import {
  khoang_lay_quet,
  tinh_cong_ngay,
  type CaLam,
  type KetQuaTinhCong,
} from './quy_tac_tinh_cong.ts';

interface DongNhanVien {
  id: string;
  ma_nv: string;
  ma_erp: string | null;
  ca_lam_id: string | null;
}

async function nap_ca(ca_lam_id: string | null): Promise<CaLam | null> {
  if (ca_lam_id === null) return null;
  return truy_van_mot<CaLam>(
    `select gio_vao, gio_ra, nghi_tu, nghi_den,
            dung_sai_muon_phut, dung_sai_som_phut, nguong_ot_phut,
            qua_dem, phut_du_cong, cac_ngay_lam
       from ca_lam where id = $1`,
    [ca_lam_id],
  );
}

/**
 * Tinh lai bang cong cua mot nhan vien trong mot ngay.
 * Bo qua neu ngay do da chot (khoa so luong) — tru khi `bo_qua_chot` = true.
 * Tra ve ket qua da ghi, hoac null neu khong tinh (nhan vien khong ton tai / da chot).
 */
export async function tinh_lai_ngay(
  nhan_vien_id: string,
  ngay: string,
  bo_qua_chot = false,
): Promise<KetQuaTinhCong | null> {
  const nv = await truy_van_mot<DongNhanVien>(
    'select id, ma_nv, ma_erp, ca_lam_id from nhan_vien where id = $1',
    [nhan_vien_id],
  );
  if (nv === null) return null;

  if (!bo_qua_chot) {
    const da_chot = await truy_van_mot<{ da_chot: boolean }>(
      'select da_chot from bang_cong_ngay where nhan_vien_id = $1 and ngay = $2',
      [nhan_vien_id, ngay],
    );
    if (da_chot?.da_chot === true) return null;
  }

  const ca = await nap_ca(nv.ca_lam_id);
  const khoang = khoang_lay_quet(ngay, ca);

  // Chi tinh cac lan quet DUOC TIN: may quet (tu_dong) hoac nhan su da duyet.
  // Lan quet bang dien thoai dang 'cho_duyet' khong duoc tinh cong.
  const quet = await truy_van<{ thoi_diem: Date }>(
    `select thoi_diem
       from lan_quet
      where nhan_vien_id = $1
        and thoi_diem >= $2 and thoi_diem < $3
        and trang_thai_duyet in ('tu_dong','da_duyet')
      order by thoi_diem`,
    [nhan_vien_id, khoang.tu, khoang.den],
  );

  const nghi_phep = await truy_van_mot<{ loai: string; nua_ngay: boolean }>(
    `select loai, nua_ngay
       from don_nghi_phep
      where nhan_vien_id = $1 and trang_thai = 'da_duyet'
        and tu_ngay <= $2 and den_ngay >= $2
      order by tao_luc desc limit 1`,
    [nhan_vien_id, ngay],
  );

  const ngay_le = await truy_van_mot<{ huong_luong: boolean }>(
    'select huong_luong from ngay_le where ngay = $1',
    [ngay],
  );

  const giai_trinh = await truy_van_mot<{
    gio_vao_de_xuat: string | null;
    gio_ra_de_xuat: string | null;
  }>(
    `select gio_vao_de_xuat, gio_ra_de_xuat
       from don_giai_trinh
      where nhan_vien_id = $1 and ngay = $2 and trang_thai = 'da_duyet'
      limit 1`,
    [nhan_vien_id, ngay],
  );

  const kq = tinh_cong_ngay({
    ngay,
    ca,
    quet: quet.map((q) => q.thoi_diem),
    nghi_phep,
    ngay_le,
    giai_trinh,
  });

  await trong_giao_dich(async (khach) => {
    await khach.query(
      `insert into bang_cong_ngay
         (nhan_vien_id, ngay, ca_lam_id, trang_thai, gio_vao, gio_ra,
          phut_lam, phut_muon, phut_ve_som, phut_ot, so_cong, co_dieu_chinh, ghi_chu, tinh_luc)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, now())
       on conflict (nhan_vien_id, ngay) do update set
         ca_lam_id     = excluded.ca_lam_id,
         trang_thai    = excluded.trang_thai,
         gio_vao       = excluded.gio_vao,
         gio_ra        = excluded.gio_ra,
         phut_lam      = excluded.phut_lam,
         phut_muon     = excluded.phut_muon,
         phut_ve_som   = excluded.phut_ve_som,
         phut_ot       = excluded.phut_ot,
         so_cong       = excluded.so_cong,
         co_dieu_chinh = excluded.co_dieu_chinh,
         ghi_chu       = excluded.ghi_chu,
         tinh_luc      = now()
       where bang_cong_ngay.da_chot = false`,
      [
        nhan_vien_id, ngay, nv.ca_lam_id, kq.trang_thai, kq.gio_vao, kq.gio_ra,
        kq.phut_lam, kq.phut_muon, kq.phut_ve_som, kq.phut_ot, kq.so_cong,
        kq.co_dieu_chinh, kq.ghi_chu,
      ],
    );

    await ghi_su_kien('bang_cong.da_chot', {
      nhan_vien_id,
      ma_nv: nv.ma_nv,
      ma_erp: nv.ma_erp,
      ngay,
      trang_thai: kq.trang_thai,
      phut_lam: kq.phut_lam,
      phut_muon: kq.phut_muon,
      phut_ve_som: kq.phut_ve_som,
      phut_ot: kq.phut_ot,
      so_cong: kq.so_cong,
    }, khach);
  });

  return kq;
}

/** Tinh lai nhieu (nhan vien, ngay). Chay tuan tu de khong lam nghen pool ket noi. */
export async function tinh_lai_nhieu(
  cap: Iterable<{ nhan_vien_id: string; ngay: string }>,
): Promise<number> {
  let so = 0;
  for (const c of cap) {
    try {
      const kq = await tinh_lai_ngay(c.nhan_vien_id, c.ngay);
      if (kq !== null) so++;
    } catch (loi) {
      // Mot nhan vien loi khong duoc lam dung ca lo.
      console.error(
        `[tinh_cong] loi nhan vien ${c.nhan_vien_id} ngay ${c.ngay}:`,
        (loi as Error).message,
      );
    }
  }
  return so;
}

/**
 * Tinh lai toan bo nhan vien dang hoat dong trong khoang ngay.
 * Dung khi nhan su doi ca / them ngay le / duyet don hang loat.
 */
export async function tinh_lai_khoang(
  tu: string,
  den: string,
  nhan_vien_id?: string,
): Promise<number> {
  const ds_ngay = danh_sach_ngay(tu, den);
  const nv = nhan_vien_id !== undefined
    ? await truy_van<{ id: string }>('select id from nhan_vien where id = $1', [nhan_vien_id])
    : await truy_van<{ id: string }>('select id from nhan_vien where dang_hoat_dong = true');

  const cap: { nhan_vien_id: string; ngay: string }[] = [];
  for (const n of nv) for (const ng of ds_ngay) cap.push({ nhan_vien_id: n.id, ngay: ng });
  return tinh_lai_nhieu(cap);
}

/**
 * Tinh lai ngay hom qua cho toan bo nhan vien — dung cho lich chay dem.
 * Can thiet vi nhung nguoi VANG khong he co lan quet nao nen khong co gi kich hoat
 * tinh cong; neu khong chay dinh ky thi ngay vang se khong xuat hien tren bang cong.
 */
export async function chot_ngay_hom_qua(hom_nay: Date = new Date()): Promise<number> {
  const hom_qua = cong_ngay(ngay_dia_phuong(hom_nay), -1);
  return tinh_lai_khoang(hom_qua, hom_qua);
}
