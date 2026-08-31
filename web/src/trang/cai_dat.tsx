// Cac trang cau hinh: ca lam viec, dia diem cham cong, ngay le.
import { useState, type ReactNode } from 'react';
import { goi, la_nhan_su } from '../api.ts';
import {
  DangTai, HopLoi, HopTot, HopThoai, Trong,
  dung_hanh_dong, dung_nap, dung_xac_nhan, ngay_viet, thu_cua_ngay,
} from '../thanh_phan.tsx';

const TEN_THU_DAY = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
const TEN_THU_NGAN = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

interface CaLam {
  id: string;
  ten: string;
  gio_vao: string;
  gio_ra: string;
  nghi_tu: string | null;
  nghi_den: string | null;
  dung_sai_muon_phut: number;
  dung_sai_som_phut: number;
  nguong_ot_phut: number;
  qua_dem: boolean;
  phut_du_cong: number;
  cac_ngay_lam: number[];
  theo_thu: CaTheoThu[];
  dang_hoat_dong: boolean;
}

/** Khung gio rieng cho mot thu — vd sang thu Bay 08:00–12:00 van la gio chuan. */
interface CaTheoThu {
  thu: number;
  gio_vao: string;
  gio_ra: string;
  nghi_tu: string | null;
  nghi_den: string | null;
  phut_du_cong: number;
}

const gio5 = (g: string | null | undefined): string => (g ?? '').slice(0, 5);

