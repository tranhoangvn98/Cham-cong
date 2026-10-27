// Doi chieu DANH SACH USER TRONG MAY (bang may_nguoi_dung) voi MAPPING HE THONG (theo PIN toan
// cuc). Dung chung cho endpoint xem tung may va cho dem canh bao tren dashboard.
//
// Van de: may enroll nguoi duoi PIN da thuoc nhan vien khac -> quet gan nham. He thong map PIN
// toan cuc nen phai doi chieu ten enroll TREN MAY voi ten nguoi giu PIN do TRONG HE THONG.
//
// VI SAO KHONG CON BAO "LECH" TRAN LAN (26/10/2026): ten tren may VP la ten RUT GON do nhan su
// go tay — `Thuyhang`, `Lankt`, `Maianhkd`, `Sep`. So thang voi ho ten day du thi 42/44 dong
// bao dong gia, va mot canh bao luon sai la mot canh bao khong ai doc. Nen:
//   - bo het khoang trang + dau tieng Viet truoc khi so (`THUYHANG` nam trong `NGUYENTHUYHANG`);
//   - chap nhan ten tren may bat dau bang MOT TU trong ho ten (`LANKT` -> `LAN`, `VIETKD` -> `VIET`);
//   - tach "chua gan" thanh hai loai: PIN KHONG AI QUET (rac tren may) va PIN CO NGUOI QUET
//     (dang co nguoi di lam ma luot quet bi bo — nang hon nhieu).
//
// VI SAO CON TACH THEM `ten_khac` (28/10/2026): ten goi tat nhu `Sep` (sep = giam doc), `Tanh`,
// `Kly` khong giong ten ai trong he thong — do la nhan hien thi cua may, dung nguoi. Chi bao
// "lech" khi ten tren may la CUA MOT NHAN VIEN KHAC (vd PIN 5001 mang ten ThanThiVanAnh trong
// khi he thong ghi PIN do cho Huang Shu Ping): luc do moi that su co the quet gan nham.
import { truy_van } from '../csdl/ket_noi.ts';
import { bo_dau } from '../tien_ich/ten_tep.ts';

export type KetKhop =
  /** Ten tren may khop voi nguoi giu PIN. */
  | 'khop'
  /**
   * PIN thuoc nguoi dang lam va ten tren may la CUA MOT NHAN VIEN KHAC — rui ro that: nguoi kia
   * quet PIN nay se bi ghi cong cho chu PIN.
   */
  | 'lech'
  /**
   * Ten tren may khac ten nguoi giu PIN nhung khong giong ten ai trong he thong — ten goi tat
   * do nhan su tu dat (`Sep`, `Tanh`, `Kly`). Chi la nhan hien thi, khong phai gan nham.
   */
  | 'ten_khac'
  /** PIN chua gan cho ai VA co nguoi quet trong 7 ngay — luot quet dang bi bo. */
  | 'co_quet_chua_gan'
  /** PIN chua gan va khong ai quet: user cu nam lai tren may. */
  | 'chua_gan'
  /** PIN thuoc nguoi da nghi viec — lich chay se xoa khi du bang chung. */
  | 'da_nghi'
  /** May khong gui ten cho PIN da gan. */
  | 'khong_ten';

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
  /** Người giữ PIN còn đang làm hay đã nghỉ (null = không tìm thấy người giữ PIN). */
  dang_hoat_dong: boolean | null;
  /** So luot quet cua PIN nay tren may nay trong 7 ngay gan nhat. */
  quet_7_ngay: number;
  khop: KetKhop;
}

