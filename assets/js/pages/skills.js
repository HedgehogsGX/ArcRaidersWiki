/* Skill tree: three branches, root at the bottom as in game. Since 2.0 each
   branch has two choices: one skill out of two halfway up, and two out of three at
   the top. A choice's skills share a capsule, with the points it needs on a chip
   above. Selecting a node opens its details (#node_id). */

(function () {
  const { html, mount, t, L, alt, data, num, label } = ARC;
  const skills = data.skills;
  const byId = new Map(skills.map((s) => [s.id, s]));
  // The game colors its branches green, yellow and red; they map onto the stripes.
  const TONE = { CONDITIONING: 'green', MOBILITY: 'yellow', SURVIVAL: 'red' };
  const CENTER = { CONDITIONING: 25, MOBILITY: 50, SURVIVAL: 75 };
  // Left to right as laid out in game.
  const categories = [...data.labels.skillCategories].sort((a, b) => CENTER[a.id] - CENTER[b.id]);
  const ROW = 92; // px per row
  const GATE = 30; // px for the chip above a choice

  const unlocks = new Map();
  skills.forEach((s) => (s.prereq || []).forEach((p) => (unlocks.get(p) || unlocks.set(p, []).get(p)).push(s.id)));
  const groups = new Map();
  skills.forEach((s) => s.group && (groups.get(s.group) || groups.set(s.group, []).get(s.group)).push(s));

  // x is branch center ±5 per column; y runs from 15 (top row) in steps of 10.
  const col = (s) => (s.x - CENTER[s.category]) / 5 + 1;
  const row = (s) => Math.round((s.y - 15) / 10);
  const cx = (c) => ((c * 2 + 1) / 6) * 600;

  // Chinese counts in words: 二选一 and 三选二, but 两个 before a measure word.
  const count = (n, measure) => (ARC.lang === 'zh' && (measure ? '零一两三四五六七八九' : '零一二三四五六七八九')[n]) || n;
  const choiceName = (s) => t('skills.choice', { pick: count(s.pick), of: count(groups.get(s.group).length) });

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

    // Rows top to bottom; a row holding a choice gets room for its chip above it.
    const rows = Math.max(...nodes.map(row)) + 1;
    const mid = [];
    let height = 0;
    for (let r = 0; r < rows; r++) {
      if (nodes.some((s) => row(s) === r && s.group)) height += GATE;
      mid[r] = height + ROW / 2;
      height += ROW;
    }
    const y = (s) => mid[row(s)];
    const choices = [...new Set(nodes.filter((s) => s.group).map((s) => s.group))].map((id) => {
      const members = groups.get(id);
      const cols = members.map(col);
      return { id, members, first: members[0], from: Math.min(...cols), to: Math.max(...cols), lit: members.some((s) => lit.has(s.id)) };
    });
    const choiceOf = (s) => s.group && choices.find((c) => c.id === s.group);

    // A link to or from a choice ends inside its capsule, level with the nearer
    // skill, so each lane meets the choice once rather than every skill in it.
    const links = new Map();
    nodes.forEach((s) =>
      (s.prereq || []).forEach((p) => {
        const from = byId.get(p);
        const a = choiceOf(from);
        const b = choiceOf(s);
        const ax = a ? cx(Math.min(Math.max(col(s), a.from), a.to)) : cx(col(from));
        const bx = b ? cx(Math.min(Math.max(col(from), b.from), b.to)) : cx(col(s));
        const key = `${a ? a.id : p}>${b ? b.id : s.id}`;
        const on = (lit.has(p) && lit.has(s.id)) || (links.has(key) && links.get(key).on);
        links.set(key, { x1: ax, y1: y(from), x2: bx, y2: y(s), on });
      })
    );

    return html`<section class="branch" data-tone="${TONE[cat.id]}" aria-labelledby="branch-${cat.id}">
      <h2 class="branch__title" id="branch-${cat.id}">${L(cat.name)}<span class="note">${t('common.count', { n: nodes.length })}</span></h2>
      <div class="branch__tree" style="height:${height}px">
        <svg class="branch__links" viewBox="0 0 600 ${height}" preserveAspectRatio="none" aria-hidden="true">
          ${[...links.values()].map(
            (l) => html`<line x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}" class="${l.on ? 'is-lit' : ''}"/>`
          )}
        </svg>
        ${choices.map(
          (c) => html`<div class="skill-choice${c.lit ? ' is-lit' : ''}" style="--from:${c.from};--to:${c.to};--y:${y(c.first)}" aria-hidden="true">
            <span class="skill-choice__gate">${choiceName(c.first)}<span>${t('skills.need', { points: c.first.need.join(' / ') })}</span></span>
          </div>`
        )}
        ${nodes.map(
          (s) => html`<a class="skill-node${s.group ? ' is-choice' : ''}${lit.has(s.id) ? ' is-lit' : ''}" href="#${s.id}"
            style="--col:${col(s)};--y:${y(s)}" aria-current="${s.id === selected}">
            <span class="skill-node__dot num" aria-hidden="true">${s.max}</span>
            <span class="skill-node__name">${L(s.name)}</span>
          </a>`
        )}
      </div>
    </section>`;
  }

  const nodeLinks = (ids) =>
    html`<div class="link-list">${ids.map((id) => html`<a href="#${id}">${L(byId.get(id).name)}</a>`)}</div>`;

  function choiceText(s) {
    const of = count(groups.get(s.group).length, true);
    return s.pick > 1
      ? t('skills.choiceMany', { pick: count(s.pick, true), of, first: s.need[0], last: s.need[s.need.length - 1] })
      : t('skills.choiceOne', { of, need: s.need[0] });
  }

  function detail(id) {
    const s = byId.get(id);
    const prereq = s.prereq || [];
    const section = (title, body) => (body ? html`<section class="detail__section"><h3>${title}</h3>${body}</section>` : '');
    return html`${ARC.closeButton(t('site.close'))}
      <div class="detail__head skill-head" data-tone="${TONE[s.category]}">
        <div class="skill-node__dot skill-head__dot num${s.group ? ' is-choice' : ''}" aria-hidden="true">${s.max}</div>
        <div>
          <h2 id="drawer-title">${L(s.name)}</h2>
          ${alt(s.name) ? html`<p class="detail__alt">${alt(s.name)}</p>` : ''}
          <div class="tags">
            <span class="tag tag--tone">${label('skillCategories', s.category)}</span>
            ${s.group ? html`<span class="tag">${choiceName(s)}</span>` : ''}
            <span class="tag">${t('skills.maxPoints', { max: s.max })}</span>
          </div>
        </div>
      </div>
      ${s.desc ? html`<div class="detail__desc prose">${ARC.paragraphs(L(s.desc))}</div>` : ''}
      ${section(
        choiceName(s),
        s.group &&
          html`<p>${choiceText(s)}</p>${nodeLinks(groups.get(s.group).filter((x) => x.id !== id).map((x) => x.id))}`
      )}
      ${section(t(prereq.length > 1 ? 'skills.prereqAny' : 'skills.prereq'), prereq.length && nodeLinks(prereq))}
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
