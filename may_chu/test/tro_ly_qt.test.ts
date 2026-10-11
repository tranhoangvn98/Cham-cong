// Kiem phan thuan tuy cua tro ly quan tri: nhan dang y dinh bang tu khoa (khong dau).
// Phan tra loi truy van CSDL nam o e2e — o day chi kiem ham khong can CSDL.
import './moi_truong_kiem_thu.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { nhan_dang_y_dinh_qt, nhan_vien_khop } = await import('../src/quan_tri/tro_ly.ts');

test('nhan_dang_y_dinh_qt: cau hoi so lieu thang cau hoi noi quy', () => {
  assert.equal(nhan_dang_y_dinh_qt('hôm nay bao nhiêu người đi muộn'), 'di_muon');
  assert.equal(nhan_dang_y_dinh_qt('ai vắng hôm nay'), 'vang');
  assert.equal(nhan_dang_y_dinh_qt('ai chưa quẹt hôm nay'), 'chua_quet');
  assert.equal(nhan_dang_y_dinh_qt('bao nhiêu đơn chờ duyệt'), 'don_cho');
  assert.equal(nhan_dang_y_dinh_qt('máy chấm công có lỗi không'), 'may_cham');
  assert.equal(nhan_dang_y_dinh_qt('nhân viên Lan công tháng này thế nào'), 'nhan_vien');
  assert.equal(nhan_dang_y_dinh_qt('tổng quan hôm nay thế nào'), 'tong_quan');
  assert.equal(nhan_dang_y_dinh_qt('hôm nay thế nào'), 'tong_quan');
  // "hom nay" tran khong duoc bat nham thanh tong quan.
  assert.equal(nhan_dang_y_dinh_qt('hôm nay trời mưa không'), 'khong_ro');
  // Hoi HANH VI + che tai la cau hoi noi quy, khong phai so lieu di muon.
  assert.equal(nhan_dang_y_dinh_qt('đi muộn bị xử lý thế nào'), 'noi_quy');
  assert.equal(nhan_dang_y_dinh_qt('mẫu đơn xin nghỉ phép ở đâu'), 'van_ban');
  assert.equal(nhan_dang_y_dinh_qt('thông báo mới nhất là gì'), 'thong_bao');
});

test('nhan_dang_y_dinh_qt: chao hoi, tham hoi va khong ro', () => {
  assert.equal(nhan_dang_y_dinh_qt(''), 'chao');
  assert.equal(nhan_dang_y_dinh_qt('chào bạn'), 'chao');
  assert.equal(nhan_dang_y_dinh_qt('cảm ơn nhé'), 'hoi_tham');
  assert.equal(nhan_dang_y_dinh_qt('mệt quá'), 'hoi_tham');
  assert.equal(nhan_dang_y_dinh_qt('chán quá đi'), 'hoi_tham');
  // Yeu cau mo trang la dieu huong.
  assert.equal(nhan_dang_y_dinh_qt('mở trang ứng lương'), 'mo_trang');
  assert.equal(nhan_dang_y_dinh_qt('đưa tôi tới bảng công'), 'mo_trang');
  // "hi" khop theo tu nguyen, khong bam phai "nghi".
  assert.notEqual(nhan_dang_y_dinh_qt('xin nghỉ phép ngày mai'), 'chao');
});

test('nhan_vien_khop: ten day du, cum cuoi va ten rieng viet hoa', () => {
  const ds = [
    { id: '1', ho_ten: 'Trần Khánh Ly', ma_nv: 'khanhlykd' },
    { id: '2', ho_ten: 'Vũ Thị Cẩm Ly', ma_nv: 'ERP125' },
    { id: '3', ho_ten: 'Nguyễn Văn An', ma_nv: 'ERP001' },
    { id: '4', ho_ten: 'Nguyễn Thị Lan', ma_nv: 'ERP002' },
  ];
  const khop = (cau: string, goc: string) => nhan_vien_khop(ds, cau, goc).map((n) => n.ma_nv);

  // Ten day du — ca khi cau chi co dung ten, khong tu khoa nao.
  assert.deepEqual(khop('tran khanh ly', 'Trần Khánh Ly'), ['khanhlykd']);
  // Cum hai tu cuoi, khong can viet hoa.
  assert.deepEqual(khop('cong thang nay cua cam ly', 'công tháng này của Cẩm Ly'), ['ERP125']);
  // Mot phan ten viet hoa giua cau la ten rieng.
  assert.deepEqual(khop('nhan vien lan cong thang nay', 'nhân viên Lan công tháng này'), ['ERP002']);
  // Tu dau cau viet hoa duy nhat KHONG phai ten — khong bat nham.
  assert.deepEqual(khop('bang luong thang nay', 'Bảng lương tháng này'), []);
  // Cau hoi phu cap co chu "nhan vien" nhung khong chua ten ai.
  assert.deepEqual(
    khop(
      'duoi bang luong co muc phu cap toi bam vao do them phu cap makeup cho nhan vien',
      'Dưới bảng lương có mục phụ cấp. Tôi bấm vào đó thêm phụ cấp makeup cho nhân viên',
    ),
    [],
  );
  // Ten viet hoa giua cau khop nhieu nguoi cung ten.
  assert.deepEqual(khop('toi muon xem cong cua ly', 'Tôi muốn xem công của Ly'), ['khanhlykd', 'ERP125']);
});
