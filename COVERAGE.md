# Foundations 规则覆盖清单

本文件由 `node scripts/coverage.mjs` 从当前引擎的 `cardSupported` 与合并后的规则注册表生成。修改规则后请重新生成。

**这是规则注册表覆盖率，不是全部官方规则与交互的一致性认证。**

Rule registry coverage, not exhaustive official-conformance certification.

- 数据版本：Riot Data Dragon `7_10_0`，`Set1`（Foundations）。
- 目录记录：**419**；其中可收集卡牌 **318**，升级形态、技能及其他衍生记录 **101**。
- 当前允许加入套牌：**234 / 318**（73.6%）。
- 可收集卡牌待完成：**84**。存在规则但标记为 `implemented:false` 的卡牌计入待完成。
- 下方逐卡清单只统计可收集卡牌。繁中名称和英文名称直接来自固定版本目录；按用于基础卡池组牌的地区归类。
- 生成技能由来源卡牌及引擎触发，不代表可独立加入套牌；完整目录中的“有记录”不等于“可对战”。

## 地区汇总

| 地区 | English region | 可收集总数 | 可组牌 | 待完成 |
| --- | --- | ---: | ---: | ---: |
| 蒂瑪西亞 | Demacia | 53 | 42 | 11 |
| 弗雷爾卓德 | Freljord | 53 | 43 | 10 |
| 諾克薩斯 | Noxus | 53 | 48 | 5 |
| 皮爾托福&佐恩 | Piltover & Zaun | 53 | 37 | 16 |
| 愛歐尼亞 | Ionia | 53 | 33 | 20 |
| 闇影島 | Shadow Isles | 53 | 31 | 22 |
| **合计** | | **318** | **234** | **84** |

## 蒂瑪西亞 · Demacia

### 可组牌（42）

| 官方代码 | 原版繁中名称 | English name | 已注册规则说明 |
| --- | --- | --- | --- |
| `01DE013` | 鎖子甲 | Chain Vest | Grant an ally Tough. |
| `01DE018` | 光輝打擊 | Radiant Strike | Give an ally +1\|+1 this round. |
| `01DE022` | 路西恩 | Lucian | Quick Attack. Level after seeing 4 allies or an allied Senna die. |
| `01DE029` | 疾羽獵鷹 | Fleetfeather Tracker | When you summon another ally, grant me Challenger. |
| `01DE039` | 克勞菲爾德的希莉亞 | Cithria of Cloudfield | Keywords only |
| `01DE049` | 英勇普羅 | Plucky Poro | Keywords only |
| `01DE009` | 閃鋼捍衛者 | Brightsteel Protector | Play: Give an ally Barrier this round. |
| `01DE020` | 先鋒守軍 | Vanguard Defender | Keywords only |
| `01DE026` | 單挑 | Single Combat | An ally and an enemy strike each other. |
| `01DE027` | 預備擊劍 | En Garde | Give allies Challenger this round. |
| `01DE034` | 武器鐵匠 | Battlesmith | When you summon an Elite, grant it +1\|+1. |
| `01DE043` | 戰地廚師 | War Chefs | Support: Give my supported ally +1\|+1 this round. |
| `01DE046` | 先鋒瞭望兵 | Vanguard Lookout | Keywords only |
| `01DE050` | 淨化 | Purify | Silence a follower. |
| `01DE006` | 先鋒中士 | Vanguard Sergeant | When I'm summoned, create a For Demacia! in hand. |
| `01DE011` | 羅倫特家族門徒 | Laurent Protege | Keywords only |
| `01DE019` | 組織動員 | Mobilize | Reduce the cost of allies in hand by 1. |
| `01DE031` | 拂曉申言者 | Dawnspeakers | Round End: Grant other allies +1\|+1 if an ally died this round. |
| `01DE032` | 稜光障壁 | Prismatic Barrier | Give an ally Barrier this round. |
| `01DE038` | 光之哨兵姍娜 | Senna, Sentinel of Light | The first time an allied Lucian dies, grant me +1\|+1 and Double Attack. |
| `01DE047` | 天降大任 | Succession | Summon a Dauntless Vanguard. |
| `01DE054` | 先鋒贖士 | Vanguard Redeemer | When I'm summoned, draw a unit if an ally died this round. |
| `01DE001` | 先鋒掌旗手 | Vanguard Bannerman | Allegiance: Grant other allies +1\|+1. |
| `01DE003` | 羅倫特家族刀劍收藏家 | Laurent Bladekeeper | Play: Grant an ally +2\|+2. |
| `01DE017` | 一夫當關 | Stand Alone | If you have exactly 1 ally, grant it +3\|+3. |
| `01DE021` | 冷酷進擊 | Relentless Pursuit | Rally. |
| `01DE030` | 銀翼鷲俯擊兵 | Silverwing Diver | Keywords only |
| `01DE037` | 斗轉之力 | Riposte | Give an ally +3\|+0 and Barrier this round. |
| `01DE045` | 菲歐拉 | Fiora | Challenger. Level after killing 2 enemies. The leveled form wins after 4 total kills while surviving. |
| `01DE056` | 先鋒首刃軍 | Vanguard Firstblade | Attack: Grant me +2\|+2. |
| `01DE012` | 蓋倫 | Garen | Regeneration. When summoned, give other allies +1\|+1 this round. Level after striking twice. |
| `01DE015` | 光輝守護者 | Radiant Guardian | When I'm summoned, grant me Lifesteal and Tough if an ally died this round. |
| `01DE028` | 先鋒騎兵 | Vanguard Cavalry | Keywords only |
| `01DE042` | 拉克絲 | Lux | Barrier. Track the mana cost of spells played while Lux is in play; at 6 or more, level and create Final Spark. |
| `01DE035` | 蒂瑪西亞萬歲！ | For Demacia! | Give allies +3\|+3 this round. |
| `01DE041` | 互相照應 | Back to Back | Give 2 allies +3\|+3 this round. |
| `01DE044` | 加倍勇猛 | Redoubled Valor | Fully heal an ally, then double its Power and Health. |
| `01DE051` | 驍勇戰士希莉亞 | Cithria the Bold | Attack: Give other attacking allies +1\|+1 and Fearsome this round. |
| `01DE002` | 塔蒂雅娜．皇冠守衛 | Tianna Crownguard | When I'm summoned, Rally. |
| `01DE007` | 審判 | Judgment | A battling ally strikes all battling enemies. |
| `01DE014` | 增援部隊 | Reinforcements | Summon 2 Dauntless Vanguards, then grant Elite allies +1\|+1. |
| `01DE052` | 閃鋼陣型 | Brightsteel Formation | When I'm summoned or Attack: Give allies Barrier this round. |

