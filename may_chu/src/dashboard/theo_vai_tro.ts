// Trang Tong quan, dung theo VAI TRO cua nguoi dang xem.
//
// TRUOC BAN NAY, `/api/dashboard` la `can_dang_nhap` va tra ve MOT payload duy nhat cho
// moi nguoi: tong quan so nhan vien toan cong ty, so nguoi vang, va DANH SACH DICH DANH
// muoi nguoi di muon hom nay kem so phut muon.
//
// Nghia la mot tai khoan `nhan_vien` binh thuong mo trang chu ra la doc duoc ai di muon
// bao nhieu phut trong ca cong ty. Khong ai co y do — chi la trang duoc viet khi he thong
// moi co mot loai nguoi dung, roi khong ai quay lai. Cac duong khac (`bang_cong`,
// `lan_quet`) deu da co `pham_vi_nhan_vien`; rieng duong nay khong.
//
// BON LOP, va moi lop chi them vao lop duoi:
//
//   toi        ai co ho so nhan vien      cong cua chinh minh
//   phong      truong phong               phong minh, khong hon
//   cong_ty    nhan su tro len            toan cong ty
//   he_thong   admin                      may cham cong, dong bo, luu tru
//
// Truong nao khong duoc phep xem thi KHONG CO trong payload, chu khong phai co roi de
// giao dien an di. An o giao dien la an gia: du lieu van di qua duong truyen va van hien
// ra trong tab Network.
import { truy_van, truy_van_mot } from '../csdl/ket_noi.ts';
import { la_quan_tri, la_vai_tro_nhan_su } from '../bao_mat/quyen_ho_so.ts';
import { cau_hinh } from '../cau_hinh.ts';
import { hop_dong_sap_het_han, muc_gap } from '../hop_dong/nhac_han.ts';

export interface NguoiXemDashboard {
  vai_tro: string;
  /** nhan_vien_id gan voi tai khoan; null neu tai khoan chua noi voi ho so nao. */
  nv: string | null;
}

// ---------------------------------------------------------------- lop 1: cua toi

export interface CongNgay {
  trang_thai: string;
  gio_vao: string | null;
  gio_ra: string | null;
  phut_muon: number;
  phut_ot: number;
}

export interface CongCuaToi {
  hom_nay: CongNgay | null;
  thang: {
    thang: string;
    so_cong: number;
    ngay_di_muon: number;
    ngay_vang: number;
    phut_ot: number;
    phut_muon: number;
  };
  phep: { quy: number; da_dung: number; con_lai: number; cho_duyet: number };
  don_cua_toi_cho_duyet: number;
}

export async function cong_cua_toi(nv_id: string, hom_nay: string): Promise<CongCuaToi> {
  const thang = hom_nay.slice(0, 7);

  const [ngay, thang_nay, nv, don] = await Promise.all([
    truy_van_mot<CongNgay>(
      `select trang_thai, gio_vao, gio_ra, phut_muon, phut_ot
         from bang_cong_ngay where nhan_vien_id = $1 and ngay = $2`,
      [nv_id, hom_nay],
    ),
    truy_van_mot<{
      so_cong: string; ngay_di_muon: number; ngay_vang: number;
      phut_ot: number; phut_muon: number;
    }>(
      `select coalesce(sum(so_cong), 0)                       as so_cong,
              count(*) filter (where phut_muon > 0)::int      as ngay_di_muon,
              count(*) filter (where trang_thai = 'vang')::int as ngay_vang,
              coalesce(sum(phut_ot), 0)::int                  as phut_ot,
              coalesce(sum(phut_muon), 0)::int                as phut_muon
         from bang_cong_ngay
        where nhan_vien_id = $1 and to_char(ngay, 'YYYY-MM') = $2`,
      [nv_id, thang],
    ),
    truy_van_mot<{ so_ngay_phep_nam: string }>(
      'select so_ngay_phep_nam from nhan_vien where id = $1', [nv_id],
    ),
    truy_van_mot<{ so: number }>(
      `select (
         (select count(*) from don_nghi_phep  where nhan_vien_id = $1 and trang_thai = 'cho_duyet')
       + (select count(*) from don_giai_trinh where nhan_vien_id = $1 and trang_thai = 'cho_duyet')
       )::int as so`,
      [nv_id],
    ),
  ]);

  const quy = Number(nv?.so_ngay_phep_nam ?? 12);
  const phep = await quy_phep_nam(nv_id, hom_nay.slice(0, 4), quy);

  return {
    hom_nay: ngay,
    thang: {
      thang,
      so_cong: Number(thang_nay?.so_cong ?? 0),
      ngay_di_muon: thang_nay?.ngay_di_muon ?? 0,
      ngay_vang: thang_nay?.ngay_vang ?? 0,
      phut_ot: thang_nay?.phut_ot ?? 0,
      phut_muon: thang_nay?.phut_muon ?? 0,
    },
    phep,
    don_cua_toi_cho_duyet: don?.so ?? 0,
  };
}

