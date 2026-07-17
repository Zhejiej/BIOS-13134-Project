/* Guided walkthrough. A spotlight tour of the game, replayable with the "?" button. */

/* step content. target is a CSS selector to spotlight, or null for a centered card */
const STEPS = [
  {
    target: '#primer',
    title: 'Start with the biology',
    body: 'A quick look at the meristem, the tiny clump of cells at the plant\'s tip that every gene here acts on.'
  },
  {
    target: '#inquiry .brief-block:first-child',
    title: 'The research question',
    body: 'From a real study, can changing certain genes change how much corn a plant makes?'
  },
  {
    target: '#inquiry .brief-block:last-child',
    title: 'The hypothesis',
    body: 'The guess is that switching these genes off grows a bigger tip, which should mean more corn.'
  },
  {
    target: '.col-genes',
    title: 'Knock out genes',
    body: 'Knocking out a gene means switching it off so it stops working. Pick the genes to knock out here, and each one changes the plant in its own way.'
  },
  {
    target: '.gene-toggle[data-gene="pfkb"]',
    title: 'Switch a gene off',
    body: 'Tap a gene to switch it off. The results update right away.'
  },
  {
    target: '#grow-btn',
    title: 'Grow the plant',
    body: 'Press Grow seed to watch your plant grow up.'
  },
  {
    target: '.screen-card',
    title: 'The screen',
    body: 'Watch your plant here. Drag the slider to move it through its life.'
  },
  {
    target: '.col-results',
    title: 'Read the results',
    body: 'See how your plant compares to a normal one, from tip size to total yield.'
  },
  {
    target: '#live-desc',
    title: 'What happened',
    body: 'A quick summary of what your changes did to the plant.'
  },
  {
    target: '#additional',
    title: 'The real research',
    body: 'Want more? The real study behind the game is written up down here.'
  }
];

const TOUR_KEY = 'maize-tour-seen';

/* ---------- state ---------- */
let tourIndex = 0;
let overlay = null;
let spotlight = null;
let card = null;

/* ---------- build the overlay once ---------- */
function buildOverlay(){
  overlay = document.createElement('div');
  overlay.id = 'tour-overlay';

  spotlight = document.createElement('div');
  spotlight.className = 'tour-spotlight';

  card = document.createElement('div');
  card.className = 'tour-card';

  overlay.appendChild(spotlight);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

/* ---------- show a step ---------- */
function showStep(i){
  tourIndex = Math.max(0, Math.min(STEPS.length - 1, i));
  const step = STEPS[tourIndex];
  const isLast = tourIndex === STEPS.length - 1;
  const isFirst = tourIndex === 0;

  card.innerHTML = `
    <button class="tour-skip" type="button" aria-label="Skip walkthrough">&times;</button>
    <p class="tour-count">${tourIndex + 1} / ${STEPS.length}</p>
    <h3 class="tour-title">${step.title}</h3>
    <p class="tour-body">${step.body}</p>
    <div class="tour-nav">
      <button class="tour-back" type="button" ${isFirst ? 'disabled' : ''}>Back</button>
      <button class="tour-next" type="button">${isLast ? 'Done' : 'Next'}</button>
    </div>`;

  card.querySelector('.tour-skip').addEventListener('click', endTour);
  card.querySelector('.tour-back').addEventListener('click', () => { if(!isFirst) showStep(tourIndex - 1); });
  card.querySelector('.tour-next').addEventListener('click', () => { isLast ? endTour() : showStep(tourIndex + 1); });

  const target = step.target ? document.querySelector(step.target) : null;

  if(target){
    // Force an instant jump so the target's position is final before we
    // measure it. The page sets scroll-behavior:smooth globally, which would
    // otherwise leave the fixed spotlight lagging behind a mid-flight scroll.
    const html = document.documentElement;
    const prevBehavior = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    target.scrollIntoView({ block: 'center' });
    html.style.scrollBehavior = prevBehavior;
    requestAnimationFrame(() => requestAnimationFrame(() => positionStep(target)));
  } else {
    positionStep(null);
  }
}

/* ---------- position spotlight + card ---------- */
function positionStep(target){
  if(!target){
    // centered intro card, no spotlight
    spotlight.style.opacity = '0';
    card.classList.add('tour-card--center');
    overlay.classList.add('centered');
    card.style.top = '';
    card.style.left = '';
    return;
  }

  card.classList.remove('tour-card--center');
  overlay.classList.remove('centered');
  const pad = 8;
  const r = target.getBoundingClientRect();

  spotlight.style.opacity = '1';
  spotlight.style.top = (r.top - pad) + 'px';
  spotlight.style.left = (r.left - pad) + 'px';
  spotlight.style.width = (r.width + pad * 2) + 'px';
  spotlight.style.height = (r.height + pad * 2) + 'px';

  // place the card below the target if there's room, else above,
  // then clamp both axes so the card is always fully inside the viewport.
  const cardRect = card.getBoundingClientRect();
  const gap = 14;
  const spaceBelow = window.innerHeight - r.bottom;
  let top;
  if(spaceBelow > cardRect.height + gap + 20){
    top = r.bottom + gap;
  } else {
    top = r.top - cardRect.height - gap;
  }
  top = Math.max(12, Math.min(top, window.innerHeight - cardRect.height - 12));

  let left = r.left + r.width / 2 - cardRect.width / 2;
  left = Math.max(12, Math.min(left, window.innerWidth - cardRect.width - 12));

  card.style.top = top + 'px';
  card.style.left = left + 'px';
}

/* ---------- start / end ---------- */
function startTour(){
  if(!overlay) buildOverlay();
  overlay.classList.add('open');
  document.addEventListener('keydown', onKey);
  window.addEventListener('resize', onResize);
  showStep(0);
}

function endTour(){
  if(overlay) overlay.classList.remove('open');
  document.removeEventListener('keydown', onKey);
  window.removeEventListener('resize', onResize);
  try { localStorage.setItem(TOUR_KEY, '1'); } catch(e) { /* file:// fallback, ignore */ }
}

function onKey(e){
  if(e.key === 'Escape') endTour();
  else if(e.key === 'ArrowRight'){ if(tourIndex < STEPS.length - 1) showStep(tourIndex + 1); }
  else if(e.key === 'ArrowLeft'){ if(tourIndex > 0) showStep(tourIndex - 1); }
}

function onResize(){
  const step = STEPS[tourIndex];
  const target = step && step.target ? document.querySelector(step.target) : null;
  positionStep(target);
}

/* ---------- wire up ---------- */
const helpBtn = document.getElementById('help-btn');
if(helpBtn) helpBtn.addEventListener('click', startTour);

/* auto-run every time the page is entered */
setTimeout(startTour, 500);
