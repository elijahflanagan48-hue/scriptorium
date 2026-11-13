'use strict';
/* Библия без интернета: тексты переводов (и по желанию оригинал) сохраняются на устройстве.
   Открытые файлы — в кэше приложения (Cache Storage), закрытые — в IndexedDB (см. sync.js). */
const Offline=(()=>{
  const K='adfontes.off',CN='scriptorium-3';
  let st={};try{st=JSON.parse(localStorage.getItem(K)||'{}')}catch(e){}
  const sv=()=>{try{localStorage.setItem(K,JSON.stringify(st))}catch(e){}};
  let run=null,prog=null;
  const ping=()=>{if(typeof Settings!=='undefined'&&S.sec==='set')try{Settings.render()}catch(e){}};
  async function pool(items,n,fn){let i=0;await Promise.all(Array.from({length:n},async()=>{while(i<items.length){const x=items[i++];await fn(x).catch(()=>{});prog.done++;if(prog.done%25===0)ping()}}))}
  async function pub(url){const c=await caches.open(CN);if(await c.match(url))return;const r=await fetch(url);if(!r.ok)throw 0;await c.put(url,r)}
  const priv=key=>Sync.pcached(key).then(h=>h?0:Sync.pget(key));
  function plan(kind){
    const T=[],ok=!!(Sync.user&&Sync.user.access);
    if(kind==='orig'){
      for(const u of ['data/lex_H.json','data/lex_G.json','data/occ.json'])T.push(()=>pub(u));
      for(const b of BOOKS)for(let c=1;c<=b.chapters;c++)T.push(()=>pub(`data/origc/${b.id}/${c}.json`));
      return T}
    for(const t of IDX.translations){
      if((kind==='ru')!==(t.lang==='ru'))continue;
      for(const b of t.books){
        if(isPriv(t.id)){if(!ok)continue;
          T.push(()=>priv(`tr/${t.id}/${b}`),()=>priv(`align/${t.id}/${b}`),()=>priv(`nt/${t.id}/${b}`));
          if(t.id==='BTI')T.push(()=>priv(`ins/BTI/${b}`))}
        else{const nch=BOOKS[BI[b]].chapters;for(let c=1;c<=nch;c++)T.push(()=>pub(`data/trc/${t.id}/${b}/${c}.json`),()=>pub(`data/alc/${t.id}/${b}/${c}.json`))}}
      if(t.id==='BTI'&&ok)T.push(()=>priv('ins/BTI/_front'))}
    return T}
  async function start(kind){
    if(run)return run;if(!IDX||!BOOKS||!window.caches)return;
    try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(e){}
    const T=plan(kind);prog={kind,done:0,total:T.length};ping();
    run=(async()=>{await pool(T,4,f=>f());st[kind]={t:Date.now(),n:T.length};sv()})().catch(()=>{}).finally(()=>{run=null;prog=null;ping()});
    return run}
  /* один раз на устройстве, тихо и только не по мобильной сети: русские переводы */
  function auto(){
    const cn=navigator.connection;if(cn&&(cn.saveData||cn.type==='cellular'))return;
    const need=!st.ru||(Sync.user&&Sync.user.access&&!st.ruPriv);
    if(!need||!navigator.onLine)return;
    setTimeout(()=>start('ru').then(()=>{if(Sync.user&&Sync.user.access){st.ruPriv=1;sv()}}),8000)}
  const status=kind=>st[kind]?new Date(st[kind].t).toLocaleDateString('ru-RU'):null;
  return{start,auto,status,get busy(){return prog},clear:async()=>{st={};sv();try{await caches.delete(CN)}catch(e){}}}
})();
