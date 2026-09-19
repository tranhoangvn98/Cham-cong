// Trang "Van ban AI" (quan tri) — soan van ban ND30 bang AI, duyet va ban hanh.
//
// Luong 5 buoc hien len day thanh 3 cot:
//   - Form tao: nhap noi dung THO + loai + pham vi + muc dich. Che do "Tu soan" (fallback
//     khong-LLM) cho nhap thang van xuoi khi mat AI.
//   - Danh sach ban nhap: trang thai (dang_soan -> cho_duyet -> cho_ky -> da_phat_hanh / loi),
//     ket qua gate, nut hanh dong theo tung trang thai.
//   - Chi tiet: xem docx du thao (watermark DU THAO), sua van xuoi, viet lai bang AI,
//     trinh ky, ban hanh (cap so), huy.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  DangTai, HopLoi, HopTot, HopThoai, Trong, dung_hanh_dong, dung_nap, khoa_tinh, ngay_gio,
} from '../thanh_phan.tsx';
import { goi, tai_tep, tai_tep_blob } from '../api.ts';
import { lay_qd_nghi_viec } from '../dieu_huong_sau.ts';

type KieuVanBan = 'thong_bao' | 'quyet_dinh' | 'cong_van';
type PhamVi = 'ca_nhan' | 'phong_ban' | 'toan_cong_ty';

interface KetQuaGate {
  ma_check: string;
  dat: boolean;
  ly_do: string;
  loai_loi: 'code' | 'llm';
}

interface NhapAI {
  id: string;
  ma: string;
  loai: KieuVanBan;
  pham_vi: PhamVi;
  quan_he: 'noi_bo' | 'doi_ngoai';
  muc_dich: string;
  muc_do: 'thuong' | 'quan_trong' | 'khan';
  che_do: 'ai' | 'tu_soan';
  trang_thai: string;
  so_lan_thu: number;
  so_ky_hieu: string | null;
  thong_bao_id: string | null;
  tao_luc: string;
  cap_nhat_luc: string;
  nhan_vien: string | null;
  phong_ban: string | null;
  la_qd_nghi_viec: boolean;
  ngay_nghi_viec: string | null;
  co_tep: boolean;
  so_muc_gate: number;
}

interface SpecVanBan {
  loai: KieuVanBan;
  pham_vi: PhamVi;
  quan_he: 'noi_bo' | 'doi_ngoai';
  co_quan_ban_hanh: string;
  dia_danh: string;
  ngay: string;
  ten_loai: string;
  trich_yeu: string;
  kinh_gui: string[];
  can_cu: string[];
  dieu: string[];
  noi_dung: string[];
  nguoi_ky: string;
  chuc_vu_nguoi_ky: string;
  noi_nhan: string[];
  so_ky_hieu: string | null;
  du_thao: boolean;
}

interface ChiTietNhap extends NhapAI {
  ket_qua_gate: KetQuaGate[] | null;
  spec_json: SpecVanBan | null;
  noi_dung_tho: string;
  can_giai_trinh: boolean;
  het_han: string | null;
  nghi_viec_da_chay_luc: string | null;
  ten_luu_docx: string | null;
  can_hai_cap: boolean;
  da_gui_email: boolean;
  gui_email_luc: string | null;
  gui_email_loi: string | null;
}

const NHAN_TRANG_THAI: Record<string, string> = {
  dang_soan: 'Đang soạn', cho_duyet: 'Chờ duyệt', cho_ky: 'Chờ ký', loi: 'Lỗi',
  da_phat_hanh: 'Đã phát hành', huy: 'Đã hủy',
};
const NHAN_LOAI: Record<KieuVanBan, string> = {
  thong_bao: 'Thông báo', quyet_dinh: 'Quyết định', cong_van: 'Công văn',
};
const NHAN_PHAM_VI: Record<PhamVi, string> = {
  ca_nhan: 'Cá nhân', phong_ban: 'Phòng ban', toan_cong_ty: 'Toàn công ty',
};
const NHAN_MUC_DICH: Record<string, string> = {
  nhac_nho: 'Nhắc nhở', yeu_cau: 'Yêu cầu', pho_bien: 'Phổ biến', moi_hop: 'Mời họp',
  phoi_hop: 'Đề nghị phối hợp',
};

interface NhanVienGon { id: string; ho_ten: string; phong_ban: string | null; }
interface PhongBanGon { id: string; ten: string; }

