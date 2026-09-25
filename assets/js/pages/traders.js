/* Traders: each trader's shop with prices and limits, plus a link to their quests. */

(function () {
  const { html, mount, t, L, alt, asset, url, data, num, itemChip } = ARC;
  const traders = data.traders;

  const terms = (s) =>
    [s.daily ? t('traders.daily', { n: s.daily }) : '', s.level ? t('traders.level', { n: s.level }) : ''].filter(Boolean);

  function trader(tr) {
    return html`<section class="trader" id="${tr.id}">
      <header class="trader__head">
        <img class="trader__img" src="${asset(tr.img)}" alt="" loading="lazy" data-fallback>
        <div>
          <h2>${L(tr.name)}</h2>
          ${alt(tr.name) ? html`<p class="detail__alt">${alt(tr.name)}</p>` : ''}
          <p class="trader__links">
            <a href="${url(`pages/quests.html?trader=${encodeURIComponent(tr.name.en)}`)}">${t('traders.quests', { n: tr.quests })}</a>
          </p>
        </div>
      </header>
      <table class="shop">
        <caption class="visually-hidden">${t('traders.shop')}</caption>
        <thead><tr><th scope="col">${t('traders.item')}</th><th scope="col">${t('traders.price')}</th><th scope="col">${t('traders.terms')}</th></tr></thead>
        <tbody>
          ${tr.shop.map(
            (s) => html`<tr>
              <td>${itemChip(s.item, s.qty)}</td>
              <td>${itemChip(s.cost[0], s.cost[1])}</td>
              <td class="shop__terms">${terms(s).map((x) => html`<span class="note">${x}</span>`)}</td>
            </tr>`
          )}
        </tbody>
      </table>
    </section>`;
  }

  function render() {
    mount('#lede', t('traders.lede', { count: num(traders.length) }));
    mount(
      '#traders',
      html`<nav class="toolbar__group station-index" aria-label="${t('page.traders')}">
          ${traders.map((tr) => html`<a class="pill" href="#${tr.id}">${L(tr.name)}</a>`)}
        </nav>
        ${traders.map(trader)}`
    );
  }

  render();
  document.addEventListener('arc:lang', render);
  if (location.hash) {
    const el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (el) el.scrollIntoView();
  }
})();
