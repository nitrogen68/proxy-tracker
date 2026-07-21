const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.raw({ type: '*/*', limit: '50mb' }));

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
const EXTERNAL_LOGGER = 'https://shtl.pw/proxy/logger.php';
const COOKIE_MAX_AGE = 1000 * 60 * 60 * 2; // 2 jam

// ============================================
// HELPER: SET/GET COOKIE TARGET
// ============================================
function setTargetCookie(res, targetUrl, fullProxy) {
  res.cookie('pxs_target', encodeURIComponent(targetUrl), { maxAge: COOKIE_MAX_AGE, path: '/' });
  res.cookie('pxs_full', fullProxy ? '1' : '0', { maxAge: COOKIE_MAX_AGE, path: '/' });
}

function getTargetFromCookie(req) {
  try {
    const target = req.cookies?.pxs_target ? decodeURIComponent(req.cookies.pxs_target) : null;
    const full = req.cookies?.pxs_full === '1';
    return { target, full };
  } catch (e) { return { target: null, full: false }; }
}

// Need cookie-parser
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// ============================================
// CLIENT INTERCEPTOR (FIXED + MUTATION OBSERVER)
// ============================================
function generateInterceptor(targetUrl, currentProxyUrl, assetProxyBase) {
  return `<script>
(function(){
  window.__PXS={logs:[],lastRequest:null,loggerUrl:'${EXTERNAL_LOGGER}',assetProxy:'${assetProxyBase}',targetOrigin:new URL('${targetUrl}').origin};
  function send(a,d){try{navigator.sendBeacon(window.__PXS.loggerUrl,JSON.stringify({ts:new Date().toISOString(),src:location.href,action:a,details:d}))}catch(e){}}
  function buf(u,m,d){window.printToDashboard?window.printToDashboard(u,m,d):window.__PXS.logs.push({u,m,d,t:Date.now()})}
  const oF=window.fetch,oX=window.XMLHttpRequest;
  
  function resolveUrl(u){
    try{return new URL(u,document.baseURI||location.href).href}catch(e){return u}
  }
  
  // === MUTATION OBSERVER: Tangkap elemen baru ===
  if(typeof MutationObserver!=='undefined'){
    const observer=new MutationObserver(function(mutations){
      mutations.forEach(function(mutation){
        mutation.addedNodes.forEach(function(node){
          if(node.nodeType!==1)return;
          const tags={'SCRIPT':'src','LINK':'href','IMG':'src','IFRAME':'src','VIDEO':'src','SOURCE':'src','EMBED':'src','INPUT':'src'};
          const tag=node.tagName;
          if(tags[tag]){
            const attr=tags[tag];
            const val=node.getAttribute(attr);
            if(!val)return;
            let newUrl=val;
            const ap=window.__PXS.assetProxy;
            const to=window.__PXS.targetOrigin;
            if(val.startsWith('//'))newUrl=ap+'?url=https:'+encodeURIComponent(val);
            else if(val.startsWith('http'))newUrl=ap+'?url='+encodeURIComponent(val);
            else if(val.startsWith('/')&&!val.startsWith('//'))newUrl=ap+'?url='+encodeURIComponent(to+val);
            else if(!val.startsWith('#')&&!val.startsWith('data:')&&!val.startsWith('javascript:'))newUrl=ap+'?url='+encodeURIComponent(to+'/'+val);
            if(newUrl!==val)node.setAttribute(attr,newUrl);
          }
          // Rewrite children juga
          if(node.querySelectorAll){
            ['img','script','iframe','video','source','embed','input[type="image"]'].forEach(sel=>{
              node.querySelectorAll(sel).forEach(el=>{
                const attr=el.tagName==='LINK'?'href':'src';
                const v=el.getAttribute(attr);if(!v)return;
                let nu=v;const ap=window.__PXS.assetProxy;const to=window.__PXS.targetOrigin;
                if(v.startsWith('//'))nu=ap+'?url=https:'+encodeURIComponent(v);
                else if(v.startsWith('http'))nu=ap+'?url='+encodeURIComponent(v);
                else if(v.startsWith('/'))nu=ap+'?url='+encodeURIComponent(to+v);
                else if(!v.startsWith('#')&&!v.startsWith('data:')&&!v.startsWith('javascript:'))nu=ap+'?url='+encodeURIComponent(to+'/'+v);
                if(nu!==v)el.setAttribute(attr,nu);
              });
            });
          }
        });
      });
    });
    observer.observe(document.documentElement,{childList:true,subtree:true});
  }
  
  window.fetch=async function(r,i){
    let u=r instanceof Request?r.url:r;
    let m=(i?.method||(r instanceof Request?r.method:'GET')).toUpperCase();
    u=resolveUrl(u);
    if(typeof u==='string'&&u.includes(window.__PXS.loggerUrl))return oF.apply(this,arguments);
    send('network_request',{url:u,method:m,type:'fetch'});
    let f=u;
    try{
      const o=new URL(u);const h=location.hostname;
      if(o.hostname!==h&&o.protocol.startsWith('http')){
        f=window.__PXS.assetProxy+'?url='+encodeURIComponent(u);
        if(r instanceof Request){
          const rc=new Request(f,{method:m,headers:i?.headers||r.headers,body:i?.body||r.body,mode:'cors',credentials:'omit'});
          arguments[0]=rc;
        }else arguments[0]=f;
      }
    }catch(e){}
    try{
      const res=await oF.apply(this,arguments);
      let b='[unreadable]';
      try{const c=res.clone(),t=await c.text();b=t.length>5e4?t.substring(0,5e4)+'\\n...[truncated]':t}catch(e){}
      buf(u,m,b);
      if(typeof u==='string'&&!/\\.(css|js|png|jpg|jpeg|gif|svg|woff2?|ttf|ico)$/i.test(u))window.__PXS.lastRequest={url:u,method:m,data:b};
      return res;
    }catch(err){buf(u,m,'[Error:'+err.message+']');throw err}
  };
  
  window.XMLHttpRequest=function(){
    const x=new oX();let xm='GET',xu='';const oo=x.open;
    x.open=function(m,u,...rest){xm=(m||'GET').toUpperCase();xu=resolveUrl(typeof u==='string'?u:String(u));return oo.apply(this,[m,xu,...rest])};
    x.addEventListener('load',function(){
      if(typeof xu==='string'&&xu.includes(window.__PXS.loggerUrl))return;
      let b='[binary]';
      try{if(!x.responseType||x.responseType==='text')b=x.responseText;else if(x.responseType==='json')b=JSON.stringify(x.response)}catch(e){}
      buf(xu,xm,b);
      if(typeof xu==='string'&&!/\\.(css|js|png|jpg|jpeg|gif|svg|woff2?|ttf|ico)$/i.test(xu))window.__PXS.lastRequest={url:xu,method:xm,data:b};
    });
    x.addEventListener('error',function(){buf(xu,xm,'[XHR Error]')});
    return x;
  };
  
  send('visit',{target_url:'${targetUrl}',proxy_url:'${currentProxyUrl}'});
})();
</script>`;
}

