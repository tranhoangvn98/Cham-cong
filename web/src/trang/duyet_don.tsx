import { useEffect, useState, type ReactNode } from 'react';
import { goi, tai_anh } from '../api.ts';
import {
  DangTai, HopLoi, HopTot, HopThoai, NhanDon, TEN_LOAI_NGHI, Trong,
  dung_hanh_dong, dung_nap, gio_ngan, ngay_gio, ngay_viet,
} from '../thanh_phan.tsx';

type Tab = 'nghi_phep' | 'giai_trinh' | 'quet_dien_thoai' | 'don_khac';

/** Bon loai don dung chung bang `don_tu`. Danh muc lay TU MAY CHU, khong gõ tay lại. */
interface LoaiDon {
  ma: string;
  ten: string;
  nhan_tu_ngay: string;
  co_khoang_ngay: boolean;
}

interface DonKhac {
  id: string;
  ma_nv: string;
  ho_ten: string;
  phong_ban: string | null;
  loai: string;
  tu_ngay: string;
  den_ngay: string | null;
  gio_bat_dau: string | null;
  gio_ket_thuc: string | null;
  noi_den: string | null;
  doi_voi_ten: string | null;
  ca_hien_tai_ten: string | null;
  ca_moi_ten: string | null;
  ly_do: string | null;
  trang_thai: string;
  ghi_chu_duyet: string | null;
  tao_luc: string;
  nguoi_duyet: string | null;
}

interface DonNghiPhep {
  id: string;
  ma_nv: string;
  ho_ten: string;
  phong_ban: string | null;
  loai: string;
  tu_ngay: string;
  den_ngay: string;
  nua_ngay: boolean;
  ly_do: string | null;
  trang_thai: string;
  ghi_chu_duyet: string | null;
  tao_luc: string;
  nguoi_duyet: string | null;
}

interface DonGiaiTrinh {
  id: string;
  ma_nv: string;
  ho_ten: string;
  ngay: string;
  gio_vao_de_xuat: string | null;
  gio_ra_de_xuat: string | null;
  ly_do: string;
  trang_thai: string;
  tao_luc: string;
  gio_vao_thuc: string | null;
  gio_ra_thuc: string | null;
  trang_thai_cong: string | null;
}

interface QuetDienThoai {
  id: string;
  ma_nv: string;
  ho_ten: string;
  thoi_diem: string;
  trang_thai: number;
  vi_do: number | null;
  kinh_do: number | null;
  do_chinh_xac_m: number | null;
  khoang_cach_m: number | null;
  dia_diem: string | null;
  ghi_chu: string | null;
}

