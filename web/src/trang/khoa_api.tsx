// Quan ly khoa API cho he thong ngoai. Chi admin.
//
// Diem phai lam dung o trang nay: khoa goc CHI hien MOT lan, ngay sau khi tao. May chu chi
// giu ma bam nen khong the lay lai — neu nguoi dung dong hop thoai ma chua chep thi phai
// thu hoi va tao cai moi. Vi vay hop thoai hien khoa co canh bao ro va nut chep san.
import { useState, type ReactNode } from 'react';
import { goi } from '../api.ts';
import {
  DangTai, HopLoi, HopThoai, HopTot, Trong, dung_hanh_dong, dung_nap, ngay_gio,
} from '../thanh_phan.tsx';

interface KhoaApi {
  id: string;
  ten: string;
  tien_to: string;
  pham_vi: string[];
  dang_bat: boolean;
  het_han: string | null;
  ip_cho_phep: string | null;
  ghi_chu: string | null;
  tao_luc: string;
  dung_lan_cuoi: string | null;
  so_lan_dung: number;
  tao_boi: string | null;
}

interface DongNhatKy {
  duong_dan: string;
  phuong_thuc: string;
  ma_tra_ve: number;
  dia_chi_ip: string | null;
  mili_giay: number | null;
  tao_luc: string;
}

const PHAM_VI: { ma: string; nhan: string; mo_ta: string }[] = [
  { ma: 'nhan_vien:doc', nhan: 'Nhân viên — đọc', mo_ta: 'Danh sách và chi tiết nhân viên' },
  { ma: 'nhan_vien:ghi', nhan: 'Nhân viên — ghi', mo_ta: 'Tạo và cập nhật nhân viên' },
  { ma: 'bang_cong:doc', nhan: 'Bảng công — đọc', mo_ta: 'Bảng công theo ngày và tổng hợp tháng' },
  { ma: 'lan_quet:doc', nhan: 'Lần quẹt — đọc', mo_ta: 'Log quẹt thô từ máy' },
  { ma: 'nghi_phep:doc', nhan: 'Nghỉ phép — đọc', mo_ta: 'Đơn nghỉ đã duyệt' },
  { ma: 'ho_so:doc', nhan: 'Hồ sơ — đọc', mo_ta: 'Hồ sơ nhân sự' },
  { ma: 'su_kien:doc', nhan: 'Sự kiện — đọc', mo_ta: 'Dòng sự kiện để đồng bộ' },
];

