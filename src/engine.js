// Independent Foundations rules engine. Riot card data/art have separate ownership.
import {CARDS as RAW_CARDS, REGIONS, PRESETS, DATASET} from './cards.js';
import {RULES} from './rules.js';
import {ADVANCED_RULES} from './advanced-rules.js';
export {REGIONS, PRESETS, DATASET};
const rules={...RULES,...ADVANCED_RULES};
export const CARDS=Object.fromEntries(Object.entries(RAW_CARDS).map(([id,c])=>[id,{...c,supported:!!rules[id]&&rules[id].implemented!==false,unsupportedReason:rules[id]?.reason,discard:rules[id]?.discard,target:rules[id]?.target||'none',target2:rules[id]?.target2,targetOptional:rules[id]?.targetOptional,options:rules[id]?.options}]));
export const FACTIONS=PRESETS.map(p=>p.name);
export const cardSupported=id=>!!rules[id]&&rules[id].implemented!==false;
const fail=m=>{throw new Error(m);};
const data=u=>CARDS[u.card];
const baseId=id=>{const c=CARDS[id];if(!c?.hero)return id;return Object.values(CARDS).find(x=>x.hero&&x.collectible&&x.nameEn===c.nameEn)?.id||id;};
const descriptor=(p,u)=>({p,u});
const self=(g,id)=>{for(let p=0;p<2;p++){const u=g.players[p].board.find(u=>u.uid===id);if(u)return descriptor(p,u);}return null;};
const core=p=>({p,core:true});
function target(g,id){return id==='core0'?core(0):id==='core1'?core(1):self(g,id);}
function log(g,s){g.log.push(s);g.log=g.log.slice(-70);}
function rng(g){g.seed=(Math.imul(g.seed,1664525)+1013904223)>>>0;return g.seed/4294967296;}
function random(g,a){return a.length?a[Math.floor(rng(g)*a.length)]:null;}
function shuffle(g,a){for(let i=a.length-1;i>0;i--){const j=Math.floor(rng(g)*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function packet(g,id){return {card:id,uid:'c'+(++g.serial),costDelta:0,atkBonus:0,hpBonus:0,kwBonus:[],puffcaps:0};}
export function deckValidation(deck){
 if(!Array.isArray(deck)||deck.length!==40)return '牌组必须包含 40 张牌';const counts={},regions=new Set();let heroes=0;
 for(const id of deck){const c=CARDS[id];if(!c?.collectible||!cardSupported(id))return '牌组含未实现或不可收集的卡牌：'+(c?.name||id);counts[id]=(counts[id]||0)+1;if(counts[id]>3)return '同名卡牌最多 3 张';if(c.hero)heroes++;regions.add(c.region);}
 if(heroes>6)return '英雄牌最多 6 张';if(regions.size>2)return '牌组最多使用两个地区';return null;
}
export function createGame(randomSource=Math.random,options={}){
 const decks=options.decks||PRESETS.map(p=>p.deck);for(const deck of decks){const e=deckValidation(deck);if(e)fail(e);}
 const g={schema:2,serial:0,seed:(randomSource()*4294967296)>>>0,version:0,round:0,attacker:0,token:false,priority:0,passes:0,phase:'mulligan',mulligans:[false,false],stack:[],combat:null,stackOwner:null,winner:null,log:[],settling:false};
 g.attacker=rng(g)<.5?0:1;g.roundOwner=g.attacker;g.tokens=[false,false];
 g.players=decks.map((deck,p)=>({f:p,name:options.names?.[p]||FACTIONS[p],regions:[...new Set(deck.map(id=>CARDS[id].region))],hp:20,mana:0,maxMana:0,bank:0,damage:0,healing:0,damageDealt:0,nexusDamage:0,roundDeaths:0,unitsDied:0,spellsPlayed:0,spellManaSpent:0,attacks:0,targets:0,stunsRecalls:0,puffcapsPlanted:0,eliteSummons:0,levels:{},grave:[],board:[],hand:[],deck:shuffle(g,deck.map(id=>packet(g,id)))}));
 g.players.forEach((_,p)=>draw(g,p,4));log(g,'基础卡池 · 选择要替换的起手牌');return g;
}
export function keywords(u,g){
 if(u.silenced)return [...new Set([...u.kw,...u.tempKw])];let ks=[...(data(u)?.kw||[]),...(u.kw||[]),...(u.tempKw||[])].filter(k=>!u.removedKw?.includes(k));
 if(g){const p=g.players.findIndex(s=>s.board.includes(u));if(p>=0&&data(u)?.subtypes?.includes('SPIDER')&&g.players[p].board.some(x=>data(x).nameEn==='Spider Queen Elise'&&!x.silenced&&x!==u))ks.push('Challenger','Fearsome');}
 return [...new Set(ks)];
}
export function attack(u,g){let n=Math.max(0,u.atk+(u.tempAtk||0));if(g){const p=g.players.findIndex(s=>s.board.includes(u));if(p>=0&&keywords(u,g).includes('Ephemeral'))n+=g.players[p].ephemeralAura||0;}return n;}
const has=(g,u,k)=>keywords(u,g).includes(k);
function trigger(g,p,u,name,t=null,t2=null,event=null,extra={}){
 if(!u||u.silenced)return;const f=rules[u.card]?.[name];if(typeof f==='function')f(context(g,p,u,t,t2,event,extra));
}
function emit(g,name,event,extra={}){for(let p=0;p<2;p++)for(const u of [...g.players[p].board])if(u.hp>0)trigger(g,p,u,name,null,null,event,extra);}
function sideEmit(g,p,name,event,extra={}){for(const u of [...g.players[p].board])if(u.hp>0)trigger(g,p,u,name,null,null,event,extra);}
function levelVariant(id){const c=CARDS[id];return (c?.associated||[]).find(code=>CARDS[code]?.hero&&!CARDS[code].collectible&&CARDS[code].nameEn===c.nameEn)||null;}
function level(g,p,u){if(u.level||u.silenced)return;const id=levelVariant(u.card);if(!id)return;const old=data(u),next=CARDS[id];u.baseCard=baseId(u.card);u.card=id;u.level=true;u.atk+=next.atk-old.atk;u.maxHp+=next.hp-old.hp;u.hp+=next.hp-old.hp;g.players[p].levels[u.baseCard]=true;log(g,old.name+'升级');trigger(g,p,u,'levelUp');trigger(g,p,u,'onLevel');}
function handChanged(g,p){const handSize=g.players[p].hand.length;sideEmit(g,p,'handChanged',{handSize});champions(g);}
function addHand(g,p,id,n=1){let first=null;for(let i=0;i<n;i++){if(!CARDS[id]||!cardSupported(id))return first;if(g.players[p].hand.length>=10){log(g,'手牌已满，生成牌被弃置');continue;}const h=packet(g,id);h.fleeting=CARDS[id].kw.includes('Fleeting');g.players[p].hand.push(h);first??=h;}handChanged(g,p);return first;}
function draw(g,p,n,filter){
 const s=g.players[p],drawn=[];
 for(let i=0;i<n&&g.winner===null;i++){
  const idx=filter?s.deck.findIndex(h=>filter(CARDS[h.card],h)):0;if(idx<0)break;
  if(!s.deck.length){g.winner=1-p;log(g,s.name+'无法抽牌，败北');break;}
  const h=s.deck.splice(idx,1)[0];if(h.puffcaps){damage(g,1-p,core(p),h.puffcaps);h.puffcaps=0;}
  if(s.hand.length<10){s.hand.push(h);drawn.push(h);}else log(g,s.name+'手牌已满，抽到的牌被弃置');
 }
 handChanged(g,p);return drawn;
}
function grant(g,t,k,temp=false){if(!t?.u)return;const u=t.u;const before=has(g,u,k);const arr=temp?u.tempKw:u.kw;if(!arr.includes(k))arr.push(k);u.removedKw=(u.removedKw||[]).filter(x=>x!==k);if(k==='Barrier'&&!before)sideEmit(g,t.p,'barrierGranted',t);}
function buff(g,t,a,h,temp=false){if(!t?.u)return;const u=t.u;if(temp){u.tempAtk+=a;u.tempHp+=h;}else u.atk+=a;u.maxHp+=h;u.hp+=h;}
function heal(g,p,t,n){if(!t||n<=0)return 0;const s=g.players[t.p];const before=t.core?s.hp:t.u.hp,cap=t.core?20:t.u.maxHp,amount=Math.max(0,Math.min(n,cap-before));if(t.core)s.hp+=amount;else t.u.hp+=amount;g.players[p].healing+=amount;return amount;}
function damage(g,p,t,n,sourceUnit=null){
 if(!t||n<=0||g.winner!==null)return 0;let dealt=n;
 if(!t.core){const u=t.u;if(u.hp<=0)return 0;if(has(g,u,'Barrier')){u.removedKw=[...(u.removedKw||[]),'Barrier'];u.kw=u.kw.filter(k=>k!=='Barrier');u.tempKw=u.tempKw.filter(k=>k!=='Barrier');return 0;}if(has(g,u,'Tough'))dealt=Math.max(0,dealt-1);}
 const s=g.players[t.p],before=t.core?s.hp:t.u.hp,actual=Math.min(Math.max(0,before),dealt);
 if(t.core)s.hp-=dealt;else{t.u.hp-=dealt;t.u.damageTaken+=actual;if(t.u.hp<=0&&sourceUnit)sourceUnit.kills++;}
 g.players[p].damage+=actual;g.players[p].damageDealt+=actual;if(t.core)g.players[p].nexusDamage+=actual;
 if(sourceUnit&&has(g,sourceUnit,'Lifesteal'))heal(g,p,core(p),actual);
 if(!t.core&&actual>0){trigger(g,t.p,t.u,'damaged',t,null,t,{amount:actual});sideEmit(g,t.p,'allyDamaged',t,{amount:actual});if(t.u.hp>0)g.players[t.p].damageSurvivors=(g.players[t.p].damageSurvivors||0)+1;}
 return actual;
}
function makeUnit(g,p,h){const c=CARDS[h.card];return {...h,baseCard:baseId(h.card),atk:c.atk+(h.atkBonus||h.atkBuff||0),hp:c.hp+(h.hpBonus||h.hpBuff||0),maxHp:c.hp+(h.hpBonus||h.hpBuff||0),tempAtk:0,tempHp:0,kw:[...c.kw,...(h.kwBonus||[])],tempKw:[],removedKw:[],silenced:false,stunned:false,frozen:false,strikes:0,kills:0,damageTaken:0,seenDeaths:0,level:!!(c.hero&&!c.collectible),flags:{},summonedRound:g.round};}
function summon(g,p,id,h=null){if(g.players[p].board.length>=6||!CARDS[id])return null;h??=packet(g,id);const u=makeUnit(g,p,h);g.players[p].board.push(u);if(g.players[p].levels[baseId(id)]&&!u.level)level(g,p,u);if(data(u).subtypes.includes('ELITE'))g.players[p].eliteSummons++;trigger(g,p,u,'summon');sideEmit(g,p,'allySummoned',descriptor(p,u));if(has(g,u,'Barrier'))sideEmit(g,p,'barrierGranted',descriptor(p,u));if(data(u).subtypes.includes('TECH'))for(const h of g.players[p].board)if(data(h).nameEn==='Heimerdinger'&&!h.silenced)h.seenTechPower=(h.seenTechPower||0)+attack(u,g);return descriptor(p,u);}
function kill(g,t){if(t?.u){t.u.hp=0;t.u.destroyed=true;}}
function recall(g,p,t){if(!t?.u)return;const s=g.players[t.p];s.board=s.board.filter(u=>u.uid!==t.u.uid);if(s.hand.length<10)s.hand.push(packet(g,baseId(t.u.card)));g.players[p].stunsRecalls++;emit(g,'unitRecalled',t);handChanged(g,t.p);}
function silence(g,t){if(!t?.u)return;const u=t.u,c=data(u),missing=u.maxHp-u.hp;u.silenced=true;u.atk=c.atk;u.maxHp=c.hp;u.hp=Math.max(1,c.hp-missing);u.tempAtk=0;u.tempHp=0;u.kw=[];u.tempKw=[];u.removedKw=[];u.stunned=false;u.frozen=false;}
function transform(g,t,id){if(!t?.u||!CARDS[id])return;const nu=makeUnit(g,t.p,{...packet(g,id),uid:t.u.uid});Object.assign(t.u,nu);}
function stun(g,p,t){if(!t?.u)return;t.u.stunned=true;g.players[p].stunsRecalls++;emit(g,'unitStunned',t);}
function freeze(g,p,t){if(!t?.u)return;if(attack(t.u,g)>0)g.players[p].frostbites=(g.players[p].frostbites||0)+1;t.u.tempAtk-=attack(t.u,g);t.u.frozen=true;}
function createInDeck(g,p,id,n=1,position='shuffle',exactInstance=null){for(let i=0;i<n;i++){const h=exactInstance?{...structuredClone(exactInstance),uid:'c'+(++g.serial)}:packet(g,id),s=g.players[p];const idx=position==='top'?0:position==='top3'?Math.floor(rng(g)*Math.min(3,s.deck.length+1)):Math.floor(rng(g)*(s.deck.length+1));s.deck.splice(idx,0,h);}}
function plant(g,p,n){const deck=g.players[1-p].deck;if(!deck.length)return;for(let i=0;i<n;i++)random(g,deck).puffcaps++;g.players[p].puffcapsPlanted+=n;}
function strike(g,a,t,fixedAttack=null){if(!a?.u||!t||(a.u.hp<=0&&fixedAttack===null))return;const n=fixedAttack??attack(a.u,g);if(n<=0)return;damage(g,a.p,t,n,a.u);a.u.strikes++;trigger(g,a.p,a.u,'strike',t,null,t);if(t.core)trigger(g,a.p,a.u,'nexusStrike',t);if(has(g,a.u,'Ephemeral'))kill(g,a);}
function context(g,p,u,t=null,t2=null,event=null,extra={}){return {
 g,p,u,settle:()=>settle(g),self:u?descriptor(p,u):null,t,t2,event,player:g.players[p],opponent:g.players[1-p],choice:extra.choice??'attack',...extra,
 card:id=>CARDS[id],cards:CARDS,hand:()=>g.players[p].hand,
 allies:()=>g.players[p].board.map(u=>descriptor(p,u)),enemies:()=>g.players[1-p].board.map(u=>descriptor(1-p,u)),core,
 attackingAllies:()=>g.combat?.p===p?g.combat.lanes.map(l=>self(g,l.attacker)).filter(d=>d&&!d.u.stunned):[],
 battling:()=>g.combat?g.combat.lanes.flatMap(l=>[self(g,l.attacker),self(g,l.blocker)]).filter(d=>d&&!d.u.stunned):[],
 damage:(t,n)=>{const before=t?.u?.hp;const dealt=damage(g,p,t,n,u);if(extra.spellCard&&CARDS[extra.spellCard]?.kw.includes('SpellOverwhelm')&&t?.u&&n>before)damage(g,p,core(t.p),n-before);return dealt;},heal:(t,n)=>heal(g,p,t,n),buff:(t,a,h,temp=false)=>buff(g,t,a,h,temp),grant:(t,k,temp=false)=>grant(g,t,k,temp),
 draw:(n,filter)=>draw(g,p,n,filter),summon:(id)=>summon(g,p,id),create:(id,n)=>addHand(g,p,id,n),
 kill:t=>kill(g,t),recall:t=>recall(g,p,t),silence:t=>silence(g,t),stun:t=>stun(g,p,t),freeze:t=>freeze(g,p,t),
 rally:()=>{g.tokens[p]=true;g.token=g.tokens[g.attacker];},mana:n=>{g.players[p].maxMana=Math.min(10,g.players[p].maxMana+n);g.players[p].mana=Math.min(g.players[p].maxMana,g.players[p].mana+n);},refillSpellMana:(n=3)=>{g.players[p].bank=Math.min(3,g.players[p].bank+n);},
 discard:uid=>{const s=g.players[p],i=s.hand.findIndex(h=>h.uid===uid);if(i<0)fail('请选择要弃置的手牌');const h=s.hand.splice(i,1)[0];const f=rules[h.card]?.discarded;if(f)f(context(g,p,h,null,null,h));handChanged(g,p);return h;},
 swap:(a,b)=>{if(!a?.u||!b?.u||a.p!==b.p)return;const board=g.players[a.p].board,i=board.findIndex(u=>u.uid===a.u.uid),j=board.findIndex(u=>u.uid===b.u.uid);if(i<0||j<0)return;[board[i],board[j]]=[board[j],board[i]];if(g.combat)for(const lane of g.combat.lanes)for(const field of ['attacker','blocker']){if(lane[field]===a.u.uid)lane[field]=b.u.uid;else if(lane[field]===b.u.uid)lane[field]=a.u.uid;}},
 transform:(t,id)=>transform(g,t,id),randomCard:filter=>{const pool=Object.values(CARDS).filter(c=>c.collectible&&cardSupported(c.id)&&(!filter||filter(c)));return random(g,pool)?.id;},random:a=>random(g,a),
 level:()=>level(g,p,u),strike:(a,t,n)=>strike(g,a,t,n),createInDeck:(id,n,pos,exact)=>createInDeck(g,p,id,n,pos,exact),plant:n=>plant(g,p,n)
 };}
function champions(g){for(let p=0;p<2;p++){const s=g.players[p];for(const u of [...s.board]){if(u.silenced||!data(u).hero)continue;const name=CARDS[u.baseCard]?.nameEn||data(u).nameEn;
 if(!u.level){
  if(name==='Garen'&&u.strikes>=2||name==='Darius'&&g.players[1-p].hp<=10||name==='Braum'&&u.damageTaken>=10||name==='Jinx'&&s.hand.length===0||name==='Fiora'&&u.kills>=2||name==='Karma'&&s.maxMana===10||name==='Anivia'&&s.maxMana===10||name==='Teemo'&&s.puffcapsPlanted>=15||name==='Ezreal'&&s.targets>=8||name==='Yasuo'&&s.stunsRecalls>=5||name==='Kalista'&&u.seenDeaths>=3||name==='Thresh'&&u.seenDeaths>=6||name==='Lucian'&&(u.seenDeaths>=4||u.flags.sennaDied)||name==='Ashe'&&(s.frostbites||0)>=5||name==='Vladimir'&&(s.damageSurvivors||0)>=5||name==='Heimerdinger'&&(u.seenTechPower||0)>=12)level(g,p,u);
 }
 if(name==='Fiora'&&u.level&&u.kills>=4&&u.hp>0)g.winner=p;
 }} }
function settle(g){
 if(g.settling)return;g.settling=true;
 try{
  let guard=0;while(guard++<100){let dead=[];
   for(let p=0;p<2;p++)for(const u of g.players[p].board)if(u.hp<=0){if(data(u).nameEn==='Tryndamere'&&!u.level&&!u.silenced){level(g,p,u);u.hp=u.maxHp;u.destroyed=false;}else dead.push(descriptor(p,u));}
   if(!dead.length)break;
   for(const d of dead){const s=g.players[d.p];s.board=s.board.filter(u=>u.uid!==d.u.uid);s.roundDeaths++;s.unitsDied++;s.grave.push(structuredClone(d.u));s.grave=s.grave.slice(-100);}
   for(const d of dead){log(g,data(d.u).name+'阵亡');for(let p=0;p<2;p++)for(const u of g.players[p].board){if(p===d.p)u.seenDeaths++;else if(data(u).nameEn==='Thresh')u.seenDeaths++;if(data(u).nameEn==='Lucian'&&p===d.p&&CARDS[d.u.baseCard]?.nameEn==='Senna, Sentinel of Light')u.flags.sennaDied=true;}sideEmit(g,d.p,'allyDied',d);sideEmit(g,1-d.p,'enemyDied',d);trigger(g,d.p,d.u,'lastBreath');}
  }
  champions(g);if(g.winner===null){if(g.players.every(s=>s.hp<=0))g.winner='draw';else if(g.players[0].hp<=0)g.winner=1;else if(g.players[1].hp<=0)g.winner=0;}
 }finally{g.settling=false;}
}
function validTarget(g,p,type,id,source=null){if(type==='none'||!type)return id==null;if(type==='allyHand')return !!g.players[p].hand.find(h=>h.uid===id);const t=target(g,id);if(!t||t.u?.hp<=0)return false;
 if(type==='any')return true;if(type==='unit')return !t.core;if(type==='ally')return t.p===p&&!t.core;if(type==='enemyUnit')return t.p!==p&&!t.core;if(type==='enemy')return t.p!==p;if(type==='allyAny')return t.p===p;if(type==='follower')return !t.core&&!data(t.u).hero;if(type==='enemyFollower')return t.p!==p&&!t.core&&!data(t.u).hero;if(type==='allyDamaged')return t.p===p&&!t.core&&t.u.hp<t.u.maxHp;if(type==='allyHand')return !!g.players[p].hand.find(h=>h.uid===id);return false;
}
function effectiveCard(g,p,h){const c=CARDS[h.card];if(c?.hero&&g.players[p].board.some(u=>baseId(u.card)===baseId(h.card))){const sig=c.associated.find(id=>CARDS[id]?.kind==='spell'&&cardSupported(id));if(sig)return {c:CARDS[sig],id:sig};}const leveled=c?.hero&&g.players[p].levels[baseId(h.card)]?levelVariant(h.card):null;return leveled?{c:CARDS[leveled],id:leveled}:{c,id:h.card};}
function effectiveCost(g,p,h,c){let n=(h.costOverride??c.cost)+(h.costDelta||0);if(c.nameEn==='Remembrance')n-=g.players[p].roundDeaths;if(c.nameEn==='Vanguard Squire')n-=g.players[p].eliteSummons;return Math.max(0,n);}
function pay(s,n,isSpell){const bank=isSpell?Math.min(s.bank,n):0;if(s.mana+bank<n)fail('法力不足');s.bank-=bank;s.mana-=n-bank;}
function enqueue(g,p,id,u,targets,kind='spell',choice='attack',extra={}){if(g.stack.length>=9)fail('响应链最多容纳 9 个法术或技能');if(!g.stack.length)g.stackOwner=p;g.stack.push({p,cid:id,source:u?structuredClone(u):null,targets,tid:targets[0]??null,kind,choice,displayId:rules[id]?.skillId||id,...extra});}
function resolve(g,item){const r=rules[item.cid],c=CARDS[item.cid];if(!r)return;const [a,b]=item.targets||[],t=r.target==='allyHand'?{p:item.p,u:g.players[item.p].hand.find(h=>h.uid===a),hand:true}:target(g,a),t2=target(g,b);if(!r.resolveWithoutTarget&&(r.target&&!validTarget(g,item.p,r.target,a)||r.target2&&!validTarget(g,item.p,r.target2,b))){log(g,c.name+'的目标已失效');return;}
 const src=item.source?(self(g,item.source.uid)?.u||item.source):null,ctx=context(g,item.p,src,t,t2,null,{spellCard:item.cid,choice:item.choice,discarded:item.discarded||[],discardedCount:item.discardedCount||0});
 if(r.validate&&!r.resolveWithoutTarget){const ok=r.validate(ctx);if(ok!==true&&ok!==undefined){log(g,c.name+'的使用条件已失效');return;}}
 if(item.kind==='skill'){const fn=r[item.hook];if(fn)fn(ctx);}else{r.effect?.(ctx);if(r.championShuffle)createInDeck(g,item.p,r.championShuffle);}
 log(g,c.name+'结算');settle(g);
}
function finishChain(g){while(g.stack.length&&g.winner===null)resolve(g,g.stack.pop());g.stack=[];const owner=g.stackOwner;g.stackOwner=null;g.passes=0;if(g.combat){fight(g);}else g.priority=1-(owner??g.priority);}
function startRound(g){g.round++;g.phase='main';g.token=true;if(g.round>1)g.roundOwner=1-g.roundOwner;g.attacker=g.roundOwner;g.tokens=[false,false];g.tokens[g.roundOwner]=true;g.priority=g.roundOwner;g.passes=0;
 for(let p=0;p<2;p++){const s=g.players[p];s.maxMana=Math.min(10,s.maxMana+1);s.mana=s.maxMana;s.roundDeaths=0;draw(g,p,1);}
 for(let p=0;p<2;p++)for(const u of [...g.players[p].board])trigger(g,p,u,'roundStart');settle(g);log(g,'第 '+g.round+' 轮 · '+g.players[g.attacker].name+'获得进攻令牌');}
function endRound(g){for(let p=0;p<2;p++){const s=g.players[p];for(const u of [...s.board])trigger(g,p,u,'roundEnd');}settle(g);
 for(let p=0;p<2;p++){const s=g.players[p];s.bank=Math.min(3,s.bank+s.mana);for(const u of s.board){if(has(g,u,'Ephemeral')){kill(g,descriptor(p,u));continue;}u.tempAtk=0;u.maxHp-=u.tempHp;u.hp=Math.min(u.hp,u.maxHp);u.tempHp=0;u.tempKw=[];u.removedKw=[];u.stunned=false;u.frozen=false;u.flags.roundAttack=false;u.flags.roundDeath=false;if(has(g,u,'Regeneration'))heal(g,p,descriptor(p,u),u.maxHp);if(has(g,u,'Barrier'))u.removedKw.push('Barrier');}s.hand=s.hand.filter(h=>!h.fleeting&&!CARDS[h.card].kw.includes('Fleeting'));}
 settle(g);if(g.winner===null)startRound(g);
}
function legalBlock(g,p,a,b){if(!b||b.stunned||has(g,b,'CantBlock')||has(g,b,'Immobile'))return false;if(has(g,a,'Elusive')&&!has(g,b,'Elusive')&&!has(g,b,'Sharpsight'))return false;if(has(g,a,'Fearsome')&&attack(b,g)<3)return false;if(attack(b,g)===0&&g.players[1-p].board.some(u=>data(u).nameEn==='Ashe'&&u.level&&!u.silenced))return false;return true;}
function fight(g){const co=g.combat;if(!co)return;log(g,'战斗结算');
 for(const lane of co.lanes){const da=self(g,lane.attacker),db=self(g,lane.blocker),a=da?.u,b=db?.u?.stunned?null:db?.u;if(!a||a.hp<=0||a.stunned)continue;
 const hit=()=>{const aa=attack(a,g);if(!b||b.hp<=0){if(!lane.blocker||has(g,a,'Overwhelm'))strike(g,da,core(1-co.p));return;}
 const bh=b.hp,ba=attack(b,g),quick=has(g,a,'QuickStrike')||has(g,a,'DoubleStrike');const canStrike=aa>0;
 damage(g,co.p,db,aa,a);if(canStrike){a.strikes++;trigger(g,co.p,a,'strike',db,null,db);}
 if(has(g,a,'Overwhelm'))damage(g,co.p,core(1-co.p),Math.max(0,aa-bh),a);
 if(!quick||b.hp>0){damage(g,1-co.p,da,ba,b);if(ba>0){b.strikes++;trigger(g,1-co.p,b,'strike',da,null,da);if(has(g,b,'Ephemeral'))kill(g,db);}}
 if(canStrike&&has(g,a,'Ephemeral'))kill(g,da);
 };
 const double=has(g,a,'DoubleStrike');hit();settle(g);if(double&&a.hp>0&&g.winner===null)hit();settle(g);if(g.winner!==null)break;
 }
 g.combat=null;g.phase='main';g.priority=1-co.p;g.passes=0;settle(g);
}
export function act(state,p,a){
 if(state.schema!==2)fail('这是旧版本对局，请创建新房间');const g=structuredClone(state);if(!a||typeof a.type!=='string')fail('无效操作');if(![0,1].includes(p))fail('座位无效');if(g.winner!==null)fail('对局已结束');if(a.type==='surrender'){g.winner=1-p;g.version++;return g;}if(p!==g.priority)fail('尚未轮到你行动');const s=g.players[p];
 if(g.phase==='mulligan'){
  if(a.type!=='mulligan')fail('请先完成起手换牌');const ids=a.cards||[];if(!Array.isArray(ids)||ids.length>4||new Set(ids).size!==ids.length||ids.some(id=>!s.hand.some(h=>h.uid===id)))fail('换牌选择无效');const removed=s.hand.filter(h=>ids.includes(h.uid));s.hand=s.hand.filter(h=>!ids.includes(h.uid));draw(g,p,removed.length);s.deck.push(...removed);shuffle(g,s.deck);g.mulligans[p]=true;log(g,s.name+'完成换牌');if(!g.mulligans[1-p])g.priority=1-p;else startRound(g);g.version++;return g;
 }
 if(a.type==='play'){
  const idx=s.hand.findIndex(h=>h.uid===a.uid);if(idx<0)fail('手牌不存在');const h=s.hand[idx],{c,id}=effectiveCard(g,p,h),r=rules[id];if(!cardSupported(id))fail('这张卡牌的效果尚未实现');
  const discardIds=a.discards||[];if(!Array.isArray(discardIds)||new Set(discardIds).size!==discardIds.length||discardIds.some(uid=>uid===a.uid||!s.hand.some(h=>h.uid===uid)))fail('弃牌选择无效');if(r.discard&&(discardIds.length<r.discard.min||discardIds.length>r.discard.max))fail('请选择正确数量的弃牌');if(r.discard?.requireMaximum&&discardIds.length!==Math.min(r.discard.max,s.hand.length-1))fail('必须弃置可用的最大数量手牌');if(!r.discard&&discardIds.length)fail('此卡不需要弃牌');
  const discarded=discardIds.map(uid=>structuredClone(s.hand.find(h=>h.uid===uid)));
  const ids=[a.target??null,a.target2??null],t=r.target==='allyHand'?{p,u:s.hand.find(h=>h.uid===ids[0]),hand:true}:target(g,ids[0]),t2=target(g,ids[1]);if(!(r.targetOptional&&ids[0]===null)&&!validTarget(g,p,r.target||'none',ids[0])||r.target2&&!validTarget(g,p,r.target2,ids[1]))fail('请选择合法目标');
  const chosen=r.options?.find(x=>(typeof x==='object'?x.id:x)===a.choice);if(r.options&&!chosen)fail('请选择卡牌效果');
  if(r.requires==='singleAlly'&&s.board.length!==1||r.requires==='noUnits'&&s.board.length)fail('未满足卡牌使用条件');
  if(r.validate){const ok=r.validate(context(g,p,null,t,t2,null,{choice:a.choice??'attack',discarded,discardedCount:discardIds.length}));if(ok!==true&&ok!==undefined)fail(typeof ok==='string'?ok:'未满足卡牌使用条件');}
  if(c.kind==='unit'){
   if(g.phase!=='main'||g.stack.length)fail('当前无法召唤单位');if(s.board.length>=6)fail('战场已满：请先腾出位置');if(c.hero&&s.board.some(u=>baseId(u.card)===baseId(c.id)))fail('场上已有同名英雄');pay(s,effectiveCost(g,p,h,c),false);s.hand.splice(idx,1);for(const uid of discardIds)context(g,p,null).discard(uid);const d=summon(g,p,id,h);log(g,s.name+'打出'+c.name);
   if(r.skill==='play'){enqueue(g,p,id,d.u,ids,'skill',a.choice??'attack',{hook:'play',discarded,discardedCount:discarded.length});}else trigger(g,p,d.u,'play',t,t2,null,{choice:a.choice??'attack',discarded,discardedCount:discarded.length});g.priority=1-p;g.passes=0;
  }else{
   if(!['spell','skill'].includes(c.kind))fail('当前无法使用此卡');if((c.speed==='slow'||c.speed==='focus')&&(g.phase!=='main'||g.stack.length))fail('慢速 / 专注法术不能在响应或战斗时使用');
   if(g.stack.length>=9)fail('响应链已满');const n=effectiveCost(g,p,h,c);pay(s,n,true);s.hand.splice(idx,1);for(const uid of discardIds)context(g,p,null).discard(uid);s.spellsPlayed++;s.spellManaSpent+=n;
   if(t?.u&&t.p!==p)s.targets++;if(t2?.u&&t2.p!==p)s.targets++;
   log(g,s.name+'施放'+c.name);const item={p,cid:id,targets:ids,tid:ids[0],kind:'spell',choice:a.choice??'attack',discarded,discardedCount:discardIds.length};
   const event={card:id,uid:h.uid,p,targets:[t,t2].filter(Boolean),cost:n};sideEmit(g,p,'spellPlayed',event);
   if(c.speed==='burst'||c.speed==='focus')resolve(g,item);else {enqueue(g,p,id,null,ids,'spell',a.choice??'attack',{discarded,discardedCount:discardIds.length});if(g.phase!=='block')g.priority=1-p;}
   if(g.combat&&(c.speed==='burst'||c.speed==='focus')){g.combat.burstActed=true;g.combat.defenderActed=true;}
   if(s.board.some(u=>data(u).nameEn==='Karma'&&u.level&&!u.silenced)){if(c.speed==='burst'||c.speed==='focus')resolve(g,item);else enqueue(g,p,id,null,ids,'spell',a.choice??'attack',{discarded,discardedCount:discardIds.length});}
   g.passes=0;
  }
  handChanged(g,p);settle(g);
 }else if(a.type==='attack'){
  if(g.phase!=='main'||g.stack.length||!g.tokens[p])fail('现在无法进攻');const ids=a.units;if(!Array.isArray(ids)||!ids.length||ids.length>6||new Set(ids).size!==ids.length||ids.some(id=>!s.board.some(u=>u.uid===id&&!u.stunned&&!has(g,u,'Immobile'))))fail('进攻单位无效');
  g.tokens[p]=false;g.token=g.tokens[g.attacker];g.phase='block';g.combat={p,lanes:ids.map(id=>({attacker:id,blocker:null,challenged:false}))};
  const used=new Set();for(const [aid,bid]of Object.entries(a.challenges||{})){const at=self(g,aid),bt=self(g,bid);if(!ids.includes(aid)||!at||!bt||bt.p===p||!has(g,at.u,'Challenger')||used.has(bid)||bt.u.stunned||has(g,bt.u,'CantBlock'))fail('挑战目标无效');const l=g.combat.lanes.find(l=>l.attacker===aid);l.blocker=bid;l.challenged=true;used.add(bid);}
  s.attacks++;
  for(let i=0;i<ids.length;i++){const d=self(g,ids[i]);if(!d)continue;const next=self(g,ids[i+1]);if(next)trigger(g,p,d.u,'support',next);if(rules[d.u.card]?.skill==='attack')enqueue(g,p,d.u.card,d.u,[], 'skill',0,{hook:'attack'});else trigger(g,p,d.u,'attack',next);}
  g.priority=1-p;g.passes=0;log(g,s.name+'发起进攻');settle(g);
 }else if(a.type==='block'){
  if(g.phase!=='block'||!g.combat)fail('当前不是阻挡阶段');const assignments=a.assignments;if(!assignments||typeof assignments!=='object'||Array.isArray(assignments))fail('无效阻挡');const used=new Set(g.combat.lanes.filter(l=>l.challenged).map(l=>l.blocker));
  for(const [aid,bid]of Object.entries(assignments)){const l=g.combat.lanes.find(l=>l.attacker===aid);if(!l||l.challenged&&l.blocker!==bid)fail('不能更改挑战指定的阻挡');if(l.challenged)continue;const b=self(g,bid),at=self(g,aid);if(!b||b.p!==p||used.has(bid)||!at||!legalBlock(g,p,at.u,b.u))fail('这个单位无法阻挡此进攻者');used.add(bid);l.blocker=bid;}
  g.phase='combat';g.passes=0;g.priority=g.combat.p;log(g,s.name+'确认阻挡');
  // Declaring blockers itself returns action priority only if an action/skill is pending.
  if(!g.stack.length&&!g.combat.defenderActed)fight(g);
 }else if(a.type==='pass'){
  if(g.phase==='block')fail('请确认阻挡');g.passes++;g.priority=1-p;log(g,s.name+'让过');
  if(g.stack.length){if(g.passes>=1)finishChain(g);}else if(g.phase==='combat'){if(g.combat.burstActed){g.combat.burstActed=false;}else fight(g);}else if(g.passes>=2)endRound(g);
 }else fail('未知操作');g.version++;return g;
}
export function view(state,p){const g=structuredClone(state);delete g.seed;delete g.serial;delete g.settling;
 g.players.forEach((s,i)=>{s.deckCount=s.deck.length;delete s.deck;s.handCount=s.hand.length;if(i!==p)s.hand=Array.from({length:s.handCount},()=>({hidden:true}));else s.hand=s.hand.map(h=>{const {c,id}=effectiveCard(state,p,h);return {...h,card:id,baseCard:h.card,cost:effectiveCost(state,p,h,c)};});});return g;}
