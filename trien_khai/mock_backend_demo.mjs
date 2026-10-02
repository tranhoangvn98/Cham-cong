// Mock backend DEMO tai localhost:8080 de xem giao dien web ma khong can may chu that.
// Chi cho buoc xem truoc tinh nang "De nghi them nhan su tu Microsoft 365".
// CHAY TAY:  node trien_khai/mock_backend_demo.mjs   (roi mo http://localhost:5173)
import { createServer } from 'node:http';

const json = (res, o, ma = 200) => {
  res.writeHead(ma, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(o));
};

const de_nghi = [
  {
    id: 'dn-1', ho_ten: 'Phạm Quốc An', ma_nv: 'ERP201', chuc_danh: 'Nhân viên Kinh doanh',
    vi_tri: 'nhan_vien', ngay_vao: '2026-10-01', email: 'an.pham@tranhoangvietnam.com',
    loai_hop_dong: 'HĐLĐ 12 tháng', cap_ms365: true, ms365_da_co: true,
    tao_tk_he_thong: true, tu_cap_pin: true, serial_may_cua: 'CUATEST01',
    trang_thai: 'cho_duyet', nhan_vien_id: null, ly_do_tu_choi: null,
    admin_duyet_luc: null, tao_luc: '2026-10-02T01:00:00Z', ma_nv_da_tao: null,
    nguoi_de_nghi: 'Nhân Sự HR', admin_duyet: null,
  },
  {
    id: 'dn-2', ho_ten: 'Võ Thị Hoa', ma_nv: 'ERP202', chuc_danh: 'Nhân viên',
    vi_tri: 'nhan_vien', ngay_vao: '2026-09-25', email: 'hoa.vo@tranhoangvietnam.com',
    loai_hop_dong: 'Thử việc', cap_ms365: false, ms365_da_co: false,
    tao_tk_he_thong: true, tu_cap_pin: false, serial_may_cua: 'CUATEST02',
    trang_thai: 'da_khoi_tao', nhan_vien_id: 'nv-x', ly_do_tu_choi: null,
    admin_duyet_luc: '2026-09-26T02:00:00Z', tao_luc: '2026-09-24T01:00:00Z',
    ma_nv_da_tao: 'ERP202', nguoi_de_nghi: 'Nhân Sự HR', admin_duyet: 'admin',
  },
];

const m365 = [
  { oid: 'oid-1', ho_ten: 'Nguyễn Văn Bình', upn: 'binh.nguyen@tranhoangvietnam.com' },
  { oid: 'oid-2', ho_ten: 'Trần Thị Cúc', upn: 'cuc.tran@tranhoangvietnam.com' },
  { oid: 'oid-3', ho_ten: 'Lê Minh Đức', upn: 'duc.le@tranhoangvietnam.com' },
];

createServer((req, res) => {
  const u = new URL(req.url ?? '/', 'http://localhost:8080');
  const p = u.pathname;
  if (p === '/health') return json(res, { ok: true });
  if (p === '/api/xac-thuc/cau-hinh') {
    return json(res, { dang_nhap_rieng: true, dang_nhap_microsoft: true, cong_sso: null, ms365_tao: { bat: true } });
  }
  if (p === '/api/de-nghi-nhan-su/ms365-da-cap-phep/dong-bo' && req.method === 'POST') {
    return json(res, { tong: m365.length, them_moi: 0, ten_moi: [] });
  }
  if (p === '/api/de-nghi-nhan-su/ms365-da-cap-phep') {
    return json(res, { danh_sach: m365, dong_bo_luc: '2026-10-02T05:00:00Z' });
  }
  if (p === '/api/de-nghi-nhan-su') return json(res, de_nghi);
  if (p === '/api/phong-ban') return json(res, [{ id: 'pb1', ten: 'Phòng Kinh doanh' }, { id: 'pb2', ten: 'Phòng Nhân sự' }]);
  if (p === '/api/ca-lam') return json(res, [{ id: 'ca1', ten: 'Hành chính 08:00-17:30', dang_hoat_dong: true }]);
  if (p === '/api/khoi') return json(res, [{ id: 'k1', ma: 'KD', ten: 'Khối Kinh doanh', dang_bat: true }]);
  if (p === '/api/thiet-bi') return json(res, [
    { id: 't1', serial: 'CUATEST01', ten: 'Cửa chính', dang_bat: true },
    { id: 't2', serial: 'CUATEST02', ten: 'Cửa kho', dang_bat: true },
  ]);
  if (p === '/api/noi-lam-viec') return json(res, [{ id: 'n1', ten: 'Hà Nội', lich_nghi_ma: 'vn' }]);
  if (p === '/api/toi/bao') return json(res, { danh_sach: [], so_chua_doc: 0 });
  if (p === '/api/toi/thoi-viec') return json(res, null);
  if (req.method === 'GET') return json(res, []);
  return json(res, { ok: true });
}).listen(8080, () => console.log('Mock backend demo: http://localhost:8080'));