// ============================================
// DASHBOARD UI (sama, dipersingkat)
// ============================================
function generateDashboard(currentProxyUrl) {
  return `<!-- DASHBOARD --><style>#pxs-root,#pxs-root *{box-sizing:border-box!important;font-family:'Segoe UI',system-ui,sans-serif!important}#pxs-root{position:fixed!important;bottom:20px!important;right:20px!important;width:min(420px,calc(100vw - 40px))!important;z-index:2147483647!important}#pxs-toolbar{position:fixed!important;top:20px!important;left:20px!important;z-index:2147483648!important;display:flex!important;gap:8px!important}.pxs-pill{display:flex!important;align-items:center!important;gap:6px!important;background:#1e293b!important;color:#f8fafc!important;padding:10px 14px!important;border-radius:8px!important;text-decoration:none!important;font-size:13px!important;font-weight:600!important;border:1px solid #3b82f6!important;box-shadow:0 4px 15px rgba(0,0,0,0.5)!important;cursor:pointer!important;transition:all .15s!important}.pxs-pill:hover{background:#3b82f6!important;transform:scale(1.05)!important}#pxs-card{background:#111827!important;border:1px solid #3b82f6!important;border-radius:12px!important;box-shadow:0 20px 50px rgba(0,0,0,0.5)!important;overflow:hidden!important;display:flex!important;flex-direction:column!important;max-height:min(480px,calc(100vh - 100px))!important}#pxs-header{background:linear-gradient(135deg,#3b82f6,#6366f1)!important;color:#fff!important;padding:10px 14px!important;display:flex!important;justify-content:space-between!important;align-items:center!important;cursor:pointer!important;user-select:none!important}#pxs-title{font-weight:700!important;font-size:13px!important;display:flex!important;align-items:center!important;gap:8px!important}#pxs-badge{background:#ef4444!important;color:#fff!important;border-radius:12px!important;padding:2px 8px!important;font-size:11px!important;display:none!important;font-weight:700!important}#pxs-badge.show{display:inline-block!important}#pxs-actions{display:flex!important;gap:6px!important}.pxs-btn-sm{border:none!important;color:#fff!important;cursor:pointer!important;font-weight:600!important;font-size:11px!important;border-radius:6px!important;padding:6px 10px!important}.pxs-btn-green{background:#10b981!important}.pxs-btn-red{background:#ef4444!important}#pxs-toggle{background:rgba(255,255,255,0.15)!important;width:26px!important;height:26px!important;display:flex!important;align-items:center!important;justify-content:center!important;border-radius:6px!important;font-size:14px!important}#pxs-body{flex:1!important;overflow-y:auto!important;background:#0a0a0f!important;padding:12px!important;display:none!important}#pxs-body.open{display:block!important}.pxs-log{margin-bottom:12px!important;border-bottom:1px dashed #333!important;padding-bottom:8px!important;animation:pxsFadeIn .3s!important}@keyframes pxsFadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}.pxs-meta{color:#60a5fa!important;font-size:11px!important;font-family:monospace!important;word-break:break-all!important;margin-bottom:4px!important;display:flex!important;gap:6px!important;align-items:baseline!important}.pxs-tag{font-size:10px!important;font-weight:700!important;padding:2px 6px!important;border-radius:4px!important;flex-shrink:0!important}.pxs-tag-get{background:#1d4ed8!important;color:#fff!important}.pxs-tag-post{background:#b45309!important;color:#fff!important}.pxs-tag-other{background:#4b5563!important;color:#fff!important}.pxs-data{color:#e2e8f0!important;font-size:11px!important;font-family:'Consolas',monospace!important;background:#1f2937!important;padding:10px!important;border-radius:6px!important;overflow-x:auto!important;white-space:pre-wrap!important;word-break:break-all!important;position:relative!important}.pxs-copy{position:absolute!important;top:8px!important;right:8px!important;background:#2563eb!important;color:#fff!important;border:none!important;border-radius:4px!important;padding:4px 8px!important;cursor:pointer!important;font-size:11px!important;font-weight:600!important}#pxs-modal{display:none!important;position:fixed!important;inset:0!important;background:rgba(0,0,0,0.8)!important;z-index:2147483650!important;align-items:center!important;justify-content:center!important;padding:20px!important}#pxs-modal.open{display:flex!important}#pxs-modal-box{background:#1e1e1e!important;width:100%!important;max-width:720px!important;max-height:85vh!important;border-radius:10px!important;overflow:hidden!important;display:flex!important;flex-direction:column!important;border:1px solid #333!important}#pxs-modal-head{background:#1f2937!important;color:#fff!important;padding:14px 18px!important;display:flex!important;justify-content:space-between!important;align-items:center!important}#pxs-modal-tabs{display:flex!important;background:#171717!important;border-bottom:1px solid #333!important}.pxs-tab{background:transparent!important;border:none!important;color:#9ca3af!important;font-size:13px!important;font-weight:600!important;padding:10px 18px!important;cursor:pointer!important;border-bottom:2px solid transparent!important}.pxs-tab.active{color:#3b82f6!important;border-bottom-color:#3b82f6!important}#pxs-modal-body{flex:1!important;overflow-y:auto!important;background:#141414!important}#pxs-code-php,#pxs-code-js{margin:0!important;padding:18px!important;color:#4ade80!important;font-family:'Consolas',monospace!important;font-size:12.5px!important;white-space:pre-wrap!important;word-break:break-all!important;display:none!important}#pxs-code-php.active,#pxs-code-js.active{display:block!important}#pxs-modal-foot{background:#1a1a1a!important;padding:12px 18px!important;display:flex!important;justify-content:flex-end!important;gap:10px!important;border-top:1px solid #333!important}.pxs-btn{border:none!important;padding:9px 16px!important;border-radius:6px!important;font-weight:700!important;cursor:pointer!important;font-size:13px!important;color:#fff!important;transition:.2s!important}.pxs-btn-blue{background:#3b82f6!important}.pxs-btn-gray{background:#374151!important}@media(max-width:480px){#pxs-root{right:10px!important;left:10px!important;width:auto!important}#pxs-toolbar{top:10px!important;left:10px!important}}</style><div id="pxs-toolbar"><a href="/" class="pxs-pill">🏠 Home</a><a href="${currentProxyUrl}" class="pxs-pill">🔄 Refresh</a></div><div id="pxs-modal"><div id="pxs-modal-box"><div id="pxs-modal-head"><span>🚀 Generated API Code</span><button onclick="document.getElementById('pxs-modal').classList.remove('open')" style="background:transparent;border:none;color:#94a3b8;cursor:pointer;font-size:18px;">✖</button></div><div id="pxs-modal-tabs"><button class="pxs-tab active" onclick="switchTab('php')">🐘 PHP</button><button class="pxs-tab" onclick="switchTab('js')">🟨 JavaScript</button></div><div id="pxs-modal-body"><pre id="pxs-code-php" class="active"></pre><pre id="pxs-code-js"></pre></div><div id="pxs-modal-foot"><button class="pxs-btn pxs-btn-blue" onclick="copyCode()">📋 Copy Code</button><button class="pxs-btn pxs-btn-gray" onclick="document.getElementById('pxs-modal').classList.remove('open')">Close</button></div></div></div><div id="pxs-root"><div id="pxs-card"><div id="pxs-header"><div id="pxs-title">📡 Live Sniffer <span id="pxs-badge">0</span></div><div id="pxs-actions"><button class="pxs-btn-sm pxs-btn-red" onclick="clearLogs(event)">🗑️ Clear</button><button class="pxs-btn-sm pxs-btn-green" onclick="generateCode(event)">⚡ Get Endpoint</button><div id="pxs-toggle">+</div></div></div><div id="pxs-body"><div style="color:#4ade80;font-size:12px;font-family:monospace">[System] Sniffer Active. Waiting...</div></div></div></div><script>
let isOpen=0,unread=0,count=0,activeTab='php';const body=document.getElementById('pxs-body'),badge=document.getElementById('pxs-badge'),toggle=document.getElementById('pxs-toggle');document.getElementById('pxs-header').addEventListener('click',e=>{if(e.target.closest('.pxs-btn-sm'))return;isOpen=!isOpen;body.classList.toggle('open',isOpen);toggle.textContent=isOpen?'−':'+';if(isOpen){unread=0;badge.classList.remove('show');badge.textContent='0';body.scrollTop=body.scrollHeight}});function clearLogs(e){e.stopPropagation();body.innerHTML='<div style="color:#4ade80;font-size:12px;font-family:monospace">[System] Log cleared.</div>';count=0;unread=0;badge.classList.remove('show')}function esc(s){return typeof s!=='string'?String(s):s.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}window.printToDashboard=function(url,method,data){if(typeof url==='string'&&/\\.(css|js|png|jpg|jpeg|gif|svg|woff2?|ttf|ico)$/i.test(url))return;let fmt=data;try{fmt=JSON.stringify(JSON.parse(data),null,2)}catch(e){if(typeof fmt!=='string')fmt=String(fmt);if(fmt.length>3000)fmt=fmt.substring(0,3000)+'\\n...[truncated]'}const tc=method==='GET'?'pxs-tag-get':(method==='POST'?'pxs-tag-post':'pxs-tag-other');const d=document.createElement('div');d.className='pxs-log';d.innerHTML='<div class="pxs-meta"><span class="pxs-tag '+tc+'">'+esc(method)+'</span><span>🎯 '+esc(url)+'</span></div><div class="pxs-data"><button class="pxs-copy" onclick="copyJson(this)">📋 Copy</button>'+esc(fmt)+'</div>';body.appendChild(d);if(isOpen)body.scrollTop=body.scrollHeight;else{badge.textContent=++unread;badge.classList.add('show')}};if(window.__PXS&&window.__PXS.logs.length)window.__PXS.logs.forEach(l=>window.printToDashboard(l.url,l.method,l.data));function generateCode(e){e.stopPropagation();const req=window.__PXS?window.__PXS.lastRequest:null;if(!req){alert('No API request captured yet!');return}let base=req.url,paramName='url',hasParam=0;try{const u=new URL(req.url);for(const[k,v]of u.searchParams){if(v.startsWith('http')||['url','link','q','api'].includes(k)){paramName=k;hasParam=1;u.searchParams.delete(k);const sep=u.search?'&':'?';base=u.toString()+sep+k+'=';break}}}catch(e){}let parsed=null,isJson=0;try{parsed=JSON.parse(req.data);isJson=1}catch(e){}const php='<?php\\nheader(\\'Content-Type: application/json; charset=utf-8\\');\\nheader(\\'Access-Control-Allow-Origin: *\\');\\n$baseApi = "'+base+'";\\n'+(hasParam?'if(!isset($_GET[\\''+paramName+'\\'])||empty($_GET[\\''+paramName+'\\'])){http_response_code(400);echo json_encode(["success"=>false,"message"=>"Parameter required"]);exit;}\\n$input=trim($_GET[\\''+paramName+'\\']);\\n$endpoint=$baseApi.urlencode($input);\\n':'$endpoint=$baseApi;\\n')+'$ch=curl_init();\\ncurl_setopt_array($ch,[CURLOPT_URL=>$endpoint,CURLOPT_RETURNTRANSFER=>true,CURLOPT_FOLLOWLOCATION=>true,CURLOPT_TIMEOUT=>30,CURLOPT_SSL_VERIFYPEER=>false,CURLOPT_CUSTOMREQUEST=>"'+req.method+'",CURLOPT_HTTPHEADER=>["Accept: application/json","User-Agent: Mozilla/5.0"]]);\\n$response=curl_exec($ch);\\ncurl_close($ch);\\necho $response;\\n?>';const js='const API_BASE="'+base+'";\\nasync function fetchData(inputValue){\\n  try{\\n    const url=API_BASE+(inputValue?encodeURIComponent(inputValue):\\'\\');\\n    const res=await fetch(url,{method:"'+req.method+'",headers:{"Accept":"application/json"}});\\n    if(!res.ok)throw new Error("HTTP "+res.status);\\n    '+(isJson?'const data=await res.json();\\n    console.log(data);\\n    return data;':'const text=await res.text();\\n    console.log(text);')+'\\n  }catch(err){console.error(err)}\\n}';document.getElementById('pxs-code-php').textContent=php;document.getElementById('pxs-code-js').textContent=js;document.getElementById('pxs-modal').classList.add('open')}function switchTab(tab){activeTab=tab;document.querySelectorAll('.pxs-tab').forEach(t=>t.classList.toggle('active',t.textContent.toLowerCase().includes(tab==='php'?'php':'javascript')));document.getElementById('pxs-code-php').classList.toggle('active',tab==='php');document.getElementById('pxs-code-js').classList.toggle('active',tab==='js')}async function copyCode(){const text=activeTab==='php'?document.getElementById('pxs-code-php').textContent:document.getElementById('pxs-code-js').textContent;await navigator.clipboard.writeText(text);const btn=document.querySelector('#pxs-modal-foot .pxs-btn-blue');btn.textContent='✅ Copied!';btn.style.background='#10b981';setTimeout(()=>{btn.textContent='📋 Copy Code';btn.style.background=''},2000)}async function copyJson(btn){await navigator.clipboard.writeText(btn.parentElement.textContent.replace('📋 Copy','').trim());const old=btn.textContent;btn.textContent='✅';setTimeout(()=>btn.textContent=old,1500)}
</script>`;
}

