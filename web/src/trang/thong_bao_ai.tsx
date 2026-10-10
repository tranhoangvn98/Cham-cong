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
  DangTai, HopLoi, HopTot, HopThoai, OKeoTep, Trong, dung_hanh_dong, dung_nap, khoa_tinh,
  ngay_gio,
} from '../thanh_phan.tsx';
import { goi, tai_tep, tai_tep_blob, gui_tep } from '../api.ts';
import { Chon } from '../chon.tsx';
import { lay_qd_nghi_viec } from '../dieu_huong_sau.ts';
import { dung_chuoi, tra_hien_tai, type ChuoiKhoa } from '../chuoi/chi_muc.tsx';

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
  trich_yeu: string | null;
  la_qd_nghi_viec: boolean;
  ngay_nghi_viec: string | null;
  co_tep: boolean;
  han_lay_y_kien: string | null;
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
  lay_y_kien_luc: string | null;
  han_lay_y_kien: string | null;
  tep_kem: { id: string; ten_goc: string; kich_thuoc: number }[];
  ten_luu_docx: string | null;
  can_hai_cap: boolean;
  da_gui_email: boolean;
  gui_email_luc: string | null;
  gui_email_loi: string | null;
}

const KHOA_TRANG_THAI: Record<string, ChuoiKhoa> = {
  dang_soan: 'vai_dang_soan', cho_duyet: 'vai_cho_duyet', cho_ky: 'vai_cho_ky', loi: 'vai_loi',
  dang_lay_y_kien: 'vai_dang_lay_y_kien', da_phat_hanh: 'vai_da_phat_hanh', huy: 'vai_da_huy',
};

/** Nhan trang thai van ban theo ngon ngu hien tai. */
export function nhan_trang_thai_vb(ma: string): string {
  const k = KHOA_TRANG_THAI[ma];
  return k !== undefined ? tra_hien_tai(k) : ma;
}

const KHOA_LOAI: Record<KieuVanBan, ChuoiKhoa> = {
  thong_bao: 'vai_loai_thong_bao', quyet_dinh: 'vai_loai_quyet_dinh', cong_van: 'vai_loai_cong_van',
};
const KHOA_PHAM_VI: Record<PhamVi, ChuoiKhoa> = {
  ca_nhan: 'vb_ca_nhan', phong_ban: 'vb_phong_ban', toan_cong_ty: 'vb_toan_cong_ty',
};
const KHOA_MUC_DICH: Record<string, ChuoiKhoa> = {
  nhac_nho: 'vai_md_nhac_nho', yeu_cau: 'vai_md_yeu_cau', pho_bien: 'vai_md_pho_bien',
  moi_hop: 'vai_md_moi_hop', phoi_hop: 'vai_md_phoi_hop',
};

