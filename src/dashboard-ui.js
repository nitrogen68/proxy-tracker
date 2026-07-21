function generateDashboard(currentProxyUrl) {
  return `
<!-- PXS DASHBOARD -->
<style>
#pxs-root, #pxs-root * { box-sizing:border-box!important; font-family:'Segoe UI',system-ui,sans-serif!important; margin:0;padding:0; }
#pxs-root { position:fixed!important; bottom:20px!important; right:20px!important; width:min(420px,calc(100vw - 40px))!important; z-index:2147483647!important; }
#pxs-toolbar { position:fixed!important; top:20px!important; left:20px!important; z-index:2147483648!important; display:flex!important; gap:8px!important; }
.pxs-pill { display:flex!important; align-items:center!important; gap:6px!important; background:#1e293b!important; color:#f8fafc!important; padding:10px 14px!important; border-radius:8px!important; text-decoration:none!important; font-size:13px!important; font-weight:600!important; border:1px solid #3b82f6!important; box-shadow:0 4px 15px rgba(0,0,0,0.5)!important; cursor:pointer!important; transition:all .15s!important; }
.pxs-pill:hover { background:#3b82f6!important; transform:scale(1.05)!important; }
#pxs-card { background:#111827!important; border:1px solid #3b82f6!important; border-radius:12px!important; box-shadow:0 20px 50px rgba(0,0,0,0.5)!important; overflow:hidden!important; display:flex!important; flex-direction:column!important; max-height:min(480px,calc(100vh - 100px))!important; }
#pxs-header { background:linear-gradient(135deg,#3b82f6,#6366f1)!important; color:#fff!important; padding:10px 14px!important; display:flex!important; justify-content:space-between!important; align-items:center!important; cursor:pointer!important; user-select:none!important; }
#pxs-title { font-weight:700!important; font-size:13px!important; display:flex!important; align-items:center!important; gap:8px!important; }
#pxs-badge { background:#ef4444!important; color:#fff!important; border-radius:12px!important; padding:2px 8px!important; font-size:11px!important; display:none!important; font-weight:700!important; }
#pxs-badge.show { display:inline-block!important; }
#pxs-actions { display:flex!important; gap:6px!important; }
.pxs-btn-sm { border:none!important; color:#fff!important; cursor:pointer!important; font-weight:600!important; font-size:11px!important; border-radius:6px!important; padding:6px 10px!important; }
.pxs-btn-green { background:#10b981!important; } .pxs-btn-green:hover { background:#059669!important; }
.pxs-btn-red { background:#ef4444!important; } .pxs-btn-red:hover { background:#dc2626!important; }
#pxs-toggle { background:rgba(255,255,255,0.15)!important; width:26px!important; height:26px!important; display:flex!important; align-items:center!important; justify-content:center!important; border-radius:6px!important; font-size:14px!important; }
#pxs-body { flex:1!important; overflow-y:auto!important; background:#0a0a0f!important; padding:12px!important; display:none!important; }
#pxs-body.open { display:block!important; }
.pxs-log { margin-bottom:12px!important; border-bottom:1px dashed #333!important; padding-bottom:8px!important; animation:pxsFadeIn .3s!important; }
@keyframes pxsFadeIn { from{opacity:0;transform:translateY(5px);} to{opacity:1;transform:translateY(0);} }
.pxs-meta { color:#60a5fa!important; font-size:11px!important; font-family:monospace!important; word-break:break-all!important; margin-bottom:4px!important; display:flex!important; gap:6px!important; align-items:baseline!important; }
.pxs-tag { font-size:10px!important; font-weight:700!important; padding:2px 6px!important; border-radius:4px!important; flex-shrink:0!important; }
.pxs-tag-get { background:#1d4ed8!important; color:#fff!important; }
.pxs-tag-post { background:#b45309!important; color:#fff!important; }
.pxs-tag-other { background:#4b5563!important; color:#fff!important; }
.pxs-data { color:#e2e8f0!important; font-size:11px!important; font-family:'Consolas',monospace!important; background:#1f2937!important; padding:10px!important; border-radius:6px!important; overflow-x:auto!important; white-space:pre-wrap!important; word-break:break-all!important; position:relative!important; }
.pxs-copy { position:absolute!important; top:8px!important; right:8px!important; background:#2563eb!important; color:#fff!important; border:none!important; border-radius:4px!important; padding:4px 8px!important; cursor:pointer!important; font-size:11px!important; font-weight:600!important; }
.pxs-copy:hover { background:#1d4ed8!important; }

/* Modal */
#pxs-modal { display:none!important; position:fixed!important; inset:0!important; background:rgba(0,0,0,0.8)!important; z-index:2147483650!important; align-items:center!important; justify-content:center!important; padding:20px!important; }
#pxs-modal.open { display:flex!important; }
#pxs-modal-box { background:#1e1e1e!important; width:100%!important; max-width:720px!important; max-height:85vh!important; border-radius:10px!important; overflow:hidden!important; display:flex!important; flex-direction:column!important; border:1px solid #333!important; }
#pxs-modal-head { background:#1f2937!important; color:#fff!important; padding:14px 18px!important; display:flex!important; justify-content:space-between!important; align-items:center!important; }
#pxs-modal-tabs { display:flex!important; background:#171717!important; border-bottom:1px solid #333!important; }
.pxs-tab { background:transparent!important; border:none!important; color:#9ca3af!important; font-size:13px!important; font-weight:600!important; padding:10px 18px!important; cursor:pointer!important; border-bottom:2px solid transparent!important; }
.pxs-tab.active { color:#3b82f6!important; border-bottom-color:#3b82f6!important; }
#pxs-modal-body { flex:1!important; overflow-y:auto!important; background:#141414!important; }
#pxs-code-php, #pxs-code-js { margin:0!important; padding:18px!important; color:#4ade80!important; font-family:'Consolas',monospace!important; font-size:12.5px!important; white-space:pre-wrap!important; word-break:break-all!important; display:none!important; }
#pxs-code-php.active, #pxs-code-js.active { display:block!important; }
#pxs-modal-foot { background:#1a1a1a!important; padding:12px 18px!important; display:flex!important; justify-content:flex-end!important; gap:10px!important; border-top:1px solid #333!important; }
.pxs-btn { border:none!important; padding:9px 16px!important; border-radius:6px!important; font-weight:700!important; cursor:pointer!important; font-size:13px!important; color:#fff!important; transition:.2s!important; }
.pxs-btn-blue { background:#3b82f6!important; } .pxs-btn-blue:hover { background:#2563eb!important; }
.pxs-btn-gray { background:#374151!important; } .pxs-btn-gray:hover { background:#4b5563!important; }
@media(max-width:480px){ #pxs-root{right:10px!important;left:10px!important;width:auto!important;} #pxs-toolbar{top:10px!important;left:10px!important;} }
</style>

<div id="pxs-toolbar">
  <a href="/" class="pxs-pill">🏠 Home</a>
  <a href="${currentProxyUrl}" class="pxs-pill" onclick="this.querySelector('span').style.animation='spin 1s linear infinite'">🔄 <span>Refresh</span></a>
</div>

<div id="pxs-modal">
  <div id="pxs-modal-box">
    <div id="pxs-modal-head"><span>🚀 Generated API Code</span><button onclick="document.getElementById('pxs-modal').classList.remove('open')" style="background:transparent;border:none;color:#94a3b8;cursor:pointer;font-size:18px;">✖</button></div>
    <div id="pxs-modal-tabs">
      <button class="pxs-tab active" onclick="switchTab('php')">🐘 PHP</button>
      <button class="pxs-tab" onclick="switchTab('js')">🟨 JavaScript</button>
    </div>
    <div id="pxs-modal-body">
      <pre id="pxs-code-php" class="active"></pre>
      <pre id="pxs-code-js"></pre>
    </div>
    <div id="pxs-modal-foot">
      <button class="pxs-btn pxs-btn-blue" onclick="copyCode()">📋 Copy Code</button>
      <button class="pxs-btn pxs-btn-gray" onclick="document.getElementById('pxs-modal').classList.remove('open')">Close</button>
    </div>
  </div>
</div>

<div id="pxs-root">
  <div id="pxs-card">
    <div id="pxs-header">
      <div id="pxs-title">📡 Live Sniffer <span id="pxs-badge">0</span></div>
      <div id="pxs-actions">
        <button class="pxs-btn-sm pxs-btn-red" onclick="clearLogs(event)">🗑️ Clear</button>
        <button class="pxs-btn-sm pxs-btn-green" onclick="generateCode(event)">⚡ Get Endpoint</button>
        <div id="pxs-toggle">+</div>
      </div>
    </div>
    <div id="pxs-body">
      <div style="color:#4ade80;font-size:12px;font-family:monospace;">[System] Sniffer Active. Waiting for requests...</div>
    </div>
  </div>
</div>

<script>
let isOpen = false, unread = 0, count = 0, activeTab = 'php';
const body = document.getElementById('pxs-body');
const badge = document.getElementById('pxs-badge');
const toggle = document.getElementById('pxs-toggle');

document.getElementById('pxs-header').addEventListener('click', (e) => {
  if (e.target.closest('.pxs-btn-sm')) return;
  isOpen = !isOpen;
  body.classList.toggle('open', isOpen);
  toggle.textContent = isOpen ? '−' : '+';
  if (isOpen) { unread = 0; badge.classList.remove('show'); badge.textContent = '0'; body.scrollTop = body.scrollHeight; }
});

function clearLogs(e) { e.stopPropagation(); body.innerHTML = '<div style="color:#4ade80;font-size:12px;font-family:monospace;">[System] Log cleared.</div>'; count = 0; unread = 0; badge.classList.remove('show'); }
function escapeHtml(s) { return typeof s !== 'string' ? String(s) : s.replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

window.printToDashboard = function(url, method, data) {
  if (typeof url === 'string' && /\\.(css|js|png|jpg|jpeg|gif|svg|woff2?|ttf|ico)$/i.test(url)) return;
  
  let fmt = data;
  try { fmt = JSON.stringify(JSON.parse(data), null, 2); } catch(e) {
    if (typeof fmt !== 'string') fmt = String(fmt);
    if (fmt.length > 3000) fmt = fmt.substring(0, 3000) + '\\n...[truncated]';
  }
  
  const tagClass = method === 'GET' ? 'pxs-tag-get' : (method === 'POST' ? 'pxs-tag-post' : 'pxs-tag-other');
  const div = document.createElement('div');
  div.className = 'pxs-log';
  div.innerHTML = '<div class="pxs-meta"><span class="pxs-tag ' + tagClass + '">' + escapeHtml(method) + '</span><span>🎯 ' + escapeHtml(url) + '</span></div>' +
    '<div class="pxs-data"><button class="pxs-copy" onclick="copyJson(this)">📋 Copy</button>' + escapeHtml(fmt) + '</div>';
  body.appendChild(div);
  
  if (isOpen) body.scrollTop = body.scrollHeight;
  else { badge.textContent = ++unread; badge.classList.add('show'); }
};

// Flush buffered logs
if (window.__PXS && window.__PXS.logs.length) {
  window.__PXS.logs.forEach(l => window.printToDashboard(l.url, l.method, l.data));
}

function generateCode(e) {
  e.stopPropagation();
  const req = window.__PXS ? window.__PXS.lastRequest : null;
  if (!req) { alert('No API request captured yet!'); return; }
  
  let base = req.url, paramName = 'url', hasParam = false;
  try {
    const u = new URL(req.url);
    for (const [k, v] of u.searchParams) {
      if (v.startsWith('http') || ['url','link','q','api'].includes(k)) {
        paramName = k; hasParam = true;
        u.searchParams.delete(k);
        const sep = u.search ? '&' : '?';
        base = u.toString() + sep + k + '=';
        break;
      }
    }
  } catch(e) {}
  
  let parsed = null, isJson = false;
  try { parsed = JSON.parse(req.data); isJson = true; } catch(e) {}
  
  const php = \`<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

$baseApi = "\${base}";
\${hasParam ? \`if (!isset($_GET['\${paramName}']) || empty($_GET['\${paramName}'])) {
    http_response_code(400);
    echo json_encode(["success"=>false,"message"=>"Parameter required"]);
    exit;
}
$input = trim($_GET['\${paramName}']);
$endpoint = $baseApi . urlencode($input);
\` : \`$endpoint = $baseApi;\n\`}

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $endpoint,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_CUSTOMREQUEST => "\${req.method}",
    CURLOPT_HTTPHEADER => ["Accept: application/json","User-Agent: Mozilla/5.0"]
]);
$response = curl_exec($ch);
curl_close($ch);
echo $response;
?>\`;

  const js = \`const API_BASE = "\${base}";
async function fetchData(inputValue) {
  try {
    const url = API_BASE + (inputValue ? encodeURIComponent(inputValue) : '');
    const res = await fetch(url, { method: "\${req.method}", headers: {"Accept":"application/json"} });
    if (!res.ok) throw new Error("HTTP " + res.status);
    \${isJson ? 'const data = await res.json();\\n    console.log(data);\\n    return data;' : 'const text = await res.text();\\n    console.log(text);'}
  } catch(err) { console.error(err); }
}\`;

  document.getElementById('pxs-code-php').textContent = php;
  document.getElementById('pxs-code-js').textContent = js;
  document.getElementById('pxs-modal').classList.add('open');
}

function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.pxs-tab').forEach(t => t.classList.toggle('active', t.textContent.toLowerCase().includes(tab === 'php' ? 'php' : 'javascript')));
  document.getElementById('pxs-code-php').classList.toggle('active', tab === 'php');
  document.getElementById('pxs-code-js').classList.toggle('active', tab === 'js');
}

async function copyCode() {
  const text = activeTab === 'php' ? document.getElementById('pxs-code-php').textContent : document.getElementById('pxs-code-js').textContent;
  await navigator.clipboard.writeText(text);
  const btn = document.querySelector('#pxs-modal-foot .pxs-btn-blue');
  const old = btn.textContent; btn.textContent = '✅ Copied!'; btn.style.background = '#10b981';
  setTimeout(() => { btn.textContent = old; btn.style.background = ''; }, 2000);
}

async function copyJson(btn) {
  await navigator.clipboard.writeText(btn.parentElement.textContent.replace('📋 Copy', '').trim());
  const old = btn.textContent; btn.textContent = '✅'; setTimeout(() => btn.textContent = old, 1500);
}
</script>`;
}

module.exports = { generateDashboard };
