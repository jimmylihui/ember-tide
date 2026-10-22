// Presentation only: authoritative game state never waits for these effects.
// DOM contract: data-unit, data-hand, data-core, data-lane, .arena, .spell-stack.
const maxSeq = state => Math.max(0, ...(state?.effects || []).map(e => Number.isInteger(e.seq) ? e.seq : 0));
const units = state => new Map((state?.players || []).flatMap((p, side) => (p.board || []).map(u => [u.uid, { ...u, p: side }])));
const keywordsOf = (u, cards) => [...(cards?.[u.card]?.kw || []), ...(u.kw || []), ...(u.tempKw || [])].filter(k => !(u.removedKw || []).includes(k));
const ref = value => typeof value === 'string' ? value : value?.uid || value?.u?.uid || (value?.core ? `core${value.p}` : null);
const allowed = new Set(['play', 'summon', 'spell', 'attack', 'block', 'strike', 'damage', 'heal', 'death', 'level', 'recall', 'round', 'winner', 'shield', 'barrier', 'buff', 'stun', 'freeze', 'capture', 'obliterate', 'transform', 'draw', 'burn']);
const STEP = { play: 110, summon: 55, spell: 145, attack: 90, block: 90, strike: 75, damage: 45, heal: 45, death: 90, level: 180, round: 110, winner: 100 };

