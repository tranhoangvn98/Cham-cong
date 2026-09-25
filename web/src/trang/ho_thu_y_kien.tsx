// Trang HOM THU Y KIEN (quan tri): noi tiep nhan TAT CA phan anh / yeu cau / gop y / thac mac
// cua nhan su, va ca y kien cho ban du thao van ban AI. Khac voi don tu khieu nai: day la kenh
// lang nghe + giai dap, hoi thoai hai chieu cho den khi nhan su DONG ho thu.
import { useEffect, useState, type ReactNode } from 'react';
import { goi, chi_xem_quan_tri } from '../api.ts';
import { lay_muc_tieu_bao, nghe_muc_tieu_bao } from '../dieu_huong_sau.ts';
import {
  DangTai, HopLoi, HopThoai, ThreadKhieuNai, Trong, dung_hanh_dong, dung_nap, ngay_gio,
  type TinNhanKN,
} from '../thanh_phan.tsx';
import { dung_phan_trang } from '../phan_trang.tsx';
import { Chon, type TuyChonChon } from '../chon.tsx';

const NHAN_LOAI: Record<string, string> = {
  du_thao: 'Ý kiến dự thảo',
  gop_y: 'Góp ý',
  phan_anh: 'Phản ánh',
  yeu_cau: 'Yêu cầu',
  thac_mac: 'Thắc mắc',
};

const NHAN_TT: Record<string, { ten: string; lop: string }> = {
  moi: { ten: 'Chờ xử lý', lop: 'nhan-xau' },
  dang_xem: { ten: 'Đang xử lý', lop: 'nhan-canh-bao' },
  da_dong: { ten: 'Đã hoàn tất', lop: 'nhan-tot' },
};

interface Dong {
  id: string;
  ma: string | null;
  loai: string;
  tieu_de: string;
  trang_thai: string;
  tao_luc: string;
  dong_luc: string | null;
  nhap_ai_id: string | null;
  ma_van_ban: string | null;
  ma_nv: string;
  ho_ten: string;
  phong_ban: string | null;
  so_tra_loi: number;
}

interface ChiTiet extends Dong {
  noi_dung: string;
  tra_loi: TinNhanKN[];
  van_ban: { ma: string; trang_thai: string } | null;
}

