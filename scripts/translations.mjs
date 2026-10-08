// This wiki's own Chinese for text the upstream data leaves in English or
// translates poorly. build-data.mjs uses it after the client names in glossary.mjs.
//
// TEXT is keyed by the exact English source text, so an entry stops applying as
// soon as upstream rewrites the English, and the build falls back to upstream
// zh-CN. Game terms inside the sentences follow scripts/glossary-client.json.

export const TEXT = {
  // ---- ARC -----------------------------------------------------------------

  'The Matriarch is an imposing ARC machine that makes the Queen look friendly and can be found during a specific map condition.':
    '族母是一台气势逼人的ARC机器，相比之下连女王都显得和善。只在特定的地图条件下出现。',
  'Central glowing core, which becomes exposed when it attacks. Leg joints are vulnerable too, as well as the red areas on the crown.':
    '中央发光的核心，会在它攻击时暴露。腿部关节和头冠上的红色部位同样脆弱。',
  "A colossal machine deployed during Harvester Events. It's the Goliath of the ARC forces with incredible durability and lethal arsenal. Requires full squad coordination.":
    '在「收割者」地图条件中出动的庞大机器，是ARC阵营里的巨无霸，极其耐打，火力致命。需要整个小队协同应对。',
  'The yellow joints on her legs. Exposes her core when firing the laser.': '腿部的黄色关节。发射激光时会暴露核心。',
  "Massive, crab-like machines that are slow but devastating. They're capable of shredding shields and dealing massive damage with heavy attacks.":
    '形似螃蟹的庞大机器，行动迟缓但破坏力惊人。重击能撕碎护盾，造成巨额伤害。',
  "Destroy the canister on his rear, to expose it's weakpoint.": '摧毁它背后的罐体，即可暴露弱点。',
  'A massive artillery unit designed for long-range bombardment. Equipped with devastating explosive capabilities and heavy armor, it can rain destruction from great distances.':
    '专为远程轰炸设计的大型炮击单位。爆炸火力凶猛，装甲厚重，能从极远处倾泻毁灭性的打击。',
  "Shooting at the yellow rear canister deals direct damage to it's core.": '射击后方的黄色罐体，可直接伤害它的核心。',
  'Massive, arachnid-like siege engine with heavy armor and gravity-defying leap ability. Can clear impossible gaps and reach high vantage points.':
    '形似蜘蛛的巨型攻城机器，装甲厚重，跳跃能力仿佛无视重力。能越过看似无法逾越的沟壑，跳上高处的制高点。',
  "Fire is most effective. Additionally you can shoot into it's eye.": '火焰伤害最有效。也可以射击它的眼睛。',
  'A formidable flying ARC that dominates airspace with powerful rocket attacks and devastating area-of-effect damage. Designed to saturate areas with explosions.':
    '难缠的飞行ARC，凭借威力巨大的火箭和毁灭性的范围伤害称霸天空，专门用爆炸覆盖整片区域。',
  "Destroy two thrusters or shoot it's core, which is located underneath it.": '摧毁两个推进器，或射击位于机身下方的核心。',
  'Small armored rolling ARC that spits flame. Opens front panel when near Raiders to burn them alive, exposing its soft core.':
    '会喷火的小型装甲滚动ARC。靠近奇袭者时会打开前挡板喷火烧人，同时暴露脆弱的核心。',
  "Exposes it's core, when it's using the flamethrower.": '喷火时会暴露核心。',
  'Medium-class drone with armored rotors. It fires focused, high-speed projectiles with a brief red laser warning. Designed to shred shields and light armor.':
    '旋翼带装甲的中型无人机。开火前会短暂亮起红色激光预警，随后射出集中的高速弹丸，专门用来撕碎护盾和轻型装甲。',
  'Unarmored rear thrusters.': '后部没有装甲的推进器。',
  'Stationary but deadly turrets that perch on high vantage points. They scan for targets with long-range precision and lock onto players from a distance.':
    '固定不动却十分致命的炮塔，盘踞在高处的制高点。它们能远距离精确扫描目标，从远处锁定玩家。',
  'The yellow unarmored canister will be your main target.': '主要目标是没有装甲的黄色罐体。',
  'The Shredder appears in Stella Montis, challenging Raiders to stay sharp in close-quarter encounters.':
    '粉碎者出没于星辰山，在近距离遭遇战中考验奇袭者的反应。',
  "Primary weakness is the 'eye-bar' at it's head. You may see the orange core between it's armour plates, which you can shoot too.":
    '主要弱点是头部的“眼条”。装甲板之间露出的橙色核心也可以射击。',
  'Spotters are flying support drones for the Bombardier. They will point a laser at any Raider in line-of-sight so the Bombardier can accurately target them. If both Spotters are destroyed a new pair will respawn. When the Bombardier is destroyed the Spotters will fly away.':
    '侦察员是为投弹手提供支援的飞行无人机。它们会用激光照射视线内的奇袭者，让投弹手精确瞄准。两架侦察员都被摧毁后，会再出现新的一对；投弹手被摧毁后，侦察员会飞走。',
  'Unarmored thrusters': '没有装甲的推进器。',
  'Small explosive ARC that detonates when approached. Quick elimination required to prevent area damage.':
    '靠近就会引爆的小型自爆ARC。必须尽快消灭，以免受到范围伤害。',
  'Just shoot it.': '直接射击即可。',
  'A swift, unarmored scout drone with three rotors. While fragile, it acts as an aerial alarm system, calling in reinforcements when it spots Raiders.':
    '迅捷、无装甲的三旋翼侦察无人机。虽然脆弱，却是空中的警报器，一旦发现奇袭者就会呼叫增援。',
  'Thrusters or the underside plating.': '推进器或底部装甲板。',
  "Small, spider-like robots that leap onto players, attaching themselves to your head. They're fast and disorienting, designed to punish careless Raiders.":
    '形似蜘蛛的小型机器人，会扑到玩家身上，吸附在头部。行动迅速，让人晕头转向，专门惩罚粗心大意的奇袭者。',
  "Just shoot it. It's also one-hit with your melee weapon.": '直接射击即可，近战也能一击摧毁。',
  'Small, unarmored turret providing close-quarters defense. Mounted on interior walls, it scans for movement and unleashes rapid fire when it spots Raiders.':
    '负责近距离防御的小型无装甲炮塔。安装在室内墙上，会扫描移动目标，发现奇袭者就猛烈开火。',
  'Unarmored. Shooting it is enough.': '没有装甲，直接射击即可。',
  'Flying, drone-like robots equipped with powerful machine guns. They operate in swarms, are fast, agile, and relentless. Their buzzing and screeching audio cues are your first warning.':
    '配备强力机枪的飞行无人机。它们成群出动，速度快、身手灵活、穷追不舍。嗡嗡声和尖啸声就是它们来袭的第一个信号。',
  'The largest of the rolling ARC. It stops periodically to transmit signals. Rarely attacks, usually runs away from Raiders. Breaks into many pieces as damage is taken.':
    '滚动型ARC中体型最大的一种。会不时停下来发送信号，很少主动攻击，通常会躲开奇袭者。受到伤害时会碎裂成许多块。',
  'Exposes his energy core when shooting his blue beam into the sky.': '向天空发射蓝色光束时会暴露能量核心。',

  // ---- items: tips ---------------------------------------------------------

  'The Hornet Driver is a rare item is dropped by Hornets that can be recycled into crafting materials.':
    '“马蜂”引擎是击毁马蜂后掉落的稀有物品，可回收为制作材料。',
  'The Queen Reactor is a legendary item only acquired by defeating The Queen that can be recycled into crafting materials.':
    '“女王”反应堆是只有击败女王才能获得的传奇物品，可回收为制作材料。',
  'The Wasp Driver is a rare item is dropped by Wasps that can be recycled into crafting materials.':
    '“黄蜂”引擎是击毁黄蜂后掉落的稀有物品，可回收为制作材料。',
  'Wires are an uncommon item used to craft weapon mods that can be recycled into crafting materials.':
    '导线是罕见物品，用于制作武器改装件，也可回收为制作材料。',

  // ---- items: stat values ----------------------------------------------------

  'Restores 2 health every 5 seconds. When damage is taken the effect is paused for 30 seconds.':
    '每 5 秒恢复 2 点生命值，受到伤害后暂停 30 秒。',
  '1 health every 5 seconds. When damage is taken, the effect is paused for 30 seconds.':
    '每 5 秒 1 点生命值，受到伤害后暂停 30 秒。',
  'Restores 1 health every 5 seconds. When damage is taken, the effect is paused for 30 seconds.':
    '每 5 秒恢复 1 点生命值，受到伤害后暂停 30 秒。',
  'Restores 2 health every 5 seconds. When damage is taken, the effect is paused for 30 seconds.':
    '每 5 秒恢复 2 点生命值，受到伤害后暂停 30 秒。',
  'Stowed or unequipped Pistols and Hand Cannons are 33% faster to equip.': '收起或未装备的手枪和大口径手枪，装备速度加快 33%。',
  'Automatically throws off attached Ticks after 1s.': '吸附在身上的跳蚤会在 1 秒后被自动甩掉。',
  'Upon Shield break, automatically administers a weak Adrenaline Shot. Has a fixed cooldown.':
    '护盾被击碎时，自动注射一剂弱效的肾上腺素针剂。有固定冷却时间。',
  'Can be equipped and used like regular binoculars, but cannot be dropped or removed from their slot.':
    '可像普通望远镜一样装备和使用，但不能丢弃，也不能从栏位中取出。',
  'While downed and stationary, health regenerates up to 75% of max downed health.':
    '倒地且静止不动时，生命值会恢复到倒地生命值上限的 75%。',
  'Upon Shield break, deploys a small smoke grenade. Has a fixed cooldown.': '护盾被击碎时会放出一枚小型烟雾手雷。有固定冷却时间。',
  'Reusable Shield Recharger on a fixed cooldown. Can be used like a normal Shield Recharger, but cannot be dropped or removed from its slot.':
    '可重复使用的护盾充能器，有固定冷却时间。可像普通护盾充能器一样使用，但不能丢弃，也不能从栏位中取出。',
  'Allows Shield Rechargers to be used while running.': '奔跑时也能使用护盾充能器。',
  'When revived from being downed, releases a healing cloud that restores 45 health over 3 seconds. Has a 45-second cooldown.':
    '倒地后被救援时，会释放一团治疗云雾，在 3 秒内恢复 45 点生命值。冷却时间 45 秒。',
  'Reusable Defibrillator on a fixed cooldown. Can be used like a normal Defibrillator, but cannot be dropped or removed from its slot.':
    '可重复使用的复苏剂，有固定冷却时间。可像普通复苏剂一样使用，但不能丢弃，也不能从栏位中取出。',

  // ---- items: descriptions ---------------------------------------------------
  // Only the sentences before a generated "Compatible with:" / "Used to craft:"
  // list; build-data.mjs rebuilds the list from the names.

  // Materials and crafting
  'Used to craft a wide range of items.': '用于制作各种物品。',
  'Used to craft a wide range of items. Can be recycled into crafting materials.': '用于制作各种物品。可回收为制作材料。',
  'Used to craft a wide range of items. Can be recycled into scrap metal.': '用于制作各种物品。可回收为废金属。',
  'Used to craft a wide range of items. Can be recycled into plastic.': '用于制作各种物品。可回收为塑料。',
  'Used to craft advanced weapons.': '用于制作高级武器。',
  'Used to craft advanced weapons. Can be recycled into crafting materials.': '用于制作高级武器。可回收为制作材料。',
  'Used to craft weapons.': '用于制作武器。',
  'Used to craft weapons and explosives. Can be recycled into chemicals.': '用于制作武器和爆炸物。可回收为化学品。',
  'Used to craft weapon mods. Can be recycled into crafting materials.': '用于制作武器改装件。可回收为制作材料。',
  'Used to craft explosives.': '用于制作爆炸物。',
  'Used to craft explosives. Can be recycled into crafting materials.': '用于制作爆炸物。可回收为制作材料。',
  'Used to craft medical supplies.': '用于制作医疗用品。',
  'Used to craft medical supplies. Can be recycled into chemicals.': '用于制作医疗用品。可回收为化学品。',
  'Used to craft medical supplies. Can be recycled into plastic.': '用于制作医疗用品。可回收为塑料。',
  'Used to craft medical supplies, explosives, and utility items.': '用于制作医疗用品、爆炸物和工具类物品。',
  'Used to craft components.': '用于制作元件。',
  'Used to craft components. Can be recycled into ARC Alloy.': '用于制作元件。可回收为ARC合金。',
  'Used in crafting.': '用于制作。',
  'Can be recycled into crafting materials.': '可回收为制作材料。',
  'Can be recycled into crafting materials': '可回收为制作材料。',
  'Can be recycled into crafting components.': '可回收为制作材料。',
  'Can be recycled into metal parts.': '可回收为金属零件。',
  'Can be recycled into chemicals.': '可回收为化学品。',
  'Valuable resource that drops from all ARC enemies. Used to craft: Shield Recharger Can be used to repair shields.':
    '珍贵的资源，所有ARC敌人都有可能掉落。可用于制作：护盾充能器。可用于修理护盾。',
  'Obtained from ARC enemies or activities, or by recycling certain ARC parts. Used to craft components.':
    '可从ARC敌人和活动中获得，也可通过回收某些ARC零件获得。用于制作元件。',
  'Obtained from ARC enemies or activities. Used to craft components. Can be recycled into ARC Alloy.':
    '可从ARC敌人和活动中获得。用于制作元件。可回收为ARC合金。',
  'Obtained from ARC enemies or activities. Can be recycled into chemicals.': '可从ARC敌人和活动中获得。可回收为化学品。',
  'Obtained from ARC enemies or activities. Can be recycled into rubber.': '可从ARC敌人和活动中获得。可回收为橡胶。',
  'Obtained from ARC enemies or activities. Can be recycled into plastic.': '可从ARC敌人和活动中获得。可回收为塑料。',
  'Obtained from ARC enemies and activites. Can be recycled into scrap metal.': '可从ARC敌人和活动中获得。可回收为废金属。',
  'An item that has a chance to spawn after lightning strikes.': '雷击过后有几率出现的物品。',
  'A large, high-capacity battery for industrial equipment.': '供工业设备使用的大容量电池。',
  'A small electric motor, useful for various devices.': '小型电动机，可用于各种设备。',
  'A portable filtration device for purifying water.': '用于净化水的便携式过滤装置。',
  'A portable analyzer from the world before, complete with several spare tubes.': '旧世界留下的便携式分析仪，还附带几支备用试管。',

  // Food and nature
  'Can be consumed for a small amount of stamina.': '食用后可恢复少量耐力。',
  'Can be consumed to regain a small amount of health.': '食用后可恢复少量生命值。',
  "Something tells you that you don't want to open this... Can (reluctantly) be consumed to restore small amounts of stamina.":
    '直觉告诉你最好别打开它……实在不行也能（勉强）吃下去，恢复少量耐力。',

  // Weapons
  'Has high damage output and headshot damage, but slow handling.': '伤害和爆头伤害都很高，但操控性较差。',
  'Single-action hand cannon with high damage and headshot damage, but slow handling.': '单动式大口径手枪，伤害和爆头伤害都很高，但操控性较差。',
  'An experimental ARC beam weapon powered by a Matriarch Reactor.': '由“族母”反应堆驱动的实验型ARC光束武器。',
  'Has slow fire rate and high damage output.': '射速慢，但伤害输出高。',
  'Fully automatic SMG with high fire rate but low accuracy.': '全自动冲锋枪，射速高但精准度低。',
  'A blueprint to craft the Burletta weapon.': '制作布尔莱塔的蓝图。',
  'Semi-automatic pistol with decent damage output and accuracy. Can be fired as fast as you can pull the trigger.':
    '半自动手枪，伤害输出和精准度都不错。扣扳机有多快，射速就有多快。',
  'Fully automatic submachine gun with a larger caliber.': '大口径全自动冲锋枪。',
  'A high capacity experimental beam rifle.': '大容量的实验型光束步枪。',
  'Packs a punch, but must be reloaded between every shot.': '威力强大，但每开一枪都要重新装填。',
  'Anti-ARC payloads used mainly by the Hullcracker.': '主要供裂甲者使用的反ARC弹药。',
  'Fires explosive projectiles that only detonate when hitting ARC.': '发射爆炸弹，仅在命中ARC时引爆。',
  'Has a large bullet spread, sharp falloff, and high damage output.': '弹丸散布大、伤害衰减快，但伤害输出高。',
  'Pump-action shotgun with large bullet spread, sharp falloff, and high damage output.': '泵动式霰弹枪，弹丸散布大、伤害衰减快，但伤害输出高。',
  'A bolt-action sniper rifle with exceptional damage output and accuracy, but slow handling.': '栓动式狙击步枪，伤害输出和精准度都十分出色，但操控性较差。',
  'Quick and accurate, but has low bullet velocity and takes a long time to reload.': '出枪快且精准，但子弹初速低，装填时间长。',
  'Semi-automatic assault rifle. Quick and accurate, but has low bullet velocity and takes a long time reload.':
    '半自动突击步枪。出枪快且精准，但子弹初速低，装填时间长。',
  'Has reliable damage output and accuracy.': '伤害输出和精准度都很可靠。',
  'A scoped bolt-action sniper rifle with reliable damage output and accuracy.': '配备瞄准镜的栓动式狙击步枪，伤害输出和精准度都很可靠。',
  'Fully automatic assault rifle. A cheap offensive option, but has to be reloaded 2 bullets at a time.':
    '全自动突击步枪。便宜的进攻选择，但每次只能装填 2 发子弹。',
  'Lever-action battle rifle with high damage output, accuracy, and headshot damage.': '杠杆式战斗步枪，伤害输出、精准度和爆头伤害都很高。',
  'Deals good damage, but has quite a low fire-rate and can be hard to control.': '伤害不错，但射速相当低，也比较难控制。',
  'Full automatic SMG. Deals good damage, but has quite a low fire-rate and can be hard to control.':
    '全自动冲锋枪。伤害不错，但射速相当低，也比较难控制。',
  'Has a large ammo capacity, but is only accurate while crouched.': '弹匣容量大，但只有蹲下时才打得准。',
  'Has a large ammo capacity, but is only accurate while crouched': '弹匣容量大，但只有蹲下时才打得准。',
  'Semi-automatic shotgun with good bullet spread but sharp falloff': '半自动霰弹枪，弹丸散布良好，但伤害衰减快。',

  // Mods
  'Slightly reduces horizontal recoil.': '略微降低水平后坐力。',
  'Moderately reduces horizontal recoil.': '适度降低水平后坐力。',
  'Significantly reduces horizontal recoil.': '大幅降低水平后坐力。',
  'Slightly reduces vertical recoil.': '略微降低垂直后坐力。',
  'Moderately reduces vertical recoil.': '适度降低垂直后坐力。',
  'Significantly reduces vertical recoil.': '大幅降低垂直后坐力。',
  'Moderately reduces both vertical recoil and horizontal recoil.': '适度降低垂直和水平后坐力。',
  'Slightly reduces both vertical recoil & horizontal recoil.': '略微降低垂直和水平后坐力。',
  'Moderately reduces both vertical recoil & horizontal recoil.': '适度降低垂直和水平后坐力。',
  'Significantly reduces both vertical recoil & horizontal recoil.': '大幅降低垂直和水平后坐力。',
  'Slightly reduces per-shot dispersion.': '略微降低单发散布。',
  'Moderately reduces per-shot dispersion.': '适度降低单发散布。',
  'Slightly reduces base dispersion.': '略微降低基础散布。',
  'Moderately reduces base dispersion.': '适度降低基础散布。',
  'Significantly reduces base dispersion.': '大幅降低基础散布。',
  'Slightly improves dispersion & recoil recovery time.': '略微缩短散布和后坐力的恢复时间。',
  'Moderately improves dispersion & recoil recovery time.': '适度缩短散布和后坐力的恢复时间。',
  'Significantly improves dispersion & recoil recovery time.': '大幅缩短散布和后坐力的恢复时间。',
  'Moderately improves ADS & draw speed.': '适度提升瞄准速度和拔枪速度。',
  'Slightly increases bullet velocity and damage falloff range.': '略微提高子弹初速和伤害衰减距离。',
  'Moderately increases bullet velocity and damage falloff range.': '适度提高子弹初速和伤害衰减距离。',
  'Moderately increases bullet velocity.': '适度提高子弹初速。',
  'Slightly extends the ammo capacity of compatible weapons that use light ammo.': '略微增加使用轻型弹药的兼容武器的弹匣容量。',
  'Moderately extends the ammo capacity of compatible weapons that use light ammo.': '适度增加使用轻型弹药的兼容武器的弹匣容量。',
  'Significantly extends the ammo capacity of compatible weapons that use light ammo.': '大幅增加使用轻型弹药的兼容武器的弹匣容量。',
  'Moderately extends the ammo capacity of compatible weapons that use medium ammo.': '适度增加使用中型弹药的兼容武器的弹匣容量。',
  'Significantly extends the ammo capacity of compatible weapons that use medium ammo.': '大幅增加使用中型弹药的兼容武器的弹匣容量。',
  'Significantly extends the ammo capacity of compataible weapons that use medium ammo.': '大幅增加使用中型弹药的兼容武器的弹匣容量。',
  'Slightly extends the ammo capacity of shotguns.': '略微增加霰弹枪的弹匣容量。',
  'Moderately extends the ammo capacity of shotguns.': '适度增加霰弹枪的弹匣容量。',
  'Significantly extends the ammo capacity of shotguns.': '大幅增加霰弹枪的弹匣容量。',
  'Tech mod for the Anvil that replaces its bullets with ones that split into 4 weaker projectiles.':
    '铁砧专用的科技改装件，把子弹换成会分裂为 4 发较弱弹丸的弹药。',

  // Augments
  'An improved version of the Combat II augment. Supports more shield types, and comes with extra space for grenades.':
    '战斗 Mk. 2 强化的改进型。可用的护盾种类更多，还带有额外的手雷栏位。',
  'An improved version of the Combat II augment. Designed for flanking maneuvers with enhanced mobility.':
    '战斗 Mk. 2 强化的改进型。专为侧翼包抄设计，机动性更强。',
  'Basic looting augment. More backpack slots and weight capacity, but low defensive and tactical capability.':
    '基础搜刮强化。背包栏位和负重上限更高，但防御和战术能力较弱。',
  'Significantly increases looting potential; adds slots for trinkets. Automatically throws off attached Ticks after 0.5s.':
    '大幅提升搜刮潜力，并增加饰品栏位。吸附在身上的跳蚤会在 0.5 秒后被自动甩掉。',
  'A looting augment that swaps some carry capacity to increase survivability. Upon Shield break, automatically administers a weak Adrenaline Shot. Has a fixed cooldown.':
    '牺牲部分负重来提升生存能力的搜刮强化。护盾被击碎时，自动注射一剂弱效的肾上腺素针剂。有固定冷却时间。',
  'A looting augment that trades weight and utility for increased looting potential. A Safe Pocket that allows any items to be stored.':
    '牺牲负重和实用性来换取更高搜刮潜力的搜刮强化。附带一个可存放任何物品的安全口袋。',
  'A heavy-duty pack mule augment. Large weight capacity and large backpack space. While downed and stationary, health regenerates up to 75% of max downed health.':
    '重载驮兽型强化。负重上限高，背包空间大。倒地且静止不动时，生命值会恢复到倒地生命值上限的 75%。',
  'A heavy-duty pack mule augment. Large weight capacity and large backpack space.': '重载驮兽型强化。负重上限高，背包空间大。',
  'Basic tactical augment. More Quick Use slots for more tactical choice, but limited survivability and slightly lower looting potential.':
    '基础战术强化。快速使用栏位更多，战术选择更丰富，但生存能力有限，搜刮潜力略低。',
  'A defensive-focused augment for keeping Shields topped up.': '专注防御的强化，让护盾保持充满。',
  'A healing-focused augment which adds extra slots for healing items. When revived from being downed, releases a healing cloud that restores 20 health over 10 seconds. Has a 30-second cooldown.':
    '专注治疗的强化，增加治疗物品栏位。倒地后被救援时，会释放一团治疗云雾，在 10 秒内恢复 20 点生命值。冷却时间 30 秒。',
  'A healing-focused augment which adds extra slots for healing items.': '专注治疗的强化，增加治疗物品栏位。',
  'A revival-focused augment designed for team support. Restores 1 health every 5 seconds. When damage is taken, the effect is paused for 30 seconds. Includes an integrated Defibrillator with infinite uses and a 240-second cooldown.':
    '专为团队支援设计的救援型强化。每 5 秒恢复 1 点生命值，受到伤害后暂停 30 秒。内置一支可无限次使用的复苏剂，冷却时间 240 秒。',
  'An upgraded version of the Tactical MK. 2 augment, adding expanded capacity across the board. Upon Shield break, deploys a small smoke grenade. Has a fixed cooldown.':
    '战术 Mk. 2 强化的升级版，各项容量全面提升。护盾被击碎时会放出一枚小型烟雾手雷。有固定冷却时间。',
  'An upgraded version of the Tactical MK. 2 augment, adding expanded capacity across the board.': '战术 Mk. 2 强化的升级版，各项容量全面提升。',

  // Grenades, mines and traps
  'A grenade that emits a lingering toxic cloud on impact, draining the stamina of any Raiders within its area of effect.':
    '撞击时引爆的手雷，会释放持续存在的毒气云，消耗范围内奇袭者的耐力。',
  'A grenade that creates a lingering smoke cloud on impact, blocking visibility from ARC and other Raiders.':
    '撞击时引爆的手雷，会产生持续存在的烟雾，遮挡ARC和其他奇袭者的视线。',
  'A grenade that detonates after a delay, stunning enemies within its radius.': '延迟引爆的手雷，会击晕范围内的敌人。',
  'A grenade that detonates after a delay, tagging Raiders and ARC enemies in an area, allowing you to briefly track their location.':
    '延迟引爆的手雷，会标记范围内的奇袭者和ARC敌人，让你在短时间内追踪他们的位置。',
  'A makeshift fuze grenade that bursts into razor-sharp fragments upon detonation. Weak against ARC armor plating':
    '临时拼凑的引信手雷，爆炸时迸射出锋利的碎片。对ARC的装甲板效果不佳。',
  'A grenade that emits a trail of flammable gas along its path, causing an explosive chain reaction when it ignites.':
    '会沿途留下易燃气体轨迹的手雷，点燃后引发连锁爆炸。',
  'A remote-detonated grenade that can stick to surfaces and ARC, dealing explosive damage when triggered.':
    '遥控引爆的手雷，可粘在物体表面或ARC身上，引爆时造成爆炸伤害。',
  'A grenade that scatters into multiple homing missiles, each one targeting ARC and dealing explosive damage on impact.':
    '会分散成多枚追踪导弹的手雷，每枚都会锁定ARC，命中时造成爆炸伤害。',
  'A laser trip wire that detonates a Blaze Grenade.': '一道激光绊线，被触发时引爆一枚火焰手雷。',
  'A laser trip wire that detonates a Gas Grenade.': '一道激光绊线，被触发时引爆一枚毒气手雷。',
  'A laser trip wire that detonates a Lure Grenade.': '一道激光绊线，被触发时引爆一枚诱捕手雷。',
  'A laser trip wire that detonates a Smoke Grenade.': '一道激光绊线，被触发时引爆一枚烟雾手雷。',
  'A proximity-triggered mine that pops up and stuns anything within its radius.': '靠近即触发的地雷，会弹起并击晕范围内的一切。',
  'A proximity-triggered mine that pops up and knocks back anything within its radius.': '靠近即触发的地雷，会弹起并击退范围内的一切。',
  'A mine that deals damage to anything within its radius once the timer runs out.': '倒计时结束后，对范围内的一切造成伤害的地雷。',
  'Unlocks the ability to craft Deadline mines at the explosives bench.': '解锁在爆炸物工作台制作死线地雷的能力。',
  'Unlocks the crafting blueprint for the Seeker Grenade.': '解锁追踪手雷的制作蓝图。',
  'Can be thrown and will briefly stun nearby targets': '可以投掷，会短暂击晕附近的目标。',

  // Gear and other quick-use items
  'A basic pair of binoculars with two levels of magnification.': '一副基础的双筒望远镜，有两档放大倍率。',
  'A throwable chemical light that illuminates the area around it.': '可投掷的化学光源，能照亮周围区域。',
  'A remotely triggered arrangement of dazzling fireworks, sure to put on a show.': '可远程点燃的一组绚丽烟花，保证场面热闹。',

  // Keys and codes
  'One of four security codes needed to unlock the Locked Gate on Blue Gate. Found at Ancient Fort.':
    '打开蓝门「上锁的大门」所需的四个安全码之一。可在古代要塞找到。',
  "One of four security codes needed to unlock the Locked Gate on Blue Gate. Found at Pilgrim's Peak.":
    '打开蓝门「上锁的大门」所需的四个安全码之一。可在朝圣峰找到。',
  "One of four security codes needed to unlock the Locked Gate on Blue Gate. Found at Raider's Refuge.":
    '打开蓝门「上锁的大门」所需的四个安全码之一。可在奇袭者避难所找到。',
  'One of four security codes needed to unlock the Locked Gate on Blue Gate. Found at Reinforced Reception.':
    '打开蓝门「上锁的大门」所需的四个安全码之一。可在加固前台找到。',
  'An expired security code. Has no more practical use.': '一组过期的安全码，已经没有实际用途。',
  'A key to the cellar in Blue Gate.': '可打开蓝门地窖的钥匙。',
  'Unlocks a door by the Communication Tower near the Blue Gate': '可打开蓝门通讯塔旁的一扇门。',
  'A key to areas within Blue Gate Village.': '可打开蓝门村内部分建筑的钥匙。',
  'An employee access card for JKV facilities in Buried City.': '掩埋废城J·科兹马创投公司设施的员工门禁卡。',
  'A master key for residential areas in Buried City.': '掩埋废城住宅区的万能钥匙。',
  'A key to the staff room in The Dam.': '可打开大坝员工室的钥匙。',
  'Unlocks a door in the Water Treatment Control building on Dam Battlegrounds.': '可打开大坝战场水处理控制中心大楼内的一扇门。',
  'A key to a patrol car.': '巡逻车的钥匙。',
  "A key opening a specific box in Stella Montis' Seed Vault.": '可打开星辰山种子库中一个特定箱子的钥匙。',
  'A key for container storage at the Spaceport.': '太空港集装箱仓库的钥匙。',
  'Unlocks a door in Control Tower A6 in Spaceport': '可打开太空港控制塔A6内的一扇门。',
  'Unlocks a door to the Trench Towers in Spaceport': '可打开太空港壕沟塔的门。',
  'A key to a warehouse in the Spaceport.': '太空港一座仓库的钥匙。',
  'Unlocks a door in Medical Research in Stella Montis': '可打开星辰山医学研究部内的一扇门。',
  'Unlocks a door to the Secure Storage room in the Port Authority Building at Riven Tides':
    '可打开裂潮镇港务局大楼安全储藏室的门。',
  'This key is used for the quest The Stench of Corruption to activate the Flushing Terminal':
    '用于任务「腐败的恶臭」的钥匙，可启动冲洗终端。',
  'A quest item that must be delivered to Tian Wen to complete the Unexpected Initiative quest.':
    '任务物品，需交给天玟以完成任务「计划不如变化快」。',

  // Trinkets
  'May be worth a few coins.': '或许能换几个钱币。',
  'The envy of every Speranzan. Proof that this world was once thriving and magical.':
    '每个斯佩兰扎人都会眼红的宝贝，证明这个世界曾经繁荣又奇妙。',
  'The power to face a new day, one cup at a time.': '一杯接一杯，攒足面对新一天的力气。',
  'A snapshot of the world before, faded by sunlight and time.': '旧世界的一张快照，已被阳光和岁月晒褪了色。',
  'Unlike the real one, this one fits in your pack. Can be thrown to create noise.':
    '和真家伙不同，这只能塞进背包。可以投掷来制造噪音。',
  "Perfect for telling the time, and showcasing that you're an exceedingly dignified person.":
    '看时间正合适，还能彰显你格外体面的身份。',
  'It is theorized that scooping things was a favorite pastime in the world before.': '据推测，舀东西曾是旧世界最受欢迎的消遣。',
  'Valued for its fine craftsmanship, and effortless ability to make your eyes pop.': '做工精湛，轻轻松松就能让人眼前一亮，因此备受珍视。',
  'Hand-crafted with full underbody detailing, these models offer a surprisingly intricate schematic of pre-Exodus locomotion.':
    '这些手工模型连底盘细节都一应俱全，精细得出人意料，还原了“离巢”之前的机车构造。',
  "Optimized for performance, this marvel of technology sure hopes you weren't planning on packing a particularly elaborate lunch.":
    '这件科技杰作只为性能而生，想必不希望你还打算带上什么精致的午餐。',
  'A circular light located on the undercarriage of the glitched Wasp.': '故障“黄蜂”机身底部的一圈环形灯。',

  // ---- quests ------------------------------------------------------------------
  // Upstream quest text is the game's own; these only align names with the items
  // and locations the quest refers to.

  'Search any J Kozma Ventures container': '搜刮任意J·科兹马创投公司的容器',
  'Deliver the Old World Books to Shani': '将旧世界书籍交给萨尼',
  'Deliver a Deflated Football to Apollo': '将泄气的足球交给阿波罗',
  'Obtain a Rotary Encoder': '获得一个旋转编码器',
  'Use the Rotary Encoder to activate the server switch': '使用旋转编码器启动服务器开关',
  'Deliver the Scout Patrol Note to Shani': '将侦察巡逻笔记交给萨尼',
  'Deliver the Experimental Seed Sample to Celeste': '将实验型种子样本交给塞莱斯特',
  'Deliver the First Wave Tape to Tian Wen': '把“第一波”录像带交给天玟',
  "Deliver Major Aiva's Mementos to Tian Wen": '将艾娃少校的纪念品交给天玟',
  'Deliver the Burletta to the rival weapon cache': '将布尔莱塔送至对手的武器储物箱',
  'Locate the Flood Access Tunnel under the Red Lake Balcony': '找到红湖阳台下方的泄洪隧道',
  'Find the flooded solar panels nearby the Grandioso Apartments': '到奢华公寓附近找到被淹的太阳能面板',
  'Find the Arbusto Farmacia by the collapsed highway': '在崩塌的高速公路旁找到阿布斯托药店',

  // ---- skills --------------------------------------------------------------------

  'A single melee attack destroys a Tick, Pop, Wasp and Turret.': '一次近战攻击即可摧毁跳蚤、爆爆、黄蜂和炮塔。',
  'You can Sprint Dodge Roll further.': '冲刺翻滚闪避的距离更远。',
  'Breach Time Reduction': '突破时间缩短',
  'Climb and Vault Speed': '攀爬与翻越速度',
  'Field Crafting': '现场制作',

  // ---- projects --------------------------------------------------------------------

  'A festival of resilient warmth, centered around the hardy candleberry bush. Speranzans have been known to host local celebrations, and being competitive, they seek to outdo each other at every turn. Some have managed to turn the homely candleberry bush into a banquet worthy of even the most discerning gourmands.':
    '一场围绕耐寒烛莓灌木展开、温暖而坚韧的节庆。斯佩兰扎人素来爱办邻里庆典，又好胜心强，处处都想压对方一头。有些人甚至把朴素的烛莓灌木做成了连最挑剔的老饕都赞不绝口的盛宴。',
  "Deal damage to ARC using mines or traps (Blaze Grenade Trap, Pulse Mine, Jolt Mine, Explosive Mine, Surge Coil)":
    '使用地雷或陷阱对ARC造成伤害（火焰手雷陷阱、跳雷：冲击、电击地雷、爆炸地雷、涌能线圈）',
};

