const GOAL = [1, 2, 3, 4, 5, 6, 7, 8, 0];
const HS = [
  { id: "h0", name: "h0 = 0", sub: "Dijkstra / UCS (baseline)" },
  { id: "h1", name: "h1", sub: "Peças fora do lugar" },
  { id: "h2", name: "h2", sub: "Distância de Manhattan" },
];
const $ = (id) => document.getElementById(id);
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const fmt = (x, d = 0) => (x == null ? "—" : x.toLocaleString("pt-BR", { maximumFractionDigits: d, minimumFractionDigits: d }));

// ---------- puzzle helpers ----------
function neighbors(s) {
  const i = s.indexOf(0), r = Math.floor(i / 3), c = i % 3, out = [];
  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < 3 && nc >= 0 && nc < 3) {
      const t = s.slice(), j = nr * 3 + nc;
      [t[i], t[j]] = [t[j], t[i]];
      out.push(t);
    }
  }
  return out;
}
function shuffle(steps) {
  // random walk from the goal: always solvable
  let s = GOAL.slice(), prev = null;
  for (let k = 0; k < steps; k++) {
    const opts = neighbors(s).filter((t) => !prev || t.join() !== prev.join());
    prev = s;
    s = opts[Math.floor(Math.random() * opts.length)];
  }
  return s;
}
function isValid(s) {
  return s.length === 9 && [...s].sort((a, b) => a - b).every((x, i) => x === i);
}
function isSolvable(s) {
  const t = s.filter((x) => x);
  let inv = 0;
  for (let i = 0; i < t.length; i++) for (let j = i + 1; j < t.length; j++) if (t[i] > t[j]) inv++;
  return inv % 2 === 0;
}

function renderBoard(el, s, onClick) {
  el.replaceChildren(...s.map((x, i) => {
    const b = document.createElement(onClick ? "button" : "div");
    b.className = "cell" + (x ? "" : " blank");
    b.textContent = x || "";
    if (onClick) {
      b.type = "button";
      b.setAttribute("aria-label", x ? `Peça ${x}` : "Vazio");
      b.onclick = () => onClick(i);
    }
    return b;
  }));
}

// ---------- tabs ----------
document.querySelectorAll("nav button").forEach((b) => {
  b.onclick = () => {
    document.querySelectorAll("nav button").forEach((o) => o.setAttribute("aria-selected", o === b));
    $("interactive").hidden = b.dataset.tab !== "interactive";
    $("experiment").hidden = b.dataset.tab !== "experiment";
    if (b.dataset.tab === "experiment") loadExperiment();
  };
});

// ---------- interactive ----------
let state = shuffle(20);
let results = null, step = 0, timer = null;

function setState(s) {
  state = s;
  $("state-input").value = s.join(" ");
  renderBoard($("editor"), s, (i) => {
    const b = state.indexOf(0), [r, c, br, bc] = [Math.floor(i / 3), i % 3, Math.floor(b / 3), b % 3];
    if (Math.abs(r - br) + Math.abs(c - bc) !== 1) return;
    const t = state.slice();
    [t[i], t[b]] = [t[b], t[i]];
    setState(t);
  });
}

$("state-input").onchange = () => {
  const s = $("state-input").value.trim().split(/[\s,]+/).map(Number);
  if (!isValid(s)) return status("Estado precisa ser uma permutação de 0..8.", true);
  if (!isSolvable(s)) return status("Estado insolúvel (paridade de inversões ímpar).", true);
  status("");
  setState(s);
};
$("shuffle").onclick = () => { status(""); setState(shuffle(+$("shuffle-steps").value)); };
$("solve").onclick = solve;

function status(msg, err = false) {
  $("status").textContent = msg;
  $("status").classList.toggle("error", err);
}

async function solve() {
  stop();
  $("solve").disabled = true;
  status("Resolvendo com h0, h1 e h2…");
  try {
    results = await Promise.all(HS.map(async (h) => {
      const r = await fetch("/api/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state, heuristic: h.id }),
      });
      if (!r.ok) throw new Error((await r.json()).detail ?? r.statusText);
      return r.json();
    }));
    status("");
    step = 0;
    renderPanels();
  } catch (e) {
    status(`Erro: ${e.message}`, true);
  } finally {
    $("solve").disabled = false;
  }
}

function renderPanels() {
  const best = Math.min(...results.map((r) => r.metrics.expanded));
  const base = results[0].metrics.expanded;
  $("panels").replaceChildren(...HS.map((h, k) => {
    const m = results[k].metrics;
    const p = document.createElement("article");
    p.className = "panel" + (m.expanded === best ? " winner" : "");
    p.style.setProperty("--color", `var(--${h.id})`);
    p.innerHTML = `
      <header>
        <h2>${h.name}${m.expanded === best ? '<span class="badge">menos expansões</span>' : ""}</h2>
        <div class="sub">${h.sub}</div>
      </header>
      <div class="board small"></div>
      <dl>
        <dt>Expandidos</dt><dd class="big">${fmt(m.expanded)}</dd>
        <dt>vs h0</dt><dd>${k === 0 ? "—" : `${fmt(base / m.expanded, 1)}× menos`}</dd>
        <dt>Gerados</dt><dd>${fmt(m.generated)}</dd>
        <dt>Fronteira máx.</dt><dd>${fmt(m.max_frontier)}</dd>
        <dt>b*</dt><dd>${fmt(m.bstar, 3)}</dd>
        <dt>Custo</dt><dd>${m.cost}</dd>
        <dt>Tempo</dt><dd>${fmt(m.time_ms, 1)} ms</dd>
      </dl>`;
    return p;
  }));
  $("player").hidden = false;
  $("scrub").max = results[0].metrics.cost;
  showStep();
}