/**
 * Phep nam da dung / con lai.
 *
 * Chi `phep_nam` tru vao quy — nghi om, thai san, ket hon, hieu deu la che do rieng. Don
 * vat qua hai nam (28/12 -> 03/01) chi tinh phan nam trong nam dang xet.
 */
async function quy_phep_nam(nv_id: string, nam: string, quy: number): Promise<{
  quy: number; da_dung: number; con_lai: number; cho_duyet: number;
}> {
  const r = await truy_van_mot<{ da_dung: string; cho_duyet: string }>(
    `with ngay_nghi as (
       select d.trang_thai, d.nua_ngay,
              generate_series(
                greatest(d.tu_ngay,  make_date($2::int, 1, 1)),
                least   (d.den_ngay, make_date($2::int, 12, 31)),
                interval '1 day'
              )::date as ngay
         from don_nghi_phep d
        where d.nhan_vien_id = $1 and d.loai = 'phep_nam'
          and d.trang_thai in ('da_duyet', 'cho_duyet')
     )
     select coalesce(sum(case when trang_thai = 'da_duyet'
                              then (case when nua_ngay then 0.5 else 1 end) end), 0) as da_dung,
            coalesce(sum(case when trang_thai = 'cho_duyet'
                              then (case when nua_ngay then 0.5 else 1 end) end), 0) as cho_duyet
       from ngay_nghi`,
    [nv_id, nam],
  );
  const da_dung = Number(r?.da_dung ?? 0);
  return {
    quy,
    da_dung,
    con_lai: Math.round((quy - da_dung) * 10) / 10,
    cho_duyet: Number(r?.cho_duyet ?? 0),
  };
}

// ---------------------------------------------------------------- lop 2: phong cua toi

export interface TinhHinhNgay {
  tong_nhan_vien: number;
  co_mat: number;
  di_muon: number;
  vang: number;
  nghi_phep: number;
  chua_quet_ra: number;
}

export interface DiMuon {
  ma_nv: string;
  ho_ten: string;
  phut_muon: number;
  gio_vao: string | null;
}

export interface PhongCuaToi {
  phong_ban_id: string;
  ten_phong: string;
  tinh_hinh: TinhHinhNgay;
  di_muon_hom_nay: DiMuon[];
  cho_toi_duyet: number;
}

/**
 * Tinh hinh phong ban cua mot truong phong.
 *
 * Tra null khi tai khoan chua gan ho so, hoac nguoi do khong phai truong phong cua phong
 * nao — KHONG roi ve "xem ca cong ty". Mot vai tro `truong_phong` chua duoc gan phong thi
 * dung ra la khong thay gi ca; roi ve toan cong ty la bien mot thieu sot khai bao thanh
 * mot duong ro ri.
 */
