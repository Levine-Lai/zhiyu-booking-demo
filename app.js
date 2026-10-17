/* 至遇预约 demo · 本地模拟数据，不提供生产身份验证或跨设备同步 */
const projects = [
  {id:'relax',name:'舒缓净养',description:'头皮清洁 · 肩颈放松',duration:60,price:128},
  {id:'deep',name:'深度舒压',description:'深层护理 · 头肩舒压',duration:90,price:198},
  {id:'ritual',name:'至遇慢享',description:'头皮养护 · 沉浸放松',duration:120,price:268}
];
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const parseDate = s => new Date(`${s}T00:00:00`);
const shanghaiNow = () => new Date(new Date().toLocaleString('en-US',{timeZone:'Asia/Shanghai'}));
const startDay = d => new Date(d.getFullYear(),d.getMonth(),d.getDate());
const addDays = (d,n) => {let x=startDay(d);x.setDate(x.getDate()+n);return x;};
const timeText = n => `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
const dateText = s => {let d=parseDate(s);return `${d.getMonth()+1}月${d.getDate()}日 周${'日一二三四五六'[d.getDay()]}`;};
const STORE='zhiyu-demo-v1';
function load(){try{return JSON.parse(localStorage.getItem(STORE))||{};}catch{return {};}}
let db=load();
const today = startDay(shanghaiNow());
let date=dateKey(addDays(today,1)), project=projects[0], time=null, month=parseDate(date), view='booking', manual=false, pendingBook=false;
let user=db.user||null;
let records=Array.isArray(db.records)?db.records:[];
if(!db.seeded){
  records=[
    {id:'demo-1',date,start:600,duration:60,project:'relax',name:'林女士（示例）',phone:'13800000001',note:'演示预约',status:'confirmed',seed:true},
    {id:'demo-2',date,start:600,duration:90,project:'deep',name:'陈女士（示例）',phone:'13800000002',note:'演示预约',status:'confirmed',seed:true},
    {id:'demo-3',date,start:840,duration:90,project:'deep',name:'王女士（示例）',phone:'13800000003',note:'演示预约',status:'confirmed',seed:true}
  ];
}
function save(){try{localStorage.setItem(STORE,JSON.stringify({records,user,seeded:true}));return true;}catch{toast('浏览器无法保存数据，请检查存储设置');return false;}}
save();
function toast(msg){$('#toast').textContent=msg;$('#toast').classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('visible'),3500);}
function refreshRecords(){const latest=load();if(Array.isArray(latest.records))records=latest.records;}
// Sweep all overlapping intervals, so partial overlaps cannot exceed two concurrent services.
function freeCapacity(day,start,duration){
  let events=[];
  for(const r of records){if(r.date!==day||!['confirmed','completed','noshow'].includes(r.status)||r.start>=start+duration||r.start+r.duration<=start)continue;events.push([Math.max(start,r.start),1],[Math.min(start+duration,r.start+r.duration),-1]);}
  events.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);let used=0,max=0;for(const [,delta] of events){used+=delta;max=Math.max(max,used);}return Math.max(0,2-max);
}
function bookable(day,start,duration){
  const now=shanghaiNow(), d=parseDate(day),last=addDays(startDay(now),13);
  if(d<startDay(now)||d>last||start<600||start+duration>1320||start%30!==0)return false;
  if(day===dateKey(now)&&start<=now.getHours()*60+now.getMinutes())return false;
  return freeCapacity(day,start,duration)>0;
}
function renderProjects(){
 $('#services').innerHTML=projects.map((p,i)=>`<button class="service ${p.id===project.id?'selected':''}" data-project="${p.id}" aria-pressed="${p.id===project.id}"><span class="service-no">CARE / 0${i+1}</span><span class="service-check">${p.id===project.id?'✓':''}</span><h3>${p.name}</h3><p>${p.description}</p><div class="service-bottom"><span class="service-price">¥${p.price}</span><span class="service-duration">${p.duration} 分钟</span></div></button>`).join('');
 $$('[data-project]').forEach(b=>b.onclick=()=>{project=projects.find(p=>p.id===b.dataset.project);time=null;renderBooking();});
}
function renderCalendar(){
 const m=new Date(month.getFullYear(),month.getMonth(),1),count=new Date(m.getFullYear(),m.getMonth()+1,0).getDate(),offset=(m.getDay()+6)%7;
 $('#month-title').textContent=`${m.getFullYear()} 年 ${m.getMonth()+1} 月`;
 const minMonth=new Date(today.getFullYear(),today.getMonth(),1),maxDate=addDays(today,13),maxMonth=new Date(maxDate.getFullYear(),maxDate.getMonth(),1);
 $('#prev-month').disabled=m<=minMonth;$('#next-month').disabled=m>=maxMonth;
 let html='<span></span>'.repeat(offset);
 for(let i=1;i<=count;i++){const d=new Date(m.getFullYear(),m.getMonth(),i),k=dateKey(d),available=d>=today&&d<=addDays(today,13);html+=`<button class="day ${k===date?'selected':''}" data-date="${k}" ${available?'':'disabled'} aria-label="${dateText(k)}${available?'，可预约':'，未开放'}" aria-pressed="${k===date}">${i}${k===dateKey(today)?'<small>今天</small>':''}</button>`;}
 $('#days').innerHTML=html;
 $$('[data-date]').forEach(b=>b.onclick=()=>{date=b.dataset.date;time=null;renderBooking();});
}
function renderTimes(){
 $('#selected-date').textContent=dateText(date);
 const groups=[{name:'早上',icon:'☼',start:600,end:720,hint:'10:00—12:00'},{name:'下午',icon:'◷',start:720,end:1320,hint:'12:00—22:00'}];
 $('#time-groups').innerHTML=groups.map(g=>{let slots='';for(let t=g.start;t<g.end&&t+project.duration<=1320;t+=30){const ok=bookable(date,t,project.duration),cap=freeCapacity(date,t,project.duration);let status=ok?`余 ${cap} 位`:cap===0?'已约满':'已过时';slots+=`<button class="slot ${time===t?'selected':''}" data-time="${t}" ${ok?'':'disabled'} aria-label="${timeText(t)} ${status}" aria-pressed="${time===t}">${timeText(t)}<small>${status}</small></button>`;}return `<div class="period"><div class="period-head"><span aria-hidden="true">${g.icon}</span><strong>${g.name}</strong><small>${g.hint}</small></div><div class="slots">${slots}</div></div>`;}).join('');
 $$('[data-time]').forEach(b=>b.onclick=()=>{time=Number(b.dataset.time);renderTimes();renderSummary();});
}
function detailHTML(){return `<div class="summary-row"><span>护理项目</span><strong>${project.name}</strong></div><div class="summary-row"><span>护理时长</span><strong>${project.duration} 分钟</strong></div><div class="summary-row"><span>到店日期</span><strong>${dateText(date)}</strong></div><div class="summary-row"><span>到店时间</span><strong>${time===null?'请选择时间':`${timeText(time)}—${timeText(time+project.duration)}`}</strong></div><div class="summary-row summary-price"><span>到店支付 <small>（演示价）</small></span><strong>¥${project.price}</strong></div>`;}
function renderSummary(){$('#summary-details').innerHTML=detailHTML();$('#book-button').disabled=time===null;$('#book-button').innerHTML=time===null?'选择到店时间 <span>→</span>':manual?'继续录入顾客 <span>→</span>':'确认预约 <span>→</span>';}
function renderBooking(){renderProjects();renderCalendar();renderTimes();renderSummary();}
function renderAccount(){$('#account').innerHTML=user?`${esc(user.phone.slice(0,3))}****${esc(user.phone.slice(-4))} <span>退出</span>`:'手机号登录 <span>↗</span>';$('#mine-count').textContent=user?records.filter(r=>!r.seed&&r.phone===user.phone&&r.status==='confirmed').length:0;}
function switchView(v){view=v;$$('.view').forEach(s=>s.hidden=s.id!==v);$$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===v));if(v==='mine')renderMine();if(v==='admin')renderAdmin();if(v==='booking')renderBooking();renderAccount();}
const statuses={confirmed:'待到店',completed:'已完成',cancelled:'已取消',noshow:'未到店'};
function emptyHTML(title,text,action){return `<div class="empty"><div class="empty-symbol">◷</div><h3>${title}</h3><p>${text}</p>${action||''}</div>`;}
function renderMine(){
 if(!user){$('#my-list').innerHTML=emptyHTML('登录，查看你的预约','用预约时的手机号登录，即可查看与管理记录。','<button class="primary" id="mine-login">手机号登录 →</button>');$('#mine-login').onclick=()=>openLogin(false);return;}
 const mine=records.filter(r=>!r.seed&&r.phone===user.phone).sort((a,b)=>(b.date+String(b.start).padStart(4,'0')).localeCompare(a.date+String(a.start).padStart(4,'0')));
 $('#my-list').innerHTML=mine.length?mine.map(r=>{const p=projects.find(p=>p.id===r.project);return `<article class="mine-card"><div class="record"><div class="record-time"><strong>${dateText(r.date)}</strong><small>${timeText(r.start)}—${timeText(r.start+r.duration)}</small></div><div><h3>${p.name} · ${r.duration} 分钟</h3><p>${esc(r.name)} · ${esc(r.phone)}${r.note?`<br>备注：${esc(r.note)}`:''}</p></div><div class="record-actions"><span class="badge ${r.status}">${statuses[r.status]}</span>${r.status==='confirmed'?`<button class="secondary" data-cancel="${r.id}">取消预约</button>`:''}</div></div></article>`;}).join(''):emptyHTML('还没有预约，留一点时间给自己','选择护理项目与到店时间，完成你的第一次预约。','<button class="primary" data-go-booking>去预约 →</button>');
 bindRecordActions();bindGoBooking();
}
function renderAdmin(){
 const day=$('#admin-date').value,filtered=records.filter(r=>r.date===day),q=$('#search').value.trim(),status=$('#status-filter').value;
 $('#stats').innerHTML=[['当日预约',filtered.length],['待到店',filtered.filter(r=>r.status==='confirmed').length],['已完成',filtered.filter(r=>r.status==='completed').length],['同时接待上限','2 位']].map(([label,n])=>`<div class="stat"><span>${label}</span><strong>${n}</strong></div>`).join('');
 $('#admin-day-title').textContent=dateText(day)+' · 预约安排';
 const rows=filtered.filter(r=>(status==='all'||r.status===status)&&(!q||r.name.includes(q)||r.phone.includes(q))).sort((a,b)=>a.start-b.start);
 $('#admin-list').innerHTML=rows.length?[['早上',r=>r.start<720],['下午',r=>r.start>=720]].map(([name,pred])=>{const arr=rows.filter(pred);return `<div class="admin-period">${name} · ${arr.length} 条</div>${arr.length?arr.map(r=>`<article class="record"><div class="record-time"><strong>${timeText(r.start)}</strong><small>至 ${timeText(r.start+r.duration)}</small></div><div><h3>${esc(r.name)} <span class="badge ${r.status}">${statuses[r.status]}</span></h3><p>${esc(r.phone)} · ${projects.find(p=>p.id===r.project)?.name||'护理项目'} · ${r.duration} 分钟${r.note?`<br>${esc(r.note)}`:''}</p></div><div class="record-actions">${r.status==='confirmed'?`<button class="secondary" data-status="completed" data-id="${r.id}">标记完成</button><button class="plain" data-status="noshow" data-id="${r.id}">未到店</button><button class="plain" data-cancel="${r.id}">取消</button>`:''}</div></article>`).join(''):'<p class="muted" style="font-size:12px;padding:18px 0">该时段暂无预约</p>'}`;}).join(''):emptyHTML('没有符合条件的预约','可以切换日期、清空搜索，或手动录入一条预约。');
 bindRecordActions();
 $$('[data-status]').forEach(b=>b.onclick=()=>updateStatus(b.dataset.id,b.dataset.status));
}
function updateStatus(id,status){refreshRecords();const r=records.find(r=>r.id===id);if(!r)return;r.status=status;save();renderAll();toast(`已标记为${statuses[status]}`);}
function bindRecordActions(){$$('[data-cancel]').forEach(b=>b.onclick=()=>updateStatus(b.dataset.cancel,'cancelled'));}
function bindGoBooking(){$$('[data-go-booking]').forEach(b=>b.onclick=()=>{manual=false;switchView('booking');});}
function renderAll(){renderAccount();if(view==='booking')renderBooking();if(view==='mine')renderMine();if(view==='admin')renderAdmin();}
function openLogin(pending){pendingBook=pending;$('#login-error').textContent='';$('#login-dialog').showModal();}
function confirmBooking(){
 refreshRecords();if(time===null||!bookable(date,time,project.duration)){time=null;renderBooking();toast('这个时间已不可预约，请重新选择');return;}
 $('#confirm-info').innerHTML=detailHTML();$('#confirm-title').textContent=manual?'手动录入预约':'确认这次预约';$('#manual-fields').hidden=!manual;$('#manual-phone').required=manual;$('#booking-error').textContent='';$('#confirm-dialog').showModal();
}
$$('[data-view]').forEach(b=>b.onclick=()=>{manual=false;switchView(b.dataset.view);});
$('#prev-month').onclick=()=>{month=new Date(month.getFullYear(),month.getMonth()-1,1);renderCalendar();};
$('#next-month').onclick=()=>{month=new Date(month.getFullYear(),month.getMonth()+1,1);renderCalendar();};
$('#account').onclick=()=>{if(user){user=null;pendingBook=false;save();renderAll();toast('已退出演示账号');}else openLogin(false);};
$('#book-button').onclick=()=>{if(!manual&&!user)openLogin(true);else confirmBooking();};
$('#get-code').onclick=()=>{const input=$('#phone');if(!/^1[3-9]\d{9}$/.test(input.value)){input.setAttribute('aria-invalid','true');$('#login-error').textContent='手机号格式不正确，请填写 11 位中国大陆手机号。';return;}input.removeAttribute('aria-invalid');$('#login-error').textContent='';$('#code').value='123456';toast('模拟验证码已填入：123456（不会发送短信）');};
$('#login-form').onsubmit=e=>{e.preventDefault();if(!/^1[3-9]\d{9}$/.test($('#phone').value)){$('#login-error').textContent='手机号格式不正确，请填写 11 位中国大陆手机号。';$('#phone').setAttribute('aria-invalid','true');return;}if($('#code').value!=='123456'){$('#login-error').textContent='验证码不正确，本演示请使用 123456。';$('#code').setAttribute('aria-invalid','true');return;}user={phone:$('#phone').value};save();$('#login-dialog').close();renderAll();if(pendingBook){pendingBook=false;confirmBooking();}else toast('演示登录成功');};
$('#confirm-form').onsubmit=async e=>{
 e.preventDefault();const name=$('#customer-name').value.trim(),phone=manual?$('#manual-phone').value:user?.phone;
 if(!name){$('#booking-error').textContent='请填写您的称呼。';return;}if(!/^1[3-9]\d{9}$/.test(phone||'')){$('#booking-error').textContent='请填写正确的 11 位手机号。';return;}
 const submit=e.submitter;submit.disabled=true;submit.textContent='正在确认…';
 const commit=()=>{refreshRecords();if(!bookable(date,time,project.duration))return {error:'这个时间已约满或过时，请重新选择。'};const r={id:crypto.randomUUID(),date,start:time,duration:project.duration,project:project.id,name,phone,note:$('#customer-note').value.trim(),status:'confirmed'};records.push(r);if(!save()){records.pop();return {error:'保存失败，请检查浏览器存储后重试。'};}return {record:r};};
 try{const result=navigator.locks?await navigator.locks.request('zhiyu-booking',commit):commit();if(result.error){$('#booking-error').textContent=result.error;renderBooking();return;}const r=result.record;$('#confirm-dialog').close();$('#confirm-form').reset();$('#success-info').innerHTML=`${project.name} · ${project.duration} 分钟<br>${dateText(r.date)} ${timeText(r.start)}—${timeText(r.start+r.duration)}`;$('#admin-date').value=r.date;const wasManual=manual;manual=false;time=null;renderAll();$('#success-dialog').showModal();$('#view-booking').textContent=wasManual?'返回门店后台 →':'查看我的预约 →';$('#view-booking').onclick=()=>{$('#success-dialog').close();switchView(wasManual?'admin':'mine');};}catch{$('#booking-error').textContent='保存失败，请重新尝试。';}finally{submit.disabled=false;submit.textContent='确认预约 · 无需订金 →';}
};
$('#add-booking').onclick=()=>{manual=true;date=$('#admin-date').value;const d=parseDate(date);if(d<today||d>addDays(today,13))date=dateKey(addDays(today,1));month=parseDate(date);time=null;switchView('booking');toast('手动新增：先选择项目和时间，再填写顾客信息');window.scrollTo({top:0,behavior:'smooth'});};
$('#admin-date').value=date;
['admin-date','status-filter'].forEach(id=>$('#'+id).onchange=renderAdmin);$('#search').oninput=renderAdmin;
$$('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
$$('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
window.addEventListener('storage',e=>{if(e.key===STORE){db=load();user=db.user||null;refreshRecords();if(time!==null&&!bookable(date,time,project.duration))time=null;renderAll();}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){refreshRecords();if(time!==null&&!bookable(date,time,project.duration))time=null;renderAll();}});
bindGoBooking();renderAll();