function processHtml(html, targetUrl, currentProxyUrl, assetProxyBase, fullProxy) {
  const $ = cheerio.load(html, { decodeEntities: false });
  const parsed = new URL(targetUrl);
  
  let pathname = parsed.pathname;
  if (!pathname.endsWith('/')) {
    const lastSlash = pathname.lastIndexOf('/');
    pathname = lastSlash >= 0 ? pathname.substring(0, lastSlash + 1) : '/';
  }
  const baseUrl = parsed.origin + pathname;

  if ($('head').length) $('head').prepend(`<base href="${baseUrl}">`);
  else if ($('html').length) $('html').prepend(`<head><base href="${baseUrl}"></head>`);

  $('head').prepend(generateInterceptor(targetUrl, currentProxyUrl, assetProxyBase));

  if (fullProxy) {
    $('img, script, link[rel="stylesheet"], iframe, video, source, embed, input[type="image"]').each((_, el) => {
      const attr = $(el).is('link') ? 'href' : 'src';
      const val = $(el).attr(attr);
      if (!val) return;
      let newUrl = val;
      if (val.startsWith('//')) newUrl = assetProxyBase + '?url=https:' + encodeURIComponent(val);
      else if (val.startsWith('http')) newUrl = assetProxyBase + '?url=' + encodeURIComponent(val);
      else if (val.startsWith('/')) newUrl = assetProxyBase + '?url=' + encodeURIComponent('https://' + parsed.host + val);
      if (newUrl !== val) $(el).attr(attr, newUrl);
    });
  }

  const dashboard = generateDashboard(currentProxyUrl);
  if ($('body').length) $('body').append(dashboard);
  else $.root().append(dashboard);

  return $.html();
}

