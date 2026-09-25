// Workflow he thong: su kien noi bo -> tu dong giao viec theo cau hinh o bang
// cong_viec_workflow (nguoi nhan + deadline). Danh muc su kien CO DINH trong code;
// giao dien chi bat/tat va chon nguoi nhan + han.
//
// Chong trung: moi viec sinh ra co khoa chong trung (vd 'may_mat_ket_noi:<serial>:<ngay>')
// va `on conflict do nothing` — su kien xay ra nhieu lan cung chi tao MOT viec.
import { truy_van, truy_van_mot } from '../csdl/ket_noi.ts';
import { gio_dia_phuong, ngay_dia_phuong } from '../tien_ich/thoi_gian.ts';
import { tao_viec } from './cong_viec.ts';

/** Danh muc su kien co dinh. `ma` la khoa cua bang cau hinh. */
export const CAC_SU_KIEN = [
  {
    ma: 'may_mat_ket_noi',
    ten: 'Máy chấm công mất kết nối',
    mo_ta: 'Khi giám sát máy phát hiện thiết bị ngừng liên lạc, tạo việc nhắc người phụ trách kiểm tra.',
    nguoi_nhan_kieu: ['co_dinh'] as const,
  },
  {
    ma: 'don_cho_duyet_qua_han',
    ten: 'Đơn chờ duyệt quá hạn',
    mo_ta: 'Quét hằng đêm: đơn còn chờ duyệt lâu hơn hạn thì giao việc cho trưởng phòng liên quan (hoặc người khai).',
    nguoi_nhan_kieu: ['co_dinh', 'truong_phong_lien_quan'] as const,
  },
  {
    ma: 'hop_dong_sap_het_han',
    ten: 'Hợp đồng sắp hết hạn',
    mo_ta: 'Khi quét nhắc hạn hợp đồng thấy có hợp đồng đến hạn, tạo việc cho người phụ trách hồ sơ.',
    nguoi_nhan_kieu: ['co_dinh'] as const,
  },
  {
    ma: 'nhap_viec_nhan_su',
    ten: 'Nhập việc nhân sự mới',
    mo_ta: 'Khi Admin duyệt đề nghị thêm nhân sự, hệ thống giao việc "Nhập việc" kèm checklist cho người phụ trách nhân sự (đổi người chỉ sửa một dòng cấu hình này).',
    nguoi_nhan_kieu: ['co_dinh'] as const,
  },
] as const;

export type MaSuKien = typeof CAC_SU_KIEN[number]['ma'];

interface CauHinhWorkflow {
  id: string;
  ma: string;
  dang_bat: boolean;
  nguoi_nhan_kieu: string;
  nhan_vien_id: string | null;
  han_sau_gio: number;
  uu_tien: string;
}

async function doc_cau_hinh(ma: string): Promise<CauHinhWorkflow | null> {
  return truy_van_mot<CauHinhWorkflow>(
    'select id, ma, dang_bat, nguoi_nhan_kieu, nhan_vien_id, han_sau_gio::float8, uu_tien '
    + 'from cong_viec_workflow where ma = $1',
    [ma],
  );
}

/** Deadline = bay gio + so_gio gio, doi theo mui gio may cham cong. */
export function han_sau(bay_gio: Date, so_gio: number): { han: string; han_gio: string } {
  const moc = new Date(bay_gio.getTime() + so_gio * 3600_000);
  return { han: ngay_dia_phuong(moc), han_gio: gio_dia_phuong(moc) };
}

/**
 * Tao viec tu workflow. Tra null khi cau hinh tat, thieu nguoi nhan, hoac khoa chong
 * trung da ton tai.
 *
 * `nguoi_nhan_id` bat buoc khi cau hinh dung kieu 'truong_phong_lien_quan' — ben goi da
 * giai duoc nguoi nhan (truong phong cua phong ban lien quan).
 */
export async function tao_viec_workflow(
  ma: MaSuKien,
  boi_canh: {
    nguoi_nhan_id?: string | null;
    tieu_de: string;
    mo_ta: string | null;
    khoa: string;
    bay_gio?: Date;
  },
): Promise<string | null> {
  const cf = await doc_cau_hinh(ma);
  if (cf === null || !cf.dang_bat) return null;

  const nguoi_nhan = cf.nguoi_nhan_kieu === 'truong_phong_lien_quan'
    ? (boi_canh.nguoi_nhan_id ?? null)
    : cf.nhan_vien_id;
  if (nguoi_nhan === null) return null;

  const { han, han_gio } = han_sau(boi_canh.bay_gio ?? new Date(), cf.han_sau_gio);
  const dong = await tao_viec(
    {
      nhan_vien_id: nguoi_nhan,
      tieu_de: boi_canh.tieu_de,
      mo_ta: boi_canh.mo_ta,
      han,
      han_gio,
      bat_dau: null,
      uu_tien: cf.uu_tien,
      nhom_id: null,
      hanh_dong: [],
    },
    'he_thong',
    null,
    boi_canh.khoa,
  );
  return dong === null ? null : dong.id;
}

