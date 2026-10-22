import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,act,view,CARDS} from '../src/engine.js';
import {fixture,hand,unit,pass2} from './helpers.mjs';

const latestSeq=g=>Math.max(0,...(g.effects||[]).map(e=>e.seq));
const fresh=(g,after=0)=>g.effects.filter(e=>e.seq>after);
const finish=g=>{for(let n=0;g.stack.length&&g.winner===null;n++){assert.ok(n<25,'response chain terminates');g=act(g,g.priority,{type:'pass'});}return g;};
const cast=(g,p,id,target=null,target2=null,extras={})=>{
 g.priority=p;const uid='presentation-hand-'+(++g.serial);hand(g,p,id,uid);
 return finish(act(g,p,{type:'play',uid,target,target2,...extras}));
};
const effect=(g,type,target=null,after=0)=>fresh(g,after).find(e=>e.type===type&&(target===null||e.target===target||e.uid===target));
function publicOnly(events){
 for(const e of events){
  assert.equal(Number.isInteger(e.seq),true);
  for(const key of ['players','deck','hand','packet','exactUnit','flags','globalBuffs','puffcaps','captured'])assert.equal(Object.hasOwn(e,key),false,`event ${e.type} contains private snapshot ${key}`);
  if(e.target!==undefined)assert.equal(typeof e.target,'string','a target is a public reference, not a unit snapshot');
  if(e.targets!==undefined)assert.ok(e.targets.every(t=>typeof t==='string'),'targets are public references');
  if(e.type==='draw'){
   for(const key of ['uid','card','target','targets'])assert.equal(Object.hasOwn(e,key),false,`draw exposes ${key}`);
   assert.ok(Number.isInteger(e.amount)&&e.amount>0);
  }
 }
}

test('presentation metadata preserves schema 3 and initial draws reveal only public counts',()=>{
 const g=createGame(()=>.35);
 assert.equal(g.schema,3);assert.ok(Array.isArray(g.effects));assert.ok(Number.isInteger(g.effectSerial));
 const draws=g.effects.filter(e=>e.type==='draw');
 assert.equal(draws.reduce((n,e)=>n+e.amount,0),8);
 assert.equal(draws.filter(e=>e.p===0).reduce((n,e)=>n+e.amount,0),4);
 assert.equal(draws.filter(e=>e.p===1).reduce((n,e)=>n+e.amount,0),4);
 publicOnly(g.effects);
});

test('playing a unit emits a public play followed by its summon',()=>{
 let g=fixture();const uid='public-cithria';hand(g,0,'01DE039',uid);const from=latestSeq(g),before=structuredClone(g.effects);
 g=act(g,0,{type:'play',uid});
 const play=effect(g,'play',uid,from),summon=effect(g,'summon',uid,from);
 assert.ok(play);assert.ok(summon);assert.equal(play.card,'01DE039');assert.equal(summon.card,'01DE039');assert.equal(summon.p,0);
 assert.ok(play.seq<summon.seq);assert.deepEqual(g.effects.filter(e=>e.seq<=from),before);
 publicOnly(fresh(g,from));
});

test('damage effects use actual damage after Tough and identify the affected player',()=>{
 let g=fixture();const target=unit(g,1,'01DE020','tough-target'),from=latestSeq(g);
 g=cast(g,0,'01PZ052',target.uid);
 const e=effect(g,'damage',target.uid,from);
 assert.ok(e);assert.equal(e.amount,1);assert.equal(e.p,1);assert.equal(e.sourceP,0);assert.equal(e.target,target.uid);
 assert.equal(g.players[1].board[0].hp,target.hp-1);
});

test('Barrier produces its own impact and never displays prevented damage as actual damage',()=>{
 let g=fixture();const target=unit(g,1,'01DE042','barrier-target'),from=latestSeq(g);
 g=cast(g,0,'01PZ052',target.uid);
 assert.ok(effect(g,'barrier',target.uid,from));
 assert.ok(fresh(g,from).filter(e=>e.type==='damage'&&e.target===target.uid).every(e=>e.amount===0));
 assert.equal(g.players[1].board[0].hp,target.hp);
});

test('healing effects are capped to the amount actually restored, including Nexus healing',()=>{
 let g=fixture();g.players[0].hp=19;const from=latestSeq(g);
 g=cast(g,0,'01IO004','core0');
 const e=effect(g,'heal','core0',from);
 assert.ok(e);assert.equal(e.amount,1);assert.equal(e.p,0);assert.equal(e.sourceP,0);assert.equal(g.players[0].hp,20);
 const after=latestSeq(g);g=cast(g,0,'01IO004','core0');
 assert.ok(fresh(g,after).filter(e=>e.type==='heal').every(e=>e.amount===0),'overhealing cannot show a false +3');
});