// ============================================
// ROUTES
// ============================================

app.get('/', (req, res) => {
  const checked = req.query.full_proxy ? 'checked' : '';
  res.send(`<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Proxy Tracker v2</title>
<style>*{box-sizing:border-box;font-family:'Segoe UI',system-ui,sans-serif}body{background:linear-gradient(135deg,#0f172a,#1e293b);display:flex;justify-content:center;align-items:center;height:100vh;margin:0;color:#f8fafc}.container{background:#1e293b;padding:35px 30px;border-radius:16px;box-shadow:0 20px 40px rgba(0,0,0,0.6);width:100%;max-width:450px;border:1px solid #334155}h2{margin:0 0 5px;text-align:center;font-size:1.8rem}.subtitle{color:#94a3b8;font-size:.95rem;text-align:center;margin-bottom:25px}.input-group{display:flex;gap:10px;margin-bottom:15px}input[type="url"]{flex:1;padding:12px 15px;background:#0f172a;border:1px solid #475569;border-radius:8px;font-size:1rem;color:#e2e8f0;outline:none}input:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,0.3)}.btn{padding:12px 15px;border:none;border-radius:8px;font-size:1rem;cursor:pointer;transition:.2s;font-weight:600}.btn-paste{background:#334155;color:#e2e8f0;border:1px solid #475569}.btn-submit{background:linear-gradient(135deg,#3b82f6,#6366f1);color:white;width:100%;box-shadow:0 4px 15px rgba(59,130,246,0.4)}.btn-submit:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(59,130,246,0.6)}.error{color:#f87171;background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.3);border-radius:6px;padding:10px;text-align:center;font-size:.9rem;margin-bottom:15px;display:none}.info-box{margin-top:20px;padding:15px;background:#0f172a;border-left:4px solid #3b82f6;border-radius:6px;font-size:.85rem;color:#cbd5e1;line-height:1.5}.check-wrap{margin:10px 0;color:#94a3b8;font-size:.9rem}</style>
</head><body>
<div class="container"><h2>🚀 Proxy Tracker v2</h2><p class="subtitle">Masukkan URL target untuk dilacak</p>
<form id="form" method="GET" action="/proxy"><div class="error" id="err">URL harus diawali http:// atau https://</div>
<div class="input-group"><input type="url" id="url" name="url" placeholder="https://example.com" required><button type="button" class="btn btn-paste" onclick="paste()">📋 Paste</button></div>
<div class="check-wrap"><label><input type="checkbox" name="full_proxy" value="1" ${checked}> Aktifkan Full Proxy (Bypass CORS)</label></div>
<button type="submit" class="btn btn-submit">Buka & Mulai Melacak 🚀</button></form>
<div class="info-box"><strong>ℹ️ Info:</strong><br>Catch-all proxy + MutationObserver untuk asset dinamis.</div></div>
<script>async function paste(){try{document.getElementById('url').value=await navigator.clipboard.readText()}catch{alert('Clipboard access denied')}}document.getElementById('form').addEventListener('submit',e=>{const v=document.getElementById('url').value.trim();if(!v.match(/^https?:\\/\\//)){e.preventDefault();document.getElementById('err').style.display='block'}});</script>
</body></html>`);
});

