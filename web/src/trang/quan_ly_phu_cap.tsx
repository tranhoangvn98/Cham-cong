// Trang QUAN LY PHU CAP — mot trang, ba tab theo logic moi:
//   1. Danh muc khoan  — cac loai phu cap/tru dung chung (du lieu goc).
//   2. Theo khoi        — phu cap mac dinh cua ca khoi.
//   3. Ca nhan          — phu cap rieng tung nguoi, DE len muc cua khoi.
// Thu tu tab di tu "goc" (danh muc) -> "chung" (khoi) -> "rieng" (ca nhan de khoi).
import { useState, type ReactNode } from 'react';
import { TrangDanhMucKhoan } from './danh_muc_khoan.tsx';
import { TrangPhuCapKhoi } from './phu_cap_khoi.tsx';
import { TrangPhuCap } from './phu_cap.tsx';

type Tab = 'danh_muc' | 'khoi' | 'ca_nhan';

export function TrangQuanLyPhuCap(): ReactNode {
  const [tab, dat_tab] = useState<Tab>('khoi');
  return (
    <>
      <div className="hang-tab">
        <button className={tab === 'danh_muc' ? 'dang-chon' : undefined}
          onClick={() => dat_tab('danh_muc')}>Danh mục khoản</button>
        <button className={tab === 'khoi' ? 'dang-chon' : undefined}
          onClick={() => dat_tab('khoi')}>Theo khối</button>
        <button className={tab === 'ca_nhan' ? 'dang-chon' : undefined}
          onClick={() => dat_tab('ca_nhan')}>Cá nhân (đè khối)</button>
      </div>
      {tab === 'danh_muc' && <TrangDanhMucKhoan />}
      {tab === 'khoi' && <TrangPhuCapKhoi />}
      {tab === 'ca_nhan' && <TrangPhuCap />}
    </>
  );
}
