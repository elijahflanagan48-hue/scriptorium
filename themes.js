/* Ad fontes: темы оформления. Каждая тема — набор CSS-переменных.
   Дневные и ночные; можно выбрать одну вручную или включить автоматическую смену
   (как в системе или по времени суток) с отдельной темой для дня и для ночи. */
const HL_DAY={hl1:'#FFE680',hl2:'#BFE9D0',hl3:'#BFD3FF',hl4:'#FFC7BF'};
const HL_NIGHT={hl1:'#6B5A14',hl2:'#2F5A44',hl3:'#2A4A8F',hl4:'#7A3A33'};
const THEMES=[
  // ---- дневные ----
  {id:'light',name:'Светлая',d:'чистый белый',night:0,v:{bg:'#F5F7FC',paper:'#fff',ink:'#14161F',mute:'#5A5F72',line:'#E6E9F2',accent:'#4C7DFF',ai:'#2653D6',a2:'#FFB020',chip:'#EDEFF6',t1:'#EEF3FF',t1i:'#2653D6',t2:'#FFF6E3',t2i:'#9A6200'}},
  {id:'sepia',name:'Бумага',d:'тёплая, мягкая для глаз',night:0,v:{bg:'#F4ECDD',paper:'#FBF6EC',ink:'#2E2618',mute:'#6E6250',line:'#E4D8C2',accent:'#B5722A',ai:'#8A5418',a2:'#C9871F',chip:'#EFE5D2',t1:'#EFE3CB',t1i:'#7A4E12',t2:'#F3E7CF',t2i:'#7A4E12',hl:{hl1:'#F3DC8A',hl2:'#CFE3BF',hl3:'#C9DAF0',hl4:'#F2C9BE'}}},
  {id:'parch',name:'Пергамент',d:'старая рукопись, красные киноварные акценты',night:0,v:{bg:'#ECE0C6',paper:'#F7EEDA',ink:'#2B2116',mute:'#6C5C42',line:'#DECDAA',accent:'#A3382A',ai:'#82271C',a2:'#B8862F',chip:'#E8DABC',t1:'#F1DED0',t1i:'#82271C',t2:'#EDDFC0',t2i:'#6E4E12',hl:{hl1:'#F0D27A',hl2:'#CBDDB0',hl3:'#C6D4E6',hl4:'#EEC0B2'}}},
  {id:'stone',name:'Иерусалимский камень',d:'светлый известняк и терракота',night:0,v:{bg:'#F1EBE4',paper:'#FBF8F4',ink:'#2A2420',mute:'#6A5F57',line:'#E5DBD0',accent:'#B5562F',ai:'#8E3F1F',a2:'#C99A3E',chip:'#ECE3D8',t1:'#F6E4DA',t1i:'#8E3F1F',t2:'#F3EAD8',t2i:'#7A5512'}},
  {id:'olive',name:'Масличная роща',d:'приглушённый зелёный',night:0,v:{bg:'#EDF1E8',paper:'#FAFCF7',ink:'#1E261C',mute:'#56634F',line:'#DBE3D3',accent:'#3E7A4F',ai:'#2C5C39',a2:'#C1902B',chip:'#E4EBDD',t1:'#E2EFE4',t1i:'#2C5C39',t2:'#F4EFDB',t2i:'#7A5A12'}},
  {id:'lake',name:'Галилейское озеро',d:'воздух и вода, бирюза',night:0,v:{bg:'#ECF4F6',paper:'#fff',ink:'#13232B',mute:'#4F656E',line:'#D8E6EA',accent:'#1C7889',ai:'#145E6C',a2:'#E09A2C',chip:'#E1EDF0',t1:'#DDEFF2',t1i:'#145E6C',t2:'#FFF2E0',t2i:'#8A5A10'}},
  {id:'lilac',name:'Утро',d:'нежная сирень',night:0,v:{bg:'#F3F1F8',paper:'#fff',ink:'#1E1A2B',mute:'#5E5873',line:'#E3DFEE',accent:'#6B4FBF',ai:'#503A99',a2:'#D9922B',chip:'#EBE7F5',t1:'#ECE6FA',t1i:'#503A99',t2:'#FBF0E2',t2i:'#875810'}},
  {id:'mono',name:'Контраст',d:'чёрное на белом, как на бумаге',night:0,v:{bg:'#FFFFFF',paper:'#FFFFFF',ink:'#000000',mute:'#3D3D3D',line:'#D4D4D4',accent:'#000000',ai:'#000000',a2:'#000000',chip:'#F0F0F0',t1:'#EFEFEF',t1i:'#000000',t2:'#F5F5F5',t2i:'#000000'}},
  // ---- ночные ----
  {id:'dark',name:'Тёмная',d:'спокойный синий сумрак',night:1,v:{bg:'#10131C',paper:'#161A26',ink:'#E8EBF5',mute:'#8A92AC',line:'#252B3D',accent:'#6C97FF',ai:'#9DB8FF',a2:'#FFC24D',chip:'#1E2333',t1:'#171E36',t1i:'#9DB8FF',t2:'#2A2314',t2i:'#FFC24D'}},
  {id:'candle',name:'При свече',d:'тёплый янтарный свет',night:1,v:{bg:'#17110B',paper:'#1E1710',ink:'#EBDCC1',mute:'#A38F71',line:'#352A1D',accent:'#E3A04B',ai:'#F2C27E',a2:'#E3A04B',chip:'#2A2016',t1:'#30230F',t1i:'#F2C27E',t2:'#2A2016',t2i:'#E8C27A',hl:{hl1:'#6E5212',hl2:'#3D4A26',hl3:'#3A3A55',hl4:'#6E3424'}}},
  {id:'sea',name:'Ночное море',d:'глубокий сине-бирюзовый',night:1,v:{bg:'#0A1A20',paper:'#0F232B',ink:'#DCEBEF',mute:'#7FA0AA',line:'#1D3A44',accent:'#4FC1D1',ai:'#8ADBE6',a2:'#F0B65A',chip:'#15303A',t1:'#12323C',t1i:'#8ADBE6',t2:'#2A2614',t2i:'#F0C46E',hl:{hl1:'#5E5416',hl2:'#1F5246',hl3:'#1F4A6E',hl4:'#6A3A36'}}},
  {id:'forest',name:'Ночной сад',d:'тёмный изумруд и золото',night:1,v:{bg:'#0B1611',paper:'#101F18',ink:'#DCEBE1',mute:'#82A08F',line:'#1E3428',accent:'#5CC48A',ai:'#95DDB3',a2:'#E3C27A',chip:'#16291F',t1:'#143222',t1i:'#95DDB3',t2:'#2A2614',t2i:'#E3C27A',hl:{hl1:'#5E5416',hl2:'#255A3C',hl3:'#244A6A',hl4:'#6A3A30'}}},
  {id:'dusk',name:'Сумерки',d:'фиолетовый вечер',night:1,v:{bg:'#14111E',paper:'#1B1729',ink:'#E7E3F3',mute:'#968EAE',line:'#2C2740',accent:'#A08BFF',ai:'#C4B7FF',a2:'#FFC24D',chip:'#241F35',t1:'#2A2246',t1i:'#C4B7FF',t2:'#2B2416',t2i:'#FFC24D',hl:{hl1:'#5E5218',hl2:'#2F5246',hl3:'#3C3A86',hl4:'#6E3446'}}},
  {id:'graphite',name:'Графит',d:'нейтральный серый, мягкий контраст',night:1,v:{bg:'#1D1E21',paper:'#25262A',ink:'#D8D8DB',mute:'#919298',line:'#35373C',accent:'#8AA4D6',ai:'#B3C6EA',a2:'#E0B45E',chip:'#2E3034',t1:'#2C3341',t1i:'#B3C6EA',t2:'#33301F',t2i:'#E0B45E'}},
  {id:'black',name:'Полночь',d:'чистый чёрный, для OLED-экранов',night:1,v:{bg:'#000000',paper:'#000000',ink:'#E4E4E4',mute:'#8A8A8A',line:'#1F1F1F',accent:'#6C97FF',ai:'#9DB8FF',a2:'#FFC24D',chip:'#141414',t1:'#0F1626',t1i:'#9DB8FF',t2:'#1E1A0E',t2i:'#FFC24D'}},
  {id:'ember',name:'Перед сном',d:'красноватый, почти без синего',night:1,v:{bg:'#120807',paper:'#190C0A',ink:'#E9B9A9',mute:'#A27466',line:'#2E1612',accent:'#E0704F',ai:'#F09A7E',a2:'#E0904F',chip:'#22110E',t1:'#2C1410',t1i:'#F09A7E',t2:'#2A160C',t2i:'#F0A070',hl:{hl1:'#5A3A10',hl2:'#3A3018',hl3:'#3A2230',hl4:'#6A2418'}}},
];
const themeById=id=>THEMES.find(t=>t.id===id)||THEMES[0];
(function(){
  const css=THEMES.map(t=>{const v=t.v,h=v.hl||(t.night?HL_NIGHT:HL_DAY);
    return `.theme-${t.id}{--bg:${v.bg};--paper:${v.paper};--ink:${v.ink};--mute:${v.mute};--line:${v.line};--accent:${v.accent};--accent-ink:${v.ai};--accent2:${v.a2};--chip:${v.chip};--shadow:${t.night?'0 12px 36px rgba(0,0,0,.45)':'0 12px 36px rgba(20,22,31,.08)'};--t1:${v.t1};--t1i:${v.t1i};--t2:${v.t2};--t2i:${v.t2i};--hl1:${h.hl1};--hl2:${h.hl2};--hl3:${h.hl3};--hl4:${h.hl4};--wd:${v.ink};color-scheme:${t.night?'dark':'light'}}`}).join('\n');
  const st=document.createElement('style');st.id='themes-css';st.textContent=css;document.head.appendChild(st);
})();
/* Какая тема действует сейчас: ручная или автоматическая (день/ночь). */
function isNightNow(){
  if(S.tAuto==='sys')return matchMedia('(prefers-color-scheme: dark)').matches;
  if(S.tAuto==='time'){const h=new Date().getHours();return h<7||h>=21}
  return false;
}
function effTheme(){
  if(!S.tAuto)return themeById(S.theme).id;
  return isNightNow()?themeById(S.tNight||'dark').id:themeById(S.tDay||'light').id;
}
function syncThemeColor(){
  const m=document.querySelector('meta[name="theme-color"]');if(m)m.content=themeById(effTheme()).v.bg;
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{if(S.tAuto==='sys')applyBody()});
setInterval(()=>{if(S.tAuto==='time'&&!document.body.classList.contains('theme-'+effTheme()))applyBody()},60000);

