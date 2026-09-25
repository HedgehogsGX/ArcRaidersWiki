/* Projects: Speranza's community builds. Every project folds; a contents
   sidebar lists them all like chapters, jumps to one and marks where the reader
   is. Running projects start open, ended ones folded. */

(function () {
  const { html, mount, t, L, num, data, itemChip } = ARC;
  const projects = data.projects;
  const now = Date.now() / 1000;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Upstream dates decide the status; undated, disabled projects count as ended.
  function status(p) {
    if (p.end && p.end < now) return 'ended';
    if (p.start && p.start > now) return 'upcoming';
    return p.active || p.start ? 'live' : 'ended';
  }

  const range = (p) => (p.start ? `${ARC.date(p.start)} – ${p.end && p.end < 2e9 ? ARC.date(p.end) : '…'}` : '');

  // Which projects are unfolded, kept across language switches.
  const opened = new Set(projects.filter((p) => status(p) !== 'ended').map((p) => p.id));

  function groups() {
    const current = projects.filter((p) => status(p) !== 'ended');
    const ended = projects.filter((p) => status(p) === 'ended').sort((a, b) => (b.end || 0) - (a.end || 0));
    return [
      ['projects.live', current],
      ['projects.ended', ended],
    ].filter(([, list]) => list.length);
  }

  function requirement(r) {
    return html`<li class="req">
      ${itemChip(r.id, r.qty)}
      ${r.rewards ? html`<span class="req__reward"><span class="note">${t('projects.reward')}</span>${r.rewards.map(([id, qty]) => itemChip(id, qty))}</span>` : ''}
    </li>`;
  }

  function project(p) {
    const st = status(p);
    return html`<details class="project" id="${p.id}" data-tone="${st === 'live' ? 'yellow' : ''}"${opened.has(p.id) ? html` open` : ''}>
      <summary class="project__head">
        <h3>${L(p.name)}</h3>
        <span class="tags">
          <span class="tag${st === 'live' ? ' tag--tone' : ''}">${t(`projects.${st}`)}</span>
          ${range(p) ? html`<span class="note">${range(p)}</span>` : ''}
          <span class="note">${t('projects.phases', { n: p.phases.length })}</span>
        </span>
      </summary>
      <div class="project__body">
        ${p.desc ? html`<div class="prose project__desc">${ARC.paragraphs(L(p.desc))}</div>` : ''}
        <ol class="phases">
          ${p.phases.map(
            (ph) => html`<li class="phase">
              <div class="phase__n num">${ph.n}</div>
              <div class="phase__body">
                <h4>${ph.name ? L(ph.name) : t('projects.phase', { n: ph.n })}</h4>
                ${ph.desc ? html`<p class="note">${L(ph.desc)}</p>` : ''}
                ${ph.items ? html`<ul class="reqs">${ph.items.map(requirement)}</ul>` : ''}
                ${ph.categories
                  ? html`<ul class="reqs">${ph.categories.map(
                      (c) => html`<li class="req"><span class="tag">${L(c.label)}</span>${c.value ? html`<span class="note">${t('projects.value', { n: num(c.value) })}</span>` : ''}</li>`
                    )}</ul>`
                  : ''}
              </div>
            </li>`
          )}
        </ol>
      </div>
    </details>`;
  }

  // Sidebar on wide screens; on phones a bar under the header that opens the same list.
  function contents(list) {
    return html`<nav class="toc" aria-label="${t('projects.toc')}">
      <button class="toc__toggle" type="button" aria-expanded="false" aria-controls="toc-body">
        <span class="toc__label">${t('projects.toc')}</span><span class="toc__current"></span>
      </button>
      <div class="toc__body" id="toc-body">
        <div class="toc__tools">
          <button type="button" data-fold="open">${t('projects.expandAll')}</button>
          <button type="button" data-fold="close">${t('projects.collapseAll')}</button>
        </div>
        ${list.map(
          ([key, items]) => html`<p class="toc__group">${t(key)}</p>
            <ol class="toc__list">${items.map(
              (p) => html`<li><a class="toc__link" href="#${p.id}" data-toc="${p.id}">
                <span class="toc__name">${L(p.name)}</span>${range(p) ? html`<span class="toc__meta">${range(p)}</span>` : ''}</a></li>`
            )}</ol>`
        )}
      </div>
    </nav>`;
  }

  function render() {
    mount('#lede', t('projects.lede'));
    const list = groups();
    mount(
      '#projects',
      html`<div class="projects">
        ${contents(list)}
        <div class="projects__main">
          ${list.map(
            ([key, items]) => html`<section class="projects__group">
              <h2 class="projects__group-title">${t(key)}<span class="num">${items.length}</span></h2>
              ${items.map(project)}
            </section>`
          )}
        </div>
      </div>`
    );
    spy();
  }

  // ---- jumping ----------------------------------------------------------------

  const toc = () => document.querySelector('.toc');

  function setToc(open) {
    toc().classList.toggle('is-open', open);
    toc().querySelector('.toc__toggle').setAttribute('aria-expanded', String(open));
  }

  // Unfolds the project and brings it into view.
  function jump(id, smooth) {
    const el = id && document.getElementById(id);
    if (!el || !el.matches('.project')) return;
    el.open = true;
    el.scrollIntoView({ behavior: smooth && !reduceMotion.matches ? 'smooth' : 'auto', block: 'start' });
  }

  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-toc]');
    if (link && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.button) {
      e.preventDefault();
      history.pushState(null, '', `#${link.dataset.toc}`);
      setToc(false);
      mark(link.dataset.toc);
      jump(link.dataset.toc, true);
      return;
    }
    const fold = e.target.closest('[data-fold]');
    if (fold) document.querySelectorAll('.project').forEach((el) => (el.open = fold.dataset.fold === 'open'));
    if (e.target.closest('.toc__toggle')) setToc(!toc().classList.contains('is-open'));
  });

  // toggle doesn't bubble; listen in the capture phase.
  document.addEventListener(
    'toggle',
    (e) => {
      if (!e.target.matches || !e.target.matches('.project')) return;
      if (e.target.open) opened.add(e.target.id);
      else opened.delete(e.target.id);
    },
    true
  );

  window.addEventListener('hashchange', () => jump(decodeURIComponent(location.hash.slice(1)), true));

  // ---- where the reader is ------------------------------------------------------------

  let frame = 0;

  // The current chapter is the last project whose top has passed just below the
  // header (and the contents bar on phones); at the very bottom, the last project.
  function spy() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const list = [...document.querySelectorAll('.project')];
      if (!list.length) return;
      const bar = toc().querySelector('.toc__toggle').offsetParent ? toc().getBoundingClientRect().bottom : 0;
      const header = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h'), 10) || 64;
      const line = Math.max(bar, header) + 40;
      const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      const current = atEnd
        ? list.filter((el) => el.getBoundingClientRect().top < window.innerHeight).pop()
        : list.filter((el) => el.getBoundingClientRect().top <= line).pop() || list[0];
      mark(current.id);
    });
  }

  window.addEventListener('scroll', spy, { passive: true });
  window.addEventListener('resize', spy);
  document.addEventListener('toggle', spy, true);

  function mark(id) {
    document.querySelectorAll('[data-toc]').forEach((a) => {
      if (a.dataset.toc !== id) return a.removeAttribute('aria-current');
      a.setAttribute('aria-current', 'true');
      toc().querySelector('.toc__current').textContent = a.querySelector('.toc__name').textContent;
      // Keep the marked entry in view when the sidebar itself scrolls.
      const box = a.closest('.toc__body');
      if (box.scrollHeight > box.clientHeight && (a.offsetTop < box.scrollTop || a.offsetTop + a.offsetHeight > box.scrollTop + box.clientHeight))
        box.scrollTop = a.offsetTop - box.clientHeight / 3;
    });
  }

  render();
  document.addEventListener('arc:lang', render);
  jump(decodeURIComponent(location.hash.slice(1)), false);
})();
