import { DRUGS, LOCATIONS, WEAPONS, NPC, MAX_DAYS, COAT_UPGRADE_PRICE, COAT_UPGRADE_UNITS, MAX_COAT_SIZE, MAX_GUNS } from './data.js';
import { usedCap, freeCap, calcScore, fmt, getRating, getHighScores, bestWeapon } from './game.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function btn(label, action, param = '', cls = '') {
  return `<button class="btn ${cls}" data-action="${action}" data-param="${param}">${label}</button>`;
}

function hpBar(current, max, cls = '') {
  const pct = Math.max(0, Math.round((current / max) * 100));
  const filled = Math.round(pct / 10); // 10 blocks = shorter, mobile-friendly
  const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
  return `<span class="hp-bar ${cls}">${bar} ${pct}%</span>`;
}

function healthColor(hp) {
  if (hp > 60) return 'green';
  if (hp > 30) return 'yellow';
  return 'red';
}

function debtColor(debt) {
  return debt > 0 ? 'red' : 'green';
}

// ── Screens ───────────────────────────────────────────────────────────────────

export function renderStart(hasSave) {
  return `
    <div class="screen screen-start">
      <div class="start-title">
        <div class="title-main">LODDEFJORD</div>
        <div class="title-sub">D E A L E R</div>
        <div class="title-tagline">30 dager. Én sjanse.</div>
      </div>
      <div class="start-buttons">
        ${btn('NY RUNDE', 'NEW_GAME', '', 'btn-primary')}
        ${hasSave ? btn('FORTSETT', 'CONTINUE', '', 'btn-secondary') : ''}
        ${btn('TOPPLISTE', 'SHOW_SCORES', '', 'btn-ghost')}
      </div>
      <div class="start-hint">Kjøp billig. Selg dyrt. Ikke bli tatt.</div>
    </div>`;
}

export function renderMain(state, settings) {
  const loc = LOCATIONS[state.location];
  const used = usedCap(state);
  const free = freeCap(state);
  const hpColor = healthColor(state.health);
  const muted = settings.muted;

  const marketRows = Object.entries(state.market).map(([key, price]) => {
    const drug = DRUGS[key];
    const canAfford = Math.floor(state.cash / price);
    const canCarry = free;
    const maxBuy = Math.min(canAfford, canCarry);
    const canBuy = maxBuy > 0;
    const hint = !canBuy
      ? (canCarry === 0 ? 'jakka full' : 'for dyrt')
      : `maks ${maxBuy}`;
    const hintCls = canBuy ? 'dim' : 'red';
    return `
      <div class="drug-row${canBuy ? '' : ' no-buy'}" ${canBuy ? `data-action="OPEN_BUY" data-param="${key}"` : ''}>
        <span class="drug-name">${drug.name}</span>
        <span class="drug-price green">${fmt(price)}</span>
        <span class="drug-hint ${hintCls}">${hint}</span>
      </div>`;
  }).join('');

  const invEntries = Object.entries(state.inventory).filter(([, q]) => q > 0);
  const invRows = invEntries.length === 0
    ? '<div class="dim">Lager er tomt.</div>'
    : invEntries.map(([key, qty]) => {
        const drug = DRUGS[key];
        const price = state.market[key];
        const sellable = !!price;
        return `
          <div class="drug-row ${sellable ? '' : 'dim'}" ${sellable ? `data-action="OPEN_SELL" data-param="${key}"` : ''}>
            <span class="drug-name">${drug.name}</span>
            <span class="drug-qty cyan">×${qty}</span>
            ${sellable ? `<span class="drug-hint green">selg @ ${fmt(price)}</span>` : '<span class="drug-hint dim">ikke marked her</span>'}
          </div>`;
      }).join('');

  const services = loc.services.map(s => {
    const labels = { loanshark: `${NPC.loanshark} (gjeld)`, bank: 'Bank', weapons: 'Våpen', coat: 'Jakke' };
    return btn(labels[s] || s, 'OPEN_SERVICE', s, 'btn-service');
  }).join('');

  const logLines = [...state.log].reverse().map(l => `<div class="log-line">&gt; ${l}</div>`).join('');

  const weaponInfo = state.weapons.length > 0
    ? state.weapons.map(w => w.name).join(', ')
    : 'Ubevæpnet';

  return `
    <div class="screen screen-main">
      <header class="status-bar">
        <span class="stat">DAG <b>${state.day}</b>/${MAX_DAYS}</span>
        <span class="stat location-name">📍 ${loc.name}</span>
        <span class="stat ${hpColor}">❤ ${state.health}</span>
        <button class="btn btn-ghost btn-sm mute-btn" data-action="TOGGLE_MUTE">${muted
          ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="var(--red)" viewBox="0 0 16 16"><path d="M6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06m7.137 2.096a.5.5 0 0 1 0 .708L12.207 8l1.647 1.646a.5.5 0 0 1-.708.708L11.5 8.707l-1.646 1.647a.5.5 0 0 1-.708-.708L10.793 8 9.146 6.354a.5.5 0 1 1 .708-.708L11.5 7.293l1.646-1.647a.5.5 0 0 1 .708 0"/></svg>`
          : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="var(--yellow)" viewBox="0 0 16 16"><path d="M9 4a.5.5 0 0 0-.812-.39L5.825 5.5H3.5A.5.5 0 0 0 3 6v4a.5.5 0 0 0 .5.5h2.325l2.363 1.89A.5.5 0 0 0 9 12zm3.025 4a4.5 4.5 0 0 1-1.318 3.182L10 10.475A3.5 3.5 0 0 0 11.025 8 3.5 3.5 0 0 0 10 5.525l.707-.707A4.5 4.5 0 0 1 12.025 8"/></svg>`
        }</button>
      </header>

      <div class="money-bar">
        <span class="money-item green">💰 ${fmt(state.cash)}</span>
        <span class="money-item cyan">🏦 ${state.bankFrozen ? '<span class="red">FRYST</span>' : fmt(state.bank)}</span>
        <span class="money-item ${debtColor(state.debt)}">💸 ${fmt(state.debt)}</span>
        <span class="money-item dim">🧥 ${used}/${state.coatSize} · ${weaponInfo}</span>
      </div>

      <div class="main-content">
        <section class="panel market-panel">
          <h2 class="panel-title">MARKED</h2>
          <div class="drug-list">${marketRows}</div>
        </section>
        <section class="panel inventory-panel">
          <h2 class="panel-title">LAGER</h2>
          <div class="drug-list">${invRows}</div>
        </section>
      </div>

      <div class="actions-bar">
        <div class="services">${services}</div>
        ${btn('REIS →', 'SHOW_TRAVEL', '', 'btn-primary btn-travel')}
      </div>

      <div class="message-log">
        <div class="log-lines">${logLines}</div>
      </div>
    </div>`;
}

