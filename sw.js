/* Ad fontes: кэш для мгновенного открытия и работы без сети.
   Данные (data/) — сразу из кэша, обновление в фоне; скрипты со ?v= — из кэша;
   сама страница — из сети, при отсутствии сети — из кэша. */
const V='scriptorium-3';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==V)await caches.delete(k);await self.clients.claim()})()));
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);if(u.origin!==location.origin)return;
  if(r.mode==='navigate'){ // страница — сначала из сети (чтобы обновления приходили сразу), без сети — из кэша
    e.respondWith(caches.open(V).then(async c=>{
      try{const res=await Promise.race([fetch(r,{cache:'no-cache'}),new Promise((_,j)=>setTimeout(()=>j('t'),3500))]);if(res.ok)c.put('./',res.clone());return res}
      catch(err){return (await c.match('./'))||fetch(r)}}));return}
  if(u.pathname.includes('/data/')){
    e.respondWith(caches.open(V).then(async c=>{const m=await c.match(r);
      const net=fetch(r).then(res=>{if(res.ok)c.put(r,res.clone());return res}).catch(()=>m);
      if(m){e.waitUntil(net.catch(()=>{}));return m}return net}));return}
  e.respondWith(caches.open(V).then(async c=>{const m=await c.match(r);if(m&&u.search)return m;
    try{const res=await fetch(r);if(res.ok)c.put(r,res.clone());return res}catch(err){return m||Response.error()}}));
});
