import {createGame, act, view, deckValidation, PRESETS} from '../src/engine.js';
import {ASSETS} from '../src/assets.js';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const token=()=>crypto.randomUUID()+crypto.randomUUID();
const code=()=>Array.from(crypto.getRandomValues(new Uint8Array(4)),x=>x.toString(16).padStart(2,'0')).join('').toUpperCase();
function roomView(r,t){if(r.game.schema!==3)throw new Error('旧版本房间已结束，请重新创建房间');const p=r.tokens.indexOf(t);if(p<0)throw new Error('房间凭证无效');return {code:r.code,seat:p,ready:!!r.tokens[1],game:view(r.game,p)};}
async function load(env,id){const row=await env.DB.prepare('SELECT data, version FROM rooms WHERE code = ?').bind(id).first();if(!row)throw new Error('房间不存在');return {r:JSON.parse(row.data),version:row.version};}
export default {async fetch(req,env){
 const url=new URL(req.url),path=url.pathname;
 if(req.method==='GET'&&ASSETS[path]){const a=ASSETS[path];return new Response(a.body,{headers:{'Content-Type':a.type,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});}
 if(!path.startsWith('/api/'))return new Response('Not found',{status:404});
 try{
  if(!env.DB)return json({error:'房间服务尚未配置；请使用同屏对战。'},503);
  if(req.method==='GET'&&path.startsWith('/api/rooms/')){const {r}=await load(env,path.split('/').pop().toUpperCase());return json(roomView(r,(req.headers.get('Authorization')||'').replace('Bearer ','')));}
  if(req.method!=='POST')return json({error:'Method not allowed'},405);
  if(Number(req.headers.get('content-length'))>16000)return json({error:'请求过大'},413);
  const raw=await req.text();if(raw.length>16000)return json({error:'请求过大'},413);const b=JSON.parse(raw);
  if(path==='/api/rooms'){
   const deck=b.deck||PRESETS[0].deck;const error=deckValidation(deck);if(error)throw new Error(error);const decks=[deck,PRESETS[1].deck];const r={code:code(),tokens:[token(),null],decks,game:createGame(Math.random,{decks})};
   await env.DB.prepare('INSERT INTO rooms (code,data,version) VALUES (?,?,0)').bind(r.code,JSON.stringify(r)).run();return json({...roomView(r,r.tokens[0]),token:r.tokens[0]});
  }
  if(!/^[0-9A-F]{8}$/.test(String(b.code).toUpperCase()))throw new Error('请输入 8 位房间码');
  const {r,version}=await load(env,String(b.code).toUpperCase());
  if(path==='/api/join'){
   if(r.tokens[1])throw new Error('房间已有两位玩家');if(r.game.schema!==3)throw new Error('请创建新版房间');const deck=b.deck||PRESETS[1].deck;const error=deckValidation(deck);if(error)throw new Error(error);r.decks[1]=deck;r.game=createGame(Math.random,{decks:r.decks});r.tokens[1]=token();
   const res=await env.DB.prepare('UPDATE rooms SET data = ?, version = version + 1 WHERE code = ? AND version = ?').bind(JSON.stringify(r),r.code,version).run();
   if(!res.meta.changes)return json({error:'房间状态已更新，请重试'},409);return json({...roomView(r,r.tokens[1]),token:r.tokens[1]});
  }
  if(path==='/api/action'){
   const t=(req.headers.get('Authorization')||'').replace('Bearer ','');const p=r.tokens.indexOf(t);if(p<0)throw new Error('房间凭证无效');if(!r.tokens[1])throw new Error('等待另一位玩家加入');if(b.version!==r.game.version)return json({error:'牌桌已更新，请重试'},409);
   r.game=act(r.game,p,b.action);
   const res=await env.DB.prepare('UPDATE rooms SET data = ?, version = version + 1 WHERE code = ? AND version = ?').bind(JSON.stringify(r),r.code,version).run();
   if(!res.meta.changes)return json({error:'操作冲突，请刷新牌桌后重试'},409);return json(roomView(r,t));
  }
  return json({error:'Not found'},404);
 }catch(e){return json({error:e.message||'请求失败'},400);}
}};
