import { useState, type ReactNode } from 'react';
import { goi, la_admin, la_nhan_su } from '../api.ts';
import {
  DangTai, HopLoi, HopThoai, TEN_VAI_TRO, Trong, dung_hanh_dong, dung_nap, ngay_viet,
} from '../thanh_phan.tsx';

interface NhanVien {
  id: string;
  ma_nv: string;
  ho_ten: string;
  pin_may: string | null;
  ma_erp: string | null;
  ngay_vao: string | null;
  so_dien_thoai: string | null;
  email: string | null;
  duoc_cham_cong_dien_thoai: boolean;
  dang_hoat_dong: boolean;
  phong_ban_id: string | null;
  phong_ban: string | null;
  ca_lam_id: string | null;
  ca_lam: string | null;
  co_tai_khoan: boolean;
}

interface CaLam { id: string; ten: string; dang_hoat_dong: boolean }
interface PhongBan { id: string; ten: string }

export function TrangNhanVien(): ReactNode {
  const [tim, dat_tim] = useState('');
  const [chi_dang_lam, dat_chi_dang_lam] = useState(true);
  const [dang_sua, dat_dang_sua] = useState<NhanVien | null>(null);
  const [dang_them, dat_dang_them] = useState(false);
  const [tao_tk_cho, dat_tao_tk_cho] = useState<NhanVien | null>(null);

  const url = `/api/nhan-vien?chi_dang_lam=${chi_dang_lam}`
    + (tim.trim() === '' ? '' : `&tim=${encodeURIComponent(tim.trim())}`);
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<NhanVien[]>(url);
  const ca = dung_nap<CaLam[]>('/api/ca-lam');
  const phong = dung_nap<PhongBan[]>('/api/phong-ban');

  const chua_co_pin = (du_lieu ?? []).filter((n) => n.pin_may === null && n.dang_hoat_dong);
  const chua_co_ca = (du_lieu ?? []).filter((n) => n.ca_lam_id === null && n.dang_hoat_dong);

  return (
    <>
      <div className="dau-trang">
        <div>
          <p className="mo-ta">
            PIN máy là cầu nối giữa máy chấm công và nhân viên — không có PIN thì log về không biết
            của ai.
          </p>
        </div>
        {la_nhan_su() && (
          <button className="nut-chinh" onClick={() => dat_dang_them(true)}>+ Thêm nhân viên</button>
        )}
      </div>

      {chua_co_pin.length > 0 && (
        <div className="hop-thong-bao hop-luu-y">
          <strong>{chua_co_pin.length} nhân viên chưa có PIN máy:</strong>{' '}
          {chua_co_pin.slice(0, 6).map((n) => n.ho_ten).join(', ')}
          {chua_co_pin.length > 6 ? '…' : ''}. Log chấm công của họ sẽ không map được.
        </div>
      )}

      {chua_co_ca.length > 0 && (
        <div className="hop-thong-bao hop-tin">
          {chua_co_ca.length} nhân viên chưa được gán ca làm việc — hệ thống chỉ tính tổng thời gian
          có mặt, không tính đi muộn / về sớm cho họ.
        </div>
      )}

      <div className="bo-loc">
        <div className="o-nhap" style={{ minWidth: 240 }}>
          <label htmlFor="tim">Tìm theo tên, mã NV hoặc PIN</label>
          <input id="tim" value={tim} onChange={(e) => dat_tim(e.target.value)}
            placeholder="Nguyễn Văn A / NV001 / 1001" />
        </div>
        <div className="o-nhap-ngang" style={{ marginBottom: 0 }}>
          <input id="dl" type="checkbox" checked={chi_dang_lam}
            onChange={(e) => dat_chi_dang_lam(e.target.checked)} />
          <label htmlFor="dl">Chỉ người đang làm</label>
        </div>
      </div>

      <HopLoi loi={loi} />

      <div className="the the-mong">
        {dang_tai ? <DangTai /> : (du_lieu ?? []).length === 0 ? (
          <Trong tieu_de="Không có nhân viên nào" mo_ta="Thêm nhân viên và gán PIN đã khai trên máy." />
        ) : (
          <div className="vo-bang">
            <table>
              <thead>
                <tr>
                  <th>Mã NV</th>
                  <th>Họ tên</th>
                  <th>PIN máy</th>
                  <th>Phòng ban</th>
                  <th>Ca làm</th>
                  <th>Vào làm</th>
                  <th className="canh-giua">Chấm công ĐT</th>
                  <th className="canh-giua">Tài khoản</th>
                  {la_nhan_su() && <th></th>}
                </tr>
              </thead>
              <tbody>
                {(du_lieu ?? []).map((n) => (
                  <tr key={n.id} style={n.dang_hoat_dong ? undefined : { opacity: 0.55 }}>
                    <td className="so">{n.ma_nv}</td>
                    <td>
                      {n.ho_ten}
                      {!n.dang_hoat_dong && (
                        <span className="nhan nhan-mo" style={{ marginLeft: 6 }}>đã nghỉ</span>
                      )}
                    </td>
                    <td className="so">
                      {n.pin_may ?? <span className="nhan nhan-xau">chưa có</span>}
                    </td>
                    <td>{n.phong_ban ?? '—'}</td>
                    <td>{n.ca_lam ?? <span className="nhan nhan-canh-bao">chưa gán</span>}</td>
                    <td className="khong-ngat">{ngay_viet(n.ngay_vao)}</td>
                    <td className="canh-giua">
                      {n.duoc_cham_cong_dien_thoai
                        ? <span className="nhan nhan-lanh">bật</span>
                        : <span style={{ color: 'var(--chu-mo)' }}>—</span>}
                    </td>
                    <td className="canh-giua">
                      {n.co_tai_khoan
                        ? <span className="nhan nhan-tot">có</span>
                        : la_admin()
                          ? <button className="nut-nho nut-phang" onClick={() => dat_tao_tk_cho(n)}>
                              Tạo
                            </button>
                          : <span style={{ color: 'var(--chu-mo)' }}>—</span>}
                    </td>
                    {la_nhan_su() && (
                      <td>
                        <button className="nut-nho nut-phang" onClick={() => dat_dang_sua(n)}>
                          Sửa
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(dang_them || dang_sua !== null) && (
        <FormNhanVien
          nhan_vien={dang_sua}
          cac_ca={(ca.du_lieu ?? []).filter((c) => c.dang_hoat_dong)}
          cac_phong={phong.du_lieu ?? []}
          khi_dong={() => {
            dat_dang_them(false);
            dat_dang_sua(null);
          }}
          khi_xong={() => {
            dat_dang_them(false);
            dat_dang_sua(null);
            nap_lai();
          }}
        />
      )}

      {tao_tk_cho !== null && (
        <FormTaoTaiKhoan
          nhan_vien={tao_tk_cho}
          khi_dong={() => dat_tao_tk_cho(null)}
          khi_xong={() => {
            dat_tao_tk_cho(null);
            nap_lai();
          }}
        />
      )}
    </>
  );
}

// ============================================================ form nhan vien
interface FormProps {
  nhan_vien: NhanVien | null;
  cac_ca: CaLam[];
  cac_phong: PhongBan[];
  khi_dong: () => void;
  khi_xong: () => void;
}

function FormNhanVien({ nhan_vien, cac_ca, cac_phong, khi_dong, khi_xong }: FormProps): ReactNode {
  const [f, dat_f] = useState({
    ma_nv: nhan_vien?.ma_nv ?? '',
    ho_ten: nhan_vien?.ho_ten ?? '',
    pin_may: nhan_vien?.pin_may ?? '',
    ma_erp: nhan_vien?.ma_erp ?? '',
    phong_ban_id: nhan_vien?.phong_ban_id ?? '',
    ca_lam_id: nhan_vien?.ca_lam_id ?? '',
    ngay_vao: nhan_vien?.ngay_vao ?? '',
    so_dien_thoai: nhan_vien?.so_dien_thoai ?? '',
    email: nhan_vien?.email ?? '',
    duoc_cham_cong_dien_thoai: nhan_vien?.duoc_cham_cong_dien_thoai ?? false,
  });
  const hd = dung_hanh_dong();

  const doi = (khoa: keyof typeof f, gt: string | boolean): void =>
    dat_f((cu) => ({ ...cu, [khoa]: gt }));

  const gui = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const than = {
      ma_nv: f.ma_nv.trim(),
      ho_ten: f.ho_ten.trim(),
      pin_may: f.pin_may.trim() === '' ? null : f.pin_may.trim(),
      ma_erp: f.ma_erp.trim() === '' ? null : f.ma_erp.trim(),
      phong_ban_id: f.phong_ban_id === '' ? null : f.phong_ban_id,
      ca_lam_id: f.ca_lam_id === '' ? null : f.ca_lam_id,
      ngay_vao: f.ngay_vao === '' ? null : f.ngay_vao,
      so_dien_thoai: f.so_dien_thoai.trim() === '' ? null : f.so_dien_thoai.trim(),
      email: f.email.trim() === '' ? null : f.email.trim(),
      duoc_cham_cong_dien_thoai: f.duoc_cham_cong_dien_thoai,
    };
    const ok = await hd.chay(() =>
      nhan_vien === null
        ? goi('/api/nhan-vien', { method: 'POST', body: than })
        : goi(`/api/nhan-vien/${nhan_vien.id}`, { method: 'PUT', body: than }),
    );
    if (ok) khi_xong();
  };

  const cho_nghi = async (): Promise<void> => {
    if (nhan_vien === null) return;
    if (!window.confirm(
      `Cho ${nhan_vien.ho_ten} nghỉ việc? Lịch sử chấm công được giữ lại, tài khoản đăng nhập bị vô hiệu hóa.`,
    )) return;
    const ok = await hd.chay(() =>
      goi(`/api/nhan-vien/${nhan_vien.id}/nghi-viec`, { method: 'POST', body: {} }),
    );
    if (ok) khi_xong();
  };

  return (
    <HopThoai
      tieu_de={nhan_vien === null ? 'Thêm nhân viên' : `Sửa: ${nhan_vien.ho_ten}`}
      khi_dong={khi_dong}
    >
      <form onSubmit={gui}>
        <HopLoi loi={hd.loi} />

        <div className="luoi luoi-2">
          <div className="o-nhap">
            <label htmlFor="ma">Mã nhân viên *</label>
            <input id="ma" value={f.ma_nv} onChange={(e) => doi('ma_nv', e.target.value)} required />
          </div>
          <div className="o-nhap">
            <label htmlFor="ht">Họ tên *</label>
            <input id="ht" value={f.ho_ten} onChange={(e) => doi('ho_ten', e.target.value)} required />
          </div>
        </div>

        <div className="o-nhap">
          <label htmlFor="pin">PIN trên máy chấm công</label>
          <input id="pin" value={f.pin_may} onChange={(e) => doi('pin_may', e.target.value)}
            inputMode="numeric" placeholder="1001" />
          <div className="goi-y">
            Phải trùng đúng số ID đã khai trên máy ZKTeco. Chỉ gồm chữ số.
          </div>
        </div>

        <div className="luoi luoi-2">
          <div className="o-nhap">
            <label htmlFor="pb">Phòng ban</label>
            <select id="pb" value={f.phong_ban_id} onChange={(e) => doi('phong_ban_id', e.target.value)}>
              <option value="">— Chưa gán —</option>
              {cac_phong.map((p) => <option key={p.id} value={p.id}>{p.ten}</option>)}
            </select>
          </div>
          <div className="o-nhap">
            <label htmlFor="cl">Ca làm việc</label>
            <select id="cl" value={f.ca_lam_id} onChange={(e) => doi('ca_lam_id', e.target.value)}>
              <option value="">— Chưa gán —</option>
              {cac_ca.map((c) => <option key={c.id} value={c.id}>{c.ten}</option>)}
            </select>
          </div>
        </div>

        <div className="luoi luoi-2">
          <div className="o-nhap">
            <label htmlFor="nv">Ngày vào làm</label>
            <input id="nv" type="date" value={f.ngay_vao} onChange={(e) => doi('ngay_vao', e.target.value)} />
          </div>
          <div className="o-nhap">
            <label htmlFor="erp">Mã bên ERP</label>
            <input id="erp" value={f.ma_erp} onChange={(e) => doi('ma_erp', e.target.value)}
              placeholder="Để đồng bộ bảng lương" />
          </div>
        </div>

        <div className="luoi luoi-2">
          <div className="o-nhap">
            <label htmlFor="sdt">Số điện thoại</label>
            <input id="sdt" value={f.so_dien_thoai} onChange={(e) => doi('so_dien_thoai', e.target.value)} />
          </div>
          <div className="o-nhap">
            <label htmlFor="em">Email</label>
            <input id="em" type="email" value={f.email} onChange={(e) => doi('email', e.target.value)} />
          </div>
        </div>

        <div className="o-nhap-ngang">
          <input id="ccdt" type="checkbox" checked={f.duoc_cham_cong_dien_thoai}
            onChange={(e) => doi('duoc_cham_cong_dien_thoai', e.target.checked)} />
          <label htmlFor="ccdt">Cho phép chấm công bằng điện thoại (GPS + selfie)</label>
        </div>
        <div className="goi-y" style={{ marginTop: -8, marginBottom: 12 }}>
          Chỉ bật cho người thường xuyên đi công tác / công trường. Chấm công ngoài phạm vi địa điểm
          đã khai vẫn phải chờ nhân sự duyệt mới được tính công.
        </div>

        <div className="hang-nut">
          <button type="submit" className="nut-chinh" disabled={hd.dang_chay}>
            {hd.dang_chay ? 'Đang lưu…' : 'Lưu'}
          </button>
          <button type="button" onClick={khi_dong}>Hủy</button>
          {nhan_vien !== null && nhan_vien.dang_hoat_dong && (
            <button type="button" className="nut-nguy" style={{ marginLeft: 'auto' }}
              onClick={cho_nghi} disabled={hd.dang_chay}>
              Cho nghỉ việc
            </button>
          )}
        </div>
      </form>
    </HopThoai>
  );
}

// ============================================================ tao tai khoan dang nhap
function FormTaoTaiKhoan(
  { nhan_vien, khi_dong, khi_xong }:
  { nhan_vien: NhanVien; khi_dong: () => void; khi_xong: () => void },
): ReactNode {
  const goi_y_ten = nhan_vien.ma_nv.toLowerCase().replace(/[^a-z0-9._-]/g, '');
  const [ten, dat_ten] = useState(goi_y_ten);
  const [mk, dat_mk] = useState('');
  const [vai_tro, dat_vai_tro] = useState<'nhan_vien' | 'truong_phong'>('nhan_vien');
  const hd = dung_hanh_dong();

  const gui = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const ok = await hd.chay(() => goi('/api/nguoi-dung', {
      method: 'POST',
      body: { ten_dang_nhap: ten.trim(), mat_khau: mk, vai_tro, nhan_vien_id: nhan_vien.id },
    }));
    if (ok) khi_xong();
  };

  return (
    <HopThoai tieu_de={`Tạo tài khoản cho ${nhan_vien.ho_ten}`} khi_dong={khi_dong}>
      <form onSubmit={gui}>
        <HopLoi loi={hd.loi} />

        <div className="hop-thong-bao hop-tin">
          Tài khoản này dùng để đăng nhập <strong>app điện thoại</strong>. Hệ thống sẽ bắt nhân viên
          đổi mật khẩu ở lần đăng nhập đầu tiên.
        </div>

        <div className="o-nhap">
          <label htmlFor="tdn">Tên đăng nhập *</label>
          <input id="tdn" value={ten} onChange={(e) => dat_ten(e.target.value)} required />
          <div className="goi-y">Chỉ chữ không dấu, số và các ký tự . _ -</div>
        </div>

        <div className="o-nhap">
          <label htmlFor="mkm">Mật khẩu tạm *</label>
          <input id="mkm" value={mk} onChange={(e) => dat_mk(e.target.value)} required />
          <div className="goi-y">Tối thiểu 8 ký tự, có cả chữ và số. Đọc cho nhân viên rồi họ tự đổi.</div>
        </div>

        <div className="o-nhap">
          <label htmlFor="vt">Vai trò</label>
          <select id="vt" value={vai_tro}
            onChange={(e) => dat_vai_tro(e.target.value as 'nhan_vien' | 'truong_phong')}>
            <option value="nhan_vien">{TEN_VAI_TRO['nhan_vien']} — chỉ xem công của mình</option>
            <option value="truong_phong">
              {TEN_VAI_TRO['truong_phong']} — xem và duyệt đơn của phòng mình
            </option>
          </select>
        </div>

        <div className="hang-nut">
          <button type="submit" className="nut-chinh" disabled={hd.dang_chay}>
            {hd.dang_chay ? 'Đang tạo…' : 'Tạo tài khoản'}
          </button>
          <button type="button" onClick={khi_dong}>Hủy</button>
        </div>
      </form>
    </HopThoai>
  );
}

export { type NhanVien };
