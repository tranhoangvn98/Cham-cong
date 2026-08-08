// Ho so mot nhan su: hop dong, bien ban, luong, cong viec, bao cao, khieu nai, thiet bi.
//
// May chu la nguon su that ve quyen: no tra ve `nhom_xem_duoc` / `nhom_sua_duoc`, o day chi
// ve theo. Trang nay KHONG tu suy ra quyen tu vai tro — neu suy o hai noi thi som muon hai
// noi lech nhau, va cai lech nguy hiem la ben giao dien "de" hon ben may chu.
import { useState, type ReactNode } from 'react';
import { goi, gui_tep, tai_tep } from '../api.ts';
import {
  DangTai, HopLoi, HopThoai, HopTot, Trong,
  dung_hanh_dong, dung_nap, ngay_viet, ngay_gio,
} from '../thanh_phan.tsx';
import { LienKet, dung_tuyen } from '../dinh_tuyen.tsx';

// ==================================================================== kieu du lieu

type Nhom = 'hop_dong' | 'bien_ban' | 'luong' | 'cong_viec' | 'bao_cao' | 'khieu_nai' | 'thiet_bi';

interface TongQuan {
  nhan_vien: Record<string, unknown> & { id: string; ma_nv: string; ho_ten: string };
  nhom_xem_duoc: Nhom[];
  nhom_sua_duoc: Nhom[];
  dem: Partial<Record<Nhom, number>>;
  hop_dong_hien_tai: Record<string, unknown> | null;
  luong_hien_tai: Record<string, unknown> | null;
}

interface TepDinhKem {
  id: string;
  thuoc_id: string | null;
  ten_goc: string;
  kieu_mime: string;
  kich_thuoc: number;
  tao_luc: string;
}

interface KetQuaNhom {
  danh_sach: Record<string, unknown>[];
  tep: TepDinhKem[];
  sua_duoc: boolean;
}

// ==================================================================== nhan hien thi

const TEN_NHOM: Record<Nhom, string> = {
  hop_dong: 'Hợp đồng lao động',
  bien_ban: 'Biên bản / thỏa thuận',
  luong: 'Lương',
  cong_viec: 'Công việc',
  bao_cao: 'Báo cáo',
  khieu_nai: 'Khiếu nại',
  thiet_bi: 'Thiết bị cấp phát',
};

const DUONG_NHOM: Record<Nhom, string> = {
  hop_dong: 'hop-dong',
  bien_ban: 'bien-ban',
  luong: 'luong',
  cong_viec: 'cong-viec',
  bao_cao: 'bao-cao',
  khieu_nai: 'khieu-nai',
  thiet_bi: 'thiet-bi-cap-phat',
};

const THU_TU: Nhom[] = ['hop_dong', 'bien_ban', 'luong', 'cong_viec', 'bao_cao', 'khieu_nai', 'thiet_bi'];

const TEN: Record<string, Record<string, string>> = {
  loai_hop_dong: {
    thu_viec: 'Thử việc', xac_dinh: 'Xác định thời hạn', khong_xac_dinh: 'Không xác định thời hạn',
    thoi_vu: 'Thời vụ', cong_tac_vien: 'Cộng tác viên', hoc_viec: 'Học việc',
  },
  tt_hop_dong: {
    nhap: 'Nháp', hieu_luc: 'Đang hiệu lực', het_han: 'Hết hạn',
    da_thanh_ly: 'Đã thanh lý', da_huy: 'Đã hủy',
  },
  loai_bien_ban: {
    phu_luc: 'Phụ lục HĐ', thoa_thuan: 'Thỏa thuận', cam_ket: 'Cam kết', ky_luat: 'Kỷ luật',
    khen_thuong: 'Khen thưởng', bien_ban_hop: 'Biên bản họp', ban_giao: 'Bàn giao', khac: 'Khác',
  },
  hinh_thuc_luong: {
    thang: 'Theo tháng', ngay: 'Theo ngày', gio: 'Theo giờ', san_pham: 'Theo sản phẩm', khoan: 'Khoán',
  },
  uu_tien: { thap: 'Thấp', thuong: 'Thường', cao: 'Cao', khan: 'Khẩn' },
  tt_cong_viec: {
    moi: 'Mới', dang_lam: 'Đang làm', cho_duyet: 'Chờ duyệt', hoan_thanh: 'Hoàn thành', huy: 'Hủy',
  },
  ky_bao_cao: {
    ngay: 'Ngày', tuan: 'Tuần', thang: 'Tháng', quy: 'Quý', nam: 'Năm', dot_xuat: 'Đột xuất',
  },
  tt_bao_cao: { nhap: 'Nháp', da_nop: 'Đã nộp', da_xem: 'Đã xem', can_bo_sung: 'Cần bổ sung' },
  loai_khieu_nai: {
    luong_thuong: 'Lương thưởng', cham_cong: 'Chấm công', che_do: 'Chế độ', moi_truong: 'Môi trường',
    quan_ly: 'Quản lý', quay_roi: 'Quấy rối', an_toan: 'An toàn', khac: 'Khác',
  },
  tt_khieu_nai: {
    moi: 'Mới', dang_xu_ly: 'Đang xử lý', da_giai_quyet: 'Đã giải quyết',
    tu_choi: 'Từ chối', dong: 'Đóng',
  },
  loai_thiet_bi: {
    laptop: 'Laptop', may_ban: 'Máy bàn', man_hinh: 'Màn hình', dien_thoai: 'Điện thoại',
    may_tinh_bang: 'Máy tính bảng', sim: 'SIM', the_tu: 'Thẻ từ', xe: 'Xe',
    dong_phuc: 'Đồng phục', cong_cu: 'Công cụ', khac: 'Khác',
  },
  tinh_trang_tb: {
    dang_dung: 'Đang dùng', da_thu_hoi: 'Đã thu hồi', bao_hong: 'Báo hỏng',
    mat: 'Mất', dang_sua: 'Đang sửa',
  },
};

