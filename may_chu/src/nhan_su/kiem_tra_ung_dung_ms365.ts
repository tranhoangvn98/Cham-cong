// Quet bao cao Microsoft 365 va ghi anh chup "ung dung bat buoc" cho toan bo nhan vien dang lam.
//
// Nguon du lieu va gioi han da ghi o `ung_dung_ms365.ts` (module thuan). File nay chi lo phan
// mang + CSDL:
//   1. Doc 2 bao cao CSV (Microsoft khong tra JSON cho tenant nay — da thu, 400 "JSON format is
//      not supported"; CSV tra 302 roi tai file, `fetch` tu theo redirect).
//   2. Doi chieu UPN -> nhan vien qua `nguoi_dung.email_microsoft` (UPN that), sau do `nhan_vien.email`.
//   3. GHI DE toan bo anh chup trong MOT transaction: doc gia khong bao gio thay nua nay cu nua kia.
import { cau_hinh } from '../cau_hinh.ts';
import { trong_giao_dich, truy_van } from '../csdl/ket_noi.ts';
import { lay_token_graph } from '../su_kien/gui_email.ts';
import { graph_da_cau_hinh } from './ms365.ts';
import {
  danh_gia_ung_dung, doc_bao_cao_app, doc_bao_cao_onedrive, la_thieu,
  type DongBaoCaoApp, type DongBaoCaoOneDrive, type DongKiemTraUngDung,
} from './ung_dung_ms365.ts';

const HET_GIO_MS = 45_000;

interface NhanVienUpn {
  id: string;
  ma_nv: string;
  ho_ten: string;
  upn: string | null;
}

export interface KetQuaKiemTraUngDung {
  so_nhan_vien: number;
  so_dong: number;
  /** So nguoi con thieu it nhat MOT ung dung CO THE kiem tra duoc. */
  so_nguoi_thieu: number;
  /** Ngay bao cao CU NHAT trong anh chup (null khi khong co dong nao). */
  ngay_bao_cao: string | null;
  /** Loi tung nguon — rong nghia la ca hai bao cao doc duoc. */
  loi: string[];
}

/**
 * Doc mot bao cao CSV qua Graph app-only. NEM loi khi HTTP khong 2xx — ben goi quyet dinh
 * ghi "khong kiem tra duoc" cho cac ung dung cua nguon do.
 */
async function doc_bao_cao_csv(duong: string): Promise<string> {
  const token = await lay_token_graph();
  const res = await fetch(`${cau_hinh.mail.goc_graph}${duong}`, {
    headers: { authorization: `Bearer ${token}`, accept: 'text/csv' },
    redirect: 'follow',
    signal: AbortSignal.timeout(HET_GIO_MS),
  });
  if (!res.ok) {
    throw new Error(`Graph từ chối đọc báo cáo (HTTP ${String(res.status)})`);
  }
  return res.text();
}

/**
 * Nhan vien dang lam + UPN Microsoft cua ho.
 *
 * Uu tien `nguoi_dung.email_microsoft` (UPN that do Entra cap, da loc trung bang unique index)
 * — `nhan_vien.email` chi la duong du phong, va co the la dia chi nhan thu khong phai UPN.
 */
async function nap_nhan_vien_upn(): Promise<NhanVienUpn[]> {
  return truy_van<NhanVienUpn>(
    `select nv.id, nv.ma_nv, nv.ho_ten,
            coalesce((
              select nd.email_microsoft
                from nguoi_dung nd
               where nd.nhan_vien_id = nv.id
                 and nd.email_microsoft is not null
                 and btrim(nd.email_microsoft) <> ''
               order by nd.dang_hoat_dong desc, nd.tao_luc
               limit 1), nv.email) as upn
       from nhan_vien nv
      where nv.dang_hoat_dong = true
      order by nv.ma_nv`,
  );
}

function loi_than_chu(loi: unknown): string {
  return loi instanceof Error ? loi.message : String(loi);
}

/**
 * Mot vong kiem tra: doc bao cao, danh gia tung nguoi, ghi de anh chup.
 *
 * Khong co hieu luc khi chua cau hinh Graph hoac ca hai bao cao deu loi — khi do NEM loi de
 * lich/nguoi bam nut thay ro, khong ghi mot anh chup toan "khong kiem tra duoc" vo nghia.
 */