export async function phong_cua_toi(
  nv_id: string, hom_nay: string,
): Promise<PhongCuaToi | null> {
  const pb = await truy_van_mot<{ id: string; ten: string }>(
    `select pb.id, pb.ten from phong_ban pb
      where pb.truong_phong_id = $1
      order by pb.ten limit 1`,
    [nv_id],
  );
  if (pb === null) return null;

  const [tinh_hinh, muon, duyet] = await Promise.all([
    truy_van_mot<TinhHinhNgay>(
      `select
         (select count(*) from nhan_vien
           where dang_hoat_dong = true and phong_ban_id = $2)::int      as tong_nhan_vien,
         count(*) filter (where bc.trang_thai = 'co_mat')::int          as co_mat,
         count(*) filter (where bc.phut_muon > 0)::int                  as di_muon,
         count(*) filter (where bc.trang_thai = 'vang')::int            as vang,
         count(*) filter (where bc.trang_thai = 'nghi_phep')::int       as nghi_phep,
         count(*) filter (where bc.gio_vao is not null
                            and bc.gio_vao = bc.gio_ra)::int            as chua_quet_ra
       from bang_cong_ngay bc
       join nhan_vien nv on nv.id = bc.nhan_vien_id
      where bc.ngay = $1 and nv.phong_ban_id = $2`,
      [hom_nay, pb.id],
    ),
    truy_van<DiMuon>(
      `select nv.ma_nv, nv.ho_ten, bc.phut_muon, bc.gio_vao
         from bang_cong_ngay bc join nhan_vien nv on nv.id = bc.nhan_vien_id
        where bc.ngay = $1 and bc.phut_muon > 0 and nv.phong_ban_id = $2
        order by bc.phut_muon desc limit 10`,
      [hom_nay, pb.id],
    ),
    truy_van_mot<{ so: number }>(
      `select (
         (select count(*) from don_nghi_phep d join nhan_vien nv on nv.id = d.nhan_vien_id
           where d.trang_thai = 'cho_duyet' and nv.phong_ban_id = $1)
       + (select count(*) from don_giai_trinh d join nhan_vien nv on nv.id = d.nhan_vien_id
           where d.trang_thai = 'cho_duyet' and nv.phong_ban_id = $1)
       )::int as so`,
      [pb.id],
    ),
  ]);

  return {
    phong_ban_id: pb.id,
    ten_phong: pb.ten,
    tinh_hinh: tinh_hinh ?? {
      tong_nhan_vien: 0, co_mat: 0, di_muon: 0, vang: 0, nghi_phep: 0, chua_quet_ra: 0,
    },
    di_muon_hom_nay: muon,
    cho_toi_duyet: duyet?.so ?? 0,
  };
}

// ---------------------------------------------------------------- lop 3: toan cong ty

export interface CongTy {
  tinh_hinh: TinhHinhNgay;
  di_muon_hom_nay: DiMuon[];
  cho_duyet: { nghi_phep: number; giai_trinh: number; quet_mobile: number };
  bay_ngay: { ngay: string; co_mat: number; di_muon: number; vang: number; phut_ot: number }[];
}

export async function toan_cong_ty(hom_nay: string): Promise<CongTy> {
  const [tinh_hinh, muon, cho_duyet, bay_ngay] = await Promise.all([
    truy_van_mot<TinhHinhNgay>(
      `select
         (select count(*) from nhan_vien where dang_hoat_dong = true)::int as tong_nhan_vien,
         count(*) filter (where trang_thai = 'co_mat')::int                as co_mat,
         count(*) filter (where phut_muon > 0)::int                        as di_muon,
         count(*) filter (where trang_thai = 'vang')::int                  as vang,
         count(*) filter (where trang_thai = 'nghi_phep')::int             as nghi_phep,
         count(*) filter (where gio_vao is not null and gio_vao = gio_ra)::int as chua_quet_ra
       from bang_cong_ngay where ngay = $1`,
      [hom_nay],
    ),
    truy_van<DiMuon>(
      `select nv.ho_ten, nv.ma_nv, bc.phut_muon, bc.gio_vao
         from bang_cong_ngay bc join nhan_vien nv on nv.id = bc.nhan_vien_id
        where bc.ngay = $1 and bc.phut_muon > 0
        order by bc.phut_muon desc limit 10`,
      [hom_nay],
    ),
    truy_van_mot<{ nghi_phep: number; giai_trinh: number; quet_mobile: number }>(
      `select
         (select count(*) from don_nghi_phep  where trang_thai = 'cho_duyet')::int as nghi_phep,
         (select count(*) from don_giai_trinh where trang_thai = 'cho_duyet')::int as giai_trinh,
         (select count(*) from lan_quet where trang_thai_duyet = 'cho_duyet')::int as quet_mobile`,
    ),
    truy_van<{ ngay: string; co_mat: number; di_muon: number; vang: number; phut_ot: number }>(
      `select ngay,
              count(*) filter (where trang_thai = 'co_mat')::int as co_mat,
              count(*) filter (where phut_muon > 0)::int         as di_muon,
              count(*) filter (where trang_thai = 'vang')::int   as vang,
              coalesce(sum(phut_ot), 0)::int                     as phut_ot
         from bang_cong_ngay
        where ngay > $1::date - 7 and ngay <= $1::date
        group by ngay order by ngay`,
      [hom_nay],
    ),
  ]);

  return {
    tinh_hinh: tinh_hinh ?? {
      tong_nhan_vien: 0, co_mat: 0, di_muon: 0, vang: 0, nghi_phep: 0, chua_quet_ra: 0,
    },
    di_muon_hom_nay: muon,
    cho_duyet: cho_duyet ?? { nghi_phep: 0, giai_trinh: 0, quet_mobile: 0 },
    bay_ngay,
  };
}

