/* Scriptorium: кэш для мгновенного открытия и работы без сети.
   Данные (data/) — сразу из кэша, обновление в фоне; скрипты со ?v= — из кэша;
   сама страница — из сети, при отсутствии сети — из кэша. */
const V='scriptorium-1';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==V)await caches.delete(k);await self.clients.claim()})()));
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);if(u.origin!==location.origin)return;
  if(r.mode==='navigate'){
    e.respondWith(fetch(r).then(res=>{if(res.ok){const c=res.clone();caches.open(V).then(x=>x.put('./',c))}return res}).catch(()=>caches.match('./')));return}
  if(u.pathname.includes('/data/')){
    e.respondWith(caches.open(V).then(async c=>{const m=await c.match(r);
      const net=fetch(r).then(res=>{if(res.ok)c.put(r,res.clone());return res}).catch(()=>m);
      if(m){e.waitUntil(net.catch(()=>{}));return m}return net}));return}
  e.respondWith(caches.open(V).then(async c=>{const m=await c.match(r);if(m&&u.search)return m;
    try{const res=await fetch(r);if(res.ok)c.put(r,res.clone());return res}catch(err){return m||Response.error()}}));
});
