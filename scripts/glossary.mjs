// Chinese names and terms used by build-data.mjs and fetch-news.mjs.
//
// CLIENT holds the game's own zh-CN names, copied from the ARC Raiders subtitle
// glossary into glossary-client.json by import-glossary.mjs. They win over the
// upstream data, whose Chinese mixes client text with arctracker's own wording.
//
// Everything else here fills gaps. "game" entries repeat client wording found in
// quest text; "site" entries are this wiki's wording for names and labels the
// glossary doesn't cover. Keep them plain, and use the CLIENT terms inside them.

import fs from 'node:fs';

const client = JSON.parse(fs.readFileSync(new URL('./glossary-client.json', import.meta.url), 'utf8'));

// [English, zh-CN] as written in the glossary, and a lookup by English in any case.
export const CLIENT_TERMS = Object.values(client.sections).flatMap((terms) => Object.entries(terms));
export const CLIENT = new Map(CLIENT_TERMS.map(([en, zh]) => [en.toLowerCase(), zh]));

// source: game — quest text ("将…交给萨尼", "塞莱斯特的日记", …)
export const TRADERS = {
  Shani: '萨尼',
  Celeste: '塞莱斯特',
  'Tian Wen': '天玟',
  Apollo: '阿波罗',
  Lance: '兰斯',
};

// Upstream ARC names that differ from the client's English name.
export const BOT_ALIASES = {
  'The Queen': 'Queen',
  Surveyor: 'ARC Surveyor',
};

// source: site — names the client glossary doesn't cover, where upstream
// zh-CN is wrong or disagrees with the quest text that mentions the item.
export const NAMES = {
  'Expedition Project (Expedition 1)': '远征计划（第 1 次远征）',
  'Expedition Project (Expedition 2)': '远征计划（第 2 次远征）',
  'Expedition (Expedition 3)': '远征（第 3 次远征）',
  'Expedition (Expedition 4)': '远征（第 4 次远征）',
  'Expedition (Season 5)': '远征（第 5 次远征）',
  'Raider Flag': '奇袭者旗帜',
  "Major Aiva's Mementos": '艾娃少校的纪念品',
  "Dodger's Note": '道奇的笔记',
  'Scout Patrol Note': '侦察巡逻笔记',
  'Secret Meeting Info': '秘密集会情报',
  'Experimental Seed Sample': '实验型种子样本',
  'First Wave Compass': '“第一波”指南针',
  'First Wave Rations': '“第一波”口粮',
  'First Wave Tape': '“第一波”录像带',
  'Moisture Meter': '水分测量仪',
  'Nutrient Meter': '营养测量仪',
  'Ion Sputter': '离子溅射仪',
  'Film Reel': '电影胶卷',
  Tellurion: '三球仪',
  'Prickly Pear': '仙人掌果',
  Motor: '电动机',
  'Unusable Weapon': '报废的武器',
  'Broken Handheld Radio': '损坏的手持无线电',
  'Broken Taser': '损坏的电击枪',
  'Ruined Parachute': '损毁的降落伞',
};

// source: site — names from the official news that are newer than the client
// glossary. fetch-news.mjs gives them to the translator like client terms;
// replace one with the client's own name once a client update has it.
export const NEWS_TERMS = {
  'Frozen Trail': '冰封之径',
  'Reward Pass': '奖励通行证',
};

// source: site
export const BOT_TYPES = {
  'Heavy Assault': '重型突击',
  'Heavy Artillery': '重型炮击',
  'Area Denial': '区域封锁',
  'Medium Drone': '中型无人机',
  'Siege Engine': '攻城机器',
  Boss: '首领',
  Explosive: '自爆',
  'Flying Artillery': '空中炮击',
  'Sniper Turret': '狙击炮塔',
  'Scout Drone': '侦察无人机',
  Reconnaissance: '侦察',
  'Ambush Predator': '伏击',
  'Defense System': '防御系统',
  'Flying Drone': '飞行无人机',
};

// source: site. Ordered from least to most dangerous.
export const THREATS = {
  Low: '低',
  Moderate: '中',
  High: '高',
  Critical: '危急',
  Extreme: '极高',
};

// source: site — loot area types ("Found in"). The rest use upstream zh-CN.
export const LOCATIONS = {
  Security: '安保',
};

