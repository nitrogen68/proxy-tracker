function processHtml(html, targetUrl, currentProxyUrl, assetProxyBase, fullProxy) {
  const $ = cheerio.load(html, { decodeEntities: false });
  const parsed = new URL(targetUrl);
  
  // ✅ PERBAIKAN: baseUrl tanpa regex bermasalah
  let pathname = parsed.pathname;
  if (!pathname.endsWith('/')) {
    pathname = pathname.substring(0, pathname.lastIndexOf('/') + 1);
  }
  const baseUrl = parsed.origin + pathname;

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
