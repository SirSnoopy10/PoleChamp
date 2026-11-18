// Silnik animacji splash (IMP-211), wariant „klub” – decyzja PO 10.11.2026. Bez DOM: rysuje klatkę
// 80×70 do bufora RGBA (`out`, piksele ABGR little-endian jak ImageData; 0 = przezroczysty).
// Tancerka to bryła: szkielet z klatek kluczowych (splajn Hermite'a, IK 2-kościowe) obracany wokół
// rury, kule wzdłuż kości o anatomicznych profilach, bufor głębi z normalnymi. Dwa reflektory
// (różowy z lewej, turkusowy z prawej) kwantowane do 4 poziomów z ditheringiem, kontur 1 px,
// odbicie w podłodze. Tło i rura z tokenów Nocturne, losowość wstrzykiwana (testy).
const GW = 80,
  GH = 70,
  FPS = 24,
  LOOP = 4.3,
  PX = 40.5, // oś rury (3 piksele: 39–41)
  FY = 58, // linia podłogi
  U = 5.7; // pikseli na jednostkę ciała (≈ 20 cm)
const SKIN = 1,
  COST = 2,
  HAIR = 3,
  POLE = 4;
const RAD = Math.PI / 180;
const LEN = { torso: 3.0, neck: 0.78, ua: 1.45, fa: 1.35, th: 2.2, sh: 2.15 };
const SH = 0.78,
  HP = 0.4;
const LIMBS = ['A1', 'A2', 'L1', 'L2'];
const SIDE = { A1: -1, A2: 1, L1: -1, L2: 1 };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => mul(a, 1 / (len(a) || 1));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
/** Funkcja odcinkami liniowa z tabeli `[t, wartość]`. */
const pl = (tab) => (t) => {
  if (t <= tab[0][0]) return tab[0][1];
  for (let i = 1; i < tab.length; i++)
    if (t <= tab[i][0]) {
      const a = tab[i - 1],
        b = tab[i];
      return a[1] + ((b[1] - a[1]) * (t - a[0])) / (b[0] - a[0]);
    }
  return tab[tab.length - 1][1];
};

// ——— Szkielet ———
// Układ lokalny (płaszczyzna ciała): x – odległość od rury, y – w górę. Kąt tułowia `tr` > 0 = odchylenie
// w tył; kończyny względem tułowia: 0 = wzdłuż ciała w dół, + do przodu; `[udo/ramię, łydka/przedramię,
// odwiedzenie]` albo `{ g: [x, y] }` – chwyt / stopa (IK). `theta` – obrót całości wokół rury.
const isArm = (l) => l[0] === 'A';
const bones = (l) => (isArm(l) ? [LEN.ua, LEN.fa] : [LEN.th, LEN.sh]);
const dirT = (a) => [Math.sin(a * RAD), Math.cos(a * RAD)];
const dirL = (a) => [-Math.sin(a * RAD), -Math.cos(a * RAD)];
const angL = (v) => Math.atan2(-v[0], -v[1]) / RAD;
const wrap = (a) => ((((a + 180) % 360) + 360) % 360) - 180;
const add2 = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sub2 = (a, b) => [a[0] - b[0], a[1] - b[1]];
const mul2 = (a, k) => [a[0] * k, a[1] * k];

function ik(r, g, l1, l2, hint) {
  const dx = g[0] - r[0],
    dy = g[1] - r[1],
    d = Math.hypot(dx, dy) || 1e-6,
    ux = dx / d,
    uy = dy / d,
    dc = clamp(d, Math.abs(l1 - l2) + 1e-3, l1 + l2 - 1e-3),
    a = Math.acos(clamp((l1 * l1 + dc * dc - l2 * l2) / (2 * l1 * dc), -1, 1)),
    c = Math.cos(a),
    s = Math.sin(a);
  const m1 = [r[0] + l1 * (ux * c - uy * s), r[1] + l1 * (ux * s + uy * c)];
  const m2 = [r[0] + l1 * (ux * c + uy * s), r[1] + l1 * (-ux * s + uy * c)];
  const cx = r[0] + (ux * dc) / 2,
    cy = r[1] + (uy * dc) / 2;
  const score = (m) => (m[0] - cx) * hint[0] + (m[1] - cy) * hint[1];
  return [score(m1) >= score(m2) ? m1 : m2, [r[0] + ux * dc, r[1] + uy * dc]];
}

