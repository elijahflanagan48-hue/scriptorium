'use strict';
/* Режим «Чтение»: один перевод, спокойная типографика, слово → карточка оригинала.
   Плюс: настройки текста, чтение вслух, отметки «прочитано», скрытие панелей при чтении. */

/* ---------- настройки текста ---------- */
const RD_DEF={fs:20,lh:1.75,font:'serif',flow:'auto',vn:true,width:'normal'};
const rd=()=>Object.assign({},RD_DEF,S.rd||{});
function applyRd(){
  const r=rd(),st=document.documentElement.style;
  st.setProperty('--rfs',r.fs+'px');st.setProperty('--rlh',r.lh);
  st.setProperty('--rfont',r.font==='sans'?'var(--ui)':'var(--serif)');
  st.setProperty('--rw',r.width==='wide'?'860px':r.width==='narrow'?'580px':'700px');
  document.body.classList.toggle('rd-novn',!r.vn);
}
function setRd(k,v){S.rd=Object.assign(rd(),{[k]:v});touchSettings();applyRd();if(k==='flow'||k==='vn')render();readSheet(true)}

/* ---------- вид ---------- */
function viewR(d){
  const p=primary(),r=rd(),poetry=genreOf(cur.book)==='poe';
  const perVerse=r.flow==='verse'||(r.flow==='auto'&&poetry);
  const b=BOOKS[BI[cur.book]];
  let h=`<article class="rdg ${perVerse?'perv':'flow'} ${gcls()}"><header class="rhead2"><div class="rbook">${esc(b.ru)}</div><div class="rch">${cur.ch}</div>`+
    `<div class="rtools"><button class="rbtn" data-rtr>${esc(p?TRS[p].name.replace(/ \(.*\)/,''):'Перевод')} <i>▾</i></button><button class="rbtn" data-listen title="Слушать главу">${svgI('play')} Слушать</button><button class="rbtn only-d" data-rset title="Шрифт и вид">Аа</button>${BI[cur.book]<39?'<button class="rbtn" data-lxx title="Тот же текст в Септуагинте">LXX</button>':''}</div></header>`;
  if(!p){h+=`<p class="hint">Выберите перевод для чтения.</p></article>`;return h}
  const tr=d.tr[p];
  if(!tr){h+=`<div class="rsk">`+'<div class="sk"></div>'.repeat(8)+`</div></article>`;return h}
  h+=`<div class="rtext" lang="${TRS[p].lang==='en'?'en':'ru'}">`;
  for(const v of d.verses){const txt=tr[v];if(!txt)continue;const ref=`${cur.book}.${cur.ch}.${v}`;
    h+=`<span class="rv${hlc(ref)}" data-v="${v}" data-ref="${ref}">${vnHTML(ref,v)}${trHTML(p,v,txt,d)}</span>${perVerse?'':' '}`}
  h+=`</div>`;
  h+=`</article>`;
  return h;
}
const svgI=n=>n==='play'?'<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>':n==='pause'?'<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>':'';

/* ---------- листы: перевод и вид ---------- */
function readTrSheet(){
  const p=primary();
  openModal(`<h3>Перевод для чтения</h3><div class="mlist">`+IDX.translations.map(t=>`<button data-rpick="${t.id}" class="${t.id===p?'on':''}">${esc(t.name)}<small>${t.lang==='ru'?'русский':'английский'}</small></button>`).join('')+
    `</div><p class="hint">Нажмите на любое слово в тексте, чтобы увидеть слово оригинала, его значение и где ещё оно встречается.</p>`);
}
function readSheet(keep){
  const r=rd(),fsz=[16,18,20,22,25,28],lhs=[[1.5,'Плотно'],[1.75,'Обычно'],[2,'Свободно']];
  const html=`<h3>Вид текста</h3>`+
    `<div class="rprev" style="font-size:${r.fs}px;line-height:${r.lh};font-family:${r.font==='sans'?'var(--ui)':'var(--serif)'}">Ибо так возлюбил Бог мир…</div>`+
    `<h5>Размер</h5><div class="rseg">`+fsz.map(s=>`<button data-rk="fs" data-rv="${s}" class="${r.fs===s?'on':''}" style="font-size:${Math.round(s*.8)}px">А</button>`).join('')+`</div>`+
    `<h5>Шрифт</h5><div class="rseg"><button data-rk="font" data-rv="serif" class="${r.font==='serif'?'on':''}" style="font-family:var(--serif)">С засечками</button><button data-rk="font" data-rv="sans" class="${r.font==='sans'?'on':''}">Без засечек</button></div>`+
    `<h5>Интервал</h5><div class="rseg">`+lhs.map(([v,n])=>`<button data-rk="lh" data-rv="${v}" class="${r.lh===v?'on':''}">${n}</button>`).join('')+`</div>`+
    `<h5>Оформление</h5><div class="thquick">`+THEMES.map(t=>`<button data-th="${t.id}" title="${t.name}" aria-label="${t.name}" class="${effTheme()===t.id?'on':''}" style="background:${t.v.paper};color:${t.v.ink};border-color:${t.v.line}"><span style="background:${t.v.accent}"></span></button>`).join('')+`</div><div class="mlist" style="margin-top:8px"><button data-m="theme">Все темы и смена день / ночь<small>${S.tAuto?'автоматически: '+themeById(S.tDay||'light').name+' / '+themeById(S.tNight||'dark').name:themeById(S.theme).name}</small></button></div>`+
    `<h5>Текст</h5><div class="rseg"><button data-rk="flow" data-rv="auto" class="${r.flow==='auto'?'on':''}">Авто</button><button data-rk="flow" data-rv="para" class="${r.flow==='para'?'on':''}">Сплошной</button><button data-rk="flow" data-rv="verse" class="${r.flow==='verse'?'on':''}">По стихам</button></div>`+
    `<div class="rseg" style="margin-top:8px"><button data-rk="vn" data-rv="${r.vn?0:1}" class="${r.vn?'on':''}">Номера стихов: ${r.vn?'показаны':'скрыты'}</button></div>`+
    `<p class="hint">«Авто»: псалмы и поэзия по стихам, остальное сплошным текстом.</p>`+
    `<h5>Раскладка</h5><div class="mlist">`+Object.entries(LAYN).map(([l,n])=>`<button data-lay="${l}" class="${S.layout===l?'on':''}">${n}<small>${LAYD[l]}</small></button>`).join('')+`</div>`+
    `<div class="mlist" style="margin-top:14px"><button data-m="settings">Все настройки</button></div>`;
  if(keep&&!$('#modal').hidden&&$('#sheet .rprev')){const sc=$('#sheet').scrollTop;$('#sheet').innerHTML=html;$('#sheet').scrollTop=sc}else openModal(html);
}
const LAYD={R:'один перевод, спокойное чтение',A:'перевод и оригинал рядом',B:'колонки для сравнения',D:'текст с полями для заметок'};

