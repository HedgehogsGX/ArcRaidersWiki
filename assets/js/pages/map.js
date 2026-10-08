/* Interactive map: each map's tiles with the community markers from MetaForge
   (content/map-markers/, see scripts/fetch-map-markers.mjs) on top, filtered by
   type, map condition and floor. Leaflet handles panning and zooming; markers are
   painted on one canvas, so a few thousand of them stay smooth on phones.

   Maps use a 1000-unit grid with y pointing down, like the images. Leaflet takes
   [lat, lng], so a point is [y, x]. The URL keeps ?map= and accepts show= (type
   or group ids, comma-separated), cond=, layer= and quest= for links from other pages. */

(function () {
  const { html, mount, t, L, alt, asset, link, url, fresh, data, num, label } = ARC;
  const leaflet = window.L;
  // Maps without an image yet (see maps.js) have nothing to show here.
  const maps = data.maps.filter((m) => m.tiles || m.levels);
  const index = window.ARC_MARKER_INDEX;
  const types = index ? index.types : {};
  const STORE = 'arc-wiki-map';
  const GROUPS = ['arc', 'loot', 'nature', 'place', 'event', 'quest'];
  // Drawn last, so on top: ARC, then places, then the rest.
  const PAINT_ORDER = ['quest', 'event', 'loot', 'nature', 'place', 'arc'];
  const DEFAULT_OFF = new Set(['player_spawn', 'bird_nest', 'quest']);
  const BOSSES = new Set(['Extreme', 'Critical']);
  const hover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const MIN_ZOOM = -2.5;
  const MAX_ZOOM = 4;

  // Disc and glyph colors per group, from the logo stripes.
  const COLORS = {
    arc: ['#e4362d', '#fff'],
    loot: ['#f5d63d', '#130918'],
    nature: ['#1d4d31', '#3fd97a'],
    place: ['#62e6ee', '#130918'],
    event: ['#b18cff', '#130918'],
    quest: ['#ff7ab8', '#130918'],
  };

  // 24×24 glyphs, filled with the even-odd rule so inner shapes cut holes.
  const GLYPHS = {
    arc: 'M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16zm0 3a5 5 0 1 1 0 10a5 5 0 1 1 0-10zm0 2.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5z',
    case: 'M9 3h6a1 1 0 0 1 1 1v3h4a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h4V4a1 1 0 0 1 1-1zm1 2v2h4V5z',
    ammo: 'M4 10c0-3 1.5-6 2.5-6S9 7 9 10v10H4zm5.5 0c0-3 1.5-6 2.5-6s2.5 3 2.5 6v10h-5zm5.5 0c0-3 1.5-6 2.5-6S20 7 20 10v10h-5z',
    med: 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6z',
    grenade: 'M9 2h5v3H9zm3 4a7.5 7.5 0 1 1 0 15a7.5 7.5 0 1 1 0-15z',
    cache: 'M12 2l10 10-10 10L2 12z',
    safe: 'M3 3h18v18H3zm9 4.5a4.5 4.5 0 1 0 0 9a4.5 4.5 0 1 0 0-9zm0 3a1.5 1.5 0 1 1 0 3a1.5 1.5 0 1 1 0-3z',
    breach: 'M3 3h8l-2.5 5.5L11 12l-2 9H3zm10 0h8v18h-8l2.5-7.5L12 9z',
    locker: 'M6 2h12v20H6zm2.5 3v2h7V5zm0 4v2h7V9zm0 5v3h2v-3z',
    box: 'M12 2l9 5v10l-9 5-9-5V7z',
    car: 'M6 6h12l2.5 6H22v6h-2.2a2.5 2.5 0 0 1-4.6 0H8.8a2.5 2.5 0 0 1-4.6 0H2v-6h1.5zm1.4 2L6 12h12l-1.4-4z',
    bag: 'M8 8V7a4 4 0 0 1 8 0v1h3.5l1 13h-17l1-13zm2 0h4V7a2 2 0 0 0-4 0z',
    probe: 'M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8zM11 1h2v5h-2zm0 17h2v5h-2zM1 11h5v2H1zm17 0h5v2h-5z',
    husk: 'M12 2a8.5 8.5 0 0 0-8.5 8.5V15l3 2v5h11v-5l3-2v-4.5A8.5 8.5 0 0 0 12 2zM8.5 9a2.2 2.2 0 1 1 0 4.4a2.2 2.2 0 1 1 0-4.4zm7 0a2.2 2.2 0 1 1 0 4.4a2.2 2.2 0 1 1 0-4.4z',
    android: 'M11 1h2v4h-2zM6 6h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zm3 4v3.5h2V10zm4 0v3.5h2V10zm-4 6v1.5h6V16z',
    exit: 'M12 2l9 10h-5.5v10h-7V12H3z',
    hatch: 'M12 2.5a9.5 9.5 0 1 0 0 19a9.5 9.5 0 1 0 0-19zM6.5 9h11v2h-11zm0 4h11v2h-11z',
    metro: 'M3 21V3h3.5L12 10.5 17.5 3H21v18h-3.5V9.5L12 17 6.5 9.5V21z',
    key: 'M7.5 5a6 6 0 1 0 5.6 8H15v3h3.5v-3H22V9.5h-8.9A6 6 0 0 0 7.5 5zm0 3.5a2.5 2.5 0 1 1 0 5a2.5 2.5 0 1 1 0-5z',
    supply: 'M3 4h18v17H3zm7 3.5v3.5H6.5v4H10v3.5h4V15h3.5v-4H14V7.5z',
    depot: 'M12 2l10 9h-3v11H5V11H2z',
    camp: 'M12 2l11 20H1zm0 10l-4.5 10h9z',
    bolt: 'M14 1L4 14h7l-2 9 11-14h-7l2-8z',
    button: 'M12 5a7 7 0 1 0 0 14a7 7 0 1 0 0-14z',
    antenna: 'M11 10h2v12h-2zM12 3a8 8 0 0 1 8 8h-2.5a5.5 5.5 0 0 0-11 0H4a8 8 0 0 1 8-8zm0 4.5a3.5 3.5 0 0 1 3.5 3.5H13a1 1 0 0 0-2 0H8.5A3.5 3.5 0 0 1 12 7.5z',
    spawn: 'M12 2a4.5 4.5 0 1 1 0 9a4.5 4.5 0 1 1 0-9zM3 22a9 8 0 0 1 18 0z',
    star: 'M12 1.5l3.2 7.2 7.8.7-5.9 5.2 1.8 7.7L12 18.3l-6.9 4 1.8-7.7L1 9.4l7.8-.7z',
    snow: 'M11 1h2v22h-2zM1 11h22v2H1zM4.2 5.6l1.4-1.4 14.2 14.2-1.4 1.4zm14.2-1.4l1.4 1.4L5.6 19.8l-1.4-1.4z',
    ship: 'M11 1v15H3zm2 3l8 12h-8zM1 18h22l-3.5 5h-15z',
    bird: 'M1 7c4.5 0 7.5 2.5 11 7.5C15.5 9.5 18.5 7 23 7c-3.5 2.5-7.5 7-11 12C8.5 14 4.5 9.5 1 7z',
    dig: 'M15 1l8 8-3 3-2-2-6 6 1 1-4 4a3 3 0 0 1-4-4l4-4 1 1 6-6-2-2z',
    mine: 'M12 5.5a6.5 6.5 0 1 0 0 13a6.5 6.5 0 1 0 0-13zM11 1h2v4h-2zm0 18h2v4h-2zM1 11h4v2H1zm18 0h4v2h-4z',
    quest: 'M9.5 2h5l-1 13.5h-3zM12 17a2.5 2.5 0 1 1 0 5a2.5 2.5 0 1 1 0-5z',
    leaf: 'M21 3C9.5 3 3.5 9 3.5 16.5c0 1.8.4 3.3 1 4.5 1.2-6 5-10 11-12-5 3-8 7-9 12C16 21 21 14 21 3z',
  };
  const glyphOf = (def) => (def.group === 'arc' ? 'arc' : def.group === 'quest' ? 'quest' : def.glyph || 'leaf');
  const paths = {};
  const path2d = (name) => (paths[name] = paths[name] || new Path2D(GLYPHS[name]));

  // Item icons for plants, loaded once; pins repaint when one arrives.
  const icons = {};
  function icon(def) {
    if (!def.img) return null;
    if (!icons[def.img]) {
      const img = new Image();
      img.onload = () => pinLayer && pinLayer.eachLayer((p) => p.options.pin.def === def && p.redraw());
      img.src = asset(def.img);
      icons[def.img] = img;
    }
    return icons[def.img].complete && icons[def.img].naturalWidth ? icons[def.img] : null;
  }

  function paint(ctx, p, r, pin) {
    const { def, hl } = pin;
    const [fill, ink] = COLORS[def.group];
    ctx.save();
    if (hl) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, r + 2.5, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ebe6d7';
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = def.group === 'nature' ? 1.5 : 1.25;
    ctx.strokeStyle = def.group === 'nature' ? ink : 'rgba(19, 9, 24, 0.9)';
    ctx.stroke();
    if (r >= 7.5) {
      const img = def.group === 'nature' && icon(def);
      if (img) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, r - 1, 0, Math.PI * 2);
        ctx.clip();
        const s = r * 1.7;
        ctx.drawImage(img, p.x - s / 2, p.y - s / 2, s, s);
      } else {
        const s = (r * 1.25) / 24;
        ctx.translate(p.x - 12 * s, p.y - 12 * s);
        ctx.scale(s, s);
        ctx.fillStyle = ink;
        ctx.fill(path2d(glyphOf(def)), 'evenodd');
      }
    }
    ctx.restore();
  }

  // A canvas circle marker that paints the pin above instead of a plain circle.
  const Pin = leaflet.CircleMarker.extend({
    _updatePath() {
      const r = this._renderer;
      if (r._drawing && !this._empty()) paint(r._ctx, this._point, this._radius, this.options.pin);
    },
  });

  const radiusFor = (zoom, def) => {
    const base = zoom < -0.75 ? 3.5 : zoom < 0.25 ? 6 : zoom < 1.5 ? 9 : 11;
    return BOSSES.has(def.threat) ? base * 1.3 : base;
  };

  // A pin's look as an inline SVG, for the filter list and popups.
  function swatch(def) {
    const [fill, ink] = COLORS[def.group];
    if (def.group === 'nature' && def.img)
      return html`<span class="pin-ico pin-ico--img" style="--pin:${fill};--ink:${ink}"><img src="${asset(def.img)}" alt="" loading="lazy" data-fallback></span>`;
    return html`<svg class="pin-ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11.25" fill="${fill}" stroke="rgba(19,9,24,.9)" stroke-width="1.5"/>
      <path transform="translate(12 12) scale(.6) translate(-12 -12)" d="${GLYPHS[glyphOf(def)]}" fill="${ink}" fill-rule="evenodd"/></svg>`;
  }

  // ---- state ----------------------------------------------------------------------

  const params = new URLSearchParams(location.search);
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(STORE)) || {};
  } catch (e) {
    /* storage blocked or empty */
  }
  const save = () => {
    try {
      // Filters that came with a link are not the reader's own; keep theirs until they change one.
      const hidden = state.linked ? saved.hidden : [...state.hidden];
      localStorage.setItem(STORE, JSON.stringify({ map: state.map, hidden }));
    } catch (e) {
      /* not remembered; still works for this visit */
    }
  };

  const allTypes = Object.keys(types);
  function initialHidden() {
    const show = (params.get('show') || '').split(',').filter(Boolean);
    if (params.get('quest')) show.push('quest');
    if (show.length) return new Set(allTypes.filter((id) => !show.includes(id) && !show.includes(types[id].group)));
    if (Array.isArray(saved.hidden)) return new Set(saved.hidden.filter((id) => types[id]));
    return new Set(DEFAULT_OFF);
  }

  const mapById = (id) => maps.find((m) => m.id === id);
  const state = {
    map: (mapById(params.get('map')) || mapById(saved.map) || maps[0]).id,
    layer: params.get('layer') || '',
    cond: params.get('cond') || '',
    quest: params.get('quest') || '',
    hidden: initialHidden(),
    linked: !!(params.get('show') || params.get('quest')),
  };

  // ---- map ---------------------------------------------------------------------------

  let map = null;
  let base = null;
  let pinLayer = null;
  let set = null; // the loaded markers of the current map
  let pins = []; // Pin layers of the current map, in paint order
  const pinCache = {};
  const loading = {};

  function loadMarkers(id) {
    if (window.ARC_MARKERS && window.ARC_MARKERS[id]) return Promise.resolve(window.ARC_MARKERS[id]);
    if (!loading[id])
      loading[id] = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = fresh(`content/map-markers/${id}.js`);
        s.onload = () => (window.ARC_MARKERS && window.ARC_MARKERS[id] ? resolve(window.ARC_MARKERS[id]) : reject());
        s.onerror = () => {
          delete loading[id];
          reject();
        };
        document.head.append(s);
      });
    return loading[id];
  }

  // Layers a map offers: its floors, or surface and underground when some markers are underground.
  function layersOf(m, markers) {
    if (m.levels) return m.levels.map((l) => ({ id: l.id, name: l.name }));
    if (markers && markers.some((row) => row[3] && row[3].l === 'under'))
      return ['surface', 'under'].map((id) => ({ id, name: { en: t(`map.layer.${id}`), zh: t(`map.layer.${id}`) }, ui: true }));
    return [];
  }

  function imageBounds(m) {
    if (!m.levels) return [[0, 0], [1000, 1000]];
    const xs = m.levels.flatMap((l) => [l.bounds[0][0], l.bounds[1][0]]);
    const ys = m.levels.flatMap((l) => [l.bounds[0][1], l.bounds[1][1]]);
    return [[Math.min(...ys), Math.min(...xs)], [Math.max(...ys), Math.max(...xs)]];
  }

  function setBase(m) {
    if (base) map.removeLayer(base);
    if (m.tiles) {
      base = leaflet.tileLayer(`${asset(m.tiles)}/{z}/{x}/{y}.webp`, {
        tileSize: 512,
        // The layer's own range defaults to 0–18, which would drop the tiles when zoomed out
        // below 0 on small screens; zoom 0 tiles are scaled down there instead.
        minZoom: MIN_ZOOM,
        maxZoom: MAX_ZOOM,
        minNativeZoom: 0,
        maxNativeZoom: m.zoom,
        noWrap: true,
        bounds: [[0, 0], [1000, 1000]],
        keepBuffer: 2,
      });
    } else {
      const level = m.levels.find((l) => l.id === state.layer) || m.levels[0];
      const box = level.bounds.map(([x, y]) => [y, x]);
      // The small image shows at once; the full one covers it when it arrives.
      base = leaflet.layerGroup([leaflet.imageOverlay(asset(level.img), box), leaflet.imageOverlay(asset(level.full), box)]);
    }
    base.addTo(map);
    map.getContainer().classList.toggle('is-under', state.layer === 'under');
  }

  function visible(row) {
    const [, , type, extra] = row;
    if (state.hidden.has(type) || !types[type]) return false;
    const e = extra || {};
    if (e.l && e.l !== state.layer) return false;
    if (e.c && !e.c.includes('normal') && !e.c.includes(state.cond)) return false;
    if (type === 'quest' && state.quest && e.q !== state.quest) return false;
    return true;
  }

  function buildPins(id) {
    if (pinCache[id]) return pinCache[id];
    const rank = (row) => PAINT_ORDER.indexOf(types[row[2]] ? types[row[2]].group : 'quest');
    const rows = set.markers.filter((row) => types[row[2]]).sort((a, b) => rank(a) - rank(b));
    pinCache[id] = rows.map((row) => {
      const [x, y, type, extra] = row;
      const def = types[type];
      const pin = new Pin([y, x], { radius: 6, weight: 4, pin: { def, hl: false }, row });
      pin.bindPopup(() => String(popup(row)), { className: 'pin-pop', maxWidth: 300, minWidth: 200, autoPanPadding: [20, 20] });
      if (hover) pin.bindTooltip(() => ARC.esc(L(def.name)), { direction: 'top', offset: [0, -8], className: 'pin-tip' });
      return pin;
    });
    return pinCache[id];
  }

  function refresh() {
    if (!set) return;
    const zoom = map.getZoom();
    const shown = pins.filter((p) => visible(p.options.row));
    pinLayer.clearLayers();
    for (const p of shown) {
      const e = p.options.row[3];
      p.options.pin.hl = !!(state.cond && e && e.c && e.c.includes(state.cond));
      p.setRadius(radiusFor(zoom, p.options.pin.def));
      pinLayer.addLayer(p);
    }
    mount(stage.querySelector('.mapper__count'), t('map.shown', { n: num(shown.length) }));
    renderCounts();
  }

  function resize() {
    const zoom = map.getZoom();
    pinLayer.eachLayer((p) => p.setRadius(radiusFor(zoom, p.options.pin.def)));
  }

  // Where to look first: the markers on the current layer, else the whole image.
  function fit(m) {
    const rows = set ? set.markers.filter((row) => !(row[3] && row[3].l && row[3].l !== state.layer)) : [];
    const bounds = rows.length ? leaflet.latLngBounds(rows.map(([x, y]) => [y, x])) : leaflet.latLngBounds(imageBounds(m));
    map.fitBounds(bounds, { padding: [24, 24], animate: false });
  }

  async function show(id, first) {
    const m = mapById(id);
    state.map = id;
    if (!first) {
      state.cond = '';
      state.quest = '';
    }
    set = null;
    pins = [];
    pinLayer.clearLayers();
    map.closePopup();
    const box = imageBounds(m);
    const pad = 0.25 * Math.max(box[1][0] - box[0][0], box[1][1] - box[0][1]);
    map.setMaxBounds([[box[0][0] - pad, box[0][1] - pad], [box[1][0] + pad, box[1][1] + pad]]);
    const known = layersOf(m, null);
    if (!first || !state.layer) state.layer = known.length ? known[0].id : 'surface';
    setBase(m);
    map.fitBounds(box, { animate: false });
    renderPanel();
    mount(stage.querySelector('.mapper__count'), t('map.loading'));
    syncUrl();
    try {
      const loaded = await loadMarkers(id);
      if (state.map !== id) return;
      set = loaded;
    } catch (e) {
      mount(stage.querySelector('.mapper__count'), t('map.failed'));
      return;
    }
    const layers = layersOf(m, set.markers);
    if (!layers.some((l) => l.id === state.layer)) state.layer = layers.length ? layers[0].id : 'surface';
    if (first && (params.get('show') || state.quest)) findLinked(layers);
    pins = buildPins(id);
    setBase(m);
    renderPanel();
    fit(m);
    refresh();
  }

  // A link to one type, say the Matriarch, whose markers here are all on another floor
  // or tied to a map condition: open where they show, preferring the commonest condition.
  function findLinked(layers) {
    if (set.markers.some(visible)) return;
    const tally = {};
    for (const row of set.markers)
      if (!state.hidden.has(row[2]) && row[3] && row[3].c) row[3].c.forEach((c) => (tally[c] = (tally[c] || 0) + 1));
    const conds = [state.cond, ...Object.keys(tally).sort((a, b) => tally[b] - tally[a])];
    for (const layer of [state.layer, ...layers.map((l) => l.id)])
      for (const cond of conds) {
        Object.assign(state, { layer, cond: cond === 'normal' ? '' : cond });
        if (set.markers.some(visible)) return;
      }
    Object.assign(state, { layer: layers.length ? layers[0].id : 'surface', cond: '' });
  }

  function syncUrl() {
    const q = new URLSearchParams({ map: state.map });
    const m = mapById(state.map);
    if (state.layer && layersOf(m, set && set.markers).length && state.layer !== layersOf(m, set && set.markers)[0].id) q.set('layer', state.layer);
    if (state.cond) q.set('cond', state.cond);
    if (state.quest) q.set('quest', state.quest);
    if (state.linked && params.get('show')) q.set('show', params.get('show'));
    history.replaceState(null, '', `${location.pathname}?${q}`);
    document.title = `${L(m.name)} | ${ARC.pageTitle()}`;
  }

  // ---- popup ----------------------------------------------------------------------------

  const joinNames = (list) => list.join(ARC.lang === 'zh' ? '、' : ', ');
  const condName = (id) => (index.conditions[id] ? L(index.conditions[id]) : id);

  function popup(row) {
    const [, , type, extra] = row;
    const e = extra || {};
    const def = types[type];
    const m = mapById(state.map);
    const layer = e.l && layersOf(m, set.markers).find((l) => l.id === e.l);
    const conds = (e.c || []).filter((c) => c !== 'normal');
    const note = e.n != null && set.notes[e.n];
    const quest = e.q && set.quests[e.q];
    // Quests the site has use its ids; others keep MetaForge's hyphenated key and get no link.
    const go = def.link
      ? { href: link(def.link[0], def.link[1]), text: t(`map.open.${def.link[0]}`) }
      : quest && !e.q.includes('-')
        ? { href: link('quest', e.q), text: t('map.open.quest') }
        : null;
    return html`<div class="pin-pop__head">${swatch(def)}<div>
        <strong>${quest ? L(quest) : L(def.name)}</strong>
        <span class="pin-pop__sub">${quest ? L(def.name) : alt(def.name)}${layer ? html` · ${L(layer.name)}` : ''}</span>
      </div></div>
      ${note ? html`<p class="pin-pop__note"${note.zh && ARC.lang === 'zh' ? '' : html` lang="en"`}>${L(note)}</p>` : ''}
      ${conds.length
        ? html`<p class="pin-pop__cond">${t(e.c.includes('normal') ? 'map.also' : 'map.only', { list: joinNames(conds.map(condName)) })}</p>`
        : ''}
      ${e.k ? html`<p class="pin-pop__fact">${t('map.locked')}</p>` : ''}
      ${e.a ? html`<p class="pin-pop__fact">${t('map.lootType')}：${joinNames(e.a.map((a) => label('locations', a)))}</p>` : ''}
      ${go ? html`<a class="pin-pop__link" href="${go.href}">${go.text} →</a>` : ''}`;
  }

  // ---- panel -----------------------------------------------------------------------------

  let root = null;
  let panel = null;
  let stage = null;

  // How many markers of each type show on the current layer and condition.
  function counts() {
    const out = {};
    if (!set) return out;
    const hidden = state.hidden;
    state.hidden = new Set();
    for (const row of set.markers) if (visible(row)) out[row[2]] = (out[row[2]] || 0) + 1;
    state.hidden = hidden;
    return out;
  }

  function renderCounts() {
    const c = counts();
    panel.querySelectorAll('[data-type]').forEach((b) => {
      const n = c[b.dataset.type] || 0;
      b.querySelector('.pin-row__count').textContent = num(n);
      b.classList.toggle('is-empty', !n);
    });
  }

  function conditionOptions(m) {
    const onMap = new Set();
    if (set) for (const row of set.markers) (row[3] && row[3].c ? row[3].c : []).forEach((c) => c !== 'normal' && onMap.add(c));
    const live = new Set(((ARC.conditions && ARC.conditions.activeOn(m.id)) || []).map((c) => c.id));
    const ids = Object.keys(index.conditions).filter((id) => onMap.has(id));
    return html`<option value="">${t('map.cond.none')}</option>${ids.map(
      (id) => html`<option value="${id}"${id === state.cond ? ' selected' : ''}>${condName(id)}${live.has(id) ? ` ${t('map.cond.live')}` : ''}</option>`
    )}`;
  }

  function renderPanel() {
    const m = mapById(state.map);
    const layers = layersOf(m, set && set.markers);
    const present = set ? new Set(set.markers.map((row) => row[2])) : new Set();
    mount(
      root.querySelector('.mapper__maps'),
      maps.map(
        (x) => html`<button class="pill" type="button" data-map="${x.id}" aria-pressed="${String(x.id === state.map)}">${L(x.name)}</button>`
      )
    );
    mount(
      panel,
      html`<div class="mapper__opts">
        ${layers.length
          ? html`<div class="mapper__layers" role="group" aria-label="${t('map.layer')}">${layers.map(
              (l) => html`<button class="pill" type="button" data-layer="${l.id}" aria-pressed="${String(l.id === state.layer)}">${L(l.name)}</button>`
            )}</div>`
          : ''}
        <label class="mapper__cond"><span class="note">${t('map.cond')}</span>
          <select class="select" data-cond>${conditionOptions(m)}</select></label>
        ${state.layer === 'under' ? html`<p class="note">${t('map.underNote')}</p>` : ''}
        ${state.quest && set && set.quests[state.quest]
          ? html`<p class="mapper__quest"><span>${t('map.questOnly', { quest: L(set.quests[state.quest]) })}</span>
              <button type="button" class="link-button" data-clear-quest>${t('map.questAll')}</button></p>`
          : ''}
      </div>
      <div class="mapper__groups">
        ${GROUPS.map((g) => {
          const list = allTypes.filter((id) => types[id].group === g && present.has(id));
          if (!list.length) return '';
          const on = list.filter((id) => !state.hidden.has(id)).length;
          return html`<section class="pin-group">
            <header class="pin-group__head">
              <h3>${t(`map.group.${g}`)}</h3>
              <button type="button" class="link-button" data-group="${g}">${on ? t('map.hideGroup') : t('map.showGroup')}</button>
            </header>
            <ul class="pin-group__list">${list.map(
              (id) => html`<li><button type="button" class="pin-row" data-type="${id}" aria-pressed="${String(!state.hidden.has(id))}">
                <span class="pin-row__check" aria-hidden="true"></span>${swatch(types[id])}<span class="pin-row__name">${L(types[id].name)}</span><span class="pin-row__count num"></span></button></li>`
            )}</ul>
          </section>`;
        })}
      </div>
      <div class="mapper__actions">
        <button type="button" class="button" data-all="show">${t('map.showAll')}</button>
        <button type="button" class="button" data-all="hide">${t('map.hideAll')}</button>
        <button type="button" class="button" data-all="reset">${t('map.reset')}</button>
      </div>
      <p class="note mapper__credit">${ARC.raw(
        t('map.credit', {
          source: `<a href="${index.source}" target="_blank" rel="noopener">MetaForge</a>`,
          date: ARC.date(index.fetched),
        })
      )}</p>`
    );
    if (set) renderCounts();
  }

  // Update the checkboxes and group buttons in place, so focus and scroll stay put.
  function syncToggles() {
    panel.querySelectorAll('[data-type]').forEach((b) => b.setAttribute('aria-pressed', String(!state.hidden.has(b.dataset.type))));
    panel.querySelectorAll('[data-group]').forEach((b) => {
      const on = [...panel.querySelectorAll(`.pin-group [data-type]`)].some(
        (row) => types[row.dataset.type].group === b.dataset.group && !state.hidden.has(row.dataset.type)
      );
      b.textContent = on ? t('map.hideGroup') : t('map.showGroup');
    });
  }

  function setHidden(ids, hidden) {
    state.linked = false;
    ids.forEach((id) => (hidden ? state.hidden.add(id) : state.hidden.delete(id)));
    save();
    refresh();
    syncToggles();
  }

  function onPanelClick(e) {
    const b = e.target.closest('button');
    if (!b) return;
    const present = set ? [...new Set(set.markers.map((row) => row[2]))] : [];
    if (b.dataset.map && b.dataset.map !== state.map) {
      save();
      show(b.dataset.map).then(save);
    } else if (b.dataset.layer && b.dataset.layer !== state.layer) {
      state.layer = b.dataset.layer;
      map.closePopup();
      setBase(mapById(state.map));
      refresh();
      renderPanel();
      syncUrl();
    } else if (b.dataset.type) {
      setHidden([b.dataset.type], !state.hidden.has(b.dataset.type));
    } else if (b.dataset.group) {
      const list = present.filter((id) => types[id].group === b.dataset.group);
      setHidden(list, list.some((id) => !state.hidden.has(id)));
    } else if (b.dataset.all) {
      if (b.dataset.all === 'reset') {
        state.hidden = new Set(DEFAULT_OFF);
        setHidden([], false);
      } else setHidden(allTypes, b.dataset.all === 'hide');
    } else if (b.hasAttribute('data-clear-quest')) {
      state.quest = '';
      refresh();
      renderPanel();
      syncUrl();
    }
  }

  // ---- start ---------------------------------------------------------------------------

  function render() {
    mount(
      '#lede',
      t('map.lede', {
        count: num(maps.length),
        markers: num(index ? Object.values(index.counts).reduce((n, c) => n + Object.values(c).reduce((a, b) => a + b, 0), 0) : 0),
      })
    );
    if (map) {
      map.closePopup();
      renderPanel();
      syncUrl();
      if (set) mount(stage.querySelector('.mapper__count'), t('map.shown', { n: num(pinLayer.getLayers().length) }));
    }
  }

  function start() {
    root = document.getElementById('mapper');
    if (!root || !leaflet || !index) {
      if (root) mount(root, html`<p class="empty">${t('map.failed')}</p>`);
      return;
    }
    mount(
      root,
      html`<nav class="mapper__maps" aria-label="${t('map.pick')}"></nav>
      <div class="mapper__main">
        <div class="mapper__stage"><div class="mapper__map" id="map-canvas"></div><p class="mapper__count" aria-live="polite"></p></div>
        <aside class="mapper__panel" aria-label="${t('map.filters')}"></aside>
      </div>`
    );
    panel = root.querySelector('.mapper__panel');
    stage = root.querySelector('.mapper__stage');

    const crs = leaflet.extend({}, leaflet.CRS.Simple, { transformation: new leaflet.Transformation(1, 0, 1, 0) });
    map = leaflet.map('map-canvas', {
      crs,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 120,
      maxBoundsViscosity: 0.8,
      attributionControl: false,
      zoomControl: false,
      renderer: leaflet.canvas({ padding: 0.3, tolerance: hover ? 2 : 6 }),
    });
    leaflet.control.zoom({ position: 'topright', zoomInTitle: t('map.zoomIn'), zoomOutTitle: t('map.zoomOut') }).addTo(map);
    pinLayer = leaflet.layerGroup().addTo(map);
    map.on('zoomend', resize);

    root.addEventListener('click', onPanelClick);
    panel.addEventListener('change', (e) => {
      if (!e.target.matches('[data-cond]')) return;
      state.cond = e.target.value;
      map.closePopup();
      refresh();
      syncUrl();
    });

    render();
    show(state.map, true);
    document.addEventListener('arc:lang', render);
  }

  start();
})();
