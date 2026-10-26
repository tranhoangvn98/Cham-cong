// Nut "?" + bong goi y dung chung cho MOI mo ta tren giao dien.
//
// Quy uoc (xem tai_lieu/THIET-KE.md): khong bay mo ta dai duoi o nhap. Dat mot nut "?" canh
// nhan/o; di chuot vao (hoac focus ban phim) moi hien loi giai thich. Thong bao TRANG THAI va
// LOI van hien truc tiep — chi mo ta huong dan moi dung component nay.
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
        ?
      </button>
      <span className="tro-giup-bong" id={id} role="tooltip">
        {children}
      </span>
    </span>
  );
}
