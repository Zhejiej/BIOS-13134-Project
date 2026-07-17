/* Game logic. Gene toggles, results panel, and the animated plant. */

/* gene definitions. numbers are multipliers on wild-type values (tillers is an added amount) */
const GENES = {
  pfkb:   { area:1.15, yield:1.08 },
  adk:    { area:1.28, height:0.75, yield:0.95 },
  krn2:   { rows:1.30, yield:1.10 },   // Michalowski 2022, eliminating KRN2 raises yield ~10%
  br2:    { height:0.58, yield:1.12 },
  dwarf8: { height:0.82, yield:1.05 }  // Ma et al. 2025, milder dwarf than br2
};
const BASE = { area:13000, height:200, rows:16, yield:500 };

/* current lab state: which genes are knocked out */
const state = { pfkb:false, adk:false, krn2:false, br2:false, dwarf8:false };

let currentStats = null;
let lastShown = { area:13000, height:200, rows:16, yield:500 };
let growth = 1;              // 0..1 growth stage
let growthAnimating = false;

/* ---------- elements ---------- */
const growBtn = document.getElementById('grow-btn');
const resetBtn = document.getElementById('reset-btn');
const plantBox = document.getElementById('plant-box');
const growthSlider = document.getElementById('growth-slider');
const growthOut = document.getElementById('growth-out');
const stageHint = document.getElementById('stage-hint');
const liveDesc = document.getElementById('live-desc');