### 待完成（11）

| 官方代码 | 原版繁中名称 | English name | 待完成原因 |
| --- | --- | --- | --- |
| `01DE024` | 狙魔監管員 | Mageseeker Conservator | Not implemented: Last Breath: Create in hand a random 6+ cost spell from a region other than Demacia. |
| `01DE040` | 狙魔宣教士 | Mageseeker Persuader | Not implemented: Grant me +1\|+1 and Challenger once you've played a 6+ cost spell this game. |
| `01DE055` | 羅倫特家族決鬥家 | Laurent Duelist | Not implemented: Play: Grant Challenger to an ally in hand. |
| `01DE023` | 狙魔調查員 | Mageseeker Investigator | Not implemented: Create a Detain in hand once you've played a 6+ cost spell this game. |
| `01DE036` | 先鋒護衛 | Vanguard Squire | Not implemented: When you summon an Elite, reduce my cost by 1. |
| `01DE004` | 銀翼鷲先鋒 | Silverwing Vanguard | Not implemented: Play: Summon an exact copy of me. |
| `01DE048` | 狙魔煽動者 | Mageseeker Inciter | Not implemented: Grant me +2\|+2 once you've played a 6+ cost spell this game. |
| `01DE053` | 羅倫特家族騎士 | Laurent Chevalier | Not implemented: Strike: Create in hand another random Challenger follower from your regions. |
| `01DE010` | 銀翼鷲槍騎兵 | Swiftwing Lancer | Not implemented: Last Breath: Create a random Elite in hand. |
| `01DE025` | 束縛 | Detain | Not implemented: An ally Captures a unit. |
| `01DE033` | 緬懷先烈 | Remembrance | Not implemented: I cost 1 less for each ally that died this round. Summon a random 5 cost follower from Demacia. |

## 弗雷爾卓德 · Freljord

### 可组牌（43）

