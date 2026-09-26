const vscode = require('vscode');
const { execFile } = require('child_process');

let statusItem = null;
let panel = null;
let autoTimer = null;

function run(cmd, args, opts) {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout: 120000, ...(opts || {}) }, (err, stdout, stderr) => {
      resolve({ ok: !err, out: String(stdout || '').trim(), err: String(stderr || err || '').trim() });
    });
  });
}

function envFile() {
  const fs = require('fs');
  const os = require('os');
  const paths = ['/etc/giecko.env', require('path').join(os.homedir(), '.giecko.env')];
  const out = {};
  for (const p of paths) {
    try {
      const text = fs.readFileSync(p, 'utf8');
      for (const line of text.split('\n')) {
        const m = line.match(/^GIECKO_([A-Z_]+)='(.*)'$/);
        if (m) out[m[1]] = m[2];
      }
    } catch (err) {}
  }
  return out;
}

function env() {
  const e = process.env;
  const f = envFile();
  return {
    runId: e.GIECKO_RUN_ID || f.RUN_ID || 'local',
    region: e.GIECKO_REGION || f.REGION || 'unknown',
    stack: e.GIECKO_STACK || f.STACK || 'ide',
    distro: e.GIECKO_DISTRO || f.DISTRO || 'runner',
    user: e.GIECKO_USER || f.USER || 'giecko',
    term: e.GIECKO_URL_TERM || f.URL_TERM || '',
    code: e.GIECKO_URL_CODE || f.URL_CODE || '',
    desk: e.GIECKO_URL_DESK || f.URL_DESK || '',
    work: e.GIECKO_WORK_BRANCH || f.WORK_BRANCH || '',
    boot: e.GIECKO_BOOT_SECS || f.BOOT_SECS || '',
    end: e.GIECKO_END_EPOCH || f.END_EPOCH || '',
    autosave: e.GIECKO_AUTOSAVE_MIN || f.AUTOSAVE_MIN || '0',
    named: e.GIECKO_NAMED || f.NAMED || '0',
  };
}

function minutesLeft(s) {
  if (!s.end) return -1;
  return Math.max(0, Math.round((Number(s.end) * 1000 - Date.now()) / 60000));
}

async function gieckoSave() {
  const r = await run('giecko', ['save']);
  return r;
}