export function TrangDuyetDon(): ReactNode {
  const [tab, dat_tab] = useState<Tab>('nghi_phep');
  const [chi_cho_duyet, dat_chi_cho_duyet] = useState(true);
  const hd = dung_hanh_dong();

  const loc = chi_cho_duyet ? '?trang_thai=cho_duyet' : '';
  const nghi = dung_nap<DonNghiPhep[]>(`/api/duyet/nghi-phep${loc}`);
  const giai = dung_nap<DonGiaiTrinh[]>(`/api/duyet/giai-trinh${loc}`);
  const quet = dung_nap<QuetDienThoai[]>('/api/duyet/quet-dien-thoai');
  const khac = dung_nap<{ danh_sach: DonKhac[] }>(
    `/api/duyet/don?trang_thai=${chi_cho_duyet ? 'cho_duyet' : 'da_duyet'}`);
  const loai_don = dung_nap<{ danh_sach: LoaiDon[] }>('/api/toi/don/loai');
  const dem_khac = dung_nap<Record<string, number>>('/api/duyet/don/dem');

  const quyet = async (
    nhom: 'nghi-phep' | 'giai-trinh' | 'quet-dien-thoai' | 'don',
    id: string,
    quyet_dinh: 'da_duyet' | 'tu_choi',
    ghi_chu?: string,
  ): Promise<void> => {
    await hd.chay(
      () => goi(`/api/duyet/${nhom}/${id}/quyet`, {
        method: 'POST',
        body: { quyet_dinh, ghi_chu: ghi_chu ?? null },
      }),
      quyet_dinh === 'da_duyet'
        ? 'Đã duyệt. Bảng công của ngày liên quan đã được tính lại.'
        : 'Đã từ chối.',
    );
    nghi.nap_lai();
    giai.nap_lai();
    quet.nap_lai();
    khac.nap_lai();
    dem_khac.nap_lai();
  };

  const dem = (n: number): ReactNode => (n > 0 ? <span className="dem-tab">{n}</span> : null);
  const so_nghi_cho = (nghi.du_lieu ?? []).filter((d) => d.trang_thai === 'cho_duyet').length;
  const so_giai_cho = (giai.du_lieu ?? []).filter((d) => d.trang_thai === 'cho_duyet').length;

  return (
    <>
      <div className="dau-trang">
        <div>
          <p className="mo-ta">
            Duyệt xong hệ thống tự tính lại bảng công của những ngày liên quan.
          </p>
        </div>
        <div className="o-nhap-ngang" style={{ marginBottom: 0 }}>
          <input id="ccd" type="checkbox" checked={chi_cho_duyet}
            onChange={(e) => dat_chi_cho_duyet(e.target.checked)} />
          <label htmlFor="ccd">Chỉ đơn chờ duyệt</label>
        </div>
      </div>

      <HopLoi loi={hd.loi} />
      <HopTot chu={hd.tot} />

      <div className="hang-tab">
        <button className={tab === 'nghi_phep' ? 'dang-chon' : ''} onClick={() => dat_tab('nghi_phep')}>
          Nghỉ phép {dem(so_nghi_cho)}
        </button>
        <button className={tab === 'giai_trinh' ? 'dang-chon' : ''} onClick={() => dat_tab('giai_trinh')}>
          Giải trình quên quẹt {dem(so_giai_cho)}
        </button>
        <button className={tab === 'quet_dien_thoai' ? 'dang-chon' : ''}
          onClick={() => dat_tab('quet_dien_thoai')}>
          Chấm công điện thoại {dem((quet.du_lieu ?? []).length)}
        </button>
        <button className={tab === 'don_khac' ? 'dang-chon' : ''} onClick={() => dat_tab('don_khac')}>
          Làm thêm · Đổi ca · Công tác · Thôi việc{' '}
          {dem(Object.values(dem_khac.du_lieu ?? {}).reduce((a, b) => a + b, 0))}
        </button>
      </div>

      {tab === 'don_khac' && (
        <BangDonKhac
          nap={khac}
          loai_don={loai_don.du_lieu?.danh_sach ?? []}
          dang_chay={hd.dang_chay}
          quyet={(id, qd, gc) => quyet('don', id, qd, gc)}
        />
      )}

      {tab === 'nghi_phep' && (
        <BangNghiPhep kq={nghi} quyet={quyet} dang_chay={hd.dang_chay} />
      )}
      {tab === 'giai_trinh' && (
        <BangGiaiTrinh kq={giai} quyet={quyet} dang_chay={hd.dang_chay} />
      )}
      {tab === 'quet_dien_thoai' && (
        <BangQuetDienThoai kq={quet} quyet={quyet} dang_chay={hd.dang_chay} />
      )}
    </>
  );
}

type HamQuyet = (
  nhom: 'nghi-phep' | 'giai-trinh' | 'quet-dien-thoai',
  id: string,
  quyet_dinh: 'da_duyet' | 'tu_choi',
  ghi_chu?: string,
) => Promise<void>;

interface BangProps<T> {
  kq: { du_lieu: T[] | null; dang_tai: boolean; loi: unknown };
  quyet: HamQuyet;
  dang_chay: boolean;
}

