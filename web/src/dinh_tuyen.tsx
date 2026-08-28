// Router toi gian dua tren History API. Du cho mot SPA co danh sach trang phang.
// Tu viet thay vi dung react-router: ban 7.12-8.2 dang co CVE ma chua co ban va.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface NgamTuyen {
  duong_dan: string;
  di_toi: (duong_dan: string, thay_the?: boolean) => void;
}

/**
 * Tien to duong dan cua ban trien khai, KHONG co dau gach cheo cuoi.
 *
 * Rong khi webapp nam o goc ten mien. Bang '/chamcong' khi build voi
 * VITE_BASE=/chamcong/ — dung khi dung chung ten mien voi dich vu khac. Luc do moi
 * duong dan tren thanh dia chi deu mang tien to do, nhung ben trong ma nguon van dung
 * duong dan sach ('/bang-cong') de danh sach tuyen khong phai biet no duoc dat o dau.
 */
const GOC = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');

/**
 * Duong dan sach doc tu URL that: bo tien to trien khai.
 *
 * BO LAP, khong bo mot lan. Mot lien ket ghep tien to len mot duong dan DA co tien to tao ra
 * `/chamcong/chamcong/` — hay gap nhat la mot `href` TUONG DOI o trang khac cung ten mien (the
 * module ben cong), hoac mot URL dan tay. Bo mot lan thi con `/chamcong/`, khong khop tuyen
 * nao, va nguoi dung dung o mot trang "Khong co trang nay" NGAY CUA VAO cua ung dung — trong
 * nhu he thong hong, du chi la mot lien ket sai.
 *
 * An toan vi khong tuyen nao trung voi tien to trien khai: moi tuyen dung ten co gach ngang
 * (`/bang-cong`, `/nhan-vien`). Co hang rao o `thiet_ke/giao_dien.test.mjs` giu dieu do — them
 * mot tuyen ten dung bang tien to thi bai kiem do, vi luc ay hai thu that su xung dot.
 *
 * Gioi han 5 lan de mot URL bia dai vo han khong thanh vong lap.
 */
function duong_dan_sach(): string {
  let p = window.location.pathname;
  let so_lan_bo = 0;
  while (GOC !== '' && (p === GOC || p.startsWith(`${GOC}/`)) && so_lan_bo < 5) {
    p = p.slice(GOC.length) || '/';
    so_lan_bo += 1;
  }
  // Sua luon thanh dia chi khi da bo tien to lap: neu khong thi F5, dau trang va nut Lui deu
  // dua nguoi dung ve dung cai URL sai vua chua.
  if (so_lan_bo > 1) {
    window.history.replaceState(null, '', `${GOC}${p}${window.location.search}${window.location.hash}`);
  }
  return p;
}

/** Duong dan that de day vao History API va dien vao thuoc tinh href. */
export function duong_dan_that(sach: string): string {
  return GOC === '' ? sach : `${GOC}${sach}`;
}

const Ngam = createContext<NgamTuyen>({
  duong_dan: '/',
  di_toi: () => {},
});

export function CungCapTuyen({ children }: { children: ReactNode }): ReactNode {
  const [duong_dan, dat_duong_dan] = useState(duong_dan_sach);

  useEffect(() => {
    const khi_lui = (): void => dat_duong_dan(duong_dan_sach());
    window.addEventListener('popstate', khi_lui);
    return () => window.removeEventListener('popstate', khi_lui);
  }, []);

  const di_toi = (dich: string, thay_the = false): void => {
    const that = duong_dan_that(dich);
    if (that === window.location.pathname) return;
    if (thay_the) window.history.replaceState(null, '', that);
    else window.history.pushState(null, '', that);
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
    // href phai la duong dan THAT de Ctrl-click mo tab moi va "sao chep dia chi lien ket"
    // ra dung URL, ke ca khi webapp dat duoi mot tien to.
    <a
      href={duong_dan_that(den)}
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
