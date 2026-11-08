// Scriptorium API: аккаунты и синхронизация на Cloudflare Workers + D1.
// Привязки (Bindings): DB (D1), секрет JWT_SECRET. Необязательно: SIGNUP=closed — закрыть регистрацию.
const enc=new TextEncoder();
const b64=b=>btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const unb64=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
const CORS={'access-control-allow-origin':'*','access-control-allow-headers':'authorization,content-type','access-control-allow-methods':'GET,PUT,POST,OPTIONS','access-control-max-age':'86400'};
const json=(o,status=200)=>new Response(JSON.stringify(o),{status,headers:{...CORS,'content-type':'application/json'}});
async function pbkdf2(pass,salt){const k=await crypto.subtle.importKey('raw',enc.encode(pass),'PBKDF2',false,['deriveBits']);return b64(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:100000},k,256))}
async function hmac(secret,msg){const k=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return b64(await crypto.subtle.sign('HMAC',k,enc.encode(msg)))}
async function makeToken(env,uid){const exp=Date.now()+90*864e5,body=uid+'.'+exp;return body+'.'+await hmac(env.JWT_SECRET,body)}
async function auth(req,env){
  const t=(req.headers.get('authorization')||'').replace(/^Bearer /,'');const [uid,exp,sig]=t.split('.');
  if(!uid||!exp||!sig||+exp<Date.now())return null;
  return sig===await hmac(env.JWT_SECRET,uid+'.'+exp)?uid:null;
}
const same=(a,b)=>{if(a.length!==b.length)return false;let r=0;for(let i=0;i<a.length;i++)r|=a.charCodeAt(i)^b.charCodeAt(i);return r===0};
export default{
  async fetch(req,env){
    if(req.method==='OPTIONS')return new Response(null,{headers:CORS});
    const url=new URL(req.url),p=url.pathname;
    if(!env.JWT_SECRET||!env.DB)return json({error:'server_not_configured'},500);
    try{
      if(p==='/api/signup'||p==='/api/login'){
        if(req.method!=='POST')return json({error:'method'},405);
        const {email,password}=await req.json();const e=String(email||'').trim().toLowerCase();
        if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)||String(password||'').length<8)return json({error:'Нужна почта и пароль от 8 символов'},400);
        if(p==='/api/signup'){
          if(env.SIGNUP==='closed')return json({error:'Регистрация закрыта'},403);
          if(await env.DB.prepare('SELECT 1 FROM users WHERE email=?').bind(e).first())return json({error:'Такая почта уже зарегистрирована'},409);
          const salt=crypto.getRandomValues(new Uint8Array(16)),id=crypto.randomUUID();
          await env.DB.prepare('INSERT INTO users(id,email,salt,hash,created_at) VALUES(?,?,?,?,?)').bind(id,e,b64(salt),await pbkdf2(password,salt),Date.now()).run();
          return json({token:await makeToken(env,id),email:e});
        }
        const u=await env.DB.prepare('SELECT id,salt,hash FROM users WHERE email=?').bind(e).first();
        if(!u||!same(await pbkdf2(password,unb64(u.salt)),u.hash))return json({error:'Неверная почта или пароль'},401);
        return json({token:await makeToken(env,u.id),email:e});
      }
      if(p==='/api/state'){
        const uid=await auth(req,env);if(!uid)return json({error:'unauthorized'},401);
        if(req.method==='GET'){const r=await env.DB.prepare('SELECT data,updated_at FROM state WHERE user_id=?').bind(uid).first();return json({data:r?JSON.parse(r.data):null,updated_at:r?r.updated_at:0})}
        if(req.method==='PUT'){const txt=await req.text();if(txt.length>2e6)return json({error:'too_large'},413);const {data}=JSON.parse(txt);
          await env.DB.prepare('INSERT INTO state(user_id,data,updated_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at').bind(uid,JSON.stringify(data),Date.now()).run();
          return json({ok:true})}
      }
      if(p==='/api/me'){const uid=await auth(req,env);if(!uid)return json({error:'unauthorized'},401);const u=await env.DB.prepare('SELECT email FROM users WHERE id=?').bind(uid).first();return json({email:u&&u.email})}
      return json({ok:true,service:'scriptorium-api'});
    }catch(err){return json({error:'server_error'},500)}
  }
};
