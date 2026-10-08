// Content from the 2.0 update (Frozen Trail / 霜痕小径, 2026-10-08) that no data
// source has yet, taken from Embark's own announcements. build-data.mjs adds an
// entry only while the data has nothing with the same id or English name, so
// real data replaces it as soon as it arrives; delete the entry here then.
//
// English: https://arcraiders.com/news/frozen-trail-content-preview
// Chinese: Embark's Simplified Chinese version of the same announcement on Steam.
// The ARC descriptions are Embark's words; the map's is shortened from them.
// Images are crops of the official artwork in those posts. Threat, weak points,
// XP and drops aren't published yet, so the ARC entries leave them out.

export const MAPS = [
  {
    id: 'pendola_pass',
    name: { en: 'Pendola Pass', zh: '彭多拉山口' },
    desc: {
      en: 'An old Italian village and Exodus transport hub beyond the peaks that envelope the Rust Belt. One of the Emperors has fallen here; rare technology lies within.',
      zh: '一个古老的意大利村庄，同时也是离巢交通枢纽，位于环绕锈带的山峰之外。一台 ARC“帝王”在这里倒下，其体内藏有罕见的技术。',
    },
    img: 'assets/img/game/maps/pendola_pass.jpg',
  },
];

export const BOTS = [
  {
    id: 'arc_bully',
    name: { en: 'Bully', zh: '恶霸' },
    desc: {
      en: 'Bully by name, bully by nature: our new machine-learned enemy is an oppressive, aggressive beast that cedes no ground as it gallops upon your position and fights with a host of lethal attacks. Use cover, time your response, and hit your shots; the Bully is quick on its feet and unhinged in its quest.',
      zh: '称之为“恶霸”名副其实。这种全新的机器学习型敌人是压迫性极强、极具攻击性的野兽，它会不留余地的冲向你的阵地，并展开一系列致命攻击。务必利用掩体，把握时机精准反击，“恶霸”不仅行动敏捷，且为达目标不择手段。',
    },
    maps: ['pendola_pass'],
    img: 'assets/img/game/arc/arc_bully.jpg',
  },
  {
    id: 'arc_skulker',
    name: { en: 'Skulker', zh: '潜伏者' },
    desc: {
      en: 'In contrast to the Bully, the Skulker is opportunistic, lying in wait and skirting the edges of your vision to get the drop and unleash a flurry of blows. This is one you’ll want to keep an eye on as a momentary distraction will see it retreat out of sight - the next time you see it, you’ll be feeling it too.',
      zh: '相对于“恶霸”，“潜伏者”是投机主义者，擅长伺机而动，游走在你的视野边缘，并在逮到机会时发动一连串攻击。你必须时刻留意，一旦短暂地分心，就会让它从视线中消失，而下次见到它时，恐怕就得尝尝它的厉害了。',
    },
    maps: ['pendola_pass'],
    img: 'assets/img/game/arc/arc_skulker.jpg',
  },
  {
    id: 'arc_hydra',
    name: { en: 'Hydra', zh: '九头蛇' },
    desc: {
      en: 'This enemy may not traverse, but it sure does move. Split into three stacked and autonomous portions, the Hydra is a turret that can handle entire squads with its triple-threat of weaponry. Found upon the Frigate, the Hydra will require a tactical approach in which Raiders divert attention, find cover quickly, and attack rapidly when the moment arises.',
      zh: '这个敌人虽然不会四处移动，但可不是站着等死。“九头蛇”是由三个叠在一起的独立运作部分所组成的一座炮塔，能够凭借着其三重火力的威胁应付整支小队。“九头蛇”位于“护卫者”上，需要采取战术策略来应付：奇袭者需要转移它的注意力，迅速找到掩体，并在时机成熟时发起进攻。',
    },
    maps: ['pendola_pass'],
    img: 'assets/img/game/arc/arc_hydra.jpg',
  },
];