/**
 * Hook may mat ket noi — goi tu giam_sat_may.ts khi phat hien thiet bi offline.
 * Khoa theo (serial, ngay) nen mot may mat ket noi nhieu lan trong ngay chi ra MOT viec.
 */
export async function khi_may_mat_ket_noi(
  boi_canh: { serial: string; ten: string; vi_tri: string | null },
): Promise<void> {
  const bay_gio = new Date();
  const hom_nay = ngay_dia_phuong(bay_gio);
  await tao_viec_workflow('may_mat_ket_noi', {
    tieu_de: `Máy chấm công ${boi_canh.ten} mất kết nối`,
    mo_ta: `Thiết bị ${boi_canh.serial}${boi_canh.vi_tri === null ? '' : ` (${boi_canh.vi_tri})`} `
      + 'đã ngừng liên lạc với máy chủ. Kiểm tra nguồn, mạng và cấu hình máy.',
    khoa: `may_mat_ket_noi:${boi_canh.serial}:${hom_nay}`,
    bay_gio,
  });
}

/** Danh sach bang chua don cho duyet — CO DINH trong file nay, khong tu dau vao nguoi dung. */
const BANG_DON = ['don_tu', 'don_nghi_phep', 'don_giai_trinh', 'de_xuat'] as const;

/**
 * Quet don cho duyet qua han — lich chay dem goi moi ngay mot lan. Gom theo NGUOI DUYET
 * (truong phong lien quan hoac nguoi khai co dinh) de khong spam: mot nguoi mot viec mot
 * ngay. Tra ve so viec da tao.
 */
export async function quet_don_cho_duyet(hom_nay: string): Promise<number> {
  const cf = await doc_cau_hinh('don_cho_duyet_qua_han');
  if (cf === null || !cf.dang_bat) return 0;

  const nguoi_xin: string[] = [];
  for (const bang of BANG_DON) {
    const dong = await truy_van<{ nhan_vien_id: string }>(
      `select nhan_vien_id from ${bang}
        where trang_thai = 'cho_duyet'
          and tao_luc < now() - ($1::float8 * interval '1 hour')
        group by nhan_vien_id`,
      [cf.han_sau_gio],
    );
    for (const d of dong) nguoi_xin.push(d.nhan_vien_id);
  }
  if (nguoi_xin.length === 0) return 0;

  // Nhom theo nguoi duyet (truong phong cua nguoi xin; khong co thi nguoi khai co dinh).
  const nhom_theo_duyet = new Map<string, number>();
  for (const nv of new Set(nguoi_xin)) {
    let nguoi_duyet: string | null = null;
    if (cf.nguoi_nhan_kieu === 'truong_phong_lien_quan') {
      nguoi_duyet = await truong_phong_cua(nv);
    }
    if (nguoi_duyet === null) nguoi_duyet = cf.nhan_vien_id;
    if (nguoi_duyet === null) continue;
    nhom_theo_duyet.set(nguoi_duyet, (nhom_theo_duyet.get(nguoi_duyet) ?? 0) + 1);
  }

  let so_tao = 0;
  for (const [nguoi_duyet, so_don] of nhom_theo_duyet) {
    const dong = await tao_viec_workflow('don_cho_duyet_qua_han', {
      nguoi_nhan_id: nguoi_duyet,
      tieu_de: `Có ${so_don} đơn chờ duyệt quá ${String(cf.han_sau_gio)} giờ`,
      mo_ta: 'Mở màn Duyệt đơn để xử lý. Đơn chờ lâu dễ thành khiếu nại — duyệt hoặc từ chối '
        + 'kèm lý do rõ ràng.',
      khoa: `don_cho_duyet:${nguoi_duyet}:${hom_nay}`,
    });
    if (dong !== null) so_tao++;
  }
  return so_tao;
}

/**
 * Hook hop dong sap het han — goi tu lich chay sau khi quet nhac han hop dong.
 * Khoa theo ngay nen moi ngay toi da MOT viec.
 */
export async function khi_hop_dong_sap_het(
  boi_canh: { so_hop_dong: number; hom_nay: string },
): Promise<void> {
  if (boi_canh.so_hop_dong <= 0) return;
  await tao_viec_workflow('hop_dong_sap_het_han', {
    tieu_de: `Có ${boi_canh.so_hop_dong} hợp đồng sắp hết hạn cần xử lý`,
    mo_ta: 'Vào màn Hợp đồng để xem danh sách đến hạn. Hết hạn 15 ngày phải thông báo bằng '
      + 'văn bản (Điều 45 BLLĐ) — đừng để trễ.',
    khoa: `hop_dong_sap_het:${boi_canh.hom_nay}`,
  });
}

async function truong_phong_cua(nhan_vien_id: string): Promise<string | null> {
  const d = await truy_van_mot<{ truong_phong_id: string | null }>(
    `select pb.truong_phong_id
       from nhan_vien nv join phong_ban pb on pb.id = nv.phong_ban_id
      where nv.id = $1`,
    [nhan_vien_id],
  );
  return d?.truong_phong_id ?? null;
}
