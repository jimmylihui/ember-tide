// Stateful and multi-target Foundations effects. All printed text and artwork
// belong to Riot Games; the effect implementations are independently written.
import {CARDS} from './cards.js';
import {RULES} from './rules.js';

export const COMPLETION_RULES={};
const define=(id,r={})=>{if(!CARDS[id])throw new Error('Unknown completion card '+id);COMPLETION_RULES[id]={target:'none',note:[CARDS[id].textEn,CARDS[id].levelTextEn].filter(Boolean).join(' ')||'Keywords only',...r};};
const spell=(id,target,effect,rest={})=>define(id,{target,effect,...rest});
const own=c=>c.self||{p:c.p,u:c.u};
const unit=x=>x?.kind==='unit';
const follower=x=>unit(x)&&!x.hero;
const meta=(c,t)=>c.card(t?.u?.card||t?.card||t);
const sub=(x,s)=>(x?.subtypes||[]).includes(s);
const other=(a,b)=>a?.u?.uid!==b?.u?.uid;
const different=c=>other(c.t,c.t2)||'Choose two different targets.';
const power=(c,t)=>c.attack?c.attack(t):Math.max(0,(t.u.atk||0)+(t.u.tempAtk||0));
const health=t=>t.u.hp??(CARDS[t.u.card].hp+(t.u.hpBonus||0));
const negative=new Set(['Ephemeral','CantBlock','Immobile','Vulnerable','LastBreath','Support','AuraVisualFakeKeyword','Imbue']);
const keywords=(c,t)=>c.keywords?c.keywords(t):[...new Set([...(t.u.silenced?[]:meta(c,t).kw),...(t.u.kw||[]),...(t.u.tempKw||[])])].filter(k=>!(t.u.removedKw||[]).includes(k));
const positive=(c,t)=>keywords(c,t).filter(k=>!negative.has(k));
const has=(c,t,k)=>keywords(c,t).includes(k);
const flags=c=>(c.u.flags||={});
const regionMatch=(c,x)=>x.regions.some(r=>c.player.regions.includes(r));
const allegiance=(c,r)=>c.player.deck.length&&meta(c,c.player.deck[0]).regions.includes(r);
const randomCreate=(c,filter)=>{const id=c.randomCard(filter);return id?c.create(id):null;};
const selected=c=>(c.targets||[]).filter(Boolean);
const all=(c)=>[...c.allies(),...c.enemies()];
const packetDesc=(p,h)=>({p,u:h,hand:true});
const sameName=(c,t)=>{const name=meta(c,t).nameEn;return x=>x.nameEn===name;};
function largeSpell(c,a,h,k){
 if(!c.player.largeSpellPlayed&&!((c.event?.cost||0)>=6))return;
 if(flags(c).largeSpellGranted)return;flags(c).largeSpellGranted=true;
 if(a||h)c.buff(own(c),a,h);if(k)c.grant(own(c),k);
}
function investigator(c){
 if(!c.player.largeSpellPlayed&&!((c.event?.cost||0)>=6))return;
 if(flags(c).largeSpellGranted)return;flags(c).largeSpellGranted=true;c.create('01DE025');
}

// Demacia: capture, exact copies, hand grants, and complete random pools.
define('01DE004',{play:c=>c.copy(own(c))});
define('01DE010',{lastBreath:c=>randomCreate(c,x=>follower(x)&&sub(x,'ELITE'))});
define('01DE023',{summon:investigator,spellPlayed:investigator});
define('01DE024',{lastBreath:c=>randomCreate(c,x=>x.kind==='spell'&&x.cost>=6&&!x.regions.includes('Demacia'))});
spell('01DE025','ally',c=>c.capture(c.t,c.t2),{target2:'unit',validate:different});
spell('01DE033','none',c=>{const id=c.randomCard(x=>follower(x)&&x.cost===5&&x.regions.includes('Demacia'));if(id)c.summon(id);});
define('01DE036',{handAllySummoned:c=>{if(sub(meta(c,c.event),'ELITE'))c.u.costDelta=(c.u.costDelta||0)-1;}});
define('01DE040',{summon:c=>largeSpell(c,1,1,'Challenger'),spellPlayed:c=>largeSpell(c,1,1,'Challenger')});
define('01DE048',{summon:c=>largeSpell(c,2,2),spellPlayed:c=>largeSpell(c,2,2)});
define('01DE053',{strike:c=>randomCreate(c,x=>follower(x)&&x.id!=='01DE053'&&x.kw.includes('Challenger')&&regionMatch(c,x))});
define('01DE055',{target:'allyHandUnit',targetOptional:true,play:c=>{if(c.t?.u)c.grantHand(c.t,'Challenger');}});