export function renderTravel(state) {
  const current = state.location;
  const locBtns = Object.entries(LOCATIONS)
    .filter(([id]) => id !== current)
    .map(([id, loc]) => `
      <div class="travel-option" data-action="TRAVEL_TO" data-param="${id}">
        <span class="travel-name">${loc.name}</span>
        <span class="travel-desc dim">${loc.description}</span>
      </div>`).join('');

  return `
    <div class="screen screen-travel">
      <h2 class="screen-title">VELG DESTINASJON</h2>
      <div class="travel-list">${locBtns}</div>
      ${btn('← TILBAKE', 'BACK', '', 'btn-ghost')}
    </div>`;
}

export function renderEvent(state) {
  const ev = state.pendingEvent;
  let buttons = '';

  if (ev.type === 'cops') {
    buttons = `
      ${btn('SLÅSS', 'EVENT_FIGHT', '', 'btn-danger')}
      ${btn('LØPE', 'EVENT_RUN', '', 'btn-secondary')}`;
  } else if (ev.type === 'mugged') {
    const amount = ev.amount;
    buttons = `
      ${btn(`BETAL ${fmt(amount)}`, 'EVENT_PAY', '', 'btn-danger')}
      ${btn('SLÅSS', 'EVENT_FIGHT', '', 'btn-primary')}`;
  } else if (ev.type === 'cheap') {
    const maxBuy = Math.min(Math.floor(state.cash / ev.price), freeCap(state));
    buttons = `
      <div class="event-buy-form">
        <label>Antall (maks ${maxBuy}):</label>
        <input id="event-qty" type="number" min="1" max="${maxBuy}" value="${Math.min(1, maxBuy)}" class="qty-input">
        <div id="event-cost" class="cost-preview">${fmt(ev.price)} per enhet</div>
      </div>
      ${maxBuy > 0 ? btn('KJØP', 'EVENT_BUY_CHEAP', '', 'btn-primary') : ''}
      ${btn('IGNORER', 'EVENT_DISMISS', '', 'btn-ghost')}`;
  } else {
    buttons = btn('OK', 'EVENT_DISMISS', '', 'btn-primary');
  }

  return `
    <div class="screen screen-event">
      <div class="event-icon">${eventIcon(ev.type)}</div>
      <div class="event-msg">${ev.msg}</div>
      <div class="event-actions">${buttons}</div>
    </div>`;
}

