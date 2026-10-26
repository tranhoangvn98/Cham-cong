// Tu dien tieng VIET cho cac chuoi do MAY CHU sinh ra (loi API, thong bao, email...).
// Chuoi nguoi dung doc PHẢI co du hai khoa vi + zh — xem tai_lieu/SONG-NGU-TRUNG.md.
// Khong hardcode chuoi o bat ky dau khac; tra qua tra_chuoi() trong chi_muc.ts.
export const CHUOI_VI = {
  ngon_ngu_da_doi: 'Đã chuyển ngôn ngữ.',
  ngon_ngu_khong_hop_le: 'Ngôn ngữ không hợp lệ.',
  ngon_ngu_tieng_viet: 'Tiếng Việt',
  ngon_ngu_tieng_trung: 'Tiếng Trung',
  khong_duoc_tu_duyet: 'Bạn không được tự duyệt cho chính mình.',

  // ================================ ung luong tu phuc vu
  ul_tk_khong_nhan_vien:
    'Tài khoản này không gắn với hồ sơ nhân viên nên không dùng được ứng lương cá nhân.',
  ul_thang_thieu: 'Thiếu tháng ứng lương.',
  ul_thang_sai_dang: 'Tháng phải có dạng YYYY-MM (ví dụ 2026-10).',
  ul_so_tien_sai: 'Số tiền ứng phải là số lớn hơn 0.',
  ul_ngay_sai: 'Ngày ứng phải có dạng YYYY-MM-DD.',
  ul_thang_qua_khu: 'Không thể gửi đề nghị ứng lương cho tháng đã qua.',
  ul_trung_thang: 'Tháng này đã có khoản ứng đang chờ duyệt hoặc đã duyệt.',
  ul_khong_tim_thay: 'Không tìm thấy khoản ứng của bạn.',
  ul_chi_huy_khi_cho_duyet: 'Chỉ hủy được đề nghị khi còn chờ duyệt.',
  ul_thong_bao_de_nghi: 'Có đề nghị ứng lương mới',
  ul_thong_bao_noi_dung: '{ten} gửi đề nghị ứng lương tháng {thang}.',
  ul_thong_bao_duyet: 'Khoản ứng lương của bạn đã được duyệt',
  ul_thong_bao_duyet_noi_dung: 'Đề nghị ứng lương tháng {thang} của bạn đã được duyệt.',
  ul_thong_bao_chi: 'Khoản ứng lương của bạn đã được chi',
  ul_thong_bao_chi_noi_dung: 'Khoản ứng lương tháng {thang} của bạn đã được đánh dấu đã chi.',
  ul_thong_bao_huy: 'Khoản ứng lương của bạn đã bị hủy',
  ul_thong_bao_huy_noi_dung: 'Đề nghị ứng lương tháng {thang} của bạn đã bị hủy.',

  // ================================ phong ban kiem nhiem
  kn_danh_sach_sai: 'Danh sách phòng ban kiêm nhiệm không hợp lệ.',
  kn_phong_khong_ton_tai: 'Có phòng ban kiêm nhiệm không tồn tại.',

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

  // ================================ quy trinh thoi viec
  tv_thong_bao_qd_tieu_de: 'Quyết định nghỉ việc đã ban hành',
  tv_thong_bao_qd_noi_dung: 'Bạn đã được đưa vào quy trình thôi việc — ngày làm việc cuối '
    + '{ngay}. Mở Hướng dẫn thôi việc để làm bàn giao trước ngày này.',
  tv_thong_bao_qt_moi_tieu_de: 'Quy trình thôi việc mới',
  tv_thong_bao_qt_moi_noi_dung: '{ten} ({ma}) — ngày làm việc cuối {ngay}. Vào Thôi việc để '
    + 'chỉ định người nhận bàn giao.',

  // ================================ email thong bao (khung + chu ky)
  email_chu_de_tien_to: 'Chấm công',
  email_thong_bao_noi_bo: 'THÔNG BÁO NỘI BỘ',
  email_ma_thong_bao: 'Mã thông báo',
  email_tep_dinh_kem: 'Văn bản đầy đủ đính kèm bên dưới.',
  email_xac_nhan_da_doc: 'Vui lòng mở ứng dụng Chấm công để xác nhận đã đọc.',
  email_tran_trong: 'Trân trọng,',
  email_phong_nhan_su: 'Phòng Nhân sự',
  email_cong_ty: 'Công ty TNHH Trần Hoàng Việt Nam',
  email_tu_dong: 'Email tự động từ hệ thống chấm công — vui lòng không trả lời trực tiếp email này.',

  // ================================ yeu cau bo sung ho so
  bs_tieu_de: 'Yêu cầu bổ sung hồ sơ',
  bs_email_tieu_de: 'Nhắc bổ sung hồ sơ — còn {so} tài liệu bắt buộc',
  bs_chao: 'Chào {ten},',
  bs_mo_ta: 'Hồ sơ nhân sự của bạn còn {so} tài liệu bắt buộc chưa bổ sung. Vui lòng nộp cho phòng Nhân sự.',
  bs_danh_sach: 'Tài liệu cần bổ sung',
  bs_han: 'Hạn bổ sung: {ngay}',
  bs_ghi_chu: 'Ghi chú từ phòng Nhân sự',
  bs_lan: 'Đây là lần nhắc thứ {n}.',
  bs_ket: 'Hệ thống sẽ tiếp tục nhắc cho đến khi hồ sơ được bổ sung đầy đủ.',
  bs_huong_dan: 'Cách nộp: mở ứng dụng Chấm công → mục Cá nhân → Hồ sơ của tôi → tab Tài liệu, rồi bấm "Nộp tệp" ở dòng tài liệu còn thiếu (nhận PDF, JPG, PNG, DOCX, XLSX).',
  bs_da_huy_nguoi_nhan: 'Yêu cầu bổ sung hồ sơ của {ten} đã được hủy.',
  bs_da_du_nguoi_nhan: 'Hồ sơ của {ten} đã bổ sung đủ tài liệu bắt buộc — yêu cầu đã tự đóng.',

  // ================================ dong bo email nhan su
  ns_thieu_email_tieu_de: 'Nhân sự đang làm chưa có email',
  ns_thieu_email_noi_dung: '{so} nhân sự đang làm việc chưa có email nên sẽ không nhận được thông báo, phiếu lương hay nhắc hồ sơ nào: {danh_sach}. Vào Hồ sơ nhân sự để bổ sung email.',

  // ================================ quet nghi viec chua khoa tai khoan
  qn_tieu_de: 'Cảnh báo: tài khoản của người đã nghỉ chưa được khóa',
  qn_noi_dung: '{so} nhân sự đã nghỉ nhưng tài khoản ở ERP1 hoặc Microsoft 365 vẫn còn mở: {danh_sach}. Vào Hồ sơ nhân sự để báo lại việc khóa tài khoản.',
  qn_loi_erp1: 'ERP1 chưa khóa',
  qn_loi_m365_mo: 'M365 vẫn đăng nhập được',
  qn_loi_m365_phep: 'M365 còn giấy phép',

  // ================================ bao PIN may cham cong cho nguoi moi
  pin_tieu_de: 'PIN máy chấm công của bạn: {pin}',
  pin_noi_dung:
    'Mã PIN của bạn trên máy chấm công là {pin}{may}. Khi đến máy, chọn "Đăng ký" rồi nhập đúng số này để đăng ký vân tay, khuôn mặt hoặc thẻ. PIN là danh tính chấm công của bạn — không chia sẻ cho người khác, vì mọi lượt quẹt bằng số này đều tính công cho bạn.',
  pin_noi_dung_may: ' (đã đẩy xuống máy: {may})',

  // ================================ bao quan tri vien: co nhan su moi
  ns_moi_tieu_de: 'Có nhân sự mới: {ho_ten}',
  ns_moi_noi_dung:
    '{ho_ten} ({ma_nv}) vừa được thêm vào hệ thống. Mở trang Nhân viên để xem hồ sơ — không cần duyệt.',

  // ================================ Microsoft 365: nguoi moi duoc cap giay phep
  m365_moi_tieu_de: 'Microsoft 365 có tài khoản mới được cấp phép',
  m365_moi_noi_dung:
    '{danh_sach} vừa có giấy phép Microsoft 365 — mở trang Nhân viên để thêm hồ sơ cho họ.',

  // ================================ gui tai khoan Microsoft khoi tao cho nguoi lap ho so
  tk365_tieu_de: 'Tài khoản Microsoft 365 của {ho_ten}: {upn}',
  tk365_noi_dung:
    'Tên đăng nhập: {upn} — Mật khẩu khởi tạo: {mat_khau}. Hãy bàn giao cho nhân viên và nhắc họ đổi mật khẩu ngay ở lần đăng nhập đầu tiên (Microsoft bắt buộc đổi). Không gửi mật khẩu qua kênh công khai.',
} as const;
