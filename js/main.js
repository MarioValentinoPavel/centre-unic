/* Centre Únic — empremta generativa que es transforma amb cada secció */
gsap.registerPlugin(ScrollTrigger);
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

/* ---------- generador d'empremtes ---------- */
const RINGS = 34, SAMPLES = 220;
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function makePrint(seed) {
  const r = rng(seed);
  const waves = Array.from({ length: 5 }, (_, k) => ({ k: k + 1, a: (r() - .5) * .12 / (k + 1), p: r() * 6.283 }));
  const warp = { a: .12 + r() * .12, p: r() * 6.283, sx: .74 + r() * .1, tilt: (r() - .5) * .5, delta: .15 + r() * .25, dp: r() * 6.283 };
  const rings = [];
  for (let i = 0; i < RINGS; i++) {
    const f = i / RINGS;
    const gaps = Array.from({ length: 1 + (r() * 3 | 0) }, () => { const c = r() * 6.283; return [c, c + .06 + r() * .18]; });
    const pts = [];
    for (let s = 0; s <= SAMPLES; s++) {
      const th = s / SAMPLES * Math.PI * 2;
      let rad = .06 + f * .9;
      for (const w of waves) rad += w.a * Math.sin(w.k * th + w.p + i * .15) * f;
      rad *= 1 + warp.a * Math.sin(2 * th + warp.p) * f;
      rad *= 1 + warp.delta * Math.max(0, Math.cos(th - warp.dp)) ** 3 * f; // lazo lateral
      const x = Math.cos(th + warp.tilt) * rad * warp.sx, y = Math.sin(th + warp.tilt) * rad;
      const gap = gaps.some(([a, b]) => th > a && th < b);
      pts.push([x, y, gap ? 0 : 1]);
    }
    rings.push(pts);
  }
  return rings;
}
function draw(ctx, W, H, A, B, k, reveal, color, lw, sc = .46) {
  ctx.clearRect(0, 0, W, H);
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round';
  const S = Math.min(W, H) * sc, cx = W / 2, cy = H / 2;
  for (let i = 0; i < RINGS; i++) {
    const vis = Math.min(1, Math.max(0, reveal * 1.6 - i / RINGS * .6));
    if (vis <= 0) continue;
    const a = A[i], b = B[i];
    const n = Math.floor(SAMPLES * vis);
    ctx.globalAlpha = .35 + .65 * (1 - i / RINGS * .5);
    ctx.beginPath();
    let pen = false;
    for (let s = 0; s <= n; s++) {
      const on = k < .5 ? a[s][2] : b[s][2];
      const x = cx + (a[s][0] + (b[s][0] - a[s][0]) * k) * S, y = cy + (a[s][1] + (b[s][1] - a[s][1]) * k) * S;
      if (!on) { pen = false; continue; }
      pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y); pen = true;
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
function setupCanvas(cv) {
  const dpr = Math.min(2, devicePixelRatio || 1);
  const r = cv.getBoundingClientRect();
  cv.width = r.width * dpr; cv.height = r.height * dpr;
  return { ctx: cv.getContext('2d'), W: cv.width, H: cv.height, dpr };
}

/* ---------- empremta gran (columna fixa) ---------- */
const big = { cv: $('#printCanvas') };
big.A = makePrint(1); big.B = big.A; big.k = 1; big.reveal = 0;
function sizeBig() { Object.assign(big, setupCanvas(big.cv)); renderBig(); }
function renderBig() { draw(big.ctx, big.W, big.H, big.A, big.B, big.k, big.reveal, '#efe6d8', 1.25 * big.dpr); }
sizeBig(); addEventListener('resize', sizeBig);
// entrada: les crestes apareixen del centre cap enfora
gsap.to(big, { reveal: 1, duration: 3.2, ease: 'power2.out', onUpdate: renderBig, delay: .2 });
let bigTween;
function morphTo(seed) {
  const cur = big.k >= 1 ? big.B : big.A.map((ring, i) => ring.map((p, s) => [p[0] + (big.B[i][s][0] - p[0]) * big.k, p[1] + (big.B[i][s][1] - p[1]) * big.k, big.k < .5 ? p[2] : big.B[i][s][2]]));
  big.A = cur; big.B = makePrint(seed); big.k = 0;
  bigTween && bigTween.kill();
  bigTween = gsap.to(big, { k: 1, duration: 1.6, ease: 'power3.inOut', onUpdate: renderBig });
}
// respiració lenta: la columna gira molt poc
gsap.to('#printCanvas', { rotation: 4, duration: 9, yoyo: true, repeat: -1, ease: 'sine.inOut' });

/* ---------- cada secció canvia l'empremta ---------- */
$$('.block').forEach(b => {
  ScrollTrigger.create({
    trigger: b, start: 'top 55%', end: 'bottom 55%',
    onToggle: s => {
      if (!s.isActive) return;
      morphTo(+b.dataset.seed);
      $('#printNo').textContent = 'Empremta nº ' + b.dataset.no;
      gsap.fromTo('#printCap', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .7, ease: 'power2.out' });
      $('#printCap').textContent = b.dataset.cap;
    }
  });
});

/* ---------- la teva empremta ---------- */
(function gen() {
  const cv = $('#genCanvas'), input = $('#genName'), out = $('#genOut'), cta = $('#genCta');
  let g = setupCanvas(cv), cur = makePrint(55), st = { k: 1, r: 1 }, prev = cur, tw;
  const render = () => draw(g.ctx, g.W, g.H, prev, cur, st.k, st.r, "#2e4a3f", 1.1 * g.dpr, .36);
  render();
  addEventListener('resize', () => { g = setupCanvas(cv); render(); });
  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const name = input.value.trim();
      const seed = name ? hash(name.toLowerCase()) : 55;
      prev = cur; cur = makePrint(seed); st.k = 0;
      tw && tw.kill(); tw = gsap.to(st, { k: 1, duration: 1.2, ease: 'power3.inOut', onUpdate: render });
      if (innerWidth > 900) morphTo(seed);
      if (name) {
        const crests = 28 + seed % 13;
        out.textContent = `L'empremta de ${name}: ${crests} crestes i cap d'igual al món. La teva pell també és així: mereix un diagnòstic fet només per a tu.`;
        cta.href = 'https://wa.me/34635857503?text=' + encodeURIComponent(`Hola Centre Únic, soc ${name}. Voldria reservar un diagnòstic de pell.`);
        cta.textContent = `Reserva el diagnòstic de ${name}`;
      } else {
        out.textContent = 'Cada nom dibuixa una empremta diferent. Com la teva pell.';
        cta.href = 'https://appcentreunic.viday.es'; cta.textContent = 'Reserva el diagnòstic de la teva pell';
      }
    }, 180);
  });
})();

/* ---------- entrades ---------- */
gsap.from('.hero > *', { y: 50, opacity: 0, duration: 1.3, ease: 'expo.out', stagger: .1, delay: .3 });
$$('.block:not(.hero) > *').forEach(n => {
  gsap.from(n, { y: 40, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: n, start: 'top 90%' } });
});
