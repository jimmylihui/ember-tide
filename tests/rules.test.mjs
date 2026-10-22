import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS,createGame,act,attack,keywords,cardSupported} from '../src/engine.js';
import {CARD_CATALOG,RULES,unsupportedFor} from '../src/rules.js';
import {ADVANCED_RULES} from '../src/advanced-rules.js';

const fixture=()=>{
 const g=createGame(()=>.25);
 Object.assign(g,{phase:'main',round:5,priority:0,attacker:0,roundOwner:0,tokens:[true,false],token:true,passes:0});
 for(const s of g.players)Object.assign(s,{hand:[],board:[],mana:10,maxMana:9,bank:3});
 return g;
};
const packet=(g,card)=>({card,uid:'rules-'+(++g.serial),costDelta:0,atkBonus:0,hpBonus:0,kwBonus:[],puffcaps:0});
const hand=(g,p,id)=>{const h=packet(g,id);g.players[p].hand.push(h);return h;};
const unit=(g,p,id,extra={})=>{
 const c=CARDS[id];
 const u={...packet(g,id),baseCard:id,atk:c.atk,hp:c.hp,maxHp:c.hp,tempAtk:0,tempHp:0,kw:[...c.kw],tempKw:[],removedKw:[],silenced:false,stunned:false,frozen:false,strikes:0,kills:0,damageTaken:0,seenDeaths:0,level:c.hero&&!c.collectible,flags:{},summonedRound:g.round,...extra};
 g.players[p].board.push(u);return u;
};
const resolve=g=>{while(g.stack.length&&g.winner===null)g=act(g,g.priority,{type:'pass'});return g;};
const cast=(g,p,id,target=null,target2=null,extra={})=>{
 g.priority=p;const h=hand(g,p,id);
 return resolve(act(g,p,{type:'play',uid:h.uid,target,target2,...extra}));
};
const find=(g,p,u)=>g.players[p].board.find(x=>x.uid===u.uid);
const nextRound=g=>act(act(g,g.priority,{type:'pass'}),1-g.priority,{type:'pass'});

test('every official card is either implemented or has an explicit unsupported reason',()=>{
 const merged={...RULES,...ADVANCED_RULES},missing=unsupportedFor(merged);
 assert.equal(Object.keys(CARD_CATALOG).length,419);
 assert.equal(Object.values(CARD_CATALOG).filter(c=>c.collectible).length,318);
 for(const id of Object.keys(CARD_CATALOG)){
  assert.equal(cardSupported(id),!Object.hasOwn(missing,id),id);
  if(cardSupported(id))assert.ok(typeof merged[id].note==='string'&&merged[id].note.length,id);
  else assert.ok(missing[id].length>10,id);
 }
});

test('Culling Strike validates current Power and actually removes its target',()=>{
 let g=fixture();const target=unit(g,1,'01PZ059',{atk:4});
 const h=hand(g,0,'01NX004');
 assert.throws(()=>act(g,0,{type:'play',uid:h.uid,target:target.uid}),/3 or less/);
 target.atk=3;g=resolve(act(g,0,{type:'play',uid:h.uid,target:target.uid}));
 assert.equal(g.players[1].board.length,0);
});

test('raising the target above three Power in response prevents Culling Strike from killing it',()=>{
 let g=fixture();const target=unit(g,1,'01DE039'),kill=hand(g,0,'01NX004');
 g=act(g,0,{type:'play',uid:kill.uid,target:target.uid});
 const buff=hand(g,1,'01NX027');g=act(g,1,{type:'play',uid:buff.uid,target:target.uid});
 g=resolve(g);assert.ok(find(g,1,target));assert.equal(attack(find(g,1,target),g),5);
});

