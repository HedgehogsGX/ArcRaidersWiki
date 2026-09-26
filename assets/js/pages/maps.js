/* Maps: the live map condition schedule, overview images, the ARC and quests on each map, and map events. */

(function () {
  const { html, mount, t, L, alt, asset, link, url, data, num } = ARC;
  const maps = data.maps;
  const events = data.events || [];
  const bots = data.arc || [];
  const quests = data.quests || [];

  const mapUrl = (m) => url(`pages/map.html?map=${m.id}`);

  // The first zoom level of the map's tiles, in reading order. Multi-level maps
  // (Stella Montis) stack their levels, top level first. Both open the interactive map.
  const picture = (m) =>
    m.tiles
      ? html`<a class="map-card__img map-card__img--tiles" href="${mapUrl(m)}" tabindex="-1">${[[0, 0], [1, 0], [0, 1], [1, 1]].map(
          ([x, y]) => html`<img src="${asset(`${m.tiles}/0/${x}/${y}.webp`)}" alt="" loading="lazy" data-fallback>`
        )}</a>`
      : html`<a class="map-card__img map-card__img--levels" href="${mapUrl(m)}" tabindex="-1">${(m.levels || []).map(
          (l) => html`<figure><img src="${asset(l.img)}" alt="" loading="lazy" data-fallback><figcaption>${L(l.name)}</figcaption></figure>`
        )}</a>`;

  function card(m) {
    const here = bots.filter((b) => (b.maps || []).includes(m.id));
    const count = quests.filter((q) => (q.maps || []).includes(m.id)).length;
    return html`<article class="map-card" id="${m.id}">
      ${picture(m)}
      <div class="map-card__body">
        <div>
          <h2>${L(m.name)}</h2>
          ${alt(m.name) ? html`<p class="detail__alt">${alt(m.name)}</p>` : ''}
        </div>
        ${here.length
          ? html`<div class="arc-card__block"><h3>${t('maps.arc')}</h3><div class="tags">${here.map(
              (b) => html`<a class="tag" href="${link('arc', b.id)}">${L(b.name)}</a>`
            )}</div></div>`
          : ''}
        <a class="button map-card__open" href="${mapUrl(m)}">${t('maps.open')}</a>
        ${count
          ? html`<p class="map-card__quests"><a href="${url(`pages/quests.html?map=${m.id}`)}">${t('maps.quests')}</a>
              <span class="note">${t('common.count', { n: count })}</span></p>`
          : ''}
      </div>
    </article>`;
  }

  function eventList(category) {
    const list = events.filter((e) => e.category === category);
    if (!list.length) return '';
    return html`<div class="events">
      <h3>${t(`maps.${category}`)}</h3>
      <ul class="events__list">
        ${list.map(
          (e) => html`<li class="event"><img src="${asset(e.icon)}" alt="" loading="lazy" data-fallback>
            <span><span class="event__name">${L(e.name)}</span>${alt(e.name) ? html`<span class="note">${alt(e.name)}</span>` : ''}</span></li>`
        )}
      </ul>
    </div>`;
  }

  function render() {
    mount('#lede', t('maps.lede', { count: num(maps.length), events: num(events.length) }));
    mount(
      '#maps',
      html`<section class="section"><div class="map-grid">${maps.map(card)}</div></section>
      <section class="section" id="events">
        <div class="section__head"><h2>${t('maps.events')}</h2></div>
        <div class="events-wrap">${eventList('major')}${eventList('minor')}</div>
      </section>`
    );
  }

  render();
  ARC.conditions.start(document.getElementById('conditions'));
  document.addEventListener('arc:lang', render);
  if (location.hash) {
    const el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (el) el.scrollIntoView();
  }
})();
