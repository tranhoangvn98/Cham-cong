// Sinh ban chot cap cong ty: bang cham cong thang va bang luong thang.
//
// YEU CAU: "bang chot cuoi cung sau khi duoc duyet thi luu SharePoint". Hai chu quan trong la
// SAU KHI DUOC DUYET — nen ham `chot_ky` o day KHONG tu quyet dinh khi nao chay. No duoc goi
// tu dung mot cho: luc `ky_luong` chuyen sang `da_duyet`.
//
// VI SAO MOT LAN DUYET SINH RA HAI TEP: nguoi duyet bang luong dang duyet ca bang cong ma
// bang luong duoc tinh TU DO. Hai bang la hai mat cua cung mot con so, va tach chung ra hai
// lan duyet rieng nghia la co the ton tai mot bang luong da duyet dua tren mot bang cong chua
// duyet — khong ai giai thich duoc trang thai do cho thanh tra lao dong.
//
// Ban goc phap ly KHONG phai tep XLSX. No la du lieu trong `bang_cong_ngay` / `phieu_luong`
// cong voi `ban_chot.duyet_boi` va `ban_chot.duyet_luc`. Tep chi la ban ket xuat, sinh lai
// duoc — do la ly do no duoc phep ghi de.
import { truy_van, truy_van_mot } from '../csdl/ket_noi.ts';
import { LoiDauVao } from '../tien_ich/kiem_tra.ts';
import { ghi_xlsx } from '../tien_ich/ghi_xlsx.ts';
import { luu_ban_chot, xoa_tep_ho_so } from '../tien_ich/luu_tep.ts';
import { khoang_thang } from '../tien_ich/thoi_gian.ts';
import type { LoaiBanChot } from '../tien_ich/ten_tep.ts';

const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Ten tep cho nguoi doc, dung khi tai ve tu web. */
export function ten_goc_ban_chot(loai: LoaiBanChot, ky: string): string {
  const [nam, thang] = ky.split('-');
  const nhan = loai === 'bang_cong' ? 'BANG-CHAM-CONG' : 'BANG-LUONG';
  return `${nhan}_${thang ?? '00'}-${nam ?? '0000'}.xlsx`;
}

// ---------------------------------------------------------------- bang cham cong

interface DongCong {
  ma_nv: string;
  ho_ten: string;
  phong_ban: string | null;
  ngay: string;
  so_cong: string | null;
  phut_ot: number | null;
}

/**
 * Bang cham cong thang: mot dong mot nguoi, mot cot mot ngay.
 *
 * Day la hinh dang nhan su doc duoc, khong phai hinh dang CSDL luu (mot dong mot nguoi mot
 * ngay). Chuyen vi o day chu khong o SQL: SQL lam viec nay can `crosstab` hoac 31 bieu thuc
 * `case`, va ca hai deu kho doc hon vong lap duoi day.
 */
