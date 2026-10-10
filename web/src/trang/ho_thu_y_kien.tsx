// Trang HOM THU Y KIEN (quan tri): noi tiep nhan TAT CA phan anh / yeu cau / gop y / thac mac
// cua nhan su, va ca y kien cho ban du thao van ban AI. Khac voi don tu khieu nai: day la kenh
// lang nghe + giai dap, hoi thoai hai chieu cho den khi nhan su DONG ho thu.
import { useEffect, useState, type ReactNode } from 'react';
import { goi, gui_tep, chi_xem_quan_tri } from '../api.ts';
import { lay_muc_tieu_bao, nghe_muc_tieu_bao } from '../dieu_huong_sau.ts';
import { LienKet } from '../dinh_tuyen.tsx';
import {
  AnhCoToken, DangTai, HopLoi, HopThoai, OKeoTep, ThreadKhieuNai, Trong, dung_hanh_dong,
  dung_nap, ngay_gio,
  type TinNhanKN,
} from '../thanh_phan.tsx';
import { dung_phan_trang } from '../phan_trang.tsx';
import { Chon, type TuyChonChon } from '../chon.tsx';
import { dung_chuoi, tra_hien_tai, type ChuoiKhoa } from '../chuoi/chi_muc.tsx';

const NHAN_LOAI: Record<string, string> = {
  du_thao: 'Ý kiến dự thảo',
  gop_y: 'Góp ý',
  phan_anh: 'Phản ánh',
  yeu_cau: 'Yêu cầu',
  thac_mac: 'Thắc mắc',
};

const NHAN_TT: Record<string, { ten: string; lop: string }> = {
  moi: { ten: 'Chờ xử lý', lop: 'nhan-xau' },
  dang_xem: { ten: 'Đã tiếp nhận', lop: 'nhan-canh-bao' },
  da_dong: { ten: 'Đã hoàn tất', lop: 'nhan-tot' },
};

interface Dong {
  id: string;
  ma: string | null;
  loai: string;
  tieu_de: string;
  trang_thai: string;
  tao_luc: string;
  dong_luc: string | null;
  nhap_ai_id: string | null;
  ma_van_ban: string | null;
  ma_nv: string;
  ho_ten: string;
  phong_ban: string | null;
  so_tra_loi: number;
}

interface ChiTiet extends Dong {
  noi_dung: string;
  tra_loi: TinNhanKN[];
  anh: { id: string; ten: string }[];
  van_ban: { ma: string; trang_thai: string } | null;
}

interface ThuDaGui {
  id: string;
  noi_dung: string;
  tao_luc: string;
  nguoi_gui: string;
  ho_thu_id: string;
  ma_ho_thu: string | null;
  tieu_de: string;
  loai: string;
  ma_nv: string;
  ho_ten: string;
  phong_ban: string | null;
  trang_thai: string;
}

interface VanBanGon {
  id: string;
  ma: string;
  trich_yeu: string;
  trang_thai: string;
}

/** Du thao DANG lay y kien ma nguoi dang nhap duoc gop y (api /toi). */
interface DuThaoGon {
  id: string;
  ma: string;
  loai: string;
  trich_yeu: string;
  han_lay_y_kien: string | null;
}

/** Du thao trong danh sach admin — kem so y kien de tab gop y cua nhan su hien thi. */
interface DuThaoAdminGon {
  id: string;
  ma: string;
  loai: string;
  trich_yeu: string;
  trang_thai: string;
  han_lay_y_kien: string | null;
  so_y_kien: number;
}

/** Mot y kien gui cho du thao (api admin /thong-bao/ai/:id/y-kien). */
interface YKienDuThao {
  id: string;
  ma: string | null;
  tieu_de: string;
  trang_thai: string;
  tao_luc: string;
  ma_nv: string;
  ho_ten: string;
  phong_ban: string | null;
  so_tra_loi: number;
}

/** Nhan loai van ban cua du thao (khong phai loai hom thu). */
const KHOA_LOAI_VB: Record<string, ChuoiKhoa> = {
  thong_bao: 'vai_loai_thong_bao',
  quyet_dinh: 'vai_loai_quyet_dinh',
  cong_van: 'vai_loai_cong_van',
};

