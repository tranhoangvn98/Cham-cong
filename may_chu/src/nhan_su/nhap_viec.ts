// Checklist "Nhap viec" giao cho nguoi phu trach nhan su khi he thong khoi tao nhan su moi
// (DTKT 02/2026, REQ-CL). Muc nao he thong da tu lam duoc thi tick san (`xong=true`) de HR
// chi con phan con nguoi. Viet toan bo bang SQL TRUC TIEP trong transaction cua ben goi —
// khong mo giao dich rieng, khong goi HTTP ra ngoai.
import type { PoolClient } from 'pg';
import { truy_van_mot, thuc_thi } from '../csdl/ket_noi.ts';
import { cau_hinh } from '../cau_hinh.ts';
import { moc_thoi_gian } from '../tien_ich/thoi_gian.ts';

/** Ma workflow cong viec "nhap viec nhan su" trong bang cong_viec_workflow. */
export const MA_WORKFLOW_NHAP_VIEC = 'nhap_viec_nhan_su';

/** Khoa chong trung cho cong viec nhap viec cua mot nhan vien moi. */
export function khoa_nhap_viec(nhan_vien_id: string): string {
  return `nhap_viec:${nhan_vien_id}`;
}

/** Khoa chong trung cho lenh day user+PIN xuong may cua cua mot nhan vien moi. */
export function khoa_lenh_pin(nhan_vien_id: string): string {
  return `nhap_viec_pin:${nhan_vien_id}`;
}

/** Ten muc checklist so 3 — doi chieu de tick khi may cua xac nhan lenh. */
export const TEN_MUC_PIN_MAY_CUA = 'Cấp số PIN + đẩy xuống máy cửa';

export interface MucChecklist {
  ten: string;
  xong: boolean;
}

/**
 * 15 muc checklist nhap viec theo REQ-CL-02. Muc 1 (MS365) tick san khi co cap MS365;
 * muc 2 (ERP1) luon tick san (su kien outbox da ghi cung transaction); muc 3 (PIN may cua)
 * chi tick khi may xac nhan lenh (xem `tick_pin_may_cua_nhan`).
 */
export function danh_sach_checklist_nhap_viec(
  cap_ms365: boolean,
  loai_hop_dong: string | null,
  email_bhxh: string,
): MucChecklist[] {
  const loai_hd = (loai_hop_dong ?? '').trim();
  const ten_hd = loai_hd === '' ? 'đã khai báo' : loai_hd;
  const bhxh = email_bhxh === '' ? 'đơn vị dịch vụ BHXH' : email_bhxh;
  return [
    { ten: 'Tạo tài khoản MS365 + cấp giấy phép', xong: cap_ms365 },
    { ten: 'Tạo tài khoản ERP1', xong: true },
    { ten: TEN_MUC_PIN_MAY_CUA, xong: false },
    { ten: 'Enroll vân tay/khuôn mặt/thẻ tại máy chấm công & máy cửa', xong: false },
    { ten: 'Thu thập & số hóa hồ sơ (CCCD, bằng cấp, sơ yếu, ảnh)', xong: false },
    { ten: `Ký HĐLĐ/thử việc đúng loại (${ten_hd})`, xong: false },
    { ten: `Đăng ký/báo tăng BHXH cho người mới — gửi ${bhxh}`, xong: false },
    { ten: 'Đăng ký MST/giảm trừ gia cảnh (thuế TNCN) nếu có', xong: false },
    { ten: 'Bàn giao tài sản (laptop, ĐT, thẻ, chỗ ngồi)', xong: false },
    { ten: 'Trao tài khoản + mật khẩu khởi tạo MS365, hướng dẫn đổi mật khẩu', xong: false },
    { ten: 'Gán phòng ban/ca làm/khối/vị trí (to_chuc) nếu chưa set', xong: false },
    { ten: 'Kích hoạt module đào tạo nhập môn cho người mới', xong: false },
    { ten: 'Phổ biến nội quy lao động + ký cam kết bảo mật', xong: false },
    { ten: 'Thiết lập việc định kỳ/KPI ban đầu, giới thiệu đầu mối', xong: false },
    { ten: 'Xác nhận nhân viên đăng nhập được cả 3 hệ (chấm công, ERP1, MS365)', xong: false },
  ];
}

