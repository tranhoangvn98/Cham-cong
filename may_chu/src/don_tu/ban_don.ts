// Sinh va luu BAN DON DA DUYET.
//
// YEU CAU: "cac loai don ... duyet tren he thong. sau khi duoc duyet thi luu tren he thong".
//
// Ba chu quan trong la LUU TREN HE THONG, va o day toi doc theo dung nghia doi lap voi cau
// truoc do ve bang chot ("luu sharepoint"): ban don da duyet nam trong kho ho so cua may chu,
// KHONG day sang SharePoint. Ly do ky thuat thi co (`chon_nhanh` tra null cho nhom `don_tu`),
// nhung ly do that thi la ve du lieu: mot to don nghi om mang theo LY DO NGHI, tuc la du lieu
// suc khoe — du lieu ca nhan NHAY CAM theo ND 13/2023. Giu no trong he thong, noi quyen doc
// duoc tinh theo tung nguoi, hep hon la day vao mot thu vien dung chung.
//
// Ban don duoc luu nhu MOT DONG `ho_so_tep` nhom `don_tu`, `thuoc_id` tro ve don goc. Nho the
// no dung lai duoc toan bo phan da co: phan quyen, tab Ho so tren web, duong tai tep, cay thu
// muc tren dia, sao luu. Va nho `thay_xoa_tep_duoc`, chi Truong phong nhan su go duoc no.
import { truy_van_mot, thuc_thi } from '../csdl/ket_noi.ts';
import { ghi_docx, type KhoiDocx } from '../tien_ich/ghi_docx.ts';
import { luu_tep_ho_so, xoa_tep_ho_so } from '../tien_ich/luu_tep.ts';
import { ngay_dia_phuong } from '../tien_ich/thoi_gian.ts';
import { dac_ta, type DonTuDayDu } from './loai_don.ts';
import { don_theo_id } from './nghiep_vu.ts';

/**
 * Cac loai don sinh duoc ban don.
 *
 * `nghi_phep` va `giai_trinh` co bang rieng nen khai o day. Bon loai con lai dung chung bang
 * `don_tu` va lay ten / cac hang tu `loai_don.ts` — khong khai lai o day, vi khai hai cho la
 * hai cho de lech.
 */
export type LoaiDon = 'nghi_phep' | 'giai_trinh';

const NHAN_DON: Record<LoaiDon, string> = {
  nghi_phep: 'ĐƠN XIN NGHỈ PHÉP',
  giai_trinh: 'ĐƠN GIẢI TRÌNH CÔNG',
};

const NHAN_LOAI_PHEP: Record<string, string> = {
  phep_nam: 'Nghỉ phép năm',
  khong_luong: 'Nghỉ không lương',
  om: 'Nghỉ ốm',
  thai_san: 'Nghỉ thai sản',
  ket_hon: 'Nghỉ kết hôn',
  hieu: 'Nghỉ việc riêng (hiếu)',
};

/** DD/MM/YYYY cho nguoi doc. Chuoi la thi tra nguyen de con thay ma sua. */
function ngay_viet(ngay: string | null): string {
  if (ngay === null || ngay === '') return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ngay);
  return m === null ? ngay : `${m[3]}/${m[2]}/${m[1]}`;
}

/** ISO `2026-08-19T14:05:00+07` -> `19/08/2026 14:05`. Chuoi la thi tra nguyen. */
function ngay_gio_viet(t: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(t);
  return m === null ? t : `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}`;
}

function gio_viet(gio: string | null): string {
  return gio === null || gio === '' ? '' : gio.slice(0, 5);
}

interface ThongTinChung {
  ma_nv: string;
  ho_ten: string;
  phong_ban: string | null;
  chuc_danh: string | null;
  nguoi_duyet: string | null;
  quyet_luc: string | null;
  ghi_chu_duyet: string | null;
  tao_luc: string;
}