| 官方代码 | 原版繁中名称 | English name | 已注册规则说明 |
| --- | --- | --- | --- |
| `01FR004` | 抗擊藥劑 | Elixir of Iron | Give an ally +0\|+2 this round. |
| `01FR008` | 孤單普羅 | Lonely Poro | When I'm summoned, create another random 1 cost Poro in hand. |
| `01FR014` | 幼年雪怪 | Yeti Yearling | Last Breath: Create 2 Enraged Yetis in your deck. |
| `01FR022` | 警示鷹 | Omen Hawk | When I'm summoned, grant the top 2 allies in your deck +1\|+1. |
| `01FR030` | 鋼鐵脆化 | Brittle Steel | Frostbite an enemy with 3 or less Health. |
| `01FR035` | 無戰痕掠奪者 | Unscarred Reaver | When I survive damage, grant me +3\|+0. |
| `01FR055` | 碎裂 | Shatter | Deal 4 to an enemy if it has 0 Power. Otherwise, Frostbite it. |
| `01FR003` | 艾伐洛森哨兵 | Avarosan Sentry | Last Breath: Draw 1. |
| `01FR011` | 冰谷弓箭手 | Icevale Archer | Play: Frostbite an enemy. |
| `01FR025` | 普羅牧人 | Poro Herder | When I'm summoned, draw a Poro if you Behold a Poro. |
| `01FR029` | 吹號求援 | Entreat | Draw a champion. |
| `01FR032` | 星光先知 | Starlit Seer | When you play a spell, grant the top ally in your deck +1\|+1. |
| `01FR001` | 急速冰凍 | Flash Freeze | Frostbite an enemy. |
| `01FR018` | 冰霜尖牙狼 | Rimefang Wolf | Strike: If I struck a unit with 0 Power, kill it. |
| `01FR036` | 艾伐洛森神射手 | Avarosan Marksman | Play: Deal 1 to an enemy. |
| `01FR045` | 戰痕族長史特芬 | Scarthane Steffen | When I survive damage, grant me +3\|+0. |
| `01FR046` | 精神抖擻 | Take Heart | Grant a damaged ally +3\|+3. |
| `01FR048` | 艾伐洛森捕獸人 | Avarosan Trapper | When I'm summoned, create an Enraged Yeti in the top 3 cards of your deck. |
| `01FR050` | 親切的小酒館老闆 | Kindly Tavernkeeper | Play: Heal an ally or your Nexus 3. |
| `01FR051` | 荒誕傳說 | Tall Tales | If you have a Yeti, summon an Enraged Yeti. Otherwise, create it on top of your deck. |
| `01FR053` | 大力普羅 | Mighty Poro | Keywords only |
| `01FR007` | 碎碎念的比亞 | Babbling Bjerg | When I'm summoned, draw a unit with 5+ Power. |
| `01FR009` | 布郎姆 | Braum | Challenger, Regeneration. The first time he survives damage, summon a Mighty Poro. Level after surviving 10 total damage. |
| `01FR010` | 血誓之盟 | Bloodsworn Pledge | Grant 2 allies +0\|+3. |
| `01FR020` | 雪崩 | Avalanche | Deal 2 to ALL units. |
| `01FR027` | 厄努克公牛 | Bull Elnuk | Keywords only |
| `01FR037` | 艾伐洛森騎衛隊 | Avarosan Outriders | Allegiance: Grant the top ally in your deck +3\|+3 and Overwhelm. |
| `01FR038` | 艾希 | Ashe | Attack: Frostbite the strongest enemy. |
| `01FR012` | 催化魔方 | Catalyst of Aeons | Get an empty mana gem and heal your Nexus 3. |
| `01FR021` | 獨行狂戰塔卡茲 | Tarkaz the Tribeless | Attack: Deal 1 to ALL battling units. |
| `01FR040` | 冰霜獠牙薩滿 | Rimetusk Shaman | Round Start: Frostbite the strongest enemy. |
| `01FR041` | 艾伐洛森爐衛  | Avarosan Hearthguard  | When I'm summoned, grant allies in your deck +1\|+1. |
| `01FR042` | 嚴寒狂風 | Harsh Winds | Frostbite 2 enemies.  |
| `01FR054` | 戰痕少女掠奪者 | Scarmaiden Reaver | Keywords only |
| `01FR013` | 戰痕之母芙蕊娜 | Scarmother Vrynna | When I survive damage, grant me +3\|+0. |
| `01FR024` | 艾妮維亞 | Anivia | Attack: Deal 1 to all enemies and the enemy Nexus.<br>Last Breath: Revive me transformed into Eggnivia. |
| `01FR026` | 狂爪虎王 | Alpha Wildclaw | Keywords only |
| `01FR034` | 虛厄韌獸 | They Who Endure | When I'm summoned, grant me +1\|+1 for each ally that has died.  |
| `01FR019` | 凜冬吐息 | Winter's Breath | Kill all enemies with 0 Power, then Frostbite all enemies. |
| `01FR056` | 寒地雪怪 | Icy Yeti | When I'm summoned, Frostbite enemies with 3 or less Health. |
| `01FR057` | 獸群心性 | Pack Mentality | Give allies +2\|+2 and Overwhelm this round. |
| `01FR005` | 戰鬥狂怒 | Battle Fury | Grant an ally +8\|+4. |
| `01FR039` | 泰達米爾 | Tryndamere | Overwhelm. If he would die, level up instead. The engine replaces a lethal death with the leveled form. |

### 待完成（10）

| 官方代码 | 原版繁中名称 | English name | 待完成原因 |
| --- | --- | --- | --- |
| `01FR047` | 野魂祕術師 | Feral Mystic | Not implemented: Enlightened: I have +4\|+4. |
| `01FR049` | 潛行狼 | Stalking Wolf | Not implemented: When I'm summoned, your opponent summons a Snow Hare. |
| `01FR016` | 普羅點心 | Poro Snax | Not implemented: Grant Poro allies everywhere +1\|+1. |
| `01FR033` | 玄妙石陣 | Wyrding Stones | Not implemented: Round Start: Get an extra mana gem this round. |
| `01FR006` | 寒霜之裔的傳承 | Iceborn Legacy | Not implemented: Grant an ally and all allied copies of it everywhere +2\|+2. |
| `01FR017` | 厄努克牛群 | Troop of Elnuks | Not implemented: Play: For the top 6 cards in your deck, summon each Elnuk and place the rest into your deck. |
| `01FR043` | 毛茸茸之心 | Heart of the Fluft | Not implemented: Play: Combine your Poro followers into a Fluft of Poros, and grant it their stats and positive keywords. |
| `01FR031` | 遠古雪怪 | Ancient Yeti | Not implemented: Round End: Reduce my cost by 1. |
| `01FR052` | 虛厄遊獸 | She Who Wanders | Not implemented: Play: Obliterate ALL units with 4 or less Power in play and in hands. |
| `01FR023` | 戰爭之母的呼喚 | Warmother's Call | Not implemented: Summon the top ally from your deck now and EACH Round Start. |

## 諾克薩斯 · Noxus

### 可组牌（48）

