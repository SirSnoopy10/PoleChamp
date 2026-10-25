// Silnik animacji splash (IMP-211): port `design/pole-spinner.js` bez DOM – rysuje klatkę 80×70
// do bufora RGBA (`out`, piksele ABGR little-endian jak ImageData). Algorytm bez zmian względem
// prototypu; paleta z tokenów Nocturne zamiast zmiennych CSS, losowość wstrzykiwana (testy).
const Q = 1.25,
  GW = 80,
  GH = 70,
  PX = 40,
  FPS = 24,
  LOOP = 5.5;
const HEADR = 2.7 * Q,
  NECK = 1.5 * Q,
  SHOE = 2.2 * Q;
const HSEG = 1.5 * Q;
const POLE = 1,
  FARARM = 2,
  FARLEG = 3,
  HAIR = 4,
  BODY = 5,
  NEARLEG = 6,
  NEARARM = 7;
const SKIN = 1,
  SKINF = 2,
  COST = 3,
  COSTF = 4,
  HAIRM = 5,
  SHOEM = 6,
  SHOEF = 7,
  EYE = 8,
  POLE0 = 10;

const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (a, s) => [a[0] * s, a[1] * s];
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const sn = (p) => [Math.floor(p[0]) + 0.5, Math.floor(p[1]) + 0.5];
const dir = (deg) => {
  const r = (deg * Math.PI) / 180;
  return [Math.sin(r), -Math.cos(r)];
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// t, pelvis, torso angle (0 = up, clockwise), head tilt (− = chin up), facing, body-in-front-of-pole,
// near hand + elbow hint, far hand + elbow hint, near ankle + knee hint, far ankle + knee hint. x is relative to the pole.
const K = (t, P, a, hd, f, pf, hN, eN, hF, eF, fN, kN, fF, kF) => ({
  t,
  P,
  a,
  hd,
  f,
  pf,
  hN,
  eN,
  hF,
  eF,
  fN,
  kN,
  fF,
  kF,
});
const KF = [
  K(
    0.0,
    [-5.5, 33.8],
    -4,
    -6,
    1,
    0,
    [-1.2, 16.5],
    [0.6, 0.8],
    [-7.6, 31],
    [-1, 0],
    [-3.5, 47.6],
    [1, 0],
    [-6.6, 47.6],
    [1, 0],
  ),
  K(
    0.5,
    [-6.5, 33.5],
    -12,
    -10,
    1,
    0,
    [-1.2, 18],
    [0.3, 1],
    [-16, 19.5],
    [0, -1],
    [3, 38],
    [0, -1],
    [-7.5, 47.6],
    [1, 0],
  ),
  K(
    0.9,
    [1, 34.5],
    -25,
    -12,
    1,
    1,
    [0, 17],
    [1, 0.3],
    [0, 21.5],
    [1, 0.6],
    [5, 45],
    [1, -0.5],
    [3.5, 46],
    [1, -0.3],
  ),
  K(
    1.3,
    [5.5, 33],
    14,
    8,
    -1,
    1,
    [0.8, 17],
    [0.5, 1],
    [0.8, 21.5],
    [0.3, 1],
    [1.5, 43.5],
    [-1, -0.4],
    [3.2, 44.5],
    [-1, -0.2],
  ),
  K(
    1.85,
    [-4.3, 24],
    90,
    10,
    -1,
    1,
    [0.8, 21],
    [0, -1],
    [0.8, 26.5],
    [0, 1],
    [-5.5, 10.5],
    [-1, 0],
    [-2.5, 11],
    [-1, 0],
  ),
  K(
    2.35,
    [3.4, 16.7],
    175,
    12,
    -1,
    0,
    [0.8, 19.5],
    [1, 0],
    [0.8, 34],
    [-1, 0],
    [13, 6.5],
    [0, -1],
    [-6.5, 5],
    [0, -1],
  ),
  K(
    2.75,
    [3.4, 16.4],
    177,
    14,
    -1,
    0,
    [0.8, 19.5],
    [1, 0],
    [0.8, 34],
    [-1, 0],
    [11.5, 3],
    [0, -1],
    [-9.5, 8.5],
    [0, -1],
  ),
  K(
    3.35,
    [15.3, 25.7],
    265,
    -20,
    -1,
    1,
    [0.8, 22.5],
    [0, -1],
    [0.8, 29],
    [0, 1],
    [12.5, 39],
    [-1, 0],
    [16.5, 39.5],
    [-1, 0],
  ),
  K(
    3.85,
    [6, 33.8],
    6,
    -10,
    -1,
    0,
    [1, 16.5],
    [1, 0.6],
    [14.5, 15.5],
    [0, -1],
    [3, 47.6],
    [-1, 0],
    [7.2, 47.6],
    [-1, 0],
  ),
  K(
    4.6,
    [6, 33.6],
    8,
    -12,
    -1,
    0,
    [1, 16.5],
    [1, 0.6],
    [15, 14.8],
    [0, -1],
    [3, 47.6],
    [-1, 0],
    [7.2, 47.6],
    [-1, 0],
  ),
];
KF.push(Object.assign({}, KF[0], { t: LOOP }));

// Rig: keys are authored as positions, then converted to joint space — shoulder in polar coords around the grip hand
// (the body swings on its arm like a pendulum), limbs as angles in the torso frame with the "front" axis scaled by
// facing (a turn foreshortens limbs instead of mirroring them). Grip hands and planted feet are IK'd to their targets.
const B = { UA: 5.5, FA: 5.0, TH: 7.5, SH: 7.2, SHO: 8.8, REACH: 10.3 };
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const smooth = (u) => {
  u = clamp(u, 0, 1);
  return u * u * (3 - 2 * u);
};
function ik(A, Tg, l1, l2, hint) {
  const dx = Tg[0] - A[0],
    dy = Tg[1] - A[1];
  let d = Math.hypot(dx, dy) || 1e-6;
  const ux = dx / d,
    uy = dy / d;
  d = Math.max(Math.abs(l1 - l2) + 0.05, Math.min(l1 + l2 - 0.02, d));
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d),
    h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  let px = -uy,
    py = ux;
  if (px * hint[0] + py * hint[1] < 0) {
    px = -px;
    py = -py;
  }
  return { m: [A[0] + ux * a + px * h, A[1] + uy * a + py * h], e: [A[0] + ux * d, A[1] + uy * d] };
}
// IK with a persistent bend side (relative to the root→target line, which turns continuously). The side only changes
// when the FK pose clearly bends the other way, and then the joint sweeps across over a few frames instead of popping.
function ikH(A, Tg, l1, l2, mid, key, mem) {
  const dx = Tg[0] - A[0],
    dy = Tg[1] - A[1],
    L = Math.hypot(dx, dy) || 1e-6,
    n = [-dy / L, dx / L];
  const off = (mid[0] - A[0]) * n[0] + (mid[1] - A[1]) * n[1],
    fk = off > 1.5 ? 1 : off < -1.5 ? -1 : 0;
  const st = mem[key] || (mem[key] = { side: fk || (off >= 0 ? 1 : -1), tr: 0 });
  st.tr = fk && fk !== st.side ? st.tr + 0.2 : Math.max(0, st.tr - 0.2);
  if (st.tr >= 1) {
    st.side = -st.side;
    st.tr = 0;
  }
  const sa = ik(A, Tg, l1, l2, mul(n, st.side));
  if (st.tr <= 0) return sa;
  const sb = ik(A, Tg, l1, l2, mul(n, -st.side));
  return { m: lerp(sa.m, sb.m, smooth(st.tr)), e: sa.e };
}
const loc = (v, d, f) =>
  (Math.atan2((-v[0] * d[1] + v[1] * d[0]) * f, v[0] * d[0] + v[1] * d[1]) * 180) / Math.PI;
