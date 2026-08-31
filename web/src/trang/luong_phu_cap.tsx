// Gop Bang luong + Phu cap vao MOT trang, hai tab con (chu cong ty chot). Bang luong = ky luong
// + phieu tung nguoi; Phu cap = chinh sach phu cap co hieu luc tu-den cua tung nguoi (ky luong tu
// sinh dong khoan tu day).
import { useState, type ReactNode } from 'react';
import { TrangBangLuong } from './bang_luong.tsx';
import { TrangPhuCap } from './phu_cap.tsx';

export function TrangLuongPhuCap(): ReactNode {
  const [tab, dat_tab] = useState<'bang_luong' | 'phu_cap'>('bang_luong');
  return (
    <>
      <div className="hang-tab">
        <button className={tab === 'bang_luong' ? 'dang-chon' : undefined}
          onClick={() => dat_tab('bang_luong')}>Bảng lương</button>
        <button className={tab === 'phu_cap' ? 'dang-chon' : undefined}
          onClick={() => dat_tab('phu_cap')}>Phụ cấp</button>
      </div>
      {tab === 'bang_luong' ? <TrangBangLuong /> : <TrangPhuCap />}
    </>
  );
}
