// Chinese names for terms the upstream data leaves untranslated.
//
// Item types, rarities, locations, skill categories and map names already have
// official zh-CN text upstream, so build-data.mjs reads those directly.
//
// "game" entries below were copied from official zh-CN text elsewhere in the
// upstream data (quest objectives, item names), so they match what players see
// in game. "site" entries are this wiki's own wording for generic labels the
// game never names; keep them plain and literal.

// source: game — quest text ("将…交给萨尼", "塞莱斯特的日记", …)
export const TRADERS = {
  Shani: '萨尼',
  Celeste: '塞莱斯特',
  'Tian Wen': '天玟',
  Apollo: '阿波罗',
  Lance: '兰斯',
};

// source: game — quest objectives ("摧毁一架“马蜂”") and ARC part names ("“堡垒”电池")
export const BOTS = {
  arc_bastion: '堡垒',
  arc_bombardier: '投弹手',
  arc_fireball: '火球',
  arc_hornet: '马蜂',
  arc_leaper: '跳跃者',
  arc_matriarch: '族母',
  arc_pop: '爆爆',
  arc_rocketeer: '火箭手',
  arc_sentinel: '哨卫',
  arc_shredder: '粉碎者',
  arc_snitch: '告密者',
  arc_spotter: '侦察员',
  arc_surveyor: '勘测师',
  arc_the_queen: '女王',
  arc_tick: '跳蚤',
  arc_turret: '炮塔',
  arc_wasp: '黄蜂',
};

// source: site
export const BOT_TYPES = {
  'Heavy Assault': '重型突击',
  'Heavy Artillery': '重型炮击',
  'Area Denial': '区域封锁',
  'Medium Drone': '中型无人机',
  'Siege Engine': '攻城机械',
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

// source: site — text values inside item effects. Values that are item names
// (e.g. "Heavy Ammo") resolve through the item's own zh-CN name instead.
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
