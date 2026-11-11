'use strict';
/* Библиотека: сочинения вне Библии в единой адресации часть → глава → стих.
   Тексты лежат в data/lib/<сочинение>/…; закрытые (access:"account") отдаёт сервер после входа.
   Септуагинта сопоставлена с еврейской нумерацией (data/lib/xref/lxx_heb.json). */
const Lib=(()=>{
  const P=()=>$('#page');
  const mans={},dc=new Map();let XR=null,LIM=120,CHS=[],LAST=false;
  const ST=()=>S.lib||(S.lib={});
  const man=async id=>mans[id]||(mans[id]=await J(`data/lib/${id}/work.json`));
  const hasAcc=()=>!!(Sync.user&&Sync.user.access);
  const num=k=>{const m=/^\d+/.exec(k);return m?+m[0]:0};
  const cmp=(a,b)=>num(a)-num(b)||(a<b?-1:a>b?1:0);
  const LBL={NIESE:'Греч. · Нисе',WHISTON:'Англ. · Уистон',CW:'Греч. · Кон–Вендланд',YONGE:'Англ. · Йонг',RST:'Синод.',KJVA:'KJV',RAHLFS:'LXX · Ральфс'};
  const lbl=t=>LBL[t.tid]||t.tid;
  const plain=t=>t.lang==='grc'?'grc':t.lang==='en'?'en':'ru';

  /* ---------- данные ---------- */
  function textOf(w,t,pid){
    const key=`${w.id}/${t.tid}/${pid}`;
    if(!dc.has(key)){
      const pr=t.access==='account'?(hasAcc()?Sync.pget('lib/'+key):Promise.resolve({locked:true})):J(`data/lib/${w.id}/tr/${t.tid}/${pid}.json`);
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
  const disp=(w,c,k)=>w.id==='josephus'?`${c}.${k}`:w.id==='philo'?`§${k}`:`${c}:${k}`;

  /* ---------- вход и навигация ---------- */
  async function open(id,pid,c){
    const w=await man(id);if(!w){P().innerHTML='<div class="pg"><p class="hint">Не удалось открыть сочинение.</p></div>';return}
    const s=ST();
    if(!pid&&s.w===id){pid=s.p;c=s.c}
    if(!pid||!w.parts.some(p=>p.id===pid)){pid=w.parts[0].id;c=null}
    s.w=id;s.p=pid;s.c=c==null?'':String(c);LIM=120;save();
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
    const sel=w.parts.map(p=>`<option value="${esc(p.id)}" ${p.id===s.p?'selected':''}>${esc(p.title_ru)}</option>`).join('');
    const chsel=multi?`<select id="lch" aria-label="Глава">${chs.map(k=>`<option ${k===c?'selected':''}>${esc(k)}</option>`).join('')}</select>`:'';
    const chips=w.texts.map(t=>{const on=ts.includes(t),lock=t.access==='account'&&!hasAcc();return `<button data-ltid="${esc(t.tid)}" class="${on?'on':''}" title="${esc(t.name)}">${lock?'🔒 ':''}${esc(lbl(t))}</button>`}).join('');
    let h=`<div class="pg lrd-pg"><div class="lhd"><button class="mini" data-lb="back">‹ Полки</button><h1>${esc(w.title_ru)}</h1></div>`+
      `<div class="lbar"><select id="lpart" aria-label="Часть">${sel}</select>${chsel}<button class="mini" data-lstep="-1" aria-label="Назад">‹</button><button class="mini" data-lstep="1" aria-label="Вперёд">›</button></div>`+
      `<div class="lchips">${chips}</div>`;
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
        return `<div class="lt ${plain(t)}" ${t.lang==='grc'?'lang="grc"':''}>${ts.length>1?`<span class="tl">${esc(lbl(t))}</span>`:''}${txt}</div>`}).join('');
      const x=hb==='-'?`<span class="bx no">нет в еврейском тексте</span>`:hb?`<button class="bx" data-bible="${hb.b}.${hb.c}.${hb.v}">≈ ${esc(bookAb(hb.b))} ${hb.c}:${hb.v}</button>`:'';
      return `<div class="lv${r.ap?' ap':''}"><span class="ln">${r.ap?'≈':''}${esc(disp(w,c,r.k))}</span><div class="ll">${lines}${x}</div></div>`}).join('')+`</article>`;
    if(rows.length>LIM)h+=`<button class="more wide" data-lmore>Показать ещё (${rows.length-LIM})</button>`;
    h+=`<div class="lsrc">${ts.map(t=>`<div><b>${esc(lbl(t))}</b>: ${esc(t.name)}. ${esc(t.license)}.</div>`).join('')}</div></div>`;
    box.innerHTML=h;
  }
  async function step(d){
    const s=ST(),w=await man(s.w),i=CHS.indexOf(s.c),n=i+d;
    if(i>=0&&n>=0&&n<CHS.length){s.c=CHS[n];save();LIM=120;view();scrollTo(0,0);return}
    const pi=w.parts.findIndex(p=>p.id===s.p),np=w.parts[pi+d];
    if(np){s.p=np.id;s.c='';LAST=d<0;LIM=120;save();view();scrollTo(0,0)}
  }

  /* ---------- клики ---------- */
  document.addEventListener('click',e=>{
    const t=e.target,pg=t.closest('#page');if(!pg||!$('.lrd-pg',pg))return;
    if(t.closest('[data-lb]')){showSec('lib');return}
    const st=t.closest('[data-lstep]');if(st){step(+st.dataset.lstep);return}
    const bb=t.closest('[data-bible]');if(bb){const[x,c,v]=bb.dataset.bible.split('.');go(x,+c,+v);return}
    const tg=t.closest('[data-ltid]');if(tg){const s=ST();man(s.w).then(w=>{let ids=chosen(w),id=tg.dataset.ltid;
        ids=ids.includes(id)?ids.filter(x=>x!==id):[...ids,id];if(!ids.length)ids=[id];(s.t=s.t||{})[w.id]=ids;save();view()});return}
    if(t.closest('[data-lmore]')){LIM+=150;view();return}
    if(t.closest('[data-lacct]')){moreSheet();return}
    const w=t.closest('.lrd .w[data-s]');if(w){inspect([w.dataset.f,w.dataset.s,''],false,null,null)}
  });
  document.addEventListener('change',e=>{
    if(!$('.lrd-pg'))return;const s=ST();
    if(e.target.id==='lpart'){s.p=e.target.value;s.c='';save();LIM=120;view();scrollTo(0,0)}
    if(e.target.id==='lch'){s.c=e.target.value;save();LIM=120;view();scrollTo(0,0)}
  });
  return{open,view};
})();
