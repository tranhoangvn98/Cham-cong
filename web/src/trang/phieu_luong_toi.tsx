// Phieu luong CUA TOI: nhan vien tu xem phieu luong hang thang da duyet/da tra, xem TUNG khoan.
//
// Mot bang luong khong giai thich duoc la mot don khieu nai — nen o day hien tung khoan thu
// nhap va tung khoan tru, khong gop thanh mot con so "phu cap".
import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { goi, gui_tep } from '../api.ts';
import { lay_muc_tieu_bao, nghe_muc_tieu_bao } from '../dieu_huong_sau.ts';
import {
  AnhCoToken, DangTai, HopLoi, HopThoai, ThreadKhieuNai, Trong, dung_hanh_dong, dung_nap, ngay_gio,
  type TinNhanKN,
} from '../thanh_phan.tsx';

interface KhoanPhieu {
  khoan_ma: string;
  ten: string;
  loai: 'thu_nhap' | 'tru';
  so_luong: string | null;
  don_gia: string | null;
  thanh_tien: string;
  ghi_chu: string | null;
  chiu_thue: boolean;
  chi_tiet?: { id: string; ly_do: string; so_tien: string; thu_tu: number }[];
}

interface Phieu {
  id: string;
  thang: string;
  trang_thai_ky: string;
  luong_co_ban: string;
  phu_cap: string;
  so_ngay_cong_chuan: string;
  so_ngay_cong_thuc: string;
  luong_ngay: string;
  luong_theo_cong: string;
  phut_ot: string;
  tien_ot: string;
  thuong: string;
  phu_cap_khac: string;
  tong_thu_nhap: string;
  muc_dong_bh: string;
  so_nguoi_phu_thuoc: string;
  giam_tru_tong: string;
  thu_nhap_tinh_thue: string;
  bhxh_nld: string;
  bhyt_nld: string;
  bhtn_nld: string;
  thue_tncn: string;
  tru_khac: string;
  tong_tru: string;
  thuc_linh: string;
  thuc_linh_lam_tron: string;
  loai_hop_dong: string | null;
  ep_du_cong: boolean;
  mien_phat: boolean;
  khoan: KhoanPhieu[];
}

interface KhieuNai {
  id: string;
  ma: string | null;
  noi_dung: string;
  trang_thai: string;
  phan_hoi: string | null;
  tao_luc: string;
  thang: string;
  anh: { id: string; ten: string }[];
  tra_loi: TinNhanKN[];
}

const NHAN_TT_KN: Record<string, { ten: string; lop: string }> = {
  moi: { ten: 'Mới', lop: 'nhan-xau' },
  dang_xem: { ten: 'Đang xem xét', lop: 'nhan-canh-bao' },
  chap_nhan: { ten: 'Đã chấp nhận', lop: 'nhan-tot' },
  tu_choi: { ten: 'Đã từ chối', lop: 'nhan-mo' },
};

const dinh_dang = new Intl.NumberFormat('vi-VN');
const tien = (v: unknown): string => dinh_dang.format(Math.round(Number(v) || 0));
const thang_viet = (t: string): string => {
  const [n, m] = t.split('-');
  return `Tháng ${m}/${n}`;
};
const TRANG_THAI: Record<string, string> = { da_duyet: 'Đã duyệt', da_tra: 'Đã trả' };
const LOAI_HD: Record<string, string> = {
  thu_viec: 'Thử việc', xac_dinh: 'Xác định thời hạn', khong_xac_dinh: 'Không xác định thời hạn',
  thoi_vu: 'Thời vụ', cong_tac_vien: 'Cộng tác viên', hoc_viec: 'Học việc',
};