/** Klatka kluczowa → kąty kończyn i cele IK (do interpolacji). */
function prep(k, prev) {
  const s = k.s ?? prev?.s ?? 0,
    hd = k.hd ?? 0,
    tr = k.tr ?? 0,
    P = k.P,
    N = add2(P, mul2(dirT(tr), LEN.torso)),
    front = dirT(tr - 90),
    out = { t: k.t, P, tr, hd, s, limbs: {} };
  for (const lim of LIMBS) {
    const spec = k[lim],
      [l1, l2] = bones(lim),
      r0 = isArm(lim) ? N : P;
    let m,
      e,
      hint,
      sp = 0,
      grip = 0,
      pz = 0;
    if (Array.isArray(spec)) {
      m = add2(r0, mul2(dirL(tr + spec[0]), l1));
      e = add2(m, mul2(dirL(tr + spec[1]), l2));
      sp = spec[2] || 0;
      hint = sub2(m, mul2(add2(r0, e), 0.5));
    } else {
      hint = spec.h || (isArm(lim) ? [-front[0], -front[1] - 0.4] : front);
      [m, e] = ik(r0, spec.g, l1, l2, hint);
      grip = 1;
      pz = isArm(lim) && Math.abs(spec.g[0]) < 0.4 ? 1 : 0;
    }
    const hl = Math.hypot(hint[0], hint[1]) || 1;
    out.limbs[lim] = {
      r1: angL(sub2(m, r0)) - tr,
      r2: angL(sub2(e, m)) - tr,
      ex: e[0],
      ey: e[1],
      hx: hint[0] / hl,
      hy: hint[1] / hl,
      sp,
      grip,
      pz,
    };
  }
  return out;
}

/** Splajn Hermite'a w czasie, zapętlony; `inc` – przyrost wartości na pętlę (obrót). */
function track(times, vals, inc) {
  const n = times.length;
  const T = (i) => {
    const k = Math.floor(i / n);
    return times[i - k * n] + k * LOOP;
  };
  const V = (i) => {
    const k = Math.floor(i / n);
    return vals[i - k * n] + k * inc;
  };
  return (t) => {
    const kk = Math.floor(t / LOOP);
    t -= kk * LOOP;
    let i = n - 1;
    for (let j = 1; j < n; j++)
      if (times[j] > t) {
        i = j - 1;
        break;
      }
    const t0 = T(i),
      h = T(i + 1) - t0,
      u = (t - t0) / h,
      u2 = u * u,
      u3 = u2 * u;
    const m0 = (0.9 * (V(i + 1) - V(i - 1))) / (T(i + 1) - T(i - 1));
    const m1 = (0.9 * (V(i + 2) - V(i))) / (T(i + 2) - T(i));
    return (
      (2 * u3 - 3 * u2 + 1) * V(i) +
      (u3 - 2 * u2 + u) * h * m0 +
      (-2 * u3 + 3 * u2) * V(i + 1) +
      (u3 - u2) * h * m1 +
      kk * inc
    );
  };
}

const stand = (x, y, o) => ({
  P: [x, 4.38],
  tr: 0,
  hd: 0,
  A2: { g: [0, y] },
  A1: [5, 15],
  L1: { g: [x - 0.4, 0.12] },
  L2: { g: [x + 0.4, 0.12] },
  ...o,
});
// Obrót z hakiem: krok przy rurze, wybicie, okrążenie na jednej ręce z bliższą nogą zgiętą do rury
// i dalszą wyciągniętą w tył, zejście spiralnie w dół i lądowanie.
const KEYS = [
  { t: 0, ...stand(1.5, 8.4, { s: -0.3 }) },
  {
    t: 0.5,
    P: [1.3, 4.05],
    tr: -5,
    A2: { g: [0, 8.6] },
    A1: [20, 40],
    L1: { g: [1.0, 0.12] },
    L2: [-40, -80],
  },
  {
    t: 0.9,
    P: [1.4, 5.0],
    tr: 15,
    hd: 10,
    A2: { g: [0, 9.2] },
    A1: [-60, -50, 30],
    L1: [70, -30],
    L2: [-35, -40],
  },
  {
    t: 1.6,
    P: [1.5, 4.8],
    tr: 18,
    hd: 12,
    A2: { g: [0, 9.0] },
    A1: [-70, -60, 35],
    L1: [75, -35],
    L2: [-45, -45],
  },
  {
    t: 2.3,
    P: [1.5, 4.5],
    tr: 20,
    hd: 14,
    A2: { g: [0, 8.7] },
    A1: [-80, -70, 30],
    L1: [78, -30],
    L2: [-50, -55],
  },
  {
    t: 3.0,
    P: [1.45, 4.2],
    tr: 14,
    hd: 8,
    A2: { g: [0, 8.4] },
    A1: [-40, -20, 25],
    L1: [70, -25],
    L2: [-30, -40],
  },
  {
    t: 3.5,
    P: [1.6, 3.8],
    tr: 5,
    A2: { g: [0, 8.3] },
    A1: [15, 40, 10],
    L1: { g: [1.2, 0.12] },
    L2: { g: [2.1, 0.12] },
  },
  { t: 4.0, ...stand(1.5, 8.4) },
];
const THETA = [
  [0, 120],
  [0.9, 120],
  [1.6, 250],
  [2.3, 370],
  [3.0, 450],
  [3.5, 480],
];

