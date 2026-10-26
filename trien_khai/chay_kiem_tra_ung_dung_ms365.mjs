// Chay NGAY mot vong kiem tra ung dung bat buoc M365 (dung khi khong muon cho lich 08:00/13:00).
//
// Chay TRONG container may_chu:
//   docker compose exec -T may_chu node /app/chay_kiem_tra_ung_dung_ms365.mjs
import { kiem_tra_ung_dung_ms365 } from '/app/may_chu/dist/nhan_su/kiem_tra_ung_dung_ms365.js';

const kq = await kiem_tra_ung_dung_ms365();
console.log(JSON.stringify(kq, null, 1));
process.exit(0);
