'use strict';
/* Поиск вне Библии: библиотека (Септуагинта, апокрифы, Иосиф, Филон, Кумран), заметки, словарь.
   Запрос разбирается так же, как в Search.parseQ: слова, «фразы», -исключения, G26/H157, слова на греческом и иврите.
   Тексты загружаются по частям один раз и остаются в памяти; ищем только в текстах того же письма, что и запрос. */
const LSearch=(()=>{
  const WORKS=[['lxx','Септуагинта'],['apocrypha','Апокрифы'],['josephus','Иосиф Флавий'],['philo','Филон'],['qumran','Кумран']];
  const MAX=400,DOCS=new Map();
  const strip=s=>String(s==null?'':s).normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/ς/g,'σ').replace(/ё/g,'е');
  const norm=s=>' '+strip(s).replace(/[^\p{L}\p{N}]+/gu,' ').trim()+' ';
  const esc2=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const textOfV=v=>Array.isArray(v)?v.map(x=>x[0]).join(' '):String(v==null?'':v);
  const strongsOf=v=>Array.isArray(v)?' '+v.map(x=>(String(x[1]||'').match(/[GH]\d{4}/g)||[]).join(' ')).join(' ')+' ':'';
  const isScript=q=>/[Ͱ-Ͽἀ-῿֐-׿]/.test(q);
  function scriptOf(q){
    const x=q.replace(/(^|\s)[GHgh]\d{1,4}[a-zA-Z]?(?=\s|$)/g,' ');
    return /[Ͱ-Ͽἀ-῿]/.test(x)?'grc':/[֐-׿]/.test(x)?'heb':/[а-яё]/i.test(x)?'ru':/[a-z]/i.test(x)?'en':'';
  }
  /* ---------- сопоставление слов ---------- */
  function matcher(P,lang){
    const T=lang==='grc'||lang==='heb'?P.script.map(strip):P.terms;
    const rx=T.map(term=>{
      let t=strip(term).replace(/[^\p{L}\p{N}]/gu,'');if(!t)return null;
      if(lang==='ru'||lang==='en'){
        const st=lang==='ru'?Search.stemRu(t):Search.stemEn(t);let root=lang==='ru'&&st.length===5&&/[ое]в$/.test(st)?st.slice(0,3):st.length>5?st.slice(0,-1):st;if(root.length<3)root=t;
        return new RegExp('(?<![\\p{L}\\p{N}])'+esc2(root)+(t.length<=3?'(?![\\p{L}\\p{N}])':''),'u')}
      if(lang==='grc'){const root=t.length>6?t.slice(0,-2):t.length>4?t.slice(0,-1):t;return new RegExp('(?<![\\p{L}\\p{N}])'+esc2(root),'u')}
      return new RegExp(esc2(t),'u');
    }).filter(Boolean);
    const phr=P.phrases.map(norm),neg=P.neg.map(w=>new RegExp('(?<![\\p{L}\\p{N}])'+esc2(strip(w)),'u')),st=P.strongs;
    const hits=[...rx,...phr.flatMap(p=>p.trim().split(' ').filter(w=>w.length>2).map(w=>new RegExp('(?<![\\p{L}\\p{N}])'+esc2(w),'u')))];
    return{hits,st,
      test(n,sg){
        for(const r of rx)if(!r.test(n))return false;
        for(const p of phr)if(!n.includes(p))return false;
        for(const k of st)if(!sg||!sg.includes(' '+k+' '))return false;
        for(const r of neg)if(r.test(n))return false;
        return true},
      empty:!rx.length&&!phr.length&&!st.length};
  }
  function hl(v,m,esc){
    const arr=Array.isArray(v);
    const words=arr?v.map(x=>({w:x[0],s:String(x[1]||'')})):String(v).split(/(\s+)/).map(w=>({w,s:''}));
    return words.map(o=>{
      if(!arr&&/^\s+$/.test(o.w))return o.w;
      const tn=' '+strip(o.w).replace(/[^\p{L}\p{N}]/gu,'');
      const on=m.hits.some(r=>r.test(tn))||(o.s&&m.st.some(k=>o.s.includes(k)));
      return on?`<mark>${esc(o.w)}</mark>`:esc(o.w)}).join(arr?' ':'');
  }
  function snippet(v,m){ // обрезать длинный текст вокруг первого совпадения
    const txt=textOfV(v);if(txt.length<=280)return v;
    const parts=txt.split(/\s+/);let at=parts.findIndex(w=>{const tn=' '+strip(w).replace(/[^\p{L}\p{N}]/gu,'');return m.hits.some(r=>r.test(tn))});
    if(at<0)at=0;const from=Math.max(0,at-14),to=Math.min(parts.length,at+30);
    if(Array.isArray(v)){return v.slice(from,to)}
    return (from>0?'… ':'')+parts.slice(from,to).join(' ')+(to<parts.length?' …':'');
  }
  /* ---------- тексты сочинений ---------- */
  function docsFor(w,t,prog){
    const key=w.id+'/'+t.tid;if(DOCS.has(key))return DOCS.get(key);
    const pr=(async()=>{
      const pids=w.parts.map(p=>p.id).filter(id=>t.parts.includes(id)),out=new Array(pids.length);let i=0,done=0;
      async function worker(){
        while(i<pids.length){const j=i++;
          const d=await Lib.textOf(w,t,pids[j]);const rows=[];
          if(d&&!d.locked)for(const c of Object.keys(d).sort(Lib.cmp))for(const k of Object.keys(d[c]).sort(Lib.cmp)){const v=d[c][k];if(v==null||v==='')continue;rows.push([c,k,v,norm(textOfV(v)),strongsOf(v)])}
          out[j]={pid:pids[j],rows};prog&&prog(++done,pids.length)}}
      await Promise.all(Array.from({length:Math.min(5,pids.length)||1},worker));
      return out;
    })();
    DOCS.set(key,pr);pr.catch(()=>DOCS.delete(key));return pr;
  }
  /* язык текста подходит к запросу? */
  function langOk(t,sc,hasStrongOnly){
    if(hasStrongOnly)return t.lang==='grc'||t.lang==='heb';
    if(!sc)return true;return t.lang===sc;
  }
  /* поиск в одном сочинении; onProg({done,total}) */
  async function searchWork(wid,q,P,o){
    const w=await Lib.man(wid);if(!w)return{id:wid,items:[],total:0,err:true};
    const sc=scriptOf(q),strongOnly=!P.terms.length&&!P.script.length&&!P.phrases.length&&P.strongs.length>0;
    const cand=w.texts.filter(t=>langOk(t,sc,strongOnly));
    const res={id:wid,title:w.title_ru,abbr:w.abbr_ru||w.title_ru,items:[],total:0,locked:false,noLang:!cand.length,texts:[],pt:Object.fromEntries(w.parts.map(p=>[p.id,p.title_ru])),langs:[...new Set(w.texts.map(t=>({grc:'гречески',heb:'еврейски',en:'английски',ru:'русски'})[t.lang]))].join(' или ')};
    if(!cand.length)return res;
    for(const t of cand){
      if(t.access==='account'&&!Lib.hasAcc()){res.locked=true;continue}
      res.texts.push(t.tid);
      const m=matcher(P,t.lang);if(m.empty)continue;
      const docs=await docsFor(w,t,(a,b)=>o.prog&&o.prog(wid,a,b));
      if(!o.alive())return null;
      for(const p of docs){for(const[c,k,v,n,sg]of p.rows){
        if(m.test(n,sg)){res.total++;if(res.items.length<MAX)res.items.push({w:wid,tid:t.tid,pid:p.pid,c,k,v:snippet(v,m),lang:t.lang,m})}}
      }
    }
    return res;
  }
  /* ---------- заметки ---------- */
  function searchNotes(q,P){
    const lang=scriptOf(q)||'ru',m=matcher(P,lang);if(m.empty)return{verse:[],word:[]};
    const rgx=text=>m.test(norm(text),'');
    const verse=Object.entries(S.notes||{}).filter(([r,t])=>BI[r.split('.')[0]]!==undefined&&rgx(t)).map(([r,t])=>({ref:r,t,m}));
    const word=Object.entries(S.wnotes||{}).filter(([,t])=>rgx(t)).map(([k,t])=>({k,t,m}));
    return{verse,word};
  }
  /* ---------- словарь (лексикон Стронга) ---------- */
  async function searchDict(q,P,viaBible){
    await Promise.all([loadLex('G'),loadLex('H')]);
    const out=new Map(),add=(k,tier)=>{if(!out.has(k)||out.get(k)>tier)out.set(k,tier)};
    for(const k of P.strongs)if(Search.lx(k))add(k,0);
    for(const k of viaBible||[])if(Search.lx(k))add(k,1);
    const sc=scriptOf(q);
    if(sc==='grc'||sc==='heb'||sc==='ru'||(sc==='en'&&P.terms.length===1)){for(const k of await Search.wordsFor(q.replace(/["«»“”]/g,'').trim()))add(k,1)}
    if((sc==='en'||sc==='')&&(P.terms.length||P.phrases.length)){
      const terms=[...P.terms,...P.phrases.flatMap(p=>norm(p).trim().split(' '))].filter(Boolean);
      const rx=terms.map(t=>new RegExp('(?<![\\p{L}\\p{N}])'+esc2(strip(t)),'u'));
      let defN=0;
      if(rx.length)for(const f of['G','H']){const L=LEX[f]||{};
        for(const k in L){const e=L[k],g=norm(e.gloss||'')+norm(e.tr||'')+norm(e.lemma||'');
          if(rx.every(r=>r.test(g)))add(k,strip(e.gloss||'').trim()===strip(terms[0]||'')?1:2);
          else if(defN<40&&rx.every(r=>r.test(norm(e.def||'')))){defN++;add(k,3)}}}
    }
    const L=[...out.entries()].sort((a,b)=>a[1]-b[1]||a[0].localeCompare(b[0]));
    return L.slice(0,150).map(([k,t])=>({k,tier:t}));
  }
  return{WORKS,matcher,hl,searchWork,searchNotes,searchDict,scriptOf,norm,strip};
})();
