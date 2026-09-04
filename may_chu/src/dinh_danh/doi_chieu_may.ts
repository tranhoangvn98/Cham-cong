// Doi chieu DANH SACH USER TRONG MAY (bang may_nguoi_dung) voi MAPPING HE THONG (theo PIN toan
// cuc). Dung chung cho endpoint xem tung may va cho dem canh bao tren dashboard.
//
// Van de: may enroll nguoi duoi PIN da thuoc nhan vien khac -> quet gan nham. He thong map PIN
// toan cuc nen phai doi chieu ten enroll TREN MAY voi ten nguoi giu PIN do TRONG HE THONG.
import { truy_van } from '../csdl/ket_noi.ts';
import { bo_dau } from '../tien_ich/ten_tep.ts';

export type KetKhop = 'khop' | 'lech' | 'chua_gan' | 'khong_ten';

export interface DongDoiChieu {
  thiet_bi_serial: string;
  pin: string;
  ten_may: string | null;
  the: string | null;
  quyen: number;
  thay_luc: string;
  nhan_vien_id: string | null;
  ma_nv: string | null;
  ho_ten: string | null;
  khop: KetKhop;
}

function chuan(s: string): string {
  return bo_dau(s).toUpperCase().replace(/\s+/g, ' ').trim();
}

/** Xep loai khop giua ten tren may va ten nguoi giu PIN trong he thong. */
export function xep_khop(ten_may: string | null, nhan_vien_id: string | null,
  ho_ten: string | null): KetKhop {
  if (nhan_vien_id === null) return 'chua_gan';
  if (ten_may === null || ten_may.trim() === '') return 'khong_ten';
  const a = chuan(ten_may);
  const b = chuan(ho_ten ?? '');
  // Ten tren may thuong bi cat ngan / ASCII -> coi khop neu ten nay chua ten kia.
  return a !== '' && b !== '' && (a.includes(b) || b.includes(a)) ? 'khop' : 'lech';
}

/** Doi chieu user cua MOT may (serial != null) hoac TAT CA may (serial = null). */
export async function doi_chieu_may(serial: string | null): Promise<DongDoiChieu[]> {
  const ds = await truy_van<Omit<DongDoiChieu, 'khop'>>(
    `select mnd.thiet_bi_serial, mnd.pin, mnd.ten_may, mnd.the, mnd.quyen, mnd.thay_luc,
            sys.nhan_vien_id, sys.ma_nv, sys.ho_ten
       from may_nguoi_dung mnd
       left join lateral (
         select nv.id as nhan_vien_id, nv.ma_nv, nv.ho_ten
           from (
             select nhan_vien_id from ma_dinh_danh
              where he_thong='may_cham_cong' and ma_chuan=mnd.pin and hieu_luc_den is null
             union
             select id from nhan_vien where pin_may=mnd.pin and dang_hoat_dong
           ) x join nhan_vien nv on nv.id=x.nhan_vien_id and nv.dang_hoat_dong
          limit 1
       ) sys on true
      where ($1::text is null or mnd.thiet_bi_serial = $1)
      order by mnd.thiet_bi_serial, mnd.pin`,
    [serial],
  );
  return ds.map((u) => ({ ...u, khop: xep_khop(u.ten_may, u.nhan_vien_id, u.ho_ten) }));
}

/** Dem so user LECH (PIN thuoc nguoi khac) + CHUA GAN — dung cho canh bao dashboard. */
export async function dem_pin_lech(): Promise<number> {
  const ds = await doi_chieu_may(null);
  return ds.filter((u) => u.khop === 'lech' || u.khop === 'chua_gan').length;
}