// Freljord: everywhere modifiers, mana, deck summons, and combination.
spell('01FR006','ally',c=>c.grantEverywhere(sameName(c,c.t),2,2));
spell('01FR016','none',c=>c.grantEverywhere(x=>unit(x)&&sub(x,'PORO'),1,1));
define('01FR017',{play:c=>{
 const top=c.player.deck.splice(0,6);
 for(const h of top){
  if(sub(meta(c,h),'ELNUK')){
   const d=c.summon(h.card,{packet:h});
   if(!d)c.createInDeck(h.card,1,'shuffle',h);
  }else c.createInDeck(h.card,1,'shuffle',h);
 }
}});
spell('01FR023','none',c=>{c.player.warmothers=(c.player.warmothers||0)+1;c.summonFromDeck(unit,{top:true,limit:1});});
define('01FR031',{handRoundEnd:c=>{c.u.costDelta=(c.u.costDelta||0)-1;}});
define('01FR033',{roundStart:c=>c.temporaryMana(1)});
define('01FR043',{play:c=>{
 const poros=c.allies().filter(t=>follower(meta(c,t))&&sub(meta(c,t),'PORO'));
 const a=poros.reduce((n,t)=>n+power(c,t),0),h=poros.reduce((n,t)=>n+health(t),0);
 const kw=[...new Set(poros.flatMap(t=>positive(c,t)))];
 for(const t of poros)c.obliterate(t);
 c.summon('01FR043T1',{stats:{atk:a,hp:h},keywords:kw});
}});
define('01FR043T1',{lastBreath:c=>c.summon('01FR043')});
define('01FR047',{enlightenedStats:{atk:4,hp:4}});
define('01FR049',{summon:c=>c.summon('01FR049T1',{p:1-c.p})});
define('01FR052',{skill:'play',skillId:'01FR052T1',play:c=>{
 for(const t of all(c))if(power(c,t)<=4)c.obliterate(t);
 for(let p=0;p<2;p++)for(const h of [...c.g.players[p].hand]){
  const card=meta(c,h);if(unit(card)&&card.atk+(h.atkBonus||0)<=4)c.obliterate(packetDesc(p,h));
 }
}});

