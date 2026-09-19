// Nghiep vu cho nghi viec — dung chung cho ca nut thu cong (route /nghi-viec) lan lich
// chay dem (quyet dinh nghi viec den ngay hieu luc).
//
// Tat ca trong MOT transaction cua nguoi goi: khoa nhan vien, vo hieu hoa tai khoan, thu
// hoi moi token lam moi, ghi su kien bao cong phan quyen + bao Microsoft ra hop thu di.
// Tach cac buoc ra la de lai mot nguoi da nghi o he thong nay nhung van dang nhap duoc
// vao phan he khac trong cum — dung loai lo khong ai phat hien cho den khi qua muon.
import type { PoolClient } from 'pg';
import { ghi_su_kien } from '../su_kien/hop_thu_di.ts';

export interface KetQuaNghiViec {
  ma_nv: string;
  /** Upn Microsoft se bi chan dang nhap. null = nguoi nay khong co tai khoan Microsoft. */
  upn: string | null;
}

/**
 * Cho mot nhan vien nghi viec. Giu lai lich su cham cong, chi tat hoat dong.
 *
 * PHAI goi TRONG mot transaction (xem `trong_giao_dich` trong csdl/ket_noi.ts). Tra null
 * neu khong tim thay nhan vien.
 */
export async function cho_nghi_viec(
  khach: PoolClient,
  nhan_vien_id: string,
  ngay_nghi: string | null,
): Promise<KetQuaNghiViec | null> {
  const dong = (
    await khach.query<{ ma_nv: string }>(
      `update nhan_vien
          set dang_hoat_dong = false,
              ngay_nghi_viec = coalesce($2::date, current_date),
              cap_nhat_luc = now()
        where id = $1
        returning ma_nv`,
      [nhan_vien_id, ngay_nghi],
    )
  ).rows[0];
  if (dong === undefined) return null;

  // Vo hieu hoa luon tai khoan dang nhap cua nguoi do.
  await khach.query('update nguoi_dung set dang_hoat_dong = false where nhan_vien_id = $1',
    [nhan_vien_id]);
  await khach.query(
    `update token_lam_moi set thu_hoi_luc = now()
      where thu_hoi_luc is null
        and nguoi_dung_id in (select id from nguoi_dung where nhan_vien_id = $1)`,
    [nhan_vien_id],
  );

  // Bao cong phan quyen: ben do doi `nhan_su.trang_thai`, vo hieu hoa tai khoan cong VA
  // thu hoi moi phien dang song. Buoc cuoi la buoc quan trong nhat — `vo_hieu_hoa` chan
  // duoc dang nhap lai nhung khong chan duoc tab dang mo.
  await ghi_su_kien('nhan_su.nghi_viec', { ma_nv: dong.ma_nv }, khach);

  // Microsoft: chan dang nhap + rut giay phep. Khong co email Microsoft thi bo qua —
  // khong ghi su kien khong bao gio gui duoc (chi day bang hop thu vo ich).
  const tai_khoan = (
    await khach.query<{ email_microsoft: string | null }>(
      `select email_microsoft from nguoi_dung
        where nhan_vien_id = $1 and email_microsoft is not null
        limit 1`,
      [nhan_vien_id],
    )
  ).rows[0];
  const upn = tai_khoan?.email_microsoft ?? null;
  if (upn !== null) {
    await ghi_su_kien('ms365.nghi_viec', { ma_nv: dong.ma_nv, upn }, khach);
  }

  return { ma_nv: dong.ma_nv, upn };
}
