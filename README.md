# ARC Raiders 维基

非官方的 ARC Raiders 中英双语资料站：物品、任务、技能树、工坊、ARC、地图与互动地图、商人、计划，以及同步自官网的公告和地图条件。中文使用简中客户端的官方译名。

网站：https://arcraiderswiki.pages.dev

## 本地预览

```bash
npm run serve    # 然后打开 http://localhost:8000
```

纯静态站点，不需要构建。

## 目录

```
index.html, pages/       页面
assets/                  样式、脚本、图片、字体；界面文字在 js/strings.js
data/                    游戏数据（build-data.mjs 生成，不要手动修改）
content/                 公告、地图条件、地图标记（同步脚本生成，不要手动修改）
scripts/                 构建与同步脚本，每个脚本开头有详细说明
worker.js, functions/    公告原图的 /news-full/ 路由（Workers 与 Pages 各一个入口）
vendor/arctracker        arctracker.io 的物品、任务、工坊、计划（fetch-arctracker.mjs 生成）
vendor/arcraiders-data   上游游戏数据（git 子模块，停在 1.42；技能树、ARC、商人、地图仍取自这里）
```

## 自动更新

| 内容 | 来源 | 频率 | 上线方式 |
|---|---|---|---|
| 地图条件 | arcraiders.com 地图条件页 | 每小时 | 直接提交到 `main` |
| 官方公告与中文翻译 | arcraiders.com 公告页 | 每天 | 开 "Sync official news" PR，合并后上线 |
| 互动地图标记 | MetaForge | 每周一 | 开 "Sync map markers" PR |
| 物品、任务、工坊、计划 | arctracker.io API | 每天 | 开 "Sync game data" PR |

需要两项仓库设置：

- Settings → Secrets and variables → Actions 中添加 `DEEPSEEK_API_KEY`（公告翻译用；没有时公告只有英文）；
- Settings → Actions → General 中勾选 "Allow GitHub Actions to create and approve pull requests"。

在 `main` 以外的分支手动运行公告同步只算测试：不开 PR，结果作为构件上传。

## 手动更新

```bash
node scripts/fetch-arctracker.mjs        # 物品、任务、工坊、计划的原始数据
node scripts/build-data.mjs              # 游戏数据，先 git submodule update --init
TRANSLATE_API_KEY=… npm run news         # 公告，先 npm install
python3 scripts/fetch-store-skin.py      # 首页外观（只手动更新），先 pip install onnxruntime numpy pillow
node scripts/fetch-map-conditions.mjs    # 地图条件
node scripts/fetch-map-markers.mjs       # 互动地图标记
```

## 部署

`npm run build` 把要发布的文件复制到 `dist/`。托管平台连接本仓库，`main` 有新提交就自动重新部署。

- **Cloudflare Pages**（当前网站）：构建命令 `npm run build`，输出目录 `dist`。
- **腾讯云 EdgeOne Pages**（中国大陆）：设置相同；自定义域名要先完成 ICP 备案，页脚需显示备案号。

公告图片点开后显示官网原图（最大 3840 像素），可下载，手机上可存到相册。原图不进仓库，由 `/news-full/<文件名>` 从 assets.arcraiders.com 取来再从本站发出（`worker.js`，Cloudflare Pages 通过 `functions/` 自动启用；`npm run serve` 本地也有）。没有这个路由的托管平台上，原图直接从官网载入，"下载原图"改为在新标签页打开官网原图。

## 译名

以简中客户端（1.47.0）的术语表为准，导入在 `scripts/glossary-client.json`。术语表没有的名称写在 `scripts/glossary.mjs`：游戏数据用 `NAMES`，公告里的新名称用 `NEWS_TERMS`，优先取 Embark 在 Steam 发布的简中公告（如 Frozen Trail = 霜痕小径）。本站自译的句子在 `scripts/translations.mjs`。

## 致谢

- **游戏数据**：[arctracker.io](https://arctracker.io) 与 [RaidTheory/arcraiders-data](https://github.com/RaidTheory/arcraiders-data)（MIT）。2.0 新增的 ARC 和地图在两者更新前取自官方公告（`scripts/additions.mjs`）
- **互动地图标记**：[MetaForge](https://metaforge.app/arc-raiders) 社区。按其 API 条款注明来源并链接，互动地图页和页脚的链接请保留；网站如要盈利，需先联系 MetaForge。
- **官方公告、地图条件与商店横幅**：[arcraiders.com](https://arcraiders.com)
- **中文译名**：ARC Raiders 简中客户端
- **公告翻译**：[DeepSeek](https://www.deepseek.com)
- **首页抠图**：[BiRefNet](https://github.com/ZhengPeng7/BiRefNet)（MIT），模型文件来自 [rembg](https://github.com/danielgatis/rembg)
- **地图组件**：[Leaflet](https://leafletjs.com) 1.9.4（BSD-2）
- **字体**：[Jost](https://github.com/indestructible-type/Jost)（SIL OFL 1.1）

## 版权

ARC Raiders 及相关商标归 Embark Studios AB 所有。本站为玩家制作的非官方项目，与 Embark Studios、Nexon 无关。本站文字内容采用 CC BY-NC-SA 4.0 协议。
