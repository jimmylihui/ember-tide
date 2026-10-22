import {readFile,writeFile,mkdir,rm,copyFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);process.chdir(root.pathname);
const engine=await readFile('src/engine.js','utf8');
const assets={};
for(const [url,file,type] of [['/','src/index.html','text/html; charset=utf-8'],['/app.js','src/app.js','text/javascript; charset=utf-8'],['/style.css','src/style.css','text/css; charset=utf-8'],['/engine.js','src/engine.js','text/javascript; charset=utf-8']])assets[url]={body:await readFile(file,'utf8'),type};
const worker=(await readFile('worker/index.js','utf8')).replace(/^import .*;\n/gm,'');
await rm('dist',{recursive:true,force:true});await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});
await writeFile('dist/server/index.js',engine.replace(/export /g,'')+'\nconst ASSETS='+JSON.stringify(assets)+';\n'+worker);
await copyFile('.openai/hosting.json','dist/.openai/hosting.json');console.log('Built single-file Worker with game engine, UI and API.');
