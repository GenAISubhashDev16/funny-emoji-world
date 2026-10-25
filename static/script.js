document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);
  if (!$("mascot") || !$("grid") || !$("board") || !$("laughBtn")) {
    alert("Your index.html is the OLD version. Replace it with the new index.html, then press Ctrl+F5.");
    return;
  }
  const rand = (a, b) => Math.random() * (b - a) + a;
  const pick = (l) => l[Math.floor(Math.random() * l.length)];
  const CFG = window.SITE_CONFIG || {};
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const store = {
    get(k, f) { try { const v = localStorage.getItem(k); return v === null ? f : v; } catch { return f; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} }
  };
  const message = $("message"), countEl = $("count"), mascot = $("mascot");

  /* ---------- theme ---------- */
  const themeBtn = $("themeBtn");
  function applyTheme(t) {
    document.documentElement.dataset.theme = t;
    themeBtn.textContent = t === "dark" ? "☀️ Light mode" : "🌙 Dark mode";
    themeBtn.setAttribute("aria-pressed", String(t === "dark"));
  }
  applyTheme(store.get("theme", matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  themeBtn.onclick = () => {
    const n = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(n); store.set("theme", n);
  };

  /* ---------- sound engine (Web Audio, no files needed) ---------- */
  let ctx, master, noiseBuf, soundOn = store.get("sound", "on") === "on";
  function ac() {
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
      master = ctx.createGain(); master.gain.value = 0.8;
      const comp = ctx.createDynamicsCompressor();
      master.connect(comp); comp.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  // mobile: unlock audio on the first touch; on iPhone also play a silent clip so the mute switch doesn't block Web Audio
  let unlocked = false;
  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  function unlockAudio() {
    if (!soundOn || unlocked) return;
    const c = ac(); if (!c) return;
    unlocked = true;
    try {
      const s1 = c.createBufferSource(); s1.buffer = c.createBuffer(1, 1, 22050); s1.connect(c.destination); s1.start(0);
      if (!isIOS) return;
      const n = 2400, w = new DataView(new ArrayBuffer(44 + n * 2));
      const str = (o, t) => [...t].forEach((ch, i) => w.setUint8(o + i, ch.charCodeAt(0)));
      str(0, "RIFF"); w.setUint32(4, 36 + n * 2, true); str(8, "WAVEfmt "); w.setUint32(16, 16, true); w.setUint16(20, 1, true); w.setUint16(22, 1, true);
      w.setUint32(24, 8000, true); w.setUint32(28, 16000, true); w.setUint16(32, 2, true); w.setUint16(34, 16, true); str(36, "data"); w.setUint32(40, n * 2, true);
      const a = new Audio(URL.createObjectURL(new Blob([w], { type: "audio/wav" })));
      a.loop = true; a.play().catch(() => {});
    } catch {}
  }
  ["pointerdown", "touchend", "click"].forEach((e) => document.addEventListener(e, unlockAudio, { passive: true }));
  function tone(f, t, d, o = {}) {
    const osc = ctx.createOscillator(), g = ctx.createGain(), s = ctx.currentTime + t;
    osc.type = o.type || "sine";
    osc.frequency.setValueAtTime(f, s);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, s + d);
    g.gain.setValueAtTime(0.0001, s);
    g.gain.exponentialRampToValueAtTime(o.v || 0.2, s + (o.a || 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, s + d);
    if (o.vib) {
      const l = ctx.createOscillator(), lg = ctx.createGain();
      l.frequency.value = o.vib[0]; lg.gain.value = o.vib[1];
      l.connect(lg).connect(osc.frequency); l.start(s); l.stop(s + d + 0.05);
    }
    osc.connect(g).connect(master); osc.start(s); osc.stop(s + d + 0.05);
  }
  function noise(t, d, o = {}) {
    const src = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain(), s = ctx.currentTime + t;
    src.buffer = noiseBuf; src.loop = true;
    fl.type = o.type || "bandpass"; fl.frequency.value = o.f || 2000; fl.Q.value = o.q || 1;
    g.gain.setValueAtTime(0.0001, s);
    g.gain.exponentialRampToValueAtTime(o.v || 0.2, s + (o.a || 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, s + d);
    src.connect(fl).connect(g).connect(master); src.start(s); src.stop(s + d + 0.05);
  }
  // "ha-ha-ha": sawtooth voice through two vowel formant filters
  function laugh(base, n, gap, dur, [f1, f2] = [800, 1300], v = 0.3) {
    for (let i = 0; i < n; i++) {
      const s = ctx.currentTime + i * gap + rand(0, 0.02);
      const osc = ctx.createOscillator(), g = ctx.createGain(), mix = ctx.createGain();
      const p = base * (1 - i * 0.035) * rand(0.97, 1.05);
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(p * 1.18, s);
      osc.frequency.exponentialRampToValueAtTime(p * 0.9, s + dur);
      mix.gain.value = 3;
      [f1, f2].forEach((f) => {
        const b = ctx.createBiquadFilter();
        b.type = "bandpass"; b.frequency.value = f; b.Q.value = 6;
        osc.connect(b); b.connect(mix);
      });
      g.gain.setValueAtTime(0.0001, s);
      g.gain.exponentialRampToValueAtTime(v * (1 - i / (n + 2)), s + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, s + dur);
      mix.connect(g).connect(master); osc.start(s); osc.stop(s + dur + 0.05);
    }
  }
  const S = {
    giggle: () => laugh(520, 8, 0.085, 0.07, [900, 2200]),
    laugh: () => laugh(260, 6, 0.15, 0.11),
    belly: () => { laugh(160, 7, 0.17, 0.13, [650, 1100], 0.4); noise(0, 1.1, { v: 0.04, f: 900 }); },
    evil: () => laugh(95, 4, 0.32, 0.26, [500, 900], 0.45),
    birds: () => [0, 0.18, 0.36, 0.9, 1.08, 1.7, 1.85, 2.0].forEach((t) =>
      tone(rand(2200, 3000), t, 0.12, { to: rand(3200, 4000), v: 0.1, vib: [40, 200] })),
    chime: () => [523, 659, 784, 1047].forEach((f, i) => { tone(f, i * 0.14, 1.1, { v: 0.18 }); tone(f * 2, i * 0.14, 0.6, { v: 0.05 }); }),
    morning: () => { S.birds(); [392, 494, 587, 784].forEach((f, i) => tone(f, 0.3 + i * 0.2, 1.2, { type: "triangle", v: 0.2 })); },
    sparkle: () => { for (let i = 0; i < 9; i++) tone(rand(1500, 3600), i * 0.06, 0.25, { v: 0.1 }); },
    pop: () => { tone(700, 0, 0.1, { to: 150, v: 0.3 }); noise(0, 0.04, { f: 3000, v: 0.15 }); },
    boing: () => tone(180, 0, 0.6, { to: 420, v: 0.3, type: "triangle", vib: [22, 60] }),
    tada: () => { [[523, 659, 784], [523, 659, 784, 1047]].forEach((c, k) => c.forEach((f) => tone(f, k * 0.18, k ? 1 : 0.15, { type: "triangle", v: 0.14 }))); noise(0.18, 0.4, { f: 5000, v: 0.06 }); },
    horn: () => { tone(300, 0, 0.5, { type: "sawtooth", to: 420, v: 0.14 }); tone(450, 0, 0.5, { type: "square", to: 620, v: 0.05 }); noise(0.4, 0.4, { f: 4000, v: 0.08 }); },
    trombone: () => [[311, 0, 0.35], [294, 0.35, 0.35], [277, 0.7, 0.35], [262, 1.05, 0.9]].forEach(([f, t, d], i) =>
      tone(f, t, d, { type: "sawtooth", v: 0.12, to: i === 3 ? f * 0.9 : f, vib: i === 3 ? [6, 8] : 0 })),
    snore: () => [0, 1.3].forEach((t) => {
      noise(t, 0.6, { f: 250, q: 0.7, v: 0.25, a: 0.3, type: "lowpass" });
      tone(65, t, 0.6, { type: "sawtooth", v: 0.08, a: 0.3, vib: [18, 10] });
      noise(t + 0.65, 0.5, { f: 200, v: 0.12, type: "lowpass" });
    }),
    applause: () => { for (let i = 0; i < 70; i++) noise(rand(0, 1.6), 0.03, { f: rand(1500, 4000), v: rand(0.05, 0.15), q: 0.8, a: 0.003 }); },
    heart: () => { tone(70, 0, 0.15, { to: 40, v: 0.5 }); tone(70, 0.2, 0.15, { to: 40, v: 0.5 }); tone(880, 0.45, 0.5, { v: 0.15 }); tone(1320, 0.55, 0.6, { v: 0.12 }); },
    coin: () => { tone(988, 0, 0.08, { type: "square", v: 0.08 }); tone(1319, 0.08, 0.5, { type: "square", v: 0.08 }); },
    whistle: () => tone(300, 0, 0.45, { to: 1500, v: 0.18, vib: [8, 20] }),
    sparrow: () => { for (let i = 0; i < 7; i++) tone(rand(3000, 4200), i * 0.11, 0.07, { to: rand(2200, 3000), v: 0.1 }); },
    dove: () => [[380, 0, 0.35], [440, 0.45, 0.4], [400, 0.95, 0.3], [400, 1.4, 0.45]].forEach(([f, t, d]) => tone(f, t, d, { to: f * 0.93, v: 0.2, a: 0.08, vib: [5, 6] })),
    parrot: () => { tone(700, 0, 0.25, { type: "sawtooth", to: 1200, v: 0.07 }); tone(1000, 0.3, 0.3, { type: "sawtooth", to: 500, v: 0.07 }); noise(0, 0.5, { f: 1800, v: 0.04 }); tone(1400, 0.75, 0.2, { to: 1900, v: 0.12 }); tone(1900, 1, 0.25, { to: 1300, v: 0.12 }); },
    owl: () => [[330, 0, 0.3], [330, 0.45, 0.3], [300, 1, 0.8]].forEach(([f, t, d]) => tone(f, t, d, { to: f * 0.88, v: 0.24, a: 0.06, vib: [4, 5] })),
    rooster: () => { tone(500, 0, 0.18, { type: "sawtooth", to: 750, v: 0.1 }); tone(800, 0.22, 0.15, { type: "sawtooth", to: 950, v: 0.1 }); tone(750, 0.42, 0.22, { type: "sawtooth", to: 1050, v: 0.1 }); tone(1050, 0.68, 0.95, { type: "sawtooth", to: 600, v: 0.1, vib: [9, 25] }); noise(0.1, 1.4, { f: 1500, q: 0.6, v: 0.03 }); },
    duck: () => { for (let i = 0; i < 3; i++) { tone(620, i * 0.24, 0.13, { type: "sawtooth", to: 340, v: 0.1 }); noise(i * 0.24, 0.1, { f: 900, v: 0.06 }); } },
    chick: () => { for (let i = 0; i < 6; i++) tone(rand(2100, 2700), i * 0.17, 0.08, { to: rand(2900, 3400), v: 0.1 }); },
    eagle: () => { tone(2600, 0, 1, { to: 1400, v: 0.13, vib: [30, 150] }); noise(0, 0.9, { f: 3200, q: 0.8, v: 0.05 }); },
    dawn: () => { S.rooster(); setTimeout(() => S.birds(), 1700); setTimeout(() => S.sparrow(), 3400); setTimeout(() => S.dove(), 4300); },
    cheer: () => { S.applause(); S.tada(); }
  };
  function play(name) {
    if (!soundOn || !ac()) return;
    try { S[name](); } catch {}
  }
  const soundBtn = $("soundBtn");
  function renderSound() {
    soundBtn.textContent = soundOn ? "🔊 Sound on" : "🔇 Sound off";
    soundBtn.setAttribute("aria-pressed", String(soundOn));
  }
  renderSound();
  soundBtn.onclick = () => { soundOn = !soundOn; store.set("sound", soundOn ? "on" : "off"); renderSound(); play("pop"); };

  /* ---------- visual helpers ---------- */
  function animate(el, name) {
    const cls = "anim-" + name;
    el.classList.remove(...[...el.classList].filter((c) => c.startsWith("anim-")));
    void el.offsetWidth;
    el.classList.add(cls);
    el.addEventListener("animationend", () => el.classList.remove(cls), { once: true });
  }
  function showMessage(text) {
    message.replaceChildren();
    const s = document.createElement("span");
    s.className = "burst"; s.textContent = text;
    message.appendChild(s);
  }
  function confetti(n = 35) {
    if (reduce) return;
    const em = ["🎉", "✨", "💖", "🌈", "🥳", "⭐", "😂", "🌸"];
    for (let i = 0; i < n; i++) {
      const p = document.createElement("span");
      p.className = "confetti"; p.textContent = pick(em);
      p.style.left = rand(0, 100) + "vw"; p.style.fontSize = rand(20, 38) + "px";
      p.style.animationDuration = rand(2, 4) + "s"; p.style.animationDelay = rand(0, 0.7) + "s";
      p.style.setProperty("--drift", rand(-100, 100) + "px");
      p.onanimationend = () => p.remove();
      document.body.appendChild(p);
    }
  }
  function burstFrom(el, emoji, count = 14) {
    if (reduce) return;
    const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    for (let i = 0; i < count; i++) {
      const s = document.createElement("span"), a = (Math.PI * 2 * i) / count + rand(-0.2, 0.2), d = rand(80, 170);
      s.className = "spark"; s.textContent = emoji;
      s.style.left = cx + "px"; s.style.top = cy + "px"; s.style.fontSize = rand(18, 30) + "px";
      s.style.setProperty("--dx", Math.cos(a) * d + "px");
      s.style.setProperty("--dy", Math.sin(a) * d + "px");
      s.style.setProperty("--rot", rand(-360, 360) + "deg");
      s.onanimationend = () => s.remove();
      document.body.appendChild(s);
    }
  }
  function haBurst() {
    if (reduce) return;
    const r = mascot.getBoundingClientRect();
    for (let i = 0; i < 7; i++) {
      const s = document.createElement("span");
      s.className = "ha"; s.textContent = pick(["HA!", "HAHA", "HEHE", "LOL", "HO!"]);
      s.style.left = r.left + rand(0, r.width) + "px"; s.style.top = r.top + rand(0, r.height / 2) + "px";
      s.style.fontSize = rand(18, 34) + "px"; s.style.animationDelay = i * 0.1 + "s";
      s.style.setProperty("--dx", rand(-60, 60) + "px"); s.style.setProperty("--rot", rand(-25, 25) + "deg");
      s.onanimationend = () => s.remove();
      document.body.appendChild(s);
    }
  }
  function sunrise() {
    const el = $("sunrise");
    el.classList.remove("on"); void el.offsetWidth; el.classList.add("on");
  }

  /* ---------- clicks + milestones ---------- */
  let clicks = parseInt(store.get("clicks", "0"), 10) || 0;
  countEl.textContent = clicks;
  function addClick() {
    clicks++; store.set("clicks", String(clicks));
    countEl.textContent = clicks;
    const chip = countEl.parentElement;
    chip.classList.remove("bump"); void chip.offsetWidth; chip.classList.add("bump");
    return clicks % 10 === 0;
  }
  function celebrate() {
    showMessage(`🏆 ${clicks} clicks! You are a legend!`);
    confetti(80); play("cheer"); animate(mascot, "jelly");
  }

  /* ---------- greeting by time of day ---------- */
  const h = new Date().getHours();
  $("greet").textContent = h < 12 ? "🌞 GOOD MORNING, SUNSHINE" : h < 17 ? "☀️ GOOD AFTERNOON, STAR" : "🌙 GOOD EVENING, LEGEND";

  /* ---------- floating background emojis ---------- */
  if (!reduce) {
    const fl = $("floaters"), set = ["😂", "😍", "🥳", "😎", "🌈", "⭐", "💖", "🌸", "🦋", "🍕"];
    for (let i = 0; i < 14; i++) {
      const s = document.createElement("span");
      s.textContent = pick(set);
      s.style.left = rand(0, 100) + "%"; s.style.fontSize = rand(18, 40) + "px";
      s.style.animationDuration = rand(14, 28) + "s"; s.style.animationDelay = -rand(0, 24) + "s";
      s.style.setProperty("--sx", rand(-80, 80) + "px"); s.style.setProperty("--r", rand(-120, 120) + "deg");
      fl.appendChild(s);
    }
  }

  /* ---------- hero buttons + mascot ---------- */
  const wishes = [
    "🌞 GOOD MORNING! Have a beautiful day! ☀️ 🌸 🦋",
    "☕ Rise and shine! Today is going to be amazing!",
    "🐦 The birds are singing just for you. Good morning!",
    "🌈 New day, new smiles. Good morning, superstar!"
  ];
  wishes.push(...(CFG.extraWishes || []));
  $("morningBtn").onclick = () => {
    if (addClick()) return celebrate();
    showMessage(pick(wishes)); sunrise(); confetti(); play("morning");
  };

  const jokes = [
    "Why did the emoji cross the road? To get to the other 😂!",
    "I told my phone a joke. It replied with 🤣. Best audience ever!",
    "Why don't eggs tell jokes? They'd crack each other up! 🥚",
    "What do you call a fake noodle? An impasta! 🍝",
    "Why was the math book sad? Too many problems! 📚😭"
  ];
  jokes.push(...(CFG.extraJokes || []));
  const faces = ["😂", "🤣", "😆", "😹", "🥳", "😎", "🤪", "🥰"];
  function doLaugh() {
    mascot.textContent = pick(["😂", "🤣", "😆", "😹"]);
    animate(mascot, "shake"); haBurst();
    play(pick(["laugh", "giggle", "belly"]));
  }
  $("laughBtn").onclick = () => {
    if (addClick()) return celebrate();
    showMessage(pick(jokes)); doLaugh();
  };
  mascot.onclick = () => {
    if (addClick()) return celebrate();
    mascot.textContent = pick(faces); animate(mascot, "jelly");
    burstFrom(mascot, mascot.textContent, 10); play(pick(["pop", "giggle", "boing", "sparkle"]));
  };

  const surprises = [
    ["😂 Warning: Your smile is highly contagious!", "laugh"],
    ["🥳 Today is a perfect day to be crazy!", "horn"],
    ["😍 Sending you a truckload of virtual hugs!", "heart"],
    ["🤪 Stay weird. Normal is overrated!", "boing"],
    ["🐼 You are pawsome! Have a fantastic day!", "sparkle"],
    ["🍕 Life is better with pizza and happy emojis!", "coin"],
    ["🦄 You are magical. Never forget that!", "chime"],
    ["😎 Too cool to follow the rules!", "whistle"]
  ];
  surprises.push(...(CFG.extraSurprises || []));
  let last = -1;
  $("surpriseBtn").onclick = () => {
    if (addClick()) return celebrate();
    let i; do { i = Math.floor(Math.random() * surprises.length); } while (i === last);
    last = i; showMessage(surprises[i][0]); confetti(); play(surprises[i][1]);
  };

  /* ---------- emoji cards ---------- */
  const moods = [
    ["😂", "Laughing", "laugh", "shake", ["Stop, my stomach hurts! 😂", "LOL level: maximum!"]],
    ["😍", "Love", "heart", "grow", ["Heart eyes activated! 😍", "Love is in the air!"]],
    ["😎", "Cool", "whistle", "flip", ["Too cool for school! 😎", "Sunglasses on. Problems off."]],
    ["🥳", "Party", "horn", "bounce", ["PARTY TIME! 🥳", "Who invited the confetti?"]],
    ["😭", "Drama", "trombone", "wiggle", ["So much drama! 😭", "Plot twist: the pizza was gone."]],
    ["🤪", "Crazy", "boing", "spin", ["Chaos mode on! 🤪", "My brain has left the chat!"]],
    ["🥰", "Cute", "sparkle", "jelly", ["Aww, so cute! 🥰", "Cuteness overload!"]],
    ["😴", "Sleepy", "snore", "sway", ["Five more minutes... 😴", "Zzz... pancakes... zzz..."]],
    ["🤩", "Wow", "tada", "bounce", ["Star struck! 🤩", "Ta-da! You did it!"]],
    ["😇", "Angel", "chime", "grow", ["Pure good vibes! 😇", "Kindness level: angelic."]],
    ["🤣", "Rolling", "belly", "shake", ["I can't breathe! 🤣", "Belly laugh unlocked!"]],
    ["🌞", "Morning", "morning", "spin", ["Good morning, sunshine! 🌞", "Rise and shine!"]]
  ];
  moods.push(...(CFG.extraMoods || []));
  const grid = $("grid"), fine = matchMedia("(hover:hover)").matches;
  moods.forEach(([emoji, name, snd, anim, lines], i) => {
    const cell = document.createElement("div");
    cell.className = "cell"; cell.style.setProperty("--i", i);
    const card = document.createElement("button");
    card.className = "emoji-card";
    card.innerHTML = `<span>${emoji}</span><small>${name}</small>`;
    card.setAttribute("aria-label", `${name} ${emoji}`);
    card.onclick = async () => {
      const milestone = addClick();
      animate(card.firstChild, anim); burstFrom(card, emoji); play(snd);
      if (snd === "morning") sunrise();
      if (milestone) return celebrate();
      let line = pick(lines);
      try { await navigator.clipboard.writeText(emoji); line += " Copied! 📋"; } catch {}
      showMessage(line);
    };
    if (fine) {
      card.onpointermove = (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--ry", ((e.clientX - r.left) / r.width - 0.5) * 18 + "deg");
        card.style.setProperty("--rx", -((e.clientY - r.top) / r.height - 0.5) * 18 + "deg");
      };
      card.onpointerleave = () => { card.style.setProperty("--rx", "0deg"); card.style.setProperty("--ry", "0deg"); };
    }
    cell.appendChild(card); grid.appendChild(cell);
  });

  /* ---------- bird garden ---------- */
  const birds = [
    ["🐦", "Sparrow", "sparrow", "bounce", "Chirp chirp! Good morning! 🐦"],
    ["🕊️", "Dove", "dove", "sway", "Coo coo... peace and love 🕊️"],
    ["🦜", "Parrot", "parrot", "wiggle", "Hello! Polly wants a cracker 🦜"],
    ["🦉", "Owl", "owl", "jelly", "Hoo hoo! Wise vibes only 🦉"],
    ["🐓", "Rooster", "rooster", "grow", "Cock-a-doodle-doo! Wake up! 🐓"],
    ["🦆", "Duck", "duck", "shake", "Quack quack quack! 🦆"],
    ["🐤", "Chick", "chick", "bounce", "Peep peep! So tiny, so cute 🐤"],
    ["🦅", "Eagle", "eagle", "spin", "Screeee! Soaring high! 🦅"]
  ];
  const birdRow = $("birdRow");
  if (birdRow) birds.forEach(([emoji, name, snd, anim, line], i) => {
    const b = document.createElement("button");
    b.className = "bird-btn"; b.style.setProperty("--i", i);
    b.setAttribute("aria-label", `${name} ${emoji}`);
    b.innerHTML = `<span>${emoji}</span><small>${name}</small>`;
    b.onclick = () => {
      const milestone = addClick();
      animate(b.firstChild, anim); burstFrom(b, "🎵", 8); play(snd);
      if (milestone) return celebrate();
      showMessage(line);
    };
    birdRow.appendChild(b);
  });
  const dawnBtn = $("dawnBtn");
  if (dawnBtn) dawnBtn.onclick = () => {
    if (addClick()) return celebrate();
    showMessage("🌄 Dawn chorus! The whole garden is waking up 🐓🐦🕊️"); sunrise(); confetti(25); play("dawn");
  };

  /* ---------- sound board ---------- */
  const groups = {
    "😂 Laugh Lab": [["Giggle", "giggle"], ["Chuckle", "laugh"], ["Belly Laugh", "belly"], ["Evil Laugh", "evil"]],
    "🌅 Morning Vibes": [["Birds", "birds"], ["Chimes", "chime"], ["Sunrise", "morning"], ["Snore", "snore"]],
    "🐦 Bird Voices": [["Sparrow", "sparrow"], ["Dove", "dove"], ["Parrot", "parrot"], ["Owl", "owl"], ["Rooster", "rooster"], ["Duck", "duck"], ["Chick", "chick"], ["Eagle", "eagle"]],
    "🎉 Happy Sounds": [["Applause", "applause"], ["Ta-da!", "tada"], ["Sparkle", "sparkle"], ["Coin", "coin"], ["Pop", "pop"], ["Boing", "boing"], ["Party Horn", "horn"], ["Oops", "trombone"]]
  };
  const board = $("board");
  Object.entries(groups).forEach(([title, items]) => {
    const g = document.createElement("div");
    g.className = "group";
    g.innerHTML = `<h3>${title}</h3><div></div>`;
    items.forEach(([label, snd]) => {
      const b = document.createElement("button");
      b.className = "snd"; b.textContent = label;
      b.onclick = () => {
        const milestone = addClick();
        animate(b, "jelly"); play(snd);
        if (snd === "morning") sunrise();
        if (/laugh|giggle|belly|evil/.test(snd)) { mascot.textContent = "🤣"; animate(mascot, "shake"); haBurst(); }
        if (milestone) return celebrate();
        showMessage(soundOn ? `🔊 ${label}!` : "🔇 Turn sound on to hear it!");
      };
      g.lastChild.appendChild(b);
    });
    board.appendChild(g);
  });
  window.EW = { play };
});