// ---------------------------------------------------------------- lop 3b: viec cua nhan su

export interface ViecNhanSu {
  /** Hop dong da het han ma chua ai xu ly. Con so can thay dau tien. */
  hop_dong_het_han: number;
  hop_dong_sap_het_han: number;
  sap_het_han: {
    nhan_vien_id: string; ma_nv: string; ho_ten: string; so_hd: string | null;
    hieu_luc_den: string; so_ngay_con: number; muc_gap: string;
  }[];
  /** Nguoi chua co email -> khong dang nhap Microsoft duoc. */
  thieu_email: number;
  /** Nguoi chua gan PIN may -> KHONG CHAM CONG DUOC. Nang hon thieu email. */
  chua_gan_pin: number;
  /** Nguoi chua gan phong ban -> khong ai duyet don cho ho, khong loc bao cao duoc. */
  chua_co_phong_ban: number;
  /** Ho so con thieu tai lieu bat buoc. */
  thieu_tai_lieu: number;
}

export async function viec_cua_nhan_su(): Promise<ViecNhanSu> {
  const [hd, dem, tai_lieu] = await Promise.all([
    hop_dong_sap_het_han(45),
    truy_van_mot<{ thieu_email: number; chua_gan_pin: number; chua_co_phong_ban: number }>(
      `select
         count(*) filter (where email is null or btrim(email) = '')::int as thieu_email,
         count(*) filter (where pin_may is null or btrim(pin_may) = '')::int as chua_gan_pin,
         count(*) filter (where phong_ban_id is null)::int as chua_co_phong_ban
       from nhan_vien where dang_hoat_dong = true`,
    ),
    truy_van_mot<{ so: number }>(
      // Dem NGUOI, khong dem dong: "12 nguoi con thieu giay to" la con so nhan su can,
      // "37 dong thieu" thi khong noi len ai phai goi dien cho ai.
      `select count(distinct nv.id)::int as so
         from nhan_vien nv
         cross join danh_muc_tai_lieu dm
         left join tai_lieu_nhan_vien tl
           on tl.nhan_vien_id = nv.id and tl.danh_muc_id = dm.id
        where nv.dang_hoat_dong = true
          and dm.bat_buoc = true and dm.dang_dung = true
          and dm.chi_khi_nghi_viec = false
          and coalesce(tl.trang_thai, 'thieu') <> 'da_len_phan_mem'`,
    ),
  ]);

  return {
    hop_dong_het_han: hd.filter((h) => h.so_ngay_con < 0).length,
    hop_dong_sap_het_han: hd.filter((h) => h.so_ngay_con >= 0).length,
    sap_het_han: hd.slice(0, 8).map((h) => ({
      nhan_vien_id: h.nhan_vien_id,
      ma_nv: h.ma_nv,
      ho_ten: h.ho_ten,
      so_hd: h.so_hd,
      hieu_luc_den: h.hieu_luc_den,
      so_ngay_con: h.so_ngay_con,
      muc_gap: muc_gap(h.so_ngay_con),
    })),
    thieu_email: dem?.thieu_email ?? 0,
    chua_gan_pin: dem?.chua_gan_pin ?? 0,
    chua_co_phong_ban: dem?.chua_co_phong_ban ?? 0,
    thieu_tai_lieu: tai_lieu?.so ?? 0,
  };
}

