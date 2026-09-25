// Quy trinh thoi viec — hai mat cua cung mot dong tien:
//
//   TrangThoiViec            — goc nhin Admin: giam sat, bo qua muc, gan nguoi nhan ban giao,
//                              Cong 2 (chot lastday + chay dung hoat dong), cau hinh.
//   TrangHuongDanThoiViec    — goc nhin nhan vien: lam checklist, dinh kem bang chung, ky
//                              dien tu, xac nhan ban giao va ky bien ban.
//
// Moi chuoi hien thi co dau (quy uoc CLAUDE.md); ten bien/ham khong dau.
import { useState, type ReactNode } from 'react';
import { goi, gui_tep, tai_tep, la_nhan_su } from '../api.ts';
import {
  dung_nap, dung_hanh_dong, dung_xac_nhan, Trong, HopThoaiXemTep,
  ngay_viet, ngay_gio, hom_nay,
} from '../thanh_phan.tsx';
import { dung_phan_trang } from '../phan_trang.tsx';
import { Chon } from '../chon.tsx';
import { dung_tuyen } from '../dinh_tuyen.tsx';

// ---------------------------------------------------------------- kieu du lieu

interface MucThoiViec {
  id: string;
  ma_muc: string;
  nhom: string;
  loai_tu_dong: 'nhan_vien' | 'tu_dong' | 'script_cuoi';
  tieu_de: string;
  bat_buoc: boolean;
  trang_thai: 'chua' | 'dang' | 'xong' | 'bo_qua';
  bang_chung_tep_id: string | null;
  bang_chung_ten_goc: string | null;
  ket_qua: unknown;
  xac_nhan_boi: string | null;
  xac_nhan_luc: string | null;
  ghi_chu: string | null;
}

interface MucBanGiao {
  id: string;
  ban_giao_id: string;
  mo_ta: string;
  bat_buoc: boolean;
  trang_thai: 'chua' | 'da_ban_giao';
  nguoi_xac_nhan_ten: string | null;
  xac_nhan_luc: string | null;
  ghi_chu: string | null;
}

interface BanGiao {
  id: string;
  bien_ban_tep_id: string | null;
  bien_ban_ten_goc: string | null;
  nguoi_nhan_id: string | null;
  nguoi_nhan_ten: string | null;
  ky_nguoi_giao_id: string | null;
  ky_nguoi_giao_ten: string | null;
  ky_nguoi_giao_luc: string | null;
  ky_nguoi_nhan_id: string | null;
  ky_nguoi_nhan_ten: string | null;
  ky_nguoi_nhan_luc: string | null;
  muc: MucBanGiao[];
}

interface QuyTrinhThoiViec {
  id: string;
  don_tu_id: string;
  nhan_vien_id: string;
  loai_hop_dong: string;
  chuc_danh: string | null;
  ngay_lam_viec_cuoi: string | null;
  lastday_da_chot: boolean;
  khong_can_bao_truoc: boolean;
  la_quan_ly_dn: boolean;
  trang_thai: string;
  ly_do_nghi: string | null;
  admin_duyet1_ten: string | null;
  admin_duyet1_luc: string | null;
  admin_duyet2_ten: string | null;
  admin_duyet2_luc: string | null;
  tao_luc: string;
  ma_nv: string;
  ho_ten: string;
  phong_ban: string | null;
  muc: MucThoiViec[];
  ban_giao: BanGiao[];
}

const TEN_LOAI_HD: Record<string, string> = {
  thu_viec: 'Thử việc', hoc_viec: 'Học việc', thoi_vu: 'Thời vụ',
  xac_dinh: 'Xác định thời hạn', khong_xac_dinh: 'Không xác định thời hạn',
  cong_tac_vien: 'Cộng tác viên',
  quan_ly_dn: 'Quản lý doanh nghiệp (Điều 7 NĐ145/2020)',
};

const NHAN_MUC: Record<string, { nhan: string; mau: 'tot' | 'canh_bao' | 'xau' | 'mo' }> = {
  chua: { nhan: 'Chưa làm', mau: 'mo' },
  dang: { nhan: 'Đang làm', mau: 'canh_bao' },
  xong: { nhan: 'Đã xong', mau: 'tot' },
  bo_qua: { nhan: 'Bỏ qua', mau: 'mo' },
};

const NHAN_QT: Record<string, { nhan: string; mau: 'tot' | 'canh_bao' | 'xau' | 'lanh' | 'mo' }> = {
  dang_thuc_hien: { nhan: 'Đang thực hiện', mau: 'lanh' },
  san_sang_chot: { nhan: 'Sẵn sàng chốt', mau: 'canh_bao' },
  da_khoa: { nhan: 'Đã khóa', mau: 'tot' },
  da_huy: { nhan: 'Đã hủy', mau: 'xau' },
};

