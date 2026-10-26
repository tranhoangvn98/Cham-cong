// Nut goi y (bieu tuong ⓘ) + bong giai thich dung chung cho MOI mo ta tren giao dien.
//
// Quy uoc (xem tai_lieu/THIET-KE.md muc 9): khong bay mo ta dai duoi o nhap. Dat mot bieu
// tuong ⓘ NGAY SAU NHAN cua o; di chuot vao (hoac focus ban phim) moi hien loi giai thich.
// Thong bao TRANG THAI va LOI van hien truc tiep — chi mo ta huong dan moi dung component nay.
//
// Bieu tuong ve bang SVG (net 1,6) thay cho chu "?": net o moi do phan giai va an theo mau
// chu (currentColor) nen tu doi theo che do sang/toi.
//
// Noi dung bong go y duoc truyen bang children nen giu duoc <strong>, <br>, lien ket... nhu cu.
import { useId, type CSSProperties, type ReactNode } from 'react';

export function GoiY({ children, style }: {
  children: ReactNode;
  /** Giu khoang cach/vi tri cua khoi mo ta cu (margin...) khi can. */
  style?: CSSProperties;
}): ReactNode {
  const id = useId();
  return (
    <span className="tro-giup" style={style}>
      <button
        type="button"
        className="tro-giup-nut"
        aria-label="Gợi ý"
        aria-describedby={id}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <circle cx="8" cy="8" r="6.7" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="8" cy="4.85" r="0.95" fill="currentColor" stroke="none" />
          <path d="M8 7.15v4.35" fill="none" stroke="currentColor" strokeWidth="1.7"
            strokeLinecap="round" />
        </svg>
      </button>
      <span className="tro-giup-bong" id={id} role="tooltip">
        {children}
      </span>
    </span>
  );
}
