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
          <button class="pill" type="button" data-set-rarity="all" aria-pressed="${String(state.rarity === 'all')}">${t('common.all')}</button>
          ${RARITIES.map(
            (r) => html`<button class="pill" type="button" data-set-rarity="${r}" data-rarity="${r}"
              aria-pressed="${String(state.rarity === r)}"><span class="pill__dot"></span>${label('rarities', r)}</button>`
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
        <button class="pill" type="button" data-set-category="all" aria-pressed="${String(state.category === 'all')}">
          ${t('common.all')}<span class="num">${items.length}</span></button>
        ${categories.map(
          (c) => html`<button class="pill" type="button" data-set-category="${c.id}" aria-pressed="${String(state.category === c.id)}">
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

  // ---- Amplified perks -------------------------------------------------------------
  // Amplified variants are named "<weapon> · <perk> + <perk>" in both languages, so an
  // upgrade from one to another adds the perk the target's name has and the source's
  // lacks. Every item of a tree starts with the base's id, "aphelion_amplified".

  const amplifiedBase = (id) => byId.get((/^.+?_amplified(?=_|$)/.exec(id) || [])[0]);
  function perks(i) {
    const en = i.name.en.split(' · ')[1];
    if (!en) return [];
    const zh = (i.name.zh || '').split(' · ')[1];
    const ens = en.split(' + ');
    const zhs = zh ? zh.split(' + ') : [];
    return ens.map((p, n) => (zhs.length === ens.length ? { en: p, zh: zhs[n] } : { en: p }));
  }
  function addedPerk(i, to) {
    const had = perks(i);
    return byId.has(to) ? perks(byId.get(to)).find((p) => !had.some((h) => h.en === p.en)) : undefined;
  }

  // ---- reverse lookups (built on first use) -------------------------------------

  let uses;
  function lookups() {
    if (uses) return uses;
    const push = (map, key, value) => (map.get(key) || map.set(key, []).get(key)).push(value);
    uses = { craft: new Map(), hideout: new Map(), quest: new Map(), reward: new Map(), project: new Map(), drop: new Map(), from: new Map(), perks: new Map(), amplify: new Map() };
    items.forEach((i) => {
      (i.recipe || []).forEach(([id, qty]) => push(uses.craft, id, [i.id, qty]));
      (i.upgrades || []).forEach((u) => {
        push(uses.from, u.to, { i, u });
        const perk = addedPerk(i, u.to);
        const base = amplifiedBase(i.id);
        // Tier IV → Amplified: the Amplification Module it takes.
        const amplified = !perk && amplifiedBase(u.to);
        if (amplified && amplified.id === u.to)
          (u.cost || []).forEach(([id, qty]) => push(uses.amplify, id, { id: u.to, names: [amplified.name], qty }));
        if (!perk || !base) return;
        // Each perk of a tree once (its cost is the same on every route), with the
        // perks every route to it picked first, linked to the variant with fewest perks.
        const tree = uses.perks.get(base.id) || uses.perks.set(base.id, new Map()).get(base.id);
        const had = perks(i);
        const row = tree.get(perk.en);
        if (!row) tree.set(perk.en, { ...u, base, perk, after: had, depth: had.length });
        else {
          row.after = row.after.filter((p) => had.some((h) => h.en === p.en));
          if (had.length < row.depth) Object.assign(row, { to: u.to, depth: had.length });
        }
      });
    });
    uses.perks.forEach((tree) =>
      tree.forEach((row) => {
        const names = [row.base.name, row.perk];
        (row.cost || []).forEach(([id, qty]) => push(uses.amplify, id, { id: row.base.id, names, qty }));
        (row.research || []).forEach((id) => push(uses.amplify, id, { id: row.base.id, names }));
      })
    );
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
  const costText = (cost) => (cost || []).map(([id, qty]) => `${num(qty)} ${L(ARC.item(id).name)}`).join(' + ');
  const researchText = (id) => t('items.needsResearch', { name: L(ARC.item(id).name) });

  // What an upgrade needs besides its cost: a station level, research, perks picked first.
  function needs(u, after) {
    const tags = [];
    if (u.bench) tags.push(html`<a class="tag" href="${link('station', u.bench)}">${benchText(u.bench, u.level)}</a>`);
    (u.research || []).forEach((id) => tags.push(html`<a class="tag" href="${link('item', id)}">${researchText(id)}</a>`));
    if (after && after.length) tags.push(html`<span class="tag">${t('items.perkAfter', { perk: after.map(L).join(' + ') })}</span>`);
    return tags.length ? html`<div class="tags upgrade-needs">${tags}</div>` : '';
  }

  // Tier steps show the next tier and its cost. An Amplified weapon lists every perk
  // of its tree; a variant, the perks it can still add.
  function upgradesTo(i, u) {
    const tree = u.perks.get(i.id);
    const rows = tree
      ? [...tree.values()].sort((a, b) => a.depth - b.depth)
      : (i.upgrades || []).map((up) => ({ ...up, perk: addedPerk(i, up.to) }));
    if (!rows.length) return '';
    return rows.map((r) =>
      r.perk
        ? html`<h4><a href="${link('item', r.to)}">${L(r.perk)}</a></h4>${needs(r, r.after)}${chipList(r.cost)}`
        : html`<div class="chip-list">${itemChip(r.to)}</div>${needs(r)}
            ${r.cost ? html`<h4>${t('items.upgradeCost')}</h4>${chipList(r.cost)}` : ''}`
    );
  }

  function sources(i, u) {
    const parts = [];
    const from = u.from.get(i.id);
    if (from)
      parts.push(html`<h4>${t('items.upgradedFrom')}</h4><ul class="link-list">${from.map(
        ({ i: f, u: up }) => html`<li><a href="${link('item', f.id)}">${L(f.name)}</a>
          <span class="note">${[costText(up.cost), up.bench && benchText(up.bench, up.level), ...(up.research || []).map(researchText)].filter(Boolean).join(' · ')}</span></li>`
      )}</ul>`);
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
    const spots = ARC.mapSpots(i.id);
    if (spots.length)
      parts.push(html`<h4>${t('map.onMap')}</h4><div class="tags">${spots.map(
        (s) => html`<a class="tag" href="${s.href}">${label('maps', s.map)} <span class="num">${num(s.count)}</span></a>`
      )}</div>`);
    if (i.foundIn)
      parts.push(html`<h4>${t('items.foundIn')}</h4><div class="tags">${i.foundIn.map((f) => html`<span class="tag">${label('locations', f)}</span>`)}</div>`);
    return parts.length ? parts : '';
  }

  function usedFor(i, u) {
    const parts = [];
    const craft = u.craft.get(i.id);
    if (craft) parts.push(html`<h4>${t('items.usedCraft')}</h4>${chipList(craft.map(([id]) => [id]))}`);
    const amplify = u.amplify.get(i.id);
    if (amplify)
      parts.push(html`<h4>${t('items.usedAmplify')}</h4><ul class="link-list">${amplify.map(
        (a) => html`<li><a href="${link('item', a.id)}">${a.names.map(L).join(' · ')}</a>${a.qty ? html`<span class="note">×${num(a.qty)}</span>` : ''}</li>`
      )}</ul>`);
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

  // Player guides arrive after the page renders (data/guides.js, loaded in boot).
  function guide(i) {
    const g = i.guide && data.guides && data.guides[i.guide];
    if (!g) return '';
    const part = (key, v) => (v ? html`<h4>${t(`items.guide.${key}`)}</h4><p class="prose">${L(v)}</p>` : '');
    // One link per site, so five wiki pages read as "arcraiders.wiki".
    const hosts = new Map();
    for (const s of g.sources || []) {
      const host = new URL(s).hostname.replace(/^www\./, '');
      if (!hosts.has(host)) hosts.set(host, s);
    }
    return html`<section class="detail__section guide">
      <h3>${t('items.guide')}</h3>
      <p class="guide__verdict">${L(g.verdict)}</p>
      ${part('use', g.use)}
      ${part('obtain', g.obtain)}
      ${part('amplified', g.amplified)}
      ${g.tips && g.tips.length ? html`<h4>${t('items.guide.tips')}</h4><ul class="guide__tips prose">${g.tips.map((tip) => html`<li>${L(tip)}</li>`)}</ul>` : ''}
      <p class="note guide__foot">${t('items.guide.about', { version: g.version })}${hosts.size
        ? html` ${t('items.guide.sources')} ${[...hosts].map(([host, href], n) => html`${n ? ', ' : ''}<a href="${href}" target="_blank" rel="noopener">${host}</a>`)}`
        : ''}</p>
    </section>`;
  }

  function detail(i) {
    const u = lookups();
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
      ${guide(i)}
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
      ${section(t('items.upgradesTo'), upgradesTo(i, u))}
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
      ${section(t('items.compatible'), i.compatible && html`<div class="tags">${i.compatible.map((w) => html`<span class="tag">${L(w)}</span>`)}</div>`)}
      ${i.tip && !i.guide ? section(t('items.tip'), html`<p class="prose" lang="${i.tip.zh && ARC.lang === 'zh' ? 'zh-CN' : 'en'}">${L(i.tip)}</p>`) : ''}`;
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

  // Guides are a large file only the drawer needs, so they load after the grid.
  // A script tag (not fetch) keeps this working when the page is opened from disk.
  const s = document.createElement('script');
  s.src = ARC.fresh('data/guides.js');
  s.onload = drawer.refresh;
  document.head.appendChild(s);
})();