test('healing a damaged target in response prevents Noxian Guillotine and its generated copy',()=>{
 let g=fixture();const target=unit(g,1,'01PZ059',{hp:2}),kill=hand(g,0,'01NX022');
 g=act(g,0,{type:'play',uid:kill.uid,target:target.uid});
 const heal=hand(g,1,'01IO004');g=act(g,1,{type:'play',uid:heal.uid,target:target.uid});
 g=resolve(g);assert.equal(find(g,1,target).hp,target.maxHp);
 assert.equal(g.players[0].hand.filter(h=>h.card==='01NX022').length,0);
});

test('Tough granted by Chain Vest reduces later spell damage',()=>{
 let g=fixture();const ally=unit(g,0,'01DE039');
 g=cast(g,0,'01DE013',ally.uid);
 g=cast(g,1,'01PZ052',ally.uid);
 assert.equal(find(g,0,ally).hp,CARDS['01DE039'].hp-1);
 assert.ok(keywords(find(g,0,ally),g).includes('Tough'));
});

test('a buff after Frostbite raises Power during the same round',()=>{
 let g=fixture();const ally=unit(g,0,'01DE039');
 g=cast(g,1,'01FR001',ally.uid);
 assert.equal(attack(find(g,0,ally),g),0);
 g=cast(g,0,'01NX027',ally.uid);
 assert.equal(attack(find(g,0,ally),g),3);
});

test('Transfusion requires distinct allies and grants the second ally its temporary buff',()=>{
 let g=fixture();const a=unit(g,0,'01PZ059'),b=unit(g,0,'01DE039');
 const h=hand(g,0,'01NX047');
 assert.throws(()=>act(g,0,{type:'play',uid:h.uid,target:a.uid,target2:a.uid}),/different/);
 g=act(g,0,{type:'play',uid:h.uid,target:a.uid,target2:b.uid});
 assert.equal(find(g,0,a).hp,a.hp-1);
 assert.equal(attack(find(g,0,b),g),b.atk+2);
 assert.equal(find(g,0,b).maxHp,b.maxHp+2);
});

test('Single Combat strikes simultaneously even when its first strike is lethal',()=>{
 let g=fixture();const a=unit(g,0,'01DE039'),b=unit(g,1,'01DE039');
 g=cast(g,0,'01DE026',a.uid,b.uid);
 assert.equal(g.players[0].board.length,0);
 assert.equal(g.players[1].board.length,0);
});

test('Judgment strikes every battling enemy and those strikes can level Garen',()=>{
 let g=fixture();const garen=unit(g,0,'01DE012'),other=unit(g,0,'01DE039');
 const a=unit(g,1,'01DE039'),b=unit(g,1,'01PZ059');
 g.phase='combat';g.combat={p:0,lanes:[{attacker:garen.uid,blocker:a.uid},{attacker:other.uid,blocker:b.uid}]};
 g=cast(g,0,'01DE007',garen.uid);
 assert.equal(g.players[1].board.length,0);
 assert.equal(find(g,0,garen).strikes,2);
 assert.equal(find(g,0,garen).card,'01DE012T1');
});

test('base Braum summons a Mighty Poro only after the first surviving damage event',()=>{
 let g=fixture();const braum=unit(g,0,'01FR009');
 g=cast(g,1,'01NX043',braum.uid);
 g=cast(g,1,'01NX043',braum.uid);
 assert.equal(g.players[0].board.filter(u=>u.card==='01FR053').length,1);
 assert.equal(find(g,0,braum).damageTaken,2);
});

test('Braum levels from accumulated damage and leveled Braum creates a Poro on each surviving hit',()=>{
 let g=fixture();const braum=unit(g,0,'01FR009',{damageTaken:8});
 g=cast(g,1,'01PZ052',braum.uid);
 assert.equal(find(g,0,braum).card,'01FR009T1');
 g=cast(g,1,'01NX043',braum.uid);
 assert.equal(g.players[0].board.filter(u=>u.card==='01FR053').length,2);
});

