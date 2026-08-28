// Vo cua khu Cai dat: sub-nav ben trai, noi dung muc con ben phai.
//
// VI SAO KHU RIENG CHU KHONG PHAI 11 MUC TREN THANH BEN: cau hinh la thu sua vai lan mot nam,
// viec hang ngay la thu mo vai lan mot ngay. De chung mot cap lam thanh ben dai gap doi phan
// viec that, va nguoi dung phai quet qua "Khoa API" moi lan tim "Bang cong".
//
// VI SAO SUB-NAV CHU KHONG PHAI TAB: moi muc con co duong dan rieng (`/cai-dat/thiet-bi`), nen
// bookmark, Ctrl-click va nut Lui deu chay. Tab trong mot trang thi ca ba deu khong.
import type { ReactNode } from 'react';
import { LienKet } from '../dinh_tuyen.tsx';
import { DuongMon, dung_dat_tieu_de } from '../tieu_de_trang.tsx';

/** Dung khai bao voi `MucMenu` cua App.tsx — o day chi can phan doc duoc. */
export interface MucCaiDat {
  duong_dan: string;
  ten: string;
  icon: string;
  nhom: string;
  phu?: string;
}

export function TrangCaiDat(
  { cac_muc, duong_dan, muc, children }: {
    cac_muc: MucCaiDat[];
    duong_dan: string;
    /** Muc con dang mo; `null` o trang `/cai-dat` hoac khi duong dan la. */
    muc: MucCaiDat | null;
    children: ReactNode;
  },
): ReactNode {
  // Header cua app hien "Cài đặt" (nhan cua muc menu). O trang con, doi thanh ten muc con va
  // gan duong mon de con duong lui — nguoi dung dang o `/cai-dat/khoa-api` phai thay minh o dau.
  dung_dat_tieu_de(muc === null ? null : {
    tieu_de: muc.ten,
    ...(muc.phu === undefined ? {} : { phu: muc.phu }),
    duong_mon: [{ ten: 'Cài đặt', den: '/cai-dat' }, { ten: muc.ten }],
  });

  const nhom = [...new Set(cac_muc.map((m) => m.nhom))];

  return (
    <div className="khu-cai-dat">
      <nav className="cai-dat-ben" aria-label="Mục cài đặt">
        {nhom.map((n) => (
          <div key={n} className="cai-dat-khoi">
            <div className="cai-dat-nhom">{n}</div>
            {cac_muc.filter((m) => m.nhom === n).map((m) => (
              <LienKet
                key={m.duong_dan}
                den={m.duong_dan}
                lop={duong_dan === m.duong_dan ? 'dang-chon' : undefined}
              >
                <i className={`bt bt-${m.icon}`} aria-hidden="true" /> {m.ten}
              </LienKet>
            ))}
          </div>
        ))}
      </nav>

      <div className="cai-dat-than">
        {muc !== null && (
          <DuongMon cac_chang={[{ ten: 'Cài đặt', den: '/cai-dat' }, { ten: muc.ten }]} />
        )}
        {children}
      </div>
    </div>
  );
}

/**
 * Trang `/cai-dat` khi chua chon muc nao.
 *
 * Khong tu nhay sang muc dau tien: "muc dau tien" khac nhau theo vai tro, nen cung mot duong
 * dan se dan hai nguoi den hai cho — va ca hai deu khong hieu vi sao. Liet ke ra thi tra loi
 * duoc cau "o day sua duoc nhung gi".
 */
export function ChonMucCaiDat({ cac_muc }: { cac_muc: MucCaiDat[] }): ReactNode {
  const nhom = [...new Set(cac_muc.map((m) => m.nhom))];

  return (
    <>
      <p className="mo-ta">
        Các mục cấu hình của hệ thống. Chỉ hiện những mục vai trò của bạn được sửa.
      </p>
      {nhom.map((n) => (
        <div key={n} className="the">
          <h3>{n}</h3>
          <div className="luoi-cai-dat">
            {cac_muc.filter((m) => m.nhom === n).map((m) => (
              <LienKet key={m.duong_dan} den={m.duong_dan} lop="o-cai-dat">
                <i className={`bt bt-${m.icon}`} aria-hidden="true" />
                <span>
                  <strong>{m.ten}</strong>
                  {m.phu !== undefined && <span className="mo-ta">{m.phu}</span>}
                </span>
              </LienKet>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