app.get('/proxy', async (req, res) => {
  const targetUrl = req.query.url;
  const fullProxy = req.query.full_proxy === '1';
  
  if (!targetUrl || !targetUrl.match(/^https?:\/\/.+/)) {
    return res.status(400).send('<h3>Invalid URL. <a href="/">Back</a></h3>');
  }
  
  // Set cookie untuk catch-all route
  setTargetCookie(res, targetUrl, fullProxy);
  
  try {
    const axiosRes = await axios.get(targetUrl, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'text/html,application/xhtml+xml' },
      timeout: 30000, maxRedirects: 10, validateStatus: () => true, responseType: 'text'
    });
    
    if (axiosRes.status >= 400) {
      return res.status(axiosRes.status).send(`<h3>HTTP Error ${axiosRes.status}. <a href="/">Back</a></h3>`);
    }
    
    const contentType = axiosRes.headers['content-type'] || '';
    if (!contentType.includes('text/html')) {
      res.set('Content-Type', contentType);
      return res.send(axiosRes.data);
    }
    
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const currentProxyUrl = `${protocol}://${host}/proxy?url=${encodeURIComponent(targetUrl)}${fullProxy ? '&full_proxy=1' : ''}`;
    const assetProxyBase = `${protocol}://${host}/asset-proxy`;
    
    const processed = processHtml(axiosRes.data, targetUrl, currentProxyUrl, assetProxyBase, fullProxy);
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(processed);
    
  } catch (err) {
    console.error('Proxy Error:', err.message);
    res.status(500).send(`<h3>Proxy Error: ${err.message}. <a href="/">Back</a></h3>`);
  }
});

