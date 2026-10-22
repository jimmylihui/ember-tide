import test from 'node:test';
import assert from 'node:assert/strict';
import { CARDS, createGame, act, view, cardSupported } from '../src/engine.js';
import { ADVANCED_RULES } from '../src/advanced-rules.js';

const fixture = () => {
  const g = createGame(() => 0.25);
  Object.assign(g, { phase: 'main', round: 5, priority: 0, attacker: 0, roundOwner:0, tokens:[true,false], token: true, passes: 0 });
  for (const s of g.players) Object.assign(s, { hand: [], board: [], mana: 10, maxMana: 10, bank: 3 });
  return g;
};
const packet = (g, card, extra = {}) => ({ card, uid: `test-${++g.serial}`, costDelta: 0, atkBonus: 0, hpBonus: 0, kwBonus: [], puffcaps: 0, ...extra });
const hand = (g, p, card, extra) => {
  const h = packet(g, card, extra);
  g.players[p].hand.push(h);
  return h;
};
const unit = (g, p, id, extra = {}) => {
  const c = CARDS[id];
  const u = { ...packet(g, id), baseCard: id, atk: c.atk, hp: c.hp, maxHp: c.hp, tempAtk: 0, tempHp: 0, kw: [], tempKw: [], removedKw: [], silenced: false, stunned: false, frozen: false, strikes: 0, kills: 0, damageTaken: 0, seenDeaths: 0, level: c.hero && !c.collectible, flags: {}, summonedRound: g.round, ...extra };
  g.players[p].board.push(u);
  return u;
};
const finishStack = g => {
  while (g.stack.length && g.winner === null) g = act(g, g.priority, { type: 'pass' });
  return g;
};
const emptyAttack = (g, uid) => {
  g = act(g, 0, { type: 'attack', units: [uid] });
  g = act(g, 1, { type: 'block', assignments: {} });
  while (g.combat && g.winner === null) g = act(g, g.priority, { type: 'pass' });
  return g;
};
const nextRound = g => {
  g = act(g, g.priority, { type: 'pass' });
  return act(g, g.priority, { type: 'pass' });
};
const mushroomCount = (g, p) => g.players[p].deck.reduce((sum, h) => sum + (h.puffcaps || 0), 0);

test('advanced rule entries reference real catalog cards and completed random pools are playable', () => {
  assert.ok(Object.keys(ADVANCED_RULES).every(id => CARDS[id]));
  for (const id of ['01IO041', '01IO041T1', '01IO054', '01IO041T2', '01PZ016']) assert.equal(cardSupported(id), true, id);
});

test('Mushroom Cloud plants five attached traps and advances Teemo from global planted count', () => {
  let g = fixture();
  const teemo = unit(g, 0, '01PZ008');
  g.players[0].puffcapsPlanted = 10;
  const spell = hand(g, 0, '01PZ010');
  g = act(g, 0, { type: 'play', uid: spell.uid });
  assert.equal(mushroomCount(g, 1), 5);
  assert.equal(g.players[0].puffcapsPlanted, 15);
  assert.equal(g.players[0].board.find(u => u.uid === teemo.uid).card, '01PZ008T2');
});

test('leveled Teemo doubles existing puffcaps, with at least five newly planted', () => {
  let g = fixture();
  const teemo = unit(g, 0, '01PZ008T2', { baseCard: '01PZ008' });
  g.players[1].deck[0].puffcaps = 7;
  g = emptyAttack(g, teemo.uid);
  assert.equal(mushroomCount(g, 1), 14);
  g = fixture();
  const emptyTeemo = unit(g, 0, '01PZ008T2', { baseCard: '01PZ008' });
  g = emptyAttack(g, emptyTeemo.uid);
  assert.equal(mushroomCount(g, 1), 5);
});

test('drawing an attached puffcap card damages its owner and consumes the traps', () => {
  let g = fixture();
  g.players[1].deck[0].puffcaps = 3;
  const top = g.players[1].deck[0].uid;
  g = nextRound(g);
  assert.equal(g.players[1].hp, 17);
  assert.equal(g.players[1].hand.find(h => h.uid === top).puffcaps, 0);
});

test('Ezreal Nexus Strike creates a fleeting Mystic Shot', () => {
  let g = fixture();
  const ezreal = unit(g, 0, '01PZ036');
  g = emptyAttack(g, ezreal.uid);
  assert.ok(g.players[0].hand.some(h => h.card === '01PZ052' && h.fleeting));
});

