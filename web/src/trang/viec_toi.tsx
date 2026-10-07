// Cong viec cua toi — giao dien CA NHAN (tab trong Khu vuc cua toi).
//
// Tra loi cau hoi "minh dang con viec gi": nhom Qua han / Den han / Dang lam / Moi /
// Cho duyet / Da xong, so viec con lai, va che do xem Lich (gantt ca nhan) — dung chung
// ManGantt + HopThoaiChiTiet cua trang quan tri.
import { useState, type ReactNode } from 'react';
import { DangTai, HopLoi, Trong, dung_nap, ngay_viet } from '../thanh_phan.tsx';
import { HopThoaiChiTiet, ManGantt, type DongViec } from './viec.tsx';
import { dung_chuoi } from '../chuoi/chi_muc.tsx';

/** Ngay 'YYYY-MM-DD' cong them so ngay. */
function cong_ngay(ngay: string, so_ngay: number): string {
  const d = new Date(`${ngay}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + so_ngay);
  return d.toISOString().slice(0, 10);
}

interface Khoi {
  ma: string;
  ten: string;
  lop: string;
  viec: DongViec[];
}

export function ViecToi(): ReactNode {
  const [mo, dat_mo] = useState<string | null>(null);
  const [xem, dat_xem] = useState<'danh_sach' | 'lich'>('danh_sach');
  const { tra } = dung_chuoi();
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<{ danh_sach: DongViec[]; tong: number }>(
    '/api/viec/toi', [],
  );

  if (dang_tai) return <DangTai />;
  if (loi !== null) return <HopLoi loi={loi} />;

  const ds = du_lieu?.danh_sach ?? [];
  const hom_nay_str = new Date().toISOString().slice(0, 10);
  const ngay_gan = cong_ngay(hom_nay_str, 2);
  const bay_gio = new Date().toISOString();

  const con_viec = ds.filter((v) =>
    v.trang_thai !== 'hoan_thanh' && v.trang_thai !== 'khong_hoan_thanh' && v.trang_thai !== 'huy');

  const qua_han = ds.filter((v) => v.han_moc !== null && v.han_moc < bay_gio
    && (v.trang_thai === 'moi' || v.trang_thai === 'dang_lam'));
  const den_han = ds.filter((v) => !qua_han.includes(v)
    && v.han !== null && v.han <= ngay_gan
    && (v.trang_thai === 'moi' || v.trang_thai === 'dang_lam'));
  const dang_lam = ds.filter((v) => v.trang_thai === 'dang_lam'
    && !qua_han.includes(v) && !den_han.includes(v));
  const cho_duyet = ds.filter((v) => v.trang_thai === 'cho_duyet');
  const moi = ds.filter((v) => v.trang_thai === 'moi'
    && !qua_han.includes(v) && !den_han.includes(v));
  const da_xong = ds.filter((v) => v.trang_thai === 'hoan_thanh'
    || v.trang_thai === 'khong_hoan_thanh' || v.trang_thai === 'huy');

  const cac_khoi: Khoi[] = [
    { ma: 'qua_han', ten: tra('vt_qua_han', { n: qua_han.length }), lop: 'vt-khoi vt-qua-han', viec: qua_han },
    { ma: 'den_han', ten: tra('vt_den_han', { n: den_han.length }), lop: 'vt-khoi vt-den-han', viec: den_han },
    { ma: 'dang_lam', ten: tra('vt_dang_lam', { n: dang_lam.length }), lop: 'vt-khoi', viec: dang_lam },
    { ma: 'moi', ten: tra('vt_moi_giao', { n: moi.length }), lop: 'vt-khoi', viec: moi },
    { ma: 'cho_duyet', ten: tra('vt_cho_duyet', { n: cho_duyet.length }), lop: 'vt-khoi', viec: cho_duyet },
    { ma: 'da_xong', ten: tra('vt_da_xong', { n: da_xong.length }), lop: 'vt-khoi vt-xong', viec: da_xong },
  ];

  return (
    <div className="vt-trang">
      <div className="vt-dau">
        <div>
          <div className="vt-tua">{tra('cn_ten_man_viec')}</div>
          <div className="vt-phu">
            {con_viec.length === 0
              ? tra('vt_khong_con_viec')
              : tra('vt_con_viec_x', { n: con_viec.length })}
          </div>
        </div>
        <div className="vt-chuyen">
          <button
            className={xem === 'danh_sach' ? 'vt-nut vt-nut-chon' : 'vt-nut'}
            onClick={() => dat_xem('danh_sach')}
          >
            {tra('vt_danh_sach')}
          </button>
          <button
            className={xem === 'lich' ? 'vt-nut vt-nut-chon' : 'vt-nut'}
            onClick={() => dat_xem('lich')}
          >
            {tra('vt_lich_gantt')}
          </button>
        </div>
      </div>

      {xem === 'lich' ? <ManGantt /> : ds.length === 0 ? (
        <Trong tieu_de={tra('vt_chua_co_cong_viec')}
          mo_ta={tra('vt_khi_giao_viec')} />
      ) : (
        <div className="vt-khoi-tat">
          {cac_khoi.map((k) => (
            <div key={k.ma} className={k.lop}>
              <div className="vt-khoi-ten">{k.ten}</div>
              {k.viec.length === 0 ? (
                <div className="vt-rong">{tra('vt_khong_co')}</div>
              ) : k.viec.map((v) => (
                <button key={v.id} className="vt-dong" onClick={() => dat_mo(v.id)}>
                  <span className={`vt-tich ${v.trang_thai === 'hoan_thanh' ? 'vt-tich-xong' : ''}`} />
                  <span className="vt-viec-ten">{v.tieu_de}</span>
                  {v.nguon !== 'tu_tao' && (
                    <span className={`vt-nguon vt-nguon-${v.nguon}`}>
                      {v.nguon === 'giam_doc' ? 'GĐ' : v.nguon === 'he_thong' ? 'HT'
                        : v.nguon === 'truong_phong' ? 'TP' : v.nguon === 'lien_phong' ? 'LP' : 'H'}
                    </span>
                  )}
                  <span className="vt-han">
                    {v.han === null ? '' : tra('vt_han_x', { n: ngay_viet(v.han), g: v.han_gio })}
                  </span>
                  {v.so_hanh_dong > 0 && (
                    <span className="vt-buoc">
                      {tra('vt_buoc_xy', { x: v.so_hanh_dong_xong, y: v.so_hanh_dong })}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {mo !== null && (
        <HopThoaiChiTiet id={mo} khi_dong={() => { dat_mo(null); nap_lai(); }} />
      )}
    </div>
  );
}
