/* Official news list with expandable articles, shared by the home page and
   pages/news.html. Content comes from content/news.js (scripts/fetch-news.mjs). */

(function () {
  const { html, raw, mount, t, L, asset } = ARC;
  const posts = (window.ARC_NEWS || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const opened = new Set();

  const tagName = (tag) => {
    const key = `news.tag.${tag.toLowerCase().replace(/\s+/g, '-')}`;
    const text = t(key);
    return text === key ? tag : text;
  };

  // Chinese when the post has been translated, English otherwise. Copied
  // images are stored relative to the site root (content/news-img/).
  const translated = (post) => Boolean(post.title.zh);
  const rooted = (s) => s.replace(/(<img\b[^>]*?\ssrc=")(?!https?:)/g, (m, before) => before + ARC.root);
  const blockHtml = (b) => raw(rooted((ARC.lang === 'zh' && b.zh) || b.en || b.html || ''));

  function block(b, i) {
    const style = `--i:${i}`;
    if (b.type === 'video')
      return html`<div class="news__video" style="${style}"><iframe src="https://www.youtube-nocookie.com/embed/${b.id}?rel=0"
        title="${b.title || 'YouTube'}" loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen"
        referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`;
    return html`<div class="news__block${b.type === 'image' ? ' news__block--image' : ''}" style="${style}">${blockHtml(b)}</div>`;
  }

  function body(post) {
    return html`<div class="news__body prose">
      ${ARC.lang === 'zh' && !translated(post) ? html`<p class="note news__lang" style="--i:0">${t('news.enOnly')}</p>` : ''}
      ${post.body.map((b, i) => block(b, i + 1))}
      <p class="news__source" style="--i:${Math.min(post.body.length + 1, 12)}">
        <a href="${post.url}" target="_blank" rel="noopener">${t('news.source')}</a></p>
    </div>`;
  }

  function article(post) {
    const open = opened.has(post.id);
    const other = ARC.alt(post.title);
    return html`<article class="news${open ? ' is-open' : ''}" id="news-${post.id}">
      <button class="news__head" type="button" aria-expanded="${open}" aria-controls="news-panel-${post.id}" data-news="${post.id}">
        <span class="news__thumb">${post.thumb ? html`<img src="${asset(post.thumb)}" alt="" loading="lazy" data-fallback>` : ''}</span>
        <span class="news__text">
          <span class="news__meta"><time datetime="${post.date}">${ARC.date(post.date)}</time>${post.tags.map(
            (tag) => html`<span class="tag">${tagName(tag)}</span>`
          )}</span>
          <strong class="news__title" id="news-title-${post.id}">${L(post.title)}</strong>
          ${other ? html`<span class="news__alt">${other}</span>` : ''}
        </span>
        <span class="news__toggle" aria-hidden="true"><i></i><i></i></span>
      </button>
      <div class="news__panel" id="news-panel-${post.id}" role="region" aria-labelledby="news-title-${post.id}">
        <div class="news__panel-inner">${open ? body(post) : ''}</div>
      </div>
    </article>`;
  }

  // Renders a list into `el`. Options: limit (number of posts), tags (filter).
  function renderNews(el, { limit, filter } = {}) {
    const list = posts.filter((p) => !filter || filter(p)).slice(0, limit || posts.length);
    el.classList.add('news-list');
    mount(el, list.length ? list.map(article) : html`<p class="empty">${t('news.empty')}</p>`);
  }

  function toggle(button) {
    const node = button.closest('.news');
    const id = button.dataset.news;
    const post = posts.find((p) => p.id === id);
    const inner = node.querySelector('.news__panel-inner');
    const open = !opened.has(id);
    if (open) {
      opened.add(id);
      // Body is built on first open so video iframes only load when read.
      if (!inner.firstElementChild) mount(inner, body(post));
    } else opened.delete(id);
    button.setAttribute('aria-expanded', String(open));
    // Next frame, so the closed layout is committed before the transition starts.
    requestAnimationFrame(() => node.classList.toggle('is-open', open));
    if (open) {
      const top = node.getBoundingClientRect().top;
      const header = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h'), 10) || 64;
      if (top < header) window.scrollTo({ top: window.scrollY + top - header - 12, behavior: 'smooth' });
    }
  }

  // Collapsing clears the body after the panel has closed, so closed articles stay light.
  document.addEventListener('transitionend', (e) => {
    if (!e.target.classList || !e.target.classList.contains('news__panel')) return;
    const node = e.target.closest('.news');
    if (!node.classList.contains('is-open')) mount(node.querySelector('.news__panel-inner'), '');
  });

  document.addEventListener('click', (e) => {
    const button = e.target.closest('.news__head[data-news]');
    if (button) toggle(button);
  });

  // #news-<id> in the address opens that post and brings it into view.
  function openFromHash() {
    const m = /^#news-(.+)$/.exec(decodeURIComponent(location.hash));
    const button = m && document.querySelector(`.news__head[data-news="${CSS.escape(m[1])}"]`);
    if (!button) return;
    if (!opened.has(m[1])) toggle(button);
    button.scrollIntoView({ block: 'start' });
  }

  ARC.news = { posts, renderNews, tagName, openFromHash };
})();