const C = {
  A: 0,
  HD: 1,
  F: 2,
  GX: 3,
  GY: 4,
  R: 5,
  TH: 6,
  NU: 7,
  FU: 8,
  FL: 9,
  FGX: 10,
  FGY: 11,
  LNU: 12,
  LNL: 13,
  LFU: 14,
  LFL: 15,
};
const ANG = [C.A, C.TH, C.NU, C.FU, C.FL, C.LNU, C.LNL, C.LFU, C.LFL];
const V = KF.map((k) => {
  const d = dir(k.a),
    P = k.P.slice();
  for (const h of [k.hN, k.hF]) {
    if (Math.abs(h[0]) > 2) continue;
    const S = add(P, mul(d, B.SHO)),
      v = sub(h, S),
      L = Math.hypot(v[0], v[1]);
    if (L > B.REACH) {
      P[0] += (v[0] * (L - B.REACH)) / L;
      P[1] += (v[1] * (L - B.REACH)) / L;
    }
  }
  const S = add(P, mul(d, B.SHO)),
    aN = ik(S, k.hN, B.UA, B.FA, k.eN),
    aF = ik(S, k.hF, B.UA, B.FA, k.eF);
  const lN = ik(P, k.fN, B.TH, B.SH, k.kN),
    lF = ik(P, k.fF, B.TH, B.SH, k.kF),
    rel = sub(S, k.hN);
  k.wF = Math.abs(k.hF[0]) <= 2 ? 1 : 0;
  k.pN = lN.e[1] >= 47 ? lN.e : null;
  k.pF = lF.e[1] >= 47 ? lF.e : null;
  const row = [];
  row[C.A] = k.a;
  row[C.HD] = k.hd;
  row[C.F] = k.f;
  row[C.GX] = k.hN[0];
  row[C.GY] = k.hN[1];
  row[C.R] = Math.hypot(rel[0], rel[1]);
  row[C.TH] = (Math.atan2(rel[1], rel[0]) * 180) / Math.PI;
  row[C.NU] = loc(sub(aN.m, S), d, k.f);
  row[C.FU] = loc(sub(aF.m, S), d, k.f);
  row[C.FL] = loc(sub(aF.e, aF.m), d, k.f);
  row[C.FGX] = aF.e[0];
  row[C.FGY] = aF.e[1];
  row[C.LNU] = loc(sub(lN.m, P), d, k.f);
  row[C.LNL] = loc(sub(lN.e, lN.m), d, k.f);
  row[C.LFU] = loc(sub(lF.m, P), d, k.f);
  row[C.LFL] = loc(sub(lF.e, lF.m), d, k.f);
  return row;
});
const T = KF.map((k) => k.t),
  NK = KF.length;