/* ---------- чтение вслух ---------- */
const Listen=(()=>{
  let on=false,paused=false,idx=0,list=[],rate=1,keepAlive=null;
  const bar=()=>$('#lbar');
  function voiceFor(lang){const vs=speechSynthesis.getVoices();const want=lang==='en'?'en':'ru';return vs.find(v=>v.lang&&v.lang.toLowerCase().startsWith(want)&&/premium|enhanced|milena|yuri|google/i.test(v.name))||vs.find(v=>v.lang&&v.lang.toLowerCase().startsWith(want))||null}
  function ui(){
    let b=bar();if(!on){if(b)b.remove();document.body.classList.remove('listening');return}
    if(!b){b=document.createElement('div');b.id='lbar';document.body.appendChild(b)}
    document.body.classList.add('listening');
    const cv=list[idx];
    b.innerHTML=`<button data-lp aria-label="${paused?'Продолжить':'Пауза'}">${svgI(paused?'play':'pause')}</button><div class="li"><b>${esc(bookAb(cur.book))} ${cur.ch}${cv?':'+cv.v:''}</b><small>${esc(TRS[primary()]?shortName(primary()):'')} · чтение вслух</small></div><button data-lr>${rate}×</button><button data-lx aria-label="Остановить">✕</button>`;
  }
  function mark(){$$('.rv.playing,[data-v].playing').forEach(x=>x.classList.remove('playing'));const cv=list[idx];if(!cv)return;const el=$(`#reader [data-v="${cv.v}"]`);if(el){el.classList.add('playing');const r=el.getBoundingClientRect();if(r.top<90||r.bottom>innerHeight-150)el.scrollIntoView({block:'center',behavior:'smooth'})}}
  function speak(){
    if(!on)return;const cv=list[idx];
    if(!cv){// конец главы → следующая
            const i=BI[cur.book];const nb=cur.ch<BOOKS[i].chapters?[cur.book,cur.ch+1]:(i<BOOKS.length-1?[BOOKS[i+1].id,1]:null);
      if(!nb){stop();return}
      go(nb[0],nb[1]);scrollTo(0,0);waitChapter().then(()=>{load();speak()});return}
    mark();ui();
    const u=new SpeechSynthesisUtterance(cv.t);const p=primary();u.lang=TRS[p]&&TRS[p].lang==='en'?'en-US':'ru-RU';const vo=voiceFor(TRS[p]&&TRS[p].lang);if(vo)u.voice=vo;u.rate=rate=S.lrate||rate;
    u.onend=()=>{if(on&&!paused&&u._me===list[idx]){idx++;speak()}};u._me=cv;u.onerror=e=>{if(e.error!=='interrupted'&&e.error!=='canceled'&&on){idx++;speak()}};
    speechSynthesis.speak(u);
  }
  function load(){const p=primary();if(!CUR||!p||!CUR.tr[p]){list=[];return}list=CUR.verses.filter(v=>CUR.tr[p][v]).map(v=>({v,t:CUR.tr[p][v]}));
    // начать с первого стиха, видимого на экране
    const vis=$$('#reader [data-v]').find(el=>el.getBoundingClientRect().bottom>110);idx=0;if(vis){const i=list.findIndex(x=>String(x.v)===vis.dataset.v);if(i>0)idx=i}}
  function waitChapter(){return new Promise(res=>{const t0=Date.now();const ch=()=>{if(CUR&&CUR.tr[primary()]&&Object.keys(CUR.tr[primary()]).length&&$('#reader [data-v]'))res();else if(Date.now()-t0<15000)setTimeout(ch,150);else res()};ch()})}
  function start(){if(!('speechSynthesis' in window)){alert('Этот браузер не умеет читать вслух.');return}speechSynthesis.cancel();on=true;paused=false;load();ui();speak();
    clearInterval(keepAlive);keepAlive=setInterval(()=>{if(on&&!paused&&speechSynthesis.speaking){speechSynthesis.pause();speechSynthesis.resume()}},12000)}
  function stop(){on=false;paused=false;speechSynthesis.cancel();clearInterval(keepAlive);$$('.playing').forEach(x=>x.classList.remove('playing'));ui()}
  function toggle(){if(!on)return start();if(paused){paused=false;speechSynthesis.cancel();speak()}else{paused=true;speechSynthesis.cancel()}ui()}
  function cycleRate(){rate=rate===1?1.25:rate===1.25?1.5:rate===1.5?0.85:1;S.lrate=rate;touchSettings();if(on&&!paused){speechSynthesis.cancel();speak()}ui()}
  return{start,stop,toggle,cycleRate,get on(){return on}};
})();

