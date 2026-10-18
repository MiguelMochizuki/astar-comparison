/**
 * @file Front end: interactive h0/h1/h2 comparison on one state, and the
 * precomputed batch experiment (table + log-scale chart).
 */

const GOAL = [1, 2, 3, 4, 5, 6, 7, 8, 0];
const HS = [
  { id: "h0", name: "h0", sub: "sem heurística" },
  { id: "h1", name: "h1", sub: "peças fora do lugar" },
  { id: "h2", name: "h2", sub: "Manhattan" },
];
/**
 * @param {string} id Element id.
 * @returns {HTMLElement} The element.
 */
const $ = (id) => document.getElementById(id);
/**
 * Read a CSS custom property from :root (follows the active light/dark theme).
 * @param {string} v Property name, e.g. "--h0".
 * @returns {string} Trimmed value.
 */
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
/**
 * Format a number in pt-BR.
 * @param {?number} x Value; null or undefined renders as an em dash.
 * @param {number} [d=0] Fixed decimal places.
 * @returns {string} Formatted text.
 */
const fmt = (x, d = 0) => (x == null ? "—" : x.toLocaleString("pt-BR", { maximumFractionDigits: d, minimumFractionDigits: d }));

// ---------- puzzle helpers ----------
/**
 * States reachable in one blank move.
 * @param {number[]} s State, 9 positions row-major, 0 = blank.
 * @returns {number[][]} Next states.
 */
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
/**
 * Random walk from the goal without undoing the previous move, so the result is always solvable.
 * @param {number} steps Number of moves.
 * @returns {number[]} State.
 */
function shuffle(steps) {
  let s = GOAL.slice(), prev = null;
  for (let k = 0; k < steps; k++) {
    const opts = neighbors(s).filter((t) => !prev || t.join() !== prev.join());
    prev = s;
    s = opts[Math.floor(Math.random() * opts.length)];
  }
  return s;
}
/**
 * @param {number[]} s Candidate state.
 * @returns {boolean} True if s is a permutation of 0..8.
 */
const isValid = (s) => s.length === 9 && [...s].sort((a, b) => a - b).every((x, i) => x === i);
/**
 * 3x3 parity rule: solvable iff the inversion count, ignoring the blank, is even.
 * @param {number[]} s Valid state.
 * @returns {boolean} True if solvable.
 */
function isSolvable(s) {
  const t = s.filter((x) => x);
  let inv = 0;
  for (let i = 0; i < t.length; i++) for (let j = i + 1; j < t.length; j++) if (t[i] > t[j]) inv++;
  return inv % 2 === 0;
}

/**
 * Draw a state. Tiles are created once per board and positioned via transform,
 * so later calls slide them instead of redrawing.
 * @param {HTMLElement} el Board container.
 * @param {number[]} s State to show.
 * @param {(tile: number) => void} [onClick] Makes tiles buttons; called with the tile number.
 */
function renderBoard(el, s, onClick) {
  if (!el.children.length) {
    for (let x = 1; x <= 8; x++) {
      const t = document.createElement(onClick ? "button" : "div");
      t.className = "tile";
      t.textContent = x;
      t.dataset.tile = x;
      if (onClick) {
        t.type = "button";
        t.onclick = () => onClick(x);
      }
      el.append(t);
    }
  }
  for (const t of el.children) {
    const i = s.indexOf(+t.dataset.tile);
    t.style.setProperty("--r", Math.floor(i / 3));
    t.style.setProperty("--c", i % 3);
    if (onClick) t.setAttribute("aria-label", `Peça ${t.dataset.tile}, linha ${Math.floor(i / 3) + 1}, coluna ${(i % 3) + 1}`);
  }
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

/**
 * Replace the start state, sync the editor and input, and discard stale results.
 * @param {number[]} s Valid, solvable state.
 */
function setState(s) {
  state = s;
  $("state-input").value = s.join(" ");
  $("state-input").removeAttribute("aria-invalid");
  $("status").textContent = "";
  renderBoard($("editor"), s, (tile) => {
    const i = state.indexOf(tile), b = state.indexOf(0);
    if (Math.abs(Math.floor(i / 3) - Math.floor(b / 3)) + Math.abs((i % 3) - (b % 3)) !== 1) return;
    const t = state.slice();
    [t[i], t[b]] = [t[b], t[i]];
    setState(t);
  });
  if (results) clearResults();
}

/**
 * Show an inline error under the state input.
 * @param {string} msg Message.
 */
function inputError(msg) {
  $("state-input").setAttribute("aria-invalid", "true");
  $("status").textContent = msg;
}
$("state-input").onchange = () => {
  const s = $("state-input").value.trim().split(/[\s,]+/).map(Number);
  if (!isValid(s)) return inputError("Use os números 0 a 8, uma vez cada.");
  if (!isSolvable(s)) return inputError("Insolúvel: número ímpar de inversões.");
  setState(s);
};
$("shuffle").onclick = () => setState(shuffle(+$("shuffle-steps").value));
$("solve").onclick = solve;

/** Build the three empty heuristic columns, boards showing the current start state. */
function renderColumns() {
  $("columns").replaceChildren(...HS.map((h) => {
    const col = document.createElement("article");
    col.className = "col";
    col.style.setProperty("--color", `var(--${h.id})`);
    col.innerHTML = `
      <div class="col-name"><i class="swatch"></i><b>${h.name}</b><span>${h.sub}</span></div>
      <div class="expanded">
        <span class="value">—</span>
        <div class="bar"><i></i></div>
        <span class="label">nós expandidos</span>
      </div>
      <div class="board small"></div>
      <dl>
        <dt>gerados</dt><dd data-k="generated">—</dd>
        <dt>fronteira máx.</dt><dd data-k="max_frontier">—</dd>
        <dt>b*</dt><dd data-k="bstar">—</dd>
        <dt>custo</dt><dd data-k="cost">—</dd>
        <dt>tempo</dt><dd data-k="time_ms">—</dd>
      </dl>`;
    renderBoard(col.querySelector(".board"), state);
    return col;
  }));
}

/** Reset to the pre-solve state: empty columns, player disabled, prompt verdict. */
function clearResults() {
  stop();
  results = null;
  step = 0;
  renderColumns();
  setPlayer(false);
  $("verdict").textContent = "Resolva para comparar as três heurísticas neste estado.";
}

/**
 * Solve the current state with h0, h1 and h2 in parallel and show the results.
 * @returns {Promise<void>}
 */
async function solve() {
  stop();
  const btn = $("solve");
  btn.disabled = true;
  btn.setAttribute("aria-busy", "true");
  btn.textContent = "Resolvendo…";
  document.querySelectorAll(".col").forEach((c) => c.setAttribute("aria-busy", "true"));
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
    step = 0;
    showResults();
  } catch (e) {
    inputError(`Erro do servidor: ${e.message}`);
  } finally {
    btn.disabled = false;
    btn.removeAttribute("aria-busy");
    btn.textContent = "Resolver";
    document.querySelectorAll(".col").forEach((c) => c.removeAttribute("aria-busy"));
  }
}

