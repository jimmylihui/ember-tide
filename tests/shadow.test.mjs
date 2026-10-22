import test from 'node:test';
import assert from 'node:assert/strict';
import { CARDS, createGame, act, view, attack, keywords, cardSupported } from '../src/engine.js';
import { SHADOW_RULES } from '../src/shadow-rules.js';

const fixture = () => {
  const g = createGame(() => 0.25);
  Object.assign(g, { phase: 'main', round: 5, priority: 0, attacker: 0, roundOwner: 0, token: true, tokens: [true, false], passes: 0 });
  for (const s of g.players) Object.assign(s, { hand: [], board: [], mana: 10, maxMana: 10, bank: 3, grave: [], sharks: [] });
  return g;
};
const packet = (g, card, extra = {}) => ({ card, uid: `shadow-${++g.serial}`, costDelta: 0, atkBonus: 0, hpBonus: 0, kwBonus: [], puffcaps: 0, ...extra });
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
const dead = (g, p, id, extra = {}) => {
  const u = unit(g, p, id, extra);
  g.players[p].board.pop();
  const record = { ...structuredClone(u), hp: 0, deathRound: extra.deathRound ?? g.round, owner: p };
  g.players[p].grave.push(record);
  return record;
};
const finishStack = g => {
  while (g.stack.length && g.winner === null) g = act(g, g.priority, { type: 'pass' });
  return g;
};
const cast = (g, p, id, extra = {}) => {
  g.priority = p;
  const spell = hand(g, p, id);
  return act(g, p, { type: 'play', uid: spell.uid, ...extra });
};
const playUnit = (g, p, id, extra = {}, packetExtra = {}) => {
  g.priority = p;
  const h = hand(g, p, id, packetExtra);
  return act(g, p, { type: 'play', uid: h.uid, ...extra });
};
const kill = (g, p, uid) => finishStack(cast(g, p, '01SI001', { target: uid }));
const nextRound = g => {
  g = act(g, g.priority, { type: 'pass' });
  return act(g, g.priority, { type: 'pass' });
};
const beginAttack = (g, units) => {
  g.priority = 0; g.attacker = 0; g.token = true; g.tokens = [true, false];
  return act(g, 0, { type: 'attack', units });
};
const finishUnblocked = g => {
  g = act(g, 1, { type: 'block', assignments: {} });
  while (g.combat && g.winner === null) g = act(g, g.priority, { type: 'pass' });
  return g;
};

test('all Shadow Isles catalog entries have rule implementations after integration', () => {
  for (const c of Object.values(CARDS).filter(c => c.region === 'ShadowIsles')) assert.ok(cardSupported(c.id), `${c.id} ${c.nameEn}`);
  assert.ok(Object.values(SHADOW_RULES).every(rule => typeof rule.note === 'string' && rule.note.length));
});

test('Ravenous Butcher and Ancient Crocolith pay selected sacrifice costs before summon', () => {
  let g = fixture();
  const sacrifice = unit(g, 0, '01SI043');
  g = playUnit(g, 0, '01SI011', { sacrifices: [sacrifice.uid] });
  assert.ok(g.players[0].board.some(u => u.card === '01SI011'));
  assert.ok(g.players[0].board.some(u => u.card === '01SI002'));
  assert.equal(g.players[0].roundDeaths, 1);
  g = fixture();
  const first = unit(g, 0, '01SI002'), second = unit(g, 0, '01SI002');
  const croc = hand(g, 0, '01SI057');
  assert.throws(() => act(g, 0, { type: 'play', uid: croc.uid, sacrifices: [first.uid] }));
  assert.throws(() => act(g, 0, { type: 'play', uid: croc.uid, sacrifices: [first.uid, first.uid] }));
  g = act(g, 0, { type: 'play', uid: croc.uid, sacrifices: [first.uid, second.uid] });
  assert.equal(g.players[0].board.length, 1);
  assert.equal(g.players[0].board[0].card, '01SI057');
});

test('Scuttlegeist discounts itself by allied deaths without spending spell mana', () => {
  let g = fixture();
  g.players[0].unitsDied = 8;
  g = playUnit(g, 0, '01SI005');
  assert.equal(g.players[0].mana, 8);
  assert.equal(g.players[0].bank, 3);
});

