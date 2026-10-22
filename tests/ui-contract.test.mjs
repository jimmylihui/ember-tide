import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as engine from '../src/engine.js';

// Exercise the real UI event handlers and action serializer with a minimal DOM
// facade. This runs no browser and does not replace engine rule tests.
const source=readFileSync(new URL('../src/app.js',import.meta.url),'utf8').replace(/^import[^\n]+\n/gm,'');
const plain=x=>JSON.parse(JSON.stringify(x));
function harness(metadata={},options={}){
 const listeners={},actions=[];
 const app={innerHTML:'',addEventListener:(name,fn)=>listeners[name]=fn};
 const toast={textContent:'',classList:{add(){},remove(){}}};
 const storage={getItem(){return null;},setItem(){}};
 const cards=Object.fromEntries(Object.entries(engine.CARDS).map(([id,c])=>[id,{...c}]));
 const code='01PZ052';cards[code]={...cards[code],target:'none',target2:undefined,target3:undefined,targets:undefined,targetOptional:false,targetCount:undefined,freesBoardSlot:false,sacrifice:undefined,discard:undefined,...metadata};
 const sandbox={createMotion:()=>({capture(){},play:options.motionPlay||(()=>Promise.resolve()),reset(){},setReduced(){}}),installDrag:()=>({cancel(){},destroy(){}}),C:cards,REGIONS:engine.REGIONS,PRESETS:engine.PRESETS,DATASET:engine.DATASET,cardSupported:engine.cardSupported,createGame:engine.createGame,view:engine.view,attack:engine.attack,keywords:engine.keywords,act:(state,p,action)=>{actions.push(plain(action));return options.realAct?engine.act(state,p,action):{...structuredClone(state),version:state.version+1};},document:{querySelector:s=>s==='#app'?app:s==='#toast'?toast:null,addEventListener(){}},localStorage:storage,sessionStorage:storage,setTimeout(){},setInterval(){},navigator:{},structuredClone};
 vm.createContext(sandbox);
 vm.runInContext(source+`\nglobalThis.ui={set(state){mode='local';full=state;g=view(state,0);seat=0;ready=true;curtain=false;busy=false;resetSelection();},select(uid){selected=uid;},state(){return {game:g,mode,seat,curtain,busy,sessionEpoch,selected,attackMode,attackers:[...attackers],challenges,blocks,fixedTargets,extraTargets,sacrifices:[...sacrifices],targetGroup,replaceUid};},setCurtain(value){curtain=value;},dispatch,canDrop,handleDrop,localSnapshot,targetPlan,targetReady,groupMinimum,activeGroup,handTargetable,pickTarget,doPlay,selectionMarkup,stackMarkup,manifestMarkup,render};`,sandbox);
 const state=engine.createGame(()=>0.4);state.phase='main';state.round=4;state.priority=0;state.stack=[];state.combat=null;
 const unit=uid=>({uid,card:'01DE020',atk:2,hp:2,maxHp:2,tempAtk:0,tempHp:0,kw:[],tempKw:[],removedKw:[],flags:{}});
 state.players[0].hand=[{uid:'source',card:code},{uid:'handUnit',card:'01DE020'},{uid:'handSpell',card:'01FR001'}];
 state.players[0].board=[unit('allyA'),unit('allyB')];state.players[1].board=[unit('enemyA'),unit('enemyB'),unit('enemyC')];
 for(const p of state.players){p.mana=10;p.maxMana=10;p.bank=3;}
 sandbox.ui.set(state);sandbox.ui.select('source');
 return {ui:sandbox.ui,state,actions,app,listeners,toast,reset(){sandbox.ui.set(state);sandbox.ui.select('source');}};
}

test('UI serializes three fixed targets into target/target2/target3',()=>{
 const h=harness({targets:['enemyUnit','enemyUnit','enemyUnit']});
 assert.equal(h.ui.targetReady(),false);
 h.ui.pickTarget('enemyA');h.ui.pickTarget('enemyA');
 assert.equal(h.ui.targetReady(),false,'one unit cannot fill multiple fixed slots');
 h.ui.pickTarget('enemyB');h.ui.pickTarget('enemyC');
 assert.equal(h.ui.targetReady(),true);h.ui.doPlay();
 assert.deepEqual(h.actions[0],{type:'play',uid:'source',target:'enemyA',target2:'enemyB',target3:'enemyC',targets:[],replace:null,sacrifices:[],choice:'attack',discards:[]});
});

