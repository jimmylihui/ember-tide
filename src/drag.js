// Pointer-only presentation layer. The owner interprets drop intents and remains
// responsible for every game action and its validation.
const SOURCE_SELECTOR='[data-hand],[data-unit]';
const DROP_SELECTOR='[data-board],[data-arena],[data-lane],[data-laneuid],[data-unit],[data-core],[data-stack],[data-hand]';
const TOUCH_DELAY=240;
const point=e=>({x:e.clientX,y:e.clientY});
const number=value=>{const n=Number(value);return Number.isInteger(n)&&n>=0&&n<=1?n:undefined;};

export function installDrag({root,getState,onDrop}){
 if(!root?.addEventListener||typeof getState!=='function'||typeof onDrop!=='function')throw new TypeError('installDrag requires a root, getState and onDrop');
 const doc=root.ownerDocument,win=doc?.defaultView||globalThis;
 if(!doc?.addEventListener||!doc.body)throw new TypeError('Drag root must belong to a document');
 let pending=null,active=null,longPress=null,frame=null,destroyed=false,suppressClick=null;
 const now=()=>win.performance?.now?.()??Date.now();
 const get=()=>{try{return getState();}catch{return null;}};
 const owned=(source,state)=>{
  if(!state?.mine||state.curtain||state.game?.winner!=null||state.game?.choice||state.game?.phase==='mulligan')return false;
  const player=state.game?.players?.[state.seat];
  return !!player?.[source.kind==='hand'?'hand':'board']?.some(h=>h.uid===source.uid&&!h.hidden);
 };
 const playerFor=(uid,kind,state)=>state?.game?.players?.findIndex(p=>p[kind]?.some(x=>x.uid===uid));
 function descriptor(el,state){
  const d=el?.dataset;if(!d)return null;
  if(d.lane!==undefined||d.laneuid!==undefined)return {kind:'lane',uid:d.lane??d.laneuid,p:state?.game?.combat?1-state.game.combat.p:undefined};
  if(d.unit!==undefined){const p=playerFor(d.unit,'board',state);return p>=0?{kind:'unit',uid:d.unit,p}:null;}
  if(d.core!==undefined){const p=number(d.core);return p===undefined?null:{kind:'core',p};}
  if(d.stack!==undefined)return d.stack?{kind:'stack',uid:d.stack}:null;
  if(d.hand!==undefined){const p=playerFor(d.hand,'hand',state);return p>=0?{kind:'hand',uid:d.hand,p}:null;}
  if(d.board!==undefined){const p=number(d.board);return p===undefined?null:{kind:'board',p};}
  if(d.arena!==undefined)return {kind:'arena'};
  return null;
 }
 function allowed(source,drop,state){
  if(!drop||!owned(source,state)||source.uid===drop.uid&&source.kind===drop.kind)return false;
  if(typeof state.canDrop==='function'){try{return !!state.canDrop({kind:source.kind,uid:source.uid},drop);}catch{return false;}}
  // Conservative fallback for a host which has not supplied card-specific rules.
  if(source.kind==='unit'){
   if(drop.kind==='arena')return state.game.phase==='main'&&!state.game.stack?.length&&!!(state.game.tokens?.[state.seat]??(state.game.attacker===state.seat&&state.game.token));
   if(drop.kind==='lane')return state.game.phase==='block'&&state.game.combat?.p!==state.seat&&state.game.combat?.lanes?.some(l=>l.attacker===drop.uid&&!l.challenged);
   return false;
  }
  // Target legality depends on the dragged card. Never highlight a guessed
  // spell target just because an unrelated selected card can target it.
  if(state.selected===source.uid&&typeof state.canTarget==='function'&&['unit','core'].includes(drop.kind)){
   const u=drop.kind==='unit'?state.game.players[drop.p].board.find(u=>u.uid===drop.uid):null;
   try{return !!state.canTarget(drop.p,u,drop.kind==='core');}catch{return false;}
  }
  return false;
 }
 function clearTimer(){if(longPress!==null){win.clearTimeout(longPress);longPress=null;}}
 function setClass(el,name,value){el?.classList?.[value?'add':'remove'](name);}
 function cleanup(){
  clearTimer();if(frame!==null){if(win.cancelAnimationFrame)win.cancelAnimationFrame(frame);else win.clearTimeout(frame);frame=null;}
  if(active){for(const el of active.zones)setClass(el,'lor-drag-dropzone',false);setClass(active.over,'lor-drag-over',false);setClass(active.sourceEl,'lor-drag-source',false);active.ghost?.remove();active.svg?.remove();try{active.sourceEl.releasePointerCapture?.(active.id);}catch{}}
  setClass(root,'lor-dragging',false);pending=null;active=null;
 }
 function cancel(){if(active)suppressClick={until:now()+400,id:active.id};cleanup();}
 function highlight(state){
  if(!active)return;const next=new Set();
  for(const el of root.querySelectorAll(DROP_SELECTOR))if(allowed(active,descriptor(el,state),state)){next.add(el);setClass(el,'lor-drag-dropzone',true);}
  for(const el of active.zones)if(!next.has(el))setClass(el,'lor-drag-dropzone',false);
  active.zones=next;
 }
 function hitTest(pos,state){
  const hits=doc.elementsFromPoint?.(pos.x,pos.y)||[doc.elementFromPoint?.(pos.x,pos.y)].filter(Boolean),seen=new Set();
  for(const hit of hits){let el=hit;while(el&&el!==root.parentElement){if(!root.contains(el))break;if(!seen.has(el)){seen.add(el);const drop=descriptor(el,state);if(allowed(active,drop,state))return {el,drop};}if(el===root)break;el=el.parentElement;}}
  return null;
 }
 function paint(){
  frame=null;if(!active)return;const state=get();if(!owned(active,state)){cancel();return;}
  const a=active,p=a.pos;a.ghost.style.transform=`translate3d(${p.x-a.offset.x}px,${p.y-a.offset.y}px,0) rotate(${Math.max(-5,Math.min(5,(p.x-a.start.x)/50))}deg) scale(1.035)`;
  const hit=hitTest(p,state);if(a.over!==hit?.el){setClass(a.over,'lor-drag-over',false);a.over=hit?.el||null;setClass(a.over,'lor-drag-over',true);}a.drop=hit?.drop||null;
  setClass(a.ghost,'lor-drag-no-drop',!a.drop);
  if(a.path){const from=a.anchor,mid=(from.y+p.y)/2;a.path.setAttribute('d',`M ${from.x} ${from.y} C ${from.x} ${mid}, ${p.x} ${mid}, ${p.x} ${p.y}`);a.tip.setAttribute('cx',String(p.x));a.tip.setAttribute('cy',String(p.y));setClass(a.svg,'lor-drag-line-valid',!!a.drop);}
  highlight(state);
 }
 function schedule(){if(frame===null)frame=win.requestAnimationFrame?win.requestAnimationFrame(paint):win.setTimeout(paint,16);}
 function copyAppearance(source,clone){if(!win.getComputedStyle)return;const from=[source,...source.querySelectorAll('*')],to=[clone,...clone.querySelectorAll('*')],props=['width','height','min-width','max-width','min-height','max-height','font-size','font-family','font-weight','line-height','letter-spacing','padding','border-radius','top','right','bottom','left','gap'];for(let i=0;i<from.length;i++){const css=win.getComputedStyle(from[i]);for(const prop of props)to[i]?.style.setProperty(prop,css.getPropertyValue(prop));}}
 function activate(){
  if(!pending||active||destroyed)return;const state=get();if(!owned(pending,state)){cleanup();return;}
  clearTimer();const a=pending,rect=a.sourceEl.getBoundingClientRect(),ghost=a.sourceEl.cloneNode(true);copyAppearance(a.sourceEl,ghost);
  ghost.removeAttribute?.('id');ghost.removeAttribute?.('autofocus');ghost.setAttribute('aria-hidden','true');ghost.setAttribute('tabindex','-1');
  for(const child of ghost.querySelectorAll?.('[id]')||[])child.removeAttribute('id');
  ghost.classList.remove('lor-drag-dropzone','lor-drag-over','lor-drag-source');ghost.classList.add('lor-drag-ghost');
  ghost.style.width=`${rect.width}px`;ghost.style.height=`${rect.height}px`;doc.body.appendChild(ghost);
  active={...a,ghost,offset:{x:a.start.x-rect.left,y:a.start.y-rect.top},anchor:{x:rect.left+rect.width/2,y:rect.top+rect.height/2},zones:new Set(),over:null,drop:null};pending=null;
  if(a.kind==='unit'){
   const svg=doc.createElementNS('http://www.w3.org/2000/svg','svg'),path=doc.createElementNS('http://www.w3.org/2000/svg','path'),tip=doc.createElementNS('http://www.w3.org/2000/svg','circle');
   svg.setAttribute('class',`lor-drag-line ${state.game.phase==='block'?'lor-drag-block':'lor-drag-attack'}`);svg.setAttribute('aria-hidden','true');tip.setAttribute('r','6');svg.appendChild(path);svg.appendChild(tip);doc.body.appendChild(svg);active.svg=svg;active.path=path;active.tip=tip;
  }
  setClass(a.sourceEl,'lor-drag-source',true);setClass(root,'lor-dragging',true);try{a.sourceEl.setPointerCapture?.(a.id);}catch{}
  highlight(state);paint();
 }
 function down(e){
  if(destroyed||pending||active||e.isPrimary===false||e.button!==undefined&&e.button!==0)return;
  const el=e.target?.closest?.(SOURCE_SELECTOR);if(!el||!root.contains(el))return;
  const kind=el.dataset.unit!==undefined?'unit':'hand',uid=el.dataset.unit??el.dataset.hand,source={kind,uid};
  if(!uid||!owned(source,get()))return;
  pending={...source,sourceEl:el,id:e.pointerId,pointerType:e.pointerType||'mouse',start:point(e),pos:point(e)};
  if(pending.pointerType==='touch'&&kind==='hand')longPress=win.setTimeout(activate,TOUCH_DELAY);
 }
 function move(e){
  const a=active||pending;if(!a||e.pointerId!==a.id)return;a.pos=point(e);
  if(!active){const dx=Math.abs(e.clientX-a.start.x),dy=Math.abs(e.clientY-a.start.y),touch=a.pointerType==='touch';
   if(touch&&a.kind==='hand'){
    if(dx>8&&dx>dy*1.12){cleanup();return;}
    if(dy<11||dy<dx*1.12)return;
   }else if(Math.hypot(dx,dy)<(touch?9:6))return;
   activate();
  }
  if(active){if(e.cancelable)e.preventDefault();schedule();}
 }
 function up(e){
  const a=active||pending;if(!a||e.pointerId!==a.id)return;
  if(!active){cleanup();return;}
  active.pos=point(e);paint();if(!active)return;
  const current=active,state=get(),hit=hitTest(current.pos,state),intent=hit&&allowed(current,hit.drop,state)?{kind:current.kind,uid:current.uid,drop:hit.drop,pointerType:current.pointerType,start:{...current.start},point:{...current.pos}}:null;
  suppressClick={until:now()+400,id:current.id};if(e.cancelable)e.preventDefault();cleanup();
  if(intent)onDrop(intent);
 }
 function pointerCancel(e){if((active||pending)?.id===e.pointerId)cancel();}
 function click(e){if(!suppressClick)return;if(now()>suppressClick.until){suppressClick=null;return;}if(e.detail===0)return;if(e.pointerId!==undefined&&e.pointerId!==suppressClick.id)return;suppressClick=null;e.preventDefault();e.stopImmediatePropagation?.();e.stopPropagation?.();}
 function nativeDrag(e){if(e.target?.closest?.(SOURCE_SELECTOR))e.preventDefault();}
 function key(e){if(e.key==='Escape'&&(pending||active))cancel();}
 function blur(){if(pending||active)cancel();}
 root.classList.add('lor-drag-enabled');
 root.addEventListener('pointerdown',down,true);root.addEventListener('click',click,true);root.addEventListener('dragstart',nativeDrag,true);
 doc.addEventListener('pointermove',move,{capture:true,passive:false});doc.addEventListener('pointerup',up,true);doc.addEventListener('pointercancel',pointerCancel,true);doc.addEventListener('keydown',key,true);win.addEventListener?.('blur',blur);
 return {cancel,destroy(){if(destroyed)return;destroyed=true;cleanup();suppressClick=null;root.classList.remove('lor-drag-enabled');root.removeEventListener('pointerdown',down,true);root.removeEventListener('click',click,true);root.removeEventListener('dragstart',nativeDrag,true);doc.removeEventListener('pointermove',move,true);doc.removeEventListener('pointerup',up,true);doc.removeEventListener('pointercancel',pointerCancel,true);doc.removeEventListener('keydown',key,true);win.removeEventListener?.('blur',blur);}};
}
