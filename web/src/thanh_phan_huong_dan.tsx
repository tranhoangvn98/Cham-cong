// Khung "Quy trình ở trang này", ve tu bang khai trong `huong_dan.ts`.
//
// VE MOT CHO cho ca 20 trang: App.tsx dat no ngay tren noi dung, nen khong trang nao "quen" co
// huong dan, va khong ai phai nho chen no khi them trang moi. Bai kiem `thiet_ke/huong_dan.test.mjs`
// doi moi muc trong thanh dieu huong deu co mot muc trong bang.
//
// MO/DONG NHO THEO TUNG TRANG. Nguoi dung moi can doc; nguoi dung quen thi dong mot lan va no o
// nguyen the. Mot khung huong dan khong dong duoc la mot khung nguoi ta hoc cach nhin xuyen qua —
// va luc do cac dong `luu_y` that su quan trong cung bi nhin xuyen qua.
import { useState, type ReactNode } from 'react';
import { vai_tro_hien_tai } from './api.ts';
import { buoc_cho_vai_tro, huong_dan_cua, type VaiTro } from './huong_dan.ts';

// Ghi nho cac trang nguoi dung DA MO huong dan. MAC DINH THU GON (1 dong) cho gon man hinh —
// nguoi dung can thi bam mo, va lua chon do duoc nho lai cho tung trang.
const KHOA = 'cham_cong_huong_dan_mo';

function cac_trang_da_mo(): Set<string> {
  try {
    const tho = window.localStorage.getItem(KHOA);
    return new Set(tho === null ? [] : (JSON.parse(tho) as string[]));
  } catch {
    return new Set();
  }
}

function ghi_nho(da_mo: Set<string>): void {
  try {
    window.localStorage.setItem(KHOA, JSON.stringify([...da_mo]));
  } catch {
    // Khong ghi nho duoc thi thoi — khong duoc lam hong viec dang lam.
  }
}

export function KhungHuongDan({ duong_dan }: { duong_dan: string }): ReactNode {
  const [da_mo, dat_da_mo] = useState<Set<string>>(cac_trang_da_mo);
  const h = huong_dan_cua(duong_dan);
  if (h === null) return null;

  const mo = da_mo.has(duong_dan);
  const doi = (): void => {
    const moi = new Set(da_mo);
    if (mo) moi.delete(duong_dan);
    else moi.add(duong_dan);
    dat_da_mo(moi);
    ghi_nho(moi);
  };

  const buoc = buoc_cho_vai_tro(h, vai_tro_hien_tai() as VaiTro | null);

  // MAC DINH: mot dong toi gian — bam "Xem" moi mo ra day du.
  if (!mo) {
    return (
      <button type="button" className="huong-dan-gon" onClick={doi}>
        <span className="huong-dan-gon-chu">Hướng dẫn trang này</span>
        <span className="huong-dan-gon-xem">Xem ›</span>
      </button>
    );
  }

  return (
    <div className="the" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, justifyContent: 'space-between' }}>
        <div style={{ minWidth: 0 }}>
          <strong>Quy trình ở trang này</strong>
          <p className="mo-ta" style={{ margin: '2px 0 0' }}>{h.tom_tat}</p>
        </div>
        <button type="button" className="nut-nho nut-phang" onClick={doi}>Ẩn</button>
      </div>

      {(
        <>
          {buoc.length > 0 ? (
            <ol style={{ margin: '10px 0 0 18px', padding: 0 }}>
              {buoc.map((b) => <li key={b.chu} style={{ marginBottom: 4 }}>{b.chu}</li>)}
            </ol>
          ) : (
            // Vai tro nay xem duoc trang nhung khong lam duoc buoc nao — noi thang thay vi de
            // mot danh sach rong, vi danh sach rong doc nhu mot loi.
            <p className="mo-ta" style={{ marginTop: 10 }}>
              Vai trò của bạn chỉ xem trang này, các thao tác do nhân sự thực hiện.
            </p>
          )}

          {(h.luu_y ?? []).length > 0 && (
            <div className="goi-y" style={{ marginTop: 10 }}>
              {(h.luu_y ?? []).map((l) => (
                <div key={l} style={{ marginBottom: 4 }}>⚠ {l}</div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
