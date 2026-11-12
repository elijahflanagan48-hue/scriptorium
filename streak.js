/* Ad fontes: «Светильник» — ежедневная серия чтения.
   День засчитывается по времени живого чтения или слушания (минуты), без отметок глав:
   Библию читают местами, а не подряд.
   Один пропущенный день в неделю прощается («фитиль ещё тлеет»), два подряд гасят серию.
   S.days = {'2026-11-11': {s: секунды чтения, c: {'John.3': секунды на главе}}} */
const Streak=(()=>{
  const GOALS=[['m3','3 мин'],['m5','5 мин'],['m10','10 мин'],['m15','15 мин'],['m30','30 мин']];
  const ANIMS=[['lamp','Лампа разгорается','пламя вспыхивает и согревает экран'],['water','Круги на воде','капля падает в источник'],['embers','Золотые искры','искры поднимаются вверх'],['light','Луч света','свет сходит сверху'],['seal','Печать','сургучная печать с числом дней'],['ink','Чернила','число пишется пером'],['quiet','Тихо','короткая подсказка внизу']];
  const pad=n=>String(n).padStart(2,'0');
  const dkey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const today=()=>dkey(new Date());
  const shift=(k,n)=>{const [y,m,d]=k.split('-').map(Number);return dkey(new Date(y,m-1,d+n))};
  const day=k=>{S.days=S.days||{};const d=S.days[k]||(S.days[k]={s:0});if(!d.c)d.c={};return d};
  const goal=()=>GOALS.some(g=>g[0]===S.goal)?S.goal:'m5';
  const need=()=>+goal().slice(1);
  const prog=k=>{const d=(S.days||{})[k];return d?Math.min(1,(d.s||0)/60/need()):0};
  const met=k=>prog(k)>=1;
  const plural=(n,a,b,c)=>{const m=n%10,h=n%100;return m===1&&h!==11?a:m>=2&&m<=4&&(h<12||h>14)?b:c};
  const dn=n=>plural(n,'день','дня','дней');

  /* серия: идём назад от вчера; один пропуск на 7 дней прощается */
  function calc(){
    const t=today();let n=0,grace=[],k=shift(t,-1),miss=0,lastGrace=null;
    for(let i=0;i<4000;i++){
      if(met(k)){n++;miss=0}
      else{miss++;
        if(miss>=2)break;
        const g=lastGrace&&(new Date(lastGrace)-new Date(k))/864e5<7;
        if(g)break;
        if(!met(shift(k,-1)))break; // перед пропуском должен быть прочитанный день
        lastGrace=k;grace.push(k)}
      k=shift(k,-1);
    }
    if(n===0)grace=[];
    const tm=met(t);if(tm)n++;
    const ydMiss=!met(shift(t,-1))&&n>0;
    return{n,today:tm,grace,risk:!tm&&ydMiss,p:prog(t)};
  }
  const best=()=>{const c=calc().n;if(c>(S.bestStreak||0)){S.bestStreak=c}return S.bestStreak||0};

  /* учёт чтения */
  let lastAct=Date.now();
  ['scroll','touchstart','keydown','pointerdown','wheel'].forEach(e=>addEventListener(e,()=>{lastAct=Date.now()},{passive:true}));
  function tick(){
    if(typeof cur==='undefined'||!S)return;
    const t=today(),d=day(t),k=document.body.classList.contains('bkmode')?'bk:'+(S.rlast||''):cur.book+'.'+cur.ch;
    const bk=document.body.classList.contains('bkmode'),reading=document.visibilityState==='visible'&&(S.sec==='read'||bk)&&$('#modal').hidden;
    const listening=!!document.querySelector('.rv.playing,[data-v].playing');
    if(reading&&(Date.now()-lastAct<120000||listening)){d.s=(d.s||0)+5;d.c[k]=(d.c[k]||0)+5;check();if(d.s%60===0)save()}
    ui();
  }
  function check(){
    const t=today(),c=calc();
    if(S.lampOff)return;
    if(c.today&&S.celebrated!==t){S.celebrated=t;best();save();touch();
      const ms=[7,30,100,365,1000].includes(c.n)?{7:'Неделя чтения',30:'Месяц чтения',100:'Сто дней',365:'Целый год',1000:'Тысяча дней'}[c.n]:'';
      setTimeout(()=>celebrate(S.anim||'lamp',c.n,ms),350)}
  }
  const touch=()=>{if(typeof touchSettings==='function')touchSettings()};

  /* значок вверху */
  const LAMP=`<svg viewBox="0 0 48 48" class="lampsvg" aria-hidden="true"><defs><radialGradient id="lfl" cx="50%" cy="70%" r="70%"><stop offset="0" stop-color="#FFF4C8"/><stop offset=".45" stop-color="#FFC24D"/><stop offset="1" stop-color="#E5762A"/></radialGradient></defs>
    <circle class="lglow" cx="43.5" cy="17" r="9"/>
    <path class="lbody" d="M7 30c0-5 8-7.5 17-7.5 7 0 12 1.6 15.4 3.4l4.4-1.4c-.6 3.2-3.4 5.6-6.6 6.6-3 3-8 4.4-13.2 4.4C14 35.5 7 34.4 7 30z"/>
    <path class="lline" d="M7.3 29.4c-4.6-.4-4.8-6.4.2-5.6M18 35.6l1.8 3.2h8.4l1.8-3.2"/><circle class="lhole" cx="21.5" cy="27.4" r="1.7"/>
    <path class="lflame" d="M42.4 22.6c-3.4-3.2-2.8-7.6.6-12 .6 3.6 4.2 5.8 3 10.2-.5 1.6-2.2 2.4-3.6 1.8z" fill="url(#lfl)"/></svg>`;
  function ui(){
    const b=$('#lampBtn');if(!b)return;const c=calc();
    b.className='lampb '+(c.today?'lit':c.n?(c.risk?'risk':'wait'):'off')+' lv'+lvl(c.n);
    b.querySelector('b').textContent=c.n||'';
    b.style.setProperty('--p',c.p);
    b.title=c.today?`${c.n} ${dn(c.n)} подряд — цель дня выполнена`:c.n?`${c.n} ${dn(c.n)} подряд — сегодня ещё не читали`:'Начните серию чтения';
  }
  const lvl=n=>n>=365?5:n>=100?4:n>=30?3:n>=7?2:n>=1?1:0;

  /* окно серии */
  const MS=[[7,'Неделя'],[30,'Месяц'],[100,'Сто дней'],[365,'Год']];
  function sheet(keep){
    const c=calc(),bst=best(),t=today(),n=need();
    const d=day(t),left=`${Math.max(1,Math.ceil(n-(d.s||0)/60))} мин`;
    const state=c.today?'Цель дня выполнена. Светильник горит.':c.risk?`Вчера был пропуск — фитиль ещё тлеет. Осталось сегодня: ${left}.`:c.n?`Сегодня осталось: ${left}, и серия продолжится.`:`Почитайте сегодня ${n} ${plural(n,'минуту','минуты','минут')}, чтобы зажечь светильник.`;
    // календарь: 20 недель, столбцы — недели (пн…вс)
    const W=isM()?Math.max(10,Math.min(17,Math.floor((innerWidth-90)/18))):24,now=new Date(),wd=(now.getDay()+6)%7;
    const start=shift(t,-(W-1)*7-wd);let cells='',months='',lastM=-9;
    for(let w=0;w<W;w++){
      const wk=shift(start,w*7),m=+wk.split('-')[1];
      const dd0=+wk.split('-')[2],lab=(w===0?dd0<=17:dd0<=7)&&w-lastM>=3;
      months+=`<span>${lab?['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'][m-1]:''}</span>`;if(lab)lastM=w;
      for(let i=0;i<7;i++){const k=shift(start,w*7+i);if(k>t){cells+='<i class="fut"></i>';continue}
        const p=prog(k),dd=(S.days||{})[k],more=dd&&(dd.s||0)/60>=n*2;
        const lv=p>=1?(more?4:3):p>=.5?2:p>0?1:0;
        cells+=`<i class="c${lv}${k===t?' td':''}${c.grace.includes(k)?' gr':''}" title="${k.split('-').reverse().join('.')}${dd&&dd.s?` · ${Math.round(dd.s/60)} мин`:''}"></i>`}
    }
    const mins=f=>Math.round(Object.entries(S.days||{}).filter(([k])=>f(k)).reduce((a,[,v])=>a+(v.s||0),0)/60);
    const mon=mins(k=>k.slice(0,7)===t.slice(0,7)),tot=mins(()=>1),totalDays=Object.keys(S.days||{}).filter(met).length;
    const hm=m=>m<60?`${m} мин`:`${Math.floor(m/60)} ч${m%60?' '+m%60+' мин':''}`;
    // где читали за последнюю неделю: главы, на которых провели хотя бы минуту
    const wk={};for(let i=0;i<7;i++){const dd=(S.days||{})[shift(t,-i)];if(dd&&dd.c)for(const [k,v] of Object.entries(dd.c))wk[k]=(wk[k]||0)+v}
    const recent=Object.entries(wk).filter(([,v])=>v>=60).sort((a,b)=>b[1]-a[1]).slice(0,12);
    const medal=(on,big,name,sub)=>`<div class="md${on?' on':''}"><span>${big}</span><b>${name}</b><small>${sub}</small></div>`;
    const html=`<div class="stk">
      <div class="shero ${c.today?'lit':c.n?'wait':'off'} lv${lvl(c.n)}">${LAMP}<div><div class="snum">${c.n}<small>${dn(c.n)} подряд</small></div><p>${state}</p>
        <div class="stprog"><i style="width:${Math.round(c.p*100)}%"></i></div></div></div>
      <div class="sstats"><div><b>${hm(Math.round((d.s||0)/60))}</b><small>сегодня</small></div><div><b>${bst}</b><small>лучшая серия</small></div><div><b>${hm(mon)}</b><small>за этот месяц</small></div><div><b>${hm(tot)}</b><small>всего чтения</small></div></div>
      <h5>Календарь чтения</h5>
      <div class="scal" style="--w:${W}"><div class="sm">${months}</div><div class="sd"><span>пн</span><span></span><span>ср</span><span></span><span>пт</span><span></span><span>вс</span></div><div class="sg">${cells}</div></div>
      <div class="slegend">меньше <i class="c0"></i><i class="c1"></i><i class="c2"></i><i class="c3"></i><i class="c4"></i> больше · <i class="c3 gr"></i> прощённый пропуск</div>
      ${recent.length?`<h5>Читали на этой неделе</h5><div class="srecent">${recent.map(([k,v])=>{const [b,ch]=k.split('.');const bk=BOOKS[BI[b]];return bk?`<button data-go="${k}">${esc(bk.ab)} ${ch}<small>${Math.round(v/60)} мин</small></button>`:''}).join('')}</div>`:''}
      <h5>Цель дня</h5><div class="rseg sgoal">${GOALS.map(([k,v])=>`<button data-sgoal="${k}" class="${goal()===k?'on':''}">${v}</button>`).join('')}</div>
      <p class="hint">Считается только время, когда вы читаете или слушаете: листаете, нажимаете на слова, включено чтение вслух. Если приложение просто открыто, время не идёт. Один пропуск в неделю прощается.</p>
      <h5>Вехи</h5><div class="smed">${MS.map(([d,nm])=>medal(bst>=d,d,nm,plural(d,'день','дня','дней')+' подряд')).join('')}${[[10,'Десять часов'],[50,'Пятьдесят часов'],[100,'Сто часов']].map(([h,nm])=>medal(tot>=h*60,h+' ч',nm,`${hm(Math.min(tot,h*60))} из ${h} ч`)).join('')}${medal(totalDays>=40,totalDays,'Сорок дней',`${Math.min(totalDays,40)} из 40 дней с целью`)}</div>
      <h5>Анимация праздника</h5><div class="sanim">${ANIMS.map(([k,v,s])=>`<button data-sanim="${k}" class="${(S.anim||'lamp')===k?'on':''}"><b>${v}</b><small>${s}</small><span data-sprev="${k}">▶ Показать</span></button>`).join('')}</div>
    </div>`;
    if(keep&&!$('#modal').hidden&&$('#sheet .stk')){const sc=$('#sheet').scrollTop;$('#sheet').innerHTML=html;$('#sheet').scrollTop=sc}else openModal(html);
  }
  document.addEventListener('click',e=>{
    if(e.target.closest('#lampBtn')){sheet();return}
    const pv=e.target.closest('#sheet [data-sprev]');if(pv){e.stopPropagation();const c=calc();celebrate(pv.dataset.sprev,Math.max(c.n,1),'');return}
    const g=e.target.closest('#sheet [data-sgoal]');if(g){S.goal=g.dataset.sgoal;touch();save();check();ui();sheet(true);return}
    const a=e.target.closest('#sheet [data-sanim]');if(a){S.anim=a.dataset.sanim;touch();save();sheet(true);return}
    const rg=e.target.closest('#sheet .srecent [data-go]');if(rg){closeModal()}
  });

  /* ---------- праздник ---------- */
  function celebrate(type,n,ms){
    document.getElementById('celeb')?.remove();
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)type='quiet';
    const cap=`<div class="cnum">${n}</div><div class="ccap">${dn(n)} подряд</div><div class="csub">${ms||'Цель дня выполнена'}</div>`;
    const el=document.createElement('div');el.id='celeb';el.className='cel cel-'+type;el.setAttribute('role','status');
    let art='';
    if(type==='lamp')art=`<div class="cglow"></div><div class="clamp">${LAMP}</div>`;
    if(type==='water')art=`<div class="cdrop"><svg viewBox="0 0 40 56"><path d="M20 2C24 14 36 24 36 36a16 16 0 0 1-32 0C4 24 16 14 20 2z"/></svg></div>${[0,1,2,3].map(i=>`<i class="crip" style="--i:${i}"></i>`).join('')}`;
    if(type==='embers')art=`<canvas class="cvs"></canvas>`;
    if(type==='light')art=`<div class="cbeam"></div><div class="crays"></div>`;
    if(type==='seal')art=`<div class="cseal"><svg viewBox="0 0 100 100"><defs><radialGradient id="cw" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#E05A4C"/><stop offset="1" stop-color="#861C15"/></radialGradient></defs>${Array.from({length:9},(_,k)=>`<circle cx="${(50+36*Math.cos(k*.7+.3)).toFixed(1)}" cy="${(50+36*Math.sin(k*.7+.3)).toFixed(1)}" r="${7+(k%3)}" fill="url(#cw)"/>`).join('')}<circle cx="50" cy="50" r="38" fill="url(#cw)"/><circle cx="50" cy="50" r="29" fill="none" stroke="#5E100B" stroke-opacity=".5" stroke-width="2"/><text x="50" y="${n>99?60:62}" text-anchor="middle" font-size="${n>99?28:34}" fill="#5E100B">${n}</text></svg></div>`;
    if(type==='ink')art=`<svg class="cink" viewBox="0 0 300 140"><text x="150" y="98" text-anchor="middle">${n}</text><path d="M70 120 C120 108 180 132 232 114 C240 111 246 108 250 104"/></svg>`;
    el.innerHTML=type==='quiet'?`<div class="ctoast">${LAMP}<div><b>${n} ${dn(n)} подряд</b><small>${ms||'Цель дня выполнена'}</small></div></div>`:`<div class="cstage">${art}<div class="ctext">${cap}</div></div>`;
    document.body.appendChild(el);
    if(type==='embers')sparks(el.querySelector('canvas'));
    const close=()=>{el.classList.add('out');setTimeout(()=>el.remove(),500)};
    el.addEventListener('click',close);setTimeout(close,type==='quiet'?2800:3400);
    if(navigator.vibrate)try{navigator.vibrate(type==='seal'?[18,40,10]:12)}catch(e){}
  }
  function sparks(cv){
    const dpr=devicePixelRatio||1,W=innerWidth,H=innerHeight;cv.width=W*dpr;cv.height=H*dpr;const g=cv.getContext('2d');g.scale(dpr,dpr);
    const P=Array.from({length:110},(_,i)=>({x:W/2+(Math.random()-.5)*W*.5,y:H*.62+Math.random()*H*.3,vx:(Math.random()-.5)*.6,vy:-(1.2+Math.random()*2.6),r:.8+Math.random()*2.4,l:0,L:70+Math.random()*90,d:Math.random()*30,h:30+Math.random()*22}));
    let f=0;(function step(){if(!cv.isConnected)return;g.clearRect(0,0,W,H);f++;
      for(const p of P){if(f<p.d)continue;p.l++;p.x+=p.vx+Math.sin((p.l+p.d)*.06)*.5;p.y+=p.vy;p.vy*=.992;const a=Math.max(0,1-p.l/p.L);
        g.globalCompositeOperation='lighter';g.fillStyle=`hsla(${p.h},100%,${60+a*20}%,${a})`;g.beginPath();g.arc(p.x,p.y,p.r*(.5+a*.6),0,7);g.fill();
        g.fillStyle=`hsla(${p.h},100%,60%,${a*.18})`;g.beginPath();g.arc(p.x,p.y,p.r*4,0,7);g.fill();
        if(p.l>p.L&&f<120){p.l=0;p.x=W/2+(Math.random()-.5)*W*.5;p.y=H*.7+Math.random()*H*.2;p.vy=-(1.2+Math.random()*2.6)}}
      requestAnimationFrame(step)})();
  }

  function start(){
    if(!$('#lampBtn')){const b=document.createElement('button');b.id='lampBtn';b.className='lampb off';b.setAttribute('aria-label','Серия чтения');b.innerHTML=LAMP+'<b></b>';
      const aa=$('#aaBtn');aa.parentNode.insertBefore(b,aa)}
    ui();setInterval(tick,5000);
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')ui()});
  }
  return{start,sheet,celebrate,calc,ui,check};
})();

Streak.start();
