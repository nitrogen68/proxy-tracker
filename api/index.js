const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();

// ============================================
// BODY PARSERS (Penting untuk forward POST)
// ============================================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.raw({ type: '*/*', limit: '50mb' }));

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
const EXTERNAL_LOGGER = 'https://shtl.pw/proxy/logger.php';

// ============================================
// CLIENT-SIDE INTERCEPTOR (FIXED)
// ============================================
function generateInterceptor(targetUrl, currentProxyUrl, assetProxyBase) {
  return `<script>
(function(){
  window.__PXS={logs:[],lastRequest:null,loggerUrl:'${EXTERNAL_LOGGER}',assetProxy:'${assetProxyBase}',targetOrigin:new URL('${targetUrl}').origin};
  function send(a,d){try{navigator.sendBeacon(window.__PXS.loggerUrl,JSON.stringify({ts:new Date().toISOString(),src:location.href,action:a,details:d}))}catch(e){}}
  function buf(u,m,d){window.printToDashboard?window.printToDashboard(u,m,d):window.__PXS.logs.push({u,m,d,t:Date.now()})}
  const oF=window.fetch,oX=window.XMLHttpRequest;
  
  // Helper: resolve URL menggunakan base tag (document.baseURI)
  function resolveUrl(u){
    try{return new URL(u,document.baseURI||location.href).href}catch(e){return u}
  }
  
  window.fetch=async function(r,i){
    let u=r instanceof Request?r.url:r;
    let m=(i?.method||(r instanceof Request?r.method:'GET')).toUpperCase();
    
    // Resolve ke absolute URL berdasarkan <base href>
    u=resolveUrl(u);
    
    if(typeof u==='string'&&u.includes(window.__PXS.loggerUrl))return oF.apply(this,arguments);
    send('network_request',{url:u,method:m,type:'fetch'});
    
    // Rewrite ke asset-proxy jika domain luar
    let f=u;
    try{
      const o=new URL(u);
      const h=location.hostname;
      if(o.hostname!==h&&o.protocol.startsWith('http')){
        f=window.__PXS.assetProxy+'?url='+encodeURIComponent(u);
        if(r instanceof Request){
          // Clone request dengan URL baru
          const reqClone=new Request(f,{method:m,headers:i?.headers||r.headers,body:i?.body||r.body,mode:'cors',credentials:'omit'});
          arguments[0]=reqClone;
        }else{
          arguments[0]=f;
        }
      }
    }catch(e){}
    
    try{
      const res=await oF.apply(this,arguments);
      let b='[unreadable]';
      try{const c=res.clone(),t=await c.text();b=t.length>5e4?t.substring(0,5e4)+'\n...[truncated]':t}catch(e){}
      buf(u,m,b);
      if(typeof u==='string'&&!/\.(css|js|png|jpg|jpeg|gif|svg|woff2?|ttf|ico)$/i.test(u))window.__PXS.lastRequest={url:u,method:m,data:b};
      return res;
    }catch(err){
      buf(u,m,'[Error:'+err.message+']');
      throw err;
    }
  };
  
  window.XMLHttpRequest=function(){
    const x=new oX();
    let xm='GET',xu='';
    const oo=x.open;
    x.open=function(m,u,...rest){
      xm=(m||'GET').toUpperCase();
      xu=resolveUrl(typeof u==='string'?u:String(u));
      return oo.apply(this,[m,xu,...rest]);
    };
    x.addEventListener('load',function(){
      if(typeof xu==='string'&&xu.includes(window.__PXS.loggerUrl))return;
      let b='[binary]';
      try{if(!x.responseType||x.responseType==='text')b=x.responseText;else if(x.responseType==='json')b=JSON.stringify(x.response)}catch(e){}
      buf(xu,xm,b);
      if(typeof xu==='string'&&!/\.(css|js|png|jpg|jpeg|gif|svg|woff2?|ttf|ico)$/i.test(xu)){
        window.__PXS.lastRequest={url:xu,method:xm,data:b};
      }
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
  return `<!-- DASHBOARD --><style>#pxs-root,#pxs-root *{box-sizing:border-box!important;font-family:'Segoe UI',system-ui,sans-serif!important}#pxs-root{position:fixed!important;bottom:20px!important;[...]
let isOpen=0,unread=0,count=0,activeTab='php';const body=document.getElementById('pxs-body'),badge=document.getElementById('pxs-badge'),toggle=document.getElementById('pxs-toggle');document.getElement[...]
</script>`;
}

// ============================================
// HTML PROCESSOR
// ============================================
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

  // Fix root-relative and relative asset URLs when not using full proxy.
  if (!fullProxy) {
    $('img, script, link[rel="stylesheet"], iframe, video, source, embed, input[type="image"]').each((_, el) => {
      const attr = $(el).is('link') ? 'href' : 'src';
      const val = $(el).attr(attr);
      if (!val) return;
      // ignore data: and blob: and javascript: URLs
      if (val.startsWith('data:') || val.startsWith('blob:') || val.startsWith('javascript:')) return;
      if (val.startsWith('//')) {
        // protocol-relative -> make absolute with target protocol
        $(el).attr(attr, parsed.protocol + val);
      } else if (val.startsWith('http://') || val.startsWith('https://')) {
        // absolute url -> leave as-is
      } else if (val.startsWith('/')) {
        // root-relative -> point to target origin
        $(el).attr(attr, parsed.origin + val);
      } else {
        // relative path -> resolve against baseUrl
        $(el).attr(attr, baseUrl + val.replace(/^\.\//, ''));
      }
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
<style>*{box-sizing:border-box;font-family:'Segoe UI',system-ui,sans-serif}body{background:linear-gradient(135deg,#0f172a,#1e293b);display:flex;justify-content:center;align-items:center;height:100vh;m[...]
</head><body>
<div class="container"><h2>🚀 Proxy Tracker v2</h2><p class="subtitle">Masukkan URL target untuk dilacak</p>
<form id="form" method="GET" action="/proxy"><div class="error" id="err">URL harus diawali http:// atau https://</div>
<div class="input-group"><input type="url" id="url" name="url" placeholder="https://example.com" required><button type="button" class="btn btn-paste" onclick="paste()">📋 Paste</button></div>
<div class="check-wrap"><label><input type="checkbox" name="full_proxy" value="1" ${checked}> Aktifkan Full Proxy (Bypass CORS)</label></div>
<button type="submit" class="btn btn-submit">Buka & Mulai Melacak 🚀</button></form>
<div class="info-box"><strong>ℹ️ Info:</strong><br>Versi Node.js dengan POST support & base URI fix.</div></div>
<script>async function paste(){try{document.getElementById('url').value=await navigator.clipboard.readText()}catch{alert('Clipboard access denied')}}document.getElementById('form').addEventListener('s[...]
</body></html>`);
});

