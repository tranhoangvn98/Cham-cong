// Gop Ky luat + Vi pham vao MOT trang, hai tab con (chu cong ty chot). Ky luat = tong hop + tu
// dong (giam thuong); Vi pham = danh muc noi quy + tung ban ghi + quyet dinh ky luat qua bien ban.
import { useState, type ReactNode } from 'react';
import { TrangKyLuat } from './ky_luat.tsx';
import { TrangViPham } from './vi_pham.tsx';

export function TrangKyLuatViPham(): ReactNode {
  const [tab, dat_tab] = useState<'ky_luat' | 'vi_pham'>('ky_luat');
  return (
    <>
      <div className="hang-tab">
        <button className={tab === 'ky_luat' ? 'dang-chon' : undefined}
          onClick={() => dat_tab('ky_luat')}>Kỷ luật</button>
        <button className={tab === 'vi_pham' ? 'dang-chon' : undefined}
          onClick={() => dat_tab('vi_pham')}>Vi phạm</button>
      </div>
      {tab === 'ky_luat' ? <TrangKyLuat /> : <TrangViPham />}
    </>
  );
}
