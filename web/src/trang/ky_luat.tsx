// Tab Ky luat: gom vi pham theo thang & muc do -> ho so ky luat. Tong quan + danh sach + duyet.
//
// Che tai tai chinh o day la GIAM THUONG P3 (Dieu 104 BLLD, Dieu 14 Noi quy), KHONG phai phat
// tien (Dieu 127). Ky luat lao dong that (khien trach tro len) lam o tab Vi pham qua bien ban.
import { useState, type ReactNode } from 'react';
import { goi, la_admin } from '../api.ts';
import { LienKet } from '../dinh_tuyen.tsx';
import {
  DangTai, HopLoi, HopThoai, OSo, Trong, dung_hanh_dong, dung_nap, dung_nhap_chu, thang_nay,
} from '../thanh_phan.tsx';

const TEN_MUC_DO: Record<string, string> = {
  nhe: 'Nhẹ', trung: 'Trung bình', nang: 'Nặng', rat_nang: 'Rất nặng',
};
const LOP_MUC_DO: Record<string, string> = {
  nhe: 'nhan-canh-bao', trung: 'nhan-canh-bao', nang: 'nhan-xau', rat_nang: 'nhan-xau',
};

const NHAN_TT: Record<string, { ten: string; lop: string }> = {
  moi: { ten: 'Mới', lop: 'nhan-mo' },
  da_nhac: { ten: 'Đã nhắc nhở', lop: 'nhan-canh-bao' },
  cho_duyet: { ten: 'Chờ duyệt', lop: 'nhan-xau' },
  da_ap_dung: { ten: 'Đã áp dụng', lop: 'nhan-tot' },
  bac_bo: { ten: 'Đã bãi bỏ', lop: 'nhan-mo' },
  huy: { ten: 'Đã hủy', lop: 'nhan-mo' },
  mien: { ten: 'Miễn kỷ luật', lop: 'nhan-lanh' },
};

/** Trang thai admin duoc phep mien. */
const MIEN_DUOC = new Set(['moi', 'da_nhac', 'cho_duyet', 'da_ap_dung']);

interface ChiTiet { vi_pham_id: string; ma: string; ten: string; tien: number }
interface Dong {
  id: string;
  ma: string | null;
  nhan_vien_id: string;
  ma_nv: string;
  ho_ten: string;
  phong_ban: string | null;
  ky: string;
  muc_do: string;
  so_vi_pham: number;
  tong_tien: string;
  hinh_thuc: string;
  trang_thai: string;
  can_duyet: boolean;
  tu_dong: boolean;
  chi_tiet: ChiTiet[] | null;
  da_gui_email: boolean;
  ghi_chu: string | null;
  ly_do_bac_bo: string | null;
  ly_do_mien: string | null;
  so_khieu_nai: number;
}
interface TongQuan {
  ky: string;
  tong: { so_ho_so: number; so_nguoi: number; cho_duyet: number; tong_tien: string } | null;
  theo_muc_do: { muc_do: string; so: number; tien: string }[];
  top_nguoi: { nhan_vien_id: string; ma_nv: string; ho_ten: string; phong_ban: string | null;
              so_ho_so: number; so_vi_pham: number; tong_tien: string }[];
}

function tien(v: unknown): string {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString('vi-VN', { maximumFractionDigits: 0 }) : '0';
}

