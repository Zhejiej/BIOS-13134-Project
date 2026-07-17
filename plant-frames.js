/* Specimen art for the plant screen. Overrides renderPlant() from script.js
   so the plant box shows the images in assets/plant. */
(function(){
  const DIR = 'assets/plant/';

  /* universal early growth (seed -> seedling) */
  const EARLY = ['stage-0.jpg','stage-1.jpg','stage-2.jpg','stage-3.jpg','stage-4.jpg'];

  /* mature stalk before corn, by stem height */
  const STALK = { small:'stage-5.jpg', medium:'stage-6.jpg', large:'stage-7.jpg' };

  /* mature plant with corn, keyed stem|corn|meristem */
  const VARIANTS = [
    { stem:'large',  corn:'normal', meri:'normal', img:'stage-8.jpg' },
    { stem:'large',  corn:'big',    meri:'normal', img:'plant-1.jpg' },
    { stem:'large',  corn:'normal', meri:'big',    img:'plant-2.jpg' },
    { stem:'large',  corn:'big',    meri:'big',    img:'plant-3.jpg' },
    { stem:'medium', corn:'normal', meri:'normal', img:'plant-4.jpg' },
    { stem:'medium', corn:'normal', meri:'big',    img:'plant-9.jpg' },
    { stem:'small',  corn:'normal', meri:'normal', img:'plant-5.jpg' },
    { stem:'small',  corn:'big',    meri:'normal', img:'plant-6.jpg' },
    { stem:'small',  corn:'normal', meri:'big',    img:'plant-7.jpg' },
    { stem:'small',  corn:'big',    meri:'big',    img:'plant-8.jpg' }
  ];

  const STEM_N = { small:0, medium:1, large:2 };
  const BIN_N  = { normal:0, big:1 };

  const box = document.getElementById('plant-box');
  if(!box) return;

  /* preload everything so scrubbing / growing never flashes */
  EARLY.concat(['stage-5.jpg','stage-6.jpg','stage-7.jpg','stage-8.jpg'])
    .concat(['plant-1.jpg','plant-2.jpg','plant-3.jpg','plant-4.jpg','plant-9.jpg',
             'plant-5.jpg','plant-6.jpg','plant-7.jpg','plant-8.jpg'])
    .forEach(f => { const im = new Image(); im.src = DIR + f; });

  /* bucket the stats into stem height, corn size, and meristem size */
  function buckets(stats){
    const h = (stats && stats.height != null) ? stats.height : 200;
    const a = (stats && stats.area   != null) ? stats.area   : 13000;
    const r = (stats && stats.rows   != null) ? stats.rows   : 16;
    return {
      stem: h >= 180 ? 'large' : (h >= 130 ? 'medium' : 'small'),
      corn: r > 16 ? 'big' : 'normal',
      meri: a > 13000 ? 'big' : 'normal'
    };
  }

  /* nearest variant, weighting height most, then meristem, then corn */
  function variantImg(b){
    let best = VARIANTS[0], bestD = Infinity;
    for(const v of VARIANTS){
      const d = 3 * Math.abs(STEM_N[b.stem] - STEM_N[v.stem])
              + 2 * Math.abs(BIN_N[b.meri] - BIN_N[v.meri])
              + 1 * Math.abs(BIN_N[b.corn] - BIN_N[v.corn]);
      if(d < bestD){ bestD = d; best = v; }
    }
    return best.img;
  }

  /* frame list: early growth, stalk frames by height, then the corn variant */
  function frameList(stats){
    const b = buckets(stats);
    const stalkCount = b.stem === 'large' ? 3 : (b.stem === 'medium' ? 2 : 1);
    const stalks = ['stage-5.jpg','stage-6.jpg','stage-7.jpg'].slice(0, stalkCount);
    return EARLY.concat(stalks).concat([ variantImg(b) ]);
  }

  let img = null;
  function ensureImg(){
    if(img && img.parentNode === box) return;
    box.innerHTML = '';
    img = document.createElement('img');
    img.className = 'plant-frame';
    img.alt = 'Maize specimen at the current growth stage';
    box.appendChild(img);
  }

  let lastSrc = null;
  window.renderPlant = function(stats, g){
    ensureImg();
    g = Math.max(0, Math.min(1, Number(g) || 0));
    const frames = frameList(stats);
    const src = DIR + frames[Math.round(g * (frames.length - 1))];
    if(src !== lastSrc){ img.src = src; lastSrc = src; }
  };

  /* repaint immediately */
  const g0 = (typeof growth !== 'undefined') ? growth : 1;
  const s0 = (typeof currentStats !== 'undefined') ? currentStats : null;
  window.renderPlant(s0, g0);
})();