test('UI supports zero-to-three distinct optional extra targets and removal',()=>{
 const h=harness({targetCount:{type:'enemyUnit',min:0,max:3,distinct:true}});
 assert.equal(h.ui.targetReady(),true,'Minah can be played without targets');
 h.ui.pickTarget('enemyA');h.ui.pickTarget('enemyB');h.ui.pickTarget('enemyC');
 assert.deepEqual(plain(h.ui.state().extraTargets),['enemyA','enemyB','enemyC']);
 h.ui.pickTarget('core1');assert.equal(h.ui.state().extraTargets.length,3,'unit-only group rejects Nexus');
 h.ui.pickTarget('enemyB');assert.deepEqual(plain(h.ui.state().extraTargets),['enemyA','enemyC']);
 h.ui.doPlay();assert.deepEqual(h.actions[0].targets,['enemyA','enemyC']);assert.equal(h.actions[0].target,null);
});

test('UI keeps fixed and variable targets separate and supports virtual self',()=>{
 const h=harness({target:'enemy',targetCount:{type:'ally',min:0,max:6,distinct:true,includeSelf:true}});
 h.ui.pickTarget('core1');h.ui.pickTarget('allyB');h.ui.pickTarget('source');
 assert.equal(h.ui.targetReady(),true);h.ui.doPlay();
 assert.equal(h.actions[0].target,'core1');assert.deepEqual(h.actions[0].targets,['allyB','source']);
});

test('UI requires all available Trueshot targets and preserves their order',()=>{
 const h=harness({targetCount:{type:'enemy',min:1,max:3,requireMaximum:true,distinct:true}});
 assert.equal(h.ui.groupMinimum(h.ui.activeGroup()),3);
 h.ui.pickTarget('enemyB');h.ui.pickTarget('core1');assert.equal(h.ui.targetReady(),false);
 h.ui.pickTarget('enemyA');assert.equal(h.ui.targetReady(),true);
 h.ui.doPlay();assert.deepEqual(h.actions[0].targets,['enemyB','core1','enemyA']);
 h.state.players[1].board=[];h.reset();assert.equal(h.ui.groupMinimum(h.ui.activeGroup()),1);
});

test('UI records sacrifice costs separately and rejects enemy sacrifices',()=>{
 const h=harness({sacrifice:{count:2}});
 h.ui.pickTarget('enemyA');assert.deepEqual(plain(h.ui.state().sacrifices),[]);
 h.ui.pickTarget('allyA');assert.equal(h.ui.targetReady(),false);
 h.ui.doPlay();assert.equal(h.actions.length,0);
 h.ui.pickTarget('allyB');assert.equal(h.ui.targetReady(),true);h.ui.doPlay();
 assert.deepEqual(h.actions[0].sacrifices,['allyA','allyB']);assert.deepEqual(h.actions[0].targets,[]);
});

test('UI selects a concrete response-chain UID for Deny',()=>{
 const h=harness({target:'stack'});h.state.stack=[{uid:'s9',cid:'01PZ052',displayId:'01PZ052',p:1}];h.reset();
 assert.match(h.ui.stackMarkup(),/data-stack="s9"/);
 h.ui.pickTarget('s9');h.ui.doPlay();assert.equal(h.actions[0].target,'s9');
});

test('UI hand-unit targets distinguish units from spells and the source',()=>{
 const h=harness({target:'allyHandUnit'});
 assert.equal(h.ui.handTargetable({uid:'handUnit',card:'01DE020'}),true);
 assert.equal(h.ui.handTargetable({uid:'handSpell',card:'01FR001'}),false);
 assert.equal(h.ui.handTargetable({uid:'source',card:'01DE020'}),false);
 h.ui.pickTarget('handUnit');h.ui.doPlay();assert.equal(h.actions[0].target,'handUnit');
});

test('Manifest displays only the choosing player options and sends the selected code',async()=>{
 const h=harness();h.state.choice={p:0,options:['01DE012','01NX038','01FR009']};h.reset();
 assert.match(h.ui.manifestMarkup(),/data-choice="01NX038"/);
 await h.listeners.click({target:{closest(selector){return selector==='[data-choice]'?{dataset:{choice:'01NX038'}}:null;}}});
 assert.deepEqual(h.actions[0],{type:'choose',choice:'01NX038'});
 h.state.choice.p=1;h.reset();assert.equal(h.ui.manifestMarkup(),'');
});


