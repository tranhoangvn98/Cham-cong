// Chinh sach phu cap cua TUNG NGUOI.
//
// Trang nay ton tai vi mot ly do: phu cap khong phai thu doi hang thang. "Chị A được hỗ trợ gửi
// xe 200.000/tháng từ 01/8" la mot THOA THUAN, khong phai mot o tren bang luong thang 8. Neu
// nhan su phai go lai cho 53 nguoi moi ky thi vua mat thoi gian, vua mat luon cau tra loi cho
// "tu bao gio nguoi nay duoc huong khoan do".
//
// Nen o day: khai mot lan, co hieu luc tu mot ngay, va ky luong tu sinh dong khoan. Sua muc thi
// khong sua tai cho — dong dong cu lai va mo dong moi, giong quyet dinh luong.
import { useState, type ReactNode } from 'react';
import { goi } from '../api.ts';
import {
  DangTai, HopLoi, HopThoai, Trong, dung_hanh_dong, dung_nap,
  XuongDanhSach,
} from '../thanh_phan.tsx';

interface KhoanDanhMuc {
  ma: string;
  ten: string;
  loai: 'thu_nhap' | 'tru';
  cach_tinh: 'nhap_tay' | 'so_luong_x_don_gia' | 'nua_ngay_luong';
  don_gia: string | null;
  chiu_thue: boolean;
  canh_bao: string | null;
}

interface NhanVienGon {
  id: string;
  ma_nv: string;
  ho_ten: string;
  phong_ban: string | null;
  dang_hoat_dong: boolean;
}

interface ChinhSach {
  id: string;
  nhan_vien_id: string;
  ma_nv: string;
  ho_ten: string;
  phong_ban: string | null;
  khoan_ma: string;
  khoan_ten: string;
  loai: 'thu_nhap' | 'tru';
  cach_tinh: KhoanDanhMuc['cach_tinh'];
  chiu_thue: boolean;
  canh_bao: string | null;
  nguon_so_luong: 'co_dinh' | 'theo_cong';
  so_luong: string | null;
  so_tien: string | null;
  don_gia: string | null;
  don_gia_danh_muc: string | null;
  hieu_luc_tu: string;
  hieu_luc_den: string | null;
  ly_do: string | null;
  ghi_chu: string | null;
  nguoi_tao: string | null;
}

function tien(v: unknown): string {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n.toLocaleString('vi-VN', { maximumFractionDigits: 0 }) : '—';
}

function ngay(v: string | null): string {
  if (v === null) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  return m === null ? v : `${m[3]}/${m[2]}/${m[1]}`;
}

