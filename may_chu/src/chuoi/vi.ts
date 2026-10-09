// Tu dien tieng VIET cho cac chuoi do MAY CHU sinh ra (loi API, thong bao, email...).
// Chuoi nguoi dung doc PHẢI co du hai khoa vi + zh — xem tai_lieu/SONG-NGU-TRUNG.md.
// Khong hardcode chuoi o bat ky dau khac; tra qua tra_chuoi() trong chi_muc.ts.
export const CHUOI_VI = {
  ngon_ngu_da_doi: 'Đã chuyển ngôn ngữ.',
  ngon_ngu_khong_hop_le: 'Ngôn ngữ không hợp lệ.',
  ngon_ngu_tieng_viet: 'Tiếng Việt',
  ngon_ngu_tieng_trung: 'Tiếng Trung',
  khong_duoc_tu_duyet: 'Bạn không được tự duyệt cho chính mình.',

  // ================================ nhan trang thai trong chuong bao
  tt_cho_duyet: 'Chờ duyệt',
  tt_cho_duyet_2: 'Chờ duyệt cấp 2',
  tt_da_duyet: 'Đã duyệt',
  tt_tu_choi: 'Đã từ chối',
  tt_da_huy: 'Đã hủy',
  tt_moi: 'Chờ xử lý',
  tt_dang_xem: 'Đang xem xét',
  tt_chap_nhan: 'Đã chấp nhận',
  tt_da_nhac: 'Đã nhắc',
  tt_da_ap_dung: 'Đã áp dụng',
  tt_bac_bo: 'Đã bác bỏ',
  tt_mien: 'Đã miễn',
  tt_da_xac_nhan: 'Đã xác nhận',
  tt_da_xu_ly: 'Đã xử lý',
  tt_cho_giai_trinh: 'Chờ giải trình',
  tt_dang_lam: 'Đang làm',
  tt_hoan_thanh: 'Đã hoàn thành',
  tt_khong_hoan_thanh: 'Không hoàn thành',
  tt_huy: 'Đã hủy',
  tt_da_dong: 'Đã hoàn tất',
  tt_da_tiep_nhan: 'Đã tiếp nhận',

  // ================================ tro ly
  tl_chua_co_quy_trinh: 'Bạn chưa có quy trình thôi việc đang mở.',
} as const;
