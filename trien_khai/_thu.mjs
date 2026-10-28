import { lay_token_graph } from '/app/may_chu/dist/su_kien/gui_email.js';
import { cau_hinh } from '/app/may_chu/dist/cau_hinh.js';
const t = await lay_token_graph();
const r = await fetch(`${cau_hinh.mail.goc_graph}/subscribedSkus?$select=skuId,skuPartNumber`, { headers: { authorization: `Bearer ${t}` } });
console.log('HTTP', r.status);
console.log((await r.text()).slice(0, 400));
process.exit(0);
