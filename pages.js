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
      {id:'kids',title:'Детская Библия',cover:'Детям',color:'#F08A3C',ready:true,sub:'105 основных сюжетов Библии в пересказе, с гравюрами Тиссо и Шнорра · редакции меняются в Настройках'},
      {id:'lxx',title:'Септуагинта',cover:'LXX',color:'#7C5CFF',ready:true,sub:'Греческий Ветхий Завет (Ральфс), слова со Стронгом · с соответствием еврейской нумерации · после входа'},
      {id:'apocrypha',title:'Апокрифы и псевдоэпиграфы',cover:'Апокр.',color:'#E056A0',ready:true,sub:'Неканонические книги: Синодальный перевод · KJV (после входа)'}]},
    {shelf:'Иудейские авторы',refs:'ссылки вида Древн. 18.3.3',items:[
      {id:'josephus',title:'Иосиф Флавий',cover:'Флавий',color:'#FFB020',ready:true,sub:'Древности · Война · Жизнь · Против Апиона — греч., англ. и рус. (после входа)'},
      {id:'philo',title:'Филон Александрийский',cover:'Филон',color:'#12B5C4',ready:true,sub:'31 трактат — греч. (Кон–Вендланд) и англ. (Йонг)'},
      {id:'qumran',title:'Свитки Мёртвого моря',cover:'Кумран',color:'#2BB673',ready:true,sub:'~1000 свитков, иврит (Абегг, CACCHT) · после входа'}]},
    {shelf:'Ранняя церковь',refs:'ссылки вида ЦИ 3.39.4',items:[
      {id:'eusebius',title:'Евсевий Кесарийский',cover:'Евсевий',color:'#D9663B',ready:true,sub:'Церковная история, 10 книг — рус. · после входа'},
      {id:'apfathers',title:'Апостольские мужи',cover:'Отцы',color:'#8A6FD1',ready:true,sub:'Дидахе, Варнава, Климент, Игнатий, Поликарп, Ерм, Папий — рус. · после входа'}]}
  ];
  const card=it=>`<button class="lcard ${it.ready?'':'plan'}" ${it.id?`data-open="${it.id}"`:'disabled'}><div class="cv" style="${it.ready?`background:${it.color}`:''}"><b>${esc(it.cover)}</b></div><div class="bd"><span class="t">${esc(it.title)}</span><span class="s">${esc(typeof it.sub==='function'?it.sub():it.sub)}</span><span class="st ${it.ready?'ok':''}">${it.ready?'Готово':'В плане'}</span></div></button>`;
  function lib(){
    const cont=[...S.tabs.map(t=>t.book+'.'+t.ch),...(S.recent||[])].filter((x,i,a)=>a.indexOf(x)===i&&BI[x.split('.')[0]]!==undefined).slice(0,3);
    const nN=Object.keys(S.notes).length,nH=Object.keys(S.hl).length;
    P().innerHTML=`<div class="pg"><div class="pghead"><h1>Библиотека</h1></div>`+
      (cont.length?`<section><div class="shelf"><h2>Продолжить</h2></div><div class="cont">`+cont.map(r=>{const[b,c]=r.split('.');return `<button class="go g-${genreOf(b)}" data-go="${r}"><span class="ab">${esc(bookAb(b))}</span><span><b>${esc(bookRu(b))} ${c}</b><small>${esc(S.sel.map(x=>x==='ORIG'?'оригинал':shortName(x)).join(' + '))}</small></span></button>`}).join('')+`</div></section>`:'')+
      LIB.map(s=>`<section><div class="shelf"><h2>${esc(s.shelf)}</h2><span>${esc(s.refs)}</span></div><div class="lrow">${s.items.map(card).join('')}</div></section>`).join('')+
      `<section id="contread"></section>`+`<section id="mybooks"></section>`+`<section><div class="shelf"><h2>Моё</h2></div><div class="lrow">`+
      `<button class="lcard" data-gosec="notes"><div class="cv" style="background:#FFB020"><b>Заметки</b></div><div class="bd"><span class="t">Заметки и выделения</span><span class="s">Заметок: ${nN} · выделено стихов: ${nH}</span></div></button>`+
      `<button class="lcard" data-gosec="search"><div class="cv" style="background:#2BB673"><b>Подборки</b></div><div class="bd"><span class="t">Подборки</span><span class="s">${S.saved.length?'Сохранённые поиски: '+S.saved.length:'Сохраняйте поиски, например для урока'}</span></div></button></div>`+
      (S.saved.length?`<div class="saved">`+S.saved.map((x,i)=>`<span class="sv"><button data-q="${esc(x.q)}">${esc(x.q)}</button><button class="x" data-unsave="${i}" aria-label="Удалить подборку">✕</button></span>`).join('')+`</div>`:'')+`</section></div>`;
    if(typeof Rdr!=='undefined')Rdr.shelf();
    if(typeof Plans!=='undefined'){const c=Plans.contHTML(10);$('#contread').innerHTML=c?`<div class="shelf"><h2>Продолжить чтение</h2><span>где вы остановились в каждой книге</span></div>`+c:''}
  }

  /* ---------- поиск: единый, по всем материалам ---------- */
  const SC=[['all','Везде'],['bible','Библия'],['lib','Библиотека'],['notes','Заметки'],['dict','Словарь']];
  const PRESETS=[['all','Вся Библия'],['OT','Ветхий Завет'],['NT','Новый Завет'],['law','Закон'],['hist','История'],['poe','Поэзия'],['pro','Пророки'],['gos','Евангелия и Деяния'],['epi','Послания'],['rev','Откровение']];
  const GORD2=['law','hist','poe','pro','gos','epi','rev'];
  const presetSet=p=>p==='all'?null:new Set(BOOKS.map((b,i)=>[b,i]).filter(([b])=>p==='OT'||p==='NT'?b.testament===p:genreOf(b.id)===p).map(x=>x[1]));
  const LN={grc:'греч.',heb:'евр.',en:'англ.',ru:'рус.'};
  const Q={q:'',mode:'forms',scope:'all',tids:null,preset:'all',books:null,works:null,toggled:new Set(),offS:new Set(),limit:60,run:0,tb:0,lim:{},R:{},inited:false};
  const sq=()=>S.sq||(S.sq={});
  function qinit(){
    if(Q.inited)return;Q.inited=true;const s=sq();
    Q.scope=SC.some(x=>x[0]===s.scope)?s.scope:'all';Q.preset=s.preset||'all';
    Q.books=Q.preset==='pick'?(Array.isArray(s.books)&&s.books.length?new Set(s.books):new Set()):presetSet(Q.preset);
    Q.tids=(s.tids||[]).filter(t=>TRS[t]);Q.works=Array.isArray(s.works)&&s.works.length?s.works:LSearch.WORKS.map(w=>w[0]);
  }
  const persist=()=>{const s=sq();s.scope=Q.scope;s.preset=Q.preset;s.books=Q.books?[...Q.books]:[];s.tids=Q.tids||[];s.works=Q.works;save()};
  const tids=()=>{qinit();const l=(Q.tids||[]).filter(t=>TRS[t]);return l.length?l:[S.sel.find(x=>x!=='ORIG'&&TRS[x])||'RST']};
  const wantB=()=>Q.scope==='all'||Q.scope==='bible',wantL=()=>Q.scope==='all'||Q.scope==='lib',wantN=()=>Q.scope==='all'||Q.scope==='notes',wantD=()=>Q.scope==='all'||Q.scope==='dict';
  function presetLabel(){if(Q.preset==='all')return'';if(Q.preset==='pick')return Q.books&&Q.books.size?`книг: ${Q.books.size}`:'';return(PRESETS.find(x=>x[0]===Q.preset)||[])[1]||''}
  function sumLabel(){let s=SC.find(x=>x[0]===Q.scope)[1];
    if(wantB())s+=' · '+tids().map(shortName).join(' + ')+(presetLabel()?' · '+presetLabel():'');
    if(wantL()&&Q.scope==='lib')s+=` · ${Q.works.length} из ${LSearch.WORKS.length}`;return s}
  function search(q,o){
    qinit();if(o&&o.scope){Q.scope=o.scope;persist()}if(o&&o.mode)Q.mode=o.mode;Q.q=q.trim();Q.toggled=new Set();Q.offS=new Set();Q.limit=60;Q.lim={};
    if(Q.q){S.qhist=[Q.q,...S.qhist.filter(x=>x!==Q.q)].slice(0,12);save()}
    if(S.sec!=='search')showSec('search');else srch();
  }
  function filt(){
    qinit();let h='';
    if(wantB()){
      h+=`<div class="fg"><div class="cap">Перевод Библии <span class="soon">можно несколько</span></div>`+trGroups().map(([n,l])=>`<div class="tgl">${n}</div><div class="chips2">`+l.map(t=>`<label class="chk ${tids().includes(t.id)?'on':''}" title="${esc(t.name)}"><input type="checkbox" name="ptid" value="${t.id}" ${tids().includes(t.id)?'checked':''}>${esc(shortName(t.id))}</label>`).join('')+`</div>`).join('')+`</div>`;
      h+=`<div class="fg"><div class="cap">Где в Библии</div><div class="chips2">`+PRESETS.map(([v,n])=>`<button data-preset="${v}" class="${Q.preset===v?'on':''}">${n}</button>`).join('')+`<button data-preset="pick" class="${Q.preset==='pick'?'on':''}">Выбрать книги…</button></div>`;
      if(Q.preset==='pick'){
        h+=`<div class="bkpick">`+GORD2.map(g=>{const bs=BOOKS.map((b,i)=>[b,i]).filter(([b])=>genreOf(b.id)===g);return `<div class="bkg"><i>${esc(GEN[g])}</i><div>`+bs.map(([b,i])=>`<button data-bk="${i}" class="g-${g} ${Q.books&&Q.books.has(i)?'on':''}" title="${esc(b.ru)}">${esc(bookAb(b.id))}</button>`).join('')+`</div></div>`}).join('')+
          `<div class="bkb"><button class="mini" data-bkall>Очистить выбор</button></div></div>`}
      h+=`</div>`}
    if(wantL()){
      h+=`<div class="fg"><div class="cap">Библиотека</div>`+`<div class="chips2">`+LSearch.WORKS.map(([id,n])=>{const lock=(id==='lxx'||id==='qumran')&&!Lib.hasAcc();return `<label class="chk ${Q.works.includes(id)?'on':''}" ${lock?'title="Откроется после входа"':''}><input type="checkbox" name="pwork" value="${id}" ${Q.works.includes(id)?'checked':''}>${esc(n)}${lock?' 🔒':''}</label>`}).join('')+`</div>`+
        `<div class="hint sm">Ищем в текстах на том же языке, что и запрос: русское слово — в русских текстах, греческое — в греческих и т. д.</div></div>`}
    h+=`<div class="fg"><div class="cap">Подсказки</div><div class="tips">«в кавычках» — точная фраза<br>G26, H157 — по номеру Стронга<br>agape, агапе, ἀγάπη — слово оригинала<br>-слово — исключить<br>ин 3 16 — перейти к месту</div></div>`;
    return h;
  }
  const refreshFilt=()=>{const d=$('.sfilt');if(!d)return;const s=d.querySelector('summary');d.innerHTML='';d.appendChild(s);s.textContent='Фильтры · '+sumLabel();d.insertAdjacentHTML('beforeend',filt())};
  function srch(){
    qinit();const modes=[['forms','Слова и формы'],['phrase','Точная фраза'],['orig','По оригиналу']];
    P().innerHTML=`<div class="pg search"><div class="sbar"><form class="sinp" id="qForm"><svg aria-hidden="true"><use href="#i-search"/></svg><input id="qInp" value="${esc(Q.q)}" placeholder="Слово, фраза, ссылка, G26, агапе…" aria-label="Что найти" autocomplete="off" enterkeyhint="search">${Q.q?'<button type="button" id="qClr" aria-label="Очистить">✕</button>':''}</form>`+
      `<div class="seg" id="modeSeg" role="tablist" aria-label="Режим" ${wantB()?'':'hidden'}>`+modes.map(([m,n])=>`<button data-mode="${m}" class="${Q.mode===m?'on':''}">${n}</button>`).join('')+`</div></div>`+
      `<div class="scope" role="tablist" aria-label="Где искать">`+SC.map(([v,n])=>`<button data-scope="${v}" class="${Q.scope===v?'on':''}">${n}</button>`).join('')+`</div>`+
      `<div class="sgrid"><details class="sfilt" ${isM()?'':'open'}><summary>Фильтры · ${esc(sumLabel())}</summary>${filt()}</details>`+
      `<section class="sres" id="sres"></section></div></div>`;
    const f=$('#qForm');f.onsubmit=e=>{e.preventDefault();const v=$('#qInp').value.trim();const r=/\d/.test(v)&&!/^[GHgh]\d/.test(v)&&parseRef(v);if(r){go(r.book,r.ch,r.v);return}search(v)};
    results();
  }
  const bar=(h,id)=>`<div class="sg" id="${id}">${h}</div>`;
  async function results(){
    const box=$('#sres');if(!box)return;qinit();const my=++Q.run,alive=()=>my===Q.run&&!!$('#sres');
    if(!Q.q){box.innerHTML=`<div class="sempty">`+(S.qhist.length?`<div class="cap">Недавние поиски</div><div class="qh">`+S.qhist.map(x=>`<button data-q="${esc(x)}">${esc(x)}</button>`).join('')+`</div>`:'')+
      (S.saved.length?`<div class="cap">Подборки</div><div class="qh">`+S.saved.map(x=>`<button data-q="${esc(x.q)}">★ ${esc(x.q)}</button>`).join('')+`</div>`:'')+
      `<div class="cap">Что умеет поиск</div><ul class="can"><li><b>Везде</b> — Библия, библиотека, ваши заметки и словарь сразу; результаты по разделам, наверху — сколько где нашлось</li><li>Можно искать только в Библии, в отдельных книгах или группах книг (Закон, Пророки, Послания…), в нескольких переводах сразу</li><li>Слово находится во всех формах: «любовь» → любви, возлюбил, любить; опечатки прощаются</li><li>Через оригинал: те же места, где слово переведено иначе; G26, ἀγάπη, агапе</li><li>Библиотека: Септуагинта, апокрифы, Иосиф Флавий, Филон, Кумран — по их языку</li><li>«Точная фраза» в кавычках, исключение — знак минус: любовь -бог</li></ul></div>`;return}
    const P0=Search.parseQ(Q.q);
    if(Q.mode==='phrase'&&!P0.phrases.length&&P0.terms.length){P0.phrases.push(Q.q.replace(/["«»“”]/g,'').replace(/(^|\s)-\S+/g,' ').trim());P0.terms=[]}
    const ref=!/^[GHgh]\d+\s*$/.test(Q.q)&&(parseRef(Q.q,true)||(/\d/.test(Q.q)&&!/^[GHgh]\d/.test(Q.q)&&parseRef(Q.q)));
    if(P0.empty){
      box.innerHTML=(ref?`<button class="gotoref" data-goref="${ref.book}.${ref.ch}.${ref.v}"><span class="ab g-${genreOf(ref.book)}">${esc(bookAb(ref.book))}</span>Перейти: <b>${esc(refLabel(ref))}</b><span class="spacer"></span>↗</button>`:'')+
        `<div class="sempty"><p>${P0.bad.length?`«${esc(P0.bad[0])}» — такого номера Стронга нет. Номера: G1–G5624 (греч.), H1–H8674 (евр.).`:P0.neg.length?'Знак минус только исключает слово. Добавьте, что искать, например: любовь -бог':ref?'':'Не понял запрос — введите слово, фразу или номер Стронга.'}</p></div>`;
      return}
    const C={b:null,n:null,d:null,f:null,l:{}};Q.R={};const X=Q.X={q:Q.q,bible:null,fn:[],notes:null,dict:[],lib:{}};
    box.innerHTML=(ref?`<button class="gotoref" data-goref="${ref.book}.${ref.ch}.${ref.v}"><span class="ab g-${genreOf(ref.book)}">${esc(bookAb(ref.book))}</span>Перейти: <b>${esc(refLabel(ref))}</b><span class="spacer"></span>↗</button>`:'')+
      `<div class="sum" id="sum"></div><div id="gB"></div><div id="gF"></div><div id="gN"></div><div id="gD"></div><div id="gL"></div><div id="gE"></div>`;
    const cnt=n=>n>=400?'400+':n;
    function sum(){
      const ch=[];
      if(wantB())ch.push(['gB','Библия',C.b]);
      if(wantN())ch.push(['gN','Заметки',C.n]);
      if(wantB()&&TRS.BTI)ch.push(['gF','Сноски Кулакова',C.f]);
      if(wantD())ch.push(['gD','Словарь',C.d]);
      if(wantL())for(const id of Q.works){const nm=(LSearch.WORKS.find(x=>x[0]===id)||[])[1]||id;ch.push(['gw-'+id,nm,C.l[id]])}
      const show=ch.filter(([,,n])=>Q.scope!=='all'||n===null||n===undefined||n>0);
      const lk=Q.scope==='all'?ch.filter(([,,n])=>n<0).map(x=>x[1]):[];
      const el=$('#sum');if(!el)return;
      el.innerHTML=`<span class="cap">Нашлось</span>`+show.map(([id,n,v])=>`<button data-jump="${id}" class="${v===0||v<0?'zero':''}" ${v<0?'title="Нужен вход в личный кабинет"':''}>${esc(n)}<b>${v===null||v===undefined?'…':v<0?'🔒':cnt(v)}</b></button>`).join('')+
        (lk.length?`<span class="hint lk" title="Откроются после входа в личный кабинет">🔒 ${esc(lk.join(', '))}</span>`:'')+`<span class="spacer"></span><button class="mini" data-exp title="Скачать или скопировать все найденные места">⇩ Экспорт</button><button class="mini" data-save>${S.saved.some(x=>x.q===Q.q)?'★ В подборках':'☆ Сохранить как подборку'}</button>`;
      const all=[C.b,C.n,C.d,C.f,...Object.values(C.l)];
      const ge=$('#gE');if(ge)ge.innerHTML=(Q.scope==='all'&&all.every(v=>v===0||v<0)&&Object.keys(C.l).length===Q.works.length&&C.b===0)?`<div class="sempty"><p>Нигде ничего не нашлось.</p><p class="hint">Попробуйте другое слово, уберите кавычки или минус, или переключите режим на «Слова и формы».</p></div>`:'';
    }
    sum();
    let bible=null; // единый запуск поиска по Библии: нужен и для словаря
    const runBible=async(render)=>{
      const T=wantB()?tids().slice():[tids()[0]],my2=++Q.tb,alive2=()=>my2===Q.tb&&alive(),runs=[];
      const ql=({en:'en',ru:'ru'})[LSearch.scriptOf(Q.q)];Q.auto=null;
      if(Q.scope==='all'&&ql&&!T.some(t=>TRS[t].lang===ql)){const a=IDX.translations.find(t=>t.lang===ql&&!isPriv(t.id));if(a){T.push(a.id);Q.auto=a.id}}
      const gb=$('#gB');
      for(const tid of T){
        if(render&&gb)gb.innerHTML=`<div class="hint">${Search.isReady(tid)?'Ищу в Библии…':'Готовлю текст к поиску (один раз)…'}</div>`;
        try{runs.push(await Search.run(Q.q,{tid,mode:Q.mode,books:wantB()?Q.books:null,toggled:Q.toggled,offS:Q.offS,prog:(a,b)=>{if(alive2()&&render&&a%6===0&&$('#gB'))$('#gB').innerHTML=`<div class="hint">Готовлю текст «${esc(shortName(tid))}» к поиску: ${a} из ${b} книг…</div>`}}))}
        catch(e){console.error(e);if(render&&gb)gb.innerHTML='<div class="hint">Не получилось выполнить поиск по Библии.</div>';return null}
        if(!alive2())return null}
      return runs;
    };
    let bibleProm=null;const getBible=()=>bibleProm||(bibleProm=runBible(wantB()));
    const bibleGroup=async()=>{
      const runs=await getBible();if(!runs||!alive())return;bible=runs;const gb=$('#gB');if(!gb)return;
      const r0=runs[0],{ix,info}=r0;
      const merged=new Map();
      for(const r of runs)for(const k of r.list){const n=r.ix.ids[k];let a=merged.get(n);if(!a)merged.set(n,a=[]);a.push({tid:r.ix.tid,r,k})}
      const order=[...merged.keys()].sort((a,b)=>a-b);C.b=order.length;X.bible={order,merged};sum();
      const draw=()=>{
        let h='';
        const chips=[];
        for(const i of info){
          if(i.translit){chips.push(`<span class="tg b">«${esc(i.term)}» → ${i.translit.map(k=>`<span class="${k[0]==='H'?'he':'gr'}">${esc(Search.lx(k).lemma)}</span>`).join(', ')}</span>`);continue}
          if(i.fixed)chips.push(`<span class="tg w">исправил «${esc(i.fixed)}» → «${esc(i.term)}»</span>`);
          const on=i.forms.filter(f=>f.on).length;chips.push(`<span class="tg b">${esc(i.term)} · ${Q.mode==='orig'&&i.strongs.length?'через оригинал':on+' '+plural(on,'форма','формы','форм')}</span>`)}
        if(r0.P.phrases.length)chips.push(...r0.P.phrases.map(p=>`<span class="tg b">точно: «${esc(p)}»</span>`));
        if(r0.P.neg.length)chips.push(...r0.P.neg.map(p=>`<span class="tg">без: ${esc(p)}</span>`));
        if(r0.strongInfo.length)chips.push(...r0.strongInfo.map(k=>`<span class="tg b">${esc(k)} · <span class="${k[0]==='H'?'he':'gr'}">${esc((Search.lx(k)||{}).lemma||'')}</span></span>`));
        if(chips.length)h+=`<div class="understood"><b>Понял как:</b>${chips.join('')}</div>`;
        for(const i of info){if(!i.forms||i.forms.length<2||(Q.mode==='orig'&&i.strongs.length))continue;
          h+=`<details class="forms" ${isM()?'':'open'}><summary>Формы «${esc(i.term)}» — нажмите, чтобы включить или выключить</summary><div>`+i.forms.slice(0,40).map(f=>`<button data-form="${esc(f.w)}" class="${f.on?'on':''}" title="${f.n} стих.">${esc(f.w)}<small>${f.n}</small></button>`).join('')+`</div></details>`}
        if(Q.mode==='orig'){const ss=[...new Set(info.flatMap(i=>i.strongs||[]))];
          if(ss.length)h+=`<details class="forms" open><summary>Слова оригинала в поиске</summary><div>`+ss.map(k=>`<button data-strong="${k}" class="${Q.offS.has(k)?'':'on'}"><span class="${k[0]==='H'?'he':'gr'}">${esc(Search.lx(k).lemma)}</span><small>${k}</small></button>`).join('')+`</div></details>`;
          else h+=`<div class="hint">Для этого запроса не нашлось слов оригинала, ищу по тексту перевода.</div>`}
        h+=`<div class="rhead"><h2>Библия · ${order.length} ${plural(order.length,'стих','стиха','стихов')}</h2><span class="hint">${esc(runs.map(r=>TRS[r.ix.tid].name).join(' · '))}${Q.auto?` (${esc(shortName(Q.auto))} добавлен по языку запроса)`:''}${Q.books&&Q.books.size?' · '+esc(presetLabel()):''}</span><span class="spacer"></span>`+
          (Q.books&&Q.books.size?`<button class="mini" data-hb="all">Все книги ✕</button>`:'')+`</div>`;
        const byBook=r0.byBook;
        if(byBook.size>1){const rows=[...byBook.entries()].sort((a,b)=>b[1]-a[1]);const top=rows.slice(0,isM()?8:14),mx=top[0][1];
          h+=`<div class="hist" aria-label="Где чаще"><div class="cap">Где чаще всего · нажмите на книгу, чтобы оставить только её</div><div class="bars2">`+top.map(([b,n])=>`<button data-hb="${b}" class="${Q.books&&Q.books.size===1&&Q.books.has(b)?'on':''}" title="${esc(BOOKS[b].ru)}: ${n}"><span style="height:${Math.max(6,n/mx*90)}px;background:${GC[genreOf(BOOKS[b].id)]}"></span><b>${n}</b><i>${esc(bookAb(BOOKS[b].id))}</i></button>`).join('')+`</div></div>`}
        if(Q.scope==='all'&&!order.length&&runs.length){const nd=({en:'en',ru:'ru'})[LSearch.scriptOf(Q.q)],al=nd&&!runs.some(r=>TRS[r.ix.tid].lang===nd)&&IDX.translations.find(t=>t.lang===nd);
          gb.innerHTML=`<div class="hint nb">В Библии (${esc(runs.map(r=>shortName(r.ix.tid)).join(' + '))}${Q.books&&Q.books.size?', '+esc(presetLabel()):''}) ничего не нашлось.${al?` <button class="mini" data-addtid="${al.id}">Искать ещё и в «${esc(al.name)}»</button>`:''}</div>`;return}
        const need=({en:'en',ru:'ru'})[LSearch.scriptOf(Q.q)],hasL=need&&runs.some(r=>TRS[r.ix.tid].lang===need),alt=need&&!hasL&&IDX.translations.find(t=>t.lang===need);
        if(!order.length&&alt)h+=`<div class="sempty"><p>Выбран перевод на другом языке, чем запрос.</p><button class="mini" data-addtid="${alt.id}">Искать ещё и в «${esc(alt.name)}»</button></div>`;
        else if(!order.length)h+=`<div class="sempty"><p>В Библии ничего не нашлось.</p><p class="hint">Попробуйте режим «Слова и формы», другой перевод или уберите кавычки${Q.books&&Q.books.size?', или снимите ограничение по книгам':''}.</p></div>`;
        const multi=runs.length>1;
        h+=`<div class="rlist">`+order.slice(0,Q.limit).map(n=>{const rr=Search.ref(n);
          return `<button class="res" data-goref="${rr.book}.${rr.ch}.${rr.v}"><span class="ref">${gdot(rr.book)}${esc(bookAb(rr.book))} ${rr.ch}:${rr.v}</span><span class="txt">`+
            merged.get(n).map(x=>`<span class="rl">${multi?`<b class="tl">${esc(shortName(x.tid))}</b>`:''}${Search.hl(x.r.ix.txt[x.k],x.r.hi)}</span>`).join('')+`</span></button>`}).join('')+`</div>`;
        if(order.length>Q.limit)h+=`<button class="more wide" data-more>Показать ещё (${order.length-Q.limit})</button>`;
        gb.innerHTML=bar(h,'gw-B');
      };
      draw();Q.R.B=draw;
    };
    const notesGroup=()=>{
      const r=LSearch.searchNotes(Q.q,P0),n=r.verse.length+r.word.length;C.n=n;X.notes=r;sum();const g=$('#gN');if(!g)return;
      if(!n){g.innerHTML=Q.scope==='notes'?`<div class="sempty"><p>В ваших заметках ничего не нашлось.</p></div>`:'';return}
      g.innerHTML=`<div class="rhead"><h2>Заметки · ${n}</h2></div><div class="rlist">`+
        r.verse.map(({ref:rf,t,m})=>{const[b,c,v]=rf.split('.');return `<button class="res" data-goref="${rf}"><span class="ref">${gdot(b)}${esc(bookAb(b))} ${c}:${v}</span><span class="txt note">${LSearch.hl(t,m,esc)}</span></button>`}).join('')+
        r.word.map(({k,t,m})=>`<button class="res" data-wart="${k}"><span class="ref">${esc(k)}</span><span class="txt"><span class="${k[0]==='H'?'he':'gr'} wlem" data-lem="${k}">${esc(k)}</span><span class="note">${LSearch.hl(t,m,esc)}</span></span></button>`).join('')+`</div>`;
      $$('[data-lem]',g).forEach(async el=>{const e=await lexOf(el.dataset.lem);if(e)el.textContent=e.lemma+' — '+e.gloss});
    };
    const dictGroup=async()=>{
      const g=$('#gD');if(g)g.innerHTML=`<div class="hint">Ищу в словаре…</div>`;
      let via=[];
      if(!bible&&/[а-яё]/i.test(Q.q)){const rs=await getBible();if(!alive())return;bible=rs}
      if(bible)via=bible[0].words||[];
      let items;try{items=await LSearch.searchDict(Q.q,P0,via)}catch(e){console.error(e);items=[]}
      if(!alive())return;const g2=$('#gD');if(!g2)return;
      C.d=items.length;X.dict=items;sum();
      if(!items.length){g2.innerHTML=Q.scope==='dict'?`<div class="sempty"><p>В словаре ничего не нашлось.</p><p class="hint">Словарь Стронга англоязычный: русское слово ищется через переводы Библии, а английское, греческое, еврейское или номер (G26) — прямо по статьям.</p></div>`:'';return}
      const ix=bible&&bible[0].ix,rev=ix?Search.revOf(ix):null,tid=ix&&ix.tid;
      const draw=()=>{const lim=Q.lim.D||12;
        g2.innerHTML=bar(`<div class="rhead"><h2>Словарь · ${items.length}</h2><span class="hint">слова оригинала и статьи</span></div><div class="words">`+items.slice(0,lim).map(({k})=>{
          const e=Search.lx(k),isH=k[0]==='H',n=((OCC&&OCC[k])||[]).length,tr=rev?(rev.get(k)||[]).slice(0,3).map(x=>x[0]):[];
          return `<div class="wcard"><button class="wl ${isH?'he':'gr'}" data-wart="${k}">${esc(e.lemma)}</button><div class="wm"><b>${esc(e.gloss)}</b><small>${esc(e.tr)} · ${k}${n?` · ${n} ${plural(n,'место','места','мест')}`:''}${tr.length?` · ${esc(shortName(tid))}: ${esc(tr.join(', '))}`:''}</small></div><div class="wb"><button data-wart="${k}">Статья</button><button data-q="${k}">Все места</button></div></div>`}).join('')+`</div>`+
          (items.length>lim?`<button class="more wide" data-dmore>Показать ещё (${items.length-lim})</button>`:''),'gw-D')};
      draw();Q.R.D=draw;
    };
    const libGroup=async()=>{
      const g=$('#gL');if(!g)return;
      g.innerHTML=Q.works.map(id=>`<div id="gw-${id}"></div>`).join('');
      const prog={};
      const one=async id=>{
        const nm=(LSearch.WORKS.find(x=>x[0]===id)||[])[1]||id,box=()=>$('#gw-'+id);
        if(box())box().innerHTML=`<div class="hint">Библиотека · ${esc(nm)}: ищу…</div>`;
        let res;try{res=await LSearch.searchWork(id,Q.q,P0,{alive,prog:(w,a,b)=>{if(alive()&&box()&&a%3===0)box().innerHTML=`<div class="hint">Библиотека · ${esc(nm)}: загружаю и ищу, ${a} из ${b}…</div>`}})}catch(e){console.error(e);res={id,items:[],total:0,err:true,title:nm}}
        if(!res||!alive()||!box())return;
        C.l[id]=res.locked&&!res.total?-1:res.total;X.lib[id]=res;sum();
        const draw=()=>{
          if(res.locked&&!res.items.length){box().innerHTML=Q.scope==='lib'||Q.works.length<3?`<div class="rhead"><h2>${esc(nm)}</h2></div><div class="lnote warm">Этот текст открывается после входа в личный кабинет с доступом. <button class="mini" data-lacct2>Войти</button></div>`:'';return}
          if(res.noLang){box().innerHTML=Q.scope==='lib'?`<div class="rhead"><h2>${esc(nm)}</h2></div><div class="hint">Нет текста на языке запроса. Здесь ищите по-${esc(res.langs)}.</div>`:'';return}
          if(!res.total){box().innerHTML=Q.scope==='lib'?`<div class="rhead"><h2>${esc(nm)} · 0</h2></div><div class="hint">Ничего не нашлось${res.locked?' (часть текстов закрыта: нужен вход)':''}.</div>`:'';return}
          const lim=Q.lim[id]||30,pt=res.pt||{};
          box().innerHTML=bar(`<div class="rhead"><h2>${esc(nm)} · ${cnt(res.total)}</h2><span class="hint">${esc(res.texts.join(', '))}</span></div><div class="rlist">`+res.items.slice(0,lim).map(it=>{
            const lg=it.lang==='grc'?' lang="grc"':it.lang==='heb'?' lang="he" dir="rtl"':'';
            return `<button class="res lib" data-lopen="${esc(id)}|${esc(it.pid)}|${esc(it.c)}|${esc(it.k)}"><span class="ref">${esc(pt[it.pid]||it.pid)} ${esc(Lib.disp({id},it.c,it.k))}<small>${LN[it.lang]||''}</small></span><span class="txt ${it.lang}"${lg}>${LSearch.hl(it.v,it.m,esc)}</span></button>`}).join('')+`</div>`+
            (res.items.length>lim?`<button class="more wide" data-lm="${esc(id)}">Показать ещё (${res.items.length-lim})</button>`:'')+(res.total>res.items.length?`<div class="hint">Показаны первые ${res.items.length}. Уточните запрос, чтобы сузить результаты.</div>`:''),'gw-'+id)};
        draw();Q.R['L'+id]=draw;
      };
      for(const id of Q.works)one(id);
    };
    const fnGroup=async()=>{
      const g=()=>$('#gF');if(g())g().innerHTML=`<div class="hint">Ищу в сносках Кулакова…</div>`;
      const m=LSearch.matcher(P0,'ru');if(m.empty){if(g())g().innerHTML='';C.f=0;sum();return}
      const bks=BOOKS.map((b,i)=>[b,i]).filter(([,i])=>!(Q.books&&Q.books.size)||Q.books.has(i));
      const all=await Promise.all(bks.map(([b])=>J(`data/nt/BTI/${b.id}.json`)));if(!alive()||!g())return;
      const out=[];bks.forEach(([b],j)=>{const d=all[j];if(!d)return;
        for(const cv of Object.keys(d).sort((x,y)=>{const[a1,a2]=x.split(':').map(Number),[b1,b2]=y.split(':').map(Number);return a1-b1||a2-b2}))
          for(const f of d[cv])if(m.test(LSearch.norm(f[2]),''))out.push({b:b.id,cv,l:f[1],t:f[2]})});
      C.f=out.length;X.fn=out;sum();
      const draw=()=>{const lim=Q.lim.F||20;
        g().innerHTML=!out.length?(Q.scope!=='all'?`<div class="hint nb">В сносках Кулакова ничего не нашлось.</div>`:''):bar(`<div class="rhead"><h2>Сноски Кулакова · ${out.length}</h2></div><div class="rlist">`+out.slice(0,lim).map(x=>{const[c,v]=x.cv.split(':');
          return `<button class="res" data-goref="${x.b}.${c}.${v}"><span class="ref">${gdot(x.b)}${esc(bookAb(x.b))} ${c}:${v}<sup class="fn">${esc(x.l||'•')}</sup></span><span class="txt note">${LSearch.hl(x.t,m,esc)}</span></button>`}).join('')+`</div>`+
          (out.length>lim?`<button class="more wide" data-fmore>Показать ещё (${out.length-lim})</button>`:''),'gw-F')};
      draw();Q.R.F=draw;
    };
    const jobs=[];
    if(wantB())jobs.push(bibleGroup());
    if(wantB()&&TRS.BTI&&Sync.user&&Sync.user.access)jobs.push(fnGroup());
    if(wantN())notesGroup();
    if(wantD())jobs.push(dictGroup());
    if(wantL())jobs.push(libGroup());
    Q.rerunB=()=>{if(!wantB())return;bibleProm=null;return bibleGroup()};
    await Promise.all(jobs);
  }
  const toast=msg=>{let t=$('#toast');if(!t){t=document.createElement('div');t.id='toast';t.className='toast';document.body.appendChild(t)}t.textContent=msg;t.classList.add('on');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('on'),1800)};
  /* ---------- экспорт результатов ---------- */
  function expText(){
    const X=Q.X;if(!X)return'';const L=[];const plain=v=>Array.isArray(v)?v.map(x=>x[0]).join(' '):String(v);
    L.push(`Поиск: ${X.q}`,`Скрипторий · ${new Date().toLocaleDateString('ru-RU')}`,'');
    if(X.bible&&X.bible.order.length){L.push(`## Библия — ${X.bible.order.length} ${plural(X.bible.order.length,'стих','стиха','стихов')}`,'');
      for(const n of X.bible.order){const r=Search.ref(n),hs=X.bible.merged.get(n);
        hs.forEach((x,i)=>L.push(`${i?'   ':bookAb(r.book)+' '+r.ch+':'+r.v} ${hs.length>1?'('+shortName(x.tid)+') ':''}${x.r.ix.txt[x.k]}`))}
      L.push('')}
    if(X.fn.length){L.push(`## Сноски Кулакова — ${X.fn.length}`,'');for(const x of X.fn){const[c,v]=x.cv.split(':');L.push(`${bookAb(x.b)} ${c}:${v} [${x.l||'•'}] ${x.t}`)}L.push('')}
    if(X.notes&&(X.notes.verse.length+X.notes.word.length)){L.push('## Мои заметки','');for(const x of X.notes.verse){const[b,c,v]=x.ref.split('.');L.push(`${bookAb(b)} ${c}:${v} — ${x.t}`)}for(const x of X.notes.word)L.push(`${x.k} — ${x.t}`);L.push('')}
    if(X.dict.length){L.push(`## Словарь — ${X.dict.length}`,'');for(const {k}of X.dict){const e=Search.lx(k);if(e)L.push(`${e.lemma} (${e.tr}, ${k}) — ${e.gloss}`)}L.push('')}
    for(const id in X.lib){const r=X.lib[id];if(!r||!r.items||!r.items.length)continue;
      L.push(`## ${r.title} — ${r.total}${r.total>r.items.length?' (первые '+r.items.length+')':''}`,'');
      for(const it of r.items)L.push(`${(r.pt||{})[it.pid]||it.pid} ${Lib.disp({id},it.c,it.k)} — ${plain(it.v)}`);L.push('')}
    return L.join('\n');
  }
  function expMenu(btn){
    let m=$('#expm');if(m){m.remove();return}
    btn.insertAdjacentHTML('afterend',`<div id="expm" class="expm"><button data-expdo="md">Скачать файл (.md)</button><button data-expdo="txt">Скачать текст (.txt)</button><button data-expdo="copy">Скопировать</button></div>`);
  }
  async function doExport(kind){
    const t=expText(),m=$('#expm');if(m)m.remove();if(!t)return;
    if(kind==='copy'){try{await navigator.clipboard.writeText(t);toast('Скопировано')}catch(e){toast('Не удалось скопировать')}return}
    const blob=new Blob([kind==='md'?t.replace(/^(Поиск: .*)$/m,'# $1'):t.replace(/^## /gm,'')],{type:'text/plain;charset=utf-8'}),a=document.createElement('a');
    a.href=URL.createObjectURL(blob);a.download=('Поиск — '+Q.q).replace(/[\\/:*?"<>|]/g,' ').slice(0,60)+(kind==='md'?'.md':'.txt');document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);
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
    const op=t.closest('[data-open]');if(op){if(op.dataset.open==='bible')showSec('read');else if(op.dataset.open==='kids')Kids.open();else Lib.open(op.dataset.open);return}
    const q=t.closest('[data-q]');if(q){Q.mode='forms';search(q.dataset.q);return}
    const us=t.closest('[data-unsave]');if(us){S.saved.splice(+us.dataset.unsave,1);save();lib();return}
    const m=t.closest('[data-mode]');if(m){Q.mode=m.dataset.mode;Q.limit=60;$$('[data-mode]').forEach(b=>b.classList.toggle('on',b===m));results();return}
    if(t.id==='qClr'){Q.q='';srch();$('#qInp').focus();return}
    const sc=t.closest('[data-scope]');if(sc){Q.scope=sc.dataset.scope;persist();srch();return}
    const pr=t.closest('[data-preset]');if(pr){const v=pr.dataset.preset;Q.preset=v;Q.books=v==='pick'?(Q.books&&Q.preset==='pick'?Q.books:new Set()):presetSet(v);if(v==='pick'&&!Q.books)Q.books=new Set();Q.limit=60;persist();refreshFilt();results();return}
    const bk=t.closest('[data-bk]');if(bk){const i=+bk.dataset.bk;Q.books=Q.books||new Set();Q.books.has(i)?Q.books.delete(i):Q.books.add(i);Q.preset='pick';Q.limit=60;persist();bk.classList.toggle('on');const s=$('.sfilt summary');if(s)s.textContent='Фильтры · '+sumLabel();clearTimeout(Q.bt);Q.bt=setTimeout(()=>Q.rerunB&&Q.rerunB(),350);return}
    if(t.closest('[data-bkall]')){Q.books=new Set();persist();refreshFilt();Q.rerunB&&Q.rerunB();return}
    const fm=t.closest('[data-form]');if(fm){const w=fm.dataset.form;Q.toggled.has(w)?Q.toggled.delete(w):Q.toggled.add(w);Q.rerunB&&Q.rerunB();return}
    const sg=t.closest('[data-strong]');if(sg){const k=sg.dataset.strong;Q.offS.has(k)?Q.offS.delete(k):Q.offS.add(k);Q.rerunB&&Q.rerunB();return}
    const hb=t.closest('[data-hb]');if(hb){const v=hb.dataset.hb;if(v==='all'){Q.preset='all';Q.books=null}else{const b=+v;if(Q.books&&Q.books.size===1&&Q.books.has(b)){Q.preset='all';Q.books=null}else{Q.preset='pick';Q.books=new Set([b])}}Q.limit=60;refreshFilt();Q.rerunB&&Q.rerunB();return}
    if(t.closest('[data-more]')){Q.limit+=100;Q.R.B&&Q.R.B();return}
    if(t.closest('[data-fmore]')){Q.lim.F=(Q.lim.F||20)+60;Q.R.F&&Q.R.F();return}
    if(t.closest('[data-exp]')){expMenu(t.closest('[data-exp]'));return}
    const ex=t.closest('[data-expdo]');if(ex){doExport(ex.dataset.expdo);return}
    if(t.closest('[data-dmore]')){Q.lim.D=(Q.lim.D||12)+24;Q.R.D&&Q.R.D();return}
    const lm=t.closest('[data-lm]');if(lm){const id=lm.dataset.lm;Q.lim[id]=(Q.lim[id]||30)+60;Q.R['L'+id]&&Q.R['L'+id]();return}
    const lo=t.closest('[data-lopen]');if(lo){const[w,pid,c,k]=lo.dataset.lopen.split('|');Lib.open(w,pid,c,{k,c});return}
    if(t.closest('[data-lacct2]')){moreSheet();return}
    const at=t.closest('[data-addtid]');if(at){Q.tids=[...new Set([...tids(),at.dataset.addtid])];persist();refreshFilt();Q.rerunB&&Q.rerunB();return}
    const jp=t.closest('[data-jump]');if(jp){const el=document.getElementById(jp.dataset.jump)||document.getElementById('gw-'+jp.dataset.jump);if(el)el.scrollIntoView({behavior:'smooth',block:'start'});return}
    const sv=t.closest('[data-save]');if(sv){const i=S.saved.findIndex(x=>x.q===Q.q);if(i>=0)S.saved.splice(i,1);else S.saved.unshift({q:Q.q,ts:Date.now()});save();sv.textContent=S.saved.some(x=>x.q===Q.q)?'★ В подборках':'☆ Сохранить как подборку';return}
    const wa=t.closest('[data-wart]');if(wa){const k=wa.dataset.wart;lexOf(k).then(e=>inspect([e?e.lemma:k,k,''],k[0]==='H',null,null));return}
    const nf=t.closest('[data-nf]');if(nf){NF.f=nf.dataset.nf;notes();return}
    const cl=t.closest('[data-clr]');if(cl){if(cl.dataset.clr==='r')S.recent=[];else S.qhist=[];save();hist();return}
    if(t.closest('[data-m2]')){dataSheet();return}
  });
  page.addEventListener('change',e=>{
    const n=e.target.name;
    if(n==='ptid'||n==='pwork')e.target.closest('label').classList.toggle('on',e.target.checked);
    if(n==='ptid'){const v=[...$$('[name=ptid]:checked')].map(x=>x.value);if(!v.length){e.target.checked=true;return}Q.tids=v;Q.toggled=new Set();persist();const s=$('.sfilt summary');if(s)s.textContent='Фильтры · '+sumLabel();Q.rerunB&&Q.rerunB()}
    if(n==='pwork'){Q.works=[...$$('[name=pwork]:checked')].map(x=>x.value);if(!Q.works.length){Q.works=[e.target.value];e.target.checked=true}persist();const s=$('.sfilt summary');if(s)s.textContent='Фильтры · '+sumLabel();results()}
  });
  return{render,search};
})();