// ---------------------------------------------------------------- lop 3c: ra/vao van phong (HR)

export interface CanhBaoRaVaoDong {
  id: string;
  nhan_vien_id: string;
  ma_nv: string;
  ho_ten: string;
  phong_ban: string | null;
  ma_loi: string;
  /** Moc ISO (timestamptz) — giao dien tu doi ve gio may cham cong. */
  thoi_diem: string;
  mo_ta: string;
}

export interface RaNgoaiDong {
  nhan_vien_id: string;
  ma_nv: string;
  ho_ten: string;
  phong_ban: string | null;
  phut_ra_ngoai: number;
  so_phien: number;
}

export interface RaVaoHR {
  /** Dang trong van phong ngay LUC NAY (chua quet ra tinh toi thoi diem tinh gan nhat). */
  dang_trong: number;
  /** Ve som hom nay (co phut_ve_som > 0). */
  ve_som: number;
  /** Tong phut ra ngoai trong gio lam hom nay (da tru phan trum gio nghi trua). */
  tong_phut_ra_ngoai: number;
  so_nguoi_ra_ngoai: number;
  /** Dem canh bao mau thuan theo tung ma loi, cho cac o tong quan. */
  canh_bao_theo_loai: { ma_loi: string; so: number }[];
  /** Danh sach dich danh canh bao hom nay (gioi han de trang khong dai vo ke). */
  canh_bao: CanhBaoRaVaoDong[];
  /** Ra ngoai nhieu nhat hom nay. */
  ra_ngoai_nhieu: RaNgoaiDong[];
}

/**
 * Tinh hinh ra/vao van phong hom nay cho nhan su. Doc tu `ra_vao_ngay` + `canh_bao_ra_vao`
 * (do `tinh_lai_ngay` ghi song song moi lan tinh cong) va `bang_cong_ngay` (ve som).
 *
 * Chi tra khi nguoi xem la nhan su — gan o `dashboard_cho`, giong cac lop cong ty / nhan su.
 */
export async function ra_vao_hr(hom_nay: string): Promise<RaVaoHR> {
  const [tong, ve_som, theo_loai, canh_bao, ra_ngoai] = await Promise.all([
    truy_van_mot<{ dang_trong: number; tong_phut_ra_ngoai: number; so_nguoi_ra_ngoai: number }>(
      `select count(*) filter (where con_trong_van_phong)::int as dang_trong,
              coalesce(sum(phut_ra_ngoai), 0)::int             as tong_phut_ra_ngoai,
              count(*) filter (where phut_ra_ngoai > 0)::int   as so_nguoi_ra_ngoai
         from ra_vao_ngay where ngay = $1`,
      [hom_nay],
    ),
    truy_van_mot<{ so: number }>(
      `select count(*) filter (where phut_ve_som > 0)::int as so
         from bang_cong_ngay where ngay = $1`,
      [hom_nay],
    ),
    truy_van<{ ma_loi: string; so: number }>(
      `select ma_loi, count(*)::int as so
         from canh_bao_ra_vao where ngay = $1 group by ma_loi`,
      [hom_nay],
    ),
    truy_van<CanhBaoRaVaoDong>(
      `select cb.id, cb.nhan_vien_id, nv.ma_nv, nv.ho_ten, pb.ten as phong_ban,
              cb.ma_loi, cb.thoi_diem, cb.mo_ta
         from canh_bao_ra_vao cb
         join nhan_vien nv on nv.id = cb.nhan_vien_id
         left join phong_ban pb on pb.id = nv.phong_ban_id
        where cb.ngay = $1
        order by cb.thoi_diem limit 50`,
      [hom_nay],
    ),
    truy_van<RaNgoaiDong>(
      `select rv.nhan_vien_id, nv.ma_nv, nv.ho_ten, pb.ten as phong_ban,
              rv.phut_ra_ngoai, rv.so_phien_ra_ngoai as so_phien
         from ra_vao_ngay rv
         join nhan_vien nv on nv.id = rv.nhan_vien_id
         left join phong_ban pb on pb.id = nv.phong_ban_id
        where rv.ngay = $1 and rv.phut_ra_ngoai > 0
        order by rv.phut_ra_ngoai desc limit 10`,
      [hom_nay],
    ),
  ]);

  return {
    dang_trong: tong?.dang_trong ?? 0,
    ve_som: ve_som?.so ?? 0,
    tong_phut_ra_ngoai: tong?.tong_phut_ra_ngoai ?? 0,
    so_nguoi_ra_ngoai: tong?.so_nguoi_ra_ngoai ?? 0,
    canh_bao_theo_loai: theo_loai,
    canh_bao,
    ra_ngoai_nhieu: ra_ngoai,
  };
}

