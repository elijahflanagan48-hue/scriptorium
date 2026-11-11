'use strict';
/* Библиотека: сочинения вне Библии в единой адресации часть → глава → стих.
   Тексты лежат в data/lib/<сочинение>/…; закрытые (access:"account") отдаёт сервер после входа.
   Септуагинта сопоставлена с еврейской нумерацией (data/lib/xref/lxx_heb.json). */
const Lib=(()=>{
  const P=()=>$('#page');
  const mans={},dc=new Map();let QS='',XR=null,LIM=120,CHS=[],LAST=false,HIT=null;
  const ST=()=>S.lib||(S.lib={});
  const man=async id=>mans[id]||(mans[id]=await J(`data/lib/${id}/work.json`));
  const hasAcc=()=>!!(Sync.user&&Sync.user.access);
  const num=k=>{const m=/^\d+/.exec(k);return m?+m[0]:0};
  const cmp=(a,b)=>num(a)-num(b)||(a<b?-1:a>b?1:0);
  const LBL={NIESE:'Греч. · Нисе',WHISTON:'Англ. · Уистон',CW:'Греч. · Кон–Вендланд',YONGE:'Англ. · Йонг',RST:'Синод.',KJVA:'KJV',RAHLFS:'LXX · Ральфс',KAHANA:'Евр. · Кахана',DSS:'Иврит · рукопись'};
  const lbl=t=>LBL[t.tid]||t.tid;
  const plain=t=>t.lang==='grc'?'grc':t.lang==='heb'?'heb':t.lang==='en'?'en':'ru';

  /* ---------- данные ---------- */
  function textOf(w,t,pid){
    const key=`${w.id}/${t.tid}/${pid}`;
    if(!dc.has(key)){
      let pr;
      if(t.from){/* производный текст: берём часть чужого сочинения (оригинал апокрифов из Септуагинты) */
        const sp=t.from.map[pid],spec=typeof sp==='string'?{p:sp}:sp;
        pr=hasAcc()?Sync.pget(`lib/${t.from.work}/${t.from.tid}/${spec.p}`).then(d=>{d=d.chapters||d;
          if(!spec.c)return d;const cv=d[spec.c]||{},o={};
          for(const k of Object.keys(cv))if(!spec.v||(num(k)>=spec.v[0]&&num(k)<=spec.v[1]))o[k]=cv[k];
          return {[spec.c]:o}}):Promise.resolve({locked:true});
        dc.set(key,Promise.resolve(pr).catch(()=>null).then(d=>{if(!d||d.locked){dc.delete(key);return d||null}return d}));
        return dc.get(key);
      }
      pr=t.access==='account'?(hasAcc()?Sync.pget('lib/'+key):Promise.resolve({locked:true})):J(`data/lib/${w.id}/tr/${t.tid}/${pid}.json`);
      dc.set(key,Promise.resolve(pr).catch(()=>null).then(d=>{if(!d||d.locked){dc.delete(key);return d||null}return d.chapters||d}));
    }
    return dc.get(key);
  }
  function chosen(w){
    const sel=(ST().t||{})[w.id];let ids=sel&&sel.filter(x=>w.texts.some(t=>t.tid===x));
    if(!ids||!ids.length){const pub=w.texts.filter(t=>t.access==='public');ids=(pub.length?pub:w.texts).slice(0,2).map(t=>t.tid)}
    return ids;
  }
  /* ---------- соответствие LXX → еврейская нумерация ---------- */
  function heb(pid,c,k){
    if(!XR)return null;
    let b=XR.parts[pid]||pid,cc=+c;
    if(Array.isArray(b)){let hit=null;for(const r of b){const [nm,rg,off]=r.split(':'),[a,z]=rg.split('-').map(Number);if(cc>=a&&cc<=z){hit=nm;cc+=+off;break}}if(!hit)return null;b=hit}
    const vv=num(k),m=XR.books[b]&&XR.books[b].g2h[cc+':'+vv];
    if(m==='-')return '-';
    let hb=b,hc=cc,hv=vv;
    if(m){const q=m.split(' ');let r=m;if(q.length===2){hb=q[0];r=q[1]}[hc,hv]=r.split(':').map(Number)}
    if(BI[hb]===undefined||hc<1||hc>BOOKS[BI[hb]].chapters)return null;
    return{b:hb,c:hc,v:hv};
  }
  /* ---------- сопоставление строк между текстами ---------- */
  function plan(w,ds){
    const live=ds.filter(Boolean);
    if(w.id!=='apocrypha'||live.length<2){
      const keys=[...new Set(ds.flatMap(d=>d?Object.keys(d):[]))].sort(cmp);
      return keys.map(k=>({k,m:ds.map(d=>d&&d[k]!=null?[k]:null)}));
    }
    const base=ds.findIndex(Boolean),bk=Object.keys(ds[base]).sort(cmp),rows=bk.map(k=>({k,m:ds.map(()=>null)}));
    ds.forEach((d,i)=>{if(!d)return;if(i===base){rows.forEach(r=>r.m[i]=[r.k]);return}
      const ok=Object.keys(d).sort(cmp),same=ok.length===bk.length;
      ok.forEach((k,j)=>{const r=rows[same?j:Math.min(rows.length-1,Math.floor(j*rows.length/ok.length))];(r.m[i]=r.m[i]||[]).push(k);if(!same)r.ap=true})});
    return rows;
  }
  const body=(v,t)=>Array.isArray(v)?v.map(x=>`<span class="w" data-f="${esc(x[0])}" data-s="${esc(x[1]||'')}">${esc(x[0])}</span>`).join(' '):esc(v);
  const VOC={josephus:{p:'Книга',c:'Глава',vs:'разделы',c0:'Содержание книги'},philo:{p:'Трактат',c:'Глава',vs:'параграфы'},lxx:{p:'Книга',c:'Глава',vs:'стихи',c0:'Пролог'},
    apocrypha:{p:'Книга',c:'Глава',vs:'стихи',c0:'Пролог'},qumran:{p:'Свиток',c:'Фрагмент',vs:'строки'}};
  const voc=w=>VOC[w.id]||{p:'Часть',c:'Глава',vs:'стихи'};
  const disp=(w,c,k)=>k==='0'?'загл.':w.id==='josephus'?`${c}.${k}`:w.id==='philo'?`§${k}`:`${c}:${k}`;

  /* ---------- вход и навигация ---------- */
  async function open(id,pid,c,hit){
    const w=await man(id);if(!w){P().innerHTML='<div class="pg"><p class="hint">Не удалось открыть сочинение.</p></div>';return}
    const s=ST();
    if(!pid&&s.w===id){pid=s.p;c=s.c}
    if(!pid||!w.parts.some(p=>p.id===pid)){pid=w.parts[0].id;c=null}
    s.w=id;s.p=pid;s.c=c==null?'':String(c);LIM=120;if(hit){HIT=hit;LIM=400}save();
    if(id==='lxx'&&!XR)XR=await J('data/lib/xref/lxx_heb.json');
    if(S.sec!=='lib')showSec('lib');
    view();
  }
  async function view(){
    const s=ST(),w=await man(s.w);if(!w)return;
    const ts=chosen(w).map(i=>w.texts.find(t=>t.tid===i));
    const box=P();
    box.innerHTML=`<div class="pg lrd-pg"><div class="lhd"><button class="mini" data-lb="back">‹ Полки</button><h1>${esc(w.title_ru)}</h1></div><div class="hint">Загружаю…</div></div>`;
    const ds=await Promise.all(ts.map(t=>t.parts.includes(s.p)?textOf(w,t,s.p):null));
    if(ST().w!==w.id||ST().p!==s.p)return;
    const locked=ts.some((t,i)=>t.access==='account'&&ds[i]&&ds[i].locked);
    const chs=[...new Set(ds.flatMap(d=>d&&!d.locked?Object.keys(d):[]))].sort(cmp);CHS=chs;
    if(LAST){LAST=false;if(chs.length)s.c=chs[chs.length-1]}
    const c=chs.includes(s.c)?s.c:(chs[0]||'');if(c!==s.c){s.c=c;save()}
    const cd=ds.map(d=>d&&!d.locked?d[c]||null:null);
    const rows=plan(w,cd),multi=chs.length>1;
    const V=voc(w),ttl={};
    if(w.id==='josephus')chs.forEach(k=>{for(const d of ds){const x=d&&!d.locked&&d[k]&&d[k]['0'];if(typeof x==='string'&&x.trim()){let y=x.trim();if(y===y.toUpperCase())y=y.charAt(0)+y.slice(1).toLowerCase();ttl[k]=y.replace(/^CHAPTER\s+\S+\.?\s*/i,'').replace(/^[A-Za-zα-ωΑ-Ω]+\.\s*/,'');break}}});
    const part=w.parts.find(p=>p.id===s.p)||{},nch=chs.filter(x=>x!=='0').length;
    const chLbl=k=>k==='0'?(V.c0||'Заглавие'):`${V.c} ${k}${ttl[k]?' — '+(ttl[k].length>46?ttl[k].slice(0,46)+'…':ttl[k]):''}`;
    const sel=w.parts.map(p=>`<option value="${esc(p.id)}" ${p.id===s.p?'selected':''}>${esc(p.title_ru)}</option>`).join('');
    const chsel=multi?`<label class="lsel"><span>${esc(V.c)}</span><select id="lch" aria-label="${esc(V.c)}">${chs.map(k=>`<option value="${esc(k)}" ${k===c?'selected':''}>${esc(chLbl(k))}</option>`).join('')}</select></label>`:'';
    const nums=rows.map(r=>r.k).filter(k=>k!=='0'),pos=`${esc(part.title_ru||'')}${multi?` · ${c==='0'?esc(V.c0||'заглавие'):esc(V.c.toLowerCase())+' '+esc(c)+' из '+nch}`:''}${nums.length?` · ${esc(V.vs)} ${esc(nums[0])}–${esc(nums[nums.length-1])}`:''}`;
    const chips=w.texts.map(t=>{const on=ts.includes(t),lock=t.access==='account'&&!hasAcc();return `<button data-ltid="${esc(t.tid)}" class="${on?'on':''}" title="${esc(t.name)}">${lock?'🔒 ':''}${esc(lbl(t))}</button>`}).join('');
    let h=`<div class="pg lrd-pg"><div class="lhd"><button class="mini" data-lb="back">‹ Полки</button><h1>${esc(w.title_ru)}</h1></div>`+
      `<div class="lbar"><label class="lsel"><span>${esc(V.p)}</span><select id="lpart" aria-label="${esc(V.p)}">${sel}</select></label>${chsel}<button class="mini" data-lstep="-1" title="Предыдущая ${esc(V.c.toLowerCase())}">‹ Назад</button><button class="mini" data-lstep="1" title="Следующая ${esc(V.c.toLowerCase())}">Дальше ›</button></div>`+
      `<div class="lpos">${pos}</div>`+
      `<div class="lchips">${chips}</div>`+`<form class="lsf" id="lsf"><input id="lq" value="${esc(QS)}" placeholder="Поиск по этому сочинению (первый выбранный текст)" autocomplete="off" enterkeyhint="search"><button class="mini">Найти</button></form><div id="lres"></div>`;
    if(locked)h+=`<div class="lnote warm">Этот текст открывается после входа в личный кабинет с доступом. <button class="mini" data-lacct>Войти</button></div>`;
    if(w.id==='lxx')h+=`<div class="lnote">Нумерация Септуагинты. Справа от каждого стиха — соответствие в еврейском тексте (по таблице TVTMS, Tyndale House); нажмите, чтобы открыть Библию на этом месте. Нажмите на слово — карточка слова.</div>`;
    if(w.id==='apocrypha'&&ts.length>1)h+=`<div class="lnote">У переводов разная нумерация стихов. Где число стихов в главе не совпадает, соответствие приблизительное — такие строки помечены «≈».</div>`;
    if(w.id==='josephus')h+=`<div class="lnote">Нумерация Уистона: книга, глава, раздел (Древн. 18.3.3). Греческий и английский тексты сверены по ней.</div>`;
    if(w.id==='philo')h+=`<div class="lnote">Нумерация параграфов по изданию Кона–Вендланда (Opif. 24, Mos. 2.45), общая для греческого и английского текстов.</div>`;
    if(!rows.length&&!locked)h+=`<p class="hint">В выбранных текстах этой части нет. Включите другой текст выше.</p>`;
    h+=`<article class="lrd">`+rows.slice(0,LIM).map(r=>{
      const hb=w.id==='lxx'?heb(s.p,c,r.k):null;
      const lines=ts.map((t,i)=>{const ks=r.m[i];if(!ks)return'';const d=cd[i];
        const txt=ks.map(k=>(ks.length>1?`<sup>${esc(k)}</sup> `:'')+body(d[k],t)).join(' ');
        return `<div class="lt ${plain(t)}" ${t.lang==='grc'?'lang="grc"':t.lang==='heb'?'lang="he" dir="rtl"':''}>${ts.length>1?`<span class="tl">${esc(lbl(t))}</span>`:''}${txt}</div>`}).join('');
      const x=hb==='-'?`<span class="bx no">нет в еврейском тексте</span>`:hb?`<button class="bx" data-bible="${hb.b}.${hb.c}.${hb.v}">≈ ${esc(bookAb(hb.b))} ${hb.c}:${hb.v}</button>`:'';
      return `<div class="lv${r.ap?' ap':''}${HIT&&HIT.k===r.k&&HIT.c===c?' hit':''}" id="lv-${esc(r.k)}"><span class="ln">${r.ap?'≈':''}${esc(disp(w,c,r.k))}</span><div class="ll">${lines}${x}</div></div>`}).join('')+`</article>`;
    if(rows.length>LIM)h+=`<button class="more wide" data-lmore>Показать ещё (${rows.length-LIM})</button>`;
    h+=`<div class="lsrc">${ts.map(t=>`<div><b>${esc(lbl(t))}</b>: ${esc(t.name)}. ${esc(t.license)}.</div>`).join('')}</div></div>`;
    box.innerHTML=h;
    if(HIT){const el=document.getElementById('lv-'+HIT.k);HIT=null;if(el)el.scrollIntoView({block:'center'})}
  }
  async function step(d){
    const s=ST(),w=await man(s.w),i=CHS.indexOf(s.c),n=i+d;
    if(i>=0&&n>=0&&n<CHS.length){s.c=CHS[n];save();LIM=120;view();scrollTo(0,0);return}
    const pi=w.parts.findIndex(p=>p.id===s.p),np=w.parts[pi+d];
    if(np){s.p=np.id;s.c='';LAST=d<0;LIM=120;save();view();scrollTo(0,0)}
  }


  /* ---------- поиск по сочинению ---------- */
  const nrm=s=>s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/ς/g,'σ').replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
  let RUN=0;
  async function searchWork(q){
    QS=q;const my=++RUN,box=$('#lres');if(!box)return;const qn=nrm(q);
    if(!qn){box.innerHTML='';return}
    const s=ST(),w=await man(s.w),t=w.texts.find(x=>x.tid===chosen(w)[0]);
    if(t.access==='account'&&!hasAcc()){box.innerHTML='<div class="lnote warm">Для поиска по этому тексту нужен вход в личный кабинет с доступом.</div>';return}
    const out=[];let i=0;const order=w.parts.map(p=>p.id).filter(id=>t.parts.includes(id));
    for(const pid of order){
      if(my!==RUN)return;box.innerHTML=`<div class="hint">Ищу… ${++i} из ${t.parts.length}, найдено ${out.length}</div>`;
      const d=await textOf(w,t,pid);if(!d||d.locked)continue;
      for(const c of Object.keys(d).sort(cmp))for(const k of Object.keys(d[c]).sort(cmp)){
        const v=d[c][k],txt=Array.isArray(v)?v.map(x=>x[0]).join(' '):v;
        if((' '+nrm(txt)+' ').includes(' '+qn)||nrm(txt).includes(qn))out.push({pid,c,k,txt});
        if(out.length>=400)break}
      if(out.length>=400)break}
    if(my!==RUN)return;
    const pt=id=>(w.parts.find(p=>p.id===id)||{}).title_ru||id;
    box.innerHTML=`<div class="rhead"><h2>${out.length}${out.length>=400?'+':''} ${out.length%10===1&&out.length%100!==11?'место':'мест'}</h2><span class="hint">в тексте: ${esc(lbl(t))}</span><span class="spacer"></span><button class="mini" data-lclr>Закрыть результаты</button></div><div class="rlist">`+
      out.map(r=>`<button class="res" data-lgo="${esc(r.pid)}|${esc(r.c)}|${esc(r.k)}"><span class="ref">${esc(pt(r.pid))} ${esc(disp(w,r.c,r.k))}</span><span class="txt">${esc(r.txt.length>240?r.txt.slice(0,240)+'…':r.txt)}</span></button>`).join('')+'</div>';
  }
  /* из Библии — к тому же месту Септуагинты */
  async function openHeb(b,c){
    const w=await man('lxx');if(!w)return;XR=XR||await J('data/lib/xref/lxx_heb.json');
    const inv={Song:'Cant',Eccl:'Qoh',Josh:'JoshB',Judg:'JudgB'};let pid=inv[b]||b,off=0;
    if(b==='Ezra')pid='2Esdr';if(b==='Neh'){pid='2Esdr';off=10}
    if(!w.parts.some(p=>p.id===pid)){open('lxx');return}
    const g=XR.books[b]&&XR.books[b].g2h,cnt={};
    if(g)for(const[k,v]of Object.entries(g)){if(v==='-'||v.includes(' '))continue;const[hc]=v.split(':');if(+hc===+c){const gc=k.split(':')[0];cnt[gc]=(cnt[gc]||0)+1}}
    const best=Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0];
    open('lxx',pid,String((best?+best[0]:+c)+off));
  }

  /* ---------- клики ---------- */
  document.addEventListener('click',e=>{
    const t=e.target,pg=t.closest('#page');if(!pg||!$('.lrd-pg',pg))return;
    if(t.closest('[data-lb]')){showSec('lib');return}
    const st=t.closest('[data-lstep]');if(st){step(+st.dataset.lstep);return}
    const bb=t.closest('[data-bible]');if(bb){const[x,c,v]=bb.dataset.bible.split('.');go(x,+c,+v);return}
    const tg=t.closest('[data-ltid]');if(tg){const s=ST();man(s.w).then(w=>{let ids=chosen(w),id=tg.dataset.ltid;
        ids=ids.includes(id)?ids.filter(x=>x!==id):[...ids,id];if(!ids.length)ids=[id];(s.t=s.t||{})[w.id]=ids;save();view()});return}
    if(t.closest('[data-lclr]')){QS='';RUN++;const r=$('#lres');if(r)r.innerHTML='';const q=$('#lq');if(q)q.value='';return}
    const lg=t.closest('[data-lgo]');if(lg){const[pid,c,k]=lg.dataset.lgo.split('|');HIT={k,c};ST().p=pid;ST().c=c;save();LIM=Math.max(LIM,400);view();return}
    if(t.closest('[data-lmore]')){LIM+=150;view();return}
    if(t.closest('[data-lacct]')){moreSheet();return}
    const w=t.closest('.lrd .w[data-s]');if(w){inspect([w.dataset.f,w.dataset.s,''],w.dataset.s[0]==='H',null,null)}
  });
  document.addEventListener('submit',e=>{if(e.target.id==='lsf'){e.preventDefault();searchWork($('#lq').value)}});
  document.addEventListener('change',e=>{
    if(!$('.lrd-pg'))return;const s=ST();
    if(e.target.id==='lpart'){s.p=e.target.value;s.c='';save();LIM=120;view();scrollTo(0,0)}
    if(e.target.id==='lch'){s.c=e.target.value;save();LIM=120;view();scrollTo(0,0)}
  });
  return{open,view,openHeb,searchWork,man,textOf,hasAcc,disp,lbl,cmp,part:(w,id)=>(w.parts.find(p=>p.id===id)||{}).title_ru||id};
})();
