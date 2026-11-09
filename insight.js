'use strict';
/* Панель слова: «Где ещё», «Как переводят», «Формы».
   Каждая строка раскрывается в список стихов, где слово встречается именно так; слова в стихах подсвечены.
   Данные: data/wr/<перевод>/ (переводы) и data/wf/ (формы), нарезаны по 100 номеров Стронга (tools/build_insight.py). */
(()=>{
const STOP=new Set('и а но же да ибо в во на с со к ко от из у о об по за для при над под до the a an and of to in on at by for with from as or'.split(' '));
const dec=a=>{let s=0;return a.map(d=>s+=d)};
const tid=()=>{const p=primary();return p&&TRS[p]&&!isPriv(p)?p:'RST'};
const vref=n=>({b:BOOKS[Math.floor(n/1e6)],c:Math.floor(n/1000)%1000,v:n%1000});
const NONE='—';
const trimIdx=(js,ch)=>{let a=0,b=js.length;while(a<b-1&&STOP.has(clean(ch[js[a]])))a++;while(b-1>a&&STOP.has(clean(ch[js[b-1]])))b--;return js.slice(a,b)};

/* текст стиха перевода с подсветкой слов, соответствующих выбранным словам оригинала */
async function verseHTML(id,n,pickI,pickR){
  const {b,c,v}=vref(n);
  const [t,a,o]=await Promise.all([J(`data/tr/${id}/${b.id}.json`),J(`data/align/${id}/${b.id}.json`),pickI?J(`data/orig/${b.id}.json`):null]);
  const txt=t&&t[c]&&t[c][v];if(!txt)return '';
  const ch=txt.trim().split(/\s+/),al=a&&a[c]&&a[c][v],ws=o&&o.chapters&&o.chapters[c]&&o.chapters[c][v],hit=new Set();
  if(al&&ws&&al.length===ch.length)ws.forEach((w,i)=>{
    if(!pickI(w))return;
    const js=[];ch.forEach((_,j)=>{if(al[j]===i&&clean(ch[j]))js.push(j)});
    const tj=trimIdx(js,ch),r=tj.map(j=>clean(ch[j])).join(' ')||NONE;
    if(pickR&&!pickR(r))return;
    tj.forEach(j=>hit.add(j));
  });
  return ch.map((w,j)=>hit.has(j)?`<mark>${esc(w)}</mark>`:esc(w)).join(' ');
}

/* постраничный список стихов */
function vlist(host,ids,id,pickI,pickR,per=12){
  const u=[...new Set(ids)];let shown=0;
  host.insertAdjacentHTML('beforeend',`<div class="hint" style="margin:0 0 8px">${u.length} ${u.length%10===1&&u.length%100!==11?'стих':(u.length%10>=2&&u.length%10<=4&&(u.length%100<10||u.length%100>=20)?'стиха':'стихов')} · ${esc(TRS[id]?TRS[id].name:'')}</div>`);
  const list=document.createElement('div'),more=document.createElement('button');host.appendChild(list);more.className='more wide';
  const next=async()=>{
    more.disabled=true;const part=u.slice(shown,shown+per);shown+=part.length;
    const h=await Promise.all(part.map(n=>verseHTML(id,n,pickI,pickR)));
    part.forEach((n,i)=>{const r=vref(n),b=document.createElement('button');b.className='occ';
      b.innerHTML=`<b>${esc(r.b.ab)} ${r.c}:${r.v}</b><span>${h[i]}</span>`;b.onclick=()=>{closeInsp();go(r.b.id,r.c,r.v)};list.appendChild(b)});
    more.disabled=false;
    if(shown<u.length){more.textContent=`Показать ещё (${u.length-shown})`;host.appendChild(more)}else more.remove();
  };
  more.onclick=next;next();
}

/* раскрывающаяся строка */
function acc(head,cls,fill){
  const d=document.createElement('div');d.className='acc '+(cls||'');
  d.innerHTML=`<button class="accH" aria-expanded="false">${head}<s class="chev"></s></button><div class="accB" hidden></div>`;
  const h=d.firstChild,b=d.lastChild;let done=false;
  h.onclick=()=>{const open=b.hidden;b.hidden=!open;h.setAttribute('aria-expanded',open);d.classList.toggle('open',open);if(open&&!done){done=true;fill(b)}};
  return d;
}
/* список строк: сначала первые limit, остальные — по кнопке */
function rowsBox(host,items,limit,label){
  items.forEach((el,i)=>{if(i>=limit)el.hidden=true;host.appendChild(el)});
  if(items.length>limit){const m=document.createElement('button');m.className='more wide';m.textContent=`Показать все ${label} (${items.length})`;
    m.onclick=()=>{items.forEach(el=>el.hidden=false);m.remove()};host.appendChild(m)}
}
const plural=(n,a,b,c)=>n%10===1&&n%100!==11?a:(n%10>=2&&n%10<=4&&(n%100<10||n%100>=20)?b:c);

/* ---------- Где ещё ---------- */
window.tabOcc=function(){
  const I=INSP,{k}=I,pane=$('#ipane');
  pane.innerHTML='<div class="hint">Загрузка…</div>';
  if(!k){pane.innerHTML='<div class="hint">Для этого слова нет номера Стронга.</div>';return}
  occOf(k).then(all=>{
    if(INSP!==I||I.tab!=='o'||!$('#ipane'))return;
    const by=new Map();all.forEach(n=>{const bi=Math.floor(n/1e6);if(!by.has(bi))by.set(bi,[]);by.get(bi).push(n)});
    const uniq=new Set(all).size;
    pane.innerHTML=`<div class="ih" style="margin-top:6px">Всего ${all.length} ${plural(all.length,'раз','раза','раз')} в ${uniq} ${plural(uniq,'стихе','стихах','стихах')} · ${by.size} ${plural(by.size,'книга','книги','книг')}</div>
      <div class="seg2"><button data-o="n" class="on">по частоте</button><button data-o="b">по порядку книг</button></div><div id="occRows"></div>`;
    const draw=mode=>{
      const rows=[...by.entries()].sort(mode==='b'?(a,b)=>a[0]-b[0]:(a,b)=>b[1].length-a[1].length||a[0]-b[0]),mx=Math.max(...rows.map(r=>r[1].length));
      const host=$('#occRows');host.innerHTML='';
      rowsBox(host,rows.map(([bi,ids])=>acc(`<span class="al">${esc(BOOKS[bi].ru)}</span><i style="width:${Math.max(4,ids.length/mx*100)}%"></i><b>${ids.length}</b>`,'g-'+genreOf(BOOKS[bi].id),
        b=>vlist(b,ids,tid(),w=>w[1]===k,null))),8,'книги');
    };
    draw('n');
    $$('.seg2 button',pane).forEach(b=>b.onclick=()=>{$$('.seg2 button',pane).forEach(x=>x.classList.toggle('on',x===b));draw(b.dataset.o)});
  });
};

/* ---------- Как переводят ---------- */
window.tabTr=function(){
  const I=INSP,{k}=I,pane=$('#ipane');
  if(!k){pane.innerHTML='<div class="hint">Нет номера Стронга.</div>';return}
  pane.innerHTML='<div class="hint">Загрузка…</div>';
  const ids=S.sel.filter(x=>x!=='ORIG'&&TRS[x]&&!isPriv(x));
  Promise.all(ids.map(id=>shard('wr/'+id,k).then(d=>d[k]||null))).then(res=>{
    if(INSP!==I||I.tab!=='t'||!$('#ipane'))return;
    pane.innerHTML='';
    if(!ids.length){pane.innerHTML='<div class="hint">Включите хотя бы один перевод.</div>';return}
    ids.forEach((id,i)=>{
      const card=document.createElement('div');card.className='card '+(id===primary()?'':'o');
      card.innerHTML=`<h5>${esc(TRS[id].name)}</h5>`;pane.appendChild(card);
      const rows=res[i];if(!rows||!rows.length){card.insertAdjacentHTML('beforeend','<div class="hint" style="margin:0">Нет данных об этом слове в данном переводе.</div>');return}
      const real=rows.filter(r=>r[0]!==NONE),none=rows.find(r=>r[0]===NONE);
      const tot=real.reduce((s,r)=>s+r[1].length,0),mx=real.length?real[0][1].length:1;
      card.insertAdjacentHTML('beforeend',`<div class="hint" style="margin:0 0 6px">${tot} ${plural(tot,'вхождение','вхождения','вхождений')} · ${real.length} ${plural(real.length,'вариант','варианта','вариантов')} перевода</div>`);
      const host=document.createElement('div');card.appendChild(host);
      const mk=(r,label,cls)=>acc(`<span class="al">${label}</span><i style="width:${Math.max(4,r[1].length/mx*100)}%"></i><b>${r[1].length}</b>`,cls,
        b=>vlist(b,dec(r[1]),id,w=>w[1]===k,x=>x===r[0]));
      const items=real.map(r=>mk(r,esc(r[0])));
      rowsBox(host,items,8,'варианты');
      if(none)host.appendChild(mk(none,'без соответствия в этом переводе','none'));
    });
    pane.insertAdjacentHTML('beforeend','<div class="hint">Соответствия строятся автоматическим выравниванием слов; откройте строку — слово подсвечено в каждом стихе. «Без соответствия» — места, где выравнивание не нашло слову пары.</div>');
  });
};

/* ---------- Формы ---------- */
window.tabForms=function(){
  const I=INSP,{k,isH}=I,pane=$('#ipane');
  if(!k){pane.innerHTML='<div class="hint">Нет номера Стронга.</div>';return}
  pane.innerHTML='<div class="hint">Загрузка…</div>';
  shard('wf',k).then(d=>{
    if(INSP!==I||I.tab!=='f'||!$('#ipane'))return;
    const rows=d[k];if(!rows||!rows.length){pane.innerHTML='<div class="hint">Нет данных о формах этого слова.</div>';return}
    const tot=rows.reduce((s,r)=>s+r[2].length,0);
    pane.innerHTML=`<div class="ih" style="margin-top:6px">${rows.length} ${plural(rows.length,'форма','формы','форм')} · ${tot} ${plural(tot,'вхождение','вхождения','вхождений')}</div>`;
    const host=document.createElement('div');pane.appendChild(host);
    rowsBox(host,rows.map(([f,m,ids])=>{const dm=decode(isH?'H':'G',m);
      return acc(`<span class="al"><span class="f ${isH?'he':'gr'}">${esc(f)}</span><small>${esc(dm.pos||'')}${dm.detail?', '+esc(dm.detail):''}</small></span><b>${ids.length}×</b>`,'form',
        b=>vlist(b,dec(ids),tid(),w=>w[0].replace(/[֑-ֽ֯׀׃]/g,'')===f&&w[2]===m,null))}),10,'формы');
    pane.insertAdjacentHTML('beforeend','<div class="hint">Формы, различающиеся только знаками кантилляции, объединены.</div>');
  });
};
})();
