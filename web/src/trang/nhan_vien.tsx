import { useState, type ReactNode } from 'react';
import { goi, la_admin, la_nhan_su } from '../api.ts';
import {
  DangTai, HopLoi, HopThoai, HopThoaiNhap, TEN_VAI_TRO, Trong,
  dung_hanh_dong, dung_nap, dung_xac_nhan, ngay_viet,
} from '../thanh_phan.tsx';
import { LienKet } from '../dinh_tuyen.tsx';
import { dung_phan_trang } from '../phan_trang.tsx';
import { Chon, type TuyChonChon } from '../chon.tsx';

/**
 * Tieu de tep mau nhap nhan vien.
 *
 * Dung dau CHAM PHAY: Excel ban tieng Viet mac dinh doc/ghi CSV bang dau cham phay, mo tep
 * dau phay ra se don het vao mot cot. Bo doc phia may chu tu nhan ra ca hai.
 */
const MAU_NHAN_VIEN = [
  'Mã NV;Họ và tên;PIN máy;Phòng ban;Ca làm;Ngày vào;Số điện thoại;Email;Chấm công điện thoại',
  'NV001;Nguyễn Văn An;1001;Kho;Hành chính;01/03/2024;0901234567;an.nv@congty.vn;',
  'NV002;Trần Thị Bình;1002;Kinh doanh;Hành chính;15/07/2025;0912345678;binh.tt@congty.vn;x',
].join('\r\n') + '\r\n';

interface NhanVien {
  id: string;
  ma_nv: string;
  ho_ten: string;
  pin_may: string | null;
  ma_erp: string | null;
  ngay_vao: string | null;
  so_dien_thoai: string | null;
  email: string | null;
  chuc_danh: string | null;
  duoc_cham_cong_dien_thoai: boolean;
  dang_hoat_dong: boolean;
  phong_ban_id: string | null;
  phong_ban: string | null;
  ca_lam_id: string | null;
  ca_lam: string | null;
  noi_lam_viec_id: string | null;
  noi_lam_viec: string | null;
  lich_nghi_ma: string | null;
  che_do_luong: 'vn' | 'tq';
  khoi_id: string | null;
  khoi: string | null;
  co_tai_khoan: boolean;
}

interface CaLam { id: string; ten: string; dang_hoat_dong: boolean }
interface PhongBan { id: string; ten: string }
interface NoiLamViec { id: string; ten: string; lich_nghi_ma: string }
interface Khoi { id: string; ma: string; ten: string; dang_bat: boolean }

interface ThietBi {
  id: string;
  serial: string;
  ten: string;
  dang_bat: boolean;
  pin_tu: number | null;
  pin_den: number | null;
}

/** Phan hoi cua POST /api/nhan-vien khi co chon tao tai khoan Microsoft. */
interface KetQuaTaoNhanVien {
  id: string;
  canh_bao?: string[];
  tai_khoan_ms365?: { upn: string; mat_khau: string; sku_id: string; ghi_chu: string };
}

