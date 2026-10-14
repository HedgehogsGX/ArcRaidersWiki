#!/usr/bin/env node
// Builds the Gallery: official ARC Raiders artwork, viewable and downloadable at
// full size (most of it 3840×2160).
//
//   node scripts/fetch-gallery.mjs        needs sharp (npm install)
//
// The pictures come from two places:
//
// - Images in arcraiders.com news posts. Their originals stay on
//   assets.arcraiders.com/media/, and the site serves them through /news-full/
//   (worker.js) for viewing and download, as it does for news images.
// - Art that isn't on that host: Embark's media kit (the Press page's Google
//   Drive folder) and the 4K feature art on arcraiders.com's home page. These are
//   copied into content/gallery-full/, the media kit's PNGs as high-quality JPEG.
//
// The list below is picked by hand: key art, characters, places, machines and
// still lifes, leaving out infographics, charts, UI screenshots, store and promo
// cards with large text, and repeats (the earliest post of an image is kept).
// To add a post's new art, add an entry with the image's file name from the post.
//
// Writes content/gallery.js and a WebP preview of each picture in
// content/gallery-img/. Pictures already in content/gallery.js keep their size
// and preview, so a re-run only downloads new entries; files nothing lists any
// more are removed.

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'content/gallery.js');
const IMG_DIR = path.join(ROOT, 'content/gallery-img');
const FULL_DIR = path.join(ROOT, 'content/gallery-full');
const MEDIA = 'https://assets.arcraiders.com/media/';
const NEWS = 'https://arcraiders.com/news/';
const KIT = 'https://www.embark-studios.com/press';
const HOME = 'https://arcraiders.com';
const drive = (id) => `https://drive.usercontent.google.com/download?id=${id}&export=download`;
const PREVIEW = 720; // preview width in px

