/* Личный кабинет и синхронизация между устройствами (Cloudflare Worker + D1). */
'use strict';
const Sync=(()=>{
  const cfg=window.SCRIPT_CFG||{};
  const enabled=!!cfg.api;const API=(cfg.api||'').replace(/\/$/,''),TK='scriptorium.token';
  let S=null,hooks=null,user=null,timer=null,busy=false,last=null,msg='';
  const tok=()=>{try{return localStorage.getItem(TK)||''}catch(e){return''}};
  const setTok=t=>{try{t?localStorage.setItem(TK,t):localStorage.removeItem(TK)}catch(e){}};
  async function api(path,method='GET',body){
    const r=await fetch(API+path,{method,headers:{'content-type':'application/json',...(tok()?{authorization:'Bearer '+tok()}:{})},body:body?JSON.stringify(body):undefined});
    let j={};try{j=await r.json()}catch(e){}
    if(!r.ok){const e=new Error(j.error||('HTTP '+r.status));e.status=r.status;throw e}
    return j;
  }
  function init(state,h){
    S=state;hooks=h;if(!S.ts)S.ts={};if(!S.sts)S.sts=0;
    if(!enabled)return;
    if(tok())api('/api/me').then(r=>{user={email:r.email,access:!!r.access,owner:!!r.owner};h.status();syncNow()}).catch(e=>{if(e.status===401)setTok('');h.status()});
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&user)syncNow()});
  }
  const ensureTs=()=>{
    for(const [t,store] of [['h','hl'],['n','notes'],['w','wnotes']])for(const k in S[store]||{}){const key=t+':'+k;if(!S.ts[key])S.ts[key]=1}
  };
  const payload=()=>({v:1,hl:S.hl,notes:S.notes,wnotes:S.wnotes||{},ts:S.ts,sts:S.sts||0,
    settings:{layout:S.layout,theme:S.theme,tAuto:S.tAuto||'',tDay:S.tDay,tNight:S.tNight,sel:S.sel,last:S.last,recent:S.recent,goal:S.goal,anim:S.anim,rd:S.rd||{},lrate:S.lrate||1,side:S.side!==false,noImm:!!S.noImm,calm:!!S.calm,lampOff:!!S.lampOff,rpos:S.rpos||{},plans:S.plans||{},bpos:S.bpos||{},rtxt:S.rtxt||{},rjust:S.rjust!==false,rnum:S.rnum!==false,best:S.bestStreak||0,celebrated:S.celebrated||''},days:S.days||{}});
  function merge(R){
    let changed=false;const map={h:'hl',n:'notes',w:'wnotes'};
    if(!S.wnotes)S.wnotes={};
    const rts=R.ts||{};
    for(const k of new Set([...Object.keys(S.ts),...Object.keys(rts)])){
      const a=S.ts[k]||0,b=rts[k]||0;if(b<=a)continue;
      const store=map[k[0]],key=k.slice(2),rv=R[store]&&R[store][key];
      if(rv==null)delete S[store][key];else S[store][key]=rv;S.ts[k]=b;changed=true;
    }
    if(R.days){S.days=S.days||{};for(const [k,v] of Object.entries(R.days)){const l=S.days[k]||(S.days[k]={s:0,c:{}});
      if((v.s||0)>(l.s||0)){l.s=v.s;changed=true}if(v.c){l.c=l.c||{};for(const [c,x] of Object.entries(v.c))if(x>(l.c[c]||0)){l.c[c]=x;changed=true}}}}
    if(R.settings&&(R.settings.best||0)>(S.bestStreak||0)){S.bestStreak=R.settings.best;changed=true}
    if(R.settings&&R.settings.celebrated&&R.settings.celebrated>(S.celebrated||'')){S.celebrated=R.settings.celebrated}
    if((R.sts||0)>(S.sts||0)&&R.settings){const r=R.settings;
      if(r.layout)S.layout=r.layout;if(r.theme)S.theme=r.theme;if(r.tAuto!==undefined)S.tAuto=r.tAuto;if(r.tDay)S.tDay=r.tDay;if(r.tNight)S.tNight=r.tNight;if(Array.isArray(r.sel))S.sel=r.sel;if(r.last)S.last=r.last;if(Array.isArray(r.recent))S.recent=r.recent;if(r.goal)S.goal=r.goal;if(r.anim)S.anim=r.anim;if(r.rd)S.rd=r.rd;if(r.lrate)S.lrate=r.lrate;for(const k of ['side','noImm','calm','lampOff','rjust','rnum'])if(r[k]!==undefined)S[k]=r[k];if(r.rtxt)S.rtxt=r.rtxt;if(r.plans)S.plans=r.plans;if(r.bpos){S.bpos=S.bpos||{};for(const[k,v]of Object.entries(r.bpos))if(!S.bpos[k]||(v.t||0)>(S.bpos[k].t||0))S.bpos[k]=v}if(r.rpos){S.rpos=S.rpos||{};for(const[k,v]of Object.entries(r.rpos))if(!S.rpos[k]||(v.t||0)>(S.rpos[k].t||0))S.rpos[k]=v}
      S.sts=R.sts;changed=true}
    return changed;
  }
  async function syncNow(){
    if(!enabled||!user||busy)return;busy=true;msg='';
    try{
      ensureTs();
      const got=await api('/api/state');
      const remote=got.data||null;
      const changed=remote?merge(remote):false;
      if(changed)hooks.applied();
      const body=payload();
      if(!remote||JSON.stringify(body)!==JSON.stringify(remote))await api('/api/state','PUT',{data:body});
      last=new Date();
    }catch(e){if(e.status===401){setTok('');user=null}msg='Не удалось синхронизировать: '+(e.message||e)}
    busy=false;hooks.status();
  }
  function changed(){if(!enabled||!user)return;clearTimeout(timer);timer=setTimeout(syncNow,1800)}
  const login=async r=>{setTok(r.token);let m={};try{m=await api('/api/me')}catch(e){}user={email:m.email||r.email,access:!!m.access,owner:!!m.owner};hooks.status();syncNow()};
  const fail=e=>e.message==='Failed to fetch'?'Нет связи с сервером':e.message;
  const auth=async(path,email,password)=>{try{await login(await api(path,'POST',{email,password}));return''}catch(e){return fail(e)}};
  return{
    enabled,init,changed,syncNow,
    get user(){return user},get last(){return last},get msg(){return msg},
    signIn:(email,password)=>auth('/api/login',email,password),
    signUp:(email,password)=>auth('/api/signup',email,password),
    forgot:async email=>{try{await api('/api/forgot','POST',{email});return''}catch(e){return fail(e)}},
    reset:async(email,code,password)=>{try{await login(await api('/api/reset','POST',{email,code,password}));return''}catch(e){return fail(e)}},
    redeem:async code=>{try{await api('/api/redeem','POST',{code});const m=await api('/api/me');user={...user,access:!!m.access,owner:!!m.owner};hooks.status();return''}catch(e){return fail(e)}},
    pget:key=>api('/api/p?k='+encodeURIComponent(key)),
    admin:(path,body)=>api('/api/admin/'+path,body?'POST':'GET',body),
    signOut:async()=>{setTok('');user=null;hooks.status();return''}
  };
})();