const MAU_NHAN: Record<string, string> = {
  hieu_luc: 'nhan-tot', hoan_thanh: 'nhan-tot', da_giai_quyet: 'nhan-tot', dang_dung: 'nhan-tot',
  het_han: 'nhan-xau', da_huy: 'nhan-xau', mat: 'nhan-xau', khan: 'nhan-xau', tu_choi: 'nhan-xau',
  moi: 'nhan-canh-bao', dang_lam: 'nhan-lanh', dang_xu_ly: 'nhan-canh-bao', cao: 'nhan-canh-bao',
  can_bo_sung: 'nhan-canh-bao', bao_hong: 'nhan-canh-bao',
};

/** Dinh dang tien VND. Gia tri tu may chu la CHUOI (numeric) de khong mat do chinh xac. */
function tien(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return n.toLocaleString('vi-VN') + ' ₫';
}

function co(v: unknown): string {
  return v === null || v === undefined || v === '' ? '—' : String(v);
}

function Nhan({ ma, bang }: { ma: unknown; bang: string }): ReactNode {
  const s = String(ma ?? '');
  if (s === '') return <>—</>;
  return <span className={`nhan ${MAU_NHAN[s] ?? 'nhan-mo'}`}>{TEN[bang]?.[s] ?? s}</span>;
}

// ==================================================================== trang

