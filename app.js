'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const KEY='scriptorium.v1';
let S={layout:'A',theme:'light',last:{book:'Gen',ch:1},sel:['ORIG','RST','BTI'],hl:{},notes:{}};
try{Object.assign(S,JSON.parse(localStorage.getItem(KEY)||'{}'))}catch(e){}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}};
const cache=new Map();
const J=p=>{if(!cache.has(p))cache.set(p,fetch(p).then(r=>{if(!r.ok)throw 0;return r.json()}).catch(()=>{cache.delete(p);return null}));return cache.get(p)};
let IDX,BOOKS,BI={},TRS={},OCC=null,LEX={},cur=S.last,token=0;

/* ---------- init ---------- */
(async function init(){
  IDX=await J('data/index.json');
  if(!IDX){document.body.innerHTML='<p style="padding:40px;font-family:sans-serif">Не найдены файлы данных. Запустите приложение через сервер: в папке приложения выполните <code>python3 -m http.server 8000</code> и откройте <code>http://localhost:8000</code>.</p>';return}
  BOOKS=IDX.books;BOOKS.forEach((b,i)=>BI[b.id]=i);IDX.translations.forEach(t=>TRS[t.id]=t);
  S.sel=S.sel.filter(x=>x==='ORIG'||TRS[x]);if(!S.sel.length)S.sel=['ORIG','RST'];
  const h=parseHash();if(h)cur=h;
  bind();go(cur.book,cur.ch,h&&h.v);
  J('data/occ.json').then(o=>OCC=o);
})();
function parseHash(){const m=(location.hash||'').match(/^#([0-9A-Za-z]+)\.(\d+)(?:\.(\d+))?$/);return m&&BI[m[1]]!==undefined?{book:m[1],ch:+m[2],v:m[3]?+m[3]:0}:null}
const bookRu=id=>BOOKS[BI[id]].ru, bookAb=id=>BOOKS[BI[id]].ab;
function primary(){return S.sel.find(x=>x!=='ORIG')||null}

/* ---------- navigation ---------- */
function go(book,ch,v){
  cur={book,ch};S.last=cur;save();
  try{history.replaceState(null,'','#'+book+'.'+ch+(v?'.'+v:''))}catch(e){}
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
  const orig=o?o.chapters[ch]||{}:{},lang=o?o.lang:'heb',tr={};
  await Promise.all(S.sel.filter(x=>x!=='ORIG'&&TRS[x].books.includes(book)).map(async id=>{const b=await J(`data/tr/${id}/${book}.json`);tr[id]=b?b[ch]||{}:{}}));
  const nums=new Set(Object.keys(orig).map(Number));for(const id in tr)for(const v in tr[id])nums.add(+v);
  return{orig,lang,tr,verses:[...nums].sort((a,b)=>a-b)};
}
const origHTML=(ws,lang,cls='')=>ws?`<div class="orig ${lang} ${cls}" lang="${lang==='heb'?'he':'grc'}">`+ws.map(w=>`<span class="w" data-k="${w[1]}" data-m="${esc(w[2])}">${esc(w[0])}</span>`).join(' ')+'</div>':'';
const tname=id=>id==='ORIG'?'Оригинал':TRS[id].id;
const vnHTML=(ref,v)=>`<span class="vn" data-ref="${ref}" title="Выделение и заметка">${v}${S.notes[ref]?'<span class="note-dot">✎</span>':''}</span>`;
const hlc=ref=>S.hl[ref]?' hl'+S.hl[ref]:'';

/* ---------- render ---------- */
async function render(scrollV){
  const t=++token;document.body.className=`theme-${S.theme} layout-${S.layout}`;
  $('#bookLabel').textContent=`${bookRu(cur.book)} ${cur.ch}`;
  $$('#layoutSw button').forEach(b=>b.classList.toggle('on',b.dataset.l===S.layout));
  const d=await loadChapter(cur.book,cur.ch);if(t!==token)return;
  const R=$('#reader');R.innerHTML=({A:viewA,B:viewB,D:viewD})[S.layout](d);
  if(scrollV){const el=$(`[data-v="${scrollV}"]`,R);if(el){el.scrollIntoView({block:'center'});el.classList.add('flash');setTimeout(()=>el.classList.remove('flash'),1700)}}
  const nxt=BOOKS[BI[cur.book]+((cur.ch>=BOOKS[BI[cur.book]].chapters)?1:0)];if(nxt)J(`data/orig/${nxt.id}.json`);
}
const title=()=>`<h1 class="ch-title"><small>${BOOKS[BI[cur.book]].testament==='OT'?'Ветхий Завет':'Новый Завет'}</small>${esc(bookRu(cur.book))} · ${cur.ch}</h1>`;
const missOrig=lang=>`<span class="miss">${lang==='grc'?'нет в критическом тексте SBLGNT':'—'}</span>`;
function viewA(d){
  const p=primary(),others=S.sel.filter(x=>x!=='ORIG'&&x!==p);
  return `<article class="pageA">${title()}`+d.verses.map(v=>{
    const ref=`${cur.book}.${cur.ch}.${v}`;
    const txt=p&&d.tr[p]?d.tr[p][v]:null;
    return `<div class="vrow${hlc(ref)}" data-v="${v}" data-ref="${ref}">${vnHTML(ref,v)}${txt?esc(txt):(p?'<span class="miss">—</span>':'')}`+
     (others.length?`<div class="alts">`+others.map(o=>d.tr[o]&&d.tr[o][v]?`<div><span class="tag">${o}</span>${esc(d.tr[o][v])}</div>`:'').join('')+`</div>`:'')+
     (S.sel.includes('ORIG')?`<div class="orig-line">${d.orig[v]?origHTML(d.orig[v],d.lang):missOrig(d.lang)}</div>`:'')+`</div>`}).join('')+`</article>`;
}
function viewB(d){
  const cols=S.sel,n=cols.length;
  let h=title()+`<div class="desk" style="grid-template-columns:52px repeat(${n},minmax(250px,1fr))"><div class="colhead"></div>`+
    cols.map(c=>`<div class="colhead"><span>${c==='ORIG'?(d.lang==='heb'?'Иврит · WLC':'Греческий · SBLGNT'):esc(TRS[c].name)}</span>${n>1?`<button data-rm="${c}" title="Убрать колонку">✕</button>`:''}</div>`).join('');
  for(const v of d.verses){const ref=`${cur.book}.${cur.ch}.${v}`,hc=hlc(ref);
    h+=`<div class="cell n${hc}" data-v="${v}" data-ref="${ref}">${vnHTML(ref,v)}</div>`+cols.map(c=>c==='ORIG'?
      `<div class="cell orig-c${hc}" data-ref="${ref}">${d.orig[v]?origHTML(d.orig[v],d.lang):missOrig(d.lang)}</div>`:
      `<div class="cell${hc}" data-ref="${ref}">${d.tr[c]&&d.tr[c][v]?esc(d.tr[c][v]):'<span class="miss">—</span>'}</div>`).join('')}
  return h+'</div>';
}
function viewD(d){
  const p=primary(),others=S.sel.filter(x=>x!=='ORIG'&&x!==p);
  return `<article class="ms">${title()}`+d.verses.map(v=>{
    const ref=`${cur.book}.${cur.ch}.${v}`,hc=hlc(ref);
    const mid=p?(d.tr[p]&&d.tr[p][v]?esc(d.tr[p][v]):'<span class="miss">—</span>'):(d.orig[v]?origHTML(d.orig[v],d.lang):'');
    return `<div class="row" data-v="${v}" data-ref="${ref}"><div class="lm ${d.lang==='heb'?'heb':''}">${S.sel.includes('ORIG')&&p?(d.orig[v]?origHTML(d.orig[v],d.lang):missOrig(d.lang)):''}</div>`+
      `<div class="mid${hc}">${vnHTML(ref,v)}${mid}</div>`+
      `<div class="rm">${others.map(o=>d.tr[o]&&d.tr[o][v]?`<div><b>${o}</b> ${esc(d.tr[o][v])}</div>`:'').join('')}${S.notes[ref]?`<div class="note">${esc(S.notes[ref])}</div>`:''}</div></div>`}).join('')+`</article>`;
}

/* ---------- lexicon / popovers ---------- */
async function lexOf(k){const f=k[0];if(!LEX[f])LEX[f]=(await J(f==='H'?'data/lex_H.json':'data/lex_G.json'))||{};return LEX[f][k]}
function decode(k,m){try{return k[0]==='G'||/^[A-Z]{1,2} /.test(m)?decGrc(m):decHeb(m)}catch(e){return{pos:'',detail:m}}}
let popTimer;
document.addEventListener('mouseover',async e=>{
  const w=e.target.closest&&e.target.closest('.w');if(!w)return;
  const k=w.dataset.k,m=w.dataset.m,isH=w.closest('.heb');
  const dm=decode(isH?'H':'G',m);
  const lx=k?await lexOf(k):null;if(!w.matches(':hover'))return;
  const pop=$('#pop');
  pop.innerHTML=`<div class="lm ${isH?'he':'gr'}">${esc(lx?lx.lemma:w.textContent)}</div><div class="meta">${lx?esc(lx.tr)+' · ':''}${esc(dm.pos||'')}${dm.detail?' · '+esc(dm.detail):''}</div>`+
    (lx?`<div class="gl">${esc(lx.gloss)}</div>`:'')+(k&&OCC&&OCC[k]?`<div class="cnt">${OCC[k].length} употр. в оригинале · клик — подробнее</div>`:'');
  pop.hidden=false;const r=w.getBoundingClientRect(),pw=pop.offsetWidth,ph=pop.offsetHeight;
  let x=Math.min(Math.max(8,r.left+r.width/2-pw/2),innerWidth-pw-8),y=r.bottom+8;if(y+ph>innerHeight-8)y=r.top-ph-8;
  pop.style.left=x+'px';pop.style.top=y+'px';
});
document.addEventListener('mouseout',e=>{if(e.target.closest&&e.target.closest('.w'))$('#pop').hidden=true});
async function inspect(w){
  $$('.w.pin').forEach(x=>x.classList.remove('pin'));w.classList.add('pin');
  const k=w.dataset.k,m=w.dataset.m,isH=!!w.closest('.heb');const dm=decode(isH?'H':'G',m);
  const lx=k?await lexOf(k):null;
  let h=`<div class="lm ${isH?'he':'gr'}">${esc(lx?lx.lemma:w.textContent)}</div><div class="tr">${lx?esc(lx.tr)+' · ':''}${k?esc(k):'без номера Стронга'}</div>`;
  h+=`<h4>В этом месте</h4><div><span class="badge" style="font-family:var(${isH?'--heb':'--grc'});font-size:16px">${esc(w.textContent)}</span>`;
  h+=`<span class="badge">${esc(dm.pos||'')}</span>${dm.detail?`<span class="badge">${esc(dm.detail)}</span>`:''}`;
  (dm.prefix||[]).forEach(p=>h+=`<span class="badge">приставка: ${esc(p)}</span>`);(dm.suffix||[]).forEach(p=>h+=`<span class="badge">${esc(p)}</span>`);h+='</div>';
  if(lx){h+=`<h4>Значение</h4><div style="font-weight:500;margin-bottom:6px">${esc(lx.gloss)}</div><div class="def">${lx.def.replace(/^(__)+/gm,m=>"\u2003".repeat(m.length/2))}</div>`}
  h+=`<h4>Где ещё встречается</h4><div id="occBox"><div class="hint">Загрузка…</div></div>`;
  $('#inspBody').innerHTML=h;$('#inspector').classList.remove('closed');
  if(k)occList(k,0);else $('#occBox').innerHTML='<div class="hint">Для этого слова нет номера Стронга.</div>';
}
async function occList(k,from){
  const box=$('#occBox');if(!OCC)OCC=await J('data/occ.json');const all=(OCC&&OCC[k])||[];
  const uniq=[...new Set(all)];const part=uniq.slice(from,from+30);
  if(!from)box.innerHTML=`<div class="hint">${all.length} употр. в ${uniq.length} стихах</div><div id="occRows"></div>`;
  const rows=$('#occRows');const pid=primary()||'RST';
  const items=await Promise.all(part.map(async n=>{const b=BOOKS[Math.floor(n/1e6)],c=Math.floor(n/1000)%1000,v=n%1000;
    const bd=await J(`data/tr/${pid}/${b.id}.json`);const t=bd&&bd[c]&&bd[c][v]||'';return{b,c,v,t}}));
  items.forEach(it=>{const a=document.createElement('button');a.className='occ';a.innerHTML=`<b>${esc(it.b.ab)} ${it.c}:${it.v}</b><span>${esc(it.t.slice(0,150))}</span>`;a.onclick=()=>go(it.b.id,it.c,it.v);rows.appendChild(a)});
  $('.more',box)&&$('.more',box).remove();
  if(from+30<uniq.length){const m=document.createElement('button');m.className='more';m.textContent=`Показать ещё (${uniq.length-from-30})`;m.onclick=()=>occList(k,from+30);box.appendChild(m)}
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
  const w=t.closest('.w');if(w){inspect(w);return}
  const rm=t.closest('[data-rm]');if(rm){S.sel=S.sel.filter(x=>x!==rm.dataset.rm);save();render()}
});
document.addEventListener('input',e=>{if(e.target.closest('#menu')){const ref=$('#menu').dataset.ref,v=e.target.value.trim();if(v)S.notes[ref]=v;else delete S.notes[ref];save();applyHl(ref)}});
function applyHl(ref){
  $$(`[data-ref="${ref}"]`).forEach(el=>{if(el.classList.contains('vn'))return;['hl1','hl2','hl3','hl4'].forEach(c=>el.classList.remove(c));if(S.hl[ref])el.classList.add('hl'+S.hl[ref])});
  $$(`.vn[data-ref="${ref}"]`).forEach(el=>{el.querySelector('.note-dot')?.remove();if(S.notes[ref])el.insertAdjacentHTML('beforeend','<span class="note-dot">✎</span>')});
  if(S.layout==='D')render();
}

/* ---------- modals & controls ---------- */
function openModal(html){$('#sheet').innerHTML=html;$('#modal').hidden=false}
const closeModal=()=>{$('#modal').hidden=true};
function bookSheet(sel){
  if(sel){const b=BOOKS[BI[sel]];openModal(`<h3>${esc(b.ru)}</h3><div class="hint" style="margin:-8px 0 12px"><a href="#" id="back">← все книги</a></div><div class="nums">`+Array.from({length:b.chapters},(_,i)=>`<button data-go="${b.id}.${i+1}" class="${cur.book===b.id&&cur.ch===i+1?'on':''}">${i+1}</button>`).join('')+'</div>');return}
  const g=t=>BOOKS.filter(b=>b.testament===t).map(b=>`<button data-bk="${b.id}" class="${cur.book===b.id?'on':''}">${esc(b.ru)}</button>`).join('');
  openModal(`<h3>Книги Библии</h3><h5>Ветхий Завет</h5><div class="grid">${g('OT')}</div><h5>Новый Завет</h5><div class="grid">${g('NT')}</div>`);
}
function textsSheet(){
  const row=(id,name,sub)=>`<label><input type="checkbox" data-t="${id}" ${S.sel.includes(id)?'checked':''}><span><b>${esc(name)}</b><small>${esc(sub)}</small></span></label>`;
  openModal(`<h3>Тексты</h3><div class="tlist">${row('ORIG','Оригинал','Иврит (WLC/OSHB) и греческий (SBLGNT/MorphGNT) с морфологией и словарём')}`+
    IDX.translations.map(t=>row(t.id,t.name,(t.lang==='ru'?'русский':'английский')+' · '+t.license)).join('')+`</div><div class="hint">Порядок колонок: как вы включаете. Главный перевод (в «Книге» и «Манускрипте») — первый из включённых переводов.</div>`);
}
function dataSheet(){
  const n=Object.keys(S.notes).length,h=Object.keys(S.hl).length;
  openModal(`<h3>Заметки и выделения</h3><p>Сейчас: заметок — ${n}, выделенных стихов — ${h}. Они хранятся в этом браузере.</p><div class="acts" style="display:flex;gap:8px"><button class="pill" id="exp">Сохранить в файл</button><label class="pill" style="cursor:pointer">Загрузить из файла<input id="imp" type="file" accept=".json" hidden></label></div>`);
}
function bind(){
  $('#bookBtn').onclick=()=>bookSheet();$('#textsBtn').onclick=textsSheet;$('#dataBtn').onclick=dataSheet;
  $('#prev').onclick=()=>step(-1);$('#next').onclick=()=>step(1);
  $('#themeBtn').onclick=()=>{S.theme=S.theme==='light'?'dark':'light';save();document.body.className=`theme-${S.theme} layout-${S.layout}`};
  $('#layoutSw').onclick=e=>{const b=e.target.closest('button');if(b){S.layout=b.dataset.l;save();render()}};
  $('#inspClose').onclick=()=>{$('#inspector').classList.add('closed');$$('.w.pin').forEach(x=>x.classList.remove('pin'))};
  $('#jump').onsubmit=e=>{e.preventDefault();const r=parseRef($('#jumpInp').value);if(r){go(r.book,r.ch,r.v);$('#jumpInp').blur()}else $('#jumpInp').select()};
  $('#modal').onclick=e=>{
    if(e.target.id==='modal'){closeModal();return}
    const bk=e.target.closest('[data-bk]');if(bk){bookSheet(bk.dataset.bk);return}
    if(e.target.id==='back'){e.preventDefault();bookSheet();return}
    const g=e.target.closest('[data-go]');if(g){const [b,c]=g.dataset.go.split('.');closeModal();go(b,+c);scrollTo(0,0);return}
    if(e.target.id==='exp'){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({hl:S.hl,notes:S.notes},null,1)],{type:'application/json'}));a.download='skriptorii-zametki.json';a.click()}
  };
  $('#modal').onchange=e=>{
    const t=e.target.dataset&&e.target.dataset.t;
    if(t){const on=e.target.checked;if(on&&!S.sel.includes(t))S.sel.push(t);if(!on)S.sel=S.sel.filter(x=>x!==t);if(!S.sel.length){S.sel=[t];e.target.checked=true}save();render()}
    if(e.target.id==='imp'){const f=e.target.files[0];if(!f)return;f.text().then(x=>{const j=JSON.parse(x);Object.assign(S.hl,j.hl||{});Object.assign(S.notes,j.notes||{});save();render();dataSheet()})}
  };
  addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal();$('#menu').hidden=true}
    if(e.altKey&&e.key==='ArrowRight')step(1);if(e.altKey&&e.key==='ArrowLeft')step(-1)});
}
