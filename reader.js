'use strict';
/* Ad fontes: «Читалка» — спокойное чтение книг подряд, как в электронной книге.
   Два источника: сочинения библиотеки (Флавий, Евсевий, Филон, отцы…) и свои книги
   (EPUB, FB2, DOCX, TXT, HTML), которые хранятся на этом устройстве (IndexedDB).
   Позиция чтения запоминается для каждой книги. */
const Rdr=(()=>{
  const P=()=>$('#page');
  let B=null,POS=null,CH=null,saveT=0;
  const RP=()=>S.rpos||(S.rpos={});
  const num=k=>{const m=/^\d+/.exec(k);return m?+m[0]:0};
  const cmp=(a,b)=>num(a)-num(b)||(a<b?-1:a>b?1:0);

  /* ---------- хранилище своих книг ---------- */
  let dbp=null;
  const db=()=>dbp||(dbp=new Promise((ok,no)=>{const r=indexedDB.open('adfontes-books',1);
    r.onupgradeneeded=()=>{const d=r.result;d.createObjectStore('meta',{keyPath:'id'});d.createObjectStore('books',{keyPath:'id'})};
    r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)}));
  const tx=async(st,mode,fn)=>{const d=await db();return new Promise((ok,no)=>{const t=d.transaction(st,mode);const res=fn(t);t.oncomplete=()=>ok(res&&res.result!==undefined?res.result:res);t.onerror=()=>no(t.error)})};
  const metas=()=>tx('meta','readonly',t=>t.objectStore('meta').getAll()).then(r=>(r||[]).sort((a,b)=>(b.added||0)-(a.added||0))).catch(()=>[]);
  const getBook=id=>tx('books','readonly',t=>t.objectStore('books').get(id));
  const putBook=b=>tx(['meta','books'],'readwrite',t=>{t.objectStore('books').put(b);t.objectStore('meta').put({id:b.id,title:b.title,author:b.author,fmt:b.fmt,added:b.added,n:b.chapters.length,lang:b.lang})});
  const delBook=id=>tx(['meta','books'],'readwrite',t=>{t.objectStore('books').delete(id);t.objectStore('meta').delete(id)});

  /* ---------- разбор файлов ---------- */
  async function unzip(buf){
    const v=new DataView(buf),u8=new Uint8Array(buf);let e=-1;
    for(let i=buf.byteLength-22;i>=Math.max(0,buf.byteLength-66000);i--)if(v.getUint32(i,true)===0x06054b50){e=i;break}
    if(e<0)throw new Error('zip');
    const n=v.getUint16(e+10,true);let o=v.getUint32(e+16,true);const files={},dec=new TextDecoder();
    for(let i=0;i<n;i++){
      if(v.getUint32(o,true)!==0x02014b50)break;
      const m=v.getUint16(o+10,true),cs=v.getUint32(o+20,true),nl=v.getUint16(o+28,true),xl=v.getUint16(o+30,true),cl=v.getUint16(o+32,true),lo=v.getUint32(o+42,true);
      const name=dec.decode(u8.subarray(o+46,o+46+nl));
      files[name]=async()=>{const ln=v.getUint16(lo+26,true),lx=v.getUint16(lo+28,true),st=lo+30+ln+lx,raw=u8.slice(st,st+cs);
        if(m===0)return raw.buffer;
        return new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer()};
      o+=46+nl+xl+cl;
    }
    return files;
  }
  const txt=async(f)=>new TextDecoder().decode(await f());
  const clean=s=>(s||'').replace(/­/g,'').replace(/[ \t ]+/g,' ').replace(/\s*\n\s*/g,' ').trim();
  /* из HTML/XHTML-документа: заголовки начинают главы, абзацы — блоки текста */
  function blocks(doc,into,fallbackTitle){
    const sel='h1,h2,h3,h4,p,blockquote,li,pre,dd,dt,div.p,div.para';
    const els=[...doc.querySelectorAll(sel)].filter(el=>!el.parentElement.closest('p,li,blockquote'));
    let ch=null;const start=t=>{ch={t:t||fallbackTitle||'',p:[]};into.push(ch)};
    for(const el of els){
      const tag=el.tagName.toLowerCase(),t=clean(el.textContent);if(!t)continue;
      if(/^h[1-4]$/.test(tag)){if(!ch||ch.p.length)start(t);else ch.t=ch.t&&ch.t!==fallbackTitle?ch.t+'. '+t:t;continue}
      if(!ch)start();ch.p.push(t);
    }
    if(!els.length){const t=clean(doc.body&&doc.body.textContent);if(t){start();ch.p.push(t)}}
  }
  const xml=(s,type='application/xhtml+xml')=>{let d=new DOMParser().parseFromString(s,type);if(d.querySelector('parsererror'))d=new DOMParser().parseFromString(s,'text/html');return d};
  async function parseEpub(buf){
    const z=await unzip(buf),ci=xml(await txt(z['META-INF/container.xml']),'application/xml');
    const opfPath=ci.querySelector('rootfile').getAttribute('full-path'),base=opfPath.includes('/')?opfPath.replace(/[^/]*$/,''):'';
    const opf=xml(await txt(z[opfPath]),'application/xml');
    const g=s=>{const el=opf.getElementsByTagName(s)[0];return el?clean(el.textContent):''};
    const man={};for(const it of opf.getElementsByTagName('item'))man[it.getAttribute('id')]=it.getAttribute('href');
    const chapters=[];
    for(const r of opf.getElementsByTagName('itemref')){
      const href=man[r.getAttribute('idref')];if(!href)continue;
      const p=decodeURIComponent(base+href.split('#')[0]),f=z[p]||z[p.replace(/^\.\//,'')];if(!f)continue;
      blocks(xml(await txt(f)),chapters,'');
    }
    return{title:g('dc:title')||g('title'),author:g('dc:creator')||g('creator'),lang:g('dc:language'),chapters};
  }
  function parseFb2(s){
    const d=xml(s,'application/xml'),q=(el,n)=>[...el.children].filter(x=>x.localName===n);
    const ti=d.getElementsByTagName('title-info')[0],tt=ti&&ti.getElementsByTagName('book-title')[0];
    const au=ti&&ti.getElementsByTagName('author')[0],an=au?['first-name','middle-name','last-name'].map(n=>{const x=au.getElementsByTagName(n)[0];return x?x.textContent.trim():''}).filter(Boolean).join(' '):'';
    const chapters=[];
    const walk=(sec,pref)=>{
      const tl=q(sec,'title')[0],t=tl?clean([...tl.children].map(x=>x.textContent).join('. ')||tl.textContent):'';
      const name=[pref,t].filter(Boolean).join(' · ');
      const kids=q(sec,'section');let cur=null;
      for(const el of sec.children){
        const n=el.localName;
        if(['p','subtitle','cite','epigraph','poem','text-author','empty-line'].includes(n)){
          if(!cur){cur={t:name,p:[]};chapters.push(cur)}
          if(n==='poem'){for(const st of el.getElementsByTagName('stanza'))cur.p.push([...st.getElementsByTagName('v')].map(v=>clean(v.textContent)).join('\n'))}
          else{const x=clean(el.textContent);if(x)cur.p.push(x)}
        }
      }
      kids.forEach(k=>walk(k,kids.length&&!cur?'':''));
    };
    for(const b of d.getElementsByTagName('body')){if(b.getAttribute('name')==='notes')continue;q(b,'section').forEach(s=>walk(s,''))}
    return{title:tt?tt.textContent.trim():'',author:an,lang:(ti&&ti.getElementsByTagName('lang')[0]||{}).textContent,chapters};
  }
  async function parseDocx(buf){
    const z=await unzip(buf),d=xml(await txt(z['word/document.xml']),'application/xml');
    const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main',chapters=[];let ch=null;
    for(const p of d.getElementsByTagNameNS(W,'p')){
      const t=clean([...p.getElementsByTagNameNS(W,'t')].map(x=>x.textContent).join(''));if(!t)continue;
      const st=p.getElementsByTagNameNS(W,'pStyle')[0],sv=st?st.getAttributeNS(W,'val')||st.getAttribute('w:val')||'':'';
      if(/heading|заголов|title/i.test(sv)){if(!ch||ch.p.length){ch={t,p:[]};chapters.push(ch)}else ch.t+='. '+t;continue}
      if(!ch){ch={t:'',p:[]};chapters.push(ch)}ch.p.push(t);
    }
    let title='';try{const c=xml(await txt(z['docProps/core.xml']),'application/xml');title=(c.getElementsByTagName('dc:title')[0]||{}).textContent||''}catch(e){}
    return{title,author:'',chapters};
  }
  function parseTxt(buf){
    let s=new TextDecoder('utf-8').decode(buf);
    if((s.match(/�/g)||[]).length>20)s=new TextDecoder('windows-1251').decode(buf);
    s=s.replace(/\r\n?/g,'\n');
    const paras=/\n\s*\n/.test(s)?s.split(/\n\s*\n+/):s.split('\n');
    const head=t=>t.length<90&&(/^(глава|часть|книга|раздел|слово|chapter|part|book|section)(?=[\s.:\d]|$)/i.test(t)||/^[IVXLC]+\.?$/.test(t)||(t.length>3&&t===t.toUpperCase()&&/\p{L}/u.test(t)));
    const chapters=[];let ch=null;
    for(const raw of paras){const t=clean(raw);if(!t)continue;
      if(head(t)){if(!ch||ch.p.length){ch={t,p:[]};chapters.push(ch)}else ch.t+='. '+t;continue}
      if(!ch){ch={t:'',p:[]};chapters.push(ch)}ch.p.push(t)}
    let title='';if(chapters[0]&&chapters[0].t.includes('. ')&&(()=>{const x=chapters[0].t.split('. ')[0];return x===x.toUpperCase()})()){const i=chapters[0].t.indexOf('. ');title=chapters[0].t.slice(0,i);chapters[0].t=chapters[0].t.slice(i+2)}
    return{title,author:'',chapters};
  }
  function tidy(bk,fname){
    let ch=bk.chapters.filter(c=>c.p.length||c.t);
    // пустые заголовки — склеиваем с соседями; огромные главы делим на части
    const out=[];for(const c of ch){if(!c.p.length&&out.length&&!out[out.length-1].p.length){out[out.length-1].t+='. '+c.t;continue}if(!c.p.length&&out.length){out.push(c);continue}out.push(c)}
    ch=out.filter(c=>c.p.length);
    const fin=[];
    for(const c of ch){if(c.p.length<=260){fin.push(c);continue}
      for(let i=0;i<c.p.length;i+=200)fin.push({t:(c.t||'Часть')+(i?` (${i/200+1})`:''),p:c.p.slice(i,i+200)})}
    fin.forEach((c,i)=>{if(!c.t)c.t=fin.length===1?'':`Часть ${i+1}`});
    const title=(bk.title||fname.replace(/\.[^.]+$/,'').replace(/[_]+/g,' ')).trim();
    return{id:'b'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),title,author:(bk.author||'').trim(),lang:bk.lang||'',chapters:fin,added:Date.now()};
  }
  async function importFile(file){
    const name=file.name,ext=(name.match(/\.([^.]+)$/)||[])[1]?.toLowerCase()||'',buf=await file.arrayBuffer();
    let bk;
    if(ext==='epub')bk=await parseEpub(buf);
    else if(ext==='fb2')bk=parseFb2(new TextDecoder().decode(buf));
    else if(ext==='zip'){const z=await unzip(buf),k=Object.keys(z).find(x=>/\.fb2$/i.test(x));if(!k)throw new Error('В архиве нет файла FB2');bk=parseFb2(await txt(z[k]))}
    else if(ext==='docx')bk=await parseDocx(buf);
    else if(ext==='html'||ext==='htm'||ext==='xhtml'){const c=[];const d=xml(new TextDecoder().decode(buf),'text/html');blocks(d,c,'');bk={title:(d.title||'').trim(),author:'',chapters:c}}
    else if(ext==='txt'||ext==='md'||!ext)bk=parseTxt(buf);
    else if(ext==='pdf')throw new Error('PDF пока не поддерживается: в нём нет разметки абзацев. Сохраните книгу как EPUB, FB2, DOCX или TXT.');
    else throw new Error('Этот формат не поддерживается. Подойдут EPUB, FB2, DOCX, TXT, HTML.');
    const b=tidy(bk,name);
    if(!b.chapters.length)throw new Error('В файле не нашлось текста.');
    await putBook(b);return b;
  }


  /* ---------- оформление текста сочинений ---------- */
  const C0={josephus:'Содержание книги',lxx:'Пролог',apocrypha:'Пролог'};
  const plainV=v=>Array.isArray(v)?v.map(x=>x[0]).join(' '):String(v||'');
  function titleOf(v){
    let s=plainV(v).trim();if(!s)return{t:''};
    s=s.replace(/^CHAPTER\s+[\w.]+\.?\s*/i,'').replace(/^Book\s+[IVXLC\d]+\.?\s*/i,'').replace(/^ΚΕΦ(?:ΑΛΑΙΟΝ)?\.?\s*[\wͰ-Ͽ]+\.?\s*/,'').replace(/\s+/g,' ').trim();
    const caps=/\p{Lu}/u.test(s)&&s===s.toUpperCase();
    return{t:s.replace(/\.$/,caps?'':'.').replace(/\.$/,''),caps};
  }
  /* английский Уистон: заголовок главы стоит прописными в начале первого раздела */
  function capsHead(s){
    const tk=s.split(/\s+/);let i=0;const isC=x=>/\p{L}/u.test(x)&&x===x.toUpperCase();
    while(i<tk.length&&(isC(tk[i])||!/\p{L}/u.test(tk[i])))i++;
    if(i<5||i>=tk.length)return null;
    const t=tk.slice(0,i-1).join(' ').replace(/[,;:.]+$/,''),first=tk[i-1];
    return{t,rest:first.charAt(0)+first.slice(1).toLowerCase()+' '+tk.slice(i).join(' ')};
  }
  const END_C=/[.!?…»"”’)\]]\s*$/,END_G=/[.;!?…»”)\]]\s*$/;
  /* разделы сочинения → абзацы: новый абзац только там, где кончилось предложение
     и (в русском и английском) следующий раздел начинается с заглавной; стихотворные главы — строками */
  function flow(items,lang){
    const cased=lang==='ru'||lang==='en',END=cased?END_C:END_G;
    const txt=items.map(x=>plainV(x.v).trim());
    const n=txt.length||1,avg=txt.reduce((a,s)=>a+s.length,0)/n,open=txt.filter(s=>s&&!END.test(s)).length/n;
    const up=s=>/^[«"„“'(\[—–-]?\s*[\p{Lu}\d]/u.test(s);
    if(lang!=='heb'&&n>4&&(avg<115&&open>.3||avg<100)){/* поэзия: строфы до конца предложения */
      const out=[];let cur=null;items.forEach((x,i)=>{if(!txt[i])return;if(!cur){cur={kind:'stz',items:[]};out.push(cur)}cur.items.push(x);if(END.test(txt[i])&&cur.items.length>=2)cur=null});return out}
    const out=[];let cur=null,len=0;
    items.forEach((x,i)=>{const s=txt[i];if(!s)return;
      const prev=cur&&txt[items.indexOf(cur.items[cur.items.length-1])];
      const brk=!cur||(END.test(prev)&&(!cased||up(s)))||(len>2600&&END.test(prev));
      if(brk){cur={kind:'p',items:[]};out.push(cur);len=0}
      cur.items.push(x);len+=s.length});
    return out;
  }
  const tidyText=(s,lang)=>{s=String(s).replace(/[ \t ]{2,}/g,' ').replace(/\s+([,.;:!?»)])/g,'$1').replace(/([«(])\s+/g,'$1');
    if(lang==='ru'||lang==='en')s=s.replace(/ - /g,' — ').replace(/--/g,'—');return s};

  /* ---------- источники ---------- */
  const LW={josephus:'Глава',philo:'Глава',lxx:'Глава',apocrypha:'Глава',qumran:'Фрагмент',eusebius:'Глава',apfathers:'Глава'};
  function libText(w){
    const pick=(S.rtxt||{})[w.id];let t=w.texts.find(x=>x.tid===pick);
    if(!t){const ok=x=>x.access==='public'||Lib.hasAcc();
      t=w.texts.find(x=>x.lang==='ru'&&ok(x))||w.texts.find(x=>x.lang==='en'&&ok(x))||w.texts.find(ok)||w.texts[0]}
    return t;
  }
  async function libSrc(id){
    const w=await Lib.man(id);if(!w)return null;const cache={};
    const t=()=>libText(w);
    const load=async pid=>{const k=t().tid+'/'+pid;if(!(k in cache))cache[k]=t().parts.includes(pid)?await Lib.textOf(w,t(),pid):null;return cache[k]};
    const parts=()=>w.parts.filter(p=>t().parts.includes(p.id));
    return{key:'lib:'+id,kind:'lib',w,title:w.title_ru,author:'',
      texts:w.texts,text:t,
      async chapter(pos){
        let [pid,c]=(pos||'').split('|');const ps=parts();
        if(!ps.some(p=>p.id===pid))pid=ps[0]&&ps[0].id;if(!pid)return{empty:true};
        const d=await load(pid);if(!d||d.locked)return{locked:!!(d&&d.locked)||t().access==='account',pid,ptitle:Lib.part(w,pid)};
        const ks=Object.keys(d).sort(cmp);
        if(c==='$last')c=ks[ks.length-1];if(!ks.includes(c))c=ks[0];
        const sec=d[c]||{},sk=Object.keys(sec).sort(cmp).filter(k=>k!=='0'),lang=t().lang;
        const items=sk.map(k=>({n:w.id==='philo'?'§'+k:k,v:sec[k]}));
        let inl=null;if(items.length&&lang==='en'&&typeof items[0].v==='string'){const sp=capsHead(items[0].v);if(sp){inl=sp.t;items[0]={n:items[0].n,v:sp.rest}}}
        const i=ks.indexOf(c),pi=ps.findIndex(p=>p.id===pid);
        const prev=i>0?pid+'|'+ks[i-1]:pi>0?ps[pi-1].id+'|$last':null;
        const next=i<ks.length-1?pid+'|'+ks[i+1]:pi<ps.length-1?ps[pi+1].id+'|':null;
        const pt=Lib.part(w,pid),one=ks.length===1,LWd=LW[w.id]||'Глава';
        const lab=k=>k==='0'?(C0[w.id]||'Вступление'):`${LWd} ${k}`;
        const ttl=inl?{t:inl,caps:true}:titleOf(sec['0']);let h1,label,sub='',caps=false;
        if(one){h1=pt;label=w.title_ru;if(ttl.t){sub=ttl.t;caps=ttl.caps}}
        else if(ttl.t&&!ttl.caps&&ttl.t.length<=150){h1=ttl.t;label=lab(c)}
        else{h1=lab(c);label='';if(ttl.t){sub=ttl.t;caps=ttl.caps}}
        const nt=next?(next.startsWith(pid+'|')?(()=>{const k=next.split('|')[1],x=titleOf((d[k]||{})['0']);return lab(k)+(x.t&&!x.caps&&x.t.length<90?' · '+x.t:'')})():Lib.part(w,next.split('|')[0])):'';
        return{pos:pid+'|'+c,head:one?'':pt,label,title:h1,sub,caps,blocks:flow(items,lang),prev,next,nextT:nt,
          lang,mini:`${pt.length>26?pt.slice(0,25)+'…':pt}${one?'':' · '+c}`,nums:true,
          src:`${t().name}. ${t().license||''}`};
      },
      async toc(pos){const [pid]=(pos||'').split('|');const ps=parts();let kids=null;
        try{const d=await load(pid);if(d&&!d.locked){const ks=Object.keys(d).sort(cmp);if(ks.length>1)kids=ks.map(k=>{const x=titleOf((d[k]||{})['0']);
          return{pos:pid+'|'+k,t:(k==='0'?(C0[w.id]||'Вступление'):`${LW[w.id]||'Глава'} ${k}`),d:x.t&&!x.caps?x.t:'',on:pos===pid+'|'+k}})}}catch(e){}
        return ps.map(p=>({pos:p.id+'|',t:p.title_ru,on:p.id===pid,kids:p.id===pid?kids:null}))}};
  }
  async function ownSrc(id){
    const b=await getBook(id);if(!b)return null;
    return{key:'own:'+id,kind:'own',title:b.title,author:b.author,book:b,
      async chapter(pos){let i=Math.max(0,Math.min(b.chapters.length-1,+pos||0));const c=b.chapters[i];
        return{pos:String(i),head:b.title,title:c.t||'',blocks:c.p.map(v=>({kind:'p',items:[{v}]})),prev:i>0?String(i-1):null,next:i<b.chapters.length-1?String(i+1):null,
          nextT:i<b.chapters.length-1?b.chapters[i+1].t:'',lang:b.lang,mini:`${b.title.length>22?b.title.slice(0,21)+'…':b.title} · ${i+1}/${b.chapters.length}`,nums:false,
          frac:`Глава ${i+1} из ${b.chapters.length}`}},
      async toc(pos){return b.chapters.map((c,i)=>({pos:String(i),t:c.t||`Часть ${i+1}`,on:String(i)===String(pos)}))}};
  }

  /* ---------- показ ---------- */
  const words=v=>Array.isArray(v)?v.map(x=>`<span class="w" data-f="${esc(x[0])}" data-s="${esc(x[1]||'')}">${esc(x[0])}</span>`).join(' '):esc(v).replace(/\n/g,'<br>');
  async function show(src,pos,keepY){
    B=src;const box=P();
    if(S.sec!=='lib')showSec('lib');
    document.body.classList.add('bkmode');
    const ch=await B.chapter(pos);CH=ch;POS=ch.pos||pos;
    const rp=RP()[B.key]||{};const y=keepY?rp.y||0:0;
    RP()[B.key]={pos:POS,y,t:Date.now(),title:B.title,lbl:ch.mini||''};S.rlast=B.key;touchSettings();save();
    const lang=ch.lang==='grc'?' lang="grc"':ch.lang==='heb'?' lang="he" dir="rtl"':ch.lang==='en'?' lang="en"':' lang="ru"';
    const tsel=B.kind==='lib'?`<label class="bksel"><span>Текст</span><select data-bktext>${B.texts.map(t=>`<option value="${esc(t.tid)}"${t.tid===B.text().tid?' selected':''}>${esc(Lib.lbl(t))}${t.access==='account'&&!Lib.hasAcc()?' · после входа':''}</option>`).join('')}</select></label>`:'';
    let h=`<div class="pg bk-pg"><div class="bkbar"><button class="mini" data-bk="back">‹ Полки</button><span class="bkbt">${esc(B.title)}</span><span class="spacer"></span>${tsel}<button class="mini" data-bk="toc">Оглавление</button><button class="mini bkaa" data-bk="aa" aria-label="Вид текста">Аа</button></div>`;
    if(ch.locked)h+=`<div class="bkt"><div class="lnote warm">Этот текст открывается после входа в личный кабинет с доступом. <button class="mini" data-bk="acc">Войти</button></div></div>`;
    else if(ch.empty)h+=`<p class="hint">Здесь пока нет текста.</p>`;
    else{
      const L=ch.lang||'ru';
      const num=(n,first)=>n==null?'':first?`<span class="bkn">${esc(n)}</span>`:`<sup class="bks">${esc(n)}</sup>`;
      const body=v=>Array.isArray(v)?words(v):esc(tidyText(v,L)).replace(/\n/g,'<br>');
      let pi=0;
      const bl=ch.blocks.map((b,bi)=>{
        if(b.kind==='stz')return `<div class="bkstz" data-i="${pi++}">${b.items.map(x=>`<div class="bkl">${num(x.n,true)}${body(x.v)}</div>`).join('')}</div>`;
        return `<p data-i="${pi++}"${bi===0?' class="first"':''}>${b.items.map((x,k)=>(bi===0&&k===0?'':num(x.n,k===0))+body(x.v)).join(' ')}</p>`}).join('');
      h+=`<article class="bkt${(S.rjust===undefined?!isM():S.rjust)?' just':''}${S.rnum===false||!ch.nums?' nonum':''}"${lang}>
        <header class="bkh">${ch.head?`<small>${esc(ch.head)}${ch.frac?' · '+esc(ch.frac):''}</small>`:ch.frac?`<small>${esc(ch.frac)}</small>`:''}${ch.label?`<span class="bklab">${esc(ch.label)}</span>`:''}${ch.title?`<h1>${esc(ch.title)}</h1>`:''}${ch.sub?`<p class="bksub${ch.caps?' caps':''}">${esc(ch.caps?ch.sub.toLowerCase():ch.sub)}</p>`:''}<i class="bkorn" aria-hidden="true"></i></header>
        ${bl}
        <nav class="bknav">${ch.prev?`<button class="bkprev" data-bk="prev">‹ Назад</button>`:'<span></span>'}${ch.next?`<button class="bknext" data-bk="next"><small>Дальше</small>${esc(ch.nextT||'Следующая глава')} ›</button>`:'<span class="bkend">Конец книги</span>'}</nav>
        ${ch.src?`<div class="bksrc">${esc(ch.src)}</div>`:''}
      </article>`;
    }
    box.innerHTML=h+'</div>';
    const mt=$('#miniT');if(mt)mt.textContent=ch.mini||B.title;
    if(y){const el=box.querySelector(`.bkt [data-i="${y}"]`);if(el){scrollTo(0,el.getBoundingClientRect().top+scrollY-90);return}}
    scrollTo(0,0);
  }
  async function openLib(id,pos){const s=await libSrc(id);if(!s)return;const rp=RP()['lib:'+id];show(s,pos||(rp&&rp.pos)||'',!pos&&!!rp)}
  async function openOwn(id){const s=await ownSrc(id);if(!s){alert('Книга не найдена на этом устройстве');return}const rp=RP()['own:'+id];show(s,rp?rp.pos:'0',!!rp)}
  /* запоминаем абзац, на котором остановились */
  addEventListener('scroll',()=>{
    if(!B||!document.body.classList.contains('bkmode'))return;
    clearTimeout(saveT);saveT=setTimeout(()=>{
      const ps=$$('.bkt [data-i]');let y=0;for(const p of ps){if(p.getBoundingClientRect().bottom>100){y=+p.dataset.i;break}}
      const r=RP()[B.key];if(r&&r.pos===POS&&r.y!==y){r.y=y;r.t=Date.now();save()}
    },400);
  },{passive:true});

  /* ---------- окна ---------- */
  async function toc(){
    if(!B)return;const list=await B.toc(POS);
    openModal(`<h3>${esc(B.title)}</h3>${B.author?`<p class="hint">${esc(B.author)}</p>`:''}<div class="bktoc">${list.map(x=>`<button data-bkgo="${esc(x.pos)}" class="${x.on?'on':''}">${esc(x.t)}</button>`+(x.kids?`<div class="bkkids${x.kids.some(k=>k.d)?' long':''}">${x.kids.map(k=>`<button data-bkgo="${esc(k.pos)}" class="${k.on?'on':''}"><b>${esc(k.t)}</b>${k.d?`<small>${esc(k.d)}</small>`:''}</button>`).join('')}</div>`:'')).join('')}</div>`+
      (B.kind==='own'?`<div class="mlist" style="margin-top:16px"><button data-bk="del" class="danger">Удалить книгу с этого устройства</button></div>`:''),{drop:1});
    const on=$('#sheet .bktoc button.on:last-of-type')||$('#sheet .bktoc .on');if(on){const sh=$('#sheet');sh.scrollTop=on.offsetTop-sh.clientHeight/2}
  }
  function aa(keep){
    const r=rd();const seg=(k,cur,opts)=>`<div class="rseg">${opts.map(([v,n])=>`<button data-bkrd="${k}" data-v="${v}" class="${String(cur)===String(v)?'on':''}">${n}</button>`).join('')}</div>`;
    const h=`<h3>Вид текста</h3><h5>Размер</h5>${seg('fs',r.fs,[16,18,20,22,25,28].map(s=>[s,`<span style="font-size:${Math.round(s*.7)}px">А</span>`]))}
      <h5>Шрифт</h5>${seg('font',r.font,[['serif','С засечками'],['sans','Без засечек']])}
      <h5>Интервал</h5>${seg('lh',r.lh,[[1.5,'Плотно'],[1.75,'Обычно'],[2,'Свободно']])}
      <h5>Ширина строки</h5>${seg('width',r.width,[['narrow','Узкая'],['normal','Обычная'],['wide','Широкая']])}
      <h5>Выравнивание</h5>${seg('just',(S.rjust===undefined?!isM():S.rjust)?1:0,[[1,'По ширине'],[0,'По левому краю']])}
      ${B&&B.kind==='lib'?`<h5>Номера разделов</h5>${seg('num',S.rnum===false?0:1,[[1,'Показывать'],[0,'Скрыть']])}`:''}
      <h5>Оформление</h5><div class="thquick">${THEMES.map(t=>`<button data-bkth="${t.id}" title="${t.name}" aria-label="${t.name}" class="${effTheme()===t.id?'on':''}" style="background:${t.v.paper};color:${t.v.ink};border-color:${t.v.line}"><span style="background:${t.v.accent}"></span></button>`).join('')}</div>`;
    if(keep&&!$('#modal').hidden){const sc=$('#sheet').scrollTop;$('#sheet').innerHTML=h;$('#sheet').scrollTop=sc}else openModal(h);
  }

  /* ---------- полка «Мои книги» ---------- */
  const hue=s=>{let h=0;for(const c of s)h=(h*31+c.charCodeAt(0))%360;return h};
  async function shelf(){
    const box=$('#mybooks');if(!box)return;const ms=await metas();
    const reading=Object.entries(RP()).filter(([k])=>k.startsWith('lib:')).sort((a,b)=>b[1].t-a[1].t).slice(0,4);
    const prog=k=>{const r=RP()[k];return r?r.pos:null};
    box.innerHTML=`<div class="shelf"><h2>Читалка</h2><span>EPUB, FB2, DOCX, TXT — книги хранятся на этом устройстве</span></div><div class="lrow">`+
      reading.map(([k,r])=>`<button class="lcard" data-bkopen="${esc(k)}"><div class="cv bkcv" style="background:hsl(${hue(k)} 45% 42%)"><b>${esc((r.title||'').slice(0,8))}</b></div><div class="bd"><span class="t">${esc(r.title||'')}</span><span class="s">Продолжить: ${esc(r.lbl||'')}</span><span class="st ok">Читаю</span></div></button>`).join('')+
      ms.map(m=>{const p=prog('own:'+m.id),i=p!=null?+p+1:0;return `<button class="lcard" data-bkopen="own:${esc(m.id)}"><div class="cv bkcv" style="background:hsl(${hue(m.title)} 40% 40%)"><b>${esc(m.title.slice(0,10))}</b></div><div class="bd"><span class="t">${esc(m.title)}</span><span class="s">${m.author?esc(m.author)+' · ':''}${i?`глава ${i} из ${m.n}`:`${m.n} ${m.n%10===1&&m.n%100!==11?'глава':'глав'}`}</span><span class="st ${i?'ok':''}">${(m.fmt||'').toUpperCase()}</span></div></button>`}).join('')+
      `<label class="lcard bkadd"><div class="cv"><b>+</b></div><div class="bd"><span class="t">Загрузить книгу</span><span class="s">Комментарии, отцы, любые книги для чтения</span></div><input type="file" accept=".epub,.fb2,.zip,.docx,.txt,.md,.html,.htm" hidden data-bkfile></label></div>`;
  }

  /* ---------- события ---------- */
  document.addEventListener('click',async e=>{
    const t=e.target;
    const op=t.closest('[data-bkopen]');if(op){const k=op.dataset.bkopen;if(k.startsWith('own:'))openOwn(k.slice(4));else openLib(k.slice(4));return}
    if(t.closest('[data-rdr]')){const s=S.lib||{};openLib(s.w,s.p?s.p+'|'+(s.c||''):'');return}
    const g=t.closest('#sheet [data-bkgo]');if(g&&B){closeModal();show(B,g.dataset.bkgo);return}
    const r=t.closest('#sheet [data-bkrd]');if(r){const k=r.dataset.bkrd,v=r.dataset.v;
      if(k==='just'){S.rjust=v==='1';$('.bkt')?.classList.toggle('just',S.rjust)}
      else if(k==='num'){S.rnum=v==='1';$('.bkt')?.classList.toggle('nonum',!S.rnum)}
      else{S.rd=Object.assign(rd(),{[k]:isNaN(+v)?v:+v});applyRd()}
      touchSettings();aa(true);return}
    const th=t.closest('#sheet [data-bkth]');if(th){S.tAuto='';S.theme=th.dataset.bkth;touchSettings();applyBody();aa(true);return}
    const b=t.closest('[data-bk]');if(!b)return;const a=b.dataset.bk;
    if(a==='back'){showSec('lib')}
    if(a==='toc')toc();
    if(a==='aa')aa();
    if(a==='acc')accSheet();
    if(a==='next'&&CH&&CH.next)show(B,CH.next);
    if(a==='prev'&&CH&&CH.prev)show(B,CH.prev);
    if(a==='del'&&B&&B.kind==='own'&&confirm(`Удалить «${B.title}» с этого устройства?`)){await delBook(B.book.id);delete RP()[B.key];save();closeModal();B=null;showSec('lib')}
  });
  document.addEventListener('change',async e=>{
    if(e.target.matches('[data-bktext]')&&B){(S.rtxt=S.rtxt||{})[B.w.id]=e.target.value;touchSettings();save();show(B,POS)}
    if(e.target.matches('[data-bkfile]')){const f=e.target.files[0];if(!f)return;
      const card=e.target.closest('.bkadd');card.classList.add('busy');card.querySelector('.t').textContent='Читаю файл…';
      try{const b=await importFile(f);openOwn(b.id)}catch(err){alert(err.message||'Не удалось открыть файл');shelf()}}
  });
  document.addEventListener('click',e=>{const w=e.target.closest('.bkt .w[data-s]');if(w&&w.dataset.s)inspect([w.dataset.f,w.dataset.s,''],w.dataset.s[0]==='H',null,null)});
  return{openLib,openOwn,toc,shelf,importFile,get on(){return document.body.classList.contains('bkmode')}};
})();