| 官方代码 | 原版繁中名称 | English name | 已注册规则说明 |
| --- | --- | --- | --- |
| `01NX012` | 軍團後衛 | Legion Rearguard | Keywords only |
| `01NX015` | 寶貝毒蛛 | Precious Pet | Keywords only |
| `01NX027` | 憤怒魔藥 | Elixir of Wrath | Give an ally +3\|+0 this round. |
| `01NX034` | 黏人普羅 | Affectionate Poro | Keywords only |
| `01NX040` | 軍團破壞者 | Legion Saboteur | Attack: Deal 1 to the enemy Nexus. |
| `01NX043` | 利刃刀鋒 | Blade's Edge | Deal 1 to anything. |
| `01NX049` | 狡詐 | Guile | Stun an enemy. |
| `01NX005` | 血色貴族 | Crimson Aristocrat | Play: Deal 1 to an ally and grant it +1\|+0 and Overwhelm |
| `01NX007` | 競技場主持人 | Arena Battlecaster | Attack: Give other attacking allies +1\|+0 this round. |
| `01NX016` | 特菲利安新兵 | Trifarian Hopeful | When I'm summoned, grant me +2\|+0 if you have another Noxus ally. |
| `01NX017` | 軍團擂鼓兵 | Legion Drummer | Support: Give my supported ally Quick Attack this round. |
| `01NX025` | 同袍兄弟 | Brothers' Bond | Grant 2 allies +2\|+0. |
| `01NX030` | 血色門徒 | Crimson Disciple | When I survive damage, deal 1 to the enemy Nexus. |
| `01NX031` | 特菲利安求譽者 | Trifarian Gloryseeker | Keywords only |
| `01NX037` | 軍團擲彈兵 | Legion Grenadier | Last Breath: Deal 1 to the enemy Nexus. |
| `01NX047` | 鮮血轉換 | Transfusion | Deal 1 to an ally to give another ally +2\|+2 this round. |
| `01NX050` | 死亡蓮花 | Death Lotus | Deal 1 to ALL battling units. |
| `01NX052` | 血債血還 | Blood for Blood | Deal 1 to an allied follower. If it survives, create a copy of it in hand. |
| `01NX055` | 普通蜘蛛 | House Spider | When I'm summoned, summon a Spiderling. |
| `01NX004` | 天擇刎頸殺 | Culling Strike | Kill a unit with 3 or less Power. |
| `01NX011` | 迴轉死神 | Whirling Death | A battling ally strikes a battling enemy. |
| `01NX019` | 實力至上 | Might | Give an ally +3\|+0 and Overwhelm this round. |
| `01NX020` | 達瑞文 | Draven | When I'm summoned or strike: Create a Spinning Axe in hand. |
| `01NX022` | 諾克薩斯斷頭台 | Noxian Guillotine | Kill a damaged unit to create a Fleeting Noxian Guillotine in hand. |
| `01NX026` | 特菲利安莽夫 | Reckless Trifarian | Keywords only |
| `01NX039` | 洞察力 | Vision | When played or discarded, grant allies +1\|+0. |
| `01NX042` | 卡特蓮娜 | Katarina | When I'm summoned, create a Fleeting Blade's Edge in hand. |
| `01NX046` | 蜘蛛哨兵 | Arachnoid Sentry | Play: Stun an enemy. |
| `01NX048` | 血色督察 | Crimson Curator | When I survive damage, create a random Crimson unit in hand. |
| `01NX008` | 巨異蜥騎兵 | Basilisk Rider | Allegiance: Grant me +1\|+1 and Overwhelm. |
| `01NX009` | 人氣角鬥士 | Crowd Favorite | When I'm summoned, grant me +1\|+1 for each other ally you have. |
| `01NX029` | 軍團退將 | Legion Veteran | When another ally survives damage, grant it +1\|+0. |
| `01NX032` | 血色覺醒者 | Crimson Awakener | When I'm summoned, deal 1 to all other allies. |
| `01NX033` | 特菲利安鑑定員 | Trifarian Assessor | When I'm summoned, draw 1 for each 5+ Power ally you have. |
| `01NX010` | 軍團大將軍 | Legion General | When I'm summoned, grant me +1\|+1 for each unit you've Stunned or Recalled this game.  |
| `01NX013` | 致命出擊 | Decisive Maneuver | Stun an enemy. Give all allies +2\|+0 this round. |
| `01NX023` | 群蛛之主 | Arachnoid Host | When I'm summoned, grant other Spider allies +2\|+0. |
| `01NX024` | 神臂加登 | Kato The Arm | Support: Give my supported ally +3\|+0 and Overwhelm this round. |
| `01NX041` | 特菲利安破盾兵 | Trifarian Shieldbreaker | Keywords only |
| `01NX054` | 威嚇怒吼 | Intimidating Roar | Stun all enemies with 4 or less Power. |
| `01NX056` | 瞬步 | Shunpo | Deal 2 to an enemy, then Rally. |
| `01NX002` | 毀滅風暴 | Decimate | Deal 4 to the enemy Nexus. |
| `01NX036` | 牛頭怪角鬥士 | Minotaur Reckoner | Round Start: Stun the weakest enemy. |
| `01NX038` | 達瑞斯 | Darius | Overwhelm. Level when the enemy Nexus has half its starting Health or less. |
| `01NX044` | 攻城槌 | Battering Ram | Attack: Grant me +4\|+0. |
| `01NX045` | 野蠻角鬥士 | Savage Reckoner | Keywords only |
| `01NX053` | 決鬥 | Reckoning | If you have a 5+ Power ally, kill ALL units with 4 or less Power. |
| `01NX051` | 法隆上尉 | Captain Farron | When I'm summoned, create 2 Decimates in hand. |

### 待完成（5）

| 官方代码 | 原版繁中名称 | English name | 待完成原因 |
| --- | --- | --- | --- |
| `01NX035` | 達瑞文的頭號粉絲 | Draven's Biggest Fan | Not implemented: When I'm summoned, move Draven to the top of your deck if you don't have him in hand or in play. |
| `01NX003` | 競技場組頭 | Arena Bookie | Not implemented: Round Start: Discard your lowest cost card to draw 1. |
| `01NX021` | 軍團流寇 | Legion Marauder | Not implemented: Attack: Grant allied Legion Marauders everywhere +1\|+1. |
| `01NX014` | 雙刃手席菈扎 | Shiraza the Blade | Not implemented: I deal double damage to the Nexus. |
| `01NX006` | 弗拉迪米爾 | Vladimir | Not implemented: Play: Deal 1 to any number of allies to deal that much to an enemy. / You've had 5+ allies survive damage. |

