// Quy trinh va luu y cua TUNG TRANG, theo TUNG VAI TRO.
//
// VI SAO KHAI MOT CHO: he thong nay co 20 trang va 6 vai tro. Neu moi trang tu viet huong dan
// cua no thi sau vai thang chung noi khac nhau, va cho lech nguy hiem nhat la giao dien huong
// dan mot dang con may chu lam mot dang. Mot bang duy nhat thi doc het duoc trong mot lan, va co
// bai kiem doi moi trang trong thanh dieu huong phai co mot muc o day.
//
// LUU Y PHAI LA BAY THAT. "Nho luu du lieu" thi khong ai doc; "doi ca khong tu tinh lai bang cong
// cu" thi cuu duoc mot ky luong. Moi dong trong `luu_y` duoi day deu la mot cho da lam sai that,
// hoac mot rang buoc phap ly.

export type VaiTro =
  | 'admin' | 'nhan_su' | 'truong_phong_nhan_su' | 'truong_phong' | 'nhan_vien' | 'cho_duyet';

/** Cac vai tro quan tri cham cong — dung cho cac buoc chi ho lam duoc. */
export const NHAN_SU: readonly VaiTro[] = ['admin', 'nhan_su', 'truong_phong_nhan_su'];

export interface BuocHuongDan {
  chu: string;
  /** Vai tro lam duoc buoc nay. Bo trong = moi vai tro vao duoc trang deu lam duoc. */
  vai_tro?: readonly VaiTro[];
}

export interface HuongDanTrang {
  duong_dan: string;
  /** Trang nay de lam gi — mot cau, khong phai mot doan. */
  tom_tat: string;
  /** Quy trinh, theo thu tu. */
  buoc: readonly BuocHuongDan[];
  /** Bay that. Khong phai loi khuyen chung chung. */
  luu_y?: readonly string[];
}