/** Pure public-state transition planner. Version gaps/reconnects are snapshots. */
export function planEffects(before, next, context = {}) {
  if (!before || !next || !Number.isInteger(before.version) || next.version <= before.version) return [];
  if (before.schema !== next.schema || context.curtain || context.beforeCurtain || context.skip) return [];
  if (context.beforeSeat !== undefined && context.seat !== undefined && context.beforeSeat !== context.seat) return [];
  if (context.beforeMode && context.mode && context.beforeMode !== context.mode) return [];
  if (context.beforeSessionKey !== undefined && context.sessionKey !== context.beforeSessionKey) return [];
  const cutoff = Math.max(maxSeq(before), context.afterSeq ?? -1);
  const fresh = (next.effects || []).filter(e => Number.isInteger(e.seq) && e.seq > cutoff).sort((a, b) => a.seq - b.seq);
  if (fresh.length && (fresh.length > 64 || fresh[0].seq !== cutoff + 1 || fresh.some((e, i) => i > 0 && e.seq !== fresh[i - 1].seq + 1))) return [];
  // Polling may combine several actions. Replay only a complete contiguous tail
  // within the same identified session; reconnect snapshots remain silent.
  if (next.version > before.version + 1 && (!context.sessionKey || context.beforeSessionKey !== context.sessionKey || !fresh.length)) return [];
  const previous = units(before), current = units(next);
  const effects = [], keys = new Set();
  const add = effect => {
    if (!allowed.has(effect.type)) return;
    const key = effect.seq === undefined ? `${effect.type}:${effect.uid || effect.target || effect.round || effect.card || ''}` : `seq:${effect.seq}`;
    if (keys.has(key)) return;
    keys.add(key);
    effects.push({ ...effect, key });
  };
  for (const raw of fresh) {
    if (!Number.isInteger(raw.seq) || raw.seq <= cutoff || !allowed.has(raw.type)) continue;
    const e = { ...raw };
    if (e.type === 'winner') e.winner = raw.winner ?? raw.p ?? next.winner;
    if (e.target) e.target = ref(e.target);
    if (e.targets) e.targets = e.targets.map(ref).filter(Boolean);
    if ((e.type === 'damage' || e.type === 'heal') && !(Number(e.amount) > 0)) continue;
    add(e);
  }
  const has = (type, uid) => effects.some(e => e.type === type && (uid === undefined || (e.uid || e.target) === uid));
  const touched = target => effects.some(e => ['damage', 'heal'].includes(e.type) && e.target === target);
  const publicHand = (before.players || []).flatMap((p, side) => (p.hand || []).filter(h => !h.hidden && h.card).map(h => ({ ...h, p: side })));
  const played = context.action?.type === 'play' && publicHand.find(h => h.uid === context.action.uid);
  if (played && !has('play', played.uid)) add({ type: 'play', p: played.p, uid: played.uid, card: played.card, targets: [context.action.target, context.action.target2, ...(context.action.targets || [])].filter(Boolean) });
  for (const [uid, u] of current) {
    const old = previous.get(uid);
    if (!old) {
      if (!has('summon', uid) && !has('play', uid)) add({ type: 'summon', p: u.p, uid, card: u.card });
      continue;
    }
    if ((u.level && !old.level || u.card !== old.card && context.cards?.[u.card]?.hero) && !has('level', uid)) add({ type: 'level', p: u.p, uid, card: u.card });
    if (!touched(uid)) {
      // Missing-health changes distinguish damage/healing from max-health buffs.
      const missingBefore = (old.maxHp ?? old.hp) - old.hp;
      const missingAfter = (u.maxHp ?? u.hp) - u.hp;
      const delta = missingAfter - missingBefore;
      if (delta > 0) add({ type: 'damage', p: u.p, target: uid, amount: delta });
      else if (delta < 0) add({ type: 'heal', p: u.p, target: uid, amount: -delta });
    }
    if (keywordsOf(old, context.cards).includes('Barrier') && !keywordsOf(u, context.cards).includes('Barrier') && !has('barrier', uid)) add({ type: 'barrier', p: u.p, uid, target: uid });
  }
  for (const [uid, u] of previous) {
    if (current.has(uid) || has('death', uid) || has('recall', uid)) continue;
    if (has('capture', uid) || has('obliterate', uid)) continue;
    const reallyDied = (next.players || []).some(p => (p.grave || []).some(d => d.uid === uid)) && !(before.players || []).some(p => (p.grave || []).some(d => d.uid === uid));
    if (reallyDied) add({ type: 'death', p: u.p, uid, card: u.card });
  }
  for (let p = 0; p < 2; p++) {
    if (!before.players?.[p] || !next.players?.[p] || touched(`core${p}`)) continue;
    const amount = before.players[p].hp - next.players[p].hp;
    if (amount) add({ type: amount > 0 ? 'damage' : 'heal', p, target: `core${p}`, amount: Math.abs(amount) });
  }
  if (!before.combat && next.combat && !has('attack')) add({ type: 'attack', p: next.combat.p, lanes: next.combat.lanes });
  if (before.combat && !has('block')) {
    const lanes = next.combat?.lanes || (context.action?.type === 'block' ? before.combat.lanes.map(l => ({ ...l, blocker: context.action.assignments?.[l.attacker] || l.blocker })) : []);
    if (lanes.some(l => l.blocker && !before.combat.lanes.some(old => old.attacker === l.attacker && old.blocker === l.blocker))) add({ type: 'block', p: 1 - before.combat.p, lanes });
  }
  if (next.round > before.round && !has('round')) add({ type: 'round', round: next.round, attacker: next.roundOwner ?? next.attacker });
  if (before.winner == null && next.winner != null && !has('winner')) add({ type: 'winner', winner: next.winner });
  const planned = effects.slice(0, 64);
  const plays = new Set(planned.filter(e => e.type === 'play').map(e => e.uid));
  let cursor = 0;
  for (const e of planned) {
    e.quiet = e.type === 'summon' && plays.has(e.uid);
    e.delay = cursor;
    cursor += e.quiet ? 10 : STEP[e.type] || 55;
  }
  const compression = Math.min(1, 720 / Math.max(1, cursor));
  return planned.map(e => ({ ...e, delay: Math.round(e.delay * compression) }));
}