export function TrangPhieuLuongToi({ thang_loc }: { thang_loc?: string } = {}): ReactNode {
  const { du_lieu, dang_tai, loi } = dung_nap<Phieu[]>('/api/toi/phieu-luong');
  const kn = dung_nap<KhieuNai[]>('/api/toi/khieu-nai-luong');
  const [chon, dat_chon] = useState(0);
  const [mo_kn, dat_mo_kn] = useState(false);

  if (dang_tai) return <DangTai />;
  if (loi !== null) return <HopLoi loi={loi} />;
  // `thang_loc` (khi nhung trong màn Lương cá nhân): chỉ hiện phiếu của tháng đó, ẩn ô chọn kỳ.
  const ds = thang_loc != null
    ? (du_lieu ?? []).filter((x) => x.thang === thang_loc)
    : (du_lieu ?? []);
  if (ds.length === 0) {
    return (
      <Trong tieu_de="Chưa có phiếu lương"
        mo_ta="Phiếu lương hiện sau khi kế toán chốt và duyệt kỳ lương của tháng." />
    );
  }

  const p = ds[Math.min(chon, ds.length - 1)]!;
  const thu_nhap = p.khoan.filter((k) => k.loai === 'thu_nhap');
  const khau_tru = p.khoan.filter((k) => k.loai === 'tru');
  // "Luong theo cong" gop CA luong co ban + phu cap roi nhan ti le cong. Tach ra de nhan vien
  // THAY RO phan phu cap (chi tiet phu cap), khong chi mot cuc "luong theo cong".
  const ty_le_cong = Number(p.so_ngay_cong_chuan) > 0
    ? Number(p.so_ngay_cong_thuc) / Number(p.so_ngay_cong_chuan) : 0;
  const pc_theo_cong = Math.round((Number(p.phu_cap) || 0) * ty_le_cong);
  const luong_cb_theo_cong = Math.round(Number(p.luong_theo_cong) || 0) - pc_theo_cong;
  // Cac khoan PHAT (di muon / nua ngay do di muon) — de hien ro "chi tiet phat" cho nguoi bi phat,
  // hoac ghi "da mien phat" khi admin da mien va khong co dong phat nao.
  const co_khoan_phat = khau_tru.some(
    (k) => k.khoan_ma === 'tru_di_muon' || k.khoan_ma === 'tru_nua_ngay',
  );

  return (
    <>
      {thang_loc == null && (
        <div className="dau-trang">
          <div>
            <p className="mo-ta">Phiếu lương hàng tháng của bạn — xem chi tiết từng khoản.</p>
          </div>
          <button className="nut-phang" onClick={() => window.print()}>In phiếu</button>
        </div>
      )}

      {thang_loc == null && (
        <div className="bo-loc">
          <div className="o-nhap">
            <label htmlFor="ky">Kỳ lương</label>
            <select id="ky" value={chon} onChange={(e) => dat_chon(Number(e.target.value))}>
              {ds.map((x, i) => (
                <option key={x.id} value={i}>
                  {thang_viet(x.thang)} — {TRANG_THAI[x.trang_thai_ky] ?? x.trang_thai_ky}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="the phieu-luong">
        <div className="phieu-dau">
          <div>
            <h2>{thang_viet(p.thang)}</h2>
            <span className="nhan nhan-tot">{TRANG_THAI[p.trang_thai_ky] ?? p.trang_thai_ky}</span>
            {p.loai_hop_dong !== null && (
              <span className="nhan nhan-mo"> {LOAI_HD[p.loai_hop_dong] ?? p.loai_hop_dong}</span>
            )}
            {p.ep_du_cong && (
              <span className="nhan nhan-canh-bao" title="Được tính đủ ngày công (miễn chấm công)">
                {' '}Đủ công
              </span>
            )}
            {p.mien_phat && (
              <span className="nhan nhan-canh-bao" title="Được miễn phạt đi muộn/về sớm">
                {' '}Miễn phạt
              </span>
            )}
          </div>
          <div className="phieu-thuc-linh">
            <span className="mo-ta">Thực nhận</span>
            <strong>{tien(p.thuc_linh_lam_tron)} đ</strong>
          </div>
        </div>

        <div className="phieu-cong">
          <span>Công chuẩn: <strong>{p.so_ngay_cong_chuan}</strong></span>
          <span>Công thực tế: <strong>{p.so_ngay_cong_thuc}</strong></span>
          <span>Lương cơ bản: <strong>{tien(p.luong_co_ban)} đ</strong></span>
          <span>Lương/ngày công: <strong>{tien(p.luong_ngay)} đ</strong></span>
        </div>

        <h3>Thu nhập</h3>
        <div className="vo-bang">
          <table>
            <tbody>
              {Number(p.phu_cap) > 0 ? (
                <>
                  <tr>
                    <td>Lương cơ bản (theo công)
                      <span className="mo-ta"> {p.so_ngay_cong_thuc}/{p.so_ngay_cong_chuan} công</span></td>
                    <td className="phai">{tien(luong_cb_theo_cong)}</td>
                  </tr>
                  <tr>
                    <td>Phụ cấp (theo công)
                      <span className="mo-ta"> {tien(p.phu_cap)}đ/tháng × {p.so_ngay_cong_thuc}/{p.so_ngay_cong_chuan}</span></td>
                    <td className="phai">{tien(pc_theo_cong)}</td>
                  </tr>
                </>
              ) : (
                <tr>
                  <td>Lương theo công
                    <span className="mo-ta"> {p.so_ngay_cong_thuc}/{p.so_ngay_cong_chuan} công</span></td>
                  <td className="phai">{tien(p.luong_theo_cong)}</td>
                </tr>
              )}
              {Number(p.tien_ot) > 0 && (
                <tr>
                  <td>Làm thêm giờ (OT){Number(p.phut_ot) > 0 &&
                    <span className="mo-ta"> {Math.floor(Number(p.phut_ot) / 60)}h{Number(p.phut_ot) % 60 > 0 ? String(Number(p.phut_ot) % 60).padStart(2, '0') : ''}</span>}</td>
                  <td className="phai">{tien(p.tien_ot)}</td>
                </tr>
              )}
              {thu_nhap.map((k) => (
                <tr key={k.khoan_ma}>
                  <td>{k.ten}{k.chiu_thue ? '' : ' (miễn thuế)'}
                    {k.so_luong !== null && Number(k.so_luong) > 0 &&
                      <span className="mo-ta"> × {k.so_luong}</span>}</td>
                  <td className="phai">{tien(k.thanh_tien)}</td>
                </tr>
              ))}
              {Number(p.thuong) > 0 && (
                <tr><td>Thưởng</td><td className="phai">{tien(p.thuong)}</td></tr>
              )}
              {Number(p.phu_cap_khac) > 0 && (
                <tr><td>Phụ cấp khác</td><td className="phai">{tien(p.phu_cap_khac)}</td></tr>
              )}
              <tr className="hang-tong">
                <td><strong>Tổng thu nhập</strong></td>
                <td className="phai"><strong>{tien(p.tong_thu_nhap)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3>Khấu trừ</h3>
        <div className="vo-bang">
          <table>
            <tbody>
              <tr><td>BHXH (8%)</td><td className="phai">{tien(p.bhxh_nld)}</td></tr>
              <tr><td>BHYT (1,5%)</td><td className="phai">{tien(p.bhyt_nld)}</td></tr>
              <tr><td>BHTN (1%)</td><td className="phai">{tien(p.bhtn_nld)}</td></tr>
              {Number(p.thue_tncn) > 0 && (
                <tr><td>Thuế TNCN</td><td className="phai">{tien(p.thue_tncn)}</td></tr>
              )}
              {khau_tru.map((k) => (
                (k.chi_tiet !== undefined && k.chi_tiet.length > 0) ? (
                  // Khoan da tach nhieu lenh: hien tung dong rieng roi dong tong.
                  <Fragment key={k.khoan_ma}>
                    <tr><td colSpan={2}><strong>{k.ten}</strong></td></tr>
                    {k.chi_tiet.map((c) => (
                      <tr key={c.id}>
                        <td style={{ paddingLeft: 18 }}>— {c.ly_do}</td>
                        <td className="phai">{tien(c.so_tien)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td style={{ paddingLeft: 18 }} className="mo-ta">Cộng</td>
                      <td className="phai"><em>{tien(k.thanh_tien)}</em></td>
                    </tr>
                  </Fragment>
                ) : (
                  <tr key={k.khoan_ma}>
                    <td>{k.ten}
                      {k.so_luong !== null && Number(k.so_luong) > 0 &&
                        <span className="mo-ta"> × {k.so_luong}</span>}</td>
                    <td className="phai">{tien(k.thanh_tien)}</td>
                  </tr>
                )
              ))}
              {Number(p.tru_khac) > 0 && (
                <tr><td>Trừ khác</td><td className="phai">{tien(p.tru_khac)}</td></tr>
              )}
              {p.mien_phat && !co_khoan_phat && (
                <tr><td className="mo-ta" colSpan={2}>Đã miễn phạt đi muộn/về sớm kỳ này (không trừ).</td></tr>
              )}
              <tr className="hang-tong">
                <td><strong>Tổng khấu trừ</strong></td>
                <td className="phai"><strong>{tien(p.tong_tru)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="phieu-ket">
          <span>Thực nhận (làm tròn)</span>
          <strong>{tien(p.thuc_linh_lam_tron)} đ</strong>
        </div>

        <div className="hop-thong-bao" style={{ marginTop: 12, fontSize: 13 }}>
          <strong>Chi tiết thuế &amp; bảo hiểm</strong>
          <div className="mo-ta" style={{ marginTop: 4 }}>
            Mức lương đóng BHXH: <strong>{tien(p.muc_dong_bh)} đ</strong> · Giảm trừ gia cảnh:
            bản thân + <strong>{p.so_nguoi_phu_thuoc}</strong> người phụ thuộc
            (tổng {tien(p.giam_tru_tong)} đ) · Thu nhập tính thuế: {tien(p.thu_nhap_tinh_thue)} đ
          </div>
        </div>
      </div>

      <div
        className="phieu-ket-nut"
        style={{
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          border: '1.5px solid #DC2626', background: '#FEF2F2',
          borderRadius: 8, padding: '12px 14px', marginTop: 12,
        }}
      >
        <span style={{ color: '#B91C1C', fontSize: 13, flex: '1 1 220px' }}>
          Thấy sai số liệu? Gửi <strong>khiếu nại</strong> để Phòng Nhân sự tiếp nhận và chỉnh sửa.
        </span>
        <button
          className="nut-phang"
          style={{ borderColor: '#DC2626', color: '#fff', background: '#DC2626', fontWeight: 600 }}
          onClick={() => dat_mo_kn(true)}
        >
          Khiếu nại phiếu lương này
        </button>
      </div>

      {(kn.du_lieu ?? []).length > 0 && (
        <DanhSachKhieuNai ds={kn.du_lieu ?? []} khi_doi={() => kn.nap_lai()} />
      )}

      {thang_loc == null && (
        <div className="hop-thong-bao hop-luu-y">
          Phiếu lương chỉ hiện khi kỳ đã được duyệt/trả. Nếu thấy sai, bấm
          <strong> Khiếu nại phiếu lương này</strong> để gửi Phòng Nhân sự, hoặc gửi giải trình ở mục
          <strong> Đơn của tôi</strong> — mỗi khoản đều ghi rõ để đối chiếu.
        </div>
      )}

      {mo_kn && (
        <HopThoaiKhieuNaiLuong
          phieu_id={p.id} thang={thang_viet(p.thang)}
          khi_dong={() => dat_mo_kn(false)}
          khi_xong={() => { dat_mo_kn(false); kn.nap_lai(); }}
        />
      )}
    </>
  );
}

function HopThoaiKhieuNaiLuong(
  { phieu_id, thang, khi_dong, khi_xong }:
  { phieu_id: string; thang: string; khi_dong: () => void; khi_xong: () => void },
): ReactNode {
  const [noi_dung, dat_noi_dung] = useState('');
  const [anh, dat_anh] = useState<File[]>([]);
  const hd = dung_hanh_dong();

  const gui = (): void => {
    void hd.chay(async () => {
      const kq = await goi<{ id: string }>(
        '/api/toi/khieu-nai-luong',
        { method: 'POST', body: { phieu_luong_id: phieu_id, noi_dung } },
      );
      // Co anh thi dinh kem sau khi tao khieu nai (can id vua tao). Gui LAN LUOT tung anh —
      // moi anh mot ban ghi tep, khong gioi han so luong.
      if (anh.length > 0 && typeof kq.id === 'string') {
        for (const f of anh) {
          const fd = new FormData();
          fd.append('anh', f);
          await gui_tep(`/api/toi/khieu-nai-luong/${kq.id}/anh`, fd);
        }
      }
      return kq;
    }, 'Đã gửi khiếu nại.').then((ok) => { if (ok) khi_xong(); });
  };

  return (
    <HopThoai tieu_de={`Khiếu nại phiếu lương ${thang}`} khi_dong={khi_dong}>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}
      <p className="mo-ta">
        Mô tả rõ khoản bạn cho là chưa đúng (công, thưởng, phụ cấp, khấu trừ…) để Phòng Nhân sự
        đối chiếu và phản hồi.
      </p>
      <label htmlFor="knnd">Nội dung khiếu nại</label>
      <textarea id="knnd" value={noi_dung} onChange={(e) => dat_noi_dung(e.target.value)}
        placeholder="Ví dụ: Công thực tế tháng này là 24 nhưng phiếu ghi 22…" rows={4} />
      <label htmlFor="knanh" style={{ marginTop: 10, display: 'block' }}>Ảnh đính kèm (có thể chọn nhiều ảnh — tùy chọn)</label>
      <input id="knanh" type="file" accept="image/*" multiple
        onChange={(e) => dat_anh(Array.from(e.target.files ?? []))} />
      {anh.length > 0 && (
        <div className="mo-ta" style={{ marginTop: 4 }}>
          Đã chọn {anh.length} ảnh: {anh.map((f) => f.name).join(', ')}
        </div>
      )}
      <div className="hang-nut" style={{ marginTop: 12 }}>
        <button className="nut-lanh" disabled={hd.dang_chay || noi_dung.trim().length < 5} onClick={gui}>
          Gửi khiếu nại
        </button>
        <button className="nut-phang" onClick={khi_dong}>Đóng</button>
      </div>
    </HopThoai>
  );
}

/** O tra loi cua NGUOI LAO DONG vao thread khieu nai (khi ticket con mo). */
function OTraLoiKN({ kn_id, khi_gui }: { kn_id: string; khi_gui: () => void }): ReactNode {
  const [noi_dung, dat_noi_dung] = useState('');
  const hd = dung_hanh_dong();
  const gui = (): void => {
    void hd.chay(
      () => goi(`/api/toi/khieu-nai-luong/${kn_id}/tra-loi`, { method: 'POST', body: { noi_dung } }),
      'Đã gửi trả lời.',
    ).then((ok) => { if (ok) { dat_noi_dung(''); khi_gui(); } });
  };
  return (
    <div style={{ marginTop: 8 }}>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}
      <textarea value={noi_dung} onChange={(e) => dat_noi_dung(e.target.value)} rows={2}
        placeholder="Trả lời / bổ sung thông tin cho Phòng Nhân sự…" />
      <div className="hang-nut" style={{ marginTop: 6 }}>
        <button className="nut-lanh" disabled={hd.dang_chay || noi_dung.trim().length < 1} onClick={gui}>
          Gửi trả lời
        </button>
      </div>
    </div>
  );
}

/** Them nhieu anh minh chung vao mot khieu nai DANG MO (nguoi lao dong). */
function OThemAnhKN({ kn_id, khi_gui }: { kn_id: string; khi_gui: () => void }): ReactNode {
  const hd = dung_hanh_dong();
  const them = (files: FileList | null): void => {
    const ds = Array.from(files ?? []);
    if (ds.length === 0) return;
    void hd.chay(async () => {
      for (const f of ds) {
        const fd = new FormData();
        fd.append('anh', f);
        await gui_tep(`/api/toi/khieu-nai-luong/${kn_id}/anh`, fd);
      }
      return true;
    }, `Đã thêm ${ds.length} ảnh.`).then((ok) => { if (ok) khi_gui(); });
  };
  return (
    <div style={{ marginTop: 6 }}>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}
      <label className="mo-ta" style={{ display: 'block', marginBottom: 2 }}>
        Thêm ảnh minh chứng (có thể chọn nhiều):
      </label>
      <input type="file" accept="image/*" multiple disabled={hd.dang_chay}
        onChange={(e) => { them(e.target.files); e.currentTarget.value = ''; }} />
    </div>
  );
}

/** Danh sach khieu nai + thread trao doi; dung o ca man Phieu luong lan tab Khieu nai. */
export function DanhSachKhieuNai(
  { ds, khi_doi }: { ds: KhieuNai[]; khi_doi: () => void },
): ReactNode {
  // Muc tieu tu thong bao: cuon toi dung ticket + lam noi bat thoang qua (thao luan da hien san
  // trong tung ticket). Doc luc mount VA nghe tin hieu sau (dang o san tab nay ma bam thong bao).
  const [can_mo, dat_can_mo] = useState<string | null>(() => lay_muc_tieu_bao('khieu-nai-luong'));
  const [noi_bat, dat_noi_bat] = useState<string | null>(null);

  useEffect(() => nghe_muc_tieu_bao(() => {
    const id = lay_muc_tieu_bao('khieu-nai-luong');
    if (id !== null) dat_can_mo(id);
  }), []);

  useEffect(() => {
    if (can_mo === null) return;
    if (!ds.some((x) => x.id === can_mo)) return; // chua co trong danh sach -> cho lan nap sau
    const id = can_mo;
    dat_can_mo(null);
    // Cho DOM ve xong roi cuon toi; lam noi bat ~2,5s roi tat.
    const t = window.setTimeout(() => {
      document.getElementById(`kn-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      dat_noi_bat(id);
      window.setTimeout(() => dat_noi_bat(null), 2500);
    }, 60);
    return () => window.clearTimeout(t);
  }, [ds, can_mo]);

  return (
    <div className="the">
      <h3 style={{ marginTop: 0 }}>Khiếu nại phiếu lương của bạn</h3>
      {ds.map((x) => {
        const mo = x.trang_thai === 'moi' || x.trang_thai === 'dang_xem';
        return (
          <div key={x.id} id={`kn-${x.id}`} className="hop-thong-bao"
            style={{
              marginBottom: 12,
              transition: 'box-shadow .3s, background-color .3s',
              ...(x.id === noi_bat
                ? { boxShadow: '0 0 0 2px var(--mau-chinh, #2563eb)', borderRadius: 8 }
                : {}),
            }}>
            <div>
              <span className={`nhan ${NHAN_TT_KN[x.trang_thai]?.lop ?? 'nhan-mo'}`}>
                {NHAN_TT_KN[x.trang_thai]?.ten ?? x.trang_thai}
              </span>
              <span className="mo-ma"> {x.ma ?? ''} · Kỳ {thang_viet(x.thang)} · {ngay_gio(x.tao_luc)}</span>
            </div>
            <ThreadKhieuNai noi_dung={x.noi_dung} tao_luc={x.tao_luc} tra_loi={x.tra_loi} />
            {x.anh.length > 0 && (
              <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {x.anh.map((a) => (
                  <AnhCoToken key={a.id} duong_dan={`/api/toi/khieu-nai-luong/anh/${a.id}`} alt={a.ten} cao={72} />
                ))}
              </div>
            )}
            {mo ? (
              <>
                <OTraLoiKN kn_id={x.id} khi_gui={khi_doi} />
                <OThemAnhKN kn_id={x.id} khi_gui={khi_doi} />
              </>
            ) : (
              <div className="mo-ta" style={{ marginTop: 6 }}>
                Ticket đã đóng ({NHAN_TT_KN[x.trang_thai]?.ten ?? x.trang_thai}).
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Tab "Khieu nai" ben ca nhan: lap khieu nai moi (chon ky) + theo doi & trao doi. */
export function TrangKhieuNaiToi(): ReactNode {
  const phieu = dung_nap<{ id: string; thang: string; trang_thai_ky: string }[]>('/api/toi/phieu-luong');
  const kn = dung_nap<KhieuNai[]>('/api/toi/khieu-nai-luong');
  const [chon, dat_chon] = useState(0);
  const [mo, dat_mo] = useState(false);

  if (phieu.dang_tai || kn.dang_tai) return <DangTai />;
  if (phieu.loi !== null) return <HopLoi loi={phieu.loi} />;
  const ds_phieu = phieu.du_lieu ?? [];
  const ds_kn = kn.du_lieu ?? [];
  const p = ds_phieu[Math.min(chon, Math.max(0, ds_phieu.length - 1))];

  return (
    <div className="cn-cot-gap" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="the">
        <h3 style={{ marginTop: 0 }}>Lập khiếu nại phiếu lương</h3>
        {ds_phieu.length === 0 ? (
          <div className="mo-ta">Chưa có phiếu lương đã duyệt nào để khiếu nại.</div>
        ) : (
          <>
            <label htmlFor="kn_ky">Chọn kỳ lương</label>
            <select id="kn_ky" value={chon} onChange={(e) => dat_chon(Number(e.target.value))}>
              {ds_phieu.map((x, i) => <option key={x.id} value={i}>{thang_viet(x.thang)}</option>)}
            </select>
            <div className="hang-nut" style={{ marginTop: 8 }}>
              <button className="nut-lanh" onClick={() => dat_mo(true)}>Lập khiếu nại kỳ này</button>
            </div>
          </>
        )}
      </div>

      {ds_kn.length === 0 ? (
        <Trong tieu_de="Chưa có khiếu nại nào"
          mo_ta="Khi bạn gửi khiếu nại phiếu lương, nó hiện ở đây kèm trạng thái xử lý và trao đổi với Nhân sự." />
      ) : (
        <DanhSachKhieuNai ds={ds_kn} khi_doi={() => kn.nap_lai()} />
      )}

      {mo && p !== undefined && (
        <HopThoaiKhieuNaiLuong
          phieu_id={p.id} thang={thang_viet(p.thang)}
          khi_dong={() => dat_mo(false)}
          khi_xong={() => { dat_mo(false); kn.nap_lai(); }}
        />
      )}
    </div>
  );
}
