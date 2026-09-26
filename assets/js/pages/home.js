/* Home: hero search and live map conditions, section directory, newest items, latest official news. */

(function () {
  const { html, mount, t, L, url, link, asset, data, num, item, label } = ARC;
  const meta = data.meta;

  function renderHero() {
    mount('#hero-lede', t('home.lede'));
    const input = document.querySelector('.search--hero .search__input');
    input.placeholder = t('search.placeholder');
    input.setAttribute('aria-label', t('search.label'));
  }

  function renderDirectory() {
    mount(
      '#directory',
      html`<div class="section__head"><h2>${t('home.directory')}</h2></div>
      <div class="directory">
        ${ARC.sections.map((s) => {
          const links = ARC.pageLinks(s);
          const pages = links.filter((l) => !l.sub);
          const subs = links.filter((l) => l.sub);
          return html`<div class="directory__col" data-tone="${s.tone}">
            <h3>${t(`nav.${s.key}`)}</h3>
            <ul>
              ${pages.map(
                (l) => html`<li><a class="directory__link" href="${l.href}">
                  <span class="directory__name">${l.name}</span>
                  <span class="directory__count num">${num(l.count)}</span>
                  <span class="directory__desc">${t(`desc.${l.id}`)}</span></a></li>`
              )}
            </ul>
            ${subs.length
              ? html`<div class="directory__subs">${subs.map(
                  (l) => html`<a class="pill" href="${l.href}">${l.name}<span class="num">${l.count}</span></a>`
                )}</div>`
              : ''}
          </div>`;
        })}
      </div>`
    );
  }

  function renderRecent() {
    const ids = meta.recent || [];
    if (!ids.length) return;
    mount(
      '#recent',
      html`<div class="section__head"><h2>${t('home.recent', { version: meta.gameVersion })}</h2>
        <a class="section__more" href="${url('pages/items.html')}">${t('page.items')}</a></div>
      <div class="item-grid">
        ${ids.map((id) => {
          const it = item(id);
          return html`<a class="item-tile" href="${link('item', id)}" data-rarity="${it.rarity}">
            <span class="item-tile__img"><img src="${asset(it.img)}" alt="" loading="lazy" data-fallback></span>
            <span class="item-tile__body">
              <span class="item-tile__name">${L(it.name)}</span>
              <span class="item-tile__meta"><span>${label('itemTypes', it.type)}</span><span>${label('rarities', it.rarity)}</span></span>
            </span></a>`;
        })}
      </div>`
    );
  }

  function renderNews() {
    const all = ARC.news.posts.length;
    mount(
      '#news',
      html`<div class="section__head"><h2>${t('home.news')}</h2>
        ${all > 4 ? html`<a class="section__more" href="${url('pages/news.html')}">${t('news.all', { n: all })}</a>` : ''}</div>
      <div id="news-list"></div>`
    );
    ARC.news.renderNews(document.getElementById('news-list'), { limit: 4 });
  }

  function render() {
    renderHero();
    renderDirectory();
    renderRecent();
    renderNews();
  }

  render();
  ARC.conditions.start(null, document.getElementById('now'));
  ARC.setupSearch(document.querySelector('.search--hero'));
  document.addEventListener('arc:lang', render);
})();
