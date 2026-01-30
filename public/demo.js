(() => {
  const $ = (id) => document.getElementById(id);

  // Initial setup
  $("baseUrl").value = location.origin;

  // --- Konfiguration & Daten ---

  // Elemente Zuordnung für Farben
  const SIGN_ELEMENTS = {
    Aries: "fire", Leo: "fire", Sagittarius: "fire",
    Taurus: "earth", Virgo: "earth", Capricorn: "earth",
    Gemini: "air", Libra: "air", Aquarius: "air",
    Cancer: "water", Scorpio: "water", Pisces: "water"
  };

  const SIGNS_DE = {
    Aries: "Widder", Taurus: "Stier", Gemini: "Zwillinge", Cancer: "Krebs",
    Leo: "Löwe", Virgo: "Jungfrau", Libra: "Waage", Scorpio: "Skorpion",
    Sagittarius: "Schütze", Capricorn: "Steinbock", Aquarius: "Wassermann", Pisces: "Fische"
  };

  const SIGN_GLYPH = {
    Aries:"♈", Taurus:"♉", Gemini:"♊", Cancer:"♋", Leo:"♌", Virgo:"♍",
    Libra:"♎", Scorpio:"♏", Sagittarius:"♐", Capricorn:"♑", Aquarius:"♒", Pisces:"♓"
  };

  const BODY_LABEL_DE = {
    ascendant:"Aszendent (AC)", mc:"Medium Coeli (MC)",
    sun:"Sonne", moon:"Mond",
    mercury:"Merkur", venus:"Venus", mars:"Mars", jupiter:"Jupiter", saturn:"Saturn",
    uranus:"Uranus", neptune:"Neptun", pluto:"Pluto",
    chiron:"Chiron", lilith:"Lilith", node:"Mondknoten"
  };

  function getSignInfo(signEnglish) {
    if (!signEnglish) return { label: "-", glyph: "", element: "air" };
    return {
      label: SIGNS_DE[signEnglish] || signEnglish,
      glyph: SIGN_GLYPH[signEnglish] || "",
      element: SIGN_ELEMENTS[signEnglish] || "air"
    };
  }

  function clamp360(x) {
    let v = Number(x);
    if (!Number.isFinite(v)) return null;
    v = v % 360;
    if (v < 0) v += 360;
    return v;
  }

  // --- Request Building ---

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
    el.className = "status " + (kind || "");
  }

  function apiUrl() {
    const base = $("baseUrl").value.trim().replace(/\/+$/,"");
    const ep0 = $("endpoint").value.trim();
    return base + (ep0.startsWith("/") ? ep0 : "/" + ep0);
  }

  async function copyText(s) {
    try {
      await navigator.clipboard.writeText(s);
      setStatus("Kopiert!", "ok");
      setTimeout(() => setStatus(""), 2000);
    } catch {
      setStatus("Fehler beim Kopieren", "error");
    }
  }

  // --- API Calls ---

  async function callApi() {
    setStatus("Lade...", "ok");
    $("btnRun").disabled = true;
    $("outputSection").style.opacity = "0.6";

    const reqObj = getRequestPreview();
    if (!reqObj) {
      setStatus("JSON ungültig", "error");
      $("btnRun").disabled = false;
      return;
    }

    const headers = { "Content-Type": "application/json" };
    const apiKey = $("apiKey").value.trim();
    if (apiKey) headers["Authorization"] = apiKey.startsWith("Bearer ") ? apiKey : `Bearer ${apiKey}`;

    let res, text, data;
    try {
      res = await fetch(apiUrl(), { method: "POST", headers, body: JSON.stringify(reqObj) });
      text = await res.text();
      try { data = JSON.parse(text); } catch {}
    } catch (e) {
      setStatus("Netzwerkfehler", "error");
      $("btnRun").disabled = false;
      return;
    }

    $("httpMeta").textContent = `HTTP ${res.status}`;
    $("outJson").textContent = JSON.stringify(data || text, null, 2);
    $("outIssues").textContent = JSON.stringify(data?.issues || [], null, 2);

    if (!res.ok) {
      setStatus("API Fehler", "error");
      renderAll(null);
    } else {
      setStatus("Berechnet", "ok");
      renderAll(data);
    }

    $("outputSection").style.opacity = "1";
    $("outputSection").style.pointerEvents = "auto";
    $("btnRun").disabled = false;
  }

  function renderAll(data) {
    renderSummary(data);
    renderTables(data);
    drawWheel(data);
  }

  // --- Rendering UI ---

  function renderSummary(data) {
    const grid = $("summaryGrid");
    grid.innerHTML = "";
    
    if (!data?.result) return;
    
    const r = data.result;
    const t = data.normalized || {};

    // Helper Card
    const addCard = (label, val) => {
      const div = document.createElement("div");
      div.className = "kv-item";
      div.innerHTML = `<div class="kv-label">${label}</div><div class="kv-val">${val}</div>`;
      grid.appendChild(div);
    };

    addCard("Datum (Lokal)", t.localIso ? t.localIso.replace("T", " ") : "-");
    addCard("UTC", t.utcIso ? t.utcIso.replace("T", " ") : "-");
    
    // Quick Planeten
    if(r.ascendant) addCard("Aszendent", `${getSignInfo(r.ascendant.sign).glyph} ${getSignInfo(r.ascendant.sign).label}`);
    if(r.sun) addCard("Sonne", `${getSignInfo(r.sun.sign).glyph} ${getSignInfo(r.sun.sign).label}`);
    if(r.moon) addCard("Mond", `${getSignInfo(r.moon.sign).glyph} ${getSignInfo(r.moon.sign).label}`);

    // Chips
    const chips = $("chips");
    chips.innerHTML = "";
    if(r.chartRuler) {
      const rulerName = BODY_LABEL_DE[r.chartRuler.body] || r.chartRuler.body || r.chartRuler;
      chips.innerHTML += `<div class="chip">Herrscher: <b>${rulerName}</b></div>`;
    }
    if(r.elements?.dominant) {
      chips.innerHTML += `<div class="chip">Dominant: ${r.elements.dominant}</div>`;
    }
  }

  function renderTables(data) {
    const pBody = $("planetTable").querySelector("tbody");
    const hBody = $("houseTable").querySelector("tbody");
    pBody.innerHTML = "";
    hBody.innerHTML = "";

    if (!data?.result) {
        pBody.innerHTML = "<tr><td colspan='4' style='text-align:center; padding:20px;'>Keine Daten</td></tr>";
        return;
    }

    const r = data.result;

    // 1. Planeten Liste sammeln
    let rows = [];
    if (r.ascendant) rows.push({ key: "ascendant", ...r.ascendant });
    if (r.mc) rows.push({ key: "mc", ...r.mc });
    if (r.sun) rows.push({ key: "sun", ...r.sun });
    if (r.moon) rows.push({ key: "moon", ...r.moon });
    
    if (r.planets) {
        Object.entries(r.planets).forEach(([k, v]) => {
            if(v) rows.push({ key: k, ...v });
        });
    }

    // 2. Planeten rendern
    rows.forEach(p => {
        const tr = document.createElement("tr");
        const name = BODY_LABEL_DE[p.key] || p.key;
        const signData = getSignInfo(p.sign);
        
        // Grad formatieren: XX°YY'
        const degVal = p.degreeInSign || 0;
        const deg = Math.floor(degVal);
        const min = Math.floor((degVal - deg) * 60);
        const posStr = `${deg}° ${String(min).padStart(2, '0')}'`;

        tr.innerHTML = `
          <td style="font-weight:600;">${name}</td>
          <td>
            <span class="sign-badge sign-${signData.element}">
              <span style="font-size:1.1em; line-height:1;">${signData.glyph}</span> 
              ${signData.label}
            </span>
          </td>
          <td class="mono">${posStr}</td>
          <td>${p.house ? "H" + p.house : "-"}</td>
        `;
        pBody.appendChild(tr);
    });

    // 3. Häuser rendern
    if (r.houses?.cusps) {
        r.houses.cusps.forEach((lon, i) => {
             const z = zodiacFromLongitude(lon);
             const signData = getSignInfo(z.sign);
             const degVal = z.degreeInSign;
             const deg = Math.floor(degVal);
             const min = Math.floor((degVal - deg) * 60);

             const tr = document.createElement("tr");
             tr.innerHTML = `
                <td><b>Haus ${i+1}</b></td>
                <td>
                    <span class="sign-badge sign-${signData.element}">
                        ${signData.glyph} ${signData.label}
                    </span>
                </td>
                <td class="mono">${deg}° ${String(min).padStart(2,'0')}'</td>
             `;
             hBody.appendChild(tr);
        });
    }
  }

  // --- Logic Helpers ---

  function zodiacFromLongitude(lon) {
    const SIGNS_ARR = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
    const v = clamp360(lon);
    if (v == null) return { sign: "-", degreeInSign: 0 };
    const idx = Math.floor(v / 30);
    return { sign: SIGNS_ARR[idx] || "Aries", degreeInSign: v - idx * 30 };
  }

  // --- Canvas Drawing (High DPI) ---

  function drawWheel(data) {
    const canvas = $("wheel");
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;
    
    // Reset
    ctx.clearRect(0,0,W,H);

    // Style config
    const colors = {
      fire: "rgba(255, 230, 220, 0.5)",
      earth: "rgba(220, 255, 230, 0.5)",
      air: "rgba(220, 240, 255, 0.5)",
      water: "rgba(220, 230, 255, 0.5)",
      line: "rgba(100,100,100,0.2)",
      text: "#444"
    };

    const cx = W/2, cy = H/2;
    // Radien relativ zur Canvas Größe
    const R_OUTER = W * 0.48;
    const R_INNER = W * 0.38;
    const R_BODIES = W * 0.30;

    // Hintergrund Ring
    ctx.beginPath();
    ctx.arc(cx, cy, R_OUTER, 0, Math.PI*2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.strokeStyle = colors.line;
    ctx.lineWidth = 2;
    ctx.stroke();

    // 12 Segmente Zeichnen (Zeichen)
    const SIGNS_ARR = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
    
    for (let i = 0; i < 12; i++) {
        // Startwinkel (Aries startet bei 0° rechts mathematisch, aber Astrologie 0° Aries ist "9 Uhr" in Charts? 
        // Standard Mathe: 0 = 3 Uhr. Astrologie Konvention in Code-Bibliotheken ist oft 0 = 0° Widder.
        // Wir zeichnen einfach 0° bei 3 Uhr Position gegen den Uhrzeigersinn, das ist der Standard für rohe Longituden.
        
        const degStart = i * 30;
        const degEnd = (i+1) * 30;
        
        const signName = SIGNS_ARR[i];
        const elem = SIGN_ELEMENTS[signName];
        
        // Slice füllen
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, R_OUTER, -degToRad(degStart), -degToRad(degEnd), true); // Minus für CCW visual correction wenn nötig, aber wir nutzen Standard math coords hier.
        // Moment: Canvas y ist inverted. Math.cos/sin Standard ist CCW.
        // Wir nutzen Hilfsfunktion degToRad.
        
        // Korrekte Füllung des Rings
        ctx.beginPath();
        ctx.arc(cx, cy, R_OUTER, degToRad(degStart), degToRad(degEnd));
        ctx.arc(cx, cy, R_INNER, degToRad(degEnd), degToRad(degStart), true);
        ctx.fillStyle = colors[elem];
        ctx.fill();
        ctx.stroke();

        // Label
        const mid = i * 30 + 15;
        const rTxt = (R_OUTER + R_INNER) / 2;
        const txtX = cx + Math.cos(degToRad(mid)) * rTxt;
        const txtY = cy - Math.sin(degToRad(mid)) * rTxt;
        
        ctx.fillStyle = "#222";
        ctx.font = "bold 32px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(SIGN_GLYPH[signName], txtX, txtY);
    }
    
    // Innere Löschung (damit es ein Ring ist)
    ctx.beginPath();
    ctx.arc(cx, cy, R_INNER, 0, Math.PI*2);
    ctx.fillStyle = getComputedStyle(document.body).backgroundColor; // Transparenz simulieren oder Body BG
    ctx.fill();
    ctx.stroke();

    if(!data?.result) {
        ctx.fillStyle = "#aaa";
        ctx.font = "30px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Bereit", cx, cy);
        return;
    }

    const r = data.result;

    // Häuser Linien
    if($("toggleHouses").checked && r.houses?.cusps) {
        r.houses.cusps.forEach(cusp => {
             const angle = degToRad(cusp);
             ctx.beginPath();
             ctx.moveTo(cx, cy);
             ctx.lineTo(cx + Math.cos(angle) * R_INNER, cy - Math.sin(angle) * R_INNER);
             ctx.strokeStyle = "rgba(0,0,0,0.15)";
             ctx.lineWidth = 1;
             ctx.stroke();
        });
        
        // Mark AC / MC extra
        if(r.ascendant) drawMarkerLine(ctx, cx, cy, R_INNER, r.ascendant.longitude, "AC", "red");
        if(r.mc) drawMarkerLine(ctx, cx, cy, R_INNER, r.mc.longitude, "MC", "blue");
    }

    // Planeten
    let bodies = [];
    if (r.sun) bodies.push({ l: "☉", ...r.sun });
    if (r.moon) bodies.push({ l: "☽", ...r.moon });
    // Planeten adden...
    const pMap = { mercury:"☿", venus:"♀", mars:"♂", jupiter:"♃", saturn:"♄", uranus:"♅", neptune:"♆", pluto:"♇" };
    if(r.planets) {
        Object.entries(r.planets).forEach(([k,v]) => {
            if(v) bodies.push({ l: pMap[k]||k.substr(0,2), ...v });
        });
    }

    // Collision detection simple (Radius Variation wenn nah beieinander)
    bodies.sort((a,b) => a.longitude - b.longitude);
    
    // Zeichnen
    bodies.forEach((b, i) => {
        const a = degToRad(b.longitude);
        // Kleiner Jitter radius um Überlappung zu minimieren (sehr simpel)
        let rPos = R_BODIES;
        
        // Linie zum Grad
        const px = cx + Math.cos(a) * rPos;
        const py = cy - Math.sin(a) * rPos;

        // Stick
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a)*(R_INNER-5), cy - Math.sin(a)*(R_INNER-5));
        ctx.lineTo(px, py);
        ctx.strokeStyle = "#888";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Dot background
        ctx.beginPath();
        ctx.arc(px, py, 14, 0, Math.PI*2);
        ctx.fillStyle = "#fff";
        ctx.fill();
        ctx.strokeStyle = "#ccc";
        ctx.stroke();

        // Glyph
        ctx.fillStyle = "#000";
        ctx.font = "20px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(b.l, px, py); // Glyph oder Label
    });
  }

  function drawMarkerLine(ctx, cx, cy, r, lon, txt, color) {
    const a = degToRad(lon);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a)*(r+20), cy - Math.sin(a)*(r+20));
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.fillStyle = color;
    ctx.font = "bold 14px sans-serif";
    ctx.fillText(txt, cx + Math.cos(a)*(r+35), cy - Math.sin(a)*(r+35));
  }

  function degToRad(deg) { return deg * Math.PI / 180; }

  // Wiring
  $("btnRun").addEventListener("click", callApi);
  $("toggleHouses").addEventListener("change", () => drawWheel(JSON.parse($("outJson").textContent)));
  $("btnFillExample").addEventListener("click", () => {
     $("date").value = "1989-11-09"; // Fall der Mauer als Beispiel :)
     $("time").value = "18:57";
     $("lat").value = "52.52";
     $("lon").value = "13.40";
     setRequestPreview(buildRequestFromFields());
  });
  
  // Inputs listener
  ["date","time","lat","lon","tz","houseSystem"].forEach(id => {
      $(id).addEventListener("input", () => setRequestPreview(buildRequestFromFields()));
  });

  // Init
  setRequestPreview(buildRequestFromFields());

})();