function NutQuyet(
  { nhom, id, quyet, dang_chay }:
  { nhom: 'nghi-phep' | 'giai-trinh' | 'quet-dien-thoai'; id: string; quyet: HamQuyet; dang_chay: boolean },
): ReactNode {
  const [dang_tu_choi, dat_dang_tu_choi] = useState(false);
  const [ly_do, dat_ly_do] = useState('');

  return (
    <>
      <div className="hang-nut">
        <button className="nut-nho nut-chinh" disabled={dang_chay}
          onClick={() => quyet(nhom, id, 'da_duyet')}>
          Duyệt
        </button>
        <button className="nut-nho" disabled={dang_chay} onClick={() => dat_dang_tu_choi(true)}>
          Từ chối
        </button>
      </div>

      {dang_tu_choi && (
        <HopThoai tieu_de="Từ chối đơn" khi_dong={() => dat_dang_tu_choi(false)}>
          <div className="o-nhap">
            <label htmlFor="ld">Lý do từ chối</label>
            <textarea id="ld" value={ly_do} onChange={(e) => dat_ly_do(e.target.value)} autoFocus
              placeholder="Nhân viên sẽ thấy nội dung này trên app." />
          </div>
          <div className="hang-nut">
            <button className="nut-nguy" disabled={dang_chay}
              onClick={() => {
                void quyet(nhom, id, 'tu_choi', ly_do.trim() === '' ? undefined : ly_do.trim());
                dat_dang_tu_choi(false);
              }}>
              Từ chối đơn
            </button>
            <button onClick={() => dat_dang_tu_choi(false)}>Hủy</button>
          </div>
        </HopThoai>
      )}
    </>
  );
}