test('Oblivious Islander grants an allied hand unit Ephemeral and a cost reduction', () => {
  let g = fixture();
  const target = hand(g, 0, '01PZ059');
  g = playUnit(g, 0, '01SI012', { target: target.uid });
  const changed = g.players[0].hand.find(h => h.uid === target.uid);
  assert.ok(changed.kwBonus.includes('Ephemeral'));
  assert.equal(view(g, 0).players[0].hand.find(h => h.uid === target.uid).cost, 2);
});

test('Mistwraith buffs other copies in play, hand, deck, and future generated copies', () => {
  let g = fixture();
  const future = hand(g, 0, '01SI014');
  g.players[0].deck.unshift(packet(g, '01SI014'));
  g = playUnit(g, 0, '01SI014');
  assert.equal(g.players[0].board[0].atk, 2);
  assert.equal(g.players[0].hand.find(h => h.uid === future.uid).atkBonus, 1);
  assert.equal(g.players[0].deck[0].atkBonus, 1);
  g.priority = 0;
  g = act(g, 0, { type: 'play', uid: future.uid });
  assert.deepEqual(g.players[0].board.map(u => u.atk), [3, 3]);
  g = playUnit(g, 0, '01SI016');
  assert.deepEqual(g.players[0].board.filter(u => u.card === '01SI014').map(u => u.atk), [4, 4, 4]);
});

test('Wraithcaller Allegiance checks the top deck card and summons a Mistwraith', () => {
  let g = fixture();
  g.players[0].deck[0] = packet(g, '01SI002');
  g = playUnit(g, 0, '01SI016');
  assert.ok(g.players[0].board.some(u => u.card === '01SI014'));
  g = fixture();
  g.players[0].deck[0] = packet(g, '01DE039');
  g = playUnit(g, 0, '01SI016');
  assert.equal(g.players[0].board.length, 1);
});

test('Possession transfers an enemy follower until round end without killing it', () => {
  let g = fixture();
  const enemy = unit(g, 1, '01PZ059');
  g = finishStack(cast(g, 0, '01SI006', { target: enemy.uid }));
  assert.ok(g.players[0].board.some(u => u.uid === enemy.uid));
  assert.equal(g.players[1].board.length, 0);
  g = nextRound(g);
  assert.ok(g.players[1].board.some(u => u.uid === enemy.uid));
  assert.equal(g.players[0].grave.length, 0);
});

test('Splinter Soul makes a 1/1 exact copy retaining keywords and adding Ephemeral', () => {
  let g = fixture();
  const original = unit(g, 0, '01PZ059', { atk: 7, hp: 8, maxHp: 8, kw: ['Challenger'] });
  g = finishStack(cast(g, 0, '01SI028', { target: original.uid }));
  const copy = g.players[0].board.find(u => u.uid !== original.uid);
  assert.equal(copy.atk, 1);
  assert.equal(copy.hp, 1);
  assert.ok(keywords(copy, g).includes('Challenger'));
  assert.ok(keywords(copy, g).includes('Ephemeral'));
});

test('Spectral Matron exact-copies a hand unit while Fading Memories creates a base copy', () => {
  let g = fixture();
  const original = hand(g, 0, '01PZ059', { atkBonus: 2, hpBonus: 3, kwBonus: ['Challenger'] });
  g = playUnit(g, 0, '01SI044', { target: original.uid });
  const summoned = g.players[0].board.find(u => u.card === '01PZ059');
  assert.equal(summoned.atk, 4);
  assert.equal(summoned.maxHp, 8);
  assert.ok(keywords(summoned, g).includes('Ephemeral'));
  assert.ok(g.players[0].hand.some(h => h.uid === original.uid));
  g = fixture();
  const buffed = unit(g, 1, '01PZ059', { atk: 7, hp: 8, maxHp: 8, kw: ['Challenger'] });
  g = cast(g, 0, '01SI047', { target: buffed.uid });
  const generated = g.players[0].hand.find(h => h.card === '01PZ059');
  assert.equal(generated.atkBonus, 0);
  assert.equal(generated.hpBonus, 0);
  assert.ok(generated.kwBonus.includes('Ephemeral'));
  assert.ok(!generated.kwBonus.includes('Challenger'));
});

test('The Rekindler revives the strongest dead champion with ordinary buffs reset', () => {
  let g = fixture();
  dead(g, 0, '01DE012', { atk: 99, hp: 0, maxHp: 99 });
  dead(g, 0, '01NX038');
  g = playUnit(g, 0, '01SI020');
  const revived = g.players[0].board.find(u => u.card === '01NX038');
  assert.ok(revived);
  assert.equal(revived.atk, 6);
  assert.equal(g.players[0].grave.length, 2);
});

