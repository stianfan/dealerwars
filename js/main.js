import {
  newGame, loadGame, saveGame, clearSave,
  loadSettings, saveSettings,
  generateMarket, rollEvent, addLog,
  buyDrug, sellDrug,
  payDebt, bankDeposit, bankWithdraw, buyWeapon, buyCoat,
  initCombat, combatFight, combatRun,
  advanceDay, calcScore, fmt, addHighScore,
} from './game.js';
import { NPC } from './data.js';

import {
  renderStart, renderMain, renderTravel, renderEvent,
  renderCombat, renderService, renderBuyModal, renderSellModal,
  renderGameOver, renderScores,
} from './ui.js';

import { playSound, setMuted, isMuted } from './sound.js';

// ── State ─────────────────────────────────────────────────────────────────────

let G = null;
let settings = loadSettings();
let activeService = null;
let fromScores = false;
let toastTimeout = null;

const app = document.getElementById('app');

// ── Render ────────────────────────────────────────────────────────────────────

function render() {
  if (!G) {
    app.innerHTML = renderStart(!!loadGame());
    return;
  }

  // Check game over conditions
  if (!G.gameOver && (G.day > 30 || G.health <= 0)) {
    G = { ...G, gameOver: true };
    saveGame(G);
  }

  let html = '';

  if (G.gameOver) {
    html = renderGameOver(G);
  } else if (G.phase === 'scores') {
    html = renderScores();
  } else if (G.phase === 'travel') {
    html = renderTravel(G);
  } else if (G.phase === 'event') {
    html = renderMain(G, settings) + renderEvent(G);
  } else if (G.phase === 'combat') {
    html = renderCombat(G);
  } else if (G.phase === 'buy') {
    html = renderMain(G, settings) + renderBuyModal(G, G.activeDrug);
  } else if (G.phase === 'sell') {
    html = renderMain(G, settings) + renderSellModal(G, G.activeDrug);
  } else if (G.phase === 'service') {
    html = renderService(G, activeService);
  } else {
    html = renderMain(G, settings);
  }

  app.innerHTML = html;
  setupListeners();
}

function setupListeners() {
  // Qty slider ↔ number input sync (buy/sell modals)
  const slider = document.getElementById('qty-range');
  const numIn  = document.getElementById('qty-num');
  const costEl = document.getElementById('cost-total');
  const priceEl = document.getElementById('modal-price');

  function syncQty(val) {
    const price = priceEl ? parseInt(priceEl.value) : 0;
    if (slider) slider.value = val;
    if (numIn)  numIn.value  = val;
    if (costEl) costEl.textContent = fmt(val * price);
  }

  if (slider && numIn) {
    slider.addEventListener('input', () => syncQty(slider.value));
    numIn.addEventListener('input', () => {
      const max = parseInt(numIn.max);
      const v = Math.min(Math.max(1, parseInt(numIn.value) || 1), max);
      syncQty(v);
    });
  }

  // Event cheap-buy qty
  const evQty = document.getElementById('event-qty');
  if (evQty) {
    evQty.addEventListener('input', () => {
      const costDiv = document.getElementById('event-cost');
      if (costDiv && G.pendingEvent) {
        costDiv.textContent = `${fmt(G.pendingEvent.price * evQty.value)} totalt`;
      }
    });
  }
}

function showToast(msg, color = 'red') {
  const toast = document.createElement('div');
  toast.className = `toast ${color}`;
  toast.textContent = msg;
  app.appendChild(toast);
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.remove(), 2500);
}

// ── Actions ───────────────────────────────────────────────────────────────────

