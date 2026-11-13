'use strict';
/* Детская Библия: рассказы Ветхого и Нового Завета для чтения вслух и самостоятельно.
   Текст — прот. И. Базаров, «Библейская история» (1857, общественное достояние); картины — Тиссо, Доре, Шнорр (общественное достояние).
   Данные: data/kids/ru/index.json, ot.json, nt.json (id → абзацы), img/. */
const Kids=(()=>{
  const P=()=>$('#page');
  /* редакции: public — лежит в репозитории, account — только после входа. ready:true ставится, когда данные загружены */
  const EDS=[
    {id:'bazarov',name:'Базаров, 1857',desc:'Классический пересказ, язык XIX века. Свободный текст.',access:'public',ready:true},
    {id:'ipb',name:'Институт перевода Библии',desc:'Современная «Библия для детей»: пересказы и цитаты из всех книг Библии.',access:'account',ready:true},
    {id:'sokolov',name:'Прот. Александр Соколов',desc:'Православный пересказ для детей.',access:'account',ready:false},
    {id:'vozd',name:'Прот. Пётр Воздвиженский',desc:'Классический рассказчик для самых маленьких, близко к тексту.',access:'account',ready:false}];
  const ready=()=>EDS.filter(e=>e.ready);
  const ST=()=>S.kids||(S.kids={t:'ot',id:''});
  const ed=()=>{const r=ready(),s=ST();return r.find(e=>e.id===s.ed)||r[0]||EDS[0]};
  const base=()=>`data/kids/${ed().id}/`,ibase=()=>`data/kids/img/${ed().id}/`;
  const hasAcc=()=>!!(Sync.user&&Sync.user.access);
  const IXC={},TX={};
  const fetchPart=p=>{const e=ed();return e.access==='account'?(hasAcc()?Sync.pget(`kids/${e.id}/${p}`).catch(()=>null):Promise.resolve({locked:true})):J(`${base()}${p}.json`)};
  const load=async()=>{const e=ed();if(!IXC[e.id]){const d=await fetchPart('index');if(d&&!d.locked)IXC[e.id]=d;else return d}return IXC[e.id]};
  const text=async t=>{const k=ed().id+'/'+t;if(!TX[k]){const d=await fetchPart(t);if(d&&!d.locked)TX[k]=d;else return d}return TX[k]};
  const lockedMsg=()=>{P().innerHTML=`<div class="pg kids-pg"><div class="lhd"><button class="mini" data-kb="back">‹ Полки</button><h1>Детская Библия</h1></div><div class="lnote warm">Эта редакция открывается после входа в личный кабинет с доступом. <button class="mini" data-kacct>Войти</button></div></div>`};
  const WT={ot:'Ветхий Завет',nt:'Новый Завет'};
  const img=(x,cls)=>x.img?`<img ${cls?`class="${cls}" `:''}loading="lazy" decoding="async" src="data/kids/img/${esc(x.img.ed||ed().id)}/${esc(x.img.f)}" alt="${esc(x.title)}">`:`<span class="knum">${x.n}</span>`;
  const ref=r=>`${bookAb(r.b)} ${r.c}:${r.v}`;

  async function open(id){
    if(S.sec!=='lib')showSec('lib');
    const ix=await load();if(ix&&ix.locked)return lockedMsg();if(!ix){P().innerHTML='<div class="pg"><p class="hint">Детская Библия пока не загружена.</p></div>';return}
    const s=ST();if(id){const x=ix.stories.find(y=>y.id===id);if(x){s.id=id;s.t=x.t;save();return story()}}
    s.id='';save();list();
  }
  async function list(){
    const ix=await load(),s=ST();if(!ix)return;if(ix.locked)return lockedMsg();
    const nOT=ix.stories.filter(x=>x.t==='ot').length,nNT=ix.stories.length-nOT,items=ix.stories.filter(x=>x.t===s.t);
    P().innerHTML=`<div class="pg kids-pg"><div class="lhd"><button class="mini" data-kb="back">‹ Полки</button><h1>Детская Библия</h1></div>`+
      `<div class="hint kedn">Редакция: ${esc(ed().name)} · меняется в Настройках</div>`+
      `<div class="kseg"><button data-kt="ot" class="${s.t==='ot'?'on':''}">Ветхий Завет · ${nOT}</button><button data-kt="nt" class="${s.t==='nt'?'on':''}">Новый Завет · ${nNT}</button></div>`+
      `<div class="kgrid">${items.map(x=>`<button class="kcard" data-ks="${esc(x.id)}"><div class="kimg">${img(x)}</div><div class="kt"><small>${x.n}</small><b>${esc(x.title)}</b></div></button>`).join('')}</div>`+
      `<div class="lsrc"><div><b>Текст</b>: ${esc(ix.text)}.</div><div><b>Картины</b>: Джеймс Тиссо, Гюстав Доре, Юлиус Шнорр фон Карольсфельд (общественное достояние, Wikimedia Commons); у каждой картины внизу рассказа указан источник.</div></div></div>`;
    topLib('Детская Библия');scrollTo(0,0);
  }
  async function story(){
    const ix=await load(),s=ST();if(!ix||ix.locked)return list();const i=ix.stories.findIndex(x=>x.id===s.id);if(i<0)return list();
    const x=ix.stories[i],tx=await text(x.t),ps=(tx&&!tx.locked&&tx[x.id])||[],pv=ix.stories[i-1],nx=ix.stories[i+1];
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
    if(t.closest('[data-kacct]')){moreSheet();return}
    const g=t.closest('[data-kgo]');if(g){const[b,ch,v]=g.dataset.kgo.split('.');go(b,+ch,+v)}
  });
  document.addEventListener('keydown',e=>{
    if(!$('.kids-pg.kstory')||/^(INPUT|TEXTAREA|SELECT)$/.test((e.target||{}).tagName))return;
    if(e.key==='ArrowLeft')step(-1);else if(e.key==='ArrowRight')step(1)});
  return{open,list,story,EDS,ready,ed,setEd:id=>{const s=ST();s.ed=id;s.id='';save()}};
})();
