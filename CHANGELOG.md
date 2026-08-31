# Nhật ký thay đổi

Theo [SemVer](https://semver.org/lang/vi/).

## [1.74.0] — 2026-08-31

**Khóa cửa theo giờ — chặn VÀO ngoài giờ làm việc (Cài đặt → Thiết bị).**

- **Migration 040**: `khoa_cua_lich` (mỗi máy: bật/tắt, giờ mở, giờ đóng, chặn cuối tuần, lệnh mở/chặn, trạng thái đã áp dụng).
- **Cài đặt → Thiết bị**: mỗi máy thêm nút **"Khóa cửa theo giờ"** — bật chặn VÀO ngoài khung [giờ mở, giờ đóng] (+ tùy chọn chặn cả cuối tuần), khai lệnh điều khiển cửa + **nút Test** gửi lệnh ngay để kiểm chứng trên máy thật (firmware acc kén lệnh, như vụ DATA QUERY).
- **Bộ lập lịch** (`lich_chay`) mỗi vòng tự tính trạng thái cửa theo giờ và chỉ gửi lệnh KHI đổi trạng thái; lệnh để trống = không gửi gì (an toàn mặc định).
- **An toàn PCCC (QCVN 06 / NĐ 136)**: chỉ chặn chiều VÀO; lối RA phải luôn tự do bằng phần cứng — cảnh báo rõ trên giao diện. `bat=false` mặc định, không tự bật.

## [1.73.0] — 2026-08-31

**Đề xuất & Kiến nghị (danh mục mở) + quản lý đơn.**

- **Migration 039**: `loai_de_xuat` (danh mục loại HR tự quản lý, seed sẵn: cấp phát thiết bị, mua sắm, sửa chữa, tạm ứng, kiến nghị, khác) + `de_xuat` (mã `DX-`, tiêu đề, nội dung, số lượng; vòng đời chờ duyệt → duyệt/từ chối/hủy).
- **Nhân viên**: tab **"Đề xuất & kiến nghị"** trong Đơn của tôi — chọn loại, nhập tiêu đề/nội dung (ô số lượng hiện khi loại cần, vd thiết bị), theo dõi trạng thái + hủy khi chờ duyệt.
- **Quản lý đơn**: Duyệt đơn thêm tab **"Đề xuất & kiến nghị"** — quản lý duyệt phòng mình, nhân sự thấy tất cả (theo phân quyền sẵn có); duyệt/từ chối kèm lý do. Nhân sự có nút **"Quản lý loại đề xuất"** để thêm loại mới / bật-tắt — không cần sửa code.
- Gửi/duyệt đề xuất tự sinh chuông báo (qua `gui_ngam`) cho người duyệt và người gửi.

## [1.72.0] — 2026-08-31

**Notification: chuông báo trong web + đẩy điện thoại (mọi sự kiện).** Xem mục kỹ thuật ở commit — migration 038 `thong_bao_rieng`, `gui_ngam` lưu chuông cho mọi điểm sự kiện sẵn có, chuông ở header (số chưa đọc + danh sách).

## [1.71.0] — 2026-08-31

**Đơn của tôi: tab "Tăng ca / công tác".** Bề mặt hóa các đơn `don_tu` đã có backend (làm thêm = tăng ca, công tác, thôi việc) qua form thích ứng theo loại.

## [1.70.0] — 2026-08-31

**Hướng dẫn mặc định thu gọn 1 dòng + favicon nội tuyến.** Khung "Quy trình ở trang này" mặc định thu gọn (bấm mới mở, nhớ per-trang); thêm `<link rel="icon">` SVG để hết lỗi `/favicon.ico 401` trên console.

## [1.69.0] — 2026-08-31

**Góc nhìn Cá nhân: gọt giao diện.**

- **Nút trợ lý render qua portal ra `document.body`** — không còn nằm trong khung nào của trang, nên `position:fixed` bám thẳng màn hình, không thể bị khung cha cắt trong bất kỳ hoàn cảnh nào. Đổi emoji 💬 sang **icon SVG chat** nét sạch, đồng nhất mọi thiết bị (không phụ thuộc emoji hệ điều hành).
- **Bỏ emoji trang trí** (👋 📝 📢 📚 🪪) ở hero, lối tắt, tiêu đề Thông báo/Văn bản và lời chào trợ lý cho gọn, chuyên nghiệp.
- Thêm khoảng đệm đáy trên điện thoại để nút nổi không che mục cuối.

## [1.68.0] — 2026-08-31

**Góc nhìn Cá nhân: tối ưu điện thoại.** Đa số nhân viên dùng điện thoại nên các trang cá nhân được chỉnh cho khổ nhỏ:

- Thẻ số (công, phép, thông báo, đơn) xếp **2 cột gọn** trên điện thoại thay vì 1 cột dài; lưới thẻ và lối tắt tự về 1 cột khi quá hẹp.
- Hero thu nhỏ, chống tràn chữ dài (`overflow-wrap`), khóa `max-width` chống tràn ngang.
- **Nút trợ lý (💬) tròn ở góc dưới bên phải** — sát mép hơn trên điện thoại để không che nội dung; bấm mở khung chat.

## [1.67.0] — 2026-08-31

**Góc nhìn Cá nhân — giao diện (phần 2/2).** Trải nghiệm riêng cho nhân viên, tách hẳn khỏi màn hình quản trị.

- **Dashboard cá nhân thay cho dashboard công ty.** Ở góc nhìn Cá nhân, trang Tổng quan (`/`) giờ là của **chính mình**: công tháng, phép còn lại, nghỉ lễ sắp tới, thông báo mới, đơn chờ — không còn thấy số liệu toàn công ty. Nhân viên thường (không quyền quản trị) luôn ở góc cá nhân nên **không bao giờ** thấy dashboard toàn công ty (NĐ 13/2023).
- **Tab Thông báo** 📢: đọc thông báo từ BGĐ/HR, bấm "Đã đọc & hiểu". Thông báo gắn cờ **cần giải trình** nổi đỏ, bắt nhập giải trình mới xong (mã `GT-`, gộp vào mục Khiếu nại & giải trình). Nhân sự đăng thông báo mới (mức độ, bắt buộc giải trình) và xem ai đã đọc ngay tại đây.
- **Tab Văn bản công ty** 📚: kho nội quy, biểu mẫu, chính sách — tải về; nhân sự tải lên (kiểm định dạng thật).
- **Tab Hồ sơ của tôi** 🪪: xem thông tin công việc (chỉ xem) + tự cập nhật số điện thoại/email.
- **Trợ lý dữ liệu** 💬: nút nổi góc phải, hỏi tiếng Việt về phép/công/đi muộn/nghỉ lễ/ca làm — trả lời từ dữ liệu của chính mình, không gửi ra ngoài.
- **Giao diện sống động + sáng/tối.** Các trang cá nhân dùng token màu nên tự đổi theo nút sáng/tối sẵn có; thêm hero gradient và bố cục thẻ sinh động. Menu cá nhân thêm Thông báo, Văn bản, Hồ sơ.

## [1.66.0] — 2026-08-31

**Góc nhìn Cá nhân — nền backend (phần 1/2).** Chuẩn bị cho trải nghiệm nhân viên: dashboard cá nhân, thông báo BGĐ, văn bản công ty, trợ lý dữ liệu. Phần giao diện ở bản kế tiếp.

- **Migration 037**: bảng `thong_bao` (mã `TB-`, mức độ, phạm vi toàn công ty/phòng ban, cờ `can_giai_trinh`), `thong_bao_da_doc` (xác nhận đã đọc + giải trình, mã `GT-` chỉ sinh khi có giải trình), `van_ban_cong_ty` (mã `VB-`, kho tài liệu chung). Tất cả có mã tracking như kỷ luật/khiếu nại.
- **API tự phục vụ** (`/api/toi`): `GET /tong-quan` (công tháng, phép còn, nghỉ lễ sắp tới, thông báo mới chưa đọc, đơn chờ) — chỉ dữ liệu của chính mình; `GET /ho-so` + `POST /ho-so/lien-he` (tự cập nhật SĐT/email); `GET /thong-bao` + `POST /thong-bao/:id/xac-nhan` (đã đọc + giải trình); `GET /van-ban` + `GET /van-ban/:id/tai`; `GET /tro-ly` (trợ lý dữ liệu).
- **Trợ lý dữ liệu** (`ca_nhan/tro_ly.ts`): trả lời từ chính dữ liệu nhân viên (phép, công, đi muộn, nghỉ lễ, ca làm, đơn chờ) — không gửi dữ liệu ra ngoài, không phí (NĐ 13/2023). Chừa sẵn chỗ cắm LLM (`hoi_llm`) để nâng cấp sau khi có khóa API.
- **API quản trị** (`/api`, chỉ nhân sự): tạo/gỡ thông báo, xem ai đã đọc, liệt kê giải trình (nối vào muc Khiếu nại & giải trình), tải/gỡ văn bản công ty (upload có kiểm magic byte, đường lưu `_van_ban/` cấp công ty chống path traversal).

## [1.65.0] — 2026-08-31

**Sửa: máy kho (dòng kiểm soát ra vào `acc`) không kéo được danh sách user.** Máy `NYU7261300256` từ chối `DATA QUERY USERINFO` với mã `-629`: dòng `acc` (SenseFace 2A, PUSH 3.x) dùng **bộ lệnh khác** dòng chấm công `att`. Rà soát lại đúng SDK PUSH và sửa 3 điểm:

- **Lệnh đúng cho máy acc.** `POST /thiet-bi/:serial/lay-nguoi-dung` giờ gửi **cả hai** cú pháp: `DATA QUERY tablename=user,fielddesc=*,filter=*` (acc) và `DATA QUERY USERINFO` (att). Bảng không lưu loại máy nên gửi cả hai; máy tự từ chối lệnh không hiểu (`-629`) và thực thi lệnh đúng.
- **Route `/iclock/querydata` (mới).** Máy acc đẩy kết quả query **KHÔNG** vào `/iclock/cdata` như dòng att, mà vào endpoint riêng `POST /iclock/querydata?tablename=user`. Trước đây server chưa có route này → kết quả rơi vào `setNotFoundHandler` (404) và danh sách user không bao giờ về, dù lệnh chạy đúng. Đây là nguyên nhân thật khiến máy kho trả `count=0`.
- **Parser đọc thêm tên trường acc.** Dòng acc dùng `CardNo`/`Privilege` thay cho `Card`/`Pri` của dòng att; `doc_userinfo` đọc cả hai. Heuristic bắt user ở `/cdata` cũng nới để khớp `CardNo=`/`Privilege=`.

Kèm test parser cho định dạng acc. Không có migration.

## [1.64.0] — 2026-08-31

**Kéo danh sách user từ máy về + cảnh báo trùng/lệch PIN.** Giải quyết ca máy kho enroll người dưới PIN đã thuộc nhân viên khác (PIN map toàn cục) → lượt quẹt bị gán nhầm người.

- **Đối chiếu user máy ↔ hệ thống.** Trang **Cài đặt → Thiết bị** thêm nút **"Đối chiếu user"** mỗi máy: bấm **"Lấy từ máy"** để ra lệnh máy đẩy danh sách user (`DATA QUERY USERINFO`), hệ thống bắt bảng `USERINFO` (trước đây bỏ qua) lưu vào `may_nguoi_dung`, rồi so từng PIN với người giữ PIN đó trong hệ thống. Mỗi dòng gắn nhãn: **Khớp** (xanh) / **LỆCH — người khác** (đỏ, PIN thuộc người khác) / **Hệ thống chưa gán** (vàng) / **Máy không gửi tên** (xám).
- **Cảnh báo đỏ trên Trang tổng quan** khi có PIN lệch/chưa gán: "⚠ N PIN trong máy bị lệch / trùng người" — dẫn thẳng tới trang Thiết bị để xử lý.
- Chống trùng khi gán PIN vốn đã được đảm bảo (chỉ mục duy nhất trên `ma_dinh_danh`); phần mới lo phát hiện ca **máy tự enroll trùng** mà việc gán trong hệ thống không kiểm được.

Migration 036 (`may_nguoi_dung`). Backend: parser `doc_userinfo`, thu nhận USERINFO/OPERLOG-user trong bộ tiếp nhận ADMS, `POST /thiet-bi/:serial/lay-nguoi-dung`, `GET /thiet-bi/:serial/nguoi-dung` (đối chiếu), đếm `pin_lech` cho dashboard. Lưu ý: lệnh kéo user cần kiểm chứng cú pháp trên máy thật (SenseFace 2A) — bộ nhận đã bắt sẵn nên máy đẩy kiểu nào cũng lưu được.

## [1.63.0] — 2026-08-31

**Trang tổng quan: bấm ô số ra danh sách + biểu đồ hiện số khi rê chuột.**

- **Bấm ô số → danh sách chi tiết.** Các ô ở "Toàn công ty — hôm nay" (và ở góc nhìn Phòng) giờ **bấm được** — có dấu ›: **Tổng nhân viên, Có mặt, Đi muộn, Vắng, Nghỉ phép, Chưa quẹt ra**. Bấm mở hộp thoại liệt kê đúng nhóm người đó (mã NV, họ tên, phòng ban, trạng thái, giờ vào/ra, số phút muộn), bấm tên để mở hồ sơ. Danh sách lọc theo quyền như bảng công (nhân sự thấy hết, trưởng phòng thấy phòng mình). API mới `GET /dashboard/danh-sach?loai=&ngay=`.
- **Biểu đồ 7 ngày: rê chuột (hoặc focus bàn phím) vào một cột → hiện mạch chú thích** với số lượng từng phần: Đúng giờ / Đi muộn / Vắng / OT. Trước đây chỉ có tooltip mặc định của trình duyệt (chậm, khó thấy).

## [1.62.0] — 2026-08-31

**Admin cấp quyền cho trưởng phòng XEM màn hình quản trị (chỉ xem).** Trong Cài đặt → Tài khoản, admin có nút **"Cấp quyền xem QT" / "Thu quyền xem QT"** cho mỗi trưởng phòng (kèm nhãn *"được xem quản trị"*). Trưởng phòng được cấp quyền có thể chuyển sang góc nhìn Quản trị và xem **Kỷ luật & vi phạm & khiếu nại, Nhân viên, Bảng công** — nhưng **chỉ xem, không thao tác**, và dữ liệu luôn **giới hạn trong phòng của họ** (không thấy toàn công ty; ẩn Lương, Ra/vào, Cài đặt). Mọi màn hình đó hiện băng *"chế độ chỉ xem"*, ẩn các nút quét/duyệt/bãi bỏ/miễn/ghi.

Ranh giới bảo mật đặt ở **máy chủ**: mọi thao tác (POST/PATCH/DELETE) vẫn do guard `can_nhan_su`/`can_admin` chặn — trưởng phòng được cấp quyền bị chặn ở tầng API dù giao diện có lỡ hiện nút. Chỉ Admin và Nhân sự (gồm Trưởng phòng nhân sự) được thao tác. Migration 035 (`quyen_quan_tri` + cột truy vết ai cấp/khi nào); endpoint `PATCH /nguoi-dung/:id/quyen-quan-tri` (chỉ admin, chỉ áp cho vai trò trưởng phòng); cờ trả trong đăng nhập + `/toi` để webapp nhận sau khi làm mới phiên.

## [1.61.0] — 2026-08-31

**Miễn kỷ luật + Khiếu nại + mã tracking.** Ba nghiệp vụ mới trong "Kỷ luật & vi phạm":

- **Miễn kỷ luật (chỉ Admin).** Admin đổi thủ công một hồ sơ hoặc **đồng loạt** (chọn nhiều dòng) từ *Đã áp dụng / Chờ duyệt / Đã nhắc / Mới* sang **Miễn kỷ luật** — khoản giảm thưởng P3 tự **gỡ khỏi lương** (qua chính sách phụ cấp), hồ sơ vẫn được lưu để theo dõi. Khác "bãi bỏ" (bãi bỏ = quyết định sai/rút lại); miễn = công ty khoan hồng, quyết định vẫn đúng. Bổ sung nút "Miễn kỷ luật hàng loạt" trên thanh chọn và nút miễn từng hồ sơ trong hộp thoại.
- **Khiếu nại & giải trình.** Người lao động khiếu nại một quyết định kỷ luật (BLLĐ Điều 131) hoặc giải trình vi phạm ngay trong app (tab **Kỷ luật & khiếu nại** ở "Đơn của tôi"). Hồ sơ kỷ luật đang có khiếu nại chưa xử lý sẽ **đổi màu + hiện chấm đỏ "● N khiếu nại"** trên dòng đó. Thêm **tab Khiếu nại** để nhân sự/admin tiếp nhận, chấp nhận (Admin có thể "chấp nhận & miễn luôn"), hoặc từ chối kèm phản hồi.
- **Mã tracking.** Mỗi hồ sơ kỷ luật có mã **KL-NNNNNN**, mỗi khiếu nại có mã **KN-NNNNNN** (sinh tự động, không đổi khi quét lại) để tra cứu và theo dõi.

Migration 034 (trạng thái `mien`, cột `ma`/`ly_do_mien`, bảng `khieu_nai`, sequence + trigger sinh mã). API: `POST /ky-luat/mien` (bulk, admin), `GET /khieu-nai` + `POST /khieu-nai/:id/xu-ly` (quản lý), `GET /toi/ky-luat` + `GET|POST /toi/khieu-nai` (người lao động).

## [1.60.0] — 2026-08-31

**Nút chuyển góc nhìn Quản trị ⇄ Cá nhân (web).** Người có quyền quản trị (nhân sự, và trưởng phòng được admin cấp quyền) giờ có nút ở chân thanh bên để chuyển giữa **Quản trị** (thấy đủ menu theo quyền) và **Cá nhân** (chỉ Tổng quan, Đơn của tôi, Duyệt đơn — bản chất admin/nhân sự cũng là người lao động, cũng xin nghỉ như nhân viên thường). Người không có quyền quản trị luôn ở góc nhìn Cá nhân. Mục "Nghỉ phép" đổi tên **"Duyệt đơn"** và mở cho người duyệt (gồm trưởng phòng duyệt đơn của phòng mình). Chuẩn bị sẵn `quyen_quan_tri` để bước sau admin cấp quyền xem màn hình quản trị cho trưởng phòng.

## [1.59.0] — 2026-08-31

**Trang "Đơn của tôi" cho nhân viên tự nộp đơn (web).** Trước chỉ có trên app điện thoại; giờ nhân viên đăng nhập web cũng tự phục vụ được. Ba tab: **Nghỉ phép** (các loại: phép năm, không lương, ốm, thai sản, kết hôn, hiếu; nửa ngày; hủy khi còn chờ duyệt), **Giải trình chấm công** (quên quẹt — đề xuất giờ vào/ra), **Vi phạm của tôi** (xem vi phạm ghi nhận với mình và gửi giải trình — quyền tự bào chữa BLLĐ Điều 122). Dùng lại API /api/toi/* sẵn có, theo dõi trạng thái duyệt ngay tại trang.

## [1.58.2] — 2026-08-31

**Bảng lương chi tiết mở TOÀN MÀN HÌNH (không còn popup).** Trước là hộp thoại nên bảng nhiều cột bị bó/cắt; giờ mở thành trang phủ kín màn hình, dùng hết chiều rộng — thấy đủ mọi cột (kể cả BHXH+YT+TN, thuế TNCN, khoản trừ, thực lĩnh) một lần, có nút "← Quay lại". (BHXH vốn đã được tính trong bảng, trước bị popup che.)

## [1.58.1] — 2026-08-31

**Gộp tab: Kỷ luật & Vi phạm chung 1 tab; Lương & Phụ cấp chung 1 tab.** Mỗi menu giờ có hai tab con — bớt mục ngoài thanh bên, gom việc liên quan lại một chỗ. Vi phạm (danh mục nội quy, từng bản ghi, biên bản) nằm cạnh Kỷ luật (tổng hợp + tự động); Phụ cấp (chính sách từng người) nằm cạnh Bảng lương.

## [1.58.0] — 2026-08-31

**Phạt đi muộn tự động + quét kỷ luật hằng ngày + form email.**

- **Phạt theo từng lần** (cột `tinh_moi_lan` trên loại vi phạm): đi muộn (NQ-A01) giảm thưởng
  **50.000đ mỗi lần** (Điều 14 Nội quy, Điều 104 BLLĐ — giảm thưởng P3, không phải phạt tiền).
  Số tiền = 50.000 × số lần đi muộn trong tháng. Quy tắc phát hiện đi muộn đã bật; khoản dưới
  2 triệu nên hệ thống tự áp (không cần duyệt).
- **Quét kỷ luật chạy HẰNG NGÀY** (trước là hằng tháng): mỗi ngày gom lại vi phạm của tháng,
  cập nhật hồ sơ tự động (đi muộn thêm thì tiền phạt tăng), gửi email/thông báo **một lần**
  (không gửi lại), giữ nguyên hồ sơ người đã quyết. Hồ sơ vượt ngưỡng tự chuyển chờ duyệt.
- **Form email** nhắc nhở / thông báo giảm thưởng: mẫu HTML gọn (tiêu đề, bảng vi phạm, khối
  giảm thưởng, quyền giải trình theo Điều 122). Cần bật email Microsoft 365 (`MS_MAIL_NGUOI_GUI`).
- Bỏ biến `KY_LUAT_NGAY_CHAY` (không còn dùng khi quét hằng ngày).

## [1.57.3] — 2026-08-31

**Bảng lương chi tiết hiện gần toàn màn hình.** Bảng nhiều cột (công, lương theo công, OT, thưởng, phụ cấp, tổng thu nhập, BHXH, thuế, thực lĩnh…) trước bó trong hộp thoại 760px nên tràn/cắt cột, phải cuộn ngang. Thêm biến thể hộp thoại `toàn màn hình` (96% rộng, 94% cao) và áp cho bảng lương — xem đủ cột một lần.

## [1.57.2] — 2026-08-29

**Thêm nút Sửa thiết bị (đổi tên gợi nhớ / vị trí).** Trang Cài đặt → Thiết bị đã có API sửa
(`PATCH /thiet-bi/:id`) nhưng thiếu nút trên giao diện — không đổi được tên/vị trí sau khi khai
báo (vd máy chuyển từ văn phòng ra kho vẫn mang tên cũ). Thêm nút **Sửa** + hộp thoại đổi tên +
vị trí; serial hiện chỉ đọc (là khóa máy tự nhận diện, không đổi).

## [1.57.1] — 2026-08-29

**Tinh chỉnh giao diện: font, khoảng cách, chữ chú thích.**

- **Đổi font web sang Be Vietnam Pro** (thay Inter). Font sans thiết kế riêng cho tiếng Việt —
  dấu cân, mềm hơn Inter, bớt cứng/đơn điệu; vẫn chuyên nghiệp. Dùng chung font với app điện
  thoại nên thương hiệu nhất quán. Tự chứa trong repo (subset từ bản chính thức SIL OFL 1.1 sang
  woff2, ~150 KB cho 4 độ đậm), không gọi Google Fonts. Web và mobile vẫn là hai theme riêng
  (khác màu chính + bo góc).
- **Nhịp khoảng cách chuẩn** trong hộp thoại + thẻ: tiêu đề phụ, nhãn, ô nhập, đoạn mô tả, hàng
  nút không còn dính vào nhau hay cách xa bất hợp lý. Style lại `blockquote`.
- **Chữ chú thích in nhỏ hơn và mờ hơn** chữ chính (mô tả, phụ đề, ghi chú) — dễ phân biệt nội
  dung chính với ghi chú. Vẫn đạt WCAG AA.

## [1.57.0] — 2026-08-29

**Xử lý kỷ luật tự động: gom vi phạm theo tháng & mức độ → hồ sơ kỷ luật → nhắc nhở / giảm thưởng.**

Thêm quy trình tự động gom tất cả vi phạm của một người trong một kỳ theo **từng mức độ** thành
**một hồ sơ kỷ luật** (`ho_so_ky_luat`), rồi tự xử lý:

- **Tổng tiền = 0** → **nhắc nhở** (gửi email Microsoft 365 + thông báo app), lưu hồ sơ.
- **0 < tổng tiền < ngưỡng** (mặc định 2.000.000đ) → **tự áp giảm thưởng P3**, báo người lao động.
- **tổng tiền ≥ ngưỡng** → **chờ duyệt**: báo người có thẩm quyền, phải duyệt mới áp.

Chế tài tài chính là **giảm thưởng P3** (Điều 104 BLLĐ, Điều 14 Nội quy) — **không phải phạt tiền,
không trừ lương cơ bản** (Điều 127 CẤM). Số tiền áp qua khoản lương `tru_giam_thuong_kl` bằng cơ chế
`chinh_sach_phu_cap` (tính lương đọc được, sống qua mỗi lần tính lại). Kỷ luật lao động chính thức
(khiển trách trở lên) **vẫn không tự động** — phải qua họp + giải trình + biên bản (Điều 122/124),
làm ở tab Vi phạm.

- Di trú `032_ho_so_ky_luat.sql`: cột `muc_tru_tien` (mức giảm thưởng HR khai theo Quy chế thưởng)
  trên `loai_vi_pham`; bảng `ho_so_ky_luat` (khoá `nhan_vien_id + ky + muc_do`); khoản
  `tru_giam_thuong_kl`; thêm quy tắc phát hiện (đi muộn, về sớm, vắng, quên quẹt — tất tắt sẵn,
  đối chiếu Nội quy rồi mới bật).
- Engine `src/ky_luat/xu_ly.ts` (gom + tự xử lý, hàm thuần kiểm được), route `src/tuyen/ky_luat.ts`
  (danh sách, tổng quan, quét, duyệt, bãi bỏ), việc chạy định kỳ hằng tháng trong `lich_chay.ts`.
- Tab **Kỷ luật** trên web: tổng quan, danh sách hồ sơ, nút quét & xử lý, hộp thoại duyệt/bãi bỏ.
- Biến môi trường mới: `KY_LUAT_NGUONG_DUYET`, `KY_LUAT_NGAY_CHAY`.

## [1.56.4] — 2026-08-29

**cap_nhat_phong_ban: tên phòng đầy đủ (không viết tắt) + mở sẵn phòng kho/lái xe.** Ánh xạ mã trong file sang tên đầy đủ: KD→Phòng Kinh doanh, KS→Phòng Kiểm soát, CSKH→Phòng Chăm sóc khách hàng, MKT→Phòng Marketing, XNK→Phòng Xuất nhập khẩu, IT→Phòng Công nghệ thông tin, KT→Phòng Kế toán, HCNS→Phòng Hành chính nhân sự. Sheet kho Trung Quốc gộp về Phòng Kho Trung Quốc; Quản lý kho/Bốc xếp→Phòng Kho Hà Nội; Lái xe→Phòng Lái xe. Luôn tạo sẵn ba phòng Kho Trung Quốc/Kho Hà Nội/Lái xe.

## [1.56.3] — 2026-08-29

**Lệnh cập nhật phòng ban + chức danh từ file danh sách nhân sự.**

`npm run cap_nhat_phong_ban -- <file.xlsx> [--that]` — đọc file lúc chạy (KHÔNG nhét dữ liệu cá
nhân vào mã nguồn, NĐ 13/2023), khớp theo họ tên (chuẩn hoá bỏ dấu + so tập từ để chịu lệch chữ
đệm / đảo thứ tự), rồi cập nhật `nhan_vien.phong_ban_id` (tạo `phong_ban` nếu chưa có) và
`nhan_vien.chuc_danh`. Mặc định chạy thử: in ai sẽ đổi gì, phòng ban nào sẽ tạo, tên nào không
khớp / nhập nhằng; thêm `--that` để ghi. Chỉ động tới phòng ban + chức danh — không đụng công,
lương, PIN. Cảnh báo đọc file che số CCCD/SĐT (chỉ hiện 4 số cuối).

## [1.56.2] — 2026-08-29

**Sửa dải chỉ số trong hộp thoại bị răng cưa.** Các ô `.ho-so-chi-so` là `.o-so` (có viền + bo
góc riêng), lọt vào dải nên khi nội dung một ô dài (vd tên loại vi phạm 3 dòng) các ô cao thấp
khác nhau thành những hộp bo góc đáy răng cưa. Reset viền/bo góc của ô con, cho các ô bằng chiều
cao (`align-items: stretch`), đóng viền trên–dưới của dải → dải liền mạch kiểu Metronic. Ảnh
hưởng mọi hộp thoại dùng dải chỉ số (Vi phạm, Ra/vào, hồ sơ).

## [1.56.1] — 2026-08-29

**Sửa trình bày + đối chiếu Metronic 9, kiểm bằng render thật (desktop + điện thoại 390px).**

- **Header hộp thoại (`.hop-thoai > .dau-trang`)**: nút đóng ✕ bị rớt xuống dòng dưới trên màn
  hẹp (do `.dau-trang` có `flex-wrap` vốn cho header trang). Ghim ✕ ở góc trên-phải, tiêu đề
  dài thì tự xuống dòng.
- **`.ho-so-chi-so` trên màn hẹp (≤520px)**: xếp 1 cột thay vì lưới auto-fit để lẻ ô (trước đây
  để một ô trống lửng lơ khi có 3 chỉ số).
- **Bo góc thẻ (`.the`, `.o-so`) → 12px** (radius-xl) khớp Metronic 9 (ReUI: thẻ dùng
  `--radius + 4px`); ô nhập/nút giữ 6–8px. Token màu (blue-500, zinc, đỏ) vốn đã khớp Metronic.

## [1.56.0] — 2026-08-29

**Tab "Ra/vào" riêng + quy trình xử lý cảnh báo: tự nhắc nhở (email) / tự chuyển kỷ luật theo
tần suất, nhân sự xem lại và xử lý. Dashboard chuyển sang góc nhìn điểm nóng.**

### Di trú 031 — bảng `xu_ly_ra_vao`

Lưu lịch sử xử lý mỗi cảnh báo, snapshot `(nhan_vien_id, ngay, ma_loi)` (vì `canh_bao_ra_vao`
bị ghi đè mỗi lần tính lại): `trang_thai` (da_nhac / chuyen_ky_luat / hop_le / bo_qua),
`tu_dong`, `da_gui_email`, `vi_pham_id`, `nguoi_xu_ly`, `so_lan_thang`. Bật lại loại vi phạm
`QUEN_QUET` làm loại kỷ luật cho ra/vào (căn cứ điều nội quy + chế tài).

### Gửi email qua Microsoft 365 Graph — `su_kien/gui_email.ts`

Hệ thống chưa có SMTP; thêm bộ gửi mail qua Graph `sendMail` (app-only, cần quyền `Mail.Send` +
`MS_MAIL_NGUOI_GUI`). Fail-soft: chưa cấu hình / Graph từ chối thì trả false, nhắc nhở vẫn còn
đường thông báo đẩy trong app. Env mới: `MS_MAIL_*`, `RA_VAO_NGUONG_KY_LUAT`.

### Quy trình xử lý tự động — `ra_vao/xu_ly.ts` + job trong `lich_chay.ts`

Cùng một lỗi trong tháng: **dưới ngưỡng → nhắc nhở** (email + thông báo app); **từ ngưỡng
(mặc định 3) → chuyển kỷ luật** (tạo hồ sơ `vi_pham` trạng thái 'moi' để nhân sự đối chiếu điều
nội quy + mức xử phạt + lập biên bản theo BLLĐ Điều 122/124 — không phạt tiền). Job đêm tự quét
cảnh báo hôm qua và xử lý cái chưa xử lý; nhân sự ép tay được (hợp lệ / bỏ qua / nhắc / kỷ luật).

### Tab Ra/vào + Dashboard điểm nóng — `web`

Trang `/ra-vao` (chỉ nhân sự): lọc theo ngày + trạng thái, bảng cảnh báo dịch danh, hộp thoại
**xử lý** (nhắc nhở / kỷ luật / hợp lệ / bỏ qua + ghi chú). Dashboard bỏ bảng chi tiết ra/vào,
thay bằng khối **"Điểm nóng ra/vào"**: cảnh báo trong tháng, chưa xử lý, top người bị cảnh báo
nhiều nhất, link sang tab. Bố cục nhiều cột responsive (điện thoại → 2K).

## [1.55.0] — 2026-08-28

**Làm lại Dashboard nhân sự: lấy tình hình ra/vào văn phòng làm trọng tâm, bố cục nhiều cột
dùng hết chiều ngang màn hình lớn (2K).**

### Lớp `ra_vao` cho `/api/dashboard` (chỉ nhân sự)

Mở rộng payload `dashboard_cho` thêm lớp `ra_vao` — gated `la_vai_tro_nhan_su` như các lớp
`cong_ty`/`nhan_su`, dữ liệu **không lấy** cho vai trò không được phép (chặn rò rỉ ở tầng máy
chủ, không phải ẩn ở giao diện). Đọc từ `ra_vao_ngay` + `canh_bao_ra_vao` (v1.54.0 đã ghi) +
`bang_cong_ngay`: đang trong văn phòng, về sớm, tổng phút ra ngoài, số người ra ngoài, đếm cảnh
báo theo loại, danh sách cảnh báo dịch danh (join phòng ban) và top ra ngoài nhiều nhất.

### Bố cục bảng điều khiển cho màn 2K — `dashboard.tsx`

Với người xem là nhân sự, trang chuyển sang bố cục `bang-dieu-khien`: hàng tổng quan (gộp chấm
công + ra/vào), **khối cảnh báo ra/vào** làm trọng tâm (bảng dịch danh, nhãn mức độ, liên kết
tới hồ sơ), rồi hai cột "ra ngoài nhiều nhất | đi muộn" và "biểu đồ 7 ngày | chờ duyệt", cuối
cùng là việc nhân sự / hệ thống / của tôi. Vùng nội dung nới rộng tới 2040px **chỉ cho trang
này** (`.noi-dung:has(> .bang-dieu-khien)`) — các trang khác vẫn giới hạn 1280px cho dễ đọc.
Vai trò nhân viên / trưởng phòng giữ bố cục xếp dọc như cũ.

## [1.54.0] — 2026-08-28

**Giai đoạn 2: sửa chiều hai cổng (tên đặt ngược), lọc bấm-đúp, và nối suy luận ra/vào vào
`tinh_lai_ngay` — GHI đo lường + cảnh báo, KHÔNG trừ công (Phương án A).**

### Chẩn đoán thực địa: tên máy bị đảo

Chạy `trien_khai/kiem_chieu_ra_vao{,_2}.sql` trên dữ liệu thật:

- Hai đầu đọc **có tính chiều thật** — khoảng cách giữa hai lần quẹt khác máy trải đều (43,6%
  trên 30 phút), không dồn ở "dưới 1 phút" ⇒ không phải đi qua cả hai trong một bước chân.
- **Tên máy bị ĐẢO:** 83,5% ngày-người có lần quẹt đầu ngày ở máy tên "Cổng ra" — người ta đi
  làm buổi sáng bằng cách quẹt "Cổng ra". Chủ công ty xác nhận trực tiếp.
- **Bấm-đúp nhiều:** 7.743 cặp cùng máy cách nhau ≤ 3 giây. Sau khi lọc (cửa sổ 120 giây), tỉ lệ
  cùng-máy-liên-tiếp tụt từ 47% còn **21,4%** (< ngưỡng 30% của kế hoạch), và 83,5% ngày đọc
  thành "vào…ra" lành mạnh.

### Khai chiều theo serial, không theo tên — di trú `030_chieu_ra_vao.sql`

Thêm cột `thiet_bi.chieu` (`vao`/`ra`/`hai_chieu`, mặc định `hai_chieu`). **Không** suy chiều từ
tên máy (tên có thể đặt ngược); gán thẳng theo serial: `8116254600440` → `vao`,
`8116254600435` → `ra`. Thêm hai bảng `ra_vao_ngay` (đo lường một ngày-người) và
`canh_bao_ra_vao` (cảnh báo mâu thuẫn cho dashboard HR).

### Lọc bấm-đúp — `ra_vao.ts` thêm `loc_bam_dup`

Bỏ lần quẹt nếu lần liền trước **cùng máy** và trong 120 giây — chỉ gộp cùng máy, ra rồi vào lại
(khác máy) trong vài giây là thật, giữ nguyên. Nhân bản đúng phép `lag()` đã kiểm chứng trong SQL.

### Nối vào `tinh_lai_ngay` — chỉ ĐO, không trừ công

Sau khi ghi `bang_cong_ngay`, tính song song ra/vào và ghi `ra_vao_ngay` + `canh_bao_ra_vao`.
Tách khỏi giao dịch tính công và bọc `try/catch` — một lỗi ở đây **không được** làm hỏng bảng
công đã ghi. `phut_ra_ngoai` chỉ để đo, **không** trừ vào `phut_lam`/`so_cong`. Kèm 6 kiểm thử
`loc_bam_dup` và một khẳng định e2e (ngày sạch → có `ra_vao_ngay`, 0 cảnh báo).

## [1.53.0] — 2026-08-28

**Giai đoạn 1 của kế hoạch bổ sung: hai hàm thuần suy ra CHIỀU (vào/ra) và chạy máy trạng
thái RA/VÀO văn phòng cho một ngày. Chưa nối vào bảng công — chỉ đo, chưa trừ.**

### Suy ra chiều một lần quẹt — `may_chu/src/cong/chieu_quet.ts`

`chieu_quet(chieu_may, status, chi_co_status_0)` trả `'vao' | 'ra' | 'khong_ro'`. Ưu tiên chiều
KHAI SẴN của máy (máy đặt ở cổng vào thì mọi lần quẹt là `'vao'`) vì đó là vật lý, tin hơn
firmware. Máy khai `'hai_chieu'` mới đọc mã Status ATTLOG. **Bẫy ZKTeco:** rất nhiều máy chạy mặc
định luôn đẩy Status = 0; nếu cả máy chỉ thấy Status 0 thì Status vô nghĩa → trả `'khong_ro'` chứ
không coi là `'vao'`, tránh việc cả công ty "vào khi đang trong" mỗi buổi chiều.

### Máy trạng thái ra/vào một ngày — `may_chu/src/cong/ra_vao.ts`

`suy_luan_ra_vao(quet, ngay, ca)` trả về: `gio_den` (lần quẹt đầu, bất kể chiều), `gio_ra_ve`
(lần quẹt kết thúc ngày), danh sách `phien_ra_ngoai` + tổng `phut_ra_ngoai` (đã trừ phần trùm giờ
nghỉ trưa), `con_trong_van_phong`, và `loi[]` các mâu thuẫn logic: `QUEN_QUET_VAO`,
`QUEN_QUET_RA`, `VAO_KHI_DANG_TRONG`, `RA_KHI_DANG_NGOAI`, `CHI_MOT_LAN_QUET`.

Theo mục 1.2b kế hoạch: **trạng thái chỉ đổi khi có log** — ở lại trong văn phòng buổi trưa không
sinh sự kiện, không cảnh báo; chỉ log MÂU THUẪN mới là cảnh báo. **Không đoán giờ còn thiếu:** biết
có lần không quẹt nhưng không biết mấy giờ → chỉ ghi lỗi, không cộng/trừ phút. Lần quẹt chiều
`'khong_ro'` (máy Status-0) thì ĐẢO trạng thái, KHÔNG bắt lỗi mâu thuẫn (vì chiều là suy đoán).

Kèm 17 kiểm thử thuần (`may_chu/test/ra_vao.test.ts`), không chạm CSDL.

### Chốt năm quyết định chính sách (mục 7 kế hoạch)

Chủ công ty chốt 28.08.2026: (1) phút ra ngoài **chỉ đo, không trừ công**; (2) đơn nộp sau hạn
**tự từ chối** — trừ loại cần chứng từ (ốm, thai sản, kết hôn, hiếu) vẫn chuyển người; (3) nghỉ
**≥ 3 ngày làm việc** thì người duyệt xem; (4) hạn nộp = **giờ vào ca − 30 phút** (không hard-code
07:30); (5) nghỉ nửa ngày chiều vẫn dùng chung hạn ở (4).

## [1.52.0] — 2026-08-28

**OT chỉ tính khi có đơn làm thêm đã duyệt. Và hai script đưa dữ liệu thật lên hệ thống:
khai PIN máy chấm công từ sổ HSNS, gán ca làm việc cho toàn công ty.**

### Sửa: hệ thống tự sinh nghĩa vụ trả tiền làm thêm

`quy_tac_tinh_cong.ts` suy ra OT từ **giờ quẹt**: ở lại quá `nguong_ot_phut` (mặc định 30) sau
giờ tan ca thì toàn bộ phần dôi ra thành OT, và cả ngày lễ / ngày nghỉ tuần / ngày đang nghỉ
phép thì **mọi phút có mặt** thành OT.

Máy chấm công đặt ở cổng toà nhà, nên lần quẹt cuối cùng trong ngày là **lúc rời toà nhà**, chứ
không phải lúc ngừng làm việc. Trên dữ liệu thật: giờ ra trung vị của công ty là 17:45 với ca tan
17:30 — nghĩa là gần như **mỗi người, mỗi ngày** đều vượt ngưỡng 30 phút ở một số ngày; cá biệt có
ngày quẹt lúc 19:23, tức 113 phút OT sinh ra từ một người đi ăn tối rồi mới về.

Không ai đăng ký, không ai duyệt, nhưng bảng công đã ghi thành số giờ phải trả.

Nay OT là **giao của hai thứ**: khoảng thời gian thực sự có mặt, và khoảng ghi trong đơn
`lam_them` đã ở trạng thái `da_duyet` của đúng người đúng ngày. Nhiều đơn trong một ngày thì
**gộp khoảng trước khi cộng**, nên hai đơn chồng nhau không tính tiền hai lần. Giờ nghỉ trưa bị
trừ khỏi phần OT nằm vắt qua nó — một đơn 11:00–14:00 ra 90 phút chứ không phải 180.

Bốn nhánh sinh OT (ngày lễ, ngày nghỉ tuần, ngày nghỉ phép, sau giờ tan ca) đều đi qua cùng một
phép tính này. Nhánh "chưa gán ca làm việc" cũng vậy.

**Làm mà không có đơn thì không mất dấu.** Bảng công ghi chú thích ngay trên dòng đó —
*"Ở lại 113 phút sau giờ tan ca nhưng không có đơn làm thêm đã duyệt"* — để nhân sự thấy và hỏi
lại, thay vì hệ thống tự quyết hộ. Giờ công (`phut_lam`) không đổi, chỉ `phut_ot` đổi.

### Bỏ ô nhập "Ngưỡng tính OT" khỏi trang Ca làm

Nhãn cũ là *"Ngưỡng tính OT (phút sau giờ tan ca)"* — mô tả đúng cái luật vừa bị gỡ. Sau bản này
nó không điều khiển gì nữa, mà vẫn nhận số và vẫn lưu: một ô nhập nói dối với người quản trị.

Chỗ đó giờ là một dòng giải thích OT tính theo đơn. **Cột `nguong_ot_phut` trong CSDL vẫn giữ** —
không có di trú, không mất giá trị đã khai — và mỗi lần sửa ca vẫn gửi lại giá trị đang có, để
lần sửa ca không lặng lẽ ghi đè nó về 30.

Cân nhắc rồi bỏ: dùng ngưỡng ấy làm sàn cho OT đã duyệt. Một đơn 20 phút được nhân sự duyệt mà ra
0 phút OT thì không giải thích được với người lao động — ngưỡng sinh ra để lọc nhiễu cho một phép
**suy đoán**, mà đăng ký thì đã hết nhiễu. Có bài kiểm khoá hành vi này.

### Thêm: `trien_khai/khai_pin_tu_so_hsns.sql`

Khai PIN máy chấm công cho 29 người theo `ma_nv`, ghi vào `ma_dinh_danh` (có chiều thời gian) và
cột `nhan_vien.pin_may`, rồi gán lại các lần quẹt cũ đang mồ côi. Mặc định `rollback`.

Bốn hàng rào, hàng rào thứ tư đáng nói: chỉ gán lại lần quẹt **của những máy đã biết là dùng chung
một hệ đánh số PIN**. Đánh số PIN là theo từng máy, nên cùng một số trên hai máy có thể là hai
người; script khai thẳng danh sách máy dùng chung thay vì suy đoán. Lần quẹt trên máy khác được
**bỏ qua chứ không làm hỏng cả lần chạy**, để chỗ chưa biết ở lại trạng thái chưa biết.

### Thêm: `trien_khai/gan_ca_lam_viec.sql`

Gán ca cho toàn bộ nhân viên đang hoạt động, khai khung giờ riêng cho **sáng thứ Bảy**
(08:00–12:00), và hạ `phut_du_cong` từ 480 xuống 420.

**Vì sao 480 là sai:** ca 08:00–17:30 nghỉ 12:00–13:30 cho tối đa **đúng 480 phút** làm việc. Đặt
ngưỡng đủ công bằng 480 nghĩa là chỉ ai vào đúng 08:00:00 và ra đúng 17:30 mới đủ một công; vào
lúc 08:06 là 474 phút và ra **nửa công**. Dung sai đi muộn không cứu được: nó chỉ trừ vào cột
`phut_muon`, còn `phut_lam` vẫn kẹp theo giờ quẹt thật. Giờ vào trung vị của công ty là 08:05:50.

Mô phỏng trên 2.025 ngày-người quẹt thật:

| Ngưỡng | Đủ 1 công | Nửa công | 0 công |
|---|---|---|---|
| 480 (cũ) | 22,4% | 72,1% | 5,5% |
| 420 (mới) | 86,4% | 10,4% | 3,2% |

Script **in cả hai bảng này trước khi ghi**, và có hai hàng rào dữ liệu tự dừng nếu giờ ra trung vị
thực tế lệch quá 60 phút so với giờ khai của ca — để không ai gán một ca sai cho cả công ty rồi mới
biết.

### Kiểm thử

`test/tinh_cong.test.ts`: **51 bài, xanh hết**, chạy trên bản sao sạch bằng Node 22. Sáu bài cũ
phải sửa vì chúng mã hoá đúng cái giả định vừa bị gỡ (chúng khẳng định ở lại quá ngưỡng thì thành
OT); 11 bài mới, trong đó:

| Bài | Khoá điều gì |
|---|---|
| Ở lại 90 phút, không có đơn | `phut_ot = 0` **và** có chú thích |
| Đơn 20 phút được duyệt | vẫn tính đủ 20 — ngưỡng không còn chặn |
| Đơn 11:00–14:00 | ra 90 phút, không phải 180 (trừ nghỉ trưa) |
| Hai đơn chồng nhau | gộp khoảng, không cộng hai lần |
| Đơn dài hơn giờ có mặt | chỉ tính phần thực sự có mặt |
| Ngày lễ / nghỉ tuần / nghỉ phép, không đơn | `phut_ot = 0` |

`thiet_ke/*.test.mjs`: **30 bài, xanh hết** sau khi bỏ ô nhập ngưỡng OT.

Toàn bộ: **584 + 5** đơn vị, **418** e2e, **30** thiết kế — tất cả xanh. `tsc` sạch ở cả `may_chu`
và `web`.

**Hai bài e2e đỏ vì đúng lý do**, và cả hai đều mã hoá luật cũ:

- *"máy đẩy ATTLOG → tính luôn bảng công"* khẳng định ra 18:05 thì sinh 65 phút OT.
- *"thêm ngày lễ"* khẳng định đi làm ngày lễ thì **toàn bộ 517 phút** có mặt thành OT.

Cả hai nay khẳng định `phut_ot = 0` **kèm ghi chú**, đúng như luật mới.

**Một bài e2e mới** đi hết đường sinh OT qua CSDL thật: chèn một đơn `lam_them` đã duyệt
17:00–18:00, tính lại, và OT ra đúng 60 phút — phần giao với giờ có mặt — trong khi `phut_lam`
không đổi. Bài này phủ câu `select don_tu` ở `tinh_cong.ts`, thứ mà bài kiểm đơn vị (chạy trên dữ
liệu dựng sẵn) không chạm tới. **Đã chứng minh nó bắt được lỗi thật**: đổi `da_duyet` thành
`cho_duyet` trong câu truy vấn đó làm bài này đỏ.

Ghi lại một chỗ tôi đã kết luận sai giữa chừng: 12 bài báo đỏ lúc đầu, tôi ghi nguyên nhân là
thiếu gói `pg` / `@fastify/swagger`. Nguyên nhân thật là **chưa đặt biến môi trường**
(`JWT_SECRET`, `DATABASE_URL`…) — `cau_hinh.ts` dừng ngay lúc nạp module. Không có gói nào thiếu.

## [1.51.0] — 2026-08-22

**PIN máy chấm công có chiều thời gian ở cả hai đường tra. Hai lỗi lương tiềm ẩn, tìm ra khi đọc
`LIEN-THONG-NHAN-SU.md` của đội cổng.**

Đội cổng chỉ đúng bệnh: cột phẳng `nhan_vien.pin_may` không trả lời được *"PIN 042 tháng 6 là
ai"*. Thuốc thì khác — chiều thời gian đã có sẵn từ di trú 025 (`ma_dinh_danh` với `hieu_luc_tu` /
`hieu_luc_den`), nên thêm một bảng nữa là để một PIN ở ba chỗ. Vấn đề thật là **hai phép tra đang
bỏ qua chiều thời gian đó**, và cả hai đều là lỗi thật:

### Sửa: bộ tiếp nhận ADMS tra "ai giữ PIN hôm nay"

`adms/tiep_nhan.ts` lọc `md.hieu_luc_den is null`. Với lô đến đúng lúc thì không sai. Với lô đến
**muộn** — máy mất mạng vài ngày (có hẳn bộ theo dõi máy offline chính vì thế), hoặc nạp lại dữ
liệu cũ từ máy — nó gán lần quẹt của tháng trước cho người đang giữ PIN hôm nay.

Luật tra chuyển sang module thuần `dinh_danh/tra_pin.ts`, mỗi bản ghi tra theo **mốc thời gian của
chính nó**. Bốn luật, và ba trong số đó tồn tại để **không làm mất khớp** so với trước bản này —
rõ nhất là *khoảng đầu tiên mở về phía trước*: `hieu_luc_tu` của dòng đầu là `nhan_vien.tao_luc` do
backfill 025 đặt vào, không phải một sự thật nghiệp vụ, nên tin nó là biến mọi lần quẹt nhập từ
lịch sử CSV thành "không biết là ai". Chỉ **ranh giới giữa hai dòng** mới mang nghĩa.

Câu đọc bảng cũng bỏ lọc `dang_hoat_dong`, và đó là cố ý: lần quẹt tháng 6 của người đã nghỉ tháng
7 vẫn phải gắn đúng tên họ, nếu không thì bảng công tháng 6 sai.

### Sửa: nút "Gán lại lần quẹt" không lọc theo ngày

`POST /api/lan-quet/gan-lai` giới hạn theo **máy** (đã sửa ở 1.35 vì hai máy cấp PIN riêng) nhưng
không giới hạn theo **ngày**: gán một PIN là kéo theo *mọi* lần quẹt chưa gán của PIN đó, kể cả
tháng đã chốt lương. Nặng hơn lỗi trên vì có người bấm nút và tin rằng mình gán một dòng.

Ba hàng rào, thứ tự có chủ ý:

1. Máy — như cũ. Báo trước vì đó là lỗi về **hình dạng** của yêu cầu, sửa được bằng một lần.
2. **Khoảng ngày** — mới. Để trống thì lấy đúng khoảng người đó giữ PIN theo `ma_dinh_danh`; người
   chưa từng được khai PIN đó thì **từ chối**, không đoán. Không có mặc định "tất cả": mặc định đó
   chính là chỗ lỗi này quay lại.
3. **Tháng đã có bảng lương được duyệt** thì từ chối cả lần gán, không gán một nửa.
   `/bang-cong/mo-chot` đã có luật này từ trước; đường "gán lại" đi vòng qua nó.

`GET /api/lan-quet/chua-map/thang` mới: đếm lần quẹt chưa gán **theo từng tháng**, hiện ngay trong
hộp thoại. Một con số tổng ("142 lần quẹt") không nói được rằng 22 trong số đó thuộc tháng 6.

### Điều đang che hai lỗi này lại

`lan_quet.nhan_vien_id` được giải ra **lúc tiếp nhận và lưu lại**, không tính lại khi đọc. Nên bảng
công cũ đang đóng băng và chưa lần nào ra lương sai. Lỗi tiềm ẩn, không phải lỗi đang chảy — nhưng
cả hai đường trên đều mở được nó.

### Thêm

- `trien_khai/pin_trung_khoang.sh` — dò các PIN có khoảng hiệu lực **chồng nhau**, chỉ đọc. Đây là
  điều kiện để bước sau (ràng buộc `exclude using gist` cho cả lịch sử) chạy được: di trú đó sẽ
  **thất bại** nếu còn khoảng chồng nhau, và thất bại giữa một lần triển khai là thứ không ai muốn
  gặp. Dò trước, sửa tay, rồi mới thêm ràng buộc — không gộp hai việc vào một lần chạy.
- `tai_lieu/TRA-LOI-LIEN-THONG-NHAN-SU.md` — trả lời từng mục tài liệu của đội cổng, gồm hai chỗ ý
  kiến khác (§5 ở trên, và §8: `truong_phong_nhan_su` là mức quyền thứ ba thật, vì
  `xem_duoc_tat_ca` cho vai trò này xem toàn công ty chứ không phải một phòng ban).

### Kiểm thử

14 bài đơn vị thuần cho `tra_pin` (`test/tra_pin.test.ts`) và 7 bài e2e. **Đã chứng minh bắt được
lỗi thật** bằng cách phá mã rồi chạy lại:

| Phá gì | Bài đỏ |
|---|---|
| Quay `tra_pin` về `hieu_luc_den is null` | 5 đơn vị |
| Bỏ hai điều kiện ngày khỏi câu UPDATE của `gan-lai` | 2 e2e |

Bài bắt buộc theo §9.5 của đội cổng — *PIN 042 đổi chủ 01.07, bảng công tháng 6 của người cũ phải
còn đúng* — có trong cả hai lớp. Thêm bài **"lô đến muộn 5 ngày, PIN đổi chủ ngày thứ 3"**: một lô
duy nhất phải tách cho hai người theo ngày.

Ba bài kiểm cũ phải sửa vì chúng mã hóa giả định cũ, và cả ba đều đáng ghi lại:

- *"cấp PIN cho người mới thì lần quẹt SAU thuộc người mới"* dùng mốc `HÔM QUA 17:00` cho chữ
  "sau". Với luật mới thì đó là **trước** lúc chuyển PIN, nên lần quẹt ấy thuộc người cũ — đúng.
  Bài kiểm giờ dùng mốc thật sau lúc chuyển.
- Hai bài về "gán lại" gọi thẳng vào PIN chưa khai cho ai. Giờ phải khai PIN trước, đúng như nhân
  sự làm thật.

Tổng: **572 + 5** đơn vị, **417** e2e, **30** thiết kế — tất cả xanh.

## [1.50.0] — 2026-08-22

**Vá một lỗ chuyển hướng mở trong chấm công, cùng loại với lỗ quản trị cổng vừa tìm ra ở cổng —
và ở đây hậu quả nặng hơn.**

Quản trị cổng phát hiện bản kiểm `quay_lai` trong JavaScript của trang đăng nhập thiếu phép chặn
ký tự điều khiển, xác minh trên Chromium thật: `?quay_lai=/%09/evil.com` dẫn ra
`https://evil.com/`. Cơ chế là bộ phân tích URL theo WHATWG **xoá** tab/LF/CR khi đọc URL, nên
`/<tab>/evil.com` trở thành `//evil.com` — URL tương đối giao thức, trỏ ra ngoài. Phép kiểm
`startsWith('//')` chạy trên chuỗi **chưa** xoá không bắt được gì.

Đọc xong tôi soi lại ba chỗ kiểm `quay_lai` của chấm công. Hai chỗ đủ. Chỗ thứ ba —
`GET /xac-thuc/microsoft/bat-dau` — dùng một phép kiểm **tự viết**: `/^\/[^/\\]/`. Nó đòi ký tự
thứ hai không phải `/` hay `\`, và `/<tab>/evil.com` đi qua được, vì lúc kiểm thì tab còn nằm
giữa hai dấu gạch.

**Ở đây nặng hơn một trang phishing thông thường.** Đường đó kết thúc bằng một chuyển hướng
**chở sẵn token trong phần neo**. Lọt ra ngoài tên miền là nộp cả token truy cập **và** token làm
mới cho tên miền của kẻ tấn công — nạn nhân không phải gõ gì cả. Lỗ ở cổng lấy được mật khẩu qua
một trang giả; lỗ này lấy được token trực tiếp.

Khai thác được khi `MS_GOC_WEBAPP` để trống — lúc đó `ve_webapp()` trả về đường dẫn trần và
`res.redirect('/<tab>/evil.com#token…')` thành `//evil.com#token…`. Biến đó **mặc định trống**.

### Từ chối hẳn, không "xoá rồi kiểm lại"

Lần sửa đầu tôi làm theo hướng xoá tab/LF/CR trước rồi mới kiểm `//`. Một **bài kiểm cũ trong
chính tệp đó** bắt được: `/chamcong<CR><LF>Set-Cookie: x=1` trở thành một đường dẫn "hợp lệ" —
đúng về câu hỏi *"đích có nội bộ không"*, nhưng làm mất lớp chặn chèn header, và để một khoảng
cách cho tầng gọi dùng chuỗi **gốc** thay vì chuỗi đã làm sạch.

Nên: **từ chối** mọi ký tự điều khiển. Mạnh hơn cả hai — ba vector bị chặn, lớp chèn header còn
nguyên, và chuỗi đã kiểm **luôn bằng** chuỗi được dùng.

### Ba hàng rào, và đột biến chứng minh từng cái

- **Ba vector của cổng** thành bài kiểm, ghi kèm kết quả Chromium để người sau không phải thử lại.
- **Hai bản phải đồng ý trên từng đầu vào.** Webapp và máy chủ là hai bundle nên có hai bản. Bài
  kiểm **trích thân hàm từ tệp `web/src/api.ts` rồi chạy nó** — không chép logic — và so với bản
  máy chủ trên 16 đầu vào. Đột biến làm yếu **chỉ bản web**, đúng kiểu sự cố đã xảy ra ở cổng,
  làm bài này đỏ.
- **Không route nào được tự viết phép kiểm `quay_lai`.** Quét toàn bộ `may_chu/src`. Lỗ hôm nay
  chính là một phép kiểm tự viết trông hợp lý, thiếu một thứ, và không ai đọc lại.

### Trả lời đề nghị của cổng: chọn C, và A của tôi sai

Quản trị cổng bác cả A và B, đề xuất C: giữ `?quay_lai=` trong hợp đồng, trang đăng nhập tự dọn
thanh địa chỉ bằng `sessionStorage` + `history.replaceState`.

**A không chạy được, và lý do họ nêu là đúng:** sau bước 4, lệnh chuyển hướng do Caddy phát;
trước bước 4 thì máy chủ phát 302. Không cái nào ghi được `sessionStorage`. Tôi đề xuất A mà
không xét *ai* thực sự phát lệnh chuyển hướng.

**C không cần chấm công sửa gì:** hợp đồng không đổi, phép kiểm quyết định vẫn ở máy chủ, và
không sinh thêm một bản kiểm thứ hai nào — điều đáng giá nhất sau chuyện hôm nay.

## [1.49.1] — 2026-08-22

**`?quay_lai=/chamcong/` thay vì `?quay_lai=%2Fchamcong%2F`.** `encodeURIComponent` mã hoá cả
dấu `/`, nên trên thanh địa chỉ người dùng đọc thấy một chuỗi rác. Dấu `/` là ký tự hợp lệ
trong giá trị của chuỗi truy vấn nên giữ nguyên nó vừa đúng vừa đọc được.

Vẫn mã hoá mọi ký tự khác, và đó không phải làm đẹp: một đường dẫn chứa `&` hay `#` mà không mã
hoá sẽ làm cổng đọc nhầm tham số — hoặc cắt mất phần sau của đường dẫn.

## [1.49.0] — 2026-08-22

**Trình duyệt buộc đi qua cổng; app điện thoại tạm giữ đường cũ.** Yêu cầu là *vào `/chamcong`
mà chưa đăng nhập thì bắt buộc về cổng, không có luồng đăng nhập riêng*. Bản 1.48.0 đã làm được
điều đó, nhưng bật nó lên là **app điện thoại chết cho toàn bộ nhân viên**: app đăng nhập bằng
mật khẩu, giữ token làm mới 30 ngày, và chưa có đường đi qua cổng.

Nên đường mật khẩu giờ bị chặn **theo phía gọi**: trình duyệt bị chặn, app native thì chưa.

### Phân biệt bằng thứ trang web không giả được

`Origin` do trình duyệt tự đặt trên mọi POST, `Sec-Fetch-*` trên mọi request, và **mã
JavaScript trong trang không xoá được chúng**. `fetch` của React Native không gửi header nào
trong số đó. Nên "không còn form đăng nhập nào chạy được trong trình duyệt" là một điều **có thể
buộc**, không chỉ là một lời hứa — một trang web không thể tự khai mình là app để đi cửa sau.

Chỉ cần **một** trong ba header là đủ để chặn, không đòi cả ba: bài kiểm thử từng cái một.

**Nói thẳng: đây không phải ranh giới bảo mật.** `curl` không gửi `Origin` nên đi được đường app.
Nó là ranh giới **trải nghiệm**, và nó đạt đúng cái đích của bước 3 — không nhân viên nào còn
được dạy gõ mật khẩu công ty vào một trang không phải cổng.

### Để nó không thành vĩnh viễn

Một cửa vào không MFA chưa đóng mà không ai nhìn thấy thì nó ở đó mãi. Hai thứ chống điều đó:

- `GET /health` trả `dang_nhap`: `rieng` · `cong+rieng` · **`cong+app_tam`**. Trạng thái chuyển
  tiếp hiện ngay trên cùng cái màn hình người ta xem mỗi lần cập nhật.
- Máy chủ ghi một dòng cảnh báo **mỗi lần** đường app tạm được dùng, để biết con số đó đã về 0
  chưa trước khi xoá hẳn — chứ không phải đoán.

Chú thích của `chan_cua_cu_web()` ghi rõ ba việc phải làm khi app có đường mới: xoá hàm đó, đổi
các chỗ gọi sang `chan_cua_cu()`, xoá `cong+app_tam` khỏi `/health`.

### Kiểm cả hai chiều

Hai đột biến đã thử, mỗi chiều một bài đỏ: chặn luôn cả app native → bài "app vẫn đăng nhập
được" đỏ; không chặn ai cả → bài "mọi đường nhận mật khẩu đều 410" đỏ. Một guard chỉ đúng một
chiều thì không giữ được gì.

## [1.48.1] — 2026-08-22

**Sửa: `/chamcong/chamcong/` ra trang "Không có trang này" ngay cửa vào.**

Webapp chạy dưới tiền tố `/chamcong/`. Một liên kết ghép tiền tố lên một đường dẫn **đã có**
tiền tố tạo ra `/chamcong/chamcong/`; router bỏ tiền tố **một lần**, còn lại `/chamcong/`,
không khớp tuyến nào, và người dùng đứng ở một trang 404 ngay trang đầu — trông như hệ thống
hỏng, dù chỉ là một liên kết sai.

Router giờ bỏ tiền tố **lặp** (giới hạn 5 lần để một URL bịa không thành vòng lặp), và
`replaceState` sửa luôn thanh địa chỉ — nếu không thì F5, dấu trang và nút Lui đều đưa người
dùng về đúng cái URL sai vừa chữa.

Phép bỏ lặp chỉ an toàn khi không tuyến nào tên đúng bằng tiền tố. Hiện mọi tuyến dùng tên có
gạch ngang (`/bang-cong`, `/nhan-vien`) nên không trùng, và có **hàng rào mới** giữ điều đó:
thêm một tuyến tên `chamcong` hay `cham-cong` thì bài kiểm đỏ, kèm chú thích nói rõ lúc đó phải
chọn giữa đổi tên tuyến và bỏ phép bỏ lặp.

Chưa xác định nguồn của liên kết sai — có thể là `href` tương đối ở thẻ module bên cổng, hoặc
cổng hiểu `quay_lai` là đường dẫn **tương đối với tiền tố module** thay vì đường dẫn tuyệt đối
của site như hợp đồng ghi. Bản sửa này làm cả hai trường hợp đều chạy đúng, nhưng nguồn vẫn nên
được xác nhận với quản trị cổng.

## [1.48.0] — 2026-08-22

**Bước 3: bỏ đường đăng nhập riêng.** Một công tắc, `CONG_SSO_BO_DANG_NHAP_RIENG`, và
**mặc định TẮT**. Mã xong hoàn toàn: bật là chấm công dùng chung cổng, tắt là về như cũ.

Vì sao có công tắc thay vì xoá thẳng: bật nó là đóng cửa đăng nhập **duy nhất đang dùng
được**. Nếu cổng chưa phát được token dùng được thì cả công ty không vào được hệ thống lúc 8
giờ sáng, và cái đó không lùi lại bằng một dòng. Công tắc là cơ chế chuyển tiếp có thời hạn,
không phải một lựa chọn lâu dài — hợp đồng bảo mật cấm phân hệ tự hiện form đăng nhập, nên khi
cổng chứng minh chạy được thì xoá cả công tắc lẫn nhánh mã cũ.

### Hàng rào chống tự khoá cả công ty

`bo_dang_nhap_rieng()` đòi **cả hai** điều kiện: công tắc bật **và** `CONG_SSO_GOC` đã khai. Bỏ
cửa cũ mà chưa có cửa mới là không còn cửa nào. Có bài kiểm giữ đúng chuyện đó, và đã thử đột
biến: bỏ `&& bat_cong_sso()` thì bài kiểm đỏ.

### Sáu chỗ nhận mật khẩu, giờ trả 410

`410 Gone` chứ không phải 404 hay 400: đường này **từng** tồn tại và bị bỏ có chủ đích, nên app
cũ gọi vào đọc được thông điệp nói rõ phải đi đâu.

| Đường | |
|---|---|
| `POST /xac-thuc/dang-nhap` | cửa đăng nhập |
| `POST /xac-thuc/lam-moi` | token làm mới của hệ thống này chỉ sinh ra từ hai cửa cũ |
| `POST /xac-thuc/doi-mat-khau` | mật khẩu do cổng giữ |
| `POST /nguoi-dung` | tạo tài khoản kèm mật khẩu tạm |
| `POST /nguoi-dung/:id/dat-lai-mat-khau` | |
| `GET /xac-thuc/microsoft/*` | luồng Entra riêng — cổng đã làm việc đó; giữ thêm là thừa một client secret, thừa một redirect URI, và thừa một cửa danh tính thứ hai phải canh |

### Webapp: không còn form, và đọc token của cổng

`GET /xac-thuc/cau-hinh` trả thêm `dang_nhap_rieng`. `false` là tín hiệu duy nhất webapp cần để
**không hiện form nào cả** mà chuyển hướng sang cổng — quyết định nằm ở máy chủ, nên đổi một
biến môi trường là webapp đổi theo ngay, không chờ build lại.

Token đọc từ `localStorage['cong_phien']` (webapp cùng origin với cổng). Hai điều đáng ghi:

- **Nhận ra token theo `iss`, không theo tên trường.** Tên trường bên trong `cong_phien` là hợp
  đồng của cổng; cổng đổi `token_truy_cap` thành `access_token` là ta gãy, và gãy im lặng. Quét
  mọi chuỗi trong đó rồi lấy cái nào là JWT có `iss` đúng và `loai: 'tc'` thì miễn nhiễm.
- **Không chép token sang khoá riêng của mình.** Cổng là chủ sở hữu: nó xoay token, nó thu hồi
  token. Giữ một bản là giữ một phiên dài hơn phiên của cổng — đúng cái hợp đồng cấm. Nên mỗi
  lần gọi API đều **đọc lại** từ `cong_phien`, và nhờ thế cổng xoay token ở tab khác thì ta nhận
  ngay bản mới, không phải tải lại trang.

Gặp 401 thì **không** làm mới token của cổng — nó không phải của ta. Đọc lại một lần (cổng có
thể vừa xoay ở tab khác), còn không thì về cổng đăng nhập, mang theo đường đang mở qua
`?quay_lai=` với đúng phép kiểm của cổng: một `/` đầu, không `//`, không `\`, không ký tự điều
khiển.

### Một cái bẫy chết người đã chặn trước

Ở chế độ cổng, `/doi-mat-khau` trả 410. Nếu webapp vẫn hiện màn hình **bắt buộc đổi mật khẩu**
cho một tài khoản cũ còn `phai_doi_mat_khau = true`, người đó sẽ thấy một màn hình không bao giờ
đổi được: vào hệ thống không được, mà cũng không có đường nào thoát. Màn hình đó giờ bị bỏ qua ở
chế độ cổng, kèm lý do ghi ngay tại chỗ.

Tương tự, quyền rỗng ra màn hình giải thích chứ **không** ra form đăng nhập — đăng nhập lại bao
nhiêu lần cũng không làm xuất hiện một quyền.

### Chưa làm, nói thẳng

- **Chưa chạy thử với cổng thật.** Không có cổng nào trong môi trường dựng nên toàn bộ nửa web
  chỉ được typecheck và build, chưa nhìn thấy nó chạy trong trình duyệt. Phép thử thật là bật
  công tắc trên VPS rồi mở `/chamcong`.
- Các nút quản trị mật khẩu (tạo tài khoản, đặt lại mật khẩu) **vẫn hiện** ở chế độ cổng; bấm
  vào thì nhận 410 kèm thông điệp chỉ sang `/cong/quan-tri`. Nên ẩn hẳn, chưa làm.

## [1.47.0] — 2026-08-21

**Bước 2: token của cổng đi được vào hệ thống.** Hook `can_dang_nhap` giờ nhận **cả hai** loại
token — token nội bộ (HS256) và token của cổng (RS256) — và cả hai đều ra cùng một kiểu
`NoiDungToken`, nên không route nghiệp vụ nào phải biết người dùng đến từ đâu. Đường đăng nhập
riêng **vẫn còn**; bỏ nó là bước 3, và có một bài kiểm giữ điều đó để app điện thoại không mất
kết nối trước khi có ai quyết định.

Thứ tự thử là cố ý: token nội bộ trước, vì phép kiểm của nó không chạm CSDL và không chạm mạng.
Token của cổng là RS256 nên `giai_ma_token` từ chối ngay ở bước đọc `alg`, không tốn gì. Ngược
lại thì mỗi request của app điện thoại phải đi qua lớp xác minh của cổng trước.

### Khóa móc là `sub`, không phải email

`migrations/029_cong_sso.sql` thêm `nguoi_dung.cong_sub`. Cổng bảo đảm `sub` ổn định vĩnh viễn;
email đổi được — đổi tên người, đổi tên miền, đổi phòng. Hệ thống này đã dính đúng cái bẫy đó ở
đường đăng nhập Microsoft: trước 1.32.0 chỉ khớp bằng email, nên đổi email bên Entra là mất
khớp, và lần đăng nhập kế tiếp **tạo một tài khoản thứ hai** cho cùng một người. Email vẫn dùng
để đối chiếu lần đầu, rồi ghi `cong_sub` lại để từ đó không phải đoán nữa.

### Vai trò lấy từ token — và một bài kiểm ban đầu không chứng minh được điều đó

Cột `nguoi_dung.vai_tro` chỉ để hiển thị trên trang Tài khoản. Đọc nó để phân quyền nghĩa là
**thu hồi quyền bên cổng không còn tác dụng** — điều tệ nhất có thể làm với một hệ SSO.

Bài kiểm cho việc này lúc đầu **vô giá trị**, và tôi chỉ biết vì đã thử đột biến. `dong_bo_vai_tro`
ghi cột trong CSDL cho khớp token, nên *sau* khi nó chạy thì đọc từ token và đọc từ bản ghi ra
**cùng một giá trị**: một bản sửa thành `vai_tro: dong.vai_tro` chạy đúng y hệt và bộ kiểm vẫn
xanh. Sửa bằng cách **dựng xong kết quả trước khi đồng bộ** — thứ tự đó là thứ duy nhất làm hai
đường khác nhau thật. Sau khi sửa, cùng đột biến đó làm **ba** bài đỏ. Lý do ghi ngay tại chỗ
trong mã để người sau không dọn nhầm.

Đây là lần thứ hai trong hai bản liên tiếp một bài kiểm bảo mật hóa ra không giữ được điều nó
tuyên bố (lần trước là phép kiểm `alg`). Cả hai chỉ lộ ra khi cố tình phá mã nguồn rồi chạy lại.

### Ba trạng thái "đã đăng nhập thật nhưng chưa vào được" — cả ba là 403

| Trạng thái | Cờ trong thân phản hồi |
|---|---|
| `quyen` rỗng hoặc thiếu khóa `chamcong` | `chua_cap_quyen` |
| Vai trò cần hồ sơ mà tài khoản chưa nối hồ sơ | `chua_noi_ho_so` |
| Tài khoản bị vô hiệu hoá bên chấm công | — |

Không cái nào được là 401. 401 làm giao diện đẩy người dùng về trang đăng nhập: họ đăng nhập
lại, thành công, rồi lại bị đẩy ra — một vòng lặp không bao giờ thoát, và việc duy nhất họ làm
được là gọi cho hỗ trợ.

Trạng thái thứ hai đáng nói riêng: nếu cho qua với `nv = null` thì mọi đường `/api/toi/*` trả về
rỗng — trông y như hệ thống mất dữ liệu, và người dùng không biết phải gọi ai. Nên nó trả 403
kèm **đúng email** cần khai.

Ánh xạ danh tính cache 60 giây; **quyết định phân quyền thì không** — tính lại từ token ở mỗi
request. Hệ quả phải biết: vô hiệu hoá tài khoản bên chấm công có hiệu lực trong vòng một phút,
thu hồi bên cổng tối đa 15 phút.

### 13 bài e2e đi qua đường thật

Token ký bằng khóa RSA thật, JWKS lấy từ một cổng giả trong tiến trình, bản ghi `nguoi_dung` tạo
ra thật trong CSDL. Bốn đột biến đã thử, cả bốn làm bộ kiểm đỏ: trả 401 thay vì 403 cho quyền
rỗng · đọc vai trò từ CSDL · bỏ phép kiểm "chưa nối hồ sơ" · tin header `X-Cong-Nguoi-Dung`.

Và một bài giữ R9: `/iclock/cdata` phải trả 200 **không qua lớp xác thực nào**. Ngày nào ai thêm
`preHandler: can_dang_nhap` vào tuyến iclock thì bài đó đỏ — trước khi bảng lương mất dữ liệu cả
tháng.

### Hai chỗ vênh bên cổng đã được sửa, ghi lại vì cả hai đều im lặng

**Sổ đăng ký khai `admin`, mã của ta đọc `quan_tri`.** `ma` là thứ đi vào token, nên cấp
`chamcong.admin` là cấp một vai trò mà mã của ta không bao giờ nhận ra — không báo lỗi ở đâu,
người được cấp chỉ đơn giản là không có quyền. Quản trị cổng đã sửa thành đúng năm mã.

**`bat = false` làm `token.quyen['chamcong']` luôn rỗng**, vì `doc_quyen` bên cổng có
`join module m on ... and m.bat`. Hợp đồng bản đầu lại bắt làm xong checklist *trước* khi bật
`bat` — làm theo thứ tự đó là cấp quyền, đăng nhập, thấy quyền rỗng, rồi đi tìm lỗi trong mã của
chính mình. Đã sửa: `bat = true` bật ngay ở bước 2. Bật `bat` không mở đường vào phân hệ, nên
cũng **đừng dựa vào `bat = false` để chặn truy cập**.

### App điện thoại: lối thứ ba, và một điểm phải chốt cùng nó

Quản trị cổng đề xuất lối thứ ba, tốt hơn cả hai lối tôi nêu ở 1.46.0: **trình duyệt hệ thống +
custom scheme** (`AuthSession` của Expo) — chuẩn cho app native, app không bao giờ thấy mật khẩu.
Lý do bác WebView nhúng là thực tế: Microsoft khuyến nghị không dùng, và một số cấu hình
Conditional Access từ chối hẳn.

Điểm phải chốt cùng lối 3, đã ghi vào tài liệu: **custom scheme bị chiếm được** — trên Android
một app khác đăng ký cùng `thvcc://` là nhận được cú redirect. Nên đường quay về **không được
mang token**, phải mang một mã uỷ quyền dùng một lần (code + PKCE). Nếu cổng đặt access token và
refresh token vào fragment của `thvcc://...` giống cách đường Microsoft hiện tại làm với webapp,
thì một app độc hại chiếm scheme lấy được **refresh token 30 ngày**. Mạnh hơn nữa nếu cổng làm
được: App Links / Universal Links trên chính `teams.tranhoangvietnam.com` — không app nào chiếm
được.

## [1.46.0] — 2026-08-21

**Bước 1 của việc nối vào cổng SSO nội bộ: lớp xác minh token.** Chưa route nào đổi, chưa đường
đăng nhập nào bị bỏ — bật hay tắt bằng đúng một biến `CONG_SSO_GOC`, để trống là hệ thống chạy y
như trước. Đó là chủ ý: hợp đồng bảo mật của cổng quy định thứ tự, và bước 1 là bước duy nhất
**không** làm gì ảnh hưởng phân hệ khác. Làm sai thì chỉ chấm công không vào được.

Toàn bộ nằm ở một tệp, `may_chu/src/bao_mat/cong_sso.ts`: RS256 danh sách trắng **cứng trong mã**,
kiểm chữ ký **trước** khi đọc bất kỳ trường nào, rồi `iss` đúng chuỗi, `aud === 'cong-noi-bo'`
(là chuỗi, không phải mảng), `exp` với lệch đồng hồ 30 giây, `loai ∈ {tc, dv}` — token làm mới
30 ngày bị từ chối — và chỉ đọc `quyen['chamcong']`, không đọc khóa của phân hệ khác.

### Ba tính chất, và cái giá của việc làm sai từng cái

**Fail closed.** Không tải được JWKS thì **từ chối**. Nhưng nếu đã có bộ khóa trong đệm thì vẫn
dùng tiếp: cổng chết 5 phút không được làm đứt phiên của cả công ty. Hai vế ngược nhau, nên mỗi vế
một bài kiểm. Cái loại lỗi mà tài liệu của cổng gọi là "phổ biến nhất trong loại mã này" xuất hiện
dưới dạng một `try { } catch { /* bỏ qua */ }` trông vô hại — nên trong tệp này **không nhánh
`catch` nào** dẫn tới "cho qua".

**JWKS có giới hạn tần suất, không chỉ có cache.** Đệm 1 giờ và nạp lại khi gặp `kid` lạ là hai
việc hiển nhiên. Cái không hiển nhiên: nạp lại **mỗi lần** gặp `kid` lạ nghĩa là kẻ tấn công gửi
một loạt token với `kid` bịa và biến phân hệ thành cái búa đánh vào chính cổng. Chốt ở 3 lượt mỗi
phút — đủ để tự phục hồi ngay sau một lần cổng xoay khóa, mà 20 token `kid` bịa chỉ tốn hết chùm
lượt đó. Bài kiểm khẳng định cả hai: xoay khóa xong dùng được ngay, và 20 token bịa chỉ gọi cổng
3 lần.

**Không đọc `X-Cong-*`.** Caddy chuyển `X-Cong-Nguoi-Dung` và `X-Cong-Email` sang, và chúng trông
rất tiện. Nhưng Caddy chỉ **ghi đè** chúng: request đến từ bất cứ đâu khác ngoài Caddy — gọi thẳng
`127.0.0.1:8080`, một lỗ SSRF ở phân hệ khác, một container cùng mạng Docker — thì kẻ gọi **tự
khai mình là ai**, chỉ bằng cách đặt header. Uỷ quyền duy nhất là token đã xác minh chữ ký, nên có
một bài kiểm **quét toàn bộ `may_chu/src`** và bắt mọi dòng mã (không phải chú thích) nhắc tới
`X-Cong-`.

### Bài kiểm alg mà ba bài kiểm alg khác không thay được

`alg: none` và HS256-ký-bằng-khóa-công-khai đều bị từ chối — nhưng khi tôi thử **bỏ hẳn** phép kiểm
`alg` thì cả hai bài **vẫn xanh**. Lý do: lớp này luôn xác minh bằng RSA-SHA256 bất kể header ghi
gì, nên hai đòn đó vỡ ở chỗ khác. Nghĩa là hai bài đó **không** giữ được danh sách trắng: một bản
viết lại kiểu "đọc `alg` rồi chọn bộ xác minh theo đó" sẽ đi qua chúng.

Bài giữ được nó là: chữ ký RSA-SHA256 **thật và hợp lệ**, chỉ cái nhãn `alg` trong header ghi
`RS512`. Mã có danh sách trắng cứng thì từ chối; mã tin theo header thì nhận. Hai đột biến khác
(bỏ kiểm chữ ký, đọc `quyen` của mọi phân hệ) cũng đã được thử và đều làm bộ kiểm đỏ.

### Vai trò đối chiếu theo `ma`, không theo `ten`

`quan_tri → admin`, còn `nhan_su` / `truong_phong_nhan_su` / `truong_phong` / `nhan_vien` giữ
nguyên tên. Nhiều vai trò thì lấy quyền cao nhất. `ma` nằm trong token nên không đổi được; `ten`
chỉ là nhãn hiển thị — đối chiếu theo `ten` là để một người sửa nhãn tiếng Việt thành gỡ quyền của
cả phòng. `cho_duyet` **không** có trong bảng: ở mô hình cổng, "đã đăng nhập nhưng chưa được cấp
quyền" là `quyen` **rỗng**, và mảng rỗng với thiếu hẳn khóa `chamcong` đều nghĩa như vậy — không
cái nào nghĩa là "cho qua".

Bảng đổi vai trò là **một nửa của một hợp đồng**; nửa kia là danh sách khai bên sổ đăng ký của
cổng. Bỏ khai một vai trò bên đó **không** thu hồi quyền ở phía chấm công — cổng lọc token nhưng
không sửa mã của ta — nên xóa một bên thì phải xóa bên kia. Ghi rõ ở `tai_lieu/CONG-SSO.md`.

### `/iclock/*` không bao giờ được gác

Ghi vào tài liệu ngay ở bước 1, trước khi có ai chạm vào Caddyfile. `/iclock/*` là đường máy chấm
công gọi vào: máy không có token, và firmware ZKTeco coi mọi phản hồi 3xx là lỗi rồi **bỏ luôn lô
dữ liệu đang gửi**. Gác đường đó nghĩa là máy vẫn kêu bíp, nhân viên vẫn tưởng đã chấm công, mà dữ
liệu không tới máy chủ — và hậu quả hiện ra ở **bảng lương**, chậm hơn cả tháng, không dựng lại
được. Lớp bảo vệ của đường đó là danh sách IP, không phải cổng gác.

### Còn lại

Bước 2 (nối vào hook xác thực), bước 3 (bỏ đường đăng nhập riêng) và bước 4 (bật cổng gác) chưa
làm. Một điểm phải quyết trước bước 3, đã ghi ở `tai_lieu/CONG-SSO.md` mục 4: app điện thoại hiện
giữ token làm mới 30 ngày của chính hệ thống chấm công, nên hoặc app mở màn đăng nhập của cổng
trong WebView (lối đúng, phải phát hành lại bản build), hoặc tạm giữ một đường mật khẩu riêng cho
app (còn một đường mật khẩu — đúng cái mà bước 3 muốn bỏ).

## [1.45.0] — 2026-08-20

**Thiếu hẳn chức năng tạo tài khoản trên trang Cài đặt → Tài khoản.**

Máy chủ có `POST /api/nguoi-dung` (chỉ admin) từ đầu, nhưng **không đường nào trên giao diện gọi
tới**. Trang Tài khoản chỉ có Đổi vai trò / Đặt lại mật khẩu / Nối Microsoft / Vô hiệu hóa — mà
chính khối hướng dẫn của nó lại ghi bước 1 là *"Tạo tài khoản…"*, còn dòng mô tả bên dưới đẩy
người đọc sang trang Nhân viên.

Trang Nhân viên **có** cấp tài khoản, nhưng chỉ cho một hồ sơ nhân viên. Còn `nhan_su` và `admin`
thì **không đòi** phải có hồ sơ — kế toán thuê ngoài, tài khoản quản trị kỹ thuật. Những tài khoản
đó không tạo được bằng tay ở đâu cả (tài khoản `ngoc.hr@…` đang chạy thật chính là loại này).

Form mới, chỉ admin: tên đăng nhập, mật khẩu tạm, vai trò, và nhân viên — **bắt buộc** với
`nhan_vien` / `truong_phong` / `truong_phong_nhan_su`, để trống được với các vai trò còn lại. Chọn
`truong_phong_nhan_su` thì hiện cảnh báo: đó là vai trò duy nhất gỡ được tệp đã nạp vào hồ sơ.

### Hai hàng rào mới cho giao diện

**Mọi `className` phải có định nghĩa trong một tệp `.css`.** Bài kiểm này sinh ra vì chính tôi gõ
`hop-canh-bao` — một lớp không tồn tại, lớp thật là `hop-luu-y`. `className` là một chuỗi: gõ sai
thì tsc không báo, build không báo, và trên màn hình ra một khối không có kiểu. Nhìn như "quên
thiết kế" chứ không như một lỗi.

Lượt quét đầu tiên tìm ra **4 lớp đã nằm sẵn trong mã nguồn mà không có định nghĩa nào** — 4 chỗ
trên app đang mất kiểu:

| Lớp | Ở đâu | Xử lý |
|---|---|---|
| `o`, `o-chon` | hộp thoại *Mã định danh* | đổi sang `o-nhap` / `o-nhap-ngang` — đúng quy ước 9 chỗ khác đang dùng |
| `hang-nhan` | khối *Xem trước* của màn nhập dữ liệu | thêm định nghĩa: các nhãn dính sát nhau |
| `dieu-huong-khoi` | nhóm mục trong thanh bên | thêm định nghĩa: khoảng cách giữa các nhóm |

**Danh sách vai trò bắt buộc có hồ sơ phải khớp giữa máy chủ và giao diện.** Giao diện lặp lại
`VAI_TRO_CAN_HO_SO` để đánh dấu ô *Nhân viên* là bắt buộc. Lệch nhau thì hoặc người dùng bấm Tạo
rồi ăn 400 không hiểu vì sao, hoặc bị bắt khai nhân viên cho một vai trò không cần.

Cả hai đã chứng minh bắt lỗi thật: gõ lại tên lớp sai thì bài đầu đỏ kèm đúng tên lớp và tệp; bỏ
một vai trò khỏi danh sách của giao diện thì bài thứ hai đỏ.

## [1.44.0] — 2026-08-20

**Chu kỳ vòng lịch: 5 phút, và khai được trong `.env`.**

`LICH_CHU_KY_PHUT`, mặc định **5** (trước là 15 cứng trong mã), chặn trong `[1, 60]` — gõ 0 hay
số âm thì `setInterval` bắn liên tục, còn số quá lớn thì việc cuối ngày trượt hạn cả ngày.

15 phút không phải một quyết định, nó là con số thừa hưởng. Mọi việc trong vòng lịch (chốt bảng
công, nhắc hạn hợp đồng, sắp xếp kho tệp) đều khóa *một lần một ngày*, nên chu kỳ chỉ quyết định
**độ trễ** chứ không quyết định khối lượng. Riêng việc đồng bộ SharePoint chạy mỗi vòng — và khi
không còn tệp nào chờ thì nó kết thúc sau **một** câu SQL có chỉ mục, không gọi Graph lần nào.

**Đồng bộ không còn bị chặn trước 01:00.** Cửa chặn `gio_may < GIO_CHAY` tồn tại cho các việc
*cuối ngày*: phải chờ máy chấm công đẩy hết log của ngày hôm trước rồi mới chốt bảng công. Việc
copy tệp lên SharePoint không liên quan gì đến điều đó, nhưng nó nằm sau cửa chặn nên mỗi đêm có
một **cửa sổ một tiếng** không đồng bộ gì: tệp nạp lúc 00:10 phải chờ đến 01:00.

Thứ tự với việc sắp xếp kho tệp **không còn là ràng buộc**, và điều đó cần nói rõ vì trước đây có
một comment khẳng định ngược lại. Đọc lại `SQL_MONG_MUON`: đường dẫn SharePoint tính từ `ma_nv` /
`ho_ten` và siêu dữ liệu văn bản, còn `ten_luu` chỉ dùng để lấy **đuôi tệp** — mà sắp xếp không
đổi đuôi tệp.

Khối đồng bộ tách thành hàm riêng `dong_bo_sharepoint()` để đọc ra ngay là nó **không** nằm sau
cửa chặn giờ.

## [1.44.0] — 2026-08-20

**Đường xóa SharePoint đã chạy thật**, và giữ lại dấu vết đã xóa gì.

Xác nhận trên máy thật: gỡ một tệp trong ứng dụng, vòng quét kế tiếp xóa bản trên SharePoint. Nên
`xoa()` không còn là "chỉ đúng theo tài liệu Graph" nữa — cả hai nửa của đồng bộ đã chạy thật.

Nhưng đọc lại `xoa_ban_cu()` thấy một lỗ: xóa xong thì **cả hai** cột đường dẫn về `null` và
`ly_do` bị xóa trắng, nên dòng đó không còn nói được nó từng ở đâu. Đây là hành vi **phá hủy** trên
một thư viện **dùng chung** — nếu chị HCNS hỏi *"sao tệp này biến mất"* thì hệ thống không trả lời
được. Nhật ký thao tác có ghi việc gỡ tệp **trong ứng dụng**, nhưng không ghi việc xóa **trên
SharePoint**.

Giờ `ly_do` giữ lại `Đã xóa bản trên SharePoint: <đường dẫn>`. Dùng lại cột có sẵn — không chỗ nào
dựa vào `ly_do IS NULL` để quyết định gì, nó chỉ được hiện ra màn hình; và `ghi_nhan` chỉ ghi đè
`ly_do` khi đường dẫn mong muốn đổi, mà dòng đã gỡ thì nó đứng yên ở `null`.

Đã dựng lại đúng tình huống trên máy chủ Graph giả và xác nhận hai phía: Graph nhận `DELETE`, và
dòng CSDL ra `xong` / `duong_dan_da_day = null` / `sp_item_id = null` kèm đúng đường dẫn đã xóa.

## [1.43.0] — 2026-08-20

**Đồng bộ SharePoint chạy mỗi 15 phút, không phải mỗi ngày một lần.**

Vòng lịch vốn đã tick mỗi 15 phút, nhưng việc đồng bộ khóa theo `dong_bo_sharepoint:<ngày>` —
một lần một ngày. Hậu quả: nạp một tệp lúc 13:00 chỉ **ghi nhận** là có việc cần đẩy, còn vòng
quét của hôm nay đã chạy xong từ 01:00. Tệp phải chờ đến **01:00 sáng mai**. Cả một ngày, và
người nạp tệp không có cách nào biết.

Đã gặp đúng tình huống này trên máy thật: thêm tệp cho một nhân sự, không thấy đồng bộ, không có
gì sai cả — chỉ là chưa tới lượt.

Khóa "một lần một ngày" là **đúng** cho việc chốt bảng công (chạy hai lần là sai số liệu) nhưng
**sai** cho việc này. Đồng bộ vốn đã idempotent: `ghi_nhan` là upsert, `quet` chỉ chạm dòng có
`duong_dan_muon` khác `duong_dan_da_day`, và không còn việc thì `quet` kết thúc sau **một** câu
SQL có chỉ mục — không một lượt gọi Graph nào.

Thứ tự trong một vòng vẫn giữ: việc này chạy sau việc sắp xếp kho tệp. Đường dẫn SharePoint tính
từ `ma_nv`/`ho_ten` chứ không từ tên tệp trên đĩa, nên một vòng chạy trước lượt sắp xếp cũng không
tính sai gì.

Kèm theo: khóa theo ô 15 phút sinh ~92 dòng mỗi ngày trong `cong_viec_da_chay`, mà bảng đó không
có chỗ nào dọn. Thêm dọn dòng `dong_bo_sharepoint:*` cũ hơn 7 ngày — giữ đủ để đọc lại `ket_qua`
của những vòng gần đây khi gỡ lỗi.

## [1.42.1] — 2026-08-20

**`ghi_nhan_am_tham` không còn nuốt lỗi không dấu vết.** Nó là chỗ ghi nhận "tệp này cần đẩy lên
SharePoint", gọi ngay sau khi nạp tệp và sau khi gán tệp vào một ô checklist. Nuốt lỗi ở đây là
**đúng** — nạp tệp là việc chính, đồng bộ là việc phụ, và vòng quét hằng ngày sẽ dọn nốt. Nhưng
`catch {}` trơn nghĩa là khi ai đó hỏi *"tôi vừa thêm tệp mà sao không thấy đồng bộ"* thì không
có chỗ nào trả lời được: không dòng trong bảng, không dòng trong log, không gì cả. Giờ nó ghi một
dòng vào log máy chủ.

## [1.42.0] — 2026-08-20

**`kiem_sharepoint` hỏi ngược Graph về từng tệp đã đẩy, và in URL bấm được.**

`sharepoint_tep.duong_dan_da_day` là **ghi chép của ta**: nó nói *"ta đã ghi tệp này lên"*. Nó
**không** nói tệp còn ở đó bây giờ. Tệp có thể bị ai đó di chuyển hoặc xóa tay sau khi đẩy, và
bảng của ta vẫn báo `xong` mãi mãi.

Lệnh giờ có thêm một phần: với mỗi dòng đã đẩy, `GET /drives/{id}/root:/{đường dẫn}` và in

- `CÒN` kèm số byte và **`webUrl`** — trả lời được câu hỏi hay gặp nhất sau lần đẩy đầu tiên,
  *"tệp nằm ở đâu"*, thay vì phải mở tay từng cấp thư mục;
- `KHÔNG CÒN` khi Graph trả 404 — hệ thống tưởng đã đẩy nhưng SharePoint không có. Thoát mã 1.

`webUrl` cũng là cách nhanh nhất phát hiện *đúng site nhưng sai thư viện*: URL in ra chứa tên
thư viện thật.

## [1.41.0] — 2026-08-20

**Nút "Lấy log cũ" — xin log theo khoảng ngày, không phụ thuộc con trỏ đồng bộ của máy.**

Nút *Gửi lại log* gửi lệnh `CHECK`, tức là hỏi máy *"còn gì CHƯA GỬI không"*. Nhưng con trỏ
*đã gửi tới đâu* nằm **trong máy**, không nằm ở hệ thống này — nên một máy từng nối vào máy chủ
ADMS khác có thể đã đánh dấu toàn bộ log là đã gửi, và `CHECK` trả về 0 bản ghi. Không phải hỏng:
máy tin rằng nó không còn gì. Đổi địa chỉ máy chủ thường làm máy quên con trỏ đó, nhưng tùy
firmware.

`POST /api/thiet-bi/:serial/lay-log` gửi `DATA QUERY ATTLOG StartTime=… EndTime=…` — hỏi thẳng
*"đưa tôi log từ ngày A đến ngày B"*. Bản ghi trùng tự bị bỏ qua nên chọn khoảng rộng vẫn an toàn.
Hỗ trợ tùy firmware; máy không hiểu thì *Lịch sử lệnh* hiện mã lỗi, và đường chắc chắn còn lại là
xuất USB rồi *Nhập lịch sử từ file*.

**Không có đường API nào gửi lệnh tự do xuống máy**, và đó là cố ý: hai mốc ngày đi qua bộ kiểm
`YYYY-MM-DD` (ngày không tồn tại bị chặn) rồi mới được ghép vào chuỗi lệnh. Một route "gửi lệnh
bất kỳ" sẽ tiện hơn nhiều, và cũng là một đường cho phép đặt `CLEAR DATA` xuống máy chấm công —
xóa sạch dữ liệu chấm công của cả công ty bằng một lời gọi API.

Ba bài kiểm e2e, đã chứng minh bắt lỗi thật (đổi `xep_lenh` sang nhận chuỗi từ thân yêu cầu thì
hai bài đỏ, trong đó có bài soi mã nguồn):

- lệnh xếp xuống máy đúng định dạng `DATA QUERY ATTLOG`,
- chặn ngày sai dạng, ngày không tồn tại, khoảng ngược, và chuỗi lệnh nhét vào ô ngày,
- soi mã nguồn: `xep_lenh` không nhận chuỗi lấy từ thân yêu cầu ở bất kỳ route nào.

## [1.40.0] — 2026-08-20

**Sửa lỗi công chạy sang người khác khi có máy chấm công thứ hai.**

`POST /api/lan-quet/gan-lai` không lọc theo máy: gán PIN 5 là kéo theo **mọi** lần quẹt PIN 5 chưa
gán của **mọi** máy. Mà bảng *"PIN chưa gán cho nhân viên nào"* trên giao diện lại liệt kê theo
từng **(PIN, máy)**, và nút *Gán lại* chỉ gửi PIN — người bấm tin rằng mình đang gán đúng một
dòng.

PIN là danh tính ở phạm vi **toàn công ty** (di trú 026), nhưng **số** PIN thì do từng máy cấp:
hai máy có thể cùng có PIN 5 của **hai người khác nhau**. Với một máy thì lỗi này vô hại. Nó thành
tiền ngay khi đấu máy thứ hai — thường là lúc nạp lại dữ liệu cũ từ một máy đã dùng ở nơi khác.

- `thiet_bi_serial` giới hạn phạm vi `UPDATE`; giao diện truyền serial của đúng dòng đã bấm.
- Không khai serial mà PIN đó đang có bản ghi chưa gán ở **nhiều máy** thì **từ chối**, kèm danh
  sách từng máy và số lần — không đoán. Cùng lối với `DATA UPDATE USERINFO` khi một người nhiều PIN.
- Hộp thoại nói rõ nó chỉ chuyển lần quẹt của máy nào, và cùng số PIN ở máy khác không bị ảnh hưởng.
- Một máy thì đường cũ giữ nguyên: không cần khai serial.

Hai bài kiểm e2e, đã chứng minh bắt lỗi thật: bỏ điều kiện lọc theo máy thì bài "hai máy cùng số
PIN" đỏ.

Kèm tài liệu: mục **Nạp lại dữ liệu từ một máy cũ** trong `KET-NOI-MAY-ZKTECO.md` — thứ tự
*đối chiếu PIN trước khi cắm*, vì sau khi gán sai thì bản ghi không còn trong danh sách "chưa gán"
để sửa bằng một cú bấm.

## [1.39.1] — 2026-08-20

**Đường đẩy SharePoint đã chạy thật.** 4 tệp lên thư viện HCNS thật: 16/16 nhánh khớp tên,
`sp_item_id` do Graph cấp cho cả 4, `duong_dan_da_day` bằng `duong_dan_muon`. Nên `tai_len` và
`bao_dam_thu_muc` không còn là "chỉ đúng theo tài liệu Graph" nữa.

Tài liệu sửa theo — dòng *"Chưa chạy thật lần nào"* giờ đã sai, và một giới hạn đã hết hiệu lực
còn nằm trong tài liệu thì lần sau không ai biết cái nào còn thật.

`xoa()` **vẫn chưa chạy thật lần nào**, và nó hỏng **im lặng**: hồ sơ đã gỡ ở hệ thống vẫn sống
trên SharePoint và không có gì báo. Tài liệu giờ nói rõ phải thử đường xóa trong cùng lượt test,
bằng chính những tệp vừa đẩy.

## [1.39.0] — 2026-08-20

**`npm run dong_bo_sharepoint` — kích một vòng đồng bộ từ dòng lệnh.**

Trước bản này, cách duy nhất chạy một vòng quét ngay là bấm **Đồng bộ ngay** trên giao diện — nút
đó đòi đăng nhập. Còn lại là chờ vòng quét hằng ngày sau 01:00. Nhưng người đang cấu hình
SharePoint thì làm việc trong terminal của VPS, và **`SHAREPOINT_BAT_DAY=1` chỉ CHO PHÉP đẩy, nó
không tự đẩy**: bật xong, `/health` báo `bat — 4 tep cho` và bảng vẫn `chua_lam` với
`so_lan_thu = 0`. Đúng như thiết kế, và rất dễ đoán sai thành "hỏng".

- `--chi_tinh` chỉ tính lại đường dẫn mong muốn, **không chạm vào SharePoint**. An toàn chạy bất
  cứ lúc nào, kể cả khi chưa bật `SHAREPOINT_BAT_DAY`.
- Chưa bật `SHAREPOINT_BAT_DAY` mà chạy không cờ thì lệnh vẫn đếm việc rồi nói rõ vì sao không
  đẩy, kèm đúng hai bước cần làm — thay vì im lặng báo "0 đã đẩy".
- Một vòng làm tối đa `MOI_VONG` việc. Còn việc chưa tới lượt thì lệnh **nói ra**, vì im lặng ở
  đây đọc thành "đã xong hết".
- Thoát mã 1 khi có dòng lỗi, để dùng được trong kịch bản.

## [1.38.1] — 2026-08-20

**Sửa: `kiem_sharepoint` in `Thư viện : root`.** Lượt chạy thật đầu tiên trên VPS bắt được lỗi
này. `thu_ket_noi()` đọc trường `name` của `GET /drives/{id}/root`, và Graph thật trả về `"root"`
ở đó — tên của **mục gốc**, không phải tên thư viện.

Dòng đó vô dụng đúng vào việc nó tồn tại để làm: trả lời *"drive id đang trỏ vào HCNS hay vào
thư viện mặc định của site"*. Trỏ nhầm sang *Tài liệu* thì nó cũng in `root` và không cảnh báo gì.

Tên thư viện giờ lấy từ `GET /drives/{id}`; `GET /drives/{id}/root` vẫn được gọi nhưng để chứng
minh **đọc được** mục gốc — đọc được metadata của drive không đồng nghĩa đọc được nội dung trong
đó. Thêm dòng `Đường dẫn` in `webUrl`, vì nó kết thúc bằng đường dẫn thư viện nên đối chiếu bằng
mắt là xong.

**Vì sao bộ kiểm không bắt được:** máy chủ Graph giả trả `name: "HCNS"` cho mục gốc — một cái bẫy
tự đặt. Bài kiểm xanh trong khi thực tế sai. Máy giả giờ trả `"root"` đúng như Graph thật, và có
một bài kiểm riêng đòi `ten_thu_vien === 'HCNS'` (đã chứng minh đỏ khi hoàn lại mã cũ).

Kèm theo: khai thẳng `SHAREPOINT_DRIVE_ID` thì tên thư viện **không được kiểm ở đâu cả** — id đó
đi trực tiếp vào mọi lượt gọi Graph. Lệnh giờ in một dòng `CHÚ Ý` khi tên thật khác
`SHAREPOINT_THU_VIEN`. Thư viện bị đổi tên thì không sao; trỏ sai thư viện thì hồ sơ vào chỗ khác.

## [1.38.0] — 2026-08-20

**`npm run kiem_sharepoint` — đối chiếu bảng `NHANH` với cây thư mục thật.** Chỉ đọc: không tạo,
không ghi, không xóa. Quyền cần là `Sites.Selected` mức *read*.

Bảng `NHANH` là một bản **sao chép tay** từ thư viện HCNS, và tên thư mục ở đó có `–` (U+2013),
`&`, `(...)`, số thứ tự `02.1`. Sai một ký tự thì Graph **không báo lỗi** — nó tạo một thư mục
mới bên cạnh thư mục thật, và hồ sơ của 53 người nằm trong một cây không ai mở. Triệu chứng duy
nhất là *"chị HCNS không thấy tệp"*. Và nó không phải việc làm một lần: HCNS đổi tên thư mục là
bảng này lệch.

Với mỗi nhánh thiếu, lệnh in tên **thật** lấy từ SharePoint kèm chỗ khác nhau tính theo **mã
Unicode**:

```
khác ở: ký tự thứ 27: cần "–" (U+2013), trên SharePoint là "-" (U+002D)
```

Mã ký tự là điểm chính: `–` với `-` in ra màn hình gần như không phân biệt được. Không có tên nào
gần giống thì lệnh liệt kê tên thật của các thư mục đang có ở đó, để sao lại từng ký tự.

Ba dòng đầu in **thư viện đang nối tới**. Đó là câu hỏi khác và cũng đã từng cần:
`GET /sites/{id}/drive` (số ít) trả về thư viện **mặc định** của site — *Tài liệu* / *Shared
Documents* — không phải HCNS. Ai lấy drive id bằng đường đó sẽ đúng site nhưng sai thư viện, và
mọi nhánh báo `THIẾU` mà không rõ vì sao.

`LỖI` tách khỏi `THIẾU`: `LỖI` là Graph từ chối (403 = `Sites.Selected` chưa cấp trên site), còn
`THIẾU` là kết nối được nhưng tên không khớp. Gom hai thứ vào một là đẩy người đọc đi đổi tên
thư mục trong khi vấn đề là quyền. Thoát mã 1 khi còn nhánh thiếu hoặc lỗi.

Kèm theo, trong client Graph:

- `liet_ke()` — liệt kê mục con của một thư mục, `null` khi thư mục không có (404 không thành
  lỗi). Đi theo `@odata.nextLink` để không bỏ mất trang sau, nhưng **chỉ khi** nextLink còn nằm
  trong đúng gốc Graph đang dùng: nextLink đến từ *phản hồi*, và đi theo nó một cách mù là gửi
  Bearer token của ứng dụng đến bất kỳ máy nào URL đó trỏ tới.
- Không hàng rào `duong_dan_an_toan_*` ở đây, và đó là cố ý: hàng rào đó tồn tại để bảo vệ tệp
  của người khác khỏi bị ghi đè và xóa. Việc cần đối chiếu chính là những thư mục **ngoài** bảng
  `NHANH` — một hàng rào ở đây sẽ chặn đúng việc đó.

## [1.37.1] — 2026-08-20

Tài liệu SharePoint: bổ sung hai điều đã làm lần cấp quyền đầu tiên thất bại.

- **Ai chạy được.** Cấp application permission của Microsoft Graph cần **Global Administrator**
  (hoặc Privileged Role Administrator). *Application Administrator* có thể không đủ cho riêng
  nhóm quyền này — gặp `Insufficient privileges` thì đó là lý do, không phải lệnh sai.
- **Đăng nhập bằng gì.** Phải là tài khoản người thật, không phải managed identity của Cloud
  Shell (`az account show --query user` phải ra `user`, không phải `servicePrincipal`). MSI
  không lấy được token cho các audience cần thiết — đó là nguồn của cả lỗi
  `not a supported MSI token audience` lẫn `403 accessDenied`.
- **Rủi ro của cách vòng, nói thẳng.** Giữa hai bước bootstrap, app có toàn quyền trên **mọi**
  site của tenant — kể cả site tài chính, site ban giám đốc. Phải chạy liền một mạch và bước gỡ
  là bắt buộc.

## [1.37.0] — 2026-08-20

**`/health` nói trạng thái đồng bộ SharePoint.** Tính năng này có **hai công tắc** và cả hai tắt
mặc định, nên trạng thái *bình thường* của nó là "không đẩy gì cả" — đúng như thiết kế, nhưng từ
ngoài nhìn thì giống hỏng. Trước bản này, cách duy nhất biết là mở đúng một trang trong ứng dụng;
ai không biết có trang đó thì chỉ thấy SharePoint trống trơn và không có gì giải thích.

Kịch bản triển khai in nguyên thân `/health` sau mỗi lần cập nhật, nên đó là chỗ dễ thấy nhất:

| Dòng `sharepoint` | Nghĩa |
|---|---|
| `tat — chua khai SHAREPOINT_SITE_ID / …` | Công tắc 1 tắt: chưa có credential trong `.env` |
| `chi dem — chua dat SHAREPOINT_BAT_DAY=1 …` | Công tắc 2 tắt: kết nối được nhưng **cố ý** chưa đẩy |
| `bat — N tep cho, M loi` | Đang chạy thật |

Hai điều dòng này **không** làm:

- **Không gọi Graph.** `/health` bị trình giám sát và kịch bản triển khai gọi liên tục; một lượt
  gọi mạng mỗi lần là thêm độ trễ và thêm một đường chạm trần giới hạn của Microsoft. Chỉ đọc
  trạng thái cục bộ. Muốn thử credential thật thì mở *Cài đặt → Kho tệp hồ sơ* — trang đó gọi
  Graph một lần và in lỗi ra màn hình.
- **Không in giá trị của biến nào** (`/health` không đòi đăng nhập). Tên biến thì in — đó chính là
  phần hữu ích. Có bài kiểm e2e đối chiếu theo **giá trị thật trong cấu hình**, nên bài đó còn
  đúng cả khi máy thật đã khai đầy đủ; đã chứng minh nó bắt được rò rỉ bằng cách cố tình in
  client secret ra rồi chạy lại.

### Tài liệu

`tai_lieu/SHAREPOINT.md` thêm mục **"Chưa thấy tệp nào trên SharePoint — soi ở đâu"**: bảng tra
theo dòng `/health`, và ba câu lệnh kiểm nhanh trên VPS (câu đầu chỉ in **tên** biến, không in
giá trị).

Kèm một điểm dễ đọc sai: `sharepoint_tep.ket_qua = 'xong'` **không** có nghĩa là tệp đã lên
SharePoint. Một dòng thành `xong` khi tệp bị gỡ khỏi hồ sơ mà trên SharePoint chưa từng có bản
nào để xóa — tức *không có việc gì phải làm*. Bằng chứng duy nhất rằng một tệp đã thật sự lên là
`duong_dan_da_day is not null`.

## [1.36.0] — 2026-08-20

Rà soát toàn bộ giao diện web và dựng lại phần điều hướng. Không viết lại — kiến trúc, design
token, RBAC lấy máy chủ làm nguồn sự thật, múi giờ neo theo máy chấm công, router tự viết né CVE
đều giữ nguyên.

### 11 mục cấu hình gom thành một mục "Cài đặt"

Nhóm *Hệ thống* có 11 mục nằm thẳng trên thanh bên: Thiết bị, Ca làm việc, Địa điểm, Ngày lễ,
Tài khoản, Tham số lương, Đồng bộ ERP, Khóa API, Kho tệp, Mã định danh, Nhật ký. Thanh bên dài
gấp đôi phần việc hằng ngày, và người dùng phải quét qua "Khóa API" mỗi lần tìm "Bảng công".

Cấu hình là thứ sửa vài lần một năm; việc hằng ngày là thứ mở vài lần một ngày. Hai loại đó không
nên cùng một cấp. Giờ là **một** mục `Cài đặt` mở ra sub-nav bốn nhóm:

| Nhóm | Mục |
|---|---|
| Chấm công | Thiết bị · Ca làm việc · Địa điểm · Ngày lễ |
| Nhân sự & lương | Tham số lương |
| Tài khoản & bảo mật | Tài khoản · Khóa API · Nhật ký thao tác |
| Tích hợp & dữ liệu | Đồng bộ ERP · Kho tệp hồ sơ · Mã định danh |

Mỗi mục con giữ **đường dẫn riêng** (`/cai-dat/thiet-bi`) chứ không phải tab trong một trang —
bookmark, Ctrl-click và nút Lui đều phải chạy, và tab thì cả ba đều không.

**Đường dẫn cũ vẫn sống.** 11 đường cũ tự chuyển sang đường mới (`replaceState`, nên nút Lui không
kẹt giữa hai đường). Bookmark cũ không hỏng, và có bài kiểm giữ cho mọi đường trong bảng chuyển
hướng trỏ tới một đường **có thật**.

Phân quyền từng mục con giờ đọc **một chỗ** — cột `quyen` của bảng `MENU_CAI_DAT` — thay vì mỗi
`case` tự gọi `la_admin()` / `la_nhan_su()`. Thêm một mục con mới chỉ phải khai quyền một lần.

`/cai-dat` không tự nhảy sang mục đầu tiên: "mục đầu tiên" khác nhau theo vai trò, nên cùng một
đường dẫn sẽ dẫn hai người tới hai chỗ. Nó liệt kê các nhóm ra, để trả lời được câu "ở đây sửa
được những gì".

### Trang hồ sơ nhân viên không còn mất tiêu đề

`/nhan-vien/<uuid>` không khớp mục menu nào, nên thanh bên **không mục nào sáng** và tiêu đề
header rơi về "Chấm công". Người dùng đang xem hồ sơ của một người cụ thể mà thanh tiêu đề không
nói họ đang ở đâu, cũng không có đường lui.

Giờ khớp active theo **tiền tố**, và có một ngữ cảnh tiêu đề nhỏ để trang tự đặt tên người + đường
mòn `Nhân viên › Hồ sơ` lên header. Trang không dùng hook đó thì header giữ nhãn của MENU — không
cần mọi trang phải biết đến cơ chế này.

### Không còn hộp thoại gốc của trình duyệt

16 chỗ dùng `window.confirm` / `alert` / `prompt`. Chúng không theo chế độ tối, không theo font và
màu của app, không tô đỏ được nút xóa khác nút hủy — và ở nhiều trình duyệt có ô *"chặn trang này
hiện hộp thoại"*: người dùng tick vào thì từ đó mỗi lần bấm Xóa sẽ **không hỏi gì mà cũng không
xóa**. Một thao tác mất dữ liệu không được phép phụ thuộc vào thứ đó.

Thay bằng `dung_xac_nhan()` và `dung_nhap_chu()` — dựng trên `HopThoai` đã có, trả
`Promise<boolean>` / `Promise<string | null>`. Đi kèm hai thứ:

- **Nội dung nói rõ sẽ mất gì**, không phải "Bạn có chắc?". Xóa tệp hồ sơ nói thẳng "đây là bản gốc
  giấy tờ pháp lý và nó không còn ở đâu khác"; vô hiệu hóa tài khoản nói rõ hồ sơ và lịch sử chấm
  công **không** bị ảnh hưởng.
- **Bấm ra ngoài hoặc Esc = KHÔNG đồng ý.** Một hộp thoại xác nhận đóng lại mà coi là đồng ý thì
  một cú bấm lạc cũng xóa được dữ liệu.

`window.alert` khi trình duyệt không cho định vị giờ báo **ngay trong form** — người dùng đang gõ
vào form đó, nên câu trả lời phải ở cạnh ô nhập, và ở đó còn nói được cách làm thay thế (mở Google
Maps, bấm giữ, dán cặp số vào hai ô dưới).

### Sửa

- **Icon trùng trong thanh bên**: `fingerprint` dùng cho cả *Chấm công* và *Mã định danh*, `key`
  cho cả *Tài khoản* và *Khóa API*, `receipt-2` cho cả *Bảng lương* và *Phụ cấp*. Hai mục cùng
  icon thì thanh bên mất tác dụng quét nhanh. Đổi sang `search` / `lock` / `user-check` / `plus`
  — đều đã có trong font subset, không phải cắt lại font.
- **`key={i}`** ở 4 chỗ. Chỉ số mảng làm `key` thì ngay khi danh sách bị lọc / xóa / sắp xếp,
  React gán lại trạng thái của dòng này cho dòng khác. Nhật ký khóa API giờ khóa theo bốn trường
  xác định duy nhất một lần gọi; các danh sách chỉ đọc dùng `khoa_tinh(nội_dung, i)` — vẫn có vị
  trí nhưng nói rõ ý đồ bằng một cái tên.
- **Hàng bảng bấm được không dùng được bằng bàn phím**: `<tr onClick>` ở bảng công thiếu
  `tabIndex` / `role` / `onKeyDown`. Với người không dùng chuột, hàng đó không tồn tại.

### Tinh chỉnh Metronic

- **Vòng focus** `:focus-visible` cho mọi phần tử tương tác — điều kiện để dùng được bằng bàn phím.
- **Đường mòn** trên header cho trang con (hồ sơ, các mục Cài đặt).
- **Khung xương lúc tải** thay dòng chữ "Đang tải…" ở các trang danh sách: chữ đó không nói gì về
  hình dạng thứ đang tới, nên mỗi lần tải xong là một lần bố cục nhảy. Tôn trọng
  `prefers-reduced-motion`.
- **Cột đầu dính** khi cuộn ngang bảng công / bảng lương — cuộn mà cột tên trôi mất thì các con số
  bên phải không còn thuộc về ai.
- **Lớp thay style nội tuyến**: `.chu-nho` / `.chu-mo` / `.chu-xau` (36 bản sao), `.hang-bam`,
  `.manh`, `.so-canh-bao`, `.so-xau`, `.so-tot`, và `.nut-light` cho nút thứ cấp. Bản viết bằng mã
  màu cứng thì không theo được chế độ tối.

### Bảy hàng rào mới (`thiet_ke/giao_dien.test.mjs`)

Bảy thứ trên đều "chạy được" nên typecheck và build không bắt được — và lần nào cũng quay lại nếu
không có bài kiểm giữ:

| Hàng rào | Bắt được gì |
|---|---|
| Không dùng hộp thoại gốc | `window.confirm` / `alert` / `prompt` quay lại |
| Icon riêng biệt trong từng danh sách | hai mục cùng icon |
| Hàng bảng bấm được có `tabIndex` + `onKeyDown` | hàng chỉ dùng được bằng chuột |
| Không dùng chỉ số mảng làm `key` | `key={i}` quay lại |
| Mục con Cài đặt ↔ `case` định tuyến, hai chiều | mục menu ra trang trắng, hoặc `case` không ai vào được |
| Mọi mục menu cấp một có `case` | bấm vào ra "Không có trang này" |
| Đường dẫn cũ trỏ tới đường mới **có thật** | bookmark cũ thành 404, hoặc vòng lặp chuyển hướng |

Cả bảy đã được **chứng minh là bắt được lỗi thật** bằng cách cố tình phá mã nguồn rồi chạy lại.

## [1.35.0] — 2026-08-20

**Phụ cấp khai một lần, không phải gõ lại mỗi tháng.** Bản 1.34.0 cho ghi phụ cấp của từng người
lên phiếu lương, nhưng mỗi kỳ nhân sự phải gõ lại từ đầu cho cả 53 người. Đó là sai chỗ: *"Chị A
được hỗ trợ gửi xe 200.000/tháng từ 01/8"* là một **thỏa thuận**, không phải một ô trên bảng
lương tháng 8.

Nên nó thành một bảng riêng — `chinh_sach_phu_cap` — có **hiệu lực từ – đến**, và kỳ lương tự
sinh dòng khoản từ đó.

### Số lượng lấy từ đâu

| Nguồn | Nghĩa | Dùng cho |
|---|---|---|
| `co_dinh` | số lượng ghi trong chính sách | hỗ trợ gửi xe 1 lần/tháng |
| `theo_cong` | = **số ngày công thực tế** của kỳ | hỗ trợ ăn trưa |

`theo_cong` bám theo chấm công: đi làm ít ngày thì hưởng ít, không ai phải sửa tay. Không đi làm
ngày nào thì không sinh dòng nào — bảng lương không có dòng 0 đồng để người đọc phải tự hiểu.

**Đơn giá riêng của từng người**: để trống thì lấy đơn giá danh mục; điền thì đó là mức riêng —
chỗ để một người hưởng khác cả công ty mà không phải tạo một khoản mới chỉ cho một người.

### Đổi mức: đóng dòng cũ, mở dòng mới

Không sửa tại chỗ, giống `quyet_dinh_luong` và `ma_dinh_danh`. Gán lại với ngày hiệu lực mới thì
dòng cũ **tự đóng vào ngày trước đó** và ở lại làm lịch sử:

```
pc_trang_diem  300.000 đ/tháng   01/08 → 14/08   (tự đóng)
pc_trang_diem  500.000 đ/tháng   15/08 → nay     "Tăng mức"
```

Nhờ vậy tính lại lương tháng cũ vẫn ra đúng số cũ. Ngày hiệu lực mới không sau dòng đang mở thì
hệ thống **từ chối** chứ không lặng lẽ đè. Chính sách đã sinh ra khoản trên phiếu thì **không
xóa được**, chỉ đóng — số tiền đã trả phải giữ được căn cứ.

Kỳ lương nào **giao** với khoảng hiệu lực thì được hưởng, không phải kỳ nào nằm gọn trong đó:
người vào làm hoặc nghỉ giữa tháng đều tính đúng.

### Ghi đè cho riêng một kỳ

Dòng do chính sách sinh ra mang nhãn *theo chính sách* và tự tính lại mỗi kỳ. Bấm **Ghi đè** thì
nó thành dòng gõ tay và chính sách thôi điều khiển nó. Ghi đè là ghi đè — chính sách **không**
sinh thêm dòng thứ hai, và tính lại kỳ không đè lên con số đã gõ.

Rào này nằm ở **hai lớp** cố ý trùng nhau: bộ giải chính sách bỏ qua khoản đã gõ tay, và câu
`INSERT ... ON CONFLICT` mang thêm `where tu_chinh_sach = true`. Bỏ một lớp thì test vẫn xanh;
bỏ cả hai thì đỏ. Ghi rõ điều đó ngay tại chỗ để người sau không dọn nhầm.

**Chính sách không tự sửa bảng lương đang mở** — phải bấm *Tính lương* ở kỳ đó. Số liệu không
được đổi dưới chân người đang làm việc trên nó.

### Thêm

- Trang **Quản trị nhân sự → Phụ cấp**: xem theo người, xem cả lịch sử, gán và đóng.
- **Gán hàng loạt** — lọc theo tên / mã / phòng ban rồi chọn cả nhóm. Mỗi người vẫn ra một dòng
  riêng có hiệu lực riêng; đây là cách nhập nhanh, không phải một tầng "chính sách chung" thứ
  hai để sau này không biết số của ai đến từ đâu.

### Sửa

- Một comment SQL trong `ky_luong.ts` chứa dấu backtick nằm trong template literal, làm hỏng cả
  tệp. Bắt được vì bộ kiểm thử không chạy nổi — đã đổi sang dấu nháy thường.

## [1.34.0] — 2026-08-20

**Bảng lương mẫu của công ty đã lên phần mềm.** Bảng tính tháng 7/2026 (53 người, 7 sheet) có
9 khoản thu nhập và 5 khoản trừ. Chúng KHÔNG thành 14 cột mới trong `phieu_luong` — danh sách đó
đổi gần như hàng tháng, và mỗi lần đổi mà phải thêm cột là một lần di trú, một lần sửa giao diện,
một lần sửa bộ tính. Thay vào đó là **một bảng danh mục + một bảng dòng**:

- `khoan_luong` — danh mục 15 khoản, gieo sẵn đúng theo bảng tháng 7 của công ty.
- `phieu_luong_khoan` — từng khoản của từng phiếu, có đơn giá **chụp lại** tại thời điểm tính.

Thêm một khoản mới giờ là **thêm một dòng dữ liệu**, làm được ngay trên giao diện.

### Ba cách ra tiền

| Cách tính | Nhập gì | Ví dụ |
|---|---|---|
| `nhap_tay` | số tiền | Thưởng KPI, doanh số |
| `so_luong_x_don_gia` | số lượng | Phụ cấp ăn trưa 23 ngày × 30.000 |
| `nua_ngay_luong` | số lần | Nửa lương một ngày **của chính người đó** |

Cách thứ ba là điểm bảng tính cũ làm sai được: hai người đi muộn cùng số lần mà lương khác nhau
thì số tiền phải khác nhau. Ở đây nó suy từ `luong_ngay` của từng phiếu.

### Thu nhập miễn thuế không còn bị đánh thuế

Trước bản này hệ thống tính thuế TNCN trên **toàn bộ** thu nhập. Nghĩa là tiền hoàn lại khoản nhân
viên đã ứng ra chi hộ công ty cũng bị tính thuế — thu thuế trên một khoản không phải thu nhập.
Giờ mỗi khoản mang cờ `chiu_thue`, và phần miễn thuế bị trừ khỏi cơ sở tính thuế **trước** giảm
trừ gia cảnh. Ba khoản được gieo sẵn là miễn thuế: ăn trưa, trang phục quý (Thông tư 111/2013),
tiền ứng cho công ty, và không khoản nào khác.

### Điều 127 nói ngay tại chỗ nhập

Bảng của công ty trừ 50.000/lần đi muộn và trừ nửa ngày lương cho người **đã đi làm**. BLLĐ 2019
Điều 127 khoản 3 cấm phạt tiền và cấm cắt lương thay cho xử lý kỷ luật lao động. Hệ thống **vẫn
cho ghi nhận** — nhưng hai khoản đó mang cảnh báo hiện ngay cạnh ô nhập, không giấu trong tài
liệu. Cách hợp pháp cho thời gian không làm việc là ghi giảm **công** trên bảng chấm công, để nó
tự vào lương theo ngày công.

### Ba lỗi tiền tìm thấy trong bảng tính gốc

Đọc 7 sheet bằng bộ đọc XLSX tự viết (có giải công thức `shared`), ba thứ ảnh hưởng tiền thật:

1. **1.040.000 đ không được trừ.** Cột `AG` (tổng trừ) bỏ sót cột `AF` (trừ nửa ngày do đi muộn)
   ở 46 trên 51 dòng. Hai người có `AF` khác 0 mà không bao giờ bị trừ: Khuất Thị Kim Thư 880.000
   và Trần Thị Minh Khánh 160.000.
2. **Cột `J` dùng 9 mẫu chia khác nhau** — `$D$3`, `D3` (tương đối, trượt theo dòng), `26` cứng,
   `30` cứng, và chia cho chính số công thực tế; trên ba cột gốc `G`/`H`/`I`. Bốn người cùng chức
   danh nghỉ cùng số ngày có thể ra bốn số tiền khác nhau.
3. **Cột `Y` (BHXH công ty) dùng 32% ở dòng 19 và 28**, còn 21,5% ở mọi dòng khác.

Ngoài ra: `AI47 = K47` bỏ qua toàn bộ khoản trừ; `AI41 = W41+W42-...` cộng một **dòng ma** không
có mã nhân viên, không có họ tên, mang khoản thu nhập thứ hai "Lương HCM" 4.500.000. Dòng ma đó ở
đây là một khoản bình thường (`luong_dia_diem`), không phải một dòng vô danh phải nhớ mà cộng.

### Thêm

- **Công chuẩn tháng cố định** (`tham_so_luong.cong_chuan_thang`) cho công ty muốn chia theo một
  số cố định như bảng cũ. Mặc định **0 = đếm theo lịch thật** — hành vi cũ, không đổi lặng lẽ.
- **Làm tròn thực lĩnh** (`lam_tron_den`, bảng cũ làm tròn 100 đ). Số gốc vẫn giữ trên phiếu.
- **Loại hợp đồng** chụp vào phiếu — thay ba cột lương gốc tách rời của bảng cũ.
- `GET /api/ky-luong/:id/xuat-xlsx` — xuất Excel, **cột riêng cho từng khoản** có dùng trong kỳ.
- Nhân viên xem phiếu của mình thấy **từng khoản**, không phải một con số "phụ cấp" gộp.

### Sửa

- **Bản chốt và tệp tải về từ giao diện giờ dựng từ một chỗ duy nhất** (`bang_xuat.ts`). Trước đó
  là hai danh sách cột chéo nhau, nên bản được duyệt và bản kế toán đối chiếu là hai tệp khác nhau
  mang cùng tên tháng.
- Bộ xem nhanh XLSX cắt ở **30 cột** và không báo gì — một bảng 40 cột hiện ra 30 cột như thể đủ.
  Nâng lên 64 cột, và cắt cột giờ cũng bật cờ `cat_bot` như cắt dòng.

## [1.33.2] — 2026-08-20

**Không có đường xóa hồ sơ nhân viên.** Đúng với người thật — nhưng để dọn 8 hồ sơ demo
(`NVDEMO01`–`08`) thì nhân sự không có công cụ nào ngoài SQL tay, mà xóa tay một nhân viên kéo
theo **21 bảng cascade** và `set null` ở 5 bảng khác. Không ai nên phải gõ câu đó.

`DELETE /api/nhan-vien/:id` với **ba hàng rào**, mỗi cái chặn một kiểu mất mát khác nhau:

1. **Phải đã cho nghỉ việc.** Xóa là bước thứ hai có ý, không phải một nút cạnh nút sửa.
2. **Không được có phiếu lương.** Đã trả lương cho ai thì hồ sơ người đó ở lại vĩnh viễn — đó là
   chứng từ, không phải dữ liệu tiện ích.
3. **Không được còn tài khoản đăng nhập.** Gỡ tài khoản trước là một quyết định về quyền truy cập,
   không phải hệ quả phụ của việc xóa hồ sơ.

Và **không gửi `xac_nhan` thì chỉ đếm**: trả về số lần quẹt sẽ thành vô chủ, số ngày công, số tệp
hồ sơ, số đơn từ sẽ mất. Con số đó phải nhìn thấy *trước* khi bấm, không phải đọc lại trong nhật
ký sau đó.

Xóa thật thì **mã định danh đi theo** — PIN được giải phóng, đúng như mong đợi khi dọn dữ liệu
thử: `9001`–`9008` trả lại cho dải cấp phát. Còn **lần quẹt ở lại nhưng thành vô chủ**: bằng chứng
gốc không biến mất cùng hồ sơ. Có bài kiểm giữ cả hai nửa đó.

### Dữ liệu thật trên VPS

Bốn câu kiểm hôm nay cho thấy: 22 người có họ tên nằm trong ô số điện thoại (đã dọn, cả 22 đều có
`so_dien_thoai` giống hệt `ho_ten` — lỗi ánh xạ có hệ thống bên ERP, không phải rác ngẫu nhiên),
và trong 10 PIN đang dùng thì **8 là của hồ sơ demo**. Chỉ 2 PIN thuộc người thật.

## [1.33.1] — 2026-08-20

**Khai một máy thì xóa không được — chỉ tắt được.** Lộ ra khi chạy bộ giả lập máy trên VPS: muốn
chạy nó phải khai một serial, và khai xong thì cái máy giả đó nằm lại danh sách vĩnh viễn. Đúng
tình trạng của `THU001` — máy giả lập từ 07/08, đã tắt, mang theo một lệnh chờ không ai lấy, và
gỡ được chỉ bằng SQL tay.

`DELETE /api/thiet-bi/:id` + nút **Xóa** (chỉ hiện khi máy đã tắt):

- **Tắt trước, rồi xóa.** Hai bước là cố ý: xóa một máy đang chạy thì nó bắt đầu ăn `401` và không
  ai biết vì sao. Bắt tắt trước nghĩa là người xóa nhìn thấy máy đã ngừng nhận dữ liệu.
- **Lịch sử lần quẹt ở lại.** `lan_quet.thiet_bi_serial` là chữ tự do không có khóa ngoại, nên
  bảng công cũ không đổi và vẫn trả lời được *"lần quẹt này từ máy nào"*. Có bài kiểm đẩy một lần
  quẹt qua máy rồi xóa máy và đòi lần quẹt còn nguyên — nếu ai đó thêm khóa ngoại `on delete
  cascade` vào đây, bài kiểm đỏ trước khi bảng công thủng.
- **Dọn luôn lệnh chưa gửi**, và báo lại số lệnh đã dọn cùng số lần quẹt giữ lại.

476 unit (1 skipped) + 5 proxy + 20 thiết kế + 359 e2e.

## [1.33.0] — 2026-08-19

**Mỗi trang có khung "Quy trình ở trang này", đúng theo vai trò của người đang đăng nhập.**

Hệ thống có 20 trang và 6 vai trò, và cho tới giờ người dùng mới phải tự đoán thứ tự thao tác —
hoặc hỏi. Giờ mỗi trang nói: trang này để làm gì, các bước theo thứ tự (chỉ những bước **vai trò
của bạn** làm được), và các bẫy thật của trang đó.

Khai **một chỗ** trong `web/src/huong_dan.ts`, vẽ **một chỗ** trong `App.tsx` ngay trên nội dung.
Không trang nào tự viết hướng dẫn của nó: 20 chỗ viết riêng thì sau vài tháng chúng nói khác
nhau, và chỗ lệch nguy hiểm nhất là giao diện hướng dẫn một đằng còn máy chủ làm một nẻo.

Khung **đóng được và nhớ theo từng trang**. Người dùng quen đóng một lần và nó ở nguyên thế — một
khung hướng dẫn không đóng được là khung người ta học cách nhìn xuyên qua, và lúc đó các dòng cảnh
báo thật sự quan trọng cũng bị nhìn xuyên qua.

### Lưu ý phải là bẫy thật

*"Nhớ lưu dữ liệu"* thì không ai đọc. Mỗi dòng trong phần lưu ý là một chỗ đã làm sai thật, hoặc
một ràng buộc pháp lý:

- Đổi ca **không** tự tính lại bảng công cũ.
- Duyệt kỳ lương **khóa** tháng đó.
- Tết âm lịch **phải tự thêm mỗi năm** — quên là cả công ty bị tính vắng.
- Máy đang tắt không nhận lệnh; địa chỉ máy chủ không gửi xuống được, phải gõ trên máy.
- Cảnh báo 40 giờ OT/tháng (Điều 107) là cảnh báo, **không chặn**.
- Hợp đồng xác định thời hạn hết hạn mà vẫn làm việc thì sau 30 ngày tự thành không xác định thời
  hạn (Điều 20.2).
- Chỉ Trưởng phòng nhân sự được thay/gỡ tệp đã nạp.
- Đồng bộ SharePoint là **một chiều và xóa lan theo**.

### Một lỗi phân quyền tìm ra khi làm việc này

Máy chủ coi `truong_phong_nhan_su` **ngang** `nhan_su` (`can_nhan_su`), nhưng giao diện thì không:
`la_nhan_su()` chỉ nhận `admin` và `nhan_su`, và kiểu `VaiTro` của web thậm chí không liệt kê vai
trò đó. Hậu quả: người mang vai trò Trưởng phòng nhân sự đăng nhập web thì **cả nhóm "Hệ thống" và
các trang nhân sự bị ẩn**, trong khi máy chủ vẫn cho vào. Họ thấy một ứng dụng cụt và không có gì
nói vì sao.

Sửa, và thêm một bài kiểm đọc **cả hai tệp** rồi đòi hai tập vai trò bằng nhau. Đã chứng minh bằng
cách trả lại bản cũ: bài kiểm đỏ đúng chỗ.

### Guard cho chính bảng hướng dẫn

`thiet_ke/huong_dan.test.mjs` đối chiếu ba mặt: mọi trang trong thanh điều hướng phải có hướng
dẫn, không có hướng dẫn cho trang đã gỡ, và mọi tên vai trò nhắc trong bảng phải có thật trong
`api.ts` — gõ nhầm `truong_phong_hr` thì bước đó không hiện với ai cả, im lặng tuyệt đối.

Sửa kèm: README nói ngược chiều PIN ở mục *Việc nhân sự phải làm sau khi cài* (*"điền PIN máy đúng
bằng số ID đã khai trên máy"*) — từ `1.32.3` thì hệ thống cấp số, máy làm theo. Bảng phân quyền
cũng thiếu hai vai trò `truong_phong_nhan_su` và `cho_duyet`.

476 unit (1 skipped) + 5 proxy + **20** thiết kế + 357 e2e.

## [1.32.3] — 2026-08-19

**Hệ thống cấp PIN, máy làm theo — không bao giờ ngược lại.**

Trước bản này nhân sự tự nghĩ ra PIN rồi gõ vào phần mềm và hy vọng nó khớp số đã khai trên máy.
Với một máy thì không sao. Với nhiều máy thì đó là đường chắc chắn đến chấm công sai tên: PIN
**là** danh tính, và bộ tiếp nhận tra PIN ra người trên phạm vi **toàn công ty** chứ không lọc
theo máy. Hai văn phòng cùng đánh số từ 1 thì anh A ở VP2 và anh B ở VP1 là cùng một người dưới
mắt hệ thống — và không có gì báo, vì máy chỉ gửi lên "PIN 1".

Di trú `026` (`thiet_bi.pin_tu`, `pin_den`) + `dinh_danh/cap_pin.ts` + nút **Cấp PIN** trên thẻ
*Mã ở các hệ thống* của hồ sơ.

Luồng đóng lại: chọn máy → hệ thống lấy **số còn trống đầu tiên trong dải của máy đó** → cho xem
trước → ghi vào bảng mã định danh và đồng bộ cột → màn hình chỉ ra hai việc còn lại phải làm
**tại máy** (tạo user đúng số đó, rồi đăng ký khuôn mặt/vân tay).

### Bốn quyết định trong bộ cấp phát

- **Số còn trống đầu tiên, không phải `lớn nhất + 1`.** PIN của người đã nghỉ được thu hồi để lại
  lỗ trống, và tái sử dụng lỗ đó là đúng — dải PIN của một văn phòng hữu hạn.
- **Tránh cả số đang nằm ở cột cũ `nhan_vien.pin_may`**, không chỉ số trong bảng. Cột vẫn có
  đường ghi vào và vẫn là đường đọc dự phòng; cấp trùng số ở đó nghĩa là hai người cùng một danh
  tính. Đã kiểm bằng cách bỏ nguồn thứ hai đi: đỏ đúng chỗ.
- **Dải đầy thì báo rõ, không tràn sang dải máy khác** — tràn ra là dẫm vào đúng thứ mà dải sinh
  ra để tránh.
- **Thử lại khi đụng nhau.** Hai người cùng bấm *Cấp PIN* một lúc thì cả hai được đề nghị cùng
  một số; unique index chặn người thứ hai, và bộ cấp phát thử lại với số kế tiếp thay vì ném lỗi.
  Không khóa bảng: cấp PIN là thao tác hiếm, còn khóa bảng thì ai cũng trả giá.

### Máy đang tắt vẫn nhận được lệnh — và lệnh nằm lại mãi mãi

Tìm ra từ chính dữ liệu trên VPS: `THU001` đang tắt mà có **1 lệnh chờ từ 07/08**. Cổng `/iclock`
chỉ tiếp máy `dang_bat = true`, nên lệnh xếp cho máy đang tắt **không bao giờ được nhận** — nhưng
giao diện vẫn báo "đã xếp lệnh". Giờ `bat_buoc_co_may` từ chối kèm lý do đọc được.

472 unit → 476 unit (1 skipped) + 5 proxy + 15 thiết kế + 357 e2e.

## [1.32.2] — 2026-08-19

**"Nạp NV" xuống máy vẫn đọc cột `pin_may`** — cùng loại lỗi vừa sửa cho đường tiếp nhận ADMS,
ở đường ngược lại. Tìm ra khi soi lại luồng cấu hình thiết bị trước khi lắp thêm máy.

Hậu quả cụ thể với nhiều máy: một người có PIN `1005` ở kho 1 và `2005` ở kho 2 thì cột chỉ chứa
được một, nên nạp xuống máy còn lại là **nạp sai PIN** — họ quẹt vào máy đó và không khớp được
ai. Lần quẹt nằm im với `nhan_vien_id` trống, không có gì báo.

- PIN lấy từ **bảng mã định danh** hợp với cột cũ — đúng nguồn mà bộ tiếp nhận ADMS dùng.
- Nhiều PIN mà không nói rõ nạp cái nào thì **400 kèm danh sách PIN**, không đoán. Đoán sai ở
  đây tốn đúng bằng việc không nạp gì.
- PIN không thuộc người đó thì từ chối, không im lặng nạp xuống.
- Hộp thoại *Nạp NV* thêm ô chọn PIN khi người đó có nhiều PIN, kèm câu nhắc chọn PIN đã khai
  **trên chính máy này**.

### Quy tắc PIN cho nhiều máy đã đổi, tài liệu nói ngược

`KET-NOI-MAY-ZKTECO.md` vẫn viết *"PIN của một người phải giống nhau trên mọi máy"* — đúng với
thời `pin_may` là một cột, sai từ bản `1.32.0`. Quy tắc bây giờ: **PIN duy nhất trên phạm vi toàn
công ty** (index bộ phận bảo đảm), còn **một người được nhiều PIN**, mỗi máy một PIN nếu dải số
đã chia sẵn. Chia dải PIN theo văn phòng vẫn cần — nó chống trùng giữa **hai người**, việc mà
phần mềm không thể biết khi người khai máy bấm nhầm.

### Thêm mục *Kiểm tra cấu hình đã tới VPS chưa*

Ba cách kiểm từ nhẹ đến chắc (xem trang Thiết bị → hỏi thẳng Postgres → chạy `gia_lap_may.mjs`),
cộng một bảng nói rõ **cái gì đi từ VPS xuống máy và cái gì không** — chỗ hay hiểu ngược, vì ADMS
là máy tự gọi lên chứ VPS không gọi xuống được. Tên máy / vị trí điền trên web **không** xuống
máy và không cần xuống; địa chỉ máy chủ thì phải gõ **trên chính máy**.

Và bốn việc khi thêm máy thứ hai, trong đó việc dễ quên nhất là thêm IP của nơi đặt máy vào
`ICLOCK_IP_CHO_PHEP` — bỏ trống ô đó nghĩa là không chặn IP nào, ai biết serial cũng đẩy được lần
quẹt giả vào cơ sở tính lương.

472 unit (1 skipped) + 5 proxy + 15 thiết kế + 352 e2e.

## [1.32.1] — 2026-08-19

**Bản 1.32.0 mở ra một đường chấm công sai tên.** Câu hỏi "mã bị dùng lại hoặc trùng thì giải
quyết thế nào" làm tôi đọc lại đường tiếp nhận ADMS, và nó khớp người **chỉ bằng
`nhan_vien.pin_may`**. Nghĩa là chuyển PIN sang người mới qua trang mã định danh mới thì:

- bảng nói PIN đó là của người mới,
- cột vẫn trỏ người cũ,
- và **máy chấm công vẫn ghi công cho người cũ**, không báo gì, cho tới ngày chốt lương.

Đúng cái lỗ mà bảng mã định danh ra đời để bịt.

### Ba chỗ sửa

1. **Ghi mã là ghi cả cột.** Bảng đặc tả giờ khai `cot_nhan_vien` + `dong_bo_cot` cho từng hệ
   thống. Thu hồi mã từ người khác thì **gỡ cột của người cũ trước rồi mới ghi cột người mới** —
   `pin_may` là UNIQUE nên thứ tự ngược lại là va vào ràng buộc, đúng bài học của bộ gộp hồ sơ.
   Đóng mã lại (`DELETE`) cũng gỡ cột.
2. **ADMS đọc bảng trước, cột sau.** Union hai nguồn nên **không thể mất khớp** so với trước, và
   thêm được hai thứ: một người có PIN ở **hai máy** giờ chấm công đúng ở cả hai (cột chỉ chứa
   nổi một), và chuyển PIN có hiệu lực ngay. Hai nguồn nói khác nhau thì bảng thắng và ghi một
   dòng cảnh báo vào log.
3. **Nhập CSV cũng ghi vào bảng.** Đây là chỗ tôi phát hiện muộn: nhập CSV ghi thẳng `pin_may` mà
   không ghi mã định danh, nên một lần nhập là lệch ngay — và vì ADMS ưu tiên bảng, lệch theo
   chiều đó có nghĩa là chấm công cho **người cũ**. Một đường ghi bỏ qua nguồn sự thật thì cái
   "nguồn sự thật" chỉ là tên gọi.

`microsoft_email` cố ý chỉ ghi cột **khi cột đang trống**: một người có nhiều alias trong Entra,
còn cột `email` chỉ chứa một, nên thêm alias không được đè lên email chính — đó là khóa đăng nhập
Microsoft đường dự phòng.

`ma_nv` thì **không** đổi được từ trang mã định danh nữa (400 kèm lý do): đổi nó còn kéo theo đổi
tên thư mục kho tệp trên đĩa và đường dẫn trên SharePoint, nên nó chỉ có một cửa là form hồ sơ.

### Bài kiểm đầu tiên của tôi không bắt được quy tắc ưu tiên

Tôi đảo `bang ?? cot` thành `cot ?? bang` để thử, và **cả bộ vẫn xanh** — vì trong mọi bài kiểm
tôi vừa viết, hai nguồn luôn đồng ý, nên thứ tự ưu tiên không đổi kết quả gì. Bài kiểm đang mô tả
một tình huống dễ chứ không phải tình huống nó cần canh.

Sửa: thêm một bài **tạo cho lệch bằng SQL thuần** (đặt cột cho một người, bảng cho người khác) rồi
đòi bảng thắng. Đảo lại thứ tự thì bài đó đỏ. Cộng một bài nhập CSV rồi đòi PIN có mặt trong bảng
— tắt phần ghi mã đi thì đỏ.

Đây cũng là lần thứ hai trong hai ngày tôi tưởng mình đã chứng minh một bài kiểm mà chưa: lần
trước đỏ vì `401` do lọc theo tên bài, lần này xanh vì bài kiểm không dựng đúng tình huống.

472 unit (1 skipped) + 5 proxy + 15 thiết kế + 348 e2e.

## [1.32.0] — 2026-08-19

**Bảng mã định danh: một người, nhiều hệ thống, mỗi hệ thống một mã.** Dữ liệu nhân sự vào hệ
thống này từ nhiều nguồn, và trước bản này mỗi mã là **một cột** trên `nhan_vien` — `pin_may`,
`erp_user_id`, `erp_username`, `ma_erp`, `email`. Cách đó vỡ ở bốn chỗ, và cả bốn đều đã xảy ra
trên dữ liệu thật:

1. **Một người một mã.** `pin_may` là một cột, nên một người không thể có PIN ở hai máy, và đăng
   ký lại là ghi đè — mất dấu vết.
2. **Không có lịch sử.** PIN 1 chuyển sang người mới thì không còn vết nào nói những lần quẹt cũ
   thuộc ai.
3. **Mã Microsoft ổn định bị bỏ đi.** `id_token` có `oid` — mã không bao giờ đổi — và hệ thống
   trích nó ra rồi *không lưu*.
4. **Thêm nguồn mới = thêm cột** + sửa mọi chỗ join.

Hậu quả thấy được là hai cặp trùng phải gộp bằng tay tuần này: `ERP147`/`HR-01` và `BGD`/`ERP4`.

Di trú `025` + `dinh_danh/he_thong.ts` (bảng đặc tả) + `dinh_danh/nghiep_vu.ts` (nghiệp vụ) +
trang **Hệ thống → Mã định danh** + thẻ mã trong tab *Thông tin chung* của hồ sơ.

### Chống trùng do cơ sở dữ liệu bảo đảm

```sql
create unique index ma_dinh_danh_dang_hieu_luc_idx
  on ma_dinh_danh(he_thong, ma_chuan) where hieu_luc_den is null;
```

Một mã **đang hiệu lực** thuộc đúng một người. Các dòng đã đóng lại thì tự do trùng nhau — đúng
thế mới kể lại được lịch sử một PIN đã qua tay ba người.

Đây là *index* chứ không phải *constraint* vì Postgres không cho `unique constraint` có `where`.
Hệ quả: nó không nằm trong `pg_constraint` nên bộ gộp hồ sơ không "thấy" nó — không sao, vì bộ gộp
chỉ đổi chủ sở hữu, và index này bảo đảm hai người không thể cùng mang một mã đang hiệu lực nên
chuyển cả hai sang một người không thể chạm nhau. Có bài kiểm giữ điều đó.

### Quy tắc trung tâm: không âm thầm lấy mã của người khác

Đó chính là cách "trùng" xuất hiện — một mã đi từ người này sang người kia trong một lần chạy tự
động, và ba tháng sau không ai biết vì sao lần quẹt của ông A lại tính cho bà B. Nên `gan_ma` **từ
chối** và nói rõ *ai* đang giữ:

> PIN máy chấm công "1" đang thuộc HR-07 — Phan Song Hào. Một mã đang hiệu lực chỉ thuộc một
> người. Nếu đúng là cần chuyển sang người này, hãy xác nhận thu hồi.

Chỉ khi người gọi nói rõ là có ý thì mã mới đổi chủ, và dòng cũ được **đóng lại kèm ghi chú**,
không bị xóa. Trên giao diện, ô xác nhận chỉ hiện **sau khi** máy chủ từ chối lần đầu — để nhìn
thấy tên người đang giữ trước khi quyết định.

### `oid` của Microsoft: từ chỗ bị bỏ đi thành khóa khớp người đầu tiên

Đăng nhập Microsoft giờ khớp theo thứ tự `oid` → `email_microsoft` → email hồ sơ. Trước bản này
chỉ khớp `lower(email)`, nên đổi email trong Entra là mất khớp, và nếu tên miền nằm trong danh
sách cho phép thì lần đăng nhập kế tiếp **tạo một tài khoản thứ hai** cho cùng một người. `oid` đi
ra từ `id_token` đã qua kiểm chữ ký/issuer/audience/nonce nên đáng tin ngang email — thật ra hơn,
vì không ai đổi được nó.

Bước ghi nhớ danh tính **không bao giờ làm hỏng việc đăng nhập**: người ta đã xác thực xong với
Microsoft, nên một mã trùng ở đó chỉ được ghi log.

### Các cột cũ vẫn còn, và có báo cáo đối soát

Di trú này **không đổi đường đọc**: `pin_may` vẫn là đường máy chấm công khớp người. Đổi một lần
cả ba đường khớp người là cách chắc chắn nhất để một sai sót trong backfill làm máy chấm công
ngừng khớp người **một cách im lặng** — lần quẹt không khớp thì không ai thấy gì, nó chỉ nằm đó
với `nhan_vien_id = null`.

Nên **Hệ thống → Mã định danh → Đối soát** so hai chiều: cột có mã mà bảng không, và bảng có mã mà
cột trống. Sạch thì mới bỏ được các cột cũ.

### Bài kiểm: backfill được kiểm bằng chính tệp di trú

Bài kiểm quan trọng nhất tạo một hồ sơ **bằng SQL thuần** (đúng hình dạng trước di trú), rồi
**đọc `025_ma_dinh_danh.sql` từ đĩa và chạy lại khối backfill trong đó** — không viết lại SQL
trong bài kiểm, vì một bản sao thì bài kiểm chỉ kiểm chính bản sao đó. Đã chứng minh bằng cách đổi
một dòng trong di trú: đỏ đúng chỗ.

Và một bài thứ hai chứng minh bộ đối soát **thật sự nhìn** — một bộ đối soát luôn trả rỗng thì
cũng "sạch", và đó là kiểu yên tâm sai nhất.

Bài kiểm đăng nhập bằng `oid` gọi thẳng hàm khớp người thật với một email **hoàn toàn khác** mọi
thứ trong cơ sở dữ liệu; tắt nhánh `oid` đi thì nó đỏ.

### Bốn lỗi trong bài kiểm của tôi, một trong đó đáng nói

Bốn bài đầu tiên đỏ vì chính bài kiểm sai, không phải mã sai: hai bài phụ thuộc vào dữ liệu mẫu mà
các bài khác đã sửa, một bài đếm cả mã `noi_bo` sinh ra khi tạo hồ sơ qua API, và một bài viết
`order by hieu_luc_den nulls last` trong khi cần `nulls first`. Cái cuối đúng là thứ bài kiểm phải
bắt — nó khẳng định dòng đầu tiên là mã đang hiệu lực.

469 unit (1 skipped) + 5 proxy + 15 thiết kế + 341 e2e.

Tài liệu mới: [`tai_lieu/MA-DINH-DANH.md`](tai_lieu/MA-DINH-DANH.md).

## [1.31.2] — 2026-08-19

**ERP cũ trả họ tên trong trường số điện thoại, và hệ thống ghi thẳng nó vào cột
`so_dien_thoai`.** Thấy trên dữ liệu thật, trong đúng báo cáo chạy thử của bộ gộp:

```
  Sẽ mang sang hồ sơ giữ (ô đang để trống):
    so_dien_thoai        Trần Hoàng Anh Vinh
```

`ERP4` có `phoneNumber = "Trần Hoàng Anh Vinh"`. Không có chỗ nào trong hệ thống kiểm ô này —
không phải chỉ bộ đồng bộ ERP, mà **không nơi nào**: `so_dien_thoai` là ô chữ tự do ở mọi đường
vào. Nên giá trị đó đi từ ERP vào cơ sở dữ liệu rồi ra hồ sơ nhân sự.

Thêm `la_so_dien_thoai` (đếm **chữ số**, phải có ít nhất 7) dùng chung cho cả hai đường: bộ đồng
bộ ERP và bộ gộp hồ sơ. Quy tắc lỏng có ý — đủ để loại tên người, `N/A`, `chưa cập nhật`; và
không loại `0912.345.678`, `+84 912 345 678`, `(024) 3822 1234`. Chặt hơn nữa thì sẽ từ chối số
thật của người thật, và hỏng theo hướng đó tốn hơn vì không ai biết mình vừa mất số điện thoại.

- Đồng bộ ERP: giá trị không phải số thì **bỏ qua ô đó** (câu `update` đã có
  `coalesce($4, so_dien_thoai)` nên số đang có được giữ nguyên, không bị xóa), và báo ra ở cột
  *Chi tiết* của bảng kết quả để nhân sự sửa **bên ERP**.
- Bộ gộp: không mang giá trị đó sang bản giữ, chỉ cảnh báo.

### `truong_can_doi` phải dùng đúng bộ lọc mà câu ghi dùng

Đây là bài kiểm quan trọng nhất của nhóm này. Bộ đồng bộ so "giá trị ERP" với "giá trị trong cơ
sở dữ liệu" để quyết định có `cập nhật` hay không. Nếu chỗ so **nhận** một giá trị mà câu ghi
**bỏ**, thì mỗi lượt đồng bộ sẽ báo `cập nhật` cho người đó, ghi không được gì, rồi báo lại lượt
sau — mãi mãi, và không ai truy ra được từ giao diện. Đã kiểm bằng cách trả lại `chuan_chuoi`:
bài kiểm đỏ đúng chỗ.

### `erp/dong_bo_nhan_vien.ts` trước hôm nay không có một bài kiểm nào

Và nó là đoạn mã ghi trực tiếp vào bảng `nhan_vien` của người thật, hàng loạt, từ một hệ thống
khác không ai ở đây kiểm soát. Thêm `test/dong_bo_erp.test.ts` (7 bài): bộ kiểm số điện thoại với
dữ liệu thật cả hai chiều, `truong_can_doi` khớp bộ lọc, ERP để trống thì không coi là cần đổi,
`ly_do_bo_qua`, `ma_nv_tu_erp`, chuẩn hóa email.

Bộ canh danh sách test trong `package.json` đỏ đúng lúc tôi chưa khai tệp mới — đúng việc của nó.

Sửa kèm: báo cáo gộp in `erp_dong_bo_luc` bị cắt còn ngày, giờ in đủ ngày giờ.

459 unit (1 skipped) + 5 proxy + 15 thiết kế + 325 e2e.

## [1.31.1] — 2026-08-19

**Bộ gộp tự huỷ việc nó vừa làm.** Bản `1.31.0` chạy thật trên VPS ngay hôm nay, gộp `HR-01` ←
`ERP147` sạch sẽ — 2 dòng, xóa hồ sơ bỏ, dọn thư mục. Rồi tôi đọc lại bộ đồng bộ ERP và thấy nó
khớp người theo `erp_user_id` (unique index) trước, rồi mới đến `email`. Xóa bản `ERP147` là xóa
luôn số ERP đó khỏi cơ sở dữ liệu, nên **lượt Đồng bộ thật kế tiếp sẽ tạo lại đúng bản vừa xóa**
và cặp trùng quay về nguyên vẹn. Không báo gì, vài giờ sau, do một người khác bấm nút.

`pin_may` cũng vậy: nếu người dùng chọn giữ bản không có PIN thì mất khóa nối log máy ZKTeco, và
mọi lần quẹt sau đó không biết là của ai.

Sửa: các ô của bản giữ **đang để trống** thì được điền từ bản bỏ trước khi xóa —
`erp_user_id`, `erp_username`, `erp_dong_bo_luc`, `ma_erp`, `email`, `pin_may`, cộng
`phong_ban_id`, `ca_lam_id`, `chuc_danh`, `nguoi_quan_ly_id`, `ngay_vao`, `ngay_chinh_thuc`,
`so_dien_thoai`. Hai bên đều có giá trị và khác nhau thì **không ghi đè**, chỉ báo chỗ lệch.

### Bốn cột cố ý KHÔNG mang theo

`dang_hoat_dong` và `ngay_nghi_viec` — mang theo là có thể âm thầm cho một người đã nghỉ thành
đang làm. `duoc_cham_cong_dien_thoai` — mặc định tắt để chống gian lận, mang `true` từ một bản ghi
sắp bị xóa là âm thầm mở một cửa chống gian lận. `so_ngay_phep_nam` — `not null default 12` nên
"để trống" không phân biệt được với "cố ý đặt 12". Bốn cột này lệch nhau thì **báo**, không tự
chọn.

Guard: một bài kiểm đọc danh sách cột của `nhan_vien` từ `information_schema` và đòi mọi cột phải
nằm trong đúng một trong hai danh sách. Thêm cột mới mà không quyết định thì test đỏ — thay vì im
lặng làm mất dữ liệu ở lần gộp đầu tiên sau đó.

### Thứ tự trong giao dịch: xóa trước, điền sau

`pin_may` và `erp_user_id` đều UNIQUE, nên điền trước khi xóa là đụng chính ràng buộc của bản đang
bị bỏ. Giá trị đã đọc vào bộ nhớ từ trước nên không mất gì. Đã kiểm bằng cách đảo lại thứ tự:
Postgres `23505 unique_violation`, đúng chỗ.

### Hai lần "chứng minh" đầu của tôi không có giá trị

Tôi thử chứng minh bài kiểm bắt được lỗi bằng `--test-name-pattern`, và nó đỏ — nhưng đỏ vì
`401 Chưa đăng nhập`: lọc theo tên bỏ luôn bài đăng nhập tạo token cho cả bộ. Chạy lại **toàn bộ**
bộ e2e mới là chứng minh thật: `null !== 990147` kèm thông điệp "MẤT liên kết ERP", rồi `23505`
cho phép thử đảo thứ tự.

**Nếu bạn đã gộp bằng bản 1.31.0**, xem
[`GOP-HO-SO-TRUNG.md`](tai_lieu/GOP-HO-SO-TRUNG.md) mục *Sửa một lần gộp đã làm mất liên kết ERP*
— nối lại được qua **Chạy thử** của trang Đồng bộ ERP, không cần SQL tay.

Sửa kèm: thông điệp sau khi gộp nhắc `npm run sap_xep_tep --that` thiếu hai dấu gạch. `npm run x
--that` thì npm ăn tham số, script chạy ở chế độ thử, và người đọc tưởng đã dọn xong. Giờ là
`-- --that`, có bài kiểm giữ.

452 unit (1 skipped) + 5 proxy + 15 thiết kế + 324 e2e.

## [1.31.0] — 2026-08-19

**Công cụ gộp hai hồ sơ là cùng một người.** Dữ liệu thật trên VPS có `ERP147 — HOÀNG MINH NGỌC`
(đồng bộ ERP tạo) song song với hồ sơ nhân sự tự nhập cho cùng người đó. Hai hồ sơ thì lần quét
vào một bên, hợp đồng nằm bên kia, và trên SharePoint sẽ mọc **hai thư mục nhân viên** cho một
người — trong một thư viện đang có người khác dùng. Nên việc này phải xong **trước** lần đẩy thật
đầu tiên, và mục *Thứ tự bật* của `SHAREPOINT.md` giờ có bước 0 nói đúng thế.

```bash
docker compose exec may_chu npm run gop_trung                          # liệt kê cặp nghi trùng
docker compose exec may_chu npm run gop_trung -- HR-01 ERP147          # chạy thử
docker compose exec may_chu npm run gop_trung -- HR-01 ERP147 --that   # gộp thật
```

### Nó đọc khóa ngoại từ catalog, không mang danh sách bảng gõ tay

`pg_constraint` cho biết bảng nào trỏ tới `nhan_vien`. Một danh sách gõ tay thì mỗi bảng mới là
một cơ hội quên, và quên **không đỏ test** — chỉ là một hồ sơ gộp thiếu, phát hiện vài tháng sau
khi bảng lương lệch. Có bài kiểm đối chiếu số bảng công cụ tìm được với số khóa ngoại đếm trực
tiếp từ `pg_constraint`, và đòi có mặt `bang_cong_ngay`, `lan_quet`, `ho_so_tep`, `don_tu`,
`phieu_luong`, `nguoi_dung`.

### Dòng trùng thì mất theo hồ sơ bỏ, và con số đó được in ra

`bang_cong_ngay` có `unique (nhan_vien_id, ngay)`: nếu cả hai hồ sơ đều có dòng ngày 15/07 thì
dòng của bản bỏ không chuyển sang được. Công cụ giữ dòng của bản giữ lại, để dòng kia ở lại và
mất khi xóa hồ sơ bỏ — in riêng ở dòng `TRÙNG`, **cả trong lần chạy thử**, để xem trước rồi mới
quyết. `lan_quet` không có ràng buộc UNIQUE nào chứa `nhan_vien_id` nên mọi lần quét chuyển sang
trọn vẹn, và **Tính lại tháng** dựng lại bảng công từ đó.

### Mặc định chạy thử, thứ tự hai mã không có mặc định

Tham số một là mã **giữ**, hai là mã **bỏ**. Gõ ngược là gộp ngược — lần quét của bản đúng thành
của bản bị bỏ rồi bản đúng bị xóa. Không đoán được nên không mặc định: thiếu tham số thì chỉ liệt
kê. Từ chối khi cả hai hồ sơ đều có tài khoản đăng nhập (gộp sẽ để lại một tài khoản mồ côi).
Họ tên khác nhau thì **cảnh báo, không chặn** — `HOÀNG MINH NGỌC` với `Hoàng Minh Ngọc` là cùng
người, còn hai người cùng tên thì thật sự là hai người.

### Hai lỗi trong lần đầu viết

- `array_agg(a.attname)` trả `name[]`, mà node-postgres **không phân giải** kiểu đó thành mảng JS
  — nó trả về chuỗi `{nhan_vien_id,ngay}` và `.filter` báo "not a function". Phải
  `array_agg(a.attname::text)`.
- Câu đếm cho bảng **không có** ràng buộc UNIQUE chỉ dùng một tham số, và Postgres từ chối hẳn
  một tham số không xuất hiện trong câu (`could not determine data type of parameter $1`). Tách
  thành ba nhánh rõ ràng thay vì lắp chuỗi điều kiện dùng chung.

Tài liệu mới: [`tai_lieu/GOP-HO-SO-TRUNG.md`](tai_lieu/GOP-HO-SO-TRUNG.md).

452 unit (1 skipped) + 5 proxy + 15 thiết kế + 318 e2e.

## [1.30.1] — 2026-08-19

**Nhãn loại bị lặp vào giữa tên tệp.** Dữ liệu thật trên VPS lộ ra ngay ở lần xem trước đường dẫn
đầu tiên:

```
CCCD - CCCD (scan 2 mặt) - 18-08-2026.pdf
CV - CV Đơn xin việc - 19-08-2026.pdf
```

Quy ước HCNS là `[LOẠI] SỐ [MÃ] - [TÊN CÓ DẤU] - DD-MM-YYYY`. Phần `[LOẠI]` đã nói **là gì**, nên
phần giữa phải nói **là của ai**. Tôi để nó ưu tiên tên danh mục tài liệu, nên nhãn lặp lại chính
nó và tên người mất hẳn — mở thư mục ra thì thấy ba tệp cùng một tên của ba người khác nhau.

Sửa: với `tai_lieu` / `thong_tin`, phần giữa là **họ tên**. `bien_ban` thì giữ nguyên trích yếu —
nhãn của nó là 'BIÊN BẢN', một từ chung, nên trích yếu ("Cam kết bảo mật") mới là thứ phân biệt
được, đúng như ví dụ `QĐ SỐ 05 - BỔ NHIỆM - 15-07-2026` của đặc tả.

Mã danh mục chưa có nhãn riêng thì dùng **chính tên danh mục viết hoa** thay vì chữ "HỒ SƠ" chung
chung — `PHỤ LỤC HĐLĐ - Nguyễn Văn A - …` thay vì `HỒ SƠ - Nguyễn Văn A - …`.

### Bài kiểm cũ vẫn xanh, và đó là vấn đề

Bài e2e chỉ kiểm nhãn **có mặt** (`dd.includes('/CV - ')`) nên `CV - CV Đơn xin việc` vẫn qua.
Siết lại: tên tệp phải chứa họ tên nhân viên, và nhãn không được xuất hiện quá một lần. Đã kiểm
bằng cách đặt lại đúng dòng cũ — bài kiểm đỏ đúng chỗ.

452 unit (1 skipped) + 5 proxy + 15 thiết kế + 311 e2e.

## [1.30.0] — 2026-08-19

**Bốn loại đơn còn thiếu: làm thêm giờ, đổi ca, đi công tác, thôi việc.** Nhân viên tự lên đơn
trên app, trưởng phòng + nhân sự duyệt trên web (đúng người duyệt như nghỉ phép), duyệt xong thì
bản đơn DOCX lưu vào kho hồ sơ.

Di trú `024` + `don_tu/loai_don.ts` + `don_tu/nghiep_vu.ts` + một bộ route dùng chung + tab mới
trên web và trên app.

### Một bảng, một bộ route, một đăng ký

`don_nghi_phep` và `don_giai_trinh` giữ bảng riêng: chúng có **nghĩa riêng** trong bộ tính công
(nghỉ phép đổi trạng thái ngày, giải trình ghi đè giờ vào/ra) và đã chạy thật từ đầu. Bốn loại
mới thì khác — chúng khác nhau ở vài ô dữ liệu, còn vòng đời thì giống hệt. Bốn bảng là bốn bộ
route, bốn form, bốn chỗ để lệch.

Đổi lại, một bảng chung phải có **ràng buộc theo từng loại**, nếu không nó thành một cái túi
đựng được mọi thứ và không bảo đảm gì. CSDL từ chối: đơn `doi_ca` không có ca mới, đơn
`lam_them` thiếu một mốc giờ hay có giờ kết thúc ≤ giờ bắt đầu, đơn `cong_tac` không có nơi đến,
đơn `thoi_viec` không có lý do, và đổi ca với chính mình.

`loai_don.ts` là **một chỗ khai** — tên, tiêu đề bản đơn, tiền tố tên tệp, các hàng trong DOCX.
Web và app lấy danh mục từ `/api/toi/don/loai` chứ không gõ tay lại. Thêm loại thứ năm là thêm
một mục trong bảng đó, không sửa route nào.

### Ngày đi công tác không còn bị tính là vắng

Trước bản này, một người đi công tác cả tuần hiện là **vắng cả tuần**: không có lượt quẹt nào, và
bộ tính công không biết lý do. Kế toán nhìn bảng đó thì trừ công thật.

Thêm trạng thái ngày `cong_tac` (1 công, không phạt đi muộn/về sớm vì không có giờ chuẩn để đối
chiếu với người không ở văn phòng). Thứ tự ưu tiên có lý do cho từng bước:

- **sau `nghi_phep`** — hai đơn trùm cùng một ngày là dữ liệu mâu thuẫn, và nghỉ phép là thứ
  người lao động được hưởng nên nó thắng;
- **sau `ngay_le`** — công tác trùm một ngày lễ thì người đó vẫn được hưởng ngày lễ;
- **sau `nghi_tuan`** — công tác vào ngày nghỉ tuần không biến ngày đó thành ngày công; nếu thật
  sự làm việc thì có lượt quẹt, và nhánh `nghi_tuan` tính toàn bộ vào OT.

Sáu bài kiểm giữ đúng bốn thứ tự đó. Trường `cong_tac` để **bắt buộc** trong `DauVaoTinhCong`
chứ không tuỳ chọn — nhờ thế `tsc` buộc mọi chỗ gọi phải nghĩ đến nó, thay vì một chỗ quên rồi
im lặng tính sai.

### Ba loại KHÔNG tự sửa dữ liệu gốc — ranh giới cố ý

- `lam_them` là **đăng ký trước**. Số phút OT trên bảng công vẫn tính từ lượt quẹt thật, nên
  duyệt một đơn OT không tự nhiên tạo ra giờ OT. Nếu muốn *"chỉ tính OT đã đăng ký"* thì đó là
  một quyết định khác và phải nói ra, vì nó đổi cách tính tiền.
- `doi_ca` — đổi ca làm là việc nhân sự làm trên hồ sơ nhân viên; đơn chỉ là đề nghị. Form trên
  app nói thẳng điều đó.
- `thoi_viec` — ngày nghỉ việc do nhân sự ghi vào `nhan_vien.ngay_nghi_viec`.

Đơn là **đề nghị và bản ghi**, không phải lệnh tự động sửa dữ liệu gốc. Một đơn duyệt nhầm mà tự
sửa hồ sơ thì không ai lần lại được.

### Hai cảnh báo pháp lý — cảnh báo, không chặn

- **BLLĐ 2019 Điều 107**: tổng làm thêm vượt 40 giờ/tháng. Không chặn cứng vì một số ngành được
  300 giờ/năm theo Điều 107.3 — chặn ở đây là chặn sai trong những trường hợp hợp pháp.
- **BLLĐ 2019 Điều 35.1**: hạn báo trước khi thôi việc — 45 ngày (không xác định thời hạn), 30
  ngày (12–36 tháng), 3 ngày làm việc (dưới 12 tháng). Không chặn vì Điều 35.2 có các trường hợp
  không cần báo trước. Thiếu dữ liệu hợp đồng thì **không đoán** một con số pháp lý: hàm trả
  `null` và cảnh báo nói rõ là chưa tính được.

Cả hai đều hiện cho **người làm đơn** (trên app, ngay sau khi gửi) và **người duyệt** (trên web,
trước khi bấm duyệt). Câu cảnh báo do máy chủ sinh và giao diện hiện nguyên văn — viết lại ở
tầng giao diện là để hai bản lệch nhau, và bản trên app là bản người lao động đọc.

### `chay_lay` cho app điện thoại

`dung_hanh_dong().chay` chỉ trả boolean, nên thân phản hồi không đến được tầng giao diện — và
cảnh báo pháp lý nằm trong thân phản hồi. Thêm `chay_lay<T>` như web đã có ở 1.24.0. Cách "sửa"
dễ mắc nhất là ép kiểu `as` rồi đọc một trường không tồn tại, và kết quả là màn hình trắng.

### Ghi nhận: typecheck bắt được thứ bài kiểm bỏ qua

Năm chỗ trong bài kiểm e2e dùng `.raw` trong khi trường thật là `.tho`. Bài kiểm **vẫn xanh** vì
`.raw` chỉ nằm trong thông điệp assertion — nó chỉ hiện ra khi có gì khác đổ, tức là đúng lúc
người đọc cần nó nhất. `tsc` thấy, bộ kiểm không.

452 unit (1 skipped) + 5 proxy + 15 thiết kế + 311 e2e.

## [1.29.0] — 2026-08-19

**Đơn được duyệt thì lưu bản đơn trên hệ thống.** Nhân viên tự lên đơn và người duyệt duyệt thì
đã chạy từ trước; thiếu đúng phần cuối — **sau khi duyệt không có bản đơn nào được lưu lại**.

Di trú `023` (nhóm `don_tu`) + bộ sinh DOCX + móc lúc duyệt + đường sinh lại bằng tay.

### Bản đơn là hồ sơ của một nhân viên, nên chỗ của nó là kho hồ sơ

Không làm bảng mới. Bản đơn lưu thành một dòng `ho_so_tep` nhóm `don_tu`, `thuoc_id` trỏ về đơn
gốc. Nhờ thế nó dùng lại **toàn bộ** phần đã có: phân quyền theo nhóm, tab Hồ sơ trên web,
đường tải tệp, cây thư mục trên đĩa, sao lưu. Một bảng mới là một bản sao của tất cả những thứ
đó, và mỗi bản sao là một chỗ để lệch.

Phân quyền: người làm đơn đọc được bản đơn của chính mình; trưởng phòng đọc được bản đơn mình đã
duyệt; **không ai sửa được trừ nhân sự** — kể cả chính người làm đơn và cả người đã duyệt. Bản
đơn là bản ghi của một quyết định đã xảy ra: người làm đơn sửa được thì tờ đơn không còn là bằng
chứng về điều họ đã xin, và người duyệt sửa được thì không còn là bằng chứng về điều họ đã đồng
ý. Muốn đổi thì làm đơn mới. Gỡ tệp thì chỉ Trưởng phòng nhân sự.

### DOCX chứ không phải PDF

PDF cần **nhúng font** TrueType và tự cắt bỏ (subset) nó để hiện được tiếng Việt — WinAnsi không
có `ạ`, `ề`, `ộ`. Đó là một bộ mã dài và sai kiểu *"tệp mở được nhưng mất hết dấu"*, kiểu sai
không ai phát hiện đến lúc in ra. DOCX thì Unicode sẵn, và HR mở ra sửa được, in được, ký được.

`ghi_docx.ts` dùng lại bộ đóng ZIP của `ghi_xlsx.ts` — DOCX và XLSX là cùng một định dạng gói
(OPC), chỉ khác các tệp XML bên trong. Viết hai bộ đóng ZIP là hai chỗ để sai khác nhau.

Bộ kiểm là **vòng kín** như XLSX: sinh bằng `ghi_docx`, đọc lại bằng `trich_docx`. Ba chỗ dễ sai
được giữ lại: dấu tiếng Việt nguyên vẹn, xuống dòng trong một đoạn phải là `<w:br/>` chứ không
phải `\n`, và `sectPr` khai khổ A4 — thiếu thì Word dùng Letter và tờ đơn in ra bị cắt lề.

### Vết duyệt là lý do bản đơn tồn tại

Mỗi bản đơn có một bảng *Xác nhận phê duyệt*: kết quả, người duyệt, thời điểm, ghi chú. Không có
mấy dòng đó thì nó chỉ là bản in lại của form nhập, không chứng minh được gì. Bản gốc vẫn là dữ
liệu trong hệ thống; tệp là bản kết xuất, và tệp tự nói ra điều đó ở dòng cuối.

Chỉ sinh khi **duyệt**. Đơn bị từ chối thì không có tờ đơn nào để lưu, và sinh một bản "đã từ
chối" chỉ làm kho hồ sơ đầy giấy không ai cần. Một đơn một bản: duyệt lại thì bản cũ bị gỡ và
bản mới thay chỗ — hai bản đơn cho cùng một đơn là hai tờ giấy cùng "đã duyệt" và không ai biết
tin tờ nào.

### KHÔNG đẩy sang SharePoint — và đó là một quyết định

"Lưu trên hệ thống" đọc theo đúng nghĩa đối lập với câu trước đó về bảng chốt ("lưu SharePoint").
Không phải vì thiếu nhánh: `05.2 Đơn từ & Theo dõi phép` có sẵn và vừa đúng. Là một quyết định về
**dữ liệu**: một tờ đơn nghỉ ốm mang theo lý do nghỉ, tức là **dữ liệu sức khỏe** — dữ liệu cá
nhân *nhạy cảm* theo NĐ 13/2023. Trong hệ thống, quyền đọc tính theo từng người; trong một thư
viện dùng chung thì không.

`chon_nhanh` trả `null` cho `don_tu`, và trên trang quản trị nó hiện ở mục *Không đồng bộ* kèm
lý do đọc được — không lặng lẽ không có gì. Có bài kiểm e2e giữ điều này.

### Sinh bản đơn không được làm đổ lần duyệt

`ban_don_am_tham` nuốt lỗi: duyệt đơn là việc chính, sinh bản đơn là việc phụ, và nếu kho tệp có
sự cố (hết đĩa, sai quyền thư mục) thì đơn **vẫn** phải duyệt được — nhân sự đang chờ và bảng
công phụ thuộc vào nó. Đổi lại phải có đường sinh lại, nếu không thì một đơn đã duyệt có thể
vĩnh viễn không có bản đơn: `POST /api/duyet/nghi-phep/:id/ban-don` và bản giải trình tương ứng.

### Ghi nhận: bài kiểm bắt được khóa tháng đang chạy thật

Bài e2e cho đơn giải trình lúc đầu chọn ngày `NGAY` và trả `409` — vì tháng đó vừa bị chốt cứng
do kỳ lương đã duyệt (1.28.0). Test chọn sai ngày, nhưng nó cho thấy khóa tháng chạy đúng qua cả
đường đơn từ.

**Còn thiếu:** hiện chỉ có hai loại đơn (nghỉ phép, giải trình). Xem phần trả lời trong hội thoại
về các loại đơn khác.

430 unit (1 skipped) + 5 proxy + 15 thiết kế + 298 e2e.

## [1.28.0] — 2026-08-19

**Bảng chốt cuối cùng, sau khi được duyệt, lưu SharePoint.** Trước bản này bảng công và bảng
lương chỉ là **dữ liệu tính ra**, xem trên web — không có tệp nào tồn tại để đẩy đi đâu.

Di trú `022` (`ban_chot`) + bộ sinh XLSX (đã thêm ở 1.27.x) + móc lúc duyệt kỳ lương + trang
**Bảng lương → Bản chốt đã duyệt**.

### Một lần duyệt sinh ra HAI bảng

Người duyệt bảng lương đang duyệt luôn bảng chấm công mà bảng lương được tính *từ đó*. Tách
thành hai lần duyệt riêng nghĩa là có thể tồn tại một bảng lương đã duyệt dựa trên một bảng công
chưa duyệt — không ai giải thích được trạng thái đó cho thanh tra lao động.

| | |
|---|---|
| Bảng lương tháng | `04 TIỀN LƯƠNG – THUẾ TNCN/04.1 Thang bảng lương & Bảng lương/` |
| Bảng chấm công tháng | `05 CHẤM CÔNG – NGHỈ PHÉP/05.1 Bảng chấm công tháng/` |

### Ngoại lệ hẹp cho quy tắc ba cấp

Bảng cả công ty **không thuộc về nhân viên nào**, nên đây là ngoại lệ duy nhất: tệp nằm thẳng
trong nhánh, không có thư mục nhân viên. Chỉ hai nhánh khai trong `NHANH_CAP_CONG_TY` nhận được
tệp hai cấp; ở mọi nhánh khác một tệp không có thư mục nhân viên là một tệp không thuộc về ai.

Có bài kiểm chạy qua **toàn bộ** bảng `NHANH` và xác nhận đúng hai nhánh đó cho phép, còn lại từ
chối. Và hai nhánh đó vẫn nhận tệp ba cấp bình thường — `04.1` giữ cả quyết định lương từng người.

### Khóa cứng bảng công của tháng đã duyệt lương

Lúc duyệt, bảng công của tháng đó bị đặt `da_chot`, và `mo-chot-thang` cho tháng đã có bảng lương
duyệt bị **từ chối** (`409`).

Đây là một lỗi tính toàn vẹn có thật, tồn tại từ trước và không liên quan đến SharePoint: mở lại
bảng công sau khi lương đã duyệt nghĩa là có thể tồn tại một bảng lương đã chốt — đã có người ký
— dựa trên những con số giờ không còn như thế. Muốn sửa thì phải hủy kỳ lương trước.

### Bản gốc pháp lý không phải tệp XLSX

Bản gốc là dữ liệu trong `bang_cong_ngay` / `phieu_luong` cộng với `ban_chot.duyet_boi` và
`ban_chot.duyet_luc` — chúng trả lời được *"ai chốt con số này, lúc nào"*. Tệp chỉ là bản kết
xuất, sinh lại được.

Đó là lý do tệp bản chốt **được phép ghi đè** (trả lại rồi duyệt lại thì bản mới thay bản cũ),
khác hẳn kho tệp hồ sơ nơi bản scan CCCD không bao giờ được ghi đè. `ban_chot` có
`unique (loai, ky)`: hai bản chốt cùng một tháng là hai con số cùng "chính thức", và không ai
biết tin bản nào.

### Trên đĩa: `_ban_chot/`

`_ban_chot/<loại>/<YYYY-MM>_<loại>_<hex>.xlsx` — dạng đường dẫn thứ ba, khai tường minh trong
`ten_tep.ts`. Bắt đầu bằng `_` là cố ý: đường dẫn hồ sơ nhân viên phải bắt đầu bằng chữ hoặc số,
nên `_ban_chot` không thể trùng với thư mục của bất kỳ nhân viên nào — kể cả một mã nhân viên
tình cờ đặt tên là `ban_chot`. Trong đường dẫn không có một ký tự nào đến từ người dùng.

`luu_ban_chot` tự kiểm lại kết quả của chính nó bằng `duong_dan_hop_le`: nếu ai sửa bộ sinh lệch
khỏi bộ kiểm thì tệp ghi được nhưng **không đọc lại được** — im lặng tuyệt đối.

### Bộ san bằng: bản chốt so cả `so_byte`

Khác nguồn hồ sơ nhân viên. Một bản chốt duyệt lại có *cùng* đường dẫn (cùng kỳ) nhưng nội dung
khác. Chỉ so đường dẫn thì bản mới không bao giờ được đẩy lên, và trên SharePoint mãi mãi là bản
duyệt lần đầu.

### Nhánh `05.1` đã có nguồn

Nên nó rời `NHANH_CHUA_CO_NGUON`. Bài kiểm "mọi nhánh phải có nguồn" bắt đúng lúc đó, và nó buộc
tôi dạy cho nó nguồn thứ hai (bản chốt) thay vì để bảng kia nói dối.

`05.2 Đơn từ & Theo dõi phép` vẫn chưa có nguồn — `don_nghi_phep` không có cột tệp. Xem
`KE-HOACH-TRIEN-KHAI.md` mục 3.2, kèm lưu ý: giấy nghỉ ốm là dữ liệu sức khỏe, tức là dữ liệu cá
nhân **nhạy cảm** theo NĐ 13/2023.

### Sửa khi viết bộ kiểm

`danh_sach_ban_chot` truy vấn `nguoi_dung.email` — cột không tồn tại (tên thật là
`ten_dang_nhap`). Trang danh sách trả `500`. Bài kiểm e2e bắt được.

419 unit (1 skipped) + 5 proxy + 15 thiết kế + 287 e2e.

## [1.27.0] — 2026-08-19

**Mở nhánh `06 TUYỂN DỤNG & THỬ VIỆC` trên SharePoint.** Tên bốn thư mục con của `05` và `06`
đã lấy từ SharePoint thật và khớp từng ký tự:

```
05 CHẤM CÔNG – NGHỈ PHÉP/05.1 Bảng chấm công tháng
05 CHẤM CÔNG – NGHỈ PHÉP/05.2 Đơn từ & Theo dõi phép
06 TUYỂN DỤNG & THỬ VIỆC/06.1 Yêu cầu tuyển & CV ứng viên
06 TUYỂN DỤNG & THỬ VIỆC/06.2 Đánh giá phỏng vấn & thử việc
```

Ứng dụng ghi vào **thư mục con**, không bao giờ ghi thẳng vào `05` hay `06`. Hai thư mục cha
đang có người dùng thật; thả một tệp vào giữa khu vực của họ thì lượt xóa lan theo cũng không
biết tệp đó là của ai. Bài kiểm chặn ở cả tầng ánh xạ và tầng client, và kiểm rằng client từ
chối **trước khi** gọi Graph.

### Di trú 021: hai mục danh mục tài liệu

Khai nhánh mà không có nguồn tệp là khai một chỗ không bao giờ nhận gì. Trước bản này hệ thống
không có loại tệp nào thuộc `06.1` hay `06.2`, nên thêm:

| Mã | Tên | Nhánh |
|---|---|---|
| `cv_ung_vien` | CV / Đơn xin việc | `06.1` |
| `danh_gia_thu_viec` | Biên bản đánh giá thử việc | `06.2` |

Cả hai `bat_buoc = false`, và **không được đổi thành `true` mà không nghĩ lại**: hệ thống đang
có 53 người nhập từ ERP, nên đặt bắt buộc là ngày hôm sau toàn bộ 53 hồ sơ hiện "thiếu tài
liệu" — không phải vì ai làm sai, mà vì ta vừa đổi thước đo.

`yeu_cau_tuyen` **không** khai: nó gắn với một vị trí cần tuyển, không gắn với một nhân viên,
nên `tai_lieu_nhan_vien` không phải chỗ của nó.

### Ba ranh giới phân loại, ghi rõ vì đều dễ sai

- **Hợp đồng thử việc vẫn ở `02.1`, không sang `06.2`.** `06.2` tên là *"Đánh giá phỏng vấn &
  thử việc"* — là văn bản **đánh giá**, còn hợp đồng thử việc là một **hợp đồng**. Nó cũng nằm
  trong luồng nhắc hạn hợp đồng (BLLĐ 2019 Điều 27), nên tách ra là tách một văn bản khỏi đúng
  chỗ nó đang được quản lý. Đảo được bằng một dòng trong `chon_nhanh` nếu người phụ trách muốn
  khác.
- **Bằng cấp, chứng chỉ không sang `06`.** Là giấy tờ lúc ứng tuyển, nhưng là hồ sơ 201 lâu dài
  — nằm trong `01` cả đời làm việc. Có bài kiểm e2e riêng cho ranh giới này.
- **`05.1` và `05.2` chưa có nguồn tệp.** Tên đã khai nhưng `chon_nhanh` chưa trả về chúng.

### Bài kiểm mới: mọi nhánh phải có nguồn

Chặn một kiểu hỏng im lặng: thêm một nhánh vào `NHANH` nhưng quên nói tệp nào đi vào đó. Nhánh
sẽ nằm trong bảng mãi mãi, không ai nhận ra nó chưa nhận một tệp nào.

Bài kiểm chạy `chon_nhanh` trên toàn bộ tổ hợp nhóm × `loai` × `ma_tai_lieu`, rồi bắt buộc mọi
nhánh trong `NHANH` phải **hoặc** trả về được, **hoặc** nằm trong `NHANH_CHUA_CO_NGUON` kèm lý
do. Và ngược lại: một nhánh đã có tệp đi vào thì không được khai là chưa có nguồn — bảng đó
không được nói dối. Đã kiểm bằng cách thêm thật một nhánh không nối nguồn: bộ kiểm đỏ đúng chỗ.

`NHANH_CHUA_MO` (thêm ở 1.26.2) bỏ đi — nó nói "chưa mở", giờ tên đã có và nhánh đã ở trong
`NHANH`, nên điều cần ghi lại là "chưa có nguồn tệp", khác nghĩa.

### Nhãn loại trong tên tệp

`NHAN_TAI_LIEU` cho từng mã danh mục một nhãn riêng: `CV`, `ĐÁNH GIÁ THỬ VIỆC`, `CCCD`, `SYLL`,
`QĐ TĂNG LƯƠNG`… Lý do thực dụng: một thư mục có ba tệp `HỒ SƠ - Nguyễn Văn A - ...` thì phải
mở từng tệp mới biết cái nào là gì.

391 unit (1 skipped) + 5 proxy + 15 thiết kế + 280 e2e.

## [1.26.2] — 2026-08-19

**Đính chính:** ở 1.26.1 tôi đặt tên bảng `NHANH_NGUOI_KHAC` và viết rằng ứng dụng sẽ không bao
giờ ghi vào `05 CHẤM CÔNG – NGHỈ PHÉP` và `06 TUYỂN DỤNG & THỬ VIỆC`. Đó là suy luận của tôi từ
chữ "người phụ trách", và nó **sai chiều**: hồ sơ của hệ thống *sẽ* nằm trong hai nhánh đó, theo
đúng phân loại sẵn có của nhánh. Cái đúng là "chưa mở", không phải "của người khác".

Bảng đổi tên thành `NHANH_CHUA_MO`, và lý do chặn ghi nêu rõ còn thiếu hai thứ — thiếu một trong
hai là chưa được ghi:

1. **Tên thư mục con, chính xác từng ký tự.** Hai nhánh này đang có người dùng thật và có thư mục
   con sẵn. Đoán tên là Graph *tạo mới* một thư mục nằm cạnh thư mục thật — đúng kiểu lỗi mà dấu
   gạch ngang dài U+2013 đã suýt gây ra ở nhánh `02.1`.
2. **Chốt phân loại** với người đang phụ trách. Yêu cầu là hồ sơ phải tuân thủ phân loại của
   nhánh, nên đây không phải việc tự quyết.

Bốn bài kiểm giữ nguyên tác dụng, chỉ đổi tên và đổi thông điệp. Bài quan trọng nhất vẫn là: mở
một nhánh ra (thêm vào `NHANH`) **bắt buộc** phải kèm việc gỡ nó khỏi `NHANH_CHUA_MO`.

### Kiểm hệ thống có tệp nào cho hai nhánh đó

Kết quả vào `tai_lieu/KE-HOACH-TRIEN-KHAI.md` mục 3.2.

**`06 TUYỂN DỤNG & THỬ VIỆC` — có, và đang nằm ở nhánh khác.** Hợp đồng loại `thu_viec` đang đi
vào `02.1`; `so_yeu_ly_lich`, `qd_tiep_nhan`, `bang_cap`, `chung_chi` đang đi vào `01`. Bốn dòng
này phải người phụ trách quyết: cùng một tệp có thể thuộc `06` (giai đoạn tuyển dụng) hoặc
`01`/`02.1` (hồ sơ nhân sự lâu dài), và đặc tả không nói rõ.

**`05 CHẤM CÔNG – NGHỈ PHÉP` — hiện KHÔNG có tệp nào.** `don_nghi_phep` và `don_giai_trinh` không
có tệp đính kèm trong lược đồ hiện tại, và bảng công là dữ liệu tính ra chứ không phải tệp. Ánh
xạ `05` bây giờ chỉ tạo ra một loạt thư mục rỗng. Muốn nó có nội dung thì cần **việc mới**: cho
đơn nghỉ phép đính kèm được tệp, hoặc xuất bảng công hằng tháng thành tệp. Cả hai đều ngoài phạm
vi đồng bộ SharePoint.

388 unit (1 skipped) + 5 proxy + 15 thiết kế + 278 e2e.

## [1.26.1] — 2026-08-19

Hai quyết định của bạn, ghi vào mã nguồn và tài liệu.

### Khiếu nại nhân sự: giai đoạn sau

Thêm `tai_lieu/KE-HOACH-TRIEN-KHAI.md` — cái gì đang chạy, cái gì đang chờ ai, cái gì cố ý để
lại sau. Khiếu nại vào mục 3.1, kèm ba việc phải quyết khi tới lúc; câu khó nhất là **ai được
đọc nhánh đó**, vì người phụ trách thư mục HCNS có thể chính là người bị khiếu nại.

Lý do bỏ qua hiện trên trang quản trị đã đổi cho khớp: từ "đặc tả không có nhánh nào" thành
"sẽ xây dựng ở giai đoạn sau, xem kế hoạch triển khai". Cùng một hành vi, nhưng người đọc bảng
biết đây là một mục có kế hoạch chứ không phải một chỗ quên.

### Hai nhánh có người phụ trách riêng

`05 CHẤM CÔNG – NGHỈ PHÉP` và `06 TUYỂN DỤNG & THỬ VIỆC` tiếp tục triển khai song song bằng
tay. Ứng dụng không ghi vào và không xóa trong hai nhánh đó.

Trước bản này, điều đó **đúng nhưng là tình cờ**: `duong_dan_an_toan_de_ghi` là danh sách cho
phép, nên nó từ chối mọi thứ không có trong bảng `NHANH` — kể cả hai nhánh này. Người đọc mã
sau tôi sẽ thấy hai thư mục thiếu trong bảng và có thể "bổ sung cho đầy đủ".

Giờ nó là một quyết định có tên: bảng `NHANH_NGUOI_KHAC`, và bốn bài kiểm —

- không ghi được vào, không xóa được trong, không tạo được thư mục (kiểm ở cả tầng ánh xạ và
  tầng client, và kiểm rằng client từ chối **trước khi** gọi Graph);
- một nhánh **không được** vừa nằm trong `NHANH` vừa nằm trong `NHANH_NGUOI_KHAC`.

Bài kiểm cuối là mục đích thật của bảng: thêm một trong hai nhánh vào `NHANH` giờ bắt buộc phải
kèm việc gỡ nó khỏi danh sách kia — một hành động có ý, có đối chiếu với người phụ trách, chứ
không phải một dòng thêm vào lúc dọn dẹp. Cả hai bài kiểm đọc từ chính bảng đó, nên thêm nhánh
mới vào danh sách là được bảo vệ luôn.

388 unit (1 skipped) + 5 proxy + 15 thiết kế + 278 e2e.

## [1.26.0] — 2026-08-19

**Đồng bộ kho tệp hồ sơ sang thư viện HCNS trên SharePoint.** Một chiều: máy chủ là bản gốc,
SharePoint là bản sao, gỡ tệp bên này thì bản bên đó bị xóa theo (vào thùng rác của site, giữ
93 ngày).

Tài liệu: `tai_lieu/SHAREPOINT.md`.

### Quy ước tên là của HCNS, không phải của tôi

Nguồn sự thật là tệp `DANH MỤC HỆ THỐNG FILE HCNS - SHAREPOINT (BỔ SUNG THEO BC 11) -
15-07-2026_2.xlsx` nằm ngay trong thư viện HCNS. Mỗi hàng trong bảng `NHANH` tra về được một
dòng trong đặc tả đó.

| | Đường dẫn |
|---|---|
| Trên đĩa | `HR-01_Hoang-Minh-Ngoc/hop_dong/2026-08-18_hop-dong_HDLD_a1b2c3d4.pdf` |
| Trên SharePoint | `01 HỒ SƠ NHÂN SỰ (201)/HR-01-HOANG MINH NGOC/HĐLĐ SỐ 07-2026 - Hoàng Minh Ngọc - 18-08-2026.pdf` |

Hai quy ước cố ý khác nhau: tên trên đĩa phải đi qua tar/scp/rsync nên bỏ dấu, còn quy ước của
HCNS viết cho người đọc. `ho_so_tep.ten_luu` vẫn là khóa đọc.

Ngày dùng **gạch nối**, không dùng dấu chấm — đặc tả ghi rõ lý do: *"để iOS không hiểu nhầm
đuôi file"*.

### Nhóm khiếu nại KHÔNG được đồng bộ

Không phải vì quên. Đặc tả HCNS không có nhánh nào cho nó, và khiếu nại có thể là về chính
người có quyền đọc thư mục đích. Hàm ánh xạ trả `null`, và trên trang quản trị nó hiện ở mục
*Không đồng bộ* kèm lý do đọc được.

Giấy khám sức khỏe đi sang nhánh `09 AN TOÀN – SỨC KHỎE` chứ không vào `01` — nhánh `09` khai
đúng việc đó, và theo NĐ 13/2023 dữ liệu sức khỏe là dữ liệu cá nhân **nhạy cảm**.

### Bảng trạng thái, không phải hàng đợi

Di trú `020`. `sharepoint_tep` giữ hai cột: tệp **nên** ở đâu và tệp **đang** ở đâu. Mỗi vòng
quét chỉ làm một việc — cho hai cột bằng nhau.

Có bốn chỗ đổi được `ma_nv`/`ho_ten` (nhân sự sửa tay, nhập CSV, đồng bộ ERP, API `/api/v1`).
Với hàng đợi, một chỗ quên phát sự kiện là một tệp nằm sai chỗ vĩnh viễn. Với hai cột thì vòng
quét hằng ngày tự tìm ra, lệch tối đa một ngày, và chạy lại bao nhiêu lần cũng cho cùng một
kết quả.

Bảng **cố ý không có khóa ngoại** sang `ho_so_tep`: nếu có `on delete cascade` thì lúc gỡ một
tệp, dòng này bị xóa theo cùng với thông tin duy nhất cho biết còn một bản sao cần xóa trên
SharePoint. Có một bài kiểm e2e giữ điều đó.

Trong một lượt đổi chỗ: **đẩy bản mới trước, xóa bản cũ sau.** Ngược lại thì giữa hai bước
không còn bản nào trên SharePoint, và máy chủ chết đúng lúc đó là hồ sơ biến mất.

### Ba hàng rào, nằm bên trong client

Không ở tầng gọi — một chỗ gọi quên kiểm là một chỗ có thể xóa tệp của người khác.

1. Ghi tệp: đúng ba cấp `<nhánh>/<[Mã NV]-[Họ tên]>/<tên tệp>`, nhánh phải có trong bảng khai.
2. Tạo thư mục: quy tắc **khác** — chỉ được là chính một nhánh hoặc một cấp nhân viên trong đó.
3. Xóa: ngoài đường dẫn, còn kiểm đối tượng là **một tệp**. `DELETE` một thư mục trên
   SharePoint kéo theo mọi tệp bên trong, kể cả tệp do người khác đặt vào.

Tạo thư mục dùng `conflictBehavior: 'fail'` và coi `409` là thành công. Dùng `'replace'` trên
một thư mục là xóa sạch nội dung bên trong — và các nhánh của HCNS đang có dữ liệu thật. Máy
chủ Graph giả trong bộ kiểm cài đúng hành vi đó, nên đổi sang `'replace'` làm bài kiểm đỏ.

Hai thư mục `05 CHẤM CÔNG – NGHỈ PHÉP` và `06 TUYỂN DỤNG & THỬ VIỆC` đang có dữ liệu thật và
chưa được ánh xạ — có bài kiểm từ chối thẳng hai đường dẫn này.

### Quyền hẹp nhất có thể

Dùng một app đăng ký **riêng**, không dùng lại app đăng nhập Microsoft: app đăng nhập chỉ cần
`openid profile email`, gắn thêm quyền ghi tệp vào nó là mở rộng bề mặt của chính lớp đăng
nhập. Quyền là `Sites.Selected` — chỉ có hiệu lực trên site được cấp tên đích danh.

`SHAREPOINT_GOC_GRAPH` / `SHAREPOINT_GOC_TOKEN` chỉ để bộ kiểm dựng máy chủ Graph giả. Khi
`NODE_ENV=production`, máy chủ từ chối mọi giá trị không phải `graph.microsoft.com` /
`login.microsoftonline.com` — kiểm theo **tên máy** chứ không theo tiền tố, vì
`graph.microsoft.com.ke-tan-cong.vn` bắt đầu đúng bằng tiền tố thật.

### Đẩy thật mặc định TẮT

`SHAREPOINT_BAT_DAY=0`. Cấu hình xong thì hệ thống vẫn chỉ tính đường dẫn và ghi vào bảng.
Vào **Hệ thống → Kho tệp hồ sơ → Đồng bộ SharePoint**, đọc cột đường dẫn, thấy đúng rồi mới
bật. Đích là thư viện đang dùng thật nên thứ tự đó không phải hình thức.

### Nói thẳng về giới hạn

**Chưa chạy thật lần nào.** 28 bài kiểm chạy trên một máy chủ Graph giả tại chỗ — phiên làm
việc viết mã này không kết nối được SharePoint thật. Bộ kiểm chứng minh client gọi đúng những
gì tài liệu Graph nói, **không** chứng minh SharePoint thật sẽ nhận.

### Hai lỗi tự tìm ra khi viết bộ kiểm

- Lề an toàn của token có sàn 60 giây, nghĩa là một token báo còn sống 60 giây vẫn được đệm lại
  đúng 60 giây — dùng nó đến quá hạn. Đổi thành tỉ lệ theo đời token (tối đa nửa đời).
- `ghi_nhan_am_tham` ban đầu "bắn rồi quên" (không `await`). Hai cái giá: không kiểm được, và
  truy vấn có thể còn đang chạy khi kết nối đã trả lại pool. Cả hai truy vấn đều là một lệnh
  có chỉ mục nên `await` không tốn gì.

## [1.25.1] — 2026-08-19

**`npm run sap_xep_tep` không chạy được trong container.**

```
Error: Cannot find module '/app/may_chu/src/ho_so/chay_sap_xep.ts'
```

Ảnh chạy chỉ `COPY` `may_chu/dist`, `may_chu/migrations` và `package.json` — **không có
`src`**. Đó là cố ý: ảnh chạy không cần trình biên dịch. Nhưng lệnh tôi thêm ở 1.25.0 trỏ vào
`src/ho_so/chay_sap_xep.ts`, nên nó chạy tốt trên máy lập trình và không tồn tại trong
container.

**`di_tru` và `seed` hỏng y như vậy từ trước** — chỉ là chưa ai gọi đến. Di trú chạy tự động
lúc khởi động nên không ai phát hiện `npm run di_tru` không dùng được.

### Sửa

Lệnh vận hành trỏ vào `dist/`, và giữ biến thể `_ma_nguon` cho máy lập trình:

| Lệnh | Chạy ở đâu |
|---|---|
| `npm run sap_xep_tep` | container (và máy lập trình sau khi `build`) |
| `npm run sap_xep_tep_ma_nguon` | máy lập trình, chạy trực tiếp từ `src` |

Tương tự cho `di_tru` và `seed`.

### Rào

Bài kiểm đọc `package.json` và `Dockerfile`, rồi đối chiếu: một lệnh trỏ vào `src/` thì ảnh
chạy **phải** `COPY may_chu/src`, nếu không lệnh đó không tồn tại trong container. Lệnh chỉ
dùng khi phát triển thì đặt tên có hậu tố `_ma_nguon` để đọc ra là biết.

Kèm chiều còn lại: mọi lệnh trỏ vào `dist/...` phải là đường dẫn **có thật** sau khi build —
gõ sai một chữ thì trong container vẫn ra "Cannot find module", chỉ muộn hơn một bước.

Đã thử: trả `sap_xep_tep` về `src` thì test đỏ và in đúng tên lệnh.

**313 unit (1 bỏ qua khi chạy bằng root) + 5 proxy + 15 thiết kế + 270 e2e, tất cả đạt.**

## [1.25.0] — 2026-08-19

**Kho tệp hồ sơ có cây thư mục đọc được, tên tệp theo quy chuẩn.**

Trước bản này kho tệp phẳng: `2026-08/9e5dbb73-e0b5-4dd7-997a-c6e16cf66ca5.docx`. Mở thư mục
lên — hay bung một bản sao lưu ra máy khác **không có cơ sở dữ liệu** — thì cả kho là một đống
tên vô nghĩa. Mất cơ sở dữ liệu là mất luôn ý nghĩa của cả kho tệp.

```
/du_lieu/ho_so/
├── HR-01_Hoang-Minh-Ngoc/
│   ├── hop_dong/2026-08-18_hop-dong_HDLD-07-2026_a1b2c3d4.pdf
│   ├── tai_lieu/2026-08-18_tai-lieu_CCCD_e5f6a7b8.pdf
│   └── bhxh/2026-08-18_bhxh_BAO-TANG_9a8b7c6d.pdf
└── IT-01_Phan-Song-Hao/
    └── hop_dong/2026-07-01_hop-dong_HDLD-03-2026_5f6a7b8c.pdf
```

### Ba ràng buộc của tên, và đều có lý do cụ thể

1. **Không dấu, chỉ ASCII.** Tên tệp đi qua `tar`, `scp`, `rsync`, WinSCP, Windows, và qua cả
   `Content-Disposition`. Mỗi chặng hiểu UTF-8 một cách khác nhau, và cái giá của một chặng
   hiểu sai là một bản scan hợp đồng không mở được.
   Riêng **`đ` và `Đ` phải thay tay** — chúng không phải `d` có dấu mà là chữ cái riêng, không
   tách ra được bằng `normalize('NFD')`. Quên thì `HĐLĐ` thành `HL`.
2. **Không dấu cách.** Đường dẫn có dấu cách làm vỡ mọi đoạn script một dòng ai đó gõ vội
   trong lúc sự cố.
3. **Tám ký tự hex ở cuối** — là **tám ký tự đầu của `ho_so_tep.id`**. Mở thư mục lên là tra
   ngược được về đúng dòng cơ sở dữ liệu. Mã sinh ở tầng ứng dụng rồi dùng làm khóa chính của
   dòng, chứ không để cơ sở dữ liệu sinh mã riêng — để mã riêng thì tên tệp và khóa chính
   không liên quan gì nhau, và cả lợi ích chính của quy chuẩn mất sạch.

Hai tệp cùng tên gốc trong cùng thư mục: phần hex chống trùng, và nếu tên ngắn đã bị chiếm thì
dùng **cả** mã. Ghi bằng `flag: 'wx'` — tạo mới, **hỏng nếu đã có**. Chỗ này giữ bản gốc giấy
tờ pháp lý; ghi đè là mất vĩnh viễn.

### Đường đọc vẫn là cơ sở dữ liệu — điểm thiết kế quan trọng nhất

`ho_so_tep.ten_luu` **là khóa đọc**. Không chỗ nào tính lại đường dẫn từ mã nhân viên.

Vì mã nhân viên và họ tên **đều đổi được** — đồng bộ ERP ghi lại họ tên mỗi lần chạy. Nếu đọc
bằng cách tính lại thì mỗi lần đổi tên là một lần **cả kho tệp biến mất**, và biến mất im
lặng: không lỗi, chỉ là "không tìm thấy tệp".

Nên **thư mục lệch không làm mất tệp.** Tên thư mục không khớp hồ sơ thì mọi tệp vẫn mở được
bình thường. Sắp xếp lại là dọn dẹp, không phải cứu hộ.

### Đổi chỗ tệp: thứ tự là cả vấn đề

Không có lệnh nào làm nguyên tử cả "đổi chỗ tệp trên đĩa" và "cập nhật dòng cơ sở dữ liệu" —
một bên là hệ tệp, một bên là Postgres. Nên phải chọn hỏng ở giữa thì để lại trạng thái nào,
và **chỉ có một lựa chọn chấp nhận được: trạng thái mà mọi tệp vẫn đọc được.**

```
1. rename trên đĩa     tệp sang chỗ mới, CSDL còn trỏ chỗ cũ  -> TẠM THỜI HỎNG
2. update ten_luu      khớp lại, xong
3. update lỗi          -> rename ngược lại, rồi ném lỗi lên
```

Cửa sổ hỏng ở bước 1 chỉ dài bằng một lệnh `update`, và bước 3 đóng nó lại. Thứ tự ngược
(update trước, rename sau) **nghe** an toàn hơn nhưng tệ hơn thật: rename thất bại thì cơ sở
dữ liệu đã trỏ đến một chỗ không bao giờ có tệp, và không còn thông tin nào để tìm lại.

### Giữ thư mục đúng khi mã nhân viên / họ tên đổi

Có **bốn** chỗ trong hệ thống sửa được hai trường đó: nhân sự sửa tay, nhập CSV, đồng bộ ERP,
API `/api/v1`. Cả bốn đều được nối vào, và **một chỗ quên là một chỗ lệch im lặng mãi mãi** —
nên có thêm **một lần quét mỗi ngày** làm lưới hứng. Việc "quên một chỗ" vì thế thành "lệch
tối đa một ngày".

Hai đường bulk (nhập CSV, đồng bộ ERP) quét **một lần sau cả lô** thay vì gọi từng người: gọi
từng người là một truy vấn toàn bảng cho mỗi nhân viên.

### Chạy tay

**Hệ thống → Kho tệp hồ sơ → Cây thư mục**, hoặc:

```bash
docker compose exec may_chu npm run sap_xep_tep            # chạy thử, KHÔNG đổi gì
docker compose exec may_chu npm run sap_xep_tep -- --that  # đổi chỗ thật
```

**Mặc định là chạy thử.** Một lệnh mặc định "làm thật" ở đây là một lệnh cho phép gõ nhầm một
chữ trên bản gốc hợp đồng.

Gọi lại được nhiều lần; tệp đã đúng chỗ thì bỏ qua. Hai con số được báo riêng và **không bao
giờ bỏ qua im lặng**: **mất tệp** (có dòng CSDL nhưng không có tệp trên đĩa — thường do phục
hồi sao lưu thiếu volume `ho_so`) và **đường dẫn xấu** (dữ liệu hỏng, cần người xem).

### Hàng rào chống path traversal

`ten_luu` đến từ cơ sở dữ liệu, nhưng một dòng hỏng hay một lần chèn SQL ở chỗ khác đều biến
nó thành đường đi tùy ý trên đĩa máy chủ. Hai lớp: `duong_dan_hop_le` chặn hình dạng, rồi
`resolve` đối chiếu với thư mục gốc.

Cây **cũ** vẫn được nhận — tệp chưa sắp xếp phải còn đọc được. Bỏ sớm một ngày là một ngày
không ai mở được hợp đồng nào.

Bài kiểm quan trọng nhất của nhóm này: **hơn 300 tổ hợp tên do bộ sinh tạo ra đều phải qua
được bộ kiểm.** Bộ sinh và bộ kiểm lệch nhau thì mỗi lần tải tệp lên sẽ ghi được xuống đĩa rồi
không đọc lại được — tệp mồ côi ngay từ đầu.

**312 unit (1 bỏ qua khi chạy bằng root) + 5 proxy + 15 thiết kế + 270 e2e, tất cả đạt.**

### Việc cần làm sau khi triển khai

Kho tệp hiện có **rất ít tệp** (mới bắt đầu nạp được từ bản 1.22.2), nên sắp xếp sẽ nhanh:

```bash
docker compose exec may_chu npm run sap_xep_tep            # xem trước
docker compose exec may_chu npm run sap_xep_tep -- --that  # rồi đổi
```

Không chạy cũng được — lần quét hàng ngày sẽ tự làm.

## [1.24.0] — 2026-08-18

**Trang Tổng quan dựng theo vai trò — và một đường rò rỉ dữ liệu đã tồn tại từ đầu.**

### Rò rỉ

`/api/dashboard` chỉ chặn ở mức `can_dang_nhap`, rồi trả về **một payload duy nhất cho mọi
người**: quân số toàn công ty, số người vắng, và **danh sách đích danh mười người đi muộn
hôm nay kèm số phút muộn**.

Một tài khoản `nhan_vien` bình thường mở trang chủ ra là đọc được hết.

Không ai có ý đồ — trang này được viết khi hệ thống mới có một loại người dùng, rồi không ai
quay lại. Mọi đường khác (`bang_cong`, `lan_quet`) đều đã có `pham_vi_nhan_vien`; riêng
đường này không.

### Bốn lớp, mỗi lớp chỉ thêm vào lớp dưới

| Lớp | Ai thấy | Nội dung |
|---|---|---|
| `toi` | ai có hồ sơ nhân viên | công hôm nay, công tháng, phép còn lại, đơn của tôi |
| `phong` | trưởng phòng | phòng mình: vắng/muộn hôm nay, đơn chờ tôi duyệt |
| `cong_ty` | nhân sự trở lên | toàn công ty, biểu đồ 7 ngày, đi muộn hôm nay |
| `nhan_su` | nhân sự trở lên | hợp đồng hết hạn, thiếu PIN, thiếu email, thiếu giấy tờ |
| `he_thong` | quản trị | máy chấm công, trạng thái đồng bộ ERP |

Lớp không được phép **không có trong payload**, chứ không phải có rồi để giao diện ẩn đi. Ẩn
ở giao diện là ẩn giả: dữ liệu vẫn đi qua đường truyền và vẫn hiện ra trong tab Network.

Trưởng phòng chưa được gán phòng nào thì thấy **rỗng**, không rơi về "xem cả công ty" — rơi
về toàn công ty là biến một thiếu sót khai báo thành một đường rò rỉ.

Bài kiểm chặn kiểm **trên chuỗi JSON thô**, không kiểm theo tên trường: ai đó thêm một
trường mới mang cùng dữ liệu đó thì bài kiểm theo trường sẽ không thấy.

### "Việc của nhân sự" — bốn con số đều có người thật đứng sau

- **Chưa gán PIN máy** — những người này **không chấm công được**. Nặng nhất, để màu đỏ.
- **Hợp đồng đã hết hạn** — quá 30 ngày là tự thành không xác định thời hạn (Điều 20.2).
- **Chưa có email** — không đăng nhập Microsoft được.
- **Chưa có phòng ban** — không ai duyệt đơn cho họ.
- **Hồ sơ thiếu giấy tờ** — đếm **người**, không đếm dòng. "37 dòng thiếu" không nói lên ai
  phải gọi điện cho ai, và nó luôn lớn hơn số người nên nhìn như tình hình tệ hơn thật. Có
  bài kiểm chặn con số này vượt quá quân số.

### Sửa — rào "một chỗ duy nhất" bắt được chính tôi

Bài kiểm cấm so sánh chuỗi vai trò (thêm ở 1.23.0) **đỏ ngay khi tôi viết module dashboard**:
tôi gõ `vai_tro === 'admin'`. Đã thêm `la_quan_tri()` cạnh `la_vai_tro_nhan_su()` — quản trị
kỹ thuật là một trục khác với quản trị nhân sự, nhưng cả hai câu hỏi vẫn trả lời từ một chỗ.

**288 unit (1 bỏ qua khi chạy bằng root) + 5 proxy + 15 thiết kế + 260 e2e, tất cả đạt.**

## [1.23.0] — 2026-08-18

**Thay / gỡ tệp đã nạp — và vai trò Trưởng phòng nhân sự.**

Tải tệp lên xong thì không có đường nào thay hay gỡ nó. Và mọi tài khoản `nhan_su` đều xóa
được bất kỳ tệp nào trong hồ sơ bất kỳ ai.

### Ranh giới mới

**Nạp thêm** một bản scan là **thêm** chứng cứ — nhân sự làm hàng ngày, càng dễ càng tốt.
**Thay** hay **gỡ** một bản đã nạp là **làm mất** chứng cứ — phải có người chịu trách nhiệm.

Hồ sơ nhân sự là hồ sơ pháp lý: hợp đồng, CCCD, bằng cấp, giấy khám sức khỏe. Khi có tranh
chấp lao động hay khi cơ quan BHXH hỏi, cái trả lời được là bản gốc trong kho tệp.

| Vai trò | Nạp tệp vào ô trống | Thay / gỡ tệp đã có |
|---|---|---|
| `admin` | được | được |
| `truong_phong_nhan_su` **(mới)** | được | **được** |
| `nhan_su` | được | **không** |
| `truong_phong` | không | không |
| chính chủ | không | không |

Chính chủ **không** tự gỡ được bằng cấp hay giấy khám sức khỏe của mình ra khỏi hồ sơ — đó
là hồ sơ do công ty lập và nộp cho cơ quan nhà nước.

### Chặn ở CẢ HAI đường, vì bỏ sót một đường là bỏ sót cả quy tắc

- `DELETE /api/ho-so/tep/:id` — xóa thẳng.
- `PUT /api/nhan-vien/:id/tai-lieu/:ma` — **nạp đè lên ô đã có tệp**. Không chặn ở đây thì
  "thay tệp" thành đường vòng qua quy tắc: bản cũ trở thành tệp mồ côi không ai thấy trong
  giao diện, và ô checklist đã là một bản khác. Kết quả giống hệt xóa.

Tệp bị thay thế được **dọn hẳn** — cả dòng CSDL lẫn tệp trên đĩa, và ghi nhật ký riêng.

### Sửa — một lỗi suýt xảy ra khi thêm vai trò

Thêm `truong_phong_nhan_su` xong, câu `vai_tro === 'admin' || vai_tro === 'nhan_su'` vẫn nằm
rải ở **năm** chỗ khác nhau: `can_nhan_su`, `can_nguoi_duyet`, `xem_duoc_tat_ca`, lớp che dữ
liệu cá nhân, và bộ đếm đơn chờ duyệt.

Bỏ sót một chỗ là người đó đăng nhập vào **thấy một nửa hệ thống** — và nửa không thấy sẽ im
lặng y như nó không tồn tại. Đã gom về `la_vai_tro_nhan_su()` trong module thuần
`quyen_ho_so.ts`, và **bài kiểm đọc mã nguồn cấm so sánh chuỗi vai trò ở mọi tệp khác**.

`VaiTro` trong `jwt.ts` là kiểu union nên trình biên dịch bắt được một chỗ; bốn chỗ còn lại
thì không, vì chúng nhận `{ vai_tro: string }`.

### Giao diện

Ô kéo-thả gọn **"Thay tệp khác"** và nút **"Gỡ tệp"** chỉ hiện với người bấm được — vẽ một
cái nút chỉ để báo 403 là vẽ một lời hứa không giữ được. Hộp xác nhận hỏi lại bằng **chính
tên tệp**, không phải "có / không".

Câu từ chối nói rõ **nạp thêm thì vẫn làm được**; chỉ báo "không có quyền" sẽ làm nhân sự
tưởng cả việc nạp tệp cũng bị cấm.

### Việc cần làm sau khi triển khai

Vào **Hệ thống → Tài khoản**, đổi vai trò của người phụ trách hồ sơ thành **Trưởng phòng
nhân sự (TP HR)**. Vai trò này **bắt buộc gắn với một hồ sơ nhân viên** — người được quyền
gỡ bản gốc giấy tờ của người khác thì nhật ký "ai xóa tệp này" phải truy ngược được về một
con người, không dừng lại ở một tên đăng nhập.

Chưa gán cho ai thì chỉ `admin` thay/gỡ được — hệ thống không tự khóa chết.

**288 unit (1 bỏ qua khi chạy bằng root) + 5 proxy + 15 thiết kế + 252 e2e, tất cả đạt.**

## [1.22.2] — 2026-08-18

**`/du_lieu/ho_so` thuộc `root` nên máy chủ chưa từng ghi được một tệp hồ sơ nào.**

Sửa lỗi nhóm hồ sơ ở 1.22.1 xong thì lỗi này lộ ra: `400` đổi thành `500`. Hai lỗi xếp
tầng, và lỗi ngoài che lỗi trong hoàn toàn.

Bằng chứng nó tồn tại từ đầu: `find /du_lieu/ho_so -type f | wc -l` ra **0**, và
`select count(*) from ho_so_tep` cũng ra **0**.

### Nguyên nhân

Docker khởi tạo một named volume **rỗng** theo nội dung của **ảnh** tại đường dẫn gắn —
**kể cả quyền sở hữu**. `Dockerfile` chỉ `mkdir -p /du_lieu/anh_cham_cong`:

| Thư mục | Có trong ảnh? | Chủ của volume | `node` ghi được? |
|---|---|---|---|
| `/du_lieu/anh_cham_cong` | có, đã `chown node:node` | `node:node` | được |
| `/du_lieu/ho_so` | **không** | **root:root** | **không — EACCES** |

### Ba điều làm nó vô hình suốt nhiều bản

1. **Ảnh selfie chấm công vẫn ghi được** — thư mục kia đúng quyền. Hệ thống *nhìn như* đang
   lưu tệp bình thường.
2. **Triệu chứng duy nhất là `Lỗi hệ thống. Vui lòng thử lại`** — một câu đẩy người dùng đi
   thử lại với tệp khác, định dạng khác, hàng chục lần, rồi kết luận là tệp của mình có vấn
   đề. Nó **sai** với một lỗi không bao giờ tự khỏi.
3. **Volume sao lưu hàng tháng luôn rỗng** — và không ai thấy lạ, vì chưa ai tải tệp lên
   thành công bao giờ. Bản sao lưu vẫn "chạy đúng".

### Sửa

- `Dockerfile` tạo sẵn **cả hai** thư mục rồi mới `chown`.
- **Thông báo lỗi nói được nguyên nhân.** `LoiThuMucLuu` trả `503` kèm câu *"Đây là lỗi cấu
  hình máy chủ, không phải lỗi của tệp — thử lại sẽ vẫn thất bại. Báo quản trị."* Đường dẫn
  tuyệt đối chỉ vào log, không ra client. `ENOSPC` (hết đĩa) có câu riêng.
- **Thử ghi thật lúc khởi động**, và ghi ra log kèm đúng lệnh `chown` cần chạy. Dùng ghi
  thật chứ không `access(W_OK)`: bit quyền nói "được" trong cả những trường hợp vẫn không
  ghi được (đĩa chỉ đọc, hết inode, quota).
- **`/health` báo `luu_tru`.** Cố ý **không** trả `503`: hạ container vì lỗi lưu trữ sẽ dừng
  luôn việc hứng log máy chấm công — thứ đang chạy tốt. Đổi lại, kịch bản triển khai in
  nguyên thân `/health` mỗi lần cập nhật, nên `luu_tru` khác `ok` sẽ đập vào mắt ngay.

### Rào

`test/luu_tru.test.ts` đọc **thẳng `Dockerfile`** và đối chiếu với **mọi `THU_MUC_*` khai
trong `docker-compose.yml`**. Thêm một kho lưu trữ mới mà quên tạo thư mục thì đỏ test ngay,
không phải đợi đến lúc có người tải tệp lên. Đã thử: bỏ `/du_lieu/ho_so` khỏi dòng `mkdir`
thì test đỏ và gọi đúng tên thư mục.

Kèm bài kiểm cho thông báo lỗi (phải nói "lỗi cấu hình máy chủ", không được lọt đường dẫn
ra ngoài, `ENOSPC` nói thành "hết dung lượng"), và một bài kiểm `os.tmpdir()` ghi được —
OCR và `pdftotext` ghi tệp tạm ở đó, một phụ thuộc trước nay không ai khai ở đâu cả.

**276 unit (1 bỏ qua khi chạy bằng root) + 5 proxy + 15 thiết kế + 242 e2e, tất cả đạt.**

### Việc phải làm tay một lần trên VPS

Cập nhật ảnh **không** tự sửa volume đã tồn tại — Docker chỉ đặt quyền sở hữu lúc khởi tạo:

```bash
docker compose exec -u root -T may_chu chown -R node:node /du_lieu
docker compose restart may_chu
```

Chi tiết: [`tai_lieu/TRIEN-KHAI.md`](tai_lieu/TRIEN-KHAI.md), mục *"Thư mục lưu hồ sơ không
ghi được"*.

## [1.22.1] — 2026-08-18

**Không tải được tệp cho bốn tab hồ sơ — trong đó có chính checklist "Hồ sơ tài liệu 0/7".**

Kéo một tệp vào bất kỳ dòng nào của tab **Tài liệu** đều thất bại. Đây là tính năng chính
của tab đó — cái thanh tiến độ `0/7` trên đầu trang hồ sơ không thể nhích lên được, kể từ
khi tab được dựng.

Bốn nhóm hỏng theo **hai** kiểu khác nhau, nên hai kiểu che nhau:

| Nhóm | Trước | Hệ quả |
|---|---|---|
| `tai_lieu`, `thong_tin` | **400** `Trường nhom phải là một trong: …` | không nhận tệp |
| `nguoi_phu_thuoc`, `bhxh` | **500** `Lỗi hệ thống` | không nhận tệp, **và** để lại tệp mồ côi trên đĩa |

### Nguyên nhân: ba danh sách nhóm, ba nơi, ba nội dung

| Nơi | Số nhóm |
|---|---|
| `CAC_NHOM` trong `quyen_ho_so.ts` | **11** — danh sách đúng |
| `DAC_TA` trong `tuyen/ho_so.ts` | **9** — thiếu `thong_tin` và `tai_lieu`, vì hai nhóm này không sinh route từ bảng đặc tả |
| `CHECK ho_so_tep_nhom_check` (di trú 009) | **7 + `khac`** — viết trước khi có di trú 010 |

Route kiểm đầu vào bằng `DAC_TA` nên chặn hai nhóm ở lớp ngoài; hai nhóm còn lại qua được
route rồi mới vướng `CHECK` của CSDL. Di trú 010 sinh ra bốn nhóm mới nhưng không nới ràng
buộc theo, và không ai phát hiện vì tệp đính kèm của bốn nhóm đó chỉ lên giao diện sau đó.

### Sửa

- **Di trú `018`** nới `ho_so_tep_nhom_check` cho đủ 11 nhóm + `khac`.
- Route kiểm đầu vào theo **`CAC_NHOM`** thay vì `DAC_TA`. Hai nhóm ngoài bảng đặc tả có
  tên tiếng Việt riêng để thông báo thiếu quyền không văng ra `tai_lieu`.
- **Ghi CSDL thất bại thì xóa tệp vừa ghi xuống đĩa.** Tệp nằm trên đĩa trước khi có dòng
  CSDL; không xóa thì nó thành tệp mồ côi không ai biết, không xóa được qua giao diện, và
  vì là bản scan hồ sơ nhân sự nên đó là dữ liệu cá nhân nằm ngoài mọi sổ sách.

### Rào

Bài kiểm e2e **tải lên thật cho từng nhóm trong `CAC_NHOM`** và đòi `201` — không đối chiếu
ba danh sách với nhau mà bắt cả ba lớp (kiểm đầu vào, `CHECK` của CSDL, ghi đĩa) phải thông.
Đã thử: trả route về `DAC_TA` thì test đỏ và gọi đúng tên hai nhóm `thong_tin`, `tai_lieu`.

Thêm hai bài: nhóm không hợp lệ phải trả `400` mà **không tạo dòng nào**, và nhân viên
**không** tự tải tệp vào checklist tài liệu của mình được — hồ sơ tài liệu là hồ sơ pháp lý
do công ty lập.

**264 unit + 5 proxy + 15 thiết kế + 241 e2e, tất cả đạt.**

## [1.22.0] — 2026-08-18

**Nội dung hợp đồng và hạn hợp đồng — hai phần còn thiếu của Module D.**

Di trú `015` đã tạo `noi_dung_text`, `cach_trich`, `trich_luc`, `da_nhac_han` từ trước. Bản
này là phần **dùng** những cột đó: trước bản này chúng rỗng vĩnh viễn vì không có đường nào
ghi vào.

### Sửa — một ghi chú sai của chính tôi

Bản 1.20.0 ghi *"`trich_docx` trả 0 ký tự trên tệp .docx thật"* và xếp vào **Còn tồn**.
**Điều đó không đúng.** Chạy lại trên đúng ba tệp đã thử:

| Tệp | Đoạn | Ký tự |
|---|---|---|
| Dự thảo HĐLĐ mới 16/07/2026 | 121 | 12.576 |
| Tài liệu API vContract | 400 (chạm trần) | 14.507 |
| Nội quy lao động 01/2026 | 400 (chạm trần) | 33.520 |

Hàm đọc đúng cả tiếng Việt có dấu ngay từ đoạn đầu. Kết luận sai trước đó đã làm việc này
bị hoãn một bản. Cái thiếu thật là **chưa có gì gọi nó**.

Trần 400 đoạn là trần của **"xem nhanh"**, không phải trần đọc được. Nay `trich_docx` nhận
tùy chọn `doan_toi_da`; đường lưu trữ dùng 5.000.

### Thêm — trích nội dung hợp đồng (Module D)

Ba đường, và **luôn biết mình đi đường nào** — cột `cach_trich` tồn tại chính vì điều này:

| `cach_trich` | Nguồn | Độ tin cậy |
|---|---|---|
| `docx` | XML trong tệp | chữ gốc |
| `pdf_text` | lớp chữ PDF (`pdftotext`) | chữ gốc |
| `ocr` | `tesseract -l vie` trên ảnh | **máy đoán — có lỗi** |

PDF được thử lớp chữ trước; dưới **40 ký tự** thì coi như bản scan và tự chuyển sang OCR
(PDF scan không rỗng hoàn toàn — vẫn có dấu ngắt trang và rác watermark).

**Không bao giờ ghi chuỗi rỗng vào `noi_dung_text`.** Một ô trống im lặng sẽ bị đọc là *"hợp
đồng này không có nội dung"*, trong khi sự thật là *"máy chưa đọc được"*. Trích không ra chữ
thì trả `da_luu: false` kèm câu giải thích cụ thể — thiếu công cụ, ảnh mờ, hay nội dung nằm
trong ảnh chèn vào tài liệu.

Ảnh Docker thêm `poppler-utils`, `tesseract-ocr`, `tesseract-ocr-data-vie`. **Thiếu cả ba
thì máy chủ vẫn chạy** — chỉ việc trích báo `Máy chủ chưa cài ...`, và giao diện đọc
`GET /api/ho-so/cong-cu-trich` để nói trước thay vì để người dùng bấm nút rồi mới nhận lỗi.

Thiếu `tesseract-ocr-data-vie` là trường hợp tệ nhất: OCR **vẫn chạy** nhưng đọc bằng tiếng
Anh, chữ ra không dấu. Có bài kiểm đọc ảnh tiếng Việt thật và đòi đúng `HỢP ĐỒNG LAO ĐỘNG`.

### Thêm — nhắc hạn hợp đồng

Hết hạn hợp đồng là mốc **không có gì kích hoạt**: không ai quét thẻ, không ai nộp đơn.
Ba mốc luật được mã hóa thành ràng buộc, không chỉ ghi trong chú thích:

- **Điều 45** — thông báo bằng văn bản **chậm nhất 15 ngày** trước khi hết hạn. Có bài kiểm
  đòi mốc `15` phải nằm trong bộ mốc, để ai sửa bộ mốc mà bỏ mất nó thì đỏ test.
- **Điều 20.2** — quá **30 ngày** vẫn làm việc mà chưa ký mới thì hợp đồng **tự thành không
  xác định thời hạn**. Lời nhắc đếm ngược đúng số ngày còn lại của mốc này.
- **Điều 27** — thử việc có bộ mốc riêng (7/3/0); mốc 45 ngày sẽ rơi vào trước cả khi hợp
  đồng bắt đầu.

Thông báo đẩy **không phải "văn bản" theo Điều 45** — nó chỉ để nhân sự không bỏ sót hạn.
Nói rõ điều này ngay trên giao diện.

Mốc đã nhắc ghi vào `da_nhac_han`. Hợp đồng nhập vào hệ thống khi chỉ còn 3 ngày sẽ gửi
**một** thông báo và ghi nhận **cả** 45/30/15/7 — không làm vậy thì vòng sau nhắc tiếp mốc
15, rồi 30, rồi 45: bốn thông báo cho một hợp đồng, và người nhận sẽ tắt thông báo.

`da_nhac_han` được ghi **trước** khi gửi. Gửi trước rồi ghi sau, một lần hỏng ở giữa sẽ làm
vòng kế tiếp nhắc lại — và nhắc lại mãi.

Trang **Hợp đồng** (menu Quản trị nhân sự) có hai tab: *Sắp hết hạn* và *Tìm trong nội dung*.
Hợp đồng **đã hết hạn luôn hiện**, không phụ thuộc bộ lọc số ngày — một hợp đồng hết hạn ba
tháng trước là thứ cần thấy nhất, và nó không còn "sắp" nữa nên mọi bộ lọc theo ngày còn lại
đều sẽ làm nó biến mất.

### Sửa — trang Đồng bộ ERP sẽ trắng trang khi bấm "Chạy thử"

Tìm thấy khi viết hộp thoại trích nội dung, không phải khi chạy thử.

`dung_hanh_dong().chay` trả về **`boolean`**. Trang Đồng bộ ERP gọi nó rồi
`dat_kq(r as unknown as KetQua)` — nghĩa là lưu `true` đã bị ép kiểu. Ngay sau đó
`kq.chi_tiet.slice(0, 300)` đọc thuộc tính của `true` → `undefined.slice` → **trắng trang**,
đúng vào lúc nhân sự vừa bấm nút và đang cần biết nó sẽ tạo/sửa ai.

Trình biên dịch không cản được vì `as unknown as` đã tắt hết kiểm tra.

Cách chữa: thêm `chay_lay<T>()` trả về **kết quả** (hoặc `null` khi lỗi) thay vì boolean, và
đọc `kq.chi_tiet ?? []` — hỏng ở đây là trắng trang nên không tin vào kiểu khai báo.

### Sửa — hạn giờ của chương trình ngoài có thể treo vĩnh viễn

Bản đầu của `chay_lenh` gọi `tt.kill()` rồi chờ sự kiện `close`. Bài kiểm chạy
`sh -c 'yes'`: giết `sh` xong `yes` **mọc ra ngoài**, vẫn giữ đầu ra, nên `close` không bao
giờ đến — hạn giờ 1 giây thành treo vô hạn. Đã thấy tiến trình mồ côi quay 81% CPU.

Chữa bằng ba việc: nhóm tiến trình riêng (`detached`) để giết được **cả nhóm**, phá luôn ba
đường ống, và **trả lời ngay** thay vì chờ `close`. Có bài kiểm đo thời gian trả lời.

### Thêm — hai lớp rào mới

- **Bài kiểm `icon.css` ↔ glyph thật trong `.woff2`.** Rào cũ chỉ đối chiếu mã nguồn với
  CSS. Thêm icon là **hai** việc — thêm dòng CSS *và* cắt lại font — và làm thiếu việc thứ
  hai cho ra ô vuông rỗng trên màn hình thật, không lỗi, không cảnh báo. Bài kiểm mới tự
  đọc bảng `cmap` trong WOFF2 (giải nén brotli, tính offset qua bảng thư mục). Đã thử: thêm
  một dòng CSS không có glyph thì test đỏ đúng dòng đó. Kèm cả chiều ngược lại — font mang
  glyph không ai dùng là dấu hiệu lần cắt sau sẽ cắt thiếu.
- **Bài kiểm biến môi trường không lọt sang tiến trình con.** Biến môi trường của máy chủ
  có mật khẩu CSDL và khóa JWT; một bộ OCR không cần biết.

### An toàn

`pdftotext` / `pdftoppm` / `tesseract` đều viết bằng C và đều từng có lỗ hổng đọc bộ nhớ.
Bốn ràng buộc cứng trong `lenh_ngoai.ts`: không bao giờ qua shell (`spawn` với mảng đối số),
có hạn giờ, có trần đầu ra, và nhóm tiến trình riêng.

Hai ranh giới của API được kiểm bằng e2e:

- **Tệp phải thuộc chính nhân viên đó.** Thiếu ràng buộc này thì ai sửa được một hợp đồng sẽ
  đọc được nội dung tệp của **bất kỳ ai**, chỉ bằng cách đoán mã tệp — và nội dung sẽ hiện
  ra ngay trên hợp đồng họ vừa sửa.
- **Quyền đi theo nhóm `hop_dong`.** Trưởng phòng không đọc được hợp đồng thì cũng không đọc
  được nội dung hợp đồng — nội dung hợp đồng **có lương**.

Ô tìm kiếm dùng `position()` chứ không `ilike '%...%'`: `%` và `_` là ký tự thường, gõ dấu
`%` vào không biến thành "khớp mọi hợp đồng". Có bài kiểm.

### Tài liệu

[`tai_lieu/HOP-DONG.md`](tai_lieu/HOP-DONG.md) — ba đường trích và độ tin cậy, bảng thông
báo lỗi kèm cách xử lý, các mốc nhắc hạn và căn cứ luật, cách kiểm tra máy chủ có OCR chưa.

**264 unit + 15 thiết kế + 238 e2e, tất cả đạt.** Typecheck và build sạch.

### Còn tồn

- Gửi hợp đồng đi ký qua vContract vẫn chờ anh hoàn tất đăng ký, và chờ hai câu trả lời:
  ai ký phía công ty, và dùng bản production hay bản test.
- Chưa có việc tự tải bản PDF đã ký về `ho_so_tep`.

## [1.16.4] — 2026-08-14

**Tài liệu sao lưu — và hai lỗi trong quy trình phục hồi cũ.**

Kéo bản sao lưu về máy khác là việc lặp lại hàng tháng, chạy trên hai máy khác nhau. Trong
một buổi làm việc đã nhầm máy ba lần: `rsync` chạy trên VPS để kéo từ VPS về chính nó,
`du` gõ vào PowerShell, `Add-Content` gõ vào bash.

### Thêm

- **[`tai_lieu/SAO-LUU-VA-PHUC-HOI.md`](tai_lieu/SAO-LUU-VA-PHUC-HOI.md).** Mỗi khối lệnh
  ghi rõ chạy trên **VPS** hay trên **máy người dùng**. Kèm mục diễn tập phục hồi vào một
  CSDL nháp — bản sao lưu chưa từng thử phục hồi thì chưa phải bản sao lưu.

### Sửa

- **Quy trình phục hồi trong `TRIEN-KHAI.md` sẽ hỏng nếu chạy thật.** Nó đổ bản kết xuất
  đè lên CSDL đang chạy, mà `pg_dump` ở đây là SQL thuần: gặp bảng đã có sẽ dừng giữa chừng
  với `relation already exists` và để lại dữ liệu chắp vá. Quy trình đúng phải dừng máy
  chủ, dựng lại CSDL rỗng, rồi mới nạp.
- **Kịch bản cron mẫu bỏ sót volume `ho_so`** — nơi giữ **bản gốc** hợp đồng scan và biên
  bản. CSDL chỉ lưu tên tệp chứ không lưu nội dung, nên mất volume đó là mất hẳn. Đường dẫn
  trong kịch bản cũng sai so với bản triển khai thật (`/opt/cham-cong`, `/var/backups`).
- **Mục lục tài liệu trong README thiếu 4 tệp**, trong đó có `API-TICH-HOP.md` — tài liệu
  bên tích hợp cần đọc mà không có đường nào dẫn tới.

## [1.21.0] — 2026-08-16

**Đồng bộ người dùng từ ERP cũ, nối với Microsoft 365.**

Đọc *Hướng dẫn tích hợp & đồng bộ dữ liệu qua API — Trần Hoàng Việt Nam*, endpoint
`GET /external/users`.

### Thêm

- **Email là khóa nối ba hệ thống**: `ERP.email == nhan_vien.email == UPN của M365`. Đăng
  nhập Microsoft đã tìm người theo `lower(nhan_vien.email)`, nên đồng bộ đúng email là
  nhân viên đăng nhập được bằng tài khoản công ty ngay — không phải khai báo bước thứ ba.
- **Chế độ chạy thử.** Đọc ERP, cho biết sẽ tạo/sửa ai, **không ghi gì**. Bắt buộc có bước
  này vì đồng bộ tạo và sửa nhân viên hàng loạt.
- Trang **Hệ thống → Đồng bộ ERP** (chỉ admin), kèm nút *"Ai chưa có email?"* — những
  người đó không đăng nhập M365 được, và không có gì báo lỗi cho tới khi chính họ thử.
- Bảng `dong_bo_erp` ghi mọi lượt kèm **chi tiết từng bản ghi**.
- 15 bài e2e dựng **máy chủ ERP giả** trả đúng "phong bì" `{success, result:{items,
  totalCount}}` có phân trang.

### Bốn quy tắc an toàn

| Tình huống | Hệ thống làm gì |
|---|---|
| Bản ghi ERP không có email | Bỏ qua — không nối được M365 |
| Người biến mất khỏi kết quả ERP | **Không xóa, không tự tắt** |
| PIN máy, ca làm, phòng ban | **Không đụng tới** |
| Email đã thuộc về người nối ERP khác | Bỏ qua và báo |

Tài liệu ERP mục 4.3 nói rõ API không báo bản ghi bị xóa. Suy *"không thấy = đã nghỉ việc"*
là cách chắc chắn nhất để một ngày ERP lỗi giữa chừng thì cả công ty bị tắt.

### Sửa

- **`cau_hinh.ts` có hai khóa `erp` trùng tên.** Khối mới cho API ERP đặt cạnh khối
  `erp: { webhook_url, webhook_secret }` đã có — trong object literal thì khóa sau đè khóa
  trước, nên `ERP_WEBHOOK_URL` sẽ thành `undefined` và outbox ERP chết âm thầm. Đã gộp làm
  một. Bắt được nhờ đọc lại tệp sau khi sửa, không phải nhờ typecheck.

221 unit + 13 thiết kế + 220 e2e, tất cả đạt.

## [1.20.0] — 2026-08-16

**Nạp danh mục vi phạm thật từ Nội quy lao động của công ty.**

Đọc *Nội quy lao động số 01/2026/NQLĐ-TPVN* (bản 16/07/2026) và nạp toàn bộ **Phụ lục —
Danh mục hành vi vi phạm**: 64 hành vi, 11 nhóm A–L.

### Thêm

- **Bốn mức độ thay vì ba.** Nội quy phân *Nhẹ / Trung bình / Nặng / Rất nặng*, gắn với
  thang giảm thưởng P3 **5% / 15% / 30% / tới 100%** (Điều 14 Nội quy).
- **Cột `giam_thuong_p3_phan_tram`.** Chế tài tài chính của Nội quy là **giảm thưởng P3**
  — thưởng theo kết quả công việc, là *điều kiện hưởng thưởng* theo Điều 104 BLLĐ. Nội quy
  ghi rõ đây **không phải phạt tiền và không phải hình thức kỷ luật**. Hệ thống vẫn không
  tự trừ đồng nào vào lương; việc giảm thưởng do Quy chế thưởng quyết định.
- **Cột `chi_tiet_che_tai` giữ nguyên văn** cột "Hình thức xử lý" của Phụ lục. Các khoản
  trong đó có điều kiện và bậc tăng dần không mã hóa máy móc được (*"đi muộn quá 10 phút"*,
  *"tái phạm nhiều lần trong tháng"*). Ép chúng thành một con số là làm sai văn bản đã ban
  hành — người xử lý phải đọc đúng câu chữ.
- Sáu bài kiểm cho danh mục, trong đó có bài đọc lược đồ CSDL và **bắt buộc không tồn tại
  cột nào tên `tien_phat` / `so_tien` / `muc_phat`** (Điều 127).

### Sửa

- Bảy loại vi phạm mặc định của hệ thống bị **tắt, không xóa** — có thể đã có bản ghi trỏ
  tới chúng.
- Ràng buộc `nhom` cũ (6 giá trị) không đủ cho 11 nhóm của Phụ lục, đã gỡ.

221 unit + 13 thiết kế + 205 e2e, tất cả đạt.

### Còn tồn

`trich_docx` trả **0 ký tự** trên tệp .docx thật — đã gặp hai lần (tài liệu vContract và
Nội quy này). Tính năng "quét nội dung hợp đồng sang text" phụ thuộc hàm này. Chưa sửa.

> **Ghi chú sai — đã đính chính ở [1.22.0](#1220--2026-08-18).** Chạy lại `trich_docx` trên
> đúng ba tệp .docx đó cho ra 121 / 400 / 400 đoạn và 12.576 / 14.507 / 33.520 ký tự. Hàm
> vẫn đọc được. Cái thật sự thiếu là **không có gì gọi nó**: di trú 015 đã tạo cột
> `noi_dung_text` nhưng chưa có đường ghi vào cột đó.

## [1.19.0] — 2026-08-15

**Vi phạm và KPI — API và giao diện.**

Hai module trước đó mới có lược đồ. Nay đầy đủ và lên được menu quản trị.

### Thêm — Vi phạm (Module G)

Ba ranh giới pháp lý được **kiểm bằng bài kiểm**, không chỉ ghi trong chú thích:

- **Áp dụng kỷ luật mà thiếu biên bản cuộc họp thì bị từ chối** (Điều 122). *Nhắc nhở*
  không phải kỷ luật chính thức nên không đòi biên bản.
- **Máy phát hiện chỉ ghi ở trạng thái `mới`.** Không có đường đi thẳng sang kỷ luật.
  Người lao động xem được vi phạm của mình và gửi được giải trình (Điều 122).
- **Không endpoint nào chạm tới bảng lương** — có bài kiểm đọc thẳng mã nguồn tìm tham
  chiếu tới `phieu_luong`/`thuc_linh`/`tru_khac` và bắt phải rỗng (Điều 127).

Quét lại nhiều lần không sinh bản ghi trùng. Bốn quy tắc mặc định vẫn **tắt sẵn**.

### Thêm — KPI

- Chấm điểm nội suy tuyến tính giữa hai mốc, **22 bài kiểm thuần** bằng số tính tay.
- **Thiếu dữ liệu trả `null` chứ không phải 0** — người mới vào làm không bị chấm 0 oan;
  chỉ số đó bị loại khỏi phép trung bình thay vì kéo điểm xuống.
- Tổng điểm chia cho **tổng trọng số thực tế**, nên thêm/bớt chỉ số không làm vỡ thang
  điểm của những kỳ trước.
- Bảng chi tiết hiện **cả giá trị thô lẫn thang chấm** — người bị chấm đối chiếu được với
  dữ liệu gốc, không chỉ thấy một con điểm.
- Sửa tay điểm **bắt buộc nêu lý do**, và tính lại kỳ không ghi đè lên điểm đã sửa.

### Sửa

- **Bài kiểm e2e xoá mất danh mục KPI do di trú gieo.** `danh_muc_kpi` có khoá ngoại tới
  `phong_ban`, mà `TRUNCATE … CASCADE` xoá **mọi** bảng tham chiếu tới bảng bị xoá — kể cả
  khi giá trị là NULL. Nay chạy lại hai tệp di trú (vốn viết idempotent) sau khi dọn.
- `POST /api/ky-kpi/:id/chot` gọi không kèm thân yêu cầu thì nổ 400.

221 unit + 13 thiết kế + 199 e2e, tất cả đạt.

## [1.18.1] — 2026-08-15

**Trang Tham số lương — và ba biểu tượng không tồn tại.**

### Sửa

- **Trang Bảng lương chỉ người dùng tới một mục không có thật.** Nó ghi "kế toán phải đối
  chiếu lại… trong mục *Hệ thống → Tham số lương*" nhưng mục đó chưa bao giờ được làm. API
  `/api/tham-so-luong` đã có từ 1.17.0, chỉ thiếu giao diện — và đúng chỗ quan trọng nhất,
  nơi quyết định số tiền trừ bảo hiểm và thuế của cả công ty.
- **Ba biểu tượng menu không có trong font.** Font icon của dự án là bản **cắt subset** chỉ
  chứa 33 icon đang dùng. Gõ tên một icon có thật của Tabler nhưng chưa nằm trong subset thì
  **không có gì báo lỗi** — nó chỉ đơn giản không hiện, lọt qua cả typecheck lẫn build.
  `cash` (Bảng lương, đã lên VPS ở 1.17.0), `scale` (vừa thêm), `folder` (Kho tệp hồ sơ, có
  từ trước). Đổi sang `receipt-2`, `settings`, `file-text`.

### Thêm

- **Trang Tham số lương** (*Hệ thống → Tham số lương*). Bày ra phép tính bằng số cụ thể để
  kiểm tra được hệ thống hiểu đúng luật hay không mà không phải đọc mã nguồn — hai **trần
  đóng khác nhau** đặt cạnh nhau vì đó là chỗ hay nhầm nhất. Thêm mốc hiệu lực mới điền sẵn
  theo mốc đang áp dụng; biểu thuế TNCN tự sao chép để không phải gõ lại 7 bậc.
- **Rào chắn biểu tượng** (`thiet_ke/icon.test.mjs`): mọi icon dùng trong webapp phải có
  trong `web/src/icon.css`, nếu không thì `npm test` đỏ. Đã thử đặt lại `cash` để xác nhận
  rào chắn bắt được.

199 unit + 13 thiết kế + 177 e2e, tất cả đạt.

## [1.18.0] — 2026-08-15

**Hợp đồng điện tử vContract (Viettel) — nền tảng giao thức.**

Đọc *Tài liệu đặc tả API tích hợp vContract v1.0.11* + bộ Postman do Viettel cung cấp.
Bản này làm tầng giao thức, lưu trữ và luồng callback; giao diện và luồng gửi ký từ hồ sơ
nhân sự ở bản sau.

### Thêm

- **Bộ giải mã giao thức** (`may_chu/src/vcontract/giao_thuc.ts`) — hàm thuần, 16 bài kiểm.
  Chuỗi base64 trong bài "login thật" **chép nguyên từ đặc tả mục III.1**.
- **Tầng gọi** (`may_chu/src/vcontract/khach.ts`): giữ token, tự đăng nhập lại khi hết hạn,
  chặn đăng nhập song song, ghi nhật ký mọi lần gọi. Thân yêu cầu đăng nhập **không bao giờ
  được ghi** vì chứa mật khẩu.
- **Đường callback** `/vcontract/receive-result-request` và `/vcontract/receive-result-contract`,
  bảo vệ bằng `VCONTRACT_TOKEN_CALLBACK` so sánh không lộ thời gian. Để trống = từ chối tất cả.
- **Hai bảng** `hop_dong_dien_tu` và `nhat_ky_vcontract` (ghi cả hai chiều), cùng bốn cột
  nội dung hợp đồng dạng văn bản trên `hop_dong_lao_dong`.
- 13 bài e2e cho luồng callback.

### Bốn chỗ dễ sai của giao thức, đã xử lý

- **Mọi phản hồi bọc base64**, và `data` bên trong lại là chuỗi JSON — hai lần phải giải.
  Tài liệu còn đưa ví dụ `data` ở dạng khoá không có nháy kép, nên có đường dự phòng riêng.
- **Phản hồi callback của ta cũng phải bọc base64.** Trả JSON trần thì vContract coi là thất
  bại, retry đúng 3 lần rồi bỏ — hợp đồng kẹt trạng thái cũ mà không có gì báo.
- **Thông báo đến theo từng phần**: thông báo "khách hàng đã ký" không kèm `urlDownloadFile`,
  ghi đè null lên là xoá mất địa chỉ tệp đã nhận trước đó. Mọi cột dùng `coalesce`.
- **`contractStatus` không phải lúc nào cũng có**; suy từ `status`, và trả `null` khi không
  suy được — giữ trạng thái cũ còn hơn ghi đè bằng phỏng đoán.

### Sửa

- **Một bài kiểm push chập chờn theo giờ chạy.** Nó lấy ngày `hôm nay − 3` trong khi bài
  "quên quẹt thẻ" dùng `NGAY − 1`; qua nửa đêm giờ Việt Nam hai ngày trùng nhau và đơn giải
  trình thứ hai bị 409. Nay neo vào `NGAY` nên khoảng cách cố định.

199 unit + 177 e2e, tất cả đạt.

## [1.17.0] — 2026-08-15

**Chạy được 140 bài kiểm thử e2e lần đầu — và ba bài trong đó đang hỏng.**

Từ đầu dự án tôi không dựng được PostgreSQL trong môi trường phát triển nên bộ e2e chưa
bao giờ được thực thi, chỉ được viết. Bản này chạy được. Ba bài đỏ ngay.

### Sửa

- **Ba bài e2e sai kỳ vọng.** Bài RTLOG (thêm ở 1.15.0) đẩy một lần quét lúc `07:58:11` —
  sớm hơn mốc `08:12:03` của bài ATTLOG phía trên — nên giờ vào của ngày đó đổi. Ba bài
  sau vẫn giữ con số cũ: `437` phải là `450` (kẹp về đầu ca 08:00, trừ 90p nghỉ), và ngày
  lễ `503` phải là `517` (không có giờ ca để kẹp nên tính toàn bộ thời gian có mặt). **Bộ
  tính công đúng, chỉ bài kiểm sai** — nhưng nếu không chạy thì không cách nào biết. Đã
  ghi chú ngay tại bài RTLOG để lần sau ai đổi giờ ở đó biết phải sửa những đâu.
- **Nút "Xuất CSV" ở trang Bảng công tải về thứ khác với thứ đang xem.** Màn hình hiện
  bảng tổng hợp tháng (mỗi nhân viên một dòng) nhưng nút xuất lại tải chi tiết từng ngày.

### Thêm

- **Thông báo đẩy — mắt xích cuối cùng.** App đã xin quyền, lấy Expo token và gửi lên máy
  chủ; máy chủ đã lưu vào `token_push`. Nhưng **không có gì đọc bảng đó**: nhân viên nộp
  đơn thì quản lý không hay, đơn được duyệt thì nhân viên không hay. Nay:
  - Đơn nghỉ phép / giải trình mới → trưởng phòng **và** mọi tài khoản nhân sự/admin.
    Gửi cho cả nhân sự là có chủ đích: phòng chưa gán trưởng phòng thì đơn không đến tay
    ai, và đó đúng là lúc đơn bị bỏ quên lâu nhất.
  - Duyệt / từ chối → người gửi đơn, kèm ghi chú của người duyệt.
  - Token bị Expo báo `DeviceNotRegistered` tự bị xóa, để bảng không phình mãi.
  - **Không bao giờ chặn luồng chính**: Expo hỏng thì đơn vẫn nộp và duyệt bình thường.
  - Tắt bằng `THONG_BAO_DAY=0` — nên tắt khi nạp lại dữ liệu cũ hàng loạt.
- **Xuất CSV tổng hợp tháng** (`kieu=thang`): mỗi nhân viên một dòng, đúng bảng đang xem,
  kèm số công / ngày có mặt / vắng / nghỉ phép / phút làm / phút OT / số lần đi muộn. Liệt
  kê cả nhân viên **không có ngày công nào** — kế toán cần thấy họ để còn hỏi, chứ không
  phải để họ biến mất khỏi bảng lương. Thời lượng xuất bằng **phút nguyên**, không phải
  giờ thập phân: máy Việt Nam hay đặt dấu phẩy làm dấu thập phân, mà dấu phẩy cũng là dấu
  phân cách cột của CSV — số `7,5` sẽ bị tách làm hai ô.
  `kieu=ngay` giữ nguyên hành vi cũ và vẫn là mặc định, nên link cũ không hỏng.
- **11 bài e2e mới** cho hai tính năng trên. Phần thông báo dựng một máy chủ Expo giả trên
  `127.0.0.1:39217` để đối chiếu đúng nội dung gửi đi, không gọi ra Internet.
- **README chỉ cách chạy e2e ngay trên VPS** mà không đụng dữ liệu thật.

Tổng: 181 bài unit + 151 bài e2e, tất cả đạt.

### Còn chặn

Module C (lương/BHXH/thuế), D (hợp đồng), G (vi phạm) vẫn chờ kế toán và luật sư xác nhận
tham số pháp lý. Màn "Lương" trên app cố ý chỉ hiện cơ sở tính công, không hiện số tiền.

## [1.16.3] — 2026-08-14

**Biến khai trong `.env` nhưng không vào được container.**

Bản 1.16.2 thêm `API_GOC_CONG_KHAI`, khai đúng vào `.env` trên VPS, triển khai lại — spec
vẫn thiếu `servers`. Nguyên nhân: `docker-compose.yml` khai `environment:` **tường minh**
chứ không dùng `env_file`, nên biến nào không có tên trong danh sách đó thì Docker bỏ qua,
dù `.env` có. Ứng dụng không báo lỗi, nó chạy bằng giá trị mặc định — lặng lẽ sai.

### Sửa

- **Thêm `API_GOC_CONG_KHAI` và `API_TAI_LIEU_CONG_KHAI`** vào khối `environment:` của
  service `may_chu`. Biến thứ hai có từ 1.16.0 và cũng chưa bao giờ dùng được — công tắc
  tắt trang Swagger UI thực tế không tắt được gì.
- **Thêm `ANH_TOI_DA_BYTE`** — do rào chắn mới bên dưới tìm ra. Giới hạn dung lượng ảnh
  selfie chấm công chưa bao giờ chỉnh được ở production, luôn kẹt ở mặc định 3 MB.
- **`TU_DONG_DI_TRU` nay đọc được từ `.env`** thay vì bị ghi cứng `"1"` trong compose. Mặc
  định không đổi.
- **Token màu ảnh đại diện chuyển về `thiet_ke/token.json`.** `web/src/token_thiet_ke.css`
  là tệp **sinh ra**; bản 1.16.0 sửa tay thẳng vào đó, nên lần chạy `npm run sinh_token`
  kế tiếp sẽ xoá sạch `--av-s` / `--av-l` / `--av-chu` và ảnh đại diện mất màu. Giá trị giữ
  nguyên, chỉ đổi nơi khai; ghi chú về phép quét 360 hue cũng dời sang `token.json`.

### Thêm

- **Rào chắn biến môi trường** (`may_chu/test/bien_moi_truong.test.ts`). Mọi biến
  `cau_hinh.ts` đọc phải có tên trong `docker-compose.yml` **và** được tả trong
  `.env.example`, nếu không thì `npm test` đỏ. Đây đúng là lỗi vừa mắc: thêm biến vào mã
  nguồn mà quên compose thì không có gì báo, phải chờ tới lúc chạy thật mới lộ.

## [1.16.2] — 2026-08-14

**Ba khiếm khuyết của spec, phát hiện khi chạy thật bộ sinh client.**

Chạy `openapi-generator` lên spec 1.16.1 ra client dùng được nhưng đọc không hiểu. Cả ba lỗi
đều không lộ ra khi chỉ nhìn spec hay xem Swagger UI — phải sinh mã thật mới thấy.

### Sửa

- **Tên tag đổi sang không dấu.** Bộ sinh mã dùng tag làm **tên lớp** và cắt sạch ký tự ngoài
  ASCII: `Bảng công` → `BngCngApi`, `Sự kiện` → `SKinApi`, `Nhân viên` → `NhnVinApi`. Nay tag
  là `BangCong`, `SuKien`, `NhanVien`… còn tên tiếng Việt có dấu chuyển sang `description`
  nên Swagger UI vẫn đọc dễ.
- **Thêm `operationId` cho cả 9 thao tác.** Thiếu nó, bộ sinh mã tự bịa tên hàm từ đường dẫn:
  `apiV1BangCongTongHopGet` thay vì `layTongHopThang`.
- **Thêm `servers`** qua biến mới **`API_GOC_CONG_KHAI`**. Thiếu nó, client sinh ra mặc định
  trỏ về `http://localhost` và không gọi được gì. Phải khai tay vì máy chủ nằm sau reverse
  proxy nên không tự suy ra được: bên ngoài gọi `/chamcong/api/v1/...` còn bên trong container
  chỉ thấy `/api/v1/...`.
- **Rào chắn nay đòi cả `operationId`** — thiếu thì máy chủ không khởi động, như với
  `summary`/`tags`/`security`.

## [1.16.1] — 2026-08-14

### Sửa

- **Link tài liệu API thiếu tiền tố triển khai.** Trang Khóa API dựng link bằng
  `window.location.origin`, nên khi webapp chạy dưới tiền tố (`/chamcong/`) thì link chép đi
  bị thiếu tiền tố và nhận 404. Nay dùng `goc_api_tuyet_doi()` lấy từ chính cấu hình của
  webapp. Tài liệu cũng viết chỗ có chỗ không — đã thống nhất và nói rõ `<GỐC>` là gì.
- Tài liệu bổ sung **cách sinh client bằng Docker** (không cần cài gì) bên cạnh cách qua
  `npx`, và nói rõ `npx` vẫn **cần Java 11+** vì `openapi-generator` là công cụ Java —
  `npx` chỉ tải phần vỏ gọi. Kèm ghi chú: sinh mã là việc trên máy của bên tích hợp, không
  phải trên VPS chấm công.

## [1.16.0] — 2026-08-14

**Swagger / OpenAPI cho `/api/v1`.**

### Thêm mới

- **`GET /api/v1/openapi.json`** — spec OpenAPI 3.1, không cần khóa. Bên tích hợp dán vào
  `openapi-generator`, Postman hay Insomnia là ra sẵn thư viện gọi API bằng ngôn ngữ của họ.
- **`GET /api/v1/tai-lieu/`** — Swagger UI bấm thử được. Công khai có chủ đích: nó chỉ bày ra
  **hợp đồng**, không bày ra dữ liệu — muốn gọi thật vẫn phải có khóa. Tắt bằng
  `API_TAI_LIEU_CONG_KHAI=0`.
- Trang **Khóa API** có sẵn hai đường dẫn để gửi cho bên tích hợp, kèm nhắc gửi khóa qua kênh
  khác với tài liệu.

### Đáng chú ý

- **Chỉ tài liệu hóa `/api/v1`, không đụng 97 endpoint nội bộ.** Chúng đổi theo giao diện và
  không có cam kết tương thích; tài liệu hóa chúng chỉ tạo ra một đống phải bảo trì mà không
  ai đọc.
- **Rào chắn chống tài liệu trôi.** Tài liệu viết tay luôn trôi khỏi thực tế — thêm đường dẫn
  rồi quên cập nhật spec là chuyện chắc chắn xảy ra, và lúc đó Swagger còn tệ hơn không có gì
  vì nó nói dối một cách tự tin. Nay một tuyến trong `/api/v1` thiếu `summary`/`tags`/`security`
  thì **máy chủ không khởi động**, kèm thông báo chỉ đúng đường dẫn nào và cách sửa. Đã thử
  bằng cách thêm một tuyến thiếu mô tả để xem nó có chặn thật không.
- **Schema chỉ để sinh tài liệu, không kiểm tra đầu vào.** Mọi tham số khai `type: 'string'` và
  `additionalProperties: true` — đúng với thực tế (tham số truy vấn qua HTTP vốn là chuỗi) và
  không bao giờ từ chối request. Bộ kiểm tra tay hiện có trả lỗi tiếng Việt rõ hơn nhiều so với
  lỗi mặc định của Fastify, nên giữ nguyên. Phần `response` cũng chỉ khai `description`, không
  khai `type`, để Fastify không cắt bớt trường khi tuần tự hóa.

## [1.15.0] — 2026-08-14

**API tích hợp `/api/v1` — cổng cho hệ thống ngoài gọi vào.**

ERP/kế toán, phần mềm nhân sự khác và cổng thông tin nội bộ giờ nối vào được như một dịch vụ
độc lập, không phải mượn tài khoản người dùng.

### Thêm mới

- **Khóa API + phạm vi quyền** (di trú `011`). Xác thực bằng khóa sống lâu thay vì JWT 15 phút
  — hệ thống ngoài chạy theo lịch lúc 2 giờ sáng, không có ai ngồi nhập mật khẩu. Khóa gắn với
  **một bên tích hợp** chứ không phải một người: thu hồi khóa của ERP không làm ai mất quyền
  đăng nhập.
  - Bảy phạm vi: `nhan_vien:doc|ghi`, `bang_cong:doc`, `lan_quet:doc`, `nghi_phep:doc`,
    `ho_so:doc`, `su_kien:doc`.
  - **Không có phạm vi ghi cho bảng công và lần quẹt** — đó là bản ghi gốc để tính lương; cho
    hệ thống ngoài ghi đè là mở đường sửa sổ chấm công mà không qua duyệt. Có test khóa điều này.
  - CSDL chỉ giữ **mã băm SHA-256**; khóa gốc hiện đúng một lần lúc tạo. Lưu khóa gốc nghĩa là
    ai đọc được một bản sao lưu là gọi được API thật.
  - Khai thêm được **dải IP** cho từng khóa — khóa lộ ra ngoài cũng không dùng được từ chỗ khác.
- **Đường dẫn `/api/v1/*`**: `toi`, `nhan-vien` (đọc + upsert theo `ma_nv`), `bang-cong`,
  `bang-cong/tong-hop`, `lan-quet`, `nghi-phep`, `su-kien`.
  - Định danh đối ngoại là **`ma_nv`**, không lộ UUID nội bộ — bên tích hợp gắn vào UUID rồi ta
    đổi cơ sở dữ liệu là họ hỏng hết.
  - Hình dạng phản hồi **cố định**: `{ du_lieu, phan_trang }` cho danh sách,
    `{ loi: { ma, thong_diep } }` cho lỗi. `ma` là thứ client đối chiếu bằng code, nên sửa chữ
    tiếng Việt trong `thong_diep` không làm hỏng bên nào.
  - Bảng công mặc định **chỉ trả ngày đã chốt**: ngày chưa chốt còn đổi (nhân sự sửa tay, đơn
    nghỉ duyệt muộn), bên lương lấy về là tính xong rồi số liệu đổi.
  - `PUT /nhan-vien/{ma_nv}` là **upsert**, và **trường không gửi thì giữ nguyên** — hệ thống
    nhân sự bên kia thường chỉ biết một phần thông tin, gửi thiếu mà bị xóa mất `pin_may` là
    mất chấm công của người đó. Không có đường xóa nhân viên qua API.
  - `GET /su-kien?tu_id=` để kéo sự kiện về khi bên tích hợp không nhận webhook được. Hệ thống
    **không giữ con trỏ cho từng bên**, nên nhiều hệ thống cùng đọc mà không đạp nhau.
- **Nhật ký gọi API**: mọi lần gọi vào `/api/v1` đều được ghi, kể cả lần bị từ chối 401/403. Bên
  tích hợp báo "hôm qua không lấy được dữ liệu" thì tra ra được, không phải đôi co.
- **Trang Khóa API** (Hệ thống, chỉ admin): tạo, tắt/bật, xóa, xem nhật ký gọi.
- Tài liệu `tai_lieu/API-TICH-HOP.md` — kèm quy tắc thay đổi về sau: trong `v1` chỉ được thêm,
  muốn xóa trường hay đổi kiểu thì phải mở `v2` và chạy song song.

## [1.14.5] — 2026-08-14

**Máy đẩy chấm công bằng `table=rtlog` — trước đây bị vứt đi im lặng.**

Đây là mắt xích cuối. Máy đã kết nối, đã nhận lệnh, nhưng quẹt vẫn không hiện lên hệ thống.
Log tên bảng máy gửi cho thấy nguyên nhân:

```
table=rtlog                          <- chấm công nằm ở đây
table=rtstate                        <- nhịp tim trạng thái máy
table=tabledata&tablename=user       <- danh sách người dùng
table=tabledata&tablename=biophoto   <- ảnh khuôn mặt
table=options
```

Code chỉ hiểu `ATTLOG`. `rtlog` rơi vào nhánh "bảng khác, bỏ qua" → **mọi lần quẹt đều bị
vứt**, mà máy vẫn nhận `OK` nên không có dấu hiệu gì bất thường ở cả hai phía.

### Sửa

- **Đọc được `table=rtlog`.** Định dạng khác hẳn ATTLOG: không phải cột phân tách bằng TAB
  mà là các cặp `khoa=giá trị` (`time=… pin=… inoutstatus=… verifytype=…`). Đọc xong đi vào
  đúng đường nghiệp vụ cũ — chống trùng, tra PIN ra nhân viên, tính lại bảng công ngay.
- **Bỏ qua sự kiện của thiết bị** (`pin=0` hoặc thiếu `pin`): đó là mở cửa bằng nút, báo
  động… Ghi chung vào bảng chấm công thì sinh ra công của "nhân viên PIN 0".
- **`rtstate` im lặng** — nhịp tim vài lần mỗi giây, không mang dữ liệu chấm công.
- **Thân tin nhắn không đọc được thì ghi nguyên văn vào log** ở mức `warn`, thay vì bỏ qua.
- **Bảng chưa xử lý nay ghi log mức `info` chứ không phải `debug`.** Production chạy ở mức
  `info`, nên để `debug` thì một bảng mang dữ liệu thật bị bỏ qua sẽ **không để lại dấu vết
  nào** — đúng lỗi vừa làm mất nhiều giờ.

## [1.14.4] — 2026-08-14

**Máy PUSH 3.x hỏi lệnh qua `/iclock/push`, không phải `/iclock/getrequest`.**

Sau khi có `registry` (1.14.3), máy `NYU7261300256` hiện "Kết nối" và báo được firmware, IP —
nhưng cột **Lệnh chờ đứng im ở 5** và quẹt vẫn không về. Log đếm endpoint trong 10 phút:

```
80 /iclock/push       <- 404, chưa có endpoint này
40 /iclock/registry
40 /iclock/cdata
      (không có getrequest lần nào)
```

### Sửa

- Thêm **`POST /iclock/push`** (kèm `GET` cho chắc) — kênh hỏi lệnh của firmware PUSH 3.x.
  Firmware đời cũ dùng `GET /getrequest`, đời mới **không gọi đường đó nữa**. Thiếu endpoint
  thì máy nhận 404 và làm lại cả chu kỳ `cdata → registry → push` mỗi 15 giây, không bao giờ
  đẩy `ATTLOG` — nên trên webapp máy vẫn xanh "Kết nối" mà không có dữ liệu nào về.
- Hai đường **dùng chung một hàng đợi** và cùng câu `UPDATE … FOR UPDATE SKIP LOCKED`, nên
  một lệnh chỉ đi xuống đúng một lần dù máy hỏi bằng đường nào. Có test riêng cho điều này:
  lấy lệnh qua `/push` rồi gọi `/getrequest` phải không thấy lại lệnh đó.
- `/push` ghi log truy vấn và thân tin nhắn để đối chiếu nếu định dạng trả về còn chưa vừa ý
  firmware.

## [1.14.3] — 2026-08-11

**Máy đời mới (PUSH 3.x) kết nối được — bổ sung endpoint `registry`.**

Máy SenseFace 2A đầu tiên (`NYU7261300256`) sau khi thông mạng thì gọi được tới máy chủ,
nhưng **lặp vô tận** mỗi 15 giây và không bao giờ đẩy chấm công:

```
GET  /iclock/cdata?SN=…&pushver=3.1.2&DeviceType=acc&PushOptionsFlag=1
POST /iclock/registry?SN=…            <- 404, chưa có endpoint này
   … chờ 15s rồi lặp lại từ đầu
```

### Sửa

- Thêm **`POST /iclock/registry`**. Firmware PUSH 3.x mở phiên bằng lệnh này *trước* khi
  chịu làm việc; không trả lời được thì máy coi như đăng ký thất bại và làm lại từ đầu sau
  mỗi `ErrorDelay` giây, không bao giờ sang `getrequest` hay đẩy `ATTLOG`. Máy chỉ cần một
  dòng `RegistryCode=<mã>`; dùng luôn serial làm mã vì nó ổn định qua các lần khởi động lại
  nên máy không phải đăng ký lại. Vẫn chặn theo serial như mọi endpoint khác — máy lạ nhận
  401.
- **Đường dẫn `/iclock/*` chưa hỗ trợ nay ghi log mức `error`** kèm URL, serial và phần đầu
  thân tin nhắn, và trả `text/plain` thay vì body JSON mặc định của Fastify. Chính lỗi này
  làm mất nhiều giờ dò: máy chỉ im lặng thử lại, còn phía máy chủ không có dấu vết nào ngoài
  dòng log request thô. Lần sau thiếu endpoint nào sẽ đọc ra ngay.

## [1.14.2] — 2026-08-10

**Dựng lại đầu trang hồ sơ nhân sự.**

### Sửa

- **Thanh cuộn ngang dưới hàng tab** biến mất. 11 tab cộng lại vượt bề rộng khung nên trước
  đây trang mọc ra một thanh cuộn: vừa xấu, vừa dễ bỏ sót tab cuối (ảnh người dùng gửi bị cắt
  ở "Thiết bị cấ…"). Nay tab **xuống dòng** thay vì cuộn, và ba nhãn dài nhất rút gọn riêng
  cho thanh tab (`Hợp đồng`, `Biên bản`, `Thiết bị`) — đủ để nằm gọn **một dòng** từ 1170px
  trở lên. Tên đầy đủ vẫn giữ ở tiêu đề hộp thoại và câu "+ Thêm …".
- **Gộp phần đầu trang thành một thẻ**: tên + chức danh + phòng ban ở trên, dải năm chỉ số
  (PIN máy, Ngày vào, Hợp đồng, Hồ sơ tài liệu, Lương) chạy sát đáy thẻ. Trước đây năm ô rời
  nằm trong lưới bốn cột nên ô thứ năm rớt xuống một dòng gần như trống — chiếm cả một hàng
  cho một ô.
- **Ô "Hồ sơ tài liệu" có thanh tiến độ** thay vì chỉ con số `0/7`.
- **Khối rỗng chứa luôn nút tạo** ở giữa. Trước đây nút "+ Khai thông tin cá nhân" nằm trên,
  khung rỗng nằm dưới, hai thứ không dính gì đến nhau.

### Thêm mới

- **Ảnh đại diện** cạnh tên nhân sự: chữ cái đầu trên nền màu suy từ mã nhân viên, nên cùng
  một người luôn ra đúng một màu và mở nhầm hồ sơ thì nhận ra ngay. Chưa có trường ảnh trong
  CSDL nên chưa vẽ ảnh thật.
  - Màu **đổi theo giao diện**: giao diện sáng dùng nền tối + chữ trắng, giao diện tối dùng
    nền sáng + chữ đậm. Không có cặp (độ đậm, độ sáng) nào dùng được cho cả hai — quét đủ
    360 màu thì nền đủ tối để chữ trắng đạt ngưỡng lại lẫn vào thẻ ở giao diện tối (tương
    phản chỉ 1.35). Hai cặp hiện tại đạt 4.9 và 4.7, trên ngưỡng WCAG AA 4.5.
- API `GET /nhan-vien/:id/ho-so` trả thêm `chuc_danh` và `ngay_chinh_thuc` (di trú 010 đã có
  cột nhưng truy vấn tổng quan chưa lấy).

## [1.14.1] — 2026-08-10

**Hướng dẫn kết nối máy ZKTeco: bổ sung trường hợp máy chủ đặt trên VPS.**

Bản trước chỉ mô tả kiểu triển khai máy chủ nằm cùng LAN với máy chấm công. Thực tế đang
chạy là máy chủ trên VPS, máy chấm công ở văn phòng gọi ra Internet — làm theo hướng dẫn cũ
thì máy không kết nối được, mà máy **không báo lỗi gì cả**, chỉ im lặng không gọi lên.

### Sửa

- **Trang Thiết bị**: khối "Cấu hình trên máy ZKTeco" trước đây in cứng một đoạn chỉ đúng cho
  kiểu LAN (IP + cổng 8080 + `Enable Domain Name` tắt). Nay dựng thành bảng và **tự đổi theo
  địa chỉ đang mở webapp**: mở bằng tên miền thì hiện đúng tên miền đó, cổng `80`,
  `Enable Domain Name` = **Bật**; mở bằng IP thì giữ nguyên hướng dẫn LAN cũ. Người đứng
  ở máy đọc màn hình này chứ không đọc file `.md`, nên đây mới là chỗ phải đúng trước.
- **Trang Thiết bị**, gợi ý ô "Serial máy" khi khai báo: sửa "số serial dán sau lưng máy"
  thành `Menu › Hệ thống › Thông tin thiết bị › Số sê ri`.
- Nói rõ hậu quả của `Enable Proxy Server` — bật lên là máy đẩy hết qua proxy đã khai (ô này
  thường bỏ trống thành `0.0.0.0`) nên không bao giờ tới được máy chủ, mà triệu chứng giống
  hệt lúc cấu hình đúng: máy im lặng, không báo lỗi. Gặp thật khi đấu nối máy đầu tiên.
- Tài liệu bổ sung **bảng đối chiếu tên mục của firmware tiếng Việt** ("Cài đặt máy chủ đám
  mây", "Khởi động tên miền", "Cho phép máy chủ ủy nhiệm"…) và ghi chú rằng firmware tự thêm
  `http://` với dấu `/` vào ô địa chỉ — nhìn thấy nguyên URL là bình thường, không phải lỗi.

- `tai_lieu/KET-NOI-MAY-ZKTECO.md` mục 1: bảng cấu hình tách thành **hai cột** (LAN / VPS).
  Khác biệt quan trọng: qua tên miền thì `Enable Domain Name` phải **bật** (bản cũ ghi tắt,
  làm theo là máy không phân giải DNS và im lặng không gọi được), và cổng là **80** chứ
  không phải 8080 — 8080 chỉ tồn tại bên trong VPS, bên ngoài là reverse proxy.
- Mục 2: nói rõ số sê ri phải lấy ở **Menu › Thông tin thiết bị › Số sê ri** trên máy, không
  lấy số dán sau lưng máy hay số trên hộp. Hai số này khác nhau ở nhiều lô máy, mà ADMS chỉ
  gửi lên số sê ri firmware — khai nhầm thì máy nhận 401 vĩnh viễn.
- Mục 6: bản cũ chỉ có một lời khuyên "đừng mở cổng ra Internet", vô dụng với triển khai VPS
  vì ở đó `/iclock/*` **bắt buộc** phải mở. Nay ghi thẳng rủi ro (log đi qua Internet không
  mã hóa; ai đoán đúng số sê ri là đẩy được bản ghi giả) và chốt chặn thật là
  `ICLOCK_IP_CHO_PHEP`, kèm cảnh báo nó chỉ có tác dụng khi `PROXY_TIN_CAY` đặt hẹp.

## [1.14.0] — 2026-08-10

**Xem nhanh tệp đính kèm và bảng truy xuất kho tệp.**

### Thêm mới

- **Popup xem nhanh** ngay trong hồ sơ: bấm tên tệp là mở xem, không phải tải về rồi mở bằng
  phần mềm ngoài. Ba đường cho ba loại rủi ro khác nhau:
  - **Ảnh** (JPG/PNG): tải về blob rồi vẽ bằng `<img>`.
  - **PDF**: nhúng trong khung, dùng bộ đọc dựng sẵn của trình duyệt.
  - **Word / Excel**: trình duyệt không vẽ được, nên **máy chủ bóc chữ ra** và giao diện chỉ
    vẽ chữ — DOCX thành các đoạn văn, XLSX thành bảng. Không tệp nào được nhúng vào trang.
- **Kho tệp hồ sơ** (menu Hệ thống, nhân sự trở lên): bảng truy xuất toàn bộ tệp đính kèm kèm
  **đường dẫn đã lưu trên đĩa** (`ho_so_tep.ten_luu`), thư mục gốc trên máy chủ, dung lượng,
  ai tải lên và lúc nào. Dùng để đối chiếu hai bên khi sao lưu hoặc phục hồi — cơ sở dữ liệu
  chỉ giữ đường dẫn, bản gốc nằm trên đĩa, và lệch nhau thì phải tra ra được chỗ lệch.
- Bộ bóc nội dung Office **tự đọc ZIP bằng `node:zlib`**, không kéo thư viện Office: chỉ cần
  chữ để liếc qua, còn một thư viện đầy đủ kéo theo hàng chục MB vào ảnh Docker. Có chặn zip
  bomb (trần giải nén 40 MB, tối đa 500 mục) và cắt bớt ở 400 đoạn / 200 dòng.

### Một đánh đổi về bảo mật, nói rõ ra

Khung xem PDF **không đặt `sandbox`**. Đã đo trên Chromium: cả `sandbox=""` lẫn
`sandbox="allow-scripts"` đều làm `contentDocument` thành `null` và khung chỉ hiện icon tài
liệu hỏng, dù `navigator.pdfViewerEnabled` là `true` — bộ đọc PDF dựng sẵn bị sandbox chặn
hoàn toàn. Giữ sandbox nghĩa là bỏ hẳn tính năng xem PDF.

Thứ thay thế nó không phải là hy vọng:

1. Máy chủ nhận dạng tệp bằng **magic byte** lúc tải lên, nên thứ nằm trong khung chắc chắn
   là PDF. Rủi ro kinh điển — HTML đội lốt `.pdf` rồi chạy script trong gốc của webapp — bị
   chặn ngay từ cửa vào.
2. PDF được vẽ bởi **tiến trình xem PDF riêng** của trình duyệt; JavaScript trong PDF không
   với được DOM, cookie hay `localStorage` của trang bọc ngoài.
3. Đường tải xuống vẫn `attachment`, và `/xem` vẫn gắn CSP `sandbox` cho trường hợp có ai mở
   thẳng địa chỉ.

DOCX/XLSX vẫn **không** được trả inline dù đã bóc được nội dung: bóc chữ thì an toàn, trả
nguyên tệp inline thì trình duyệt có thể đoán nhầm kiểu.

### Sửa

- Bộ bóc DOCX **giải mã thực thể XML hai lần**, nên `&amp;amp;lt;` ra `&lt;` thay vì
  `&amp;lt;`. Một test viết riêng cho đúng bẫy này đã bắt được ngay lần chạy đầu.
- Bốn đường tệp (tải về, xem, bóc nội dung, xóa) nay dùng **chung một hàm kiểm quyền**. Trước
  đó đường tải về tự kiểm riêng; thêm đường mới mà quên kiểm là mở cửa sau cho cả kho tệp.

### Đã kiểm chứng

Dựng tệp thật cho cả bốn định dạng — PNG, PDF hợp lệ có bảng xref, DOCX và XLSX ZIP thật —
rồi lái Chromium mở từng cái: ảnh vẽ được, khung PDF nạp được bộ đọc, DOCX ra đúng hai đoạn
văn, XLSX ra đúng bảng với ô trống giữ nguyên vị trí cột. Kho tệp hiện đúng đường dẫn dạng
`YYYY-MM/<uuid>.<đuôi>`.

Lần chạy đầu PDF hiện icon hỏng; đã tách hai nguyên nhân bằng thí nghiệm riêng (PDF thiếu
xref, hay sandbox chặn) thay vì đoán — hóa ra là cả hai, và chỉ sau khi loại trừ cái thứ nhất
mới kết luận được về sandbox.
Tổng: 142 test đơn vị + 5 proxy + 115 e2e + 12 design token, tất cả xanh.

## [1.13.1] — 2026-08-10

### Sửa

- **Hộp thoại phân quyền vỡ bố cục.** Quy tắc chung `input { width: 100% }` — vốn dành cho ô
  nhập văn bản — áp cả vào **radio và checkbox**, nên nút tròn chiếm trọn một hàng và đẩy chữ
  ra ngoài khung: ô cao ngoẵng, rỗng ruột, chữ bị ép xuống hai ký tự mỗi dòng và hộp thoại
  tràn ngang. Sửa ở gốc (`input[type="radio"], input[type="checkbox"] { width: auto }`) thay
  vì vá riêng hộp thoại này — có **11 chỗ** dùng nút chọn và tất cả đều đang dính.
- **Cấp quyền trả "Lỗi hệ thống".** Vai trò `nhan_vien` / `truong_phong` bắt buộc gắn với một
  hồ sơ nhân viên (phạm vi dữ liệu của họ tính từ đó). Câu UPDATE đi thẳng xuống CSDL, ràng
  buộc CHECK nổ ra lỗi `23514` không ai bắt, và người dùng nhận thông báo lỗi hệ thống cho
  một tình huống hoàn toàn đoán trước được. Nay kiểm trước khi ghi và trả 400 kèm hướng dẫn,
  có nêu đúng email cần khai.
- **Hướng dẫn trên màn hình vốn sai.** Nó bảo "tạo hồ sơ ở trang Nhân viên rồi quay lại",
  nhưng tài khoản Microsoft **đã tồn tại** thì không bao giờ được nối vào hồ sơ tạo sau —
  luồng đăng nhập tìm thấy tài khoản theo `email_microsoft` là trả về luôn. Làm đúng hướng
  dẫn vẫn tắc. Nay nối được ở **cả hai đường**:
  - Lúc cấp quyền: tự đối chiếu email của tài khoản với email nhân viên; cũng nhận
    `nhan_vien_id` chỉ định thẳng.
  - Lúc đăng nhập: tài khoản chưa gắn hồ sơ sẽ được nối lại nếu tìm thấy nhân viên trùng
    email — rất hay gặp vì người ta đăng nhập lần đầu trước khi nhân sự kịp khai hồ sơ.
- **Thông báo trùng khóa nói sai lý do.** Mọi lỗi `23505` trên bảng `nguoi_dung` đều trả
  "Email Microsoft này đã gán cho tài khoản khác", kể cả khi thật ra **nhân viên đó đã có
  tài khoản** — sửa mãi không ra. Nay nhận dạng theo tên ràng buộc.

## [1.13.0] — 2026-08-10

**Hồ sơ nhân sự cho đủ checklist HCNS–BHXH.** Bổ sung theo đặc tả của phòng HCNS: thông tin
cá nhân, checklist tài liệu bắt buộc, người phụ thuộc, và hồ sơ BHXH — kèm hai lớp bảo vệ dữ
liệu cá nhân theo Nghị định 13/2023/NĐ-CP.

### Thêm mới

- **Tab Thông tin chung** (Nhóm A + C + E): CCCD (số, ngày cấp, nơi cấp), ngày sinh, giới
  tính, dân tộc, quốc tịch, tình trạng hôn nhân, địa chỉ thường trú / hiện tại, **người liên
  hệ khẩn cấp**, mã số thuế, ngân hàng và số tài khoản, **số BHXH / thẻ BHYT / nơi KCB ban
  đầu**, và đợt khám sức khỏe gần nhất.
- **Tab Tài liệu — checklist hồ sơ** (Nhóm A): mỗi tài liệu một dòng có **ô kéo-thả riêng**,
  mục bắt buộc đánh dấu `*`, thanh tiến độ "x/y tài liệu bắt buộc". Ba mức trạng thái đúng
  theo checklist gốc (*đã có dữ liệu → đã số hóa → đã lên phần mềm*), kèm **người phụ trách**
  và **hạn hoàn thành**.
  - Thả tệp vào một dòng là **tải lên và gắn vào đúng mục đó trong một thao tác**. Tách hai
    bước thì người dùng phải nhớ "tải xong rồi gắn vào mục nào", và cái nhớ đó chính là chỗ
    hồ sơ bị gắn nhầm mục.
  - Danh mục nằm trong bảng `danh_muc_tai_lieu`, **không hard-code** — HCNS tự thêm bớt được
    khi quy định đổi. Đã nạp sẵn 14 mục theo checklist.
- **Người phụ thuộc** (Nhóm C): quan hệ, ngày sinh, MST, khoảng thời gian giảm trừ, đã đăng
  ký hay chưa.
- **Hồ sơ BHXH – BHYT** (Nhóm E): báo tăng / báo giảm / điều chỉnh / chốt sổ / cấp thẻ, và
  các chế độ ốm đau – thai sản – dưỡng sức – tai nạn lao động. Lưu dạng **bản ghi theo thời
  gian**, không ghi đè: có tranh chấp với cơ quan BHXH thì phải chứng minh được từng mốc.
- **Nhóm B**: chức danh, người quản lý trực tiếp, ngày chính thức (hết thử việc).

### Bảo vệ dữ liệu cá nhân — Nghị định 13/2023/NĐ-CP

- **Che ở máy chủ, không phải ở giao diện.** Che ở giao diện là che giả: dữ liệu đầy đủ vẫn
  đi qua đường truyền và vẫn hiện trong tab Network của trình duyệt.
  - Số hiệu (CCCD, MST, số BHXH, số tài khoản): giữ vài ký tự cuối, còn lại thay bằng dấu chấm.
  - Địa chỉ và kết luận sức khỏe: **ẩn hẳn**. Che một nửa địa chỉ thì vẫn đoán ra được, còn
    kết luận sức khỏe không có "một phần" nào vô hại — đây là dữ liệu cá nhân *nhạy cảm*.
  - Chuỗi quá ngắn để che cho tử tế thì che hết, kể cả độ dài.
- **Ghi nhật ký** mỗi lần ai đó đọc bản đầy đủ **của người khác**. Đọc hồ sơ của chính mình,
  hoặc đọc bản đã che, thì không ghi — ghi cả thì nhật ký đầy rác và thứ cần truy vết chìm mất.
- **Trưởng phòng đọc được bản đã che** của cấp dưới: họ cần người liên hệ khẩn cấp khi có sự
  cố, nhưng không cần số CCCD hay số tài khoản. Còn tài liệu, người phụ thuộc và BHXH thì
  không đọc được.

### Sửa

- Lớp che dữ liệu ban đầu là **code chết**: mọi vai trò đọc được `thong_tin` đều nằm trong
  nhóm được xem bản đầy đủ, nên nhánh che không bao giờ chạy. Phát hiện khi lái trình duyệt
  và đối chiếu lại bảng phân quyền. Đã mở cho trưởng phòng đọc bản đã che — vừa đúng nhu cầu
  thật, vừa làm lớp che trở thành mã sống có test.
- Một test cũ đếm cứng "đúng 7 nhóm hồ sơ"; nay đối chiếu thẳng với danh sách nhóm trong mã
  nguồn nên thêm nhóm mới không phải sửa test theo.

### Ràng buộc ở tầng CSDL

- Một số CCCD / mã số thuế / số BHXH chỉ thuộc về **một người**. Trùng nhau gần như chắc chắn
  là nhập nhầm, mà nhầm ở đây thì bảo hiểm và thuế đều sai theo.
- `ho_so_ca_nhan` tách khỏi `nhan_vien` **vì phân quyền chứ không phải vì chuẩn hóa**: để
  chung thì mọi truy vấn nhân viên (danh sách, bảng công, log quẹt) đều kéo theo dữ liệu cá
  nhân và sớm muộn lộ ra một chỗ nào đó.

### Còn để lại đợt sau

Chấm điểm, KPI, Thu nhập (phiếu lương) và báo cáo thống kê Nhóm G — cần chốt công thức tính
với HCNS trước khi dựng, làm mò thì ra một cái vòng tròn phần trăm không ai tin.

### Đã kiểm chứng

Lái Chromium bằng hai vai trò: nhân sự thấy `001199987654` và toàn bộ 11 tab; **trưởng phòng
cùng phòng ban** thấy `••••••••7654`, số tài khoản và kết luận sức khỏe hiện "(đã ẩn)", nhưng
người liên hệ khẩn cấp vẫn đọc được — đúng thứ họ cần khi có sự cố. Checklist hiển thị đủ 14
mục kèm 14 ô kéo-thả, tiến độ 1/7 (đã trừ tài liệu chỉ phát sinh khi nghỉ việc).
Tổng: 132 test đơn vị + 5 proxy + 104 e2e + 12 design token, tất cả xanh.

## [1.12.3] — 2026-08-10

### Sửa

- `cap_nhat_vps.sh` đọc `TEN_MIEN` bằng `grep` nên nếu `.env` có khóa đó **khai lặp** (rất
  dễ xảy ra khi thêm tay nhiều lần) thì biến ôm cả hai dòng kèm ký tự xuống dòng, và mọi URL
  dựng từ nó đều hỏng — ba phép kiểm tra sau cập nhật đều trả `loi` mà không rõ vì sao. Nay
  lấy dòng **cuối**, đúng như cách Docker Compose xử lý khóa trùng.

### Tài liệu

- `.env.example`: cảnh báo **không bật `COMPOSE_PROFILES=ten_mien` khi máy chủ đã có sẵn
  reverse proxy riêng**. Caddy trong compose cũng đòi cổng 80/443 mà proxy của máy chủ đang
  giữ; Docker không cướp được cổng đang bị chiếm nên `cong_vao` chỉ đơn giản là không khởi
  động được ("port is already allocated") — dịch vụ kia vẫn sống, nhưng lần triển khai thất
  bại giữa chừng. Kèm chỉ dẫn cách đúng: để proxy của máy chủ dẫn vào `CONG_MAY_CHU` /
  `CONG_WEB`.
- Nói rõ vẫn **nên điền `TEN_MIEN` dù không bật profile**: một mình nó không khởi động gì,
  chỉ để `trien_khai/cap_nhat_vps.sh` biết đường mà kiểm tra sau khi cập nhật. Bản triển
  khai thật không có dòng này nên lần chạy đầu tiên đã bỏ qua cả ba phép kiểm tra qua tên
  miền, gồm cả phép so sánh trạng thái chatbot trước/sau.

## [1.12.1] — 2026-08-08

### Thêm mới

- **`trien_khai/cap_nhat_vps.sh`** — một lệnh duy nhất để cập nhật VPS: sao lưu → kéo mã →
  dựng lại ảnh → chờ máy chủ lên → kiểm tra. Viết thành script thay vì để dán từng lệnh, vì
  hai lần trước đã có sự cố do dán nhầm (một lần dán nguyên chuỗi giữ chỗ
  `<mật khẩu admin>`, một lần dán `<ip văn phòng>` vào `ICLOCK_IP_CHO_PHEP` làm máy chủ
  không khởi động được). Script không có chỗ để dán nhầm.
  - Đo mã HTTP của **chatbot Teams trước và sau** khi cập nhật rồi báo động nếu con số đổi —
    hai dịch vụ dùng chung tên miền nên đây là rủi ro thật, và phải biết ngay chứ không đợi
    người dùng phát hiện.
  - Sao lưu **cả volume `ho_so`**, không chỉ CSDL: hợp đồng scan nằm trên đĩa, dump CSDL
    không cứu được.
  - In sẵn mã bản cũ để lùi lại.
- **`tai_lieu/TRIEN-KHAI-TU-POWERSHELL.md`** — hướng dẫn cập nhật từ máy Windows, bắt đầu
  bằng ba cái bẫy hay mất thời gian nhất: `curl` trong PowerShell 5.1 là bí danh của
  `Invoke-WebRequest` chứ không phải curl thật, `&&` không chạy trên 5.1, và nháy kép nuốt
  mất `$` khi truyền lệnh bash qua `ssh`.

## [1.12.0] — 2026-08-08

**Hồ sơ từng nhân sự** — mở một người ra là thấy đủ: hợp đồng, biên bản, lương, công việc,
báo cáo, khiếu nại, thiết bị được cấp. Vào từ trang Nhân viên (bấm tên người, hoặc nút
"Hồ sơ"), địa chỉ `/nhan-vien/<id>`.

### Thêm mới

- **Hợp đồng lao động** — số HĐ, loại, chức danh, nơi làm việc, ngày ký, khoảng hiệu lực,
  lương ghi trên hợp đồng, trạng thái.
- **Biên bản / thỏa thuận** — phụ lục, cam kết, kỷ luật, khen thưởng, biên bản họp, bàn giao.
  Phụ lục gắn được vào một hợp đồng cụ thể; biên bản rời thì để trống.
- **Lương** — lịch sử các mức lương theo ngày hiệu lực, kèm lý do và số quyết định. Đây là
  mức lương *theo hợp đồng / quyết định*, không phải bảng lương thực trả hằng tháng (phần đó
  vẫn do ERP tính, xem cột `nhan_vien.ma_erp`).
- **Công việc** — giao việc, hạn, ưu tiên, trạng thái, kết quả. Chuyển sang "hoàn thành" thì
  hệ thống tự đóng mốc thời gian.
- **Báo cáo** — theo ngày / tuần / tháng / quý / năm / đột xuất, có ô phản hồi của quản lý.
- **Khiếu nại** — nhân viên tự gửi, phân loại và mức độ, có vòng đời xử lý và phản hồi.
- **Thiết bị cấp phát** — laptop, điện thoại, SIM, thẻ từ… kèm **số sê-ri, địa chỉ IP và
  MAC**, ngày cấp, ngày thu hồi, tình trạng.
- **Tệp đính kèm** cho cả bảy nhóm: PDF, JPG, PNG, DOCX, XLSX tối đa 15 MB.

### Phân quyền — phần quan trọng nhất của thay đổi này

Hồ sơ nhân sự chứa thứ nhạy cảm nhất hệ thống, nên quy tắc được gom vào **một bảng duy nhất**
(`bao_mat/quyen_ho_so.ts`) có test riêng cho từng ô, thay vì rải rác trong hai chục route.
Các đường API cũng được sinh từ một bảng đặc tả chung — viết tay bảy lần thì sớm muộn có một
lần quên gọi kiểm quyền, và cái quên đó im lặng: không lỗi, không test đỏ, chỉ là lương của
người khác hiện ra trên màn hình ai đó.

- **Trưởng phòng không đọc được khiếu nại**, kể cả của cấp dưới mình. Khiếu nại rất thường
  nhắm vào chính người quản lý trực tiếp; cho họ đọc được thì không ai dám gửi, và kênh khiếu
  nại thành một cái hộp rỗng mà nhìn vào tưởng mọi việc đều ổn.
- **Trưởng phòng không đọc được lương, hợp đồng, biên bản.** Họ cần biết cấp dưới *làm gì*
  (công việc, báo cáo, thiết bị), không cần biết cấp dưới *được trả bao nhiêu*.
- **Nhân viên xem được toàn bộ hồ sơ của chính mình** nhưng không tự sửa hợp đồng, lương hay
  danh sách thiết bị — đó là hồ sơ do công ty lập. Ngược lại họ **phải** tự gửi được khiếu nại
  và báo cáo, nếu không hai mục đó không còn ý nghĩa gì.
- Người gửi không tự kết luận khiếu nại của mình là "đã giải quyết", không tự viết phản hồi
  của công ty, và **không xóa được** — xóa được thì một khiếu nại biến mất không để lại vết.
- Tổng quan hồ sơ **không đếm** nhóm mà người gọi không được xem: "nhân viên này có 3 khiếu
  nại" tự nó đã là một thông tin.

### Ràng buộc đặt ở tầng CSDL

Dữ liệu này sống lâu hơn mã nguồn và đường nhập liệu không chỉ có một, nên các ràng buộc nằm
ở CSDL chứ không chỉ ở ứng dụng:

- Hợp đồng **không xác định thời hạn** không được có ngày hết hạn (BLLĐ 2019 Điều 20) — điền
  vào là mâu thuẫn pháp lý, không phải chuyện để ứng dụng tự nhớ.
- Một ngày hiệu lực chỉ được một mức lương; hai dòng cùng ngày thì không ai biết dòng nào
  đang áp dụng.
- Hai thiết bị **đang dùng** không được trùng IP tĩnh (trùng IP là lỗi thật trong mạng, không
  phải chuyện ghi chép); thu hồi máy cũ rồi thì IP dùng lại được. IP lưu kiểu `inet` nên
  Postgres tự chặn địa chỉ sai định dạng.

### Bảo mật tệp đính kèm

- Loại tệp nhận dạng bằng **magic byte**, không tin `content-type` lẫn đuôi tên: một tệp
  `.exe` đổi tên thành `.pdf` vẫn là `.exe`.
- Tải về **luôn** ở dạng `attachment`, kèm `nosniff` và CSP sandbox. Webapp và tệp dùng chung
  một gốc, nên một PDF mở inline chạy được JavaScript trong ngữ cảnh của chính webapp — tức
  XSS với đầy đủ quyền của người đang đăng nhập.
- Quyền của tệp đi theo quyền của nhóm chứa nó, nên không tải vòng qua đường tệp được.
- Thêm volume Docker `ho_so`: tệp nằm trên đĩa, CSDL chỉ giữ siêu dữ liệu, mất volume là mất
  bản gốc hợp đồng.

### Sửa

- Biên bản trước đó **bắt buộc** phải gắn vào một hợp đồng, do đọc trường tùy chọn bằng hàm
  bắt buộc. Form trên web không gửi trường đó nên mọi biên bản đều hỏng. Lái Chromium mới lộ
  ra — API đọc riêng thì vẫn "đúng".
- `test/quyen_ho_so.test.ts` lại rơi vào đúng cái bẫy của `csv.test.ts` lần trước: viết xong
  nhưng không khai trong `npm test` nên không chạy lần nào. Lần này thêm hẳn
  `test/moi_test_deu_chay.test.ts` tự quét thư mục và bắt lỗi nếu còn tệp nào chưa được khai —
  đã thử gỡ một tệp ra để chắc là nó thật sự đỏ.

### Đã kiểm chứng

Ngoài test tự động: dựng dữ liệu thật cho một nhân viên đủ bảy nhóm rồi lái Chromium hai lần
— một lần bằng tài khoản nhân sự (thấy đủ 7 tab), một lần bằng **trưởng phòng cùng phòng ban**
(chỉ thấy 3 tab: Công việc, Báo cáo, Thiết bị; ô "Lương hiện tại" ghi *không có quyền xem*).
Ràng buộc CSDL cũng được thử trực tiếp bằng SQL, gồm cả các trường hợp hợp lệ phải đi qua được
để chắc ràng buộc không quá tay.
Tổng: 118 test đơn vị + 5 proxy + 91 e2e + 12 design token, tất cả xanh.

## [1.11.1] — 2026-08-08

### Tài liệu

- Nói rõ quy tắc **nhiều văn phòng** ở đúng chỗ người ta sẽ khai sai: ô nhập PIN trong hồ sơ
  nhân viên, hộp thoại nhập hàng loạt, và mục mới "Nhiều văn phòng, nhiều máy" trong
  `KET-NOI-MAY-ZKTECO.md`.

  Dữ liệu giữa các máy vốn đã liên thông — đã dựng ba máy khác serial cho cùng một PIN quẹt
  trong một ngày và xác nhận cả ba đều ra đúng một người, bảng công gộp thành một ngày công
  liền mạch (vào 08:02 ở máy 1, ra 17:41 ở máy 3 → `co_mat`, 579 phút, 1 công).

  Nhưng liên thông đó đứng trên một giả định chưa hề được viết ra ở đâu: **PIN của một người
  phải giống nhau trên mọi máy**. PIN là danh tính, serial máy không tham gia nhận diện — nếu
  VP2 khai anh A là PIN 1 trong khi VP1 đã có anh B là PIN 1, công của anh A sẽ chạy sang anh
  B mà không có gì báo. `pin_may unique` chỉ chặn gán trùng trong phần mềm, không chặn được
  người khai máy bấm nhầm. Kèm khuyến nghị chia dải PIN theo văn phòng.

## [1.11.0] — 2026-08-08

**Nhập hàng loạt từ file** — khai từng nhân viên bằng tay thì được vài chục người, không
được vài trăm; và lịch sử chấm công cũ đang nằm trong file USB / ERP chứ không nằm trong máy.

### Thêm mới

- **Nhập nhân viên từ CSV** (trang Nhân viên → *Nhập từ file*). Đối chiếu theo mã nhân viên:
  có rồi thì cập nhật, chưa có thì tạo — **không bao giờ xóa ai**, người nghỉ vẫn phải xử lý
  bằng nút "Cho nghỉ việc" để giữ bảng công cũ. Ô để trống nghĩa là *giữ nguyên* giá trị cũ,
  không phải xóa: nhân sự hay xuất một phần cột ra sửa rồi nhập lại.
  - Chặn trước khi ghi: mã lặp trong chính tệp, PIN lặp trong tệp, PIN đang thuộc người khác,
    ngày không đọc được, phòng ban / ca làm chưa có.
  - Tự tạo phòng ban chưa có là **tùy chọn, mặc định tắt** — một lỗi chính tả sẽ để lại một
    phòng ban rác mà không ai để ý. Ca làm thì luôn phải khai tay vì còn giờ vào / ra / nghỉ.
- **Nhập lịch sử chấm công từ file** (trang Chấm công → *Nhập lịch sử từ file*), cho dữ liệu
  cũ xuất qua USB hoặc từ ERP đang chạy. Đi qua **đúng đường tiếp nhận của máy thật**: cùng bộ
  chống trùng, cùng cách map PIN, cùng bước tính lại bảng công — nên nhập file và máy đẩy
  trực tiếp không thể ra hai kết quả khác nhau. Nhập lại cùng một file không nhân đôi công.
  - Nhận cả ATTLOG thô của máy lẫn CSV/Excel có dòng tiêu đề, kể cả khi ngày và giờ nằm ở
    hai cột riêng.
- **Luôn đi hai bước**: đọc file → *xem trước* (máy chủ kiểm hết nhưng không ghi gì, báo từng
  dòng sai vì sao) → mới bấm *Nhập thật*. Nhập mù vào dữ liệu lương là đường nhanh nhất đến
  một bảng công sai mà không ai biết sai từ đâu.
  - Xem trước lịch sử chấm công **báo sẵn những PIN chưa ai nhận** — biết trước thì khai PIN
    rồi nhập một lần là xong, thay vì nhập xong mới phải quay lại "Gán lại".
  - Đổi tùy chọn thì bản xem trước cũ bị bỏ, bắt kiểm lại — nếu không sẽ bấm "Nhập thật" dựa
    trên một bản xem trước tính bằng bộ tùy chọn khác.
- **Tải tệp mẫu** ngay trong hộp thoại, có sẵn BOM UTF-8 để Excel trên Windows mở không vỡ dấu.

### Chi tiết dễ vấp đã xử lý

- Excel bản tiếng Việt xuất CSV bằng dấu **chấm phẩy**, không phải dấu phẩy — bộ đọc tự nhận
  ra cả `,` `;` và TAB.
- Tên cột đối chiếu sau khi bỏ dấu tiếng Việt và bỏ hoa/thường: `Mã NV`, `ma_nv`, `MÃ NV `
  ra cùng một cột. Cột không tìm thấy thì báo rõ, **không đoán bừa**.
- Ngày ưu tiên đọc `dd/mm/yyyy` (thông lệ Việt Nam) trước `mm/dd/yyyy`.

### Sửa

- `test/csv.test.ts` viết ra từ trước nhưng **chưa được khai trong `npm test`** nên chưa hề
  chạy lần nào. Đã đưa vào; 9 test đó giờ chạy thật.

### Đã kiểm chứng

Lái Chromium qua cả hai hộp thoại: chọn file → xem trước hiện đúng số dòng, đổi tùy chọn thì
xem trước biến mất, cảnh báo PIN chưa gán hiện đúng, không lỗi JS. Việc lái trình duyệt này
bắt được một lỗi mà TypeScript không thấy: `dung_hanh_dong().chay` chỉ trả về `true/false`
chứ không trả thân phản hồi, nên bản xem trước **không bao giờ hiện** — ép kiểu đã che mất.
Tổng: 103 test đơn vị + 5 proxy + 70 e2e + 12 design token, tất cả xanh.

## [1.10.0] — 2026-08-08

Trang **Chấm công** trước đây chỉ là chỗ xem: lọc được mỗi khoảng ngày, tối đa 300 dòng, và
không xuất được gì. Nay thành chỗ quản lý được log thật.

### Thêm mới

- **Bốn bộ lọc** ngoài khoảng ngày: nhân viên, máy chấm công, nguồn (máy / điện thoại /
  nhập tay), và trạng thái duyệt. Máy chủ từ chối giá trị lạ thay vì im lặng bỏ qua bộ lọc —
  bỏ qua âm thầm thì người dùng tưởng đã lọc mà thực ra đang xem tất cả.
- **Xem thêm** theo từng 200 dòng, thay cho trần cứng 300 dòng.
- **Xuất CSV** toàn bộ khoảng đã chọn (trần 50.000 dòng), kèm cả bộ lọc đang áp. Có BOM
  UTF-8 để Excel đọc đúng tiếng Việt và chặn CSV injection như bản xuất bảng công.
  - Mốc thời gian xuất theo **giờ nơi đặt máy**, không phải giờ máy chủ. Máy chủ chạy UTC
    vẫn ra đúng con số nhìn thấy trên máy chấm công.
  - Chỉ nhân sự trở lên xuất được.

### Đã kiểm chứng

Test e2e cho từng bộ lọc (gồm trường hợp lọc ra rỗng và giá trị lạ bị từ chối), và cho bản
CSV: có BOM, mốc giờ đúng giờ máy, nhân viên thường bị chặn. Lái Chromium qua trang: bốn ô
lọc hiện đủ, lọc theo nguồn cắt đúng số dòng, khối cảnh báo PIN chưa gán vẫn nguyên, không
lỗi JS. Tổng: 94 test đơn vị + 5 proxy + 61 e2e + 12 design token, tất cả xanh.

## [1.9.0] — 2026-08-08

**Cả công ty đăng nhập được, nhưng phải qua bước duyệt** — cùng tên miền thì xác thực được,
còn vào được hệ thống hay không do admin quyết định.

### Thêm mới

- **Trạng thái `cho_duyet`.** Khai `MS_TEN_MIEN_CHO_PHEP=congty.vn` thì ai có email thuộc
  tên miền đó cũng đăng nhập được, và hệ thống tự tạo tài khoản ở trạng thái chờ. Tài khoản
  đó **không vào được màn nào**: máy chủ từ chối mọi API nghiệp vụ, kể cả đường chỉ đọc.
  Người ngoài tên miền vẫn bị từ chối ngay, không tạo tài khoản.
  - Chặn ở **một chỗ duy nhất** (`can_dang_nhap`) nên không route nghiệp vụ nào phải tự nhớ
    kiểm tra. Chỉ `/toi` và đổi mật khẩu cho tài khoản chờ đi qua, đủ để webapp hiện màn
    hình giải thích.
  - Phản hồi 403 kèm cờ `cho_duyet: true` để webapp phân biệt với "không đủ quyền".
- **Trang phân quyền cho admin.** Tài khoản chờ được đẩy lên đầu danh sách **Tài khoản**,
  có nhãn *chờ phân quyền* và nút **Phân quyền** chọn một trong bốn cấp: Quản trị → Nhân sự
  (HR) → Trưởng phòng → Nhân viên, mỗi cấp kèm mô tả làm được gì. Hệ thống ghi lại **ai cấp
  và lúc nào**, hiện ngay dưới vai trò.
- **Nút "Tôi đã được cấp quyền — kiểm tra lại"** trên màn hình chờ. Vai trò nằm trong token
  nên token đang cầm vẫn là `cho_duyet` cho tới khi làm mới; nút này làm mới thay vì bắt
  người dùng đăng xuất rồi đăng nhập lại.

### Ràng buộc giữ nguyên

`cho_duyet` **không phải một cấp quyền** mà là trạng thái chưa có quyền, nên API tạo tài
khoản từ chối nếu ai đó cố đặt vai trò này bằng tay. Hai vai trò *Trưởng phòng* và *Nhân
viên* vẫn bắt buộc gắn hồ sơ nhân viên — người tự tạo mà không khớp hồ sơ nào thì ở lại
trạng thái chờ, kể cả khi bật `MS_TU_DONG_TAO`.

### Đã kiểm chứng

Test e2e đi hết vòng đời: tài khoản chờ đăng nhập được, `/toi` qua được, **5 đường nghiệp vụ
khác nhau đều trả 403** kèm cờ lý do; admin cấp quyền; token cũ **vẫn bị chặn** (vai trò nằm
trong token); làm mới token thì vào được; và bản ghi *ai duyệt, lúc nào* đúng. Kèm test chặn
tạo tài khoản `cho_duyet` bằng tay. Tổng: 94 test đơn vị + 5 proxy + 59 e2e + 12 design
token, tất cả xanh.

## [1.8.1] — 2026-08-08

### Sửa

- **Không nối được tài khoản Microsoft từ giao diện.** Cột `email_microsoft` có trong CSDL
  nhưng không lộ ra API lẫn webapp, nên cách duy nhất để nối một tài khoản cụ thể là chạy
  `UPDATE` thẳng vào CSDL. Nay trang **Tài khoản** có cột *Đăng nhập Microsoft* và nút
  **Nối Microsoft**; để trống rồi lưu là gỡ liên kết. Email trùng với tài khoản khác bị từ
  chối kèm thông báo rõ thay vì lỗi CSDL.
- Tài liệu bổ sung mục nói rõ đăng nhập Microsoft **không** thay đổi phân quyền: nó chỉ
  thay chỗ xác thực danh tính, còn vai trò và quyền vào hệ thống vẫn do tài khoản trong hệ
  thống quyết định.

## [1.8.0] — 2026-08-07

**Đăng nhập bằng tài khoản Microsoft (Entra ID)** — nhân viên dùng chính tài khoản
Microsoft 365 của công ty, không phải nhớ thêm mật khẩu.

### Thêm mới

- Luồng OpenID Connect **Authorization Code + PKCE**, tự viết thay vì kéo thư viện OIDC:
  chỉ cần một luồng, và thêm phụ thuộc lớn vào lớp xác thực là thêm bề mặt tấn công.
- Nút **Đăng nhập bằng Microsoft** trên trang đăng nhập. Máy chủ quyết định có hiện hay
  không qua `GET /api/xac-thuc/cau-hinh` — chưa khai cấu hình Entra thì ẩn hẳn, thay vì
  hiện một nút bấm vào chỉ báo lỗi.
- Đối chiếu người dùng theo **email**: trường đã nối sẵn ở tài khoản, rồi tới email trong
  hồ sơ nhân viên (khớp lần đầu thì ghi nhớ để lần sau khỏi dò lại). Không khớp ai thì từ
  chối kèm thông báo rõ, trừ khi bật `MS_TU_DONG_TAO`.
- **`tai_lieu/DANG-NHAP-MICROSOFT.md`** — đăng ký ứng dụng bên Entra, tạo client secret,
  bảng sự cố thường gặp, và phần cân nhắc trước khi bật tự động tạo tài khoản.

### Bảo mật

Xác minh `id_token` là chỗ một lỗi nhỏ biến thành "ai cũng đăng nhập được bằng email tùy
chọn", nên kiểm **chữ ký trước**, mọi trường khác chỉ được tin sau đó. 15 test tự động phủ
các đường tấn công thật: chữ ký giả, `alg: none`, `alg: HS256` (*algorithm confusion*), sai
`nonce`, sai `aud`/`tid`/`iss`, token hết hạn, và tình huống Microsoft xoay khóa.

Ngoài ra: PKCE S256, `state` dùng đúng một lần rồi xóa khỏi CSDL trong cùng câu lệnh, token
trả về qua **phần neo** của URL nên không lọt vào log truy cập của reverse proxy, và tham số
`quay_lai` chỉ nhận đường dẫn nội bộ để không thành *open redirect*.

`MS_TU_DONG_TAO` mặc định **tắt**: bật lên nghĩa là danh sách người truy cập hệ thống chấm
công do danh bạ Microsoft quyết định chứ không do nhân sự quyết định nữa.

### Đã kiểm chứng

15 test đơn vị cho phần xác minh token + 3 test e2e cho các đầu mối API. Lái Chromium qua
trang đăng nhập: nút hiện đúng khi máy chủ báo bật, ẩn khi tắt, bấm vào đi đúng
`/api/xac-thuc/microsoft/bat-dau`, ô đăng nhập bằng mật khẩu vẫn còn nguyên. Tổng: 94 test
đơn vị + 5 test proxy + 56 e2e + 12 test design token, tất cả xanh.

## [1.7.0] — 2026-08-07

Đặt webapp dưới một **tiền tố đường dẫn** để dùng chung tên miền với dịch vụ khác.

### Thêm mới

- **`VITE_BASE`** — build webapp cho một tiền tố, ví dụ `VITE_BASE=/chamcong/` để chạy ở
  `https://teams.congty.vn/chamcong/`. Một biến điều khiển cả ba chỗ từng phải sửa tay:
  đường dẫn tệp tĩnh trong `index.html`, đường dẫn font/icon trong CSS, và tiền tố mà
  router cùng lớp gọi API tự thêm vào. `VITE_API_URL` để trống là đủ — lớp gọi API lấy
  tiền tố từ `VITE_BASE` nên tự gọi đúng `/chamcong/api/...`.
  - Router đọc `import.meta.env.BASE_URL`, cắt tiền tố khi đọc URL và thêm lại khi đẩy
    `history.pushState`, nên danh sách tuyến bên trong vẫn dùng đường dẫn sạch
    (`/bang-cong`) và không cần biết nó được đặt ở đâu.
  - `href` của `<LienKet>` là đường dẫn thật, để Ctrl-click mở tab mới và "sao chép địa chỉ
    liên kết" vẫn ra đúng URL.
- **`tai_lieu/TEN-MIEN.md` mục 2b** — cấu hình Caddy dùng chung tên miền, kèm lý do phải bọc
  trong `route`: ngoài `route`, Caddy tự sắp xếp `handle` theo độ dài đường dẫn và khi trộn
  với `handle_path` thì thứ tự khó đoán.

### Giới hạn đã biết

`/iclock/*` **không** đặt được dưới tiền tố: firmware ZKTeco chỉ cho khai host và port rồi
gọi cứng `/iclock/cdata`. Đường này luôn phải nằm ở gốc tên miền.

### Đã kiểm chứng

Chạy Caddy thật với upstream giả, đối chiếu 9 đường dẫn: `/iclock/*` giữ nguyên đường dẫn
sang máy chủ chấm công; `/chamcong/api/*` và `/chamcong/health` được cắt tiền tố; webapp và
tệp tĩnh về đúng nginx; `/chamcong` không dấu gạch cuối trả 301; còn `/api/messages`, `/dev/*`
và `/` vẫn về dịch vụ cũ **không đổi hành vi**. Đường HTTP `/iclock` trả 200 thẳng, không
chuyển hướng — nếu bị 301 là máy chấm công mất dữ liệu.

Lái Chromium qua bản build `VITE_BASE=/chamcong/`: trang đăng nhập hiện đúng, font tải được
qua tiền tố, deep link `/chamcong/bang-cong` giữ nguyên tiền tố, `pushState` không nhảy ra
gốc tên miền, lớp gọi API trỏ tới `/chamcong/api/...`, và không có request nào hỏng.

## [1.6.0] — 2026-08-07

Chạy trên tên miền + HTTPS, và **vá một lỗ hổng vượt danh sách trắng IP** phát hiện khi rà
lại phần đặt sau reverse proxy.

### Sửa — bảo mật

- **`X-Forwarded-For` được tin vô điều kiện khi chạy production**, nên `ICLOCK_IP_CHO_PHEP`
  có thể bị vượt hoàn toàn: chỉ cần gửi kèm `X-Forwarded-For: <IP văn phòng>` là qua được
  danh sách trắng và đẩy được lần quẹt giả vào bảng công. Header này do phía gửi tự đặt,
  ai cũng ghi giá trị tuỳ ý được. Ảnh hưởng mọi bản triển khai có cổng 8080 mở ra Internet
  — đúng cấu hình VPS đang chạy.
  - Nay có `PROXY_TIN_CAY`: chỉ tin header chuyển tiếp khi request đến từ dải mạng đã khai.
    Mặc định trống = không tin ai, lấy địa chỉ thật của kết nối.
  - Máy chủ ghi cảnh báo lúc khởi động nếu `PROXY_TIN_CAY` chứa `0.0.0.0/0`.
  - 5 test hồi quy trong `test/proxy_tin_cay.test.ts`, gồm chuỗi nhiều chặng
    `"IP giả, IP thật"`. Đã xác nhận hai trong số đó **thất bại trên mã cũ**.

### Thêm mới

- **Cổng vào Caddy có tên miền và HTTPS tự động** (`cong_vao/Caddyfile`, dịch vụ
  `cong_vao`). Webapp và API dùng **một origin duy nhất** nên không còn CORS, và
  `VITE_API_URL` để trống được — webapp gọi đường dẫn tương đối, đổi tên miền không phải
  build lại. `/iclock/*` giữ HTTP thường và **không** bị chuyển hướng sang HTTPS: firmware
  ZKTeco không làm được TLS và gặp 301/302 thì nhiều bản bỏ luôn lô dữ liệu.
- Bật bằng `COMPOSE_PROFILES=ten_mien` trong `.env`, nên mọi lệnh `docker compose` quen
  thuộc vẫn chạy như cũ.
- Cổng mở ra ngoài máy nay cấu hình được (`CONG_MAY_CHU`, `CONG_WEB`) để khoá 8080/8081 lại
  trong máy khi đã có cổng vào.
- **`tai_lieu/TEN-MIEN.md`** — trỏ DNS, xin chứng chỉ, chuyển máy chấm công sang cổng 80,
  đổi địa chỉ cho app điện thoại, và bảng sự cố thường gặp.

## [1.5.0] — 2026-08-07

Chế độ làm việc **T2–T6 cả ngày + sáng thứ Bảy** — mô hình ca cũ không diễn đạt được, và cứ
mỗi thứ Bảy là cả công ty bị ghi sai.

### Thêm mới

- **Khung giờ riêng theo thứ cho ca làm** (`ca_lam_theo_thu`). Một ca vốn chỉ có **một** khung
  giờ dùng chung cho mọi ngày làm. Hợp đồng lao động phổ biến ở Việt Nam lại quy định sáng thứ
  Bảy **vẫn là giờ chuẩn** (08:00–12:00), nên khai T7 vào ca `08:00–17:30` thì mỗi thứ Bảy toàn
  bộ nhân viên bị chấm *về sớm 325 phút* — sai cả về kỷ luật lẫn số công. Nay mỗi thứ khai
  được giờ vào/ra, giờ nghỉ và ngưỡng đủ công riêng; thứ không khai thì dùng khung giờ gốc,
  tức hành vi y hệt trước đây. Ca qua đêm bị chặn ở cả API lẫn CSDL vì giờ ra thuộc ngày hôm
  sau nên "thứ" không xác định được.
  - Số công thứ Bảy điều khiển bằng ô *đủ công*: để `480` thì 240 phút làm ra 0,5 công (thông
    lệ 5,5 công/tuần); để `240` thì tính tròn 1 công.
  - Sửa trực tiếp trên webapp: **Ca làm việc → Sửa → Khung giờ riêng theo thứ**.
- **`trien_khai/nap_du_lieu_demo.mjs`** (`npm run nap_du_lieu_demo`) — nạp ca theo hợp đồng,
  **23 dòng ngày lễ cho 2026–2027** (11 ngày/năm theo Điều 112 BLLĐ 2019, ngày âm lịch đã quy đổi:
  Tết Bính Ngọ mùng 1 = 17/02/2026, Tết Đinh Mùi mùng 1 = 06/02/2027, Giỗ Tổ 26/04/2026 và
  16/04/2027, kèm ngày nghỉ bù 27/04/2026 do Giỗ Tổ rơi vào Chủ nhật), và 8 nhân viên demo
  (`NVDEMO01–08`, PIN `9001–9008`) để xem giao diện có số liệu. Chạy lại nhiều lần được; xoá
  nhân viên demo bằng `--xoa-nhan-vien-demo`.

### Đã kiểm chứng

6 test đơn vị cho quy tắc mới + 4 test end-to-end có CSDL thật: khai ca qua API, máy đẩy ATTLOG
sáng thứ Bảy → bảng công ra `co_mat`, 240 phút làm, **0 phút về sớm**, 0,5 công. Kèm test chặn
khai khung giờ cho thứ không đi làm và chặn khai trên ca qua đêm. Tổng: 79 test đơn vị + 52
test e2e + 12 test design token, tất cả xanh.

## [1.4.1] — 2026-08-07

### Sửa

- **`docker compose up` hỏng ở bước cuối của ảnh `may_chu`**: `COPY --from=build
  /app/may_chu/node_modules` báo `"/app/may_chu/node_modules": not found`. npm workspaces kéo
  (hoist) toàn bộ phụ thuộc lên `node_modules` ở thư mục gốc; thư mục con chỉ tồn tại khi có
  xung đột phiên bản buộc phải lồng vào trong — bộ phụ thuộc của `may_chu` không có xung đột
  nào nên thư mục đó **chưa bao giờ được tạo**. Tạo sẵn thư mục rỗng ở tầng build để lệnh COPY
  luôn chạy được, đồng thời vẫn giữ được phụ thuộc lồng nếu sau này phát sinh. Lỗi lọt lưới vì
  đường Docker không chạy thử được lúc phát triển (proxy chặn tải image gốc): kiểm tĩnh chỉ đối
  chiếu đường dẫn `COPY` với **mã nguồn trong repo**, không đối chiếu với thứ tầng build thật
  sự sinh ra.

## [1.4.0] — 2026-08-06

Bộ công cụ triển khai để hứng log từ máy chấm công thật, và **hai lỗi chặn ngay bước đầu** phát
hiện được khi chạy thử đúng đường triển khai.

### Sửa

- **`.env.example` thiếu `POSTGRES_PASSWORD`** — `cp .env.example .env` rồi `docker compose up`
  là dừng ngay. Đã viết lại `.env.example`: gom 4 giá trị bắt buộc lên đầu, ghi rõ `VITE_API_URL`
  được nhúng lúc build nên điền `localhost` thì điện thoại và máy khác không gọi được API, và
  tách hẳn phần chỉ dùng khi chạy không qua Docker.
- **`docker-compose.yml` không truyền `ADMIN_TEN_DANG_NHAP` / `ADMIN_MAT_KHAU`** vào container,
  nên `docker compose exec may_chu node dist/csdl/seed.js` không tạo được tài khoản admin đầu
  tiên.
- nginx cache font 7 ngày (tên tệp không có băm nên không thể cache 1 năm, nhưng vẫn hơn tải
  lại 180 KB mỗi lần mở trang).

### Thêm mới

- **`trien_khai/gia_lap_may.mjs`** — giả lập một máy ZKTeco nói giao thức ADMS Push: handshake,
  báo firmware, đẩy ATTLOG, gửi lại đúng lô đó để kiểm chống trùng, xin lệnh. Kiểm được toàn bộ
  đường đi của dữ liệu **trước khi có hardware**. Có `--lien-tuc` để chạy như máy đang hoạt động.
- **`trien_khai/kiem_tra.mjs`** — kiểm máy chủ, CSDL, tài khoản admin, múi giờ, danh sách máy đã
  khai báo, nhân viên đã gán PIN/ca; rồi in đúng những giá trị phải bấm vào menu máy ZKTeco kèm
  **IP LAN thật** của máy chủ (nhắc rõ không dùng `localhost`).
- `npm run kiem_tra_trien_khai` và `npm run gia_lap_may`. Cả hai viết bằng Node nên chạy y hệt
  trên Windows / Linux / macOS.
- **`tai_lieu/BAT-DAU-NHANH.md`** — đường ngắn nhất từ `git clone` đến "log máy về tới bảng
  công", kèm bảng sự cố thường gặp và ba việc bắt buộc để số liệu đúng (gán PIN, gán ca, khai
  ngày lễ).

### Đã kiểm chứng

Chạy giả lập máy đối chiếu với máy chủ thật: quẹt 08:00 và 17:30 giờ Việt Nam → lưu đúng
`01:00`/`10:30` UTC → bảng công tự sinh `co_mat`, 450 phút làm (540 phút trong ca trừ 90 phút
nghỉ), 0 phút muộn, 1 công; gửi lại cùng lô trả `OK: 0` đúng như chống trùng phải làm.

Đường Docker **chưa chạy thử được trong môi trường này** (proxy chặn tải image gốc từ Docker
Hub). Đã kiểm tĩnh thay thế: nội suy biến của `docker compose config`, toàn bộ đường dẫn `COPY`
trong hai Dockerfile, và `web/dist/font/` có đủ font sau khi build.

## [1.3.0] — 2026-08-06

Áp theme **Metronic v9** cho webapp theo demo 11 màn đã duyệt. Từ nay web và app dùng **hai bộ
theme riêng** như kế hoạch v2 mục 4.5 chốt.

### Thêm mới

- `thiet_ke/token.json` tách thành hai nhánh `web` (Metronic: Inter, `#3B82F6`, bo góc 8px) và
  `mobile` (Compose Boltuix: Be Vietnam Pro, `#4285F4`, bo góc 12px). Khoảng cách, breakpoint và
  `y_nghia_mau` vẫn dùng chung để một ngày "đủ công" không ra hai màu ở hai nơi — có test kiểm.
- **Font Inter tự chứa**, bản biến thiên đã cắt còn trục `wght` 400–700 và ghim `opsz`: một tệp
  **171 KB** phủ liên tục 400–700, nhỏ hơn 4 tệp tĩnh và độ đậm mượt hơn. Không gọi Google Fonts
  CDN như demo — chạy được trong LAN kín và không rò rỉ IP nhân viên.
- **Biểu tượng Tabler Icons cắt subset**: bộ đầy đủ 840 KB cho 5.800 icon → **7,5 KB** cho 33
  icon đang dùng. Tự chứa thay vì gọi CDN jsDelivr.
- **Bố cục Metronic**: thanh bên mảng tối cố định 232px + header (tiêu đề động, nút sáng/tối,
  avatar). Nhóm menu theo demo: nhóm đầu không nhãn · Quản trị nhân sự · Hệ thống.
- **Nút chuyển sáng/tối** ba trạng thái (theo máy / sáng / tối), lưu ở `localStorage`. Kế hoạch
  đòi "bật/tắt trên web" nên không thể chỉ dựa vào `prefers-color-scheme`.
- Ở ≤1023px thanh bên **trượt vào từ bên trái** kèm màn che, thay vì nằm đè trên đỉnh trang.

### Sửa

- Demo đặt chữ/nhãn nút lên `#3B82F6` ở 4 chỗ (`.lnk`, `.btn-p`, `.nav.on`, `.tab.on`) — màu này
  chỉ đạt **3,68:1** trên nền trắng và chữ trắng trên nó cũng 3,68:1. Đã tách vai trò như bên
  mobile: `chinh` tô mảng, `chinh_dam` (`#2563EB`, 5,17:1) cho chữ và nền nút đặc.
- Nhãn nhóm sidebar của demo dùng zinc-600 `#52525B` trên `#18181B` — chỉ **2,29:1**, đọc rất
  khó. Nâng lên `#8E8E97`.
- Ở chế độ tối, viền `#27272A` trên thẻ `#18181B` chỉ đạt **1,19:1** nên gần như vô hình. Nâng
  lên zinc-700.
- Liên kết trong thanh bên tối dùng `chinh_dam` `#2563EB` trên `#18181B` chỉ **2,3:1** → thêm
  token `lien_ket_ben` (`#93C5FD`, 9,8:1).
- Bỏ 13 thẻ `<h1>` trùng: tiêu đề trang nay nằm một chỗ duy nhất trên header. Trang đăng nhập
  nằm ngoài vỏ app nên giữ nguyên `<h1>`.
- Test tương phản nay kiểm **cả hai nền tảng × cả hai chế độ**, gồm cặp riêng của thanh bên tối.

### Đã biết còn thiếu

4 trong 11 màn của demo chưa có backend nên chưa đưa vào menu: Bảng lương (Module C), Hợp đồng
(Module D), Vi phạm (Module G), Cấu hình pháp lý (Module C). Màn Báo cáo mới có xuất CSV. Xem
`tai_lieu/THIET-KE.md` mục 7.

## [1.2.0] — 2026-08-06

### Thêm mới

- **Cảnh báo máy chấm công mất kết nối** (`su_kien/giam_sat_may.ts`). Trước đây trạng thái máy
  chỉ hiện trên trang Tổng quan — thông tin **bị động**, phải có người mở trang lên xem. Nay
  máy chủ kiểm tra mỗi phút, ghi log mức `warn` và đẩy sự kiện `thiet_bi.mat_ket_noi` /
  `thiet_bi.ket_noi_lai` vào hộp thư đi.

  Cảnh báo **đúng một lần** mỗi lần chuyển online → offline (cột `thiet_bi.da_canh_bao_offline`), không
  lặp mỗi chu kỳ. Cả hai câu `UPDATE ... where <trạng thái> returning` đều nguyên tử nên nhiều
  instance chạy song song không gửi trùng. Máy `dang_bat = false` (đã tháo ra) không sinh cảnh
  báo. Bao gồm cả máy **chưa bao giờ** báo hiệu — khai báo máy mà không nói được với máy chủ là
  lỗi cấu hình, cần biết ngay.
- Di trú `005_canh_bao_may.sql`: `thiet_bi.da_canh_bao_offline`.
- 2 test e2e: mất kết nối phát đúng 1 cảnh báo qua 3 chu kỳ, kết nối lại phát sự kiện phục hồi
  rồi lần mất kết nối sau lại được cảnh báo; máy đã tắt không sinh cảnh báo.

## [1.1.0] — 2026-08-06

Áp bộ nhận diện của công ty (theme Compose Boltuix) lên cả web và app, và dựng bộ màn hình
self-service theo Phụ lục B của kế hoạch v2 (Module F1–F3).

### Thêm mới

**Design token (`thiet_ke/`)**
- `token.json` là nguồn duy nhất cho màu / font / bo góc / khoảng cách / breakpoint;
  `npm run sinh_token` sinh ra biến CSS cho web và bảng màu TS cho app. `npm test` đối chiếu
  hai tệp sinh ra với nguồn nên không thể lệch âm thầm.
- Font **Be Vietnam Pro** (SIL OFL) tự chứa trong repo, 4 trọng số — woff2 cho web, TTF cho
  app. Không gọi Google Fonts nên không rò rỉ IP nhân viên và chạy được trong LAN kín.
- 8 test mới: 21 cặp tương phản màu đạt WCAG AA ở **cả** chế độ sáng và tối, đồng bộ tệp sinh
  ra, và quét mã nguồn app tìm ký tự mà font thiếu glyph.

**App điện thoại**
- Thanh tab theo Phụ lục B: **Trang chủ · Bảng công · Lương · Cá nhân**. Màn Đơn từ rời thanh
  tab, vào từ thẻ trên Trang chủ có số đếm đơn chờ duyệt.
- Trang chủ (Màn 1): dải tuần T2–CN, 4 chỉ số tháng, thanh chuyên cần, mục "Cần chú ý".
- Bảng công (Màn 2): 4 chỉ số phân loại, thanh công thực tế/công chuẩn, lịch tháng dạng
  heatmap có chú thích màu.
- Màn **Lương** (Màn 3): hiện cơ sở tính lương từ dữ liệu chấm công. **Không** bày số tiền —
  Module C chưa triển khai và theo lộ trình v2 còn chờ kế toán xác nhận tham số pháp lý.

**Máy chủ**
- `GET /api/toi/luong` — cơ sở tính lương của một kỳ. Trả `phieu_luong: null` kèm lý do.
- `/api/toi/hom-nay` bổ sung dải tuần, tổng hợp tháng, quỹ phép, việc cần chú ý.
- Di trú `004_quy_phep.sql`: `nhan_vien.so_ngay_phep_nam` (mặc định 12 — Điều 113 BLLĐ 2019,
  HR tăng theo thâm niên/nghề theo Điều 114).
- 3 test e2e mới: dải tuần neo đúng thứ Hai, quỹ phép (nghỉ ốm không trừ, nửa ngày tính 0,5),
  và màn Lương không được trả bất kỳ trường tiền lương nào.

### Sửa

- **Không dùng Poppins** như token spec đề xuất: cả 8 tệp trong kit **và** bản chính thức trên
  `google/fonts` đều chỉ có 471 glyph và **thiếu 88/133 ký tự tiếng Việt** (mất `ơ ư` và toàn
  bộ khối `U+1EA0–1EF9`). Thay bằng Be Vietnam Pro phủ đủ 133/133.
- Màu thương hiệu `#4285F4` chỉ đạt **3,56:1** trên nền trắng — không đủ WCAG AA cho chữ, kể cả
  chữ trắng trên nút màu đó. Tách vai trò: `chinh` chỉ tô mảng, `chinh_dam` (`#1967D2`) cho
  chữ / liên kết / nền nút đặc.
- `→` và `✓` không có trong Be Vietnam Pro nên trên máy thật ra ô vuông rỗng (trên web thì
  không thấy vì trình duyệt tự tìm font dự phòng). Đổi sang ký tự font có, hoặc vẽ qua
  `<KyHieu>` dùng font hệ thống.
- Web dùng `font-weight: 550 / 650 / 680` — không tồn tại trong font tĩnh. Đổi về 500/600/700.
- Ở ≤768px thanh điều hướng xuống dòng thành 3 khối dọc cao 340–430px, đẩy tiêu đề trang xuống
  dưới màn hình. Đổi thành một hàng cuộn ngang (nav 202px → 50px ở 390px).

### Đổi

- Nhãn OT đổi thành **"OT ghi nhận"** kèm ghi chú *chưa duyệt*. Tiền làm thêm giờ chỉ trả theo
  số phút OT đã có đơn duyệt — `phut_ot` hiện tại là số máy ghi nhận, dùng để đối chiếu.
- Bo góc 8px → **12px** (chốt từ mockup ~13px; kit gốc `Shape.kt` là 4dp).

## [1.0.0] — 2026-08-06

Bản đầu tiên. Xây từ bản thiết kế microservice `ChamCong` (.NET 8), viết lại bằng
Node/TypeScript để web, app và backend dùng chung một ngôn ngữ và kiểm chứng được bằng test.

### Thêm mới

**Máy chủ (`may_chu/`)**
- Cổng ADMS Push nhận log trực tiếp từ máy ZKTeco (`/iclock/*`), whitelist theo serial máy.
- Bộ tính công: giờ vào/ra, kẹp giờ trong khung ca, đi muộn/về sớm có dung sai, ngưỡng OT,
  ca đêm qua nửa đêm, ngày lễ, ngày nghỉ tuần theo cấu hình từng ca.
- Xác thực JWT HS256 tự cài bằng `node:crypto`, băm mật khẩu scrypt; phân quyền 4 vai trò.
- Token làm mới có xoay, khóa tài khoản sau 8 lần sai mật khẩu.
- Hàng đợi lệnh xuống máy bền vững trong CSDL (nạp nhân viên, đồng bộ giờ, gửi lại log).
- Đơn nghỉ phép, đơn giải trình quên quẹt, chốt/mở chốt tháng, xuất CSV cho kế toán.
- Chấm công bằng điện thoại: GPS + ảnh selfie, geofence haversine, phát hiện GPS giả lập.
- Hộp thư đi (outbox) đồng bộ sang ERP kèm chữ ký HMAC, tự gửi lại với backoff.
- Bộ lịch chốt bảng công ngày hôm trước cho toàn bộ nhân viên (để ngày vắng xuất hiện).
- Nhật ký thao tác cho mọi thay đổi dữ liệu chấm công.

**Webapp (`web/`)**
- 11 trang: tổng quan, bảng công (tổng hợp + chi tiết + xuất CSV + chốt tháng), nhật ký
  quẹt thô, duyệt đơn, nhân viên, máy chấm công, ca làm, địa điểm, ngày lễ, tài khoản,
  nhật ký thao tác.
- Giao diện sáng/tối theo cài đặt máy, dùng được trên điện thoại.

**App điện thoại (`dien_thoai/`)**
- Expo SDK 57 + expo-router, 4 tab: Hôm nay, Bảng công, Đơn từ, Cá nhân.
- Chấm công GPS + selfie; token lưu trong SecureStore.

### Khác so với bản thiết kế .NET gốc

- Hàng đợi lệnh xuống máy: chuyển từ in-memory sang bảng CSDL — không mất lệnh khi restart,
  không gửi trùng khi chạy nhiều instance.
- Chống trùng lần quẹt: dùng ràng buộc UNIQUE + `on conflict do nothing` thay vì
  "select rồi insert" (hai lô đến cùng lúc sẽ lọt qua khe đó).
- Thay publish RabbitMQ trực tiếp bằng bảng outbox ghi cùng transaction — ERP sập không
  làm mất sự kiện.

### Bảo mật

- Bỏ `@fastify/static` (4 CVE path traversal) — ảnh selfie đi qua route có xác thực.
- Bỏ `react-router` (CVE chưa có bản vá) — tự viết router ~60 dòng.
- `npm audit` = 0 lỗ hổng trên cả ba workspace.
- Chặn CSV injection khi xuất bảng công.

### Kiểm chứng

- 101 test tự động: 60 đơn vị + 41 end-to-end có CSDL thật (gồm giả lập máy ZKTeco đẩy
  ATTLOG qua giao thức ADMS rồi đối chiếu bảng công sinh ra).
- Lái Chromium qua toàn bộ webapp (11 trang, giao diện tối, cỡ 390×844) và app điện thoại.
