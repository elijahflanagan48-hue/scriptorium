'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const KEY='scriptorium.v1';
let S={layout:'R',rmode:1,theme:'light',last:{book:'Gen',ch:1},sel:['ORIG','RST','BTI'],hl:{},notes:{},wnotes:{},recent:[],ts:{},sts:0,side:true,tabs:[],tab:0,qhist:[],saved:[]};
try{Object.assign(S,JSON.parse(localStorage.getItem(KEY)||'{}'))}catch(e){}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}if(typeof Sync!=='undefined')Sync.changed()};
const stamp=k=>{S.ts[k]=Date.now();save()};
const touchSettings=()=>{S.sts=Date.now();save()};
const cache=new Map();
const PRIV=/^data\/(tr|align|nt)\/(BTI|NRT|RSP|KASS)\/([^/]+)\.json$/;const FNS={};
const PRIVT=[['BTI','Современный перевод (Кулаков, BTI)'],['NRT','Новый русский перевод (НРП, Biblica)'],['RSP','Современный перевод (РБО)'],['KASS','Новый Завет, еп. Кассиан (1970)']];
const J=p=>{const pm=PRIV.exec(p);if(pm){if(!cache.has(p))cache.set(p,(Sync.user&&Sync.user.access?Sync.pget(pm[1]+'/'+pm[2]+'/'+pm[3]):Promise.resolve(null)).catch(()=>{cache.delete(p);return null}));return cache.get(p)}
  if(!cache.has(p)){const pr=window.__pre&&window.__pre[p];if(pr){delete window.__pre[p];cache.set(p,pr.then(x=>{if(x==null)throw 0;return x}).catch(()=>{cache.delete(p);return null}))}}
  if(!cache.has(p))cache.set(p,fetch(p).then(r=>{if(!r.ok)throw 0;return r.json()}).catch(()=>{cache.delete(p);return null}));return cache.get(p)};
let PEND=false,CUR=null,IDX,BOOKS,BI={},TRS={},OCC=null,LEX={},cur=S.last,token=0,sideT=null,INSP=null;
const MQ=window.matchMedia('(max-width:820px)'),isM=()=>MQ.matches;

/* ---------- genres ---------- */
const GEN={law:'Закон',hist:'История',poe:'Поэзия',pro:'Пророки',gos:'Евангелия и Деяния',epi:'Послания',rev:'Откровение'};
const GORD=['law','hist','poe','pro','gos','epi','rev'];
function genreOf(id){const i=BI[id];if(i<5)return'law';if(i<17)return'hist';if(i<22)return'poe';if(i<39)return'pro';if(i<44)return'gos';if(i<65)return'epi';return'rev'}
const SHORT={RST:'Синод.',BTI:'Кулаков',NRT:'НРП',RSP:'РБО',KASS:'Кассиан'};
const shortName=id=>SHORT[id]||id;

