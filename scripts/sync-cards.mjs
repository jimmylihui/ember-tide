#!/usr/bin/env node
// Rebuild the Foundations metadata module from pinned Riot Data Dragon JSON.
// Run: node scripts/sync-cards.mjs
// Offline: node scripts/sync-cards.mjs --source-dir /path/to/json
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const VERSION = '7_10_0';
const LOCALES = ['en_us', 'zh_tw'];
const ROOT = fileURLToPath(new URL('../', import.meta.url));
const options = { output: resolve(ROOT, 'src/cards.js'), sourceDir: null };
for (let i = 2; i < process.argv.length; i++) {
  const flag = process.argv[i];
  if (flag === '--source-dir' && process.argv[i + 1]) options.sourceDir = resolve(process.argv[++i]);
  else if (flag === '--out' && process.argv[i + 1]) options.output = resolve(process.argv[++i]);
  else throw new Error(`Unknown or incomplete argument: ${flag}`);
}

const sourceURL = locale => `https://dd.b.pvp.net/${VERSION}/set1/${locale}/data/set1-${locale}.json`;
const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');
const sources = await Promise.all(LOCALES.map(async locale => {
  const url = sourceURL(locale);
  let bytes;
  if (options.sourceDir) bytes = await readFile(resolve(options.sourceDir, `set1-${locale}.json`));
  else {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Unable to fetch ${url}: ${response.status}`);
    bytes = Buffer.from(await response.arrayBuffer());
  }
  const data = JSON.parse(bytes.toString('utf8'));
  if (!Array.isArray(data)) throw new Error(`Invalid card data for ${locale}`);
  return { locale, url, sha256: sha256(bytes), data };
}));
const english = sources.find(s => s.locale === 'en_us').data;
const localized = new Map(sources.find(s => s.locale === 'zh_tw').data.map(c => [c.cardCode, c]));
if (english.length !== 419 || english.filter(c => c.collectible).length !== 318) {
  throw new Error('The pinned Foundations source must contain 419 cards, including 318 collectible cards.');
}
if (localized.size !== english.length) throw new Error('Locale card sets do not match.');

const https = path => path.replace(/^http:\/\//, 'https://');
const CARDS = Object.fromEntries([...english].sort((a, b) => a.cardCode.localeCompare(b.cardCode)).map(c => {
  const local = localized.get(c.cardCode);
  if (!local || !local.assets[0]) throw new Error(`Missing localization or assets for ${c.cardCode}`);
  return [c.cardCode, {
    id: c.cardCode,
    name: local.name,
    nameEn: c.name,
    // Teemo became dual-region after Foundations; retain the original P&Z deck region.
    region: c.regionRefs[0] === 'BandleCity' && c.regionRefs.includes('PiltoverZaun') ? 'PiltoverZaun' : c.regionRefs[0],
    regions: [...c.regionRefs],
    cost: c.cost,
    atk: c.attack,
    hp: c.health,
    kind: c.type === 'Unit' ? 'unit' : c.type === 'Spell' ? 'spell' : 'skill',
    kw: [...c.keywordRefs],
    speed: (c.spellSpeedRef || '').toLowerCase(),
    hero: c.supertype === 'Champion',
    collectible: c.collectible,
    text: local.descriptionRaw,
    textEn: c.descriptionRaw,
    levelText: local.levelupDescriptionRaw,
    levelTextEn: c.levelupDescriptionRaw,
    associated: [...c.associatedCardRefs],
    subtypes: [...c.subtypes],
    art: https(local.assets[0].fullAbsolutePath),
    render: https(local.assets[0].gameAbsolutePath),
  }];
}));

const REGIONS = [
  { id: 'Demacia', name: '蒂瑪西亞', nameEn: 'Demacia' },
  { id: 'Freljord', name: '弗雷爾卓德', nameEn: 'Freljord' },
  { id: 'Noxus', name: '諾克薩斯', nameEn: 'Noxus' },
  { id: 'PiltoverZaun', name: '皮爾托福&佐恩', nameEn: 'Piltover & Zaun' },
  { id: 'Ionia', name: '愛歐尼亞', nameEn: 'Ionia' },
  { id: 'ShadowIsles', name: '闇影島', nameEn: 'Shadow Isles' },
];
const expand = rows => rows.flatMap(([id, copies]) => Array(copies).fill(id));
const PRESETS = [
  {
    id: 'demacia-freljord',
    name: '蓋倫與布郎姆 · 鋼鐵與寒冰',
    regions: ['Demacia', 'Freljord'],
    champions: ['01DE012', '01FR009'],
    deck: expand([
      ['01DE012', 3], ['01FR009', 3], ['01DE039', 3], ['01DE020', 3],
      ['01DE046', 3], ['01DE011', 3], ['01DE028', 3], ['01FR027', 3],
      ['01FR053', 3], ['01FR026', 3], ['01DE018', 3], ['01FR001', 3],
      ['01FR004', 2], ['01DE032', 2],
    ]),
  },
  {
    id: 'noxus-piltoverzaun',
    name: '達瑞斯與吉茵珂絲 · 侵略與火力',
    regions: ['Noxus', 'PiltoverZaun'],
    champions: ['01NX038', '01PZ040'],
    deck: expand([
      ['01NX038', 3], ['01PZ040', 3], ['01NX012', 3], ['01NX015', 3],
      ['01PZ018', 3], ['01PZ059', 3], ['01NX026', 3], ['01NX041', 3],
      ['01PZ020', 3], ['01PZ009', 3], ['01PZ052', 3], ['01NX043', 3],
      ['01NX002', 2], ['01NX027', 2],
    ]),
  },
];
for (const preset of PRESETS) {
  if (preset.deck.length !== 40) throw new Error(`Invalid deck size: ${preset.id}`);
  for (const id of preset.deck) {
    const c = CARDS[id];
    if (!c?.collectible || !preset.regions.includes(c.region)) throw new Error(`Invalid preset card ${id}`);
    if (preset.deck.filter(code => code === id).length > 3) throw new Error(`Too many copies of ${id}`);
  }
  if (preset.deck.filter(id => CARDS[id].hero).length > 6) throw new Error(`Too many champions: ${preset.id}`);
}

const DATASET = {
  name: 'Foundations',
  set: 'Set1',
  dataVersion: VERSION,
  locales: LOCALES,
  cardCount: english.length,
  collectibleCount: english.filter(c => c.collectible).length,
  sources: Object.fromEntries(sources.map(({ locale, url, sha256 }) => [locale, { url, sha256 }])),
};
const json = data => JSON.stringify(data, null, 2);
const output = `// Generated by scripts/sync-cards.mjs from Riot Data Dragon ${VERSION}.\n`
  + '// Card names, rules text, and linked artwork are Riot Games content; see THIRD_PARTY_ASSETS.md.\n'
  + '// This metadata catalog does not assert that every card has implemented game rules.\n'
  + `export const DATASET = ${json(DATASET)};\n\n`
  + `export const REGIONS = ${json(REGIONS)};\n\n`
  + `export const PRESETS = ${json(PRESETS)};\n\n`
  + `export const CARDS = ${json(CARDS)};\n`;
await writeFile(options.output, output);
console.log(`Wrote ${english.length} cards (${DATASET.collectibleCount} collectible), ${PRESETS.length} legal 40-card presets to ${options.output}`);
for (const s of sources) console.log(`${s.locale} SHA-256 ${s.sha256}`);