test('The Harrowing revives up to six strongest dead allies with Ephemeral', () => {
  let g = fixture();
  for (const id of ['01SI002', '01DE039', '01DE011', '01PZ059', '01DE028', '01FR026', '01NX051']) dead(g, 0, id);
  g = finishStack(cast(g, 0, '01SI003'));
  assert.equal(g.players[0].board.length, 6);
  assert.ok(g.players[0].board.every(u => keywords(u, g).includes('Ephemeral')));
  assert.ok(!g.players[0].board.some(u => u.card === '01SI002'));
  assert.equal(g.players[0].grave.length, 7);
});

test("Mist's Call revives only a random ally that died during the current round", () => {
  let g = fixture();
  dead(g, 0, '01NX051', { deathRound: 4 });
  const current = dead(g, 0, '01PZ059');
  g = finishStack(cast(g, 0, '01SI046'));
  assert.equal(g.players[0].board.length, 1);
  assert.equal(g.players[0].board[0].card, current.card);
});

test('The Undying schedules self-revival and accumulates only its own death buffs', () => {
  let g = fixture();
  const undying = unit(g, 0, '01SI041', { kw: ['Ephemeral'], atk: 12, maxHp: 12, hp: 12 });
  g = kill(g, 0, undying.uid);
  assert.equal(g.players[0].board.length, 0);
  g = nextRound(g);
  let revived = g.players[0].board.find(u => u.card === '01SI041');
  assert.ok(revived);
  assert.equal(revived.atk, 3);
  assert.equal(revived.maxHp, 3);
  assert.ok(!keywords(revived, g).includes('Ephemeral'));
  g = kill(g, 0, revived.uid);
  g = nextRound(g);
  revived = g.players[0].board.find(u => u.card === '01SI041');
  assert.equal(revived.atk, 4);
  assert.equal(revived.maxHp, 4);
});

test('Chronicler revival resets ordinary buffs while preserving the dead card record', () => {
  let g = fixture();
  const target = unit(g, 0, '01PZ059', { atk: 9, hp: 9, maxHp: 9, kw: ['Ephemeral'] });
  g = playUnit(g, 0, '01SI032', { target: target.uid });
  const revived = g.players[0].board.find(u => u.card === '01PZ059');
  assert.equal(revived.atk, 2);
  assert.equal(revived.maxHp, 5);
  assert.ok(!keywords(revived, g).includes('Ephemeral'));
  assert.equal(g.players[0].grave.length, 1);
});

test('Shark Chariot queues after death and revives attacking with an Ephemeral ally', () => {
  let g = fixture();
  const shark = unit(g, 0, '01SI021');
  g = kill(g, 0, shark.uid);
  assert.equal(g.players[0].sharks.length, 1);
  const rider = unit(g, 0, '01SI024');
  g = beginAttack(g, [rider.uid]);
  assert.equal(g.players[0].sharks.length, 0);
  const returning = g.players[0].board.find(u => u.card === '01SI021');
  assert.ok(returning);
  assert.ok(g.combat.lanes.some(lane => lane.attacker === returning.uid));
  g = finishUnblocked(g);
  assert.equal(g.players[0].sharks.length, 1);
});

test('Elise summons an attacking Spiderling and levels only at round start', () => {
  let g = fixture();
  const elise = unit(g, 0, '01SI053');
  g = beginAttack(g, [elise.uid]);
  const spider = g.players[0].board.find(u => u.card === '01SI002');
  assert.ok(g.combat.lanes.some(lane => lane.attacker === spider.uid));
  g = finishUnblocked(g);
  unit(g, 0, '01SI002'); unit(g, 0, '01SI002');
  assert.equal(g.players[0].board.find(u => u.uid === elise.uid).card, '01SI053');
  g = nextRound(g);
  assert.equal(g.players[0].board.find(u => u.uid === elise.uid).card, '01SI053T2');
  const ally = g.players[0].board.find(u => u.card === '01SI002');
  assert.ok(keywords(ally, g).includes('Challenger'));
  assert.ok(keywords(ally, g).includes('Fearsome'));
});

