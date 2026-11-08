// Scriptorium API: аккаунты и синхронизация на Cloudflare Workers + D1.
// Привязки (Bindings): DB (D1), секрет JWT_SECRET. Для писем восстановления: MAIL_URL (адрес Google Apps Script) и секрет MAIL_KEY.
// Необязательно: SIGNUP=closed — закрыть регистрацию.
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
let ready=false;
async function ensure(env){if(ready)return;await env.DB.batch([
env.DB.prepare('CREATE TABLE IF NOT EXISTS private(k TEXT PRIMARY KEY,v TEXT)'),
env.DB.prepare('CREATE TABLE IF NOT EXISTS codes(code TEXT PRIMARY KEY,label TEXT,uses INTEGER DEFAULT 0,max_uses INTEGER,created_at INTEGER)'),
env.DB.prepare('CREATE TABLE IF NOT EXISTS grants(user_id TEXT PRIMARY KEY,code TEXT,at INTEGER)')]);ready=true}
async function who(req,env){
  const uid=await auth(req,env);if(!uid)return null;await ensure(env);
  const u=await env.DB.prepare('SELECT email FROM users WHERE id=?').bind(uid).first();if(!u)return null;
  const owner=u.email===(env.OWNER||'elijah.flanagan48@gmail.com');let access=owner;
  if(!access)access=!!await env.DB.prepare('SELECT 1 FROM grants WHERE user_id=?').bind(uid).first();
  return{uid,email:u.email,owner,access};
}
const newCode=()=>{const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',r=crypto.getRandomValues(new Uint8Array(10));let c='';for(let i=0;i<10;i++){c+=A[r[i]%A.length];if(i===4)c+='-'}return c};
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
      if(p==='/api/forgot'||p==='/api/reset'){
        if(req.method!=='POST')return json({error:'method'},405);
        await env.DB.prepare('CREATE TABLE IF NOT EXISTS resets(email TEXT PRIMARY KEY,code_hash TEXT,exp INTEGER,tries INTEGER,sent_at INTEGER)').run();
        const body=await req.json();const e=String(body.email||'').trim().toLowerCase();
        if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e))return json({error:'Введите почту'},400);
        if(p==='/api/forgot'){
          const u=await env.DB.prepare('SELECT id FROM users WHERE email=?').bind(e).first();
          const r=await env.DB.prepare('SELECT sent_at FROM resets WHERE email=?').bind(e).first();
          if(r&&Date.now()-r.sent_at<60000)return json({error:'Подождите минуту перед повторной отправкой'},429);
          if(u&&env.MAIL_URL){
            const code=String(100000+(crypto.getRandomValues(new Uint32Array(1))[0]%900000));
            await env.DB.prepare('INSERT INTO resets(email,code_hash,exp,tries,sent_at) VALUES(?,?,?,0,?) ON CONFLICT(email) DO UPDATE SET code_hash=excluded.code_hash,exp=excluded.exp,tries=0,sent_at=excluded.sent_at').bind(e,await hmac(env.JWT_SECRET,'reset.'+e+'.'+code),Date.now()+15*60000,Date.now()).run();
            await fetch(env.MAIL_URL,{method:'POST',headers:{'content-type':'text/plain'},body:JSON.stringify({key:env.MAIL_KEY,to:e,subject:'Scriptorium: код восстановления пароля',body:'Ваш код для восстановления пароля: '+code+'\n\nКод действует 15 минут. Если вы не запрашивали восстановление, просто проигнорируйте это письмо.'})});
          }
          return json({ok:true});
        }
        const code=String(body.code||'').trim(),password=String(body.password||'');
        if(password.length<8)return json({error:'Пароль от 8 символов'},400);
        const r=await env.DB.prepare('SELECT code_hash,exp,tries FROM resets WHERE email=?').bind(e).first();
        if(!r||r.exp<Date.now()||r.tries>=5)return json({error:'Код недействителен или истёк. Запросите новый'},400);
        if(!same(await hmac(env.JWT_SECRET,'reset.'+e+'.'+code),r.code_hash)){await env.DB.prepare('UPDATE resets SET tries=tries+1 WHERE email=?').bind(e).run();return json({error:'Неверный код'},400)}
        const u=await env.DB.prepare('SELECT id FROM users WHERE email=?').bind(e).first();if(!u)return json({error:'Неверный код'},400);
        const salt=crypto.getRandomValues(new Uint8Array(16));
        await env.DB.prepare('UPDATE users SET salt=?,hash=? WHERE id=?').bind(b64(salt),await pbkdf2(password,salt),u.id).run();
        await env.DB.prepare('DELETE FROM resets WHERE email=?').bind(e).run();
        return json({token:await makeToken(env,u.id),email:e});
      }
      if(p==='/api/state'){
        const uid=await auth(req,env);if(!uid)return json({error:'unauthorized'},401);
        if(req.method==='GET'){const r=await env.DB.prepare('SELECT data,updated_at FROM state WHERE user_id=?').bind(uid).first();return json({data:r?JSON.parse(r.data):null,updated_at:r?r.updated_at:0})}
        if(req.method==='PUT'){const txt=await req.text();if(txt.length>2e6)return json({error:'too_large'},413);const {data}=JSON.parse(txt);
          await env.DB.prepare('INSERT INTO state(user_id,data,updated_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at').bind(uid,JSON.stringify(data),Date.now()).run();
          return json({ok:true})}
      }
      if(p==='/api/me'){const w=await who(req,env);if(!w)return json({error:'unauthorized'},401);return json({email:w.email,access:w.access,owner:w.owner})}
      if(p==='/api/redeem'){
        if(req.method!=='POST')return json({error:'method'},405);
        const w=await who(req,env);if(!w)return json({error:'unauthorized'},401);
        const {code}=await req.json();const c=String(code||'').trim().toUpperCase();
        const r=await env.DB.prepare('SELECT uses,max_uses FROM codes WHERE code=?').bind(c).first();
        if(!r||(r.max_uses&&r.uses>=r.max_uses))return json({error:'Неверный или уже использованный код'},400);
        if(!w.access){await env.DB.batch([env.DB.prepare('INSERT OR REPLACE INTO grants(user_id,code,at) VALUES(?,?,?)').bind(w.uid,c,Date.now()),env.DB.prepare('UPDATE codes SET uses=uses+1 WHERE code=?').bind(c)])}
        return json({ok:true});
      }
      if(p==='/api/p'){
        const w=await who(req,env);if(!w||!w.access)return json({error:'forbidden'},403);
        const r=await env.DB.prepare('SELECT v FROM private WHERE k=?').bind(url.searchParams.get('k')||'').first();
        if(!r)return json({error:'not_found'},404);
        return new Response(r.v,{headers:{...CORS,'content-type':'application/json','cache-control':'private, max-age=3600'}});
      }
      if(p.startsWith('/api/admin/')){
        const w=await who(req,env);if(!w||!w.owner)return json({error:'forbidden'},403);
        if(p==='/api/admin/code'&&req.method==='POST'){const b=await req.json();const code=newCode();
          await env.DB.prepare('INSERT INTO codes(code,label,uses,max_uses,created_at) VALUES(?,?,0,?,?)').bind(code,String(b.label||'').slice(0,60),+b.max||null,Date.now()).run();return json({code})}
        if(p==='/api/admin/codes'){const r=await env.DB.prepare('SELECT code,label,uses,max_uses FROM codes ORDER BY created_at DESC').all();const n=await env.DB.prepare('SELECT COUNT(*) AS n FROM private').first();return json({codes:r.results,private_count:n.n})}
        if(p==='/api/admin/revoke'&&req.method==='POST'){const {code}=await req.json();await env.DB.batch([env.DB.prepare('DELETE FROM grants WHERE code=?').bind(code),env.DB.prepare('DELETE FROM codes WHERE code=?').bind(code)]);return json({ok:true})}
        if(p==='/api/admin/private'&&req.method==='POST'){const {k,v}=await req.json();if(typeof k!=='string'||typeof v!=='string'||v.length>19e5)return json({error:'bad'},400);
          await env.DB.prepare('INSERT OR REPLACE INTO private(k,v) VALUES(?,?)').bind(k,v).run();return json({ok:true})}
        return json({error:'not_found'},404);
      }
      return json({ok:true,service:'scriptorium-api'});
    }catch(err){return json({error:'server_error'},500)}
  }
};