test('lethal damage, death and Last Breath summon remain separately ordered in one action',()=>{
 let g=fixture();const keeper=unit(g,1,'01SI048','cursed-keeper'),from=latestSeq(g);
 g=cast(g,0,'01PZ052',keeper.uid);
 const damage=effect(g,'damage',keeper.uid,from),death=effect(g,'death',keeper.uid,from);
 const summoned=fresh(g,from).find(e=>e.type==='summon'&&e.card==='01SI048T1');
 assert.ok(damage);assert.ok(death);assert.ok(summoned);
 assert.equal(death.card,'01SI048');assert.equal(death.p,1);assert.ok(damage.seq<death.seq);assert.ok(death.seq<summoned.seq);
 assert.equal(g.players[1].board[0].card,'01SI048T1');
});

test('champion level events retain the same unit UID and announce the public upgraded card',()=>{
 let g=fixture();const garen=unit(g,0,'01DE012','garen');garen.strikes=1;const enemy=unit(g,1,'01DE039','enemy'),from=latestSeq(g);
 g=cast(g,0,'01DE026',garen.uid,enemy.uid);
 const e=effect(g,'level',garen.uid,from);
 assert.ok(e);assert.equal(e.card,'01DE012T1');assert.equal(e.p,0);assert.equal(g.players[0].board[0].uid,garen.uid);
});

test('attack events publish ordered attackers before combat damage',()=>{
 let g=fixture();const a=unit(g,0,'01DE039','attacker-a'),b=unit(g,0,'01PZ059','attacker-b'),from=latestSeq(g);
 g=act(g,0,{type:'attack',units:[a.uid,b.uid]});const attack=effect(g,'attack',null,from);
 assert.ok(attack);assert.equal(attack.p,0);assert.deepEqual(attack.targets,[a.uid,b.uid]);
 g=act(g,1,{type:'block',assignments:{}});
 const hits=fresh(g,from).filter(e=>e.type==='damage'&&e.target==='core1');
 assert.equal(hits.reduce((n,e)=>n+e.amount,0),a.atk+b.atk);assert.ok(hits.every(e=>e.seq>attack.seq));
});

test('block events retain both public combat references for the animation layer',()=>{
 let g=fixture();const attacker=unit(g,0,'01DE039','attacker'),blocker=unit(g,1,'01PZ059','blocker');
 g=act(g,0,{type:'attack',units:[attacker.uid]});const from=latestSeq(g);
 g=act(g,1,{type:'block',assignments:{[attacker.uid]:blocker.uid}});
 const block=effect(g,'block',null,from);assert.ok(block);assert.equal(block.p,1);
 assert.ok(block.lanes.some(l=>l.attacker===attacker.uid&&l.blocker===blocker.uid));
});

test('round events announce the new round and its attack-token holder',()=>{
 let g=fixture();const from=latestSeq(g),oldRound=g.round;g=pass2(g);
 const e=effect(g,'round',null,from);assert.ok(e);assert.equal(e.round,oldRound+1);assert.equal(e.attacker,g.roundOwner);
 assert.equal(g.schema,3);publicOnly(fresh(g,from));
});

test('one action may deal and restore life without losing either effect to state diffing',()=>{
 let g=fixture();g.players[0].hp=17;const target=unit(g,1,'01PZ059','drain-target'),from=latestSeq(g);
 g=cast(g,0,'01SI054',target.uid);
 const hit=effect(g,'damage',target.uid,from),heal=effect(g,'heal','core0',from);
 assert.ok(hit);assert.ok(heal);assert.equal(hit.amount,3);assert.equal(heal.amount,3);assert.ok(hit.seq<heal.seq);
});

test('public effects are deterministic for the same state and action and do not mutate their input',()=>{
 const g=fixture();unit(g,1,'01PZ059','public-target');hand(g,0,'01PZ052','public-spell');const before=JSON.stringify(g);
 const action={type:'play',uid:'public-spell',target:'public-target'};
 const a=finish(act(g,0,action)),b=finish(act(g,0,action));
 assert.deepEqual(a.effects,b.effects);assert.equal(JSON.stringify(g),before);assert.equal(a.seed,b.seed);
});

