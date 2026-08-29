// Tab Ra/vao: danh sach canh bao ra/vao van phong + o xu ly cho nhan su.
//
// Quy trinh (chu cong ty chon): he thong tu xu ly (nhac nho duoi nguong, ky luat tu nguong),
// nhan su vao day XEM LAI va ep tay khi can:
//   - Nhac nho  -> gui email (Microsoft 365) + thong bao trong app.
//   - Ky luat   -> tao ho so vi_pham; sang tab "Vi phạm" doi chieu dieu noi quy + muc phat +
//                  lap bien ban (BLLD Dieu 122/124).
//   - Hop le / Bo qua -> dong canh bao, ghi ly do.
import { useState, type ReactNode } from 'react';
import { goi } from '../api.ts';
import { LienKet } from '../dinh_tuyen.tsx';
import {
  DangTai, HopLoi, HopThoai, Trong, dung_hanh_dong, dung_nap, gio_ngan, hom_nay, thang_nay,
} from '../thanh_phan.tsx';

const MA_LOI: Record<string, { ten: string; nang: boolean }> = {
  QUEN_QUET_RA: { ten: 'Quên quẹt ra', nang: true },
  CHI_MOT_LAN_QUET: { ten: 'Chỉ 1 lần quẹt', nang: true },
  QUEN_QUET_VAO: { ten: 'Quên quẹt vào', nang: false },
  VAO_KHI_DANG_TRONG: { ten: 'Vào khi đang trong', nang: false },
  RA_KHI_DANG_NGOAI: { ten: 'Ra khi đang ngoài', nang: false },
};
const ten_loi = (ma: string): string => MA_LOI[ma]?.ten ?? ma;

const NHAN_TT: Record<string, { ten: string; lop: string }> = {
  da_nhac: { ten: 'Đã nhắc nhở', lop: 'nhan-canh-bao' },
  chuyen_ky_luat: { ten: 'Chuyển kỷ luật', lop: 'nhan-xau' },
  hop_le: { ten: 'Hợp lệ', lop: 'nhan-tot' },
  bo_qua: { ten: 'Bỏ qua', lop: 'nhan-mo' },
};

const NHAN_HANH_DONG: Record<string, string> = {
  nhac_nho: 'Nhắc nhở (gửi email + thông báo app)',
  ky_luat: 'Chuyển kỷ luật (tạo hồ sơ vi phạm)',
  hop_le: 'Hợp lệ — không tính vi phạm',
  bo_qua: 'Bỏ qua cảnh báo này',
};

interface Dong {
  nhan_vien_id: string;
  ngay: string;
  ma_loi: string;
  so_lan_ngay: number;
  thoi_diem_dau: string | null;
  mo_ta: string | null;
  ma_nv: string;
  ho_ten: string;
  phong_ban: string | null;
  trang_thai: string | null;
  tu_dong: boolean | null;
  da_gui_email: boolean | null;
  vi_pham_id: string | null;
  so_lan_thang: number | null;
  ghi_chu: string | null;
}

function ngay_v(v: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  return m === null ? v : `${m[3]}/${m[2]}/${m[1]}`;
}

