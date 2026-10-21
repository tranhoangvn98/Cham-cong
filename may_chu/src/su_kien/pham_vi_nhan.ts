// Phạm vi phòng ban khi lọc THÔNG BÁO / VĂN BẢN cho một người cụ thể.
//
// Một người thuộc phạm vi của một phòng ban nếu:
//   1. đó là phòng ban CHÍNH của họ (nhan_vien.phong_ban_id); hoặc
//   2. họ KIÊM NHIỆM phòng ban đó (bảng phong_ban_kiem_nhiem); hoặc
//   3. tài khoản của họ là `admin` — admin nhận mọi thông báo phòng ban
//      (quyết định 21/10/2026: tài khoản admin nhận đủ mọi thông báo).
//
// `cot_phong`: biểu thức cột phòng ban của dòng đang lọc (vd 'tb.phong_ban_id').
// `tham_so_nv`: tham số SQL mang id NHÂN VIÊN đang xét (vd '$1').
//
// Lưu ý: fragment này chỉ dùng cho phía NGƯỜI ĐỌC (một người cố định). Phía người
// GỬI (giải danh sách người nhận từ một phòng ban) viết điều kiện trực tiếp theo
// từng dòng nhân viên — xem nguoi_nhan_pham_vi (tuyen/thong_bao.ts) và
// lay_dia_chi_nhan_theo_ngon_ngu (su_kien/gui_email_thong_bao.ts).
export function trong_phong_ban(cot_phong: string, tham_so_nv: string): string {
  return `(${cot_phong} in (select nv_kn.phong_ban_id from nhan_vien nv_kn
                             where nv_kn.id = ${tham_so_nv})
       or ${cot_phong} in (select pbk.phong_ban_id from phong_ban_kiem_nhiem pbk
                            where pbk.nhan_vien_id = ${tham_so_nv})
       or exists (select 1 from nguoi_dung nd_kn
                   where nd_kn.nhan_vien_id = ${tham_so_nv}
                     and nd_kn.vai_tro = 'admin'))`;
}