const MOVE = (() => {
  const keys = [];
  for (const k of KEYS) keys.push(prep(k, keys[keys.length - 1]));
  const times = keys.map((k) => k.t),
    n = keys.length;
  const mk = (get, ang) => {
    const vals = keys.map(get);
    let inc = 0;
    if (ang) {
      for (let i = 1; i < n; i++) vals[i] = vals[i - 1] + wrap(vals[i] - vals[i - 1]);
      inc = vals[n - 1] + wrap(vals[0] - vals[n - 1]) - vals[0];
    }
    return track(times, vals, inc);
  };
  const tk = {
    P0: mk((k) => k.P[0]),
    P1: mk((k) => k.P[1]),
    tr: mk((k) => k.tr, true),
    hd: mk((k) => k.hd, true),
    s: mk((k) => k.s),
  };
  const lt = {};
  for (const l of LIMBS) {
    lt[l] = {};
    for (const c of ['r1', 'r2', 'ex', 'ey', 'hx', 'hy', 'sp', 'pz'])
      lt[l][c] = mk((k) => k.limbs[l][c], c === 'r1' || c === 'r2');
  }
  const theta = track(
    THETA.map((x) => x[0]),
    THETA.map((x) => x[1]),
    360,
  );
  return { keys, times, tk, lt, theta };
})();

/** Stawy w układzie świata (x – w prawo, y – w górę, z – do widza; rura w x = z = 0). */
function skeleton(t) {
  const { keys, times, tk, lt } = MOVE,
    n = keys.length,
    tt = ((t % LOOP) + LOOP) % LOOP;
  let i = n - 1;
  for (let j = 1; j < n; j++)
    if (times[j] > tt) {
      i = j - 1;
      break;
    }
  const k0 = keys[i],
    k1 = keys[(i + 1) % n],
    P = [tk.P0(t), tk.P1(t)],
    tr = tk.tr(t),
    hd = tk.hd(t),
    s = tk.s(t),
    N = add2(P, mul2(dirT(tr), LEN.torso)),
    hdir = dirT(tr + hd),
    fr = dirT(tr + hd - 90);
  const J = {
    P: [P[0], P[1], s],
    N: [N[0], N[1], s],
    Hc: [N[0] + hdir[0] * LEN.neck, N[1] + hdir[1] * LEN.neck, s],
    front: [fr[0], fr[1], 0],
    up: [hdir[0], hdir[1], 0],
  };
  for (const l of LIMBS) {
    const arm = isArm(l),
      side = SIDE[l],
      [l1, l2] = bones(l),
      c = lt[l],
      r2d = arm ? N : P,
      rz = s + side * (arm ? SH : HP);
    let d1,
      d2,
      sp = 0;
    if (k0.limbs[l].grip && k1.limbs[l].grip) {
      const [m, e] = ik(r2d, [c.ex(t), c.ey(t)], l1, l2, [c.hx(t), c.hy(t)]);
      d1 = mul2(sub2(m, r2d), 1 / l1);
      d2 = mul2(sub2(e, m), 1 / l2);
    } else {
      d1 = dirL(tr + c.r1(t));
      d2 = dirL(tr + c.r2(t));
      sp = c.sp(t) * RAD;
    }
    const cs = Math.cos(sp),
      sn = Math.sin(sp) * side,
      root = [r2d[0], r2d[1], rz],
      mid = [root[0] + d1[0] * cs * l1, root[1] + d1[1] * cs * l1, rz + sn * l1],
      end = [mid[0] + d2[0] * cs * l2, mid[1] + d2[1] * cs * l2, mid[2] + sn * l2],
      pz = clamp(c.pz(t), 0, 1),
      q = l[1];
    if (pz > 0) {
      // Dłoń na rurze: ręka schodzi do osi rury.
      end[2] *= 1 - pz;
      mid[2] = mid[2] * (1 - pz) + rz * 0.6 * pz;
    }
    if (arm) {
      J['S' + q] = root;
      J['E' + q] = mid;
      J['W' + q] = end;
    } else {
      J['H' + q] = root;
      J['K' + q] = mid;
      J['F' + q] = end;
      // Stopa: na podłodze płasko do przodu, w powietrzu wyprostowana.
      const plant = clamp(1 - (end[1] - 0.1) / 0.5, 0, 1),
        fx = Math.sign(fr[0]) || -1,
        toe = norm([d2[0] * cs * (1 - plant) + fx * plant, d2[1] * cs * (1 - plant), sn * (1 - plant)]);
      J['T' + q] = add(end, mul(toe, 0.6));
    }
  }
  const th = MOVE.theta(t) * RAD,
    sn = Math.sin(th),
    cs = Math.cos(th),
    out = {};
  for (const key in J) {
    const p = J[key];
    out[key] =
      key === 'front' || key === 'up'
        ? [p[0] * sn, p[1], p[0] * cs]
        : [p[0] * sn + p[2] * cs, p[1], p[0] * cs - p[2] * sn];
  }
  return out;
}

