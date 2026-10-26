// Ho so da ton tai voi email nay — dung chung cho may chu va bai kiem.
//
// Vi sao tach rieng: `tao_ho_so.ts` cham CSDL/cau hinh nen kho kiem; con day la phan QUYET DINH
// (thong diep + du lieu may doc duoc) va phai kiem duoc tung chu.
//
// Su that nghiep vu: MOI EMAIL CHI CO MOT HO SO. Email la ten dang nhap Microsoft (UPN), nen
// mot email ma co hai ho so thi hai nguoi dung chung mot hop thu, mot giay phep, va bang luong
// tra nham nguoi. Vi vay khi trung thi KHONG tao moi — phai mo ho so da co de sua.
import type { ChiTietLoi } from '../tien_ich/kiem_tra.ts';

/** Ma trong `chi_tiet.ma` — giao dien doc ma nay, KHONG do chuoi thong diep. */
export const MA_LOI_EMAIL_DA_CO_HO_SO = 'email_da_co_ho_so';

export interface HoSoTrungEmail {
  id: string;
  ma_nv: string;
  ho_ten: string;
  dang_hoat_dong: boolean;
}

export interface LoiTrungEmail {
  thong_diep: string;
  chi_tiet: ChiTietLoi;
}

/**
 * Thong diep + du lieu cho loi "email da thuoc ho so khac".
 *
 * Noi ro ba viec: email dang thuoc AI (ma + ten), vi sao khong tao duoc, va lam gi tiep. Ho so
 * da nghi viec van phai noi dung — nguoi dung can biet minh dang mo dung ho so cu chu khong
 * phai he thong bao nham.
 */
export function loi_trung_email(upn: string, nv: HoSoTrungEmail): LoiTrungEmail {
  const ai = nv.ma_nv === '' ? nv.ho_ten : `${nv.ma_nv} — ${nv.ho_ten}`;
  const nghi = nv.dang_hoat_dong ? '' : ' (hồ sơ đã nghỉ việc)';
  return {
    thong_diep:
      `Email ${upn} đã thuộc hồ sơ ${ai}${nghi}. Mỗi email chỉ có một hồ sơ — `
      + 'mở hồ sơ đó để sửa, hoặc dùng email khác nếu đây là người mới.',
    chi_tiet: {
      ma: MA_LOI_EMAIL_DA_CO_HO_SO,
      nhan_vien_id: nv.id,
      ma_nv: nv.ma_nv,
      ho_ten: nv.ho_ten,
      dang_hoat_dong: nv.dang_hoat_dong,
    },
  };
}