/** Fill the columns and the verdict from `results`, and enable the player. */
function showResults() {
  const exp = results.map((r) => r.metrics.expanded);
  const max = Math.max(...exp), min = Math.min(...exp);
  const cost = results[0].metrics.cost;
  document.querySelectorAll(".col").forEach((col, k) => {
    const m = results[k].metrics;
    col.classList.toggle("best", m.expanded === min);
    col.querySelector(".value").textContent = fmt(m.expanded);
    col.querySelector(".bar i").style.setProperty("--w", `${(m.expanded / max) * 100}%`);
    for (const dd of col.querySelectorAll("dd")) {
      const k2 = dd.dataset.k, v = m[k2];
      dd.textContent = k2 === "bstar" ? fmt(v, 3) : k2 === "time_ms" ? `${fmt(v, 1)} ms` : fmt(v);
    }
  });
  $("verdict").innerHTML = cost === 0
    ? "Já está resolvido."
    : `Mesmo custo ótimo nas três: <strong>${cost} movimentos</strong>. Manhattan expandiu ` +
      `<strong>${fmt(exp[0] / exp[2], 1)}×</strong> menos nós que h0 e ` +
      `<strong>${fmt(exp[1] / exp[2], 1)}×</strong> menos que peças fora do lugar.`;
  setPlayer(cost > 0);
  $("scrub").max = cost;
  showStep();
}

/**
 * @param {boolean} on Enable or disable the solution player controls.
 */
function setPlayer(on) {
  for (const id of ["prev", "play", "next", "scrub"]) $(id).disabled = !on;
  if (!on) $("step-label").textContent = "0 / 0";
}
/** Render `results[k].path[step]` on every column board and update the scrubber. */
function showStep() {
  const cost = results[0].metrics.cost;
  document.querySelectorAll(".col .board").forEach((el, k) => renderBoard(el, results[k].path[step]));
  $("scrub").value = step;
  $("step-label").textContent = `${step} / ${cost}`;
}
/**
 * Jump to a solution step, clamped to [0, cost].
 * @param {number} n Step index.
 */
function go(n) {
  step = Math.max(0, Math.min(results[0].metrics.cost, n));
  showStep();
}
/** Stop playback and reset the play button. */
function stop() {
  clearInterval(timer);
  timer = null;
  $("play").setAttribute("aria-pressed", "false");
  $("play").setAttribute("aria-label", "Reproduzir");
}
$("prev").onclick = () => { stop(); go(step - 1); };
$("next").onclick = () => { stop(); go(step + 1); };
$("scrub").oninput = () => { stop(); go(+$("scrub").value); };
$("play").onclick = () => {
  if (timer) return stop();
  if (step >= results[0].metrics.cost) go(0);
  $("play").setAttribute("aria-pressed", "true");
  $("play").setAttribute("aria-label", "Pausar");
  timer = setInterval(() => {
    go(step + 1);
    if (step >= results[0].metrics.cost) stop();
  }, 350);
};