// ============================================================ CA LAM VIEC
export function TrangCaLam(): ReactNode {
  const [dang_sua, dat_dang_sua] = useState<CaLam | null>(null);
  const [dang_them, dat_dang_them] = useState(false);
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<CaLam[]>('/api/ca-lam');
  const hd = dung_hanh_dong();
  const xn = dung_xac_nhan();

  const vo_hieu = async (c: CaLam): Promise<void> => {
    const dong_y = await xn.hoi({
      tieu_de: `Vô hiệu hóa ca "${c.ten}"?`,
      mo_ta: <>
        Ca này không gán cho ai được nữa. <strong>Bảng công cũ vẫn giữ nguyên</strong> — các
        tháng đã tính không đổi theo.
      </>,
      chu_dong_y: 'Vô hiệu hóa',
    });
    if (!dong_y) return;
    await hd.chay(() => goi(`/api/ca-lam/${c.id}`, { method: 'DELETE' }), 'Đã vô hiệu hóa ca.');
    nap_lai();
  };

  return (
    <>
      <div className="dau-trang">
        <div>
          <p className="mo-ta">
            Ca quyết định cách tính đi muộn, về sớm và OT. Nhân viên không gán ca chỉ được tính tổng
            thời gian có mặt.
          </p>
        </div>
        {la_nhan_su() && (
          <button className="nut-chinh" onClick={() => dat_dang_them(true)}>+ Thêm ca</button>
        )}
      </div>

      <HopLoi loi={hd.loi} />
      <HopTot chu={hd.tot} />
      <HopLoi loi={loi} />

      <div className="the the-mong">
        {dang_tai ? <DangTai /> : (du_lieu ?? []).length === 0 ? (
          <Trong tieu_de="Chưa có ca nào" mo_ta="Thêm ca hành chính 08:00–17:00 để bắt đầu." />
        ) : (
          <div className="vo-bang">
            <table>
              <thead>
                <tr>
                  <th>Tên ca</th>
                  <th>Giờ làm</th>
                  <th>Nghỉ giữa ca</th>
                  <th>Ngày làm</th>
                  <th className="canh-phai">Dung sai muộn</th>
                  <th className="canh-phai">Đủ công</th>
                  {la_nhan_su() && <th></th>}
                </tr>
              </thead>
              <tbody>
                {(du_lieu ?? []).map((c) => (
                  <tr key={c.id} style={c.dang_hoat_dong ? undefined : { opacity: 0.5 }}>
                    <td>
                      <strong>{c.ten}</strong>
                      {!c.dang_hoat_dong && (
                        <span className="nhan nhan-mo" style={{ marginLeft: 6 }}>đã tắt</span>
                      )}
                    </td>
                    <td className="khong-ngat so">
                      {gio5(c.gio_vao)} → {gio5(c.gio_ra)}
                      {c.qua_dem && <span className="nhan nhan-lanh" style={{ marginLeft: 4 }}>qua đêm</span>}
                      {(c.theo_thu ?? []).map((t) => (
                        <div key={t.thu} className="chu-nho chu-mo">
                          {TEN_THU_NGAN[t.thu]}: {gio5(t.gio_vao)} → {gio5(t.gio_ra)}
                        </div>
                      ))}
                    </td>
                    <td className="khong-ngat so">
                      {c.nghi_tu === null ? '—' : `${c.nghi_tu.slice(0, 5)} → ${c.nghi_den?.slice(0, 5)}`}
                    </td>
                    <td className="chu-nho">
                      {c.cac_ngay_lam.map((t) => TEN_THU_NGAN[t]).join(', ')}
                    </td>
                    <td className="canh-phai so">{c.dung_sai_muon_phut}p</td>
                    <td className="canh-phai so">
                      {Math.floor(c.phut_du_cong / 60)}h{c.phut_du_cong % 60 === 0 ? '' : ` ${c.phut_du_cong % 60}p`}
                    </td>
                    {la_nhan_su() && (
                      <td>
                        <div className="hang-nut">
                          <button className="nut-nho nut-phang" onClick={() => dat_dang_sua(c)}>Sửa</button>
                          {c.dang_hoat_dong && (
                            <button className="nut-nho nut-phang" onClick={() => vo_hieu(c)}>Tắt</button>
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

      {(dang_them || dang_sua !== null) && (
        <FormCaLam
          ca={dang_sua}
          khi_dong={() => { dat_dang_them(false); dat_dang_sua(null); }}
          khi_xong={() => { dat_dang_them(false); dat_dang_sua(null); nap_lai(); }}
        />
      )}
      {xn.hop_thoai}
    </>
  );
}

function FormCaLam(
  { ca, khi_dong, khi_xong }: { ca: CaLam | null; khi_dong: () => void; khi_xong: () => void },
): ReactNode {
  const [f, dat_f] = useState({
    ten: ca?.ten ?? '',
    gio_vao: (ca?.gio_vao ?? '08:00').slice(0, 5),
    gio_ra: (ca?.gio_ra ?? '17:00').slice(0, 5),
    nghi_tu: ca?.nghi_tu === null || ca?.nghi_tu === undefined ? '12:00' : ca.nghi_tu.slice(0, 5),
    nghi_den: ca?.nghi_den === null || ca?.nghi_den === undefined ? '13:30' : ca.nghi_den.slice(0, 5),
    co_nghi: ca === null ? true : ca.nghi_tu !== null,
    dung_sai_muon_phut: String(ca?.dung_sai_muon_phut ?? 5),
    dung_sai_som_phut: String(ca?.dung_sai_som_phut ?? 5),
    nguong_ot_phut: String(ca?.nguong_ot_phut ?? 30),
    phut_du_cong: String(ca?.phut_du_cong ?? 420),
    qua_dem: ca?.qua_dem ?? false,
    cac_ngay_lam: ca?.cac_ngay_lam ?? [1, 2, 3, 4, 5],
  });
  // Khung gio rieng theo thu, tra ve theo so thu de sua tung dong doc lap.
  const [theo_thu, dat_theo_thu] = useState<Record<number, CaTheoThu>>(() =>
    Object.fromEntries((ca?.theo_thu ?? []).map((t) => [t.thu, {
      ...t,
      gio_vao: gio5(t.gio_vao),
      gio_ra: gio5(t.gio_ra),
      nghi_tu: t.nghi_tu === null ? null : gio5(t.nghi_tu),
      nghi_den: t.nghi_den === null ? null : gio5(t.nghi_den),
    }])),
  );
  const hd = dung_hanh_dong();

  const doi = (k: keyof typeof f, v: unknown): void => dat_f((cu) => ({ ...cu, [k]: v }));

  const bat_tat_thu = (thu: number): void =>
    dat_f((cu) => ({
      ...cu,
      cac_ngay_lam: cu.cac_ngay_lam.includes(thu)
        ? cu.cac_ngay_lam.filter((t) => t !== thu)
        : [...cu.cac_ngay_lam, thu].sort((a, b) => a - b),
    }));

  const gui = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const than = {
      ten: f.ten.trim(),
      gio_vao: f.gio_vao,
      gio_ra: f.gio_ra,
      nghi_tu: f.co_nghi ? f.nghi_tu : null,
      nghi_den: f.co_nghi ? f.nghi_den : null,
      dung_sai_muon_phut: Number(f.dung_sai_muon_phut),
      dung_sai_som_phut: Number(f.dung_sai_som_phut),
      // Khong con o nhap cho truong nay: OT tinh theo don da duyet chu khong theo nguong.
      // Van gui lai gia tri dang co de lan sua ca khong lang le ghi de no ve 30.
      nguong_ot_phut: Number(f.nguong_ot_phut),
      phut_du_cong: Number(f.phut_du_cong),
      qua_dem: f.qua_dem,
      cac_ngay_lam: f.cac_ngay_lam,
      // Bo khung gio cua thu da bo chon: giu lai se bi may chu tu choi.
      theo_thu: f.qua_dem ? [] : f.cac_ngay_lam.flatMap((t) => {
        const r = theo_thu[t];
        return r === undefined ? [] : [r];
      }),
    };
    const ok = await hd.chay(() =>
      ca === null
        ? goi('/api/ca-lam', { method: 'POST', body: than })
        : goi(`/api/ca-lam/${ca.id}`, { method: 'PUT', body: than }),
    );
    if (ok) khi_xong();
  };

  return (
    <HopThoai tieu_de={ca === null ? 'Thêm ca làm việc' : `Sửa ca: ${ca.ten}`} khi_dong={khi_dong}>
      <form onSubmit={gui}>
        <HopLoi loi={hd.loi} />

        {ca !== null && (
          <div className="hop-thong-bao hop-luu-y">
            Sửa ca <strong>không</strong> tự tính lại bảng công đã có. Sau khi lưu, vào Bảng công →
            "Tính lại tháng" cho các tháng cần cập nhật.
          </div>
        )}

        <div className="o-nhap">
          <label htmlFor="tc">Tên ca *</label>
          <input id="tc" value={f.ten} onChange={(e) => doi('ten', e.target.value)}
            placeholder="Hành chính" required />
        </div>

        <div className="luoi luoi-2">
          <div className="o-nhap">
            <label htmlFor="gv">Giờ vào *</label>
            <input id="gv" type="time" value={f.gio_vao} onChange={(e) => doi('gio_vao', e.target.value)} required />
          </div>
          <div className="o-nhap">
            <label htmlFor="gr">Giờ ra *</label>
            <input id="gr" type="time" value={f.gio_ra} onChange={(e) => doi('gio_ra', e.target.value)} required />
          </div>
        </div>

        <div className="o-nhap-ngang">
          <input id="qd" type="checkbox" checked={f.qua_dem}
            onChange={(e) => doi('qua_dem', e.target.checked)} />
          <label htmlFor="qd">Ca qua đêm (giờ ra thuộc ngày hôm sau)</label>
        </div>

        <div className="o-nhap-ngang">
          <input id="cn" type="checkbox" checked={f.co_nghi}
            onChange={(e) => doi('co_nghi', e.target.checked)} />
          <label htmlFor="cn">Có nghỉ giữa ca (không tính vào giờ làm)</label>
        </div>

        {f.co_nghi && (
          <div className="luoi luoi-2">
            <div className="o-nhap">
              <label htmlFor="nt">Nghỉ từ</label>
              <input id="nt" type="time" value={f.nghi_tu} onChange={(e) => doi('nghi_tu', e.target.value)} />
            </div>
            <div className="o-nhap">
              <label htmlFor="nd">Nghỉ đến</label>
              <input id="nd" type="time" value={f.nghi_den} onChange={(e) => doi('nghi_den', e.target.value)} />
            </div>
          </div>
        )}

        <div className="o-nhap">
          <label>Các ngày phải đi làm *</label>
          <div className="hang-nut">
            {TEN_THU_DAY.map((ten_day, thu) => (
              <button type="button" key={thu} title={ten_day}
                aria-pressed={f.cac_ngay_lam.includes(thu)}
                className={f.cac_ngay_lam.includes(thu) ? 'nut-nho nut-chinh' : 'nut-nho'}
                onClick={() => bat_tat_thu(thu)}>
                {TEN_THU_NGAN[thu]}
              </button>
            ))}
          </div>
          <div className="goi-y">
            Ngày không chọn được coi là nghỉ tuần — đi làm ngày đó sẽ tính toàn bộ vào OT.
          </div>
        </div>

        {!f.qua_dem && (
          <div className="o-nhap">
            <label>Khung giờ riêng theo thứ</label>
            <div className="goi-y" style={{ marginBottom: 8 }}>
              Ngày không bật ở đây dùng chung giờ vào/ra phía trên. Dùng cho chế độ làm{' '}
              <strong>sáng thứ Bảy</strong>: bật T7, đặt 08:00–12:00 và để "đủ công" gấp đôi số
              phút làm để ngày đó tính 0,5 công.
            </div>
            {f.cac_ngay_lam.map((thu) => {
              const r = theo_thu[thu];
              const dat = (moi: Partial<CaTheoThu>): void =>
                dat_theo_thu((cu) => {
                  const truoc = cu[thu];
                  return truoc === undefined ? cu : { ...cu, [thu]: { ...truoc, ...moi } };
                });
              return (
                <div key={thu} style={{ marginBottom: 6 }}>
                  <div className="o-nhap-ngang">
                    <input id={`tt${thu}`} type="checkbox" checked={r !== undefined}
                      onChange={(e) => dat_theo_thu((cu) => {
                        if (!e.target.checked) {
                          const { [thu]: _bo, ...con_lai } = cu;
                          return con_lai;
                        }
                        return { ...cu, [thu]: {
                          thu, gio_vao: '08:00', gio_ra: '12:00',
                          nghi_tu: null, nghi_den: null, phut_du_cong: 480,
                        } };
                      })} />
                    <label htmlFor={`tt${thu}`}>{TEN_THU_DAY[thu]}</label>
                  </div>
                  {r !== undefined && (
                    <div className="luoi luoi-3" style={{ marginLeft: 24 }}>
                      <div className="o-nhap">
                        <label htmlFor={`tv${thu}`}>Vào</label>
                        <input id={`tv${thu}`} type="time" value={r.gio_vao}
                          onChange={(e) => dat({ gio_vao: e.target.value })} required />
                      </div>
                      <div className="o-nhap">
                        <label htmlFor={`tr${thu}`}>Ra</label>
                        <input id={`tr${thu}`} type="time" value={r.gio_ra}
                          onChange={(e) => dat({ gio_ra: e.target.value })} required />
                      </div>
                      <div className="o-nhap">
                        <label htmlFor={`tp${thu}`}>Đủ công (phút)</label>
                        <input id={`tp${thu}`} type="number" min="60" max="1440" value={r.phut_du_cong}
                          onChange={(e) => dat({ phut_du_cong: Number(e.target.value) })} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="luoi luoi-2">
          <div className="o-nhap">
            <label htmlFor="dsm">Dung sai đi muộn (phút)</label>
            <input id="dsm" type="number" min="0" max="240" value={f.dung_sai_muon_phut}
              onChange={(e) => doi('dung_sai_muon_phut', e.target.value)} />
          </div>
          <div className="o-nhap">
            <label htmlFor="dss">Dung sai về sớm (phút)</label>
            <input id="dss" type="number" min="0" max="240" value={f.dung_sai_som_phut}
              onChange={(e) => doi('dung_sai_som_phut', e.target.value)} />
          </div>
        </div>

        <div className="luoi luoi-2">
          <div className="o-nhap">
            <label>Làm thêm giờ</label>
            <div className="goi-y">
              OT chỉ tính khi có <strong>đơn làm thêm đã duyệt</strong>, và chỉ tính phần giờ
              vừa có mặt vừa nằm trong đơn. Không còn ngưỡng &#34;ở lại quá N phút thì thành OT&#34;
              — quẹt thẻ muộn vì lý do khác không sinh OT nữa.
            </div>
          </div>
          <div className="o-nhap">
            <label htmlFor="pdc">Số phút để tính đủ 1 công</label>
            <input id="pdc" type="number" min="60" max="1440" value={f.phut_du_cong}
              onChange={(e) => doi('phut_du_cong', e.target.value)} />
            <div className="goi-y">Từ nửa ngưỡng này tính 0,5 công.</div>
          </div>
        </div>

        <div className="hang-nut">
          <button type="submit" className="nut-chinh" disabled={hd.dang_chay || f.cac_ngay_lam.length === 0}>
            {hd.dang_chay ? 'Đang lưu…' : 'Lưu ca'}
          </button>
          <button type="button" onClick={khi_dong}>Hủy</button>
        </div>
      </form>
    </HopThoai>
  );
}

// ============================================================ DIA DIEM
interface DiaDiem {
  id: string;
  ten: string;
  vi_do: number;
  kinh_do: number;
  ban_kinh_m: number;
  dang_hoat_dong: boolean;
}

export function TrangDiaDiem(): ReactNode {
  const [dang_them, dat_dang_them] = useState(false);
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<DiaDiem[]>('/api/dia-diem');
  const hd = dung_hanh_dong();

  const bat_tat = async (d: DiaDiem): Promise<void> => {
    await hd.chay(() => goi(`/api/dia-diem/${d.id}`, {
      method: 'PATCH', body: { dang_hoat_dong: !d.dang_hoat_dong },
    }));
    nap_lai();
  };

  return (
    <>
      <div className="dau-trang">
        <div>
          <p className="mo-ta">
            Dùng để đối chiếu GPS khi nhân viên chấm công bằng điện thoại.
          </p>
        </div>
        {la_nhan_su() && (
          <button className="nut-chinh" onClick={() => dat_dang_them(true)}>+ Thêm địa điểm</button>
        )}
      </div>

      <div className="hop-thong-bao hop-tin">
        Chấm công <strong>trong</strong> bán kính được tính công ngay. <strong>Ngoài</strong> bán
        kính vẫn ghi nhận nhưng phải chờ nhân sự duyệt. Nếu chưa khai địa điểm nào thì mọi lần chấm
        công bằng điện thoại đều phải duyệt.
      </div>

      <HopLoi loi={hd.loi} />
      <HopLoi loi={loi} />

      <div className="the the-mong">
        {dang_tai ? <DangTai /> : (du_lieu ?? []).length === 0 ? (
          <Trong tieu_de="Chưa khai địa điểm nào" />
        ) : (
          <div className="vo-bang">
            <table>
              <thead>
                <tr>
                  <th>Tên</th>
                  <th>Toạ độ</th>
                  <th className="canh-phai">Bán kính</th>
                  <th>Trạng thái</th>
                  {la_nhan_su() && <th></th>}
                </tr>
              </thead>
              <tbody>
                {(du_lieu ?? []).map((d) => (
                  <tr key={d.id} style={d.dang_hoat_dong ? undefined : { opacity: 0.5 }}>
                    <td><strong>{d.ten}</strong></td>
                    <td className="so chu-nho">
                      {Number(d.vi_do).toFixed(6)}, {Number(d.kinh_do).toFixed(6)}
                      <div>
                        <a href={`https://www.google.com/maps?q=${d.vi_do},${d.kinh_do}`}
                          target="_blank" rel="noreferrer noopener">Xem bản đồ</a>
                      </div>
                    </td>
                    <td className="canh-phai so">{Number(d.ban_kinh_m).toLocaleString('vi-VN')} m</td>
                    <td>
                      {d.dang_hoat_dong
                        ? <span className="nhan nhan-tot">đang dùng</span>
                        : <span className="nhan nhan-mo">đã tắt</span>}
                    </td>
                    {la_nhan_su() && (
                      <td>
                        <button className="nut-nho nut-phang" onClick={() => bat_tat(d)}>
                          {d.dang_hoat_dong ? 'Tắt' : 'Bật'}
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

      {dang_them && (
        <FormDiaDiem
          khi_dong={() => dat_dang_them(false)}
          khi_xong={() => { dat_dang_them(false); nap_lai(); }}
        />
      )}
    </>
  );
}

function FormDiaDiem({ khi_dong, khi_xong }: { khi_dong: () => void; khi_xong: () => void }): ReactNode {
  const [ten, dat_ten] = useState('');
  const [vi_do, dat_vi_do] = useState('');
  const [kinh_do, dat_kinh_do] = useState('');
  const [ban_kinh, dat_ban_kinh] = useState('200');
  const [loi_dinh_vi, dat_loi_dinh_vi] = useState<string | null>(null);
  const hd = dung_hanh_dong();

  // Bao loi ngay TRONG form chu khong bang `window.alert`: nguoi dung dang go do vao form nay,
  // nen cau tra loi phai o canh o nhap — va o day con noi duoc cach lam thay the.
  const lay_vi_tri_hien_tai = (): void => {
    dat_loi_dinh_vi(null);
    if (!('geolocation' in navigator)) {
      dat_loi_dinh_vi('Trình duyệt này không hỗ trợ định vị. Hãy nhập vĩ độ / kinh độ bằng tay.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (v) => {
        dat_vi_do(v.coords.latitude.toFixed(6));
        dat_kinh_do(v.coords.longitude.toFixed(6));
      },
      () => dat_loi_dinh_vi(
        'Không lấy được vị trí. Hãy cho phép quyền định vị cho trang này, hoặc mở Google Maps, '
        + 'bấm giữ vào điểm cần lấy rồi dán cặp số vào hai ô dưới.'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const gui = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const ok = await hd.chay(() => goi('/api/dia-diem', {
      method: 'POST',
      body: {
        ten: ten.trim(),
        vi_do: Number(vi_do),
        kinh_do: Number(kinh_do),
        ban_kinh_m: Number(ban_kinh),
      },
    }));
    if (ok) khi_xong();
  };

  return (
    <HopThoai tieu_de="Thêm địa điểm chấm công" khi_dong={khi_dong}>
      <form onSubmit={gui}>
        <HopLoi loi={hd.loi} />

        <div className="o-nhap">
          <label htmlFor="tdd">Tên địa điểm *</label>
          <input id="tdd" value={ten} onChange={(e) => dat_ten(e.target.value)}
            placeholder="Văn phòng Hà Nội" required autoFocus />
        </div>

        <div className="luoi luoi-2">
          <div className="o-nhap">
            <label htmlFor="vd">Vĩ độ (latitude) *</label>
            <input id="vd" value={vi_do} onChange={(e) => dat_vi_do(e.target.value)}
              placeholder="21.028511" required />
          </div>
          <div className="o-nhap">
            <label htmlFor="kd">Kinh độ (longitude) *</label>
            <input id="kd" value={kinh_do} onChange={(e) => dat_kinh_do(e.target.value)}
              placeholder="105.804817" required />
          </div>
        </div>

        <button type="button" className="nut-light" onClick={lay_vi_tri_hien_tai}>
          Lấy vị trí hiện tại của máy này
        </button>
        {loi_dinh_vi !== null && <div className="hop-luu-y">{loi_dinh_vi}</div>}

        <div className="o-nhap">
          <label htmlFor="bk">Bán kính cho phép (mét) *</label>
          <input id="bk" type="number" min="20" max="20000" value={ban_kinh}
            onChange={(e) => dat_ban_kinh(e.target.value)} required />
          <div className="goi-y">
            GPS điện thoại thường lệch 10–50m trong nhà. Đặt quá nhỏ sẽ khiến nhân viên đứng tại chỗ
            vẫn bị coi là ngoài phạm vi. 100–300m là hợp lý cho một văn phòng.
          </div>
        </div>

        <div className="hang-nut">
          <button type="submit" className="nut-chinh" disabled={hd.dang_chay}>
            {hd.dang_chay ? 'Đang lưu…' : 'Lưu địa điểm'}
          </button>
          <button type="button" onClick={khi_dong}>Hủy</button>
        </div>
      </form>
    </HopThoai>
  );
}

// ============================================================ NGAY LE + NOI LAM VIEC + KE HOACH NGHI
interface NgayLe { ngay: string; ten: string; huong_luong: boolean; lich_ma: string; ke_hoach_id: string | null }
interface Lich { ma: string; ten: string; quoc_gia: string | null; dang_dung: boolean }
interface KeHoach {
  id: string; nam: number; ten: string; tu_ngay: string; den_ngay: string;
  lich_ma: string; huong_luong: boolean; ghi_chu: string | null; lich_ten: string | null; so_ngay: number;
}
interface NoiLamViec {
  id: string; ten: string; lich_nghi_ma: string; dia_chi: string | null;
  dang_dung: boolean; lich_ten: string | null; so_nguoi: number;
}

export function TrangNgayLe(): ReactNode {
  const [tab, dat_tab] = useState<'ngay_le' | 'ke_hoach' | 'noi_lam_viec'>('ngay_le');
  return (
    <>
      <div className="hang-tab">
        <button className={tab === 'ngay_le' ? 'dang-chon' : undefined}
          onClick={() => dat_tab('ngay_le')}>Ngày lễ</button>
        <button className={tab === 'ke_hoach' ? 'dang-chon' : undefined}
          onClick={() => dat_tab('ke_hoach')}>Kế hoạch nghỉ theo năm</button>
        <button className={tab === 'noi_lam_viec' ? 'dang-chon' : undefined}
          onClick={() => dat_tab('noi_lam_viec')}>Nơi làm việc</button>
      </div>
      {tab === 'ngay_le' ? <TabNgayLe /> : tab === 'ke_hoach' ? <TabKeHoach /> : <TabNoiLamViec />}
    </>
  );
}

/** Nhan hien thi ten lich (VN/TQ) canh mot dong. */
function NhanLich({ ma, ten }: { ma: string; ten?: string | null }): ReactNode {
  return <span className={`nhan ${ma === 'vn' ? 'nhan-lanh' : 'nhan-canh-bao'}`}>{ten ?? ma}</span>;
}

// ------------------------------------------------------------ Tab 1: Ngay le
function TabNgayLe(): ReactNode {
  const nam_nay = new Date().getFullYear();
  const [nam, dat_nam] = useState(String(nam_nay));
  const [dang_them, dat_dang_them] = useState(false);
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<NgayLe[]>(`/api/ngay-le?nam=${nam}`);
  const hd = dung_hanh_dong();
  const xn = dung_xac_nhan();

  const xoa = async (ng: NgayLe): Promise<void> => {
    const dong_y = await xn.hoi({
      tieu_de: `Xóa ngày lễ "${ng.ten}"?`,
      mo_ta: <>
        Ngày {ngay_viet(ng.ngay)} sẽ thành ngày làm việc bình thường, và{' '}
        <strong>bảng công của ngày đó được tính lại ngay</strong> — ai không đi làm hôm đó sẽ
        chuyển từ Ngày lễ sang Vắng.
      </>,
      chu_dong_y: 'Xóa ngày lễ',
      nguy_hiem: true,
    });
    if (!dong_y) return;
    await hd.chay(
      () => goi(`/api/ngay-le/${ng.ngay}?lich_ma=${ng.lich_ma}`, { method: 'DELETE' }),
      'Đã xóa và tính lại bảng công của ngày đó.',
    );
    nap_lai();
  };

  return (
    <>
      <div className="dau-trang">
        <div>
          <p className="mo-ta">
            Thêm/xóa ngày lễ sẽ tính lại bảng công của đúng ngày đó ngay lập tức. Ngày lễ áp theo
            <strong> lịch của nơi làm việc</strong> (VN/TQ).
          </p>
        </div>
        {la_nhan_su() && (
          <button className="nut-chinh" onClick={() => dat_dang_them(true)}>+ Thêm ngày lễ</button>
        )}
      </div>

      <div className="hop-thong-bao hop-luu-y">
        Chỉ các ngày lễ <strong>dương lịch cố định</strong> (lịch VN) được tạo sẵn. Tết Nguyên đán,
        ngày nghỉ bù theo lịch âm, và ngày lễ Trung Quốc phải tự thêm mỗi năm — hoặc dùng tab
        <strong> Kế hoạch nghỉ theo năm</strong> để khai cả đợt.
      </div>

      <HopLoi loi={hd.loi} />
      <HopTot chu={hd.tot} />

      <div className="bo-loc">
        <div className="o-nhap">
          <label htmlFor="nam">Năm</label>
          <select id="nam" value={nam} onChange={(e) => dat_nam(e.target.value)}>
            {[nam_nay - 1, nam_nay, nam_nay + 1].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      <HopLoi loi={loi} />

      <div className="the the-mong">
        {dang_tai ? <DangTai /> : (du_lieu ?? []).length === 0 ? (
          <Trong tieu_de={`Chưa khai ngày lễ nào cho năm ${nam}`} />
        ) : (
          <div className="vo-bang">
            <table>
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th>Tên</th>
                  <th>Lịch</th>
                  <th>Hưởng lương</th>
                  {la_nhan_su() && <th></th>}
                </tr>
              </thead>
              <tbody>
                {(du_lieu ?? []).map((n) => (
                  <tr key={`${n.ngay}-${n.lich_ma}`}>
                    <td className="khong-ngat">{thu_cua_ngay(n.ngay)} {ngay_viet(n.ngay)}</td>
                    <td>{n.ten}{n.ke_hoach_id !== null && <span className="nhan nhan-mo"> đợt</span>}</td>
                    <td><NhanLich ma={n.lich_ma} /></td>
                    <td>
                      {n.huong_luong
                        ? <span className="nhan nhan-tot">có</span>
                        : <span className="nhan nhan-mo">không</span>}
                    </td>
                    {la_nhan_su() && (
                      <td>
                        <button className="nut-nho nut-phang" onClick={() => xoa(n)}>Xóa</button>
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
        <FormNgayLe
          khi_dong={() => dat_dang_them(false)}
          khi_xong={() => { dat_dang_them(false); nap_lai(); }}
        />
      )}
      {xn.hop_thoai}
    </>
  );
}

function FormNgayLe({ khi_dong, khi_xong }: { khi_dong: () => void; khi_xong: () => void }): ReactNode {
  const [ngay, dat_ngay] = useState('');
  const [ten, dat_ten] = useState('');
  const [lich_ma, dat_lich] = useState('vn');
  const [huong_luong, dat_huong_luong] = useState(true);
  const { du_lieu: lichs } = dung_nap<Lich[]>('/api/lich-nghi');
  const hd = dung_hanh_dong();

  const gui = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const ok = await hd.chay(() => goi('/api/ngay-le', {
      method: 'POST',
      body: { ngay, ten: ten.trim(), lich_ma, huong_luong },
    }));
    if (ok) khi_xong();
  };

  return (
    <HopThoai tieu_de="Thêm ngày lễ" khi_dong={khi_dong}>
      <form onSubmit={gui}>
        <HopLoi loi={hd.loi} />
        <div className="o-nhap">
          <label htmlFor="nl">Ngày *</label>
          <input id="nl" type="date" value={ngay} onChange={(e) => dat_ngay(e.target.value)} required autoFocus />
        </div>
        <div className="o-nhap">
          <label htmlFor="tnl">Tên ngày lễ *</label>
          <input id="tnl" value={ten} onChange={(e) => dat_ten(e.target.value)}
            placeholder="Tết Nguyên đán" required />
        </div>
        <div className="o-nhap">
          <label htmlFor="lnl">Lịch áp dụng</label>
          <select id="lnl" value={lich_ma} onChange={(e) => dat_lich(e.target.value)}>
            {(lichs ?? [{ ma: 'vn', ten: 'Việt Nam' } as Lich]).map((l) => (
              <option key={l.ma} value={l.ma}>{l.ten}</option>
            ))}
          </select>
        </div>
        <div className="o-nhap-ngang">
          <input id="hl" type="checkbox" checked={huong_luong}
            onChange={(e) => dat_huong_luong(e.target.checked)} />
          <label htmlFor="hl">Hưởng lương (tính 1 công dù không đi làm)</label>
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

// ------------------------------------------------------------ Tab 2: Ke hoach nghi theo nam
function TabKeHoach(): ReactNode {
  const nam_nay = new Date().getFullYear();
  const [nam, dat_nam] = useState(String(nam_nay));
  const [dang_them, dat_dang_them] = useState(false);
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<KeHoach[]>(`/api/ke-hoach-nghi-le?nam=${nam}`);
  const hd = dung_hanh_dong();
  const xn = dung_xac_nhan();

  const xoa = async (k: KeHoach): Promise<void> => {
    const dong_y = await xn.hoi({
      tieu_de: `Xóa đợt nghỉ "${k.ten}"?`,
      mo_ta: <>Toàn bộ {k.so_ngay} ngày ({ngay_viet(k.tu_ngay)} – {ngay_viet(k.den_ngay)}) sẽ bị gỡ
        khỏi ngày lễ và <strong>bảng công khoảng đó được tính lại</strong>.</>,
      chu_dong_y: 'Xóa đợt nghỉ',
      nguy_hiem: true,
    });
    if (!dong_y) return;
    await hd.chay(() => goi(`/api/ke-hoach-nghi-le/${k.id}`, { method: 'DELETE' }),
      'Đã xóa đợt nghỉ và tính lại bảng công.');
    nap_lai();
  };

  return (
    <>
      <div className="dau-trang">
        <p className="mo-ta">
          Khai cả <strong>đợt nghỉ dài</strong> theo khoảng ngày (vd nghỉ 2/9 từ 29/8 đến 2/9) — hệ
          thống tự bung ra từng ngày để không bị tính trừ công.
        </p>
        {la_nhan_su() && (
          <button className="nut-chinh" onClick={() => dat_dang_them(true)}>+ Thêm đợt nghỉ</button>
        )}
      </div>

      <HopLoi loi={hd.loi} />
      <HopTot chu={hd.tot} />

      <div className="bo-loc">
        <div className="o-nhap">
          <label htmlFor="namkh">Năm</label>
          <select id="namkh" value={nam} onChange={(e) => dat_nam(e.target.value)}>
            {[nam_nay - 1, nam_nay, nam_nay + 1].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      <HopLoi loi={loi} />

      <div className="the the-mong">
        {dang_tai ? <DangTai /> : (du_lieu ?? []).length === 0 ? (
          <Trong tieu_de={`Chưa khai đợt nghỉ nào cho năm ${nam}`} />
        ) : (
          <div className="vo-bang">
            <table>
              <thead>
                <tr>
                  <th>Đợt nghỉ</th><th>Từ ngày</th><th>Đến ngày</th><th>Số ngày</th>
                  <th>Lịch</th><th>Hưởng lương</th>{la_nhan_su() && <th></th>}
                </tr>
              </thead>
              <tbody>
                {(du_lieu ?? []).map((k) => (
                  <tr key={k.id}>
                    <td>{k.ten}</td>
                    <td className="khong-ngat">{ngay_viet(k.tu_ngay)}</td>
                    <td className="khong-ngat">{ngay_viet(k.den_ngay)}</td>
                    <td>{k.so_ngay}</td>
                    <td><NhanLich ma={k.lich_ma} ten={k.lich_ten} /></td>
                    <td>{k.huong_luong
                      ? <span className="nhan nhan-tot">có</span>
                      : <span className="nhan nhan-mo">không</span>}</td>
                    {la_nhan_su() && (
                      <td><button className="nut-nho nut-phang" onClick={() => xoa(k)}>Xóa</button></td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {dang_them && (
        <FormKeHoach khi_dong={() => dat_dang_them(false)}
          khi_xong={() => { dat_dang_them(false); nap_lai(); }} />
      )}
      {xn.hop_thoai}
    </>
  );
}

function FormKeHoach({ khi_dong, khi_xong }: { khi_dong: () => void; khi_xong: () => void }): ReactNode {
  const [ten, dat_ten] = useState('');
  const [tu_ngay, dat_tu] = useState('');
  const [den_ngay, dat_den] = useState('');
  const [lich_ma, dat_lich] = useState('vn');
  const [huong_luong, dat_huong_luong] = useState(true);
  const { du_lieu: lichs } = dung_nap<Lich[]>('/api/lich-nghi');
  const hd = dung_hanh_dong();

  const gui = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const ok = await hd.chay(() => goi('/api/ke-hoach-nghi-le', {
      method: 'POST',
      body: { ten: ten.trim(), tu_ngay, den_ngay, lich_ma, huong_luong },
    }));
    if (ok) khi_xong();
  };

  return (
    <HopThoai tieu_de="Thêm đợt nghỉ theo năm" khi_dong={khi_dong}>
      <form onSubmit={gui}>
        <HopLoi loi={hd.loi} />
        <div className="o-nhap">
          <label htmlFor="tenkh">Tên đợt nghỉ *</label>
          <input id="tenkh" value={ten} onChange={(e) => dat_ten(e.target.value)}
            placeholder="Nghỉ Quốc khánh 2/9" required autoFocus />
        </div>
        <div className="o-nhap">
          <label htmlFor="tukh">Từ ngày *</label>
          <input id="tukh" type="date" value={tu_ngay} onChange={(e) => dat_tu(e.target.value)} required />
        </div>
        <div className="o-nhap">
          <label htmlFor="denkh">Đến ngày *</label>
          <input id="denkh" type="date" value={den_ngay} onChange={(e) => dat_den(e.target.value)} required />
        </div>
        <div className="o-nhap">
          <label htmlFor="lichkh">Lịch áp dụng</label>
          <select id="lichkh" value={lich_ma} onChange={(e) => dat_lich(e.target.value)}>
            {(lichs ?? [{ ma: 'vn', ten: 'Việt Nam' } as Lich]).map((l) => (
              <option key={l.ma} value={l.ma}>{l.ten}</option>
            ))}
          </select>
        </div>
        <div className="o-nhap-ngang">
          <input id="hlkh" type="checkbox" checked={huong_luong}
            onChange={(e) => dat_huong_luong(e.target.checked)} />
          <label htmlFor="hlkh">Hưởng lương (tính công cho cả đợt)</label>
        </div>
        <div className="hang-nut">
          <button type="submit" className="nut-chinh" disabled={hd.dang_chay}>
            {hd.dang_chay ? 'Đang lưu…' : 'Lưu đợt nghỉ'}
          </button>
          <button type="button" onClick={khi_dong}>Hủy</button>
        </div>
      </form>
    </HopThoai>
  );
}

// ------------------------------------------------------------ Tab 3: Noi lam viec
function TabNoiLamViec(): ReactNode {
  const [sua, dat_sua] = useState<NoiLamViec | null>(null);
  const [dang_them, dat_dang_them] = useState(false);
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<NoiLamViec[]>('/api/noi-lam-viec');

  return (
    <>
      <div className="dau-trang">
        <p className="mo-ta">
          Mỗi <strong>nơi làm việc</strong> gắn một lịch nghỉ lễ. Gán nhân viên vào nơi làm việc ở
          trang Nhân viên → nghỉ lễ tự áp đúng lịch (VN/TQ).
        </p>
        {la_nhan_su() && (
          <button className="nut-chinh" onClick={() => dat_dang_them(true)}>+ Thêm nơi làm việc</button>
        )}
      </div>

      <HopLoi loi={loi} />

      <div className="the the-mong">
        {dang_tai ? <DangTai /> : (du_lieu ?? []).length === 0 ? (
          <Trong tieu_de="Chưa khai nơi làm việc nào" />
        ) : (
          <div className="vo-bang">
            <table>
              <thead>
                <tr><th>Tên</th><th>Lịch nghỉ</th><th>Địa chỉ</th><th>Số người</th>
                  <th>Trạng thái</th>{la_nhan_su() && <th></th>}</tr>
              </thead>
              <tbody>
                {(du_lieu ?? []).map((n) => (
                  <tr key={n.id}>
                    <td>{n.ten}</td>
                    <td><NhanLich ma={n.lich_nghi_ma} ten={n.lich_ten} /></td>
                    <td>{n.dia_chi ?? '—'}</td>
                    <td>{n.so_nguoi}</td>
                    <td>{n.dang_dung
                      ? <span className="nhan nhan-tot">đang dùng</span>
                      : <span className="nhan nhan-mo">tắt</span>}</td>
                    {la_nhan_su() && (
                      <td><button className="nut-nho nut-phang" onClick={() => dat_sua(n)}>Sửa</button></td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(dang_them || sua !== null) && (
        <FormNoiLamViec noi={sua}
          khi_dong={() => { dat_dang_them(false); dat_sua(null); }}
          khi_xong={() => { dat_dang_them(false); dat_sua(null); nap_lai(); }} />
      )}
    </>
  );
}

function FormNoiLamViec(
  { noi, khi_dong, khi_xong }: { noi: NoiLamViec | null; khi_dong: () => void; khi_xong: () => void },
): ReactNode {
  const [ten, dat_ten] = useState(noi?.ten ?? '');
  const [lich_nghi_ma, dat_lich] = useState(noi?.lich_nghi_ma ?? 'vn');
  const [dia_chi, dat_dia_chi] = useState(noi?.dia_chi ?? '');
  const [dang_dung, dat_dang_dung] = useState(noi?.dang_dung ?? true);
  const { du_lieu: lichs } = dung_nap<Lich[]>('/api/lich-nghi');
  const hd = dung_hanh_dong();

  const gui = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const body = { ten: ten.trim(), lich_nghi_ma, dia_chi: dia_chi.trim(), dang_dung };
    const ok = await hd.chay(() => noi === null
      ? goi('/api/noi-lam-viec', { method: 'POST', body })
      : goi(`/api/noi-lam-viec/${noi.id}`, { method: 'PUT', body }));
    if (ok) khi_xong();
  };

  return (
    <HopThoai tieu_de={noi === null ? 'Thêm nơi làm việc' : 'Sửa nơi làm việc'} khi_dong={khi_dong}>
      <form onSubmit={gui}>
        <HopLoi loi={hd.loi} />
        <div className="o-nhap">
          <label htmlFor="tennlv">Tên nơi làm việc *</label>
          <input id="tennlv" value={ten} onChange={(e) => dat_ten(e.target.value)}
            placeholder="Văn phòng Hà Nội" required autoFocus />
        </div>
        <div className="o-nhap">
          <label htmlFor="lichnlv">Lịch nghỉ lễ *</label>
          <select id="lichnlv" value={lich_nghi_ma} onChange={(e) => dat_lich(e.target.value)}>
            {(lichs ?? [{ ma: 'vn', ten: 'Việt Nam' } as Lich]).map((l) => (
              <option key={l.ma} value={l.ma}>{l.ten}</option>
            ))}
          </select>
        </div>
        <div className="o-nhap">
          <label htmlFor="dcnlv">Địa chỉ</label>
          <input id="dcnlv" value={dia_chi} onChange={(e) => dat_dia_chi(e.target.value)}
            placeholder="Tầng 4, 39 Galaxy 5, Hà Đông" />
        </div>
        <div className="o-nhap-ngang">
          <input id="ddnlv" type="checkbox" checked={dang_dung}
            onChange={(e) => dat_dang_dung(e.target.checked)} />
          <label htmlFor="ddnlv">Đang dùng</label>
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
