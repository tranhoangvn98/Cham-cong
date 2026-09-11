// Quan ly KHIEU NAI PHIEU LUONG: nguoi lao dong khong dong y voi mot phieu luong da duyet/da tra
// thi gui khieu nai; Nhan su/Ke toan tiep nhan, tra loi, va neu dung thi mo lai ky luong sua tay.
//
// KHONG tu sua luong o day — day la kenh minh bach & phan hoi, con sua so lieu van theo quy trinh
// ky luong (mo chot -> sua -> duyet lai).
import { useState, type ReactNode } from 'react';
import { goi, chi_xem_quan_tri, la_admin } from '../api.ts';
import { LienKet } from '../dinh_tuyen.tsx';
import {
  AnhCoToken, DangTai, HopLoi, HopThoai, ThreadKhieuNai, Trong, dung_hanh_dong, dung_nap, ngay_gio,
  type TinNhanKN,
} from '../thanh_phan.tsx';

const NHAN_TT: Record<string, { ten: string; lop: string }> = {
  moi: { ten: 'Mới', lop: 'nhan-xau' },
  dang_xem: { ten: 'Đang xem xét', lop: 'nhan-canh-bao' },
  chap_nhan: { ten: 'Đã chấp nhận', lop: 'nhan-tot' },
  tu_choi: { ten: 'Đã từ chối', lop: 'nhan-mo' },
};

interface Dong {
  id: string;
  ma: string | null;
  noi_dung: string;
  trang_thai: string;
  phan_hoi: string | null;
  tao_luc: string;
  xu_ly_luc: string | null;
  nhan_vien_id: string;
  ma_nv: string;
  ho_ten: string;
  phong_ban: string | null;
  thang: string;
  thuc_linh: number;
  anh: { id: string; ten: string }[];
  tra_loi: TinNhanKN[];
}

const tien = (v: unknown): string => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString('vi-VN', { maximumFractionDigits: 0 }) : '0';
};
const thang_viet = (t: string): string => {
  const [n, m] = t.split('-');
  return `${m}/${n}`;
};

