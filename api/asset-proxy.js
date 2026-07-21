const axios = require('axios');
const { USER_AGENT, TIMEOUT } = require('../src/config');

module.exports = async (req, res) => {
  const targetUrl = req.query.url;
  
  if (!targetUrl || !targetUrl.match(/^https?:\/\/.+/)) {
    return res.status(400).send('URL parameter required');
  }
  
  try {
    const response = await axios({
      method: req.method,
      url: targetUrl,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': req.headers.accept || '*/*',
        'Referer': req.headers.referer || ''
      },
      timeout: TIMEOUT,
      responseType: 'arraybuffer',
      maxRedirects: 10,
      validateStatus: () => true
    });
    
    // Forward relevant headers
    const fwd = ['content-type', 'cache-control', 'etag', 'last-modified', 'content-length'];
    fwd.forEach(h => {
      if (response.headers[h]) res.set(h, response.headers[h]);
    });
    
    // CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    
    res.status(response.status).send(response.data);
    
  } catch (err) {
    res.status(500).send('Asset proxy error: ' + err.message);
  }
};
