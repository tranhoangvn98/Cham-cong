// Sinh tep token cho web (CSS) va app dien thoai (TypeScript) tu thiet_ke/token.json.
//
// Ly do phai sinh thay vi import chung mot tep: web dung Vite, app dung Metro; moi ban
// dong goi mot cach resolve tep ngoai thu muc goc cua no, cho hai ben cung import mot
// tep o ngoai la nguon loi cau hinh trien mien. Sinh ra roi commit thi khong ben nao
// phai biet gi ve ben kia.
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

/** Bo cac khoa tai lieu (`_doc`, `_ghi_chu`, `_ly_do...`) khoi mot object. */
function chi_gia_tri(o) {
  return Object.fromEntries(Object.entries(o).filter(([k]) => !k.startsWith('_')));
}

const DAU_TEP = (ten) =>
  `/* Sinh tu thiet_ke/token.json boi thiet_ke/sinh_token.mjs — DUNG SUA TAY.\n` +
  `   Sua token.json roi chay: npm run sinh_token\n` +
  `   ${ten} */\n`;

// ---------------------------------------------------------------- web: CSS
function sinh_css(t) {
  const bien = (mau, bong) => {
    const dong = [];
    for (const [k, v] of Object.entries(chi_gia_tri(mau))) {
      dong.push(`  --${k.replaceAll('_', '-')}: ${v};`);
    }
    dong.push(`  --bong: ${bong.the};`);
    dong.push(`  --bong-noi: ${bong.noi};`);
    return dong.join('\n');
  };

  const ho_chu = [t.chu_viet.ho, ...t.chu_viet.du_phong]
    .map((n) => (n.includes(' ') ? `'${n}'` : n))
    .join(', ');

  const bg = t.bo_goc;
  const kh = t.khoang;

  // Tu chua font thay vi goi Google Fonts: khong ro ri IP nhan vien sang ben thu ba,
  // chay duoc trong LAN khong ra Internet, va khong phu thuoc mot dich vu ngoai.
  const tep = { thuong: 'Regular', vua: 'Medium', dam: 'SemiBold', rat_dam: 'Bold' };
  const font_face = Object.entries(t.chu_viet.trong_so)
    .map(([ten, so]) => {
      const f = `${t.chu_viet.ho.replaceAll(' ', '')}-${tep[ten]}`;
      return (
        `@font-face {\n` +
        `  font-family: '${t.chu_viet.ho}';\n` +
        `  src: url('/font/${f}.woff2') format('woff2');\n` +
        `  font-weight: ${so};\n` +
        `  font-style: normal;\n` +
        `  font-display: swap;\n` +
        `}\n`
      );
    })
    .join('\n');

  return (
    DAU_TEP('Bien CSS: mau, font, bo goc, khoang cach.') +
    `\n${font_face}\n` +
    `:root {\n` +
    `  --chu-viet: ${ho_chu};\n` +
    `  --trong-thuong: ${t.chu_viet.trong_so.thuong};\n` +
    `  --trong-vua: ${t.chu_viet.trong_so.vua};\n` +
    `  --trong-dam: ${t.chu_viet.trong_so.dam};\n` +
    `  --trong-rat-dam: ${t.chu_viet.trong_so.rat_dam};\n\n` +
    `  --tron-nho: ${bg.nho}px;\n` +
    `  --tron: ${bg.vua}px;\n` +
    `  --tron-lon: ${bg.lon}px;\n` +
    `  --tron-tron: ${bg.tron}px;\n\n` +
    `  --khoang-rat-nho: ${kh.rat_nho}px;\n` +
    `  --khoang-nho: ${kh.nho}px;\n` +
    `  --khoang-vua: ${kh.vua}px;\n` +
    `  --khoang-lon: ${kh.lon}px;\n` +
    `  --khoang-rat-lon: ${kh.rat_lon}px;\n\n` +
    `  --rong-thanh-ben: 232px;\n\n` +
    bien(t.mau.sang, t.bong.sang) +
    `\n}\n\n` +
    `@media (prefers-color-scheme: dark) {\n  :root {\n` +
    bien(t.mau.toi, t.bong.toi).replace(/^ {2}/gm, '    ') +
    `\n  }\n}\n`
  );
}

// ---------------------------------------------------------------- app: TypeScript
function sinh_ts(t) {
  const khoa = Object.keys(chi_gia_tri(t.mau.sang));
  const doi_tuong = (mau, thut = '  ') =>
    khoa.map((k) => `${thut}${k}: '${mau[k]}',`).join('\n');

  // React Native tren Android khong tu suy ra do dam tu mot ho font — phai dang ky
  // rieng tung trong so roi chon bang fontFamily. Xem nguon/font.ts.
  const ho = t.chu_viet.ho.replaceAll(' ', '');

  return (
    DAU_TEP('Bang mau, ho chu, bo goc cho app dien thoai.') +
    `\nexport interface BangMau {\n` +
    khoa.map((k) => `  ${k}: string;`).join('\n') +
    `\n}\n\n` +
    `export const SANG: BangMau = {\n${doi_tuong(t.mau.sang)}\n};\n\n` +
    `export const TOI: BangMau = {\n${doi_tuong(t.mau.toi)}\n};\n\n` +
    `/** Ten ho chu da dang ky trong nguon/font.ts — chon do dam bang fontFamily, khong bang fontWeight. */\n` +
    `export const HO_CHU = {\n` +
    `  thuong: '${ho}-Regular',\n` +
    `  vua: '${ho}-Medium',\n` +
    `  dam: '${ho}-SemiBold',\n` +
    `  rat_dam: '${ho}-Bold',\n` +
    `} as const;\n\n` +
    `export const BO_GOC = {\n` +
    Object.entries(chi_gia_tri(t.bo_goc)).map(([k, v]) => `  ${k}: ${v},`).join('\n') +
    `\n} as const;\n\n` +
    `export const KHOANG = {\n` +
    Object.entries(chi_gia_tri(t.khoang)).map(([k, v]) => `  ${k}: ${v},`).join('\n') +
    `\n} as const;\n\n` +
    `/** Trang thai nghiep vu -> khoa mau trong BangMau. */\n` +
    `export const Y_NGHIA_MAU: Record<string, keyof BangMau> = {\n` +
    Object.entries(chi_gia_tri(t.y_nghia_mau)).map(([k, v]) => `  ${k}: '${v}',`).join('\n') +
    `\n};\n`
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