function dispatch(action, param) {
  switch (action) {

    case 'NEW_GAME': {
      const hasSave = !!loadGame();
      if (hasSave && G) {
        if (!confirm('Start ny runde? Nåværende spill slettes.')) break;
      }
      clearSave();
      G = newGame();
      saveGame(G);
      playSound('travel');
      render();
      break;
    }

    case 'CONTINUE': {
      G = loadGame();
      if (!G) { G = newGame(); saveGame(G); }
      render();
      break;
    }

    case 'BACK': {
      if (!G) { render(); break; } // back to start screen
      if (G.phase === 'event') break; // can't back out of events
      G = { ...G, phase: 'main', activeDrug: null, pendingEvent: null };
      activeService = null;
      render();
      break;
    }

    case 'TOGGLE_MUTE': {
      settings.muted = !settings.muted;
      setMuted(settings.muted);
      saveSettings(settings);
      render();
      break;
    }

    // ── Navigation ──────────────────────────────────────────────────────────

    case 'SHOW_TRAVEL': {
      G = { ...G, phase: 'travel' };
      render();
      break;
    }

    case 'TRAVEL_TO': {
      const destId = param;
      let state = advanceDay(G);

      const ev = rollEvent(state);
      let modifiers = {};

      if (!ev) {
        state = addLog(state, 'Stille dag på veien.');
        state = arriveAt(state, destId, modifiers);
        G = state;
        saveGame(G);
        playSound('travel');
        render();
        break;
      }

      // Price-only events: apply modifier then arrive normally
      if (ev.type === 'bust') {
        modifiers[ev.drug] = ev.modifier;
        state = addLog(state, ev.msg);
        state = arriveAt(state, destId, modifiers);
        G = state;
        saveGame(G);
        playSound('alert');
        render();
        break;
      }

      if (ev.type === 'flood') {
        modifiers[ev.drug] = ev.modifier;
        state = addLog(state, ev.msg);
        state = arriveAt(state, destId, modifiers);
        G = state;
        saveGame(G);
        playSound('alert');
        render();
        break;
      }

      if (ev.type === 'addict') {
        const inv = { ...state.inventory, [ev.drug]: (state.inventory[ev.drug] || 0) + ev.qty };
        state = { ...state, inventory: inv };
        state = addLog(state, ev.msg);
        state = arriveAt(state, destId, modifiers);
        G = state;
        saveGame(G);
        playSound('coin');
        render();
        break;
      }

      if (ev.type === 'bankraid') {
        state = { ...state, bankFrozen: true };
        state = addLog(state, ev.msg);
        state = arriveAt(state, destId, modifiers);
        G = state;
        saveGame(G);
        playSound('alert');
        render();
        break;
      }

      // Interactive events: arrive first, then show event screen
      state = arriveAt(state, destId, modifiers);
      state = { ...state, phase: 'event', pendingEvent: { ...ev, destId } };
      G = state;
      saveGame(G);
      playSound('alert');
      render();
      break;
    }

    // ── Event resolution ────────────────────────────────────────────────────

    case 'EVENT_DISMISS': {
      const ev = G.pendingEvent;
      G = addLog({ ...G, phase: 'main', pendingEvent: null }, ev.msg);
      saveGame(G);
      render();
      break;
    }

    case 'EVENT_PAY': {
      const ev = G.pendingEvent;
      const amount = ev.amount;
      if (G.cash < amount) {
        // Can't pay — forced into combat
        G = { ...G, phase: 'combat', combat: initCombat(G), pendingEvent: null };
      } else {
        G = addLog({ ...G, cash: G.cash - amount, phase: 'main', pendingEvent: null },
          `Røvet for ${fmt(amount)}.`);
        playSound('hit');
      }
      saveGame(G);
      render();
      break;
    }

    case 'EVENT_FIGHT': {
      G = { ...G, phase: 'combat', combat: initCombat(G), pendingEvent: null };
      saveGame(G);
      render();
      break;
    }

    case 'EVENT_RUN': {
      const escChance = 0.40 + (G.weapons.length > 0 ? 0.15 : 0);
      if (Math.random() < escChance) {
        G = addLog({ ...G, phase: 'main', pendingEvent: null }, 'Du stakk unna betjenten i siste sekund!');
        playSound('escape');
      } else {
        const dmg = 10;
        const newHp = G.health - dmg;
        G = { ...G, health: newHp, phase: 'combat', combat: initCombat(G), pendingEvent: null };
        G.combat = { ...G.combat, log: [`Du prøvde å løpe, men ${NPC.cop} skjøt etter deg! −${dmg} HP. Nå er du i kamp.`] };
        playSound('hit');
      }
      saveGame(G);
      render();
      break;
    }

    case 'EVENT_BUY_CHEAP': {
      const ev = G.pendingEvent;
      const qtyEl = document.getElementById('event-qty');
      const qty = parseInt(qtyEl?.value || '1');
      const [next, err] = buyDrug({ ...G, market: { ...G.market, [ev.drug]: ev.price } }, ev.drug, qty);
      if (err) { showToast(err); break; }
      G = addLog({ ...next, phase: 'main', pendingEvent: null }, `Kjøpte ${qty}× ${ev.drugName} til ${fmt(ev.price)}.`);
      saveGame(G);
      playSound('buy');
      render();
      break;
    }

    // ── Buy / Sell ───────────────────────────────────────────────────────────

    case 'OPEN_BUY': {
      G = { ...G, phase: 'buy', activeDrug: param };
      render();
      break;
    }

    case 'OPEN_SELL': {
      G = { ...G, phase: 'sell', activeDrug: param };
      render();
      break;
    }

    case 'CONFIRM_BUY': {
      const drugKey = param;
      const qtyEl = document.getElementById('qty-num');
      const qty = parseInt(qtyEl?.value || '0');
      if (!qty || qty < 1) { showToast('Ugyldig antall.'); break; }
      const price = G.market[drugKey];
      const [next, err] = buyDrug(G, drugKey, qty);
      if (err) { showToast(err); playSound('denied'); break; }
      G = addLog({ ...next, phase: 'main', activeDrug: null },
        `Kjøpte ${qty}× ${drugKey} for ${fmt(qty * price)}.`);
      saveGame(G);
      playSound('buy');
      render();
      break;
    }

    case 'CONFIRM_SELL': {
      const drugKey = param;
      const qtyEl = document.getElementById('qty-num');
      const qty = parseInt(qtyEl?.value || '0');
      if (!qty || qty < 1) { showToast('Ugyldig antall.'); break; }
      const price = G.market[drugKey];
      const [next, err] = sellDrug(G, drugKey, qty);
      if (err) { showToast(err); playSound('denied'); break; }
      G = addLog({ ...next, phase: 'main', activeDrug: null },
        `Solgte ${qty}× ${drugKey} for ${fmt(qty * price)}.`);
      saveGame(G);
      playSound('sell');
      render();
      break;
    }

    // ── Services ─────────────────────────────────────────────────────────────

    case 'OPEN_SERVICE': {
      activeService = param;
      G = { ...G, phase: 'service' };
      render();
      break;
    }

    case 'SVC_PAY_DEBT': {
      const amtEl = document.getElementById('svc-amount');
      const amount = parseInt(amtEl?.value || '0');
      const [next, err] = payDebt(G, amount);
      if (err) { showToast(err); playSound('denied'); break; }
      G = addLog(next, `Betalte ${fmt(amount)} til ${next.debt === 0 ? '— GJELDSFRI! 🎉' : 'Svein.'}`);
      G = { ...G, phase: 'service' };
      saveGame(G);
      playSound('coin');
      render();
      break;
    }

    case 'SVC_DEPOSIT': {
      const amtEl = document.getElementById('deposit-amount');
      const amount = parseInt(amtEl?.value || '0');
      const [next, err] = bankDeposit(G, amount);
      if (err) { showToast(err); playSound('denied'); break; }
      G = addLog({ ...next, phase: 'service' }, `Satte inn ${fmt(amount)} i banken.`);
      saveGame(G);
      playSound('coin');
      render();
      break;
    }

    case 'SVC_WITHDRAW': {
      const amtEl = document.getElementById('withdraw-amount');
      const amount = parseInt(amtEl?.value || '0');
      const [next, err] = bankWithdraw(G, amount);
      if (err) { showToast(err); playSound('denied'); break; }
      G = addLog({ ...next, phase: 'service' }, `Tok ut ${fmt(amount)} fra banken.`);
      saveGame(G);
      playSound('coin');
      render();
      break;
    }

    case 'SVC_BUY_WEAPON': {
      const [next, err] = buyWeapon(G, param);
      if (err) { showToast(err); playSound('denied'); break; }
      const w = next.weapons.find(x => x.id === param);
      G = addLog({ ...next, phase: 'service' }, `Kjøpte ${w.name}.`);
      saveGame(G);
      playSound('coin');
      render();
      break;
    }

    case 'SVC_BUY_COAT': {
      const [next, err] = buyCoat(G);
      if (err) { showToast(err); playSound('denied'); break; }
      G = addLog({ ...next, phase: 'service' }, `Jakka oppgradert til ${next.coatSize} enheter.`);
      saveGame(G);
      playSound('coin');
      render();
      break;
    }

    // ── Combat ───────────────────────────────────────────────────────────────

    case 'COMBAT_FIGHT': {
      let state = combatFight(G);
      if (state.health <= 0) {
        state = { ...state, gameOver: true };
        playSound('lose');
      } else if (state.combat.over) {
        playSound('win');
      } else {
        playSound('hit');
      }
      G = state;
      saveGame(G);
      render();
      break;
    }

    case 'COMBAT_RUN': {
      let state = combatRun(G);
      if (state.health <= 0) {
        state = { ...state, gameOver: true };
        playSound('lose');
      } else if (state.combat.escaped) {
        playSound('escape');
      } else {
        playSound('miss');
      }
      G = state;
      saveGame(G);
      render();
      break;
    }

    case 'COMBAT_END': {
      const c = G.combat;
      const msg = c.won
        ? `Slo ut ${c.won ? 'betjenten' : ''}. Fikk ${fmt(c.reward)}.`
        : 'Slapp unna politiet.';
      G = addLog({ ...G, phase: 'main', combat: null }, msg);
      saveGame(G);
      render();
      break;
    }

    case 'GAME_OVER': {
      G = { ...G, gameOver: true };
      saveGame(G);
      playSound('lose');
      render();
      break;
    }

    // ── Game Over ─────────────────────────────────────────────────────────────

    case 'SUBMIT_SCORE': {
      const nameEl = document.getElementById('player-name');
      const name = nameEl?.value.trim() || 'Anonym';
      const score = calcScore(G);
      addHighScore(name, score);
      clearSave();
      G = null;
      app.innerHTML = renderScores() +
        `<div style="text-align:center;padding:1rem">
           <button class="btn btn-secondary" data-action="NEW_GAME">NY RUNDE</button>
         </div>`;
      break;
    }

    case 'SHOW_SCORES': {
      if (G) {
        G = { ...G, phase: 'scores' };
      } else {
        app.innerHTML = renderScores() + `<div style="text-align:center;margin-top:1rem">${
          `<button class="btn btn-ghost" data-action="BACK">← TILBAKE</button>`
        }</div>`;
        return;
      }
      render();
      break;
    }

    default:
      console.warn('Unknown action:', action, param);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function arriveAt(state, locationId, modifiers = {}) {
  const market = generateMarket(locationId, modifiers);
  return { ...state, location: locationId, market, phase: 'main' };
}

// ── Event delegation ──────────────────────────────────────────────────────────

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  dispatch(el.dataset.action, el.dataset.param || '');
});

// ── Init ──────────────────────────────────────────────────────────────────────

setMuted(settings.muted);
render();