// ——— Ciało ———
// Przekroje tułowia: [wysokość nad biodrami, połowa szerokości, połowa głębokości, przesunięcie w przód].
const TORSO = [
  [-0.5, 0.16, 0.16, 0],
  [-0.3, 0.52, 0.37, -0.02],
  [-0.05, 0.77, 0.49, -0.05],
  [0.2, 0.8, 0.52, -0.06],
  [0.55, 0.75, 0.47, -0.03],
  [0.95, 0.56, 0.37, 0.02],
  [1.3, 0.5, 0.34, 0.04],
  [1.7, 0.56, 0.36, 0.04],
  [2.1, 0.66, 0.4, 0.05],
  [2.45, 0.72, 0.36, 0.02],
  [2.75, 0.8, 0.27, -0.02],
  [2.95, 0.5, 0.22, -0.02],
  [3.1, 0.24, 0.2, 0],
];
const torsoAt = (h) => {
  for (let i = 1; i < TORSO.length; i++)
    if (h <= TORSO[i][0]) {
      const a = TORSO[i - 1],
        c = TORSO[i],
        t = clamp((h - a[0]) / (c[0] - a[0]), 0, 1);
      return [a[1] + (c[1] - a[1]) * t, a[2] + (c[2] - a[2]) * t, a[3] + (c[3] - a[3]) * t];
    }
  return TORSO[TORSO.length - 1].slice(1);
};
const THIGH = pl([
    [0, 0.44],
    [0.3, 0.42],
    [0.65, 0.33],
    [1, 0.265],
  ]),
  SHIN = pl([
    [0, 0.265],
    [0.26, 0.31],
    [0.62, 0.23],
    [1, 0.16],
  ]),
  FOOT = pl([
    [0, 0.13],
    [0.22, 0.155],
    [0.7, 0.12],
    [1, 0.07],
  ]),
  UPPER = pl([
    [0, 0.24],
    [0.35, 0.21],
    [1, 0.165],
  ]),
  FORE = pl([
    [0, 0.165],
    [0.25, 0.18],
    [1, 0.115],
  ]),
  HAND = pl([
    [0, 0.105],
    [0.45, 0.115],
    [1, 0.06],
  ]);
// Bob: czapka włosów + trzy krótkie pasma (tył i boki) – [przód, góra, bok, segmenty, długość, r0, r1].
const HAIR_CAP = 0.53;
const STRANDS = [
  [-0.36, -0.1, 0, 3, 0.2, 0.36, 0.28],
  [-0.1, -0.14, 0.34, 3, 0.19, 0.25, 0.19],
  [-0.1, -0.14, -0.34, 3, 0.19, 0.25, 0.19],
];
const STEP = 0.16; // odstęp kul ≈ 1 piksel

/** Pasmo włosów: łańcuch Verleta z kolizjami (głowa, tułów) – krok stały 1/FPS. */
class Strand {
  constructor(n, seg) {
    this.n = n;
    this.seg = seg;
    this.x = null;
  }
  relax(a, cols) {
    this.x[0] = a;
    for (let it = 0; it < 3; it++)
      for (let i = 1; i < this.n; i++) {
        const A = this.x[i - 1];
        let B = this.x[i];
        for (const c of cols) {
          const d = sub(B, c[0]),
            l = len(d);
          if (l < c[1]) B = add(c[0], mul(d, c[1] / (l || 1e-6)));
        }
        const d = sub(B, A),
          k = this.seg / (len(d) || 1e-6);
        this.x[i] = [A[0] + d[0] * k, Math.max(0.08, A[1] + d[1] * k), A[2] + d[2] * k];
      }
  }
  step(a, steps, cols) {
    const n = this.n;
    if (!this.x) {
      this.x = [];
      for (let i = 0; i < n; i++) this.x.push([a[0], a[1] - i * this.seg, a[2]]);
      for (let q = 0; q < 30; q++) {
        this.relax(a, cols);
        for (let i = 1; i < n; i++) this.x[i][1] -= 0.01;
      }
      this.relax(a, cols);
      this.o = this.x.map((p) => p.slice());
      return this.x;
    }
    const h = 1 / FPS,
      g = -42 * h * h;
    for (let q = 0; q < steps; q++) {
      for (let i = 1; i < n; i++) {
        const x = this.x[i],
          o = this.o[i];
        this.o[i] = x;
        this.x[i] = [
          x[0] + (x[0] - o[0]) * 0.86,
          x[1] + (x[1] - o[1]) * 0.86 + g,
          x[2] + (x[2] - o[2]) * 0.86,
        ];
      }
      this.o[0] = a;
      this.relax(a, cols);
    }
    return this.x;
  }
}

// ——— Kolory ———
const hex = (h) => [
  parseInt(h.slice(1, 3), 16) / 255,
  parseInt(h.slice(3, 5), 16) / 255,
  parseInt(h.slice(5, 7), 16) / 255,
];
const pack = (c) =>
  ((255 << 24) |
    (Math.round(clamp(c[2], 0, 1) * 255) << 16) |
    (Math.round(clamp(c[1], 0, 1) * 255) << 8) |
    Math.round(clamp(c[0], 0, 1) * 255)) >>>
  0;
const PINK = [1, 0.16, 0.62],
  CYAN = [0.1, 0.84, 1];
