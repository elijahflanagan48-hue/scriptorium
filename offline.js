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
  function plan(id){
    const T=[];
    if(id==='orig'){
      for(const u of ['data/lex_H.json','data/lex_G.json','data/occ.json'])T.push(()=>pub(u));
      for(const b of BOOKS)for(let c=1;c<=b.chapters;c++)T.push(()=>pub(`data/origc/${b.id}/${c}.json`));
      return T}
    const t=TRS[id];if(!t)return T;
    for(const b of t.books){
      if(isPriv(id)){
        T.push(()=>priv(`tr/${id}/${b}`),()=>priv(`align/${id}/${b}`),()=>priv(`nt/${id}/${b}`));
        if(id==='BTI')T.push(()=>priv(`ins/BTI/${b}`))}
      else{const n=BOOKS[BI[b]].chapters;for(let c=1;c<=n;c++)T.push(()=>pub(`data/trc/${id}/${b}/${c}.json`),()=>pub(`data/alc/${id}/${b}/${c}.json`))}}
    if(id==='BTI')T.push(()=>priv('ins/BTI/_front'));
    return T}
  const Q=[];
  async function pump(){
    if(run)return;
    run=(async()=>{
      while(Q.length){const id=Q.shift();if(!IDX||!BOOKS||!window.caches)break;
        const T=plan(id);prog={id,done:0,total:T.length};ping();
        await pool(T,5,f=>f());
        if(prog.done>=T.length){st[id]={t:Date.now(),n:T.length};sv()}
        prog=null;ping()}
    })().catch(()=>{}).finally(()=>{run=null;prog=null;ping()});
    return run}
  function start(id){
    if(st[id]||Q.includes(id)||(prog&&prog.id===id))return;
    try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(e){}
    Q.push(id);ping();return pump()}
  async function drop(id){
    const qi=Q.indexOf(id);if(qi>=0){Q.splice(qi,1);ping();return}
    if(prog&&prog.id===id)return;
    if(id==='orig'){const c=await caches.open(CN);for(const r of await c.keys())if(/\/data\/(origc\/|lex_|occ\.json)/.test(r.url))await c.delete(r)}
    else if(isPriv(id)){await Sync.pdrop([`tr/${id}/`,`align/${id}/`,`nt/${id}/`,...(id==='BTI'?['ins/BTI/']:[])])}
    else{const c=await caches.open(CN);for(const r of await c.keys())if(r.url.includes(`/data/trc/${id}/`)||r.url.includes(`/data/alc/${id}/`)||r.url.includes(`/data/tr/${id}/`)||r.url.includes(`/data/align/${id}/`))await c.delete(r)}
    delete st[id];sv();ping()}
  const status=id=>st[id]?new Date(st[id].t).toLocaleDateString('ru-RU'):null;
  return{start,drop,status,queued:id=>Q.includes(id),get busy(){return prog}}
})();