test('leveled Ezreal distinguishes enemy unit targeting from Nexus targeting', () => {
  let g = fixture();
  unit(g, 0, '01PZ036T1', { baseCard: '01PZ036' });
  const enemy = unit(g, 1, '01PZ059');
  const shot = hand(g, 0, '01PZ052');
  g = act(g, 0, { type: 'play', uid: shot.uid, target: enemy.uid });
  assert.equal(g.players[1].hp, 18);
  g = finishStack(g);
  g.priority = 0;
  const edge = hand(g, 0, '01NX043');
  g = act(g, 0, { type: 'play', uid: edge.uid, target: 'core1' });
  assert.equal(g.players[1].hp, 17);
});

test('Heimerdinger creates the matching cost turret for zero mana with Fleeting', () => {
  let g = fixture();
  const heimer = unit(g, 0, '01PZ056');
  const buff = hand(g, 0, '01NX027');
  g = act(g, 0, { type: 'play', uid: buff.uid, target: heimer.uid });
  const turret = g.players[0].hand.find(h => h.card === '01PZ056T4');
  assert.ok(turret?.fleeting);
  assert.equal(view(g, 0).players[0].hand.find(h => h.uid === turret.uid).cost, 0);
});

test('leveled Heimerdinger grants created T-Hex +1/+1 and zero cost', () => {
  let g = fixture();
  unit(g, 0, '01PZ056T10', { baseCard: '01PZ056' });
  const progress = hand(g, 0, '01PZ049');
  g = act(g, 0, { type: 'play', uid: progress.uid });
  const hex = g.players[0].hand.find(h => h.card === '01PZ015');
  assert.ok(hex);
  assert.equal(hex.atkBonus, 1);
  assert.equal(hex.hpBonus, 1);
  const manaBefore = g.players[0].mana;
  g = act(g, 0, { type: 'play', uid: hex.uid });
  const summoned = g.players[0].board.find(u => u.card === '01PZ015');
  assert.equal(summoned.atk, 9);
  assert.equal(summoned.maxHp, 9);
  assert.equal(g.players[0].mana, manaBefore);
});

test('Heimerdinger levels after seeing twelve total Tech power summoned', () => {
  let g = fixture();
  const heimer = unit(g, 0, '01PZ056');
  for (const id of ['01PZ056T6', '01PZ056T6']) {
    g.priority = 0;
    const turret = hand(g, 0, id, { costOverride: 0 });
    g = act(g, 0, { type: 'play', uid: turret.uid });
  }
  assert.equal(g.players[0].board.find(u => u.uid === heimer.uid).card, '01PZ056T10');
});

test('Jinx levels on an empty hand and creates one rocket in that round', () => {
  let g = fixture();
  const jinx = unit(g, 0, '01PZ040');
  const buff = hand(g, 0, '01NX027');
  g = act(g, 0, { type: 'play', uid: buff.uid, target: jinx.uid });
  assert.equal(g.players[0].board[0].card, '01PZ040T1');
  const rocket = g.players[0].hand.find(h => h.card === '01PZ040T2');
  assert.ok(rocket);
  g = act(g, 0, { type: 'play', uid: rocket.uid });
  assert.equal(g.players[0].hand.length, 0);
  g = finishStack(g);
  assert.equal(g.players[1].hp, 17);
});

test('leveled Jinx draws an additional card at round start', () => {
  let g = fixture();
  unit(g, 0, '01PZ040T1', { baseCard: '01PZ040', flags: { jinxRocketRound: 5, jinxHandEmpty: false } });
  hand(g, 0, '01PZ059');
  g = nextRound(g);
  assert.equal(g.players[0].hand.length, 3);
  assert.equal(g.players[1].hand.length, 1);
});

test('Get Excited discards as a cost, summons Chompers, and levels Jinx before resolution', () => {
  let g = fixture();
  unit(g, 0, '01PZ040');
  const spell = hand(g, 0, '01PZ039');
  const chompers = hand(g, 0, '01PZ012');
  assert.throws(() => act(g, 0, { type: 'play', uid: spell.uid, target: 'core1' }));
  g = act(g, 0, { type: 'play', uid: spell.uid, target: 'core1', discards: [chompers.uid] });
  assert.ok(g.players[0].board.some(u => u.card === '01PZ012'));
  assert.ok(g.players[0].board.some(u => u.card === '01PZ040T1'));
  assert.ok(g.players[0].hand.some(h => h.card === '01PZ040T2'));
  assert.equal(g.players[1].hp, 20);
  g = finishStack(g);
  assert.equal(g.players[1].hp, 17);
});

