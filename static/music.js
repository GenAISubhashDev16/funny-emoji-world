/* Music player: original generated songs + optional your own mp3 files (see config.js -> songs) */
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const rand = (a, b) => Math.random() * (b - a) + a;
  const pick = (l) => l[Math.floor(Math.random() * l.length)];
  const CFG = window.SITE_CONFIG || {};
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} }
  };
  const period = () => (window.EWScene ? window.EWScene.period() : "morning");

  /* ===== TRACKS: [id, name, settings]. Add a new generated song by copying a line. =====
     bpm = speed, prog = chords [rootSemitoneFromC, isMinor], arp = arpeggio density 0-1,
     mel = melody density 0-1, o = octave shift (0 or 12), wave = sine|triangle|square */
  const TRACKS = [
    ["love", "💕 Love Song", { bpm: 70, prog: [[0, 0], [-3, 1], [-7, 0], [-5, 0], [0, 0], [-3, 1], [-7, 0], [-5, 0]], arp: 0.9, mel: 0.55, o: 0, wave: "triangle" }],
    ["morning", "🌅 Morning Sunshine", { bpm: 96, prog: [[0, 0], [-5, 0], [-3, 1], [-7, 0]], arp: 0.95, mel: 0.7, o: 12, wave: "triangle" }],
    ["garden", "🌸 Happy Garden", { bpm: 112, prog: [[0, 0], [-7, 0], [-5, 0], [-7, 0]], arp: 0.85, mel: 0.75, o: 12, wave: "square" }],
    ["night", "🌙 Night Dream", { bpm: 56, prog: [[-3, 1], [-7, 0], [0, 0], [-5, 0]], arp: 0.6, mel: 0.35, o: 0, wave: "sine" }],
    ...(CFG.songs || []).map((s, i) => ["song" + i, s.name || "🎵 Song " + (i + 1), { src: s.src }])
  ];
  const GEN = 4; // first 4 are generated
  const PENT = [0, 2, 4, 7, 9, 12, 14, 16];
  const forPeriod = { morning: 1, afternoon: 2, evening: 0, night: 3 };
  let ti = forPeriod[period()], ac, vol, bus, timer, playing = false, nextT = 0, bi = 0, walk = 2;
  const au = new Audio(); au.loop = true; au.preload = "none";

  const bar = document.createElement("div");
  bar.className = "player";
  bar.innerHTML = '<button id="pPlay" aria-label="Play or pause music">▶</button><div class="pinfo"><b id="pName"></b><small id="pSub">Tap play · original music</small></div><div class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></div><button id="pNext" aria-label="Next song">⏭</button><input id="pVol" type="range" min="0" max="1" step="0.05" aria-label="Music volume">';
  document.body.appendChild(bar);
  const pVol = $("#pVol"); pVol.value = store.get("musicVol") || "0.6";

  function ui() {
    $("#pName").textContent = TRACKS[ti][1];
    $("#pPlay").textContent = playing ? "⏸" : "▶";
    $("#pSub").textContent = playing ? "Now playing · loops forever" : "Tap play";
    bar.classList.toggle("playing", playing);
  }
  window.addEventListener("scenechange", (e) => { if (!playing && ti < GEN) { ti = forPeriod[e.detail]; ui(); } });

  function ensure() {
    if (!ac) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return false;
      ac = new C(); vol = ac.createGain(); vol.gain.value = +pVol.value; vol.connect(ac.destination);
    }
    if (ac.state === "suspended") ac.resume();
    return true;
  }
  function makeBus() {
    bus = ac.createGain();
    const d = ac.createDelay(1), fb = ac.createGain(), wet = ac.createGain(), lp = ac.createBiquadFilter();
    d.delayTime.value = 0.34; fb.gain.value = 0.38; wet.gain.value = 0.4; lp.type = "lowpass"; lp.frequency.value = 2800;
    bus.connect(vol); bus.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(wet); wet.connect(vol);
  }
  function note(semi, t, d, type, v, a) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = 261.63 * Math.pow(2, semi / 12);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + d + 0.05);
  }
  function playBar(t) {
    const T = TRACKS[ti][2], beat = 60 / T.bpm, [r, m] = T.prog[bi % T.prog.length], ch = [r, r + (m ? 3 : 4), r + 7];
    ch.forEach((x) => note(x, t, beat * 4, "sine", 0.045, 0.5));
    note(r - 12, t, beat * 3, "sine", 0.14, 0.03);
    for (let k = 0; k < 8; k++) if (Math.random() < T.arp) note(ch[[0, 1, 2, 1][k % 4]] + 12 + T.o, t + (k * beat) / 2, beat * 1.8, T.wave, T.wave === "square" ? 0.025 : 0.06, 0.01);
    for (let k = 0; k < 4; k++) if (Math.random() < T.mel) {
      walk = Math.max(0, Math.min(PENT.length - 1, walk + pick([-2, -1, -1, 1, 1, 2])));
      note(PENT[walk] + 12 + T.o, t + k * beat + (Math.random() < 0.3 ? beat / 2 : 0), beat * 2.2, "triangle", 0.09, 0.02);
    }
    bi++;
  }
  function pump() {
    const beat = 60 / TRACKS[ti][2].bpm;
    while (nextT < ac.currentTime + 1.5) { playBar(nextT); nextT += beat * 4; }
    timer = setTimeout(pump, 400);
  }
  function start() {
    const T = TRACKS[ti][2];
    if (T.src) { // your own mp3 file
      au.src = T.src; au.volume = +pVol.value;
      au.play().then(() => { playing = true; ui(); }).catch(() => { playing = false; ui(); $("#pSub").textContent = "File not found: " + T.src; });
      return;
    }
    if (!ensure()) return;
    makeBus(); bi = 0; nextT = ac.currentTime + 0.15; playing = true; pump(); ui();
  }
  function stop() {
    playing = false; clearTimeout(timer); au.pause();
    if (bus && ac) { bus.gain.cancelScheduledValues(ac.currentTime); bus.gain.setTargetAtTime(0, ac.currentTime, 0.12); }
    ui();
  }
  $("#pPlay").onclick = () => (playing ? stop() : start());
  $("#pNext").onclick = () => { const was = playing; if (was) stop(); ti = (ti + 1) % TRACKS.length; ui(); if (was) start(); };
  pVol.oninput = () => { store.set("musicVol", pVol.value); au.volume = +pVol.value; if (vol) vol.gain.value = +pVol.value; };
  ui();
})();