## 皮爾托福&佐恩 · Piltover & Zaun

### 可组牌（37）

| 官方代码 | 原版繁中名称 | English name | 已注册规则说明 |
| --- | --- | --- | --- |
| `01PZ047` | 腐蝕藥劑桶 | Caustic Cask | Last Breath: Deal 1 to EACH Nexus. |
| `01PZ008` | 提摩 | Teemo | Nexus Strike: Plant 5 Poison Puffcaps on random cards in the enemy deck. You've planted 15+ Poison Puffcaps. |
| `01PZ010` | 蘑菇雲 | Mushroom Cloud | Plant 5 Poison Puffcaps in the enemy deck. |
| `01PZ020` | 大膽普羅 | Daring Poro | Keywords only |
| `01PZ028` | 應急裝置 | Jury-Rig | When played or discarded, summon a Scrap Scuttler. |
| `01PZ045` | 佐恩小乞丐 | Zaunite Urchin | Play: Discard a card to draw 1. |
| `01PZ046` | 盜版贗品 | Counterfeit Copies | Pick a card in hand. Create 4 exact copies of it in your deck. |
| `01PZ001` | 雜物堆 | Rummage | To play, discard up to 2 cards. Draw 1 for each card you discarded. |
| `01PZ012` | 咬咬手榴彈！ | Flame Chompers! | When I'm discarded, summon me. |
| `01PZ018` | 菁英學院奇才 | Academy Prodigy | Keywords only |
| `01PZ019` | 勤奮的學徒 | Eager Apprentice | When I'm summoned, refill 2 spell mana. |
| `01PZ026` | 汙水坑地圖 | Sumpworks Map | Grant an ally Elusive. |
| `01PZ042` | 英勇水手 | Intrepid Mariner | Support: Give my supported ally Elusive this round. |
| `01PZ052` | 祕術射擊 | Mystic Shot | Deal 2 to anything. |
| `01PZ053` | 呼碰引伴 | Clump of Whumps | When I'm summoned, create a Mushroom Cloud in hand. |
| `01PZ054` | 爆破幫菜鳥 | Boomcrew Rookie | Attack: Deal 2 to the enemy Nexus. |
| `01PZ057` | 巧遇 | Scrapdash Assembly | Summon 2 Scrap Scuttlers. |
| `01PZ003` | 組合機器人 | Assembly Bot | When you play a spell, grant me +1\|+1. |
| `01PZ007` | 電光遊行花車 | Parade Electrorig | Support: Create 4 copies of the supported ally in your deck. |
| `01PZ009` | 懸浮飛板初學者 | Amateur Aeronaut | Keywords only |
| `01PZ017` | 藥劑桶供應商 | Used Cask Salesman | When I'm summoned, summon 2 Caustic Casks. |
| `01PZ025` | 膨菇小販 | Puffcap Peddler | When you play a spell, plant 3 Poison Puffcaps in the enemy deck. |
| `01PZ036` | 伊澤瑞爾 | Ezreal | Nexus Strike: Create a Fleeting Mystic Shot in hand. You've targeted enemies 8+ times. |
| `01PZ038` | 汙水坑疏濬機器人 | Sump Dredger | Play: Discard a card to draw 1. |
| `01PZ039` | 狂躁！ | Get Excited! | To play, discard 1.<br>Deal 3 to anything. |
| `01PZ050` | 咒能高漲 | Rising Spell Force | Give an ally +4\|+0 and Quick Attack this round. |
| `01PZ059` | 金嚇破壞機器人 | Golden Crushbot | Keywords only |
| `01PZ023` | 馮奕卜教授 | Professor von Yipp | When you summon a 1 cost ally, grant it +2\|+2. |
| `01PZ031` | 史提克衝擊 | Statikk Shock | Deal 1 to an enemy or the enemy Nexus, and 1 to another.<br>Draw 1. |
| `01PZ040` | 吉茵珂絲 | Jinx | I see your hand is empty. |
| `01PZ058` | 重量級呼碰 | Chump Whump | When I'm summoned, create 2 Mushroom Clouds in hand. |
| `01PZ044` | 化學龐克撕裂樂手 | Chempunk Shredder | Play: Deal 1 to all enemies. |
| `01PZ056` | 漢默丁格 | Heimerdinger | When you play a spell, create a Fleeting Turret in hand with equal cost. It costs 0. I've seen you summon 12+ Power of Tech allies. |
| `01PZ013` | 自我強化科學家 | Augmented Experimenter | Play: Discard your hand. Draw 3. Deal 3 to an enemy. |
| `01PZ014` | 無照新發明 | Unlicensed Innovation | Summon an Illegal Contraption. |
| `01PZ049` | 進步日！ | Progress Day! | Draw 3, then reduce those cards' costs by 1. |
| `01PZ048` | 可瑞娜．瓦拉撒 | Corina Veraza | Play: Obliterate the top 5 cards of your deck to deal 1 to all enemies and the enemy Nexus for each spell obliterated. |

### 待完成（16）

