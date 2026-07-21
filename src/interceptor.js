const { EXTERNAL_LOGGER } = require('./config');

function generateInterceptor(targetUrl, currentProxyUrl, assetProxyBase) {
  return `
<script>
(function() {
  'use strict';
  
  window.__PXS = {
    logs: [],
    lastRequest: null,
    loggerUrl: '${EXTERNAL_LOGGER}',
    assetProxy: '${assetProxyBase}',
    targetOrigin: new URL('${targetUrl}').origin
  };

  function pxsSend(action, details) {
    try {
      const payload = {
        timestamp: new Date().toISOString(),
        source: window.location.href,
        action: action,
        details: details
      };
      navigator.sendBeacon && navigator.sendBeacon(window.__PXS.loggerUrl, JSON.stringify(payload));
    } catch(e) {}
  }

  function pxsBuffer(url, method, data) {
    if (window.printToDashboard) {
      window.printToDashboard(url, method, data);
    } else {
      window.__PXS.logs.push({url, method, data, time: Date.now()});
    }
  }

  // Save originals
  const origFetch = window.fetch;
  const origXHR = window.XMLHttpRequest;
  const origSendBeacon = navigator.sendBeacon;

  // --- FETCH INTERCEPTOR ---
  window.fetch = async function(resource, init) {
    let url = resource instanceof Request ? resource.url : resource;
    let method = (init?.method || (resource instanceof Request ? resource.method : 'GET')).toUpperCase();
    
    if (typeof url === 'string' && url.includes(window.__PXS.loggerUrl)) {
      return origFetch.apply(this, arguments);
    }

    pxsSend('network_request', { url, method, type: 'fetch' });

    // CORS Bypass: redirect external requests through asset-proxy
    let finalUrl = url;
    let isProxied = false;
    try {
      const urlObj = new URL(url, window.location.href);
      const currentHost = window.location.hostname;
      if (urlObj.hostname !== currentHost && urlObj.protocol.startsWith('http')) {
        finalUrl = window.__PXS.assetProxy + '?url=' + encodeURIComponent(url);
        isProxied = true;
        if (resource instanceof Request) {
          arguments[0] = finalUrl;
        } else {
          arguments[0] = finalUrl;
        }
      }
    } catch(e) {}

    try {
      const response = await origFetch.apply(this, arguments);
      let body = "[Unable to read]";
      try {
        const clone = response.clone();
        const text = await clone.text();
        body = text.length > 50000 ? text.substring(0, 50000) + '\\n...[truncated]' : text;
      } catch(e) {}
      
      pxsBuffer(url, method, body);
      
      if (typeof url === 'string' && !/\\.(css|js|png|jpg|jpeg|gif|svg|woff2?|ttf|ico)$/i.test(url)) {
        window.__PXS.lastRequest = { url, method, data: body };
      }
      return response;
    } catch(err) {
      pxsBuffer(url, method, "[Error: " + err.message + "]");
      throw err;
    }
  };

  // --- XHR INTERCEPTOR ---
  window.XMLHttpRequest = function() {
    const xhr = new origXHR();
    let _method = 'GET', _url = '';

    const origOpen = xhr.open;
    xhr.open = function(method, url, ...rest) {
      _method = (method || 'GET').toUpperCase();
      _url = typeof url === 'string' ? url : String(url);
      return origOpen.apply(this, [method, url, ...rest]);
    };

    xhr.addEventListener('load', function() {
      if (typeof _url === 'string' && _url.includes(window.__PXS.loggerUrl)) return;
      let body = "[Binary or unreadable]";
      try {
        if (!xhr.responseType || xhr.responseType === 'text') body = xhr.responseText;
        else if (xhr.responseType === 'json') body = JSON.stringify(xhr.response);
      } catch(e) {}
      pxsBuffer(_url, _method, body);
      
      if (typeof _url === 'string' && !/\\.(css|js|png|jpg|jpeg|gif|svg|woff2?|ttf|ico)$/i.test(_url)) {
        let absUrl = _url;
        try { absUrl = new URL(_url, document.baseURI).href; } catch(e){}
        window.__PXS.lastRequest = { url: absUrl, method: _method, data: body };
      }
    });

    xhr.addEventListener('error', function() {
      pxsBuffer(_url, _method, "[XHR Network Error]");
    });

    return xhr;
  };

  // Log visit
  pxsSend('visit', { target_url: '${targetUrl}', proxy_url: '${currentProxyUrl}' });
})();
</script>`;
}

module.exports = { generateInterceptor };
