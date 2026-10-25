(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const rand = (a, b) => Math.random() * (b - a) + a;
  const pick = (l) => l[Math.floor(Math.random() * l.length)];
  const small = innerWidth < 600;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
    del(k) { try { localStorage.removeItem(k); } catch {} }
  };
  const PERIODS = ["morning", "afternoon", "evening", "night"];
  const LABEL = { morning: "🌅 Morning", afternoon: "☀️ Afternoon", evening: "🌇 Evening", night: "🌙 Night" };
  const hourPeriod = () => { const h = new Date().getHours(); return h >= 5 && h < 11 ? "morning" : h >= 11 && h < 17 ? "afternoon" : h >= 17 && h < 20 ? "evening" : "night"; };
  let mode = store.get("sceneMode") || "auto", wx = null, autoDark = false;
  const cur = () => (mode === "auto" ? hourPeriod() : mode);

  /* ---------- scene ---------- */
  const scene = document.createElement("div");
  scene.id = "scene"; scene.setAttribute("aria-hidden", "true");
  document.body.prepend(scene);

  function autoTheme(p) {
    if (store.get("theme")) return; // user chose manually, respect it
    const btn = $("#themeBtn"), isDark = document.documentElement.dataset.theme === "dark";
    if (!btn) return;
    if (p === "night" && !isDark) { btn.click(); store.del("theme"); autoDark = true; }
    else if (p !== "night" && autoDark && isDark) { btn.click(); store.del("theme"); autoDark = false; }
  }

  function build() {
    const p = cur(), n = small ? 0.6 : 1, o = [];
    const wet = wx && ["rain", "storm", "snow"].includes(wx.kind);
    scene.className = "p-" + p + (wx ? " w-" + wx.kind : "");
    o.push('<div class="sky"></div>');
    o.push(p === "night" ? '<div class="moon">🌙</div>' : '<div class="sun"></div>');
    if (p === "night") for (let i = 0; i < 60 * n; i++) { const s = rand(1, 3); o.push(`<i class="star" style="left:${rand(0, 100)}%;top:${rand(0, 60)}%;width:${s}px;height:${s}px;animation-delay:${rand(0, 3)}s"></i>`); }
    const cc = wx ? { clear: 2, cloudy: 7, fog: 5, rain: 8, storm: 8, snow: 7 }[wx.kind] : 4;
    for (let i = 0; i < cc; i++) o.push(`<span class="cloud" style="top:${rand(2, 38)}%;font-size:${rand(40, 90)}px;animation-duration:${rand(50, 110)}s;animation-delay:-${rand(0, 90)}s">☁️</span>`);
    if (wx && wx.kind === "fog") o.push('<div class="fog"></div>');
    o.push('<div class="hill h1"></div><div class="hill h2"></div>');
    const fl = p === "morning" ? ["🌼", "🌷", "🌸", "🌻", "🌿"] : p === "afternoon" ? ["🌻", "🌼", "🌺", "🌹", "🌿"] : ["🌸", "🌷", "🌺", "🌼", "🌿"];
    const fc = Math.round(innerWidth / (small ? 40 : 48));
    for (let i = 0; i < fc; i++) o.push(`<span class="flower" style="left:${(i / fc) * 100 + rand(-1, 1)}%;bottom:${rand(-1, 7)}vh;font-size:${rand(26, 48)}px;animation-delay:-${rand(0, 4)}s">${pick(fl)}</span>`);
    if (!wet && (p === "morning" || p === "evening")) for (let i = 0; i < 5; i++) o.push(`<span class="fly" style="top:${rand(8, 30)}%;font-size:${rand(24, 34)}px;animation-duration:${rand(14, 24)}s;animation-delay:-${rand(0, 14)}s">${pick(["🐦", "🕊️", "🦜", "🦅", "🐦"])}</span>`);
    if (!wet && (p === "morning" || p === "afternoon")) for (let i = 0; i < 3; i++) o.push(`<span class="fly" style="top:${rand(45, 72)}%;font-size:26px;animation-duration:${rand(18, 30)}s;animation-delay:-${rand(0, 18)}s">🦋</span>`);
    if (p === "night") for (let i = 0; i < 16 * n; i++) o.push(`<i class="ff" style="left:${rand(2, 98)}%;top:${rand(50, 92)}%;animation-delay:-${rand(0, 6)}s;animation-duration:${rand(5, 9)}s"></i>`);
    if (wx && (wx.kind === "rain" || wx.kind === "storm")) {
      for (let i = 0; i < 70 * n; i++) o.push(`<i class="drop" style="left:${rand(0, 105)}%;animation-duration:${rand(0.6, 1.1)}s;animation-delay:-${rand(0, 1)}s"></i>`);
      if (wx.kind === "storm") o.push('<div class="flash"></div>');
    }
    if (wx && wx.kind === "snow") for (let i = 0; i < 45 * n; i++) o.push(`<span class="snow" style="left:${rand(0, 100)}%;font-size:${rand(10, 22)}px;--sw:${rand(-60, 60)}px;animation-duration:${rand(6, 12)}s;animation-delay:-${rand(0, 10)}s">❄</span>`);
    scene.innerHTML = o.join("");
    autoTheme(p);
  }

  /* ---------- chips: scene switcher + bird sounds ---------- */
  const stats = $(".stats");
  const announce = () => window.dispatchEvent(new CustomEvent("scenechange", { detail: cur() }));
  const sceneBtn = document.createElement("button");
  sceneBtn.className = "chip";
  function sceneLabel() { sceneBtn.textContent = "🎨 Scene: " + (mode === "auto" ? "Auto" : LABEL[mode]); }
  sceneLabel();
  sceneBtn.onclick = () => {
    const all = ["auto", ...PERIODS];
    mode = all[(all.indexOf(mode) + 1) % all.length];
    store.set("sceneMode", mode); sceneLabel(); build(); announce();
  };
  const birdBtn = document.createElement("button");
  birdBtn.className = "chip"; birdBtn.textContent = "🐦 Bird sounds: Off";
  let birdOn = false, birdT;
  const BV = { morning: ["birds", "sparrow", "dove", "chick"], afternoon: ["sparrow", "parrot", "birds", "dove"], evening: ["dove", "birds", "sparrow"], night: ["owl"] };
  function birdLoop() {
    if (!birdOn) return;
    if (window.EW) window.EW.play(pick(BV[cur()]));
    birdT = setTimeout(birdLoop, rand(4500, 9000));
  }
  birdBtn.onclick = () => {
    birdOn = !birdOn; clearTimeout(birdT);
    birdBtn.textContent = birdOn ? "🐦 Bird sounds: On" : "🐦 Bird sounds: Off";
    if (birdOn) birdLoop();
  };
  if (stats) stats.append(sceneBtn, birdBtn);

  // used by info.js (weather) and music.js (period)
  window.EWScene = { period: cur, setWeather(w) { wx = w; build(); announce(); } };

  // wait for script.js to bind the theme button before the first build (auto dark mode at night)
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build); else build();
  setInterval(() => { if (mode === "auto") build(); }, 10 * 60 * 1000);
})();
