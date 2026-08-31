import { useEffect, useState, type ReactNode } from 'react';
import { goi, la_nhan_su } from '../api.ts';
import {
  DangTai, HopLoi, HopTot, HopThoai, Trong,
  dung_hanh_dong, dung_nap, dung_xac_nhan, ngay_gio,
} from '../thanh_phan.tsx';
import type { NhanVien } from './nhan_vien.tsx';
import type { NhomMa as NhomMaDinhDanh } from './ma_dinh_danh.tsx';

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
  const [sua_cho, dat_sua_cho] = useState<ThietBi | null>(null);
  const [xem_lenh, dat_xem_lenh] = useState<ThietBi | null>(null);
  const [lay_log_cho, dat_lay_log_cho] = useState<ThietBi | null>(null);
  const [nap_nv_cho, dat_nap_nv_cho] = useState<ThietBi | null>(null);
  const [xoa_nv_cho, dat_xoa_nv_cho] = useState<ThietBi | null>(null);
  const [doi_chieu_cho, dat_doi_chieu_cho] = useState<ThietBi | null>(null);
  const [khoa_cua_cho, dat_khoa_cua_cho] = useState<ThietBi | null>(null);
  const hd = dung_hanh_dong();
  const xn = dung_xac_nhan();

  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<ThietBi[]>('/api/thiet-bi');

  const lenh_may = async (serial: string, duong_dan: string, thong_bao: string): Promise<void> => {
    await hd.chay(
      () => goi(`/api/thiet-bi/${encodeURIComponent(serial)}/${duong_dan}`, { method: 'POST', body: {} }),
      thong_bao,
    );
    nap_lai();
  };

  // Xoa han: chi hien khi may DA TAT. Hoi lai vi day la thao tac khong hoan tac duoc — du lich
  // su quet o lai, ban ghi khai bao may thi mat.
  const xoa = async (tb: ThietBi): Promise<void> => {
    const dong_y = await xn.hoi({
      tieu_de: `Xóa hẳn máy "${tb.ten}"?`,
      mo_ta: <>
        Serial <code>{tb.serial}</code>. Lịch sử lần quẹt của máy này <strong>vẫn giữ
        nguyên</strong> — bảng công cũ không đổi. Chỉ bản ghi khai báo máy và các lệnh chưa
        gửi bị xóa.
      </>,
      chu_dong_y: 'Xóa hẳn máy',
      nguy_hiem: true,
    });
    if (!dong_y) return;
    await hd.chay(
      () => goi(`/api/thiet-bi/${tb.id}`, { method: 'DELETE' }),
      'Đã xóa máy. Lịch sử lần quẹt vẫn còn.',
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

      <HuongDanCauHinh />

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
                    <td className="chu-nho">{tb.phien_ban_firmware ?? '—'}</td>
                    <td className="so chu-nho">{tb.dia_chi_ip ?? '—'}</td>
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
                          <button className="nut-nho" onClick={() => dat_xoa_nv_cho(tb)}
                            title="Xoá một PIN khỏi máy — kèm cả vân tay / khuôn mặt đã đăng ký">
                            Xoá NV
                          </button>
                          <button className="nut-nho"
                            onClick={() => lenh_may(tb.serial, 'dong-bo-gio',
                              'Đã xếp lệnh đồng bộ giờ. Máy sẽ nhận ở lần kết nối kế tiếp.')}
                            title="Lệch giờ máy là nguyên nhân phổ biến nhất làm sai công">
                            Đồng bộ giờ
                          </button>
                          <button className="nut-nho"
                            onClick={() => lenh_may(tb.serial, 'gui-lai-log',
                              'Đã yêu cầu máy gửi lại log. Bản ghi trùng sẽ tự bị bỏ qua.')}
                            title="Máy gửi những bản ghi NÓ CHO LÀ chưa đồng bộ">
                            Gửi lại log
                          </button>
                          <button className="nut-nho" onClick={() => dat_lay_log_cho(tb)}
                            title="Xin log theo khoảng ngày — dùng khi máy tưởng đã gửi hết">
                            Lấy log cũ
                          </button>
                          <button className="nut-nho" onClick={() => dat_doi_chieu_cho(tb)}
                            title="Kéo danh sách user trong máy về + đối chiếu PIN với hệ thống">
                            Đối chiếu user
                          </button>
                          <button className="nut-nho" onClick={() => dat_khoa_cua_cho(tb)}
                            title="Chặn VÀO ngoài giờ làm việc theo lịch">
                            Khóa cửa theo giờ
                          </button>
                          <button className="nut-nho nut-phang" onClick={() => dat_sua_cho(tb)}
                            title="Đổi tên gợi nhớ / vị trí của máy">
                            Sửa
                          </button>
                          <button className="nut-nho nut-phang" onClick={() => dat_xem_lenh(tb)}>
                            Lịch sử lệnh
                          </button>
                          <button className="nut-nho nut-phang" onClick={() => bat_tat(tb)}>
                            {tb.dang_bat ? 'Tắt' : 'Bật'}
                          </button>
                          {!tb.dang_bat && (
                            <button className="nut-nho nut-phang" onClick={() => xoa(tb)}
                              title="Xóa hẳn máy đã ngừng dùng. Lịch sử lần quẹt vẫn giữ nguyên.">
                              Xóa
                            </button>
                          )}
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

      {sua_cho !== null && (
        <FormSuaThietBi
          thiet_bi={sua_cho}
          khi_dong={() => dat_sua_cho(null)}
          khi_xong={() => { dat_sua_cho(null); nap_lai(); }}
        />
      )}

      {lay_log_cho !== null && (
        <FormLayLog thiet_bi={lay_log_cho} khi_dong={() => dat_lay_log_cho(null)} />
      )}

      {doi_chieu_cho !== null && (
        <DoiChieuNguoiDung thiet_bi={doi_chieu_cho} khi_dong={() => dat_doi_chieu_cho(null)} />
      )}
      {khoa_cua_cho !== null && (
        <KhoaCuaTheoGio thiet_bi={khoa_cua_cho} khi_dong={() => dat_khoa_cua_cho(null)} />
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
      {xoa_nv_cho !== null && (
        <XoaNhanVienKhoiMay
          thiet_bi={xoa_nv_cho}
          khi_dong={() => dat_xoa_nv_cho(null)}
          khi_xong={() => { dat_xoa_nv_cho(null); nap_lai(); }}
        />
      )}

      {xn.hop_thoai}
    </>
  );
}

function FormThietBi({ khi_dong, khi_xong }: { khi_dong: () => void; khi_xong: () => void }): ReactNode {
  const [serial, dat_serial] = useState('');
  const [ten, dat_ten] = useState('');
  const [vi_tri, dat_vi_tri] = useState('');
  const [pin_tu, dat_pin_tu] = useState('');
  const [pin_den, dat_pin_den] = useState('');
  const hd = dung_hanh_dong();

  const gui = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const ok = await hd.chay(() => goi('/api/thiet-bi', {
      method: 'POST',
      body: {
        serial: serial.trim(),
        ten: ten.trim(),
        vi_tri: vi_tri.trim() === '' ? null : vi_tri.trim(),
        pin_tu: pin_tu.trim() === '' ? null : Number(pin_tu),
        pin_den: pin_den.trim() === '' ? null : Number(pin_den),
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
            Lấy ở <strong>Menu › Hệ thống › Thông tin thiết bị › Số sê ri</strong> trên chính máy
            đó, không lấy số dán sau lưng máy. Phải khớp tuyệt đối, có phân biệt chữ hoa/thường.
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
        <div className="luoi luoi-2">
          <div className="o-nhap">
            <label htmlFor="pt">Dải PIN — từ</label>
            <input id="pt" type="number" min={1} value={pin_tu}
              onChange={(e) => dat_pin_tu(e.target.value)} placeholder="1001" />
          </div>
          <div className="o-nhap">
            <label htmlFor="pd">đến</label>
            <input id="pd" type="number" min={1} value={pin_den}
              onChange={(e) => dat_pin_den(e.target.value)} placeholder="1999" />
          </div>
        </div>
        <div className="goi-y">
          Hệ thống sẽ <strong>cấp PIN trong dải này</strong> cho nhân viên của máy, rồi bạn cài
          đúng số đó lên máy. Mỗi máy một dải riêng (VP1 <code>1001–1999</code>, VP2{' '}
          <code>2001–2999</code>) thì nhìn PIN là biết máy nào, và hai nơi không bao giờ cấp
          trùng số cho hai người khác nhau. Để trống thì cấp từ 1 trở lên.
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

/** Sua ten goi nho / vi tri cua may. Serial KHONG doi (la khoa may nhan dien) — chi hien de doi chieu. */
function FormSuaThietBi(
  { thiet_bi, khi_dong, khi_xong }:
  { thiet_bi: ThietBi; khi_dong: () => void; khi_xong: () => void },
): ReactNode {
  const [ten, dat_ten] = useState(thiet_bi.ten);
  const [vi_tri, dat_vi_tri] = useState(thiet_bi.vi_tri);
  const hd = dung_hanh_dong();

  const gui = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const ok = await hd.chay(
      () => goi(`/api/thiet-bi/${thiet_bi.id}`, {
        method: 'PATCH',
        body: { ten: ten.trim(), vi_tri: vi_tri.trim() === '' ? null : vi_tri.trim() },
      }),
      'Đã đổi thông tin máy.',
    );
    if (ok) khi_xong();
  };

  return (
    <HopThoai tieu_de={`Sửa máy — ${thiet_bi.ten}`} khi_dong={khi_dong}>
      <form onSubmit={gui}>
        <HopLoi loi={hd.loi} />
        <div className="o-nhap">
          <label htmlFor="s-sn">Serial</label>
          <input id="s-sn" value={thiet_bi.serial} readOnly />
          <div className="goi-y">
            Serial là khóa máy tự nhận diện — không đổi được. Muốn dùng serial khác thì khai máy mới.
          </div>
        </div>
        <div className="o-nhap">
          <label htmlFor="s-tn">Tên gợi nhớ *</label>
          <input id="s-tn" value={ten} onChange={(e) => dat_ten(e.target.value)}
            placeholder="Kho hàng - Cửa chính" required autoFocus />
        </div>
        <div className="o-nhap">
          <label htmlFor="s-vt">Vị trí</label>
          <input id="s-vt" value={vi_tri} onChange={(e) => dat_vi_tri(e.target.value)}
            placeholder="Kho hàng" />
        </div>
        <div className="hang-nut">
          <button type="submit" className="nut-chinh" disabled={hd.dang_chay || ten.trim() === ''}>
            {hd.dang_chay ? 'Đang lưu…' : 'Lưu'}
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
                      ? <span className="chu-mo">—</span>
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
  const [pin, dat_pin] = useState('');
  const hd = dung_hanh_dong();
  const { du_lieu } = dung_nap<NhanVien[]>('/api/nhan-vien?chi_dang_lam=true');
  const co_pin = (du_lieu ?? []).filter((n) => n.pin_may !== null);

  // Mot nguoi co the co NHIEU PIN — moi may mot PIN. Doc tu bang ma dinh danh de chon dung cai
  // cua may nay; cot `pin_may` chi chua duoc mot.
  const { du_lieu: cac_nhom } = dung_nap<NhomMaDinhDanh[]>(
    nhan_vien_id === '' ? null : `/api/nhan-vien/${nhan_vien_id}/ma-dinh-danh`, [nhan_vien_id]);
  const pin_dang_co = (cac_nhom ?? [])
    .find((n) => n.he_thong === 'may_cham_cong')?.cac_ma.map((m) => m.ma) ?? [];

  const gui = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const ok = await hd.chay(() => goi(
      `/api/thiet-bi/${encodeURIComponent(thiet_bi.serial)}/nap-nhan-vien`,
      { method: 'POST', body: pin === '' ? { nhan_vien_id } : { nhan_vien_id, pin } },
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
            <div className="goi-y chu-xau">
              Chưa có nhân viên nào được gán PIN máy.
            </div>
          )}
        </div>

        {pin_dang_co.length > 1 && (
          <div className="o-nhap">
            <label htmlFor="pinchon">PIN nạp xuống máy này *</label>
            <select id="pinchon" value={pin} onChange={(e) => dat_pin(e.target.value)} required>
              <option value="">— Chọn PIN —</option>
              {pin_dang_co.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <div className="goi-y">
              Người này có {pin_dang_co.length} PIN đang dùng. Chọn PIN đã khai{' '}
              <strong>trên chính máy {thiet_bi.ten}</strong> — nạp nhầm PIN của máy khác thì họ
              quẹt vào máy này sẽ không khớp được ai.
            </div>
          </div>
        )}

        <div className="hang-nut">
          <button
            type="submit"
            className="nut-chinh"
            disabled={hd.dang_chay || nhan_vien_id === ''
              || (pin_dang_co.length > 1 && pin === '')}
          >
            {hd.dang_chay ? 'Đang xếp lệnh…' : 'Nạp xuống máy'}
          </button>
          <button type="button" onClick={khi_dong}>Hủy</button>
        </div>
      </form>
    </HopThoai>
  );
}

/**
 * Xoa mot PIN khoi may cham cong.
 *
 * ADMS xoa duoc tu xa, KHAC voi dang ky: `DATA DELETE USERINFO PIN=...` go ca user lan van tay
 * / khuon mat da luu tren may. Chieu nguoc lai thi khong — sinh trac hoc phai dang ky truc tiep
 * tai may.
 *
 * KHONG dung danh sach nhan vien de chon nhu form "Nap NV": cai can xoa thuong la PIN KHONG
 * thuoc ai — van tay thu luc dang ky, hay nguoi da nghi tu truoc khi lap so. Nen o day nhap
 * thang so PIN.
 */
function XoaNhanVienKhoiMay(
  { thiet_bi, khi_dong, khi_xong }:
  { thiet_bi: ThietBi; khi_dong: () => void; khi_xong: () => void },
): ReactNode {
  const [pin, dat_pin] = useState('');
  const hd = dung_hanh_dong();

  const gui = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const ok = await hd.chay(() => goi(
      `/api/thiet-bi/${encodeURIComponent(thiet_bi.serial)}/nhan-vien/${encodeURIComponent(pin.trim())}`,
      { method: 'DELETE' },
    ));
    if (ok) khi_xong();
  };

  return (
    <HopThoai tieu_de={`Xoá PIN khỏi ${thiet_bi.ten}`} khi_dong={khi_dong}>
      <form onSubmit={gui}>
        <HopLoi loi={hd.loi} />

        <div className="hop-thong-bao hop-luu-y">
          Lệnh này xoá user khỏi <strong>chính máy này</strong>, kèm vân tay và khuôn mặt đã đăng
          ký trên đó. Không lấy lại được — người đó phải ra máy đăng ký lại từ đầu.
        </div>

        <div className="hop-thong-bao hop-tin">
          Số PIN do <strong>từng máy</strong> cấp. Nếu công ty có nhiều máy dùng chung một hệ
          đánh số thì phải xoá trên <strong>từng máy một</strong>; xoá ở đây không đụng tới máy khác.
        </div>

        <div className="o-nhap">
          <label htmlFor="pinxoa">Số PIN cần xoá *</label>
          <input id="pinxoa" value={pin} onChange={(e) => dat_pin(e.target.value)}
            required maxLength={32} autoComplete="off" />
          <div className="goi-y">
            Lần quẹt cũ của PIN này <strong>vẫn nằm nguyên</strong> trong hệ thống — xoá trên máy
            chỉ chặn quẹt mới, không xoá lịch sử chấm công.
          </div>
        </div>

        <div className="hang-nut">
          <button type="submit" className="nut-chinh nut-nguy"
            disabled={hd.dang_chay || pin.trim() === ''}>
            {hd.dang_chay ? 'Đang xếp lệnh…' : 'Xoá khỏi máy'}
          </button>
          <button type="button" onClick={khi_dong}>Hủy</button>
        </div>
      </form>
    </HopThoai>
  );
}

/**
 * Huong dan cau hinh may, tu doi theo cach he thong dang duoc trien khai.
 *
 * Ban truoc in cung mot doan chi dung cho kieu "may chu cung LAN": IP + cong 8080 +
 * Enable Domain Name tat. Chay tren VPS thi ca ba deu sai, va nguoi dung sai khong nhan
 * duoc loi nao — may chi im lang khong goi len. Nen suy ra tu chinh dia chi dang mo
 * webapp: do la dia chi ma may cham cong cung phai goi toi.
 */
function HuongDanCauHinh(): ReactNode {
  const chu_nha = window.location.hostname;
  const la_cuc_bo = chu_nha === 'localhost' || chu_nha === '127.0.0.1';
  // Mo webapp bang IP (hoac dang chay may lap) = kieu may chu cung LAN. Mo bang ten mien =
  // kieu may chu tren VPS. Hai kieu nay cau hinh khac nhau ca ba dong duoi.
  const qua_ten_mien = !la_cuc_bo && !/^\d{1,3}(\.\d{1,3}){3}$/.test(chu_nha);

  return (
    <div className="the">
      <h2>Cấu hình trên máy ZKTeco</h2>
      <p className="mo-ta">
        Trên máy: <strong>Menu › Comm (Kết nối) › Cloud Server Setting / ADMS</strong>.
      </p>
      <table className="bang-gon">
        <tbody>
          <tr><td>Server Mode</td><td><strong>ADMS</strong></td></tr>
          <tr>
            <td>Enable Domain Name</td>
            <td><strong>{qua_ten_mien ? 'Bật' : 'Tắt'}</strong>{' '}
              <span className="goi-y">
                {qua_ten_mien
                  ? 'để tắt thì máy không phân giải DNS và im lặng không gọi được'
                  : 'điền IP thì phải tắt'}
              </span>
            </td>
          </tr>
          <tr>
            <td>Server Address</td>
            <td>
              <strong>{la_cuc_bo ? 'địa chỉ IP máy chủ này' : chu_nha}</strong>{' '}
              <span className="goi-y">không kèm http:// và không kèm / ở cuối</span>
            </td>
          </tr>
          <tr>
            <td>Server Port</td>
            <td><strong>{qua_ten_mien ? '80' : '8080'}</strong>{' '}
              {qua_ten_mien && (
                <span className="goi-y">không phải 8080 — 8080 chỉ tồn tại bên trong máy chủ</span>
              )}
            </td>
          </tr>
          <tr>
            <td>Enable Proxy Server</td>
            <td><strong>Tắt</strong>{' '}
              <span className="goi-y">
                bật lên là máy đẩy hết qua proxy đã khai (thường bỏ trống thành 0.0.0.0) và
                không bao giờ tới được máy chủ
              </span>
            </td>
          </tr>
          <tr>
            <td>HTTPS</td>
            <td><strong>Tắt</strong>{' '}
              <span className="goi-y">nhiều firmware ZKTeco không làm được TLS</span>
            </td>
          </tr>
          <tr><td>Realtime</td><td><strong>Bật</strong></td></tr>
        </tbody>
      </table>
      <p className="mo-ta" style={{ marginBottom: 0 }}>
        Serial lấy ở <strong>Menu › Hệ thống › Thông tin thiết bị › Số sê ri</strong> trên chính
        máy đó — <strong>không</strong> lấy số dán sau lưng máy hay số trên hộp, hai số này khác
        nhau ở nhiều lô máy và ADMS chỉ gửi lên số sê ri firmware.
      </p>
    </div>
  );
}

/**
 * Xin log theo khoang ngay — khac "Gui lai log".
 *
 * "Gui lai log" (`CHECK`) hoi may "con gi CHUA GUI khong". Con tro "da gui toi dau" nam TRONG
 * MAY: mot may tung noi vao may chu ADMS khac co the da danh dau het la da gui, va luc do
 * `CHECK` tra ve 0 ban ghi — khong phai hong, ma la may tin rang no khong con gi.
 *
 * Duong nay hoi thang "dua toi log tu ngay A den ngay B", nen khong phu thuoc con tro do.
 */
function FormLayLog(
  { thiet_bi, khi_dong }: { thiet_bi: ThietBi; khi_dong: () => void },
): ReactNode {
  const [tu, dat_tu] = useState('');
  const [den, dat_den] = useState('');
  const hd = dung_hanh_dong();

  const gui = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    await hd.chay(
      () => goi(`/api/thiet-bi/${encodeURIComponent(thiet_bi.serial)}/lay-log`, {
        method: 'POST',
        body: { tu, den },
      }),
      'Đã xếp lệnh. Máy nhận ở lần kết nối kế tiếp — xem kết quả ở Lịch sử lệnh.',
    );
  };

  return (
    <HopThoai tieu_de={`Lấy log cũ từ ${thiet_bi.ten}`} khi_dong={khi_dong}>
      <form onSubmit={gui}>
        <HopLoi loi={hd.loi} />
        <HopTot chu={hd.tot} />

        <div className="hop-thong-bao hop-tin">
          Dùng khi máy <strong>không tự đẩy</strong> dữ liệu cũ. Nút <em>Gửi lại log</em> chỉ hỏi
          "còn gì chưa gửi" — mà máy từng nối vào máy chủ khác có thể đã đánh dấu hết là đã gửi.
          Đường này hỏi thẳng theo khoảng ngày.
        </div>

        <div className="o-nhap">
          <label htmlFor="ll-tu">Từ ngày *</label>
          <input id="ll-tu" type="date" value={tu} onChange={(e) => dat_tu(e.target.value)} required />
        </div>
        <div className="o-nhap">
          <label htmlFor="ll-den">Đến ngày *</label>
          <input id="ll-den" type="date" value={den} onChange={(e) => dat_den(e.target.value)} required />
          <div className="goi-y">
            Bản ghi trùng tự bị bỏ qua, nên chạy nhiều lần hay chọn khoảng rộng đều an toàn.
            Firmware cũ có thể không hỗ trợ lệnh này — khi đó xuất ra USB rồi dùng
            <em> Nhật ký quẹt → Nhập lịch sử từ file</em>.
          </div>
        </div>

        <div className="hang-nut">
          <button type="submit" className="nut-chinh"
            disabled={hd.dang_chay || tu === '' || den === ''}>
            {hd.dang_chay ? 'Đang xếp lệnh…' : 'Xin log'}
          </button>
          <button type="button" onClick={khi_dong}>Đóng</button>
        </div>
      </form>
    </HopThoai>
  );
}

// ==================================================================== đối chiếu user máy ↔ hệ thống
interface UserMay {
  pin: string;
  ten_may: string | null;
  the: string | null;
  quyen: number;
  thay_luc: string;
  ma_nv: string | null;
  ho_ten: string | null;
  khop: 'khop' | 'lech' | 'chua_gan' | 'khong_ten';
}
const NHAN_KHOP: Record<UserMay['khop'], { ten: string; lop: string }> = {
  khop: { ten: 'Khớp', lop: 'nhan-tot' },
  lech: { ten: 'LỆCH — người khác', lop: 'nhan-xau' },
  chua_gan: { ten: 'Hệ thống chưa gán', lop: 'nhan-canh-bao' },
  khong_ten: { ten: 'Máy không gửi tên', lop: 'nhan-mo' },
};

function DoiChieuNguoiDung(
  { thiet_bi, khi_dong }: { thiet_bi: ThietBi; khi_dong: () => void },
): ReactNode {
  const { du_lieu, dang_tai, loi, nap_lai } =
    dung_nap<{ serial: string; so_lech: number; danh_sach: UserMay[] }>(
      `/api/thiet-bi/${encodeURIComponent(thiet_bi.serial)}/nguoi-dung`, [thiet_bi.serial]);
  const hd = dung_hanh_dong();
  const ds = du_lieu?.danh_sach ?? [];

  return (
    <HopThoai tieu_de={`Đối chiếu user — ${thiet_bi.ten}`} khi_dong={khi_dong} rong>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}
      <p className="mo-ta" style={{ marginBottom: 10 }}>
        So sánh user <strong>đang enroll trong máy</strong> với người giữ PIN đó <strong>trong hệ
        thống</strong>. Dòng <span className="nhan-xau">LỆCH</span> = PIN này trong hệ thống thuộc
        người khác → lượt quẹt bị gán nhầm, cần cấp PIN riêng &amp; enroll lại.
      </p>

      <div className="hang-nut" style={{ marginBottom: 12 }}>
        <button className="nut" disabled={hd.dang_chay}
          onClick={() => void hd.chay(
            () => goi(`/api/thiet-bi/${encodeURIComponent(thiet_bi.serial)}/lay-nguoi-dung`,
              { method: 'POST', body: {} }),
            'Đã yêu cầu máy gửi danh sách user. Chờ ~15 giây rồi bấm “Tải lại”.',
          )}>
          Lấy từ máy
        </button>
        <button className="nut-phang" onClick={() => nap_lai()}>Tải lại</button>
      </div>

      {dang_tai ? <DangTai /> : loi !== null ? <HopLoi loi={loi} />
        : ds.length === 0 ? (
          <Trong tieu_de="Chưa có dữ liệu user từ máy này"
            mo_ta="Bấm “Lấy từ máy” rồi chờ ~15 giây và bấm “Tải lại”." />
        ) : (
          <>
            {du_lieu !== null && du_lieu.so_lech > 0 && (
              <div className="hop-thong-bao hop-loi">
                <strong>{du_lieu.so_lech}</strong> user bị lệch / chưa gán — xem các dòng đỏ/vàng bên dưới.
              </div>
            )}
            <div className="vo-bang">
              <table className="bang-gon">
                <thead>
                  <tr>
                    <th>PIN</th><th>Tên trên máy</th><th>Người trong hệ thống (PIN này)</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {ds.map((u) => (
                    <tr key={u.pin} className={u.khop === 'lech' ? 'dong-canh-bao' : undefined}>
                      <td className="so">{u.pin}</td>
                      <td>{u.ten_may ?? <span className="chu-mo">—</span>}</td>
                      <td>
                        {u.ma_nv === null ? <span className="chu-mo">— chưa gán —</span>
                          : <>{u.ma_nv} — {u.ho_ten}</>}
                      </td>
                      <td className="khong-ngat">
                        <span className={NHAN_KHOP[u.khop].lop}>{NHAN_KHOP[u.khop].ten}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

      <div className="hang-nut" style={{ marginTop: 12 }}>
        <button className="nut-phang" onClick={khi_dong}>Đóng</button>
      </div>
    </HopThoai>
  );
}

// ============================================================ khóa cửa theo giờ (chặn VÀO ngoài giờ)
interface LichKhoaCua {
  bat: boolean;
  gio_mo: string;
  gio_dong: string;
  cuoi_tuan_chan: boolean;
  lenh_mo: string;
  lenh_chan: string;
  trang_thai: 'mo' | 'chan' | null;
}

function KhoaCuaTheoGio(
  { thiet_bi, khi_dong }: { thiet_bi: ThietBi; khi_dong: () => void },
): ReactNode {
  const { du_lieu, dang_tai, loi } = dung_nap<LichKhoaCua>(
    `/api/thiet-bi/${thiet_bi.serial}/khoa-cua`);
  const hd = dung_hanh_dong();
  const xn = dung_xac_nhan();
  const [bat, dat_bat] = useState(false);
  const [gio_mo, dat_gio_mo] = useState('07:00');
  const [gio_dong, dat_gio_dong] = useState('19:00');
  const [ct, dat_ct] = useState(true);
  const [lenh_mo, dat_lenh_mo] = useState('');
  const [lenh_chan, dat_lenh_chan] = useState('');

  useEffect(() => {
    if (du_lieu === null) return;
    dat_bat(du_lieu.bat);
    dat_gio_mo(du_lieu.gio_mo.slice(0, 5));
    dat_gio_dong(du_lieu.gio_dong.slice(0, 5));
    dat_ct(du_lieu.cuoi_tuan_chan);
    dat_lenh_mo(du_lieu.lenh_mo);
    dat_lenh_chan(du_lieu.lenh_chan);
  }, [du_lieu]);

  const luu = (): void => {
    void hd.chay(() => goi(`/api/thiet-bi/${thiet_bi.serial}/khoa-cua`, {
      method: 'PUT',
      body: { bat, gio_mo, gio_dong, cuoi_tuan_chan: ct, lenh_mo, lenh_chan },
    }), 'Đã lưu lịch khóa cửa.');
  };

  const test = (lenh: string, nhan: string): void => {
    if (lenh.trim() === '') return;
    void xn.hoi({
      tieu_de: `Gửi lệnh ${nhan} ngay?`,
      mo_ta: `Lệnh này gửi thẳng xuống máy "${thiet_bi.ten}" và tác động lên cửa thật. `
        + 'Chỉ dùng khi bạn đã kiểm chứng lệnh đúng với firmware. Lối RA phải luôn tự do.',
      chu_dong_y: 'Gửi lệnh', nguy_hiem: true,
    }).then((ok) => {
      if (ok) {
        void hd.chay(() => goi(`/api/thiet-bi/${thiet_bi.serial}/khoa-cua/test`, {
          method: 'POST', body: { lenh },
        }), `Đã gửi lệnh ${nhan} xuống máy (chờ máy nhận ở lần kết nối kế tiếp).`);
      }
    });
  };

  return (
    <HopThoai tieu_de={`Khóa cửa theo giờ — ${thiet_bi.ten}`} khi_dong={khi_dong} rong>
      {xn.hop_thoai}
      <div className="hop-luu-y">
        <b>An toàn PCCC:</b> tính năng này chỉ <b>chặn chiều VÀO</b> ngoài giờ. Lối <b>RA phải
        luôn tự do</b> bằng phần cứng (nút thoát / thanh đẩy / khóa fail-safe) — không được khóa
        lối thoát hiểm. Kiểm tra đấu nối cửa trước khi bật.
      </div>
      <div className="hop-luu-y">
        <b>Cách chắc chắn nhất (khuyến nghị):</b> đặt <b>Khung giờ / Time Zone</b> ngay trên máy —{' '}
        <i>Menu → Kiểm soát cửa (Access Control) → Time Zone/Time Rule</i>: cho phép mở cửa chỉ
        trong khung {gio_mo}–{gio_dong}, ngoài giờ máy tự từ chối. Cách này máy <b>tự thực thi
        cục bộ</b>, không phụ thuộc mạng/máy chủ. Lệnh gửi từ máy chủ dưới đây chỉ là lớp
        <b> bổ trợ, best-effort</b> — nhiều firmware acc không có lệnh "chặn bền vững" (chỉ có
        mở/đóng relay tức thời), nên phải Test để biết máy có nhận không.
      </div>
      {dang_tai ? <DangTai /> : loi !== null ? <HopLoi loi={loi} /> : (
        <>
          <HopLoi loi={hd.loi} />
          <HopTot chu={hd.tot} />

          <div className="o-nhap-ngang">
            <input id="kc-bat" type="checkbox" checked={bat} onChange={(e) => dat_bat(e.target.checked)} />
            <label htmlFor="kc-bat">Bật chặn VÀO ngoài giờ cho máy này</label>
          </div>

          <div className="luoi luoi-2">
            <div className="o-nhap"><label htmlFor="kc-mo">Giờ mở cửa (bắt đầu cho vào)</label>
              <input id="kc-mo" type="time" value={gio_mo} onChange={(e) => dat_gio_mo(e.target.value)} /></div>
            <div className="o-nhap"><label htmlFor="kc-dong">Giờ đóng cửa (ngừng cho vào)</label>
              <input id="kc-dong" type="time" value={gio_dong} onChange={(e) => dat_gio_dong(e.target.value)} /></div>
          </div>
          <div className="o-nhap-ngang">
            <input id="kc-ct" type="checkbox" checked={ct} onChange={(e) => dat_ct(e.target.checked)} />
            <label htmlFor="kc-ct">Chặn cả ngày Thứ Bảy và Chủ Nhật</label>
          </div>
          <p className="mo-ta">Ngoài khung {gio_mo}–{gio_dong}{ct ? ' và cuối tuần' : ''}, hệ thống
            gửi lệnh chặn vào; trong khung thì gửi lệnh mở lại. Trạng thái hiện tại:{' '}
            <b>{du_lieu?.trang_thai === 'chan' ? 'đang chặn' : du_lieu?.trang_thai === 'mo' ? 'đang mở' : 'chưa áp dụng'}</b>.</p>

          <label htmlFor="kc-lmo">Lệnh MỞ (cho vào) gửi xuống máy</label>
          <input id="kc-lmo" value={lenh_mo} onChange={(e) => dat_lenh_mo(e.target.value)}
            placeholder="vd: CONTROL DEVICE 1 1  (mở/nhả relay cửa 1 — lệnh phổ biến nhất)" />
          <div className="hang-nut" style={{ marginBottom: 12 }}>
            <button className="nut-nho nut-phang" disabled={hd.dang_chay || lenh_mo.trim() === ''}
              onClick={() => test(lenh_mo, 'MỞ')}>Test gửi lệnh MỞ ngay</button>
          </div>

          <label htmlFor="kc-lchan">Lệnh CHẶN (chặn vào) gửi xuống máy</label>
          <input id="kc-lchan" value={lenh_chan} onChange={(e) => dat_lenh_chan(e.target.value)}
            placeholder="thử: CONTROL DEVICE 1 0 hoặc CONTROL DEVICE 4 1 — nhiều firmware KHÔNG chặn bền vững" />
          <div className="hang-nut" style={{ marginBottom: 12 }}>
            <button className="nut-nho nut-phang" disabled={hd.dang_chay || lenh_chan.trim() === ''}
              onClick={() => test(lenh_chan, 'CHẶN')}>Test gửi lệnh CHẶN ngay</button>
          </div>
          <p className="mo-ta">Lệnh cửa khác nhau theo firmware, và phần lớn máy acc chỉ có
            mở/đóng relay <b>tức thời</b> — không có lệnh chặn bền vững. Để trống thì lịch không
            gửi gì (an toàn). Muốn chặn chắc chắn, hãy đặt Time Zone trên máy như hướng dẫn ở trên.
            Dùng nút Test để xem máy trả mã gì (0 = nhận, số âm = từ chối).</p>

          <div className="hang-nut">
            <button className="nut-chinh" disabled={hd.dang_chay} onClick={luu}>
              {hd.dang_chay ? 'Đang lưu…' : 'Lưu lịch'}
            </button>
            <button className="nut-phang" onClick={khi_dong}>Đóng</button>
          </div>
        </>
      )}
    </HopThoai>
  );
}