// Reflektory: kierunek światła (x w prawo, y w górę, z do widza) i kierunek kontry na krawędziach.
const L_PINK = norm([-0.9, 0.25, 0.3]),
  L_CYAN = norm([0.85, 0.35, 0.12]),
  H_PINK = norm([L_PINK[0], L_PINK[1], L_PINK[2] + 1]),
  H_CYAN = norm([L_CYAN[0], L_CYAN[1], L_CYAN[2] + 1]);

export class PoleEngine {
  constructor(palette, random = Math.random) {
    const n = GW * GH;
    this.out = new Uint32Array(n);
    this.z = new Float32Array(n);
    this.nx = new Float32Array(n);
    this.ny = new Float32Array(n);
    this.nz = new Float32Array(n);
    this.cov = new Float32Array(n);
    this.ao = new Float32Array(n);
    this.t1 = new Float32Array(n);
    this.t2 = new Float32Array(n);
    this.t3 = new Float32Array(n);
    this.m = new Uint8Array(n);
    this.ci = new Uint8Array(n); // indeks koloru sylwetki (0 = brak) – kontur i odbicie
    this.prims = [];
    this.strands = STRANDS.map((s) => new Strand(s[3], s[4]));
    this.readColors(palette);
    this.buildBg();
    this.lights = Array.from({ length: 7 }, (_, i) => ({
      x: 5 + Math.floor(random() * 70),
      y: 9 + Math.floor(random() * 36),
      per: 1.6 + random() * 1.8,
      ph: random() * 3,
      pink: i % 2 === 0,
    }));
  }
  readColors(palette) {
    const bg = hex(palette.bg),
      N = palette.neutral.map(hex),
      A = palette.accent.map(hex);
    // 4 poziomy każdego reflektora → 16 kolorów na materiał.
    // Kolor = nieoświetlona baza + odbicie materiału × światło obu reflektorów.
    const lut = (alb, base) => {
      const t = [];
      for (let p = 0; p < 4; p++)
        for (let c = 0; c < 4; c++)
          t.push(
            [0, 1, 2].map((k) => base[k] + alb[k] * ((PINK[k] * p * 1.2) / 3 + (CYAN[k] * c * 1.2) / 3)),
          );
      return t;
    };
    const tables = [];
    tables[SKIN] = lut([0.9, 0.78, 0.72], [0.3, 0.2, 0.36]);
    tables[COST] = lut([0.36, 0.36, 0.44], [0.16, 0.12, 0.29]);
    tables[HAIR] = lut([0.32, 0.28, 0.38], [0.1, 0.07, 0.19]);
    const floor = mix(bg, A[8], 0.8);
    this.LUT = new Uint32Array(64);
    this.MIRROR = new Uint32Array(64);
    for (const mt of [SKIN, COST, HAIR])
      tables[mt].forEach((c, i) => {
        this.LUT[mt * 16 + i] = pack(c);
        this.MIRROR[mt * 16 + i] = pack(mix(floor, c, 0.5));
      });
    // Rura: lewa krawędź różowa, środek jasny, prawa turkusowa (indeksy 1–3).
    [mix(N[3], PINK, 0.75), N[0], mix(N[3], CYAN, 0.75)].forEach((c, i) => {
      this.LUT[1 + i] = pack(c);
      this.MIRROR[1 + i] = pack(mix(floor, c, 0.45));
    });
    this.C = {
      OUT: pack(mul(bg, 0.5)),
      HAZE_P: pack(mix(bg, PINK, 0.3)),
      HAZE_C: pack(mix(bg, CYAN, 0.26)),
      DOT_P: [pack(mix(bg, PINK, 0.38)), pack(mix(bg, PINK, 0.75))],
      DOT_C: [pack(mix(bg, CYAN, 0.34)), pack(mix(bg, CYAN, 0.7))],
      LAMP: [pack(N[6]), pack(N[7])],
      LAMP_P: pack(mix(PINK, [1, 1, 1], 0.45)),
      LAMP_C: pack(mix(CYAN, [1, 1, 1], 0.45)),
      FLOOR: [floor, mix(bg, A[8], 0.45), mix(bg, A[7], 0.7)],
    };
  }
  /** Tło: lampy i stożki światła (dithering), scena jako elipsa z poświatą obu reflektorów. */
  buildBg() {
    const C = this.C,
      bg = new Uint32Array(GW * GH),
      stage = new Uint8Array(GW * GH);
    const cone = (x, y, lx, tx) => {
      // Odległość od osi stożka (lampa → punkt na podłodze) i jego szerokość na tej wysokości.
      const k = (y - 6) / (FY - 6);
      if (k < 0 || y >= FY) return 0;
      const half = 1.5 + k * 13,
        d = Math.abs(x + 0.5 - (lx + (tx - lx) * k)) / half;
      return d >= 1 ? 0 : (1 - d * d) * (0.62 - 0.34 * k);
    };
    for (let y = 0; y < GH; y++)
      for (let x = 0; x < GW; x++) {
        const i = y * GW + x,
          ex = (x + 0.5 - PX) / 31,
          ey = (y + 0.5 - (FY + 2.5)) / 5.5,
          e = ex * ex + ey * ey,
          th = (BAYER[(x & 3) + (y & 3) * 4] + 0.5) / 16;
        if (e < 1) {
          stage[i] = 1;
          // Poświata: różowa z lewej, turkusowa z prawej; jaśniejszy rant sceny.
          const tint = ex < 0 ? PINK : CYAN,
            glow = clamp(Math.abs(ex) * 0.5 - 0.08, 0, 1) * (1 - e) * 1.6,
            base = e > 0.82 ? C.FLOOR[2] : y + 0.5 < FY ? C.FLOOR[1] : C.FLOOR[0];
          bg[i] = pack(glow > th * 0.5 ? mix(base, tint, 0.22) : base);
          continue;
        }
        const p = cone(x, y, 9.5, PX - 5),
          c = cone(x, y, GW - 9.5, PX + 5);
        if (p > th && p >= c) bg[i] = C.HAZE_P;
        else if (c > th) bg[i] = C.HAZE_C;
      }
    for (const [lx, col] of [
      [8, C.LAMP_P],
      [GW - 11, C.LAMP_C],
    ]) {
      for (let x = 0; x < 3; x++) {
        bg[2 * GW + lx + x] = C.LAMP[1];
        bg[3 * GW + lx + x] = C.LAMP[0];
        bg[4 * GW + lx + x] = C.LAMP[0];
      }
      bg[5 * GW + lx + 1] = col;
    }
    this.bg = bg;
    this.stage = stage;
  }