/** Hom nay dang YYYY-MM-DD, dung lam mac dinh cho o ngay. */
function hom_nay(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Mot dong chinh sach ra so tien nhu the nao — cau nay phai doc duoc ma khong mo hop thoai. */
function mo_ta_muc(cs: ChinhSach): ReactNode {
  if (cs.cach_tinh === 'nhap_tay') return <>{tien(cs.so_tien)} đ / tháng</>;

  const dg = cs.don_gia ?? cs.don_gia_danh_muc;
  const rieng = cs.don_gia !== null;

  if (cs.nguon_so_luong === 'theo_cong') {
    return (
      <>
        {tien(dg)} đ × <strong>số ngày công thực tế</strong>
        {rieng && <span className="nhan-canh-bao"> đơn giá riêng</span>}
      </>
    );
  }
  if (cs.cach_tinh === 'nua_ngay_luong') {
    return <>{Number(cs.so_luong)} lần × nửa ngày lương</>;
  }
  return (
    <>
      {Number(cs.so_luong)} × {tien(dg)} đ
      {rieng && <span className="nhan-canh-bao"> đơn giá riêng</span>}
    </>
  );
}

export function TrangPhuCap(): ReactNode {
  const [xem_lich_su, dat_xem_lich_su] = useState(false);
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<ChinhSach[]>(
    `/api/chinh-sach-phu-cap?con_hieu_luc=${xem_lich_su ? 'false' : 'true'}`,
  );
  const [gan, dat_gan] = useState(false);
  const [dong, dat_dong] = useState<ChinhSach | null>(null);
  const hd = dung_hanh_dong();

  if (dang_tai) return <XuongDanhSach />;
  if (loi !== null) return <HopLoi loi={loi} />;
  const ds = du_lieu ?? [];

  // Nhom theo nguoi: nhan su doc bang nay theo NGUOI, khong theo khoan.
  const theo_nguoi = new Map<string, ChinhSach[]>();
  for (const cs of ds) {
    const co = theo_nguoi.get(cs.nhan_vien_id);
    if (co === undefined) theo_nguoi.set(cs.nhan_vien_id, [cs]); else co.push(cs);
  }

  const xoa = (cs: ChinhSach) => (): void => {
    void hd.chay(
      () => goi(`/api/chinh-sach-phu-cap/${cs.id}`, { method: 'DELETE' }),
      'Đã xóa chính sách vừa khai.',
    ).then(() => nap_lai());
  };

  return (
    <>
      <div className="dau-trang">
        <div>
          <p className="mo-ta">
            Phụ cấp và khoản trừ định kỳ của từng người. Khai một lần, kỳ lương tự sinh khoản.
          </p>
        </div>
        <div className="hang-nut">
          <button onClick={() => dat_gan(true)} disabled={hd.dang_chay}>Gán phụ cấp</button>
          <button className="nut-phang" onClick={() => dat_xem_lich_su(!xem_lich_su)}>
            {xem_lich_su ? 'Chỉ xem đang hiệu lực' : 'Xem cả lịch sử'}
          </button>
        </div>
      </div>

      <div className="hop-luu-y">
        <strong>Không sửa tại chỗ.</strong> Đổi mức cho một người thì gán lại với ngày hiệu lực
        mới — dòng cũ tự đóng vào ngày trước đó và ở lại làm lịch sử. Nhờ vậy tính lại lương
        tháng cũ vẫn ra đúng số cũ, và câu &ldquo;từ bao giờ người này hưởng mức này&rdquo; luôn
        có câu trả lời.
        <br />
        Chính sách <em>không</em> tự sửa bảng lương đang mở: phải bấm <strong>Tính lương</strong>{' '}
        ở kỳ đó thì khoản mới xuất hiện.
      </div>

      {hd.loi !== null && <HopLoi loi={hd.loi} />}

      {ds.length === 0 ? (
        <Trong
          tieu_de={xem_lich_su ? 'Chưa có chính sách nào' : 'Chưa có chính sách nào đang hiệu lực'}
          mo_ta="Gán phụ cấp cho một hoặc nhiều người để kỳ lương tự sinh khoản."
          hanh_dong={<button onClick={() => dat_gan(true)}>Gán phụ cấp</button>}
        />
      ) : (
        <div className="vo-bang">
          <table className="bang-gon">
            <thead>
              <tr>
                <th>Nhân viên</th>
                <th>Khoản</th>
                <th>Mức</th>
                <th>Hiệu lực</th>
                <th>Lý do</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {[...theo_nguoi.values()].map((nhom) => nhom.map((cs, i) => (
                <tr key={cs.id} className={cs.hieu_luc_den === null ? undefined : 'mo-ta'}>
                  <td>
                    {i === 0 ? (
                      <>
                        <strong>{cs.ho_ten}</strong>
                        <div className="mo-ta">{cs.ma_nv}{cs.phong_ban === null ? '' : ` · ${cs.phong_ban}`}</div>
                      </>
                    ) : <span className="mo-ta">↳</span>}
                  </td>
                  <td>
                    {cs.khoan_ten}
                    {cs.loai === 'tru' && <span className="nhan-xau"> trừ</span>}
                    {!cs.chiu_thue && <span className="nhan-tot"> miễn thuế</span>}
                    {cs.canh_bao !== null && cs.canh_bao !== '' && (
                      <div className="hop-luu-y">{cs.canh_bao}</div>
                    )}
                  </td>
                  <td>{mo_ta_muc(cs)}</td>
                  <td className="khong-ngat">
                    {ngay(cs.hieu_luc_tu)} → {cs.hieu_luc_den === null
                      ? <span className="nhan-tot">nay</span>
                      : ngay(cs.hieu_luc_den)}
                  </td>
                  <td>{cs.ly_do ?? <span className="mo-ta">—</span>}</td>
                  <td className="canh-phai">
                    {cs.hieu_luc_den === null && (
                      <>
                        <button className="nut-nho" disabled={hd.dang_chay}
                          onClick={() => dat_dong(cs)}>Đóng</button>
                        <button className="nut-phang" disabled={hd.dang_chay} onClick={xoa(cs)}>
                          Xóa
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      )}

      {gan && (
        <HopThoaiGan khi_dong={() => dat_gan(false)}
          khi_xong={() => { dat_gan(false); nap_lai(); }} />
      )}
      {dong !== null && (
        <HopThoaiDong cs={dong} khi_dong={() => dat_dong(null)}
          khi_xong={() => { dat_dong(null); nap_lai(); }} />
      )}
    </>
  );
}

/**
 * Gan mot khoan cho mot hoac NHIEU nguoi.
 *
 * 53 nguoi cung huong phu cap an trua thi khong ai nen phai mo 53 hop thoai. Moi nguoi van ra
 * mot dong rieng — day chi la cach nhap nhanh, khong phai mot tang "chinh sach chung" thu hai
 * de sau nay khong biet so cua ai den tu dau.
 */
function HopThoaiGan(
  { khi_dong, khi_xong }: { khi_dong: () => void; khi_xong: () => void },
): ReactNode {
  const dm = dung_nap<KhoanDanhMuc[]>('/api/khoan-luong');
  const nv = dung_nap<NhanVienGon[]>('/api/nhan-vien');
  const [khoan_ma, dat_khoan_ma] = useState('');
  const [chon, dat_chon] = useState<Set<string>>(new Set());
  const [tim, dat_tim] = useState('');
  const [f, dat_f] = useState({
    nguon_so_luong: 'co_dinh', so_luong: '1', so_tien: '', don_gia: '',
    hieu_luc_tu: hom_nay(), ly_do: '',
  });
  const hd = dung_hanh_dong();
  const dat = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    dat_f({ ...f, [k]: e.target.value });

  if (dm.dang_tai || nv.dang_tai) {
    return <HopThoai tieu_de="Gán phụ cấp" khi_dong={khi_dong}><DangTai /></HopThoai>;
  }
  if (dm.loi !== null || nv.loi !== null) {
    return (
      <HopThoai tieu_de="Gán phụ cấp" khi_dong={khi_dong}>
        <HopLoi loi={dm.loi ?? nv.loi} />
      </HopThoai>
    );
  }

  const danh_muc = dm.du_lieu ?? [];
  const k = danh_muc.find((x) => x.ma === khoan_ma) ?? null;
  const go_tien = k !== null && k.cach_tinh === 'nhap_tay';

  const moi_nguoi = (nv.du_lieu ?? []).filter((x) => x.dang_hoat_dong);
  const loc = tim.trim().toLowerCase();
  const hien = loc === ''
    ? moi_nguoi
    : moi_nguoi.filter((x) =>
      x.ho_ten.toLowerCase().includes(loc)
      || x.ma_nv.toLowerCase().includes(loc)
      || (x.phong_ban ?? '').toLowerCase().includes(loc));

  const bat_tat = (id: string): void => {
    dat_chon((truoc) => {
      const sau = new Set(truoc);
      if (sau.has(id)) sau.delete(id); else sau.add(id);
      return sau;
    });
  };

  const du_dieu_kien = khoan_ma !== '' && chon.size > 0 && f.hieu_luc_tu !== ''
    && (go_tien ? Number(f.so_tien) > 0 : (f.nguon_so_luong === 'theo_cong' || Number(f.so_luong) > 0));

  return (
    <HopThoai tieu_de="Gán phụ cấp" khi_dong={khi_dong} rong>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}

      <label htmlFor="pc-khoan">Khoản</label>
      <select id="pc-khoan" value={khoan_ma} onChange={(e) => dat_khoan_ma(e.target.value)}>
        <option value="">— chọn khoản —</option>
        {danh_muc.map((x) => (
          <option key={x.ma} value={x.ma}>
            {x.loai === 'tru' ? '− ' : '+ '}{x.ten}
          </option>
        ))}
      </select>

      {k !== null && (
        <>
          {!k.chiu_thue && (
            <p className="mo-ta"><span className="nhan-tot">Miễn thuế</span> — khoản này không
              làm tăng thu nhập tính thuế TNCN.</p>
          )}
          {k.canh_bao !== null && k.canh_bao !== '' && (
            <div className="hop-luu-y">{k.canh_bao}</div>
          )}

          {go_tien ? (
            <>
              <label htmlFor="pc-tien">Số tiền mỗi tháng (đ)</label>
              <input id="pc-tien" type="number" min="0" step="any"
                value={f.so_tien} onChange={dat('so_tien')} />
            </>
          ) : (
            <>
              <label htmlFor="pc-nguon">Số lượng lấy từ</label>
              <select id="pc-nguon" value={f.nguon_so_luong} onChange={dat('nguon_so_luong')}>
                <option value="co_dinh">Số cố định mỗi tháng</option>
                <option value="theo_cong">Số ngày công thực tế của kỳ</option>
              </select>
              {f.nguon_so_luong === 'co_dinh' ? (
                <>
                  <label htmlFor="pc-sl">Số lượng mỗi tháng</label>
                  <input id="pc-sl" type="number" min="0" step="0.5"
                    value={f.so_luong} onChange={dat('so_luong')} />
                </>
              ) : (
                <p className="mo-ta">
                  Mỗi kỳ hệ thống lấy đúng số ngày công thực tế của từng người — đi làm ít ngày
                  thì hưởng ít, không ai phải sửa tay.
                </p>
              )}

              <label htmlFor="pc-dg">Đơn giá riêng (đ) — để trống thì lấy đơn giá danh mục</label>
              <input id="pc-dg" type="number" min="0" step="any"
                value={f.don_gia} onChange={dat('don_gia')}
                placeholder={k.don_gia === null ? '' : tien(k.don_gia)} />
              <p className="mo-ta">
                Đây là chỗ để một người hưởng mức khác cả công ty mà không phải tạo một khoản mới
                chỉ cho một người.
              </p>
            </>
          )}
        </>
      )}

      <label htmlFor="pc-tu">Hiệu lực từ ngày</label>
      <input id="pc-tu" type="date" value={f.hieu_luc_tu} onChange={dat('hieu_luc_tu')} />
      <p className="mo-ta">
        Kỳ lương nào có ngày giao với khoảng hiệu lực thì được hưởng — người vào làm giữa tháng
        vẫn tính đúng.
      </p>

      <label htmlFor="pc-lydo">Lý do / căn cứ</label>
      <input id="pc-lydo" value={f.ly_do} onChange={dat('ly_do')}
        placeholder="VD: Thỏa thuận hỗ trợ gửi xe từ 01/8" />

      <h3>Áp dụng cho ({chon.size} người)</h3>
      <input value={tim} onChange={(e) => dat_tim(e.target.value)}
        placeholder="Tìm theo tên, mã nhân viên hoặc phòng ban" aria-label="Tìm nhân viên" />
      <div className="hang-nut">
        <button className="nut-nho"
          onClick={() => dat_chon(new Set([...chon, ...hien.map((x) => x.id)]))}>
          Chọn {hien.length} người đang lọc
        </button>
        <button className="nut-phang" onClick={() => dat_chon(new Set())}>Bỏ chọn hết</button>
      </div>

      <div className="vo-bang" style={{ maxHeight: 260, overflowY: 'auto' }}>
        <table className="bang-gon">
          <tbody>
            {hien.map((x) => (
              <tr key={x.id}>
                <td style={{ width: 32 }}>
                  <input type="checkbox" checked={chon.has(x.id)}
                    aria-label={`Chọn ${x.ho_ten}`}
                    onChange={() => bat_tat(x.id)} />
                </td>
                <td>{x.ho_ten}</td>
                <td className="mo-ta">{x.ma_nv}</td>
                <td className="mo-ta">{x.phong_ban ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="hang-nut">
        <button
          disabled={hd.dang_chay || !du_dieu_kien}
          onClick={() => void hd.chay(
            () => goi('/api/chinh-sach-phu-cap/hang-loat', {
              method: 'POST',
              body: {
                nhan_vien_ids: [...chon],
                khoan_ma,
                nguon_so_luong: f.nguon_so_luong,
                so_luong: f.so_luong === '' ? null : Number(f.so_luong),
                so_tien: f.so_tien === '' ? null : Number(f.so_tien),
                don_gia: f.don_gia === '' ? null : Number(f.don_gia),
                hieu_luc_tu: f.hieu_luc_tu,
                ly_do: f.ly_do,
              },
            }),
            `Đã gán cho ${chon.size} người. Bấm "Tính lương" ở kỳ liên quan để áp dụng.`,
          ).then((ok) => { if (ok !== null) khi_xong(); })}
        >
          Gán cho {chon.size} người
        </button>
        <button className="nut-phang" onClick={khi_dong}>Hủy</button>
      </div>
    </HopThoai>
  );
}

/**
 * Dong mot chinh sach lai tu mot ngay.
 *
 * KHONG co duong xoa o day: bang luong thang truoc duoc tinh tu dong nay, va xoa no la lam mat
 * can cu cua mot so tien da tra.
 */
function HopThoaiDong(
  { cs, khi_dong, khi_xong }: { cs: ChinhSach; khi_dong: () => void; khi_xong: () => void },
): ReactNode {
  const [den, dat_den] = useState(hom_nay());
  const hd = dung_hanh_dong();

  return (
    <HopThoai tieu_de={`Đóng chính sách — ${cs.ho_ten}`} khi_dong={khi_dong}>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}
      <p className="mo-ta">
        <strong>{cs.khoan_ten}</strong>, hiệu lực từ {ngay(cs.hieu_luc_tu)}.
      </p>

      <label htmlFor="pc-den">Hưởng đến hết ngày</label>
      <input id="pc-den" type="date" value={den} onChange={(e) => dat_den(e.target.value)} />
      <p className="mo-ta">
        Kỳ lương nào còn giao với khoảng hiệu lực thì <em>vẫn</em> được hưởng. Dòng này ở lại làm
        lịch sử — đóng không phải là xóa.
      </p>

      <div className="hang-nut">
        <button
          disabled={hd.dang_chay || den === ''}
          onClick={() => void hd.chay(
            () => goi(`/api/chinh-sach-phu-cap/${cs.id}/dong`, {
              method: 'POST', body: { hieu_luc_den: den },
            }),
            'Đã đóng chính sách.',
          ).then((ok) => { if (ok !== null) khi_xong(); })}
        >
          Đóng
        </button>
        <button className="nut-phang" onClick={khi_dong}>Hủy</button>
      </div>
    </HopThoai>
  );
}
