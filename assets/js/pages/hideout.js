/* Hideout: every station with its upgrade costs and the crafts each level unlocks. */

(function () {
  const { html, mount, t, L, alt, asset, data, num, chipList, itemChip } = ARC;
  const stations = data.hideout;

  // Stash upgrades are paid in coins, written upstream as "5000 Coins".
  const other = (text) => {
    const coins = /^(\d+) Coins$/.exec(text);
    return coins ? itemChip('coins', Number(coins[1])) : html`<span class="tag" lang="en">${text}</span>`;
  };

  function craftList(ids) {
    if (!ids || !ids.length) return '';
    const chips = chipList(ids.map((id) => [id]));
    // Long lists fold away so the upgrade costs stay scannable.
    return ids.length > 8
      ? html`<details class="crafts"><summary>${t('hideout.crafts')} <span class="num">${ids.length}</span></summary>${chips}</details>`
      : html`<div class="crafts"><p class="crafts__label">${t('hideout.crafts')}</p>${chips}</div>`;
  }

  function station(s) {
    const levels = s.levels || [];
    return html`<section class="station" id="${s.id}">
      <header class="station__head">
        <div class="station__img">${s.img ? html`<img src="${asset(s.img)}" alt="" loading="lazy" data-fallback>` : ''}</div>
        <div>
          <h2>${L(s.name)}</h2>
          ${alt(s.name) ? html`<p class="detail__alt">${alt(s.name)}</p>` : ''}
          <p class="note">${levels.length ? t('hideout.levels', { n: s.maxLevel }) : t('hideout.base')}</p>
        </div>
      </header>
      ${levels.length
        ? html`<ol class="levels">
            ${levels.map(
              (l) => html`<li class="level">
                <span class="level__n">${t('common.level', { n: l.level })}</span>
                <div class="level__body">
                  ${l.desc ? html`<p>${L(l.desc)}</p>` : ''}
                  ${l.items ? chipList(l.items) : ''}
                  ${l.other ? html`<div class="chip-list">${l.other.map(other)}</div>` : ''}
                  ${!l.items && !l.other ? html`<p class="note">${t('hideout.free')}</p>` : ''}
                  ${craftList((s.crafts || {})[l.level])}
                </div>
              </li>`
            )}
          </ol>`
        : html`<div class="levels levels--flat">${craftList((s.crafts || {})[1])}</div>`}
    </section>`;
  }

  function render() {
    mount('#lede', t('hideout.lede', { count: num(stations.length) }));
    mount(
      '#hideout',
      html`<nav class="toolbar__group station-index" aria-label="${t('page.hideout')}">
          ${stations.map((s) => html`<a class="pill" href="#${s.id}">${L(s.name)}</a>`)}
        </nav>
        ${stations.map(station)}`
    );
  }

  render();
  document.addEventListener('arc:lang', render);
  // Rendering happens after load, so jump to #station ourselves.
  if (location.hash) {
    const el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (el) el.scrollIntoView();
  }
})();