app.get('/proxy', async (req, res) => {
  const targetUrl = req.query.url;
  const fullProxy = req.query.full_proxy === '1';
  
  if (!targetUrl || !targetUrl.match(/^https?:\/\/.+/)) {
    return res.status(400).send('<h3>Invalid URL. <a href="/">Back</a></h3>');
  }
  
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
// ASSET PROXY - FIX: app.all() + body forward
// ============================================
app.all('/asset-proxy', async (req, res) => {
  const targetUrl = req.query.url;
  
  if (!targetUrl || !targetUrl.match(/^https?:\/\/.+/)) {
    return res.status(400).send('URL parameter required');
  }
  
  try {
    // Forward headers (filter yang tidak perlu)
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
    
    // Forward response headers
    ['content-type', 'cache-control', 'etag', 'last-modified', 'content-length'].forEach(h => {
      if (response.headers[h]) res.set(h, response.headers[h]);
    });
    
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.set('Access-Control-Allow-Headers', '*');
    
    res.status(response.status).send(response.data);
    
  } catch (err) {
    console.error('Asset Proxy Error:', err.message);
    res.status(502).send('Asset proxy error: ' + err.message);
  }
});

app.post('/logger', (req, res) => {
  console.log('[LOGGER]', JSON.stringify(req.body));
  res.json({ success: true });
});

module.exports = app;