| 官方代码 | 原版繁中名称 | English name | 待完成原因 |
| --- | --- | --- | --- |
| `01PZ027` | 生熱光束 | Thermogenic Beam | Not implemented: To play, spend all your mana.<br>Deal that much to a unit. |
| `01PZ055` | 聰慧學者 | Astute Academic | Not implemented: When you draw a card, give me +1\|+0 this round. |
| `01PZ043` | 化學龐克扒手 | Chempunk Pickpocket | Not implemented: Nexus Strike: Create in hand an exact copy of a random spell from the enemy deck. |
| `01PZ016` | 靈光電火球 | Flash of Brilliance | 随机法术池仍有尚未实现的卡牌 |
| `01PZ002` | 陋巷酒吧老闆 | Back Alley Barkeep | Not implemented: When I'm summoned, create in hand a random card for each Back Alley Barkeep you've summoned this game.  |
| `01PZ029` | 大善人 | Eminent Benefactor | Not implemented: Play: Manifest an Epic card from your regions. |
| `01PZ030` | 可疑人物 | Shady Character | Not implemented: Play: Pick a follower. Transform me into an exact copy of it. |
| `01PZ034` | 汙水坑拾荒者 | Sumpsnipe Scavenger | Not implemented: Allegiance: Create a Sumpworks Map in hand. It costs 0 this round. |
| `01PZ051` | 武趣工匠 | Funsmith | Not implemented: All of your spells and Skills deal 1 extra damage. |
| `01PZ021` | 密登史多的黨羽 | Midenstokke Henchmen | Not implemented: Nexus Strike: Summon an exact copy of me. |
| `01PZ024` | 暴走配線員 | Unstable Voltician | Not implemented: Grant me +4\|+0 and Quick Attack once you've played a 6+ cost spell this game. |
| `01PZ033` | 追尋完喵 | Purrsuit of Perfection | Not implemented: If you've played 20 new cards this game, summon Catastrophe.  |
| `01PZ005` | 海克斯變形儀 | Hextech Transmogulator | Not implemented: Transform a follower into an exact copy of another follower. |
| `01PZ035` | 杰．梅德拉達 | Jae Medarda | Not implemented: When I'm targeted, draw 1. |
| `01PZ004` | 精準彈幕 | Trueshot Barrage | Not implemented: Deal 3 to an enemy or the enemy Nexus, 2 to another, and 1 to another. |
| `01PZ006` | 廣場守護者 | Plaza Guardian | Not implemented: I cost 1 less for each spell you've played this game. |

## 愛歐尼亞 · Ionia

### 可组牌（33）

| 官方代码 | 原版繁中名称 | English name | 已注册规则说明 |
| --- | --- | --- | --- |
| `01IO004` | 生命藥水 | Health Potion | Heal an ally or your Nexus 3. |
| `01IO005` | 靈巧普羅 | Nimble Poro | Keywords only |
| `01IO011` | 召回 | Recall | Recall an ally. |
| `01IO013` | 暗影之魔 | Shadow Fiend | Keywords only |
| `01IO017` | 那歐利刃斥侯 | Navori Bladescout | When I'm summoned, give me Elusive this round. |
| `01IO018` | 急速猛攻 | Rush | Give an ally +1\|+0 and Quick Attack this round. |
| `01IO019` | 林地守護者 | Greenglade Caretaker | When an ally gets Barrier, grant me +2\|+0. |
| `01IO022` | 鬼步 | Ghost | Give an ally Elusive this round. |
| `01IO042` | 武術學徒 | Sparring Student | When you summon another ally, give me +1\|+1 this round. |
| `01IO006` | 林地雙煞 | Greenglade Duo | When you summon another ally, give me +1\|+0 this round. |
| `01IO012` | 雙重戒律 | Twin Disciplines | Give an ally +3\|+0 or +0\|+3 this round. |
| `01IO020` | 面具看守者 | Keeper of Masks | When I'm summoned, give other allies +1\|+0 this round. |
| `01IO027` | 默言影見者 | Silent Shadowseer | Nexus Strike: Create a copy of me in hand. |
| `01IO029` | 播撒的種子 | Sown Seeds | Grant allies in hand +1\|+0. |
| `01IO045` | 春臨信使 | Herald of Spring | Support: Give my supported ally Lifesteal this round. |
| `01IO046` | 鋼鐵暴雪 | Steel Tempest | Stun an attacking enemy. |
| `01IO014` | 林地長老 | Greenglade Elder | When I'm summoned, grant allies in hand +1\|+1. |
| `01IO028` | 鱗甲四不像 | Scaled Snapper | Play: Grant me +3\|+0 or +0\|+3. |
| `01IO038` | 獨身修女 | Solitary Monk | Play: Recall all other allies. |
| `01IO043` | 人魚術士 | Rivershaper | Strike: Draw a spell. |
| `01IO057` | 暗影刺客 | Shadow Assassin | When I'm summoned, draw 1. |
| `01IO001` | 重生儀式 | Ritual of Renewal | Heal an ally or your Nexus 4. Draw 1. |
| `01IO002` | 愛歐尼亞的意志 | Will of Ionia | Recall a unit. |
| `01IO007` | 暗影之刃．忍 | Ren Shadowblade | Strike: Create a Shadow Fiend in hand. |
| `01IO032` | 慎 | Shen | Support: Give my supported ally Barrier this round. |
| `01IO037` | 靈氣庇護 | Spirit's Refuge | Give an ally Barrier and Lifesteal this round. |
| `01IO040` | 均衡奪命劍客 | Kinkou Lifeblade | Keywords only |
| `01IO048` | 遊剎裏 | Yusari | Keywords only |
| `01IO010` | 並肩作戰 | Stand United | Swap 2 allies. Give them Barrier this round. |
| `01IO047` | 暗影火光 | Shadow Flare | Grant ALL battling followers Ephemeral. |
| `01IO056` | 追風者．犽凝 | Yone, Windchaser | Play: Stun 2 enemies. |
| `01IO021` | 幼年風行貓獸 | Windfarer Hatchling | When I'm summoned, give other allies +2\|+2 this round. |
| `01IO030` | 蒼天龍 | The Empyrean | Keywords only |

