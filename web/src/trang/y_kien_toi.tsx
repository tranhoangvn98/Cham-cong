// HOM THU Y KIEN CUA TOI (tab trong Khu vuc cua toi) — nhan vien gui gop y / phan anh /
// yeu cau / thac mac, theo doi phan hoi va trao doi den khi hoan tat. Y kien da gui cho
// du thao van ban cung nam o day (kem link mo lai ban du thao neu con dang lay y kien).
import { useState, type ReactNode } from 'react';
import { goi } from '../api.ts';
import {
  DangTai, HopLoi, HopTot, ThreadKhieuNai, Trong, dung_hanh_dong, dung_nap, ngay_gio,
  type TinNhanKN,
} from '../thanh_phan.tsx';
import { Chon, type TuyChonChon } from '../chon.tsx';

const NHAN_LOAI: Record<string, string> = {
  du_thao: 'Ý kiến dự thảo',
  gop_y: 'Góp ý',
  phan_anh: 'Phản ánh',
  yeu_cau: 'Yêu cầu',
  thac_mac: 'Thắc mắc',
};

const NHAN_TT: Record<string, string> = {
  moi: 'Chờ xử lý', dang_xem: 'Đang xử lý', da_dong: 'Đã hoàn tất',
};

interface HoThuToi {
  id: string;
  ma: string | null;
  loai: string;
  nhap_ai_id: string | null;
  tieu_de: string;
  noi_dung: string;
  trang_thai: string;
  tao_luc: string;
  dong_luc: string | null;
  tra_loi: TinNhanKN[];
}

const CAC_LOAI_GUI: { ma: string; nhan: string }[] = [
  { ma: 'gop_y', nhan: 'Góp ý' },
  { ma: 'phan_anh', nhan: 'Phản ánh' },
  { ma: 'yeu_cau', nhan: 'Yêu cầu' },
  { ma: 'thac_mac', nhan: 'Thắc mắc' },
];

export function YKienToi(): ReactNode {
  const ds = dung_nap<HoThuToi[]>('/api/toi/ho-thu-y-kien');
  const hd = dung_hanh_dong();
  const [loai, dat_loai] = useState('gop_y');
  const [tieu_de, dat_tieu_de] = useState('');
  const [noi_dung, dat_noi_dung] = useState('');
  const [mo, dat_mo] = useState<string | null>(null);

  const gui = (): void => {
    void hd.chay(
      () => goi('/api/toi/ho-thu-y-kien',
        { method: 'POST', body: { loai, tieu_de, noi_dung } }),
      'Đã gửi. Phòng Nhân sự sẽ tiếp nhận và phản hồi qua đây và qua email của bạn.',
    ).then((ok) => {
      if (ok) { dat_tieu_de(''); dat_noi_dung(''); ds.nap_lai(); }
    });
  };

  if (ds.dang_tai && ds.du_lieu === null) return <DangTai />;

  return (
    <>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}
      <HopTot chu={hd.tot} />

      <div className="the">
        <div className="canhan-muc-dau"><h3>Gửi ý kiến mới</h3></div>
        <div className="bo-loc">
          <div className="o-nhap">
            <label htmlFor="loai">Loại ý kiến</label>
            <Chon gia_tri={loai} dat_gia_tri={dat_loai}
              cac_tuy_chon={CAC_LOAI_GUI.map((c): TuyChonChon => ({ ma: c.ma, nhan: c.nhan }))}
              nhan="Chọn loại" />
          </div>
          <div className="o-nhap" style={{ flex: 1 }}>
            <label htmlFor="tieu_de">Tiêu đề</label>
            <input id="tieu_de" value={tieu_de} onChange={(e) => dat_tieu_de(e.target.value)}
              placeholder="Ví dụ: Đề xuất thêm quạt cho dây chuyền may" />
          </div>
        </div>
        <label htmlFor="noi_dung">Nội dung</label>
        <textarea id="noi_dung" rows={4} value={noi_dung}
          onChange={(e) => dat_noi_dung(e.target.value)}
          placeholder="Trình bày rõ ý kiến, băn khoăn hoặc yêu cầu của bạn…" />
        <div className="hang-nut" style={{ marginTop: 8 }}>
          <button disabled={hd.dang_chay || tieu_de.trim().length < 3
            || noi_dung.trim().length < 1} onClick={gui}>
            {hd.dang_chay ? 'Đang gửi…' : 'Gửi ý kiến'}
          </button>
        </div>
      </div>

      {ds.du_lieu === null ? null : ds.du_lieu.length === 0 ? (
        <Trong tieu_de="Bạn chưa gửi ý kiến nào"
          mo_ta="Mọi góp ý, phản ánh, yêu cầu đều được Phòng Nhân sự tiếp nhận và phản hồi." />
      ) : (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ds.du_lieu.map((h) => (
            <div className="the" key={h.id}>
              <div className="canhan-muc-dau">
                <h4>
                  {h.tieu_de}
                  <span className="mo-ta"> · {NHAN_LOAI[h.loai] ?? h.loai}</span>
                </h4>
                <span className={`nhan ${h.trang_thai === 'da_dong' ? 'nhan-tot'
                  : h.trang_thai === 'dang_xem' ? 'nhan-canh-bao' : 'nhan-xau'}`}>
                  {NHAN_TT[h.trang_thai] ?? h.trang_thai}
                </span>
              </div>
              <p className="mo-ta">
                {h.ma ?? ''} · {ngay_gio(h.tao_luc)}
                {h.nhap_ai_id !== null && (
                  <> · <a href={`/gop-y-du-thao?van_ban_id=${h.nhap_ai_id}`}>mở lại dự thảo</a></>
                )}
              </p>
              {mo === h.id ? (
                <>
                  <ThreadKhieuNai noi_dung={h.noi_dung} tao_luc={h.tao_luc} tra_loi={h.tra_loi} />
                  {h.trang_thai !== 'da_dong' && (
                    <TraLoi nho={h.id} khi_xong={ds.nap_lai} />
                  )}
                  <button className="nut-phang nut-nho" onClick={() => dat_mo(null)}>Thu gọn</button>
                </>
              ) : (
                <button className="nut-phang nut-nho" onClick={() => dat_mo(h.id)}>
                  Xem trao đổi ({h.tra_loi.length})
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function TraLoi({ nho, khi_xong }: { nho: string; khi_xong: () => void }): ReactNode {
  const hd = dung_hanh_dong();
  const [noi_dung, dat_noi_dung] = useState('');

  const gui = (): void => {
    void hd.chay(
      () => goi(`/api/toi/ho-thu-y-kien/${nho}/tra-loi`,
        { method: 'POST', body: { noi_dung } }),
      'Đã gửi trả lời.',
    ).then((ok) => { if (ok) { dat_noi_dung(''); khi_xong(); } });
  };

  return (
    <div style={{ marginTop: 6 }}>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}
      <textarea value={noi_dung} onChange={(e) => dat_noi_dung(e.target.value)} rows={2}
        placeholder="Trao đổi thêm với Phòng Nhân sự…" />
      <div className="hang-nut" style={{ marginTop: 6 }}>
        <button className="nut-phang" disabled={hd.dang_chay || noi_dung.trim().length < 1}
          onClick={gui}>Gửi trả lời</button>
      </div>
    </div>
  );
}
