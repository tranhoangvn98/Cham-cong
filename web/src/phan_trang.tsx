// Phan trang dung chung cho moi bang danh sach: chon 20/50/100 dong moi trang + nut lui/toi.
//
// HAI CACH DUNG:
//
// 1) Danh sach da co DAY DU (da loc xong) — phan trang ngay tren trinh duyet:
//
//   const { ds_xem, bo_phan_trang } = dung_phan_trang(ds_da_loc);
//   {ds_xem.map(...)}
//   {bo_phan_trang}
//
// 2) Bang lon, may chu tra ve tung trang (kem tong so dong) — dung <BoPhanTrang> truc tiep,
//    trang/kich thuoc do component cha giu de goi lai API khi doi:
//
//   <BoPhanTrang tong={tong} trang={trang} kich_thuoc={kich_thuoc}
//     dat_trang={dat_trang} dat_kich_thuoc={dat_kich_thuoc} />
import { useEffect, useState, type ReactNode } from 'react';

export const CAC_KICH_THUOC_TRANG = [20, 50, 100] as const;

/** Thanh phan trang DAM MAY CHU TRA VE — nguoi goi giu trang/kich thuoc va nap du lieu theo. */
export function BoPhanTrang({ tong, trang, kich_thuoc, dat_trang, dat_kich_thuoc }: {
  tong: number;
  trang: number;
  kich_thuoc: number;
  dat_trang: (t: number) => void;
  dat_kich_thuoc: (k: number) => void;
}): ReactNode {
  if (tong === 0) return null;
  const so_trang = Math.max(1, Math.ceil(tong / kich_thuoc));
  const trang_an_toan = Math.min(trang, so_trang);
  const dau = (trang_an_toan - 1) * kich_thuoc;
  const cuoi = Math.min(dau + kich_thuoc, tong);
  return (
    <div className="phan-trang">
      <span className="phan-trang-tong">Hiển thị {dau + 1}–{cuoi} trong {tong}</span>
      <div className="phan-trang-phai">
        <label className="phan-trang-chon">
          Mỗi trang
          <select value={kich_thuoc} onChange={(e) => dat_kich_thuoc(Number(e.target.value))}>
            {CAC_KICH_THUOC_TRANG.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </label>
        <div className="phan-trang-nut-hang">
          <button
            type="button"
            className="phan-trang-nut"
            aria-label="Trang trước"
            disabled={trang_an_toan <= 1}
            onClick={() => dat_trang(trang_an_toan - 1)}
          >
            ‹
          </button>
          <span className="phan-trang-so">Trang {trang_an_toan} / {so_trang}</span>
          <button
            type="button"
            className="phan-trang-nut"
            aria-label="Trang sau"
            disabled={trang_an_toan >= so_trang}
            onClick={() => dat_trang(trang_an_toan + 1)}
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}

/** Phan trang TREN TRINH DUYET cho danh sach da nap du (loc truoc khi goi ham nay). */
export function dung_phan_trang<T>(ds: readonly T[], kich_thuoc_ban_dau = 20): {
  /** Danh sach con cua trang hien tai — dung de render cac dong. */
  ds_xem: T[];
  /** Thanh phan trang nho (tong so + chon kich thuoc + nut lui/toi) — dat ngay duoi bang. */
  bo_phan_trang: ReactNode;
  /** Vi tri (so thu tu) cua dong dau trang — de danh so thứ tu lien tuc qua cac trang. */
  dau: number;
} {
  const [kich_thuoc, dat_kich_thuoc] = useState(kich_thuoc_ban_dau);
  const [trang, dat_trang] = useState(1);

  const so_trang = Math.max(1, Math.ceil(ds.length / kich_thuoc));

  // Loc/xoa lam so trang giam: lui trang hien tai ve trang cuoi hop le (khong dung o trang rong).
  useEffect(() => {
    if (trang > so_trang) dat_trang(so_trang);
  }, [trang, so_trang]);

  const trang_an_toan = Math.min(trang, so_trang);
  const dau = (trang_an_toan - 1) * kich_thuoc;

  return {
    ds_xem: ds.slice(dau, dau + kich_thuoc),
    dau,
    bo_phan_trang: (
      <BoPhanTrang
        tong={ds.length}
        trang={trang}
        kich_thuoc={kich_thuoc}
        dat_trang={dat_trang}
        dat_kich_thuoc={(k) => { dat_kich_thuoc(k); dat_trang(1); }}
      />
    ),
  };
}
