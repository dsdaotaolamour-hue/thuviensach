import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
const port=3107,base='http://127.0.0.1:'+port;
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p',String(port)],{windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,NEXT_TELEMETRY_DISABLED:'1'}});
let output='';child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);
try{
  let ready=false;
  for(let i=0;i<80;i++){try{const r=await fetch(base,{signal:AbortSignal.timeout(1000)});if(r.ok){ready=true;break;}}catch{}await delay(250);}
  assert.ok(ready,'Server failed to start: '+output);
  for(const [path,type] of [['/','text/html'],['/assets/js/app.js','text/javascript'],['/assets/js/live.js','text/javascript'],['/assets/css/styles.css','text/css']]){
    const r=await fetch(base+path);assert.equal(r.status,200,path);assert.ok(r.headers.get('content-type').includes(type));
  }
  const qr=await fetch(base+'/api/qr?url='+encodeURIComponent('https://zalo.me/example'));
  assert.equal(qr.status,200);assert.equal(qr.headers.get('content-type'),'image/png');const bytes=Buffer.from(await qr.arrayBuffer());assert.equal(bytes.subarray(1,4).toString(),'PNG');
  const traversal=await fetch(base+'/assets/%2e%2e/package.json');assert.notEqual(traversal.status,200);
  console.log('PASS: production HTTP root, JS/CSS, QR PNG and path traversal guard.');
}finally{child.kill();}