export const HUONG_DAN: readonly HuongDanTrang[] = [
  {
    duong_dan: '/',
    tom_tat: 'Tổng quan hôm nay, đã lọc theo đúng phạm vi bạn được xem.',
    buoc: [
      { chu: 'Xem số đi muộn / vắng / chờ duyệt của hôm nay.' },
      { chu: 'Bấm vào một con số để mở thẳng danh sách phía sau nó.' },
      { chu: 'Máy chấm công mất kết nối sẽ hiện ở đây trước khi ai kịp phát hiện.', vai_tro: NHAN_SU },
    ],
    luu_y: [
      'Mỗi vai trò thấy một bảng khác nhau: trưởng phòng chỉ thấy phòng mình, nhân viên chỉ thấy của chính mình. Máy chủ lọc, không phải giao diện — nên con số bạn thấy là con số bạn được thấy.',
    ],
  },
  {
    duong_dan: '/lan-quet',
    tom_tat: 'Nhật ký thô từ máy chấm công — nguồn sự thật của mọi con số công.',
    buoc: [
      { chu: 'Lọc theo ngày / máy để soi một khoảng cụ thể.' },
      { chu: 'Cột PIN chưa map: có nghĩa máy gửi lên một PIN mà hệ thống không biết của ai.', vai_tro: NHAN_SU },
      { chu: 'Bấm Gán nhân viên cho PIN đó, hệ thống tự tính lại các ngày bị ảnh hưởng.', vai_tro: NHAN_SU },
    ],
    luu_y: [
      'Lần quẹt KHÔNG bao giờ bị xóa hay sửa — đây là bằng chứng gốc. Sai giờ thì sửa bằng đơn giải trình, không sửa lần quẹt.',
      'PIN chưa map mà để lâu là mất công của người thật: ngày đó họ bị tính vắng.',
    ],
  },
  {
    duong_dan: '/bang-cong',
    tom_tat: 'Công đã tính của từng người, từng ngày — thứ dùng để trả lương.',
    buoc: [
      { chu: 'Chọn tháng và phòng ban.' },
      { chu: 'Soi các ô bất thường: đi muộn nhiều, thiếu giờ ra, vắng không đơn.' },
      { chu: 'Sửa gốc (đơn nghỉ phép, giải trình, gán PIN) rồi bấm Tính lại tháng.', vai_tro: NHAN_SU },
      { chu: 'Xuất CSV cho kế toán khi số đã đúng.', vai_tro: NHAN_SU },
    ],
    luu_y: [
      'Đổi quy tắc ca KHÔNG tự tính lại bảng công cũ. Sửa ca xong phải bấm Tính lại tháng cho các tháng liên quan, nếu không số cũ vẫn theo quy tắc cũ.',
      'Kỳ lương đã duyệt thì tháng đó bị khóa: không tính lại được nữa. Muốn sửa phải mở khóa kỳ lương trước.',
      'Giờ vào = lần quẹt sớm nhất, giờ ra = muộn nhất trong ngày. Đến sớm hơn giờ ca không được tính thêm công.',
    ],
  },
  {
    duong_dan: '/nhan-vien',
    tom_tat: 'Hồ sơ nhân sự: thông tin, tài liệu, hợp đồng, mã ở các hệ thống.',
    buoc: [
      { chu: 'Thêm nhân viên: mã nhân viên + họ tên là bắt buộc, phần còn lại điền dần.', vai_tro: NHAN_SU },
      { chu: 'Mở hồ sơ → thẻ Mã ở các hệ thống → Cấp PIN, chọn máy. Hệ thống chọn số còn trống.', vai_tro: NHAN_SU },
      { chu: 'Cài đúng số đó lên máy chấm công, rồi nhân viên đăng ký khuôn mặt/vân tay tại máy.', vai_tro: NHAN_SU },
      { chu: 'Nạp tài liệu vào tab Tài liệu theo checklist.', vai_tro: NHAN_SU },
      { chu: 'Người nghỉ việc: bấm Cho nghỉ việc, KHÔNG xóa hồ sơ.', vai_tro: NHAN_SU },
      { chu: 'Chỉ dữ liệu thử mới xóa hẳn: cho nghỉ việc trước, xem báo cáo sẽ mất gì, rồi mới xác nhận.', vai_tro: NHAN_SU },
    ],
    luu_y: [
      'ĐỪNG tự nghĩ ra số PIN. Hệ thống cấp số theo dải của từng máy — tự nghĩ số là cách hai văn phòng cùng đánh số 1 và công của người này chạy sang người kia.',
      'Cho nghỉ việc giữ nguyên lịch sử chấm công và vô hiệu hóa tài khoản đăng nhập. Xóa hồ sơ là mất bảng công cũ — lần quẹt ở lại nhưng thành vô chủ.',
      'Người đã có phiếu lương thì KHÔNG xóa được, vĩnh viễn. Đã trả lương cho ai thì hồ sơ người đó là chứng từ.',
      'Đổi mã nhân viên hoặc họ tên sẽ đổi luôn tên thư mục kho tệp — bình thường, hệ thống tự dọn.',
    ],
  },
  {
    duong_dan: '/duyet-don',
    tom_tat: 'Đơn của nhân viên: nghỉ phép, giải trình, làm thêm, đổi ca, công tác, thôi việc.',
    buoc: [
      { chu: 'Lọc theo Chờ duyệt để thấy việc cần làm hôm nay.' },
      { chu: 'Mở đơn, đọc lý do và các cảnh báo hệ thống ghi kèm.' },
      { chu: 'Duyệt hoặc từ chối — từ chối thì ghi lý do, người gửi đọc được.', vai_tro: ['admin', 'nhan_su', 'truong_phong_nhan_su', 'truong_phong'] },
      { chu: 'Tab Chấm công điện thoại: xem ảnh và khoảng cách GPS trước khi duyệt.', vai_tro: NHAN_SU },
    ],
    luu_y: [
      'Trưởng phòng chỉ thấy và duyệt đơn của phòng mình. Đây là ràng buộc ở máy chủ, không phải bộ lọc giao diện.',
      'Cảnh báo vượt 40 giờ làm thêm/tháng (BLLĐ Điều 107) và cảnh báo báo trước dưới mức Điều 35.1 là CẢNH BÁO, không chặn — một số trường hợp hợp pháp vẫn vượt. Đọc rồi quyết.',
      'Duyệt đơn nghỉ phép/công tác làm bảng công ngày đó đổi ngay, không cần tính lại tay.',
    ],
  },
  {
    duong_dan: '/ra-vao',
    tom_tat: 'Cảnh báo ra/vào không quẹt thẻ: hệ thống tự nhắc nhở / chuyển kỷ luật, nhân sự xem lại và xử lý.',
    buoc: [
      { chu: 'Lọc theo ngày và trạng thái; xem người bị cảnh báo nhiều nhất ở Tổng quan.', vai_tro: NHAN_SU },
      { chu: 'Bấm "Xử lý": nhắc nhở (gửi email), chuyển kỷ luật, hoặc đánh dấu hợp lệ kèm lý do.', vai_tro: NHAN_SU },
      { chu: 'Khi chuyển kỷ luật, sang tab Vi phạm đối chiếu điều nội quy + mức xử phạt và lập biên bản.', vai_tro: NHAN_SU },
    ],
    luu_y: [
      'Phút ra ngoài chỉ đo, KHÔNG tự trừ công. Cảnh báo là bằng chứng có lần ra/vào không quẹt thẻ.',
      'Hệ thống tự xử lý theo tần suất: dưới ngưỡng nhắc nhở, từ ngưỡng chuyển kỷ luật. Kỷ luật vẫn phải qua biên bản theo BLLĐ Điều 122.',
    ],
  },
  {
    duong_dan: '/ky-luat',
    tom_tat: 'Gom vi phạm theo tháng & mức độ thành hồ sơ kỷ luật; hệ thống tự nhắc nhở hoặc giảm thưởng.',
    buoc: [
      { chu: 'Khai mức giảm thưởng cho từng loại vi phạm trong danh mục (tab Vi phạm), và bật quy tắc phát hiện.', vai_tro: NHAN_SU },
      { chu: 'Bấm "Quét & xử lý" cho tháng — hệ thống gom vi phạm, nhắc nhở, và tự áp giảm thưởng dưới ngưỡng.', vai_tro: NHAN_SU },
      { chu: 'Hồ sơ giảm thưởng ≥ ngưỡng chuyển "Chờ duyệt": người có thẩm quyền vào xem chi tiết rồi duyệt hoặc bãi bỏ.', vai_tro: NHAN_SU },
    ],
    luu_y: [
      'Chế tài tài chính ở đây là GIẢM THƯỞNG P3 (Điều 104 BLLĐ, Điều 14 Nội quy) — KHÔNG phải phạt tiền, KHÔNG trừ lương cơ bản (Điều 127 CẤM). Khoản này chỉ vào phần thưởng/phụ cấp khi tính lương.',
      'Kỷ luật lao động chính thức (khiển trách, kéo dài nâng lương, cách chức, sa thải) vẫn phải qua họp + giải trình + biên bản (BLLĐ Điều 122/124), làm ở tab Vi phạm — hệ thống không tự áp.',
      'Hệ thống chỉ tự giảm tiền khi nhân sự đã khai mức giảm thưởng trong danh mục. Chưa khai thì chỉ nhắc nhở.',
    ],
  },
  {
    duong_dan: '/kpi',
    tom_tat: 'Chấm điểm KPI, lấy số từ dữ liệu thật thay vì gõ tay.',
    buoc: [
      { chu: 'Khai danh mục KPI và trọng số cho từng vị trí.', vai_tro: NHAN_SU },
      { chu: 'Chọn kỳ, bấm lấy dữ liệu — hệ thống điền các chỉ tiêu đo được (công, đi muộn, vi phạm).', vai_tro: NHAN_SU },
      { chu: 'Điền tay các chỉ tiêu định tính rồi chốt điểm.', vai_tro: NHAN_SU },
    ],
    luu_y: [
      'Chỉ tiêu nào hệ thống đo được thì để hệ thống đo. Gõ tay số mà hệ thống có là mở đường cho tranh cãi không có bằng chứng.',
    ],
  },
  {
    duong_dan: '/bang-luong',
    tom_tat: 'Dựng bảng lương từ bảng công, gửi duyệt, rồi chốt.',
    buoc: [
      { chu: 'Kiểm bảng công tháng đó đã đúng TRƯỚC khi dựng lương.', vai_tro: NHAN_SU },
      { chu: 'Chọn kỳ → Dựng bảng lương. Hệ thống tính từ công, BHXH và thuế TNCN theo tham số.', vai_tro: NHAN_SU },
      { chu: 'Nút "Khoản" trên từng dòng: nhập phụ cấp và các khoản trừ của người đó.', vai_tro: NHAN_SU },
      { chu: 'Soi các dòng bất thường, sửa gốc rồi dựng lại.', vai_tro: NHAN_SU },
      { chu: 'Gửi duyệt → duyệt. Duyệt xong bảng chốt được lưu lại.', vai_tro: ['admin', 'nhan_su', 'truong_phong_nhan_su'] },
      { chu: 'Tab "Phụ cấp": khai phụ cấp định kỳ của từng người MỘT LẦN (có hiệu lực từ–đến); kỳ lương tự sinh khoản, không phải gõ lại mỗi tháng.', vai_tro: NHAN_SU },
    ],
    luu_y: [
      'Duyệt kỳ lương KHÓA tháng đó: bảng công không tính lại được nữa. Đó là chủ ý — số đã trả lương thì không được đổi sau lưng.',
      'Phụ cấp: đổi mức thì gán lại với ngày hiệu lực mới, dòng cũ TỰ ĐÓNG và ở lại làm lịch sử (tính lại lương tháng cũ vẫn ra số cũ). Người thôi hưởng thì bấm "Đóng", KHÔNG xóa.',
      'Sửa sau khi duyệt phải mở khóa kỳ, sửa, rồi dựng và duyệt lại. Mọi bước đều vào nhật ký.',
      'Khoản tính theo công thức (phụ cấp ăn trưa, nửa ngày lương) chỉ nhập SỐ LƯỢNG — tiền do hệ thống nhân ra và tính lại mỗi lần dựng bảng. Gõ tiền tay vào đó thì lần dựng sau bị ghi đè.',
      'BLLĐ 2019 Điều 127 khoản 3 CẤM phạt tiền và cấm cắt lương thay cho xử lý kỷ luật. Hai khoản "trừ đi muộn" và "trừ nửa ngày lương" mang cảnh báo này ngay tại chỗ nhập. Cách hợp pháp cho thời gian không làm việc là ghi giảm CÔNG trên bảng chấm công, để nó tự vào lương theo ngày công.',
    ],
  },
  {
    duong_dan: '/hop-dong',
    tom_tat: 'Hạn hợp đồng và tìm trong nội dung hợp đồng đã trích.',
    buoc: [
      { chu: 'Xem danh sách hợp đồng sắp hết hạn — cột số ngày còn lại.', vai_tro: NHAN_SU },
      { chu: 'Mở hồ sơ người đó để ký phụ lục hoặc hợp đồng mới.', vai_tro: NHAN_SU },
      { chu: 'Tìm trong nội dung: gõ một cụm từ để tìm xuyên các bản đã trích.', vai_tro: NHAN_SU },
    ],
    luu_y: [
      'Hợp đồng xác định thời hạn hết hạn mà vẫn làm việc thì sau 30 ngày tự thành không xác định thời hạn (BLLĐ Điều 20.2). Nhắc hạn ở đây là để không rơi vào tình huống đó ngoài ý muốn.',
      'Bản scan được OCR để tìm kiếm, nhưng bản gốc pháp lý vẫn là tệp đã nạp — nội dung trích chỉ để tra cứu.',
    ],
  },
  {
    duong_dan: '/cai-dat',
    tom_tat: 'Toàn bộ mục cấu hình, gom thành bốn nhóm.',
    buoc: [
      { chu: 'Chấm công: máy, ca làm việc, địa điểm, ngày lễ — khai trước khi chạy thật.', vai_tro: NHAN_SU },
      { chu: 'Nhân sự & lương: tham số BHXH/thuế và danh mục khoản lương.', vai_tro: NHAN_SU },
      { chu: 'Tài khoản & bảo mật: người dùng, khóa API, nhật ký thao tác.', vai_tro: ['admin'] },
      { chu: 'Tích hợp & dữ liệu: đồng bộ ERP, kho tệp, mã định danh.', vai_tro: NHAN_SU },
    ],
    luu_y: [
      'Chỉ hiện những mục vai trò của bạn được sửa. Thiếu một mục nghĩa là tài khoản không có quyền ở đó, không phải hệ thống thiếu tính năng.',
      'Các mục này trước đây nằm thẳng trên thanh bên (/thiet-bi, /tham-so-luong…). Đường dẫn cũ vẫn chạy — nó tự chuyển sang đường mới, nên bookmark cũ không hỏng.',
      'Đây là nơi sửa QUY TẮC, không phải sửa số. Đổi quy tắc ca hay tham số lương KHÔNG tự tính lại dữ liệu cũ — phải bấm tính lại ở trang tương ứng.',
    ],
  },
  {
    duong_dan: '/cai-dat/thiet-bi',
    tom_tat: 'Máy chấm công: khai serial, dải PIN, và các lệnh gửi xuống máy.',
    buoc: [
      { chu: 'Khai serial lấy ở Menu › Hệ thống › Thông tin thiết bị TRÊN CHÍNH MÁY.', vai_tro: NHAN_SU },
      { chu: 'Khai dải PIN của máy (VP1 1001–1999, VP2 2001–2999) để hệ thống cấp số không đụng nhau.', vai_tro: NHAN_SU },
      { chu: 'Trên máy: Menu › Comm › Cloud Server — địa chỉ máy chủ, cổng 8080, chế độ ADMS, Realtime bật.', vai_tro: NHAN_SU },
      { chu: 'Bấm Đồng bộ giờ cho máy mới.', vai_tro: NHAN_SU },
      { chu: 'Nạp NV để tạo sẵn user trên máy theo PIN đã cấp.', vai_tro: NHAN_SU },
      { chu: 'Máy thay/bỏ: Tắt trước, rồi Xóa. Lịch sử lần quẹt vẫn giữ nguyên.', vai_tro: NHAN_SU },
    ],
    luu_y: [
      'Địa chỉ máy chủ KHÔNG gửi xuống được từ đây — giao thức là máy tự gọi lên. Phải gõ trên chính máy.',
      'Máy chưa khai serial bị từ chối 401. Đó là lớp chặn máy lạ, không phải lỗi mạng.',
      'Máy đang tắt không nhận lệnh: cổng chỉ tiếp máy đang bật, nên lệnh xếp cho máy tắt sẽ nằm lại mãi. Hệ thống nay từ chối thay vì xếp lệnh chết.',
      'Lệch đồng hồ giữa các máy là nguyên nhân sai công phổ biến nhất, và nguy hiểm hơn khi giờ vào / giờ ra do hai máy khác nhau ghi.',
      'Khuôn mặt / vân tay không nạp từ xa được — phải đăng ký tại từng máy.',
    ],
  },
  {
    duong_dan: '/cai-dat/ca-lam',
    tom_tat: 'Khung giờ, dung sai, ngưỡng tăng ca và các ngày phải đi làm.',
    buoc: [
      { chu: 'Sửa ca Hành chính cho khớp giờ thật của công ty.', vai_tro: NHAN_SU },
      { chu: 'Chọn đúng CÁC NGÀY PHẢI ĐI LÀM — mặc định T2–T6.', vai_tro: NHAN_SU },
      { chu: 'Đặt dung sai đi muộn/về sớm và ngưỡng tính tăng ca.', vai_tro: NHAN_SU },
      { chu: 'Ca đêm qua nửa đêm: bật "qua đêm", nếu không giờ ra sẽ rơi sang ngày hôm sau.', vai_tro: NHAN_SU },
    ],
    luu_y: [
      'Công ty làm cả thứ Bảy phải tự thêm — mặc định T2–T6, và thiếu bước này thì thứ Bảy bị tính là Nghỉ tuần.',
      'Sửa ca xong PHẢI bấm Tính lại tháng ở trang Bảng công cho các tháng cần cập nhật.',
    ],
  },
  {
    duong_dan: '/cai-dat/dia-diem',
    tom_tat: 'Điểm và bán kính để đối chiếu GPS khi chấm công bằng điện thoại.',
    buoc: [
      { chu: 'Thêm địa điểm: tọa độ + bán kính cho phép.', vai_tro: NHAN_SU },
      { chu: 'Bật quyền chấm công điện thoại cho từng người ở trang Nhân viên.', vai_tro: NHAN_SU },
    ],
    luu_y: [
      'Chưa khai địa điểm nào thì mọi lần chấm công điện thoại đều phải duyệt tay — không có gì để đối chiếu.',
      'Điện thoại bật app giả lập vị trí sẽ bị ghi nhận kèm cảnh báo và luôn phải duyệt.',
    ],
  },
  {
    duong_dan: '/cai-dat/ngay-le',
    tom_tat: 'Ngày nghỉ hưởng lương — ảnh hưởng trực tiếp đến số công.',
    buoc: [
      { chu: 'Đầu mỗi năm: thêm Tết Nguyên đán và các ngày nghỉ bù theo lịch âm.', vai_tro: NHAN_SU },
      { chu: 'Kiểm lại danh sách trước mỗi kỳ lương có ngày lễ.', vai_tro: NHAN_SU },
    ],
    luu_y: [
      'Chỉ có sẵn ngày lễ dương lịch cố định. TẾT ÂM LỊCH PHẢI TỰ THÊM MỖI NĂM — quên là cả công ty bị tính vắng những ngày đó.',
      'Làm việc vào ngày lễ: toàn bộ thời gian tính vào tăng ca, và không tính đi muộn.',
    ],
  },
  {
    duong_dan: '/cai-dat/tai-khoan',
    tom_tat: 'Tài khoản đăng nhập và vai trò.',
    buoc: [
      { chu: 'Tạo tài khoản, gán đúng vai trò và nối với hồ sơ nhân viên.', vai_tro: ['admin'] },
      { chu: 'Người đăng nhập Microsoft lần đầu vào trạng thái Chờ duyệt — phân vai trò cho họ ở đây.', vai_tro: ['admin'] },
      { chu: 'Người nghỉ việc: vô hiệu hóa, không xóa.', vai_tro: ['admin'] },
    ],
    luu_y: [
      'Vai trò Trưởng phòng nhân sự là vai trò DUY NHẤT được thay hoặc gỡ tệp đã nạp vào hồ sơ. Cấp cho ai là quyết định về bằng chứng gốc.',
      'Vai trò nhân viên và trưởng phòng bắt buộc phải nối với một hồ sơ nhân viên, nếu không họ không xem được gì.',
    ],
  },
  {
    duong_dan: '/cai-dat/tham-so-luong',
    tom_tat: 'Tỷ lệ BHXH, thuế TNCN, giảm trừ gia cảnh, lương tối thiểu vùng, danh mục khoản.',
    buoc: [
      { chu: 'Kiểm tham số đang áp dụng trước mỗi kỳ lương đầu năm.', vai_tro: NHAN_SU },
      { chu: 'Sửa khi nhà nước thay đổi mức, ghi rõ ngày áp dụng.', vai_tro: NHAN_SU },
      { chu: 'Danh mục khoản: thêm phụ cấp / khoản trừ mới của công ty ở cuối trang.', vai_tro: ['admin'] },
    ],
    luu_y: [
      'Đổi tham số KHÔNG tự dựng lại bảng lương đã tính. Phải dựng lại kỳ đó.',
      'Mức lương tối thiểu vùng khác nhau theo địa bàn — công ty nhiều văn phòng thì kiểm từng nơi.',
      'Ô "miễn thuế" của một khoản quyết định thuế TNCN của cả công ty. Chỉ đánh dấu khi có căn cứ — ăn giữa ca và trang phục trong hạn mức (Thông tư 111/2013), hay tiền hoàn lại khoản nhân viên chi hộ.',
      'Ngừng dùng một khoản chỉ chặn THÊM MỚI. Các phiếu đã tính vẫn giữ khoản đó — tắt không phải là xóa lịch sử.',
      'Công chuẩn tháng để 0 thì hệ thống đếm ngày làm việc thật của từng tháng. Điền một số cố định là ấn định chung cho mọi tháng: tiện, nhưng tháng 28 ngày và tháng 31 ngày sẽ trả như nhau.',
    ],
  },
  {
    duong_dan: '/cai-dat/dong-bo-erp',
    tom_tat: 'Kéo danh sách người dùng từ ERP cũ và nối với Microsoft 365.',
    buoc: [
      { chu: 'Bấm Chạy thử — đọc ERP, cho biết sẽ tạo/sửa ai, KHÔNG ghi gì.', vai_tro: ['admin'] },
      { chu: 'Đọc kỹ bảng kết quả, nhất là các dòng cảnh báo.', vai_tro: ['admin'] },
      { chu: 'Thấy đúng rồi mới bấm Đồng bộ thật.', vai_tro: ['admin'] },
      { chu: 'Dùng nút "Ai chưa có email?" để tìm người không đăng nhập Microsoft được.', vai_tro: ['admin'] },
    ],
    luu_y: [
      'Đồng bộ tạo và sửa nhân viên HÀNG LOẠT. Bước chạy thử là bắt buộc về mặt quy trình, không phải tùy chọn.',
      'ERP cũ trả họ tên trong ô số điện thoại với một số người. Hệ thống bỏ qua giá trị đó và báo ở cột Chi tiết — sửa bên ERP, sửa ở đây thì lượt sau bị ghi đè.',
      'Đồng bộ không bao giờ tự lấy mã đang thuộc người khác. Gặp trường hợp đó nó báo rồi đi tiếp.',
    ],
  },
  {
    duong_dan: '/cai-dat/khoa-api',
    tom_tat: 'Khóa cho hệ thống ngoài gọi vào API tích hợp.',
    buoc: [
      { chu: 'Tạo khóa, chọn ĐÚNG phạm vi tối thiểu cần dùng.', vai_tro: ['admin'] },
      { chu: 'Giới hạn IP gọi được nếu bên kia có IP cố định.', vai_tro: ['admin'] },
      { chu: 'Sao chép khóa ngay — nó chỉ hiện một lần.', vai_tro: ['admin'] },
    ],
    luu_y: [
      'Một khóa API mở đường vào dữ liệu chấm công và hồ sơ nhân sự của cả công ty. Cấp cho ai là quyết định ngang với cấp tài khoản quản trị.',
      'Đặt hạn dùng cho khóa cấp cho đối tác. Khóa không hạn là khóa không ai nhớ để thu hồi.',
    ],
  },
  {
    duong_dan: '/cai-dat/kho-tep',
    tom_tat: 'Toàn bộ tệp đã nạp vào hồ sơ, và cây thư mục trên đĩa.',
    buoc: [
      { chu: 'Tra cứu một tệp theo người, theo nhóm, hoặc theo tên.', vai_tro: NHAN_SU },
      { chu: 'Cây thư mục: xem trước rồi mới sắp xếp lại.', vai_tro: NHAN_SU },
      { chu: 'Đồng bộ SharePoint: bấm Tính lại đường dẫn, đọc kỹ, rồi mới bật đẩy.', vai_tro: NHAN_SU },
    ],
    luu_y: [
      'Chỉ Trưởng phòng nhân sự được thay hoặc gỡ tệp đã nạp. Người khác nạp thêm được, không sửa được — bản gốc giấy tờ pháp lý không phải thứ ai cũng đổi.',
      'Thư mục lệch tên KHÔNG làm mất tệp: đường đọc là bản ghi trong cơ sở dữ liệu. Sắp xếp lại là dọn dẹp, không phải cứu hộ.',
      'Đồng bộ SharePoint là MỘT CHIỀU và xóa lan theo: xóa tệp ở đây thì bản trên SharePoint cũng mất ở lượt sau.',
    ],
  },
  {
    duong_dan: '/cai-dat/ma-dinh-danh',
    tom_tat: 'Mã của một người ở các hệ thống khác: PIN máy, ERP cũ, Microsoft.',
    buoc: [
      { chu: 'Tra cứu: gõ một mã bất kỳ để biết nó là của ai — kể cả mã đã đóng.', vai_tro: NHAN_SU },
      { chu: 'Đối soát: so bảng mã định danh với các cột cũ, hai chiều.', vai_tro: NHAN_SU },
      { chu: 'Cấp/thu hồi mã làm ở thẻ Mã ở các hệ thống trong hồ sơ từng người.', vai_tro: NHAN_SU },
    ],
    luu_y: [
      'Một mã ĐANG HIỆU LỰC chỉ thuộc một người — cơ sở dữ liệu bảo đảm. Muốn chuyển sang người khác phải xác nhận thu hồi, và mã cũ được đóng lại chứ không xóa.',
      'Đối soát sạch là trạng thái bình thường. Có dòng lệch nghĩa là có một đường ghi nào đó chưa đi qua bảng — cần tìm, không phải bỏ qua.',
    ],
  },
  {
    duong_dan: '/cai-dat/nhat-ky',
    tom_tat: 'Ai sửa gì, khi nào, từ IP nào.',
    buoc: [
      { chu: 'Lọc theo người dùng, hành động, hoặc khoảng thời gian.', vai_tro: ['admin'] },
      { chu: 'Dùng khi cần trả lời "vì sao dữ liệu này đổi".', vai_tro: ['admin'] },
    ],
    luu_y: [
      'Nhật ký chỉ ghi thêm, không sửa và không xóa được từ giao diện. Đó là điều làm nó dùng được khi có tranh chấp.',
      'Truy cập dữ liệu cá nhân nhạy cảm (CCCD, số BHXH, hồ sơ sức khỏe) được ghi lại theo NĐ 13/2023.',
    ],
  },
];

const THEO_DUONG = new Map(HUONG_DAN.map((h) => [h.duong_dan, h]));

export function huong_dan_cua(duong_dan: string): HuongDanTrang | null {
  return THEO_DUONG.get(duong_dan) ?? null;
}

/** Cac buoc ma vai tro nay lam duoc. */
export function buoc_cho_vai_tro(h: HuongDanTrang, vai_tro: VaiTro | null): BuocHuongDan[] {
  return h.buoc.filter(
    (b) => b.vai_tro === undefined || (vai_tro !== null && b.vai_tro.includes(vai_tro)));
}
