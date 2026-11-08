'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const KEY='scriptorium.v1';
let S={layout:'A',theme:'light',last:{book:'Gen',ch:1},sel:['ORIG','RST','BTI'],hl:{},notes:{},wnotes:{},recent:[]};
try{Object.assign(S,JSON.parse(localStorage.getItem(KEY)||'{}'))}catch(e){}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}};
const cache=new Map();
const J=p=>{if(!cache.has(p))cache.set(p,fetch(p).then(r=>{if(!r.ok)throw 0;return r.json()}).catch(()=>{cache.delete(p);return null}));return cache.get(p)};
let CUR=null,IDX,BOOKS,BI={},TRS={},OCC=null,LEX={},cur=S.last,token=0,sideT=null,INSP=null;
const MQ=window.matchMedia('(max-width:820px)'),isM=()=>MQ.matches;

/* ---------- genres ---------- */
const GEN={law:'Закон',hist:'История',poe:'Поэзия',pro:'Пророки',gos:'Евангелия и Деяния',epi:'Послания',rev:'Откровение'};
const GORD=['law','hist','poe','pro','gos','epi','rev'];
function genreOf(id){const i=BI[id];if(i<5)return'law';if(i<17)return'hist';if(i<22)return'poe';if(i<39)return'pro';if(i<44)return'gos';if(i<65)return'epi';return'rev'}
const SHORT={RST:'Синод.',BTI:'Кулаков'};
const shortName=id=>SHORT[id]||id;

