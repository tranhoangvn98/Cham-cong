// Bao TAI KHOAN Microsoft 365 vua tao cho NGUOI LAP HO SO (nguoi bam "Them nhan vien" tren he thong).
//
// VI SAO CAN: mat khau khoi tao chi hien MOT LAN trong hop thoai ket qua. Nguoi lap ho so dong
// hop thoai la mat; hoac ho lap ho so tu dien thoai / may khac roi khong con man hinh do. Yeu cau
// 26/10/2026: nguoi tao tai khoan tren ERP2 PHAI nhan duoc ten dang nhap + mat khau khoi tao de
// ban giao cho nhan vien moi. Nhan vien bat buoc doi mat khau ngay lan dang nhap dau (Microsoft
// `forceChangePasswordNextSignIn` — xem `ms365.ts`).
//
// LUU Y BAO MAT: thong bao duoc luu trong `thong_bao_rieng` cua CHINH nguoi tao (chi ho doc
// duoc), va push di qua HTTPS. Khong gui qua email, khong gui cho nguoi khac.
import { gui_chuong_ngon_ngu } from '../su_kien/gui_chuong_ngon_ngu.ts';

export interface DuLieuBaoTaiKhoanMs {
  /** Tai khoan nguoi lap ho so — nguoi duy nhat nhan thong bao nay. */
  nguoi_tao_id: string | null;
  ho_ten: string;
  upn: string;
  mat_khau: string;
}

/**
 * Gui chuong "tai khoan Microsoft + mat khau khoi tao" cho nguoi lap ho so.
 * Tra ve false khi khong xac dinh duoc nguoi nhan (script/MCP) — ben goi tu them canh bao.
 */
export async function bao_tai_khoan_ms365(du: DuLieuBaoTaiKhoanMs): Promise<boolean> {
  const id = (du.nguoi_tao_id ?? '').trim();
  if (id === '' || du.mat_khau === '') return false;
  await gui_chuong_ngon_ngu({
    nguoi_dung_ids: [id],
    tieu_de: 'tk365_tieu_de',
    noi_dung: 'tk365_noi_dung',
    tham_so: { ho_ten: du.ho_ten, upn: du.upn, mat_khau: du.mat_khau },
    du_lieu: { man: 'nhan-vien' },
  });
  return true;
}