/**
 * Cac khoi chung cho moi loai don.
 *
 * Phan CUOI la phan quan trong nhat va la ca ly do ban don ton tai: ai duyet, luc nao. Mot to
 * don khong co dong do thi chi la mot ban in lai cua form nhap, khong chung minh duoc gi.
 */
function khoi_chung(tt: ThongTinChung, rieng: readonly (readonly [string, string])[]): KhoiDocx[] {
  return [
    { loai: 'doan', chu: 'CÔNG TY TNHH TRẦN HOÀNG VIỆT NAM', dam: true, giua: true },
    { loai: 'doan', chu: 'Độc lập – Tự do – Hạnh phúc', giua: true },
    { loai: 'doan', chu: '' },
    {
      loai: 'bang',
      hang: [
        ['Mã nhân viên', tt.ma_nv],
        ['Họ và tên', tt.ho_ten],
        ['Phòng ban', tt.phong_ban ?? '—'],
        ['Chức danh', tt.chuc_danh ?? '—'],
        ...rieng,
      ],
    },
    { loai: 'doan', chu: 'Xác nhận phê duyệt', dam: true },
    {
      loai: 'bang',
      hang: [
        ['Kết quả', 'ĐÃ DUYỆT'],
        ['Người duyệt', tt.nguoi_duyet ?? '—'],
        ['Thời điểm duyệt', tt.quyet_luc === null ? '—' : tt.quyet_luc],
        ['Ghi chú của người duyệt', tt.ghi_chu_duyet ?? '—'],
      ],
    },
    { loai: 'doan', chu: '' },
    {
      loai: 'doan',
      chu: 'Bản đơn này do hệ thống chấm công sinh ra tại thời điểm phê duyệt. '
        + 'Bản gốc là dữ liệu trong hệ thống cùng với thông tin người duyệt và thời điểm duyệt '
        + 'ở trên; tệp này là bản kết xuất.',
    },
  ];
}

// ---------------------------------------------------------------- doc don

interface DonNghiPhep extends ThongTinChung {
  id: string;
  nhan_vien_id: string;
  loai: string;
  tu_ngay: string;
  den_ngay: string;
  nua_ngay: boolean;
  ly_do: string | null;
  so_ngay: string;
}

interface DonGiaiTrinh extends ThongTinChung {
  id: string;
  nhan_vien_id: string;
  ngay: string;
  gio_vao_de_xuat: string | null;
  gio_ra_de_xuat: string | null;
  ly_do: string;
}

const CHUNG_SQL = `
  nv.ma_nv, nv.ho_ten, pb.ten as phong_ban, nv.chuc_danh,
  nd.ten_dang_nhap as nguoi_duyet,
  to_char(d.quyet_luc, 'DD/MM/YYYY HH24:MI') as quyet_luc,
  d.ghi_chu_duyet,
  to_char(d.tao_luc, 'DD/MM/YYYY HH24:MI') as tao_luc
`;

// ---------------------------------------------------------------- luu

export interface BanDonDaLuu {
  tep_id: string;
  ten_luu: string;
  ten_goc: string;
}

/**
 * Ghi ban don xuong kho ho so va tao dong `ho_so_tep`.
 *
 * MOT DON MOT BAN. Duyet lai (sau khi huy roi duyet lai) thi ban cu bi go va ban moi thay
 * cho: hai ban don cho cung mot don la hai to giay cung "da duyet", va khong ai biet tin to
 * nao. Tim ban cu bang `thuoc_id`, khong bang ten tep.
 */
