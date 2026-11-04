/* Centre Únic — motor de l'empremta (WebGL)
   Les crestes neixen d'un soroll i s'ordenen amb filtres de Gabor orientats, com es formen les empremtes reals.
   L'orientació surt de nuclis i deltes (model de Sherlock i Monro), així que hi ha llaços, remolins i arcs
   amb terminacions i bifurcacions naturals. Tot és determinista: la mateixa llavor dibuixa la mateixa empremta. */
(function () {
  const A = 1.25; // mitja alçada de l'empremta (l'amplada va de -1 a 1)

  const HEAD = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 v;
float dec(vec4 c){ return (c.r + c.g / 255.0) * 2.0 - 1.0; }
vec4 enc(float x){ float u = clamp(x * 0.5 + 0.5, 0.0, 1.0) * 255.0; float h = floor(u); return vec4(h / 255.0, u - h, 0.0, 1.0); }
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
`;
  const VS = 'attribute vec2 a; varying vec2 v; void main(){ v = a * 0.5 + 0.5; gl_Position = vec4(a, 0.0, 1.0); }';

  // camp d'orientació: vector d'angle doble (cos 2θ, sin 2θ)
  const FIELD = `
uniform vec2 uC0, uC1, uD0, uD1;
uniform float uTh0, uChaos, uSeed, uBump, uSoft, uB0, uB1, uP0, uP1;
float ang(vec2 p, vec2 q){ vec2 d = p - q; return atan(d.y, d.x); }
// nucli amb braços paral·lels (forquilla) en lloc d'un ventall: corba l'angle al voltant de l'eix del llaç
float core(vec2 p, vec2 c, float b, float pw){
  float a = ang(p, c) - b; a -= 6.2831853 * floor((a + 3.1415927) / 6.2831853);
  float e = mix(pw, 1.0, smoothstep(0.22, 0.75, length(p - c)));
  return b + sign(a) * 3.1415927 * pow(abs(a) / 3.1415927, e);
}
vec2 sm(vec2 p){
  float th = uTh0 + 0.5 * (core(p, uC0, uB0, uP0) + core(p, uC1, uB1, uP1) - ang(p, uD0) - ang(p, uD1));
  th += uBump * -p.x * exp(-p.x * p.x * 2.2) * exp(-(p.y + 0.2) * (p.y + 0.2) * 1.6);
  return vec2(cos(2.0 * th), sin(2.0 * th));
}
vec2 field(vec2 p){
  vec2 f = sm(p);
  if (uSoft > 0.0) {
    f += sm(p + vec2(uSoft, 0.0)) + sm(p - vec2(uSoft, 0.0)) + sm(p + vec2(0.0, uSoft)) + sm(p - vec2(0.0, uSoft));
    f += sm(p + vec2(0.7, 0.7) * uSoft) + sm(p - vec2(0.7, 0.7) * uSoft) + sm(p + vec2(0.7, -0.7) * uSoft) + sm(p - vec2(0.7, -0.7) * uSoft);
  }
  if (uChaos > 0.0) { float c = uChaos * (vnoise(p * 2.3 + uSeed) - 0.5) * 6.8; f = vec2(f.x * cos(c) - f.y * sin(c), f.x * sin(c) + f.y * cos(c)); }
  vec2 o = p - vec2(0.0, -0.1);
  float phi = atan(o.y, o.x) + 1.5707963;
  float w = smoothstep(0.66, 1.08, length(o * vec2(1.0, 0.8))) * smoothstep(-0.3, 0.3, p.y);
  f = mix(f, vec2(cos(2.0 * phi), sin(2.0 * phi)), w * 0.85);
  f = mix(f, vec2(1.0, 0.0), smoothstep(-0.6, -1.15, p.y) * 0.85);
  return f;
}`;

  const SIM = HEAD + FIELD + `
uniform sampler2D uS;
uniform vec2 uR;
uniform float uT, uG, uFrame;
uniform vec3 uBrush;
void main(){
  vec2 p = vec2(v.x * 2.0 - 1.0, (v.y * 2.0 - 1.0) * ${A.toFixed(2)});
  vec2 f = field(p);
  float th = 0.5 * atan(f.y, f.x);
  vec2 t = vec2(cos(th), sin(th)), n = vec2(-t.y, t.x);
  float T = uT * (1.0 + 0.12 * (vnoise(p * 1.6 + uSeed * 1.7) - 0.5));
  float st = 0.33 * T, su = 0.62 * T, sv = 0.44 * T, k = 6.2831853 / T;
  float acc = 0.0, gs = 0.0, ga = 0.0, ms = 0.0;
  for (int i = -3; i <= 3; i++) {
    float uu = float(i) * st;
    float eu = exp(-0.5 * uu * uu / (su * su));
    for (int j = -3; j <= 3; j++) {
      float ww = float(j) * st;
      float g = eu * exp(-0.5 * ww * ww / (sv * sv)) * cos(k * ww);
      float s = dec(texture2D(uS, v + (t * uu + n * ww) / uR));
      acc += g * s; gs += g; ga += abs(g); ms += s;
    }
  }
  float x = clamp((acc - gs * ms / 49.0) / ga * uG, -6.0, 6.0);
  float e2 = exp(2.0 * x), val = (e2 - 1.0) / (e2 + 1.0);
  if (uBrush.z > 0.0) {
    float b = 1.0 - smoothstep(uBrush.z * 0.45, uBrush.z, length(p - uBrush.xy));
    val = mix(val, hash(v * uR + uFrame) * 2.0 - 1.0, b);
  }
  gl_FragColor = enc(val);
}`;

  const INIT = HEAD + `
uniform vec2 uR; uniform float uT, uSeed;
void main(){
  vec2 q = v * uR / (uT * 0.55);
  float x = (vnoise(q + uSeed * 3.1) - 0.5) * 1.1 + (hash(v * uR + uSeed) - 0.5) * 0.5;
  gl_FragColor = enc(x);
}`;

  const SHOW = (deriv) => (deriv ? '#extension GL_OES_standard_derivatives : enable\n' : '') + HEAD + `
uniform sampler2D uS;
uniform vec2 uV, uOff;
uniform float uScale, uRot, uPress, uThick, uAlpha, uScanY, uScan, uSeed, uEdge;
uniform vec3 uInk;
void main(){
  vec2 px = v * uV - uOff;
  float s = min(uV.x / 2.0, uV.y / ${(2 * A).toFixed(2)}) * uScale;
  vec2 p = (px - 0.5 * uV) / s;
  float c = cos(uRot), sn = sin(uRot);
  p = vec2(c * p.x + sn * p.y, -sn * p.x + c * p.y);
  float val = dec(texture2D(uS, vec2(p.x * 0.5 + 0.5, p.y / ${(2 * A).toFixed(2)} + 0.5)));
  ${deriv ? 'float aa = fwidth(val) * 0.85 + 0.004;' : 'float aa = 0.09;'}
  float sc = uScan * exp(-pow((p.y - uScanY) / 0.12, 2.0));
  float th = uThick - sc * 0.5;
  float ink = smoothstep(th - aa, th + aa, val);
  float r = length(p / vec2(0.92, 1.19));
  float en = (vnoise(p * 2.6 + uSeed) - 0.5) * 0.16 + (vnoise(p * 8.0 + 7.0) - 0.5) * 0.05;
  float R = uPress * 1.02;
  float m = 1.0 - smoothstep(R - uEdge, R, r + en);
  float pres = 0.74 + 0.26 * smoothstep(0.15, 0.85, vnoise(p * 1.5 + uSeed * 0.7 + 2.0));
  float line = uScan * exp(-pow((p.y - uScanY) / 0.008, 2.0)) * smoothstep(1.25, 0.6, r);
  float a = clamp(ink * m * (pres + sc * 0.6) + sc * 0.07 * m + line * 0.55, 0.0, 1.0);
  gl_FragColor = vec4(uInk * a, a) * uAlpha;
}`;

  /* ---------- llavors ---------- */
  function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hash(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  const FAR = [0, -3.2];
  // tipus: llaç (cap a la dreta o l'esquerra), remolí, doble llaç, arc en tenda, arc
  function spec(seed, cls) {
    const r = rng(seed), j = (a) => (r() - .5) * 2 * a;
    if (!cls) { const x = r(); cls = x < .32 ? 'loopR' : x < .62 ? 'loopL' : x < .86 ? 'whorl' : x < .93 ? 'twin' : x < .97 ? 'tent' : 'arch'; }
    let c0 = FAR, c1 = FAR, d0 = FAR, d1 = FAR;
    if (cls === 'loopR') { c0 = [.06 + j(.1), .14 + j(.12)]; d0 = [-.58 + j(.1), -.46 + j(.1)]; }
    if (cls === 'loopL') { c0 = [-.06 + j(.1), .14 + j(.12)]; d0 = [.58 + j(.1), -.46 + j(.1)]; }
    if (cls === 'whorl') { const s = .05 + r() * .05; c0 = [-s + j(.04), .12 + j(.08)]; c1 = [s + j(.04), .06 + j(.08)]; d0 = [-.62 + j(.08), -.5 + j(.1)]; d1 = [.62 + j(.08), -.52 + j(.1)]; }
    if (cls === 'twin') { c0 = [-.18 + j(.06), .3 + j(.06)]; c1 = [.16 + j(.06), -.04 + j(.06)]; d0 = [-.66 + j(.06), -.36 + j(.08)]; d1 = [.62 + j(.06), -.62 + j(.06)]; }
    if (cls === 'tent') { c0 = [j(.08), -.02 + j(.08)]; d0 = [c0[0] + j(.04), c0[1] - .3]; }
    return { cls, c0, c1, d0, d1, th0: j(.07), T: 8.6 + r() * 1.1, rot: j(.14), bump: cls === 'arch' ? .6 + r() * .3 : 0, hair: cls === 'whorl' ? 1 : 1.85 + r() * .4, seed: (seed % 997) + r() };
  }

  /* ---------- motor ---------- */
  function Engine(canvas, o = {}) {
    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: !!o.preserve });
    if (!gl) throw new Error('webgl');
    const deriv = !!gl.getExtension('OES_standard_derivatives');
    const W = o.simW || 320, H = Math.round(W * A);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    function prog(fs) {
      const p = gl.createProgram();
      for (const [type, src] of [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, fs]]) {
        const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
        gl.attachShader(p, s);
      }
      gl.bindAttribLocation(p, 0, 'a'); gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i); u[a.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(p, a.name); }
      return { p, u };
    }
    const P = { sim: prog(SIM), init: prog(INIT), show: prog(SHOW(deriv)) };
    const tex = [], fbo = [];
    for (let i = 0; i < 2; i++) {
      const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      tex.push(t); fbo.push(f);
    }
    let cur = 0, frame = 0;
    const st = Object.assign({
      scale: .86, rot: 0, press: 1, thick: .42, alpha: 1, scanY: 2, scan: 0, edge: .16, offX: 0, offY: 0,
      ink: [.937, .902, .847], gain: 2.35, chaos: 0, soft: 0, brush: [0, 0, 0]
    }, o.style || {});
    let S = spec(1, 'whorl');
    const quad = (pr) => { gl.useProgram(pr.p); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); };
    const setField = (u) => {
      gl.uniform2fv(u.uC0, S.c0); gl.uniform2fv(u.uC1, S.c1); gl.uniform2fv(u.uD0, S.d0); gl.uniform2fv(u.uD1, S.d1);
      gl.uniform1f(u.uTh0, S.th0); gl.uniform1f(u.uChaos, st.chaos); gl.uniform1f(u.uSeed, S.seed);
      gl.uniform1f(u.uBump, S.bump || 0); gl.uniform1f(u.uSoft, st.soft);
      // eix de cada nucli: on el camp de la resta de punts singulars seria radial
      const at = (p, q) => Math.atan2(p[1] - q[1], p[0] - q[0]);
      const axis = (c, oc) => 2 * (S.th0 + .5 * (at(c, oc) - at(c, S.d0) - at(c, S.d1)));
      gl.uniform1f(u.uB0, axis(S.c0, S.c1)); gl.uniform1f(u.uB1, axis(S.c1, S.c0));
      const pw = S.hair == null ? 1 : S.hair;
      gl.uniform1f(u.uP0, pw); gl.uniform1f(u.uP1, S.cls === 'twin' ? pw : 1);
    };
    function seedNoise() {
      quad(P.init); gl.viewport(0, 0, W, H); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo[cur]);
      gl.uniform2f(P.init.u.uR, W, H); gl.uniform1f(P.init.u.uT, S.T); gl.uniform1f(P.init.u.uSeed, S.seed);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    function step(n = 1) {
      quad(P.sim); gl.viewport(0, 0, W, H);
      const u = P.sim.u; setField(u);
      gl.uniform2f(u.uR, W, H); gl.uniform1f(u.uT, S.T); gl.uniform1f(u.uG, st.gain); gl.uniform1i(u.uS, 0);
      gl.activeTexture(gl.TEXTURE0);
      for (let i = 0; i < n; i++) {
        gl.uniform1f(u.uFrame, ++frame % 997);
        gl.uniform3fv(u.uBrush, i === 0 ? st.brush : [0, 0, 0]);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo[1 - cur]); gl.bindTexture(gl.TEXTURE_2D, tex[cur]);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); cur = 1 - cur;
      }
    }
    function draw() {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      quad(P.show); const u = P.show.u;
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex[cur]); gl.uniform1i(u.uS, 0);
      gl.uniform2f(u.uV, canvas.width, canvas.height); gl.uniform2f(u.uOff, st.offX * canvas.width, st.offY * canvas.height);
      gl.uniform1f(u.uScale, st.scale); gl.uniform1f(u.uRot, st.rot + S.rot); gl.uniform1f(u.uPress, st.press);
      gl.uniform1f(u.uThick, st.thick); gl.uniform1f(u.uAlpha, st.alpha); gl.uniform1f(u.uScanY, st.scanY); gl.uniform1f(u.uScan, st.scan);
      gl.uniform1f(u.uSeed, S.seed); gl.uniform1f(u.uEdge, st.edge); gl.uniform3fv(u.uInk, st.ink);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    // les crestes entre el nucli i el delta (recompte com en dactiloscòpia)
    function ridgeCount() {
      if (S.cls === 'arch') return 0;
      const px = new Uint8Array(W * H * 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo[cur]); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
      const at = (x, y) => { const i = (Math.round((y / A * .5 + .5) * (H - 1)) * W + Math.round((x * .5 + .5) * (W - 1))) * 4; return (px[i] + px[i + 1] / 255) / 255 * 2 - 1; };
      const [a, b] = [S.c0, S.d0], L = Math.hypot(b[0] - a[0], b[1] - a[1]), N = Math.ceil(L * W);
      let state = 0, cross = 0;
      for (let i = 2; i < N - 1; i++) {
        const k = i / N, val = at(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k);
        const s = val > .25 ? 1 : val < -.25 ? -1 : 0;
        if (s && s !== state) { if (state === -1 && s === 1) cross++; state = s; }
      }
      return cross;
    }
    // client → coordenades de l'empremta
    function toPrint(cx, cy) {
      const r = canvas.getBoundingClientRect();
      const sx = canvas.width / r.width, X = (cx - r.left) * sx - st.offX * canvas.width, Y = (r.bottom - cy) * sx - st.offY * canvas.height;
      const s = Math.min(canvas.width / 2, canvas.height / (2 * A)) * st.scale;
      let x = (X - canvas.width / 2) / s, y = (Y - canvas.height / 2) / s;
      const a = st.rot + S.rot, c = Math.cos(a), sn = Math.sin(a);
      return [c * x + sn * y, -sn * x + c * y];
    }
    return {
      gl, W, H, st, get spec() { return S; },
      reset(s) { S = s; seedNoise(); },
      setSpec(s) { S = s; },
      step, draw, ridgeCount, toPrint,
      resize(w, h) { if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; } },
      lose() { const x = gl.getExtension('WEBGL_lose_context'); x && x.loseContext(); }
    };
  }

  const lerp = (a, b, k) => a + (b - a) * k, lerp2 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  function mix(a, b, k) {
    return { cls: k < .5 ? a.cls : b.cls, c0: lerp2(a.c0, b.c0, k), c1: lerp2(a.c1, b.c1, k), d0: lerp2(a.d0, b.d0, k), d1: lerp2(a.d1, b.d1, k), th0: lerp(a.th0, b.th0, k), T: lerp(a.T, b.T, k), rot: lerp(a.rot, b.rot, k), bump: lerp(a.bump || 0, b.bump || 0, k), hair: lerp(a.hair || 1, b.hair || 1, k), seed: k < .5 ? a.seed : b.seed };
  }

  /* ---------- fotos que apareixen a través de les crestes ---------- */
  const REVEAL = (deriv) => (deriv ? '#extension GL_OES_standard_derivatives : enable\n' : '') + HEAD + `
uniform sampler2D uImg, uF;
uniform vec2 uV, uI, uFs;
uniform float uT;
void main(){
  float va = uV.x / uV.y, ia = uI.x / uI.y, fa = uFs.x / uFs.y;
  vec2 iu = v, fu = v;
  if (ia > va) iu.x = (v.x - 0.5) * va / ia + 0.5; else iu.y = (v.y - 0.5) * ia / va + 0.5;
  if (fa > va) fu.x = (v.x - 0.5) * va / fa + 0.5; else fu.y = (v.y - 0.5) * fa / va + 0.5;
  vec4 col = texture2D(uImg, vec2(iu.x, 1.0 - iu.y));
  float f = texture2D(uF, vec2(fu.x, 1.0 - fu.y)).r * 2.0 - 1.0;
  float r = length((v - 0.5) * vec2(va, 1.0)) / length(vec2(va, 1.0) * 0.5);
  float th = 1.08 + 0.9 * r - 3.1 * uT;
  ${deriv ? 'float aa = fwidth(f) * 0.9 + 0.01;' : 'float aa = 0.06;'}
  float a = smoothstep(th - aa, th + aa, f);
  gl_FragColor = vec4(col.rgb * a, a);
}`;
  function Reveal(fieldSrc) {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false });
    if (!gl) return null;
    canvas.className = 'reveal-gl'; canvas.setAttribute('aria-hidden', 'true');
    const deriv = !!gl.getExtension('OES_standard_derivatives');
    const p = gl.createProgram();
    for (const [type, src] of [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, REVEAL(deriv)]]) {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) return null;
      gl.attachShader(p, s);
    }
    gl.bindAttribLocation(p, 0, 'a'); gl.linkProgram(p); gl.useProgram(p);
    const U = (n) => gl.getUniformLocation(p, n);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const mk = (unit) => { const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; };
    const tImg = mk(0), tF = mk(1);
    gl.uniform1i(U('uImg'), 0); gl.uniform1i(U('uF'), 1);
    const field = new Image(); field.src = fieldSrc;
    const ready = field.decode().then(() => { gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tF); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, field); gl.uniform2f(U('uFs'), field.naturalWidth, field.naturalHeight); });
    const ease = (k) => 1 - Math.pow(1 - k, 2.6);
    // el proper fotograma; si el navegador frena requestAnimationFrame, un temporitzador fa de recanvi
    const nextFrame = (fn) => { let ran = false; const go = () => { if (!ran) { ran = true; fn(); } }; requestAnimationFrame(go); setTimeout(go, 60); };
    let chain = Promise.resolve();
    // fig: contenidor (position:relative); el: la foto o el vídeo que es tapa; src: imatge ja carregada
    function run(fig, el, src, dur = 1500) {
      const asked = performance.now();
      chain = chain.then(() => new Promise((done) => {
        const finish = () => { fig.classList.add('is-in'); canvas.parentNode && canvas.remove(); done(); };
        if (performance.now() - asked > 1700) { fig.classList.add('is-fade'); return finish(); } // ja s'ha fet tard: sense efecte
        ready.then(() => {
          const r = el.getBoundingClientRect(), f = fig.getBoundingClientRect(), dpr = Math.min(1.5, devicePixelRatio || 1);
          canvas.width = Math.max(2, Math.round(r.width * dpr)); canvas.height = Math.max(2, Math.round(r.height * dpr));
          Object.assign(canvas.style, { left: r.left - f.left + 'px', top: r.top - f.top + 'px', width: r.width + 'px', height: r.height + 'px' });
          fig.appendChild(canvas);
          gl.viewport(0, 0, canvas.width, canvas.height);
          gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tImg);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
          gl.uniform2f(U('uV'), canvas.width, canvas.height);
          gl.uniform2f(U('uI'), src.naturalWidth || src.videoWidth || 1, src.naturalHeight || src.videoHeight || 1);
          const t0 = performance.now();
          (function frame() {
            const k = Math.min(1, (performance.now() - t0) / dur);
            gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
            gl.uniform1f(U('uT'), ease(k)); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            k < 1 ? nextFrame(frame) : finish();
          })();
        }).catch(finish);
      }));
      return chain;
    }
    return { run };
  }

  let ok = false;
  try { const c = document.createElement('canvas'); ok = !!(c.getContext('webgl')); } catch (_) {}
  window.Print = { Engine, Reveal, spec, mix, hash, rng, supported: ok, A };
})();
