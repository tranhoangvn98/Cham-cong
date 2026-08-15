// Tham so phap ly de tinh luong: ty le trich bao hiem, tran dong, giam tru gia canh,
// bieu thue TNCN.
//
// Trang nay quyet dinh so tien tru cua CA CONG TY. Ba dieu no phai lam that ro:
//
//   1. Khong sua tai cho. Moi lan doi la mot BO MOI co ngay hieu luc rieng. Nho vay tinh
//      lai luong thang cu van ra dung so cu, du luat da doi tu do den nay.
//   2. Noi ro he thong gieo san muc nao, va nguoi dung phai tu doi chieu — phan mem khong
//      biet Quoc hoi vua sua nghi quyet nao.
//   3. Hien du hai tran dong KHAC NHAU. Nham hai cai nay la sai tien voi nguoi luong cao,
//      va nhin bang so thi thay ngay.
import { useState, type ReactNode } from 'react';
import { goi } from '../api.ts';
import {
  DangTai, HopLoi, HopThoai, Trong, dung_hanh_dong, dung_nap, ngay_gio,
} from '../thanh_phan.tsx';

interface BacThue {
  bac: number;
  tu_muc: string;
  den_muc: string | null;
  thue_suat: string;
}

interface ThamSo {
  id: string;
  hieu_luc_tu: string;
  ten: string;
  luong_co_so: string;
  luong_toi_thieu_vung: string;
  vung: number;
  ty_le_bhxh_nld: string;
  ty_le_bhyt_nld: string;
  ty_le_bhtn_nld: string;
  ty_le_bhxh_nsdld: string;
  ty_le_bhyt_nsdld: string;
  ty_le_bhtn_nsdld: string;
  giam_tru_ban_than: string;
  giam_tru_phu_thuoc: string;
  can_cu: string | null;
  ghi_chu: string | null;
  tao_luc: string;
  bac_thue: BacThue[];
}

function tien(v: unknown): string {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n.toLocaleString('vi-VN', { maximumFractionDigits: 0 }) : '—';
}

function ngay(v: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  return m === null ? v : `${m[3]}/${m[2]}/${m[1]}`;
}