async function luu_ban_don(
  tien_to_tep: string,
  don_id: string,
  nhan_vien_id: string,
  ma_nv: string,
  ho_ten: string,
  khoi: readonly KhoiDocx[],
  ngay_don: string,
): Promise<BanDonDaLuu> {
  const du_lieu = ghi_docx({ khoi });
  const ten_goc = `${tien_to_tep}_${ma_nv}_${ngay_don}.docx`;

  const da_luu = await luu_tep_ho_so(du_lieu, ten_goc, {
    ma_nv, ho_ten, nhom: 'don_tu', ngay: ngay_dia_phuong(new Date()),
  });

  // Ban cu cua CHINH don nay, neu co.
  const cu = await truy_van_mot<{ id: string; ten_luu: string }>(
    `select id, ten_luu from ho_so_tep
      where nhom = 'don_tu' and thuoc_id = $1 and id <> $2`,
    [don_id, da_luu.ma_tep]);

  await thuc_thi(
    `insert into ho_so_tep(id, nhan_vien_id, nhom, thuoc_id, ten_goc, ten_luu, kieu_mime,
                           kich_thuoc, tai_len_boi)
     values ($1,$2,'don_tu',$3,$4,$5,$6,$7,null)`,
    [da_luu.ma_tep, nhan_vien_id, don_id, ten_goc, da_luu.ten_luu, da_luu.mime,
      da_luu.kich_thuoc],
  );

  // Go ban cu SAU KHI ban moi da vao CSDL: nguoc lai thi giua hai buoc khong con ban nao, va
  // may chu chet dung luc do la mat ban don.
  if (cu !== null) {
    await thuc_thi('delete from ho_so_tep where id = $1', [cu.id]);
    await xoa_tep_ho_so(cu.ten_luu).catch(() => { /* dong CSDL da di, tep mo coi khong sao */ });
  }

  return { tep_id: da_luu.ma_tep, ten_luu: da_luu.ten_luu, ten_goc };
}

// ---------------------------------------------------------------- diem vao

/**
 * Sinh ban don cho mot don nghi phep DA DUYET.
 *
 * Tra null neu don khong ton tai hoac chua o trang thai `da_duyet` — ham nay khong tu quyet
 * dinh khi nao chay, va cung khong duoc phep sinh ban don cho mot don chua ai dong y.
 */
export async function ban_don_nghi_phep(don_id: string): Promise<BanDonDaLuu | null> {
  const d = await truy_van_mot<DonNghiPhep>(
    `select d.id, d.nhan_vien_id, d.loai, d.nua_ngay, d.ly_do,
            to_char(d.tu_ngay, 'YYYY-MM-DD') as tu_ngay,
            to_char(d.den_ngay, 'YYYY-MM-DD') as den_ngay,
            ((d.den_ngay - d.tu_ngay + 1) - case when d.nua_ngay then 0.5 else 0 end)::text
              as so_ngay,
            ${CHUNG_SQL}
       from don_nghi_phep d
       join nhan_vien nv on nv.id = d.nhan_vien_id
       left join phong_ban pb on pb.id = nv.phong_ban_id
       left join nguoi_dung nd on nd.id = d.nguoi_duyet_id
      where d.id = $1 and d.trang_thai = 'da_duyet'`,
    [don_id],
  );
  if (d === null) return null;

  const khoi: KhoiDocx[] = [
    { loai: 'tieu_de', chu: NHAN_DON.nghi_phep },
    ...khoi_chung(d, [
      ['Loại nghỉ', NHAN_LOAI_PHEP[d.loai] ?? d.loai],
      ['Từ ngày', ngay_viet(d.tu_ngay)],
      ['Đến ngày', ngay_viet(d.den_ngay)],
      ['Số ngày nghỉ', `${d.so_ngay}${d.nua_ngay ? ' (nửa ngày)' : ''}`],
      ['Lý do', d.ly_do ?? '—'],
      ['Ngày lập đơn', d.tao_luc],
    ]),
  ];

  return luu_ban_don('Don-xin-nghi-phep', d.id, d.nhan_vien_id, d.ma_nv, d.ho_ten, khoi, d.tu_ngay);
}

