import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS,act,view,attack,keywords,cardSupported} from '../src/engine.js';
import {fixture,unit,pass2} from './helpers.mjs';
import {COMPLETION_RULES} from '../src/completion-rules.js';
const packet=(g,card)=>({card,uid:'completion-'+(++g.serial),costDelta:0,atkBonus:0,hpBonus:0,kwBonus:[],puffcaps:0});
const give=(g,p,card)=>{const h=packet(g,card);g.players[p].hand.push(h);return h;};
const add=(g,p,card)=>unit(g,p,card,'completion-unit-'+(++g.serial));
const find=(g,p,u)=>g.players[p].board.find(x=>x.uid===u.uid);
const finish=g=>{let n=0;while(g.stack.length&&g.winner===null&&!g.choice){if(++n>20)throw Error('Unresolved chain');g=act(g,g.priority,{type:'pass'});}return g;};
const cast=(g,p,id,target=null,target2=null,extra={})=>{g.priority=p;const h=give(g,p,id);return finish(act(g,p,{type:'play',uid:h.uid,target,target2,...extra}));};
const play=(g,p,id,target=null,target2=null,extra={})=>{g.priority=p;const h=give(g,p,id);return act(g,p,{type:'play',uid:h.uid,target,target2,...extra});};

test('every non-Shadow Isles collectible has a concrete completed rule',()=>{
 for(const c of Object.values(CARDS).filter(c=>c.collectible&&c.region!=='ShadowIsles'))assert.equal(cardSupported(c.id),true,c.id);
 assert.ok(Object.keys(COMPLETION_RULES).length>80);
});

test('Detain captures without death and releases an unmodified unit when captor is recalled',()=>{
 let g=fixture();const captor=add(g,0,'01DE039'),victim=add(g,1,'01PZ059');victim.atk+=5;
 g=cast(g,0,'01DE025',captor.uid,victim.uid);
 assert.equal(g.players[1].board.length,0);assert.equal(g.players[1].grave.length,0);
 assert.equal(find(g,0,captor).captured.length,1);
 g=cast(g,1,'01IO002',captor.uid);
 assert.equal(g.players[1].board[0].card,'01PZ059');assert.equal(g.players[1].board[0].atk,CARDS['01PZ059'].atk);
 assert.ok(g.players[0].hand.some(h=>h.card==='01DE039'));
});

test('Silverwing Vanguard creates an exact second unit without recursively repeating Play',()=>{
 let g=fixture();g=play(g,0,'01DE004');
 assert.equal(g.players[0].board.length,2);assert.ok(g.players[0].board.every(u=>u.card==='01DE004'));
 assert.notEqual(g.players[0].board[0].uid,g.players[0].board[1].uid);
});

test('Mageseekers trigger from a six-cost spell once and also recognize an earlier large spell',()=>{
 let g=fixture();const inciter=add(g,0,'01DE048');
 g=cast(g,0,'01DE035');const first=find(g,0,inciter);
 assert.equal(first.atk,CARDS['01DE048'].atk+2);assert.equal(first.maxHp,CARDS['01DE048'].hp+2+3);
 g=cast(g,0,'01DE035');assert.equal(find(g,0,inciter).atk,CARDS['01DE048'].atk+2);
 g.priority=0;g.players[0].mana=10;g.players[0].bank=3;g=play(g,0,'01DE023');
 assert.ok(g.players[0].hand.some(h=>h.card==='01DE025'));
});

test('Vanguard Squire only discounts summons seen while it is in hand',()=>{
 let g=fixture();g.players[0].eliteSummons=8;const squire=give(g,0,'01DE036');
 assert.equal(view(g,0).players[0].hand.find(h=>h.uid===squire.uid).cost,CARDS['01DE036'].cost);
 g=play(g,0,'01DE039');
 assert.equal(g.players[0].hand.find(h=>h.uid===squire.uid).costDelta,-1);
});

