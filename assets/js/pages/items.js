/* Items: filterable grid plus a detail drawer driven by the URL hash (#item_id). */

(function () {
  const { html, mount, t, L, alt, asset, link, data, num, label, itemChip, chipList } = ARC;
  const items = data.items;
  const byId = new Map(items.map((i) => [i.id, i]));
  const categories = data.labels.itemCategories;
  const RARITIES = ['Legendary', 'Epic', 'Rare', 'Uncommon', 'Common'];
  const SORTS = ['rarity', 'value', 'name'];

  // ---- state kept in the query string ---------------------------------------

  const params = new URLSearchParams(location.search);
  const state = {
    category: categories.some((c) => c.id === params.get('category')) ? params.get('category') : 'all',
    rarity: RARITIES.includes(params.get('rarity')) ? params.get('rarity') : 'all',
    q: params.get('q') || '',
    sort: SORTS.includes(params.get('sort')) ? params.get('sort') : 'rarity',
  };

  function syncUrl() {
    const p = new URLSearchParams();
    if (state.category !== 'all') p.set('category', state.category);
    if (state.rarity !== 'all') p.set('rarity', state.rarity);
    if (state.q.trim()) p.set('q', state.q.trim());
    if (state.sort !== 'rarity') p.set('sort', state.sort);
    const qs = p.toString();
    history.replaceState(history.state, '', location.pathname + (qs ? `?${qs}` : '') + location.hash);
  }

  function visible() {
    const cat = categories.find((c) => c.id === state.category);
    const q = state.q.trim().toLowerCase();
    const list = items.filter(
      (i) =>
        (!cat || cat.types.includes(i.type)) &&
        (state.rarity === 'all' || i.rarity === state.rarity) &&
        (!q || i.name.en.toLowerCase().includes(q) || (i.name.zh || '').includes(q) || i.id.includes(q))
    );
    const collator = new Intl.Collator(ARC.lang === 'zh' ? 'zh-CN' : 'en');
    const byName = (a, b) => collator.compare(L(a.name), L(b.name));
    const rank = (i) => RARITIES.indexOf(i.rarity);
    if (state.sort === 'name') return list.sort(byName);
    if (state.sort === 'value') return list.sort((a, b) => (b.value || 0) - (a.value || 0) || byName(a, b));
    return list.sort((a, b) => rank(a) - rank(b) || byName(a, b));
  }

  // ---- list --------------------------------------------------------------------

  function renderControls() {
    mount(
      '#controls',
      html`<div class="toolbar">
        <input class="input items-filter" id="item-q" type="search" value="${state.q}" autocomplete="off"
          placeholder="${t('items.filter')}" aria-label="${t('items.filter')}">
        <div class="toolbar__group" role="group" aria-label="${t('items.rarity')}">
          <button class="pill" type="button" data-set-rarity="all" aria-pressed="${state.rarity === 'all'}">${t('common.all')}</button>
          ${RARITIES.map(
            (r) => html`<button class="pill" type="button" data-set-rarity="${r}" data-rarity="${r}"
              aria-pressed="${state.rarity === r}"><span class="pill__dot"></span>${label('rarities', r)}</button>`
          )}
        </div>
        <span class="toolbar__spacer"></span>
        <label class="toolbar__group"><span class="toolbar__label">${t('items.sort')}</span>
          <select class="select" id="item-sort">
            ${SORTS.map((s) => html`<option value="${s}"${state.sort === s ? html` selected` : ''}>${t(`items.sort.${s}`)}</option>`)}
          </select>
        </label>
      </div>
      <div class="toolbar__group items-cats" role="group" aria-label="${t('items.category')}">
        <button class="pill" type="button" data-set-category="all" aria-pressed="${state.category === 'all'}">
          ${t('common.all')}<span class="num">${items.length}</span></button>
        ${categories.map(
          (c) => html`<button class="pill" type="button" data-set-category="${c.id}" aria-pressed="${state.category === c.id}">
            ${L(c.name)}<span class="num">${c.count}</span></button>`
        )}
      </div>`
    );
  }

  function tile(i) {
    return html`<a class="item-tile" href="#${i.id}" data-item="${i.id}" data-rarity="${i.rarity}">
      <span class="item-tile__img">${i.img ? html`<img src="${asset(i.img)}" alt="" loading="lazy" data-fallback>` : ''}</span>
      <span class="item-tile__body">
        <span class="item-tile__name">${L(i.name)}</span>
        <span class="item-tile__meta"><span>${label('itemTypes', i.type)}</span><span class="num">${num(i.value)}</span></span>
      </span></a>`;
  }

  function renderList() {
    const list = visible();
    mount('#item-count', t('items.shown', { n: num(list.length) }));
    mount(
      '#item-grid',
      list.length
        ? list.map(tile)
        : html`<div class="empty"><p>${t('items.empty')}</p><button class="button" type="button" data-clear>${t('common.clear')}</button></div>`
    );
  }

  document.getElementById('controls').addEventListener('click', (e) => {
    const r = e.target.closest('[data-set-rarity]');
    const c = e.target.closest('[data-set-category]');
    if (!r && !c) return;
    if (r) state.rarity = r.dataset.setRarity;
    if (c) state.category = c.dataset.setCategory;
    renderControls();
    renderList();
    syncUrl();
  });
  document.getElementById('controls').addEventListener('input', (e) => {
    if (e.target.id === 'item-q') state.q = e.target.value;
    else if (e.target.id === 'item-sort') state.sort = e.target.value;
    else return;
    renderList();
    syncUrl();
  });
  document.getElementById('item-grid').addEventListener('click', (e) => {
    if (!e.target.closest('[data-clear]')) return;
    Object.assign(state, { category: 'all', rarity: 'all', q: '' });
    renderControls();
    renderList();
    syncUrl();
  });

  // ---- reverse lookups (built on first use) -------------------------------------

  let uses;
  function lookups() {
    if (uses) return uses;
    const push = (map, key, value) => (map.get(key) || map.set(key, []).get(key)).push(value);
    uses = { craft: new Map(), hideout: new Map(), quest: new Map(), reward: new Map(), project: new Map(), drop: new Map(), from: new Map() };
    items.forEach((i) => {
      (i.recipe || []).forEach(([id, qty]) => push(uses.craft, id, [i.id, qty]));
      if (i.upgradesTo) uses.from.set(i.upgradesTo, i.id);
    });
    (data.hideout || []).forEach((s) =>
      (s.levels || []).forEach((l) => (l.items || []).forEach(([id, qty]) => push(uses.hideout, id, { s, level: l.level, qty })))
    );
    (data.quests || []).forEach((q) => {
      (q.required || []).forEach(([id, qty]) => push(uses.quest, id, { q, qty }));
      [...(q.rewards || []), ...(q.granted || [])].forEach(([id, qty]) => push(uses.reward, id, { q, qty }));
    });
    (data.projects || []).forEach((p) =>
      p.phases.forEach((ph) => (ph.items || []).forEach((r) => push(uses.project, r.id, { p, phase: ph.n, qty: r.qty })))
    );
    (data.arc || []).forEach((b) => (b.drops || []).forEach((id) => push(uses.drop, id, b)));
    return uses;
  }

  // ---- detail ----------------------------------------------------------------------

  const section = (title, body) => (body ? html`<section class="detail__section"><h3>${title}</h3>${body}</section>` : '');
  const valueText = (v) => (v && typeof v === 'object' ? L(v) : v);
  const benchText = (bench, level) =>
    bench === 'in_raid' ? label('benches', bench) : t('items.station', { bench: label('benches', bench), level: level || 1 });

  function sources(i, u) {
    const parts = [];
    if (i.vendors)
      parts.push(
        html`<h4>${t('page.traders')}</h4><ul class="link-list">${i.vendors.map(
          (v) => html`<li><a href="${link('trader', v.trader.toLowerCase().replace(/\s+/g, ''))}">${t('items.soldBy', { trader: label('traders', v.trader) })}</a>
            <span class="note">${v.cost.map(([id, qty]) => `${num(qty)} ${L(ARC.item(id).name)}`).join(' + ')}</span>
            ${v.limit ? html`<span class="note">${t('items.limit', { n: v.limit })}</span>` : ''}</li>`
        )}</ul>`
      );
    const rewards = u.reward.get(i.id);
    if (rewards)
      parts.push(html`<h4>${t('items.questReward')}</h4><ul class="link-list">${rewards.map(
        ({ q, qty }) => html`<li><a href="${link('quest', q.id)}">${L(q.name)}</a><span class="note">×${num(qty)}</span></li>`
      )}</ul>`);
    const drops = u.drop.get(i.id);
    if (drops)
      parts.push(html`<h4>${t('items.droppedBy')}</h4><div class="tags">${drops.map(
        (b) => html`<a class="tag" href="${link('arc', b.id)}">${L(b.name)}</a>`
      )}</div>`);
    if (i.foundIn)
      parts.push(html`<h4>${t('items.foundIn')}</h4><div class="tags">${i.foundIn.map((f) => html`<span class="tag">${label('locations', f)}</span>`)}</div>`);
    return parts.length ? parts : '';
  }

  function usedFor(i, u) {
    const parts = [];
    const craft = u.craft.get(i.id);
    if (craft) parts.push(html`<h4>${t('items.usedCraft')}</h4>${chipList(craft.map(([id]) => [id]))}`);
    const hideout = u.hideout.get(i.id);
    if (hideout)
      parts.push(html`<h4>${t('items.usedHideout')}</h4><ul class="link-list">${hideout.map(
        ({ s, level, qty }) => html`<li><a href="${link('station', s.id)}">${L(s.name)} ${t('common.level', { n: level })}</a><span class="note">×${num(qty)}</span></li>`
      )}</ul>`);
    const quests = u.quest.get(i.id);
    if (quests)
      parts.push(html`<h4>${t('items.usedQuest')}</h4><ul class="link-list">${quests.map(
        ({ q, qty }) => html`<li><a href="${link('quest', q.id)}">${L(q.name)}</a><span class="note">×${num(qty)}</span></li>`
      )}</ul>`);
    const projects = u.project.get(i.id);
    if (projects)
      parts.push(html`<h4>${t('items.usedProject')}</h4><ul class="link-list">${projects.map(
        ({ p, phase, qty }) => html`<li><a href="${link('project', p.id)}">${L(p.name)}</a><span class="note">${t('projects.phase', { n: phase })} ×${num(qty)}</span></li>`
      )}</ul>`);
    return parts.length ? parts : '';
  }

  function detail(i) {
    const u = lookups();
    const upgradedFrom = u.from.get(i.id);
    return html`${ARC.closeButton(t('items.close'))}
      <div class="detail__head" data-rarity="${i.rarity}">
        <div class="detail__img">${i.img ? html`<img src="${asset(i.img)}" alt="" data-fallback>` : ''}</div>
        <div>
          <h2 id="drawer-title">${L(i.name)}</h2>
          ${alt(i.name) ? html`<p class="detail__alt">${alt(i.name)}</p>` : ''}
          <div class="tags">
            <span class="tag tag--rarity">${label('rarities', i.rarity)}</span>
            <span class="tag">${label('itemTypes', i.type)}</span>
            ${i.blueprint ? html`<span class="tag">${t('items.blueprint')}</span>` : ''}
            ${i.questItem ? html`<span class="tag">${t('items.questItem')}</span>` : ''}
            ${i.added && i.added !== 'base' ? html`<span class="tag">${t('items.added', { version: i.added })}</span>` : ''}
          </div>
        </div>
      </div>
      ${i.desc ? html`<div class="detail__desc prose">${ARC.paragraphs(L(i.desc))}</div>` : ''}
      <dl class="facts">
        <div><dt>${t('items.value')}</dt><dd>${num(i.value)}</dd></div>
        <div><dt>${t('items.weight')}</dt><dd>${i.weight != null ? `${num(i.weight)} kg` : '—'}</dd></div>
        <div><dt>${t('items.stack')}</dt><dd>${i.stack != null ? num(i.stack) : '—'}</dd></div>
      </dl>
      ${section(
        t('items.stats'),
        i.effects &&
          html`<dl class="stat-list">${i.effects.map((e) => html`<dt>${L(e.label)}</dt><dd>${valueText(e.value) ?? ''}</dd>`)}</dl>`
      )}
      ${section(
        t('items.recipe'),
        i.recipe &&
          html`<div class="tags recipe-benches">${(i.bench || []).map((b) =>
              b === 'in_raid'
                ? html`<span class="tag">${benchText(b)}</span>`
                : html`<a class="tag" href="${link('station', b)}">${benchText(b, i.level)}</a>`
            )}
            ${i.craftQty ? html`<span class="tag">${t('items.makes', { n: i.craftQty })}</span>` : ''}</div>
            ${chipList(i.recipe)}`
      )}
      ${section(
        t('items.upgradesTo'),
        (i.upgradesTo || upgradedFrom) &&
          html`${i.upgradesTo ? html`<div class="chip-list">${itemChip(i.upgradesTo)}</div>` : ''}
            ${i.upgradeCost ? html`<h4>${t('items.upgradeCost')}</h4>${chipList(i.upgradeCost)}` : ''}`
      )}
      ${section(t('items.recycles'), chipList(i.recycles))}
      ${section(t('items.salvages'), chipList(i.salvages))}
      ${section(t('items.repairCost'), chipList(i.repairCost))}
      ${section(t('items.sources'), sources(i, u))}
      ${section(t('items.uses'), usedFor(i, u))}
      ${section(
        t('items.mods'),
        i.mods &&
          Object.entries(i.mods).map(
            ([slot, ids]) => html`<h4>${label('modSlots', slot)}</h4>${chipList(ids.map((id) => [id]))}`
          )
      )}
      ${section(t('items.compatible'), i.compatible && html`<div class="tags">${i.compatible.map((w) => html`<span class="tag">${w}</span>`)}</div>`)}
      ${i.tip ? section(t('items.tip'), html`<p class="prose" lang="en">${L(i.tip)}</p>`) : ''}`;
  }

  // ---- drawer ------------------------------------------------------------------------

  const drawer = ARC.hashDrawer({
    dialog: document.getElementById('item-drawer'),
    has: (id) => byId.has(id),
    render: (id) => detail(byId.get(id)),
    title: (id) => L(byId.get(id).name),
  });

  // ---- boot ----------------------------------------------------------------------------

  function render() {
    mount('#lede', t('items.lede', { count: num(items.length) }));
    renderControls();
    renderList();
    drawer.refresh();
  }

  render();
  drawer.sync();
  document.addEventListener('arc:lang', render);
})();
