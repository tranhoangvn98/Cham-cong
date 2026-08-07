import { useEffect, useState, type ReactNode } from 'react';
import { cau_hinh_dang_nhap, dang_nhap, di_dang_nhap_microsoft, doi_mat_khau } from '../api.ts';
import { dung_hanh_dong, HopLoi, HopTot } from '../thanh_phan.tsx';

interface Props {
  khi_xong: () => void;
  /** Thong bao loi do may chu tra ve sau khi dang nhap Microsoft that bai. */
  loi_sso?: string | null;
}

export function TrangDangNhap({ khi_xong, loi_sso }: Props): ReactNode {
  const [ten, dat_ten] = useState('');
  const [mk, dat_mk] = useState('');
  const [co_microsoft, dat_co_microsoft] = useState(false);
  const hd = dung_hanh_dong();

  // May chu quyet dinh co hien nut hay khong: chua khai cau hinh Entra thi an han di,
  // hien mot nut bam vao chi bao loi thi to hon la khong co.
  useEffect(() => {
    let con_gan = true;
    void cau_hinh_dang_nhap().then((c) => { if (con_gan) dat_co_microsoft(c.dang_nhap_microsoft); });
    return () => { con_gan = false; };
  }, []);

  const gui = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const ok = await hd.chay(() => dang_nhap(ten.trim(), mk));
    if (ok) khi_xong();
  };

  return (
    <div className="vo-dang-nhap">
      <form className="the-dang-nhap" onSubmit={gui}>
        <h1>Chấm công</h1>
        <p className="mo-ta" style={{ marginBottom: 20 }}>
          Đăng nhập để quản lý chấm công và bảng công.
        </p>

        <HopLoi loi={hd.loi ?? loi_sso ?? null} />

        {co_microsoft && (
          <>
            <button
              type="button"
              className="nut-microsoft"
              onClick={di_dang_nhap_microsoft}
            >
              <span className="o-microsoft" aria-hidden="true">
                <span /><span /><span /><span />
              </span>
              Đăng nhập bằng Microsoft
            </button>
            <div className="vach-hoac"><span>hoặc</span></div>
          </>
        )}

        <div className="o-nhap">
          <label htmlFor="ten">Tên đăng nhập</label>
          <input
            id="ten"
            value={ten}
            onChange={(e) => dat_ten(e.target.value)}
            autoComplete="username"
            autoFocus
            required
          />
        </div>

        <div className="o-nhap">
          <label htmlFor="mk">Mật khẩu</label>
          <input
            id="mk"
            type="password"
            value={mk}
            onChange={(e) => dat_mk(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        <button
          type="submit"
          className="nut-chinh"
          style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
          disabled={hd.dang_chay || ten.trim() === '' || mk === ''}
        >
          {hd.dang_chay ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>
      </form>
    </div>
  );
}

/** Buoc bat buoc doi mat khau khi tai khoan moi tao / vua duoc dat lai. */
export function TrangDoiMatKhau({ bat_buoc, khi_xong }: { bat_buoc: boolean; khi_xong: () => void }): ReactNode {
  const [cu, dat_cu] = useState('');
  const [moi, dat_moi] = useState('');
  const [lai, dat_lai] = useState('');
  const hd = dung_hanh_dong();

  const khop = moi !== '' && moi === lai;

  const gui = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!khop) return;
    const ok = await hd.chay(
      () => doi_mat_khau(cu, moi),
      'Đã đổi mật khẩu. Vui lòng đăng nhập lại.',
    );
    if (ok) setTimeout(khi_xong, 1200);
  };

  return (
    <div className="vo-dang-nhap">
      <form className="the-dang-nhap" onSubmit={gui}>
        <h1>Đổi mật khẩu</h1>
        <p className="mo-ta" style={{ marginBottom: 20 }}>
          {bat_buoc
            ? 'Mật khẩu hiện tại do quản trị đặt. Bạn phải đổi trước khi dùng hệ thống.'
            : 'Đổi mật khẩu sẽ đăng xuất mọi thiết bị khác.'}
        </p>

        <HopLoi loi={hd.loi} />
        <HopTot chu={hd.tot} />

        <div className="o-nhap">
          <label htmlFor="cu">Mật khẩu hiện tại</label>
          <input id="cu" type="password" value={cu} onChange={(e) => dat_cu(e.target.value)}
            autoComplete="current-password" required />
        </div>

        <div className="o-nhap">
          <label htmlFor="moi">Mật khẩu mới</label>
          <input id="moi" type="password" value={moi} onChange={(e) => dat_moi(e.target.value)}
            autoComplete="new-password" required />
          <div className="goi-y">Tối thiểu 8 ký tự, có cả chữ và số.</div>
        </div>

        <div className="o-nhap">
          <label htmlFor="lai">Nhập lại mật khẩu mới</label>
          <input id="lai" type="password" value={lai} onChange={(e) => dat_lai(e.target.value)}
            autoComplete="new-password" required />
          {lai !== '' && !khop && <div className="goi-y" style={{ color: 'var(--xau)' }}>
            Hai lần nhập chưa khớp.
          </div>}
        </div>

        <button type="submit" className="nut-chinh"
          style={{ width: '100%', justifyContent: 'center' }}
          disabled={hd.dang_chay || !khop || cu === ''}>
          {hd.dang_chay ? 'Đang đổi…' : 'Đổi mật khẩu'}
        </button>
      </form>
    </div>
  );
}