function eventIcon(type) {
  return { bust: '🚔', flood: '📦', cops: '👮', mugged: '🔪', addict: '💊', cheap: '🤑', bankraid: '🏦' }[type] || '⚠️';
}

export function renderCombat(state) {
  const c = state.combat;
  const copHpPct = Math.round((c.copHp / c.copMaxHp) * 100);
  const pHpPct = Math.max(0, state.health);
  const logLines = c.log.slice(-6).map(l => `<div class="combat-log-line">${l}</div>`).join('');

  let actions = '';
  if (c.over) {
    if (state.health <= 0) {
      actions = btn('GAME OVER', 'GAME_OVER', '', 'btn-danger');
    } else {
      actions = btn('FORTSETT', 'COMBAT_END', '', 'btn-primary');
    }
  } else {
    actions = `${btn('SLÅSS', 'COMBAT_FIGHT', '', 'btn-danger')} ${btn('LØPE', 'COMBAT_RUN', '', 'btn-secondary')}`;
  }

  return `
    <div class="screen screen-combat">
      <h2 class="screen-title red">⚔ KONFRONTASJON</h2>
      <div class="combatants">
        <div class="combatant">
          <div class="combatant-name red">${NPC.cop}</div>
          ${hpBar(c.copHp, c.copMaxHp, 'red')}
          <div class="combatant-hp red">${c.copHp}/${c.copMaxHp} HP</div>
        </div>
        <div class="vs">VS</div>
        <div class="combatant">
          <div class="combatant-name green">DEG</div>
          ${hpBar(pHpPct, 100, 'green')}
          <div class="combatant-hp green">${Math.max(0, state.health)}/100 HP</div>
        </div>
      </div>
      <div class="combat-log">${logLines}</div>
      <div class="combat-actions">${actions}</div>
    </div>`;
}

export function renderService(state, service) {
  if (service === 'loanshark') return renderLoanShark(state);
  if (service === 'bank') return renderBank(state);
  if (service === 'weapons') return renderWeapons(state);
  if (service === 'coat') return renderCoat(state);
  return '';
}

function renderLoanShark(state) {
  const maxPay = Math.min(state.cash, state.debt);
  return `
    <div class="screen screen-service">
      <h2 class="screen-title">${NPC.loanshark} — Lånehai</h2>
      <div class="service-info">
        <div>Gjeld: <span class="red">${fmt(state.debt)}</span></div>
        <div>Cash: <span class="green">${fmt(state.cash)}</span></div>
        <div class="dim">Gjelden vokser ${Math.round(10 * 100) / 100}% per dag.</div>
      </div>
      ${state.debt <= 0
        ? '<div class="green">Ingen gjeld! 🎉</div>'
        : maxPay <= 0
        ? '<div class="dim">Ingen cash igjen å betale med.</div>'
        : `<div class="service-form">
            <label>Betal tilbake (maks ${fmt(maxPay)}):</label>
            <input id="svc-amount" type="number" min="1" max="${maxPay}" value="${maxPay}" class="qty-input">
          </div>
          ${btn('BETAL', 'SVC_PAY_DEBT', '', 'btn-primary')}`
      }
      ${btn('← TILBAKE', 'BACK', '', 'btn-ghost')}
    </div>`;
}