/* Мини-превью темы: страница с заголовком, строками и выделенным словом. */
function themeCard(t,mark){
  const v=t.v;
  return `<button class="thc${mark?' on':''}" data-th="${t.id}" aria-pressed="${mark?'true':'false'}" style="background:${v.bg}">
    <span class="thp" style="background:${v.paper};border-color:${v.line}">
      <i style="background:${v.ink};width:46%;height:6px"></i>
      <i style="background:${v.mute};width:88%"></i><i style="background:${v.mute};width:72%"></i>
      <i style="background:${v.mute};width:80%"></i>
      <b style="background:${v.accent}"></b>
    </span>
    <span class="thn" style="color:${v.ink}">${t.name}${mark&&mark!==1?`<em style="background:${v.accent};color:${t.night?v.bg:'#fff'}">${mark}</em>`:''}</span>
    <small style="color:${v.mute}">${t.d}</small>
  </button>`;
}
function themeSheet(keep){
  const a=S.tAuto||'';
  const mk=t=>!a?(S.theme===t.id?1:0):(t.night?(themeById(S.tNight||'dark').id===t.id?'ночью':0):(themeById(S.tDay||'light').id===t.id?'днём':0));
  const html=`<h3>Оформление</h3>
    <div class="rseg thmode">${[['','Одна тема'],['sys','Как в системе'],['time','По времени суток']].map(([k,n])=>`<button data-tauto="${k}" class="${a===k?'on':''}">${n}</button>`).join('')}</div>
    <p class="hint">${!a?'Выберите тему — она будет всегда.':a==='sys'?'Днём и ночью тема меняется вместе с оформлением телефона или компьютера. Выберите по одной дневной и ночной.':'Ночная тема включается с 21:00 до 7:00. Выберите по одной дневной и ночной.'}</p>
    <h5>Дневные</h5><div class="thgrid">${THEMES.filter(t=>!t.night).map(t=>themeCard(t,mk(t))).join('')}</div>
    <h5>Ночные</h5><div class="thgrid">${THEMES.filter(t=>t.night).map(t=>themeCard(t,mk(t))).join('')}</div>`;
  if(keep&&!$('#modal').hidden&&$('#sheet .thgrid')){const sc=$('#sheet').scrollTop;$('#sheet').innerHTML=html;$('#sheet').scrollTop=sc}else openModal(html);
}
document.addEventListener('click',e=>{
  const m=e.target.closest('#sheet [data-tauto]');
  if(m){const k=m.dataset.tauto;S.tAuto=k;
    if(k){const cur=themeById(S.theme);if(cur.night)S.tNight=cur.id;else S.tDay=cur.id;S.tDay=S.tDay||'light';S.tNight=S.tNight||'dark'}
    touchSettings();applyBody();themeSheet(true);return}
  const q=e.target.closest('#sheet .thquick [data-th]');
  if(q){S.tAuto='';S.theme=themeById(q.dataset.th).id;touchSettings();applyBody();if(typeof readSheet==='function')readSheet(true);return}
  const c=e.target.closest('#sheet [data-th]');
  if(c){const t=themeById(c.dataset.th);
    if(!S.tAuto)S.theme=t.id;else if(t.night)S.tNight=t.id;else S.tDay=t.id;
    touchSettings();applyBody();themeSheet(true);return}
});
