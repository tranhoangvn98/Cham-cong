// Chay job bo sung ma dinh danh NGAY (khong doi 01:00), in ket qua de kiem chung.
const { bo_sung_ma_tu_dong } = await import('/app/may_chu/dist/dinh_danh/bo_sung_ma.js');
const kq = await bo_sung_ma_tu_dong((s) => console.log('  ', s));
console.log('so ma da bo sung:', kq.so_bu);
console.log('xung dot:', kq.xung_dot.length, JSON.stringify(kq.xung_dot.slice(0, 5)));
console.log('con thieu', kq.con_thieu.length, 'nguoi; thieu ma ERP1:', kq.so_thieu_erp1);
console.log('chi tiet con thieu:');
for (const n of kq.con_thieu) console.log('  ', n.ma_nv, n.ho_ten, '->', n.thieu.join(', '));
process.exit(0);