test('UI full-board replacement is separate from sacrifice and recall costs',()=>{
 const h=harness({kind:'unit'});
 for(let i=0;i<4;i++)h.state.players[0].board.push({...h.state.players[0].board[0],uid:'extra'+i});
 h.reset();assert.equal(h.ui.targetReady(),false);h.ui.pickTarget('allyA');assert.equal(h.ui.targetReady(),true);
 h.ui.doPlay();assert.equal(h.actions[0].replace,'allyA');assert.deepEqual(h.actions[0].sacrifices,[]);
 const sacrifice=harness({kind:'unit',sacrifice:{count:1}});
 for(let i=0;i<4;i++)sacrifice.state.players[0].board.push({...sacrifice.state.players[0].board[0],uid:'extra'+i});
 sacrifice.reset();sacrifice.ui.pickTarget('allyA');assert.equal(sacrifice.ui.targetReady(),true);
 sacrifice.ui.doPlay();assert.equal(sacrifice.actions[0].replace,null);assert.deepEqual(sacrifice.actions[0].sacrifices,['allyA']);
});


test('UI accepts schema 3 local saves and rejects older sessions',()=>{
 const h=harness();assert.equal(h.ui.localSnapshot(JSON.stringify(h.state)).schema,3);
 assert.throws(()=>h.ui.localSnapshot(JSON.stringify({...h.state,schema:2})),/舊版本/);
 assert.throws(()=>h.ui.localSnapshot('null'),/舊版本/);
});

test('UI full board recall cost uses the chosen ally without requiring erase',()=>{
 const h=harness({kind:'unit',target:'ally',freesBoardSlot:true});
 for(let i=0;i<4;i++)h.state.players[0].board.push({...h.state.players[0].board[0],uid:'extra'+i});
 h.reset();h.ui.pickTarget('allyA');assert.equal(h.ui.targetReady(),true);h.ui.doPlay();
 assert.equal(h.actions[0].replace,null);assert.equal(h.actions[0].target,'allyA');
});


test('UI cannot use one unit as both replacement and sacrifice cost',async()=>{
 const h=harness({kind:'unit',sacrifice:{count:1}});
 for(let i=0;i<4;i++)h.state.players[0].board.push({...h.state.players[0].board[0],uid:'extra'+i});
 h.reset();h.ui.pickTarget('allyA');
 await h.listeners.click({target:{closest(selector){return selector==='[data-replace-mode]'?{dataset:{}}:null;}}});
 h.ui.pickTarget('allyA');assert.equal(h.ui.state().replaceUid,null);assert.deepEqual(plain(h.ui.state().sacrifices),['allyA']);
 h.ui.pickTarget('allyB');assert.equal(h.ui.state().replaceUid,'allyB');
});


test('drag integration summons a costless untargeted unit on its own board',()=>{
 const h=harness({kind:'unit'}),source={kind:'hand',uid:'source'},drop={kind:'board',p:0};
 assert.equal(h.ui.canDrop(source,drop),true);h.ui.handleDrop({...source,drop});
 assert.equal(h.actions.length,1);assert.equal(h.actions[0].type,'play');assert.equal(h.actions[0].uid,'source');
});

test('drag integration keeps targeted and multi-target cards pending confirmation',()=>{
 const h=harness({kind:'unit',target:'ally'}),source={kind:'hand',uid:'source'};
 h.ui.handleDrop({...source,drop:{kind:'board',p:0}});assert.equal(h.actions.length,0);assert.equal(h.ui.state().selected,'source');
 h.ui.handleDrop({...source,drop:{kind:'unit',uid:'allyA',p:0}});assert.equal(h.ui.state().fixedTargets[0],'allyA');assert.equal(h.actions.length,0);
 const m=harness({kind:'unit',targetCount:{type:'enemyUnit',min:0,max:3,distinct:true}});
 m.ui.handleDrop({...source,drop:{kind:'unit',uid:'enemyA',p:1}});
 assert.deepEqual(plain(m.ui.state().extraTargets),['enemyA']);assert.equal(m.actions.length,0);
});

test('dragging a targeted spell onto own board selects it without casting',()=>{
 const h=harness({kind:'spell',target:'enemyUnit'}),source={kind:'hand',uid:'source'},drop={kind:'board',p:0};
 assert.equal(h.ui.canDrop(source,drop),true);h.ui.handleDrop({...source,drop});
 assert.equal(h.ui.state().selected,'source');assert.equal(h.actions.length,0);
});

test('unit drag into arena selects attackers and still requires attack confirmation',()=>{
 const h=harness();h.state.tokens=[true,false];h.reset();const source={kind:'unit',uid:'allyA'},drop={kind:'arena'};
 assert.equal(h.ui.canDrop(source,drop),true);h.ui.handleDrop({...source,drop});
 assert.equal(h.ui.state().attackMode,true);assert.deepEqual(plain(h.ui.state().attackers),['allyA']);assert.equal(h.actions.length,0);
});