export function TrangKhoaApi(): ReactNode {
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<KhoaApi[]>('/api/khoa-api');
  const [dang_tao, dat_dang_tao] = useState(false);
  const [khoa_moi, dat_khoa_moi] = useState<{ ten: string; khoa: string } | null>(null);
  const [xem_nhat_ky, dat_xem_nhat_ky] = useState<KhoaApi | null>(null);
  const hd = dung_hanh_dong();

  const bat_tat = async (k: KhoaApi): Promise<void> => {
    await hd.chay(
      () => goi(`/api/khoa-api/${k.id}`, { method: 'PATCH', body: { dang_bat: !k.dang_bat } }),
      k.dang_bat
        ? 'Đã tắt khóa. Hệ thống dùng khóa này sẽ nhận 401 ngay lần gọi tiếp theo.'
        : 'Đã bật lại khóa.',
    );
    nap_lai();
  };

  const xoa = async (k: KhoaApi): Promise<void> => {
    if (!window.confirm(
      `Xóa vĩnh viễn khóa "${k.ten}"?\n\n`
      + 'Hệ thống đang dùng khóa này sẽ ngừng lấy được dữ liệu ngay lập tức. '
      + 'Nếu chỉ muốn tạm dừng thì bấm "Tắt" thay vì xóa.',
    )) return;
    await hd.chay(() => goi(`/api/khoa-api/${k.id}`, { method: 'DELETE' }), 'Đã xóa khóa.');
    nap_lai();
  };

  return (
    <>
      <div className="dau-trang">
        <div>
          <p className="mo-ta">
            Khóa cho hệ thống ngoài gọi vào <code>/api/v1/*</code> — ERP, phần mềm nhân sự khác,
            cổng thông tin nội bộ. Mỗi bên tích hợp nên một khóa riêng với phạm vi tối thiểu.
          </p>
        </div>
        <button className="nut-chinh" onClick={() => dat_dang_tao(true)}>+ Tạo khóa API</button>
      </div>

      <HopLoi loi={hd.loi} />
      <HopTot chu={hd.tot} />
      <HopLoi loi={loi} />

      <div className="the the-mong">
        {dang_tai ? <DangTai /> : (du_lieu ?? []).length === 0 ? (
          <Trong
            tieu_de="Chưa có khóa API nào"
            mo_ta="Tạo khóa để hệ thống ngoài lấy được bảng công, nhân viên, sự kiện."
          />
        ) : (
          <div className="vo-bang">
            <table>
              <thead>
                <tr>
                  <th>Tên</th>
                  <th>Khóa</th>
                  <th>Phạm vi</th>
                  <th>Trạng thái</th>
                  <th className="canh-phai">Lượt gọi</th>
                  <th>Dùng lần cuối</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(du_lieu ?? []).map((k) => (
                  <tr key={k.id} style={k.dang_bat ? undefined : { opacity: 0.55 }}>
                    <td>
                      <strong>{k.ten}</strong>
                      {k.ghi_chu !== null && <div className="o-so-phu">{k.ghi_chu}</div>}
                      {k.ip_cho_phep !== null && k.ip_cho_phep !== '' && (
                        <div className="o-so-phu">chỉ từ IP: {k.ip_cho_phep}</div>
                      )}
                    </td>
                    <td className="so" style={{ fontSize: 12 }}>{k.tien_to}…</td>
                    <td style={{ fontSize: 12 }}>
                      {k.pham_vi.map((p) => (
                        <span key={p} className="nhan nhan-mo" style={{ marginRight: 4 }}>{p}</span>
                      ))}
                    </td>
                    <td className="khong-ngat">
                      {k.dang_bat
                        ? <><i className="diem diem-tot" />Đang bật</>
                        : <span className="nhan nhan-mo">đã tắt</span>}
                    </td>
                    <td className="canh-phai so">{k.so_lan_dung}</td>
                    <td className="khong-ngat">{ngay_gio(k.dung_lan_cuoi)}</td>
                    <td>
                      <div className="hang-nut">
                        <button className="nut-nho nut-phang" onClick={() => dat_xem_nhat_ky(k)}>
                          Nhật ký
                        </button>
                        <button className="nut-nho" onClick={() => bat_tat(k)}>
                          {k.dang_bat ? 'Tắt' : 'Bật'}
                        </button>
                        <button className="nut-nho nut-phang" onClick={() => xoa(k)}>Xóa</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {dang_tao && (
        <FormKhoa
          khi_dong={() => dat_dang_tao(false)}
          khi_xong={(ten, khoa) => {
            dat_dang_tao(false);
            dat_khoa_moi({ ten, khoa });
            nap_lai();
          }}
        />
      )}

      {khoa_moi !== null && (
        <HopThoaiKhoaMoi khoa={khoa_moi} khi_dong={() => dat_khoa_moi(null)} />
      )}

      {xem_nhat_ky !== null && (
        <HopThoaiNhatKy khoa={xem_nhat_ky} khi_dong={() => dat_xem_nhat_ky(null)} />
      )}
    </>
  );
}

function FormKhoa(
  { khi_dong, khi_xong }: { khi_dong: () => void; khi_xong: (ten: string, khoa: string) => void },
): ReactNode {
  const [ten, dat_ten] = useState('');
  const [ghi_chu, dat_ghi_chu] = useState('');
  const [ip_cho_phep, dat_ip] = useState('');
  const [chon, dat_chon] = useState<string[]>([]);
  const hd = dung_hanh_dong();

  const doi = (ma: string): void => {
    dat_chon((cu) => (cu.includes(ma) ? cu.filter((x) => x !== ma) : [...cu, ma]));
  };

  const gui = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    // Bat ket qua BEN TRONG callback: hd.chay chi tra ve true/false, ep kieu gia tri tra ve
    // cua no thanh doi tuong la mot loi da mac mot lan o phan nhap tu tep.
    const giu: { kq: { ten: string; khoa: string } | null } = { kq: null };
    const ok = await hd.chay(async () => {
      giu.kq = await goi<{ ten: string; khoa: string }>('/api/khoa-api', {
        method: 'POST',
        body: {
          ten: ten.trim(),
          ghi_chu: ghi_chu.trim() === '' ? null : ghi_chu.trim(),
          ip_cho_phep: ip_cho_phep.trim() === '' ? null : ip_cho_phep.trim(),
          pham_vi: chon,
        },
      });
    });
    if (ok && giu.kq !== null) khi_xong(giu.kq.ten, giu.kq.khoa);
  };

  return (
    <HopThoai tieu_de="Tạo khóa API" khi_dong={khi_dong}>
      <form onSubmit={gui}>
        <HopLoi loi={hd.loi} />

        <div className="o-nhap">
          <label htmlFor="ten">Tên bên tích hợp *</label>
          <input id="ten" value={ten} onChange={(e) => dat_ten(e.target.value)}
            placeholder="ERP kế toán" required autoFocus />
          <div className="goi-y">
            Đặt tên để sau này nhìn nhật ký biết ngay ai đang gọi.
          </div>
        </div>

        <div className="o-nhap">
          <label>Phạm vi *</label>
          <div className="goi-y" style={{ marginBottom: 6 }}>
            Chọn ít nhất một. Cấp đúng thứ họ cần — khóa chỉ-đọc không thể sửa dữ liệu dù có
            đoán đúng đường dẫn.
          </div>
          {PHAM_VI.map((p) => (
            <label key={p.ma} className="o-chon-vai-tro">
              <input type="checkbox" checked={chon.includes(p.ma)} onChange={() => doi(p.ma)} />
              <span>
                <strong>{p.nhan}</strong>
                <span className="goi-y">{p.mo_ta}</span>
              </span>
            </label>
          ))}
        </div>

        <div className="o-nhap">
          <label htmlFor="ip">Chỉ cho phép từ IP</label>
          <input id="ip" value={ip_cho_phep} onChange={(e) => dat_ip(e.target.value)}
            placeholder="203.0.113.45,198.51.100.0/24" />
          <div className="goi-y">
            Để trống là cho gọi từ mọi nơi. Biết trước IP máy chủ của bên kia thì nên khai —
            khóa lộ ra ngoài cũng không dùng được từ chỗ khác.
          </div>
        </div>

        <div className="o-nhap">
          <label htmlFor="gc">Ghi chú</label>
          <input id="gc" value={ghi_chu} onChange={(e) => dat_ghi_chu(e.target.value)}
            placeholder="Liên hệ: anh Nam — phòng CNTT" />
        </div>

        <div className="hang-nut">
          <button type="submit" className="nut-chinh"
            disabled={hd.dang_chay || ten.trim() === '' || chon.length === 0}>
            {hd.dang_chay ? 'Đang tạo…' : 'Tạo khóa'}
          </button>
          <button type="button" onClick={khi_dong}>Hủy</button>
        </div>
      </form>
    </HopThoai>
  );
}

/** Hien khoa goc — lan duy nhat. Dong hop thoai nay la mat khoa vinh vien. */
function HopThoaiKhoaMoi(
  { khoa, khi_dong }: { khoa: { ten: string; khoa: string }; khi_dong: () => void },
): ReactNode {
  const [da_chep, dat_da_chep] = useState(false);

  const chep = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(khoa.khoa);
      dat_da_chep(true);
    } catch {
      // Trinh duyet chan clipboard (hay gap khi khong chay HTTPS) — nguoi dung boi tay duoc.
      dat_da_chep(false);
    }
  };

  return (
    <HopThoai tieu_de={`Khóa API cho "${khoa.ten}"`} khi_dong={khi_dong}>
      <div className="hop-thong-bao hop-luu-y">
        Đây là <strong>lần duy nhất</strong> khóa này hiện ra. Máy chủ chỉ giữ mã băm, không lấy
        lại được. Chép và gửi cho bên tích hợp ngay bây giờ — mất thì phải thu hồi và tạo cái mới.
      </div>

      <div className="o-nhap">
        <label htmlFor="khoa">Khóa</label>
        <input id="khoa" readOnly value={khoa.khoa} onFocus={(e) => e.currentTarget.select()}
          style={{ fontFamily: 'monospace', fontSize: 13 }} />
      </div>

      <div className="o-nhap">
        <label>Cách dùng</label>
        <pre className="khoi-ma">{`curl -H "Authorization: Bearer ${khoa.khoa}" \\
  ${window.location.origin}/api/v1/toi`}</pre>
      </div>

      <div className="hang-nut">
        <button type="button" className="nut-chinh" onClick={chep}>
          {da_chep ? 'Đã chép ✓' : 'Chép khóa'}
        </button>
        <button type="button" onClick={khi_dong}>Đóng</button>
      </div>
    </HopThoai>
  );
}