test('Demacia generation uses the full eligible follower and spell pools',()=>{
 let g=fixture();const lancer=add(g,0,'01DE010');g=cast(g,1,'01SI001',lancer.uid);
 const elite=g.players[0].hand.find(h=>CARDS[h.card].subtypes.includes('ELITE'));
 assert.ok(elite);assert.equal(CARDS[elite.card].hero,false);
 g.priority=0;g.players[0].mana=10;g=cast(g,0,'01DE033');
 const follower=g.players[0].board[0];assert.equal(CARDS[follower.card].cost,5);assert.equal(CARDS[follower.card].region,'Demacia');
});

test('hand grants survive playing the buffed card and Zephyr Sage copies a spell exactly',()=>{
 let g=fixture();const ally=give(g,0,'01DE039');
 g=play(g,0,'01IO023',ally.uid);g.priority=0;
 g=act(g,0,{type:'play',uid:ally.uid});
 assert.equal(find(g,0,ally).atk,CARDS['01DE039'].atk+3);assert.equal(find(g,0,ally).hp,CARDS['01DE039'].hp+3);
 g.players[0].mana=10;g.priority=0;const shot=give(g,0,'01PZ052');shot.costDelta=-1;
 g=play(g,0,'01IO016',shot.uid);
 assert.equal(g.players[0].hand.filter(h=>h.card==='01PZ052'&&h.costDelta===-1).length,2);
});

test('Death Mark removes innate Ephemeral and grants it to the enemy',()=>{
 let g=fixture();const ally=add(g,0,'01IO013'),enemy=add(g,1,'01PZ059');
 g=cast(g,0,'01IO003',ally.uid,enemy.uid);
 assert.equal(keywords(find(g,0,ally),g).includes('Ephemeral'),false);
 assert.equal(keywords(find(g,1,enemy),g).includes('Ephemeral'),true);
 g=pass2(g);assert.ok(find(g,0,ally));assert.equal(find(g,1,enemy),undefined);
});

test('Dawn and Dusk copies current stats, damage, temporary buffs, and adds Ephemeral',()=>{
 let g=fixture();const ally=add(g,0,'01PZ059');ally.atk=6;ally.hp=2;ally.maxHp=5;ally.tempAtk=2;
 g=cast(g,0,'01IO024',ally.uid);
 const copies=g.players[0].board.filter(u=>u.uid!==ally.uid);assert.equal(copies.length,2);
 for(const u of copies){assert.equal(attack(u,g),8);assert.equal(u.hp,2);assert.equal(u.maxHp,5);assert.ok(keywords(u,g).includes('Ephemeral'));}
});

test('Yasuo only reacts to his controller and recalls can kill before the unit returns to hand',()=>{
 let g=fixture();g.players[0].maxMana=9;const yasuo=add(g,0,'01IO015'),enemy=add(g,1,'01DE039');
 g=cast(g,1,'01IO011',enemy.uid);assert.equal(g.players[0].damageDealt,0);
 const target=add(g,1,'01DE039');g=cast(g,0,'01IO002',target.uid);
 assert.equal(find(g,1,target),undefined);assert.equal(g.players[1].hand.filter(h=>h.card==='01DE039').length,1);
 assert.ok(find(g,0,yasuo));
});

test('Zed summons an attacking shadow and levels when he and the shadow hit the Nexus',()=>{
 let g=fixture();const zed=add(g,0,'01IO009');
 g=act(g,0,{type:'attack',units:[zed.uid]});assert.equal(g.combat.lanes.length,2);
 const shadow=g.players[0].board.find(u=>u.card==='01IO009T1');assert.equal(shadow.atk,zed.atk);
 g=act(g,1,{type:'block',assignments:{}});
 assert.equal(find(g,0,zed).card,'01IO009T2');assert.equal(g.players[1].hp,14);
 assert.equal(g.players[0].board.some(u=>u.card==='01IO009T1'),false);
});

