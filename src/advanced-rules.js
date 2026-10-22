// Stateful Foundations rules. Content comes from the pinned official catalog;
// this module implements effects rather than interpreting English card text.
import { CARDS } from './cards.js';
export const ADVANCED_RULES = {};
const define = (id, rule) => { ADVANCED_RULES[id] = { target: 'none', note: [CARDS[id].textEn, CARDS[id].levelTextEn].filter(Boolean).join(' ') || 'Keywords only', ...rule }; };
const flags = u => (u.flags ||= {});
const regionSpell = (ctx, c) => c.collectible && c.kind === 'spell'
  && c.regions.some(region => ctx.player.regions.includes(region));
const createRandomSpell = (ctx, extra = () => true) => {
  const code = ctx.randomCard(c => regionSpell(ctx, c) && extra(c));
  if (code) return ctx.create(code);
  return null;
};
const fleeting = instance => {
  if (instance) instance.fleeting = true;
  return instance;
};

// Puffcaps stay attached to individual cards in the opponent's deck. The
// engine implements planting, drawn-card trap activation, and level progress.
define('01PZ008', { champion: 'Teemo', nexusStrike: ctx => ctx.plant(5) });
define('01PZ008T2', {
  champion: 'Teemo',
  nexusStrike: ctx => {
    const existing = ctx.opponent.deck.reduce((total, c) => total + (c.puffcaps || 0), 0);
    ctx.plant(Math.max(5, existing));
  },
});
define('01PZ010', { effect: ctx => ctx.plant(5) });
define('01PZ025', { spellPlayed: ctx => ctx.plant(3) });
define('01PZ053', { summon: ctx => ctx.create('01PZ010') });
define('01PZ058', { summon: ctx => ctx.create('01PZ010', 2) });

// Jinx's once-per-round trigger remembers actual transitions to an empty hand.
// Resetting a round alone cannot generate another rocket from an empty hand.
const jinxRocket = ctx => {
  const state = flags(ctx.u);
  if (state.jinxRocketRound === ctx.g.round) return;
  state.jinxRocketRound = ctx.g.round;
  ctx.create('01PZ040T2');
};
const jinxEmptyHand = ctx => {
  const state = flags(ctx.u);
  const empty = (ctx.event?.handSize ?? ctx.hand().length) === 0;
  const becameEmpty = empty && !state.jinxHandEmpty;
  state.jinxHandEmpty = empty;
  if (becameEmpty) jinxRocket(ctx);
};
define('01PZ040', { champion: 'Jinx' });
define('01PZ040T1', {
  champion: 'Jinx',
  onLevel: jinxRocket,
  handChanged: jinxEmptyHand,
  roundStart: ctx => ctx.draw(1),
});
define('01PZ040T2', {
  effect: ctx => {
    ctx.damage(ctx.core(1 - ctx.p), 3);
    for (const enemy of ctx.enemies()) ctx.damage(enemy, 1);
  },
});

// Spell declaration contains the original target descriptors so an enemy's
// later death does not erase the fact that Ezreal targeted it.
const ezrealNexusStrike = ctx => fleeting(ctx.create('01PZ052'));
define('01PZ036', { champion: 'Ezreal', nexusStrike: ezrealNexusStrike });
define('01PZ036T1', {
  champion: 'Ezreal',
  nexusStrike: ezrealNexusStrike,
  spellPlayed: ctx => {
    const targets = ctx.event.targets || [];
    const enemyTargeted = targets.some(t => t && t.p !== ctx.p && !t.core);
    ctx.damage(ctx.core(1 - ctx.p), enemyTargeted ? 2 : 1);
  },
});

const TURRETS_BY_COST = [
  '01PZ056T1', '01PZ056T4', '01PZ056T7', '01PZ056T8', '01PZ056T9',
  '01PZ056T2', '01PZ056T6', '01PZ056T5', '01PZ015',
];
const makeTurret = (ctx, upgraded) => {
  const manaCost = Math.max(0, Math.floor(ctx.event.cost));
  const turret = fleeting(ctx.create(TURRETS_BY_COST[Math.min(8, manaCost)]));
  if (!turret) return;
  turret.costOverride = 0;
  if (upgraded) {
    turret.atkBonus = (turret.atkBonus || 0) + 1;
    turret.hpBonus = (turret.hpBonus || 0) + 1;
  }
};
define('01PZ056', { champion: 'Heimerdinger', spellPlayed: ctx => makeTurret(ctx, false) });
define('01PZ056T10', { champion: 'Heimerdinger', spellPlayed: ctx => makeTurret(ctx, true) });

