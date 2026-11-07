const G_POS={N:'существительное',V:'глагол',A:'прилагательное',RA:'артикль',RP:'личное местоимение',RD:'указательное местоимение',RR:'относительное местоимение',RI:'вопросительное/неопр. местоимение',D:'наречие',P:'предлог',C:'союз',X:'частица',I:'междометие'};
const G_CASE={N:'именительный',G:'родительный',D:'дательный',A:'винительный',V:'звательный'};
const G_NUM={S:'ед. ч.',P:'мн. ч.'}, G_GEN={M:'муж. р.',F:'жен. р.',N:'ср. р.'};
const G_TENSE={P:'настоящее',I:'имперфект',F:'будущее',A:'аорист',X:'перфект',Y:'плюсквамперфект'};
const G_VOICE={A:'действ.',M:'средний',P:'страдат.'};
const G_MOOD={I:'изъявит.',D:'повелит.',S:'сослагат.',O:'желат.',N:'инфинитив',P:'причастие'};
function decGrc(m){
  const [pos,p]=m.split(' ');
  const out=[G_POS[pos]||pos];
  const x=(p||'').padEnd(8,'-');
  const parts=[];
  if(x[1]!=='-')parts.push(G_TENSE[x[1]]);
  if(x[2]!=='-')parts.push(G_VOICE[x[2]]);
  if(x[3]!=='-')parts.push(G_MOOD[x[3]]);
  if(x[0]!=='-')parts.push(x[0]+' лицо');
  if(x[4]!=='-')parts.push(G_CASE[x[4]]);
  if(x[5]!=='-')parts.push(G_NUM[x[5]]);
  if(x[6]!=='-')parts.push(G_GEN[x[6]]);
  if(x[7]==='C')parts.push('сравнит.');if(x[7]==='S')parts.push('превосх.');
  return {pos:out[0],detail:parts.filter(Boolean).join(', ')};
}
const H_POS={A:'прилагательное',C:'союз',D:'наречие',N:'существительное',P:'местоимение',R:'предлог',S:'суффикс',T:'частица',V:'глагол'};
const H_STEM={q:'Qal',N:'Nif‘al',p:'Pi‘el',P:'Pu‘al',h:'Hif‘il',H:'Hof‘al',t:'Hitpa‘el',o:'Polel',O:'Polal',r:'Hitpolel',m:'Po‘el',M:'Po‘al',k:'Palel',K:'Pulal',Q:'Qal пасс.',l:'Pilpel',L:'Polpal',f:'Hitpalpel',D:'Nitpa‘el',i:'Pi‘el',u:'Hotpa‘al',c:'Tif‘il',v:'Hishtaf‘el'};
const H_VT={p:'перфект',q:'последоват. перфект',i:'имперфект',w:'вав-консекутив',h:'когортатив',j:'юссив',v:'императив',r:'причастие акт.',s:'причастие страд.',a:'инфинитив абс.',c:'инфинитив констр.'};
const H_G={b:'м./ж.',c:'общ.',f:'жен.',m:'муж.'}, H_N={b:'',d:'дв. ч.',p:'мн. ч.',s:'ед. ч.'}, H_ST={a:'абсолютное',c:'сопряжённое',d:'определённое'};
const H_PT={a:'утвержд.',d:'артикль',e:'побудит.',i:'вопросит.',j:'междометие',m:'указат.',n:'отрицание',o:'показатель прям. доп.',r:'относит.'};
const H_PRT={d:'указат.',f:'неопр.',i:'вопросит.',p:'личное',r:'относит.'};
const H_NT={c:'нариц.',g:'этноним',p:'собств.'};
function decHSeg(s){
  const pos=s[0],r=s.slice(1);let a=[];
  const name=H_POS[pos]||pos;
  if(pos==='N'){a=[H_NT[r[0]],H_G[r[1]],H_N[r[2]],H_ST[r[3]]];}
  else if(pos==='A'){a=[H_G[r[1]],H_N[r[2]],H_ST[r[3]]];}
  else if(pos==='V'){const t=r[1];a=[H_STEM[r[0]]||r[0],H_VT[t]];if('rs'.includes(t))a.push(H_G[r[2]],H_N[r[3]],H_ST[r[4]]);else if('ac'.includes(t)){}else a.push(r[2]&&r[2]!=='-'?r[2]+' лицо':'',H_G[r[3]],H_N[r[4]]);}
  else if(pos==='P'){a=[H_PRT[r[0]],r[1]&&r[1]!=='-'?r[1]+' лицо':'',H_G[r[2]],H_N[r[3]]];}
  else if(pos==='R'){if(r[0]==='d')a=['с артиклем'];}
  else if(pos==='S'){a=[r[0]==='p'?'местоимённый':r[0]==='d'?'направительный':'', r[1]&&r[1]!=='-'?r[1]+' лицо':'',H_G[r[2]],H_N[r[3]]];}
  else if(pos==='T'){a=[H_PT[r[0]]];}
  return {name,a:a.filter(Boolean).join(', ')};
}
function decHeb(m){
  const segs=m.split('/');let lang='';
  if(segs[0]&&(segs[0][0]==='H'||segs[0][0]==='A')){lang=segs[0][0];segs[0]=segs[0].slice(1);}
  const d=segs.map(decHSeg);
  let mi=segs.length-1;while(mi>0&&segs[mi][0]==='S')mi--;
  const main=d[mi];
  const fmt=x=>x.name+(x.a?' ('+x.a+')':'');
  return {pos:main.name,detail:main.a,prefix:d.slice(0,mi).map(fmt),suffix:d.slice(mi+1).map(x=>'суффикс'+(x.a?' ('+x.a+')':'')),lang:lang==='A'?'арамейский':''};
}