test('Deny removes a selected spell from the stack',()=>{
 let g=fixture();g=play(g,0,'01PZ052','core1');const shot=g.stack[0].uid;
 g=cast(g,1,'01IO049',shot);assert.equal(g.players[1].hp,20);assert.equal(g.stack.length,0);
});

test('Minah can recall three ordered enemy targets and Yone can target a single enemy',()=>{
 let g=fixture();const enemies=[add(g,1,'01DE039'),add(g,1,'01PZ059'),add(g,1,'01FR053')];
 g=play(g,0,'01IO033',null,null,{targets:enemies.map(u=>u.uid)});assert.equal(g.stack.length,1);g=finish(g);
 assert.equal(g.players[1].board.length,0);assert.equal(g.players[1].hand.length,3);
 g=fixture();const one=add(g,1,'01DE039');g=play(g,0,'01IO056',null,null,{targets:[one.uid]});g=finish(g);assert.equal(find(g,1,one).stunned,true);
});

test('targeted units can be played on an empty opposing board',()=>{
 for(const id of ['01DE003','01DE009','01FR011','01FR036','01NX005','01NX046','01IO056','01IO033']){
  let g=fixture();g=play(g,0,id);g=finish(g);assert.ok(g.players[0].board.some(u=>u.card===id),id);
 }
});

test('Shadowshift replaces a battling ally and does not summon if recall fails',()=>{
 let g=fixture();const ally=add(g,0,'01DE039'),enemy=add(g,1,'01PZ059');
 g.phase='combat';g.combat={p:1,lanes:[{attacker:enemy.uid,blocker:ally.uid}],defenderActed:true};
 g=play(g,0,'01IO039',ally.uid);g=finish(g);
 assert.ok(g.players[0].hand.some(h=>h.card==='01DE039'));assert.equal(g.players[0].hp,20);
 const r=COMPLETION_RULES['01IO039'];let summoned=0;
 r.effect({t:{u:{uid:'x'}},player:{board:[{uid:'x'}]},recall:()=>false,summon:()=>summoned++});
 assert.equal(summoned,0);
});

test('Karma duplicates a spell once while Flash of Brilliance samples the complete regional pool',()=>{
 let g=fixture();const karma=add(g,0,'01IO041T1'),ally=add(g,0,'01DE039');karma.baseCard='01IO041';
 g=cast(g,0,'01NX027',ally.uid);assert.equal(attack(find(g,0,ally),g),ally.atk+6);
 g=fixture();g.players[0].regions=['PiltoverZaun'];g.players[0].bank=0;g=cast(g,0,'01PZ016');
 assert.equal(g.players[0].bank,3);const h=g.players[0].hand[0];assert.ok(CARDS[h.card].cost>=6);assert.equal(CARDS[h.card].kind,'spell');
});

test('Cloud Drinker discounts Burst and Focus spells while Funsmith increases spell damage',()=>{
 let g=fixture();add(g,0,'01IO031');const burst=give(g,0,'01FR004'),fast=give(g,0,'01PZ052');
 const hand=view(g,0).players[0].hand;assert.equal(hand.find(h=>h.uid===burst.uid).cost,0);assert.equal(hand.find(h=>h.uid===fast.uid).cost,2);
 add(g,0,'01PZ051');g=cast(g,0,'01PZ052','core1');assert.equal(g.players[1].hp,17);
});

test('Thermogenic Beam spends all ordinary and spell mana and remembers the paid amount',()=>{
 let g=fixture();g.players[0].mana=2;g.players[0].bank=3;const target=add(g,1,'01FR026');target.hp=8;target.maxHp=8;
 g=cast(g,0,'01PZ027',target.uid);assert.equal(g.players[0].mana,0);assert.equal(g.players[0].bank,0);assert.equal(find(g,1,target).hp,3);
});

