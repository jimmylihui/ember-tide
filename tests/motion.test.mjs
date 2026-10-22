import test from 'node:test';
import assert from 'node:assert/strict';
import { planEffects } from '../src/motion.js';
import { CARDS, createGame, act, view } from '../src/engine.js';

const state = (version, extra = {}) => ({ schema: 3, version, round: 1, attacker: 0, winner: null, effects: [], combat: null, players: [0, 1].map(() => ({ hp: 20, board: [], hand: [], grave: [] })), ...extra });
const context = { seat: 0, beforeSeat: 0, mode: 'online', beforeMode: 'online', sessionKey: 'room:A', beforeSessionKey: 'room:A', cards: CARDS };
const unit = (uid, extra = {}) => ({ uid, card: '01DE039', hp: 2, maxHp: 2, kw: [], tempKw: [], removedKw: [], level: false, ...extra });

test('first render, duplicate render, backwards state, and schema reset are silent', () => {
  assert.deepEqual(planEffects(null, state(1), context), []);
  assert.deepEqual(planEffects(state(1), state(1), context), []);
  assert.deepEqual(planEffects(state(5), state(2), context), []);
  assert.deepEqual(planEffects(state(1), state(2, { schema: 4 }), context), []);
});

test('curtain, seat handover, and session changes suppress effects', () => {
  const next = state(2, { effects: [{ seq: 1, type: 'play', p: 0, uid: 'a', card: '01DE039' }] });
  for (const change of [{ curtain: true }, { beforeCurtain: true }, { seat: 1 }, { sessionKey: 'room:B' }, { mode: 'local' }]) assert.deepEqual(planEffects(state(1), next, { ...context, ...change }), []);
});

test('same-session polling can combine versions when the public event tail is contiguous', () => {
  const before = state(3, { effects: [{ seq: 8, type: 'round', round: 1 }] });
  const next = state(7, { effects: [{ seq: 8, type: 'round', round: 1 }, { seq: 9, type: 'spell', p: 1, card: '01PZ052', targets: ['core0'] }, { seq: 10, type: 'damage', p: 0, target: 'core0', amount: 2 }] });
  const planned = planEffects(before, next, context);
  assert.deepEqual(planned.map(e => e.seq), [9, 10]);
  assert.ok(planned[0].delay < planned[1].delay);
});

test('truncated or discontinuous event tails are not replayed after polling gaps', () => {
  const before = state(1, { effects: [{ seq: 2, type: 'draw', p: 0, amount: 1 }] });
  assert.deepEqual(planEffects(before, state(5, { effects: [{ seq: 5, type: 'damage', p: 0, target: 'core0', amount: 2 }] }), context), []);
  assert.deepEqual(planEffects(before, state(2, { effects: [{ seq: 3, type: 'spell', p: 0, card: '01PZ052' }, { seq: 5, type: 'damage', p: 1, target: 'core1', amount: 2 }] }), context), []);
  assert.deepEqual(planEffects(state(1), state(4), context), []);
});

test('version gaps without a stable session identifier remain snapshots', () => {
  const next = state(5, { effects: [{ seq: 1, type: 'round', round: 2 }] });
  assert.deepEqual(planEffects(state(1), next, {}), []);
});

test('effects above the replay cursor play once and older retained events stay silent', () => {
  const before = state(2, { effects: [{ seq: 2, type: 'draw', p: 0, amount: 1 }] });
  const next = state(3, { effects: [{ seq: 1, type: 'round', round: 1 }, { seq: 2, type: 'draw', p: 0, amount: 1 }, { seq: 3, type: 'heal', p: 0, target: 'core0', amount: 1 }] });
  assert.deepEqual(planEffects(before, next, context).map(e => e.seq), [3]);
  assert.deepEqual(planEffects(before, next, { ...context, afterSeq: 3 }), []);
});

