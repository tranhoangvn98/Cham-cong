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

const KHOA = 'cham_cong_huong_dan_dong';

function cac_trang_da_dong(): Set<string> {
  try {
    const tho = window.localStorage.getItem(KHOA);
    return new Set(tho === null ? [] : (JSON.parse(tho) as string[]));
  } catch {
    // localStorage bi chan (che do rieng tu, hoac chinh sach trinh duyet) thi coi nhu chua dong
    // trang nao. Huong dan hien ra thua con hon ca trang trang vi mot loi luu tru.
    return new Set();
  }
}

function ghi_nho(da_dong: Set<string>): void {
  try {
    window.localStorage.setItem(KHOA, JSON.stringify([...da_dong]));
  } catch {
    // Khong ghi nho duoc thi thoi — khong duoc lam hong viec dang lam.
  }
}

export function KhungHuongDan({ duong_dan }: { duong_dan: string }): ReactNode {
  const [da_dong, dat_da_dong] = useState<Set<string>>(cac_trang_da_dong);
  const h = huong_dan_cua(duong_dan);
  if (h === null) return null;

  const dong = da_dong.has(duong_dan);
  const doi = (): void => {
    const moi = new Set(da_dong);
    if (dong) moi.delete(duong_dan);
    else moi.add(duong_dan);
    dat_da_dong(moi);
    ghi_nho(moi);
  };

  const buoc = buoc_cho_vai_tro(h, vai_tro_hien_tai() as VaiTro | null);

  return (
    <div className="the" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, justifyContent: 'space-between' }}>
        <div style={{ minWidth: 0 }}>
          <strong>Quy trình ở trang này</strong>
          <p className="mo-ta" style={{ margin: '2px 0 0' }}>{h.tom_tat}</p>
        </div>
        <button type="button" className="nut-nho nut-phang" onClick={doi}>
          {dong ? 'Xem hướng dẫn' : 'Ẩn'}
        </button>
      </div>

      {!dong && (
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
