// Bo chon tha xuong dung chung thay cho `<select>` goc khi danh sach tuy chon CO THE DAI.
//
// Ba loi cua select goc ma bo chon nay sua (nguoi dung phan nan 2026-09-21, trang To chuc):
//   1. Bang tha xuong CUA TRINH DUYET no rong theo tuy chon DAI NHAT, khong "vua voi o".
//   2. Ket qua khong co gioi han chieu cao — tran xuong het man hinh.
//   3. Khong the GO de tim — moi lan phai cuon qua ca danh sach.
//
// QUY CHUAN (2026-09-22): bang tha xuong RONG DUNG BANG O; danh sach CHI HIEN 5 KET QUA
// kem con lan (xem .chon-ds / .chon-muc o kieu.css); khi co tu 5 tuy chon tro len thi co
// o GO DE TIM phia tren. Bam ra ngoai hoac Esc de dong.
import { useEffect, useRef, useState, type ReactNode } from 'react';

export interface TuyChonChon {
  ma: string;
  nhan: string;
}

export function Chon({ gia_tri, dat_gia_tri, cac_tuy_chon, rong, nhan }: {
  gia_tri: string;
  dat_gia_tri: (ma: string) => void;
  cac_tuy_chon: readonly TuyChonChon[];
  /** Nhan hien khi chua chon (vd '— chọn vị trí —'). */
  rong?: string;
  /** Ten cho trinh doc man hinh. */
  nhan?: string;
}): ReactNode {
  const [mo, dat_mo] = useState(false);
  const [tim, dat_tim] = useState('');
  const vo = useRef<HTMLDivElement>(null);

  // Dong khi bam ra ngoai.
  useEffect(() => {
    if (!mo) return;
    const ngoai = (e: MouseEvent): void => {
      if (vo.current !== null && !vo.current.contains(e.target as Node)) dat_mo(false);
    };
    window.addEventListener('mousedown', ngoai);
    return () => window.removeEventListener('mousedown', ngoai);
  }, [mo]);

  const duoc = cac_tuy_chon.find((t) => t.ma === gia_tri)?.nhan ?? rong ?? '';
  const tim_duoc = cac_tuy_chon.length >= 5;
  const hien = tim.trim() === ''
    ? cac_tuy_chon
    : cac_tuy_chon.filter((t) => t.nhan.toLowerCase().includes(tim.trim().toLowerCase()));

  return (
    <div className="chon" ref={vo}>
      <button
        type="button"
        className="chon-o"
        aria-haspopup="listbox"
        aria-expanded={mo}
        aria-label={nhan}
        onClick={() => { dat_mo(!mo); dat_tim(''); }}
      >
        <span className="chon-o-nhan">{duoc}</span>
        {/* bt-chevron-right xoay 90 do o kieu.css (.chon-o i) — subset font chua cat chevron-down. */}
        <i className="bt bt-chevron-right" aria-hidden="true" />
      </button>
      {mo && (
        <div className="chon-bang" role="listbox">
          {tim_duoc && (
            <input
              className="chon-tim"
              autoFocus
              placeholder="Gõ để tìm…"
              value={tim}
              onChange={(e) => dat_tim(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') dat_mo(false); }}
            />
          )}
          <div className="chon-ds">
            {hien.map((t) => (
              <button
                key={t.ma}
                type="button"
                role="option"
                aria-selected={t.ma === gia_tri}
                className={t.ma === gia_tri ? 'chon-muc chon-muc-chon' : 'chon-muc'}
                onClick={() => { dat_gia_tri(t.ma); dat_mo(false); dat_tim(''); }}
              >
                {t.nhan}
              </button>
            ))}
            {hien.length === 0 && <div className="chon-rong">Không có lựa chọn nào khớp.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