function BangNghiPhep({ kq, quyet, dang_chay }: BangProps<DonNghiPhep>): ReactNode {
  if (kq.dang_tai) return <DangTai />;
  if (kq.loi !== null) return <HopLoi loi={kq.loi} />;
  const ds = kq.du_lieu ?? [];
  if (ds.length === 0) return <div className="the"><Trong tieu_de="Không có đơn nghỉ phép nào" /></div>;

  return (
    <div className="the the-mong">
      <div className="vo-bang">
        <table>
          <thead>
            <tr>
              <th>Nhân viên</th>
              <th>Loại</th>
              <th>Từ ngày</th>
              <th>Đến ngày</th>
              <th>Lý do</th>
              <th>Gửi lúc</th>
              <th>Trạng thái</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {ds.map((d) => (
              <tr key={d.id}>
                <td>
                  {d.ho_ten}
                  <div className="o-so-phu">{d.ma_nv}{d.phong_ban === null ? '' : ` · ${d.phong_ban}`}</div>
                </td>
                <td className="khong-ngat">
                  {TEN_LOAI_NGHI[d.loai] ?? d.loai}
                  {d.nua_ngay && <span className="nhan nhan-mo" style={{ marginLeft: 4 }}>½ ngày</span>}
                </td>
                <td className="khong-ngat">{ngay_viet(d.tu_ngay)}</td>
                <td className="khong-ngat">{ngay_viet(d.den_ngay)}</td>
                <td style={{ maxWidth: 220, fontSize: 12.5 }}>{d.ly_do ?? '—'}</td>
                <td className="khong-ngat" style={{ fontSize: 12 }}>{ngay_gio(d.tao_luc)}</td>
                <td>
                  <NhanDon trang_thai={d.trang_thai} />
                  {d.ghi_chu_duyet !== null && (
                    <div className="o-so-phu" style={{ maxWidth: 160 }}>{d.ghi_chu_duyet}</div>
                  )}
                </td>
                <td>
                  {d.trang_thai === 'cho_duyet' && (
                    <NutQuyet nhom="nghi-phep" id={d.id} quyet={quyet} dang_chay={dang_chay} />
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

function BangGiaiTrinh({ kq, quyet, dang_chay }: BangProps<DonGiaiTrinh>): ReactNode {
  if (kq.dang_tai) return <DangTai />;
  if (kq.loi !== null) return <HopLoi loi={kq.loi} />;
  const ds = kq.du_lieu ?? [];
  if (ds.length === 0) {
    return <div className="the"><Trong tieu_de="Không có đơn giải trình nào" /></div>;
  }

  return (
    <div className="the the-mong">
      <div className="vo-bang">
        <table>
          <thead>
            <tr>
              <th>Nhân viên</th>
              <th>Ngày</th>
              <th>Máy ghi được</th>
              <th>Nhân viên đề xuất</th>
              <th>Lý do</th>
              <th>Trạng thái</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {ds.map((d) => (
              <tr key={d.id}>
                <td>
                  {d.ho_ten}
                  <div className="o-so-phu">{d.ma_nv}</div>
                </td>
                <td className="khong-ngat">{ngay_viet(d.ngay)}</td>
                <td className="khong-ngat so" style={{ fontSize: 12.5 }}>
                  {gio_ngan(d.gio_vao_thuc)} → {gio_ngan(d.gio_ra_thuc)}
                </td>
                <td className="khong-ngat so" style={{ fontSize: 12.5, fontWeight: 600 }}>
                  {d.gio_vao_de_xuat === null ? '—' : d.gio_vao_de_xuat.slice(0, 5)}
                  {' → '}
                  {d.gio_ra_de_xuat === null ? '—' : d.gio_ra_de_xuat.slice(0, 5)}
                </td>
                <td style={{ maxWidth: 240, fontSize: 12.5 }}>{d.ly_do}</td>
                <td><NhanDon trang_thai={d.trang_thai} /></td>
                <td>
                  {d.trang_thai === 'cho_duyet' && (
                    <NutQuyet nhom="giai-trinh" id={d.id} quyet={quyet} dang_chay={dang_chay} />
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

function BangQuetDienThoai({ kq, quyet, dang_chay }: BangProps<QuetDienThoai>): ReactNode {
  if (kq.dang_tai) return <DangTai />;
  if (kq.loi !== null) return <HopLoi loi={kq.loi} />;
  const ds = kq.du_lieu ?? [];
  if (ds.length === 0) {
    return (
      <div className="the">
        <Trong
          tieu_de="Không có lần chấm công nào chờ duyệt"
          mo_ta="Chấm công trong phạm vi địa điểm đã khai được tính ngay, không cần duyệt."
        />
      </div>
    );
  }

  return (
    <>
      <div className="hop-thong-bao hop-luu-y">
        Những lần chấm công này ở <strong>ngoài phạm vi</strong> các địa điểm đã khai báo. Xem ảnh
        selfie và khoảng cách rồi quyết định — chỉ khi duyệt thì công mới được tính.
      </div>
      <div className="the the-mong">
        <div className="vo-bang">
          <table>
            <thead>
              <tr>
                <th>Ảnh</th>
                <th>Nhân viên</th>
                <th>Thời điểm</th>
                <th>Vào/Ra</th>
                <th>Vị trí</th>
                <th>Ghi chú</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {ds.map((d) => (
                <tr key={d.id}>
                  <td><AnhSelfie id={d.id} /></td>
                  <td>
                    {d.ho_ten}
                    <div className="o-so-phu">{d.ma_nv}</div>
                  </td>
                  <td className="khong-ngat">{ngay_gio(d.thoi_diem)}</td>
                  <td>
                    <span className={`nhan ${Number(d.trang_thai) === 0 ? 'nhan-tot' : 'nhan-lanh'}`}>
                      {Number(d.trang_thai) === 0 ? 'Vào' : 'Ra'}
                    </span>
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {d.khoang_cach_m === null ? (
                      'Không đối chiếu được'
                    ) : (
                      <>
                        Cách <strong style={{ color: 'var(--canh-bao)' }}>
                          {Number(d.khoang_cach_m).toLocaleString('vi-VN')} m
                        </strong>
                        {d.dia_diem === null ? '' : ` từ ${d.dia_diem}`}
                      </>
                    )}
                    {d.vi_do !== null && (
                      <div>
                        <a
                          href={`https://www.google.com/maps?q=${d.vi_do},${d.kinh_do}`}
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          Xem trên bản đồ
                        </a>
                        {d.do_chinh_xac_m !== null && (
                          <span className="o-so-phu"> · GPS ±{Math.round(Number(d.do_chinh_xac_m))}m</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td style={{ maxWidth: 180, fontSize: 12 }}>{d.ghi_chu ?? '—'}</td>
                  <td>
                    <NutQuyet nhom="quet-dien-thoai" id={d.id} quyet={quyet} dang_chay={dang_chay} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/** Anh selfie phai tai qua fetch co token — the <img> khong gui duoc header. */
function AnhSelfie({ id }: { id: string }): ReactNode {
  const [url, dat_url] = useState<string | null>(null);
  const [loi, dat_loi] = useState(false);

  useEffect(() => {
    let con_dung = true;
    let da_tao: string | null = null;
    tai_anh(id)
      .then((u) => {
        if (con_dung) {
          da_tao = u;
          dat_url(u);
        } else {
          URL.revokeObjectURL(u);
        }
      })
      .catch(() => {
        if (con_dung) dat_loi(true);
      });
    return () => {
      con_dung = false;
      if (da_tao !== null) URL.revokeObjectURL(da_tao);
    };
  }, [id]);

  if (loi) return <span className="o-so-phu">không tải được</span>;
  if (url === null) return <span className="o-so-phu">…</span>;
  return (
    <a href={url} target="_blank" rel="noreferrer noopener">
      <img src={url} alt="Ảnh chấm công" width={52} height={52}
        style={{ objectFit: 'cover', borderRadius: 6, display: 'block' }} />
    </a>
  );
}


/**
 * Bang cho bon loai don dung chung bang `don_tu`.
 *
 * MOT bang cho ca bon thay vi bon tab. Ly do: nguoi duyet mo trang nay de xu ly nhung viec dang
 * cho, khong phai de xem tung loai — bon tab bat ho bam qua ca bon moi biet con gi. Cot "Loại"
 * va bo loc theo loai lo ra du thong tin.
 *
 * Danh muc loai lay TU MAY CHU (`/api/toi/don/loai`). Go tay lai o day la mot cho de lech: them
 * loai thu nam ben may chu thi trang nay hien "lam_them" hoac bo trong ten.
 */
function BangDonKhac({ nap, loai_don, dang_chay, quyet }: {
  nap: { du_lieu: { danh_sach: DonKhac[] } | null; dang_tai: boolean; loi: unknown };
  loai_don: LoaiDon[];
  dang_chay: boolean;
  quyet: (id: string, qd: 'da_duyet' | 'tu_choi', ghi_chu?: string) => void;
}): ReactNode {
  const [loc_loai, dat_loc_loai] = useState('');
  const [canh_bao, dat_canh_bao] = useState<Record<string, string[]>>({});

  const ten_loai = (ma: string): string => loai_don.find((l) => l.ma === ma)?.ten ?? ma;

  // Canh bao phap ly nap RIENG cho tung don khi mo trang: chung can truy van CSDL (tong OT
  // thang, loai hop dong) nen khong nam trong danh sach.
  const ds = nap.du_lieu?.danh_sach ?? [];
  useEffect(() => {
    let huy = false;
    void (async () => {
      const ra: Record<string, string[]> = {};
      for (const d of ds.filter((x) => x.trang_thai === 'cho_duyet').slice(0, 30)) {
        try {
          const r = await goi<{ canh_bao: string[] }>(`/api/duyet/don/${d.id}/canh-bao`);
          if ((r.canh_bao ?? []).length > 0) ra[d.id] = r.canh_bao;
        } catch { /* khong co canh bao thi thoi, khong lam do ca trang */ }
      }
      if (!huy) dat_canh_bao(ra);
    })();
    return () => { huy = true; };
  }, [ds.map((d) => d.id).join(',')]);

  if (nap.dang_tai) return <DangTai />;
  if (nap.loi !== null) return <HopLoi loi={nap.loi} />;

  const hien = loc_loai === '' ? ds : ds.filter((d) => d.loai === loc_loai);
  if (hien.length === 0) return <Trong tieu_de="Không có đơn nào." />;

  /** Cac o rieng cua tung loai, gop thanh mot cot de bang khong co 8 cot trong. */
  const chi_tiet = (d: DonKhac): ReactNode => {
    if (d.loai === 'lam_them') {
      return <>{(d.gio_bat_dau ?? '').slice(0, 5)} – {(d.gio_ket_thuc ?? '').slice(0, 5)}</>;
    }
    if (d.loai === 'doi_ca') {
      return <>{d.ca_hien_tai_ten ?? '—'} → <strong>{d.ca_moi_ten ?? '—'}</strong>
        {d.doi_voi_ten !== null && <><br />đổi với {d.doi_voi_ten}</>}</>;
    }
    if (d.loai === 'cong_tac') return <>{d.noi_den ?? '—'}</>;
    return <span className="mo-ta">—</span>;
  };

  return (
    <>
      <div className="hang-nut">
        <button className={loc_loai === '' ? 'nut-chinh' : undefined} onClick={() => dat_loc_loai('')}>
          Tất cả
        </button>
        {loai_don.map((l) => (
          <button
            key={l.ma}
            className={loc_loai === l.ma ? 'nut-chinh' : undefined}
            onClick={() => dat_loc_loai(l.ma)}
          >
            {l.ten.replace(/^Đơn xin /, '')}
          </button>
        ))}
      </div>

      <div className="vo-bang">
        <table>
          <thead>
            <tr>
              <th>Nhân viên</th><th>Loại</th><th>Ngày</th><th>Chi tiết</th><th>Lý do</th>
              <th>Trạng thái</th><th />
            </tr>
          </thead>
          <tbody>
            {hien.map((d) => (
              <tr key={d.id}>
                <td>
                  <strong>{d.ma_nv}</strong> — {d.ho_ten}
                  {d.phong_ban !== null && <><br /><span className="mo-ta">{d.phong_ban}</span></>}
                </td>
                <td>{ten_loai(d.loai)}</td>
                <td>
                  {ngay_viet(d.tu_ngay)}
                  {d.den_ngay !== null && d.den_ngay !== d.tu_ngay && <> – {ngay_viet(d.den_ngay)}</>}
                </td>
                <td>{chi_tiet(d)}</td>
                <td style={{ maxWidth: 260 }}>
                  {d.ly_do ?? <span className="mo-ta">—</span>}
                  {canh_bao[d.id] !== undefined && (
                    <div className="hop-luu-y" style={{ marginTop: 6 }}>
                      {canh_bao[d.id]!.map((c, i) => <div key={i}>{c}</div>)}
                    </div>
                  )}
                </td>
                <td><NhanDon trang_thai={d.trang_thai} /></td>
                <td>
                  {d.trang_thai === 'cho_duyet' ? (
                    <div className="hang-nut">
                      <button
                        className="nut-nho nut-chinh"
                        disabled={dang_chay}
                        onClick={() => quyet(d.id, 'da_duyet')}
                      >
                        Duyệt
                      </button>
                      <button
                        className="nut-nho nut-nguy"
                        disabled={dang_chay}
                        onClick={() => {
                          const gc = window.prompt('Lý do từ chối (tuỳ chọn):') ?? undefined;
                          quyet(d.id, 'tu_choi', gc);
                        }}
                      >
                        Từ chối
                      </button>
                    </div>
                  ) : (
                    <span className="mo-ta">
                      {d.nguoi_duyet ?? '—'}
                      {d.ghi_chu_duyet !== null && <><br />{d.ghi_chu_duyet}</>}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