// ==================================================================== form tao
function FormTao(
  { khi_xong, mac_dinh }:
  { khi_xong: () => void; mac_dinh?: { nhan_vien_id: string } | null },
): ReactNode {
  const [mo, dat_mo] = useState(false);
  const [loai, dat_loai] = useState<KieuVanBan>('thong_bao');
  const [pham_vi, dat_pham_vi] = useState<PhamVi>('toan_cong_ty');
  const [quan_he, dat_quan_he] = useState<'noi_bo' | 'doi_ngoai'>('noi_bo');
  const [muc_dich, dat_muc_dich] = useState('pho_bien');
  const [muc_do, dat_muc_do] = useState<'thuong' | 'quan_trong' | 'khan'>('thuong');
  const [can_gt, dat_can_gt] = useState(false);
  const [la_qd, dat_la_qd] = useState(false);
  const [ngay_nghi, dat_ngay_nghi] = useState('');
  const [het_han, dat_het_han] = useState('');
  const [che_do, dat_che_do] = useState<'ai' | 'tu_soan'>('ai');
  const [nhan_vien_id, dat_nhan_vien_id] = useState('');
  const [phong_ban_id, dat_phong_ban_id] = useState('');
  const [tho, dat_tho] = useState('');
  const [trich_yeu, dat_trich_yeu] = useState('');
  const [kinh_gui, dat_kinh_gui] = useState('');
  const [can_cu, dat_can_cu] = useState('');
  const [dieu, dat_dieu] = useState('');
  const [noi_dung, dat_noi_dung] = useState('');
  const hd = dung_hanh_dong();
  const [loi_vao, dat_loi_vao] = useState<string | null>(null);
  const nv = dung_nap<NhanVienGon[]>(mo ? '/api/nhan-vien' : null, []);
  const pb = dung_nap<PhongBanGon[]>(mo ? '/api/phong-ban' : null, []);

  const dat_lo = (g: string, doi: (v: KieuVanBan) => void): void => doi(g as KieuVanBan);

  // Tu trang ho so nhan vien (nut "Quyet dinh nghi viec"): mo san form voi loai=quyet_dinh,
  // pham_vi=ca_nhan, nguoi nhan = nhan vien do. Nguoi dung chi con chon ngay nghi + nhap van xoi.
  useEffect(() => {
    if (mac_dinh === undefined || mac_dinh === null) return;
    dat_loai('quyet_dinh');
    dat_pham_vi('ca_nhan');
    dat_la_qd(true);
    dat_nhan_vien_id(mac_dinh.nhan_vien_id);
    dat_mo(true);
  }, [mac_dinh]);

  const gui = async (): Promise<void> => {
    if (pham_vi === 'ca_nhan' && nhan_vien_id === '') {
      dat_loi_vao('Phạm vi cá nhân phải chọn nhân viên nhận.');
      return;
    }
    if (pham_vi === 'phong_ban' && phong_ban_id === '') {
      dat_loi_vao('Phạm vi phòng ban phải chọn phòng ban.');
      return;
    }
    if (la_qd && ngay_nghi === '') {
      dat_loi_vao('Quyết định nghỉ việc phải có ngày nghỉ việc.');
      return;
    }
    dat_loi_vao(null);
    const than: Record<string, unknown> = {
      loai, pham_vi, quan_he, muc_dich, muc_do, can_giai_trinh: can_gt, che_do,
      nhan_vien_id: pham_vi === 'ca_nhan' ? nhan_vien_id : null,
      phong_ban_id: pham_vi === 'phong_ban' ? phong_ban_id : null,
      het_han: het_han === '' ? null : het_han,
      la_qd_nghi_viec: la_qd,
      ngay_nghi_viec: ngay_nghi === '' ? null : ngay_nghi,
    };
    if (che_do === 'ai') {
      than['noi_dung_tho'] = tho;
    } else {
      than['trich_yeu'] = trich_yeu;
      than['kinh_gui'] = kinh_gui.split(/[;,]|;\s/).map((s) => s.trim()).filter((s) => s !== '');
      than['can_cu'] = can_cu.split('\n').map((s) => s.trim()).filter((s) => s !== '');
      than['dieu'] = dieu.split('\n').map((s) => s.trim()).filter((s) => s !== '');
      than['noi_dung'] = noi_dung.split(/\n\s*\n/).map((s) => s.trim()).filter((s) => s !== '');
    }
    const ok = await hd.chay(
      () => goi('/api/thong-bao/ai/nhap', { method: 'POST', body: than }),
      'Đã tạo bản nháp. Hệ thống đang soạn văn bản…',
    );
    if (ok) {
      dat_tho(''); dat_trich_yeu(''); dat_kinh_gui(''); dat_can_cu(''); dat_dieu('');
      dat_noi_dung(''); dat_la_qd(false); dat_ngay_nghi(''); dat_mo(false); khi_xong();
    }
  };

  if (!mo) {
    return (
      <div className="tb-dang-thanh">
        <button onClick={() => dat_mo(true)}>+ Soạn văn bản bằng AI</button>
      </div>
    );
  }

  const can_gui = che_do === 'ai'
    ? tho.trim().length >= 3
    : trich_yeu.trim().length >= 3 && noi_dung.trim().length >= 3;

  return (
    <HopThoai tieu_de="Soạn văn bản mới" khi_dong={() => dat_mo(false)} rong>
      <HopLoi loi={loi_vao ?? hd.loi} />
      <HopTot chu={hd.tot} />
      <div className="tb-dang-hang">
        <label className="truong"><span>Loại văn bản</span>
          <select value={loai} onChange={(e) => dat_lo(e.target.value, dat_loai)}>
            <option value="thong_bao">Thông báo</option>
            <option value="quyet_dinh">Quyết định</option>
            <option value="cong_van">Công văn</option>
          </select>
        </label>
        <label className="truong"><span>Phạm vi nhận</span>
          <select value={pham_vi} onChange={(e) => dat_pham_vi(e.target.value as PhamVi)}>
            <option value="toan_cong_ty">Toàn công ty</option>
            <option value="phong_ban">Phòng ban</option>
            <option value="ca_nhan">Cá nhân</option>
          </select>
        </label>
        <label className="truong"><span>Quan hệ</span>
          <select value={quan_he} onChange={(e) => dat_quan_he(e.target.value as 'noi_bo' | 'doi_ngoai')}>
            <option value="noi_bo">Nội bộ</option>
            <option value="doi_ngoai">Đối ngoại</option>
          </select>
        </label>
        <label className="truong"><span>Mục đích</span>
          <select value={muc_dich} onChange={(e) => dat_muc_dich(e.target.value)}>
            {Object.entries(NHAN_MUC_DICH).map(([m, ten]) => (
              <option key={m} value={m}>{ten}</option>
            ))}
          </select>
        </label>
      </div>
      {pham_vi === 'phong_ban' && (
        <label className="truong"><span>Phòng ban nhận</span>
          <select value={phong_ban_id} onChange={(e) => dat_phong_ban_id(e.target.value)}>
            <option value="">— Chọn phòng ban —</option>
            {(pb.du_lieu ?? []).map((p) => <option key={p.id} value={p.id}>{p.ten}</option>)}
          </select>
        </label>
      )}
      {pham_vi === 'ca_nhan' && (
        <label className="truong"><span>Nhân viên nhận</span>
          <select value={nhan_vien_id} onChange={(e) => dat_nhan_vien_id(e.target.value)}>
            <option value="">— Chọn nhân viên —</option>
            {(nv.du_lieu ?? []).map((n) => (
              <option key={n.id} value={n.id}>
                {n.ho_ten}{n.phong_ban !== null ? ` — ${n.phong_ban}` : ''}
              </option>
            ))}
          </select>
        </label>
      )}
      {loai === 'quyet_dinh' && pham_vi === 'ca_nhan' && (
        <div className="tb-dang-hang" style={{ marginTop: 8 }}>
          <label className="truong-hang">
            <input type="checkbox" checked={la_qd}
              onChange={(e) => { dat_la_qd(e.target.checked); if (!e.target.checked) dat_ngay_nghi(''); }} />
            <span>Đây là quyết định nghỉ việc</span>
          </label>
          {la_qd && (
            <label className="truong"><span>Ngày nghỉ việc (tài khoản tự khóa sau ngày này)</span>
              <input type="date" value={ngay_nghi} onChange={(e) => dat_ngay_nghi(e.target.value)} />
            </label>
          )}
        </div>
      )}
      <div className="tb-dang-hang">
        <label className="truong"><span>Chế độ</span>
          <select value={che_do} onChange={(e) => dat_che_do(e.target.value as 'ai' | 'tu_soan')}>
            <option value="ai">AI soạn (nhập ý vắn tắt)</option>
            <option value="tu_soan">Tự soạn (không dùng AI)</option>
          </select>
        </label>
        <label className="truong"><span>Mức độ</span>
          <select value={muc_do} onChange={(e) => dat_muc_do(e.target.value as typeof muc_do)}>
            <option value="thuong">Thường</option>
            <option value="quan_trong">Quan trọng</option>
            <option value="khan">Khẩn</option>
          </select>
        </label>
        <label className="truong-hang">
          <input type="checkbox" checked={can_gt} onChange={(e) => dat_can_gt(e.target.checked)} />
          <span>Bắt buộc giải trình</span>
        </label>
        <label className="truong"><span>Hiệu lực đến (bỏ trống = không)</span>
          <input type="date" value={het_han} onChange={(e) => dat_het_han(e.target.value)} />
        </label>
      </div>
      {che_do === 'ai' ? (
        <label className="truong"><span>Nội dung thô (gạch đầu dòng cũng được)</span>
          <textarea rows={5} value={tho} onChange={(e) => dat_tho(e.target.value)}
            placeholder={'Ví dụ: Nghỉ lễ 2/9, đi làm bù sáng thứ 7\nĐổi phần mềm chấm công, ra vào phải quét vân tay…'} />
        </label>
      ) : (
        <>
          <label className="truong"><span>Trích yếu (công văn bắt đầu "V/v", thông báo/quyết định "Về việc")</span>
            <input value={trich_yeu} onChange={(e) => dat_trich_yeu(e.target.value)} /></label>
          {loai === 'cong_van' && (
            <label className="truong"><span>Kính gửi (nhiều nơi cách nhau dấu phẩy)</span>
              <input value={kinh_gui} onChange={(e) => dat_kinh_gui(e.target.value)} /></label>
          )}
          {loai === 'quyet_dinh' && (
            <>
              <label className="truong"><span>Căn cứ (mỗi dòng một căn cứ)</span>
                <textarea rows={2} value={can_cu} onChange={(e) => dat_can_cu(e.target.value)} /></label>
              <label className="truong"><span>Nội dung các Điều (mỗi dòng một Điều)</span>
                <textarea rows={4} value={dieu} onChange={(e) => dat_dieu(e.target.value)} /></label>
            </>
          )}
          <label className="truong"><span>Nội dung (mỗi đoạn cách nhau một dòng trống)</span>
            <textarea rows={5} value={noi_dung} onChange={(e) => dat_noi_dung(e.target.value)} /></label>
        </>
      )}
      <div className="hang-nut">
        <button onClick={() => { void gui(); }} disabled={hd.dang_chay || !can_gui}>
          {hd.dang_chay ? 'Đang gửi…' : 'Tạo bản nháp'}
        </button>
        <button className="nut-phang" onClick={() => dat_mo(false)}>Hủy</button>
      </div>
    </HopThoai>
  );
}