for (const c of ANG)
  for (let i = 1; i < NK; i++)
    V[i][c] = V[i - 1][c] + (((((V[i][c] - V[i - 1][c]) % 360) + 540) % 360) - 180);
const slope = (s, c) => (V[s + 1][c] - V[s][c]) / (T[s + 1] - T[s]);
const M = V.map((row, i) =>
  row.map((_, c) => {
    const d0 = slope(i > 0 ? i - 1 : NK - 2, c),
      d1 = slope(i < NK - 1 ? i : 0, c);
    return d0 * d1 <= 0 ? 0 : (2 * d0 * d1) / (d0 + d1);
  }),
);
function sample(t) {
  t = ((t % LOOP) + LOOP) % LOOP;
  let i = 0;
  while (i < NK - 2 && t >= T[i + 1]) i++;
  const h = T[i + 1] - T[i],
    s = clamp((t - T[i]) / h, 0, 1),
    s2 = s * s,
    s3 = s2 * s;
  const h00 = 2 * s3 - 3 * s2 + 1,
    h10 = s3 - 2 * s2 + s,
    h01 = -2 * s3 + 3 * s2,
    h11 = s3 - s2;
  return {
    i,
    s,
    v: V[i].map((a, c) => h00 * a + h10 * h * M[i][c] + h01 * V[i + 1][c] + h11 * h * M[i + 1][c]),
  };
}
function plant(i, s, key, off) {
  const pa = KF[i][key],
    pb = KF[i + 1][key];
  if (pa && pb) {
    const dx = pb[0] - pa[0];
    if (Math.abs(dx) > 1.2) {
      const u = smooth((s - off) / 0.6);
      return { w: 1, p: [pa[0] + dx * u, pa[1] - Math.sin(Math.PI * u) * 2.4] };
    }
    return { w: 1, p: lerp(pa, pb, smooth(s)) };
  }
  if (pa) return { w: 1 - smooth(s * 1.7), p: pa };
  if (pb) return { w: smooth((s - 0.35) / 0.65), p: pb };
  return { w: 0, p: null };
}
function skel(t, mem) {
  const sm = sample(t),
    c = sm.v,
    lg = sample(t - 0.05).v,
    i = sm.i,
    s = sm.s;
  const f = clamp(c[C.F], -1, 1),
    d = dir(c[C.A]),
    pd = [-d[1], d[0]];
  const L = (ang, len) => {
    const r = (ang * Math.PI) / 180,
      u = Math.cos(r) * len,
      w = Math.sin(r) * len * f;
    return [d[0] * u + pd[0] * w, d[1] * u + pd[1] * w];
  };
  const G = [c[C.GX], c[C.GY]],
    th = (c[C.TH] * Math.PI) / 180;
  const S = [G[0] + Math.cos(th) * c[C.R], G[1] + Math.sin(th) * c[C.R]];
  const P = add(S, mul(d, -B.SHO)),
    N = add(S, mul(d, 10 - B.SHO));
  const aN = ikH(S, G, B.UA, B.FA, add(S, L(c[C.NU], B.UA)), 'aN', mem);
  const wa = KF[i].wF,
    wb = KF[i + 1].wF,
    wF = wa && wb ? 1 : wa ? 1 - smooth(s / 0.6) : wb ? smooth((s - 0.2) / 0.8) : 0;
  const eFk = add(S, L(lg[C.FU], B.UA)),
    aF = { m: eFk, e: add(eFk, L(lg[C.FL], B.FA)) };
  let aFo = aF;
  aFo = ikH(S, wF > 0.001 ? lerp(aF.e, [c[C.FGX], c[C.FGY]], wF) : aF.e, B.UA, B.FA, eFk, 'aF', mem);
  if (wF <= 0.001) aFo = aF;
  const leg = (cu, cl, key, off) => {
    const k = add(P, L(lg[cu], B.TH)),
      fk = { m: k, e: add(k, L(lg[cl], B.SH)) },
      pl = plant(i, s, key, off);
    const r = ikH(P, pl.w > 0.001 ? lerp(fk.e, pl.p, pl.w) : fk.e, B.TH, B.SH, k, key, mem);
    return pl.w > 0.001 ? r : fk;
  };
  const lN = leg(C.LNU, C.LNL, 'pN', 0),
    lF = leg(C.LFU, C.LFL, 'pF', 0.4);
  const ha = dir(c[C.A] + c[C.HD] * f),
    hfr = [-ha[1] * f, ha[0] * f];
  const g = (p) => [PX + p[0] * Q, p[1] * Q],
    gs = (p) => sn(g(p)),
    lim = (o) => ({ m: gs(o.m), e: gs(o.e) });
  const toe = (l) => {
    const v = sub(l.e, l.m),
      n = Math.hypot(v[0], v[1]) || 1;
    return sn(add(g(l.e), mul(v, SHOE / n)));
  };
  const Hc = add(g(N), mul(ha, NECK + HEADR - 0.3 * Q));
  return {
    P: gs(P),
    N: gs(N),
    S: gs(S),
    d,
    fr: [pd[0] * f, pd[1] * f],
    ha,
    hfr,
    Hc: sn(Hc),
    HcRaw: Hc,
    f,
    pf: s < 0.5 ? KF[i].pf : KF[i + 1].pf,
    aN: lim(aN),
    aF: lim(aFo),
    lN: lim(lN),
    lF: lim(lF),
    toeN: toe(lN),
    toeF: toe(lF),
  };
}

