// 2D 펄린 그래디언트 노이즈 + fbm — 손맛(가장자리 흔들림, 종이 얼룩)의 원천
import { TAU, lerp, rng } from './math.js';

export const noise = (() => {
  const r = rng(1337), p = new Uint8Array(512), gx = new Float32Array(256), gy = new Float32Array(256), perm = [];
  for (let i = 0; i < 256; i++) perm[i] = i;
  for (let i = 255; i > 0; i--) { const j = (r() * (i + 1)) | 0; [perm[i], perm[j]] = [perm[j], perm[i]]; }
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  for (let i = 0; i < 256; i++) { const a = r() * TAU; gx[i] = Math.cos(a); gy[i] = Math.sin(a); }
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, X = xi & 255, Y = yi & 255;
    const aa = p[p[X] + Y], ab = p[p[X] + Y + 1], ba = p[p[X + 1] + Y], bb = p[p[X + 1] + Y + 1];
    const u = fade(xf), v = fade(yf);
    const x1 = lerp(gx[aa] * xf + gy[aa] * yf, gx[ba] * (xf - 1) + gy[ba] * yf, u);
    const x2 = lerp(gx[ab] * xf + gy[ab] * (yf - 1), gx[bb] * (xf - 1) + gy[bb] * (yf - 1), u);
    return lerp(x1, x2, v) * 1.42; // ≈ [-1, 1]
  };
})();

export const fbm = (x, y, oct = 3) => { let s = 0, a = .5, f = 1; for (let i = 0; i < oct; i++) { s += a * noise(x * f + i * 17.3, y * f - i * 9.1); f *= 2.03; a *= .5; } return s; };
