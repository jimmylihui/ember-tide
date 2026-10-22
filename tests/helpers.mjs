import {CARDS,createGame,act,view} from '../src/engine.js';
export function fixture(){const g=createGame(()=>.35);g.phase='main';g.round=5;g.priority=0;g.attacker=0;g.roundOwner=0;g.tokens=[true,false];g.token=true;g.players.forEach(s=>{s.hand=[];s.board=[];s.mana=10;s.maxMana=10;s.bank=3;});return g;}
export function hand(g,p,card,uid=card){const h={card,uid,costDelta:0,atkBonus:0,hpBonus:0,kwBonus:[],puffcaps:0};g.players[p].hand.push(h);return h;}
export function unit(g,p,code,uid=code){const c=CARDS[code],u={card:code,uid,baseCard:code,atk:c.atk,hp:c.hp,maxHp:c.hp,tempAtk:0,tempHp:0,kw:[...c.kw],tempKw:[],removedKw:[],silenced:false,stunned:false,frozen:false,strikes:0,kills:0,damageTaken:0,seenDeaths:0,level:c.hero&&!c.collectible,flags:{},summonedRound:g.round};g.players[p].board.push(u);return u;}
export const pass=g=>act(g,g.priority,{type:'pass'});
export const pass2=g=>pass(pass(g));
export function start(g){g=act(g,0,{type:'mulligan',cards:[]});return act(g,1,{type:'mulligan',cards:[]});}
export function play(g,p,code,target=null,target2=null,extra={}){if(!g.players[p].hand.some(h=>h.uid===code))hand(g,p,code);return act(g,p,{type:'play',uid:code,target,target2,...extra});}
