  document.getElementById("baseUrl").value = location.origin;
  
  const $ = (id) => document.getElementById(id);

  const SIGNS = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
  const SIGN_GLYPH = {
    Aries:"♈", Taurus:"♉", Gemini:"♊", Cancer:"♋", Leo:"♌", Virgo:"♍",
    Libra:"♎", Scorpio:"♏", Sagittarius:"♐", Capricorn:"♑", Aquarius:"♒", Pisces:"♓"
  };
  const BODY_LABEL = {
    sun:"Sun", moon:"Moon", ascendant:"ASC",
    mercury:"Mercury", venus:"Venus", mars:"Mars", jupiter:"Jupiter", saturn:"Saturn",
    uranus:"Uranus", neptune:"Neptune", pluto:"Pluto"
  };

  function clamp360(x) {
    let v = Number(x);
    if (!Number.isFinite(v)) return null;
    v = v % 360;
    if (v < 0) v += 360;
    return v;
  }

  function buildRequestFromFields() {
    const date = $("date").value.trim();
    const time = $("time").value.trim();
    const lat = Number($("lat").value);
    const lon = Number($("lon").value);
    const tz = $("tz").value.trim();
    const houseSystem = $("houseSystem").value.trim();

    const body = { date, time, lat, lon };
    if (tz) body.tz = tz;
    if (houseSystem) body.houseSystem = houseSystem;
    return body;
  }

  function setRequestPreview(obj) {
    $("requestPreview").value = JSON.stringify(obj, null, 2);
  }

  function getRequestPreview() {
    try {
      return JSON.parse($("requestPreview").value);
    } catch (e) {
      return null;
    }
  }

  function setStatus(text, kind) {
    const el = $("status");
    el.textContent = text || "";
    el.className = kind === "error" ? "hint error" : kind === "ok" ? "hint ok" : "hint";
  }

  function apiUrl() {
    const base = $("baseUrl").value.trim().replace(/\/+$/,"");
    const ep = $("endpoint").value.trim().startsWith("/") ? $("endpoint").value.trim() : "/" + $("endpoint").value.trim();
    return base + ep;
  }

  async function callApi() {
    setStatus("Sende Request ...");
    $("btnRun").disabled = true;

    const reqObj = getRequestPreview();
    if (!reqObj) {
      setStatus("Request JSON ist ungültig.", "error");
      $("btnRun").disabled = false;
      return;
    }

    const headers = { "Content-Type": "application/json" };
    const apiKey = $("apiKey").value.trim();
    if (apiKey) headers["Authorization"] = apiKey.startsWith("Bearer ") ? apiKey : `Bearer ${apiKey}`;

    let res, text;
    const url = apiUrl();

    try {
      res = await fetch(url, { method: "POST", headers, body: JSON.stringify(reqObj) });
      text = await res.text();
    } catch (e) {
      setStatus("Netzwerkfehler: " + String(e), "error");
      $("btnRun").disabled = false;
      return;
    }

    $("httpMeta").textContent = `HTTP ${res.status}`;

    let data = null;
    try { data = JSON.parse(text); } catch {}

    if (!res.ok) {
      $("outJson").textContent = text || "{}";
      $("outIssues").textContent = JSON.stringify(data?.details ?? data?.issues ?? [], null, 2);
      setStatus("Fehler (siehe JSON/Issues).", "error");
      drawWheel(null);
      $("btnRun").disabled = false;
      return;
    }

    $("outJson").textContent = JSON.stringify(data, null, 2);
    $("outIssues").textContent = JSON.stringify(data.issues ?? [], null, 2);

    setStatus("OK", "ok");
    renderSummary(data);
    drawWheel(data);
    $("btnRun").disabled = false;
  }

  function renderSummary(data) {
    const r = data?.result ?? {};
    const t = data?.normalized?.time ?? data?.normalized ?? {};

    const summary = $("summary");
    summary.innerHTML = "";

    const addKV = (k, v) => {
      const dk = document.createElement("div");
      dk.textContent = k;
      const dv = document.createElement("div");
      dv.textContent = v;
      summary.appendChild(dk);
      summary.appendChild(dv);
    };

    addKV("TZ", t.tz ?? "-");
    addKV("Local", t.localIso ?? "-");
    addKV("UTC", t.utcIso ?? "-");
    addKV("JD (UT)", typeof t.jdUt === "number" ? t.jdUt.toFixed(8) : "-");

    const fmtBody = (b) => b ? `${b.sign} ${b.degreeInSign?.toFixed?.(2) ?? b.degreeInSign}°` : "-";
    addKV("ASC", fmtBody(r.ascendant));
    addKV("Sun", fmtBody(r.sun));
    addKV("Moon", fmtBody(r.moon));

    const chips = $("chips");
    chips.innerHTML = "";

    const el = r.elements;
    if (el) {
      chips.appendChild(chip(`Elements: dominant=${el.dominant}${el.triple ? `, triple=${el.triple}` : ""}`));
      if (el.counts) chips.appendChild(chip(`Counts: fire=${el.counts.fire} earth=${el.counts.earth} air=${el.counts.air} water=${el.counts.water}`));
      if (el.label) chips.appendChild(chip(`Label: ${el.label}`));
    }

    if (r.planets) {
      const keys = Object.keys(r.planets);
      chips.appendChild(chip(`Planets: ${keys.join(", ")}`));
    }
  }

  function chip(text) {
    const d = document.createElement("div");
    d.className = "chip";
    d.textContent = text;
    return d;
  }

  function drawWheel(data) {
    const canvas = $("wheel");
    const ctx = canvas.getContext("2d");

    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // background
    ctx.fillStyle = getComputedStyle(document.body).backgroundColor;
    ctx.fillRect(0, 0, W, H);

    const cx = W / 2, cy = H / 2;
    const R = Math.min(W, H) * 0.42;

    // rings
    ctx.strokeStyle = "rgba(127,127,127,.7)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI*2); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, R*0.7, 0, Math.PI*2); ctx.stroke();

    // sign separators
    for (let i = 0; i < 12; i++) {
      const deg = i * 30;
      const a = degToRad(deg);
      linePolar(ctx, cx, cy, R*0.7, R, a, "rgba(127,127,127,.55)", 1);
    }

    // sign labels
    ctx.font = "16px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillStyle = "rgba(127,127,127,.95)";
    for (let i = 0; i < 12; i++) {
      const mid = i*30 + 15;
      const a = degToRad(mid);
      const x = cx + Math.cos(a) * (R*0.86);
      const y = cy - Math.sin(a) * (R*0.86);
      const sign = SIGNS[i];
      const label = `${SIGN_GLYPH[sign] ?? ""} ${sign}`;
      drawCentered(ctx, label, x, y);
    }

    if (!data?.result) {
      ctx.fillStyle = "rgba(127,127,127,.85)";
      ctx.font = "14px system-ui, -apple-system, Segoe UI, Roboto, Arial";
      drawCentered(ctx, "Keine Daten", cx, cy);
      return;
    }

    const bodies = [];
    const r = data.result;

    // core bodies
    if (r.sun?.longitude != null) bodies.push({ key: "sun", lon: r.sun.longitude, sign: r.sun.sign });
    if (r.moon?.longitude != null) bodies.push({ key: "moon", lon: r.moon.longitude, sign: r.moon.sign });
    if (r.ascendant?.longitude != null) bodies.push({ key: "ascendant", lon: r.ascendant.longitude, sign: r.ascendant.sign });

    // planets
    if (r.planets) {
      for (const [k, v] of Object.entries(r.planets)) {
        if (v && v.longitude != null) bodies.push({ key: k, lon: v.longitude, sign: v.sign });
      }
    }

    // plot
    const used = new Map(); // lon bucket -> count (to jitter labels)
    for (const b of bodies) {
      const lon = clamp360(b.lon);
      if (lon == null) continue;

      const a = degToRad(lon);
      const px = cx + Math.cos(a) * (R*0.7);
      const py = cy - Math.sin(a) * (R*0.7);

      // point
      ctx.fillStyle = "rgba(220,220,220,.95)";
      ctx.strokeStyle = "rgba(40,40,40,.4)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(px, py, 5.5, 0, Math.PI*2); ctx.fill(); ctx.stroke();

      // label with small jitter if same bucket
      const bucket = Math.round(lon * 2) / 2; // 0.5° bucket
      const n = (used.get(bucket) ?? 0);
      used.set(bucket, n + 1);

      const lx = cx + Math.cos(a) * (R*0.78);
      const ly = cy - Math.sin(a) * (R*0.78) + n * 12;

      ctx.fillStyle = "rgba(240,240,240,.95)";
      ctx.font = "13px system-ui, -apple-system, Segoe UI, Roboto, Arial";

      const signGlyph = SIGN_GLYPH[b.sign] ? SIGN_GLYPH[b.sign] + " " : "";
      const name = BODY_LABEL[b.key] ?? b.key;
      const text = `${name} ${signGlyph}${lon.toFixed(1)}°`;
      drawWithOutline(ctx, text, lx, ly);
    }

    // center label
    ctx.fillStyle = "rgba(127,127,127,.9)";
    ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    drawCentered(ctx, "0° Aries →", cx + R*0.55, cy + 14);
  }

  function degToRad(deg) {
    // 0° on +X axis, increasing counter-clockwise.
    return deg * Math.PI / 180;
  }

  function linePolar(ctx, cx, cy, r1, r2, a, stroke, w) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r1, cy - Math.sin(a) * r1);
    ctx.lineTo(cx + Math.cos(a) * r2, cy - Math.sin(a) * r2);
    ctx.stroke();
  }

  function drawCentered(ctx, text, x, y) {
    const m = ctx.measureText(text);
    ctx.fillText(text, x - m.width / 2, y + 5);
  }

  function drawWithOutline(ctx, text, x, y) {
    ctx.save();
    ctx.strokeStyle = "rgba(0,0,0,.45)";
    ctx.lineWidth = 4;
    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function wire() {
    $("btnRun").addEventListener("click", callApi);

    $("btnFillExample").addEventListener("click", () => {
      $("baseUrl").value = "http://localhost:3000";
      $("endpoint").value = "/v1/astro/chart";
      $("date").value = "1998-07-12";
      $("time").value = "14:35";
      $("lat").value = "50.94";
      $("lon").value = "6.96";
      $("tz").value = "Europe/Berlin";
      $("houseSystem").value = "P";
      $("apiKey").value = "";
      setRequestPreview(buildRequestFromFields());
      setStatus("Beispiel gesetzt.");
    });

    // live update preview from inputs
    for (const id of ["date","time","lat","lon","tz","houseSystem"]) {
      $(id).addEventListener("input", () => setRequestPreview(buildRequestFromFields()));
    }
    $("baseUrl").addEventListener("input", () => {});
    $("endpoint").addEventListener("input", () => {});

    // init
    setRequestPreview(buildRequestFromFields());
    drawWheel(null);
  }

  wire();