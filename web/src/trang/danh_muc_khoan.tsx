// Danh muc KHOAN LUONG — phu cap / khoan tru cua cong ty (du lieu, khong phai cot cung).
//
// Them mot khoan = them mot loai phu cap/tru dung chung. Loai (thu nhap/tru) va cach tinh KHONG
// sua duoc sau khi tao (phieu cu da mang so theo cach do) — muon doi thi tat khoan cu, tao moi.
import { useState, type ReactNode } from 'react';
import { goi, la_admin } from '../api.ts';
import {
  HopLoi, HopThoai, Trong, dung_hanh_dong, dung_nap, XuongDanhSach,
} from '../thanh_phan.tsx';
import { tien } from './phu_cap.tsx';

interface Khoan {
  ma: string;
  ten: string;
  loai: 'thu_nhap' | 'tru';
  cach_tinh: 'nhap_tay' | 'so_luong_x_don_gia' | 'nua_ngay_luong';
  don_gia: string | null;
  chiu_thue: boolean;
  thu_tu: number;
  dang_dung: boolean;
  canh_bao: string | null;
  ghi_chu: string | null;
}

const TEN_CACH_TINH: Record<Khoan['cach_tinh'], string> = {
  nhap_tay: 'Gõ tay số tiền',
  so_luong_x_don_gia: 'Số lượng × đơn giá',
  nua_ngay_luong: 'Số lần × nửa ngày lương',
};

