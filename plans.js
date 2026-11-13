'use strict';
/* Ad fontes: планы чтения и закладки «где я остановился».
   Закладки: для каждой книги Библии запоминается глава и стих, на котором вы были (S.bpos).
   Планы: хронологический (по плану Blue Letter Bible), вся Библия за год, ВЗ+НЗ вместе,
   короткие планы и план по любой книге. День засчитывается сам, если все его главы
   прочитаны хотя бы 40 секунд после начала плана, или отмечается вручную. */
const Plans=(()=>{
  const CHRON='Gen.1-3|Gen.4-7|Gen.8-11|Job.1-5|Job.6-9|Job.10-13|Job.14-16|Job.17-20|Job.21-23|Job.24-28|Job.29-31|Job.32-34|Job.35-37|Job.38-39|Job.40-42|Gen.12-15|Gen.16-18|Gen.19-21|Gen.22-24|Gen.25-26|Gen.27-29|Gen.30-31|Gen.32-34|Gen.35-37|Gen.38-40|Gen.41-42|Gen.43-45|Gen.46-47|Gen.48-50|Exod.1-3|Exod.4-6|Exod.7-9|Exod.10-12|Exod.13-15|Exod.16-18|Exod.19-21|Exod.22-24|Exod.25-27|Exod.28-29|Exod.30-32|Exod.33-35|Exod.36-38|Exod.39-40|Lev.1-4|Lev.5-7|Lev.8-10|Lev.11-13|Lev.14-15|Lev.16-18|Lev.19-21|Lev.22-23|Lev.24-25|Lev.26-27|Num.1-2|Num.3-4|Num.5-6|Num.7|Num.8-10|Num.11-13|Num.14-15|Num.16-17|Num.18-20|Num.21-22|Num.23-25|Num.26-27|Num.28-30|Num.31-32|Num.33-34|Num.35-36|Deut.1-2|Deut.3-4|Deut.5-7|Deut.8-10|Deut.11-13|Deut.14-16|Deut.17-20|Deut.21-23|Deut.24-27|Deut.28-29|Deut.30-31|Deut.32-34,Ps.90|Josh.1-4|Josh.5-8|Josh.9-11|Josh.12-15|Josh.16-18|Josh.19-21|Josh.22-24|Judg.1-2|Judg.3-5|Judg.6-7|Judg.8-9|Judg.10-12|Judg.13-15|Judg.16-18|Judg.19-21|Ruth.1-4|1Sam.1-3|1Sam.4-8|1Sam.9-12|1Sam.13-14|1Sam.15-17|1Sam.18-20,Ps.11,Ps.59|1Sam.21-24,Ps.91|Ps.7,Ps.27,Ps.31,Ps.34,Ps.52|Ps.56,Ps.120,Ps.140-142|1Sam.25-27|Ps.17,Ps.35,Ps.54,Ps.63|1Sam.28-31,Ps.18|Ps.121,Ps.123-125,Ps.128-130|2Sam.1-4|Ps.6,Ps.8-10,Ps.14,Ps.16,Ps.19,Ps.21|1Chr.1-2|Ps.43-45,Ps.49,Ps.84-85,Ps.87|1Chr.3-5|Ps.73,Ps.77-78|1Chr.6|Ps.81,Ps.88,Ps.92-93|1Chr.7-10|Ps.102-104|2Sam.5,1Chr.11-12|Ps.133|Ps.106-107|1Chr.13-16|Ps.1-2,Ps.15,Ps.22-24,Ps.47,Ps.68|Ps.89,Ps.96,Ps.100-101,Ps.105,Ps.132|2Sam.6-7,1Chr.17|Ps.25,Ps.29,Ps.33,Ps.36,Ps.39|2Sam.8-9,1Chr.18|Ps.50,Ps.53,Ps.60,Ps.75|2Sam.10,1Chr.19,Ps.20|Ps.65-67,Ps.69-70|2Sam.11-12,1Chr.20|Ps.32,Ps.51,Ps.86,Ps.122|2Sam.13-15|Ps.3-4,Ps.12-13,Ps.28,Ps.55|2Sam.16-18|Ps.26,Ps.40,Ps.58,Ps.61-62,Ps.64|2Sam.19-21|Ps.5,Ps.38,Ps.41-42|2Sam.22-23,Ps.57|Ps.95,Ps.97-99|2Sam.24,1Chr.21-22,Ps.30|Ps.108-110|1Chr.23-25|Ps.131,Ps.138-139,Ps.143-145|1Chr.26-29,Ps.127|Ps.111-118|1Kgs.1-2,Ps.37,Ps.71,Ps.94|Ps.119|1Kgs.3-4|2Chr.1,Ps.72|Song.1-8|Prov.1-3|Prov.4-6|Prov.7-9|Prov.10-12|Prov.13-15|Prov.16-18|Prov.19-21|Prov.22-24|1Kgs.5-6,2Chr.2-3|1Kgs.7,2Chr.4|1Kgs.8,2Chr.5|2Chr.6-7,Ps.136|Ps.134,Ps.146-150|1Kgs.9,2Chr.8|Prov.25-26|Prov.27-29|Eccl.1-6|Eccl.7-12|1Kgs.10-11,2Chr.9|Prov.30-31|1Kgs.12-14|2Chr.10-12|1Kgs.15,2Chr.13-16|1Kgs.16,2Chr.17|1Kgs.17-19|1Kgs.20-21|1Kgs.22,2Chr.18|2Chr.19-23|Obad.1,Ps.82-83|2Kgs.1-4|2Kgs.5-8|2Kgs.9-11|2Kgs.12-13,2Chr.24|2Kgs.14,2Chr.25|Jonah.1-4|2Kgs.15,2Chr.26|Isa.1-4|Isa.5-8|Amos.1-5|Amos.6-9|2Chr.27,Isa.9-12|Mic.1-7|2Chr.28,2Kgs.16-17|Isa.13-17|Isa.18-22|Isa.23-27|2Kgs.18,2Chr.29-31,Ps.48|Hos.1-7|Hos.8-14|Isa.28-30|Isa.31-34|Isa.35-36|Isa.37-39,Ps.76|Isa.40-43|Isa.44-48|2Kgs.19,Ps.46,Ps.80,Ps.135|Isa.49-53|Isa.54-58|Isa.59-63|Isa.64-66|2Kgs.20-21|2Chr.32-33|Nah.1-3|2Kgs.22-23,2Chr.34-35|Zeph.1-3|Jer.1-3|Jer.4-6|Jer.7-9|Jer.10-13|Jer.14-17|Jer.18-22|Jer.23-25|Jer.26-29|Jer.30-31|Jer.32-34|Jer.35-37|Jer.38-40,Ps.74,Ps.79|2Kgs.24-25,2Chr.36|Hab.1-3|Jer.41-45|Jer.46-48|Jer.49-50|Jer.51-52|Lam.1-2|Lam.3-5|Ezek.1-4|Ezek.5-8|Ezek.9-12|Ezek.13-15|Ezek.16-17|Ezek.18-20|Ezek.21-22|Ezek.23-24|Ezek.25-27|Ezek.28-30|Ezek.31-33|Ezek.34-36|Ezek.37-39|Ezek.40-42|Ezek.43-45|Ezek.46-48|Joel.1-3|Dan.1-3|Dan.4-6|Dan.7-9|Dan.10-12|Ezra.1-3|Ezra.4-6,Ps.137|Hag.1-2|Zech.1-4|Zech.5-9|Zech.10-14|Esth.1-5|Esth.6-10|Ezra.7-10|Neh.1-5|Neh.6-7|Neh.8-10|Neh.11-13,Ps.126|Mal.1-4|Luke.1,John.1|Matt.1,Luke.2|Matt.2|Matt.3,Mark.1,Luke.3|Matt.4,Luke.4-5|John.2-4|Matt.8,Mark.2|John.5|Matt.12,Mark.3,Luke.6|Matt.5-7|Matt.9,Luke.7|Matt.11|Luke.11|Matt.13,Luke.8|Mark.4-5|Matt.10|Matt.14,Mark.6,Luke.9|John.6|Matt.15,Mark.7|Matt.16,Mark.8|Matt.17,Mark.9|Matt.18|John.7-8|John.9-10|Luke.10|Luke.12-13|Luke.14-15|Luke.16-17|John.11|Luke.18|Matt.19,Mark.10|Matt.20-21|Luke.19|Mark.11,John.12|Matt.22,Mark.12|Matt.23,Luke.20-21|Mark.13|Matt.24|Matt.25|Matt.26,Mark.14|Luke.22,John.13|John.14-17|Matt.27,Mark.15|Luke.23,John.18-19|Matt.28,Mark.16|Luke.24,John.20-21|Acts.1-3|Acts.4-6|Acts.7-8|Acts.9-10|Acts.11-12|Acts.13-14|Jas.1-5|Acts.15-16|Gal.1-3|Gal.4-6|Acts.17|1Thess.1-5,2Thess.1-3|Acts.18-19|1Cor.1-4|1Cor.5-8|1Cor.9-11|1Cor.12-14|1Cor.15-16|2Cor.1-4|2Cor.5-9|2Cor.10-13|Rom.1-3|Rom.4-7|Rom.8-10|Rom.11-13|Rom.14-16|Acts.20-23|Acts.24-26|Acts.27-28|Col.1-4,Phlm.1|Eph.1-6|Phil.1-4|1Tim.1-6|Titus.1-3|1Pet.1-5|Heb.1-6|Heb.7-10|Heb.11-13|2Tim.1-4|2Pet.1-3,Jude.1|1John.1-5|2John.1,3John.1|Rev.1-5|Rev.6-11|Rev.12-18|Rev.19-22';
  const pad=n=>String(n).padStart(2,'0'),dk=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,today=()=>dk(new Date());
  const dayDiff=(a,b)=>Math.round((new Date(b+'T12:00')-new Date(a+'T12:00'))/864e5);
  const chs=f=>BOOKS.filter(f).flatMap(b=>Array.from({length:b.chapters},(_,i)=>b.id+'.'+(i+1)));
  const split=(ks,n)=>{const out=[];for(let i=0;i<n;i++){const a=Math.round(i*ks.length/n),z=Math.round((i+1)*ks.length/n);out.push(ks.slice(a,z))}return out.filter(x=>x.length)};
  const unpack=s=>s.split('|').map(d=>d.split(',').flatMap(r=>{const [b,c]=r.split('.');const [a,z]=c.split('-').map(Number);return Array.from({length:(z||a)-a+1},(_,i)=>b+'.'+(a+i))}));
  const DEF=[
    {id:'chron',name:'Хронологический',sub:'Вся Библия за год в порядке событий',d:'Иов — рядом с Бытием, псалмы — в жизни Давида, пророки — при царях, Евангелия сведены вместе, послания — внутри Деяний. Порядок по плану Blue Letter Bible.',days:()=>unpack(CHRON),c:'#B5722A'},
    {id:'canon',name:'Вся Библия за год',sub:'От Бытия до Откровения по порядку',d:'3–4 главы в день, 365 дней.',days:()=>split(chs(()=>1),365),c:'#4C7DFF'},
    {id:'otnt',name:'Ветхий и Новый Завет вместе',sub:'Каждый день — отрывок из обоих Заветов',d:'За год: Ветхий Завет и параллельно Новый, чтобы не уставать от длинных книг.',days:()=>{const o=split(chs(b=>b.testament==='OT'),365),n=split(chs(b=>b.testament==='NT'),365);return o.map((x,i)=>x.concat(n[i]||[]))},c:'#3E7A4F'},
    {id:'nt90',name:'Новый Завет за 90 дней',sub:'Около трёх глав в день',d:'Весь Новый Завет за три месяца.',days:()=>split(chs(b=>b.testament==='NT'),90),c:'#6B4FBF'},
    {id:'gosp40',name:'Евангелия за 40 дней',sub:'Матфей, Марк, Лука, Иоанн',d:'89 глав о жизни Христа — две-три в день.',days:()=>split(chs(b=>['Matt','Mark','Luke','John'].includes(b.id)),40),c:'#C2643F'},
    {id:'ps30',name:'Псалтирь за месяц',sub:'Пять псалмов в день',d:'150 псалмов за 30 дней.',days:()=>split(chs(b=>b.id==='Ps'),30),c:'#1C7889'},
    {id:'prov31',name:'Притчи за месяц',sub:'Глава в день',d:'31 глава — по одной на каждый день месяца.',days:()=>split(chs(b=>b.id==='Prov'),31),c:'#A3382A'},
  ];
  const cache={};
  function plan(id){
    if(cache[id])return cache[id];
    let p=DEF.find(x=>x.id===id);
    if(!p&&id.startsWith('book:')){const [,bk,n]=id.split(':'),b=BOOKS[BI[bk]];if(!b)return null;
      p={id,name:b.ru,sub:`${n} ${pl(+n,'день','дня','дней')}`,d:'Свой план по книге.',days:()=>split(chs(x=>x.id===bk),+n),c:'#5A5F72',custom:1}}
    if(!p)return null;
    return cache[id]=Object.assign({},p,{D:p.days()});
  }
  const pl=(n,a,b,c)=>{const m=n%10,h=n%100;return m===1&&h!==11?a:m>=2&&m<=4&&(h<12||h>14)?b:c};
  const P=()=>S.plans||(S.plans={});
  /* какие главы прочитаны (≥40 с) начиная с даты */
  function readSince(start){const s=new Set();for(const [d,v] of Object.entries(S.days||{}))if(d>=start&&v.c)for(const [k,t] of Object.entries(v.c))if(t>=40)s.add(k);return s}
  function state(id){
    const p=plan(id),st=P()[id];if(!p||!st)return null;
    const rd=readSince(st.start),done=p.D.map((d,i)=>!!(st.done||{})[i]||d.every(k=>rd.has(k)));
    const nDone=done.filter(Boolean).length,next=done.indexOf(false),dd=dayDiff(st.start,today()),dayN=Math.min(p.D.length-1,dd);
    const behind=done.slice(0,dayN+1).filter(x=>!x).length-(done[dayN]?0:1);
    return{p,st,rd,done,nDone,next,dayN,wait:dd<0?-dd:0,behind:Math.max(0,behind),ahead:next>dayN+1?next-dayN-1:0,finished:next<0};
  }
  /* «Быт 12–15, Пс 11, 59» */
  function label(ks){
    const g=[];for(const k of ks){const [b,c]=k.split('.');const l=g[g.length-1];if(l&&l.b===b)l.c.push(+c);else g.push({b,c:[+c]})}
    return g.map(x=>{const b=BOOKS[BI[x.b]],all=b.chapters===x.c.length&&b.chapters>1,rs=[];let a=x.c[0],p=a;
      for(const c of x.c.slice(1).concat([null])){if(c===p+1){p=c;continue}rs.push(a===p?a:`${a}–${p}`);a=p=c}
      return b.chapters===1?b.ab:all?b.ab:`${b.ab} ${rs.join(', ')}`}).join('; ');
  }
  const goKey=k=>{const [b,c]=k.split('.');go(b,+c)};

  /* ---------- закладки по книгам ---------- */
  let lastSave=0;
  function trackPos(){
    if(S.sec!=='read'||typeof cur==='undefined')return;
    const vs=$$('#reader [data-v]');let v=0;for(const el of vs){if(el.getBoundingClientRect().bottom>90){v=+el.dataset.v||0;break}}
    S.bpos=S.bpos||{};const o=S.bpos[cur.book];
    if(!o||o.c!==cur.ch||o.v!==v){S.bpos[cur.book]={c:cur.ch,v,t:Date.now()};save();if(Date.now()-lastSave>15000){lastSave=Date.now();touchSettings()}}
  }
  let tT=0;addEventListener('scroll',()=>{clearTimeout(tT);tT=setTimeout(trackPos,500)},{passive:true});
  const recentBooks=n=>Object.entries(S.bpos||{}).filter(([b])=>BI[b]!==undefined).sort((a,b)=>b[1].t-a[1].t).slice(0,n);
  function contHTML(n=8){
    const bs=recentBooks(n);if(!bs.length)return'';
    return `<div class="contrd">${bs.map(([b,p])=>{const B=BOOKS[BI[b]],pct=Math.round(p.c/B.chapters*100);
      return `<button data-bpgo="${b}|${p.c}|${p.v||0}" class="g-${genreOf(b)}"><b>${esc(B.ab)} ${p.c}${p.v>1?':'+p.v:''}</b><small>${esc(B.ru)}</small><i style="--p:${pct}%"></i></button>`}).join('')}</div>`;
  }
  /* выбор книги: «продолжить с …» */
  const _bs=window.bookSheet;
  window.bookSheet=function(sel){
    _bs(sel);
    if(sel){const p=(S.bpos||{})[sel];if(p){const g=$('#sheet .nums');if(g){g.insertAdjacentHTML('beforebegin',`<button class="bkcont" data-bpgo="${sel}|${p.c}|${p.v||0}">Продолжить с главы ${p.c}${p.v>1?', стих '+p.v:''} <span>→</span></button>`);const b=g.querySelector(`[data-go="${sel}.${p.c}"]`);if(b)b.classList.add('last')}}}
    else{const h=contHTML(6);if(h){const t=$('#sheet h3');if(t)t.insertAdjacentHTML('afterend',`<div class="conth">Продолжить чтение</div>`+h)}}
  };

  /* ---------- графики ---------- */
  function stats(s){
    const set=new Set(s.p.D.flat()),byDay={};
    for(const [d,v] of Object.entries(S.days||{}))if(d>=s.st.start&&v.c)for(const [k,t] of Object.entries(v.c))if(t>=40&&set.has(k))byDay[d]=(byDay[d]||0)+1;
    const total=set.size,read=[...set].filter(k=>s.rd.has(k)).length;
    const el=Math.max(1,dayDiff(s.st.start,today())+1),pace=s.nDone/el;
    let eta='';if(!s.finished&&pace>0){const left=s.p.D.length-s.nDone,dt=new Date();dt.setDate(dt.getDate()+Math.ceil(left/pace));eta=dt.toLocaleDateString('ru-RU',{day:'numeric',month:'short'}).replace('.','')}
    let run=0;for(let i=0;i<60;i++){const d=new Date();d.setDate(d.getDate()-i);const k=dk(d);if(byDay[k])run++;else if(i>0)break}
    return{byDay,total,read,eta,run};
  }
  /* полоса книг: каждая книга — отрезок по числу глав, закрашено прочитанное */
  function coverage(s){
    const books=[];for(const k of s.p.D.flat()){const b=k.split('.')[0];let x=books.find(y=>y.b===b);if(!x)books.push(x={b,n:0,r:0});x.n++;if(s.rd.has(k))x.r++}
    books.sort((a,b)=>BI[a.b]-BI[b.b]);const N=books.reduce((a,x)=>a+x.n,0);
    return `<div class="plcov" role="img" aria-label="Прочитано по книгам">${books.map((x,i)=>`<span class="g-${genreOf(x.b)}" style="flex:${x.n};--r:${(x.r/x.n*100).toFixed(1)}%;--i:${i}" title="${esc(BOOKS[BI[x.b]].ru)}: ${x.r} из ${x.n}"></span>`).join('')}</div>
      <div class="plcovl">${books.length>8?`<span>${esc(BOOKS[BI[books[0].b]].ab)}</span><span>${esc(BOOKS[BI[books[books.length-1].b]].ab)}</span>`:books.map(x=>`<span style="flex:${x.n}">${esc(BOOKS[BI[x.b]].ab)}</span>`).join('')}</div>`;
  }
  /* 14 дней: столбики глав в день */
  function bars(st){
    const days=[];for(let i=13;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);days.push([dk(d),d])}
    const mx=Math.max(3,...days.map(([k])=>st.byDay[k]||0));
    return `<div class="plbars">${days.map(([k,d],i)=>{const v=st.byDay[k]||0;return `<div class="plb${k===today()?' td':''}" title="${d.toLocaleDateString('ru-RU',{day:'numeric',month:'short'})}: ${v} гл."><i style="--h:${(v/mx*100).toFixed(0)}%;--i:${i}">${v?`<em>${v}</em>`:''}</i><span>${'пвсчпсв'[(d.getDay()+6)%7]}</span></div>`}).join('')}</div>`;
  }
  /* сетка всех дней плана */
  function grid(s){
    return `<div class="plgrd" style="--cols:${s.p.D.length>120?(isM()?26:37):Math.min(s.p.D.length,15)}">${s.p.D.map((d,i)=>`<i class="${s.done[i]?'ok':i<=s.dayN?'miss':''}${i===s.next?' nx':''}" style="--i:${i}" title="День ${i+1}: ${esc(label(d))}"></i>`).join('')}</div>`;
  }

  /* ---------- подробно о плане (до начала) ---------- */
  const ERAS={chron:[[0,'Начало и патриархи'],[29,'Исход и пустыня'],[81,'Завоевание и судьи'],[97,'Царство: Саул, Давид, Соломон'],[173,'Разделённое царство и пророки'],[238,'Плен'],[259,'Возвращение'],[273,'Жизнь Христа'],[319,'Церковь и послания']]};
  const ERC=['#B5722A','#C2643F','#8A6B3E','#3E7A4F','#1C7889','#6B4FBF','#4C7DFF','#E2627F','#E39A2B'];
  function startDate(k){const d=new Date();d.setHours(12,0,0,0);
    if(k==='tom')d.setDate(d.getDate()+1);
    if(k==='mon')d.setDate(d.getDate()+((8-d.getDay())%7||7));
    if(k==='m1'){d.setMonth(d.getMonth()+1,1)}
    return d}
  const fmtD=(d,o)=>d.toLocaleDateString('ru-RU',o||{day:'numeric',month:'long'});
  function months(p,sd){
    const days=p.D.length,mx=Math.max(...p.D.map(d=>d.length)),out=[];
    const end=new Date(sd);end.setDate(end.getDate()+days-1);
    let m=new Date(sd.getFullYear(),sd.getMonth(),1);
    while(m<=end){const y=m.getFullYear(),mo=m.getMonth(),first=(new Date(y,mo,1).getDay()+6)%7,n=new Date(y,mo+1,0).getDate();
      let cells='';for(let i=0;i<first;i++)cells+='<i class="e"></i>';
      for(let d=1;d<=n;d++){const dt=new Date(y,mo,d,12),idx=Math.round((dt-sd)/864e5);
        if(idx<0||idx>=days){cells+=`<i class="o">${d}</i>`;continue}
        const lv=Math.ceil(p.D[idx].length/mx*4);cells+=`<button class="l${lv}${idx===VSEL?' sel':''}" data-plsel="${idx}" title="${esc(label(p.D[idx]))}">${d}</button>`}
      out.push(`<div class="plmon"><b>${m.toLocaleDateString('ru-RU',{month:'long'})}${y!==new Date().getFullYear()?' '+y:''}</b><div class="plmg"><span>пн</span><span>вт</span><span>ср</span><span>чт</span><span>пт</span><span>сб</span><span>вс</span>${cells}</div></div>`);
      m=new Date(y,mo+1,1)}
    return out;
  }
  function detail(){
    const id=VIEW==='book'?`book:${VBOOK}:${VDAYS}`:VIEW,p=plan(id);if(!p){VIEW=null;return render()}
    const N=p.D.length,C=p.D.flat().length,sd=startDate(VSTART),end=new Date(sd);end.setDate(end.getDate()+N-1);
    if(VSEL>=N)VSEL=0;
    const books=[];for(const k of p.D.flat()){const b=k.split('.')[0];let x=books.find(y=>y.b===b);if(!x)books.push(x={b,n:0});x.n++}
    const era=ERAS[VIEW];
    const sdd=new Date(sd);sdd.setDate(sdd.getDate()+VSEL);
    let h=`<div class="pg plp pld" style="--pc:${p.c}">
      <button class="mini" data-plback>‹ Все планы</button>
      <header class="pldh"><div class="pldk">План чтения</div><h1>${esc(VIEW==='book'?'План по книге':p.name)}</h1><p>${esc(VIEW==='book'?'Любая книга Библии в своём темпе':p.sub)}</p>${VIEW==='book'?'':`<small>${esc(p.d)}</small>`}</header>`;
    if(VIEW==='book')h+=`<div class="plform big"><select data-plbook>${BOOKS.map(b=>`<option value="${b.id}"${b.id===VBOOK?' selected':''}>${esc(b.ru)}</option>`).join('')}</select><label>за <input type="number" min="1" max="365" value="${VDAYS}" data-pln> ${pl(VDAYS,'день','дня','дней')}</label></div>`;
    h+=`<div class="pldstats"><div><b>${N}</b><small>${pl(N,'день','дня','дней')}</small></div><div><b>${C}</b><small>${pl(C,'глава','главы','глав')}</small></div><div><b>${(C/N).toFixed(C/N<10?1:0).replace('.',',')}</b><small>глав в день</small></div><div><b>~${Math.max(1,Math.round(C/N*4))}</b><small>минут в день</small></div></div>`;
    if(era){h+=`<h5>Путь по истории</h5><div class="plera">${era.map(([s,n],i)=>{const e=(era[i+1]||[N])[0];return `<button data-plsel="${s}" style="flex:${e-s};--ec:${ERC[i]}" title="${esc(n)}: дни ${s+1}–${e}"><span>${esc(n)}</span></button>`}).join('')}</div><div class="plerl">${era.map(([s,n],i)=>`<span style="--ec:${ERC[i]}"><i></i>${esc(n)} <em>дни ${s+1}–${(era[i+1]||[N])[0]}</em></span>`).join('')}</div>`}
    h+=`<h5>Что вы прочитаете</h5><div class="plcov">${books.map((x,i)=>`<span class="g-${genreOf(x.b)}" style="flex:${x.n};--r:100%;--i:${i}" title="${esc(BOOKS[BI[x.b]].ru)}: ${x.n} гл."></span>`).join('')}</div><div class="plbooks">${books.length>14?`${books.length} ${pl(books.length,'книга','книги','книг')}: ${esc(BOOKS[BI[books[0].b]].ru)} … ${esc(BOOKS[BI[books[books.length-1].b]].ru)}`:books.map(x=>esc(BOOKS[BI[x.b]].ru)).join(' · ')}</div>`;
    h+=`<h5>Начать</h5><div class="sseg plstart">${[['today','Сегодня'],['tom','Завтра'],['mon','С понедельника'],['m1','С 1-го']].map(([k,n])=>`<button data-plsd="${k}" class="${VSTART===k?'on':''}">${n}</button>`).join('')}</div>
      <p class="hint">${fmtD(sd,{day:'numeric',month:'long',weekday:'long'})} — ${fmtD(end,{day:'numeric',month:'long',year:'numeric'})}</p>`;
    const MS=months(p,sd);h+=`<h5>Календарь</h5><div class="plcal">${MS.slice(0,3).join('')}</div>${MS.length>3?`<details class="plall"${VALL?' open':''} data-plcal><summary>Весь календарь · ${MS.length} мес.</summary><div class="plcal">${MS.slice(3).join('')}</div></details>`:''}
      <div class="plpick"><div class="plh">День ${VSEL+1} · ${fmtD(sdd,{day:'numeric',month:'long',weekday:'short'})}</div><div class="plpr">${esc(label(p.D[VSEL]))}</div></div>`;
    h+=`<details class="plall"><summary>Все ${N} ${pl(N,'день','дня','дней')} списком</summary><div class="pldays">${p.D.map((d,i)=>{const dt=new Date(sd);dt.setDate(dt.getDate()+i);return `<button data-plsel="${i}"><b>${i+1}</b><span class="pldt">${fmtD(dt,{day:'numeric',month:'short'})}</span>${esc(label(d))}</button>`}).join('')}</div></details>`;
    h+=`<div class="plcta"><button class="sbtn pri" data-plbegin="${id}">${P()[id]?'План уже идёт':`Начать план · ${fmtD(sd)}`}</button></div></div>`;
    const y=scrollY,first=!$('#page .pld');$('#page').innerHTML=h;if(first)scrollTo(0,0);else scrollTo(0,y);
    if(first)$('#page .pld').classList.add('anim');
  }
  /* ---------- страница планов ---------- */
  function card(id){
    const s=state(id);if(!s)return'';const {p}=s,N=p.D.length,pct=Math.round(s.nDone/N*100);
    const di=s.finished?-1:s.next,day=di>=0?p.D[di]:[];
    const status=s.wait?`начнётся ${new Date(s.st.start+'T12:00').toLocaleDateString('ru-RU',{day:'numeric',month:'long'})}`:s.finished?'План пройден!':s.behind?`отставание: ${s.behind} ${pl(s.behind,'день','дня','дней')}`:s.ahead?`впереди на ${s.ahead} ${pl(s.ahead,'день','дня','дней')}`:'по графику';
    return `<article class="plc" style="--pc:${p.c}">
      <header><div class="plring" style="--pct:${pct}"><span>${pct}%</span></div><div><h3>${esc(p.name)}</h3><p>${s.finished?'':`День ${di+1} из ${N}`} · <span class="${s.behind?'warn':''}">${status}</span></p></div></header>
      ${(()=>{const t=stats(s);return `<div class="plstats"><div><b data-cnt="${t.read}">${t.read}</b><small>глав из ${t.total}</small></div><div><b data-cnt="${t.run}">${t.run}</b><small>${pl(t.run,'день','дня','дней')} подряд</small></div><div><b>${s.finished?'✓':t.eta||'—'}</b><small>${s.finished?'завершён':'прогноз окончания'}</small></div></div>
        <div class="plviz"><div class="plvh">Пройдено по книгам</div>${coverage(s)}<div class="plvh">Последние две недели</div>${bars(t)}<div class="plvh">Все дни плана</div>${grid(s)}</div>`})()}
      ${s.finished?'':`<div class="pltoday"><div class="plh">${di<=s.dayN?'Сегодня':'Следующее чтение'}</div>${day.length?`<div class="plread">${groupRows(day,s.rd)}</div>`:''}
        <div class="plact"><button class="sbtn pri" data-plgo="${id}|${di}">Читать</button><button class="sbtn" data-pldone="${id}|${di}">Отметить день</button></div></div>`}
      <details class="plall"><summary>Весь план</summary><div class="pldays">${p.D.map((d,i)=>`<button data-plday="${id}|${i}" class="${s.done[i]?'ok':''}${i===di?' cur':''}"><b>${i+1}</b>${esc(label(d))}</button>`).join('')}</div></details>
      <footer><button class="lnk" data-plrestart="${id}">Начать заново с сегодня</button><button class="lnk danger" data-pldel="${id}">Убрать план</button></footer>
    </article>`;
  }
  function groupRows(ks,rd){const g=[];for(const k of ks){const b=k.split('.')[0];const l=g[g.length-1];if(l&&l.b===b)l.k.push(k);else g.push({b,k:[k]})}
    return g.map(x=>{const ok=x.k.every(k=>rd.has(k));const n=x.k.filter(k=>rd.has(k)).length;return `<button data-plk="${x.k.find(k=>!rd.has(k))||x.k[0]}" class="${ok?'ok':''}"><i></i>${esc(label(x.k))}${!ok&&n?`<small class="plpart">${n} из ${x.k.length}</small>`:''}</button>`}).join('')}
  let VALL=false,VIEW=null,VSTART='today',VSEL=0,VBOOK='Rom',VDAYS=14;
  function render(){
    if(VIEW)return detail();
    const act=Object.keys(P()).filter(id=>plan(id));
    const free=DEF.filter(d=>!P()[d.id]);
    let h=`<div class="pg plp"><div class="pghead"><h1>Планы чтения</h1></div>`;
    const ch=contHTML(10);if(ch)h+=`<h5>Продолжить чтение</h5>`+ch;
    if(act.length)h+=`<h5>Мои планы</h5><div class="plgrid">${act.map(card).join('')}</div>`;
    h+=`<h5>${act.length?'Ещё планы':'Выберите план'}</h5><div class="plcat">${free.map(d=>{const P0=plan(d.id),n=P0.D.length,c=P0.D.flat().length;return `<button class="plopt" data-plview="${d.id}" style="--pc:${d.c}"><div><b>${esc(d.name)}</b><span>${esc(d.sub)}</span><small>${n} ${pl(n,'день','дня','дней')} · ${c} ${pl(c,'глава','главы','глав')} · ~${Math.max(1,Math.round(c/n*4))} мин в день</small></div><i class="plgo">›</i></button>`}).join('')}
      <button class="plopt own" data-plview="book"><div><b>План по книге</b><span>Любая книга Библии за выбранное число дней</span><small>Выберите книгу и темп — увидите расписание</small></div><i class="plgo">›</i></button></div>`;
    h+=`<p class="hint">День засчитывается сам, когда вы прочитали все его главы (хотя бы 40 секунд на главе), или отметьте его вручную. Хронологический порядок — по плану <a href="https://www.blueletterbible.org/assets-v3/pdf/dbrp/1Yr_ChronologicalPlan.pdf" target="_blank" rel="noopener">Blue Letter Bible</a>; датировка некоторых книг (Иов, Иоиль, псалмы) спорна, план следует распространённому мнению.</p></div>`;
    const y=scrollY,first=!$('#page .plp');$('#page').innerHTML=h;scrollTo(0,y);
    if(first&&!S.calm&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
      $$('#page .plring').forEach(r=>{const to=+getComputedStyle(r).getPropertyValue('--pct')||0,sp=r.querySelector('span'),t0=performance.now();
        const st=t=>{const k=Math.min(1,(t-t0)/1100),e=1-Math.pow(1-k,3),v=to*e;r.style.setProperty('--pct',v.toFixed(1));sp.textContent=Math.round(v)+'%';if(k<1)requestAnimationFrame(st)};r.style.setProperty('--pct',0);requestAnimationFrame(st)});
      $$('#page [data-cnt]').forEach(b=>{const to=+b.dataset.cnt,t0=performance.now();if(!to)return;const st=t=>{const k=Math.min(1,(t-t0)/900);b.textContent=Math.round(to*(1-Math.pow(1-k,3)));if(k<1)requestAnimationFrame(st)};requestAnimationFrame(st)});
      $('#page .plp').classList.add('anim');
    }
  }
  const start=(id,sd)=>{P()[id]={start:sd?dk(sd):today(),done:{}};VIEW=null;touchSettings();save();render();scrollTo(0,0)};
  document.addEventListener('toggle',e=>{if(e.target.matches&&e.target.matches('[data-plcal]'))VALL=e.target.open},true);
  document.addEventListener('change',e=>{if(S.sec!=='plans'||VIEW!=='book')return;if(e.target.matches('[data-plbook]'))VBOOK=e.target.value;if(e.target.matches('[data-pln]'))VDAYS=Math.max(1,Math.min(365,+e.target.value||14));VSEL=0;render()});
  document.addEventListener('click',e=>{
    const t=e.target;
    const bp=t.closest('[data-bpgo]');if(bp){const [b,c,v]=bp.dataset.bpgo.split('|');closeModal();go(b,+c,+v||undefined);return}
    if(S.sec!=='plans'&&!t.closest('.plnext'))return;
    const q=(a)=>{const el=t.closest('['+a+']');return el&&el.getAttribute(a)};
    let v;
    if(v=q('data-plstart'))return start(v);
    if(v=q('data-plview')){VIEW=v;VSTART='today';VSEL=0;return render()}
    if(t.closest('[data-plback]')){VIEW=null;render();scrollTo(0,0);return}
    if(v=q('data-plsd')){VSTART=v;return render()}
    if((v=q('data-plsel'))!=null&&VIEW){VSEL=+v;render();const el=$('.plpick');if(el&&el.getBoundingClientRect().top>innerHeight-120)el.scrollIntoView({block:'center',behavior:'smooth'});return}
    if(v=q('data-plbegin')){if(!P()[v])start(v,startDate(VSTART));else{VIEW=null;render()}return}
    if(t.closest('[data-plown]')){const b=$('[data-plbook]').value,n=Math.max(1,Math.min(365,+$('[data-pln]').value||14));return start(`book:${b}:${n}`)}
    if(v=q('data-plk'))return goKey(v);
    if(v=q('data-plgo')){const [id,i]=v.split('|'),s=state(id),d=s.p.D[+i];return goKey(d.find(k=>!s.rd.has(k))||d[0])}
    if(v=q('data-pldone')){const [id,i]=v.split('|');const st=P()[id];st.done=st.done||{};st.done[i]=1;touchSettings();save();render();burst(id);return}
    if(v=q('data-plday')){const [id,i]=v.split('|');const st=P()[id];st.done=st.done||{};if(st.done[i])delete st.done[i];else st.done[i]=1;touchSettings();save();return render()}
    if(v=q('data-plrestart')){if(confirm('Начать план заново с сегодняшнего дня? Отметки будут сброшены.'))start(v);return}
    if(v=q('data-pldel')){if(confirm('Убрать этот план?')){delete P()[v];touchSettings();save();render()}return}
  });
  /* отметка дня: галочка и брызги цвета плана */
  function burst(id){
    if(S.calm||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const card=[...$$('.plc')].find(c=>c.querySelector(`[data-pldel="${id}"]`));if(!card)return;const ring=card.querySelector('.plring');if(!ring)return;
    const r=ring.getBoundingClientRect(),c=getComputedStyle(card).getPropertyValue('--pc')||'#4C7DFF';
    const box=document.createElement('div');box.className='plburst';box.style.left=(r.left+r.width/2)+'px';box.style.top=(r.top+r.height/2)+'px';
    box.innerHTML=`<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="${c}"/><path d="M12 20.5l5.5 5.5 11-12" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`+Array.from({length:14},(_,i)=>`<i style="--a:${i*360/14}deg;--d:${38+Math.random()*26}px;background:${c}"></i>`).join('');
    document.body.appendChild(box);setTimeout(()=>box.remove(),1100);
  }
  /* в конце главы: следующее по плану */
  function chapterHint(){
    if(S.sec!=='read'||typeof cur==='undefined')return;const R=$('#reader');if(!R||R.querySelector('.plnext'))return;
    const k=cur.book+'.'+cur.ch;
    for(const id of Object.keys(P())){const s=state(id);if(!s||s.finished)continue;
      const d=s.p.D[s.next];if(!d||!d.includes(k))continue;
      const i=d.indexOf(k),nk=d.slice(i+1).find(x=>!s.rd.has(x))||(s.p.D[s.next+1]||[])[0];
      const nav=R.querySelector('.chnav');const h=`<div class="plnext" style="--pc:${s.p.c}"><span>«${esc(s.p.name)}», день ${s.next+1}</span>${nk?`<button data-plk="${nk}">Дальше по плану: ${esc(label([nk]))} →</button>`:''}</div>`;
      if(nav)nav.insertAdjacentHTML('beforebegin',h);else R.insertAdjacentHTML('beforeend',h);return}
  }
  new MutationObserver(()=>{clearTimeout(chapterHint._t);chapterHint._t=setTimeout(chapterHint,200)}).observe($('#reader'),{childList:true});
  return{render:()=>{render()},reset:()=>{VIEW=null},contHTML,label,state};
})();