// Ionia: stun/recall events, exact copies, hand targets, and stack targets.
const yasuo=c=>{
 if(c.actor!==c.p||!c.event?.u||c.event.p===c.p)return;
 if(!c.u.level&&c.player.stunsRecalls>=5)c.level();
 if(c.u.level)c.strike(own(c),c.event);else c.damage(c.event,2);
};
define('01IO008',{unitStunned:c=>{if(c.actor===c.p)c.buff(own(c),2,0);},unitRecalled:c=>{if(c.actor===c.p)c.buff(own(c),2,0);}});
const zedAttack=upgraded=>c=>c.summon('01IO009T1',{attacking:true,stats:{atk:power(c,own(c)),hp:health(own(c))},keywords:upgraded?positive(c,own(c)):[]});
define('01IO009',{champion:'Zed',attack:zedAttack(false),allyNexusStrike:c=>{
 if(c.event?.u&&(c.event.u.uid===c.u.uid||meta(c,c.event).nameEn==='Living Shadow')){
  flags(c).shadowHits=(flags(c).shadowHits||0)+1;if(flags(c).shadowHits>=2)c.level();
 }
}});
define('01IO009T2',{champion:'Zed',attack:zedAttack(true)});
spell('01IO003','ally',c=>{if(has(c,c.t,'Ephemeral')){c.removeKeyword(c.t,'Ephemeral');c.grant(c.t2,'Ephemeral');}},{target2:'enemyUnit',validate:c=>has(c,c.t,'Ephemeral')||'Choose an Ephemeral ally.'});
define('01IO015',{champion:'Yasuo',unitStunned:yasuo,unitRecalled:yasuo});
define('01IO015T1',{champion:'Yasuo',unitStunned:yasuo,unitRecalled:yasuo});
define('01IO016',{target:'cardHand',targetOptional:true,validate:c=>!c.t?.u||meta(c,c.t).nameEn!=='Zephyr Sage'||'Zephyr Sage cannot copy itself.',play:c=>{if(c.t?.u)c.createCopy(c.t);}});
define('01IO023',{target:'allyHandUnit',targetOptional:true,play:c=>{if(c.t?.u)c.buffHand(c.t,3,3);}});
spell('01IO024','ally',c=>{c.copy(c.t,{ephemeral:true});c.copy(c.t,{ephemeral:true});});
define('01IO026',{target:'allyHandUnit',targetOptional:true,play:c=>{if(c.t?.u)c.buffHand(c.t,1,0);}});
define('01IO031',{spellDiscount:1});
define('01IO033',{skill:'play',skillId:'01IO033T1',targetCount:{type:'enemyUnit',min:0,max:3,distinct:true},resolvePartialTargets:true,play:c=>selected(c).forEach(t=>c.recall(t))});
define('01IO036',{strike:c=>{
 const units=c.hand().filter(h=>unit(meta(c,h)));if(!units.length)return;
 const cost=Math.max(...units.map(h=>c.effectiveCost(h))),h=c.random(units.filter(h=>c.effectiveCost(h)===cost));
 h.costDelta=(h.costDelta||0)-1;
}});
spell('01IO039','ally',c=>{
 const old=c.t.u.uid,index=c.player.board.findIndex(u=>u.uid===old);
 if(c.recall(c.t))c.summon('01IO009T1',{replaceUid:old,boardIndex:index});
});
const karmaEnd=c=>randomCreate(c,x=>x.kind==='spell'&&regionMatch(c,x));
define('01IO041',{champion:'Karma',roundEnd:karmaEnd});
define('01IO041T1',{champion:'Karma',roundEnd:karmaEnd,duplicateSpells:true});
define('01IO044',{target:'ally',recallCost:true});
spell('01IO049','stack',c=>c.stop(c.t.stack.uid||c.t.stack.id||c.t.stack));
define('01IO050',{summon:c=>{if(allegiance(c,'Ionia'))c.summonFromDeck((x,h)=>unit(x)&&c.effectiveCost(h)===1,{limit:1});}});
define('01IO052',{summon:c=>c.summon('01IO052T1',{stats:{atk:power(c,own(c)),hp:health(own(c))}})});
define('01IO053',{enlightenedStats:{atk:4,hp:4}});
spell('01IO054','none',c=>{for(let i=0;i<(c.player.maxMana>=10?2:1);i++)randomCreate(c,x=>x.kind==='spell'&&x.id!=='01IO054'&&regionMatch(c,x));});
spell('01IO055','allyHandUnit',c=>{c.grantHand(c.t,'Barrier');c.draw(1);});