test('Tryndamere replaces his first death with his leveled form, then can die normally',()=>{
 let g=fixture();const tryn=unit(g,0,'01FR039');
 g=cast(g,1,'01SI001',tryn.uid);
 assert.equal(find(g,0,tryn).card,'01FR039T2');
 assert.equal(find(g,0,tryn).hp,CARDS['01FR039T2'].hp);
 g=cast(g,1,'01SI001',tryn.uid);
 assert.equal(find(g,0,tryn),undefined);
});

test('a strike from Single Combat advances Garen and grants the exact leveled stats',()=>{
 let g=fixture();const garen=unit(g,0,'01DE012',{strikes:1}),enemy=unit(g,1,'01DE039');
 g=cast(g,0,'01DE026',garen.uid,enemy.uid);
 assert.equal(find(g,0,garen).card,'01DE012T1');
 assert.equal(find(g,0,garen).atk,CARDS['01DE012T1'].atk);
 assert.equal(find(g,0,garen).strikes,2);
});

test('Ashe levels at five Frostbites and places Crystal Arrow on top of the deck',()=>{
 let g=fixture();const ashe=unit(g,0,'01FR038'),enemy=unit(g,1,'01PZ059');
 g.players[0].frostbites=4;
 g=cast(g,0,'01FR001',enemy.uid);
 assert.equal(find(g,0,ashe).card,'01FR038T2');
 assert.equal(g.players[0].deck[0].card,'01FR038T3');
});

test('Anivia revives as Eggnivia and transforms at the next Enlightened Round Start',()=>{
 let g=fixture();const anivia=unit(g,0,'01FR024');
 g=cast(g,1,'01SI001',anivia.uid);
 assert.equal(g.players[0].board[0].card,'01FR024T4');
 g=nextRound(g);
 assert.equal(g.players[0].board[0].card,'01FR024T3');
 assert.equal(g.players[0].board[0].hp,CARDS['01FR024T3'].hp);
});

test('Lux creates one Final Spark at each mana threshold without carrying excess mana',()=>{
 let g=fixture();const lux=unit(g,0,'01DE042');
 g=cast(g,0,'01FR005',lux.uid);
 assert.equal(find(g,0,lux).card,'01DE042T2');
 assert.equal(g.players[0].hand.filter(h=>h.card==='01DE042T3').length,1);
 assert.equal(find(g,0,lux).flags.spellMana,0);
});

test('Final Spark targets units when present and the enemy Nexus when absent',()=>{
 let g=fixture();unit(g,1,'01DE039');const h=hand(g,0,'01DE042T3');
 assert.throws(()=>act(g,0,{type:'play',uid:h.uid,target:'core1'}),/enemy unit/);
 g=fixture();g=cast(g,0,'01DE042T3','core1');assert.equal(g.players[1].hp,16);
});

test('Vile Feast drains actual damage through Tough and still summons a Spiderling',()=>{
 let g=fixture();const enemy=unit(g,1,'01DE020');g.players[0].hp=15;
 g=cast(g,0,'01SI040',enemy.uid);
 assert.equal(g.players[0].hp,15);
 assert.equal(find(g,1,enemy).hp,enemy.hp);
 assert.ok(g.players[0].board.some(u=>u.card==='01SI002'));
});

test('Rimefang Wolf kills a zero-Power target even if its strike did not deal lethal damage',()=>{
 let g=fixture();const wolf=unit(g,0,'01FR018'),enemy=unit(g,1,'01PZ059',{atk:0,hp:20,maxHp:20});
 g=cast(g,0,'01DE026',wolf.uid,enemy.uid);
 assert.equal(find(g,1,enemy),undefined);
});

test('a champion signature spell shuffles its champion into the deck after resolving',()=>{
 let g=fixture();const n=g.players[0].deck.length;
 g=cast(g,0,'01NX038T1');
 assert.equal(g.players[1].hp,16);
 assert.equal(g.players[0].deck.length,n+1);
 assert.ok(g.players[0].deck.some(h=>h.card==='01NX038'));
});

