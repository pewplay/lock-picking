// Lock Picking: tap when the spinning pick touches the pin. Five clean picks open the lock.
// Rebuilt for PewPlay on a canvas: fills the screen, pointer/touch/keyboard input, sound, saved stats.
(function () {
  'use strict';

  var DIGITS = 5;
  var TOLERANCE = 25 * Math.PI / 180; // same +-25 degree window as the original
  var BASE_SPEED = 200 * Math.PI / 180; // radians per second
  var SPEED_STEP = 14 * Math.PI / 180; // a little faster after every pick
  var KEY_STATS = 'lock-picking:stats';
  var KEY_MUTED = 'lock-picking:muted';
  var TAU = Math.PI * 2;

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var overlay = document.getElementById('overlay');
  var ovTitle = document.getElementById('ovTitle');
  var ovText = document.getElementById('ovText');
  var ovBtn = document.getElementById('ovBtn');
  var statsEl = document.getElementById('stats');
  var hintEl = document.getElementById('hint');
  var muteBtn = document.getElementById('mute');
  var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

  var W = 0, H = 0, dpr = 1;
  var state = 'menu'; // menu | play | lost | won
  var digits = DIGITS;
  var pick = 0; // pick angle, 0 = top, clockwise
  var dir = 1;
  var pin = 0;
  var speed = BASE_SPEED;
  var last = 0;
  var fx = []; // short-lived effects
  var shake = 0;
  var stats = loadStats();
  var muted = loadMuted();
  var picksThisRun = 0;

  // ---------- storage ----------
  function loadStats() {
    var s = { opened: 0, attempts: 0, streak: 0, bestStreak: 0 };
    try {
      var v = JSON.parse(localStorage.getItem(KEY_STATS) || 'null');
      if (v && typeof v === 'object') for (var k in s) if (typeof v[k] === 'number') s[k] = v[k];
    } catch (e) { /* ignore */ }
    return s;
  }
  function saveStats() { try { localStorage.setItem(KEY_STATS, JSON.stringify(stats)); } catch (e) { /* ignore */ } }
  function loadMuted() { try { return localStorage.getItem(KEY_MUTED) === '1'; } catch (e) { return false; } }
  function saveMuted() { try { localStorage.setItem(KEY_MUTED, muted ? '1' : '0'); } catch (e) { /* ignore */ } }

  function renderStats() {
    statsEl.innerHTML = 'Locks opened <b>' + stats.opened + '</b>' +
      (stats.bestStreak > 1 ? ' &nbsp;·&nbsp; Best streak <b>' + stats.bestStreak + '</b>' : '');
  }

  // ---------- audio (created on the first gesture) ----------
  var ac = null;
  function audio() {
    if (muted) return null;
    if (!ac) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ac = new AC(); } catch (e) { return null; }
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function tone(freq, dur, type, vol, delay, slide) {
    var a = audio();
    if (!a) return;
    var t = a.currentTime + (delay || 0);
    var o = a.createOscillator(), g = a.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function sndHit(n) { tone(900 + n * 90, 0.07, 'triangle', 0.25); tone(1800 + n * 160, 0.05, 'sine', 0.08, 0.02); }
  function sndMiss() { tone(180, 0.32, 'sawtooth', 0.12, 0, 70); }
  function sndWin() { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.22, 'triangle', 0.18, i * 0.09); }); }

  muteBtn.setAttribute('aria-pressed', muted ? 'true' : 'false');
  muteBtn.addEventListener('click', function () {
    muted = !muted;
    muteBtn.setAttribute('aria-pressed', muted ? 'true' : 'false');
    muteBtn.setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound');
    saveMuted();
    if (!muted) tone(880, 0.06, 'triangle', 0.15);
  });

  // ---------- game ----------
  function angDiff(a, b) {
    var d = ((a - b) % TAU + TAU) % TAU;
    return d > Math.PI ? d - TAU : d;
  }

  // New pin somewhere ahead of the pick (never right under it, never a full lap away).
  function placePin() {
    var ahead = (70 + Math.random() * 250) * Math.PI / 180;
    pin = ((pick + dir * ahead) % TAU + TAU) % TAU;
  }

  function start() {
    digits = DIGITS;
    dir = 1;
    speed = BASE_SPEED;
    pick = Math.random() * TAU;
    picksThisRun = 0;
    fx = [];
    shake = 0;
    placePin();
    state = 'play';
    stats.attempts++;
    saveStats();
    hideOverlay();
    hintEl.textContent = (coarse ? 'Tap' : 'Click or press Space') + ' when the pick touches the pin';
    hintEl.style.opacity = stats.opened > 0 ? '0' : '1';
    audio();
  }

  function attempt() {
    if (state !== 'play') return;
    var d = Math.abs(angDiff(pick, pin));
    if (d <= TOLERANCE) {
      digits--;
      picksThisRun++;
      fx.push({ kind: 'hit', a: pin, t: 0 });
      hintEl.style.opacity = '0';
      if (navigator.vibrate) { try { navigator.vibrate(12); } catch (e) { /* ignore */ } }
      if (!digits) { win(); return; }
      sndHit(DIGITS - digits);
      dir = -dir;
      speed = BASE_SPEED + SPEED_STEP * (DIGITS - digits);
      placePin();
    } else {
      lose();
    }
  }

  function win() {
    state = 'won';
    sndWin();
    stats.opened++;
    stats.streak++;
    if (stats.streak > stats.bestStreak) stats.bestStreak = stats.streak;
    saveStats();
    renderStats();
    fx.push({ kind: 'open', t: 0 });
    setTimeout(function () {
      showOverlay('you win.', 'win', 'The lock is open.' + (stats.streak > 1 ? '<br>' + stats.streak + ' locks in a row!' : ''), 'Play again');
    }, 700);
  }

  function lose() {
    state = 'lost';
    sndMiss();
    stats.streak = 0;
    saveStats();
    renderStats();
    shake = 1;
    fx.push({ kind: 'miss', a: pick, t: 0 });
    if (navigator.vibrate) { try { navigator.vibrate([40, 40, 60]); } catch (e) { /* ignore */ } }
    var txt = digits === DIGITS ? 'The pick slipped on the first pin.' :
      'You set ' + (DIGITS - digits) + ' of ' + DIGITS + ' pins before it slipped.';
    setTimeout(function () { showOverlay('missed.', 'lose', txt, 'Play again'); }, 650);
  }

  function showOverlay(title, cls, html, btn) {
    ovTitle.textContent = title;
    ovTitle.className = cls || '';
    ovText.innerHTML = html;
    ovBtn.textContent = btn;
    overlay.classList.add('show');
    overlay.dataset.ready = '0';
    setTimeout(function () { overlay.dataset.ready = '1'; }, 250);
    ovBtn.focus({ preventScroll: true });
  }
  function hideOverlay() { overlay.classList.remove('show'); ovBtn.blur(); }

  ovBtn.addEventListener('click', function (e) { e.stopPropagation(); start(); });

  // ---------- input ----------
  canvas.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    audio();
    attempt();
  });
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  window.addEventListener('keydown', function (e) {
    if (e.repeat) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (state === 'play') attempt();
      else if (overlay.classList.contains('show') && overlay.dataset.ready !== '0') start();
    } else if (e.key === 'm' || e.key === 'M') {
      muteBtn.click();
    }
  });

  // ---------- layout ----------
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () { setTimeout(resize, 120); });

  // ---------- drawing ----------
  var GREEN = '#2ecc71', FG = '#fefefe', RED = '#e74c3c';

  function draw(now, dt) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, W, H);

    var cx = W / 2, cy = H / 2;
    // leave room for the HUD (top) and the hint (bottom)
    var R = Math.max(60, Math.min(W * 0.42, (H - (H < 500 ? 76 : 130)) / 2, 430));
    if (shake > 0) {
      cx += Math.sin(now / 18) * 10 * shake;
      shake = Math.max(0, shake - dt * 2.2);
    }
    var lw = Math.max(2, R * 0.013);
    var opening = 0;
    for (var f = 0; f < fx.length; f++) if (fx[f].kind === 'open') opening = Math.min(1, fx[f].t / 0.6);

    // ring
    var ringColor = state === 'lost' ? RED : FG;
    ctx.lineWidth = lw;
    ctx.strokeStyle = ringColor;
    ctx.globalAlpha = 1;
    ctx.beginPath();
    if (opening > 0) {
      // the shackle springs open: the ring gets a gap at the top
      var gap = opening * 0.5;
      ctx.arc(cx, cy, R, -Math.PI / 2 + gap, -Math.PI / 2 - gap + TAU);
    } else {
      ctx.arc(cx, cy, R, 0, TAU);
    }
    ctx.stroke();

    // progress ticks inside the ring
    var set = DIGITS - digits;
    for (var i = 0; i < DIGITS; i++) {
      var ta = -Math.PI / 2 + (i - (DIGITS - 1) / 2) * 0.16;
      var tx = cx + Math.cos(ta) * R * 0.82, ty = cy + Math.sin(ta) * R * 0.82;
      ctx.beginPath();
      ctx.arc(tx, ty, Math.max(3, R * 0.022), 0, TAU);
      if (i < set) { ctx.fillStyle = GREEN; ctx.fill(); }
      else { ctx.lineWidth = Math.max(1.2, lw * 0.6); ctx.strokeStyle = 'rgba(254,254,254,0.45)'; ctx.stroke(); }
    }

    // pin
    if (state === 'play' || state === 'menu' || state === 'lost') {
      var px = cx + Math.sin(pin) * R, py = cy - Math.cos(pin) * R;
      var pr = Math.max(9, R * 0.075);
      var pulse = 0.5 + 0.5 * Math.sin(now / 1000 * TAU);
      ctx.beginPath();
      ctx.arc(px, py, pr + lw * 1.5 + pulse * lw * 1.6, 0, TAU);
      ctx.lineWidth = Math.max(1.5, lw * 0.8);
      ctx.strokeStyle = GREEN;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(px, py, pr + lw * 1.2, 0, TAU);
      ctx.fillStyle = '#222';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, TAU);
      ctx.fillStyle = GREEN;
      ctx.fill();
    }

    // pick (radial bar riding on the ring)
    if (opening < 1) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(pick);
      var len = Math.max(18, R * 0.12), wid = Math.max(7, R * 0.05);
      ctx.fillStyle = state === 'lost' ? RED : GREEN;
      ctx.globalAlpha = 1 - opening;
      roundRect(-wid / 2, -R - len / 2, wid, len, wid * 0.35);
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // effects
    for (var k = fx.length - 1; k >= 0; k--) {
      var e = fx[k];
      e.t += dt;
      if (e.kind === 'hit') {
        var p = e.t / 0.45;
        if (p >= 1) { fx.splice(k, 1); continue; }
        var hx = cx + Math.sin(e.a) * R, hy = cy - Math.cos(e.a) * R;
        ctx.beginPath();
        ctx.arc(hx, hy, R * (0.08 + p * 0.22), 0, TAU);
        ctx.lineWidth = lw * 1.4 * (1 - p);
        ctx.strokeStyle = GREEN;
        ctx.globalAlpha = 1 - p;
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (e.kind === 'miss') {
        if (e.t > 0.6) { fx.splice(k, 1); continue; }
      }
    }

    // centre text (hidden while a dialog is on top of the lock)
    if (overlay.classList.contains('show')) return;
    var fs = R * 0.42;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = state === 'won' ? GREEN : FG;
    ctx.font = '100 ' + fs + 'px "Lato", "Helvetica Neue", "Segoe UI", Roboto, "Noto Sans", "DejaVu Sans", Arial, sans-serif';
    var label = state === 'won' ? 'open' : String(digits);
    if (state === 'won') ctx.font = '100 ' + fs * 0.62 + 'px "Lato", "Helvetica Neue", "Segoe UI", Roboto, "Noto Sans", "DejaVu Sans", Arial, sans-serif';
    ctx.fillText(label, cx, cy + fs * 0.22);
    ctx.font = '300 ' + Math.max(14, R * 0.12) + 'px "Lato", "Helvetica Neue", "Segoe UI", Roboto, "Noto Sans", "DejaVu Sans", Arial, sans-serif';
    ctx.fillStyle = 'rgba(254,254,254,0.85)';
    var sub = state === 'won' ? 'lock picked' : (digits === 1 ? 'digit left' : 'digits left');
    ctx.fillText(sub, cx, cy + fs * 0.22 + Math.max(18, R * 0.17));
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function frame(now) {
    var dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    if (state === 'play' || state === 'menu') {
      pick = ((pick + dir * speed * dt * (state === 'menu' ? 0.6 : 1)) % TAU + TAU) % TAU;
    }
    draw(now, dt);
    requestAnimationFrame(frame);
  }

  // Pause cleanly when the page is hidden: no time jump when coming back.
  document.addEventListener('visibilitychange', function () {
    last = 0;
    if (document.hidden && ac && ac.state === 'running') ac.suspend();
  });

  // tiny hook for automated screenshots/tests
  window.__lock = {
    get: function () { return { state: state, pick: pick, pin: pin, digits: digits, dir: dir }; },
    align: function (off) { pick = ((pin + (off || 0)) % TAU + TAU) % TAU; }
  };

  resize();
  renderStats();
  pick = Math.random() * TAU;
  placePin();
  requestAnimationFrame(frame);
})();
