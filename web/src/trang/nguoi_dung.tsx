// Quan ly tai khoan dang nhap va nhat ky thao tac. Chi vai tro admin.
import { useState, type ReactNode } from 'react';
import { goi, nguoi_dung_hien_tai } from '../api.ts';
import {
  DangTai, HopLoi, HopTot, HopThoai, TEN_VAI_TRO, Trong,
  dung_hanh_dong, dung_nap, ngay_gio,
} from '../thanh_phan.tsx';

interface TaiKhoan {
  id: string;
  ten_dang_nhap: string;
  vai_tro: string;
  dang_hoat_dong: boolean;
  phai_doi_mat_khau: boolean;
  dang_nhap_cuoi: string | null;
  nhan_vien_id: string | null;
  ho_ten: string | null;
  ma_nv: string | null;
  /** Email Microsoft đã nối. Trống = tài khoản này chỉ đăng nhập bằng mật khẩu. */
  email_microsoft: string | null;
  duyet_luc: string | null;
  duyet_boi_ten: string | null;
}

const VAI_TRO_CAP: { ma: string; ten: string; mo_ta: string }[] = [
  { ma: 'admin', ten: 'Quản trị', mo_ta: 'Toàn quyền, gồm quản lý tài khoản và phân quyền' },
  { ma: 'truong_phong_nhan_su', ten: 'Trưởng phòng nhân sự (TP HR)', mo_ta: 'Như Nhân sự, và là vai trò DUY NHẤT được thay hoặc gỡ tệp đã nạp vào hồ sơ' },
  { ma: 'nhan_su', ten: 'Nhân sự (HR)', mo_ta: 'Quản trị chấm công: nhân viên, ca, thiết bị, bảng công. Nạp tệp mới được, gỡ tệp thì không' },
  { ma: 'truong_phong', ten: 'Trưởng phòng', mo_ta: 'Duyệt đơn của phòng mình, xem công nhân viên phòng mình' },
  { ma: 'nhan_vien', ten: 'Nhân viên', mo_ta: 'Chỉ xem dữ liệu của chính mình' },
];