  /** Kule ciała w układzie świata: `[x, y, z, r, materiał]` w `this.prims`. */
  body(p, steps) {
    const o = this.prims;
    o.length = 0;
    const up = norm(sub(p.N, p.P)),
      side = norm(sub(p.H2, p.H1));
    let fr = cross(side, up);
    if (dot(fr, p.front) < 0) fr = mul(fr, -1);
    const at = (h, s, f) => [
      p.P[0] + up[0] * h + side[0] * s + fr[0] * f,
      p.P[1] + up[1] * h + side[1] * s + fr[1] * f,
      p.P[2] + up[2] * h + side[2] * s + fr[2] * f,
    ];
    const put = (c, r, m) => o.push(c[0], c[1], c[2], r, m);
    const sweep = (A, B, rf, m, k = 1) => {
      const n = Math.max(1, Math.ceil(len(sub(B, A)) / (STEP * k)));
      for (let i = 0; i <= n; i++) put(mix(A, B, i / n), rf(i / n), m);
    };
    // Tułów w body: rząd kul w poprzek na każdej wysokości (przekrój „stadion”).
    const suit = (h) => (h < 2.55 ? COST : SKIN);
    for (let h = -0.5; h <= 3.1; h += STEP * 0.9) {
      const [w, d, of] = torsoAt(h),
        a = Math.max(0, w - d),
        n = a < 0.03 ? 1 : Math.ceil((2 * a) / (0.6 * d)) + 1;
      for (let j = 0; j < n; j++) put(at(h, n === 1 ? 0 : -a + (2 * a * j) / (n - 1), of), d, suit(h));
    }
    for (const sg of [-1, 1]) {
      put(at(-0.02, sg * 0.3, -0.2), 0.47, COST);
      put(at(2.12, sg * 0.3, 0.3), 0.26, COST);
      put(at(1.98, sg * 0.3, 0.25), 0.24, COST);
    }
    for (const k of ['1', '2']) {
      const K = p['K' + k],
        F = p['F' + k],
        fd = norm(sub(p['T' + k], F)),
        S = sub(p['S' + k], mul(up, 0.2)),
        E = p['E' + k],
        W = p['W' + k];
      sweep(p['H' + k], K, THIGH, SKIN);
      sweep(K, F, SHIN, SKIN);
      sweep(sub(F, mul(fd, 0.16)), add(F, mul(fd, 0.84)), FOOT, SKIN, 0.7);
      sweep(S, E, UPPER, SKIN);
      sweep(E, W, FORE, SKIN);
      sweep(W, add(W, mul(norm(sub(W, E)), 0.42)), HAND, SKIN, 0.6);
    }
    // Szyja, głowa (czaszka, żuchwa, broda, nos) i włosy.
    const hf = p.front,
      hu = p.up,
      Hc = add(p.Hc, mul(hu, 0.1));
    const hp = (f, u, s) => [
      Hc[0] + hf[0] * f + hu[0] * u + side[0] * s,
      Hc[1] + hf[1] * f + hu[1] * u + side[1] * s,
      Hc[2] + hf[2] * f + hu[2] * u + side[2] * s,
    ];
    sweep(at(2.95, 0, -0.02), hp(-0.03, -0.3, 0), () => 0.2, SKIN);
    put(hp(0, 0.06, 0), 0.44, SKIN);
    put(hp(0.13, -0.24, 0), 0.33, SKIN);
    put(hp(0.3, -0.46, 0), 0.13, SKIN);
    put(hp(0.46, -0.07, 0), 0.075, SKIN);
    put(hp(-0.1, 0.13, 0), HAIR_CAP, HAIR);
    const cols = [
      [Hc, 0.5],
      [at(2.5, 0, -0.03), 0.52],
      [at(2.6, 0.5, -0.03), 0.36],
      [at(2.6, -0.5, -0.03), 0.36],
    ];
    STRANDS.forEach((sd, i) => {
      const pts = this.strands[i].step(hp(sd[0], sd[1], sd[2]), steps, cols),
        last = pts.length - 1;
      for (let j = 0; j < last; j++)
        sweep(pts[j], pts[j + 1], (t) => sd[5] + ((sd[6] - sd[5]) * (j + t)) / last, HAIR, 0.8);
    });
  }