/* ---------- клики ---------- */
document.addEventListener('click',e=>{
  const t=e.target;
  if(t.closest('[data-rtr]')){readTrSheet();return}
  if(t.closest('[data-rset]')){readSheet();return}
  if(t.closest('[data-lxx]')){Lib.openHeb(cur.book,cur.ch);return}
  if(t.closest('[data-listen]')){Listen.on?Listen.stop():Listen.start();return}
  if(t.closest('[data-lp]')){Listen.toggle();return}
  if(t.closest('[data-lx]')){Listen.stop();return}
  if(t.closest('[data-lr]')){Listen.cycleRate();return}
});
$('#modal').addEventListener('click',e=>{
  const t=e.target;
  const pk=t.closest('[data-rpick]');if(pk){const id=pk.dataset.rpick;S.sel=S.sel.filter(x=>x!==id);const oi=S.sel.indexOf('ORIG');S.sel.splice(oi===0?1:0,0,id);touchSettings();closeModal();if(Listen.on)Listen.stop();render();e.stopPropagation();return}
  const rk=t.closest('[data-rk]');if(rk){const k=rk.dataset.rk,v=rk.dataset.rv;setRd(k,k==='font'||k==='flow'||k==='width'?v:k==='vn'?v==='1':+v);e.stopPropagation();return}
  const th=t.closest('[data-theme]');if(th){S.theme=th.dataset.theme;touchSettings();applyBody();readSheet(true);e.stopPropagation();return}
  if(t.closest('[data-m="more"]')){moreSheet();e.stopPropagation();return}
},true);

/* ---------- долгое нажатие на текст → меню стиха (когда номера скрыты) ---------- */
(()=>{let tm=null,sx=0,sy=0;
  $('#reader').addEventListener('touchstart',e=>{const v=e.target.closest('.rv');if(!v)return;const p=e.touches[0];sx=p.clientX;sy=p.clientY;
    tm=setTimeout(()=>{tm=null;const vn=$('.vn',v);if(vn){navigator.vibrate&&navigator.vibrate(8);verseMenu(vn);v._lp=Date.now()}},520)},{passive:true});
  const cancel=e=>{if(!tm)return;if(e.type==='touchmove'){const p=e.touches[0];if(Math.hypot(p.clientX-sx,p.clientY-sy)<10)return}clearTimeout(tm);tm=null};
  $('#reader').addEventListener('touchmove',cancel,{passive:true});$('#reader').addEventListener('touchend',cancel);
  $('#reader').addEventListener('contextmenu',e=>{const v=e.target.closest('.rv');if(v&&!isM()){e.preventDefault();const vn=$('.vn',v);if(vn)verseMenu(vn)}});
  $('#reader').addEventListener('click',e=>{const v=e.target.closest('.rv');if(v&&v._lp&&Date.now()-v._lp<700){e.stopPropagation();e.preventDefault()}},true);
})();

/* ---------- при чтении панели прячутся, при прокрутке вверх — возвращаются ---------- */
(()=>{let last=scrollY,acc=0;
  addEventListener('scroll',()=>{
    const y=scrollY,dy=y-last;last=y;
    if(S.sec==='read'){const H=document.documentElement.scrollHeight-innerHeight;document.body.style.setProperty('--rp',H>0?Math.min(1,y/H).toFixed(3):0)}
    if(!isM()||S.noImm||S.sec!=='read'||S.layout!=='R'||document.documentElement.classList.contains('locked')){document.body.classList.remove('immersive');return}
    acc=(dy>0)===(acc>0)?acc+dy:dy;
    if(y<80||acc<-24)document.body.classList.remove('immersive');else if(acc>40)document.body.classList.add('immersive');
  },{passive:true});
})();
applyRd();