function qrScript() {
  return `
const RS_M=[[1,26,16,0,0,0],[1,44,28,0,0,0],[1,70,44,0,0,0],[2,50,32,0,0,0],[2,67,43,0,0,0],[4,43,27,0,0,0],[4,49,31,0,0,0],[2,60,38,2,61,39],[3,58,36,2,59,37],[4,69,43,1,70,44]];
const ALIGN=[[0,0,0,0,0],[6,18,0,0,0],[6,22,0,0,0],[6,26,0,0,0],[6,30,0,0,0],[6,34,0,0,0],[6,22,38,0,0],[6,24,42,0,0],[6,26,46,0,0],[6,28,50,0,0]];
const CAP=[14,26,42,62,84,106,122,152,180,213];
const DCW=[16,28,44,64,86,108,124,154,182,216];
const TCW=[26,44,70,100,134,172,196,242,292,346];
const gfExp=new Uint8Array(512);const gfLog=new Uint8Array(256);
for(let i=1,j=0;j<255;j++){gfExp[j]=i;gfLog[i]=j;i<<=1;if(i&0x100)i^=0x11d;}
for(let j=255;j<512;j++)gfExp[j]=gfExp[j-255];
function gfMul(a,b){if(a===0||b===0)return 0;return gfExp[gfLog[a]+gfLog[b]];}
function rsGen(degree){const gen=new Uint8Array(degree+1);const b=new Uint8Array(64);let len=1;gen[0]=1;for(let k=0;k<degree;k++){const root=gfExp[k];b.fill(0);for(let i=0;i<len;i++){b[i]^=gen[i];b[i+1]^=gfMul(gen[i],root);}len++;gen.set(b.subarray(0,len));}return gen;}
function rsRemainder(data,dataLen,degree){const gen=rsGen(degree);const work=new Uint8Array(dataLen+degree);work.set(data.subarray(0,dataLen));let wlen=dataLen+degree;while(wlen>=degree+1){const lead=work[0];if(lead!==0){for(let i=0;i<=degree;i++)work[i]^=gfMul(gen[i],lead);}work.copyWithin(0,1,wlen);wlen--;}const rem=new Uint8Array(degree);rem.set(work.subarray(0,wlen),degree-wlen);return rem;}
function utf8Bytes(text){const out=[];for(let i=0;i<text.length;i++){let cp=text.charCodeAt(i);if(cp>=0xd800&&cp<=0xdbff&&i+1<text.length){const lo=text.charCodeAt(i+1);if(lo>=0xdc00&&lo<=0xdfff){cp=0x10000+((cp-0xd800)<<10)+(lo-0xdc00);i++;}}if(cp<0x80)out.push(cp);else if(cp<0x800)out.push(0xc0|(cp>>6),0x80|(cp&0x3f));else if(cp<0x10000)out.push(0xe0|(cp>>12),0x80|((cp>>6)&0x3f),0x80|(cp&0x3f));else out.push(0xf0|(cp>>18),0x80|((cp>>12)&0x3f),0x80|((cp>>6)&0x3f),0x80|(cp&0x3f));}return new Uint8Array(out);}
function buildCodewords(bytes,version){const dataCw=DCW[version-1];const totalCw=TCW[version-1];const countBits=version<=9?8:16;const bits=[];const push=(v,n)=>{for(let q=n-1;q>=0;q--)bits.push((v>>q)&1);};push(4,4);push(bytes.length,countBits);for(let i=0;i<bytes.length;i++)push(bytes[i],8);push(0,4);while(bits.length%8!==0)push(0,1);const cw=new Uint8Array(totalCw);for(let i=0;i<bits.length/8;i++){let v=0;for(let j=0;j<8;j++)v=(v<<1)|bits[i*8+j];cw[i]=v;}let pad=0;for(let i=Math.floor(bits.length/8);i<dataCw;i++)cw[i]=pad++%2===0?0xec:0x11;const nb1=RS_M[version-1][0];const d1=RS_M[version-1][2];const nb2=RS_M[version-1][3];const d2=RS_M[version-1][5];const ecLen=RS_M[version-1][1]-d1;const nblocks=nb1+nb2;const blocksData=[];let off=0;for(let i=0;i<nblocks;i++){const dlen=i<nb1?d1:d2;blocksData.push(cw.slice(off,off+dlen));off+=dlen;}const blocksEc=[];for(let i=0;i<nblocks;i++){const dlen=i<nb1?d1:d2;blocksEc.push(rsRemainder(blocksData[i],dlen,ecLen));}const out=new Uint8Array(totalCw);let pos=0;const maxd=Math.max(d1,d2);for(let i=0;i<maxd;i++){for(let j=0;j<nblocks;j++){const dlen=j<nb1?d1:d2;if(i<dlen)out[pos++]=blocksData[j][i];}}for(let i=0;i<ecLen;i++){for(let j=0;j<nblocks;j++)out[pos++]=blocksEc[j][i];}return out;}
function maskBit(mask,row,col){switch(mask){case 0:return (row+col)%2===0;case 1:return row%2===0;case 2:return col%3===0;case 3:return (row+col)%3===0;case 4:return (Math.floor(row/2)+Math.floor(col/3))%2===0;case 5:return ((row*col)%2)+((row*col)%3)===0;case 6:return (((row*col)%2)+((row*col)%3))%2===0;default:return (((row+col)%2)+((row*col)%3))%2===0;}}
function getBit(x,i){return (x>>i)&1;}
function qrEncode(text){const bytes=utf8Bytes(text);let version=1;while(version<=10&&CAP[version-1]<bytes.length)version++;if(version>10)return null;const cw=buildCodewords(bytes,version);const size=17+4*version;const m=new Uint8Array(size*size);const fn=new Uint8Array(size*size);const set=(row,col,v)=>{m[row*size+col]=v?1:0;fn[row*size+col]=1;};const drawFinder=(row,col)=>{for(let dr=-4;dr<=4;dr++){for(let dc=-4;dc<=4;dc++){const r=row+dr;const c=col+dc;const d=Math.max(Math.abs(dr),Math.abs(dc));if(r<0||r>=size||c<0||c>=size)continue;set(r,c,d<=1||d===3?1:0);}}};drawFinder(3,3);drawFinder(3,size-4);drawFinder(size-4,3);for(let i=8;i<size-8;i++){set(6,i,(i+1)%2);set(i,6,(i+1)%2);}if(version>=2){const centers=ALIGN[version-1].filter(x=>x!==0);const n=centers.length;for(let i=0;i<n;i++){for(let j=0;j<n;j++){if((i===0&&j===0)||(i===0&&j===n-1)||(i===n-1&&j===0))continue;const cr=centers[i];const cc=centers[j];for(let dr=-2;dr<=2;dr++){for(let dc=-2;dc<=2;dc++){const d=Math.max(Math.abs(dr),Math.abs(dc));set(cr+dr,cc+dc,d!==1?1:0);}}}}}const drawVersion=()=>{if(version<7)return;let rem=version;for(let i=0;i<12;i++)rem=(rem<<1)^((rem>>11)*0x1f25);const bits=(version<<12)|rem;for(let i=0;i<18;i++){const bit=getBit(bits,i);const a=size-11+(i%3);const b=Math.floor(i/3);set(b,a,bit);set(a,b,bit);}};drawVersion();const drawFormat=(mask)=>{const data=(0<<3)|mask;let rem=data;for(let i=0;i<10;i++)rem=((rem<<1)^((rem>>9)*0x537))&0x7ff;const bits=((data<<10)|rem)^0x5412;for(let i=0;i<6;i++)set(i,8,getBit(bits,i));set(7,8,getBit(bits,6));set(8,8,getBit(bits,7));set(8,7,getBit(bits,8));for(let i=9;i<15;i++)set(8,14-i,getBit(bits,i));for(let i=0;i<8;i++)set(8,size-1-i,getBit(bits,i));for(let i=8;i<15;i++)set(size-15+i,8,getBit(bits,i));set(size-8,8,1);};drawFormat(0);let inc=-1;let row=size-1;let bitIndex=7;let byteIndex=0;for(let col=size-1;col>0;col-=2){let c0=col;if(c0<=6)c0-=1;for(;;){for(let c=c0;c>=c0-1;c--){if(!fn[row*size+c]){const dark=byteIndex<cw.length?(cw[byteIndex]>>bitIndex)&1:0;m[row*size+c]=dark;bitIndex--;if(bitIndex===-1){byteIndex++;bitIndex=7;}}}row+=inc;if(row<0||row>=size){row-=inc;inc=-inc;break;}}}const applyMask=(mask)=>{for(let r=0;r<size;r++){for(let c=0;c<size;c++){if(!fn[r*size+c]&&maskBit(mask,r,c))m[r*size+c]^=1;}}};const penalty=()=>{let pen=0;let dark=0;for(let i=0;i<size*size;i++)dark+=m[i];for(let r=0;r<size;r++){let run=1;for(let c=1;c<=size;c++){if(c<size&&m[r*size+c]===m[r*size+c-1])run++;else{if(run>=5)pen+=3+(run-5);run=1;}}}for(let c=0;c<size;c++){let run=1;for(let r=1;r<=size;r++){if(r<size&&m[r*size+c]===m[(r-1)*size+c])run++;else{if(run>=5)pen+=3+(run-5);run=1;}}}for(let r=0;r+1<size;r++){for(let c=0;c+1<size;c++){const v=m[r*size+c];if(v===m[r*size+c+1]&&v===m[(r+1)*size+c]&&v===m[(r+1)*size+c+1])pen+=3;}}const patternOk=(idx)=>{for(let i=0;i<7;i++){if((i===1||i===3||i===5)?m[idx+i]!==0:m[idx+i]===0)return false;}return true;};for(let r=0;r<size;r++){for(let c=0;c+6<size;c++){if(patternOk(r*size+c)){let before=true;let after=true;for(let i=1;i<=4;i++){if(c-i>=0&&m[r*size+c-i])before=false;if(c+6+i<size&&m[r*size+c+6+i])after=false;}if(before||after)pen+=40;}}}for(let c=0;c<size;c++){for(let r=0;r+6<size;r++){let ok=true;for(let i=0;i<7;i++){const v=m[(r+i)*size+c];if((i===1||i===3||i===5)?v!==0:v===0){ok=false;break;}}if(ok){let before=true;let after=true;for(let i=1;i<=4;i++){if(r-i>=0&&m[(r-i)*size+c])before=false;if(r+6+i<size&&m[(r+6+i)*size+c])after=false;}if(before||after)pen+=40;}}}const total=size*size;const percent=Math.floor((dark*200+total)/(2*total));const k=Math.abs(percent-50);pen+=10*Math.floor(k/5);return pen;};let bestMask=0;let bestPen=-1;for(let mk=0;mk<8;mk++){applyMask(mk);drawFormat(mk);const p=penalty();if(bestPen<0||p<bestPen){bestPen=p;bestMask=mk;}applyMask(mk);drawFormat(0);}applyMask(bestMask);drawFormat(bestMask);return {size,modules:m};}
function qrCanvasUrl(text,px){const qr=qrEncode(text);if(!qr)return '';const quiet=2;const dim=qr.size+quiet*2;const cv=document.createElement('canvas');cv.width=dim;cv.height=dim;const ctx=cv.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,dim,dim);ctx.fillStyle='#0b0e14';for(let r=0;r<qr.size;r++){for(let c=0;c<qr.size;c++){if(qr.modules[r*qr.size+c])ctx.fillRect(c+quiet,r+quiet,1,1);}}return cv.toDataURL('image/png');}
`;
}

