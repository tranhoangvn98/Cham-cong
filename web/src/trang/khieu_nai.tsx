// Tab Khieu nai: quan ly khieu nai & giai trinh cua nguoi lao dong ve quyet dinh ky luat / vi pham.
// Nguoi duyet tiep nhan, chap nhan (admin co the mien luon ky luat) hoac tu choi, kem phan hoi.
//
// BLLD 2019 Dieu 131 cho nguoi lao dong quyen khieu nai quyet dinh ky luat. Moi khieu nai co ma
// (KN-NNNNNN) de theo doi.
import { useState, type ReactNode } from 'react';
import { goi, la_admin, chi_xem_quan_tri } from '../api.ts';
import { LienKet } from '../dinh_tuyen.tsx';
import {
  DangTai, HopLoi, HopThoai, Trong, dung_hanh_dong, dung_nap, ngay_gio, ngay_viet,
} from '../thanh_phan.tsx';

const NHAN_TT: Record<string, { ten: string; lop: string }> = {
  moi: { ten: 'Mới', lop: 'nhan-xau' },
  dang_xem: { ten: 'Đang xem xét', lop: 'nhan-canh-bao' },
  chap_nhan: { ten: 'Đã chấp nhận', lop: 'nhan-tot' },
  tu_choi: { ten: 'Đã từ chối', lop: 'nhan-mo' },
};
const NHAN_LOAI: Record<string, string> = { khieu_nai: 'Khiếu nại', giai_trinh: 'Giải trình' };

interface Dong {
  id: string;
  ma: string | null;
  loai: string;
  noi_dung: string;
  trang_thai: string;
  phan_hoi: string | null;
  tao_luc: string;
  xu_ly_luc: string | null;
  nhan_vien_id: string;
  ma_nv: string;
  ho_ten: string;
  phong_ban: string | null;
  ho_so_ky_luat_id: string | null;
  ma_ky_luat: string | null;
  ky_ky_luat: string | null;
  tong_tien: string | null;
  tt_ky_luat: string | null;
  vi_pham_id: string | null;
  ngay_vi_pham: string | null;
  ten_vi_pham: string | null;
}

function tien(v: unknown): string {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString('vi-VN', { maximumFractionDigits: 0 }) : '0';
}

