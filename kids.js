'use strict';
/* Детская Библия: рассказы Ветхого и Нового Завета для чтения вслух и самостоятельно.
   Текст — прот. И. Базаров, «Библейская история» (1857, общественное достояние); картины — Тиссо, Доре, Шнорр (общественное достояние).
   Данные: data/kids/ru/index.json, ot.json, nt.json (id → абзацы), img/. */
const Kids=(()=>{
  const P=()=>$('#page'),base='data/kids/ru/';
  let IX=null;const TX={};
  const ST=()=>S.kids||(S.kids={t:'ot',id:''});
  const load=async()=>IX||(IX=await J(base+'index.json'));
  const text=async t=>TX[t]||(TX[t]=await J(`${base}${t}.json`));
  const WT={ot:'Ветхий Завет',nt:'Новый Завет'};
  const img=(x,cls)=>x.img?`<img ${cls?`class="${cls}" `:''}loading="lazy" decoding="async" src="${base}img/${esc(x.img.f)}" alt="${esc(x.title)}">`:`<span class="knum">${x.n}</span>`;
  const ref=r=>`${bookAb(r.b)} ${r.c}:${r.v}`;

  async function open(id){
    if(S.sec!=='lib')showSec('lib');
    const ix=await load();if(!ix){P().innerHTML='<div class="pg"><p class="hint">Детская Библия пока не загружена.</p></div>';return}
    const s=ST();if(id){const x=ix.stories.find(y=>y.id===id);if(x){s.id=id;s.t=x.t;save();return story()}}
    s.id='';save();list();
  }
  async function list(){
    const ix=await load(),s=ST();if(!ix)return;
    const nOT=ix.stories.filter(x=>x.t==='ot').length,nNT=ix.stories.length-nOT,items=ix.stories.filter(x=>x.t===s.t);
    P().innerHTML=`<div class="pg kids-pg"><div class="lhd"><button class="mini" data-kb="back">‹ Полки</button><h1>Детская Библия</h1></div>`+
      `<div class="kseg"><button data-kt="ot" class="${s.t==='ot'?'on':''}">Ветхий Завет · ${nOT}</button><button data-kt="nt" class="${s.t==='nt'?'on':''}">Новый Завет · ${nNT}</button></div>`+
      `<div class="kgrid">${items.map(x=>`<button class="kcard" data-ks="${esc(x.id)}"><div class="kimg">${img(x)}</div><div class="kt"><small>${x.n}</small><b>${esc(x.title)}</b></div></button>`).join('')}</div>`+
      `<div class="lsrc"><div><b>Текст</b>: ${esc(ix.text)}.</div><div><b>Картины</b>: Джеймс Тиссо, Гюстав Доре, Юлиус Шнорр фон Карольсфельд (общественное достояние, Wikimedia Commons); у каждой картины внизу рассказа указан источник.</div></div></div>`;
    topLib('Детская Библия');scrollTo(0,0);
  }
  async function story(){
    const ix=await load(),s=ST(),i=ix.stories.findIndex(x=>x.id===s.id);if(i<0)return list();
    const x=ix.stories[i],tx=await text(x.t),ps=(tx&&tx[x.id])||[],pv=ix.stories[i-1],nx=ix.stories[i+1];
    P().innerHTML=`<div class="pg kids-pg kstory"><div class="lhd"><button class="mini" data-kb="list">‹ К списку</button><h1>${WT[x.t]} · ${x.n}</h1></div>`+
      (x.img?`<figure class="kfig">${img(x)}<figcaption>${esc(x.img.by)} · ${esc(x.img.lic)}${x.img.src?` · <a href="${esc(x.img.src)}" target="_blank" rel="noopener">источник</a>`:''}</figcaption></figure>`:'')+
      `<article class="ktext"><h2>${esc(x.title)}</h2>${ps.length?ps.map(p=>`<p>${esc(p)}</p>`).join(''):'<p class="hint">Текст не загружен.</p>'}</article>`+
      `<div class="knav"><button class="mini" data-kgo="${esc(x.ref.b)}.${x.ref.c}.${x.ref.v}" title="Открыть это место в Библии">📖 В Библии: ${esc(ref(x.ref))}</button></div>`+
      `<div class="knav2"><button class="mini" data-kstep="-1" ${pv?'':'disabled'}>‹ ${pv?esc(pv.title.length>30?pv.title.slice(0,29)+'…':pv.title):'начало'}</button><button class="mini" data-kstep="1" ${nx?'':'disabled'}>${nx?esc(nx.title.length>30?nx.title.slice(0,29)+'…':nx.title):'конец'} ›</button></div></div>`;
    topLib('Детская Библия · '+x.n);scrollTo(0,0);
  }
  async function step(d){
    const ix=await load(),s=ST(),i=ix.stories.findIndex(x=>x.id===s.id),n=ix.stories[i+d];
    if(n){s.id=n.id;s.t=n.t;save();story()}
  }
  document.addEventListener('click',e=>{
    const t=e.target,pg=t.closest('#page');if(!pg||!$('.kids-pg',pg))return;
    if(t.closest('[data-kb="back"]')){showSec('lib');return}
    if(t.closest('[data-kb="list"]')){const s=ST();s.id='';save();list();return}
    const k=t.closest('[data-kt]');if(k){const s=ST();s.t=k.dataset.kt;save();list();return}
    const c=t.closest('[data-ks]');if(c){const s=ST();s.id=c.dataset.ks;save();story();return}
    const st=t.closest('[data-kstep]');if(st&&!st.disabled){step(+st.dataset.kstep);return}
    const g=t.closest('[data-kgo]');if(g){const[b,ch,v]=g.dataset.kgo.split('.');go(b,+ch,+v)}
  });
  document.addEventListener('keydown',e=>{
    if(!$('.kids-pg.kstory')||/^(INPUT|TEXTAREA|SELECT)$/.test((e.target||{}).tagName))return;
    if(e.key==='ArrowLeft')step(-1);else if(e.key==='ArrowRight')step(1)});
  return{open,list,story};
})();