test('Omen Hawk buffs only the first two unit cards in the deck',()=>{
 let g=fixture();const a=packet(g,'01DE039'),b=packet(g,'01FR053'),third=packet(g,'01PZ059');
 g.players[0].deck=[packet(g,'01PZ052'),a,b,third];
 const h=hand(g,0,'01FR022');g=act(g,0,{type:'play',uid:h.uid});
 assert.deepEqual(g.players[0].deck.map(h=>h.atkBonus),[0,1,1,0]);
 assert.deepEqual(g.players[0].deck.map(h=>h.hpBonus),[0,1,1,0]);
});

test('Starlit Seer buffs the card drawn by the same Burst spell before it is drawn',()=>{
 let g=fixture();unit(g,0,'01FR032');const champ=packet(g,'01DE012');
 g.players[0].deck=[champ,packet(g,'01DE039')];
 g=cast(g,0,'01FR029');
 const drawn=g.players[0].hand.find(h=>h.uid===champ.uid);
 assert.equal(drawn.atkBonus,1);assert.equal(drawn.hpBonus,1);
 assert.equal(g.players[0].deck[0].atkBonus,0);
});

test('Babbling Bjerg can tutor a unit that reached five Power through a deck buff',()=>{
 let g=fixture();const buffed=packet(g,'01DE039');buffed.atkBonus=3;
 g.players[0].deck=[buffed,packet(g,'01FR026')];
 const h=hand(g,0,'01FR007');g=act(g,0,{type:'play',uid:h.uid});
 assert.ok(g.players[0].hand.some(h=>h.uid===buffed.uid));
 assert.equal(g.players[0].deck[0].card,'01FR026');
});

test('Mobilize reduces only unit costs in hand',()=>{
 let g=fixture();const ally=hand(g,0,'01DE039'),spell=hand(g,0,'01PZ052');
 g=cast(g,0,'01DE019');
 assert.equal(g.players[0].hand.find(h=>h.uid===ally.uid).costDelta,-1);
 assert.equal(g.players[0].hand.find(h=>h.uid===spell.uid).costDelta,0);
});

test('Chronicler of Ruin frees the sacrificed slot before reviving at a full board',()=>{
 let g=fixture();const sacrificed=unit(g,0,'01DE039');
 for(let i=0;i<4;i++)unit(g,0,'01PZ059');
 const h=hand(g,0,'01SI032');g=act(g,0,{type:'play',uid:h.uid,target:sacrificed.uid});
 assert.equal(g.players[0].board.length,6);
 assert.equal(find(g,0,sacrificed),undefined);
 assert.equal(g.players[0].board.filter(u=>u.card==='01DE039').length,1);
});

test('Katarina levels on her first strike and returns to hand',()=>{
 let g=fixture();const kata=unit(g,0,'01NX042'),enemy=unit(g,1,'01PZ059');
 g=cast(g,0,'01DE026',kata.uid,enemy.uid);
 assert.equal(find(g,0,kata),undefined);
 assert.equal(g.players[0].levels['01NX042'],true);
 assert.ok(g.players[0].hand.some(h=>h.card==='01NX042'));
});

test('Draven counts both Spinning Axe buffs on one strike toward his level condition',()=>{
 let g=fixture();const draven=unit(g,0,'01NX020');
 for(let i=0;i<2;i++){
  const discard=hand(g,0,'01DE039'),axe=hand(g,0,'01NX020T1');
  g=act(g,0,{type:'play',uid:axe.uid,target:draven.uid,discards:[discard.uid]});
 }
 const enemy=unit(g,1,'01PZ059');
 g=cast(g,0,'01DE026',draven.uid,enemy.uid);
 assert.equal(find(g,0,draven).card,'01NX020T3');
 assert.equal(find(g,0,draven).flags.axesStruck,2);
});