// ============================================
// ASSET PROXY (ALL METHODS)
// ============================================
app.all('/asset-proxy', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl || !targetUrl.match(/^https?:\/\/.+/)) {
    return res.status(400).send('URL parameter required');
  }
  try {
    const forwardHeaders = {};
    Object.keys(req.headers).forEach(key => {
      if (!['host', 'connection', 'content-length', 'accept-encoding'].includes(key.toLowerCase())) {
        forwardHeaders[key] = req.headers[key];
      }
    });
    forwardHeaders['User-Agent'] = USER_AGENT;
    
    const response = await axios({
      method: req.method,
      url: targetUrl,
      headers: forwardHeaders,
      data: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
      timeout: 30000,
      responseType: 'arraybuffer',
      maxRedirects: 10,
      validateStatus: () => true
    });
    
    ['content-type', 'cache-control', 'etag', 'last-modified', 'content-length'].forEach(h => {
      if (response.headers[h]) res.set(h, response.headers[h]);
    });
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.set('Access-Control-Allow-Headers', '*');
    
    res.status(response.status).send(response.data);
  } catch (err) {
    res.status(502).send('Asset proxy error: ' + err.message);
  }
});

app.post('/logger', (req, res) => {
  console.log('[LOGGER]', JSON.stringify(req.body));
  res.json({ success: true });
});