export function TrangHoSo({ nhan_vien_id }: { nhan_vien_id: string }): ReactNode {
  const [nhom, dat_nhom] = useState<Nhom | null>(null);
  const tq = dung_nap<TongQuan>(`/api/nhan-vien/${nhan_vien_id}/ho-so`, [nhan_vien_id]);

  if (tq.dang_tai) return <DangTai />;
  if (tq.loi !== null) {
    return (
      <>
        <HopLoi loi={tq.loi} />
        <LienKet den="/nhan-vien" lop="nut">Về danh sách nhân viên</LienKet>
      </>
    );
  }

  const d = tq.du_lieu;
  if (d === null) return <Trong tieu_de="Không có dữ liệu" />;

  const xem_duoc = THU_TU.filter((n) => d.nhom_xem_duoc.includes(n));
  const dang_mo = nhom !== null && xem_duoc.includes(nhom) ? nhom : (xem_duoc[0] ?? null);
  const nv = d.nhan_vien;

  return (
    <>
      <div className="dau-trang">
        <div>
          <h1 style={{ marginBottom: 2 }}>{nv.ho_ten}</h1>
          <p className="mo-ta">
            {nv.ma_nv}
            {co(nv['phong_ban']) !== '—' && <> · {String(nv['phong_ban'])}</>}
            {co(nv['ca_lam']) !== '—' && <> · ca {String(nv['ca_lam'])}</>}
            {nv['dang_hoat_dong'] === false && <> · <span className="nhan nhan-xau">đã nghỉ việc</span></>}
          </p>
        </div>
        <LienKet den="/nhan-vien" lop="nut">← Danh sách nhân viên</LienKet>
      </div>

      <div className="luoi luoi-4" style={{ marginBottom: 16 }}>
        <ODoc nhan="PIN máy" gia_tri={co(nv['pin_may'])} />
        <ODoc nhan="Ngày vào" gia_tri={nv['ngay_vao'] === null ? '—' : ngay_viet(String(nv['ngay_vao']))} />
        <ODoc
          nhan="Hợp đồng hiện tại"
          gia_tri={d.hop_dong_hien_tai === null
            ? '—'
            : TEN['loai_hop_dong']?.[String(d.hop_dong_hien_tai['loai'])] ?? '—'}
          phu={d.hop_dong_hien_tai === null
            ? (d.nhom_xem_duoc.includes('hop_dong') ? 'chưa có hợp đồng hiệu lực' : 'không có quyền xem')
            : `đến ${d.hop_dong_hien_tai['hieu_luc_den'] === null
              ? 'vô thời hạn' : ngay_viet(String(d.hop_dong_hien_tai['hieu_luc_den']))}`}
        />
        <ODoc
          nhan="Lương hiện tại"
          gia_tri={d.luong_hien_tai === null ? '—' : tien(d.luong_hien_tai['luong_co_ban'])}
          phu={d.luong_hien_tai === null
            ? (d.nhom_xem_duoc.includes('luong') ? 'chưa có quyết định lương' : 'không có quyền xem')
            : `phụ cấp ${tien(d.luong_hien_tai['phu_cap'])}`}
        />
      </div>

      {xem_duoc.length < THU_TU.length && (
        <div className="goi-y" style={{ marginBottom: 10 }}>
          Một số mục không hiện vì vai trò của bạn không được xem. Lương, hợp đồng và khiếu nại
          chỉ nhân sự và chính nhân viên đó xem được.
        </div>
      )}

      <div className="thanh-tab">
        {xem_duoc.map((n) => (
          <button
            key={n}
            type="button"
            className={n === dang_mo ? 'tab tab-dang-mo' : 'tab'}
            onClick={() => dat_nhom(n)}
          >
            {TEN_NHOM[n]}
            {(d.dem[n] ?? 0) > 0 && <span className="tab-so">{d.dem[n]}</span>}
          </button>
        ))}
      </div>

      {dang_mo !== null && (
        <BangNhom
          key={dang_mo}
          nhom={dang_mo}
          nhan_vien_id={nhan_vien_id}
          khi_doi={() => tq.nap_lai()}
        />
      )}
    </>
  );
}

function ODoc({ nhan, gia_tri, phu }: { nhan: string; gia_tri: string; phu?: string }): ReactNode {
  return (
    <div className="o-so">
      <div className="o-so-nhan">{nhan}</div>
      <div className="o-so-gia-tri" style={{ fontSize: 20 }}>{gia_tri}</div>
      {phu !== undefined && <div className="o-so-phu">{phu}</div>}
    </div>
  );
}

// ==================================================================== bang tung nhom