// tag: key (key art), raiders, traders, places, arc, objects.
// Pictures without a post (the media kit, the home page) come first; the rest
// are sorted newest first by `date`, the date of the post they come from.
const ART = [
  // Embark media kit (Google Drive, linked as MEDIA KIT on embark-studios.com/press).
  { id: 'key-art', from: drive('1fZMvsvUVrcPDzrj0uaUL1__oPngqszKp'), source: KIT, tag: 'key', en: 'ARC Raiders key art', zh: 'ARC Raiders 主视觉' },
  { id: 'key-art-portrait', from: drive('1MTnJgSrEerdoyQfiZ7S6TdbNSEW3bmdU'), source: KIT, tag: 'key', en: 'ARC Raiders key art, portrait', zh: 'ARC Raiders 主视觉（竖版）' },
  // The Features section of arcraiders.com.
  { id: 'queen', from: 'https://assets.arcraiders.com/static/features/feature-3.jpg', source: HOME, tag: 'arc', en: 'Queen', zh: '女王' },
  { id: 'raider-in-the-woods', from: 'https://assets.arcraiders.com/static/features/feature-1.jpg', source: HOME, tag: 'raiders', en: 'Watching from the woods', zh: '林间守望' },
  { id: 'rust-belt', from: 'https://assets.arcraiders.com/static/features/feature-2.jpg', source: HOME, tag: 'places', en: 'The Rust Belt', zh: '锈带' },
  { id: 'raiders-underground', from: 'https://assets.arcraiders.com/static/features/feature-4.jpg', source: HOME, tag: 'raiders', en: 'Raiders underground', zh: '地下的奇袭者' },

  { media: '0f0364ca-a160-ArcRaiders_ScreenShot_16x9_TrialsS06_02_4K.jpg', post: 'trials-season-6', date: '2026-10-12', tag: 'raiders', en: 'Trials Season 6 outfit', zh: '试炼第 6 赛季外观' },
  { media: '229ce844-bff1-ArcRaiders_ScreenShot_16x9_Frigate.jpg', post: 'frozen-trail-is-live', date: '2026-10-08', tag: 'arc', en: 'ARC Frigate', zh: 'ARC护卫者' },
  { media: 'e594110f-7551-ArcRaiders_ScreenShot_Outpost_16x9_02.jpg', post: 'frozen-trail-is-live', date: '2026-10-08', tag: 'places', en: 'Outpost', zh: '哨站' },
  { media: '5a84000e-1b26-ArcRaiders_ScreenShot_FrozenTrailConceptArt_16x9_08.jpg', post: 'frozen-trail-2-0-update', date: '2026-10-08', tag: 'places', en: 'Frozen Trail concept art', zh: '霜痕小径概念图' },
  { media: '0e53db8b-2ff0-ArcRaiders_ScreenShot_Bully_16x9.jpg', post: 'frozen-trail-2-0-update', date: '2026-10-08', tag: 'arc', en: 'Bully', zh: '恶霸' },
  { media: 'f66d8559-3832-ArcRaiders_ScreenShot_16x9_Celeste-02.png', post: 'celeste-capture-upgrade', date: '2026-10-05', tag: 'traders', en: 'Celeste', zh: '塞莱斯特' },
  { media: 'd727c20f-27c3-ArcRaiders_ScreenShot_16x9_Celeste-01.png', post: 'celeste-capture-upgrade', date: '2026-10-05', tag: 'traders', en: 'Celeste in profile', zh: '塞莱斯特侧影' },
  { media: 'c0d3f2f8-6b9e-ArcRaiders_ScreenShot_16x9_Narrative_01.jpg', post: 'live-update-1-45-0', date: '2026-09-08', tag: 'places', en: 'Forging the way north', zh: '向北开路' },
  { media: '2cf42228-8c79-ArcRaiders_ScreenShot_Master_16_9_Duckies.jpg', post: 'live-update-1-45-0', date: '2026-09-08', tag: 'objects', en: 'Community rubber ducks', zh: '社区设计的橡皮鸭子' },
  { media: 'a4b678dd-0879-ArcRaiders_ScreenShot_16x9_Project.jpg', post: 'live-update-1-45-0', date: '2026-09-08', tag: 'objects', en: 'Balloon charm', zh: '热气球挂饰' },
  { media: '2fa346cc-2883-ArcRaiders_ScreenShot_GlitchedARC_16x9.jpg', post: 'live-update-1-42-0', date: '2026-08-18', tag: 'arc', en: 'Glitched ARC', zh: '故障ARC' },
  { media: 'ArcRaiders_ScreenShot_16x9_04.jpg', post: 'frozen-trail-is-coming-october-8th', date: '2026-08-12', tag: 'places', en: 'The next frontier', zh: '下一片边疆' },
  { media: '5d36182d-f462-ArcRaiders_ScreenShot_16x9_03.jpg', post: 'frozen-trail-is-coming-october-8th', date: '2026-08-12', tag: 'places', en: 'Snowbound peaks', zh: '雪封群峰' },
  { media: 'fbe7917e-5c32-ArcRaiders_ScreenShot_16x9_PhantomTargets (1).jpg', post: 'store-update-1-40-0', date: '2026-08-04', tag: 'objects', en: 'Phantom Targets', zh: '幻影目标' },
  { media: '6d8514d2-53d6-ArcRaiders_ScreenShot_TickHunterDLC_16x9 (1).jpg', post: 'store-update-1-40-0', date: '2026-08-04', tag: 'raiders', en: 'Tick Hunter', zh: '跳蚤猎手' },
  { media: 'e9049617-77a6-ArcRaiders_ScreenShot_Master_16_9_FinalsCrossPromo.jpg', post: 'live-update-1-36-0', date: '2026-07-07', tag: 'raiders', en: 'THE FINALS crossover outfit', zh: 'THE FINALS 联动外观' },
  { media: 'c19d9b6a-7cd2-ArcRaiders_ScreenShot_16x9_TrialsSeason05.jpg', post: 'trials-season-5', date: '2026-07-02', tag: 'raiders', en: 'Trials Season 5 outfit', zh: '试炼第 5 赛季外观' },
  { media: '4cd990bd-e6d9-ArcRaiders_ScreenShot_16x9_ForgottenRelics.jpg', post: 'live-update-1-33-0', date: '2026-06-16', tag: 'raiders', en: 'Forgotten Relics', zh: '被遗忘的遗物' },
  { media: 'f826b2c3-34e7-ArcRaiders_ScreenShot_16x9_ForgottenRelics-03.jpg', post: 'live-update-1-33-0', date: '2026-06-16', tag: 'raiders', en: 'Relic hunter', zh: '遗物猎人' },
  { media: '5825a547-f5b7-ArcRaiders_ScreenShot_16x9_ConvergingPathsCabinet-1.jpg', post: 'live-update-1-33-0', date: '2026-06-16', tag: 'places', en: 'Converging Paths', zh: '交汇之路' },
  { media: 'd1786cb6-6456-ARCRaiders-1-33_Reaver_3840x2160.png', post: 'live-update-1-33-0', date: '2026-06-16', tag: 'raiders', en: 'Reaver Set', zh: 'Reaver 套装' },
  { media: 'be1e27b5-d1dc-ArcRaiders_ScreenShot_16x9_NewWeapon.png', post: 'patch-notes-1-29-0', date: '2026-05-19', tag: 'objects', en: 'Rascal', zh: '无赖' },
  { media: 'bf89a5db-6349-ArcRaiders_ScreenShot_16x9_NewTrader_01.png', post: 'patch-notes-1-29-0', date: '2026-05-19', tag: 'places', en: 'Nomadic Envoys', zh: '游牧使团' },
  { media: '465000cc-424c-ARCRaiders-Screenshot_RivenTides_Map_01.jpg', post: 'riven-tides-patch-notes-1-26-0', date: '2026-04-28', tag: 'places', en: 'Hotel Panorama Azzurro', zh: '蔚蓝全景酒店' },
  { media: '89862074-738d-ArcRaiders_ScreenShot_16x9_Turbine_01.jpg', post: 'riven-tides-patch-notes-1-26-0', date: '2026-04-28', tag: 'arc', en: 'ARC Turbine', zh: 'ARC涡轮' },
  { media: '9c9e480e-83fc-ArcRaiders_ScreenShot_16x9_Beachcombing-01.jpg', post: 'riven-tides-patch-notes-1-26-0', date: '2026-04-28', tag: 'places', en: 'Beachcombing', zh: '海滩拾荒点' },
  { media: '21e89ebf-cf0b-ARCRaiders-Screenshot_RivenTides_AvianAlarm.jpg', post: 'riven-tides-patch-notes-1-26-0', date: '2026-04-28', tag: 'objects', en: 'Birdcage', zh: '鸟笼' },
  { media: '46211ade-16c0-ArcRaiders_ScreenShot_16x9_RivenTidesBoats.jpg', post: 'riven-tides-patch-notes-1-26-0', date: '2026-04-28', tag: 'objects', en: 'Model ships', zh: '船模' },
  { media: 'a6877b83-0252-ARCRaiders_Screenshot_RivenTides_NewCosmetics_3840x2160.jpg', post: 'riven-tides-patch-notes-1-26-0', date: '2026-04-28', tag: 'raiders', en: 'Riven Tides outfits', zh: '裂潮镇外观' },
  { media: '009b24ef-58bd-ArcRaiders_ScreenShot_16x9_TrialsS04.jpg', post: 'quick-guide-to-trials-season-4', date: '2026-04-26', tag: 'raiders', en: 'Trials Season 4 outfit', zh: '试炼第 4 赛季外观' },
  { media: 'c4859ba2-68ee-ArcRaiders_ScreenShot_16x9_Flashpoint-Shredders.jpg', post: 'flashpoint-content-update', date: '2026-03-31', tag: 'arc', en: 'Shredder', zh: '粉碎者' },
  { media: 'cf8ed110-a409-ArcRaiders_ScreenShot_16x9_Flashpoint-Scrappy.jpg', post: 'flashpoint-content-update', date: '2026-03-31', tag: 'objects', en: 'Scrappy', zh: '废品仔' },
  { media: 'd307d61e-b825-ArcRaiders_ScreenShot_16x9_Flashpoint-NewCosmetics.jpg', post: 'flashpoint-content-update', date: '2026-03-31', tag: 'raiders', en: 'Brigade, Vanguard and Nascosto sets', zh: 'Brigade、Vanguard 与 Nascosto 套装' },
  { media: '300b4a2b-1ee3-ArcRaiders_ScreenShot_16x9_NewArc-2.jpg', post: 'firefly-comet-tips-and-tricks', date: '2026-02-26', tag: 'arc', en: 'Firefly', zh: '萤火虫' },
  { media: '4280c531-325f-ArcRaiders-ShroudedSky_Hurricane_Screenshot_1.jpg', post: 'shrouded-sky-content-update', date: '2026-02-24', tag: 'places', en: 'Hurricane', zh: '飓风' },
  { media: '9aaa9167-e77b-ArcRaiders-ShroudedSky_WeatherMonitoringProject_1.jpg', post: 'shrouded-sky-content-update', date: '2026-02-24', tag: 'objects', en: 'Weather monitoring', zh: '气象监测' },
  { media: 'ae959a67-cc23-ArcRaiders-ShroudedSky_Hurricane_Screenshot_2.jpg', post: 'shrouded-sky-patch-notes-1-17-0', date: '2026-02-24', tag: 'places', en: 'Into the storm', zh: '迎向风暴' },
  { media: '190a3769-c76b-ArcRaiders-ShroudedSky_WeatherMonitoringProject_3.jpg', post: 'shrouded-sky-patch-notes-1-17-0', date: '2026-02-24', tag: 'objects', en: 'Weathervane', zh: '风向标' },
  { media: '975bafc1-7381-ArcRaiders-ShroudedSky_Visibility.jpg', post: 'surviving-the-hurricane-map-condition', date: '2026-02-20', tag: 'places', en: 'Low visibility', zh: '低能见度' },
  { media: '54efe281-aee2-ArcRaiders_ScreenShot_BuriedCity_1920x1080_1.jpg', post: 'patch-notes-1-13-0', date: '2026-01-27', tag: 'places', en: 'Buried City', zh: '掩埋废城' },
  { media: 'c3bf1c5c-81ac-ArcRaiders_ScreenShot_Headwinds_16x9_02.jpg', post: 'headwinds-content-update', date: '2026-01-27', tag: 'places', en: 'Bird City', zh: '鸟城' },
  { media: '99ed4677-3792-ArcRaiders_Screenshot_Winter-Tips-1_16-9.jpg', post: 'winter-condition-dev-top-tips', date: '2025-12-21', tag: 'places', en: 'Snowfall', zh: '落雪' },
  { media: '2e315ca0-fc31-ArcRaiders_Screenshot_Winter-Tips-Fireworks_16-9.jpg', post: 'winter-condition-dev-top-tips', date: '2025-12-21', tag: 'places', en: 'Fireworks in the snow', zh: '雪中烟花' },
  { media: '83bbb0c4-f9e4-ArcRaiders_FlickeringFlames_16x9.jpg', post: 'cold-snap-patch-notes', date: '2025-12-16', tag: 'places', en: 'Flickering Flames', zh: '摇曳火光' },
  { media: 'f9bc269b-8c7c-ArcRaiders_ColdSnap_16x9.jpg', post: 'whats-coming-in-the-december-update', date: '2025-12-15', tag: 'places', en: 'Cold Snap', zh: '寒潮' },
  { media: '1ea19ba1-e0f9-ARCRaiders_CaravanScreenshot.png', post: 'the-expedition-project-is-departing-soon', date: '2025-12-06', tag: 'objects', en: 'Expedition caravan', zh: '远征车队' },
  { media: '3fd48179-17ba-ArcRaiders_PatchNotes-Ducks_16-9.png', post: 'duck-update-patch-notes-1-3-0', date: '2025-11-20', tag: 'raiders', en: 'Duck collector', zh: '鸭子收藏家' },
  { media: '0e6a2e98-8a98-ArcRaiders_BlogImage_NorthLine-1_16x9.jpg', post: 'north-line-update', date: '2025-11-13', tag: 'places', en: 'Tunnels to the north', zh: '通往北方的隧道' },
  { media: 'bb86620d-e249-ArcRaiders_BlogImage_NorthLine-2_16x9.jpg', post: 'north-line-update', date: '2025-11-13', tag: 'places', en: 'Stella Montis', zh: '星辰山' },
  { media: 'ca7f1e5a-6a7d-ArcRaiders_MapConditions_ElectromagneticStorm_16-9.jpg', post: 'new-map-conditions', date: '2025-11-08', tag: 'places', en: 'Electromagnetic Storm', zh: '电磁风暴' },
  { media: 'bbf29359-06eb-ArcRaiders_MapConditions_HiddenBunker_16-9.jpg', post: 'new-map-conditions', date: '2025-11-08', tag: 'places', en: 'Hidden Bunker', zh: '隐藏地堡' },
  { media: '59bfe924-e89c-ArcRaiders_MapConditions_NightRaid_16-9.jpg', post: 'new-map-conditions', date: '2025-11-08', tag: 'places', en: 'Night Raid', zh: '夜间奇袭' },
  { media: '2d31d39f-055b-ArcRaiders_ServerSlam_DamBattlegrounds.jpg', post: 'server-slam-info', date: '2025-10-14', tag: 'places', en: 'Dam Battlegrounds', zh: '大坝战场' },
  { media: '1efce18e-0783-ArcRaiders_ServerSlam_DamBattlegrounds2.jpg', post: 'server-slam-info', date: '2025-10-14', tag: 'places', en: 'Dam Battlegrounds, clear skies', zh: '晴空下的大坝战场' },
  { media: '70c10a5d-0d0c-ArcRaiders_ServerSlam_Scavenging.jpg', post: 'server-slam-info', date: '2025-10-14', tag: 'raiders', en: 'Scavenging', zh: '搜刮物资' },
  { media: '2ebf6fae-89fe-ArcRaiders_ServerSlam_Arc.jpg', post: 'server-slam-info', date: '2025-10-14', tag: 'arc', en: 'The ARC machines', zh: 'ARC 机器' },
  { media: '523cbda2-5a92-Arc Raiders_Blog-NightRaids_16-9.png', post: 'everything-you-need-to-know', date: '2025-10-13', tag: 'places', en: 'Moonlit raid', zh: '月下奇袭' },
  { media: '8a5bbb11-e3c9-Arc Raiders_Blog-Speranza_16-9.png', post: 'everything-you-need-to-know', date: '2025-10-13', tag: 'places', en: 'Speranza', zh: '斯佩兰扎' },
  { media: '14a3a132-603e-Arc Raiders_Blog-Weapons_16-9.png', post: 'everything-you-need-to-know', date: '2025-10-13', tag: 'objects', en: 'Weapons', zh: '武器' },
  { media: '0cbb6222-5656-Arc Raiders_Blog-CowboyScrappy_16-9.png', post: 'everything-you-need-to-know', date: '2025-10-13', tag: 'objects', en: 'Cowboy Scrappy', zh: '牛仔废品仔' },
  { media: '9dbd6ce1-3057-ArcRaiders_Trader_Celeste.png', post: 'meet-the-traders-blog', date: '2025-09-18', tag: 'traders', en: 'Celeste’s workshop', zh: '塞莱斯特的工坊' },
  { media: '8178d01e-043a-ArcRaiders_Trader_Shani.png', post: 'meet-the-traders-blog', date: '2025-09-18', tag: 'traders', en: 'Shani', zh: '萨尼' },
  { media: 'f95659d2-95f9-ArcRaiders_Trader_TianWen.png', post: 'meet-the-traders-blog', date: '2025-09-18', tag: 'traders', en: 'Tian Wen', zh: '天玟' },
  { media: '12dc951c-ed5c-ArcRaiders_Trader_Apollo.png', post: 'meet-the-traders-blog', date: '2025-09-18', tag: 'traders', en: 'Apollo', zh: '阿波罗' },
  { media: '18ec2c91-3167-ArcRaiders_Trader_Lance.png', post: 'meet-the-traders-blog', date: '2025-09-18', tag: 'traders', en: 'Lance', zh: '兰斯' },
];

