// Gop Ky luat + Vi pham + Khieu nai vao MOT trang, ba tab con (chu cong ty chot). Ky luat = tong
// hop + tu dong (giam thuong); Vi pham = danh muc noi quy + tung ban ghi + quyet dinh; Khieu nai =
// quan ly khieu nai & giai trinh cua nguoi lao dong.
import { useState, type ReactNode } from 'react';
import { TrangKyLuat } from './ky_luat.tsx';
import { TrangViPham } from './vi_pham.tsx';
import { TrangKhieuNai } from './khieu_nai.tsx';

type Tab = 'ky_luat' | 'vi_pham' | 'khieu_nai';

export function TrangKyLuatViPham(): ReactNode {
  const [tab, dat_tab] = useState<Tab>('ky_luat');
  return (
    <>
      <div className="hang-tab">
        <button className={tab === 'ky_luat' ? 'dang-chon' : undefined}
          onClick={() => dat_tab('ky_luat')}>Kỷ luật</button>
        <button className={tab === 'vi_pham' ? 'dang-chon' : undefined}
          onClick={() => dat_tab('vi_pham')}>Vi phạm</button>
        <button className={tab === 'khieu_nai' ? 'dang-chon' : undefined}
          onClick={() => dat_tab('khieu_nai')}>Khiếu nại</button>
      </div>
      {tab === 'ky_luat' ? <TrangKyLuat />
        : tab === 'vi_pham' ? <TrangViPham />
          : <TrangKhieuNai />}
    </>
  );
}