/** Sinh ban don cho mot don giai trinh DA DUYET. */
export async function ban_don_giai_trinh(don_id: string): Promise<BanDonDaLuu | null> {
  const d = await truy_van_mot<DonGiaiTrinh>(
    `select d.id, d.nhan_vien_id, d.ly_do,
            to_char(d.ngay, 'YYYY-MM-DD') as ngay,
            d.gio_vao_de_xuat::text as gio_vao_de_xuat,
            d.gio_ra_de_xuat::text as gio_ra_de_xuat,
            ${CHUNG_SQL}
       from don_giai_trinh d
       join nhan_vien nv on nv.id = d.nhan_vien_id
       left join phong_ban pb on pb.id = nv.phong_ban_id
       left join nguoi_dung nd on nd.id = d.nguoi_duyet_id
      where d.id = $1 and d.trang_thai = 'da_duyet'`,
    [don_id],
  );
  if (d === null) return null;

  const khoi: KhoiDocx[] = [
    { loai: 'tieu_de', chu: NHAN_DON.giai_trinh },
    ...khoi_chung(d, [
      ['Ngày cần giải trình', ngay_viet(d.ngay)],
      ['Giờ vào đề xuất', gio_viet(d.gio_vao_de_xuat) || '—'],
      ['Giờ ra đề xuất', gio_viet(d.gio_ra_de_xuat) || '—'],
      ['Lý do', d.ly_do],
      ['Ngày lập đơn', d.tao_luc],
    ]),
  ];

  return luu_ban_don('Don-giai-trinh', d.id, d.nhan_vien_id, d.ma_nv, d.ho_ten, khoi, d.ngay);
}

// ---------------------------------------------------------------- bon loai dung chung bang

/**
 * Sinh ban don cho mot don trong bang `don_tu` (lam them / doi ca / cong tac / thoi viec).
 *
 * Tieu de va cac hang rieng lay tu `CAC_LOAI` trong `loai_don.ts` — mot cho khai, moi tang
 * dung theo. Them loai thu nam la them mot muc trong bang do, khong sua ham nay.
 */
export async function ban_don_khac(don_id: string): Promise<BanDonDaLuu | null> {
  const d = await don_theo_id(don_id);
  if (d === null || d.trang_thai !== 'da_duyet') return null;

  const dt = dac_ta(d.loai);
  const day_du: DonTuDayDu = {
    ...d,
    tu_ngay_viet: ngay_viet(d.tu_ngay),
    den_ngay_viet: d.den_ngay === null ? null : ngay_viet(d.den_ngay),
  };

  const khoi: KhoiDocx[] = [
    { loai: 'tieu_de', chu: dt.tieu_de },
    ...khoi_chung(
      {
        ma_nv: d.ma_nv,
        ho_ten: d.ho_ten,
        phong_ban: d.phong_ban,
        chuc_danh: d.chuc_danh,
        nguoi_duyet: d.nguoi_duyet,
        quyet_luc: d.quyet_luc === null ? null : ngay_gio_viet(d.quyet_luc),
        ghi_chu_duyet: d.ghi_chu_duyet,
        tao_luc: ngay_gio_viet(d.tao_luc),
      },
      [...dt.hang_ban_don(day_du), ['Ngày lập đơn', ngay_gio_viet(d.tao_luc)]],
    ),
  ];

  return luu_ban_don(
    dt.tien_to_tep, d.id, d.nhan_vien_id, d.ma_nv, d.ho_ten, khoi, d.tu_ngay);
}

/**
 * Sinh ban don ma KHONG de loi lam do lan duyet.
 *
 * Duyet don la viec chinh; sinh ban don la viec phu. Neu kho tep co van de (het dia, thu muc
 * sai quyen) thi don VAN phai duyet duoc — nhan su dang cho, va bang cong phu thuoc vao no.
 * Bo sot ban don thi con vet lai trong log va sinh lai duoc bang `POST .../ban-don`.
 */
export async function ban_don_am_tham(
  loai: LoaiDon | 'khac', don_id: string,
): Promise<void> {
  try {
    if (loai === 'nghi_phep') await ban_don_nghi_phep(don_id);
    else if (loai === 'giai_trinh') await ban_don_giai_trinh(don_id);
    else await ban_don_khac(don_id);
  } catch {
    // Sinh lai duoc bang tay; xem duong `POST /api/nghi-phep/:id/ban-don`.
  }
}