export function TrangHoThuYKien({ chi_doc = false }: { chi_doc?: boolean }): ReactNode {
  const { tra } = dung_chuoi();
  const [tab, dat_tab] = useState<'den' | 'di' | 'gop_y'>(chi_doc ? 'gop_y' : 'den');
  const [loc_loai, dat_loc_loai] = useState('');
  const [loc_tt, dat_loc_tt] = useState('');
  const [loc_vb, dat_loc_vb] = useState('');
  const [dang, dat_dang] = useState<string | null>(() => lay_muc_tieu_bao('ho-thu-y-kien'));

  useEffect(() => nghe_muc_tieu_bao(() => {
    if (chi_doc) return;
    const id = lay_muc_tieu_bao('ho-thu-y-kien');
    if (id !== null) { dat_tab('den'); dat_dang(id); }
  }), [chi_doc]);

  const tham = new URLSearchParams();
  if (loc_loai !== '') tham.set('loai', loc_loai);
  if (loc_tt !== '') tham.set('trang_thai', loc_tt);
  if (loc_vb !== '') tham.set('nhap_ai_id', loc_vb);
  const hoi = tham.toString() === '' ? '' : `?${tham.toString()}`;
  const ds = dung_nap<Dong[]>(chi_doc ? '' : `/api/ho-thu-y-kien${hoi}`, [loc_loai, loc_tt, loc_vb]);
  const ds_vb = dung_nap<VanBanGon[]>(chi_doc ? '' : '/api/ho-thu-y-kien/danh-sach-van-ban');
  const tham_di = loc_loai === '' ? '' : `?loai=${loc_loai}`;
  const ds_di = dung_nap<ThuDaGui[]>(chi_doc ? '' : `/api/ho-thu-y-kien/thu-da-gui${tham_di}`, [loc_loai]);
  const ds_dt = dung_nap<DuThaoGon[]>('/api/toi/du-thao-dang-lay-y-kien');
  // Admin: danh sach van ban AI (kem so_y_kien) de tab gop y liet ke du thao dang mo.
  const ds_dt_admin = dung_nap<DuThaoAdminGon[]>(chi_doc ? '' : '/api/thong-bao/ai');
  const [xem_yk, dat_xem_yk] = useState<string | null>(null);

  const ds_dt_mo = chi_doc
    ? ds_dt
    : {
        du_lieu: (ds_dt_admin.du_lieu ?? []).filter((d) => d.trang_thai === 'dang_lay_y_kien'),
        dang_tai: ds_dt_admin.dang_tai,
        loi: ds_dt_admin.loi,
      };

  const { ds_xem, bo_phan_trang } = dung_phan_trang(ds.du_lieu ?? []);
  const { ds_xem: ds_di_xem, bo_phan_trang: bo_di } = dung_phan_trang(ds_di.du_lieu ?? []);

  return (
    <>
      <div className="dau-trang">
        <p className="mo-ta">
          {chi_doc
            ? tra('ht_gop_y_mo_ta')
            : 'Nơi tiếp nhận mọi phản ánh, yêu cầu, góp ý và thắc mắc của người lao động — giải đáp thắc mắc, lắng nghe góp ý để sớm có điều chỉnh phù hợp hơn. Ý kiến cho dự thảo văn bản cũng tập hợp tại đây. Hàng Chờ xử lý / Đã tiếp nhận nằm trên đầu.'}
        </p>
      </div>

      <div className="hang-tab">
        {!chi_doc && (
          <>
            <button className={tab === 'den' ? 'dang-chon' : ''} onClick={() => dat_tab('den')}>
              Hòm thư đến
            </button>
            <button className={tab === 'di' ? 'dang-chon' : ''} onClick={() => dat_tab('di')}>
              Thư đã gửi
            </button>
          </>
        )}
        <button className={tab === 'gop_y' ? 'dang-chon' : ''} onClick={() => dat_tab('gop_y')}>
          {tra('ht_gop_y_du_thao')}
        </button>
      </div>

      {tab === 'gop_y' && (
        <>
          {ds_dt_mo.dang_tai ? <DangTai /> : ds_dt_mo.loi !== null ? <HopLoi loi={ds_dt_mo.loi} />
            : ds_dt_mo.du_lieu === null || ds_dt_mo.du_lieu.length === 0 ? (
              <Trong tieu_de={tra('ht_gop_y_du_thao')} mo_ta={tra('ht_khong_co_du_thao')} />
            ) : (
              <div className="the the-mong">
                <table className="bang-gon" style={{ tableLayout: 'fixed', width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ width: 110 }}>{tra('vai_ma')}</th>
                      <th style={{ width: 120 }}>{tra('vai_loai_van_ban')}</th>
                      <th>{tra('vai_ve_viec')}</th>
                      <th style={{ width: 150 }}>{tra('ht_han_gop_y')}</th>
                      {!chi_doc && <th style={{ width: 72 }}>{tra('ht_so_y_kien')}</th>}
                      <th style={{ width: chi_doc ? 88 : 110 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {ds_dt_mo.du_lieu.map((d) => {
                      const khoa_loai = KHOA_LOAI_VB[d.loai];
                      return (
                      <tr key={d.id}>
                        <td className="khong-ngat">{d.ma}</td>
                        <td className="khong-ngat">
                          {khoa_loai !== undefined ? tra_hien_tai(khoa_loai) : d.loai}
                        </td>
                        <td title={d.trich_yeu}>
                          <span className="khong-ngat" style={{
                            display: 'block', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {d.trich_yeu !== '' ? d.trich_yeu : '—'}
                          </span>
                        </td>
                        <td className="khong-ngat">{d.han_lay_y_kien === null
                          ? '—' : ngay_gio(d.han_lay_y_kien)}</td>
                        {!chi_doc && (
                          <td className="canh-phai">{(d as DuThaoAdminGon).so_y_kien}</td>
                        )}
                        <td className="canh-phai">
                          {chi_doc ? (
                            <LienKet den={`/gop-y-du-thao?van_ban_id=${d.id}`} lop="nut nut-nho">
                              {tra('ht_gop_y_ngay')}
                            </LienKet>
                          ) : (
                            <button className="nut nut-nho" onClick={() => dat_xem_yk(d.id)}>
                              {tra('ht_xem_y_kien')}
                            </button>
                          )}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
        </>
      )}

      {tab === 'den' && (
        <>
          <div className="bo-loc">
            <div className="o-nhap">
              <label htmlFor="loai">Loại</label>
              <Chon gia_tri={loc_loai} dat_gia_tri={dat_loc_loai}
                cac_tuy_chon={Object.entries(NHAN_LOAI).map(([ma, nhan]): TuyChonChon => ({
                  ma, nhan,
                }))}
                rong="Tất cả" nhan="Lọc theo loại" />
            </div>
            <div className="o-nhap">
              <label htmlFor="tt">Trạng thái</label>
              <Chon gia_tri={loc_tt} dat_gia_tri={dat_loc_tt}
                cac_tuy_chon={Object.entries(NHAN_TT).map(([ma, t]): TuyChonChon => ({
                  ma, nhan: t.ten,
                }))}
                rong="Tất cả" nhan="Lọc theo trạng thái" />
            </div>
            <div className="o-nhap">
              <label htmlFor="van_ban">Mã văn bản</label>
              <Chon gia_tri={loc_vb} dat_gia_tri={dat_loc_vb}
                cac_tuy_chon={(ds_vb.du_lieu ?? []).map((v): TuyChonChon => ({
                  ma: v.id,
                  nhan: `${v.ma}${v.trich_yeu !== '' ? ` — ${v.trich_yeu}` : ''}`,
                }))}
                rong="Tất cả" nhan="Lọc theo mã văn bản" />
            </div>
          </div>

          {ds.dang_tai ? <DangTai /> : ds.loi !== null ? <HopLoi loi={ds.loi} />
            : ds.du_lieu === null || ds.du_lieu.length === 0 ? (
              <Trong tieu_de="Hòm thư chưa có ý kiến nào"
                mo_ta="Khi nhân viên gửi góp ý, phản ánh hoặc ý kiến dự thảo, chúng sẽ hiện ở đây." />
            ) : (
              <div className="the the-mong">
                <div className="vo-bang">
                  <table>
                    <thead>
                      <tr>
                        <th>Mã</th><th>Nhân viên</th><th>Phòng ban</th><th>Loại</th><th>Tiêu đề</th>
                        <th>Trao đổi</th><th>Ngày gửi</th><th>Trạng thái</th><th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {ds_xem.map((d) => (
                        <tr key={d.id}>
                          <td className="so mo-ma">{d.ma ?? '—'}</td>
                          <td>
                            {d.ho_ten}
                            <span className="mo-ma"> {d.ma_nv}</span>
                          </td>
                          <td>{d.phong_ban ?? '—'}</td>
                          <td className="khong-ngat">
                            {NHAN_LOAI[d.loai] ?? d.loai}
                            {d.ma_van_ban !== null && <span className="mo-ma"> · {d.ma_van_ban}</span>}
                          </td>
                          <td className="khong-ngat" style={{ maxWidth: 320 }}>{d.tieu_de}</td>
                          <td className="canh-phai">{d.so_tra_loi}</td>
                          <td className="khong-ngat mo-ma">{ngay_gio(d.tao_luc)}</td>
                          <td className="khong-ngat">
                            <span className={`nhan ${NHAN_TT[d.trang_thai]?.lop ?? 'nhan-mo'}`}>
                              {NHAN_TT[d.trang_thai]?.ten ?? d.trang_thai}
                            </span>
                          </td>
                          <td className="canh-phai">
                            <button className="nut nut-nho" onClick={() => dat_dang(d.id)}>Xem</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {bo_phan_trang}
                </div>
              </div>
            )}
        </>
      )}

      {tab === 'di' && (
        <>
          <div className="bo-loc">
            <div className="o-nhap">
              <label htmlFor="loai-di">Loại</label>
              <Chon gia_tri={loc_loai} dat_gia_tri={dat_loc_loai}
                cac_tuy_chon={Object.entries(NHAN_LOAI).map(([ma, nhan]): TuyChonChon => ({
                  ma, nhan,
                }))}
                rong="Tất cả" nhan="Lọc theo loại" />
            </div>
          </div>

          {ds_di.dang_tai ? <DangTai /> : ds_di.loi !== null ? <HopLoi loi={ds_di.loi} />
            : ds_di.du_lieu === null || ds_di.du_lieu.length === 0 ? (
              <Trong tieu_de="Chưa có thư đã gửi"
                mo_ta="Mọi phản hồi Nhân sự gửi cho người lao động sẽ hiện ở đây." />
            ) : (
              <div className="the the-mong">
                <div className="vo-bang">
                  <table>
                    <thead>
                      <tr>
                        <th>Ngày gửi</th><th>Người gửi</th><th>Nội dung</th>
                        <th>Hòm thư</th><th>Người nhận</th><th>Trạng thái</th><th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {ds_di_xem.map((t) => (
                        <tr key={t.id}>
                          <td className="khong-ngat mo-ma">{ngay_gio(t.tao_luc)}</td>
                          <td>{t.nguoi_gui}</td>
                          <td className="khong-ngat" style={{ maxWidth: 340 }}>{t.noi_dung}</td>
                          <td className="khong-ngat">
                            {t.ma_ho_thu ?? '—'}
                            <span className="mo-ma"> · {NHAN_LOAI[t.loai] ?? t.loai} · {t.tieu_de}</span>
                          </td>
                          <td>
                            {t.ho_ten}
                            <span className="mo-ma"> {t.ma_nv}</span>
                          </td>
                          <td className="khong-ngat">
                            <span className={`nhan ${NHAN_TT[t.trang_thai]?.lop ?? 'nhan-mo'}`}>
                              {NHAN_TT[t.trang_thai]?.ten ?? t.trang_thai}
                            </span>
                          </td>
                          <td className="canh-phai">
                            <button className="nut nut-nho" onClick={() => dat_dang(t.ho_thu_id)}>
                              Xem
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {bo_di}
                </div>
              </div>
            )}
        </>
      )}

      {dang !== null && (
        <HopThoaiChiTiet id={dang} khi_dong={() => dat_dang(null)} khi_xong={ds.nap_lai} />
      )}

      {xem_yk !== null && (
        <HopThoaiYienDuThao id={xem_yk} khi_dong={() => dat_xem_yk(null)}
          khi_xem={(ho_thu_id) => { dat_dang(ho_thu_id); }} />
      )}
    </>
  );
}

/** Hop thoai xem DANH SACH y kien gui cho mot du thao (admin) — moi dong mo duoc ho thu. */
function HopThoaiYienDuThao(
  { id, khi_dong, khi_xem }: { id: string; khi_dong: () => void; khi_xem: (ho_thu_id: string) => void },
): ReactNode {
  const chi = dung_nap<YKienDuThao[]>(`/api/thong-bao/ai/${id}/y-kien`, [id]);
  const { tra } = dung_chuoi();
  return (
    <HopThoai tieu_de={tra('ht_gop_y_du_thao')} khi_dong={khi_dong} rong>
      {chi.dang_tai ? <DangTai /> : chi.loi !== null ? <HopLoi loi={chi.loi} />
        : chi.du_lieu === null || chi.du_lieu.length === 0 ? (
          <p className="mo-ta">{tra('ht_chua_co_y_kien')}</p>
        ) : (
          <div className="vo-bang">
            <table>
              <thead>
                <tr>
                  <th>{tra('ht_nhan_vien')}</th><th>{tra('ht_phong_ban')}</th>
                  <th>{tra('ht_ngay_gui')}</th><th>{tra('vai_trang_thai')}</th>
                  <th>{tra('ht_trao_doi')}</th><th></th>
                </tr>
              </thead>
              <tbody>
                {chi.du_lieu.map((y) => (
                  <tr key={y.id}>
                    <td>{y.ho_ten}<span className="mo-ma"> {y.ma_nv}</span></td>
                    <td>{y.phong_ban ?? '—'}</td>
                    <td className="khong-ngat mo-ma">{ngay_gio(y.tao_luc)}</td>
                    <td className="khong-ngat">
                      <span className={`nhan ${NHAN_TT[y.trang_thai]?.lop ?? 'nhan-mo'}`}>
                        {NHAN_TT[y.trang_thai]?.ten ?? y.trang_thai}
                      </span>
                    </td>
                    <td className="canh-phai">{y.so_tra_loi}</td>
                    <td className="canh-phai">
                      <button className="nut nut-nho" onClick={() => { khi_dong(); khi_xem(y.id); }}>
                        {tra('ht_xem')}
                      </button>
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

function HopThoaiChiTiet(
  { id, khi_dong, khi_xong }: { id: string; khi_dong: () => void; khi_xong: () => void },
): ReactNode {
  const chi = dung_nap<ChiTiet>(`/api/ho-thu-y-kien/${id}`, [id]);
  const hd = dung_hanh_dong();
  const [tra_loi_nd, dat_tra_loi_nd] = useState('');
  const [da_tiep_nhan, dat_da_tiep_nhan] = useState<string | null>(null);
  const chi_xem = chi_xem_quan_tri();

  // Bam "Xem" mo ho thu 'moi' lan dau -> tiep nhan: chuyen thanh Da tiep nhan + email cho
  // nguoi lao dong. Chi chay mot lan moi ho thu; che do chi xem thi khong tiep nhan.
  // Neu API loi thi giu co da gui (khong goi lai lien tuc) — mo lai hop thoai se thu lai.
  useEffect(() => {
    const d = chi.du_lieu;
    if (d === null || d.trang_thai !== 'moi' || chi_xem || da_tiep_nhan === d.id) return;
    dat_da_tiep_nhan(d.id);
    void goi(`/api/ho-thu-y-kien/${d.id}/tiep-nhan`, { method: 'POST' })
      .then(() => { khi_xong(); chi.nap_lai(); })
      .catch(() => {});
  }, [chi.du_lieu, chi_xem, da_tiep_nhan, khi_xong]);

  if (chi.dang_tai) return <HopThoai tieu_de="Hòm thư ý kiến" khi_dong={khi_dong}><DangTai /></HopThoai>;
  const d = chi.du_lieu;
  if (chi.loi !== null || d === null) {
    return <HopThoai tieu_de="Hòm thư ý kiến" khi_dong={khi_dong}>
      <HopLoi loi={chi.loi ?? 'Không tải được chi tiết.'} />
    </HopThoai>;
  }
  const dong = d.trang_thai === 'da_dong';

  const gui = (): void => {
    void hd.chay(
      () => goi(`/api/ho-thu-y-kien/${d.id}/tra-loi`, { method: 'POST', body: { noi_dung: tra_loi_nd } }),
      'Đã gửi trả lời.',
    ).then((ok) => { if (ok) { dat_tra_loi_nd(''); khi_xong(); khi_dong(); } });
  };
  const dong_lai = (): void => {
    // Noi dung da nhap (neu co) chinh la KET LUAN xu ly gui cho nguoi lao dong trong email
    // hoan tat; de trong thi he thong lay tra loi cuoi cua Nhan su lam ket luan.
    void hd.chay(
      () => goi(`/api/ho-thu-y-kien/${d.id}/dong`,
        { method: 'POST', body: { ket_luan: tra_loi_nd.trim() } }),
      'Đã hoàn tất — người lao động nhận email kèm kết luận xử lý.',
    ).then((ok) => { if (ok) { khi_xong(); khi_dong(); } });
  };

  // Them anh minh chung vao ho thu DANG MO (nhan su). Gui LAN LUOT tung anh — moi anh mot
  // ban ghi tep, khong gioi han so luong.
  const them_anh = (files: FileList | null): void => {
    const ds = Array.from(files ?? []);
    if (ds.length === 0) return;
    void hd.chay(async () => {
      for (const f of ds) {
        const fd = new FormData();
        fd.append('anh', f);
        await gui_tep(`/api/ho-thu-y-kien/${d.id}/anh`, fd);
      }
      return true;
    }, `Đã thêm ${ds.length} ảnh.`).then((ok) => { if (ok) { khi_xong(); chi.nap_lai(); } });
  };

  return (
    <HopThoai tieu_de={`Hòm thư ${d.ma ?? ''} — ${d.ho_ten}`} khi_dong={khi_dong} rong>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}

      <div className="ho-so-chi-so">
        <div className="o-so">
          <div className="o-so-nhan">Loại</div>
          <div className="o-so-gia-tri" style={{ fontSize: 15 }}>
            {NHAN_LOAI[d.loai] ?? d.loai}
          </div>
          <div className="o-so-phu">
            {d.ma_nv}{d.phong_ban !== null ? ` · ${d.phong_ban}` : ''}
            {d.van_ban !== null ? ` · văn bản ${d.van_ban.ma}` : ''}
          </div>
        </div>
        <div className="o-so">
          <div className="o-so-nhan">Trạng thái</div>
          <div className="o-so-gia-tri" style={{ fontSize: 15 }}>
            <span className={`nhan ${NHAN_TT[d.trang_thai]?.lop ?? 'nhan-mo'}`}>
              {NHAN_TT[d.trang_thai]?.ten ?? d.trang_thai}
            </span>
          </div>
        </div>
      </div>

      <h3>{d.tieu_de}</h3>
      <ThreadKhieuNai noi_dung={d.noi_dung} tao_luc={d.tao_luc} tra_loi={d.tra_loi} la_admin />

      {d.anh.length > 0 && (
        <>
          <h3>Ảnh đính kèm</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            {d.anh.map((a) => (
              <AnhCoToken key={a.id} duong_dan={`/api/ho-thu-y-kien/anh/${a.id}`} alt={a.ten}
                cao={120} />
            ))}
          </div>
        </>
      )}

      {!dong && !chi_xem && (
        <div style={{ marginTop: 4, marginBottom: 8 }}>
          <textarea value={tra_loi_nd} onChange={(e) => dat_tra_loi_nd(e.target.value)} rows={2}
            placeholder="Trả lời / nhập kết luận xử lý (nội dung nhập sẽ gửi kèm khi đóng)…" />
          <div style={{ marginTop: 6 }}>
            <label className="mo-ta" style={{ display: 'block', marginBottom: 2 }}>
              Thêm ảnh đính kèm (có thể chọn nhiều):
            </label>
            <OKeoTep
              ma={`htyk-anh-${d.id}`}
              accept="image/*"
              nhieu
              vo_hieu={hd.dang_chay}
              gui_ngay
              khi_nhan={(ds) => them_anh(ds)}
            />
          </div>
          <div className="hang-nut" style={{ marginTop: 6 }}>
            <button className="nut-phang" disabled={hd.dang_chay || tra_loi_nd.trim().length < 1}
              onClick={gui}>Gửi trả lời</button>
            <button disabled={hd.dang_chay} onClick={dong_lai}>Kết luận & đóng hòm thư</button>
          </div>
        </div>
      )}

      {dong && (
        <div className="hop-thong-bao hop-tot">
          Đã hoàn tất{d.dong_luc !== null ? ` · đóng lúc ${ngay_gio(d.dong_luc)}` : ''}.
        </div>
      )}
      {chi_xem && (
        <div className="hop-thong-bao hop-tin">
          Bạn đang ở chế độ <strong>chỉ xem</strong>. Việc trả lời do Nhân sự / Admin thực hiện.
        </div>
      )}
    </HopThoai>
  );
}