/** So ngay con lai tu bay gio den han lay y kien (lam tron len, toi thieu 0). */
function con_ngay(han: string): number {
  const ms = Date.parse(han) - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

interface NhanVienGon { id: string; ho_ten: string; phong_ban: string | null; }
interface PhongBanGon { id: string; ten: string; }

// ==================================================================== form tao
function FormTao(
  { khi_xong, mac_dinh }:
  { khi_xong: (id_moi: string | null) => void; mac_dinh?: { nhan_vien_id: string } | null },
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
  const [tep, dat_tep] = useState<File[]>([]);
  const hd = dung_hanh_dong();
  const [loi_vao, dat_loi_vao] = useState<string | null>(null);
  const { tra } = dung_chuoi();
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
      dat_loi_vao(tra('vai_loi_chon_nhan_vien'));
      return;
    }
    if (pham_vi === 'phong_ban' && phong_ban_id === '') {
      dat_loi_vao(tra('vai_loi_chon_phong_ban'));
      return;
    }
    if (la_qd && ngay_nghi === '') {
      dat_loi_vao(tra('vai_loi_ngay_nghi_viec'));
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
    const kq = await hd.chay_lay<NhapAI>(
      () => goi<NhapAI>('/api/thong-bao/ai/nhap', { method: 'POST', body: than }),
      tra('vai_da_tao_ban_nhap'),
    );
    if (kq !== null) {
      // Tep dinh kem (neu co): tai len tung tep, loi thi giu modal mo de nguoi dung biet.
      if (tep.length > 0) {
        const ok_tep = await hd.chay(
          async () => {
            for (const t of tep) {
              const fd = new FormData();
              fd.append('tep', t);
              await gui_tep(`/api/thong-bao/ai/${kq.id}/tep-kem`, fd);
            }
          },
          tra('vai_da_tao_va_tai_tep'),
        );
        if (!ok_tep) return;
      }
      dat_tho(''); dat_trich_yeu(''); dat_kinh_gui(''); dat_can_cu(''); dat_dieu('');
      dat_noi_dung(''); dat_la_qd(false); dat_ngay_nghi(''); dat_tep([]);
      dat_mo(false); khi_xong(kq.id);
    }
  };

  if (!mo) {
    return (
      <div className="tb-dang-thanh">
        <button onClick={() => dat_mo(true)}>{tra('vai_soan_bang_ai')}</button>
      </div>
    );
  }

  const can_gui = che_do === 'ai'
    ? tho.trim().length >= 3
    : trich_yeu.trim().length >= 3 && noi_dung.trim().length >= 3;

  return (
    <HopThoai tieu_de={tra('vai_soan_van_ban_moi')} khi_dong={() => dat_mo(false)} rong>
      <HopLoi loi={loi_vao ?? hd.loi} />
      <HopTot chu={hd.tot} />
      <div className="soan-nhom">
        <div className="soan-tieu-de">{tra('vai_thong_tin_co_ban')}</div>
        <div className="soan-hang soan-hang-4">
          <label className="truong"><span>{tra('vai_loai_van_ban')}</span>
            <Chon gia_tri={loai} dat_gia_tri={(ma) => dat_lo(ma, dat_loai)}
              cac_tuy_chon={[
                { ma: 'thong_bao', nhan: tra('vai_loai_thong_bao') },
                { ma: 'quyet_dinh', nhan: tra('vai_loai_quyet_dinh') },
                { ma: 'cong_van', nhan: tra('vai_loai_cong_van') },
              ]}
              nhan={tra('vai_loai_van_ban')} />
          </label>
          <label className="truong"><span>{tra('vai_pham_vi_nhan')}</span>
            <Chon gia_tri={pham_vi} dat_gia_tri={(ma) => dat_pham_vi(ma as PhamVi)}
              cac_tuy_chon={[
                { ma: 'toan_cong_ty', nhan: tra('vb_toan_cong_ty') },
                { ma: 'phong_ban', nhan: tra('vb_phong_ban') },
                { ma: 'ca_nhan', nhan: tra('vb_ca_nhan') },
              ]}
              nhan={tra('vai_pham_vi_nhan')} />
          </label>
          <label className="truong"><span>{tra('vai_quan_he')}</span>
            <Chon gia_tri={quan_he}
              dat_gia_tri={(ma) => dat_quan_he(ma as 'noi_bo' | 'doi_ngoai')}
              cac_tuy_chon={[
                { ma: 'noi_bo', nhan: tra('vai_noi_bo') },
                { ma: 'doi_ngoai', nhan: tra('vai_doi_ngoai') },
              ]}
              nhan={tra('vai_quan_he_van_ban')} />
          </label>
          <label className="truong"><span>{tra('vai_muc_dich')}</span>
            <Chon gia_tri={muc_dich} dat_gia_tri={dat_muc_dich}
              cac_tuy_chon={Object.entries(KHOA_MUC_DICH).map(([m, khoa]) => ({
                ma: m, nhan: tra_hien_tai(khoa),
              }))}
              nhan={tra('vai_muc_dich_van_ban')} />
          </label>
        </div>
      </div>
      {(pham_vi === 'phong_ban' || pham_vi === 'ca_nhan') && (
        <div className="soan-nhom">
          <div className="soan-tieu-de">{tra('vai_nguoi_nhan')}</div>
          {pham_vi === 'phong_ban' && (
            <label className="truong"><span>{tra('vai_phong_ban_nhan')}</span>
              <Chon gia_tri={phong_ban_id} dat_gia_tri={dat_phong_ban_id}
                cac_tuy_chon={(pb.du_lieu ?? []).map((p) => ({ ma: p.id, nhan: p.ten }))}
                rong={tra('vai_chon_phong_ban_x')} nhan={tra('vai_phong_ban_nhan')} />
            </label>
          )}
          {pham_vi === 'ca_nhan' && (
            <label className="truong"><span>{tra('vai_nhan_vien_nhan')}</span>
              <Chon gia_tri={nhan_vien_id} dat_gia_tri={dat_nhan_vien_id}
                cac_tuy_chon={(nv.du_lieu ?? []).map((n) => ({
                  ma: n.id, nhan: `${n.ho_ten}${n.phong_ban !== null ? ` — ${n.phong_ban}` : ''}`,
                }))}
                rong={tra('vai_chon_nhan_vien_x')} nhan={tra('vai_nhan_vien_nhan')} />
            </label>
          )}
        </div>
      )}
      {loai === 'quyet_dinh' && pham_vi === 'ca_nhan' && (
        <div className="soan-nhom">
          <div className="soan-tieu-de">{tra('vai_qd_nghi_viec')}</div>
          <div className="soan-hang soan-hang-2">
            <label className="truong-hang">
              <input type="checkbox" checked={la_qd}
                onChange={(e) => { dat_la_qd(e.target.checked); if (!e.target.checked) dat_ngay_nghi(''); }} />
              <span>{tra('vai_la_qd_nghi_viec')}</span>
            </label>
            {la_qd && (
              <label className="truong"><span>{tra('vai_ngay_nghi_viec')}</span>
                <input type="date" value={ngay_nghi} onChange={(e) => dat_ngay_nghi(e.target.value)} />
              </label>
            )}
          </div>
        </div>
      )}
      <div className="soan-nhom">
        <div className="soan-tieu-de">{tra('vai_che_do_soan')}</div>
        <div className="soan-hang soan-hang-4">
          <label className="truong"><span>{tra('vai_che_do')}</span>
            <Chon gia_tri={che_do}
              dat_gia_tri={(ma) => dat_che_do(ma as 'ai' | 'tu_soan')}
              cac_tuy_chon={[
                { ma: 'ai', nhan: tra('vai_ai_soan') },
                { ma: 'tu_soan', nhan: tra('vai_tu_soan') },
              ]}
              nhan={tra('vai_che_do_soan')} />
          </label>
          <label className="truong"><span>{tra('tb_muc_do')}</span>
            <Chon gia_tri={muc_do}
              dat_gia_tri={(ma) => dat_muc_do(ma as typeof muc_do)}
              cac_tuy_chon={[
                { ma: 'thuong', nhan: tra('tb_thuong') },
                { ma: 'quan_trong', nhan: tra('tb_quan_trong') },
                { ma: 'khan', nhan: tra('tb_khan') },
              ]}
              nhan={tra('tb_muc_do')} />
          </label>
          <label className="truong-hang">
            <input type="checkbox" checked={can_gt} onChange={(e) => dat_can_gt(e.target.checked)} />
            <span>{tra('tb_bat_buoc_giai_trinh')}</span>
          </label>
          <label className="truong"><span>{tra('vai_hieu_luc_den')}</span>
            <input type="date" value={het_han} onChange={(e) => dat_het_han(e.target.value)} />
          </label>
        </div>
      </div>
      <div className="soan-nhom">
        <div className="soan-tieu-de">{tra('tb_noi_dung')}</div>
        {che_do === 'ai' ? (
          <label className="truong"><span>{tra('vai_noi_dung_tho')}</span>
            <textarea rows={5} value={tho} onChange={(e) => dat_tho(e.target.value)}
              placeholder={tra('vai_noi_dung_tho_phu')} />
          </label>
        ) : (
          <>
            <label className="truong"><span>{tra('vai_trich_yeu')}</span>
              <input value={trich_yeu} onChange={(e) => dat_trich_yeu(e.target.value)} /></label>
            {loai === 'cong_van' && (
              <label className="truong"><span>{tra('vai_kinh_gui')}</span>
                <input value={kinh_gui} onChange={(e) => dat_kinh_gui(e.target.value)} /></label>
            )}
            {loai === 'quyet_dinh' && (
              <>
                <label className="truong"><span>{tra('vai_can_cu')}</span>
                  <textarea rows={2} value={can_cu} onChange={(e) => dat_can_cu(e.target.value)} /></label>
                <label className="truong"><span>{tra('vai_cac_dieu')}</span>
                  <textarea rows={4} value={dieu} onChange={(e) => dat_dieu(e.target.value)} /></label>
              </>
            )}
            <label className="truong"><span>{tra('vai_noi_dung')}</span>
              <textarea rows={5} value={noi_dung} onChange={(e) => dat_noi_dung(e.target.value)} /></label>
          </>
        )}
        <div className="truong"><span>{tra('vai_tep_kem')}</span>
          <OKeoTep
            ma="vai-soan-tep"
            nhieu
            accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx"
            khi_nhan={(ds) => dat_tep(Array.from(ds ?? []))}
          />
        </div>
        <div className="mo-ta" style={{ marginTop: -4 }}>{tra('vai_toi_da_10_tep')}</div>
      </div>
      <div className="hang-nut">
        <button onClick={() => { void gui(); }} disabled={hd.dang_chay || !can_gui}>
          {hd.dang_chay ? tra('tb_dang_gui') : tra('vai_tao_ban_nhap')}
        </button>
        {!can_gui && !hd.dang_chay && (
          <span className="mo-ta">
            {che_do === 'ai'
              ? tra('vai_loi_ngan_ai')
              : tra('vai_loi_ngan_tu_soan')}
          </span>
        )}
        <button className="nut-phang" onClick={() => dat_mo(false)}>{tra('cn_huy')}</button>
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
  const { tra } = dung_chuoi();
  if (kq.length === 0) return <span className="mo-ta">{tra('vai_chua_co_ket_qua_gate')}</span>;
  const loi = kq.filter((k) => !k.dat);
  return (
    <div>
      {loi.length === 0
        ? <div className="hop-thong-bao hop-tot">{tra('vai_moi_cong_dat')}</div>
        : (
          <table className="bang-gon">
            <thead><tr><th>{tra('vai_ma')}</th><th>{tra('vai_ket_qua')}</th><th>{tra('vai_ly_do')}</th></tr></thead>
            <tbody>
              {loi.map((k) => (
                <tr key={k.ma_check}>
                  <td>{k.ma_check}</td>
                  <td>{k.loai_loi === 'llm' ? tra('vai_loi_ai') : tra('vai_loi_code')}</td>
                  <td>{k.ly_do}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
    </div>
  );
}

export function ChiTiet({ id, khi_dong, khi_xong }: { id: string; khi_dong: () => void; khi_xong: () => void }): ReactNode {
  const { du_lieu: d, dang_tai, loi, nap_lai } = dung_nap<ChiTietNhap>(`/api/thong-bao/ai/${id}`, [id]);
  const hd = dung_hanh_dong();
  const { tra } = dung_chuoi();
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
  const [tep_cho, dat_tep_cho] = useState<File[]>([]);
  // Tang sau moi lan tai len xong de lam moi OKeoTep (xoa danh sach ten tep hien thi cu).
  const [lan_tep, dat_lan_tep] = useState(0);

  const them_tep = async (): Promise<void> => {
    if (d === null) return;
    if (tep_cho.length === 0) return;
    const ok = await hd.chay(
      async () => {
        for (const t of tep_cho) {
          const fd = new FormData();
          fd.append('tep', t);
          await gui_tep(`/api/thong-bao/ai/${d.id}/tep-kem`, fd);
        }
      },
      tra('vai_da_dinh_kem_tep'),
    );
    if (ok) {
      dat_tep_cho([]);
      dat_lan_tep((n) => n + 1);
    }
    // Cap nhat danh sach ca khi loi giua chung: mot vai tep truoc do co the da len duoc.
    nap_lai();
  };

  const xoa_tep = async (tep_id: string): Promise<void> => {
    if (d === null) return;
    const ok = await hd.chay(
      () => goi(`/api/thong-bao/ai/${d.id}/tep-kem/${tep_id}`, { method: 'DELETE' }),
      tra('vai_da_xoa_tep'),
    );
    if (ok) nap_lai();
  };

  useEffect(() => {
    const s = d?.spec_json;
    // Co van ban la tu mo che do xem truoc (toan man hinh) — khong can bam nut.
    dat_xem_truoc(s !== null && s !== undefined);
    dat_xem_docx(false);
    dat_loi_docx(null);
    if (s === null || s === undefined) return;
    dat_t_yeu(s.trich_yeu);
    dat_t_kinh(s.kinh_gui.join('; '));
    dat_t_can_cu(s.can_cu.join('\n'));
    dat_t_dieu(s.dieu.join('\n'));
    dat_t_noi_dung(s.noi_dung.join('\n\n'));
  }, [d]);

  // Tu lam moi trong luc AI con dang soan: khi soan xong spec xuat hien, ben tren tu mo
  // che do xem truoc. Mo nguoi dung mo chi tiet NGAY SAU KHI TAO ban nhap.
  useEffect(() => {
    if (d === null || d === undefined || d.trang_thai !== 'dang_soan') return;
    const hen = setInterval(() => { nap_lai(); }, 3000);
    return () => clearInterval(hen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d?.trang_thai]);

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
      dat_loi_docx(loi instanceof Error ? loi.message : tra('vai_khong_mo_docx'));
      dat_xem_docx(false);
    } finally {
      dat_dang_docx(false);
    }
  };

  const chay = (duong_dan: string, tot: string) => async (): Promise<void> => {
    const ok = await hd.chay(() => goi(duong_dan, { method: 'POST' }), tot);
    // Nap lai du lieu chi tiet ngay: vi du "Viết lại bằng AI" chuyen ban nhap ve
    // dang_soan, can d.trang_thai moi de vong lap tu lam moi ben duoi bat dau chay.
    if (ok) { nap_lai(); khi_xong(); }
  };

  /** Gui lai email cua van ban da ban hanh (ban tu dong bi loi / chua khai MS_MAIL). */
  const gui_lai_email = async (): Promise<void> => {
    if (d === null || d.thong_bao_id === null) return;
    const ok = await hd.chay(
      () => goi(`/api/thong-bao/${d.thong_bao_id}/gui-email`, { method: 'POST' }),
      tra('tb_da_gui_email_ok'),
    );
    if (ok) { nap_lai(); khi_xong(); }
  };

  if (dang_tai) return <DangTai />;
  if (loi !== null || d === null) return <HopLoi loi={loi ?? tra('vai_khong_tai_chi_tiet')} />;

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
      tra('vai_da_luu_sua'),
    );
    if (ok) { dat_dang_sua(false); nap_lai(); khi_xong(); }
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
          {nhan_trang_thai_vb(d.trang_thai)}
        </span>
        <span className="mo-ta">{tra('vai_tao_luc', { n: ngay_gio(d.tao_luc) })}</span>
        <span className="mo-ta">{d.che_do === 'ai' ? tra('vai_ai_soan_ngan') : tra('vai_tu_soan_ngan')}</span>
        <span className="mo-ta">{d.che_do === 'ai'
          ? tra('vai_so_lan_goi_ai', { n: d.so_lan_thu })
          : ''}</span>
        {d.so_ky_hieu !== null && <span className="nhan-muc">{tra('vai_so_x', { n: d.so_ky_hieu })}</span>}
        {d.la_qd_nghi_viec && (
          <span className="nhan-muc nhan-muc-khan">
            {tra('vai_qd_nghi_viec')}{d.ngay_nghi_viec !== null ? tra('vai_nghi_x', { n: d.ngay_nghi_viec }) : ''}
          </span>
        )}
        {d.la_qd_nghi_viec && d.trang_thai === 'da_phat_hanh' && (
          <span className="mo-ta">
            {d.nghi_viec_da_chay_luc !== null
              ? tra('vai_da_tu_khoa_x', { n: ngay_gio(d.nghi_viec_da_chay_luc) })
              : tra('vai_se_tu_khoa')}
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
            {xem_truoc ? tra('vai_an_xem_truoc') : tra('vai_xem_truoc')}
          </button>
          {d.co_tep && (
            <button className="nut-phang"
              onClick={() => { void mo_docx(); }}
              disabled={dang_docx}>
              {dang_docx ? tra('vai_dang_mo') : xem_docx ? tra('vai_dong_docx') : tra('vai_xem_docx')}
            </button>
          )}
          {d.co_tep && (
            <button className="nut-phang"
              onClick={() => { void tai_tep(`/api/thong-bao/ai/${d.id}/xem`, `${d.ma}_${d.so_ky_hieu === null ? 'du_thao' : d.so_ky_hieu.replace('/', '-')}.docx`); }}>
              {tra('tb_tai_van_ban')}
            </button>
          )}
        </div>
      )}

      <div className="the" style={{ marginTop: 12 }}>
        <div className="canhan-muc-dau"><h3>{tra('vai_tep_kem_x', { n: d.tep_kem.length })}</h3></div>
        {d.tep_kem.length === 0 ? (
          <p className="mo-ta">{tra('vai_chua_co_tep')}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {d.tep_kem.map((t) => (
              <div key={t.id} className="hang-nut" style={{ justifyContent: 'flex-start', flexWrap: 'wrap' }}>
                <button className="nut-phang nut-nho"
                  onClick={() => { void tai_tep(`/api/thong-bao/ai/${d.id}/tep-kem/${t.id}`, t.ten_goc); }}>
                  {t.ten_goc}
                </button>
                <span className="mo-ta">{Math.max(1, Math.round(t.kich_thuoc / 1024))} KB</span>
                {!['da_phat_hanh', 'huy'].includes(d.trang_thai) && (
                  <button className="nut-phang nut-nho" disabled={hd.dang_chay}
                    onClick={() => { void xoa_tep(t.id); }}>{tra('tl_xoa')}</button>
                )}
              </div>
            ))}
          </div>
        )}
        {!['da_phat_hanh', 'huy'].includes(d.trang_thai) && (
          <div style={{ marginTop: 8 }}>
            <OKeoTep
              key={lan_tep}
              ma="vai-chi-tiet-tep"
              nhieu
              accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx"
              nhan_phu={tra('vai_toi_da_10_tep')}
              khi_nhan={(ds) => dat_tep_cho(Array.from(ds ?? []))}
            />
            <div className="hang-nut" style={{ marginTop: 8 }}>
              <button className="nut-phang" disabled={hd.dang_chay || tep_cho.length === 0}
                onClick={() => { void them_tep(); }}>
                {hd.dang_chay ? tra('vai_dang_tai') : tra('vai_dinh_kem_tep')}
              </button>
            </div>
          </div>
        )}
      </div>

      {dang_sua && d.spec_json !== null ? (
        <div className="the" style={{ marginTop: 12 }}>
          <div className="canhan-muc-dau"><h3>{tra('vai_sua_van_xuoi')}</h3></div>
          <label className="truong"><span>{tra('vai_trich_yeu_ngan')}</span>
            <input value={t_yeu} onChange={(e) => dat_t_yeu(e.target.value)} /></label>
          {d.loai === 'cong_van' && (
            <label className="truong"><span>{tra('vai_kinh_gui_ngan')}</span>
              <input value={t_kinh} onChange={(e) => dat_t_kinh(e.target.value)} /></label>
          )}
          {d.loai === 'quyet_dinh' && (
            <>
              <label className="truong"><span>{tra('vai_can_cu_ngan')}</span>
                <textarea rows={2} value={t_can_cu} onChange={(e) => dat_t_can_cu(e.target.value)} /></label>
              <label className="truong"><span>{tra('vai_cac_dieu_ngan')}</span>
                <textarea rows={4} value={t_dieu} onChange={(e) => dat_t_dieu(e.target.value)} /></label>
            </>
          )}
          <label className="truong"><span>{tra('tb_noi_dung')}</span>
            <textarea rows={6} value={t_noi_dung} onChange={(e) => dat_t_noi_dung(e.target.value)} /></label>
          <div className="hang-nut">
            <button onClick={() => { void luu_sua(); }} disabled={hd.dang_chay}>
              {hd.dang_chay ? tra('tb_dang_luu') : tra('vai_luu_dung_lai')}
            </button>
            <button className="nut-phang" onClick={() => dat_dang_sua(false)}>{tra('cn_huy')}</button>
          </div>
        </div>
      ) : (
        <div className="hang-nut" style={{ marginTop: 12, flexWrap: 'wrap' }}>
          {['cho_duyet', 'cho_ky'].includes(d.trang_thai) && (
            <button className="nut-phang" onClick={() => dat_dang_sua(true)}>{tra('vai_sua_van_xuoi')}</button>
          )}
          {['cho_duyet', 'cho_ky', 'loi'].includes(d.trang_thai) && (
            <button className="nut-phang" onClick={chay(`/api/thong-bao/ai/${d.id}/viet-lai`, tra('vai_da_yeu_cau_viet_lai'))}>
              {tra('vai_viet_lai_ai')}
            </button>
          )}
          {d.trang_thai === 'cho_duyet' && (
            <button className="nut-phang"
              onClick={chay(`/api/thong-bao/ai/${d.id}/lay-y-kien`, tra('vai_da_mo_lay_y_kien'))}>
              {tra('vai_gui_lay_y_kien')}
            </button>
          )}
          {d.trang_thai === 'dang_lay_y_kien' && (
            <>
              <span className="mo-ta">
                {tra('vai_dang_lay_y_kien')}{d.lay_y_kien_luc !== null ? tra('vai_tu_x', { n: ngay_gio(d.lay_y_kien_luc) }) : ''}.
                {d.han_lay_y_kien !== null && (
                  <>{tra('vai_han_gop_y', { n: ngay_gio(d.han_lay_y_kien), m: con_ngay(d.han_lay_y_kien) })}</>
                )}
                {' '}{tra('vai_y_kien_ve_ho_thu')}
              </span>
              <button onClick={chay(`/api/thong-bao/ai/${d.id}/ket-thuc-y-kien`, tra('vai_da_ket_thuc_y_kien'))}>
                {tra('vai_ket_thuc_y_kien')}
              </button>
            </>
          )}
          {d.trang_thai === 'cho_duyet' && d.can_hai_cap && (
            <button onClick={chay(`/api/thong-bao/ai/${d.id}/trinh-ky`, tra('vai_da_trinh_ky'))}>{tra('vai_trinh_ky')}</button>
          )}
          {(d.trang_thai === 'cho_duyet' && !d.can_hai_cap) || d.trang_thai === 'cho_ky' ? (
            <button onClick={chay(`/api/thong-bao/ai/${d.id}/phat-hanh`,
              d.la_qd_nghi_viec
                ? tra('vai_da_ban_hanh_qd')
                : tra('vai_da_ban_hanh'))}>
              {tra('vai_ban_hanh_cap_so')}
            </button>
          ) : null}
          {d.trang_thai !== 'da_phat_hanh' && d.trang_thai !== 'huy' && (
            <button className="nut-phang" onClick={chay(`/api/thong-bao/ai/${d.id}/huy`, tra('vai_da_huy_nhap'))}>{tra('cn_huy')}</button>
          )}
          {d.trang_thai === 'da_phat_hanh' && (
            <span className="mo-ta">{tra('vai_da_phat_hanh')}{d.so_ky_hieu !== null ? ` ${tra('vai_voi_so_x', { n: d.so_ky_hieu })}` : ''}.</span>
          )}
          {d.trang_thai === 'da_phat_hanh' && d.thong_bao_id !== null && (
            d.da_gui_email ? (
              <span className="mo-ta">
                {tra('tb_da_gui_email')}{d.gui_email_luc !== null ? ` · ${ngay_gio(d.gui_email_luc)}` : ''}
              </span>
            ) : (
              <div className="hang-nut" style={{ marginTop: 8 }}>
                <button className="nut-phang"
                  onClick={() => { void gui_lai_email(); }} disabled={hd.dang_chay}>
                  {hd.dang_chay ? tra('tb_dang_gui') : tra('vai_gui_lai_email')}
                </button>
                {d.gui_email_loi !== null && (
                  <span className="mo-ta">{tra('tb_chua_gui_duoc', { n: d.gui_email_loi })}</span>
                )}
              </div>
            )
          )}
        </div>
      )}
      {d.che_do === 'ai' && d.trang_thai === 'loi' && d.spec_json === null && (
        <div className="hop-thong-bao hop-luu-y" style={{ marginTop: 12 }}>
          {tra('vai_ai_khong_soan_duoc')}
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
    <HopThoai tieu_de={`${d.ma} — ${tra_hien_tai(KHOA_LOAI[d.loai])} ${tra_hien_tai(KHOA_PHAM_VI[d.pham_vi])}`}
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
  const hd = dung_hanh_dong();
  const { tra } = dung_chuoi();
  const [xem, dat_xem] = useState<string | null>(null);
  const [lan, dat_lan] = useState(0);
  // Doc mot lan luc mount: nut o trang ho so dat muc tieu truoc khi dieu huong sang day.
  const [mac_dinh] = useState<{ nhan_vien_id: string } | null>(() => lay_qd_nghi_viec());

  const ds = du_lieu ?? [];
  const co_dang_soan = ds.some((d) => d.trang_thai === 'dang_soan');
  const so_dang_y_kien = ds.filter((d) => d.trang_thai === 'dang_lay_y_kien').length;

  const mo_y_kien = (id: string) => async (): Promise<void> => {
    const ok = await hd.chay(
      () => goi(`/api/thong-bao/ai/${id}/lay-y-kien`, { method: 'POST' }),
      tra('vai_da_mo_lay_y_kien'),
    );
    if (ok) nap_lai();
  };

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
      <div className="hop-thong-bao hop-luu-y" style={{ marginBottom: 12 }}>
        {tra('vai_banner_du_thao')}
        {so_dang_y_kien > 0 && tra('vai_dang_lay_y_kien_x', { n: so_dang_y_kien })}
      </div>
      <HopLoi loi={hd.loi} />
      <HopTot chu={hd.tot} />
      <FormTao khi_xong={(id_moi) => { nap_lai(); if (id_moi !== null) dat_xem(id_moi); }} mac_dinh={mac_dinh} />
      {xem !== null && <ChiTiet id={xem} khi_dong={() => dat_xem(null)} khi_xong={nap_lai} />}
      {ds.length === 0
        ? <Trong tieu_de={tra('vai_chua_co_van_ban_ai')} mo_ta={tra('vai_tao_ban_nhap_dau')} />
        : (
          <table className="bang-gon">
            <thead>
              <tr>
                <th>{tra('vai_ma')}</th><th>{tra('vai_loai_van_ban')}</th><th>{tra('vai_ve_viec')}</th><th>{tra('vai_pham_vi')}</th><th>{tra('vai_nguoi_nhan')}</th>
                <th>{tra('vai_trang_thai')}</th><th>{tra('vb_so_ky_hieu')}</th><th>{tra('vai_cap_nhat')}</th><th></th>
              </tr>
            </thead>
            <tbody>
              {ds.map((d, i) => (
                <tr key={khoa_tinh(d.id, i)}>
                  <td>{d.ma}</td>
                  <td>{d.la_qd_nghi_viec ? tra('vai_qd_nghi_viec') : tra_hien_tai(KHOA_LOAI[d.loai])}</td>
                  <td>
                    <span className="khong-ngat" style={{
                      display: 'block', maxWidth: 340, overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {d.trich_yeu ?? '—'}
                    </span>
                  </td>
                  <td>{tra_hien_tai(KHOA_PHAM_VI[d.pham_vi])}</td>
                  <td>
                    {d.nhan_vien ?? d.phong_ban ?? tra('vb_toan_cong_ty')}
                    {d.la_qd_nghi_viec && d.ngay_nghi_viec !== null
                      ? tra('vai_nghi_x', { n: d.ngay_nghi_viec }) : ''}
                  </td>
                  <td className="khong-ngat">
                    {nhan_trang_thai_vb(d.trang_thai)}
                    {d.trang_thai === 'dang_lay_y_kien' && d.han_lay_y_kien !== null && (
                      <span className="mo-ma">{tra('vai_han_x', { n: ngay_gio(d.han_lay_y_kien) })}</span>
                    )}
                  </td>
                  <td>{d.so_ky_hieu ?? '—'}</td>
                  <td>{ngay_gio(d.cap_nhat_luc)}</td>
                  <td className="canh-phai">
                    {d.trang_thai === 'cho_duyet' && (
                      <button className="nut-nho" onClick={mo_y_kien(d.id)}
                        disabled={hd.dang_chay}>
                        {tra('vai_gui_lay_y_kien')}
                      </button>
                    )}
                    <button className="nut-nho nut-phang" onClick={() => dat_xem(d.id)}>{tra('vai_chi_tiet')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
    </div>
  );
}