export function TrangNhanVien(): ReactNode {
  const [tim, dat_tim] = useState('');
  const [chi_dang_lam, dat_chi_dang_lam] = useState(true);
  const [dang_sua, dat_dang_sua] = useState<NhanVien | null>(null);
  const [dang_them, dat_dang_them] = useState(false);
  const [tao_tk_cho, dat_tao_tk_cho] = useState<NhanVien | null>(null);
  const [dang_nhap_tep, dat_dang_nhap_tep] = useState(false);
  const [tao_thieu, dat_tao_thieu] = useState(false);

  const url = `/api/nhan-vien?chi_dang_lam=${chi_dang_lam}`
    + (tim.trim() === '' ? '' : `&tim=${encodeURIComponent(tim.trim())}`);
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<NhanVien[]>(url);
  const ca = dung_nap<CaLam[]>('/api/ca-lam');
  const phong = dung_nap<PhongBan[]>('/api/phong-ban');
  const may = dung_nap<ThietBi[]>('/api/thiet-bi');
  const ch_may_chu = dung_nap<{ ms365_tao?: { bat: boolean } }>('/api/xac-thuc/cau-hinh');

  const chua_co_pin = (du_lieu ?? []).filter((n) => n.pin_may === null && n.dang_hoat_dong);
  const chua_co_ca = (du_lieu ?? []).filter((n) => n.ca_lam_id === null && n.dang_hoat_dong);

  const { ds_xem, bo_phan_trang } = dung_phan_trang(du_lieu ?? []);

  return (
    <>
      <div className="dau-trang">
        <div>
          <p className="mo-ta">
            PIN máy là cầu nối giữa máy chấm công và nhân viên — không có PIN thì log về không biết
            của ai. Một PIN dùng chung cho mọi máy ở mọi văn phòng.
          </p>
        </div>
        {la_nhan_su() && (
          <div className="hang-nut" style={{ marginBottom: 0 }}>
            <button onClick={() => dat_dang_nhap_tep(true)}>Nhập từ file</button>
            <button className="nut-chinh" onClick={() => dat_dang_them(true)}>
              + Thêm nhân viên
            </button>
          </div>
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
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {ds_xem.map((n) => (
                  <tr key={n.id} style={n.dang_hoat_dong ? undefined : { opacity: 0.55 }}>
                    <td className="so">{n.ma_nv}</td>
                    <td>
                      <LienKet den={`/nhan-vien/${n.id}`} tieu_de="Mở hồ sơ nhân sự"
                        lop="lk-nhan-vien">
                        {n.ho_ten}
                      </LienKet>
                      {!n.dang_hoat_dong && (
                        <span className="nhan nhan-mo" style={{ marginLeft: 6 }}>đã nghỉ</span>
                      )}
                      {n.che_do_luong === 'tq' && (
                        <span className="nhan nhan-canh-bao" style={{ marginLeft: 6 }}>lương CNY</span>
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
                        : <span className="chu-mo">—</span>}
                    </td>
                    <td className="canh-giua">
                      {n.co_tai_khoan
                        ? <span className="nhan nhan-tot">có</span>
                        : la_admin()
                          ? <button className="nut-nho nut-phang" onClick={() => dat_tao_tk_cho(n)}>
                              Tạo
                            </button>
                          : <span className="chu-mo">—</span>}
                    </td>
                    <td className="khong-ngat">
                      <LienKet den={`/nhan-vien/${n.id}`} lop="nut nut-nho nut-phang">
                        Hồ sơ
                      </LienKet>
                      {la_nhan_su() && (
                        <> <button className="nut-nho nut-phang" onClick={() => dat_dang_sua(n)}>
                          Sửa
                        </button></>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {bo_phan_trang}
          </div>
        )}
      </div>

      {(dang_them || dang_sua !== null) && (
        <FormNhanVien
          nhan_vien={dang_sua}
          cac_ca={(ca.du_lieu ?? []).filter((c) => c.dang_hoat_dong)}
          cac_phong={phong.du_lieu ?? []}
          cac_may={(may.du_lieu ?? []).filter((m) => m.dang_bat)}
          ms365_tao_bat={ch_may_chu.du_lieu?.ms365_tao?.bat === true}
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

      {dang_nhap_tep && (
        <HopThoaiNhap
          tieu_de="Nhập nhân viên từ file"
          duong_dan="/api/nhap/nhan-vien"
          tep_mau={MAU_NHAN_VIEN}
          ten_tep_mau="mau_nhan_vien.csv"
          them_than={{ tao_thieu }}
          mo_ta={
            <>
              Đối chiếu theo <strong>Mã NV</strong>: đã có thì cập nhật, chưa có thì tạo mới.
              Không bao giờ xóa ai — người nghỉ việc phải xử lý bằng nút "Cho nghỉ việc".
              Ô để trống nghĩa là <strong>giữ nguyên</strong> giá trị cũ, không phải xóa.
              Tên cột không cần khớp tuyệt đối (chấp nhận "Mã NV", "ma_nv", "MÃ NV"…) và
              đọc được cả file phân cách bằng dấu phẩy, chấm phẩy hoặc TAB.
              {' '}<strong>Cột PIN máy phải là số đã khai trên máy ZKTeco</strong>, và mỗi người
              chỉ một PIN dùng chung cho mọi văn phòng — nhiều văn phòng thì chia dải PIN
              (VP1 1001–1999, VP2 2001–2999…) để không ai khai trùng.
            </>
          }
          tuy_chon={
            <>
              <div className="o-nhap-ngang">
                <input id="tt" type="checkbox" checked={tao_thieu}
                  onChange={(e) => dat_tao_thieu(e.target.checked)} />
                <label htmlFor="tt">Tự tạo phòng ban chưa có trong hệ thống</label>
              </div>
              <div className="goi-y" style={{ marginTop: -8, marginBottom: 12 }}>
                Mặc định tắt: một lỗi chính tả trong file sẽ để lại một phòng ban rác mà không
                ai để ý. Ca làm thì <strong>luôn</strong> phải khai bằng tay, vì còn giờ vào /
                giờ ra / giờ nghỉ.
              </div>
            </>
          }
          khi_dong={() => dat_dang_nhap_tep(false)}
          khi_xong={() => {
            dat_dang_nhap_tep(false);
            nap_lai();
            ca.nap_lai();
            phong.nap_lai();
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
  cac_may: ThietBi[];
  ms365_tao_bat: boolean;
  khi_dong: () => void;
  khi_xong: () => void;
}

function FormNhanVien(
  { nhan_vien, cac_ca, cac_phong, cac_may, ms365_tao_bat, khi_dong, khi_xong }: FormProps,
): ReactNode {
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
    chuc_danh: nhan_vien?.chuc_danh ?? '',
    duoc_cham_cong_dien_thoai: nhan_vien?.duoc_cham_cong_dien_thoai ?? false,
    noi_lam_viec_id: nhan_vien?.noi_lam_viec_id ?? '',
    che_do_luong: nhan_vien?.che_do_luong ?? 'vn',
    khoi_id: nhan_vien?.khoi_id ?? '',
  });
  const [tu_cap_pin, dat_tu_cap_pin] = useState(false);
  const [serial_pin, dat_serial_pin] = useState('');
  const [tao_tk_ms, dat_tao_tk_ms] = useState(false);
  const [ket_qua, dat_ket_qua] = useState<
    NonNullable<KetQuaTaoNhanVien['tai_khoan_ms365']> | null
  >(null);
  const [canh_bao_ket, dat_canh_bao_ket] = useState<string[]>([]);
  const noi = dung_nap<NoiLamViec[]>('/api/noi-lam-viec');
  const khoi = dung_nap<Khoi[]>('/api/khoi');
  const hd = dung_hanh_dong();
  const xn = dung_xac_nhan();

  const doi = (khoa: keyof typeof f, gt: string | boolean): void =>
    dat_f((cu) => ({ ...cu, [khoa]: gt }));

  const gui = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const than = {
      ma_nv: f.ma_nv.trim(),
      ho_ten: f.ho_ten.trim(),
      pin_may: tu_cap_pin ? null : (f.pin_may.trim() === '' ? null : f.pin_may.trim()),
      ma_erp: f.ma_erp.trim() === '' ? null : f.ma_erp.trim(),
      phong_ban_id: f.phong_ban_id === '' ? null : f.phong_ban_id,
      ca_lam_id: f.ca_lam_id === '' ? null : f.ca_lam_id,
      ngay_vao: f.ngay_vao === '' ? null : f.ngay_vao,
      so_dien_thoai: f.so_dien_thoai.trim() === '' ? null : f.so_dien_thoai.trim(),
      email: f.email.trim() === '' ? null : f.email.trim(),
      chuc_danh: f.chuc_danh.trim() === '' ? null : f.chuc_danh.trim(),
      duoc_cham_cong_dien_thoai: f.duoc_cham_cong_dien_thoai,
      noi_lam_viec_id: f.noi_lam_viec_id === '' ? null : f.noi_lam_viec_id,
      che_do_luong: f.che_do_luong,
      khoi_id: f.khoi_id === '' ? null : f.khoi_id,
    };
    if (nhan_vien === null) {
      const kq = await hd.chay_lay<KetQuaTaoNhanVien>(() =>
        goi('/api/nhan-vien', {
          method: 'POST',
          body: {
            ...than,
            tu_cap_pin,
            thiet_bi_serial: tu_cap_pin ? serial_pin : null,
            tao_tk_ms365: tao_tk_ms,
          },
        }),
      );
      if (kq === null) return;
      if (kq.tai_khoan_ms365 !== undefined) {
        // Mat khau khoi tao chi hien dung mot lan nay — giu form mo de nhan su chep lai.
        dat_ket_qua(kq.tai_khoan_ms365);
        dat_canh_bao_ket(kq.canh_bao ?? []);
        return;
      }
      khi_xong();
      return;
    }
    const ok = await hd.chay(() =>
      goi(`/api/nhan-vien/${nhan_vien.id}`, { method: 'PUT', body: than }),
    );
    if (ok) khi_xong();
  };

  const cho_nghi = async (): Promise<void> => {
    if (nhan_vien === null) return;
    const dong_y = await xn.hoi({
      tieu_de: `Cho ${nhan_vien.ho_ten} nghỉ việc?`,
      mo_ta: <>
        Lịch sử chấm công và toàn bộ hồ sơ <strong>được giữ lại</strong>; tài khoản đăng nhập bị
        vô hiệu hóa. Đây KHÔNG phải xóa hồ sơ.
      </>,
      chu_dong_y: 'Cho nghỉ việc',
    });
    if (!dong_y) return;
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
            inputMode="numeric" placeholder="1001" disabled={tu_cap_pin} />
          <div className="goi-y">
            Phải trùng đúng số ID đã khai trên máy ZKTeco. Chỉ gồm chữ số.
            {' '}<strong>Nhiều văn phòng thì dùng CHUNG một số PIN cho cả ba máy</strong> — PIN
            chính là danh tính, máy nào quẹt cũng ra đúng người. Khai mỗi nơi một số thì hệ thống
            hiểu thành ba người khác nhau.
          </div>
        </div>

        {nhan_vien === null && (
          <div className="o-nhap-ngang" style={{ marginBottom: tu_cap_pin ? 0 : 8 }}>
            <input id="tcp" type="checkbox" checked={tu_cap_pin}
              onChange={(e) => dat_tu_cap_pin(e.target.checked)} />
            <label htmlFor="tcp">Tự cấp PIN theo dãy của máy</label>
          </div>
        )}
        {nhan_vien === null && tu_cap_pin && (
          <div className="o-nhap">
            <label htmlFor="maypin">Máy chấm công *</label>
            <Chon gia_tri={serial_pin}
              dat_gia_tri={dat_serial_pin}
              cac_tuy_chon={cac_may.map((m): TuyChonChon => ({
                ma: m.serial,
                nhan: m.pin_tu !== null ? `${m.ten} (dải PIN ${m.pin_tu}–${m.pin_den})` : m.ten,
              }))}
              rong="— Chọn máy —" nhan="Chọn máy chấm công" />
            <div className="goi-y">
              Hệ thống chọn số PIN còn trống đầu tiên trong dải của máy này và ghi vào bảng mã
              định danh. Nhân sự chỉ cần khai đúng số đó lên máy ZKTeco.
            </div>
          </div>
        )}

        <div className="o-nhap">
          <label htmlFor="cd">Chức danh</label>
          <input id="cd" value={f.chuc_danh} onChange={(e) => doi('chuc_danh', e.target.value)}
            placeholder="Ví dụ: Trưởng phòng Kinh doanh" />
          <div className="goi-y">
            Dùng để chọn giấy phép Microsoft khi tạo tài khoản: chức danh chứa
            <strong> trưởng</strong> nhận Standard, còn lại nhận Basic.
          </div>
        </div>

        <div className="luoi luoi-2">
          <div className="o-nhap">
            <label htmlFor="pb">Phòng ban</label>
            <Chon gia_tri={f.phong_ban_id}
              dat_gia_tri={(ma) => doi('phong_ban_id', ma)}
              cac_tuy_chon={cac_phong.map((p): TuyChonChon => ({ ma: p.id, nhan: p.ten }))}
              rong="— Chưa gán —" nhan="Phòng ban" />
          </div>
          <div className="o-nhap">
            <label htmlFor="cl">Ca làm việc</label>
            <Chon gia_tri={f.ca_lam_id}
              dat_gia_tri={(ma) => doi('ca_lam_id', ma)}
              cac_tuy_chon={cac_ca.map((c): TuyChonChon => ({ ma: c.id, nhan: c.ten }))}
              rong="— Chưa gán —" nhan="Ca làm việc" />
          </div>
        </div>

        <div className="o-nhap">
          <label htmlFor="nlv">Nơi làm việc</label>
          <Chon gia_tri={f.noi_lam_viec_id}
            dat_gia_tri={(ma) => doi('noi_lam_viec_id', ma)}
            cac_tuy_chon={(noi.du_lieu ?? []).map((n): TuyChonChon => ({
              ma: n.id, nhan: `${n.ten} (${n.lich_nghi_ma.toUpperCase()})`,
            }))}
            rong="— Lịch Việt Nam (mặc định) —" nhan="Nơi làm việc" />
          <div className="goi-y">
            Quyết định <strong>lịch nghỉ lễ</strong> áp dụng cho người này: làm ở Việt Nam theo lịch
            VN, làm ở Trung Quốc theo lịch TQ. Chưa gán = lịch Việt Nam.
          </div>
        </div>

        <div className="o-nhap">
          <label htmlFor="cdl">Chế độ lương</label>
          <Chon gia_tri={f.che_do_luong}
            dat_gia_tri={(ma) => doi('che_do_luong', ma)}
            cac_tuy_chon={[
              { ma: 'vn', nhan: 'Lương Việt Nam (VND) — vào bảng lương' },
              { ma: 'tq', nhan: 'Lương Trung Quốc (CNY) — khối riêng' },
            ]}
            nhan="Chế độ lương" />
          <div className="goi-y">
            Chọn <strong>Lương Trung Quốc</strong> cho nhân sự nhận lương bằng CNY: họ được
            <strong> loại khỏi kỳ lương VND</strong> (không áp BHXH/thuế TNCN Việt Nam) và tính ở
            khối lương Trung Quốc riêng.
          </div>
        </div>

        <div className="o-nhap">
          <label htmlFor="khoi">Khối</label>
          <Chon gia_tri={f.khoi_id}
            dat_gia_tri={(ma) => doi('khoi_id', ma)}
            cac_tuy_chon={(khoi.du_lieu ?? []).filter((k) => k.dang_bat).map((k): TuyChonChon => ({
              ma: k.id, nhan: k.ten,
            }))}
            rong="— Chưa gán —" nhan="Khối" />
          <div className="goi-y">
            Gán khối để người này <strong>tự hưởng phụ cấp mặc định của khối</strong> (VP, Kho HN,
            VP Lạng Sơn, Kho TQ). Phụ cấp cá nhân (nếu có) vẫn <strong>đè lên</strong> mức của khối.
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
            <input id="em" type="email" value={f.email} onChange={(e) => doi('email', e.target.value)}
              required={tao_tk_ms} />
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

        {nhan_vien === null && (
          <div className="o-nhap-ngang" style={{ marginTop: 8 }}>
            <input id="tkms" type="checkbox" checked={tao_tk_ms} disabled={!ms365_tao_bat}
              onChange={(e) => dat_tao_tk_ms(e.target.checked)} />
            <label htmlFor="tkms">Tạo tài khoản Microsoft 365 + cấp giấy phép</label>
          </div>
        )}
        {nhan_vien === null && (
          <div className="goi-y" style={{ marginTop: -8, marginBottom: 12 }}>
            {ms365_tao_bat
              ? <>Email trở thành tên đăng nhập Microsoft. Mật khẩu khởi tạo sẽ <strong>chỉ hiện
                một lần</strong> ngay sau khi lưu — hãy chép lại rồi bàn giao cho nhân viên.
                Giấy phép cấp theo chức danh: trưởng phòng nhận Standard, còn lại nhận Basic.</>
              : 'Máy chủ chưa bật tính năng này (MS365_TAO_TAI_KHOAN_BAT) — hỏi quản trị hệ thống.'}
          </div>
        )}

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
      {ket_qua !== null && (
        <HopThoaiKetQuaMs
          ho_ten={f.ho_ten.trim()}
          ket_qua={ket_qua}
          canh_bao={canh_bao_ket}
          khi_xong={() => {
            dat_ket_qua(null);
            khi_xong();
          }}
        />
      )}
      {xn.hop_thoai}
    </HopThoai>
  );
}

// ============================================================ ket qua tao tai khoan MS
function HopThoaiKetQuaMs(
  { ho_ten, ket_qua, canh_bao, khi_xong }:
  {
    ho_ten: string;
    ket_qua: { upn: string; mat_khau: string; sku_id: string; ghi_chu: string };
    canh_bao: string[];
    khi_xong: () => void;
  },
): ReactNode {
  return (
    <HopThoai tieu_de={`Tài khoản Microsoft 365 — ${ho_ten}`} khi_dong={khi_xong}>
      <div className="hop-thong-bao hop-tin">
        {ket_qua.ghi_chu}
      </div>
      <div className="o-nhap">
        <label htmlFor="kq-upn">Tên đăng nhập (UPN)</label>
        <input id="kq-upn" value={ket_qua.upn} readOnly />
      </div>
      <div className="o-nhap">
        <label htmlFor="kq-mk">Mật khẩu khởi tạo</label>
        <input id="kq-mk" value={ket_qua.mat_khau} readOnly className="chu-ma" />
      </div>
      {canh_bao.map((cb) => (
        <div key={cb} className="hop-thong-bao hop-luu-y">{cb}</div>
      ))}
      <div className="hang-nut">
        <button className="nut-chinh" onClick={() => { void navigator.clipboard.writeText(ket_qua.mat_khau); }}>
          Sao chép mật khẩu
        </button>
        <button onClick={khi_xong}>Đã lưu lại</button>
      </div>
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
          <Chon gia_tri={vai_tro}
            dat_gia_tri={(ma) => dat_vai_tro(ma as 'nhan_vien' | 'truong_phong')}
            cac_tuy_chon={[
              { ma: 'nhan_vien', nhan: `${TEN_VAI_TRO['nhan_vien']} — chỉ xem công của mình` },
              { ma: 'truong_phong', nhan: `${TEN_VAI_TRO['truong_phong']} — xem và duyệt đơn của phòng mình` },
            ]}
            nhan="Vai trò" />
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