// ---- helpers -------------------------------------------------------------------------

const slug = (s) =>
  s
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

async function get(url, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'ArcRaidersWiki gallery (+https://github.com/HedgehogsGX/ArcRaidersWiki)' } });
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      const type = res.headers.get('content-type') || '';
      if (!/^image\/|octet-stream/.test(type)) throw new Error(`not an image (${type}) ${url}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      if (i >= tries) throw err;
      await new Promise((r) => setTimeout(r, 1500 * i));
    }
  }
}

function previous() {
  if (!fs.existsSync(OUT)) return new Map();
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(OUT, 'utf8'), context);
  return new Map((context.window.ARC_GALLERY || []).map((p) => [p.id, p]));
}

// ---- main ------------------------------------------------------------------------------

async function main() {
  const { default: sharp } = await import('sharp');
  fs.mkdirSync(IMG_DIR, { recursive: true });
  fs.mkdirSync(FULL_DIR, { recursive: true });
  const before = previous();

  // Ids: the given one, else the English title; repeats get -2, -3.
  const used = new Map();
  const entries = ART.map((a) => {
    const base = a.id || slug(a.en);
    const n = (used.get(base) || 0) + 1;
    used.set(base, n);
    return { ...a, id: n > 1 ? `${base}-${n}` : base };
  });

  const pictures = [];
  let fetched = 0;
  for (const a of entries) {
    const thumb = `content/gallery-img/${a.id}.webp`;
    const full = a.media ? MEDIA + encodeURIComponent(a.media) : `content/gallery-full/${a.id}.jpg`;
    const old = before.get(a.id);
    let { w, h, bytes } = old && old.full === full ? old : {};
    const have = w && fs.existsSync(path.join(ROOT, thumb)) && (a.media || fs.existsSync(path.join(ROOT, full)));
    if (!have) {
      const input = await get(a.media ? full : a.from);
      let file = input;
      if (!a.media) {
        // JPEGs are kept as they are; the media kit's PNGs (13–15 MB) become JPEG.
        const meta = await sharp(input).metadata();
        if (meta.format !== 'jpeg') file = await sharp(input).flatten({ background: '#130918' }).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
        fs.writeFileSync(path.join(ROOT, full), file);
      }
      const meta = await sharp(file).metadata();
      w = meta.width;
      h = meta.height;
      bytes = file.length;
      await sharp(file).resize({ width: PREVIEW, withoutEnlargement: true }).webp({ quality: 74 }).toFile(path.join(ROOT, thumb));
      fetched += 1;
      console.log(`  ${a.id}: ${w}×${h}, ${(bytes / 1048576).toFixed(1)} MB`);
    }
    pictures.push({
      id: a.id,
      title: { en: a.en, zh: a.zh },
      tag: a.tag,
      date: a.date || null,
      source: a.post ? NEWS + a.post : a.source,
      w,
      h,
      bytes,
      thumb,
      full,
    });
  }

  // Posts' pictures newest first, after the ones without a post (key art first).
  const order = new Map(pictures.map((p, i) => [p.id, i]));
  pictures.sort((a, b) => Boolean(a.date) - Boolean(b.date) || (b.date || '').localeCompare(a.date || '') || order.get(a.id) - order.get(b.id));

  // Drop files nothing lists any more.
  const keep = new Set(pictures.flatMap((p) => [p.thumb, p.full]).map((p) => path.join(ROOT, p)));
  let removed = 0;
  for (const dir of [IMG_DIR, FULL_DIR])
    for (const name of fs.readdirSync(dir))
      if (!keep.has(path.join(dir, name))) {
        fs.rmSync(path.join(dir, name));
        removed += 1;
      }

  fs.writeFileSync(
    OUT,
    `// Generated by scripts/fetch-gallery.mjs from arcraiders.com and Embark's media kit. Do not edit.\nwindow.ARC_GALLERY = ${JSON.stringify(pictures, null, 1)};\n`
  );
  const fourK = pictures.filter((p) => p.w >= 3840 || p.h >= 3840).length;
  console.log(`Gallery: ${pictures.length} pictures (${fourK} at 4K), ${fetched} downloaded${removed ? `, ${removed} old files removed` : ''}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