test('Trueshot Barrage keeps damage slots when an earlier target is recalled',()=>{
 let g=fixture();const a=add(g,1,'01PZ059'),b=add(g,1,'01PZ059');
 g=play(g,0,'01PZ004',null,null,{targets:[a.uid,b.uid,'core1']});
 g=play(g,1,'01IO011',a.uid);g=finish(g);
 assert.equal(find(g,1,b).hp,b.hp-2);assert.equal(g.players[1].hp,19);
});

test('Trueshot and Statikk Shock accept fewer targets only when fewer legal targets exist',()=>{
 let g=fixture();g=cast(g,0,'01PZ004',null,null,{targets:['core1']});assert.equal(g.players[1].hp,17);
 g=fixture();const a=add(g,1,'01PZ059');const h=give(g,0,'01PZ004');
 assert.throws(()=>act(g,0,{type:'play',uid:h.uid,targets:['core1']}));
 g=fixture();g=cast(g,0,'01PZ031',null,null,{targets:['core1']});assert.equal(g.players[1].hp,19);assert.equal(g.players[0].hand.length,1);
});

test('Eminent Benefactor offers three regional Epic choices and resumes after choosing',()=>{
 let g=fixture();g.players[0].regions=['PiltoverZaun'];g=play(g,0,'01PZ029');
 assert.equal(g.choice.p,0);assert.equal(g.choice.options.length,3);
 const code=g.choice.options[0];assert.equal(CARDS[code].region,'PiltoverZaun');g=act(g,0,{type:'choose',choice:code});
 assert.ok(g.players[0].hand.some(h=>h.card===code));assert.equal(g.choice==null,true);
});

test('Hextech Transmogulator copies current follower stats and rejects identical targets',()=>{
 let g=fixture();const a=add(g,0,'01DE039'),b=add(g,1,'01PZ059');b.atk=8;b.hp=2;
 const h=give(g,0,'01PZ005');assert.throws(()=>act(g,0,{type:'play',uid:h.uid,target:a.uid,target2:a.uid}));
 g=cast(g,0,'01PZ005',a.uid,b.uid);assert.equal(find(g,0,a).card,b.card);assert.equal(find(g,0,a).atk,8);assert.equal(find(g,0,a).hp,2);
});

test('Iceborn Legacy applies to board, hand, deck, and copies created later',()=>{
 let g=fixture();const ally=add(g,0,'01DE039'),held=give(g,0,'01DE039');g.players[0].deck=[packet(g,'01DE039')];
 g=cast(g,0,'01FR006',ally.uid);assert.equal(find(g,0,ally).atk,ally.atk+2);assert.equal(g.players[0].hand.find(h=>h.uid===held.uid).atkBonus,2);assert.equal(g.players[0].deck[0].atkBonus,2);
 g.players[0].mana=10;g.priority=0;g=play(g,0,'01SI047',ally.uid); // Fading Memories creates a later copy.
 assert.ok(g.players[0].hand.some(h=>h.card==='01DE039'&&h.atkBonus===2));
});

test('Heart of the Fluft combines current Poro stats and positive keywords without deaths',()=>{
 let g=fixture();const a=add(g,0,'01DE049'),b=add(g,0,'01PZ020');a.atk=3;a.hp=2;
 g=play(g,0,'01FR043');const fluft=g.players[0].board[0];
 assert.equal(g.players[0].board.length,1);assert.equal(fluft.card,'01FR043T1');assert.equal(fluft.atk,3+b.atk+CARDS['01FR043'].atk);
 assert.ok(keywords(fluft,g).includes('Tough'));assert.ok(keywords(fluft,g).includes('Elusive'));assert.equal(g.players[0].unitsDied,0);
});

test('She Who Wanders obliterates low-Power board and hand units without Last Breath',()=>{
 let g=fixture();add(g,1,'01SI048');const held=give(g,1,'01DE039'),large=give(g,1,'01FR026');
 g=play(g,0,'01FR052');g=finish(g);
 assert.equal(g.players[1].board.length,0);assert.equal(g.players[1].grave.length,0);assert.equal(g.players[1].hand.some(h=>h.uid===held.uid),false);assert.ok(g.players[1].hand.some(h=>h.uid===large.uid));
});