// ==================================================================== chi tiet + hanh dong
/** '2026-09-08' -> 'ngày 08 tháng 09 năm 2026' — theo mau THVN: ngay va thang
 *  DEU co so 0 dang truoc (vd 'tháng 07' trong mau). */
function ngay_viet_van_ban(chuoi: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(chuoi);
  if (m === null) return chuoi;
  return `ngày ${m[3]} tháng ${m[2]} năm ${m[1]}`;
}

/** Chia ten co quan dai thanh 2 dong CAN BANG nhu mau THVN ('CÔNG TY TNHH TRẦN' /
 *  'HOÀNG VIỆT NAM'), khong cat roi cum phap ly ("CỔ PHẦN", "TNHH MTV"). */
function chia_ten_cong_ty(ten: string): string[] {
  const tu = ten.split(/\s+/);
  if (tu.length <= 3) return [ten];
  const cum = new Set(['CỔ PHẦN', 'TNHH MTV']);
  const tong = tu.reduce((s, t) => s + t.length, 0);
  let diem = 1;
  let lech_tot: number | null = null;
  for (let i = 1; i < tu.length; i++) {
    const cap = `${(tu[i - 1] ?? '').toUpperCase()} ${(tu[i] ?? '').toUpperCase()}`;
    if (cum.has(cap)) continue;
    const d1 = tu.slice(0, i).reduce((s, t) => s + t.length, 0) + (i - 1);
    const d2 = tong - tu.slice(0, i).reduce((s, t) => s + t.length, 0) + (tu.length - i - 1);
    const lech = Math.abs(d1 - d2);
    if (lech_tot === null || lech < lech_tot) { lech_tot = lech; diem = i; }
  }
  return [tu.slice(0, diem).join(' '), tu.slice(diem).join(' ')];
}

