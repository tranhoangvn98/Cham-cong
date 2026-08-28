// Tieu de tren thanh header cua app, do TRANG quyet dinh.
//
// VI SAO CAN: header lay ten tu bang `MENU` bang cach so khop duong dan chinh xac. Voi trang
// co tham so — `/nhan-vien/<uuid>` — khong muc nao khop, nen header roi ve "Chấm công" va dong
// phu bien mat. Nguoi dung dang xem ho so cua mot nguoi cu the ma thanh tieu de khong noi ho
// dang o dau, cung khong co duong lui.
//
// Cach lam: mot ngu canh nho. `BoCuc` cap ham dat, trang goi `dung_dat_tieu_de(...)` va header
// uu tien gia tri do. Don dep khi trang roi di, nen trang KHONG goi hook nay thi header quay ve
// nhan cua MENU — khong can moi trang phai biet den co che nay.
import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { LienKet } from './dinh_tuyen.tsx';

/** Mot chang tren duong mon. Khong co `den` thi la chang cuoi, khong bam duoc. */
export interface ChangDuongMon {
  ten: string;
  den?: string;
}

export interface TieuDeTrang {
  tieu_de: string;
  /** Dong phu duoi tieu de. */
  phu?: string;
  duong_mon?: ChangDuongMon[];
}

const Ngam = createContext<(t: TieuDeTrang | null) => void>(() => {});

export function CungCapTieuDe(
  { dat, children }: { dat: (t: TieuDeTrang | null) => void; children: ReactNode },
): ReactNode {
  return <Ngam.Provider value={dat}>{children}</Ngam.Provider>;
}

/**
 * Dat tieu de header cho trang dang mo. Truyen `null` khi chua biet (vd dang tai).
 *
 * Don dep tra ve `null` khi trang roi di. Nho vay KHONG can `BoCuc` tu xoa moi lan doi duong
 * dan — lam the se dam vao nhau: hieu ung cua con chay TRUOC hieu ung cua cha, nen mot lenh
 * xoa o cha se de len tieu de ma trang moi vua dat.
 */
export function dung_dat_tieu_de(t: TieuDeTrang | null): void {
  const dat = useContext(Ngam);
  // So sanh theo NOI DUNG: trang thuong dung mot object van moi moi lan render, va de nguyen
  // no trong danh sach phu thuoc thi hieu ung chay lai sau moi lan ve.
  const khoa = t === null ? '' : JSON.stringify(t);

  useEffect(() => {
    dat(khoa === '' ? null : (JSON.parse(khoa) as TieuDeTrang));
    return () => dat(null);
  }, [dat, khoa]);
}

/** Duong mon tren header. Chang cuoi la trang dang mo nen khong bam duoc. */
export function DuongMon({ cac_chang }: { cac_chang: ChangDuongMon[] }): ReactNode {
  if (cac_chang.length === 0) return null;
  return (
    <nav className="duong-mon" aria-label="Đường dẫn">
      {cac_chang.map((c, i) => (
        <span key={`${c.ten}-${String(i)}`}>
          {i > 0 && <span className="duong-mon-tach" aria-hidden="true">›</span>}
          {c.den === undefined
            ? <span aria-current="page">{c.ten}</span>
            : <LienKet den={c.den}>{c.ten}</LienKet>}
        </span>
      ))}
    </nav>
  );
}
