/* Quests: chain-ordered list, filterable by trader and map. #quest_id opens one. */

(function () {
  const { html, mount, t, L, alt, link, data, num, label, chipList } = ARC;
  const quests = data.quests;
  const byId = new Map(quests.map((q) => [q.id, q]));
  const traders = Object.keys(data.labels.traders);

  const params = new URLSearchParams(location.search);
  const state = {
    trader: traders.includes(params.get('trader')) ? params.get('trader') : 'all',
    map: params.get('map') in data.labels.maps ? params.get('map') : 'all',
    q: '',
  };
  const open = new Set();

  function syncUrl() {
    const p = new URLSearchParams();
    if (state.trader !== 'all') p.set('trader', state.trader);
    if (state.map !== 'all') p.set('map', state.map);
    const qs = p.toString();
    history.replaceState(null, '', location.pathname + (qs ? `?${qs}` : '') + location.hash);
  }

  const mapName = (id) => label('maps', id);
  const questLink = (id) => (byId.has(id) ? html`<a href="#${id}">${L(byId.get(id).name)}</a>` : '');

  function visible() {
    const q = state.q.trim().toLowerCase();
    return quests.filter(
      (x) =>
        (state.trader === 'all' || x.trader === state.trader) &&
        (state.map === 'all' || (x.maps || []).includes(state.map)) &&
        (!q || x.name.en.toLowerCase().includes(q) || (x.name.zh || '').includes(q))
    );
  }

  function renderControls() {
    const count = (name) => quests.filter((q) => q.trader === name).length;
    const usedMaps = Object.keys(data.labels.maps).filter((id) => quests.some((q) => (q.maps || []).includes(id)));
    mount(
      '#controls',
      html`<div class="toolbar">
        <input class="input" id="quest-q" type="search" autocomplete="off" value="${state.q}"
          placeholder="${t('items.filter')}" aria-label="${t('items.filter')}">
        <div class="toolbar__group" role="group" aria-label="${t('page.traders')}">
          <button class="pill" type="button" data-trader="all" aria-pressed="${state.trader === 'all'}">${t('quests.allTraders')}</button>
          ${traders.map(
            (name) => html`<button class="pill" type="button" data-trader="${name}" aria-pressed="${state.trader === name}">
              ${label('traders', name)}<span class="num">${count(name)}</span></button>`
          )}
        </div>
      </div>
      <div class="toolbar__group quests-maps" role="group" aria-label="${t('page.maps')}">
        <button class="pill" type="button" data-map="all" aria-pressed="${state.map === 'all'}">${t('common.all')}</button>
        ${usedMaps.map(
          (id) => html`<button class="pill" type="button" data-map="${id}" aria-pressed="${state.map === id}">${mapName(id)}</button>`
        )}
      </div>`
    );
  }

  function row(q) {
    const isOpen = open.has(q.id);
    return html`<details class="row" id="${q.id}" data-tone="yellow"${isOpen ? html` open` : ''}>
      <summary>
        <span class="row__index num" title="${t('quests.depth', { n: q.depth })}">${q.depth}</span>
        <span class="row__title"><strong>${L(q.name)}</strong>${alt(q.name) ? html`<span>${alt(q.name)}</span>` : ''}</span>
        <span class="row__side">
          ${(q.maps || []).map((m) => html`<span class="tag">${mapName(m)}</span>`)}
          <span class="tag">${label('traders', q.trader)}</span>
        </span>
      </summary>
      ${isOpen ? body(q) : ''}
    </details>`;
  }

  // Where the interactive map has this quest's objectives.
  function questSpots(q) {
    const spots = ARC.mapSpots(null, q.id);
    return spots.length
      ? html`<div class="tags">${spots.map(
          (s) => html`<a class="tag" href="${s.href}">${label('maps', s.map)} <span class="num">${num(s.count)}</span></a>`
        )}</div>`
      : '';
  }

  function body(q) {
    const block = (title, content) => (content ? html`<div><h3>${title}</h3>${content}</div>` : '');
    return html`<div class="row__body">
      ${q.desc ? html`<blockquote class="quest-quote prose">${ARC.paragraphs(L(q.desc))}
        <footer>${label('traders', q.trader)}</footer></blockquote>` : ''}
      ${block(
        t('quests.objectives'),
        q.objectives &&
          html`<ul class="objectives">${q.objectives.map((o) => html`<li>${L(o)}</li>`)}</ul>
            ${q.oneRound ? html`<p class="note">${t('quests.oneRound')}</p>` : ''}`
      )}
      ${block(t('map.onMap'), questSpots(q))}
      ${block(t('quests.required'), chipList(q.required))}
      ${block(t('quests.granted'), chipList(q.granted))}
      ${block(
        t('quests.rewards'),
        (q.rewards || q.xp) &&
          html`${chipList(q.rewards)}${q.xp ? html`<p class="note quest-xp">${t('common.xp', { n: num(q.xp) })}</p>` : ''}`
      )}
      ${block(t('quests.other'), q.other && html`<div class="tags">${q.other.map((o) => html`<span class="tag">${L(o)}</span>`)}</div>`)}
      <div class="quest-links">
        ${block(t('quests.prev'), q.prev && html`<div class="link-list">${q.prev.map(questLink)}</div>`)}
        ${block(t('quests.next'), q.next && html`<div class="link-list">${q.next.map(questLink)}</div>`)}
      </div>
    </div>`;
  }

  function renderList() {
    const list = visible();
    mount('#quest-count', t('common.count', { n: num(list.length) }));
    mount(
      '#quest-list',
      list.length ? list.map(row) : html`<div class="empty"><p>${t('items.empty')}</p></div>`
    );
  }

  // Bodies render lazily on open, so the list stays light.
  document.getElementById('quest-list').addEventListener(
    'toggle',
    (e) => {
      const el = e.target;
      if (!el.matches('details.row')) return;
      if (el.open) {
        open.add(el.id);
        if (!el.querySelector('.row__body')) el.insertAdjacentHTML('beforeend', body(byId.get(el.id)).toString());
      } else open.delete(el.id);
    },
    true
  );

  document.getElementById('controls').addEventListener('click', (e) => {
    const tr = e.target.closest('[data-trader]');
    const mp = e.target.closest('[data-map]');
    if (!tr && !mp) return;
    if (tr) state.trader = tr.dataset.trader;
    if (mp) state.map = mp.dataset.map;
    renderControls();
    renderList();
    syncUrl();
  });
  document.getElementById('controls').addEventListener('input', (e) => {
    if (e.target.id !== 'quest-q') return;
    state.q = e.target.value;
    renderList();
  });

  // #quest_id: clear filters that would hide it, open it and bring it into view.
  function fromHash() {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!byId.has(id)) return;
    const q = byId.get(id);
    if ((state.trader !== 'all' && state.trader !== q.trader) || (state.map !== 'all' && !(q.maps || []).includes(state.map)) || state.q) {
      Object.assign(state, { trader: 'all', map: 'all', q: '' });
      renderControls();
      syncUrl();
    }
    open.add(id);
    renderList();
    const el = document.getElementById(id);
    document.querySelectorAll('.row.is-target').forEach((r) => r.classList.remove('is-target'));
    el.classList.add('is-target');
    el.scrollIntoView({ block: 'start' });
  }

  function render() {
    mount('#lede', t('quests.lede', { count: num(quests.length) }));
    renderControls();
    renderList();
  }

  render();
  fromHash();
  window.addEventListener('hashchange', fromHash);
  document.addEventListener('arc:lang', render);
})();
