// Nhat ky quet tho: nguon su that de doi chieu khi co tranh chap bang cong.
import { useState, type ReactNode } from 'react';
import { goi, la_nhan_su } from '../api.ts';
import {
  DangTai, HopLoi, HopTot, HopThoai, NhanDon, TEN_NGUON, Trong,
  dung_hanh_dong, dung_nap, hom_nay, ngay_gio,
} from '../thanh_phan.tsx';
import type { NhanVien } from './nhan_vien.tsx';

interface LanQuet {
  id: string;
  nguon: string;
  thiet_bi_serial: string | null;
  thiet_bi: string | null;
  pin_may: string | null;
  thoi_diem: string;
  trang_thai: number;
  nhan_trang_thai: string;
  nhan_xac_thuc: string;
  trang_thai_duyet: string;
  khoang_cach_m: number | null;
  dia_diem: string | null;
  ghi_chu: string | null;
  nhan_vien_id: string | null;
  ma_nv: string | null;
  ho_ten: string | null;
}

interface ChuaMap {
  pin_may: string;
  thiet_bi_serial: string | null;
  so_lan: number;
  lan_dau: string;
  lan_cuoi: string;
}

export function TrangLanQuet(): ReactNode {
  const [tu, dat_tu] = useState(hom_nay());
  const [den, dat_den] = useState(hom_nay());
  const [gan_lai_pin, dat_gan_lai_pin] = useState<string | null>(null);

  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<LanQuet[]>(
    `/api/lan-quet?tu=${tu}&den=${den}&gioi_han=300`,
  );
  const chua_map = dung_nap<ChuaMap[]>(la_nhan_su() ? '/api/lan-quet/chua-map' : null);

  return (
    <>
      <div className="dau-trang">
        <div>
          <p className="mo-ta">
            Dữ liệu thô từ máy, không bao giờ bị sửa. Dùng để đối chiếu khi nhân viên thắc mắc bảng công.
          </p>
        </div>
      </div>

      {la_nhan_su() && (chua_map.du_lieu ?? []).length > 0 && (
        <div className="the">
          <h2 style={{ color: 'var(--canh-bao)' }}>PIN chưa gán cho nhân viên nào</h2>
          <p className="mo-ta">
            Máy đã ghi nhận những PIN này nhưng hệ thống không biết là ai, nên công không được tính.
            Hãy khai PIN cho nhân viên rồi bấm "Gán lại" để tính bù các ngày đã qua.
          </p>
          <div className="vo-bang">
            <table>
              <thead>
                <tr>
                  <th>PIN</th>
                  <th>Máy</th>
                  <th className="canh-phai">Số lần</th>
                  <th>Lần đầu</th>
                  <th>Lần cuối</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(chua_map.du_lieu ?? []).map((c) => (
                  <tr key={`${c.pin_may}|${c.thiet_bi_serial ?? ''}`}>
                    <td className="so"><strong>{c.pin_may}</strong></td>
                    <td className="so" style={{ fontSize: 12 }}>{c.thiet_bi_serial ?? '—'}</td>
                    <td className="canh-phai so">{c.so_lan}</td>
                    <td className="khong-ngat" style={{ fontSize: 12 }}>{ngay_gio(c.lan_dau)}</td>
                    <td className="khong-ngat" style={{ fontSize: 12 }}>{ngay_gio(c.lan_cuoi)}</td>
                    <td>
                      <button className="nut-nho" onClick={() => dat_gan_lai_pin(c.pin_may)}>
                        Gán lại
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bo-loc">
        <div className="o-nhap">
          <label htmlFor="tu">Từ ngày</label>
          <input id="tu" type="date" value={tu} onChange={(e) => dat_tu(e.target.value)} />
        </div>
        <div className="o-nhap">
          <label htmlFor="den">Đến ngày</label>
          <input id="den" type="date" value={den} onChange={(e) => dat_den(e.target.value)} />
        </div>
        <div className="goi-y" style={{ marginBottom: 6 }}>Tối đa 31 ngày, 300 dòng gần nhất.</div>
      </div>

      <HopLoi loi={loi} />

      <div className="the the-mong">
        {dang_tai ? <DangTai /> : (du_lieu ?? []).length === 0 ? (
          <Trong
            tieu_de="Không có lần quẹt nào trong khoảng này"
            mo_ta="Nếu máy đang kết nối mà vẫn trống, kiểm tra serial máy đã khai đúng chưa."
          />
        ) : (
          <div className="vo-bang">
            <table>
              <thead>
                <tr>
                  <th>Thời điểm</th>
                  <th>Nhân viên</th>
                  <th>PIN</th>
                  <th>Loại</th>
                  <th>Xác thực</th>
                  <th>Nguồn</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {(du_lieu ?? []).map((q) => (
                  <tr key={q.id}>
                    <td className="khong-ngat so">{ngay_gio(q.thoi_diem)}</td>
                    <td>
                      {q.ho_ten ?? <span className="nhan nhan-xau">chưa map</span>}
                      {q.ma_nv !== null && <div className="o-so-phu">{q.ma_nv}</div>}
                    </td>
                    <td className="so">{q.pin_may ?? '—'}</td>
                    <td className="khong-ngat">{q.nhan_trang_thai}</td>
                    <td className="khong-ngat" style={{ fontSize: 12 }}>{q.nhan_xac_thuc}</td>
                    <td style={{ fontSize: 12 }}>
                      {TEN_NGUON[q.nguon] ?? q.nguon}
                      {q.thiet_bi !== null && <div className="o-so-phu">{q.thiet_bi}</div>}
                      {q.dia_diem !== null && (
                        <div className="o-so-phu">
                          {q.dia_diem}
                          {q.khoang_cach_m === null ? '' : ` · ${q.khoang_cach_m}m`}
                        </div>
                      )}
                    </td>
                    <td>
                      <NhanDon trang_thai={q.trang_thai_duyet} />
                      {q.ghi_chu !== null && (
                        <div className="o-so-phu" style={{ maxWidth: 180 }}>{q.ghi_chu}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {gan_lai_pin !== null && (
        <FormGanLai
          pin={gan_lai_pin}
          khi_dong={() => dat_gan_lai_pin(null)}
          khi_xong={() => {
            dat_gan_lai_pin(null);
            nap_lai();
            chua_map.nap_lai();
          }}
        />
      )}
    </>
  );
}

function FormGanLai(
  { pin, khi_dong, khi_xong }: { pin: string; khi_dong: () => void; khi_xong: () => void },
): ReactNode {
  const [nhan_vien_id, dat_nhan_vien_id] = useState('');
  const hd = dung_hanh_dong();
  const { du_lieu } = dung_nap<NhanVien[]>('/api/nhan-vien?chi_dang_lam=true');

  const gui = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const ok = await hd.chay(
      () => goi('/api/lan-quet/gan-lai', {
        method: 'POST',
        body: { pin_may: pin, nhan_vien_id },
      }),
      'Đã gán lại và tính lại bảng công các ngày liên quan.',
    );
    if (ok) setTimeout(khi_xong, 900);
  };

  return (
    <HopThoai tieu_de={`Gán PIN ${pin} cho nhân viên`} khi_dong={khi_dong}>
      <form onSubmit={gui}>
        <HopLoi loi={hd.loi} />
        <HopTot chu={hd.tot} />

        <div className="hop-thong-bao hop-tin">
          Mọi lần quẹt của PIN <strong>{pin}</strong> chưa gán ai sẽ được chuyển sang nhân viên bạn
          chọn, và bảng công những ngày đó được tính lại.
        </div>

        <div className="o-nhap">
          <label htmlFor="nv">Nhân viên *</label>
          <select id="nv" value={nhan_vien_id} onChange={(e) => dat_nhan_vien_id(e.target.value)} required>
            <option value="">— Chọn nhân viên —</option>
            {(du_lieu ?? []).map((n) => (
              <option key={n.id} value={n.id}>
                {n.ma_nv} — {n.ho_ten}{n.pin_may === null ? '' : ` (PIN hiện tại ${n.pin_may})`}
              </option>
            ))}
          </select>
          <div className="goi-y">
            Nhớ sửa PIN của nhân viên này thành {pin} ở trang Nhân viên, nếu không log mới vẫn không map được.
          </div>
        </div>

        <div className="hang-nut">
          <button type="submit" className="nut-chinh" disabled={hd.dang_chay || nhan_vien_id === ''}>
            {hd.dang_chay ? 'Đang gán…' : 'Gán lại'}
          </button>
          <button type="button" onClick={khi_dong}>Hủy</button>
        </div>
      </form>
    </HopThoai>
  );
}