function HopThoaiNhatKy(
  { khoa, khi_dong }: { khoa: KhoaApi; khi_dong: () => void },
): ReactNode {
  const { du_lieu, dang_tai } = dung_nap<DongNhatKy[]>(`/api/khoa-api/${khoa.id}/nhat-ky`);

  return (
    <HopThoai tieu_de={`Nhật ký gọi — ${khoa.ten}`} khi_dong={khi_dong} rong>
      <p className="mo-ta" style={{ marginBottom: 10 }}>
        200 lần gọi gần nhất, kể cả lần bị từ chối. Bên tích hợp báo không lấy được dữ liệu thì
        tra ở đây.
      </p>
      {dang_tai ? <DangTai /> : (du_lieu ?? []).length === 0 ? (
        <Trong tieu_de="Chưa có lần gọi nào" mo_ta="Khóa này chưa được hệ thống nào dùng." />
      ) : (
        <div className="vo-bang" style={{ maxHeight: 460 }}>
          <table>
            <thead>
              <tr>
                <th>Lúc</th><th>Phương thức</th><th>Đường dẫn</th>
                <th className="canh-giua">Mã</th><th>IP</th><th className="canh-phai">ms</th>
              </tr>
            </thead>
            <tbody>
              {(du_lieu ?? []).map((d, i) => (
                <tr key={i}>
                  <td className="khong-ngat">{ngay_gio(d.tao_luc)}</td>
                  <td>{d.phuong_thuc}</td>
                  <td style={{ fontSize: 12, wordBreak: 'break-all' }}>{d.duong_dan}</td>
                  <td className="canh-giua">
                    <span className={`nhan ${d.ma_tra_ve < 300 ? 'nhan-tot' : 'nhan-xau'}`}>
                      {d.ma_tra_ve}
                    </span>
                  </td>
                  <td className="so" style={{ fontSize: 12 }}>{d.dia_chi_ip ?? '—'}</td>
                  <td className="canh-phai so">{d.mili_giay ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </HopThoai>
  );
}