test('LIFO spell order, damage, death, and Last Breath summons retain public sequence order', () => {
  const events = [
    { seq: 1, type: 'spell', p: 1, card: '01PZ052', targets: ['a'] },
    { seq: 2, type: 'damage', p: 0, target: 'a', amount: 2 },
    { seq: 3, type: 'death', p: 0, uid: 'a', card: '01SI043' },
    { seq: 4, type: 'summon', p: 0, uid: 'spider', card: '01SI002' },
    { seq: 5, type: 'spell', p: 0, card: '01NX043', targets: ['core1'] },
    { seq: 6, type: 'damage', p: 1, target: 'core1', amount: 1 },
  ];
  const planned = planEffects(state(1), state(2, { effects: events }), context);
  assert.deepEqual(planned.map(e => e.seq), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(planned.filter(e => e.type === 'spell').map(e => e.card), ['01PZ052', '01NX043']);
  assert.ok(planned.every((e, i) => i === 0 || e.delay > planned[i - 1].delay));
  assert.ok(planned.at(-1).delay <= 720);
});

test('play followed by the matching summon schedules only one visible card flight', () => {
  const effects = [{ seq: 1, type: 'play', p: 0, uid: 'a', card: '01DE039' }, { seq: 2, type: 'summon', p: 0, uid: 'a', card: '01DE039' }];
  const planned = planEffects(state(1), state(2, { effects }), context);
  assert.equal(planned.filter(e => e.type === 'play').length, 1);
  assert.equal(planned.find(e => e.type === 'summon').quiet, true);
});

test('a hidden opposing hand never supplies a card identity to fallback planning', () => {
  const before = state(1); before.players[1].hand = [{ hidden: true }];
  const next = state(2); next.players[1].hand = [];
  assert.ok(!planEffects(before, next, { ...context, action: { type: 'play', uid: 'secret' } }).some(e => e.type === 'play'));
  next.effects = [{ seq: 1, type: 'play', p: 1, uid: 'public-card', card: '01DE039' }];
  assert.equal(planEffects(before, next, context).find(e => e.type === 'play').card, '01DE039');
});

test('max-health buffs do not produce fake healing popups', () => {
  const before = state(1), next = state(2);
  before.players[0].board = [unit('a', { hp: 1 })];
  next.players[0].board = [unit('a', { hp: 4, maxHp: 5 })];
  assert.ok(!planEffects(before, next, context).some(e => e.type === 'heal' || e.type === 'damage'));
  next.players[0].board[0].hp = 5;
  assert.equal(planEffects(before, next, context).find(e => e.type === 'heal').amount, 1);
});

test('actual public damage events preserve non-net damage even when healing occurred too', () => {
  const effects = [{ seq: 1, type: 'damage', p: 0, target: 'core0', amount: 3 }, { seq: 2, type: 'heal', p: 0, target: 'core0', amount: 3 }];
  assert.deepEqual(planEffects(state(1), state(2, { effects }), context).map(e => [e.type, e.amount]), [['damage', 3], ['heal', 3]]);
});

test('removal is animated as death only when death history confirms it', () => {
  const before = state(1), next = state(2);
  before.players[0].board = [unit('a')];
  assert.ok(!planEffects(before, next, context).some(e => e.type === 'death'));
  next.players[0].grave.push(unit('a', { hp: 0 }));
  assert.equal(planEffects(before, next, context).filter(e => e.type === 'death').length, 1);
});

test('Barrier grant and Barrier break have distinct presentation events', () => {
  const before = state(1), next = state(2);
  before.players[0].board = [unit('a', { kw: ['Barrier'] })];
  next.players[0].board = [unit('a', { removedKw: ['Barrier'] })];
  next.effects = [{ seq: 1, type: 'barrier', p: 0, target: 'a', uid: 'a' }];
  const planned = planEffects(before, next, context);
  assert.equal(planned.filter(e => e.type === 'barrier').length, 1);
  assert.ok(!planned.some(e => e.type === 'shield'));
});

test('winner events normalize the authoritative p field', () => {
  const next = state(2, { winner: 0, effects: [{ seq: 1, type: 'winner', p: 0 }] });
  assert.equal(planEffects(state(1), next, context).find(e => e.type === 'winner').winner, 0);
});

test('pure planning leaves both input states untouched', () => {
  const before = state(1), next = state(2, { effects: [{ seq: 1, type: 'spell', p: 0, card: '01PZ052', targets: ['core1'] }] });
  const saved = JSON.stringify([before, next]);
  planEffects(before, next, context);
  assert.equal(JSON.stringify([before, next]), saved);
});

test('a real engine unit play produces a public flight and a quiet matching summon', () => {
  const g = createGame(() => .25);
  Object.assign(g, { phase: 'main', round: 5, priority: 0, attacker: 0, tokens: [true, false] });
  Object.assign(g.players[0], { mana: 10, maxMana: 10, bank: 3, hand: [{ card: '01DE039', uid: 'motion-real-play', kwBonus: [], costDelta: 0, atkBonus: 0, hpBonus: 0 }] });
  const before = view(g, 0), after = view(act(g, 0, { type: 'play', uid: 'motion-real-play' }), 0);
  const planned = planEffects(before, after, context);
  assert.equal(planned.find(e => e.type === 'play').card, '01DE039');
  assert.equal(planned.find(e => e.type === 'summon').quiet, true);
});