export function TrangKhieuNai(): ReactNode {
  const [loc, dat_loc] = useState('');
  const [dang, dat_dang] = useState<Dong | null>(null);

  const url = `/api/khieu-nai${loc === '' ? '' : `?trang_thai=${loc}`}`;
  const ds = dung_nap<Dong[]>(url, [loc]);

  return (
    <>
      <div className="dau-trang">
        <p className="mo-ta">
          Khiếu nại &amp; giải trình của người lao động về quyết định kỷ luật hoặc vi phạm
          (BLLĐ Điều 131). Mỗi khiếu nại có mã riêng để theo dõi. Hàng <strong>Mới / Đang xem
          xét</strong> nằm trên đầu.
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
          <Trong tieu_de="Chưa có khiếu nại"
            mo_ta="Khi nhân viên gửi khiếu nại hoặc giải trình, chúng sẽ hiện ở đây." />
        ) : (
          <div className="the the-mong">
            <div className="vo-bang">
              <table className="bang-neo-cot-dau">
                <thead>
                  <tr>
                    <th>Mã</th><th>Loại</th><th>Nhân viên</th><th>Phòng ban</th>
                    <th>Về</th><th>Ngày gửi</th><th>Trạng thái</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {ds.du_lieu.map((d) => (
                    <tr key={d.id}>
                      <td className="so mo-ma">{d.ma ?? '—'}</td>
                      <td className="khong-ngat">{NHAN_LOAI[d.loai] ?? d.loai}</td>
                      <td>
                        <LienKet den={`/nhan-vien/${d.nhan_vien_id}`}>{d.ho_ten}</LienKet>
                        <span className="mo-ma"> {d.ma_nv}</span>
                      </td>
                      <td>{d.phong_ban ?? '—'}</td>
                      <td className="khong-ngat">
                        {d.ma_ky_luat !== null
                          ? <span className="mo-ma">{d.ma_ky_luat} · {tien(d.tong_tien)}đ</span>
                          : d.ngay_vi_pham !== null
                            ? <span className="mo-ma">VP {ngay_viet(d.ngay_vi_pham)}</span>
                            : '—'}
                      </td>
                      <td className="khong-ngat mo-ma">{ngay_gio(d.tao_luc)}</td>
                      <td className="khong-ngat">
                        <span className={NHAN_TT[d.trang_thai]?.lop ?? 'nhan-mo'}>
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
        <HopThoaiKhieuNai
          d={dang}
          khi_dong={() => dat_dang(null)}
          khi_xong={() => { dat_dang(null); ds.nap_lai(); }}
        />
      )}
    </>
  );
}

function HopThoaiKhieuNai(
  { d, khi_dong, khi_xong }: { d: Dong; khi_dong: () => void; khi_xong: () => void },
): ReactNode {
  const [phan_hoi, dat_phan_hoi] = useState(d.phan_hoi ?? '');
  const [mien_luon, dat_mien_luon] = useState(false);
  const hd = dung_hanh_dong();
  const admin = la_admin();
  const chi_xem = chi_xem_quan_tri();
  const xong = d.trang_thai === 'chap_nhan' || d.trang_thai === 'tu_choi';

  const xu_ly = (trang_thai: 'dang_xem' | 'chap_nhan' | 'tu_choi', chu: string): void => {
    void hd.chay(
      () => goi(`/api/khieu-nai/${d.id}/xu-ly`, {
        method: 'POST',
        body: { trang_thai, phan_hoi, mien_luon: mien_luon && trang_thai === 'chap_nhan' },
      }),
      chu,
    ).then((ok) => { if (ok) khi_xong(); });
  };

  return (
    <HopThoai tieu_de={`${NHAN_LOAI[d.loai] ?? 'Khiếu nại'} ${d.ma ?? ''} — ${d.ho_ten}`}
      khi_dong={khi_dong} rong>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}

      <div className="ho-so-chi-so">
        <div className="o-so">
          <div className="o-so-nhan">Trạng thái</div>
          <div className="o-so-gia-tri" style={{ fontSize: 15 }}>
            <span className={NHAN_TT[d.trang_thai]?.lop ?? 'nhan-mo'}>
              {NHAN_TT[d.trang_thai]?.ten ?? d.trang_thai}
            </span>
          </div>
        </div>
        <div className="o-so">
          <div className="o-so-nhan">Về</div>
          <div className="o-so-gia-tri" style={{ fontSize: 14 }}>
            {d.ma_ky_luat !== null
              ? `Kỷ luật ${d.ma_ky_luat}`
              : d.ten_vi_pham !== null ? d.ten_vi_pham : '—'}
          </div>
          <div className="o-so-phu">
            {d.ky_ky_luat !== null ? `Kỳ ${d.ky_ky_luat} · ${tien(d.tong_tien)}đ`
              : d.ngay_vi_pham !== null ? ngay_viet(d.ngay_vi_pham) : ''}
          </div>
        </div>
      </div>

      <h3>Nội dung {NHAN_LOAI[d.loai]?.toLowerCase() ?? 'khiếu nại'}</h3>
      <blockquote>{d.noi_dung}</blockquote>

      {xong ? (
        <>
          <h3>Kết quả xử lý</h3>
          <div className={`hop-thong-bao ${d.trang_thai === 'chap_nhan' ? 'hop-tot' : ''}`}>
            {d.trang_thai === 'chap_nhan' ? 'Đã chấp nhận.' : 'Đã từ chối.'}
            {d.phan_hoi !== null && <> {d.phan_hoi}</>}
            {d.xu_ly_luc !== null && <div className="mo-ta">Xử lý lúc {ngay_gio(d.xu_ly_luc)}</div>}
          </div>
        </>
      ) : chi_xem ? (
        <div className="hop-thong-bao hop-tin">
          Bạn đang ở chế độ <strong>chỉ xem</strong>. Việc xử lý khiếu nại do Nhân sự / Admin thực hiện.
        </div>
      ) : (
        <>
          <h3>Phản hồi &amp; quyết định</h3>
          <label htmlFor="ph">Phản hồi cho người lao động</label>
          <textarea id="ph" value={phan_hoi} onChange={(e) => dat_phan_hoi(e.target.value)}
            placeholder="Giải thích quyết định để nhân viên nắm rõ…" />

          {admin && d.ho_so_ky_luat_id !== null && (
            <label className="o-nhap-ngang" style={{ marginTop: 4 }}>
              <input type="checkbox" checked={mien_luon}
                onChange={(e) => dat_mien_luon(e.target.checked)} />
              <span>Chấp nhận và <strong>miễn kỷ luật</strong> luôn (gỡ giảm thưởng khỏi lương)</span>
            </label>
          )}

          <div className="hang-nut" style={{ marginTop: 12 }}>
            <button className="nut-lanh" disabled={hd.dang_chay}
              onClick={() => xu_ly('chap_nhan', 'Đã chấp nhận khiếu nại.')}>
              Chấp nhận
            </button>
            <button disabled={hd.dang_chay}
              onClick={() => xu_ly('tu_choi', 'Đã từ chối khiếu nại.')}>
              Từ chối
            </button>
            {d.trang_thai === 'moi' && (
              <button className="nut-phang" disabled={hd.dang_chay}
                onClick={() => xu_ly('dang_xem', 'Đã tiếp nhận, đang xem xét.')}>
                Tiếp nhận (xem xét)
              </button>
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