export function TrangHoThuYKien(): ReactNode {
  const [loc_loai, dat_loc_loai] = useState('');
  const [loc_tt, dat_loc_tt] = useState('');
  const [dang, dat_dang] = useState<string | null>(() => lay_muc_tieu_bao('ho-thu-y-kien'));

  useEffect(() => nghe_muc_tieu_bao(() => {
    const id = lay_muc_tieu_bao('ho-thu-y-kien');
    if (id !== null) dat_dang(id);
  }), []);

  const tham = new URLSearchParams();
  if (loc_loai !== '') tham.set('loai', loc_loai);
  if (loc_tt !== '') tham.set('trang_thai', loc_tt);
  const hoi = tham.toString() === '' ? '' : `?${tham.toString()}`;
  const ds = dung_nap<Dong[]>(`/api/ho-thu-y-kien${hoi}`, [loc_loai, loc_tt]);

  const { ds_xem, bo_phan_trang } = dung_phan_trang(ds.du_lieu ?? []);

  return (
    <>
      <div className="dau-trang">
        <p className="mo-ta">
          Nơi tiếp nhận mọi phản ánh, yêu cầu, góp ý và thắc mắc của người lao động — giải đáp
          thắc mắc, lắng nghe góp ý để sớm có điều chỉnh phù hợp hơn. Ý kiến cho dự thảo văn bản
          cũng tập hợp tại đây. Hàng <strong>Chờ xử lý / Đang xử lý</strong> nằm trên đầu.
        </p>
      </div>

      <div className="bo-loc">
        <div className="o-nhap">
          <label htmlFor="loai">Loại</label>
          <Chon gia_tri={loc_loai} dat_gia_tri={dat_loc_loai}
            cac_tuy_chon={Object.entries(NHAN_LOAI).map(([ma, nhan]): TuyChonChon => ({
              ma, nhan,
            }))}
            rong="Tất cả" nhan="Lọc theo loại" />
        </div>
        <div className="o-nhap">
          <label htmlFor="tt">Trạng thái</label>
          <Chon gia_tri={loc_tt} dat_gia_tri={dat_loc_tt}
            cac_tuy_chon={Object.entries(NHAN_TT).map(([ma, t]): TuyChonChon => ({
              ma, nhan: t.ten,
            }))}
            rong="Tất cả" nhan="Lọc theo trạng thái" />
        </div>
      </div>

      {ds.dang_tai ? <DangTai /> : ds.loi !== null ? <HopLoi loi={ds.loi} />
        : ds.du_lieu === null || ds.du_lieu.length === 0 ? (
          <Trong tieu_de="Hòm thư chưa có ý kiến nào"
            mo_ta="Khi nhân viên gửi góp ý, phản ánh hoặc ý kiến dự thảo, chúng sẽ hiện ở đây." />
        ) : (
          <div className="the the-mong">
            <div className="vo-bang">
              <table>
                <thead>
                  <tr>
                    <th>Mã</th><th>Nhân viên</th><th>Phòng ban</th><th>Loại</th><th>Tiêu đề</th>
                    <th>Trao đổi</th><th>Ngày gửi</th><th>Trạng thái</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {ds_xem.map((d) => (
                    <tr key={d.id}>
                      <td className="so mo-ma">{d.ma ?? '—'}</td>
                      <td>
                        {d.ho_ten}
                        <span className="mo-ma"> {d.ma_nv}</span>
                      </td>
                      <td>{d.phong_ban ?? '—'}</td>
                      <td className="khong-ngat">
                        {NHAN_LOAI[d.loai] ?? d.loai}
                        {d.ma_van_ban !== null && <span className="mo-ma"> · {d.ma_van_ban}</span>}
                      </td>
                      <td className="khong-ngat" style={{ maxWidth: 320 }}>{d.tieu_de}</td>
                      <td className="canh-phai">{d.so_tra_loi}</td>
                      <td className="khong-ngat mo-ma">{ngay_gio(d.tao_luc)}</td>
                      <td className="khong-ngat">
                        <span className={`nhan ${NHAN_TT[d.trang_thai]?.lop ?? 'nhan-mo'}`}>
                          {NHAN_TT[d.trang_thai]?.ten ?? d.trang_thai}
                        </span>
                      </td>
                      <td className="canh-phai">
                        <button className="nut nut-nho" onClick={() => dat_dang(d.id)}>Xem</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {bo_phan_trang}
            </div>
          </div>
        )}

      {dang !== null && (
        <HopThoaiChiTiet id={dang} khi_dong={() => dat_dang(null)} khi_xong={ds.nap_lai} />
      )}
    </>
  );
}

function HopThoaiChiTiet(
  { id, khi_dong, khi_xong }: { id: string; khi_dong: () => void; khi_xong: () => void },
): ReactNode {
  const chi = dung_nap<ChiTiet>(`/api/ho-thu-y-kien/${id}`, [id]);
  const hd = dung_hanh_dong();
  const [tra_loi_nd, dat_tra_loi_nd] = useState('');
  const chi_xem = chi_xem_quan_tri();

  if (chi.dang_tai) return <HopThoai tieu_de="Hòm thư ý kiến" khi_dong={khi_dong}><DangTai /></HopThoai>;
  const d = chi.du_lieu;
  if (chi.loi !== null || d === null) {
    return <HopThoai tieu_de="Hòm thư ý kiến" khi_dong={khi_dong}>
      <HopLoi loi={chi.loi ?? 'Không tải được chi tiết.'} />
    </HopThoai>;
  }
  const dong = d.trang_thai === 'da_dong';

  const gui = (): void => {
    void hd.chay(
      () => goi(`/api/ho-thu-y-kien/${d.id}/tra-loi`, { method: 'POST', body: { noi_dung: tra_loi_nd } }),
      'Đã gửi trả lời.',
    ).then((ok) => { if (ok) { dat_tra_loi_nd(''); khi_xong(); khi_dong(); } });
  };
  const dong_lai = (): void => {
    void hd.chay(
      () => goi(`/api/ho-thu-y-kien/${d.id}/dong`, { method: 'POST' }),
      'Đã đóng hòm thư — người lao động đã nhận thông báo hoàn tất.',
    ).then((ok) => { if (ok) { khi_xong(); khi_dong(); } });
  };

  return (
    <HopThoai tieu_de={`Hòm thư ${d.ma ?? ''} — ${d.ho_ten}`} khi_dong={khi_dong} rong>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}

      <div className="ho-so-chi-so">
        <div className="o-so">
          <div className="o-so-nhan">Loại</div>
          <div className="o-so-gia-tri" style={{ fontSize: 15 }}>
            {NHAN_LOAI[d.loai] ?? d.loai}
          </div>
          <div className="o-so-phu">
            {d.ma_nv}{d.phong_ban !== null ? ` · ${d.phong_ban}` : ''}
            {d.van_ban !== null ? ` · văn bản ${d.van_ban.ma}` : ''}
          </div>
        </div>
        <div className="o-so">
          <div className="o-so-nhan">Trạng thái</div>
          <div className="o-so-gia-tri" style={{ fontSize: 15 }}>
            <span className={`nhan ${NHAN_TT[d.trang_thai]?.lop ?? 'nhan-mo'}`}>
              {NHAN_TT[d.trang_thai]?.ten ?? d.trang_thai}
            </span>
          </div>
        </div>
      </div>

      <h3>{d.tieu_de}</h3>
      <ThreadKhieuNai noi_dung={d.noi_dung} tao_luc={d.tao_luc} tra_loi={d.tra_loi} la_admin />

      {!dong && !chi_xem && (
        <div style={{ marginTop: 4, marginBottom: 8 }}>
          <textarea value={tra_loi_nd} onChange={(e) => dat_tra_loi_nd(e.target.value)} rows={2}
            placeholder="Trả lời / trao đổi với người lao động…" />
          <div className="hang-nut" style={{ marginTop: 6 }}>
            <button className="nut-phang" disabled={hd.dang_chay || tra_loi_nd.trim().length < 1}
              onClick={gui}>Gửi trả lời</button>
            <button disabled={hd.dang_chay} onClick={dong_lai}>Đóng hòm thư (hoàn tất)</button>
          </div>
        </div>
      )}

      {dong && (
        <div className="hop-thong-bao hop-tot">
          Đã hoàn tất{d.dong_luc !== null ? ` · đóng lúc ${ngay_gio(d.dong_luc)}` : ''}.
        </div>
      )}
      {chi_xem && (
        <div className="hop-thong-bao hop-tin">
          Bạn đang ở chế độ <strong>chỉ xem</strong>. Việc trả lời do Nhân sự / Admin thực hiện.
        </div>
      )}
    </HopThoai>
  );
}