/** Khuon xem truoc van ban — dung chinh spec ma docx sinh tu no nen khong lech. */
function XemTruocVanBan({ s }: { s: SpecVanBan }): ReactNode {
  return (
    <div className="xem-truoc-van-ban">
      <div className="xvt-dau-thu">
        <div className="xvt-cot-trai">
          {chia_ten_cong_ty(s.co_quan_ban_hanh).map((d, i) => (
            <div key={`tcq-${i}`} className="xvt-in-dam">{d}</div>
          ))}
          <div className="xvt-gach-cot-trai" />
          <div className="xvt-so">{s.so_ky_hieu === null
            ? <span className="xvt-du-thao">Số: DỰ THẢO</span>
            : <span>Số: {s.so_ky_hieu}</span>}</div>
        </div>
        <div className="xvt-cot-phai">
          <div>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
          <div className="xvt-tieu-ngu">Độc lập – Tự do – Hạnh phúc</div>
          <div className="xvt-gach-cot-phai" />
          <div className="xvt-ngay"><em>{s.dia_danh}, {ngay_viet_van_ban(s.ngay)}</em></div>
        </div>
      </div>
      {s.loai === 'cong_van' ? (
        // D-09: trich yeu cong van dung, KHONG dam, sat trai, cach so ky hieu 6pt.
        <div className="xvt-tua-cv">{s.trich_yeu}</div>
      ) : (
        <div className="xvt-tua">
          <div className="xvt-in-dam">{s.ten_loai}</div>
          <div className="xvt-in-dam">{s.trich_yeu}</div>
          {/* B-14: duong ke duoi trich yeu, ~1/3-1/2, can doi o giua. */}
          <div className="xvt-gach-tua" />
        </div>
      )}
      {s.loai === 'cong_van' && s.kinh_gui.length > 0 && (
        s.kinh_gui.length === 1
          ? <div className="xvt-kinh-gui">Kính gửi: {s.kinh_gui[0]}</div>
          : (
            // I-05: gui tu 2 noi tro len — moi noi mot dong, cuoi ";", dong cuoi ".".
            <div className="xvt-kinh-gui">
              <div>Kính gửi:</div>
              {s.kinh_gui.map((n, i) => (
                <div className="xvt-kinh-gui-dong" key={`kg-${i}`}>
                  - {n}{i === s.kinh_gui.length - 1 ? '.' : ';'}
                </div>
              ))}
            </div>
          )
      )}
      {s.can_cu.length > 0 && (
        // D-11 can cu nghieng; H-08 cuoi dong ";", dong cuoi ".". Dong "Theo đề nghị"
        // khong them tien to "Căn cứ".
        <div className="xvt-khoi">
          {s.can_cu.map((c, i) => {
            const thuan = c.replace(/^căn cứ\s+/i, '');
            const tien_to = /^theo\s+đề nghị/i.test(thuan) ? '' : 'Căn cứ ';
            return (
              <p className="xvt-can-cu" key={`cc-${i}`}>
                {tien_to}{thuan}{i === s.can_cu.length - 1 ? '.' : ';'}
              </p>
            );
          })}
        </div>
      )}
      <div className="xvt-khoi">
        {s.noi_dung.map((x, i) => {
          // Dong "QUYẾT ĐỊNH:" dung rieng (AI viet thanh doan) in dam can giua,
          // giong ban docx.
          const danh_dau = /^quyết\s*định\s*:?$/i.test(x.trim());
          return <p key={`nd-${i}`} className={danh_dau ? 'xvt-quyet-dinh' : undefined}>{x}</p>;
        })}
      </div>
      {s.dieu.length > 0 && (
        <div className="xvt-khoi">
          {s.dieu.map((x, i) => {
            const m = /^(\S+?[.:])\s*/u.exec(x);
            return m === null
              ? <p key={`dieu-${i}`}>{x}</p>
              : <p key={`dieu-${i}`}><strong>{m[1]}</strong> {x.slice(m[0].length)}</p>;
          })}
        </div>
      )}
      <div className="xvt-ky">
        <div className="xvt-noi-nhan">
          {s.noi_nhan.length > 0 && (
            <>
              <div>Nơi nhận:</div>
              {s.noi_nhan.map((n, i) => <div key={`nn-${i}`}>– {n}</div>)}
            </>
          )}
        </div>
        <div className="xvt-nguoi-ky">
          <div className="xvt-in-dam">{s.chuc_vu_nguoi_ky}</div>
          <div><em>(Ký, ghi rõ họ tên)</em></div>
          <div className="xvt-in-dam">{s.nguoi_ky}</div>
        </div>
      </div>
    </div>
  );
}