  sphere(cx, cy, cz, r, mat) {
    const x0 = Math.max(0, Math.floor(cx - r - 1)),
      x1 = Math.min(GW - 1, Math.ceil(cx + r + 1)),
      y0 = Math.max(0, Math.floor(cy - r - 1)),
      y1 = Math.min(GH - 1, Math.ceil(cy + r + 1)),
      r2 = r * r,
      ro = r + 0.5,
      ro2 = ro * ro,
      ir = 1 / r,
      { z, cov, nx, ny, nz, m } = this;
    for (let y = y0; y <= y1; y++) {
      const dy = y + 0.5 - cy,
        row = y * GW;
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - cx,
          d2 = dx * dx + dy * dy;
        if (d2 >= ro2) continue;
        const i = row + x,
          h = r2 > d2 ? Math.sqrt(r2 - d2) : 0,
          c = ro - Math.sqrt(d2);
        if (c > cov[i]) cov[i] = c > 1 ? 1 : c;
        if (cz + h > z[i]) {
          z[i] = cz + h;
          nx[i] = dx * ir;
          ny[i] = dy * ir;
          nz[i] = h * ir;
          m[i] = mat;
        }
      }
    }
  }
  /** Bryły → bufor głębi, normalne (wygładzone z progiem głębi) i zacienienie zagłębień. */
  raster() {
    const { z, cov, m, prims } = this;
    z.fill(-1e9);
    cov.fill(0);
    m.fill(0);
    for (let x = 39; x <= 41; x++)
      for (let y = 0; y < FY; y++) {
        const i = y * GW + x,
          dx = x + 0.5 - PX;
        z[i] = Math.sqrt(1.21 - dx * dx);
        this.nx[i] = dx / 1.1;
        this.ny[i] = 0;
        this.nz[i] = z[i] / 1.1;
        cov[i] = 1;
        m[i] = POLE;
      }
    let zmin = 1e9;
    for (let i = 0; i < prims.length; i += 5) {
      const cz = prims[i + 2] * U;
      if (cz < zmin) zmin = cz;
      this.sphere(PX + prims[i] * U, FY - prims[i + 1] * U, cz, prims[i + 3] * U, prims[i + 4]);
    }
    const thr = 0.22 * U,
      { nx, ny, nz, t1, t2, t3, ao } = this;
    for (let y = 0; y < GH; y++)
      for (let x = 0; x < GW; x++) {
        const i = y * GW + x;
        if (!m[i]) continue;
        let ax = 0,
          ay = 0,
          az = 0;
        for (let yy = Math.max(0, y - 1); yy <= Math.min(GH - 1, y + 1); yy++)
          for (let xx = Math.max(0, x - 1); xx <= Math.min(GW - 1, x + 1); xx++) {
            const j = yy * GW + xx;
            if (m[j] && Math.abs(z[j] - z[i]) < thr) {
              ax += nx[j];
              ay += ny[j];
              az += nz[j];
            }
          }
        const l = Math.hypot(ax, ay, az) || 1;
        t1[i] = ax / l;
        t2[i] = ay / l;
        t3[i] = az / l;
      }
    // Zagłębienie = sąsiedzi (bez rury) bliżej widza: rozmyta głębia − głębia.
    const R = 2,
      zf = zmin - 0.2 * U,
      win = 2 * R + 1,
      val = (j) => (m[j] && m[j] !== POLE ? z[j] : zf);
    for (let y = 0; y < GH; y++)
      for (let x = 0; x < GW; x++) {
        const i = y * GW + x;
        if (!m[i] || m[i] === POLE) {
          ao[i] = 1;
          continue;
        }
        let sum = 0;
        for (let yy = y - R; yy <= y + R; yy++)
          for (let xx = x - R; xx <= x + R; xx++)
            sum += yy >= 0 && yy < GH && xx >= 0 && xx < GW ? val(yy * GW + xx) : zf;
        const d = (sum / (win * win) - z[i]) / (0.55 * U);
        ao[i] = d <= 0 ? 1 : 1 - Math.min(1, d) * 0.62;
      }
  }
  /** Kolor sylwetki: natężenie każdego reflektora (rozproszone + kontra + połysk) → 4 poziomy z ditheringiem. */
  shade() {
    const { out, m, cov, t1, t2, t3, ao, ci, LUT } = this;
    ci.fill(0);
    for (let y = 0; y < GH; y++)
      for (let x = 0; x < GW; x++) {
        const i = y * GW + x,
          mt = m[i];
        if (!mt || cov[i] <= 0.45) continue;
        const X = t1[i],
          Y = -t2[i],
          Z = t3[i];
        let idx;
        if (mt === POLE) {
          // Zanik rury u góry kadru.
          if (y < 2 || (y < 6 && (x + y) & 1)) continue;
          idx = X < -0.4 ? 1 : X > 0.4 ? 3 : 2;
        } else {
          const rim = Math.pow(1 - Z, 2.2),
            dark = mt !== SKIN,
            th = ((BAYER[(x & 3) + (y & 3) * 4] + 0.5) / 16 - 0.5) * 0.45 + 0.5;
          let ip = (X * L_PINK[0] + Y * L_PINK[1] + Z * L_PINK[2] + 0.1) / 1.1,
            ic = (X * L_CYAN[0] + Y * L_CYAN[1] + Z * L_CYAN[2] + 0.1) / 1.1;
          ip = (ip > 0 ? ip * ao[i] : 0) + rim * clamp((-0.95 * X + 0.2 * Y) * 0.75 + 0.45, 0, 1) * 0.9;
          ic = (ic > 0 ? ic * ao[i] : 0) + rim * clamp((0.95 * X + 0.3 * Y) * 0.75 + 0.45, 0, 1);
          if (dark) {
            // Body i włosy: połysk zamiast rozproszonego światła.
            const sp = X * H_PINK[0] + Y * H_PINK[1] + Z * H_PINK[2],
              sc = X * H_CYAN[0] + Y * H_CYAN[1] + Z * H_CYAN[2];
            ip += sp > 0 ? Math.pow(sp, 18) * 0.8 : 0;
            ic += sc > 0 ? Math.pow(sc, 18) * 0.8 : 0;
          }
          idx = mt * 16 + clamp(Math.floor(ip * 3 + th), 0, 3) * 4 + clamp(Math.floor(ic * 3 + th), 0, 3);
        }
        ci[i] = idx;
        out[i] = LUT[idx];
      }
  }
  /** Kontur 1 px wokół sylwetki i odbicie w scenie (co drugi piksel dalej od stóp). */
  finish() {
    const { out, ci, stage, MIRROR } = this,
      OUT = this.C.OUT;
    for (let y = 1; y < GH - 1; y++)
      for (let x = 1; x < GW - 1; x++) {
        const i = y * GW + x;
        if (ci[i]) continue;
        const body = (j) => ci[j] > 3;
        if (body(i - 1) || body(i + 1) || body(i - GW) || body(i + GW)) {
          out[i] = OUT;
          continue;
        }
        if (!stage[i] || y < FY) continue;
        const d = y - FY,
          src = ci[(FY - 1 - d) * GW + x];
        if (src && (d < 3 || ((x + y) & 1) === 0) && d < 9) out[i] = MIRROR[src];
      }
  }
  drawLights(ft) {
    const { out, bg, C } = this;
    for (const s of this.lights) {
      const k = ((ft + s.ph) % s.per) / s.per,
        on = k < 0.5 ? (k < 0.12 || k > 0.38 ? 0 : 1) : -1;
      if (on < 0 || bg[s.y * GW + s.x] !== 0) continue;
      const col = s.pink ? C.DOT_P : C.DOT_C;
      out[s.y * GW + s.x] = col[on];
      if (on)
        for (const d of [-1, 1, -GW, GW]) if (bg[s.y * GW + s.x + d] === 0) out[s.y * GW + s.x + d] = col[0];
    }
  }
  /** Rysuje klatkę czasu `ft` (s); `steps` – liczba kroków fizyki włosów od poprzedniej klatki. */
  step(ft, steps) {
    this.out.set(this.bg);
    this.drawLights(ft);
    this.body(skeleton(ft), steps);
    this.raster();
    this.shade();
    this.finish();
  }
}

export const GRID = { width: GW, height: GH, fps: FPS, loop: LOOP, poleX: PX, floorY: FY };

/** Stawy w pikselach siatki w czasie `t` – testy naturalności ruchu. */
export function pose(t) {
  const p = skeleton(t),
    px = (q) => [PX + q[0] * U, FY - q[1] * U];
  return {
    hips: px(p.P),
    head: px(p.Hc),
    grip: px(p.W2),
    feet: [px(p.F1), px(p.F2)],
    reach: Math.hypot(p.P[0], p.P[2]) * U,
  };
}

/** Klatka czasu `t` (s) bez symulacji historii – statyczna klatka przy „Ogranicz ruch”. */
export function renderStill(palette, t) {
  const engine = new PoleEngine(palette, () => 0.5);
  // Rozgrzanie fizyki włosów do czasu t, żeby leżały naturalnie.
  const frames = Math.round(t * FPS);
  for (let f = Math.max(0, frames - 24); f <= frames; f++) engine.step(f / FPS, 1);
  return engine.out;
}
