import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS,act,view,attack,keywords} from '../src/engine.js';
import {fixture,hand,unit,play,pass,pass2} from './helpers.mjs';
const chain=g=>{while(g.stack.length&&g.winner===null)g=pass(g);return g;};
test('full-board replacement obliterates rather than killing or triggering Last Breath',()=>{
 let g=fixture();unit(g,0,'01SI043');for(let i=0;i<5;i++)unit(g,0,'01DE039','ally'+i);hand(g,0,'01PZ059');
 assert.throws(()=>act(g,0,{type:'play',uid:'01PZ059'}),/战场已满/);
 const before=JSON.stringify(g);assert.throws(()=>act(g,0,{type:'play',uid:'01PZ059',replace:'foreign'}));assert.equal(JSON.stringify(g),before);
 g=act(g,0,{type:'play',uid:'01PZ059',replace:'01SI043'});assert.equal(g.players[0].board.length,6);assert.equal(g.players[0].unitsDied,0);assert.ok(!g.players[0].board.some(u=>u.card==='01SI002'));
});
test('capture releases a reset original unit when captor is recalled, without any death event',()=>{
 let g=fixture();const captor=unit(g,0,'01DE039'),victim=unit(g,1,'01PZ059');victim.atk=9;victim.hp=1;
 g=chain(play(g,0,'01DE025',captor.uid,victim.uid));assert.equal(g.players[1].board.length,0);assert.equal(g.players[1].unitsDied,0);
 g.priority=0;g=play(g,0,'01IO011',captor.uid);g=chain(g);assert.equal(g.players[1].board[0].card,'01PZ059');assert.equal(g.players[1].board[0].atk,CARDS['01PZ059'].atk);assert.equal(g.players[1].board[0].hp,CARDS['01PZ059'].hp);
});
test('Deny can itself be denied, restoring the original effect in LIFO order',()=>{
 let g=fixture();g=play(g,0,'01PZ052','core1');const original=g.stack[0].uid;
 g=play(g,1,'01IO049',original);const denial=g.stack[1].uid;
 g=play(g,0,'01IO049',denial);g=chain(g);assert.equal(g.players[1].hp,18);assert.equal(g.stack.length,0);
});
test('Manifest selection is private, immutable, and preserves the next action priority',()=>{
 let g=fixture();g.players[0].regions=['PiltoverZaun'];g=play(g,0,'01PZ029');assert.equal(g.choice.p,0);assert.equal(g.choice.options.length,3);assert.deepEqual(view(g,1).choice.options,[]);assert.equal(view(g,0).choice.options.length,3);
 const before=JSON.stringify(g);assert.throws(()=>act(g,0,{type:'choose',choice:'01DE039'}));assert.equal(JSON.stringify(g),before);
 const picked=g.choice.options[0];g=act(g,0,{type:'choose',choice:picked});assert.equal(g.choice,undefined);assert.ok(g.players[0].hand.some(h=>h.card===picked));assert.equal(g.priority,1);
});
test('temporary spell discount expires after the creation round',()=>{
 let g=fixture();g.players[0].deck[0].card='01PZ059';g=play(g,0,'01PZ034');const map=g.players[0].hand.find(h=>h.card==='01PZ026');assert.equal(view(g,0).players[0].hand.find(h=>h.uid===map.uid).cost,0);
 g=pass2(g);assert.equal(view(g,0).players[0].hand.find(h=>h.uid===map.uid).cost,2);
});
test('everywhere buffs also affect future fresh summons and leave enemy copies unchanged',()=>{
 let g=fixture();unit(g,0,'01NX021');unit(g,1,'01NX021','enemy');hand(g,0,'01NX021','future');g=act(g,0,{type:'attack',units:['01NX021']});assert.equal(attack(g.players[0].board[0],g),4);assert.equal(attack(g.players[1].board[0],g),3);
 g=act(g,1,{type:'block',assignments:{}});g.priority=0;g=act(g,0,{type:'play',uid:'future'});assert.equal(g.players[0].board.find(u=>u.uid==='future').atk,4);
});
test('summoning an already globally leveled champion does not replay its original level-up reward',()=>{
 let g=fixture();g.players[0].levels['01FR038']=true;const before=g.players[0].deck.length;g=play(g,0,'01FR038');assert.equal(g.players[0].board[0].card,'01FR038T2');assert.equal(g.players[0].deck.length,before);assert.ok(!g.players[0].deck.some(h=>h.card==='01FR038T3'));
 g=fixture();g.players[0].levels['01DE042']=true;g=play(g,0,'01DE042');assert.equal(g.players[0].board[0].card,'01DE042T2');assert.equal(g.players[0].hand.length,0);
});
test('multi-ally grants support one or two available allied targets',()=>{
 for(const [id,a,h] of [['01FR010',0,3],['01DE041',3,3],['01NX025',2,0]]){
  let g=fixture();const ally=unit(g,0,'01PZ059');g=play(g,0,id,null,null,{targets:[ally.uid]});g=chain(g);assert.equal(attack(g.players[0].board[0],g),ally.atk+a);assert.equal(g.players[0].board[0].maxHp,ally.maxHp+h);
 }
 let g=fixture();const first=unit(g,0,'01PZ059','first'),second=unit(g,0,'01DE039','second');
 g=play(g,0,'01DE041',null,null,{targets:[first.uid,second.uid]});assert.equal(g.players[0].board.find(u=>u.uid===first.uid).maxHp,first.maxHp+3);
});
test('replacement cannot also erase a required sacrifice or its Play target',()=>{
 let g=fixture();for(let i=0;i<6;i++)unit(g,0,'01DE039','ally'+i);hand(g,0,'01SI011');assert.throws(()=>act(g,0,{type:'play',uid:'01SI011',replace:'ally0',sacrifices:['ally0']}),/不能同时/);
 hand(g,0,'01IO044');assert.throws(()=>act(g,0,{type:'play',uid:'01IO044',replace:'ally0',target:'ally0'}),/不能同时/);
});
