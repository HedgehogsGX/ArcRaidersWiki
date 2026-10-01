// Files in dist/ are served before this runs, so it only sees requests with no
// matching file. With html_handling "none" that includes "/", mapped here to
// index.html; everything else falls through to the normal 404.
export default {
  fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/') return env.ASSETS.fetch(new URL('/index.html', url));
    if (url.pathname.startsWith(NEWS_FULL)) return newsFull(request);
    return env.ASSETS.fetch(request);
  },
};

const NEWS_FULL = '/news-full/';
const MEDIA = 'https://assets.arcraiders.com/media/';
const MONTH = 30 * 24 * 3600;

// /news-full/<file>: a full-size news image from assets.arcraiders.com/media/
// (the data-full links in content/news.js), served from this site. That host
// sends no CORS headers, so the image viewer couldn't save or share the file,
// and it doesn't load in mainland China. ?download makes the browser save it.
// Cloudflare Pages runs this through functions/news-full/[name].js.
export async function newsFull(request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response(null, { status: 405, headers: { allow: 'GET, HEAD' } });
  const url = new URL(request.url);
  const name = url.pathname.slice(NEWS_FULL.length);
  let file = '';
  try {
    file = decodeURIComponent(name);
  } catch {
    /* malformed escape: not found */
  }
  if (!/^[^/\\]+\.(jpe?g|png|webp|gif)$/i.test(file)) return new Response('Not found', { status: 404 });

  const upstream = await fetch(MEDIA + encodeURIComponent(file), { cf: { cacheEverything: true, cacheTtl: MONTH } });
  const type = upstream.headers.get('content-type') || '';
  if (!upstream.ok || !type.startsWith('image/')) return new Response('Not found', { status: upstream.status >= 500 ? 502 : 404 });

  const headers = new Headers({ 'content-type': type, 'cache-control': `public, max-age=${MONTH}`, 'x-content-type-options': 'nosniff' });
  for (const key of ['content-length', 'etag', 'last-modified']) if (upstream.headers.has(key)) headers.set(key, upstream.headers.get(key));
  if (url.searchParams.has('download')) headers.set('content-disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file)}`);
  return new Response(request.method === 'HEAD' ? null : upstream.body, { headers });
}
