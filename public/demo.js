(() => {
  const $ = (id) => document.getElementById(id);

  // default base url
  $("baseUrl").value = location.origin;

  const SIGNS = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
  const SIGN_GLYPH = {
    Aries:"♈", Taurus:"♉", Gemini:"♊", Cancer:"♋", Leo:"♌", Virgo:"♍",
    Libra:"♎", Scorpio:"♏", Sagittarius:"♐", Capricorn:"♑", Aquarius:"♒", Pisces:"♓"
  };

  const BODY_LABEL = {
    ascendant:"ASC", mc:"MC",
    sun:"Sun", moon:"Moon",
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
    } catch {
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
    const ep0 = $("endpoint").value.trim();
    const ep = ep0.startsWith("/") ? ep0 : "/" + ep0;
    return base + ep;
  }

  function fmtBody(b) {
    if (!b) return "-";
    const sign = b.sign ?? "-";
    const deg = (typeof b.degreeInSign === "number") ? b.degreeInSign.toFixed(2) : (b.degreeInSign ?? "-");
    const lon = (typeof b.longitude === "number") ? b.longitude.toFixed(4) : (b.longitude ?? "-");
    const house = (typeof b.house === "number") ? `, H${b.house}` : "";
    return `${sign} ${deg}° (${lon}°)${house}`;
  }

  async function copyText(s) {
    try {
      await navigator.clipboard.writeText(s);
      setStatus("Kopiert.", "ok");
    } catch {
      setStatus("Copy fehlgeschlagen (Browser-Rechte).", "error");
    }
  }

  function buildCurl(reqObj) {
    const url = apiUrl();
    const apiKey = $("apiKey").value.trim();
    const auth = apiKey ? (apiKey.startsWith("Bearer ") ? apiKey : `Bearer ${apiKey}`) : "";

    // Works in bash/zsh. For PowerShell use Invoke-RestMethod.
    const lines = [
      `curl -X POST "${url}" \\`,
      `  -H "Content-Type: application/json" \\`
    ];
    if (auth) lines.push(`  -H "Authorization: ${auth}" \\`);
    lines.push(`  -d '${JSON.stringify(reqObj)}'`);
    return lines.join("\n");
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
      renderSummary(null);
      renderTables(null);
      drawWheel(null);
      $("btnRun").disabled = false;
      return;
    }

    $("outJson").textContent = JSON.stringify(data, null, 2);
    $("outIssues").textContent = JSON.stringify(data.issues ?? [], null, 2);

    setStatus("OK", "ok");
    renderSummary(data);
    renderTables(data);
    drawWheel(data);
    $("btnRun").disabled = false;
  }

  function renderSummary(data) {
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

    if (!data?.result) {
      addKV("Status", "Keine Daten");
      $("chips").innerHTML = "";
      return;
    }

    const r = data.result ?? {};
    const t = data?.normalized?.time ?? data?.normalized ?? {};

    addKV("TZ", t.tz ?? "-");
    addKV("Local", t.localIso ?? "-");
    addKV("UTC", t.utcIso ?? "-");
    addKV("JD (UT)", typeof t.jdUt === "number" ? t.jdUt.toFixed(8) : "-");

    addKV("ASC", fmtBody(r.ascendant));
    if (r.mc) addKV("MC", fmtBody(r.mc));
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

    if (r.chartRuler) {
      chips.appendChild(chip(`Chart ruler: ${r.chartRuler.body ?? r.chartRuler}`));
      if (r.chartRuler.sign) chips.appendChild(chip(`Ruler sign: ${r.chartRuler.sign}`));
      if (typeof r.chartRuler.house === "number") chips.appendChild(chip(`Ruler house: H${r.chartRuler.house}`));
    }

    if (r.houses?.system) chips.appendChild(chip(`Houses: system=${r.houses.system}`));
  }

  function renderTables(data) {
    const planetTbody = $("planetTable").querySelector("tbody");
    const houseTbody = $("houseTable").querySelector("tbody");
    planetTbody.innerHTML = "";
    houseTbody.innerHTML = "";

    if (!data?.result) return;

    const r = data.result;

    // Planets table: include sun/moon/asc + planets object
    const rows = [];

    if (r.ascendant) rows.push({ key: "ascendant", ...r.ascendant });
    if (r.mc) rows.push({ key: "mc", ...r.mc });
    if (r.sun) rows.push({ key: "sun", ...r.sun });
    if (r.moon) rows.push({ key: "moon", ...r.moon });

    if (r.planets) {
      for (const [k, v] of Object.entries(r.planets)) {
        if (!v) continue;
        rows.push({ key: k, ...v });
      }
    }

    for (const p of rows) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(BODY_LABEL[p.key] ?? p.key)}</td>
        <td>${escapeHtml((SIGN_GLYPH[p.sign] ? SIGN_GLYPH[p.sign] + " " : "") + (p.sign ?? "-"))}</td>
        <td class="mono">${typeof p.longitude === "number" ? p.longitude.toFixed(6) : "-"}</td>
        <td class="mono">${typeof p.degreeInSign === "number" ? p.degreeInSign.toFixed(6) : "-"}</td>
        <td>${typeof p.house === "number" ? "H" + p.house : "-"}</td>
      `;
      planetTbody.appendChild(tr);
    }

    // Houses table: cusps 1..12 expected at result.houses.cusps
    const cusps = r.houses?.cusps;
    if (Array.isArray(cusps) && cusps.length >= 12) {
      for (let i = 0; i < 12; i++) {
        const lon = cusps[i];
        const z = (typeof lon === "number") ? zodiacFromLongitude(lon) : null;
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>H${i+1}</td>
          <td>${z ? escapeHtml((SIGN_GLYPH[z.sign] ? SIGN_GLYPH[z.sign] + " " : "") + z.sign) : "-"}</td>
          <td class="mono">${typeof lon === "number" ? lon.toFixed(6) : "-"}</td>
          <td class="mono">${z ? z.degreeInSign.toFixed(6) : "-"}</td>
        `;
        houseTbody.appendChild(tr);
      }
    }
  }

  function chip(text) {
    const d = document.createElement("div");
    d.className = "chip";
    d.textContent = text;
    return d;
  }

  function zodiacFromLongitude(lon) {
    const v = clamp360(lon);
    if (v == null) return null;
    const idx = Math.floor(v / 30);
    const sign = SIGNS[idx] ?? "Aries";
    return { sign, degreeInSign: v - idx * 30 };
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

    const r = data.result;

    // optional houses
    const showHouses = $("toggleHouses").checked;
    if (showHouses && Array.isArray(r.houses?.cusps) && r.houses.cusps.length >= 12) {
      const cusps = r.houses.cusps;

      for (let i = 0; i < 12; i++) {
        const lon = clamp360(cusps[i]);
        if (lon == null) continue;
        const a = degToRad(lon);
        linePolar(ctx, cx, cy, R*0.7, R, a, "rgba(180,180,180,.45)", 1);
      }

      // mark ASC/MC
      if (r.ascendant?.longitude != null) drawMarker(ctx, cx, cy, R, r.ascendant.longitude, "ASC");
      if (r.mc?.longitude != null) drawMarker(ctx, cx, cy, R, r.mc.longitude, "MC");
    }

    // collect bodies
    const bodies = [];
    if (r.sun?.longitude != null) bodies.push({ key: "sun", lon: r.sun.longitude, sign: r.sun.sign });
    if (r.moon?.longitude != null) bodies.push({ key: "moon", lon: r.moon.longitude, sign: r.moon.sign });
    if (r.ascendant?.longitude != null) bodies.push({ key: "ascendant", lon: r.ascendant.longitude, sign: r.ascendant.sign });
    if (r.planets) {
      for (const [k, v] of Object.entries(r.planets)) {
        if (v && v.longitude != null) bodies.push({ key: k, lon: v.longitude, sign: v.sign });
      }
    }

    // plot points + labels
    const used = new Map(); // lon bucket -> count (to jitter labels)
    for (const b of bodies) {
      const lon = clamp360(b.lon);
      if (lon == null) continue;

      const a = degToRad(lon);
      const px = cx + Math.cos(a) * (R*0.7);
      const py = cy - Math.sin(a) * (R*0.7);

      ctx.fillStyle = "rgba(220,220,220,.95)";
      ctx.strokeStyle = "rgba(40,40,40,.4)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(px, py, 5.5, 0, Math.PI*2); ctx.fill(); ctx.stroke();

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

    ctx.fillStyle = "rgba(127,127,127,.9)";
    ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    drawCentered(ctx, "0° Aries →", cx + R*0.55, cy + 14);
  }

  function drawMarker(ctx, cx, cy, R, lon, label) {
    const a = degToRad(clamp360(lon) ?? 0);
    const x = cx + Math.cos(a) * (R*0.98);
    const y = cy - Math.sin(a) * (R*0.98);

    ctx.save();
    ctx.fillStyle = "rgba(127,127,127,.9)";
    ctx.strokeStyle = "rgba(0,0,0,.35)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(245,245,245,.95)";
    ctx.font = "11px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    drawCentered(ctx, label, x, y);
    ctx.restore();
  }

  function degToRad(deg) {
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

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function wire() {
    $("btnRun").addEventListener("click", callApi);

    $("btnFillExample").addEventListener("click", () => {
      $("baseUrl").value = location.origin.includes("localhost") ? "http://localhost:3000" : location.origin;
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
      drawWheel(null);
    });

    $("btnCopyJson").addEventListener("click", () => {
      const reqObj = getRequestPreview();
      if (!reqObj) return setStatus("Request JSON ist ungültig.", "error");
      copyText(JSON.stringify(reqObj, null, 2));
    });

    $("btnCopyCurl").addEventListener("click", () => {
      const reqObj = getRequestPreview();
      if (!reqObj) return setStatus("Request JSON ist ungültig.", "error");
      copyText(buildCurl(reqObj));
    });

    $("toggleHouses").addEventListener("change", () => {
      // redraw using current output if any
      try {
        const out = JSON.parse($("outJson").textContent || "{}");
        drawWheel(out?.result ? out : null);
      } catch {
        drawWheel(null);
      }
    });

    // live update preview from inputs
    for (const id of ["date","time","lat","lon","tz","houseSystem"]) {
      $(id).addEventListener("input", () => setRequestPreview(buildRequestFromFields()));
    }

    // init
    setRequestPreview(buildRequestFromFields());
    renderSummary(null);
    renderTables(null);
    drawWheel(null);
  }

  wire();
})();
