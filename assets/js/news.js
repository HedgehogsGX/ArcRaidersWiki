/* Official news list with expandable articles and a full-screen image viewer,
   shared by the home page and pages/news.html. Content comes from
   content/news.js (scripts/fetch-news.mjs). */

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
  // Images also become buttons that open the viewer.
  const rooted = (s) => s.replace(/(<img\b[^>]*?\ssrc=")(?!https?:)/g, (m, before) => before + ARC.root);
  const viewable = (s) => s.replace(/<img\b/g, () => `<img tabindex="0" role="button" aria-label="${ARC.esc(t('news.image.open'))}"`);
  const blockHtml = (b) => raw(viewable(rooted((ARC.lang === 'zh' && b.zh) || b.en || b.html || '')));

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
      <div class="news__dock"><button class="news__toggle news__close" type="button" aria-controls="news-panel-${post.id}"
        aria-label="${t('news.collapse')}"><i></i><i></i></button></div>
      <div class="news__panel" id="news-panel-${post.id}" role="region" aria-labelledby="news-title-${post.id}">
        <div class="news__panel-inner">${open ? body(post) : ''}</div>
      </div>
    </article>`;
  }

  const headerHeight = () => parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h'), 10) || 64;

  // A post whose minus has slid under the site header gets .is-past, which
  // shows the floating minus (.news__dock) while the post is open.
  const past = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        const line = e.rootBounds ? e.rootBounds.top : headerHeight();
        e.target.closest('.news').classList.toggle('is-past', e.intersectionRatio < 1 && e.boundingClientRect.top < line);
      }),
    { rootMargin: `-${headerHeight()}px 0px 0px 0px`, threshold: [0, 1] }
  );

  // Renders a list into `el`. Options: limit (number of posts), tags (filter).
  function renderNews(el, { limit, filter } = {}) {
    const list = posts.filter((p) => !filter || filter(p)).slice(0, limit || posts.length);
    el.querySelectorAll('.news__head .news__toggle').forEach((x) => past.unobserve(x));
    el.classList.add('news-list');
    mount(el, list.length ? list.map(article) : html`<p class="empty">${t('news.empty')}</p>`);
    el.querySelectorAll('.news__head .news__toggle').forEach((x) => past.observe(x));
  }

  function toggle(node, fromDock) {
    const head = node.querySelector('.news__head');
    const id = head.dataset.news;
    const post = posts.find((p) => p.id === id);
    const inner = node.querySelector('.news__panel-inner');
    const open = !opened.has(id);
    if (open) {
      opened.add(id);
      // Body is built on first open so video iframes only load when read.
      if (!inner.firstElementChild) mount(inner, body(post));
    } else opened.delete(id);
    head.setAttribute('aria-expanded', String(open));
    // Bring the head back under the site header. Closing jumps there before the
    // panel shrinks, so a long post folds up below its title instead of
    // dropping the reader somewhere further down the list.
    const top = node.getBoundingClientRect().top;
    const header = headerHeight();
    if (top < header) window.scrollTo({ top: window.scrollY + top - header - 12, behavior: open ? 'smooth' : 'instant' });
    // The floating minus disappears with the panel, so keep focus on the post.
    if (fromDock) head.focus({ preventScroll: true });
    // Next frame, so the closed layout is committed before the transition starts.
    requestAnimationFrame(() => node.classList.toggle('is-open', open));
  }

  // Collapsing clears the body after the panel has closed, so closed articles stay light.
  document.addEventListener('transitionend', (e) => {
    if (!e.target.classList || !e.target.classList.contains('news__panel')) return;
    const node = e.target.closest('.news');
    if (!node.classList.contains('is-open')) mount(node.querySelector('.news__panel-inner'), '');
  });

  document.addEventListener('click', (e) => {
    const button = e.target.closest('.news__head[data-news], .news__close');
    if (button) toggle(button.closest('.news'), button.classList.contains('news__close'));
  });

  // #news-<id> in the address opens that post and brings it into view.
  function openFromHash() {
    const m = /^#news-(.+)$/.exec(decodeURIComponent(location.hash));
    const button = m && document.querySelector(`.news__head[data-news="${CSS.escape(m[1])}"]`);
    if (!button) return;
    if (!opened.has(m[1])) toggle(button.closest('.news'));
    button.scrollIntoView({ block: 'start' });
  }

  // ---- image viewer ---------------------------------------------------------------

  // An article image opens full screen, with arrows (or a swipe) to the post's
  // other images. The copy on the page shows at once; the full-size original
  // from arcraiders.com (data-full, up to 3840px) replaces it once loaded. The
  // site serves originals at /news-full/<file> (worker.js) so they can be
  // downloaded, and on phones shared to the photo library. Where that route
  // doesn't exist (a plain static host) the original loads straight from
  // arcraiders.com and Download opens it there.
  const MEDIA = 'https://assets.arcraiders.com/media/';
  const KEEP = 4; // originals held in memory; they run to several MB each
  const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const shareFiles = (() => {
    try {
      return Boolean(navigator.canShare && navigator.canShare({ files: [new File([''], 'a.jpg', { type: 'image/jpeg' })] }));
    } catch (e) {
      return false;
    }
  })();
  const viewer = { dialog: null, list: [], index: 0, status: null, found: null, loads: new Map() };
  const fileName = (url) => {
    try {
      return decodeURIComponent(url.split(/[?#]/)[0].split('/').pop());
    } catch (e) {
      return 'image';
    }
  };

  // Resolves to { src, file }: an object URL and File when /news-full/ served it,
  // else the arcraiders.com URL itself and no file.
  function original(full) {
    if (viewer.loads.has(full)) return viewer.loads.get(full);
    const name = full.startsWith(MEDIA) ? full.slice(MEDIA.length) : '';
    const job = (name ? fetch(`${ARC.root}news-full/${name}`) : Promise.reject(new Error('not on the media host')))
      .then((res) => {
        if (!res.ok || !/^image\//.test(res.headers.get('content-type') || '')) throw new Error(res.status);
        return res.blob();
      })
      .then((blob) => ({ src: URL.createObjectURL(blob), file: new File([blob], fileName(full), { type: blob.type }) }))
      .catch(() => ({ src: full, file: null }));
    viewer.loads.set(full, job);
    if (viewer.loads.size > KEEP) {
      const [oldest, old] = viewer.loads.entries().next().value;
      viewer.loads.delete(oldest);
      old.then((x) => x.file && URL.revokeObjectURL(x.src));
    }
    return job;
  }

  const icon = {
    save: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0-12-4.5 4.5M12 3l4.5 4.5M5 12v8h14v-8" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>',
    download: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0-4.5-4.5M12 15l4.5-4.5M5 20h14" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>',
    close: '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M1 1l12 12M13 1 1 13" stroke="currentColor" stroke-width="1.6"/></svg>',
    prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
    next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
  };

  function build() {
    const d = document.createElement('dialog');
    d.className = 'viewer';
    d.tabIndex = -1;
    d.innerHTML = `<div class="viewer__stage"><img class="viewer__img" alt=""></div>
      <div class="viewer__bar">
        <span class="viewer__count num"></span>
        <span class="viewer__status" aria-live="polite"></span>
        <span class="viewer__actions">
          <button class="viewer__action" type="button" data-viewer="save" hidden>${icon.save}<span></span></button>
          <a class="viewer__action" data-viewer="download">${icon.download}<span></span></a>
          <button class="viewer__icon" type="button" data-viewer="close">${icon.close}</button>
        </span>
      </div>
      <button class="viewer__nav viewer__nav--prev" type="button" data-viewer="prev">${icon.prev}</button>
      <button class="viewer__nav viewer__nav--next" type="button" data-viewer="next">${icon.next}</button>`;
    document.body.append(d);

    const stage = d.querySelector('.viewer__stage');
    d.addEventListener('click', (e) => {
      const action = e.target.closest('[data-viewer]');
      if (action) return act(action.dataset.viewer);
      if (e.target.classList.contains('viewer__img')) zoom(!d.classList.contains('is-zoomed'), e);
      else if (e.target === stage || e.target === d) d.close();
    });
    // Arrow keys turn the page, or scroll a zoomed image.
    d.addEventListener('keydown', (e) => {
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !d.classList.contains('is-zoomed'))
        show(viewer.index + (e.key === 'ArrowLeft' ? -1 : 1));
    });
    d.addEventListener('close', () => {
      d.querySelector('.viewer__img').removeAttribute('src');
      viewer.found = null;
    });

    // A horizontal swipe turns the page, unless the image or the page is pinched in.
    let touch = null;
    stage.addEventListener(
      'touchstart',
      (e) => {
        const pinched = window.visualViewport && window.visualViewport.scale > 1.01;
        touch = e.touches.length === 1 && !pinched && !d.classList.contains('is-zoomed') ? e.touches[0] : null;
      },
      { passive: true }
    );
    stage.addEventListener('touchend', (e) => {
      const end = e.changedTouches[0];
      if (!touch || !end) return;
      const dx = end.clientX - touch.clientX;
      const dy = end.clientY - touch.clientY;
      touch = null;
      if (Math.abs(dx) > 50 && Math.abs(dy) < Math.abs(dx) / 2) show(viewer.index + (dx < 0 ? 1 : -1));
    });
    return d;
  }

  // Download is a plain link (see downloadLink) and needs nothing here.
  function act(name) {
    const d = viewer.dialog;
    if (name === 'close') d.close();
    else if (name === 'prev' || name === 'next') show(viewer.index + (name === 'prev' ? -1 : 1));
    else if (name === 'save' && viewer.found && viewer.found.file) {
      // Straight from the click: share() needs the user's gesture. On iPhone the
      // share sheet's Save Image puts the picture in Photos.
      navigator.share({ files: [viewer.found.file] }).catch(() => {});
    }
  }

  // Tapping the image switches between fitting the screen and its full size
  // (at least twice the fitted size), keeping the tapped point in place.
  function zoom(on, e) {
    const d = viewer.dialog;
    const stage = d.querySelector('.viewer__stage');
    const img = d.querySelector('.viewer__img');
    if (!on || !img.naturalWidth) {
      d.classList.remove('is-zoomed');
      img.style.width = '';
      return;
    }
    const fit = img.getBoundingClientRect();
    const width = Math.max(img.naturalWidth / (window.devicePixelRatio || 1), fit.width * 2);
    const scale = width / fit.width;
    const x = e ? e.clientX : fit.left + fit.width / 2;
    const y = e ? e.clientY : fit.top + fit.height / 2;
    d.classList.add('is-zoomed');
    img.style.width = `${width}px`;
    stage.scrollLeft = (x - fit.left) * scale - x;
    stage.scrollTop = (y - fit.top) * scale - y;
  }

  function status(key, vars) {
    viewer.status = key ? [key, vars] : null;
    viewer.dialog.querySelector('.viewer__status').textContent = key ? t(key, vars) : '';
  }

  function labels() {
    const d = viewer.dialog;
    d.setAttribute('aria-label', t('news.image.viewer'));
    d.querySelector('[data-viewer="save"] span').textContent = t(ios ? 'news.image.save' : 'news.image.share');
    d.querySelector('[data-viewer="download"] span').textContent = t('news.image.download');
    d.querySelector('[data-viewer="close"]').setAttribute('aria-label', t('site.close'));
    d.querySelector('[data-viewer="prev"]').setAttribute('aria-label', t('news.image.prev'));
    d.querySelector('[data-viewer="next"]').setAttribute('aria-label', t('news.image.next'));
    if (viewer.status) status(...viewer.status);
  }

  // The download link: the loaded original as a file, else /news-full/ asking
  // the server for an attachment, else (no such route) the original's own page.
  function downloadLink(item, found) {
    const a = viewer.dialog.querySelector('[data-viewer="download"]');
    const name = item.full.startsWith(MEDIA) ? item.full.slice(MEDIA.length) : '';
    a.removeAttribute('target');
    a.download = fileName(item.full || item.preview);
    if (found && found.file) a.href = found.src;
    else if (name && !found) a.href = `${ARC.root}news-full/${name}?download`;
    else if (item.full) {
      a.href = item.full;
      a.target = '_blank';
      a.rel = 'noopener';
      a.removeAttribute('download');
    } else a.href = item.preview;
  }

  function show(i) {
    const d = viewer.dialog;
    const list = viewer.list;
    viewer.index = (i + list.length) % list.length;
    const item = list[viewer.index];
    const img = d.querySelector('.viewer__img');
    const save = d.querySelector('[data-viewer="save"]');
    zoom(false);
    viewer.found = null;
    img.src = item.preview;
    img.alt = item.alt;
    d.querySelector('.viewer__count').textContent = list.length > 1 ? `${viewer.index + 1} / ${list.length}` : '';
    save.hidden = !shareFiles || !item.full;
    save.disabled = true;
    downloadLink(item, null);
    d.classList.remove('is-loading');
    if (!item.full) return status(null);

    d.classList.add('is-loading');
    status('news.image.loading');
    original(item.full).then((found) => {
      if (!d.open || list !== viewer.list || list[viewer.index] !== item) return;
      const done = (ok) => {
        if (list[viewer.index] !== item) return;
        d.classList.remove('is-loading');
        if (!ok) return status('news.image.failed');
        img.src = found.src;
        viewer.found = found;
        save.disabled = !found.file;
        downloadLink(item, found);
        status('news.image.size', { w: probe.naturalWidth, h: probe.naturalHeight });
      };
      const probe = new Image();
      probe.onload = () => done(true);
      probe.onerror = () => done(false);
      probe.src = found.src;
    });
  }

  function openViewer(img) {
    const body = img.closest('.news__body');
    const imgs = [...body.querySelectorAll('img')].filter((x) => !x.closest('a'));
    viewer.dialog = viewer.dialog || build();
    viewer.list = imgs.map((x) => ({ preview: x.currentSrc || x.src, full: x.dataset.full || '', alt: x.alt }));
    viewer.dialog.classList.toggle('is-single', imgs.length < 2);
    labels();
    viewer.dialog.showModal();
    // Focus the viewer itself: a focused button would show its ring after a tap.
    viewer.dialog.focus();
    show(imgs.indexOf(img));
  }

  const viewerTarget = (e) => {
    const img = e.target.closest && e.target.closest('.news__body img');
    return img && !img.closest('a') ? img : null;
  };
  document.addEventListener('click', (e) => {
    const img = viewerTarget(e);
    if (img) openViewer(img);
  });
  document.addEventListener('keydown', (e) => {
    const img = (e.key === 'Enter' || e.key === ' ') && viewerTarget(e);
    if (!img) return;
    e.preventDefault();
    openViewer(img);
  });
  document.addEventListener('arc:lang', () => viewer.dialog && labels());

  ARC.news = { posts, renderNews, tagName, openFromHash };
})();