function panelHtml(s) {
  const left = minutesLeft(s);
  const leftText = left < 0 ? 'unknown' : left + ' min';
  const pct = left < 0 || !s.end ? 100 : Math.max(0, Math.min(100, (left / (Number(s.autosave) > 0 ? 6 * 60 : 180)) * 100));
  const mask = (u) => (s.named === '1' ? 'your Cloudflare hostname' : u);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
:root { --bg:#070b12; --bar:#0b111c; --card:#101827; --line:#1e2b42; --text:#eaf1fb; --dim:#8fa1bd; --faint:#5c6f8e; --green:#3ddc84; --cyan:#38d6f5; --purple:#a78bfa; --pink:#f472b6; --amber:#fbbf24; }
* { box-sizing: border-box; }
body { background: var(--bg); color: var(--text); font-family: "Segoe UI", system-ui, sans-serif; margin: 0; padding: 18px; }
h1 { color: var(--green); font-size: 22px; letter-spacing: 5px; margin: 0 0 2px 0; }
.sub { color: var(--dim); font-size: 12px; margin-bottom: 16px; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; }
.card { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 16px; }
.card h2 { font-size: 12px; letter-spacing: 2px; color: var(--faint); margin: 0 0 10px 0; text-transform: uppercase; }
.kv { display: flex; justify-content: space-between; gap: 10px; padding: 6px 0; border-bottom: 1px solid var(--line); font-size: 13px; }
.kv:last-child { border-bottom: none; }
.kv .k { color: var(--dim); }
.kv .v { color: var(--text); font-weight: 600; word-break: break-all; text-align: right; }
.btn { display: inline-block; background: var(--green); color: #04110a; border: none; border-radius: 10px; font-size: 14px; font-weight: 800; padding: 10px 18px; margin: 6px 8px 0 0; cursor: pointer; }
.btn.cyan { background: var(--cyan); }
.btn.ghost { background: transparent; color: var(--text); border: 1.5px solid var(--line); }
.msg { margin-top: 10px; font-size: 13px; color: var(--dim); min-height: 18px; word-break: break-all; }
.bar { height: 8px; background: var(--bar); border: 1px solid var(--line); border-radius: 999px; overflow: hidden; margin-top: 8px; }
.bar > div { height: 100%; background: linear-gradient(90deg, var(--green), var(--cyan)); }
.qr { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 6px; }
.qrc { text-align: center; }
.qrc img { width: 140px; height: 140px; border-radius: 10px; }
.qrc span { display: block; color: var(--dim); font-size: 11px; margin-top: 4px; }
.urls { font-family: Consolas, monospace; font-size: 12px; color: var(--cyan); word-break: break-all; }
</style>
</head>
<body>
<h1>GIECKO</h1>
<div class="sub">session panel - every giecko command, no terminal needed</div>
<div class="grid">
  <div class="card">
    <h2>Session</h2>
    <div class="kv"><span class="k">run</span><span class="v">${s.runId}</span></div>
    <div class="kv"><span class="k">stack</span><span class="v">${s.stack} / ${s.distro}</span></div>
    <div class="kv"><span class="k">region</span><span class="v">${s.region}</span></div>
    <div class="kv"><span class="k">user</span><span class="v">${s.user}</span></div>
    <div class="kv"><span class="k">work branch</span><span class="v">${s.work || '-'}</span></div>
  </div>
  <div class="card">
    <h2>Lifetime</h2>
    <div class="kv"><span class="k">time left</span><span class="v">${leftText}</span></div>
    <div class="bar"><div style="width:${pct}%"></div></div>
    <div class="kv" style="margin-top:10px"><span class="k">autosave</span><span class="v">${Number(s.autosave) > 0 ? 'every ' + s.autosave + ' min' : 'off'}</span></div>
    <button class="btn" id="save">Save workspace now</button>
    <div class="msg" id="msg"></div>
  </div>
  <div class="card">
    <h2>URLs</h2>
    <div class="urls" id="urls"></div>
    <button class="btn cyan" id="copyTerm">Copy terminal URL</button>
    <button class="btn ghost" id="openRooms">Rooms + restore info</button>
  </div>
</div>
<div class="card" style="margin-top:14px">
  <h2>Scan to open on a phone</h2>
  <div class="qr" id="qr"></div>
</div>
<script>
${qrScript()}
const s = ${JSON.stringify(s)};
const urlsEl = document.getElementById('urls');
const urls = [];
if (s.term) urls.push(['terminal', s.term]);
if (s.code) urls.push(['vscode', s.code]);
if (s.desk) urls.push(['vscode desktop', s.desk]);
urlsEl.innerHTML = urls.length ? urls.map(u => '<div class="kv"><span class="k">' + u[0] + '</span><span class="v">' + (s.named === '1' ? 'your Cloudflare hostname' : u[1]) + '</span></div>').join('') : '<div class="kv"><span class="k">no live urls</span><span class="v">-</span></div>';
const qrEl = document.getElementById('qr');
for (const u of urls) {
  if (s.named === '1') break;
  const img = qrCanvasUrl(u[1], 140);
  if (img) {
    const div = document.createElement('div');
    div.className = 'qrc';
    div.innerHTML = '<img src="' + img + '"><span>' + u[0] + '</span>';
    qrEl.appendChild(div);
  }
}
document.getElementById('save').addEventListener('click', () => {
  const msg = document.getElementById('msg');
  msg.textContent = 'saving...';
  const vscode = acquireVsCodeApi();
  vscode.postMessage({ command: 'save' });
});
document.getElementById('copyTerm').addEventListener('click', () => {
  if (s.term && s.term.startsWith('http')) {
    navigator.clipboard.writeText(s.term);
    document.getElementById('msg').textContent = 'terminal url copied';
  }
});
document.getElementById('openRooms').addEventListener('click', () => {
  const vscode = acquireVsCodeApi();
  vscode.postMessage({ command: 'rooms' });
});
window.addEventListener('message', (ev) => {
  const m = ev.data;
  if (m.command === 'saveResult') document.getElementById('msg').textContent = m.text;
  if (m.command === 'roomsResult') document.getElementById('msg').textContent = m.text;
});
</script>
</body>
</html>`;
}

function openPanel(context) {
  if (panel) {
    panel.reveal();
    return;
  }
  panel = vscode.window.createWebviewPanel('gieckoPanel', 'GIECKO Session', vscode.ViewColumn.One, { enableScripts: true });
  panel.webview.html = panelHtml(env());
  panel.webview.onDidReceiveMessage(async (m) => {
    if (m.command === 'save') {
      const r = await gieckoSave();
      panel.webview.postMessage({ command: 'saveResult', text: r.ok ? 'saved: ' + r.out : 'save failed: ' + (r.err || r.out).slice(0, 300) });
      updateStatus();
    }
    if (m.command === 'rooms') {
      const r = await run('giecko', ['rooms']);
      panel.webview.postMessage({ command: 'roomsResult', text: (r.ok ? r.out : r.err || 'no rooms').slice(0, 600) });
    }
  }, undefined, context.subscriptions);
  panel.onDidDispose(() => { panel = null; }, undefined, context.subscriptions);
}

function updateStatus() {
  if (!statusItem) return;
  const s = env();
  const left = minutesLeft(s);
  if (!s.term && !s.code) {
    statusItem.text = '$(zap) GIECKO';
    statusItem.tooltip = 'Giecko session';
  } else if (left >= 0) {
    statusItem.text = left > 0 ? `$(pulse) GIECKO ${left}m left` : '$(circle-slash) GIECKO time up';
    statusItem.tooltip = 'Click for the session panel';
  } else {
    statusItem.text = '$(pulse) GIECKO live';
  }
  statusItem.command = 'giecko.panel';
}

function activate(context) {
  statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusItem.show();
  updateStatus();
  autoTimer = setInterval(updateStatus, 30000);

  const cfg = vscode.workspace.getConfiguration('giecko');
  const mins = Number(cfg.get('autosaveMinutes', 15));
  if (mins > 0) {
    setInterval(async () => {
      const r = await gieckoSave();
      if (r.ok) vscode.window.setStatusBarMessage('GIECKO autosaved', 4000);
    }, mins * 60000);
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('giecko.panel', () => openPanel(context)),
    vscode.commands.registerCommand('giecko.save', async () => {
      const r = await gieckoSave();
      if (r.ok) vscode.window.setStatusBarMessage('GIECKO saved: ' + r.out.slice(0, 80), 5000);
      else vscode.window.showWarningMessage('GIECKO save failed: ' + (r.err || r.out).slice(0, 200));
    }),
    vscode.commands.registerCommand('giecko.info', async () => {
      const s = env();
      const left = minutesLeft(s);
      const lines = [
        'run: ' + s.runId,
        'stack: ' + s.stack + ' on ' + s.distro,
        'region: ' + s.region,
        'user: ' + s.user,
        'work branch: ' + (s.work || '-'),
        'time left: ' + (left < 0 ? 'unknown' : left + ' min'),
        'terminal: ' + (s.term || '-'),
        'vscode: ' + (s.code || '-'),
        'desktop: ' + (s.desk || '-'),
      ];
      vscode.window.showInformationMessage(lines.join('  |  '));
    }),
    vscode.commands.registerCommand('giecko.urls', async () => {
      const s = env();
      const picks = [];
      if (s.term) picks.push({ label: 'Terminal', description: s.term, url: s.term });
      if (s.code) picks.push({ label: 'VS Code', description: s.code, url: s.code });
      if (s.desk) picks.push({ label: 'Desktop', description: s.desk, url: s.desk });
      if (!picks.length) {
        vscode.window.showInformationMessage('GIECKO: no live URLs in this session');
        return;
      }
      const pick = await vscode.window.showQuickPick(picks);
      if (pick) {
        await vscode.env.clipboard.writeText(pick.url);
        vscode.window.setStatusBarMessage('GIECKO url copied: ' + pick.label, 4000);
      }
    }),
    vscode.commands.registerCommand('giecko.room', async () => {
      const name = await vscode.window.showInputBox({ prompt: 'Room name (letters, numbers, - and _)', placeHolder: 'project-x' });
      if (!name) return;
      const r = await run('giecko', ['room', name]);
      const out = (r.ok ? r.out : r.err || 'room command failed') || 'room ' + name + ' ready';
      const term = vscode.window.createTerminal({ name: 'room: ' + name });
      term.show();
      vscode.window.setStatusBarMessage('GIECKO ' + out.slice(0, 80), 5000);
    }),
    vscode.commands.registerCommand('giecko.rooms', async () => {
      const r = await run('giecko', ['rooms']);
      vscode.window.showInformationMessage('GIECKO rooms: ' + ((r.ok ? r.out : 'none') || 'none').slice(0, 300));
    }),
    vscode.commands.registerCommand('giecko.restore', async () => {
      const r = await run('bash', ['-c', 'git ls-remote --heads origin 2>/dev/null | grep -o "giecko-saves/run-.*" | head -20 || true']);
      const branches = r.out.split('\n').filter(Boolean);
      if (!branches.length) {
        vscode.window.showInformationMessage('GIECKO: no saved runs found');
        return;
      }
      const pick = await vscode.window.showQuickPick(branches.map((b) => ({ label: b })));
      if (pick) {
        const runId = pick.label.replace('giecko-saves/run-', '');
        vscode.window.showInformationMessage('GIECKO: relaunch with restore run id ' + runId + ' (mobile: Restore field, CLI: giecko up)');
      }
    })
  );
}

function deactivate() {
  if (autoTimer) clearInterval(autoTimer);
}

module.exports = { activate, deactivate };
