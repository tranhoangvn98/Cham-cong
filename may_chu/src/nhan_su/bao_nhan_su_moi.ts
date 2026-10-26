// Bao cho QUAN TRI VIEN biet vua co nhan su moi duoc them.
//
// Mot luong tao nhan su duy nhat (CLAUDE.md / tai_lieu/LUONG-TAO-NHAN-SU-TU-DONG.md): nguoi co
// quyen nhan su tu them ho so, khong con buoc "de nghi - duyet". Admin khong phai lam gi, chi
// can biet — nen day la thong bao, KHONG phai yeu cau duyet.
//
// Khong chan luong tao ho so: ho so da luu xong moi goi, va loi thong bao khong duoc lam hong
// phan hoi (gui_ngam tu nuot loi).
import { tai_khoan_quan_tri } from '../su_kien/thong_bao_day.ts';
import { gui_chuong_ngon_ngu } from '../su_kien/gui_chuong_ngon_ngu.ts';

export interface DuLieuBaoNhanSuMoi {
  nhan_vien_id: string;
  ho_ten: string;
  ma_nv: string;
}

/** Gui chuong "co nhan su moi" cho moi tai khoan admin dang hoat dong. */
export async function bao_nhan_su_moi(du: DuLieuBaoNhanSuMoi): Promise<number> {
  const nguoi_nhan = await tai_khoan_quan_tri();
  return gui_chuong_ngon_ngu({
    nguoi_dung_ids: nguoi_nhan,
    tieu_de: 'ns_moi_tieu_de',
    noi_dung: 'ns_moi_noi_dung',
    tham_so: { ho_ten: du.ho_ten, ma_nv: du.ma_nv },
    du_lieu: { man: 'nhan-vien', nhan_vien_id: du.nhan_vien_id },
  });
}
