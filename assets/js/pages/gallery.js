/* Gallery: official artwork from content/gallery.js (scripts/fetch-gallery.mjs),
   filterable by subject (?tag=). Previews open full size in the viewer
   (viewer.js), where the original can be downloaded. */

(function () {
  const { html, mount, t, L, num, asset } = ARC;
  const pictures = window.ARC_GALLERY || [];
  const TAGS = ['key', 'raiders', 'traders', 'places', 'arc', 'objects'];
  const fourK = (p) => Math.max(p.w, p.h) >= 3840;
  const param = new URLSearchParams(location.search).get('tag');
  let tag = TAGS.includes(param) ? param : 'all';
  let shown = [];

  // Where a picture was posted: the post's date, or the media kit / home page.
  const origin = (p) => (p.date ? ARC.date(p.date) : t(p.source.includes('embark-studios') ? 'gallery.from.kit' : 'gallery.from.site'));

  function card(p, i) {
    return html`<li class="gallery__item">
      <button class="gallery__pic" type="button" data-pic="${i}" aria-label="${t('gallery.open', { title: L(p.title) })}">
        <img src="${asset(p.thumb)}" alt="" loading="lazy" decoding="async">
        ${fourK(p) ? html`<span class="gallery__badge">4K</span>` : ''}
      </button>
      <span class="gallery__title">${L(p.title)}</span>
      <span class="gallery__meta"><a href="${p.source}" target="_blank" rel="noopener">${origin(p)}</a>
        <span class="num">${p.w} × ${p.h}</span></span>
    </li>`;
  }

  function pill(id, label, count) {
    return html`<button class="pill" type="button" data-tag="${id}" aria-pressed="${String(tag === id)}">${label}<span class="num">${count}</span></button>`;
  }

  function render() {
    shown = pictures.filter((p) => tag === 'all' || p.tag === tag);
    mount('#lede', t('gallery.lede'));
    mount('#gallery-count', t('gallery.count', { n: num(pictures.length), k: num(pictures.filter(fourK).length) }));
    mount('#gallery-credit', t('gallery.credit'));
    mount(
      '#controls',
      html`<div class="toolbar"><div class="toolbar__group" role="group" aria-label="${t('page.gallery')}">
        ${pill('all', t('common.all'), pictures.length)}
        ${TAGS.map((x) => {
          const n = pictures.filter((p) => p.tag === x).length;
          return n ? pill(x, t(`gallery.tag.${x}`), n) : '';
        })}
      </div></div>`
    );
    mount('#gallery', shown.map(card));
  }

  document.getElementById('controls').addEventListener('click', (e) => {
    const button = e.target.closest('[data-tag]');
    if (!button) return;
    tag = button.dataset.tag;
    history.replaceState(null, '', tag === 'all' ? location.pathname : `${location.pathname}?tag=${encodeURIComponent(tag)}`);
    render();
  });

  document.getElementById('gallery').addEventListener('click', (e) => {
    const button = e.target.closest('.gallery__pic');
    if (!button) return;
    ARC.viewer.open(
      shown.map((p) => ({ preview: asset(p.thumb), full: asset(p.full), alt: L(p.title), caption: () => L(p.title) })),
      Number(button.dataset.pic),
      'gallery.viewer'
    );
  });

  render();
  document.addEventListener('arc:lang', render);
})();