test('Rummage discards two selected cards, triggers their effects, then draws two', () => {
  let g = fixture();
  const rummage = hand(g, 0, '01PZ001');
  const jury = hand(g, 0, '01PZ028');
  const chompers = hand(g, 0, '01PZ012');
  g = act(g, 0, { type: 'play', uid: rummage.uid, discards: [jury.uid, chompers.uid] });
  assert.deepEqual(g.players[0].board.map(u => u.card).sort(), ['01PZ012', '01PZ032']);
  assert.equal(g.players[0].hand.length, 2);
});

test('Rummage requires two discards when available, or its only one remaining card', () => {
  let g = fixture();
  let spell = hand(g, 0, '01PZ001');
  let discard = hand(g, 0, '01PZ059');
  hand(g, 0, '01PZ018');
  assert.throws(() => act(g, 0, { type: 'play', uid: spell.uid, discards: [discard.uid] }));
  g = fixture();
  spell = hand(g, 0, '01PZ001');
  discard = hand(g, 0, '01PZ059');
  g = act(g, 0, { type: 'play', uid: spell.uid, discards: [discard.uid] });
  assert.equal(g.players[0].hand.length, 1);
});

test('Progress Day reduces only its three drawn cards by one', () => {
  let g = fixture();
  const existing = hand(g, 0, '01PZ059');
  const spell = hand(g, 0, '01PZ049');
  g = act(g, 0, { type: 'play', uid: spell.uid });
  assert.equal(g.players[0].hand.find(h => h.uid === existing.uid).costDelta, 0);
  const drawn = g.players[0].hand.filter(h => h.uid !== existing.uid);
  assert.equal(drawn.length, 3);
  assert.ok(drawn.every(h => h.costDelta === -1));
});

test('Counterfeit Copies preserves hand buffs and reductions with fresh deck identities', () => {
  let g = fixture();
  const original = hand(g, 0, '01PZ059', { costDelta: -1, atkBonus: 2, hpBonus: 3 });
  const spell = hand(g, 0, '01PZ046');
  const before = new Set(g.players[0].deck.map(h => h.uid));
  g = act(g, 0, { type: 'play', uid: spell.uid, target: original.uid });
  const copies = g.players[0].deck.filter(h => !before.has(h.uid));
  assert.equal(copies.length, 4);
  assert.equal(new Set(copies.map(h => h.uid)).size, 4);
  assert.ok(copies.every(h => h.card === original.card && h.costDelta === -1 && h.atkBonus === 2 && h.hpBonus === 3));
});

test('Ezreal champion spell resolves as Mystic Shot and shuffles a base Ezreal', () => {
  let g = fixture();
  unit(g, 0, '01PZ036');
  const duplicate = hand(g, 0, '01PZ036');
  const before = g.players[0].deck.length;
  g = act(g, 0, { type: 'play', uid: duplicate.uid, target: 'core1' });
  g = finishStack(g);
  assert.equal(g.players[1].hp, 18);
  assert.equal(g.players[0].deck.length, before + 1);
  assert.ok(g.players[0].deck.some(h => h.card === '01PZ036'));
});

test('Augmented Experimenter can discard and draw without an enemy target', () => {
  let g = fixture();
  const scientist = hand(g, 0, '01PZ013');
  hand(g, 0, '01PZ028');
  hand(g, 0, '01PZ059');
  g = act(g, 0, { type: 'play', uid: scientist.uid });
  g = finishStack(g);
  assert.equal(g.players[0].hand.length, 3);
  assert.ok(g.players[0].board.some(u => u.card === '01PZ032'));
  assert.equal(g.players[1].hp, 20);
});

test('Zaunite Urchin optional discard draws exactly when a card is discarded', () => {
  let g = fixture();
  let urchin = hand(g, 0, '01PZ045');
  g = act(g, 0, { type: 'play', uid: urchin.uid, discards: [] });
  assert.equal(g.players[0].hand.length, 0);
  g = fixture();
  urchin = hand(g, 0, '01PZ045');
  const discarded = hand(g, 0, '01PZ059');
  g = act(g, 0, { type: 'play', uid: urchin.uid, discards: [discarded.uid] });
  assert.equal(g.players[0].hand.length, 1);
});

test('two leveled Jinx copies each see the same empty-hand transition', () => {
  let g = fixture();
  const first = unit(g, 0, '01PZ040T1', { baseCard: '01PZ040' });
  unit(g, 0, '01PZ040T1', { baseCard: '01PZ040' });
  const buff = hand(g, 0, '01NX027');
  g = act(g, 0, { type: 'play', uid: buff.uid, target: first.uid });
  assert.equal(g.players[0].hand.filter(h => h.card === '01PZ040T2').length, 2);
});
