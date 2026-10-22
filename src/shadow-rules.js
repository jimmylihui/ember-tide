// Shadow Isles stateful card families. Revival uses new instances of dead
// cards, while exact-copy effects retain the selected instance's modifiers.
import { CARDS } from './cards.js';
export const SHADOW_RULES = {};
const define = (id, spec = {}) => {
  if (!CARDS[id]) throw new Error(`Unknown Shadow Isles card ${id}`);
  SHADOW_RULES[id] = {
    target: 'none',
    note: [CARDS[id].textEn, CARDS[id].levelTextEn].filter(Boolean).join(' ') || 'Keywords only',
    ...spec,
  };
};
const flags = u => (u.flags ||= {});
const isUnit = c => c?.kind === 'unit';
const follower = c => isUnit(c) && !c.hero;
const deathCard = (ctx, record) => ctx.card(record.card);
const grave = ctx => ctx.player.grave || [];
const rank = (ctx, record) => {
  const c = deathCard(ctx, record);
  return [c.atk, c.hp, c.cost];
};
const compareRank = (ctx, a, b) => {
  const aa = rank(ctx, a), bb = rank(ctx, b);
  return bb[0] - aa[0] || bb[1] - aa[1] || bb[2] - aa[2];
};
const strongestDead = (ctx, records) => {
  if (!records.length) return null;
  const sorted = [...records].sort((a, b) => compareRank(ctx, a, b));
  return ctx.random(sorted.filter(record => compareRank(ctx, sorted[0], record) === 0));
};
const currentCost = (ctx, instance) => ctx.cost ? ctx.cost(instance) : Math.max(0, (instance.costOverride ?? ctx.card(instance.card).cost) + (instance.costDelta || 0));
const handUnit = ctx => isUnit(ctx.card(ctx.t?.u?.card)) || '请选择手牌中的单位。';

define('01SI003', {
  effect: ctx => {
    const pool = [...grave(ctx)];
    for (let i = 0; i < 6 && pool.length; i++) {
      const dead = strongestDead(ctx, pool);
      pool.splice(pool.indexOf(dead), 1);
      ctx.revive(dead, { ephemeral: true });
    }
  },
});
define('01SI005', { cost: ctx => Math.max(0, 10 - ctx.player.unitsDied) });
define('01SI006', {
  target: 'enemyFollower',
  validate: ctx => ctx.allies().length < 6 || '战场已满。',
  effect: ctx => ctx.steal(ctx.t, true),
});
define('01SI011', { sacrifice: { count: 1 } });
define('01SI057', { sacrifice: { count: 2 } });
define('01SI012', {
  target: 'allyHand', targetOptional: true,
  validate: ctx => !ctx.t || handUnit(ctx),
  play: ctx => {
    if (!ctx.t) return;
    const h = ctx.t.u;
    h.kwBonus = [...new Set([...(h.kwBonus || []), 'Ephemeral'])];
    h.costDelta = (h.costDelta || 0) - 1;
  },
});
define('01SI014', {
  summon: ctx => ctx.grantEverywhere(c => c.id === '01SI014', 1, 0, { excludeUid: ctx.u.uid }),
});
define('01SI016', {
  summon: ctx => {
    const top = ctx.player.deck[0];
    if (top && ctx.card(top.card).regions.includes('ShadowIsles')) ctx.summon('01SI014');
  },
});
define('01SI020', {
  summon: ctx => {
    const dead = strongestDead(ctx, grave(ctx).filter(record => deathCard(ctx, record).hero));
    if (dead) ctx.revive(dead);
  },
});
define('01SI021', {
  lastBreath: ctx => {
    // The engine consumes the pending snapshot when an Ephemeral ally attacks.
    // The revived Shark can enqueue itself again on its next death.
    (ctx.player.sharks ||= []).push(structuredClone(ctx.u));
  },
});
define('01SI026', {
  lastBreath: ctx => {
    const code = ctx.randomCard(c => c.id !== '01SI026' && follower(c) && c.cost <= 3 && c.kw.includes('LastBreath'));
    if (code) ctx.create(code);
  },
});
define('01SI027', {
  effect: ctx => { if (ctx.player.roundDeaths >= 3) ctx.summon('01SI027T1'); },
});
define('01SI027T1', { aura: { keyword: 'Fearsome', atk: 1, excludeSelf: true } });
define('01SI028', {
  target: 'ally',
  effect: ctx => ctx.copy(ctx.t, { ephemeral: true, stats: { atk: 1, hp: 1 } }),
});

