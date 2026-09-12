// Kho "muc tieu dieu huong" mot lan: khi bam mot thong bao, ngoai viec di toi dung MAN, ta con
// muon mo dung BAN GHI (khieu nai / don) va dung thao luan cua no. Router toi gian cua app chi
// khop theo duong dan (khong mang query), nen thay vi nhet id vao URL, ta gui id qua kho nay.
//
// Co DANG KY (pub-sub) chu khong chi doc-luc-mount: neu man dich DANG mo san (nguoi dung dang o
// dung trang / dung tab thi bam thong bao khac), router khong dieu huong lai nen component khong
// mount lai — luc do phai co tin hieu de no van mo dung ticket. Vay: dat_muc_tieu_bao(...) bao
// cho moi nguoi nghe; man dich vua doc luc mount vua nghe tin hieu sau.

interface MucTieuBao {
  man: string;
  id: string;
}

let muc_tieu: MucTieuBao | null = null;
const nguoi_nghe = new Set<() => void>();

/** Dat muc tieu can mo sau khi dieu huong (goi ngay truoc di_toi / doi tab). null de xoa. */
export function dat_muc_tieu_bao(m: MucTieuBao | null): void {
  muc_tieu = m;
  if (m !== null) for (const f of nguoi_nghe) f();
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

/** Nghe khi co muc tieu moi (man dang mo san van mo dung ticket). Tra ham huy dang ky. */
export function nghe_muc_tieu_bao(f: () => void): () => void {
  nguoi_nghe.add(f);
  return () => { nguoi_nghe.delete(f); };
}