function hex(str) {
  let h = str.replace('#', '');
  if (h.length === 3)
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
const pack = (c) =>
  ((255 << 24) | (Math.round(c[2]) << 16) | (Math.round(c[1]) << 8) | Math.round(c[0])) >>> 0;
const mixc = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

export class PoleEngine {
  constructor(palette, random = Math.random) {
    this.random = random;
    this.out = new Uint32Array(GW * GH);
    this.grp = new Uint8Array(GW * GH);
    this.mat = new Uint8Array(GW * GH);
    this.rank = new Uint8Array(8);
    this.readColors(palette);
    this.buildBg();
    this.stars = Array.from({ length: 6 }, () => ({
      per: 2.2 + random() * 1.4,
      ph: random() * 3,
      c: -1,
      x: 0,
      y: 0,
    }));
  }
  readColors(palette) {
    const A = [0],
      N = [0],
      Ar = [0];
    for (let i = 1; i <= 9; i++) {
      Ar[i] = hex(palette.accent[i - 1]);
      A[i] = pack(Ar[i]);
      N[i] = pack(hex(palette.neutral[i - 1]));
    }
    const bg = hex(palette.bg);
    const MAT = [];
    MAT[SKIN] = [A[1], A[3], A[5], A[6]];
    MAT[SKINF] = [A[3], A[5], A[6], A[7]];
    MAT[COST] = [A[4], A[6], A[7], A[8]];
    MAT[COSTF] = [A[6], A[7], A[8], A[8]];
    MAT[HAIRM] = [A[5], A[7], A[8], A[8]];
    MAT[SHOEM] = [N[1], N[4], N[6], N[7]];
    MAT[SHOEF] = [N[3], N[5], N[6], N[7]];
    this.C = {
      A,
      N,
      MAT,
      POLE: [N[2], N[3], N[5], N[7]],
      POLEFADE: [
        [N[8], N[8], N[8], N[8]],
        [N[7], N[7], N[8], N[8]],
        [N[5], N[6], N[7], N[8]],
        [N[3], N[4], N[6], N[7]],
      ],
      OUT: pack(bg.map((v) => v * 0.55)),
      HAZE1: pack(mixc(bg, Ar[9], 0.5)),
      HAZE2: pack(Ar[9]),
    };
  }
  buildBg() {
    const A = this.C.A,
      H1 = this.C.HAZE1,
      H2 = this.C.HAZE2,
      bg = new Uint32Array(GW * GH);
    const PCY = 51 * Q,
      PRX = 22 * Q,
      PRY = 3.2 * Q,
      FLOOR = 50 * Q;
    for (let y = 0; y < GH; y++) {
      const hw = (3 + (y / Q + 3) * 0.36) * Q;
      for (let x = 0; x < GW; x++) {
        const cx = x + 0.5 - PX,
          ex = cx / PRX,
          ey = (y + 0.5 - PCY) / PRY,
          e = ex * ex + ey * ey;
        let col = 0;
        if (e < 1) col = e < 0.18 ? A[7] : e < 0.5 ? A[8] : A[9];
        else if (y < FLOOR && y > 3 && Math.abs(cx) < hw) col = Math.abs(cx) < hw * 0.42 && y > 12 ? H2 : H1;
        bg[y * GW + x] = col;
      }
    }
    this.bg = bg;
  }
  set(x, y, col) {
    if (x >= 0 && y >= 0 && x < GW && y < GH) this.out[y * GW + x] = col;
  }
  step(ft, steps) {
    const lt = ft % LOOP,
      sk = skel(lt, this.bend || (this.bend = {})),
      out = this.out;
    this.simHair(sk, steps);
    out.set(this.bg);
    const fl = 50 * Q,
      h = fl - Math.max(sk.toeN[1], sk.toeF[1]);
    if (h < 20) {
      const rx = Math.max(2, (5.5 - h * 0.25) * Q),
        cx = sk.P[0],
        cy = 50.8 * Q;
      for (let y = Math.floor(cy - 2); y <= Math.ceil(cy + 2); y++)
        for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
          const ex = (x + 0.5 - cx) / rx,
            ey = (y + 0.5 - cy) / 1.4;
          if (ex * ex + ey * ey < 1) this.set(x, y, 0);
        }
    }
    this.drawStars(ft);
    this.raster(sk, ft);
    this.shade();
    this.drawBursts(sk, lt);
  }
  simHair(sk, steps) {
    const anchor = add(add(sk.HcRaw, mul(sk.hfr, -2.1 * Q)), mul(sk.ha, 0.9 * Q));
    if (!this.hair) {
      this.hair = [];
      for (let i = 0; i <= 5; i++) {
        const p = [anchor[0], anchor[1] + i * HSEG];
        this.hair.push({ p, q: p.slice() });
      }
      this.pa = anchor;
    }
    const H = this.hair,
      pa = this.pa,
      n = steps * 3,
      R = HEADR + 0.5 * Q,
      Hc = sk.HcRaw;
    for (let s = 1; s <= n; s++) {
      const a = lerp(pa, anchor, s / n);
      H[0].p = a.slice();
      H[0].q = a.slice();
      for (let i = 1; i < H.length; i++) {
        const p = H[i].p,
          q = H[i].q,
          vx = (p[0] - q[0]) * 0.95,
          vy = (p[1] - q[1]) * 0.95;
        H[i].q = p.slice();
        H[i].p = [p[0] + vx, p[1] + vy + 0.045 * Q];
      }
      for (let it = 0; it < 4; it++) {
        for (let i = 1; i < H.length; i++) {
          const a0 = H[i - 1].p,
            b0 = H[i].p,
            dx = b0[0] - a0[0],
            dy = b0[1] - a0[1],
            L = Math.hypot(dx, dy) || 1e-6,
            df = (L - HSEG) / L;
          if (i === 1) H[i].p = [b0[0] - dx * df, b0[1] - dy * df];
          else {
            H[i - 1].p = [a0[0] + dx * df * 0.5, a0[1] + dy * df * 0.5];
            H[i].p = [b0[0] - dx * df * 0.5, b0[1] - dy * df * 0.5];
          }
        }
        for (let i = 2; i < H.length; i++) {
          const dx = H[i].p[0] - Hc[0],
            dy = H[i].p[1] - Hc[1],
            L = Math.hypot(dx, dy);
          if (L < R) H[i].p = [Hc[0] + (dx * R) / (L || 1), Hc[1] + (dy * R) / (L || 1)];
        }
      }
    }
    this.pa = anchor;
  }
  cap(a, b, ra, rb, g, m) {
    ra *= Q;
    rb *= Q;
    const x0 = Math.max(0, Math.floor(Math.min(a[0] - ra, b[0] - rb))),
      x1 = Math.min(GW - 1, Math.ceil(Math.max(a[0] + ra, b[0] + rb)));
    const y0 = Math.max(0, Math.floor(Math.min(a[1] - ra, b[1] - rb))),
      y1 = Math.min(GH - 1, Math.ceil(Math.max(a[1] + ra, b[1] + rb)));
    const dx = b[0] - a[0],
      dy = b[1] - a[1],
      L2 = dx * dx + dy * dy;
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const px = x + 0.5 - a[0],
          py = y + 0.5 - a[1];
        const u = L2 > 1e-6 ? clamp((px * dx + py * dy) / L2, 0, 1) : 0;
        const qx = px - dx * u,
          qy = py - dy * u,
          r = ra + (rb - ra) * u;
        if (qx * qx + qy * qy <= r * r) {
          const i = y * GW + x;
          this.grp[i] = g;
          this.mat[i] = m;
        }
      }
  }
  raster(sk, ft) {
    this.grp.fill(0);
    this.mat.fill(0);
    const order = sk.pf
      ? [POLE, FARARM, FARLEG, HAIR, BODY, NEARLEG, NEARARM]
      : [FARARM, FARLEG, HAIR, BODY, POLE, NEARLEG, NEARARM];
    order.forEach((g, i) => {
      this.rank[g] = i + 1;
    });
    const arm = (a, g, far) => {
      const m = far ? SKINF : SKIN;
      this.cap(sk.S, a.m, 1.05, 0.9, g, m);
      this.cap(a.m, a.e, 0.9, 0.8, g, m);
      this.cap(a.e, a.e, 1.0, 1.0, g, m);
    };
    const leg = (l, toe, g, far) => {
      const m = far ? SKINF : SKIN;
      this.cap(sk.P, l.m, 1.75, 1.2, g, m);
      this.cap(l.m, l.e, 1.15, 0.85, g, m);
      this.cap(sk.P, lerp(sk.P, l.m, 0.24), 1.85, 1.6, g, far ? COSTF : COST);
      this.cap(l.e, toe, 0.95, 0.75, g, far ? SHOEF : SHOEM);
    };
    for (const g of order) {
      if (g === POLE) this.rasterPole(ft);
      else if (g === FARARM) arm(sk.aF, g, true);
      else if (g === NEARARM) arm(sk.aN, g, false);
      else if (g === FARLEG) leg(sk.lF, sk.toeF, g, true);
      else if (g === NEARLEG) leg(sk.lN, sk.toeN, g, false);
      else if (g === HAIR) {
        const H = this.hair.map((h) => sn(h.p)),
          n = H.length - 1;
        this.cap(H[0], H[0], 1.3, 1.3, g, HAIRM);
        for (let i = 0; i < n; i++)
          this.cap(H[i], H[i + 1], 1.25 - (0.45 * i) / n, 1.25 - (0.45 * (i + 1)) / n, g, HAIRM);
      } else if (g === BODY) this.rasterBody(sk);
    }
  }
  rasterBody(sk) {
    const { P, N, fr, ha, hfr, Hc } = sk;
    const at = (u, o) => add(lerp(P, N, u), mul(fr, (o || 0) * Q));
    const W = at(0.4),
      C = at(0.7, 0.55),
      U = at(0.9);
    this.cap(P, W, 2.0, 1.45, BODY, SKIN);
    this.cap(W, C, 1.45, 2.0, BODY, SKIN);
    this.cap(C, U, 2.0, 1.45, BODY, SKIN);
    this.cap(U, N, 1.45, 1.0, BODY, SKIN);
    this.cap(N, add(N, mul(ha, 1.6 * Q)), 0.85, 0.85, BODY, SKIN);
    this.cap(at(0, -0.25), at(0.17), 2.15, 1.85, BODY, COST);
    this.cap(at(0.58, 0.25), C, 1.65, 2.0, BODY, COST);
    this.cap(C, at(0.82, 0.2), 2.0, 1.7, BODY, COST);
    const r = HEADR,
      af = Math.abs(sk.f);
    for (let y = Math.max(0, Math.floor(Hc[1] - r)); y <= Math.min(GH - 1, Math.ceil(Hc[1] + r)); y++) {
      for (let x = Math.max(0, Math.floor(Hc[0] - r)); x <= Math.min(GW - 1, Math.ceil(Hc[0] + r)); x++) {
        const vx = x + 0.5 - Hc[0],
          vy = y + 0.5 - Hc[1];
        if (vx * vx + vy * vy > r * r) continue;
        const along = vx * ha[0] + vy * ha[1],
          side = vx * hfr[0] + vy * hfr[1],
          i = y * GW + x;
        this.grp[i] = BODY;
        this.mat[i] = (side < 0.4 * Q * af && along > -0.6 * Q) || along > 1.5 * Q ? HAIRM : SKIN;
      }
    }
    if (af > 0.5) {
      const ex = Math.floor(Hc[0] + hfr[0] * 1.45 * Q + ha[0] * 0.15 * Q),
        ey = Math.floor(Hc[1] + hfr[1] * 1.45 * Q + ha[1] * 0.15 * Q);
      if (ex >= 0 && ey >= 0 && ex < GW && ey < GH && this.mat[ey * GW + ex] === SKIN)
        this.mat[ey * GW + ex] = EYE;
    }
  }
  rasterPole(ft) {
    const gp = ft % 2.6,
      gy = gp < 0.8 ? 20 + 38 * (gp / 0.8) : -99;
    const put = (x, y, m) => {
      const i = y * GW + x;
      this.grp[i] = POLE;
      this.mat[i] = m;
    };
    for (let y = 2; y <= 60; y++)
      for (let k = 0; k < 4; k++)
        put(38 + k, y, y >= 18 && k > 0 && k < 3 && Math.abs(y - gy) <= 1.5 ? POLE0 + 6 : POLE0 + k);
    for (let x = 37; x <= 42; x++) put(x, 61, POLE0 + 4);
    for (let x = 36; x <= 43; x++) put(x, 62, POLE0 + 5);
  }
  poleCol(m, y) {
    const C = this.C;
    if (m === POLE0 + 4) return C.N[3];
    if (m === POLE0 + 5) return C.N[6];
    if (m === POLE0 + 6) return C.N[1];
    const k = m - POLE0;
    return y < 18 ? C.POLEFADE[Math.floor((y - 2) / 4)][k] : C.POLE[k];
  }
  shade() {
    const grp = this.grp,
      mat = this.mat,
      rank = this.rank,
      out = this.out,
      C = this.C;
    const g4 = (x, y) => (x < 0 || y < 0 || x >= GW || y >= GH ? 0 : grp[y * GW + x]);
    for (let y = 0; y < GH; y++)
      for (let x = 0; x < GW; x++) {
        const i = y * GW + x,
          g = grp[i];
        if (!g) continue;
        let over = false;
        for (let k = 0; k < 4 && !over; k++) {
          const h = g4(x + (k === 0 ? 1 : k === 1 ? -1 : 0), y + (k === 2 ? 1 : k === 3 ? -1 : 0));
          if (h && h !== g && rank[h] > rank[g]) over = true;
        }
        const m = mat[i];
        if (g === POLE) {
          out[i] = over ? C.N[8] : this.poleCol(m, y);
          continue;
        }
        if (m === EYE) {
          out[i] = C.A[9];
          continue;
        }
        let nx = 0,
          ny = 0;
        for (let oy = -1; oy <= 1; oy++)
          for (let ox = -1; ox <= 1; ox++) {
            if ((ox || oy) && g4(x + ox, y + oy) !== g) {
              nx += ox;
              ny += oy;
            }
          }
        let tone = 1;
        const nl = Math.hypot(nx, ny);
        if (nl > 0) {
          const d = (nx * -0.6 + ny * -0.8) / nl;
          if (d > 0.45) tone = 0;
          else if (d < -0.35) tone = 2;
        }
        if (over) tone = 3;
        out[i] = C.MAT[m][tone];
      }
    for (let y = 0; y < GH; y++)
      for (let x = 0; x < GW; x++) {
        const i = y * GW + x;
        if (grp[i]) continue;
        if (g4(x + 1, y) >= 2 || g4(x - 1, y) >= 2 || g4(x, y + 1) >= 2 || g4(x, y - 1) >= 2) out[i] = C.OUT;
      }
  }
  drawStars(ft) {
    const A = this.C.A,
      SHP = [
        [8, 0, 0],
        [6, 0, 0],
        [3, 7, 0],
        [1, 3, 7],
        [1, 2, 6],
        [1, 3, 7],
        [3, 7, 0],
        [6, 0, 0],
        [8, 0, 0],
      ];
    for (const s of this.stars) {
      const tt = ft + s.ph,
        cyc = Math.floor(tt / s.per);
      if (cyc !== s.c) {
        s.c = cyc;
        s.x = 6 + Math.floor(this.random() * 68);
        if (Math.abs(s.x - PX) < 7) s.x += s.x < PX ? -8 : 8;
        s.y = 4 + Math.floor(this.random() * 46);
      }
      const sh = SHP[Math.floor(((tt % s.per) / s.per) * 16)];
      if (!sh) continue;
      this.set(s.x, s.y, A[sh[0]]);
      for (let r = 1; r <= 2; r++) {
        const c = sh[r];
        if (!c) continue;
        this.set(s.x + r, s.y, A[c]);
        this.set(s.x - r, s.y, A[c]);
        this.set(s.x, s.y + r, A[c]);
        this.set(s.x, s.y - r, A[c]);
      }
    }
  }
  drawBursts(sk, lt) {
    const A = this.C.A;
    for (const [t0, pts] of [
      [2.35, [sk.toeN, sk.toeF]],
      [3.85, [sk.aF.e]],
    ]) {
      const p = (lt - t0) / 0.6;
      if (p < 0 || p >= 1) continue;
      const r = (1.8 + p * 5.5) * Q,
        col = p < 0.35 ? A[1] : p < 0.7 ? A[3] : A[6];
      for (const c of pts)
        for (let k = 0; k < 8; k++) {
          const a = (k * Math.PI) / 4,
            cx = Math.cos(a),
            cy = Math.sin(a);
          this.set(Math.floor(c[0] + cx * r), Math.floor(c[1] + cy * r), col);
          if (k % 2 === 0) this.set(Math.floor(c[0] + cx * (r - 1)), Math.floor(c[1] + cy * (r - 1)), col);
        }
    }
  }
}

export const GRID = { width: GW, height: GH, fps: FPS, loop: LOOP };

/** Klatka czasu `t` (s) bez symulacji historii – statyczna klatka przy „Ogranicz ruch”. */
export function renderStill(palette, t) {
  const engine = new PoleEngine(palette, () => 0.5);
  // Rozgrzanie fizyki kucyka do czasu t (24 kl./s), żeby włosy leżały naturalnie.
  const frames = Math.round(t * FPS);
  for (let f = Math.max(0, frames - 24); f <= frames; f++) engine.step(f / FPS, 1);
  return engine.out;
}