/**
 * Nguoi phu trach nhan su nhan viec nhap viec.
 *
 * Thu tu: (1) workflow `nhap_viec_nhan_su` dang bat va da chon nguoi — doi nguoi chi sua
 * mot dong cau hinh, khong sua code (REQ-CL-03); (2) bien moi truong NHAP_VIEC_NHAN_SU_ID
 * (uuid nhan_vien hoac ma_nv).
 */
export async function nguoi_nhan_nhap_viec(): Promise<string | null> {
  const wf = await truy_van_mot<{ nhan_vien_id: string | null }>(
    `select nhan_vien_id from cong_viec_workflow
      where ma = $1 and dang_bat = true`,
    [MA_WORKFLOW_NHAP_VIEC],
  );
  if (wf?.nhan_vien_id !== null && wf?.nhan_vien_id !== undefined) return wf.nhan_vien_id;
  const khai = cau_hinh.nhap_viec.nhan_su_id.trim();
  if (khai !== '') {
    // Mot tham so so voi HAI cot khac kieu (id uuid, ma_nv text) thi PG khong suy duoc
    // kieu cua $1 — ep cot uuid ve text truoc.
    const nv = await truy_van_mot<{ id: string }>(
      'select id from nhan_vien where id::text = $1 or ma_nv = $1 limit 1', [khai]);
    if (nv !== null) return nv.id;
  }
  return null;
}

/**
 * Tao cong viec "Nhap viec" + checklist con trong CUNG transaction (khach). Tra id viec,
 * hoac null khi khoa chong trung da ton tai (da tao lan truoc — giu nguyen ban cu).
 */
export async function tao_viec_nhap_viec_trong(
  khach: PoolClient,
  nguoi_nhan: string,
  nv_moi: { id: string; ho_ten: string; ma_nv: string },
  han: string,
  cap_ms365: boolean,
  loai_hop_dong: string | null,
  email_bhxh: string,
): Promise<string | null> {
  const kq = await khach.query<{ id: string }>(
    `insert into cong_viec
       (nhan_vien_id, tieu_de, mo_ta, han, han_gio, han_moc, uu_tien, nguon, khoa_chong_trung)
     values ($1, $2, $3, $4::date, '18:00', $5, 'cao', 'he_thong', $6)
     on conflict (khoa_chong_trung) where khoa_chong_trung is not null
     do nothing returning id`,
    [
      nguoi_nhan,
      `Nhập việc: ${nv_moi.ho_ten} (${nv_moi.ma_nv})`,
      'Checklist nhập việc do hệ thống sinh khi khởi tạo nhân sự mới. '
        + 'Các mục hệ thống đã tự làm được tick sẵn; phần còn lại là việc của nhân sự.',
      han,
      moc_thoi_gian(han, '18:00').toISOString(),
      khoa_nhap_viec(nv_moi.id),
    ],
  );
  const id = kq.rows[0]?.id;
  if (id === undefined) return null;

  const muc = danh_sach_checklist_nhap_viec(cap_ms365, loai_hop_dong, email_bhxh);
  for (const [i, m] of muc.entries()) {
    await khach.query(
      `insert into cong_viec_hanh_dong(cong_viec_id, ten, xong, thu_tu)
       values ($1, $2, $3, $4)`,
      [id, m.ten, m.xong, i],
    );
  }
  return id;
}

/** Tick muc "cap PIN may cua" khi may xac nhan lenh thanh cong (ma_tra_ve = 0). */
export async function tick_pin_may_cua_nhan(nhan_vien_id: string): Promise<void> {
  await thuc_thi(
    `update cong_viec_hanh_dong
        set xong = true, xong_luc = now()
      where cong_viec_id = (select id from cong_viec where khoa_chong_trung = $1)
        and ten = $2
        and not xong`,
    [khoa_nhap_viec(nhan_vien_id), TEN_MUC_PIN_MAY_CUA],
  );
}
