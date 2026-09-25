/* Projects: Speranza's community builds. Running ones first, ended ones folded away. */

(function () {
  const { html, mount, t, L, alt, data, num, itemChip, chipList } = ARC;
  const projects = data.projects;
  const now = Date.now() / 1000;

  // Upstream dates decide the status; undated, disabled projects count as ended.
  function status(p) {
    if (p.end && p.end < now) return 'ended';
    if (p.start && p.start > now) return 'upcoming';
    return p.active || p.start ? 'live' : 'ended';
  }

  const range = (p) => (p.start ? `${ARC.date(p.start)} – ${p.end && p.end < 2e9 ? ARC.date(p.end) : '…'}` : '');

  function requirement(r) {
    return html`<li class="req">
      ${itemChip(r.id, r.qty)}
      ${r.rewards ? html`<span class="req__reward"><span class="note">${t('projects.reward')}</span>${r.rewards.map(([id, qty]) => itemChip(id, qty))}</span>` : ''}
    </li>`;
  }

  function project(p) {
    const st = status(p);
    return html`<article class="project" id="${p.id}" data-tone="${st === 'live' ? 'yellow' : ''}">
      <header class="project__head">
        <h2>${L(p.name)}</h2>
        <div class="tags">
          <span class="tag${st === 'live' ? ' tag--tone' : ''}">${t(st === 'live' ? 'projects.live' : 'projects.ended')}</span>
          ${range(p) ? html`<span class="note">${range(p)}</span>` : ''}
        </div>
      </header>
      ${p.desc ? html`<div class="prose project__desc">${ARC.paragraphs(L(p.desc))}</div>` : ''}
      <ol class="phases">
        ${p.phases.map(
          (ph) => html`<li class="phase">
            <div class="phase__n num">${ph.n}</div>
            <div class="phase__body">
              <h3>${ph.name ? L(ph.name) : t('projects.phase', { n: ph.n })}</h3>
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
    </article>`;
  }

  function render() {
    mount('#lede', t('projects.lede'));
    const live = projects.filter((p) => status(p) !== 'ended');
    const ended = projects.filter((p) => status(p) === 'ended').sort((a, b) => (b.end || 0) - (a.end || 0));
    mount(
      '#projects',
      html`${live.map(project)}
      ${ended.length
        ? html`<details class="ended"${location.hash && ended.some((p) => `#${p.id}` === location.hash) ? html` open` : ''}>
            <summary>${t('projects.showEnded', { n: ended.length })}</summary>
            ${ended.map(project)}
          </details>`
        : ''}`
    );
  }

  render();
  document.addEventListener('arc:lang', render);
  if (location.hash) {
    const el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (el) el.scrollIntoView();
  }
})();
