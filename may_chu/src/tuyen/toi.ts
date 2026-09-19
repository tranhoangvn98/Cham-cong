// API self-service cho app dien thoai: xem cong cua chinh minh, gui don, va
// cham cong bang GPS + selfie khi di cong tac.
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { truy_van, truy_van_mot, thuc_thi, trong_giao_dich } from '../csdl/ket_noi.ts';
import { can_dang_nhap, nguoi_dung_hien_tai, xem_duoc_tat_ca } from '../bao_mat/xac_thuc.ts';
import { la_nguoi_duyet } from '../bao_mat/quyen_ho_so.ts';
import { cau_hinh } from '../cau_hinh.ts';
import { tinh_lai_khoang, tinh_lai_ngay } from '../cong/tinh_cong.ts';
import { ghi_su_kien } from '../su_kien/hop_thu_di.ts';
import { gui_ngam, tai_khoan_duyet_ot_cap_1, tai_khoan_duyet_ot_cap_2, tai_khoan_nguoi_duyet } from '../su_kien/thong_bao_day.ts';
import { do_geofence, type DiaDiem } from '../tien_ich/dia_ly.ts';
import { doc_anh_selfie, luu_anh_selfie } from '../tien_ich/luu_anh.ts';
import { doc_tep_ho_so, luu_tep_ho_so, lam_sach_ten, xoa_tep_ho_so } from '../tien_ich/luu_tep.ts';
import { tra_loi_tro_ly } from '../ca_nhan/tro_ly.ts';
import { ghi_nhat_ky } from '../tien_ich/nhat_ky.ts';
import {
  cong_ngay, khoang_thang, ngay_dia_phuong, ngay_viet, thu_trong_tuan,
} from '../tien_ich/thoi_gian.ts';
import { NHAN_TRANG_THAI, nhan_cach_xac_thuc } from '../adms/giao_thuc.ts';
import {
  con_xu_ly, doi_tuong_truy, thong_bao_cong_ty_id, type DoiTuongTruy,
  NHAN_TRANG_THAI as NHAN_TRANG_THAI_BAO,
} from './trang_thai_bao.ts';
import { CAC_LOAI, MA_LOAI_DON, dac_ta, type MaLoaiDon } from '../don_tu/loai_don.ts';
import { don_cua_nhan_vien, huy_don, tao_don } from '../don_tu/nghiep_vu.ts';
import { ket_qua_cua_don, nop_ket_qua } from '../don_tu/ket_qua_ot.ts';
import { tu_dong_quyet_don, TU_NGAY_AP } from '../don_tu/tu_dong_duyet.ts';
import { tu_dong_quyet_di_muon } from '../don_tu/tu_dong_di_muon.ts';
import { email_nhan_vien_tra_loi } from '../luong/khieu_nai_email.ts';
import {
  chi_tiet_ky_luat_theo_phieu, chi_tiet_di_muon_theo_phieu, type DongLietKe,
} from '../luong/chi_tiet_ky_luat.ts';
import {
  chuoi, chuoi_bat_buoc, gio, khoang_ngay, luan_ly, ngay_bat_buoc, than, trong_tap, uuid,
  LoiDauVao, LoiKhongQuyen, LoiKhongTim, LoiXungDot,
} from '../tien_ich/kiem_tra.ts';

const LOAI_NGHI = ['phep_nam', 'khong_luong', 'om', 'thai_san', 'ket_hon', 'hieu'] as const;

/** Ten tieng Viet cua tung loai nghi, dung trong noi dung thong bao day. */
const NHAN_LOAI_NGHI: Record<typeof LOAI_NGHI[number], string> = {
  phep_nam: 'nghỉ phép năm',
  khong_luong: 'nghỉ không lương',
  om: 'nghỉ ốm',
  thai_san: 'nghỉ thai sản',
  ket_hon: 'nghỉ kết hôn',
  hieu: 'nghỉ việc hiếu',
};

/** Ho ten de dua vao thong bao. Khong tim thay thi tra chuoi trung tinh, khong nem loi. */
async function ten_nhan_vien(nhan_vien_id: string): Promise<string> {
  const d = await truy_van_mot<{ ho_ten: string }>(
    'select ho_ten from nhan_vien where id = $1', [nhan_vien_id],
  );
  return d?.ho_ten ?? 'Một nhân viên';
}

/** Khoang cach toi thieu giua hai lan cham cong bang dien thoai (giay). */
const GIAN_CACH_TOI_THIEU_GIAY = 60;

/** Mot dong thong bao rieng. `trang_thai`/`nhan_trang_thai`/`con_xu_ly` suy live luc tra ve. */
interface BaoThongBao {
  id: string;
  tieu_de: string;
  noi_dung: string;
  du_lieu: unknown;
  da_doc: boolean;
  doc_luc: string | null;
  tao_luc: string;
  trang_thai: string | null;
  nhan_trang_thai: string | null;
  con_xu_ly: boolean;
}

/**
 * Suy trang thai xu ly LIVE cho tung thong bao: don/khieu nai/vi pham tra theo trang thai
 * cua ban ghi hien tai; thong bao cong ty "can giai trinh" tra cho_giai_trinh/da_xu_ly theo
 * nguoi doc; thuần tin (hop dong het han, nhac nho) de null. Mot truy van cho moi bang
 * (id = any(...)), khong phai mot truy van cho moi dong.
 */
async function gan_trang_thai_bao(ds: BaoThongBao[], nv: string | null): Promise<void> {
  const theo_bang = new Map<string, string[]>();
  const doi_tuong: (DoiTuongTruy | null)[] = [];
  const tb_ids: string[] = [];
  for (const b of ds) {
    const dt = doi_tuong_truy(b.du_lieu);
    doi_tuong.push(dt);
    if (dt !== null) {
      const mang = theo_bang.get(dt.bang) ?? [];
      mang.push(dt.id);
      theo_bang.set(dt.bang, mang);
    } else {
      const t = thong_bao_cong_ty_id(b.du_lieu);
      if (t !== null) tb_ids.push(t);
    }
  }

  const bang_trang_thai = new Map<string, Map<string, string>>();
  for (const [bang, ids] of theo_bang) {
    const dong = await truy_van<{ id: string; trang_thai: string }>(
      `select id, trang_thai from ${bang} where id = any($1::uuid[])`, [ids],
    );
    bang_trang_thai.set(bang, new Map(dong.map((d) => [d.id, d.trang_thai])));
  }

  const tb_trang_thai = new Map<string, string>();
  if (tb_ids.length > 0 && nv !== null) {
    const dong = await truy_van<{ id: string; trang_thai: string | null }>(
      `select tb.id,
              case when tb.can_giai_trinh and dd.giai_trinh is null then 'cho_giai_trinh'
                   when tb.can_giai_trinh then 'da_xu_ly' end as trang_thai
         from thong_bao tb
         left join thong_bao_da_doc dd on dd.thong_bao_id = tb.id and dd.nhan_vien_id = $2::uuid
        where tb.id = any($1::uuid[])`,
      [tb_ids, nv],
    );
    for (const d of dong) if (d.trang_thai !== null) tb_trang_thai.set(d.id, d.trang_thai);
  }

  ds.forEach((b, i) => {
    const dt = doi_tuong[i] ?? null;
    let trang_thai: string | null = null;
    if (dt !== null) {
      trang_thai = bang_trang_thai.get(dt.bang)?.get(dt.id) ?? null;
    } else {
      const t = thong_bao_cong_ty_id(b.du_lieu);
      if (t !== null) trang_thai = tb_trang_thai.get(t) ?? null;
    }
    b.trang_thai = trang_thai;
    b.nhan_trang_thai = trang_thai === null
      ? null
      : (NHAN_TRANG_THAI_BAO[trang_thai] ?? trang_thai);
    b.con_xu_ly = con_xu_ly(trang_thai);
  });
}

/**
 * Tong hop cong mot thang. Dung cho ca /hom-nay (4 chi so o Trang chu), /bang-cong
 * (Man Bang cong) va /luong (co so tinh luong) — mot cau truy van, mot dinh nghia.
 *
 * `tong_phut_ot` la OT MAY GHI NHAN, chua qua duyet. Khi lam Module C, tien OT chi tra
 * theo phut OT DA DUYET — xem ghi chu o endpoint /luong.
 */
async function tong_hop_thang(nv_id: string, thang: string): Promise<unknown> {
  const { tu, den } = khoang_thang(thang);
  return truy_van_mot(
    `select coalesce(sum(so_cong), 0)        as tong_cong,
            coalesce(sum(phut_lam), 0)::int  as tong_phut_lam,
            coalesce(sum(phut_ot), 0)::int   as tong_phut_ot,
            coalesce(sum(phut_muon), 0)::int as tong_phut_muon,
            coalesce(sum(phut_ve_som), 0)::int as tong_phut_ve_som,
            count(*) filter (where trang_thai = 'co_mat')::int    as so_ngay_co_mat,
            count(*) filter (where trang_thai = 'vang')::int      as so_ngay_vang,
            count(*) filter (where trang_thai = 'nghi_phep')::int as so_ngay_nghi_phep,
            count(*) filter (where trang_thai = 'ngay_le')::int   as so_ngay_le,
            count(*) filter (where phut_muon > 0)::int            as so_lan_di_muon,
            count(*) filter (where phut_ve_som > 0)::int          as so_lan_ve_som,
            count(*) filter (where trang_thai not in ('nghi_tuan', 'ngay_le'))::int
                                                                  as so_ngay_phai_lam,
            count(*) filter (where da_chot)::int                  as so_ngay_da_chot,
            count(*)::int                                         as so_ngay_co_du_lieu
       from bang_cong_ngay
      where nhan_vien_id = $1 and ngay >= $2 and ngay <= $3`,
    [nv_id, tu, den],
  );
}

/** Quy phep nam cua rieng nhan vien (HR dat theo tham nien / nghe — Dieu 113-114 BLLD). */
async function quy_phep_cua(nv_id: string): Promise<number> {
  const r = await truy_van_mot<{ so_ngay_phep_nam: string }>(
    'select so_ngay_phep_nam from nhan_vien where id = $1',
    [nv_id],
  );
  return Number(r?.so_ngay_phep_nam ?? 12);
}

/**
 * Quy phep nam con lai. Chi tru don PHEP NAM da duyet — nghi om/thai san/khong luong
 * khong tru vao quy phep nam.
 *
 * Nua ngay tinh 0,5. Don vat qua hai nam (VD 28/12 -> 03/01) chi tinh phan ngay nam
 * trong nam dang xet, nen `generate_series` cat theo bien nam thay vi lay ca don.
 */