test('Kalista upgrades after seeing three allied deaths', () => {
  let g = fixture();
  const kalista = unit(g, 0, '01SI030', { seenDeaths: 2 });
  const ally = unit(g, 0, '01SI002');
  g = kill(g, 0, ally.uid);
  assert.equal(g.players[0].board.find(u => u.uid === kalista.uid).card, '01SI030T2');
});

test('leveled Kalista revives a bonded attacking follower and redirects damage to it', () => {
  let g = fixture();
  const kalista = unit(g, 0, '01SI030T2', { baseCard: '01SI030' });
  dead(g, 0, '01PZ059');
  g = beginAttack(g, [kalista.uid]);
  const queen = g.players[0].board.find(u => u.uid === kalista.uid);
  const bonded = g.players[0].board.find(u => u.uid === queen.flags.bond);
  assert.ok(bonded && keywords(bonded, g).includes('Ephemeral'));
  assert.ok(g.combat.lanes.some(lane => lane.attacker === bonded.uid));
  g = cast(g, 1, '01FR001', { target: bonded.uid });
  g = cast(g, 1, '01PZ052', { target: kalista.uid });
  g = act(g, 1, { type: 'block', assignments: {} });
  g = finishStack(g);
  assert.equal(g.players[0].board.find(u => u.uid === kalista.uid).hp, 5);
  assert.equal(g.players[0].board.find(u => u.uid === bonded.uid).hp, 3);
});

test('Thresh counts deaths on both sides and pulls another champion from deck before hand', () => {
  let g = fixture();
  const thresh = unit(g, 0, '01SI052', { seenDeaths: 5 });
  const enemy = unit(g, 1, '01SI002');
  g = kill(g, 0, enemy.uid);
  assert.equal(g.players[0].board.find(u => u.uid === thresh.uid).card, '01SI052T1');
  g.players[0].deck = [packet(g, '01SI052'), packet(g, '01NX038')];
  const inHand = hand(g, 0, '01DE012');
  g = beginAttack(g, [thresh.uid]);
  const darius = g.players[0].board.find(u => u.card === '01NX038');
  assert.ok(darius);
  assert.ok(g.combat.lanes.some(lane => lane.attacker === darius.uid));
  assert.ok(g.players[0].hand.some(h => h.uid === inHand.uid));
  assert.ok(g.players[0].deck.some(h => h.card === '01SI052'));
});

test('Hecarim counts summoned attacking Riders and permanently grants the Nexus aura on level', () => {
  let g = fixture();
  const hecarim = unit(g, 0, '01SI042');
  g.players[0].ephemeralAttacks = 5;
  g = beginAttack(g, [hecarim.uid]);
  const upgraded = g.players[0].board.find(u => u.uid === hecarim.uid);
  assert.equal(upgraded.card, '01SI042T1');
  assert.equal(g.players[0].ephemeralAttacks, 7);
  assert.equal(g.players[0].ephemeralAura, 3);
  assert.ok(g.players[0].board.filter(u => u.card === '01SI024').every(u => attack(u, g) === CARDS['01SI024'].atk + 3));
  g = finishUnblocked(g);
  g = kill(g, 0, hecarim.uid);
  const rider = unit(g, 0, '01SI024');
  assert.equal(attack(rider, g), CARDS['01SI024'].atk + 3);
});

test("Warden's Prey generates another cheap Last Breath follower from the full pool", () => {
  let g = fixture();
  const prey = unit(g, 0, '01SI026');
  g = kill(g, 0, prey.uid);
  const generated = g.players[0].hand[0];
  const c = CARDS[generated.card];
  assert.ok(c.collectible && c.kind === 'unit' && !c.hero && c.cost <= 3 && c.kw.includes('LastBreath'));
  assert.notEqual(c.id, '01SI026');
});

test('Fresh Offerings summons Vilemaw whose Fearsome aura affects only other allies', () => {
  let g = fixture();
  g.players[0].roundDeaths = 3;
  const fearsome = unit(g, 0, '01SI039');
  const ordinary = unit(g, 0, '01PZ059');
  g = finishStack(cast(g, 0, '01SI027'));
  const vilemaw = g.players[0].board.find(u => u.card === '01SI027T1');
  assert.ok(vilemaw);
  assert.equal(attack(g.players[0].board.find(u => u.uid === fearsome.uid), g), CARDS[fearsome.card].atk + 1);
  assert.equal(attack(g.players[0].board.find(u => u.uid === ordinary.uid), g), 2);
  assert.equal(attack(vilemaw, g), 6);
});