test('Warmother summons the top ally now and again at the next Round Start',()=>{
 let g=fixture();g.players[0].deck=[packet(g,'01PZ052'),packet(g,'01FR026'),packet(g,'01PZ052'),packet(g,'01FR053')];
 g=cast(g,0,'01FR023');assert.equal(g.players[0].board[0].card,'01FR026');assert.equal(g.players[0].warmothers,1);
 g=pass2(g);assert.ok(g.players[0].board.some(u=>u.card==='01FR053'));
});

test('Kinkou Wayfinder samples qualifying one-cost allies instead of always taking the first',()=>{
 const seen=new Set();
 for(let n=1;n<=20;n++){
  let g=fixture();g.seed=(n*99999999)>>>0;
  g.players[0].deck=[packet(g,'01IO005'),packet(g,'01PZ020')];
  g=play(g,0,'01IO050');
  seen.add(g.players[0].board.find(u=>u.card!=='01IO050').card);
 }
 assert.deepEqual([...seen].sort(),['01IO005','01PZ020']);
});

test('Troop of Elnuks examines six cards, preserves buffs, and returns other cards',()=>{
 let g=fixture();const bull=packet(g,'01FR027');bull.atkBonus=2;
 g.players[0].deck=[packet(g,'01PZ052'),bull,packet(g,'01DE039'),packet(g,'01PZ052'),packet(g,'01FR027'),packet(g,'01PZ052'),packet(g,'01FR026')];
 g=play(g,0,'01FR017');assert.equal(g.players[0].board.filter(u=>u.card==='01FR027').length,2);assert.equal(g.players[0].deck.length,5);assert.ok(g.players[0].board.some(u=>u.card==='01FR027'&&u.atk===CARDS['01FR027'].atk+2));
});

test('Enlightened stats activate when Catalyst fills the tenth mana gem',()=>{
 let g=fixture();g.players[0].maxMana=9;const mystic=add(g,0,'01FR047');
 g=cast(g,0,'01FR012');assert.equal(g.players[0].maxMana,10);assert.equal(find(g,0,mystic).atk,mystic.atk+4);assert.equal(find(g,0,mystic).maxHp,mystic.maxHp+4);
});

test('Ancient Yeti reduces its cost only at Round End while in hand',()=>{
 let g=fixture();const held=give(g,0,'01FR031'),decked=packet(g,'01FR031');g.players[0].deck=[packet(g,'01PZ052'),decked];
 g=pass2(g);assert.equal(g.players[0].hand.find(h=>h.uid===held.uid).costDelta,-1);assert.equal(g.players[0].deck.find(h=>h.uid===decked.uid).costDelta,0);
});

test('Vladimir play counts chosen allies even when Tough prevents their damage',()=>{
 let g=fixture();g.players[0].maxMana=9;const tough=add(g,0,'01DE020'),normal=add(g,0,'01PZ059'),enemy=add(g,1,'01PZ059');
 g=play(g,0,'01NX006',enemy.uid,null,{targets:[tough.uid,normal.uid]});assert.equal(g.stack.length,1);g=finish(g);
 assert.equal(find(g,0,tough).hp,tough.hp);assert.equal(find(g,0,normal).hp,normal.hp-1);assert.equal(find(g,1,enemy).hp,enemy.hp-2);
});

test('Vladimir can include his just-played source as one of the chosen allies',()=>{
 let g=fixture();const enemy=add(g,1,'01PZ059'),h=give(g,0,'01NX006');g=act(g,0,{type:'play',uid:h.uid,target:enemy.uid,targets:[h.uid]});g=finish(g);
 assert.equal(find(g,0,h).hp,CARDS['01NX006'].hp-1);assert.equal(find(g,1,enemy).hp,enemy.hp-1);
});

