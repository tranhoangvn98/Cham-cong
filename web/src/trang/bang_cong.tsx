import { useState, type ReactNode } from 'react';
import { goi, la_nhan_su, tai_tep } from '../api.ts';
import {
  DangTai, HopLoi, HopTot, HopThoai, NhanNgay, Trong, dung_hanh_dong, dung_nap, gio_ngan,
  ngay_viet, phut_thanh_chu, thang_nay, thu_cua_ngay,
} from '../thanh_phan.tsx';

interface DongTongHop {
  nhan_vien_id: string;
  ma_nv: string;
  ho_ten: string;
  phong_ban: string | null;
  tong_cong: number;
  tong_phut_lam: number;
  tong_phut_ot: number;
  tong_phut_muon: number;
  tong_phut_ve_som: number;
  so_ngay_co_mat: number;
  so_ngay_vang: number;
  so_ngay_nghi_phep: number;
  so_lan_di_muon: number;
}

interface DongNgay {
  nhan_vien_id: string;
  ma_nv: string;
  ho_ten: string;
  ngay: string;
  trang_thai: string;
  gio_vao: string | null;
  gio_ra: string | null;
  phut_lam: number;
  phut_muon: number;
  phut_ve_som: number;
  phut_ot: number;
  so_cong: number;
  co_dieu_chinh: boolean;
  da_chot: boolean;
  ghi_chu: string | null;
}

interface PhongBan { id: string; ten: string }