export function TrangThamSoLuong(): ReactNode {
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<ThamSo[]>('/api/tham-so-luong');
  const [dang_tao, dat_dang_tao] = useState<ThamSo | null>(null);
  const [tao_moi, dat_tao_moi] = useState(false);

  if (dang_tai) return <DangTai />;
  if (loi !== null) return <HopLoi loi={loi} />;
  const ds = du_lieu ?? [];
  // API tra theo hieu_luc_tu giam dan -> phan tu dau la bo dang ap dung.
  const dang_dung = ds[0] ?? null;

  return (
    <>
      <div className="dau-trang">
        <div>
          <p className="mo-ta">
            Các mức luật định dùng để tính bảo hiểm và thuế trong bảng lương.
          </p>
        </div>
        <div className="hang-nut">
          <button onClick={() => dat_tao_moi(true)}>Thêm mốc hiệu lực</button>
        </div>
      </div>

      <div className="hop-luu-y">
        <strong>Phần mềm không tự biết luật đổi.</strong> Hệ thống gieo sẵn mức áp dụng từ
        01/7/2024. Kế toán phải đối chiếu lại với văn bản hiện hành trước khi trả lương thật.
        Khi có mức mới, <em>đừng sửa mốc cũ</em> — hãy thêm một mốc hiệu lực mới, để tính lại
        lương tháng cũ vẫn ra đúng số cũ.
      </div>

      {ds.length === 0 ? (
        <Trong
          tieu_de="Chưa có tham số nào"
          mo_ta="Không có tham số thì không tính được kỳ lương nào."
          hanh_dong={<button onClick={() => dat_tao_moi(true)}>Khai mốc đầu tiên</button>}
        />
      ) : (
        <>
          {dang_dung !== null && <ThePhepTinh ts={dang_dung} />}

          <h3>Các mốc hiệu lực</h3>
          <div className="vo-bang">
            <table>
              <thead>
                <tr>
                  <th>Hiệu lực từ</th>
                  <th>Tên</th>
                  <th className="canh-phai">Lương cơ sở</th>
                  <th className="canh-phai">Tối thiểu vùng</th>
                  <th className="canh-phai">Giảm trừ bản thân</th>
                  <th className="canh-phai">Mỗi phụ thuộc</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {ds.map((t, i) => (
                  <tr key={t.id}>
                    <td>
                      <strong>{ngay(t.hieu_luc_tu)}</strong>
                      {i === 0 && <span className="nhan-tot"> đang áp dụng</span>}
                    </td>
                    <td>{t.ten}</td>
                    <td className="canh-phai">{tien(t.luong_co_so)}</td>
                    <td className="canh-phai">{tien(t.luong_toi_thieu_vung)} (V{t.vung})</td>
                    <td className="canh-phai">{tien(t.giam_tru_ban_than)}</td>
                    <td className="canh-phai">{tien(t.giam_tru_phu_thuoc)}</td>
                    <td className="canh-phai">
                      <button className="nut-phang" onClick={() => dat_dang_tao(t)}>Xem</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {dang_tao !== null && (
        <HopThoaiChiTiet ts={dang_tao} khi_dong={() => dat_dang_tao(null)} />
      )}
      {tao_moi && (
        <HopThoaiThem
          mau={dang_dung}
          khi_dong={() => dat_tao_moi(false)}
          khi_xong={() => { dat_tao_moi(false); nap_lai(); }}
        />
      )}
    </>
  );
}

/**
 * Bay ra phep tinh dang duoc dung, bang so cu the.
 *
 * Muc dich: nguoi dung kiem tra duoc he thong hieu dung luat hay khong ma khong phai doc
 * ma nguon. Hai TRAN DONG de canh nhau vi day la cho hay bi nham nhat.
 */
function ThePhepTinh({ ts }: { ts: ThamSo }): ReactNode {
  const tran_bh = Number(ts.luong_co_so) * 20;
  const tran_tn = Number(ts.luong_toi_thieu_vung) * 20;
  const tong_nld = Number(ts.ty_le_bhxh_nld) + Number(ts.ty_le_bhyt_nld)
    + Number(ts.ty_le_bhtn_nld);
  const tong_cty = Number(ts.ty_le_bhxh_nsdld) + Number(ts.ty_le_bhyt_nsdld)
    + Number(ts.ty_le_bhtn_nsdld);

  return (
    <div className="the">
      <h3>Đang áp dụng — {ts.ten}</h3>

      <div className="ho-so-chi-so">
        <div className="o-so">
          <div className="o-so-nhan">Trần đóng BHXH / BHYT</div>
          <div className="o-so-gia-tri">{tien(tran_bh)} đ</div>
          <div className="o-so-phu">20 × lương cơ sở {tien(ts.luong_co_so)}</div>
        </div>
        <div className="o-so">
          <div className="o-so-nhan">Trần đóng BHTN</div>
          <div className="o-so-gia-tri">{tien(tran_tn)} đ</div>
          <div className="o-so-phu">
            20 × lương tối thiểu vùng {ts.vung} — <strong>khác trần trên</strong>
          </div>
        </div>
        <div className="o-so">
          <div className="o-so-nhan">Người lao động đóng</div>
          <div className="o-so-gia-tri">{tong_nld}%</div>
          <div className="o-so-phu">
            BHXH {ts.ty_le_bhxh_nld} + BHYT {ts.ty_le_bhyt_nld} + BHTN {ts.ty_le_bhtn_nld}
          </div>
        </div>
        <div className="o-so">
          <div className="o-so-nhan">Công ty đóng</div>
          <div className="o-so-gia-tri">{tong_cty}%</div>
          <div className="o-so-phu">
            BHXH {ts.ty_le_bhxh_nsdld} + BHYT {ts.ty_le_bhyt_nsdld} + BHTN {ts.ty_le_bhtn_nsdld}
          </div>
        </div>
        <div className="o-so">
          <div className="o-so-nhan">Giảm trừ bản thân</div>
          <div className="o-so-gia-tri">{tien(ts.giam_tru_ban_than)} đ</div>
          <div className="o-so-phu">mỗi tháng</div>
        </div>
        <div className="o-so">
          <div className="o-so-nhan">Mỗi người phụ thuộc</div>
          <div className="o-so-gia-tri">{tien(ts.giam_tru_phu_thuoc)} đ</div>
          <div className="o-so-phu">mỗi tháng, cần đã đăng ký</div>
        </div>
      </div>

      {ts.can_cu !== null && ts.can_cu !== '' && (
        <p className="mo-ta"><strong>Căn cứ:</strong> {ts.can_cu}</p>
      )}
    </div>
  );
}

function HopThoaiChiTiet(
  { ts, khi_dong }: { ts: ThamSo; khi_dong: () => void },
): ReactNode {
  return (
    <HopThoai tieu_de={`Tham số từ ${ngay(ts.hieu_luc_tu)}`} khi_dong={khi_dong} rong>
      <ThePhepTinh ts={ts} />

      <h3>Biểu thuế thu nhập cá nhân</h3>
      <p className="mo-ta">
        Lũy tiến từng phần: mỗi bậc chỉ đánh vào <em>phần thu nhập nằm trong bậc đó</em>,
        không phải toàn bộ thu nhập.
      </p>
      <table>
        <thead>
          <tr>
            <th>Bậc</th>
            <th className="canh-phai">Thu nhập tính thuế / tháng</th>
            <th className="canh-phai">Thuế suất</th>
          </tr>
        </thead>
        <tbody>
          {ts.bac_thue.map((b) => (
            <tr key={b.bac}>
              <td>{b.bac}</td>
              <td className="canh-phai">
                {b.den_muc === null
                  ? `Trên ${tien(b.tu_muc)}`
                  : `${tien(b.tu_muc)} – ${tien(b.den_muc)}`}
              </td>
              <td className="canh-phai">{Number(b.thue_suat)}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      {ts.ghi_chu !== null && ts.ghi_chu !== '' && (
        <p className="mo-ta"><strong>Ghi chú:</strong> {ts.ghi_chu}</p>
      )}
      <p className="mo-ta">Khai lúc {ngay_gio(ts.tao_luc)}</p>
    </HopThoai>
  );
}

/**
 * Them mot moc hieu luc moi.
 *
 * Dien san bang bo dang ap dung: khi luat doi thuong chi doi MOT hai con so (vd rieng muc
 * giam tru gia canh), bat go lai ca muoi truong la moi cho de sai.
 */
function HopThoaiThem(
  { mau, khi_dong, khi_xong }:
  { mau: ThamSo | null; khi_dong: () => void; khi_xong: () => void },
): ReactNode {
  const [f, dat_f] = useState({
    hieu_luc_tu: '',
    ten: '',
    luong_co_so: mau?.luong_co_so ?? '2340000',
    luong_toi_thieu_vung: mau?.luong_toi_thieu_vung ?? '4960000',
    vung: String(mau?.vung ?? 1),
    ty_le_bhxh_nld: mau?.ty_le_bhxh_nld ?? '8',
    ty_le_bhyt_nld: mau?.ty_le_bhyt_nld ?? '1.5',
    ty_le_bhtn_nld: mau?.ty_le_bhtn_nld ?? '1',
    ty_le_bhxh_nsdld: mau?.ty_le_bhxh_nsdld ?? '17.5',
    ty_le_bhyt_nsdld: mau?.ty_le_bhyt_nsdld ?? '3',
    ty_le_bhtn_nsdld: mau?.ty_le_bhtn_nsdld ?? '1',
    giam_tru_ban_than: mau?.giam_tru_ban_than ?? '11000000',
    giam_tru_phu_thuoc: mau?.giam_tru_phu_thuoc ?? '4400000',
    can_cu: '',
  });
  const hd = dung_hanh_dong();
  const dat = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    dat_f({ ...f, [k]: e.target.value });

  const so = (k: keyof typeof f): ReactNode => (
    <input type="number" step="any" min="0" value={f[k]} onChange={dat(k)} />
  );

  return (
    <HopThoai tieu_de="Thêm mốc hiệu lực mới" khi_dong={khi_dong} rong>
      {hd.loi !== null && <HopLoi loi={hd.loi} />}
      <p className="mo-ta">
        Điền sẵn theo mốc đang áp dụng — chỉ sửa những con số thực sự thay đổi. Kỳ lương
        lấy mốc có ngày hiệu lực lớn nhất mà không vượt quá ngày đầu tháng của kỳ.
      </p>

      <label htmlFor="hl">Hiệu lực từ ngày</label>
      <input id="hl" type="date" value={f.hieu_luc_tu} onChange={dat('hieu_luc_tu')} />

      <label htmlFor="ten">Tên gọi</label>
      <input id="ten" value={f.ten} onChange={dat('ten')}
        placeholder="VD: Mức áp dụng từ 01/7/2026" />

      <h3>Mức luật định</h3>
      <label>Lương cơ sở (đ) — trần đóng BHXH/BHYT bằng 20 lần mức này</label>
      {so('luong_co_so')}
      <label>Lương tối thiểu vùng (đ) — trần đóng BHTN bằng 20 lần mức này</label>
      {so('luong_toi_thieu_vung')}
      <label htmlFor="vung">Vùng</label>
      <select id="vung" value={f.vung} onChange={dat('vung')}>
        <option value="1">Vùng I</option>
        <option value="2">Vùng II</option>
        <option value="3">Vùng III</option>
        <option value="4">Vùng IV</option>
      </select>

      <h3>Tỷ lệ trích (%)</h3>
      <label>BHXH — người lao động</label>{so('ty_le_bhxh_nld')}
      <label>BHYT — người lao động</label>{so('ty_le_bhyt_nld')}
      <label>BHTN — người lao động</label>{so('ty_le_bhtn_nld')}
      <label>BHXH — công ty</label>{so('ty_le_bhxh_nsdld')}
      <label>BHYT — công ty</label>{so('ty_le_bhyt_nsdld')}
      <label>BHTN — công ty</label>{so('ty_le_bhtn_nsdld')}

      <h3>Giảm trừ gia cảnh (đ/tháng)</h3>
      <label>Bản thân người nộp thuế</label>{so('giam_tru_ban_than')}
      <label>Mỗi người phụ thuộc</label>{so('giam_tru_phu_thuoc')}

      <label htmlFor="cc">Căn cứ pháp lý</label>
      <input id="cc" value={f.can_cu} onChange={dat('can_cu')}
        placeholder="VD: Nghị định 73/2024/NĐ-CP, Nghị quyết 954/2020/UBTVQH14" />
      <p className="mo-ta">
        Ghi rõ văn bản để người sau đối chiếu được, không phải tra lại từ đầu.
      </p>

      <p className="mo-ta">
        Biểu thuế TNCN được <strong>sao chép từ mốc gần nhất</strong>. Thuế suất ít đổi hơn
        giảm trừ gia cảnh, nên không bắt gõ lại 7 bậc mỗi lần.
      </p>

      <div className="hang-nut">
        <button
          disabled={hd.dang_chay || f.hieu_luc_tu === '' || f.ten.trim() === ''}
          onClick={() => void hd.chay(
            () => goi('/api/tham-so-luong', {
              method: 'POST',
              body: { ...f, vung: Number(f.vung) },
            }),
            'Đã thêm mốc hiệu lực. Tính lại kỳ lương để áp dụng.',
          ).then((ok) => { if (ok !== null) khi_xong(); })}
        >
          Lưu
        </button>
        <button className="nut-phang" onClick={khi_dong}>Hủy</button>
      </div>
    </HopThoai>
  );
}