// Karma's leveled spell-copy action is managed by the engine so copied spells
// keep their original targets and cannot recursively trigger additional copies.
define('01IO041', { champion: 'Karma', roundEnd: ctx => createRandomSpell(ctx) });
define('01IO041T1', { champion: 'Karma', roundEnd: ctx => createRandomSpell(ctx), duplicateSpells: true });
define('01IO054', {
  effect: ctx => {
    const count = ctx.player.maxMana >= 10 ? 2 : 1;
    for (let i = 0; i < count; i++) createRandomSpell(ctx, c => c.id !== '01IO054');
  },
});
define('01PZ016', {
  effect: ctx => {
    createRandomSpell(ctx, c => c.cost >= 6);
    ctx.refillSpellMana();
  },
});
define('01PZ049', {
  effect: ctx => {
    for (const instance of ctx.draw(3)) instance.costDelta = (instance.costDelta || 0) - 1;
  },
});
define('01PZ014', { effect: ctx => ctx.summon('01PZ014T1') });
define('01PZ057', {
  effect: ctx => {
    ctx.summon('01PZ032');
    ctx.summon('01PZ032');
  },
});

// Discard-triggered units and spells work whether discarded as a cost or by an
// effect. The engine calls discarded with the discarded instance as ctx.u.
define('01PZ012', { discarded: ctx => ctx.summon('01PZ012') });
define('01PZ028', {
  effect: ctx => ctx.summon('01PZ032'),
  discarded: ctx => ctx.summon('01PZ032'),
});

// Discards are chosen explicitly and paid at declaration by the engine. They
// are not part of spell resolution, so denial never refunds the discarded card.
define('01PZ039', {
  target: 'any', discard: { min: 1, max: 1 }, effect: ctx => ctx.damage(ctx.t, 3),
});
define('01PZ001', {
  discard: { min: 1, max: 2, requireMaximum: true }, effect: ctx => ctx.draw(ctx.discarded.length),
});
const discardThenDraw = ctx => { if (ctx.discarded.length) ctx.draw(1); };
define('01PZ045', { discard: { min: 0, max: 1 }, play: discardThenDraw });
define('01PZ038', { discard: { min: 0, max: 1 }, play: discardThenDraw });
const recklessResearch = ctx => {
  // Capture the original hand before any discard-generated card is created.
  for (const instance of [...ctx.hand()]) ctx.discard(instance.uid);
  ctx.draw(3);
  ctx.damage(ctx.t, 3);
};
define('01PZ013', { target: 'enemyUnit', targetOptional: true, resolveWithoutTarget: true, skill: 'play', skillId: '01PZ013T1', play: recklessResearch });
define('01PZ013T1', { target: 'enemyUnit', targetOptional: true, resolveWithoutTarget: true, effect: recklessResearch });
define('01PZ046', {
  target: 'allyHand',
  effect: ctx => ctx.createInDeck(ctx.t.u.card, 4, 'shuffle', ctx.t.u),
});

// Champion spell variants share their base spell behavior. The engine shuffles
// one original champion into the owner's deck after this spell resolves.
const championSpell = (id, base, champion) => {
  const rule = ADVANCED_RULES[base];
  if (!rule) throw new Error(`Missing advanced champion spell base: ${base}`);
  define(id, { ...rule, championShuffle: champion });
};
championSpell('01PZ008T1', '01PZ010', '01PZ008');
championSpell('01PZ056T3', '01PZ049', '01PZ056');
championSpell('01IO041T2', '01IO054', '01IO041');
championSpell('01PZ040T3', '01PZ039', '01PZ040');
// Ezreal's champion spell mirrors the basic Mystic Shot registered elsewhere.
define('01PZ036T2', {
  target: 'any', effect: ctx => ctx.damage(ctx.t, 2), championShuffle: '01PZ036',
});
