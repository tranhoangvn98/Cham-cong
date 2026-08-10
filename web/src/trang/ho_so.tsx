// Ho so mot nhan su: hop dong, bien ban, luong, cong viec, bao cao, khieu nai, thiet bi.
//
// May chu la nguon su that ve quyen: no tra ve `nhom_xem_duoc` / `nhom_sua_duoc`, o day chi
// ve theo. Trang nay KHONG tu suy ra quyen tu vai tro — neu suy o hai noi thi som muon hai
// noi lech nhau, va cai lech nguy hiem la ben giao dien "de" hon ben may chu.
import { useState, type ReactNode } from 'react';
import { goi, gui_tep, tai_tep } from '../api.ts';
import {
  DangTai, HopLoi, HopThoai, HopThoaiXemTep, HopTot, Trong,
  dung_hanh_dong, dung_nap, ngay_viet, ngay_gio,
} from '../thanh_phan.tsx';
import { LienKet, dung_tuyen } from '../dinh_tuyen.tsx';

// ==================================================================== kieu du lieu

type Nhom =
  | 'thong_tin' | 'tai_lieu' | 'hop_dong' | 'bien_ban' | 'luong'
  | 'nguoi_phu_thuoc' | 'bhxh' | 'cong_viec' | 'bao_cao' | 'khieu_nai' | 'thiet_bi';

interface TongQuan {
  nhan_vien: Record<string, unknown> & { id: string; ma_nv: string; ho_ten: string };
  nhom_xem_duoc: Nhom[];
  nhom_sua_duoc: Nhom[];
  dem: Partial<Record<Nhom, number>>;
  hop_dong_hien_tai: Record<string, unknown> | null;
  luong_hien_tai: Record<string, unknown> | null;
  tien_do_tai_lieu: { can_co: number; da_du: number } | null;
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
  thong_tin: 'Thông tin chung',
  tai_lieu: 'Tài liệu',
  nguoi_phu_thuoc: 'Người phụ thuộc',
  bhxh: 'BHXH – BHYT',
  hop_dong: 'Hợp đồng lao động',
  bien_ban: 'Biên bản / thỏa thuận',
  luong: 'Lương',
  cong_viec: 'Công việc',
  bao_cao: 'Báo cáo',
  khieu_nai: 'Khiếu nại',
  thiet_bi: 'Thiết bị cấp phát',
};

const DUONG_NHOM: Record<Nhom, string> = {
  thong_tin: 'thong-tin',
  tai_lieu: 'tai-lieu',
  nguoi_phu_thuoc: 'nguoi-phu-thuoc',
  bhxh: 'bhxh',
  hop_dong: 'hop-dong',
  bien_ban: 'bien-ban',
  luong: 'luong',
  cong_viec: 'cong-viec',
  bao_cao: 'bao-cao',
  khieu_nai: 'khieu-nai',
  thiet_bi: 'thiet-bi-cap-phat',
};

const THU_TU: Nhom[] = [
  'thong_tin', 'tai_lieu', 'hop_dong', 'bien_ban', 'luong',
  'nguoi_phu_thuoc', 'bhxh', 'cong_viec', 'bao_cao', 'khieu_nai', 'thiet_bi',
];

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
  quan_he_npt: {
    con: 'Con', vo_chong: 'Vợ / chồng', cha: 'Cha', me: 'Mẹ',
    anh_chi_em: 'Anh chị em', khac: 'Khác',
  },
  loai_bhxh: {
    bao_tang: 'Báo tăng', bao_giam: 'Báo giảm', dieu_chinh: 'Điều chỉnh', chot_so: 'Chốt sổ',
    cap_the_bhyt: 'Cấp thẻ BHYT', om_dau: 'Ốm đau', thai_san: 'Thai sản',
    duong_suc: 'Dưỡng sức', tai_nan_lao_dong: 'Tai nạn lao động',
  },
  tt_bhxh: {
    moi: 'Mới', da_nop: 'Đã nộp', co_quan_duyet: 'Cơ quan duyệt',
    tu_choi: 'Từ chối', hoan_thanh: 'Hoàn thành',
  },
  tt_tai_lieu: {
    thieu: 'Thiếu', da_co_du_lieu: 'Đã có dữ liệu', da_so_hoa: 'Đã số hóa',
    da_len_phan_mem: 'Đã lên phần mềm',
  },
  gioi_tinh: { nam: 'Nam', nu: 'Nữ', khac: 'Khác' },
  hon_nhan: { doc_than: 'Độc thân', da_ket_hon: 'Đã kết hôn', khac: 'Khác' },
  tinh_trang_tb: {
    dang_dung: 'Đang dùng', da_thu_hoi: 'Đã thu hồi', bao_hong: 'Báo hỏng',
    mat: 'Mất', dang_sua: 'Đang sửa',
  },
};