export function TrangDanhMucKhoan(): ReactNode {
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<Khoan[]>('/api/khoan-luong?ca=true');
  const [them, dat_them] = useState(false);
  const [sua, dat_sua] = useState<Khoan | null>(null);
  const admin = la_admin();

  if (dang_tai) return <XuongDanhSach />;
  if (loi !== null) return <HopLoi loi={loi} />;
  const ds = du_lieu ?? [];
  const thu_nhap = ds.filter((k) => k.loai === 'thu_nhap');
  const tru = ds.filter((k) => k.loai === 'tru');

  const bang = (nhom: Khoan[], tieu_de: string): ReactNode => (
    <>
      <h3>{tieu_de}</h3>
      <div className="vo-bang">
        <table className="bang-gon">
          <thead>
            <tr>
              <th>Tên khoản</th><th>Mã</th><th>Cách tính</th><th className="canh-phai">Đơn giá</th>
              <th>Thuế</th><th>Trạng thái</th>{admin && <th />}
            </tr>
          </thead>
          <tbody>
            {nhom.map((k) => (
              <tr key={k.ma} className={k.dang_dung ? undefined : 'mo-ta'}>
                <td>
                  {k.ten}
                  {k.canh_bao !== null && k.canh_bao !== '' && (
                    <div className="hop-luu-y">{k.canh_bao}</div>
                  )}
                </td>
                <td className="mo-ta">{k.ma}</td>
                <td>{TEN_CACH_TINH[k.cach_tinh]}</td>
                <td className="canh-phai">{k.don_gia === null ? '—' : `${tien(k.don_gia)} đ`}</td>
                <td>{k.chiu_thue ? 'Chịu thuế' : <span className="nhan-tot">Miễn thuế</span>}</td>
                <td>{k.dang_dung ? <span className="nhan-tot">Đang dùng</span>
                  : <span className="nhan-xau">Ngừng</span>}</td>
                {admin && (
                  <td className="canh-phai">
                    <button className="nut-nho" onClick={() => dat_sua(k)}>Sửa</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );

  return (
    <>
      <div className="dau-trang">
        <div>
          <p className="mo-ta">
            Danh sách phụ cấp / khoản trừ dùng chung. Gán mức cho khối hoặc cá nhân ở các tab bên.
          </p>
        </div>
        {admin && (
          <div className="hang-nut">
            <button onClick={() => dat_them(true)}>Thêm khoản</button>
          </div>
        )}
      </div>

      {!admin && (
        <p className="mo-ta">Chỉ admin mới thêm/sửa danh mục khoản.</p>
      )}

      {ds.length === 0 ? (
        <Trong tieu_de="Chưa có khoản nào" mo_ta="Thêm khoản phụ cấp / khoản trừ để bắt đầu." />
      ) : (
        <>
          {thu_nhap.length > 0 && bang(thu_nhap, 'Phụ cấp / thu nhập thêm')}
          {tru.length > 0 && bang(tru, 'Các khoản trừ')}
        </>
      )}

      {them && (
        <HopThoaiThemKhoan khi_dong={() => dat_them(false)}
          khi_xong={() => { dat_them(false); nap_lai(); }} />
      )}
      {sua !== null && (
        <HopThoaiSuaKhoan khoan={sua} khi_dong={() => dat_sua(null)}
          khi_xong={() => { dat_sua(null); nap_lai(); }} />
      )}
    </>
  );
}

function HopThoaiThemKhoan(
  { khi_dong, khi_xong }: { khi_dong: () => void; khi_xong: () => void },
): ReactNode {
  const [f, dat_f] = useState({
    ma: '', ten: '', loai: 'thu_nhap', cach_tinh: 'nhap_tay',
    don_gia: '', chiu_thue: true, thu_tu: '100', canh_bao: '',
  });
  const hd = dung_hanh_dong();
  const dat = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    dat_f({ ...f, [k]: e.target.value });

  const can_don_gia = f.cach_tinh === 'so_luong_x_don_gia';
  const du = /^[a-z][a-z0-9_]*$/.test(f.ma) && f.ten.trim() !== ''
    && (!can_don_gia || Number(f.don_gia) > 0);

  return (
    <HopThoai tieu_de="Thêm khoản" khi_dong={khi_dong} rong>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}
      <label htmlFor="dm-ma">Mã khoản (chữ thường, số, gạch dưới)</label>
      <input id="dm-ma" value={f.ma} onChange={dat('ma')} placeholder="vd: pc_dien_thoai" />

      <label htmlFor="dm-ten">Tên khoản</label>
      <input id="dm-ten" value={f.ten} onChange={dat('ten')} placeholder="vd: Phụ cấp điện thoại" />

      <label htmlFor="dm-loai">Loại</label>
      <select id="dm-loai" value={f.loai} onChange={dat('loai')}>
        <option value="thu_nhap">Phụ cấp / thu nhập thêm</option>
        <option value="tru">Khoản trừ</option>
      </select>

      <label htmlFor="dm-ct">Cách tính</label>
      <select id="dm-ct" value={f.cach_tinh} onChange={dat('cach_tinh')}>
        <option value="nhap_tay">Gõ tay số tiền</option>
        <option value="so_luong_x_don_gia">Số lượng × đơn giá</option>
        <option value="nua_ngay_luong">Số lần × nửa ngày lương</option>
      </select>

      {can_don_gia && (
        <>
          <label htmlFor="dm-dg">Đơn giá (đ)</label>
          <input id="dm-dg" type="number" min="0" step="any" value={f.don_gia}
            onChange={dat('don_gia')} />
        </>
      )}

      <label htmlFor="dm-thue">Thuế TNCN</label>
      <select id="dm-thue" value={f.chiu_thue ? '1' : '0'}
        onChange={(e) => dat_f({ ...f, chiu_thue: e.target.value === '1' })}>
        <option value="1">Chịu thuế</option>
        <option value="0">Miễn thuế</option>
      </select>

      <label htmlFor="dm-tt">Thứ tự hiển thị</label>
      <input id="dm-tt" type="number" min="0" value={f.thu_tu} onChange={dat('thu_tu')} />

      <label htmlFor="dm-cb">Cảnh báo (hiện cạnh khoản khi gán) — để trống nếu không</label>
      <input id="dm-cb" value={f.canh_bao} onChange={dat('canh_bao')} />

      <div className="hang-nut">
        <button disabled={hd.dang_chay || !du}
          onClick={() => void hd.chay(
            () => goi('/api/khoan-luong', {
              method: 'POST',
              body: {
                ma: f.ma, ten: f.ten, loai: f.loai, cach_tinh: f.cach_tinh,
                don_gia: f.don_gia === '' ? null : Number(f.don_gia),
                chiu_thue: f.chiu_thue, thu_tu: Number(f.thu_tu) || 100,
                canh_bao: f.canh_bao,
              },
            }),
            'Đã thêm khoản mới.',
          ).then((ok) => { if (ok !== null) khi_xong(); })}>
          Thêm
        </button>
        <button className="nut-phang" onClick={khi_dong}>Hủy</button>
      </div>
    </HopThoai>
  );
}

function HopThoaiSuaKhoan(
  { khoan, khi_dong, khi_xong }:
  { khoan: Khoan; khi_dong: () => void; khi_xong: () => void },
): ReactNode {
  const [f, dat_f] = useState({
    ten: khoan.ten,
    don_gia: khoan.don_gia === null ? '' : String(Number(khoan.don_gia)),
    chiu_thue: khoan.chiu_thue,
    thu_tu: String(khoan.thu_tu),
    dang_dung: khoan.dang_dung,
    canh_bao: khoan.canh_bao ?? '',
  });
  const hd = dung_hanh_dong();
  const dat = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    dat_f({ ...f, [k]: e.target.value });

  return (
    <HopThoai tieu_de={`Sửa khoản — ${khoan.ten}`} khi_dong={khi_dong} rong>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}
      <p className="mo-ta">
        Mã <strong>{khoan.ma}</strong> · {khoan.loai === 'tru' ? 'Khoản trừ' : 'Phụ cấp'} ·{' '}
        {TEN_CACH_TINH[khoan.cach_tinh]} (loại & cách tính không đổi được).
      </p>

      <label htmlFor="dms-ten">Tên khoản</label>
      <input id="dms-ten" value={f.ten} onChange={dat('ten')} />

      {khoan.cach_tinh === 'so_luong_x_don_gia' && (
        <>
          <label htmlFor="dms-dg">Đơn giá (đ)</label>
          <input id="dms-dg" type="number" min="0" step="any" value={f.don_gia}
            onChange={dat('don_gia')} />
        </>
      )}

      <label htmlFor="dms-thue">Thuế TNCN</label>
      <select id="dms-thue" value={f.chiu_thue ? '1' : '0'}
        onChange={(e) => dat_f({ ...f, chiu_thue: e.target.value === '1' })}>
        <option value="1">Chịu thuế</option>
        <option value="0">Miễn thuế</option>
      </select>

      <label htmlFor="dms-tt">Thứ tự hiển thị</label>
      <input id="dms-tt" type="number" min="0" value={f.thu_tu} onChange={dat('thu_tu')} />

      <label htmlFor="dms-dung">Trạng thái</label>
      <select id="dms-dung" value={f.dang_dung ? '1' : '0'}
        onChange={(e) => dat_f({ ...f, dang_dung: e.target.value === '1' })}>
        <option value="1">Đang dùng</option>
        <option value="0">Ngừng dùng (không gán mới được)</option>
      </select>

      <label htmlFor="dms-cb">Cảnh báo</label>
      <input id="dms-cb" value={f.canh_bao} onChange={dat('canh_bao')} />

      <div className="hang-nut">
        <button disabled={hd.dang_chay || f.ten.trim() === ''}
          onClick={() => void hd.chay(
            () => goi(`/api/khoan-luong/${khoan.ma}`, {
              method: 'PATCH',
              body: {
                ten: f.ten,
                don_gia: f.don_gia === '' ? null : Number(f.don_gia),
                chiu_thue: f.chiu_thue, thu_tu: Number(f.thu_tu) || 100,
                dang_dung: f.dang_dung, canh_bao: f.canh_bao,
              },
            }),
            'Đã lưu khoản.',
          ).then((ok) => { if (ok !== null) khi_xong(); })}>
          Lưu
        </button>
        <button className="nut-phang" onClick={khi_dong}>Hủy</button>
      </div>
    </HopThoai>
  );
}
