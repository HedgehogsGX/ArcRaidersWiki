# ARC Raiders 维基

非官方的 ARC Raiders 中英双语资料站：物品、任务、技能树、工坊（Hideout）、ARC、地图、互动地图、商人与计划，以及同步自官网的公告和地图条件排期。游戏数据来自社区项目 [RaidTheory/arcraiders-data](https://github.com/RaidTheory/arcraiders-data) 与 [arctracker.io](https://arctracker.io)，互动地图的标记来自 [MetaForge](https://metaforge.app/arc-raiders)，中文使用简中客户端的官方译名。

纯静态站点，浏览不需要安装或构建。npm 依赖只用于公告翻译脚本。

## 本地预览

```bash
npm run serve
```

等同于 `python3 scripts/serve.py`，然后打开 http://localhost:8000。直接双击 `index.html` 也能使用，只是公告图片等外部资源取决于网络。这个服务器和 `python3 -m http.server` 相同，只是关闭了浏览器缓存，改完文件刷新即可看到。

## 目录结构

```
index.html              首页
pages/                  各资料页（news、items、quests、skills、hideout、arc、maps、map、traders、projects）
  _template.html        新页面模板，内有步骤说明
assets/
  css/                  base（色板、字体、质感）→ layout（页头页脚）→ components（通用组件）→ pages（各页专属）
  js/core.js            路径、语言切换、HTML 模板、物品查询等公共函数
  js/strings.js         界面文字（中 / 英）
  js/site.js            页头、导航、搜索、页脚，导航结构在 SECTIONS 中统一配置
  js/news.js            公告列表与展开动画，首页和公告页共用
  js/conditions.js      地图条件：首页主视觉里的进行中面板，地图页的完整排期与倒计时；互动地图用它标出进行中的条件
  js/pages/             每个页面一个脚本
  img/brand/            标志、主视觉
  img/game/             由构建脚本生成的 ARC、商人、设施、地图图片与物品图标；conditions/ 是官网的地图条件图标
  fonts/                Jost 字体（SIL OFL 协议，见 OFL.txt）
  vendor/leaflet/       Leaflet 1.9.4（BSD-2 协议，见 LICENSE），互动地图用
content/
  news.js               由 fetch-news.mjs 生成的公告，不要手动修改
  news-zh.json          公告中文译文缓存，每篇只翻译一次
  news-img/             公告图片的 WebP 副本，由 fetch-news.mjs 维护
  map-conditions.js     由 fetch-map-conditions.mjs 生成的地图条件排期，不要手动修改
  map-markers/          由 fetch-map-markers.mjs 生成的互动地图标记，每张地图一个文件，不要手动修改
data/                   由构建脚本生成的数据包，不要手动修改
vendor/arcraiders-data  上游数据（git 子模块）
scripts/
  build-data.mjs        从上游生成 data/ 与 assets/img/game/
  glossary-client.json  客户端官方中文译名（由 import-glossary.mjs 从字幕术语表导入，不要手动修改）
  import-glossary.mjs   更新 glossary-client.json
  glossary.mjs          读取客户端译名，并补充术语表没有的名称与标签，注明来源
  translations.mjs      本站自译的文字（ARC 介绍、物品描述等），以英文原文为键
  fetch-news.mjs        同步官网公告并翻译
  fetch-map-conditions.mjs  同步官网的地图条件排期
  fetch-map-markers.mjs 同步 MetaForge 的地图标记，并换算到本站地图的坐标
  build-site.mjs        把待发布的文件复制到 dist/
  serve.py              本地预览服务器
.github/workflows/      每日同步公告、每小时核对地图条件、每周同步地图标记的 GitHub Actions
wrangler.jsonc          Cloudflare 海外站配置
worker.js               Cloudflare 海外站：把首页 / 指向 index.html
```

## 更新游戏数据

上游更新后：

```bash
git submodule update --remote vendor/arcraiders-data
node scripts/build-data.mjs
```

需要 Node 20.9 以上。脚本只保留英文和简体中文，会列出引用了却不存在的物品 id，并在上游出现新物品类型时提醒更新 `ITEM_CATEGORIES`。物品图标每次都从上游复制到 `assets/img/game/items/`，不依赖 arctracker 的 CDN（在中国大陆很慢）；上游还没有图标的新物品暂时沿用 CDN 地址，脚本会列出这些物品。ARC、商人、设施或地图图片有变化时，改用 `node scripts/build-data.mjs --images`（需要 macOS 自带的 `sips`）。地图瓦片保留上游的 0–2 级缩放（上游源图 4096 像素，第 3 级只是放大），星辰山两层各出一张 1024 像素小图和一张 3072 像素大图。上游把星辰山两层的文件名弄反了（`stella_montis_upper` 其实是有种子库和沙盘的底层），`MAP_LEVELS` 已按实际楼层命名为顶层、底层。

上游仓库包含两百多 MB 图片，本站不需要它们。首次克隆时可以跳过：

```bash
git submodule update --init
git -C vendor/arcraiders-data sparse-checkout set --no-cone '/*' '!/images/'
```

构建脚本需要图片时会直接从 git 对象中读取。

## 互动地图

`pages/map.html` 在每张地图的瓦片上画出 ARC 出没点、容器、可采集资源、撤离点、地图条件相关的点位和任务地点，可以按类型、地图条件和楼层（星辰山的顶层与底层，太空港和蓝门的地表与地下）筛选；选中的地图条件在官网排期中正在进行时，下拉框里会标出。ARC、物品和任务页会链接到只显示对应标记的地图，例如 `pages/map.html?map=dam_battlegrounds&show=arc_tick`、`?quest=paving_the_way`。

标记来自 MetaForge 社区。它的 API 可以用于公开项目，条件是注明来源并链接到 https://metaforge.app/arc-raiders ；互动地图页和页脚都有这个链接，删改时请保留。如果网站要以任何方式盈利，需要先联系 MetaForge。

```bash
node scripts/fetch-map-markers.mjs
```

脚本下载六张地图的全部标记，写入 `content/map-markers/`（每张地图一个文件，另有 `index.js` 记录类型、条件名和各图数量）。只需要 Node 18 以上，不用 `npm install`。MetaForge 的坐标是它自己地图图片上的位置，脚本里每张地图的 `affine` 把它换算到本站瓦片的 1000 单位网格上：这组系数是把两边的地图图片做特征点匹配（OpenCV SIFT，每张图上千组匹配点，误差约半个单位）得到的。MetaForge 的坐标是世界坐标，他们重绘图片不影响换算；只有本站的地图瓦片换了，才需要重新校准。上游出现新的标记类型时，脚本会提示把它加进 `TYPES`；中文名先查客户端术语表，再查本站的 ARC、物品和任务数据，最后才是 `TYPES` 里本站自译的名称。

**自动同步**：`.github/workflows/map-markers-sync.yml` 每周一运行一次，标记有变化时开启或更新名为 "Sync map markers" 的 PR，合并后网站即更新。和公告同步一样，需要在 Settings → Actions → General 中允许 GitHub Actions 创建 PR，定时任务只在默认分支上运行。

## 同步官方公告

官网没有 RSS 或公开接口，脚本直接读取 https://arcraiders.com/news 的页面，保留最新 12 篇的全文、图片和 YouTube 视频。正文只保留白名单内的标签，翻译结果也经过同样的过滤。官网图片放在 Google 的服务器上，中国大陆打不开，所以脚本会把缩略图和正文图片转成 WebP 存进 `content/news-img/`（需要 `npm install` 装好的 sharp），已有的直接复用，不再引用的自动删除。

```bash
npm install
ANTHROPIC_API_KEY=你的密钥 npm run news
```

官网只有英文。设置了 `ANTHROPIC_API_KEY` 时，新文章或有改动的文章会用 Claude（`claude-opus-5`）翻译成简体中文，并按客户端术语表和游戏数据中的译名处理物品、任务、地图、地点等名词；译文缓存在 `content/news-zh.json`，同一篇文章不会重复翻译。没有密钥时只更新英文，中文界面会注明"尚未翻译"。

**自动同步**：`.github/workflows/news-sync.yml` 每天 03:17 UTC 运行一次，有新内容时开启或更新名为 "Sync official news" 的 PR，合并后网站即更新。启用前需要：

1. 在仓库 Settings → Secrets and variables → Actions 中添加 `ANTHROPIC_API_KEY`；
2. 在 Settings → Actions → General 中勾选 "Allow GitHub Actions to create and approve pull requests"；
3. 将工作流合并到 `main`（定时任务只在默认分支上运行）。也可以在 Actions 页面手动运行。

## 同步地图条件

首页的「地图条件」来自 https://arcraiders.com/map-conditions 。官网页面里带有未来约 24 小时、五个服务器区域（欧洲、北美、南美、亚洲、大洋洲）的完整排期，脚本从中读取，写入 `content/map-conditions.js`：

```bash
node scripts/fetch-map-conditions.mjs           # 需要时才写入
node scripts/fetch-map-conditions.mjs --force   # 总是写入
```

排期记录的是绝对时间，页面按访客的本地时钟计算「进行中」「即将开始」和倒计时，所以文件不必每小时更新也保持准确。脚本只在这些情况下改写文件：官网排期与已发布的不一致、已发布的排期剩余不足 12 小时、条件或地图的名称有变化。只需要 Node 18 以上，不用 `npm install`。新出现的地图条件会自动下载官网图标到 `assets/img/game/conditions/`；中文名先查脚本里的 `CLIENT_ZH`（游戏客户端译名），再查 `data/events.js`，都没有时脚本会提示。

首页顶部的主视觉里有一个「进行中」面板（手机上紧跟在标题下），一进站就能看到当前的地图条件、剩余时间和下一批开始的条件；完整排期（进行中与即将开始的全部条件）在地图页 `pages/maps.html#conditions`，面板里的「全部排期」链接到那里。服务器区域默认按访客的时区推断，两处都能手动切换，选择保存在浏览器本地，两个页面共用。页面开着时，每小时会重新载入一次排期文件。

**自动同步**：`.github/workflows/map-conditions-sync.yml` 每小时运行一次，文件有变化时以 HedgehogsGX 的身份直接提交到 `main`（通常每天两三次），两个托管平台随即重新部署。这份数据一天内就会过期，所以不像公告那样走 PR。定时任务同样只在默认分支上运行。

## 部署

站点没有真正的构建步骤。`npm run build` 只是把浏览器会加载的文件（`index.html`、`pages/`、`assets/`、`data/`、`content/news.js` 与 `content/news-img/`、`content/map-conditions.js`、`content/map-markers/`）复制到 `dist/`，托管平台只发布这个目录，子模块、脚本和译文缓存不会公开。两个平台都连接本仓库，`main` 有新提交时自动重新部署，所以合并公告同步 PR、或地图条件同步提交后，两边会一起更新。

**海外：Cloudflare Workers**，配置在 `wrangler.jsonc` 和 `worker.js`。在 Cloudflare 控制台 Workers & Pages → Create → Import a repository 中选择本仓库，Worker 名称填 `arc-raiders-wiki`（须与 `wrangler.jsonc` 一致），构建命令填 `npm run build`，部署命令保持默认的 `npx wrangler deploy`。其他分支和 PR 会生成预览链接，并以评论贴到 PR 上。

`html_handling` 设为 `none` 是有意的：默认设置会把 `items.html` 重定向到 `items`，`core.js` 比较路径时就对不上，同页的 `#id` 链接会整页刷新并丢掉筛选条件。关闭后，首页 `/` 由 `worker.js` 指向 `index.html`。

**中国大陆及全球：腾讯云 EdgeOne Pages**。导入本仓库，构建命令 `npm run build`，输出目录 `dist`。加速区域选「全球可用区（含中国大陆）」时，自定义域名必须已完成 ICP 备案；首次备案期间该域名不能对外访问。备案通过后，页脚要显示备案号并链接到 https://beian.miit.gov.cn/ 。

## 约定

- **语言**：界面文字写在 `assets/js/strings.js`；数据中的文字是 `{ en, zh }`，用 `ARC.L()` 取当前语言，缺中文时回退英文。语言选择保存在浏览器本地，默认中文。
- **译名**：以 video-chinese-subtitles 技能里的 ARC Raiders 术语表为准，它取自简中客户端（1.47.0）的语言文件，如 奇袭者、上层、工坊、地图条件、信用点、钱币。上游 zh-CN 混有 arctracker 自己的译法（如 快捷使用物品、背包强化、地表材料、硬币），构建时一律让位给客户端译名。术语表更新后运行 `node scripts/import-glossary.mjs` 再重新构建。术语表没有的名称补在 `scripts/glossary.mjs` 的 `NAMES`；上游缺中文或译得不好的句子写在 `scripts/translations.mjs` 的 `TEXT`，以英文原文为键，上游改写英文后自动回退。上游中文里与术语表冲突的零散用词在 `TERM_FIXES` 中统一替换。
- **配色**：色板取自游戏标志。四条色带各代表一个分区：青色为世界、绿色为装备、黄色为成长、红色为斯佩兰扎；物品稀有度沿用游戏内颜色。
- **链接**：每条资料都能用 `#id` 直接定位，例如 `pages/items.html#anvil_i`、`pages/quests.html#a_bad_feeling`。物品页的筛选条件保存在网址参数中，如 `?category=weapons&rarity=Epic`。

## 版权

ARC Raiders 及相关商标归 Embark Studios AB 所有。本站为玩家制作的非官方项目，与 Embark Studios、Nexon 无关。游戏数据以 MIT 协议由 RaidTheory/arcraiders-data 提供；本站文字内容遵循 CC BY-NC-SA 4.0 协议。Jost 字体以 SIL Open Font License 1.1 授权。互动地图的标记由 [MetaForge](https://metaforge.app/arc-raiders) 社区标注，按其 API 条款注明来源使用；地图组件为 [Leaflet](https://leafletjs.com)（BSD-2 协议）。