// Noxus: ordered multi-target play/attack skills and hand-selection triggers.
define('01NX003',{roundStart:c=>{
 if(!c.hand().length)return;const lowest=Math.min(...c.hand().map(h=>c.effectiveCost(h)));
 const h=c.random(c.hand().filter(h=>c.effectiveCost(h)===lowest));c.discard(h.uid);c.draw(1);
}});
// The enemy damage counts chosen allies; Tough/Barrier do not reduce it.
// The level-two drain is a single packet, so damage bonuses apply once.
const vladimirPlay=c=>{if(!c.t)return;const allies=selected(c);for(const t of allies)c.damage(t,1);if(allies.length)c.damage(c.t,allies.length);};
const vladimirAttack=c=>{
 const attackers=c.attackingAllies(),index=attackers.findIndex(t=>t.u.uid===c.u.uid);
 if(index<0)return;
 const right=attackers.slice(index+1);for(const ally of right)c.damage(ally,1);
 if(right.length){const n=c.damage(c.core(1-c.p),right.length);c.heal(c.core(c.p),n);}
};
const vladTargets={target:'enemyUnit',targetOptional:true,targetCount:{type:'ally',min:0,max:6,distinct:true,includeSelf:true},resolvePartialTargets:true,validate:c=>!selected(c).length||!!c.t||'Choose an enemy unit for the damage.'};
define('01NX006',{...vladTargets,champion:'Vladimir',skill:'play',skillId:'01NX006T2',play:vladimirPlay});
define('01NX006T1',{...vladTargets,champion:'Vladimir',skill:['play','attack'],skillId:{play:'01NX006T2',attack:'01NX006T4'},play:vladimirPlay,attack:vladimirAttack});
define('01NX014',{nexusDamageMultiplier:2});
define('01NX021',{attack:c=>c.grantEverywhere(x=>x.nameEn==='Legion Marauder',1,1)});
define('01NX035',{summon:c=>{
 if([...c.hand(),...c.player.board].some(h=>meta(c,h).nameEn==='Draven'))return;
 const h=c.random(c.player.deck.filter(h=>meta(c,h).nameEn==='Draven'));if(!h)return;
 c.player.deck.splice(c.player.deck.indexOf(h),1);c.player.deck.unshift(h);
}});

// Piltover & Zaun: full random generation, manifest, transforms, and cost.
define('01PZ002',{summon:c=>{const n=c.player.summonedCounts?.['01PZ002']||1;for(let i=0;i<n;i++)randomCreate(c,x=>!x.hero);}});
spell('01PZ004','none',c=>(c.targets||[]).forEach((t,i)=>{if(t)c.damage(t,3-i);}),{targetCount:{type:'enemy',min:1,max:3,distinct:true,requireMaximum:true},resolvePartialTargets:true});
spell('01PZ005','follower',c=>c.transformCopy(c.t,c.t2),{target2:'follower',validate:different});
define('01PZ006',{costReduction:'spellsPlayed'});
spell('01PZ016','none',c=>{randomCreate(c,x=>x.kind==='spell'&&x.cost>=6&&regionMatch(c,x));c.refillSpellMana();});
define('01PZ021',{nexusStrike:c=>c.copy(own(c))});
define('01PZ024',{summon:c=>largeSpell(c,4,0,'QuickStrike'),spellPlayed:c=>largeSpell(c,4,0,'QuickStrike')});
spell('01PZ027','unit',c=>c.damage(c.t,c.event?.manaSpent??c.manaSpent??0),{spendAllMana:true});
const EPICS=new Set(['01IO047','01IO033','01IO021','01IO027','01IO007','01IO030','01NX053','01NX029','01NX014','01NX051','01NX044','01NX024','01DE031','01DE002','01DE052','01DE007','01DE053','01DE051','01PZ013','01PZ048','01PZ035','01PZ004','01PZ033','01PZ049','01FR013','01FR019','01FR041','01FR021','01FR052','01FR023','01SI035','01SI033','01SI003','01SI041','01SI044','01SI015']);
define('01PZ029',{play:c=>c.manifest(x=>EPICS.has(x.id)&&regionMatch(c,x))});
define('01PZ030',{target:'follower',targetOptional:true,skill:'play',skillId:'01PZ030T1',play:c=>{if(c.t?.u)c.transformCopy(own(c),c.t);}});
const playedCount=c=>new Set((c.player.playedCards||[]).map(x=>meta(c,typeof x==='string'?x:x.card).nameEn)).size;
spell('01PZ033','none',c=>{if(playedCount(c)>=20)c.summon('01PZ033T1');});
define('01PZ034',{summon:c=>{if(allegiance(c,'PiltoverZaun')){const h=c.create('01PZ026');if(h){h.costOverride=0;h.costOverrideRound=c.g.round;}}}});
define('01PZ035',{targeted:c=>c.draw(1)});
define('01PZ043',{nexusStrike:c=>{const h=c.random(c.opponent.deck.filter(h=>meta(c,h).kind==='spell'));if(h)c.createCopy(packetDesc(1-c.p,h));}});
define('01PZ051',{spellDamageBonus:1});
define('01PZ055',{cardDrawn:c=>c.buff(own(c),1,0,true)});
spell('01PZ060','none',c=>{if(playedCount(c)>=15)c.summon('01PZ033T1');});

