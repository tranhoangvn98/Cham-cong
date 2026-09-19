// Dong tin nhan bot GO DAN (typewriter) — dung chung cho tro ly ca nhan va tro ly quan tri.
// Hien tung tu mot cho giong nguoi dang go; con tro nhap nhay o cuoi. Ton trong cai dat
// "giam chuyen dong" cua trinh duyet: khi bat thi hien nguyen ngay lap tuc.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { khoa_tinh } from '../thanh_phan.tsx';

/** Hien **dam** thanh <strong>, xuong dong thanh <br>, dau dong • thanh muc. */
function noi_dung_go(chu: string): ReactNode {
  return chu.split('\n').map((dong, i) => {
    const than = dong.split(/(\*\*[^*]+\*\*)/g).map((phan, j) => (
      phan.startsWith('**') && phan.endsWith('**')
        ? <strong key={khoa_tinh(phan, j)}>{phan.slice(2, -2)}</strong>
        : <span key={khoa_tinh(phan, j)}>{phan}</span>
    ));
    if (dong.startsWith('• ')) {
      return <div key={khoa_tinh(dong, i)} className="troly-gach">{than}</div>;
    }
    return (
      <span key={khoa_tinh(dong, i)}>
        {i > 0 && <br />}
        {than}
      </span>
    );
  });
}

interface DongBotGoProps {
  chu: string;
  /** true = go dan tu dau; false = hien nguyen (lich su cu, tin nhan khong phai tin moi). */
  go: boolean;
  /** Khung cuon de keo xuong duoi trong luc go (chi khi nguoi dung dang o sat day). */
  cuon: React.RefObject<HTMLDivElement | null>;
}

export function DongBotGo({ chu, go, cuon }: DongBotGoProps): ReactNode {
  const giam = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tu = chu.split(' ');
  const [so_tu, dat_so_tu] = useState(giam || !go ? tu.length : 0);
  const tick = useRef(0);

  useEffect(() => {
    if (!go || giam) {
      dat_so_tu(tu.length);
      return;
    }
    tick.current = 0;
    dat_so_tu(0);
    // Nhip go: cau dai thi go nhanh hon de khong cho nguoi dung phai doi lau.
    const nhip = Math.max(24, Math.min(70, Math.round(2200 / tu.length)));
    const id = window.setInterval(() => {
      tick.current += 1;
      dat_so_tu(tick.current);
      const c = cuon.current;
      if (c !== null && c.scrollHeight - c.scrollTop - c.clientHeight < 60) {
        c.scrollTop = c.scrollHeight;
      }
      if (tick.current >= tu.length) window.clearInterval(id);
    }, nhip);
    return () => window.clearInterval(id);
  }, [chu, go, giam, tu.length, cuon]);

  const hien = tu.slice(0, so_tu).join(' ');
  return (
    <>
      {noi_dung_go(hien)}
      {so_tu < tu.length && <span className="troly-con-tro" aria-hidden="true" />}
    </>
  );
}
