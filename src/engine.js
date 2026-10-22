// Ember & Tide — original rules implementation, MIT licensed.
export const CARDS = {
  e1:{name:'拾火学徒',f:0,cost:1,atk:2,hp:1,kind:'unit',art:'torch',text:'小小火种，也能照亮长夜。'},
  e2:{name:'灰原斥候',f:0,cost:2,atk:2,hp:2,kind:'unit',kw:['quick'],art:'ranger',text:'先攻'},
  e3:{name:'熔炉卫士',f:0,cost:3,atk:3,hp:4,kind:'unit',art:'shield',text:'以钢铁守护最后一座熔炉。'},
  e4:{name:'烬羽猎鹰',f:0,cost:3,atk:4,hp:2,kind:'unit',kw:['overwhelm'],art:'bird',text:'穿透'},
  e5:{name:'薪王 · 阿烬',f:0,cost:4,atk:4,hp:4,kind:'unit',hero:true,kw:['quick'],art:'crown',text:'先攻。升级：己方累计造成 8 点伤害。升级获得 +1/+1 和穿透。'},
  e6:{name:'荒山巨像',f:0,cost:6,atk:6,hp:6,kind:'unit',kw:['overwhelm'],art:'golem',text:'穿透'},
  e7:{name:'火星迸发',f:0,cost:2,kind:'spell',speed:'fast',effect:'damage',amount:2,target:'enemy',art:'spark',text:'对一个敌军或敌方核心造成 2 点伤害。'},
  e8:{name:'淬火',f:0,cost:1,kind:'spell',speed:'burst',effect:'buff',amount:2,target:'ally',art:'blade',text:'本轮给予一个友军 +2/+0。'},
  e9:{name:'熔岩落雨',f:0,cost:4,kind:'spell',speed:'slow',effect:'rain',target:'none',art:'meteor',text:'对所有敌军造成 2 点伤害。'},
  e10:{name:'余烬再燃',f:0,cost:3,kind:'spell',speed:'fast',effect:'damage',amount:3,target:'enemyUnit',art:'flame',text:'对一个敌军造成 3 点伤害。'},
  t1:{name:'礁岸哨兵',f:1,cost:1,atk:1,hp:3,kind:'unit',art:'spear',text:'潮水会记住每一次入侵。'},
  t2:{name:'拾贝行者',f:1,cost:2,atk:2,hp:3,kind:'unit',art:'shell',text:'贝壳里藏着远方的回声。'},
  t3:{name:'雾海巡卫',f:1,cost:3,atk:3,hp:3,kind:'unit',kw:['regen'],art:'lighthouse',text:'再生'},
  t4:{name:'深流巨龟',f:1,cost:4,atk:2,hp:6,kind:'unit',art:'turtle',text:'背负旧城的最后一块石碑。'},
  t5:{name:'潮语者 · 澜',f:1,cost:4,atk:3,hp:5,kind:'unit',hero:true,kw:['regen'],art:'moon',text:'再生。升级：己方累计恢复 6 点生命。升级获得 +1/+2。'},
  t6:{name:'苍海鲸灵',f:1,cost:7,atk:7,hp:7,kind:'unit',kw:['overwhelm'],art:'whale',text:'穿透'},
  t7:{name:'回潮',f:1,cost:2,kind:'spell',speed:'fast',effect:'heal',amount:3,target:'allyAny',art:'wave',text:'为一个友军或己方核心恢复 3 点生命。'},
  t8:{name:'潮汐庇护',f:1,cost:2,kind:'spell',speed:'burst',effect:'health',amount:3,target:'ally',art:'orb',text:'本轮给予一个友军 +0/+3。'},
  t9:{name:'星泉补给',f:1,cost:3,kind:'spell',speed:'slow',effect:'draw',target:'none',art:'stars',text:'抽 2 张牌。'},
  t10:{name:'寒流',f:1,cost:3,kind:'spell',speed:'fast',effect:'freeze',target:'enemyUnit',art:'ice',text:'本轮将一个敌军的攻击力设为 0。'}
};
export const FACTIONS=['赤烬议会','潮汐守望'];
const fail=(m)=>{throw new Error(m);};
const card=(u)=>CARDS[u.card];
export const attack=(u)=>u.frozen?0:Math.max(0,u.atk+u.tempAtk);
export const keywords=(u)=>[...(card(u).kw||[]),...(u.level&&u.card==='e5'?['overwhelm']:[])];
function log(g,s){g.log.push(s);g.log=g.log.slice(-60);}
function shuffled(a,rng){for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function createGame(rng=Math.random){
 let id=0; const players=[0,1].map(f=>({f,hp:20,mana:1,bank:0,damage:0,healing:0,leveled:false,board:[],hand:[],deck:shuffled(Object.keys(CARDS).filter(k=>CARDS[k].f===f).flatMap(k=>Array.from({length:3},()=>({card:k,uid:'c'+(++id)}))),rng)}));
 const g={players,round:1,attacker:0,token:true,priority:0,passes:0,phase:'main',stack:[],combat:null,winner:null,log:[],version:0};
 players.forEach((_,p)=>draw(g,p,4));log(g,'第 1 轮 · 赤烬议会获得进攻令牌');return g;
}
function draw(g,p,n){for(let i=0;i<n;i++){const s=g.players[p];if(!s.deck.length){g.winner=1-p;log(g,FACTIONS[p]+'牌库耗尽');break;}const c=s.deck.shift();if(s.hand.length<10)s.hand.push(c);else log(g,FACTIONS[p]+'的手牌已满，抽到的牌被弃置');}}
function findUnit(g,id){for(let p=0;p<2;p++){const u=g.players[p].board.find(u=>u.uid===id);if(u)return {p,u};}return null;}
function target(g,id){if(id==='core0'||id==='core1')return {p:Number(id[4]),core:true};return findUnit(g,id);}
function validTarget(g,p,c,id){if(c.target==='none')return id==null;const t=target(g,id);if(!t)return false;if(c.target==='enemy')return t.p!==p;if(c.target==='enemyUnit')return t.p!==p&&!t.core;if(c.target==='ally')return t.p===p&&!t.core;if(c.target==='allyAny')return t.p===p;return false;}
function damage(g,p,t,n){if(!t||n<=0)return;const s=g.players[t.p];const before=t.core?s.hp:t.u.hp;const actual=Math.min(Math.max(0,before),n);if(t.core)s.hp-=n;else t.u.hp-=n;g.players[p].damage+=actual;}
function heal(g,p,t,n){if(!t)return;const s=g.players[t.p];const before=t.core?s.hp:t.u.hp;const cap=t.core?20:t.u.maxHp;const after=Math.min(cap,before+n);if(t.core)s.hp=after;else t.u.hp=after;g.players[p].healing+=Math.max(0,after-before);}
function settle(g){
 g.players.forEach((s,p)=>{
   s.board=s.board.filter(u=>u.hp>0);
   if(!s.leveled&&(p===0?s.damage>=8:s.healing>=6)){s.leveled=true;log(g,FACTIONS[p]+'的英雄已升级！');}
   if(s.leveled)for(const u of s.board)if(card(u).hero&&!u.level){u.level=true;u.atk++;u.maxHp+=p===0?1:2;u.hp+=p===0?1:2;}
 });
 if(g.players[0].hp<=0&&g.players[1].hp<=0)g.winner='draw';else if(g.players[0].hp<=0)g.winner=1;else if(g.players[1].hp<=0)g.winner=0;
 if(g.winner!==null)log(g,g.winner==='draw'?'双方核心同时破碎 · 平局':FACTIONS[g.winner]+'获胜');
}
function spell(g,item){
 const {p,cid,tid}=item,c=CARDS[cid],t=target(g,tid);
 if(c.target!=='none'&&!validTarget(g,p,c,tid)){log(g,c.name+'的目标已离场，法术失效');return;}
 if(c.effect==='damage')damage(g,p,t,c.amount);
 if(c.effect==='heal')heal(g,p,t,c.amount);
 if(c.effect==='buff')t.u.tempAtk+=c.amount;
 if(c.effect==='health'){t.u.maxHp+=c.amount;t.u.hp+=c.amount;t.u.tempHp+=c.amount;}
 if(c.effect==='freeze')t.u.frozen=true;
 if(c.effect==='rain')for(const u of g.players[1-p].board)damage(g,p,{p:1-p,u},2);
 if(c.effect==='draw')draw(g,p,2);
 log(g,c.name+'结算');settle(g);
}
function pay(s,n,isSpell){const bank=isSpell?Math.min(s.bank,n):0;if(s.mana+s.bank*(isSpell?1:0)<n)fail('法力不足');s.bank-=bank;s.mana-=n-bank;}
function nextRound(g){
 g.round++;g.attacker=1-g.attacker;g.token=true;g.priority=g.attacker;g.passes=0;g.phase='main';
 g.players.forEach((s,p)=>{s.bank=Math.min(3,s.bank+s.mana);s.mana=Math.min(10,g.round);for(const u of s.board){u.tempAtk=0;u.maxHp-=u.tempHp;u.hp=Math.min(u.hp,u.maxHp);u.tempHp=0;u.frozen=false;if(keywords(u).includes('regen'))heal(g,p,{p,u},u.maxHp);}draw(g,p,1);});
 settle(g);log(g,'第 '+g.round+' 轮 · '+FACTIONS[g.attacker]+'获得进攻令牌');
}
function fight(g){
 const co=g.combat,def=1-co.p;log(g,'战斗结算');
 for(const lane of co.lanes){
  const a=findUnit(g,lane.attacker)?.u;if(!a)continue;const b=findUnit(g,lane.blocker)?.u;const aa=attack(a);
  if(!b){if(!lane.blocker||keywords(a).includes('overwhelm'))damage(g,co.p,{p:def,core:true},aa);continue;}
  const ba=attack(b),bh=Math.max(0,b.hp);
  damage(g,co.p,{p:def,u:b},aa);
  if(!keywords(a).includes('quick')||b.hp>0)damage(g,def,{p:co.p,u:a},ba);
  if(keywords(a).includes('overwhelm'))damage(g,co.p,{p:def,core:true},Math.max(0,aa-bh));
 }
 g.combat=null;g.phase='main';g.priority=def;g.passes=0;settle(g);
}
export function act(state,p,a){
 const g=structuredClone(state);if(!a||typeof a.type!=='string')fail('无效操作');if(g.winner!==null)fail('对局已结束');if(p!==g.priority)fail('尚未轮到你行动');const s=g.players[p];
 if(a.type==='surrender'){g.winner=1-p;log(g,FACTIONS[p]+'认输');}
 else if(a.type==='play'){
  const idx=s.hand.findIndex(x=>x.uid===a.uid);if(idx<0)fail('手牌不存在');const h=s.hand[idx],c=card(h);
  if(c.kind==='unit'){
   if(g.phase!=='main'||g.stack.length)fail('当前无法召唤单位');if(s.board.length>=6)fail('战场最多容纳 6 个单位');pay(s,c.cost,false);s.hand.splice(idx,1);
   s.board.push({...h,atk:c.atk,hp:c.hp,maxHp:c.hp,tempAtk:0,tempHp:0,frozen:false,level:false});log(g,FACTIONS[p]+'召唤了'+c.name);g.priority=1-p;g.passes=0;settle(g);
  }else{
   if(g.phase==='block')fail('请先安排阻挡');if(c.speed==='slow'&&(g.phase!=='main'||g.stack.length))fail('慢速法术只能在空闲行动阶段使用');
   if(g.stack.length>=16)fail('响应链已满');if(!validTarget(g,p,c,a.target??null))fail('请选择合法目标');pay(s,c.cost,true);s.hand.splice(idx,1);const item={p,cid:h.card,tid:a.target??null};log(g,FACTIONS[p]+'施放了'+c.name);
   g.passes=0;if(c.speed==='burst')spell(g,item);else{g.stack.push(item);g.priority=1-p;}
  }
 }else if(a.type==='attack'){
   if(g.phase!=='main'||g.stack.length||p!==g.attacker||!g.token)fail('现在无法发起进攻');
   const ids=a.units;if(!Array.isArray(ids)||!ids.length||ids.length>6||new Set(ids).size!==ids.length||ids.some(id=>!s.board.some(u=>u.uid===id)))fail('请选择进攻单位');
   g.token=false;g.phase='block';g.combat={p,lanes:ids.map(id=>({attacker:id,blocker:null}))};g.priority=1-p;g.passes=0;log(g,FACTIONS[p]+'派出 '+ids.length+' 个单位进攻');
 }else if(a.type==='block'){
   if(g.phase!=='block')fail('当前不是阻挡阶段');const assignments=a.assignments;if(!assignments||typeof assignments!=='object'||Array.isArray(assignments))fail('无效阻挡');const ids=Object.values(assignments);if(new Set(ids).size!==ids.length)fail('一个单位只能阻挡一条战线');
   for(const [att,bl] of Object.entries(assignments)){if(!g.combat.lanes.some(l=>l.attacker===att)||!s.board.some(u=>u.uid===bl))fail('阻挡单位无效');}
   g.combat.lanes.forEach(l=>l.blocker=assignments[l.attacker]||null);g.phase='combat';g.priority=g.combat.p;g.passes=0;log(g,FACTIONS[p]+'确认阻挡，双方可以施放快速或瞬发法术');
 }else if(a.type==='pass'){
   if(g.phase==='block')fail('请确认阻挡');g.passes++;g.priority=1-p;log(g,FACTIONS[p]+'让过');
   if(g.passes>=2){if(g.stack.length){while(g.stack.length&&g.winner===null)spell(g,g.stack.pop());g.stack=[];g.passes=0;g.priority=g.combat?g.combat.p:g.attacker;}else if(g.phase==='combat')fight(g);else nextRound(g);}
 }else fail('未知操作');g.version++;return g;
}
export function view(g,p){const v=structuredClone(g);v.players.forEach((s,i)=>{s.deckCount=s.deck.length;delete s.deck;s.handCount=s.hand.length;if(i!==p)s.hand=Array.from({length:s.handCount},()=>({hidden:true}));});return v;}
