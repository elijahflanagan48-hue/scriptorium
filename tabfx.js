'use strict';
/* Ad fontes: переход между разделами нижней панели (телефон).
   1) «Капля»: подсветка активного раздела — одна мягкая капсула, которая перетекает
      к новому разделу, как капля ртути: сначала тянется передним краем, затем подтягивает задний,
      слегка сплющиваясь посередине пути.
   2) Значок нового раздела «прорисовывается» штрихом, как пером, и наполняется цветом.
   3) Страница входит с той стороны, куда двинулась капля: лёгкий сдвиг, проявление из дымки. */
(()=>{
  const TB=$('#tabbar');if(!TB||!Element.prototype.animate)return;
  const calm=()=>S.calm||matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pill=document.createElement('i');pill.className='tbpill';pill.setAttribute('aria-hidden','true');
  TB.prepend(pill);TB.classList.add('fx');
  const ORDER=['read','lib','search','notes','more'];
  const keyOf=s=>['set','hist'].includes(s)?'more':s;
  const btn=k=>k==='more'?$('#mMore'):TB.querySelector(`[data-sec="${k}"]`);
  let last=null,lastKey=null,anim=null;

  function geo(k){const b=btn(k);if(!b)return null;const t=b.querySelector('.tbi').getBoundingClientRect(),r=TB.getBoundingClientRect();
    return{x:t.left-r.left,y:t.top-r.top,w:t.width,h:t.height}}
  const set=g=>{pill.style.transform=`translate(${g.x}px,${g.y}px)`;pill.style.width=g.w+'px';pill.style.height=g.h+'px'};

  function move(k,animate){
    const g=geo(k);if(!g||!isM()){pill.style.opacity=0;return}
    pill.style.opacity=1;
    if(!animate||!last||calm()||Math.abs(last.x-g.x)<2){if(anim)anim.cancel();set(g);last=g;return}
    const a=last,right=g.x>a.x,L=Math.min(a.x,g.x),R=Math.max(a.x+a.w,g.x+g.w),sq=g.h*.16;
    if(anim)anim.cancel();
    anim=pill.animate([
      {transform:`translate(${a.x}px,${a.y}px)`,width:a.w+'px',height:a.h+'px'},
      {transform:`translate(${right?a.x:L}px,${g.y+sq/2}px)`,width:(R-L)+'px',height:(g.h-sq)+'px',offset:.46},
      {transform:`translate(${g.x}px,${g.y}px)`,width:g.w+'px',height:g.h+'px'}
    ],{duration:560,easing:'cubic-bezier(.62,0,.24,1)'});
    set(g);last=g;
  }
  /* значок прорисовывается штрихом */
  function draw(k){
    if(calm())return;const b=btn(k);if(!b)return;const svg=b.querySelector('svg');if(!svg)return;
    svg.querySelectorAll('path:not(.f),rect:not(.f),circle:not(.f)').forEach((el,i)=>{
      el.setAttribute('pathLength','1');
      el.animate([{strokeDasharray:'1 1',strokeDashoffset:1},{strokeDasharray:'1 1',strokeDashoffset:0}],{duration:620,delay:120+i*55,easing:'cubic-bezier(.45,.05,.25,1)',fill:'backwards'});
    });
    svg.querySelectorAll('.f').forEach(el=>el.animate([{opacity:0,transform:'scale(.6)'},{opacity:.22,transform:'scale(1)'}],{duration:520,delay:380,easing:'cubic-bezier(.2,.8,.2,1)',fill:'backwards'}));
    b.animate([{transform:'translateY(0)'},{transform:'translateY(-2px)',offset:.45},{transform:'translateY(0)'}],{duration:520,delay:180,easing:'cubic-bezier(.3,.7,.3,1)'});
  }
  /* новая страница входит со стороны движения */
  function enter(dir){
    if(calm())return;const el=S.sec==='read'?$('#reader'):$('#page');if(!el)return;
    el.animate([
      {opacity:0,transform:`translate3d(${dir*22}px,6px,0) scale(.992)`,filter:'blur(5px)'},
      {opacity:1,transform:'none',filter:'blur(0)'}
    ],{duration:460,easing:'cubic-bezier(.16,.84,.3,1)'});
  }
  function onChange(){
    const k=keyOf(S.sec||'read');if(k===lastKey){move(k,false);return}
    const from=lastKey;lastKey=k;
    if(from==null){move(k,false);return}
    move(k,true);draw(k);
    enter(Math.sign(ORDER.indexOf(k)-ORDER.indexOf(from))||1);
  }
  new MutationObserver(onChange).observe(document.body,{attributes:true,attributeFilter:['class']});
  addEventListener('resize',()=>{last=null;move(keyOf(S.sec||'read'),false)});
  setTimeout(onChange,60);
})();
