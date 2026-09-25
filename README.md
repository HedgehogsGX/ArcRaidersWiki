# ARC Raiders Wiki 多语言支持系统

这是一个为ARC Raiders Wiki设计的完整多语言支持系统，支持中英文切换。

## 功能特性

- 🌍 **双语支持**: 支持英文和中文
- 🔄 **实时切换**: 无需刷新页面即可切换语言
- 💾 **持久化存储**: 语言选择会保存到本地存储
- 📱 **响应式设计**: 支持移动端和桌面端
- 🎨 **美观界面**: 现代化的UI设计

## 文件结构

```
ArcRaidersWiki/
├── translations/                 # 翻译文件目录
│   ├── items_zh.json            # 物品中文翻译
│   ├── quests_zh.json            # 任务中文翻译
│   ├── skillNodes_zh.json       # 技能节点中文翻译
│   └── hideoutModules_zh.json   # 隐藏所模块中文翻译
├── js/
│   └── language-manager.js       # 语言管理器核心文件
├── css/
│   └── language-switch.css      # 语言切换样式文件
├── multilang-demo.html          # 多语言演示页面
└── README.md                    # 说明文档
```

## 使用方法

### 1. 引入文件

在你的HTML页面中引入必要的文件：

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ARC Raiders Wiki</title>
    <link rel="stylesheet" href="css/language-switch.css">
</head>
<body>
    <!-- 你的页面内容 -->
    
    <script src="js/language-manager.js"></script>
</body>
</html>
```

### 2. 基本使用

语言管理器会自动初始化并创建语言切换按钮。你可以通过以下方式使用：

```javascript
// 获取当前语言
const currentLang = languageManager.currentLanguage;

// 切换语言
languageManager.switchLanguage('zh'); // 切换到中文
languageManager.switchLanguage('en'); // 切换到英文

// 获取翻译数据
const items = languageManager.getTranslatedData('items');
const quests = languageManager.getTranslatedData('quests');

// 获取特定翻译
const itemName = languageManager.getTranslation('items', 'ferro_i', 'name');
```

### 3. 自定义翻译元素

对于需要翻译的HTML元素，使用`data-en`和`data-zh`属性：

```html
<h1 data-en="ARC Raiders Wiki" data-zh="ARC Raiders 维基">ARC Raiders Wiki</h1>
<p data-en="Welcome to the wiki" data-zh="欢迎来到维基">Welcome to the wiki</p>
```

## API 参考

### LanguageManager 类

#### 构造函数
```javascript
new LanguageManager()
```
创建语言管理器实例。

#### 方法

##### switchLanguage(lang)
切换语言
- `lang` (string): 语言代码 ('en' 或 'zh')

##### getTranslation(category, id, field)
获取特定翻译
- `category` (string): 数据类别 ('items', 'quests', 'skillNodes', 'hideoutModules')
- `id` (string): 项目ID
- `field` (string): 字段名 ('name', 'description', 等)
- 返回: 翻译文本或null

##### getTranslatedData(category)
获取完整翻译数据
- `category` (string): 数据类别
- 返回: 翻译数据数组

##### updateUI()
更新UI语言切换按钮状态

##### updatePageContent()
更新页面内容

## 翻译文件格式

### 物品翻译 (items_zh.json)
```json
[
  {
    "id": "fabric",
    "name": "布料",
    "description": "一种常见的制作材料。",
    "type": "材料",
    "imageFilename": "https://cdn.arctracker.io/items/fabric.png"
  }
]
```

### 任务翻译 (quests_zh.json)
```json
[
  {
    "id": "m1",
    "name": "地表之上",
    "trader": "莎妮",
    "objectives": ["首次前往地表", "可选 - 标记任何ARC"],
    "rewardItemIds": [
      { "itemId": "ferro_i", "quantity": 1 },
      { "itemId": "heavy_ammo", "quantity": 20 }
    ],
    "xp": 4000
  }
]
```

### 技能节点翻译 (skillNodes_zh.json)
```json
[
  {
    "id": "cond_1",
    "name": "年轻肺活量",
    "description": "增加你的最大耐力。",
    "impactedSkill": "最大耐力",
    "knownValue": [],
    "category": "体能",
    "maxPoints": 5,
    "iconName": "skill_running.png",
    "isMajor": true,
    "position": {
      "x": 25,
      "y": 75
    },
    "prerequisiteNodeIds": []
  }
]
```

### 隐藏所模块翻译 (hideoutModules_zh.json)
```json
[
  {
    "id": "scrappy",
    "name": "小淘气",
    "maxLevel": 6,
    "levels": [
      { "level": 1, "requirementItemIds": [] },
      { "level": 2, "requirementItemIds": [
        { "itemId": "dog_collar", "quantity": 1 },
        { "itemId": "torn_blanket", "quantity": 1 }
      ]}
    ]
  }
]
```

## 样式定制

### CSS 变量
你可以通过修改CSS变量来自定义样式：

```css
:root {
    --primary-color: #667eea;
    --secondary-color: #764ba2;
    --accent-color: #ffa500;
    --text-color: #ffffff;
    --background-color: rgba(0, 0, 0, 0.8);
}
```

### 自定义语言切换按钮
```css
.language-switch-btn {
    /* 你的自定义样式 */
}
```

## 扩展支持

### 添加新语言
1. 创建新的翻译文件 (例如 `items_fr.json` 用于法语)
2. 在 `LanguageManager` 类中添加新语言支持
3. 更新语言切换按钮

### 添加新的数据类别
1. 创建对应的翻译文件
2. 在 `loadTranslations()` 方法中添加加载逻辑
3. 在 `updatePageContent()` 方法中添加更新逻辑

## 浏览器支持

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 注意事项

1. 确保翻译文件路径正确
2. 翻译文件必须是有效的JSON格式
3. 所有翻译文件中的ID必须与原始数据文件保持一致
4. 建议定期更新翻译文件以保持数据同步

## 更新日志

### v1.0.0 (2025-01-14)
- 初始版本发布
- 支持中英文切换
- 包含完整的翻译文件
- 响应式设计
- 本地存储支持

## 贡献

欢迎提交翻译改进和新语言支持！

## 许可证

MIT License