async function quy_phep(nv_id: string, nam: string, quy: number): Promise<{
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
        where d.nhan_vien_id = $1
          and d.loai = 'phep_nam'
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

/**
 * Muc "Can chu y" o Trang chu. Vi thanh tab chi con 4 tab (Phu luc B), man Don tu khong
 * nam tren thanh tab nua — so dem o day la duong duy nhat truong phong biet co don cho
 * minh duyet, nen khong duoc bo.
 */
async function viec_can_chu_y(req: FastifyRequest, nv_id: string): Promise<{
  don_cua_toi_cho_duyet: number;
  don_cho_toi_duyet: number;
  hop_dong_sap_het_han: null;
}> {
  const nd = nguoi_dung_hien_tai(req);

  const cua_toi = await truy_van_mot<{ so: string }>(
    `select (select count(*) from don_nghi_phep
              where nhan_vien_id = $1 and trang_thai = 'cho_duyet')
          + (select count(*) from don_giai_trinh
              where nhan_vien_id = $1 and trang_thai = 'cho_duyet')
          + (select count(*) from don_tu
              where nhan_vien_id = $1 and trang_thai = 'cho_duyet') as so`,
    [nv_id],
  );

  let cho_toi_duyet = 0;
  if (la_nguoi_duyet(nd.vai_tro)) {
    const chi_phong_minh = !xem_duoc_tat_ca(nd);
    const r = await truy_van_mot<{ so: string }>(
      `select (select count(*) from don_nghi_phep d join nhan_vien nv on nv.id = d.nhan_vien_id
                where d.trang_thai = 'cho_duyet' and d.nhan_vien_id <> $2
                  and (not $1::boolean
                       or nv.phong_ban_id = (select phong_ban_id from nhan_vien where id = $2)))
            + (select count(*) from don_giai_trinh d join nhan_vien nv on nv.id = d.nhan_vien_id
                where d.trang_thai = 'cho_duyet' and d.nhan_vien_id <> $2
                  and (not $1::boolean
                       or nv.phong_ban_id = (select phong_ban_id from nhan_vien where id = $2)))
            + (select count(*) from don_tu d join nhan_vien nv on nv.id = d.nhan_vien_id
                where d.trang_thai = 'cho_duyet' and d.nhan_vien_id <> $2
                  and (not $1::boolean
                       or nv.phong_ban_id = (select phong_ban_id from nhan_vien where id = $2))) as so`,
      [chi_phong_minh, nv_id],
    );
    cho_toi_duyet = Number(r?.so ?? 0);
  }

  return {
    don_cua_toi_cho_duyet: Number(cua_toi?.so ?? 0),
    don_cho_toi_duyet: cho_toi_duyet,
    // Module D (hop dong) chua trien khai — tra null de app biet la "chua co tinh nang",
    // khong phai "khong co hop dong nao sap het han".
    hop_dong_sap_het_han: null,
  };
}

function nhan_vien_cua_toi(req: FastifyRequest): string {
  const nd = nguoi_dung_hien_tai(req);
  if (nd.nv === null) {
    throw new LoiKhongQuyen(
      'Tài khoản này không gắn với nhân viên nào nên không có dữ liệu chấm công cá nhân.',
    );
  }
  return nd.nv;
}

/** `den_ngay` tuy chon: co thi phai la ngay hop le, khong co thi null. */
function khoang_ngay_tuy_chon(b: Record<string, unknown>): string | null {
  return b['den_ngay'] === undefined || b['den_ngay'] === null || b['den_ngay'] === ''
    ? null
    : ngay_bat_buoc(b, 'den_ngay');
}

/** `tu_ngay` da doc o tren; doc lai de dat vao thong bao day. */
function kq_tu_ngay(b: Record<string, unknown>): string {
  return ngay_bat_buoc(b, 'tu_ngay');
}

/** Ma nhan vien + ho ten de dat vao duong dan thu muc kho tep. */
async function ma_va_ten_nhan_vien(
  nhan_vien_id: string,
): Promise<{ ma_nv: string; ho_ten: string }> {
  const d = await truy_van_mot<{ ma_nv: string; ho_ten: string }>(
    'select ma_nv, ho_ten from nhan_vien where id = $1', [nhan_vien_id]);
  if (d === null) throw new LoiKhongTim('Không tìm thấy nhân viên.');
  return d;
}

/** Anh ket qua OT chi nhan JPEG/PNG — kiem MAGIC BYTE, khong tin content-type client gui. */
function la_anh(d: Buffer): boolean {
  if (d.length < 12) return false;
  if (d[0] === 0xff && d[1] === 0xd8 && d[2] === 0xff) return true;
  return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    .every((x, i) => d[i] === x);
}

interface KhoanPhieuRa {
  phieu_luong_id: string;
  khoan_ma: string; ten: string; loai: string; nhom: string | null;
  so_luong: string | null; don_gia: string | null; thanh_tien: string;
  ghi_chu: string | null; chiu_thue: boolean;
}

/**
 * Phieu luong cua CHINH nhan vien — CHI ky da_duyet / da_tra (khong lo phieu chua chot). Tra ve
 * mang (moi nhat truoc), kem tung khoan thu nhap/tru. `chi_thang` != null thi loc ve 1 thang.
 * Dung chung cho ca man "Phieu luong" (mang) va man "Luong" ca nhan (lay phan tu dau).
 */
export async function phieu_luong_cua_toi(
  nv_id: string, chi_thang: string | null,
): Promise<Record<string, unknown>[]> {
  const phieu = await truy_van<{ id: string } & Record<string, unknown>>(
    `select p.id, p.nhan_vien_id, nv.ho_ten, nv.ma_nv, k.thang, k.trang_thai as trang_thai_ky,
            p.luong_co_ban, p.phu_cap, p.so_ngay_cong_chuan, p.so_ngay_cong_thuc,
            p.luong_ngay, p.luong_theo_cong, p.phut_ot, p.he_so_ot, p.tien_ot,
            p.phut_ot_nghi_tuan, p.phut_ot_le,
            p.tien_ot_thuong, p.tien_ot_nghi_tuan, p.tien_ot_le,
            p.he_so_ot_nghi_tuan, p.he_so_ot_le,
            p.thuong, p.phu_cap_khac,
            p.tong_thu_nhap, p.muc_dong_bh, p.so_nguoi_phu_thuoc, p.giam_tru_tong,
            p.thu_nhap_tinh_thue, p.bhxh_nld, p.bhyt_nld, p.bhtn_nld, p.thue_tncn,
            p.tru_khac, p.ly_do_tru_khac, p.ghi_chu, p.tong_tru, p.thuc_linh, p.thuc_linh_lam_tron,
            p.loai_hop_dong, p.ep_du_cong, p.mien_phat
       from phieu_luong p
       join ky_luong k on k.id = p.ky_luong_id
       join nhan_vien nv on nv.id = p.nhan_vien_id
      where p.nhan_vien_id = $1 and k.trang_thai in ('da_duyet', 'da_tra')
        and ($2::text is null or k.thang = $2)
      order by k.thang desc`,
    [nv_id, chi_thang],
  );
  if (phieu.length === 0) return [];
  const ids = phieu.map((p) => p.id);
  const khoan = await truy_van<KhoanPhieuRa>(
    `select pk.phieu_luong_id, pk.khoan_ma, kl.ten, kl.loai, kl.nhom,
            pk.so_luong, pk.don_gia, pk.thanh_tien, pk.ghi_chu, kl.chiu_thue
       from phieu_luong_khoan pk
       join khoan_luong kl on kl.ma = pk.khoan_ma
      where pk.phieu_luong_id = any($1::uuid[])
      order by kl.loai, kl.ten`,
    [ids],
  );
  // LIET KE tung LAN co NGAY + GIO (chi doc): giam thuong ky luat (tu ho_so_ky_luat da_ap_dung),
  // phat di muon va tru nua ngay do muon (tu bang_cong_ngay). De nguoi lao dong biet bi tru vi
  // loi nao, ngay gio nao — khong phai mot cuc gop.
  const ct_ky_luat = await chi_tiet_ky_luat_theo_phieu(ids);
  const ct_di_muon = await chi_tiet_di_muon_theo_phieu(ids);
  const lan_thanh_dong = (id: string, cac_lan: string[], so_tien: string): DongLietKe[] =>
    (cac_lan.length === 0 ? [] : [{
      id: `${id}:lan`, ly_do: '', so_tien, thu_tu: 0, cac_lan,
    }]);

  // Chi tiet GO TAY cua khoan (phieu_luong_khoan_ct): nhan su nhap tung dong co ly do + so tien
  // (vd thuong doanh so "287 so x 10.000"). Moi khoan co the co nhieu dong; tong luon khop
  // thanh_tien cua dong khoan cha.
  const ct_tay = await truy_van<{
    phieu_luong_id: string; khoan_ma: string; id: string; ly_do: string; so_tien: string; thu_tu: number;
  }>(
    `select phieu_luong_id, khoan_ma, id, ly_do, so_tien::text as so_tien, thu_tu
       from phieu_luong_khoan_ct
      where phieu_luong_id = any($1::uuid[])
      order by thu_tu, tao_luc`,
    [ids],
  );
  const ct_tay_theo_phieu = new Map<string, Map<string, DongLietKe[]>>();
  for (const c of ct_tay) {
    let m = ct_tay_theo_phieu.get(c.phieu_luong_id);
    if (m === undefined) { m = new Map(); ct_tay_theo_phieu.set(c.phieu_luong_id, m); }
    const ds = m.get(c.khoan_ma);
    const dong: DongLietKe = { id: c.id, ly_do: c.ly_do, so_tien: c.so_tien, thu_tu: c.thu_tu, cac_lan: [] };
    if (ds === undefined) m.set(c.khoan_ma, [dong]); else ds.push(dong);
  }

  // Quy phep nam cho TUNG nam xuat hien trong danh sach phieu + danh sach don nghi (phep nam /
  // khong luong) giao voi khoang thang cua cac phieu.
  const phep_theo_nam = new Map<string, { quy: number; da_dung: number; con_lai: number; cho_duyet: number }>();
  for (const nam of new Set(phieu.map((p) => String(p['thang']).slice(0, 4)))) {
    phep_theo_nam.set(nam, await quy_phep(nv_id, nam, await quy_phep_cua(nv_id)));
  }
  const thang_cuoi = String(phieu[0]!['thang']);
  const thang_dau = String(phieu[phieu.length - 1]!['thang']);
  const nghi = await truy_van<{
    tu_ngay: string; den_ngay: string; nua_ngay: boolean; loai: string; trang_thai: string;
  }>(
    `select to_char(tu_ngay, 'YYYY-MM-DD') as tu_ngay, to_char(den_ngay, 'YYYY-MM-DD') as den_ngay,
            nua_ngay, loai, trang_thai
       from don_nghi_phep
      where nhan_vien_id = $1
        and to_char(tu_ngay, 'YYYY-MM') <= $2 and to_char(den_ngay, 'YYYY-MM') >= $3
        and loai in ('phep_nam', 'khong_luong')
        and trang_thai in ('da_duyet', 'cho_duyet')
      order by tu_ngay`,
    [nv_id, thang_cuoi, thang_dau],
  );
  const nghi_thang = (thang: string): Record<string, unknown>[] =>
    nghi
      .filter((d) => d.tu_ngay.slice(0, 7) <= thang && d.den_ngay.slice(0, 7) >= thang)
      .map((d) => ({
        tu_ngay: d.tu_ngay < `${thang}-01` ? `${thang}-01` : d.tu_ngay,
        den_ngay: d.den_ngay > `${thang}-31` ? `${thang}-31` : d.den_ngay,
        nua_ngay: d.nua_ngay,
        loai: d.loai,
        trang_thai: d.trang_thai,
      }));

  // Co so tinh luong (cham cong) cho TUNG thang cua cac phieu — cac the nho trong bo cuc
  // phieu luong moi (cong thuc te, gio cong, OT, vang) + chi tiet ky (di muon/ve som/quen quet).
  const cc = await truy_van<Record<string, unknown>>(
    `select to_char(bc.ngay, 'YYYY-MM') as thang,
            count(*)::int                                           as tong_ngay_du_lieu,
            coalesce(sum(bc.phut_lam), 0)::int                      as tong_phut_lam,
            count(*) filter (where bc.trang_thai = 'co_mat')::int   as so_ngay_co_mat,
            count(*) filter (where bc.trang_thai in ('vang', 'nghi_khong_luong'))::int
                                                                    as so_ngay_vang,
            count(*) filter (where bc.trang_thai = 'nghi_phep')::int as so_ngay_nghi_phep,
            count(*) filter (where bc.trang_thai = 'ngay_le')::int  as so_ngay_le,
            count(*) filter (where bc.phut_muon > 0)::int           as so_lan_di_muon,
            coalesce(sum(bc.phut_muon), 0)::int                     as tong_phut_muon,
            count(*) filter (where bc.phut_ve_som > 0)::int         as so_lan_ve_som,
            coalesce(sum(bc.phut_ve_som), 0)::int                   as tong_phut_ve_som
       from bang_cong_ngay bc
      where bc.nhan_vien_id = $1
        and to_char(bc.ngay, 'YYYY-MM') between $2 and $3
      group by to_char(bc.ngay, 'YYYY-MM')`,
    [nv_id, thang_dau, thang_cuoi],
  );
  const quen = await truy_van<Record<string, unknown>>(
    `select to_char(ngay, 'YYYY-MM') as thang, count(*)::int as so_lan_quen_quet
       from don_giai_trinh
      where nhan_vien_id = $1
        and to_char(ngay, 'YYYY-MM') between $2 and $3
        and trang_thai in ('cho_duyet', 'da_duyet')
      group by to_char(ngay, 'YYYY-MM')`,
    [nv_id, thang_dau, thang_cuoi],
  );
  const cc_theo_thang = new Map<string, Record<string, unknown>>();
  for (const d of cc) cc_theo_thang.set(String(d['thang']), d);
  for (const q of quen) {
    const d = cc_theo_thang.get(String(q['thang']));
    if (d !== undefined) d['so_lan_quen_quet'] = q['so_lan_quen_quet'];
  }

  const theo_phieu = new Map<string, Record<string, unknown>[]>();
  for (const k of khoan) {
    const { phieu_luong_id, ...con } = k;
    const ds = theo_phieu.get(phieu_luong_id) ?? [];
    let chi_tiet: DongLietKe[] = [];
    if (k.khoan_ma === 'tru_giam_thuong_kl') chi_tiet = ct_ky_luat.get(phieu_luong_id) ?? [];
    else if (k.khoan_ma === 'tru_di_muon') {
      chi_tiet = lan_thanh_dong(phieu_luong_id, ct_di_muon.get(phieu_luong_id)?.tang_50k ?? [], k.thanh_tien);
    } else if (k.khoan_ma === 'tru_nua_ngay') {
      chi_tiet = lan_thanh_dong(phieu_luong_id, ct_di_muon.get(phieu_luong_id)?.tang_nua_ngay ?? [], k.thanh_tien);
    } else {
      chi_tiet = ct_tay_theo_phieu.get(phieu_luong_id)?.get(k.khoan_ma) ?? [];
    }
    ds.push({ ...con, chi_tiet });
    theo_phieu.set(phieu_luong_id, ds);
  }

  return phieu.map((p) => {
    const thang = String(p['thang']);
    return {
      ...p,
      khoan: theo_phieu.get(p.id) ?? [],
      phep: phep_theo_nam.get(thang.slice(0, 4)) ?? null,
      nghi: nghi_thang(thang),
      cham_cong: cc_theo_thang.get(thang) ?? null,
    };
  });
}

export async function tuyen_toi(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', can_dang_nhap);

  // ================================================================ hom nay
  app.get('/hom-nay', async (req) => {
    const nv_id = nhan_vien_cua_toi(req);
    const hom_nay = ngay_dia_phuong(new Date());

    const cong = await truy_van_mot(
      `select bc.ngay, bc.trang_thai, bc.gio_vao, bc.gio_ra, bc.phut_lam,
              bc.phut_muon, bc.phut_ve_som, bc.phut_ot, bc.so_cong, bc.ghi_chu,
              cl.ten as ca_lam, cl.gio_vao as ca_gio_vao, cl.gio_ra as ca_gio_ra
         from bang_cong_ngay bc
         left join ca_lam cl on cl.id = bc.ca_lam_id
        where bc.nhan_vien_id = $1 and bc.ngay = $2`,
      [nv_id, hom_nay],
    );

    const quet = await truy_van(
      `select id, thoi_diem, trang_thai, nguon, trang_thai_duyet, xac_thuc
         from lan_quet
        where nhan_vien_id = $1
          and thoi_diem >= $2::date and thoi_diem < ($2::date + 1)
        order by thoi_diem`,
      [nv_id, hom_nay],
    );

    const nv = await truy_van_mot<{
      ho_ten: string; ma_nv: string; ma_erp: string | null;
      duoc_cham_cong_dien_thoai: boolean; so_ngay_phep_nam: string;
      ca_lam: string | null; ca_gio_vao: string | null; ca_gio_ra: string | null;
    }>(
      `select nv.ho_ten, nv.ma_nv, nv.ma_erp, nv.duoc_cham_cong_dien_thoai,
              nv.so_ngay_phep_nam,
              cl.ten as ca_lam, cl.gio_vao as ca_gio_vao, cl.gio_ra as ca_gio_ra
         from nhan_vien nv left join ca_lam cl on cl.id = nv.ca_lam_id
        where nv.id = $1`,
      [nv_id],
    );

    // Dai tuan T2..CN (Phu luc B Man 1). Tuan bat dau THU HAI theo thoi quen Viet Nam,
    // khong phai chu nhat nhu mac dinh cua Date.
    const thu = thu_trong_tuan(hom_nay);
    const dau_tuan = cong_ngay(hom_nay, thu === 0 ? -6 : 1 - thu);
    const tuan = await truy_van(
      `select ngay, trang_thai, phut_muon, phut_lam, so_cong
         from bang_cong_ngay
        where nhan_vien_id = $1 and ngay >= $2 and ngay <= $3
        order by ngay`,
      [nv_id, dau_tuan, cong_ngay(dau_tuan, 6)],
    );

    const thang = hom_nay.slice(0, 7);
    const [thang_tong, phep, can_chu_y] = await Promise.all([
      tong_hop_thang(nv_id, thang),
      quy_phep(nv_id, hom_nay.slice(0, 4), Number(nv?.so_ngay_phep_nam ?? 12)),
      viec_can_chu_y(req, nv_id),
    ]);

    return {
      ngay: hom_nay,
      dau_tuan,
      nhan_vien: nv,
      bang_cong: cong,
      tuan,
      thang,
      thang_tong_hop: thang_tong,
      phep,
      can_chu_y,
      lan_quet: quet.map((q) => ({
        ...q,
        nhan_trang_thai: NHAN_TRANG_THAI[Number((q as Record<string, unknown>)['trang_thai'])] ?? 'Khac',
        nhan_xac_thuc: nhan_cach_xac_thuc(Number((q as Record<string, unknown>)['xac_thuc'])),
      })),
    };
  });

  // ================================================================ bang cong thang
  app.get('/bang-cong', async (req) => {
    const nv_id = nhan_vien_cua_toi(req);
    const q = req.query as Record<string, unknown>;
    const thang = chuoi(q, 'thang', { bat_buoc: true, toi_da: 7 }) as string;
    const { tu, den } = khoang_thang(thang);

    const ngay_cong = await truy_van(
      `select ngay, trang_thai, gio_vao, gio_ra, phut_lam, phut_muon, phut_ve_som,
              phut_ot, so_cong, co_dieu_chinh, da_chot, ghi_chu
         from bang_cong_ngay
        where nhan_vien_id = $1 and ngay >= $2 and ngay <= $3
        order by ngay`,
      [nv_id, tu, den],
    );

    return { thang, tong_hop: await tong_hop_thang(nv_id, thang), ngay: ngay_cong };
  });

  // ================================================================ co so tinh luong
  //
  // Man "Luong" (Phu luc B Man 3). Module C (tinh luong + BHXH + thue) CHUA trien khai
  // va theo lo trinh v2 con bi chan cho ke toan/luat su xac nhan tham so phap ly, nen
  // endpoint nay KHONG tra so tien nao. No tra dung nhung du kien cham cong se la dau
  // vao cua ky luong, de nhan vien doi chieu truoc khi co phieu luong that.
  //
  // Bay so luong uoc tinh o day se sinh ra ky vong sai ve thu nhap — tac hai lon hon
  // nhieu so voi tien loi cua mot man hinh dep.
  app.get('/luong', async (req) => {
    const nv_id = nhan_vien_cua_toi(req);
    const q = req.query as Record<string, unknown>;
    const thang = (chuoi(q, 'thang', { toi_da: 7 }) as string | null)
      ?? ngay_dia_phuong(new Date()).slice(0, 7);
    const { tu, den } = khoang_thang(thang);

    const [tong, phep, phieu_thang] = await Promise.all([
      tong_hop_thang(nv_id, thang),
      quy_phep(nv_id, thang.slice(0, 4), await quy_phep_cua(nv_id)),
      // Phieu luong THAT cua thang (chi khi ky da duyet/da tra). Null neu chua co.
      phieu_luong_cua_toi(nv_id, thang).then((ds) => ds[0] ?? null),
    ]);

    const t = tong as Record<string, unknown>;
    const da_chot_het = Number(t['so_ngay_da_chot'] ?? 0) > 0
      && Number(t['so_ngay_da_chot']) === Number(t['so_ngay_co_du_lieu']);

    return {
      thang,
      tu,
      den,
      co_so_tinh_luong: tong,
      phep,
      // Ky cong da chot chua: chua chot thi so lieu con co the doi khi mot lan quet ve muon.
      da_chot: da_chot_het,
      phieu_luong: phieu_thang,
      ghi_chu_ot:
        'Số phút OT ở đây là OT máy ghi nhận, chưa qua duyệt. Tiền làm thêm giờ chỉ được '
        + 'trả theo số phút OT đã có đơn duyệt.',
      ly_do_chua_co_phieu_luong: phieu_thang === null
        ? 'Phiếu lương hiển thị sau khi kỳ lương của tháng được nhân sự duyệt. '
          + 'Dữ liệu chấm công dưới đây là căn cứ để đối chiếu trước khi chốt.'
        : 'Bạn đã có phiếu lương của tháng này — xem chi tiết từng khoản ở mục Phiếu lương.',
    };
  });
  // Chu y: route GET /toi/phieu-luong (danh sach phieu cua chinh minh) da DANG KY o tuyen_luong
  // (luong.ts) — KHONG dang ky lai o day, se bi FST_ERR_DUPLICATED_ROUTE. Man Luong ca nhan chi
  // can `phieu_luong` cua thang, lay qua /toi/luong o tren (dung phieu_luong_cua_toi).

  // ================================================================ quan ly phep nam CUA TOI
  // Nhan vien tu xem QUY phep nam + CHI TIET tung lan nghi (da dung / dang cho duyet) trong nam.
  app.get('/phep', async (req) => {
    const nv_id = nhan_vien_cua_toi(req);
    const q = req.query as Record<string, unknown>;
    const nam = (chuoi(q, 'nam', { toi_da: 4 }) as string | null)
      ?? ngay_dia_phuong(new Date()).slice(0, 4);
    const quy = await quy_phep(nv_id, nam, await quy_phep_cua(nv_id));
    // Cac lan nghi CO GIAO trong nam (moi loai), moi nhat truoc. So ngay: nua ngay = 0,5;
    // don nhieu ngay = so ngay lich (den - tu + 1) — du de nguoi lao dong doi chieu.
    const cac_lan = await truy_van(
      `select id, loai,
              to_char(tu_ngay, 'YYYY-MM-DD') as tu_ngay,
              to_char(den_ngay, 'YYYY-MM-DD') as den_ngay,
              nua_ngay, trang_thai, ly_do, ghi_chu_duyet,
              to_char(tao_luc, 'YYYY-MM-DD"T"HH24:MI:SSOF') as tao_luc,
              (case when nua_ngay then 0.5 else (den_ngay - tu_ngay + 1) end)::float8 as so_ngay
         from don_nghi_phep
        where nhan_vien_id = $1
          and tu_ngay <= make_date($2::int, 12, 31)
          and den_ngay >= make_date($2::int, 1, 1)
        order by tu_ngay desc`,
      [nv_id, nam],
    );
    return { nam, quy, cac_lan };
  });

  // ================================================================ lan quet cua toi
  app.get('/lan-quet', async (req) => {
    const nv_id = nhan_vien_cua_toi(req);
    const { tu, den } = khoang_ngay(req.query as Record<string, unknown>, 62);
    return truy_van(
      `select lq.id, lq.thoi_diem, lq.trang_thai, lq.nguon, lq.trang_thai_duyet,
              lq.xac_thuc, lq.khoang_cach_m, lq.anh_ten_tep is not null as co_anh,
              dd.ten as dia_diem, tb.ten as thiet_bi
         from lan_quet lq
         left join dia_diem dd on dd.id = lq.dia_diem_id
         left join thiet_bi tb on tb.serial = lq.thiet_bi_serial
        where lq.nhan_vien_id = $1
          and lq.thoi_diem >= $2::date and lq.thoi_diem < ($3::date + 1)
        order by lq.thoi_diem desc limit 500`,
      [nv_id, tu, den],
    );
  });

  // ================================================================ dia diem duoc cham cong
  app.get('/dia-diem', async () =>
    truy_van(
      'select id, ten, vi_do, kinh_do, ban_kinh_m from dia_diem where dang_hoat_dong = true order by ten',
    ),
  );

  // ================================================================ CHAM CONG BANG DIEN THOAI
  //
  // Dang multipart/form-data:
  //   vi_do, kinh_do  (bat buoc)  — toa do GPS
  //   do_chinh_xac_m  (tuy chon)  — do chinh xac may bao, de HR danh gia
  //   trang_thai      (0 = vao, 1 = ra)
  //   anh             (bat buoc)  — selfie JPEG/PNG
  //
  // Ket qua:
  //   Trong ban kinh dia diem -> ghi nhan ngay (trang_thai_duyet = 'tu_dong').
  //   Ngoai ban kinh          -> van ghi nhan nhung CHO NHAN SU DUYET, khong tinh cong
  //                              cho den khi duoc duyet.
  app.post('/cham-cong', {
    config: { rateLimit: { max: 12, timeWindow: '1 hour' } },
  }, async (req, res) => {
    const nd = nguoi_dung_hien_tai(req);
    const nv_id = nhan_vien_cua_toi(req);

    const nv = await truy_van_mot<{
      ma_nv: string; ma_erp: string | null; ho_ten: string;
      duoc_cham_cong_dien_thoai: boolean; dang_hoat_dong: boolean;
    }>(
      `select ma_nv, ma_erp, ho_ten, duoc_cham_cong_dien_thoai, dang_hoat_dong
         from nhan_vien where id = $1`,
      [nv_id],
    );
    if (nv === null || !nv.dang_hoat_dong) throw new LoiKhongTim('Không tìm thấy nhân viên.');
    if (!nv.duoc_cham_cong_dien_thoai) {
      throw new LoiKhongQuyen(
        'Tài khoản của bạn chưa được bật chấm công bằng điện thoại. Vui lòng quẹt tại máy chấm công.',
      );
    }

    // --- Doc multipart ---
    const truong: Record<string, string> = {};
    let anh: Buffer | null = null;
    for await (const phan of req.parts()) {
      if (phan.type === 'file') {
        if (phan.fieldname !== 'anh') {
          // Bo qua file la nhung phai doc het stream, neu khong request treo.
          await phan.toBuffer();
          continue;
        }
        anh = await phan.toBuffer();
      } else if (typeof phan.value === 'string') {
        truong[phan.fieldname] = phan.value;
      }
    }

    if (anh === null) throw new LoiDauVao('Thiếu ảnh chụp xác nhận.');

    const vi_do = Number(truong['vi_do']);
    const kinh_do = Number(truong['kinh_do']);
    if (!Number.isFinite(vi_do) || vi_do < -90 || vi_do > 90) {
      throw new LoiDauVao('Không lấy được vĩ độ hợp lệ. Hãy bật quyền vị trí cho ứng dụng.');
    }
    if (!Number.isFinite(kinh_do) || kinh_do < -180 || kinh_do > 180) {
      throw new LoiDauVao('Không lấy được kinh độ hợp lệ. Hãy bật quyền vị trí cho ứng dụng.');
    }
    const do_chinh_xac = Number(truong['do_chinh_xac_m']);
    const trang_thai = truong['trang_thai'] === '1' ? 1 : 0;
    // Android cho biet toa do co do app gia lap vi tri tao ra khong. Day la cach gian lan
    // pho bien nhat, nen ban ghi co co nay KHONG BAO GIO duoc tu dong tinh cong.
    const gps_gia_lap = truong['gps_gia_lap'] === 'true' || truong['gps_gia_lap'] === '1';

    const bay_gio = new Date();
    const ngay = ngay_dia_phuong(bay_gio);

    // --- Chan bam lien tuc ---
    const gan_nhat = await truy_van_mot<{ thoi_diem: Date }>(
      `select thoi_diem from lan_quet
        where nhan_vien_id = $1 and nguon = 'dien_thoai'
        order by thoi_diem desc limit 1`,
      [nv_id],
    );
    if (
      gan_nhat !== null
      && bay_gio.getTime() - gan_nhat.thoi_diem.getTime() < GIAN_CACH_TOI_THIEU_GIAY * 1000
    ) {
      throw new LoiXungDot(
        `Bạn vừa chấm công xong. Vui lòng đợi ${GIAN_CACH_TOI_THIEU_GIAY} giây giữa hai lần.`,
      );
    }

    // --- Geofence ---
    const cac_dia_diem = await truy_van<DiaDiem>(
      'select id, ten, vi_do, kinh_do, ban_kinh_m from dia_diem where dang_hoat_dong = true',
    );
    const gf = do_geofence(vi_do, kinh_do, cac_dia_diem);
    // Trong pham vi VA khong co dau hieu gia lap GPS -> tin ngay. Con lai cho nhan su duyet.
    const trang_thai_duyet = gf.trong_pham_vi && !gps_gia_lap ? 'tu_dong' : 'cho_duyet';

    const ly_do: string[] = [];
    if (gps_gia_lap) ly_do.push('CẢNH BÁO: điện thoại báo tọa độ do app giả lập vị trí tạo ra');
    if (cac_dia_diem.length === 0) {
      // Chua khai dia diem nao thi khong co gi de doi chieu -> khong the tin.
      ly_do.push('Chưa khai báo địa điểm nào để đối chiếu GPS');
    } else if (gf.trong_pham_vi) {
      ly_do.push(`Trong phạm vi "${gf.dia_diem?.ten}" (${gf.khoang_cach_m}m)`);
    } else {
      ly_do.push(`Ngoài phạm vi: cách "${gf.dia_diem?.ten}" ${gf.khoang_cach_m}m`);
    }
    const ghi_chu = ly_do.join('. ');

    // --- Luu anh (sau khi da qua moi kiem tra de khong rac dia) ---
    const anh_ten_tep = await luu_anh_selfie(anh, ngay);

    const khoa = `dien_thoai|${nv_id}|${bay_gio.toISOString().slice(0, 19).replace(/[-:T]/g, '')}|${trang_thai}`;

    const dong = await trong_giao_dich(async (khach) => {
      const kq = await khach.query<{ id: string }>(
        `insert into lan_quet
           (nguon, nhan_vien_id, thoi_diem, trang_thai, xac_thuc, khoa_chong_trung,
            vi_do, kinh_do, do_chinh_xac_m, dia_diem_id, khoang_cach_m,
            anh_ten_tep, trang_thai_duyet, ghi_chu, gps_gia_lap)
         values ('dien_thoai', $1, $2, $3, 9, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         on conflict (khoa_chong_trung) do nothing
         returning id`,
        [
          nv_id, bay_gio, trang_thai, khoa, vi_do, kinh_do,
          Number.isFinite(do_chinh_xac) ? do_chinh_xac : null,
          gf.dia_diem?.id ?? null, gf.khoang_cach_m, anh_ten_tep, trang_thai_duyet, ghi_chu,
          gps_gia_lap,
        ],
      );
      const d = kq.rows[0];
      if (d === undefined) return null;

      if (trang_thai_duyet === 'tu_dong') {
        await ghi_su_kien('lan_quet.da_ghi', {
          lan_quet_id: d.id,
          nguon: 'dien_thoai',
          nhan_vien_id: nv_id,
          ma_nv: nv.ma_nv,
          ma_erp: nv.ma_erp,
          thoi_diem: bay_gio.toISOString(),
          trang_thai,
          cach_xac_thuc: 'Dien thoai (GPS + anh)',
          dia_diem: gf.dia_diem?.ten ?? null,
          khoang_cach_m: gf.khoang_cach_m,
        }, khach);
      }
      return d;
    });

    if (dong === null) throw new LoiXungDot('Lần chấm công này đã được ghi nhận.');

    // Chi tinh lai cong khi lan quet duoc tin ngay.
    if (trang_thai_duyet === 'tu_dong') await tinh_lai_ngay(nv_id, ngay);

    await ghi_nhat_ky(nd.sub, 'cham_cong_dien_thoai', 'lan_quet', dong.id, {
      trang_thai, khoang_cach_m: gf.khoang_cach_m, trang_thai_duyet, gps_gia_lap,
    }, req.ip);
    if (gps_gia_lap) {
      req.log.warn({ nhan_vien_id: nv_id, lan_quet_id: dong.id }, 'cham cong voi GPS gia lap');
    }

    return res.code(201).send({
      ok: true,
      id: dong.id,
      thoi_diem: bay_gio.toISOString(),
      trang_thai,
      trang_thai_duyet,
      dia_diem: gf.dia_diem?.ten ?? null,
      khoang_cach_m: gf.khoang_cach_m,
      thong_bao: trang_thai_duyet === 'tu_dong'
        ? `Đã chấm công ${trang_thai === 0 ? 'VÀO' : 'RA'} thành công.`
        : gps_gia_lap
          ? 'Đã ghi nhận. Điện thoại đang bật chế độ giả lập vị trí nên nhân sự phải xác nhận '
            + 'trước khi tính công. Hãy tắt app giả lập vị trí.'
          : 'Đã ghi nhận nhưng bạn đang ở ngoài phạm vi cho phép. Công sẽ được tính sau khi '
            + 'nhân sự duyệt.',
    });
  });

  // ================================================================ anh selfie
  // Anh la du lieu ca nhan: chi chu so huu, nhan su/admin, hoac truong phong cung phong
  // moi xem duoc.
  app.get('/anh/:id', async (req, res) => {
    const nd = nguoi_dung_hien_tai(req);
    const p = req.params as Record<string, string>;
    const id = uuid({ id: p['id'] }, 'id', { bat_buoc: true }) as string;

    const lq = await truy_van_mot<{ anh_ten_tep: string | null; nhan_vien_id: string | null; phong_ban_id: string | null }>(
      `select lq.anh_ten_tep, lq.nhan_vien_id, nv.phong_ban_id
         from lan_quet lq left join nhan_vien nv on nv.id = lq.nhan_vien_id
        where lq.id = $1`,
      [id],
    );
    if (lq === null || lq.anh_ten_tep === null) throw new LoiKhongTim('Không tìm thấy ảnh.');

    if (!xem_duoc_tat_ca(nd)) {
      let duoc_xem = nd.nv !== null && nd.nv === lq.nhan_vien_id;
      if (!duoc_xem && nd.vai_tro === 'truong_phong' && lq.phong_ban_id !== null) {
        const cung = await truy_van_mot<{ ok: boolean }>(
          'select (phong_ban_id = $2) as ok from nhan_vien where id = $1',
          [nd.nv, lq.phong_ban_id],
        );
        duoc_xem = cung?.ok === true;
      }
      // Tra 404 thay vi 403 de khong tiet lo anh nay co ton tai.
      if (!duoc_xem) throw new LoiKhongTim('Không tìm thấy ảnh.');
    }

    const anh = await doc_anh_selfie(lq.anh_ten_tep);
    if (anh === null) throw new LoiKhongTim('Không tìm thấy tệp ảnh trên đĩa.');

    return res
      .header('content-type', anh.kieu)
      .header('cache-control', 'private, max-age=3600')
      .send(anh.du_lieu);
  });

  // ================================================================ NGHI PHEP
  app.get('/nghi-phep', async (req) => {
    const nv_id = nhan_vien_cua_toi(req);
    return truy_van(
      `select id, loai, tu_ngay, den_ngay, nua_ngay, ly_do, trang_thai,
              ghi_chu_duyet, tao_luc, quyet_luc
         from don_nghi_phep where nhan_vien_id = $1
        order by tao_luc desc limit 100`,
      [nv_id],
    );
  });

  app.post('/nghi-phep', async (req, res) => {
    const nd = nguoi_dung_hien_tai(req);
    const nv_id = nhan_vien_cua_toi(req);
    const b = than(req.body);

    const loai = trong_tap(b, 'loai', LOAI_NGHI, { bat_buoc: true }) as typeof LOAI_NGHI[number];
    const tu_ngay = ngay_bat_buoc(b, 'tu_ngay');
    const den_ngay = ngay_bat_buoc(b, 'den_ngay');
    const nua_ngay = luan_ly(b, 'nua_ngay', false) as boolean;
    const ly_do = chuoi(b, 'ly_do', { toi_da: 500 });

    if (den_ngay < tu_ngay) throw new LoiDauVao('Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.');
    if (nua_ngay && tu_ngay !== den_ngay) {
      throw new LoiDauVao('Đơn nửa ngày chỉ áp dụng cho một ngày duy nhất.');
    }
    const so_ngay = (Date.parse(`${den_ngay}T00:00:00Z`) - Date.parse(`${tu_ngay}T00:00:00Z`))
      / 86_400_000 + 1;
    if (so_ngay > 180) throw new LoiDauVao('Một đơn không được dài hơn 180 ngày.');

    // Chan don trum ngay da chot bang cong.
    const da_chot = await truy_van_mot<{ co: boolean }>(
      `select true as co from bang_cong_ngay
        where nhan_vien_id = $1 and ngay >= $2 and ngay <= $3 and da_chot = true limit 1`,
      [nv_id, tu_ngay, den_ngay],
    );
    if (da_chot !== null) {
      throw new LoiXungDot('Khoảng ngày này đã chốt bảng công. Vui lòng liên hệ nhân sự.');
    }

    // Chan don trung khoang voi don dang cho / da duyet.
    const trung = await truy_van_mot<{ id: string }>(
      `select id from don_nghi_phep
        where nhan_vien_id = $1 and trang_thai in ('cho_duyet','da_duyet')
          and tu_ngay <= $3 and den_ngay >= $2 limit 1`,
      [nv_id, tu_ngay, den_ngay],
    );
    if (trung !== null) {
      throw new LoiXungDot('Bạn đã có đơn nghỉ phép trùm khoảng ngày này.');
    }

    const dong = await truy_van_mot<{ id: string }>(
      `insert into don_nghi_phep(nhan_vien_id, loai, tu_ngay, den_ngay, nua_ngay, ly_do)
       values ($1,$2,$3,$4,$5,$6) returning id`,
      [nv_id, loai, tu_ngay, den_ngay, nua_ngay, ly_do],
    );
    await ghi_nhat_ky(nd.sub, 'gui_don_nghi_phep', 'don_nghi_phep',
      dong?.id ?? null, { loai, tu_ngay, den_ngay }, req.ip);

    // Tu dong duyet cho don tu moc ap dung (khong luong tu duyet; loai khac xet quy phep nam).
    // Loi tu dong duyet KHONG lam hong viec nop don — roi ve cho duyet tay nhu cu.
    if (dong !== null && tu_ngay >= TU_NGAY_AP) {
      const r = await tu_dong_quyet_don(dong.id, { email: true }).catch((e: unknown) => {
        console.error('[tu_dong_duyet] loi khi nop don:', (e as Error).message);
        return null;
      });
      if (r !== null) {
        return res.code(201).send({ ...dong, trang_thai: r.quyet, tu_dong: true, ket_qua: r.kieu });
      }
    }

    const khoang = tu_ngay === den_ngay
      ? ngay_viet(tu_ngay)
      : `${ngay_viet(tu_ngay)} – ${ngay_viet(den_ngay)}`;
    gui_ngam({
      nguoi_dung_ids: await tai_khoan_nguoi_duyet(nv_id),
      tieu_de: 'Đơn nghỉ phép mới chờ duyệt',
      noi_dung: `${await ten_nhan_vien(nv_id)}: ${NHAN_LOAI_NGHI[loai]} ${khoang}`,
      du_lieu: { man: 'duyet-don', loai: 'nghi_phep', don_id: dong?.id ?? null },
    });

    return res.code(201).send({ ...dong, trang_thai: 'cho_duyet' });
  });

  app.post('/nghi-phep/:id/huy', async (req) => {
    const nv_id = nhan_vien_cua_toi(req);
    const id = lay_id(req);
    const don = await truy_van_mot<{ trang_thai: string; tu_ngay: string; den_ngay: string }>(
      'select trang_thai, tu_ngay, den_ngay from don_nghi_phep where id = $1 and nhan_vien_id = $2',
      [id, nv_id],
    );
    if (don === null) throw new LoiKhongTim('Không tìm thấy đơn của bạn.');
    if (don.trang_thai === 'da_huy') return { ok: true };
    if (don.trang_thai === 'tu_choi') throw new LoiDauVao('Đơn đã bị từ chối, không cần hủy.');

    await thuc_thi(
      `update don_nghi_phep set trang_thai = 'da_huy', quyet_luc = now() where id = $1`,
      [id],
    );
    // Don da duyet bi huy -> ngay do khong con la nghi phep, phai tinh lai.
    if (don.trang_thai === 'da_duyet') {
      await tinh_lai_khoang(don.tu_ngay, don.den_ngay, nv_id);
    }
    return { ok: true };
  });

  // ================================================================ GIAI TRINH QUEN QUET
  app.get('/giai-trinh', async (req) => {
    const nv_id = nhan_vien_cua_toi(req);
    return truy_van(
      `select id, ngay, gio_vao_de_xuat, gio_ra_de_xuat, ly_do, trang_thai,
              ghi_chu_duyet, tao_luc, quyet_luc
         from don_giai_trinh where nhan_vien_id = $1
        order by tao_luc desc limit 100`,
      [nv_id],
    );
  });

  app.post('/giai-trinh', async (req, res) => {
    const nd = nguoi_dung_hien_tai(req);
    const nv_id = nhan_vien_cua_toi(req);
    const b = than(req.body);

    const ngay = ngay_bat_buoc(b, 'ngay');
    const gio_vao = gio(b, 'gio_vao_de_xuat');
    const gio_ra = gio(b, 'gio_ra_de_xuat');
    const ly_do = chuoi_bat_buoc(b, 'ly_do', { toi_da: 500, toi_thieu: 5 });

    if (gio_vao === null && gio_ra === null) {
      throw new LoiDauVao('Phải đề xuất ít nhất giờ vào hoặc giờ ra.');
    }
    if (ngay > ngay_dia_phuong(new Date())) {
      throw new LoiDauVao('Không thể giải trình cho ngày trong tương lai.');
    }

    const da_chot = await truy_van_mot<{ co: boolean }>(
      'select true as co from bang_cong_ngay where nhan_vien_id = $1 and ngay = $2 and da_chot = true',
      [nv_id, ngay],
    );
    if (da_chot !== null) {
      throw new LoiXungDot('Ngày này đã chốt bảng công. Vui lòng liên hệ nhân sự.');
    }

    try {
      const dong = await truy_van_mot<{ id: string }>(
        `insert into don_giai_trinh(nhan_vien_id, ngay, gio_vao_de_xuat, gio_ra_de_xuat, ly_do)
         values ($1,$2,$3,$4,$5) returning id`,
        [nv_id, ngay, gio_vao, gio_ra, ly_do],
      );
      await ghi_nhat_ky(nd.sub, 'gui_don_giai_trinh', 'don_giai_trinh',
        dong?.id ?? null, { ngay }, req.ip);

      gui_ngam({
        nguoi_dung_ids: await tai_khoan_nguoi_duyet(nv_id),
        tieu_de: 'Đơn giải trình mới chờ duyệt',
        noi_dung: `${await ten_nhan_vien(nv_id)}: quên quét ngày ${ngay_viet(ngay)}`,
        du_lieu: { man: 'duyet-don', loai: 'giai_trinh', don_id: dong?.id ?? null },
      });

      return res.code(201).send({ ...dong, trang_thai: 'cho_duyet' });
    } catch (loi) {
      if ((loi as { code?: string }).code === '23505') {
        throw new LoiXungDot('Bạn đã có đơn giải trình cho ngày này.');
      }
      throw loi;
    }
  });

  // ================================================================ KY LUAT CUA TOI
  /** Ho so ky luat cua CHINH MINH — de nguoi lao dong biet va con khieu nai. */
  app.get('/ky-luat', async (req) => {
    const nv_id = nhan_vien_cua_toi(req);
    return truy_van(
      `select h.id, h.ma, h.ky, h.muc_do, h.so_vi_pham, h.tong_tien, h.hinh_thuc,
              h.trang_thai, h.chi_tiet, h.ly_do_mien, h.cap_nhat_luc,
              (select count(*) from khieu_nai_ky_luat kn
                where kn.ho_so_ky_luat_id = h.id and kn.nhan_vien_id = h.nhan_vien_id)::int as so_khieu_nai
         from ho_so_ky_luat h
        where h.nhan_vien_id = $1 and h.trang_thai <> 'bac_bo'
        order by h.ky desc, h.cap_nhat_luc desc limit 100`,
      [nv_id],
    );
  });

  // ================================================================ KHIEU NAI CUA TOI
  /** Khieu nai cua chinh minh (ve ky luat hoac vi pham). */
  app.get('/khieu-nai', async (req) => {
    const nv_id = nhan_vien_cua_toi(req);
    return truy_van(
      `select kn.id, kn.ma, kn.loai, kn.noi_dung, kn.trang_thai, kn.phan_hoi,
              kn.tao_luc, kn.xu_ly_luc,
              h.ma as ma_ky_luat, h.ky as ky_ky_luat, h.tong_tien,
              v.ngay as ngay_vi_pham, lvp.ten as ten_vi_pham
         from khieu_nai_ky_luat kn
         left join ho_so_ky_luat h on h.id = kn.ho_so_ky_luat_id
         left join vi_pham v on v.id = kn.vi_pham_id
         left join loai_vi_pham lvp on lvp.id = v.loai_vi_pham_id
        where kn.nhan_vien_id = $1
        order by kn.tao_luc desc limit 100`,
      [nv_id],
    );
  });

  /**
   * Gui khieu nai ve mot quyet dinh ky luat (BLLD Dieu 131 — quyen khieu nai) hoac mot vi pham.
   * Phai kem ho_so_ky_luat_id HOAC vi_pham_id, va doi tuong do phai la cua chinh minh.
   */
  app.post('/khieu-nai', async (req, res) => {
    const nd = nguoi_dung_hien_tai(req);
    const nv_id = nhan_vien_cua_toi(req);
    const b = than(req.body);
    const ho_so_ky_luat_id = uuid(b, 'ho_so_ky_luat_id');
    const vi_pham_id = uuid(b, 'vi_pham_id');
    const loai = trong_tap(b, 'loai', ['khieu_nai', 'giai_trinh'] as const, { mac_dinh: 'khieu_nai' });
    const noi_dung = chuoi_bat_buoc(b, 'noi_dung', { toi_thieu: 5, toi_da: 2000 });

    if (ho_so_ky_luat_id === null && vi_pham_id === null) {
      throw new LoiDauVao('Phải chọn hồ sơ kỷ luật hoặc vi phạm để khiếu nại.');
    }

    // Doi tuong khieu nai phai la CUA CHINH MINH (khong khieu nai ho nguoi khac).
    if (ho_so_ky_luat_id !== null) {
      const h = await truy_van_mot<{ ok: boolean }>(
        'select true as ok from ho_so_ky_luat where id = $1 and nhan_vien_id = $2',
        [ho_so_ky_luat_id, nv_id],
      );
      if (h === null) throw new LoiKhongTim('Không tìm thấy hồ sơ kỷ luật của bạn.');
    }
    if (vi_pham_id !== null) {
      const v = await truy_van_mot<{ ok: boolean }>(
        'select true as ok from vi_pham where id = $1 and nhan_vien_id = $2', [vi_pham_id, nv_id],
      );
      if (v === null) throw new LoiKhongTim('Không tìm thấy vi phạm của bạn.');
    }

    // Chan khieu nai trung (con dang mo) tren cung mot doi tuong.
    const trung = await truy_van_mot<{ id: string }>(
      `select id from khieu_nai_ky_luat
        where nhan_vien_id = $1 and trang_thai in ('moi','dang_xem')
          and coalesce(ho_so_ky_luat_id::text,'') = coalesce($2::uuid::text,'')
          and coalesce(vi_pham_id::text,'') = coalesce($3::uuid::text,'') limit 1`,
      [nv_id, ho_so_ky_luat_id, vi_pham_id],
    );
    if (trung !== null) throw new LoiXungDot('Bạn đã có một khiếu nại đang mở cho mục này.');

    const dong = await truy_van_mot<{ id: string; ma: string }>(
      `insert into khieu_nai_ky_luat (ho_so_ky_luat_id, vi_pham_id, nhan_vien_id, loai, noi_dung)
       values ($1,$2,$3,$4,$5) returning id, ma`,
      [ho_so_ky_luat_id, vi_pham_id, nv_id, loai, noi_dung],
    );
    await ghi_nhat_ky(nd.sub, 'gui_khieu_nai', 'khieu_nai', dong?.id ?? null,
      { ho_so_ky_luat_id, vi_pham_id, loai }, req.ip);

    gui_ngam({
      nguoi_dung_ids: await tai_khoan_nguoi_duyet(nv_id),
      tieu_de: loai === 'giai_trinh' ? 'Có giải trình mới' : 'Có khiếu nại kỷ luật mới',
      noi_dung: `${await ten_nhan_vien(nv_id)} gửi ${dong?.ma ?? 'khiếu nại'}.`,
      du_lieu: { man: 'ky-luat', khieu_nai_id: dong?.id ?? null },
    });
    return res.code(201).send({ ...dong, trang_thai: 'moi' });
  });

  // ================================================================ KHIEU NAI PHIEU LUONG CUA TOI
  /** Khieu nai phieu luong cua chinh minh. */
  app.get('/khieu-nai-luong', async (req) => {
    const nv_id = nhan_vien_cua_toi(req);
    return truy_van(
      `select kn.id, kn.ma, kn.noi_dung, kn.trang_thai, kn.phan_hoi,
              kn.tao_luc, kn.xu_ly_luc, k.thang,
              coalesce((select json_agg(json_build_object('id', t.id, 'ten', t.ten_goc)
                                        order by t.tao_luc)
                          from ho_so_tep t
                         where t.nhom = 'khieu_nai' and t.thuoc_id = kn.id), '[]') as anh,
              coalesce((select json_agg(json_build_object('vai', r.vai, 'noi_dung', r.noi_dung,
                                                          'tao_luc', r.tao_luc) order by r.tao_luc)
                          from khieu_nai_luong_tra_loi r
                         where r.khieu_nai_id = kn.id), '[]') as tra_loi
         from khieu_nai_luong kn
         join phieu_luong p on p.id = kn.phieu_luong_id
         join ky_luong k on k.id = p.ky_luong_id
        where kn.nhan_vien_id = $1
        order by kn.tao_luc desc limit 100`,
      [nv_id],
    );
  });

  // Nguoi lao dong TRA LOI vao thread khieu nai CUA MINH — chi khi ticket con MO (moi/dang_xem).
  app.post('/khieu-nai-luong/:id/tra-loi', async (req, res) => {
    const nd = nguoi_dung_hien_tai(req);
    const nv_id = nhan_vien_cua_toi(req);
    const p = req.params as Record<string, string>;
    const kn_id = uuid({ id: p['id'] }, 'id', { bat_buoc: true }) as string;
    const noi_dung = chuoi_bat_buoc(than(req.body), 'noi_dung', { toi_thieu: 1, toi_da: 2000 });

    const kn = await truy_van_mot<{ trang_thai: string }>(
      'select trang_thai from khieu_nai_luong where id = $1 and nhan_vien_id = $2', [kn_id, nv_id],
    );
    if (kn === null) throw new LoiKhongTim('Không tìm thấy khiếu nại của bạn.');
    if (kn.trang_thai !== 'moi' && kn.trang_thai !== 'dang_xem') {
      throw new LoiXungDot('Khiếu nại đã đóng, không trả lời thêm được.');
    }
    await thuc_thi(
      `insert into khieu_nai_luong_tra_loi (khieu_nai_id, vai, nguoi_dung_id, noi_dung)
       values ($1, 'nhan_vien', $2, $3)`,
      [kn_id, nd.sub, noi_dung],
    );
    await ghi_nhat_ky(nd.sub, 'khieu_nai_luong.tra_loi', 'khieu_nai_luong', kn_id, null, req.ip);
    gui_ngam({
      nguoi_dung_ids: await tai_khoan_nguoi_duyet(nv_id),
      tieu_de: 'Khiếu nại lương có trả lời mới',
      noi_dung: `${await ten_nhan_vien(nv_id)} vừa trả lời khiếu nại phiếu lương.`,
      du_lieu: { man: 'khieu-nai-luong', khieu_nai_id: kn_id },
    });
    void email_nhan_vien_tra_loi(kn_id, noi_dung);
    return res.code(201).send({ ok: true });
  });

  // Dinh kem ANH cho mot khieu nai CUA MINH (bang chung). Tai dung he thong tep ho so (nhom
  // 'khieu_nai'). Chi anh; magic byte da kiem trong luu_tep_ho_so, chan them theo mime.
  app.post('/khieu-nai-luong/:id/anh', {
    bodyLimit: cau_hinh.tep_toi_da_byte + 1024 * 1024,
  }, async (req, res) => {
    const nd = nguoi_dung_hien_tai(req);
    const nv_id = nhan_vien_cua_toi(req);
    const p = req.params as Record<string, string>;
    const kn_id = uuid({ id: p['id'] }, 'id', { bat_buoc: true }) as string;

    const kn = await truy_van_mot<{ id: string }>(
      'select id from khieu_nai_luong where id = $1 and nhan_vien_id = $2', [kn_id, nv_id],
    );
    if (kn === null) throw new LoiKhongTim('Không tìm thấy khiếu nại của bạn.');

    let du_lieu: Buffer | null = null;
    let ten_goc = 'anh';
    for await (const phan of req.parts({ limits: { fileSize: cau_hinh.tep_toi_da_byte } })) {
      if (phan.type === 'file') {
        if (phan.fieldname !== 'anh') { await phan.toBuffer(); continue; }
        ten_goc = lam_sach_ten(phan.filename ?? 'anh');
        du_lieu = await phan.toBuffer();
      }
    }
    if (du_lieu === null) throw new LoiDauVao('Thiếu ảnh đính kèm.');

    const nv = await truy_van_mot<{ ma_nv: string; ho_ten: string }>(
      'select ma_nv, ho_ten from nhan_vien where id = $1', [nv_id],
    );
    const da_luu = await luu_tep_ho_so(du_lieu, ten_goc, {
      ma_nv: nv?.ma_nv ?? 'NV', ho_ten: nv?.ho_ten ?? '',
      nhom: 'khieu_nai', ngay: ngay_dia_phuong(new Date()),
    });
    if (!da_luu.mime.startsWith('image/')) {
      await xoa_tep_ho_so(da_luu.ten_luu).catch(() => { /* da co loi that o tren */ });
      throw new LoiDauVao('Chỉ đính kèm được tệp ảnh (jpg, png…).');
    }
    let moi: Record<string, unknown> | null;
    try {
      moi = await truy_van_mot(
        `insert into ho_so_tep(id, nhan_vien_id, nhom, thuoc_id, ten_goc, ten_luu, kieu_mime,
                               kich_thuoc, tai_len_boi)
         values ($1,$2,'khieu_nai',$3,$4,$5,$6,$7,$8)
         returning id, ten_goc`,
        [da_luu.ma_tep, nv_id, kn_id, ten_goc, da_luu.ten_luu, da_luu.mime, da_luu.kich_thuoc, nd.sub],
      );
    } catch (loi) {
      await xoa_tep_ho_so(da_luu.ten_luu).catch(() => { /* da co loi that o tren */ });
      throw loi;
    }
    await ghi_nhat_ky(nd.sub, 'khieu_nai_luong.dinh_kem_anh', 'khieu_nai_luong', kn_id,
      { tep_id: moi?.['id'] ?? null }, req.ip);
    return res.code(201).send({ id: moi?.['id'] ?? null, ten: ten_goc });
  });

  // Xem ANH dinh kem cua mot khieu nai: chu khieu nai, hoac admin/nhan su, hoac truong phong cua
  // nguoi do. Tra 404 (khong phai 403) neu khong duoc xem — de khong lo su ton tai cua anh.
  app.get('/khieu-nai-luong/anh/:tep_id', async (req, res) => {
    const nd = nguoi_dung_hien_tai(req);
    const p = req.params as Record<string, string>;
    const tep_id = uuid({ id: p['tep_id'] }, 'id', { bat_buoc: true }) as string;
    const t = await truy_van_mot<{
      ten_luu: string; kieu_mime: string; nhan_vien_id: string | null; phong_ban_id: string | null;
    }>(
      `select t.ten_luu, t.kieu_mime, t.nhan_vien_id, nv.phong_ban_id
         from ho_so_tep t left join nhan_vien nv on nv.id = t.nhan_vien_id
        where t.id = $1 and t.nhom = 'khieu_nai'`,
      [tep_id],
    );
    if (t === null) throw new LoiKhongTim('Không tìm thấy ảnh.');
    if (!xem_duoc_tat_ca(nd)) {
      let duoc = nd.nv !== null && nd.nv === t.nhan_vien_id;
      if (!duoc && nd.vai_tro === 'truong_phong' && t.phong_ban_id !== null) {
        const cung = await truy_van_mot<{ ok: boolean }>(
          'select (phong_ban_id = $2) as ok from nhan_vien where id = $1', [nd.nv, t.phong_ban_id],
        );
        duoc = cung?.ok === true;
      }
      if (!duoc) throw new LoiKhongTim('Không tìm thấy ảnh.');
    }
    const buf = await doc_tep_ho_so(t.ten_luu);
    if (buf === null) throw new LoiKhongTim('Không tìm thấy tệp ảnh trên đĩa.');
    return res
      .header('content-type', t.kieu_mime)
      .header('cache-control', 'private, max-age=3600')
      .send(buf);
  });

  /**
   * Gui khieu nai ve MOT phieu luong da duyet/da tra cua chinh minh (minh bach tien luong). Phai
   * kem `phieu_luong_id` cua chinh minh; chan khieu nai trung con dang mo tren cung phieu.
   */
  app.post('/khieu-nai-luong', async (req, res) => {
    const nd = nguoi_dung_hien_tai(req);
    const nv_id = nhan_vien_cua_toi(req);
    const b = than(req.body);
    const phieu_luong_id = uuid(b, 'phieu_luong_id');
    const noi_dung = chuoi_bat_buoc(b, 'noi_dung', { toi_thieu: 5, toi_da: 2000 });
    if (phieu_luong_id === null) throw new LoiDauVao('Thiếu phiếu lương cần khiếu nại.');

    const p = await truy_van_mot<{ id: string }>(
      `select p.id from phieu_luong p
         join ky_luong k on k.id = p.ky_luong_id
        where p.id = $1 and p.nhan_vien_id = $2 and k.trang_thai in ('da_duyet','da_tra')`,
      [phieu_luong_id, nv_id],
    );
    if (p === null) throw new LoiKhongTim('Không tìm thấy phiếu lương của bạn.');

    // Cho gui NHIEU khieu nai cho cung mot phieu (nhieu van de khac nhau). Chi chan gui TRUNG Y HET
    // (cung noi dung) khi con dang mo — de tranh nhan nham 2 lan; noi dung khac thi cho qua.
    const trung = await truy_van_mot<{ id: string }>(
      `select id from khieu_nai_luong
        where nhan_vien_id = $1 and phieu_luong_id = $2 and trang_thai in ('moi','dang_xem')
          and btrim(noi_dung) = btrim($3) limit 1`,
      [nv_id, phieu_luong_id, noi_dung],
    );
    if (trung !== null) {
      throw new LoiXungDot('Bạn vừa gửi một khiếu nại y hệt cho phiếu này (đang được xử lý).');
    }

    const dong = await truy_van_mot<{ id: string; ma: string }>(
      `insert into khieu_nai_luong (phieu_luong_id, nhan_vien_id, noi_dung)
       values ($1,$2,$3) returning id, ma`,
      [phieu_luong_id, nv_id, noi_dung],
    );
    await ghi_nhat_ky(nd.sub, 'gui_khieu_nai_luong', 'khieu_nai_luong', dong?.id ?? null,
      { phieu_luong_id }, req.ip);

    gui_ngam({
      nguoi_dung_ids: await tai_khoan_nguoi_duyet(nv_id),
      tieu_de: 'Có khiếu nại phiếu lương mới',
      noi_dung: `${await ten_nhan_vien(nv_id)} gửi ${dong?.ma ?? 'khiếu nại'} về phiếu lương.`,
      du_lieu: { man: 'khieu-nai-luong', khieu_nai_id: dong?.id ?? null },
    });
    return res.code(201).send({ ...dong, trang_thai: 'moi' });
  });

  // ================================================================ token push (Expo)
  app.post('/token-push', async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const b = than(req.body);
    const token = chuoi_bat_buoc(b, 'token', { toi_da: 300 });
    const nen_tang = chuoi(b, 'nen_tang', { toi_da: 20 }) ?? 'unknown';

    await thuc_thi(
      `insert into token_push(nguoi_dung_id, token, nen_tang) values ($1,$2,$3)
       on conflict (token) do update set nguoi_dung_id = excluded.nguoi_dung_id`,
      [nd.sub, token, nen_tang],
    );
    return { ok: true };
  });

  app.delete('/token-push', async (req) => {
    // Rang theo CHU SO HUU: xoa token chi khi no thuoc chinh nguoi dang dang nhap. Thieu dieu
    // kien nay thi bat ky ai biet token day cua nguoi khac deu go duoc, khien ho ngung nhan push.
    const nd = nguoi_dung_hien_tai(req);
    const b = than(req.body ?? {});
    const token = chuoi(b, 'token', { toi_da: 300 });
    if (token !== null) {
      await thuc_thi(
        'delete from token_push where token = $1 and nguoi_dung_id = $2', [token, nd.sub]);
    }
    return { ok: true };
  });

  // ================================================================ CAC LOAI DON KHAC
  //
  // Bon loai dung chung bang `don_tu`: lam them gio, doi ca, di cong tac, thoi viec. Mot bo
  // route duy nhat cho ca bon — cac o du lieu rieng cua tung loai duoc `loai_don.ts` khai, va
  // rang buoc theo loai thi CSDL giu (xem di tru 024).

  /** Danh muc loai don, de giao dien dung cai gi may chu nhan chu khong go tay lai. */
  app.get('/don/loai', async () => ({
    danh_sach: CAC_LOAI.map((l) => ({
      ma: l.ma, ten: l.ten, nhan_tu_ngay: l.nhan_tu_ngay, co_khoang_ngay: l.co_khoang_ngay,
    })),
  }));

  /** Don cua chinh minh. `loai` de trong = tat ca. */
  app.get('/don', async (req) => {
    const nv_id = nhan_vien_cua_toi(req);
    const q = than(req.query);
    const loai = trong_tap(q, 'loai', MA_LOAI_DON, {}) as MaLoaiDon | null;
    return { danh_sach: await don_cua_nhan_vien(nv_id, loai) };
  });

  /** Tu lam don. Canh bao phap ly tra ve cung ket qua, khong chan. */
  app.post('/don', async (req, res) => {
    const nd = nguoi_dung_hien_tai(req);
    const nv_id = nhan_vien_cua_toi(req);
    const b = than(req.body);

    const loai = trong_tap(b, 'loai', MA_LOAI_DON, { bat_buoc: true }) as MaLoaiDon;
    const dt = dac_ta(loai);

    const kq = await tao_don(nv_id, {
      loai,
      tu_ngay: ngay_bat_buoc(b, 'tu_ngay'),
      den_ngay: dt.co_khoang_ngay ? khoang_ngay_tuy_chon(b) : null,
      gio_bat_dau: gio(b, 'gio_bat_dau'),
      gio_ket_thuc: gio(b, 'gio_ket_thuc'),
      doi_voi_id: uuid(b, 'doi_voi_id'),
      ca_hien_tai_id: uuid(b, 'ca_hien_tai_id'),
      ca_moi_id: uuid(b, 'ca_moi_id'),
      noi_den: chuoi(b, 'noi_den', { toi_da: 250 }),
      ly_do: chuoi(b, 'ly_do', { toi_da: 1000 }),
    });

    await ghi_nhat_ky(nd.sub, `tu_lam_don_${loai}`, 'don_tu', kq.id, { loai }, req.ip);

    // Don DI MUON tu dong duyet ngay (truoc 7h30 + con luot mien -> duyet; nguoc lai tu choi).
    // Loi tu dong khong lam hong viec nop don — roi ve cho duyet tay nhu cu.
    if (loai === 'di_muon') {
      const r = await tu_dong_quyet_di_muon(kq.id).catch((e: unknown) => {
        console.error('[tu_dong_di_muon] loi:', (e as Error).message);
        return null;
      });
      if (r !== null) return res.code(201).send({ ...kq, trang_thai: r.quyet, tu_dong: true });
    }

    // Don OT di theo chuoi rieng: truong bo phan (cap 1) roi TBKS/admin (cap 2). Ban ghi
    // tao ra da biet no dang cho cap nao roi (`cho_duyet` / `cho_duyet_2`).
    const nguoi_duyet_ids = loai === 'lam_them'
      ? (kq.trang_thai === 'cho_duyet_2'
          ? await tai_khoan_duyet_ot_cap_2()
          : await tai_khoan_duyet_ot_cap_1(nv_id))
      : await tai_khoan_nguoi_duyet(nv_id);
    gui_ngam({
      nguoi_dung_ids: nguoi_duyet_ids,
      tieu_de: `${dt.ten} chờ duyệt`,
      noi_dung: `${dt.nhan_tu_ngay}: ${ngay_viet(kq_tu_ngay(b))}`,
      du_lieu: { man: 'duyet-don', loai, don_id: kq.id },
    });
    return res.code(201).send(kq);
  });

  /** Tu huy don CUA MINH. */
  app.post('/don/:id/huy', async (req) => {
    const nv_id = nhan_vien_cua_toi(req);
    const kq = await huy_don(lay_id(req), nv_id);
    if (kq.tinh_lai !== null) {
      await tinh_lai_khoang(kq.tinh_lai.tu_ngay, kq.tinh_lai.den_ngay, nv_id);
    }
    return { ok: true, da_tinh_lai: kq.tinh_lai !== null };
  });

  // ================================================================ OT: TAI LIEU + KET QUA
  //
  // Don lam them co hai loai tep rieng (nhom `ot_tai_lieu` / `ot_ket_qua` trong kho ho so):
  // tai lieu khi dang ky (tuy chon) va ANH ket qua (bat buoc truoc khi TBKS duyet ket qua).
  // Phan quyen doc: nguoi lam don, truong phong cua phong do, nhan su cac cap va TBKS.

  /** Ket qua OT cua mot don cua minh (khi chua co ban ghi thi tra null). */
  app.get('/don/:id/ket-qua', async (req) => {
    const nv_id = nhan_vien_cua_toi(req);
    const kq = await ket_qua_cua_don(lay_id(req));
    if (kq === null) return { ket_qua: null };
    if (kq.nhan_vien_id !== nv_id) {
      throw new LoiKhongTim('Không tìm thấy kết quả OT của đơn này.');
    }
    return { ket_qua: kq };
  });

  /** Dinh kem tai lieu cho don OT cua minh. Tuy chon; PDF/JPG/PNG. */
  app.post('/don/:id/tai-lieu', {
    bodyLimit: cau_hinh.tep_toi_da_byte + 1024 * 1024,
  }, async (req, res) => {
    const nd = nguoi_dung_hien_tai(req);
    const nv_id = nhan_vien_cua_toi(req);
    const don_id = lay_id(req);

    const don = await truy_van_mot<{ id: string }>(
      `select id from don_tu where id = $1 and nhan_vien_id = $2 and loai = 'lam_them'`,
      [don_id, nv_id],
    );
    if (don === null) throw new LoiKhongTim('Không tìm thấy đơn làm thêm giờ của bạn.');

    let ten_goc = 'tep';
    let du_lieu: Buffer | null = null;
    for await (const phan of req.parts({ limits: { fileSize: cau_hinh.tep_toi_da_byte, files: 1 } })) {
      if (phan.type === 'file') {
        if (phan.fieldname !== 'tep') {
          await phan.toBuffer(); // van phai doc het, neu khong request treo
          continue;
        }
        ten_goc = lam_sach_ten(phan.filename ?? 'tep');
        du_lieu = await phan.toBuffer();
      } else if (typeof phan.value === 'string') {
        // Truong thuong khong dung den o route nay.
      }
    }
    if (du_lieu === null) throw new LoiDauVao('Thiếu tệp đính kèm.');

    const nv = await ma_va_ten_nhan_vien(nv_id);
    const da_luu = await luu_tep_ho_so(du_lieu, ten_goc, {
      ma_nv: nv.ma_nv, ho_ten: nv.ho_ten, nhom: 'ot_tai_lieu',
      ngay: ngay_dia_phuong(new Date()),
    });
    let moi: Record<string, unknown> | null;
    try {
      moi = await truy_van_mot(
        `insert into ho_so_tep(id, nhan_vien_id, nhom, thuoc_id, ten_goc, ten_luu, kieu_mime,
                               kich_thuoc, tai_len_boi)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         returning id, nhom, thuoc_id, ten_goc, kieu_mime, kich_thuoc, tao_luc`,
        [da_luu.ma_tep, nv_id, 'ot_tai_lieu', don_id, ten_goc, da_luu.ten_luu, da_luu.mime,
          da_luu.kich_thuoc, nd.sub],
      );
    } catch (loi) {
      await xoa_tep_ho_so(da_luu.ten_luu).catch(() => { /* loi goc dang duoc nem ra */ });
      throw loi;
    }
    await ghi_nhat_ky(nd.sub, 'ot_tai_lieu_len', 'ho_so_tep', String(moi?.['id'] ?? ''),
      { don_tu_id: don_id, ten_goc }, req.ip);
    return res.code(201).send(moi);
  });

  /** Nop KET QUA OT bang anh (1-5 anh JPEG/PNG), kem ghi chu tuy chon. */
  app.post('/don/:id/ket-qua', {
    bodyLimit: cau_hinh.tep_toi_da_byte * 5 + 1024 * 1024,
  }, async (req, res) => {
    const nd = nguoi_dung_hien_tai(req);
    const nv_id = nhan_vien_cua_toi(req);
    const don_id = lay_id(req);

    const truong: Record<string, string> = {};
    const anh: Buffer[] = [];
    let ten_goc_dau = 'anh';
    for await (const phan of req.parts({ limits: { fileSize: cau_hinh.tep_toi_da_byte, files: 5 } })) {
      if (phan.type === 'file') {
        if (phan.fieldname !== 'anh') {
          await phan.toBuffer();
          continue;
        }
        if (anh.length === 0) ten_goc_dau = lam_sach_ten(phan.filename ?? 'anh');
        anh.push(await phan.toBuffer());
      } else if (typeof phan.value === 'string') {
        truong[phan.fieldname] = phan.value;
      }
    }
    if (anh.length === 0) {
      throw new LoiDauVao('Phải đính kèm ít nhất một ảnh chụp kết quả OT.');
    }
    for (const a of anh) {
      if (!la_anh(a)) throw new LoiDauVao('Ảnh kết quả OT chỉ nhận định dạng JPG hoặc PNG.');
    }

    // Tao (hoac mo lai sau khi bi tu choi) ban ghi ket qua truoc, roi gan anh vao dung no.
    const ghi_chu = chuoi(truong, 'ghi_chu', { toi_da: 500 });
    const kq = await nop_ket_qua(don_id, nv_id, ghi_chu);

    const nv = await ma_va_ten_nhan_vien(nv_id);
    const tep_moi: unknown[] = [];
    for (let i = 0; i < anh.length; i++) {
      const a = anh[i] as Buffer;
      const ten_goc = i === 0 ? ten_goc_dau : `anh-${i + 1}.jpg`;
      const da_luu = await luu_tep_ho_so(a, ten_goc, {
        ma_nv: nv.ma_nv, ho_ten: nv.ho_ten, nhom: 'ot_ket_qua',
        ngay: ngay_dia_phuong(new Date()),
      });
      try {
        const moi = await truy_van_mot(
          `insert into ho_so_tep(id, nhan_vien_id, nhom, thuoc_id, ten_goc, ten_luu, kieu_mime,
                                 kich_thuoc, tai_len_boi)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           returning id, ten_goc, kieu_mime, kich_thuoc, tao_luc`,
          [da_luu.ma_tep, nv_id, 'ot_ket_qua', kq.id, ten_goc, da_luu.ten_luu, da_luu.mime,
            da_luu.kich_thuoc, nd.sub],
        );
        tep_moi.push(moi);
      } catch (loi) {
        await xoa_tep_ho_so(da_luu.ten_luu).catch(() => { /* loi goc dang duoc nem ra */ });
        throw loi;
      }
    }

    await ghi_nhat_ky(nd.sub, 'ot_nop_ket_qua', 'ket_qua_ot', kq.id,
      { don_tu_id: don_id, so_anh: anh.length }, req.ip);

    gui_ngam({
      nguoi_dung_ids: await tai_khoan_duyet_ot_cap_2(),
      tieu_de: 'Có kết quả OT chờ duyệt',
      noi_dung: 'Một nhân viên vừa nộp kết quả làm thêm giờ bằng ảnh.',
      du_lieu: { man: 'duyet-ket-qua-ot', ket_qua_id: kq.id },
    });

    return res.code(201).send({ id: kq.id, so_anh: anh.length, tep_moi });
  });

  // ================================================================ GOC NHIN CA NHAN
  //
  // Dashboard ca nhan, thong bao (BGD), van ban cong ty, ho so cua toi, tro ly nhan su. TAT CA
  // chi dung du lieu cua CHINH nguoi dang nhap — nhan vien thuong khong bao gio thay dashboard
  // toan cong ty hay du lieu nguoi khac (NĐ 13/2023).

  /** Tong quan ca nhan: cong thang nay, phep, nghi le sap toi, thong bao moi, don cho. */
  app.get('/tong-quan', async (req) => {
    const nv_id = nhan_vien_cua_toi(req);
    const hom_nay = ngay_dia_phuong(new Date());
    const thang = hom_nay.slice(0, 7);

    const [cong, phep, nghi_le, thong_bao, don_cho] = await Promise.all([
      tong_hop_thang(nv_id, thang),
      truy_van_mot<{ quota: number; da_dung: number }>(
        `select nv.so_ngay_phep_nam::float as quota,
                coalesce((
                  select sum(case when d.nua_ngay then 0.5
                                  else (d.den_ngay - d.tu_ngay + 1) end)
                    from don_nghi_phep d
                   where d.nhan_vien_id = nv.id and d.loai = 'phep_nam'
                     and d.trang_thai = 'da_duyet'
                     and extract(year from d.tu_ngay) = extract(year from current_date)
                ), 0)::float as da_dung
           from nhan_vien nv where nv.id = $1`,
        [nv_id],
      ),
      truy_van(
        'select ngay, ten from ngay_le where ngay >= $1 order by ngay limit 5', [hom_nay],
      ),
      truy_van_mot<{ chua_doc: number; can_giai_trinh: number }>(
        `with cua_toi as (
           select tb.id, tb.can_giai_trinh from thong_bao tb
            where tb.da_go = false and (tb.het_han is null or tb.het_han > now())
              and (tb.pham_vi = 'toan_cong_ty'
                   or tb.phong_ban_id = (select phong_ban_id from nhan_vien where id = $1)
                   or tb.nhan_vien_id = $1)
         )
         select count(*) filter (where not exists (
                  select 1 from thong_bao_da_doc dd
                   where dd.thong_bao_id = cua_toi.id and dd.nhan_vien_id = $1))::int as chua_doc,
                count(*) filter (where cua_toi.can_giai_trinh and not exists (
                  select 1 from thong_bao_da_doc dd
                   where dd.thong_bao_id = cua_toi.id and dd.nhan_vien_id = $1
                     and dd.giai_trinh is not null))::int as can_giai_trinh
           from cua_toi`,
        [nv_id],
      ),
      truy_van_mot<{ so_don_cho: number }>(
        `select count(*)::int as so_don_cho from (
           select trang_thai from don_nghi_phep where nhan_vien_id = $1
           union all select trang_thai from don_giai_trinh where nhan_vien_id = $1
           union all select trang_thai from don_tu where nhan_vien_id = $1
         ) t where trang_thai = 'cho_duyet'`,
        [nv_id],
      ),
    ]);

    return { thang, cong, phep, nghi_le, thong_bao, don_cho };
  });

  /** Ho so cua CHINH minh — thong tin co ban + lien he. Nhan vien thuong xem duoc cua minh.
   *
   * Ke tu 1.65.0 tra THEM cac khoi hop dong / luong / phu thuoc / BHXH / thiet bi / tai lieu
   * (truong PHU, noi them vao chu khong doi hinh dang cu) de man "Ca nhan" trong trang
   * /ca-nhan co du lieu. CCCD, ma so thue, so BHXH nam o bang ho_so_ca_nhan rieng theo
   * Nghi dinh 13/2023/ND-CP. */
  app.get('/ho-so', async (req) => {
    const nv_id = nhan_vien_cua_toi(req);
    const nd = nguoi_dung_hien_tai(req);

    const [ho_so, ca_nhan, hop_dong, luong, phu_thuoc, bhxh, thiet_bi, tai_lieu] =
      await Promise.all([
        truy_van_mot(
          `select nv.ma_nv, nv.ma_erp, nv.ho_ten, nv.chuc_danh, nv.pin_may, nv.ngay_vao,
                  nv.ngay_chinh_thuc, nv.email, nv.so_dien_thoai,
                  nv.so_ngay_phep_nam::float as so_ngay_phep_nam,
                  nv.duoc_cham_cong_dien_thoai, nv.dang_hoat_dong,
                  pb.ten as phong_ban, cl.ten as ca_lam, cl.gio_vao, cl.gio_ra,
                  ql.ho_ten as nguoi_quan_ly
             from nhan_vien nv
             left join phong_ban pb on pb.id = nv.phong_ban_id
             left join ca_lam cl on cl.id = nv.ca_lam_id
             left join nhan_vien ql on ql.id = nv.nguoi_quan_ly_id
            where nv.id = $1`,
          [nv_id],
        ),
        truy_van_mot(
          `select cccd_so, cccd_ngay_cap, cccd_noi_cap, ngay_sinh, gioi_tinh, noi_sinh,
                  dan_toc, quoc_tich, tinh_trang_hon_nhan, dia_chi_thuong_tru, dia_chi_hien_tai,
                  ma_so_thue, ngan_hang, so_tai_khoan, don_vi_chi_luong, don_vi_dong_bhxh,
                  so_bhxh, so_the_bhyt, co_quan_bhxh,
                  noi_kham_chua_benh, kham_suc_khoe_ngay, kham_suc_khoe_noi, kham_suc_khoe_ket_luan
             from ho_so_ca_nhan where nhan_vien_id = $1`,
          [nv_id],
        ),
        truy_van_mot(
          `select so_hd, loai, chuc_danh, noi_lam_viec, ngay_ky, hieu_luc_tu, hieu_luc_den,
                  luong_co_ban, trang_thai
             from hop_dong_lao_dong
            where nhan_vien_id = $1 and trang_thai in ('nhap', 'hieu_luc')
            order by hieu_luc_tu desc limit 1`,
          [nv_id],
        ),
        truy_van_mot(
          `select hieu_luc_tu, luong_co_ban, phu_cap, hinh_thuc, so_quyet_dinh
             from quyet_dinh_luong
            where nhan_vien_id = $1 and hieu_luc_tu <= current_date
            order by hieu_luc_tu desc limit 1`,
          [nv_id],
        ),
        truy_van(
          `select ho_ten, quan_he, ngay_sinh, ma_so_thue, so_cccd, tu_thang, den_thang,
                  da_dang_ky
             from nguoi_phu_thuoc
            where nhan_vien_id = $1
            order by tu_thang desc nulls last, ho_ten`,
          [nv_id],
        ),
        truy_van(
          `select loai, thang, muc_dong, ty_le_phan_tram, so_ho_so, trang_thai, ngay_nop, ghi_chu
             from bhxh_su_kien
            where nhan_vien_id = $1
            order by thang desc limit 10`,
          [nv_id],
        ),
        truy_van(
          `select loai, ten, hang, model, so_seri, ngay_cap, tinh_trang
             from thiet_bi_cap_phat
            where nhan_vien_id = $1
            order by ngay_cap desc nulls last`,
          [nv_id],
        ),
        truy_van(
          `select dm.ma, dm.ten, dm.nhom, dm.mo_ta, dm.bat_buoc, dm.chi_khi_nghi_viec,
                  coalesce(tl.trang_thai, 'thieu') as trang_thai,
                  tl.id is not null as co_dong,
                  ht.ten_goc as ten_tep
             from danh_muc_tai_lieu dm
             left join tai_lieu_nhan_vien tl
               on tl.danh_muc_id = dm.id and tl.nhan_vien_id = $1
             left join ho_so_tep ht on ht.id = tl.tep_id
            where dm.dang_dung = true
            order by dm.nhom, dm.thu_tu, dm.ten`,
          [nv_id],
        ),
      ]);

    // Giao dien doc `du_lieu.nhan_vien.*` — PHAI long ho so nhan vien duoi khoa `nhan_vien`,
    // khong trai phang ra top-level (`...ho_so`), neu khong `du_lieu.nhan_vien` la undefined va
    // trang Ca nhan vo khi doc `.ho_ten`. Tai khoan chua noi ho so nhan vien -> `nhan_vien: null`,
    // giao dien tu hien thong bao "chua noi ho so" thay vi bao loi.
    return {
      nhan_vien: ho_so,
      ten_dang_nhap: nd.ten,
      ca_nhan,
      hop_dong,
      luong,
      nguoi_phu_thuoc: phu_thuoc,
      bhxh,
      thiet_bi,
      tai_lieu,
    };
  });

  /** Cap nhat LIEN HE cua chinh minh (SDT, email). Truong nhe, tu phuc vu, ghi nhat ky. */
  app.post('/ho-so/lien-he', async (req, res) => {
    const nd = nguoi_dung_hien_tai(req);
    const nv_id = nhan_vien_cua_toi(req);
    const b = than(req.body);
    const sdt = chuoi(b, 'so_dien_thoai', { toi_da: 20 });
    const email = chuoi(b, 'email', { toi_da: 120 });
    if (sdt !== null && sdt !== '' && !/^[0-9+\-() .]{6,20}$/.test(sdt)) {
      throw new LoiDauVao('Số điện thoại không hợp lệ.');
    }
    if (email !== null && email !== '' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new LoiDauVao('Email không hợp lệ.');
    }
    await thuc_thi(
      `update nhan_vien set so_dien_thoai = $2, email = $3, cap_nhat_luc = now() where id = $1`,
      [nv_id, sdt === '' ? null : sdt, email === '' ? null : email],
    );
    await ghi_nhat_ky(nd.sub, 'tu_cap_nhat_lien_he', 'nhan_vien', nv_id, {}, req.ip);
    return res.send({ ok: true });
  });

  /** Thong bao (BGD/HR) trong pham vi cua toi, kem trang thai da doc / da giai trinh. */
  app.get('/thong-bao', async (req) => {
    const nv_id = nhan_vien_cua_toi(req);
    return truy_van(
      `select tb.id, tb.ma, tb.tieu_de, tb.noi_dung, tb.muc_do, tb.can_giai_trinh,
              tb.pham_vi,
              tb.tao_luc, tb.het_han,
              tb.da_gui_email, tb.gui_email_luc, tb.gui_email_loi,
              dd.doc_luc, dd.giai_trinh, dd.giai_trinh_luc, dd.ma as ma_giai_trinh,
              (dd.doc_luc is not null) as da_doc,
              (dd.giai_trinh is not null) as da_giai_trinh,
              (tb.ten_luu is not null) as co_tep
         from thong_bao tb
         left join thong_bao_da_doc dd on dd.thong_bao_id = tb.id and dd.nhan_vien_id = $1
        where tb.da_go = false and (tb.het_han is null or tb.het_han > now())
          and (tb.pham_vi = 'toan_cong_ty'
               or tb.phong_ban_id = (select phong_ban_id from nhan_vien where id = $1)
               or tb.nhan_vien_id = $1)
        order by (dd.doc_luc is null) desc, tb.muc_do = 'khan' desc, tb.tao_luc desc
        limit 200`,
      [nv_id],
    );
  });

  /** Xac nhan da doc mot thong bao; kem giai trinh neu thong bao yeu cau. */
  app.post('/thong-bao/:id/xac-nhan', async (req, res) => {
    const nd = nguoi_dung_hien_tai(req);
    const nv_id = nhan_vien_cua_toi(req);
    const tb_id = lay_id(req);
    const b = than(req.body);
    const giai_trinh = chuoi(b, 'giai_trinh', { toi_da: 2000 });

    const tb = await truy_van_mot<{ can_giai_trinh: boolean }>(
      `select tb.can_giai_trinh from thong_bao tb
        where tb.id = $1 and tb.da_go = false
          and (tb.pham_vi = 'toan_cong_ty'
               or tb.phong_ban_id = (select phong_ban_id from nhan_vien where id = $2)
               or tb.nhan_vien_id = $2)`,
      [tb_id, nv_id],
    );
    if (tb === null) throw new LoiKhongTim('Không tìm thấy thông báo trong phạm vi của bạn.');
    if (tb.can_giai_trinh && (giai_trinh === null || giai_trinh.trim().length < 5)) {
      throw new LoiDauVao('Thông báo này yêu cầu bạn nhập giải trình (tối thiểu 5 ký tự).');
    }

    const dong = await truy_van_mot<{ ma: string | null; giai_trinh: string | null }>(
      `insert into thong_bao_da_doc(thong_bao_id, nhan_vien_id, giai_trinh)
       values ($1, $2, $3)
       on conflict (thong_bao_id, nhan_vien_id) do update
         set giai_trinh = coalesce(excluded.giai_trinh, thong_bao_da_doc.giai_trinh)
       returning ma, giai_trinh`,
      [tb_id, nv_id, giai_trinh === '' ? null : giai_trinh],
    );
    await ghi_nhat_ky(nd.sub, 'xac_nhan_thong_bao', 'thong_bao', tb_id,
      { co_giai_trinh: dong?.giai_trinh != null }, req.ip);
    return res.send({ ok: true, ma_giai_trinh: dong?.ma ?? null });
  });

  /** Tai tep DOCX (van ban ban hanh) cua mot thong bao trong pham vi cua toi. */
  app.get('/thong-bao/:id/tai', async (req, res) => {
    const nv_id = nhan_vien_cua_toi(req);
    const tb_id = lay_id(req);
    const tb = await truy_van_mot<{ ten_luu: string | null; mime: string | null }>(
      `select tb.ten_luu, tb.mime from thong_bao tb
        where tb.id = $1 and tb.da_go = false
          and (tb.pham_vi = 'toan_cong_ty'
               or tb.phong_ban_id = (select phong_ban_id from nhan_vien where id = $2)
               or tb.nhan_vien_id = $2)`,
      [tb_id, nv_id],
    );
    if (tb === null || tb.ten_luu === null) {
      throw new LoiKhongTim('Không tìm thấy tệp văn bản trong phạm vi của bạn.');
    }
    const du_lieu = await doc_tep_ho_so(tb.ten_luu);
    if (du_lieu === null) throw new LoiKhongTim('Tệp không còn trên máy chủ.');
    return res
      .header('content-type', tb.mime ?? 'application/octet-stream')
      .header('x-content-type-options', 'nosniff')
      .header('content-security-policy', "default-src 'none'; sandbox")
      .header('content-disposition', 'attachment; filename*=UTF-8\'\'van-ban-thong-bao.docx')
      .send(du_lieu);
  });

  /**
   * Thong bao POPUP con hieu luc, CHUA doc — de app hien hop thoai bat buoc doc khi mo. Dismiss
   * = POST /thong-bao/:id/xac-nhan (tao dong da_doc), sau do khong con tra ve o day.
   */
  app.get('/thong-bao/popup', async (req) => {
    const nv_id = nhan_vien_cua_toi(req);
    return truy_van(
      `select tb.id, tb.ma, tb.tieu_de, tb.noi_dung, tb.muc_do, tb.can_giai_trinh, tb.tao_luc
         from thong_bao tb
         left join thong_bao_da_doc dd on dd.thong_bao_id = tb.id and dd.nhan_vien_id = $1
        where tb.popup = true and tb.da_go = false
          and (tb.het_han is null or tb.het_han > now())
          and dd.doc_luc is null
          and (tb.pham_vi = 'toan_cong_ty'
               or tb.phong_ban_id = (select phong_ban_id from nhan_vien where id = $1)
               or tb.nhan_vien_id = $1)
        order by tb.muc_do = 'khan' desc, tb.tao_luc desc
        limit 20`,
      [nv_id],
    );
  });

  /**
   * Kho van ban cong ty. Loc theo PHAM VI: van ban toan cong ty ai cung thay; van ban phong
   * ban chi nguoi trong phong; van ban ca nhan chi dung nguoi do. Van ban cu (truoc ban soan
   * thao) co pham_vi mac dinh 'toan_cong_ty' nen van hien voi moi nguoi.
   */
  app.get('/van-ban', async (req) => {
    const nv_id = nhan_vien_cua_toi(req);
    return truy_van(
      `select id, ma, tieu_de, mo_ta, noi_dung, nguoi_ban_hanh, danh_muc, ten_goc, mime,
              kich_thuoc, tao_luc, (ten_luu is not null) as co_tep
         from van_ban_cong_ty
        where da_go = false
          and (pham_vi = 'toan_cong_ty'
               or phong_ban_id = (select phong_ban_id from nhan_vien where id = $1)
               or nhan_vien_id = $1)
        order by danh_muc, tao_luc desc limit 500`,
      [nv_id],
    );
  });

  /**
   * Van ban DA BAN HANH co so ky hieu (tu module AI) trong pham vi cua toi.
   * Nhan vien doc + tai DOCX o tab "Van ban ban hanh" cua trang Van ban cong ty.
   */
  app.get('/van-ban-ban-hanh', async (req) => {
    const nv_id = nhan_vien_cua_toi(req);
    return truy_van(
      `select tb.id, tb.ma, tb.tieu_de, tb.muc_do, tb.tao_luc,
              n.so_ky_hieu, n.loai, (tb.ten_luu is not null) as co_tep
         from thong_bao tb
         join thong_bao_nhap_ai n on n.thong_bao_id = tb.id
        where tb.da_go = false and (tb.het_han is null or tb.het_han > now())
          and (tb.pham_vi = 'toan_cong_ty'
               or tb.phong_ban_id = (select phong_ban_id from nhan_vien where id = $1)
               or tb.nhan_vien_id = $1)
        order by tb.tao_luc desc limit 300`,
      [nv_id],
    );
  });

  /** Tai mot van ban cong ty ve. */
  app.get('/van-ban/:id/tai', async (req, res) => {
    const id = lay_id(req);
    const vb = await truy_van_mot<{ ten_luu: string | null; mime: string | null; ten_goc: string | null }>(
      'select ten_luu, mime, ten_goc from van_ban_cong_ty where id = $1 and da_go = false', [id],
    );
    if (vb === null || vb.ten_luu === null) throw new LoiKhongTim('Văn bản không có tệp đính kèm.');
    const du_lieu = await doc_tep_ho_so(vb.ten_luu);
    if (du_lieu === null) throw new LoiKhongTim('Tệp không còn trên máy chủ.');
    const ten = vb.ten_goc ?? 'van-ban';
    return res
      .header('content-type', vb.mime ?? 'application/octet-stream')
      .header('x-content-type-options', 'nosniff')
      .header('content-security-policy', "default-src 'none'; sandbox")
      .header('content-disposition', `attachment; filename*=UTF-8''${encodeURIComponent(ten)}`)
      .send(du_lieu);
  });

  /** Tro ly nhan su: hoi bang tieng Viet, tra loi tu du lieu cua chinh minh. */
  app.get('/tro-ly', async (req) => {
    const nv_id = nhan_vien_cua_toi(req);
    const q = req.query as Record<string, unknown>;
    const cau_hoi = typeof q['hoi'] === 'string' ? q['hoi'] : '';
    return tra_loi_tro_ly(nv_id, cau_hoi);
  });

  /**
   * Lich su hoi thoai tro ly cua CHINH minh — moi nhat truoc, toi da 100 luot. Du lieu ca
   * nhan: chi chu du lieu doc duoc cua minh (khong lo lich su nguoi khac).
   */
  app.get('/tro-ly/lich-su', async (req) => {
    const nv_id = nhan_vien_cua_toi(req);
    return truy_van(
      `select cau_hoi, tra_loi, y_dinh, tao_luc from tro_ly_hoi_thoai
        where nhan_vien_id = $1 order by tao_luc desc limit 100`,
      [nv_id],
    );
  });

  /** Xoa toan bo lich su tro ly cua CHINH minh — quyen cua chu du lieu. */
  app.delete('/tro-ly/lich-su', async (req) => {
    const nv_id = nhan_vien_cua_toi(req);
    await thuc_thi('delete from tro_ly_hoi_thoai where nhan_vien_id = $1', [nv_id]);
    return { ok: true };
  });

  // ---------------------------------------------------------------- chuong bao (notification)
  /** Thong bao rieng cua CHINH tai khoan nay + so chua doc + trang thai xu ly live. */
  app.get('/bao', async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    const [danh_sach, dem] = await Promise.all([
      truy_van<BaoThongBao>(
        `select id, tieu_de, noi_dung, du_lieu, da_doc, doc_luc, tao_luc
           from thong_bao_rieng where nguoi_dung_id = $1
          order by da_doc, tao_luc desc limit 50`,
        [nd.sub],
      ),
      truy_van_mot<{ so: number }>(
        'select count(*)::int as so from thong_bao_rieng where nguoi_dung_id = $1 and da_doc = false',
        [nd.sub],
      ),
    ]);
    await gan_trang_thai_bao(danh_sach, nd.nv);
    return { danh_sach, so_chua_doc: dem?.so ?? 0 };
  });

  /** Danh dau mot thong bao da doc (ghi doc_luc lan dau tien). */
  app.post('/bao/:id/doc', async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    await thuc_thi(
      `update thong_bao_rieng
          set da_doc = true, doc_luc = coalesce(doc_luc, now())
        where id = $1 and nguoi_dung_id = $2`,
      [lay_id(req), nd.sub],
    );
    return { ok: true };
  });

  /** Danh dau TAT CA da doc (ghi doc_luc cho tung dong chua doc). */
  app.post('/bao/doc-het', async (req) => {
    const nd = nguoi_dung_hien_tai(req);
    await thuc_thi(
      `update thong_bao_rieng
          set da_doc = true, doc_luc = coalesce(doc_luc, now())
        where nguoi_dung_id = $1 and da_doc = false`,
      [nd.sub],
    );
    return { ok: true };
  });

  // ---------------------------------------------------------------- de xuat & kien nghi
  /** Danh muc loai de xuat dang dung (de giao dien do danh sach, khong go tay). */
  app.get('/de-xuat/loai', async () => truy_van(
    `select id, ma_loai, ten, mo_ta, can_so_luong from loai_de_xuat
      where dang_dung = true order by thu_tu, ten`));

  /** De xuat cua CHINH minh. */
  app.get('/de-xuat', async (req) => {
    const nv_id = nhan_vien_cua_toi(req);
    return truy_van(
      `select d.id, d.ma, d.tieu_de, d.noi_dung, d.so_luong, d.trang_thai,
              d.ghi_chu_duyet, d.duyet_luc, d.tao_luc, l.ten as ten_loai, l.can_so_luong
         from de_xuat d join loai_de_xuat l on l.id = d.loai_de_xuat_id
        where d.nhan_vien_id = $1 order by d.tao_luc desc limit 200`,
      [nv_id],
    );
  });

  /** Tu gui de xuat. */
  app.post('/de-xuat', async (req, res) => {
    const nd = nguoi_dung_hien_tai(req);
    const nv_id = nhan_vien_cua_toi(req);
    const b = than(req.body);
    const loai_id = uuid(b, 'loai_de_xuat_id', { bat_buoc: true }) as string;
    const tieu_de = chuoi_bat_buoc(b, 'tieu_de', { toi_da: 250, toi_thieu: 3 });
    const noi_dung = chuoi(b, 'noi_dung', { toi_da: 4000 });
    const sl_tho = b['so_luong'];
    const so_luong = typeof sl_tho === 'number' && Number.isInteger(sl_tho) && sl_tho > 0
      ? Math.min(sl_tho, 100000) : null;

    const loai = await truy_van_mot<{ id: string; ten: string }>(
      'select id, ten from loai_de_xuat where id = $1 and dang_dung = true', [loai_id],
    );
    if (loai === null) throw new LoiKhongTim('Loại đề xuất không hợp lệ.');

    const dong = await truy_van_mot<{ id: string; ma: string }>(
      `insert into de_xuat(nhan_vien_id, loai_de_xuat_id, tieu_de, noi_dung, so_luong)
       values ($1,$2,$3,$4,$5) returning id, ma`,
      [nv_id, loai_id, tieu_de, noi_dung ?? '', so_luong],
    );
    await ghi_nhat_ky(nd.sub, 'gui_de_xuat', 'de_xuat', dong?.id ?? null, { loai: loai.ten }, req.ip);
    gui_ngam({
      nguoi_dung_ids: await tai_khoan_nguoi_duyet(nv_id),
      tieu_de: `Đề xuất mới chờ duyệt: ${loai.ten}`,
      noi_dung: `${await ten_nhan_vien(nv_id)}: ${tieu_de}`,
      du_lieu: { man: 'duyet-don', loai: 'de_xuat', de_xuat_id: dong?.id ?? null },
    });
    return res.code(201).send({ ...dong, trang_thai: 'cho_duyet' });
  });

  /** Tu huy de xuat CUA MINH khi con cho duyet. */
  app.post('/de-xuat/:id/huy', async (req) => {
    const nv_id = nhan_vien_cua_toi(req);
    const kq = await thuc_thi(
      `update de_xuat set trang_thai = 'da_huy'
        where id = $1 and nhan_vien_id = $2 and trang_thai = 'cho_duyet'`,
      [lay_id(req), nv_id],
    );
    if (kq === 0) throw new LoiXungDot('Đề xuất không còn ở trạng thái chờ duyệt.');
    return { ok: true };
  });
}

function lay_id(req: { params: unknown }): string {
  const p = req.params as Record<string, string>;
  return uuid({ id: p['id'] }, 'id', { bat_buoc: true }) as string;
}
