// Popup THONG BAO toan cong ty: khi mo app, neu co thong bao 'popup' con hieu luc va CHUA doc
// thi hien hop thoai bat buoc doc. Bam "Da doc & hieu" (hoac nhap giai trinh neu bat buoc) ->
// xac nhan -> sang thong bao popup ke tiep, het thi thoi. Escape/bam ra chi tam an, lan mo app
// sau van hien lai (vi chua danh dau da doc). Tai dung endpoint xac-nhan san co.
import { useEffect, useState, type ReactNode } from 'react';
import { goi } from '../api.ts';
import { HopLoi, HopThoai, ngay_gio } from '../thanh_phan.tsx';
import { dung_chuoi, type ChuoiKhoa } from '../chuoi/chi_muc.tsx';

interface PopupTB {
  id: string;
  ma: string | null;
  tieu_de: string;
  noi_dung: string;
  muc_do: string;
  can_giai_trinh: boolean;
  tao_luc: string;
}

const KHOA_MUC_DO: Record<string, { khoa: ChuoiKhoa; lop: string }> = {
  khan: { khoa: 'pp_khan', lop: 'nhan-xau' },
  quan_trong: { khoa: 'tb_quan_trong', lop: 'nhan-canh-bao' },
  thuong: { khoa: 'menu_thong_bao', lop: 'nhan-mo' },
};

export function PopupThongBao(): ReactNode {
  const [ds, dat_ds] = useState<PopupTB[]>([]);
  const [gt, dat_gt] = useState('');
  const [dang, dat_dang] = useState(false);
  const [loi, dat_loi] = useState<unknown>(null);
  const { tra } = dung_chuoi();

  useEffect(() => {
    void goi<PopupTB[]>('/api/toi/thong-bao/popup')
      .then((kq) => dat_ds(Array.isArray(kq) ? kq : []))
      .catch(() => { /* popup la phu — loi (vd chua deploy) thi im lang */ });
  }, []);

  const tb = ds[0];
  if (tb === undefined) return null;
  const md = KHOA_MUC_DO[tb.muc_do] ?? { khoa: 'menu_thong_bao' as ChuoiKhoa, lop: 'nhan-mo' };

  const sang_ke_tiep = (): void => { dat_ds((cu) => cu.slice(1)); dat_gt(''); dat_loi(null); };

  const xac_nhan = (): void => {
    if (tb.can_giai_trinh && gt.trim().length < 5) {
      dat_loi(new Error(tra('pp_yeu_cau_nhap')));
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
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <span className={`nhan ${md.lop}`}>{tra(md.khoa)}</span>
        {tb.ma !== null && (
          <span className="mo-ma" style={{ whiteSpace: 'normal', overflowWrap: 'anywhere' }}>{tb.ma}</span>
        )}
        <span className="mo-ta">{ngay_gio(tb.tao_luc)}</span>
      </div>
      <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{tb.noi_dung}</div>

      <HopLoi loi={loi} />

      {tb.can_giai_trinh && (
        <label className="truong" style={{ marginTop: 12 }}>
          <span>{tra('pp_giai_trinh_bat_buoc')}</span>
          <textarea rows={3} value={gt} onChange={(e) => dat_gt(e.target.value)}
            placeholder={tra('pp_nhap_giai_trinh')} />
        </label>
      )}

      <div className="hang-nut" style={{ marginTop: 12 }}>
        <button onClick={xac_nhan}
          disabled={dang || (tb.can_giai_trinh && gt.trim().length < 5)}>
          {dang ? tra('tb_dang_luu') : tb.can_giai_trinh ? tra('pp_gui_gt_xac_nhan') : tra('tb_da_doc_hieu')}
        </button>
        {ds.length > 1 && <span className="mo-ta">{tra('pp_con_x_tb', { n: ds.length - 1 })}</span>}
      </div>
    </HopThoai>
  );
}