test('Ethereal Remitter sacrifices its selected ally and summons a follower costing two more', () => {
  let g = fixture();
  const target = unit(g, 0, '01SI039');
  g = playUnit(g, 0, '01SI058', { target: target.uid });
  assert.ok(!g.players[0].board.some(u => u.uid === target.uid));
  const created = g.players[0].board.find(u => u.card !== '01SI058');
  assert.ok(created);
  assert.equal(CARDS[created.card].cost, 4);
  assert.equal(CARDS[created.card].hero, false);
});

test('silencing a Detain captor removes its capture attachment without releasing the victim', () => {
  let g = fixture();
  const captor = unit(g, 0, '01PZ059'), victim = unit(g, 1, '01DE039');
  g = finishStack(cast(g, 0, '01DE025', { target: captor.uid, target2: victim.uid }));
  assert.equal(g.players[1].board.length, 0);
  g = cast(g, 0, '01DE050', { target: captor.uid });
  assert.equal(g.players[1].board.length, 0);
  g.players[0].mana = 10; g.players[0].bank = 3;
  g = kill(g, 0, captor.uid);
  assert.equal(g.players[1].board.length, 0);
});

test('transforming a captor removes its capture attachment without releasing the victim', () => {
  let g = fixture();
  const captor = unit(g, 0, '01PZ059'), victim = unit(g, 1, '01DE039');
  const shape = unit(g, 0, '01DE039');
  g = finishStack(cast(g, 0, '01DE025', { target: captor.uid, target2: victim.uid }));
  g = finishStack(cast(g, 0, '01PZ005', { target: captor.uid, target2: shape.uid }));
  assert.equal(g.players[1].board.length, 0);
  assert.equal(g.players[0].board.find(u => u.uid === captor.uid).card, '01DE039');
  g.players[0].mana = 10; g.players[0].bank = 3;
  g = kill(g, 0, captor.uid);
  assert.equal(g.players[1].board.length, 0);
});

test('exact copies of a captor each retain a capture attachment that releases on leaving play', () => {
  let g = fixture();
  const captor = unit(g, 0, '01PZ059'), victim = unit(g, 1, '01DE039');
  g = finishStack(cast(g, 0, '01DE025', { target: captor.uid, target2: victim.uid }));
  g = finishStack(cast(g, 0, '01IO024', { target: captor.uid }));
  assert.equal(g.players[0].board.length, 3);
  assert.ok(g.players[0].board.every(u => u.captured?.length === 1));
  g.players[0].mana = 10; g.players[0].bank = 3;
  g = kill(g, 0, captor.uid);
  assert.equal(g.players[1].board.length, 1);
  g = nextRound(g);
  assert.equal(g.players[1].board.filter(u => u.card === '01DE039').length, 3);
});

test('a unit released by its captor dying does not witness that already-occurred death', () => {
  let g = fixture();
  const captor = unit(g, 0, '01PZ059'), observer = unit(g, 0, '01SI038');
  g = finishStack(cast(g, 0, '01DE025', { target: captor.uid, target2: observer.uid }));
  g.players[0].mana = 10; g.players[0].bank = 3;
  g = kill(g, 0, captor.uid);
  assert.ok(g.players[0].board.some(u => u.card === '01SI038'));
  assert.equal(g.players[1].hp, 20);
});

test('an Ephemeral unit stolen by Possession dies under its current controller before returning', () => {
  let g = fixture();
  const shark = unit(g, 1, '01SI021');
  g = finishStack(cast(g, 0, '01SI006', { target: shark.uid }));
  g = nextRound(g);
  assert.equal(g.players[0].grave.filter(u => u.card === '01SI021').length, 1);
  assert.equal(g.players[1].grave.filter(u => u.card === '01SI021').length, 0);
  assert.equal(g.players[0].sharks.length, 1);
});

test('reviving an already-leveled Jinx does not fire a new level-up effect', () => {
  let g = fixture();
  g.players[0].levels['01PZ040'] = true;
  dead(g, 0, '01PZ040T1', { baseCard: '01PZ040' });
  hand(g, 0, '01PZ059');
  g = playUnit(g, 0, '01SI020');
  assert.ok(g.players[0].board.some(u => u.card === '01PZ040T1'));
  assert.ok(!g.players[0].hand.some(h => h.card === '01PZ040T2'));
});
