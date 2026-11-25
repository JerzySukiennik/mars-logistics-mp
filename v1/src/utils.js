// Shared math, seeded noise, ids and a tiny event emitter used by every module.
export function hashStr(s) {
  let h = 2166136261 >>> 0;
  const str = String(s);
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GRAD2 = new Float32Array([
  1, 1, -1, 1, 1, -1, -1, -1,
  1, 0, -1, 0, 0, 1, 0, -1,
  0.7071, 0.7071, -0.7071, 0.7071, 0.7071, -0.7071, -0.7071, -0.7071
]);
const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;

export function makeNoise2D(seed) {
  const rng = mulberry32(seed >>> 0);
  const perm = new Uint8Array(512);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = p[i];
    p[i] = p[j];
    p[j] = t;
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  return function noise2D(xin, yin) {
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const x0 = xin - (i - t);
    const y0 = yin - (j - t);
    const i1 = x0 > y0 ? 1 : 0;
    const j1 = x0 > y0 ? 0 : 1;
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;
    const ii = i & 255;
    const jj = j & 255;
    let n0 = 0, n1 = 0, n2 = 0;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 > 0) {
      t0 *= t0;
      const g = (perm[ii + perm[jj]] % 12) * 2;
      n0 = t0 * t0 * (GRAD2[g] * x0 + GRAD2[g + 1] * y0);
    }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 > 0) {
      t1 *= t1;
      const g = (perm[ii + i1 + perm[jj + j1]] % 12) * 2;
      n1 = t1 * t1 * (GRAD2[g] * x1 + GRAD2[g + 1] * y1);
    }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 > 0) {
      t2 *= t2;
      const g = (perm[ii + 1 + perm[jj + 1]] % 12) * 2;
      n2 = t2 * t2 * (GRAD2[g] * x2 + GRAD2[g + 1] * y2);
    }
    return 70 * (n0 + n1 + n2);
  };
}

export function fbm(noise, x, y, octaves = 5, lacunarity = 2.0, gain = 0.5) {
  let amp = 1, freq = 1, sum = 0, norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * noise(x * freq, y * freq);
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
}

export function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function damp(a, b, k, dt) {
  return lerp(a, b, 1 - Math.exp(-k * dt));
}

export function isFiniteNum(v) {
  return typeof v === "number" && Number.isFinite(v);
}

export function finiteOr(v, fallback) {
  return isFiniteNum(v) ? v : fallback;
}

export function vec3ArrOk(a) {
  return Array.isArray(a) && a.length === 3 && isFiniteNum(a[0]) && isFiniteNum(a[1]) && isFiniteNum(a[2]);
}

export function quatArrOk(a) {
  if (!Array.isArray(a) || a.length !== 4) return false;
  for (let i = 0; i < 4; i++) if (!isFiniteNum(a[i])) return false;
  const len = Math.hypot(a[0], a[1], a[2], a[3]);
  return len > 0.5 && len < 1.5;
}

export function makeEmitter() {
  const map = new Map();
  return {
    on(ev, cb) {
      if (!map.has(ev)) map.set(ev, new Set());
      map.get(ev).add(cb);
      return () => map.get(ev)?.delete(cb);
    },
    emit(ev, ...args) {
      const set = map.get(ev);
      if (!set) return;
      for (const cb of Array.from(set)) {
        try {
          cb(...args);
        } catch (err) {
          console.warn("emitter callback error on", ev, err);
        }
      }
    }
  };
}

export function genId(prefix, uid) {
  const u = String(uid || "anon").slice(0, 5);
  const r = Math.floor(Math.random() * 1296).toString(36).padStart(2, "0");
  return prefix + Date.now().toString(36) + "_" + u + r;
}

export function now() {
  return Date.now();
}