test('leveled Vladimir attack only drains for allies on his right',()=>{
 let g=fixture();g.players[0].hp=15;const left=add(g,0,'01PZ059'),vlad=add(g,0,'01NX006T1'),right=add(g,0,'01PZ059');vlad.baseCard='01NX006';
 g=act(g,0,{type:'attack',units:[left.uid,vlad.uid,right.uid]});g=act(g,1,{type:'block',assignments:{}});g=finish(g);
 assert.equal(find(g,0,left).hp,left.hp);assert.equal(find(g,0,right).hp,right.hp-1);assert.equal(g.players[0].hp,16);
});

test('Tough preventing one damage still advances Vladimir survival progress',()=>{
 let g=fixture();const tough=add(g,0,'01DE020'),vlad=add(g,0,'01NX006'),enemy=add(g,1,'01PZ059');
 g.players[0].damageSurvivors=4;
 g=cast(g,0,'01NX043',tough.uid);
 assert.equal(find(g,0,tough).hp,tough.hp);assert.equal(g.players[0].damageSurvivors,5);assert.equal(find(g,0,vlad).card,'01NX006T1');
});

test('Vladimir attack aggregates its drain so Funsmith adds damage once',()=>{
 let g=fixture();g.players[0].hp=15;add(g,0,'01PZ051');
 const vlad=add(g,0,'01NX006T1'),rightA=add(g,0,'01PZ059'),rightB=add(g,0,'01PZ059');vlad.baseCard='01NX006';
 g=act(g,0,{type:'attack',units:[vlad.uid,rightA.uid,rightB.uid]});g=act(g,1,{type:'block',assignments:{}});g=finish(g);
 assert.equal(g.players[0].hp,18);assert.equal(find(g,0,rightA).hp,rightA.hp-2);assert.equal(find(g,0,rightB).hp,rightB.hp-2);
});

test('Legion Marauder grants an everywhere buff that later copies inherit',()=>{
 let g=fixture();const marauder=add(g,0,'01NX021'),held=give(g,0,'01NX021');g.players[0].deck=[packet(g,'01NX021')];
 g=act(g,0,{type:'attack',units:[marauder.uid]});assert.equal(find(g,0,marauder).atk,marauder.atk+1);assert.equal(g.players[0].hand.find(h=>h.uid===held.uid).atkBonus,1);assert.equal(g.players[0].deck[0].hpBonus,1);
});

test('Shiraza doubles Nexus strike damage and Astute Academic counts each drawn card',()=>{
 let g=fixture();const shiraza=add(g,0,'01NX014');g=act(g,0,{type:'attack',units:[shiraza.uid]});g=act(g,1,{type:'block',assignments:{}});assert.equal(g.players[1].hp,20-shiraza.atk*2);
 g=fixture();const academic=add(g,0,'01PZ055');g=cast(g,0,'01PZ049');assert.equal(attack(find(g,0,academic),g),academic.atk+3);
});

test('Arena Bookie discards a lowest-cost card to draw and Jae draws when targeted',()=>{
 let g=fixture();add(g,0,'01NX003');give(g,0,'01PZ052');const cheapest=give(g,0,'01DE039');
 g=pass2(g);assert.equal(g.players[0].hand.some(h=>h.uid===cheapest.uid),false);
 g=fixture();const jae=add(g,0,'01PZ035');g=cast(g,0,'01NX027',jae.uid);assert.equal(g.players[0].hand.length,1);
});

test('Purrsuit counts unique card names and includes the current cast',()=>{
 let g=fixture();g.players[0].playedCards=Object.values(CARDS).filter(c=>c.collectible&&c.id!=='01PZ033').slice(0,19).map(c=>c.id);
 g=cast(g,0,'01PZ033');assert.ok(g.players[0].board.some(u=>u.card==='01PZ033T1'));
});
