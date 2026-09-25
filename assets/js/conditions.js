/* Map conditions on the home page: what is on now and what comes next per
   condition, with live countdowns in the reader's server region. The schedule
   comes from content/map-conditions.js (scripts/fetch-map-conditions.mjs). */

(function () {
  const { html, mount, t, L, url, link } = ARC;
  const REGION_KEY = 'arc-wiki-region';
  const REGIONS = ['europe', 'north-america', 'brazil', 'east-asia', 'oceania'];
  let root = null;
  let region = null;
  let nextChange = Infinity;

  const schedule = () => window.ARC_MAP_CONDITIONS;
  const now = () => Date.now() / 1000;

  // Saved choice first, then a guess from the time zone, as the official page has no Chinese region.
  function pickRegion(available) {
    try {
      const saved = localStorage.getItem(REGION_KEY);
      if (available.includes(saved)) return saved;
    } catch (e) {
      /* storage blocked */
    }
    const tz = (Intl.DateTimeFormat().resolvedOptions().timeZone || '').replace(/^America\/Argentina\/.*/, 'America/Argentina');
    const guess = /^Asia\//.test(tz)
      ? 'east-asia'
      : /^(Australia|Pacific)\//.test(tz) && tz !== 'Pacific/Honolulu'
        ? 'oceania'
        : /^America\/(Sao_Paulo|Argentina|Santiago|Bogota|Lima|Caracas|Montevideo|Asuncion|La_Paz|Guayaquil|Belem|Fortaleza|Recife|Manaus|Bahia|Maceio|Cuiaba|Campo_Grande|Porto_Velho|Rio_Branco|Boa_Vista|Araguaina|Santarem|Noronha)$/.test(tz)
          ? 'brazil'
          : /^America\//.test(tz)
            ? 'north-america'
            : 'europe';
    return available.includes(guess) ? guess : available[0];
  }

  const regionName = (id) => {
    const key = `cond.region.${id}`;
    const text = t(key);
    return text === key ? id : text;
  };

  // 1:29:24 or 29:24, like the official countdowns.
  function clock(seconds) {
    const s = Math.max(0, Math.floor(seconds));
    const pad = (n) => String(n).padStart(2, '0');
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
  }

  const countdown = (at, kind) => t(kind === 'end' ? 'cond.endsIn' : 'cond.startsIn', { t: clock(at - now()) });

  function timeRange(start, end, withDay) {
    const locale = ARC.lang === 'zh' ? 'zh-CN' : 'en-US';
    const opts = ARC.lang === 'zh' ? { hour: '2-digit', minute: '2-digit', hour12: false } : { hour: 'numeric', minute: '2-digit' };
    const fmt = (s) => new Date(s * 1000).toLocaleTimeString(locale, opts);
    const day = new Date(start * 1000);
    const today = new Date();
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const prefix = !withDay || day.toDateString() === today.toDateString()
      ? ''
      : day.toDateString() === tomorrow.toDateString()
        ? `${t('cond.tomorrow')} `
        : `${day.toLocaleDateString(locale, { month: 'short', day: 'numeric' })} `;
    return `${prefix}${fmt(start)} – ${fmt(end)}`;
  }

  // Occurrences in the chosen region, grouped by condition and start time.
  function groups() {
    const data = schedule();
    const r = data.regions.indexOf(region);
    const at = now();
    const active = new Map();
    const next = new Map();
    for (const [id, map, duration, starts] of data.entries) {
      const start = starts[r];
      const end = start + duration;
      if (end <= at || start >= data.until) continue;
      const target = start <= at ? active : next;
      const key = start <= at ? `${id} ${start}` : id;
      const found = target.get(key);
      if (!found || (target === next && start < found.start)) target.set(key, { id, start, end, maps: [map] });
      else if (found.start === start && !found.maps.includes(map)) found.maps.push(map);
    }
    const order = (a, b) => a.start - b.start || data.conditions[b.id].major - data.conditions[a.id].major || a.id.localeCompare(b.id);
    return { active: [...active.values()].sort(order), next: [...next.values()].sort(order) };
  }

  function card(g, live) {
    const data = schedule();
    const c = data.conditions[g.id];
    const at = live ? g.end : g.start;
    const kind = live ? 'end' : 'start';
    return html`<li class="condition${live ? ' condition--live' : ''}">
      ${c.icon ? html`<img class="condition__icon" src="${ARC.asset(c.icon)}" alt="" loading="lazy" data-fallback>` : html`<span class="condition__icon"></span>`}
      <div class="condition__body">
        <span class="condition__name">${L(c.name)}${c.major ? html`<span class="tag">${t('cond.major')}</span>` : ''}</span>
        <span class="condition__maps">${g.maps.map((m, i) => html`${i ? ' · ' : ''}<a href="${link('map', m)}">${L(data.maps[m])}</a>`)}</span>
      </div>
      <div class="condition__when">
        <span class="condition__count num" data-at="${at}" data-kind="${kind}">${countdown(at, kind)}</span>
        <time class="condition__time num" datetime="${new Date(g.start * 1000).toISOString()}">${timeRange(g.start, g.end, !live)}</time>
      </div>
    </li>`;
  }

  function renderLists() {
    const data = schedule();
    const lists = root.querySelector('.conditions');
    if (now() >= data.until) {
      nextChange = Infinity;
      mount(lists, html`<p class="empty">${t('cond.stale')} <a href="${data.source}" target="_blank" rel="noopener">${t('cond.source')}</a></p>`);
      return;
    }
    const { active, next } = groups();
    nextChange = Math.min(data.until, ...active.map((g) => g.end), ...next.map((g) => g.start));
    mount(
      lists,
      html`<div class="conditions__group">
        <h3><span class="live-dot" aria-hidden="true"></span>${t('cond.active')}</h3>
        ${active.length ? html`<ul class="conditions__list">${active.map((g) => card(g, true))}</ul>` : html`<p class="note">${t('cond.none')}</p>`}
      </div>
      ${next.length
        ? html`<div class="conditions__group">
            <h3>${t('cond.upcoming')}</h3>
            <ul class="conditions__list">${next.map((g) => card(g, false))}</ul>
          </div>`
        : ''}`
    );
  }

  function render() {
    const data = schedule();
    if (!root || !data) return;
    const available = REGIONS.filter((r) => data.regions.includes(r)).concat(data.regions.filter((r) => !REGIONS.includes(r)));
    if (!available.includes(region)) region = pickRegion(available);
    mount(
      root,
      html`<div class="section__head">
        <h2>${t('home.conditions')}</h2>
        <label class="conditions__region"><span class="note">${t('cond.region')}</span>
          <select class="select" data-region>${available.map(
            (r) => html`<option value="${r}"${r === region ? ' selected' : ''}>${regionName(r)}</option>`
          )}</select></label>
      </div>
      <div class="conditions"></div>
      <p class="note conditions__note">${t('cond.note')}
        <a href="${data.source}" target="_blank" rel="noopener">${t('cond.source')}</a></p>`
    );
    renderLists();
  }

  function tick() {
    if (!root || !schedule()) return;
    if (now() >= nextChange) return renderLists();
    root.querySelectorAll('[data-at]').forEach((el) => {
      el.textContent = countdown(Number(el.dataset.at), el.dataset.kind);
    });
  }

  // Tabs left open pick up the newest published schedule once an hour.
  function reload() {
    const script = document.createElement('script');
    script.src = url(`content/map-conditions.js?t=${Date.now()}`);
    script.onload = script.onerror = () => {
      script.remove();
      render();
    };
    document.head.append(script);
  }

  function start(el) {
    root = el;
    if (!root || !schedule()) {
      if (root) root.hidden = true;
      return;
    }
    render();
    root.addEventListener('change', (e) => {
      if (!e.target.matches('[data-region]')) return;
      region = e.target.value;
      try {
        localStorage.setItem(REGION_KEY, region);
      } catch (err) {
        /* not saved; still switch for this visit */
      }
      renderLists();
    });
    setInterval(tick, 1000);
    setInterval(reload, 3600 * 1000);
    document.addEventListener('arc:lang', render);
  }

  ARC.conditions = { start };
})();