function showStep() {
  const cost = results[0].metrics.cost;
  document.querySelectorAll(".panel .board").forEach((el, k) => renderBoard(el, results[k].path[step]));
  $("scrub").value = step;
  $("step-label").textContent = `passo ${step}/${cost}`;
}
function go(n) {
  step = Math.max(0, Math.min(results[0].metrics.cost, n));
  showStep();
}
function stop() {
  clearInterval(timer);
  timer = null;
  $("play").textContent = "▶ Play";
}
$("prev").onclick = () => { stop(); go(step - 1); };
$("next").onclick = () => { stop(); go(step + 1); };
$("scrub").oninput = () => { stop(); go(+$("scrub").value); };
$("play").onclick = () => {
  if (timer) return stop();
  if (step >= results[0].metrics.cost) go(0);
  $("play").textContent = "❚❚ Pausar";
  timer = setInterval(() => {
    go(step + 1);
    if (step >= results[0].metrics.cost) stop();
  }, 400);
};

setState(state);

// ---------- experiment ----------
let experiment = null, chart = null;

async function loadExperiment() {
  if (experiment) return;
  const r = await fetch("/api/experiment");
  if (!r.ok) {
    $("exp-status").textContent = "Experimento ainda não gerado: rode `python -m experiment.run`.";
    return;
  }
  experiment = await r.json();
  renderTable();
  renderChart();
  const m = experiment.meta;
  $("exp-meta").textContent = `Semente ${m.seed}; até ${m.per_bucket_target} instâncias por balde (d=2, 4, 6 têm só 4, 16, 39 estados no espaço inteiro). b* com N = nós gerados (convenção AIMA).`;
}

function renderTable() {
  const rows = experiment.rows;
  const head = `
    <thead>
      <tr><th rowspan="2">d</th><th rowspan="2">n</th><th colspan="3">Nós expandidos (média)</th><th colspan="3">b* (média)</th></tr>
      <tr>${[0, 1].map(() => HS.map((h) => `<th><span class="swatch" style="--color:var(--${h.id})"></span>${h.id}</th>`).join("")).join("")}</tr>
    </thead>`;
  const body = rows.map((r) => `<tr>
      <td>${r.d}</td><td>${r.n.h2}</td>
      ${HS.map((h) => `<td>${fmt(r.expanded[h.id])}</td>`).join("")}
      ${HS.map((h) => `<td>${fmt(r.bstar[h.id], 2)}</td>`).join("")}
    </tr>`).join("");
  $("exp-table").innerHTML = head + `<tbody>${body}</tbody>`;
}

// direct labels at each line's last point (identity is never color-only)
const endLabels = {
  id: "endLabels",
  afterDatasetsDraw(c) {
    const ctx = c.ctx;
    ctx.save();
    ctx.font = "600 12px system-ui, sans-serif";
    ctx.fillStyle = css("--text");
    ctx.textBaseline = "middle";
    c.data.datasets.forEach((ds, i) => {
      const pts = c.getDatasetMeta(i).data;
      const last = pts[pts.length - 1];
      if (last) ctx.fillText(ds.label, last.x + 8, last.y);
    });
    ctx.restore();
  },
};

function renderChart() {
  const rows = experiment.rows;
  const text2 = css("--text-2"), grid = css("--border");
  chart?.destroy();
  chart = new Chart($("chart"), {
    type: "line",
    data: {
      labels: rows.map((r) => r.d),
      datasets: HS.map((h) => ({
        label: h.id,
        data: rows.map((r) => r.expanded[h.id]),
        borderColor: css(`--${h.id}`),
        backgroundColor: css(`--${h.id}`),
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBorderColor: css("--surface"),
        pointBorderWidth: 2,
      })),
    },
    options: {
      maintainAspectRatio: false,
      layout: { padding: { right: 28 } },
      interaction: { mode: "index", intersect: false },
      scales: {
        x: { title: { display: true, text: "profundidade ótima d", color: text2 }, ticks: { color: text2 }, grid: { display: false } },
        y: {
          type: "logarithmic",
          title: { display: true, text: "nós expandidos", color: text2 },
          ticks: { color: text2, callback: (v) => (Math.log10(v) % 1 === 0 ? fmt(v) : "") },
          grid: { color: grid },
        },
      },
      plugins: {
        legend: { position: "top", align: "start", labels: { color: text2, usePointStyle: true, boxWidth: 8 } },
        tooltip: { callbacks: { title: (it) => `d = ${it[0].label}`, label: (it) => ` ${it.dataset.label}: ${fmt(it.parsed.y)}` } },
      },
    },
    plugins: [endLabels],
  });
}
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => experiment && renderChart());
