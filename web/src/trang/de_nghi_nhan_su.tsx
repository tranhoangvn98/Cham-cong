// De nghi them nhan su (onboarding, DTKT 02/2026): HR tao de nghi -> Admin duyet MOT
// buoc -> he thong tu chay khoi tao (MS365 + ERP1 + cong + PIN may cua + viec nhap viec).
// Trang nay dung chung cho ca HR (tao de nghi) va Admin (duyet / tu choi).
import { useState, type ReactNode } from 'react';
import { goi, la_admin, la_nhan_su } from '../api.ts';
import {
  DangTai, HopLoi, HopThoai, Trong,
  dung_hanh_dong, dung_nap, ngay_viet,
} from '../thanh_phan.tsx';
import { LienKet } from '../dinh_tuyen.tsx';
import { dung_phan_trang } from '../phan_trang.tsx';
import { Chon, type TuyChonChon } from '../chon.tsx';
import { CAC_VI_TRI } from './nhan_vien.tsx';

interface DeNghi {
  id: string;
  ho_ten: string;
  ma_nv: string | null;
  chuc_danh: string | null;
  vi_tri: string | null;
  ngay_vao: string | null;
  email: string | null;
  loai_hop_dong: string | null;
  cap_ms365: boolean;
  tao_tk_he_thong: boolean;
  tu_cap_pin: boolean;
  serial_may_cua: string | null;
  trang_thai: string;
  nhan_vien_id: string | null;
  ly_do_tu_choi: string | null;
  admin_duyet_luc: string | null;
  tao_luc: string;
  ma_nv_da_tao: string | null;
  nguoi_de_nghi: string | null;
  admin_duyet: string | null;
}

const TT_TEN: Record<string, string> = {
  cho_duyet: 'Chờ duyệt',
  da_khoi_tao: 'Đã khởi tạo',
  da_tu_choi: 'Đã từ chối',
};

const TT_LOP: Record<string, string> = {
  cho_duyet: 'nhan-canh-bao',
  da_khoi_tao: 'nhan-tot',
  da_tu_choi: 'nhan-xau',
};

interface CaLam { id: string; ten: string; dang_hoat_dong: boolean }
interface PhongBan { id: string; ten: string }
interface NoiLamViec { id: string; ten: string; lich_nghi_ma: string }
interface Khoi { id: string; ma: string; ten: string; dang_bat: boolean }
interface ThietBi { id: string; serial: string; ten: string; dang_bat: boolean }

/** Ket qua duyet de nghi — mat khau khoi tao chi hien mot lan. */
interface KetQuaDuyet {
  nhan_vien_id: string;
  pin_may: string | null;
  viec_id: string | null;
  canh_bao?: string[];
  tai_khoan_ms365?: { upn: string; mat_khau: string; sku_id: string; ghi_chu: string };
  tai_khoan_he_thong?: {
    ten_dang_nhap: string; mat_khau: string; vai_tro: string; ghi_chu: string;
  };
}