function nhan_muc(m: MucThoiViec): ReactNode {
  const k = NHAN_MUC[m.trang_thai] ?? NHAN_MUC['chua']!;
  return <NhanTV mau={k.mau}>{k.nhan}</NhanTV>;
}

/** Nhan trang thai dung lop .nhan co san trong kieu.css. */
function NhanTV({ mau, children }: { mau: string; children: ReactNode }): ReactNode {
  return <span className={`nhan nhan-${mau}`}>{children}</span>;
}

function KetQuaMuc({ ket_qua }: { ket_qua: unknown }): ReactNode {
  if (ket_qua === null || ket_qua === undefined) return null;
  const o = ket_qua as Record<string, unknown>;
  const dong = Object.entries(o)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${k}: ${typeof v === 'number' ? v.toLocaleString('vi-VN') : String(v)}`)
    .join(' · ');
  if (dong === '') return null;
  return <div className="mo-ta tv-ket-qua">{dong}</div>;
}

// ================================================================ mat ADMIN

export function TrangThoiViec(): ReactNode {
  const [trang_thai, dat_trang_thai] = useState('dang_thuc_hien');
  const [mo_id, dat_mo_id] = useState<string | null>(null);
  const [tab, dat_tab] = useState<'danh_sach' | 'cau_hinh'>('danh_sach');
  const ds = dung_nap<{ danh_sach: QuyTrinhThoiViec[] }>(
    `/api/thoi-viec/quy-trinh?trang_thai=${trang_thai}`, [trang_thai]);
  const { ds_xem, bo_phan_trang } = dung_phan_trang(ds.du_lieu?.danh_sach ?? [], 20);

  if (ds.dang_tai) return <div className="dang-tai">Đang tải…</div>;
  if (ds.loi !== null) return <Trong tieu_de="Không tải được quy trình" />;

  return (
    <div>
      <div className="hang-tab" role="tablist">
        <button className={tab === 'danh_sach' ? 'dang-chon' : undefined}
          onClick={() => dat_tab('danh_sach')}>Quy trình</button>
        <button className={tab === 'cau_hinh' ? 'dang-chon' : undefined}
          onClick={() => dat_tab('cau_hinh')}>Cấu hình</button>
      </div>

      {tab === 'cau_hinh'
        ? <CauHinhThoiViec />
        : mo_id === null
          ? <DanhSachQuyTrinh
              ds={ds_xem}
              trang_thai={trang_thai}
              dat_trang_thai={dat_trang_thai}
              dat_mo_id={dat_mo_id}
              nap_lai={ds.nap_lai}
              bo_phan_trang={bo_phan_trang} />
          : <ChiTietQuyTrinh id={mo_id}
              khi_dong={() => { dat_mo_id(null); ds.nap_lai(); }} />}
    </div>
  );
}

const CAC_TAB_QT = [
  { ma: 'dang_thuc_hien', ten: 'Đang thực hiện' },
  { ma: 'san_sang_chot', ten: 'Sẵn sàng chốt' },
  { ma: 'da_khoa', ten: 'Đã khóa' },
  { ma: 'da_huy', ten: 'Đã hủy' },
] as const;

function DanhSachQuyTrinh(
  { ds, trang_thai, dat_trang_thai, dat_mo_id, nap_lai, bo_phan_trang }: {
    ds: QuyTrinhThoiViec[];
    trang_thai: string;
    dat_trang_thai: (t: string) => void;
    dat_mo_id: (id: string) => void;
    nap_lai: () => void;
    bo_phan_trang: ReactNode;
  },
): ReactNode {
  const hd = dung_hanh_dong();
  return (
    <div>
      <div className="hang-tab" role="tablist">
        {CAC_TAB_QT.map((t) => (
          <button key={t.ma} className={trang_thai === t.ma ? 'dang-chon' : undefined}
            onClick={() => dat_trang_thai(t.ma)}>{t.ten}</button>
        ))}
      </div>
      {ds.length === 0
        ? <Trong tieu_de="Không có quy trình nào ở trạng thái này" />
        : (
          <div className="vo-bang">
            <table>
              <thead>
                <tr>
                  <th>Nhân viên</th><th>Loại HĐ</th><th>Lastday</th><th>Trạng thái</th>
                  <th>Khởi tạo</th><th></th>
                </tr>
              </thead>
              <tbody>
                {ds.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <b>{d.ho_ten}</b> <span className="mo-ta">{d.ma_nv}</span>
                      <div className="mo-ta">{d.phong_ban ?? '—'}</div>
                    </td>
                    <td>{TEN_LOAI_HD[d.loai_hop_dong] ?? d.loai_hop_dong}</td>
                    <td>{d.ngay_lam_viec_cuoi === null ? '—' : ngay_viet(d.ngay_lam_viec_cuoi)}</td>
                    <td>{nhan_qt(d)}</td>
                    <td>{ngay_gio(d.tao_luc)}</td>
                    <td>
                      <button type="button" className="nut-nho nut-phang"
                        onClick={() => dat_mo_id(d.id)}>Mở</button>
                      {d.trang_thai !== 'da_khoa' && d.trang_thai !== 'da_huy' && (
                        <button type="button" className="nut-nho nut-nguy"
                          onClick={() => {
                            void (async () => {
                              if (!await hd.chay(() =>
                                goi(`/api/thoi-viec/quy-trinh/${d.id}/huy`,
                                  { method: 'POST' }))) return;
                              nap_lai();
                            })();
                          }}>Hủy</button>
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
  );
}

function nhan_qt(d: QuyTrinhThoiViec): ReactNode {
  const k = NHAN_QT[d.trang_thai] ?? NHAN_QT['dang_thuc_hien']!;
  return <NhanTV mau={k.mau}>{k.nhan}</NhanTV>;
}

function ChiTietQuyTrinh({ id, khi_dong }: { id: string; khi_dong: () => void }): ReactNode {
  const ct = dung_nap<QuyTrinhThoiViec>(`/api/thoi-viec/quy-trinh/${id}`, [id]);
  const hd = dung_hanh_dong();
  const xac_nhan = dung_xac_nhan();
  const [ngay_chot, dat_ngay_chot] = useState('');
  const [khong_bao_truoc, dat_khong_bao_truoc] = useState(false);
  const [tep_mo, dat_tep_mo] = useState<{ tep_id: string; ten_goc: string } | null>(null);

  if (ct.dang_tai) return <div className="dang-tai">Đang tải…</div>;
  if (ct.loi !== null || ct.du_lieu === null) return <Trong tieu_de="Không tìm thấy quy trình" />;
  const d = ct.du_lieu;

  const bo_qua = async (muc_id: string, bo: boolean): Promise<void> => {
    if (bo && !await xac_nhan.hoi({
      tieu_de: 'Bỏ qua mục này?', mo_ta: 'Mục bỏ qua không còn chặn Cổng 2.', nguy_hiem: true,
    })) return;
    if (await hd.chay(() => goi(`/api/thoi-viec/muc/${muc_id}/bo-qua`,
      { method: 'POST', body: { bo, ghi_chu: bo ? 'Admin bỏ qua' : null } }))) ct.nap_lai();
  };

  const chot = async (): Promise<void> => {
    const loi: string[] = [];
    if (d.lastday_da_chot) loi.push('Lastday đã chốt rồi.');
    if (ngay_chot === '' && d.ngay_lam_viec_cuoi === null) loi.push('Cần nhập ngày làm việc cuối.');
    if (loi.length > 0) {
      await xac_nhan.hoi({ tieu_de: 'Chưa đủ điều kiện', mo_ta: loi.join(' ') });
      return;
    }
    if (await hd.chay(() => goi(`/api/thoi-viec/quy-trinh/${id}/chot-lastday`, {
      method: 'POST',
      body: {
        ngay_lam_viec_cuoi: ngay_chot === '' ? d.ngay_lam_viec_cuoi : ngay_chot,
        khong_can_bao_truoc: khong_bao_truoc,
      },
    }))) ct.nap_lai();
  };

  const chay_dung = async (): Promise<void> => {
    const dong_y = await xac_nhan.hoi({
      tieu_de: 'Chạy dừng hoạt động?',
      mo_ta: 'Hệ thống sẽ khóa tài khoản, thu hồi phiên, báo cổng phân quyền + ERP1 + '
        + 'Microsoft 365, và sinh + gửi hồ sơ BHXH/thuế. Việc này KHÔNG đảo ngược được.',
      nguy_hiem: true,
    });
    if (!dong_y) return;
    const kq = await hd.chay_lay<{ ok: boolean; da_chay: boolean }>(
      () => goi(`/api/thoi-viec/quy-trinh/${id}/chay-dung`, { method: 'POST' }));
    if (kq !== null) ct.nap_lai();
  };

  const ng_cho = dung_nap<{ id: string; ten: string }[]>(
    d.trang_thai === 'da_khoa' || d.trang_thai === 'da_huy'
      ? null : `/api/thoi-viec/quy-trinh/${id}/nguoi-nhan`, [id]);
  const [nguoi_nhan, dat_nguoi_nhan] = useState('');
  const gan_nhan = async (): Promise<void> => {
    if (nguoi_nhan === '') return;
    if (await hd.chay(() => goi(`/api/thoi-viec/ban-giao/${d.ban_giao[0]?.id}/nguoi-nhan`, {
      method: 'POST', body: { nguoi_dung_id: nguoi_nhan },
    }))) ct.nap_lai();
  };

  return (
    <div>
      <div className="dau-trang">
        <div>
          <h2 className="tv-tua">{d.ho_ten} <span className="mo-ta">{d.ma_nv}</span></h2>
          <div className="mo-ta">
            {d.phong_ban ?? '—'} · {TEN_LOAI_HD[d.loai_hop_dong] ?? d.loai_hop_dong}
            {d.la_quan_ly_dn ? ' · quản lý DN' : ''} · Đơn thôi việc duyệt lúc {ngay_gio(d.tao_luc)}
          </div>
        </div>
        <div className="hang-nut">
          <button type="button" className="nut-phang" onClick={khi_dong}>Đóng</button>
        </div>
      </div>

      <div className="the tv-trang-thai">
        <div className="mo-ta">Trạng thái quy trình</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
          {nhan_qt(d)}
          {d.trang_thai === 'dang_thuc_hien' && (
            <span className="mo-ta">Đang chờ hoàn tất các mục bắt buộc</span>
          )}
        </div>
      </div>

      <h3 className="tv-tua-phu">Checklist ({d.muc.length} mục)</h3>
      <div className="vo-bang">
        <table>
          <thead>
            <tr>
              <th>Mục</th><th>Kiểu</th><th>Trạng thái</th><th>Xác nhận</th><th></th>
            </tr>
          </thead>
          <tbody>
            {d.muc.map((m) => (
              <tr key={m.id}>
                <td>
                  <div>{m.tieu_de}{!m.bat_buoc && <span className="mo-ta"> (khi phát sinh)</span>}</div>
                  {m.ghi_chu !== null && <div className="mo-ta">{m.ghi_chu}</div>}
                  <KetQuaMuc ket_qua={m.ket_qua} />
                </td>
                <td>
                  <span className="mo-ta">
                    {m.loai_tu_dong === 'nhan_vien' ? 'Nhân viên'
                      : m.loai_tu_dong === 'tu_dong' ? 'Tự động' : 'Script Cổng 2'}
                  </span>
                </td>
                <td>{nhan_muc(m)}</td>
                <td>
                  {m.xac_nhan_luc !== null && (
                    <span className="mo-ta">
                      {m.xac_nhan_boi ?? 'hệ thống'} · {ngay_gio(m.xac_nhan_luc)}
                    </span>
                  )}
                </td>
                <td>
                  {m.bang_chung_tep_id !== null && (
                    <button type="button" className="nut-nho nut-phang"
                      onClick={() => dat_tep_mo({
                        tep_id: m.bang_chung_tep_id!,
                        ten_goc: m.bang_chung_ten_goc ?? 'bằng chứng',
                      })}>Bằng chứng</button>
                  )}
                  {(m.trang_thai === 'chua' || m.trang_thai === 'dang') && (
                    <button type="button" className="nut-nho nut-phang"
                      onClick={() => void bo_qua(m.id, true)}>Bỏ qua</button>
                  )}
                  {m.trang_thai === 'bo_qua' && (
                    <button type="button" className="nut-nho nut-phang"
                      onClick={() => void bo_qua(m.id, false)}>Bỏ bỏ qua</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {d.ban_giao.length > 0 && (
        <>
          <h3 className="tv-tua-phu">Bàn giao</h3>
          <div className="the">
            <div className="hang-nut" style={{ marginBottom: 8 }}>
              <span className="mo-ta">Người nhận bàn giao:</span>
              {ng_cho.du_lieu !== null && ng_cho.du_lieu.length > 0 && (
                <>
                  <Chon
                    gia_tri={d.ban_giao[0]!.nguoi_nhan_id ?? nguoi_nhan}
                    dat_gia_tri={dat_nguoi_nhan}
                    cac_tuy_chon={ng_cho.du_lieu.map((n) => ({ ma: n.id, nhan: n.ten }))}
                    rong="— chưa chỉ định —" />
                  <button type="button" className="nut-nho nut-chinh"
                    onClick={() => void gan_nhan()}>Gán</button>
                </>
              )}
            </div>
            <div className="tv-ky-hang">
              <span className="mo-ta">
                Người giao: <b>{d.ban_giao[0]!.ky_nguoi_giao_ten ?? 'chưa ký'}</b>
                {d.ban_giao[0]!.ky_nguoi_giao_luc !== null
                  && ` · ${ngay_gio(d.ban_giao[0]!.ky_nguoi_giao_luc)}`}
              </span>
              <span className="mo-ta">
                Người nhận: <b>{d.ban_giao[0]!.ky_nguoi_nhan_ten ?? 'chưa ký'}</b>
                {d.ban_giao[0]!.ky_nguoi_nhan_luc !== null
                  && ` · ${ngay_gio(d.ban_giao[0]!.ky_nguoi_nhan_luc)}`}
              </span>
            </div>
            <ul className="tv-danh-sach">
              {d.ban_giao[0]!.muc.map((m) => (
                <li key={m.id}>
                  <span>{m.mo_ta}</span>
                  <NhanTV mau={m.trang_thai === 'da_ban_giao' ? 'tot' : 'mo'}>
                    {m.trang_thai === 'da_ban_giao' ? 'Đã bàn giao' : 'Chưa'}
                  </NhanTV>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      <h3 className="tv-tua-phu">Cổng 2 — duyệt cuối</h3>
      <div className="the">
        {d.trang_thai === 'da_khoa' && (
          <div className="hop-tot">
            Quy trình đã khóa bởi {d.admin_duyet2_ten ?? 'hệ thống'} lúc {ngay_gio(d.admin_duyet2_luc)}.
          </div>
        )}
        {d.trang_thai === 'da_huy' && <div className="hop-loi">Quy trình đã hủy.</div>}
        {d.trang_thai !== 'da_khoa' && d.trang_thai !== 'da_huy' && (
          <div>
            <div className="tv-hang">
              <label className="mo-ta">Ngày làm việc cuối</label>
              <input type="date" className="o-nhap" value={ngay_chot}
                onChange={(e) => dat_ngay_chot(e.target.value)}
                min={hom_nay()} />
              <span className="mo-ta">
                hiện tại: {d.ngay_lam_viec_cuoi === null ? 'chưa có' : ngay_viet(d.ngay_lam_viec_cuoi)}
                {d.lastday_da_chot ? ' — đã chốt' : ''}
              </span>
            </div>
            <label className="tv-chon-hang">
              <input type="checkbox" checked={khong_bao_truoc}
                onChange={(e) => dat_khong_bao_truoc(e.target.checked)} />
              Không cần báo trước (Điều 35 khoản 2 BLLĐ — thỏa thuận)
            </label>
            <div className="hang-nut" style={{ marginTop: 8 }}>
              <button type="button" className="nut-chinh" onClick={() => void chot()}
                disabled={hd.dang_chay}>Chốt lastday</button>
              <button type="button" className="nut-nguy" onClick={() => void chay_dung()}
                disabled={hd.dang_chay || !d.lastday_da_chot}>
                Chạy dừng hoạt động
              </button>
              {!d.lastday_da_chot && (
                <span className="mo-ta">Chốt lastday trước khi chạy dừng hoạt động.</span>
              )}
            </div>
            {hd.loi !== null && <div className="hop-loi" style={{ marginTop: 8 }}>{String(hd.loi)}</div>}
          </div>
        )}
      </div>

      {tep_mo !== null && (
        <HopThoaiXemTep tep_id={tep_mo.tep_id} ten_goc={tep_mo.ten_goc}
          khi_dong={() => dat_tep_mo(null)} />
      )}
      {xac_nhan.hop_thoai}
    </div>
  );
}

// ---------------------------------------------------------------- cau hinh (Admin)

function CauHinhThoiViec(): ReactNode {
  const nap = dung_nap<{
    cau_hinh: { email_dich_vu_bhxh: string; email_dich_vu_bhxh_cc: string; email_chung_tu_thue: string };
    han_bao_truoc: Record<string, number | null>;
  }>('/api/thoi-viec/cau-hinh');
  const hd = dung_hanh_dong();
  const [email_bhxh, dat_email_bhxh] = useState('');
  const [email_cc, dat_email_cc] = useState('');
  const [email_thue, dat_email_thue] = useState('');
  const [han, dat_han] = useState<Record<string, string>>({});

  if (nap.dang_tai) return <div className="dang-tai">Đang tải…</div>;
  if (nap.loi !== null || nap.du_lieu === null) return <Trong tieu_de="Không tải được cấu hình" />;
  const { cau_hinh, han_bao_truoc } = nap.du_lieu;

  const luu_khoa = async (khoa: string, gia_tri: string): Promise<void> => {
    if (await hd.chay(() => goi('/api/thoi-viec/cau-hinh', {
      method: 'POST', body: { khoa, gia_tri },
    }), 'Đã lưu')) nap.nap_lai();
  };

  return (
    <div className="the">
      <h3 className="tv-tua-phu">Email dịch vụ</h3>
      <div className="tv-hang">
        <label className="o-nhap-ngang">
          <span>Email đơn vị dịch vụ BHXH</span>
          <input type="email" className="o-nhap"
            defaultValue={cau_hinh.email_dich_vu_bhxh}
            onChange={(e) => dat_email_bhxh(e.target.value)} />
        </label>
        <button type="button" className="nut-phang"
          onClick={() => void luu_khoa('email_dich_vu_bhxh', email_bhxh)}>Lưu</button>
      </div>
      <div className="tv-hang">
        <label className="o-nhap-ngang">
          <span>CC nội bộ (HR)</span>
          <input type="email" className="o-nhap"
            defaultValue={cau_hinh.email_dich_vu_bhxh_cc}
            onChange={(e) => dat_email_cc(e.target.value)} />
        </label>
        <button type="button" className="nut-phang"
          onClick={() => void luu_khoa('email_dich_vu_bhxh_cc', email_cc)}>Lưu</button>
      </div>
      <div className="tv-hang">
        <label className="o-nhap-ngang">
          <span>Email nhận chứng từ thuế TNCN</span>
          <input type="email" className="o-nhap"
            defaultValue={cau_hinh.email_chung_tu_thue}
            placeholder="Để trống = dùng chung email BHXH"
            onChange={(e) => dat_email_thue(e.target.value)} />
        </label>
        <button type="button" className="nut-phang"
          onClick={() => void luu_khoa('email_chung_tu_thue', email_thue)}>Lưu</button>
      </div>
      {cau_hinh.email_dich_vu_bhxh === '' && (
        <div className="hop-luu-y">
          Chưa khai email dịch vụ BHXH — Cổng 2 sẽ chặn không cho chạy dừng hoạt động (REQ-CH-02).
        </div>
      )}

      <h3 className="tv-tua-phu">Hạn báo trước theo loại hợp đồng (ngày)</h3>
      <div className="vo-bang">
        <table>
          <thead>
            <tr><th>Loại hợp đồng</th><th>Hiện tại</th><th>Giá trị mới</th><th></th></tr>
          </thead>
          <tbody>
            {Object.entries(han_bao_truoc).map(([loai, ngay]) => (
              <tr key={loai}>
                <td>{TEN_LOAI_HD[loai] ?? loai}</td>
                <td>{ngay === null ? 'theo hợp đồng' : String(ngay)}</td>
                <td>
                  <input type="text" className="o-nhap"
                    defaultValue={ngay === null ? '' : String(ngay)}
                    placeholder="trống = theo hợp đồng"
                    onChange={(e) => dat_han({ ...han, [loai]: e.target.value })} />
                </td>
                <td>
                  <button type="button" className="nut-nho nut-phang"
                    onClick={() => void luu_khoa(`han_bao_truoc_${loai}`, han[loai] ?? '')}>
                    Lưu
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ================================================================ mat NHAN VIEN

export function TrangHuongDanThoiViec(): ReactNode {
  const nap = dung_nap<QuyTrinhThoiViec | null>('/api/toi/thoi-viec');
  const hd = dung_hanh_dong();
  const xac_nhan = dung_xac_nhan();
  const { di_toi } = dung_tuyen();
  const [lastday, dat_lastday] = useState('');
  const [tep_mo, dat_tep_mo] = useState<{ tep_id: string; ten_goc: string } | null>(null);

  if (nap.dang_tai) return <div className="dang-tai">Đang tải…</div>;
  if (nap.loi !== null) return <Trong tieu_de="Không tải được hồ sơ thôi việc" />;
  const d = nap.du_lieu;
  if (d === null) {
    return (
      <Trong
        tieu_de="Bạn chưa có quy trình thôi việc"
        mo_ta="Quy trình được khởi tạo khi Admin duyệt đơn xin thôi việc của bạn."
        hanh_dong={la_nhan_su() ? (
          <button type="button" className="nut-chinh" onClick={() => di_toi('/thoi-viec')}>
            Mở trang quản trị
          </button>
        ) : undefined}
      />
    );
  }

  const muc_con = d.muc.filter((m) => m.trang_thai === 'chua' || m.trang_thai === 'dang');
  const xong = d.muc.length - muc_con.length;

  const tick = async (m: MucThoiViec): Promise<void> => {
    const xong_moi = m.trang_thai !== 'xong';
    if (xong_moi && !await xac_nhan.hoi({
      tieu_de: `Xác nhận "${m.tieu_de}"?`,
      mo_ta: 'Bạn chịu trách nhiệm về tính đúng đắn của xác nhận này.',
    })) return;
    if (await hd.chay(() => goi(`/api/toi/thoi-viec/muc/${m.id}/tick`, {
      method: 'POST', body: { trang_thai: xong_moi ? 'xong' : 'chua' },
    }))) nap.nap_lai();
  };

  const ky = async (m: MucThoiViec): Promise<void> => {
    if (!await xac_nhan.hoi({
      tieu_de: `Ký điện tử mục "${m.tieu_de}"?`,
      mo_ta: 'Chữ ký trong hệ thống ghi danh tính tài khoản của bạn cùng thời điểm ký.',
    })) return;
    if (await hd.chay(() => goi(`/api/toi/thoi-viec/muc/${m.id}/ky`, { method: 'POST' }))) {
      nap.nap_lai();
    }
  };

  const len_tep = async (m: MucThoiViec, tep: File): Promise<void> => {
    const fd = new FormData();
    fd.append('tep', tep);
    if (await hd.chay(() => gui_tep(`/api/toi/thoi-viec/muc/${m.id}/bang-chung`, fd))) {
      nap.nap_lai();
    }
  };

  const de_nghi_lastday = async (): Promise<void> => {
    if (lastday === '') return;
    const kq = await hd.chay_lay<{ ok: boolean; canh_bao: string[] }>(
      () => goi('/api/toi/thoi-viec/lastday', {
        method: 'POST', body: { ngay_lam_viec_cuoi: lastday },
      }));
    if (kq !== null && kq.canh_bao.length > 0) {
      await xac_nhan.hoi({ tieu_de: 'Lưu ý', mo_ta: kq.canh_bao.join(' ') });
    }
    nap.nap_lai();
  };

  const xac_nhan_bg = async (m: MucBanGiao, xong: boolean): Promise<void> => {
    if (await hd.chay(() => goi(
      `/api/toi/thoi-viec/ban-giao/${m.ban_giao_id}/muc/${m.id}/xac-nhan`,
      { method: 'POST', body: { trang_thai: xong ? 'da_ban_giao' : 'chua' } }))) {
      nap.nap_lai();
    }
  };

  const ky_bien_ban = async (ben: 'nguoi_giao' | 'nguoi_nhan'): Promise<void> => {
    if (d.ban_giao.length === 0) return;
    if (!await xac_nhan.hoi({
      tieu_de: 'Ký biên bản bàn giao?', mo_ta: 'Chữ ký ghi danh tính tài khoản của bạn.',
    })) return;
    if (await hd.chay(() => goi(`/api/toi/thoi-viec/ban-giao/${d.ban_giao[0]!.id}/ky`, {
      method: 'POST', body: { ben },
    }))) nap.nap_lai();
  };

  return (
    <div>
      <div className="dau-trang">
        <div>
          <h2 className="tv-tua">Hướng dẫn thủ tục thôi việc</h2>
          <div className="mo-ta">
            Còn {muc_con.length} mục chưa xong · đã xong {xong}/{d.muc.length}
          </div>
        </div>
      </div>

      <div className="the">
        <div className="tv-hang">
          <label className="o-nhap-ngang">
            <span>Ngày làm việc cuối</span>
            <input type="date" className="o-nhap"
              value={lastday !== '' ? lastday : (d.ngay_lam_viec_cuoi ?? '')}
              min={hom_nay()}
              disabled={d.lastday_da_chot}
              onChange={(e) => dat_lastday(e.target.value)} />
          </label>
          <button type="button" className="nut-phang" disabled={d.lastday_da_chot || lastday === ''}
            onClick={() => void de_nghi_lastday()}>Đề nghị ngày</button>
          {d.lastday_da_chot && <span className="mo-ta">Admin đã chốt ngày — không đổi được.</span>}
        </div>
      </div>

      <h3 className="tv-tua-phu">Việc của bạn</h3>
      {d.muc.filter((m) => m.loai_tu_dong === 'nhan_vien').map((m) => (
        <div key={m.id} className="the tv-muc">
          <div className="tv-muc-dau">
            <div style={{ flex: 1 }}>
              <b>{m.tieu_de}</b>
              {!m.bat_buoc && <span className="mo-ta"> (khi phát sinh)</span>}
              {m.ghi_chu !== null && <div className="mo-ta">{m.ghi_chu}</div>}
            </div>
            {nhan_muc(m)}
          </div>
          {m.bang_chung_tep_id !== null && (
            <div className="tv-hang">
              <span className="mo-ta">Bằng chứng: {m.bang_chung_ten_goc}</span>
              <button type="button" className="nut-nho nut-phang"
                onClick={() => dat_tep_mo({
                  tep_id: m.bang_chung_tep_id!,
                  ten_goc: m.bang_chung_ten_goc ?? 'bằng chứng',
                })}>Xem</button>
            </div>
          )}
          <div className="hang-nut" style={{ marginTop: 8 }}>
            {m.trang_thai === 'xong'
              ? <button type="button" className="nut-phang" onClick={() => void tick(m)}>
                  Bỏ xác nhận
                </button>
              : <button type="button" className="nut-chinh" onClick={() => void tick(m)}>
                  Xác nhận đã xong
                </button>}
            <label className="nut-phang tv-nut-tep">
              <i className="bt bt-download" aria-hidden="true" /> Đính kèm bằng chứng
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx"
                onChange={(e) => {
                  const tep = e.target.files?.[0];
                  if (tep !== undefined) void len_tep(m, tep);
                }} />
            </label>
            {m.ma_muc === 'ky_cam_ket_bao_mat' && (
              <button type="button" className="nut-lanh" onClick={() => void ky(m)}>
                Ký cam kết bảo mật
              </button>
            )}
          </div>
        </div>
      ))}

      <h3 className="tv-tua-phu">Hệ thống tự làm</h3>
      {d.muc.filter((m) => m.loai_tu_dong !== 'nhan_vien').map((m) => (
        <div key={m.id} className="the tv-muc">
          <div className="tv-muc-dau">
            <div style={{ flex: 1 }}>
              <b>{m.tieu_de}</b>
              <span className="mo-ta"> · {m.loai_tu_dong === 'tu_dong' ? 'tự động' : 'Cổng 2'}</span>
              {m.ghi_chu !== null && <div className="mo-ta">{m.ghi_chu}</div>}
            </div>
            {nhan_muc(m)}
          </div>
          <KetQuaMuc ket_qua={m.ket_qua} />
        </div>
      ))}

      {d.ban_giao.length > 0 && (
        <>
          <h3 className="tv-tua-phu">Bàn giao</h3>
          <div className="the">
            {d.ban_giao[0]!.muc.map((m) => (
              <div key={m.id} className="tv-muc">
                <div className="tv-muc-dau">
                  <div style={{ flex: 1 }}>{m.mo_ta}</div>
                  <NhanTV mau={m.trang_thai === 'da_ban_giao' ? 'tot' : 'mo'}>
                    {m.trang_thai === 'da_ban_giao' ? 'Đã bàn giao' : 'Chưa'}
                  </NhanTV>
                </div>
                <div className="hang-nut" style={{ marginTop: 4 }}>
                  {m.trang_thai === 'da_ban_giao'
                    ? <button type="button" className="nut-nho nut-phang"
                        onClick={() => void xac_nhan_bg(m, false)}>Bỏ xác nhận</button>
                    : <button type="button" className="nut-nho nut-chinh"
                        onClick={() => void xac_nhan_bg(m, true)}>Xác nhận đã bàn giao</button>}
                </div>
              </div>
            ))}
            <div className="tv-ky-hang">
              <button type="button" className="nut-lanh"
                disabled={d.ban_giao[0]!.ky_nguoi_giao_id !== null}
                onClick={() => void ky_bien_ban('nguoi_giao')}>
                {d.ban_giao[0]!.ky_nguoi_giao_id === null ? 'Ký bên giao (tôi)' : 'Đã ký bên giao'}
              </button>
              <button type="button" className="nut-lanh"
                disabled={d.ban_giao[0]!.ky_nguoi_nhan_id !== null
                  || d.ban_giao[0]!.nguoi_nhan_id === null}
                onClick={() => void ky_bien_ban('nguoi_nhan')}>
                {d.ban_giao[0]!.ky_nguoi_nhan_id !== null ? 'Đã ký bên nhận'
                  : d.ban_giao[0]!.nguoi_nhan_id === null ? 'Chờ Admin chỉ định người nhận'
                  : 'Ký bên nhận (tôi được chỉ định)'}
              </button>
            </div>
            {d.ban_giao[0]!.bien_ban_tep_id !== null && (
              <button type="button" className="nut-nho nut-phang"
                onClick={() => void tai_tep(`/api/ho-so/tep/${d.ban_giao[0]!.bien_ban_tep_id}`,
                  d.ban_giao[0]!.bien_ban_ten_goc ?? 'bien-ban-ban-giao.docx')}>
                Tải biên bản bàn giao
              </button>
            )}
          </div>
        </>
      )}

      {tep_mo !== null && (
        <HopThoaiXemTep tep_id={tep_mo.tep_id} ten_goc={tep_mo.ten_goc}
          khi_dong={() => dat_tep_mo(null)} />
      )}
      {xac_nhan.hop_thoai}
    </div>
  );
}
