// Gan nhan cot cho bang de man hep hien thi dang THE thay vi cuon ngang.
//
// VI SAO CAN: tren dien thoai (<= 640px) bang du lieu 5-16 cot khong the vua khung. Truoc
// day bang phai cuon ngang trong `.vo-bang` — nguoi dung chi thay 2-3 cot dau, va thanh cuon
// ngang chiem cho. Cach doc dung tren man hep la moi DONG thanh mot khoi: ten cot (lay tu
// `thead`) nam ben trai, gia tri ben phai.
//
// CSS khong doc duoc chu trong `<th>` de lam nhan, nen o day gan `data-nhan` cho tung `<td>`
// roi CSS ve bang `td::before { content: attr(data-nhan) }` (xem kieu.css, khoi "DIEN THOAI").
//
// Bang KHONG co thead (bang thuoc tinh kieu "nhan | gia tri | nut") nhan lop `bang-khong-dau`
// de CSS xep doc: nhan mot dong, gia tri ngay duoi.
//
// Bang trong khung xem truoc tep (CSV, docx) CO Y bo qua: do la du lieu tho, nguoi dung can
// thay dung dang luoi nhu tep goc.
const BO_QUA = '.khung-xem-tep, .o-xem-docx';

let dang_hen = 0;

/** Gan lai nhan cho moi bang chua duoc danh dau. Re: chi doc thead + thuoc tinh o. */
function gan_nhan(): void {
  for (const table of document.querySelectorAll<HTMLTableElement>('table')) {
    if (table.closest(BO_QUA) !== null) continue;
    const thead = table.tHead;
    if (thead === null) {
      // Bang thuoc tinh: khong co tieu de cot -> CSS xep doc tung o.
      table.classList.add('bang-khong-dau');
      continue;
    }
    const hang_dau = thead.rows[0];
    if (hang_dau === undefined) {
      table.classList.add('bang-khong-dau');
      continue;
    }
    const tieu_de = [...hang_dau.cells].map((o) => (o.textContent ?? '').trim());
    const dong = [...table.tBodies].flatMap((tb) => [...tb.rows]);
    // Bang gop o (colspan) lam lech chi so cot -> KHONG danh dau; giu cuon ngang de khong
    // gan nhan sai cot (sai nhan con te hon khong co nhan).
    if (dong.length === 0 || !dong.every((tr) => tr.cells.length === tieu_de.length)) continue;
    table.classList.add('bang-di-dong');
    for (const tr of dong) {
      [...tr.cells].forEach((o, i) => {
        const td = o as HTMLElement;
        const nhan = tieu_de[i] ?? '';
        if (td.dataset.nhan !== nhan) td.dataset.nhan = nhan;
      });
    }
  }
}

function hen_lai(): void {
  if (dang_hen !== 0) return;
  dang_hen = window.requestAnimationFrame(() => {
    dang_hen = 0;
    gan_nhan();
  });
}

/**
 * Bat dau theo doi: chay ngay mot lan, roi moi khi React render them/sua bang (du lieu ve,
 * doi trang, doi thang...). Chi mot observer cho ca ung dung.
 */
export function bat_bang_di_dong(): void {
  gan_nhan();
  new MutationObserver(hen_lai).observe(document.body, { childList: true, subtree: true });
}