/** Bo dau, bo moi thu khong phai chu/so — `Nguyễn Thúy Hằng` -> `NGUYENTHUYHANG`. */
function gon(s: string): string {
  return bo_dau(s).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Ten goi tren may co phai cua nguoi nay khong — dung de XAC NHAN khop (cham chap).
 *
 * May ZKTeco gioi han 24 ky tu ASCII va nhan su go tay, nen chap nhan: ten day du, ten may nam
 * trong ho ten (hoac nguoc lai), va ten may bat dau bang MOT tu cua ho ten (`Lankt` -> `LAN`,
 * `Thaottskt` -> `THAO`). Tu phai dai tu 3 ky tu: hai ky tu thi gan nhu ten nao cung "khop".
 */
export function khop_ten(ten_may: string | null, ho_ten: string | null): boolean {
  const a = gon(ten_may ?? '');
  const b = gon(ho_ten ?? '');
  if (a === '' || b === '') return false;
  if (a.includes(b) || b.includes(a)) return true;
  for (const tu of (ho_ten ?? '').split(/\s+/)) {
    const t = gon(tu);
    if (t.length >= 3 && a.startsWith(t)) return true;
  }
  return false;
}

/**
 * Ten goi tren may co phai cua nguoi nay khong — dung de BUOC TOI mot nguoi KHAC (chat).
 *
 * Phai chat hon `khop_ten`: quy tac "bat dau bang mot tu" o kia khien `Nguyen Ngan Ha` khop
 * voi ca 19 nguoi ho Nguyen chi vi chu "Nguyen". O day doi hoi ten may ghep DUOC tu cac tu cua
 * ho ten THEO DUNG THU TU (bo qua duoc tu dem/ten lot) va an het ten may — vd `ThanThiVanAnh`,
 * `HuangSuPing`, `NguyenNganHa`. Ten may ngan hon 4 ky tu (`Sep`, `Ta`) khong du de buoc toi ai.
 */
export function khop_ten_manh(ten_may: string | null, ho_ten: string | null): boolean {
  const a = gon(ten_may ?? '');
  if (a.length < 4) return false;
  const tu = (ho_ten ?? '').split(/\s+/).map(gon).filter((t) => t.length >= 2);
  if (tu.length === 0) return false;

  const da_thu = new Set<string>();
  const thu = (vi_tri: number, i: number): boolean => {
    if (vi_tri === a.length) return true;
    if (i >= tu.length) return false;
    const khoa = `${String(vi_tri)}:${String(i)}`;
    if (da_thu.has(khoa)) return false;
    da_thu.add(khoa);
    if (thu(vi_tri, i + 1)) return true;            // bo qua tu nay
    const t = tu[i] as string;
    if (a.startsWith(t, vi_tri) && thu(vi_tri + t.length, i + 1)) return true;
    // Tu bi cat ngan tren may: `HuangSuPing` cho `Huang Shu Ping`, `...VanAn` cho `Vân Anh`.
    // It nhat 2 ky tu — mot ky tu thi ten nao cung ghep duoc.
    const toi_da = Math.min(t.length - 1, a.length - vi_tri);
    for (let k = toi_da; k >= 2; k--) {
      if (t.startsWith(a.slice(vi_tri, vi_tri + k)) && thu(vi_tri + k, i + 1)) return true;
    }
    return false;
  };
  return thu(0, 0);
}

/** Xep loai khop giua ten tren may va nguoi giu PIN trong he thong. */
export function xep_khop(
  ten_may: string | null,
  nhan_vien_id: string | null,
  ho_ten: string | null,
  dang_hoat_dong: boolean | null,
  quet_7_ngay: number,
): KetKhop {
  if (nhan_vien_id === null) {
    return quet_7_ngay > 0 ? 'co_quet_chua_gan' : 'chua_gan';
  }
  if (dang_hoat_dong === false) return 'da_nghi';
  if (ten_may === null || ten_may.trim() === '') return 'khong_ten';
  return khop_ten(ten_may, ho_ten) ? 'khop' : 'lech';
}

/** Doi chieu user cua MOT may (serial != null) hoac TAT CA may (serial = null). */
export async function doi_chieu_may(serial: string | null): Promise<DongDoiChieu[]> {
  const [ds, ds_nv] = await Promise.all([
    truy_van<Omit<DongDoiChieu, 'khop'>>(
    `select mnd.thiet_bi_serial, mnd.pin, mnd.ten_may, mnd.the, mnd.quyen, mnd.thay_luc,
            sys.nhan_vien_id, sys.ma_nv, sys.ho_ten, sys.dang_hoat_dong,
            coalesce(quet.so_luot, 0)::int as quet_7_ngay
       from may_nguoi_dung mnd
       left join lateral (
         select nv.id as nhan_vien_id, nv.ma_nv, nv.ho_ten, nv.dang_hoat_dong
           from (
             select nhan_vien_id from ma_dinh_danh
              where he_thong='may_cham_cong' and ma_chuan=mnd.pin and hieu_luc_den is null
             union
             select id from nhan_vien where pin_may=mnd.pin
           ) x join nhan_vien nv on nv.id=x.nhan_vien_id
          order by nv.dang_hoat_dong desc
          limit 1
       ) sys on true
       left join lateral (
         select count(*) as so_luot from lan_quet lq
          where lq.thiet_bi_serial = mnd.thiet_bi_serial and lq.pin_may = mnd.pin
            and lq.thoi_diem > now() - interval '7 days'
       ) quet on true
      where ($1::text is null or mnd.thiet_bi_serial = $1)
      order by mnd.thiet_bi_serial, mnd.pin`,
      [serial],
    ),
    truy_van<{ id: string; ho_ten: string }>('select id, ho_ten from nhan_vien'),
  ]);
  return ds.map((u) => {
    let kq = xep_khop(u.ten_may, u.nhan_vien_id, u.ho_ten, u.dang_hoat_dong, u.quet_7_ngay);
    // Ten tren may khong khop chu PIN nhung cung khong phai cua ai khac -> ten goi tat. Khong
    // phai gan nham, chi la nhan hien thi cua may — tach ra de canh bao do khong keu oan.
    if (kq === 'lech' && !thuoc_nguoi_khac(u.ten_may, u.nhan_vien_id, ds_nv)) kq = 'ten_khac';
    return { ...u, khop: kq };
  });
}

/** Ten goi tren may co phai cua MOT nhan vien khac (khong phai chu PIN) khong. */
function thuoc_nguoi_khac(
  ten_may: string | null,
  chu_pin_id: string | null,
  ds_nv: readonly { id: string; ho_ten: string }[],
): boolean {
  if (ten_may === null || ten_may.trim() === '') return false;
  return ds_nv.some((nv) => nv.id !== chu_pin_id && khop_ten_manh(ten_may, nv.ho_ten));
}

export interface DemPinVanDe {
  /** PIN thuoc nguoi khac / co nguoi quet ma chua gan — luot quet se bi gan nham hoac bi bo. */
  trung_nguoi: number;
  /** PIN chua gan va khong ai quet — user cu nam lai tren may. */
  chua_gan: number;
  /** PIN cua nguoi da nghi viec, con tren may. */
  da_nghi: number;
  /** Ten goi tat tren may (Sep, Tanh, Kly) — chi la nhan hien thi, khong phai gan nham. */
  ten_khac: number;
  /** Tong so PIN phai xu ly (khong tinh PIN da nghi — ho da roi khoi luong van hanh). */
  can_xu_ly: number;
}

/**
 * Dem PIN co van de — dung cho canh bao dashboard.
 *
 * DEM THEO PIN chu khong theo dong: hai may VP (cong vao / cong ra) giu cung mot danh sach
 * user, nen dem theo dong thi cung mot nguoi bi tinh hai lan va con so tren man hinh khong
 * con nghia "bao nhieu nguoi phai sua".
 *
 * CHI TINH MAY DANG BAT: may da tat thi khong gui duoc luot quet nao, nen user tren do khong
 * con la rui ro gan nham — va mot canh bao khong the tat la mot canh bao khong ai doc. Bat may
 * lai thi canh bao hien lai, dung luc can don.
 */
export async function dem_pin_van_de(): Promise<DemPinVanDe> {
  const [ds, bat] = await Promise.all([
    doi_chieu_may(null),
    truy_van<{ serial: string }>('select serial from thiet_bi where dang_bat = true'),
  ]);
  const may_bat = new Set(bat.map((m) => m.serial));
  const dang_chay = ds.filter((u) => may_bat.has(u.thiet_bi_serial));
  const dem = (tt: KetKhop): number =>
    new Set(dang_chay.filter((u) => u.khop === tt).map((u) => u.pin)).size;
  const trung_nguoi = dem('lech') + dem('co_quet_chua_gan');
  const chua_gan = dem('chua_gan');
  return {
    trung_nguoi,
    chua_gan,
    da_nghi: dem('da_nghi'),
    ten_khac: dem('ten_khac'),
    can_xu_ly: trung_nguoi + chua_gan,
  };
}