### 待完成（20）

| 官方代码 | 原版繁中名称 | English name | 待完成原因 |
| --- | --- | --- | --- |
| `01IO026` | 精神導師 | Inspiring Mentor | Not implemented: Play: Grant an ally in hand +1\|+0. |
| `01IO008` | 四尾旋刃者 | Fae Bladetwirler | Not implemented: When you Stun or Recall a unit, grant me +2\|+0. |
| `01IO036` | 林地瞭望兵 | Greenglade Lookout | Not implemented: Strike: Reduce the cost of the most expensive unit in hand by 1. |
| `01IO039` | 移形換影 | Shadowshift | Not implemented: Recall an ally to summon a Living Shadow in its place. |
| `01IO044` | 那歐土匪 | Navori Conspirator | Not implemented: To play me, Recall an ally. |
| `01IO052` | 那歐劫匪 | Navori Highwayman | Not implemented: When I'm summoned, summon a Navori Brigand with my stats. |
| `01IO054` | 亙古洞悉 | Insight of Ages | 随机法术池仍有尚未实现的卡牌 |
| `01IO055` | 靈氣守護者 | Ki Guardian | Not implemented: Grant Barrier to an ally in hand. <br>Draw 1. |
| `01IO003` | 死亡印記 | Death Mark | Not implemented: Remove Ephemeral from an ally to grant it to an enemy. |
| `01IO009` | 劫 | Zed | Not implemented: Attack: Summon an attacking Living Shadow with my stats. / I've seen myself or allied Living Shadows strike the enemy Nexus twice. |
| `01IO053` | 翡翠覺醒者 | Emerald Awakener | Not implemented: Enlightened: I have +4\|+4. |
| `01IO015` | 犽宿 | Yasuo | Not implemented: When you Stun or Recall an enemy, I deal 2 to it. / You've Stunned or Recalled 5+ units. |
| `01IO049` | 抵制 | Deny | Not implemented: Stop a Fast spell, Slow spell, or Skill. |
| `01IO050` | 均衡引路人 | Kinkou Wayfinder | Not implemented: Allegiance: Summon a 1 cost ally from your deck. |
| `01IO023` | 寶石迅獅 | Jeweled Protector | Not implemented: Play: Grant an ally in hand +3\|+3. |
| `01IO041` | 卡瑪 | Karma | 随机法术池仍有尚未实现的卡牌 |
| `01IO016` | 西風聖鳥 | Zephyr Sage | Not implemented: Play: Create an exact copy of a card in hand other than Zephyr Sage. |
| `01IO024` | 黎明與黃昏 | Dawn and Dusk | Not implemented: Summon 2 exact copies of an ally. They're Ephemeral. |
| `01IO031` | 飲雲飛鯨 | Cloud Drinker | Not implemented: Your Burst and Focus spells cost 1 less. |
| `01IO033` | 迅腿米娜 | Minah Swiftfoot | Not implemented: Play: Recall 3 enemies. |

## 闇影島 · Shadow Isles

### 可组牌（31）

| 官方代码 | 原版繁中名称 | English name | 已注册规则说明 |
| --- | --- | --- | --- |
| `01SI022` | 闇影島印記 | Mark of the Isles | Grant an ally +2\|+2 and Ephemeral. |
| `01SI036` | 寒毛直豎 | Crawling Sensation | If an ally died this round, summon 2 Spiderlings. |
| `01SI037` | 凶厄普羅 | Sinister Poro | Keywords only |
| `01SI043` | 倒楣的貴族 | Hapless Aristocrat | Last Breath: Summon a Spiderling. |
| `01SI045` | 魂靈吸噬 | Absorb Soul | Drain 4 from an ally. |
| `01SI007` | 鬼靈聖物 | Haunted Relic | Summon 3 Unleashed Spirits. |
| `01SI009` | 騷靈酒鬼 | Stirred Spirits | Support: Grant my supported ally +2\|+0 and Ephemeral. |
| `01SI010` | 暗影的逆襲 | Onslaught of Shadows | Summon 2 Spectral Riders. |
| `01SI023` | 牧靈者 | Soul Shepherd | When you summon an Ephemeral ally, grant it +1\|+1. |
| `01SI039` | 八爪夢魘 | Arachnoid Horror | Keywords only |
| `01SI040` | 惡趣胃 | Vile Feast | Drain 1 from a unit to summon a Spiderling. |
| `01SI048` | 受詛咒的看守人 | Cursed Keeper | Last Breath: Summon an Escaped Abomination. |
| `01SI049` | 窺視異域 | Glimpse Beyond | Kill an ally to draw 2. |
| `01SI004` | 黑潮災厄 | Darkwater Scourge | Keywords only |
| `01SI018` | 憂傷抄寫員 | Scribe of Sorrows | When I'm summoned, create a copy in hand of an ally that died this game. |
| `01SI031` | 幽鐵宣令官 | Iron Harbinger | Attack: Grant me +1\|+0 for each Ephemeral ally you have. |
| `01SI034` | 靈魂黑矛 | Black Spear | If an ally died this round, deal 4 to a unit. |
| `01SI038` | 魅影搗蛋鬼 | Phantom Prankster | When another ally dies, deal 1 to the enemy Nexus. |
| `01SI056` | 發狂疾行蛛 | Frenzied Skitterer | When I'm summoned, give other Spider allies +1\|+0 and enemies -1\|-0 this round. |
| `01SI019` | 惡靈領域 | The Box | Deal 3 to each enemy that was summoned this round. |
| `01SI029` | 吸星鬼哭 | Withering Wail | Deal 1 to all enemies. Heal your Nexus 3. |
| `01SI032` | 殞落王國編年史家 | Chronicler of Ruin | Play: Kill an ally, then revive it. |
| `01SI051` | 飽受折磨的奇才 | Tortured Prodigy | When another ally dies, or Last Breath: Refill your spell mana. |
| `01SI054` | 不死之握 | Grasp of the Undying | Drain 3 from a unit. |
| `01SI001` | 復仇 | Vengeance | Kill a unit. |
| `01SI050` | 傾巢而出 | Brood Awakening | Summon 3 Spiderlings, then grant Spider allies +1\|+0.  |
| `01SI055` | 食魂巨魔 | Soulgorger | Keywords only |
| `01SI025` | 殘酷暴行 | Atrocity | Kill an ally to deal damage equal to its Power to anything. |
| `01SI035` | 割魂手喇煞 | Rhasa the Sunderer | Play: Kill the 2 weakest enemies if an ally died this round. |
| `01SI015` | 殞落王者的詛咒 | The Ruination | Kill ALL units. |
| `01SI033` | 萊卓斯指揮官 | Commander Ledros | Play: Deal damage to the enemy Nexus equal to half its Health, rounded up.<br>Last Breath: Return me to hand. |

