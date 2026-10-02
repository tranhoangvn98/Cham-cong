// SO NGOAI LE CHAM CONG: bang `so_ngoai_le` + `so_ngoai_le_nhan_vien` (migration 097).
//
// Mot muc ngoai le la mot NGAY dac biet (bao, su kien bat kha khang...) ma chu cong ty quyet
// dinh bo qua luat cham cong thuong:
//   - mien_di_muon / mien_ve_som: khong ap luat "di muon / ve som qua 30 phut mat nua ngay cong".
//   - mien_vang: nguoi khong quet may duoc tinh 1 cong, khong bi tru phep.
//
// Muc ap TOAN CONG TY (loai 'tat_ca') hoac chi mot so nhan vien (bang con).
//
// Tepp nay chua phan DUNG CHUNG: doc ngoai le cua mot nguoi-mot-ngay cho tinh cong, tra ngay
// mien vang cho phep tinh quy phep, va manh SQL loai ngay mien vang cho cac cau truy van dem
// don phep. Mot cho duy nhat de khong lech giua cac noi.
import { truy_van } from '../csdl/ket_noi.ts';

/** Muc ngoai le gop lai ap dung cho mot nguoi trong mot ngay. */
export interface NgoaiLeNgay {
  mien_di_muon: boolean;
  mien_ve_som: boolean;
  mien_vang: boolean;
  ghi_chu: string | null;
}

/**
 * Doc cac muc so ngoai le trum ngay nay ap dung cho nguoi nay (tat_ca hoac liet ke rieng),
 * gop lai thanh mot muc: chi can MOT muc bat co mien la duoc mien. Khong co muc nao -> null.
 */
export async function lay_ngoai_le(nhan_vien_id: string, ngay: string): Promise<NgoaiLeNgay | null> {
  const dong = await truy_van<NgoaiLeNgay>(
    `select s.mien_di_muon, s.mien_ve_som, s.mien_vang, s.ghi_chu
       from so_ngoai_le s
      where s.ngay = $2
        and (s.loai = 'tat_ca'
             or exists (select 1 from so_ngoai_le_nhan_vien snv
                         where snv.so_ngoai_le_id = s.id and snv.nhan_vien_id = $1))
      order by s.tao_luc`,
    [nhan_vien_id, ngay],
  );
  if (dong.length === 0) return null;
  const gop: NgoaiLeNgay = {
    mien_di_muon: false, mien_ve_som: false, mien_vang: false, ghi_chu: null,
  };
  for (const d of dong) {
    if (d.mien_di_muon) gop.mien_di_muon = true;
    if (d.mien_ve_som) gop.mien_ve_som = true;
    if (d.mien_vang) gop.mien_vang = true;
    if (gop.ghi_chu === null && d.ghi_chu !== null) gop.ghi_chu = d.ghi_chu;
  }
  return gop;
}

/**
 * Manh SQL "ngay nay KHONG bi mien vang" cua mot nhan vien — ghep vao dieu kien dem don phep
 * nam de ngay ngoai le (bao...) khong tru vao quy phep.
 *
 * `cot_ngay` = bieu thuc ngay dang dem (vd `g::date`, `ngay_nghi.ngay`).
 * `tham_so_nv` = cho danh so tham so cua nhan_vien_id (vd `$1`, `nv.id`).
 */
export function sql_ngay_khong_mien_vang(cot_ngay: string, tham_so_nv: string): string {
  return `not exists (
    select 1 from so_ngoai_le s
     where s.ngay = ${cot_ngay}
       and s.mien_vang
       and (s.loai = 'tat_ca'
            or exists (select 1 from so_ngoai_le_nhan_vien snv
                        where snv.so_ngoai_le_id = s.id and snv.nhan_vien_id = ${tham_so_nv}))
  )`;
}

/**
 * Tap cac ngay trong khoang [tu, den] ma nguoi nay duoc MIEN VANG (muc ngoai le mien_vang trum).
 * Dung cho cac ham dem phep bang vong lap tren danh sach ngay.
 */
export async function ngay_mien_vang_cua(
  nhan_vien_id: string, tu: string, den: string,
): Promise<Set<string>> {
  const dong = await truy_van<{ ngay: string }>(
    `select to_char(s.ngay, 'YYYY-MM-DD') as ngay
       from so_ngoai_le s
      where s.ngay between $2 and $3
        and s.mien_vang
        and (s.loai = 'tat_ca'
             or exists (select 1 from so_ngoai_le_nhan_vien snv
                         where snv.so_ngoai_le_id = s.id and snv.nhan_vien_id = $1))`,
    [nhan_vien_id, tu, den],
  );
  return new Set(dong.map((r) => r.ngay));
}
