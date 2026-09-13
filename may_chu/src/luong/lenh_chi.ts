// LAP LENH CHI: xuat file Excel theo MAU CHUYEN KHOAN NGAN HANG, tach theo PHAP NHAN chi tra.
//
// Sau khi ky luong da duyet, moi don vi chi tra (vd Cong ty Thong Nhat / Tien Phong) ra mot file
// rieng vi moi don vi chuyen tien tu MOT tai khoan nguon khac nhau. Cot dung dung mau ngan hang:
//   Reference number | From Account | Amount (VND) | Beneficiary name | Beneficiary Account
//   | Description | Beneficiary Bank code | Beneficiary Bank name
import { truy_van, truy_van_mot } from '../csdl/ket_noi.ts';
import { ghi_xlsx } from '../tien_ich/ghi_xlsx.ts';

/** Tieu de 8 cot — KHOP y nguyen mau ngan hang (song ngu, co dong huong dan). */
const TIEU_DE_LENH_CHI: readonly string[] = [
  'Reference number\nSố tham chiếu \n(Nhập ký tự số/chữ. Tránh các ký tự đặc biệt)',
  'From Account\nTài khoản chuyển tiền\n(Nhập tối đa 14 ký tự số) ',
  'Amount (VND)\nSố tiền\n(Chỉ nhập ký tự số)\n',
  'Beneficiary name\nTên người thụ hưởng\n(Nhập ký tự số và chữ)',
  'Beneficiary Account\nTài khoản đích\n(Nhập ký tự số và chữ)',
  'Description\nDiễn giải\n(Nhập tối đa 100 ký tự. Tránh các ký tự đặc biệt)',
  'Beneficiary Bank code\nMã ngân hàng hưởng\n(Nhập 8 ký tự số)',
  'Beneficiary Bank name\nTên ngân hàng hưởng\n(Không bắt buộc nhập)',
];

const CONG_TY_CHINH = '(Công ty chính)';

/** Bo dau tieng Viet + IN HOA — mau ngan hang dung ky tu ASCII cho ten nguoi thu huong. */
export function ten_khong_dau(s: string): string {
  return s
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toUpperCase().replace(/\s+/g, ' ').trim();
}

/** Dien giai chuyen khoan tu 'YYYY-MM' -> 'Luong TMM-YYYY'. */
export function dien_giai_luong(thang: string): string {
  const [nam, mm] = thang.split('-');
  return `Luong T${mm ?? ''}-${nam ?? ''}`;
}

export interface DongDonVi {
  ten: string;
  tai_khoan_nguon: string | null;
  so_nguoi: number;
  tong_tien: number;
}

/** Cac don vi chi tra co mat trong ky (nhom theo ho_so_ca_nhan.don_vi_chi_luong). */
export async function danh_sach_don_vi_chi(ky_id: string): Promise<DongDonVi[]> {
  return truy_van<DongDonVi>(
    `select coalesce(h.don_vi_chi_luong, $2) as ten,
            dv.tai_khoan_nguon,
            count(*)::int                              as so_nguoi,
            coalesce(sum(pl.thuc_linh_lam_tron), 0)::float8 as tong_tien
       from phieu_luong pl
       join nhan_vien nv on nv.id = pl.nhan_vien_id
       left join ho_so_ca_nhan h on h.nhan_vien_id = nv.id
       left join don_vi_chi_tra dv on dv.ten = h.don_vi_chi_luong
      where pl.ky_luong_id = $1
      group by coalesce(h.don_vi_chi_luong, $2), dv.tai_khoan_nguon
      order by ten`,
    [ky_id, CONG_TY_CHINH],
  );
}

/** Xuat file lenh chi cho MOT don vi. Tra ve buffer XLSX. */
export async function lenh_chi_xuat(ky_id: string, thang: string, don_vi: string): Promise<Buffer> {
  const nguon = await truy_van_mot<{ tk: string }>(
    'select tai_khoan_nguon as tk from don_vi_chi_tra where ten = $1', [don_vi],
  );
  const tk_nguon = nguon?.tk ?? '';
  const mota = dien_giai_luong(thang);

  const ds = await truy_van<{ ho_ten: string; tien: number; so_tk: string | null; nh: string | null }>(
    `select nv.ho_ten, pl.thuc_linh_lam_tron::float8 as tien,
            h.so_tai_khoan as so_tk, h.ngan_hang as nh
       from phieu_luong pl
       join nhan_vien nv on nv.id = pl.nhan_vien_id
       left join ho_so_ca_nhan h on h.nhan_vien_id = nv.id
      where pl.ky_luong_id = $1
        and coalesce(h.don_vi_chi_luong, $3) = $2
      order by nv.ma_nv`,
    [ky_id, don_vi, CONG_TY_CHINH],
  );

  const hang = ds.map((r) => [
    '',                       // Reference number — de trong
    tk_nguon,                 // From Account (giu chuoi de khong mat so 0 dau)
    Math.round(r.tien),       // Amount (VND)
    ten_khong_dau(r.ho_ten),  // Beneficiary name
    r.so_tk ?? '',            // Beneficiary Account
    mota,                     // Description
    r.nh ?? '',               // Beneficiary Bank code (giu chuoi: 8 so co the co so 0 dau)
    '',                       // Beneficiary Bank name — khong bat buoc
  ]);

  return ghi_xlsx({ ten_sheet: 'Payroll mix file', tieu_de: TIEU_DE_LENH_CHI, hang });
}
