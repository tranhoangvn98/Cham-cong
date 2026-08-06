// Router toi gian dua tren History API. Du cho mot SPA co danh sach trang phang.
// Tu viet thay vi dung react-router: ban 7.12-8.2 dang co CVE ma chua co ban va.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface NgamTuyen {
  duong_dan: string;
  di_toi: (duong_dan: string, thay_the?: boolean) => void;
}

const Ngam = createContext<NgamTuyen>({
  duong_dan: '/',
  di_toi: () => {},
});

export function CungCapTuyen({ children }: { children: ReactNode }): ReactNode {
  const [duong_dan, dat_duong_dan] = useState(() => window.location.pathname);

  useEffect(() => {
    const khi_lui = (): void => dat_duong_dan(window.location.pathname);
    window.addEventListener('popstate', khi_lui);
    return () => window.removeEventListener('popstate', khi_lui);
  }, []);

  const di_toi = (dich: string, thay_the = false): void => {
    if (dich === window.location.pathname) return;
    if (thay_the) window.history.replaceState(null, '', dich);
    else window.history.pushState(null, '', dich);
    dat_duong_dan(dich);
    window.scrollTo(0, 0);
  };

  return <Ngam.Provider value={{ duong_dan, di_toi }}>{children}</Ngam.Provider>;
}

export function dung_tuyen(): NgamTuyen {
  return useContext(Ngam);
}

interface LienKetProps {
  den: string;
  children: ReactNode;
  lop?: string;
  tieu_de?: string;
}

/** The <a> nhung dieu huong trong app, khong tai lai trang. */
export function LienKet({ den, children, lop, tieu_de }: LienKetProps): ReactNode {
  const { di_toi } = dung_tuyen();
  return (
    <a
      href={den}
      className={lop}
      title={tieu_de}
      onClick={(e) => {
        // Giu hanh vi mac dinh khi nguoi dung Ctrl/Cmd-click de mo tab moi.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        di_toi(den);
      }}
    >
      {children}
    </a>
  );
}