/* ---------- init ---------- */
(async function init(){
  /* скрипты с defer выполняются по очереди: ждём, пока загрузятся все (иначе viewR и др. ещё не определены) */
  if(document.readyState!=='complete')await new Promise(r=>document.addEventListener('DOMContentLoaded',()=>r(),{once:true}));
  IDX=await J('data/index.json');
  if(!IDX){document.body.innerHTML='<p style="padding:40px;font-family:sans-serif">Не найдены файлы данных. Запустите приложение через сервер: в папке приложения выполните <code>python3 -m http.server 8000</code> и откройте <code>http://localhost:8000</code>.</p>';return}
  BOOKS=IDX.books;BOOKS.forEach((b,i)=>BI[b.id]=i);IDX.translations.forEach(t=>TRS[t.id]=t);
  PEND=S.sel.includes('BTI');S.sel=S.sel.filter(x=>x==='ORIG'||TRS[x]);if(!S.sel.length)S.sel=['ORIG','RST'];
  if(!S.recent)S.recent=[];if(!S.wnotes)S.wnotes={};if(!S.ts)S.ts={};if(!S.qhist)S.qhist=[];if(!S.saved)S.saved=[];if(S.side===undefined)S.side=true;
  if(!S.rmode){S.rmode=1;S.layout='R'}if(!S.done)S.done={};
  if(BI[cur.book]===undefined)cur={book:'Gen',ch:1};
  const h=parseHash();if(h)cur=h;
  S.tabs=(S.tabs||[]).filter(t=>t&&BI[t.book]!==undefined);if(!S.tabs.length){S.tabs=[{book:cur.book,ch:cur.ch}];S.tab=0}
  S.tab=Math.min(Math.max(0,S.tab|0),S.tabs.length-1);S.sec='read';
  try{speechSynthesis.getVoices()}catch(e){}
  bind();go(cur.book,cur.ch,h&&h.v);
  Sync.init(S,{status:accStatus,applied:()=>{save();cur=S.last;render()}});
  if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'))navigator.serviceWorker.register('sw.js').catch(()=>{});
})();
addEventListener('hashchange',()=>{const h=parseHash();if(h&&BOOKS.length&&(h.book!==cur.book||h.ch!==cur.ch||h.v))go(h.book,h.ch,h.v)});
function parseHash(){const m=(location.hash||'').match(/^#([0-9A-Za-z]+)\.(\d+)(?:\.(\d+))?$/);return m&&BI[m[1]]!==undefined?{book:m[1],ch:+m[2],v:m[3]?+m[3]:0}:null}
const bookRu=id=>BOOKS[BI[id]].ru, bookAb=id=>BOOKS[BI[id]].ab;
function primary(){return S.sel.find(x=>x!=='ORIG')||null}

/* ---------- navigation ---------- */
function go(book,ch,v){
  cur={book,ch};S.last=cur;S.tabs[S.tab]={book,ch};
  const rk=book+'.'+ch;S.recent=[rk,...(S.recent||[]).filter(x=>x!==rk)].slice(0,40);S.sts=Date.now();save();
  if(S.sec!=='read')showSec('read');
  try{history.replaceState(null,'','#'+book+'.'+ch+(v?'.'+v:''))}catch(e){}
  document.body.classList.remove('drawer');
  render(v);
}
function step(d){
  const i=BI[cur.book];let b=i,c=cur.ch+d;
  if(c<1){b=i-1;if(b<0)return;c=BOOKS[b].chapters}else if(c>BOOKS[i].chapters){b=i+1;if(b>=BOOKS.length)return;c=1}
  go(BOOKS[b].id,c);scrollTo(0,0);
}
const norm=s=>s.toLowerCase().replace(/ё/g,'е').replace(/[\s.\-]/g,'');
const EN_AB={jn:'John',jhn:'John',mt:'Matt',mk:'Mark',lk:'Luke',ac:'Acts',rm:'Rom',ro:'Rom',ge:'Gen',ex:'Exod',lv:'Lev',nu:'Num',dt:'Deut',ps:'Ps',pr:'Prov',is:'Isa',jr:'Jer',ez:'Ezek',dn:'Dan',re:'Rev',rv:'Rev',hb:'Heb',jm:'Jas'};
const stripRu=x=>x.replace(/^(евангелиеот|посланиек|посланиеапостола|книгапророка|книга|от|к)(?=..)/,'');
function findBook(raw){
  const x=norm(raw);if(!x)return null;const rn=b=>stripRu(norm(b.ru));
  const roman=x.replace(/^1/,'i').replace(/^2/,'ii').replace(/^3/,'iii');
  if(EN_AB[x])return BOOKS[BI[EN_AB[x]]];
  return BOOKS.find(b=>norm(b.ab)===x||b.id.toLowerCase()===x)||BOOKS.find(b=>norm(b.ru)===x||rn(b)===x||(b.aliases_ru||[]).some(a=>norm(a)===x)||norm(b.scrollmapper)===roman)
    ||BOOKS.find(b=>rn(b).startsWith(x)||norm(b.ab).startsWith(x)||norm(b.scrollmapper).startsWith(roman))
    ||(x.length>=4?BOOKS.find(b=>{const r=rn(b);let i=0;while(i<r.length&&i<x.length&&r[i]===x[i])i++;return i>=4&&i>=Math.min(r.length,x.length)-1}):null);
}
function parseRef(q,strict){
  if(/^\s*[GHgh]\s*\d+[a-zA-Z]?\s*$/.test(q))return null; /* номер Стронга, не ссылка */
  const m=q.trim().toLowerCase().replace(/ё/g,'е').match(/^(\d?\s*[^\d:.,]+?)\s*\.?\s*(\d+)?(?:\s*[:.,]\s*(\d+)|\s+(\d+))?\s*$/);if(!m)return null;
  const b=findBook(m[1]);if(!b)return null;
  if(strict&&!m[2]){const x=norm(m[1]);if(!(norm(b.ab)===x||norm(b.ru)===x||stripRu(norm(b.ru))===x))return null}
  const ch=Math.min(Math.max(+m[2]||1,1),b.chapters);return{book:b.id,ch,v:+(m[3]||m[4])||0};
}
const refLabel=r=>`${bookRu(r.book)} ${r.ch}${r.v?':'+r.v:''}`;

/* ---------- data ---------- */
/* все части главы запрашиваются сразу и параллельно; текст показывается по мере готовности */
const isPriv=id=>id==='BTI';
function chapterParts(book,ch){
  const ids=S.sel.filter(x=>x!=='ORIG'&&TRS[x]&&TRS[x].books.includes(book));
  return{book,ids,o:J(`data/origc/${book}/${ch}.json`),t:ids.map(id=>J(`data/tr/${id}/${book}.json`)),a:ids.map(id=>isPriv(id)?Promise.all([J(`data/align/${id}/${book}.json`),J(`data/nt/${id}/${book}.json`).then(x=>{FNS[id+'|'+book]=x||{}})]).then(r=>r[0]):J(`data/align/${id}/${book}.json`))};
}
function buildChapter(book,ch,o,ids,T,A){
  const orig=o?o.chapters[ch]||{}:{},lang=o?o.lang:(BOOKS[BI[book]].testament==='NT'?'grc':'heb'),tr={},al={};
  ids.forEach((id,i)=>{if(T[i]!==undefined){tr[id]=T[i]?T[i][ch]||{}:{};al[id]=A[i]?A[i][ch]||{}:{}}});
  const nums=new Set(Object.keys(orig).map(Number));for(const id in tr)for(const v in tr[id])nums.add(+v);
  return{orig,lang,tr,al,book,ch,verses:[...nums].sort((a,b)=>a-b)};
}
async function loadChapter(book,ch){const P=chapterParts(book,ch);const[o,T,A]=await Promise.all([P.o,Promise.all(P.t),Promise.all(P.a)]);return buildChapter(book,ch,o,P.ids,T,A)}
const origHTML=(ws,lang,cls='')=>ws?`<div class="orig ${lang} ${cls}" lang="${lang==='heb'?'he':'grc'}">`+ws.map((w,i)=>`<span class="w" data-i="${i}" data-k="${w[1]}" data-m="${esc(w[2])}">${esc(w[0])}</span>`).join(' ')+'</div>':'';
const trHTML=(id,v,text,d)=>{const a=d.al&&d.al[id]&&d.al[id][v],ch=text.trim().split(/\s+/),ok=a&&a.length===ch.length;
  const fl=FNS[id+'|'+d.book]&&FNS[id+'|'+d.book][d.ch+':'+v],fm={};if(fl)fl.forEach((f,k)=>(fm[f[0]]=fm[f[0]]||[]).push(`<sup class="fn" data-fn="${id}|${d.ch}:${v}|${k}">${esc(f[1]||'•')}</sup>`));
  return ch.map((c,i)=>{const sp=fm[i]?fm[i].join(''):'';
    if(ok&&a[i]>=0)return `<span class="tw" data-t="${id}" data-j="${i}" data-a="${a[i]}">${esc(c)}</span>`+sp;
    if(!/\p{L}/u.test(c))return esc(c)+sp;
    return `<span class="tw0" data-t="${id}" data-j="${i}" data-na="${ok?0:1}">${esc(c)}</span>`+sp}).join(' ')};
function fnShow(el){const p=el.dataset.fn.split('|'),f=FNS[p[0]+'|'+(CUR&&CUR.book||'')];const lst=(f&&f[p[1]])||[];const n=lst[+p[2]];if(!n)return;
  const pop=$('#pop');pop.innerHTML=`<div class="fnt">${esc(n[2])}</div>`;pop.hidden=false;
  const r=el.getBoundingClientRect(),pw=pop.offsetWidth,ph=pop.offsetHeight;let x=Math.min(Math.max(8,r.left+r.width/2-pw/2),innerWidth-pw-8),y=r.bottom+8;if(y+ph>innerHeight-8)y=r.top-ph-8;pop.style.left=x+'px';pop.style.top=y+'px'}

const vnHTML=(ref,v)=>`<span class="vn" data-ref="${ref}" title="Выделение и заметка">${v}${S.notes[ref]?'<span class="note-dot">✎</span>':''}</span>`;
const hlc=ref=>S.hl[ref]?' hl'+S.hl[ref]:'';

/* ---------- render ---------- */
async function render(scrollV){
  const t=++token;applyBody();
  $('#bookLabel').textContent=`${bookRu(cur.book)} ${cur.ch}`;$('#bookBtn').className='pill only-m '+gcls();
  renderTabs();buildSide();
  const R=$('#reader'),ck=cur.book+cur.ch+S.layout,book=cur.book,ch=cur.ch,P=chapterParts(book,ch);
  let stage=0;
  const show=(d,st,final)=>{
    if(t!==token||st<=stage)return;stage=st;CUR=d;
    if(R._ck!==ck){R._ck=ck;R.classList.remove('enter');void R.offsetWidth;R.classList.add('enter')}
    R.innerHTML=({R:viewR,A:viewA,B:viewB,D:viewD}[S.layout]||viewR)(d)+(S.layout==='B'&&isM()?'':navHTML());
    renderBar();initSplit();
    if(final&&scrollV){const el=$(`[data-v="${scrollV}"]`,R);if(el){el.scrollIntoView({block:'center'});el.classList.add('flash');setTimeout(()=>el.classList.remove('flash'),1700)}}
  };
  if(R._ck!==ck)setTimeout(()=>{if(t===token&&!stage){R._ck=null;R.innerHTML=head()+`<div class="rsk">`+'<div class="sk"></div>'.repeat(9)+`</div>`}},120);
  // 1) первый открытый перевод — сразу, как только пришёл
  const pi=P.ids.findIndex(id=>!isPriv(id));
  if(pi>=0)P.t[pi].then(tx=>{if(!stage){const T=P.ids.map((_,i)=>i===pi?tx:undefined);show(buildChapter(book,ch,null,P.ids,T,[]),1,false)}});
  // 2) оригинал и все общедоступные переводы
  const pub=P.ids.map((id,i)=>isPriv(id)?Promise.resolve(undefined):P.t[i]),pubA=P.ids.map((id,i)=>isPriv(id)?Promise.resolve(null):P.a[i]);
  const[o,T,A]=await Promise.all([P.o,Promise.all(pub),Promise.all(pubA)]);
  const hasPriv=P.ids.some(isPriv);
  show(buildChapter(book,ch,o,P.ids,T,A),2,!hasPriv);
  // 3) скрытые переводы (через сервер) — дорисовываем, когда придут
  if(hasPriv){const[T2,A2]=await Promise.all([Promise.all(P.t),Promise.all(P.a)]);show(buildChapter(book,ch,o,P.ids,T2,A2),3,true)}
  if(t!==token)return;
  firstDone();
  {const last=ch>=BOOKS[BI[book]].chapters,nb=BOOKS[BI[book]+(last?1:0)];if(nb)setTimeout(()=>J(`data/origc/${nb.id}/${last?1:ch+1}.json`),1500)}
}
/* фоновая подгрузка только после того, как глава показана, и по очереди, чтобы не мешать тексту */
let WARMED=false;
function firstDone(){
  if(WARMED)return;WARMED=true;
  const slow=(navigator.connection&&(navigator.connection.saveData||/2g/.test(navigator.connection.effectiveType||'')));
  const cell=navigator.connection&&(navigator.connection.saveData||navigator.connection.type==='cellular');
  const idle=(fn,ms)=>setTimeout(()=>('requestIdleCallback' in window)?requestIdleCallback(fn,{timeout:4000}):fn(),ms);
  idle(async()=>{const f=BOOKS[BI[cur.book]].testament==='OT'?'H':'G';
    await loadLex(f);if(slow||cell)return;
    idle(async()=>{OCC=OCC||await J('data/occ.json');idle(()=>loadLex(f==='H'?'G':'H'),4000);if(!slow&&!cell)setTimeout(warmSearch,15000)},6000);
  },2500);
}
function warmSearch(){const p=primary();if(p&&TRS[p]&&!isPriv(p))Search.index(p).catch(()=>{})}
const gcls=()=>'g-'+genreOf(cur.book);
const LAYN={R:'Чтение',A:'Книга',B:'Стол',D:'Манускрипт'};
const head=()=>{const b=BOOKS[BI[cur.book]];return `<div class="ch-head ${gcls()}"><nav class="crumbs" aria-label="Где я"><button data-gosec="lib">Библия</button><i>›</i><span>${b.testament==='OT'?'Ветхий Завет':'Новый Завет'} · ${GEN[genreOf(cur.book)]}</span><i>›</i><button data-bkopen="${b.id}">${esc(b.ru)}</button></nav>`+
  `<div class="hrow"><h1>${esc(bookRu(cur.book))} <em>${cur.ch}</em></h1><span class="spacer"></span><div class="seg only-d" role="tablist" aria-label="Раскладка">`+Object.entries(LAYN).map(([l,n])=>`<button data-l="${l}" class="${S.layout===l?'on':''}">${n}</button>`).join('')+`</div></div></div>`};
function navHTML(){
  const i=BI[cur.book],pb=cur.ch>1?[cur.book,cur.ch-1]:(i>0?[BOOKS[i-1].id,BOOKS[i-1].chapters]:null),nb=cur.ch<BOOKS[i].chapters?[cur.book,cur.ch+1]:(i<BOOKS.length-1?[BOOKS[i+1].id,1]:null);
  return `<nav class="chnav" aria-label="Главы">${pb?`<button data-step="-1">‹ ${esc(bookAb(pb[0]))} ${pb[1]}</button>`:'<span></span>'}${nb?`<button data-step="1">${esc(bookAb(nb[0]))} ${nb[1]} ›</button>`:''}</nav>`}
const missOrig=lang=>`<span class="miss">${lang==='grc'?'нет в критическом тексте SBLGNT':'—'}</span>`;
function chipsHTML(d){
  const tr=S.sel.filter(x=>x!=='ORIG'),p=tr[0];
  return `<div class="chips">`+tr.map(id=>`<button class="chip ${id===p?'pri':''}" data-pri="${id}">${esc(TRS[id].name.replace(/ \(.*\)/,''))}</button>`).join('')+
    `<button class="chip org ${S.sel.includes('ORIG')?'on':''}" data-pri="ORIG">${d.lang==='heb'?'Иврит · WLC':'Греческий · SBLGNT'}</button><button class="chip add" data-act="texts">+ Текст</button></div>`;
}
function renderBar(){
  const b=$('#tbar');if(!b||!CUR)return;const tr=S.sel.filter(x=>x!=='ORIG');
  b.innerHTML=tr.map((id,i)=>`<button data-pri="${id}" class="${i===0?'on':''}">${esc(shortName(id))}</button>`).join('')+
   `<button data-pri="ORIG" class="${S.sel.includes('ORIG')?'on o':''}">${CUR.lang==='heb'?'Иврит':'Греч.'}</button><button data-act="texts">＋</button>`;
}
function viewA(d){
  const p=primary(),others=S.sel.filter(x=>x!=='ORIG'&&x!==p),wo=S.sel.includes('ORIG');
  return `<article class="pageA">${head()}${chipsHTML(d)}<div class="vcards">`+d.verses.map(v=>{
    const ref=`${cur.book}.${cur.ch}.${v}`;
    const txt=p&&d.tr[p]?d.tr[p][v]:null;
    const left=`<div class="vt">${vnHTML(ref,v)}${txt?trHTML(p,v,txt,d):(p?'<span class="miss">—</span>':'')}`+
     (others.length?`<div class="alts">`+others.map(o=>d.tr[o]&&d.tr[o][v]?`<div><span class="tag">${o}</span>${trHTML(o,v,d.tr[o][v],d)}</div>`:'').join('')+`</div>`:'')+`</div>`;
    const right=wo?`<div class="vo">${d.orig[v]?origHTML(d.orig[v],d.lang):missOrig(d.lang)}</div>`:'';
    return `<div class="vrow ${wo&&p?'':'no-o'}${hlc(ref)}" data-v="${v}" data-ref="${ref}">${p?left+right:`<div class="vo">${vnHTML(ref,v)}${d.orig[v]?origHTML(d.orig[v],d.lang):missOrig(d.lang)}</div>`}</div>`}).join('')+`</div></article>`;
}
function viewB(d){
  if(isM())return viewSplit(d);
  const cols=S.sel,n=cols.length;
  let h=head()+chipsHTML(d)+`<div class="desk" style="grid-template-columns:52px repeat(${n},minmax(0,1fr))"><div class="colhead"></div>`+
    cols.map(c=>`<div class="colhead"><span>${c==='ORIG'?(d.lang==='heb'?'Иврит · WLC':'Греческий · SBLGNT'):esc(TRS[c].name)}</span>${n>1?`<button data-rm="${c}" title="Убрать колонку">✕</button>`:''}</div>`).join('');
  for(const v of d.verses){const ref=`${cur.book}.${cur.ch}.${v}`,hc=hlc(ref);
    h+=`<div class="cell n${hc}" data-v="${v}" data-ref="${ref}">${vnHTML(ref,v)}</div>`+cols.map(c=>c==='ORIG'?
      `<div class="cell orig-c${hc}" data-ref="${ref}">${d.orig[v]?origHTML(d.orig[v],d.lang):missOrig(d.lang)}</div>`:
      `<div class="cell${hc}" data-ref="${ref}">${d.tr[c]&&d.tr[c][v]?trHTML(c,v,d.tr[c][v],d):'<span class="miss">—</span>'}</div>`).join('')}
  return h+'</div>';
}
function viewSplit(d){
  const cols=S.sel.slice(0,3);
  return chipsHTML(d)+`<div class="split" style="grid-template-rows:repeat(${cols.length},minmax(0,1fr))">`+cols.map((c,i)=>{
    const isO=c==='ORIG',name=isO?(d.lang==='heb'?'Иврит · WLC':'Греческий · SBLGNT'):TRS[c].name;
    return `<section class="pane ${isO?'po':(c===primary()?'p0':'')}"><header>${esc(name)}</header><div class="pbody">`+d.verses.map(v=>{
      const ref=`${cur.book}.${cur.ch}.${v}`;
      return `<p data-v="${v}" data-ref="${ref}" class="${hlc(ref).trim()}">${vnHTML(ref,v)}${isO?(d.orig[v]?origHTML(d.orig[v],d.lang):missOrig(d.lang)):(d.tr[c]&&d.tr[c][v]?trHTML(c,v,d.tr[c][v],d):'<span class="miss">—</span>')}</p>`}).join('')+`</div></section>`}).join('')+`</div>`;
}
function initSplit(){
  const bodies=$$('.pbody');if(bodies.length<2)return;let lock=false;
  bodies.forEach(b=>b.addEventListener('scroll',()=>{
    if(lock)return;const ps=$$('p[data-v]',b);const src=ps.find(p=>p.offsetTop+p.offsetHeight>b.scrollTop+2);if(!src)return;
    const off=src.offsetTop-b.scrollTop;lock=true;
    bodies.forEach(o=>{if(o===b)return;const t=$(`p[data-v="${src.dataset.v}"]`,o);if(t)o.scrollTop=t.offsetTop-off});
    requestAnimationFrame(()=>lock=false);
  },{passive:true}));
}
function viewD(d){
  const p=primary(),others=S.sel.filter(x=>x!=='ORIG'&&x!==p);
  return `<article class="ms">${head()}${chipsHTML(d)}`+d.verses.map(v=>{
    const ref=`${cur.book}.${cur.ch}.${v}`,hc=hlc(ref);
    const mid=p?(d.tr[p]&&d.tr[p][v]?trHTML(p,v,d.tr[p][v],d):'<span class="miss">—</span>'):(d.orig[v]?origHTML(d.orig[v],d.lang):'');
    return `<div class="row" data-v="${v}" data-ref="${ref}"><div class="lm ${d.lang==='heb'?'heb':''}">${S.sel.includes('ORIG')&&p?(d.orig[v]?origHTML(d.orig[v],d.lang):missOrig(d.lang)):''}</div>`+
      `<div class="mid${hc}">${vnHTML(ref,v)}${mid}</div>`+
      `<div class="rm">${others.map(o=>d.tr[o]&&d.tr[o][v]?`<div><b>${o}</b> ${trHTML(o,v,d.tr[o][v],d)}</div>`:'').join('')}${S.notes[ref]?`<div class="note">${esc(S.notes[ref])}</div>`:''}</div></div>`}).join('')+`</article>`;
}

/* ---------- sidebar ---------- */
function buildSide(){
  const side=$('#side');if(!side||!BOOKS)return;
  const curT=BOOKS[BI[cur.book]].testament;if(!sideT||sideT.from!==cur.book)sideT={t:(sideT&&sideT.manual)?sideT.t:curT,from:cur.book,manual:sideT&&sideT.manual&&sideT.t!==curT};
  const t=sideT.t;
  let h=`<div class="tst"><button data-st="OT" class="${t==='OT'?'on':''}">Ветхий</button><button data-st="NT" class="${t==='NT'?'on':''}">Новый</button></div>`;
  h+=`<div class="recent">`+(S.recent||[]).slice(0,5).map(r=>{const [b,c]=r.split('.');return BI[b]===undefined?'':`<button data-go="${r}">${esc(bookAb(b))} ${c}</button>`}).join('')+`</div>`;
  for(const g of GORD){
    const bs=BOOKS.filter(b=>b.testament===t&&genreOf(b.id)===g);if(!bs.length)continue;
    h+=`<div class="g-${g}"><div class="gh">${GEN[g]}</div>`+bs.map(b=>`<button class="bk ${b.id===cur.book?'on':''}" data-bk="${b.id}">${esc(b.ru)}<small>${b.chapters}</small></button>`+
      (b.id===cur.book?`<div class="chs">`+Array.from({length:b.chapters},(_,i)=>`<button data-go="${b.id}.${i+1}" class="${cur.ch===i+1?'on':''}${S.done&&S.done[b.id+'.'+(i+1)]?' rd':''}">${i+1}</button>`).join('')+`</div>`:'')).join('')+`</div>`;
  }
  side.innerHTML=h;
  const on=$('.bk.on',side);if(on&&!side._did){side._did=1;on.scrollIntoView({block:'center'})}
}

/* ---------- lexicon / popovers ---------- */
/* словарь и вхождения: сначала маленькая часть (100 номеров), полный файл грузится в фоне */
const SH={},LXP={};
function shard(kind,k){const m=/^([GH])(\d+)/.exec(k||'');if(!m)return Promise.resolve({});const id=`${kind}/${m[1]}${String(Math.floor(+m[2]/100)).padStart(3,'0')}`;return SH[id]||(SH[id]=J(`data/${id}.json`).then(x=>x||{}))}
function loadLex(f){return LXP[f]||(LXP[f]=J(f==='H'?'data/lex_H.json':'data/lex_G.json').then(x=>LEX[f]=x||{}))}
async function lexOf(k){if(!k)return null;const f=k[0];if(LEX[f])return LEX[f][k];return (await shard('lx',k))[k]}
const lexNow=k=>k&&LEX[k[0]]?LEX[k[0]][k]:null;
async function occOf(k){if(!k)return[];if(OCC)return OCC[k]||[];return (await shard('oc',k))[k]||[]}
function prefetchWord(k){if(k){lexOf(k);occOf(k)}}
function decode(k,m){try{return k[0]==='G'||/^[A-Z]{1,2} /.test(m)?decGrc(m):decHeb(m)}catch(e){return{pos:'',detail:m}}}
async function popWord(anchor,wd,isH,note){
  const [surf,k,m]=wd;const dm=decode(isH?'H':'G',m);const lx=k?await lexOf(k):null;if(!anchor.matches(':hover'))return;
  const pop=$('#pop');
  pop.innerHTML=`<div class="lm ${isH?'he':'gr'}">${esc(lx?lx.lemma:surf)}</div><div class="meta">${lx?esc(lx.tr)+' · ':''}${esc(dm.pos||'')}${dm.detail?' · '+esc(dm.detail):''}</div>`+
    (lx?`<div class="gl">${esc(lx.gloss)}</div>`:'')+(k&&OCC&&OCC[k]?`<div class="cnt">${OCC[k].length} употр. в оригинале · клик — статья</div>`:'')+(note?`<div class="auto">${note}</div>`:'');
  pop.hidden=false;const r=anchor.getBoundingClientRect(),pw=pop.offsetWidth,ph=pop.offsetHeight;
  let x=Math.min(Math.max(8,r.left+r.width/2-pw/2),innerWidth-pw-8),y=r.bottom+8;if(y+ph>innerHeight-8)y=r.top-ph-8;
  pop.style.left=x+'px';pop.style.top=y+'px';
}
const refOf=el=>{const r=el.closest('[data-ref]');return r?r.dataset.ref:null};
function hiClear(){$$('.hi').forEach(x=>x.classList.remove('hi'))}
function origWord(el){const ref=refOf(el);if(!ref||!CUR)return null;const v=ref.split('.')[2];const ws=CUR.orig[v];return ws?ws[+el.dataset.a]:null}
function missInfo(el){
  const ref=refOf(el),v=ref.split('.')[2],id=el.dataset.t,j=+el.dataset.j,text=el.textContent;
  if(el.dataset.na==='1')return{na:true,text,id,ref};
  const al=(CUR.al[id]&&CUR.al[id][v])||[];let a=-1,nb=null;
  for(let k=j+1;k<Math.min(al.length,j+4);k++)if(al[k]>=0){a=al[k];nb=k;break}
  if(a<0)for(let k=j-1;k>=Math.max(0,j-3);k--)if(al[k]>=0){a=al[k];nb=k;break}
  const wd=a>=0&&CUR.orig[v]?CUR.orig[v][a]:null;
  const nel=nb!=null?$(`[data-ref="${ref}"] .tw[data-t="${id}"][data-j="${nb}"]`):null;
  return{text,id,ref,a,nb,wd,nbText:nel?nel.textContent:''};
}
function missHTML(m,short){
  if(m.na)return `<div class="meta">«${esc(m.text)}»</div><div class="gl">Для этого стиха соответствие слов не определено</div><div class="auto">Не удалось автоматически сопоставить слова перевода со словами оригинала.</div>`;
  return `<div class="meta">«${esc(m.text)}» — отдельного слова в оригинале нет</div><div class="gl">Добавлено переводом: предлог, союз, связка или местоимение передаются падежом, порядком слов или контекстом.</div>`+
    (m.wd?`<div class="cnt">рядом: «${esc(m.nbText)}» ← ${esc(m.wd[0])}${short?'':' · клик — статья'}</div>`:'');
}
function popNote(anchor,m){
  const pop=$('#pop');pop.innerHTML=missHTML(m,false);pop.hidden=false;
  const r=anchor.getBoundingClientRect(),pw=pop.offsetWidth,ph=pop.offsetHeight;
  let x=Math.min(Math.max(8,r.left+r.width/2-pw/2),innerWidth-pw-8),y=r.bottom+8;if(y+ph>innerHeight-8)y=r.top-ph-8;
  pop.style.left=x+'px';pop.style.top=y+'px';
}
const prefetchEl=t=>{if(t.classList.contains('w'))prefetchWord(t.dataset.k);else if(t.classList.contains('tw')&&CUR){const wd=origWord(t);if(wd)prefetchWord(wd[1])}};
let LASTTAP=null;
document.addEventListener('touchstart',e=>{const t=e.target.closest&&e.target.closest('.w,.tw,.tw0');if(t){LASTTAP=t;prefetchEl(t)}},{passive:true});
document.addEventListener('mouseover',e=>{
  if(isM())return;
  const t=e.target.closest&&e.target.closest('.w,.tw,.tw0');if(!t)return;
  const ref=refOf(t);hiClear();
  if(t.classList.contains('tw0')){const m=missInfo(t);popNote(t,m);if(m.nb!=null)$$(`[data-ref="${ref}"] .tw[data-j="${m.nb}"]`).forEach(x=>{if(x.dataset.t===t.dataset.t)x.classList.add('hi')});return}
  if(t.classList.contains('w')){
    popWord(t,[t.textContent,t.dataset.k,t.dataset.m],!!t.closest('.heb'));
    if(ref)$$(`[data-ref="${ref}"] .tw[data-a="${t.dataset.i}"]`).forEach(x=>x.classList.add('hi'));
  }else{
    const wd=origWord(t);if(!wd)return;
    popWord(t,wd,CUR.lang==='heb','слово оригинала · соответствие определено автоматически');
    t.classList.add('hi');$$(`[data-ref="${ref}"] .tw[data-a="${t.dataset.a}"]`).forEach(x=>x.classList.add('hi'));
    $$(`[data-ref="${ref}"] .w[data-i="${t.dataset.a}"]`).forEach(x=>x.classList.add('hi'));
  }
});
document.addEventListener('mouseover',e=>{const f=e.target.closest&&e.target.closest('.fn');if(f&&matchMedia('(hover:hover)').matches)fnShow(f)});
document.addEventListener('mouseout',e=>{if(e.target.closest&&e.target.closest('.fn'))$('#pop').hidden=true});
document.addEventListener('mouseout',e=>{if(e.target.closest&&e.target.closest('.w,.tw,.tw0')){$('#pop').hidden=true;hiClear()}});

/* ---------- word article (inspector) ---------- */
const clean=s=>s.toLowerCase().replace(/[.,;:!?«»"“”‘’()\[\]—–·]/g,'').trim();
function placeholder(){$('#inspBody').innerHTML=`<div class="insp-empty"><b>Статья слова</b>Нажми на слово оригинала или перевода — здесь появятся разбор формы, значения, места употребления и то, как слово передано в переводах.</div>`}
const icolMode=()=>!isM()&&innerWidth>=1100&&S.sec==='read'&&S.layout==='R';
function openInsp(){const el=$('#inspector'),was=el.classList.contains('open');el.classList.add('open');if(isM())document.body.classList.add('insp-open');if(icolMode()){if(!document.body.classList.contains('icol'))el.scrollTop=0;document.body.classList.add('icol')}if(isM()){if(!was){el.scrollTop=0;Sheet.to('half')}const t=LASTTAP&&LASTTAP.isConnected&&!LASTTAP.closest('.pbody')?LASTTAP.getBoundingClientRect():null;if(t&&t.bottom>innerHeight*.44)scrollBy({top:t.top-innerHeight*.22,behavior:'smooth'});LASTTAP=null;lockScroll('insp')}}
const inspOverlay=()=>isM()||innerWidth<1100||S.sec!=='read';
/* карточка слова без затемнения: закрывается нажатием мимо неё */
document.addEventListener('click',e=>{const el=$('#inspector');if(!el.classList.contains('open')||!inspOverlay())return;
  if(e.target.closest('#inspector,.w,.tw,.tw0,.vn,#menu,#modal,#pop,#lbar,#sugg,[data-wart],.fn'))return;closeInsp()},true);
function closeInsp(){const el=$('#inspector');document.body.classList.remove('icol');el.classList.remove('open','full');el.style.transform='';el.style.transition='';document.body.classList.remove('insp-open');unlockScroll('insp');$$('.w.pin').forEach(x=>x.classList.remove('pin'))}
async function inspect(wd,isH,pinSel,ctx){
  $$('.w.pin').forEach(x=>x.classList.remove('pin'));if(pinSel)$$(pinSel).forEach(x=>x.classList.add('pin'));
  const k=wd[1],dm=decode(isH?'H':'G',wd[2]);const same=INSP&&INSP.k===k;
  const I=INSP={wd,isH,k,dm,lx:lexNow(k),ctx,tab:same?INSP.tab:'a'};
  renderInsp();openInsp();
  if(k&&!I.lx){const lx=await lexOf(k);if(INSP===I&&lx){I.lx=lx;fillLex()}}
}
function renderInsp(){
  const I=INSP;if(!I)return;const {wd,isH,k,dm,lx}=I;
  const tabs=[['a','Статья'],['o','Где ещё'],['t','Как переводят'],['f','Формы']];
  $('#inspBody').innerHTML=`<div class="grab" aria-hidden="true"></div><div class="ihero ${isH?'he':''}"><div class="k">${esc(k||'без номера Стронга')} · ${esc(dm.pos||'')}</div><div class="lm ${isH?'he':'gr'}" id="iLemma">${esc(lx?lx.lemma:wd[0])}</div><div class="sub" id="iSub">${lx?esc(lx.tr)+' · «'+esc(lx.gloss)+'»':(k?'<span class="sk" style="width:60%"></span>':'')}</div>
    <div class="say"><button data-say="n" data-w="lemma">🔊 Звучание</button><button data-say="t" data-w="lemma">🔊 Как читается</button></div><div class="trl">читается: <b>${esc(Speech.tr(lx?lx.lemma:wd[0],isH))}</b> · условное чтение</div><div class="saynote" id="saynote"></div></div>`+
    `<div class="itabs">`+tabs.map(([i,n])=>`<button data-it="${i}" class="${I.tab===i?'on':''}">${n}</button>`).join('')+`</div><div class="ipane" id="ipane"></div>`;
  ({a:tabArticle,o:tabOcc,t:tabTr,f:tabForms})[I.tab]();
}
function fillLex(){ // словарь пришёл после открытия: дописываем без перерисовки
  const I=INSP,lx=I&&I.lx;if(!lx)return;const a=$('#iLemma'),b=$('#iSub');
  if(a)a.textContent=lx.lemma;if(b)b.textContent=lx.tr+' · «'+lx.gloss+'»';
  const t=$('.trl b',$('.ihero'));if(t)t.textContent=Speech.tr(lx.lemma,I.isH);
  if(I.tab==='a'){const sc=$('#inspector').scrollTop;tabArticle();$('#inspector').scrollTop=sc}
}
function tabArticle(){
  const {wd,isH,k,dm,lx,ctx}=INSP;let h='';
  if(ctx&&ctx.missing)h+=`<div class="ibox warm">${missHTML(ctx.missing,true)}<div class="hint" style="margin-top:6px">Ниже — слово оригинала, рядом с которым оно стоит.</div></div>`;
  h+=`<div class="ih" style="margin-top:6px">Эта форма${ctx?' · '+esc(bookAb(ctx.ref.split('.')[0]))+' '+ctx.ref.split('.')[1]+':'+ctx.ref.split('.')[2]:''}</div><div class="ibox"><span class="f ${isH?'he':'gr'}">${esc(wd[0])}</span> <button class="say1" data-say="t" data-w="form" title="Прочитать эту форму">🔊</button> — ${esc(dm.pos||'')}${dm.detail?', '+esc(dm.detail):''}<div class="trl" style="margin:4px 0">читается: <b>${esc(Speech.tr(wd[0],isH))}</b></div>`;
  (dm.prefix||[]).forEach(p=>h+=`<div>приставка: ${esc(p)}</div>`);(dm.suffix||[]).forEach(p=>h+=`<div>${esc(p)}</div>`);
  if(ctx){const by={};$$(`[data-ref="${ctx.ref}"] .tw[data-a="${ctx.i}"]`).forEach(x=>{(by[x.dataset.t]=by[x.dataset.t]||[]).push(x.textContent)});
    const keys=Object.keys(by);if(keys.length)h+=`<div style="margin-top:6px">`+keys.map(t=>`<b>${esc(shortName(t))}</b>: «${esc(by[t].join(' '))}»`).join(' · ')+`</div>`}
  h+='</div>';
  if(!lx&&k)h+=`<div class="ih">Значения</div><div class="sk" style="width:45%;height:18px"></div><div class="sk"></div><div class="sk"></div><div class="sk" style="width:70%"></div>`;
  if(lx){h+=`<div class="ih">Значения</div><div style="font-weight:700;margin-bottom:6px">${esc(lx.gloss)}</div><div class="def clamp" id="def">${lx.def.replace(/^(__)+/gm,m=>"\u2003".repeat(m.length/2))}</div><button class="more" id="defMore">Показать полностью</button>`;
    h+=`<div class="hint">Словарь: STEPBible ${isH?'TBESH':'TBESG'}, CC BY 4.0.</div>`}
  if(lx&&!/^H900\d$/.test(k)&&lx.lemma.replace(/[\u0591-\u05C7\/]/g,'').length>1){const lem=lx.lemma.split(',')[0].trim();
    h+=`<div class="ih">В библиотеке и везде</div><div class="ibox libx"><div class="hint" style="margin:0 0 8px">${isH?'Кумран, еврейский Сирах':'Септуагинта, апокрифы, Иосиф Флавий, Филон'} — где встречается «<span class="${isH?'he':'gr'}">${esc(lem)}</span>»</div>`+
      `<button class="mini" data-libq="${esc(lem)}">Искать в библиотеке</button> <button class="mini" data-allq="${esc(k)}">Везде по номеру ${esc(k)}</button></div>`}
  h+=`<div class="ih">Моя заметка к слову</div><textarea class="wnote" id="wnote" placeholder="Например: сравнить с φιλέω">${esc(S.wnotes[k]||'')}</textarea>`;
  $('#ipane').innerHTML=h;
}
/* разделы «Где ещё», «Как переводят», «Формы» — в insight.js */
/* ---------- verse menu: highlight + note ---------- */
function verseMenu(el){
  const ref=el.dataset.ref,[b,c,v]=ref.split('.'),menu=$('#menu');
  menu.innerHTML=`<div class="ref">${esc(bookAb(b))} ${c}:${v}</div><div class="cols">`+
   [['1','--hl1'],['2','--hl2'],['3','--hl3'],['4','--hl4']].map(([n,cv])=>`<button data-c="${n}" style="background:var(${cv})" title="Выделить"></button>`).join('')+
   `<button data-c="0" title="Снять выделение" style="border:1px solid var(--line)">✕</button></div><textarea placeholder="Заметка к стиху…">${esc(S.notes[ref]||'')}</textarea><div class="acts"><button id="mCopy">Копировать</button>${navigator.share?'<button id="mShare">Поделиться</button>':''}<button id="mClose">Закрыть</button></div>`;
  menu.hidden=false;const r=el.getBoundingClientRect();menu.style.left=Math.min(Math.max(8,r.left),innerWidth-300)+'px';menu.style.top=Math.min(r.bottom+8,innerHeight-260)+'px';
  menu.dataset.ref=ref;
}
document.addEventListener('click',async e=>{
  const t=e.target;
  if(!t.closest('#omni'))hideSugg();
  const sec=t.closest('[data-sec]');if(sec){showSec(sec.dataset.sec,true);return}
  const gs=t.closest('[data-gosec]');if(gs){showSec(gs.dataset.gosec);return}
  const tx=t.closest('[data-tabx]');if(tx){closeTab(+tx.dataset.tabx);return}
  const tb=t.closest('[data-tab]');if(tb){const i=+tb.dataset.tab;S.tab=i;const r=S.tabs[i];go(r.book,r.ch);scrollTo(0,0);return}
  if(t.closest('[data-tabadd]')){if(S.tabs.length>=8)return;S.tabs.push({...cur});S.tab=S.tabs.length-1;save();renderTabs();return}
  const ly=t.closest('[data-l]');if(ly){S.layout=ly.dataset.l;touchSettings();render();return}
  const st=t.closest('[data-step]');if(st){step(+st.dataset.step);return}
  const bo=t.closest('[data-bkopen]');if(bo){bookSheet(bo.dataset.bkopen);return}
  if(t.closest('.vn')){verseMenu(t.closest('.vn'));return}
  if(t.closest('#menu')){
    const bc=t.closest('[data-c]'),ref=$('#menu').dataset.ref;
    if(bc){const n=bc.dataset.c;if(n==='0')delete S.hl[ref];else S.hl[ref]=n;stamp('h:'+ref);applyHl(ref)}
    if(t.id==='mClose')$('#menu').hidden=true;
    if(t.id==='mShare'){const [b,c,v]=ref.split('.'),d=await loadChapter(b,+c),p=primary();const tx=p&&d.tr[p]&&d.tr[p][v]||'';navigator.share({text:`${tx}\n— ${bookRu(b)} ${c}:${v}${p?' ('+shortName(p)+')':''}`,url:location.origin+location.pathname+`#${b}.${c}.${v}`}).catch(()=>{})}
    if(t.id==='mCopy'){const [b,c,v]=ref.split('.'),d=await loadChapter(b,+c),p=primary();const tx=p&&d.tr[p]&&d.tr[p][v]||'';navigator.clipboard&&navigator.clipboard.writeText(`${tx}\n— ${bookRu(b)} ${c}:${v}${p?' ('+shortName(p)+')':''}`);t.textContent='Скопировано'}
    return}
  $('#menu').hidden=true;
  if(t.id==='defMore'){const d=$('#def');d.classList.toggle('clamp');t.textContent=d.classList.contains('clamp')?'Показать полностью':'Свернуть';return}
  const sy=t.closest('[data-say]');if(sy&&INSP){const txt=sy.dataset.w==='form'?INSP.wd[0]:(INSP.lx?INSP.lx.lemma:INSP.wd[0]);const r=Speech.say(txt,INSP.isH,sy.dataset.say);const n=$('#saynote');if(n)n.textContent=r.ok?'':r.why;return}
  const it=t.closest('[data-it]');if(it){INSP.tab=it.dataset.it;renderInsp();return}
  if(t.closest('#side')){
    const st=t.closest('[data-st]');if(st){sideT={t:st.dataset.st,from:cur.book,manual:true};buildSide();return}
    const bk=t.closest('[data-bk]');if(bk){go(bk.dataset.bk,1);scrollTo(0,0);return}
    const g=t.closest('[data-go]');if(g){const [b,c]=g.dataset.go.split('.');go(b,+c);scrollTo(0,0);return}
  }
  const pri=t.closest('[data-pri]');if(pri){const id=pri.dataset.pri;
    if(id==='ORIG'){if(S.sel.includes('ORIG')){if(S.sel.length>1)S.sel=S.sel.filter(x=>x!=='ORIG')}else S.sel.push('ORIG')}
    else{S.sel=S.sel.filter(x=>x!==id);S.sel.unshift(id)}
    touchSettings();render();return}
  const act=t.closest('[data-act]');if(act){if(act.dataset.act==='texts')textsSheet();return}
  const fnEl=t.closest('.fn');if(fnEl){fnShow(fnEl);return}
  const w=t.closest('.w');if(w){const ref=refOf(w);inspect([w.textContent,w.dataset.k,w.dataset.m],!!w.closest('.heb'),ref?`[data-ref="${ref}"] .w[data-i="${w.dataset.i}"]`:null,ref?{ref,i:w.dataset.i}:null);return}
  const tw=t.closest('.tw');if(tw){const wd=origWord(tw),ref=refOf(tw);if(wd)inspect(wd,CUR.lang==='heb',`[data-ref="${ref}"] .w[data-i="${tw.dataset.a}"]`,{ref,i:tw.dataset.a});return}
  const t0=t.closest('.tw0');if(t0){const m=missInfo(t0);
    if(m.wd){const pins=`[data-ref="${m.ref}"] .w[data-i="${m.a}"]`;inspect(m.wd,CUR.lang==='heb',pins,{ref:m.ref,i:m.a,missing:m})}
    else{INSP=null;$('#inspBody').innerHTML=`<div class="insp-empty">${missHTML(m,true)}</div>`;openInsp()}
    return}
  const rm=t.closest('[data-rm]');if(rm){S.sel=S.sel.filter(x=>x!==rm.dataset.rm);save();render();return}
  if(t.id==='scrim'){closeInsp();document.body.classList.remove('drawer')}
});
document.addEventListener('input',e=>{
  if(e.target.closest('#menu')){const ref=$('#menu').dataset.ref,v=e.target.value.trim();if(v)S.notes[ref]=v;else delete S.notes[ref];stamp('n:'+ref);applyHl(ref)}
  if(e.target.id==='wnote'&&INSP&&INSP.k){const v=e.target.value.trim();if(v)S.wnotes[INSP.k]=v;else delete S.wnotes[INSP.k];stamp('w:'+INSP.k)}
});
function applyHl(ref){
  $$(`[data-ref="${ref}"]`).forEach(el=>{if(el.classList.contains('vn'))return;['hl1','hl2','hl3','hl4'].forEach(c=>el.classList.remove(c));if(S.hl[ref])el.classList.add('hl'+S.hl[ref])});
  $$(`.vn[data-ref="${ref}"]`).forEach(el=>{el.querySelector('.note-dot')?.remove();if(S.notes[ref])el.insertAdjacentHTML('beforeend','<span class="note-dot">✎</span>')});
  if(S.layout==='D')render();
}

/* ---------- modals & controls ---------- */
function openModal(html,o){const m=$('#modal'),drop=!!(o&&o.drop)&&isM();
  m.classList.toggle('drop',drop);
  $('#sheet').style.transform='';$('#sheet').innerHTML=html+(drop?'<div class="dgrab" id="dgrab" role="button" aria-label="Закрыть"><i></i></div>':'');$('#sheet').scrollTop=0;
  clearTimeout(m._t);if(m.hidden){m.hidden=false;m.offsetWidth;}m.classList.add('show');lockScroll('modal')}
const closeModal=()=>{const m=$('#modal');if(m.hidden)return;m.classList.remove('show');unlockScroll('modal');clearTimeout(m._t);m._t=setTimeout(()=>{if(!m.classList.contains('show'))m.hidden=true},m.classList.contains('drop')?380:230)};
function bookSheet(sel){
  if(sel){const b=BOOKS[BI[sel]];const nd=Array.from({length:b.chapters},(_,i)=>S.done&&S.done[b.id+'.'+(i+1)]).filter(Boolean).length;openModal(`<h3>${esc(b.ru)}</h3><div class="hint" style="margin:-8px 0 12px"><a href="#" id="back">← все книги</a>${nd?` · прочитано ${nd} из ${b.chapters}`:''}</div><div class="nums g-${genreOf(b.id)}">`+Array.from({length:b.chapters},(_,i)=>`<button data-go="${b.id}.${i+1}" class="${cur.book===b.id&&cur.ch===i+1?'on':''}${S.done&&S.done[b.id+'.'+(i+1)]?' rd':''}">${i+1}</button>`).join('')+'</div>',{drop:1});return}
  let h=`<h3>Книги</h3><div class="pk">`;
  for(const t of ['OT','NT']){h+=`<h5>${t==='OT'?'Ветхий Завет':'Новый Завет'}</h5>`;
    for(const g of GORD){const bs=BOOKS.filter(b=>b.testament===t&&genreOf(b.id)===g);if(!bs.length)continue;
      h+=`<div class="g-${g}"><div class="gh">${GEN[g]}</div><div class="row">`+bs.map(b=>`<button data-bk="${b.id}" class="${cur.book===b.id?'on':''}">${esc(b.ab)}</button>`).join('')+`</div></div>`}}
  openModal(h+'</div>',{drop:1});const sh=$('#sheet'),on=$('#sheet .pk .on');if(on)sh.scrollTop=Math.max(0,sh.scrollTop+on.getBoundingClientRect().top-sh.getBoundingClientRect().top-sh.clientHeight/2+on.offsetHeight/2);
}
function textsSheet(){
  const row=(id,name,sub)=>`<label><input type="checkbox" data-t="${id}" ${S.sel.includes(id)?'checked':''}><span><b>${esc(name)}</b><small>${esc(sub)}</small></span></label>`;
  openModal(`<h3>Тексты</h3><div class="tlist">${row('ORIG','Оригинал','Иврит (WLC/OSHB) и греческий (SBLGNT/MorphGNT) с морфологией и словарём')}`+
    IDX.translations.map(t=>row(t.id,t.name,(t.lang==='ru'?'русский':'английский')+' · '+t.license)).join('')+`</div><div class="hint">Главный перевод — первый из включённых переводов (его можно выбрать в строке над текстом или внизу экрана).</div>`);
}
function dataSheet(){
  const n=Object.keys(S.notes).length,h=Object.keys(S.hl).length,w=Object.keys(S.wnotes||{}).length;
  openModal(`<h3>Заметки и выделения</h3><p>Сейчас: заметок к стихам — ${n}, выделенных стихов — ${h}, заметок к словам — ${w}. Они хранятся в этом браузере.</p><div class="acts" style="display:flex;gap:8px;flex-wrap:wrap"><button class="pill" id="exp">Сохранить в файл</button><label class="pill" style="cursor:pointer">Загрузить из файла<input id="imp" type="file" accept=".json" hidden></label></div>`);
}
function moreSheet(){
  openModal(`<h3>Настройки</h3><h5>Раскладка текста</h5><div class="mlist">`+Object.entries(LAYN).map(([l,n])=>`<button data-lay="${l}" class="${S.layout===l?'on':''}">${n}${l==='B'&&isM()?' · сравнение':''}</button>`).join('')+`</div><h5>Ещё</h5><div class="mlist"><button data-m="texts">Тексты и переводы</button><button data-m="view">Вид текста: шрифт, размер, тема</button><button data-m="theme">Оформление: ${S.tAuto?themeById(S.tDay||'light').name+' / '+themeById(S.tNight||'dark').name:themeById(S.theme).name}<small>дневные и ночные темы</small></button><button data-m="hist">История</button><button data-m="data">Заметки: сохранить в файл и загрузить</button><button data-m="acc">Личный кабинет${Sync.user?' · '+esc(Sync.user.email):''}</button></div>`);
}
function syncPrivate(){
  if(!IDX)return;const ok=!!(Sync.user&&Sync.user.access);let ch=false;
  for(const[id,name]of PRIVT){
    if(ok&&!TRS[id]){const t={id,name,lang:'ru',license:'скрытый доступ',books:id==='KASS'?BOOKS.filter(b=>b.testament==='NT').map(b=>b.id):BOOKS.map(b=>b.id)};TRS[id]=t;IDX.translations.push(t);ch=true;
      if(id==='BTI'&&(!S.btiShown||PEND)){S.btiShown=1;PEND=false;if(!S.sel.includes('BTI'))S.sel.push('BTI');save()}}
    if(!ok&&TRS[id]){delete TRS[id];IDX.translations=IDX.translations.filter(t=>t.id!==id);S.sel=S.sel.filter(x=>x!==id);if(!S.sel.length)S.sel=['ORIG','RST'];ch=true}}
  if(!ok)for(const k of [...cache.keys()])if(PRIV.test(k))cache.delete(k);
  if(ch)render();
}
function accStatus(){
  syncPrivate();
  const b=$('#accBtn');if(b){b.classList.toggle('on',!!Sync.user);b.title=Sync.user?'Аккаунт: '+Sync.user.email:'Войти'}
  if(!$('#modal').hidden&&$('#sheet [data-acc]'))accSheet();
}
function accSheet(){
  const mk=h=>openModal(`<div data-acc="1"><h3>Личный кабинет</h3>${h}<div class="hint" id="accMsg">${esc(Sync.msg||'')}</div></div>`);
  if(!Sync.enabled){mk('<p>Облако пока не подключено, поэтому заметки хранятся только в этом браузере. Когда в файле <code>config.js</code> появится адрес сервера, здесь можно будет войти и синхронизировать устройства.</p>');return}
  if(Sync.user){const t=Sync.last?Sync.last.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}):'ещё не было';
    const priv=Sync.user.access?'<p>✔ Скрытые материалы открыты.</p>':'<h5>Код доступа</h5><p>Если вам выдали особый код, введите его, чтобы открыть скрытые материалы.</p><div class="accf"><input id="accCode" placeholder="Код доступа" autocapitalize="characters" autocomplete="off"></div><div class="acts" style="margin-top:8px"><button class="pill" id="accRedeem">Активировать</button></div>';
    const own=Sync.user.owner?'<h5>Для владельца</h5><div class="accf"><input id="accLabel" placeholder="Для кого код (например, Мама)"></div><div class="acts" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button class="pill" id="accNewCode">Создать код</button><label class="pill" style="cursor:pointer">Загрузить скрытые материалы<input id="accUpload" type="file" accept=".json" hidden></label></div><div id="accCodes" class="hint">Загружаю список кодов…</div>':'';
    mk(`<p>Вы вошли как <b>${esc(Sync.user.email)}</b>.<br>Заметки, выделения и настройки синхронизируются автоматически. Последняя синхронизация: ${t}.</p><div class="acts" style="display:flex;gap:8px;flex-wrap:wrap"><button class="pill" id="accSync">Синхронизировать сейчас</button><button class="pill" id="accOut">Выйти</button></div>${priv}${own}`);
    if(Sync.user.owner)loadCodes();return}
  mk(`<p>Войдите, чтобы заметки, выделения и настройки были на всех ваших устройствах.</p><div class="accf"><input id="accEmail" type="email" placeholder="Почта" autocomplete="email"><input id="accPass" type="password" placeholder="Пароль (от 8 символов)" autocomplete="current-password"></div><div class="acts" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="pill" id="accIn">Войти</button><button class="pill" id="accUp">Создать аккаунт</button><button class="pill" id="accForgot">Забыли пароль?</button></div>`);
}
function resetSheet(email){
  openModal(`<div data-acc="1"><h3>Восстановление пароля</h3><p>Мы отправим код на почту. Введите его и новый пароль.</p><div class="accf"><input id="accEmail" type="email" placeholder="Почта" value="${esc(email||'')}"><input id="accCode" inputmode="numeric" placeholder="Код из письма (6 цифр)"><input id="accPass" type="password" placeholder="Новый пароль (от 8 символов)" autocomplete="new-password"></div><div class="acts" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="pill" id="accSend">Отправить код</button><button class="pill" id="accReset">Сменить пароль</button></div><div class="hint" id="accMsg"></div></div>`);
}
async function loadCodes(){
  try{const r=await Sync.admin('codes');const el=$('#accCodes');if(!el)return;
    el.innerHTML=(r.private_count?`Загружено файлов: ${r.private_count}. `:'Скрытые материалы ещё не загружены. ')+(r.codes.length?'<div style="margin-top:6px">'+r.codes.map(c=>`<div><b>${esc(c.code)}</b> ${esc(c.label||'')} · активаций: ${c.uses}${c.max_uses?'/'+c.max_uses:''} <button class="pill" data-revoke="${esc(c.code)}">Отозвать</button></div>`).join('')+'</div>':'Кодов пока нет.')}
  catch(e){const el=$('#accCodes');if(el)el.textContent='Не удалось загрузить список кодов'}
}
async function uploadPrivate(file){
  const say=t=>{const m=$('#accMsg');if(m)m.textContent=t};
  try{const data=JSON.parse(await file.text()),keys=Object.keys(data);let i=0;
    for(const k of keys){say(`Загрузка ${++i} из ${keys.length}…`);await Sync.admin('private',{k,v:typeof data[k]==='string'?data[k]:JSON.stringify(data[k])})}
    say('Готово: загружено файлов — '+keys.length);loadCodes()}
  catch(e){say('Ошибка загрузки: '+(e.message||e))}
}
async function accAct(id){
  const email=($('#accEmail')||{}).value,pass=($('#accPass')||{}).value,m=$('#accMsg');const say=t=>{if($('#accMsg'))$('#accMsg').textContent=t};
  if(id==='accOut'){await Sync.signOut();return}
  if(id==='accForgot'){resetSheet(email);return}
  if(id==='accSend'){if(!email){say('Введите почту.');return}say('Отправляю…');const e=await Sync.forgot(email);say(e||'Если такая почта зарегистрирована, код отправлен. Проверьте письма и папку «Спам».');return}
  if(id==='accReset'){const code=($('#accCode')||{}).value;if(!email||!code||!pass||pass.length<8){say('Нужны почта, код и новый пароль от 8 символов.');return}say('…');const e=await Sync.reset(email,code.trim(),pass);say(e||'');if(!e)closeModal();return}
  if(id==='accRedeem'){const c=($('#accCode')||{}).value;if(!c){say('Введите код.');return}say('…');const e=await Sync.redeem(c);say(e||'Готово: скрытые материалы открыты.');return}
  if(id==='accNewCode'){try{const r=await Sync.admin('code',{label:($('#accLabel')||{}).value||'',max:0});say('Новый код: '+r.code+' — передайте его человеку');loadCodes()}catch(e){say('Не получилось: '+(e.message||e))}return}
  if(id==='accSync'){say('Синхронизирую…');await Sync.syncNow();accSheet();return}
  if(!email){say('Введите почту.');return}
  if(!pass||pass.length<8){say('Пароль: от 8 символов.');return}
  say('…');
  if(id==='accIn'){const e=await Sync.signIn(email,pass);say(e?'Не получилось войти: '+e:'');if(!e)closeModal()}
  if(id==='accUp'){const e=await Sync.signUp(email,pass);say(e?'Не получилось: '+e:'');if(!e)closeModal()}
}
function toggleTheme(){S.theme=S.theme==='light'?'sepia':S.theme==='sepia'?'dark':'light';touchSettings();applyBody()}
/* ---------- sections, tabs, omnibox ---------- */
function applyBody(){
  const keep=['drawer','insp-open','icol'].filter(c=>document.body.classList.contains(c));
  document.body.className=[`theme-${effTheme()}`,`layout-${S.layout}`,`sec-${S.sec||'read'}`,S.side===false?'side-off':'',...keep].filter(Boolean).join(' ');
  syncThemeColor();
}
function showSec(s,fromNav){
  if(s==='read'&&S.sec==='read'&&fromNav&&!isM()){S.side=!S.side;touchSettings();applyBody();return}
  const was=S.sec;S.sec=s;applyBody();$('#menu').hidden=true;if(s==='search')warmSearch();
  if(s==='read'){$('#page').hidden=true;$('#reader').hidden=false;if(was!=='read')scrollTo(0,0)}
  else{$('#reader').hidden=true;$('#page').hidden=false;if(was==='read'||isM())closeInsp();Pages.render(s);scrollTo(0,0)}
}
function renderTabs(){
  const el=$('#tabs');if(!el)return;
  el.innerHTML=S.tabs.map((r,i)=>`<button class="tab g-${genreOf(r.book)} ${i===S.tab?'on':''}" data-tab="${i}" role="tab" title="${esc(bookRu(r.book))} ${r.ch}"><span class="gdot"></span>${esc(bookAb(r.book))} ${r.ch}${S.tabs.length>1?`<span class="x" data-tabx="${i}" role="button" aria-label="Закрыть вкладку">✕</span>`:''}</button>`).join('')+
    (S.tabs.length<8?`<button class="tab add" data-tabadd title="Новая вкладка" aria-label="Новая вкладка">+</button>`:'');
}
function closeTab(i){
  if(S.tabs.length<2)return;S.tabs.splice(i,1);if(i<S.tab||S.tab>=S.tabs.length)S.tab=Math.max(0,S.tab-1);
  const r=S.tabs[S.tab];go(r.book,r.ch);
}
let SG=[],SGi=0;
function hideSugg(){const b=$('#sugg');if(b)b.hidden=true}
function omniSugg(){
  const q=$('#jumpInp').value.trim(),b=$('#sugg');SG=[];
  if(!q){(S.qhist||[]).slice(0,5).forEach(x=>SG.push({t:'search',q:x,h:`<i>↺</i>${esc(x)}`}));(S.recent||[]).slice(0,3).forEach(r=>{const [bk,c]=r.split('.');if(BI[bk]!==undefined)SG.push({t:'go',r:{book:bk,ch:+c,v:0},h:`<i>↗</i>${esc(bookRu(bk))} ${c}`})})}
  else{const r=parseRef(q),strictR=parseRef(q,true);
    const sItem={t:'search',q,h:`<i>⌕</i>Искать «${esc(q)}» <small>слова, формы, Стронг</small>`},gItem=r&&{t:'go',r,h:`<i>↗</i>Перейти: <b>${esc(refLabel(r))}</b>`};
    if(strictR||(r&&/\d/.test(q)))SG.push(gItem,sItem);else{SG.push(sItem);if(gItem)SG.push(gItem)}}
  SGi=0;if(!SG.length){b.hidden=true;return}
  b.innerHTML=SG.map((x,i)=>`<button data-sg="${i}" class="${i===0?'on':''}">${x.h}</button>`).join('');b.hidden=false;
}
function omniRun(x){
  if(!x)return;hideSugg();$('#jumpInp').blur();
  if(x.t==='go'){go(x.r.book,x.r.ch,x.r.v);if(!x.r.v)scrollTo(0,0);$('#jumpInp').value=''}
  else Pages.search(x.q);
}
function bind(){
  $('#bookBtn').onclick=()=>bookSheet();$('#setBtn').onclick=moreSheet;$('#aaBtn').onclick=()=>readSheet();$('#mMore').onclick=moreSheet;$('#accBtn').onclick=accSheet;
  $('#mSearch').onclick=()=>{showSec('search');setTimeout(()=>{const i=$('#qInp');if(i)i.focus()},50)};
  $('#inspClose').onclick=closeInsp;placeholder();
  const ji=$('#jumpInp');
  ji.addEventListener('input',omniSugg);ji.addEventListener('focus',()=>{omniSugg();warmSearch()});
  ji.addEventListener('keydown',e=>{
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(!SG.length)return;SGi=(SGi+(e.key==='ArrowDown'?1:SG.length-1))%SG.length;$$('#sugg button').forEach((b,i)=>b.classList.toggle('on',i===SGi))}
    if(e.key==='Enter'){e.preventDefault();omniRun(SG[SGi]||(ji.value.trim()&&{t:'search',q:ji.value.trim()}))}
    if(e.key==='Escape'){hideSugg();ji.blur()}
  });
  $('#sugg').addEventListener('mousedown',e=>{const b=e.target.closest('[data-sg]');if(b){e.preventDefault();omniRun(SG[+b.dataset.sg])}});
  MQ.addEventListener('change',()=>{closeInsp();render();if(S.sec!=='read')Pages.render(S.sec)});
  let tx=null;$('#reader').addEventListener('touchstart',e=>{const p=e.touches[0];tx=e.touches.length===1?{x:p.clientX,y:p.clientY}:null},{passive:true});
  $('#reader').addEventListener('touchend',e=>{if(!tx)return;const p=e.changedTouches[0],dx=p.clientX-tx.x,dy=p.clientY-tx.y;tx=null;if(Math.abs(dx)>90&&Math.abs(dy)<45&&!getSelection().toString())step(dx<0?1:-1)},{passive:true});
  $('#modal').onclick=e=>{
    if(e.target.id==='modal'){closeModal();return}
    const bk=e.target.closest('[data-bk]');if(bk){bookSheet(bk.dataset.bk);return}
    if(e.target.id==='back'){e.preventDefault();bookSheet();return}
    const g=e.target.closest('[data-go]');if(g){const [b,c]=g.dataset.go.split('.');closeModal();go(b,+c);scrollTo(0,0);return}
    const lay=e.target.closest('[data-lay]');if(lay){S.layout=lay.dataset.lay;touchSettings();closeModal();render();return}
    const m=e.target.closest('[data-m]');if(m){const a=m.dataset.m;if(a==='texts')textsSheet();if(a==='view')readSheet();if(a==='data')dataSheet();if(a==='acc')accSheet();if(a==='hist'){closeModal();showSec('hist')}if(a==='theme')themeSheet();return}
    if(/^acc(In|Up|Out|Sync|Forgot|Send|Reset|Redeem|NewCode)$/.test(e.target.id)){accAct(e.target.id);return}
    const rv=e.target.closest('[data-revoke]');if(rv){Sync.admin('revoke',{code:rv.dataset.revoke}).then(loadCodes);return}
    if(e.target.id==='exp'){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({hl:S.hl,notes:S.notes,wnotes:S.wnotes},null,1)],{type:'application/json'}));a.download='adfontes-notes.json';a.click()}
  };
  $('#modal').onchange=e=>{
    const t=e.target.dataset&&e.target.dataset.t;
    if(t){const on=e.target.checked;if(on&&!S.sel.includes(t))S.sel.push(t);if(!on)S.sel=S.sel.filter(x=>x!==t);if(!S.sel.length){S.sel=[t];e.target.checked=true}touchSettings();render()}
    if(e.target.id==='accUpload'){const f=e.target.files[0];if(f)uploadPrivate(f);return}
    if(e.target.id==='imp'){const f=e.target.files[0];if(!f)return;f.text().then(x=>{const j=JSON.parse(x);Object.assign(S.hl,j.hl||{});Object.assign(S.notes,j.notes||{});Object.assign(S.wnotes,j.wnotes||{});const now=Date.now();Object.keys(j.hl||{}).forEach(k=>S.ts['h:'+k]=now);Object.keys(j.notes||{}).forEach(k=>S.ts['n:'+k]=now);Object.keys(j.wnotes||{}).forEach(k=>S.ts['w:'+k]=now);save();render();dataSheet()})}
  };
  addEventListener('keydown',e=>{
    const typing=/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement||{}).tagName||'');
    if(e.key==='Escape'){closeModal();$('#menu').hidden=true;closeInsp();document.body.classList.remove('drawer')}
    if(((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k')||(e.key==='/'&&!typing)){e.preventDefault();if(isM()){showSec('search');setTimeout(()=>$('#qInp')&&$('#qInp').focus(),50)}else $('#jumpInp').focus()}
    if(e.altKey&&e.key==='ArrowRight')step(1);if(e.altKey&&e.key==='ArrowLeft')step(-1)});
}