export function TrangNguoiDung(): ReactNode {
  const [dat_lai_cho, dat_dat_lai_cho] = useState<TaiKhoan | null>(null);
  const [noi_ms_cho, dat_noi_ms_cho] = useState<TaiKhoan | null>(null);
  const [phan_quyen_cho, dat_phan_quyen_cho] = useState<TaiKhoan | null>(null);
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<TaiKhoan[]>('/api/nguoi-dung');
  const hd = dung_hanh_dong();
  const toi = nguoi_dung_hien_tai();

  const bat_tat = async (tk: TaiKhoan): Promise<void> => {
    const chu = tk.dang_hoat_dong ? 'vô hiệu hóa' : 'bật lại';
    if (!window.confirm(`Bạn muốn ${chu} tài khoản "${tk.ten_dang_nhap}"?`)) return;
    await hd.chay(
      () => goi(`/api/nguoi-dung/${tk.id}`, {
        method: 'PATCH', body: { dang_hoat_dong: !tk.dang_hoat_dong },
      }),
      tk.dang_hoat_dong ? 'Đã vô hiệu hóa và đăng xuất mọi thiết bị của tài khoản đó.' : 'Đã bật lại.',
    );
    nap_lai();
  };

  return (
    <>
      <div className="dau-trang">
        <div>
          <p className="mo-ta">
            Tài khoản nhân viên dùng để đăng nhập app điện thoại. Tạo tài khoản ở trang Nhân viên.
          </p>
        </div>
      </div>

      <HopLoi loi={hd.loi} />
      <HopTot chu={hd.tot} />
      <HopLoi loi={loi} />

      <div className="the the-mong">
        {dang_tai ? <DangTai /> : (du_lieu ?? []).length === 0 ? (
          <Trong tieu_de="Chưa có tài khoản nào" />
        ) : (
          <div className="vo-bang">
            <table>
              <thead>
                <tr>
                  <th>Tên đăng nhập</th>
                  <th>Nhân viên</th>
                  <th>Vai trò</th>
                  <th>Đăng nhập Microsoft</th>
                  <th>Trạng thái</th>
                  <th>Đăng nhập cuối</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(du_lieu ?? []).map((tk) => (
                  <tr key={tk.id} style={tk.dang_hoat_dong ? undefined : { opacity: 0.5 }}>
                    <td>
                      <strong>{tk.ten_dang_nhap}</strong>
                      {tk.id === toi?.id && (
                        <span className="nhan nhan-lanh" style={{ marginLeft: 6 }}>bạn</span>
                      )}
                    </td>
                    <td>
                      {tk.ho_ten ?? <span style={{ color: 'var(--chu-mo)' }}>—</span>}
                      {tk.ma_nv !== null && <div className="o-so-phu">{tk.ma_nv}</div>}
                    </td>
                    <td>
                      {tk.vai_tro === 'cho_duyet'
                        ? <span className="nhan nhan-canh-bao">chờ phân quyền</span>
                        : TEN_VAI_TRO[tk.vai_tro] ?? tk.vai_tro}
                      {tk.duyet_luc !== null && tk.duyet_boi_ten !== null && (
                        <div className="o-so-phu">
                          {tk.duyet_boi_ten} cấp {ngay_gio(tk.duyet_luc)}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {tk.email_microsoft === null
                        ? <span style={{ color: 'var(--chu-mo)' }}>chưa nối</span>
                        : tk.email_microsoft}
                    </td>
                    <td>
                      {!tk.dang_hoat_dong
                        ? <span className="nhan nhan-mo">vô hiệu</span>
                        : tk.phai_doi_mat_khau
                          ? <span className="nhan nhan-canh-bao">chờ đổi mật khẩu</span>
                          : <span className="nhan nhan-tot">bình thường</span>}
                    </td>
                    <td className="khong-ngat" style={{ fontSize: 12 }}>
                      {tk.dang_nhap_cuoi === null
                        ? <span style={{ color: 'var(--chu-mo)' }}>chưa đăng nhập</span>
                        : ngay_gio(tk.dang_nhap_cuoi)}
                    </td>
                    <td>
                      <div className="hang-nut">
                        <button
                          className={tk.vai_tro === 'cho_duyet' ? 'nut-nho nut-chinh' : 'nut-nho nut-phang'}
                          onClick={() => dat_phan_quyen_cho(tk)}
                        >
                          {tk.vai_tro === 'cho_duyet' ? 'Phân quyền' : 'Đổi vai trò'}
                        </button>
                        <button className="nut-nho nut-phang" onClick={() => dat_dat_lai_cho(tk)}>
                          Đặt lại mật khẩu
                        </button>
                        <button className="nut-nho nut-phang" onClick={() => dat_noi_ms_cho(tk)}>
                          {tk.email_microsoft === null ? 'Nối Microsoft' : 'Sửa email MS'}
                        </button>
                        {tk.id !== toi?.id && (
                          <button className="nut-nho nut-phang" onClick={() => bat_tat(tk)}>
                            {tk.dang_hoat_dong ? 'Vô hiệu hóa' : 'Bật lại'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {dat_lai_cho !== null && (
        <FormDatLaiMatKhau
          tai_khoan={dat_lai_cho}
          khi_dong={() => dat_dat_lai_cho(null)}
          khi_xong={() => { dat_dat_lai_cho(null); nap_lai(); }}
        />
      )}

      {phan_quyen_cho !== null && (
        <FormPhanQuyen
          tai_khoan={phan_quyen_cho}
          khi_dong={() => dat_phan_quyen_cho(null)}
          khi_xong={() => { dat_phan_quyen_cho(null); nap_lai(); }}
        />
      )}

      {noi_ms_cho !== null && (
        <FormNoiMicrosoft
          tai_khoan={noi_ms_cho}
          khi_dong={() => dat_noi_ms_cho(null)}
          khi_xong={() => { dat_noi_ms_cho(null); nap_lai(); }}
        />
      )}
    </>
  );
}

/** Nối/gỡ tài khoản Microsoft cho một tài khoản đăng nhập. */
function FormNoiMicrosoft(
  { tai_khoan, khi_dong, khi_xong }:
  { tai_khoan: TaiKhoan; khi_dong: () => void; khi_xong: () => void },
): ReactNode {
  const [email, dat_email] = useState(tai_khoan.email_microsoft ?? '');
  const hd = dung_hanh_dong();

  const gui = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const ok = await hd.chay(
      () => goi(`/api/nguoi-dung/${tai_khoan.id}`, {
        method: 'PATCH',
        // Chuỗi rỗng = gỡ liên kết.
        body: { email_microsoft: email.trim() },
      }),
      email.trim() === '' ? 'Đã gỡ liên kết Microsoft.' : 'Đã nối tài khoản Microsoft.',
    );
    if (ok) setTimeout(khi_xong, 700);
  };

  return (
    <HopThoai tieu_de={`Đăng nhập Microsoft: ${tai_khoan.ten_dang_nhap}`} khi_dong={khi_dong}>
      <form onSubmit={gui}>
        <HopLoi loi={hd.loi} />
        <HopTot chu={hd.tot} />

        <div className="o-nhap">
          <label htmlFor="ems">Email Microsoft</label>
          <input
            id="ems"
            type="email"
            value={email}
            onChange={(e) => dat_email(e.target.value)}
            placeholder="ten.nhanvien@congty.vn"
            autoFocus
          />
          <div className="goi-y">
            Người đăng nhập bằng tài khoản Microsoft này sẽ vào với vai trò{' '}
            <strong>{TEN_VAI_TRO[tai_khoan.vai_tro] ?? tai_khoan.vai_tro}</strong>. Để trống rồi
            lưu là gỡ liên kết — tài khoản quay lại chỉ đăng nhập được bằng mật khẩu.
          </div>
        </div>

        <div className="hop-thong-bao hop-luu-y">
          Không cần khai ở đây nếu hồ sơ <strong>Nhân viên</strong> đã có đúng email công ty —
          hệ thống tự đối chiếu và ghi nhớ ở lần đăng nhập đầu.
        </div>

        <div className="hang-nut">
          <button type="submit" className="nut-chinh" disabled={hd.dang_chay}>
            {hd.dang_chay ? 'Đang lưu…' : 'Lưu'}
          </button>
          <button type="button" onClick={khi_dong}>Hủy</button>
        </div>
      </form>
    </HopThoai>
  );
}

function FormDatLaiMatKhau(
  { tai_khoan, khi_dong, khi_xong }:
  { tai_khoan: TaiKhoan; khi_dong: () => void; khi_xong: () => void },
): ReactNode {
  const [mk, dat_mk] = useState('');
  const hd = dung_hanh_dong();

  const gui = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const ok = await hd.chay(
      () => goi(`/api/nguoi-dung/${tai_khoan.id}/dat-lai-mat-khau`, {
        method: 'POST', body: { mat_khau_moi: mk },
      }),
      'Đã đặt lại mật khẩu. Mọi phiên của tài khoản đó đã bị đăng xuất.',
    );
    if (ok) setTimeout(khi_xong, 1200);
  };

  return (
    <HopThoai tieu_de={`Đặt lại mật khẩu: ${tai_khoan.ten_dang_nhap}`} khi_dong={khi_dong}>
      <form onSubmit={gui}>
        <HopLoi loi={hd.loi} />
        <HopTot chu={hd.tot} />

        <div className="hop-thong-bao hop-luu-y">
          Người dùng sẽ bị buộc đổi mật khẩu ở lần đăng nhập tiếp theo, và mọi thiết bị đang đăng
          nhập bị đăng xuất.
        </div>

        <div className="o-nhap">
          <label htmlFor="mkm">Mật khẩu tạm *</label>
          <input id="mkm" value={mk} onChange={(e) => dat_mk(e.target.value)} required autoFocus />
          <div className="goi-y">Tối thiểu 8 ký tự, có cả chữ và số. Đọc trực tiếp cho người dùng.</div>
        </div>

        <div className="hang-nut">
          <button type="submit" className="nut-chinh" disabled={hd.dang_chay}>
            {hd.dang_chay ? 'Đang đặt lại…' : 'Đặt lại mật khẩu'}
          </button>
          <button type="button" onClick={khi_dong}>Hủy</button>
        </div>
      </form>
    </HopThoai>
  );
}

// ============================================================ nhat ky thao tac
interface DongNhatKy {
  id: number;
  hanh_dong: string;
  thuc_the: string | null;
  thuc_the_id: string | null;
  chi_tiet: Record<string, unknown> | null;
  dia_chi_ip: string | null;
  luc: string;
  ten_dang_nhap: string | null;
}

export function TrangNhatKy(): ReactNode {
  const { du_lieu, dang_tai, loi } = dung_nap<DongNhatKy[]>('/api/nhat-ky?gioi_han=200');

  return (
    <>
      <div className="dau-trang">
        <div>
          <p className="mo-ta">
            Ai đã làm gì với dữ liệu chấm công — cần cho tranh chấp bảng công và lương.
          </p>
        </div>
      </div>

      <HopLoi loi={loi} />

      <div className="the the-mong">
        {dang_tai ? <DangTai /> : (du_lieu ?? []).length === 0 ? (
          <Trong tieu_de="Chưa có thao tác nào được ghi" />
        ) : (
          <div className="vo-bang">
            <table>
              <thead>
                <tr>
                  <th>Lúc</th>
                  <th>Người dùng</th>
                  <th>Hành động</th>
                  <th>Đối tượng</th>
                  <th>Chi tiết</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {(du_lieu ?? []).map((n) => (
                  <tr key={n.id}>
                    <td className="khong-ngat" style={{ fontSize: 12 }}>{ngay_gio(n.luc)}</td>
                    <td>{n.ten_dang_nhap ?? '—'}</td>
                    <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>
                      {n.hanh_dong}
                    </td>
                    <td style={{ fontSize: 12 }}>{n.thuc_the ?? '—'}</td>
                    <td style={{ fontSize: 11.5, maxWidth: 280, wordBreak: 'break-word' }}>
                      {n.chi_tiet === null ? '—' : JSON.stringify(n.chi_tiet)}
                    </td>
                    <td className="so" style={{ fontSize: 12 }}>{n.dia_chi_ip ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}


/** Cấp vai trò cho một tài khoản — gồm cả tài khoản đang chờ phân quyền. */
function FormPhanQuyen(
  { tai_khoan, khi_dong, khi_xong }:
  { tai_khoan: TaiKhoan; khi_dong: () => void; khi_xong: () => void },
): ReactNode {
  const [vai_tro, dat_vai_tro] = useState(
    tai_khoan.vai_tro === 'cho_duyet' ? 'nhan_vien' : tai_khoan.vai_tro,
  );
  const hd = dung_hanh_dong();

  const gui = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const ok = await hd.chay(
      () => goi(`/api/nguoi-dung/${tai_khoan.id}`, { method: 'PATCH', body: { vai_tro } }),
      'Đã cấp quyền. Người dùng đăng nhập lại là vào được.',
    );
    if (ok) setTimeout(khi_xong, 900);
  };

  return (
    <HopThoai tieu_de={`Phân quyền: ${tai_khoan.ten_dang_nhap}`} khi_dong={khi_dong}>
      <form onSubmit={gui}>
        <HopLoi loi={hd.loi} />
        <HopTot chu={hd.tot} />

        {tai_khoan.vai_tro === 'cho_duyet' && (
          <div className="hop-thong-bao hop-luu-y">
            Tài khoản này đã xác thực bằng Microsoft nhưng <strong>chưa có quyền gì</strong>.
            Chọn vai trò để cho vào hệ thống.
          </div>
        )}

        <div className="o-nhap">
          <label>Vai trò</label>
          {VAI_TRO_CAP.map((v) => (
            <label key={v.ma} className="o-chon-vai-tro">
              <input
                type="radio"
                name="vai_tro"
                value={v.ma}
                checked={vai_tro === v.ma}
                onChange={() => dat_vai_tro(v.ma)}
              />
              <span>
                <strong>{v.ten}</strong>
                <span className="o-so-phu">{v.mo_ta}</span>
              </span>
            </label>
          ))}
        </div>

        {tai_khoan.nhan_vien_id === null
          && (vai_tro === 'nhan_vien' || vai_tro === 'truong_phong'
            || vai_tro === 'truong_phong_nhan_su') && (
          <div className="hop-thong-bao hop-luu-y">
            Tài khoản này chưa gắn hồ sơ nhân viên. Hai vai trò này cần một hồ sơ để biết
            người đó được xem dữ liệu của ai. Hãy tạo nhân viên ở trang{' '}
            <strong>Nhân viên</strong> với email đúng bằng{' '}
            <strong>{tai_khoan.ten_dang_nhap}</strong>, rồi cấp quyền lại — hệ thống sẽ tự
            nối hai bên.
          </div>
        )}

        <div className="hang-nut">
          <button type="submit" className="nut-chinh" disabled={hd.dang_chay}>
            {hd.dang_chay ? 'Đang lưu…' : 'Cấp quyền'}
          </button>
          <button type="button" onClick={khi_dong}>Hủy</button>
        </div>
      </form>
    </HopThoai>
  );
}
