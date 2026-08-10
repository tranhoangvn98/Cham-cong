// Sinh tep token cho web (CSS) va app dien thoai (TypeScript) tu thiet_ke/token.json.
//
// Ly do phai sinh thay vi import chung mot tep: web dung Vite, app dung Metro; moi ban
// dong goi mot cach resolve tep ngoai thu muc goc cua no, cho hai ben cung import mot
// tep o ngoai la nguon loi cau hinh trien mien. Sinh ra roi commit thi khong ben nao
// phai biet gi ve ben kia.
//
// Web va app dung HAI bo theme khac nhau (Metronic / Compose Boltuix) — xem token.json.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const THU_MUC = dirname(fileURLToPath(import.meta.url));
const GOC = join(THU_MUC, '..');

export const DUONG_DAN_CSS = join(GOC, 'web', 'src', 'token_thiet_ke.css');
export const DUONG_DAN_TS = join(GOC, 'dien_thoai', 'nguon', 'token_thiet_ke.ts');

export function doc_token() {
  return JSON.parse(readFileSync(join(THU_MUC, 'token.json'), 'utf8'));
}

/** Bo cac khoa tai lieu (`_doc`, `_ghi_chu`, `_nguon`, `_lech...`) khoi mot object. */
function chi_gia_tri(o) {
  return Object.fromEntries(Object.entries(o).filter(([k]) => !k.startsWith('_')));
}

const DAU_TEP = (ten) =>
  `/* Sinh tu thiet_ke/token.json boi thiet_ke/sinh_token.mjs — DUNG SUA TAY.\n` +
  `   Sua token.json roi chay: npm run sinh_token\n` +
  `   ${ten} */\n`;

const ten_tep_font = { thuong: 'Regular', vua: 'Medium', dam: 'SemiBold', rat_dam: 'Bold' };

/** Ten ho font khong dau cach, dung lam ten tep va ten ho dang ky trong React Native. */
function ho_gon(ho) {
  return ho.replaceAll(' ', '');
}

// ---------------------------------------------------------------- web: CSS
function sinh_css(t) {
  const w = t.web;

  const bien = (mau, bong, thut) => {
    const dong = Object.entries(chi_gia_tri(mau))
      .map(([k, v]) => `${thut}--${k.replaceAll('_', '-')}: ${v};`);
    dong.push(`${thut}--bong: ${bong.the};`);
    dong.push(`${thut}--bong-noi: ${bong.noi};`);
    return dong.join('\n');
  };

  const ho_chu = [w.chu_viet.ho, ...w.chu_viet.du_phong]
    .map((n) => (n.includes(' ') ? `'${n}'` : n))
    .join(', ');

  // Tu chua font thay vi goi Google Fonts: khong ro ri IP nhan vien sang ben thu ba,
  // chay duoc trong LAN khong ra Internet, va khong phu thuoc mot dich vu ngoai.
  const bt = w.chu_viet.bien_thien;
  const font_face = bt === undefined
    // Font tinh: mot @font-face cho moi trong so.
    ? Object.entries(w.chu_viet.trong_so)
      .map(([ten, so]) => (
        `@font-face {\n`
        + `  font-family: '${w.chu_viet.ho}';\n`
        + `  src: url('/font/${ho_gon(w.chu_viet.ho)}-${ten_tep_font[ten]}.woff2') format('woff2');\n`
        + `  font-weight: ${so};\n`
        + `  font-style: normal;\n`
        + `  font-display: swap;\n`
        + `}\n`
      ))
      .join('\n')
    // Font bien thien: mot tep, khai bao khoang trong so.
    : `@font-face {\n`
      + `  font-family: '${w.chu_viet.ho}';\n`
      + `  src: url('/font/${bt.tep}.woff2') format('woff2-variations');\n`
      + `  font-weight: ${bt.tu} ${bt.den};\n`
      + `  font-style: normal;\n`
      + `  font-display: swap;\n`
      + `}\n`;

  const bg = w.bo_goc;
  const kh = t.khoang;
  const dn = chi_gia_tri(t.diem_ngat);

  return (
    DAU_TEP(`Bien CSS cho webapp. Theme: ${w.chu_viet.ho} + Metronic v9.`)
    + `\n${font_face}\n`
    + `:root {\n`
    + `  --chu-viet: ${ho_chu};\n`
    + Object.entries(w.chu_viet.trong_so)
      .map(([k, v]) => `  --trong-${k.replaceAll('_', '-')}: ${v};`).join('\n') + '\n\n'
    + `  --tron-nho: ${bg.nho}px;\n`
    + `  --tron: ${bg.vua}px;\n`
    + `  --tron-lon: ${bg.lon}px;\n`
    + `  --tron-tron: ${bg.tron}px;\n\n`
    + Object.entries(chi_gia_tri(kh))
      .map(([k, v]) => `  --khoang-${k.replaceAll('_', '-')}: ${v}px;`).join('\n') + '\n\n'
    + Object.entries(dn).map(([k, v]) => `  --ngat-${k.replaceAll('_', '-')}: ${v}px;`).join('\n') + '\n\n'
    + `  --rong-thanh-ben: 232px;\n\n`
    + bien(w.mau.sang, t.bong.sang, '  ')
    + `\n}\n\n`
    // Che do toi: theo cai dat may, NHUNG nguoi dung bam duoc de doi (ke hoach v2 muc
    // 4.5 doi "bat/tat tren web"). `data-che-do` tren <html> thang moi truong hop.
    + `@media (prefers-color-scheme: dark) {\n`
    + `  :root:not([data-che-do='sang']) {\n`
    + bien(w.mau.toi, t.bong.toi, '    ')
    + `\n  }\n}\n\n`
    + `:root[data-che-do='toi'] {\n`
    + bien(w.mau.toi, t.bong.toi, '  ')
    + `\n}\n`
  );
}