const MAU_NHAN: Record<string, string> = {
  da_len_phan_mem: 'nhan-tot', hoan_thanh_bh: 'nhan-tot',
  thieu: 'nhan-xau', da_co_du_lieu: 'nhan-canh-bao', da_so_hoa: 'nhan-lanh',
  bao_tang: 'nhan-tot', bao_giam: 'nhan-canh-bao', chot_so: 'nhan-lanh',
  da_nop: 'nhan-lanh', co_quan_duyet: 'nhan-tot',
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
          nhan="Hồ sơ tài liệu"
          gia_tri={d.tien_do_tai_lieu === null || d.tien_do_tai_lieu === undefined
            ? '—'
            : `${d.tien_do_tai_lieu.da_du}/${d.tien_do_tai_lieu.can_co}`}
          phu={d.tien_do_tai_lieu === null || d.tien_do_tai_lieu === undefined
            ? 'không có quyền xem'
            : d.tien_do_tai_lieu.da_du >= d.tien_do_tai_lieu.can_co
              ? 'đã đủ hồ sơ bắt buộc'
              : `còn thiếu ${d.tien_do_tai_lieu.can_co - d.tien_do_tai_lieu.da_du} tài liệu bắt buộc`}
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

      {dang_mo === 'thong_tin' ? (
        <PanelThongTin nhan_vien_id={nhan_vien_id} />
      ) : dang_mo === 'tai_lieu' ? (
        <PanelTaiLieu nhan_vien_id={nhan_vien_id} khi_doi={() => tq.nap_lai()} />
      ) : dang_mo !== null && (
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
  nguoi_phu_thuoc: [
    { nhan: 'Họ tên', ve: (r) => <strong>{co(r['ho_ten'])}</strong> },
    { nhan: 'Quan hệ', ve: (r) => TEN['quan_he_npt']?.[String(r['quan_he'])] ?? '—' },
    { nhan: 'Ngày sinh', ve: (r) => <span className="khong-ngat">{r['ngay_sinh'] === null ? '—' : ngay_viet(String(r['ngay_sinh']))}</span> },
    { nhan: 'MST', ve: (r) => <span className="so">{co(r['ma_so_thue'])}</span> },
    {
      nhan: 'Giảm trừ từ',
      ve: (r) => (
        <span className="khong-ngat">
          {r['tu_thang'] === null ? '—' : ngay_viet(String(r['tu_thang']))}
          {r['den_thang'] === null ? '' : ` → ${ngay_viet(String(r['den_thang']))}`}
        </span>
      ),
    },
    {
      nhan: 'Đăng ký',
      ve: (r) => (r['da_dang_ky'] === true
        ? <span className="nhan nhan-tot">đã đăng ký</span>
        : <span className="nhan nhan-canh-bao">chưa</span>),
    },
  ],
  bhxh: [
    { nhan: 'Tháng', ve: (r) => <span className="khong-ngat so">{ngay_viet(String(r['thang']))}</span> },
    { nhan: 'Loại', ve: (r) => <Nhan ma={r['loai']} bang="loai_bhxh" /> },
    { nhan: 'Mức đóng', ve: (r) => <span className="canh-phai so">{tien(r['muc_dong'])}</span> },
    { nhan: 'Số hồ sơ', ve: (r) => <span className="so">{co(r['so_ho_so'])}</span> },
    { nhan: 'Trạng thái', ve: (r) => <Nhan ma={r['trang_thai']} bang="tt_bhxh" /> },
    { nhan: 'Ngày nộp', ve: (r) => <span className="khong-ngat">{r['ngay_nop'] === null ? '—' : ngay_viet(String(r['ngay_nop']))}</span> },
    { nhan: 'Ghi chú', ve: (r) => <div style={{ maxWidth: 240 }}>{co(r['ghi_chu'])}</div> },
  ],
  thong_tin: [],
  tai_lieu: [],
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
  const [dang_xem, dat_dang_xem] = useState<TepDinhKem | null>(null);
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
                  <button className="nut-nho nut-phang" onClick={() => dat_dang_xem(t)}>Xem</button>{' '}
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

      {dang_xem !== null && (
        <HopThoaiXemTep
          tep_id={dang_xem.id}
          ten_goc={dang_xem.ten_goc}
          khi_dong={() => dat_dang_xem(null)}
        />
      )}
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
  nguoi_phu_thuoc: [
    { ten: 'ho_ten', nhan: 'Họ tên', bat_buoc: true, rong: true },
    { ten: 'quan_he', nhan: 'Quan hệ', kieu: 'chon', chon: 'quan_he_npt' },
    { ten: 'ngay_sinh', nhan: 'Ngày sinh', kieu: 'date' },
    { ten: 'ma_so_thue', nhan: 'Mã số thuế' },
    { ten: 'so_cccd', nhan: 'Số CCCD / giấy khai sinh' },
    { ten: 'tu_thang', nhan: 'Giảm trừ từ tháng', kieu: 'date' },
    { ten: 'den_thang', nhan: 'Đến tháng', kieu: 'date', goi_y: 'Để trống nếu còn hiệu lực.' },
    { ten: 'ghi_chu', nhan: 'Ghi chú', kieu: 'van_ban', rong: true },
  ],
  bhxh: [
    { ten: 'loai', nhan: 'Loại hồ sơ', kieu: 'chon', chon: 'loai_bhxh', bat_buoc: true },
    { ten: 'thang', nhan: 'Tháng áp dụng', kieu: 'date', bat_buoc: true },
    { ten: 'muc_dong', nhan: 'Mức đóng (₫)', kieu: 'so' },
    { ten: 'so_ho_so', nhan: 'Số hồ sơ' },
    { ten: 'trang_thai', nhan: 'Trạng thái', kieu: 'chon', chon: 'tt_bhxh' },
    { ten: 'ngay_nop', nhan: 'Ngày nộp', kieu: 'date' },
    { ten: 'ngay_ket_qua', nhan: 'Ngày có kết quả', kieu: 'date' },
    { ten: 'ghi_chu', nhan: 'Ghi chú', kieu: 'van_ban', rong: true },
  ],
  thong_tin: [],
  tai_lieu: [],
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

// ==================================================================== tab Thông tin chung

interface KetQuaThongTin {
  ho_so: (Record<string, unknown> & { da_che: boolean }) | null;
  sua_duoc: boolean;
  xem_day_du: boolean;
}

/** Nhóm ô để đọc theo mắt người, không theo thứ tự cột trong CSDL. */
const KHOI_THONG_TIN: { tieu_de: string; o: { ten: string; nhan: string; kieu?: string; chon?: string }[] }[] = [
  {
    tieu_de: 'Căn cước & nhân thân',
    o: [
      { ten: 'cccd_so', nhan: 'Số CCCD' },
      { ten: 'cccd_ngay_cap', nhan: 'Ngày cấp', kieu: 'date' },
      { ten: 'cccd_noi_cap', nhan: 'Nơi cấp' },
      { ten: 'ngay_sinh', nhan: 'Ngày sinh', kieu: 'date' },
      { ten: 'gioi_tinh', nhan: 'Giới tính', kieu: 'chon', chon: 'gioi_tinh' },
      { ten: 'noi_sinh', nhan: 'Nơi sinh' },
      { ten: 'dan_toc', nhan: 'Dân tộc' },
      { ten: 'quoc_tich', nhan: 'Quốc tịch' },
      { ten: 'tinh_trang_hon_nhan', nhan: 'Tình trạng hôn nhân', kieu: 'chon', chon: 'hon_nhan' },
    ],
  },
  {
    tieu_de: 'Liên hệ',
    o: [
      { ten: 'dia_chi_thuong_tru', nhan: 'Địa chỉ thường trú' },
      { ten: 'dia_chi_hien_tai', nhan: 'Địa chỉ hiện tại' },
      { ten: 'lien_he_khan_ten', nhan: 'Người liên hệ khẩn cấp' },
      { ten: 'lien_he_khan_quan_he', nhan: 'Quan hệ' },
      { ten: 'lien_he_khan_sdt', nhan: 'SĐT khẩn cấp' },
    ],
  },
  {
    tieu_de: 'Thuế & ngân hàng',
    o: [
      { ten: 'ma_so_thue', nhan: 'Mã số thuế' },
      { ten: 'ngan_hang', nhan: 'Ngân hàng' },
      { ten: 'so_tai_khoan', nhan: 'Số tài khoản' },
    ],
  },
  {
    tieu_de: 'Bảo hiểm',
    o: [
      { ten: 'so_bhxh', nhan: 'Số BHXH' },
      { ten: 'so_the_bhyt', nhan: 'Số thẻ BHYT' },
      { ten: 'co_quan_bhxh', nhan: 'Cơ quan BHXH' },
      { ten: 'noi_kham_chua_benh', nhan: 'Nơi KCB ban đầu' },
    ],
  },
  {
    tieu_de: 'Sức khỏe',
    o: [
      { ten: 'kham_suc_khoe_ngay', nhan: 'Ngày khám gần nhất', kieu: 'date' },
      { ten: 'kham_suc_khoe_noi', nhan: 'Cơ sở khám' },
      { ten: 'kham_suc_khoe_ket_luan', nhan: 'Kết luận' },
    ],
  },
];

function PanelThongTin({ nhan_vien_id }: { nhan_vien_id: string }): ReactNode {
  const duong = `/api/nhan-vien/${nhan_vien_id}/thong-tin`;
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<KetQuaThongTin>(duong, [nhan_vien_id]);
  const [dang_sua, dat_dang_sua] = useState(false);

  if (dang_tai) return <DangTai />;
  const h = du_lieu?.ho_so ?? null;

  return (
    <>
      <HopLoi loi={loi} />

      {du_lieu?.xem_day_du === false && (
        <div className="hop-thong-bao hop-luu-y">
          Một số ô đang <strong>che bớt</strong> vì vai trò của bạn không được xem bản đầy đủ.
          Đây là dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP.
        </div>
      )}

      {du_lieu?.sua_duoc === true && (
        <div className="hang-nut">
          <button type="button" className="nut-chinh" onClick={() => dat_dang_sua(true)}>
            {h === null ? '+ Khai thông tin cá nhân' : 'Sửa thông tin'}
          </button>
        </div>
      )}

      {h === null ? (
        <div className="the the-mong">
          <Trong
            tieu_de="Chưa khai thông tin cá nhân"
            mo_ta="Cần CCCD, ngày sinh, mã số thuế và số BHXH để làm thủ tục bảo hiểm và thuế."
          />
        </div>
      ) : (
        <div className="luoi luoi-2">
          {KHOI_THONG_TIN.map((k) => (
            <div className="the" key={k.tieu_de}>
              <h3>{k.tieu_de}</h3>
              <div className="vo-bang">
                <table>
                  <tbody>
                    {k.o.map((o) => (
                      <tr key={o.ten}>
                        <td style={{ color: 'var(--chu-nhat)', width: '45%' }}>{o.nhan}</td>
                        <td className={o.kieu === undefined ? 'so' : undefined}>
                          {o.kieu === 'date'
                            ? (h[o.ten] === null ? '—' : ngay_viet(String(h[o.ten])))
                            : o.kieu === 'chon'
                              ? (TEN[o.chon ?? '']?.[String(h[o.ten])] ?? '—')
                              : co(h[o.ten])}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {dang_sua && (
        <FormThongTin
          nhan_vien_id={nhan_vien_id}
          ban_dau={h}
          khi_dong={() => dat_dang_sua(false)}
          khi_xong={() => { dat_dang_sua(false); nap_lai(); }}
        />
      )}
    </>
  );
}

function FormThongTin(
  { nhan_vien_id, ban_dau, khi_dong, khi_xong }: {
    nhan_vien_id: string;
    ban_dau: Record<string, unknown> | null;
    khi_dong: () => void;
    khi_xong: () => void;
  },
): ReactNode {
  const moi_o = KHOI_THONG_TIN.flatMap((k) => k.o);
  const [f, dat_f] = useState<Record<string, string>>(() => {
    const kd: Record<string, string> = {};
    for (const o of moi_o) {
      const v = ban_dau?.[o.ten];
      kd[o.ten] = v === null || v === undefined ? '' : String(v);
    }
    return kd;
  });
  const hd = dung_hanh_dong();

  const gui = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const than: Record<string, unknown> = {};
    for (const o of moi_o) than[o.ten] = (f[o.ten] ?? '') === '' ? null : f[o.ten];
    const ok = await hd.chay(
      () => goi(`/api/nhan-vien/${nhan_vien_id}/thong-tin`, { method: 'PUT', body: than }),
      'Đã lưu thông tin cá nhân.',
    );
    if (ok) setTimeout(khi_xong, 600);
  };

  return (
    <HopThoai tieu_de="Thông tin cá nhân" khi_dong={khi_dong} rong>
      <form onSubmit={gui}>
        <HopLoi loi={hd.loi} />
        <HopTot chu={hd.tot} />

        <div className="hop-thong-bao hop-tin">
          Đây là dữ liệu cá nhân theo <strong>Nghị định 13/2023/NĐ-CP</strong>. Mỗi lần có người
          xem bản đầy đủ của người khác đều được ghi vào nhật ký thao tác.
        </div>

        {KHOI_THONG_TIN.map((k) => (
          <div key={k.tieu_de}>
            <h3 style={{ marginTop: 14 }}>{k.tieu_de}</h3>
            <div className="luoi luoi-2">
              {k.o.map((o) => (
                <div className="o-nhap" key={o.ten}>
                  <label htmlFor={o.ten}>{o.nhan}</label>
                  {o.kieu === 'chon' ? (
                    <select id={o.ten} value={f[o.ten] ?? ''}
                      onChange={(e) => dat_f((c) => ({ ...c, [o.ten]: e.target.value }))}>
                      <option value="">— Chọn —</option>
                      {Object.entries(TEN[o.chon ?? ''] ?? {}).map(([ma, ten]) => (
                        <option key={ma} value={ma}>{ten}</option>
                      ))}
                    </select>
                  ) : (
                    <input id={o.ten} type={o.kieu === 'date' ? 'date' : 'text'}
                      value={f[o.ten] ?? ''}
                      onChange={(e) => dat_f((c) => ({ ...c, [o.ten]: e.target.value }))} />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="hang-nut">
          <button type="submit" className="nut-chinh" disabled={hd.dang_chay}>
            {hd.dang_chay ? 'Đang lưu…' : 'Lưu'}
          </button>
          <button type="button" onClick={khi_dong}>Hủy</button>
        </div>
      </form>
    </HopThoai>
  );
}

// ==================================================================== tab Tài liệu (checklist)

interface DongTaiLieu {
  danh_muc_id: string;
  ma: string;
  ten: string;
  nhom: string;
  mo_ta: string | null;
  bat_buoc: boolean;
  chi_khi_nghi_viec: boolean;
  tam_mien: boolean;
  id: string | null;
  trang_thai: string | null;
  nguoi_phu_trach: string | null;
  han_hoan_thanh: string | null;
  ghi_chu: string | null;
  tep_id: string | null;
  tep_ten: string | null;
  tep_kich_thuoc: number | null;
}

interface KetQuaTaiLieu {
  danh_sach: DongTaiLieu[];
  dang_nghi_viec: boolean;
  tien_do: { can_co: number; da_du: number };
  sua_duoc: boolean;
}

function PanelTaiLieu(
  { nhan_vien_id, khi_doi }: { nhan_vien_id: string; khi_doi: () => void },
): ReactNode {
  const duong = `/api/nhan-vien/${nhan_vien_id}/tai-lieu`;
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<KetQuaTaiLieu>(duong, [nhan_vien_id]);
  const [dang_sua, dat_dang_sua] = useState<DongTaiLieu | null>(null);
  const hd = dung_hanh_dong();

  if (dang_tai) return <DangTai />;
  const ds = du_lieu?.danh_sach ?? [];
  const td = du_lieu?.tien_do ?? { can_co: 0, da_du: 0 };
  const sua_duoc = du_lieu?.sua_duoc ?? false;
  const phan_tram = td.can_co === 0 ? 100 : Math.round((td.da_du / td.can_co) * 100);

  /**
   * Nhận tệp thả vào một dòng: tải lên rồi gắn ngay vào đúng dòng đó.
   *
   * Làm hai bước trong một thao tác vì tách ra thì người dùng phải nhớ "tải lên xong rồi
   * gắn vào mục nào" — và cái nhớ đó là chỗ hồ sơ bị gắn nhầm mục.
   */
  const nhan_tep = async (d: DongTaiLieu, tep: File): Promise<void> => {
    const fd = new FormData();
    fd.append('nhom', 'tai_lieu');
    fd.append('tep', tep);
    const ok = await hd.chay(async () => {
      const len = await gui_tep<{ id: string }>(`/api/nhan-vien/${nhan_vien_id}/tep`, fd);
      await goi(`/api/nhan-vien/${nhan_vien_id}/tai-lieu/${d.ma}`, {
        method: 'PUT',
        body: {
          trang_thai: 'da_len_phan_mem',
          tep_id: len.id,
          nguoi_phu_trach: d.nguoi_phu_trach,
          han_hoan_thanh: d.han_hoan_thanh,
          ghi_chu: d.ghi_chu,
        },
      });
    }, `Đã nhận "${tep.name}" cho mục ${d.ten}.`);
    if (ok) { nap_lai(); khi_doi(); }
  };

  return (
    <>
      <HopLoi loi={loi} />
      <HopLoi loi={hd.loi} />
      <HopTot chu={hd.tot} />

      <div className="the">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h3 style={{ margin: 0 }}>Tiến độ hồ sơ bắt buộc</h3>
          <strong className="so">{td.da_du}/{td.can_co}</strong>
        </div>
        <div className="thanh-tien-do" style={{ marginTop: 8 }}>
          <div className={phan_tram >= 100 ? 'thanh-tien-do-day du' : 'thanh-tien-do-day'}
            style={{ width: `${phan_tram}%` }} />
        </div>
        <div className="goi-y" style={{ marginTop: 6 }}>
          Chỉ tính là đủ khi tài liệu đã ở mức <strong>"Đã lên phần mềm"</strong>.
          {!(du_lieu?.dang_nghi_viec ?? false) && ' Tài liệu chỉ phát sinh khi nghỉ việc được tạm miễn.'}
        </div>
      </div>

      <div className="the the-mong">
        <div className="vo-bang">
          <table>
            <thead>
              <tr>
                <th>Tài liệu</th>
                <th>Trạng thái</th>
                <th>Người phụ trách</th>
                <th>Hạn</th>
                <th style={{ minWidth: 240 }}>Tệp</th>
                {sua_duoc && <th></th>}
              </tr>
            </thead>
            <tbody>
              {ds.map((d) => (
                <tr key={d.ma} style={d.tam_mien ? { opacity: 0.6 } : undefined}>
                  <td>
                    <strong>{d.ten}</strong>
                    {d.bat_buoc && !d.tam_mien && <span style={{ color: 'var(--xau)' }}> *</span>}
                    {d.tam_mien && <span className="nhan nhan-mo" style={{ marginLeft: 6 }}>khi nghỉ việc</span>}
                    {d.mo_ta !== null && <div className="o-so-phu" style={{ maxWidth: 300 }}>{d.mo_ta}</div>}
                  </td>
                  <td>
                    {d.trang_thai === null || d.trang_thai === 'thieu'
                      ? (d.bat_buoc && !d.tam_mien
                        ? <span className="nhan nhan-xau">Thiếu (bắt buộc)</span>
                        : <span className="nhan nhan-mo">Chưa có</span>)
                      : <Nhan ma={d.trang_thai} bang="tt_tai_lieu" />}
                  </td>
                  <td>{co(d.nguoi_phu_trach)}</td>
                  <td className="khong-ngat">
                    {d.han_hoan_thanh === null ? '—' : ngay_viet(d.han_hoan_thanh)}
                  </td>
                  <td>
                    {d.tep_id !== null ? (
                      <TepDaNop nhan_vien_id={nhan_vien_id} tep_id={d.tep_id} ten={d.tep_ten ?? 'tệp'} />
                    ) : sua_duoc ? (
                      <OKeoTha khi_nhan={(tep) => void nhan_tep(d, tep)} ma={d.ma} />
                    ) : '—'}
                  </td>
                  {sua_duoc && (
                    <td>
                      <button className="nut-nho" onClick={() => dat_dang_sua(d)}>Sửa</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {dang_sua !== null && (
        <FormDongTaiLieu
          nhan_vien_id={nhan_vien_id}
          dong={dang_sua}
          khi_dong={() => dat_dang_sua(null)}
          khi_xong={() => { dat_dang_sua(null); nap_lai(); khi_doi(); }}
        />
      )}
    </>
  );
}

function TepDaNop(
  { tep_id, ten }: { nhan_vien_id: string; tep_id: string; ten: string },
): ReactNode {
  const hd = dung_hanh_dong();
  const [dang_xem, dat_dang_xem] = useState(false);
  return (
    <>
      {/* Bam vao ten tep la XEM chu khong phai tai ve: doi chieu ho so thi nguoi ta muon
          liec qua, tai ve moi lan mot tep la doi thao tac lay ra ca thu muc rac. */}
      <button className="nut-nho nut-phang" onClick={() => dat_dang_xem(true)} title="Xem nhanh">
        {ten}
      </button>{' '}
      <button className="nut-nho" onClick={() => void hd.chay(
        () => tai_tep(`/api/ho-so/tep/${tep_id}`, ten), 'Đã tải tệp.',
      )} title="Tải về">
        ↓
      </button>
      <HopLoi loi={hd.loi} />
      {dang_xem && (
        <HopThoaiXemTep tep_id={tep_id} ten_goc={ten} khi_dong={() => dat_dang_xem(false)} />
      )}
    </>
  );
}

/** Ô kéo-thả cho từng dòng tài liệu, đúng như bản demo. */
function OKeoTha(
  { khi_nhan, ma }: { khi_nhan: (tep: File) => void; ma: string },
): ReactNode {
  const [dang_ke, dat_dang_ke] = useState(false);

  return (
    <label
      htmlFor={`tep_${ma}`}
      className={dang_ke ? 'o-keo-tha dang-ke' : 'o-keo-tha'}
      onDragOver={(e) => { e.preventDefault(); dat_dang_ke(true); }}
      onDragLeave={() => dat_dang_ke(false)}
      onDrop={(e) => {
        e.preventDefault();
        dat_dang_ke(false);
        const tep = e.dataTransfer.files?.[0];
        if (tep !== undefined) khi_nhan(tep);
      }}
    >
      Kéo thả hoặc bấm để tải lên
      <input
        id={`tep_${ma}`}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx"
        style={{ display: 'none' }}
        onChange={(e) => {
          const tep = e.target.files?.[0];
          if (tep !== undefined) khi_nhan(tep);
          e.target.value = '';
        }}
      />
    </label>
  );
}

function FormDongTaiLieu(
  { nhan_vien_id, dong, khi_dong, khi_xong }: {
    nhan_vien_id: string;
    dong: DongTaiLieu;
    khi_dong: () => void;
    khi_xong: () => void;
  },
): ReactNode {
  const [f, dat_f] = useState({
    trang_thai: dong.trang_thai ?? 'thieu',
    nguoi_phu_trach: dong.nguoi_phu_trach ?? '',
    han_hoan_thanh: dong.han_hoan_thanh ?? '',
    ghi_chu: dong.ghi_chu ?? '',
  });
  const hd = dung_hanh_dong();

  const gui = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const ok = await hd.chay(
      () => goi(`/api/nhan-vien/${nhan_vien_id}/tai-lieu/${dong.ma}`, {
        method: 'PUT',
        body: {
          trang_thai: f.trang_thai,
          tep_id: dong.tep_id,
          nguoi_phu_trach: f.nguoi_phu_trach === '' ? null : f.nguoi_phu_trach,
          han_hoan_thanh: f.han_hoan_thanh === '' ? null : f.han_hoan_thanh,
          ghi_chu: f.ghi_chu === '' ? null : f.ghi_chu,
        },
      }),
      'Đã cập nhật.',
    );
    if (ok) setTimeout(khi_xong, 600);
  };

  return (
    <HopThoai tieu_de={dong.ten} khi_dong={khi_dong}>
      <form onSubmit={gui}>
        <HopLoi loi={hd.loi} />
        <HopTot chu={hd.tot} />

        <div className="o-nhap">
          <label htmlFor="tt">Trạng thái</label>
          <select id="tt" value={f.trang_thai}
            onChange={(e) => dat_f((c) => ({ ...c, trang_thai: e.target.value }))}>
            {Object.entries(TEN['tt_tai_lieu'] ?? {}).map(([ma, ten]) => (
              <option key={ma} value={ma}>{ten}</option>
            ))}
          </select>
          <div className="goi-y">
            Ba mức theo checklist HCNS: đã có dữ liệu → đã số hóa → đã lên phần mềm.
            Chỉ mức cuối mới tính vào tiến độ.
          </div>
        </div>

        <div className="luoi luoi-2">
          <div className="o-nhap">
            <label htmlFor="npt">Người phụ trách</label>
            <input id="npt" value={f.nguoi_phu_trach}
              onChange={(e) => dat_f((c) => ({ ...c, nguoi_phu_trach: e.target.value }))} />
          </div>
          <div className="o-nhap">
            <label htmlFor="hht">Hạn hoàn thành</label>
            <input id="hht" type="date" value={f.han_hoan_thanh}
              onChange={(e) => dat_f((c) => ({ ...c, han_hoan_thanh: e.target.value }))} />
          </div>
        </div>

        <div className="o-nhap">
          <label htmlFor="gc">Ghi chú</label>
          <textarea id="gc" rows={2} value={f.ghi_chu}
            onChange={(e) => dat_f((c) => ({ ...c, ghi_chu: e.target.value }))} />
        </div>

        <div className="hang-nut">
          <button type="submit" className="nut-chinh" disabled={hd.dang_chay}>
            {hd.dang_chay ? 'Đang lưu…' : 'Lưu'}
          </button>
          <button type="button" onClick={khi_dong}>Hủy</button>
        </div>
      </form>
    </HopThoai>
  );
}