const rectOf = node => {
  if (!node) return null;
  const r = node.getBoundingClientRect();
  return r.width > 0 && r.height > 0 ? { left: r.left, top: r.top, width: r.width, height: r.height, x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
};

/** Call capture(previousView, previousContext) before rebuilding #app, then play. */
export function createMotion({ root, cards = {}, onBusyChange = () => {} } = {}) {
  if (!root?.ownerDocument) throw new Error('createMotion requires the app root element.');
  const doc = root.ownerDocument, win = doc.defaultView;
  const layer = doc.createElement('div');
  layer.className = 'motion-layer';
  layer.setAttribute('aria-hidden', 'true');
  doc.body.append(layer);
  let frame = null, lastSeq = -1, reduced = !!win.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  layer.classList.toggle('motion-reduced', reduced);
  let epoch = 0, busy = false;
  const animations = new Set(), timers = new Map(), hidden = new Map();
  const setBusy = value => { if (busy !== value) { busy = value; try { onBusyChange(value); } catch {} } };
  const cancel = () => {
    epoch++;
    for (const animation of animations) animation.cancel();
    animations.clear();
    for (const [id, resolve] of timers) { win.clearTimeout(id); resolve(); }
    timers.clear();
    for (const [node, opacity] of hidden) if (node.isConnected) node.style.opacity = opacity;
    hidden.clear();
    layer.replaceChildren();
    setBusy(false);
  };
  const wait = ms => new Promise(resolve => {
    if (!ms) return resolve();
    const id = win.setTimeout(() => { timers.delete(id); resolve(); }, ms);
    timers.set(id, resolve);
  });
  const animate = async (node, keyframes, options = {}) => {
    if (!node || !node.animate) return;
    const animation = node.animate(keyframes, { duration: 400, easing: 'cubic-bezier(.2,.75,.25,1)', fill: 'none', ...options });
    animations.add(animation);
    try { await animation.finished; } catch {} finally { animations.delete(animation); animation.cancel(); }
  };
  const el = (name, className, parent = layer) => {
    const node = doc.createElement(name);
    if (className) node.className = className;
    parent.append(node);
    return node;
  };
  const position = (node, r) => Object.assign(node.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
  const snapshot = () => {
    const result = new Map();
    for (const [selector, attribute, prefix] of [['[data-unit]', 'data-unit', 'u:'], ['[data-combat-unit]', 'data-combat-unit', 'combat:'], ['[data-hand]', 'data-hand', 'h:'], ['[data-core]', 'data-core', 'core'], ['[data-lane]', 'data-lane', 'lane:']]) {
      for (const node of root.querySelectorAll(selector)) {
        const r = rectOf(node);
        if (!r) continue;
        result.set(prefix + node.getAttribute(attribute), { r, node, clone: node.cloneNode(true), hand: prefix === 'h:' });
      }
    }
    for (const name of ['arena', 'spell-stack', 'own-board', 'opponent-board', 'hand', 'opponent-hand']) {
      const node = root.querySelector(`.${name}`), r = rectOf(node);
      if (r) result.set(name, { r, node });
    }
    for (const [side, selector] of [['self', '.player-bar.self .deck-info'], ['opponent', '.player-bar.opponent .deck-info']]) {
      const node = root.querySelector(selector), r = rectOf(node);
      if (r) result.set(`deck:${side}`, { r, node });
    }
    return result;
  };
  const lookup = (id, after, before) => after.get(`combat:${id}`) || after.get(id?.startsWith('core') ? id : `u:${id}`) || before.get(`combat:${id}`) || before.get(id?.startsWith('core') ? id : `u:${id}`);
  const hide = node => { if (node?.isConnected && !hidden.has(node)) { hidden.set(node, node.style.opacity); node.style.opacity = '0'; } };
  const show = node => { if (hidden.has(node)) { if (node.isConnected) node.style.opacity = hidden.get(node); hidden.delete(node); } };
  const cardGhost = (entry, code, r) => {
    const ghost = el('div', 'motion-fly-card');
    position(ghost, r);
    if (entry?.clone) {
      const context = el('div', `motion-clone-context ${entry.hand ? 'hand' : 'board-row'}`, ghost);
      const clone = entry.clone.cloneNode(true);
      clone.removeAttribute('id');
      clone.removeAttribute('data-unit'); clone.removeAttribute('data-hand');
      clone.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
      Object.assign(clone.style, { width: '100%', height: '100%', margin: '0', opacity: '1', transform: 'none', pointerEvents: 'none', maxWidth: 'none' });
      clone.classList.remove('selected', 'chosen', 'targetable', 'discard-selected');
      context.append(clone);
    } else {
      const c = cards[code || entry?.card];
      ghost.classList.add('motion-public-card');
      if (c?.art) { const art = el('img', '', ghost); art.src = c.art; art.alt = ''; }
      const name = el('span', '', ghost); name.textContent = c?.name || '✦';
    }
    return ghost;
  };
  const smallRect = (anchor, p, context) => {
    const fallback = { x: win.innerWidth / 2, y: p === context.seat ? win.innerHeight - 70 : 90 };
    const point = anchor?.r || fallback;
    return { left: point.x - 43, top: point.y - 59, x: point.x, y: point.y, width: 86, height: 118 };
  };
  const spark = (r, kind = 'gold') => {
    if (!r || reduced) return;
    const ring = el('div', `motion-impact motion-impact-${kind}`);
    Object.assign(ring.style, { left: `${r.x}px`, top: `${r.y}px` });
    animate(ring, [{ opacity: .9, transform: 'translate(-50%,-50%) scale(.25)' }, { opacity: 0, transform: 'translate(-50%,-50%) scale(1.8)' }], { duration: 420 }).then(() => ring.remove());
  };
  const dust = (r, kind = 'gold', count = 9) => {
    if (!r || reduced) return;
    for (let i = 0; i < count; i++) {
      const piece = el('i', `motion-particle motion-particle-${kind}`), angle = i / count * Math.PI * 2;
      const distance = Math.min(r.width, r.height) * .4 + 23 + (i % 3) * 13;
      Object.assign(piece.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${3 + i % 3}px`, height: `${5 + i % 5}px` });
      animate(piece, [{ opacity: .95, transform: `translate(-50%,-50%) rotate(${i * 29}deg) scale(1)` }, { opacity: 0, transform: `translate(${Math.cos(angle) * distance}px,${Math.sin(angle) * distance + 20}px) rotate(${i * 71}deg) scale(.15)` }], { duration: 500 + i * 19 }).then(() => piece.remove());
    }
  };
  const number = async (effect, entry) => {
    if (!entry) return;
    const amount = Math.round(Number(effect.amount) * 10) / 10;
    const node = el('strong', `motion-number motion-number-${effect.type}`);
    node.textContent = `${effect.type === 'heal' ? '+' : '−'}${amount}`;
    Object.assign(node.style, { left: `${entry.r.x}px`, top: `${entry.r.y - entry.r.height * .12}px` });
    if (!reduced) {
      spark(entry.r, effect.type === 'heal' ? 'heal' : 'hit');
      if (entry.node?.isConnected) animate(entry.node, [{ transform: 'translateX(0)', filter: 'brightness(1)' }, { transform: 'translateX(-4px)', filter: 'brightness(1.7)', offset: .2 }, { transform: 'translateX(4px)', offset: .42 }, { transform: 'translateX(-2px)', offset: .65 }, { transform: 'translateX(0)', filter: 'brightness(1)' }], { duration: 230 });
    }
    await animate(node, reduced ? [{ opacity: 0 }, { opacity: 1, offset: .15 }, { opacity: 1, offset: .8 }, { opacity: 0 }] : [{ opacity: 0, transform: 'translate(-50%,8px) scale(.6)' }, { opacity: 1, transform: 'translate(-50%,-9px) scale(1.2)', offset: .18 }, { opacity: 1, transform: 'translate(-50%,-26px) scale(1)', offset: .65 }, { opacity: 0, transform: 'translate(-50%,-52px) scale(.9)' }], { duration: reduced ? 420 : 880 });
    node.remove();
  };
  const arc = async (start, end) => {
    if (reduced || !start || !end) return;
    const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('motion-spell-svg'); svg.setAttribute('viewBox', `0 0 ${win.innerWidth} ${win.innerHeight}`);
    const path = doc.createElementNS(svg.namespaceURI, 'path');
    const cx = (start.x + end.x) / 2 + (end.y - start.y) * .18;
    const cy = (start.y + end.y) / 2 - Math.min(95, Math.abs(end.x - start.x) * .18 + 35);
    path.setAttribute('d', `M${start.x},${start.y} Q${cx},${cy} ${end.x},${end.y}`);
    path.setAttribute('fill', 'none'); svg.append(path); layer.append(svg);
    const length = path.getTotalLength(); path.style.strokeDasharray = `${length}`;
    const missile = el('div', 'motion-spell-missile');
    const frames = Array.from({ length: 21 }, (_, i) => {
      const t = i / 20, a = 1 - t;
      return { transform: `translate(${a * a * start.x + 2 * a * t * cx + t * t * end.x}px,${a * a * start.y + 2 * a * t * cy + t * t * end.y}px)`, opacity: i === 0 || i === 20 ? 0 : 1 };
    });
    await Promise.all([animate(path, [{ strokeDashoffset: length, opacity: 0 }, { strokeDashoffset: 0, opacity: .95, offset: .7 }, { strokeDashoffset: -length * .2, opacity: 0 }], { duration: 580, easing: 'ease-out' }), animate(missile, frames, { duration: 510, easing: 'ease-in' })]);
    spark(end, 'spell'); svg.remove(); missile.remove(); await wait(200);
  };
  const fly = async (effect, after, before, context) => {
    if (reduced) return;
    const oldUnit = before.get(`u:${effect.uid}`);
    const old = before.get(`h:${effect.uid}`) || (oldUnit?.virtual ? null : oldUnit);
    const anchor = effect.p === context.seat ? before.get('hand') : before.get('opponent-hand');
    const start = old?.r || smallRect(anchor, effect.p, context);
    const destination = after.get(`u:${effect.uid}`) || (cards[effect.card]?.kind === 'unit' && before.get(`u:${effect.uid}`)?.virtual ? before.get(`u:${effect.uid}`) : null);
    const stack = after.get('spell-stack') || after.get('arena');
    const end = destination?.r || smallRect(stack, effect.p, context);
    const ghost = cardGhost(old, effect.card, start);
    if (destination) hide(destination.node);
    const dx = end.left - start.left, dy = end.top - start.top;
    await animate(ghost, [{ opacity: .9, transform: 'translate(0,0) scale(1) rotate(-4deg)' }, { opacity: 1, transform: `translate(${dx * .55}px,${dy * .65 - 35}px) scale(1.16) rotate(2deg)`, offset: .55 }, { opacity: destination ? 1 : .95, transform: `translate(${dx}px,${dy}px) scale(${end.width / start.width},${end.height / start.height}) rotate(0deg)` }], { duration: 490 });
    spark(end); show(destination?.node);
    ghost.style.transform = `translate(${dx}px,${dy}px) scale(${end.width / start.width},${end.height / start.height})`;
    await animate(ghost, [{ opacity: 1 }, { opacity: 0 }], { duration: destination ? 100 : 180 });
    ghost.remove();
  };
  const formation = async (effect, after, before, context) => {
    if (reduced) return;
    const arena = (after.get('arena') || before.get('arena'))?.r;
    if (!arena) return;
    const lanes = effect.lanes || [], count = Math.max(1, lanes.length);
    await Promise.all(lanes.map(async (lane, index) => {
      const uid = effect.type === 'block' ? lane.blocker : lane.attacker;
      if (!uid) return;
      const entry = after.get(`u:${uid}`) || before.get(`u:${uid}`);
      if (!entry) return;
      const side = currentSide(uid, frame?.state) ?? effect.p;
      const combat = after.get(`combat:${uid}`);
      const width = combat?.r.width || Math.min(entry.r.width, Math.max(42, arena.width / count - 10));
      const x = (combat?.r.x || arena.left + arena.width * ((index + .5) / count)) - entry.r.x;
      const y = (combat?.r.y || arena.y + (side === context.seat ? 17 : -17)) - entry.r.y;
      const ghost = cardGhost(entry, null, entry.r);
      hide(combat?.node || after.get(`u:${uid}`)?.node);
      const sx = width / entry.r.width, sy = combat ? combat.r.height / entry.r.height : sx;
      await animate(ghost, [{ transform: 'translate(0,0) scale(1)', opacity: .9 }, { transform: `translate(${x}px,${y}px) scale(${sx},${sy})`, opacity: 1, offset: .55 }, { transform: `translate(${x}px,${y}px) scale(${sx},${sy})`, opacity: 1, offset: .8 }, { transform: `translate(${x}px,${y}px) scale(${sx},${sy})`, opacity: 0 }], { duration: effect.type === 'block' ? 570 : 650 });
      show(combat?.node || after.get(`u:${uid}`)?.node); ghost.remove();
    }));
  };
  const currentSide = (uid, state) => { const side = (state?.players || []).findIndex(p => p.board?.some(u => u.uid === uid)); return side >= 0 ? side : undefined; };
  const strike = async (effect, after, before) => {
    const source = lookup(effect.uid, after, before), destination = lookup(effect.target, after, before);
    if (!source || !destination || reduced) return;
    const ghost = cardGhost(source, effect.card, source.r);
    hide(after.get(`combat:${effect.uid}`)?.node || after.get(`u:${effect.uid}`)?.node);
    const dx = (destination.r.x - source.r.x) * .7, dy = (destination.r.y - source.r.y) * .7;
    await animate(ghost, [{ transform: 'translate(0,0) scale(1)' }, { transform: `translate(${-dx * .08}px,${-dy * .08}px) scale(1.04)`, offset: .18 }, { transform: `translate(${dx}px,${dy}px) scale(1.08)`, offset: .44 }, { transform: 'translate(0,0) scale(1)', opacity: 1 }], { duration: 480, easing: 'cubic-bezier(.4,0,.2,1)' });
    show(after.get(`combat:${effect.uid}`)?.node || after.get(`u:${effect.uid}`)?.node);
    ghost.remove();
  };
  const status = async (effect, entry) => {
    if (!entry) return;
    const overlay = el('div', `motion-status motion-status-${effect.type}`);
    position(overlay, entry.r);
    const label = el('span', '', overlay);
    label.textContent = effect.type === 'freeze' ? '凍傷' : effect.type === 'stun' ? '擊暈' : effect.type === 'buff' ? [effect.attack ? `${effect.attack > 0 ? '+' : ''}${effect.attack}` : '0', effect.health ? `${effect.health > 0 ? '+' : ''}${effect.health}` : '0'].join(' / ') : effect.type === 'shield' ? '屏障' : effect.type === 'burn' ? '手牌已滿' : '轉化';
    await animate(overlay, reduced ? [{ opacity: 0 }, { opacity: 1, offset: .15 }, { opacity: 0 }] : [{ opacity: 0, transform: 'scale(.92)' }, { opacity: 1, transform: 'scale(1.03)', offset: .3 }, { opacity: 0, transform: 'scale(1.06)' }], { duration: reduced ? 330 : 650 });
    overlay.remove();
  };
  const drawCards = async (effect, after, before, context) => {
    if (reduced) return;
    const own = effect.p === context.seat;
    const deck = after.get(`deck:${own ? 'self' : 'opponent'}`) || before.get(`deck:${own ? 'self' : 'opponent'}`);
    const handAnchor = after.get(own ? 'hand' : 'opponent-hand');
    if (!handAnchor) return;
    const newCards = own ? [...after].filter(([key]) => key.startsWith('h:') && !before.has(key)).map(([, entry]) => entry) : [];
    await Promise.all(Array.from({ length: Math.min(4, effect.amount || 1) }, async (_, i) => {
      await wait(i * 60);
      const destination = newCards[i], start = smallRect(deck || handAnchor, effect.p, context), end = destination?.r || smallRect(handAnchor, effect.p, context);
      const ghost = cardGhost(null, null, start); ghost.classList.add('motion-card-back');
      if (destination) hide(destination.node);
      await animate(ghost, [{ opacity: 0, transform: 'translate(0,0) scale(.75) rotate(8deg)' }, { opacity: 1, offset: .15 }, { opacity: 0, transform: `translate(${end.x - start.x}px,${end.y - start.y}px) scale(.85) rotate(0deg)` }], { duration: 430 });
      show(destination?.node); ghost.remove();
    }));
  };
  const banner = async (effect, context) => {
    const node = el('div', `motion-banner ${effect.type === 'winner' ? 'motion-banner-winner' : ''}`);
    const label = el('small', '', node), title = el('strong', '', node), subtitle = el('span', '', node);
    if (effect.type === 'winner') {
      label.textContent = 'THE NEXUS FALLS';
      title.textContent = effect.winner === 'draw' ? '平局' : effect.winner === context.seat ? '勝利' : '對局結束';
      subtitle.textContent = effect.winner === 'draw' ? '雙方主堡同時陷落' : '符文大地，記住這一戰';
    } else {
      label.textContent = 'A NEW ROUND'; title.textContent = `第 ${effect.round} 回合`;
      subtitle.textContent = effect.attacker === context.seat ? '我方獲得攻擊令牌' : '對手獲得攻擊令牌';
    }
    await animate(node, reduced ? [{ opacity: 0 }, { opacity: 1, offset: .15 }, { opacity: 1, offset: .8 }, { opacity: 0 }] : [{ opacity: 0, transform: 'translate(-50%,-50%) scaleX(.75)' }, { opacity: 1, transform: 'translate(-50%,-50%) scaleX(1)', offset: .18 }, { opacity: 1, offset: .75 }, { opacity: 0, transform: 'translate(-50%,-56%) scaleX(1.05)' }], { duration: reduced ? 550 : effect.type === 'winner' ? 1750 : 1150 });
    node.remove();
  };
  const levelUp = async effect => {
    const c = cards[effect.card];
    const stage = el('div', 'motion-level');
    const panel = el('div', 'motion-level-panel', stage);
    if (!reduced && c?.art) { const art = el('img', 'motion-level-art', panel); art.src = c.art; art.alt = ''; }
    el('div', 'motion-level-shade', panel);
    const halo = el('div', 'motion-level-halo', stage);
    const copy = el('div', 'motion-level-copy', stage);
    el('small', '', copy).textContent = 'CHAMPION LEVEL UP';
    el('strong', '', copy).textContent = c?.name || '英雄升級';
    el('span', '', copy).textContent = '英雄升級';
    if (!reduced) animate(halo, [{ opacity: 0, transform: 'translate(-50%,-50%) rotate(-40deg) scale(.5)' }, { opacity: .75, offset: .3 }, { opacity: 0, transform: 'translate(-50%,-50%) rotate(20deg) scale(1.35)' }], { duration: 1400 });
    await animate(stage, reduced ? [{ opacity: 0 }, { opacity: 1, offset: .1 }, { opacity: 1, offset: .8 }, { opacity: 0 }] : [{ opacity: 0, transform: 'scale(1.08)' }, { opacity: 1, transform: 'scale(1)', offset: .18 }, { opacity: 1, offset: .78 }, { opacity: 0, transform: 'scale(.98)' }], { duration: reduced ? 550 : 1450 });
    stage.remove();
  };
  const renderEffect = async (effect, after, before, context, ownEpoch) => {
    // Keep a removed public unit visible until its ordered departure beat.
    const departure = !reduced && ['death', 'recall', 'capture', 'obliterate'].includes(effect.type) && (before.get(`combat:${effect.uid}`) || before.get(`u:${effect.uid}`));
    const departureGhost = departure && !departure.virtual ? cardGhost(departure, effect.card, departure.r) : null;
    await wait(reduced ? 0 : effect.delay);
    if (epoch !== ownEpoch) return;
    const targetEntry = lookup(effect.target || effect.uid, after, before);
    if (effect.type === 'play') return fly(effect, after, before, context);
    if (effect.type === 'attack' || effect.type === 'block') return formation(effect, after, before, context);
    if (effect.type === 'strike') return strike(effect, after, before);
    if (effect.type === 'draw') return drawCards(effect, after, before, context);
    if (effect.type === 'damage' || effect.type === 'heal') return number(effect, targetEntry);
    if (effect.type === 'round' || effect.type === 'winner') return banner(effect, context);
    if (effect.type === 'level') return levelUp(effect);
    if (effect.type === 'spell') {
      const origin = (after.get('spell-stack') || after.get('arena') || before.get('arena'))?.r;
      return Promise.all((effect.targets || []).map(id => arc(origin, lookup(id, after, before)?.r)));
    }
    if (effect.type === 'barrier') { if (targetEntry) { dust(targetEntry.r, 'shield', 8); spark(targetEntry.r, 'shield'); await wait(reduced ? 0 : 620); } return; }
    if (['shield', 'buff', 'stun', 'freeze', 'transform'].includes(effect.type)) return status(effect, targetEntry);
    if (effect.type === 'burn') {
      const entry = after.get(effect.p === context.seat ? 'hand' : 'opponent-hand');
      if (entry) return status(effect, entry);
      return;
    }
    if (effect.type === 'summon') {
      const entry = after.get(`u:${effect.uid}`);
      if (!entry) return;
      if (effect.quiet) return;
      spark(entry.r, 'gold');
      if (!reduced && entry.node?.isConnected) return animate(entry.node, [{ opacity: .4, transform: 'scale(.82)', filter: 'brightness(2)' }, { opacity: 1, transform: 'scale(1)', filter: 'brightness(1)' }], { duration: 380 });
      return;
    }
    if (['death', 'recall', 'capture', 'obliterate'].includes(effect.type)) {
      const entry = before.get(`combat:${effect.uid}`) || before.get(`u:${effect.uid}`);
      if (!entry || reduced) return;
      const ghost = departureGhost || cardGhost(entry, effect.card, entry.r);
      const captor = effect.type === 'capture' && lookup(effect.source, after, before);
      const end = effect.type === 'recall' ? smallRect(effect.p === context.seat ? after.get('hand') : after.get('opponent-hand'), effect.p, context) : captor?.r || null;
      if (end) await animate(ghost, [{ opacity: 1, transform: 'translate(0,0) scale(1)' }, { opacity: 0, transform: `translate(${end.x - entry.r.x}px,${end.y - entry.r.y}px) scale(.45)` }], { duration: 470 });
      else {
        dust(entry.r, 'death', 11);
        await animate(ghost, [{ opacity: 1, transform: 'scale(1)', filter: 'saturate(1) brightness(1)' }, { opacity: .65, transform: 'translateY(8px) scale(.97)', filter: 'saturate(0) brightness(1.8)', offset: .3 }, { opacity: 0, transform: 'translateY(30px) scale(.84) rotate(-4deg)', filter: 'saturate(0) brightness(.2)' }], { duration: 630 });
      }
      ghost.remove();
    }
  };
  return {
    capture(state, context = {}) { frame = { state, context: { ...context }, entries: snapshot() }; },
    async play(next, context = {}) {
      const previous = frame;
      const privacyChanged = context.curtain || previous?.context.curtain || previous && (previous.context.seat !== context.seat || previous.context.sessionKey !== context.sessionKey || previous.context.mode !== context.mode);
      if (privacyChanged || !next || !previous?.state || next.version < previous.state.version) cancel();
      const effects = planEffects(previous?.state, next, { ...context, cards, beforeCurtain: previous?.context.curtain, beforeSeat: previous?.context.seat, beforeMode: previous?.context.mode, beforeSessionKey: previous?.context.sessionKey, afterSeq: lastSeq });
      if (previous?.context.sessionKey !== context.sessionKey) lastSeq = -1;
      lastSeq = Math.max(lastSeq, maxSeq(next));
      if (!effects.length) {
        if (next?.version > (previous?.state?.version ?? 0) + 1) cancel();
        if (!privacyChanged && next?.version === previous?.state?.version && !reduced) {
          const after = snapshot();
          await Promise.all([...after].filter(([key]) => key.startsWith('u:') || key.startsWith('combat:')).map(([key, entry]) => {
            const old = previous.entries.get(key);
            if (!old) return;
            const x = old.r.left - entry.r.left, y = old.r.top - entry.r.top;
            if (Math.abs(x) + Math.abs(y) < 2) return;
            return animate(entry.node, [{ transform: `translate(${x}px,${y}px)` }, { transform: 'translate(0,0)' }], { duration: 240 });
          }));
        }
        return [];
      }
      cancel();
      const ownEpoch = epoch, after = snapshot(), before = previous.entries;
      // A polling batch can include a publicly played unit that died before
      // either rendered snapshot. Give that disclosed card a neutral board
      // anchor so its ordered damage/departure beats still have a location.
      for (const e of effects) if (['play', 'summon'].includes(e.type) && e.uid && cards[e.card]?.kind === 'unit' && !after.has(`u:${e.uid}`) && !before.has(`u:${e.uid}`)) {
        const anchor = after.get(e.p === context.seat ? 'own-board' : 'opponent-board') || after.get('arena');
        if (anchor) before.set(`u:${e.uid}`, { r: smallRect(anchor, e.p, context), node: null, card: e.card, virtual: true });
      }
      setBusy(true);
      try { await Promise.all(effects.map(e => renderEffect(e, after, before, context, ownEpoch))); }
      finally { if (epoch === ownEpoch) { for (const [node] of hidden) show(node); layer.replaceChildren(); setBusy(false); } }
      return effects;
    },
    reset() { cancel(); frame = null; lastSeq = -1; },
    setReduced(value) { reduced = !!value; cancel(); layer.classList.toggle('motion-reduced', reduced); },
  };
}