export function TrangRaVao(): ReactNode {
  const [tu, dat_tu] = useState(`${thang_nay()}-01`);
  const [den, dat_den] = useState(hom_nay());
  const [loc, dat_loc] = useState('');   // '' = tat ca; 'chua' | trang thai
  const [dang, dat_dang] = useState<Dong | null>(null);

  const url = `/api/ra-vao?tu=${tu}&den=${den}${loc === '' ? '' : `&trang_thai=${loc}`}`;
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<Dong[]>(url, [tu, den, loc]);

  return (
    <>
      <div className="dau-trang">
        <p className="mo-ta">
          Mâu thuẫn ra/vào không quẹt thẻ. Hệ thống tự nhắc nhở / chuyển kỷ luật theo tần suất;
          nhân sự xem lại và xử lý tại đây.
        </p>
      </div>

      <div className="bo-loc">
        <div className="o-nhap">
          <label htmlFor="tu">Từ ngày</label>
          <input id="tu" type="date" value={tu} onChange={(e) => dat_tu(e.target.value)} />
        </div>
        <div className="o-nhap">
          <label htmlFor="den">Đến ngày</label>
          <input id="den" type="date" value={den} onChange={(e) => dat_den(e.target.value)} />
        </div>
        <div className="o-nhap">
          <label htmlFor="loc">Trạng thái</label>
          <select id="loc" value={loc} onChange={(e) => dat_loc(e.target.value)}>
            <option value="">Tất cả</option>
            <option value="chua">Chưa xử lý</option>
            <option value="da_nhac">Đã nhắc nhở</option>
            <option value="chuyen_ky_luat">Chuyển kỷ luật</option>
            <option value="hop_le">Hợp lệ</option>
            <option value="bo_qua">Bỏ qua</option>
          </select>
        </div>
      </div>

      {dang_tai ? <DangTai /> : loi !== null ? <HopLoi loi={loi} />
        : du_lieu === null || du_lieu.length === 0 ? (
          <Trong tieu_de="Không có cảnh báo" mo_ta="Không có cảnh báo ra/vào trong khoảng đã chọn." />
        ) : (
          <div className="the the-mong">
            <div className="vo-bang">
              <table className="bang-neo-cot-dau">
                <thead>
                  <tr>
                    <th>Ngày</th><th>Mã NV</th><th>Họ tên</th><th>Phòng ban</th>
                    <th>Loại</th><th className="canh-phai">Lần/ngày</th>
                    <th>Trạng thái</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {du_lieu.map((d) => (
                    <tr key={`${d.nhan_vien_id}-${d.ngay}-${d.ma_loi}`}>
                      <td className="khong-ngat so">{ngay_v(d.ngay)}</td>
                      <td className="so">{d.ma_nv}</td>
                      <td>
                        <LienKet den={`/nhan-vien/${d.nhan_vien_id}`}>{d.ho_ten}</LienKet>
                      </td>
                      <td>{d.phong_ban ?? '—'}</td>
                      <td className="khong-ngat">
                        <span className={MA_LOI[d.ma_loi]?.nang === true ? 'nhan-xau' : 'nhan-canh-bao'}>
                          {ten_loi(d.ma_loi)}
                        </span>
                      </td>
                      <td className="canh-phai so">{d.so_lan_ngay}</td>
                      <td className="khong-ngat">
                        {d.trang_thai === null
                          ? <span className="nhan-mo">Chưa xử lý</span>
                          : <span className={NHAN_TT[d.trang_thai]?.lop ?? 'nhan-mo'}>
                              {NHAN_TT[d.trang_thai]?.ten ?? d.trang_thai}
                              {d.tu_dong === true ? ' (tự động)' : ''}
                            </span>}
                      </td>
                      <td className="canh-phai">
                        <button className="nut nut-nho" onClick={() => dat_dang(d)}>Xử lý</button>
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
          khi_xong={() => { dat_dang(null); nap_lai(); }}
        />
      )}
    </>
  );
}

function HopThoaiXuLy(
  { d, khi_dong, khi_xong }: { d: Dong; khi_dong: () => void; khi_xong: () => void },
): ReactNode {
  const [hanh_dong, dat_hanh_dong] = useState('nhac_nho');
  const [ghi_chu, dat_ghi_chu] = useState('');
  const hd = dung_hanh_dong();
  const da_xu_ly = d.trang_thai !== null;

  return (
    <HopThoai tieu_de={`Xử lý cảnh báo — ${d.ho_ten}`} khi_dong={khi_dong} rong>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}

      <div className="ho-so-chi-so">
        <div className="o-so">
          <div className="o-so-nhan">Ngày</div>
          <div className="o-so-gia-tri">{ngay_v(d.ngay)}</div>
        </div>
        <div className="o-so">
          <div className="o-so-nhan">Loại</div>
          <div className="o-so-gia-tri" style={{ fontSize: 16 }}>{ten_loi(d.ma_loi)}</div>
          {d.thoi_diem_dau !== null && (
            <div className="o-so-phu">lúc {gio_ngan(d.thoi_diem_dau)}</div>
          )}
        </div>
        <div className="o-so">
          <div className="o-so-nhan">Trong tháng</div>
          <div className="o-so-gia-tri">{d.so_lan_thang ?? '—'}</div>
          <div className="o-so-phu">lần cùng lỗi</div>
        </div>
      </div>

      {d.mo_ta !== null && d.mo_ta !== '' && (
        <p className="mo-ta"><strong>Chi tiết:</strong> {d.mo_ta}</p>
      )}

      {da_xu_ly ? (
        <div className="hop-thong-bao hop-tin">
          Đã xử lý: <strong>{NHAN_TT[d.trang_thai!]?.ten ?? d.trang_thai}</strong>
          {d.tu_dong === true && ' (hệ thống tự động)'}.
          {d.da_gui_email === true && ' Đã gửi email nhắc nhở.'}
          {d.vi_pham_id !== null && (
            <> Đã tạo hồ sơ kỷ luật — <LienKet den="/vi-pham">mở tab Vi phạm</LienKet> để
              đối chiếu điều nội quy + mức xử phạt và lập biên bản.</>
          )}
          {d.ghi_chu !== null && d.ghi_chu !== '' && <> Ghi chú: {d.ghi_chu}</>}
          <p className="mo-ta" style={{ marginTop: 8 }}>Bạn có thể chọn hành động khác để cập nhật.</p>
        </div>
      ) : null}

      <h3>Hành động</h3>
      <label htmlFor="hd">Chọn cách xử lý</label>
      <select id="hd" value={hanh_dong} onChange={(e) => dat_hanh_dong(e.target.value)}>
        {Object.entries(NHAN_HANH_DONG).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>

      {hanh_dong === 'nhac_nho' && (
        <p className="mo-ta">Gửi email nhắc nhở tới nhân viên (kèm thông báo trong app). Không tính vi phạm.</p>
      )}
      {hanh_dong === 'ky_luat' && (
        <div className="hop-luu-y">
          Tạo <strong>hồ sơ vi phạm</strong> cho người này. Việc <strong>đối chiếu điều nội quy,
          chọn mức xử phạt và lập biên bản</strong> (BLLĐ Điều 122/124) làm ở tab <strong>Vi phạm</strong> —
          không phạt tiền, không trừ lương.
        </div>
      )}

      <label htmlFor="gc">Ghi chú {hanh_dong === 'hop_le' || hanh_dong === 'bo_qua' ? '(lý do)' : ''}</label>
      <input id="gc" value={ghi_chu} onChange={(e) => dat_ghi_chu(e.target.value)}
        placeholder={hanh_dong === 'hop_le' ? 'vd: đi gặp khách, có báo trước' : ''} />

      <div className="hang-nut">
        <button
          disabled={hd.dang_chay}
          onClick={() => void hd.chay(
            () => goi('/api/ra-vao/xu-ly', {
              method: 'POST',
              body: {
                nhan_vien_id: d.nhan_vien_id, ngay: d.ngay, ma_loi: d.ma_loi,
                hanh_dong, ghi_chu,
              },
            }),
            'Đã xử lý cảnh báo.',
          ).then((ok) => { if (ok !== null) khi_xong(); })}
        >
          Lưu xử lý
        </button>
        <button className="nut-phang" onClick={khi_dong}>Đóng</button>
      </div>
    </HopThoai>
  );
}
