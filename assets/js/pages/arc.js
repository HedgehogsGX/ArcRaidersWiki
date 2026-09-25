/* ARC: every unit with threat, weak point, maps, XP and drops, most dangerous first. */

(function () {
  const { html, mount, t, L, alt, asset, link, data, num, label, chipList } = ARC;
  const bots = data.arc;
  const threats = data.labels.threats.map((x) => x.id);

  // Five segments, filled up to the unit's threat level.
  const meter = (threat) => {
    const level = threats.indexOf(threat) + 1;
    return html`<span class="threat" title="${label('threats', threat)}">
      <span class="threat__bars" aria-hidden="true">${threats.map((_, i) => html`<i${i < level ? html` class="on"` : ''}></i>`)}</span>
      <span>${label('threats', threat)}</span></span>`;
  };

  // Descriptions are translated in scripts/translations.mjs; a new unit shows its English with a note until then.
  const englishOnly = (text) =>
    ARC.lang === 'zh' && text && !text.zh ? html`<span class="note en-note">${t('common.enOnly')}</span>` : '';

  function card(b) {
    return html`<article class="arc-card" id="${b.id}">
      <div class="arc-card__img"><img src="${asset(b.img)}" alt="" loading="lazy" data-fallback></div>
      <div class="arc-card__body">
        <header class="arc-card__head">
          <div>
            <h2>${L(b.name)}</h2>
            <p class="detail__alt">${[alt(b.name), L(b.type)].filter(Boolean).join(' / ')}</p>
          </div>
          ${meter(b.threat)}
        </header>
        ${englishOnly(b.desc)}
        ${b.desc ? html`<p class="arc-card__desc" lang="${b.desc.zh && ARC.lang === 'zh' ? 'zh-CN' : 'en'}">${L(b.desc)}</p>` : ''}
        ${b.weakness
          ? html`<div class="arc-card__block"><h3>${t('arc.weakness')}</h3><p lang="${b.weakness.zh && ARC.lang === 'zh' ? 'zh-CN' : 'en'}">${L(b.weakness)}</p></div>`
          : ''}
        <dl class="arc-card__facts">
          <div><dt>${t('arc.destroyXp')}</dt><dd class="num">${num(b.xp.destroy)}</dd></div>
          <div><dt>${t('arc.lootXp')}</dt><dd class="num">${num(b.xp.loot)}</dd></div>
        </dl>
        ${b.maps
          ? html`<div class="arc-card__block"><h3>${t('arc.maps')}</h3><div class="tags">${b.maps.map(
              (id) => html`<a class="tag" href="${link('map', id)}">${label('maps', id)}</a>`
            )}</div></div>`
          : ''}
        ${b.drops ? html`<div class="arc-card__block"><h3>${t('arc.drops')}</h3>${chipList(b.drops.map((id) => [id]))}</div>` : ''}
      </div>
    </article>`;
  }

  function render() {
    mount('#lede', t('arc.lede', { count: num(bots.length) }));
    mount('#arc', html`<div class="arc-grid">${bots.map(card)}</div>`);
  }

  render();
  document.addEventListener('arc:lang', render);
  if (location.hash) {
    const el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (el) {
      el.classList.add('is-target');
      el.scrollIntoView();
    }
  }
})();
