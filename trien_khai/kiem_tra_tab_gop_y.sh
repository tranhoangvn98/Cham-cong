set -e
ND_ID=$(docker exec cham-cong-postgres-1 psql -U chamcong -d chamcong -tAc "select id from nguoi_dung where vai_tro='admin' and dang_hoat_dong order by tao_luc limit 1")
docker exec cham-cong-may_chu-1 node -e "
const {tao_token}=require('/app/may_chu/dist/bao_mat/jwt.js');
const t=tao_token({sub:'$ND_ID',vai_tro:'admin',nv:null,ten:'kiemtra',loai:'tc'},120).token;
(async()=>{
  const b=await (await fetch('http://localhost:8080/api/thong-bao/ai',{headers:{authorization:'Bearer '+t}})).json();
  console.log('DU_THAO_DANG_MO_CO_Y_KIEN:');
  b.filter(d=>d.trang_thai==='dang_lay_y_kien').forEach(d=>console.log(' ', d.ma, 'so_y_kien='+d.so_y_kien));
  const mo=b.find(d=>d.trang_thai==='dang_lay_y_kien' && d.so_y_kien>0);
  if(mo){
    const b2=await (await fetch('http://localhost:8080/api/thong-bao/ai/'+mo.id+'/y-kien',{headers:{authorization:'Bearer '+t}})).json();
    console.log('Y_KIEN CUA', mo.ma, '=', b2.length);
    b2.forEach(y=>console.log(' ', y.ho_ten, y.ma_nv, y.phong_ban, y.trang_thai, 'tra_loi='+y.so_tra_loi));
  } else console.log('CHUA_CO_DU_THAO_NAO_CO_Y_KIEN');
})().catch(e=>{console.error('LOI:',e);process.exit(1)});
"
exit 0
