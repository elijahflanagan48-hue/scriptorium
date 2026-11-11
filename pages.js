'use strict';
/* Экраны разделов: Полки, Поиск, Заметки, История */
const Pages=(()=>{
  const P=()=>$('#page');
  const gdot=bid=>`<span class="gdot g-${genreOf(bid)}"></span>`;
  const refTxt=n=>{const r=Search.ref(n);return `${bookAb(r.book)} ${r.ch}:${r.v}`};
  const GC={law:'#FF6B57',hist:'#FFB020',poe:'#2BB673',pro:'#7C5CFF',gos:'#4C7DFF',epi:'#12B5C4',rev:'#E056A0'};

  /* ---------- каталог библиотеки: новые книги добавляются сюда ---------- */
  const LIB=[
    {shelf:'Писание',refs:'ссылки вида Ин 3:16',items:[
      {id:'bible',title:'Библия',cover:'Библия',color:'#4C7DFF',ready:true,sub:()=>IDX.translations.map(t=>shortName(t.id)).join(' · ')+' · иврит WLC · греч. SBLGNT'},
      {id:'lxx',title:'Септуагинта',cover:'LXX',color:'#7C5CFF',ready:true,sub:'Греческий Ветхий Завет (Ральфс), слова со Стронгом · с соответствием еврейской нумерации · после входа'},
      {id:'apocrypha',title:'Апокрифы и псевдоэпиграфы',cover:'Апокр.',color:'#E056A0',ready:true,sub:'Неканонические книги: Синодальный перевод · KJV (после входа)'}]},
    {shelf:'Иудейские авторы',refs:'ссылки вида Древн. 18.3.3',items:[
      {id:'josephus',title:'Иосиф Флавий',cover:'Флавий',color:'#FFB020',ready:true,sub:'Древности · Война · Жизнь · Против Апиона — греч. и англ.'},
      {id:'philo',title:'Филон Александрийский',cover:'Филон',color:'#12B5C4',ready:true,sub:'31 трактат — греч. (Кон–Вендланд) и англ. (Йонг)'},
      {title:'Свитки Мёртвого моря',cover:'Кумран',sub:'Избранные тексты'}]},
    {shelf:'Ранняя церковь',refs:'ссылки вида ЦИ 3.39.4',items:[
      {title:'Евсевий Кесарийский',cover:'Евсевий',sub:'Церковная история'},
      {title:'Апостольские мужи',cover:'Отцы',sub:'Климент, Игнатий, Дидахе…'}]}
  ];
  const card=it=>`<button class="lcard ${it.ready?'':'plan'}" ${it.id?`data-open="${it.id}"`:'disabled'}><div class="cv" style="${it.ready?`background:${it.color}`:''}"><b>${esc(it.cover)}</b></div><div class="bd"><span class="t">${esc(it.title)}</span><span class="s">${esc(typeof it.sub==='function'?it.sub():it.sub)}</span><span class="st ${it.ready?'ok':''}">${it.ready?'Готово':'В плане'}</span></div></button>`;
  function lib(){
    const cont=[...S.tabs.map(t=>t.book+'.'+t.ch),...(S.recent||[])].filter((x,i,a)=>a.indexOf(x)===i&&BI[x.split('.')[0]]!==undefined).slice(0,3);
    const nN=Object.keys(S.notes).length,nH=Object.keys(S.hl).length;
    P().innerHTML=`<div class="pg"><div class="pghead"><h1>Библиотека</h1></div>`+
      (cont.length?`<section><div class="shelf"><h2>Продолжить</h2></div><div class="cont">`+cont.map(r=>{const[b,c]=r.split('.');return `<button class="go g-${genreOf(b)}" data-go="${r}"><span class="ab">${esc(bookAb(b))}</span><span><b>${esc(bookRu(b))} ${c}</b><small>${esc(S.sel.map(x=>x==='ORIG'?'оригинал':shortName(x)).join(' + '))}</small></span></button>`}).join('')+`</div></section>`:'')+
      LIB.map(s=>`<section><div class="shelf"><h2>${esc(s.shelf)}</h2><span>${esc(s.refs)}</span></div><div class="lrow">${s.items.map(card).join('')}</div></section>`).join('')+
      `<section><div class="shelf"><h2>Моё</h2></div><div class="lrow">`+
      `<button class="lcard" data-gosec="notes"><div class="cv" style="background:#FFB020"><b>Заметки</b></div><div class="bd"><span class="t">Заметки и выделения</span><span class="s">Заметок: ${nN} · выделено стихов: ${nH}</span></div></button>`+
      `<button class="lcard" data-gosec="search"><div class="cv" style="background:#2BB673"><b>Подборки</b></div><div class="bd"><span class="t">Подборки</span><span class="s">${S.saved.length?'Сохранённые поиски: '+S.saved.length:'Сохраняйте поиски, например для урока'}</span></div></button></div>`+
      (S.saved.length?`<div class="saved">`+S.saved.map((x,i)=>`<span class="sv"><button data-q="${esc(x.q)}">${esc(x.q)}</button><button class="x" data-unsave="${i}" aria-label="Удалить подборку">✕</button></span>`).join('')+`</div>`:'')+`</section></div>`;
  }

  /* ---------- поиск ---------- */
  const Q={q:'',mode:'forms',tid:null,part:'all',book:null,toggled:new Set(),offS:new Set(),limit:60,notes:true,run:0};
  const tidDef=()=>Q.tid||(S.sel.find(x=>x!=='ORIG'&&TRS[x])||'RST');
  function search(q){
    Q.q=q.trim();Q.book=null;Q.toggled=new Set();Q.offS=new Set();Q.limit=60;
    if(Q.q){S.qhist=[Q.q,...S.qhist.filter(x=>x!==Q.q)].slice(0,12);save()}
    if(S.sec!=='search')showSec('search');else srch();
  }
  function srch(){
    const tid=tidDef(),modes=[['forms','Слова и формы'],['phrase','Точная фраза'],['orig','По оригиналу']];
    const others=LIB.flatMap(s=>s.items).filter(i=>!i.ready);
    P().innerHTML=`<div class="pg search"><div class="sbar"><form class="sinp" id="qForm"><svg aria-hidden="true"><use href="#i-search"/></svg><input id="qInp" value="${esc(Q.q)}" placeholder="Слово, фраза, ссылка, G26, агапе…" aria-label="Что найти" autocomplete="off" enterkeyhint="search">${Q.q?'<button type="button" id="qClr" aria-label="Очистить">✕</button>':''}</form>`+
      `<div class="seg" role="tablist" aria-label="Режим">`+modes.map(([m,n])=>`<button data-mode="${m}" class="${Q.mode===m?'on':''}">${n}</button>`).join('')+`</div></div>`+
      `<div class="sgrid"><details class="sfilt" ${isM()?'':'open'}><summary>Фильтры · ${esc(shortName(tid))}${Q.part!=='all'?' · '+(Q.part==='OT'?'ВЗ':'НЗ'):''}</summary>`+
      `<div class="fg"><div class="cap">Где искать</div><label class="ck"><input type="checkbox" checked disabled>Библия</label><label class="ck"><input type="checkbox" id="fNotes" ${Q.notes?'checked':''}>Мои заметки</label>`+`<label class="ck dim" title="${esc(others.map(i=>i.title).join(', '))}"><input type="checkbox" disabled>Другие книги<span class="soon">в плане</span></label>`+`</div>`+
      `<div class="fg"><div class="cap">Текст</div>`+IDX.translations.map(t=>`<label class="ck"><input type="radio" name="ftid" value="${t.id}" ${t.id===tid?'checked':''}>${esc(t.name)}</label>`).join('')+`</div>`+
      `<div class="fg"><div class="cap">Часть</div>`+[['all','Вся Библия'],['OT','Ветхий Завет'],['NT','Новый Завет']].map(([v,n])=>`<label class="ck"><input type="radio" name="fpart" value="${v}" ${Q.part===v?'checked':''}>${n}</label>`).join('')+`</div>`+
      `<div class="fg"><div class="cap">Подсказки</div><div class="tips">«в кавычках» — точная фраза<br>G26, H157 — по номеру Стронга<br>agape, агапе, ἀγάπη — слово оригинала<br>-слово — исключить<br>ин 3 16 — перейти к месту</div></div></details>`+
      `<section class="sres" id="sres"></section></div></div>`;
    const f=$('#qForm');f.onsubmit=e=>{e.preventDefault();const v=$('#qInp').value.trim();const r=/\d/.test(v)&&!/^[GHgh]\d/.test(v)&&parseRef(v);if(r){go(r.book,r.ch,r.v);return}search(v)};
    results();
  }
  async function results(){
    const box=$('#sres');if(!box)return;const my=++Q.run,tid=tidDef();
    if(!Q.q){box.innerHTML=`<div class="sempty">`+(S.qhist.length?`<div class="cap">Недавние поиски</div><div class="qh">`+S.qhist.map(x=>`<button data-q="${esc(x)}">${esc(x)}</button>`).join('')+`</div>`:'')+
      (S.saved.length?`<div class="cap">Подборки</div><div class="qh">`+S.saved.map(x=>`<button data-q="${esc(x.q)}">★ ${esc(x.q)}</button>`).join('')+`</div>`:'')+
      `<div class="cap">Что умеет поиск</div><ul class="can"><li>Находит слово во всех формах: «любовь» → любви, возлюбил, любить</li><li>Прощает опечатки: «любвоь» → любовь</li><li>Ищет через оригинал: те же места, где слово переведено иначе</li><li>Понимает Стронга, греческие и еврейские слова, транслит</li><li>Ссылки в любом виде: ин3 16, Иоанна 3,16, Jn 3:16</li></ul></div>`;return}
    const ref=parseRef(Q.q,true)||(/\d/.test(Q.q)&&!/^[GHgh]\d/.test(Q.q)&&parseRef(Q.q));
    box.innerHTML=`<div class="hint">${Search.isReady(tid)?'Ищу…':'Готовлю текст к поиску (один раз)…'}</div>`;
    let r;try{r=await Search.run(Q.q,{tid,mode:Q.mode,part:Q.part,book:Q.book,toggled:Q.toggled,offS:Q.offS,prog:(a,b)=>{if(my===Q.run&&a%6===0&&$('#sres'))$('#sres').innerHTML=`<div class="hint">Готовлю текст к поиску: ${a} из ${b} книг…</div>`}})}catch(e){console.error(e);box.innerHTML='<div class="hint">Не получилось выполнить поиск.</div>';return}
    if(my!==Q.run||!$('#sres'))return;
    const {ix,info,words,list,byBook,hi}=r;Q.last=r;
    let h='';
    if(ref)h+=`<button class="gotoref" data-goref="${ref.book}.${ref.ch}.${ref.v}"><span class="ab g-${genreOf(ref.book)}">${esc(bookAb(ref.book))}</span>Перейти: <b>${esc(refLabel(ref))}</b><span class="spacer"></span>↗</button>`;
    // понял как
    const chips=[];
    for(const i of info){
      if(i.translit){chips.push(`<span class="tg b">«${esc(i.term)}» → ${i.translit.map(k=>`<span class="${k[0]==='H'?'he':'gr'}">${esc(Search.lx(k).lemma)}</span>`).join(', ')}</span>`);continue}
      if(i.fixed)chips.push(`<span class="tg w">исправил «${esc(i.fixed)}» → «${esc(i.term)}»</span>`);
      const on=i.forms.filter(f=>f.on).length;chips.push(`<span class="tg b">${esc(i.term)} · ${Q.mode==='orig'&&i.strongs.length?'через оригинал':on+' '+plural(on,'форма','формы','форм')}</span>`);
    }
    if(r.P.phrases.length)chips.push(...r.P.phrases.map(p=>`<span class="tg b">точно: «${esc(p)}»</span>`));
    if(r.P.neg.length)chips.push(...r.P.neg.map(p=>`<span class="tg">без: ${esc(p)}</span>`));
    if(r.strongInfo.length)chips.push(...r.strongInfo.map(k=>`<span class="tg b">${esc(k)} · <span class="${k[0]==='H'?'he':'gr'}">${esc((Search.lx(k)||{}).lemma||'')}</span></span>`));
    if(chips.length)h+=`<div class="understood"><b>Понял как:</b>${chips.join('')}</div>`;
    // формы
    for(const i of info){if(!i.forms||i.forms.length<2||(Q.mode==='orig'&&i.strongs.length))continue;
      h+=`<details class="forms" ${isM()?'':'open'}><summary>Формы «${esc(i.term)}» — нажмите, чтобы включить или выключить</summary><div>`+i.forms.slice(0,40).map(f=>`<button data-form="${esc(f.w)}" class="${f.on?'on':''}" title="${f.n} стих.">${esc(f.w)}<small>${f.n}</small></button>`).join('')+`</div></details>`}
    if(Q.mode==='orig'){const ss=[...new Set(info.flatMap(i=>i.strongs||[]))];
      if(ss.length)h+=`<details class="forms" open><summary>Слова оригинала в поиске</summary><div>`+ss.map(k=>`<button data-strong="${k}" class="${Q.offS.has(k)?'':'on'}"><span class="${k[0]==='H'?'he':'gr'}">${esc(Search.lx(k).lemma)}</span><small>${k}</small></button>`).join('')+`</div></details>`;
      else h+=`<div class="hint">Для этого запроса не нашлось слов оригинала, ищу по тексту перевода.</div>`}
    // слова оригинала
    if(words.length){const rev=Search.revOf(ix);
      h+=`<div class="cap mt">Слова оригинала</div><div class="words">`+words.slice(0,6).map(k=>{const e=Search.lx(k),isH=k[0]==='H',n=((OCC&&OCC[k])||[]).length,tr=(rev.get(k)||[]).slice(0,3).map(x=>x[0]);
        return `<div class="wcard"><button class="wl ${isH?'he':'gr'}" data-wart="${k}">${esc(e.lemma)}</button><div class="wm"><b>${esc(e.gloss)}</b><small>${esc(e.tr)} · ${k} · ${n} ${plural(n,'место','места','мест')}${tr.length?` · ${esc(shortName(tid))}: ${esc(tr.join(', '))}`:''}</small></div><div class="wb"><button data-wart="${k}">Статья</button><button data-q="${k}">Все места</button></div></div>`}).join('')+`</div>`}
    // заметки
    if(Q.notes){const terms=[...hi].filter(x=>x.length>2);const ns=Object.entries(S.notes).filter(([,t])=>{const f=Search.flat(t);return terms.some(w=>f.includes(w))||f.includes(Search.flat(Q.q))}).slice(0,8);
      if(ns.length)h+=`<div class="cap mt">В моих заметках · ${ns.length}</div><div class="rlist">`+ns.map(([rf,t])=>{const[b,c,v]=rf.split('.');return `<button class="res" data-goref="${rf}"><span class="ref">${gdot(b)}${esc(bookAb(b))} ${c}:${v}</span><span class="txt note">${esc(t)}</span></button>`}).join('')+`</div>`}
    // итог
    h+=`<div class="rhead"><h2>${list.length} ${plural(list.length,'стих','стиха','стихов')}</h2><span class="hint">${esc(TRS[tid].name)}${Q.book!=null?' · '+esc(BOOKS[Q.book].ru):''}</span><span class="spacer"></span>`+
      (Q.book!=null?`<button class="mini" data-hb="${Q.book}">Все книги ✕</button>`:'')+`<button class="mini" data-save>${S.saved.some(x=>x.q===Q.q)?'★ В подборках':'☆ Сохранить как подборку'}</button></div>`;
    if(byBook.size>1){const rows=[...byBook.entries()].sort((a,b)=>b[1]-a[1]);const top=rows.slice(0,isM()?8:14),mx=top[0][1],rest=rows.slice(top.length).reduce((s,x)=>s+x[1],0);
      h+=`<div class="hist" aria-label="Где чаще"><div class="cap">Где чаще всего · нажмите на книгу, чтобы оставить только её</div><div class="bars2">`+top.map(([b,n])=>`<button data-hb="${b}" class="${Q.book===b?'on':''}" title="${esc(BOOKS[b].ru)}: ${n}"><span style="height:${Math.max(6,n/mx*90)}px;background:${GC[genreOf(BOOKS[b].id)]}"></span><b>${n}</b><i>${esc(BOOKS[b].ab)}</i></button>`).join('')+(rest?`<div class="restb"><span style="height:${Math.max(6,Math.min(90,rest/mx*90))}px"></span><b>${rest}</b><i>ещё</i></div>`:'')+`</div></div>`}
    if(!list.length)h+=`<div class="sempty"><p>Ничего не нашлось.</p><p class="hint">Попробуйте режим «Слова и формы», другой перевод или уберите кавычки.</p></div>`;
    h+=`<div class="rlist">`+list.slice(0,Q.limit).map(k=>{const n=ix.ids[k],rr=Search.ref(n);return `<button class="res" data-goref="${rr.book}.${rr.ch}.${rr.v}"><span class="ref">${gdot(rr.book)}${esc(bookAb(rr.book))} ${rr.ch}:${rr.v}</span><span class="txt">${Search.hl(ix.txt[k],hi)}</span></button>`}).join('')+`</div>`;
    if(list.length>Q.limit)h+=`<button class="more wide" data-more>Показать ещё (${list.length-Q.limit})</button>`;
    box.innerHTML=h;
  }
  const plural=(n,a,b,c)=>{const m=n%10,h=n%100;return m===1&&h!==11?a:(m>=2&&m<=4&&(h<12||h>14)?b:c)};

  /* ---------- заметки ---------- */
  const NF={f:'all'};
  function notes(){
    const refs=[...new Set([...Object.keys(S.notes),...Object.keys(S.hl)])].filter(r=>BI[r.split('.')[0]]!==undefined);
    const key=r=>{const[b,c,v]=r.split('.');return BI[b]*1e6+(+c)*1000+(+v)};refs.sort((a,b)=>key(a)-key(b));
    const sel=refs.filter(r=>NF.f==='all'||(NF.f==='n'?S.notes[r]:S.hl[r]===NF.f));
    const wk=Object.keys(S.wnotes||{});
    P().innerHTML=`<div class="pg"><div class="pghead"><h1>Заметки</h1><span class="spacer"></span><button class="mini" data-m2="data">Сохранить в файл / загрузить</button></div>`+
      `<div class="nfilt">`+[['all','Все'],['n','С заметками'],['1',''],['2',''],['3',''],['4','']].map(([f,n])=>`<button data-nf="${f}" class="${NF.f===f?'on':''} ${n?'':'sw'}" ${n?'':`style="--sw:var(--hl${f})" aria-label="Цвет ${f}"`}>${n}</button>`).join('')+`</div>`+
      (sel.length?`<div class="rlist" id="nlist">`+sel.map(r=>{const[b,c,v]=r.split('.');return `<button class="res" data-goref="${r}"><span class="ref">${gdot(b)}${esc(bookAb(b))} ${c}:${v}${S.hl[r]?`<span class="swd" style="background:var(--hl${S.hl[r]})"></span>`:''}</span><span class="txt"><span class="vtx" data-vt="${r}">…</span>${S.notes[r]?`<span class="note">${esc(S.notes[r])}</span>`:''}</span></button>`}).join('')+`</div>`:
        `<div class="sempty"><p>${refs.length?'Нет записей с этим фильтром.':'Пока нет заметок и выделений.'}</p><p class="hint">Нажмите на номер стиха в тексте, чтобы выделить его цветом или написать заметку.</p></div>`)+
      (wk.length?`<div class="cap mt">Заметки к словам</div><div class="rlist">`+wk.map(k=>`<button class="res" data-wart="${k}"><span class="ref">${esc(k)}</span><span class="txt"><span class="${k[0]==='H'?'he':'gr'} wlem" data-lem="${k}">${esc(k)}</span><span class="note">${esc(S.wnotes[k])}</span></span></button>`).join('')+`</div>`:'')+`</div>`;
    const pid=primary()||'RST';
    sel.slice(0,200).forEach(async r=>{const[b,c,v]=r.split('.');const d=await J(`data/tr/${pid}/${b}.json`);const el=$(`[data-vt="${r}"]`);if(el)el.textContent=(d&&d[c]&&d[c][v])||''});
    $$('[data-lem]').forEach(async el=>{const e=await lexOf(el.dataset.lem);if(e)el.textContent=e.lemma+' — '+e.gloss});
  }

  /* ---------- история ---------- */
  function hist(){
    P().innerHTML=`<div class="pg"><div class="pghead"><h1>История</h1></div>`+
      `<section><div class="shelf"><h2>Открывали</h2>${S.recent.length?'<button class="mini" data-clr="r">Очистить</button>':''}</div>`+
      (S.recent.length?`<div class="cont">`+S.recent.filter(r=>BI[r.split('.')[0]]!==undefined).map(r=>{const[b,c]=r.split('.');return `<button class="go g-${genreOf(b)}" data-go="${r}"><span class="ab">${esc(bookAb(b))}</span><span><b>${esc(bookRu(b))} ${c}</b></span></button>`}).join('')+`</div>`:'<p class="hint">Пока пусто.</p>')+`</section>`+
      `<section><div class="shelf"><h2>Искали</h2>${S.qhist.length?'<button class="mini" data-clr="q">Очистить</button>':''}</div>`+
      (S.qhist.length?`<div class="qh">`+S.qhist.map(x=>`<button data-q="${esc(x)}">${esc(x)}</button>`).join('')+`</div>`:'<p class="hint">Пока пусто.</p>')+`</section></div>`;
  }

  function render(s){({lib,search:srch,notes,hist})[s]()}

  /* ---------- клики и ввод на экранах ---------- */
  document.addEventListener('DOMContentLoaded',()=>{});
  const page=$('#page');
  page.addEventListener('click',e=>{
    const t=e.target;
    const g=t.closest('[data-go]');if(g){const[b,c]=g.dataset.go.split('.');go(b,+c);return}
    const gr=t.closest('[data-goref]');if(gr){const[b,c,v]=gr.dataset.goref.split('.');go(b,+c,+v||0);if(!+v)scrollTo(0,0);return}
    const op=t.closest('[data-open]');if(op){if(op.dataset.open==='bible')showSec('read');else Lib.open(op.dataset.open);return}
    const q=t.closest('[data-q]');if(q){Q.mode='forms';search(q.dataset.q);return}
    const us=t.closest('[data-unsave]');if(us){S.saved.splice(+us.dataset.unsave,1);save();lib();return}
    const m=t.closest('[data-mode]');if(m){Q.mode=m.dataset.mode;Q.limit=60;$$('[data-mode]').forEach(b=>b.classList.toggle('on',b===m));results();return}
    if(t.id==='qClr'){Q.q='';srch();$('#qInp').focus();return}
    const fm=t.closest('[data-form]');if(fm){const w=fm.dataset.form;Q.toggled.has(w)?Q.toggled.delete(w):Q.toggled.add(w);results();return}
    const sg=t.closest('[data-strong]');if(sg){const k=sg.dataset.strong;Q.offS.has(k)?Q.offS.delete(k):Q.offS.add(k);results();return}
    const hb=t.closest('[data-hb]');if(hb){const b=+hb.dataset.hb;Q.book=Q.book===b?null:b;Q.limit=60;results();return}
    if(t.closest('[data-more]')){Q.limit+=100;results();return}
    if(t.closest('[data-save]')){const i=S.saved.findIndex(x=>x.q===Q.q);if(i>=0)S.saved.splice(i,1);else S.saved.unshift({q:Q.q,ts:Date.now()});save();results();return}
    const wa=t.closest('[data-wart]');if(wa){const k=wa.dataset.wart;lexOf(k).then(e=>inspect([e?e.lemma:k,k,''],k[0]==='H',null,null));return}
    const nf=t.closest('[data-nf]');if(nf){NF.f=nf.dataset.nf;notes();return}
    const cl=t.closest('[data-clr]');if(cl){if(cl.dataset.clr==='r')S.recent=[];else S.qhist=[];save();hist();return}
    if(t.closest('[data-m2]')){dataSheet();return}
  });
  page.addEventListener('change',e=>{
    if(e.target.name==='ftid'){Q.tid=e.target.value;Q.toggled=new Set();results();const s=$('.sfilt summary');if(s)s.textContent='Фильтры · '+shortName(Q.tid)}
    if(e.target.name==='fpart'){Q.part=e.target.value;Q.book=null;results()}
    if(e.target.id==='fNotes'){Q.notes=e.target.checked;results()}
  });
  return{render,search};
})();