// ---------------------------------------------------------------- lop 4: he thong

export interface HeThong {
  thiet_bi: { ten: string; serial: string; dang_online: boolean; thay_lan_cuoi: string | null }[];
  /** Ban ghi ERP da noi duoc voi nhan vien. */
  erp_da_noi: number;
  erp_da_cau_hinh: boolean;
}

export async function tinh_trang_he_thong(): Promise<HeThong> {
  const [may, erp] = await Promise.all([
    truy_van<HeThong['thiet_bi'][number]>(
      `select ten, serial, thay_lan_cuoi,
              (thay_lan_cuoi is not null
               and thay_lan_cuoi > now() - ($1 || ' seconds')::interval) as dang_online
         from thiet_bi where dang_bat = true order by ten`,
      [String(cau_hinh.may_offline_sau_giay)],
    ),
    truy_van_mot<{ so: number }>(
      'select count(*)::int as so from nhan_vien where erp_user_id is not null',
    ),
  ]);
  return {
    thiet_bi: may,
    erp_da_noi: erp?.so ?? 0,
    erp_da_cau_hinh: cau_hinh.erp.url !== '' && cau_hinh.erp.api_key !== '',
  };
}

// ---------------------------------------------------------------- ghep theo vai tro

export interface Dashboard {
  ngay: string;
  vai_tro: string;
  toi: CongCuaToi | null;
  phong: PhongCuaToi | null;
  cong_ty: CongTy | null;
  ra_vao: RaVaoHR | null;
  nhan_su: ViecNhanSu | null;
  he_thong: HeThong | null;
}

/**
 * Dung payload dung bang voi quyen cua nguoi xem.
 *
 * Lop nao khong duoc phep thi la `null` — KHONG lay du roi de giao dien an di. An o giao
 * dien la an gia: du lieu van di qua duong truyen, van nam trong bo nho trinh duyet, va
 * van hien ra trong tab Network cho bat ky ai mo cong cu phat trien.
 */
export async function dashboard_cho(
  nd: NguoiXemDashboard, hom_nay: string,
): Promise<Dashboard> {
  const la_nhan_su = la_vai_tro_nhan_su(nd.vai_tro);
  const la_admin = la_quan_tri(nd.vai_tro);

  // Ai co ho so nhan vien deu xem duoc cong cua chinh minh — ke ca admin va nhan su, vi
  // ho cung di lam va cung phai biet minh di muon may phut.
  const toi = nd.nv === null ? null : await cong_cua_toi(nd.nv, hom_nay);

  // Truong phong: chi phong minh. Nhan su tro len khong can lop nay vi da co toan cong ty.
  const phong = !la_nhan_su && nd.vai_tro === 'truong_phong' && nd.nv !== null
    ? await phong_cua_toi(nd.nv, hom_nay)
    : null;

  const cong_ty = la_nhan_su ? await toan_cong_ty(hom_nay) : null;
  const ra_vao = la_nhan_su ? await ra_vao_hr(hom_nay) : null;
  const nhan_su = la_nhan_su ? await viec_cua_nhan_su() : null;
  const he_thong = la_admin ? await tinh_trang_he_thong() : null;

  return { ngay: hom_nay, vai_tro: nd.vai_tro, toi, phong, cong_ty, ra_vao, nhan_su, he_thong };
}