function BangNhom(
  { nhom, nhan_vien_id, khi_doi }: { nhom: Nhom; nhan_vien_id: string; khi_doi: () => void },
): ReactNode {
  const duong = `/api/nhan-vien/${nhan_vien_id}/${DUONG_NHOM[nhom]}`;
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<KetQuaNhom>(duong, [nhom, nhan_vien_id]);
  const [dang_sua, dat_dang_sua] = useState<Record<string, unknown> | null>(null);
  const [dang_them, dat_dang_them] = useState(false);
  const [dang_gan_tep, dat_dang_gan_tep] = useState(false);
  const hd = dung_hanh_dong();

  const lam_moi = (): void => { nap_lai(); khi_doi(); };

  const xoa = async (id: string): Promise<void> => {
    if (!window.confirm('Xóa bản ghi này? Thao tác không hoàn tác được.')) return;
    const ok = await hd.chay(
      () => goi(`/api/${DUONG_NHOM[nhom]}/${id}`, { method: 'DELETE' }),
      'Đã xóa.',
    );
    if (ok) lam_moi();
  };

  if (dang_tai) return <DangTai />;

  const ds = du_lieu?.danh_sach ?? [];
  const sua_duoc = du_lieu?.sua_duoc ?? false;

  return (
    <>
      <HopLoi loi={loi} />
      <HopLoi loi={hd.loi} />
      <HopTot chu={hd.tot} />

      {sua_duoc && (
        <div className="hang-nut">
          <button type="button" className="nut-chinh" onClick={() => dat_dang_them(true)}>
            + Thêm {TEN_NHOM[nhom].toLowerCase()}
          </button>
          <button type="button" onClick={() => dat_dang_gan_tep(true)}>Đính kèm tệp</button>
        </div>
      )}

      <div className="the the-mong">
        {ds.length === 0 ? (
          <Trong
            tieu_de={`Chưa có ${TEN_NHOM[nhom].toLowerCase()}`}
            mo_ta={sua_duoc ? 'Bấm nút phía trên để thêm.' : 'Chưa có dữ liệu trong mục này.'}
          />
        ) : (
          <div className="vo-bang">
            <table>
              <thead><tr>{COT[nhom].map((c) => <th key={c.nhan}>{c.nhan}</th>)}{sua_duoc && <th></th>}</tr></thead>
              <tbody>
                {ds.map((r) => (
                  <tr key={String(r['id'])}>
                    {COT[nhom].map((c) => <td key={c.nhan}>{c.ve(r)}</td>)}
                    {sua_duoc && (
                      <td className="khong-ngat">
                        <button className="nut-nho" onClick={() => dat_dang_sua(r)}>Sửa</button>{' '}
                        <button className="nut-nho nut-nguy" onClick={() => void xoa(String(r['id']))}>
                          Xóa
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DanhSachTep tep={du_lieu?.tep ?? []} sua_duoc={sua_duoc} khi_doi={lam_moi} />

      {(dang_them || dang_sua !== null) && (
        <FormHoSo
          nhom={nhom}
          nhan_vien_id={nhan_vien_id}
          ban_ghi={dang_sua}
          khi_dong={() => { dat_dang_them(false); dat_dang_sua(null); }}
          khi_xong={() => { dat_dang_them(false); dat_dang_sua(null); lam_moi(); }}
        />
      )}

      {dang_gan_tep && (
        <FormTep
          nhom={nhom}
          nhan_vien_id={nhan_vien_id}
          khi_dong={() => dat_dang_gan_tep(false)}
          khi_xong={() => { dat_dang_gan_tep(false); lam_moi(); }}
        />
      )}
    </>
  );
}

// ==================================================================== cot cua tung bang

interface Cot {
  nhan: string;
  ve: (r: Record<string, unknown>) => ReactNode;
}

const COT: Record<Nhom, Cot[]> = {
  hop_dong: [
    { nhan: 'Số HĐ', ve: (r) => <span className="so">{co(r['so_hd'])}</span> },
    { nhan: 'Loại', ve: (r) => <Nhan ma={r['loai']} bang="loai_hop_dong" /> },
    { nhan: 'Chức danh', ve: (r) => co(r['chuc_danh']) },
    {
      nhan: 'Hiệu lực',
      ve: (r) => (
        <span className="khong-ngat">
          {ngay_viet(String(r['hieu_luc_tu']))} →{' '}
          {r['hieu_luc_den'] === null ? 'vô thời hạn' : ngay_viet(String(r['hieu_luc_den']))}
        </span>
      ),
    },
    { nhan: 'Lương HĐ', ve: (r) => <span className="canh-phai so">{tien(r['luong_co_ban'])}</span> },
    { nhan: 'Trạng thái', ve: (r) => <Nhan ma={r['trang_thai']} bang="tt_hop_dong" /> },
  ],
  bien_ban: [
    { nhan: 'Loại', ve: (r) => <Nhan ma={r['loai']} bang="loai_bien_ban" /> },
    { nhan: 'Tiêu đề', ve: (r) => <strong>{co(r['tieu_de'])}</strong> },
    { nhan: 'Ngày ký', ve: (r) => <span className="khong-ngat">{r['ngay_ky'] === null ? '—' : ngay_viet(String(r['ngay_ky']))}</span> },
    { nhan: 'Nội dung', ve: (r) => <div style={{ maxWidth: 380, whiteSpace: 'pre-wrap' }}>{co(r['noi_dung'])}</div> },
  ],
  luong: [
    { nhan: 'Hiệu lực từ', ve: (r) => <span className="khong-ngat so">{ngay_viet(String(r['hieu_luc_tu']))}</span> },
    { nhan: 'Lương cơ bản', ve: (r) => <span className="canh-phai so"><strong>{tien(r['luong_co_ban'])}</strong></span> },
    { nhan: 'Phụ cấp', ve: (r) => <span className="canh-phai so">{tien(r['phu_cap'])}</span> },
    { nhan: 'Hình thức', ve: (r) => TEN['hinh_thuc_luong']?.[String(r['hinh_thuc'])] ?? '—' },
    { nhan: 'Số QĐ', ve: (r) => co(r['so_quyet_dinh']) },
    { nhan: 'Lý do', ve: (r) => co(r['ly_do']) },
  ],
  cong_viec: [
    { nhan: 'Công việc', ve: (r) => (
      <>
        <strong>{co(r['tieu_de'])}</strong>
        {co(r['mo_ta']) !== '—' && <div className="o-so-phu" style={{ maxWidth: 340 }}>{String(r['mo_ta'])}</div>}
      </>
    ) },
    { nhan: 'Hạn', ve: (r) => <span className="khong-ngat">{r['han'] === null ? '—' : ngay_viet(String(r['han']))}</span> },
    { nhan: 'Ưu tiên', ve: (r) => <Nhan ma={r['uu_tien']} bang="uu_tien" /> },
    { nhan: 'Trạng thái', ve: (r) => <Nhan ma={r['trang_thai']} bang="tt_cong_viec" /> },
    { nhan: 'Kết quả', ve: (r) => <div style={{ maxWidth: 280, whiteSpace: 'pre-wrap' }}>{co(r['ket_qua'])}</div> },
  ],
  bao_cao: [
    { nhan: 'Kỳ', ve: (r) => (
      <>
        <Nhan ma={r['ky']} bang="ky_bao_cao" />
        {r['ky_tu'] !== null && (
          <div className="o-so-phu khong-ngat">
            {ngay_viet(String(r['ky_tu']))}
            {r['ky_den'] === null ? '' : ` → ${ngay_viet(String(r['ky_den']))}`}
          </div>
        )}
      </>
    ) },
    { nhan: 'Tiêu đề', ve: (r) => <strong>{co(r['tieu_de'])}</strong> },
    { nhan: 'Nội dung', ve: (r) => <div style={{ maxWidth: 340, whiteSpace: 'pre-wrap' }}>{co(r['noi_dung'])}</div> },
    { nhan: 'Trạng thái', ve: (r) => <Nhan ma={r['trang_thai']} bang="tt_bao_cao" /> },
    { nhan: 'Phản hồi', ve: (r) => <div style={{ maxWidth: 240 }}>{co(r['phan_hoi'])}</div> },
  ],
  khieu_nai: [
    { nhan: 'Gửi lúc', ve: (r) => <span className="khong-ngat so" style={{ fontSize: 12 }}>{ngay_gio(String(r['tao_luc']))}</span> },
    { nhan: 'Loại', ve: (r) => <Nhan ma={r['loai']} bang="loai_khieu_nai" /> },
    { nhan: 'Mức độ', ve: (r) => <Nhan ma={r['muc_do']} bang="uu_tien" /> },
    { nhan: 'Nội dung', ve: (r) => (
      <>
        <strong>{co(r['tieu_de'])}</strong>
        <div style={{ maxWidth: 360, whiteSpace: 'pre-wrap' }}>{co(r['noi_dung'])}</div>
      </>
    ) },
    { nhan: 'Trạng thái', ve: (r) => <Nhan ma={r['trang_thai']} bang="tt_khieu_nai" /> },
    { nhan: 'Phản hồi', ve: (r) => <div style={{ maxWidth: 260, whiteSpace: 'pre-wrap' }}>{co(r['phan_hoi'])}</div> },
  ],
  thiet_bi: [
    { nhan: 'Loại', ve: (r) => TEN['loai_thiet_bi']?.[String(r['loai'])] ?? '—' },
    { nhan: 'Thiết bị', ve: (r) => (
      <>
        <strong>{co(r['ten'])}</strong>
        {(co(r['hang']) !== '—' || co(r['model']) !== '—') && (
          <div className="o-so-phu">{[r['hang'], r['model']].filter(Boolean).join(' ')}</div>
        )}
      </>
    ) },
    { nhan: 'Số sê-ri', ve: (r) => <span className="so" style={{ fontSize: 12 }}>{co(r['so_seri'])}</span> },
    { nhan: 'Địa chỉ IP', ve: (r) => <span className="so">{co(r['dia_chi_ip'])}</span> },
    { nhan: 'MAC', ve: (r) => <span className="so" style={{ fontSize: 12 }}>{co(r['dia_chi_mac'])}</span> },
    { nhan: 'Ngày cấp', ve: (r) => <span className="khong-ngat">{r['ngay_cap'] === null ? '—' : ngay_viet(String(r['ngay_cap']))}</span> },
    { nhan: 'Tình trạng', ve: (r) => <Nhan ma={r['tinh_trang']} bang="tinh_trang_tb" /> },
  ],
};

// ==================================================================== tep dinh kem

function DanhSachTep(
  { tep, sua_duoc, khi_doi }: { tep: TepDinhKem[]; sua_duoc: boolean; khi_doi: () => void },
): ReactNode {
  const hd = dung_hanh_dong();
  if (tep.length === 0) return null;

  const tai = async (t: TepDinhKem): Promise<void> => {
    await hd.chay(() => tai_tep(`/api/ho-so/tep/${t.id}`, t.ten_goc), 'Đã tải tệp.');
  };
  const xoa = async (t: TepDinhKem): Promise<void> => {
    if (!window.confirm(`Xóa tệp "${t.ten_goc}"?`)) return;
    const ok = await hd.chay(() => goi(`/api/ho-so/tep/${t.id}`, { method: 'DELETE' }), 'Đã xóa tệp.');
    if (ok) khi_doi();
  };

  return (
    <div className="the">
      <h3>Tệp đính kèm</h3>
      <HopLoi loi={hd.loi} />
      <HopTot chu={hd.tot} />
      <div className="vo-bang">
        <table>
          <tbody>
            {tep.map((t) => (
              <tr key={t.id}>
                <td>{t.ten_goc}</td>
                <td className="canh-phai so" style={{ fontSize: 12 }}>
                  {Math.max(1, Math.round(t.kich_thuoc / 1024))} KB
                </td>
                <td className="khong-ngat" style={{ fontSize: 12 }}>{ngay_gio(t.tao_luc)}</td>
                <td className="khong-ngat">
                  <button className="nut-nho" onClick={() => void tai(t)}>Tải về</button>
                  {sua_duoc && (
                    <> <button className="nut-nho nut-nguy" onClick={() => void xoa(t)}>Xóa</button></>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FormTep(
  { nhom, nhan_vien_id, khi_dong, khi_xong }:
  { nhom: Nhom; nhan_vien_id: string; khi_dong: () => void; khi_xong: () => void },
): ReactNode {
  const [tep, dat_tep] = useState<File | null>(null);
  const hd = dung_hanh_dong();

  const gui = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (tep === null) return;
    const fd = new FormData();
    fd.append('nhom', nhom);
    fd.append('tep', tep);
    const ok = await hd.chay(() => gui_tep(`/api/nhan-vien/${nhan_vien_id}/tep`, fd), 'Đã tải tệp lên.');
    if (ok) setTimeout(khi_xong, 700);
  };

  return (
    <HopThoai tieu_de={`Đính kèm tệp — ${TEN_NHOM[nhom]}`} khi_dong={khi_dong}>
      <form onSubmit={gui}>
        <HopLoi loi={hd.loi} />
        <HopTot chu={hd.tot} />
        <div className="o-nhap">
          <label htmlFor="tep_hs">Chọn tệp *</label>
          <input id="tep_hs" type="file" accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx"
            onChange={(e) => dat_tep(e.target.files?.[0] ?? null)} required />
          <div className="goi-y">
            Nhận PDF, JPG, PNG, DOCX, XLSX — tối đa 15 MB. Loại tệp được nhận diện bằng nội dung
            thật, đổi đuôi tên không qua được. Tệp luôn được tải về chứ không mở trong trình duyệt.
          </div>
        </div>
        <div className="hang-nut">
          <button type="submit" className="nut-chinh" disabled={hd.dang_chay || tep === null}>
            {hd.dang_chay ? 'Đang tải lên…' : 'Tải lên'}
          </button>
          <button type="button" onClick={khi_dong}>Hủy</button>
        </div>
      </form>
    </HopThoai>
  );
}

// ==================================================================== form them / sua

interface OForm {
  ten: string;
  nhan: string;
  kieu?: 'text' | 'date' | 'so' | 'chon' | 'van_ban';
  chon?: string;
  bat_buoc?: boolean;
  goi_y?: string;
  rong?: boolean;
}

const O_FORM: Record<Nhom, OForm[]> = {
  hop_dong: [
    { ten: 'so_hd', nhan: 'Số hợp đồng' },
    { ten: 'loai', nhan: 'Loại hợp đồng', kieu: 'chon', chon: 'loai_hop_dong', bat_buoc: true },
    { ten: 'chuc_danh', nhan: 'Chức danh' },
    { ten: 'noi_lam_viec', nhan: 'Nơi làm việc' },
    { ten: 'ngay_ky', nhan: 'Ngày ký', kieu: 'date' },
    { ten: 'hieu_luc_tu', nhan: 'Hiệu lực từ', kieu: 'date', bat_buoc: true },
    {
      ten: 'hieu_luc_den', nhan: 'Hiệu lực đến', kieu: 'date',
      goi_y: 'Để trống nếu không xác định thời hạn. Loại "Không xác định thời hạn" bắt buộc để trống.',
    },
    { ten: 'luong_co_ban', nhan: 'Lương ghi trên HĐ (₫)', kieu: 'so' },
    { ten: 'trang_thai', nhan: 'Trạng thái', kieu: 'chon', chon: 'tt_hop_dong' },
    { ten: 'ghi_chu', nhan: 'Ghi chú', kieu: 'van_ban', rong: true },
  ],
  bien_ban: [
    { ten: 'loai', nhan: 'Loại', kieu: 'chon', chon: 'loai_bien_ban', bat_buoc: true },
    { ten: 'tieu_de', nhan: 'Tiêu đề', bat_buoc: true, rong: true },
    { ten: 'ngay_ky', nhan: 'Ngày ký', kieu: 'date' },
    { ten: 'hieu_luc_tu', nhan: 'Hiệu lực từ', kieu: 'date' },
    { ten: 'noi_dung', nhan: 'Nội dung', kieu: 'van_ban', rong: true },
  ],
  luong: [
    { ten: 'hieu_luc_tu', nhan: 'Hiệu lực từ', kieu: 'date', bat_buoc: true,
      goi_y: 'Mỗi ngày hiệu lực chỉ được một mức lương.' },
    { ten: 'luong_co_ban', nhan: 'Lương cơ bản (₫)', kieu: 'so', bat_buoc: true },
    { ten: 'phu_cap', nhan: 'Phụ cấp (₫)', kieu: 'so' },
    { ten: 'hinh_thuc', nhan: 'Hình thức', kieu: 'chon', chon: 'hinh_thuc_luong' },
    { ten: 'so_quyet_dinh', nhan: 'Số quyết định' },
    { ten: 'ly_do', nhan: 'Lý do', goi_y: 'Ví dụ: ký HĐ chính thức, tăng lương định kỳ.' },
    { ten: 'ghi_chu', nhan: 'Ghi chú', kieu: 'van_ban', rong: true },
  ],
  cong_viec: [
    { ten: 'tieu_de', nhan: 'Tiêu đề', bat_buoc: true, rong: true },
    { ten: 'mo_ta', nhan: 'Mô tả', kieu: 'van_ban', rong: true },
    { ten: 'han', nhan: 'Hạn hoàn thành', kieu: 'date' },
    { ten: 'uu_tien', nhan: 'Ưu tiên', kieu: 'chon', chon: 'uu_tien' },
    { ten: 'trang_thai', nhan: 'Trạng thái', kieu: 'chon', chon: 'tt_cong_viec' },
    { ten: 'ket_qua', nhan: 'Kết quả', kieu: 'van_ban', rong: true },
  ],
  bao_cao: [
    { ten: 'ky', nhan: 'Kỳ báo cáo', kieu: 'chon', chon: 'ky_bao_cao' },
    { ten: 'ky_tu', nhan: 'Từ ngày', kieu: 'date' },
    { ten: 'ky_den', nhan: 'Đến ngày', kieu: 'date' },
    { ten: 'tieu_de', nhan: 'Tiêu đề', bat_buoc: true, rong: true },
    { ten: 'noi_dung', nhan: 'Nội dung', kieu: 'van_ban', rong: true },
    { ten: 'trang_thai', nhan: 'Trạng thái', kieu: 'chon', chon: 'tt_bao_cao' },
    { ten: 'phan_hoi', nhan: 'Phản hồi của quản lý', kieu: 'van_ban', rong: true },
  ],
  khieu_nai: [
    { ten: 'tieu_de', nhan: 'Tiêu đề', bat_buoc: true, rong: true },
    { ten: 'noi_dung', nhan: 'Nội dung', kieu: 'van_ban', bat_buoc: true, rong: true },
    { ten: 'loai', nhan: 'Loại', kieu: 'chon', chon: 'loai_khieu_nai' },
    { ten: 'muc_do', nhan: 'Mức độ', kieu: 'chon', chon: 'uu_tien' },
    { ten: 'trang_thai', nhan: 'Trạng thái', kieu: 'chon', chon: 'tt_khieu_nai' },
    { ten: 'phan_hoi', nhan: 'Phản hồi của công ty', kieu: 'van_ban', rong: true },
  ],
  thiet_bi: [
    { ten: 'loai', nhan: 'Loại', kieu: 'chon', chon: 'loai_thiet_bi' },
    { ten: 'ten', nhan: 'Tên thiết bị', bat_buoc: true, rong: true },
    { ten: 'hang', nhan: 'Hãng' },
    { ten: 'model', nhan: 'Model' },
    { ten: 'so_seri', nhan: 'Số sê-ri' },
    { ten: 'dia_chi_ip', nhan: 'Địa chỉ IP', goi_y: 'Ví dụ 192.168.1.50. Hai máy đang dùng không được trùng IP.' },
    { ten: 'dia_chi_mac', nhan: 'Địa chỉ MAC', goi_y: '12 ký tự hex, ví dụ 00:17:61:11:2b:3d.' },
    { ten: 'ngay_cap', nhan: 'Ngày cấp', kieu: 'date' },
    { ten: 'ngay_thu_hoi', nhan: 'Ngày thu hồi', kieu: 'date' },
    { ten: 'tinh_trang', nhan: 'Tình trạng', kieu: 'chon', chon: 'tinh_trang_tb' },
    { ten: 'gia_tri', nhan: 'Giá trị (₫)', kieu: 'so' },
    { ten: 'ghi_chu', nhan: 'Ghi chú', kieu: 'van_ban', rong: true },
  ],
};

function FormHoSo(
  { nhom, nhan_vien_id, ban_ghi, khi_dong, khi_xong }: {
    nhom: Nhom;
    nhan_vien_id: string;
    ban_ghi: Record<string, unknown> | null;
    khi_dong: () => void;
    khi_xong: () => void;
  },
): ReactNode {
  const o = O_FORM[nhom];
  const [f, dat_f] = useState<Record<string, string>>(() => {
    const kd: Record<string, string> = {};
    for (const x of o) {
      const v = ban_ghi?.[x.ten];
      kd[x.ten] = v === null || v === undefined ? '' : String(v);
    }
    return kd;
  });
  const hd = dung_hanh_dong();
  const doi = (ten: string, v: string): void => dat_f((cu) => ({ ...cu, [ten]: v }));

  const gui = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const than: Record<string, unknown> = {};
    for (const x of o) {
      const v = f[x.ten] ?? '';
      // O rong = khong dat gia tri khi tao moi, va xoa gia tri khi sua.
      if (v === '' && ban_ghi === null) continue;
      than[x.ten] = v === '' ? null : (x.kieu === 'so' ? Number(v) : v);
    }
    const ok = await hd.chay(
      () => (ban_ghi === null
        ? goi(`/api/nhan-vien/${nhan_vien_id}/${DUONG_NHOM[nhom]}`, { method: 'POST', body: than })
        : goi(`/api/${DUONG_NHOM[nhom]}/${String(ban_ghi['id'])}`, { method: 'PATCH', body: than })),
      ban_ghi === null ? 'Đã thêm.' : 'Đã cập nhật.',
    );
    if (ok) setTimeout(khi_xong, 600);
  };

  return (
    <HopThoai
      tieu_de={`${ban_ghi === null ? 'Thêm' : 'Sửa'} ${TEN_NHOM[nhom].toLowerCase()}`}
      khi_dong={khi_dong}
      rong
    >
      <form onSubmit={gui}>
        <HopLoi loi={hd.loi} />
        <HopTot chu={hd.tot} />

        <div className="luoi luoi-2">
          {o.map((x) => (
            <div className="o-nhap" key={x.ten} style={x.rong === true ? { gridColumn: '1 / -1' } : undefined}>
              <label htmlFor={x.ten}>{x.nhan}{x.bat_buoc === true ? ' *' : ''}</label>
              {x.kieu === 'chon' ? (
                <select id={x.ten} value={f[x.ten] ?? ''} onChange={(e) => doi(x.ten, e.target.value)}
                  required={x.bat_buoc === true}>
                  <option value="">— Chọn —</option>
                  {Object.entries(TEN[x.chon ?? ''] ?? {}).map(([ma, ten]) => (
                    <option key={ma} value={ma}>{ten}</option>
                  ))}
                </select>
              ) : x.kieu === 'van_ban' ? (
                <textarea id={x.ten} rows={3} value={f[x.ten] ?? ''}
                  onChange={(e) => doi(x.ten, e.target.value)} required={x.bat_buoc === true} />
              ) : (
                <input
                  id={x.ten}
                  type={x.kieu === 'date' ? 'date' : x.kieu === 'so' ? 'number' : 'text'}
                  {...(x.kieu === 'so' ? { min: 0, step: 1000 } : {})}
                  value={f[x.ten] ?? ''}
                  onChange={(e) => doi(x.ten, e.target.value)}
                  required={x.bat_buoc === true}
                />
              )}
              {x.goi_y !== undefined && <div className="goi-y">{x.goi_y}</div>}
            </div>
          ))}
        </div>

        <div className="hang-nut">
          <button type="submit" className="nut-chinh" disabled={hd.dang_chay}>
            {hd.dang_chay ? 'Đang lưu…' : ban_ghi === null ? 'Thêm' : 'Lưu'}
          </button>
          <button type="button" onClick={khi_dong}>Hủy</button>
        </div>
      </form>
    </HopThoai>
  );
}

/** Doc id nhan vien tu duong dan /nhan-vien/<id>. */
export function dung_id_ho_so(): string | null {
  const { duong_dan } = dung_tuyen();
  const m = /^\/nhan-vien\/([0-9a-f-]{36})$/i.exec(duong_dan);
  return m?.[1] ?? null;
}
