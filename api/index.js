const express = require('express');
const { fetchTarget, processHtml } = require('../src/proxy-engine');
const { PORT } = require('../src/config');

const app = express();
app.use(express.json());

// UI Form
app.get('/', (req, res) => {
  const checked = req.query.full_proxy ? 'checked' : '';
  res.send(`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Proxy Tracker v2.0</title>
  <style>
    *{box-sizing:border-box;font-family:'Segoe UI',system-ui,sans-serif}
    body{background:linear-gradient(135deg,#0f172a,#1e293b);display:flex;justify-content:center;align-items:center;height:100vh;margin:0;color:#f8fafc}
    .container{background:#1e293b;padding:35px 30px;border-radius:16px;box-shadow:0 20px 40px rgba(0,0,0,0.6);width:100%;max-width:450px;border:1px solid #334155}
    h2{margin:0 0 5px;text-align:center;font-size:1.8rem}
    .subtitle{color:#94a3b8;font-size:.95rem;text-align:center;margin-bottom:25px}
    .input-group{display:flex;gap:10px;margin-bottom:15px}
    input[type="url"]{flex:1;padding:12px 15px;background:#0f172a;border:1px solid #475569;border-radius:8px;font-size:1rem;color:#e2e8f0;outline:none}
    input:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,0.3)}
    .btn{padding:12px 15px;border:none;border-radius:8px;font-size:1rem;cursor:pointer;transition:.2s;font-weight:600}
    .btn-paste{background:#334155;color:#e2e8f0;border:1px solid #475569}
    .btn-submit{background:linear-gradient(135deg,#3b82f6,#6366f1);color:white;width:100%;box-shadow:0 4px 15px rgba(59,130,246,0.4)}
    .btn-submit:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(59,130,246,0.6)}
    .error{color:#f87171;background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.3);border-radius:6px;padding:10px;text-align:center;font-size:.9rem;margin-bottom:15px;display:none}
    .info-box{margin-top:20px;padding:15px;background:#0f172a;border-left:4px solid #3b82f6;border-radius:6px;font-size:.85rem;color:#cbd5e1;line-height:1.5}
    .check-wrap{margin:10px 0;color:#94a3b8;font-size:.9rem}
  </style>
</head>
<body>
  <div class="container">
    <h2>🚀 Proxy Tracker v2</h2>
    <p class="subtitle">Masukkan URL target untuk dilacak</p>
    <form id="form" method="GET" action="/proxy">
      <div class="error" id="err">URL harus diawali http:// atau https://</div>
      <div class="input-group">
        <input type="url" id="url" name="url" placeholder="https://example.com" required>
        <button type="button" class="btn btn-paste" onclick="paste()">📋 Paste</button>
      </div>
      <div class="check-wrap">
        <label><input type="checkbox" name="full_proxy" value="1" ${checked}> Aktifkan Full Proxy (Bypass CORS)</label>
      </div>
      <button type="submit" class="btn btn-submit">Buka & Mulai Melacak 🚀</button>
    </form>
    <div class="info-box">
      <strong>ℹ️ Info:</strong><br>
      Versi Node.js ini menggunakan Cheerio untuk manipulasi HTML yang lebih akurat dan Express untuk performa lebih baik.
    </div>
  </div>
  <script>
    async function paste(){try{document.getElementById('url').value=await navigator.clipboard.readText()}catch{alert('Clipboard access denied')}}
    document.getElementById('form').addEventListener('submit',e=>{
      const v=document.getElementById('url').value.trim();
      if(!v.match(/^https?:\\/\\//)){e.preventDefault();document.getElementById('err').style.display='block';}
    });
  </script>
</body>
</html>`);
});

// Proxy Handler
app.get('/proxy', async (req, res) => {
  const targetUrl = req.query.url;
  const fullProxy = req.query.full_proxy === '1';
  
  if (!targetUrl || !targetUrl.match(/^https?:\/\/.+/)) {
    return res.status(400).send('<h3>Invalid URL. <a href="/">Back</a></h3>');
  }
  
  try {
    const axiosRes = await fetchTarget(targetUrl);
    
    if (axiosRes.status >= 400) {
      return res.status(axiosRes.status).send(`<h3>HTTP Error ${axiosRes.status}. <a href="/">Back</a></h3>`);
    }
    
    const contentType = axiosRes.headers['content-type'] || '';
    
    // Jika bukan HTML, proxy langsung
    if (!contentType.includes('text/html')) {
      res.set('Content-Type', contentType);
      return res.send(axiosRes.data);
    }
    
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const basePath = '/';
    
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

// Vercel serverless compatibility
if (process.env.VERCEL) {
  module.exports = app;
} else {
  app.listen(PORT, () => console.log(`Proxy Tracker running on port ${PORT}`));
}
