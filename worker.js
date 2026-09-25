// Files in dist/ are served before this runs, so it only sees requests with no
// matching file. With html_handling "none" that includes "/", mapped here to
// index.html; everything else falls through to the normal 404.
export default {
  fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/') return env.ASSETS.fetch(new URL('/index.html', url));
    return env.ASSETS.fetch(request);
  },
};