define('01SI030', { champion: 'Kalista', checkLevel: ctx => ctx.u.seenDeaths >= 3 });
define('01SI030T2', {
  champion: 'Kalista',
  attack: ctx => {
    const state = flags(ctx.u);
    if (state.kalistaAttackRound === ctx.g.round) return;
    state.kalistaAttackRound = ctx.g.round;
    const dead = strongestDead(ctx, grave(ctx).filter(record => follower(deathCard(ctx, record))));
    if (!dead) return;
    const bonded = ctx.revive(dead, { attacking: true, ephemeral: true });
    if (bonded) {
      state.bond = bonded.u.uid;
      state.bondRound = ctx.g.round;
    }
  },
});
define('01SI030T1', {
  target: 'unit', championShuffle: '01SI030',
  effect: ctx => { if (ctx.player.roundDeaths > 0) ctx.damage(ctx.t, 4); },
});
// A normal revival clears buffs. It is separate from the Undying's scheduled
// self-revival, which explicitly carries its own accumulated death counter.
define('01SI032', {
  target: 'ally',
  play: ctx => {
    const uid = ctx.t.u.uid;
    ctx.kill(ctx.t);
    ctx.settle();
    const record = grave(ctx).find(record => record.uid === uid);
    if (record) ctx.revive(record);
  },
});
define('01SI033T1', { effect: ctx => ctx.damage(ctx.core(1 - ctx.p), Math.ceil(ctx.opponent.hp / 2)) });
define('01SI035T1', {
  effect: ctx => {
    if (ctx.player.roundDeaths <= 0) return;
    const enemies = [...ctx.enemies()];
    for (let i = 0; i < 2 && enemies.length; i++) {
      const weakest = [...enemies].sort((a, b) => ctx.power(a) - ctx.power(b) || a.u.hp - b.u.hp || currentCost(ctx, a.u) - currentCost(ctx, b.u))[0];
      ctx.kill(weakest);
      enemies.splice(enemies.indexOf(weakest), 1);
    }
  },
});
define('01SI041', {
  lastBreath: ctx => {
    const deaths = (flags(ctx.u).undyingDeaths || 0) + 1;
    ctx.scheduleRevive(structuredClone(ctx.u), {
      buff: { atk: deaths, hp: deaths }, flags: { undyingDeaths: deaths },
    });
  },
});

const summonRiders = ctx => {
  ctx.summon('01SI024', { attacking: true });
  ctx.summon('01SI024', { attacking: true });
};
define('01SI042', {
  champion: 'Hecarim', attack: summonRiders,
  checkLevel: ctx => (ctx.player.ephemeralAttacks || 0) >= 7,
});
define('01SI042T1', {
  champion: 'Hecarim', attack: summonRiders,
  onLevel: ctx => {
    if (!ctx.player.hecarimNexusGranted) {
      ctx.player.hecarimNexusGranted = true;
      ctx.player.ephemeralAura = (ctx.player.ephemeralAura || 0) + 3;
    }
  },
});
define('01SI042T2', {
  championShuffle: '01SI042',
  effect: ctx => { ctx.summon('01SI024'); ctx.summon('01SI024'); },
});
define('01SI044', {
  target: 'allyHand', validate: handUnit,
  play: ctx => ctx.copy(ctx.t, { ephemeral: true }),
});
define('01SI046', {
  effect: ctx => {
    const record = ctx.random(grave(ctx).filter(record => record.deathRound === ctx.g.round));
    if (record) ctx.revive(record);
  },
});
define('01SI047', {
  target: 'follower', effect: ctx => ctx.createCopy(ctx.t, { exact: false, ephemeral: true }),
});

define('01SI052', { champion: 'Thresh', checkLevel: ctx => ctx.u.seenDeaths >= 6 });
define('01SI052T1', {
  champion: 'Thresh',
  attack: ctx => {
    const state = flags(ctx.u);
    if (state.threshAttackUsed) return;
    state.threshAttackUsed = true;
    if (ctx.allies().length >= 6) return;
    const eligible = c => isUnit(c) && c.hero && c.nameEn !== 'Thresh';
    const pulled = ctx.summonFromDeck(eligible, { attacking: true, limit: 1 });
    if (pulled.length) return;
    const selected = ctx.random(ctx.hand().filter(h => eligible(ctx.card(h.card))));
    if (!selected) return;
    const index = ctx.player.hand.findIndex(h => h.uid === selected.uid);
    ctx.player.hand.splice(index, 1);
    ctx.summon(selected.card, { attacking: true, packet: selected });
  },
});
define('01SI052T2', {
  championShuffle: '01SI052',
  effect: ctx => ctx.enemies().filter(t => t.u.summonedRound === ctx.g.round).forEach(t => ctx.damage(t, 3)),
});
define('01SI053', {
  champion: 'Elise',
  attack: ctx => ctx.summon('01SI002', { attacking: true }),
  roundStart: ctx => {
    const others = ctx.allies().filter(t => t.u.uid !== ctx.u.uid && ctx.card(t.u.card).subtypes.includes('SPIDER'));
    if (others.length >= 3) ctx.level();
  },
});
define('01SI053T2', {
  champion: 'Elise', keywordAura: { subtype: 'SPIDER', keywords: ['Challenger', 'Fearsome'], excludeSelf: true },
});
define('01SI053T1', {
  championShuffle: '01SI053',
  effect: ctx => { if (ctx.player.roundDeaths > 0) { ctx.summon('01SI002'); ctx.summon('01SI002'); } },
});
define('01SI058', {
  target: 'ally',
  play: ctx => {
    const cost = currentCost(ctx, ctx.t.u) + 2;
    ctx.kill(ctx.t);
    ctx.settle();
    const code = ctx.randomCard(c => c.collectible && follower(c) && c.cost === cost);
    if (code) ctx.summon(code);
  },
});
