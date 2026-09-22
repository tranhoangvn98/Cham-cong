// Quan ly UNG LUONG (tam ung luong).
//
// Quy trinh: Tao (cho_duyet) -> Duyet (da_duyet) -> Danh dau da chi (da_chi) / Huy.
// CHI khoan 'da_chi' moi tru vao luong: khi Tinh luong thang do, tong ung 'da_chi' cua nguoi
// thanh khoan tru "Da tam ung" trong phieu -> thuc linh da net. Ai thuc linh <= 0 thi khong
// ra dong o Lap Lenh Chi. Xem may_chu/src/luong/ky_luong.ts + lenh_chi.ts.
//
// Bo cuc MOT MAN HINH (khong cuon trang): dau trang + luu y + hang loc + bang log cuon noi bo
// trong the. Modal tao/sua khoan ung boc thanh luoi 2 cot nen KHONG can cuon. Thang va ngay
// hien TIENG VIET (khong dung input type=month/date vi chung hien theo ngon ngu trinh duyet).
import { useState, type ReactNode } from 'react';
import { goi } from '../api.ts';
import {
  ChonThang, DangTai, HopLoi, HopThoai, Trong, XuongDanhSach,
  dung_hanh_dong, dung_nap, hom_nay, thang_nay,
} from '../thanh_phan.tsx';
import { dung_phan_trang } from '../phan_trang.tsx';
import { Chon } from '../chon.tsx';

interface NhanVienGon {
  id: string;
  ma_nv: string;
  ho_ten: string;
  phong_ban: string | null;
  dang_hoat_dong: boolean;
}

interface Ung {
  id: string;
  nhan_vien_id: string;
  ma_nv: string;
  ho_ten: string;
  thang: string;
  so_tien: number;
  ngay_ung: string | null;
  hinh_thuc: 'tien_mat' | 'chuyen_khoan';
  trang_thai: 'cho_duyet' | 'da_duyet' | 'da_chi' | 'huy';
  ly_do: string | null;
  ghi_chu: string | null;
  tao_luc: string;
  duyet_luc: string | null;
  chi_luc: string | null;
  nguoi_tao: string | null;
  nguoi_duyet: string | null;
}

const NHAN_TT: Record<Ung['trang_thai'], string> = {
  cho_duyet: 'Chờ duyệt',
  da_duyet: 'Đã duyệt',
  da_chi: 'Đã chi',
  huy: 'Hủy',
};

const MAU_TT: Record<Ung['trang_thai'], string> = {
  cho_duyet: 'nhan-canh-bao',
  da_duyet: 'nhan-mo',
  da_chi: 'nhan-tot',
  huy: 'nhan-xau',
};

const NHAN_HINH_THUC: Record<Ung['hinh_thuc'], string> = {
  tien_mat: 'Tiền mặt',
  chuyen_khoan: 'Chuyển khoản',
};

/** Dinh dang tien Viet: cham phan nhom nghin, khong hien so le. */
function tien(v: unknown): string {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('vi-VN', { maximumFractionDigits: 0 });
}

/** 'YYYY-MM-DD' (hoac rong) -> 'dd/mm/yyyy' de hien trong o nhap. */
function iso_sang_viet(iso: string | null): string {
  if (iso === null || iso === '') return '';
  const [n, t, d] = iso.split('-');
  return d === undefined ? iso : `${d}/${t}/${n}`;
}

/** Them dau '/' trong luc go: '19092026' -> '19/09/2026'. */
function them_gach_ngay(chuoi: string): string {
  const so = chuoi.replace(/\D/g, '').slice(0, 8);
  if (so.length <= 2) return so;
  if (so.length <= 4) return `${so.slice(0, 2)}/${so.slice(2)}`;
  return `${so.slice(0, 2)}/${so.slice(2, 4)}/${so.slice(4)}`;
}

/** Kiem tra 'dd/mm/yyyy' va doi sang 'YYYY-MM-DD'. Tra loi loi khi sai dang. */
function viet_sang_iso(viet: string): { ok: true; iso: string | null } | { ok: false; loi: string } {
  const s = viet.trim();
  if (s === '') return { ok: true, iso: null };
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (m === null) {
    return { ok: false, loi: 'Ngày ứng phải viết dạng dd/mm/yyyy (ví dụ 19/09/2026).' };
  }
  const dd = Number(m[1]);
  const tt = Number(m[2]);
  const nn = Number(m[3]);
  if (dd < 1 || dd > 31 || tt < 1 || tt > 12 || nn < 2000 || nn > 2100) {
    return { ok: false, loi: 'Ngày ứng không hợp lệ.' };
  }
  return { ok: true, iso: `${m[3]}-${m[2]}-${m[1]}` };
}

