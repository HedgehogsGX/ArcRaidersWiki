/* Site shell: header, navigation, search, footer and language switch.
   Every page gets the same chrome from the SECTIONS config below. */

(function () {
  const { html, mount, t, L, url, link, asset, data } = ARC;
  const meta = data.meta;
  const categories = (data.labels && data.labels.itemCategories) || [];
  const current = document.body.dataset.page;

  // One tone per section, matching the four stripes of the logo.
  const SECTIONS = [
    { key: 'world', tone: 'cyan', pages: [['arc', meta.counts.arc], ['maps', meta.counts.maps], ['map', meta.counts.maps]] },
    {
      key: 'gear',
      tone: 'green',
      pages: [['items', meta.counts.items]],
      // Shortcuts into the Items page with a category preselected.
      extra: categories
        .filter((c) => ['weapons', 'mods', 'quick-use', 'shields', 'keys', 'blueprints'].includes(c.id))
        .map((c) => ({ href: url(`pages/items.html?category=${c.id}`), label: c.name, count: c.count })),
    },
    { key: 'progress', tone: 'yellow', pages: [['quests', meta.counts.quests], ['skills', meta.counts.skills], ['projects', meta.counts.projects]] },
    { key: 'speranza', tone: 'red', pages: [['hideout', meta.counts.hideout], ['traders', meta.counts.traders]] },
  ];

  const pageLinks = (section) => [
    ...section.pages.map(([id, count]) => ({ href: url(`pages/${id}.html`), name: t(`page.${id}`), count, id })),
    ...(section.extra || []).map((e) => ({ ...e, name: L(e.label), sub: true })),
  ];

  // The logo's four stripes, leaning top-left to bottom-right as in the game mark.
  const mark = () => html`<svg class="brand__mark" viewBox="0 0 39 20" aria-hidden="true">
    <path d="M0 0h5.5l6 20H6z" fill="var(--cyan)"/><path d="M9 0h5.5l6 20H15z" fill="var(--green)"/>
    <path d="M18 0h5.5l6 20H24z" fill="var(--yellow)"/><path d="M27 0h5.5l6 20H33z" fill="var(--red)"/></svg>`;

  const searchIcon = html`<svg class="search__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M10.5 3a7.5 7.5 0 0 1 5.9 12.1l4.8 4.8-1.3 1.3-4.8-4.8A7.5 7.5 0 1 1 10.5 3zm0 1.8a5.7 5.7 0 1 0 0 11.4 5.7 5.7 0 0 0 0-11.4z" fill="currentColor"/></svg>`;

  // ---- header ------------------------------------------------------------------

  function renderHeader() {
    const header = document.getElementById('site-header');
    if (!header) return;
    mount(
      header,
      html`<a class="skip-link" href="#main">${t('site.skip')}</a>
      <div class="site-header__inner wrap">
        <a class="brand" href="${url('index.html')}">${mark()}<span class="brand__name">${t('site.name')}</span></a>
        <div class="search search--header" role="search">
          ${searchIcon}
          <input class="search__input" type="search" autocomplete="off" spellcheck="false"
            placeholder="${t('search.placeholder')}" aria-label="${t('search.label')}">
          <div class="search__results" hidden></div>
        </div>
        <nav class="site-nav" id="site-nav" aria-label="${t('site.menu')}">
          <ul class="site-nav__list">
            <li class="nav-link"><a href="${url('pages/news.html')}"${current === 'news' ? html` aria-current="page"` : ''}>${t('page.news')}</a></li>
            ${SECTIONS.map((s) => {
              const links = pageLinks(s);
              const here = links.some((l) => l.id === current);
              return html`<li class="nav-group" data-tone="${s.tone}">
                <button class="nav-group__btn${here ? ' is-current' : ''}" type="button" aria-expanded="false"
                  aria-controls="nav-${s.key}">${t(`nav.${s.key}`)}</button>
                <ul class="nav-group__panel" id="nav-${s.key}">
                  ${links.map(
                    (l) => html`<li><a href="${l.href}"${l.id === current ? html` aria-current="page"` : ''}>
                      <span>${l.name}</span><span class="nav-group__count num">${l.count}</span></a></li>`
                  )}
                </ul>
              </li>`;
            })}
          </ul>
        </nav>
        <div class="lang-switch" role="group" aria-label="${t('site.langLabel')}">
          <button type="button" data-lang="zh" aria-pressed="${ARC.lang === 'zh'}" lang="zh-CN">中</button>
          <button type="button" data-lang="en" aria-pressed="${ARC.lang === 'en'}" lang="en">EN</button>
        </div>
        <button class="menu-btn" type="button" aria-expanded="false" aria-controls="site-nav">
          <span class="menu-btn__bars" aria-hidden="true"></span><span class="visually-hidden">${t('site.menu')}</span>
        </button>
      </div>`
    );
    header.querySelectorAll('.search').forEach(setupSearch);
  }

  // Dropdowns open on click (and hover where a mouse is present); one at a time.
  function setupNav() {
    const header = document.getElementById('site-header');
    if (!header) return;
    const closeAll = (except) =>
      header.querySelectorAll('.nav-group__btn[aria-expanded="true"]').forEach((b) => {
        if (b !== except) b.setAttribute('aria-expanded', 'false');
      });

    header.addEventListener('click', (e) => {
      const btn = e.target.closest('.nav-group__btn');
      if (btn) {
        const open = btn.getAttribute('aria-expanded') !== 'true';
        closeAll(btn);
        btn.setAttribute('aria-expanded', String(open));
        return;
      }
      const menu = e.target.closest('.menu-btn');
      if (menu) {
        const open = menu.getAttribute('aria-expanded') !== 'true';
        menu.setAttribute('aria-expanded', String(open));
        document.body.classList.toggle('menu-open', open);
        return;
      }
      const langBtn = e.target.closest('[data-lang]');
      if (langBtn) ARC.setLang(langBtn.dataset.lang);
    });

    if (window.matchMedia('(hover: hover) and (min-width: 960px)').matches) {
      header.addEventListener('pointerover', (e) => {
        const group = e.target.closest('.nav-group');
        if (group) {
          const btn = group.querySelector('.nav-group__btn');
          closeAll(btn);
          btn.setAttribute('aria-expanded', 'true');
        }
      });
      header.addEventListener('pointerleave', () => closeAll());
    }

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.nav-group')) closeAll();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const open = header.querySelector('.nav-group__btn[aria-expanded="true"]');
      closeAll();
      if (open) open.focus();
    });
  }

  // ---- search --------------------------------------------------------------------

  const KIND_ORDER = ['item', 'quest', 'skill', 'arc', 'station', 'map', 'trader', 'project'];
  let indexPromise;

  // The index is only fetched on first use. A script tag keeps this working from disk.
  function loadIndex() {
    if (data.search) return Promise.resolve(data.search);
    if (!indexPromise)
      indexPromise = new Promise((resolve) => {
        const s = document.createElement('script');
        s.src = url('data/search.js');
        s.onload = () => resolve(data.search || []);
        s.onerror = () => resolve([]);
        document.head.appendChild(s);
      });
    return indexPromise;
  }

  function score(row, q) {
    let best = Infinity;
    for (const name of [row[2], row[3]]) {
      if (!name) continue;
      const n = name.toLowerCase();
      const at = n.indexOf(q);
      if (at < 0) continue;
      const s = n === q ? 0 : at === 0 ? 1 : /[\s(-]/.test(n[at - 1]) ? 2 : 3;
      best = Math.min(best, s);
    }
    return best;
  }

  function query(rows, q) {
    q = q.trim().toLowerCase();
    if (!q) return [];
    return rows
      .map((row) => ({ row, s: score(row, q) }))
      .filter((r) => r.s < Infinity)
      .sort(
        (a, b) =>
          a.s - b.s ||
          KIND_ORDER.indexOf(a.row[0]) - KIND_ORDER.indexOf(b.row[0]) ||
          a.row[2].length - b.row[2].length
      )
      .slice(0, 8)
      .map((r) => r.row);
  }

  let searchId = 0;
  function setupSearch(box) {
    const input = box.querySelector('.search__input');
    const results = box.querySelector('.search__results');
    const listId = `search-results-${++searchId}`;
    results.id = listId;
    results.setAttribute('role', 'listbox');
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-controls', listId);
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-autocomplete', 'list');
    let active = -1;
    let rows = [];

    const setOpen = (open) => {
      results.hidden = !open;
      input.setAttribute('aria-expanded', String(open));
      box.classList.toggle('is-open', open);
    };

    const highlight = (i) => {
      const options = results.querySelectorAll('[role="option"]');
      active = options.length ? (i + options.length) % options.length : -1;
      options.forEach((o, n) => o.setAttribute('aria-selected', String(n === active)));
      if (active >= 0) {
        input.setAttribute('aria-activedescendant', options[active].id);
        options[active].scrollIntoView({ block: 'nearest' });
      } else input.removeAttribute('aria-activedescendant');
    };

    const render = async () => {
      const q = input.value;
      if (!q.trim()) return setOpen(false);
      const index = await loadIndex();
      if (q !== input.value) return; // a newer keystroke is already rendering
      rows = query(index, q);
      mount(
        results,
        rows.length
          ? rows.map(([kind, id, en, zh, img], n) => {
              const name = ARC.lang === 'zh' && zh ? zh : en;
              const other = ARC.lang === 'zh' && zh ? en : zh;
              return html`<a class="search__option" role="option" id="${listId}-${n}" aria-selected="false" href="${link(kind, id)}">
                <span class="search__thumb">${img ? html`<img src="${asset(img)}" alt="" loading="lazy" data-fallback>` : ''}</span>
                <span class="search__text"><span class="search__name">${name}</span>${
                  other ? html`<span class="search__alt">${other}</span>` : ''
                }</span>
                <span class="search__kind">${t(`search.kind.${kind}`)}</span></a>`;
            })
          : html`<p class="search__empty">${t('search.empty', { q: q.trim() })}</p>`
      );
      setOpen(true);
      highlight(rows.length ? 0 : -1);
    };

    input.addEventListener('input', render);
    input.addEventListener('focus', () => {
      loadIndex();
      if (input.value.trim()) render();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (results.hidden) render();
        else highlight(active + (e.key === 'ArrowDown' ? 1 : -1));
      } else if (e.key === 'Enter') {
        const option = results.querySelectorAll('[role="option"]')[active];
        if (option) {
          e.preventDefault();
          setOpen(false);
          location.href = option.href;
        }
      } else if (e.key === 'Escape') {
        if (!results.hidden) e.stopPropagation();
        setOpen(false);
      }
    });
    results.addEventListener('pointerdown', (e) => e.preventDefault()); // keep focus while clicking
    results.addEventListener('click', () => setOpen(false));
    input.addEventListener('blur', () => setOpen(false));
  }

  // ---- footer ----------------------------------------------------------------------

  const OFFICIAL = [
    ['link.site', 'https://arcraiders.com'],
    ['Steam', 'https://store.steampowered.com/app/1808500/'],
    ['Discord', 'https://discord.gg/arcraiders'],
    ['YouTube', 'https://www.youtube.com/@ARCRaidersGame'],
    ['X', 'https://x.com/ARCRaidersGame'],
  ];

  const LEGAL = [
    'ARC RAIDERS © Embark Studios AB. ARC RAIDERS and EMBARK trademarks and logos are trademarks or registered trademarks of Embark Studios AB.',
    'NEXON trademark and logo are trademarks or registered trademarks of NXC Corporation.',
    'PlayStation, the PlayStation Family Mark, PS5 and the PS5 logo are registered trademarks or trademarks of Sony Interactive Entertainment Inc.',
    'Microsoft, the Xbox Sphere mark and Xbox Series X|S are trademarks of the Microsoft group of companies.',
    'Steam and the Steam logo are trademarks and/or registered trademarks of Valve Corporation in the U.S. and/or other countries.',
    'Epic, Epic Games, Epic Games Store, Unreal, Unreal Engine and their respective logos are trademarks or registered trademarks of Epic Games, Inc.',
    'NVIDIA, the NVIDIA logo and the GeForce Now logo are trademarks and/or registered trademarks of NVIDIA Corporation in the U.S. and/or other countries.',
  ];

  function renderFooter() {
    const footer = document.getElementById('site-footer');
    if (!footer) return;
    const external = (label, href) =>
      html`<li><a href="${href}" target="_blank" rel="noopener">${label.includes('.') ? t(label) : label}</a></li>`;
    mount(
      footer,
      html`<div class="wrap site-footer__inner">
        <div class="site-footer__about">
          <a class="brand" href="${url('index.html')}">${mark()}<span class="brand__name">${t('site.name')}</span></a>
          <p>${t('footer.about')}</p>
          <p class="muted">${t('site.meta', { version: meta.gameVersion, date: ARC.date(meta.updated) })}</p>
        </div>
        <div class="site-footer__col">
          <h2>${t('footer.browse')}</h2>
          <ul>${['news', ...SECTIONS.flatMap((s) => s.pages).map(([id]) => id)].map(
            (id) => html`<li><a href="${url(`pages/${id}.html`)}">${t(`page.${id}`)}</a></li>`
          )}</ul>
        </div>
        <div class="site-footer__col">
          <h2>${t('footer.official')}</h2>
          <ul>${OFFICIAL.map(([label, href]) => external(label, href))}</ul>
        </div>
        <div class="site-footer__col">
          <h2>${t('footer.data')}</h2>
          <p class="muted">${t('footer.dataNote')}</p>
          <ul>
            ${external('RaidTheory/arcraiders-data', 'https://github.com/RaidTheory/arcraiders-data')}
            ${external('arctracker.io', 'https://arctracker.io')}
            ${external('MetaForge', 'https://metaforge.app/arc-raiders')}
          </ul>
        </div>
      </div>
      <div class="wrap">
        <details class="site-footer__legal">
          <summary>${t('footer.legal')}</summary>
          ${LEGAL.map((line) => html`<p lang="en">${line}</p>`)}
        </details>
      </div>`
    );
  }

  // ---- page chrome ------------------------------------------------------------------

  function fillMeta() {
    document.querySelectorAll('[data-meta]').forEach((el) => {
      el.textContent = t('site.meta', { version: meta.gameVersion, date: ARC.date(meta.updated) });
    });
  }

  function titleFromPage() {
    document.title = ARC.pageTitle();
  }

  function renderAll() {
    renderHeader();
    renderFooter();
    fillMeta();
    titleFromPage();
    ARC.applyStrings();
  }

  renderAll();
  setupNav();
  document.addEventListener('arc:lang', renderAll);

  // Close the mobile menu when navigating within the page.
  window.addEventListener('hashchange', () => {
    document.body.classList.remove('menu-open');
    const btn = document.querySelector('.menu-btn');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  });

  ARC.sections = SECTIONS;
  ARC.pageLinks = pageLinks;
  ARC.searchIcon = searchIcon;
  ARC.setupSearch = setupSearch;
})();