// source: site — item stat labels. Client terms (伤害, 射速, 耐用性, 灵敏度 …)
// where the glossary has them. "12% Reduced X" and "+8 X" reuse these labels.
export const EFFECT_LABELS = {
  'ARC Armor Penetration': 'ARC 护甲穿透',
  'ARC Stun Duration': 'ARC 眩晕时长',
  Agility: '灵敏度',
  'Ammo Type': '弹药类型',
  'Backpack Slots': '背包栏位',
  Charge: '护盾值',
  'Compatible With': '兼容武器',
  'Compatible with': '兼容武器',
  Damage: '伤害',
  'Damage Reduction': '伤害减免',
  Durability: '耐用性',
  Duration: '持续时间',
  'Fire Rate': '射速',
  'Firing Mode': '射击模式',
  'Grenade Use Slots': '手雷栏位',
  'Heal Capacity': '治疗总量',
  Healing: '治疗量',
  Health: '生命值',
  'Health Cost': '生命值消耗',
  'Health Regeneration': '生命值恢复',
  'Homing Range': '追踪范围',
  'Illumination Radius': '照明半径',
  'Increased ADS Speed': '瞄准速度提升',
  'Increased Bullet Velocity': '子弹初速提升',
  'Increased Distance Until Damage Falloff': '伤害衰减距离增加',
  'Increased Durability Burn Rate': '耐用性消耗加快',
  'Increased Equip Time': '切枪时间延长',
  'Increased Fire Rate': '射速提升',
  'Increased Horizontal Recoil': '水平后坐力增加',
  'Increased Recoil Recovery Time': '后坐力恢复时间延长',
  'Increased Unequip Time': '收枪时间延长',
  'Increased Vertical Recoil': '垂直后坐力增加',
  'Magazine Size': '弹匣容量',
  'Max Loadout Weight': '负重上限',
  'Movement Speed': '移动速度',
  'Noise Reduction': '噪音降低',
  'Opens a door somewhere on': '开门地点',
  'Projectiles Per Shot': '每发弹丸数',
  'Quick Use Slots': '快速使用栏位',
  Radius: '半径',
  'Raider Stun Duration': '奇袭者眩晕时长',
  Range: '射程',
  Recharge: '充能量',
  'Reduced ADS Speed': '瞄准速度降低',
  'Reduced Base Dispersion': '基础散布降低',
  'Reduced Bolt Action Time': '拉栓时间缩短',
  'Reduced Dispersion Recovery Time': '散布恢复时间缩短',
  'Reduced Equip Time': '切枪时间缩短',
  'Reduced Horizontal Recoil': '水平后坐力降低',
  'Reduced Max Shot Dispersion': '最大散布降低',
  'Reduced Movement Speed': '移动速度降低',
  'Reduced Noise': '噪音降低',
  'Reduced Per-Shot Dispersion': '单发散布降低',
  'Reduced Projectile Damage': '弹丸伤害降低',
  'Reduced Recoil Recovery Time': '后坐力恢复时间缩短',
  'Reduced Reload Time': '装填时间缩短',
  'Reduced Unequip Time': '收枪时间缩短',
  'Reduced Vertical Recoil': '垂直后坐力降低',
  Restores: '恢复',
  'Safe Pocket Slots': '安全口袋栏位',
  'Shield Compatibility': '可用护盾',
  'Special Trait': '特性',
  Stability: '稳定性',
  Stamina: '耐力',
  'Stamina Drain': '耐力消耗',
  'Stamina Regeneration': '耐力恢复',
  Stealth: '潜行',
  'Timer Duration': '倒计时',
  'Tracked for quest': '任务物品',
  'Trigger Radius': '触发半径',
  'Upgrade Modifiers': '升级加成',
  'Use Time': '使用时间',
  'Weapon Slots': '武器栏位',
  'Weight Limit': '负重上限',
};

// source: site — text values inside item effects. Values that are item or map
// names (e.g. "Heavy Ammo") resolve through their own zh-CN name instead.
export const EFFECT_VALUES = {
  Light: '轻型',
  Medium: '中型',
  Heavy: '重型',
  'Very Weak': '极弱',
  Weak: '弱',
  Moderate: '中等',
  Strong: '强',
  'Very Strong': '极强',
  'Bolt-Action': '栓动',
  'Single-Action': '单动',
  'Slide-Action': '滑动',
  'Semi-Automatic': '半自动',
  'Fully-Automatic': '全自动',
  'Pump-Action': '泵动',
  'Break-Action': '中折',
  'Lever-Action': '杠杆',
  '3-Round Burst': '三发点射',
  Scoped: '配备瞄准镜',
  'Integrated Silencer': '内置消音器',
  'Twin Shot': '双发',
  Experimental: '实验型',
};

// source: site — weapon attachment slots.
export const MOD_SLOTS = {
  muzzle: { en: 'Muzzle', zh: '枪口' },
  grip: { en: 'Grip', zh: '握把' },
  magazine: { en: 'Magazine', zh: '弹匣' },
  stock: { en: 'Stock', zh: '枪托' },
  special: { en: 'Special', zh: '特殊' },
};