/* ---------- init ---------- */
(async function init(){
  IDX=await J('data/index.json');
  if(!IDX){document.body.innerHTML='<p style="padding:40px;font-family:sans-serif">Не найдены файлы данных. Запустите приложение через сервер: в папке приложения выполните <code>python3 -m http.server 8000</code> и откройте <code>http://localhost:8000</code>.</p>';return}
  BOOKS=IDX.books;BOOKS.forEach((b,i)=>BI[b.id]=i);IDX.translations.forEach(t=>TRS[t.id]=t);
  S.sel=S.sel.filter(x=>x==='ORIG'||TRS[x]);if(!S.sel.length)S.sel=['ORIG','RST'];
  if(!S.recent)S.recent=[];if(!S.wnotes)S.wnotes={};
  if(BI[cur.book]===undefined)cur={book:'Gen',ch:1};
  const h=parseHash();if(h)cur=h;
  bind();go(cur.book,cur.ch,h&&h.v);
  J('data/occ.json').then(o=>OCC=o);
})();
function parseHash(){const m=(location.hash||'').match(/^#([0-9A-Za-z]+)\.(\d+)(?:\.(\d+))?$/);return m&&BI[m[1]]!==undefined?{book:m[1],ch:+m[2],v:m[3]?+m[3]:0}:null}
const bookRu=id=>BOOKS[BI[id]].ru, bookAb=id=>BOOKS[BI[id]].ab;
function primary(){return S.sel.find(x=>x!=='ORIG')||null}

/* ---------- navigation ---------- */
function go(book,ch,v){
  cur={book,ch};S.last=cur;
  const rk=book+'.'+ch;S.recent=[rk,...(S.recent||[]).filter(x=>x!==rk)].slice(0,6);save();
  try{history.replaceState(null,'','#'+book+'.'+ch+(v?'.'+v:''))}catch(e){}
  document.body.classList.remove('drawer');
  render(v);
}
function step(d){
  const i=BI[cur.book];let b=i,c=cur.ch+d;
  if(c<1){b=i-1;if(b<0)return;c=BOOKS[b].chapters}else if(c>BOOKS[i].chapters){b=i+1;if(b>=BOOKS.length)return;c=1}
  go(BOOKS[b].id,c);scrollTo(0,0);
}
const norm=s=>s.toLowerCase().replace(/[\s.]/g,'');
function parseRef(q){
  const m=q.trim().match(/^(.*?)(?:\s+(\d+))?(?:[:.,](\d+))?$/);if(!m||!m[1])return null;
  const x=norm(m[1]);let b=BOOKS.find(b=>norm(b.ru)===x||norm(b.ab)===x||b.id.toLowerCase()===x||norm(b.scrollmapper)===x)
    ||BOOKS.find(b=>norm(b.ru).startsWith(x)||norm(b.ab).startsWith(x)||norm(b.scrollmapper).startsWith(x));
  if(!b)return null;const ch=Math.min(Math.max(+m[2]||1,1),b.chapters);return{book:b.id,ch,v:+m[3]||0};
}

/* ---------- data ---------- */
async function loadChapter(book,ch){
  const o=await J(`data/orig/${book}.json`);
  const orig=o?o.chapters[ch]||{}:{},lang=o?o.lang:'heb',tr={},al={};
  await Promise.all(S.sel.filter(x=>x!=='ORIG'&&TRS[x].books.includes(book)).map(async id=>{const b=await J(`data/tr/${id}/${book}.json`);tr[id]=b?b[ch]||{}:{};const a=await J(`data/align/${id}/${book}.json`);al[id]=a?a[ch]||{}:{}}));
  const nums=new Set(Object.keys(orig).map(Number));for(const id in tr)for(const v in tr[id])nums.add(+v);
  return{orig,lang,tr,al,verses:[...nums].sort((a,b)=>a-b)};
}
const origHTML=(ws,lang,cls='')=>ws?`<div class="orig ${lang} ${cls}" lang="${lang==='heb'?'he':'grc'}">`+ws.map((w,i)=>`<span class="w" data-i="${i}" data-k="${w[1]}" data-m="${esc(w[2])}">${esc(w[0])}</span>`).join(' ')+'</div>':'';
const trHTML=(id,v,text,d)=>{const a=d.al&&d.al[id]&&d.al[id][v],ch=text.trim().split(/\s+/);
  if(!a||a.length!==ch.length)return esc(text);
  return ch.map((c,i)=>a[i]>=0?`<span class="tw" data-t="${id}" data-a="${a[i]}">${esc(c)}</span>`:esc(c)).join(' ')};
const vnHTML=(ref,v)=>`<span class="vn" data-ref="${ref}" title="Выделение и заметка">${v}${S.notes[ref]?'<span class="note-dot">✎</span>':''}</span>`;
const hlc=ref=>S.hl[ref]?' hl'+S.hl[ref]:'';

/* ---------- render ---------- */
async function render(scrollV){
  const t=++token;document.body.className=`theme-${S.theme} layout-${S.layout}`+(document.body.classList.contains('drawer')?' drawer':'')+(document.body.classList.contains('insp-open')?' insp-open':'');
  $('#bookLabel').textContent=`${bookRu(cur.book)} ${cur.ch}`;
  $$('#layoutSw button').forEach(b=>b.classList.toggle('on',b.dataset.l===S.layout));
  buildSide();
  const d=await loadChapter(cur.book,cur.ch);if(t!==token)return;
  CUR=d;const R=$('#reader');R.innerHTML=({A:viewA,B:viewB,D:viewD})[S.layout](d);
  renderBar();initSplit();
  if(scrollV){const el=$(`[data-v="${scrollV}"]`,R);if(el){el.scrollIntoView({block:'center'});el.classList.add('flash');setTimeout(()=>el.classList.remove('flash'),1700)}}
  const nxt=BOOKS[BI[cur.book]+((cur.ch>=BOOKS[BI[cur.book]].chapters)?1:0)];if(nxt)J(`data/orig/${nxt.id}.json`);
}
const gcls=()=>'g-'+genreOf(cur.book);
const head=()=>{const b=BOOKS[BI[cur.book]];return `<div class="ch-head ${gcls()}"><small>${b.testament==='OT'?'Ветхий Завет':'Новый Завет'} · ${GEN[genreOf(cur.book)]}</small><h1>${esc(bookRu(cur.book))}, глава ${cur.ch}</h1></div>`};
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
  let h=head()+`<div class="desk" style="grid-template-columns:52px repeat(${n},minmax(0,1fr))"><div class="colhead"></div>`+
    cols.map(c=>`<div class="colhead"><span>${c==='ORIG'?(d.lang==='heb'?'Иврит · WLC':'Греческий · SBLGNT'):esc(TRS[c].name)}</span>${n>1?`<button data-rm="${c}" title="Убрать колонку">✕</button>`:''}</div>`).join('');
  for(const v of d.verses){const ref=`${cur.book}.${cur.ch}.${v}`,hc=hlc(ref);
    h+=`<div class="cell n${hc}" data-v="${v}" data-ref="${ref}">${vnHTML(ref,v)}</div>`+cols.map(c=>c==='ORIG'?
      `<div class="cell orig-c${hc}" data-ref="${ref}">${d.orig[v]?origHTML(d.orig[v],d.lang):missOrig(d.lang)}</div>`:
      `<div class="cell${hc}" data-ref="${ref}">${d.tr[c]&&d.tr[c][v]?trHTML(c,v,d.tr[c][v],d):'<span class="miss">—</span>'}</div>`).join('')}
  return h+'</div>';
}
function viewSplit(d){
  const cols=S.sel.slice(0,3);
  return `<div class="split" style="grid-template-rows:repeat(${cols.length},minmax(0,1fr))">`+cols.map((c,i)=>{
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
  return `<article class="ms">${head()}`+d.verses.map(v=>{
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
  h+=`<div class="recent">`+(S.recent||[]).map(r=>{const [b,c]=r.split('.');return BI[b]===undefined?'':`<button data-go="${r}">${esc(bookAb(b))} ${c}</button>`}).join('')+`</div>`;
  for(const g of GORD){
    const bs=BOOKS.filter(b=>b.testament===t&&genreOf(b.id)===g);if(!bs.length)continue;
    h+=`<div class="g-${g}"><div class="gh">${GEN[g]}</div>`+bs.map(b=>`<button class="bk ${b.id===cur.book?'on':''}" data-bk="${b.id}">${esc(b.ru)}<small>${b.chapters}</small></button>`+
      (b.id===cur.book?`<div class="chs">`+Array.from({length:b.chapters},(_,i)=>`<button data-go="${b.id}.${i+1}" class="${cur.ch===i+1?'on':''}">${i+1}</button>`).join('')+`</div>`:'')).join('')+`</div>`;
  }
  side.innerHTML=h;
  const on=$('.bk.on',side);if(on&&!side._did){side._did=1;on.scrollIntoView({block:'center'})}
}

/* ---------- lexicon / popovers ---------- */
async function lexOf(k){const f=k[0];if(!LEX[f])LEX[f]=(await J(f==='H'?'data/lex_H.json':'data/lex_G.json'))||{};return LEX[f][k]}
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
document.addEventListener('mouseover',e=>{
  if(isM())return;
  const t=e.target.closest&&e.target.closest('.w,.tw');if(!t)return;
  const ref=refOf(t);hiClear();
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
document.addEventListener('mouseout',e=>{if(e.target.closest&&e.target.closest('.w,.tw')){$('#pop').hidden=true;hiClear()}});

/* ---------- word article (inspector) ---------- */
const clean=s=>s.toLowerCase().replace(/[.,;:!?«»"“”‘’()\[\]—–·]/g,'').trim();
function placeholder(){$('#inspBody').innerHTML=`<div class="insp-empty"><b>Статья слова</b>Нажми на слово оригинала или перевода — здесь появятся разбор формы, значения, места употребления и то, как слово передано в переводах.</div>`}
function openInsp(){$('#inspector').classList.add('open');if(isM()||innerWidth<1100)document.body.classList.add('insp-open')}
function closeInsp(){$('#inspector').classList.remove('open');document.body.classList.remove('insp-open');$$('.w.pin').forEach(x=>x.classList.remove('pin'))}
async function inspect(wd,isH,pinSel,ctx){
  $$('.w.pin').forEach(x=>x.classList.remove('pin'));if(pinSel)$$(pinSel).forEach(x=>x.classList.add('pin'));
  const k=wd[1],dm=decode(isH?'H':'G',wd[2]);const lx=k?await lexOf(k):null;
  const same=INSP&&INSP.k===k;
  INSP={wd,isH,k,dm,lx,ctx,tab:same?INSP.tab:'a'};
  renderInsp();openInsp();
}
function renderInsp(){
  const I=INSP;if(!I)return;const {wd,isH,k,dm,lx}=I;
  const tabs=[['a','Статья'],['o','Вхождения'],['t','Переводы'],['f','Формы']];
  const cnt=k&&OCC&&OCC[k]?OCC[k].length:0;
  $('#inspBody').innerHTML=`<div class="ihero ${isH?'he':''}"><div class="k">${esc(k||'без номера Стронга')} · ${esc(dm.pos||'')}</div><div class="lm ${isH?'he':'gr'}">${esc(lx?lx.lemma:wd[0])}</div><div class="sub">${lx?esc(lx.tr)+' · «'+esc(lx.gloss)+'»':''}</div></div>`+
    `<div class="itabs">`+tabs.map(([i,n])=>`<button data-it="${i}" class="${I.tab===i?'on':''}">${n}</button>`).join('')+`</div><div class="ipane" id="ipane"></div>`;
  ({a:tabArticle,o:tabOcc,t:tabTr,f:tabForms})[I.tab]();
}
function tabArticle(){
  const {wd,isH,k,dm,lx,ctx}=INSP;let h='';
  h+=`<div class="ih" style="margin-top:6px">Эта форма${ctx?' · '+esc(bookAb(ctx.ref.split('.')[0]))+' '+ctx.ref.split('.')[1]+':'+ctx.ref.split('.')[2]:''}</div><div class="ibox"><span class="f ${isH?'he':'gr'}">${esc(wd[0])}</span> — ${esc(dm.pos||'')}${dm.detail?', '+esc(dm.detail):''}`;
  (dm.prefix||[]).forEach(p=>h+=`<div>приставка: ${esc(p)}</div>`);(dm.suffix||[]).forEach(p=>h+=`<div>${esc(p)}</div>`);
  if(ctx){const by={};$$(`[data-ref="${ctx.ref}"] .tw[data-a="${ctx.i}"]`).forEach(x=>{(by[x.dataset.t]=by[x.dataset.t]||[]).push(x.textContent)});
    const keys=Object.keys(by);if(keys.length)h+=`<div style="margin-top:6px">`+keys.map(t=>`<b>${esc(shortName(t))}</b>: «${esc(by[t].join(' '))}»`).join(' · ')+`</div>`}
  h+='</div>';
  if(lx){h+=`<div class="ih">Значения</div><div style="font-weight:700;margin-bottom:6px">${esc(lx.gloss)}</div><div class="def clamp" id="def">${lx.def.replace(/^(__)+/gm,m=>"\u2003".repeat(m.length/2))}</div><button class="more" id="defMore">Показать полностью</button>`;
    h+=`<div class="hint">Словарь: STEPBible ${isH?'TBESH':'TBESG'}, CC BY 4.0.</div>`}
  h+=`<div class="ih">Моя заметка к слову</div><textarea class="wnote" id="wnote" placeholder="Например: сравнить с φιλέω">${esc(S.wnotes[k]||'')}</textarea>`;
  $('#ipane').innerHTML=h;
}
function tabOcc(){
  const {k}=INSP;$('#ipane').innerHTML=`<div id="occBox"><div class="hint">Загрузка…</div></div>`;
  if(!k){$('#occBox').innerHTML='<div class="hint">Для этого слова нет номера Стронга.</div>';return}
  (async()=>{if(!OCC)OCC=await J('data/occ.json');const all=(OCC&&OCC[k])||[];
    const by={};all.forEach(n=>{const bi=Math.floor(n/1e6);by[bi]=(by[bi]||0)+1});
    const rows=Object.entries(by).sort((a,b)=>b[1]-a[1]).slice(0,8),mx=rows[0]?rows[0][1]:1;
    const box=$('#occBox');if(!box)return;
    box.innerHTML=`<div class="ih" style="margin-top:6px">По книгам · всего ${all.length}</div><div class="bars">`+rows.map(([bi,n])=>`<div class="bar g-${genreOf(BOOKS[bi].id)}"><span>${esc(BOOKS[bi].ru)}</span><i style="width:${Math.max(4,n/mx*100)}%"></i><b>${n}</b></div>`).join('')+`</div><div class="ih">Отрывки</div><div id="occRows"></div>`;
    occList(k,0)})();
}
async function occList(k,from){
  if(!OCC)OCC=await J('data/occ.json');const all=(OCC&&OCC[k])||[];
  const uniq=[...new Set(all)];const part=uniq.slice(from,from+30);const rows=$('#occRows');if(!rows)return;
  const pid=primary()||'RST';
  const items=await Promise.all(part.map(async n=>{const b=BOOKS[Math.floor(n/1e6)],c=Math.floor(n/1000)%1000,v=n%1000;
    const bd=await J(`data/tr/${pid}/${b.id}.json`);const t=bd&&bd[c]&&bd[c][v]||'';return{b,c,v,t}}));
  items.forEach(it=>{const a=document.createElement('button');a.className='occ';a.innerHTML=`<b>${esc(it.b.ab)} ${it.c}:${it.v}</b><span>${esc(it.t.slice(0,150))}</span>`;a.onclick=()=>{closeInsp();go(it.b.id,it.c,it.v)};rows.appendChild(a)});
  $('.more',$('#ipane'))&&$('.more',$('#ipane')).remove();
  if(from+30<uniq.length){const m=document.createElement('button');m.className='more';m.textContent=`Показать ещё (${uniq.length-from-30})`;m.onclick=()=>occList(k,from+30);$('#ipane').appendChild(m)}
}
/* sample renderings & forms over the first N verses where the word occurs */
const SAMPLE=30,SAMP=new Map();
function sampleOf(k){
  const key=k+'|'+S.sel.join(',');if(SAMP.has(key))return SAMP.get(key);
  const p=(async()=>{
    if(!OCC)OCC=await J('data/occ.json');const uniq=[...new Set((OCC&&OCC[k])||[])];
    const pick=uniq.length<=SAMPLE?uniq:Array.from({length:SAMPLE},(_,i)=>uniq[Math.floor(i*uniq.length/SAMPLE)]);
    const forms=new Map(),rend={};const ids=S.sel.filter(x=>x!=='ORIG');ids.forEach(i=>rend[i]=new Map());
    for(const n of pick){
      const b=BOOKS[Math.floor(n/1e6)],c=Math.floor(n/1000)%1000,v=n%1000;
      const o=await J(`data/orig/${b.id}.json`);const ws=o&&o.chapters[c]&&o.chapters[c][v];if(!ws)continue;
      const idx=[];ws.forEach((w,i)=>{if(w[1]===k){idx.push(i);const f=forms.get(w[0])||{n:0,m:w[2]};f.n++;forms.set(w[0],f)}});
      for(const id of ids){
        if(!TRS[id].books.includes(b.id))continue;
        const t=await J(`data/tr/${id}/${b.id}.json`),a=await J(`data/align/${id}/${b.id}.json`);
        const txt=t&&t[c]&&t[c][v],al=a&&a[c]&&a[c][v];if(!txt||!al)continue;const ch=txt.trim().split(/\s+/);if(al.length!==ch.length)continue;
        for(const i of idx){const r=ch.filter((_,j)=>al[j]===i).map(clean).filter(Boolean).join(' ')||'—';rend[id].set(r,(rend[id].get(r)||0)+1)}
      }
    }
    return{forms,rend,n:pick.length,total:uniq.length};
  })();
  SAMP.set(key,p);return p;
}
function tabTr(){
  const {k}=INSP;$('#ipane').innerHTML=`<div class="hint">Считаю по текстам…</div>`;if(!k){$('#ipane').innerHTML='<div class="hint">Нет номера Стронга.</div>';return}
  sampleOf(k).then(s=>{if(!INSP||INSP.k!==k||INSP.tab!=='t'||!$('#ipane'))return;
    const ids=Object.keys(s.rend).filter(id=>s.rend[id].size);
    $('#ipane').innerHTML=(ids.length?ids.map((id,i)=>{const rows=[...s.rend[id].entries()].sort((a,b)=>b[1]-a[1]).slice(0,6),mx=rows[0][1];
      return `<div class="card ${id===primary()?'':'o'}"><h5>${esc(TRS[id].name)}</h5><div class="bars">`+rows.map(([t,n])=>`<div class="bar"><span>${t==='—'?'не передано':esc(t)}</span><i style="width:${Math.max(4,n/mx*100)}%"></i><b>${n}</b></div>`).join('')+`</div></div>`}).join(''):'<div class="hint">Для включённых переводов нет данных соответствия.</div>')+
      `<div class="hint">По ${s.n} из ${s.total} стихов с этим словом. Соответствие слов определено автоматически и может содержать неточности.</div>`});
}
function tabForms(){
  const {k,isH}=INSP;$('#ipane').innerHTML=`<div class="hint">Собираю формы…</div>`;if(!k){$('#ipane').innerHTML='<div class="hint">Нет номера Стронга.</div>';return}
  sampleOf(k).then(s=>{if(!INSP||INSP.k!==k||INSP.tab!=='f'||!$('#ipane'))return;
    const rows=[...s.forms.entries()].sort((a,b)=>b[1].n-a[1].n);
    $('#ipane').innerHTML=`<div class="bars" style="gap:10px">`+rows.map(([f,o])=>{const dm=decode(isH?'H':'G',o.m);return `<div class="ibox warm"><span class="f ${isH?'he':'gr'}">${esc(f)}</span> <b style="float:right">${o.n}×</b><div style="font-size:13.5px;color:var(--mute)">${esc(dm.pos||'')}${dm.detail?', '+esc(dm.detail):''}</div></div>`}).join('')+`</div><div class="hint">По ${s.n} из ${s.total} стихов с этим словом.</div>`});
}

/* ---------- verse menu: highlight + note ---------- */
function verseMenu(el){
  const ref=el.dataset.ref,[b,c,v]=ref.split('.'),menu=$('#menu');
  menu.innerHTML=`<div class="ref">${esc(bookAb(b))} ${c}:${v}</div><div class="cols">`+
   [['1','--hl1'],['2','--hl2'],['3','--hl3'],['4','--hl4']].map(([n,cv])=>`<button data-c="${n}" style="background:var(${cv})" title="Выделить"></button>`).join('')+
   `<button data-c="0" title="Снять выделение" style="border:1px solid var(--line)">✕</button></div><textarea placeholder="Заметка к стиху…">${esc(S.notes[ref]||'')}</textarea><div class="acts"><button id="mCopy">Копировать</button><button id="mClose">Закрыть</button></div>`;
  menu.hidden=false;const r=el.getBoundingClientRect();menu.style.left=Math.min(Math.max(8,r.left),innerWidth-300)+'px';menu.style.top=Math.min(r.bottom+8,innerHeight-260)+'px';
  menu.dataset.ref=ref;
}
document.addEventListener('click',async e=>{
  const t=e.target;
  if(t.closest('.vn')){verseMenu(t.closest('.vn'));return}
  if(t.closest('#menu')){
    const bc=t.closest('[data-c]'),ref=$('#menu').dataset.ref;
    if(bc){const n=bc.dataset.c;if(n==='0')delete S.hl[ref];else S.hl[ref]=n;save();applyHl(ref)}
    if(t.id==='mClose')$('#menu').hidden=true;
    if(t.id==='mCopy'){const [b,c,v]=ref.split('.'),d=await loadChapter(b,+c),p=primary();const tx=p&&d.tr[p]&&d.tr[p][v]||'';navigator.clipboard&&navigator.clipboard.writeText(`${bookRu(b)} ${c}:${v} — ${tx}`);t.textContent='Скопировано'}
    return}
  $('#menu').hidden=true;
  if(t.id==='defMore'){const d=$('#def');d.classList.toggle('clamp');t.textContent=d.classList.contains('clamp')?'Показать полностью':'Свернуть';return}
  const it=t.closest('[data-it]');if(it){INSP.tab=it.dataset.it;renderInsp();return}
  if(t.closest('#side')){
    const st=t.closest('[data-st]');if(st){sideT={t:st.dataset.st,from:cur.book,manual:true};buildSide();return}
    const bk=t.closest('[data-bk]');if(bk){go(bk.dataset.bk,1);scrollTo(0,0);return}
    const g=t.closest('[data-go]');if(g){const [b,c]=g.dataset.go.split('.');go(b,+c);scrollTo(0,0);return}
  }
  const pri=t.closest('[data-pri]');if(pri){const id=pri.dataset.pri;
    if(id==='ORIG'){if(S.sel.includes('ORIG')){if(S.sel.length>1)S.sel=S.sel.filter(x=>x!=='ORIG')}else S.sel.push('ORIG')}
    else{S.sel=S.sel.filter(x=>x!==id);S.sel.unshift(id)}
    save();render();return}
  const act=t.closest('[data-act]');if(act){if(act.dataset.act==='texts')textsSheet();return}
  const w=t.closest('.w');if(w){const ref=refOf(w);inspect([w.textContent,w.dataset.k,w.dataset.m],!!w.closest('.heb'),ref?`[data-ref="${ref}"] .w[data-i="${w.dataset.i}"]`:null,ref?{ref,i:w.dataset.i}:null);return}
  const tw=t.closest('.tw');if(tw){const wd=origWord(tw),ref=refOf(tw);if(wd)inspect(wd,CUR.lang==='heb',`[data-ref="${ref}"] .w[data-i="${tw.dataset.a}"]`,{ref,i:tw.dataset.a});return}
  const rm=t.closest('[data-rm]');if(rm){S.sel=S.sel.filter(x=>x!==rm.dataset.rm);save();render();return}
  if(t.id==='scrim'){closeInsp();document.body.classList.remove('drawer')}
});
document.addEventListener('input',e=>{
  if(e.target.closest('#menu')){const ref=$('#menu').dataset.ref,v=e.target.value.trim();if(v)S.notes[ref]=v;else delete S.notes[ref];save();applyHl(ref)}
  if(e.target.id==='wnote'&&INSP&&INSP.k){const v=e.target.value.trim();if(v)S.wnotes[INSP.k]=v;else delete S.wnotes[INSP.k];save()}
});
function applyHl(ref){
  $$(`[data-ref="${ref}"]`).forEach(el=>{if(el.classList.contains('vn'))return;['hl1','hl2','hl3','hl4'].forEach(c=>el.classList.remove(c));if(S.hl[ref])el.classList.add('hl'+S.hl[ref])});
  $$(`.vn[data-ref="${ref}"]`).forEach(el=>{el.querySelector('.note-dot')?.remove();if(S.notes[ref])el.insertAdjacentHTML('beforeend','<span class="note-dot">✎</span>')});
  if(S.layout==='D')render();
}

/* ---------- modals & controls ---------- */
function openModal(html){$('#sheet').innerHTML=html;$('#modal').hidden=false}
const closeModal=()=>{$('#modal').hidden=true};
function bookSheet(sel){
  if(sel){const b=BOOKS[BI[sel]];openModal(`<h3>${esc(b.ru)}</h3><div class="hint" style="margin:-8px 0 12px"><a href="#" id="back">← все книги</a></div><div class="nums g-${genreOf(b.id)}">`+Array.from({length:b.chapters},(_,i)=>`<button data-go="${b.id}.${i+1}" class="${cur.book===b.id&&cur.ch===i+1?'on':''}">${i+1}</button>`).join('')+'</div>');return}
  let h=`<h3>Книги</h3><div class="pk">`;
  for(const t of ['OT','NT']){h+=`<h5>${t==='OT'?'Ветхий Завет':'Новый Завет'}</h5>`;
    for(const g of GORD){const bs=BOOKS.filter(b=>b.testament===t&&genreOf(b.id)===g);if(!bs.length)continue;
      h+=`<div class="g-${g}"><div class="gh">${GEN[g]}</div><div class="row">`+bs.map(b=>`<button data-bk="${b.id}" class="${cur.book===b.id?'on':''}">${esc(b.ab)}</button>`).join('')+`</div></div>`}}
  openModal(h+'</div>');
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
  const L=[['A','Карточки'],['B','Сравнение'],['D','Поля']];
  openModal(`<h3>Scriptorium</h3><h5>Вид</h5><div class="mlist">`+L.map(([l,n])=>`<button data-lay="${l}" class="${S.layout===l?'on':''}">${n}</button>`).join('')+`</div><h5>Ещё</h5><div class="mlist"><button data-m="texts">Тексты</button><button data-m="theme">Тема: ${S.theme==='light'?'светлая → тёмная':'тёмная → светлая'}</button><button data-m="data">Заметки: сохранить и загрузить</button></div>`);
}
function toggleTheme(){S.theme=S.theme==='light'?'dark':'light';save();document.body.className=document.body.className.replace(/theme-\w+/,'theme-'+S.theme)}
function bind(){
  $('#bookBtn').onclick=()=>bookSheet();$('#textsBtn').onclick=textsSheet;$('#dataBtn').onclick=dataSheet;$('#moreBtn').onclick=moreSheet;
  $('#drawerBtn').onclick=()=>document.body.classList.toggle('drawer');
  $('#prev').onclick=()=>step(-1);$('#next').onclick=()=>step(1);
  $('#themeBtn').onclick=toggleTheme;
  $('#layoutSw').onclick=e=>{const b=e.target.closest('button');if(b){S.layout=b.dataset.l;save();render()}};
  $('#inspClose').onclick=closeInsp;placeholder();
  $('#jump').onsubmit=e=>{e.preventDefault();const r=parseRef($('#jumpInp').value);if(r){go(r.book,r.ch,r.v);$('#jumpInp').blur()}else $('#jumpInp').select()};
  MQ.addEventListener('change',()=>{closeInsp();render()});
  $('#modal').onclick=e=>{
    if(e.target.id==='modal'){closeModal();return}
    const bk=e.target.closest('[data-bk]');if(bk){bookSheet(bk.dataset.bk);return}
    if(e.target.id==='back'){e.preventDefault();bookSheet();return}
    const g=e.target.closest('[data-go]');if(g){const [b,c]=g.dataset.go.split('.');closeModal();go(b,+c);scrollTo(0,0);return}
    const lay=e.target.closest('[data-lay]');if(lay){S.layout=lay.dataset.lay;save();closeModal();render();return}
    const m=e.target.closest('[data-m]');if(m){const a=m.dataset.m;if(a==='texts')textsSheet();if(a==='data')dataSheet();if(a==='theme'){toggleTheme();closeModal()}return}
    if(e.target.id==='exp'){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({hl:S.hl,notes:S.notes,wnotes:S.wnotes},null,1)],{type:'application/json'}));a.download='scriptorium-notes.json';a.click()}
  };
  $('#modal').onchange=e=>{
    const t=e.target.dataset&&e.target.dataset.t;
    if(t){const on=e.target.checked;if(on&&!S.sel.includes(t))S.sel.push(t);if(!on)S.sel=S.sel.filter(x=>x!==t);if(!S.sel.length){S.sel=[t];e.target.checked=true}save();render()}
    if(e.target.id==='imp'){const f=e.target.files[0];if(!f)return;f.text().then(x=>{const j=JSON.parse(x);Object.assign(S.hl,j.hl||{});Object.assign(S.notes,j.notes||{});Object.assign(S.wnotes,j.wnotes||{});save();render();dataSheet()})}
  };
  addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal();$('#menu').hidden=true;closeInsp();document.body.classList.remove('drawer')}
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#jumpInp').focus()}
    if(e.altKey&&e.key==='ArrowRight')step(1);if(e.altKey&&e.key==='ArrowLeft')step(-1)});
}