export function TrangBangCong(): ReactNode {
  const [thang, dat_thang] = useState(thang_nay());
  const [phong_ban_id, dat_phong_ban] = useState('');
  const [xem_chi_tiet, dat_xem_chi_tiet] = useState<{ id: string; ten: string } | null>(null);
  const hd = dung_hanh_dong();

  const url_tong_hop = `/api/bang-cong/tong-hop?thang=${thang}`
    + (phong_ban_id === '' ? '' : `&phong_ban_id=${phong_ban_id}`);
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<DongTongHop[]>(url_tong_hop);
  const phong = dung_nap<PhongBan[]>('/api/phong-ban');

  const tinh_lai = async (): Promise<void> => {
    const [y, m] = thang.split('-').map(Number) as [number, number];
    const cuoi = new Date(Date.UTC(y, m, 0)).getUTCDate();
    await hd.chay(
      () => goi('/api/bang-cong/tinh-lai', {
        method: 'POST',
        body: { tu: `${thang}-01`, den: `${thang}-${String(cuoi).padStart(2, '0')}` },
      }),
      'Đã tính lại bảng công cho cả tháng.',
    );
    nap_lai();
  };

  const xuat = async (): Promise<void> => {
    await hd.chay(
      () => tai_tep(`/api/bang-cong/xuat-csv?thang=${thang}`, `bang_cong_${thang}.csv`),
    );
  };

  const chot = async (mo: boolean): Promise<void> => {
    const duong_dan = mo ? '/api/bang-cong/mo-chot-thang' : '/api/bang-cong/chot-thang';
    await hd.chay(
      () => goi(duong_dan, { method: 'POST', body: { thang } }),
      mo ? 'Đã mở chốt tháng.' : 'Đã chốt tháng. Các ngày đã chốt sẽ không bị tính lại.',
    );
    nap_lai();
  };

  return (
    <>
      <div className="dau-trang">
        <div>
          <p className="mo-ta">Bấm vào một dòng để xem chi tiết từng ngày.</p>
        </div>
        {la_nhan_su() && (
          <div className="hang-nut">
            <button onClick={xuat} disabled={hd.dang_chay}>Xuất CSV</button>
            <button onClick={tinh_lai} disabled={hd.dang_chay}>Tính lại tháng</button>
            <button onClick={() => chot(false)} disabled={hd.dang_chay}>Chốt tháng</button>
            <button className="nut-phang" onClick={() => chot(true)} disabled={hd.dang_chay}>
              Mở chốt
            </button>
          </div>
        )}
      </div>

      <HopLoi loi={hd.loi} />
      <HopTot chu={hd.tot} />

      <div className="bo-loc">
        <div className="o-nhap">
          <label htmlFor="thang">Tháng</label>
          <input id="thang" type="month" value={thang} onChange={(e) => dat_thang(e.target.value)} />
        </div>
        <div className="o-nhap">
          <label htmlFor="pb">Phòng ban</label>
          <select id="pb" value={phong_ban_id} onChange={(e) => dat_phong_ban(e.target.value)}>
            <option value="">Tất cả</option>
            {(phong.du_lieu ?? []).map((p) => (
              <option key={p.id} value={p.id}>{p.ten}</option>
            ))}
          </select>
        </div>
      </div>

      <HopLoi loi={loi} />

      <div className="the the-mong">
        {dang_tai ? <DangTai /> : (du_lieu ?? []).length === 0 ? (
          <Trong
            tieu_de="Chưa có dữ liệu"
            mo_ta="Chưa có nhân viên nào, hoặc chưa có log chấm công trong tháng này."
          />
        ) : (
          <div className="vo-bang">
            <table>
              <thead>
                <tr>
                  <th>Mã NV</th>
                  <th>Họ tên</th>
                  <th>Phòng ban</th>
                  <th className="canh-phai">Tổng công</th>
                  <th className="canh-phai">Giờ làm</th>
                  <th className="canh-phai">OT</th>
                  <th className="canh-phai">Lần muộn</th>
                  <th className="canh-phai">Phút muộn</th>
                  <th className="canh-phai">Vắng</th>
                  <th className="canh-phai">Nghỉ phép</th>
                </tr>
              </thead>
              <tbody>
                {(du_lieu ?? []).map((d) => (
                  <tr
                    key={d.nhan_vien_id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => dat_xem_chi_tiet({ id: d.nhan_vien_id, ten: d.ho_ten })}
                  >
                    <td className="so">{d.ma_nv}</td>
                    <td>{d.ho_ten}</td>
                    <td>{d.phong_ban ?? '—'}</td>
                    <td className="canh-phai so" style={{ fontWeight: 650 }}>
                      {Number(d.tong_cong).toFixed(1)}
                    </td>
                    <td className="canh-phai so">{phut_thanh_chu(Number(d.tong_phut_lam))}</td>
                    <td className="canh-phai so">{phut_thanh_chu(Number(d.tong_phut_ot))}</td>
                    <td className="canh-phai so">{Number(d.so_lan_di_muon) || '—'}</td>
                    <td className="canh-phai so" style={
                      Number(d.tong_phut_muon) > 0 ? { color: 'var(--canh-bao)' } : undefined
                    }>
                      {phut_thanh_chu(Number(d.tong_phut_muon))}
                    </td>
                    <td className="canh-phai so" style={
                      Number(d.so_ngay_vang) > 0 ? { color: 'var(--xau)', fontWeight: 600 } : undefined
                    }>
                      {Number(d.so_ngay_vang) || '—'}
                    </td>
                    <td className="canh-phai so">{Number(d.so_ngay_nghi_phep) || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {xem_chi_tiet !== null && (
        <ChiTietThang
          nhan_vien_id={xem_chi_tiet.id}
          ho_ten={xem_chi_tiet.ten}
          thang={thang}
          khi_dong={() => dat_xem_chi_tiet(null)}
          khi_doi={nap_lai}
        />
      )}
    </>
  );
}

// ============================================================ chi tiet tung ngay
interface ChiTietProps {
  nhan_vien_id: string;
  ho_ten: string;
  thang: string;
  khi_dong: () => void;
  khi_doi: () => void;
}

function ChiTietThang({ nhan_vien_id, ho_ten, thang, khi_dong, khi_doi }: ChiTietProps): ReactNode {
  const [y, m] = thang.split('-').map(Number) as [number, number];
  const cuoi = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const tu = `${thang}-01`;
  const den = `${thang}-${String(cuoi).padStart(2, '0')}`;

  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<DongNgay[]>(
    `/api/bang-cong?tu=${tu}&den=${den}&nhan_vien_id=${nhan_vien_id}`,
  );
  const [dang_sua, dat_dang_sua] = useState<DongNgay | null>(null);

  return (
    <HopThoai tieu_de={`${ho_ten} — bảng công tháng ${m}/${y}`} khi_dong={khi_dong} rong>
      <HopLoi loi={loi} />

        {dang_tai ? <DangTai /> : (du_lieu ?? []).length === 0 ? (
          <Trong tieu_de="Chưa có ngày công nào trong tháng" />
        ) : (
          <div className="vo-bang">
            <table>
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th>Trạng thái</th>
                  <th>Vào</th>
                  <th>Ra</th>
                  <th className="canh-phai">Giờ làm</th>
                  <th className="canh-phai">Muộn</th>
                  <th className="canh-phai">Sớm</th>
                  <th className="canh-phai">OT</th>
                  <th className="canh-phai">Công</th>
                  <th>Ghi chú</th>
                  {la_nhan_su() && <th></th>}
                </tr>
              </thead>
              <tbody>
                {(du_lieu ?? []).map((d) => (
                  <tr key={d.ngay}>
                    <td className="khong-ngat">
                      {thu_cua_ngay(d.ngay)} {ngay_viet(d.ngay)}
                      {d.da_chot && <span className="nhan nhan-mo" style={{ marginLeft: 4 }}>chốt</span>}
                    </td>
                    <td><NhanNgay trang_thai={d.trang_thai} /></td>
                    <td className="so">{gio_ngan(d.gio_vao)}</td>
                    <td className="so">{gio_ngan(d.gio_ra)}</td>
                    <td className="canh-phai so">{phut_thanh_chu(Number(d.phut_lam))}</td>
                    <td className="canh-phai so">{phut_thanh_chu(Number(d.phut_muon))}</td>
                    <td className="canh-phai so">{phut_thanh_chu(Number(d.phut_ve_som))}</td>
                    <td className="canh-phai so">{phut_thanh_chu(Number(d.phut_ot))}</td>
                    <td className="canh-phai so" style={{ fontWeight: 600 }}>
                      {Number(d.so_cong).toFixed(1)}
                    </td>
                    <td style={{ maxWidth: 200, fontSize: 12 }}>
                      {d.co_dieu_chinh && <span className="nhan nhan-lanh" style={{ marginRight: 4 }}>
                        sửa
                      </span>}
                      {d.ghi_chu ?? ''}
                    </td>
                    {la_nhan_su() && (
                      <td>
                        <button className="nut-nho nut-phang" onClick={() => dat_dang_sua(d)}>
                          Sửa
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {dang_sua !== null && (
        <SuaNgayCong
          dong={dang_sua}
          khi_dong={() => dat_dang_sua(null)}
          khi_xong={() => {
            dat_dang_sua(null);
            nap_lai();
            khi_doi();
          }}
        />
      )}
    </HopThoai>
  );
}

// ============================================================ sua tay mot ngay
function SuaNgayCong(
  { dong, khi_dong, khi_xong }: { dong: DongNgay; khi_dong: () => void; khi_xong: () => void },
): ReactNode {
  const [so_cong, dat_so_cong] = useState(String(dong.so_cong));
  const [phut_ot, dat_phut_ot] = useState(String(dong.phut_ot));
  const [ghi_chu, dat_ghi_chu] = useState(dong.ghi_chu ?? '');
  const [da_chot, dat_da_chot] = useState(dong.da_chot);
  const hd = dung_hanh_dong();

  const luu = async (): Promise<void> => {
    const ok = await hd.chay(() => goi(
      `/api/bang-cong/${dong.nhan_vien_id}/${dong.ngay}`,
      {
        method: 'PATCH',
        body: {
          so_cong: Number(so_cong),
          phut_ot: Number(phut_ot),
          ghi_chu: ghi_chu.trim() === '' ? null : ghi_chu.trim(),
          da_chot,
        },
      },
    ));
    if (ok) khi_xong();
  };

  return (
    <HopThoai tieu_de={`Sửa ngày ${ngay_viet(dong.ngay)}`} khi_dong={khi_dong}>
      <div className="hop-thong-bao hop-luu-y">
          Sửa tay ghi đè kết quả tính tự động và được ghi vào nhật ký thao tác. Nếu chỉ cần bù giờ
          quên quẹt, nên dùng đơn giải trình của nhân viên để có căn cứ.
        </div>

        <HopLoi loi={hd.loi} />

        <div className="o-nhap">
          <label htmlFor="sc">Số công</label>
          <input id="sc" type="number" step="0.5" min="0" max="2"
            value={so_cong} onChange={(e) => dat_so_cong(e.target.value)} />
        </div>

        <div className="o-nhap">
          <label htmlFor="ot">Phút OT</label>
          <input id="ot" type="number" min="0" max="1440"
            value={phut_ot} onChange={(e) => dat_phut_ot(e.target.value)} />
        </div>

        <div className="o-nhap">
          <label htmlFor="gc">Ghi chú</label>
          <textarea id="gc" value={ghi_chu} onChange={(e) => dat_ghi_chu(e.target.value)}
            placeholder="Lý do sửa tay" />
        </div>

        <div className="o-nhap-ngang">
          <input id="chot" type="checkbox" checked={da_chot}
            onChange={(e) => dat_da_chot(e.target.checked)} />
          <label htmlFor="chot">Chốt ngày này (không cho tính lại)</label>
        </div>

      <div className="hang-nut">
        <button className="nut-chinh" onClick={luu} disabled={hd.dang_chay}>
          {hd.dang_chay ? 'Đang lưu…' : 'Lưu'}
        </button>
        <button onClick={khi_dong}>Hủy</button>
      </div>
    </HopThoai>
  );
}