test('unit drag onto an attacker lane assigns a blocker without committing combat',()=>{
 const h=harness();h.state.phase='block';h.state.combat={p:1,lanes:[{attacker:'enemyA',blocker:null,challenged:false}]};h.reset();
 const source={kind:'unit',uid:'allyA'},drop={kind:'lane',uid:'enemyA',p:0};
 assert.equal(h.ui.canDrop(source,drop),true);h.ui.handleDrop({...source,drop});
 assert.deepEqual(plain(h.ui.state().blocks),{enemyA:'allyA'});assert.equal(h.actions.length,0);
});

test('Challenger drag selects its attacker and the challenged enemy',()=>{
 const h=harness();h.state.tokens=[true,false];h.state.players[0].board[0].card='01FR009';h.reset();
 const source={kind:'unit',uid:'allyA'},drop={kind:'unit',uid:'enemyA',p:1};
 assert.equal(h.ui.canDrop(source,drop),true);h.ui.handleDrop({...source,drop});
 assert.deepEqual(plain(h.ui.state().attackers),['allyA']);assert.deepEqual(plain(h.ui.state().challenges),{allyA:'enemyA'});assert.equal(h.actions.length,0);
});

test('drag integration ignores off-turn and privacy-curtain drop intents',()=>{
 const h=harness({kind:'unit'}),intent={kind:'hand',uid:'source',drop:{kind:'board',p:0}};
 h.state.priority=1;h.reset();assert.equal(h.ui.canDrop(intent,intent.drop),false);h.ui.handleDrop(intent);assert.equal(h.actions.length,0);
 h.state.priority=0;h.reset();h.ui.setCurtain(true);assert.equal(h.ui.canDrop(intent,intent.drop),false);h.ui.handleDrop(intent);assert.equal(h.actions.length,0);
});


function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}

test('local dispatch animates from old seat before hiding the next player hand behind handover',async()=>{
 const animation=deferred(),frames=[];let hold=false;
 const h=harness({}, {realAct:true,motionPlay:(game,frame)=>{frames.push({game,seat:frame.seat,curtain:frame.curtain,mode:frame.mode});return hold?animation.promise:Promise.resolve();}});
 hold=true;const completion=h.ui.dispatch({type:'play',uid:'handUnit'});
 const during=h.ui.state();
 assert.equal(during.seat,0);assert.equal(during.busy,true);assert.equal(during.curtain,false);
 assert.equal(during.game.priority,1,'real engine has already transferred action priority');
 assert.equal(during.game.players[0].board.length,3,'real unit play has resolved');
 assert.ok(during.game.players[1].hand.every(card=>card.hidden&&!('card' in card)),'animation snapshot must keep the other seat hand hidden');
 assert.equal(frames.at(-1).seat,0);assert.equal(frames.at(-1).curtain,false);
 assert.doesNotMatch(h.app.innerHTML,/class="curtain"/,'handover must wait for animation');
 animation.resolve();await completion;
 const after=h.ui.state();assert.equal(after.seat,1);assert.equal(after.curtain,true);assert.equal(after.busy,false);
 assert.ok(after.game.players[0].hand.every(card=>card.hidden));
 assert.ok(after.game.players[1].hand.every(card=>!card.hidden&&card.card),'the current view can hold the new seat cards while the DOM hides them');
 const handMarkup=h.app.innerHTML.match(/<div class="hand">([\s\S]*?)<\/div><\/section>/)?.[1];
 assert.ok(handMarkup);assert.match(handMarkup,/class="card back"/);assert.doesNotMatch(handMarkup,/data-hand=/);
 assert.match(h.app.innerHTML,/class="curtain"/);
});

test('leaving during a pending local animation cannot reopen the abandoned table',async()=>{
 const animation=deferred();let hold=false;
 const h=harness({}, {realAct:true,motionPlay:()=>hold?animation.promise:Promise.resolve()});
 hold=true;const completion=h.ui.dispatch({type:'play',uid:'handUnit'});
 assert.equal(h.ui.state().busy,true);const oldEpoch=h.ui.state().sessionEpoch;
 await h.listeners.click({target:{closest(selector){return selector==='[data-action]'?{dataset:{action:'leave'}}:null;}}});
 assert.equal(h.ui.state().mode,'lobby');assert.ok(h.ui.state().sessionEpoch>oldEpoch);assert.match(h.app.innerHTML,/class="lobby"/);
 animation.resolve();await completion;
 const after=h.ui.state();assert.equal(after.mode,'lobby');assert.equal(after.curtain,false);assert.equal(after.busy,false);
 assert.match(h.app.innerHTML,/class="lobby"/);assert.doesNotMatch(h.app.innerHTML,/class="game"/);
});
