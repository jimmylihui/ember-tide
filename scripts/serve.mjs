import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,mkdirSync} from 'node:fs';
import worker from '../dist/server/index.js';
mkdirSync(new URL('../.data/',import.meta.url),{recursive:true});
const sqlite=new DatabaseSync(new URL('../.data/rooms.sqlite',import.meta.url).pathname);
sqlite.exec(readFileSync(new URL('../drizzle/0000_rooms.sql',import.meta.url),'utf8').replace('CREATE TABLE rooms','CREATE TABLE IF NOT EXISTS rooms'));
const env={DB:{prepare(sql){return {bind(...args){return {
 async first(){return sqlite.prepare(sql).get(...args)||null;},
 async run(){const r=sqlite.prepare(sql).run(...args);return {meta:{changes:Number(r.changes)}};}
};}};}}};
const server=http.createServer(async(req,res)=>{try{let chunks=[];let len=0;for await(const c of req){len+=c.length;if(len>20000){res.writeHead(413);res.end();return;}chunks.push(c);}const request=new Request('http://'+(req.headers.host||'localhost')+req.url,{method:req.method,headers:req.headers,...(['GET','HEAD'].includes(req.method)?{}:{body:Buffer.concat(chunks)})});const r=await worker.fetch(request,env);res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()));}catch{res.writeHead(500);res.end('Server error');}});
server.listen(Number(process.env.PORT||4173),'0.0.0.0',()=>console.log('Local: http://localhost:'+(process.env.PORT||4173)));