/* ---------- скролл фона и выдвижная статья на телефоне ---------- */
const LOCKS=new Set();
function lockScroll(w){LOCKS.add(w);document.documentElement.classList.add('locked')}
function unlockScroll(w){LOCKS.delete(w);if(!LOCKS.size)document.documentElement.classList.remove('locked')}
const Sheet=(()=>{
  const el=()=>$('#inspector');let st='half',d=null;
  const H=()=>el().offsetHeight,half=()=>Math.max(0,H()-Math.round(innerHeight*.52));
  const off=s=>s==='full'?0:s==='half'?half():H()+30;
  function to(s,v){const e=el();if(!e)return;if(s==='close'){e.style.transition='';e.style.transform=`translateY(${off('close')}px)`;setTimeout(closeInsp,200);return}
    if(s==='half'&&half()<24)s='full';st=s;e.classList.toggle('full',s==='full');e.style.transition=v?`transform ${Math.max(.16,Math.min(.34,.34-Math.abs(v)*.05))}s cubic-bezier(.2,.9,.25,1)`:'';e.style.transform=`translateY(${off(s)}px)`}
  function start(e){if(!isM()||!el().classList.contains('open'))return;const p=e.touches[0];d={y:p.clientY,x:p.clientX,t:performance.now(),base:off(st),drag:false,sc:el().scrollTop,last:p.clientY,lt:performance.now(),v:0}}
  function move(e){if(!d)return;const p=e.touches[0],dy=p.clientY-d.y;
    if(!d.drag){if(Math.abs(dy)<6||Math.abs(p.clientX-d.x)>Math.abs(dy))return;
      const canDrag=st==='half'||(el().scrollTop<=0&&dy>0);if(!canDrag){d=null;return}d.drag=true;d.y=p.clientY;}
    e.preventDefault();const dd=p.clientY-d.y;let y=d.base+dd;if(y<0)y=y/3;
    const now=performance.now();d.v=(p.clientY-d.last)/Math.max(1,now-d.lt);d.last=p.clientY;d.lt=now;
    const e2=el();e2.style.transition='none';e2.style.transform=`translateY(${y}px)`}
  function end(){if(!d)return;const dr=d;d=null;if(!dr.drag)return;
    const m=/translateY\((-?[\d.]+)px\)/.exec(el().style.transform),y=m?+m[1]:dr.base,v=dr.v,proj=y+v*180,h=half();
    let s;if(v>0.9||proj>H()*.82)s=(st==='full'&&h>24&&proj<H()*.75)?'half':'close';else if(v<-0.5)s='full';
    else{const c=[['full',0],['half',h],['close',H()]].filter(x=>x[0]!=='half'||h>24);s=c.reduce((a,b)=>Math.abs(b[1]-proj)<Math.abs(a[1]-proj)?b:a)[0]}
    to(s,v)}
  document.addEventListener('DOMContentLoaded',()=>{});
  const e=$('#inspector');
  e.addEventListener('touchstart',start,{passive:true});e.addEventListener('touchmove',move,{passive:false});
  e.addEventListener('touchend',end);e.addEventListener('touchcancel',end);
  e.addEventListener('click',ev=>{if(isM()&&ev.target.closest('.grab'))to(st==='full'?'half':'full',0)});
  $('#scrim').addEventListener('touchmove',ev=>ev.preventDefault(),{passive:false});
  $('#modal').addEventListener('touchmove',ev=>{if(!ev.target.closest('.sheet'))ev.preventDefault()},{passive:false});
  return{to,get state(){return st}};
})();

