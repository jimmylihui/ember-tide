// Independent Foundations rules engine. Riot card data/art have separate ownership.
import {CARDS as RAW_CARDS, REGIONS, PRESETS, DATASET} from './cards.js';
import {RULES} from './rules.js';
import {ADVANCED_RULES} from './advanced-rules.js';
import {COMPLETION_RULES} from './completion-rules.js';
import {SHADOW_RULES} from './shadow-rules.js';
export {REGIONS, PRESETS, DATASET};
const rules={...RULES,...ADVANCED_RULES,...COMPLETION_RULES,...SHADOW_RULES};
export const CARDS=Object.fromEntries(Object.entries(RAW_CARDS).map(([id,c])=>[id,{...c,supported:!!rules[id]&&rules[id].implemented!==false,unsupportedReason:rules[id]?.reason,discard:rules[id]?.discard,target:rules[id]?.target||'none',target2:rules[id]?.target2,targetOptional:rules[id]?.targetOptional,options:rules[id]?.options,targets:rules[id]?.targets,target3:rules[id]?.target3,targetCount:rules[id]?.targetCount,sacrifice:rules[id]?.sacrifice,freesBoardSlot:!!rules[id]?.recallCost}]));
export const FACTIONS=PRESETS.map(p=>p.name);
export const cardSupported=id=>!!rules[id]&&rules[id].implemented!==false;
const fail=m=>{throw new Error(m);};
const data=u=>CARDS[u.card];
const baseId=id=>{const c=CARDS[id];if(!c?.hero||c.collectible||c.kind!=='unit')return id;return Object.values(CARDS).find(x=>x.hero&&x.collectible&&x.kind==='unit'&&x.associated.includes(id))?.id||id;};
const descriptor=(p,u)=>({p,u});
const self=(g,id)=>{for(let p=0;p<2;p++){const u=g.players[p].board.find(u=>u.uid===id);if(u)return descriptor(p,u);}return null;};
const core=p=>({p,core:true});
function target(g,id){const item=g.stack.find(x=>x.uid===id);return item?{p:item.p,stack:item,uid:id}:id==='core0'?core(0):id==='core1'?core(1):self(g,id);}
function log(g,s){g.log.push(s);g.log=g.log.slice(-70);}
// Public presentation events are primitive references only. They never drive
// rules or expose hidden card instances, deck contents, or random state.
function effect(g,type,fields={}){g.effectSerial=(g.effectSerial||0)+1;(g.effects??=[]).push({seq:g.effectSerial,type,...fields});g.effects=g.effects.slice(-64);}
const ref=t=>t?.core?'core'+t.p:t?.u?.uid;
const publicTargets=(g,ids)=>ids.filter(id=>id!=null&&!!target(g,id));
function rng(g){g.seed=(Math.imul(g.seed,1664525)+1013904223)>>>0;return g.seed/4294967296;}
function random(g,a){return a.length?a[Math.floor(rng(g)*a.length)]:null;}
function shuffle(g,a){for(let i=a.length-1;i>0;i--){const j=Math.floor(rng(g)*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function packet(g,id,p=null){const h={card:id,uid:'c'+(++g.serial),costDelta:0,atkBonus:0,hpBonus:0,kwBonus:[],puffcaps:0};if(p!==null)for(const b of g.players[p].globalBuffs||[])if(b.ids.includes(id)){h.atkBonus+=b.atk;h.hpBonus+=b.hp;}return h;}

export function deckValidation(deck){
 if(!Array.isArray(deck)||deck.length!==40)return '牌组必须包含 40 张牌';const counts={},regions=new Set();let heroes=0;
 for(const id of deck){const c=CARDS[id];if(!c?.collectible||!cardSupported(id))return '牌组含未实现或不可收集的卡牌：'+(c?.name||id);counts[id]=(counts[id]||0)+1;if(counts[id]>3)return '同名卡牌最多 3 张';if(c.hero)heroes++;regions.add(c.region);}
 if(heroes>6)return '英雄牌最多 6 张';if(regions.size>2)return '牌组最多使用两个地区';return null;
}
export function createGame(randomSource=Math.random,options={}){
 const decks=options.decks||PRESETS.map(p=>p.deck);for(const deck of decks){const e=deckValidation(deck);if(e)fail(e);}
 const g={schema:3,serial:0,seed:(randomSource()*4294967296)>>>0,version:0,round:0,attacker:0,token:false,priority:0,passes:0,phase:'mulligan',mulligans:[false,false],stack:[],combat:null,stackOwner:null,winner:null,log:[],effects:[],effectSerial:0,settling:false};
 g.attacker=rng(g)<.5?0:1;g.roundOwner=g.attacker;g.tokens=[false,false];
 g.players=decks.map((deck,p)=>({f:p,name:options.names?.[p]||FACTIONS[p],regions:[...new Set(deck.map(id=>CARDS[id].region))],hp:20,mana:0,maxMana:0,bank:0,damage:0,healing:0,damageDealt:0,nexusDamage:0,roundDeaths:0,unitsDied:0,spellsPlayed:0,spellManaSpent:0,attacks:0,targets:0,stunsRecalls:0,puffcapsPlanted:0,eliteSummons:0,levels:{},playedCards:[],summonedCounts:{},globalBuffs:[],sharks:[],revivals:[],warmothers:0,grave:[],board:[],hand:[],deck:shuffle(g,deck.map(id=>packet(g,id)))}));
 g.players.forEach((_,p)=>draw(g,p,4));log(g,'基础卡池 · 选择要替换的起手牌');return g;
}
export function keywords(u,g){
 if(u.silenced)return [...new Set([...u.kw,...u.tempKw])];let ks=[...(data(u)?.kw||[]),...(u.kw||[]),...(u.tempKw||[])].filter(k=>!u.removedKw?.includes(k));
 if(g){const p=g.players.findIndex(s=>s.board.includes(u));if(p>=0)for(const a of g.players[p].board){const aura=!a.silenced&&rules[a.card]?.keywordAura;if(aura&&(!aura.excludeSelf||a!==u)&&(!aura.subtype||data(u)?.subtypes.includes(aura.subtype)))ks.push(...aura.keywords);}}
 return [...new Set(ks)];
}
export function attack(u,g){let n=Math.max(0,u.atk+(u.tempAtk||0));if(g){const p=g.players.findIndex(s=>s.board.includes(u));if(p>=0){if(keywords(u,g).includes('Ephemeral'))n+=g.players[p].ephemeralAura||0;for(const a of g.players[p].board){const aura=!a.silenced&&rules[a.card]?.aura;if(aura&&(!aura.excludeSelf||a!==u)&&(!aura.keyword||keywords(u,g).includes(aura.keyword)))n+=aura.atk||0;}}}return n;}
const has=(g,u,k)=>keywords(u,g).includes(k);
function trigger(g,p,u,name,t=null,t2=null,event=null,extra={}){
 if(!u||u.silenced)return;const f=rules[u.card]?.[name];if(typeof f==='function')f(context(g,p,u,t,t2,event,extra));
}
function emit(g,name,event,extra={}){for(let p=0;p<2;p++)for(const u of [...g.players[p].board])if(u.hp>0)trigger(g,p,u,name,null,null,event,extra);}
function sideEmit(g,p,name,event,extra={}){for(const u of [...g.players[p].board])if(u.hp>0)trigger(g,p,u,name,null,null,event,extra);}
function levelVariant(id){const c=CARDS[baseId(id)];const forms=(c?.associated||[]).filter(code=>CARDS[code]?.hero&&CARDS[code].kind==='unit'&&!CARDS[code].collectible);return forms.find(code=>CARDS[code].nameEn===c.nameEn)||forms[0]||null;}
function level(g,p,u,alreadyLeveled=false){if(u.level||u.silenced)return;const id=levelVariant(u.card);if(!id)return;const old=data(u),next=CARDS[id];u.baseCard=baseId(u.card);u.card=id;u.level=true;u.atk+=next.atk-old.atk;u.maxHp+=next.hp-old.hp;u.hp+=next.hp-old.hp;g.players[p].levels[u.baseCard]=true;if(!alreadyLeveled){effect(g,'level',{p,uid:u.uid,card:u.card});log(g,old.name+'升级');trigger(g,p,u,'levelUp');trigger(g,p,u,'onLevel');}}
function handChanged(g,p){const handSize=g.players[p].hand.length;sideEmit(g,p,'handChanged',{handSize});champions(g);}
function addHand(g,p,id,n=1){let first=null;for(let i=0;i<n;i++){if(!CARDS[id]||!cardSupported(id))return first;if(g.players[p].hand.length>=10){log(g,'手牌已满，生成牌被弃置');continue;}const h=packet(g,id,p);h.fleeting=CARDS[id].kw.includes('Fleeting');g.players[p].hand.push(h);first??=h;}handChanged(g,p);return first;}
function draw(g,p,n,filter){
 const s=g.players[p],drawn=[];let drawnCount=0,burned=0;
 for(let i=0;i<n&&g.winner===null;i++){
  const idx=filter?s.deck.findIndex(h=>filter(CARDS[h.card],h)):0;if(idx<0)break;
  if(!s.deck.length){g.winner=1-p;log(g,s.name+'无法抽牌，败北');break;}
  const h=s.deck.splice(idx,1)[0];drawnCount++;if(h.puffcaps){damage(g,1-p,core(p),h.puffcaps);h.puffcaps=0;}
  sideEmit(g,p,'cardDrawn',{card:h.card,packet:h});if(s.hand.length<10){s.hand.push(h);drawn.push(h);}else{burned++;log(g,s.name+'手牌已满，抽到的牌被弃置');}
 }
 if(drawnCount)effect(g,'draw',{p,amount:drawnCount});if(burned)effect(g,'burn',{p,amount:burned});handChanged(g,p);return drawn;
}
function grant(g,t,k,temp=false){if(!t?.u)return;const u=t.u;const before=has(g,u,k);const arr=temp?u.tempKw:u.kw;if(!arr.includes(k))arr.push(k);u.removedKw=(u.removedKw||[]).filter(x=>x!==k);if(k==='Barrier'&&!before){effect(g,'shield',{p:t.p,target:u.uid,uid:u.uid});}if(k==='Barrier'&&!before)sideEmit(g,t.p,'barrierGranted',t);}
function buff(g,t,a,h,temp=false){if(!t?.u)return;const u=t.u;if(temp){u.tempAtk+=a;u.tempHp+=h;}else u.atk+=a;u.maxHp+=h;u.hp+=h;if(a||h)effect(g,'buff',{p:t.p,target:u.uid,attack:a,health:h,temporary:temp});}
function heal(g,p,t,n){if(!t||n<=0)return 0;const s=g.players[t.p];const before=t.core?s.hp:t.u.hp,cap=t.core?20:t.u.maxHp,amount=Math.max(0,Math.min(n,cap-before));if(t.core)s.hp+=amount;else t.u.hp+=amount;g.players[p].healing+=amount;if(amount)effect(g,'heal',{p:t.p,sourceP:p,target:ref(t),amount});return amount;}
function damage(g,p,t,n,sourceUnit=null){
 if(!t||n<=0||g.winner!==null)return 0;
 if(!t.core&&t.u.flags?.bondRound===g.round){const bond=self(g,t.u.flags.bond);if(bond&&bond.u.hp>0&&bond.u!==t.u)return damage(g,p,bond,n,sourceUnit);}
 if(t.core&&sourceUnit&&!sourceUnit.silenced&&rules[sourceUnit.card]?.nexusDamageMultiplier)n*=rules[sourceUnit.card].nexusDamageMultiplier;
 let dealt=n;
 if(!t.core){const u=t.u;if(u.hp<=0)return 0;if(has(g,u,'Barrier')){u.removedKw=[...(u.removedKw||[]),'Barrier'];u.kw=u.kw.filter(k=>k!=='Barrier');u.tempKw=u.tempKw.filter(k=>k!=='Barrier');effect(g,'barrier',{p:t.p,target:u.uid,uid:u.uid});return 0;}if(has(g,u,'Tough'))dealt=Math.max(0,dealt-1);}
 const s=g.players[t.p],before=t.core?s.hp:t.u.hp,actual=Math.min(Math.max(0,before),dealt);
 if(t.core)s.hp-=dealt;else{t.u.hp-=dealt;t.u.damageTaken+=actual;if(t.u.hp<=0&&sourceUnit)sourceUnit.kills++;}
 if(actual)effect(g,'damage',{p:t.p,sourceP:p,target:ref(t),amount:actual});g.players[p].damage+=actual;g.players[p].damageDealt+=actual;if(t.core)g.players[p].nexusDamage+=actual;
 if(sourceUnit&&has(g,sourceUnit,'Lifesteal'))heal(g,p,core(p),actual);
 if(!t.core){trigger(g,t.p,t.u,'damaged',t,null,t,{amount:actual});sideEmit(g,t.p,'allyDamaged',t,{amount:actual});if(t.u.hp>0)g.players[t.p].damageSurvivors=(g.players[t.p].damageSurvivors||0)+1;}
 return actual;
}
function makeUnit(g,p,h){
 const c=CARDS[h.card];if(h.exactUnit){const u=structuredClone(h.exactUnit);u.uid=h.uid;u.card=h.card;delete u.exactUnit;u.costDelta=h.costDelta||0;u.summonedRound=g.round;return u;}
 return {...h,baseCard:baseId(h.card),atk:c.atk+(h.atkBonus||h.atkBuff||0),hp:c.hp+(h.hpBonus||h.hpBuff||0),maxHp:c.hp+(h.hpBonus||h.hpBuff||0),tempAtk:0,tempHp:0,kw:[...c.kw,...(h.kwBonus||[])],tempKw:[],removedKw:[],silenced:false,stunned:false,frozen:false,strikes:0,kills:0,damageTaken:0,seenDeaths:0,level:!!(c.hero&&!c.collectible),flags:{},summonedRound:g.round};
}
function summon(g,p,id,h=null,opts={}){
 const s=g.players[p];if(s.board.length>=6||!CARDS[id])return null;
 if(opts.attacking&&(!g.combat||g.combat.p!==p||g.combat.lanes.length>=6))return null;
 h??=opts.packet||packet(g,id,p);const u=makeUnit(g,p,h);
 if(opts.stats){u.atk=opts.stats.atk??opts.stats[0]??u.atk;u.hp=opts.stats.hp??opts.stats[1]??u.hp;u.maxHp=u.hp;u.tempAtk=0;u.tempHp=0;}
 if(opts.flags)u.flags={...u.flags,...opts.flags};
 if(opts.ephemeral){u.kw.push('Ephemeral');u.removedKw=u.removedKw.filter(x=>x!=='Ephemeral');}
 for(const k of opts.keywords||[])if(!u.kw.includes(k))u.kw.push(k);
 if(opts.buff){u.atk+=opts.buff.atk||0;u.hp+=opts.buff.hp||0;u.maxHp+=opts.buff.hp||0;}
 if(Number.isInteger(opts.boardIndex))s.board.splice(Math.min(s.board.length,opts.boardIndex),0,u);else s.board.push(u);if(opts.replaceUid&&g.combat)for(const lane of g.combat.lanes)for(const field of ['attacker','blocker'])if(lane[field]===opts.replaceUid)lane[field]=u.uid;if(opts.attacking)g.combat.lanes.push({attacker:u.uid,blocker:null,challenged:false});
 s.summonedCounts??={};s.summonedCounts[id]=(s.summonedCounts[id]||0)+1;
 if(s.levels[baseId(id)]&&!u.level)level(g,p,u,true);
 effect(g,'summon',{p,uid:u.uid,card:u.card,attacking:!!opts.attacking});if(data(u).subtypes.includes('ELITE'))s.eliteSummons++;
 trigger(g,p,u,'summon');sideEmit(g,p,'allySummoned',descriptor(p,u));for(const h of s.hand)rules[h.card]?.handAllySummoned?.(context(g,p,h,null,null,descriptor(p,u)));
 if(has(g,u,'Barrier'))sideEmit(g,p,'barrierGranted',descriptor(p,u));
 if(data(u).subtypes.includes('TECH'))for(const h of s.board)if(data(h).nameEn==='Heimerdinger'&&!h.silenced)h.seenTechPower=(h.seenTechPower||0)+attack(u,g);
 return descriptor(p,u);
}
function kill(g,t){if(t?.u){t.u.hp=0;t.u.destroyed=true;}}
function release(g,u){const captured=u.captured||[];u.captured=[];for(const c of captured)summon(g,c.p,c.card);}
function leaveBoard(g,t){const s=g.players[t.p];s.board=s.board.filter(u=>u.uid!==t.u.uid);release(g,t.u);}
function recall(g,p,t){if(!t?.u||!self(g,t.u.uid))return false;
 g.players[p].stunsRecalls++;emit(g,'unitRecalled',t,{actor:p});settle(g);
 if(!self(g,t.u.uid)||t.u.hp<=0)return false;
 effect(g,'recall',{p:t.p,uid:t.u.uid,card:t.u.card});leaveBoard(g,t);const s=g.players[t.p];if(s.hand.length<10)s.hand.push(packet(g,baseId(t.u.card),t.p));handChanged(g,t.p);return true;
}
function silence(g,t){if(!t?.u)return;const u=t.u,c=data(u),missing=u.maxHp-u.hp;u.captured=[];u.silenced=true;u.atk=c.atk;u.maxHp=c.hp;u.hp=c.hp-missing;u.tempAtk=0;u.tempHp=0;u.kw=[];u.tempKw=[];u.removedKw=[];u.stunned=false;u.frozen=false;u.flags={};}
function transform(g,t,id){if(!t?.u||!CARDS[id])return;t.u.captured=[];const nu=makeUnit(g,t.p,{...packet(g,id,t.p),uid:t.u.uid});for(const k of Object.keys(t.u))delete t.u[k];Object.assign(t.u,nu);effect(g,'transform',{p:t.p,uid:t.u.uid,card:t.u.card});}
function stun(g,p,t){if(!t?.u||t.u.hp<=0)return;t.u.stunned=true;effect(g,'stun',{p:t.p,target:t.u.uid,uid:t.u.uid});g.players[p].stunsRecalls++;emit(g,'unitStunned',t,{actor:p});}
function exactPacket(g,p,t){if(!t?.u)return null;const src=t.u,h=structuredClone(src);h.uid='c'+(++g.serial);h.puffcaps=0;if(!t.hand){h.exactUnit=structuredClone(src);h.exactUnit.flags={...h.exactUnit.flags};delete h.exactUnit.flags.bond;}return h;}
function copyUnit(g,p,t,opts={}){const h=exactPacket(g,p,t);return h?summon(g,p,h.card,h,opts):null;}
function copyHand(g,p,t,opts={}){if(!t?.u||g.players[p].hand.length>=10)return null;const h=opts.exact===false?packet(g,baseId(t.u.card),p):exactPacket(g,p,t);if(opts.ephemeral){h.kwBonus=[...(h.kwBonus||[]),'Ephemeral'];if(h.exactUnit)h.exactUnit.kw.push('Ephemeral');}if(opts.fleeting)h.fleeting=true;g.players[p].hand.push(h);handChanged(g,p);return h;}
function revive(g,p,record,opts={}){return record?summon(g,p,baseId(record.card),null,opts):null;}
function grantEverywhere(g,p,predicate,a,h,opts={}){
 const ids=Object.values(CARDS).filter(predicate).map(c=>c.id),s=g.players[p];s.globalBuffs??=[];s.globalBuffs.push({ids,atk:a,hp:h});
 for(const u of s.board)if(u.uid!==opts.excludeUid&&ids.includes(u.card))buff(g,descriptor(p,u),a,h);
 for(const u of [...s.hand,...s.deck])if(u.uid!==opts.excludeUid&&ids.includes(u.card)){u.atkBonus=(u.atkBonus||0)+a;u.hpBonus=(u.hpBonus||0)+h;if(u.exactUnit){u.exactUnit.atk+=a;u.exactUnit.hp+=h;u.exactUnit.maxHp+=h;}}
}
function summonFromDeck(g,p,filter,opts={}){const result=[],s=g.players[p],limit=opts.limit??1;for(let n=0;n<limit&&s.board.length<6;n++){const indices=s.deck.map((h,i)=>CARDS[h.card].kind==='unit'&&(!filter||filter(CARDS[h.card],h))?i:-1).filter(i=>i>=0),idx=opts.top?indices[0]:random(g,indices);if(idx==null)break;const h=s.deck.splice(idx,1)[0],d=summon(g,p,h.card,h,opts);if(d)result.push(d);}return result;}
function manifest(g,p,filter){const pool=Object.values(CARDS).filter(c=>c.collectible&&cardSupported(c.id)&&filter(c));const options=[];while(options.length<3&&pool.length){const c=random(g,pool);options.push(c.id);pool.splice(pool.indexOf(c),1);}if(options.length)(g.choices??=[]).push({p,options});}
function steal(g,p,t,temporary=true){if(!t?.u||t.p===p||g.players[p].board.length>=6)return null;g.players[t.p].board=g.players[t.p].board.filter(u=>u.uid!==t.u.uid);if(temporary)t.u.returnTo={p:t.p,round:g.round};g.players[p].board.push(t.u);return descriptor(p,t.u);}
function freeze(g,p,t){if(!t?.u)return;if(attack(t.u,g)>0)g.players[p].frostbites=(g.players[p].frostbites||0)+1;t.u.tempAtk-=attack(t.u,g);t.u.frozen=true;effect(g,'freeze',{p:t.p,target:t.u.uid,uid:t.u.uid});}
function createInDeck(g,p,id,n=1,position='shuffle',exactInstance=null){for(let i=0;i<n;i++){const h=exactInstance?{...structuredClone(exactInstance),uid:'c'+(++g.serial)}:packet(g,id,p),s=g.players[p];const idx=position==='top'?0:position==='top3'?Math.floor(rng(g)*Math.min(3,s.deck.length+1)):Math.floor(rng(g)*(s.deck.length+1));s.deck.splice(idx,0,h);}}
function plant(g,p,n){const deck=g.players[1-p].deck;if(!deck.length)return;for(let i=0;i<n;i++)random(g,deck).puffcaps++;g.players[p].puffcapsPlanted+=n;}
function strike(g,a,t,fixedAttack=null){if(!a?.u||!t||(a.u.hp<=0&&fixedAttack===null))return;const n=fixedAttack??attack(a.u,g);if(n<=0)return;effect(g,'strike',{p:a.p,uid:a.u.uid,target:ref(t)});damage(g,a.p,t,n,a.u);a.u.strikes++;trigger(g,a.p,a.u,'strike',t,null,t);if(t.core){trigger(g,a.p,a.u,'nexusStrike',t);sideEmit(g,a.p,'allyNexusStrike',a);}if(has(g,a.u,'Ephemeral'))kill(g,a);}
function context(g,p,u,t=null,t2=null,event=null,extra={}){return {
 g,p,u,settle:()=>settle(g),self:u?descriptor(p,u):null,t,t2,event,player:g.players[p],opponent:g.players[1-p],choice:extra.choice??'attack',targets:[],...extra,
 card:id=>CARDS[id],cards:CARDS,hand:()=>g.players[p].hand,
 allies:()=>g.players[p].board.map(u=>descriptor(p,u)),enemies:()=>g.players[1-p].board.map(u=>descriptor(1-p,u)),core,
 attackingAllies:()=>g.combat?.p===p?g.combat.lanes.map(l=>self(g,l.attacker)).filter(d=>d&&!d.u.stunned):[],
 battling:()=>g.combat?g.combat.lanes.flatMap(l=>[self(g,l.attacker),self(g,l.blocker)]).filter(d=>d&&!d.u.stunned):[],
 damage:(t,n)=>{if(!t||t.stack)return 0;const before=t?.u?.hp;if(extra.spellCard)n+=g.players[p].board.filter(x=>!x.silenced&&rules[x.card]?.spellDamageBonus).reduce((n,x)=>n+rules[x.card].spellDamageBonus,0);const dealt=damage(g,p,t,n,extra.spellCard&&CARDS[extra.spellCard]?.kind!=='unit'?null:u);if(extra.spellCard&&CARDS[extra.spellCard]?.kw.includes('SpellOverwhelm')&&t?.u&&n>before)damage(g,p,core(t.p),n-before);return dealt;},heal:(t,n)=>heal(g,p,t,n),buff:(t,a,h,temp=false)=>buff(g,t,a,h,temp),grant:(t,k,temp=false)=>grant(g,t,k,temp),
 draw:(n,filter)=>draw(g,p,n,filter),summon:(id,opts={})=>summon(g,opts.p??p,id,opts.packet||null,opts),create:(id,n)=>addHand(g,p,id,n),
 kill:t=>kill(g,t),recall:t=>recall(g,p,t),silence:t=>silence(g,t),stun:t=>stun(g,p,t),freeze:t=>freeze(g,p,t),
 rally:()=>{g.tokens[p]=true;g.token=g.tokens[g.attacker];},mana:n=>{g.players[p].maxMana=Math.min(10,g.players[p].maxMana+n);g.players[p].mana=Math.min(g.players[p].maxMana,g.players[p].mana+n);},refillSpellMana:(n=3)=>{g.players[p].bank=Math.min(3,g.players[p].bank+n);},
 discard:uid=>{const s=g.players[p],i=s.hand.findIndex(h=>h.uid===uid);if(i<0)fail('请选择要弃置的手牌');const h=s.hand.splice(i,1)[0];const f=rules[h.card]?.discarded;if(f)f(context(g,p,h,null,null,h));handChanged(g,p);return h;},
 swap:(a,b)=>{if(!a?.u||!b?.u||a.p!==b.p)return;const board=g.players[a.p].board,i=board.findIndex(u=>u.uid===a.u.uid),j=board.findIndex(u=>u.uid===b.u.uid);if(i<0||j<0)return;[board[i],board[j]]=[board[j],board[i]];if(g.combat)for(const lane of g.combat.lanes)for(const field of ['attacker','blocker']){if(lane[field]===a.u.uid)lane[field]=b.u.uid;else if(lane[field]===b.u.uid)lane[field]=a.u.uid;}},
 power:x=>attack(x?.u||x,g),keywords:x=>keywords(x?.u||x,g),effectiveCost:h=>effectiveCost(g,p,h,CARDS[h.card]),cost:h=>effectiveCost(g,p,h?.u||h,CARDS[(h?.u||h).card]),attack:x=>attack(x?.u||x,g),
 buffHand:(t,a,h)=>{if(!t?.u)return;t.u.atkBonus=(t.u.atkBonus||0)+a;t.u.hpBonus=(t.u.hpBonus||0)+h;if(t.u.exactUnit){t.u.exactUnit.atk+=a;t.u.exactUnit.hp+=h;t.u.exactUnit.maxHp+=h;}},
 grantHand:(t,k)=>{if(!t?.u)return;t.u.kwBonus=[...(t.u.kwBonus||[]),k];if(t.u.exactUnit)t.u.exactUnit.kw.push(k);},
 removeKeyword:(t,k)=>{if(!t?.u)return;t.u.kw=t.u.kw.filter(x=>x!==k);t.u.tempKw=t.u.tempKw.filter(x=>x!==k);t.u.removedKw=[...(t.u.removedKw||[]),k];},
 copy:(t,opts)=>copyUnit(g,p,t,opts),createCopy:(t,opts)=>copyHand(g,p,t,opts),
 revive:(record,opts={})=>revive(g,p,record,opts),scheduleRevive:(record,opts={})=>(g.players[p].revivals??=[]).push({record:structuredClone(record),opts,round:g.round+1}),
 summonFromDeck:(filter,opts)=>summonFromDeck(g,p,filter,opts),grantEverywhere:(f,a,h,opts)=>grantEverywhere(g,p,f,a,h,opts),
 obliterate:t=>{if(t?.hand){g.players[t.p].hand=g.players[t.p].hand.filter(h=>h.uid!==t.u.uid);handChanged(g,t.p);}else if(t?.u){effect(g,'obliterate',{p:t.p,uid:t.u.uid,card:t.u.card});leaveBoard(g,t);}},
 capture:(captor,captive)=>{if(!captor?.u||!captive?.u||captor.u.uid===captive.u.uid)return;const saved={p:captive.p,card:baseId(captive.u.card)};effect(g,'capture',{p:captive.p,uid:captive.u.uid,card:captive.u.card,source:captor.u.uid});leaveBoard(g,captive);(captor.u.captured??=[]).push(saved);},
 transformCopy:(t,source)=>{if(!t?.u||!source?.u)return;const h=exactPacket(g,t.p,source);t.u.captured=[];const nu=makeUnit(g,t.p,{...h,uid:t.u.uid});for(const k of Object.keys(t.u))delete t.u[k];Object.assign(t.u,nu);effect(g,'transform',{p:t.p,uid:t.u.uid,card:t.u.card});},
 temporaryMana:n=>{const s=g.players[p],amount=Math.min(n,10-s.maxMana);s.maxMana+=amount;s.mana=Math.min(10,s.mana+amount);s.temporaryMana=(s.temporaryMana||0)+amount;},
 stop:t=>{const uid=typeof t==='string'?t:t?.stack?.uid||t?.uid;g.stack=g.stack.filter(x=>x.uid!==uid);},manifest:filter=>manifest(g,p,filter),steal:(t,temporary)=>steal(g,p,t,temporary),
 transform:(t,id)=>transform(g,t,id),randomCard:filter=>{const pool=Object.values(CARDS).filter(c=>c.collectible&&cardSupported(c.id)&&(!filter||filter(c)));return random(g,pool)?.id;},random:a=>random(g,a),
 level:()=>level(g,p,u),strike:(a,t,n)=>strike(g,a,t,n),createInDeck:(id,n,pos,exact)=>createInDeck(g,p,id,n,pos,exact),plant:n=>plant(g,p,n)
 };}
function champions(g){for(let p=0;p<2;p++){const s=g.players[p];for(const u of s.board){const stats=!u.silenced&&rules[u.card]?.enlightenedStats,active=!!stats&&s.maxMana>=10,before=!!u.flags.enlightened;if(active!==before){const old=u.flags.enlightenedStats||stats||{atk:0,hp:0};buff(g,descriptor(p,u),active?stats.atk:-old.atk,active?stats.hp:-old.hp);u.flags.enlightened=active;if(active)u.flags.enlightenedStats=stats;}}for(const u of [...s.board]){if(u.silenced||!data(u).hero)continue;const name=CARDS[u.baseCard]?.nameEn||data(u).nameEn;
 if(!u.level){
  if(rules[u.card]?.checkLevel?.(context(g,p,u)))level(g,p,u);
  if(!u.level&&(name==='Garen'&&u.strikes>=2||name==='Darius'&&g.players[1-p].hp<=10||name==='Braum'&&u.damageTaken>=10||name==='Jinx'&&s.hand.length===0||name==='Fiora'&&u.kills>=2||name==='Karma'&&s.maxMana===10||name==='Anivia'&&s.maxMana===10||name==='Teemo'&&s.puffcapsPlanted>=15||name==='Ezreal'&&s.targets>=8||name==='Yasuo'&&s.stunsRecalls>=5||name==='Kalista'&&u.seenDeaths>=3||name==='Thresh'&&u.seenDeaths>=6||name==='Lucian'&&(u.seenDeaths>=4||u.flags.sennaDied)||name==='Ashe'&&(s.frostbites||0)>=5||name==='Vladimir'&&(s.damageSurvivors||0)>=5||name==='Heimerdinger'&&(u.seenTechPower||0)>=12))level(g,p,u);
 }
 if(name==='Fiora'&&u.level&&u.kills>=4&&u.hp>0)g.winner=p;
 }} }
function settle(g){
 if(g.settling)return;g.settling=true;
 try{
  let guard=0;while(guard++<100){let dead=[];
   for(let p=0;p<2;p++)for(const u of g.players[p].board)if(u.hp<=0){if(data(u).nameEn==='Tryndamere'&&!u.level&&!u.silenced){level(g,p,u);u.hp=u.maxHp;u.destroyed=false;}else dead.push(descriptor(p,u));}
   if(!dead.length)break;
   const observers=g.players.map(s=>s.board.filter(u=>u.hp>0));
   for(const d of dead){effect(g,'death',{p:d.p,uid:d.u.uid,card:d.u.card});const s=g.players[d.p];s.board=s.board.filter(u=>u.uid!==d.u.uid);s.roundDeaths++;s.unitsDied++;s.grave.push({...structuredClone(d.u),deathRound:g.round});}
   for(const d of dead){release(g,d.u);log(g,data(d.u).name+'阵亡');for(let p=0;p<2;p++)for(const u of observers[p]){if(!self(g,u.uid)||u.hp<=0)continue;if(p===d.p)u.seenDeaths++;else if(data(u).nameEn==='Thresh')u.seenDeaths++;if(data(u).nameEn==='Lucian'&&p===d.p&&CARDS[d.u.baseCard]?.nameEn==='Senna, Sentinel of Light')u.flags.sennaDied=true;}for(let p=0;p<2;p++)for(const u of observers[p])if(self(g,u.uid)&&u.hp>0)trigger(g,p,u,p===d.p?'allyDied':'enemyDied',null,null,d);trigger(g,d.p,d.u,'lastBreath');}
  }
  champions(g);if(g.winner===null){if(g.players.every(s=>s.hp<=0))g.winner='draw';else if(g.players[0].hp<=0)g.winner=1;else if(g.players[1].hp<=0)g.winner=0;}
 }finally{g.settling=false;}
}
function validTarget(g,p,type,id,source=null){
 if(type==='none'||!type)return id==null;
 if(['allyHand','allyHandUnit','cardHand'].includes(type)){const h=g.players[p].hand.find(h=>h.uid===id);return !!h&&(type!=='allyHandUnit'||CARDS[h.card].kind==='unit');}
 const t=target(g,id);if(!t||t.u?.hp<=0)return false;
 if(type==='stack')return !!t.stack&&(t.stack.kind==='skill'||['fast','slow'].includes(CARDS[t.stack.cid]?.speed));if(t.stack)return false;
 if(type==='any')return true;if(type==='unit')return !t.core;if(type==='ally')return t.p===p&&!t.core;if(type==='enemyUnit')return t.p!==p&&!t.core;if(type==='enemy')return t.p!==p;if(type==='allyAny')return t.p===p;if(type==='follower')return !t.core&&!data(t.u).hero;if(type==='enemyFollower')return t.p!==p&&!t.core&&!data(t.u).hero;if(type==='allyDamaged')return t.p===p&&!t.core&&t.u.hp<t.u.maxHp;return false;
}
const fixedTypes=r=>r.targets||[r.target||'none',r.target2,r.target3].filter(x=>x!==undefined);
function getTarget(g,p,type,id){if(['allyHand','allyHandUnit','cardHand'].includes(type)){const u=g.players[p].hand.find(h=>h.uid===id);return u?{p,u,hand:true}:null;}return target(g,id);}
function targetSet(g,p,r,ids,variable=[]){const types=fixedTypes(r);return {fixed:types.map((type,i)=>validTarget(g,p,type,ids[i])?getTarget(g,p,type,ids[i]):null),variable:variable.map(id=>validTarget(g,p,r.targetCount?.type,id)?getTarget(g,p,r.targetCount?.type,id):null)};}
function effectiveCard(g,p,h){const c=CARDS[h.card];if(c?.hero&&g.players[p].board.some(u=>baseId(u.card)===baseId(h.card))){const sig=c.associated.find(id=>CARDS[id]?.kind==='spell'&&cardSupported(id));if(sig)return {c:CARDS[sig],id:sig};}const leveled=c?.hero&&g.players[p].levels[baseId(h.card)]?levelVariant(h.card):null;return leveled?{c:CARDS[leveled],id:leveled}:{c,id:h.card};}
function effectiveCost(g,p,h,c){const s=g.players[p],r=rules[c.id],base=r?.cost?r.cost(context(g,p,h)):c.cost;let n=((h.costOverrideRound!==undefined&&h.costOverrideRound!==g.round?undefined:h.costOverride)??base)+(h.costDelta||0);if(c.nameEn==='Remembrance')n-=s.roundDeaths;if(c.nameEn==='Plaza Guardian')n-=s.spellsPlayed;if(c.nameEn==='Scuttlegeist'&&!r?.cost)n-=s.unitsDied;if(['burst','focus'].includes(c.speed))n-=s.board.filter(u=>!u.silenced&&rules[u.card]?.spellDiscount).reduce((n,u)=>n+rules[u.card].spellDiscount,0);return Math.max(0,n);}
function pay(s,n,isSpell){const bank=isSpell?Math.min(s.bank,n):0;if(s.mana+bank<n)fail('法力不足');s.bank-=bank;s.mana-=n-bank;}
function enqueue(g,p,id,u,targets,kind='spell',choice='attack',extra={}){if(g.stack.length>=9)fail('响应链最多容纳 9 个法术或技能');if(!g.stack.length)g.stackOwner=p;g.stack.push({uid:'s'+(++g.serial),p,cid:id,source:u?structuredClone(u):null,targets,tid:targets[0]??null,kind,choice,displayId:(typeof rules[id]?.skillId==='object'?rules[id].skillId[extra.hook]:rules[id]?.skillId)||id,...extra});}
function resolve(g,item){
 const r=rules[item.cid],c=CARDS[item.cid];if(!r)return;const ids=item.targets||[],v=item.variableTargets||[],targetRule=item.hook==='attack'?{target:'none'}:r;const ts=targetSet(g,item.p,targetRule,ids,v),types=fixedTypes(targetRule);
 const missing=types.some((type,i)=>type!=='none'&&!ts.fixed[i]&&!(r.targetOptional&&ids[i]==null));
 if(!r.resolveWithoutTarget&&!r.resolvePartialTargets&&(missing||r.targetCount&&ts.variable.some(t=>!t))){log(g,c.name+'的目标已失效');return;}
 const [t,t2,t3]=ts.fixed,src=item.source?(self(g,item.source.uid)?.u||item.source):null;
 const ctx=context(g,item.p,src,t,t2,null,{t3,targets:r.targetCount?ts.variable:ts.fixed.filter((_,i)=>types[i]!=='none'),spellCard:item.cid,choice:item.choice,discarded:item.discarded||[],discardedCount:item.discardedCount||0,event:{manaSpent:item.manaSpent||0},manaSpent:item.manaSpent||0});
 if(r.validate&&item.hook!=='attack'&&!r.resolveWithoutTarget&&!r.resolvePartialTargets){const ok=r.validate(ctx);if(ok!==true&&ok!==undefined){log(g,c.name+'的使用条件已失效');return;}}
 effect(g,'spell',{p:item.p,card:item.displayId||r.skillId?.[item.hook]|| (typeof r.skillId==='string'?r.skillId:item.cid),targets:publicTargets(g,[...ids,...v]),kind:item.kind});
 if(item.kind==='skill'){const fn=r[item.hook];if(fn)fn(ctx);}else{r.effect?.(ctx);if(r.championShuffle)createInDeck(g,item.p,r.championShuffle);}
 log(g,c.name+'结算');settle(g);
}
function finishChain(g){while(g.stack.length&&g.winner===null)resolve(g,g.stack.pop());g.stack=[];const owner=g.stackOwner;g.stackOwner=null;g.passes=0;if(g.combat){fight(g);}else g.priority=1-(owner??g.priority);}
function startRound(g){g.round++;g.phase='main';g.token=true;if(g.round>1)g.roundOwner=1-g.roundOwner;g.attacker=g.roundOwner;g.tokens=[false,false];g.tokens[g.roundOwner]=true;g.priority=g.roundOwner;g.passes=0;effect(g,'round',{round:g.round,attacker:g.attacker});
 for(let p=0;p<2;p++){const s=g.players[p];s.maxMana=Math.min(10,s.maxMana+1);s.mana=s.maxMana;s.roundDeaths=0;draw(g,p,1);}
 for(let p=0;p<2;p++){const s=g.players[p],due=(s.revivals||[]).filter(x=>x.round<=g.round);s.revivals=(s.revivals||[]).filter(x=>x.round>g.round);for(const job of due)revive(g,p,job.record,job.opts);for(let n=0;n<(s.warmothers||0);n++)summonFromDeck(g,p,null,{top:true});for(const u of [...s.board])trigger(g,p,u,'roundStart');}settle(g);log(g,'第 '+g.round+' 轮 · '+g.players[g.attacker].name+'获得进攻令牌');}
function endRound(g){for(let p=0;p<2;p++){const s=g.players[p];for(const u of [...s.board])trigger(g,p,u,'roundEnd');for(const h of [...s.hand])rules[h.card]?.handRoundEnd?.(context(g,p,h));}settle(g);
 for(let p=0;p<2;p++){const s=g.players[p];s.bank=Math.min(3,s.bank+s.mana);s.maxMana-=s.temporaryMana||0;s.temporaryMana=0;for(const u of [...s.board]){if(has(g,u,'Ephemeral')){kill(g,descriptor(p,u));continue;}u.tempAtk=0;u.maxHp-=u.tempHp;u.hp=Math.min(u.hp,u.maxHp);u.tempHp=0;u.tempKw=[];u.removedKw=[];u.stunned=false;u.frozen=false;u.flags.roundAttack=false;u.flags.roundDeath=false;if(has(g,u,'Regeneration'))heal(g,p,descriptor(p,u),u.maxHp);if(has(g,u,'Barrier'))u.removedKw.push('Barrier');}for(const h of s.hand)if(h.roundCostDelta){h.costDelta-=h.roundCostDelta;delete h.roundCostDelta;}for(const u of [...s.board])if(u.hp>0&&u.returnTo?.round===g.round){const owner=u.returnTo.p;delete u.returnTo;s.board=s.board.filter(x=>x!==u);if(g.players[owner].board.length<6)g.players[owner].board.push(u);else release(g,u);}s.hand=s.hand.filter(h=>!h.fleeting&&!CARDS[h.card].kw.includes('Fleeting'));}
 settle(g);if(g.winner===null)startRound(g);
}
function legalBlock(g,p,a,b){if(!b||b.stunned||has(g,b,'CantBlock')||has(g,b,'Immobile'))return false;if(has(g,a,'Elusive')&&!has(g,b,'Elusive')&&!has(g,b,'Sharpsight'))return false;if(has(g,a,'Fearsome')&&attack(b,g)<3)return false;if(attack(b,g)===0&&g.players[1-p].board.some(u=>data(u).nameEn==='Ashe'&&u.level&&!u.silenced))return false;return true;}
function fight(g){const co=g.combat;if(!co)return;log(g,'战斗结算');
 for(const lane of co.lanes){const da=self(g,lane.attacker),db=self(g,lane.blocker),a=da?.u,b=db?.u?.stunned?null:db?.u;if(!a||a.hp<=0||a.stunned)continue;
 const hit=()=>{const aa=attack(a,g);if(!b||b.hp<=0){if(!lane.blocker||has(g,a,'Overwhelm'))strike(g,da,core(1-co.p));return;}
 const bh=b.hp,ba=attack(b,g),quick=has(g,a,'QuickStrike')||has(g,a,'DoubleStrike');const canStrike=aa>0;
 if(canStrike)effect(g,'strike',{p:co.p,uid:a.uid,target:b.uid});damage(g,co.p,db,aa,a);if(canStrike){a.strikes++;trigger(g,co.p,a,'strike',db,null,db);}
 if(has(g,a,'Overwhelm'))damage(g,co.p,core(1-co.p),Math.max(0,aa-bh),a);
 if(!quick||b.hp>0){if(ba>0)effect(g,'strike',{p:1-co.p,uid:b.uid,target:a.uid});damage(g,1-co.p,da,ba,b);if(ba>0){b.strikes++;trigger(g,1-co.p,b,'strike',da,null,da);if(has(g,b,'Ephemeral'))kill(g,db);}}
 if(canStrike&&has(g,a,'Ephemeral'))kill(g,da);
 };
 const double=has(g,a,'DoubleStrike');hit();settle(g);if(double&&a.hp>0&&g.winner===null)hit();settle(g);if(g.winner!==null)break;
 }
 g.combat=null;g.phase='main';g.priority=1-co.p;g.passes=0;settle(g);
}
function promoteChoice(g){if(!g.choice&&g.choices?.length){g.choice={...g.choices.shift(),resumePriority:g.priority};g.priority=g.choice.p;}}
export function act(state,p,a){
 if(state.schema!==3)fail('这是旧版本对局，请创建新房间');const g=structuredClone(state);if(!a||typeof a.type!=='string')fail('无效操作');if(![0,1].includes(p))fail('座位无效');if(g.winner!==null)fail('对局已结束');if(a.type==='surrender'){g.winner=1-p;effect(g,'winner',{p:g.winner});g.version++;return g;}if(p!==g.priority)fail('尚未轮到你行动');const s=g.players[p];
 if(g.choice){if(a.type!=='choose'||g.choice.p!==p||!g.choice.options.includes(a.choice))fail('请从展示的卡牌中选择');addHand(g,p,a.choice);g.priority=g.choice.resumePriority;delete g.choice;promoteChoice(g);g.version++;return g;}
 if(g.phase==='mulligan'){
  if(a.type!=='mulligan')fail('请先完成起手换牌');const ids=a.cards||[];if(!Array.isArray(ids)||ids.length>4||new Set(ids).size!==ids.length||ids.some(id=>!s.hand.some(h=>h.uid===id)))fail('换牌选择无效');const removed=s.hand.filter(h=>ids.includes(h.uid));s.hand=s.hand.filter(h=>!ids.includes(h.uid));draw(g,p,removed.length);s.deck.push(...removed);shuffle(g,s.deck);g.mulligans[p]=true;log(g,s.name+'完成换牌');if(!g.mulligans[1-p])g.priority=1-p;else startRound(g);g.version++;return g;
 }
 if(a.type==='play'){
  const idx=s.hand.findIndex(h=>h.uid===a.uid);if(idx<0)fail('手牌不存在');const h=s.hand[idx],{c,id}=effectiveCard(g,p,h),r=rules[id];if(!cardSupported(id))fail('这张卡牌的效果尚未实现');
  const discardIds=a.discards||[];if(!Array.isArray(discardIds)||new Set(discardIds).size!==discardIds.length||discardIds.some(uid=>uid===a.uid||!s.hand.some(h=>h.uid===uid)))fail('弃牌选择无效');if(r.discard&&(discardIds.length<r.discard.min||discardIds.length>r.discard.max))fail('请选择正确数量的弃牌');if(r.discard?.requireMaximum&&discardIds.length!==Math.min(r.discard.max,s.hand.length-1))fail('必须弃置可用的最大数量手牌');if(!r.discard&&discardIds.length)fail('此卡不需要弃牌');
  const discarded=discardIds.map(uid=>structuredClone(s.hand.find(h=>h.uid===uid)));
  const ids=[a.target??null,a.target2??null,a.target3??null],variable=a.targets||[],types=fixedTypes(r);
  if(!Array.isArray(variable)||new Set(variable).size!==variable.length)fail('多目标选择无效');
  for(let i=0;i<types.length;i++)if(!(i===0&&r.targetOptional&&ids[i]===null)&&!validTarget(g,p,types[i],ids[i]))fail('请选择合法目标');
  if(r.targetCount){const tc=r.targetCount;if(variable.length<tc.min||variable.length>tc.max||variable.some(uid=>!(tc.includeSelf&&uid===a.uid)&&!validTarget(g,p,tc.type,uid)))fail('请选择正确数量的合法目标');if(tc.requireMaximum){const candidates=['core0','core1',...g.players.flatMap(s=>s.board.map(u=>u.uid))].filter(id=>validTarget(g,p,tc.type,id));if(variable.length!==Math.min(tc.max,candidates.length))fail('必须选择可用的最大数量目标');}}
  else if(variable.length)fail('此卡不使用额外目标');
  const ts=targetSet(g,p,r,ids,variable),[t,t2,t3]=ts.fixed,selected=r.targetCount?ts.variable.map((t,i)=>t||(r.targetCount.includeSelf&&variable[i]===a.uid?{p,u:h,hand:true}:null)):ts.fixed.filter((_,i)=>types[i]!=='none');
  const sacrificeIds=a.sacrifices||[],sacrificeCount=r.sacrifice?.count||0;
  if(!Array.isArray(sacrificeIds)||sacrificeIds.length!==sacrificeCount||new Set(sacrificeIds).size!==sacrificeIds.length||sacrificeIds.some(uid=>!s.board.some(u=>u.uid===uid&&u.hp>0)))fail('请选择牺牲代价需要的友军');
  let extras={t3,targets:selected,choice:a.choice??'attack',discarded,discardedCount:discardIds.length};
  const chosen=r.options?.find(x=>(typeof x==='object'?x.id:x)===a.choice);if(r.options&&!chosen)fail('请选择卡牌效果');
  if(r.requires==='singleAlly'&&s.board.length!==1||r.requires==='noUnits'&&s.board.length)fail('未满足卡牌使用条件');
  if(r.validate){const ok=r.validate(context(g,p,null,t,t2,null,extras));if(ok!==true&&ok!==undefined)fail(typeof ok==='string'?ok:'未满足卡牌使用条件');}
  if(c.kind==='unit'){
   if(g.phase!=='main'||g.stack.length)fail('当前无法召唤单位');if(a.replace&&(sacrificeIds.includes(a.replace)||ids.includes(a.replace)||variable.includes(a.replace)))fail('被替换的单位不能同时作为目标或牺牲代价');if(a.replace&&!s.board.some(u=>u.uid===a.replace))fail('替换单位必须是己方场上的单位');if(a.replace&&s.board.length<6)fail('战场未满，无需替换单位');if(s.board.length-sacrificeIds.length-(r.recallCost?1:0)-(a.replace?1:0)>=6)fail('战场已满：请选择要替换的单位');
   if(c.hero&&s.board.some(u=>baseId(u.card)===baseId(c.id)))fail('场上已有同名英雄');
   pay(s,effectiveCost(g,p,h,c),false);s.hand.splice(idx,1);effect(g,'play',{p,uid:h.uid,card:id,targets:publicTargets(g,[...ids,...variable])});if(a.replace)leaveBoard(g,self(g,a.replace));
   for(const uid of discardIds)context(g,p,null).discard(uid);
   for(const uid of sacrificeIds)kill(g,self(g,uid));if(sacrificeIds.length)settle(g);
   if(r.recallCost)recall(g,p,t);
   const d=summon(g,p,id,h);if(!d)fail('没有足够的战场位置');if(r.targetCount?.includeSelf)extras={...extras,targets:targetSet(g,p,r,ids,variable).variable};log(g,s.name+'打出'+c.name);
   for(const dest of [...ts.fixed,...ts.variable].filter(x=>x?.u&&!x.hand))trigger(g,dest.p,dest.u,'targeted',null,null,{p,card:id});
   s.playedCards??=[];if(!s.playedCards.includes(id))s.playedCards.push(id);
   if(r.skill==='play'||Array.isArray(r.skill)&&r.skill.includes('play')){enqueue(g,p,id,d.u,ids,'skill',a.choice??'attack',{hook:'play',variableTargets:variable,discarded,discardedCount:discarded.length});}else trigger(g,p,d.u,'play',t,t2,null,extras);g.priority=1-p;g.passes=0;
  }else{
   if(!['spell','skill'].includes(c.kind))fail('当前无法使用此卡');if((c.speed==='slow'||c.speed==='focus')&&(g.phase!=='main'||g.stack.length))fail('慢速 / 专注法术不能在响应或战斗时使用');
   if(g.stack.length>=9)fail('响应链已满');const n=r.spendAllMana?s.mana+s.bank:effectiveCost(g,p,h,c);pay(s,n,true);s.hand.splice(idx,1);effect(g,'play',{p,uid:h.uid,card:id,targets:publicTargets(g,[...ids,...variable])});for(const uid of discardIds)context(g,p,null).discard(uid);s.spellsPlayed++;s.spellManaSpent+=n;
   s.playedCards??=[];if(!s.playedCards.includes(id))s.playedCards.push(id);if(n>=6)s.largeSpellPlayed=true;
   const allTargets=[...ts.fixed,...ts.variable].filter(Boolean);for(const dest of allTargets){if(dest.u&&!dest.hand&&dest.p!==p)s.targets++;if(dest.u&&!dest.hand)trigger(g,dest.p,dest.u,'targeted',null,null,{p,card:id});}
   log(g,s.name+'施放'+c.name);const details={variableTargets:variable,manaSpent:n,discarded,discardedCount:discardIds.length};
   const item={p,cid:id,targets:ids,tid:ids[0],kind:'spell',choice:a.choice??'attack',...details};
   const event={card:id,uid:h.uid,p,targets:allTargets,cost:n,manaSpent:n};sideEmit(g,p,'spellPlayed',event);
   if(c.speed==='burst'||c.speed==='focus')resolve(g,item);else {enqueue(g,p,id,null,ids,'spell',a.choice??'attack',details);if(g.phase!=='block')g.priority=1-p;}
   if(g.combat&&(c.speed==='burst'||c.speed==='focus')){g.combat.burstActed=true;g.combat.defenderActed=true;}
   const copies=s.board.filter(u=>data(u).nameEn==='Karma'&&u.level&&!u.silenced).length;
   for(let i=0;i<copies;i++){if(c.speed==='burst'||c.speed==='focus')resolve(g,item);else if(g.stack.length<9)enqueue(g,p,id,null,ids,'spell',a.choice??'attack',details);}
   g.passes=0;
  }
  handChanged(g,p);settle(g);
 }else if(a.type==='attack'){
  if(g.phase!=='main'||g.stack.length||!g.tokens[p])fail('现在无法进攻');const ids=a.units;if(!Array.isArray(ids)||!ids.length||ids.length>6||new Set(ids).size!==ids.length||ids.some(id=>!s.board.some(u=>u.uid===id&&!u.stunned&&!has(g,u,'Immobile'))))fail('进攻单位无效');
  g.tokens[p]=false;g.token=g.tokens[g.attacker];g.phase='block';g.combat={p,lanes:ids.map(id=>({attacker:id,blocker:null,challenged:false}))};
  const used=new Set();for(const [aid,bid]of Object.entries(a.challenges||{})){const at=self(g,aid),bt=self(g,bid);if(!ids.includes(aid)||!at||!bt||bt.p===p||!has(g,at.u,'Challenger')||used.has(bid)||bt.u.stunned||has(g,bt.u,'CantBlock'))fail('挑战目标无效');const l=g.combat.lanes.find(l=>l.attacker===aid);l.blocker=bid;l.challenged=true;used.add(bid);}
  effect(g,'attack',{p,targets:[...ids],lanes:g.combat.lanes.map(l=>({...l}))});s.attacks++;
  for(let i=0;i<ids.length;i++){const d=self(g,ids[i]);if(!d)continue;const next=self(g,ids[i+1]);if(next)trigger(g,p,d.u,'support',next);if(rules[d.u.card]?.skill==='attack'||Array.isArray(rules[d.u.card]?.skill)&&rules[d.u.card].skill.includes('attack'))enqueue(g,p,d.u.card,d.u,[], 'skill',0,{hook:'attack'});else trigger(g,p,d.u,'attack',next);}
  sideEmit(g,p,'onAttack',{units:ids});
  if(g.combat.lanes.some(l=>{const d=self(g,l.attacker);return d&&has(g,d.u,'Ephemeral');})){const sharks=s.sharks||[];s.sharks=[];for(const record of sharks)revive(g,p,record,{attacking:true,ephemeral:true});}
  s.ephemeralAttacks=(s.ephemeralAttacks||0)+g.combat.lanes.filter(l=>{const d=self(g,l.attacker);return d&&has(g,d.u,'Ephemeral');}).length;
  g.priority=1-p;g.passes=0;log(g,s.name+'发起进攻');settle(g);
 }else if(a.type==='block'){
  if(g.phase!=='block'||!g.combat)fail('当前不是阻挡阶段');const assignments=a.assignments;if(!assignments||typeof assignments!=='object'||Array.isArray(assignments))fail('无效阻挡');const used=new Set(g.combat.lanes.filter(l=>l.challenged).map(l=>l.blocker));
  for(const [aid,bid]of Object.entries(assignments)){const l=g.combat.lanes.find(l=>l.attacker===aid);if(!l||l.challenged&&l.blocker!==bid)fail('不能更改挑战指定的阻挡');if(l.challenged)continue;const b=self(g,bid),at=self(g,aid);if(!b||b.p!==p||used.has(bid)||!at||!legalBlock(g,p,at.u,b.u))fail('这个单位无法阻挡此进攻者');used.add(bid);l.blocker=bid;}
  effect(g,'block',{p,targets:g.combat.lanes.map(l=>l.blocker).filter(Boolean),lanes:g.combat.lanes.map(l=>({...l}))});g.phase='combat';g.passes=0;g.priority=g.combat.p;log(g,s.name+'确认阻挡');
  // Declaring blockers itself returns action priority only if an action/skill is pending.
  if(!g.stack.length&&!g.combat.defenderActed)fight(g);
 }else if(a.type==='pass'){
  if(g.phase==='block')fail('请确认阻挡');g.passes++;g.priority=1-p;log(g,s.name+'让过');
  if(g.stack.length){if(g.passes>=1)finishChain(g);}else if(g.phase==='combat'){if(g.combat.burstActed){g.combat.burstActed=false;}else fight(g);}else if(g.passes>=2)endRound(g);
 }else fail('未知操作');if(state.winner===null&&g.winner!==null)effect(g,'winner',{p:g.winner});promoteChoice(g);g.version++;return g;
}
export function view(state,p){const g=structuredClone(state);delete g.seed;delete g.serial;delete g.settling;delete g.effectSerial;delete g.choices;if(g.choice){delete g.choice.resumePriority;if(g.choice.p!==p)g.choice={p:g.choice.p,options:[]};}
 g.players.forEach((s,i)=>{s.deckCount=s.deck.length;delete s.deck;delete s.globalBuffs;delete s.revivals;delete s.sharks;s.handCount=s.hand.length;if(i!==p)s.hand=Array.from({length:s.handCount},()=>({hidden:true}));else s.hand=s.hand.map(h=>{const {c,id}=effectiveCard(state,p,h);return {...h,card:id,baseCard:h.card,cost:effectiveCost(state,p,h,c)};});});return g;}
