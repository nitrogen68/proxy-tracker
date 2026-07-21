const axios = require('axios');
const cheerio = require('cheerio');
const { USER_AGENT, TIMEOUT } = require('./config');
const { generateInterceptor } = require('./interceptor');
const { generateDashboard } = require('./dashboard-ui');

async function fetchTarget(url) {
  const res = await axios.get(url, {
    headers: { 'User-Agent': USER_AGENT, 'Accept': 'text/html,application/xhtml+xml' },
    timeout: TIMEOUT,
    maxRedirects: 10,
    validateStatus: () => true,
    responseType: 'text'
  });
  return res;
}

function rewriteUrls($, targetHost, assetProxyBase) {
  const selectors = [
    ['src', 'img, script, iframe, embed, source, track'],
    ['href', 'link[rel="stylesheet"], a'],
    ['data-src', 'img'],
    ['poster', 'video'],
    ['action', 'form']
  ];
  
  selectors.forEach(([attr, sel]) => {
    $(sel).each((_, el) => {
      const val = $(el).attr(attr);
      if (!val) return;
      if (val.startsWith('//')) {
        $(el).attr(attr, assetProxyBase + '?url=https:' + encodeURIComponent(val));
      } else if (val.startsWith('http')) {
        $(el).attr(attr, assetProxyBase + '?url=' + encodeURIComponent(val));
      } else if (val.startsWith('/') && !val.startsWith('//')) {
        $(el).attr(attr, assetProxyBase + '?url=' + encodeURIComponent('https://' + targetHost + val));
      }
    });
  });
}

function processHtml(html, targetUrl, currentProxyUrl, assetProxyBase, fullProxy) {
  const $ = cheerio.load(html, { decodeEntities: false });
  const parsed = new URL(targetUrl);
  const baseUrl = parsed.origin + parsed.pathname.replace(/\\/[^\\/]*$/, '/') + '/';
  
  // Inject base tag
  if ($('head').length) {
    $('head').prepend(`<base href="${baseUrl}">`);
  } else if ($('html').length) {
    $('html').prepend(`<head><base href="${baseUrl}"></head>`);
  }
  
  // Inject interceptor
  const interceptor = generateInterceptor(targetUrl, currentProxyUrl, assetProxyBase);
  $('head').prepend(interceptor);
  
  // Rewrite asset URLs if full proxy enabled
  if (fullProxy) {
    rewriteUrls($, parsed.host, assetProxyBase);
  }
  
  // Inject dashboard UI before closing body
  const dashboard = generateDashboard(currentProxyUrl);
  if ($('body').length) {
    $('body').append(dashboard);
  } else {
    $.root().append(dashboard);
  }
  
  return $.html();
}

module.exports = { fetchTarget, processHtml };