async function bang_cham_cong(ky: string): Promise<{ tieu_de: string[]; hang: (string | number)[][] }> {
  const { tu, den } = khoang_thang(ky);
  const so_ngay = Number(den.slice(8, 10));

  const dong = await truy_van<DongCong>(
    `select nv.ma_nv, nv.ho_ten, pb.ten as phong_ban,
            to_char(bc.ngay, 'YYYY-MM-DD') as ngay, bc.so_cong::text as so_cong, bc.phut_ot
       from bang_cong_ngay bc
       join nhan_vien nv on nv.id = bc.nhan_vien_id
       left join phong_ban pb on pb.id = nv.phong_ban_id
      where bc.ngay >= $1 and bc.ngay <= $2
      order by nv.ma_nv, bc.ngay`,
    [tu, den],
  );

  const theo_nguoi = new Map<string, { ho_ten: string; phong_ban: string; ngay: Map<number, string>; ot: number }>();
  for (const d of dong) {
    let n = theo_nguoi.get(d.ma_nv);
    if (n === undefined) {
      n = { ho_ten: d.ho_ten, phong_ban: d.phong_ban ?? '', ngay: new Map(), ot: 0 };
      theo_nguoi.set(d.ma_nv, n);
    }
    n.ngay.set(Number(d.ngay.slice(8, 10)), d.so_cong ?? '');
    n.ot += d.phut_ot ?? 0;
  }

  const tieu_de = ['Mã NV', 'Họ tên', 'Phòng ban',
    ...Array.from({ length: so_ngay }, (_, i) => String(i + 1)),
    'Tổng công', 'Tổng OT (phút)'];

  const hang: (string | number)[][] = [];
  for (const [ma_nv, n] of [...theo_nguoi.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const cot_ngay: (string | number)[] = [];
    let tong = 0;
    for (let i = 1; i <= so_ngay; i++) {
      const v = n.ngay.get(i);
      if (v === undefined || v === '') {
        cot_ngay.push('');
      } else {
        const so = Number(v);
        cot_ngay.push(Number.isFinite(so) ? so : v);
        if (Number.isFinite(so)) tong += so;
      }
    }
    // Lam tron ve 2 chu so: cong 0.5 nhieu lan trong so thuc de ra 10.999999999999998.
    hang.push([ma_nv, n.ho_ten, n.phong_ban, ...cot_ngay, Math.round(tong * 100) / 100, n.ot]);
  }
  return { tieu_de, hang };
}

// ---------------------------------------------------------------- bang luong

interface DongLuong {
  ma_nv: string;
  ho_ten: string;
  phong_ban: string | null;
  [cot: string]: string | null;
}

/** Cac cot tien trong bang luong, theo dung thu tu nguoi doc mong doi. */
const COT_LUONG: readonly (readonly [string, string])[] = [
  ['luong_co_ban', 'Lương cơ bản'],
  ['phu_cap', 'Phụ cấp'],
  ['so_ngay_cong_chuan', 'Công chuẩn'],
  ['so_ngay_cong_thuc', 'Công thực'],
  ['phut_ot', 'OT (phút)'],
  ['luong_theo_cong', 'Lương theo công'],
  ['tien_ot', 'Tiền OT'],
  ['thuong', 'Thưởng'],
  ['phu_cap_khac', 'Phụ cấp khác'],
  ['tong_thu_nhap', 'Tổng thu nhập'],
  ['muc_dong_bh', 'Mức đóng BH'],
  ['bhxh_nld', 'BHXH (NLĐ)'],
  ['bhyt_nld', 'BHYT (NLĐ)'],
  ['bhtn_nld', 'BHTN (NLĐ)'],
  ['bhxh_nsdld', 'BHXH (NSDLĐ)'],
  ['bhyt_nsdld', 'BHYT (NSDLĐ)'],
  ['bhtn_nsdld', 'BHTN (NSDLĐ)'],
  ['so_nguoi_phu_thuoc', 'Số NPT'],
  ['giam_tru_tong', 'Giảm trừ'],
  ['thu_nhap_tinh_thue', 'TN tính thuế'],
  ['thue_tncn', 'Thuế TNCN'],
  ['tru_khac', 'Trừ khác'],
  ['tong_tru', 'Tổng trừ'],
  ['thuc_linh', 'Thực lĩnh'],
];

async function bang_luong(ky: string): Promise<{ tieu_de: string[]; hang: (string | number)[][] }> {
  const cot_sql = COT_LUONG.map(([c]) => `p.${c}::text as ${c}`).join(', ');
  const dong = await truy_van<DongLuong>(
    `select nv.ma_nv, nv.ho_ten, pb.ten as phong_ban, ${cot_sql}
       from phieu_luong p
       join ky_luong k on k.id = p.ky_luong_id
       join nhan_vien nv on nv.id = p.nhan_vien_id
       left join phong_ban pb on pb.id = nv.phong_ban_id
      where k.thang = $1
      order by nv.ma_nv`,
    [ky],
  );

  const tieu_de = ['Mã NV', 'Họ tên', 'Phòng ban', ...COT_LUONG.map(([, t]) => t)];
  const hang = dong.map((d) => [
    d.ma_nv, d.ho_ten, d.phong_ban ?? '',
    ...COT_LUONG.map(([c]) => {
      const v = d[c];
      if (v === null || v === undefined || v === '') return '';
      const so = Number(v);
      // Giu la SO chu khong phai chu: nhan su phai cong duoc cot trong Excel. Mot cot tien
      // luu thanh chu thi ham SUM tra ve 0 va khong bao gi.
      return Number.isFinite(so) ? so : v;
    }),
  ]);
  return { tieu_de, hang };
}

// ---------------------------------------------------------------- chot

export interface KetQuaChot {
  loai: LoaiBanChot;
  ky: string;
  ten_luu: string;
  so_dong: number;
  kich_thuoc: number;
  /** Ma dong `ban_chot` — chinh la khoa ma `sharepoint_tep` dung. */
  id: string;
}

async function chot_mot(
  loai: LoaiBanChot, ky: string, nguoi_duyet: string | null,
  bang: { tieu_de: string[]; hang: (string | number)[][] },
): Promise<KetQuaChot> {
  const ten_sheet = loai === 'bang_cong' ? `Chấm công ${ky}` : `Bảng lương ${ky}`;
  const du_lieu = ghi_xlsx({ ten_sheet, tieu_de: bang.tieu_de, hang: bang.hang });
  const da_luu = await luu_ban_chot(du_lieu, loai, ky);
  const ten_goc = ten_goc_ban_chot(loai, ky);

  // `on conflict (loai, ky)` — duyet lai thi thay ban cu. Giu lai ten_luu CU de xoa tep cu
  // sau khi da ghi xong dong moi: mat tep cu chi la mat mot ban ket xuat, con mat dong CSDL
  // la mat thong tin ai duyet luc nao.
  const cu = await truy_van_mot<{ ten_luu: string }>(
    'select ten_luu from ban_chot where loai = $1 and ky = $2', [loai, ky]);

  const moi = await truy_van_mot<{ id: string }>(
    `insert into ban_chot(loai, ky, ten_luu, ten_goc, kieu_mime, kich_thuoc, so_dong,
                          duyet_boi, duyet_luc)
     values ($1,$2,$3,$4,$5,$6,$7,$8, now())
     on conflict (loai, ky) do update
        set ten_luu    = excluded.ten_luu,
            ten_goc    = excluded.ten_goc,
            kich_thuoc = excluded.kich_thuoc,
            so_dong    = excluded.so_dong,
            duyet_boi  = excluded.duyet_boi,
            duyet_luc  = excluded.duyet_luc,
            tao_luc    = now()
     returning id`,
    [loai, ky, da_luu.ten_luu, ten_goc, MIME_XLSX, da_luu.kich_thuoc,
      bang.hang.length, nguoi_duyet],
  );

  if (cu !== null && cu.ten_luu !== da_luu.ten_luu) {
    await xoa_tep_ho_so(cu.ten_luu).catch(() => { /* ban ket xuat cu, sinh lai duoc */ });
  }

  return {
    loai, ky, ten_luu: da_luu.ten_luu, so_dong: bang.hang.length,
    kich_thuoc: da_luu.kich_thuoc, id: String(moi?.id ?? ''),
  };
}

/**
 * Chot ca ky: sinh ban chot bang cham cong VA bang luong cho thang do.
 *
 * Goi tu dung mot cho — luc `ky_luong` chuyen sang `da_duyet`. Goi lai nhieu lan khong sao:
 * moi lan sinh lai tu du lieu hien tai va thay ban cu.
 */
export async function chot_ky(ky: string, nguoi_duyet: string | null): Promise<KetQuaChot[]> {
  if (!/^\d{4}-\d{2}$/.test(ky)) {
    throw new LoiDauVao(`Kỳ không đúng dạng YYYY-MM: ${ky}`);
  }
  return [
    await chot_mot('bang_cong', ky, nguoi_duyet, await bang_cham_cong(ky)),
    await chot_mot('bang_luong', ky, nguoi_duyet, await bang_luong(ky)),
  ];
}

/** Ky nao da co ban chot bang luong da duyet? Dung de chan mo chot bang cong. */
export async function ky_da_chot_luong(ky: string): Promise<boolean> {
  const d = await truy_van_mot<{ so: number }>(
    `select count(*)::int as so from ky_luong
      where thang = $1 and trang_thai in ('da_duyet','da_tra')`, [ky]);
  return (d?.so ?? 0) > 0;
}

/** Danh sach ban chot, moi nhat truoc. Cho trang quan tri. */
export async function danh_sach_ban_chot(gioi_han = 60): Promise<Record<string, unknown>[]> {
  return truy_van(
    `select b.id, b.loai, b.ky, b.ten_goc, b.kich_thuoc, b.so_dong, b.duyet_luc,
            nd.ten_dang_nhap as duyet_boi
       from ban_chot b
       left join nguoi_dung nd on nd.id = b.duyet_boi
      order by b.ky desc, b.loai
      limit $1`,
    [gioi_han],
  );
}

/** Doc mot ban chot de tai ve. */
export async function ban_chot_theo_id(
  id: string,
): Promise<{ ten_luu: string; ten_goc: string; kieu_mime: string } | null> {
  return truy_van_mot(
    'select ten_luu, ten_goc, kieu_mime from ban_chot where id = $1', [id]);
}