export function TrangDeNghiNhanSu(): ReactNode {
  const [bo_loc, dat_bo_loc] = useState('cho_duyet');
  const [dang_tao, dat_dang_tao] = useState(false);
  const [duyet_cho, dat_duyet_cho] = useState<DeNghi | null>(null);
  const url = `/api/de-nghi-nhan-su`
    + (bo_loc === '' ? '' : `?trang_thai=${bo_loc}`);
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<DeNghi[]>(url);
  const phong = dung_nap<PhongBan[]>('/api/phong-ban');
  const ca = dung_nap<CaLam[]>('/api/ca-lam');
  const khoi = dung_nap<Khoi[]>('/api/khoi');
  const may = dung_nap<ThietBi[]>('/api/thiet-bi');
  const noi = dung_nap<NoiLamViec[]>('/api/noi-lam-viec');

  const { ds_xem, bo_phan_trang } = dung_phan_trang(du_lieu ?? []);

  return (
    <>
      <div className="dau-trang">
        <div>
          <p className="mo-ta">
            HR tạo đề nghị thêm người; Admin duyệt đúng một bước là hệ thống tự khởi tạo:
            tài khoản Microsoft + ERP1 + cổng phân quyền, cấp PIN máy cửa và giao việc
            "Nhập việc" cho nhân sự phụ trách.
          </p>
        </div>
        {la_nhan_su() && (
          <button className="nut-chinh" onClick={() => dat_dang_tao(true)}>
            Đề nghị thêm nhân sự
          </button>
        )}
      </div>

      <div className="bo-loc">
        <div className="o-nhap" style={{ minWidth: 240 }}>
          <label htmlFor="loc">Trạng thái</label>
          <Chon gia_tri={bo_loc}
            dat_gia_tri={dat_bo_loc}
            cac_tuy_chon={[
              { ma: 'cho_duyet', nhan: 'Chờ duyệt' },
              { ma: 'da_khoi_tao', nhan: 'Đã khởi tạo' },
              { ma: 'da_tu_choi', nhan: 'Đã từ chối' },
              { ma: '', nhan: 'Tất cả' },
            ]}
            nhan="Trạng thái" />
        </div>
      </div>

      <HopLoi loi={loi} />

      <div className="the the-mong">
        {dang_tai ? <DangTai /> : (du_lieu ?? []).length === 0 ? (
          <Trong tieu_de="Không có đề nghị nào"
            mo_ta="Bấm Đề nghị thêm nhân sự để khởi tạo luồng onboarding." />
        ) : (
          <div className="vo-bang">
            <table>
              <thead>
                <tr>
                  <th>Họ tên</th>
                  <th>Mã NV</th>
                  <th>Chức danh</th>
                  <th>Vào làm</th>
                  <th>MS365</th>
                  <th>Trạng thái</th>
                  <th>Đề nghị bởi</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {ds_xem.map((d) => (
                  <tr key={d.id}>
                    <td>{d.ho_ten}</td>
                    <td className="so">{d.ma_nv ?? <span className="chu-mo">chưa cấp</span>}</td>
                    <td>{d.chuc_danh ?? '—'}</td>
                    <td className="khong-ngat">{ngay_viet(d.ngay_vao)}</td>
                    <td className="canh-giua">
                      {d.cap_ms365
                        ? <span className="nhan nhan-lanh">có</span>
                        : <span className="chu-mo">—</span>}
                    </td>
                    <td className="khong-ngat">
                      <span className={`nhan ${TT_LOP[d.trang_thai] ?? 'nhan-mo'}`}>
                        {TT_TEN[d.trang_thai] ?? d.trang_thai}
                      </span>
                      {d.trang_thai === 'da_tu_choi' && d.ly_do_tu_choi !== null && (
                        <div className="goi-y">{d.ly_do_tu_choi}</div>
                      )}
                    </td>
                    <td>{d.nguoi_de_nghi ?? '—'}</td>
                    <td className="khong-ngat">
                      {d.trang_thai === 'da_khoi_tao' && d.nhan_vien_id !== null && (
                        <LienKet den={`/nhan-vien/${d.nhan_vien_id}`}
                          lop="nut nut-nho nut-phang">
                          Hồ sơ
                        </LienKet>
                      )}
                      {la_admin() && d.trang_thai === 'cho_duyet' && (
                        <button className="nut-nho nut-chinh"
                          onClick={() => dat_duyet_cho(d)}>
                          Duyệt / từ chối
                        </button>
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

      {dang_tao && (
        <FormDeNghi
          cac_phong={phong.du_lieu ?? []}
          cac_ca={(ca.du_lieu ?? []).filter((c) => c.dang_hoat_dong)}
          cac_khoi={(khoi.du_lieu ?? []).filter((k) => k.dang_bat)}
          cac_may={(may.du_lieu ?? []).filter((m) => m.dang_bat)}
          cac_noi={noi.du_lieu ?? []}
          khi_dong={() => dat_dang_tao(false)}
          khi_xong={() => { dat_dang_tao(false); nap_lai(); }}
        />
      )}

      {duyet_cho !== null && (
        <HopDuyet
          de_nghi={duyet_cho}
          khi_dong={() => dat_duyet_cho(null)}
          khi_xong={() => { dat_duyet_cho(null); nap_lai(); }}
        />
      )}
    </>
  );
}

// ============================================================ form tao de nghi
function FormDeNghi(
  { cac_phong, cac_ca, cac_khoi, cac_may, cac_noi, khi_dong, khi_xong }:
  {
    cac_phong: PhongBan[]; cac_ca: CaLam[]; cac_khoi: Khoi[];
    cac_may: ThietBi[]; cac_noi: NoiLamViec[];
    khi_dong: () => void; khi_xong: () => void;
  },
): ReactNode {
  const [f, dat_f] = useState({
    ho_ten: '', ma_nv: '', chuc_danh: '', vi_tri: '', phong_ban_id: '', ca_lam_id: '',
    khoi_id: '', noi_lam_viec_id: '', ngay_vao: '', so_dien_thoai: '', email: '',
    ma_erp: '', loai_hop_dong: '',
  });
  const [tu_cap_pin, dat_tu_cap_pin] = useState(true);
  const [serial_cua, dat_serial_cua] = useState('');
  const [cap_ms365, dat_cap_ms365] = useState(true);
  const [tao_tk_ht, dat_tao_tk_ht] = useState(true);
  const hd = dung_hanh_dong();

  const doi = (khoa: keyof typeof f, gt: string): void =>
    dat_f((cu) => ({ ...cu, [khoa]: gt }));

  const gui = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const ok = await hd.chay(() => goi('/api/de-nghi-nhan-su', {
      method: 'POST',
      body: {
        ho_ten: f.ho_ten.trim(),
        ma_nv: f.ma_nv.trim() === '' ? null : f.ma_nv.trim(),
        chuc_danh: f.chuc_danh.trim() === '' ? null : f.chuc_danh.trim(),
        vi_tri: f.vi_tri === '' ? null : f.vi_tri,
        phong_ban_id: f.phong_ban_id === '' ? null : f.phong_ban_id,
        ca_lam_id: f.ca_lam_id === '' ? null : f.ca_lam_id,
        khoi_id: f.khoi_id === '' ? null : f.khoi_id,
        noi_lam_viec_id: f.noi_lam_viec_id === '' ? null : f.noi_lam_viec_id,
        ngay_vao: f.ngay_vao === '' ? null : f.ngay_vao,
        so_dien_thoai: f.so_dien_thoai.trim() === '' ? null : f.so_dien_thoai.trim(),
        email: f.email.trim() === '' ? null : f.email.trim(),
        ma_erp: f.ma_erp.trim() === '' ? null : f.ma_erp.trim(),
        loai_hop_dong: f.loai_hop_dong.trim() === '' ? null : f.loai_hop_dong.trim(),
        tu_cap_pin,
        pin_may: null,
        serial_may_cua: serial_cua === '' ? null : serial_cua,
        cap_ms365,
        tao_tk_he_thong: tao_tk_ht,
      },
    }));
    if (ok) khi_xong();
  };

  return (
    <HopThoai tieu_de="Đề nghị thêm nhân sự mới" khi_dong={khi_dong}>
      <form onSubmit={gui}>
        <HopLoi loi={hd.loi} />
        <div className="hop-thong-bao hop-tin">
          Người mới chỉ được khởi tạo khi <strong>Admin duyệt</strong> — một bước, không cần
          thao tác tay thêm. Điền email công ty nếu muốn cấp tài khoản Microsoft.
        </div>

        <div className="luoi luoi-2">
          <div className="o-nhap">
            <label htmlFor="dn-ht">Họ tên *</label>
            <input id="dn-ht" value={f.ho_ten} onChange={(e) => doi('ho_ten', e.target.value)}
              required />
          </div>
          <div className="o-nhap">
            <label htmlFor="dn-ma">Mã nhân viên</label>
            <input id="dn-ma" value={f.ma_nv} onChange={(e) => doi('ma_nv', e.target.value)}
              placeholder="Để trống để Admin cấp khi duyệt" />
          </div>
        </div>

        <div className="luoi luoi-2">
          <div className="o-nhap">
            <label htmlFor="dn-cd">Chức danh</label>
            <input id="dn-cd" value={f.chuc_danh} onChange={(e) => doi('chuc_danh', e.target.value)}
              placeholder="Ví dụ: Trưởng phòng Kinh doanh" />
          </div>
          <div className="o-nhap">
            <label htmlFor="dn-vt">Vị trí</label>
            <Chon gia_tri={f.vi_tri} dat_gia_tri={(ma) => doi('vi_tri', ma)}
              cac_tuy_chon={CAC_VI_TRI.map((v): TuyChonChon => ({ ma: v.ma, nhan: v.nhan }))}
              rong="— Chưa chọn —" nhan="Vị trí" />
          </div>
        </div>

        <div className="luoi luoi-2">
          <div className="o-nhap">
            <label htmlFor="dn-pb">Phòng ban</label>
            <Chon gia_tri={f.phong_ban_id} dat_gia_tri={(ma) => doi('phong_ban_id', ma)}
              cac_tuy_chon={cac_phong.map((p): TuyChonChon => ({ ma: p.id, nhan: p.ten }))}
              rong="— Chưa gán —" nhan="Phòng ban" />
          </div>
          <div className="o-nhap">
            <label htmlFor="dn-cl">Ca làm việc</label>
            <Chon gia_tri={f.ca_lam_id} dat_gia_tri={(ma) => doi('ca_lam_id', ma)}
              cac_tuy_chon={cac_ca.map((c): TuyChonChon => ({ ma: c.id, nhan: c.ten }))}
              rong="— Chưa gán —" nhan="Ca làm việc" />
          </div>
        </div>

        <div className="luoi luoi-2">
          <div className="o-nhap">
            <label htmlFor="dn-khoi">Khối</label>
            <Chon gia_tri={f.khoi_id} dat_gia_tri={(ma) => doi('khoi_id', ma)}
              cac_tuy_chon={cac_khoi.map((k): TuyChonChon => ({ ma: k.id, nhan: k.ten }))}
              rong="— Chưa gán —" nhan="Khối" />
          </div>
          <div className="o-nhap">
            <label htmlFor="dn-nlv">Nơi làm việc</label>
            <Chon gia_tri={f.noi_lam_viec_id} dat_gia_tri={(ma) => doi('noi_lam_viec_id', ma)}
              cac_tuy_chon={cac_noi.map((n): TuyChonChon => ({
                ma: n.id, nhan: `${n.ten} (${n.lich_nghi_ma.toUpperCase()})`,
              }))}
              rong="— Lịch Việt Nam (mặc định) —" nhan="Nơi làm việc" />
          </div>
        </div>

        <div className="luoi luoi-2">
          <div className="o-nhap">
            <label htmlFor="dn-nv">Ngày vào làm</label>
            <input id="dn-nv" type="date" value={f.ngay_vao}
              onChange={(e) => doi('ngay_vao', e.target.value)} />
          </div>
          <div className="o-nhap">
            <label htmlFor="dn-lhd">Loại hợp đồng</label>
            <input id="dn-lhd" value={f.loai_hop_dong}
              onChange={(e) => doi('loai_hop_dong', e.target.value)}
              placeholder="HĐLĐ 12 tháng / thử việc" />
          </div>
        </div>

        <div className="luoi luoi-2">
          <div className="o-nhap">
            <label htmlFor="dn-sdt">Số điện thoại</label>
            <input id="dn-sdt" value={f.so_dien_thoai}
              onChange={(e) => doi('so_dien_thoai', e.target.value)} />
          </div>
          <div className="o-nhap">
            <label htmlFor="dn-em">Email công ty</label>
            <input id="dn-em" type="email" value={f.email}
              onChange={(e) => doi('email', e.target.value)} required={cap_ms365} />
          </div>
        </div>

        <div className="o-nhap">
          <label htmlFor="dn-erp">Mã bên ERP</label>
          <input id="dn-erp" value={f.ma_erp} onChange={(e) => doi('ma_erp', e.target.value)}
            placeholder="Để đồng bộ bảng lương" />
        </div>

        <div className="o-nhap-ngang">
          <input id="dn-tcp" type="checkbox" checked={tu_cap_pin}
            onChange={(e) => dat_tu_cap_pin(e.target.checked)} />
          <label htmlFor="dn-tcp">Tự cấp PIN theo dải của máy cửa</label>
        </div>
        {tu_cap_pin && (
          <div className="o-nhap">
            <label htmlFor="dn-mc">Máy cửa (kiểm soát ra vào)</label>
            <Chon gia_tri={serial_cua} dat_gia_tri={dat_serial_cua}
              cac_tuy_chon={cac_may.map((m): TuyChonChon => ({ ma: m.serial, nhan: m.ten }))}
              rong="— Dùng máy cửa mặc định —" nhan="Máy cửa" />
            <div className="goi-y">
              Hệ thống cấp số PIN trống đầu tiên trong dải của máy và xếp lệnh đẩy user + PIN
              xuống máy khi duyệt. Vân tay/khuôn mặt vẫn phải enroll tại máy (mục checklist).
            </div>
          </div>
        )}

        <div className="o-nhap-ngang">
          <input id="dn-ms" type="checkbox" checked={cap_ms365}
            onChange={(e) => dat_cap_ms365(e.target.checked)} />
          <label htmlFor="dn-ms">Tạo tài khoản Microsoft 365 + cấp giấy phép</label>
        </div>
        <div className="o-nhap-ngang">
          <input id="dn-htk" type="checkbox" checked={tao_tk_ht}
            onChange={(e) => dat_tao_tk_ht(e.target.checked)} />
          <label htmlFor="dn-htk">Tạo tài khoản hệ thống (đăng nhập app điện thoại)</label>
        </div>

        <div className="hang-nut">
          <button type="submit" className="nut-chinh" disabled={hd.dang_chay}>
            {hd.dang_chay ? 'Đang gửi…' : 'Gửi đề nghị'}
          </button>
          <button type="button" onClick={khi_dong}>Hủy</button>
        </div>
      </form>
    </HopThoai>
  );
}

// ============================================================ duyet / tu choi
function HopDuyet(
  { de_nghi, khi_dong, khi_xong }:
  { de_nghi: DeNghi; khi_dong: () => void; khi_xong: () => void },
): ReactNode {
  const [ma_nv, dat_ma_nv] = useState(de_nghi.ma_nv ?? '');
  const [chuc_danh, dat_chuc_danh] = useState(de_nghi.chuc_danh ?? '');
  const [pin_may, dat_pin_may] = useState('');
  const [ket_qua, dat_ket_qua] = useState<KetQuaDuyet | null>(null);
  const [hoi_ly_do, dat_hoi_ly_do] = useState(false);
  const [ly_do, dat_ly_do] = useState('');
  const hd = dung_hanh_dong();

  const duyet = async (): Promise<void> => {
    const kq = await hd.chay_lay<KetQuaDuyet>(() => goi(
      `/api/de-nghi-nhan-su/${de_nghi.id}/duyet`,
      {
        method: 'POST',
        body: {
          ma_nv: ma_nv.trim() === '' ? null : ma_nv.trim(),
          chuc_danh: chuc_danh.trim() === '' ? null : chuc_danh.trim(),
          pin_may: pin_may.trim() === '' ? null : pin_may.trim(),
        },
      },
    ));
    if (kq !== null) dat_ket_qua(kq);
  };

  const tu_choi = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const ok = await hd.chay(() => goi(
      `/api/de-nghi-nhan-su/${de_nghi.id}/tu-choi`,
      { method: 'POST', body: { ly_do: ly_do.trim() } },
    ));
    if (ok) khi_xong();
  };

  if (ket_qua !== null) {
    return (
      <HopThoai tieu_de={`Đã khởi tạo — ${de_nghi.ho_ten}`} khi_dong={khi_xong}>
        <div className="hop-thong-bao hop-tot">
          Đã tạo hồ sơ nhân viên, cấp PIN và ghi toàn bộ sự kiện khởi tạo trong một giao dịch.
        </div>
        <div className="o-nhap">
          <label htmlFor="dk-pin">PIN máy</label>
          <input id="dk-pin" value={ket_qua.pin_may ?? '—'} readOnly />
        </div>
        {ket_qua.tai_khoan_ms365 !== undefined && (
          <>
            <div className="o-nhap">
              <label htmlFor="dk-upn">Tên đăng nhập Microsoft (UPN)</label>
              <input id="dk-upn" value={ket_qua.tai_khoan_ms365.upn} readOnly />
            </div>
            <div className="o-nhap">
              <label htmlFor="dk-mk">Mật khẩu khởi tạo Microsoft — chỉ hiện lần này</label>
              <input id="dk-mk" value={ket_qua.tai_khoan_ms365.mat_khau} readOnly className="chu-ma" />
              <div className="hang-nut">
                <button className="nut-chinh"
                  onClick={() => {
                    void navigator.clipboard.writeText(ket_qua.tai_khoan_ms365?.mat_khau ?? '');
                  }}>
                  Sao chép mật khẩu Microsoft
                </button>
              </div>
            </div>
          </>
        )}
        {ket_qua.tai_khoan_he_thong !== undefined && (
          <div className="o-nhap">
            <label htmlFor="dk-htk">Tài khoản hệ thống</label>
            <input id="dk-htk" value={`${ket_qua.tai_khoan_he_thong.ten_dang_nhap} — `
              + `${ket_qua.tai_khoan_he_thong.mat_khau}`} readOnly className="chu-ma" />
          </div>
        )}
        {(ket_qua.canh_bao ?? []).map((cb) => (
          <div key={cb} className="hop-thong-bao hop-luu-y">{cb}</div>
        ))}
        <div className="hang-nut">
          <button onClick={khi_xong}>Đã lưu lại</button>
        </div>
      </HopThoai>
    );
  }

  return (
    <HopThoai tieu_de={`Duyệt đề nghị — ${de_nghi.ho_ten}`} khi_dong={khi_dong}>
      <HopLoi loi={hd.loi} />
      <div className="hop-thong-bao hop-tin">
        Duyệt là hệ thống chạy ngay toàn bộ khởi tạo trong một giao dịch. Kiểm tra mã nhân
        viên và chức danh trước khi bấm.
      </div>
      <div className="o-nhap">
        <label htmlFor="dk-manv">Mã nhân viên *</label>
        <input id="dk-manv" value={ma_nv} onChange={(e) => dat_ma_nv(e.target.value)} />
        <div className="goi-y">Chưa có mã thì Admin phải cấp ở đây.</div>
      </div>
      <div className="o-nhap">
        <label htmlFor="dk-cd">Chức danh</label>
        <input id="dk-cd" value={chuc_danh} onChange={(e) => dat_chuc_danh(e.target.value)} />
      </div>
      {!de_nghi.tu_cap_pin && (
        <div className="o-nhap">
          <label htmlFor="dk-pintay">PIN máy (khai tay)</label>
          <input id="dk-pintay" value={pin_may} onChange={(e) => dat_pin_may(e.target.value)} />
        </div>
      )}
      <div className="hang-nut">
        <button type="button" className="nut-chinh" disabled={hd.dang_chay}
          onClick={() => { void duyet(); }}>
          {hd.dang_chay ? 'Đang khởi tạo…' : 'Duyệt & khởi tạo'}
        </button>
        <button type="button" className="nut-nguy" onClick={() => dat_hoi_ly_do(true)}>
          Từ chối
        </button>
      </div>
      {hoi_ly_do && (
        <HopThoai tieu_de={`Từ chối đề nghị — ${de_nghi.ho_ten}`}
          khi_dong={() => dat_hoi_ly_do(false)}>
          <form onSubmit={(e) => { void tu_choi(e); }}>
            <HopLoi loi={hd.loi} />
            <div className="o-nhap">
              <label htmlFor="dk-lydo">Lý do từ chối *</label>
              <input id="dk-lydo" value={ly_do} onChange={(e) => dat_ly_do(e.target.value)}
                required placeholder="Thiếu thông tin hồ sơ…" />
            </div>
            <div className="hang-nut">
              <button type="submit" className="nut-nguy" disabled={hd.dang_chay}>
                {hd.dang_chay ? 'Đang gửi…' : 'Xác nhận từ chối'}
              </button>
              <button type="button" onClick={() => dat_hoi_ly_do(false)}>Hủy</button>
            </div>
          </form>
        </HopThoai>
      )}
    </HopThoai>
  );
}
