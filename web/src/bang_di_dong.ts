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

/**
 * Nhan cua tung cot, doc tu `thead` va ho tro TIEU DE GOP O (colspan/rowspan).
 *
 * Bang cong thang co hai hang tieu de: cac cot co dinh (Ma NV, Ho ten...) rowspan=2, con
 * nhom "Di muon" colspan=4 voi 4 cot con o hang duoi. Doc tho hang dau se ra 10 nhan cho
 * 13 cot du lieu -> lech nhan. O day trai tieu de ra luoi theo dung vi tri cot, roi noi cac
 * cap cha-con bang dau "·" (vd "Đi muộn · Số lần").
 */
function nhan_cot(thead: HTMLTableSectionElement): string[] | null {
  const hang = [...thead.rows];
  if (hang.length === 0) return null;
  const ten: string[][] = hang.map(() => []);
  const da_chiemp: Set<number>[] = hang.map(() => new Set<number>());
  let so_cot = 0;
  for (let h = 0; h < hang.length; h++) {
    const dong = hang[h];
    if (dong === undefined) continue;
    let cot = 0;
    for (const o of dong.cells) {
      while (da_chiemp[h]?.has(cot) === true) cot++;
      const chu = (o.textContent ?? '').trim();
      const so_hang = Math.max(1, o.rowSpan);
      const so_cot_o = Math.max(1, o.colSpan);
      for (let r = h; r < Math.min(hang.length, h + so_hang); r++) {
        for (let k = cot; k < cot + so_cot_o; k++) {
          da_chiemp[r]?.add(k);
          // Chi hang dau cua o gop mang chu; cac hang sau la o trong (nhan cha da co).
          (ten[r] ?? [])[k] = r === h ? chu : '';
          so_cot = Math.max(so_cot, k + 1);
        }
      }
      cot += so_cot_o;
    }
  }
  if (so_cot === 0) return null;
  const nhan: string[] = [];
  for (let c = 0; c < so_cot; c++) {
    const phan: string[] = [];
    for (let h = 0; h < hang.length; h++) {
      const chu = (ten[h]?.[c] ?? '').trim();
      if (chu !== '' && phan[phan.length - 1] !== chu) phan.push(chu);
    }
    nhan.push(phan.join(' · '));
  }
  return nhan;
}

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
    const tieu_de = nhan_cot(thead);
    if (tieu_de === null) {
      table.classList.add('bang-khong-dau');
      continue;
    }
    const dong = [...table.tBodies].flatMap((tb) => [...tb.rows]);
    // Van lech so cot (o gop trong THAN bang) -> khong danh dau; giu cuon ngang con hon
    // gan nhan sai cot.
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