// Upstream zh-CN wording that disagrees with the client glossary, or plain typos.
// Applied to any upstream text that TEXT doesn't replace.
export const TERM_FIXES = [
  ['掠夺者', '奇袭者'],
  ['斯佩兰赞人', '斯佩兰扎人'],
  ['蜡莓', '烛莓'],
  ['蜱虫', '跳蚤'],
  ['埋没之城', '掩埋废城'],
  ['斯特拉·蒙蒂斯', '星辰山'],
  ['朝圣者之巅', '朝圣峰'],
  ['手榴弹', '手雷'],
  ['除颤器', '复苏剂'],
  ['远征项目', '远征计划'],
  ['气化者', '汽化者'],
  ['收纳仓', '收纳舱'],
  ['田文', '天玟'],
  ['体力', '耐力'],
  ['硬币', '钱币'],
  ['保险袋', '安全口袋'],
  ['根电线', '根导线'],
  ['维修区机库', '维护区机库'],
  ['掩埋地产', '埋没的楼群'],
  ['游牧者', '游牧民'],
  ['奇袭者储物箱', '奇袭者储备箱'],
  ['大规划', '大规模'],
];

// Short English strings in fields upstream never translates.
export const PATTERNS = [
  [/^(\d+) slots$/, (m) => `${m[1]} 格`], // stash levels
  [/^\+(\d+) slots \((\d+) total\)$/, (m) => `+${m[1]} 格（共 ${m[2]} 格）`],
  [/^(\d+)x Raids$/, (m) => `${m[1]} 局`], // quest requirements
  [/^\+([\d.]+) kg per point$/, (m) => `每点 +${m[1]} kg`], // skill values
];