export function TrangKhieuNaiLuong(): ReactNode {
  const [loc, dat_loc] = useState('');
  const [dang, dat_dang] = useState<Dong | null>(null);

  const url = `/api/khieu-nai-luong${loc === '' ? '' : `?trang_thai=${loc}`}`;
  const ds = dung_nap<Dong[]>(url, [loc]);

  return (
    <>
      <div className="dau-trang">
        <p className="mo-ta">
          Khiếu nại của người lao động về phiếu lương đã duyệt/đã trả. Tiếp nhận, trả lời; nếu đúng
          thì mở lại kỳ lương và sửa tay theo quy trình. Hàng <strong>Mới / Đang xem xét</strong> nằm trên đầu.
        </p>
      </div>

      <div className="bo-loc">
        <div className="o-nhap">
          <label htmlFor="tt">Trạng thái</label>
          <select id="tt" value={loc} onChange={(e) => dat_loc(e.target.value)}>
            <option value="">Tất cả</option>
            <option value="moi">Mới</option>
            <option value="dang_xem">Đang xem xét</option>
            <option value="chap_nhan">Đã chấp nhận</option>
            <option value="tu_choi">Đã từ chối</option>
          </select>
        </div>
      </div>

      {ds.dang_tai ? <DangTai /> : ds.loi !== null ? <HopLoi loi={ds.loi} />
        : ds.du_lieu === null || ds.du_lieu.length === 0 ? (
          <Trong tieu_de="Chưa có khiếu nại lương"
            mo_ta="Khi nhân viên gửi khiếu nại về phiếu lương, chúng sẽ hiện ở đây." />
        ) : (
          <div className="the the-mong">
            <div className="vo-bang">
              <table className="bang-neo-cot-dau">
                <thead>
                  <tr>
                    <th>Mã</th><th>Nhân viên</th><th>Phòng ban</th><th>Kỳ</th>
                    <th className="canh-phai">Thực nhận</th><th>Ngày gửi</th><th>Trạng thái</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {ds.du_lieu.map((d) => (
                    <tr key={d.id}>
                      <td className="so mo-ma">{d.ma ?? '—'}</td>
                      <td>
                        <LienKet den={`/nhan-vien/${d.nhan_vien_id}`}>{d.ho_ten}</LienKet>
                        <span className="mo-ma"> {d.ma_nv}</span>
                      </td>
                      <td>{d.phong_ban ?? '—'}</td>
                      <td className="khong-ngat">{thang_viet(d.thang)}</td>
                      <td className="canh-phai">{tien(d.thuc_linh)}</td>
                      <td className="khong-ngat mo-ma">{ngay_gio(d.tao_luc)}</td>
                      <td className="khong-ngat">
                        <span className={`nhan ${NHAN_TT[d.trang_thai]?.lop ?? 'nhan-mo'}`}>
                          {NHAN_TT[d.trang_thai]?.ten ?? d.trang_thai}
                        </span>
                      </td>
                      <td className="canh-phai">
                        <button className="nut nut-nho" onClick={() => dat_dang(d)}>Xem</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      {dang !== null && (
        <HopThoaiXuLy
          d={dang}
          khi_dong={() => dat_dang(null)}
          khi_xong={() => { dat_dang(null); ds.nap_lai(); }}
        />
      )}
    </>
  );
}

function HopThoaiXuLy(
  { d, khi_dong, khi_xong }: { d: Dong; khi_dong: () => void; khi_xong: () => void },
): ReactNode {
  const [phan_hoi, dat_phan_hoi] = useState(d.phan_hoi ?? '');
  const [tra_loi_nd, dat_tra_loi_nd] = useState('');
  const hd = dung_hanh_dong();
  const chi_xem = chi_xem_quan_tri();
  const xong = d.trang_thai === 'chap_nhan' || d.trang_thai === 'tu_choi';

  const xu_ly = (trang_thai: 'dang_xem' | 'chap_nhan' | 'tu_choi', chu: string): void => {
    void hd.chay(
      () => goi(`/api/khieu-nai-luong/${d.id}/xu-ly`, { method: 'POST', body: { trang_thai, phan_hoi } }),
      chu,
    ).then((ok) => { if (ok) khi_xong(); });
  };

  const gui_tra_loi = (): void => {
    void hd.chay(
      () => goi(`/api/khieu-nai-luong/${d.id}/tra-loi`, { method: 'POST', body: { noi_dung: tra_loi_nd } }),
      'Đã gửi trả lời.',
    ).then((ok) => { if (ok) { dat_tra_loi_nd(''); khi_xong(); } });
  };

  const la_ad = la_admin();
  const mo_lai = (): void => {
    void hd.chay(
      () => goi(`/api/khieu-nai-luong/${d.id}/mo-lai`, { method: 'POST' }),
      'Đã mở lại khiếu nại để trao đổi / giải trình thêm.',
    ).then((ok) => { if (ok) khi_xong(); });
  };

  return (
    <HopThoai tieu_de={`Khiếu nại lương ${d.ma ?? ''} — ${d.ho_ten}`} khi_dong={khi_dong} rong>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}

      <div className="ho-so-chi-so">
        <div className="o-so">
          <div className="o-so-nhan">Kỳ lương</div>
          <div className="o-so-gia-tri" style={{ fontSize: 15 }}>{thang_viet(d.thang)}</div>
          <div className="o-so-phu">Thực nhận {tien(d.thuc_linh)} đ</div>
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

      <h3>Trao đổi</h3>
      <ThreadKhieuNai noi_dung={d.noi_dung} tao_luc={d.tao_luc} tra_loi={d.tra_loi} la_admin />

      {!xong && !chi_xem && (
        <div style={{ marginTop: 4, marginBottom: 8 }}>
          <textarea value={tra_loi_nd} onChange={(e) => dat_tra_loi_nd(e.target.value)} rows={2}
            placeholder="Trả lời / trao đổi với người lao động…" />
          <div className="hang-nut" style={{ marginTop: 6 }}>
            <button className="nut-phang" disabled={hd.dang_chay || tra_loi_nd.trim().length < 1}
              onClick={gui_tra_loi}>Gửi trả lời</button>
          </div>
        </div>
      )}

      {d.anh.length > 0 && (
        <>
          <h3>Ảnh đính kèm</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            {d.anh.map((a) => (
              <AnhCoToken key={a.id} duong_dan={`/api/toi/khieu-nai-luong/anh/${a.id}`} alt={a.ten} cao={120} />
            ))}
          </div>
        </>
      )}

      {xong ? (
        <>
          <h3>Kết quả xử lý</h3>
          <div className={`hop-thong-bao ${d.trang_thai === 'chap_nhan' ? 'hop-tot' : ''}`}>
            {d.trang_thai === 'chap_nhan' ? 'Đã chấp nhận.' : 'Đã từ chối.'}
            {d.phan_hoi !== null && <> {d.phan_hoi}</>}
            {d.xu_ly_luc !== null && <div className="mo-ta">Xử lý lúc {ngay_gio(d.xu_ly_luc)}</div>}
          </div>
          {la_ad && (
            <div className="hang-nut" style={{ marginTop: 8 }}>
              <button className="nut-phang" disabled={hd.dang_chay} onClick={mo_lai}>
                Mở lại để trao đổi / giải trình thêm
              </button>
            </div>
          )}
        </>
      ) : chi_xem ? (
        <div className="hop-thong-bao hop-tin">
          Bạn đang ở chế độ <strong>chỉ xem</strong>. Việc xử lý khiếu nại do Nhân sự / Admin thực hiện.
        </div>
      ) : (
        <>
          <h3>Phản hồi &amp; quyết định</h3>
          <div className="hop-thong-bao hop-tin" style={{ marginBottom: 8 }}>
            Chấp nhận không tự sửa lương. Nếu đúng, mở lại kỳ lương ở <strong>Lương &amp; phụ cấp</strong>,
            sửa số liệu rồi duyệt lại.
          </div>
          <label htmlFor="ph">Phản hồi cho người lao động</label>
          <textarea id="ph" value={phan_hoi} onChange={(e) => dat_phan_hoi(e.target.value)}
            placeholder="Giải thích kết quả đối chiếu để nhân viên nắm rõ…" />
          <div className="hang-nut" style={{ marginTop: 12 }}>
            <button className="nut-lanh" disabled={hd.dang_chay}
              onClick={() => xu_ly('chap_nhan', 'Đã chấp nhận khiếu nại.')}>Chấp nhận</button>
            <button disabled={hd.dang_chay}
              onClick={() => xu_ly('tu_choi', 'Đã từ chối khiếu nại.')}>Từ chối</button>
            {d.trang_thai === 'moi' && (
              <button className="nut-phang" disabled={hd.dang_chay}
                onClick={() => xu_ly('dang_xem', 'Đã tiếp nhận, đang xem xét.')}>Tiếp nhận (xem xét)</button>
            )}
          </div>
        </>
      )}

      <div className="hang-nut">
        <button className="nut-phang" onClick={khi_dong}>Đóng</button>
      </div>
    </HopThoai>
  );
}
