// Popup THONG BAO toan cong ty: khi mo app, neu co thong bao 'popup' con hieu luc va CHUA doc
// thi hien hop thoai bat buoc doc. Bam "Da doc & hieu" (hoac nhap giai trinh neu bat buoc) ->
// xac nhan -> sang thong bao popup ke tiep, het thi thoi. Escape/bam ra chi tam an, lan mo app
// sau van hien lai (vi chua danh dau da doc). Tai dung endpoint xac-nhan san co.
import { useEffect, useState, type ReactNode } from 'react';
import { goi } from '../api.ts';
import { HopLoi, HopThoai, ngay_gio } from '../thanh_phan.tsx';

interface PopupTB {
  id: string;
  ma: string | null;
  tieu_de: string;
  noi_dung: string;
  muc_do: string;
  can_giai_trinh: boolean;
  tao_luc: string;
}

const NHAN_MUC_DO: Record<string, { chu: string; lop: string }> = {
  khan: { chu: 'KHẨN', lop: 'nhan-xau' },
  quan_trong: { chu: 'Quan trọng', lop: 'nhan-canh-bao' },
  thuong: { chu: 'Thông báo', lop: 'nhan-mo' },
};

export function PopupThongBao(): ReactNode {
  const [ds, dat_ds] = useState<PopupTB[]>([]);
  const [gt, dat_gt] = useState('');
  const [dang, dat_dang] = useState(false);
  const [loi, dat_loi] = useState<unknown>(null);

  useEffect(() => {
    void goi<PopupTB[]>('/api/toi/thong-bao/popup')
      .then((kq) => dat_ds(Array.isArray(kq) ? kq : []))
      .catch(() => { /* popup la phu — loi (vd chua deploy) thi im lang */ });
  }, []);

  const tb = ds[0];
  if (tb === undefined) return null;
  const md = NHAN_MUC_DO[tb.muc_do] ?? { chu: 'Thông báo', lop: 'nhan-mo' };

  const sang_ke_tiep = (): void => { dat_ds((cu) => cu.slice(1)); dat_gt(''); dat_loi(null); };

  const xac_nhan = (): void => {
    if (tb.can_giai_trinh && gt.trim().length < 5) {
      dat_loi(new Error('Thông báo này yêu cầu bạn nhập giải trình (tối thiểu 5 ký tự).'));
      return;
    }
    dat_dang(true);
    void goi(`/api/toi/thong-bao/${tb.id}/xac-nhan`, {
      method: 'POST',
      body: tb.can_giai_trinh ? { giai_trinh: gt } : {},
    })
      .then(() => { dat_dang(false); sang_ke_tiep(); })
      .catch((e) => { dat_dang(false); dat_loi(e); });
  };

  return (
    <HopThoai tieu_de={`📢 ${tb.tieu_de}`} khi_dong={sang_ke_tiep} rong>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <span className={`nhan ${md.lop}`}>{md.chu}</span>
        {tb.ma !== null && <span className="mo-ma">{tb.ma}</span>}
        <span className="mo-ta">{ngay_gio(tb.tao_luc)}</span>
      </div>
      <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{tb.noi_dung}</div>

      <HopLoi loi={loi} />

      {tb.can_giai_trinh && (
        <label className="truong" style={{ marginTop: 12 }}>
          <span>Giải trình (bắt buộc)</span>
          <textarea rows={3} value={gt} onChange={(e) => dat_gt(e.target.value)}
            placeholder="Nhập giải trình của bạn…" />
        </label>
      )}

      <div className="hang-nut" style={{ marginTop: 12 }}>
        <button onClick={xac_nhan}
          disabled={dang || (tb.can_giai_trinh && gt.trim().length < 5)}>
          {dang ? 'Đang lưu…' : tb.can_giai_trinh ? 'Gửi giải trình & xác nhận' : 'Đã đọc & hiểu'}
        </button>
        {ds.length > 1 && <span className="mo-ta">Còn {ds.length - 1} thông báo nữa</span>}
      </div>
    </HopThoai>
  );
}
