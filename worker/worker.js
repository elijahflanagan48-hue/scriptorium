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
      if(p==='/api/me'){const uid=await auth(req,env);if(!uid)return json({error:'unauthorized'},401);const u=await env.DB.prepare('SELECT email FROM users WHERE id=?').bind(uid).first();return json({email:u&&u.email})}
      return json({ok:true,service:'scriptorium-api'});
    }catch(err){return json({error:'server_error'},500)}
  }
};
