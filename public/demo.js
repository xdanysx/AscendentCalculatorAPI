(() => {
  const $ = (id) => document.getElementById(id);

  $("baseUrl").value = location.origin;

  const ZEICHEN = ["Widder","Stier","Zwillinge","Krebs","Löwe","Jungfrau","Waage","Skorpion","Schütze","Steinbock","Wassermann","Fische"];
  const ZEICHEN_GLYPH = {
    Widder:"♈", Stier:"♉", Zwillinge:"♊", Krebs:"♋", Löwe:"♌", Jungfrau:"♍",
    Waage:"♎", Skorpion:"♏", Schütze:"♐", Steinbock:"♑", Wassermann:"♒", Fische:"♓"
  };

  const KOERPER_LABEL = {
    sun:"Sonne",
    moon:"Mond",
    ascendant:"Aszendent",
    mc:"Medium Coeli",
    mercury:"Merkur",
    venus:"Venus",
    mars:"Mars",
    jupiter:"Jupiter",
    saturn:"Saturn",
    uranus:"Uranus",
    neptune:"Neptun",
    pluto:"Pluto"
  };

  function clamp360(x) {
    let v = Number(x);
    if (!Number.isFinite(v)) return null;
    v = v % 360;
    if (v < 0) v += 360;
    return v;
  }

  function apiUrl() {
    const base = $("baseUrl").value.trim().replace(/\/+$/,"");
    const ep0 = $("endpoint").value.trim();
    const ep = ep0.startsWith("/") ? ep0 : "/" + ep0;
    return base + ep;
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
    try { return JSON.parse($("requestPreview").value); } catch { return null; }
  }

  function setStatus(text, kind) {
    const el = $("status");
    el.textContent = text || "";
    el.className = kind === "error" ? "hint error" : kind === "ok" ? "hint ok" : "hint";
  }

  async function copyText(s) {
    try {
      await navigator.clipboard.writeText(s);
      setStatus("Kopiert.", "ok");
    } catch {
      setStatus("Kopieren fehlgeschlagen (Browser-Rechte).", "error");
    }
  }

  function buildCurl(reqObj) {
    const url = apiUrl();
    const apiKey = $("apiKey").value.trim();
    const auth = apiKey ? (apiKey.startsWith("Bearer ") ? apiKey : `Bearer ${apiKey}`) : "";

    const lines = [
      `curl -X POST "${url}" \\`,
      `  -H "Content-Type: application/json" \\`
    ];
    if (auth) lines.push(`  -H "Authorization: ${auth}" \\`);
    lines.push(`  -d '${JSON.stringify(reqObj)}'`);
    return lines.join("\n");
  }

  function zeichenAusLaenge(lon) {
    const v = clamp360(lon);
    if (v == null) return null;
    const idx = Math.floor(v / 30);
    const sign = ZEICHEN[idx] ?? "Widder";
    return { sign, gradImZeichen: v - idx * 30 };
  }

  function formatZeichen(sign) {
    if (!sign) return "-";
    const g = ZEICHEN_GLYPH[sign] ? ZEICHEN_GLYPH[sign] + " " : "";
    return g + sign;
  }

  // Hauszuordnung: anhand der Cusps (12 Zahlen). Rückgabe 1..12 oder null.
  function houseOfLongitude(lon, cusps) {
    const L = clamp360(lon);
    if (L == null || !Array.isArray(cusps) || cusps.length < 12) return null;

    const c = cusps.map(clamp360);
    if (c.some(x => x == null)) return null;

    // interval check: cusp i .. cusp i+1 (circular)
    for (let i = 0; i < 12; i++) {
      const a = c[i];
      const b = c[(i+1) % 12];
      if (a == null || b == null) continue;

      if (a <= b) {
        if (L >= a && L < b) return i+1;
      } else {
        // wraps 360
        if (L >= a || L < b) return i+1;
      }
    }
    return null;
  }

  function renderSummary(data) {
    const summary = $("summary");
    summary.innerHTML = "";
    const chips = $("chips");
    chips.innerHTML = "";

    const addKV = (k, v) => {
      const dk = document.createElement("div"); dk.textContent = k;
      const dv = document.createElement("div"); dv.textContent = v;
      summary.appendChild(dk); summary.appendChild(dv);
    };

    if (!data?.result) {
      addKV("Status", "Keine Daten");
      return;
    }

    const r = data.result ?? {};
    const t = data?.normalized?.time ?? data?.normalized ?? {};

    addKV("Zeitzone", t.tz ?? "-");
    addKV("Lokal", t.localIso ?? "-");
    addKV("UTC", t.utcIso ?? "-");
    addKV("Julianisches Datum (UT)", typeof t.jdUt === "number" ? t.jdUt.toFixed(8) : "-");

    addKV("Aszendent", fmtBodyDe(r.aszendent ?? r.ascendant)); // falls du später umbenennst
    addKV("Medium Coeli", fmtBodyDe(r.mediumCoeli ?? r.mc));
    addKV("Sonne", fmtBodyDe(r.sun));
    addKV("Mond", fmtBodyDe(r.moon));

    if (r.elements) {
      chips.appendChild(chip(`Elemente: dominant = ${translateElement(r.elements.dominant)}`));
      if (r.elements.triple) chips.appendChild(chip(`Dreifach-Element: ${translateElement(r.elements.triple)}`));
      if (r.elements.counts) {
        const c = r.elements.counts;
        chips.appendChild(chip(`Verteilung: Feuer ${c.fire} · Erde ${c.earth} · Luft ${c.air} · Wasser ${c.water}`));
      }
    }

    if (r.chartRuler) {
      const body = r.chartRuler.body ? (KOERPER_LABEL[r.chartRuler.body] ?? r.chartRuler.body) : String(r.chartRuler);
      const hs = (typeof r.chartRuler.house === "number") ? `, Haus ${r.chartRuler.house}` : "";
      chips.appendChild(chip(`Chartherrscher: ${body}${hs}`));
    }

    if (r.houses?.system) chips.appendChild(chip(`Häusersystem: ${r.houses.system}`));
  }

  function translateElement(e) {
    if (!e) return "-";
    return ({ fire:"Feuer", earth:"Erde", air:"Luft", water:"Wasser" })[e] ?? e;
  }

  function fmtBodyDe(b) {
    if (!b) return "-";
    const sign = b.sign ?? "-";
    const deg = (typeof b.degreeInSign === "number") ? b.degreeInSign.toFixed(2) : (b.degreeInSign ?? "-");
    const lon = (typeof b.longitude === "number") ? b.longitude.toFixed(4) : (b.longitude ?? "-");
    const house = (typeof b.house === "number") ? `, Haus ${b.house}` : "";
    return `${formatZeichen(sign)} ${deg}° (${lon}°)${house}`;
  }

  function chip(text) {
    const d = document.createElement("div");
    d.className = "chip";
    d.textContent = text;
    return d;
  }

  function renderTables(data) {
    const planetTbody = $("planetTable").querySelector("tbody");
    const houseTbody = $("houseTable").querySelector("tbody");
    planetTbody.innerHTML = "";
    houseTbody.innerHTML = "";

    if (!data?.result) return;

    const r = data.result;
    const cusps = r.houses?.cusps;

    // Bodies to show on table
    const showAll = $("toggleAllPlanets").checked;

    const items = [];

    const pushIf = (key, obj) => {
      if (!obj || typeof obj.longitude !== "number") return;
      items.push({
        key,
        name: KOERPER_LABEL[key] ?? key,
        longitude: obj.longitude,
        sign: obj.sign,
        degreeInSign: obj.degreeInSign
      });
    };

    // core
    pushIf("sun", r.sun);
    pushIf("moon", r.moon);
    pushIf("ascendant", r.ascendant);
    if (r.mc) pushIf("mc", r.mc);

    // planets
    if (showAll && r.planets) {
      for (const [k, v] of Object.entries(r.planets)) {
        if (!v || typeof v.longitude !== "number") continue;
        items.push({
          key: k,
          name: KOERPER_LABEL[k] ?? k,
          longitude: v.longitude,
          sign: v.sign,
          degreeInSign: v.degreeInSign
        });
      }
    } else if (!showAll && r.planets) {
      // if not all: only Merkur..Saturn (klassische 7 inkl Sonne/Mond already)
      const keep = new Set(["mercury","venus","mars","jupiter","saturn"]);
      for (const [k, v] of Object.entries(r.planets)) {
        if (!keep.has(k)) continue;
        if (!v || typeof v.longitude !== "number") continue;
        items.push({
          key: k,
          name: KOERPER_LABEL[k] ?? k,
          longitude: v.longitude,
          sign: v.sign,
          degreeInSign: v.degreeInSign
        });
      }
    }

    // house assignment for each item (if cusps available)
    for (const it of items) {
      it.house = houseOfLongitude(it.longitude, cusps);
    }

    // sort by longitude
    items.sort((a,b) => a.longitude - b.longitude);

    // render planets table
    for (const p of items) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(p.name)}</td>
        <td>${escapeHtml(formatZeichen(p.sign ?? "-"))}</td>
        <td class="mono">${typeof p.degreeInSign === "number" ? p.degreeInSign.toFixed(6) : "-"}</td>
        <td class="mono">${typeof p.longitude === "number" ? p.longitude.toFixed(6) : "-"}</td>
        <td>${typeof p.house === "number" ? "Haus " + p.house : "-"}</td>
      `;
      planetTbody.appendChild(tr);
    }

    // houses table
    if (Array.isArray(cusps) && cusps.length >= 12) {
      for (let i = 0; i < 12; i++) {
        const lon = cusps[i];
        const z = (typeof lon === "number") ? zeichenAusLaenge(lon) : null;
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>Haus ${i+1}</td>
          <td>${z ? escapeHtml(formatZeichen(z.sign)) : "-"}</td>
          <td class="mono">${z ? z.gradImZeichen.toFixed(6) : "-"}</td>
          <td class="mono">${typeof lon === "number" ? lon.toFixed(6) : "-"}</td>
        `;
        houseTbody.appendChild(tr);
      }
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function callApi() {
    setStatus("Sende Anfrage ...");
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
      setStatus("Fehler (siehe Hinweise).", "error");
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

  // --- Wheel drawing: clean markers, no label cloud ---
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

    // outer ring
    ctx.strokeStyle = "rgba(127,127,127,.75)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI*2); ctx.stroke();

    // inner ring
    ctx.strokeStyle = "rgba(127,127,127,.35)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, R*0.72, 0, Math.PI*2); ctx.stroke();

    // sign separators
    for (let i = 0; i < 12; i++) {
      const deg = i * 30;
      const a = degToRad(deg);
      linePolar(ctx, cx, cy, R*0.72, R, a, "rgba(127,127,127,.40)", 1);
    }

    // sign labels (short: glyph only to keep clean)
    ctx.font = "18px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillStyle = "rgba(127,127,127,.90)";
    for (let i = 0; i < 12; i++) {
      const mid = i*30 + 15;
      const a = degToRad(mid);
      const x = cx + Math.cos(a) * (R*0.88);
      const y = cy - Math.sin(a) * (R*0.88);
      const sign = ZEICHEN[i];
      const g = ZEICHEN_GLYPH[sign] ?? "";
      drawCentered(ctx, g, x, y);
    }

    if (!data?.result) {
      ctx.fillStyle = "rgba(127,127,127,.85)";
      ctx.font = "14px system-ui, -apple-system, Segoe UI, Roboto, Arial";
      drawCentered(ctx, "Keine Daten", cx, cy);
      return;
    }

    const r = data.result;

    // Houses (optional)
    const showHouses = $("toggleHouses").checked;
    const cusps = r.houses?.cusps;
    if (showHouses && Array.isArray(cusps) && cusps.length >= 12) {
      for (let i = 0; i < 12; i++) {
        const lon = clamp360(cusps[i]);
        if (lon == null) continue;
        const a = degToRad(lon);
        linePolar(ctx, cx, cy, R*0.72, R, a, "rgba(180,180,180,.35)", 1);
      }
    }

    // collect bodies
    const showAll = $("toggleAllPlanets").checked;

    const bodies = [];
    const add = (key, obj, kind) => {
      if (!obj || typeof obj.longitude !== "number") return;
      bodies.push({ key, lon: obj.longitude, kind });
    };

    add("sun", r.sun, "main");
    add("moon", r.moon, "main");
    add("ascendant", r.ascendant, "angle");
    if (r.mc) add("mc", r.mc, "angle");

    if (r.planets) {
      const entries = Object.entries(r.planets);
      for (const [k, v] of entries) {
        if (!v || typeof v.longitude !== "number") continue;
        if (!showAll) {
          const keep = new Set(["mercury","venus","mars","jupiter","saturn"]);
          if (!keep.has(k)) continue;
        }
        bodies.push({ key: k, lon: v.longitude, kind: "planet" });
      }
    }

    // draw markers in 3 rings (angles outer, main mid, planets inner) to avoid overlap
    for (const b of bodies) {
      const lon = clamp360(b.lon);
      if (lon == null) continue;
      const a = degToRad(lon);

      const ring =
        b.kind === "angle" ? (R*0.78) :
        b.kind === "main"  ? (R*0.70) :
                             (R*0.63);

      const x = cx + Math.cos(a) * ring;
      const y = cy - Math.sin(a) * ring;

      const radius =
        b.kind === "angle" ? 7.5 :
        b.kind === "main"  ? 7.0 :
                             5.5;

      const fill =
        b.kind === "angle" ? "rgba(211, 72, 72, 0.95)" :
        b.kind === "main"  ? "rgba(7, 225, 90, 0.95)" :
                             "rgba(57, 137, 234, 0.95)";

      ctx.fillStyle = fill;
      ctx.strokeStyle = "rgba(40,40,40,.35)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    }

    // little label at center
    ctx.fillStyle = "rgba(127,127,127,.85)";
    ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    drawCentered(ctx, "0° Widder →", cx + R*0.55, cy + 16);
  }

  function degToRad(deg) { return deg * Math.PI / 180; }

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
    ctx.fillText(text, x - m.width / 2, y + 6);
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

    for (const id of ["date","time","lat","lon","tz","houseSystem"]) {
      $(id).addEventListener("input", () => setRequestPreview(buildRequestFromFields()));
    }

    $("toggleHouses").addEventListener("change", () => redrawFromCurrentJson());
    $("toggleAllPlanets").addEventListener("change", () => {
      redrawFromCurrentJson();
      // also rebuild planet table filtering
      try {
        const out = JSON.parse($("outJson").textContent || "{}");
        renderTables(out?.result ? out : null);
      } catch {}
    });

    setRequestPreview(buildRequestFromFields());
    renderSummary(null);
    renderTables(null);
    drawWheel(null);
  }

  function redrawFromCurrentJson() {
    try {
      const out = JSON.parse($("outJson").textContent || "{}");
      drawWheel(out?.result ? out : null);
    } catch {
      drawWheel(null);
    }
  }

  wire();
})();