function renderBank(state) {
  const maxDeposit = state.cash;
  const maxWithdraw = state.bank;
  return `
    <div class="screen screen-service">
      <h2 class="screen-title">🏦 Bank</h2>
      ${state.bankFrozen ? '<div class="red">⚠ Banken er fryst av politiet!</div>' : ''}
      <div class="service-info">
        <div>Bank: <span class="cyan">${fmt(state.bank)}</span></div>
        <div>Cash: <span class="green">${fmt(state.cash)}</span></div>
      </div>
      <div class="bank-actions">
        ${maxDeposit > 0 ? `
          <div class="service-form">
            <label>Sett inn (maks ${fmt(maxDeposit)}):</label>
            <input id="deposit-amount" type="number" min="1" max="${maxDeposit}" value="${maxDeposit}" class="qty-input">
            ${btn('SETT INN', 'SVC_DEPOSIT', '', 'btn-primary')}
          </div>` : ''}
        ${!state.bankFrozen && maxWithdraw > 0 ? `
          <div class="service-form">
            <label>Ta ut (maks ${fmt(maxWithdraw)}):</label>
            <input id="withdraw-amount" type="number" min="1" max="${maxWithdraw}" value="${maxWithdraw}" class="qty-input">
            ${btn('TA UT', 'SVC_WITHDRAW', '', 'btn-secondary')}
          </div>` : ''}
      </div>
      ${btn('← TILBAKE', 'BACK', '', 'btn-ghost')}
    </div>`;
}

function renderWeapons(state) {
  const rows = WEAPONS.map(w => {
    const owned = state.weapons.find(x => x.id === w.id);
    const canBuy = !owned && state.weapons.length < MAX_GUNS && state.cash >= w.price;
    return `
      <div class="weapon-row">
        <div class="weapon-info">
          <span class="weapon-name">${w.name}</span>
          <span class="dim">DMG:${w.damage} ACC:${Math.round(w.accuracy * 100)}%</span>
        </div>
        <span class="weapon-price ${canBuy ? 'green' : 'dim'}">${fmt(w.price)}</span>
        ${owned
          ? '<span class="cyan">EID</span>'
          : btn('KJØP', 'SVC_BUY_WEAPON', w.id, canBuy ? 'btn-primary btn-sm' : 'btn-ghost btn-sm')}
      </div>`;
  }).join('');

  return `
    <div class="screen screen-service">
      <h2 class="screen-title">🔫 Våpenhandler</h2>
      <div class="service-info dim">Maks ${MAX_GUNS} våpen. Cash: <span class="green">${fmt(state.cash)}</span></div>
      <div class="weapon-list">${rows}</div>
      ${btn('← TILBAKE', 'BACK', '', 'btn-ghost')}
    </div>`;
}

function renderCoat(state) {
  const canUpgrade = state.cash >= COAT_UPGRADE_PRICE && state.coatSize < MAX_COAT_SIZE;
  return `
    <div class="screen screen-service">
      <h2 class="screen-title">🧥 Jakkeboden</h2>
      <div class="service-info">
        <div>Nåværende kapasitet: <span class="cyan">${state.coatSize} enheter</span></div>
        <div>Maks: <span class="dim">${MAX_COAT_SIZE} enheter</span></div>
        <div>Oppgradering: <span class="green">+${COAT_UPGRADE_UNITS} enheter</span> for <span class="yellow">${fmt(COAT_UPGRADE_PRICE)}</span></div>
        <div>Cash: <span class="green">${fmt(state.cash)}</span></div>
      </div>
      ${state.coatSize >= MAX_COAT_SIZE
        ? '<div class="dim">Jakka er allerede maksoppgradert.</div>'
        : btn(`OPPGRADER (+${COAT_UPGRADE_UNITS})`, 'SVC_BUY_COAT', '', canUpgrade ? 'btn-primary' : 'btn-ghost')}
      ${btn('← TILBAKE', 'BACK', '', 'btn-ghost')}
    </div>`;
}

export function renderBuyModal(state, drugKey) {
  const drug = DRUGS[drugKey];
  const price = state.market[drugKey];
  const maxAfford = Math.floor(state.cash / price);
  const maxCarry = freeCap(state);
  const maxQty = Math.min(maxAfford, maxCarry);
  const initQty = Math.max(1, Math.min(maxQty, 1));

  return `
    <div class="modal-overlay">
      <div class="modal">
        <h3 class="modal-title">KJØP ${drug.name.toUpperCase()}</h3>
        <div class="modal-info">
          <span>Pris: <b class="green">${fmt(price)}</b> per enhet</span>
          <span>Plass: <b class="cyan">${maxCarry}</b> enheter</span>
          <span>Råd til: <b class="green">${maxAfford}</b> enheter</span>
        </div>
        ${maxQty > 0 ? `
          <div class="qty-control">
            <input type="range" id="qty-range" min="1" max="${maxQty}" value="${initQty}">
            <div class="qty-row">
              <input type="number" id="qty-num" min="1" max="${maxQty}" value="${initQty}" class="qty-input">
              <span class="qty-label">enheter</span>
            </div>
            <div class="cost-preview">Totalt: <span id="cost-total" class="green">${fmt(initQty * price)}</span></div>
          </div>
          <input type="hidden" id="modal-price" value="${price}">
          <div class="modal-actions">
            ${btn('KJØP', 'CONFIRM_BUY', drugKey, 'btn-primary')}
            ${btn('AVBRYT', 'BACK', '', 'btn-ghost')}
          </div>
        ` : `
          <div class="red">Ikke nok cash eller plass.</div>
          ${btn('TILBAKE', 'BACK', '', 'btn-ghost')}
        `}
      </div>
    </div>`;
}