/* запрет зума на iOS Safari (user-scalable=no он игнорирует) */
['gesturestart','gesturechange','gestureend'].forEach(t=>document.addEventListener(t,e=>e.preventDefault()));
document.addEventListener('touchmove',e=>{if(e.touches&&e.touches.length>1)e.preventDefault()},{passive:false});
let _lt=0;document.addEventListener('touchend',e=>{const n=Date.now();if(n-_lt<350&&!(e.target.closest&&e.target.closest('input,textarea,select')))e.preventDefault();_lt=n},{passive:false});

/* окно выбора книги: потянуть за ручку вверх, чтобы закрыть */
(function(){let y0=null,dy=0;const sh=()=>$('#sheet');
  document.addEventListener('touchstart',e=>{const g=e.target.closest('#dgrab');if(!g)return;y0=e.touches[0].clientY;dy=0;sh().style.transition='none'},{passive:true});
  document.addEventListener('touchmove',e=>{if(y0==null)return;dy=Math.min(0,e.touches[0].clientY-y0);sh().style.transform=`translateY(${dy}px)`;e.preventDefault()},{passive:false});
  document.addEventListener('touchend',()=>{if(y0==null)return;const s=sh();s.style.transition='';y0=null;if(dy<-70){s.style.transform='';closeModal()}else{s.style.transform=''}dy=0});
  document.addEventListener('click',e=>{if(e.target.closest('#dgrab'))closeModal()});
})();
/* панель слова → поиск в библиотеке / везде */
document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('[data-libq],[data-allq]');if(!a)return;
  if(isM())closeInsp();if(a.dataset.libq)Pages.search(a.dataset.libq,{scope:'lib',mode:'forms'});else Pages.search(a.dataset.allq,{scope:'all',mode:'forms'})});
