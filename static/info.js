/* Today card: live date/time, calendar, auto location + weather (Open-Meteo, no API key) */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  if (!$("today")) return;
  const CFG = window.SITE_CONFIG || {}, WC = CFG.weather || {};
  const locale = CFG.locale || "en-IN", hour12 = CFG.hour12 !== false, wk = CFG.weekStart === 1 ? 1 : 0;
  const unit = WC.unit === "F" ? "F" : "C";
  const FALLBACK = WC.fallback || { city: "New Delhi", country: "India", lat: 28.61, lon: 77.21 };
  const set = (id, t) => { const e = $(id); if (e) e.textContent = t; };
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} }
  };
  const loadLoc = () => { try { return JSON.parse(store.get("ew_loc")); } catch { return null; } };

  /* ---------- date, time, calendar ---------- */
  let dayKey = "";
  const greeting = (h) => (h < 5 ? "🌙 Good Night" : h < 12 ? "🌞 Good Morning" : h < 17 ? "☀️ Good Afternoon" : h < 20 ? "🌇 Good Evening" : "🌙 Good Night");
  function isoWeek(d) {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())), day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    return Math.ceil(((t - new Date(Date.UTC(t.getUTCFullYear(), 0, 1))) / 864e5 + 1) / 7);
  }
  function renderCal(d) {
    const el = $("cal"); if (!el) return;
    if (CFG.showCalendar === false) { el.hidden = true; return; }
    const y = d.getFullYear(), m = d.getMonth();
    const first = (new Date(y, m, 1).getDay() - wk + 7) % 7, days = new Date(y, m + 1, 0).getDate();
    const names = [...Array(7)].map((_, i) => new Date(2023, 0, 1 + ((i + wk) % 7)).toLocaleDateString(locale, { weekday: "narrow" }));
    let h = `<div class="cal-head"><span>${d.toLocaleDateString(locale, { month: "long" })}</span><span>${y}</span></div><div class="cal-grid">` + names.map((n) => `<b>${n}</b>`).join("");
    for (let i = 0; i < first; i++) h += "<span></span>";
    for (let n = 1; n <= days; n++) h += `<span${n === d.getDate() ? ' class="today"' : ""}>${n}</span>`;
    el.innerHTML = h + "</div>";
  }
  function renderDate(d) {
    set("tDay", d.toLocaleDateString(locale, { weekday: "long" }));
    set("tDate", d.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" }));
    const y = d.getFullYear(), doy = Math.floor((d - new Date(y, 0, 0)) / 864e5), total = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365;
    set("tWeek", "Week " + isoWeek(d));
    set("tYear", `Day ${doy} of ${total} · ${total - doy} left`);
    renderCal(d);
  }
  function tick() {
    const d = new Date();
    set("tTime", d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12 }));
    set("tGreet", greeting(d.getHours()) + (CFG.userName ? ", " + CFG.userName : ""));
    if (d.toDateString() !== dayKey) { dayKey = d.toDateString(); renderDate(d); }
  }
  tick(); setInterval(tick, 1000);

  /* ---------- weather ---------- */
  const kindOf = (c) => (c === 0 || c === 1 ? "clear" : c === 2 || c === 3 ? "cloudy" : c === 45 || c === 48 ? "fog" : (c >= 71 && c <= 77) || c === 85 || c === 86 ? "snow" : c >= 95 ? "storm" : c >= 51 ? "rain" : "clear");
  function wxInfo(c, day) {
    if (c === 0) return [day ? "☀️" : "🌙", "Clear sky"];
    if (c === 1) return [day ? "🌤️" : "🌙", "Mainly clear"];
    if (c === 2) return ["⛅", "Partly cloudy"];
    if (c === 3) return ["☁️", "Overcast"];
    if (c === 45 || c === 48) return ["🌫️", "Foggy"];
    if (c >= 51 && c <= 57) return ["🌦️", "Drizzle"];
    if (c >= 61 && c <= 67) return ["🌧️", "Rain"];
    if (c >= 71 && c <= 77) return ["❄️", "Snow"];
    if (c >= 80 && c <= 82) return ["🌦️", "Rain showers"];
    if (c === 85 || c === 86) return ["🌨️", "Snow showers"];
    if (c >= 95) return ["⛈️", "Thunderstorm"];
    return ["🌡️", "Weather"];
  }
  const TIPS = {
    clear: "☀️ Beautiful clear sky today. Go outside and smile!",
    cloudy: "⛅ Soft clouds today. Cozy vibes!",
    fog: "🌫️ Misty and mysterious. Drive safe!",
    rain: "🌧️ It's raining! Perfect time for chai ☕ and good vibes.",
    snow: "❄️ Snow day! Time for hot chocolate 🍫",
    storm: "⛈️ Thunder outside, smiles inside. Stay safe!"
  };
  const t12 = (s) => {
    const hh = s.slice(11, 16), [H, M] = hh.split(":").map(Number);
    return hour12 ? `${H % 12 || 12}:${String(M).padStart(2, "0")} ${H < 12 ? "AM" : "PM"}` : hh;
  };
  let current = null, tipShown = false;

  async function show(loc) {
    set("wStatus", "⏳ Updating weather...");
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${(+loc.lat).toFixed(2)}&longitude=${(+loc.lon).toFixed(2)}`
      + "&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day,wind_speed_10m"
      + "&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset&forecast_days=4&timezone=auto"
      + `&temperature_unit=${unit === "F" ? "fahrenheit" : "celsius"}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error("weather");
    const j = await r.json(), c = j.current, dd = j.daily, deg = (v) => Math.round(v) + "°" + unit;
    const [icon, text] = wxInfo(c.weather_code, c.is_day === 1);
    set("wLoc", [loc.city, loc.country].filter(Boolean).join(", ") || "Your location");
    set("wIcon", icon); set("wTemp", deg(c.temperature_2m)); set("wCond", text);
    set("wFeels", deg(c.apparent_temperature)); set("wHum", c.relative_humidity_2m + "%"); set("wWind", Math.round(c.wind_speed_10m) + " km/h");
    set("wHi", deg(dd.temperature_2m_max[0])); set("wLo", deg(dd.temperature_2m_min[0]));
    set("wRise", t12(dd.sunrise[0])); set("wSet", t12(dd.sunset[0]));
    const fc = $("forecast");
    if (fc) {
      if (WC.showForecast === false) fc.hidden = true;
      else fc.innerHTML = [1, 2, 3].map((i) => {
        const nm = new Date(dd.time[i] + "T12:00:00").toLocaleDateString(locale, { weekday: "short" });
        return `<div class="fday"><b>${nm}</b><span>${wxInfo(dd.weather_code[i], true)[0]}</span><small>${Math.round(dd.temperature_2m_max[i])}° / ${Math.round(dd.temperature_2m_min[i])}°</small></div>`;
      }).join("");
    }
    const how = loc.src === "gps" ? "📡 exact location" : loc.src === "ip" ? "🌐 approximate location (from network)" : "📌 default city";
    set("wStatus", `Updated ${new Date().toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hour12 })} · ${how}`);
    const kind = kindOf(c.weather_code);
    if (window.EWScene) window.EWScene.setWeather({ kind, t: Math.round(c.temperature_2m) });
    if (!tipShown) { tipShown = true; const m = $("message"); if (m) m.textContent = TIPS[kind]; }
    current = loc;
  }

  /* ---------- location: network (instant) -> GPS (exact, if allowed) ---------- */
  async function ipLoc() {
    const tries = [
      ["https://ipwho.is/", (j) => (j.success ? { lat: j.latitude, lon: j.longitude, city: j.city, country: j.country } : null)],
      ["https://ipapi.co/json/", (j) => (j.latitude ? { lat: j.latitude, lon: j.longitude, city: j.city, country: j.country_name } : null)]
    ];
    for (const [u, f] of tries) {
      try { const l = f(await (await fetch(u)).json()); if (l) return { ...l, src: "ip" }; } catch {}
    }
    return null;
  }
  async function nameOf(lat, lon) {
    try {
      const j = await (await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`)).json();
      return { city: j.city || j.locality || j.principalSubdivision || "", country: j.countryName || "" };
    } catch { return { city: "", country: "" }; }
  }
  function gps(manual) {
    return new Promise((res) => {
      if (!navigator.geolocation) { if (manual) set("wStatus", "Location is not supported on this browser."); return res(null); }
      set("wStatus", "🎯 Asking for exact location...");
      navigator.geolocation.getCurrentPosition(async (p) => {
        const lat = p.coords.latitude, lon = p.coords.longitude, n = await nameOf(lat.toFixed(3), lon.toFixed(3));
        res({ lat, lon, ...n, src: "gps" });
      }, () => {
        set("wStatus", manual ? "Location blocked. Allow it from the 🔒 icon in the address bar." : "🌐 Using approximate location. Tap 🎯 for exact.");
        res(null);
      }, { timeout: 12000, maximumAge: 600000 });
    });
  }
  async function useGps(manual) {
    const g = await gps(manual);
    if (!g) return;
    store.set("ew_loc", JSON.stringify(g));
    try { await show(g); } catch { set("wStatus", "⚠️ Weather unavailable. Tap Refresh."); }
  }

  async function boot() {
    const saved = loadLoc();
    const loc = saved || (await ipLoc()) || { ...FALLBACK, src: "default" };
    try { await show(loc); } catch { set("wStatus", "⚠️ Weather unavailable. Check internet and tap Refresh."); }
    if (WC.askPreciseLocation !== false && (!saved || saved.src !== "gps") && navigator.geolocation) {
      let st = "prompt";
      try { st = (await navigator.permissions.query({ name: "geolocation" })).state; } catch {}
      if (st !== "denied") await useGps(false);
    }
  }
  $("wRefresh").onclick = async () => {
    try { await show(current || loadLoc() || (await ipLoc()) || { ...FALLBACK, src: "default" }); }
    catch { set("wStatus", "⚠️ Weather unavailable. Check internet and try again."); }
  };
  $("wGps").onclick = () => useGps(true);
  setInterval(() => { if (current) show(current).catch(() => {}); }, Math.max(5, WC.refreshMinutes || 30) * 60000);
  boot();
})();