export function renderSellModal(state, drugKey) {
  const drug = DRUGS[drugKey];
  const price = state.market[drugKey];
  const maxQty = state.inventory[drugKey] || 0;
  const initQty = maxQty;

  return `
    <div class="modal-overlay">
      <div class="modal">
        <h3 class="modal-title">SELG ${drug.name.toUpperCase()}</h3>
        <div class="modal-info">
          <span>Pris: <b class="green">${fmt(price)}</b> per enhet</span>
          <span>Du har: <b class="cyan">${maxQty}</b> enheter</span>
        </div>
        <div class="qty-control">
          <input type="range" id="qty-range" min="1" max="${maxQty}" value="${initQty}">
          <div class="qty-row">
            <input type="number" id="qty-num" min="1" max="${maxQty}" value="${initQty}" class="qty-input">
            <span class="qty-label">enheter</span>
          </div>
          <div class="cost-preview">Inntekt: <span id="cost-total" class="green">${fmt(initQty * price)}</span></div>
        </div>
        <input type="hidden" id="modal-price" value="${price}">
        <div class="modal-actions">
          ${btn('SELG', 'CONFIRM_SELL', drugKey, 'btn-primary')}
          ${btn('AVBRYT', 'BACK', '', 'btn-ghost')}
        </div>
      </div>
    </div>`;
}

export function renderGameOver(state) {
  const score = calcScore(state);
  const rating = getRating(score);
  const dead = state.health <= 0;
  return `
    <div class="screen screen-gameover">
      <div class="gameover-title ${dead ? 'red' : 'green'}">${dead ? 'DU ER DØD' : 'SPILLET ER OVER'}</div>
      <div class="gameover-score">
        <div class="score-big ${score >= 0 ? 'green' : 'red'}">${fmt(score)}</div>
        <div class="score-rating yellow">${rating}</div>
      </div>
      <div class="gameover-breakdown dim">
        <div>Cash: ${fmt(state.cash)}</div>
        <div>Bank: ${fmt(state.bank)}</div>
        <div>Gjeld: ${fmt(state.debt)} (×2 = −${fmt(state.debt * 2)})</div>
        <div>Dager: ${state.day - 1}/${MAX_DAYS}</div>
      </div>
      <div class="gameover-form">
        <label>Ditt navn:</label>
        <input id="player-name" type="text" class="qty-input name-input" maxlength="20" placeholder="Anonym">
        ${btn('LAGRE SCORE', 'SUBMIT_SCORE', '', 'btn-primary')}
      </div>
      ${btn('NY RUNDE', 'NEW_GAME', '', 'btn-secondary')}
      ${btn('TOPPLISTE', 'SHOW_SCORES', '', 'btn-ghost')}
    </div>`;
}

export function renderScores() {
  const scores = getHighScores();
  const rows = scores.length === 0
    ? '<div class="dim">Ingen scores ennå.</div>'
    : scores.map((s, i) => `
        <div class="score-row">
          <span class="score-rank ${i === 0 ? 'yellow' : 'dim'}">#${i + 1}</span>
          <span class="score-name">${s.name || 'Anonym'}</span>
          <span class="score-val green">${fmt(s.score)}</span>
          <span class="score-date dim">${s.date}</span>
        </div>`).join('');

  return `
    <div class="screen screen-scores">
      <h2 class="screen-title yellow">🏆 TOPPLISTE</h2>
      <div class="score-list">${rows}</div>
      ${btn('← TILBAKE', 'BACK', '', 'btn-ghost')}
    </div>`;
}

export function renderError(msg) {
  return `<div class="toast red">${msg}</div>`;
}
