import { useState, type ReactNode } from 'react';
import { goi, la_nhan_su } from '../api.ts';
import {
  DangTai, HopLoi, HopTot, HopThoai, Trong, dung_hanh_dong, dung_nap, ngay_gio,
} from '../thanh_phan.tsx';
import type { NhanVien } from './nhan_vien.tsx';

interface ThietBi {
  id: string;
  serial: string;
  ten: string;
  vi_tri: string;
  dang_bat: boolean;
  phien_ban_firmware: string | null;
  dia_chi_ip: string | null;
  thay_lan_cuoi: string | null;
  dang_online: boolean;
  lenh_cho: number;
}

interface Lenh {
  id: number;
  lenh: string;
  tao_luc: string;
  gui_luc: string | null;
  ma_tra_ve: number | null;
  bao_luc: string | null;
}

export function TrangThietBi(): ReactNode {
  const [dang_them, dat_dang_them] = useState(false);
  const [xem_lenh, dat_xem_lenh] = useState<ThietBi | null>(null);
  const [nap_nv_cho, dat_nap_nv_cho] = useState<ThietBi | null>(null);
  const hd = dung_hanh_dong();

  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<ThietBi[]>('/api/thiet-bi');

  const lenh_may = async (serial: string, duong_dan: string, thong_bao: string): Promise<void> => {
    await hd.chay(
      () => goi(`/api/thiet-bi/${encodeURIComponent(serial)}/${duong_dan}`, { method: 'POST', body: {} }),
      thong_bao,
    );
    nap_lai();
  };

  const bat_tat = async (tb: ThietBi): Promise<void> => {
    await hd.chay(
      () => goi(`/api/thiet-bi/${tb.id}`, { method: 'PATCH', body: { dang_bat: !tb.dang_bat } }),
      tb.dang_bat
        ? 'Đã tắt máy. Máy này sẽ bị hệ thống từ chối (401) cho tới khi bật lại.'
        : 'Đã bật lại máy.',
    );
    nap_lai();
  };

  return (
    <>
      <div className="dau-trang">
        <div>
          <p className="mo-ta">
            Chỉ máy có serial khai ở đây mới được nhận dữ liệu — đây là lớp chặn máy lạ.
          </p>
        </div>
        {la_nhan_su() && (
          <button className="nut-chinh" onClick={() => dat_dang_them(true)}>+ Khai báo máy</button>
        )}
      </div>

      <HopLoi loi={hd.loi} />
      <HopTot chu={hd.tot} />
      <HopLoi loi={loi} />

      <div className="the">
        <h2>Cấu hình trên máy ZKTeco</h2>
        <p className="mo-ta" style={{ marginBottom: 0 }}>
          Trên máy: <strong>Menu › Comm › Cloud Server / ADMS</strong>. Đặt Server Mode =
          {' '}<strong>ADMS</strong>, Server Address = địa chỉ IP máy chủ này, Port ={' '}
          <strong>8080</strong>, bật <strong>Realtime</strong> (Enable Domain Name = tắt nếu dùng IP).
          Sau đó khai serial máy (dán sau lưng máy) vào danh sách dưới đây.
        </p>
      </div>

      <div className="the the-mong">
        {dang_tai ? <DangTai /> : (du_lieu ?? []).length === 0 ? (
          <Trong
            tieu_de="Chưa khai báo máy nào"
            mo_ta="Khai báo serial máy để hệ thống nhận log chấm công."
          />
        ) : (
          <div className="vo-bang">
            <table>
              <thead>
                <tr>
                  <th>Máy</th>
                  <th>Vị trí</th>
                  <th>Trạng thái</th>
                  <th>Firmware</th>
                  <th>IP</th>
                  <th>Tín hiệu cuối</th>
                  <th className="canh-giua">Lệnh chờ</th>
                  {la_nhan_su() && <th></th>}
                </tr>
              </thead>
              <tbody>
                {(du_lieu ?? []).map((tb) => (
                  <tr key={tb.id} style={tb.dang_bat ? undefined : { opacity: 0.55 }}>
                    <td>
                      <strong>{tb.ten}</strong>
                      <div className="o-so-phu so">{tb.serial}</div>
                    </td>
                    <td>{tb.vi_tri}</td>
                    <td className="khong-ngat">
                      {!tb.dang_bat ? (
                        <span className="nhan nhan-mo">đã tắt</span>
                      ) : (
                        <>
                          <i className={`diem ${tb.dang_online ? 'diem-tot' : 'diem-xau'}`} />
                          {tb.dang_online ? 'Kết nối' : 'Mất kết nối'}
                        </>
                      )}
                    </td>
                    <td style={{ fontSize: 12 }}>{tb.phien_ban_firmware ?? '—'}</td>
                    <td className="so" style={{ fontSize: 12 }}>{tb.dia_chi_ip ?? '—'}</td>
                    <td className="khong-ngat">{ngay_gio(tb.thay_lan_cuoi)}</td>
                    <td className="canh-giua so">
                      {Number(tb.lenh_cho) > 0
                        ? <span className="nhan nhan-canh-bao">{tb.lenh_cho}</span>
                        : '—'}
                    </td>
                    {la_nhan_su() && (
                      <td>
                        <div className="hang-nut">
                          <button className="nut-nho" onClick={() => dat_nap_nv_cho(tb)}
                            title="Nạp một nhân viên xuống máy">
                            Nạp NV
                          </button>
                          <button className="nut-nho"
                            onClick={() => lenh_may(tb.serial, 'dong-bo-gio',
                              'Đã xếp lệnh đồng bộ giờ. Máy sẽ nhận ở lần kết nối kế tiếp.')}
                            title="Lệch giờ máy là nguyên nhân phổ biến nhất làm sai công">
                            Đồng bộ giờ
                          </button>
                          <button className="nut-nho"
                            onClick={() => lenh_may(tb.serial, 'gui-lai-log',
                              'Đã yêu cầu máy gửi lại log. Bản ghi trùng sẽ tự bị bỏ qua.')}>
                            Gửi lại log
                          </button>
                          <button className="nut-nho nut-phang" onClick={() => dat_xem_lenh(tb)}>
                            Lịch sử lệnh
                          </button>
                          <button className="nut-nho nut-phang" onClick={() => bat_tat(tb)}>
                            {tb.dang_bat ? 'Tắt' : 'Bật'}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {dang_them && (
        <FormThietBi
          khi_dong={() => dat_dang_them(false)}
          khi_xong={() => { dat_dang_them(false); nap_lai(); }}
        />
      )}

      {xem_lenh !== null && (
        <LichSuLenh thiet_bi={xem_lenh} khi_dong={() => dat_xem_lenh(null)} />
      )}

      {nap_nv_cho !== null && (
        <NapNhanVien
          thiet_bi={nap_nv_cho}
          khi_dong={() => dat_nap_nv_cho(null)}
          khi_xong={() => { dat_nap_nv_cho(null); nap_lai(); }}
        />
      )}
    </>
  );
}

function FormThietBi({ khi_dong, khi_xong }: { khi_dong: () => void; khi_xong: () => void }): ReactNode {
  const [serial, dat_serial] = useState('');
  const [ten, dat_ten] = useState('');
  const [vi_tri, dat_vi_tri] = useState('');
  const hd = dung_hanh_dong();

  const gui = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const ok = await hd.chay(() => goi('/api/thiet-bi', {
      method: 'POST',
      body: {
        serial: serial.trim(),
        ten: ten.trim(),
        vi_tri: vi_tri.trim() === '' ? null : vi_tri.trim(),
      },
    }));
    if (ok) khi_xong();
  };

  return (
    <HopThoai tieu_de="Khai báo máy chấm công" khi_dong={khi_dong}>
      <form onSubmit={gui}>
        <HopLoi loi={hd.loi} />
        <div className="o-nhap">
          <label htmlFor="sn">Serial máy *</label>
          <input id="sn" value={serial} onChange={(e) => dat_serial(e.target.value)} required autoFocus />
          <div className="goi-y">
            Số serial dán sau lưng máy (SN). Phải khớp tuyệt đối, có phân biệt chữ hoa/thường.
          </div>
        </div>
        <div className="o-nhap">
          <label htmlFor="tn">Tên gợi nhớ *</label>
          <input id="tn" value={ten} onChange={(e) => dat_ten(e.target.value)}
            placeholder="Cửa chính" required />
        </div>
        <div className="o-nhap">
          <label htmlFor="vt">Vị trí</label>
          <input id="vt" value={vi_tri} onChange={(e) => dat_vi_tri(e.target.value)}
            placeholder="Tầng 1, VP Hà Nội" />
        </div>
        <div className="hang-nut">
          <button type="submit" className="nut-chinh" disabled={hd.dang_chay}>
            {hd.dang_chay ? 'Đang lưu…' : 'Khai báo'}
          </button>
          <button type="button" onClick={khi_dong}>Hủy</button>
        </div>
      </form>
    </HopThoai>
  );
}

function LichSuLenh({ thiet_bi, khi_dong }: { thiet_bi: ThietBi; khi_dong: () => void }): ReactNode {
  const { du_lieu, dang_tai, loi } = dung_nap<Lenh[]>(
    `/api/thiet-bi/${encodeURIComponent(thiet_bi.serial)}/lenh`,
  );

  return (
    <HopThoai tieu_de={`Lịch sử lệnh — ${thiet_bi.ten}`} khi_dong={khi_dong} rong>
      <HopLoi loi={loi} />
      {dang_tai ? <DangTai /> : (du_lieu ?? []).length === 0 ? (
        <Trong tieu_de="Chưa gửi lệnh nào cho máy này" />
      ) : (
        <div className="vo-bang">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Lệnh</th>
                <th>Xếp lúc</th>
                <th>Máy nhận</th>
                <th>Kết quả</th>
              </tr>
            </thead>
            <tbody>
              {(du_lieu ?? []).map((l) => (
                <tr key={l.id}>
                  <td className="so">{l.id}</td>
                  <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11.5, maxWidth: 260 }}>
                    {l.lenh}
                  </td>
                  <td className="khong-ngat">{ngay_gio(l.tao_luc)}</td>
                  <td className="khong-ngat">
                    {l.gui_luc === null
                      ? <span className="nhan nhan-canh-bao">đang chờ</span>
                      : ngay_gio(l.gui_luc)}
                  </td>
                  <td>
                    {l.ma_tra_ve === null
                      ? <span style={{ color: 'var(--chu-mo)' }}>—</span>
                      : l.ma_tra_ve === 0
                        ? <span className="nhan nhan-tot">thành công</span>
                        : <span className="nhan nhan-xau">lỗi {l.ma_tra_ve}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </HopThoai>
  );
}

function NapNhanVien(
  { thiet_bi, khi_dong, khi_xong }:
  { thiet_bi: ThietBi; khi_dong: () => void; khi_xong: () => void },
): ReactNode {
  const [nhan_vien_id, dat_nhan_vien_id] = useState('');
  const hd = dung_hanh_dong();
  const { du_lieu } = dung_nap<NhanVien[]>('/api/nhan-vien?chi_dang_lam=true');
  const co_pin = (du_lieu ?? []).filter((n) => n.pin_may !== null);

  const gui = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const ok = await hd.chay(() => goi(
      `/api/thiet-bi/${encodeURIComponent(thiet_bi.serial)}/nap-nhan-vien`,
      { method: 'POST', body: { nhan_vien_id } },
    ));
    if (ok) khi_xong();
  };

  return (
    <HopThoai tieu_de={`Nạp nhân viên xuống ${thiet_bi.ten}`} khi_dong={khi_dong}>
      <form onSubmit={gui}>
        <HopLoi loi={hd.loi} />

        <div className="hop-thong-bao hop-tin">
          Lệnh này tạo user trên máy theo PIN đã khai. Nhân viên vẫn phải <strong>đăng ký khuôn
          mặt / vân tay trực tiếp tại máy</strong> — sinh trắc học không nạp được từ xa.
        </div>

        <div className="o-nhap">
          <label htmlFor="nvid">Nhân viên *</label>
          <select id="nvid" value={nhan_vien_id}
            onChange={(e) => dat_nhan_vien_id(e.target.value)} required>
            <option value="">— Chọn nhân viên —</option>
            {co_pin.map((n) => (
              <option key={n.id} value={n.id}>{n.ma_nv} — {n.ho_ten} (PIN {n.pin_may})</option>
            ))}
          </select>
          {co_pin.length === 0 && (
            <div className="goi-y" style={{ color: 'var(--xau)' }}>
              Chưa có nhân viên nào được gán PIN máy.
            </div>
          )}
        </div>

        <div className="hang-nut">
          <button type="submit" className="nut-chinh" disabled={hd.dang_chay || nhan_vien_id === ''}>
            {hd.dang_chay ? 'Đang xếp lệnh…' : 'Nạp xuống máy'}
          </button>
          <button type="button" onClick={khi_dong}>Hủy</button>
        </div>
      </form>
    </HopThoai>
  );
}
