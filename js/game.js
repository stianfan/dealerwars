import {
  DRUGS, LOCATIONS, WEAPONS, NPC, SCORE_RATINGS,
  MAX_DAYS, STARTING_CASH, STARTING_DEBT, DEBT_RATE,
  COAT_UPGRADE_UNITS, COAT_UPGRADE_PRICE, MAX_COAT_SIZE, MAX_GUNS,
} from './data.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

export function ri(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randKey(obj) {
  const keys = Object.keys(obj);
  return keys[Math.floor(Math.random() * keys.length)];
}

export function usedCap(state) {
  return Object.values(state.inventory).reduce((a, b) => a + b, 0);
}

export function freeCap(state) {
  return state.coatSize - usedCap(state);
}

export function calcScore(state) {
  return Math.floor(state.cash + state.bank - state.debt * 2);
}

export function fmt(n) {
  return Math.round(n).toLocaleString('nb-NO') + ' NOK';
}

export function getRating(score) {
  return SCORE_RATINGS.find(r => score >= r.threshold)?.label ?? 'Gjeld og skam';
}

export function bestWeapon(state) {
  if (!state.weapons || state.weapons.length === 0) return null;
  return state.weapons.reduce((best, w) => (w.damage > best.damage ? w : best));
}

// ── State ────────────────────────────────────────────────────────────────────

const SAVE_KEY = 'ld_save';
const SETTINGS_KEY = 'ld_settings';
const SCORES_KEY = 'ld_scores';

export function newGame() {
  const state = {
    day: 1,
    cash: STARTING_CASH,
    bank: 0,
    debt: STARTING_DEBT,
    health: 100,
    location: 'loddefjord',
    inventory: {},
    coatSize: 100,
    weapons: [],
    gameOver: false,
    bankFrozen: false,
    market: {},
    log: [
      'Velkommen til Loddefjord.',
      `Du skylder ${NPC.loanshark} ${fmt(STARTING_DEBT)}.`,
      'Kjøp billig, selg dyrt. Overlev 30 dager.',
    ],
    phase: 'main',
    pendingEvent: null,
    activeDrug: null,
    combat: null,
  };
  state.market = generateMarket(state.location);
  return state;
}

export function saveGame(state) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

export function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function clearSave() {
  localStorage.removeItem(SAVE_KEY);
}

export function loadSettings() {
  const raw = localStorage.getItem(SETTINGS_KEY);
  return raw ? JSON.parse(raw) : { muted: false };
}

export function saveSettings(s) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export function getHighScores() {
  const raw = localStorage.getItem(SCORES_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function addHighScore(name, score) {
  const scores = getHighScores();
  scores.push({ name, score, date: new Date().toLocaleDateString('nb-NO') });
  scores.sort((a, b) => b.score - a.score);
  scores.splice(5);
  localStorage.setItem(SCORES_KEY, JSON.stringify(scores));
}

// ── Market ───────────────────────────────────────────────────────────────────

export function generateMarket(locationId, modifiers = {}) {
  const loc = LOCATIONS[locationId];
  const alwaysHave = loc.alwaysHave || [];
  const drugMods = loc.drugModifiers || {};

  // Fill remaining slots with random drugs (excluding guaranteed ones)
  const remaining = shuffle(Object.keys(DRUGS).filter(k => !alwaysHave.includes(k)));
  const slotCount = ri(6, 10);
  const keys = [...alwaysHave, ...remaining].slice(0, slotCount);

  const market = {};
  for (const key of keys) {
    const d = DRUGS[key];
    let price = ri(d.min, d.max) * loc.priceModifier;
    if (drugMods[key]) price *= drugMods[key];
    if (modifiers[key]) price *= modifiers[key];
    market[key] = Math.round(price);
  }
  return market;
}

// ── Events ───────────────────────────────────────────────────────────────────

export function rollEvent(state) {
  const roll = Math.random();
  const drug = randKey(DRUGS);
  const drugName = DRUGS[drug].name;

  if (roll < 0.45) {
    return null; // quiet
  } else if (roll < 0.60) {
    return { type: 'bust', drug, drugName, modifier: ri(3, 5),
      msg: `Politiet slo til mot ${drugName}-selgere! Prisene skyter i været!` };
  } else if (roll < 0.70) {
    return { type: 'flood', drug, drugName, modifier: 0.2,
      msg: `Massiv forsendelse med ${drugName} treffer gata. Prisene stuper.` };
  } else if (roll < 0.82) {
    return { type: 'cops',
      msg: `${NPC.cop} stopper deg!` };
  } else if (roll < 0.90) {
    const amount = Math.min(state.cash, ri(200, 1500));
    return { type: 'mugged', amount,
      msg: 'To gutter med hettegensere nærmer seg fra mørket...' };
  } else if (roll < 0.95) {
    const qty = ri(5, 20);
    return { type: 'addict', drug, drugName, qty,
      msg: `En junkie tipser deg om et gjemt lager. Du finner ${qty} enheter ${drugName}!` };
  } else if (roll < 0.99) {
    const price = Math.round(DRUGS[drug].min * 0.2);
    return { type: 'cheap', drug, drugName, price,
      msg: `En desperat selger tilbyr ${drugName} til ${fmt(price)} per enhet. Engangstilbud!` };
  } else if (state.day > 15 && !state.bankFrozen) {
    return { type: 'bankraid',
      msg: 'Politiet raidet bankene! Pengene dine er frosset.' };
  }
  return null;
}

// ── Buy / Sell ────────────────────────────────────────────────────────────────

export function buyDrug(state, drugKey, qty) {
  const price = state.market[drugKey];
  const cost = price * qty;
  if (cost > state.cash) return [state, 'Ikke nok cash.'];
  if (qty > freeCap(state)) return [state, 'Ikke nok plass i jakka.'];
  const inv = { ...state.inventory, [drugKey]: (state.inventory[drugKey] || 0) + qty };
  const next = { ...state, cash: state.cash - cost, inventory: inv };
  return [next, null];
}

export function sellDrug(state, drugKey, qty) {
  const have = state.inventory[drugKey] || 0;
  if (qty > have) return [state, 'Du har ikke nok.'];
  const price = state.market[drugKey];
  if (!price) return [state, 'Ingen kjøpere her for det.'];
  const revenue = price * qty;
  const inv = { ...state.inventory };
  inv[drugKey] -= qty;
  if (inv[drugKey] === 0) delete inv[drugKey];
  const next = { ...state, cash: state.cash + revenue, inventory: inv };
  return [next, null];
}

// ── Services ─────────────────────────────────────────────────────────────────

export function payDebt(state, amount) {
  if (amount <= 0 || amount > state.cash) return [state, 'Ugyldig beløp.'];
  const pay = Math.min(amount, state.debt);
  return [{ ...state, cash: state.cash - pay, debt: state.debt - pay }, null];
}

export function bankDeposit(state, amount) {
  if (amount <= 0 || amount > state.cash) return [state, 'Ugyldig beløp.'];
  return [{ ...state, cash: state.cash - amount, bank: state.bank + amount }, null];
}

export function bankWithdraw(state, amount) {
  if (state.bankFrozen) return [state, 'Banken er fryst av politiet.'];
  if (amount <= 0 || amount > state.bank) return [state, 'Ugyldig beløp.'];
  return [{ ...state, cash: state.cash + amount, bank: state.bank - amount }, null];
}

export function buyWeapon(state, weaponId) {
  const w = WEAPONS.find(x => x.id === weaponId);
  if (!w) return [state, 'Ukjent våpen.'];
  if (state.weapons.length >= MAX_GUNS) return [state, `Maks ${MAX_GUNS} våpen.`];
  if (state.weapons.find(x => x.id === weaponId)) return [state, 'Du har det allerede.'];
  if (state.cash < w.price) return [state, 'Ikke nok cash.'];
  return [{ ...state, cash: state.cash - w.price, weapons: [...state.weapons, w] }, null];
}

export function buyCoat(state) {
  if (state.cash < COAT_UPGRADE_PRICE) return [state, 'Ikke nok cash.'];
  if (state.coatSize >= MAX_COAT_SIZE) return [state, 'Jakka er allerede max.'];
  return [{ ...state, cash: state.cash - COAT_UPGRADE_PRICE, coatSize: state.coatSize + COAT_UPGRADE_UNITS }, null];
}

// ── Turn progression ─────────────────────────────────────────────────────────

export function advanceDay(state) {
  const newDebt = Math.round(state.debt * (1 + DEBT_RATE));
  return { ...state, day: state.day + 1, debt: newDebt };
}

// ── Combat ───────────────────────────────────────────────────────────────────

export function initCombat(state) {
  const w = bestWeapon(state);
  return {
    copHp: ri(50, 80),
    copMaxHp: 80,
    pDmg:    w ? w.damage   : ri(3, 6),
    pAcc:    w ? w.accuracy : 0.40,
    copDmg:  ri(10, 20),
    copAcc:  0.70,
    reward:  ri(500, 2000),
    log: [`${NPC.cop} stopper deg! Klar deg selv!`],
    over: false,
    won: false,
    escaped: false,
  };
}

export function combatFight(state) {
  const c = { ...state.combat, log: [...state.combat.log] };
  let { health } = state;
  const msgs = [];

  if (Math.random() < c.pAcc) {
    c.copHp = Math.max(0, c.copHp - c.pDmg);
    msgs.push(`Du treffer! ${NPC.cop} tar ${c.pDmg} skade. (${c.copHp} HP igjen)`);
  } else {
    msgs.push('Du bommer. Helvete.');
  }

  if (c.copHp <= 0) {
    c.over = true;
    c.won = true;
    msgs.push(`${NPC.cop} faller! Du stikker av med ${fmt(c.reward)}.`);
    c.log.push(...msgs);
    return { ...state, cash: state.cash + c.reward, combat: c };
  }

  if (Math.random() < c.copAcc) {
    health -= c.copDmg;
    msgs.push(`${NPC.cop} treffer deg for ${c.copDmg} skade!`);
  } else {
    msgs.push(`${NPC.cop} bommer!`);
  }

  c.log.push(...msgs);
  return { ...state, health, combat: c };
}

export function combatRun(state) {
  const c = { ...state.combat, log: [...state.combat.log] };
  let { health } = state;
  const escChance = 0.40 + (state.weapons.length > 0 ? 0.15 : 0);

  if (Math.random() < escChance) {
    c.over = true;
    c.escaped = true;
    c.log.push('Du klarer å stikke! Betjenten mister deg av syne.');
    return { ...state, combat: c };
  }

  const dmg = ri(10, 20);
  health -= dmg;
  c.log.push(`Du klarer ikke å stikke! ${NPC.cop} treffer deg for ${dmg} mens du løper!`);
  return { ...state, health, combat: c };
}

export function addLog(state, ...msgs) {
  const log = [...state.log, ...msgs].slice(-12);
  return { ...state, log };
}
