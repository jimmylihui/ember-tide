import test from 'node:test';
import assert from 'node:assert/strict';
import {installDrag} from '../src/drag.js';

class Events {
 listeners=new Map();
 addEventListener(name,fn){if(!this.listeners.has(name))this.listeners.set(name,new Set());this.listeners.get(name).add(fn);}
 removeEventListener(name,fn){this.listeners.get(name)?.delete(fn);}
 emit(name,event){for(const fn of [...(this.listeners.get(name)||[])])fn(event);}
}
class ClassList {
 values=new Set();
 add(...names){names.forEach(n=>this.values.add(n));}
 remove(...names){names.forEach(n=>this.values.delete(n));}
 contains(name){return this.values.has(name);}
}
function datasetKey(attr){return attr.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase());}
class Element extends Events {
 constructor(doc,dataset={}){super();this.ownerDocument=doc;this.dataset={...dataset};this.classList=new ClassList();this.style={};this.children=[];this.attrs={};this.parentElement=null;this.rect={left:10,top:20,width:100,height:140};}
 appendChild(el){el.parentElement=this;this.children.push(el);return el;}
 remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(x=>x!==this);this.parentElement=null;}
 contains(el){for(let node=el;node;node=node.parentElement)if(node===this)return true;return false;}
 matches(selector){return selector.split(',').some(s=>{const attr=s.trim().slice(1,-1);return attr==='id'?this.attrs.id!==undefined:attr.startsWith('data-')&&this.dataset[datasetKey(attr)]!==undefined;});}
 closest(selector){for(let n=this;n;n=n.parentElement)if(n.matches(selector))return n;return null;}
 querySelectorAll(selector){return this.children.flatMap(c=>[...(c.matches(selector)?[c]:[]),...c.querySelectorAll(selector)]);}
 cloneNode(deep){const copy=new Element(this.ownerDocument,this.dataset);copy.rect={...this.rect};for(const name of this.classList.values)copy.classList.add(name);if(deep)for(const c of this.children)copy.appendChild(c.cloneNode(true));return copy;}
 setAttribute(key,value){this.attrs[key]=value;if(key==='class'){this.classList=new ClassList();this.classList.add(...value.split(' '));}}
 removeAttribute(key){delete this.attrs[key];}
 getBoundingClientRect(){return this.rect;}
 setPointerCapture(id){this.captured=id;}
 releasePointerCapture(){this.captured=null;}
}
function fixture(canDrop=(s,d)=>s.kind==='hand'&&d.kind==='board'&&d.p===0){
 const win=new Events();let time=0,next=0;const timers=new Map(),frames=new Map();
 Object.assign(win,{performance:{now:()=>time},setTimeout:(fn,delay)=>{const id=++next;timers.set(id,{fn,at:time+delay});return id;},clearTimeout:id=>timers.delete(id),requestAnimationFrame:fn=>{const id=++next;frames.set(id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id)});
 const doc=new Events();doc.defaultView=win;doc.body=new Element(doc);doc.hits=[];doc.elementsFromPoint=()=>doc.hits;doc.createElementNS=()=>new Element(doc);
 const root=doc.body.appendChild(new Element(doc)),hand=root.appendChild(new Element(doc,{hand:'h1'})),board0=root.appendChild(new Element(doc,{board:'0'})),board1=root.appendChild(new Element(doc,{board:'1'})),unit=board0.appendChild(new Element(doc,{unit:'u1'})),enemy=board1.appendChild(new Element(doc,{unit:'e1'})),arena=root.appendChild(new Element(doc,{arena:''})),lane=arena.appendChild(new Element(doc,{lane:'e1'})),core=root.appendChild(new Element(doc,{core:'1'})),stack=root.appendChild(new Element(doc,{stack:'s9'}));
 const state={game:{phase:'main',winner:null,stack:[],tokens:[true,false],players:[{hand:[{uid:'h1'}],board:[{uid:'u1'}]},{hand:[],board:[{uid:'e1'}]}]},seat:0,mine:true,curtain:false,selected:null,canDrop};
 const drops=[],drag=installDrag({root,getState:()=>state,onDrop:e=>drops.push(e)});
 const event=(target,x=30,y=40,extra={})=>({target,clientX:x,clientY:y,pointerId:1,pointerType:'mouse',button:0,isPrimary:true,cancelable:true,prevented:false,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;},stopPropagation(){},...extra});
 return {doc,root,hand,board0,board1,unit,enemy,arena,lane,core,stack,state,drops,drag,event,timers,frames,advance(ms){time+=ms;for(const [id,t]of [...timers])if(t.at<=time){timers.delete(id);t.fn();}},down(el=hand,extra={}){const e=event(el,30,40,extra);root.emit('pointerdown',e);return e;},move(x,y,extra={}){const e=event(hand,x,y,extra);doc.emit('pointermove',e);return e;},up(x=70,y=100,extra={}){const e=event(hand,x,y,extra);doc.emit('pointerup',e);return e;}};
}

test('ordinary card clicks are untouched until drag threshold is crossed',()=>{
 const f=fixture();f.down();f.move(32,42);f.up(32,42);const click=f.event(f.hand,32,42,{detail:1});f.root.emit('click',click);
 assert.equal(click.prevented,false);assert.deepEqual(f.drops,[]);assert.equal(f.doc.body.children.length,1);f.drag.destroy();
});