setState(state);
clearResults();
$("verdict").textContent = "Escolha um estado e resolva com as três heurísticas.";

// ---------- experiment ----------
let experiment = null, chart = null;

/**
 * Fetch the precomputed experiment once and render verdict, table and chart.
 * @returns {Promise<void>}
 */
async function loadExperiment() {
  if (experiment) return;
  const r = await fetch("/api/experiment");
  if (!r.ok) {
    $("exp-verdict").textContent = "Experimento ainda não gerado. Rode python -m experiment.run.";
    return;
  }
  experiment = await r.json();
  const rows = experiment.rows, last = rows[rows.length - 1];
  const total = rows.reduce((a, r) => a + r.n.h2, 0);
  $("exp-verdict").innerHTML =
    `Em d = ${last.d}, Manhattan expande <strong>${fmt(last.expanded.h2)}</strong> nós em média; ` +
    `peças fora do lugar, <strong>${fmt(last.expanded.h1)}</strong>; sem heurística, <strong>${fmt(last.expanded.h0)}</strong>. ` +
    `Custo ótimo idêntico nas ${fmt(total)} instâncias.`;
  renderTable();
  renderChart();
  $("exp-meta").textContent =
    `Semente ${experiment.meta.seed}, até ${experiment.meta.per_bucket_target} instâncias por profundidade. ` +
    `d = 2, 4 e 6 têm só 4, 16 e 39 estados no espaço inteiro. b* calculado com N = nós gerados (convenção AIMA).`;
}

/** Render the per-depth table of mean expanded nodes and b*. */
function renderTable() {
  const sw = (h) => `<th><i class="swatch" style="--color:var(--${h.id})"></i>${h.id}</th>`;
  const swSep = (h, i) => sw(h).replace("<th>", i === 0 ? '<th class="sep">' : "<th>");
  $("exp-table").innerHTML = `
    <thead>
      <tr><th></th><th></th><th class="group" colspan="3"><span>nós expandidos (média)</span></th><th class="group" colspan="3"><span>b* (média)</span></th></tr>
      <tr><th>d</th><th>n</th>${HS.map(swSep).join("")}${HS.map(swSep).join("")}</tr>
    </thead>
    <tbody>${experiment.rows.map((r) => `<tr>
      <td>${r.d}</td><td>${r.n.h2}</td>
      ${HS.map((h, i) => `<td${i === 0 ? ' class="sep"' : ""}>${fmt(r.expanded[h.id])}</td>`).join("")}
      ${HS.map((h, i) => `<td${i === 0 ? ' class="sep"' : ""}>${fmt(r.bstar[h.id], 2)}</td>`).join("")}
    </tr>`).join("")}</tbody>`;
}

/** Chart.js plugin: direct label at each line's end, so identity is never color-only. */
const endLabels = {
  id: "endLabels",
  /** @param {Chart} c Chart instance. */
  afterDatasetsDraw(c) {
    const ctx = c.ctx;
    ctx.save();
    ctx.font = `500 12px ${css("--sans")}`;
    ctx.fillStyle = css("--text");
    ctx.textBaseline = "middle";
    c.data.datasets.forEach((ds, i) => {
      const pts = c.getDatasetMeta(i).data, last = pts[pts.length - 1];
      if (last) ctx.fillText(ds.label, last.x + 10, last.y);
    });
    ctx.restore();
  },
};

/** (Re)draw the log-scale expanded-nodes chart with the current theme colors. */
function renderChart() {
  const rows = experiment.rows, text2 = css("--text-2"), line = css("--line");
  Chart.defaults.font.family = css("--sans");
  Chart.defaults.font.size = 12;
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
        pointBorderColor: css("--bg"),
        pointBorderWidth: 2,
      })),
    },
    options: {
      maintainAspectRatio: false,
      animation: false,
      layout: { padding: { right: 32 } },
      interaction: { mode: "index", intersect: false },
      scales: {
        x: {
          title: { display: true, text: "profundidade ótima d", color: text2 },
          ticks: { color: text2 },
          grid: { display: false },
          border: { color: line },
        },
        y: {
          type: "logarithmic",
          ticks: { color: text2, callback: (v) => (Math.log10(v) % 1 === 0 ? fmt(v) : "") },
          grid: { color: line },
          border: { display: false },
        },
      },
      plugins: {
        legend: { position: "top", align: "end", labels: { color: text2, usePointStyle: true, pointStyle: "rectRounded", boxWidth: 8, boxHeight: 8 } },
        tooltip: {
          backgroundColor: css("--text"),
          titleColor: css("--bg"),
          bodyColor: css("--bg"),
          bodyFont: { family: css("--mono") },
          padding: 10,
          cornerRadius: 6,
          callbacks: { title: (it) => `d = ${it[0].label}`, label: (it) => ` ${it.dataset.label}  ${fmt(it.parsed.y)}` },
        },
      },
    },
    plugins: [endLabels],
  });
}
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => experiment && renderChart());