/* ---------- events ---------- */
document.querySelectorAll('.gene-toggle').forEach(el => {
  el.addEventListener('click', () => {
    const g = el.dataset.gene;
    state[g] = !state[g];
    updateAll(false);
  });
  el.addEventListener('keydown', e => {
    if(e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    const g = el.dataset.gene;
    state[g] = !state[g];
    updateAll(false);
  });
});
growthSlider.addEventListener('input', () => {
  if(growthAnimating) return;
  growth = Number(growthSlider.value) / 100;
  updateGrowthLabel();
  renderPlant(currentStats, growth);
});
growBtn.addEventListener('click', () => { if(!growthAnimating) playGrowth(); });
resetBtn.addEventListener('click', () => {
  Object.keys(GENES).forEach(g => state[g] = false);
  updateAll(true);
});

/* ---------- stats ---------- */
function computeStats(){
  let area = BASE.area, height = BASE.height, rows = BASE.rows, yieldN = BASE.yield, tillers = 0;

  for(const g in GENES){
    if(!state[g]) continue;
    const e = GENES[g];
    if(e.area)   area   *= e.area;
    if(e.height) height *= e.height;
    if(e.rows)   rows   *= e.rows;
    if(e.yield)  yieldN *= e.yield;
    if(e.tillers) tillers += e.tillers;
  }

  return {
    area: Math.round(area),
    height: Math.round(height),
    rows: Math.round(rows),
    yieldN: Math.round(yieldN),
    tillers
  };
}

function pctBar(value, base){ return Math.min(100, Math.max(6, (value/base)*50)); }

function animateNumber(el, from, to, suffix, duration){
  const start = performance.now();
  function step(now){
    const p = Math.min(1, (now-start)/duration);
    const eased = 1 - Math.pow(1-p, 3);
    el.textContent = Math.round(from + (to-from)*eased).toLocaleString() + suffix;
    if(p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
function flashStat(el){ el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 500); }

/* ---------- description ---------- */
function joinList(arr){
  if(arr.length === 1) return arr[0];
  if(arr.length === 2) return arr[0] + ' and ' + arr[1];
  return arr.slice(0,-1).join(', ') + ' and ' + arr[arr.length-1];
}
function buildDescription(s){
  const kos = Object.keys(GENES).filter(g => state[g]);
  const geno = kos.length ? '<b>' + kos.join(' + ') + '</b> knocked out' : '<b>Wild type</b>, no genes knocked out';

  const notes = [];
  if(s.area > BASE.area) notes.push('an enlarged meristem');
  if(s.height < 180) notes.push('a ' + (s.height < 130 ? 'dwarfed' : 'shorter, sturdier') + ' stalk');
  if(s.rows > BASE.rows) notes.push(s.rows + ' kernel rows');
  if(s.tillers > 0) notes.push(s.tillers + ' extra tiller' + (s.tillers > 1 ? 's' : ''));
  const noteStr = notes.length ? ' You get ' + joinList(notes) + '.' : '';

  let verdict;
  if(s.yieldN > 560) verdict = ' Overall, yield is up, a win at least on paper.';
  else if(s.yieldN < 440) verdict = ' Overall, yield drops. The trade-offs outweigh the bigger meristem.';
  else verdict = ' Overall, yield is about the same as wild type.';

  return geno + '.' + noteStr + verdict;
}

/* ---------- callout ---------- */
function buildCallout(){
  const kos = Object.keys(GENES).filter(g => state[g]);
  const lines = {
    pfkb:   '<b>Real result.</b> Zmpfkb triple mutants had significantly larger meristems than wild type, p&lt;0.001 (Xu et al., 2025).',
    adk:    '<b>Real result.</b> Zmadk mutants had larger meristems but were dwarfed overall (Xu et al., 2025).',
    krn2:   '<b>Real result.</b> Knocking out KRN2 removes a brake on kernel row number, raising yield by roughly 10% in field studies (Michalowski, 2022).',
    br2:    '<b>Real result.</b> Brachytic2 mutants are short from disrupted auxin transport, but stand sturdier at high density (Multani et al., 2003).',
    dwarf8: '<b>Real result.</b> Dwarf8 mutants are shorter than wild type, a milder effect than br2 (Ma et al., 2025).'
  };
  if(kos.length === 0) return '<b>Real result.</b> With no genes knocked out, this matches the wild type control plants from Xu et al. (2025).';
  if(kos.length === 1) return lines[kos[0]];
  return '<b>Beyond the paper.</b> Stacking ' + kos.length + ' knockouts goes past what any single study measured. This is a prediction you are testing, not a directly published result.';
}

/* ---------- main update ---------- */
function updateAll(replayGrowth){
  document.querySelectorAll('.gene-toggle').forEach(el => {
    const on = state[el.dataset.gene];
    el.classList.toggle('active', on);
    el.setAttribute('aria-checked', on ? 'true' : 'false');
  });

  const s = computeStats();
  currentStats = s;

  const map = [
    ['area',   s.area,   ' µm²', BASE.area],
    ['height', s.height, ' cm',            BASE.height],
    ['rows',   s.rows,   ' rows',          BASE.rows],
    ['yield',  s.yieldN, ' kernels',       BASE.yield]
  ];
  const keyed = { area:s.area, height:s.height, rows:s.rows, yield:s.yieldN };
  map.forEach(([id, val, suf, base]) => {
    const valEl = document.getElementById(id + '-val');
    const prev = lastShown[id === 'yield' ? 'yield' : id];
    if(val !== prev) flashStat(valEl.closest('.stat'));
    animateNumber(valEl, prev, val, suf, 350);
    document.getElementById(id + '-bar').style.width = pctBar(val, base) + '%';
  });
  lastShown = keyed;

  const noteFor = (v, base, up, down) => v > base ? up : (v < base ? down : 'Same as wild type.');
  document.getElementById('area-note').textContent   = noteFor(s.area, BASE.area, 'Larger than wild type.', 'Smaller than wild type.');
  document.getElementById('height-note').textContent = noteFor(s.height, BASE.height, 'Taller than wild type.', 'Dwarfed vs wild type.');
  document.getElementById('rows-note').textContent   = noteFor(s.rows, BASE.rows, 'More rows than wild type.', 'Fewer rows than wild type.');
  document.getElementById('yield-note').textContent  = noteFor(s.yieldN, BASE.yield, 'Higher than wild type.', 'Lower than wild type.');

  document.getElementById('callout').innerHTML = buildCallout();
  liveDesc.innerHTML = buildDescription(s);

  if(replayGrowth) playGrowth();
  else renderPlant(s, growth);
}

function updateGrowthLabel(){
  const pct = Math.round(growth * 100);
  growthOut.textContent = pct + '%';
  stageHint.textContent = pct < 25 ? 'seedling' : (pct < 60 ? 'growing' : (pct < 95 ? 'ear fill' : 'fully grown'));
}

/* ---------- growth animation ---------- */
function playGrowth(){
  growthAnimating = true;
  growBtn.disabled = true;
  const start = performance.now();
  const dur = 1500;
  function step(now){
    const p = Math.min(1, (now-start)/dur);
    growth = 1 - Math.pow(1-p, 2.2);
    growthSlider.value = Math.round(growth * 100);
    updateGrowthLabel();
    renderPlant(currentStats, growth);
    if(p < 1){ requestAnimationFrame(step); }
    else {
      growth = 1;
      growthSlider.value = 100;
      updateGrowthLabel();
      growthAnimating = false;
      growBtn.disabled = false;
      renderPlant(currentStats, 1);
    }
  }
  requestAnimationFrame(step);
}

/* placeholder plant sketch driven by growth progress g (0..1) */
function renderPlant(stats, g){
  const stemH = 26 + g * 190;
  const leaf = 0.35 + g * 0.65;
  const baseY = 322;
  plantBox.innerHTML =
    '<div class="plant-placeholder-tag">placeholder sketch</div>' +
    '<svg viewBox="0 0 300 400" class="plant-placeholder" aria-hidden="true">' +
      '<ellipse cx="150" cy="' + baseY + '" rx="' + (30 + g * 14) + '" ry="9" fill="rgba(46,36,27,.12)"/>' +
      '<line x1="150" y1="' + baseY + '" x2="150" y2="' + (baseY - stemH) + '" stroke="#2A5930" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M150 ' + (baseY - stemH * 0.55) + ' q ' + (-30 * leaf) + ' ' + (-6 * leaf) + ' ' + (-38 * leaf) + ' 4 q ' + (10 * leaf) + ' ' + (16 * leaf) + ' ' + (38 * leaf) + ' ' + (6 * leaf) + ' z" fill="#3F7D45"/>' +
      '<path d="M150 ' + (baseY - stemH) + ' q ' + (28 * leaf) + ' ' + (-8 * leaf) + ' ' + (36 * leaf) + ' -2 q ' + (-8 * leaf) + ' ' + (18 * leaf) + ' ' + (-36 * leaf) + ' ' + (10 * leaf) + ' z" fill="#3F7D45"/>' +
      '<path d="M150 ' + (baseY - stemH) + ' q ' + (-28 * leaf) + ' ' + (-8 * leaf) + ' ' + (-36 * leaf) + ' -2 q ' + (8 * leaf) + ' ' + (18 * leaf) + ' ' + (36 * leaf) + ' ' + (10 * leaf) + ' z" fill="#3F7D45"/>' +
    '</svg>';
}

/* ---------- init ---------- */
function init(){
  growth = 1;
  growthSlider.value = 100;
  updateGrowthLabel();
  updateAll(false);   // set numbers/desc, draw mature plant
  playGrowth();       // then animate it growing in
}

init();