export function TrangUngLuong(): ReactNode {
  const [thang, dat_thang] = useState(thang_nay());
  const [trang_thai, dat_trang_thai] = useState<'' | Ung['trang_thai']>('');
  const [tao, dat_tao] = useState(false);
  const [sua, dat_sua] = useState<Ung | null>(null);

  const truy_van = `/api/ung-luong?thang=${thang}${trang_thai === '' ? '' : `&trang_thai=${trang_thai}`}`;
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<Ung[]>(truy_van, [thang, trang_thai]);
  const hd = dung_hanh_dong();

  const hanh = (duong_dan: string, thong_bao: string) => () => {
    void hd.chay(() => goi(duong_dan, { method: 'POST' }), thong_bao).then(() => nap_lai());
  };

  const ds = du_lieu ?? [];
  const tong_da_chi = ds.filter((u) => u.trang_thai === 'da_chi')
    .reduce((s, u) => s + Number(u.so_tien), 0);

  // Phan trang tren danh sach khoan ung da loc theo thang + trang thai.
  const { ds_xem, bo_phan_trang } = dung_phan_trang(ds);

  return (
    <div className="ul-vo">
      <div className="dau-trang">
        <div>
          <p className="mo-ta">
            Tạm ứng lương theo tháng. Chỉ khoản <strong>Đã chi</strong> mới trừ vào phiếu lương
            (thành khoản trừ "Đã tạm ứng") khi bấm <em>Tính lương</em> tháng đó.
          </p>
        </div>
        <div className="hang-nut">
          <button onClick={() => dat_tao(true)} disabled={hd.dang_chay}>Tạo khoản ứng</button>
        </div>
      </div>

      <div className="hop-luu-y">
        Sau khi đánh dấu <strong>Đã chi</strong> (hoặc thêm/sửa khoản đã chi), phải vào{' '}
        <em>Bảng lương → Tính lương</em> tháng tương ứng để khoản ứng trừ vào phiếu. Ai ứng đủ/quá
        lương (thực lĩnh ≤ 0) sẽ không xuất hiện khi <em>Lập Lệnh Chi</em>.
      </div>

      <div className="ul-loc">
        <span className="ul-loc-o">
          <label>Tháng</label>
          <ChonThang gia_tri={thang} doi={dat_thang} />
        </span>
        <span className="ul-loc-o">
          <label htmlFor="ul-tt">Trạng thái</label>
          <Chon gia_tri={trang_thai}
            dat_gia_tri={(ma) => dat_trang_thai(ma as '' | Ung['trang_thai'])}
            cac_tuy_chon={[
              { ma: 'cho_duyet', nhan: 'Chờ duyệt' },
              { ma: 'da_duyet', nhan: 'Đã duyệt' },
              { ma: 'da_chi', nhan: 'Đã chi' },
              { ma: 'huy', nhan: 'Hủy' },
            ]}
            rong="— tất cả —" nhan="Lọc theo trạng thái" />
        </span>
      </div>

      {hd.loi !== null && <HopLoi loi={hd.loi} />}

      <div className="ul-bang the the-mong">
        {dang_tai ? <XuongDanhSach /> : loi !== null ? <HopLoi loi={loi} /> : ds.length === 0 ? (
          <Trong tieu_de="Chưa có khoản ứng nào" mo_ta="Bấm 'Tạo khoản ứng' để thêm." />
        ) : (
          <div className="vo-bang">
            <table className="bang-gon">
              <thead>
                <tr>
                  <th>Mã NV</th><th>Họ tên</th><th>Tháng</th>
                  <th className="canh-phai">Số tiền</th>
                  <th>Ngày ứng</th><th>Hình thức</th><th>Trạng thái</th>
                  <th>Lý do</th><th />
                </tr>
              </thead>
              <tbody>
                {ds_xem.map((u) => (
                  <tr key={u.id}>
                    <td>{u.ma_nv}</td>
                    <td>{u.ho_ten}</td>
                    <td>{u.thang}</td>
                    <td className="canh-phai">{tien(u.so_tien)}</td>
                    <td>{u.ngay_ung ?? '—'}</td>
                    <td>{NHAN_HINH_THUC[u.hinh_thuc]}</td>
                    <td><span className={MAU_TT[u.trang_thai]}>{NHAN_TT[u.trang_thai]}</span></td>
                    <td>{u.ly_do ?? '—'}</td>
                    <td className="canh-phai" style={{ whiteSpace: 'nowrap' }}>
                      {u.trang_thai === 'cho_duyet' && (<>
                        <button className="nut-phang" disabled={hd.dang_chay}
                          onClick={() => dat_sua(u)}>Sửa</button>
                        <button className="nut-phang" disabled={hd.dang_chay}
                          onClick={hanh(`/api/ung-luong/${u.id}/duyet`, 'Đã duyệt khoản ứng.')}>
                          Duyệt
                        </button>
                      </>)}
                      {u.trang_thai === 'da_duyet' && (
                        <button className="nut-phang" disabled={hd.dang_chay}
                          onClick={hanh(`/api/ung-luong/${u.id}/da-chi`,
                            'Đã đánh dấu đã chi. Hãy Tính lương tháng này để trừ vào phiếu.')}>
                          Đánh dấu đã chi
                        </button>
                      )}
                      {(u.trang_thai === 'cho_duyet' || u.trang_thai === 'da_duyet') && (
                        <button className="nut-phang" disabled={hd.dang_chay}
                          onClick={hanh(`/api/ung-luong/${u.id}/huy`, 'Đã hủy khoản ứng.')}>
                          Hủy
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}><strong>Tổng đã chi (tháng {thang})</strong></td>
                  <td className="canh-phai"><strong>{tien(tong_da_chi)}</strong></td>
                  <td colSpan={5} />
                </tr>
              </tfoot>
            </table>
            {bo_phan_trang}
          </div>
        )}
      </div>

      {tao && (
        <HopThoaiUng thang_mac_dinh={thang}
          khi_dong={() => dat_tao(false)}
          khi_xong={() => { dat_tao(false); nap_lai(); }} />
      )}
      {sua !== null && (
        <HopThoaiUng ung={sua} thang_mac_dinh={sua.thang}
          khi_dong={() => dat_sua(null)}
          khi_xong={() => { dat_sua(null); nap_lai(); }} />
      )}
    </div>
  );
}

function HopThoaiUng(
  { ung, thang_mac_dinh, khi_dong, khi_xong }: {
    ung?: Ung; thang_mac_dinh: string; khi_dong: () => void; khi_xong: () => void;
  },
): ReactNode {
  const sua_duoc = ung !== undefined;
  const nv = dung_nap<NhanVienGon[]>('/api/nhan-vien');
  const [nhan_vien_id, dat_nv] = useState(ung?.nhan_vien_id ?? '');
  const [tim, dat_tim] = useState('');
  const [loi_ngay, dat_loi_ngay] = useState<string | null>(null);
  const [f, dat_f] = useState({
    thang: ung?.thang ?? thang_mac_dinh,
    so_tien: ung === undefined ? '' : String(ung.so_tien),
    ngay_ung: iso_sang_viet(ung?.ngay_ung ?? hom_nay()),
    hinh_thuc: ung?.hinh_thuc ?? 'tien_mat',
    ly_do: ung?.ly_do ?? '',
    ghi_chu: ung?.ghi_chu ?? '',
  });
  const hd = dung_hanh_dong();
  const dat = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    dat_f({ ...f, [k]: e.target.value });

  const tieu_de = sua_duoc ? 'Sửa khoản ứng' : 'Tạo khoản ứng';

  if (!sua_duoc && nv.dang_tai) {
    return <HopThoai tieu_de={tieu_de} khi_dong={khi_dong}><DangTai /></HopThoai>;
  }

  const moi_nguoi = (nv.du_lieu ?? []).filter((x) => x.dang_hoat_dong || x.id === nhan_vien_id);
  const loc = tim.trim().toLowerCase();
  const hien = loc === '' ? moi_nguoi : moi_nguoi.filter((x) =>
    x.ho_ten.toLowerCase().includes(loc) || x.ma_nv.toLowerCase().includes(loc));

  const du_dieu_kien = nhan_vien_id !== '' && /^\d{4}-\d{2}$/.test(f.thang)
    && Number(f.so_tien) > 0;

  const luu = (): void => {
    const kq_ngay = viet_sang_iso(f.ngay_ung);
    if (!kq_ngay.ok) {
      dat_loi_ngay(kq_ngay.loi);
      return;
    }
    const than = {
      nhan_vien_id, thang: f.thang, so_tien: Number(f.so_tien),
      ngay_ung: kq_ngay.iso,
      hinh_thuc: f.hinh_thuc, ly_do: f.ly_do, ghi_chu: f.ghi_chu,
    };
    const goi_luu = sua_duoc
      ? goi(`/api/ung-luong/${ung.id}`, { method: 'PATCH', body: than })
      : goi('/api/ung-luong', { method: 'POST', body: than });
    void hd.chay(() => goi_luu, sua_duoc ? 'Đã lưu.' : 'Đã tạo khoản ứng.')
      .then((ok) => { if (ok) khi_xong(); });
  };

  return (
    <HopThoai tieu_de={tieu_de} khi_dong={khi_dong} rong>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}
      {nv.loi !== null && <HopLoi loi={nv.loi} />}

      <div className={sua_duoc ? 'ul-form ul-form-mot-cot' : 'ul-form'}>
        {!sua_duoc && (
          <div className="ul-cot-nv">
            <label htmlFor="ul-tim">Nhân viên</label>
            <input id="ul-tim" placeholder="Tìm theo tên hoặc mã NV…" value={tim}
              onChange={(e) => dat_tim(e.target.value)} />
            <div className="ul-ds" role="listbox" aria-label="Danh sách nhân viên">
              {hien.map((x) => (
                <button type="button" key={x.id}
                  className={x.id === nhan_vien_id ? 'ul-ds-dong ul-ds-dong-chon' : 'ul-ds-dong'}
                  onClick={() => dat_nv(x.id)}
                  role="option" aria-selected={x.id === nhan_vien_id}>
                  <span className="ul-ds-ma">{x.ma_nv}</span>
                  <span className="ul-ds-ten">
                    {x.ho_ten}{x.phong_ban === null ? '' : ` · ${x.phong_ban}`}
                  </span>
                  {x.id === nhan_vien_id && (
                    <span className="ul-ds-chon" aria-hidden="true">✓</span>
                  )}
                </button>
              ))}
              {hien.length === 0 && (
                <div className="ul-ds-trong">Không tìm thấy nhân viên nào.</div>
              )}
            </div>
          </div>
        )}

        <div className="ul-cot-o">
          {sua_duoc && (
            <p className="mo-ta"><strong>{ung.ma_nv} — {ung.ho_ten}</strong></p>
          )}

          <label>Tháng lương áp dụng</label>
          <ChonThang gia_tri={f.thang} doi={(v) => dat_f({ ...f, thang: v })} />

          <label htmlFor="ul-f-tien">Số tiền ứng</label>
          <input id="ul-f-tien" type="number" min={0} step={1000} value={f.so_tien}
            onChange={dat('so_tien')} />

          <label htmlFor="ul-f-ngay">Ngày ứng (dd/mm/yyyy)</label>
          <input id="ul-f-ngay" placeholder="dd/mm/yyyy" value={f.ngay_ung}
            onChange={(e) => {
              dat_loi_ngay(null);
              dat_f({ ...f, ngay_ung: them_gach_ngay(e.target.value) });
            }} />
          {loi_ngay !== null && <div className="hop-thong-bao hop-loi">{loi_ngay}</div>}

          <label htmlFor="ul-f-ht">Hình thức</label>
          <Chon gia_tri={f.hinh_thuc}
            dat_gia_tri={(ma) => dat_f({ ...f, hinh_thuc: ma as 'tien_mat' | 'chuyen_khoan' })}
            cac_tuy_chon={[
              { ma: 'tien_mat', nhan: 'Tiền mặt' },
              { ma: 'chuyen_khoan', nhan: 'Chuyển khoản' },
            ]}
            nhan="Hình thức ứng" />

          <label htmlFor="ul-f-lydo">Lý do</label>
          <input id="ul-f-lydo" value={f.ly_do} onChange={dat('ly_do')} />

          <label htmlFor="ul-f-gc">Ghi chú</label>
          <input id="ul-f-gc" value={f.ghi_chu} onChange={dat('ghi_chu')} />
        </div>
      </div>

      <div className="hang-nut" style={{ marginTop: 16 }}>
        <button disabled={hd.dang_chay || !du_dieu_kien} onClick={luu}>
          {sua_duoc ? 'Lưu' : 'Tạo'}
        </button>
        <button className="nut-phang" disabled={hd.dang_chay} onClick={khi_dong}>Đóng</button>
      </div>
    </HopThoai>
  );
}