### 待完成（22）

| 官方代码 | 原版繁中名称 | English name | 待完成原因 |
| --- | --- | --- | --- |
| `01SI011` | 無饜屠夫 | Ravenous Butcher | Not implemented: To play me, kill an ally. |
| `01SI047` | 褪色回憶 | Fading Memories | Not implemented: Pick a follower. Create an Ephemeral copy of it in hand. |
| `01SI012` | 不知情的島民 | Oblivious Islander | Not implemented: Play: Grant an ally in hand Ephemeral and reduce its cost by 1. |
| `01SI026` | 獄長的獵物 | Warden's Prey | Not implemented: Last Breath: Create in hand another random Last Breath follower that costs 3 or less. |
| `01SI014` | 霧魅 | Mistwraith | Not implemented: When I'm summoned, grant other allied Mistwraiths everywhere +1\|+0. |
| `01SI021` | 鯊魚戰車 | Shark Chariot | Not implemented: Last Breath: The next time an Ephemeral ally attacks, revive me attacking. |
| `01SI053` | 伊莉絲 | Elise | Not implemented: Attack: Summon an attacking Spiderling. / Round Start: You have 3+ other Spiders. |
| `01SI027` | 新鮮獻祭 | Fresh Offerings | Not implemented: If 3+ allies have died this round, summon Vilemaw.<br> |
| `01SI028` | 裂靈術 | Splinter Soul | Not implemented: Summon an exact copy of an ally. It's Ephemeral and 1\|1. |
| `01SI030` | 克黎思妲 | Kalista | Not implemented: I've seen 3+ allies die. |
| `01SI041` | 不死戰魂 | The Undying | Not implemented: Last Breath: Revive me at the next Round Start and grant me +1\|+1 for each time I've died.  |
| `01SI046` | 黯霧呼喚 | Mist's Call | Not implemented: Revive a random ally that died this round. |
| `01SI016` | 使魅師 | Wraithcaller | Not implemented: Allegiance: Summon a Mistwraith. |
| `01SI057` | 古代鱷龍 | Ancient Crocolith | Not implemented: To play me, kill 2 allies. |
| `01SI006` | 據為己有 | Possession | Not implemented: Steal an enemy follower this round. (Can't play if you have 6 allies or landmarks already.) |
| `01SI052` | 瑟雷西 | Thresh | Not implemented: I've seen 6+ units die. |
| `01SI058` | 幻影赦魔 | Ethereal Remitter | Not implemented: Play: Kill an ally to summon a random follower that costs 2 more. |
| `01SI042` | 赫克林 | Hecarim | Not implemented: Attack: Summon 2 attacking Spectral Riders. / You've attacked with 7+ Ephemeral allies. |
| `01SI020` | 燃魂人 | The Rekindler | Not implemented: When I'm summoned, revive the strongest dead allied champion. |
| `01SI044` | 幽魂女戒護官 | Spectral Matron | Not implemented: Play: Pick an ally in hand. Summon an exact copy of it. It's Ephemeral. |
| `01SI003` | 哈洛威 | The Harrowing | Not implemented: Revive the 6 strongest allies that died this game and grant them Ephemeral. |
| `01SI005` | 鑿魂怪 | Scuttlegeist | Not implemented: I cost 1 less for each ally that died this game. |

## 数据来源

数据、美术与源代码的许可范围分别见 [THIRD_PARTY_ASSETS.md](THIRD_PARTY_ASSETS.md) 和 [LICENSE](LICENSE)。

- [官方 en_us JSON](https://dd.b.pvp.net/7_10_0/set1/en_us/data/set1-en_us.json)：SHA-256 `dd914bdcff22139a6c275be4fe39606bc80a852e9087f0558a9bac78aa9c7e6c`。
- [官方 zh_tw JSON](https://dd.b.pvp.net/7_10_0/set1/zh_tw/data/set1-zh_tw.json)：SHA-256 `d1a8efe6536ea04be3ca264c0353abb027f8ff0c035914157fff35689acc8b3f`。