// ============================================
// CATCH-ALL: Tangani /cdn-cgi/, /path, dll
// ============================================
app.all('*', async (req, res) => {
  const { target, full } = getTargetFromCookie(req);
  
  // Jika tidak ada cookie target, tolak
  if (!target) {
    return res.status(404).send('<h3>404 - Not Found. <a href="/">Go Home</a></h3>');
  }
  
  // Construct target URL: origin target + path request + query string
  const parsedTarget = new URL(target);
  let targetPath = req.path;
  if (!targetPath.startsWith('/')) targetPath = '/' + targetPath;
  
  const finalUrl = parsedTarget.origin + targetPath + (req.url.includes('?') ? '?' + req.url.split('?')[1] : '');
  
  try {
    const forwardHeaders = {};
    Object.keys(req.headers).forEach(key => {
      if (!['host', 'connection', 'content-length', 'accept-encoding', 'cookie'].includes(key.toLowerCase())) {
        forwardHeaders[key] = req.headers[key];
      }
    });
    forwardHeaders['User-Agent'] = USER_AGENT;
    if (req.headers.referer) forwardHeaders['Referer'] = target;
    
    const response = await axios({
      method: req.method,
      url: finalUrl,
      headers: forwardHeaders,
      data: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
      timeout: 30000,
      responseType: 'arraybuffer',
      maxRedirects: 10,
      validateStatus: () => true
    });
    
    ['content-type', 'cache-control', 'etag', 'last-modified', 'content-length'].forEach(h => {
      if (response.headers[h]) res.set(h, response.headers[h]);
    });
    res.set('Access-Control-Allow-Origin', '*');
    
    res.status(response.status).send(response.data);
    
  } catch (err) {
    console.error('Catch-all Proxy Error:', err.message, 'URL:', finalUrl);
    res.status(502).send('Proxy error: ' + err.message);
  }
});

module.exports = app;