test('mouse hand drag follows pointer, highlights only legal zones and emits one intent',()=>{
 const f=fixture();f.doc.hits=[f.board0];f.down();f.move(70,110);
 assert.equal(f.hand.classList.contains('lor-drag-source'),true);assert.equal(f.board0.classList.contains('lor-drag-dropzone'),true);assert.equal(f.board1.classList.contains('lor-drag-dropzone'),false);
 const ghost=f.doc.body.children.find(x=>x.classList.contains('lor-drag-ghost'));assert.match(ghost.style.transform,/translate3d\(50px,90px,0\)/);
 f.up(90,120);assert.equal(f.drops.length,1);assert.deepEqual(f.drops[0],{kind:'hand',uid:'h1',drop:{kind:'board',p:0},pointerType:'mouse',start:{x:30,y:40},point:{x:90,y:120}});
 assert.equal(f.hand.classList.contains('lor-drag-source'),false);assert.equal(f.board0.classList.contains('lor-drag-dropzone'),false);assert.equal(f.doc.body.children.length,1);
 const click=f.event(f.hand,90,120,{detail:1});f.root.emit('click',click);assert.equal(click.prevented,true,'the synthetic click after a drag must not also select or play');
 const keyboard=f.event(f.hand,90,120,{detail:0});f.root.emit('click',keyboard);assert.equal(keyboard.prevented,false);f.drag.destroy();
});

test('a horizontal touch gesture keeps hand scrolling and cancels long press',()=>{
 const f=fixture();f.down(f.hand,{pointerType:'touch'});const e=f.move(55,43,{pointerType:'touch'});f.advance(500);
 assert.equal(e.prevented,false);assert.equal(f.hand.classList.contains('lor-drag-source'),false);assert.equal(f.timers.size,0);assert.equal(f.doc.body.children.length,1);assert.equal(f.drops.length,0);f.drag.destroy();
});

test('touch hand drag activates with vertical intent or a stationary long press',()=>{
 for(const longPress of [false,true]){
  const f=fixture();f.doc.hits=[f.board0];f.down(f.hand,{pointerType:'touch'});
  if(longPress)f.advance(240);else assert.equal(f.move(32,55,{pointerType:'touch'}).prevented,true);
  assert.equal(f.hand.classList.contains('lor-drag-source'),true);f.up(80,100,{pointerType:'touch'});assert.equal(f.drops[0].pointerType,'touch');f.drag.destroy();
 }
});

test('board unit drag draws a blocking line and identifies the attacker lane',()=>{
 const f=fixture((s,d)=>s.kind==='unit'&&d.kind==='lane');f.state.game.phase='block';f.state.game.combat={p:1,lanes:[{attacker:'e1'}]};f.doc.hits=[f.lane];f.down(f.unit);f.move(80,90);
 const line=f.doc.body.children.find(x=>x.classList.contains('lor-drag-line'));assert.ok(line);assert.equal(line.classList.contains('lor-drag-block'),true);assert.ok(line.children[0].attrs.d.startsWith('M '));
 f.up();assert.deepEqual(f.drops[0].drop,{kind:'lane',uid:'e1',p:0});assert.equal(f.drops[0].kind,'unit');assert.equal(f.doc.body.children.length,1);f.drag.destroy();
});

test('drop target climbs to a legal board behind a non-targetable unit',()=>{
 const f=fixture();f.doc.hits=[f.unit];f.down();f.move(70,90);f.up();assert.deepEqual(f.drops[0].drop,{kind:'board',p:0});f.drag.destroy();
});

test('stack drops use their observed response UID',()=>{
 const f=fixture((s,d)=>d.kind==='stack');f.doc.hits=[f.stack];f.down();f.move(80,90);f.up();assert.deepEqual(f.drops[0].drop,{kind:'stack',uid:'s9'});f.drag.destroy();
});

test('curtain, opponent ownership and stale turn changes cannot emit drops',()=>{
 const f=fixture(()=>true);f.doc.hits=[f.board0];f.down(f.enemy);f.move(90,100);f.up();assert.equal(f.drops.length,0);assert.equal(f.doc.body.children.length,1);
 f.state.curtain=true;f.down();f.move(90,100);f.up();assert.equal(f.drops.length,0);
 f.state.curtain=false;f.down();f.move(90,100);f.state.mine=false;f.up();assert.equal(f.drops.length,0);assert.equal(f.doc.body.children.length,1);f.drag.destroy();
});

test('cancel/destroy remove ghosts, lines, highlights and document listeners',()=>{
 const f=fixture(()=>true);f.doc.hits=[f.arena];f.down(f.unit);f.move(90,100);assert.equal(f.doc.body.children.length,3);f.drag.cancel();assert.equal(f.doc.body.children.length,1);assert.equal(f.root.classList.contains('lor-dragging'),false);
 f.drag.destroy();f.drag.destroy();assert.equal(f.root.classList.contains('lor-drag-enabled'),false);assert.equal([...f.doc.listeners.values()].reduce((n,s)=>n+s.size,0),0);assert.equal(f.frames.size,0);
 f.down();f.move(90,100);f.up();assert.equal(f.drops.length,0);
});