function KetQuaGateBang({ kq }: { kq: KetQuaGate[] }): ReactNode {
  if (kq.length === 0) return <span className="mo-ta">Chưa có kết quả gate.</span>;
  const loi = kq.filter((k) => !k.dat);
  return (
    <div>
      {loi.length === 0
        ? <div className="hop-thong-bao hop-tot">Mọi cổng kiểm tra đạt (✓).</div>
        : (
          <table className="bang-gon">
            <thead><tr><th>Mã</th><th>Kết quả</th><th>Lý do</th></tr></thead>
            <tbody>
              {loi.map((k) => (
                <tr key={k.ma_check}>
                  <td>{k.ma_check}</td>
                  <td>{k.loai_loi === 'llm' ? 'Lỗi AI' : 'Lỗi code'}</td>
                  <td>{k.ly_do}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
    </div>
  );
}

function ChiTiet({ id, khi_dong, khi_xong }: { id: string; khi_dong: () => void; khi_xong: () => void }): ReactNode {
  const { du_lieu: d, dang_tai, loi } = dung_nap<ChiTietNhap>(`/api/thong-bao/ai/${id}`, [id]);
  const hd = dung_hanh_dong();
  const [dang_sua, dat_dang_sua] = useState(false);
  const [xem_truoc, dat_xem_truoc] = useState(false);
  const [xem_docx, dat_xem_docx] = useState(false);
  const [dang_docx, dat_dang_docx] = useState(false);
  const [loi_docx, dat_loi_docx] = useState<string | null>(null);
  const o_docx = useRef<HTMLDivElement | null>(null);
  const [t_yeu, dat_t_yeu] = useState('');
  const [t_kinh, dat_t_kinh] = useState('');
  const [t_can_cu, dat_t_can_cu] = useState('');
  const [t_dieu, dat_t_dieu] = useState('');
  const [t_noi_dung, dat_t_noi_dung] = useState('');

  useEffect(() => {
    const s = d?.spec_json;
    dat_xem_truoc(false);
    dat_xem_docx(false);
    dat_loi_docx(null);
    if (s === null || s === undefined) return;
    dat_t_yeu(s.trich_yeu);
    dat_t_kinh(s.kinh_gui.join('; '));
    dat_t_can_cu(s.can_cu.join('\n'));
    dat_t_dieu(s.dieu.join('\n'));
    dat_t_noi_dung(s.noi_dung.join('\n\n'));
  }, [d]);

  /** Xem docx ngay tren web — render bang docx-preview vao the chua. */
  const mo_docx = async (): Promise<void> => {
    if (xem_docx) { dat_xem_docx(false); return; }
    dat_dang_docx(true);
    dat_loi_docx(null);
    dat_xem_docx(true);
    dat_xem_truoc(false);
    try {
      const { renderAsync } = await import('docx-preview');
      const blob = await tai_tep_blob(`/api/thong-bao/ai/${id}/xem`);
      if (o_docx.current === null) return;
      o_docx.current.innerHTML = '';
      await renderAsync(blob, o_docx.current);
      // Co trang docx cho VUA khung de khong phai cuon ngang: do chieu rong trang,
      // neu rong hon khung thi scale xuong cho khit, dong thoi co chieu cao choi cho
      // khong de lai khoang trang thua o duoi.
      const khung = o_docx.current;
      const trang = khung.querySelector<HTMLElement>('section.docx');
      if (trang !== null) {
        const rong_trang = trang.getBoundingClientRect().width;
        // Tru phan dem ngang cua khung (o-xem-docx: padding 24px moi ben).
        const rong_khung = khung.clientWidth - 48;
        if (rong_trang > rong_khung && rong_trang > 0) {
          // `zoom` thu nho CA dien tich cuon (khac transform chi thu hinh ve) nen
          // khong con thanh cuon ngang — trang vua khung, doc thang xuong.
          const he_so = rong_khung / rong_trang;
          const boc = trang.parentElement;
          if (boc !== null) {
            boc.style.zoom = String(he_so);
            boc.style.transformOrigin = 'top left';
          }
          khung.style.overflowX = 'hidden';
        }
      }
    } catch (loi) {
      dat_loi_docx(loi instanceof Error ? loi.message : 'Không mở được tệp DOCX.');
      dat_xem_docx(false);
    } finally {
      dat_dang_docx(false);
    }
  };

  const chay = (duong_dan: string, tot: string) => async (): Promise<void> => {
    const ok = await hd.chay(() => goi(duong_dan, { method: 'POST' }), tot);
    if (ok) khi_xong();
  };

  /** Gui lai email cua van ban da ban hanh (ban tu dong bi loi / chua khai MS_MAIL). */
  const gui_lai_email = async (): Promise<void> => {
    if (d === null || d.thong_bao_id === null) return;
    const ok = await hd.chay(
      () => goi(`/api/thong-bao/${d.thong_bao_id}/gui-email`, { method: 'POST' }),
      'Đã gửi email.',
    );
    if (ok) khi_xong();
  };

  if (dang_tai) return <DangTai />;
  if (loi !== null || d === null) return <HopLoi loi={loi ?? 'Không tải được chi tiết.'} />;

  const luu_sua = async (): Promise<void> => {
    const ok = await hd.chay(
      () => goi(`/api/thong-bao/ai/${id}/sua`, {
        method: 'PATCH',
        body: {
          trich_yeu: t_yeu,
          kinh_gui: t_kinh.split(/[;,]|;\s/).map((s) => s.trim()).filter((s) => s !== ''),
          can_cu: t_can_cu.split('\n').map((s) => s.trim()).filter((s) => s !== ''),
          dieu: t_dieu.split('\n').map((s) => s.trim()).filter((s) => s !== ''),
          noi_dung: t_noi_dung.split(/\n\s*\n/).map((s) => s.trim()).filter((s) => s !== ''),
        },
      }),
      'Đã lưu sửa đổi. Hệ thống đang dựng lại văn bản…',
    );
    if (ok) { dat_dang_sua(false); khi_xong(); }
  };

  const mo_xem_truoc = (): void => {
    dat_xem_truoc(!xem_truoc);
    dat_xem_docx(false);
  };

  /** Cot thong tin — dung chung cho ca bo cuc 1 cot va 2 cot. */
  const cot_thong_tin: ReactNode = (
    <>
      <div className="tb-dang-hang">
        <span className={`nhan-muc ${d.trang_thai === 'loi' ? 'nhan-muc-khan' : ''}`}>
          {NHAN_TRANG_THAI[d.trang_thai] ?? d.trang_thai}
        </span>
        <span className="mo-ta">Tạo {ngay_gio(d.tao_luc)}</span>
        <span className="mo-ta">{d.che_do === 'ai' ? 'AI soạn' : 'Tự soạn'}</span>
        <span className="mo-ta">{d.che_do === 'ai'
          ? `Số lần gọi lại AI: ${d.so_lan_thu}`
          : ''}</span>
        {d.so_ky_hieu !== null && <span className="nhan-muc">Số: {d.so_ky_hieu}</span>}
        {d.la_qd_nghi_viec && (
          <span className="nhan-muc nhan-muc-khan">
            Quyết định nghỉ việc{d.ngay_nghi_viec !== null ? ` — nghỉ ${d.ngay_nghi_viec}` : ''}
          </span>
        )}
        {d.la_qd_nghi_viec && d.trang_thai === 'da_phat_hanh' && (
          <span className="mo-ta">
            {d.nghi_viec_da_chay_luc !== null
              ? `Đã tự khóa tài khoản lúc ${ngay_gio(d.nghi_viec_da_chay_luc)}`
              : 'Tài khoản sẽ tự khóa sau ngày nghỉ việc.'}
          </span>
        )}
      </div>

      {d.trang_thai === 'loi' && d.ket_qua_gate !== null && (
        <div style={{ marginTop: 8 }}><KetQuaGateBang kq={d.ket_qua_gate} /></div>
      )}
      {['cho_duyet', 'cho_ky', 'da_phat_hanh'].includes(d.trang_thai)
        && d.ket_qua_gate !== null && d.ket_qua_gate.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <KetQuaGateBang kq={d.ket_qua_gate} />
          </div>
        )}

      {d.spec_json !== null && (
        <div className="hang-nut" style={{ marginTop: 12, flexWrap: 'wrap' }}>
          <button className="nut-phang" onClick={mo_xem_truoc}>
            {xem_truoc ? 'Ẩn xem trước' : 'Xem trước văn bản'}
          </button>
          {d.co_tep && (
            <button className="nut-phang"
              onClick={() => { void mo_docx(); }}
              disabled={dang_docx}>
              {dang_docx ? 'Đang mở…' : xem_docx ? 'Đóng DOCX online' : 'Xem DOCX online'}
            </button>
          )}
          {d.co_tep && (
            <button className="nut-phang"
              onClick={() => { void tai_tep(`/api/thong-bao/ai/${d.id}/xem`, `${d.ma}_${d.so_ky_hieu === null ? 'du_thao' : d.so_ky_hieu.replace('/', '-')}.docx`); }}>
              Tải văn bản (DOCX)
            </button>
          )}
        </div>
      )}

      {dang_sua && d.spec_json !== null ? (
        <div className="the" style={{ marginTop: 12 }}>
          <div className="canhan-muc-dau"><h3>Sửa văn xuôi</h3></div>
          <label className="truong"><span>Trích yếu</span>
            <input value={t_yeu} onChange={(e) => dat_t_yeu(e.target.value)} /></label>
          {d.loai === 'cong_van' && (
            <label className="truong"><span>Kính gửi</span>
              <input value={t_kinh} onChange={(e) => dat_t_kinh(e.target.value)} /></label>
          )}
          {d.loai === 'quyet_dinh' && (
            <>
              <label className="truong"><span>Căn cứ</span>
                <textarea rows={2} value={t_can_cu} onChange={(e) => dat_t_can_cu(e.target.value)} /></label>
              <label className="truong"><span>Các Điều</span>
                <textarea rows={4} value={t_dieu} onChange={(e) => dat_t_dieu(e.target.value)} /></label>
            </>
          )}
          <label className="truong"><span>Nội dung</span>
            <textarea rows={6} value={t_noi_dung} onChange={(e) => dat_t_noi_dung(e.target.value)} /></label>
          <div className="hang-nut">
            <button onClick={() => { void luu_sua(); }} disabled={hd.dang_chay}>
              {hd.dang_chay ? 'Đang lưu…' : 'Lưu & dựng lại'}
            </button>
            <button className="nut-phang" onClick={() => dat_dang_sua(false)}>Hủy</button>
          </div>
        </div>
      ) : (
        <div className="hang-nut" style={{ marginTop: 12, flexWrap: 'wrap' }}>
          {['cho_duyet', 'cho_ky'].includes(d.trang_thai) && (
            <button className="nut-phang" onClick={() => dat_dang_sua(true)}>Sửa văn xuôi</button>
          )}
          {['cho_duyet', 'cho_ky', 'loi'].includes(d.trang_thai) && (
            <button className="nut-phang" onClick={chay(`/api/thong-bao/ai/${d.id}/viet-lai`, 'Đã yêu cầu AI viết lại.')}>
              Viết lại bằng AI
            </button>
          )}
          {d.trang_thai === 'cho_duyet' && d.can_hai_cap && (
            <button onClick={chay(`/api/thong-bao/ai/${d.id}/trinh-ky`, 'Đã trình ký.')}>Trình ký</button>
          )}
          {(d.trang_thai === 'cho_duyet' && !d.can_hai_cap) || d.trang_thai === 'cho_ky' ? (
            <button onClick={chay(`/api/thong-bao/ai/${d.id}/phat-hanh`,
              d.la_qd_nghi_viec
                ? 'Đã ban hành. Quyết định đã lưu vào hồ sơ nhân viên; đến ngày nghỉ việc '
                  + 'tài khoản sẽ tự động bị khóa.'
                : 'Đã ban hành. Nhân viên đã nhận thông báo.')}>
              Ban hành (cấp số)
            </button>
          ) : null}
          {d.trang_thai !== 'da_phat_hanh' && d.trang_thai !== 'huy' && (
            <button className="nut-phang" onClick={chay(`/api/thong-bao/ai/${d.id}/huy`, 'Đã hủy bản nháp.')}>Hủy</button>
          )}
          {d.trang_thai === 'da_phat_hanh' && (
            <span className="mo-ta">Đã ban hành {d.so_ky_hieu !== null ? `với số ${d.so_ky_hieu}` : ''}.</span>
          )}
          {d.trang_thai === 'da_phat_hanh' && d.thong_bao_id !== null && (
            d.da_gui_email ? (
              <span className="mo-ta">
                ✉ Đã gửi email{d.gui_email_luc !== null ? ` · ${ngay_gio(d.gui_email_luc)}` : ''}
              </span>
            ) : (
              <div className="hang-nut" style={{ marginTop: 8 }}>
                <button className="nut-phang"
                  onClick={() => { void gui_lai_email(); }} disabled={hd.dang_chay}>
                  {hd.dang_chay ? 'Đang gửi…' : 'Gửi lại email'}
                </button>
                {d.gui_email_loi !== null && (
                  <span className="mo-ta">Chưa gửi được: {d.gui_email_loi}</span>
                )}
              </div>
            )
          )}
        </div>
      )}
      {d.che_do === 'ai' && d.trang_thai === 'loi' && d.spec_json === null && (
        <div className="hop-thong-bao hop-luu-y" style={{ marginTop: 12 }}>
          AI không soạn được. Hãy bấm "Sửa văn xuôi" không có tác dụng với bản này — hãy tạo bản
          nháp mới ở chế độ "Tự soạn" và nhập văn xuôi trực tiếp, hoặc bấm "Viết lại bằng AI".
        </div>
      )}
    </>
  );

  /** Cot van ban — noi hien thi van ban (xem truoc / docx online). */
  const cot_van_ban: ReactNode = xem_docx ? (
    <div className="the">
      {loi_docx !== null
        ? <HopLoi loi={loi_docx} />
        : <div className="o-xem-docx" ref={o_docx} />}
    </div>
  ) : xem_truoc && d.spec_json !== null ? (
    <div className="the">
      <XemTruocVanBan s={d.spec_json} />
    </div>
  ) : null;

  const dang_xem = xem_truoc || xem_docx;

  // Popup THU GON khi chi xem thong tin + hanh dong; TU MO RONG toan man hinh khi
  // hien thi van ban (xem truoc / docx online) — khoi can mot cua so kich thuoc khung lon.
  return (
    <HopThoai tieu_de={`${d.ma} — ${NHAN_LOAI[d.loai]} ${NHAN_PHAM_VI[d.pham_vi]}`}
      khi_dong={khi_dong} rong={!dang_xem} toan_man={dang_xem}>
      <HopLoi loi={hd.loi} />
      <HopTot chu={hd.tot} />
      {dang_xem ? (
        <div className="vbai-2-cot">
          <div className="vbai-cot-van">{cot_van_ban}</div>
          <div className="vbai-cot-thong-tin">{cot_thong_tin}</div>
        </div>
      ) : (
        <>
          {cot_van_ban}
          {cot_thong_tin}
        </>
      )}
    </HopThoai>
  );
}

// ==================================================================== trang chinh

/**
 * Tab "Van ban ban hanh" trong trang Van ban cong ty — chi nhân sự thay.
 * Form soan + bang ban nhap + chi tiet. KHONG co banner rieng: trang tong hop dang tieu de.
 */
export function TabVanBanBanHanh(): ReactNode {
  const { du_lieu, dang_tai, loi, nap_lai } = dung_nap<NhapAI[]>('/api/thong-bao/ai');
  const [xem, dat_xem] = useState<string | null>(null);
  const [lan, dat_lan] = useState(0);
  // Doc mot lan luc mount: nut o trang ho so dat muc tieu truoc khi dieu huong sang day.
  const [mac_dinh] = useState<{ nhan_vien_id: string } | null>(() => lay_qd_nghi_viec());

  const ds = du_lieu ?? [];
  const co_dang_soan = ds.some((d) => d.trang_thai === 'dang_soan');

  // Poll khi co ban nhap dang soan — worker xu ly mat vai giay.
  useEffect(() => {
    if (!co_dang_soan) return;
    const hen = setInterval(() => dat_lan((n) => n + 1), 3000);
    return () => clearInterval(hen);
  }, [co_dang_soan]);
  useEffect(() => {
    nap_lai();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lan]);

  if (dang_tai && du_lieu === null) return <DangTai />;
  if (loi !== null) return <HopLoi loi={loi} />;

  return (
    <div>
      <FormTao khi_xong={nap_lai} mac_dinh={mac_dinh} />
      {xem !== null && <ChiTiet id={xem} khi_dong={() => dat_xem(null)} khi_xong={nap_lai} />}
      {ds.length === 0
        ? <Trong tieu_de="Chưa có văn bản AI" mo_ta="Tạo bản nháp đầu tiên bằng nút phía trên." />
        : (
          <table className="bang-gon">
            <thead>
              <tr>
                <th>Mã</th><th>Loại</th><th>Phạm vi</th><th>Người nhận</th><th>Trạng thái</th>
                <th>Số ký hiệu</th><th>Cập nhật</th><th></th>
              </tr>
            </thead>
            <tbody>
              {ds.map((d, i) => (
                <tr key={khoa_tinh(d.id, i)}>
                  <td>{d.ma}</td>
                  <td>{d.la_qd_nghi_viec ? 'Quyết định nghỉ việc' : NHAN_LOAI[d.loai]}</td>
                  <td>{NHAN_PHAM_VI[d.pham_vi]}</td>
                  <td>
                    {d.nhan_vien ?? d.phong_ban ?? 'Toàn công ty'}
                    {d.la_qd_nghi_viec && d.ngay_nghi_viec !== null
                      ? ` · nghỉ ${d.ngay_nghi_viec}` : ''}
                  </td>
                  <td>{NHAN_TRANG_THAI[d.trang_thai] ?? d.trang_thai}</td>
                  <td>{d.so_ky_hieu ?? '—'}</td>
                  <td>{ngay_gio(d.cap_nhat_luc)}</td>
                  <td><button className="nut-nho nut-phang" onClick={() => dat_xem(d.id)}>Chi tiết</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
    </div>
  );
}
