/**
 * Sky Reaper — SFX Module
 * Pure Web Audio API, no external files needed.
 * 
 * USAGE:
 *   1. Drop sfx.js into your js/ folder.
 *   2. Add <script src="js/sfx.js"></script> BEFORE game.js in index.html.
 *   3. Call SFX.init() once (e.g. on first user click / Play button).
 *   4. Hook calls throughout game.js (see INTEGRATION GUIDE below).
 *   5. Feed the sfxVolume setting: SFX.setVolume(settings.sfxVolume);
 *
 * ─────────────────────────────────────────────────────────────────
 * INTEGRATION GUIDE  (copy-paste locations in game.js / boss.js)
 * ─────────────────────────────────────────────────────────────────
 *
 * [1] On Play button click (first user gesture required by browsers):
 *       ui.playBtn.addEventListener('click', () => { SFX.init(); ... });
 *
 * [2] firePlayerBullets() in powerups.js — after pushing to game.bullets:
 *       SFX.shoot();
 *
 * [3] killEnemy() in game.js — inside the function body:
 *       SFX.explosion();
 *
 * [4] bossDeathSequence() in game.js — at the start:
 *       SFX.bossExplosion();
 *
 * [5] damagePlayer() in game.js — when health is reduced:
 *       SFX.playerHit();
 *
 * [6] When player loses a life (lives--):
 *       SFX.playerDeath();
 *
 * [7] applyPowerup() in powerups.js — in the switch cases:
 *       SFX.powerup();          // generic pickup
 *       SFX.shieldUp();         // case 'shield'
 *       SFX.lifeUp();           // case 'life'
 *
 * [8] spawnBoss() in boss.js — after setting game.boss:
 *       SFX.bossAlert();
 *
 * [9] BossModule.bossShoot() — once per volley (inside bossShoot):
 *       SFX.bossShoot();
 *
 * [10] Enemy bullet hits player — in damagePlayer:
 *       SFX.enemyHit();
 *
 * [11] wireVolume callback — sync volume:
 *       SFX.setVolume(settings.sfxVolume);
 */

