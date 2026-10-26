// Backfill: dua MOI Quyet dinh nghi viec da phat hanh nhung chua vao quy trinh thoi viec.
//
// Chay TRONG container may_chu (sau khi build ban moi):
//   docker compose cp trien_khai/backfill_quy_trinh_tu_qd.mjs may_chu:/app/
//   docker compose exec -T may_chu node /app/backfill_quy_trinh_tu_qd.mjs
//
// An toan de chay lai: `nghi_viec_den_han` chi nhat QD co `nghi_viec_da_chay_luc is null`;
// quy trinh da co thi `dam_bao_quy_trinh_tu_qd` tai su dung, khong tao ban thu hai.
// QD cua nguoi da `dang_hoat_dong = false` chi duoc danh dau da xu ly (khong mo quy trinh).
import { nghi_viec_den_han } from '/app/may_chu/dist/su_kien/lich_chay.js';
import { ngay_dia_phuong } from '/app/may_chu/dist/tien_ich/thoi_gian.js';
import { dong_pool } from '/app/may_chu/dist/csdl/ket_noi.js';

const hom_nay = ngay_dia_phuong(new Date());
console.log(`[backfill] bat dau — hom nay ${hom_nay}`);
await nghi_viec_den_han(hom_nay, (s, ...t) => console.log(s, ...t));
console.log('[backfill] xong');
await dong_pool();
