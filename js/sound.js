let ctx = null;
let muted = false;

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

function tone(freq, duration, type = 'square', vol = 0.15, delay = 0) {
  if (muted) return;
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime + delay);
    gain.gain.setValueAtTime(vol, c.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + duration);
    osc.start(c.currentTime + delay);
    osc.stop(c.currentTime + delay + duration + 0.01);
  } catch (_) {}
}

const sounds = {
  buy:       () => { tone(440, 0.08); tone(660, 0.1, 'square', 0.15, 0.09); },
  sell:      () => { tone(660, 0.08); tone(440, 0.1, 'square', 0.15, 0.09); },
  travel:    () => { tone(330, 0.1); tone(440, 0.1, 'square', 0.15, 0.11); tone(550, 0.15, 'square', 0.15, 0.22); },
  hit:       () => { tone(120, 0.15, 'sawtooth', 0.2); },
  miss:      () => { tone(200, 0.05, 'square', 0.05); },
  escape:    () => { tone(440, 0.05); tone(330, 0.05, 'square', 0.15, 0.06); tone(220, 0.1, 'square', 0.1, 0.12); },
  alert:     () => { tone(880, 0.12, 'square', 0.15); tone(880, 0.12, 'square', 0.15, 0.18); },
  win:       () => { [330,440,550,660].forEach((f, i) => tone(f, 0.15, 'square', 0.15, i * 0.16)); },
  lose:      () => { [440,330,220,110].forEach((f, i) => tone(f, 0.2, 'sawtooth', 0.15, i * 0.18)); },
  coin:      () => { tone(880, 0.06, 'sine', 0.1); tone(1100, 0.08, 'sine', 0.1, 0.07); },
  denied:    () => { tone(200, 0.1, 'square', 0.1); },
};

export function playSound(name) {
  sounds[name]?.();
}

export function setMuted(val) {
  muted = val;
}

export function isMuted() {
  return muted;
}
