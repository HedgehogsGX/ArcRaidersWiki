/* News: every synced post, filterable by the site's own tags. */

(function () {
  const { html, mount, t, num } = ARC;
  const posts = ARC.news.posts;
  const tags = [...new Set(posts.flatMap((p) => p.tags))];
  const untagged = posts.filter((p) => !p.tags.length).length;
  const param = new URLSearchParams(location.search).get('tag');
  let tag = tags.includes(param) || param === 'other' ? param : 'all';

  const matches = (p) => tag === 'all' || (tag === 'other' ? !p.tags.length : p.tags.includes(tag));

  function pill(id, label, count) {
    return html`<button class="pill" type="button" data-tag="${id}" aria-pressed="${tag === id}">${label}<span class="num">${count}</span></button>`;
  }

  function render() {
    mount('#lede', t('news.lede'));
    mount(
      '#controls',
      html`<div class="toolbar"><div class="toolbar__group" role="group" aria-label="${t('page.news')}">
        ${pill('all', t('common.all'), posts.length)}
        ${tags.map((x) => pill(x, ARC.news.tagName(x), posts.filter((p) => p.tags.includes(x)).length))}
        ${untagged ? pill('other', t('news.other'), untagged) : ''}
      </div></div>`
    );
    ARC.news.renderNews(document.getElementById('news-list'), { filter: matches });
  }

  document.getElementById('controls').addEventListener('click', (e) => {
    const button = e.target.closest('[data-tag]');
    if (!button) return;
    tag = button.dataset.tag;
    history.replaceState(null, '', tag === 'all' ? location.pathname : `${location.pathname}?tag=${encodeURIComponent(tag)}`);
    render();
  });

  render();
  ARC.news.openFromHash();
  window.addEventListener('hashchange', ARC.news.openFromHash);
  document.addEventListener('arc:lang', render);
})();
