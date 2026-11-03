// HUT LAN QUET CHUA GAN khi mot PIN may vua duoc gan cho mot nguoi.
//
// VI SAO CAN: nhan vien moi thuong duoc enroll tren may TRUOC khi nhan su lap ho so. Cac luot
// quet trong khoang do ve may chu khi chua co dong `ma_dinh_danh` nao tro toi PIN, nen chung
// duoc ghi lai voi `nhan_vien_id = null`. Khi nhan su gan PIN xong thi cac luot do DA NAM SAN
// o do va khong co buoc nao gan lai — nguoi do bi ghi VANG o moi ngay du ngay nao cung quet.
//
// Lay lai du lieu tu may KHONG chua duoc loi nay: khoa chong trung cua `lan_quet` lam ban ghi
// trung bi bo qua (`on conflict do nothing`), nen lan day thu hai khong sua dong da nam do.
//
// Da xay ra that 6 lan trong thang 10-11/2026 (Linh Dan, Vu Thuy Linh, Minh Phuong, My Duyen,
// Khanh An, Thien Trang). Moi lan deu phai sua tay bang SQL.
//
// Hai viec, vai tro khac nhau:
//   1. Keo `hieu_luc_tu` cua dong ma dinh danh ve dung moc QUET DAU TIEN con treo. Khong keo
//      thi lan quet ke tiep van bi coi la "cua nguoi khac".
//   2. Gan cac luot quet do cho chu PIN roi TINH LAI nhung ngay lien quan — gan ma khong tinh
//      lai thi bang cong van giu dong VANG cu.
//
// Quy tac chon luot nao duoc hut nam o `hut_lan_quet_thuan.ts` (ham thuan, co bai kiem).
import { truy_van, truy_van_mot } from '../csdl/ket_noi.ts';
import { tinh_lai_nhieu } from '../cong/tinh_cong.ts';
import { ngay_dia_phuong } from '../tien_ich/thoi_gian.ts';
import { ke_hoach_hut } from './hut_lan_quet_thuan.ts';

/** Khong nhin lai qua 90 ngay: PIN dung lai sau vai nam khong duoc hut luot quet cua nguoi cu. */
const TOI_DA_NGAY_NHIN_LAI = 90;

export interface KetQuaHut {
  /** So luot quet vua duoc gan cho chu PIN. */
  so_luot: number;
  /** Cac ngay (YYYY-MM-DD) da tinh lai cong. */
  cac_ngay: string[];
}

/**
 * Gan cac luot quet CHUA GAN cua `pin` cho nguoi dang giu PIN, roi tinh lai cong.
 *
 * Goi SAU khi dong `ma_dinh_danh` da duoc ghi va da commit — ham nay doc lai qua pool rieng nen
 * goi trong transaction se khong thay du lieu vua ghi.
 *
 * Khong lam gi (tra ve 0 luot) khi PIN chua thuoc ai.
 */
export async function hut_lan_quet_chua_gan(pin: string): Promise<KetQuaHut> {
  const trong: KetQuaHut = { so_luot: 0, cac_ngay: [] };

  const dang_giu = await truy_van_mot<{
    nhan_vien_id: string; hieu_luc_tu: Date; nguoi_truoc_ket_thuc: Date | null;
  }>(
    `select mdd.nhan_vien_id, mdd.hieu_luc_tu,
            (select max(cu.hieu_luc_den) from ma_dinh_danh cu
              where cu.he_thong = 'may_cham_cong' and cu.ma_chuan = mdd.ma_chuan
                and cu.hieu_luc_den is not null) as nguoi_truoc_ket_thuc
       from ma_dinh_danh mdd
      where mdd.he_thong = 'may_cham_cong' and mdd.ma_chuan = $1 and mdd.hieu_luc_den is null`,
    [pin],
  );
  if (dang_giu === null) return trong;

  // Chi doc cac luot quet trong pham vi co the duoc hut; bang lan_quet rat lon.
  const san = new Date(Date.now() - TOI_DA_NGAY_NHIN_LAI * 86_400_000);
  const moc_tu = new Date(Math.max(dang_giu.nguoi_truoc_ket_thuc?.getTime() ?? 0, san.getTime()));
  const luot = await truy_van<{ thoi_diem: Date }>(
    `select thoi_diem from lan_quet
      where nhan_vien_id is null and pin_may = $1 and thoi_diem >= $2`,
    [pin, moc_tu],
  );

  const ke_hoach = ke_hoach_hut(
    { hieu_luc_tu: dang_giu.hieu_luc_tu, nguoi_truoc_ket_thuc: dang_giu.nguoi_truoc_ket_thuc },
    luot.map((r) => r.thoi_diem),
    new Date(),
    TOI_DA_NGAY_NHIN_LAI,
  );
  if (ke_hoach === null) return trong;

  if (ke_hoach.hieu_luc_tu_moi !== null) {
    await truy_van(
      `update ma_dinh_danh set hieu_luc_tu = $2
        where he_thong = 'may_cham_cong' and ma_chuan = $1 and hieu_luc_den is null`,
      [pin, ke_hoach.hieu_luc_tu_moi],
    );
  }

  const da_gan = await truy_van<{ thoi_diem: Date }>(
    `update lan_quet set nhan_vien_id = $2
      where nhan_vien_id is null and pin_may = $1 and thoi_diem >= $3
      returning thoi_diem`,
    [pin, dang_giu.nhan_vien_id, ke_hoach.moc_hut],
  );
  if (da_gan.length === 0) return trong;

  const cac_ngay = [...new Set(da_gan.map((r) => ngay_dia_phuong(r.thoi_diem)))].sort();
  try {
    await tinh_lai_nhieu(
      cac_ngay.map((ngay) => ({ nhan_vien_id: dang_giu.nhan_vien_id, ngay })),
    );
  } catch {
    // Gan duoc luot quet la phan quan trong hon; bang cong con lich chay dem tinh lai.
  }
  return { so_luot: da_gan.length, cac_ngay };
}