export async function kiem_tra_ung_dung_ms365(): Promise<KetQuaKiemTraUngDung> {
  if (!graph_da_cau_hinh()) {
    throw new Error('Chưa cấu hình Microsoft Graph — chưa kiểm tra được ứng dụng bắt buộc.');
  }

  const loi: string[] = [];
  let baoCaoApp: Map<string, DongBaoCaoApp> | null = null;
  let baoCaoOneDrive: Map<string, DongBaoCaoOneDrive> | null = null;

  try {
    baoCaoApp = doc_bao_cao_app(
      await doc_bao_cao_csv("/reports/getM365AppUserDetail(period='D30')?$format=text/csv"));
  } catch (e) {
    loi.push(`Báo cáo sử dụng ứng dụng M365: ${loi_than_chu(e)}`);
  }
  try {
    baoCaoOneDrive = doc_bao_cao_onedrive(
      await doc_bao_cao_csv("/reports/getOneDriveActivityUserDetail(period='D30')?$format=text/csv"));
  } catch (e) {
    loi.push(`Báo cáo OneDrive: ${loi_than_chu(e)}`);
  }

  if (baoCaoApp === null && baoCaoOneDrive === null) {
    throw new Error(`Không đọc được báo cáo Microsoft 365. ${loi.join(' · ')}`);
  }

  const ds = await nap_nhan_vien_upn();
  // Anh chup nguoi da duoc cap giay phep: phan biet "khong co giay phep" voi "khong dung".
  // Bang trong (chua tung quet / dang loi) thi de null — khong ket luan sai cho ca cong ty.
  const dsGiayPhep = await truy_van<{ upn: string }>(
    'select lower(upn) as upn from ms365_nguoi_da_cap_phep');
  const tapGiayPhep = dsGiayPhep.length === 0
    ? null
    : new Set(dsGiayPhep.map((d) => d.upn));
  const theoNguoi: { nhan_vien_id: string; dong: DongKiemTraUngDung[] }[] = [];
  for (const nv of ds) {
    theoNguoi.push({
      nhan_vien_id: nv.id,
      dong: danh_gia_ung_dung({
        upn: nv.upn,
        baoCaoApp: baoCaoApp ?? new Map(),
        baoCaoOneDrive: baoCaoOneDrive ?? new Map(),
        co_bao_cao_app: baoCaoApp !== null,
        co_bao_cao_onedrive: baoCaoOneDrive !== null,
        upn_co_giay_phep: tapGiayPhep,
      }),
    });
  }

  const id: string[] = [];
  const nen: string[] = [];
  const ma: string[] = [];
  const trangThai: string[] = [];
  const lanHoatDong: (string | null)[] = [];
  const ngayBaoCao: (string | null)[] = [];
  const nguon: string[] = [];
  const chiTiet: (string | null)[] = [];
  let soNguoiThieu = 0;
  let ngayCuNhat: string | null = null;

  for (const n of theoNguoi) {
    if (n.dong.some((d) => la_thieu(d.trang_thai))) soNguoiThieu += 1;
    for (const d of n.dong) {
      id.push(n.nhan_vien_id);
      nen.push(d.nen_tang);
      ma.push(d.ung_dung);
      trangThai.push(d.trang_thai);
      lanHoatDong.push(d.lan_hoat_dong);
      ngayBaoCao.push(d.ngay_bao_cao);
      nguon.push(d.nguon);
      chiTiet.push(d.chi_tiet);
      if (d.ngay_bao_cao !== null && (ngayCuNhat === null || d.ngay_bao_cao < ngayCuNhat)) {
        ngayCuNhat = d.ngay_bao_cao;
      }
    }
  }

  await trong_giao_dich(async (khach) => {
    // XOA het roi insert lai: anh chup phai la mot KHOANH KHAC, khong phai hop cua hai lan quet.
    // Xoa ca dong cua nguoi da nghi — bang nay chi phuc vu van hanh.
    await khach.query('delete from ms365_ung_dung_kiem_tra');
    if (id.length === 0) return;
    await khach.query(
      `insert into ms365_ung_dung_kiem_tra
         (nhan_vien_id, nen_tang, ung_dung, trang_thai, lan_hoat_dong, ngay_bao_cao,
          nguon, chi_tiet)
       select * from unnest(
         $1::uuid[], $2::text[], $3::text[], $4::text[],
         $5::date[], $6::date[], $7::text[], $8::text[])`,
      [id, nen, ma, trangThai, lanHoatDong, ngayBaoCao, nguon, chiTiet],
    );
  });

  return {
    so_nhan_vien: ds.length,
    so_dong: id.length,
    so_nguoi_thieu: soNguoiThieu,
    ngay_bao_cao: ngayCuNhat,
    loi,
  };
}
