#!/usr/bin/env node
// Snapshot the executable registry, not just the presence of catalog records.
import { writeFile } from 'node:fs/promises';
import { CARDS, DATASET, REGIONS, cardSupported } from '../src/engine.js';
import { RULES, unsupportedFor } from '../src/rules.js';
import { ADVANCED_RULES } from '../src/advanced-rules.js';

const registry = { ...RULES, ...ADVANCED_RULES };
const pendingReasons = unsupportedFor(registry);
const all = Object.values(CARDS);
const collectible = all.filter(c => c.collectible);
const playable = collectible.filter(c => cardSupported(c.id));
const pending = collectible.filter(c => !cardSupported(c.id));
if (collectible.length !== 318 || DATASET.collectibleCount !== 318) {
  throw new Error('Expected the pinned Foundations catalog to contain 318 collectible cards.');
}
if (all.length !== DATASET.cardCount) throw new Error('Catalog metadata count does not match the actual catalog.');

const cell = value => String(value ?? '').replaceAll('|', '\\|').replace(/\r?\n/g, '<br>').replace(/\r/g, '<br>');
const sortCards = cards => [...cards].sort((a, b) => a.cost - b.cost || a.id.localeCompare(b.id));
const reasonFor = c => CARDS[c.id].unsupportedReason || registry[c.id]?.reason || pendingReasons[c.id] || '规则尚未实现。';
const noteFor = c => registry[c.id]?.note || [c.textEn, c.levelTextEn].filter(Boolean).join(' ') || c.kw.join(', ') || '无额外效果。';
const cardTable = (cards, implemented) => [
  '| 官方代码 | 原版繁中名称 | English name | ' + (implemented ? '已注册规则说明' : '待完成原因') + ' |',
  '| --- | --- | --- | --- |',
  ...sortCards(cards).map(c => `| \`${c.id}\` | ${cell(c.name)} | ${cell(c.nameEn)} | ${cell(implemented ? noteFor(c) : reasonFor(c))} |`),
].join('\n');
const byRegion = REGIONS.map(region => {
  const cards = collectible.filter(c => c.region === region.id);
  return { region, cards, playable: cards.filter(c => cardSupported(c.id)), pending: cards.filter(c => !cardSupported(c.id)) };
});
const knownRegions = new Set(REGIONS.map(r => r.id));
if (collectible.some(c => !knownRegions.has(c.region))) throw new Error('A collectible card is missing from the region grouping.');

const lines = [
  '# Foundations 规则覆盖清单',
  '',
  '本文件由 `node scripts/coverage.mjs` 从当前引擎的 `cardSupported` 与合并后的规则注册表生成。修改规则后请重新生成。',
  '',
  '**这是规则注册表覆盖率，不是全部官方规则与交互的一致性认证。**',
  '',
  'Rule registry coverage, not exhaustive official-conformance certification.',
  '',
  `- 数据版本：Riot Data Dragon \`${DATASET.dataVersion}\`，\`${DATASET.set}\`（${DATASET.name}）。`,
  `- 目录记录：**${all.length}**；其中可收集卡牌 **${collectible.length}**，升级形态、技能及其他衍生记录 **${all.length - collectible.length}**。`,
  `- 当前允许加入套牌：**${playable.length} / ${collectible.length}**（${(playable.length / collectible.length * 100).toFixed(1)}%）。`,
  `- 可收集卡牌待完成：**${pending.length}**。存在规则但标记为 \`implemented:false\` 的卡牌计入待完成。`,
  '- 下方逐卡清单只统计可收集卡牌。繁中名称和英文名称直接来自固定版本目录；按用于基础卡池组牌的地区归类。',
  '- 生成技能由来源卡牌及引擎触发，不代表可独立加入套牌；完整目录中的“有记录”不等于“可对战”。',
  '',
  '## 地区汇总',
  '',
  '| 地区 | English region | 可收集总数 | 可组牌 | 待完成 |',
  '| --- | --- | ---: | ---: | ---: |',
  ...byRegion.map(({ region, cards, playable, pending }) => `| ${cell(region.name)} | ${cell(region.nameEn)} | ${cards.length} | ${playable.length} | ${pending.length} |`),
  `| **合计** | | **${collectible.length}** | **${playable.length}** | **${pending.length}** |`,
  '',
];

for (const group of byRegion) {
  const { region, playable, pending } = group;
  lines.push(`## ${region.name} · ${region.nameEn}`, '', `### 可组牌（${playable.length}）`, '');
  lines.push(playable.length ? cardTable(playable, true) : '暂无。', '');
  lines.push(`### 待完成（${pending.length}）`, '', pending.length ? cardTable(pending, false) : '暂无。', '');
}

lines.push('## 数据来源', '', '数据、美术与源代码的许可范围分别见 [THIRD_PARTY_ASSETS.md](THIRD_PARTY_ASSETS.md) 和 [LICENSE](LICENSE)。', '');
for (const [locale, source] of Object.entries(DATASET.sources)) {
  lines.push(`- [官方 ${locale} JSON](${source.url})：SHA-256 \`${source.sha256}\`。`);
}
lines.push('');
await writeFile(new URL('../COVERAGE.md', import.meta.url), lines.join('\n'));
console.log(`COVERAGE.md: ${playable.length}/${collectible.length} collectible cards playable; ${pending.length} pending; ${all.length} catalog records.`);
