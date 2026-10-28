// Thay 5 chuong "giay phep khac" da ghi SAI ten goi bang mot chuong dung su that.
//
// Ban 1.138.4 ghi cung skuId va khai `e0dfc8b9-...` la "Business Standard" trong khi tenant tra
// ve `Microsoft_Teams_Exploratory_Dept` (mien phi). Chuong cu noi sai ve mot nguoi cu the nen phai
// go, khong the de lai.
//
//   docker compose cp trien_khai/sua_chuong_giay_phep_phuong.mjs may_chu:/tmp/
//   docker compose exec -T may_chu node /tmp/sua_chuong_giay_phep_phuong.mjs
import { truy_van, thuc_thi } from '/app/may_chu/dist/csdl/ket_noi.js';

const TIEU_DE_SAI = 'Tài khoản Microsoft có giấy phép khác — chưa cấp tự động';
const TIEU_DE_MOI = 'Đã cấp Microsoft 365 Business Basic cho Trần Thị Minh Phương';
const NOI_DUNG = {
  vi: 'Trần Thị Minh Phương (NVVP10260003) — phuong.kt@tranhoangvietnam.com đã được cấp Microsoft 365 Business Basic. '
    + 'Thông báo trước đó ghi nhầm tên gói: tài khoản chỉ có Microsoft Teams Exploratory (miễn phí), '
    + 'không phải Business Standard. Tài khoản vẫn giữ Teams Exploratory miễn phí — không phát sinh chi phí.',
  zh: '已为 Trần Thị Minh Phương（NVVP10260003）——phuong.kt@tranhoangvietnam.com 分配 Microsoft 365 Business Basic。'
    + '此前的通知写错了套餐名称：该账号只有免费的 Microsoft Teams Exploratory，并非 Business Standard。'
    + '账号仍保留免费的 Teams Exploratory，不产生费用。',
};

const da_xoa = await truy_van(
  'delete from thong_bao_rieng where tieu_de = $1 returning id', [TIEU_DE_SAI]);
console.log(`Da go ${da_xoa.length} chuong ghi sai ten goi.`);

for (const nn of ['vi', 'zh']) {
  const nguoi = await truy_van(
    `select id from nguoi_dung
      where coalesce(ngon_ngu, 'vi') = $1
        and vai_tro in ('admin', 'nhan_su', 'truong_phong_nhan_su')`, [nn]);
  if (nguoi.length === 0) continue;
  await thuc_thi(
    `insert into thong_bao_rieng(nguoi_dung_id, tieu_de, noi_dung, du_lieu)
     select unnest($1::uuid[]), $2, $3, $4::jsonb`,
    [nguoi.map((n) => n.id), nn === 'vi' ? TIEU_DE_MOI : '已为 Trần Thị Minh Phương 分配 Microsoft 365 Business Basic',
      NOI_DUNG[nn], JSON.stringify({ man: 'nhan-vien' })]);
  console.log(`Da gui chuong dung cho ${nguoi.length} nguoi (${nn}).`);
}

const nv = await truy_van(`select id from nhan_vien where ma_nv = 'NVVP10260003'`);
if (nv[0] !== undefined) {
  await thuc_thi(
    `insert into nhat_ky_thao_tac(nguoi_dung_id, hanh_dong, thuc_the, thuc_the_id, chi_tiet)
     values (null, 'sua_chuong_giay_phep', 'nhan_vien', $1, $2::jsonb)`,
    [nv[0].id, JSON.stringify({
      so_chuong_go: da_xoa.length,
      ly_do: 'Chuong 1.138.4 ghi nham Business Standard; thuc te la Teams Exploratory (mien phi)',
    })]);
  console.log('Da ghi nhat ky.');
}
process.exit(0);
