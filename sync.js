/* Личный кабинет и синхронизация между устройствами (Supabase). */
'use strict';
const Sync=(()=>{
  const cfg=window.SCRIPT_CFG||{};
  const enabled=!!(cfg.url&&cfg.key&&window.supabase);
  let sb=null,S=null,hooks=null,user=null,timer=null,busy=false,last=null,msg='';
  const TABLE='user_state';
  function init(state,h){
    S=state;hooks=h;if(!S.ts)S.ts={};if(!S.sts)S.sts=0;
    if(!enabled)return;
    sb=window.supabase.createClient(cfg.url,cfg.key,{auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    sb.auth.getSession().then(({data})=>{user=data.session?data.session.user:null;h.status();if(user)syncNow()});
    sb.auth.onAuthStateChange((ev,sess)=>{const u=sess?sess.user:null;const was=!!user;user=u;h.status();if(u&&!was)syncNow()});
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&user)syncNow()});
  }
  const ensureTs=()=>{
    for(const [t,store] of [['h','hl'],['n','notes'],['w','wnotes']])for(const k in S[store]||{}){const key=t+':'+k;if(!S.ts[key])S.ts[key]=1}
  };
  const payload=()=>({v:1,hl:S.hl,notes:S.notes,wnotes:S.wnotes||{},ts:S.ts,sts:S.sts||0,
    settings:{layout:S.layout,theme:S.theme,sel:S.sel,last:S.last,recent:S.recent}});
  function merge(R){
    let changed=false;const map={h:'hl',n:'notes',w:'wnotes'};
    if(!S.wnotes)S.wnotes={};
    const rts=R.ts||{};
    for(const k of new Set([...Object.keys(S.ts),...Object.keys(rts)])){
      const a=S.ts[k]||0,b=rts[k]||0;if(b<=a)continue;
      const store=map[k[0]],key=k.slice(2),rv=R[store]&&R[store][key];
      if(rv==null)delete S[store][key];else S[store][key]=rv;S.ts[k]=b;changed=true;
    }
    if((R.sts||0)>(S.sts||0)&&R.settings){const r=R.settings;
      if(r.layout)S.layout=r.layout;if(r.theme)S.theme=r.theme;if(Array.isArray(r.sel))S.sel=r.sel;if(r.last)S.last=r.last;if(Array.isArray(r.recent))S.recent=r.recent;
      S.sts=R.sts;changed=true}
    return changed;
  }
  async function syncNow(){
    if(!sb||!user||busy)return;busy=true;msg='';
    try{
      ensureTs();
      const {data,error}=await sb.from(TABLE).select('data').eq('user_id',user.id).maybeSingle();
      if(error)throw error;
      const remote=data&&data.data||null;
      const changed=remote?merge(remote):false;
      if(changed)hooks.applied();
      const body=payload();
      if(!remote||JSON.stringify(body)!==JSON.stringify(remote)){
        const {error:e2}=await sb.from(TABLE).upsert({user_id:user.id,data:body,updated_at:new Date().toISOString()});
        if(e2)throw e2;
      }
      last=new Date();
    }catch(e){msg='Не удалось синхронизировать: '+(e.message||e)}
    busy=false;hooks.status();
  }
  function changed(){if(!sb||!user)return;clearTimeout(timer);timer=setTimeout(syncNow,1800)}
  const wrap=async f=>{try{const {error}=await f();return error?error.message:''}catch(e){return String(e.message||e)}};
  return{
    enabled,init,changed,syncNow,
    get user(){return user},get last(){return last},get msg(){return msg},
    signIn:(email,password)=>wrap(()=>sb.auth.signInWithPassword({email,password})),
    signUp:(email,password)=>wrap(()=>sb.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname}})),
    magic:email=>wrap(()=>sb.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin+location.pathname}})),
    signOut:()=>wrap(()=>sb.auth.signOut())
  };
})();
