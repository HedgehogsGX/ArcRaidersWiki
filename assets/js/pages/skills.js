/* Skill tree: three branches drawn from upstream node positions, root at the
   bottom as in game. Selecting a node opens its details (#node_id). */

(function () {
  const { html, mount, t, L, alt, data, num, label } = ARC;
  const skills = data.skills;
  const byId = new Map(skills.map((s) => [s.id, s]));
  // The game colors its branches green, yellow and red; they map onto the stripes.
  const TONE = { CONDITIONING: 'green', MOBILITY: 'yellow', SURVIVAL: 'red' };
  const CENTER = { CONDITIONING: 25, MOBILITY: 50, SURVIVAL: 75 };
  // Left to right as laid out in game.
  const categories = [...data.labels.skillCategories].sort((a, b) => CENTER[a.id] - CENTER[b.id]);
  const ROWS = 7;

  const unlocks = new Map();
  skills.forEach((s) => (s.prereq || []).forEach((p) => (unlocks.get(p) || unlocks.set(p, []).get(p)).push(s.id)));

  // Upstream x is branch center ±5; y runs 75 (root) up to 15 in steps of 10.
  const col = (s) => (s.x - CENTER[s.category]) / 5 + 1;
  const row = (s) => (s.y - 15) / 10;
  const cx = (s) => ((col(s) * 2 + 1) / 6) * 600;
  const cy = (s) => ((row(s) + 0.5) / ROWS) * 700;

  // Every node on the way down to the root.
  function chain(id, out = new Set()) {
    if (out.has(id)) return out;
    out.add(id);
    (byId.get(id).prereq || []).forEach((p) => chain(p, out));
    return out;
  }

  function branch(cat) {
    const nodes = skills.filter((s) => s.category === cat.id);
    const selected = drawer && drawer.current;
    const lit = selected && byId.get(selected).category === cat.id ? chain(selected) : new Set();
    return html`<section class="branch" data-tone="${TONE[cat.id]}" aria-labelledby="branch-${cat.id}">
      <h2 class="branch__title" id="branch-${cat.id}">${L(cat.name)}<span class="note">${t('common.count', { n: nodes.length })}</span></h2>
      <div class="branch__tree">
        <svg class="branch__links" viewBox="0 0 600 700" preserveAspectRatio="none" aria-hidden="true">
          ${nodes.flatMap((s) =>
            (s.prereq || []).map((p) => {
              const from = byId.get(p);
              const on = lit.has(s.id) && lit.has(p);
              return html`<line x1="${cx(from)}" y1="${cy(from)}" x2="${cx(s)}" y2="${cy(s)}" class="${on ? 'is-lit' : ''}"/>`;
            })
          )}
        </svg>
        ${nodes.map(
          (s) => html`<a class="skill-node${s.major ? ' is-major' : ''}${lit.has(s.id) ? ' is-lit' : ''}" href="#${s.id}"
            style="--col:${col(s)};--row:${row(s)}" aria-current="${s.id === selected}">
            <span class="skill-node__dot num" aria-hidden="true">${s.max}</span>
            <span class="skill-node__name">${L(s.name)}</span>
          </a>`
        )}
      </div>
    </section>`;
  }

  const nodeLinks = (ids) =>
    html`<div class="link-list">${ids.map((id) => html`<a href="#${id}">${L(byId.get(id).name)}</a>`)}</div>`;

  function detail(id) {
    const s = byId.get(id);
    const section = (title, body) => (body ? html`<section class="detail__section"><h3>${title}</h3>${body}</section>` : '');
    return html`${ARC.closeButton(t('site.close'))}
      <div class="detail__head skill-head" data-tone="${TONE[s.category]}">
        <div class="skill-node__dot skill-head__dot num${s.major ? ' is-major' : ''}" aria-hidden="true">${s.max}</div>
        <div>
          <h2 id="drawer-title">${L(s.name)}</h2>
          ${alt(s.name) ? html`<p class="detail__alt">${alt(s.name)}</p>` : ''}
          <div class="tags">
            <span class="tag tag--tone">${label('skillCategories', s.category)}</span>
            ${s.major ? html`<span class="tag">${t('skills.major')}</span>` : ''}
            <span class="tag">${t('skills.maxPoints', { max: s.max })}</span>
          </div>
        </div>
      </div>
      ${s.desc ? html`<div class="detail__desc prose">${ARC.paragraphs(L(s.desc))}</div>` : ''}
      ${section(t('skills.impact'), s.impact && html`<p>${L(s.impact)}</p>`)}
      ${section(t('skills.known'), s.known && s.known.length && html`<div class="tags">${s.known.map((k) => html`<span class="tag" lang="en">${k}</span>`)}</div>`)}
      ${section(t('skills.prereq'), s.prereq && s.prereq.length && nodeLinks(s.prereq))}
      ${section(t('skills.unlocks'), unlocks.has(id) && nodeLinks(unlocks.get(id)))}`;
  }

  let drawer;
  function renderTree() {
    mount('#skill-tree', html`<div class="branches">${categories.map(branch)}</div>`);
  }

  drawer = ARC.hashDrawer({
    dialog: document.getElementById('skills-drawer'),
    has: (id) => byId.has(id),
    render: (id) => {
      queueMicrotask(renderTree);
      return detail(id);
    },
    title: (id) => L(byId.get(id).name),
  });
  document.getElementById('skills-drawer').addEventListener('close', () => queueMicrotask(renderTree));

  function render() {
    mount('#lede', t('skills.lede', { count: num(skills.length) }));
    renderTree();
    drawer.refresh();
  }

  render();
  drawer.sync();
  document.addEventListener('arc:lang', render);
})();
