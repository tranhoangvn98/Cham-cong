// Day user + PIN xuong may cham cong (lenh DATA UPDATE USERINFO).
//
// MOT ham cho ca hai loi vao: them nhan vien bang form va cong duyet de nghi. Truoc day chi cong
// duyet day lenh, nen nguoi them bang form khong ton tai tren may — ca lam dau khong quet duoc,
// va khong co gi bao: may chi don gian khong biet PIN do.
//
// Lenh nam trong bang `lenh_thiet_bi` cua CUNG transaction tao ho so, nen may dang offline thi
// lenh cho san, khong mat.
import type { PoolClient } from 'pg';
import { truy_van } from '../csdl/ket_noi.ts';
import { xep_lenh } from '../adms/tuyen.ts';
import { lenh_cap_nhat_userinfo } from '../adms/giao_thuc.ts';
import { bo_dau } from '../tien_ich/ten_tep.ts';
import { khoa_lenh_pin } from './nhap_viec.ts';

/**
 * Serial cac may cham cong DANG BAT thuoc mot khoi.
 *
 * Thu tu on dinh (tao_luc, serial) de viec chon may cap PIN khong doi giua hai lan goi — doi may
 * giua chung thi PIN da de nghi lai thanh PIN cua dai khac.
 */
export async function may_cua_khoi(khoi_id: string): Promise<string[]> {
  const ds = await truy_van<{ serial: string }>(
    `select serial from thiet_bi
      where khoi_id = $1 and dang_bat
      order by tao_luc, serial`,
    [khoi_id],
  );
  return ds.map((d) => d.serial);
}

export interface KetQuaDayPin {
  /** Serial da xep duoc lenh. */
  da_day: string[];
  /** So lenh THUC SU moi (khoa chong trung chan lenh trung thi khong tang). */
  so_lenh: number;
}

/**
 * Xep lenh cap nhat user cho tung may. Goi trong transaction cua ben goi.
 *
 * `khoa_lenh_pin` gom ca serial: mot nguoi co the co mat o nhieu may, va moi may mot lenh —
 * khoa chi theo nhan vien thi may thu hai khong bao gio nhan duoc lenh.
 */
export async function day_pin_xuong_may(
  khach: PoolClient,
  nhan_vien_id: string,
  ho_ten: string,
  pin: string,
  cac_serial: readonly string[],
): Promise<KetQuaDayPin> {
  const ten_ascii = bo_dau(ho_ten);
  const da_day: string[] = [];
  let so_lenh = 0;
  for (const serial of new Set(cac_serial)) {
    if (serial === '') continue;
    const id = await xep_lenh(
      serial, lenh_cap_nhat_userinfo(pin, ten_ascii), khoa_lenh_pin(nhan_vien_id, serial), khach,
    );
    da_day.push(serial);
    if (id > 0) so_lenh++;
  }
  return { da_day, so_lenh };
}
