'use strict';
/* Ad fontes: обновления без переустановки.
   Приложение само проверяет, не вышла ли новая версия сайта: при открытии, при возвращении
   в приложение и раз в 15 минут. Версия — это метка ?v= у скриптов в index.html.
   Если приложение долго было свёрнуто — обновляется само; иначе внизу появляется плашка «Обновить». */
const Update=(()=>{
  const ver=()=>{const s=document.querySelector('script[src*="app.js?v="]');return s?(s.getAttribute('src').match(/v=([\w.-]+)/)||[])[1]:''};
  const CUR=ver();let found='',lastCheck=0,hiddenAt=0,shown=false;
  async function check(force){
    if(!force&&Date.now()-lastCheck<60000)return found;lastCheck=Date.now();
    try{
      const t=await (await fetch('./index.html?u='+Date.now(),{cache:'no-store'})).text();
      const m=t.match(/app\.js\?v=([\w.-]+)/);if(m&&CUR&&m[1]!==CUR)found=m[1];
    }catch(e){}
    return found;
  }
  async function apply(){
    try{const r=await navigator.serviceWorker?.getRegistration();if(r)await r.update()}catch(e){}
    try{if(typeof save==='function')save()}catch(e){}
    location.reload();
  }
  function offer(){
    if(shown||!found)return;shown=true;
    const el=document.createElement('div');el.id='upd';el.setAttribute('role','status');
    el.innerHTML=`<span><b>Вышло обновление</b><small>новые функции и исправления</small></span><button data-upd>Обновить</button><button data-updx aria-label="Позже">✕</button>`;
    document.body.appendChild(el);
  }
  document.addEventListener('click',e=>{
    if(e.target.closest('[data-upd]'))apply();
    if(e.target.closest('[data-updx]')){$('#upd')?.remove()}
  });
  document.addEventListener('visibilitychange',async()=>{
    if(document.visibilityState==='hidden'){hiddenAt=Date.now();return}
    const away=hiddenAt?Date.now()-hiddenAt:0;
    if(await check(away>5*60000)){
      // вернулись после долгого перерыва: тихо обновляемся (место чтения и настройки сохранены)
      if(away>10*60000&&$('#modal').hidden)apply();else offer();
    }
  });
  setTimeout(async()=>{if(await check(true))offer()},6000);
  setInterval(async()=>{if(document.visibilityState==='visible'&&await check(true))offer()},15*60000);
  return{check,apply,version:CUR,get found(){return found}};
})();