window.SFX = (() => {
  let ctx = null;
  let masterGain = null;
  let _volume = 0.7;
  let _ready = false;

  // ── Core helpers ──────────────────────────────────────────────

  function init() {
    if (_ready) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = _volume;
      masterGain.connect(ctx.destination);
      _ready = true;
    } catch (e) {
      console.warn('SFX: Web Audio not available', e);
    }
  }

  function setVolume(v) {
    _volume = Math.max(0, Math.min(1, v));
    if (masterGain) masterGain.gain.value = _volume;
  }

  // Create an OscillatorNode connected through a GainNode to master
  function osc(type, freq, vol, startOffset = 0) {
    if (!_ready) return null;
    const g = ctx.createGain();
    g.gain.value = vol;
    g.connect(masterGain);
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.connect(g);
    const t = ctx.currentTime + startOffset;
    o.start(t);
    return { o, g, t };
  }

  // Ramp gain from start to 0 over duration, then stop osc
  function envelope(node, duration, startVol = null) {
    if (!node) return;
    const { o, g, t } = node;
    const sv = startVol !== null ? startVol : g.gain.value;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(sv, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    o.stop(t + duration + 0.02);
  }

  // White / pink noise burst
  function noise(duration, vol, filterFreq = 3000, startOffset = 0) {
    if (!_ready) return;
    const bufLen = Math.ceil(ctx.sampleRate * duration);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = 0.8;

    const g = ctx.createGain();
    g.gain.value = vol;
    const t = ctx.currentTime + startOffset;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    src.connect(filter);
    filter.connect(g);
    g.connect(masterGain);
    src.start(t);
    src.stop(t + duration + 0.02);
  }

  // ── Sound Designs ──────────────────────────────────────────────

  /**
   * Player shoot — quick high-pitched laser zap
   */
  function shoot() {
    if (!_ready) return;
    const n = osc('sawtooth', 1200, 0.18);
    if (!n) return;
    n.o.frequency.setValueAtTime(1200, n.t);
    n.o.frequency.exponentialRampToValueAtTime(320, n.t + 0.08);
    envelope(n, 0.08);
  }

  /**
   * Enemy / small explosion — punchy thud + crackle
   */
  function explosion() {
    if (!_ready) return;
    // Low thud
    const n = osc('sine', 180, 0.55);
    if (n) {
      n.o.frequency.setValueAtTime(180, n.t);
      n.o.frequency.exponentialRampToValueAtTime(40, n.t + 0.18);
      envelope(n, 0.22);
    }
    // Noise crackle
    noise(0.18, 0.35, 1800);
  }

  /**
   * Boss death — massive multi-stage explosion
   */
  function bossExplosion() {
    if (!_ready) return;
    for (let i = 0; i < 4; i++) {
      const off = i * 0.14;
      const n = osc('sine', 120 - i * 20, 0.6, off);
      if (n) {
        n.o.frequency.setValueAtTime(120 - i * 20, n.t);
        n.o.frequency.exponentialRampToValueAtTime(22, n.t + 0.35);
        envelope(n, 0.45, 0.6);
      }
      noise(0.35, 0.4, 1200 + i * 300, off);
    }
    // Final shockwave
    const sw = osc('sine', 60, 0.7, 0.55);
    if (sw) {
      sw.o.frequency.exponentialRampToValueAtTime(18, sw.t + 0.5);
      envelope(sw, 0.6, 0.7);
    }
    noise(0.5, 0.5, 800, 0.55);
  }

  /**
   * Player takes damage — harsh impact crack
   */
  function playerHit() {
    if (!_ready) return;
    const n = osc('sawtooth', 260, 0.35);
    if (n) {
      n.o.frequency.setValueAtTime(260, n.t);
      n.o.frequency.exponentialRampToValueAtTime(80, n.t + 0.12);
      envelope(n, 0.14);
    }
    noise(0.12, 0.4, 2200);
  }

  /**
   * Player loses a life — dramatic descending tone
   */
  function playerDeath() {
    if (!_ready) return;
    const freqs = [440, 350, 260, 180, 100];
    freqs.forEach((f, i) => {
      const n = osc('sawtooth', f, 0.3, i * 0.1);
      if (n) envelope(n, 0.18);
    });
    noise(0.55, 0.45, 900, 0.1);
  }

  /**
   * Enemy bullet hits player (softer than playerHit)
   */
  function enemyHit() {
    if (!_ready) return;
    noise(0.09, 0.28, 1600);
    const n = osc('square', 200, 0.2);
    if (n) {
      n.o.frequency.exponentialRampToValueAtTime(90, n.t + 0.09);
      envelope(n, 0.10);
    }
  }

  /**
   * Generic power-up collected — rising sparkle
   */
  function powerup() {
    if (!_ready) return;
    [600, 800, 1000, 1300].forEach((f, i) => {
      const n = osc('sine', f, 0.22, i * 0.055);
      if (n) envelope(n, 0.12);
    });
  }

  /**
   * Shield power-up — electronic hum charge
   */
  function shieldUp() {
    if (!_ready) return;
    const n = osc('sawtooth', 200, 0.2);
    if (n) {
      n.o.frequency.setValueAtTime(200, n.t);
      n.o.frequency.linearRampToValueAtTime(900, n.t + 0.28);
      envelope(n, 0.32);
    }
    const n2 = osc('sine', 600, 0.18, 0.1);
    if (n2) {
      n2.o.frequency.linearRampToValueAtTime(1400, n2.t + 0.22);
      envelope(n2, 0.26);
    }
  }

  /**
   * Extra life — joyful ascending arpeggio
   */
  function lifeUp() {
    if (!_ready) return;
    [523, 659, 784, 1047].forEach((f, i) => {
      const n = osc('sine', f, 0.25, i * 0.07);
      if (n) envelope(n, 0.18);
    });
  }

  /**
   * Boss incoming alert — deep menacing alarm pulse
   */
  function bossAlert() {
    if (!_ready) return;
    for (let i = 0; i < 3; i++) {
      const off = i * 0.38;
      const n = osc('sawtooth', 55, 0.5, off);
      if (n) {
        n.o.frequency.setValueAtTime(55, n.t);
        n.o.frequency.linearRampToValueAtTime(75, n.t + 0.15);
        n.o.frequency.linearRampToValueAtTime(55, n.t + 0.3);
        envelope(n, 0.32);
      }
      noise(0.2, 0.2, 600, off);
    }
  }

  /**
   * Boss shoots — heavy low thump
   */
  function bossShoot() {
    if (!_ready) return;
    const n = osc('sawtooth', 90, 0.28);
    if (n) {
      n.o.frequency.setValueAtTime(90, n.t);
      n.o.frequency.exponentialRampToValueAtTime(38, n.t + 0.11);
      envelope(n, 0.13);
    }
    noise(0.08, 0.18, 900);
  }

  /**
   * Combo milestone — quick punchy chime
   */
  function combo() {
    if (!_ready) return;
    [880, 1320].forEach((f, i) => {
      const n = osc('sine', f, 0.2, i * 0.04);
      if (n) envelope(n, 0.12);
    });
  }

  // ── Public API ────────────────────────────────────────────────
  return {
    init,
    setVolume,
    shoot,
    explosion,
    bossExplosion,
    playerHit,
    playerDeath,
    enemyHit,
    powerup,
    shieldUp,
    lifeUp,
    bossAlert,
    bossShoot,
    combo
  };
})();