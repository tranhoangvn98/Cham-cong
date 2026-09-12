// Kiem than email phieu luong: hien du cac muc thu nhap / khau tru, badge du cong / mien phat,
// va tong khop. Chi kiem ham thuan `than_email_phieu` (khong dung CSDL).
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { than_email_phieu } = await import('../src/luong/phieu_luong_email.ts');

function phieu_mau(ghi_de: Record<string, unknown> = {}) {
  return {
    id: 'p1', thang: '2026-08', ho_ten: 'Nguyen Van A', ma_nv: 'NV001',
    email: 'a@example.com', phong_ban: 'Ky thuat', chuc_danh: 'Nhan vien',
    loai_hop_dong: 'khong_xac_dinh',
    so_ngay_cong_chuan: 26, so_ngay_cong_thuc: 26,
    luong_co_ban: 10_000_000, luong_ngay: 384_615, luong_theo_cong: 10_000_000,
    phut_ot: 90, tien_ot: 200_000, thuong: 500_000, phu_cap_khac: 0,
    tong_thu_nhap: 10_700_000,
    bhxh_nld: 800_000, bhyt_nld: 150_000, bhtn_nld: 100_000, thue_tncn: 0,
    tru_khac: 0, tong_tru: 1_050_000,
    thuc_linh_lam_tron: 9_650_000,
    so_nguoi_phu_thuoc: 0, giam_tru_tong: 11_000_000, thu_nhap_tinh_thue: 0,
    muc_dong_bh: 10_000_000, ep_du_cong: false, mien_phat: false,
    khoan: [] as unknown[],
    ...ghi_de,
  } as unknown as Parameters<typeof than_email_phieu>[0];
}

test('than email: hien thang, ten, thuc nhan, thuong, OT theo phut', () => {
  const html = than_email_phieu(phieu_mau());
  assert.match(html, /08\/2026/);
  assert.match(html, /Nguyen Van A/);
  assert.match(html, /9\.650\.000/); // thuc nhan lam tron
  assert.match(html, /Thưởng/);
  assert.match(html, /Làm thêm giờ \(1h30\)/); // 90 phut
});

test('than email: badge Du cong / Mien phat khi bat', () => {
  const html = than_email_phieu(phieu_mau({ ep_du_cong: true, mien_phat: true }));
  assert.match(html, /Đủ công/);
  assert.match(html, /Miễn phạt/);
  const html2 = than_email_phieu(phieu_mau());
  assert.doesNotMatch(html2, /Đủ công/);
});

test('than email: liet ke khoan thu nhap + khau tru theo loai', () => {
  const html = than_email_phieu(phieu_mau({
    khoan: [
      { ten: 'Phụ cấp ăn trưa', loai: 'thu_nhap', so_luong: null, thanh_tien: '730000', chiu_thue: false },
      { ten: 'Tạm ứng', loai: 'tru', so_luong: null, thanh_tien: '500000', chiu_thue: false },
    ],
  }));
  assert.match(html, /Phụ cấp ăn trưa/);
  assert.match(html, /miễn thuế/); // chiu_thue = false
  assert.match(html, /Tạm ứng/);
});