test('both player views share identical public effects while hiding internal counters and opponent hands',()=>{
 let g=fixture();unit(g,1,'01PZ059','public-target');g=cast(g,0,'01PZ052','public-target');
 const a=view(g,0),b=view(g,1);
 assert.deepEqual(a.effects,b.effects);assert.deepEqual(a.effects,g.effects);
 assert.equal(a.effectSerial,undefined);assert.equal(b.effectSerial,undefined);
 assert.equal(a.players[0].deck,undefined);assert.equal(b.players[1].deck,undefined);
 assert.ok(a.players[1].hand.every(h=>h.hidden&&!h.card&&!h.uid));assert.ok(b.players[0].hand.every(h=>h.hidden&&!h.card&&!h.uid));
 publicOnly(a.effects);
});

test('draw animation events cannot reveal a tutored card or its hidden instance UID',()=>{
 let g=fixture();const secret={card:'01IO041',uid:'secret-drawn-karma',costDelta:0,atkBonus:0,hpBonus:0,kwBonus:[],puffcaps:0};
 g.players[0].deck=[secret];const from=latestSeq(g);g=cast(g,0,'01FR029');
 assert.ok(g.players[0].hand.some(h=>h.uid===secret.uid));
 const events=fresh(g,from),serialized=JSON.stringify(view(g,1).effects.filter(e=>e.seq>from));
 assert.ok(events.some(e=>e.type==='draw'&&e.p===0&&e.amount===1));
 assert.equal(serialized.includes(secret.card),false);assert.equal(serialized.includes(secret.uid),false);publicOnly(events);
});

test('public spell and play effects omit private hand-target references',()=>{
 let g=fixture();const secret=hand(g,0,'01DE039','secret-buffed-hand-card'),from=latestSeq(g);
 g=cast(g,0,'01IO055',secret.uid);
 const events=fresh(g,from),serialized=JSON.stringify(events);
 assert.equal(serialized.includes(secret.uid),false);assert.equal(serialized.includes(secret.card),false);
 assert.ok(events.some(e=>e.type==='play'&&e.card==='01IO055'));publicOnly(events);
});

test('a newly generated hand card is not announced through public summon or play effects',()=>{
 let g=fixture();g.players[0].largeSpellPlayed=true;const from=latestSeq(g);
 g=cast(g,0,'01DE023');
 const secret=g.players[0].hand.find(h=>h.card==='01DE025');assert.ok(secret);
 const serialized=JSON.stringify(view(g,1).effects.filter(e=>e.seq>from));
 assert.equal(serialized.includes(secret.card),false);assert.equal(serialized.includes(secret.uid),false);
 assert.ok(view(g,1).players[0].hand.every(h=>h.hidden&&!h.card&&!h.uid));
});

test('a private Manifest choice does not expose the selected card through effects',()=>{
 let g=fixture();g.players[0].regions=['PiltoverZaun'];const from=latestSeq(g);
 g=cast(g,0,'01PZ029');assert.ok(g.choice);const choice=g.choice.options[0];
 assert.deepEqual(view(g,1).choice.options,[]);
 g=act(g,0,{type:'choose',choice});const secret=g.players[0].hand.find(h=>h.card===choice);assert.ok(secret);
 const serialized=JSON.stringify(view(g,1).effects.filter(e=>e.seq>from));
 assert.equal(serialized.includes(secret.card),false);assert.equal(serialized.includes(secret.uid),false);publicOnly(g.effects);
});

test('effects remain bounded at 64 entries while sequence numbers keep increasing',()=>{
 let g=fixture();let last=latestSeq(g);
 for(let i=0;i<24;i++){
  g.players[0].mana=10;g.players[0].bank=3;g=cast(g,0,'01PZ052','core1');
  g.players[1].mana=10;g.players[1].bank=3;g=cast(g,1,'01IO004','core1');
  assert.ok(latestSeq(g)>last);last=latestSeq(g);assert.ok(g.effects.length<=64);
 }
 assert.equal(g.effects.length,64);assert.ok(g.effects[0].seq>1);
 for(let i=1;i<g.effects.length;i++)assert.equal(g.effects[i].seq,g.effects[i-1].seq+1);
 assert.equal(g.effects.at(-1).seq,g.effectSerial);publicOnly(g.effects);
});

test('repeated view serialization is read-only and cannot manufacture replay events',()=>{
 let g=fixture();g=cast(g,0,'01NX002');const before=JSON.stringify(g);
 const a=view(g,0),b=view(g,0),c=view(g,1);
 assert.deepEqual(a.effects,b.effects);assert.deepEqual(a.effects,c.effects);assert.equal(JSON.stringify(g),before);
 assert.equal(a.version,b.version);assert.equal(latestSeq(a),latestSeq(b));
});
