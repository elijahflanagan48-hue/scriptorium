'use strict';
/* Ad fontes: раздел «Настройки» — все параметры приложения на одной странице. */
const Settings=(()=>{
  let updMsg='';
  const I={
    text:'<path d="M5 6.5V5h14v1.5M12 5v14M9 19h6"/>',
    layout:'<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M12 4.5v15M6.5 9h3M6.5 12h3M14.5 9h3M14.5 12h3"/>',
    theme:'<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 0 0 17z" fill="currentColor" stroke="none"/>',
    tr:'<path d="M3.5 6h9M8 4v2M5.5 6c.6 3.6 3 6.4 6 7.6M10.5 6c-.7 3.8-3.2 6.6-6.5 7.8"/><path d="M12.5 20l4-9.5 4 9.5M14 16.8h5"/>',
    kids:'<path d="M4 5.5h6.5a2 2 0 0 1 1.5 .7 2 2 0 0 1 1.5-.7H20v13h-6.5a2 2 0 0 0-1.5.7 2 2 0 0 0-1.5-.7H4z"/><path d="M12 6.2v13"/>',
    listen:'<path d="M4 9.5v5h3.5l5 4v-13l-5 4z"/><path d="M16 9a4.2 4.2 0 0 1 0 6M18.6 6.4a8 8 0 0 1 0 11.2"/>',
    lamp:'<path d="M12 3.5c2.6 3.4 5.5 5.6 5.5 9.4a5.5 5.5 0 0 1-11 0c0-3.8 2.9-6 5.5-9.4z"/><path d="M12 18.4c-1.6 0-2.6-1.2-2.6-2.6 0-1.6 1.4-2.6 2.6-4.4 1.2 1.8 2.6 2.8 2.6 4.4 0 1.4-1 2.6-2.6 2.6z"/>',
    ui:'<path d="M4 7.5h9M17 7.5h3M4 16.5h3M11 16.5h9"/><circle cx="15" cy="7.5" r="2"/><circle cx="9" cy="16.5" r="2"/>',
    data:'<path d="M12 4v10.5M7.5 10l4.5 4.5 4.5-4.5M5 19.5h14"/>',
    acc:'<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1.4-3.8 4.2-5.6 7.5-5.6s6.1 1.8 7.5 5.6"/>',
    about:'<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.6v.4"/>'};
  const ico=k=>`<svg viewBox="0 0 24 24" aria-hidden="true">${I[k]}</svg>`;
  const GR=[['text','Текст'],['layout','Раскладка'],['theme','Оформление'],['tr','Переводы'],['kids','Детская Библия'],['listen','Чтение вслух'],['lamp','Светильник'],['ui','Интерфейс'],['data','Данные'],['acc','Аккаунт'],['about','О приложении']];
  const seg=(key,cur,opts,cls='')=>`<div class="sseg ${cls}" role="radiogroup">`+opts.map(([v,n,st])=>`<button role="radio" aria-checked="${String(cur)===String(v)}" class="${String(cur)===String(v)?'on':''}" data-set="${key}" data-v="${v}"${st?` style="${st}"`:''}>${n}</button>`).join('')+`</div>`;
  const tog=(key,on,label)=>`<button class="stg${on?' on':''}" role="switch" aria-checked="${on}" aria-label="${label}" data-tog="${key}"><i></i></button>`;
  const row=(t,s,ctl,cls='')=>`<div class="srow ${cls}"><div class="srl"><b>${t}</b>${s?`<small>${s}</small>`:''}</div><div class="src">${ctl}</div></div>`;
  const group=(id,title,desc,body)=>`<section class="sgp" id="set-${id}"><div class="sgh"><span class="sgi">${ico(id)}</span><div><h2>${title}</h2>${desc?`<p>${desc}</p>`:''}</div></div>${body}</section>`;
  const card=h=>`<div class="scard">${h}</div>`;

  let offOpen=false;
  function offHTML(){
    const B=Offline.busy,trs=(IDX&&IDX.translations)||[],done=[...trs.map(t=>t.id),'orig'].filter(id=>Offline.status(id)).length;
    const line=(id,name,sub)=>{const on=Offline.status(id),me=B&&B.id===id;
      const q=Offline.queued(id);
      return `<div class="soff-r"><div class="srl"><b>${esc(name)}</b><small>${me?`скачивается… ${Math.round(100*B.done/Math.max(1,B.total))}%`:q?'в очереди':(on?'на устройстве · '+on:esc(sub||''))}</small></div><div class="src">${me?'<span class="hint">…</span>':q?`<button class="sbtn" data-sact="off-del:${id}">Убрать</button>`:on?`<button class="sbtn" data-sact="off-del:${id}">Удалить</button>`:`<button class="sbtn pri" data-sact="off-get:${id}">Скачать</button>`}</div></div>`};
    const grp=(n,l)=>l.length?`<h5 class="tgh">${n}</h5>`+l.map(t=>line(t.id,t.name,t.license)).join(''):'';
    return row('Библия без интернета',done?`на устройстве: ${done}`:'скачайте нужные переводы, чтобы читать без сети',`<button class="sbtn" data-sact="off-toggle">${offOpen?'Скрыть список':'Выбрать'}</button>`)+
      (offOpen?`<div class="soff">`+grp('Русские переводы',trs.filter(t=>t.lang==='ru'))+grp('Английские переводы',trs.filter(t=>t.lang!=='ru'))+`<h5 class="tgh">Оригинал</h5>`+line('orig','Иврит и греческий с морфологией и словарём','около 20 МБ')+`</div>`:'')}
  function html(){
    const r=rd(),a=S.tAuto||'',trs=(IDX&&IDX.translations)||[],prim=primary();
    const mk=t=>!a?(S.theme===t.id?1:0):(t.night?(themeById(S.tNight||'dark').id===t.id?'ночью':0):(themeById(S.tDay||'light').id===t.id?'днём':0));
    const anims=[['lamp','Лампа разгорается'],['water','Круги на воде'],['embers','Золотые искры'],['light','Луч света'],['seal','Печать'],['ink','Чернила'],['quiet','Тихо']];
    const lays=[['R','Чтение','один перевод'],['A','Книга','перевод и оригинал'],['B','Стол','колонки сравнения'],['D','Манускрипт','поля для заметок']];
    const layArt={R:'<i class="l1"></i>',A:'<i class="l2a"></i><i class="l2b"></i>',B:'<i class="l3"></i><i class="l3"></i><i class="l3"></i>',D:'<i class="l4a"></i><i class="l4b"></i>'};
    const user=typeof Sync!=='undefined'&&Sync.user;
    let h=`<div class="pg setp"><div class="pghead"><h1>Настройки</h1><span class="spacer"></span><span class="ssync">${user?'Сохраняются в аккаунте · '+esc(user.email):'Сохраняются в этом браузере'}</span></div>
      <div class="swrap"><nav class="snav" aria-label="Разделы настроек">${GR.map(([id,n])=>`<a href="#set-${id}" data-sjump="${id}">${ico(id)}<span>${n}</span></a>`).join('')}</nav><div class="smain">`;
    h+=group('text','Текст','Как выглядит Писание при чтении',
      `<div class="sprev" style="font-size:${r.fs}px;line-height:${r.lh};font-family:${r.font==='sans'?'var(--ui)':'var(--serif)'}"><sup>16</sup>Ибо так возлюбил Бог мир, что отдал Сына Своего Единородного, дабы всякий верующий в Него не погиб, но имел жизнь вечную.<span>Ин 3:16</span></div>`+
      card(row('Размер шрифта',r.fs+' пикселей',seg('rd.fs',r.fs,[16,18,20,22,25,28].map(s=>[s,'А',`font-size:${Math.round(s*.72)}px`]),'sz'))+
        row('Шрифт','',seg('rd.font',r.font,[['serif','С засечками','font-family:var(--serif)'],['sans','Без засечек']]))+
        row('Межстрочный интервал','',seg('rd.lh',r.lh,[[1.5,'Плотно'],[1.75,'Обычно'],[2,'Свободно']]))+
        row('Ширина строки','',seg('rd.width',r.width,[['narrow','Узкая'],['normal','Обычная'],['wide','Широкая']]),'only-d')+
        row('Разбивка текста','«Авто»: поэзия по стихам, проза сплошным текстом',seg('rd.flow',r.flow,[['auto','Авто'],['para','Сплошной'],['verse','По стихам']]))+
        row('Номера стихов','',tog('rd.vn',r.vn,'Номера стихов'))));
    h+=group('layout','Раскладка','Как располагаются переводы и оригинал',
      `<div class="slays">${lays.map(([k,n,s])=>`<button data-set="layout" data-v="${k}" class="slay${S.layout===k?' on':''}" aria-pressed="${S.layout===k}"><span class="lart">${layArt[k]}</span><b>${n}</b><small>${s}</small></button>`).join('')}</div>`);
    h+=group('theme','Оформление','Цвета приложения днём и ночью',
      card(row('Смена темы',!a?'одна тема всегда':a==='sys'?'вместе с оформлением телефона или компьютера':'ночная тема с 21:00 до 7:00',seg('tAuto',a,[['','Одна тема'],['sys','Как в системе'],['time','По времени']]))) +
      `<h5>Дневные</h5><div class="thgrid">${THEMES.filter(t=>!t.night).map(t=>themeCard(t,mk(t))).join('')}</div><h5>Ночные</h5><div class="thgrid">${THEMES.filter(t=>t.night).map(t=>themeCard(t,mk(t))).join('')}</div>`);
    h+=group('tr','Переводы','Какие тексты показывать и какой перевод главный',
      card(row('Главный перевод','в режиме «Чтение» и для чтения вслух',`<select class="ssel" data-prim>${trs.filter(t=>S.sel.includes(t.id)).map(t=>`<option value="${t.id}"${t.id===prim?' selected':''}>${esc(t.name)}</option>`).join('')}</select>`)+
        row('Оригинал','иврит и греческий с морфологией',tog('tr.ORIG',S.sel.includes('ORIG'),'Оригинал'))+
        trGroups().map(([n,l])=>`<div class="tgl">${n}</div>`+l.map(t=>row(esc(t.name),t.license?esc(t.license):'',tog('tr.'+t.id,S.sel.includes(t.id),t.name))).join('')).join('')));
    h+=group('kids','Детская Библия','Какой пересказ показывать в разделе «Детская Библия» на полках',
      card((typeof Kids!=='undefined'&&Kids.ready().length)?row('Редакция',esc(Kids.ed().desc||''),`<select class="ssel" data-kidsed>${Kids.ready().map(e=>`<option value="${e.id}"${e.id===Kids.ed().id?' selected':''}>${esc(e.name)}${e.access==='account'?' 🔒':''}</option>`).join('')}</select>`):row('Редакции','появятся после загрузки данных','')));
    h+=group('listen','Чтение вслух','Голос берётся из системы телефона или компьютера',
      card(row('Скорость','',seg('lrate',S.lrate||1,[[0.85,'0,85×'],[1,'1×'],[1.25,'1,25×'],[1.5,'1,5×']]))+
        row('Проверить голос','прочитать короткую фразу',`<button class="sbtn" data-sact="voice">▶ Послушать</button>`)));
    h+=group('lamp','Светильник','Ежедневная серия чтения',
      card(row('Показывать светильник','значок вверху и праздник при выполнении цели',tog('lamp',!S.lampOff,'Светильник'))+
        row('Цель дня','считается только живое чтение',seg('goal',S.goal&&/^m/.test(S.goal)?S.goal:'m5',[['m3','3 мин'],['m5','5 мин'],['m10','10 мин'],['m15','15 мин'],['m30','30 мин']]))+
        row('Анимация праздника','',`<div class="sanims">${anims.map(([k,n])=>`<span class="sanim1${(S.anim||'lamp')===k?' on':''}"><button data-set="anim" data-v="${k}">${n}</button><button class="spv" data-sact="prev:${k}" aria-label="Показать: ${n}">▶</button></span>`).join('')}</div>`,'wide')+
        row('Серия и календарь','',`<button class="sbtn" data-sact="streak">Открыть</button>`)));
    h+=group('ui','Интерфейс','',
      card(row('Список книг слева','на компьютере; повторное нажатие «Читать» тоже скрывает его',tog('side',S.side!==false,'Список книг'))+
        row('Прятать панели при прокрутке','на телефоне в режиме «Чтение»: больше места для текста',tog('imm',!S.noImm,'Прятать панели'))+
        row('Анимации интерфейса','выключите, если движение мешает',tog('motion',!S.calm,'Анимации'))));
    const n=Object.keys(S.notes||{}).length,hl=Object.keys(S.hl||{}).length,w=Object.keys(S.wnotes||{}).length;
    h+=group('data','Данные',`Заметок к стихам: ${n} · выделений: ${hl} · заметок к словам: ${w}`,
      card(row('Заметки и выделения','сохранить в файл или загрузить из файла',`<div class="sbtns"><button class="sbtn" data-sact="export">Сохранить</button><label class="sbtn">Загрузить<input type="file" accept=".json" hidden data-simport></label></div>`)+
        (typeof Offline!=='undefined'?offHTML():'')+
        row('История поиска',`${(S.qhist||[]).length} запросов`,`<button class="sbtn" data-sact="qhist">Очистить</button>`)+
        row('Недавно открытые места',`${(S.recent||[]).length} мест`,`<button class="sbtn" data-sact="recent">Очистить</button>`)+
        row('Вид текста по умолчанию','вернуть размер, шрифт и интервал',`<button class="sbtn" data-sact="resetrd">Сбросить</button>`)));
    h+=group('acc','Аккаунт','',
      card(row(user?esc(user.email):'Вы не вошли',user?'заметки, выделения, серия и настройки синхронизируются между устройствами':'войдите, чтобы всё было на всех ваших устройствах',`<button class="sbtn pri" data-sact="acc">${user?'Личный кабинет':'Войти'}</button>`)));
    h+=group('about','О приложении','',
      `<div class="sabout"><img src="icon.svg" alt="" width="64" height="64"><div><b>Ad fontes</b><small>«К истокам». Библия с оригиналами на еврейском и греческом, переводами и умным поиском.</small><small>Переводов: ${trs.length} · книг: ${BOOKS.length} · версия ${typeof Update!=='undefined'?Update.version:''}</small></div></div>`+
      card(row('Обновления','приложение обновляется само: при возвращении после перерыва или по кнопке во всплывающей плашке',`<button class="sbtn" data-sact="upd">${updMsg||'Проверить'}</button>`)));
    return h+'</div></div></div>';
  }
  function render(){const y=scrollY;$('#page').innerHTML=html();if(S.sec==='set')scrollTo(0,y);spy()}
  const re=()=>{touchSettings();if(S.sec==='set')render()};
  const rdSet=(k,v)=>{S.rd=Object.assign(rd(),{[k]:v});applyRd();if(k==='flow'||k==='vn')window.render&&window.render();re()};

  document.addEventListener('click',e=>{
    if(S.sec!=='set')return;const pg=e.target.closest('#page');if(!pg)return;
    const j=e.target.closest('[data-sjump]');if(j){e.preventDefault();const el=$('#set-'+j.dataset.sjump);if(el)scrollTo({top:el.getBoundingClientRect().top+scrollY-(isM()?118:78),behavior:'smooth'});return}
    const s=e.target.closest('[data-set]');
    if(s){const k=s.dataset.set,v=s.dataset.v;
      if(k.startsWith('rd.'))return rdSet(k.slice(3),isNaN(+v)?v:+v);
      if(k==='layout'){S.layout=v;applyBody();window.render&&window.render();re();return}
      if(k==='tAuto'){S.tAuto=v;if(v){const c=themeById(S.theme);if(c.night)S.tNight=c.id;else S.tDay=c.id;S.tDay=S.tDay||'light';S.tNight=S.tNight||'dark'}applyBody();re();return}
      if(k==='lrate'){S.lrate=+v;re();return}
      if(k==='goal'){S.goal=v;Streak.ui();Streak.check();re();return}
      if(k==='anim'){S.anim=v;re();return}}
    const th=e.target.closest('[data-th]');
    if(th){const t=themeById(th.dataset.th);if(!S.tAuto)S.theme=t.id;else if(t.night)S.tNight=t.id;else S.tDay=t.id;applyBody();re();return}
    const g=e.target.closest('[data-tog]');
    if(g){const k=g.dataset.tog;
      if(k.startsWith('rd.'))return rdSet(k.slice(3),!rd()[k.slice(3)]);
      if(k.startsWith('tr.')){const id=k.slice(3);if(S.sel.includes(id)){if(S.sel.length>1)S.sel=S.sel.filter(x=>x!==id)}else S.sel.push(id);re();return}
      if(k==='lamp'){S.lampOff=!S.lampOff;applyBody();re();return}
      if(k==='side'){S.side=S.side===false;applyBody();re();return}
      if(k==='imm'){S.noImm=!S.noImm;re();return}
      if(k==='motion'){S.calm=!S.calm;applyBody();re();return}}
    const a=e.target.closest('[data-sact]');
    if(a){const k=a.dataset.sact;
      if(k.startsWith('prev:')){Streak.celebrate(k.slice(5),Math.max(Streak.calc().n,1),'');return}
      if(k==='upd'){updMsg='Проверяю…';render();Update.check(true).then(v=>{if(v)Update.apply();else{updMsg='✓ Последняя версия';render();setTimeout(()=>{updMsg='';if(S.sec==='set')render()},4000)}});return}
      if(k==='streak')Streak.sheet();
      if(k==='acc')accSheet();
      if(k==='voice'){try{speechSynthesis.cancel();const p=primary(),en=TRS[p]&&TRS[p].lang==='en';const u=new SpeechSynthesisUtterance(en?'In the beginning God created the heaven and the earth.':'В начале сотворил Бог небо и землю.');u.lang=en?'en-US':'ru-RU';u.rate=S.lrate||1;speechSynthesis.speak(u)}catch(err){}}
      if(k==='export'){const l=document.createElement('a');l.href=URL.createObjectURL(new Blob([JSON.stringify({hl:S.hl,notes:S.notes,wnotes:S.wnotes},null,1)],{type:'application/json'}));l.download='adfontes-notes.json';l.click()}
      if(k==='off-toggle'){offOpen=!offOpen;render();return}
      if(k.startsWith('off-get:')){Offline.start(k.slice(8));render();return}
      if(k.startsWith('off-del:')){Offline.drop(k.slice(8)).then(render);return}
      if(k==='qhist'){S.qhist=[];save();render()}
      if(k==='recent'){S.recent=[];save();render()}
      if(k==='resetrd'){S.rd={};applyRd();window.render&&window.render();re()}}
  });
  document.addEventListener('change',e=>{
    if(S.sec!=='set')return;
    if(e.target.matches('[data-kidsed]')){Kids.setEd(e.target.value);re();return}
    if(e.target.matches('[data-prim]')){const id=e.target.value;S.sel=S.sel.filter(x=>x!==id);const i=S.sel.findIndex(x=>x!=='ORIG');S.sel.splice(i<0?S.sel.length:i,0,id);re();return}
    if(e.target.matches('[data-simport]')){const f=e.target.files[0];if(!f)return;f.text().then(x=>{const j=JSON.parse(x),now=Date.now();Object.assign(S.hl,j.hl||{});Object.assign(S.notes,j.notes||{});S.wnotes=Object.assign(S.wnotes||{},j.wnotes||{});
      Object.keys(j.hl||{}).forEach(k=>S.ts['h:'+k]=now);Object.keys(j.notes||{}).forEach(k=>S.ts['n:'+k]=now);Object.keys(j.wnotes||{}).forEach(k=>S.ts['w:'+k]=now);save();render()}).catch(()=>alert('Не удалось прочитать файл'))}
  });
  /* подсветка текущей группы в навигации */
  function spy(){const nav=$('.snav');if(!nav)return;let cur='text';for(const [id] of GR){const el=$('#set-'+id);if(el&&el.getBoundingClientRect().top<(isM()?150:120))cur=id}
    $$('.snav a').forEach(x=>x.classList.toggle('on',x.dataset.sjump===cur));
    if(isM()){const on=$('.snav a.on');if(on&&nav.scrollWidth>nav.clientWidth){const l=on.offsetLeft-nav.clientWidth/2+on.offsetWidth/2;if(Math.abs(nav.scrollLeft-l)>40)nav.scrollTo({left:l,behavior:'smooth'})}}}
  addEventListener('scroll',()=>{if(S.sec==='set')spy()},{passive:true});
  return{render};
})();
