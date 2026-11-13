/* Озвучка и условная транскрипция слов оригинала (кириллицей) */
'use strict';
const Speech=(()=>{
  const GR={α:'а',β:'б',γ:'г',δ:'д',ε:'э',ζ:'дз',η:'э',θ:'т',ι:'и',κ:'к',λ:'л',μ:'м',ν:'н',ξ:'кс',ο:'о',π:'п',ρ:'р',σ:'с',ς:'с',τ:'т',υ:'ю',φ:'ф',χ:'х',ψ:'пс',ω:'о'};
  const GRV=new Set('αεηιουω'.split(''));
  function grc(str){
    const s=str.normalize('NFD').toLowerCase();
    const L=[];                                   // [{c,rough,diaer}]
    for(const ch of s){
      if(/\p{L}/u.test(ch)&&!/\p{M}/u.test(ch))L.push({c:ch,rough:false,dia:false});
      else if(L.length){if(ch==='̔')L[L.length-1].rough=true;if(ch==='̈')L[L.length-1].dia=true}
    }
    let out='';
    for(let i=0;i<L.length;i++){
      const a=L[i],b=L[i+1],p=a.c+(b?b.c:'');
      const initial=i===0;
      const asp=(a.rough&&GRV.has(a.c)&&(initial||(i>0&&L[i-1].c==='ρ')))?'х':'';
      if(b&&!b.dia){
        const d={αι:'ай',ει:'эй',οι:'ой',υι:'юй',ου:'у',αυ:'ау',ευ:'эу',ηυ:'эу',γγ:'нг',γκ:'нк',γξ:'нкс',γχ:'нх'}[p];
        if(d){out+=asp+d;i++;continue}
      }
      if(a.c==='ρ'&&a.rough&&initial){out+='рх';continue}
      out+=asp+(GR[a.c]||'');
    }
    return out;
  }
  const HC={'א':'','ב':['в','б'],'ג':'г','ד':'д','ה':'х','ו':'в','ז':'з','ח':'х','ט':'т','י':'й','כ':['х','к'],'ך':'х','ל':'л','מ':'м','ם':'м','נ':'н','ן':'н','ס':'с','ע':'','פ':['ф','п'],'ף':'ф','צ':'ц','ץ':'ц','ק':'к','ר':'р','ש':'ш','ת':'т'};
  const HV={'ֱ':'э','ֲ':'а','ֳ':'о','ִ':'и','ֵ':'э','ֶ':'э','ַ':'а','ָ':'а','ֹ':'о','ֺ':'о','ֻ':'у'};
  function heb(str){
    const s=str.replace(/[֑-ֽֿ֯׀׃-ׇ]/g,'');
    const parts=s.split(/־/);
    return parts.map(w=>{
      const U=[];const re=/([א-ת])([ְ-ּׁׂ]*)/g;let m;
      while((m=re.exec(w)))U.push({c:m[1],m:m[2]});
      let out='',pv='';
      U.forEach((u,i)=>{
        const dag=u.m.includes('ּ'),vow=[...u.m].find(x=>HV[x]||x==='ְ')||'';
        const last=i===U.length-1;
        if(u.c==='י'&&!vow&&'ִֵֶ'.includes(pv||'x')&&pv){pv='';return}
        if(u.c==='ו'&&vow==='ֹ'){out+='о';pv=vow;return}
        if(u.c==='ו'&&!vow&&dag){out+='у';pv='';return}
        if(u.c==='ה'&&last&&!vow&&!dag&&pv){pv='';return}
        let c=HC[u.c];if(Array.isArray(c))c=dag?c[1]:c[0];
        if(u.c==='ש')c=u.m.includes('ׂ')?'с':'ш';
        let v=vow==='ְ'?(i===0?'э':''):(HV[vow]||'');
        if((u.c==='ח'||u.c==='ע'||(u.c==='ה'&&last))&&last&&vow==='ַ'){out+=v+c;pv=vow;return}   // патах-furtive
        out+=c+v;pv=vow;
      });
      return out;
    }).join('-');
  }
  const tr=(txt,isH)=>isH?heb(txt):grc(txt);
  const stripGrc=t=>t.normalize('NFD').replace(/[̀-ͅ]/g,'').normalize('NFC');
  const stripHeb=t=>t.replace(/[֑-ֽֿ֯׀׃-ׇ]/g,'');
  function pick(lang){if(!VS.length)loadV();const vs=VS.filter(v=>v.lang.toLowerCase().replace('_','-').startsWith(lang)||(lang==='he'&&/^iw/i.test(v.lang)));return vs.find(v=>/premium|enhanced|natural/i.test(v.name))||vs.find(v=>v.localService)||vs[0]||null}
  /** mode: 'native' — голос греческого/иврита; 'tr' — транскрипция русским голосом */
  function say(text,isH,mode){
    if(!('speechSynthesis' in window))return{ok:false,why:'Браузер не поддерживает озвучку.'};
    speechSynthesis.cancel();
    let phrase,lang,why='';
    if(mode==='tr'){phrase=tr(text,isH).replace(/-/g,' ');lang='ru'}
    else{phrase=isH?keepNiqqud(text):stripGrc(text);lang=isH?'he':'el'}
    const v=pick(lang);
    if(!v&&mode!=='tr')why=`На этом устройстве нет голоса для ${isH?'иврита':'греческого'}. iPhone/iPad: Настройки → Универсальный доступ → Устно → Голоса → ${isH?'Иврит (Carmit)':'Греческий (Melina)'}. Пока можно нажать «Как читается».`;
    if(!v&&mode!=='tr')return{ok:false,why};
    const u=new SpeechSynthesisUtterance(phrase);if(v){u.voice=v;u.lang=v.lang}else u.lang='ru-RU';u.rate=mode==='tr'?.75:.8;
    speechSynthesis.speak(u);return{ok:true};
  }
  return{tr,say};
})();
