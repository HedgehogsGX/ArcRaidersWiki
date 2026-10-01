/* Shared runtime for every page: paths, language, HTML templating, lookups.
   Loaded first, before strings.js, site.js and the page script. */

(function () {
  const DATA = (window.ARC_DATA = window.ARC_DATA || {});
  const STORAGE_KEY = 'arc-wiki-lang';

  // Site root, derived from this script's own URL so links work from any
  // page depth and from both file:// and http(s)://.
  const root = document.currentScript.src.replace(/assets\/js\/core\.js(\?.*)?$/, '');

  // ---- language ------------------------------------------------------------

  let lang = 'zh';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'zh') lang = saved;
  } catch (e) {
    /* storage blocked: stay on the default */
  }
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';

  // Data text is { en, zh? }; fall back to English when there is no Chinese.
  function L(text) {
    if (text == null) return '';
    if (typeof text === 'string') return text;
    return (lang === 'zh' && text.zh) || text.en || '';
  }

  // The other language's text, when it differs. Used for secondary name lines.
  function alt(text) {
    if (!text || typeof text === 'string') return '';
    const other = lang === 'zh' ? text.en : text.zh;
    return other && other !== L(text) ? other : '';
  }

  // UI strings from strings.js. {name} placeholders are filled from vars.
  function t(key, vars) {
    const entry = (window.ARC_STRINGS || {})[key];
    let s = entry ? entry[lang] || entry.en : key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
    return s;
  }

  function applyStrings(scope) {
    (scope || document).querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    (scope || document).querySelectorAll('[data-i18n-attr]').forEach((el) => {
      el.dataset.i18nAttr.split(';').forEach((pair) => {
        const [attr, key] = pair.split(':');
        el.setAttribute(attr.trim(), t(key.trim()));
      });
    });
  }

  function setLang(next) {
    if (next === lang) return;
    lang = next;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      /* not persisted; still switch for this page */
    }
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    applyStrings();
    document.dispatchEvent(new CustomEvent('arc:lang', { detail: lang }));
  }

  // ---- HTML templating -------------------------------------------------------

  // Tagged template that escapes every interpolation unless it is already
  // markup from another html`` call. Arrays are joined.
  class Raw {
    constructor(s) {
      this.s = s;
    }
    toString() {
      return this.s;
    }
  }
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);
  const piece = (v) =>
    v == null || v === false ? '' : Array.isArray(v) ? v.map(piece).join('') : v instanceof Raw ? v.s : esc(v);
  function html(strings, ...values) {
    let out = strings[0];
    values.forEach((v, i) => (out += piece(v) + strings[i + 1]));
    return new Raw(out);
  }
  const raw = (s) => new Raw(s);

  function mount(el, content) {
    if (typeof el === 'string') el = document.querySelector(el);
    if (el) el.innerHTML = piece(content);
    return el;
  }

  // ---- formatting ---------------------------------------------------------------

  const num = (n) => (n == null ? '' : Number(n).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US'));

  // Accepts unix seconds or YYYY-MM-DD. Date-only strings are read as local
  // dates; new Date('2026-08-18') would be UTC and can show the previous day.
  function date(value) {
    const ymd = typeof value === 'string' && value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const d = ymd ? new Date(+ymd[1], ymd[2] - 1, +ymd[3]) : typeof value === 'number' ? new Date(value * 1000) : new Date(value);
    return d.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  // Plain text with blank lines becomes paragraphs.
  const paragraphs = (s) => (s ? String(s).split(/\n{2,}/).map((p) => html`<p>${p}</p>`) : '');

  // ---- links & lookups ----------------------------------------------------------

  const url = (path) => root + path;

  const PAGE_OF = {
    item: 'items',
    quest: 'quests',
    skill: 'skills',
    station: 'hideout',
    arc: 'arc',
    map: 'maps',
    trader: 'traders',
    project: 'projects',
  };
  const link = (kind, id) => url(`pages/${PAGE_OF[kind]}.html${id ? '#' + encodeURIComponent(id) : ''}`);

  // Game images and most item icons live next to the site; the newest item
  // icons (not yet upstream) and news images are full URLs.
  const asset = (path) => (!path ? '' : /^https?:/.test(path) ? path : url(path));

  const humanize = (id) => id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  // Normalized item record from whichever item data the page loaded.
  let itemMap;
  function item(id) {
    if (!itemMap) {
      itemMap = new Map();
      if (DATA.items) DATA.items.forEach((i) => itemMap.set(i.id, i));
      else if (DATA.itemIndex)
        Object.entries(DATA.itemIndex).forEach(([id, [en, zh, img, rarity, type]]) =>
          itemMap.set(id, { id, name: zh ? { en, zh } : { en }, img, rarity, type })
        );
    }
    const found = itemMap.get(id);
    if (found) return found;
    const currency = DATA.labels && DATA.labels.currencies[id];
    return { id, name: currency || { en: humanize(id) }, currency: !!currency, missing: !currency };
  }

  // Small linked item token: icon, name, quantity.
  function itemChip(id, qty, opts) {
    const it = item(id);
    const name = L(it.name);
    const qtyPart = qty != null && qty !== 1 ? html`<span class="chip-item__qty num">×${num(qty)}</span>` : '';
    const inner = html`<span class="chip-item__img">${
      it.img ? html`<img src="${asset(it.img)}" alt="" loading="lazy" data-fallback>` : ''
    }</span><span class="chip-item__name">${name}</span>${qtyPart}`;
    const cls = `chip-item${opts && opts.large ? ' chip-item--large' : ''}`;
    if (it.currency || it.missing) return html`<span class="${cls}" data-rarity="${it.rarity || ''}">${inner}</span>`;
    return html`<a class="${cls}" href="${link('item', id)}" data-rarity="${it.rarity || ''}">${inner}</a>`;
  }

  const chipList = (pairs) =>
    pairs && pairs.length ? html`<div class="chip-list">${pairs.map(([id, qty]) => itemChip(id, qty))}</div>` : '';

  // Label lookups from data/labels.js, e.g. label('rarities', 'Rare').
  function label(group, key) {
    const g = DATA.labels && DATA.labels[group];
    const found = g && (Array.isArray(g) ? g.find((x) => x.id === key) : g[key]);
    return found ? L(found.name || found) : key;
  }

  // Maps where the interactive map has markers of a type, or of a quest's objectives,
  // as [{ map, count, href }]. Needs content/map-markers/index.js on the page.
  function mapSpots(type, quest) {
    const index = window.ARC_MARKER_INDEX;
    if (!index) return [];
    const counts = quest
      ? index.quests[quest] || {}
      : Object.fromEntries(Object.entries(index.counts).map(([map, c]) => [map, c[type] || 0]));
    return Object.entries(counts)
      .filter(([, count]) => count)
      .map(([map, count]) => ({
        map,
        count,
        href: url(`pages/map.html?map=${map}&${quest ? `quest=${encodeURIComponent(quest)}` : `show=${encodeURIComponent(type)}`}`),
      }));
  }

  const pageTitle = () => {
    const key = document.body.dataset.title;
    return key ? `${t(key)} | ${t('site.name')}` : t('site.name');
  };

  const closeButton = (labelText) => html`<div class="drawer__close"><button type="button" data-close aria-label="${labelText}">
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M1 1l12 12M13 1 1 13" stroke="currentColor" stroke-width="1.6"/></svg></button></div>`;

  // A side drawer (<dialog>) whose content follows the URL hash, so details can
  // be linked to, and Back closes them. Same-page #id links open it in place.
  function hashDrawer({ dialog, has, render, title }) {
    let openId = null;

    function show(id) {
      openId = id;
      mount(dialog, render(id));
      dialog.scrollTop = 0;
      if (!dialog.open) dialog.showModal();
      document.title = `${title(id)} | ${pageTitle()}`;
    }

    function sync() {
      const id = decodeURIComponent(location.hash.slice(1));
      if (id && has(id)) show(id);
      else if (dialog.open) {
        openId = null;
        dialog.close();
      }
    }

    function open(id) {
      if (id === openId) return;
      history.pushState({ drawer: true }, '', `${location.pathname}${location.search}#${encodeURIComponent(id)}`);
      show(id);
    }

    // Links say items.html, but hosts like Cloudflare Pages serve it at /items.
    const page = (path) => path.replace(/\.html$/, '').replace(/\/index$/, '/');

    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      const target = new URL(a.href, location.href);
      const id = decodeURIComponent(target.hash.slice(1));
      if (page(target.pathname) !== page(location.pathname) || !id || !has(id)) return;
      e.preventDefault();
      open(id);
    });

    dialog.addEventListener('click', (e) => {
      if (e.target === dialog || e.target.closest('[data-close]')) dialog.close();
    });

    // Closing by button, Esc or backdrop clears the hash; step back if we pushed it.
    dialog.addEventListener('close', () => {
      if (!openId) return;
      openId = null;
      document.title = pageTitle();
      if (history.state && history.state.drawer) history.back();
      else history.replaceState(null, '', location.pathname + location.search);
    });

    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);

    return {
      open,
      sync,
      get current() {
        return openId;
      },
      refresh: () => openId && show(openId),
    };
  }

  // Broken or missing images collapse to an empty frame instead of a broken icon.
  document.addEventListener(
    'error',
    (e) => {
      const el = e.target;
      if (el.tagName === 'IMG' && el.hasAttribute('data-fallback')) {
        el.removeAttribute('src');
        el.classList.add('is-broken');
      }
    },
    true
  );

  window.ARC = {
    data: DATA,
    root,
    get lang() {
      return lang;
    },
    setLang,
    t,
    L,
    alt,
    applyStrings,
    html,
    raw,
    esc,
    mount,
    num,
    date,
    paragraphs,
    url,
    link,
    asset,
    humanize,
    item,
    itemChip,
    chipList,
    label,
    mapSpots,
    pageTitle,
    closeButton,
    hashDrawer,
  };
})();