// ---------------------------------------------------------------- app: TypeScript
function sinh_ts(t) {
  const m = t.mobile;
  const khoa = Object.keys(chi_gia_tri(m.mau.sang));
  const doi_tuong = (mau) => khoa.map((k) => `  ${k}: '${mau[k]}',`).join('\n');
  const ho = ho_gon(m.chu_viet.ho);

  return (
    DAU_TEP(`Bang mau, ho chu, bo goc cho app dien thoai. Theme: ${m.chu_viet.ho} + Compose Boltuix.`)
    + `\nexport interface BangMau {\n`
    + khoa.map((k) => `  ${k}: string;`).join('\n')
    + `\n}\n\n`
    + `export const SANG: BangMau = {\n${doi_tuong(m.mau.sang)}\n};\n\n`
    + `export const TOI: BangMau = {\n${doi_tuong(m.mau.toi)}\n};\n\n`
    + `/**\n`
    + ` * Ten ho chu da dang ky trong nguon/font.ts.\n`
    + ` *\n`
    + ` * Chon do dam bang fontFamily, KHONG bang fontWeight: React Native tren Android\n`
    + ` * khong suy ra do dam tu mot ho font, dat fontWeight se ra chu thuong.\n`
    + ` */\n`
    + `export const HO_CHU = {\n`
    + Object.keys(m.chu_viet.trong_so)
      .map((k) => `  ${k}: '${ho}-${ten_tep_font[k]}',`).join('\n')
    + `\n} as const;\n\n`
    + `export const BO_GOC = {\n`
    + Object.entries(chi_gia_tri(m.bo_goc)).map(([k, v]) => `  ${k}: ${v},`).join('\n')
    + `\n} as const;\n\n`
    + `export const KHOANG = {\n`
    + Object.entries(chi_gia_tri(t.khoang)).map(([k, v]) => `  ${k}: ${v},`).join('\n')
    + `\n} as const;\n\n`
    + `/** Trang thai nghiep vu -> khoa mau trong BangMau. Dung chung voi web. */\n`
    + `export const Y_NGHIA_MAU: Record<string, keyof BangMau> = {\n`
    + Object.entries(chi_gia_tri(t.y_nghia_mau)).map(([k, v]) => `  ${k}: '${v}',`).join('\n')
    + `\n};\n`
  );
}

export function noi_dung_du_kien() {
  const t = doc_token();
  return { css: sinh_css(t), ts: sinh_ts(t) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { css, ts } = noi_dung_du_kien();
  writeFileSync(DUONG_DAN_CSS, css);
  writeFileSync(DUONG_DAN_TS, ts);
  console.log('da sinh web/src/token_thiet_ke.css');
  console.log('da sinh dien_thoai/nguon/token_thiet_ke.ts');
}