// Targeted unit Play abilities may be skipped; their costs remain mandatory.
for(const id of ['01DE003','01DE009','01FR011','01FR036','01NX005','01NX046']){
 const r=RULES[id];define(id,{...r,targetOptional:true,play:c=>{if(c.t?.u)r.play(c);}});
}
define('01IO056',{targetCount:{type:'enemyUnit',min:0,max:2,distinct:true},resolvePartialTargets:true,skill:'play',skillId:'01IO056T1',play:c=>selected(c).forEach(t=>c.stun(t))});
spell('01FR042','none',c=>selected(c).forEach(t=>c.freeze(t)),{targetCount:{type:'enemyUnit',min:1,max:2,distinct:true,requireMaximum:true},resolvePartialTargets:true});
spell('01PZ031','none',c=>{selected(c).forEach(t=>c.damage(t,1));c.draw(1);},{targetCount:{type:'enemy',min:1,max:2,distinct:true,requireMaximum:true},resolvePartialTargets:true});

// Multi-ally grants resolve on each remaining target and can be played with
// only one ally on board. Selection still uses every available slot, up to two.
for(const [id,a,h,temp] of [['01FR010',0,3,false],['01DE041',3,3,true],['01NX025',2,0,false]]){
 spell(id,'none',c=>(c.targets||[]).forEach(t=>{if(t)c.buff(t,a,h,temp);}),{targetCount:{type:'ally',min:1,max:2,distinct:true,requireMaximum:true},resolvePartialTargets:true});
}

// Champion spell variants use the normal effect plus one shuffled champion.
for(const [id,base,champ] of [
 ['01IO009T3','01IO039','01IO009'],['01IO015T2','01IO046','01IO015'],
 ['01IO041T2','01IO054','01IO041'],['01NX006T3','01NX047','01NX006'],
 ['01FR024T1','01FR042','01FR024']
]){
 const r=COMPLETION_RULES[base]||RULES[base];define(id,{...r,note:CARDS[id].textEn,championShuffle:champ});
}

// Generated Skill cards retain their concrete effect for data completeness.
// Unit casts enqueue the originating unit's hook and preserve its source.
for(const [id,source,hook] of [
 ['01IO033T1','01IO033','play'],['01NX006T2','01NX006','play'],
 ['01NX006T4','01NX006T1','attack'],['01PZ030T1','01PZ030','play'],
 ['01FR052T1','01FR052','play'],['01IO056T1','01IO056','play'],
 ['01NX046T1','01NX046','play'],['01NX040T1','01NX040','attack'],
 ['01PZ048T1','01PZ048','play'],['01PZ054T1','01PZ054','attack'],
 ['01PZ044T2','01PZ044','play'],['01FR024T2','01FR024','attack'],
 ['01FR024T5','01FR024T3','attack'],['01FR021T1','01FR021','attack'],
 ['01FR036T1','01FR036','play']
]){
 const r=COMPLETION_RULES[source]||RULES[source];
 define(id,{target:r.target||'none',target2:r.target2,targetCount:r.targetCount,targetOptional:r.targetOptional,effect:r[hook]});
}
define('01PZ022',{effect:c=>c.damage(c.core(c.p),1)});
