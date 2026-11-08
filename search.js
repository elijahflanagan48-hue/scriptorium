'use strict';
/* Умный поиск: формы слова, опечатки, Стронг, транслит, поиск через оригинал.
   Работает в браузере; индекс строится один раз на перевод при первом поиске. */
const Search=(()=>{
  const IX={};
  const nrm=w=>w.toLowerCase().replace(/ё/g,'е').replace(/[^\p{L}]/gu,'');
  const strip=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
  const letters=s=>strip(s).replace(/[^\p{L}]/gu,'');
  const flat=t=>t.toLowerCase().replace(/ё/g,'е').replace(/[^\p{L}\s]/gu,' ').replace(/\s+/g,' ').trim();

  /* ---- Russian Snowball stemmer ---- */
  const PG=/((ив|ивши|ившись|ыв|ывши|ывшись)|((?<=[ая])(в|вши|вшись)))$/,RF=/(ся|сь)$/,
    ADJ=/(ее|ие|ые|ое|ими|ыми|ей|ий|ый|ой|ем|им|ым|ом|его|ого|ему|ому|их|ых|ую|юю|ая|яя|ою|ею)$/,
    PART=/((ивш|ывш|ующ)|((?<=[ая])(ем|нн|вш|ющ|щ)))$/,
    VERB=/((ила|ыла|ена|ейте|уйте|ите|или|ыли|ей|уй|ил|ыл|им|ым|ен|ило|ыло|ено|ят|ует|уют|ит|ыт|ены|ить|ыть|ишь|ую|ю)|((?<=[ая])(ла|на|ете|йте|ли|й|л|ем|н|ло|но|ет|ют|ны|ть|ешь|нно)))$/,
    NOUN=/(а|ев|ов|ие|ье|е|иями|ями|ами|еи|ии|и|ией|ей|ой|ий|й|иям|ям|ием|ем|ам|ом|о|у|ах|иях|ях|ы|ь|ию|ью|ю|ия|ья|я)$/;
  function stemRu(w){
    const m=w.match(/^(.*?[аеиоуыэюя])(.*)$/);if(!m)return w;let pre=m[1],rv=m[2],t;
    t=rv.replace(PG,'');
    if(t===rv){rv=rv.replace(RF,'');t=rv.replace(ADJ,'');
      if(t!==rv)rv=t.replace(PART,'');
      else{t=rv.replace(VERB,'');rv=t!==rv?t:rv.replace(NOUN,'')}}
    else rv=t;
    rv=rv.replace(/и$/,'').replace(/ейше?$/,'').replace(/нн$/,'н').replace(/ь$/,'');
    return pre+rv;
  }
  function stemEn(w){
    if(w.length<=3)return w;
    let s=w.replace(/(ings?|edst|eth|est|ed|es|ly|s)$/,'');
    if(s.length<3)s=w.slice(0,3);
    return s.replace(/(.)\1$/,'$1').replace(/e$/,'');
  }
  const PREF=['пред','пере','низ','нис','без','бес','под','воз','вос','пре','при','про','раз','рас','вз','вс','по','за','на','от','из','ис','вы','до','об','со'];
  const unpref=st=>{for(const p of PREF)if(st.startsWith(p)&&st.length-p.length>=3)return st.slice(p.length);return st};
  const rootOf=(st,lang)=>lang==='ru'&&st.length===5&&/[ое]в$/.test(st)?st.slice(0,3):st;

  function lev(a,b,max){
    if(Math.abs(a.length-b.length)>max)return max+1;
    let pp=null,prev=Array.from({length:b.length+1},(_,i)=>i);
    for(let i=1;i<=a.length;i++){const cur=[i];let best=i;
      for(let j=1;j<=b.length;j++){cur[j]=Math.min(prev[j]+1,cur[j-1]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));
        if(pp&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])cur[j]=Math.min(cur[j],pp[j-2]+1);if(cur[j]<best)best=cur[j]}
      if(best>max)return max+1;pp=prev;prev=cur}
    return prev[b.length];
  }

  /* ---- index ---- */
  async function index(tid,prog){
    if(IX[tid])return IX[tid];
    const T=TRS[tid];let done=0;
    const parts=await Promise.all(T.books.map(async bid=>{const d=await J(`data/tr/${tid}/${bid}.json`);prog&&prog(++done,T.books.length);return[bid,d]}));
    const rows=[];
    for(const[bid,d]of parts){if(!d)continue;const bi=BI[bid];for(const c in d)for(const v in d[c])rows.push([bi*1e6+(+c)*1000+(+v),d[c][v]])}
    rows.sort((a,b)=>a[0]-b[0]);
    const ids=new Array(rows.length),txt=new Array(rows.length),tok=new Map();
    rows.forEach(([n,t],k)=>{ids[k]=n;txt[k]=t;const seen=new Set();
      for(const w of t.split(/\s+/)){const x=nrm(w);if(x&&!seen.has(x)){seen.add(x);let a=tok.get(x);if(!a)tok.set(x,a=[]);a.push(k)}}});
    const stem=T.lang==='ru'?stemRu:stemEn,stems=new Map();for(const w of tok.keys())stems.set(w,stem(w));
    const t2s=(await J(`data/t2s/${tid}.json`))||{};
    const pos=new Map();ids.forEach((n,k)=>pos.set(n,k));
    return IX[tid]={tid,lang:T.lang,ids,txt,tok,stem,stems,t2s,pos,flat:null,rev:null};
  }
  function revOf(ix){ // Стронг -> как переведено
    if(ix.rev)return ix.rev;const r=new Map();
    for(const w in ix.t2s)for(const[k,n]of ix.t2s[w]){let a=r.get(k);if(!a)r.set(k,a=[]);a.push([w,n])}
    for(const a of r.values())a.sort((x,y)=>y[1]-x[1]);return ix.rev=r;
  }

  /* ---- lexicon helpers ---- */
  async function lexAll(){await Promise.all([lexOf('G0025'),lexOf('H0157')]);return{G:LEX.G||{},H:LEX.H||{}}}
  const lx=k=>(LEX[k[0]]||{})[k];
  const lemKey=k=>{const e=lx(k);return e?letters(e.lemma):''};
  function sameFamily(a,b){
    if(a===b)return true;if(a[0]!==b[0])return false;const x=lemKey(a),y=lemKey(b);if(!x||!y)return false;
    const n=a[0]==='H'?3:4;return x.length>=n&&y.length>=n&&x.slice(0,n)===y.slice(0,n);
  }
  const CYR={а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ж:'zh',з:'z',и:'i',й:'i',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'shch',ы:'y',э:'e',ю:'yu',я:'ya',ь:'',ъ:''};
  function translitVariants(q){
    const x=q.toLowerCase().replace(/ё/g,'е');if(!/[а-я]/.test(x))return[letters(x)];
    const base=[...x].map(c=>CYR[c]??c).join('');return[base,base.replace(/h/g,'ch'),base.replace(/h/g,'kh'),base.replace(/i(?=[aeou])/g,'y')].map(letters);
  }
  async function wordsFor(q){ // греч./евр. слово, транслит
    const L=await lexAll(),out=[];const isScript=/[Ͱ-Ͽἀ-῿֐-׿]/.test(q);
    const key=letters(q),vars=isScript?[]:translitVariants(q);
    for(const f of['G','H'])for(const k in L[f]){const e=L[f][k];
      if(isScript){const lk=letters(e.lemma);if(lk===key)out.unshift(k);else if(key.length>=3&&lk.startsWith(key))out.push(k)}
      else{const tk=letters(e.tr);if(tk&&vars.includes(tk))out.push(k)}}
    return [...new Set(out)].slice(0,8);
  }

  /* ---- query ---- */
  function parseQ(q){
    const phrases=[],terms=[],neg=[],strongs=[],script=[];
    q=q.replace(/"([^"]+)"|«([^»]+)»|“([^”]+)”/g,(_,a,b,c)=>{phrases.push(a||b||c);return' '});
    for(const p of q.split(/\s+/).filter(Boolean)){
      if(/^[-−]\S/.test(p)){const x=nrm(p.slice(1));if(x)neg.push(x);continue}
      const sm=p.match(/^([GHgh])0*(\d{1,4})([a-zA-Z]?)$/);if(sm){strongs.push(sm[1].toUpperCase()+sm[2].padStart(4,'0'));continue}
      if(/[Ͱ-Ͽἀ-῿֐-׿]/.test(p)){script.push(p);continue}
      const x=nrm(p);if(x)terms.push(x);
    }
    return{phrases,terms,neg,strongs,script};
  }
  function formsOf(ix,term){
    const st=ix.stem(term),root=rootOf(st,ix.lang),t1=[],t2=[];
    for(const[w,s]of ix.stems){
      if(w===term||s===st)t1.push(w);
      else if(root.length>=3&&w.length>=root.length&&(s.startsWith(root)||(ix.lang==='ru'&&unpref(s).startsWith(root))))t2.push(w);
    }
    return{st,root,t1,t2};
  }
  function coreStrongs(ix,forms){
    const c=new Map();for(const w of forms)for(const[k,n]of ix.t2s[w]||[])c.set(k,(c.get(k)||0)+n);
    const arr=[...c.entries()].sort((a,b)=>b[1]-a[1]);if(!arr.length)return[];const mx=arr[0][1];
    return arr.filter(([,n])=>n>=Math.max(2,mx*.2)).slice(0,4).map(([k])=>k);
  }
  function correct(ix,term){
    const max=term.length<=4?1:2;let best=null;
    for(const w of ix.tok.keys()){if(Math.abs(w.length-term.length)>max||w[0]!==term[0]&&term.length<5)continue;
      const d=lev(term,w,max);if(d<=max){const f=ix.tok.get(w).length;if(!best||d<best.d||(d===best.d&&f>best.f))best={w,d,f}}}
    return best&&best.w;
  }
  const occK=(ix,k)=>{const out=new Set();for(const n of (OCC&&OCC[k])||[]){const p=ix.pos.get(n);if(p!==undefined)out.add(p)}return out};
  const inter=(a,b)=>{const r=new Set();const[s,l]=a.size<b.size?[a,b]:[b,a];for(const x of s)if(l.has(x))r.add(x);return r};

  async function run(q,o){
    const ix=await index(o.tid,o.prog);if(!OCC)OCC=await J('data/occ.json');await lexAll();
    const P=parseQ(q);if(o.mode==='phrase'&&!P.phrases.length&&P.terms.length){P.phrases.push(q.replace(/["«»“”]/g,''));P.terms=[]}
    const info=[],hi=new Set(),sets=[],strongInfo=[];let words=[];
    for(let term of P.terms){
      let f=formsOf(ix,term),fixed=null;
      if(!f.t1.length&&!f.t2.length){
        const tw=await wordsFor(term);
        if(tw.length){info.push({term,translit:tw,forms:[],strongs:tw});words.push(...tw);const set=new Set();for(const k of tw)for(const p of occK(ix,k))set.add(p);sets.push(set);continue}
        const c=correct(ix,term);if(c){fixed=term;term=c;f=formsOf(ix,term)}}
      const core=coreStrongs(ix,ix.t2s[term]?[term]:f.t1);
      const fits=w=>{const ts=(ix.t2s[w]||[]).slice(0,2).map(x=>x[0]);return !ts.length||ts.some(k=>core.some(c=>sameFamily(k,c)))};
      const ok2=f.t2.filter(w=>{const ts=(ix.t2s[w]||[]).slice(0,2).map(x=>x[0]);return core.length?ts.length&&fits(w):f.root.length>=4});
      const forms=[...f.t1.map(w=>({w,n:ix.tok.get(w).length,t:1,def:!core.length||w===term||fits(w)})),...ok2.map(w=>({w,n:ix.tok.get(w).length,t:2,def:true}))].sort((a,b)=>b.def-a.def||b.n-a.n);
      const fam=new Set(core);for(const w of ok2)for(const[k]of (ix.t2s[w]||[]).slice(0,1))if(core.some(c=>sameFamily(k,c)))fam.add(k);
      const strongs=[...fam].filter(k=>lx(k));
      const it={term,fixed,forms,strongs};info.push(it);
      let set=new Set();
      if(o.mode==='orig'&&strongs.length){for(const k of strongs)if(!(o.offS||new Set()).has(k))for(const p of occK(ix,k))set.add(p)}
      const tg=o.toggled||new Set();
      for(const x of forms){x.on=x.def!==tg.has(x.w);if(x.on)hi.add(x.w)}
      if(!(o.mode==='orig'&&strongs.length))for(const x of forms)if(x.on)for(const p of ix.tok.get(x.w))set.add(p)
      sets.push(set);
    }
    for(const s of P.script){const w=await wordsFor(s);words.push(...w);const ex=w.filter(k=>letters(lx(k).lemma)===letters(s)),use=ex.length?ex:w;
      const set=new Set();for(const k of use)for(const p of occK(ix,k))set.add(p);sets.push(set);strongInfo.push(...use)}
    if(!P.terms.length&&!P.strongs.length&&!P.script.length&&!P.phrases.length&&q.trim())words.push(...await wordsFor(q.trim()));
    for(const k of P.strongs){strongInfo.push(k);sets.push(occK(ix,k))}
    if(P.terms.length===1&&!info[0].translit)for(const k of await wordsFor(P.terms[0]))words.push(k);
    for(const it of info)for(const k of it.strongs)if(!words.includes(k))words.push(k);
    words=[...new Set(words)].filter(k=>lx(k)).slice(0,8);
    // phrases
    if(P.phrases.length){if(!ix.flat)ix.flat=ix.txt.map(flat);
      for(const ph of P.phrases){const f=flat(ph);if(!f)continue;f.split(' ').forEach(w=>hi.add(w));const s=new Set();ix.flat.forEach((t,k)=>{if((' '+t+' ').includes(' '+f+' ')||t.includes(f))s.add(k)});sets.push(s)}}
    let res=null;for(const s of sets)res=res?inter(res,s):s;res=res||new Set();
    for(const n of P.neg){const f=formsOf(ix,n);for(const w of f.t1)for(const p of ix.tok.get(w)||[])res.delete(p)}
    const tst=o.part;let list=[...res].sort((a,b)=>a-b);
    if(tst==='OT'||tst==='NT')list=list.filter(k=>BOOKS[Math.floor(ix.ids[k]/1e6)].testament===tst);
    const byBook=new Map();for(const k of list){const b=Math.floor(ix.ids[k]/1e6);byBook.set(b,(byBook.get(b)||0)+1)}
    if(o.book!=null)list=list.filter(k=>Math.floor(ix.ids[k]/1e6)===o.book);
    return{ix,P,info,words,strongInfo,list,byBook,hi,empty:!sets.length};
  }
  function hl(text,hi){return text.split(/(\s+)/).map(c=>/^\s+$/.test(c)?c:(hi.has(nrm(c))?`<mark>${esc(c)}</mark>`:esc(c))).join('')}
  const ref=n=>({book:BOOKS[Math.floor(n/1e6)].id,ch:Math.floor(n/1000)%1000,v:n%1000});
  return{run,index,hl,ref,revOf,lx,nrm,flat,stemRu,isReady:tid=>!!IX[tid]};
})();
