// Cac trang cau hinh: ca lam viec, dia diem cham cong, ngay le.
import { useState, type ReactNode } from 'react';
import { goi, la_nhan_su } from '../api.ts';
import {
  DangTai, HopLoi, HopTot, HopThoai, Trong, dung_hanh_dong, dung_nap, ngay_viet, thu_cua_ngay,
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
  dang_hoat_dong: boolean;
}

// ============================================================ CA LAM VIEC
export function TrangCaLam(): ReactNode {
  const [dang_sua, dat_dang_sua] = useState<CaLam | null>(null);
  const [dang_them, dat_dang_them] = useState(false);
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<CaLam[]>('/api/ca-lam');
  const hd = dung_hanh_dong();

  const vo_hieu = async (c: CaLam): Promise<void> => {
    if (!window.confirm(`Vô hiệu hóa ca "${c.ten}"? Bảng công cũ vẫn giữ nguyên.`)) return;
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
                  <th className="canh-phai">Ngưỡng OT</th>
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
                      {c.gio_vao.slice(0, 5)} → {c.gio_ra.slice(0, 5)}
                      {c.qua_dem && <span className="nhan nhan-lanh" style={{ marginLeft: 4 }}>qua đêm</span>}
                    </td>
                    <td className="khong-ngat so">
                      {c.nghi_tu === null ? '—' : `${c.nghi_tu.slice(0, 5)} → ${c.nghi_den?.slice(0, 5)}`}
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {c.cac_ngay_lam.map((t) => TEN_THU_NGAN[t]).join(', ')}
                    </td>
                    <td className="canh-phai so">{c.dung_sai_muon_phut}p</td>
                    <td className="canh-phai so">{c.nguong_ot_phut}p</td>
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
      nguong_ot_phut: Number(f.nguong_ot_phut),
      phut_du_cong: Number(f.phut_du_cong),
      qua_dem: f.qua_dem,
      cac_ngay_lam: f.cac_ngay_lam,
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
            <label htmlFor="not">Ngưỡng tính OT (phút sau giờ tan ca)</label>
            <input id="not" type="number" min="0" max="480" value={f.nguong_ot_phut}
              onChange={(e) => doi('nguong_ot_phut', e.target.value)} />
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
                    <td className="so" style={{ fontSize: 12 }}>
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
  const hd = dung_hanh_dong();

  const lay_vi_tri_hien_tai = (): void => {
    if (!('geolocation' in navigator)) {
      window.alert('Trình duyệt này không hỗ trợ định vị.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (v) => {
        dat_vi_do(v.coords.latitude.toFixed(6));
        dat_kinh_do(v.coords.longitude.toFixed(6));
      },
      () => window.alert('Không lấy được vị trí. Hãy cho phép quyền định vị hoặc nhập tay.'),
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

        <button type="button" onClick={lay_vi_tri_hien_tai} style={{ marginBottom: 12 }}>
          Lấy vị trí hiện tại của máy này
        </button>

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

// ============================================================ NGAY LE
interface NgayLe { ngay: string; ten: string; huong_luong: boolean }

export function TrangNgayLe(): ReactNode {
  const nam_nay = new Date().getFullYear();
  const [nam, dat_nam] = useState(String(nam_nay));
  const [dang_them, dat_dang_them] = useState(false);
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<NgayLe[]>(`/api/ngay-le?nam=${nam}`);
  const hd = dung_hanh_dong();

  const xoa = async (ng: NgayLe): Promise<void> => {
    if (!window.confirm(`Xóa ngày lễ "${ng.ten}" (${ngay_viet(ng.ngay)})?`)) return;
    await hd.chay(
      () => goi(`/api/ngay-le/${ng.ngay}`, { method: 'DELETE' }),
      'Đã xóa và tính lại bảng công của ngày đó.',
    );
    nap_lai();
  };

  return (
    <>
      <div className="dau-trang">
        <div>
          <p className="mo-ta">
            Thêm/xóa ngày lễ sẽ tính lại bảng công của đúng ngày đó ngay lập tức.
          </p>
        </div>
        {la_nhan_su() && (
          <button className="nut-chinh" onClick={() => dat_dang_them(true)}>+ Thêm ngày lễ</button>
        )}
      </div>

      <div className="hop-thong-bao hop-luu-y">
        Chỉ các ngày lễ <strong>dương lịch cố định</strong> được tạo sẵn. Tết Nguyên đán và ngày nghỉ
        bù theo lịch âm phải tự thêm mỗi năm.
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
                  <th>Hưởng lương</th>
                  {la_nhan_su() && <th></th>}
                </tr>
              </thead>
              <tbody>
                {(du_lieu ?? []).map((n) => (
                  <tr key={n.ngay}>
                    <td className="khong-ngat">{thu_cua_ngay(n.ngay)} {ngay_viet(n.ngay)}</td>
                    <td>{n.ten}</td>
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
    </>
  );
}

function FormNgayLe({ khi_dong, khi_xong }: { khi_dong: () => void; khi_xong: () => void }): ReactNode {
  const [ngay, dat_ngay] = useState('');
  const [ten, dat_ten] = useState('');
  const [huong_luong, dat_huong_luong] = useState(true);
  const hd = dung_hanh_dong();

  const gui = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const ok = await hd.chay(() => goi('/api/ngay-le', {
      method: 'POST',
      body: { ngay, ten: ten.trim(), huong_luong },
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
