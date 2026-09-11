// Kho "muc tieu dieu huong" mot lan: khi bam mot thong bao, ngoai viec di toi dung MAN, ta con
// muon mo dung BAN GHI (khieu nai / don) va dung thao luan cua no. Router toi gian cua app chi
// khop theo duong dan (khong mang query), nen thay vi nhet id vao URL, ta gui id qua bien module
// nay: cho bam dat muc tieu, roi man dich DOC MOT LAN luc mount va tu xoa.
//
// Vong doi: dat_muc_tieu_bao(...) ngay truoc khi dieu huong -> man dich goi lay_muc_tieu_bao(man)
// trong khoi khoi tao useState -> lay ra id (va xoa) -> tu cuon/mo dung ban ghi. Doc mot lan nen
// khong ro ri sang lan dieu huong sau.

interface MucTieuBao {
  man: string;
  id: string;
}

let muc_tieu: MucTieuBao | null = null;

/** Dat muc tieu can mo sau khi dieu huong (goi ngay truoc di_toi / doi tab). null de xoa. */
export function dat_muc_tieu_bao(m: MucTieuBao | null): void {
  muc_tieu = m;
}

/**
 * Lay id can mo cho `man` va XOA (doc mot lan). Tra null neu khong co muc tieu hoac muc tieu
 * thuoc man khac — nho vay man khieu nai khong "nuot" muc tieu cua man don, va nguoc lai.
 */
export function lay_muc_tieu_bao(man: string): string | null {
  if (muc_tieu !== null && muc_tieu.man === man) {
    const { id } = muc_tieu;
    muc_tieu = null;
    return id;
  }
  return null;
}