export function TrangKyLuat(): ReactNode {
  const [ky, dat_ky] = useState(thang_nay());
  const [muc_do, dat_muc_do] = useState('');
  const [loc, dat_loc] = useState('');
  const [dang, dat_dang] = useState<Dong | null>(null);
  const [chon, dat_chon] = useState<ReadonlySet<string>>(new Set());
  const quet = dung_hanh_dong();
  const mien = dung_hanh_dong();
  const nhap = dung_nhap_chu();
  const admin = la_admin();

  const tq = dung_nap<TongQuan>(`/api/ky-luat/tong-quan?ky=${ky}`, [ky]);
  const url = `/api/ky-luat?ky=${ky}${muc_do === '' ? '' : `&muc_do=${muc_do}`}`
    + `${loc === '' ? '' : `&trang_thai=${loc}`}`;
  const ds = dung_nap<Dong[]>(url, [ky, muc_do, loc]);

  const nap_lai = (): void => { tq.nap_lai(); ds.nap_lai(); dat_chon(new Set()); };
  const t = tq.du_lieu?.tong ?? null;

  // Chi mien duoc cac ho so dang o trang thai cho phep (bo qua cai da mien / bac bo / huy).
  const chon_mien_duoc = [...chon].filter((id) =>
    MIEN_DUOC.has(ds.du_lieu?.find((d) => d.id === id)?.trang_thai ?? ''));

  const dao_chon = (id: string): void => {
    const s = new Set(chon);
    if (s.has(id)) s.delete(id); else s.add(id);
    dat_chon(s);
  };

  const mien_hang_loat = async (ids: readonly string[]): Promise<void> => {
    if (ids.length === 0) return;
    const ly_do = await nhap.hoi({
      tieu_de: `Miễn kỷ luật ${ids.length} hồ sơ`,
      nhan: 'Lý do miễn (bắt buộc)',
      mo_ta: 'Miễn = gỡ khoản giảm thưởng khỏi lương, hồ sơ vẫn được lưu để theo dõi. '
        + 'Chỉ Admin thực hiện được.',
      chu_dong_y: 'Miễn kỷ luật',
    });
    if (ly_do === null) return;
    await mien.chay(
      () => goi('/api/ky-luat/mien', { method: 'POST', body: { ids, ly_do } }),
      `Đã miễn kỷ luật ${ids.length} hồ sơ.`,
    ).then((ok) => { if (ok) nap_lai(); });
  };

  return (
    <>
      <div className="dau-trang">
        <p className="mo-ta">
          Hệ thống gom vi phạm theo tháng và mức độ, tự nhắc nhở hoặc giảm thưởng P3 (Điều 14 Nội quy,
          Điều 104 BLLĐ — <strong>không phải phạt tiền</strong>). Khoản ≥ ngưỡng phải có người duyệt.
        </p>
        <button
          className="nut"
          disabled={quet.dang_chay}
          onClick={() => void quet.chay(
            () => goi('/api/ky-luat/quet', { method: 'POST', body: { thang: ky } }),
            'Đã quét & xử lý kỷ luật tháng này.',
          ).then((ok) => { if (ok) nap_lai(); })}
        >
          Quét &amp; xử lý tháng {ky}
        </button>
      </div>

      {quet.loi !== null && <HopLoi loi={quet.loi} />}

      {/* Tong quan */}
      <div className="luoi luoi-4">
        <OSo nhan="Hồ sơ kỷ luật" gia_tri={t?.so_ho_so ?? 0} phu={`${String(t?.so_nguoi ?? 0)} người`} />
        <OSo nhan="Chờ duyệt" gia_tri={t?.cho_duyet ?? 0} phu="giảm thưởng ≥ ngưỡng" mau="xau" />
        <OSo nhan="Đã áp dụng (giảm thưởng)" gia_tri={`${tien(t?.tong_tien)} đ`} mau="canh_bao" />
        <OSo nhan="Kỳ" gia_tri={ky} />
      </div>

      {/* Bo loc */}
      <div className="bo-loc">
        <div className="o-nhap">
          <label htmlFor="ky">Kỳ (tháng)</label>
          <input id="ky" type="month" value={ky} onChange={(e) => dat_ky(e.target.value)} />
        </div>
        <div className="o-nhap">
          <label htmlFor="md">Mức độ</label>
          <select id="md" value={muc_do} onChange={(e) => dat_muc_do(e.target.value)}>
            <option value="">Tất cả</option>
            <option value="nhe">Nhẹ</option>
            <option value="trung">Trung bình</option>
            <option value="nang">Nặng</option>
            <option value="rat_nang">Rất nặng</option>
          </select>
        </div>
        <div className="o-nhap">
          <label htmlFor="tt">Trạng thái</label>
          <select id="tt" value={loc} onChange={(e) => dat_loc(e.target.value)}>
            <option value="">Tất cả</option>
            <option value="cho_duyet">Chờ duyệt</option>
            <option value="da_ap_dung">Đã áp dụng</option>
            <option value="da_nhac">Đã nhắc nhở</option>
            <option value="mien">Miễn kỷ luật</option>
            <option value="bac_bo">Đã bãi bỏ</option>
          </select>
        </div>
      </div>

      {mien.loi !== null && <HopLoi loi={mien.loi} />}

      {admin && chon.size > 0 && (
        <div className="thanh-chon">
          <span>Đã chọn <strong>{chon.size}</strong> hồ sơ
            {chon_mien_duoc.length < chon.size
              && ` (miễn được ${String(chon_mien_duoc.length)})`}</span>
          <div className="hang-nut">
            <button className="nut nut-nho" disabled={mien.dang_chay || chon_mien_duoc.length === 0}
              onClick={() => void mien_hang_loat(chon_mien_duoc)}>
              Miễn kỷ luật hàng loạt
            </button>
            <button className="nut-phang nut-nho" onClick={() => dat_chon(new Set())}>Bỏ chọn</button>
          </div>
        </div>
      )}

      {ds.dang_tai ? <DangTai /> : ds.loi !== null ? <HopLoi loi={ds.loi} />
        : ds.du_lieu === null || ds.du_lieu.length === 0 ? (
          <Trong tieu_de="Chưa có hồ sơ kỷ luật"
            mo_ta="Bấm “Quét & xử lý” để gom vi phạm của kỳ này thành hồ sơ." />
        ) : (
          <div className="the the-mong">
            <div className="vo-bang">
              <table className="bang-neo-cot-dau">
                <thead>
                  <tr>
                    {admin && <th></th>}
                    <th>Mã</th><th>Mã NV</th><th>Họ tên</th><th>Phòng ban</th><th>Mức độ</th>
                    <th className="canh-phai">Vi phạm</th><th className="canh-phai">Giảm thưởng</th>
                    <th>Trạng thái</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {ds.du_lieu.map((d) => (
                    <tr key={d.id} className={d.so_khieu_nai > 0 ? 'dong-canh-bao' : undefined}>
                      {admin && (
                        <td>
                          <input type="checkbox" aria-label={`Chọn ${d.ma ?? d.ho_ten}`}
                            checked={chon.has(d.id)} disabled={!MIEN_DUOC.has(d.trang_thai)}
                            onChange={() => dao_chon(d.id)} />
                        </td>
                      )}
                      <td className="so mo-ma">{d.ma ?? '—'}</td>
                      <td className="so">{d.ma_nv}</td>
                      <td><LienKet den={`/nhan-vien/${d.nhan_vien_id}`}>{d.ho_ten}</LienKet></td>
                      <td>{d.phong_ban ?? '—'}</td>
                      <td className="khong-ngat">
                        <span className={LOP_MUC_DO[d.muc_do] ?? 'nhan-mo'}>
                          {TEN_MUC_DO[d.muc_do] ?? d.muc_do}
                        </span>
                      </td>
                      <td className="canh-phai so">{d.so_vi_pham}</td>
                      <td className="canh-phai so">{tien(d.tong_tien)}</td>
                      <td className="khong-ngat">
                        <span className={NHAN_TT[d.trang_thai]?.lop ?? 'nhan-mo'}>
                          {NHAN_TT[d.trang_thai]?.ten ?? d.trang_thai}
                          {d.tu_dong ? ' (tự động)' : ''}
                        </span>
                        {d.so_khieu_nai > 0 && (
                          <span className="nhan-khieu-nai" title="Có khiếu nại đang mở">
                            ● {d.so_khieu_nai} khiếu nại
                          </span>
                        )}
                      </td>
                      <td className="canh-phai">
                        <button className="nut nut-nho" onClick={() => dat_dang(d)}>Xem</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      {dang !== null && (
        <HopThoaiHoSo
          d={dang}
          admin={admin}
          khi_mien={mien_hang_loat}
          khi_dong={() => dat_dang(null)}
          khi_xong={() => { dat_dang(null); nap_lai(); }}
        />
      )}
      {nhap.hop_thoai}
    </>
  );
}

function HopThoaiHoSo(
  { d, admin, khi_mien, khi_dong, khi_xong }: {
    d: Dong; admin: boolean;
    khi_mien: (ids: readonly string[]) => void;
    khi_dong: () => void; khi_xong: () => void;
  },
): ReactNode {
  const [ly_do, dat_ly_do] = useState('');
  const hd = dung_hanh_dong();

  return (
    <HopThoai tieu_de={`Hồ sơ kỷ luật ${d.ma ?? ''} — ${d.ho_ten}`} khi_dong={khi_dong} rong>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}

      <div className="ho-so-chi-so">
        <div className="o-so">
          <div className="o-so-nhan">Kỳ</div>
          <div className="o-so-gia-tri">{d.ky}</div>
        </div>
        <div className="o-so">
          <div className="o-so-nhan">Mức độ</div>
          <div className="o-so-gia-tri" style={{ fontSize: 16 }}>{TEN_MUC_DO[d.muc_do] ?? d.muc_do}</div>
          <div className="o-so-phu">{d.so_vi_pham} vi phạm</div>
        </div>
        <div className="o-so">
          <div className="o-so-nhan">Giảm thưởng</div>
          <div className="o-so-gia-tri so">{tien(d.tong_tien)} đ</div>
          <div className="o-so-phu">{d.hinh_thuc === 'giam_thuong' ? 'giảm thưởng P3' : 'chỉ nhắc nhở'}</div>
        </div>
      </div>

      <h3>Các vi phạm gộp trong hồ sơ</h3>
      {d.chi_tiet !== null && d.chi_tiet.length > 0 ? (
        <div className="vo-bang">
          <table className="bang-gon">
            <thead>
              <tr><th>Mã</th><th>Loại vi phạm</th><th className="canh-phai">Giảm thưởng</th></tr>
            </thead>
            <tbody>
              {d.chi_tiet.map((c) => (
                <tr key={c.vi_pham_id}>
                  <td className="so">{c.ma}</td>
                  <td>{c.ten}</td>
                  <td className="canh-phai so">{tien(c.tien)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="mo-ta">Không có chi tiết.</p>}

      {d.trang_thai === 'da_ap_dung' && (
        <div className="hop-thong-bao hop-tin">
          Đã áp dụng giảm thưởng {tien(d.tong_tien)} đ{d.da_gui_email ? ' — đã gửi email báo nhân viên.' : '.'}
        </div>
      )}
      {d.trang_thai === 'bac_bo' && d.ly_do_bac_bo !== null && (
        <div className="hop-thong-bao">Đã bãi bỏ. Lý do: {d.ly_do_bac_bo}</div>
      )}
      {d.trang_thai === 'mien' && (
        <div className="hop-thong-bao hop-tin">
          Đã miễn kỷ luật — khoản giảm thưởng đã được gỡ khỏi lương.
          {d.ly_do_mien !== null && <> Lý do: {d.ly_do_mien}</>}
        </div>
      )}
      {d.so_khieu_nai > 0 && (
        <div className="hop-thong-bao hop-luu-y">
          Hồ sơ này đang có <strong>{d.so_khieu_nai}</strong> khiếu nại chưa xử lý.
          Xem &amp; xử lý tại tab <strong>Khiếu nại</strong>.
        </div>
      )}

      {admin && MIEN_DUOC.has(d.trang_thai) && (
        <>
          <h3>Miễn kỷ luật (Admin)</h3>
          <p className="mo-ta">
            Miễn = gỡ khoản giảm thưởng khỏi lương nhưng vẫn lưu hồ sơ để theo dõi. Khác bãi bỏ
            (bãi bỏ = quyết định sai/rút lại); miễn = công ty khoan hồng.
          </p>
          <div className="hang-nut">
            <button className="nut-lanh" onClick={() => { khi_dong(); khi_mien([d.id]); }}>
              Miễn kỷ luật hồ sơ này
            </button>
          </div>
        </>
      )}

      {(d.trang_thai === 'cho_duyet' || d.trang_thai === 'da_ap_dung') && (
        <>
          <h3>Quyết định</h3>
          {d.trang_thai === 'cho_duyet' && (
            <p className="mo-ta">
              Khoản giảm thưởng ≥ ngưỡng nên cần người có thẩm quyền duyệt mới áp vào lương.
            </p>
          )}
          <label htmlFor="lydo">Lý do (bắt buộc khi bãi bỏ)</label>
          <input id="lydo" value={ly_do} onChange={(e) => dat_ly_do(e.target.value)}
            placeholder="vd: đã có giải trình hợp lý" />
          <div className="hang-nut">
            {d.trang_thai === 'cho_duyet' && (
              <button
                disabled={hd.dang_chay}
                onClick={() => void hd.chay(
                  () => goi(`/api/ky-luat/${d.id}/duyet`, { method: 'POST', body: { ghi_chu: ly_do } }),
                  'Đã duyệt — giảm thưởng sẽ vào lương kỳ này.',
                ).then((ok) => { if (ok) khi_xong(); })}
              >
                Duyệt &amp; áp dụng
              </button>
            )}
            <button
              className="nut-phang"
              disabled={hd.dang_chay}
              onClick={() => void hd.chay(
                () => goi(`/api/ky-luat/${d.id}/bac-bo`, { method: 'POST', body: { ly_do } }),
                'Đã bãi bỏ hồ sơ.',
              ).then((ok) => { if (ok) khi_xong(); })}
            >
              Bãi bỏ
            </button>
          </div>
        </>
      )}

      <div className="hang-nut">
        <button className="nut-phang" onClick={khi_dong}>Đóng</button>
      </div>
    </HopThoai>
  );
}
