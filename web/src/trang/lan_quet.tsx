// Nhat ky quet tho: nguon su that de doi chieu khi co tranh chap bang cong.
import { useState, type ReactNode } from 'react';
import { goi, la_nhan_su, tai_tep } from '../api.ts';
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

const MOI_TRANG = 200;

export function TrangLanQuet(): ReactNode {
  const [tu, dat_tu] = useState(hom_nay());
  const [den, dat_den] = useState(hom_nay());
  const [nhan_vien_id, dat_nhan_vien_id] = useState('');
  const [thiet_bi_serial, dat_thiet_bi_serial] = useState('');
  const [nguon, dat_nguon] = useState('');
  const [trang_thai_duyet, dat_trang_thai_duyet] = useState('');
  const [so_dong, dat_so_dong] = useState(MOI_TRANG);
  const [gan_lai_pin, dat_gan_lai_pin] = useState<string | null>(null);
  const hd = dung_hanh_dong();

  // Doi bo loc thi quay ve trang dau — giu nguyen so dong da mo rong se hieu nham la
  // "khong co them du lieu" trong khi thuc ra dang xem ket qua cua bo loc cu.
  const doi_loc = (dat: (v: string) => void) => (v: string): void => {
    dat(v);
    dat_so_dong(MOI_TRANG);
  };

  const chuoi_loc = [
    `tu=${tu}`, `den=${den}`, `gioi_han=${so_dong}`,
    nhan_vien_id === '' ? '' : `nhan_vien_id=${nhan_vien_id}`,
    thiet_bi_serial === '' ? '' : `thiet_bi_serial=${encodeURIComponent(thiet_bi_serial)}`,
    nguon === '' ? '' : `nguon=${nguon}`,
    trang_thai_duyet === '' ? '' : `trang_thai_duyet=${trang_thai_duyet}`,
  ].filter((x) => x !== '').join('&');

  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<LanQuet[]>(`/api/lan-quet?${chuoi_loc}`);
  const chua_map = dung_nap<ChuaMap[]>(la_nhan_su() ? '/api/lan-quet/chua-map' : null);
  const ds_nv = dung_nap<NhanVien[]>(la_nhan_su() ? '/api/nhan-vien' : null);
  const ds_tb = dung_nap<{ serial: string; ten: string }[]>(la_nhan_su() ? '/api/thiet-bi' : null);

  const xuat = async (): Promise<void> => {
    await hd.chay(
      () => tai_tep(
        `/api/lan-quet/xuat-csv?${chuoi_loc.replace(/&?gioi_han=\d+/, '')}`,
        `lan_quet_${tu}_${den}.csv`,
      ),
      'Đã tải tệp CSV.',
    );
  };

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
          <input id="tu" type="date" value={tu}
            onChange={(e) => doi_loc(dat_tu)(e.target.value)} />
        </div>
        <div className="o-nhap">
          <label htmlFor="den">Đến ngày</label>
          <input id="den" type="date" value={den}
            onChange={(e) => doi_loc(dat_den)(e.target.value)} />
        </div>

        {la_nhan_su() && (
          <>
            <div className="o-nhap">
              <label htmlFor="lnv">Nhân viên</label>
              <select id="lnv" value={nhan_vien_id}
                onChange={(e) => doi_loc(dat_nhan_vien_id)(e.target.value)}>
                <option value="">Tất cả</option>
                {(ds_nv.du_lieu ?? []).map((n) => (
                  <option key={n.id} value={n.id}>{n.ho_ten} ({n.ma_nv})</option>
                ))}
              </select>
            </div>
            <div className="o-nhap">
              <label htmlFor="ltb">Máy chấm công</label>
              <select id="ltb" value={thiet_bi_serial}
                onChange={(e) => doi_loc(dat_thiet_bi_serial)(e.target.value)}>
                <option value="">Tất cả</option>
                {(ds_tb.du_lieu ?? []).map((t) => (
                  <option key={t.serial} value={t.serial}>{t.ten} ({t.serial})</option>
                ))}
              </select>
            </div>
          </>
        )}

        <div className="o-nhap">
          <label htmlFor="lng">Nguồn</label>
          <select id="lng" value={nguon} onChange={(e) => doi_loc(dat_nguon)(e.target.value)}>
            <option value="">Tất cả</option>
            <option value="may">Máy chấm công</option>
            <option value="dien_thoai">Điện thoại</option>
            <option value="thu_cong">Nhập tay</option>
          </select>
        </div>
        <div className="o-nhap">
          <label htmlFor="ltt">Trạng thái duyệt</label>
          <select id="ltt" value={trang_thai_duyet}
            onChange={(e) => doi_loc(dat_trang_thai_duyet)(e.target.value)}>
            <option value="">Tất cả</option>
            <option value="tu_dong">Tự động (máy)</option>
            <option value="cho_duyet">Chờ duyệt</option>
            <option value="da_duyet">Đã duyệt</option>
            <option value="tu_choi">Từ chối</option>
          </select>
        </div>

        {la_nhan_su() && (
          <div className="o-nhap" style={{ justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => void xuat()} disabled={hd.dang_chay}>
              {hd.dang_chay ? 'Đang xuất…' : 'Xuất CSV'}
            </button>
          </div>
        )}

        <div className="goi-y" style={{ marginBottom: 6 }}>
          Tối đa 31 ngày mỗi lần xem. Bản CSV xuất hết khoảng đã chọn, không giới hạn số dòng
          hiển thị.
        </div>
      </div>

      <HopLoi loi={loi} />
      <HopLoi loi={hd.loi} />
      <HopTot chu={hd.tot} />

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

      {(du_lieu ?? []).length > 0 && (
        <div className="hang-nut" style={{ justifyContent: 'center', marginBottom: 16 }}>
          <span className="mo-ta">Đang hiện {(du_lieu ?? []).length} dòng</span>
          {/* Day du MOI_TRANG dong nghia la con nua — chua chac, nhung dung mot truy van
              dem rieng cho mot bang co the rat lon thi khong dang. */}
          {(du_lieu ?? []).length >= so_dong && (
            <button type="button" onClick={() => dat_so_dong(so_dong + MOI_TRANG)}>
              Xem thêm {MOI_TRANG} dòng
            </button>
          )}
        </div>
      )}

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
