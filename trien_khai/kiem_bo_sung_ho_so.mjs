// Kiem chung (CHI DOC + mot vong nhac rong) luong yeu cau bo sung ho so tren production.
// Chay TRONG container may_chu:
//   docker compose cp trien_khai/kiem_bo_sung_ho_so.mjs may_chu:/tmp/
//   docker compose exec -T may_chu node /tmp/kiem_bo_sung_ho_so.mjs
import {
  danh_sach, nhac_bo_sung, tai_lieu_bat_buoc_con_thieu,
} from '/app/may_chu/dist/ho_so/bo_sung.js';
import { truy_van } from '/app/may_chu/dist/csdl/ket_noi.js';

const ds = await truy_van(
  `select id, ma_nv, ho_ten from nhan_vien
    where dang_hoat_dong = true order by ma_nv limit 3`,
);
for (const nv of ds) {
  const t = await tai_lieu_bat_buoc_con_thieu(nv.id);
  console.log(`${nv.ma_nv} ${nv.ho_ten}: con thieu ${t.length} tai lieu bat buoc`,
    t.slice(0, 3).map((x) => x.ten).join(' | '));
}

console.log('danh sach yeu cau hien co:', (await danh_sach()).length);
console.log('mot vong nhac (dang rong, khong gui email):', JSON.stringify(await nhac_bo_sung()));
process.exit(0);
